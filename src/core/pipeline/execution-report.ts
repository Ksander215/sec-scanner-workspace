/**
 * Execution Report — Post-execution summary for audit and observability.
 *
 * Conforms to: AIS-003B.000 Requirement #11 (Execution Report)
 *   - duration
 *   - steps
 *   - events
 *   - errors
 *   - status
 *   - metrics
 *
 * The report is built from trace entries, event bus log, and task results.
 * It is immutable after creation.
 */
import type { Timestamp } from '../types/common.js';
import type { ExecutionStatus, TaskStatus, Variables } from './types.js';
import type { TraceEntry } from '../trace/trace-collector.js';
import type { TaskError } from './types.js';

export interface ExecutionMetrics {
  /** Total wall-clock time from goal received to execution finished (ms). */
  readonly totalDurationMs: number;
  /** Number of steps in the plan. */
  readonly totalSteps: number;
  /** Number of tasks that succeeded. */
  readonly succeededCount: number;
  /** Number of tasks that failed. */
  readonly failedCount: number;
  /** Number of tasks that were skipped (due to abort/cancel). */
  readonly skippedCount: number;
  /** Number of tasks that were cancelled. */
  readonly cancelledCount: number;
  /** Total retry attempts across all tasks. */
  readonly totalRetries: number;
  /** Sum of all task durations (ms). May differ from totalDurationMs due to planning overhead. */
  readonly totalTaskDurationMs: number;
}

export interface StepReport {
  readonly stepName: string;
  readonly taskType: string;
  readonly status: TaskStatus;
  readonly attempts: number;
  readonly durationMs: number;
  readonly error?: TaskError;
}

export interface ExecutionReport {
  readonly executionId: string;
  readonly goalId: string;
  readonly planId: string;
  readonly status: ExecutionStatus;
  readonly startedAt: Timestamp;
  readonly finishedAt: Timestamp;
  readonly durationMs: number;
  readonly metrics: ExecutionMetrics;
  readonly steps: readonly StepReport[];
  readonly errors: readonly TaskError[];
  readonly traceEntries: readonly TraceEntry[];
  readonly variables: Variables;
  /** Number of events published during execution. */
  readonly eventsPublished: number;
}

/** Builder for ExecutionReport — assembles data from pipeline components. */
export class ExecutionReportBuilder {
  private executionId = '';
  private goalId = '';
  private planId = '';
  private status: ExecutionStatus = 'idle' as ExecutionStatus;
  private startedAt: Timestamp = '';
  private finishedAt: Timestamp = '';
  private stepReports: StepReport[] = [];
  private errors: TaskError[] = [];
  private traceEntries: TraceEntry[] = [];
  private variables: Variables = {};
  private eventsPublished = 0;

  setExecution(id: string, goalId: string, planId: string): this {
    this.executionId = id;
    this.goalId = goalId;
    this.planId = planId;
    return this;
  }

  setStatus(status: ExecutionStatus): this {
    this.status = status;
    return this;
  }

  setTiming(startedAt: Timestamp, finishedAt: Timestamp): this {
    this.startedAt = startedAt;
    this.finishedAt = finishedAt;
    return this;
  }

  addStep(step: StepReport): this {
    this.stepReports.push(step);
    return this;
  }

  addError(error: TaskError): this {
    this.errors.push(error);
    return this;
  }

  addTraceEntries(entries: readonly TraceEntry[]): this {
    this.traceEntries = [...this.traceEntries, ...entries];
    return this;
  }

  setVariables(variables: Variables): this {
    this.variables = variables;
    return this;
  }

  setEventsPublished(count: number): this {
    this.eventsPublished = count;
    return this;
  }

  build(): ExecutionReport {
    const durationMs = this.startedAt && this.finishedAt
      ? new Date(this.finishedAt).getTime() - new Date(this.startedAt).getTime()
      : 0;

    const succeededCount = this.stepReports.filter(s => s.status === 'succeeded').length;
    const failedCount = this.stepReports.filter(s => s.status === 'failed').length;
    const skippedCount = this.stepReports.filter(s => s.status === 'skipped').length;
    const cancelledCount = this.stepReports.filter(s => s.status === 'cancelled').length;
    const totalRetries = this.stepReports.reduce((sum, s) => sum + Math.max(0, s.attempts - 1), 0);
    const totalTaskDurationMs = this.stepReports.reduce((sum, s) => sum + s.durationMs, 0);

    return {
      executionId: this.executionId,
      goalId: this.goalId,
      planId: this.planId,
      status: this.status,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      durationMs,
      metrics: {
        totalDurationMs: durationMs,
        totalSteps: this.stepReports.length,
        succeededCount,
        failedCount,
        skippedCount,
        cancelledCount,
        totalRetries,
        totalTaskDurationMs,
      },
      steps: this.stepReports,
      errors: this.errors,
      traceEntries: this.traceEntries,
      variables: this.variables,
      eventsPublished: this.eventsPublished,
    };
  }
}
