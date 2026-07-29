/**
 * Checkpoint Domain Events — Domain events for the Checkpoint subsystem.
 *
 * Published via Event Bus (ADR-002).
 * All events extend DomainEventBase.
 *
 * Event lifecycle:
 *   CheckpointCreated → CheckpointConsumed / CheckpointFailed / CheckpointPurged
 *
 * Conforms to:
 * - ADR-002 (Event-Driven Architecture)
 * - ARC-001.001 §5.2 (Event Classification)
 * - INV-012 (No domain event without a classification)
 */
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { Timestamp, Identifier } from '../types/common.js';

// ─── CheckpointCreated ───────────────────────────────────────
export interface CheckpointCreated extends DomainEventBase {
  readonly eventType: 'CheckpointCreated';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly checkpointId: Identifier;
    readonly executionId: Identifier;
    readonly stage: string;
    readonly createdAt: Timestamp;
  };
}

// ─── CheckpointConsumed ──────────────────────────────────────
export interface CheckpointConsumed extends DomainEventBase {
  readonly eventType: 'CheckpointConsumed';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly checkpointId: Identifier;
    readonly executionId: Identifier;
    readonly consumedAt: Timestamp;
  };
}

// ─── CheckpointFailed ────────────────────────────────────────
export interface CheckpointFailed extends DomainEventBase {
  readonly eventType: 'CheckpointFailed';
  readonly classification: EventClassification.Error;
  readonly payload: {
    readonly checkpointId: Identifier;
    readonly executionId: Identifier;
    readonly reason: string;
  };
}

// ─── CheckpointPurged ────────────────────────────────────────
export interface CheckpointPurged extends DomainEventBase {
  readonly eventType: 'CheckpointPurged';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly checkpointId: Identifier;
    readonly executionId: Identifier;
    readonly purgedAt: Timestamp;
    readonly reason: string;
  };
}

// ─── Union type ──────────────────────────────────────────────
export type CheckpointDomainEvent =
  | CheckpointCreated
  | CheckpointConsumed
  | CheckpointFailed
  | CheckpointPurged;

/**
 * Create a checkpoint event base helper.
 * Used by CheckpointEngine to publish consistent events.
 */
export function createCheckpointEventBase(
  eventType: string,
  classification: EventClassification,
  aggregateId: string,
): {
  eventId: string;
  eventType: string;
  classification: EventClassification;
  timestamp: string;
  sequence: number;
  aggregateId: string;
  aggregateType: string;
  version: string;
} {
  return {
    eventId: crypto.randomUUID(),
    eventType,
    classification,
    timestamp: new Date().toISOString(),
    sequence: 0,
    aggregateId,
    aggregateType: 'Checkpoint',
    version: '1.0.0',
  };
}