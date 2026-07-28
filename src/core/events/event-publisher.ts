/**
 * Event Publisher — publishes events to the Event Bus.
 * ADR-002: all cross-module coordination via Event Bus.
 */
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { EventEnvelope } from './event-envelope.js';

export interface EventPublisher {
  publish<T extends DomainEventBase>(event: T): Promise<EventEnvelope>;
}
