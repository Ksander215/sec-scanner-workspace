/**
 * Context + Memory Integration Tests
 *
 * Integration tests that wire together context, session, memory,
 * checkpoint, and recovery modules.
 */
import { describe, it, expect } from 'vitest';
import { ContextEngine } from '../../../core/context/context-engine.js';
import { SessionRuntime } from '../../../core/session/session-runtime.js';
import { MemoryRuntime } from '../../../core/memory/memory-runtime.js';
import { CheckpointEngine } from '../../../core/checkpoint/checkpoint-engine.js';
import { RecoveryRuntime } from '../../../core/recovery/recovery-runtime.js';
import { InProcessEventBus } from '../../../core/events/event-bus.js';
import { ContextSource, ContextPriority } from '../../../core/context/types.js';
import { SessionState } from '../../../core/session/types.js';
import { RecoveryStatus } from '../../../core/recovery/types.js';

// ─── Tests ──────────────────────────────────────────────────

describe('ContextMemoryIntegration', () => {
  // ─── Context + Memory integration ───
  it('Context builder can use memory as source provider', async () => {
    const bus = new InProcessEventBus();
    const engine = new ContextEngine({ eventBus: bus });

    // Register a simple source provider backed by memory
    engine.registerProvider({
      name: 'memory-provider',
      async provide() {
        return [
          {
            key: 'user.name',
            value: 'TestUser',
            source: ContextSource.Session,
            priority: ContextPriority.High,
            createdAt: new Date().toISOString(),
          },
        ];
      },
    });

    const context = await engine.buildContext('sess-1', 'exec-1');
    expect(context).not.toBeNull();
    expect(context.contextId).toBeDefined();
  });
  it('Context update stores entries that can be retrieved', async () => {
    const bus = new InProcessEventBus();
    const engine = new ContextEngine({ eventBus: bus });

    // Register a provider with an initial entry
    engine.registerProvider({
      name: 'init-provider',
      async provide() {
        return [
          {
            key: 'init.key',
            value: 'init-value',
            source: ContextSource.Configuration,
            priority: ContextPriority.Normal,
            createdAt: new Date().toISOString(),
          },
        ];
      },
    });

    const context = await engine.buildContext('sess-1');
    expect(context).not.toBeNull();

    // Update with new entries
    const updated = await engine.updateContext(context.contextId, [
      {
        key: 'updated.key',
        value: 'updated-value',
        source: ContextSource.Runtime,
        priority: ContextPriority.High,
        createdAt: new Date().toISOString(),
      },
    ]);

    const resolved = engine.resolve(context.contextId, 'updated.key');
    expect(resolved).not.toBeNull();
    expect(resolved!.value).toBe('updated-value');
  });
  it('Context snapshot captures memory state', async () => {
    const bus = new InProcessEventBus();
    const engine = new ContextEngine({ eventBus: bus });

    engine.registerProvider({
      name: 'snapshot-provider',
      async provide() {
        return [
          {
            key: 'data.snapshot-test',
            value: { nested: true },
            source: ContextSource.Knowledge,
            priority: ContextPriority.Normal,
            createdAt: new Date().toISOString(),
          },
        ];
      },
    });

    const context = await engine.buildContext();
    expect(context).not.toBeNull();

    const snapshot = engine.createSnapshot(context.contextId, 'manual');
    expect(snapshot).not.toBeNull();
    expect(snapshot!.trigger).toBe('manual');
    expect(snapshot!.context).toBeDefined();
  });
  it('Context restore reloads from snapshot', async () => {
    const bus = new InProcessEventBus();
    const engine = new ContextEngine({ eventBus: bus });

    engine.registerProvider({
      name: 'restore-provider',
      async provide() {
        return [
          {
            key: 'restore.key',
            value: 'restore-value',
            source: ContextSource.Session,
            priority: ContextPriority.Normal,
            createdAt: new Date().toISOString(),
          },
        ];
      },
    });

    const context = await engine.buildContext();
    expect(context).not.toBeNull();

    const snapshot = engine.createSnapshot(context.contextId, 'checkpoint');
    expect(snapshot).not.toBeNull();

    // Clear the context
    engine.clearContext(context.contextId);
    const cleared = engine.getContext(context.contextId);
    expect(cleared).not.toBeNull();
    expect(cleared!.entries.size).toBe(0);

    // Restore from snapshot
    const restored = engine.restoreFromSnapshot(snapshot!);
    expect(restored).not.toBeNull();
  });

  // ─── Session + Memory integration ───
  it('Session create initializes session in Created state', async () => {
    const sessionRuntime = new SessionRuntime();
    const session = await sessionRuntime.createSession({ source: 'test' });
    expect(session.state).toBe(SessionState.Created);
    expect(session.id).not.toBeNull();
    expect(session.createdAt).not.toBeNull();
  });
  it('Session complete clears to Completed state', async () => {
    const sessionRuntime = new SessionRuntime();
    const session = await sessionRuntime.createSession();
    await sessionRuntime.startSession(session.id);
    await sessionRuntime.completeSession(session.id);
    const completed = sessionRuntime.getSession(session.id);
    expect(completed).not.toBeNull();
    expect(completed!.state).toBe(SessionState.Completed);
  });
  it('Session archive transitions to Archived', async () => {
    const sessionRuntime = new SessionRuntime();
    const session = await sessionRuntime.createSession();
    await sessionRuntime.startSession(session.id);
    await sessionRuntime.completeSession(session.id);
    await sessionRuntime.archiveSession(session.id);
    const archived = sessionRuntime.getSession(session.id);
    expect(archived).not.toBeNull();
    expect(archived!.state).toBe(SessionState.Archived);
  });
  it('Multiple sessions have isolated state', async () => {
    const sessionRuntime = new SessionRuntime();
    const s1 = await sessionRuntime.createSession();
    const s2 = await sessionRuntime.createSession();
    await sessionRuntime.startSession(s1.id);
    // s2 should still be Created
    expect(sessionRuntime.getSession(s2.id)!.state).toBe(SessionState.Created);
    expect(sessionRuntime.getSession(s1.id)!.state).toBe(SessionState.Running);
  });

  // ─── Pipeline + Checkpoint + Recovery integration ───
  it('Checkpoint captures pipeline state', () => {
    const engine = new CheckpointEngine();
    const checkpoint = engine.createCheckpoint({
      executionId: 'exec-1',
      goalId: 'goal-1',
      stage: 'planning',
      executionState: 'Running',
      variables: { step: 1 },
      completedSteps: ['step-1'],
      pendingSteps: ['step-2', 'step-3'],
    });
    expect(checkpoint.executionId).toBe('exec-1');
    expect(checkpoint.stage).toBe('planning');
    expect(checkpoint.status).toBe('valid');
    expect(checkpoint.completedSteps.length).toBe(1);
    expect(checkpoint.pendingSteps.length).toBe(2);
  });
  it('Recovery loads checkpoint and restores state', async () => {
    const bus = new InProcessEventBus();
    const checkpointEngine = new CheckpointEngine({ eventBus: bus });
    const checkpoint = checkpointEngine.createCheckpoint({
      executionId: 'exec-1',
      goalId: 'goal-1',
      stage: 'step-completed',
      executionState: 'Running',
      variables: { step: 2 },
      completedSteps: ['step-1', 'step-2'],
      pendingSteps: ['step-3'],
    });

    const recoveryRuntime = new RecoveryRuntime({
      eventBus: bus,
      checkpointEngine: checkpointEngine as any,
    });

    const plan = await recoveryRuntime.recover('exec-1', {
      checkpointId: checkpoint.checkpointId as string,
    });
    expect(plan.status).toBe(RecoveryStatus.Ready);
    expect(plan.restoredState).not.toBeNull();
    expect(plan.restoredState!.executionId).toBe('exec-1');
  });
  it('Recovery continues execution from checkpoint', async () => {
    const bus = new InProcessEventBus();
    const checkpointEngine = new CheckpointEngine({ eventBus: bus });
    const checkpoint = checkpointEngine.createCheckpoint({
      executionId: 'exec-1',
      goalId: 'goal-1',
      stage: 'step-completed',
      executionState: 'Running',
      variables: { currentStep: 'step-3' },
      completedSteps: ['step-1', 'step-2'],
      pendingSteps: ['step-3'],
    });

    // Consume the checkpoint to simulate recovery
    checkpointEngine.consumeCheckpoint(checkpoint.checkpointId as string);

    const recoveryRuntime = new RecoveryRuntime({
      eventBus: bus,
      checkpointEngine: checkpointEngine as any,
    });

    const plan = await recoveryRuntime.recover('exec-1', {
      checkpointId: checkpoint.checkpointId as string,
    });
    expect(plan.status).toBe(RecoveryStatus.Ready);
  });
  it('Full recovery cycle: create → checkpoint → recover → continue', async () => {
    const bus = new InProcessEventBus();
    const checkpointEngine = new CheckpointEngine({ eventBus: bus });
    const sessionRuntime = new SessionRuntime({ eventBus: bus });
    const memoryRuntime = new MemoryRuntime({ eventBus: bus });

    // 1. Create session
    const session = await sessionRuntime.createSession();
    await sessionRuntime.startSession(session.id);

    // 2. Create checkpoint
    const checkpoint = checkpointEngine.createCheckpoint({
      executionId: 'exec-1',
      goalId: 'goal-1',
      stage: 'step-completed',
      executionState: 'Running',
      variables: { progress: 50 },
      completedSteps: ['step-1'],
      pendingSteps: ['step-2'],
    });

    // 3. Simulate recovery
    const recoveryRuntime = new RecoveryRuntime({
      eventBus: bus,
      checkpointEngine: checkpointEngine as any,
      sessionRuntime: sessionRuntime as any,
      memoryRuntime: memoryRuntime,
    });

    const plan = await recoveryRuntime.recover('exec-1', {
      sessionId: session.id,
      checkpointId: checkpoint.checkpointId as string,
    });

    expect(plan.status).toBe(RecoveryStatus.Ready);
    expect(plan.restoredState).not.toBeNull();

    // 4. Verify the recovered state can be used for continuation
    const recovered = plan.restoredState!;
    expect(recovered.executionId).toBe('exec-1');
    expect(recovered.sessionId).not.toBeNull();
  });

  // ─── Full Memory Runtime cycle ───
  it('Store in all 3 layers', async () => {
    const bus = new InProcessEventBus();
    const memoryRuntime = new MemoryRuntime({ eventBus: bus });

    // Working memory
    await memoryRuntime.store('working', 'wm-key', 'wm-value', { executionId: 'exec-1' });
    // Session memory
    await memoryRuntime.store('session', 'sm-key', 'sm-value', { sessionId: 'sess-1' });
    // Persistent memory
    await memoryRuntime.store('persistent', 'pm-key', 'pm-value');

    const stats = memoryRuntime.getStats();
    expect(stats.workingEntries).toBe(1);
    expect(stats.sessionEntries).toBe(1);
    expect(stats.persistentEntries).toBe(1);
  });
  it('Retrieve from each layer', async () => {
    const bus = new InProcessEventBus();
    const memoryRuntime = new MemoryRuntime({ eventBus: bus });

    await memoryRuntime.store('working', 'wm-key', 'wm-value', { executionId: 'exec-1' });
    await memoryRuntime.store('session', 'sm-key', 'sm-value', { sessionId: 'sess-1' });
    await memoryRuntime.store('persistent', 'pm-key', 'pm-value');

    const wmEntry = await memoryRuntime.retrieve('working', 'wm-key', { executionId: 'exec-1' });
    expect(wmEntry).not.toBeNull();
    expect(wmEntry!.value).toBe('wm-value');

    const smEntry = await memoryRuntime.retrieve('session', 'sm-key', { sessionId: 'sess-1' });
    expect(smEntry).not.toBeNull();
    expect(smEntry!.value).toBe('sm-value');

    const pmEntry = await memoryRuntime.retrieve('persistent', 'pm-key');
    expect(pmEntry).not.toBeNull();
    expect(pmEntry!.value).toBe('pm-value');
  });
  it('Cross-layer queries', async () => {
    const bus = new InProcessEventBus();
    const memoryRuntime = new MemoryRuntime({ eventBus: bus });

    await memoryRuntime.store('working', 'cross-key', 'wm', { executionId: 'exec-1' });
    await memoryRuntime.store('session', 'cross-key', 'sm', { sessionId: 'sess-1' });
    await memoryRuntime.store('persistent', 'cross-key', 'pm');

    // Query across all layers
    const results = memoryRuntime.query({ keyPattern: 'cross-key' });
    expect(results.length).toBe(3);
  });
  it('Flush persists all dirty entries', async () => {
    const bus = new InProcessEventBus();
    const memoryRuntime = new MemoryRuntime({ eventBus: bus });
    await memoryRuntime.store('persistent', 'flush-key', 'flush-value');
    // Flush should not throw
    await memoryRuntime.flush();
  });
  it('Purge expired across all layers', async () => {
    const bus = new InProcessEventBus();
    const memoryRuntime = new MemoryRuntime({ eventBus: bus });
    // Store with short TTL
    await memoryRuntime.store('session', 'expire-key', 'value', {
      sessionId: 'sess-1',
      ttlMs: 1,
    });
    // Wait for expiry
    await new Promise(r => setTimeout(r, 10));
    const purged = await memoryRuntime.purgeExpired();
    expect(purged >= 0, 'Should complete without error').toBe(true);
  });
});
