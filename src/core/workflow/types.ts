/**
 * Workflow Runtime — Types, Enums, Interfaces
 * TASK-AIS-003H.000 — Workflow Runtime & Process Orchestration
 *
 * Core type definitions for the Workflow Runtime:
 *   - Branded identifiers
 *   - Enums (WorkflowState, StageState, etc.)
 *   - Domain entities (Workflow, Stage, Transition, etc.)
 *   - Interfaces (contracts, policies, storage)
 *
 * Conforms to: CON-001.000, ARC-001.001, DOM-002.000, ADR-001..014
 */

import type { Timestamp, Identifier, SemVer } from '../types/common.js';

export type { Timestamp, SemVer };

// ═══════════════════════════════════════════════════════════════════
// BRANDED IDENTIFIERS
// ═══════════════════════════════════════════════════════════════════

export type WorkflowId = Identifier & { readonly __brand: 'WorkflowId' };
export type WorkflowInstanceId = Identifier & { readonly __brand: 'WorkflowInstanceId' };
export type WorkflowVersionId = Identifier & { readonly __brand: 'WorkflowVersionId' };
export type StageId = Identifier & { readonly __brand: 'StageId' };
export type ExecutionId = Identifier & { readonly __brand: 'ExecutionId' };
export type TransitionId = Identifier & { readonly __brand: 'TransitionId' };
export type VariableScopeId = Identifier & { readonly __brand: 'VariableScopeId' };
export type CheckpointId = Identifier & { readonly __brand: 'CheckpointId' };
export type TraceEntryId = Identifier & { readonly __brand: 'TraceEntryId' };

function brandWorkflowId(id: string): WorkflowId { return id as WorkflowId; }
function brandWorkflowInstanceId(id: string): WorkflowInstanceId { return id as WorkflowInstanceId; }
function brandWorkflowVersionId(id: string): WorkflowVersionId { return id as WorkflowVersionId; }
function brandStageId(id: string): StageId { return id as StageId; }
function brandExecutionId(id: string): ExecutionId { return id as ExecutionId; }
function brandTransitionId(id: string): TransitionId { return id as TransitionId; }
function brandVariableScopeId(id: string): VariableScopeId { return id as VariableScopeId; }
function brandCheckpointId(id: string): CheckpointId { return id as CheckpointId; }
function brandTraceEntryId(id: string): TraceEntryId { return id as TraceEntryId; }

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
};

// ═══════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════

/**
 * Workflow lifecycle states.
 * FSM: Draft → Ready → Running ↔ Paused → Completed | Failed | Cancelled
 */
export enum WorkflowState {
  Draft = 'Draft',
  Ready = 'Ready',
  Running = 'Running',
  Paused = 'Paused',
  Completed = 'Completed',
  Failed = 'Failed',
  Cancelled = 'Cancelled',
}

/**
 * Stage execution states within a workflow.
 */
export enum StageState {
  Pending = 'Pending',
  Ready = 'Ready',
  Running = 'Running',
  Paused = 'Paused',
  Completed = 'Completed',
  Failed = 'Failed',
  Skipped = 'Skipped',
  Cancelled = 'Cancelled',
}

/**
 * Type of stage execution strategy.
 */
export enum StageType {
  Sequential = 'Sequential',
  Parallel = 'Parallel',
  Conditional = 'Conditional',
  Delayed = 'Delayed',
  EventDriven = 'EventDriven',
}

/**
 * Compensation action types for rollback.
 */
export enum CompensationAction {
  Undo = 'Undo',
  Retry = 'Retry',
  Skip = 'Skip',
  Restart = 'Restart',
  Abort = 'Abort',
}

/**
 * Variable scope levels.
 */
export enum VariableScope {
  Global = 'Global',
  Stage = 'Stage',
  Execution = 'Execution',
  Temporary = 'Temporary',
  Output = 'Output',
}

/**
 * Workflow execution mode.
 */
