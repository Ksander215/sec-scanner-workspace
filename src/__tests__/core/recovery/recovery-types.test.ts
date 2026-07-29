/**
 * Recovery Types Tests
 *
 * Tests for RecoveryStatus enum, RecoveryStep, RestoredState,
 * and SerializableRecoveryPlan interfaces.
 */
import { describe, it, expect } from 'vitest';
import {
  RecoveryStatus,
  type RecoveryStep,
  type RestoredState,
  type RecoveryPlan,
  type SerializableRecoveryPlan,
  type RecoveryId,
} from '../../../core/recovery/types.js';

describe('RecoveryTypes', () => {
  // RecoveryStatus enum
  it('RecoveryStatus has Pending value', () => {
    expect(RecoveryStatus.Pending).toBe('Pending');
  });
  it('RecoveryStatus has RestoringSession value', () => {
    expect(RecoveryStatus.RestoringSession).toBe('RestoringSession');
  });
  it('RecoveryStatus has RestoringMemory value', () => {
    expect(RecoveryStatus.RestoringMemory).toBe('RestoringMemory');
  });
  it('RecoveryStatus has RestoringPipeline value', () => {
    expect(RecoveryStatus.RestoringPipeline).toBe('RestoringPipeline');
  });
  it('RecoveryStatus has Ready value', () => {
    expect(RecoveryStatus.Ready).toBe('Ready');
  });
  it('RecoveryStatus has Failed value', () => {
    expect(RecoveryStatus.Failed).toBe('Failed');
  });
  it('RecoveryStatus has Completed value', () => {
    expect(RecoveryStatus.Completed).toBe('Completed');
  });
  it('RecoveryStatus enum has all 7 values', () => {
    const values = Object.values(RecoveryStatus);
    expect(values.length).toBe(7);
  });

  // RecoveryStep interface
  it('RecoveryStep has required fields', () => {
    const step: RecoveryStep = {
      name: 'test-step',
      description: 'A test step',
      status: 'pending',
    };
    expect(step.name).toBe('test-step');
    expect(step.description).toBe('A test step');
    expect(step.status).toBe('pending');
    expect(step.startedAt).toBe(undefined);
    expect(step.completedAt).toBe(undefined);
    expect(step.error).toBe(undefined);
  });

  // RestoredState interface
  it('RestoredState has required fields', () => {
    const state: RestoredState = {
      executionId: 'exec-1',
      goalId: 'goal-1',
      executionState: 'Ready',
      variables: Object.freeze({}),
      completedSteps: Object.freeze(['step-1']),
      pendingSteps: Object.freeze(['step-2']),
    };
    expect(state.executionId).toBe('exec-1');
    expect(state.goalId).toBe('goal-1');
    expect(state.executionState).toBe('Ready');
    expect(state.completedSteps.length).toBe(1);
    expect(state.pendingSteps.length).toBe(1);
    expect(state.sessionId).toBe(undefined);
  });

  // SerializableRecoveryPlan matches RecoveryPlan structure
  it('SerializableRecoveryPlan matches RecoveryPlan structure', () => {
    const step: RecoveryStep = {
      name: 'load-session',
      description: 'Load session',
      status: 'completed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    const serializable: SerializableRecoveryPlan = {
      recoveryId: 'rec-123',
      executionId: 'exec-1',
      sessionId: 'sess-1',
      checkpointId: 'cp-1',
      status: RecoveryStatus.Ready,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      steps: Object.freeze([step]),
      currentStepIndex: 0,
      restoredState: {
        executionId: 'exec-1',
        goalId: '',
        executionState: 'Ready',
        variables: {},
        completedSteps: ['load-session'],
        pendingSteps: [],
        sessionId: 'sess-1',
      },
    };
    // Verify all fields exist and are typed correctly
    expect(serializable.recoveryId).not.toBeNull();
    expect(serializable.executionId).not.toBeNull();
    expect(serializable.status).not.toBeNull();
    expect(serializable.createdAt).not.toBeNull();
    expect(serializable.steps).not.toBeNull();
    expect(typeof serializable.currentStepIndex).toBe('number');
  });
});
