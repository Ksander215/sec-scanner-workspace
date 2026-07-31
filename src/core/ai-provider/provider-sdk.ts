/**
 * Universal AI Provider Runtime — Base & Mock Provider SDK
 * TASK-AIS-006A.000
 *
 * BaseProviderSDK: abstract base providing default implementations.
 * MockProviderSDK: fully functional mock for testing.
 */

import type {
  ProviderSDKId, ProviderId, ModelId, ExecutionId, StreamId, TraceId,
  AIProviderType, SemVer, ExecutionRequest, ExecutionResult,
  StreamChunk, ModelDescriptor, ProviderHealthCheck, TokenCountResult,
  ProviderSDK,
} from './types.js';
import { ExecutionStatus as ES, AIProviderType as AT, PrivacyLevel } from './types.js';

const CHARS_PER_TOKEN = 4;

export abstract class BaseProviderSDK implements ProviderSDK {
  abstract readonly id: ProviderSDKId;
  abstract readonly providerType: AIProviderType;
  abstract readonly name: string;
  abstract readonly version: SemVer;

  async initialize(_config: Readonly<Record<string, unknown>>): Promise<void> {
    // Default: no-op initialization
  }

  async shutdown(): Promise<void> {
    // Default: no-op shutdown
  }

  abstract execute(request: ExecutionRequest): Promise<ExecutionResult>;

  async *stream(request: ExecutionRequest): AsyncIterable<StreamChunk> {
    // Default: wrap execute result into single chunk
    const result = await this.execute(request);
    const chunk: StreamChunk = Object.freeze({
      id: crypto.randomUUID(),
      streamId: crypto.randomUUID() as StreamId,
      content: result.content,
      modelId: result.modelId,
      providerId: result.providerId,
      finishReason: result.finishReason,
      tokenCount: result.tokenUsage.outputTokens,
      latencyMs: result.latencyMs,
      createdAt: new Date().toISOString(),
      metadata: {},
    });
    yield chunk;
  }

  async cancel(_executionId: ExecutionId): Promise<void> {
    // Default: no-op cancel
  }

  abstract health(): Promise<ProviderHealthCheck>;
  abstract models(): Promise<readonly ModelDescriptor[]>;

  async embeddings(_text: string, _modelId?: ModelId): Promise<readonly number[]> {
    throw new Error('Embeddings not supported by this provider');
  }

  async tokenize(text: string, _modelId?: ModelId): Promise<TokenCountResult> {
    const tokens = Math.ceil(text.length / CHARS_PER_TOKEN);
    return Object.freeze({
      inputTokens: tokens,
      outputTokens: 0,
      cachedTokens: 0,
      reasoningTokens: 0,
      imageTokens: 0,
      audioTokens: 0,
      totalTokens: tokens,
      modelId: '' as ModelId,
      providerId: '' as ProviderId,
    });
  }

  async detokenize(_tokens: readonly number[], _modelId?: ModelId): Promise<string> {
    throw new Error('Detokenize not supported by this provider');
  }
}

// ═══════════════════════════════════════════════════════════════════
// MOCK PROVIDER SDK
// ═══════════════════════════════════════════════════════════════════

export interface MockProviderSDKConfig {
  readonly id?: string;
  readonly name?: string;
  readonly version?: SemVer;
  readonly providerType?: AIProviderType;
  readonly response?: string;
  readonly latencyMs?: number;
  readonly models?: readonly ModelDescriptor[];
  readonly failRate?: number;
  readonly errorMessage?: string;
}

export class MockProviderSDK extends BaseProviderSDK {
  readonly id: ProviderSDKId;
  readonly providerType: AIProviderType;
  readonly name: string;
  readonly version: SemVer;
  readonly responseText: string;
  readonly latencyMs: number;
  readonly mockModels: readonly ModelDescriptor[];
  readonly failRate: number;
  readonly errorMessage: string;
  private initialized = false;

  constructor(config?: MockProviderSDKConfig) {
    super();
    this.id = (config?.id ?? 'mock-sdk') as ProviderSDKId;
    this.providerType = config?.providerType ?? AT.Custom;
    this.name = config?.name ?? 'Mock Provider';
    this.version = config?.version ?? '1.0.0';
    this.responseText = config?.response ?? 'Mock response';
    this.latencyMs = config?.latencyMs ?? 10;
    this.mockModels = config?.models ?? this.defaultModels();
    this.failRate = config?.failRate ?? 0;
    this.errorMessage = config?.errorMessage ?? 'Mock error';
  }

