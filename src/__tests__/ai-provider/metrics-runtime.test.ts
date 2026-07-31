import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MetricsRuntime } from '../../core/ai-provider/metrics-runtime.js';
import type * as Types from '../../core/ai-provider/types.js';
import {
  ExecutionStatus,
} from '../../core/ai-provider/types.js';

// ─── Factory helpers ─────────────────────────────────────────────

function makeProviderId(): Types.ProviderId {
  return crypto.randomUUID() as Types.ProviderId;
}

function makeModelId(): Types.ModelId {
  return crypto.randomUUID() as Types.ModelId;
}

function makeExecutionId(): Types.ExecutionId {
  return crypto.randomUUID() as Types.ExecutionId;
}

function makeTokenUsage(
  overrides?: Partial<Types.TokenUsageDetail>,
): Types.TokenUsageDetail {
  return Object.freeze({
    inputTokens: 100,
    outputTokens: 50,
    cachedTokens: 10,
    reasoningTokens: 5,
    imageTokens: 0,
    audioTokens: 0,
    totalTokens: 165,
    ...overrides,
  });
}

function makeCostDetail(
  overrides?: Partial<Types.CostDetail>,
): Types.CostDetail {
  return Object.freeze({
    inputCost: 0.001,
    outputCost: 0.002,
    cachedCost: 0.0001,
    reasoningCost: 0.0005,
    imageCost: 0,
    audioCost: 0,
    totalCost: 0.0036,
    currency: 'USD',
    ...overrides,
  });
}

function makeExecutionResult(
  overrides?: Partial<Types.ExecutionResult>,
): Types.ExecutionResult {
  const providerId = overrides?.providerId ?? makeProviderId();
  const modelId = overrides?.modelId ?? makeModelId();
  return Object.freeze({
    id: makeExecutionId(),
    status: ExecutionStatus.Completed,
    content: 'Test response',
    modelId,
    providerId,
    messages: [],
    toolCalls: [],
    tokenUsage: makeTokenUsage(),
    cost: makeCostDetail(),
    latencyMs: 200,
    traceId: crypto.randomUUID() as Types.TraceId,
    finishReason: 'stop',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    metadata: {},
    ...overrides,
  });
}

function makeStreamChunk(
  overrides?: Partial<Types.StreamChunk>,
): Types.StreamChunk {
  return Object.freeze({
    id: crypto.randomUUID(),
    streamId: crypto.randomUUID() as Types.StreamId,
    content: 'Hello',
    modelId: makeModelId(),
    providerId: makeProviderId(),
    finishReason: null,
    tokenCount: 5,
    latencyMs: 10,
    createdAt: new Date().toISOString(),
    metadata: {},
    ...overrides,
  });
}

// ─── Tests ────────────────────────────────────────────────────────

