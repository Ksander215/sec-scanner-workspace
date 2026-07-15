/**
 * Pipeline Executor Core — Failure Recovery
 *
 * Manages pipeline state snapshots for persistence and resume.
 * Supports:
 *   - Serializing full pipeline state + artifacts to JSON
 *   - Restoring a pipeline from a snapshot (resume after crash)
 *   - Detecting which stages can be skipped on resume
 *   - Filesystem-based persistence (optional, directory-based)
 *   - In-memory snapshot store (for testing / fast recovery)
 *
 * Design principles:
 *   - Snapshots are append-only — never overwrite.
 *   - Each snapshot is self-contained (state + artifacts + metrics).
 *   - Resume logic skips completed/skipped stages.
 *   - Future: snapshots could be sent to a distributed store (Redis, S3).
 */

import type { ID, Timestamp } from '../types/index.ts';
import type {
  PipelineConfig,
  PipelineStageDefinition,
  PipelineArtifact,
  PipelineMetrics,
} from './types.ts';
import { PipelineState } from './pipeline-state.ts';
import { ArtifactBusImpl } from './artifact-bus.ts';

// ─── Snapshot Model ────────────────────────────────────────

/**
 * A complete, serializable snapshot of a pipeline execution.
 * Can be persisted to disk, database, or remote storage.
 */
export interface PipelineSnapshot {
  /** Unique snapshot ID. */
  readonly snapshotId: ID;
  /** The pipeline ID this snapshot belongs to. */
  readonly pipelineId: ID;
  /** When the snapshot was taken. */
  readonly createdAt: Timestamp;
  /** Reason for the snapshot (e.g. "auto_checkpoint", "manual", "pre_crash"). */
  readonly reason: string;
  /** Serialized pipeline state. */
  readonly state: Record<string, unknown>;
  /** All artifacts accumulated so far. */
  readonly artifacts: readonly PipelineArtifact[];
  /** Metrics at the time of snapshot. */
  readonly metrics: Record<string, unknown>;
  /** Stage IDs that were retried. */
  readonly retriedStageIds: readonly string[];
  /** Sequence number (monotonically increasing). */
  readonly sequence: number;
}

// ─── Recovery Plan ─────────────────────────────────────────

/**
 * Result of analyzing a snapshot for recovery.
 * Tells the executor which stages to skip on resume.
 */
export interface RecoveryPlan {
  /** Stages that completed successfully — can be skipped. */
  readonly completedStageIds: readonly string[];
  /** Stages that were skipped — can be skipped again. */
  readonly skippedStageIds: readonly string[];
  /** Stages that failed — should be retried if retry budget allows. */
  readonly failedStageIds: readonly string[];
  /** Stages that were never started — should run from scratch. */
  readonly pendingStageIds: readonly string[];
  /** The snapshot to restore from. */
  readonly snapshot: PipelineSnapshot;
}

// ─── Failure Recovery Manager ──────────────────────────────

/**
 * Manages lifecycle of pipeline snapshots.
 *
 * Responsibilities:
 *   1. Create snapshots from a running PipelineExecutor.
 *   2. Analyze snapshots to build recovery plans.
 *   3. Manage in-memory and optional filesystem storage.
 *   4. Provide clean-up and pruning.
 */
export class FailureRecoveryManager {
  private readonly snapshots = new Map<ID, PipelineSnapshot>();
  private sequenceCounter = 0;
  private persistenceDir: string | null;

  constructor(options?: { persistenceDir?: string }) {
    this.persistenceDir = options?.persistenceDir ?? null;
  }

  // ─── Snapshot Creation ───────────────────────────────

  /**
   * Create a snapshot from the current pipeline state.
   *
   * @param pipelineId  The pipeline ID.
   * @param state       The PipelineState instance.
   * @param artifactBus The ArtifactBus instance.
   * @param metrics     The metrics export.
   * @param retriedStageIds  Stage IDs that were retried.
   * @param reason      Why this snapshot is being taken.
   */
  createSnapshot(
    pipelineId: ID,
    state: PipelineState,
    artifactBus: ArtifactBusImpl,
    metrics: Record<string, unknown>,
    retriedStageIds: readonly string[],
    reason: string,
  ): PipelineSnapshot {
    const snapshot: PipelineSnapshot = {
      snapshotId: `snap-${pipelineId}-${++this.sequenceCounter}`,
      pipelineId,
      createdAt: new Date().toISOString(),
      reason,
      state: state.toJSON(),
      artifacts: artifactBus.toSnapshot(),
      metrics,
      retriedStageIds: [...retriedStageIds],
      sequence: this.sequenceCounter,
    };

    this.snapshots.set(snapshot.snapshotId, snapshot);

    // Future: persist to filesystem if persistenceDir is set
    // (for now, in-memory only — distributed storage is a future extension)

    return snapshot;
  }

