/**
 * Pipeline Executor Core — Pipeline State
 *
 * Manages pipeline and stage lifecycle states.
 * Provides immutable snapshots for persistence and querying.
 */

import type { ID, Timestamp } from '../types/index.ts';
import {
  PipelineStatus,
  StageStatus,
  TERMINAL_PIPELINE_STATUSES,
  TERMINAL_STAGE_STATUSES,
} from './types.ts';
import type {
  PipelineStageDefinition,
  PipelineStage,
  PipelineStageError,
  StageTiming,
  PipelineContextSnapshot,
  PipelineArtifact,
} from './types.ts';

// ─── Pipeline State ───────────────────────────────────────

export class PipelineState {
  readonly pipelineId: ID;
  readonly scanJobId: string;
  readonly targetUrl: string;
  readonly createdAt: Timestamp;

  private _status: PipelineStatus = PipelineStatus.Created;
  private _updatedAt: Timestamp;
  private readonly stageMap = new Map<string, PipelineStage>();
  private readonly stageOrder: string[];

  constructor(
    pipelineId: ID,
    scanJobId: string,
    targetUrl: string,
    stageDefinitions: readonly PipelineStageDefinition[],
  ) {
    this.pipelineId = pipelineId;
    this.scanJobId = scanJobId;
    this.targetUrl = targetUrl;
    this.createdAt = new Date().toISOString();
    this._updatedAt = this.createdAt;
    this.stageOrder = stageDefinitions.map(s => s.id);

    // Initialize all stages as Pending
    for (const def of stageDefinitions) {
      this.stageMap.set(def.id, {
        definition: def,
        status: StageStatus.Pending,
        startedAt: null,
        completedAt: null,
        durationMs: null,
        error: null,
        retryCount: 0,
        engineIds: [],
      });
    }
  }

  // ─── Getters ────────────────────────────────────────

  get status(): PipelineStatus { return this._status; }
  get updatedAt(): Timestamp { return this._updatedAt; }
  get isTerminal(): boolean { return TERMINAL_PIPELINE_STATUSES.has(this._status); }

  getStage(stageId: string): PipelineStage | undefined {
    return this.stageMap.get(stageId);
  }

  getAllStages(): ReadonlyMap<string, PipelineStage> {
    return this.stageMap;
  }

  getStageOrder(): readonly string[] {
    return this.stageOrder;
  }

  // ─── Pipeline Transitions ───────────────────────────

  private transition(target: PipelineStatus): void {
    if (this.isTerminal) {
      throw new Error(`Pipeline ${this.pipelineId} is in terminal state "${this._status}", cannot transition to "${target}"`);
    }
    this._status = target;
    this._updatedAt = new Date().toISOString();
  }

  start(): void {
    this.transition(PipelineStatus.Running);
  }

  pause(): void {
    if (this._status !== PipelineStatus.Running) {
      throw new Error(`Cannot pause pipeline in state "${this._status}"`);
    }
    this.transition(PipelineStatus.Paused);
  }

  resume(): void {
    if (this._status !== PipelineStatus.Paused) {
      throw new Error(`Cannot resume pipeline in state "${this._status}"`);
    }
    this.transition(PipelineStatus.Running);
  }

  complete(): void {
    this.transition(PipelineStatus.Completed);
  }

  fail(): void {
    this.transition(PipelineStatus.Failed);
  }

  partiallyComplete(): void {
    this.transition(PipelineStatus.PartiallyCompleted);
  }

  startCancelling(): void {
    if (this._status === PipelineStatus.Running || this._status === PipelineStatus.Paused) {
      this._status = PipelineStatus.Cancelling;
      this._updatedAt = new Date().toISOString();
    }
  }

  cancel(): void {
    this._status = PipelineStatus.Cancelled;
    this._updatedAt = new Date().toISOString();
  }

  // ─── Stage Transitions ──────────────────────────────

  startStage(stageId: string, engineIds: readonly string[]): void {
    const stage = this.stageMap.get(stageId);
    if (!stage) throw new Error(`Stage "${stageId}" not found`);
    if (TERMINAL_STAGE_STATUSES.has(stage.status)) {
      throw new Error(`Stage "${stageId}" is in terminal state "${stage.status}"`);
    }
    this.stageMap.set(stageId, {
      ...stage,
      status: StageStatus.Running,
      startedAt: stage.startedAt ?? new Date().toISOString(),
      engineIds: [...engineIds],
    });
    this._updatedAt = new Date().toISOString();
  }

