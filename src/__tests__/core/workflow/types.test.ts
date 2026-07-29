/**
 * Workflow Runtime — Types Tests
 * TASK-AIS-003H.000
 */
import { describe, it, expect } from 'vitest';
import {
  brandWorkflowId,
  brandWorkflowInstanceId,
  brandWorkflowVersionId,
  brandStageId,
  brandExecutionId,
  brandTransitionId,
  brandVariableScopeId,
  brandCheckpointId,
  brandTraceEntryId,
} from '../../../core/workflow/types.js';
import {
  WorkflowState,
  StageState,
  StageType,
  CompensationAction,
  VariableScope,
  ExecutionMode,
  ExecutionStatus,
  PolicyType,
  TraceLevel,
  CompensationStatus,
} from '../../../core/workflow/types.js';

describe('Branded ID functions', () => {
  it('brandWorkflowId returns the input string branded', () => {
    const id = 'wf-001';
    const branded = brandWorkflowId(id);
    expect(branded).toBe(id);
  });

  it('brandWorkflowInstanceId returns the input string branded', () => {
    const id = 'inst-001';
    const branded = brandWorkflowInstanceId(id);
    expect(branded).toBe(id);
  });

  it('brandWorkflowVersionId returns the input string branded', () => {
    const id = 'ver-001';
    const branded = brandWorkflowVersionId(id);
    expect(branded).toBe(id);
  });

  it('brandStageId returns the input string branded', () => {
    const id = 'stage-001';
    const branded = brandStageId(id);
    expect(branded).toBe(id);
  });

  it('brandExecutionId returns the input string branded', () => {
    const id = 'exec-001';
    const branded = brandExecutionId(id);
    expect(branded).toBe(id);
  });

  it('brandTransitionId returns the input string branded', () => {
    const id = 'trans-001';
    const branded = brandTransitionId(id);
    expect(branded).toBe(id);
  });

  it('brandVariableScopeId returns the input string branded', () => {
    const id = 'scope-001';
    const branded = brandVariableScopeId(id);
    expect(branded).toBe(id);
  });

  it('brandCheckpointId returns the input string branded', () => {
    const id = 'cp-001';
    const branded = brandCheckpointId(id);
    expect(branded).toBe(id);
  });

  it('brandTraceEntryId returns the input string branded', () => {
    const id = 'trace-001';
    const branded = brandTraceEntryId(id);
    expect(branded).toBe(id);
  });

  it('all brand functions handle UUID format', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(brandWorkflowId(uuid)).toBe(uuid);
    expect(brandWorkflowInstanceId(uuid)).toBe(uuid);
    expect(brandStageId(uuid)).toBe(uuid);
  });
});

describe('WorkflowState enum', () => {
  it('has Draft value', () => {
    expect(WorkflowState.Draft).toBe('Draft');
  });

  it('has Ready value', () => {
    expect(WorkflowState.Ready).toBe('Ready');
  });

  it('has Running value', () => {
    expect(WorkflowState.Running).toBe('Running');
  });

  it('has Paused value', () => {
    expect(WorkflowState.Paused).toBe('Paused');
  });

  it('has Completed value', () => {
    expect(WorkflowState.Completed).toBe('Completed');
  });

  it('has Failed value', () => {
    expect(WorkflowState.Failed).toBe('Failed');
  });

  it('has Cancelled value', () => {
    expect(WorkflowState.Cancelled).toBe('Cancelled');
  });

  it('has exactly 7 values', () => {
    expect(Object.keys(WorkflowState).length).toBe(7);
  });
});

describe('StageState enum', () => {
  it('has all expected states', () => {
    expect(StageState.Pending).toBe('Pending');
    expect(StageState.Ready).toBe('Ready');
    expect(StageState.Running).toBe('Running');
    expect(StageState.Paused).toBe('Paused');
    expect(StageState.Completed).toBe('Completed');
    expect(StageState.Failed).toBe('Failed');
    expect(StageState.Skipped).toBe('Skipped');
    expect(StageState.Cancelled).toBe('Cancelled');
  });

  it('has exactly 8 values', () => {
    expect(Object.keys(StageState).length).toBe(8);
  });
});

