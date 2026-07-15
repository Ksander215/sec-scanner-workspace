/**
 * Pipeline Executor Core — Types & Enumerations
 *
 * All types for the Pipeline layer.
 * Depends only on TASK-201 types (ID, Timestamp, ScanCapability).
 * Zero knowledge of specific engines.
 */

import type { ID, Timestamp, ScanCapability } from '../types/index.ts';

// ─── Pipeline Status ────────────────────────────────────────

/**
 * Lifecycle states of a Pipeline execution.
 *
 * Transitions:
 *   Created  → Running
 *   Running  → Paused | Cancelling
 *   Paused   → Running | Cancelling | Failed
 *   Cancelling → Cancelled
 *   Running  → Completed | Failed | PartiallyCompleted
 *   Paused   → PartiallyCompleted (on shutdown)
 */
export enum PipelineStatus {
  Created = 'created',
  Running = 'running',
  Paused = 'paused',
  Cancelling = 'cancelling',
  Completed = 'completed',
  Failed = 'failed',
  PartiallyCompleted = 'partially_completed',
  Cancelled = 'cancelled',
}

export const TERMINAL_PIPELINE_STATUSES: ReadonlySet<PipelineStatus> = new Set([
  PipelineStatus.Completed,
  PipelineStatus.Failed,
  PipelineStatus.PartiallyCompleted,
  PipelineStatus.Cancelled,
]);

// ─── Stage Status ───────────────────────────────────────────

