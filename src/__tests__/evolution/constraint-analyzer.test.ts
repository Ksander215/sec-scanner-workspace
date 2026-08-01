import { describe, it, expect } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { ConstraintAnalyzer } from '../../core/evolution/constraint-analyzer.js';
import { DefaultEvolutionRuntimeConfig, brandBottleneckId } from '../../core/evolution/types.js';

const cfg = DefaultEvolutionRuntimeConfig.constraintAnalyzer;

function createAnalyzer(bus?: InProcessEventBus) {
  return new ConstraintAnalyzer(cfg, bus);
}

describe('ConstraintAnalyzer — constructor', () => {
  it('creates without eventBus', () => {
    const a = createAnalyzer();
    expect(a).toBeDefined();
  });
  it('creates with eventBus', () => {
    const a = createAnalyzer(new InProcessEventBus());
    expect(a).toBeDefined();
  });
});

describe('ConstraintAnalyzer — analyze', () => {
  it('returns analysis with all required fields', async () => {
    const a = createAnalyzer();
    const result = await a.analyze(brandBottleneckId('bn-1'));
    expect(result.id).toBeDefined();
    expect(result.bottleneckId).toBe(brandBottleneckId('bn-1'));
    expect(result.constraintType).toBeDefined();
    expect(result.rootCause).toBeDefined();
    expect(result.impactDescription).toBeDefined();
    expect(result.analyzedAt).toBeDefined();
    expect(result.affectedRuntimes).toEqual([]);
    expect(result.affectedCapabilities).toEqual([]);
    expect(result.suggestedImprovements).toEqual([]);
  });
  it('returns frozen analysis', async () => {
    const a = createAnalyzer();
    const result = await a.analyze(brandBottleneckId('bn-1'));
    expect(Object.isFrozen(result)).toBe(true);
  });
  it('emits ConstraintAnalyzedEvent', async () => {
    const bus = new InProcessEventBus();
    const a = createAnalyzer(bus);
    await a.analyze(brandBottleneckId('bn-1'));
    const log = bus.getLog();
    const events = log.filter(e => e.eventType === 'evolution.constraint.analyzed');
    expect(events.length).toBe(1);
  });
});

describe('ConstraintAnalyzer — getAnalysis', () => {
  it('returns null for unknown session', async () => {
    const a = createAnalyzer();
    const result = await a.getAnalysis('nonexistent');
    expect(result).toBeNull();
  });
  it('returns analysis after analyze', async () => {
    const a = createAnalyzer();
    const analysis = await a.analyze(brandBottleneckId('bn-1'));
    const found = await a.getAnalysis(analysis.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(analysis.id);
  });
});

describe('ConstraintAnalyzer — listAnalyses', () => {
  it('returns empty initially', async () => {
    const a = createAnalyzer();
    expect(await a.listAnalyses()).toEqual([]);
  });
  it('returns analyses after analyze', async () => {
    const a = createAnalyzer();
    await a.analyze(brandBottleneckId('bn-1'));
    const list = await a.listAnalyses();
    expect(list.length).toBe(1);
  });
});