describe('StageType enum', () => {
  it('has Sequential', () => {
    expect(StageType.Sequential).toBe('Sequential');
  });

  it('has Parallel', () => {
    expect(StageType.Parallel).toBe('Parallel');
  });

  it('has Conditional', () => {
    expect(StageType.Conditional).toBe('Conditional');
  });

  it('has Delayed', () => {
    expect(StageType.Delayed).toBe('Delayed');
  });

  it('has EventDriven', () => {
    expect(StageType.EventDriven).toBe('EventDriven');
  });

  it('has exactly 5 values', () => {
    expect(Object.keys(StageType).length).toBe(5);
  });
});

describe('CompensationAction enum', () => {
  it('has Undo', () => {
    expect(CompensationAction.Undo).toBe('Undo');
  });

  it('has Retry', () => {
    expect(CompensationAction.Retry).toBe('Retry');
  });

  it('has Skip', () => {
    expect(CompensationAction.Skip).toBe('Skip');
  });

  it('has Restart', () => {
    expect(CompensationAction.Restart).toBe('Restart');
  });

  it('has Abort', () => {
    expect(CompensationAction.Abort).toBe('Abort');
  });

  it('has exactly 5 values', () => {
    expect(Object.keys(CompensationAction).length).toBe(5);
  });
});

describe('VariableScope enum', () => {
  it('has all 5 scopes', () => {
    expect(VariableScope.Global).toBe('Global');
    expect(VariableScope.Stage).toBe('Stage');
    expect(VariableScope.Execution).toBe('Execution');
    expect(VariableScope.Temporary).toBe('Temporary');
    expect(VariableScope.Output).toBe('Output');
  });

  it('has exactly 5 values', () => {
    expect(Object.keys(VariableScope).length).toBe(5);
  });
});

describe('ExecutionMode enum', () => {
  it('has all 5 modes matching StageType', () => {
    expect(ExecutionMode.Sequential).toBe('Sequential');
    expect(ExecutionMode.Parallel).toBe('Parallel');
    expect(ExecutionMode.Conditional).toBe('Conditional');
    expect(ExecutionMode.Delayed).toBe('Delayed');
    expect(ExecutionMode.EventDriven).toBe('EventDriven');
  });
});

describe('ExecutionStatus enum', () => {
  it('has all expected statuses', () => {
    expect(ExecutionStatus.Pending).toBe('Pending');
    expect(ExecutionStatus.Running).toBe('Running');
    expect(ExecutionStatus.Completed).toBe('Completed');
    expect(ExecutionStatus.Failed).toBe('Failed');
    expect(ExecutionStatus.Cancelled).toBe('Cancelled');
  });
});

describe('PolicyType enum', () => {
  it('has Timeout', () => {
    expect(PolicyType.Timeout).toBe('Timeout');
  });

  it('has Retry', () => {
    expect(PolicyType.Retry).toBe('Retry');
  });

  it('has Parallelism', () => {
    expect(PolicyType.Parallelism).toBe('Parallelism');
  });

  it('has Security', () => {
    expect(PolicyType.Security).toBe('Security');
  });

  it('has ResourceLimit', () => {
    expect(PolicyType.ResourceLimit).toBe('ResourceLimit');
  });

  it('has exactly 5 values', () => {
    expect(Object.keys(PolicyType).length).toBe(5);
  });
});

describe('TraceLevel enum', () => {
  it('has Debug, Info, Warn, Error', () => {
    expect(TraceLevel.Debug).toBe('Debug');
    expect(TraceLevel.Info).toBe('Info');
    expect(TraceLevel.Warn).toBe('Warn');
    expect(TraceLevel.Error).toBe('Error');
  });

  it('has exactly 4 values', () => {
    expect(Object.keys(TraceLevel).length).toBe(4);
  });
});

describe('CompensationStatus enum', () => {
  it('has all expected statuses', () => {
    expect(CompensationStatus.Pending).toBe('Pending');
    expect(CompensationStatus.Running).toBe('Running');
    expect(CompensationStatus.Completed).toBe('Completed');
    expect(CompensationStatus.Failed).toBe('Failed');
    expect(CompensationStatus.Skipped).toBe('Skipped');
  });

  it('has exactly 5 values', () => {
    expect(Object.keys(CompensationStatus).length).toBe(5);
  });
});
