/** INT-011A: Event Bus — Core Engine */
import type {
  EventEnvelope, EventSubscription, EventAck, EventMetadata,
  EventPriority, ReplayRequest, EventStoreEntry, EventBusConfig,
  EventBusStatistics, EventHandler, SubscriptionOffset, RetryPolicy,
} from './types.js';

const DEFAULT_CONFIG: EventBusConfig = {
  defaultRetryPolicy: {
    maxRetries: 3,
    backoffStrategy: 'exponential',
    initialDelayMs: 100,
    maxDelayMs: 30000,
    jitterMs: 50,
  },
  persistEvents: true,
  maxStoreSize: 100 * 1024 * 1024, // 100 MB
  retentionMs: 7 * 24 * 3600 * 1000, // 7 days
  publishBatchSize: 100,
  maxInFlight: 10,
};

export class EventBus {
  private config: EventBusConfig;
  private store: EventStoreEntry[] = [];
  private subscriptions: Map<string, EventSubscription> = new Map();
  private partitionCounter = 0;
  private offsetCounter = 0;
  private stats = {
    totalPublished: 0,
    totalConsumed: 0,
    totalFailed: 0,
    totalReplayed: 0,
    byEventType: {} as Record<string, { published: number; consumed: number; failed: number }>,
    byConsumerGroup: {} as Record<string, { consumed: number; failed: number; avgLatencyMs: number; _totalLatency: number; _count: number }>,
  };

