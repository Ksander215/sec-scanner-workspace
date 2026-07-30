/**
 * Workflow Runtime — Error Tests (Comprehensive)
 * TASK-AIS-003H.000
 */
import { describe, it, expect } from 'vitest';
import {
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
} from '../../../core/workflow/workflow-errors.js';

describe('WorkflowError (base)', () => {
  it('should set name to "WorkflowError"', () => {
    const err = new WorkflowError('msg', 'CODE');
    expect(err.name).toBe('WorkflowError');
  });

  it('should set message from constructor', () => {
    const err = new WorkflowError('test message', 'CODE');
    expect(err.message).toBe('test message');
  });

  it('should set code from constructor', () => {
    const err = new WorkflowError('msg', 'TEST_CODE');
    expect(err.code).toBe('TEST_CODE');
  });

  it('should be an instance of Error', () => {
    const err = new WorkflowError('msg', 'CODE');
    expect(err).toBeInstanceOf(Error);
  });

  it('should be an instance of WorkflowError', () => {
    const err = new WorkflowError('msg', 'CODE');
    expect(err).toBeInstanceOf(WorkflowError);
  });

  it('should have a stack trace', () => {
    const err = new WorkflowError('msg', 'CODE');
    expect(err.stack).toBeDefined();
  });
});

describe('WorkflowNotFoundError', () => {
  it('should set name to "WorkflowNotFoundError"', () => {
    const err = new WorkflowNotFoundError('wf-1');
    expect(err.name).toBe('WorkflowNotFoundError');
  });

  it('should set code to WORKFLOW_NOT_FOUND', () => {
    const err = new WorkflowNotFoundError('wf-1');
    expect(err.code).toBe('WORKFLOW_NOT_FOUND');
  });

  it('should store workflowId', () => {
    const err = new WorkflowNotFoundError('wf-123');
    expect(err.workflowId).toBe('wf-123');
  });

  it('should include workflowId in message', () => {
    const err = new WorkflowNotFoundError('wf-abc');
    expect(err.message).toContain('wf-abc');
  });

  it('should include "not found" in message', () => {
    const err = new WorkflowNotFoundError('wf-1');
    expect(err.message).toContain('not found');
  });

  it('should extend WorkflowError', () => {
    const err = new WorkflowNotFoundError('wf-1');
    expect(err).toBeInstanceOf(WorkflowError);
  });

  it('should handle empty string workflowId', () => {
    const err = new WorkflowNotFoundError('');
    expect(err.workflowId).toBe('');
    expect(err.code).toBe('WORKFLOW_NOT_FOUND');
  });
});

describe('WorkflowInstanceNotFoundError', () => {
  it('should set name to "WorkflowInstanceNotFoundError"', () => {
    const err = new WorkflowInstanceNotFoundError('inst-1');
    expect(err.name).toBe('WorkflowInstanceNotFoundError');
  });

  it('should set code to WORKFLOW_INSTANCE_NOT_FOUND', () => {
    const err = new WorkflowInstanceNotFoundError('inst-1');
    expect(err.code).toBe('WORKFLOW_INSTANCE_NOT_FOUND');
  });

  it('should store instanceId', () => {
    const err = new WorkflowInstanceNotFoundError('inst-xyz');
    expect(err.instanceId).toBe('inst-xyz');
  });

  it('should include instanceId in message', () => {
    const err = new WorkflowInstanceNotFoundError('inst-abc');
    expect(err.message).toContain('inst-abc');
  });

  it('should extend WorkflowError', () => {
    const err = new WorkflowInstanceNotFoundError('x');
    expect(err).toBeInstanceOf(WorkflowError);
  });
});

