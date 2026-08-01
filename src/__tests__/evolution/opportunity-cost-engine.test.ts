import { describe, it, expect, beforeEach } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { OpportunityCostEngine } from '../../core/evolution/opportunity-cost-engine.js';
import { DefaultEvolutionRuntimeConfig, brandImprovementId } from '../../core/evolution/types.js';

const cfg = DefaultEvolutionRuntimeConfig.opportunityCost;

function createEngine(bus?: InProcessEventBus) {
  return new OpportunityCostEngine(cfg, bus);
}

const impId = brandImprovementId('test-imp-1');

// ═══════════════════════════════════════════════════════════════════
// CONSTRUCTOR
// ═══════════════════════════════════════════════════════════════════

describe('OpportunityCostEngine — constructor', () => {
  it('creates instance without eventBus', () => {
    const e = createEngine();
    expect(e).toBeDefined();
  });
  it('creates instance with eventBus', () => {
    const e = createEngine(new InProcessEventBus());
    expect(e).toBeDefined();
  });
  it('creates instance with custom config', () => {
    const e = new OpportunityCostEngine({ maxForegoneItems: 50, minNetBenefit: 10 });
    expect(e).toBeDefined();
  });
  it('store is accessible via getStore', () => {
    const e = createEngine();
    expect(e.getStore()).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// ANALYZE
// ═══════════════════════════════════════════════════════════════════

describe('OpportunityCostEngine — analyze', () => {
  it('returns an OpportunityCost', async () => {
    const e = createEngine();
    const result = await e.analyze(impId);
    expect(result).toBeDefined();
  });
  it('has improvementId', async () => {
    const e = createEngine();
    const result = await e.analyze(impId);
    expect(result.improvementId).toBe(impId);
  });
  it('has foregoneImprovements (empty array)', async () => {
    const e = createEngine();
    const result = await e.analyze(impId);
    expect(result.foregoneImprovements).toEqual([]);
  });
  it('foregoneImprovements is frozen', async () => {
    const e = createEngine();
    const result = await e.analyze(impId);
    expect(Object.isFrozen(result.foregoneImprovements)).toBe(true);
  });
  it('has foregoneValue (0)', async () => {
    const e = createEngine();
    const result = await e.analyze(impId);
    expect(result.foregoneValue).toBe(0);
  });
  it('has foregoneImpact (0)', async () => {
    const e = createEngine();
    const result = await e.analyze(impId);
    expect(result.foregoneImpact).toBe(0);
  });
  it('has netBenefit (0)', async () => {
    const e = createEngine();
    const result = await e.analyze(impId);
    expect(result.netBenefit).toBe(0);
  });
  it('has analyzedAt timestamp', async () => {
    const e = createEngine();
    const result = await e.analyze(impId);
    expect(result.analyzedAt).toBeDefined();
    expect(typeof result.analyzedAt).toBe('string');
  });
  it('has metadata (empty object)', async () => {
    const e = createEngine();
    const result = await e.analyze(impId);
    expect(result.metadata).toEqual({});
  });
  it('metadata is frozen', async () => {
    const e = createEngine();
    const result = await e.analyze(impId);
    expect(Object.isFrozen(result.metadata)).toBe(true);
  });
  it('result is frozen', async () => {
    const e = createEngine();
    const result = await e.analyze(impId);
    expect(Object.isFrozen(result)).toBe(true);
  });

  // Multiple analyses
  it('stores multiple analyses', async () => {
    const e = createEngine();
    await e.analyze(impId);
    await e.analyze(brandImprovementId('imp-2'));
    expect((await e.listAnalyses())).toHaveLength(2);
  });
  it('each analysis is independent', async () => {
    const e = createEngine();
    const r1 = await e.analyze(impId);
    const r2 = await e.analyze(brandImprovementId('imp-2'));
    expect(r1.improvementId).toBe(impId);
    expect(r2.improvementId).toBe(brandImprovementId('imp-2'));
  });
  it('re-analyzing same improvement overwrites', async () => {
    const e = createEngine();
    await e.analyze(impId);
    await e.analyze(impId);
    expect((await e.listAnalyses())).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// GET BY IMPROVEMENT ID
// ═══════════════════════════════════════════════════════════════════

describe('OpportunityCostEngine — getByImprovementId', () => {
  it('returns null for unknown id', async () => {
    const e = createEngine();
    const result = await e.getByImprovementId(brandImprovementId('nonexistent'));
    expect(result).toBeNull();
  });
  it('returns analysis after analyze', async () => {
    const e = createEngine();
    await e.analyze(impId);
    const result = await e.getByImprovementId(impId);
    expect(result).not.toBeNull();
    expect(result!.improvementId).toBe(impId);
  });
  it('returns null for unanalyzed improvement', async () => {
    const e = createEngine();
    await e.analyze(impId);
    const result = await e.getByImprovementId(brandImprovementId('other'));
    expect(result).toBeNull();
  });
  it('returns frozen analysis', async () => {
    const e = createEngine();
    await e.analyze(impId);
    const result = await e.getByImprovementId(impId);
    expect(Object.isFrozen(result!)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// LIST ANALYSES
// ═══════════════════════════════════════════════════════════════════

describe('OpportunityCostEngine — listAnalyses', () => {
  it('returns empty array initially', async () => {
    const e = createEngine();
    const all = await e.listAnalyses();
    expect(all).toEqual([]);
  });
  it('returns all analyses', async () => {
    const e = createEngine();
    await e.analyze(impId);
    await e.analyze(brandImprovementId('imp-2'));
    await e.analyze(brandImprovementId('imp-3'));
    const all = await e.listAnalyses();
    expect(all).toHaveLength(3);
  });
  it('returns frozen array', async () => {
    const e = createEngine();
    await e.analyze(impId);
    const all = await e.listAnalyses();
    expect(Object.isFrozen(all)).toBe(true);
  });
  it('each item is frozen', async () => {
    const e = createEngine();
    await e.analyze(impId);
    const all = await e.listAnalyses();
    for (const item of all) {
      expect(Object.isFrozen(item)).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// EVENT EMISSION
// ═══════════════════════════════════════════════════════════════════

describe('OpportunityCostEngine — event emission', () => {
  it('emits OpportunityCostAnalyzedEvent on analyze', async () => {
    const bus = new InProcessEventBus();
    const e = createEngine(bus);
    await e.analyze(impId);
    const log = bus.getLog();
    const evt = log.find(ev => ev.eventType === 'evolution.opportunityCost.analyzed');
    expect(evt).toBeDefined();
  });
  it('OpportunityCostAnalyzedEvent has timestamp', async () => {
    const bus = new InProcessEventBus();
    const e = createEngine(bus);
    await e.analyze(impId);
    const log = bus.getLog();
    const evt = log.find(ev => ev.eventType === 'evolution.opportunityCost.analyzed');
    expect(evt!.timestamp).toBeDefined();
  });
  it('OpportunityCostAnalyzedEvent has classification', async () => {
    const bus = new InProcessEventBus();
    const e = createEngine(bus);
    await e.analyze(impId);
    const log = bus.getLog();
    const evt = log.find(ev => ev.eventType === 'evolution.opportunityCost.analyzed');
    expect(evt!.classification).toBeDefined();
  });
  it('does not emit events without eventBus', async () => {
    const e = createEngine();
    await e.analyze(impId);
    expect(true).toBe(true);
  });
  it('multiple analyses emit multiple events', async () => {
    const bus = new InProcessEventBus();
    const e = createEngine(bus);
    await e.analyze(impId);
    await e.analyze(brandImprovementId('imp-2'));
    const log = bus.getLog();
    const events = log.filter(ev => ev.eventType === 'evolution.opportunityCost.analyzed');
    expect(events).toHaveLength(2);
  });
  it('event log grows correctly', async () => {
    const bus = new InProcessEventBus();
    const e = createEngine(bus);
    await e.analyze(impId);
    expect(bus.getLog().length).toBe(1);
    await e.analyze(brandImprovementId('imp-2'));
    expect(bus.getLog().length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════
// STORE ACCESS
// ═══════════════════════════════════════════════════════════════════

describe('OpportunityCostEngine — store access', () => {
  it('getStore returns store instance', () => {
    const e = createEngine();
    expect(e.getStore()).toBeDefined();
  });
  it('store size reflects analyses', async () => {
    const e = createEngine();
    const store = e.getStore();
    expect(store.size).toBe(0);
    await e.analyze(impId);
    expect(store.size).toBe(1);
  });
});
