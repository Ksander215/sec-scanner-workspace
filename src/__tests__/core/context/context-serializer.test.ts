import { describe, it, expect } from 'vitest';
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