export enum StageStatus {
  Pending = 'pending',
  Running = 'running',
  Retrying = 'retrying',
  Completed = 'completed',
  Skipped = 'skipped',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export const TERMINAL_STAGE_STATUSES: ReadonlySet<StageStatus> = new Set([
  StageStatus.Completed,
  StageStatus.Skipped,
  StageStatus.Failed,
  StageStatus.Cancelled,
]);

// ─── Artifact Categories ────────────────────────────────────

export enum ArtifactCategory {
  Urls = 'urls',
  Forms = 'forms',
  Endpoints = 'endpoints',
  Cookies = 'cookies',
  Headers = 'headers',
  Tls = 'tls',
  Storage = 'storage',
  Findings = 'findings',
  Evidence = 'evidence',
  Metadata = 'metadata',
  AuthSession = 'auth_session',
  DnsRecords = 'dns_records',
  Technology = 'technology',
  Redirects = 'redirects',
  JsFiles = 'js_files',
}

// ─── Pipeline Event Types ───────────────────────────────────

export enum PipelineEventType {
  PipelineStarted = 'pipeline.started',
  PipelineCompleted = 'pipeline.completed',
  PipelineFailed = 'pipeline.failed',
  PipelineCancelled = 'pipeline.cancelled',
  PipelinePaused = 'pipeline.paused',
  PipelineResumed = 'pipeline.resumed',
  PipelinePartiallyCompleted = 'pipeline.partially_completed',
  StageStarted = 'stage.started',
  StageCompleted = 'stage.completed',
  StageSkipped = 'stage.skipped',
  StageFailed = 'stage.failed',
  StageRetrying = 'stage.retrying',
  ArtifactPublished = 'artifact.published',
  EngineStarted = 'engine.started',
  EngineFinished = 'engine.finished',
  RetryScheduled = 'retry.scheduled',
}

// ─── Stage Definition ───────────────────────────────────────

/**
 * Definition of a single pipeline stage.
 * Declarative — describes WHAT, not HOW.
 */
export interface PipelineStageDefinition {
  /** Unique stage identifier (e.g. "target_validation"). */
  readonly id: string;
  /** Human-readable name. */
  readonly name: string;
  /** Ordered list of stage IDs that MUST complete before this stage starts. */
  readonly dependencies: readonly string[];
  /** Capabilities required from engines for this stage. */
  readonly requiredCapabilities: readonly ScanCapability[];
  /** Optional: specific engine IDs to use (bypasses capability routing). */
  readonly engineIds?: readonly string[];
  /** Max retries for this stage. */
  readonly maxRetries: number;
  /** Per-stage timeout in milliseconds. 0 = no limit. */
  readonly timeoutMs: number;
  /** Whether this stage can be skipped. */
  readonly skippable: boolean;
  /** Condition function: returns true if stage should execute. */
  readonly shouldRun?: (context: PipelineContextSnapshot) => boolean;
  /** Stage-internal metadata. */
  readonly metadata?: Record<string, unknown>;
}

// ─── Pipeline Stage (Runtime) ───────────────────────────────

export interface PipelineStage {
  readonly definition: PipelineStageDefinition;
  readonly status: StageStatus;
  readonly startedAt: Timestamp | null;
  readonly completedAt: Timestamp | null;
  readonly durationMs: number | null;
  readonly error: PipelineStageError | null;
  readonly retryCount: number;
  readonly engineIds: readonly string[];
}

// ─── Pipeline Stage Error ───────────────────────────────────

export interface PipelineStageError {
  readonly stageId: string;
  readonly message: string;
  readonly code: string;
  readonly retryable: boolean;
  readonly occurredAt: Timestamp;
  readonly details?: Record<string, unknown>;
}

// ─── Stage Timing ───────────────────────────────────────────

export interface StageTiming {
  readonly stageId: string;
  readonly startedAt: Timestamp;
  readonly completedAt: Timestamp;
  readonly durationMs: number;
  readonly engineTimings: ReadonlyMap<string, number>;
}

// ─── Artifact ───────────────────────────────────────────────

/**
 * A single artifact published by a stage.
 * Immutable once published.
 */
export interface PipelineArtifact {
  readonly id: ID;
  readonly category: ArtifactCategory;
  readonly stageId: string;
  readonly key: string;
  readonly value: unknown;
  readonly publishedAt: Timestamp;
  readonly sourceEngine?: string;
}

// ─── Pipeline Event ─────────────────────────────────────────

export interface PipelineEvent {
  readonly type: PipelineEventType;
  readonly timestamp: Timestamp;
  readonly pipelineId: ID;
  readonly data?: Record<string, unknown>;
}

// ─── Pipeline Context Snapshot ──────────────────────────────

/**
 * Immutable snapshot of the pipeline context.
 * Used for stage condition evaluation and persistence.
 */
export interface PipelineContextSnapshot {
  readonly pipelineId: ID;
  readonly scanJobId: string;
  readonly targetUrl: string;
  readonly status: PipelineStatus;
  readonly currentStages: readonly string[];
  readonly completedStages: ReadonlySet<string>;
  readonly failedStages: ReadonlyMap<string, PipelineStageError>;
  readonly skippedStages: ReadonlySet<string>;
  readonly stageTimings: ReadonlyMap<string, StageTiming>;
  readonly artifactCount: number;
  readonly findingCount: number;
  readonly urlCount: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

// ─── Pipeline Result ────────────────────────────────────────

export interface PipelineResult {
  readonly pipelineId: ID;
  readonly status: PipelineStatus;
  readonly stages: ReadonlyMap<string, PipelineStage>;
  readonly artifacts: readonly PipelineArtifact[];
  readonly findings: readonly any[];
  readonly errors: readonly PipelineStageError[];
  readonly timings: ReadonlyMap<string, StageTiming>;
  readonly metrics: PipelineMetrics;
  readonly createdAt: Timestamp;
  readonly completedAt: Timestamp | null;
  readonly durationMs: number | null;
}

// ─── Pipeline Metrics ───────────────────────────────────────

export interface PipelineMetrics {
  readonly totalStages: number;
  readonly completedStages: number;
  readonly skippedStages: number;
  readonly failedStages: number;
  readonly retriedStages: number;
  readonly totalRetries: number;
  readonly totalEnginesUsed: number;
  readonly totalRequestsCount: number;
  readonly totalFindingsCount: number;
  readonly totalArtifactsCount: number;
  readonly totalDurationMs: number | null;
  readonly stageDurations: ReadonlyMap<string, number>;
  readonly engineDurations: ReadonlyMap<string, number>;
  readonly memoryUsageMb: number | null;
}

// ─── Pipeline Config ────────────────────────────────────────

export interface PipelineConfig {
  /** Pipeline-unique identifier. */
  readonly pipelineId: ID;
  /** The scan job this pipeline belongs to. */
  readonly scanJobId: string;
  /** Target URL. */
  readonly targetUrl: string;
  /** Target name (for logging). */
  readonly targetName: string;
  /** Stage definitions in execution order. */
  readonly stages: readonly PipelineStageDefinition[];
  /** Maximum concurrent stages. */
  readonly maxConcurrentStages: number;
  /** Total pipeline timeout in milliseconds. 0 = no limit. */
  readonly totalTimeoutMs: number;
  /** Idle timeout in milliseconds (no events = abort). 0 = no limit. */
  readonly idleTimeoutMs: number;
  /** Enable persistence for failure recovery. */
  readonly enablePersistence: boolean;
  /** Directory for persistence snapshots. */
  readonly persistenceDir?: string;
  /** Additional metadata. */
  readonly metadata?: Record<string, unknown>;
}

// ─── Stage Handler ──────────────────────────────────────────

/**
 * Function that executes a pipeline stage.
 * Receives the Artifact Bus for reading/writing and an EventBus for events.
 * Returns stage-specific result data.
 */
export type StageHandler = (params: {
  readonly artifactBus: ArtifactBusReadonly;
  readonly eventBus: PipelineEventBusReadonly;
  readonly abortSignal: AbortSignal;
}) => Promise<unknown>;

// ─── Artifact Bus Interface ─────────────────────────────────

export interface ArtifactBusReadonly {
  readonly getAll: (category?: ArtifactCategory) => readonly PipelineArtifact[];
  readonly getByCategory: (category: ArtifactCategory) => readonly PipelineArtifact[];
  readonly getByStage: (stageId: string) => readonly PipelineArtifact[];
  readonly get: (category: ArtifactCategory, key: string) => PipelineArtifact | undefined;
  readonly search: (category: ArtifactCategory, predicate: (a: PipelineArtifact) => boolean) => readonly PipelineArtifact[];
  readonly count: (category?: ArtifactCategory) => number;
  readonly hasKey: (category: ArtifactCategory, key: string) => boolean;
}

export interface ArtifactBusWriteable {
  publish(artifact: Omit<PipelineArtifact, 'id' | 'publishedAt'>): PipelineArtifact;
}

export interface ArtifactBus extends ArtifactBusReadonly, ArtifactBusWriteable {}

// ─── Event Bus Interface ────────────────────────────────────

export interface PipelineEventBusReadonly {
  readonly on: (type: PipelineEventType | '*', handler: (event: PipelineEvent) => void) => () => void;
}

export interface PipelineEventBusWriteable {
  emit(event: PipelineEvent): void;
}

export interface PipelineEventBus extends PipelineEventBusReadonly, PipelineEventBusWriteable {}

// ─── Metrics Exporter Interface ─────────────────────────────

export interface MetricsExporter {
  getMetrics(): PipelineMetrics;
  getStageTiming(stageId: string): StageTiming | undefined;
  toJSON(): Record<string, unknown>;
}