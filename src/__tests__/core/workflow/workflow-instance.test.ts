/**
 * Workflow Runtime — Instance Tests
 * TASK-AIS-003H.000
 */
import { describe, it, expect } from 'vitest';
import { createWorkflowDefinition } from '../../../core/workflow/workflow-definition.js';
import {
  createWorkflowInstance,
  cloneMutable,
  freezeInstance,
  updateStageState,
  createExecutionRecord,
  completeExecutionRecord,
} from '../../../core/workflow/workflow-instance.js';
import { WorkflowState, StageState, ExecutionStatus } from '../../../core/workflow/types.js';

function makeDefinition() {
  return createWorkflowDefinition({
    name: 'Test',
    stages: [
      { name: 'Step 1', handler: 'h1' },
      { name: 'Step 2', handler: 'h2' },
    ],
  });
}

describe('createWorkflowInstance', () => {
  it('creates instance with Draft state', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    expect(inst.state).toBe(WorkflowState.Draft);
  });

  it('generates unique instance ID', () => {
    const def = makeDefinition();
    const i1 = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    const i2 = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    expect(i1.id).not.toBe(i2.id);
  });

  it('stores workflowId', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    expect(inst.workflowId).toBe(def.id);
  });

  it('stores definitionVersion', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: '2.0.0' });
    expect(inst.definitionVersion).toBe('2.0.0');
  });

  it('has null currentStageId initially', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    expect(inst.currentStageId).toBeNull();
  });

  it('creates stages for each definition stage', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    expect(inst.stages.size).toBe(2);
  });

  it('initializes stages with Pending state', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    for (const stage of inst.stages.values()) {
      expect(stage.state).toBe(StageState.Pending);
    }
  });

  it('initializes stages with empty executions', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    for (const stage of inst.stages.values()) {
      expect(stage.executions).toHaveLength(0);
    }
  });

  it('initializes stages with zero attempts', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    for (const stage of inst.stages.values()) {
      expect(stage.attempts).toBe(0);
    }
  });

  it('stores input', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version, input: { key: 'val' } });
    expect(inst.input).toEqual({ key: 'val' });
  });

  it('defaults input to empty object', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    expect(inst.input).toEqual({});
  });

  it('has empty output initially', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    expect(inst.output).toEqual({});
  });

  it('has null error initially', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    expect(inst.error).toBeNull();
  });

  it('has null startedAt initially', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    expect(inst.startedAt).toBeNull();
  });

  it('has null completedAt initially', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    expect(inst.completedAt).toBeNull();
  });

  it('sets createdAt and updatedAt', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    expect(inst.createdAt).toBeDefined();
    expect(inst.updatedAt).toBeDefined();
  });

  it('freezes the instance', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    expect(Object.isFrozen(inst)).toBe(true);
  });
});

describe('cloneMutable', () => {
  it('copies state from instance', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    const mut = cloneMutable(inst);
    expect(mut.state).toBe(inst.state);
  });

  it('creates mutable stages map', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    const mut = cloneMutable(inst);
    expect(mut.stages).toBeInstanceOf(Map);
  });

  it('creates mutable variables map', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    const mut = cloneMutable(inst);
    expect(mut.variables).toBeInstanceOf(Map);
  });

  it('copies output as mutable', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version, input: { a: 1 } });
    const mut = cloneMutable(inst);
    mut.output = { b: 2 };
    expect(mut.output).toEqual({ b: 2 });
  });

  it('copies error as mutable object', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    const mut = cloneMutable(inst);
    expect(mut.error).toBeNull();
  });

  it('sets updatedAt to current time', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    const beforeMs = Date.now();
    const mut = cloneMutable(inst);
    const afterMs = Date.now();
    const updatedAtMs = new Date(mut.updatedAt).getTime();
    expect(updatedAtMs).toBeGreaterThanOrEqual(beforeMs);
    expect(updatedAtMs).toBeLessThanOrEqual(afterMs);
  });
});

describe('freezeInstance', () => {
  it('creates frozen instance', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    const mut = cloneMutable(inst);
    mut.state = WorkflowState.Running;
    const frozen = freezeInstance(inst, mut);
    expect(Object.isFrozen(frozen)).toBe(true);
  });

  it('applies mutable changes', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    const mut = cloneMutable(inst);
    mut.state = WorkflowState.Completed;
    const frozen = freezeInstance(inst, mut);
    expect(frozen.state).toBe(WorkflowState.Completed);
  });

  it('preserves original id', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    const mut = cloneMutable(inst);
    const frozen = freezeInstance(inst, mut);
    expect(frozen.id).toBe(inst.id);
  });
});