describe('WorkflowDuplicateError', () => {
  it('should set name to "WorkflowDuplicateError"', () => {
    const err = new WorkflowDuplicateError('MyFlow');
    expect(err.name).toBe('WorkflowDuplicateError');
  });

  it('should set code to WORKFLOW_DUPLICATE', () => {
    const err = new WorkflowDuplicateError('MyFlow');
    expect(err.code).toBe('WORKFLOW_DUPLICATE');
  });

  it('should store workflowName', () => {
    const err = new WorkflowDuplicateError('TestWorkflow');
    expect(err.workflowName).toBe('TestWorkflow');
  });

  it('should include workflow name in message', () => {
    const err = new WorkflowDuplicateError('MyFlow');
    expect(err.message).toContain('MyFlow');
  });

  it('should mention "already exists" in message', () => {
    const err = new WorkflowDuplicateError('X');
    expect(err.message).toContain('already exists');
  });

  it('should extend WorkflowError', () => {
    const err = new WorkflowDuplicateError('x');
    expect(err).toBeInstanceOf(WorkflowError);
  });
});

describe('WorkflowStateError', () => {
  it('should set name to "WorkflowStateError"', () => {
    const err = new WorkflowStateError('Running', 'Completed', 'wf-1');
    expect(err.name).toBe('WorkflowStateError');
  });

  it('should set code to WORKFLOW_STATE_ERROR', () => {
    const err = new WorkflowStateError('a', 'b');
    expect(err.code).toBe('WORKFLOW_STATE_ERROR');
  });

  it('should store current state', () => {
    const err = new WorkflowStateError('Draft', 'Running');
    expect(err.current).toBe('Draft');
  });

  it('should store target state', () => {
    const err = new WorkflowStateError('Draft', 'Running');
    expect(err.target).toBe('Running');
  });

  it('should store optional workflowId', () => {
    const err = new WorkflowStateError('Running', 'Paused', 'wf-42');
    expect(err.workflowId).toBe('wf-42');
  });

  it('should have undefined workflowId when not provided', () => {
    const err = new WorkflowStateError('Draft', 'Ready');
    expect(err.workflowId).toBeUndefined();
  });

  it('should include both states in message', () => {
    const err = new WorkflowStateError('Running', 'Completed');
    expect(err.message).toContain('Running');
    expect(err.message).toContain('Completed');
  });

  it('should include arrow notation in message', () => {
    const err = new WorkflowStateError('a', 'b');
    expect(err.message).toContain('→');
  });

  it('should include workflowId in message when provided', () => {
    const err = new WorkflowStateError('a', 'b', 'wf-99');
    expect(err.message).toContain('wf-99');
  });

  it('should extend WorkflowError', () => {
    const err = new WorkflowStateError('a', 'b');
    expect(err).toBeInstanceOf(WorkflowError);
  });
});

describe('StageNotFoundError', () => {
  it('should set name to "StageNotFoundError"', () => {
    const err = new StageNotFoundError('s1', 'wf-1');
    expect(err.name).toBe('StageNotFoundError');
  });

  it('should set code to STAGE_NOT_FOUND', () => {
    const err = new StageNotFoundError('s1');
    expect(err.code).toBe('STAGE_NOT_FOUND');
  });

  it('should store stageId', () => {
    const err = new StageNotFoundError('stage-xyz');
    expect(err.stageId).toBe('stage-xyz');
  });

  it('should include stageId in message', () => {
    const err = new StageNotFoundError('s-42');
    expect(err.message).toContain('s-42');
  });

  it('should store optional workflowId', () => {
    const err = new StageNotFoundError('s1', 'wf-abc');
    expect(err.workflowId).toBe('wf-abc');
  });

  it('should have undefined workflowId when not provided', () => {
    const err = new StageNotFoundError('s1');
    expect(err.workflowId).toBeUndefined();
  });

  it('should include workflow in message when provided', () => {
    const err = new StageNotFoundError('s1', 'wf-1');
    expect(err.message).toContain('workflow="wf-1"');
  });
});

