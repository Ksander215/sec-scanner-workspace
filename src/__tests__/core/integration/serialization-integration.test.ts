/**
 * Serialization Integration Tests
 *
 * Tests serialize/deserialize round-trips across all modules:
 * Session, Context, Memory, Checkpoint, Recovery.
 * Also tests branded IDs, readonly arrays, and nested metadata.
 */
import { describe, it, expect } from 'vitest';
import { SessionRuntime } from '../../../core/session/session-runtime.js';
import { ContextEngine } from '../../../core/context/context-engine.js';
import { ContextSerializer } from '../../../core/context/context-serializer.js';
import { MemoryRuntime } from '../../../core/memory/memory-runtime.js';
import { CheckpointEngine } from '../../../core/checkpoint/checkpoint-engine.js';
import { RecoveryRuntime } from '../../../core/recovery/recovery-runtime.js';
import { SessionState, type SerializableSession } from '../../../core/session/types.js';
import { ContextSource, ContextPriority } from '../../../core/context/types.js';
import { RecoveryStatus } from '../../../core/recovery/types.js';

describe('SerializationIntegration', () => {
  // ─── Session serialize/deserialize round-trip ───
  it('Session serialize/deserialize round-trip', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession({ tag: 'test' });
    await runtime.startSession(session.id);

    const startedSession = runtime.getSession(session.id);
    expect(startedSession).not.toBeNull();
    const serializable = runtime.serializeSession(startedSession!);
    expect(serializable).not.toBeNull();
    expect(typeof serializable.id).toBe('string');
    expect(serializable.state).toBe(SessionState.Running);

    const deserialized = runtime.deserializeSession(serializable);
    expect(deserialized.id).toBe(session.id);
    expect(deserialized.state).toBe(SessionState.Running);
    expect(deserialized.metadata.tag).toBe('test');
  });

  // ─── Context serialize/deserialize round-trip ───
  it('Context serialize/deserialize round-trip', async () => {
    const engine = new ContextEngine();
    const serializer = new ContextSerializer();

    engine.registerProvider({
      name: 'ser-provider',
      async provide() {
        return [
          {
            key: 'ser.key',
            value: { nested: { data: true } },
            source: ContextSource.Knowledge,
            priority: ContextPriority.High,
            createdAt: new Date().toISOString(),
            tags: ['test-tag'],
          },
        ];
      },
    });

    const context = await engine.buildContext('sess-1', 'exec-1');
    expect(context).not.toBeNull();

    const json = serializer.serialize(context);
    expect(json).not.toBeNull();

    const restored = serializer.deserialize(json);
    expect(restored).not.toBeNull();
    expect(restored.contextId).toBe(context.contextId);
    expect(restored).toBeDefined();
  });

  // ─── Memory entry round-trip (via JSON) ───
  it('Memory entry serialize/deserialize round-trip', async () => {
    const runtime = new MemoryRuntime({ enableIsolation: false });
    const entry = await runtime.store('persistent', 'mem.roundtrip', 'value', {
      metadata: { source: 'test' },
    });
    expect(entry).not.toBeNull();

    // Simulate serialization
    const json = JSON.stringify({
      id: entry.id,
      key: entry.key,
      value: entry.value,
      layer: entry.layer,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      accessCount: entry.accessCount,
      metadata: entry.metadata,
    });

    const parsed = JSON.parse(json);
    expect(parsed.key).toBe('mem.roundtrip');
    expect(parsed.value).toBe('value');
    expect(parsed.layer).toBe('persistent');
    expect(parsed.metadata).not.toBeNull();
    expect(parsed.metadata.source).toBe('test');
  });

  // ─── Checkpoint serialize/deserialize round-trip ───
  it('Checkpoint serialize/deserialize round-trip', () => {
    const engine = new CheckpointEngine();
    const checkpoint = engine.createCheckpoint({
      executionId: 'exec-ser',
      goalId: 'goal-ser',
      stage: 'step-completed',
      executionState: 'Running',
      variables: { progress: 75, labels: ['a', 'b'] },
      completedSteps: ['step-1', 'step-2'],
      pendingSteps: ['step-3'],
      metadata: { trace: 'integration-test' },
    });

    const serialized = engine.serialize(checkpoint);
    expect(serialized).not.toBeNull();
    expect(typeof serialized.checkpointId).toBe('string');

    const deserialized = engine.deserialize(serialized);
    expect(deserialized).not.toBeNull();
    expect(deserialized.executionId).toBe(checkpoint.executionId);
    expect(deserialized.stage).toBe(checkpoint.stage);
    expect(deserialized.variables.progress).toBe(75);
    expect(deserialized.completedSteps.length).toBe(2);
    expect(deserialized.pendingSteps.length).toBe(1);
    expect(deserialized.metadata).not.toBeNull();
    expect(deserialized.metadata!.trace).toBe('integration-test');
  });

  // ─── Recovery plan serialize/deserialize round-trip ───
  it('Recovery plan serialize/deserialize round-trip', async () => {
    const runtime = new RecoveryRuntime();
    const plan = await runtime.recover('exec-1', {
      sessionId: 'sess-1',
      checkpointId: 'cp-1',
    });
    expect(plan.status).toBe(RecoveryStatus.Ready);

    const serialized = runtime.serializePlan(plan);
    const deserialized = runtime.deserializePlan(serialized);

    expect(deserialized.executionId).toBe(plan.executionId);
    expect(deserialized.sessionId).toBe(plan.sessionId);
    expect(deserialized.checkpointId).toBe(plan.checkpointId);
    expect(deserialized.status).toBe(plan.status);
    expect(deserialized.steps.length).toBe(plan.steps.length);
    expect(deserialized.restoredState).not.toBeNull();
    expect(deserialized.restoredState!.executionId).toBe(plan.executionId);
  });

  // ─── Branded IDs correctly round-trip ───
  it('Session branded ID correctly round-trips', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession();
    const id = session.id;

    // Serialize strips branding
    const serialized = runtime.serializeSession(session);
    expect(typeof serialized.id).toBe('string');

    // Deserialize restores branding
    const deserialized = runtime.deserializeSession(serialized);
    // The deserialized ID should equal the original
    expect(deserialized.id).toBe(id);
  });
  it('Checkpoint branded ID correctly round-trips', () => {
    const engine = new CheckpointEngine();
    const cp = engine.createCheckpoint({
      executionId: 'exec-id-rt',
      goalId: 'goal-id-rt',
      stage: 'planning',
      executionState: 'Ready',
      variables: {},
      completedSteps: [],
      pendingSteps: [],
    });

    const serialized = engine.serialize(cp);
    expect(typeof serialized.checkpointId).toBe('string');

    const deserialized = engine.deserialize(serialized);
    expect(deserialized.checkpointId).toBe(cp.checkpointId);
  });
  it('Recovery branded ID correctly round-trips', async () => {
    const runtime = new RecoveryRuntime();
    const plan = await runtime.recover('exec-rt');

    const serialized = runtime.serializePlan(plan);
    expect(typeof serialized.recoveryId).toBe('string');

    const deserialized = runtime.deserializePlan(serialized);
    expect(deserialized.recoveryId as unknown as string).toBe(plan.recoveryId as unknown as string);
  });

  // ─── Readonly arrays correctly round-trip ───
  it('Readonly arrays in checkpoint round-trip', () => {
    const engine = new CheckpointEngine();
    const cp = engine.createCheckpoint({
      executionId: 'exec-ro',
      goalId: 'goal-ro',
      stage: 'step-completed',
      executionState: 'Running',
      variables: { items: [1, 2, 3] },
      completedSteps: ['a', 'b', 'c'],
      pendingSteps: ['d', 'e'],
    });

    const serialized = engine.serialize(cp);
    const deserialized = engine.deserialize(serialized);

    expect(deserialized.completedSteps.length).toBe(3);
    expect(deserialized.pendingSteps.length).toBe(2);
    expect((deserialized.variables.items as number[]).length).toBe(3);
  });

  // ─── Nested metadata correctly round-trip ───
  it('Nested metadata in checkpoint round-trip', () => {
    const engine = new CheckpointEngine();
    const metadata = {
      level1: {
        level2: {
          level3: 'deep-value',
        },
        array: [1, 2, { nested: true }],
      },
    };

    const cp = engine.createCheckpoint({
      executionId: 'exec-nested',
      goalId: 'goal-nested',
      stage: 'planning',
      executionState: 'Ready',
      variables: {},
      completedSteps: [],
      pendingSteps: [],
      metadata,
    });

    const serialized = engine.serialize(cp);
    const deserialized = engine.deserialize(serialized);

    expect(deserialized.metadata).not.toBeNull();
    expect(
      (deserialized.metadata as any).level1.level2.level3,
    ).toBe('deep-value');
    expect(
      (deserialized.metadata as any).level1.array.length,
    ).toBe(3);
  });
  it('Nested metadata in session round-trip', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession({
      nested: {
        deep: { value: 42 },
        tags: ['a', 'b'],
      },
    });

    const serialized = runtime.serializeSession(session);
    const deserialized = runtime.deserializeSession(serialized);

    expect(
      (deserialized.metadata.nested as any).deep.value,
    ).toBe(42);
    expect(
      (deserialized.metadata.nested as any).tags.length,
    ).toBe(2);
  });

  // ─── Complex variables in checkpoint round-trip ───
  it('Complex variables in checkpoint round-trip', () => {
    const engine = new CheckpointEngine();
    const cp = engine.createCheckpoint({
      executionId: 'exec-complex',
      goalId: 'goal-complex',
      stage: 'step-completed',
      executionState: 'Running',
      variables: {
        stringVal: 'hello',
        numberVal: 42,
        boolVal: true,
        nullVal: null,
        arrayVal: [{ a: 1 }, { b: 2 }],
        objectVal: { nested: { x: 'y' } },
      },
      completedSteps: [],
      pendingSteps: [],
    });

    const serialized = engine.serialize(cp);
    const deserialized = engine.deserialize(serialized);

    expect(deserialized.variables.stringVal).toBe('hello');
    expect(deserialized.variables.numberVal).toBe(42);
    expect(deserialized.variables.boolVal).toBe(true);
    expect(deserialized.variables.nullVal).toBe(null);
    expect((deserialized.variables.arrayVal as any[]).length).toBe(2);
    expect((deserialized.variables.objectVal as any).nested.x).toBe('y');
  });
});
