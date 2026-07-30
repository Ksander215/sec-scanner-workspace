/**
 * Workflow Runtime — Workflow Instance
 * TASK-AIS-003H.000
 *
 * Manages runtime instances of workflow executions.
 * Creates, mutates, and serializes workflow instance state.
 */

import type {
  WorkflowInstance,
  WorkflowId,
  StageId,
  StageInstance,
  ExecutionRecord,
  WorkflowVariables,
  VariableScopeId,
  CompensationRecord,
  WorkflowState,
  WorkflowError as WorkflowErrorEntity,
  StageError as StageErrorEntity,
  Timestamp,
  SemVer,
} from './types.js';
import {
  WorkflowState as WS,
  StageState as SS,
  ExecutionStatus as ES,
} from './types.js';
import {
  brandWorkflowInstanceId,
  brandExecutionId,
} from './types.js';
import type { WorkflowDefinition } from './types.js';

export interface CreateInstanceParams {
  readonly workflowId: WorkflowId;
  readonly definitionVersion: SemVer;
  readonly input?: Readonly<Record<string, unknown>>;
}

/**
 * Create a new workflow instance from a definition.
 */
export function createWorkflowInstance(
  definition: WorkflowDefinition,
  params: CreateInstanceParams,
): WorkflowInstance {
  const now = new Date().toISOString() as Timestamp;
  const instanceId = brandWorkflowInstanceId(crypto.randomUUID());

  const stages = new Map<StageId, StageInstance>();
  for (const stageDef of definition.stages) {
    stages.set(stageDef.id, Object.freeze({
      id: stageDef.id,
      name: stageDef.name,
      state: SS.Pending,
      type: stageDef.type,
      executions: [],
      input: Object.freeze({}),
      output: Object.freeze({}),
      error: null,
      startedAt: null,
      completedAt: null,
      attempts: 0,
      compensation: null,
      metadata: Object.freeze({}),
    }));
  }

  return Object.freeze({
    id: instanceId,
    workflowId: params.workflowId,
    definitionVersion: params.definitionVersion,
    state: WS.Draft,
    currentStageId: null,
    stages,
    variables: new Map(),
    input: Object.freeze({ ...params.input }),
    output: Object.freeze({}),
    error: null,
    createdAt: now,
    startedAt: null,
    completedAt: null,
    updatedAt: now,
    metadata: Object.freeze({}),
  });
}

/**
 * Create a mutable copy of a workflow instance for updates.
 * Returns a deep-copy that can be modified.
 */
export function cloneMutable(instance: WorkflowInstance): {
  state: WorkflowState;
  currentStageId: StageId | null;
  stages: Map<StageId, StageInstance>;
  variables: Map<VariableScopeId, WorkflowVariables>;
  output: Record<string, unknown>;
  error: WorkflowErrorEntity | null;
  startedAt: Timestamp | null;
  completedAt: Timestamp | null;
  updatedAt: Timestamp;
} {
  return {
    state: instance.state,
    currentStageId: instance.currentStageId,
    stages: new Map(instance.stages),
    variables: new Map(instance.variables),
    output: { ...instance.output },
    error: instance.error ? { ...instance.error } : null,
    startedAt: instance.startedAt,
    completedAt: instance.completedAt,
    updatedAt: new Date().toISOString() as Timestamp,
  };
}

/**
 * Freeze a mutable copy back into an immutable WorkflowInstance.
 */
export function freezeInstance(
  original: WorkflowInstance,
  mutable: ReturnType<typeof cloneMutable>,
): WorkflowInstance {
  return Object.freeze({
    ...original,
    state: mutable.state,
    currentStageId: mutable.currentStageId,
    stages: new Map(mutable.stages),
    variables: new Map(mutable.variables),
    output: Object.freeze(mutable.output),
    error: mutable.error ? Object.freeze(mutable.error) : null,
    startedAt: mutable.startedAt,
    completedAt: mutable.completedAt,
    updatedAt: mutable.updatedAt,
  });
}

/**
 * Create a stage instance with updated state.
 */
export function updateStageState(
  stage: StageInstance,
  state: typeof stage.state,
  options?: Partial<{
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    error: StageErrorEntity;
    startedAt: Timestamp;
    completedAt: Timestamp;
    attempts: number;
    compensation: CompensationRecord;
  }>,
): StageInstance {
  return Object.freeze({
    ...stage,
    state,
    input: options?.input !== undefined ? Object.freeze(options.input) : stage.input,
    output: options?.output !== undefined ? Object.freeze(options.output) : stage.output,
    error: options?.error !== undefined ? Object.freeze(options.error) : stage.error,
    startedAt: options?.startedAt ?? stage.startedAt,
    completedAt: options?.completedAt ?? stage.completedAt,
    attempts: options?.attempts ?? stage.attempts,
    compensation: options?.compensation !== undefined
      ? Object.freeze(options.compensation)
      : stage.compensation,
  });
}

/**
 * Create an execution record.
 */
export function createExecutionRecord(
  stageId: StageId,
  attempt: number,
  input: Readonly<Record<string, unknown>>,
): ExecutionRecord {
  return Object.freeze({
    id: brandExecutionId(crypto.randomUUID()),
    stageId,
    attempt,
    startedAt: new Date().toISOString() as Timestamp,
    completedAt: null,
    status: ES.Running,
    input,
    output: Object.freeze({}),
    error: null,
    durationMs: null,
    metadata: Object.freeze({}),
  });
}

/**
 * Complete an execution record.
 */
export function completeExecutionRecord(
  record: ExecutionRecord,
  status: ES,
  output: Readonly<Record<string, unknown>>,
  error?: StageErrorEntity,
): ExecutionRecord {
  const completedAt = new Date().toISOString() as Timestamp;
  const durationMs = new Date(completedAt).getTime() - new Date(record.startedAt).getTime();

  return Object.freeze({
    ...record,
    completedAt,
    status,
    output: Object.freeze(output),
    error: error ? Object.freeze(error) : null,
    durationMs,
  });
}
