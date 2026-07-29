/**
 * Execution Pipeline — Core Types
 *
 * Defines the fundamental type system for the AIS Execution Pipeline:
 *   Goal → Plan → Task → Execute → Result → Finish
 *
 * Conforms to:
 * - ARC-001.001 §5 (Module Architecture)
 * - DOM-002.000 (Domain Model)
 * - ADR-014 (Execution Model)
 * - CON-001.000 AL-002 (Boundary by Contract)
 *
 * Design principles:
 * - All identifiers are branded for type safety.
 * - All operations are typed and never throw unstructured errors.
 * - All pipeline artifacts are immutable after creation (append-only history).
 * - Variables propagate through ExecutionContext (no globals).
 */

import type { Identifier, Timestamp } from '../types/common.js';
import type { AutonomyLevel } from '../types/common.js';

// ─── Branded Identifiers ─────────────────────────────────────
export type GoalId = Identifier & { readonly __brand: 'GoalId' };
export type PlanId = Identifier & { readonly __brand: 'PlanId' };
export type StepId = Identifier & { readonly __brand: 'StepId' };
export type TaskId = Identifier & { readonly __brand: 'TaskId' };
export type ExecutionId = Identifier & { readonly __brand: 'ExecutionId' };
export type TraceId = Identifier & { readonly __brand: 'TraceId' };

// ─── Goal ─────────────────────────────────────────────────────
/**
 * A Goal is the user-declared intent that the engine must accomplish.
 * Goals are immutable once created; downstream artifacts derive from them.
 */
export interface Goal {
  readonly id: GoalId;
  readonly description: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly createdAt: Timestamp;
  readonly autonomyLevel: AutonomyLevel;
  /** Optional deadline (ISO-8601). Absent = no deadline. */
  readonly deadline?: Timestamp;
  /** Caller-defined tags for traceability. */
  readonly tags?: readonly string[];
}

// ─── Plan & Steps ─────────────────────────────────────────────
/**
 * A Step is a single deterministic action declared by a Planner.
 * Steps reference a named task type and input bindings.
 */
export interface Step {
  readonly id: StepId;
  readonly name: string;
  readonly taskType: string;
  /** Resolved input for this step (may reference upstream outputs via ${step.outputKey}). */
  readonly input: Readonly<Record<string, unknown>>;
  /** Optional human-readable description for audit. */
  readonly description?: string;
  /** Steps that must complete before this step starts. */
  readonly dependsOn?: readonly StepId[];
}

/**
 * A Plan is an ordered, validated set of Steps produced by a Planner.
 * Plans are immutable; revision requires a new Plan with a new id.
 */
export interface Plan {
  readonly id: PlanId;
  readonly goalId: GoalId;
  readonly steps: readonly Step[];
  readonly createdAt: Timestamp;
  /** Planner that produced this plan (for audit). */
  readonly plannerId: string;
  /** Schema version. */
  readonly version: string;
}

// ─── Task & Result ────────────────────────────────────────────
/**
 * Task status enum. Tracks the lifecycle of a single task within the executor.
 */
export enum TaskStatus {
  Pending = 'pending',
  Running = 'running',
  Succeeded = 'succeeded',
  Failed = 'failed',
  Cancelled = 'cancelled',
  Skipped = 'skipped',
}

/**
 * A Task is a runtime-instantiated Step ready for execution.
 * Tasks carry the resolved input (after variable substitution).
 */
export interface Task {
  readonly id: TaskId;
  readonly stepId: StepId;
  readonly planId: PlanId;
  readonly name: string;
  readonly taskType: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly status: TaskStatus;
  readonly attempt: number;
  readonly createdAt: Timestamp;
  readonly startedAt?: Timestamp;
  readonly finishedAt?: Timestamp;
  readonly error?: TaskError;
}

/**
 * Result of a completed task (success or failure).
 * Stored in ExecutionContext.variables under the task's output key.
 */
export interface TaskResult {
  readonly taskId: TaskId;
  readonly status: TaskStatus.Succeeded | TaskStatus.Failed | TaskStatus.Cancelled;
  readonly output?: Readonly<Record<string, unknown>>;
  readonly error?: TaskError;
  readonly durationMs: number;
  readonly attempts: number;
}

/**
 * Structured task error. Carries retry/recovery metadata.
 */
export interface TaskError {
  readonly code: string;
  readonly message: string;
  readonly stack?: string;
  readonly retryable: boolean;
  readonly cause?: unknown;
}

// ─── Execution Status ─────────────────────────────────────────
/**
 * Status of an entire Execution (the FSM state value).
 * Conforms to ADR-014 (Execution Model):
 *   Idle → Planning → Ready → Running → {Completed | Failed | Cancelled}
 */
export enum ExecutionStatus {
  Idle = 'idle',
  Planning = 'planning',
  Ready = 'ready',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

/**
 * Final outcome of an execution.
 */
export interface ExecutionResult {
  readonly executionId: ExecutionId;
  readonly goalId: GoalId;
  readonly status: ExecutionStatus.Completed | ExecutionStatus.Failed | ExecutionStatus.Cancelled;
  readonly startedAt: Timestamp;
  readonly finishedAt: Timestamp;
  readonly durationMs: number;
  readonly outputs: Readonly<Record<string, unknown>>;
  readonly error?: TaskError;
}

// ─── Variables & Memory Handle ────────────────────────────────
/**
 * Variables carry inter-task data. Keys are task output keys.
 * Variables are append-only; existing keys cannot be overwritten.
 */
export type Variables = Readonly<Record<string, unknown>>;

/**
 * Handle to a memory slot (placeholder; actual Memory subsystem is out of scope).
 * Allows the pipeline to reference memory without coupling to its implementation.
 */
export interface MemoryHandle {
  readonly slotId: string;
  readonly scope: 'execution' | 'session' | 'persistent';
}

// ─── Execution Request ────────────────────────────────────────
/**
 * Entry request to the pipeline. Wraps a Goal plus optional configuration.
 */
export interface ExecutionRequest {
  readonly goal: Goal;
  readonly variables?: Variables;
  readonly timeoutMs?: number;
  readonly cancellationToken?: CancellationToken;
}

/**
 * Cancellation token — allows callers to abort an execution.
 * Once cancelled, no new tasks may start.
 */
export interface CancellationToken {
  readonly cancelled: boolean;
  onCancel(callback: () => void): void;
  cancel(reason?: string): void;
  readonly reason?: string;
}