describe('StageStateError', () => {
  it('should set name to "StageStateError"', () => {
    const err = new StageStateError('s1', 'Pending', 'Running');
    expect(err.name).toBe('StageStateError');
  });

  it('should set code to STAGE_STATE_ERROR', () => {
    const err = new StageStateError('s1', 'a', 'b');
    expect(err.code).toBe('STAGE_STATE_ERROR');
  });

  it('should store stageId', () => {
    const err = new StageStateError('stage-abc', 'a', 'b');
    expect(err.stageId).toBe('stage-abc');
  });

  it('should store current state', () => {
    const err = new StageStateError('s1', 'Ready', 'Running');
    expect(err.current).toBe('Ready');
  });

  it('should store target state', () => {
    const err = new StageStateError('s1', 'Ready', 'Running');
    expect(err.target).toBe('Running');
  });

  it('should include stage name in message', () => {
    const err = new StageStateError('my-stage', 'a', 'b');
    expect(err.message).toContain('my-stage');
  });

  it('should include state transition in message', () => {
    const err = new StageStateError('s1', 'Pending', 'Completed');
    expect(err.message).toContain('Pending');
    expect(err.message).toContain('Completed');
  });
});

describe('StageExecutionError', () => {
  it('should set name to "StageExecutionError"', () => {
    const err = new StageExecutionError('s1', 1, 'msg', true);
    expect(err.name).toBe('StageExecutionError');
  });

  it('should set code to STAGE_EXECUTION_ERROR', () => {
    const err = new StageExecutionError('s1', 1, 'msg', true);
    expect(err.code).toBe('STAGE_EXECUTION_ERROR');
  });

  it('should store stageId', () => {
    const err = new StageExecutionError('stage-abc', 1, 'msg', false);
    expect(err.stageId).toBe('stage-abc');
  });

  it('should store attempt number', () => {
    const err = new StageExecutionError('s1', 5, 'msg', true);
    expect(err.attempt).toBe(5);
  });

  it('should store retryable flag as true', () => {
    const err = new StageExecutionError('s1', 1, 'msg', true);
    expect(err.retryable).toBe(true);
  });

  it('should store retryable flag as false', () => {
    const err = new StageExecutionError('s1', 1, 'msg', false);
    expect(err.retryable).toBe(false);
  });

  it('should store cause when provided', () => {
    const cause = new Error('original error');
    const err = new StageExecutionError('s1', 1, 'msg', true, cause);
    expect(err.cause).toBe(cause);
  });

  it('should have undefined cause when not provided', () => {
    const err = new StageExecutionError('s1', 1, 'msg', true);
    expect(err.cause).toBeUndefined();
  });

  it('should include attempt in message', () => {
    const err = new StageExecutionError('s1', 3, 'msg', true);
    expect(err.message).toContain('attempt=3');
  });

  it('should include message in error message', () => {
    const err = new StageExecutionError('s1', 1, 'timeout exceeded', true);
    expect(err.message).toContain('timeout exceeded');
  });

  it('should include stageId in message', () => {
    const err = new StageExecutionError('my-stage', 1, 'fail', true);
    expect(err.message).toContain('my-stage');
  });
});

describe('WorkflowTimeoutError', () => {
  it('should set name to "WorkflowTimeoutError"', () => {
    const err = new WorkflowTimeoutError(30000);
    expect(err.name).toBe('WorkflowTimeoutError');
  });

  it('should set code to WORKFLOW_TIMEOUT', () => {
    const err = new WorkflowTimeoutError(5000);
    expect(err.code).toBe('WORKFLOW_TIMEOUT');
  });

  it('should store timeoutMs', () => {
    const err = new WorkflowTimeoutError(45000);
    expect(err.timeoutMs).toBe(45000);
  });

  it('should store timeoutMs of zero', () => {
    const err = new WorkflowTimeoutError(0);
    expect(err.timeoutMs).toBe(0);
  });

  it('should store optional stageId', () => {
    const err = new WorkflowTimeoutError(30000, 'stage-abc');
    expect(err.stageId).toBe('stage-abc');
  });

  it('should have undefined stageId when not provided', () => {
    const err = new WorkflowTimeoutError(1000);
    expect(err.stageId).toBeUndefined();
  });

  it('should include timeout value in message', () => {
    const err = new WorkflowTimeoutError(60000);
    expect(err.message).toContain('60000ms');
  });

  it('should include stage in message when provided', () => {
    const err = new WorkflowTimeoutError(30000, 's1');
    expect(err.message).toContain('s1');
  });

  it('should say "exceeded" in message', () => {
    const err = new WorkflowTimeoutError(1000);
    expect(err.message).toContain('exceeded');
  });
});