describe('MetricsRuntime', () => {
  let metrics: MetricsRuntime;

  beforeEach(() => {
    metrics = new MetricsRuntime();
  });

  afterEach(() => {
    // Each test is independent via fresh metrics in beforeEach
  });

  // ═══════════════════════════════════════════════════════════════
  // recordExecution — status tracking
  // ═══════════════════════════════════════════════════════════════
  describe('recordExecution — status tracking', () => {
    it('should increment totalExecutions on Completed', () => {
      metrics.recordExecution(makeExecutionResult({ status: ExecutionStatus.Completed }));
      expect(metrics.getSnapshot().totalExecutions).toBe(1);
    });

    it('should increment successfulExecutions on Completed', () => {
      metrics.recordExecution(makeExecutionResult({ status: ExecutionStatus.Completed }));
      expect(metrics.getSnapshot().successfulExecutions).toBe(1);
    });

    it('should increment failedExecutions on Failed', () => {
      metrics.recordExecution(makeExecutionResult({ status: ExecutionStatus.Failed }));
      expect(metrics.getSnapshot().failedExecutions).toBe(1);
    });

    it('should increment failedExecutions on TimedOut', () => {
      metrics.recordExecution(makeExecutionResult({ status: ExecutionStatus.TimedOut }));
      expect(metrics.getSnapshot().failedExecutions).toBe(1);
    });

    it('should increment cancelledExecutions on Cancelled', () => {
      metrics.recordExecution(makeExecutionResult({ status: ExecutionStatus.Cancelled }));
      expect(metrics.getSnapshot().cancelledExecutions).toBe(1);
    });

    it('should count multiple completions', () => {
      metrics.recordExecution(makeExecutionResult({ status: ExecutionStatus.Completed }));
      metrics.recordExecution(makeExecutionResult({ status: ExecutionStatus.Completed }));
      metrics.recordExecution(makeExecutionResult({ status: ExecutionStatus.Completed }));
      expect(metrics.getSnapshot().successfulExecutions).toBe(3);
    });

    it('should not count Queued as any status category', () => {
      metrics.recordExecution(makeExecutionResult({ status: ExecutionStatus.Queued }));
      const snap = metrics.getSnapshot();
      expect(snap.successfulExecutions).toBe(0);
      expect(snap.failedExecutions).toBe(0);
      expect(snap.cancelledExecutions).toBe(0);
      expect(snap.totalExecutions).toBe(1);
    });

    it('should not count Executing as any status category', () => {
      metrics.recordExecution(makeExecutionResult({ status: ExecutionStatus.Executing }));
      const snap = metrics.getSnapshot();
      expect(snap.successfulExecutions).toBe(0);
      expect(snap.failedExecutions).toBe(0);
      expect(snap.cancelledExecutions).toBe(0);
    });

    it('should track mixed statuses correctly', () => {
      metrics.recordExecution(makeExecutionResult({ status: ExecutionStatus.Completed }));
      metrics.recordExecution(makeExecutionResult({ status: ExecutionStatus.Failed }));
      metrics.recordExecution(makeExecutionResult({ status: ExecutionStatus.Cancelled }));
      metrics.recordExecution(makeExecutionResult({ status: ExecutionStatus.TimedOut }));
      const snap = metrics.getSnapshot();
      expect(snap.totalExecutions).toBe(4);
      expect(snap.successfulExecutions).toBe(1);
      expect(snap.failedExecutions).toBe(2);
      expect(snap.cancelledExecutions).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // recordExecution — latency
  // ═══════════════════════════════════════════════════════════════
  describe('recordExecution — latency', () => {
    it('should accumulate totalLatencyMs', () => {
      metrics.recordExecution(makeExecutionResult({ latencyMs: 100 }));
      metrics.recordExecution(makeExecutionResult({ latencyMs: 200 }));
      expect(metrics.getSnapshot().totalLatencyMs).toBe(300);
    });

    it('should compute averageLatencyMs', () => {
      metrics.recordExecution(makeExecutionResult({ latencyMs: 100 }));
      metrics.recordExecution(makeExecutionResult({ latencyMs: 300 }));
      expect(metrics.getSnapshot().averageLatencyMs).toBe(200);
    });

    it('should store individual latencies for percentile computation', () => {
      metrics.recordExecution(makeExecutionResult({ latencyMs: 10 }));
      metrics.recordExecution(makeExecutionResult({ latencyMs: 20 }));
      metrics.recordExecution(makeExecutionResult({ latencyMs: 30 }));
      metrics.recordExecution(makeExecutionResult({ latencyMs: 40 }));
      metrics.recordExecution(makeExecutionResult({ latencyMs: 50 }));
      const snap = metrics.getSnapshot();
      expect(snap.p50LatencyMs).toBe(30);
    });

    it('should compute p50 correctly for 10 values', () => {
      for (let i = 1; i <= 10; i++) {
        metrics.recordExecution(makeExecutionResult({ latencyMs: i * 10 }));
      }
      expect(metrics.getSnapshot().p50LatencyMs).toBe(50);
    });

    it('should compute p95 correctly for 20 values', () => {
      for (let i = 1; i <= 20; i++) {
        metrics.recordExecution(makeExecutionResult({ latencyMs: i * 10 }));
      }
      expect(metrics.getSnapshot().p95LatencyMs).toBe(190);
    });

    it('should compute p99 correctly for 100 values', () => {
      for (let i = 1; i <= 100; i++) {
        metrics.recordExecution(makeExecutionResult({ latencyMs: i }));
      }
      expect(metrics.getSnapshot().p99LatencyMs).toBe(99);
    });

    it('should handle single execution latency', () => {
      metrics.recordExecution(makeExecutionResult({ latencyMs: 42 }));
      const snap = metrics.getSnapshot();
      expect(snap.p50LatencyMs).toBe(42);
      expect(snap.p95LatencyMs).toBe(42);
      expect(snap.p99LatencyMs).toBe(42);
    });

    it('should return 0 for all percentiles when no executions', () => {
      const snap = metrics.getSnapshot();
      expect(snap.p50LatencyMs).toBe(0);
      expect(snap.p95LatencyMs).toBe(0);
      expect(snap.p99LatencyMs).toBe(0);
    });

    it('should return 0 for averageLatencyMs when no executions', () => {
      expect(metrics.getSnapshot().averageLatencyMs).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // recordExecution — token tracking
  // ═══════════════════════════════════════════════════════════════
  describe('recordExecution — token tracking', () => {
    it('should accumulate totalTokens', () => {
      metrics.recordExecution(makeExecutionResult({
        tokenUsage: makeTokenUsage({ totalTokens: 100 }),
      }));
      metrics.recordExecution(makeExecutionResult({
        tokenUsage: makeTokenUsage({ totalTokens: 200 }),
      }));
      expect(metrics.getSnapshot().totalTokens).toBe(300);
    });

    it('should accumulate totalInputTokens', () => {
      metrics.recordExecution(makeExecutionResult({
        tokenUsage: makeTokenUsage({ inputTokens: 50, totalTokens: 50, outputTokens: 0 }),
      }));
      metrics.recordExecution(makeExecutionResult({
        tokenUsage: makeTokenUsage({ inputTokens: 30, totalTokens: 30, outputTokens: 0 }),
      }));
      expect(metrics.getSnapshot().totalInputTokens).toBe(80);
    });

    it('should accumulate totalOutputTokens', () => {
      metrics.recordExecution(makeExecutionResult({
        tokenUsage: makeTokenUsage({ outputTokens: 25, totalTokens: 25, inputTokens: 0 }),
      }));
      expect(metrics.getSnapshot().totalOutputTokens).toBe(25);
    });

    it('should accumulate totalCachedTokens', () => {
      metrics.recordExecution(makeExecutionResult({
        tokenUsage: makeTokenUsage({ cachedTokens: 40 }),
      }));
      expect(metrics.getSnapshot().totalCachedTokens).toBe(40);
    });

    it('should accumulate totalReasoningTokens', () => {
      metrics.recordExecution(makeExecutionResult({
        tokenUsage: makeTokenUsage({ reasoningTokens: 15 }),
      }));
      expect(metrics.getSnapshot().totalReasoningTokens).toBe(15);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // recordExecution — cost tracking
  // ═══════════════════════════════════════════════════════════════
  describe('recordExecution — cost tracking', () => {
    it('should accumulate totalCost', () => {
      metrics.recordExecution(makeExecutionResult({
        cost: makeCostDetail({ totalCost: 0.01 }),
      }));
      metrics.recordExecution(makeExecutionResult({
        cost: makeCostDetail({ totalCost: 0.02 }),
      }));
      expect(metrics.getSnapshot().totalCost).toBeCloseTo(0.03);
    });

    it('should compute averageCostPerExecution', () => {
      metrics.recordExecution(makeExecutionResult({
        cost: makeCostDetail({ totalCost: 0.10 }),
      }));
      metrics.recordExecution(makeExecutionResult({
        cost: makeCostDetail({ totalCost: 0.30 }),
      }));
      expect(metrics.getSnapshot().averageCostPerExecution).toBeCloseTo(0.20);
    });

    it('should return 0 for averageCostPerExecution when no executions', () => {
      expect(metrics.getSnapshot().averageCostPerExecution).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // recordExecution — provider / model usage
  // ═══════════════════════════════════════════════════════════════
  describe('recordExecution — provider / model usage', () => {
    it('should track provider usage count', () => {
      const pid = makeProviderId();
      metrics.recordExecution(makeExecutionResult({ providerId: pid }));
      metrics.recordExecution(makeExecutionResult({ providerId: pid }));
      expect(metrics.getSnapshot().providerUsage[pid as string]).toBe(2);
    });

    it('should track multiple providers independently', () => {
      const p1 = makeProviderId();
      const p2 = makeProviderId();
      metrics.recordExecution(makeExecutionResult({ providerId: p1 }));
      metrics.recordExecution(makeExecutionResult({ providerId: p2 }));
      metrics.recordExecution(makeExecutionResult({ providerId: p1 }));
      const usage = metrics.getSnapshot().providerUsage;
      expect(usage[p1 as string]).toBe(2);
      expect(usage[p2 as string]).toBe(1);
    });

    it('should track model usage count', () => {
      const mid = makeModelId();
      metrics.recordExecution(makeExecutionResult({ modelId: mid }));
      metrics.recordExecution(makeExecutionResult({ modelId: mid }));
      metrics.recordExecution(makeExecutionResult({ modelId: mid }));
      expect(metrics.getSnapshot().modelUsage[mid as string]).toBe(3);
    });

    it('should track multiple models independently', () => {
      const m1 = makeModelId();
      const m2 = makeModelId();
      metrics.recordExecution(makeExecutionResult({ modelId: m1 }));
      metrics.recordExecution(makeExecutionResult({ modelId: m2 }));
      const usage = metrics.getSnapshot().modelUsage;
      expect(usage[m1 as string]).toBe(1);
      expect(usage[m2 as string]).toBe(1);
    });

    it('should freeze providerUsage in snapshot', () => {
      metrics.recordExecution(makeExecutionResult());
      expect(Object.isFrozen(metrics.getSnapshot().providerUsage)).toBe(true);
    });

    it('should freeze modelUsage in snapshot', () => {
      metrics.recordExecution(makeExecutionResult());
      expect(Object.isFrozen(metrics.getSnapshot().modelUsage)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // recordStreamChunk
  // ═══════════════════════════════════════════════════════════════
  describe('recordStreamChunk', () => {
    it('should accumulate streamTokens', () => {
      metrics.recordStreamChunk(makeStreamChunk({ tokenCount: 5 }));
      metrics.recordStreamChunk(makeStreamChunk({ tokenCount: 10 }));
      expect(metrics.getSnapshot().streamingSpeed).toBe(15);
    });

    it('should record single chunk tokens', () => {
      metrics.recordStreamChunk(makeStreamChunk({ tokenCount: 42 }));
      expect(metrics.getSnapshot().streamingSpeed).toBe(42);
    });

    it('should not affect execution counters', () => {
      metrics.recordStreamChunk(makeStreamChunk());
      expect(metrics.getSnapshot().totalExecutions).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // recordRetry / recordFailover / recordToolCall
  // ═══════════════════════════════════════════════════════════════
  describe('recordRetry / recordFailover / recordToolCall', () => {
    it('should increment totalRetries', () => {
      metrics.recordRetry();
      metrics.recordRetry();
      metrics.recordRetry();
      expect(metrics.getSnapshot().totalRetries).toBe(3);
    });

    it('should increment totalFailovers', () => {
      metrics.recordFailover();
      metrics.recordFailover();
      expect(metrics.getSnapshot().totalFailovers).toBe(2);
    });

    it('should increment totalToolCalls', () => {
      metrics.recordToolCall();
      metrics.recordToolCall();
      metrics.recordToolCall();
      metrics.recordToolCall();
      expect(metrics.getSnapshot().totalToolCalls).toBe(4);
    });

    it('should start all counters at zero', () => {
      const snap = metrics.getSnapshot();
      expect(snap.totalRetries).toBe(0);
      expect(snap.totalFailovers).toBe(0);
      expect(snap.totalToolCalls).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // recordCacheHit / recordCacheMiss
  // ═══════════════════════════════════════════════════════════════
  describe('recordCacheHit / recordCacheMiss', () => {
    it('should increment cacheHits', () => {
      metrics.recordCacheHit();
      metrics.recordCacheHit();
      expect(metrics.getSnapshot().cacheHitRate).toBeCloseTo(1.0);
    });

    it('should increment cacheMisses', () => {
      metrics.recordCacheMiss();
      metrics.recordCacheMiss();
      metrics.recordCacheMiss();
      expect(metrics.getSnapshot().cacheMissRate).toBeCloseTo(1.0);
    });

    it('should compute cacheHitRate correctly', () => {
      metrics.recordCacheHit();
      metrics.recordCacheHit();
      metrics.recordCacheHit();
      metrics.recordCacheMiss();
      expect(metrics.getSnapshot().cacheHitRate).toBeCloseTo(0.75);
    });

    it('should compute cacheMissRate correctly', () => {
      metrics.recordCacheHit();
      metrics.recordCacheMiss();
      metrics.recordCacheMiss();
      metrics.recordCacheMiss();
      expect(metrics.getSnapshot().cacheMissRate).toBeCloseTo(0.75);
    });

    it('should return 0 for rates when no cache ops', () => {
      const snap = metrics.getSnapshot();
      expect(snap.cacheHitRate).toBe(0);
      expect(snap.cacheMissRate).toBe(0);
    });

    it('should handle hits and misses together', () => {
      for (let i = 0; i < 10; i++) metrics.recordCacheHit();
      for (let i = 0; i < 40; i++) metrics.recordCacheMiss();
      const snap = metrics.getSnapshot();
      expect(snap.cacheHitRate).toBeCloseTo(0.2);
      expect(snap.cacheMissRate).toBeCloseTo(0.8);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // recordHallucination
  // ═══════════════════════════════════════════════════════════════
  describe('recordHallucination', () => {
    it('should increment hallucinationReports', () => {
      metrics.recordHallucination();
      expect(metrics.getSnapshot().hallucinationReports).toBe(1);
    });

    it('should accumulate hallucinationReports', () => {
      metrics.recordHallucination();
      metrics.recordHallucination();
      metrics.recordHallucination();
      expect(metrics.getSnapshot().hallucinationReports).toBe(3);
    });

    it('should start at zero', () => {
      expect(metrics.getSnapshot().hallucinationReports).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getSnapshot — all fields
  // ═══════════════════════════════════════════════════════════════
  describe('getSnapshot — all fields', () => {
    it('should return frozen snapshot', () => {
      expect(Object.isFrozen(metrics.getSnapshot())).toBe(true);
    });

    it('should have totalExecutions field', () => {
      expect(metrics.getSnapshot()).toHaveProperty('totalExecutions');
    });

    it('should have successfulExecutions field', () => {
      expect(metrics.getSnapshot()).toHaveProperty('successfulExecutions');
    });

    it('should have failedExecutions field', () => {
      expect(metrics.getSnapshot()).toHaveProperty('failedExecutions');
    });

    it('should have cancelledExecutions field', () => {
      expect(metrics.getSnapshot()).toHaveProperty('cancelledExecutions');
    });

    it('should have totalLatencyMs field', () => {
      expect(metrics.getSnapshot()).toHaveProperty('totalLatencyMs');
    });

    it('should have averageLatencyMs field', () => {
      expect(metrics.getSnapshot()).toHaveProperty('averageLatencyMs');
    });

    it('should have p50LatencyMs field', () => {
      expect(metrics.getSnapshot()).toHaveProperty('p50LatencyMs');
    });

    it('should have p95LatencyMs field', () => {
      expect(metrics.getSnapshot()).toHaveProperty('p95LatencyMs');
    });

    it('should have p99LatencyMs field', () => {
      expect(metrics.getSnapshot()).toHaveProperty('p99LatencyMs');
    });

    it('should have totalCost field', () => {
      expect(metrics.getSnapshot()).toHaveProperty('totalCost');
    });

    it('should have totalTokens field', () => {
      expect(metrics.getSnapshot()).toHaveProperty('totalTokens');
    });

    it('should have contextCompressionRatio field', () => {
      expect(metrics.getSnapshot()).toHaveProperty('contextCompressionRatio');
    });

    it('should have metadata field', () => {
      expect(metrics.getSnapshot()).toHaveProperty('metadata');
    });

    it('should include contextSize in snapshot', () => {
      expect(metrics.getSnapshot()).toHaveProperty('contextSize');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getSnapshot — zero state
  // ═══════════════════════════════════════════════════════════════
  describe('getSnapshot — zero state', () => {
    it('should return 0 for totalExecutions', () => {
      expect(metrics.getSnapshot().totalExecutions).toBe(0);
    });

    it('should return 0 for successfulExecutions', () => {
      expect(metrics.getSnapshot().successfulExecutions).toBe(0);
    });

    it('should return 0 for failedExecutions', () => {
      expect(metrics.getSnapshot().failedExecutions).toBe(0);
    });

    it('should return 0 for totalLatencyMs', () => {
      expect(metrics.getSnapshot().totalLatencyMs).toBe(0);
    });

    it('should return 0 for totalCost', () => {
      expect(metrics.getSnapshot().totalCost).toBe(0);
    });

    it('should return 0 for totalTokens', () => {
      expect(metrics.getSnapshot().totalTokens).toBe(0);
    });

    it('should return empty providerUsage', () => {
      const usage = metrics.getSnapshot().providerUsage;
      expect(Object.keys(usage)).toHaveLength(0);
    });

    it('should return empty modelUsage', () => {
      const usage = metrics.getSnapshot().modelUsage;
      expect(Object.keys(usage)).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // reset
  // ═══════════════════════════════════════════════════════════════
  describe('reset', () => {
    it('should clear totalExecutions', () => {
      metrics.recordExecution(makeExecutionResult());
      metrics.reset();
      expect(metrics.getSnapshot().totalExecutions).toBe(0);
    });

    it('should clear successfulExecutions', () => {
      metrics.recordExecution(makeExecutionResult({ status: ExecutionStatus.Completed }));
      metrics.reset();
      expect(metrics.getSnapshot().successfulExecutions).toBe(0);
    });

    it('should clear failedExecutions', () => {
      metrics.recordExecution(makeExecutionResult({ status: ExecutionStatus.Failed }));
      metrics.reset();
      expect(metrics.getSnapshot().failedExecutions).toBe(0);
    });

    it('should clear totalLatencyMs', () => {
      metrics.recordExecution(makeExecutionResult({ latencyMs: 500 }));
      metrics.reset();
      expect(metrics.getSnapshot().totalLatencyMs).toBe(0);
    });

    it('should clear totalCost', () => {
      metrics.recordExecution(makeExecutionResult({ cost: makeCostDetail({ totalCost: 1.0 }) }));
      metrics.reset();
      expect(metrics.getSnapshot().totalCost).toBe(0);
    });

    it('should clear totalTokens', () => {
      metrics.recordExecution(makeExecutionResult());
      metrics.reset();
      expect(metrics.getSnapshot().totalTokens).toBe(0);
    });

    it('should clear totalRetries', () => {
      metrics.recordRetry();
      metrics.reset();
      expect(metrics.getSnapshot().totalRetries).toBe(0);
    });

    it('should clear totalFailovers', () => {
      metrics.recordFailover();
      metrics.reset();
      expect(metrics.getSnapshot().totalFailovers).toBe(0);
    });

    it('should clear cacheHits and cacheMisses', () => {
      metrics.recordCacheHit();
      metrics.recordCacheMiss();
      metrics.reset();
      const snap = metrics.getSnapshot();
      expect(snap.cacheHitRate).toBe(0);
      expect(snap.cacheMissRate).toBe(0);
    });

    it('should clear hallucinationReports', () => {
      metrics.recordHallucination();
      metrics.reset();
      expect(metrics.getSnapshot().hallucinationReports).toBe(0);
    });

    it('should clear providerUsage', () => {
      metrics.recordExecution(makeExecutionResult());
      metrics.reset();
      expect(Object.keys(metrics.getSnapshot().providerUsage)).toHaveLength(0);
    });

    it('should clear modelUsage', () => {
      metrics.recordExecution(makeExecutionResult());
      metrics.reset();
      expect(Object.keys(metrics.getSnapshot().modelUsage)).toHaveLength(0);
    });

    it('should clear streamingSpeed', () => {
      metrics.recordStreamChunk(makeStreamChunk({ tokenCount: 10 }));
      metrics.reset();
      expect(metrics.getSnapshot().streamingSpeed).toBe(0);
    });

    it('should allow recording after reset', () => {
      metrics.recordExecution(makeExecutionResult());
      metrics.reset();
      metrics.recordExecution(makeExecutionResult());
      expect(metrics.getSnapshot().totalExecutions).toBe(1);
    });

    it('should reset percentile latencies to 0', () => {
      metrics.recordExecution(makeExecutionResult({ latencyMs: 100 }));
      metrics.reset();
      const snap = metrics.getSnapshot();
      expect(snap.p50LatencyMs).toBe(0);
      expect(snap.p95LatencyMs).toBe(0);
      expect(snap.p99LatencyMs).toBe(0);
    });

    it('should clear totalToolCalls', () => {
      metrics.recordToolCall();
      metrics.reset();
      expect(metrics.getSnapshot().totalToolCalls).toBe(0);
    });

    it('should be safe to call reset multiple times', () => {
      metrics.reset();
      metrics.reset();
      expect(metrics.getSnapshot().totalExecutions).toBe(0);
    });

    it('should clear cancelledExecutions', () => {
      metrics.recordExecution(makeExecutionResult({ status: ExecutionStatus.Cancelled }));
      metrics.reset();
      expect(metrics.getSnapshot().cancelledExecutions).toBe(0);
    });
  });
});