  retryStage(stageId: string): void {
    const stage = this.stageMap.get(stageId);
    if (!stage) throw new Error(`Stage "${stageId}" not found`);
    this.stageMap.set(stageId, {
      ...stage,
      status: StageStatus.Retrying,
      retryCount: stage.retryCount + 1,
    });
    this._updatedAt = new Date().toISOString();
  }

  completeStage(stageId: string): void {
    const stage = this.stageMap.get(stageId);
    if (!stage) throw new Error(`Stage "${stageId}" not found`);
    const now = new Date().toISOString();
    const durationMs = stage.startedAt
      ? new Date(now).getTime() - new Date(stage.startedAt).getTime()
      : 0;
    this.stageMap.set(stageId, {
      ...stage,
      status: StageStatus.Completed,
      completedAt: now,
      durationMs,
    });
    this._updatedAt = new Date().toISOString();
  }

  skipStage(stageId: string): void {
    const stage = this.stageMap.get(stageId);
    if (!stage) throw new Error(`Stage "${stageId}" not found`);
    this.stageMap.set(stageId, {
      ...stage,
      status: StageStatus.Skipped,
      completedAt: new Date().toISOString(),
    });
    this._updatedAt = new Date().toISOString();
  }

  failStage(stageId: string, error: PipelineStageError): void {
    const stage = this.stageMap.get(stageId);
    if (!stage) throw new Error(`Stage "${stageId}" not found`);
    const now = new Date().toISOString();
    const durationMs = stage.startedAt
      ? new Date(now).getTime() - new Date(stage.startedAt).getTime()
      : 0;
    this.stageMap.set(stageId, {
      ...stage,
      status: StageStatus.Failed,
      completedAt: now,
      durationMs,
      error,
    });
    this._updatedAt = new Date().toISOString();
  }

  // ─── Snapshot ───────────────────────────────────────

  toContextSnapshot(artifactCount: number, findingCount: number, urlCount: number): PipelineContextSnapshot {
    const completed = new Set<string>();
    const failed = new Map<string, PipelineStageError>();
    const skipped = new Set<string>();
    const timings = new Map<string, StageTiming>();
    const currentStages: string[] = [];

    for (const [id, stage] of this.stageMap) {
      if (stage.status === StageStatus.Completed) completed.add(id);
      if (stage.status === StageStatus.Failed && stage.error) failed.set(id, stage.error);
      if (stage.status === StageStatus.Skipped) skipped.add(id);
      if (stage.status === StageStatus.Running || stage.status === StageStatus.Retrying) currentStages.push(id);
      if (stage.startedAt && stage.completedAt && stage.durationMs !== null) {
        timings.set(id, {
          stageId: id,
          startedAt: stage.startedAt,
          completedAt: stage.completedAt,
          durationMs: stage.durationMs,
          engineTimings: new Map(),
        });
      }
    }

    return {
      pipelineId: this.pipelineId,
      scanJobId: this.scanJobId,
      targetUrl: this.targetUrl,
      status: this._status,
      currentStages,
      completedStages: completed,
      failedStages: failed,
      skippedStages: skipped,
      stageTimings: timings,
      artifactCount,
      findingCount,
      urlCount,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }

  /** Serialize for persistence. */
  toJSON(): Record<string, unknown> {
    const stages: Record<string, unknown> = {};
    for (const [id, stage] of this.stageMap) {
      stages[id] = {
        status: stage.status,
        startedAt: stage.startedAt,
        completedAt: stage.completedAt,
        durationMs: stage.durationMs,
        retryCount: stage.retryCount,
        engineIds: stage.engineIds,
        error: stage.error,
      };
    }
    return {
      pipelineId: this.pipelineId,
      scanJobId: this.scanJobId,
      targetUrl: this.targetUrl,
      status: this._status,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
      stages,
      stageOrder: this.stageOrder,
    };
  }

  /** Restore from persisted state. */
  static fromJSON(data: Record<string, unknown>, stageDefinitions: readonly PipelineStageDefinition[]): PipelineState {
    const state = new PipelineState(
      data.pipelineId as string,
      data.scanJobId as string,
      data.targetUrl as string,
      stageDefinitions,
    );
    state._status = data.status as PipelineStatus;
    state._updatedAt = data.updatedAt as Timestamp;

    const stages = data.stages as Record<string, any>;
    if (stages) {
      for (const [id, s] of Object.entries(stages)) {
        const existing = state.stageMap.get(id);
        if (existing) {
          state.stageMap.set(id, {
            ...existing,
            status: s.status as StageStatus,
            startedAt: s.startedAt,
            completedAt: s.completedAt,
            durationMs: s.durationMs,
            retryCount: s.retryCount ?? 0,
            engineIds: s.engineIds ?? [],
            error: s.error,
          });
        }
      }
    }

    return state;
  }
}