describe('WorkflowTransitionError', () => {
  it('should set name to "WorkflowTransitionError"', () => {
    const err = new WorkflowTransitionError('a', 'b', 'r');
    expect(err.name).toBe('WorkflowTransitionError');
  });

  it('should set code to WORKFLOW_TRANSITION_ERROR', () => {
    const err = new WorkflowTransitionError('a', 'b', 'r');
    expect(err.code).toBe('WORKFLOW_TRANSITION_ERROR');
  });

  it('should store fromStageId', () => {
    const err = new WorkflowTransitionError('stage-a', 'stage-b', 'reason');
    expect(err.fromStageId).toBe('stage-a');
  });

  it('should store toStageId', () => {
    const err = new WorkflowTransitionError('a', 'stage-b', 'reason');
    expect(err.toStageId).toBe('stage-b');
  });

  it('should store reason', () => {
    const err = new WorkflowTransitionError('a', 'b', 'condition not met');
    expect(err.reason).toBe('condition not met');
  });

  it('should include both stages in message', () => {
    const err = new WorkflowTransitionError('from-stage', 'to-stage', 'r');
    expect(err.message).toContain('from-stage');
    expect(err.message).toContain('to-stage');
  });

  it('should include reason in message', () => {
    const err = new WorkflowTransitionError('a', 'b', 'guard denied');
    expect(err.message).toContain('guard denied');
  });
});

describe('WorkflowGuardError', () => {
  it('should set name to "WorkflowGuardError"', () => {
    const err = new WorkflowGuardError('guard-1', 's1');
    expect(err.name).toBe('WorkflowGuardError');
  });

  it('should set code to WORKFLOW_GUARD_ERROR', () => {
    const err = new WorkflowGuardError('g', 's');
    expect(err.code).toBe('WORKFLOW_GUARD_ERROR');
  });

  it('should store guard name', () => {
    const err = new WorkflowGuardError('auth-check', 's1');
    expect(err.guard).toBe('auth-check');
  });

  it('should store stageId', () => {
    const err = new WorkflowGuardError('g', 'stage-42');
    expect(err.stageId).toBe('stage-42');
  });

  it('should include guard name in message', () => {
    const err = new WorkflowGuardError('my-guard', 's1');
    expect(err.message).toContain('my-guard');
  });

  it('should include "denied" in message', () => {
    const err = new WorkflowGuardError('g', 's');
    expect(err.message).toContain('denied');
  });
});

describe('WorkflowConditionError', () => {
  it('should set name to "WorkflowConditionError"', () => {
    const err = new WorkflowConditionError('c1', 'r');
    expect(err.name).toBe('WorkflowConditionError');
  });

  it('should set code to WORKFLOW_CONDITION_ERROR', () => {
    const err = new WorkflowConditionError('c', 'r');
    expect(err.code).toBe('WORKFLOW_CONDITION_ERROR');
  });

  it('should store condition', () => {
    const err = new WorkflowConditionError('is-approved', 'reason');
    expect(err.condition).toBe('is-approved');
  });

  it('should store reason', () => {
    const err = new WorkflowConditionError('c', 'parse error');
    expect(err.reason).toBe('parse error');
  });

  it('should include condition in message', () => {
    const err = new WorkflowConditionError('my-cond', 'r');
    expect(err.message).toContain('my-cond');
  });

  it('should include reason in message', () => {
    const err = new WorkflowConditionError('c', 'evaluation failed');
    expect(err.message).toContain('evaluation failed');
  });
});

describe('WorkflowCompensationError', () => {
  it('should set name to "WorkflowCompensationError"', () => {
    const err = new WorkflowCompensationError('s1', 'Undo', 'msg');
    expect(err.name).toBe('WorkflowCompensationError');
  });

  it('should set code to WORKFLOW_COMPENSATION_ERROR', () => {
    const err = new WorkflowCompensationError('s', 'a', 'm');
    expect(err.code).toBe('WORKFLOW_COMPENSATION_ERROR');
  });

  it('should store stageId', () => {
    const err = new WorkflowCompensationError('stage-abc', 'Undo', 'm');
    expect(err.stageId).toBe('stage-abc');
  });

  it('should store action', () => {
    const err = new WorkflowCompensationError('s1', 'Retry', 'm');
    expect(err.action).toBe('Retry');
  });

  it('should include stageId and action in message', () => {
    const err = new WorkflowCompensationError('s1', 'Undo', 'handler failed');
    expect(err.message).toContain('s1');
    expect(err.message).toContain('Undo');
    expect(err.message).toContain('handler failed');
  });
});

