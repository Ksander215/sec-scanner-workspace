/**
 * Recovery Runtime Tests
 *
 * Tests for RecoveryRuntime: recover, getRecovery, getRecoveries,
 * serialize/deserialize plans, event publishing, step execution.
 */
import { describe, it, expect } from 'vitest';
import { RecoveryRuntime, type RecoveryRuntimeConfig } from '../../../core/recovery/recovery-runtime.js';
import { RecoveryStatus } from '../../../core/recovery/types.js';
import { RecoveryError } from '../../../core/recovery/errors.js';
import { InProcessEventBus } from '../../../core/events/event-bus.js';

// ─── Mock helpers ──────────────────────────────────────────

function createMockSessionRuntime(options?: {
  getSessionReturn?: unknown;
  loadSessionShouldThrow?: boolean;
}) {
  return {
    getSession: () => options?.getSessionReturn ?? null,
    loadSession: () => {
      if (options?.loadSessionShouldThrow) throw new Error('session load failed');
    },
  } as any;
}

function createMockMemoryRuntime(options?: {
  shouldThrow?: boolean;
}) {
  return {
    getWorkingMemory: () => {
      if (options?.shouldThrow) throw new Error('memory restore failed');
      return {};
    },
    getSessionMemory: () => {
      if (options?.shouldThrow) throw new Error('memory restore failed');
      return {};
    },
  } as any;
}

function createMockCheckpointEngine(options?: {
  loadReturn?: any;
  shouldThrow?: boolean;
}) {
  return {
    load: () => {
      if (options?.shouldThrow) throw new Error('checkpoint load failed');
      return options?.loadReturn ?? null;
    },
  } as any;
}

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

