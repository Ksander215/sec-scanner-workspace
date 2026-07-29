/**
 * Workflow Runtime — Metrics Collector
 * TASK-AIS-003H.000
 *
 * Collects and aggregates workflow runtime metrics:
 *   - Execution time, stage time
 *   - Retry count, failures
 *   - Success rate, recovery count
 *   - Event publish tracking
 */

import type { WorkflowMetrics } from './types.js';

export class WorkflowMetricsCollector {
  private totalWorkflows = 0;
  private runningWorkflows = 0;
  private completedWorkflows = 0;
  private failedWorkflows = 0;
  private pausedWorkflows = 0;
  private cancelledWorkflows = 0;
  private totalStages = 0;
  private completedStages = 0;
  private failedStages = 0;
  private totalExecutionTimeMs = 0;
  private _totalRetryCount = 0;
  private _totalRecoveryCount = 0;
  private _totalCheckpointCount = 0;
  private _eventsPublished = 0;

  incrementTotalWorkflows(): void {
    this.totalWorkflows++;
  }

  incrementRunning(): void {
    this.runningWorkflows++;
  }

  decrementRunning(): void {
    if (this.runningWorkflows > 0) this.runningWorkflows--;
  }

  incrementCompleted(): void {
    this.completedWorkflows++;
  }

  incrementFailed(): void {
    this.failedWorkflows++;
  }

  incrementPaused(): void {
    this.pausedWorkflows++;
  }

  decrementPaused(): void {
    if (this.pausedWorkflows > 0) this.pausedWorkflows--;
  }

  incrementCancelled(): void {
    this.cancelledWorkflows++;
  }

  incrementTotalStages(): void {
    this.totalStages++;
  }

  incrementCompletedStages(): void {
    this.completedStages++;
  }

  incrementFailedStages(): void {
    this.failedStages++;
  }

  recordExecutionTime(ms: number): void {
    this.totalExecutionTimeMs += ms;
  }

  incrementRetryCount(): void {
    this._totalRetryCount++;
  }

  incrementRecoveryCount(): void {
    this._totalRecoveryCount++;
  }

  incrementCheckpointCount(): void {
    this._totalCheckpointCount++;
  }

  incrementEventsPublished(): void {
    this._eventsPublished++;
  }

  getMetrics(): WorkflowMetrics {
    const totalFinished = this.completedWorkflows + this.failedWorkflows + this.cancelledWorkflows;
    const successRate = totalFinished > 0
      ? Math.round((this.completedWorkflows / totalFinished) * 100)
      : 0;

    const avgTime = this.completedWorkflows > 0
      ? Math.round(this.totalExecutionTimeMs / this.completedWorkflows)
      : 0;

    return Object.freeze({
      totalWorkflows: this.totalWorkflows,
      runningWorkflows: this.runningWorkflows,
      completedWorkflows: this.completedWorkflows,
      failedWorkflows: this.failedWorkflows,
      pausedWorkflows: this.pausedWorkflows,
      cancelledWorkflows: this.cancelledWorkflows,
      totalStages: this.totalStages,
      completedStages: this.completedStages,
      failedStages: this.failedStages,
      totalExecutionTimeMs: this.totalExecutionTimeMs,
      averageExecutionTimeMs: avgTime,
      totalRetryCount: this._totalRetryCount,
      totalRecoveryCount: this._totalRecoveryCount,
      totalCheckpointCount: this._totalCheckpointCount,
      successRate,
      eventsPublished: this._eventsPublished,
    });
  }

  reset(): void {
    this.totalWorkflows = 0;
    this.runningWorkflows = 0;
    this.completedWorkflows = 0;
    this.failedWorkflows = 0;
    this.pausedWorkflows = 0;
    this.cancelledWorkflows = 0;
    this.totalStages = 0;
    this.completedStages = 0;
    this.failedStages = 0;
    this.totalExecutionTimeMs = 0;
    this._totalRetryCount = 0;
    this._totalRecoveryCount = 0;
    this._totalCheckpointCount = 0;
    this._eventsPublished = 0;
  }
}