describe('WorkflowVariableError', () => {
  it('should set name to "WorkflowVariableError"', () => {
    const err = new WorkflowVariableError('Global', 'key1', 'not found');
    expect(err.name).toBe('WorkflowVariableError');
  });

  it('should set code to WORKFLOW_VARIABLE_ERROR', () => {
    const err = new WorkflowVariableError('s', 'k', 'r');
    expect(err.code).toBe('WORKFLOW_VARIABLE_ERROR');
  });

  it('should store scope', () => {
    const err = new WorkflowVariableError('Stage', 'k', 'r');
    expect(err.scope).toBe('Stage');
  });

  it('should store key', () => {
    const err = new WorkflowVariableError('s', 'my-var', 'r');
    expect(err.key).toBe('my-var');
  });

  it('should include scope and key in message', () => {
    const err = new WorkflowVariableError('Global', 'counter', 'undefined');
    expect(err.message).toContain('Global');
    expect(err.message).toContain('counter');
  });

  it('should include reason in message', () => {
    const err = new WorkflowVariableError('s', 'k', 'type mismatch');
    expect(err.message).toContain('type mismatch');
  });
});

describe('WorkflowRecoveryError', () => {
  it('should set name to "WorkflowRecoveryError"', () => {
    const err = new WorkflowRecoveryError('i', 'r');
    expect(err.name).toBe('WorkflowRecoveryError');
  });

  it('should set code to WORKFLOW_RECOVERY_ERROR', () => {
    const err = new WorkflowRecoveryError('i', 'r');
    expect(err.code).toBe('WORKFLOW_RECOVERY_ERROR');
  });

  it('should store instanceId', () => {
    const err = new WorkflowRecoveryError('inst-xyz', 'reason');
    expect(err.instanceId).toBe('inst-xyz');
  });

  it('should include instanceId in message', () => {
    const err = new WorkflowRecoveryError('inst-1', 'no checkpoint');
    expect(err.message).toContain('inst-1');
  });

  it('should include reason in message', () => {
    const err = new WorkflowRecoveryError('i', 'checkpoint corrupted');
    expect(err.message).toContain('checkpoint corrupted');
  });
});

describe('WorkflowVersionError', () => {
  it('should set name to "WorkflowVersionError"', () => {
    const err = new WorkflowVersionError('1.0.0', '2.0.0', 'r');
    expect(err.name).toBe('WorkflowVersionError');
  });

  it('should set code to WORKFLOW_VERSION_ERROR', () => {
    const err = new WorkflowVersionError('1', '2', 'r');
    expect(err.code).toBe('WORKFLOW_VERSION_ERROR');
  });

  it('should store current version', () => {
    const err = new WorkflowVersionError('1.0.0', '2.0.0', 'r');
    expect(err.current).toBe('1.0.0');
  });

  it('should store target version', () => {
    const err = new WorkflowVersionError('1.0.0', '2.0.0', 'r');
    expect(err.target).toBe('2.0.0');
  });

  it('should include both versions in message', () => {
    const err = new WorkflowVersionError('1.0.0', '3.0.0', 'incompatible');
    expect(err.message).toContain('1.0.0');
    expect(err.message).toContain('3.0.0');
  });

  it('should include arrow in message', () => {
    const err = new WorkflowVersionError('a', 'b', 'r');
    expect(err.message).toContain('→');
  });
});

