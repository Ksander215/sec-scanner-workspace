/**
 * Session Domain Events — StateChange events for the Session lifecycle.
 *
 * All events extend DomainEventBase and conform to:
 * - ADR-002 (Event-Driven Architecture)
 * - ARC-001.001 §5.2 (Event Classification)
 * - INV-012 (No domain event without a classification)
 *
 * Session events track the full lifecycle:
 *   SessionCreated → SessionStarted → SessionPaused → SessionResumed → SessionCompleted → SessionArchived
 */
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { Identifier, Timestamp } from '../types/common.js';

// ─── SessionCreated ─────────────────────────────────────────
export interface SessionCreated extends DomainEventBase {
  readonly eventType: 'SessionCreated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly sessionId: Identifier;
    readonly createdAt: Timestamp;
    readonly metadata: Readonly<Record<string, unknown>>;
  };
}

// ─── SessionStartedEvent ────────────────────────────────────
// Note: 'SessionStarted' is already used in DOM-002 events (User aggregate).
// We use a module-specific name to avoid collision.
export interface SessionStartedEvent extends DomainEventBase {
  readonly eventType: 'SessionStartedEvent';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly sessionId: Identifier;
    readonly startedAt: Timestamp;
  };
}

// ─── SessionPaused ──────────────────────────────────────────
export interface SessionPaused extends DomainEventBase {
  readonly eventType: 'SessionPaused';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly sessionId: Identifier;
    readonly pausedAt: Timestamp;
    readonly reason?: string;
  };
}

// ─── SessionResumed ─────────────────────────────────────────
export interface SessionResumed extends DomainEventBase {
  readonly eventType: 'SessionResumed';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly sessionId: Identifier;
    readonly resumedAt: Timestamp;
  };
}

// ─── SessionCompleted ──────────────────────────────────────
export interface SessionCompleted extends DomainEventBase {
  readonly eventType: 'SessionCompleted';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly sessionId: Identifier;
    readonly completedAt: Timestamp;
    readonly executionCount: number;
  };
}

// ─── SessionArchived ────────────────────────────────────────
export interface SessionArchived extends DomainEventBase {
  readonly eventType: 'SessionArchived';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly sessionId: Identifier;
    readonly archivedAt: Timestamp;
  };
}

// ─── Union type ───────────────────────────────────────────────
export type SessionDomainEvent =
  | SessionCreated
  | SessionStartedEvent
  | SessionPaused
  | SessionResumed
  | SessionCompleted
  | SessionArchived;
