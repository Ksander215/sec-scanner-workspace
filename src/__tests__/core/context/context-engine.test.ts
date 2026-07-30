import { describe, it, expect } from 'vitest';
import { ContextEngine } from '../../../core/context/context-engine.js';
import { InProcessEventBus } from '../../../core/events/event-bus.js';
import { ContextSource, ContextPriority } from '../../../core/context/types.js';
import { EventClassification } from '../../../core/types/common.js';
import type { ContextSourceProvider } from '../../../core/context/context-builder.js';

describe('ContextEngine', () => {
  function makeProvider(source: ContextSource, entries: Array<{ key: string; value: unknown }>): ContextSourceProvider {
    return {
      source,
      async getEntries() {
        return entries.map(e => ({
          key: e.key, value: e.value, source, priority: ContextPriority.Normal,
          createdAt: new Date().toISOString(),
        }));
      },
    };
  }

  it('builds context with registered providers', async () => {
    const engine = new ContextEngine();
    engine.registerProvider(makeProvider(ContextSource.Runtime, [{ key: 'k', value: 'v' }]));
    const ctx = await engine.buildContext();
    expect(ctx.entries.size).toBeGreaterThanOrEqual(1);
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
    engine.registerProvider(makeProvider(ContextSource.Runtime, [{ key: 'k', value: 'v' }]));
    await engine.buildContext();
    const log = bus.getLog();
    const created = log.find(e => e.eventType === 'ContextCreated');
    expect(created).toBeDefined();
    expect(created!.classification).toBe(EventClassification.StateChange);
  });

  it('getContext returns built context', async () => {
    const engine = new ContextEngine();
    engine.registerProvider(makeProvider(ContextSource.Runtime, [{ key: 'k', value: 'v' }]));
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
    engine.registerProvider(makeProvider(ContextSource.Runtime, [{ key: 'resolve-me', value: 42 }]));
    const ctx = await engine.buildContext();
    const entry = engine.resolve(ctx.contextId, 'resolve-me');
    expect(entry).toBeDefined();
    expect(entry!.value).toBe(42);
  });

  it('resolve returns undefined for missing key', async () => {
    const engine = new ContextEngine();
    engine.registerProvider(makeProvider(ContextSource.Runtime, [{ key: 'a', value: 1 }]));
    const ctx = await engine.buildContext();
    expect(engine.resolve(ctx.contextId, 'missing')).toBeUndefined();
  });

  it('updateContext adds new entries', async () => {
    const engine = new ContextEngine();
    engine.registerProvider(makeProvider(ContextSource.Session, [{ key: 'existing', value: 'old' }]));
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
    engine.registerProvider(makeProvider(ContextSource.Session, [{ key: 'a', value: 1 }, { key: 'b', value: 2 }]));
    const ctx = await engine.buildContext();
    engine.clearContext(ctx.contextId);
    const cleared = engine.getContext(ctx.contextId);
    expect(cleared!.entries.size).toBe(0);
  });

  it('createSnapshot captures context state', async () => {
    const engine = new ContextEngine();
    engine.registerProvider(makeProvider(ContextSource.Session, [{ key: 'snap', value: 'data' }]));
    const ctx = await engine.buildContext();
    const snap = engine.createSnapshot(ctx.contextId, 'manual');
    expect(snap).not.toBeNull();
  });

  it('createSnapshot returns null for unknown contextId', () => {
    const engine = new ContextEngine();
    expect(engine.createSnapshot('unknown', 'manual')).toBeNull();
  });

  it('restoreFromSnapshot recovers entries', async () => {
    const engine = new ContextEngine();
    engine.registerProvider(makeProvider(ContextSource.Session, [{ key: 'restore', value: 'original' }]));
    const ctx = await engine.buildContext();
    const snap = engine.createSnapshot(ctx.contextId, 'checkpoint');
    engine.clearContext(ctx.contextId);
    const restored = engine.restoreFromSnapshot(snap!);
    expect(restored.entries.size).toBeGreaterThanOrEqual(1);
  });

  it('resolveBySource filters entries', async () => {
    const engine = new ContextEngine();
    engine.registerProvider(makeProvider(ContextSource.Session, [
      { key: 's1', value: 1 },
    ]));
    engine.registerProvider(makeProvider(ContextSource.Runtime, [
      { key: 'r1', value: 2 },
    ]));
    const ctx = await engine.buildContext();
    const results = engine.resolveBySource(ctx.contextId, ContextSource.Session);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('publishes ContextCleared event', async () => {
    const bus = new InProcessEventBus();
    const engine = new ContextEngine({ eventBus: bus });
    engine.registerProvider(makeProvider(ContextSource.Session, [{ key: 'k', value: 'v' }]));
    const ctx = await engine.buildContext();
    engine.clearContext(ctx.contextId);
    const log = bus.getLog();
    expect(log.some(e => e.eventType === 'ContextCleared')).toBe(true);
  });

  it('publishes ContextUpdated event on update', async () => {
    const bus = new InProcessEventBus();
    const engine = new ContextEngine({ eventBus: bus });
    engine.registerProvider(makeProvider(ContextSource.Session, [{ key: 'k', value: 'v' }]));
    const ctx = await engine.buildContext();
    await engine.updateContext(ctx.contextId, [
      { key: 'new', value: 'data', source: ContextSource.Runtime, priority: ContextPriority.Normal, createdAt: new Date().toISOString() },
    ]);
    const log = bus.getLog();
    expect(log.some(e => e.eventType === 'ContextUpdated')).toBe(true);
  });

  it('multiple builds create different contextIds', async () => {
    const engine = new ContextEngine();
    engine.registerProvider(makeProvider(ContextSource.Session, [{ key: 'k', value: 'v' }]));
    const c1 = await engine.buildContext();
    const c2 = await engine.buildContext();
    expect(c1.contextId).not.toBe(c2.contextId);
  });
});
