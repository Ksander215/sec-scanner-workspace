import { describe, it, expect, beforeEach } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { ArchitectureOptimizer } from '../../core/evolution/architecture-optimizer.js';
import { DefaultEvolutionRuntimeConfig, ArchOptimizationType } from '../../core/evolution/types.js';

const cfg = DefaultEvolutionRuntimeConfig.architectureOptimizer;

function createOptimizer(bus?: InProcessEventBus) {
  return new ArchitectureOptimizer(cfg, bus);
}

describe('ArchitectureOptimizer — constructor', () => {
  it('creates instance without eventBus', () => {
    const a = createOptimizer();
    expect(a).toBeDefined();
  });
  it('creates instance with eventBus', () => {
    const a = createOptimizer(new InProcessEventBus());
    expect(a).toBeDefined();
  });
});

describe('ArchitectureOptimizer — analyze', () => {
  it('returns suggestions', async () => {
    const a = createOptimizer();
    const suggestions = await a.analyze();
    expect(suggestions.length).toBeGreaterThan(0);
  });
  it('each suggestion is frozen', async () => {
    const a = createOptimizer();
    const suggestions = await a.analyze();
    for (const s of suggestions) {
      expect(Object.isFrozen(s)).toBe(true);
    }
  });
  it('result array is frozen', async () => {
    const a = createOptimizer();
    const suggestions = await a.analyze();
    expect(Object.isFrozen(suggestions)).toBe(true);
  });
  it('each suggestion has unique id', async () => {
    const a = createOptimizer();
    const suggestions = await a.analyze();
    const ids = suggestions.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('includes ReduceCoupling suggestion', async () => {
    const a = createOptimizer();
    const suggestions = await a.analyze();
    const types = suggestions.map(s => s.type);
    expect(types).toContain(ArchOptimizationType.ReduceCoupling);
  });
  it('includes ImproveCohesion suggestion', async () => {
    const a = createOptimizer();
    const suggestions = await a.analyze();
    const types = suggestions.map(s => s.type);
    expect(types).toContain(ArchOptimizationType.ImproveCohesion);
  });
  it('suggestion has correct fields', async () => {
    const a = createOptimizer();
    const suggestions = await a.analyze();
    for (const s of suggestions) {
      expect(s.id).toBeDefined();
      expect(s.type).toBeDefined();
      expect(s.title).toBeDefined();
      expect(s.description).toBeDefined();
      expect(s.affectedModules).toBeDefined();
      expect(typeof s.estimatedImpact).toBe('number');
      expect(typeof s.estimatedEffort).toBe('number');
      expect(typeof s.risk).toBe('number');
      expect(s.createdAt).toBeDefined();
      expect(s.metadata).toBeDefined();
    }
  });
  it('passes modules to affectedModules', async () => {
    const a = createOptimizer();
    const modules = Object.freeze(['module-a', 'module-b']);
    const suggestions = await a.analyze(modules);
    for (const s of suggestions) {
      expect(s.affectedModules).toBe(modules);
    }
  });
  it('default affectedModules is empty array', async () => {
    const a = createOptimizer();
    const suggestions = await a.analyze();
    for (const s of suggestions) {
      expect(s.affectedModules).toEqual([]);
    }
  });
  it('respects maxSuggestions', async () => {
    const a = new ArchitectureOptimizer({ maxSuggestions: 1, analysisTimeoutMs: 60_000 });
    const suggestions = await a.analyze();
    expect(suggestions.length).toBeLessThanOrEqual(1);
  });
  it('emits evolution.arch.suggested event for each suggestion', async () => {
    const bus = new InProcessEventBus();
    const a = createOptimizer(bus);
    await a.analyze();
    const log = bus.getLog();
    const events = log.filter(e => e.eventType === 'evolution.arch.suggested');
    expect(events.length).toBeGreaterThan(0);
  });
  it('event envelope has correct fields', async () => {
    const bus = new InProcessEventBus();
    const a = createOptimizer(bus);
    await a.analyze();
    const log = bus.getLog();
    const evt = log.find(e => e.eventType === 'evolution.arch.suggested');
    expect(evt).toBeDefined();
    expect(evt!.eventType).toBe('evolution.arch.suggested');
    expect(evt!.timestamp).toBeDefined();
  });
  it('emits one event per suggestion', async () => {
    const bus = new InProcessEventBus();
    const a = createOptimizer(bus);
    const suggestions = await a.analyze();
    const log = bus.getLog();
    const events = log.filter(e => e.eventType === 'evolution.arch.suggested');
    expect(events.length).toBe(suggestions.length);
  });
  it('does not emit events without eventBus', async () => {
    const a = createOptimizer();
    await a.analyze();
  });
});

describe('ArchitectureOptimizer — getById', () => {
  it('returns null for unknown id', async () => {
    const a = createOptimizer();
    const result = await a.getById('nonexistent' as any);
    expect(result).toBeNull();
  });
  it('returns suggestion after analyze', async () => {
    const a = createOptimizer();
    const suggestions = await a.analyze();
    const found = await a.getById(suggestions[0].id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(suggestions[0].id);
  });
  it('returns frozen suggestion', async () => {
    const a = createOptimizer();
    const suggestions = await a.analyze();
    const found = await a.getById(suggestions[0].id);
    expect(Object.isFrozen(found!)).toBe(true);
  });
});

describe('ArchitectureOptimizer — list', () => {
  it('returns all suggestions', async () => {
    const a = createOptimizer();
    await a.analyze();
    const all = await a.list();
    expect(all.length).toBeGreaterThan(0);
  });
  it('returns frozen array', async () => {
    const a = createOptimizer();
    await a.analyze();
    const all = await a.list();
    expect(Object.isFrozen(all)).toBe(true);
  });
  it('returns empty initially', async () => {
    const a = createOptimizer();
    const all = await a.list();
    expect(all).toEqual([]);
  });
});

describe('ArchitectureOptimizer — count', () => {
  it('returns 0 initially', async () => {
    const a = createOptimizer();
    expect(await a.count()).toBe(0);
  });
  it('returns correct count after analyze', async () => {
    const a = createOptimizer();
    await a.analyze();
    const c = await a.count();
    expect(c).toBeGreaterThan(0);
  });
});

describe('ArchitectureOptimizer — store access', () => {
  it('getStore returns store', () => {
    const a = createOptimizer();
    expect(a.getStore()).toBeDefined();
  });
  it('store size is 0 initially', () => {
    const a = createOptimizer();
    expect(a.getStore().size).toBe(0);
  });
  it('store size increases after analyze', async () => {
    const a = createOptimizer();
    await a.analyze();
    expect(a.getStore().size).toBeGreaterThan(0);
  });
});
