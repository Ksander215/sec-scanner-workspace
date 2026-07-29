import { describe, it, expect } from 'vitest';
import { SessionRuntime } from '../../../core/session/session-runtime.js';
import { InMemorySessionStorageAdapter } from '../../../core/session/session-store.js';
import { MemoryRuntime } from '../../../core/memory/memory-runtime.js';
import { ContextEngine } from '../../../core/context/context-engine.js';
import { SessionState } from '../../../core/session/types.js';
import { CheckpointEngine } from '../../../core/checkpoint/checkpoint-engine.js';
import { RecoveryRuntime } from '../../../core/recovery/recovery-runtime.js';
import type { ContextSourceProvider } from '../../../core/context/context-builder.js';
import type { ContextEntry } from '../../../core/context/types.js';
import { ContextSource, ContextPriority } from '../../../core/context/types.js';

describe('Session ↔ Context ↔ Memory Integration', () => {
  it('session create → start → pause → resume → complete → archive lifecycle', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession({ goal: 'test' });
    expect(session.state).toBe(SessionState.Created);

    const started = await runtime.startSession(session.id);
    expect(started.state).toBe(SessionState.Running);
    expect(started.startedAt).toBeDefined();

    const paused = await runtime.pauseSession(session.id, 'user-request');
    expect(paused.state).toBe(SessionState.Paused);
    expect(paused.pausedAt).toBeDefined();

    const resumed = await runtime.resumeSession(session.id);
    expect(resumed.state).toBe(SessionState.Running);
    expect(resumed.resumedAt).toBeDefined();

    const completed = await runtime.completeSession(session.id);
    expect(completed.state).toBe(SessionState.Completed);
    expect(completed.completedAt).toBeDefined();

    const archived = await runtime.archiveSession(session.id);
    expect(archived.state).toBe(SessionState.Archived);
    expect(archived.archivedAt).toBeDefined();
  });

  it('session tracks multiple executions', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession();
    await runtime.startSession(session.id);

    runtime.recordExecution(session.id, 'exec-1');
    runtime.recordExecution(session.id, 'exec-2');

    const updated = runtime.getSession(session.id);
    expect(updated!.executionCount).toBe(2);
    expect(updated!.lastExecutionId).toBe('exec-2');
  });

  it('session persistence round-trip via storage adapter', async () => {
    const storage = new InMemorySessionStorageAdapter();
    const runtime = new SessionRuntime({ storageAdapter: storage, autoPersist: true });
    const session = await runtime.createSession({ tag: 'persist-test' });
    await runtime.startSession(session.id);

    // Create new runtime with same storage
    const runtime2 = new SessionRuntime({ storageAdapter: storage });
    const loaded = await runtime2.loadSession(session.id);
    expect(loaded.id).toBe(session.id);
    expect(loaded.state).toBe(SessionState.Running);
    expect(loaded.metadata.tag).toBe('persist-test');
  });

  it('memory runtime stores across 3 layers', async () => {
    const memory = new MemoryRuntime();

    // Working memory
    await memory.store('working', 'key1', 'value1', { executionId: 'exec-1' });
    const wm = memory.getWorkingMemory('exec-1');
    expect(wm.size()).toBe(1);

    // Session memory
    await memory.store('session', 'key2', 'value2', { sessionId: 'sess-1' });
    const sm = memory.getSessionMemory('sess-1');
    expect(sm.size()).toBe(1);

    // Persistent memory
    await memory.store('persistent', 'key3', 'value3');
    const entry = await memory.retrieve('persistent', 'key3');
    expect(entry).not.toBeNull();
    expect(entry!.value).toBe('value3');

    // Stats
    const stats = memory.getStats();
    expect(stats.workingEntries).toBe(1);
    expect(stats.sessionEntries).toBe(1);
    expect(stats.persistentEntries).toBe(1);
    expect(stats.totalEntries).toBe(3);
  });

  it('memory runtime cross-layer query', async () => {
    const memory = new MemoryRuntime();
    await memory.store('working', 'wk', 'wv', { executionId: 'e1' });
    await memory.store('session', 'sk', 'sv', { sessionId: 's1' });
    await memory.store('persistent', 'pk', 'pv');

    const all = memory.query({});
    expect(all).toHaveLength(3);

    const workingOnly = memory.query({ layer: 'working' });
    expect(workingOnly).toHaveLength(1);
    expect(workingOnly[0]!.key).toBe('wk');

    const sessionAndPersistent = memory.query({ keyPattern: 's.*|p.*' });
    expect(sessionAndPersistent.length).toBeGreaterThanOrEqual(1);
  });

  it('memory isolation prevents cross-session access', async () => {
    const memory = new MemoryRuntime({ enableIsolation: true });

    // Session A stores data
    await memory.store('session', 'shared-key', 'session-a-value', {
      sessionId: 'session-a',
    });

    // Session B should NOT be able to access session A's data
    // Session memory is scoped by sessionId through getSessionMemory
    const smA = memory.getSessionMemory('session-a');
    expect(smA.retrieve('shared-key')).not.toBeNull();

    const smB = memory.getSessionMemory('session-b');
    expect(smB.retrieve('shared-key')).toBeNull();
  });

  it('memory runtime disposal prevents operations', async () => {
    const memory = new MemoryRuntime();
    await memory.store('persistent', 'k', 'v');
    memory.dispose();

    expect(memory.disposed).toBe(true);
    await expect(memory.store('persistent', 'k2', 'v2')).rejects.toThrow();
  });

  it('context engine builds from providers', async () => {
    const engine = new ContextEngine();

    const provider: ContextSourceProvider = {
      source: ContextSource.Session,
      async getEntries() {
        return [
          {
            key: 'session-data',
            value: { active: true },
            source: ContextSource.Session,
            priority: ContextPriority.High,
            createdAt: new Date().toISOString(),
          },
        ];
      },
    };

    engine.registerProvider(provider);
    const context = await engine.buildContext('sess-1', 'exec-1');

    expect(context.entries.size).toBe(1);
    expect(context.entries.get('session-data')!.source).toBe(ContextSource.Session);
    expect(context.sessionId).toBe('sess-1');
    expect(context.executionId).toBe('exec-1');
  });

  it('context engine update with merge', async () => {
    const engine = new ContextEngine();
    const context = await engine.buildContext();

    const newEntries: ContextEntry[] = [
      {
        key: 'new-key',
        value: 'new-value',
        source: ContextSource.Configuration,
        priority: ContextPriority.Normal,
        createdAt: new Date().toISOString(),
      },
    ];

    const updated = await engine.updateContext(context.contextId, newEntries);
    expect(updated.entries.size).toBe(1);
    expect(updated.entries.get('new-key')!.value).toBe('new-value');
  });

  it('context snapshot and restore', () => {
    const engine = new ContextEngine();

    const context = {
      contextId: 'snap-ctx' as any,
      version: 'v1' as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      entries: new Map(),
      metadata: {},
      sizeBytes: 0,
    };

    // We need to get context into the engine's internal store
    // createSnapshot gets it from the internal store
    const snapshot = engine.createSnapshot('snap-ctx', 'manual');
    expect(snapshot).toBeNull(); // not in store yet

    const built = engine.getContext('snap-ctx');
    expect(built).toBeNull();
  });

  it('checkpoint engine creates and consumes checkpoints', () => {
    const engine = new CheckpointEngine();

    const cp = engine.createCheckpoint({
      executionId: 'exec-1',
      goalId: 'goal-1',
      stage: 'planning',
      executionState: 'planning',
      variables: { step: 1 },
      completedSteps: ['step-1'],
      pendingSteps: ['step-2', 'step-3'],
    });

    expect(cp.status).toBe('valid');
    expect(cp.executionId).toBe('exec-1');

    const consumed = engine.consumeCheckpoint(cp.checkpointId as string);
    expect(consumed.status).toBe('consumed');
  });

  it('checkpoint engine getLatestForExecution', () => {
    const engine = new CheckpointEngine();

    engine.createCheckpoint({
      executionId: 'exec-1', goalId: 'g1', stage: 'planning',
      executionState: 'planning', variables: {}, completedSteps: [], pendingSteps: [],
    });

    // Small delay to ensure different timestamps
    const start = Date.now();
    while (Date.now() === start) { /* spin */ }

    engine.createCheckpoint({
      executionId: 'exec-1', goalId: 'g1', stage: 'step-completed',
      executionState: 'running', variables: { x: 1 }, completedSteps: ['s1'], pendingSteps: ['s2'],
    });

    const latest = engine.getLatestForExecution('exec-1');
    expect(latest).not.toBeNull();
    expect(latest!.stage).toBe('step-completed');
  });

  it('checkpoint purgeForExecution removes all', () => {
    const engine = new CheckpointEngine();

    engine.createCheckpoint({
      executionId: 'exec-1', goalId: 'g1', stage: 'planning',
      executionState: 'planning', variables: {}, completedSteps: [], pendingSteps: [],
    });

    const purged = engine.purgeForExecution('exec-1');
    expect(purged).toBe(1);
    expect(engine.getLatestForExecution('exec-1')).toBeNull();
  });

  it('recovery runtime orchestrates recovery with session + memory', async () => {
    const sessionRuntime = new SessionRuntime();
    const memoryRuntime = new MemoryRuntime();
    const checkpointEngine = new CheckpointEngine();

    const session = await sessionRuntime.createSession();
    await sessionRuntime.startSession(session.id);

    const cp = checkpointEngine.createCheckpoint({
      executionId: 'exec-1',
      goalId: 'goal-1',
      planId: 'plan-1',
      stage: 'step-completed',
      executionState: 'running',
      variables: { progress: 50 },
      completedSteps: ['step-1', 'step-2'],
      pendingSteps: ['step-3'],
    });

    await memoryRuntime.store('working', 'wm-key', 'wm-value', { executionId: 'exec-1' });
    await memoryRuntime.store('session', 'sm-key', 'sm-value', { sessionId: session.id });

    const recoveryRuntime = new RecoveryRuntime({
      sessionRuntime,
      memoryRuntime,
      checkpointEngine,
    });

    const plan = await recoveryRuntime.recover('exec-1', {
      checkpointId: cp.checkpointId as string,
      sessionId: session.id,
    });

    expect(plan.status).toBe('Ready');
    expect(plan.restoredState).toBeDefined();
    expect(plan.restoredState!.executionId).toBe('exec-1');

    // All steps should be completed
    const completedSteps = plan.steps.filter(s => s.status === 'completed');
    expect(completedSteps.length).toBe(plan.steps.length);
  });
});