  constructor(config?: Partial<EventBusConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Publish a single event */
  async publish<T>(
    eventType: string,
    payload: T,
    options?: {
      source?: string;
      correlationId?: string;
      causationId?: string;
      priority?: EventPriority;
      tenantId?: string;
      persistent?: boolean;
      headers?: Record<string, string>;
      traceId?: string;
    },
  ): Promise<EventEnvelope<T>> {
    const envelope: EventEnvelope<T> = {
      eventId: crypto.randomUUID(),
      eventType,
      version: '1.0',
      timestamp: new Date(),
      source: options?.source ?? 'unknown',
      correlationId: options?.correlationId ?? crypto.randomUUID(),
      causationId: options?.causationId,
      payload,
      metadata: {
        tenantId: options?.tenantId,
        priority: options?.priority ?? 'normal',
        persistent: options?.persistent ?? this.config.persistEvents,
        headers: options?.headers ?? {},
        retryCount: 0,
        maxRetries: this.config.defaultRetryPolicy.maxRetries,
        traceId: options?.traceId,
      },
    };

    // Persist to event store
    if (envelope.metadata.persistent) {
      this.persistEvent(envelope);
    }

    // Track stats
    this.stats.totalPublished++;
    this.ensureEventTypeStats(eventType);
    this.stats.byEventType[eventType].published++;

    // Deliver to matching subscriptions
    await this.deliver(envelope);

    return envelope;
  }

  /** Publish multiple events in a batch */
  async publishBatch<T>(
    events: Array<{
      eventType: string;
      payload: T;
      options?: Parameters<typeof this.publish<T>>[2];
    }>,
  ): Promise<EventEnvelope<T>[]> {
    const results: EventEnvelope<T>[] = [];
    for (const event of events) {
      results.push(await this.publish(event.eventType, event.payload, event.options));
    }
    return results;
  }

  /** Subscribe to event types */
  subscribe(
    subscriptionId: string,
    eventTypes: string[],
    handler: EventHandler,
    options?: {
      consumerGroup?: string;
      filter?: EventEnvelope['metadata'] extends unknown ? (event: EventEnvelope) => boolean : never;
      startFrom?: SubscriptionOffset;
      retryPolicy?: Partial<RetryPolicy>;
      deadLetterHandler?: (event: EventEnvelope, error: Error) => Promise<void>;
    },
  ): EventSubscription {
    const subscription: EventSubscription = {
      subscriptionId,
      eventTypes,
      consumerGroup: options?.consumerGroup ?? subscriptionId,
      handler,
      deadLetterHandler: options?.deadLetterHandler,
      filter: options?.filter,
      retryPolicy: {
        ...this.config.defaultRetryPolicy,
        ...options?.retryPolicy,
      },
      startFrom: options?.startFrom ?? 'latest',
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.ensureConsumerGroupStats(subscription.consumerGroup);
    return subscription;
  }

  /** Unsubscribe */
  unsubscribe(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  /** Replay events from the store */
  async replay(request: ReplayRequest): Promise<number> {
    const matching = this.store.filter(entry => {
      if (entry.event.timestamp < request.from || entry.event.timestamp > request.to) return false;
      if (request.eventTypes && !request.eventTypes.some(t => this.matchesEventType(t, entry.event.eventType))) return false;
      if (request.correlationId && entry.event.correlationId !== request.correlationId) return false;
      if (request.source && entry.event.source !== request.source) return false;
      if (request.tenantId && entry.event.metadata.tenantId !== request.tenantId) return false;
      return true;
    });

    if (request.limit) {
      matching.splice(request.limit);
    }

    for (const entry of matching) {
      await this.deliver(entry.event);
      this.stats.totalReplayed++;
    }

    return matching.length;
  }

  /** Get event by ID from store */
  getEvent(eventId: string): EventEnvelope | undefined {
    const entry = this.store.find(e => e.event.eventId === eventId);
    return entry?.event;
  }

  /** Get statistics */
  getStatistics(): EventBusStatistics {
    const byConsumerGroup: Record<string, { consumed: number; failed: number; avgLatencyMs: number }> = {};
    for (const [group, stats] of Object.entries(this.stats.byConsumerGroup)) {
      byConsumerGroup[group] = {
        consumed: stats.consumed,
        failed: stats.failed,
        avgLatencyMs: stats._count > 0 ? stats._totalLatency / stats._count : 0,
      };
    }

    return {
      totalPublished: this.stats.totalPublished,
      totalConsumed: this.stats.totalConsumed,
      totalFailed: this.stats.totalFailed,
      totalReplayed: this.stats.totalReplayed,
      byEventType: { ...this.stats.byEventType },
      byConsumerGroup,
      storeSize: this.store.reduce((sum, e) => sum + e.size, 0),
      storeEntries: this.store.length,
      subscriptions: this.subscriptions.size,
    };
  }

  /** Clear event store (for testing) */
  clearStore(): void {
    this.store = [];
    this.offsetCounter = 0;
  }

  /** Prune events older than retention period */
  prune(): number {
    const cutoff = Date.now() - this.config.retentionMs;
    const before = this.store.length;
    this.store = this.store.filter(e => e.event.timestamp.getTime() > cutoff);
    return before - this.store.length;
  }

  // --- Private methods ---

  private persistEvent(event: EventEnvelope): void {
    const entry: EventStoreEntry = {
      offset: this.offsetCounter++,
      partition: this.partitionCounter++ % 4,
      event,
      storedAt: new Date(),
      size: JSON.stringify(event).length,
    };
    this.store.push(entry);

    // Enforce max store size
    let totalSize = this.store.reduce((sum, e) => sum + e.size, 0);
    while (totalSize > this.config.maxStoreSize && this.store.length > 0) {
      totalSize -= this.store.shift()!.size;
    }
  }

  private async deliver(event: EventEnvelope): Promise<void> {
    for (const sub of this.subscriptions.values()) {
      if (!sub.eventTypes.some(t => this.matchesEventType(t, event.eventType))) continue;
      if (sub.filter && !sub.filter(event)) continue;

      try {
        const start = Date.now();
        const ack = await sub.handler(event);

        const latency = Date.now() - start;
        this.stats.totalConsumed++;
        this.ensureEventTypeStats(event.eventType);
        this.stats.byEventType[event.eventType].consumed++;
        this.ensureConsumerGroupStats(sub.consumerGroup);
        this.stats.byConsumerGroup[sub.consumerGroup].consumed++;
        this.stats.byConsumerGroup[sub.consumerGroup]._totalLatency += latency;
        this.stats.byConsumerGroup[sub.consumerGroup]._count++;

        if (ack.status === 'retry') {
          await this.handleRetry(event, sub, ack.delayMs);
        }
      } catch (err) {
        this.stats.totalFailed++;
        this.ensureEventTypeStats(event.eventType);
        this.stats.byEventType[event.eventType].failed++;
        this.ensureConsumerGroupStats(sub.consumerGroup);
        this.stats.byConsumerGroup[sub.consumerGroup].failed++;

        if (sub.deadLetterHandler) {
          await sub.deadLetterHandler(event, err as Error);
        } else {
          await this.handleRetry(event, sub);
        }
      }
    }
  }

  private async handleRetry(event: EventEnvelope, sub: EventSubscription, overrideDelayMs?: number): Promise<void> {
    if (event.metadata.retryCount >= event.metadata.maxRetries) {
      // Send to DLQ
      if (sub.deadLetterHandler) {
        await sub.deadLetterHandler(event, new Error(`Max retries (${event.metadata.maxRetries}) exceeded`));
      }
      return;
    }

    event.metadata.retryCount++;
    const delay = overrideDelayMs ?? this.calculateBackoff(event.metadata.retryCount, sub.retryPolicy);
    await new Promise(r => setTimeout(r, delay));
    await this.deliver(event);
  }

  private calculateBackoff(attempt: number, policy: RetryPolicy): number {
    let delay: number;
    switch (policy.backoffStrategy) {
      case 'fixed':
        delay = policy.initialDelayMs;
        break;
      case 'linear':
        delay = policy.initialDelayMs * attempt;
        break;
      case 'exponential':
        delay = policy.initialDelayMs * Math.pow(2, attempt - 1);
        break;
    }
    delay = Math.min(delay, policy.maxDelayMs);
    if (policy.jitterMs > 0) {
      delay += Math.random() * policy.jitterMs;
    }
    return delay;
  }

  private matchesEventType(pattern: string, eventType: string): boolean {
    if (pattern === '*') return true;
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return eventType.startsWith(prefix + '.') || eventType === prefix;
    }
    return pattern === eventType;
  }

  private ensureEventTypeStats(eventType: string): void {
    if (!this.stats.byEventType[eventType]) {
      this.stats.byEventType[eventType] = { published: 0, consumed: 0, failed: 0 };
    }
  }

  private ensureConsumerGroupStats(group: string): void {
    if (!this.stats.byConsumerGroup[group]) {
      this.stats.byConsumerGroup[group] = { consumed: 0, failed: 0, avgLatencyMs: 0, _totalLatency: 0, _count: 0 };
    }
  }
}
