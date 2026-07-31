import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TraceRuntime } from '../../core/ai-provider/trace-runtime.js';
import { DefaultAIProviderRuntimeConfig } from '../../core/ai-provider/types.js';
import type * as Types from '../../core/ai-provider/types.js';
import { ExecutionStatus } from '../../core/ai-provider/types.js';

// ─── Factory helpers ─────────────────────────────────────────────

function makeTraceConfig(
  overrides?: Partial<Types.TraceRuntimeConfig>,
): Types.TraceRuntimeConfig {
  return Object.freeze({
    ...DefaultAIProviderRuntimeConfig.traceRuntime,
    ...overrides,
  });
}

function makeTraceId(): Types.TraceId {
  return crypto.randomUUID() as Types.TraceId;
}

function makeExecutionId(): Types.ExecutionId {
  return crypto.randomUUID() as Types.ExecutionId;
}

function makeProviderId(): Types.ProviderId {
  return crypto.randomUUID() as Types.ProviderId;
}

function makeModelId(): Types.ModelId {
  return crypto.randomUUID() as Types.ModelId;
}

function makeTracePhase(
  overrides?: Partial<Types.TracePhase>,
): Types.TracePhase {
  const now = new Date().toISOString();
  return Object.freeze({
    name: 'routing',
    startedAt: now,
    completedAt: now,
    durationMs: 5,
    status: ExecutionStatus.Completed,
    metadata: {},
    ...overrides,
  });
}

function makeRetryAttempt(
  overrides?: Partial<Types.RetryAttempt>,
): Types.RetryAttempt {
  return Object.freeze({
    attempt: 1,
    delayMs: 1000,
    error: 'ECONNREFUSED',
    timestamp: new Date().toISOString(),
    metadata: {},
    ...overrides,
  });
}

function makeFailoverEvent(
  overrides?: Partial<Types.FailoverEvent>,
): Types.FailoverEvent {
  return Object.freeze({
    id: crypto.randomUUID(),
    executionId: makeExecutionId(),
    fromProviderId: makeProviderId(),
    fromModelId: makeModelId(),
    toProviderId: makeProviderId(),
    toModelId: makeModelId(),
    reason: 'Provider unhealthy',
    timestamp: new Date().toISOString(),
    metadata: {},
    ...overrides,
  });
}

function makeToolInvocation(
  overrides?: Partial<Types.ToolInvocation>,
): Types.ToolInvocation {
  return Object.freeze({
    id: crypto.randomUUID(),
    executionId: makeExecutionId(),
    toolCallId: 'tc-1',
    toolName: 'search',
    arguments: '{"query":"test"}',
    result: '{"found":true}',
    status: 'completed',
    latencyMs: 50,
    timestamp: new Date().toISOString(),
    metadata: {},
    ...overrides,
  });
}

function makeRuntime(
  overrides?: Partial<Types.TraceRuntimeConfig>,
): TraceRuntime {
  return new TraceRuntime(makeTraceConfig(overrides));
}

// ─── Tests ────────────────────────────────────────────────────────

