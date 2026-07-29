import { describe, it, expect } from 'vitest';
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

  it('resolves by priority (minPriority as number)', () => {
    const ctx = makeContext([
      makeEntry('low', { priority: ContextPriority.Low }),
      makeEntry('high', { priority: ContextPriority.High }),
      makeEntry('normal', { priority: ContextPriority.Normal }),
    ]);
    const results = resolver.resolveByPriority(ctx, 50);
    expect(results.length).toBeGreaterThanOrEqual(1);
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

  it('resolveWhere with predicate', () => {
    const ctx = makeContext([
      makeEntry('a', { value: 1 }),
      makeEntry('b', { value: 'hello' }),
      makeEntry('c', { value: 3 }),
    ]);
    const results = resolver.resolveWhere(ctx, e => typeof e.value === 'number');
    expect(results).toHaveLength(2);
  });

  it('getUniqueTags returns sorted tags', () => {
    const ctx = makeContext([
      makeEntry('t1', { tags: ['beta', 'alpha'] }),
      makeEntry('t2', { tags: ['gamma'] }),
    ]);
    const tags = resolver.getUniqueTags(ctx);
    expect(tags).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('getUniqueSources returns all sources', () => {
    const ctx = makeContext([
      makeEntry('s', { source: ContextSource.Session }),
      makeEntry('r', { source: ContextSource.Runtime }),
    ]);
    const sources = resolver.getUniqueSources(ctx);
    expect(sources).toContain(ContextSource.Session);
    expect(sources).toContain(ContextSource.Runtime);
  });
});
