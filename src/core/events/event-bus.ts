/**
 * Event Bus — ADR-002, ARC-001.001 FP-07
 * In-process, asynchronous, typed, versioned, classified.
 * Subscriber isolation: failing subscriber doesn't block others.
 * Append-only event log for auditability.
 */
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { EventEnvelope } from './event-envelope.js';
import type { EventPublisher } from './event-publisher.js';
import type { EventSubscriber, Subscription } from './event-subscriber.js';
import type { EventDispatcher, EventHandler } from './event-dispatcher.js';

export interface EventBus extends EventPublisher, EventSubscriber, EventDispatcher {
  /** Get all recorded envelopes (for audit, AL-012) */
  getLog(): readonly EventEnvelope[];
  /** Current sequence number */
  getSequence(): number;
  /** Clear log (for testing only) */
  clear(): void;
}

export class InProcessEventBus implements EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private log: EventEnvelope[] = [];
  private sequence = 0;

  async dispatch(envelope: EventEnvelope): Promise<void> {
    this.log.push(envelope);
    const handlers = this.handlers.get(envelope.eventType);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        await handler(envelope);
      } catch {
        // ADR-002: subscriber isolation — failing handler doesn't block others
      }
    }
  }

  async publish<T extends DomainEventBase>(event: T): Promise<EventEnvelope> {
    const envelope: EventEnvelope = {
      eventId: event.eventId,
      eventType: event.eventType,
      classification: event.classification,
      timestamp: event.timestamp,
      sequence: ++this.sequence,
      payload: (event as unknown as { payload: unknown }).payload,
      version: event.version,
    };
    await this.dispatch(envelope);
    return envelope;
  }

  subscribe(
    eventType: string,
    handler: EventHandler,
  ): Subscription {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
    const id = crypto.randomUUID();
    return {
      id,
      eventType,
      unsubscribe: () => {
        this.handlers.get(eventType)?.delete(handler);
      },
    };
  }

  getLog(): readonly EventEnvelope[] {
    return this.log;
  }

  getSequence(): number {
    return this.sequence;
  }

  clear(): void {
    this.log = [];
    this.sequence = 0;
  }
}
