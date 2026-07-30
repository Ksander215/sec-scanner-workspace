/**
 * Event Hub — Unified event bus for all Platform Runtimes
 * TASK-AIS-005A.000 — Platform Integration Foundation
 *
 * All runtimes publish/subscribe through a single Event Hub.
 * Subscriber isolation: failing handlers do not block others.
 * Supports typed events, wildcard subscriptions, and event log.
 */
import type { PlatformEvent, EventSubscription, EventHub } from '../types.js';

export class PlatformEventHub implements EventHub {
  private handlers = new Map<string, Set<(event: PlatformEvent) => Promise<void> | void>>();
  private wildcardHandlers = new Set<(event: PlatformEvent) => Promise<void> | void>();
  private log: PlatformEvent[] = [];
  private sequence = 0;

  async publish<T>(
    eventType: string,
    payload: T,
    source: string = 'platform',
  ): Promise<PlatformEvent<T>> {
    const event: PlatformEvent<T> = Object.freeze({
      eventId: crypto.randomUUID(),
      eventType,
      source,
      timestamp: new Date().toISOString(),
      sequence: ++this.sequence,
      payload,
      version: 1,
    });

    this.log.push(event);

    const typeHandlers = this.handlers.get(eventType);
    const allHandlers = typeHandlers
      ? [...typeHandlers, ...this.wildcardHandlers]
      : [...this.wildcardHandlers];

    for (const handler of allHandlers) {
      try {
        await handler(event);
      } catch {
        // Subscriber isolation
      }
    }

    return event;
  }

  subscribe(
    eventType: string,
    handler: (event: PlatformEvent) => Promise<void> | void,
  ): EventSubscription {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    return {
      id: crypto.randomUUID(),
      eventType,
      unsubscribe: () => {
        this.handlers.get(eventType)?.delete(handler);
      },
    };
  }

  subscribeAll(
    handler: (event: PlatformEvent) => Promise<void> | void,
  ): EventSubscription {
    this.wildcardHandlers.add(handler);
    return {
      id: crypto.randomUUID(),
      eventType: '*',
      unsubscribe: () => {
        this.wildcardHandlers.delete(handler);
      },
    };
  }

  getEventLog(eventType?: string): readonly PlatformEvent[] {
    if (!eventType) return this.log;
    return this.log.filter((e) => e.eventType === eventType);
  }

  getSequence(): number {
    return this.sequence;
  }

  clear(): void {
    this.log = [];
    this.sequence = 0;
  }
}