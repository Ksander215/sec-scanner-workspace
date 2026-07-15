/**
 * Pipeline Executor Core — Pipeline Executor
 *
 * The central orchestration component that executes a pipeline
 * defined by PipelineStageDefinition[].
 *
 * Design:
 * - Engine-agnostic: knows only Plugin API, not specific engines.
 * - Uses existing EngineRegistry + ScanOrchestrator for engine execution.
 * - Coordinates Artifact Bus, Event Bus, Retry Manager, Metrics.
 * - Supports start, pause, resume, cancel, graceful shutdown.
 * - Supports failure recovery via state snapshots.
 *
 * CRITICAL CONSTRAINT: This module does NOT modify any TASK-201 code.
 * It imports from scan-platform but only uses public interfaces.
 */

import type { ID, Timestamp } from '../types/index.ts';
import { ScanCapability } from '../types/index.ts';
import { PipelineStatus, PipelineEventType, ArtifactCategory, StageStatus, TERMINAL_STAGE_STATUSES } from './types.ts';
import type {
  PipelineConfig,
  PipelineResult,
  PipelineStageDefinition,
  PipelineStageError,
  PipelineEvent,
  PipelineArtifact,
  PipelineStage,
  StageHandler,
  ArtifactBusReadonly,
  MetricsExporter,
  PipelineContextSnapshot,
} from './types.ts';
import { PipelineState } from './pipeline-state.ts';
import { ArtifactBusImpl, createArtifactBus } from './artifact-bus.ts';
import { PipelineEventBusImpl } from './event-bus.ts';
import { MetricsCollector } from './metrics-collector.ts';
import { RetryManager, classifyError } from './retry-manager.ts';

// ─── Pipeline Executor ────────────────────────────────────

export class PipelineExecutor {
  readonly config: PipelineConfig;
  readonly artifactBus: ArtifactBusImpl;
  readonly eventBus: PipelineEventBusImpl;
  readonly metrics: MetricsExporter;

  private state: PipelineState;
  private retryManager: RetryManager;
  private abortController: AbortController | null = null;
  private stageHandlers = new Map<string, StageHandler>();
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private _running = false;

  constructor(config: PipelineConfig) {
    this.config = config;
    this.state = new PipelineState(
      config.pipelineId,
      config.scanJobId,
      config.targetUrl,
      config.stages,
    );
    this.artifactBus = createArtifactBus() as ArtifactBusImpl;
    this.eventBus = new PipelineEventBusImpl();
    this.metrics = new MetricsCollector();
    this.retryManager = new RetryManager();
  }

  // ─── Lifecycle ───────────────────────────────────────

  /**
   * Register a handler for a stage.
   * If no handler is registered, the stage is skipped.
   */
  registerStageHandler(stageId: string, handler: StageHandler): void {
    this.stageHandlers.set(stageId, handler);
  }

  /**
   * Register multiple handlers at once.
   */
  registerHandlers(handlers: ReadonlyMap<string, StageHandler>): void {
    for (const [id, handler] of handlers) {
      this.stageHandlers.set(id, handler);
    }
  }

  /**
   * Start pipeline execution.
   * Returns a promise that resolves with the final result.
   */
  async start(): Promise<PipelineResult> {
    if (this._running) {
      throw new Error(`Pipeline ${this.config.pipelineId} is already running`);
    }

    this.abortController = new AbortController();
    this._running = true;
    this.state.start();
    this.metrics.startPipeline(this.state.createdAt, this.config.stages.length);
    this.resetIdleTimer();

    this.emitEvent(PipelineEventType.PipelineStarted, {
      targetUrl: this.config.targetUrl,
      stageCount: this.config.stages.length,
    });

    try {
      await this.executeStages();
    } catch (err) {
      // Unhandled error — fail the pipeline
      if (!this.state.isTerminal) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        this.state.fail();
        this.emitEvent(PipelineEventType.PipelineFailed, { error: msg });
      }
    } finally {
      this._running = false;
      this.clearIdleTimer();
      this.metrics.completePipeline(new Date().toISOString());
    }

