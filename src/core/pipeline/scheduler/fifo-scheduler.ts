/**
 * Task Scheduler — Controls when and how tasks are dispatched.
 *
 * Conforms to: AIS-003B.000 Requirement #4 (Task Scheduler)
 *   - FIFO: First-in-first-out, no parallelism.
 *   - Architecturally extensible for future parallel/concurrent implementations.
 *
 * The Scheduler wraps a dispatch function and adds queueing semantics.
 * For the initial FIFO implementation, tasks are dispatched immediately
 * (the queue is implicit — the executor iterates sequentially).
 */
import type { Task, TaskResult, CancellationToken } from '../types.js';
import { TaskStatus } from '../types.js';

export interface SchedulerOptions {
  readonly cancellationToken?: CancellationToken;
}

export interface ScheduledTask {
  readonly task: Task;
  readonly dispatch: () => Promise<TaskResult>;
}

/**
 * Abstract scheduler interface. Implementations control task dispatch order,
 * parallelism, and priority.
 */
export interface Scheduler {
  readonly schedulerType: string;
  /** Submit a task for scheduling. Returns a promise that resolves when the task completes. */
  schedule(scheduled: ScheduledTask): Promise<TaskResult>;
  /** Cancel all pending tasks. Already-running tasks are NOT interrupted. */
  cancelAll(): void;
  /** Number of tasks currently in the queue (not yet started). */
  readonly pendingCount: number;
}

/**
 * FIFO Scheduler — Sequential execution, no parallelism.
 *
 * Tasks are dispatched immediately (no queueing delay).
 * This is architecturally extensible: future implementations can add
 * priority queues, parallel workers, etc.
 *
 * Design note: In the current sequential execution model, the PlanExecutor
 * calls schedule() one at a time, so the FIFO scheduler is effectively
 * a pass-through. The interface is designed to support future parallel dispatch.
 */
export class FIFOScheduler implements Scheduler {
  readonly schedulerType = 'fifo';
  private readonly token?: CancellationToken;
  private _pendingCount = 0;

  constructor(opts?: SchedulerOptions) {
    this.token = opts?.cancellationToken;
  }

  get pendingCount(): number { return this._pendingCount; }

  async schedule(scheduled: ScheduledTask): Promise<TaskResult> {
    // Check cancellation before dispatch
    if (this.token?.cancelled) {
      return {
        taskId: scheduled.task.id,
        status: TaskStatus.Cancelled,
        error: {
          code: 'TASK_CANCELLED',
          message: 'Task cancelled before dispatch',
          retryable: false,
        },
        durationMs: 0,
        attempts: scheduled.task.attempt,
      };
    }

    this._pendingCount++;
    try {
      const result = await scheduled.dispatch();
      return result;
    } catch (error) {
      return {
        taskId: scheduled.task.id,
        status: TaskStatus.Failed,
        error: {
          code: 'SCHEDULER_DISPATCH_ERROR',
          message: error instanceof Error ? error.message : String(error),
          retryable: true,
        },
        durationMs: 0,
        attempts: scheduled.task.attempt,
      };
    } finally {
      this._pendingCount--;
    }
  }

  cancelAll(): void {
    // FIFO has no queued tasks to cancel; only the token matters
  }
}
