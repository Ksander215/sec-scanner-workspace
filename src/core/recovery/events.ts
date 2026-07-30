/**
 * Recovery Module — Domain Events
 *
 * Events published by the recovery runtime following ADR-002 (Event Bus).
 * All events extend DomainEventBase and carry typed payloads.
 * INV-012: No domain event without a classification.
 */
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { Identifier } from '../types/common.js';
import type { RestoredState } from './types.js';

// ─── RecoveryStarted ────────────────────────────────────────
// Classification: Action — recovery process has been initiated
export interface RecoveryStarted extends DomainEventBase {
  readonly eventType: 'RecoveryStarted';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly recoveryId: Identifier;
    readonly executionId: Identifier;
    readonly checkpointId?: string;
  };
}

// ─── RecoveryStepCompleted ──────────────────────────────────
// Classification: Result — a single recovery step has finished successfully
export interface RecoveryStepCompleted extends DomainEventBase {
  readonly eventType: 'RecoveryStepCompleted';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly recoveryId: Identifier;
    readonly stepName: string;
    readonly stepIndex: number;
  };
}

// ─── RecoveryStepFailed ────────────────────────────────────
// Classification: Error — a single recovery step has failed
export interface RecoveryStepFailed extends DomainEventBase {
  readonly eventType: 'RecoveryStepFailed';
  readonly classification: EventClassification.Error;
  readonly payload: {
    readonly recoveryId: Identifier;
    readonly stepName: string;
    readonly stepIndex: number;
    readonly error: { code: string; message: string };
  };
}

// ─── RecoveryCompleted ─────────────────────────────────────
// Classification: Result — the full recovery process has succeeded
export interface RecoveryCompleted extends DomainEventBase {
  readonly eventType: 'RecoveryCompleted';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly recoveryId: Identifier;
    readonly executionId: Identifier;
    readonly restoredState: RestoredState;
  };
}

// ─── RecoveryFailed ────────────────────────────────────────
// Classification: Error — the full recovery process has failed
export interface RecoveryFailed extends DomainEventBase {
  readonly eventType: 'RecoveryFailed';
  readonly classification: EventClassification.Error;
  readonly payload: {
    readonly recoveryId: Identifier;
    readonly executionId: Identifier;
    readonly error: { code: string; message: string };
  };
}

// ─── Union type ──────────────────────────────────────────────
export type RecoveryDomainEvent =
  | RecoveryStarted
  | RecoveryStepCompleted
  | RecoveryStepFailed
  | RecoveryCompleted
  | RecoveryFailed;
