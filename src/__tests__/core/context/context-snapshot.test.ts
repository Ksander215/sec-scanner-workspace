import { describe, it, expect } from 'vitest';
import { ContextSnapshotManager } from '../../../core/context/context-snapshot.js';
import { ContextSource, ContextPriority } from '../../../core/context/types.js';
import type { UnifiedContext } from '../../../core/context/types.js';

function makeContext(id: string): UnifiedContext {
  return {
    contextId: id as any, version: 'v1-0' as any,
    createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
    entries: new Map([
      ['key1', { key: 'key1', value: 'value1', source: ContextSource.Session, priority: ContextPriority.Normal, createdAt: '2025-01-01T00:00:00.000Z' }],
    ]),
    metadata: {}, sizeBytes: 64,
  };
}

describe('ContextSnapshotManager', () => {
  it('creates a snapshot with correct trigger', () => {
    const mgr = new ContextSnapshotManager();
    const ctx = makeContext('ctx-1');
    const snap = mgr.createSnapshot(ctx, 'manual');
    expect(snap).not.toBeNull();
    expect(snap!.trigger).toBe('manual');
    expect(snap!.contextId).toBe('ctx-1');
  });

  it('creates snapshots with different triggers', () => {
    const mgr = new ContextSnapshotManager();
    const ctx = makeContext('ctx-1');
    const s1 = mgr.createSnapshot(ctx, 'checkpoint');
    const s2 = mgr.createSnapshot(ctx, 'auto');
    const s3 = mgr.createSnapshot(ctx, 'manual');
    expect(s1!.trigger).toBe('checkpoint');
    expect(s2!.trigger).toBe('auto');
    expect(s3!.trigger).toBe('manual');
  });

  it('snapshot has unique IDs', () => {
    const mgr = new ContextSnapshotManager();
    const ctx = makeContext('ctx-1');
    const s1 = mgr.createSnapshot(ctx, 'manual');
    const s2 = mgr.createSnapshot(ctx, 'manual');
    expect(s1!.snapshotId).not.toBe(s2!.snapshotId);
  });

  it('snapshot stores context data', () => {
    const mgr = new ContextSnapshotManager();
    const ctx = makeContext('ctx-1');
    const snap = mgr.createSnapshot(ctx, 'manual');
    // context is SerializableContext (array-based)
    expect(snap!.context).toBeDefined();
    expect(typeof snap!.context === 'object').toBe(true);
  });

  it('restoreFromSnapshot reconstructs context', () => {
    const mgr = new ContextSnapshotManager();
    const ctx = makeContext('ctx-1');
    const snap = mgr.createSnapshot(ctx, 'manual');
    const restored = mgr.restoreFromSnapshot(snap!);
    expect(restored.contextId).toBe('ctx-1');
    expect(restored.entries.size).toBe(1);
  });

  it('serializeSnapshot produces JSON string', () => {
    const mgr = new ContextSnapshotManager();
    const ctx = makeContext('ctx-1');
    const snap = mgr.createSnapshot(ctx, 'manual');
    const json = mgr.serializeSnapshot(snap!);
    expect(typeof json).toBe('string');
    const parsed = JSON.parse(json);
    expect(parsed.snapshotId).toBeDefined();
  });

  it('deserializeSnapshot restores from JSON', () => {
    const mgr = new ContextSnapshotManager();
    const ctx = makeContext('ctx-1');
    const snap = mgr.createSnapshot(ctx, 'manual');
    const json = mgr.serializeSnapshot(snap!);
    const restored = mgr.deserializeSnapshot(json);
    expect(restored.snapshotId).toBe(snap!.snapshotId);
    expect(restored.contextId).toBe('ctx-1');
  });

  it('deserializeSnapshot throws on invalid JSON', () => {
    const mgr = new ContextSnapshotManager();
    expect(() => mgr.deserializeSnapshot('not-json')).toThrow();
  });

  it('snapshot with metadata', () => {
    const mgr = new ContextSnapshotManager();
    const ctx = makeContext('ctx-1');
    const snap = mgr.createSnapshot(ctx, 'checkpoint', { reason: 'stage-complete' });
    expect(snap!.metadata).toBeDefined();
    expect((snap!.metadata as any).reason).toBe('stage-complete');
  });
});
