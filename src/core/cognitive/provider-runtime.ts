/**
 * Cognitive Runtime — Provider Runtime
 * TASK-AIS-003I.000
 *
 * Abstracts LLM provider interactions through interfaces.
 * Provider Adapters are isolated in sandboxes.
 * Core never knows specific SDKs — only the ProviderAdapter interface.
 *
 * Conforms to: ARC-001.001, ADR-003 (Provider Abstraction), DOM-002.000
 */

import type {
  ProviderAdapter,
  ProviderAdapterId,
  AdapterSandbox,
  ProviderConfig,
  ProviderMetadata,
  ProviderHealth,
  CompletionResult,
  StreamingChunk,
  EmbeddingResult,
  TokenEstimation,
  PromptContext,
} from './types.js';
import { ProviderUnavailableError, ProviderError, ProviderTimeoutError } from './cognitive-errors.js';

/**
 * Default adapter sandbox implementation.
 * Isolates each provider adapter from Core.
 */
export class InMemoryAdapterSandbox implements AdapterSandbox {
  private readonly _adapters: Map<string, ProviderAdapter> = new Map();

  register(adapter: ProviderAdapter): void {
    this._adapters.set(adapter.id, adapter);
  }

  unregister(adapterId: ProviderAdapterId): void {
    this._adapters.delete(adapterId);
  }

  get(adapterId: ProviderAdapterId): ProviderAdapter | undefined {
    return this._adapters.get(adapterId);
  }

  getByName(name: string): ProviderAdapter | undefined {
    for (const adapter of this._adapters.values()) {
      if (adapter.name === name) return adapter;
    }
    return undefined;
  }

  list(): readonly ProviderAdapter[] {
    return Array.from(this._adapters.values());
  }

  async healthCheck(): Promise<ReadonlyMap<string, ProviderHealth>> {
    const results = new Map<string, ProviderHealth>();
    for (const [id, adapter] of this._adapters) {
      try {
        const health = await adapter.health();
        results.set(id, health);
      } catch (error) {
        results.set(id, {
          healthy: false,
          latencyMs: 0,
          errorRate: 1,
          lastCheckAt: new Date().toISOString(),
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    return results;
  }

  async shutdownAll(): Promise<void> {
    const shutdowns: Promise<void>[] = [];
    for (const adapter of this._adapters.values()) {
      shutdowns.push(adapter.shutdown().catch(() => {}));
    }
    await Promise.all(shutdowns);
    this._adapters.clear();
  }
}

/**
 * ProviderRuntime — orchestrates provider adapter operations.
 */
export class ProviderRuntime {
  private readonly _sandbox: AdapterSandbox;
  private readonly _defaultTimeoutMs: number;

  constructor(sandbox?: AdapterSandbox, timeoutMs?: number) {
    this._sandbox = sandbox ?? new InMemoryAdapterSandbox();
    this._defaultTimeoutMs = timeoutMs ?? 30000;
  }

  /**
   * Get the adapter sandbox.
   */
  get sandbox(): AdapterSandbox {
    return this._sandbox;
  }

  /**
   * Register a provider adapter.
   */
  async registerAdapter(adapter: ProviderAdapter, config?: ProviderConfig): Promise<void> {
    if (config) {
      await adapter.initialize(config);
    }
    this._sandbox.register(adapter);
  }

  /**
   * Generate a completion using the named provider.
   */
  async generate(providerName: string, context: PromptContext): Promise<CompletionResult> {
    const adapter = this._sandbox.getByName(providerName);
    if (!adapter) {
      throw new ProviderUnavailableError(providerName);
    }

    try {
      const result = await this.withTimeout(adapter.generate(context), this._defaultTimeoutMs);
      return result;
    } catch (error) {
      if (error instanceof ProviderTimeoutError) throw error;
      throw new ProviderError(providerName, error instanceof Error ? error.message : 'Generation failed', {
        retryable: true,
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  /**
   * Stream a completion using the named provider.
   */
  async *stream(providerName: string, context: PromptContext): AsyncIterable<StreamingChunk> {
    const adapter = this._sandbox.getByName(providerName);
    if (!adapter) {
      throw new ProviderUnavailableError(providerName);
    }

    try {
      const stream = adapter.stream(context);
      for await (const chunk of stream) {
        yield chunk;
      }
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      throw new ProviderError(providerName, error instanceof Error ? error.message : 'Streaming failed', {
        retryable: true,
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  /**
   * Get embeddings from the named provider.
   */
  async embed(providerName: string, text: string): Promise<EmbeddingResult> {
    const adapter = this._sandbox.getByName(providerName);
    if (!adapter) {
      throw new ProviderUnavailableError(providerName);
    }

    try {
      return await adapter.embed(text);
    } catch (error) {
      throw new ProviderError(providerName, error instanceof Error ? error.message : 'Embedding failed', {
        retryable: true,
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  /**
   * Tokenize text using the named provider.
   */
  async tokenize(providerName: string, text: string): Promise<TokenEstimation> {
    const adapter = this._sandbox.getByName(providerName);
    if (!adapter) {
      throw new ProviderUnavailableError(providerName);
    }

    try {
      return await adapter.tokenize(text);
    } catch (error) {
      throw new ProviderError(providerName, error instanceof Error ? error.message : 'Tokenization failed', {
        retryable: true,
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  /**
   * Estimate cost for a completion.
   */
  async estimate(providerName: string, promptTokens: number, outputTokens: number): Promise<number> {
    const adapter = this._sandbox.getByName(providerName);
    if (!adapter) {
      throw new ProviderUnavailableError(providerName);
    }

    try {
      return await adapter.estimate(promptTokens, outputTokens);
    } catch (error) {
      throw new ProviderError(providerName, error instanceof Error ? error.message : 'Estimation failed', {
        retryable: true,
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  /**
   * Get provider metadata.
   */
  async getMetadata(providerName: string): Promise<ProviderMetadata> {
    const adapter = this._sandbox.getByName(providerName);
    if (!adapter) {
      throw new ProviderUnavailableError(providerName);
    }
    return adapter.metadata();
  }

  /**
   * Check health of a specific provider.
   */
  async healthCheck(providerName: string): Promise<ProviderHealth> {
    const adapter = this._sandbox.getByName(providerName);
    if (!adapter) {
      throw new ProviderUnavailableError(providerName);
    }
    return adapter.health();
  }

  /**
   * Run a promise with a timeout.
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new ProviderTimeoutError('unknown', timeoutMs));
      }, timeoutMs);

      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }
}
