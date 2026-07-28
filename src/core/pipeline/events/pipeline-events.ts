/**
 * Pipeline Domain Events — Execution lifecycle events published via Event Bus.
 *
 * All events extend DomainEventBase and conform to:
 * - ADR-002 (Event-Driven Architecture)
 * - ARC-001.001 §5.2 (Event Classification)
 * - INV-012 (No domain event without a classification)
 *
 * Pipeline events track the full lifecycle:
 *   GoalCreated → PlanBuilt → TaskStarted → TaskFinished → ExecutionCompleted/Failed/Cancelled
 */
import type { DomainEventBase } from '../../domain/events/domain-event.js';
import { EventClassification } from '../../types/common.js';
import type { Identifier, Timestamp } from '../../types/common.js';
import type { ExecutionStatus, TaskStatus } from '../types.js';

// ─── GoalCreated ────────────────────────────────────────────
export interface GoalCreated extends DomainEventBase {
  readonly eventType: 'GoalCreated';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly goalId: Identifier;
    readonly description: string;
    readonly autonomyLevel: string;
    readonly createdAt: Timestamp;
  };
}

// ─── PlanBuilt ───────────────────────────────────────────────
export interface PlanBuilt extends DomainEventBase {
  readonly eventType: 'PlanBuilt';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly planId: Identifier;
    readonly goalId: Identifier;
    readonly stepCount: number;
    readonly plannerId: string;
    readonly createdAt: Timestamp;
  };
}

// ─── TaskStarted ─────────────────────────────────────────────
export interface TaskStarted extends DomainEventBase {
  readonly eventType: 'TaskStarted';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly taskId: Identifier;
    readonly stepId: Identifier;
    readonly planId: Identifier;
    readonly taskType: string;
    readonly name: string;
    readonly attempt: number;
    readonly startedAt: Timestamp;
  };
}

// ─── TaskFinished ────────────────────────────────────────────
export interface TaskFinished extends DomainEventBase {
  readonly eventType: 'TaskFinished';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly taskId: Identifier;
    readonly stepId: Identifier;
    readonly planId: Identifier;
    readonly status: TaskStatus;
    readonly durationMs: number;
    readonly attempts: number;
    readonly error?: { readonly code: string; readonly message: string };
  };
}

// ─── ExecutionCompleted ─────────────────────────────────────
export interface ExecutionCompleted extends DomainEventBase {
  readonly eventType: 'ExecutionCompleted';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly executionId: Identifier;
    readonly goalId: Identifier;
    readonly status: ExecutionStatus.Completed;
    readonly durationMs: number;
    readonly taskCount: number;
    readonly completedAt: Timestamp;
  };
}

// ─── ExecutionFailed ────────────────────────────────────────
export interface ExecutionFailed extends DomainEventBase {
  readonly eventType: 'ExecutionFailed';
  readonly classification: EventClassification.Error;
  readonly payload: {
    readonly executionId: Identifier;
    readonly goalId: Identifier;
    readonly status: ExecutionStatus.Failed;
    readonly error: { readonly code: string; readonly message: string };
    readonly failedTaskId?: Identifier;
    readonly failedStepId?: Identifier;
    readonly durationMs: number;
    readonly failedAt: Timestamp;
  };
}

// ─── ExecutionCancelled ─────────────────────────────────────
export interface ExecutionCancelled extends DomainEventBase {
  readonly eventType: 'ExecutionCancelled';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly executionId: Identifier;
    readonly goalId: Identifier;
    readonly reason?: string;
    readonly cancelledAt: Timestamp;
    readonly completedTasks: number;
    readonly totalTasks: number;
  };
}

// ─── ExecutionRetried ───────────────────────────────────────
export interface ExecutionRetried extends DomainEventBase {
  readonly eventType: 'ExecutionRetried';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly taskId: Identifier;
    readonly stepId: Identifier;
    readonly attempt: number;
    readonly maxAttempts: number;
    readonly reason: string;
    readonly retriedAt: Timestamp;
  };
}

// ─── ExecutionStateChange ─────────────────────────────────────
export interface ExecutionStateChange extends DomainEventBase {
  readonly eventType: 'ExecutionStateChange';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly executionId: Identifier;
    readonly previousState: ExecutionStatus;
    readonly newState: ExecutionStatus;
    readonly timestamp: Timestamp;
  };
}

// ─── Union type ───────────────────────────────────────────────
export type PipelineEvent =
  | GoalCreated
  | PlanBuilt
  | TaskStarted
  | TaskFinished
  | ExecutionCompleted
  | ExecutionFailed
  | ExecutionCancelled
  | ExecutionRetried
  | ExecutionStateChange;
