import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AIProviderRuntime } from '../../core/ai-provider/ai-provider-runtime.js';
import { MockProviderSDK } from '../../core/ai-provider/provider-sdk.js';
import type * as Types from '../../core/ai-provider/types.js';
import {
  AIProviderRuntimeState,
  DefaultAIProviderRuntimeConfig,
} from '../../core/ai-provider/types.js';
import { ConfigurationError } from '../../core/ai-provider/errors.js';

// ─── Factory helpers ─────────────────────────────────────────────

function makeProviderId(): Types.ProviderId {
  return crypto.randomUUID() as Types.ProviderId;
}

function makeModelId(): Types.ModelId {
  return crypto.randomUUID() as Types.ModelId;
}

function makeExecutionRequest(
  overrides?: Partial<Types.ExecutionRequest>,
): Types.ExecutionRequest {
  const providerId = overrides?.providerId ?? makeProviderId();
  const modelId = overrides?.modelId ?? makeModelId();
  return Object.freeze({
    id: crypto.randomUUID() as Types.ExecutionId,
    messages: [{ role: 'user', content: 'Hello' }],
    providerId,
    modelId,
    metadata: {},
    createdAt: new Date().toISOString(),
    ...overrides,
  });
}

function makeMockSDK(
  overrides?: Partial<{ id: string; name: string; latencyMs: number }>,
): MockProviderSDK {
  return new MockProviderSDK({
    id: overrides?.id ?? crypto.randomUUID(),
    name: overrides?.name ?? 'Test SDK',
    latencyMs: overrides?.latencyMs ?? 0,
  });
}

function makeRuntime(
  overrides?: Partial<Types.AIProviderRuntimeConfig>,
): AIProviderRuntime {
  const config = { ...DefaultAIProviderRuntimeConfig, ...overrides };
  return new AIProviderRuntime(config);
}

/** Helper that creates a runtime, initializes it, and registers a provider+model */
async function makeReadyRuntime() {
  const sdk = makeMockSDK({ latencyMs: 0 });
  await sdk.initialize({});
  const providerId = sdk.id as unknown as Types.ProviderId;
  const modelId = 'mock-model' as Types.ModelId;

  const runtime = makeRuntime();
  await runtime.providerRegistry.register(Object.freeze({
    id: providerId,
    name: 'Test Provider',
    type: 'Custom' as Types.AIProviderType,
    version: '1.0.0',
    description: 'Test',
    state: 'Registered' as Types.ProviderState,
    endpoint: 'https://test.example.com',
    supportedRegions: [],
    capabilities: [],
    privacyLevel: 'Public' as Types.PrivacyLevel,
    maxConcurrentRequests: 10,
    metadata: {},
    registeredAt: new Date().toISOString(),
    lastHealthCheckAt: null,
  }), sdk);
  await runtime.modelRegistry.register(Object.freeze({
    id: modelId,
    providerId,
    name: 'Test Model',
    family: 'test',
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
    privacyLevel: 'Public' as Types.PrivacyLevel,
    costProfile: Object.freeze({
      inputCostPer1kTokens: 0, outputCostPer1kTokens: 0,
      cachedInputCostPer1kTokens: 0, reasoningCostPer1kTokens: 0,
      imageCostPerUnit: 0, audioCostPerMinute: 0, currency: 'USD',
    }),
    latencyProfile: Object.freeze({
      averageMs: 10, p50Ms: 10, p95Ms: 20, p99Ms: 30, timeoutMs: 60000,
    }),
    available: true,
    metadata: {},
    registeredAt: new Date().toISOString(),
  }));
  await runtime.initialize();
  return { runtime, providerId, modelId };
}

// ─── Tests ────────────────────────────────────────────────────────