export enum ExecutionMode {
  Sequential = 'Sequential',
  Parallel = 'Parallel',
  Conditional = 'Conditional',
  Delayed = 'Delayed',
  EventDriven = 'EventDriven',
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — WORKFLOW DEFINITION
// ═══════════════════════════════════════════════════════════════════

/**
 * Workflow Definition — the template/blueprint of a process.
 * Contains stages, transitions, conditions, policies, metadata, and version.
 */
export interface WorkflowDefinition {
  readonly id: WorkflowId;
  readonly name: string;
  readonly description: string;
  readonly version: SemVer;
  readonly stages: readonly StageDefinition[];
  readonly transitions: readonly TransitionDefinition[];
  readonly conditions: readonly ConditionDefinition[];
  readonly policies: readonly WorkflowPolicyDefinition[];
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly outputSchema: Readonly<Record<string, unknown>>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

/**
 * Stage Definition — a single step in a workflow.
 */
export interface StageDefinition {
  readonly id: StageId;
  readonly name: string;
  readonly description: string;
  readonly type: StageType;
  readonly handler: string;
  readonly inputMapping: Readonly<Record<string, string>>;
  readonly outputMapping: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
  readonly retryPolicy: RetryPolicy;
  readonly compensation: CompensationDefinition;
  readonly conditions: readonly ConditionDefinition[];
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly parallelism?: number;
  readonly dependencies: readonly StageId[];
  readonly delayMs?: number;
  readonly eventType?: string;
}

/**
 * Transition Definition — a link between stages.
 */
export interface TransitionDefinition {
  readonly id: TransitionId;
  readonly from: StageId;
  readonly to: StageId;
  readonly condition?: string;
  readonly guard?: string;
  readonly priority: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Condition Definition — a condition for transitions or stage execution.
 */
export interface ConditionDefinition {
  readonly id: string;
  readonly name: string;
  readonly expression: string;
  readonly description: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Retry Policy — how a stage retries on failure.
 */
export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly delayMs: number;
  readonly backoffMultiplier: number;
  readonly retryableErrors: readonly string[];
}

/**
 * Compensation Definition — how a stage rolls back.
 */
export interface CompensationDefinition {
  readonly action: CompensationAction;
  readonly handler?: string;
  readonly timeoutMs: number;
  readonly retryPolicy: RetryPolicy;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — WORKFLOW INSTANCE
// ═══════════════════════════════════════════════════════════════════

/**
 * Workflow Instance — a running or completed workflow execution.
 */
export interface WorkflowInstance {
  readonly id: WorkflowInstanceId;
  readonly workflowId: WorkflowId;
  readonly definitionVersion: SemVer;
  readonly state: WorkflowState;
  readonly currentStageId: StageId | null;
  readonly stages: ReadonlyMap<StageId, StageInstance>;
  readonly variables: ReadonlyMap<VariableScopeId, WorkflowVariables>;
  readonly input: Readonly<Record<string, unknown>>;
  readonly output: Readonly<Record<string, unknown>>;
  readonly error: Readonly<WorkflowError> | null;
  readonly createdAt: Timestamp;
  readonly startedAt: Timestamp | null;
  readonly completedAt: Timestamp | null;
  readonly updatedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Stage Instance — the runtime representation of an executing stage.
 */
export interface StageInstance {
  readonly id: StageId;
  readonly name: string;
  readonly state: StageState;
  readonly type: StageType;
  readonly executions: readonly ExecutionRecord[];
  readonly input: Readonly<Record<string, unknown>>;
  readonly output: Readonly<Record<string, unknown>>;
  readonly error: Readonly<StageError> | null;
  readonly startedAt: Timestamp | null;
  readonly completedAt: Timestamp | null;
  readonly attempts: number;
  readonly compensation: CompensationRecord | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Execution Record — a single attempt to execute a stage.
 */
export interface ExecutionRecord {
  readonly id: ExecutionId;
  readonly stageId: StageId;
  readonly attempt: number;
  readonly startedAt: Timestamp;
  readonly completedAt: Timestamp | null;
  readonly status: ExecutionStatus;
  readonly input: Readonly<Record<string, unknown>>;
  readonly output: Readonly<Record<string, unknown>>;
  readonly error: Readonly<StageError> | null;
  readonly durationMs: number | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Execution status for a single attempt.
 */
export enum ExecutionStatus {
  Pending = 'Pending',
  Running = 'Running',
  Completed = 'Completed',
  Failed = 'Failed',
  Cancelled = 'Cancelled',
}

// ═══════════════════════════════════════════════════════════════════
// ERROR ENTITIES
// ═══════════════════════════════════════════════════════════════════

export interface WorkflowError {
  readonly code: string;
  readonly message: string;
  readonly details: readonly string[];
  readonly occurredAt: Timestamp;
  readonly stageId: StageId | null;
  readonly recoverable: boolean;
}

export interface StageError {
  readonly code: string;
  readonly message: string;
  readonly details: readonly string[];
  readonly occurredAt: Timestamp;
  readonly attempt: number;
  readonly retryable: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// COMPENSATION RECORD
// ═══════════════════════════════════════════════════════════════════

export interface CompensationRecord {
  readonly stageId: StageId;
  readonly action: CompensationAction;
  readonly status: CompensationStatus;
  readonly startedAt: Timestamp;
  readonly completedAt: Timestamp | null;
  readonly error: Readonly<StageError> | null;
  readonly attempts: number;
}

export enum CompensationStatus {
  Pending = 'Pending',
  Running = 'Running',
  Completed = 'Completed',
  Failed = 'Failed',
  Skipped = 'Skipped',
}

// ═══════════════════════════════════════════════════════════════════
// VARIABLES
// ═══════════════════════════════════════════════════════════════════

export interface WorkflowVariables {
  readonly id: VariableScopeId;
  readonly scope: VariableScope;
  readonly stageId: StageId | null;
  readonly executionId: ExecutionId | null;
  readonly variables: ReadonlyMap<string, unknown>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════
// POLICIES
// ═══════════════════════════════════════════════════════════════════

export interface WorkflowPolicyDefinition {
  readonly id: string;
  readonly name: string;
  readonly type: PolicyType;
  readonly rules: Readonly<Record<string, unknown>>;
  readonly description: string;
}

export enum PolicyType {
  Timeout = 'Timeout',
  Retry = 'Retry',
  Parallelism = 'Parallelism',
  Security = 'Security',
  ResourceLimit = 'ResourceLimit',
}

// ═══════════════════════════════════════════════════════════════════
// CHECKPOINT
// ═══════════════════════════════════════════════════════════════════

export interface WorkflowCheckpoint {
  readonly id: CheckpointId;
  readonly workflowInstanceId: WorkflowInstanceId;
  readonly state: WorkflowState;
  readonly currentStageId: StageId | null;
  readonly stageStates: ReadonlyMap<StageId, StageState>;
  readonly variables: ReadonlyMap<VariableScopeId, ReadonlyMap<string, unknown>>;
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// TRACE
// ═══════════════════════════════════════════════════════════════════

export interface TraceEntry {
  readonly id: TraceEntryId;
  readonly workflowInstanceId: WorkflowInstanceId;
  readonly stageId: StageId | null;
  readonly executionId: ExecutionId | null;
  readonly level: TraceLevel;
  readonly action: string;
  readonly message: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly artifacts: readonly string[];
}

export enum TraceLevel {
  Debug = 'Debug',
  Info = 'Info',
  Warn = 'Warn',
  Error = 'Error',
}

// ═══════════════════════════════════════════════════════════════════
// METRICS
// ═══════════════════════════════════════════════════════════════════

export interface WorkflowMetrics {
  readonly totalWorkflows: number;
  readonly runningWorkflows: number;
  readonly completedWorkflows: number;
  readonly failedWorkflows: number;
  readonly pausedWorkflows: number;
  readonly cancelledWorkflows: number;
  readonly totalStages: number;
  readonly completedStages: number;
  readonly failedStages: number;
  readonly totalExecutionTimeMs: number;
  readonly averageExecutionTimeMs: number;
  readonly totalRetryCount: number;
  readonly totalRecoveryCount: number;
  readonly totalCheckpointCount: number;
  readonly successRate: number;
  readonly eventsPublished: number;
}

// ═══════════════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════════════

export interface WorkflowStorageAdapter {
  saveWorkflowInstance(instance: WorkflowInstance): Promise<void>;
  loadWorkflowInstance(id: WorkflowInstanceId): Promise<WorkflowInstance | null>;
  deleteWorkflowInstance(id: WorkflowInstanceId): Promise<boolean>;
  listWorkflowInstances(filter?: WorkflowInstanceFilter): Promise<readonly WorkflowInstance[]>;
  saveDefinition(definition: WorkflowDefinition): Promise<void>;
  loadDefinition(id: WorkflowId): Promise<WorkflowDefinition | null>;
  deleteDefinition(id: WorkflowId): Promise<boolean>;
  listDefinitions(): Promise<readonly WorkflowDefinition[]>;
  saveCheckpoint(checkpoint: WorkflowCheckpoint): Promise<void>;
  loadCheckpoint(instanceId: WorkflowInstanceId): Promise<WorkflowCheckpoint | null>;
  listCheckpoints(instanceId: WorkflowInstanceId): Promise<readonly WorkflowCheckpoint[]>;
}

export interface WorkflowInstanceFilter {
  readonly state?: WorkflowState;
  readonly workflowId?: WorkflowId;
  readonly from?: Timestamp;
  readonly to?: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════
// VERSIONING
// ═══════════════════════════════════════════════════════════════════

export interface WorkflowVersionInfo {
  readonly id: WorkflowVersionId;
  readonly workflowId: WorkflowId;
  readonly version: SemVer;
  readonly definition: WorkflowDefinition;
  readonly createdAt: Timestamp;
  readonly isActive: boolean;
  readonly migrationScript?: string;
  readonly changelog: string;
}

export interface WorkflowMigrationResult {
  readonly fromVersion: SemVer;
  readonly toVersion: SemVer;
  readonly migrated: boolean;
  readonly changes: readonly string[];
  readonly errors: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════
// SCHEDULER
// ═══════════════════════════════════════════════════════════════════

export interface SchedulePlan {
  readonly stageId: StageId;
  readonly mode: ExecutionMode;
  readonly order: number;
  readonly group: number;
  readonly dependencies: readonly StageId[];
  readonly delayMs: number;
  readonly eventType?: string;
}

// ═══════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════

export interface WorkflowContext {
  readonly workflowInstanceId: WorkflowInstanceId;
  readonly workflowId: WorkflowId;
  readonly stageId: StageId | null;
  readonly variables: ReadonlyMap<string, unknown>;
  readonly input: Readonly<Record<string, unknown>>;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly getVariable: (key: string) => unknown;
  readonly setVariable: (key: string, value: unknown) => void;
  readonly emit: (eventType: string, payload: unknown) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════
// CAPABILITY PACK REGISTRATION
// ═══════════════════════════════════════════════════════════════════

export interface WorkflowRegistration {
  readonly packId: string;
  readonly workflowTemplates: readonly WorkflowDefinition[];
  readonly policies: readonly WorkflowPolicyDefinition[];
  readonly validators: readonly string[];
  readonly stageTypes: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════
// HANDLER CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface StageHandler {
  readonly execute: (context: WorkflowContext) => Promise<Readonly<Record<string, unknown>>>;
  readonly compensate?: (context: WorkflowContext) => Promise<void>;
}

export interface StageHandlerRegistry {
  readonly register: (name: string, handler: StageHandler) => void;
  readonly get: (name: string) => StageHandler | undefined;
  readonly has: (name: string) => boolean;
  readonly getAll: () => ReadonlyMap<string, StageHandler>;
}
