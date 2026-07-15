/**
 * Pipeline Executor Core — Metrics Collector
 *
 * Collects timing and counter metrics for pipeline execution.
 * Exportable through a generic interface (no monitoring system dependency).
 */

import type { ID, Timestamp } from '../types/index.ts';
import type { PipelineMetrics, StageTiming, MetricsExporter } from './types.ts';
import type { PipelineStageError } from './types.ts';

export class MetricsCollector implements MetricsExporter {
  private readonly stageStartTimes = new Map<string, Timestamp>();
  private readonly engineStartTimes = new Map<string, number>();
  private readonly stageDurations = new Map<string, number>();
  private readonly engineDurations = new Map<string, number>();
  private readonly engineTimings = new Map<string, Map<string, number>>();

  private completedStages = 0;
  private skippedStages = 0;
  private failedStages = 0;
  private retriedStages = 0;
  private totalRetries = 0;
  private totalRequestsCount = 0;
  private totalFindingsCount = 0;
  private totalArtifactsCount = 0;
  private totalEnginesUsed = 0;
  private pipelineStartedAt: Timestamp | null = null;
  private pipelineCompletedAt: Timestamp | null = null;
  private totalStageCount = 0;

  // ─── Pipeline lifecycle ──────────────────────────────

  startPipeline(createdAt: Timestamp, totalStages: number): void {
    this.pipelineStartedAt = createdAt;
    this.totalStageCount = totalStages;
  }

  completePipeline(completedAt: Timestamp): void {
    this.pipelineCompletedAt = completedAt;
  }

  // ─── Stage tracking ──────────────────────────────────

  startStage(stageId: string, now: Timestamp): void {
    this.stageStartTimes.set(stageId, now);
  }

  completeStage(stageId: string, now: Timestamp, engineIds: readonly string[]): void {
    const start = this.stageStartTimes.get(stageId);
    const duration = start ? new Date(now).getTime() - new Date(start).getTime() : 0;
    this.stageDurations.set(stageId, duration);

    // Track engine timings within stage
    const eMap = new Map<string, number>();
    for (const eid of engineIds) {
      const eDur = this.engineDurations.get(eid);
      if (eDur !== undefined) {
        eMap.set(eid, eDur);
        this.engineTimings.set(stageId, eMap);
      }
    }

    this.completedStages++;
  }

  skipStage(): void {
    this.skippedStages++;
  }

  failStage(): void {
    this.failedStages++;
  }

  retryStage(): void {
    this.totalRetries++;
    this.retriedStages = new Set(
      Array.from(this.stageDurations.keys()).filter(id => {
        // Count unique retried stages — simplified: increment each time
        return true;
      })
    ).size;
  }

  // ─── Engine tracking ─────────────────────────────────

  startEngine(engineId: string): void {
    this.engineStartTimes.set(engineId, Date.now());
    this.totalEnginesUsed++;
  }

  finishEngine(engineId: string): void {
    const start = this.engineStartTimes.get(engineId);
    if (start !== undefined) {
      const dur = Date.now() - start;
      this.engineDurations.set(engineId, (this.engineDurations.get(engineId) ?? 0) + dur);
    }
  }

  // ─── Counter tracking ────────────────────────────────

  addRequests(count: number): void {
    this.totalRequestsCount += count;
  }

  addFindings(count: number): void {
    this.totalFindingsCount += count;
  }

  setArtifactsCount(count: number): void {
    this.totalArtifactsCount = count;
  }

  // ─── Export ──────────────────────────────────────────

  getMetrics(): PipelineMetrics {
    let totalDuration: number | null = null;
    if (this.pipelineStartedAt && this.pipelineCompletedAt) {
      totalDuration = new Date(this.pipelineCompletedAt).getTime() - new Date(this.pipelineStartedAt).getTime();
    }

    let memoryUsage: number | null = null;
    if (typeof process !== 'undefined' && process.memoryUsage) {
      try {
        memoryUsage = Math.round(process.memoryUsage().heapUsed / (1024 * 1024) * 100) / 100;
      } catch {
        // memoryUsage unavailable
      }
    }

    return {
      totalStages: this.totalStageCount,
      completedStages: this.completedStages,
      skippedStages: this.skippedStages,
      failedStages: this.failedStages,
      retriedStages: this.retriedStages,
      totalRetries: this.totalRetries,
      totalEnginesUsed: this.totalEnginesUsed,
      totalRequestsCount: this.totalRequestsCount,
      totalFindingsCount: this.totalFindingsCount,
      totalArtifactsCount: this.totalArtifactsCount,
      totalDurationMs: totalDuration,
      stageDurations: new Map(this.stageDurations),
      engineDurations: new Map(this.engineDurations),
      memoryUsageMb: memoryUsage,
    };
  }

  getStageTiming(stageId: string): StageTiming | undefined {
    const start = this.stageStartTimes.get(stageId);
    const dur = this.stageDurations.get(stageId);
    if (!start || dur === undefined) return undefined;

    const completedAt = new Date(new Date(start).getTime() + dur).toISOString();

    return {
      stageId,
      startedAt: start,
      completedAt,
      durationMs: dur,
      engineTimings: this.engineTimings.get(stageId) ?? new Map(),
    };
  }

  toJSON(): Record<string, unknown> {
    const metrics = this.getMetrics();
    return {
      totalStages: metrics.totalStages,
      completedStages: metrics.completedStages,
      skippedStages: metrics.skippedStages,
      failedStages: metrics.failedStages,
      totalRetries: metrics.totalRetries,
      totalEnginesUsed: metrics.totalEnginesUsed,
      totalRequestsCount: metrics.totalRequestsCount,
      totalFindingsCount: metrics.totalFindingsCount,
      totalArtifactsCount: metrics.totalArtifactsCount,
      totalDurationMs: metrics.totalDurationMs,
      memoryUsageMb: metrics.memoryUsageMb,
      stageDurations: Object.fromEntries(metrics.stageDurations),
      engineDurations: Object.fromEntries(metrics.engineDurations),
    };
  }
}

/** Factory function. */
export function createMetricsCollector(): MetricsCollector {
  return new MetricsCollector();
}