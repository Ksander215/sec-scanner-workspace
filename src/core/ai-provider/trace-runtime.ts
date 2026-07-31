/**
 * Universal AI Provider Runtime — Trace Runtime
 * TASK-AIS-006A.000
 *
 * Stores partial traces while building, moves to completed on endTrace.
 */

import type { ITraceRuntime } from './contracts.js';
import type {
  TraceId, ExecutionId, ProviderId, ModelId,
  ExecutionStatus, ExecutionTrace, TraceRuntimeConfig,
  TokenUsageDetail, TracePhase, RetryAttempt, FailoverEvent, ToolInvocation,
} from './types.js';

interface PartialTrace {
  traceId: TraceId;
  executionId: ExecutionId;
  providerId: ProviderId;
  modelId: ModelId;
  phases: TracePhase[];
  retries: RetryAttempt[];
  failovers: FailoverEvent[];
  toolInvocations: ToolInvocation[];
  createdAt: string;
  metadata: Record<string, unknown>;
}

export class TraceRuntime implements ITraceRuntime {
  private readonly config: TraceRuntimeConfig;
  private readonly partials = new Map<string, PartialTrace>();
  private readonly completed = new Map<string, ExecutionTrace>();

  constructor(config: TraceRuntimeConfig) {
    this.config = config;
  }

  startTrace(
    traceId: TraceId,
    executionId: ExecutionId,
    providerId: ProviderId,
    modelId: ModelId,
  ): void {
    if (!this.config.enableTracing) return;

    this.partials.set(traceId as string, {
      traceId,
      executionId,
      providerId,
      modelId,
      phases: [],
      retries: [],
      failovers: [],
      toolInvocations: [],
      createdAt: new Date().toISOString(),
      metadata: {},
    });
  }

  endTrace(
    traceId: TraceId,
    status: ExecutionStatus,
    durationMs: number,
    cost: number,
  ): void {
    const partial = this.partials.get(traceId as string);
    if (!partial) return;

    const tokenUsage: TokenUsageDetail = Object.freeze({
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      reasoningTokens: 0,
      imageTokens: 0,
      audioTokens: 0,
      totalTokens: 0,
    });

    const trace: ExecutionTrace = Object.freeze({
      traceId: partial.traceId,
      executionId: partial.executionId,
      providerId: partial.providerId,
      modelId: partial.modelId,
      durationMs,
      cost,
      tokenUsage,
      status,
      phases: Object.freeze(partial.phases),
      retries: Object.freeze(partial.retries),
      failovers: Object.freeze(partial.failovers),
      toolInvocations: Object.freeze(partial.toolInvocations),
      createdAt: partial.createdAt,
      metadata: Object.freeze(partial.metadata),
    });

    this.completed.set(traceId as string, trace);
    this.partials.delete(traceId as string);

    // Enforce retention limit
    if (this.config.maxTraces > 0 && this.completed.size > this.config.maxTraces) {
      const keys = this.completed.keys();
      const oldest = keys.next().value;
      if (oldest !== undefined) {
        this.completed.delete(oldest as string);
      }
    }
  }

  addPhase(traceId: TraceId, phase: TracePhase): void {
    const partial = this.partials.get(traceId as string);
    if (partial) {
      partial.phases.push(phase);
    }
  }

  addRetry(traceId: TraceId, attempt: RetryAttempt): void {
    const partial = this.partials.get(traceId as string);
    if (partial) {
      partial.retries.push(attempt);
    }
  }

  addFailover(traceId: TraceId, event: FailoverEvent): void {
    const partial = this.partials.get(traceId as string);
    if (partial) {
      partial.failovers.push(event);
    }
  }

  addToolInvocation(traceId: TraceId, invocation: ToolInvocation): void {
    const partial = this.partials.get(traceId as string);
    if (partial) {
      partial.toolInvocations.push(invocation);
    }
  }

  getTrace(traceId: TraceId): ExecutionTrace | null {
    return this.completed.get(traceId as string) ?? null;
  }

  listTraces(
    filter?: Partial<{ executionId: string; providerId: string; modelId: string }>,
  ): readonly ExecutionTrace[] {
    let results = Array.from(this.completed.values());

    if (filter) {
      if (filter.executionId) {
        results = results.filter(t => (t.executionId as string) === filter.executionId);
      }
      if (filter.providerId) {
        results = results.filter(t => (t.providerId as string) === filter.providerId);
      }
      if (filter.modelId) {
        results = results.filter(t => (t.modelId as string) === filter.modelId);
      }
    }

    return results;
  }

  clear(): void {
    this.partials.clear();
    this.completed.clear();
  }
}
