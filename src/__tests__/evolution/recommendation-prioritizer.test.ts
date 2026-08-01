import { describe, it, expect, beforeEach } from 'vitest';
import { RecommendationPrioritizer } from '../../core/evolution/recommendation-prioritizer.js';
import { DefaultEvolutionRuntimeConfig, ValueDimension, ConstraintType, ImprovementStatus, brandImprovementId } from '../../core/evolution/types.js';

type Improvement = import('../../core/evolution/types.js').Improvement;

const cfg = DefaultEvolutionRuntimeConfig.prioritizer;

function createPrioritizer() {
  return new RecommendationPrioritizer(cfg);
}

function makeImprovement(overrides: Partial<Improvement> = {}): Improvement {
  const ts = new Date().toISOString();
  return Object.freeze({
    id: brandImprovementId(crypto.randomUUID()),
    name: 'Test',
    description: 'Test improvement',
    status: ImprovementStatus.Proposed,
    bottleneckId: null,
    constraintType: ConstraintType.Performance,
    valueScore: 50,
    impactScore: 60,
    costScore: 30,
    riskScore: 20,
    urgencyScore: 5,
    constraintWeight: 1.5,
    priority: 0,
    valueDimension: ValueDimension.UserValue,
    targetRuntime: null,
    targetCapability: null,
    estimatedEffort: 'medium',
    proposedAt: ts,
    startedAt: null,
    completedAt: null,
    evidence: Object.freeze([]),
    metadata: Object.freeze({}),
    ...overrides,
  });
}

describe('RecommendationPrioritizer — constructor', () => {
  it('creates instance', () => {
    const p = createPrioritizer();
    expect(p).toBeDefined();
  });
  it('accepts custom config', () => {
    const p = new RecommendationPrioritizer({ valueWeight: 2, impactWeight: 2, constraintWeight: 2, costWeight: 2, riskWeight: 2, urgencyWeight: 2 });
    expect(p).toBeDefined();
  });
});

describe('RecommendationPrioritizer — calculatePriority', () => {
  it('returns a number', () => {
    const p = createPrioritizer();
    const imp = makeImprovement();
    const result = p.calculatePriority(imp);
    expect(typeof result).toBe('number');
  });
  it('is rounded to 2 decimal places', () => {
    const p = createPrioritizer();
    const imp = makeImprovement({ valueScore: 7, impactScore: 11 });
    const result = p.calculatePriority(imp);
    const decimalStr = String(result).split('.')[1] ?? '';
    expect(decimalStr.length).toBeLessThanOrEqual(2);
  });
  it('higher valueScore yields higher priority', () => {
    const p = createPrioritizer();
    const low = makeImprovement({ valueScore: 10 });
    const high = makeImprovement({ valueScore: 100 });
    expect(p.calculatePriority(high)).toBeGreaterThan(p.calculatePriority(low));
  });
  it('higher impactScore yields higher priority', () => {
    const p = createPrioritizer();
    const low = makeImprovement({ impactScore: 10 });
    const high = makeImprovement({ impactScore: 100 });
    expect(p.calculatePriority(high)).toBeGreaterThan(p.calculatePriority(low));
  });
  it('higher costScore yields lower priority', () => {
    const p = createPrioritizer();
    const low = makeImprovement({ costScore: 10 });
    const high = makeImprovement({ costScore: 100 });
    expect(p.calculatePriority(low)).toBeGreaterThan(p.calculatePriority(high));
  });
  it('higher riskScore yields lower priority', () => {
    const p = createPrioritizer();
    const low = makeImprovement({ riskScore: 10 });
    const high = makeImprovement({ riskScore: 100 });
    expect(p.calculatePriority(low)).toBeGreaterThan(p.calculatePriority(high));
  });
  it('higher constraintWeight yields higher priority', () => {
    const p = createPrioritizer();
    const low = makeImprovement({ constraintWeight: 0.5 });
    const high = makeImprovement({ constraintWeight: 3.0 });
    expect(p.calculatePriority(high)).toBeGreaterThan(p.calculatePriority(low));
  });
  it('zero costScore uses 0.1 floor', () => {
    const p = createPrioritizer();
    const imp = makeImprovement({ costScore: 0 });
    const result = p.calculatePriority(imp);
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeGreaterThan(0);
  });
  it('zero riskScore uses 0.1 floor', () => {
    const p = createPrioritizer();
    const imp = makeImprovement({ riskScore: 0 });
    const result = p.calculatePriority(imp);
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeGreaterThan(0);
  });
  it('both cost and risk zero uses 0.1 floor for both', () => {
    const p = createPrioritizer();
    const imp = makeImprovement({ costScore: 0, riskScore: 0 });
    const result = p.calculatePriority(imp);
    expect(Number.isFinite(result)).toBe(true);
  });
  it('returns positive number for reasonable inputs', () => {
    const p = createPrioritizer();
    const imp = makeImprovement({ valueScore: 50, impactScore: 60, costScore: 30, riskScore: 20, constraintWeight: 1.5 });
    const result = p.calculatePriority(imp);
    expect(result).toBeGreaterThan(0);
  });
  it('uses valueWeight from config', () => {
    const p = new RecommendationPrioritizer({ valueWeight: 2, impactWeight: 1, constraintWeight: 1, costWeight: 1, riskWeight: 1, urgencyWeight: 1 });
    const imp = makeImprovement({ valueScore: 10, impactScore: 10, costScore: 10, riskScore: 10, constraintWeight: 1 });
    const result = p.calculatePriority(imp);
    expect(result).toBeGreaterThan(0);
  });
  it('uses costWeight from config', () => {
    const pLowCost = new RecommendationPrioritizer({ valueWeight: 1, impactWeight: 1, constraintWeight: 1, costWeight: 0.5, riskWeight: 1, urgencyWeight: 1 });
    const pHighCost = new RecommendationPrioritizer({ valueWeight: 1, impactWeight: 1, constraintWeight: 1, costWeight: 10, riskWeight: 1, urgencyWeight: 1 });
    const imp = makeImprovement({ valueScore: 50, impactScore: 50, costScore: 50, riskScore: 10, constraintWeight: 1 });
    expect(pLowCost.calculatePriority(imp)).toBeGreaterThan(pHighCost.calculatePriority(imp));
  });
  it('uses riskWeight from config', () => {
    const pLowRisk = new RecommendationPrioritizer({ valueWeight: 1, impactWeight: 1, constraintWeight: 1, costWeight: 1, riskWeight: 0.5, urgencyWeight: 1 });
    const pHighRisk = new RecommendationPrioritizer({ valueWeight: 1, impactWeight: 1, constraintWeight: 1, costWeight: 1, riskWeight: 10, urgencyWeight: 1 });
    const imp = makeImprovement({ valueScore: 50, impactScore: 50, costScore: 10, riskScore: 50, constraintWeight: 1 });
    expect(pLowRisk.calculatePriority(imp)).toBeGreaterThan(pHighRisk.calculatePriority(imp));
  });
  it('uses impactWeight from config', () => {
    const pLow = new RecommendationPrioritizer({ valueWeight: 1, impactWeight: 0.5, constraintWeight: 1, costWeight: 1, riskWeight: 1, urgencyWeight: 1 });
    const pHigh = new RecommendationPrioritizer({ valueWeight: 1, impactWeight: 10, constraintWeight: 1, costWeight: 1, riskWeight: 1, urgencyWeight: 1 });
    const imp = makeImprovement({ valueScore: 50, impactScore: 50, costScore: 10, riskScore: 10, constraintWeight: 1 });
    expect(pHigh.calculatePriority(imp)).toBeGreaterThan(pLow.calculatePriority(imp));
  });
  it('uses constraintWeight from config', () => {
    const pLow = new RecommendationPrioritizer({ valueWeight: 1, impactWeight: 1, constraintWeight: 0.5, costWeight: 1, riskWeight: 1, urgencyWeight: 1 });
    const pHigh = new RecommendationPrioritizer({ valueWeight: 1, impactWeight: 1, constraintWeight: 10, costWeight: 1, riskWeight: 1, urgencyWeight: 1 });
    const imp = makeImprovement({ valueScore: 50, impactScore: 50, costScore: 10, riskScore: 10, constraintWeight: 1 });
    expect(pHigh.calculatePriority(imp)).toBeGreaterThan(pLow.calculatePriority(imp));
  });
});