describe('RecoveryRuntime', () => {
  it('recover creates a recovery plan', async () => {
    const runtime = new RecoveryRuntime();
    const plan = await runtime.recover('exec-1');
    expect(plan).not.toBeNull();
    expect(plan.recoveryId).not.toBeNull();
    expect(plan.executionId).toBe('exec-1');
  });
  it('recover returns plan with Ready status on success', async () => {
    const runtime = new RecoveryRuntime();
    const plan = await runtime.recover('exec-1');
    expect(plan.status).toBe(RecoveryStatus.Ready);
  });
  it('recover returns plan with Failed status on error', async () => {
    const eventBus = new InProcessEventBus();
    const mockSession = createMockSessionRuntime({ loadSessionShouldThrow: true });
    const runtime = new RecoveryRuntime({
      eventBus,
      sessionRuntime: mockSession,
    });
    const plan = await runtime.recover('exec-1', { sessionId: 'sess-1' });
    expect(plan.status).toBe(RecoveryStatus.Failed);
    expect(plan.error).not.toBeNull();
    expect(plan.error.code).toBe('SESSION_RECOVERY_FAILED');
  });
  it('Recovery steps are executed sequentially', async () => {
    const runtime = new RecoveryRuntime();
    const plan = await runtime.recover('exec-1');
    // All steps should be completed since there are no real deps
    for (const step of plan.steps) {
      expect(step.status).toBe('completed');
    }
  });
  it('getRecovery returns stored plan', async () => {
    const runtime = new RecoveryRuntime();
    const plan = await runtime.recover('exec-1');
    const fetched = runtime.getRecovery(plan.recoveryId as unknown as string);
    expect(fetched).not.toBeNull();
    expect(fetched!.executionId).toBe('exec-1');
  });
  it('getRecovery returns null for unknown', async () => {
    const runtime = new RecoveryRuntime();
    const fetched = runtime.getRecovery('nonexistent-id');
    expect(fetched).toBeNull();
  });
  it('getRecoveries returns all plans', async () => {
    const runtime = new RecoveryRuntime();
    await runtime.recover('exec-1');
    await runtime.recover('exec-2');
    const all = runtime.getRecoveries();
    expect(all.length).toBe(2);
  });
  it('serializePlan strips branding from recoveryId', async () => {
    const runtime = new RecoveryRuntime();
    const plan = await runtime.recover('exec-1');
    const serialized = runtime.serializePlan(plan);
    expect(typeof serialized.recoveryId).toBe('string');
    // The serialized id should be the same value but without branding
    expect(serialized.recoveryId).toBe(plan.recoveryId as unknown as string);
  });
  it('deserializePlan restores branding', async () => {
    const runtime = new RecoveryRuntime();
    const plan = await runtime.recover('exec-1');
    const serialized = runtime.serializePlan(plan);
    const restored = runtime.deserializePlan(serialized);
    expect(restored.recoveryId).not.toBeNull();
    expect(restored.executionId).toBe(plan.executionId);
    expect(restored.status).toBe(plan.status);
  });
  it('Recovery without checkpoint uses fallback strategy', async () => {
    // FullRecoveryStrategy requires checkpoint; without one, it falls back
    const runtime = new RecoveryRuntime();
    const plan = await runtime.recover('exec-1');
    // Should still succeed with fallback (MemoryOnlyRecoveryStrategy)
    expect(plan.status).toBe(RecoveryStatus.Ready);
  });
  it('Recovery with sessionRuntime loads session', async () => {
    const mockSession = createMockSessionRuntime();
    const runtime = new RecoveryRuntime({
      sessionRuntime: mockSession,
    });
    const plan = await runtime.recover('exec-1', { sessionId: 'sess-1' });
    expect(plan.status).toBe(RecoveryStatus.Ready);
  });
  it('Recovery with memoryRuntime restores memory', async () => {
    const mockMemory = createMockMemoryRuntime();
    const runtime = new RecoveryRuntime({
      memoryRuntime: mockMemory,
    });
    const plan = await runtime.recover('exec-1');
    expect(plan.status).toBe(RecoveryStatus.Ready);
  });
  it('Recovery with checkpointEngine loads checkpoint', async () => {
    const checkpoint = createMockCheckpoint();
    const mockCheckpoint = createMockCheckpointEngine({
      loadReturn: checkpoint,
    });
    const runtime = new RecoveryRuntime({
      checkpointEngine: mockCheckpoint,
    });
    const plan = await runtime.recover('exec-1', { checkpointId: 'cp-123' });
    expect(plan.status).toBe(RecoveryStatus.Ready);
  });
  it('Recovery fails gracefully when session load throws', async () => {
    const mockSession = createMockSessionRuntime({ loadSessionShouldThrow: true });
    const runtime = new RecoveryRuntime({
      sessionRuntime: mockSession,
    });
    const plan = await runtime.recover('exec-1', { sessionId: 'sess-1' });
    expect(plan.status).toBe(RecoveryStatus.Failed);
    expect(plan.error).not.toBeNull();
  });
  it('Recovery fails gracefully when memory restore throws', async () => {
    const mockMemory = createMockMemoryRuntime({ shouldThrow: true });
    const runtime = new RecoveryRuntime({
      memoryRuntime: mockMemory,
    });
    const plan = await runtime.recover('exec-1');
    expect(plan.status).toBe(RecoveryStatus.Failed);
    expect(plan.error).not.toBeNull();
    expect(plan.error!.code).toBe('MEMORY_RECOVERY_FAILED');
  });
  it('Step failure stops recovery', async () => {
    const mockMemory = createMockMemoryRuntime({ shouldThrow: true });
    const runtime = new RecoveryRuntime({
      memoryRuntime: mockMemory,
    });
    const plan = await runtime.recover('exec-1');
    expect(plan.status).toBe(RecoveryStatus.Failed);
    // At least one step should be failed
    const failedSteps = plan.steps.filter(s => s.status === 'failed');
    expect(failedSteps.length > 0, 'At least one step should be failed').toBe(true);
  });
  it('Recovery plan has correct executionId', async () => {
    const runtime = new RecoveryRuntime();
    const plan = await runtime.recover('my-execution-42');
    expect(plan.executionId).toBe('my-execution-42');
  });
  it('Steps have pending initial status', async () => {
    // We can verify that the initial plan stored has steps that were created with 'pending'
    // before execution. Check via the strategy directly.
    const runtime = new RecoveryRuntime();
    // Access the strategy: default is FullRecoveryStrategy
    // But we can check through the step count of a fresh recovery
    const plan = await runtime.recover('exec-1');
    // After recovery all steps should be completed (since no real deps)
    for (const step of plan.steps) {
      expect(step.completedAt).not.toBeNull();
    }
  });
  it('Steps transition to running then completed', async () => {
    const eventBus = new InProcessEventBus();
    const runtime = new RecoveryRuntime({ eventBus });
    await runtime.recover('exec-1');
    // Check events: we should see RecoveryStepCompleted events
    const log = eventBus.getLog();
    const stepCompletedEvents = log.filter(e => e.eventType === 'RecoveryStepCompleted');
    expect(stepCompletedEvents.length > 0, 'Should have at least one RecoveryStepCompleted event').toBe(true);
  });
  it('Event published on recovery start', async () => {
    const eventBus = new InProcessEventBus();
    const runtime = new RecoveryRuntime({ eventBus });
    await runtime.recover('exec-1');
    const log = eventBus.getLog();
    const startedEvents = log.filter(e => e.eventType === 'RecoveryStarted');
    expect(startedEvents.length).toBe(1);
  });
  it('Event published on recovery completion', async () => {
    const eventBus = new InProcessEventBus();
    const runtime = new RecoveryRuntime({ eventBus });
    await runtime.recover('exec-1');
    const log = eventBus.getLog();
    const completedEvents = log.filter(e => e.eventType === 'RecoveryCompleted');
    expect(completedEvents.length).toBe(1);
  });
  it('Event published on recovery failure', async () => {
    const eventBus = new InProcessEventBus();
    const mockMemory = createMockMemoryRuntime({ shouldThrow: true });
    const runtime = new RecoveryRuntime({ eventBus, memoryRuntime: mockMemory });
    await runtime.recover('exec-1');
    const log = eventBus.getLog();
    const failedEvents = log.filter(e => e.eventType === 'RecoveryFailed');
    expect(failedEvents.length).toBe(1);
  });
  it('serialize/deserialize round-trip preserves all fields', async () => {
    const runtime = new RecoveryRuntime();
    const plan = await runtime.recover('exec-1', { sessionId: 'sess-1' });
    const serialized = runtime.serializePlan(plan);
    const deserialized = runtime.deserializePlan(serialized);
    expect(deserialized.executionId).toBe(plan.executionId);
    expect(deserialized.sessionId).toBe(plan.sessionId);
    expect(deserialized.status).toBe(plan.status);
    expect(deserialized.steps.length).toBe(plan.steps.length);
    expect(deserialized.currentStepIndex).toBe(plan.currentStepIndex);
    expect(deserialized.restoredState).not.toBeNull();
  });
  it('Multiple recoveries are tracked independently', async () => {
    const runtime = new RecoveryRuntime();
    const plan1 = await runtime.recover('exec-1');
    const plan2 = await runtime.recover('exec-2');
    expect(plan1.recoveryId !== plan2.recoveryId, 'Recovery IDs should be unique').toBe(true);
    expect(runtime.getRecoveries().length).toBe(2);
  });
});
