import { describe, it, expect } from 'vitest';
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
