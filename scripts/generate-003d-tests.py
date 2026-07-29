#!/usr/bin/env python3
"""Generate vitest test files for TASK-AIS-003D modules that lack dedicated tests."""
import os

BASE = "/home/z/my-project/repo/src/__tests__/core"

def write_file(rel_path, content):
    full = os.path.join(BASE, rel_path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w") as f:
        f.write(content)
    print(f"  wrote {full}")

# ─── Context Error Tests ───
write_file("context/context-errors.test.ts", '''import { describe, it, expect } from 'vitest';
import {
  ContextError, ContextNotFoundError, ContextSizeExceededError,
  ContextValidationError, ContextIsolationError, ContextSerializationError,
  ContextDeserializationError, SnapshotNotFoundError, SnapshotCorruptedError,
} from '../../../core/context/errors.js';

describe('ContextErrors', () => {
  it('ContextError has correct code and name', () => {
    const err = new ContextError('test', 'CTX_CODE');
    expect(err.name).toBe('ContextError');
    expect(err.code).toBe('CTX_CODE');
    expect(err.message).toBe('test');
    expect(err).toBeInstanceOf(Error);
  });

  it('ContextNotFoundError has contextId', () => {
    const err = new ContextNotFoundError('ctx-123');
    expect(err.name).toBe('ContextNotFoundError');
    expect(err.code).toBe('CONTEXT_NOT_FOUND');
    expect(err.contextId).toBe('ctx-123');
    expect(err).toBeInstanceOf(ContextError);
  });

  it('ContextSizeExceededError has size info', () => {
    const err = new ContextSizeExceededError(500, 1000);
    expect(err.name).toBe('ContextSizeExceededError');
    expect(err.code).toBe('CONTEXT_SIZE_EXCEEDED');
    expect(err.actualSize).toBe(500);
    expect(err.maxSize).toBe(1000);
    expect(err).toBeInstanceOf(ContextError);
  });

  it('ContextValidationError has details', () => {
    const err = new ContextValidationError('invalid entry');
    expect(err.name).toBe('ContextValidationError');
    expect(err.code).toBe('CONTEXT_VALIDATION_FAILED');
    expect(err.message).toBe('invalid entry');
    expect(err).toBeInstanceOf(ContextError);
  });

  it('ContextIsolationError has contextIds', () => {
    const err = new ContextIsolationError('ctx-a', 'ctx-b');
    expect(err.name).toBe('ContextIsolationError');
    expect(err.code).toBe('CONTEXT_ISOLATION_VIOLATION');
    expect(err).toBeInstanceOf(ContextError);
  });

  it('ContextSerializationError', () => {
    const err = new ContextSerializationError('bad data');
    expect(err.code).toBe('CONTEXT_SERIALIZATION_FAILED');
    expect(err).toBeInstanceOf(ContextError);
  });

  it('ContextDeserializationError', () => {
    const err = new ContextDeserializationError('bad json');
    expect(err.code).toBe('CONTEXT_DESERIALIZATION_FAILED');
    expect(err).toBeInstanceOf(ContextError);
  });

  it('SnapshotNotFoundError has snapshotId', () => {
    const err = new SnapshotNotFoundError('snap-1');
    expect(err.code).toBe('SNAPSHOT_NOT_FOUND');
    expect(err.snapshotId).toBe('snap-1');
    expect(err).toBeInstanceOf(ContextError);
  });

  it('SnapshotCorruptedError has snapshotId', () => {
    const err = new SnapshotCorruptedError('snap-2', 'invalid format');
    expect(err.code).toBe('SNAPSHOT_CORRUPTED');
    expect(err.snapshotId).toBe('snap-2');
    expect(err).toBeInstanceOf(ContextError);
  });

  it('all errors are instances of Error', () => {
    expect(new ContextError('m', 'c') instanceof Error).toBe(true);
    expect(new ContextNotFoundError('x') instanceof Error).toBe(true);
    expect(new SnapshotNotFoundError('x') instanceof Error).toBe(true);
    expect(new SnapshotCorruptedError('x', 'r') instanceof Error).toBe(true);
  });
});
''')

# ─── Context Cache Tests ───
write_file("context/context-cache.test.ts", '''import { describe, it, expect } from 'vitest';
import { ContextCache } from '../../../core/context/context-cache.js';
import type { UnifiedContext } from '../../../core/context/types.js';

function makeContext(id: string): UnifiedContext {
  return {
    contextId: id as any,
    version: 'v1-0' as any,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    entries: new Map(),
    metadata: {},
    sizeBytes: 0,
  };
}

describe('ContextCache', () => {
  it('throws if maxSize < 1', () => {
    expect(() => new ContextCache(0)).toThrow('maxSize must be at least 1');
    expect(() => new ContextCache(-1)).toThrow('maxSize must be at least 1');
  });

  it('set and get a context', () => {
    const cache = new ContextCache(5);
    const ctx = makeContext('ctx-1');
    cache.set('ctx-1', ctx);
    const result = cache.get('ctx-1');
    expect(result).not.toBeNull();
    expect(result!.contextId).toBe('ctx-1');
  });

  it('get returns null for missing key', () => {
    const cache = new ContextCache(5);
    expect(cache.get('nope')).toBeNull();
  });

  it('has returns true for existing', () => {
    const cache = new ContextCache(5);
    cache.set('ctx-1', makeContext('ctx-1'));
    expect(cache.has('ctx-1')).toBe(true);
  });

  it('has returns false for missing', () => {
    const cache = new ContextCache(5);
    expect(cache.has('nope')).toBe(false);
  });

  it('delete removes entry', () => {
    const cache = new ContextCache(5);
    cache.set('ctx-1', makeContext('ctx-1'));
    expect(cache.delete('ctx-1')).toBe(true);
    expect(cache.get('ctx-1')).toBeNull();
  });

  it('delete returns false for missing', () => {
    const cache = new ContextCache(5);
    expect(cache.delete('nope')).toBe(false);
  });

  it('clear removes all entries', () => {
    const cache = new ContextCache(5);
    cache.set('a', makeContext('a'));
    cache.set('b', makeContext('b'));
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeNull();
  });

  it('size tracks count correctly', () => {
    const cache = new ContextCache(5);
    expect(cache.size).toBe(0);
    cache.set('a', makeContext('a'));
    expect(cache.size).toBe(1);
    cache.set('b', makeContext('b'));
    expect(cache.size).toBe(2);
    cache.delete('a');
    expect(cache.size).toBe(1);
  });

  it('evicts LRU entry when maxSize exceeded', () => {
    const cache = new ContextCache(2);
    cache.set('a', makeContext('a'));
    cache.set('b', makeContext('b'));
    cache.set('c', makeContext('c'));
    expect(cache.size).toBe(2);
    // 'a' should be evicted (oldest)
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).not.toBeNull();
    expect(cache.get('c')).not.toBeNull();
  });

  it('updating existing entry does not increase size', () => {
    const cache = new ContextCache(2);
    cache.set('a', makeContext('a'));
    cache.set('a', makeContext('a'));
    expect(cache.size).toBe(1);
  });

  it('get updates access time (prevents LRU eviction)', () => {
    const cache = new ContextCache(2);
    cache.set('a', makeContext('a'));
    cache.set('b', makeContext('b'));
    // Access 'a' to make it recently used
    cache.get('a');
    // Add 'c' — should evict 'b' (least recently used), not 'a'
    cache.set('c', makeContext('c'));
    expect(cache.get('a')).not.toBeNull();
    expect(cache.get('b')).toBeNull();
    expect(cache.get('c')).not.toBeNull();
  });
});
''')

# ─── Context Serializer Tests ───
write_file("context/context-serializer.test.ts", '''import { describe, it, expect } from 'vitest';
import { ContextSerializer } from '../../../core/context/context-serializer.js';
import { ContextSource, ContextPriority } from '../../../core/context/types.js';
import type { UnifiedContext } from '../../../core/context/types.js';

function makeContext(overrides?: Partial<UnifiedContext>): UnifiedContext {
  return {
    contextId: 'test-ctx' as any,
    version: 'v1-0' as any,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    entries: new Map([
      ['key1', {
        key: 'key1', value: 'value1',
        source: ContextSource.Session, priority: ContextPriority.High,
        createdAt: '2025-01-01T00:00:00.000Z',
      }],
    ]),
    metadata: { tag: 'test' },
    sizeBytes: 128,
    ...overrides,
  };
}

describe('ContextSerializer', () => {
  it('serializes a context to JSON string', () => {
    const serializer = new ContextSerializer();
    const ctx = makeContext();
    const json = serializer.serialize(ctx);
    expect(typeof json).toBe('string');
    const parsed = JSON.parse(json);
    expect(parsed.contextId).toBe('test-ctx');
    expect(parsed.entries).toHaveLength(1);
  });

  it('deserializes JSON back to UnifiedContext', () => {
    const serializer = new ContextSerializer();
    const ctx = makeContext();
    const json = serializer.serialize(ctx);
    const restored = serializer.deserialize(json);
    expect(restored.contextId).toBe('test-ctx');
    expect(restored.entries.size).toBe(1);
    expect(restored.entries.get('key1')!.value).toBe('value1');
  });

  it('round-trip preserves all fields', () => {
    const serializer = new ContextSerializer();
    const ctx = makeContext({
      sessionId: 'sess-1',
      executionId: 'exec-1',
    });
    const json = serializer.serialize(ctx);
    const restored = serializer.deserialize(json);
    expect(restored.sessionId).toBe('sess-1');
    expect(restored.executionId).toBe('exec-1');
    expect(restored.metadata.tag).toBe('test');
  });

  it('round-trip with complex values', () => {
    const serializer = new ContextSerializer();
    const ctx = makeContext({
      entries: new Map([
        ['complex', {
          key: 'complex', value: { nested: { arr: [1, 2] }, flag: true },
          source: ContextSource.Knowledge, priority: ContextPriority.Normal,
          createdAt: '2025-01-01T00:00:00.000Z',
          tags: ['test-tag'],
          expiresAt: '2025-12-31T00:00:00.000Z',
        }],
      ]),
    });
    const json = serializer.serialize(ctx);
    const restored = serializer.deserialize(json);
    const entry = restored.entries.get('complex')!;
    expect((entry.value as any).nested.arr).toEqual([1, 2]);
    expect(entry.tags).toEqual(['test-tag']);
    expect(entry.expiresAt).toBe('2025-12-31T00:00:00.000Z');
  });

  it('throws on invalid JSON', () => {
    const serializer = new ContextSerializer();
    expect(() => serializer.deserialize('not-json')).toThrow();
  });

  it('throws on missing contextId', () => {
    const serializer = new ContextSerializer();
    expect(() => serializer.deserialize('{}')).toThrow();
  });

  it('preserves multiple entries', () => {
    const serializer = new ContextSerializer();
    const ctx = makeContext({
      entries: new Map([
        ['a', { key: 'a', value: 1, source: ContextSource.Configuration, priority: ContextPriority.Low, createdAt: '2025-01-01T00:00:00.000Z' }],
        ['b', { key: 'b', value: 2, source: ContextSource.Runtime, priority: ContextPriority.High, createdAt: '2025-01-01T00:00:00.000Z' }],
        ['c', { key: 'c', value: 3, source: ContextSource.Session, priority: ContextPriority.Normal, createdAt: '2025-01-01T00:00:00.000Z' }],
      ]),
    });
    const json = serializer.serialize(ctx);
    const restored = serializer.deserialize(json);
    expect(restored.entries.size).toBe(3);
    expect(restored.entries.get('a')!.value).toBe(1);
    expect(restored.entries.get('b')!.value).toBe(2);
    expect(restored.entries.get('c')!.value).toBe(3);
  });

  it('handles empty context', () => {
    const serializer = new ContextSerializer();
    const ctx = makeContext({ entries: new Map(), sizeBytes: 0 });
    const json = serializer.serialize(ctx);
    const restored = serializer.deserialize(json);
    expect(restored.entries.size).toBe(0);
  });
});
''')

# ─── Context Builder Tests ───
write_file("context/context-builder.test.ts", '''import { describe, it, expect } from 'vitest';
import { ContextBuilder, type ContextSourceProvider } from '../../../core/context/context-builder.js';
import { ContextSource, ContextPriority } from '../../../core/context/types.js';

describe('ContextBuilder', () => {
  it('builds context with no providers', async () => {
    const builder = new ContextBuilder();
    const ctx = await builder.build();
    expect(ctx).not.toBeNull();
    expect(ctx!.entries.size).toBe(0);
  });

  it('builds context with one provider', async () => {
    const builder = new ContextBuilder();
    builder.registerProvider({
      name: 'test-provider',
      async provide() {
        return [{ key: 'k', value: 'v', source: ContextSource.Session, priority: ContextPriority.Normal, createdAt: new Date().toISOString() }];
      },
    });
    const ctx = await builder.build();
    expect(ctx!.entries.size).toBe(1);
    expect(ctx!.entries.get('k')!.value).toBe('v');
  });

  it('builds context with multiple providers', async () => {
    const builder = new ContextBuilder();
    builder.registerProvider({
      name: 'p1',
      async provide() {
        return [{ key: 'a', value: 1, source: ContextSource.Configuration, priority: ContextPriority.Normal, createdAt: new Date().toISOString() }];
      },
    });
    builder.registerProvider({
      name: 'p2',
      async provide() {
        return [{ key: 'b', value: 2, source: ContextSource.Runtime, priority: ContextPriority.High, createdAt: new Date().toISOString() }];
      },
    });
    const ctx = await builder.build();
    expect(ctx!.entries.size).toBe(2);
  });

  it('higher priority wins on key conflict', async () => {
    const builder = new ContextBuilder();
    builder.registerProvider({
      name: 'low',
      async provide() {
        return [{ key: 'conflict', value: 'low', source: ContextSource.Configuration, priority: ContextPriority.Low, createdAt: new Date().toISOString() }];
      },
    });
    builder.registerProvider({
      name: 'high',
      async provide() {
        return [{ key: 'conflict', value: 'high', source: ContextSource.Session, priority: ContextPriority.High, createdAt: new Date().toISOString() }];
      },
    });
    const ctx = await builder.build();
    expect(ctx!.entries.get('conflict')!.value).toBe('high');
  });

  it('continues on provider error', async () => {
    const builder = new ContextBuilder();
    builder.registerProvider({
      name: 'failing',
      async provide() { throw new Error('provider fail'); },
    });
    builder.registerProvider({
      name: 'ok',
      async provide() {
        return [{ key: 'safe', value: 'ok', source: ContextSource.Runtime, priority: ContextPriority.Normal, createdAt: new Date().toISOString() }];
      },
    });
    const ctx = await builder.build();
    expect(ctx!.entries.size).toBe(1);
    expect(ctx!.entries.get('safe')!.value).toBe('ok');
  });

  it('sets sessionId and executionId', async () => {
    const builder = new ContextBuilder();
    const ctx = await builder.build('sess-1', 'exec-1');
    expect(ctx!.sessionId).toBe('sess-1');
    expect(ctx!.executionId).toBe('exec-1');
  });

  it('builds with complex entry values', async () => {
    const builder = new ContextBuilder();
    builder.registerProvider({
      name: 'complex',
      async provide() {
        return [{ key: 'data', value: { nested: true, arr: [1, 2] }, source: ContextSource.Knowledge, priority: ContextPriority.Normal, createdAt: new Date().toISOString() }];
      },
    });
    const ctx = await builder.build();
    expect((ctx!.entries.get('data')!.value as any).nested).toBe(true);
  });

  it('entries with tags and expiration', async () => {
    const builder = new ContextBuilder();
    builder.registerProvider({
      name: 'tagged',
      async provide() {
        return [{ key: 't', value: 'v', source: ContextSource.Runtime, priority: ContextPriority.Normal, createdAt: new Date().toISOString(), tags: ['tag1', 'tag2'], expiresAt: '2025-12-31' }];
      },
    });
    const ctx = await builder.build();
    const entry = ctx!.entries.get('t')!;
    expect(entry.tags).toEqual(['tag1', 'tag2']);
    expect(entry.expiresAt).toBe('2025-12-31');
  });

  it('contextId is generated', async () => {
    const builder = new ContextBuilder();
    const ctx = await builder.build();
    expect(ctx!.contextId).toBeDefined();
    expect(typeof ctx!.contextId).toBe('string');
  });

  it('version is set', async () => {
    const builder = new ContextBuilder();
    const ctx = await builder.build();
    expect(ctx!.version).toBeDefined();
  });
});
''')

# ─── Context Resolver Tests ───
write_file("context/context-resolver.test.ts", '''import { describe, it, expect } from 'vitest';
import { ContextResolver } from '../../../core/context/context-resolver.js';
import { ContextSource, ContextPriority } from '../../../core/context/types.js';
import type { UnifiedContext, ContextEntry } from '../../../core/context/types.js';

function makeEntry(key: string, overrides?: Partial<ContextEntry>): ContextEntry {
  return {
    key, value: `val-${key}`, source: ContextSource.Session, priority: ContextPriority.Normal,
    createdAt: '2025-01-01T00:00:00.000Z', ...overrides,
  };
}

function makeContext(entries: ContextEntry[]): UnifiedContext {
  const map = new Map(entries.map(e => [e.key, e]));
  return {
    contextId: 'test' as any, version: 'v1' as any,
    createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
    entries: map, metadata: {}, sizeBytes: 0,
  };
}

describe('ContextResolver', () => {
  const resolver = new ContextResolver();

  it('resolves a key', () => {
    const ctx = makeContext([makeEntry('a'), makeEntry('b')]);
    expect(resolver.resolve(ctx, 'a')!.value).toBe('val-a');
  });

  it('returns undefined for missing key', () => {
    const ctx = makeContext([makeEntry('a')]);
    expect(resolver.resolve(ctx, 'missing')).toBeUndefined();
  });

  it('resolves by source', () => {
    const ctx = makeContext([
      makeEntry('s1', { source: ContextSource.Session }),
      makeEntry('r1', { source: ContextSource.Runtime }),
      makeEntry('s2', { source: ContextSource.Session }),
    ]);
    const results = resolver.resolveBySource(ctx, ContextSource.Session);
    expect(results).toHaveLength(2);
    expect(results.every(e => e.source === ContextSource.Session)).toBe(true);
  });

  it('resolves by tag', () => {
    const ctx = makeContext([
      makeEntry('t1', { tags: ['important', 'user'] }),
      makeEntry('t2', { tags: ['system'] }),
      makeEntry('t3', { tags: ['important'] }),
    ]);
    const results = resolver.resolveByTag(ctx, 'important');
    expect(results).toHaveLength(2);
  });

  it('resolves by priority', () => {
    const ctx = makeContext([
      makeEntry('low', { priority: ContextPriority.Low }),
      makeEntry('high', { priority: ContextPriority.High }),
      makeEntry('normal', { priority: ContextPriority.Normal }),
    ]);
    const results = resolver.resolveByPriority(ctx, ContextPriority.High);
    expect(results).toHaveLength(1);
    expect(results[0]!.key).toBe('high');
  });

  it('resolves expired entries', () => {
    const ctx = makeContext([
      makeEntry('expired', { expiresAt: '2020-01-01T00:00:00.000Z' }),
      makeEntry('valid', { expiresAt: '2030-01-01T00:00:00.000Z' }),
      makeEntry('no-expiry'),
    ]);
    const results = resolver.resolveExpired(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]!.key).toBe('expired');
  });

  it('query with predicate', () => {
    const ctx = makeContext([
      makeEntry('a', { value: 1 }),
      makeEntry('b', { value: 'hello' }),
      makeEntry('c', { value: 3 }),
    ]);
    const results = resolver.query(ctx, e => typeof e.value === 'number');
    expect(results).toHaveLength(2);
  });

  it('query with keyPattern', () => {
    const ctx = makeContext([
      makeEntry('user.name'),
      makeEntry('user.email'),
      makeEntry('system.version'),
    ]);
    const results = resolver.query(ctx, undefined, 'user.');
    expect(results).toHaveLength(2);
  });

  it('query with no filters returns all', () => {
    const ctx = makeContext([makeEntry('a'), makeEntry('b')]);
    const results = resolver.query(ctx);
    expect(results).toHaveLength(2);
  });
});
''')

# ─── Context Snapshot Tests ───
write_file("context/context-snapshot.test.ts", '''import { describe, it, expect } from 'vitest';
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
    expect(snap!.context.contextId).toBe('ctx-1');
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

  it('snapshot captures context entries', () => {
    const mgr = new ContextSnapshotManager();
    const ctx = makeContext('ctx-1');
    const snap = mgr.createSnapshot(ctx, 'manual');
    expect(snap!.context.entries.size).toBe(1);
    expect(snap!.context.entries.get('key1')!.value).toBe('value1');
  });

  it('getSnapshot returns created snapshot', () => {
    const mgr = new ContextSnapshotManager();
    const ctx = makeContext('ctx-1');
    const snap = mgr.createSnapshot(ctx, 'manual');
    const fetched = mgr.getSnapshot(snap!.snapshotId);
    expect(fetched).not.toBeNull();
    expect(fetched!.snapshotId).toBe(snap!.snapshotId);
  });

  it('getSnapshot returns null for unknown', () => {
    const mgr = new ContextSnapshotManager();
    expect(mgr.getSnapshot('unknown')).toBeNull();
  });

  it('listSnapshots returns all', () => {
    const mgr = new ContextSnapshotManager();
    const ctx = makeContext('ctx-1');
    mgr.createSnapshot(ctx, 'manual');
    mgr.createSnapshot(ctx, 'auto');
    expect(mgr.listSnapshots()).toHaveLength(2);
  });

  it('restoreFromSnapshot reconstructs context', () => {
    const mgr = new ContextSnapshotManager();
    const ctx = makeContext('ctx-1');
    const snap = mgr.createSnapshot(ctx, 'manual');
    const restored = mgr.restoreFromSnapshot(snap!);
    expect(restored.contextId).toBe('ctx-1');
    expect(restored.entries.size).toBe(1);
  });

  it('deleteSnapshot removes snapshot', () => {
    const mgr = new ContextSnapshotManager();
    const ctx = makeContext('ctx-1');
    const snap = mgr.createSnapshot(ctx, 'manual');
    expect(mgr.deleteSnapshot(snap!.snapshotId)).toBe(true);
    expect(mgr.getSnapshot(snap!.snapshotId)).toBeNull();
  });

  it('deleteSnapshot returns false for unknown', () => {
    const mgr = new ContextSnapshotManager();
    expect(mgr.deleteSnapshot('unknown')).toBe(false);
  });
});
''')

# ─── Context Engine Tests ───
write_file("context/context-engine.test.ts", '''import { describe, it, expect } from 'vitest';
import { ContextEngine } from '../../../core/context/context-engine.js';
import { InProcessEventBus } from '../../../core/events/event-bus.js';
import { ContextSource, ContextPriority } from '../../../core/context/types.js';
import { EventClassification } from '../../../core/types/common.js';

describe('ContextEngine', () => {
  function makeProvider(name: string, entries: Array<{ key: string; value: unknown; source?: ContextSource; priority?: ContextPriority }>) {
    return {
      name,
      async provide() {
        return entries.map(e => ({
          key: e.key, value: e.value,
          source: e.source ?? ContextSource.Runtime,
          priority: e.priority ?? ContextPriority.Normal,
          createdAt: new Date().toISOString(),
        }));
      },
    };
  }

  it('builds context with registered providers', async () => {
    const engine = new ContextEngine();
    engine.registerProvider(makeProvider('p1', [{ key: 'k', value: 'v' }]));
    const ctx = await engine.buildContext();
    expect(ctx.entries.size).toBeGreaterThanOrEqual(1);
    expect(ctx.entries.get('k')!.value).toBe('v');
  });

  it('builds context with sessionId and executionId', async () => {
    const engine = new ContextEngine();
    const ctx = await engine.buildContext('sess-1', 'exec-1');
    expect(ctx.sessionId).toBe('sess-1');
    expect(ctx.executionId).toBe('exec-1');
  });

  it('publishes ContextCreated event', async () => {
    const bus = new InProcessEventBus();
    const engine = new ContextEngine({ eventBus: bus });
    engine.registerProvider(makeProvider('p', [{ key: 'k', value: 'v' }]));
    await engine.buildContext();
    const log = bus.getLog();
    const created = log.find(e => e.eventType === 'ContextCreated');
    expect(created).toBeDefined();
    expect(created!.classification).toBe(EventClassification.StateChange);
  });

  it('getContext returns built context', async () => {
    const engine = new ContextEngine();
    engine.registerProvider(makeProvider('p', [{ key: 'k', value: 'v' }]));
    const ctx = await engine.buildContext();
    const fetched = engine.getContext(ctx.contextId);
    expect(fetched).not.toBeNull();
    expect(fetched!.contextId).toBe(ctx.contextId);
  });

  it('getContext returns null for unknown', () => {
    const engine = new ContextEngine();
    expect(engine.getContext('unknown')).toBeNull();
  });

  it('resolve returns entry by key', async () => {
    const engine = new ContextEngine();
    engine.registerProvider(makeProvider('p', [{ key: 'resolve-me', value: 42 }]));
    const ctx = await engine.buildContext();
    const entry = engine.resolve(ctx.contextId, 'resolve-me');
    expect(entry).toBeDefined();
    expect(entry!.value).toBe(42);
  });

  it('resolve returns undefined for missing key', async () => {
    const engine = new ContextEngine();
    engine.registerProvider(makeProvider('p', [{ key: 'a', value: 1 }]));
    const ctx = await engine.buildContext();
    expect(engine.resolve(ctx.contextId, 'missing')).toBeUndefined();
  });

  it('updateContext adds new entries', async () => {
    const engine = new ContextEngine();
    engine.registerProvider(makeProvider('p', [{ key: 'existing', value: 'old' }]));
    const ctx = await engine.buildContext();
    const updated = await engine.updateContext(ctx.contextId, [
      { key: 'new-key', value: 'new-val', source: ContextSource.Runtime, priority: ContextPriority.Normal, createdAt: new Date().toISOString() },
    ]);
    expect(updated.entries.has('new-key')).toBe(true);
  });

  it('updateContext throws for unknown contextId', async () => {
    const engine = new ContextEngine();
    await expect(engine.updateContext('unknown', [
      { key: 'k', value: 'v', source: ContextSource.Runtime, priority: ContextPriority.Normal, createdAt: new Date().toISOString() },
    ])).rejects.toThrow();
  });

  it('clearContext removes all entries', async () => {
    const engine = new ContextEngine();
    engine.registerProvider(makeProvider('p', [{ key: 'a', value: 1 }, { key: 'b', value: 2 }]));
    const ctx = await engine.buildContext();
    engine.clearContext(ctx.contextId);
    const cleared = engine.getContext(ctx.contextId);
    expect(cleared!.entries.size).toBe(0);
  });

  it('createSnapshot captures context state', async () => {
    const engine = new ContextEngine();
    engine.registerProvider(makeProvider('p', [{ key: 'snap', value: 'data' }]));
    const ctx = await engine.buildContext();
    const snap = engine.createSnapshot(ctx.contextId, 'manual');
    expect(snap).not.toBeNull();
    expect(snap!.context.entries.size).toBeGreaterThanOrEqual(1);
  });

  it('createSnapshot returns null for unknown contextId', () => {
    const engine = new ContextEngine();
    expect(engine.createSnapshot('unknown', 'manual')).toBeNull();
  });

  it('restoreFromSnapshot recovers entries', async () => {
    const engine = new ContextEngine();
    engine.registerProvider(makeProvider('p', [{ key: 'restore', value: 'original' }]));
    const ctx = await engine.buildContext();
    const snap = engine.createSnapshot(ctx.contextId, 'checkpoint');
    engine.clearContext(ctx.contextId);
    const restored = engine.restoreFromSnapshot(snap!);
    expect(restored.entries.size).toBeGreaterThanOrEqual(1);
  });

  it('resolveBySource filters entries', async () => {
    const engine = new ContextEngine();
    engine.registerProvider(makeProvider('p', [
      { key: 's1', value: 1, source: ContextSource.Session },
      { key: 'r1', value: 2, source: ContextSource.Runtime },
    ]));
    const ctx = await engine.buildContext();
    const results = engine.resolveBySource(ctx.contextId, ContextSource.Session);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every(e => e.source === ContextSource.Session)).toBe(true);
  });

  it('resolveByTag filters entries', async () => {
    const engine = new ContextEngine();
    engine.registerProvider({
      name: 'tagged',
      async provide() {
        return [
          { key: 't1', value: 1, source: ContextSource.Runtime, priority: ContextPriority.Normal, createdAt: new Date().toISOString(), tags: ['important'] },
          { key: 't2', value: 2, source: ContextSource.Runtime, priority: ContextPriority.Normal, createdAt: new Date().toISOString(), tags: ['system'] },
        ];
      },
    });
    const ctx = await engine.buildContext();
    const results = engine.resolveByTag(ctx.contextId, 'important');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('publishes ContextCleared event', async () => {
    const bus = new InProcessEventBus();
    const engine = new ContextEngine({ eventBus: bus });
    engine.registerProvider(makeProvider('p', [{ key: 'k', value: 'v' }]));
    const ctx = await engine.buildContext();
    engine.clearContext(ctx.contextId);
    const log = bus.getLog();
    expect(log.some(e => e.eventType === 'ContextCleared')).toBe(true);
  });

  it('publishes ContextUpdated event on update', async () => {
    const bus = new InProcessEventBus();
    const engine = new ContextEngine({ eventBus: bus });
    engine.registerProvider(makeProvider('p', [{ key: 'k', value: 'v' }]));
    const ctx = await engine.buildContext();
    await engine.updateContext(ctx.contextId, [
      { key: 'new', value: 'data', source: ContextSource.Runtime, priority: ContextPriority.Normal, createdAt: new Date().toISOString() },
    ]);
    const log = bus.getLog();
    expect(log.some(e => e.eventType === 'ContextUpdated')).toBe(true);
  });

  it('cache size is configurable', async () => {
    const engine = new ContextEngine({ cacheSize: 2 });
    engine.registerProvider(makeProvider('p', [{ key: 'k', value: 'v' }]));
    await engine.buildContext('s1', 'e1');
    await engine.buildContext('s2', 'e2');
    await engine.buildContext('s3', 'e3');
    // Cache should hold only 2
    expect(engine.getContext('s3')).not.toBeNull();
  });

  it('multiple builds create different contextIds', async () => {
    const engine = new ContextEngine();
    engine.registerProvider(makeProvider('p', [{ key: 'k', value: 'v' }]));
    const c1 = await engine.buildContext();
    const c2 = await engine.buildContext();
    expect(c1.contextId).not.toBe(c2.contextId);
  });

  it('save and load context round-trip', async () => {
    const engine = new ContextEngine();
    engine.registerProvider(makeProvider('p', [{ key: 'persist', value: 'data' }]));
    const ctx = await engine.buildContext();
    await engine.saveContext(ctx.contextId, '/test/path');
    const loaded = await engine.loadContext('/test/path');
    expect(loaded.contextId).toBe(ctx.contextId);
    expect(loaded.entries.get('persist')!.value).toBe('data');
  });
});
''')

# ─── Context Policies Tests ───
write_file("context/context-policies.test.ts", '''import { describe, it, expect } from 'vitest';
import { ContextPolicyManager, DEFAULT_CONTEXT_POLICY } from '../../../core/context/context-policies.js';
import { ContextSource, ContextPriority } from '../../../core/context/types.js';
import type { UnifiedContext, ContextEntry } from '../../../core/context/types.js';

function makeContext(entries: Map<string, ContextEntry>): UnifiedContext {
  return {
    contextId: 'test' as any, version: 'v1' as any,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    entries, metadata: {}, sizeBytes: 0,
  };
}

function makeEntry(key: string, overrides?: Partial<ContextEntry>): ContextEntry {
  return {
    key, value: 'v', source: ContextSource.Session, priority: ContextPriority.Normal,
    createdAt: new Date().toISOString(), ...overrides,
  };
}

describe('ContextPolicyManager', () => {
  it('default policy has maxContextSize', () => {
    expect(DEFAULT_CONTEXT_POLICY.maxContextSize).toBeDefined();
    expect(DEFAULT_CONTEXT_POLICY.maxContextSize).toBeGreaterThan(0);
  });

  it('custom policy overrides defaults', () => {
    const mgr = new ContextPolicyManager({ ...DEFAULT_CONTEXT_POLICY, maxContextSize: 999 });
    expect(mgr.getMaxContextSize()).toBe(999);
  });

  it('canAddEntry returns ok for under-limit', () => {
    const mgr = new ContextPolicyManager();
    const ctx = makeContext(new Map());
    const entry = makeEntry('new');
    const result = mgr.canAddEntry(ctx, entry);
    expect(result.ok).toBe(true);
  });

  it('resolveMergeConflict returns higher priority', () => {
    const mgr = new ContextPolicyManager();
    const existing = makeEntry('k', { priority: ContextPriority.Low });
    const incoming = makeEntry('k', { priority: ContextPriority.High });
    const resolved = mgr.resolveMergeConflict(existing, incoming);
    expect(resolved.value).toBe(incoming.value);
  });

  it('checkExpiration returns true for expired entries', () => {
    const mgr = new ContextPolicyManager();
    const expired = makeEntry('exp', { expiresAt: '2020-01-01T00:00:00.000Z' });
    expect(mgr.checkExpiration(expired)).toBe(true);
  });

  it('checkExpiration returns false for valid entries', () => {
    const mgr = new ContextPolicyManager();
    const valid = makeEntry('valid', { expiresAt: '2030-01-01T00:00:00.000Z' });
    expect(mgr.checkExpiration(valid)).toBe(false);
  });

  it('checkExpiration returns false for entries without expiresAt', () => {
    const mgr = new ContextPolicyManager();
    const noExpiry = makeEntry('no-exp');
    expect(mgr.checkExpiration(noExpiry)).toBe(false);
  });

  it('shouldEvict returns false for under-limit contexts', () => {
    const mgr = new ContextPolicyManager({ ...DEFAULT_CONTEXT_POLICY, maxContextSize: 100 });
    const ctx = makeContext(new Map([['a', makeEntry('a')]]));
    expect(mgr.shouldEvict(ctx)).toBe(false);
  });
});
''')

# ─── Session Error Tests ───
write_file("session/session-errors.test.ts", '''import { describe, it, expect } from 'vitest';
import {
  SessionError, SessionNotFoundError, SessionStateError, SessionAlreadyExistsError,
} from '../../../core/session/errors.js';

describe('SessionErrors', () => {
  it('SessionError has code', () => {
    const err = new SessionError('test', 'SESSION_CODE');
    expect(err.code).toBe('SESSION_CODE');
    expect(err.name).toBe('SessionError');
    expect(err).toBeInstanceOf(Error);
  });

  it('SessionNotFoundError has sessionId', () => {
    const err = new SessionNotFoundError('sess-1');
    expect(err.code).toBe('SESSION_NOT_FOUND');
    expect(err.sessionId).toBe('sess-1');
    expect(err).toBeInstanceOf(SessionError);
  });

  it('SessionStateError has from and to states', () => {
    const err = new SessionStateError('Created', 'Archived', 'invalid');
    expect(err.code).toBe('SESSION_INVALID_STATE');
    expect(err.fromState).toBe('Created');
    expect(err.toState).toBe('Archived');
    expect(err).toBeInstanceOf(SessionError);
  });

  it('SessionAlreadyExistsError has sessionId', () => {
    const err = new SessionAlreadyExistsError('sess-1');
    expect(err.code).toBe('SESSION_ALREADY_EXISTS');
    expect(err.sessionId).toBe('sess-1');
    expect(err).toBeInstanceOf(SessionError);
  });

  it('all errors are instanceof Error', () => {
    expect(new SessionError('m', 'c') instanceof Error).toBe(true);
    expect(new SessionNotFoundError('x') instanceof Error).toBe(true);
    expect(new SessionStateError('a', 'b', 'm') instanceof Error).toBe(true);
    expect(new SessionAlreadyExistsError('x') instanceof Error).toBe(true);
  });

  it('error messages contain useful info', () => {
    const err = new SessionStateError('Running', 'Created', 'backward');
    expect(err.message).toContain('Running');
    expect(err.message).toContain('Created');
  });
});
''')

# ─── Session State (FSM) Tests ───
write_file("session/session-state.test.ts", '''import { describe, it, expect } from 'vitest';
import { createSessionFSM } from '../../../core/session/session-state.js';
import { SessionState } from '../../../core/session/types.js';

describe('SessionFSM', () => {
  it('Created -> Running is valid', () => {
    expect(createSessionFSM().canTransition(SessionState.Created, SessionState.Running)).toBe(true);
  });

  it('Running -> Paused is valid', () => {
    expect(createSessionFSM().canTransition(SessionState.Running, SessionState.Paused)).toBe(true);
  });

  it('Paused -> Running is valid', () => {
    expect(createSessionFSM().canTransition(SessionState.Paused, SessionState.Running)).toBe(true);
  });

  it('Running -> Completed is valid', () => {
    expect(createSessionFSM().canTransition(SessionState.Running, SessionState.Completed)).toBe(true);
  });

  it('Completed -> Archived is valid', () => {
    expect(createSessionFSM().canTransition(SessionState.Completed, SessionState.Archived)).toBe(true);
  });

  it('Created -> Completed is invalid', () => {
    expect(createSessionFSM().canTransition(SessionState.Created, SessionState.Completed)).toBe(false);
  });

  it('Created -> Paused is invalid', () => {
    expect(createSessionFSM().canTransition(SessionState.Created, SessionState.Paused)).toBe(false);
  });

  it('Archived -> any is invalid', () => {
    const fsm = createSessionFSM();
    expect(fsm.canTransition(SessionState.Archived, SessionState.Running)).toBe(false);
    expect(fsm.canTransition(SessionState.Archived, SessionState.Created)).toBe(false);
  });

  it('transition throws for invalid transitions', () => {
    const fsm = createSessionFSM();
    expect(() => fsm.transition(SessionState.Created, SessionState.Completed)).toThrow();
  });

  it('transition returns new state for valid transitions', () => {
    const fsm = createSessionFSM();
    const result = fsm.transition(SessionState.Created, SessionState.Running);
    expect(result).toBe(SessionState.Running);
  });

  it('all 5 defined transitions work', () => {
    const fsm = createSessionFSM();
    expect(fsm.transition(SessionState.Created, SessionState.Running)).toBe(SessionState.Running);
    expect(fsm.transition(SessionState.Running, SessionState.Paused)).toBe(SessionState.Paused);
    expect(fsm.transition(SessionState.Paused, SessionState.Running)).toBe(SessionState.Running);
    expect(fsm.transition(SessionState.Running, SessionState.Completed)).toBe(SessionState.Completed);
    expect(fsm.transition(SessionState.Completed, SessionState.Archived)).toBe(SessionState.Archived);
  });

  it('Running -> Archived is invalid', () => {
    expect(createSessionFSM().canTransition(SessionState.Running, SessionState.Archived)).toBe(false);
  });

  it('Paused -> Completed is invalid', () => {
    expect(createSessionFSM().canTransition(SessionState.Paused, SessionState.Completed)).toBe(false);
  });
});
''')

# ─── Session Runtime Tests ───
write_file("session/session-runtime.test.ts", '''import { describe, it, expect } from 'vitest';
import { SessionRuntime } from '../../../core/session/session-runtime.js';
import { InProcessEventBus } from '../../../core/events/event-bus.js';
import { SessionState } from '../../../core/session/types.js';
import { EventClassification } from '../../../core/types/common.js';

describe('SessionRuntime', () => {
  it('creates a session in Created state', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession();
    expect(session.state).toBe(SessionState.Created);
    expect(session.id).toBeDefined();
    expect(session.createdAt).toBeDefined();
  });

  it('creates session with metadata', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession({ tag: 'test', env: 'dev' });
    expect(session.metadata.tag).toBe('test');
    expect(session.metadata.env).toBe('dev');
  });

  it('starts a session (Created -> Running)', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession();
    await runtime.startSession(session.id);
    expect(runtime.getSession(session.id)!.state).toBe(SessionState.Running);
  });

  it('pauses a session (Running -> Paused)', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession();
    await runtime.startSession(session.id);
    await runtime.pauseSession(session.id);
    expect(runtime.getSession(session.id)!.state).toBe(SessionState.Paused);
  });

  it('resumes a session (Paused -> Running)', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession();
    await runtime.startSession(session.id);
    await runtime.pauseSession(session.id);
    await runtime.resumeSession(session.id);
    expect(runtime.getSession(session.id)!.state).toBe(SessionState.Running);
  });

  it('completes a session (Running -> Completed)', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession();
    await runtime.startSession(session.id);
    await runtime.completeSession(session.id);
    expect(runtime.getSession(session.id)!.state).toBe(SessionState.Completed);
  });

  it('archives a session (Completed -> Archived)', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession();
    await runtime.startSession(session.id);
    await runtime.completeSession(session.id);
    await runtime.archiveSession(session.id);
    expect(runtime.getSession(session.id)!.state).toBe(SessionState.Archived);
  });

  it('invalid transition throws', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession();
    expect(() => runtime.completeSession(session.id)).toThrow();
  });

  it('getSession returns null for unknown', () => {
    const runtime = new SessionRuntime();
    expect(runtime.getSession('unknown')).toBeNull();
  });

  it('listSessions returns all sessions', async () => {
    const runtime = new SessionRuntime();
    await runtime.createSession();
    await runtime.createSession();
    expect(runtime.listSessions()).toHaveLength(2);
  });

  it('multiple sessions are isolated', async () => {
    const runtime = new SessionRuntime();
    const s1 = await runtime.createSession();
    const s2 = await runtime.createSession();
    await runtime.startSession(s1.id);
    expect(runtime.getSession(s2.id)!.state).toBe(SessionState.Created);
    expect(runtime.getSession(s1.id)!.state).toBe(SessionState.Running);
  });

  it('publishes SessionCreated event', async () => {
    const bus = new InProcessEventBus();
    const runtime = new SessionRuntime({ eventBus: bus });
    await runtime.createSession();
    const log = bus.getLog();
    expect(log.some(e => e.eventType === 'SessionCreated')).toBe(true);
  });

  it('events have correct classification', async () => {
    const bus = new InProcessEventBus();
    const runtime = new SessionRuntime({ eventBus: bus });
    await runtime.createSession();
    const log = bus.getLog();
    const created = log.find(e => e.eventType === 'SessionCreated');
    expect(created!.classification).toBe(EventClassification.StateChange);
  });

  it('serialize and deserialize round-trip', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession({ tag: 'ser-test' });
    await runtime.startSession(session.id);
    const serialized = runtime.serializeSession(session);
    const deserialized = runtime.deserializeSession(serialized);
    expect(deserialized.id).toBe(session.id);
    expect(deserialized.state).toBe(SessionState.Running);
    expect(deserialized.metadata.tag).toBe('ser-test');
  });

  it('branded ID round-trips correctly', async () => {
    const runtime = new SessionRuntime();
    const session = await runtime.createSession();
    const serialized = runtime.serializeSession(session);
    expect(typeof serialized.id).toBe('string');
    const deserialized = runtime.deserializeSession(serialized);
    expect(deserialized.id).toBe(session.id);
  });
});
''')

# ─── Checkpoint Error Tests ───
write_file("checkpoint/checkpoint-errors.test.ts", '''import { describe, it, expect } from 'vitest';
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

  it('CheckpointCorruptedError has details', () => {
    const err = new CheckpointCorruptedError('cp-1', 'bad data');
    expect(err.code).toBe('CHECKPOINT_CORRUPTED');
    expect(err.checkpointId).toBe('cp-1');
    expect(err.reason).toBe('bad data');
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
    expect(new CheckpointCorruptedError('x', 'r') instanceof Error).toBe(true);
    expect(new CheckpointStateError('s') instanceof Error).toBe(true);
  });

  it('error messages contain useful info', () => {
    const err = new CheckpointNotFoundError('cp-123');
    expect(err.message).toContain('cp-123');
  });
});
''')

# ─── Checkpoint Store Tests ───
write_file("checkpoint/checkpoint-store.test.ts", '''import { describe, it, expect } from 'vitest';
import { InMemoryCheckpointStorageAdapter } from '../../../core/checkpoint/checkpoint-store.js';

describe('InMemoryCheckpointStorageAdapter', () => {
  it('saves and loads data', async () => {
    const adapter = new InMemoryCheckpointStorageAdapter();
    await adapter.save('key-1', '{"data":1}');
    const loaded = await adapter.load('key-1');
    expect(loaded).toBe('{"data":1}');
  });

  it('load returns null for missing key', async () => {
    const adapter = new InMemoryCheckpointStorageAdapter();
    expect(await adapter.load('missing')).toBeNull();
  });

  it('delete removes data', async () => {
    const adapter = new InMemoryCheckpointStorageAdapter();
    await adapter.save('key-1', 'data');
    const deleted = await adapter.delete('key-1');
    expect(deleted).toBe(true);
    expect(await adapter.load('key-1')).toBeNull();
  });

  it('delete returns false for missing key', async () => {
    const adapter = new InMemoryCheckpointStorageAdapter();
    expect(await adapter.delete('missing')).toBe(false);
  });

  it('keys returns all saved keys', async () => {
    const adapter = new InMemoryCheckpointStorageAdapter();
    await adapter.save('a', '1');
    await adapter.save('b', '2');
    await adapter.save('c', '3');
    const keys = await adapter.keys();
    expect(keys).toHaveLength(3);
    expect(keys).toContain('a');
    expect(keys).toContain('b');
    expect(keys).toContain('c');
  });

  it('keys returns empty array when no data', async () => {
    const adapter = new InMemoryCheckpointStorageAdapter();
    expect(await adapter.keys()).toHaveLength(0);
  });

  it('overwrite saves new data', async () => {
    const adapter = new InMemoryCheckpointStorageAdapter();
    await adapter.save('key', 'old');
    await adapter.save('key', 'new');
    expect(await adapter.load('key')).toBe('new');
  });

  it('handles complex JSON data', async () => {
    const adapter = new InMemoryCheckpointStorageAdapter();
    const data = JSON.stringify({ nested: { arr: [1, 2] }, flag: true });
    await adapter.save('complex', data);
    const loaded = await adapter.load('complex');
    const parsed = JSON.parse(loaded!);
    expect(parsed.nested.arr).toEqual([1, 2]);
  });
});
''')

# ─── Checkpoint Engine Tests ───
write_file("checkpoint/checkpoint-engine.test.ts", '''import { describe, it, expect } from 'vitest';
import { CheckpointEngine } from '../../../core/checkpoint/checkpoint-engine.js';
import { InProcessEventBus } from '../../../core/events/event-bus.js';
import { EventClassification } from '../../../core/types/common.js';

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

  it('getCheckpointsForExecution filters by executionId', () => {
    const engine = new CheckpointEngine();
    engine.createCheckpoint({ executionId: 'exec-1', goalId: 'g', stage: 'p', executionState: 'R', variables: {}, completedSteps: [], pendingSteps: [] });
    engine.createCheckpoint({ executionId: 'exec-2', goalId: 'g', stage: 'p', executionState: 'R', variables: {}, completedSteps: [], pendingSteps: [] });
    engine.createCheckpoint({ executionId: 'exec-1', goalId: 'g', stage: 'p', executionState: 'R', variables: {}, completedSteps: [], pendingSteps: [] });
    const results = engine.getCheckpointsForExecution('exec-1');
    expect(results).toHaveLength(2);
  });

  it('consumeCheckpoint marks as consumed', () => {
    const engine = new CheckpointEngine();
    const cp = engine.createCheckpoint({
      executionId: 'exec-1', goalId: 'goal-1', stage: 'step-completed',
      executionState: 'Running', variables: { x: 1 }, completedSteps: ['s1'], pendingSteps: ['s2'],
    });
    const consumed = engine.consumeCheckpoint(cp.checkpointId);
    expect(consumed).not.toBeNull();
    expect(consumed!.status).toBe('consumed');
  });

  it('consumeCheckpoint returns null for already consumed', () => {
    const engine = new CheckpointEngine();
    const cp = engine.createCheckpoint({
      executionId: 'exec-1', goalId: 'g', stage: 'p',
      executionState: 'R', variables: {}, completedSteps: [], pendingSteps: [],
    });
    engine.consumeCheckpoint(cp.checkpointId);
    expect(engine.consumeCheckpoint(cp.checkpointId)).toBeNull();
  });

  it('invalidateCheckpoint marks as failed', () => {
    const engine = new CheckpointEngine();
    const cp = engine.createCheckpoint({
      executionId: 'exec-1', goalId: 'g', stage: 'p',
      executionState: 'R', variables: {}, completedSteps: [], pendingSteps: [],
    });
    const invalidated = engine.invalidateCheckpoint(cp.checkpointId);
    expect(invalidated!.status).toBe('failed');
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
      executionState: 'Running', variables: { progress: 75, labels: ['a', 'b'] },
      completedSteps: ['step-1', 'step-2'], pendingSteps: ['step-3'],
      metadata: { trace: 'test' },
    });
    const serialized = engine.serialize(cp);
    const deserialized = engine.deserialize(serialized);
    expect(deserialized.executionId).toBe('exec-ser');
    expect(deserialized.variables.progress).toBe(75);
    expect(deserialized.completedSteps.length).toBe(2);
    expect(deserialized.metadata!.trace).toBe('test');
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

  it('purgeExecutionCheckpoints removes all for execution', () => {
    const engine = new CheckpointEngine();
    engine.createCheckpoint({ executionId: 'exec-purge', goalId: 'g', stage: 'p', executionState: 'R', variables: {}, completedSteps: [], pendingSteps: [] });
    engine.createCheckpoint({ executionId: 'exec-purge', goalId: 'g', stage: 'p', executionState: 'R', variables: {}, completedSteps: [], pendingSteps: [] });
    engine.createCheckpoint({ executionId: 'other', goalId: 'g', stage: 'p', executionState: 'R', variables: {}, completedSteps: [], pendingSteps: [] });
    engine.purgeExecutionCheckpoints('exec-purge');
    expect(engine.getCheckpointsForExecution('exec-purge')).toHaveLength(0);
    expect(engine.getCheckpointsForExecution('other')).toHaveLength(1);
  });

  it('deep copy prevents mutation of original', () => {
    const engine = new CheckpointEngine();
    const vars: Record<string, unknown> = { x: 1 };
    const cp = engine.createCheckpoint({
      executionId: 'exec-dc', goalId: 'g', stage: 'p',
      executionState: 'R', variables: vars, completedSteps: [], pendingSteps: [],
    });
    // Mutate original vars
    vars.x = 999;
    // Checkpoint should still have original
    const fetched = engine.getCheckpoint(cp.checkpointId);
    expect(fetched!.variables.x).toBe(1);
  });

  it('getLatestCheckpoint returns most recent', () => {
    const engine = new CheckpointEngine();
    const cp1 = engine.createCheckpoint({ executionId: 'exec-l', goalId: 'g', stage: 'p', executionState: 'R', variables: {}, completedSteps: [], pendingSteps: [] });
    const cp2 = engine.createCheckpoint({ executionId: 'exec-l', goalId: 'g', stage: 'p', executionState: 'R', variables: {}, completedSteps: [], pendingSteps: [] });
    const latest = engine.getLatestCheckpoint('exec-l');
    expect(latest).not.toBeNull();
    expect(latest!.checkpointId).toBe(cp2.checkpointId);
  });

  it('getLatestCheckpoint returns null when no checkpoints', () => {
    const engine = new CheckpointEngine();
    expect(engine.getLatestCheckpoint('none')).toBeNull();
  });

  it('load returns null for unknown', async () => {
    const engine = new CheckpointEngine();
    expect(await engine.load('unknown')).toBeNull();
  });

  it('save and load round-trip', async () => {
    const engine = new CheckpointEngine();
    const cp = engine.createCheckpoint({
      executionId: 'exec-sl', goalId: 'g', stage: 'p',
      executionState: 'R', variables: { saved: true }, completedSteps: ['s1'], pendingSteps: [],
    });
    await engine.saveCheckpoints();
    // Create new engine with same storage
    const engine2 = new CheckpointEngine({ storage: (engine as any)['storage'] });
    await engine2.loadCheckpoints();
    const loaded = await engine2.load(cp.checkpointId);
    expect(loaded).not.toBeNull();
    expect(loaded!.executionId).toBe('exec-sl');
  });

  it('nested metadata survives round-trip', () => {
    const engine = new CheckpointEngine();
    const metadata = { level1: { level2: { level3: 'deep' } } };
    const cp = engine.createCheckpoint({
      executionId: 'exec-nm', goalId: 'g', stage: 'p',
      executionState: 'R', variables: {}, completedSteps: [], pendingSteps: [], metadata,
    });
    const serialized = engine.serialize(cp);
    const deserialized = engine.deserialize(serialized);
    expect((deserialized.metadata as any).level1.level2.level3).toBe('deep');
  });
});
''')

print("\\nDone! Generated 14 test files.")
