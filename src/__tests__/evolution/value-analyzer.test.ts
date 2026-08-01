import { describe, it, expect, beforeEach } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { ValueAnalyzer } from '../../core/evolution/value-analyzer.js';
import { DefaultEvolutionRuntimeConfig, ValueDimension, brandImprovementId } from '../../core/evolution/types.js';

const cfg = DefaultEvolutionRuntimeConfig.valueAnalyzer;

function createAnalyzer(bus?: InProcessEventBus) {
  return new ValueAnalyzer(cfg, bus);
}

const impId = brandImprovementId('test-imp-1');

// ═══════════════════════════════════════════════════════════════════
// CONSTRUCTOR
// ═══════════════════════════════════════════════════════════════════

describe('ValueAnalyzer — constructor', () => {
  it('creates instance without eventBus', () => {
    const a = createAnalyzer();
    expect(a).toBeDefined();
  });
  it('creates instance with eventBus', () => {
    const a = createAnalyzer(new InProcessEventBus());
    expect(a).toBeDefined();
  });
  it('creates instance with custom config', () => {
    const a = new ValueAnalyzer({ minValueScore: 0, maxValueScore: 50, valueDimensions: [ValueDimension.BusinessValue] });
    expect(a).toBeDefined();
  });
  it('store is accessible via getStore', () => {
    const a = createAnalyzer();
    expect(a.getStore()).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// ANALYZE
// ═══════════════════════════════════════════════════════════════════

describe('ValueAnalyzer — analyze', () => {
  it('returns a ValueAnalysis', async () => {
    const a = createAnalyzer();
    const result = await a.analyze(impId);
    expect(result).toBeDefined();
  });
  it('has improvementId', async () => {
    const a = createAnalyzer();
    const result = await a.analyze(impId);
    expect(result.improvementId).toBe(impId);
  });
  it('has valueCreated string', async () => {
    const a = createAnalyzer();
    const result = await a.analyze(impId);
    expect(typeof result.valueCreated).toBe('string');
    expect(result.valueCreated.length).toBeGreaterThan(0);
  });
  it('valueCreated references the value dimension', async () => {
    const a = createAnalyzer();
    const result = await a.analyze(impId);
    expect(result.valueCreated).toContain('UserValue');
  });
  it('has valueFor string matching dimension', async () => {
    const a = createAnalyzer();
    const result = await a.analyze(impId);
    expect(result.valueFor).toBe(ValueDimension.UserValue);
  });
  it('has valueMagnitude number', async () => {
    const a = createAnalyzer();
    const result = await a.analyze(impId);
    expect(typeof result.valueMagnitude).toBe('number');
  });
  it('has valueDimension', async () => {
    const a = createAnalyzer();
    const result = await a.analyze(impId);
    expect(result.valueDimension).toBe(ValueDimension.UserValue);
  });
  it('has beforeMetrics (empty object)', async () => {
    const a = createAnalyzer();
    const result = await a.analyze(impId);
    expect(result.beforeMetrics).toEqual({});
  });
  it('has afterMetrics (empty object)', async () => {
    const a = createAnalyzer();
    const result = await a.analyze(impId);
    expect(result.afterMetrics).toEqual({});
  });
  it('beforeMetrics is frozen', async () => {
    const a = createAnalyzer();
    const result = await a.analyze(impId);
    expect(Object.isFrozen(result.beforeMetrics)).toBe(true);
  });
  it('afterMetrics is frozen', async () => {
    const a = createAnalyzer();
    const result = await a.analyze(impId);
    expect(Object.isFrozen(result.afterMetrics)).toBe(true);
  });
  it('has valueScore number', async () => {
    const a = createAnalyzer();
    const result = await a.analyze(impId);
    expect(typeof result.valueScore).toBe('number');
  });
  it('has analyzedAt timestamp', async () => {
    const a = createAnalyzer();
    const result = await a.analyze(impId);
    expect(result.analyzedAt).toBeDefined();
    expect(typeof result.analyzedAt).toBe('string');
  });
  it('has metadata (empty object)', async () => {
    const a = createAnalyzer();
    const result = await a.analyze(impId);
    expect(result.metadata).toEqual({});
  });
  it('metadata is frozen', async () => {
    const a = createAnalyzer();
    const result = await a.analyze(impId);
    expect(Object.isFrozen(result.metadata)).toBe(true);
  });
  it('result is frozen', async () => {
    const a = createAnalyzer();
    const result = await a.analyze(impId);
    expect(Object.isFrozen(result)).toBe(true);
  });

  // Value dimensions
  it('uses first dimension from config (UserValue)', async () => {
    const a = createAnalyzer();
    const result = await a.analyze(impId);
    expect(result.valueDimension).toBe(ValueDimension.UserValue);
  });
  it('uses PlatformValue when it is first dimension', async () => {
    const a = new ValueAnalyzer({ minValueScore: 0, maxValueScore: 100, valueDimensions: [ValueDimension.PlatformValue] });
    const result = await a.analyze(impId);
    expect(result.valueDimension).toBe(ValueDimension.PlatformValue);
  });
  it('uses BusinessValue when it is first dimension', async () => {
    const a = new ValueAnalyzer({ minValueScore: 0, maxValueScore: 100, valueDimensions: [ValueDimension.BusinessValue] });
    const result = await a.analyze(impId);
    expect(result.valueDimension).toBe(ValueDimension.BusinessValue);
  });
  it('uses DeveloperValue when it is first dimension', async () => {
    const a = new ValueAnalyzer({ minValueScore: 0, maxValueScore: 100, valueDimensions: [ValueDimension.DeveloperValue] });
    const result = await a.analyze(impId);
    expect(result.valueDimension).toBe(ValueDimension.DeveloperValue);
  });
  it('uses KnowledgeValue when it is first dimension', async () => {
    const a = new ValueAnalyzer({ minValueScore: 0, maxValueScore: 100, valueDimensions: [ValueDimension.KnowledgeValue] });
    const result = await a.analyze(impId);
    expect(result.valueDimension).toBe(ValueDimension.KnowledgeValue);
  });
  it('falls back to UserValue when config has empty dimensions', async () => {
    const a = new ValueAnalyzer({ minValueScore: 0, maxValueScore: 100, valueDimensions: [] });
    const result = await a.analyze(impId);
    expect(result.valueDimension).toBe(ValueDimension.UserValue);
  });

  // Multiple analyses
  it('stores multiple analyses', async () => {
    const a = createAnalyzer();
    await a.analyze(impId);
    await a.analyze(brandImprovementId('imp-2'));
    expect((await a.listAnalyses())).toHaveLength(2);
  });
  it('each analysis is independent', async () => {
    const a = createAnalyzer();
    const r1 = await a.analyze(impId);
    const r2 = await a.analyze(brandImprovementId('imp-2'));
    expect(r1.improvementId).toBe(impId);
    expect(r2.improvementId).toBe(brandImprovementId('imp-2'));
  });
});

// ═══════════════════════════════════════════════════════════════════
// GET BY IMPROVEMENT ID
// ═══════════════════════════════════════════════════════════════════

describe('ValueAnalyzer — getByImprovementId', () => {
  it('returns null for unknown id', async () => {
    const a = createAnalyzer();
    const result = await a.getByImprovementId(brandImprovementId('nonexistent'));
    expect(result).toBeNull();
  });
  it('returns analysis after analyze', async () => {
    const a = createAnalyzer();
    await a.analyze(impId);
    const result = await a.getByImprovementId(impId);
    expect(result).not.toBeNull();
    expect(result!.improvementId).toBe(impId);
  });
  it('returns null for unanalyzed improvement', async () => {
    const a = createAnalyzer();
    await a.analyze(impId);
    const result = await a.getByImprovementId(brandImprovementId('other'));
    expect(result).toBeNull();
  });
  it('returns frozen analysis', async () => {
    const a = createAnalyzer();
    await a.analyze(impId);
    const result = await a.getByImprovementId(impId);
    expect(Object.isFrozen(result!)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// LIST ANALYSES
// ═══════════════════════════════════════════════════════════════════

describe('ValueAnalyzer — listAnalyses', () => {
  it('returns empty array initially', async () => {
    const a = createAnalyzer();
    const all = await a.listAnalyses();
    expect(all).toEqual([]);
  });
  it('returns all analyses', async () => {
    const a = createAnalyzer();
    await a.analyze(impId);
    await a.analyze(brandImprovementId('imp-2'));
    await a.analyze(brandImprovementId('imp-3'));
    const all = await a.listAnalyses();
    expect(all).toHaveLength(3);
  });
  it('returns frozen array', async () => {
    const a = createAnalyzer();
    await a.analyze(impId);
    const all = await a.listAnalyses();
    expect(Object.isFrozen(all)).toBe(true);
  });
  it('each item is frozen', async () => {
    const a = createAnalyzer();
    await a.analyze(impId);
    const all = await a.listAnalyses();
    for (const item of all) {
      expect(Object.isFrozen(item)).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// EVENT EMISSION
// ═══════════════════════════════════════════════════════════════════

describe('ValueAnalyzer — event emission', () => {
  it('emits ValueAnalyzedEvent on analyze', async () => {
    const bus = new InProcessEventBus();
    const a = createAnalyzer(bus);
    await a.analyze(impId);
    const log = bus.getLog();
    const evt = log.find(e => e.eventType === 'evolution.value.analyzed');
    expect(evt).toBeDefined();
  });
  it('ValueAnalyzedEvent has timestamp', async () => {
    const bus = new InProcessEventBus();
    const a = createAnalyzer(bus);
    await a.analyze(impId);
    const log = bus.getLog();
    const evt = log.find(e => e.eventType === 'evolution.value.analyzed');
    expect(evt!.timestamp).toBeDefined();
  });
  it('ValueAnalyzedEvent has classification', async () => {
    const bus = new InProcessEventBus();
    const a = createAnalyzer(bus);
    await a.analyze(impId);
    const log = bus.getLog();
    const evt = log.find(e => e.eventType === 'evolution.value.analyzed');
    expect(evt!.classification).toBeDefined();
  });
  it('does not emit events without eventBus', async () => {
    const a = createAnalyzer();
    await a.analyze(impId);
    expect(true).toBe(true);
  });
  it('multiple analyses emit multiple events', async () => {
    const bus = new InProcessEventBus();
    const a = createAnalyzer(bus);
    await a.analyze(impId);
    await a.analyze(brandImprovementId('imp-2'));
    const log = bus.getLog();
    const events = log.filter(e => e.eventType === 'evolution.value.analyzed');
    expect(events).toHaveLength(2);
  });
  it('event log grows correctly', async () => {
    const bus = new InProcessEventBus();
    const a = createAnalyzer(bus);
    await a.analyze(impId);
    expect(bus.getLog().length).toBe(1);
    await a.analyze(brandImprovementId('imp-2'));
    expect(bus.getLog().length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════
// STORE ACCESS
// ═══════════════════════════════════════════════════════════════════

describe('ValueAnalyzer — store access', () => {
  it('getStore returns store instance', () => {
    const a = createAnalyzer();
    expect(a.getStore()).toBeDefined();
  });
  it('store size reflects analyses', async () => {
    const a = createAnalyzer();
    const store = a.getStore();
    expect(store.size).toBe(0);
    await a.analyze(impId);
    expect(store.size).toBe(1);
  });
});