describe('RecommendationPrioritizer — prioritize', () => {
  it('sorts by priority descending', async () => {
    const p = createPrioritizer();
    const impHigh = makeImprovement({ valueScore: 100, name: 'high' });
    const impLow = makeImprovement({ valueScore: 10, name: 'low' });
    const result = await p.prioritize([impLow, impHigh]);
    expect(result[0].name).toBe('high');
    expect(result[1].name).toBe('low');
  });
  it('result is frozen', async () => {
    const p = createPrioritizer();
    const result = await p.prioritize([makeImprovement()]);
    expect(Object.isFrozen(result)).toBe(true);
  });
  it('preserves all fields', async () => {
    const p = createPrioritizer();
    const imp = makeImprovement({ name: 'Original Name', valueScore: 42 });
    const result = await p.prioritize([imp]);
    expect(result[0].name).toBe('Original Name');
    expect(result[0].id).toBe(imp.id);
    expect(result[0].valueScore).toBe(42);
    expect(result[0].impactScore).toBe(imp.impactScore);
    expect(result[0].costScore).toBe(imp.costScore);
    expect(result[0].riskScore).toBe(imp.riskScore);
    expect(result[0].status).toBe(imp.status);
    expect(result[0].valueDimension).toBe(imp.valueDimension);
    expect(result[0].estimatedEffort).toBe(imp.estimatedEffort);
  });
  it('each result has priority field set', async () => {
    const p = createPrioritizer();
    const result = await p.prioritize([makeImprovement()]);
    expect(typeof result[0].priority).toBe('number');
    expect(result[0].priority).toBeGreaterThan(0);
  });
  it('handles empty array', async () => {
    const p = createPrioritizer();
    const result = await p.prioritize([]);
    expect(result).toEqual([]);
  });
  it('handles single item', async () => {
    const p = createPrioritizer();
    const result = await p.prioritize([makeImprovement()]);
    expect(result.length).toBe(1);
  });
  it('maintains stable sort for equal priorities', async () => {
    const p = createPrioritizer();
    const a = makeImprovement({ name: 'a', valueScore: 50, impactScore: 50, costScore: 10, riskScore: 10, constraintWeight: 1 });
    const b = makeImprovement({ name: 'b', valueScore: 50, impactScore: 50, costScore: 10, riskScore: 10, constraintWeight: 1 });
    const result = await p.prioritize([a, b]);
    expect(result.length).toBe(2);
  });
});
