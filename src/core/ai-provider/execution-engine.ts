/**
 * Universal AI Provider Runtime — Execution Engine
 * TASK-AIS-006A.000
 */

import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import { EventClassification } from '../types/common.js';
import type { IExecutionEngine } from './contracts.js';
import type {
  ExecutionId, ModelId, ProviderId, ExecutionRequest, ExecutionResult,
  ExecutionStatus, CostDetail, TraceId,
  ExecutionEngineConfig, ProviderSDK, RetryAttempt, FailoverEvent,
  TokenCountResult,
  ModelDescriptor,
} from './types.js';
import { ExecutionStatus as ES } from './types.js';
import {
  ExecutionError, ExecutionTimeoutError, ExecutionCancelledError,
  ConcurrentExecutionLimitError, NoSuitableProviderError, ModelNotAvailableError,
} from './errors.js';
import type {
  ExecutionStartedEvent, ExecutionCompletedEvent, ExecutionFailedEvent, ExecutionCancelledEvent,
} from './events.js';

export class ExecutionEngine implements IExecutionEngine {
  private readonly config: ExecutionEngineConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly active = new Map<string, ES>();
  private readonly deps: {
    getProviderSDK: (providerId: ProviderId) => Promise<unknown | null>;
    getModel: (modelId: ModelId) => Promise<ModelDescriptor | null>;
    recordTokens: (usage: TokenCountResult) => Promise<void>;
    recordCost: (cost: CostDetail) => Promise<void>;
    shouldRetry: (error: Error, attempt: number) => boolean;
    getRetryDelay: (attempt: number) => number;
    recordRetryAttempt: (attempt: RetryAttempt) => void;
    getNextProvider: (executionId: ExecutionId, current: ProviderId) => Promise<{ providerId: ProviderId; modelId: ModelId } | null>;
    recordFailover: (event: FailoverEvent) => void;
    startTrace: (traceId: TraceId, executionId: ExecutionId, providerId: ProviderId, modelId: ModelId) => void;
    endTrace: (traceId: TraceId, status: ES, durationMs: number, cost: number) => void;
    metricsRecord: (result: ExecutionResult) => void;
  };

  constructor(config: ExecutionEngineConfig, deps: {
    eventBus?: InProcessEventBus | null;
    getProviderSDK: (providerId: ProviderId) => Promise<unknown | null>;
    getModel: (modelId: ModelId) => Promise<ModelDescriptor | null>;
    recordTokens?: (usage: TokenCountResult) => Promise<void>;
    recordCost?: (cost: CostDetail) => Promise<void>;
    shouldRetry?: (error: Error, attempt: number) => boolean;
    getRetryDelay?: (attempt: number) => number;
    recordRetryAttempt?: (attempt: RetryAttempt) => void;
    getNextProvider?: (executionId: ExecutionId, current: ProviderId) => Promise<{ providerId: ProviderId; modelId: ModelId } | null>;
    recordFailover?: (event: FailoverEvent) => void;
    startTrace?: (traceId: TraceId, executionId: ExecutionId, providerId: ProviderId, modelId: ModelId) => void;
    endTrace?: (traceId: TraceId, status: ES, durationMs: number, cost: number) => void;
    metricsRecord?: (result: ExecutionResult) => void;
  }) {
    this.config = config;
    this.eventBus = deps.eventBus ?? null;
    const noopAsync = async (): Promise<void> => { /* noop */ };
    const noopSync = (): void => { /* noop */ };
    const noopNull = async (): Promise<null> => null;
    this.deps = {
      getProviderSDK: deps.getProviderSDK,
      getModel: deps.getModel,
      recordTokens: deps.recordTokens ?? noopAsync,
      recordCost: deps.recordCost ?? noopAsync,
      shouldRetry: deps.shouldRetry ?? (() => false),
      getRetryDelay: deps.getRetryDelay ?? (() => 1000),
      recordRetryAttempt: deps.recordRetryAttempt ?? noopSync,
      getNextProvider: deps.getNextProvider ?? noopNull,
      recordFailover: deps.recordFailover ?? noopSync,
      startTrace: deps.startTrace ?? noopSync,
      endTrace: deps.endTrace ?? noopSync,
      metricsRecord: deps.metricsRecord ?? noopSync,
    };
  }

