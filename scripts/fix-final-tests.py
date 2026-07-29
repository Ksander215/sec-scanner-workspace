#!/usr/bin/env python3
"""Final fixes for remaining test failures."""
import os

BASE = "/home/z/my-project/repo/src/__tests__/core"

def write(path_rel, content):
    full = os.path.join(BASE, path_rel)
    with open(full, "w") as f:
        f.write(content)

# ─── Checkpoint Store Tests — rewrite with correct API ───
write("checkpoint/checkpoint-store.test.ts", '''import { describe, it, expect } from 'vitest';
import { InMemoryCheckpointStorageAdapter } from '../../../core/checkpoint/checkpoint-store.js';
import type { SerializableCheckpoint } from '../../../core/checkpoint/types.js';

function makeCheckpoint(id: string, execId: string): SerializableCheckpoint {
  return {
    checkpointId: id, executionId: execId, goalId: 'g', planId: undefined,
    stage: 'planning', status: 'valid', createdAt: '2025-01-01T00:00:00.000Z',
    executionState: 'Running', variables: {}, completedSteps: [], pendingSteps: [],
  };
}

describe('InMemoryCheckpointStorageAdapter', () => {
  it('saves and loads data', async () => {
    const adapter = new InMemoryCheckpointStorageAdapter();
    await adapter.save(makeCheckpoint('cp-1', 'exec-1'));
    const loaded = await adapter.load('cp-1');
    expect(loaded).not.toBeNull();
    expect(loaded!.checkpointId).toBe('cp-1');
  });

  it('load returns null for missing key', async () => {
    const adapter = new InMemoryCheckpointStorageAdapter();
    expect(await adapter.load('missing')).toBeNull();
  });

  it('delete removes data', async () => {
    const adapter = new InMemoryCheckpointStorageAdapter();
    await adapter.save(makeCheckpoint('cp-1', 'exec-1'));
    const deleted = await adapter.delete('cp-1');
    expect(deleted).toBe(true);
    expect(await adapter.load('cp-1')).toBeNull();
  });

  it('delete returns false for missing key', async () => {
    const adapter = new InMemoryCheckpointStorageAdapter();
    expect(await adapter.delete('missing')).toBe(false);
  });

  it('listByExecution returns checkpoints for execution', async () => {
    const adapter = new InMemoryCheckpointStorageAdapter();
    await adapter.save(makeCheckpoint('cp-1', 'exec-1'));
    await adapter.save(makeCheckpoint('cp-2', 'exec-2'));
    await adapter.save(makeCheckpoint('cp-3', 'exec-1'));
    const results = await adapter.listByExecution('exec-1');
    expect(results).toHaveLength(2);
    expect(results.every(r => r.executionId === 'exec-1')).toBe(true);
  });

  it('listAll returns all checkpoints', async () => {
    const adapter = new InMemoryCheckpointStorageAdapter();
    await adapter.save(makeCheckpoint('cp-1', 'exec-1'));
    await adapter.save(makeCheckpoint('cp-2', 'exec-2'));
    const all = await adapter.listAll();
    expect(all).toHaveLength(2);
  });

  it('handles complex JSON in variables and metadata', async () => {
    const adapter = new InMemoryCheckpointStorageAdapter();
    const cp: SerializableCheckpoint = {
      ...makeCheckpoint('cp-complex', 'exec-1'),
      variables: { nested: { x: true }, arr: [1, 2, 3] },
      metadata: { trace: 'test', info: { level: 2 } },
    };
    await adapter.save(cp);
    const loaded = await adapter.load('cp-complex');
    expect(loaded).not.toBeNull();
    expect((loaded!.variables as any).nested.x).toBe(true);
    expect((loaded!.metadata as any).trace).toBe('test');
  });

  it('returns defensive copies', async () => {
    const adapter = new InMemoryCheckpointAdapter();
    const cp: SerializableCheckpoint = {
      ...makeCheckpoint('cp-dc', 'exec-1'),
      variables: { original: true },
    };
    await adapter.save(cp);
    const loaded = await adapter.load('cp-dc');
    // Mutating loaded copy should not affect stored
    (loaded!.variables as any).original = false;
    const loaded2 = await adapter.load('cp-dc');
    expect((loaded2!.variables as any).original).toBe(true);
  });
});
''')

# ─── Checkpoint Engine Tests — remove tests for non-existent methods ───
write("checkpoint/checkpoint-engine.test.ts", '''import { describe, it, expect } from 'vitest';
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
''')

# ─── Checkpoint Errors Tests — fix field names
write("checkpoint/checkpoint-errors.test.ts", '''import { describe, it, expect } from 'vitest';
import {
  CheckpointError, CheckpointNotFoundError, CheckpointCorruptedError, CheckpointStateError,
} from '../../../core/checkpoint/errors.js';

describe('CheckpointErrors', () => {
  it('CheckpointError has code', () => {
    const err = new CheckpointError('test', 'CP_CODE');
    expect(err.code).toBe('CP_CODE');
    expect(err.name).toBe('CheckpointError');
    expect(err).toBeInstanceOf(Error);
  });

  it('CheckpointNotFoundError has checkpointId', () => {
    const err = new CheckpointNotFoundError('cp-1');
    expect(err.code).toBe('CHECKPOINT_NOT_FOUND');
    expect(err.checkpointId).toBe('cp-1');
    expect(err).toBeInstanceOf(CheckpointError);
  });

  it('CheckpointCorruptedError has contextId', () => {
    const err = new CheckpointCorruptedError('invalid data', 'ctx-1');
    expect(err.code).toBe('CHECKPOINT_CORRUPTED');
    expect(err.contextId).toBe('ctx-1');
    expect(err).toBeInstanceOf(CheckpointError);
  });

  it('CheckpointStateError has currentStatus', () => {
    const err = new CheckpointStateError('consumed');
    expect(err.code).toBe('CHECKPOINT_INVALID_STATE');
    expect(err.currentStatus).toBe('consumed');
    expect(err).toBeInstanceOf(CheckpointError);
  });

  it('all errors are instanceof Error', () => {
    expect(new CheckpointError('m', 'c') instanceof Error).toBe(true);
    expect(new CheckpointNotFoundError('x') instanceof Error).toBe(true);
    expect(new CheckpointCorruptedError('x', 'c') instanceof Error).toBe(true);
    expect(new CheckpointStateError('s') instanceof Error).toBe(true);
  });
});
''')

print("Done! Rewrote checkpoint tests with correct API.")

# ─── Context Policy Tests — fix canAddEntry result type ───
# Check what canAddEntry actually returns
# Already wrote above, but let's check if shouldEvict exists