  private defaultModels(): ModelDescriptor[] {
    return [Object.freeze({
      id: 'mock-model' as ModelId,
      providerId: this.id as unknown as ProviderId,
      name: 'Mock Model',
      family: 'mock',
      version: '1.0.0',
      capabilities: [],
      tokenLimit: 128000,
      supportsVision: false,
      supportsTools: false,
      supportsJSON: true,
      supportsStreaming: true,
      supportsAudio: false,
      supportsReasoning: false,
      supportsEmbeddings: false,
      supportsFunctionCalling: false,
      privacyLevel: PrivacyLevel.Public,
      costProfile: Object.freeze({
        inputCostPer1kTokens: 0,
        outputCostPer1kTokens: 0,
        cachedInputCostPer1kTokens: 0,
        reasoningCostPer1kTokens: 0,
        imageCostPerUnit: 0,
        audioCostPerMinute: 0,
        currency: 'USD',
      }),
      latencyProfile: Object.freeze({
        averageMs: this.latencyMs,
        p50Ms: this.latencyMs,
        p95Ms: this.latencyMs * 2,
        p99Ms: this.latencyMs * 3,
        timeoutMs: 60000,
      }),
      available: true,
      metadata: {},
      registeredAt: new Date().toISOString(),
    })];
  }

  async initialize(_config: Readonly<Record<string, unknown>>): Promise<void> {
    this.initialized = true;
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    if (!this.initialized) throw new Error('SDK not initialized');

    // Simulate latency
    if (this.latencyMs > 0) {
      await new Promise(r => setTimeout(r, this.latencyMs));
    }

    // Simulate failure
    if (this.failRate > 0 && Math.random() < this.failRate) {
      throw new Error(this.errorMessage);
    }

    const startTime = Date.now();
    const inputTokens = Math.ceil(
      request.messages.reduce((sum, m) => sum + m.content.length, 0) / CHARS_PER_TOKEN,
    );
    const outputTokens = Math.ceil(this.responseText.length / CHARS_PER_TOKEN);

    return Object.freeze({
      id: request.id,
      status: ES.Completed,
      content: this.responseText,
      modelId: request.modelId ?? ('mock-model' as ModelId),
      providerId: request.providerId ?? (this.id as unknown as ProviderId),
      messages: request.messages,
      toolCalls: [],
      tokenUsage: Object.freeze({
        inputTokens,
        outputTokens,
        cachedTokens: 0,
        reasoningTokens: 0,
        imageTokens: 0,
        audioTokens: 0,
        totalTokens: inputTokens + outputTokens,
      }),
      cost: Object.freeze({
        inputCost: 0,
        outputCost: 0,
        cachedCost: 0,
        reasoningCost: 0,
        imageCost: 0,
        audioCost: 0,
        totalCost: 0,
        currency: 'USD',
      }),
      latencyMs: Date.now() - startTime,
      traceId: crypto.randomUUID() as TraceId,
      finishReason: 'stop',
      createdAt: request.createdAt,
      completedAt: new Date().toISOString(),
      metadata: { ...request.metadata },
    });
  }

  async health(): Promise<ProviderHealthCheck> {
    return Object.freeze({
      providerId: this.id as unknown as ProviderId,
      healthy: true,
      latencyMs: this.latencyMs,
      errorRate: this.failRate,
      lastCheckAt: new Date().toISOString(),
      details: undefined,
      metadata: {},
    });
  }

  async models(): Promise<readonly ModelDescriptor[]> {
    return this.mockModels;
  }

  async *stream(request: ExecutionRequest): AsyncIterable<StreamChunk> {
    // Yield response word by word for streaming simulation
    const words = this.responseText.split(' ');
    const modelId = request.modelId ?? ('mock-model' as ModelId);
    const providerId = request.providerId ?? (this.id as unknown as ProviderId);
    const streamId = crypto.randomUUID() as StreamId;

    for (let i = 0; i < words.length; i++) {
      const content = i === 0 ? words[i] : ` ${words[i]}`;
      const isLast = i === words.length - 1;
      yield Object.freeze({
        id: crypto.randomUUID(),
        streamId,
        content,
        modelId,
        providerId,
        finishReason: isLast ? 'stop' : null,
        tokenCount: Math.ceil(content.length / CHARS_PER_TOKEN),
        latencyMs: Math.floor(this.latencyMs / words.length),
        createdAt: new Date().toISOString(),
        metadata: {},
      });
    }
  }

  async embeddings(text: string): Promise<readonly number[]> {
    // Return deterministic fake embeddings based on text length
    const size = 128;
    const result = new Array<number>(size);
    const seed = text.length;
    for (let i = 0; i < size; i++) {
      result[i] = Math.sin(seed + i) * 0.5;
    }
    return Object.freeze(result);
  }

  async detokenize(tokens: readonly number[]): Promise<string> {
    // Each token maps to ~4 chars; produce placeholder text
    const chars = tokens.length * CHARS_PER_TOKEN;
    return 'x'.repeat(chars);
  }
}