describe('WorkflowPolicyViolationError', () => {
  it('should set name to "WorkflowPolicyViolationError"', () => {
    const err = new WorkflowPolicyViolationError('p', ['d']);
    expect(err.name).toBe('WorkflowPolicyViolationError');
  });

  it('should set code to WORKFLOW_POLICY_VIOLATION', () => {
    const err = new WorkflowPolicyViolationError('p', ['d']);
    expect(err.code).toBe('WORKFLOW_POLICY_VIOLATION');
  });

  it('should store policyName', () => {
    const err = new WorkflowPolicyViolationError('timeout-policy', []);
    expect(err.policyName).toBe('timeout-policy');
  });

  it('should store details as readonly array', () => {
    const details = ['exceeded 30s', 'no retry left'];
    const err = new WorkflowPolicyViolationError('p', details);
    expect(err.details).toEqual(details);
  });

  it('should handle empty details array', () => {
    const err = new WorkflowPolicyViolationError('p', []);
    expect(err.details).toEqual([]);
  });

  it('should include policyName in message', () => {
    const err = new WorkflowPolicyViolationError('my-policy', ['issue']);
    expect(err.message).toContain('my-policy');
  });

  it('should include details in message', () => {
    const err = new WorkflowPolicyViolationError('p', ['detail-1', 'detail-2']);
    expect(err.message).toContain('detail-1');
    expect(err.message).toContain('detail-2');
  });
});

describe('WorkflowHandlerNotFoundError', () => {
  it('should set name to "WorkflowHandlerNotFoundError"', () => {
    const err = new WorkflowHandlerNotFoundError('h');
    expect(err.name).toBe('WorkflowHandlerNotFoundError');
  });

  it('should set code to WORKFLOW_HANDLER_NOT_FOUND', () => {
    const err = new WorkflowHandlerNotFoundError('h');
    expect(err.code).toBe('WORKFLOW_HANDLER_NOT_FOUND');
  });

  it('should store handlerName', () => {
    const err = new WorkflowHandlerNotFoundError('my-handler');
    expect(err.handlerName).toBe('my-handler');
  });

  it('should include handlerName in message', () => {
    const err = new WorkflowHandlerNotFoundError('custom-handler');
    expect(err.message).toContain('custom-handler');
  });
});

describe('WorkflowDisposedError', () => {
  it('should set name to "WorkflowDisposedError"', () => {
    const err = new WorkflowDisposedError();
    expect(err.name).toBe('WorkflowDisposedError');
  });

  it('should set code to WORKFLOW_DISPOSED', () => {
    const err = new WorkflowDisposedError();
    expect(err.code).toBe('WORKFLOW_DISPOSED');
  });

  it('should have a fixed message', () => {
    const err = new WorkflowDisposedError();
    expect(err.message).toContain('disposed');
  });

  it('should extend WorkflowError', () => {
    const err = new WorkflowDisposedError();
    expect(err).toBeInstanceOf(WorkflowError);
  });
});

describe('WorkflowValidationError', () => {
  it('should set name to "WorkflowValidationError"', () => {
    const err = new WorkflowValidationError(['issue']);
    expect(err.name).toBe('WorkflowValidationError');
  });

  it('should set code to WORKFLOW_VALIDATION_ERROR', () => {
    const err = new WorkflowValidationError([]);
    expect(err.code).toBe('WORKFLOW_VALIDATION_ERROR');
  });

  it('should store issues array', () => {
    const issues = ['name required', 'no stages', 'invalid transition'];
    const err = new WorkflowValidationError(issues);
    expect(err.issues).toEqual(issues);
  });

  it('should handle empty issues array', () => {
    const err = new WorkflowValidationError([]);
    expect(err.issues).toEqual([]);
  });

  it('should include issues in message', () => {
    const err = new WorkflowValidationError(['name is empty', 'missing stages']);
    expect(err.message).toContain('name is empty');
    expect(err.message).toContain('missing stages');
  });

  it('should join issues with semicolons in message', () => {
    const err = new WorkflowValidationError(['a', 'b', 'c']);
    expect(err.message).toContain('a; b; c');
  });
});

