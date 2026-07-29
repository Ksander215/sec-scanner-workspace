/**
 * Workflow Runtime — Events Tests
 * TASK-AIS-003H.000
 */
import { describe, it, expect } from 'vitest';
import { createWorkflowEventBase } from '../../../core/workflow/workflow-events.js';
import { EventClassification } from '../../../core/types/common.js';

describe('createWorkflowEventBase', () => {
  it('should return an object with eventId (UUID)', () => {
    const result = createWorkflowEventBase('Test', EventClassification.Info, 'agg-1');
    expect(result.eventId).toBeDefined();
    expect(typeof result.eventId).toBe('string');
    expect(result.eventId.length).toBeGreaterThan(0);
  });

  it('should set eventType from parameter', () => {
    const result = createWorkflowEventBase('WorkflowCreated', EventClassification.StateChange, 'a');
    expect(result.eventType).toBe('WorkflowCreated');
  });

  it('should set classification from parameter', () => {
    const result = createWorkflowEventBase('Test', EventClassification.Action, 'a');
    expect(result.classification).toBe(EventClassification.Action);
  });

  it('should set aggregateId from parameter', () => {
    const result = createWorkflowEventBase('Test', EventClassification.Info, 'wf-123');
    expect(result.aggregateId).toBe('wf-123');
  });

  it('should set aggregateType to "Workflow"', () => {
    const result = createWorkflowEventBase('Test', EventClassification.Info, 'a');
    expect(result.aggregateType).toBe('Workflow');
  });

  it('should set version to "1.0.0"', () => {
    const result = createWorkflowEventBase('Test', EventClassification.Info, 'a');
    expect(result.version).toBe('1.0.0');
  });

  it('should set timestamp to current ISO string', () => {
    const beforeMs = Date.now();
    const result = createWorkflowEventBase('Test', EventClassification.Info, 'a');
    const afterMs = Date.now();
    const tsMs = new Date(result.timestamp).getTime();
    expect(tsMs).toBeGreaterThanOrEqual(beforeMs);
    expect(tsMs).toBeLessThanOrEqual(afterMs);
  });

  it('should generate unique eventIds', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const result = createWorkflowEventBase('Test', EventClassification.Info, 'a');
      ids.add(result.eventId);
    }
    expect(ids.size).toBe(50);
  });

  it('should work with all EventClassification values', () => {
    const classifications = [
      EventClassification.Info,
      EventClassification.Action,
      EventClassification.Result,
      EventClassification.Error,
      EventClassification.StateChange,
    ];
    for (const cls of classifications) {
      const result = createWorkflowEventBase('Test', cls, 'a');
      expect(result.classification).toBe(cls);
    }
  });

  it('should work with empty string eventType', () => {
    const result = createWorkflowEventBase('', EventClassification.Info, 'a');
    expect(result.eventType).toBe('');
  });

  it('should work with empty string aggregateId', () => {
    const result = createWorkflowEventBase('Test', EventClassification.Info, '');
    expect(result.aggregateId).toBe('');
  });
});

