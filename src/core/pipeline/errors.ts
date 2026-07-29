/**
 * Execution Pipeline Error Hierarchy
 *
 * Conforms to: AIS-003B.000 Requirement #8 (Error Recovery)
 *
 * Error hierarchy:
 *   ExecutionError (base)
 *   ├── PlanningError          (Planner failed to produce a plan)
 *   ├── TaskExecutionError     (task threw during execution)
 *   ├── TaskTimeoutError       (task exceeded its timeout)
 *   ├── TaskCancelledError     (task was cancelled)
 *   ├── SchedulerError         (scheduler refused to enqueue)
 *   ├── InvalidTransitionError (FSM transition rejected)
 *   └── PipelineAbortedError   (escalation aborted)
 *
 * Every error carries a structured `code` and `retryable` flag
 * so that RecoveryPolicy can make decisions without re-parsing messages.
 */
import type { TaskError } from './types.js';

export class ExecutionError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly cause?: unknown;

  constructor(code: string, message: string, retryable = false, cause?: unknown) {
    super(message);
    this.name = 'ExecutionError';
    this.code = code;
    this.retryable = retryable;
    if (cause !== undefined) {
      this.cause = cause;
    }
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /** Convert to TaskError struct (for serialization in events). */
  toTaskError(): TaskError {
    return {
      code: this.code,
      message: this.message,
      stack: this.stack,
      retryable: this.retryable,
      cause: this.cause,
    };
  }
}

export class PlanningError extends ExecutionError {
  constructor(message: string, cause?: unknown) {
    super('PLANNING_ERROR', message, false, cause);
    this.name = 'PlanningError';
  }
}

export class TaskExecutionError extends ExecutionError {
  readonly taskId: string;
  readonly stepId: string;
  readonly attempt: number;

  constructor(taskId: string, stepId: string, attempt: number, message: string, retryable: boolean, cause?: unknown) {
    super('TASK_EXECUTION_ERROR', message, retryable, cause);
    this.name = 'TaskExecutionError';
    this.taskId = taskId;
    this.stepId = stepId;
    this.attempt = attempt;
  }
}

export class TaskTimeoutError extends ExecutionError {
  readonly taskId: string;
  readonly timeoutMs: number;

  constructor(taskId: string, timeoutMs: number) {
    super('TASK_TIMEOUT', `Task '${taskId}' exceeded ${timeoutMs}ms timeout`, true);
    this.name = 'TaskTimeoutError';
    this.taskId = taskId;
    this.timeoutMs = timeoutMs;
  }
}

export class TaskCancelledError extends ExecutionError {
  readonly taskId: string;

  constructor(taskId: string, reason?: string) {
    super(
      'TASK_CANCELLED',
      `Task '${taskId}' was cancelled${reason ? `: ${reason}` : ''}`,
      false,
    );
    this.name = 'TaskCancelledError';
    this.taskId = taskId;
  }
}

export class SchedulerError extends ExecutionError {
  constructor(message: string) {
    super('SCHEDULER_ERROR', message, false);
    this.name = 'SchedulerError';
  }
}

export class InvalidTransitionError extends ExecutionError {
  readonly fromState: string;
  readonly toState: string;

  constructor(fromState: string, toState: string) {
    super(
      'INVALID_TRANSITION',
      `Invalid state transition: ${fromState} → ${toState}`,
      false,
    );
    this.name = 'InvalidTransitionError';
    this.fromState = fromState;
    this.toState = toState;
  }
}

export class PipelineAbortedError extends ExecutionError {
  readonly failedTaskId?: string;

  constructor(message: string, failedTaskId?: string) {
    super('PIPELINE_ABORTED', message, false);
    this.name = 'PipelineAbortedError';
    this.failedTaskId = failedTaskId;
  }
}

export class EscalationError extends ExecutionError {
  readonly originalError: ExecutionError;

  constructor(originalError: ExecutionError, message: string) {
    super('ESCALATION', message, false, originalError);
    this.name = 'EscalationError';
    this.originalError = originalError;
  }
}

/** Convert any unknown error to a TaskError struct. */
export function toTaskError(error: unknown): TaskError {
  if (error instanceof ExecutionError) {
    return error.toTaskError();
  }
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      stack: error.stack,
      retryable: false,
    };
  }
  return {
    code: 'UNKNOWN_ERROR',
    message: typeof error === 'string' ? error : 'An unknown error occurred',
    retryable: false,
  };
}
