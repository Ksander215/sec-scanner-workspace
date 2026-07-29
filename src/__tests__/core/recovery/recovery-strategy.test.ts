/**
 * Recovery Strategy Tests
 *
 * Tests for FullRecoveryStrategy, MemoryOnlyRecoveryStrategy,
 * and SessionOnlyRecoveryStrategy.
 */
import { describe, it, expect } from 'vitest';
import {
  FullRecoveryStrategy,
  MemoryOnlyRecoveryStrategy,
  SessionOnlyRecoveryStrategy,
} from '../../../core/recovery/recovery-strategy.js';

// ─── Helpers ────────────────────────────────────────────────

function createMockCheckpoint() {
  return {
    checkpointId: 'cp-123',
    executionId: 'exec-1',
    goalId: 'goal-1',
    stage: 'step-completed',
    status: 'valid' as const,
    createdAt: new Date().toISOString(),
    executionState: 'Running',
    variables: { key: 'value' },
    completedSteps: ['step-1'],
    pendingSteps: ['step-2'],
  };
}

// ─── Tests ──────────────────────────────────────────────────

describe('RecoveryStrategy', () => {
  // FullRecoveryStrategy
  it('FullRecoveryStrategy requires checkpoint', () => {
    const strategy = new FullRecoveryStrategy();
    expect(strategy.canRecover()).toBe(false);
    expect(strategy.canRecover(undefined)).toBe(false);
  });
  it('FullRecoveryStrategy canRecover returns true with checkpoint', () => {
    const strategy = new FullRecoveryStrategy();
    const checkpoint = createMockCheckpoint();
    expect(strategy.canRecover(checkpoint)).toBe(true);
  });
  it('FullRecoveryStrategy creates 4 steps', () => {
    const strategy = new FullRecoveryStrategy();
    const steps = strategy.createSteps(createMockCheckpoint());
    expect(steps.length).toBe(4);
  });
  it('FullRecoveryStrategy step names are correct', () => {
    const strategy = new FullRecoveryStrategy();
    const steps = strategy.createSteps(createMockCheckpoint());
    expect(steps[0]!.name).toBe('load-session');
    expect(steps[1]!.name).toBe('restore-memory');
    expect(steps[2]!.name).toBe('restore-pipeline');
    expect(steps[3]!.name).toBe('prepare-continuation');
  });

  // MemoryOnlyRecoveryStrategy
  it('MemoryOnlyRecoveryStrategy always can recover', () => {
    const strategy = new MemoryOnlyRecoveryStrategy();
    expect(strategy.canRecover()).toBe(true);
    expect(strategy.canRecover(undefined)).toBe(true);
    expect(strategy.canRecover(createMockCheckpoint())).toBe(true);
  });
  it('MemoryOnlyRecoveryStrategy creates 2 steps', () => {
    const strategy = new MemoryOnlyRecoveryStrategy();
    const steps = strategy.createSteps();
    expect(steps.length).toBe(2);
  });
  it('MemoryOnlyRecoveryStrategy step names are correct', () => {
    const strategy = new MemoryOnlyRecoveryStrategy();
    const steps = strategy.createSteps();
    expect(steps[0]!.name).toBe('load-session');
    expect(steps[1]!.name).toBe('restore-memory');
  });

  // SessionOnlyRecoveryStrategy
  it('SessionOnlyRecoveryStrategy always can recover', () => {
    const strategy = new SessionOnlyRecoveryStrategy();
    expect(strategy.canRecover()).toBe(true);
    expect(strategy.canRecover(undefined)).toBe(true);
    expect(strategy.canRecover(createMockCheckpoint())).toBe(true);
  });
  it('SessionOnlyRecoveryStrategy creates 1 step', () => {
    const strategy = new SessionOnlyRecoveryStrategy();
    const steps = strategy.createSteps();
    expect(steps.length).toBe(1);
  });
  it('SessionOnlyRecoveryStrategy step name is correct', () => {
    const strategy = new SessionOnlyRecoveryStrategy();
    const steps = strategy.createSteps();
    expect(steps[0]!.name).toBe('load-session');
  });

  // Cross-cutting: descriptions and strategy metadata
  it('All strategy descriptions are non-empty', () => {
    const strategies = [
      new FullRecoveryStrategy(),
      new MemoryOnlyRecoveryStrategy(),
      new SessionOnlyRecoveryStrategy(),
    ];
    for (const s of strategies) {
      expect(s.description.length > 0, `${s.name} should have a description`).toBe(true);
    }
  });
  it('All strategy names are non-empty', () => {
    const strategies = [
      new FullRecoveryStrategy(),
      new MemoryOnlyRecoveryStrategy(),
      new SessionOnlyRecoveryStrategy(),
    ];
    for (const s of strategies) {
      expect(s.name.length > 0, 'Strategy should have a name').toBe(true);
    }
  });
  it('All steps have pending initial status', () => {
    const strategies = [
      new FullRecoveryStrategy(),
      new MemoryOnlyRecoveryStrategy(),
      new SessionOnlyRecoveryStrategy(),
    ];
    for (const s of strategies) {
      const steps = s.createSteps();
      for (const step of steps) {
        expect(step.status).toBe('pending');
      }
    }
  });
  it('All step descriptions are non-empty', () => {
    const strategies = [
      new FullRecoveryStrategy(),
      new MemoryOnlyRecoveryStrategy(),
      new SessionOnlyRecoveryStrategy(),
    ];
    for (const s of strategies) {
      const steps = s.createSteps();
      for (const step of steps) {
        expect(step.description.length > 0, `Step ${step.name} should have a description`).toBe(true);
      }
    }
  });
});