    return this.buildResult();
  }

  /**
   * Cancel a running pipeline.
   */
  async cancel(reason?: string): Promise<void> {
    if (!this._running) return;

    this.state.startCancelling();

    if (this.abortController) {
      this.abortController.abort();
    }

    // Cancel all running stages
    for (const [id, stage] of this.state.getAllStages()) {
      if (stage.status === 'running' || stage.status === 'retrying') {
        this.state.failStage(id, {
          stageId: id,
          message: reason ?? 'Pipeline cancelled',
          code: 'PIPELINE_CANCELLED',
          retryable: false,
          occurredAt: new Date().toISOString(),
        });
      }
    }

    this.state.cancel();
    this.emitEvent(PipelineEventType.PipelineCancelled, { reason });
    this._running = false;
    this.clearIdleTimer();
  }

  /**
   * Pause a running pipeline (graceful).
   */
  pause(): void {
    if (this.state.status !== PipelineStatus.Running) return;
    this.state.pause();
    this.emitEvent(PipelineEventType.PipelinePaused, {});
    this.clearIdleTimer();
  }

  /**
   * Resume a paused pipeline.
   */
  resume(): void {
    if (this.state.status !== PipelineStatus.Paused) return;
    this.state.resume();
    this.emitEvent(PipelineEventType.PipelineResumed, {});
    this.resetIdleTimer();
  }

  /**
   * Graceful shutdown — cancel if running, clear resources.
   */
  async shutdown(): Promise<void> {
    await this.cancel('Shutdown requested');
    this.eventBus.clear();
  }

  // ─── Query ──────────────────────────────────────────

  get status(): PipelineStatus {
    return this.state.status;
  }

  get pipelineId(): ID {
    return this.config.pipelineId;
  }

  get isRunning(): boolean {
    return this._running;
  }

  getContextSnapshot(): PipelineContextSnapshot {
    return this.state.toContextSnapshot(
      this.artifactBus.count(),
      this.artifactBus.count(ArtifactCategory.Findings),
      this.artifactBus.count(ArtifactCategory.Urls),
    );
  }

  // ─── Persistence (Failure Recovery) ─────────────────

  /**
   * Save pipeline state and artifacts for recovery.
   */
  saveSnapshot(): Record<string, unknown> {
    return {
      state: this.state.toJSON(),
      artifacts: this.artifactBus.toSnapshot(),
      metrics: this.metrics.toJSON(),
      retryManager: {
        retriedStageIds: this.retryManager.getRetriedStageIds(),
      },
    };
  }

  /**
   * Restore pipeline from a previous snapshot.
   * The caller must re-register stage handlers after restore.
   */
  restoreFromSnapshot(snapshot: Record<string, unknown>): void {
    const stateData = snapshot.state as Record<string, unknown>;
    if (stateData) {
      this.state = PipelineState.fromJSON(stateData, this.config.stages);
    }

    const artifacts = snapshot.artifacts as readonly PipelineArtifact[];
    if (artifacts) {
      const restored = ArtifactBusImpl.fromSnapshot(artifacts);
      // Copy artifacts into the existing bus
      for (const art of restored.toSnapshot()) {
        this.artifactBus.publish(art);
      }
    }
  }

  /**
   * Get the list of completed stage IDs (for resume logic).
   */
  getCompletedStageIds(): readonly string[] {
    const completed: string[] = [];
    for (const [id, stage] of this.state.getAllStages()) {
      if (stage.status === 'completed') completed.push(id);
    }
    return completed;
  }

  // ─── Internal: Stage Execution ─────────────────────

  private async executeStages(): Promise<void> {
    // Build dependency graph
    const depGraph = new Map<string, ReadonlySet<string>>();
    for (const def of this.config.stages) {
      depGraph.set(def.id, new Set(def.dependencies));
    }

    // Reset retry manager for fresh stages
    this.retryManager.reset();

    // Track which stages we've already launched (to avoid re-launching)
    const launched = new Set<string>();

    // Main execution loop — state-driven
    while (true) {
      // Check abort
      if (this.abortController?.aborted) break;

      // Check pause
      if (this.state.status === PipelineStatus.Paused) {
        await this.waitForResume();
        if (this.abortController?.aborted) break;
      }

      // Check if all stages are terminal
      const allTerminal = Array.from(this.state.getAllStages().values())
        .every(s => TERMINAL_STAGE_STATUSES.has(s.status));
      if (allTerminal) break;

      // Find stages that are Pending and whose deps are all met
      const ready = this.config.stages.filter(def => {
        if (launched.has(def.id)) return false;
        const stage = this.state.getStage(def.id);
        if (!stage || stage.status !== StageStatus.Pending) return false;
        return Array.from(def.dependencies).every(d => {
          const dep = this.state.getStage(d);
          return dep && (dep.status === StageStatus.Completed || dep.status === StageStatus.Skipped);
        });
      });

      // Count currently running stages for concurrency limit
      const runningCount = Array.from(this.state.getAllStages().values())
        .filter(s => s.status === StageStatus.Running || s.status === StageStatus.Retrying).length;

      const slotsAvailable = this.config.maxConcurrentStages - runningCount;
      const toLaunch = ready.slice(0, Math.max(0, slotsAvailable));

      // Launch stages
      for (const def of toLaunch) {
        launched.add(def.id);
        // Fire-and-forget — state is updated synchronously inside executeStageWithRetry
        this.executeStageWithRetry(def.id, depGraph)
          .catch(() => {}); // Errors are handled inside; catch prevents unhandled rejection
      }

      // Skip stages whose dependencies have failed (they can never run)
      for (const def of this.config.stages) {
        if (launched.has(def.id)) continue;
        const stage = this.state.getStage(def.id);
        if (!stage || stage.status !== StageStatus.Pending) continue;
        const hasFailedDep = Array.from(def.dependencies).some(d => {
          const dep = this.state.getStage(d);
          return dep?.status === 'failed';
        });
        if (hasFailedDep) {
          launched.add(def.id);
          this.state.skipStage(def.id);
          this.metrics.skipStage();
          this.emitEvent(PipelineEventType.StageSkipped, {
            stageId: def.id,
            reason: 'dependency_failed',
          });
        }
      }

      // Check for deadlock: no ready, nothing running, not all terminal
      // Account for launched-but-not-yet-started stages (async hasn't ticked yet)
      const launchedNotTerminal = this.config.stages
        .filter(def => launched.has(def.id))
        .map(def => this.state.getStage(def.id))
        .filter((s): s is PipelineStage => !!s && !TERMINAL_STAGE_STATUSES.has(s.status));

      if (toLaunch.length === 0 && launchedNotTerminal.length === 0) {
        break;
      }

      // Wait for any launched stage to reach a terminal state
      await this.waitForAnyStageChange();
    }

    // Determine final status
    if (!this.state.isTerminal) {
      const hasFailures = Array.from(this.state.getAllStages().values())
        .some(s => s.status === 'failed');
      if (hasFailures) {
        this.state.partiallyComplete();
        this.emitEvent(PipelineEventType.PipelinePartiallyCompleted, {});
      } else {
        this.state.complete();
        this.emitEvent(PipelineEventType.PipelineCompleted, {});
      }
    }
  }

  private async executeStageWithRetry(
    stageId: string,
    depGraph: Map<string, ReadonlySet<string>>,
  ): Promise<void> {
    const def = this.config.stages.find(s => s.id === stageId);
    if (!def) return;

    const handler = this.stageHandlers.get(stageId);

    // Check if stage should run
    const snapshot = this.getContextSnapshot();
    if (def.skippable && (!handler || (def.shouldRun && !def.shouldRun(snapshot)))) {
      this.state.skipStage(stageId);
      this.metrics.skipStage();
      this.emitEvent(PipelineEventType.StageSkipped, { stageId });
      return;
    }

    if (!handler) {
      this.state.skipStage(stageId);
      this.metrics.skipStage();
      this.emitEvent(PipelineEventType.StageSkipped, { stageId, reason: 'no_handler' });
      return;
    }

    // Check dependencies one more time (may have failed)
    const deps = depGraph.get(stageId) ?? new Set();
    const failedDep = Array.from(deps).find(d => {
      const s = this.state.getStage(d);
      return s?.status === 'failed';
    });

    if (failedDep) {
      this.state.skipStage(stageId);
      this.metrics.skipStage();
      this.emitEvent(PipelineEventType.StageSkipped, {
        stageId,
        reason: `dependency_failed:${failedDep}`,
      });
      return;
    }

    // Execute with retries
    while (true) {
      if (this.abortController?.aborted) {
        this.state.failStage(stageId, {
          stageId,
          message: 'Pipeline cancelled',
          code: 'PIPELINE_CANCELLED',
          retryable: false,
          occurredAt: new Date().toISOString(),
        });
        return;
      }

      try {
        await this.runSingleStage(stageId, def, handler);
        return; // Success
      } catch (err) {
        const stageError = this.toStageError(stageId, err);
        const delay = this.retryManager.getRetryDelay(stageId, def, stageError);

        if (delay < 0) {
          // No more retries
          this.state.failStage(stageId, stageError);
          this.metrics.failStage();
          this.emitEvent(PipelineEventType.StageFailed, {
            stageId,
            error: stageError.message,
            code: stageError.code,
            retryable: stageError.retryable,
          });
          return;
        }

        // Retry
        this.retryManager.recordAttempt(stageId);
        this.state.retryStage(stageId);
        this.metrics.retryStage();
        this.emitEvent(PipelineEventType.RetryScheduled, {
          stageId,
          attempt: this.retryManager.getAttemptCount(stageId),
          delayMs: delay,
        });

        await this.delay(delay);
      }
    }
  }

  private async runSingleStage(
    stageId: string,
    def: PipelineStageDefinition,
    handler: StageHandler,
  ): Promise<void> {
    const now = new Date().toISOString();
    this.state.startStage(stageId, def.engineIds ?? []);
    this.metrics.startStage(stageId, now);
    this.emitEvent(PipelineEventType.StageStarted, { stageId });

    // Stage timeout
    const timeoutPromise = def.timeoutMs > 0
      ? new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Stage "${stageId}" timed out after ${def.timeoutMs}ms`)), def.timeoutMs)
        )
      : null;

    const signal = this.abortController?.signal ?? new AbortController().signal;

    // Execute handler
    const handlerPromise = handler({
      artifactBus: this.artifactBus,
      eventBus: this.eventBus,
      abortSignal: signal,
    });

    const result = timeoutPromise
      ? Promise.race([handlerPromise, timeoutPromise])
      : handlerPromise;

    await result;

    // Mark complete
    this.state.completeStage(stageId);
    this.metrics.completeStage(stageId, new Date().toISOString(), def.engineIds ?? []);
    this.emitEvent(PipelineEventType.StageCompleted, { stageId });
  }

  // ─── Internal: Utilities ────────────────────────────

  private toStageError(stageId: string, err: unknown): PipelineStageError {
    const message = err instanceof Error ? err.message : String(err);
    const retryable = message.includes('timeout') || message.includes('ECONNREFUSED');
    return {
      stageId,
      message,
      code: 'STAGE_ERROR',
      retryable,
      occurredAt: new Date().toISOString(),
    };
  }

  private emitEvent(type: PipelineEventType, data?: Record<string, unknown>): void {
    const event: PipelineEvent = {
      type,
      timestamp: new Date().toISOString(),
      pipelineId: this.config.pipelineId,
      data,
    };
    this.eventBus.emit(event);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private waitForResume(): Promise<void> {
    return new Promise(resolve => {
      const check = setInterval(() => {
        if (this.state.status !== PipelineStatus.Paused || this.abortController?.aborted) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
  }

  private waitForAnyStageChange(): Promise<void> {
    return new Promise(resolve => {
      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        clearInterval(check);
        clearTimeout(safetyTimer);
        resolve();
      };
      const check = setInterval(() => {
        const anyTerminal = Array.from(this.state.getAllStages().values())
          .some(s => TERMINAL_STAGE_STATUSES.has(s.status));
        if (anyTerminal || this.abortController?.aborted) done();
      }, 10);
      const safetyTimer = setTimeout(done, 2_000);
    });
  }

  private resetIdleTimer(): void {
    this.clearIdleTimer();
    if (this.config.idleTimeoutMs > 0) {
      this.idleTimer = setTimeout(() => {
        // Idle timeout — no events received. Don't abort, just log.
        this.emitEvent(PipelineEventType.StageStarted, { note: 'idle_timeout_check' });
        this.resetIdleTimer();
      }, this.config.idleTimeoutMs);
    }
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  // ─── Build Result ───────────────────────────────────

  private buildResult(): PipelineResult {
    const now = new Date().toISOString();
    const errors: PipelineStageError[] = [];
    for (const [, stage] of this.state.getAllStages()) {
      if (stage.error) errors.push(stage.error);
    }

    return {
      pipelineId: this.config.pipelineId,
      status: this.state.status,
      stages: this.state.getAllStages(),
      artifacts: this.artifactBus.toSnapshot(),
      findings: this.artifactBus.getByCategory(ArtifactCategory.Findings),
      errors,
      timings: this.getContextSnapshot().stageTimings,
      metrics: this.metrics.getMetrics(),
      createdAt: this.state.createdAt,
      completedAt: this.state.status === PipelineStatus.Cancelled ? now : (this.state.updatedAt),
      durationMs: new Date(now).getTime() - new Date(this.state.createdAt).getTime(),
    };
  }
}

// ─── Built-in Stage Definitions ───────────────────────────

/**
 * Standard stage definitions for the scan pipeline.
 * Based on TASK-202P architecture.
 */
export const BuiltinStages: Record<string, PipelineStageDefinition> = {
  target_validation: {
    id: 'target_validation',
    name: 'Target Validation',
    dependencies: [],
    requiredCapabilities: [],
    maxRetries: 3,
    timeoutMs: 15_000,
    skippable: false,
  },
  discovery: {
    id: 'discovery',
    name: 'Discovery',
    dependencies: ['target_validation'],
    requiredCapabilities: [ScanCapability.PassiveAnalysis],
    maxRetries: 2,
    timeoutMs: 30_000,
    skippable: true,
  },
  authentication: {
    id: 'authentication',
    name: 'Authentication',
    dependencies: ['target_validation'],
    requiredCapabilities: [ScanCapability.AuthenticatedScanning],
    maxRetries: 3,
    timeoutMs: 60_000,
    skippable: true,
    shouldRun: (ctx) => true, // Will be overridden by config
  },
  crawling: {
    id: 'crawling',
    name: 'Crawling',
    dependencies: ['discovery', 'authentication'],
    requiredCapabilities: [ScanCapability.Crawling],
    maxRetries: 1,
    timeoutMs: 600_000,
    skippable: true,
  },
  passive_analysis: {
    id: 'passive_analysis',
    name: 'Passive Analysis',
    dependencies: ['crawling'],
    requiredCapabilities: [ScanCapability.PassiveAnalysis, ScanCapability.HeaderAnalysis],
    maxRetries: 1,
    timeoutMs: 120_000,
    skippable: false,
  },
  active_analysis: {
    id: 'active_analysis',
    name: 'Active Analysis',
    dependencies: ['crawling'],
    requiredCapabilities: [ScanCapability.VulnerabilityDetection],
    maxRetries: 2,
    timeoutMs: 600_000,
    skippable: true,
  },
  vulnerability_detection: {
    id: 'vulnerability_detection',
    name: 'Vulnerability Detection',
    dependencies: ['passive_analysis', 'active_analysis'],
    requiredCapabilities: [ScanCapability.VulnerabilityDetection],
    maxRetries: 2,
    timeoutMs: 1_800_000,
    skippable: true,
  },
  result_normalization: {
    id: 'result_normalization',
    name: 'Result Normalization',
    dependencies: ['vulnerability_detection'],
    requiredCapabilities: [],
    maxRetries: 0,
    timeoutMs: 10_000,
    skippable: false,
  },
};

// ─── Factory ──────────────────────────────────────────────

export function createPipelineExecutor(config: PipelineConfig): PipelineExecutor {
  return new PipelineExecutor(config);
}