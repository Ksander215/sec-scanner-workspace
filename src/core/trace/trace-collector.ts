/**
 * Execution Trace Collector — Records execution lifecycle for audit.
 *
 * Conforms to:
 * - AL-012 (every state change with side effects is logged)
 * - ADR-013 (Observability and Tracing)
 *
 * Each trace entry records a timestamped event for post-execution analysis.
 * Traces are collected in-memory and can be serialized to ExecutionReport.
 */
import type { Timestamp } from '../types/common.js';
import type { ExecutionStatus, TaskStatus } from '../pipeline/types.js';

export enum TraceEntryType {
  StateChange = 'state-change',
  TaskDispatch = 'task-dispatch',
  TaskComplete = 'task-complete',
  Error = 'error',
  Retry = 'retry',
  Info = 'info',
}

export interface TraceEntry {
  readonly type: TraceEntryType;
  readonly timestamp: Timestamp;
  readonly message: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

export class TraceCollector {
  private readonly entries: TraceEntry[] = [];

  /** Add a trace entry. */
  add(type: TraceEntryType, message: string, data?: Readonly<Record<string, unknown>>): void {
    this.entries.push({
      type,
      timestamp: new Date().toISOString(),
      message,
      data,
    });
  }

  /** Record a state transition. */
  traceStateChange(executionId: string, from: ExecutionStatus, to: ExecutionStatus): void {
    this.add(TraceEntryType.StateChange, `Execution ${executionId}: ${from} → ${to}`, {
      executionId,
      fromState: from,
      toState: to,
    });
  }

  /** Record a task dispatch. */
  traceTaskDispatch(taskId: string, stepId: string, taskType: string, attempt: number): void {
    this.add(TraceEntryType.TaskDispatch, `Task ${taskId} dispatched (${taskType}, attempt ${attempt})`, {
      taskId,
      stepId,
      taskType,
      attempt,
    });
  }

  /** Record a task completion. */
  traceTaskComplete(taskId: string, status: TaskStatus, durationMs: number, attempts: number): void {
    this.add(TraceEntryType.TaskComplete, `Task ${taskId} ${status} in ${durationMs}ms (${attempts} attempts)`, {
      taskId,
      status,
      durationMs,
      attempts,
    });
  }

  /** Record an error. */
  traceError(code: string, message: string, data?: Readonly<Record<string, unknown>>): void {
    this.add(TraceEntryType.Error, `[${code}] ${message}`, data);
  }

  /** Record a retry. */
  traceRetry(taskId: string, attempt: number, reason: string): void {
    this.add(TraceEntryType.Retry, `Task ${taskId} retry attempt ${attempt}: ${reason}`, {
      taskId,
      attempt,
    });
  }

  /** Record generic info. */
  traceInfo(message: string, data?: Readonly<Record<string, unknown>>): void {
    this.add(TraceEntryType.Info, message, data);
  }

  /** Get all trace entries (oldest first). */
  getEntries(): readonly TraceEntry[] {
    return this.entries;
  }

  /** Get number of entries. */
  get length(): number {
    return this.entries.length;
  }

  /** Clear all entries. */
  clear(): void {
    this.entries.length = 0;
  }
}
