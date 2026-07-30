/**
 * Tool Runtime Metrics — Collects and aggregates execution metrics.
 *
 * Conforms to: AIS-003C.000 Requirement #11 (Runtime Metrics)
 *
 * Collected metrics:
 *   - Execution Time
 *   - Retries
 *   - Failures
 *   - Timeouts
 *   - Success
 */
import type { ToolExecutionMetrics, RuntimeMetricsSummary } from './types.js';
import { ToolLifecycleState } from './types.js';

export class ToolMetricsCollector {
  private readonly metrics: ToolExecutionMetrics[] = [];
  private readonly toolStats = new Map<string, ToolToolStats>();

  /**
   * Record a tool execution metric.
   */
  record(metric: ToolExecutionMetrics): void {
    this.metrics.push(metric);

    // Update per-tool stats
    let stats = this.toolStats.get(metric.toolName);
    if (!stats) {
      stats = {
        toolName: metric.toolName,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        timedOutExecutions: 0,
        cancelledExecutions: 0,
        totalDurationMs: 0,
      };
      this.toolStats.set(metric.toolName, stats);
    }
    stats.totalExecutions++;
    stats.totalDurationMs += metric.durationMs ?? 0;

    switch (metric.status) {
      case ToolLifecycleState.Completed:
        stats.successfulExecutions++;
        break;
      case ToolLifecycleState.Failed:
        stats.failedExecutions++;
        if (metric.timedOut) stats.timedOutExecutions++;
        break;
      default:
        break;
    }
  }

  /**
   * Get aggregated summary across all tools.
   */
  getSummary(): RuntimeMetricsSummary {
    let totalExecutions = 0;
    let successfulExecutions = 0;
    let failedExecutions = 0;
    let timedOutExecutions = 0;
    let totalDurationMs = 0;

    for (const stats of this.toolStats.values()) {
      totalExecutions += stats.totalExecutions;
      successfulExecutions += stats.successfulExecutions;
      failedExecutions += stats.failedExecutions;
      timedOutExecutions += stats.timedOutExecutions;
      totalDurationMs += stats.totalDurationMs;
    }

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      timedOutExecutions,
      cancelledExecutions: 0, // tracked at tool level if needed
      totalDurationMs,
      averageDurationMs: totalExecutions > 0 ? Math.round(totalDurationMs / totalExecutions) : 0,
      registeredToolCount: this.toolStats.size,
      activeToolCount: this.toolStats.size,
    };
  }

  /**
   * Get stats for a specific tool.
   */
  getToolStats(toolName: string): ToolToolStats | undefined {
    return this.toolStats.get(toolName);
  }

  /**
   * Get all recorded metrics.
   */
  getAllMetrics(): readonly ToolExecutionMetrics[] {
    return this.metrics;
  }

  /**
   * Get the count of recorded metrics.
   */
  get count(): number {
    return this.metrics.length;
  }

  /** Clear all metrics. */
  clear(): void {
    this.metrics.length = 0;
    this.toolStats.clear();
  }
}

/**
 * Per-tool statistics.
 */
export interface ToolToolStats {
  toolName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  timedOutExecutions: number;
  cancelledExecutions: number;
  totalDurationMs: number;
}
