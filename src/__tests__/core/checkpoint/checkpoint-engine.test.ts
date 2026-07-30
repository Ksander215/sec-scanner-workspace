import { describe, it, expect } from 'vitest';
import { CheckpointEngine } from '../../../core/checkpoint/checkpoint-engine.js';
import { InProcessEventBus } from '../../../core/events/event-bus.js';

describe('CheckpointEngine', () => {
  it('creates a checkpoint', () => {
    const engine = new CheckpointEngine();
    const cp = engine.createCheckpoint({
      executionId: 'exec-1', goalId: 'goal-1', stage: 'planning',
      executionState: 'Running', variables: {}, completedSteps: [], pendingSteps: [],
    });
    expect(cp.executionId).toBe('exec-1');
    expect(cp.status).toBe('valid');
  });

  it('creates checkpoint with all fields', () => {
    const engine = new CheckpointEngine();
    const cp = engine.createCheckpoint({
      executionId: 'exec-1', goalId: 'goal-1', stage: 'step-completed',
      executionState: 'Running', variables: { step: 2 },
      completedSteps: ['step-1', 'step-2'], pendingSteps: ['step-3'],
      metadata: { trace: 'test' },
    });
    expect(cp.completedSteps).toEqual(['step-1', 'step-2']);
    expect(cp.pendingSteps).toEqual(['step-3']);
    expect(cp.variables.step).toBe(2);
    expect(cp.metadata!.trace).toBe('test');
  });

  it('getCheckpoint returns created checkpoint', () => {
    const engine = new CheckpointEngine();
    const cp = engine.createCheckpoint({
      executionId: 'exec-1', goalId: 'goal-1', stage: 'planning',
      executionState: 'Running', variables: {}, completedSteps: [], pendingSteps: [],
    });
    const fetched = engine.getCheckpoint(cp.checkpointId);
    expect(fetched).not.toBeNull();
    expect(fetched!.executionId).toBe('exec-1');
  });

  it('getCheckpoint returns null for unknown', () => {
    const engine = new CheckpointEngine();
    expect(engine.getCheckpoint('unknown')).toBeNull();
  });

  it('publishes CheckpointCreated event', () => {
    const bus = new InProcessEventBus();
    const engine = new CheckpointEngine({ eventBus: bus });
    engine.createCheckpoint({
      executionId: 'exec-1', goalId: 'g', stage: 'p',
      executionState: 'R', variables: {}, completedSteps: [], pendingSteps: [],
    });
    const log = bus.getLog();
    expect(log.some(e => e.eventType === 'CheckpointCreated')).toBe(true);
  });

  it('serialize and deserialize round-trip', () => {
    const engine = new CheckpointEngine();
    const cp = engine.createCheckpoint({
      executionId: 'exec-ser', goalId: 'goal-ser', stage: 'step-completed',
      executionState: 'Running', variables: { progress: 75 },
      completedSteps: ['step-1'], pendingSteps: ['step-3'],
      metadata: { trace: 'test' },
    });
    const serialized = engine.serialize(cp);
    const deserialized = engine.deserialize(serialized);
    expect(deserialized.executionId).toBe('exec-ser');
    expect(deserialized.variables.progress).toBe(75);
  });

  it('branded ID round-trips', () => {
    const engine = new CheckpointEngine();
    const cp = engine.createCheckpoint({
      executionId: 'exec-rt', goalId: 'g', stage: 'p',
      executionState: 'R', variables: {}, completedSteps: [], pendingSteps: [],
    });
    const serialized = engine.serialize(cp);
    expect(typeof serialized.checkpointId).toBe('string');
    const deserialized = engine.deserialize(serialized);
    expect(deserialized.checkpointId).toBe(cp.checkpointId);
  });

  it('deep copy prevents mutation', () => {
    const engine = new CheckpointEngine();
    const vars: Record<string, unknown> = { x: 1 };
    const cp = engine.createCheckpoint({
      executionId: 'exec-dc', goalId: 'g', stage: 'p',
      executionState: 'R', variables: vars, completedSteps: [], pendingSteps: [],
    });
    vars.x = 999;
    expect(engine.getCheckpoint(cp.checkpointId)!.variables.x).toBe(1);
  });

  it('load returns null for unknown', async () => {
    const engine = new CheckpointEngine();
    expect(await engine.load('unknown')).toBeNull();
  });

  it('nested metadata survives round-trip', () => {
    const engine = new CheckpointEngine();
    const cp = engine.createCheckpoint({
      executionId: 'exec-nm', goalId: 'g', stage: 'p',
      executionState: 'R', variables: {}, completedSteps: [], pendingSteps: [],
      metadata: { level1: { level2: { level3: 'deep' } } },
    });
    const deserialized = engine.deserialize(engine.serialize(cp));
    expect((deserialized.metadata as any).level1.level2.level3).toBe('deep');
  });
});
