import { describe, it, expect } from 'vitest';
import {
  ExecutionError,
  PlanningError,
  TaskExecutionError,
  TaskTimeoutError,
  TaskCancelledError,
  SchedulerError,
  InvalidTransitionError,
  PipelineAbortedError,
  EscalationError,
  toTaskError,
} from '../core/pipeline/errors.js';

describe('ExecutionError', () => {
  it('has code, message, retryable', () => {
    const err = new ExecutionError('CODE', 'msg', true);
    expect(err.code).toBe('CODE');
    expect(err.message).toBe('msg');
    expect(err.retryable).toBe(true);
    expect(err.name).toBe('ExecutionError');
  });

  it('defaults retryable to false', () => {
    const err = new ExecutionError('C', 'm');
    expect(err.retryable).toBe(false);
  });

  it('toTaskError converts to struct', () => {
    const err = new ExecutionError('E001', 'test error', true, { extra: 1 });
    const te = err.toTaskError();
    expect(te.code).toBe('E001');
    expect(te.message).toBe('test error');
    expect(te.retryable).toBe(true);
    expect(te.stack).toBeDefined();
    expect(te.cause).toEqual({ extra: 1 });
  });
});

describe('PlanningError', () => {
  it('is not retryable', () => {
    const err = new PlanningError('bad goal');
    expect(err.code).toBe('PLANNING_ERROR');
    expect(err.retryable).toBe(false);
    expect(err.name).toBe('PlanningError');
  });

  it('carries cause', () => {
    const cause = new Error('root cause');
    const err = new PlanningError('failed', cause);
    expect(err.cause).toBe(cause);
  });
});

describe('TaskExecutionError', () => {
  it('carries taskId, stepId, attempt', () => {
    const err = new TaskExecutionError('task-1', 'step-1', 2, 'failed', true);
    expect(err.code).toBe('TASK_EXECUTION_ERROR');
    expect(err.taskId).toBe('task-1');
    expect(err.stepId).toBe('step-1');
    expect(err.attempt).toBe(2);
    expect(err.retryable).toBe(true);
  });

  it('toTaskError includes task metadata', () => {
    const err = new TaskExecutionError('t1', 's1', 1, 'fail', false);
    const te = err.toTaskError();
    expect(te.code).toBe('TASK_EXECUTION_ERROR');
  });
});

describe('TaskTimeoutError', () => {
  it('is retryable by default', () => {
    const err = new TaskTimeoutError('task-1', 5000);
    expect(err.code).toBe('TASK_TIMEOUT');
    expect(err.retryable).toBe(true);
    expect(err.taskId).toBe('task-1');
    expect(err.timeoutMs).toBe(5000);
    expect(err.name).toBe('TaskTimeoutError');
  });
});

describe('TaskCancelledError', () => {
  it('is not retryable', () => {
    const err = new TaskCancelledError('task-1', 'user cancelled');
    expect(err.code).toBe('TASK_CANCELLED');
    expect(err.retryable).toBe(false);
    expect(err.taskId).toBe('task-1');
  });

  it('works without reason', () => {
    const err = new TaskCancelledError('task-2');
    expect(err.message).toContain('cancelled');
    expect(err.message).not.toContain(':');
  });
});

describe('SchedulerError', () => {
  it('is not retryable', () => {
    const err = new SchedulerError('queue full');
    expect(err.code).toBe('SCHEDULER_ERROR');
    expect(err.retryable).toBe(false);
  });
});

describe('InvalidTransitionError', () => {
  it('carries from and to states', () => {
    const err = new InvalidTransitionError('A', 'C');
    expect(err.code).toBe('INVALID_TRANSITION');
    expect(err.fromState).toBe('A');
    expect(err.toState).toBe('C');
  });
});

describe('PipelineAbortedError', () => {
  it('carries optional failedTaskId', () => {
    const err1 = new PipelineAbortedError('aborted');
    expect(err1.code).toBe('PIPELINE_ABORTED');
    expect(err1.failedTaskId).toBeUndefined();

    const err2 = new PipelineAbortedError('task failed', 'task-1');
    expect(err2.failedTaskId).toBe('task-1');
  });
});

describe('EscalationError', () => {
  it('wraps original error', () => {
    const original = new TaskExecutionError('t', 's', 1, 'fail', false);
    const escalation = new EscalationError(original, 'escalated to caller');
    expect(escalation.code).toBe('ESCALATION');
    expect(escalation.originalError).toBe(original);
    expect(escalation.cause).toBe(original);
  });
});

describe('toTaskError', () => {
  it('converts ExecutionError instances', () => {
    const err = new ExecutionError('E', 'msg', true);
    const te = toTaskError(err);
    expect(te.code).toBe('E');
    expect(te.retryable).toBe(true);
  });

  it('converts Error instances', () => {
    const err = new Error('generic');
    const te = toTaskError(err);
    expect(te.code).toBe('UNKNOWN_ERROR');
    expect(te.message).toBe('generic');
    expect(te.retryable).toBe(false);
  });

  it('converts string errors', () => {
    const te = toTaskError('string error');
    expect(te.code).toBe('UNKNOWN_ERROR');
    expect(te.message).toBe('string error');
  });

  it('converts null/undefined errors', () => {
    const te = toTaskError(null);
    expect(te.code).toBe('UNKNOWN_ERROR');
    expect(te.message).toBe('An unknown error occurred');
  });
});