describe('AIProviderRuntime', () => {
  let runtime: AIProviderRuntime;

  beforeEach(() => {
    runtime = makeRuntime();
  });

  afterEach(() => {
    // Each test is independent via fresh runtime in beforeEach
  });

  // ═══════════════════════════════════════════════════════════════
  // Constructor
  // ═══════════════════════════════════════════════════════════════
  describe('constructor', () => {
    it('should create runtime with default config', () => {
      const r = new AIProviderRuntime(DefaultAIProviderRuntimeConfig);
      expect(r).toBeDefined();
    });

    it('should expose providerRegistry', () => {
      expect(runtime.providerRegistry).toBeDefined();
    });

    it('should expose modelRegistry', () => {
      expect(runtime.modelRegistry).toBeDefined();
    });

    it('should expose executionEngine', () => {
      expect(runtime.executionEngine).toBeDefined();
    });

    it('should expose streamingEngine', () => {
      expect(runtime.streamingEngine).toBeDefined();
    });

    it('should expose contextManager', () => {
      expect(runtime.contextManager).toBeDefined();
    });

    it('should expose tokenManager', () => {
      expect(runtime.tokenManager).toBeDefined();
    });

    it('should expose costEngine', () => {
      expect(runtime.costEngine).toBeDefined();
    });

    it('should expose retryEngine', () => {
      expect(runtime.retryEngine).toBeDefined();
    });

    it('should expose failoverEngine', () => {
      expect(runtime.failoverEngine).toBeDefined();
    });

    it('should expose parallelEngine', () => {
      expect(runtime.parallelEngine).toBeDefined();
    });

    it('should expose cacheEngine', () => {
      expect(runtime.cacheEngine).toBeDefined();
    });

    it('should expose toolRuntime', () => {
      expect(runtime.toolRuntime).toBeDefined();
    });

    it('should expose privacyRuntime', () => {
      expect(runtime.privacyRuntime).toBeDefined();
    });

    it('should expose metricsRuntime', () => {
      expect(runtime.metricsRuntime).toBeDefined();
    });

    it('should expose traceRuntime', () => {
      expect(runtime.traceRuntime).toBeDefined();
    });

    it('should expose providerRouter', () => {
      expect(runtime.providerRouter).toBeDefined();
    });

    it('should expose modelRouter', () => {
      expect(runtime.modelRouter).toBeDefined();
    });

    it('should start in Created state', () => {
      expect(runtime.getState()).toBe(AIProviderRuntimeState.Created);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // initialize
  // ═══════════════════════════════════════════════════════════════
  describe('initialize', () => {
    it('should transition from Created to Ready', async () => {
      await runtime.initialize();
      expect(runtime.getState()).toBe(AIProviderRuntimeState.Ready);
    });

    it('should throw ConfigurationError when already initialized', async () => {
      await runtime.initialize();
      await expect(runtime.initialize()).rejects.toThrow(ConfigurationError);
    });

    it('should throw when initializing from Ready state', async () => {
      await runtime.initialize();
      await expect(runtime.initialize()).rejects.toThrow('Runtime already initialized');
    });

    it('should throw when initializing from Shutdown state', async () => {
      await runtime.initialize();
      await runtime.shutdown();
      await expect(runtime.initialize()).rejects.toThrow(ConfigurationError);
    });

    it('should not throw on first initialize', async () => {
      await expect(runtime.initialize()).resolves.not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // shutdown
  // ═══════════════════════════════════════════════════════════════
  describe('shutdown', () => {
    it('should transition from Ready to Shutdown', async () => {
      await runtime.initialize();
      await runtime.shutdown();
      expect(runtime.getState()).toBe(AIProviderRuntimeState.Shutdown);
    });

    it('should clear traces on shutdown', async () => {
      await runtime.initialize();
      runtime.traceRuntime.startTrace(
        crypto.randomUUID() as Types.TraceId,
        crypto.randomUUID() as Types.ExecutionId,
        makeProviderId(),
        makeModelId(),
      );
      await runtime.shutdown();
      expect(runtime.traceRuntime.listTraces()).toHaveLength(0);
    });

    it('should reset metrics on shutdown', async () => {
      await runtime.initialize();
      runtime.metricsRuntime.recordRetry();
      await runtime.shutdown();
      expect(runtime.metricsRuntime.getSnapshot().totalRetries).toBe(0);
    });

    it('should not throw when shutting down from Ready', async () => {
      await runtime.initialize();
      await expect(runtime.shutdown()).resolves.not.toThrow();
    });

    it('should not throw when shutting down from Created', async () => {
      await expect(runtime.shutdown()).resolves.not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getState
  // ═══════════════════════════════════════════════════════════════
  describe('getState', () => {
    it('should return Created initially', () => {
      expect(runtime.getState()).toBe(AIProviderRuntimeState.Created);
    });

    it('should return Ready after initialize', async () => {
      await runtime.initialize();
      expect(runtime.getState()).toBe(AIProviderRuntimeState.Ready);
    });

    it('should return Shutdown after shutdown', async () => {
      await runtime.initialize();
      await runtime.shutdown();
      expect(runtime.getState()).toBe(AIProviderRuntimeState.Shutdown);
    });

    it('should return AIProviderRuntimeState enum value', () => {
      const state = runtime.getState();
      expect(Object.values(AIProviderRuntimeState)).toContain(state);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // lifecycle state transitions
  // ═══════════════════════════════════════════════════════════════
  describe('lifecycle state transitions', () => {
    it('should follow Created -> Ready -> Shutdown', async () => {
      expect(runtime.getState()).toBe(AIProviderRuntimeState.Created);
      await runtime.initialize();
      expect(runtime.getState()).toBe(AIProviderRuntimeState.Ready);
      await runtime.shutdown();
      expect(runtime.getState()).toBe(AIProviderRuntimeState.Shutdown);
    });

    it('should not allow execute in Created state', async () => {
      await expect(
        runtime.execute(makeExecutionRequest()),
      ).rejects.toThrow(ConfigurationError);
    });

    it('should not allow stream in Created state', async () => {
      const gen = runtime.stream(makeExecutionRequest());
      const iterator = gen[Symbol.asyncIterator]();
      await expect(iterator.next()).rejects.toThrow(ConfigurationError);
    });

    it('should not allow execute in Shutdown state', async () => {
      await runtime.initialize();
      await runtime.shutdown();
      await expect(
        runtime.execute(makeExecutionRequest()),
      ).rejects.toThrow(ConfigurationError);
    });

    it('should not allow stream in Shutdown state', async () => {
      await runtime.initialize();
      await runtime.shutdown();
      const gen = runtime.stream(makeExecutionRequest());
      const iterator = gen[Symbol.asyncIterator]();
      await expect(iterator.next()).rejects.toThrow(ConfigurationError);
    });

    it('should allow execute in Ready state', async () => {
      const { runtime: r, providerId, modelId } = await makeReadyRuntime();
      const result = await r.execute(makeExecutionRequest({ providerId, modelId }));
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should allow stream in Ready state', async () => {
      const { runtime: r, providerId, modelId } = await makeReadyRuntime();
      const gen = r.stream(makeExecutionRequest({ providerId, modelId }));
      const chunks: Types.StreamChunk[] = [];
      for await (const chunk of gen) {
        chunks.push(chunk);
      }
      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // execute
  // ═══════════════════════════════════════════════════════════════
  describe('execute', () => {
    it('should throw ConfigurationError when not ready', async () => {
      await expect(
        runtime.execute(makeExecutionRequest()),
      ).rejects.toThrow(ConfigurationError);
    });

    it('should throw with message containing current state', async () => {
      await expect(
        runtime.execute(makeExecutionRequest()),
      ).rejects.toThrow('Runtime not ready');
    });

    it('should return ExecutionResult with correct status on success', async () => {
      const { runtime: r, providerId, modelId } = await makeReadyRuntime();
      const result = await r.execute(makeExecutionRequest({ providerId, modelId }));
      expect(result.status).toBe('Completed' as Types.ExecutionStatus);
    });

    it('should return ExecutionResult with content', async () => {
      const { runtime: r, providerId, modelId } = await makeReadyRuntime();
      const result = await r.execute(makeExecutionRequest({ providerId, modelId }));
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe('string');
    });

    it('should return ExecutionResult with tokenUsage', async () => {
      const { runtime: r, providerId, modelId } = await makeReadyRuntime();
      const result = await r.execute(makeExecutionRequest({ providerId, modelId }));
      expect(result.tokenUsage).toBeDefined();
      expect(result.tokenUsage.totalTokens).toBeGreaterThanOrEqual(0);
    });

    it('should return ExecutionResult with cost', async () => {
      const { runtime: r, providerId, modelId } = await makeReadyRuntime();
      const result = await r.execute(makeExecutionRequest({ providerId, modelId }));
      expect(result.cost).toBeDefined();
      expect(typeof result.cost.totalCost).toBe('number');
    });

    it('should return ExecutionResult with latencyMs', async () => {
      const { runtime: r, providerId, modelId } = await makeReadyRuntime();
      const result = await r.execute(makeExecutionRequest({ providerId, modelId }));
      expect(typeof result.latencyMs).toBe('number');
    });

    it('should return ExecutionResult with traceId', async () => {
      const { runtime: r, providerId, modelId } = await makeReadyRuntime();
      const result = await r.execute(makeExecutionRequest({ providerId, modelId }));
      expect(result.traceId).toBeDefined();
    });

    it('should return ExecutionResult with finishReason', async () => {
      const { runtime: r, providerId, modelId } = await makeReadyRuntime();
      const result = await r.execute(makeExecutionRequest({ providerId, modelId }));
      expect(result.finishReason).toBe('stop');
    });

    it('should return frozen ExecutionResult', async () => {
      const { runtime: r, providerId, modelId } = await makeReadyRuntime();
      const result = await r.execute(makeExecutionRequest({ providerId, modelId }));
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // stream
  // ═══════════════════════════════════════════════════════════════
  describe('stream', () => {
    it('should throw ConfigurationError when not ready', async () => {
      const gen = runtime.stream(makeExecutionRequest());
      const iterator = gen[Symbol.asyncIterator]();
      await expect(iterator.next()).rejects.toThrow(ConfigurationError);
    });

    it('should yield StreamChunk objects', async () => {
      const { runtime: r, providerId, modelId } = await makeReadyRuntime();
      const gen = r.stream(makeExecutionRequest({ providerId, modelId }));
      const { value: chunk } = await gen[Symbol.asyncIterator]().next();
      expect(chunk.content).toBeDefined();
      expect(typeof chunk.content).toBe('string');
    });

    it('should yield chunks with tokenCount', async () => {
      const { runtime: r, providerId, modelId } = await makeReadyRuntime();
      const gen = r.stream(makeExecutionRequest({ providerId, modelId }));
      const { value: chunk } = await gen[Symbol.asyncIterator]().next();
      expect(typeof chunk.tokenCount).toBe('number');
    });

    it('should yield frozen chunks', async () => {
      const { runtime: r, providerId, modelId } = await makeReadyRuntime();
      const gen = r.stream(makeExecutionRequest({ providerId, modelId }));
      const { value: chunk } = await gen[Symbol.asyncIterator]().next();
      expect(Object.isFrozen(chunk)).toBe(true);
    });

    it('should yield chunks with providerId', async () => {
      const { runtime: r, providerId, modelId } = await makeReadyRuntime();
      const gen = r.stream(makeExecutionRequest({ providerId, modelId }));
      const { value: chunk } = await gen[Symbol.asyncIterator]().next();
      expect(chunk.providerId).toBeDefined();
    });

    it('should yield chunks with modelId', async () => {
      const { runtime: r, providerId, modelId } = await makeReadyRuntime();
      const gen = r.stream(makeExecutionRequest({ providerId, modelId }));
      const { value: chunk } = await gen[Symbol.asyncIterator]().next();
      expect(chunk.modelId).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // health
  // ═══════════════════════════════════════════════════════════════
  describe('health', () => {
    it('should return status field', async () => {
      const result = await runtime.health();
      expect(result).toHaveProperty('status');
    });

    it('should return providers count field', async () => {
      const result = await runtime.health();
      expect(result).toHaveProperty('providers');
      expect(typeof result.providers).toBe('number');
    });

    it('should return models count field', async () => {
      const result = await runtime.health();
      expect(result).toHaveProperty('models');
      expect(typeof result.models).toBe('number');
    });

    it('should return current state as status', async () => {
      const result = await runtime.health();
      expect(result.status).toBe(AIProviderRuntimeState.Created);
    });

    it('should return Ready status after initialize', async () => {
      await runtime.initialize();
      const result = await runtime.health();
      expect(result.status).toBe(AIProviderRuntimeState.Ready);
    });

    it('should reflect registered providers count', async () => {
      const { runtime: r } = await makeReadyRuntime();
      const result = await r.health();
      expect(result.providers).toBe(1);
    });

    it('should reflect registered models count', async () => {
      const { runtime: r } = await makeReadyRuntime();
      const result = await r.health();
      expect(result.models).toBe(1);
    });

    it('should return 0 providers when none registered', async () => {
      await runtime.initialize();
      const result = await runtime.health();
      expect(result.providers).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getMetricsSnapshot
  // ═══════════════════════════════════════════════════════════════
  describe('getMetricsSnapshot', () => {
    it('should return frozen snapshot', () => {
      expect(Object.isFrozen(runtime.getMetricsSnapshot())).toBe(true);
    });

    it('should include runtimeState', () => {
      const snap = runtime.getMetricsSnapshot();
      expect(snap).toHaveProperty('runtimeState');
    });

    it('should include providerCount', () => {
      const snap = runtime.getMetricsSnapshot();
      expect(snap).toHaveProperty('providerCount');
    });

    it('should include modelCount', () => {
      const snap = runtime.getMetricsSnapshot();
      expect(snap).toHaveProperty('modelCount');
    });

    it('should include activeExecutions', () => {
      const snap = runtime.getMetricsSnapshot();
      expect(snap).toHaveProperty('activeExecutions');
    });

    it('should include activeStreams', () => {
      const snap = runtime.getMetricsSnapshot();
      expect(snap).toHaveProperty('activeStreams');
    });

    it('should include timestamp', () => {
      const snap = runtime.getMetricsSnapshot();
      expect(snap).toHaveProperty('timestamp');
      expect(typeof snap.timestamp).toBe('string');
    });

    it('should include totalExecutions from metrics', () => {
      const snap = runtime.getMetricsSnapshot();
      expect(snap).toHaveProperty('totalExecutions');
    });

    it('should reflect Created state in snapshot', () => {
      const snap = runtime.getMetricsSnapshot();
      expect(snap.runtimeState).toBe(AIProviderRuntimeState.Created);
    });

    it('should reflect Ready state after initialize', async () => {
      await runtime.initialize();
      const snap = runtime.getMetricsSnapshot();
      expect(snap.runtimeState).toBe(AIProviderRuntimeState.Ready);
    });

    it('should include all AIProviderMetrics fields', () => {
      const snap = runtime.getMetricsSnapshot();
      expect(snap).toHaveProperty('totalLatencyMs');
      expect(snap).toHaveProperty('averageLatencyMs');
      expect(snap).toHaveProperty('p50LatencyMs');
      expect(snap).toHaveProperty('totalCost');
      expect(snap).toHaveProperty('totalTokens');
      expect(snap).toHaveProperty('totalRetries');
      expect(snap).toHaveProperty('cacheHitRate');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Subsystem accessibility
  // ═══════════════════════════════════════════════════════════════
  describe('subsystem accessibility', () => {
    it('should have providerRegistry with register method', () => {
      expect(typeof runtime.providerRegistry.register).toBe('function');
    });

    it('should have modelRegistry with register method', () => {
      expect(typeof runtime.modelRegistry.register).toBe('function');
    });

    it('should have retryEngine with shouldRetry method', () => {
      expect(typeof runtime.retryEngine.shouldRetry).toBe('function');
    });

    it('should have metricsRuntime with getSnapshot method', () => {
      expect(typeof runtime.metricsRuntime.getSnapshot).toBe('function');
    });

    it('should have traceRuntime with startTrace method', () => {
      expect(typeof runtime.traceRuntime.startTrace).toBe('function');
    });

    it('should have privacyRuntime with evaluate method', () => {
      expect(typeof runtime.privacyRuntime.evaluate).toBe('function');
    });

    it('should have providerRouter with route method', () => {
      expect(typeof runtime.providerRouter.route).toBe('function');
    });

    it('should have cacheEngine', () => {
      expect(runtime.cacheEngine).toBeDefined();
    });

    it('should have parallelEngine', () => {
      expect(runtime.parallelEngine).toBeDefined();
    });
  });
});
