/** INT-011A: Event Bus — Types */

/** Event envelope with versioning, correlation, and causation tracking */
export interface EventEnvelope<T = unknown> {
  /** Unique event identifier */
  eventId: string;
  /** Event type (e.g. 'finding.normalized', 'risk.assessed') */
  eventType: string;
  /** Schema version for backward compatibility */
  version: string;
  /** Timestamp when event was created */
  timestamp: Date;
  /** Source service that produced the event */
  source: string;
  /** Correlation ID — links all events in the same business operation */
  correlationId: string;
  /** Causation ID — links to the event that caused this one */
  causationId?: string;
  /** Event payload */
  payload: T;
  /** Metadata for routing, filtering, tracing */
  metadata: EventMetadata;
}

/** Metadata attached to every event */
export interface EventMetadata {
  /** Tenant ID for multi-tenancy */
  tenantId?: string;
  /** Priority for ordering */
  priority: EventPriority;
  /** Whether this event should be persisted for replay */
  persistent: boolean;
  /** Custom key-value headers */
  headers: Record<string, string>;
  /** Retry count */
  retryCount: number;
  /** Maximum retries before DLQ */
  maxRetries: number;
  /** Schema registry reference */
  schemaRef?: string;
  /** Trace ID for observability */
  traceId?: string;
  /** Span ID for observability */
  spanId?: string;
}

export type EventPriority = 'low' | 'normal' | 'high' | 'critical';

/** Subscription configuration */
export interface EventSubscription {
  /** Subscription ID */
  subscriptionId: string;
  /** Event types to subscribe to (supports wildcards: 'finding.*') */
  eventTypes: string[];
  /** Consumer group for load balancing */
  consumerGroup: string;
  /** Handler function */
  handler: EventHandler;
  /** Dead letter handler */
  deadLetterHandler?: DeadLetterHandler;
  /** Filter predicate */
  filter?: EventFilter;
  /** Retry policy */
  retryPolicy: RetryPolicy;
  /** Offset / position to start from */
  startFrom: SubscriptionOffset;
}

/** Event handler function */
export type EventHandler = (event: EventEnvelope) => Promise<EventAck>;

/** Dead letter handler */
export type DeadLetterHandler = (event: EventEnvelope, error: Error) => Promise<void>;

/** Event filter predicate */
export type EventFilter = (event: EventEnvelope) => boolean;

/** Acknowledgment result */
export interface EventAck {
  status: 'ack' | 'nack' | 'retry';
  reason?: string;
  delayMs?: number;
}

/** Retry policy configuration */
export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear';
  initialDelayMs: number;
  maxDelayMs: number;
  jitterMs: number;
}

/** Where to start consuming from */
export type SubscriptionOffset = 'earliest' | 'latest' | number;

/** Event replay request */
export interface ReplayRequest {
  /** Start timestamp */
  from: Date;
  /** End timestamp */
  to: Date;
  /** Filter by event types */
  eventTypes?: string[];
  /** Filter by correlation ID */
  correlationId?: string;
  /** Filter by source */
  source?: string;
  /** Filter by tenant */
  tenantId?: string;
  /** Maximum events to replay */
  limit?: number;
}

/** Event store entry for replay capability */
export interface EventStoreEntry {
  offset: number;
  partition: number;
  event: EventEnvelope;
  storedAt: Date;
  size: number;
}

/** Event bus configuration */
export interface EventBusConfig {
  /** Default retry policy */
  defaultRetryPolicy: RetryPolicy;
  /** Whether to persist all events for replay */
  persistEvents: boolean;
  /** Maximum event store size (bytes) */
  maxStoreSize: number;
  /** Event retention period (ms) */
  retentionMs: number;
  /** Batch size for publishing */
  publishBatchSize: number;
  /** Maximum in-flight events per subscription */
  maxInFlight: number;
}

/** Event bus statistics */
export interface EventBusStatistics {
  totalPublished: number;
  totalConsumed: number;
  totalFailed: number;
  totalReplayed: number;
  byEventType: Record<string, { published: number; consumed: number; failed: number }>;
  byConsumerGroup: Record<string, { consumed: number; failed: number; avgLatencyMs: number }>;
  storeSize: number;
  storeEntries: number;
  subscriptions: number;
}
