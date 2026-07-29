import { describe, it, expect } from 'vitest';
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
    const adapter = new InMemoryCheckpointStorageAdapter();
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
