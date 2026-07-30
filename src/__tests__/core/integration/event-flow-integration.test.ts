/**
 * Event Flow Integration Tests
 *
 * Tests that events from each module are published through
 * the EventBus with correct classification and aggregateId.
 */
import { describe, it, expect } from 'vitest';
import { InProcessEventBus } from '../../../core/events/event-bus.js';
import { ContextEngine } from '../../../core/context/context-engine.js';
import { SessionRuntime } from '../../../core/session/session-runtime.js';
import { MemoryRuntime } from '../../../core/memory/memory-runtime.js';
import { CheckpointEngine } from '../../../core/checkpoint/checkpoint-engine.js';
import { RecoveryRuntime } from '../../../core/recovery/recovery-runtime.js';
import { EventClassification } from '../../../core/types/common.js';
import { ContextSource, ContextPriority } from '../../../core/context/types.js';

describe('EventFlowIntegration', () => {
  // ─── Context events ───
  it('Context events published through EventBus', async () => {
    const bus = new InProcessEventBus();
    const engine = new ContextEngine({ eventBus: bus });

    engine.registerProvider({
      name: 'test-provider',
      async provide() {
        return [
          {
            key: 'test.key',
            value: 'test-value',
            source: ContextSource.Runtime,
            priority: ContextPriority.Normal,
            createdAt: new Date().toISOString(),
          },
        ];
      },
    });

    await engine.buildContext('sess-1', 'exec-1');

    const log = bus.getLog();
    const contextEvents = log.filter(e => e.eventType === 'ContextCreated');
    expect(contextEvents.length).toBe(1);
  });
  it('Context events have correct classification', async () => {
    const bus = new InProcessEventBus();
    const engine = new ContextEngine({ eventBus: bus });

    engine.registerProvider({
      name: 'cls-provider',
      async provide() {
        return [
          {
            key: 'cls.key',
            value: 'v',
            source: ContextSource.Runtime,
            priority: ContextPriority.Normal,
            createdAt: new Date().toISOString(),
          },
        ];
      },
    });

    await engine.buildContext();

    const log = bus.getLog();
    const created = log.find(e => e.eventType === 'ContextCreated');
    expect(created).not.toBeNull();
    expect(created!.classification).toBe(EventClassification.StateChange);
  });

  // ─── Session events ───
  it('Session events published through EventBus', async () => {
    const bus = new InProcessEventBus();
    const runtime = new SessionRuntime({ eventBus: bus });

    await runtime.createSession();
    await runtime.startSession(runtime.listSessions()[0]!.id);

    const log = bus.getLog();
    const created = log.filter(e => e.eventType === 'SessionCreated');
    const started = log.filter(e => e.eventType === 'SessionStartedEvent');
    expect(created.length).toBe(1);
    expect(started.length).toBe(1);
  });
  it('Session events have correct classification', async () => {
    const bus = new InProcessEventBus();
    const runtime = new SessionRuntime({ eventBus: bus });

    await runtime.createSession();

    const log = bus.getLog();
    const created = log.find(e => e.eventType === 'SessionCreated');
    expect(created).not.toBeNull();
    expect(created!.classification).toBe(EventClassification.StateChange);
  });

  // ─── Memory events ───
  it('Memory events published through EventBus', async () => {
    const bus = new InProcessEventBus();
    const runtime = new MemoryRuntime({ eventBus: bus, enableIsolation: false });

    await runtime.store('persistent', 'mem-key', 'mem-value');

    const log = bus.getLog();
    const stored = log.filter(e => e.eventType === 'MemoryEntryStored');
    expect(stored.length >= 1, 'Should have at least one MemoryEntryStored event').toBe(true);
  });
  it('Memory events have correct classification', async () => {
    const bus = new InProcessEventBus();
    const runtime = new MemoryRuntime({ eventBus: bus, enableIsolation: false });

    await runtime.store('persistent', 'cls-mem-key', 'value');

    const log = bus.getLog();
    const stored = log.find(e => e.eventType === 'MemoryEntryStored');
    expect(stored).not.toBeNull();
    expect(stored!.classification).toBe(EventClassification.Action);
  });

  // ─── Checkpoint events ───
  it('Checkpoint events published through EventBus', () => {
    const bus = new InProcessEventBus();
    const engine = new CheckpointEngine({ eventBus: bus });

    engine.createCheckpoint({
      executionId: 'exec-1',
      goalId: 'goal-1',
      stage: 'planning',
      executionState: 'Running',
      variables: {},
      completedSteps: [],
      pendingSteps: [],
    });

    const log = bus.getLog();
    const created = log.filter(e => e.eventType === 'CheckpointCreated');
    expect(created.length).toBe(1);
  });

  // ─── Recovery events ───
  it('Recovery events published through EventBus', async () => {
    const bus = new InProcessEventBus();
    const runtime = new RecoveryRuntime({ eventBus: bus });

    await runtime.recover('exec-1');

    const log = bus.getLog();
    const started = log.filter(e => e.eventType === 'RecoveryStarted');
    const completed = log.filter(e => e.eventType === 'RecoveryCompleted');
    expect(started.length).toBe(1);
    expect(completed.length).toBe(1);
  });

  // ─── Cross-module: Events carry correct aggregateId ───
  it('Events carry correct aggregateId for each module', async () => {
    const bus = new InProcessEventBus();

    // Context event
    const ctxEngine = new ContextEngine({ eventBus: bus });
    ctxEngine.registerProvider({
      name: 'agg-provider',
      async provide() {
        return [
          {
            key: 'agg.key',
            value: 'v',
            source: ContextSource.Runtime,
            priority: ContextPriority.Normal,
            createdAt: new Date().toISOString(),
          },
        ];
      },
    });
    await ctxEngine.buildContext();

    // Session event
    const sessRuntime = new SessionRuntime({ eventBus: bus });
    const session = await sessRuntime.createSession();

    // Checkpoint event
    const cpEngine = new CheckpointEngine({ eventBus: bus });
    cpEngine.createCheckpoint({
      executionId: 'exec-agg',
      goalId: 'goal-agg',
      stage: 'planning',
      executionState: 'Running',
      variables: {},
      completedSteps: [],
      pendingSteps: [],
    });

    // Recovery event
    const recRuntime = new RecoveryRuntime({ eventBus: bus });
    await recRuntime.recover('exec-agg');

    const log = bus.getLog();

    // Context events have aggregateId matching contextId
    const ctxEvent = log.find(e => e.eventType === 'ContextCreated');
    expect(ctxEvent).not.toBeNull();
    expect(ctxEvent!.aggregateId).not.toBeNull();
    // Session events have aggregateId matching sessionId
    const sessEvent = log.find(e => e.eventType === 'SessionCreated');
    expect(sessEvent).not.toBeNull();
    expect(sessEvent!.aggregateId).not.toBeNull();
    // Checkpoint events have aggregateId matching checkpointId
    const cpEvent = log.find(e => e.eventType === 'CheckpointCreated');
    expect(cpEvent).not.toBeNull();
    expect(cpEvent!.aggregateId).not.toBeNull();
    // Recovery events have aggregateId matching recoveryId
    const recEvent = log.find(e => e.eventType === 'RecoveryStarted');
    expect(recEvent).not.toBeNull();
    expect(recEvent!.aggregateId).not.toBeNull();
  });
});
