/**
 * Universal AI Provider Runtime — Domain Events
 * TASK-AIS-006A.000
 *
 * All domain events emitted by the AI Provider Runtime.
 * Events are immutable value objects.
 */

import type { Timestamp, Identifier } from '../types/common.js';
import type {
  ProviderId, ModelId, ExecutionId, StreamId, TraceId, PolicyId, CacheKeyId,
  ProviderState, ExecutionStatus, StreamState, PrivacyLevel,
  FailoverStrategy, AggregationMethod, CacheType, BackoffStrategy,
  TokenUsageDetail, CostDetail,
} from './types.js';
import { EventClassification } from '../types/common.js';

// ═══════════════════════════════════════════════════════════════════
// PROVIDER REGISTRY EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface ProviderRegisteredEvent {
  readonly eventType: 'provider.registered';
  readonly classification: EventClassification;
  readonly providerId: ProviderId;
  readonly providerName: string;
  readonly providerType: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ProviderUnregisteredEvent {
  readonly eventType: 'provider.unregistered';
  readonly classification: EventClassification;
  readonly providerId: ProviderId;
  readonly providerName: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ProviderStateChangedEvent {
  readonly eventType: 'provider.state-changed';
  readonly classification: EventClassification;
  readonly providerId: ProviderId;
  readonly previousState: ProviderState;
  readonly newState: ProviderState;
  readonly reason: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ProviderHealthCheckedEvent {
  readonly eventType: 'provider.health-checked';
  readonly classification: EventClassification;
  readonly providerId: ProviderId;
  readonly healthy: boolean;
  readonly latencyMs: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// MODEL REGISTRY EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface ModelRegisteredEvent {
  readonly eventType: 'model.registered';
  readonly classification: EventClassification;
  readonly modelId: ModelId;
  readonly modelName: string;
  readonly providerId: ProviderId;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ModelUnregisteredEvent {
  readonly eventType: 'model.unregistered';
  readonly classification: EventClassification;
  readonly modelId: ModelId;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ModelAvailabilityChangedEvent {
  readonly eventType: 'model.availability-changed';
  readonly classification: EventClassification;
  readonly modelId: ModelId;
  readonly available: boolean;
  readonly reason: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// EXECUTION EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface ExecutionStartedEvent {
  readonly eventType: 'execution.started';
  readonly classification: EventClassification;
  readonly executionId: ExecutionId;
  readonly modelId: ModelId;
  readonly providerId: ProviderId;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ExecutionCompletedEvent {
  readonly eventType: 'execution.completed';
  readonly classification: EventClassification;
  readonly executionId: ExecutionId;
  readonly modelId: ModelId;
  readonly providerId: ProviderId;
  readonly status: ExecutionStatus;
  readonly latencyMs: number;
  readonly tokenUsage: TokenUsageDetail;
  readonly cost: CostDetail;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ExecutionFailedEvent {
  readonly eventType: 'execution.failed';
  readonly classification: EventClassification;
  readonly executionId: ExecutionId;
  readonly modelId: ModelId;
  readonly providerId: ProviderId;
  readonly error: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ExecutionCancelledEvent {
  readonly eventType: 'execution.cancelled';
  readonly classification: EventClassification;
  readonly executionId: ExecutionId;
  readonly reason: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// STREAMING EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface StreamStartedEvent {
  readonly eventType: 'stream.started';
  readonly classification: EventClassification;
  readonly streamId: StreamId;
  readonly executionId: ExecutionId;
  readonly modelId: ModelId;
  readonly providerId: ProviderId;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface StreamCompletedEvent {
  readonly eventType: 'stream.completed';
  readonly classification: EventClassification;
  readonly streamId: StreamId;
  readonly executionId: ExecutionId;
  readonly state: StreamState;
  readonly totalChunks: number;
  readonly totalTokens: number;
  readonly durationMs: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface StreamPausedEvent {
  readonly eventType: 'stream.paused';
  readonly classification: EventClassification;
  readonly streamId: StreamId;
  readonly reason: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface StreamResumedEvent {
  readonly eventType: 'stream.resumed';
  readonly classification: EventClassification;
  readonly streamId: StreamId;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface StreamCancelledEvent {
  readonly eventType: 'stream.cancelled';
  readonly classification: EventClassification;
  readonly streamId: StreamId;
  readonly reason: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// RETRY / FAILOVER EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface RetryAttemptedEvent {
  readonly eventType: 'retry.attempted';
  readonly classification: EventClassification;
  readonly executionId: ExecutionId;
  readonly attempt: number;
  readonly maxRetries: number;
  readonly backoffStrategy: BackoffStrategy;
  readonly delayMs: number;
  readonly error: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface FailoverTriggeredEvent {
  readonly eventType: 'failover.triggered';
  readonly classification: EventClassification;
  readonly executionId: ExecutionId;
  readonly fromProviderId: ProviderId;
  readonly fromModelId: ModelId;
  readonly toProviderId: ProviderId;
  readonly toModelId: ModelId;
  readonly strategy: FailoverStrategy;
  readonly reason: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// CACHE EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface CacheHitEvent {
  readonly eventType: 'cache.hit';
  readonly classification: EventClassification;
  readonly cacheKeyId: CacheKeyId;
  readonly cacheType: CacheType;
  readonly modelId: ModelId;
  readonly savedTokens: number;
  readonly savedCost: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface CacheMissEvent {
  readonly eventType: 'cache.miss';
  readonly classification: EventClassification;
  readonly cacheKeyId: CacheKeyId;
  readonly cacheType: CacheType;
  readonly modelId: ModelId;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface CacheEvictedEvent {
  readonly eventType: 'cache.evicted';
  readonly classification: EventClassification;
  readonly cacheKeyId: CacheKeyId;
  readonly reason: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// COST / TOKEN EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface CostRecordedEvent {
  readonly eventType: 'cost.recorded';
  readonly classification: EventClassification;
  readonly executionId: ExecutionId;
  readonly providerId: ProviderId;
  readonly modelId: ModelId;
  readonly totalCost: number;
  readonly currency: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface BudgetExceededEvent {
  readonly eventType: 'budget.exceeded';
  readonly classification: EventClassification;
  readonly budgetLimit: number;
  readonly currentUsage: number;
  readonly period: string;
  readonly action: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface TokenBudgetWarningEvent {
  readonly eventType: 'token.budget-warning';
  readonly classification: EventClassification;
  readonly usage: number;
  readonly budget: number;
  readonly percentage: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// PRIVACY / POLICY EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface PrivacyViolationEvent {
  readonly eventType: 'privacy.violation';
  readonly classification: EventClassification;
  readonly providerId: ProviderId;
  readonly requiredLevel: PrivacyLevel;
  readonly actualLevel: PrivacyLevel;
  readonly reason: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface PolicyEvaluatedEvent {
  readonly eventType: 'policy.evaluated';
  readonly classification: EventClassification;
  readonly policyId: PolicyId;
  readonly policyType: string;
  readonly allowed: boolean;
  readonly reason: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// TOOL / PARALLEL / TRACE EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface ToolInvokedEvent {
  readonly eventType: 'tool.invoked';
  readonly classification: EventClassification;
  readonly executionId: ExecutionId;
  readonly toolName: string;
  readonly toolCallId: string;
  readonly status: string;
  readonly latencyMs: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ParallelExecutionCompletedEvent {
  readonly eventType: 'parallel.completed';
  readonly classification: EventClassification;
  readonly executionId: ExecutionId;
  readonly method: AggregationMethod;
  readonly modelCount: number;
  readonly totalLatencyMs: number;
  readonly confidence: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface TraceStartedEvent {
  readonly eventType: 'trace.started';
  readonly classification: EventClassification;
  readonly traceId: TraceId;
  readonly executionId: ExecutionId;
  readonly providerId: ProviderId;
  readonly modelId: ModelId;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface TraceCompletedEvent {
  readonly eventType: 'trace.completed';
  readonly classification: EventClassification;
  readonly traceId: TraceId;
  readonly executionId: ExecutionId;
  readonly status: ExecutionStatus;
  readonly durationMs: number;
  readonly cost: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// UNION TYPE — ALL EVENTS
// ═══════════════════════════════════════════════════════════════════

export type AIProviderEvent =
  | ProviderRegisteredEvent
  | ProviderUnregisteredEvent
  | ProviderStateChangedEvent
  | ProviderHealthCheckedEvent
  | ModelRegisteredEvent
  | ModelUnregisteredEvent
  | ModelAvailabilityChangedEvent
  | ExecutionStartedEvent
  | ExecutionCompletedEvent
  | ExecutionFailedEvent
  | ExecutionCancelledEvent
  | StreamStartedEvent
  | StreamCompletedEvent
  | StreamPausedEvent
  | StreamResumedEvent
  | StreamCancelledEvent
  | RetryAttemptedEvent
  | FailoverTriggeredEvent
  | CacheHitEvent
  | CacheMissEvent
  | CacheEvictedEvent
  | CostRecordedEvent
  | BudgetExceededEvent
  | TokenBudgetWarningEvent
  | PrivacyViolationEvent
  | PolicyEvaluatedEvent
  | ToolInvokedEvent
  | ParallelExecutionCompletedEvent
  | TraceStartedEvent
  | TraceCompletedEvent;