describe('WorkflowCheckpointError', () => {
  it('should set name to "WorkflowCheckpointError"', () => {
    const err = new WorkflowCheckpointError('i', 'r');
    expect(err.name).toBe('WorkflowCheckpointError');
  });

  it('should set code to WORKFLOW_CHECKPOINT_ERROR', () => {
    const err = new WorkflowCheckpointError('i', 'r');
    expect(err.code).toBe('WORKFLOW_CHECKPOINT_ERROR');
  });

  it('should store instanceId', () => {
    const err = new WorkflowCheckpointError('inst-abc', 'save failed');
    expect(err.instanceId).toBe('inst-abc');
  });

  it('should include instanceId in message', () => {
    const err = new WorkflowCheckpointError('inst-1', 'r');
    expect(err.message).toContain('inst-1');
  });

  it('should include reason in message', () => {
    const err = new WorkflowCheckpointError('i', 'storage unavailable');
    expect(err.message).toContain('storage unavailable');
  });
});

describe('WorkflowSchedulerError', () => {
  it('should set name to "WorkflowSchedulerError"', () => {
    const err = new WorkflowSchedulerError('s', 'r');
    expect(err.name).toBe('WorkflowSchedulerError');
  });

  it('should set code to WORKFLOW_SCHEDULER_ERROR', () => {
    const err = new WorkflowSchedulerError('s', 'r');
    expect(err.code).toBe('WORKFLOW_SCHEDULER_ERROR');
  });

  it('should store stageId', () => {
    const err = new WorkflowSchedulerError('stage-xyz', 'cyclic');
    expect(err.stageId).toBe('stage-xyz');
  });

  it('should store reason', () => {
    const err = new WorkflowSchedulerError('s', 'cyclic dependency detected');
    expect(err.reason).toBe('cyclic dependency detected');
  });

  it('should include stageId in message', () => {
    const err = new WorkflowSchedulerError('s-1', 'r');
    expect(err.message).toContain('s-1');
  });

  it('should include reason in message', () => {
    const err = new WorkflowSchedulerError('s', 'no valid plan');
    expect(err.message).toContain('no valid plan');
  });
});

describe('Error hierarchy — all extend WorkflowError and Error', () => {
  const errorClasses = [
    { Ctor: WorkflowNotFoundError, args: ['x'] },
    { Ctor: WorkflowInstanceNotFoundError, args: ['x'] },
    { Ctor: WorkflowDuplicateError, args: ['x'] },
    { Ctor: WorkflowStateError, args: ['a', 'b'] },
    { Ctor: StageNotFoundError, args: ['x'] },
    { Ctor: StageStateError, args: ['x', 'a', 'b'] },
    { Ctor: StageExecutionError, args: ['x', 1, 'e', true] },
    { Ctor: WorkflowTimeoutError, args: [1000] },
    { Ctor: WorkflowTransitionError, args: ['a', 'b', 'r'] },
    { Ctor: WorkflowGuardError, args: ['g', 's'] },
    { Ctor: WorkflowConditionError, args: ['c', 'r'] },
    { Ctor: WorkflowCompensationError, args: ['s', 'a', 'm'] },
    { Ctor: WorkflowVariableError, args: ['s', 'k', 'r'] },
    { Ctor: WorkflowRecoveryError, args: ['i', 'r'] },
    { Ctor: WorkflowVersionError, args: ['1', '2', 'r'] },
    { Ctor: WorkflowPolicyViolationError, args: ['p', ['d']] },
    { Ctor: WorkflowHandlerNotFoundError, args: ['h'] },
    { Ctor: WorkflowDisposedError, args: [] },
    { Ctor: WorkflowValidationError, args: [['issue']] },
    { Ctor: WorkflowCheckpointError, args: ['i', 'r'] },
    { Ctor: WorkflowSchedulerError, args: ['s', 'r'] },
  ];

  for (const { Ctor, args } of errorClasses) {
    it(`${Ctor.name} extends WorkflowError`, () => {
      const err = new (Ctor as any)(...args);
      expect(err).toBeInstanceOf(WorkflowError);
    });

    it(`${Ctor.name} extends Error`, () => {
      const err = new (Ctor as any)(...args);
      expect(err).toBeInstanceOf(Error);
    });

    it(`${Ctor.name} has 'code' property`, () => {
      const err = new (Ctor as any)(...args);
      expect(typeof err.code).toBe('string');
      expect(err.code.length).toBeGreaterThan(0);
    });
  }
});