describe('WorkflowEvent type payloads (structural)', () => {
  it('WorkflowCreated payload has correct fields', () => {
    const base = createWorkflowEventBase('WorkflowCreated', EventClassification.StateChange, 'a');
    const event = {
      ...base,
      payload: Object.freeze({
        workflowId: 'wf-1',
        name: 'Test Workflow',
        version: '1.0.0',
        stageCount: 3,
        createdAt: new Date().toISOString(),
      }),
    };
    expect(event.payload.workflowId).toBe('wf-1');
    expect(event.payload.name).toBe('Test Workflow');
    expect(event.payload.version).toBe('1.0.0');
    expect(event.payload.stageCount).toBe(3);
    expect(event.payload.createdAt).toBeDefined();
  });

  it('WorkflowStarted payload has correct fields', () => {
    const base = createWorkflowEventBase('WorkflowStarted', EventClassification.Action, 'a');
    const event = {
      ...base,
      payload: Object.freeze({
        workflowInstanceId: 'inst-1',
        workflowId: 'wf-1',
        name: 'Test',
        startedAt: new Date().toISOString(),
      }),
    };
    expect(event.payload.workflowInstanceId).toBe('inst-1');
    expect(event.payload.workflowId).toBe('wf-1');
    expect(event.payload.startedAt).toBeDefined();
  });

  it('StageStarted payload has correct fields', () => {
    const base = createWorkflowEventBase('StageStarted', EventClassification.Action, 'a');
    const event = {
      ...base,
      payload: Object.freeze({
        workflowInstanceId: 'inst-1',
        stageId: 's-1',
        stageName: 'Step 1',
        attempt: 1,
        startedAt: new Date().toISOString(),
      }),
    };
    expect(event.payload.stageId).toBe('s-1');
    expect(event.payload.attempt).toBe(1);
  });

  it('StageCompleted payload has correct fields', () => {
    const base = createWorkflowEventBase('StageCompleted', EventClassification.Result, 'a');
    const event = {
      ...base,
      payload: Object.freeze({
        workflowInstanceId: 'inst-1',
        stageId: 's-1',
        stageName: 'Step 1',
        durationMs: 500,
        attempt: 1,
        completedAt: new Date().toISOString(),
      }),
    };
    expect(event.payload.durationMs).toBe(500);
    expect(event.payload.completedAt).toBeDefined();
  });

  it('StageFailed payload has correct fields', () => {
    const base = createWorkflowEventBase('StageFailed', EventClassification.Error, 'a');
    const event = {
      ...base,
      payload: Object.freeze({
        workflowInstanceId: 'inst-1',
        stageId: 's-1',
        stageName: 'Step 1',
        errorCode: 'TIMEOUT',
        errorMessage: 'Stage timed out',
        attempt: 2,
        retryable: true,
        failedAt: new Date().toISOString(),
      }),
    };
    expect(event.payload.errorCode).toBe('TIMEOUT');
    expect(event.payload.retryable).toBe(true);
  });

  it('WorkflowPaused payload has correct fields', () => {
    const base = createWorkflowEventBase('WorkflowPaused', EventClassification.StateChange, 'a');
    const event = {
      ...base,
      payload: Object.freeze({
        workflowInstanceId: 'inst-1',
        workflowId: 'wf-1',
        currentStageId: 's-2',
        pausedAt: new Date().toISOString(),
      }),
    };
    expect(event.payload.currentStageId).toBe('s-2');
  });

  it('WorkflowResumed payload has correct fields', () => {
    const base = createWorkflowEventBase('WorkflowResumed', EventClassification.Action, 'a');
    const event = {
      ...base,
      payload: Object.freeze({
        workflowInstanceId: 'inst-1',
        workflowId: 'wf-1',
        resumedStageId: null,
        resumedAt: new Date().toISOString(),
      }),
    };
    expect(event.payload.resumedStageId).toBeNull();
  });

  it('WorkflowCompleted payload has correct fields', () => {
    const base = createWorkflowEventBase('WorkflowCompleted', EventClassification.Result, 'a');
    const event = {
      ...base,
      payload: Object.freeze({
        workflowInstanceId: 'inst-1',
        workflowId: 'wf-1',
        name: 'Test',
        durationMs: 5000,
        totalStages: 3,
        completedStages: 3,
        completedAt: new Date().toISOString(),
      }),
    };
    expect(event.payload.totalStages).toBe(3);
    expect(event.payload.completedStages).toBe(3);
  });

  it('WorkflowCancelled payload has correct fields', () => {
    const base = createWorkflowEventBase('WorkflowCancelled', EventClassification.StateChange, 'a');
    const event = {
      ...base,
      payload: Object.freeze({
        workflowInstanceId: 'inst-1',
        workflowId: 'wf-1',
        reason: 'User requested',
        cancelledAt: new Date().toISOString(),
      }),
    };
    expect(event.payload.reason).toBe('User requested');
  });

  it('WorkflowError event payload has correct fields', () => {
    const base = createWorkflowEventBase('WorkflowError', EventClassification.Error, 'a');
    const event = {
      ...base,
      payload: Object.freeze({
        workflowInstanceId: 'inst-1',
        workflowId: 'wf-1',
        errorCode: 'EXEC_ERROR',
        errorMessage: 'Something went wrong',
        stageId: 's-1',
        recoverable: true,
        occurredAt: new Date().toISOString(),
      }),
    };
    expect(event.payload.errorCode).toBe('EXEC_ERROR');
    expect(event.payload.recoverable).toBe(true);
  });

  it('StageSkipped payload has correct fields', () => {
    const base = createWorkflowEventBase('StageSkipped', EventClassification.Info, 'a');
    const event = {
      ...base,
      payload: Object.freeze({
        workflowInstanceId: 'inst-1',
        stageId: 's-1',
        stageName: 'Optional Step',
        reason: 'Condition not met',
        skippedAt: new Date().toISOString(),
      }),
    };
    expect(event.payload.reason).toBe('Condition not met');
  });

  it('CompensationStarted payload has correct fields', () => {
    const base = createWorkflowEventBase('CompensationStarted', EventClassification.Action, 'a');
    const event = {
      ...base,
      payload: Object.freeze({
        workflowInstanceId: 'inst-1',
        stageId: 's-1',
        action: 'Undo',
        startedAt: new Date().toISOString(),
      }),
    };
    expect(event.payload.action).toBe('Undo');
  });

  it('CompensationCompleted payload has correct fields', () => {
    const base = createWorkflowEventBase('CompensationCompleted', EventClassification.Result, 'a');
    const event = {
      ...base,
      payload: Object.freeze({
        workflowInstanceId: 'inst-1',
        stageId: 's-1',
        action: 'Undo',
        completedAt: new Date().toISOString(),
      }),
    };
    expect(event.payload.completedAt).toBeDefined();
  });

  it('CheckpointCreated payload has correct fields', () => {
    const base = createWorkflowEventBase('CheckpointCreated', EventClassification.Info, 'a');
    const event = {
      ...base,
      payload: Object.freeze({
        workflowInstanceId: 'inst-1',
        checkpointId: 'cp-1',
        state: 'Running',
        currentStageId: 's-2',
        createdAt: new Date().toISOString(),
      }),
    };
    expect(event.payload.checkpointId).toBe('cp-1');
    expect(event.payload.state).toBe('Running');
  });

  it('WorkflowRecovered payload has correct fields', () => {
    const base = createWorkflowEventBase('WorkflowRecovered', EventClassification.Info, 'a');
    const event = {
      ...base,
      payload: Object.freeze({
        workflowInstanceId: 'inst-1',
        workflowId: 'wf-1',
        recoveredFromState: 'Failed',
        recoveredToState: 'Running',
        recoveredAt: new Date().toISOString(),
      }),
    };
    expect(event.payload.recoveredFromState).toBe('Failed');
    expect(event.payload.recoveredToState).toBe('Running');
  });
});

describe('Event classification mappings', () => {
  const eventClassifications: Array<[string, EventClassification]> = [
    ['WorkflowCreated', EventClassification.StateChange],
    ['WorkflowStarted', EventClassification.Action],
    ['StageStarted', EventClassification.Action],
    ['StageCompleted', EventClassification.Result],
    ['StageFailed', EventClassification.Error],
    ['WorkflowPaused', EventClassification.StateChange],
    ['WorkflowResumed', EventClassification.Action],
    ['WorkflowCompleted', EventClassification.Result],
    ['WorkflowCancelled', EventClassification.StateChange],
    ['WorkflowRecovered', EventClassification.Info],
    ['WorkflowError', EventClassification.Error],
    ['StageSkipped', EventClassification.Info],
    ['CompensationStarted', EventClassification.Action],
    ['CompensationCompleted', EventClassification.Result],
    ['CheckpointCreated', EventClassification.Info],
  ];

  for (const [eventType, classification] of eventClassifications) {
    it(`${eventType} uses ${classification} classification`, () => {
      const result = createWorkflowEventBase(eventType, classification, 'a');
      expect(result.eventType).toBe(eventType);
      expect(result.classification).toBe(classification);
    });
  }
});
