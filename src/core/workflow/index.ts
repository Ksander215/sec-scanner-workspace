/**
 * Workflow Module — Public API
 * TASK-AIS-003H.000 — Workflow Runtime & Process Orchestration
 *
 * Conforms to: CON-001.000, ARC-001.001, DOM-002.000, ADR-001..014
 *
 * Exports:
 *   - Workflow Runtime (main orchestrator)
 *   - Workflow types, enums, interfaces
 *   - Workflow domain events
 *   - Workflow error hierarchy
 *   - FSM definitions
 *   - Transition Engine, Scheduler, Variables, Compensation
 *   - Persistence adapters
 *   - Version Manager, Trace, Metrics, Policies
 *   - Definition and Instance factories
 */

// ─── Runtime (primary export) ──────────────────────────────────
export { WorkflowRuntime } from './workflow-runtime.js';
export type { WorkflowRuntimeConfig } from './workflow-runtime.js';

// ─── Enums ────────────────────────────────────────────────────
export {
  WorkflowState,
  StageState,
  StageType,
  CompensationAction,
  VariableScope,
  ExecutionMode,
  ExecutionStatus,
  PolicyType,
  CompensationStatus,
  TraceLevel,
} from './types.js';

// ─── Domain Entities (interfaces) ──────────────────────────────
export type {
  WorkflowDefinition,
  StageDefinition,
  TransitionDefinition,
  ConditionDefinition,
  RetryPolicy,
  CompensationDefinition,
  WorkflowInstance,
  StageInstance,
  ExecutionRecord,
  WorkflowError as WorkflowErrorInfo,
  StageError,
  CompensationRecord,
  WorkflowVariables,
  WorkflowPolicyDefinition,
  WorkflowCheckpoint,
  TraceEntry,
  WorkflowMetrics,
  WorkflowStorageAdapter,
  WorkflowInstanceFilter,
  WorkflowVersionInfo,
  WorkflowMigrationResult,
  SchedulePlan,
  WorkflowContext,
  WorkflowRegistration,
  StageHandler,
  StageHandlerRegistry,
} from './types.js';

// ─── Branded Identifiers ─────────────────────────────────────
export type {
  WorkflowId,
  WorkflowInstanceId,
  WorkflowVersionId,
  StageId,
  ExecutionId,
  TransitionId,
  VariableScopeId,
  CheckpointId,
  TraceEntryId,
} from './types.js';

export {
  brandWorkflowId,
  brandWorkflowInstanceId,
  brandWorkflowVersionId,
  brandStageId,
  brandExecutionId,
  brandTransitionId,
  brandVariableScopeId,
  brandCheckpointId,
  brandTraceEntryId,
} from './types.js';

// ─── Events ───────────────────────────────────────────────────
export type {
  WorkflowCreated,
  WorkflowStarted,
  StageStarted,
  StageCompleted,
  StageFailed,
  WorkflowPaused,
  WorkflowResumed,
  WorkflowCompleted,
  WorkflowCancelled,
  WorkflowRecovered,
  WorkflowErrorEvent,
  StageSkipped,
  CompensationStarted,
  CompensationCompleted,
  CheckpointCreated,
  WorkflowEvent,
} from './workflow-events.js';

export { createWorkflowEventBase } from './workflow-events.js';

// ─── Errors ──────────────────────────────────────────────────
export {
  WorkflowError,
  WorkflowNotFoundError,
  WorkflowInstanceNotFoundError,
  WorkflowDuplicateError,
  WorkflowStateError,
  StageNotFoundError,
  StageStateError,
  StageExecutionError,
  WorkflowTimeoutError,
  WorkflowTransitionError,
  WorkflowGuardError,
  WorkflowConditionError,
  WorkflowCompensationError,
  WorkflowVariableError,
  WorkflowRecoveryError,
  WorkflowVersionError,
  WorkflowPolicyViolationError,
  WorkflowHandlerNotFoundError,
  WorkflowDisposedError,
  WorkflowValidationError,
  WorkflowCheckpointError,
  WorkflowSchedulerError,
} from './workflow-errors.js';

// ─── Sub-components ───────────────────────────────────────────
export { TransitionEngine } from './transition-engine.js';
export type { TransitionEvaluation, TransitionResult, ConditionEvaluator, GuardEvaluator } from './transition-engine.js';

export { WorkflowScheduler } from './scheduler.js';
export { VariablesRuntime } from './variables.js';
export { CompensationEngine } from './compensation.js';
export type { CompensationResult, CompensateHandler } from './compensation.js';

export { InMemoryWorkflowStorage } from './workflow-storage.js';
export { WorkflowVersionManager } from './workflow-versioning.js';
export { WorkflowTrace } from './workflow-trace.js';
export { WorkflowMetricsCollector } from './workflow-metrics.js';
export { WorkflowPolicyEngine } from './workflow-policies.js';
export type { PolicyEvaluation, PolicyContext, PolicyResult, PolicyHandler } from './workflow-policies.js';
export { WorkflowContextImpl } from './workflow-context.js';

// ─── FSM Definition ───────────────────────────────────────────
export {
  createWorkflowFSM,
  createStageFSM,
  getWorkflowFSMDefinition,
  getStageFSMDefinition,
} from './workflow-fsm.js';
export type { WorkflowFSMState, StageFSMState } from './workflow-fsm.js';

// ─── Definition & Instance factories ──────────────────────────
export {
  createWorkflowDefinition,
  validateDefinition,
} from './workflow-definition.js';
export type { WorkflowDefinitionConfig, StageDefinitionConfig, TransitionConfig } from './workflow-definition.js';

export {
  createWorkflowInstance,
  cloneMutable,
  freezeInstance,
  updateStageState,
  createExecutionRecord,
  completeExecutionRecord,
} from './workflow-instance.js';
export type { CreateInstanceParams } from './workflow-instance.js';

// ─── FSM State Machine (re-export from core) ─────────────────
export type { StateMachine, FSMDefinition } from '../fsm/state-machine.js';