describe('updateStageState', () => {
  it('updates state', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    const stage = inst.stages.values().next().value!;
    const updated = updateStageState(stage, StageState.Running);
    expect(updated.state).toBe(StageState.Running);
  });

  it('preserves id and name', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    const stage = inst.stages.values().next().value!;
    const updated = updateStageState(stage, StageState.Running);
    expect(updated.id).toBe(stage.id);
    expect(updated.name).toBe(stage.name);
  });

  it('updates input when provided', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    const stage = inst.stages.values().next().value!;
    const updated = updateStageState(stage, StageState.Running, { input: { x: 1 } });
    expect(updated.input).toEqual({ x: 1 });
  });

  it('updates output when provided', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    const stage = inst.stages.values().next().value!;
    const updated = updateStageState(stage, StageState.Completed, { output: { result: 'ok' } });
    expect(updated.output).toEqual({ result: 'ok' });
  });

  it('updates error when provided', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    const stage = inst.stages.values().next().value!;
    const err = Object.freeze({ code: 'E', message: 'm', details: [], occurredAt: new Date().toISOString() as any, attempt: 1, retryable: true });
    const updated = updateStageState(stage, StageState.Failed, { error: err as any });
    expect(updated.error).toBe(err);
  });

  it('updates attempts when provided', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    const stage = inst.stages.values().next().value!;
    const updated = updateStageState(stage, StageState.Running, { attempts: 3 });
    expect(updated.attempts).toBe(3);
  });

  it('freezes the result', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    const stage = inst.stages.values().next().value!;
    const updated = updateStageState(stage, StageState.Running);
    expect(Object.isFrozen(updated)).toBe(true);
  });

  it('keeps original input when not provided', () => {
    const def = makeDefinition();
    const inst = createWorkflowInstance(def, { workflowId: def.id, definitionVersion: def.version });
    const stage = inst.stages.values().next().value!;
    const updated = updateStageState(stage, StageState.Running);
    expect(updated.input).toBe(stage.input);
  });
});

describe('createExecutionRecord', () => {
  it('creates record with Running status', () => {
    const def = makeDefinition();
    const stageId = def.stages[0]!.id;
    const record = createExecutionRecord(stageId, 1, {});
    expect(record.status).toBe(ExecutionStatus.Running);
  });

  it('stores stageId', () => {
    const def = makeDefinition();
    const stageId = def.stages[0]!.id;
    const record = createExecutionRecord(stageId, 1, {});
    expect(record.stageId).toBe(stageId);
  });

  it('stores attempt', () => {
    const def = makeDefinition();
    const stageId = def.stages[0]!.id;
    const record = createExecutionRecord(stageId, 3, {});
    expect(record.attempt).toBe(3);
  });

  it('generates unique ID', () => {
    const def = makeDefinition();
    const stageId = def.stages[0]!.id;
    const r1 = createExecutionRecord(stageId, 1, {});
    const r2 = createExecutionRecord(stageId, 1, {});
    expect(r1.id).not.toBe(r2.id);
  });

  it('has null completedAt', () => {
    const def = makeDefinition();
    const record = createExecutionRecord(def.stages[0]!.id, 1, {});
    expect(record.completedAt).toBeNull();
  });

  it('has null durationMs', () => {
    const def = makeDefinition();
    const record = createExecutionRecord(def.stages[0]!.id, 1, {});
    expect(record.durationMs).toBeNull();
  });

  it('has null error', () => {
    const def = makeDefinition();
    const record = createExecutionRecord(def.stages[0]!.id, 1, {});
    expect(record.error).toBeNull();
  });

  it('stores input', () => {
    const def = makeDefinition();
    const record = createExecutionRecord(def.stages[0]!.id, 1, { key: 'val' });
    expect(record.input).toEqual({ key: 'val' });
  });

  it('has empty output', () => {
    const def = makeDefinition();
    const record = createExecutionRecord(def.stages[0]!.id, 1, {});
    expect(record.output).toEqual({});
  });

  it('is frozen', () => {
    const def = makeDefinition();
    const record = createExecutionRecord(def.stages[0]!.id, 1, {});
    expect(Object.isFrozen(record)).toBe(true);
  });
});

describe('completeExecutionRecord', () => {
  it('sets completedAt', () => {
    const def = makeDefinition();
    const record = createExecutionRecord(def.stages[0]!.id, 1, {});
    const completed = completeExecutionRecord(record, ExecutionStatus.Completed, { out: 1 });
    expect(completed.completedAt).not.toBeNull();
  });

  it('sets status', () => {
    const def = makeDefinition();
    const record = createExecutionRecord(def.stages[0]!.id, 1, {});
    const completed = completeExecutionRecord(record, ExecutionStatus.Failed, {});
    expect(completed.status).toBe(ExecutionStatus.Failed);
  });

  it('sets output', () => {
    const def = makeDefinition();
    const record = createExecutionRecord(def.stages[0]!.id, 1, {});
    const completed = completeExecutionRecord(record, ExecutionStatus.Completed, { result: 'done' });
    expect(completed.output).toEqual({ result: 'done' });
  });

  it('sets error when provided', () => {
    const def = makeDefinition();
    const record = createExecutionRecord(def.stages[0]!.id, 1, {});
    const err = Object.freeze({ code: 'E', message: 'fail', details: [], occurredAt: new Date().toISOString() as any, attempt: 1, retryable: false });
    const completed = completeExecutionRecord(record, ExecutionStatus.Failed, {}, err as any);
    expect(completed.error).toBe(err);
  });

  it('calculates durationMs', () => {
    const def = makeDefinition();
    const record = createExecutionRecord(def.stages[0]!.id, 1, {});
    const completed = completeExecutionRecord(record, ExecutionStatus.Completed, {});
    expect(completed.durationMs).not.toBeNull();
    expect(typeof completed.durationMs).toBe('number');
  });

  it('is frozen', () => {
    const def = makeDefinition();
    const record = createExecutionRecord(def.stages[0]!.id, 1, {});
    const completed = completeExecutionRecord(record, ExecutionStatus.Completed, {});
    expect(Object.isFrozen(completed)).toBe(true);
  });

  it('preserves id and stageId', () => {
    const def = makeDefinition();
    const record = createExecutionRecord(def.stages[0]!.id, 1, {});
    const completed = completeExecutionRecord(record, ExecutionStatus.Completed, {});
    expect(completed.id).toBe(record.id);
    expect(completed.stageId).toBe(record.stageId);
  });
});
