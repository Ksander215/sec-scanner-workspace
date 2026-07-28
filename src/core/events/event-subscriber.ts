/**
 * Event Subscriber — subscribes handlers to event types.
 * ADR-002: typed events, versioned, classified.
 */
import type { EventHandler } from './event-dispatcher.js';

export interface Subscription {
  readonly id: string;
  readonly eventType: string;
  unsubscribe(): void;
}

export interface EventSubscriber {
  subscribe(eventType: string, handler: EventHandler): Subscription;
}
