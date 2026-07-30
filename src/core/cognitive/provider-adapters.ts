/**
 * Cognitive Runtime — Provider Adapters (Stub Implementations)
 * TASK-AIS-003I.000
 *
 * Stub adapters for all 6 provider types:
 *   - OpenAI, Anthropic, Google, Ollama, LM Studio, vLLM
 *
 * These are interface-compliant stubs. Real adapters would wrap actual SDKs.
 * Core never knows specific SDKs — only the ProviderAdapter interface.
 *
 * Conforms to: ADR-003 (Provider Abstraction)
 */

import {
  ProviderAdapterType,
  type ProviderAdapter,
  type ProviderAdapterId,
  type ProviderAdapterType as PAT,
  type ProviderConfig,
  type ProviderMetadata,
  type ProviderHealth,
  type CompletionResult,
  type StreamingChunk,
  type EmbeddingResult,
  type TokenEstimation,
  type PromptContext,
  type TokenUsage,
} from './types.js';
import { brandProviderAdapterId } from './types.js';

/**
 * Create a base stub completion result.
 */
function createStubCompletion(config: ProviderConfig, content: string, tokens: TokenUsage): CompletionResult {
  return Object.freeze({
    id: crypto.randomUUID(),
    content,
    tokens,
    model: config.model,
    provider: config.name,
    finishReason: 'stop',
    latencyMs: 100,
    createdAt: new Date().toISOString(),
    metadata: Object.freeze({}),
  });
}

/**
 * Create a base stub token estimation.
 */
function createStubTokenEstimation(text: string): TokenEstimation {
  // ~4 chars per token
  const tokens = Math.ceil(text.length / 4);
  return Object.freeze({
    inputTokens: tokens,
    outputTokensEstimate: Math.ceil(tokens * 0.5),
    totalTokens: tokens + Math.ceil(tokens * 0.5),
  });
}

/**
 * Create a base stub embedding result.
 */