  // ─── Recovery ─────────────────────────────────────────

  /**
   * Analyze a snapshot and produce a recovery plan.
   * The plan tells the executor which stages to skip.
   */
  buildRecoveryPlan(
    snapshot: PipelineSnapshot,
    stageDefinitions: readonly PipelineStageDefinition[],
  ): RecoveryPlan {
    const restoredState = PipelineState.fromJSON(snapshot.state, stageDefinitions);

    const completedStageIds: string[] = [];
    const skippedStageIds: string[] = [];
    const failedStageIds: string[] = [];
    const pendingStageIds: string[] = [];

    for (const def of stageDefinitions) {
      const stage = restoredState.getStage(def.id);
      if (!stage) {
        pendingStageIds.push(def.id);
        continue;
      }

      switch (stage.status) {
        case 'completed':
          completedStageIds.push(def.id);
          break;
        case 'skipped':
          skippedStageIds.push(def.id);
          break;
        case 'failed':
          failedStageIds.push(def.id);
          break;
        default:
          pendingStageIds.push(def.id);
          break;
      }
    }

    return {
      completedStageIds,
      skippedStageIds,
      failedStageIds,
      pendingStageIds,
      snapshot,
    };
  }

  /**
   * Get the latest snapshot for a pipeline.
   */
  getLatestSnapshot(pipelineId: ID): PipelineSnapshot | undefined {
    let latest: PipelineSnapshot | undefined;
    for (const snap of this.snapshots.values()) {
      if (snap.pipelineId === pipelineId) {
        if (!latest || snap.sequence > latest.sequence) {
          latest = snap;
        }
      }
    }
    return latest;
  }

  /**
   * Get all snapshots for a pipeline.
   */
  getSnapshots(pipelineId: ID): readonly PipelineSnapshot[] {
    return Array.from(this.snapshots.values())
      .filter(s => s.pipelineId === pipelineId)
      .sort((a, b) => a.sequence - b.sequence);
  }

  /**
   * Restore a PipelineState from a snapshot.
   */
  static restoreState(
    snapshot: PipelineSnapshot,
    stageDefinitions: readonly PipelineStageDefinition[],
  ): PipelineState {
    return PipelineState.fromJSON(snapshot.state, stageDefinitions);
  }

  /**
   * Restore an ArtifactBus from a snapshot.
   */
  static restoreArtifactBus(snapshot: PipelineSnapshot): ArtifactBusImpl {
    return ArtifactBusImpl.fromSnapshot(snapshot.artifacts);
  }

  // ─── Cleanup ─────────────────────────────────────────

  /**
   * Remove all snapshots for a given pipeline.
   */
  clearForPipeline(pipelineId: ID): number {
    let removed = 0;
    for (const [id, snap] of this.snapshots) {
      if (snap.pipelineId === pipelineId) {
        this.snapshots.delete(id);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Remove all snapshots (full cleanup).
   */
  clearAll(): void {
    this.snapshots.clear();
    this.sequenceCounter = 0;
  }

  /**
   * Prune old snapshots, keeping only the N most recent per pipeline.
   */
  prune(keepCount: number): number {
    const byPipeline = new Map<ID, PipelineSnapshot[]>();

    for (const snap of this.snapshots.values()) {
      const list = byPipeline.get(snap.pipelineId) ?? [];
      list.push(snap);
      byPipeline.set(snap.pipelineId, list);
    }

    let removed = 0;
    for (const [, snapshots] of byPipeline) {
      snapshots.sort((a, b) => b.sequence - a.sequence);
      if (snapshots.length > keepCount) {
        for (const old of snapshots.slice(keepCount)) {
          this.snapshots.delete(old.snapshotId);
          removed++;
        }
      }
    }

    return removed;
  }

  /**
   * Get total snapshot count.
   */
  get snapshotCount(): number {
    return this.snapshots.size;
  }
}

// ─── Factory ────────────────────────────────────────────────

export function createFailureRecoveryManager(options?: { persistenceDir?: string }): FailureRecoveryManager {
  return new FailureRecoveryManager(options);
}