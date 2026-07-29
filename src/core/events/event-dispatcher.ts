/**
 * Event Dispatcher — internal dispatch mechanism.
 * ADR-002: subscriber isolation (failing subscriber doesn't block others).
 */
import type { EventEnvelope } from './event-envelope.js';

export type EventHandler = (
  envelope: EventEnvelope
) => Promise<void> | void;

export interface EventDispatcher {
  dispatch(envelope: EventEnvelope): Promise<void>;
}