  private publish(event: DomainEventBase): void {
    if (this.eventBus) {
      void this.eventBus.publish(event);
    }
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now();
    const eid = request.id as string;

    if (this.active.size >= this.config.maxConcurrentExecutions) {
      throw new ConcurrentExecutionLimitError(this.config.maxConcurrentExecutions);
    }

    this.active.set(eid, ES.Queued);
    this.active.set(eid, ES.Routing);

    const modelId = request.modelId!;
    const providerId = request.providerId!;

    const model = await this.deps.getModel(modelId);
    if (!model) throw new NoSuitableProviderError({ modelId });
    if (!model.available) throw new ModelNotAvailableError(modelId as string);

    const sdk = await this.deps.getProviderSDK(providerId) as ProviderSDK | null;
    if (!sdk) throw new NoSuitableProviderError({ providerId });

    this.active.set(eid, ES.Executing);

    this.publish(Object.freeze({
      eventType: 'execution.started', classification: EventClassification.Action,
      executionId: request.id, modelId, providerId,
      timestamp: new Date().toISOString(), metadata: { ...request.metadata },
      eventId: crypto.randomUUID(), sequence: 0,
      aggregateId: eid, aggregateType: 'Execution', version: '1.0.0',
    } as ExecutionStartedEvent & DomainEventBase));

    const traceId = crypto.randomUUID() as TraceId;
    this.deps.startTrace(traceId, request.id, providerId, modelId);

    let attempt = 0;
    let lastError: Error | null = null;

    const tryExecute = async (): Promise<ExecutionResult> => {
      return Promise.race([
        sdk.execute({ ...request, providerId, modelId }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new ExecutionTimeoutError(eid, this.config.defaultTimeoutMs)), this.config.defaultTimeoutMs),
        ),
      ]);
    };

    while (true) {
      try {
        const result = await tryExecute();
        this.active.set(eid, ES.Completed);

        const latencyMs = Date.now() - startTime;
        this.publish(Object.freeze({
          eventType: 'execution.completed', classification: EventClassification.Result,
          executionId: request.id, modelId, providerId,
          status: ES.Completed, latencyMs,
          tokenUsage: result.tokenUsage, cost: result.cost,
          timestamp: new Date().toISOString(), metadata: { ...request.metadata },
          eventId: crypto.randomUUID(), sequence: 0,
          aggregateId: eid, aggregateType: 'Execution', version: '1.0.0',
        } as ExecutionCompletedEvent & DomainEventBase));

        this.deps.metricsRecord(result);
        this.deps.endTrace(traceId, ES.Completed, latencyMs, result.cost.totalCost);
        this.active.delete(eid);
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new ExecutionError(eid, String(err));
        attempt++;

        if (this.deps.shouldRetry(lastError, attempt)) {
          this.active.set(eid, ES.Retrying);
          const delay = this.deps.getRetryDelay(attempt);
          this.deps.recordRetryAttempt({
            attempt, delayMs: delay, error: lastError.message,
            timestamp: new Date().toISOString(), metadata: {},
          });
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        const next = await this.deps.getNextProvider(request.id, providerId);
        if (next) {
          this.active.set(eid, ES.FailingOver);
          this.deps.recordFailover({
            id: crypto.randomUUID(), executionId: request.id,
            fromProviderId: providerId, fromModelId: modelId,
            toProviderId: next.providerId, toModelId: next.modelId,
            reason: lastError.message, timestamp: new Date().toISOString(), metadata: {},
          });
          break;
        }

        break;
      }
    }

    this.active.set(eid, ES.Failed);
    this.publish(Object.freeze({
      eventType: 'execution.failed', classification: EventClassification.Error,
      executionId: request.id, modelId, providerId,
      error: lastError?.message ?? 'Unknown error',
      timestamp: new Date().toISOString(), metadata: { ...request.metadata },
      eventId: crypto.randomUUID(), sequence: 0,
      aggregateId: eid, aggregateType: 'Execution', version: '1.0.0',
    } as ExecutionFailedEvent & DomainEventBase));

    const latencyMs = Date.now() - startTime;
    this.deps.endTrace(traceId, ES.Failed, latencyMs, 0);
    this.active.delete(eid);
    throw lastError ?? new ExecutionError(eid, 'Execution failed');
  }

  async cancel(executionId: ExecutionId): Promise<void> {
    const eid = executionId as string;
    if (!this.active.has(eid)) throw new ExecutionCancelledError(eid);
    this.active.set(eid, ES.Cancelled);
    this.publish(Object.freeze({
      eventType: 'execution.cancelled', classification: EventClassification.Action,
      executionId, reason: 'User cancelled',
      timestamp: new Date().toISOString(), metadata: {},
      eventId: crypto.randomUUID(), sequence: 0,
      aggregateId: eid, aggregateType: 'Execution', version: '1.0.0',
    } as ExecutionCancelledEvent & DomainEventBase));
    this.active.delete(eid);
  }

  async getStatus(executionId: ExecutionId): Promise<ExecutionStatus | null> {
    return this.active.get(executionId as string) ?? null;
  }

  async listActive(): Promise<readonly ExecutionId[]> {
    return Array.from(this.active.keys()).map(id => id as ExecutionId);
  }

  async count(): Promise<number> { return this.active.size; }
}