describe('TraceRuntime', () => {
  let runtime: TraceRuntime;

  beforeEach(() => {
    runtime = makeRuntime();
  });

  afterEach(() => {
    // Each test is independent via fresh runtime in beforeEach
  });

  // ═══════════════════════════════════════════════════════════════
  // startTrace / endTrace
  // ═══════════════════════════════════════════════════════════════
  describe('startTrace / endTrace', () => {
    it('should start and end a trace', () => {
      const traceId = makeTraceId();
      const executionId = makeExecutionId();
      const providerId = makeProviderId();
      const modelId = makeModelId();
      runtime.startTrace(traceId, executionId, providerId, modelId);
      runtime.endTrace(traceId, ExecutionStatus.Completed, 200, 0.01);
      const trace = runtime.getTrace(traceId);
      expect(trace).not.toBeNull();
    });

    it('should store traceId in completed trace', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.traceId).toBe(traceId);
    });

    it('should store executionId in completed trace', () => {
      const traceId = makeTraceId();
      const executionId = makeExecutionId();
      runtime.startTrace(traceId, executionId, makeProviderId(), makeModelId());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.executionId).toBe(executionId);
    });

    it('should store providerId in completed trace', () => {
      const traceId = makeTraceId();
      const providerId = makeProviderId();
      runtime.startTrace(traceId, makeExecutionId(), providerId, makeModelId());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.providerId).toBe(providerId);
    });

    it('should store modelId in completed trace', () => {
      const traceId = makeTraceId();
      const modelId = makeModelId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), modelId);
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.modelId).toBe(modelId);
    });

    it('should store durationMs in completed trace', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 500, 0);
      expect(runtime.getTrace(traceId)!.durationMs).toBe(500);
    });

    it('should store cost in completed trace', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0.05);
      expect(runtime.getTrace(traceId)!.cost).toBe(0.05);
    });

    it('should store status in completed trace', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(traceId, ExecutionStatus.Failed, 100, 0);
      expect(runtime.getTrace(traceId)!.status).toBe(ExecutionStatus.Failed);
    });

    it('should store createdAt timestamp', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(typeof runtime.getTrace(traceId)!.createdAt).toBe('string');
    });

    it('should have empty tokenUsage in completed trace', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      const tu = runtime.getTrace(traceId)!.tokenUsage;
      expect(tu.totalTokens).toBe(0);
    });

    it('should return frozen completed trace', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(Object.isFrozen(runtime.getTrace(traceId)!)).toBe(true);
    });

    it('should have empty phases in completed trace by default', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.phases).toHaveLength(0);
    });

    it('should have empty retries in completed trace by default', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.retries).toHaveLength(0);
    });

    it('should have empty failovers in completed trace by default', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.failovers).toHaveLength(0);
    });

    it('should have empty toolInvocations in completed trace by default', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.toolInvocations).toHaveLength(0);
    });

    it('should not return trace from getTrace before endTrace', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      expect(runtime.getTrace(traceId)).toBeNull();
    });

    it('should not throw on endTrace with unknown traceId', () => {
      expect(() => runtime.endTrace(makeTraceId(), ExecutionStatus.Completed, 100, 0)).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // addPhase
  // ═══════════════════════════════════════════════════════════════
  describe('addPhase', () => {
    it('should add a phase to a started trace', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addPhase(traceId, makeTracePhase({ name: 'tokenizing' }));
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.phases).toHaveLength(1);
    });

    it('should store phase name', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addPhase(traceId, makeTracePhase({ name: 'context-building' }));
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.phases[0].name).toBe('context-building');
    });

    it('should store phase durationMs', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addPhase(traceId, makeTracePhase({ durationMs: 42 }));
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.phases[0].durationMs).toBe(42);
    });

    it('should accumulate multiple phases', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addPhase(traceId, makeTracePhase({ name: 'routing' }));
      runtime.addPhase(traceId, makeTracePhase({ name: 'tokenizing' }));
      runtime.addPhase(traceId, makeTracePhase({ name: 'executing' }));
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.phases).toHaveLength(3);
    });

    it('should not add phase to non-existent trace', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addPhase(makeTraceId(), makeTracePhase());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.phases).toHaveLength(0);
    });

    it('should freeze phases array in completed trace', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addPhase(traceId, makeTracePhase());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(Object.isFrozen(runtime.getTrace(traceId)!.phases)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // addRetry
  // ═══════════════════════════════════════════════════════════════
  describe('addRetry', () => {
    it('should add a retry to a started trace', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addRetry(traceId, makeRetryAttempt({ attempt: 1 }));
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.retries).toHaveLength(1);
    });

    it('should store retry attempt number', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addRetry(traceId, makeRetryAttempt({ attempt: 2 }));
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.retries[0].attempt).toBe(2);
    });

    it('should store retry error', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addRetry(traceId, makeRetryAttempt({ error: '503 Service Unavailable' }));
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.retries[0].error).toBe('503 Service Unavailable');
    });

    it('should accumulate multiple retries', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addRetry(traceId, makeRetryAttempt({ attempt: 1 }));
      runtime.addRetry(traceId, makeRetryAttempt({ attempt: 2 }));
      runtime.addRetry(traceId, makeRetryAttempt({ attempt: 3 }));
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.retries).toHaveLength(3);
    });

    it('should freeze retries array', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addRetry(traceId, makeRetryAttempt());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(Object.isFrozen(runtime.getTrace(traceId)!.retries)).toBe(true);
    });

    it('should not add retry to non-existent trace', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addRetry(makeTraceId(), makeRetryAttempt());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.retries).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // addFailover
  // ═══════════════════════════════════════════════════════════════
  describe('addFailover', () => {
    it('should add a failover to a started trace', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addFailover(traceId, makeFailoverEvent());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.failovers).toHaveLength(1);
    });

    it('should store failover reason', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addFailover(traceId, makeFailoverEvent({ reason: 'Rate limit exceeded' }));
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.failovers[0].reason).toBe('Rate limit exceeded');
    });

    it('should store failover fromProviderId', () => {
      const fromPid = makeProviderId();
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), fromPid, makeModelId());
      const toPid = makeProviderId();
      runtime.addFailover(traceId, makeFailoverEvent({ fromProviderId: fromPid, toProviderId: toPid }));
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.failovers[0].fromProviderId).toBe(fromPid);
      expect(runtime.getTrace(traceId)!.failovers[0].toProviderId).toBe(toPid);
    });

    it('should accumulate multiple failovers', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addFailover(traceId, makeFailoverEvent());
      runtime.addFailover(traceId, makeFailoverEvent());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.failovers).toHaveLength(2);
    });

    it('should freeze failovers array', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addFailover(traceId, makeFailoverEvent());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(Object.isFrozen(runtime.getTrace(traceId)!.failovers)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // addToolInvocation
  // ═══════════════════════════════════════════════════════════════
  describe('addToolInvocation', () => {
    it('should add a tool invocation to a started trace', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addToolInvocation(traceId, makeToolInvocation());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.toolInvocations).toHaveLength(1);
    });

    it('should store tool name', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addToolInvocation(traceId, makeToolInvocation({ toolName: 'calculator' }));
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.toolInvocations[0].toolName).toBe('calculator');
    });

    it('should store tool result', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addToolInvocation(traceId, makeToolInvocation({ result: '42' }));
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.toolInvocations[0].result).toBe('42');
    });

    it('should store tool status', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addToolInvocation(traceId, makeToolInvocation({ status: 'failed' }));
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.toolInvocations[0].status).toBe('failed');
    });

    it('should accumulate multiple tool invocations', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addToolInvocation(traceId, makeToolInvocation({ toolName: 'search' }));
      runtime.addToolInvocation(traceId, makeToolInvocation({ toolName: 'calculator' }));
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)!.toolInvocations).toHaveLength(2);
    });

    it('should freeze toolInvocations array', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addToolInvocation(traceId, makeToolInvocation());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(Object.isFrozen(runtime.getTrace(traceId)!.toolInvocations)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getTrace
  // ═══════════════════════════════════════════════════════════════
  describe('getTrace', () => {
    it('should return null for non-existent trace', () => {
      expect(runtime.getTrace(makeTraceId())).toBeNull();
    });

    it('should return null for trace that was started but not ended', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      expect(runtime.getTrace(traceId)).toBeNull();
    });

    it('should return the completed trace', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0.01);
      const trace = runtime.getTrace(traceId);
      expect(trace).not.toBeNull();
      expect(trace!.traceId).toBe(traceId);
    });

    it('should return null after clear', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      runtime.clear();
      expect(runtime.getTrace(traceId)).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // listTraces
  // ═══════════════════════════════════════════════════════════════
  describe('listTraces', () => {
    it('should return empty array when no traces', () => {
      expect(runtime.listTraces()).toHaveLength(0);
    });

    it('should return all completed traces', () => {
      const t1 = makeTraceId();
      const t2 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.startTrace(t2, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      runtime.endTrace(t2, ExecutionStatus.Completed, 200, 0);
      expect(runtime.listTraces()).toHaveLength(2);
    });

    it('should not include started but uncompleted traces', () => {
      const t1 = makeTraceId();
      const t2 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.startTrace(t2, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      expect(runtime.listTraces()).toHaveLength(1);
    });

    it('should filter by executionId', () => {
      const eid = makeExecutionId();
      const t1 = makeTraceId();
      const t2 = makeTraceId();
      runtime.startTrace(t1, eid, makeProviderId(), makeModelId());
      runtime.startTrace(t2, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      runtime.endTrace(t2, ExecutionStatus.Completed, 200, 0);
      expect(runtime.listTraces({ executionId: eid as string })).toHaveLength(1);
    });

    it('should filter by providerId', () => {
      const pid = makeProviderId();
      const t1 = makeTraceId();
      const t2 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), pid, makeModelId());
      runtime.startTrace(t2, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      runtime.endTrace(t2, ExecutionStatus.Completed, 200, 0);
      expect(runtime.listTraces({ providerId: pid as string })).toHaveLength(1);
    });

    it('should filter by modelId', () => {
      const mid = makeModelId();
      const t1 = makeTraceId();
      const t2 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), mid);
      runtime.startTrace(t2, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      runtime.endTrace(t2, ExecutionStatus.Completed, 200, 0);
      expect(runtime.listTraces({ modelId: mid as string })).toHaveLength(1);
    });

    it('should return empty for non-matching filter', () => {
      const t1 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      expect(runtime.listTraces({ executionId: 'non-existent' })).toHaveLength(0);
    });

    it('should handle combined filters', () => {
      const eid = makeExecutionId();
      const pid = makeProviderId();
      const t1 = makeTraceId();
      const t2 = makeTraceId();
      runtime.startTrace(t1, eid, pid, makeModelId());
      runtime.startTrace(t2, eid, makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      runtime.endTrace(t2, ExecutionStatus.Completed, 200, 0);
      expect(runtime.listTraces({ executionId: eid as string, providerId: pid as string })).toHaveLength(1);
    });

    it('should return empty array after clear', () => {
      const t1 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      runtime.clear();
      expect(runtime.listTraces()).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // clear
  // ═══════════════════════════════════════════════════════════════
  describe('clear', () => {
    it('should remove all completed traces', () => {
      const t1 = makeTraceId();
      const t2 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.startTrace(t2, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      runtime.endTrace(t2, ExecutionStatus.Completed, 200, 0);
      runtime.clear();
      expect(runtime.listTraces()).toHaveLength(0);
    });

    it('should remove partial (started) traces', () => {
      const t1 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.clear();
      // Starting a new trace with same id after clear should work
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(t1)).not.toBeNull();
    });

    it('should be safe to call clear on empty runtime', () => {
      expect(() => runtime.clear()).not.toThrow();
      expect(runtime.listTraces()).toHaveLength(0);
    });

    it('should allow new traces after clear', () => {
      const t1 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      runtime.clear();
      const t2 = makeTraceId();
      runtime.startTrace(t2, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t2, ExecutionStatus.Completed, 200, 0);
      expect(runtime.listTraces()).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Disabled tracing
  // ═══════════════════════════════════════════════════════════════
  describe('disabled tracing', () => {
    beforeEach(() => {
      runtime = makeRuntime({ enableTracing: false });
    });

    it('should not create trace on startTrace', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)).toBeNull();
    });

    it('should not record phases when disabled', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addPhase(traceId, makeTracePhase());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)).toBeNull();
    });

    it('should not record retries when disabled', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addRetry(traceId, makeRetryAttempt());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)).toBeNull();
    });

    it('should not record failovers when disabled', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addFailover(traceId, makeFailoverEvent());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)).toBeNull();
    });

    it('should not record tool invocations when disabled', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addToolInvocation(traceId, makeToolInvocation());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(traceId)).toBeNull();
    });

    it('should return empty list from listTraces when disabled', () => {
      const traceId = makeTraceId();
      runtime.startTrace(traceId, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(traceId, ExecutionStatus.Completed, 100, 0);
      expect(runtime.listTraces()).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Retention limit
  // ═══════════════════════════════════════════════════════════════
  describe('retention limit', () => {
    it('should enforce maxTraces limit', () => {
      runtime = makeRuntime({ maxTraces: 2 });
      const t1 = makeTraceId();
      const t2 = makeTraceId();
      const t3 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      runtime.startTrace(t2, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t2, ExecutionStatus.Completed, 100, 0);
      runtime.startTrace(t3, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t3, ExecutionStatus.Completed, 100, 0);
      expect(runtime.listTraces()).toHaveLength(2);
    });

    it('should evict oldest trace when exceeding limit', () => {
      runtime = makeRuntime({ maxTraces: 2 });
      const t1 = makeTraceId();
      const t2 = makeTraceId();
      const t3 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      runtime.startTrace(t2, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t2, ExecutionStatus.Completed, 100, 0);
      runtime.startTrace(t3, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t3, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(t1)).toBeNull();
      expect(runtime.getTrace(t2)).not.toBeNull();
      expect(runtime.getTrace(t3)).not.toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Multiple traces interaction
  // ═══════════════════════════════════════════════════════════════
  describe('multiple traces', () => {
    it('should store multiple independent traces', () => {
      const t1 = makeTraceId();
      const t2 = makeTraceId();
      const eid1 = makeExecutionId();
      const eid2 = makeExecutionId();
      const pid1 = makeProviderId();
      const pid2 = makeProviderId();
      const mid1 = makeModelId();
      const mid2 = makeModelId();
      runtime.startTrace(t1, eid1, pid1, mid1);
      runtime.startTrace(t2, eid2, pid2, mid2);
      runtime.addPhase(t1, makeTracePhase({ name: 'routing' }));
      runtime.addPhase(t2, makeTracePhase({ name: 'executing' }));
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0.01);
      runtime.endTrace(t2, ExecutionStatus.Failed, 200, 0.02);
      expect(runtime.getTrace(t1)!.executionId).toBe(eid1);
      expect(runtime.getTrace(t2)!.executionId).toBe(eid2);
      expect(runtime.getTrace(t1)!.phases[0].name).toBe('routing');
      expect(runtime.getTrace(t2)!.phases[0].name).toBe('executing');
    });

    it('should filter listTraces by multiple fields', () => {
      const pid = makeProviderId();
      const mid = makeModelId();
      const eid = makeExecutionId();
      const t1 = makeTraceId();
      const t2 = makeTraceId();
      const t3 = makeTraceId();
      runtime.startTrace(t1, eid, pid, mid);
      runtime.startTrace(t2, makeExecutionId(), pid, makeModelId());
      runtime.startTrace(t3, makeExecutionId(), makeProviderId(), mid);
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      runtime.endTrace(t2, ExecutionStatus.Completed, 100, 0);
      runtime.endTrace(t3, ExecutionStatus.Completed, 100, 0);
      const results = runtime.listTraces({
        providerId: pid as string,
        modelId: mid as string,
        executionId: eid as string,
      });
      expect(results).toHaveLength(1);
      expect(results[0].traceId).toBe(t1);
    });

    it('should support listTraces with partial filter (providerId only)', () => {
      const pid = makeProviderId();
      const t1 = makeTraceId();
      const t2 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), pid, makeModelId());
      runtime.startTrace(t2, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      runtime.endTrace(t2, ExecutionStatus.Completed, 100, 0);
      expect(runtime.listTraces({ providerId: pid as string })).toHaveLength(1);
    });

    it('should support listTraces with partial filter (modelId only)', () => {
      const mid = makeModelId();
      const t1 = makeTraceId();
      const t2 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), mid);
      runtime.startTrace(t2, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      runtime.endTrace(t2, ExecutionStatus.Completed, 100, 0);
      expect(runtime.listTraces({ modelId: mid as string })).toHaveLength(1);
    });

    it('should handle endTrace with different statuses', () => {
      const t1 = makeTraceId();
      const t2 = makeTraceId();
      const t3 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.startTrace(t2, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.startTrace(t3, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      runtime.endTrace(t2, ExecutionStatus.Failed, 200, 0);
      runtime.endTrace(t3, ExecutionStatus.Cancelled, 50, 0);
      expect(runtime.getTrace(t1)!.status).toBe(ExecutionStatus.Completed);
      expect(runtime.getTrace(t2)!.status).toBe(ExecutionStatus.Failed);
      expect(runtime.getTrace(t3)!.status).toBe(ExecutionStatus.Cancelled);
    });

    it('should complete trace with TimedOut status', () => {
      const t1 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.TimedOut, 60000, 0);
      expect(runtime.getTrace(t1)!.status).toBe(ExecutionStatus.TimedOut);
      expect(runtime.getTrace(t1)!.durationMs).toBe(60000);
    });

    it('should complete trace with zero cost', () => {
      const t1 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(t1)!.cost).toBe(0);
    });

    it('should complete trace with zero duration', () => {
      const t1 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 0, 0);
      expect(runtime.getTrace(t1)!.durationMs).toBe(0);
    });

    it('should store frozen metadata in completed trace', () => {
      const t1 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      expect(Object.isFrozen(runtime.getTrace(t1)!.metadata)).toBe(true);
    });

    it('should store frozen tokenUsage in completed trace', () => {
      const t1 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      expect(Object.isFrozen(runtime.getTrace(t1)!.tokenUsage)).toBe(true);
    });

    it('should not add phase after trace is ended', () => {
      const t1 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      runtime.addPhase(t1, makeTracePhase({ name: 'late' }));
      expect(runtime.getTrace(t1)!.phases).toHaveLength(0);
    });

    it('should not add retry after trace is ended', () => {
      const t1 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      runtime.addRetry(t1, makeRetryAttempt());
      expect(runtime.getTrace(t1)!.retries).toHaveLength(0);
    });

    it('should not add failover after trace is ended', () => {
      const t1 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      runtime.addFailover(t1, makeFailoverEvent());
      expect(runtime.getTrace(t1)!.failovers).toHaveLength(0);
    });

    it('should not add tool invocation after trace is ended', () => {
      const t1 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      runtime.addToolInvocation(t1, makeToolInvocation());
      expect(runtime.getTrace(t1)!.toolInvocations).toHaveLength(0);
    });

    it('should handle maxTraces of 1', () => {
      runtime = makeRuntime({ maxTraces: 1 });
      const t1 = makeTraceId();
      const t2 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      runtime.startTrace(t2, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.endTrace(t2, ExecutionStatus.Completed, 100, 0);
      expect(runtime.listTraces()).toHaveLength(1);
      expect(runtime.getTrace(t1)).toBeNull();
      expect(runtime.getTrace(t2)).not.toBeNull();
    });

    it('should store phase status correctly', () => {
      const t1 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addPhase(t1, makeTracePhase({ status: ExecutionStatus.Failed }));
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(t1)!.phases[0].status).toBe(ExecutionStatus.Failed);
    });

    it('should store retry delayMs correctly', () => {
      const t1 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addRetry(t1, makeRetryAttempt({ delayMs: 5000 }));
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(t1)!.retries[0].delayMs).toBe(5000);
    });

    it('should store failover toModelId correctly', () => {
      const toMid = makeModelId();
      const t1 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addFailover(t1, makeFailoverEvent({ toModelId: toMid }));
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(t1)!.failovers[0].toModelId).toBe(toMid);
    });

    it('should store tool invocation latencyMs correctly', () => {
      const t1 = makeTraceId();
      runtime.startTrace(t1, makeExecutionId(), makeProviderId(), makeModelId());
      runtime.addToolInvocation(t1, makeToolInvocation({ latencyMs: 123 }));
      runtime.endTrace(t1, ExecutionStatus.Completed, 100, 0);
      expect(runtime.getTrace(t1)!.toolInvocations[0].latencyMs).toBe(123);
    });
  });
});
