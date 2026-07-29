/**
 * Workflow Runtime — Domain Events
 * TASK-AIS-003H.000
 *
 * Events published by the workflow runtime following ADR-002 (Event Bus).
 * All events extend DomainEventBase and carry typed payloads.
 * INV-012: No domain event without a classification.
 *
 * Conforms to: ADR-002 (Event Bus), ARC-001.001 FP-07
 */
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { Timestamp } from '../types/common.js';

// ─── WorkflowCreated ──────────────────────────────────────────
export interface WorkflowCreated extends DomainEventBase {
  readonly eventType: 'WorkflowCreated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly workflowId: string;
    readonly name: string;
    readonly version: string;
    readonly stageCount: number;
    readonly createdAt: Timestamp;
  };
}

// ─── WorkflowStarted ───────────────────────────────────────────
export interface WorkflowStarted extends DomainEventBase {
  readonly eventType: 'WorkflowStarted';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly workflowInstanceId: string;
    readonly workflowId: string;
    readonly name: string;
    readonly startedAt: Timestamp;
  };
}

// ─── StageStarted ──────────────────────────────────────────────
export interface StageStarted extends DomainEventBase {
  readonly eventType: 'StageStarted';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly workflowInstanceId: string;
    readonly stageId: string;
    readonly stageName: string;
    readonly attempt: number;
    readonly startedAt: Timestamp;
  };
}

// ─── StageCompleted ────────────────────────────────────────────
export interface StageCompleted extends DomainEventBase {
  readonly eventType: 'StageCompleted';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly workflowInstanceId: string;
    readonly stageId: string;
    readonly stageName: string;
    readonly durationMs: number;
    readonly attempt: number;
    readonly completedAt: Timestamp;
  };
}

// ─── StageFailed ───────────────────────────────────────────────
export interface StageFailed extends DomainEventBase {
  readonly eventType: 'StageFailed';
  readonly classification: EventClassification.Error;
  readonly payload: {
    readonly workflowInstanceId: string;
    readonly stageId: string;
    readonly stageName: string;
    readonly errorCode: string;
    readonly errorMessage: string;
    readonly attempt: number;
    readonly retryable: boolean;
    readonly failedAt: Timestamp;
  };
}

// ─── WorkflowPaused ───────────────────────────────────────────
export interface WorkflowPaused extends DomainEventBase {
  readonly eventType: 'WorkflowPaused';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly workflowInstanceId: string;
    readonly workflowId: string;
    readonly currentStageId: string | null;
    readonly pausedAt: Timestamp;
  };
}

// ─── WorkflowResumed ────────────────────────────────────────────
export interface WorkflowResumed extends DomainEventBase {
  readonly eventType: 'WorkflowResumed';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly workflowInstanceId: string;
    readonly workflowId: string;
    readonly resumedStageId: string | null;
    readonly resumedAt: Timestamp;
  };
}

// ─── WorkflowCompleted ────────────────────────────────────────
export interface WorkflowCompleted extends DomainEventBase {
  readonly eventType: 'WorkflowCompleted';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly workflowInstanceId: string;
    readonly workflowId: string;
    readonly name: string;
    readonly durationMs: number;
    readonly totalStages: number;
    readonly completedStages: number;
    readonly completedAt: Timestamp;
  };
}

// ─── WorkflowCancelled ─────────────────────────────────────────
export interface WorkflowCancelled extends DomainEventBase {
  readonly eventType: 'WorkflowCancelled';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly workflowInstanceId: string;
    readonly workflowId: string;
    readonly reason: string;
    readonly cancelledAt: Timestamp;
  };
}

// ─── WorkflowRecovered ────────────────────────────────────────
export interface WorkflowRecovered extends DomainEventBase {
  readonly eventType: 'WorkflowRecovered';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly workflowInstanceId: string;
    readonly workflowId: string;
    readonly recoveredFromState: string;
    readonly recoveredToState: string;
    readonly recoveredAt: Timestamp;
  };
}

// ─── WorkflowError ─────────────────────────────────────────────
export interface WorkflowErrorEvent extends DomainEventBase {
  readonly eventType: 'WorkflowError';
  readonly classification: EventClassification.Error;
  readonly payload: {
    readonly workflowInstanceId: string;
    readonly workflowId: string;
    readonly errorCode: string;
    readonly errorMessage: string;
    readonly stageId: string | null;
    readonly recoverable: boolean;
    readonly occurredAt: Timestamp;
  };
}

// ─── StageSkipped ──────────────────────────────────────────────
export interface StageSkipped extends DomainEventBase {
  readonly eventType: 'StageSkipped';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly workflowInstanceId: string;
    readonly stageId: string;
    readonly stageName: string;
    readonly reason: string;
    readonly skippedAt: Timestamp;
  };
}

// ─── CompensationStarted ──────────────────────────────────────
export interface CompensationStarted extends DomainEventBase {
  readonly eventType: 'CompensationStarted';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly workflowInstanceId: string;
    readonly stageId: string;
    readonly action: string;
    readonly startedAt: Timestamp;
  };
}

// ─── CompensationCompleted ────────────────────────────────────
export interface CompensationCompleted extends DomainEventBase {
  readonly eventType: 'CompensationCompleted';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly workflowInstanceId: string;
    readonly stageId: string;
    readonly action: string;
    readonly completedAt: Timestamp;
  };
}

// ─── CheckpointCreated ──────────────────────────────────────────
export interface CheckpointCreated extends DomainEventBase {
  readonly eventType: 'CheckpointCreated';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly workflowInstanceId: string;
    readonly checkpointId: string;
    readonly state: string;
    readonly currentStageId: string | null;
    readonly createdAt: Timestamp;
  };
}

// ─── Union type ──────────────────────────────────────────────
export type WorkflowEvent =
  | WorkflowCreated
  | WorkflowStarted
  | StageStarted
  | StageCompleted
  | StageFailed
  | WorkflowPaused
  | WorkflowResumed
  | WorkflowCompleted
  | WorkflowCancelled
  | WorkflowRecovered
  | WorkflowErrorEvent
  | StageSkipped
  | CompensationStarted
  | CompensationCompleted
  | CheckpointCreated;

/**
 * Create a workflow event base helper.
 */
export function createWorkflowEventBase(
  eventType: string,
  classification: EventClassification,
  aggregateId: string,
): {
  eventId: string;
  eventType: string;
  classification: EventClassification;
  timestamp: string;
  aggregateId: string;
  aggregateType: string;
  version: string;
} {
  return {
    eventId: crypto.randomUUID(),
    eventType,
    classification,
    timestamp: new Date().toISOString(),
    aggregateId,
    aggregateType: 'Workflow',
    version: '1.0.0',
  };
}