function createStubEmbedding(config: ProviderConfig, text: string): EmbeddingResult {
  const dimensions = 1536;
  const embedding = new Array(dimensions).fill(0).map(() => Math.random() * 2 - 1);
  return Object.freeze({
    id: crypto.randomUUID(),
    embedding: Object.freeze(embedding),
    model: config.model,
    provider: config.name,
    tokens: Math.ceil(text.length / 4),
    latencyMs: 50,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Base stub adapter — provides default implementations.
 * Subclassed by each provider type.
 */
export abstract class BaseStubAdapter implements ProviderAdapter {
  readonly id: ProviderAdapterId;
  readonly type: PAT;
  readonly name: string;
  private _config: ProviderConfig | null = null;
  private _initialized = false;

  constructor(type: PAT, name: string) {
    this.id = brandProviderAdapterId(crypto.randomUUID());
    this.type = type;
    this.name = name;
  }

  async initialize(config: ProviderConfig): Promise<void> {
    this._config = config;
    this._initialized = true;
  }

  async shutdown(): Promise<void> {
    this._initialized = false;
  }

  async metadata(): Promise<ProviderMetadata> {
    return Object.freeze({
      name: this.name,
      version: '1.0.0',
      adapterType: this.type,
      supportedModels: Object.freeze([this._config?.model ?? 'default']),
      capabilities: Object.freeze(['generate', 'stream', 'embed']),
      maxContextTokens: this._config?.maxTokens ?? 4096,
      supportsStreaming: true,
      supportsEmbedding: true,
      supportsVision: false,
    });
  }

  async health(): Promise<ProviderHealth> {
    return Object.freeze({
      healthy: this._initialized,
      latencyMs: this._initialized ? 100 : 0,
      errorRate: 0,
      lastCheckAt: new Date().toISOString(),
      details: this._initialized ? 'OK' : 'Not initialized',
    });
  }

  abstract generate(context: PromptContext): Promise<CompletionResult>;
  abstract stream(context: PromptContext): AsyncIterable<StreamingChunk>;
  abstract embed(text: string): Promise<EmbeddingResult>;
  abstract tokenize(text: string): Promise<TokenEstimation>;
  abstract estimate(promptTokens: number, outputTokens: number): Promise<number>;

  protected get config(): ProviderConfig | null {
    return this._config;
  }

  protected get initialized(): boolean {
    return this._initialized;
  }
}

/**
 * OpenAI stub adapter.
 */
export class OpenAIStubAdapter extends BaseStubAdapter {
  constructor() {
    super(ProviderAdapterType.OpenAI, 'openai-stub');
  }

  async generate(context: PromptContext): Promise<CompletionResult> {
    let tokens: TokenUsage = {
      promptTokens: Math.ceil(context.userMessage.length / 4),
      completionTokens: Math.ceil(context.userMessage.length / 8),
      totalTokens: 0,
    };
    tokens = { ...tokens, totalTokens: tokens.promptTokens + tokens.completionTokens };

    return createStubCompletion(
      { ...this.config!, name: this.name, model: this.config?.model ?? 'gpt-4' },
      `[OpenAI Stub] Response to: "${context.userMessage.slice(0, 50)}..."`,
      tokens,
    );
  }

  async *stream(context: PromptContext): AsyncIterable<StreamingChunk> {
    const words = `[OpenAI Stub Stream] Response to: "${context.userMessage.slice(0, 30)}"`.split(' ');
    for (const word of words) {
      yield Object.freeze({
        id: crypto.randomUUID(),
        content: word + ' ',
        model: this.config?.model ?? 'gpt-4',
        provider: this.name,
        finishReason: null,
        tokenCount: 1,
        latencyMs: 10,
        createdAt: new Date().toISOString(),
      });
    }
    yield Object.freeze({
      id: crypto.randomUUID(),
      content: '',
      model: this.config?.model ?? 'gpt-4',
      provider: this.name,
      finishReason: 'stop',
      tokenCount: 0,
      latencyMs: 5,
      createdAt: new Date().toISOString(),
    });
  }

  async embed(text: string): Promise<EmbeddingResult> {
    return createStubEmbedding(
      { ...this.config!, name: this.name, model: this.config?.model ?? 'text-embedding-ada-002' },
      text,
    );
  }

  async tokenize(text: string): Promise<TokenEstimation> {
    return createStubTokenEstimation(text);
  }

  async estimate(promptTokens: number, outputTokens: number): Promise<number> {
    return (promptTokens * 0.03 + outputTokens * 0.06) / 1000;
  }
}

/**
 * Anthropic stub adapter.
 */
export class AnthropicStubAdapter extends BaseStubAdapter {
  constructor() {
    super(ProviderAdapterType.Anthropic, 'anthropic-stub');
  }

  async generate(context: PromptContext): Promise<CompletionResult> {
    let tokens: TokenUsage = {
      promptTokens: Math.ceil(context.userMessage.length / 4),
      completionTokens: Math.ceil(context.userMessage.length / 8),
      totalTokens: 0,
    };
    tokens = { ...tokens, totalTokens: tokens.promptTokens + tokens.completionTokens };

    return createStubCompletion(
      { ...this.config!, name: this.name, model: this.config?.model ?? 'claude-3-opus' },
      `[Anthropic Stub] Response to: "${context.userMessage.slice(0, 50)}..."`,
      tokens,
    );
  }

  async *stream(_context: PromptContext): AsyncIterable<StreamingChunk> {
    const words = `[Anthropic Stub Stream] Response`.split(' ');
    for (const word of words) {
      yield Object.freeze({
        id: crypto.randomUUID(),
        content: word + ' ',
        model: this.config?.model ?? 'claude-3-opus',
        provider: this.name,
        finishReason: null,
        tokenCount: 1,
        latencyMs: 12,
        createdAt: new Date().toISOString(),
      });
    }
  }

  async embed(text: string): Promise<EmbeddingResult> {
    return createStubEmbedding(
      { ...this.config!, name: this.name, model: this.config?.model ?? 'claude-embedding' },
      text,
    );
  }

  async tokenize(text: string): Promise<TokenEstimation> {
    return createStubTokenEstimation(text);
  }

  async estimate(promptTokens: number, outputTokens: number): Promise<number> {
    return (promptTokens * 0.011 + outputTokens * 0.0325) / 1000;
  }
}

/**
 * Google stub adapter.
 */
export class GoogleStubAdapter extends BaseStubAdapter {
  constructor() {
    super(ProviderAdapterType.Google, 'google-stub');
  }

  async generate(context: PromptContext): Promise<CompletionResult> {
    let tokens: TokenUsage = {
      promptTokens: Math.ceil(context.userMessage.length / 4),
      completionTokens: Math.ceil(context.userMessage.length / 8),
      totalTokens: 0,
    };
    tokens = { ...tokens, totalTokens: tokens.promptTokens + tokens.completionTokens };

    return createStubCompletion(
      { ...this.config!, name: this.name, model: this.config?.model ?? 'gemini-pro' },
      `[Google Stub] Response to: "${context.userMessage.slice(0, 50)}..."`,
      tokens,
    );
  }

  async *stream(_context: PromptContext): AsyncIterable<StreamingChunk> {
    const words = `[Google Stub Stream] Response`.split(' ');
    for (const word of words) {
      yield Object.freeze({
        id: crypto.randomUUID(),
        content: word + ' ',
        model: this.config?.model ?? 'gemini-pro',
        provider: this.name,
        finishReason: null,
        tokenCount: 1,
        latencyMs: 8,
        createdAt: new Date().toISOString(),
      });
    }
  }

  async embed(text: string): Promise<EmbeddingResult> {
    return createStubEmbedding(
      { ...this.config!, name: this.name, model: this.config?.model ?? 'embedding-gecko' },
      text,
    );
  }

  async tokenize(text: string): Promise<TokenEstimation> {
    return createStubTokenEstimation(text);
  }

  async estimate(promptTokens: number, outputTokens: number): Promise<number> {
    return (promptTokens * 0.0125 + outputTokens * 0.0375) / 1000;
  }
}

/**
 * Ollama stub adapter (local).
 */
export class OllamaStubAdapter extends BaseStubAdapter {
  constructor() {
    super(ProviderAdapterType.Ollama, 'ollama-stub');
  }

  async generate(context: PromptContext): Promise<CompletionResult> {
    let tokens: TokenUsage = {
      promptTokens: Math.ceil(context.userMessage.length / 4),
      completionTokens: Math.ceil(context.userMessage.length / 8),
      totalTokens: 0,
    };
    tokens = { ...tokens, totalTokens: tokens.promptTokens + tokens.completionTokens };

    return createStubCompletion(
      { ...this.config!, name: this.name, model: this.config?.model ?? 'llama3' },
      `[Ollama Stub] Response to: "${context.userMessage.slice(0, 50)}..."`,
      tokens,
    );
  }

  async *stream(_context: PromptContext): AsyncIterable<StreamingChunk> {
    const words = `[Ollama Stub Stream] Response`.split(' ');
    for (const word of words) {
      yield Object.freeze({
        id: crypto.randomUUID(),
        content: word + ' ',
        model: this.config?.model ?? 'llama3',
        provider: this.name,
        finishReason: null,
        tokenCount: 1,
        latencyMs: 25,
        createdAt: new Date().toISOString(),
      });
    }
  }

  async embed(text: string): Promise<EmbeddingResult> {
    return createStubEmbedding(
      { ...this.config!, name: this.name, model: this.config?.model ?? 'nomic-embed' },
      text,
    );
  }

  async tokenize(text: string): Promise<TokenEstimation> {
    return createStubTokenEstimation(text);
  }

  async estimate(_promptTokens: number, _outputTokens: number): Promise<number> {
    return 0; // Local model — no cost
  }
}

/**
 * LM Studio stub adapter (local).
 */
export class LmStudioStubAdapter extends BaseStubAdapter {
  constructor() {
    super(ProviderAdapterType.LmStudio, 'lm-studio-stub');
  }

  async generate(context: PromptContext): Promise<CompletionResult> {
    let tokens: TokenUsage = {
      promptTokens: Math.ceil(context.userMessage.length / 4),
      completionTokens: Math.ceil(context.userMessage.length / 8),
      totalTokens: 0,
    };
    tokens = { ...tokens, totalTokens: tokens.promptTokens + tokens.completionTokens };

    return createStubCompletion(
      { ...this.config!, name: this.name, model: this.config?.model ?? 'local-model' },
      `[LM Studio Stub] Response to: "${context.userMessage.slice(0, 50)}..."`,
      tokens,
    );
  }

  async *stream(_context: PromptContext): AsyncIterable<StreamingChunk> {
    const words = `[LM Studio Stub Stream] Response`.split(' ');
    for (const word of words) {
      yield Object.freeze({
        id: crypto.randomUUID(),
        content: word + ' ',
        model: this.config?.model ?? 'local-model',
        provider: this.name,
        finishReason: null,
        tokenCount: 1,
        latencyMs: 30,
        createdAt: new Date().toISOString(),
      });
    }
  }

  async embed(text: string): Promise<EmbeddingResult> {
    return createStubEmbedding(
      { ...this.config!, name: this.name, model: this.config?.model ?? 'local-embed' },
      text,
    );
  }

  async tokenize(text: string): Promise<TokenEstimation> {
    return createStubTokenEstimation(text);
  }

  async estimate(_promptTokens: number, _outputTokens: number): Promise<number> {
    return 0; // Local model — no cost
  }
}

/**
 * vLLM stub adapter (local/server).
 */
export class VLLMStubAdapter extends BaseStubAdapter {
  constructor() {
    super(ProviderAdapterType.VLLM, 'vllm-stub');
  }

  async generate(context: PromptContext): Promise<CompletionResult> {
    let tokens: TokenUsage = {
      promptTokens: Math.ceil(context.userMessage.length / 4),
      completionTokens: Math.ceil(context.userMessage.length / 8),
      totalTokens: 0,
    };
    tokens = { ...tokens, totalTokens: tokens.promptTokens + tokens.completionTokens };

    return createStubCompletion(
      { ...this.config!, name: this.name, model: this.config?.model ?? 'vllm-model' },
      `[vLLM Stub] Response to: "${context.userMessage.slice(0, 50)}..."`,
      tokens,
    );
  }

  async *stream(_context: PromptContext): AsyncIterable<StreamingChunk> {
    const words = `[vLLM Stub Stream] Response`.split(' ');
    for (const word of words) {
      yield Object.freeze({
        id: crypto.randomUUID(),
        content: word + ' ',
        model: this.config?.model ?? 'vllm-model',
        provider: this.name,
        finishReason: null,
        tokenCount: 1,
        latencyMs: 15,
        createdAt: new Date().toISOString(),
      });
    }
  }

  async embed(text: string): Promise<EmbeddingResult> {
    return createStubEmbedding(
      { ...this.config!, name: this.name, model: this.config?.model ?? 'vllm-embed' },
      text,
    );
  }

  async tokenize(text: string): Promise<TokenEstimation> {
    return createStubTokenEstimation(text);
  }

  async estimate(_promptTokens: number, _outputTokens: number): Promise<number> {
    return 0; // Self-hosted — no cost
  }
}
