/**
 * Scan Platform — Pipeline Module
 *
 * Public API for the Pipeline Executor layer.
 * This is a pure overlay on top of TASK-201 Scan Platform Foundation.
 * No TASK-201 files are modified by this module.
 */

// ─── Enums ──────────────────────────────────────────────────
export {
  PipelineStatus,
  StageStatus,
  TERMINAL_PIPELINE_STATUSES,
  TERMINAL_STAGE_STATUSES,
  ArtifactCategory,
  PipelineEventType,
} from './types.ts';

// ─── Types ──────────────────────────────────────────────────
export type {
  PipelineStageDefinition,
  PipelineStage,
  PipelineStageError,
  PipelineArtifact,
  PipelineEvent,
  PipelineContextSnapshot,
  PipelineResult,
  PipelineMetrics,
  PipelineConfig,
  StageHandler,
  StageTiming,
  ArtifactBusReadonly,
  ArtifactBusWriteable,
  ArtifactBus,
  PipelineEventBusReadonly,
  PipelineEventBusWriteable,
  PipelineEventBus,
  MetricsExporter,
} from './types.ts';

// ─── Core Components ────────────────────────────────────────
export { PipelineExecutor, BuiltinStages, createPipelineExecutor } from './pipeline-executor.ts';
export { ArtifactBusImpl, createArtifactBus } from './artifact-bus.ts';
export { PipelineEventBusImpl, createEventBus } from './event-bus.ts';
export { PipelineState } from './pipeline-state.ts';
export { MetricsCollector, createMetricsCollector } from './metrics-collector.ts';
export { RetryManager, classifyError, createRetryManager, type ClassifiedError } from './retry-manager.ts';
export {
  FailureRecoveryManager,
  createFailureRecoveryManager,
  type PipelineSnapshot,
  type RecoveryPlan,
} from './failure-recovery.ts';

// ─── Stub Engines (for testing) ─────────────────────────────
export {
  createDiscoveryStub,
  createPassiveStub,
  createActiveStub,
  createTargetValidationStub,
  createNormalizationStub,
} from './stubs/index.ts';