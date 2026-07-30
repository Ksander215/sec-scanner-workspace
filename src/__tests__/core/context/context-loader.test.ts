import { describe, it, expect, beforeEach } from 'vitest';
import { ContextSerializer } from '../../../core/context/context-serializer.js';
import { ContextLoader, InMemoryContextStorageAdapter } from '../../../core/context/context-loader.js';
import { ContextSource, ContextPriority } from '../../../core/context/types.js';
import type { UnifiedContext, ContextEntry } from '../../../core/context/types.js';

function makeContext(overrides?: Partial<UnifiedContext>): UnifiedContext {
  const entry: ContextEntry = {
    key: 'test-key',
    value: { data: true },
    source: ContextSource.Session,
    priority: ContextPriority.Normal,
    createdAt: '2025-01-01T00:00:00.000Z',
  };
  return {
    contextId: 'ctx-1' as any,
    version: 'v1-0' as any,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    entries: new Map([['test-key', entry]]),
    metadata: { tag: 'test' },
    sizeBytes: 128,
    ...overrides,
  };
}

describe('ContextLoader', () => {
  let serializer: ContextSerializer;
  let storage: InMemoryContextStorageAdapter;
  let loader: ContextLoader;

  beforeEach(() => {
    serializer = new ContextSerializer();
    storage = new InMemoryContextStorageAdapter();
    loader = new ContextLoader(serializer, storage);
  });

  it('saves and loads a context round-trip', async () => {
    const ctx = makeContext();
    await loader.saveContext('/sessions/ctx-1.json', ctx);
    const loaded = await loader.loadContext('/sessions/ctx-1.json');
    expect(loaded).not.toBeNull();
    expect(loaded!.contextId).toBe(ctx.contextId);
    expect(loaded!.entries.size).toBe(1);
    expect(loaded!.entries.get('test-key')!.key).toBe('test-key');
  });

  it('deleteContext removes stored context', async () => {
    const ctx = makeContext();
    await loader.saveContext('/sessions/ctx-1.json', ctx);
    const deleted = await loader.deleteContext('/sessions/ctx-1.json');
    expect(deleted).toBe(true);
    expect(await loader.contextExists('/sessions/ctx-1.json')).toBe(false);
  });

  it('deleteContext returns false for missing context', async () => {
    expect(await loader.deleteContext('/missing.json')).toBe(false);
  });

  it('contextExists returns true for saved context', async () => {
    await loader.saveContext('/sessions/ctx-1.json', makeContext());
    expect(await loader.contextExists('/sessions/ctx-1.json')).toBe(true);
  });

  it('contextExists returns false for unsaved context', async () => {
    expect(await loader.contextExists('/missing.json')).toBe(false);
  });

  it('listContexts returns matching paths by prefix', async () => {
    await loader.saveContext('/sessions/a.json', makeContext({ contextId: 'a' as any }));
    await loader.saveContext('/sessions/b.json', makeContext({ contextId: 'b' as any }));
    await loader.saveContext('/archives/c.json', makeContext({ contextId: 'c' as any }));
    const sessions = await loader.listContexts('/sessions/');
    expect(sessions).toHaveLength(2);
    expect(sessions).toContain('/sessions/a.json');
    expect(sessions).toContain('/sessions/b.json');
  });

  it('listContexts returns all when no prefix', async () => {
    await loader.saveContext('/x.json', makeContext());
    await loader.saveContext('/y.json', makeContext());
    const all = await loader.listContexts();
    expect(all).toHaveLength(2);
  });

  it('overwrites existing context on save', async () => {
    await loader.saveContext('/ctx.json', makeContext({ contextId: 'v1' as any }));
    await loader.saveContext('/ctx.json', makeContext({ contextId: 'v2' as any }));
    const loaded = await loader.loadContext('/ctx.json');
    expect(loaded!.contextId).toBe('v2');
  });

  it('loadContext handles complex nested metadata', async () => {
    const ctx = makeContext({
      metadata: { nested: { deep: { value: 42 } }, arr: [1, 2, 3] },
    });
    await loader.saveContext('/complex.json', ctx);
    const loaded = await loader.loadContext('/complex.json');
    expect((loaded!.metadata as any).nested.deep.value).toBe(42);
  });

  it('handles multiple independent contexts', async () => {
    for (let i = 0; i < 5; i++) {
      await loader.saveContext(`/ctx-${i}.json`, makeContext({ contextId: `ctx-${i}` as any }));
    }
    for (let i = 0; i < 5; i++) {
      const loaded = await loader.loadContext(`/ctx-${i}.json`);
      expect(loaded!.contextId).toBe(`ctx-${i}`);
    }
  });
});
