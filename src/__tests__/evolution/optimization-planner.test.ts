import { describe, it, expect, beforeEach } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { OptimizationPlanner } from '../../core/evolution/optimization-planner.js';
import { DefaultEvolutionRuntimeConfig } from '../../core/evolution/types.js';
import { ImprovementStatus, RoadmapItemStatus, ValueDimension, ConstraintType, brandImprovementId } from '../../core/evolution/types.js';

type Improvement = import('../../core/evolution/types.js').Improvement;

const cfg = DefaultEvolutionRuntimeConfig.optimizationPlanner;

function createPlanner(bus?: InProcessEventBus) {
  return new OptimizationPlanner(cfg, bus);
}

function makeImprovement(overrides: Partial<Improvement> = {}): Improvement {
  const ts = new Date().toISOString();
  return Object.freeze({
    id: brandImprovementId(crypto.randomUUID()),
    name: 'Test Improvement',
    description: 'A test improvement',
    status: ImprovementStatus.Proposed,
    bottleneckId: null,
    constraintType: ConstraintType.Performance,
    valueScore: 50,
    impactScore: 60,
    costScore: 30,
    riskScore: 20,
    urgencyScore: 5,
    constraintWeight: 1.5,
    priority: 100,
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

describe('OptimizationPlanner — constructor', () => {
  it('creates instance without eventBus', () => {
    const p = createPlanner();
    expect(p).toBeDefined();
  });
  it('creates instance with eventBus', () => {
    const p = createPlanner(new InProcessEventBus());
    expect(p).toBeDefined();
  });
});

describe('OptimizationPlanner — setImprovements', () => {
  it('sets improvements', () => {
    const p = createPlanner();
    const imps = [makeImprovement()];
    p.setImprovements(imps);
  });
  it('replaces existing improvements', () => {
    const p = createPlanner();
    p.setImprovements([makeImprovement({ name: 'A' })]);
    p.setImprovements([makeImprovement({ name: 'B' })]);
  });
  it('accepts empty array', () => {
    const p = createPlanner();
    p.setImprovements([]);
  });
});

describe('OptimizationPlanner — generateRoadmap', () => {
  it('returns roadmap with correct title', async () => {
    const p = createPlanner();
    p.setImprovements([makeImprovement()]);
    const roadmap = await p.generateRoadmap('Custom Title');
    expect(roadmap.title).toBe('Custom Title');
  });
  it('uses default title when none provided', async () => {
    const p = createPlanner();
    p.setImprovements([makeImprovement()]);
    const roadmap = await p.generateRoadmap();
    expect(roadmap.title).toBe('Evolution Roadmap');
  });
  it('returns roadmap with correct description', async () => {
    const p = createPlanner();
    p.setImprovements([makeImprovement()]);
    const roadmap = await p.generateRoadmap('Title', 'Custom desc');
    expect(roadmap.description).toBe('Custom desc');
  });
  it('uses default description when none provided', async () => {
    const p = createPlanner();
    p.setImprovements([makeImprovement()]);
    const roadmap = await p.generateRoadmap();
    expect(roadmap.description).toBe('Auto-generated improvement roadmap based on priority analysis');
  });
  it('creates roadmap with items sorted by priority descending', async () => {
    const p = createPlanner();
    const imps = [
      makeImprovement({ name: 'Low', priority: 10, valueScore: 10 }),
      makeImprovement({ name: 'High', priority: 100, valueScore: 50 }),
      makeImprovement({ name: 'Mid', priority: 50, valueScore: 30 }),
    ];
    p.setImprovements(imps);
    const roadmap = await p.generateRoadmap();
    expect(roadmap.items[0].name).toBe('High');
    expect(roadmap.items[1].name).toBe('Mid');
    expect(roadmap.items[2].name).toBe('Low');
  });
  it('roadmap is frozen', async () => {
    const p = createPlanner();
    p.setImprovements([makeImprovement()]);
    const roadmap = await p.generateRoadmap();
    expect(Object.isFrozen(roadmap)).toBe(true);
  });
  it('roadmap items are frozen', async () => {
    const p = createPlanner();
    p.setImprovements([makeImprovement()]);
    const roadmap = await p.generateRoadmap();
    for (const item of roadmap.items) {
      expect(Object.isFrozen(item)).toBe(true);
    }
  });
  it('roadmap items array is frozen', async () => {
    const p = createPlanner();
    p.setImprovements([makeImprovement()]);
    const roadmap = await p.generateRoadmap();
    expect(Object.isFrozen(roadmap.items)).toBe(true);
  });
  it('calculates correct totalValue', async () => {
    const p = createPlanner();
    const imps = [
      makeImprovement({ valueScore: 10 }),
      makeImprovement({ valueScore: 20 }),
      makeImprovement({ valueScore: 30 }),
    ];
    p.setImprovements(imps);
    const roadmap = await p.generateRoadmap();
    expect(roadmap.totalValue).toBe(60);
  });
  it('totalValue is zero when no improvements', async () => {
    const p = createPlanner();
    const roadmap = await p.generateRoadmap();
    expect(roadmap.totalValue).toBe(0);
  });
  it('only includes Proposed and Planned improvements', async () => {
    const p = createPlanner();
    const imps = [
      makeImprovement({ name: 'Proposed', status: ImprovementStatus.Proposed, valueScore: 10 }),
      makeImprovement({ name: 'Planned', status: ImprovementStatus.Planned, valueScore: 20 }),
      makeImprovement({ name: 'InProgress', status: ImprovementStatus.InProgress, valueScore: 30 }),
      makeImprovement({ name: 'Completed', status: ImprovementStatus.Completed, valueScore: 40 }),
      makeImprovement({ name: 'Failed', status: ImprovementStatus.Failed, valueScore: 50 }),
    ];
    p.setImprovements(imps);
    const roadmap = await p.generateRoadmap();
    expect(roadmap.items.length).toBe(2);
    expect(roadmap.items.map(i => i.name)).toContain('Proposed');
    expect(roadmap.items.map(i => i.name)).toContain('Planned');
  });
  it('respects maxRoadmapItems limit', async () => {
    const p = new OptimizationPlanner({ maxRoadmapItems: 2, maxConcurrentImprovements: 10, replanIntervalMs: 300_000 });
    const imps = [
      makeImprovement({ priority: 100, valueScore: 1 }),
      makeImprovement({ priority: 90, valueScore: 2 }),
      makeImprovement({ priority: 80, valueScore: 3 }),
    ];
    p.setImprovements(imps);
    const roadmap = await p.generateRoadmap();
    expect(roadmap.items.length).toBe(2);
  });
  it('each item has correct order starting from 1', async () => {
    const p = createPlanner();
    const imps = [
      makeImprovement({ priority: 100, valueScore: 1 }),
      makeImprovement({ priority: 90, valueScore: 2 }),
      makeImprovement({ priority: 80, valueScore: 3 }),
    ];
    p.setImprovements(imps);
    const roadmap = await p.generateRoadmap();
    expect(roadmap.items[0].order).toBe(1);
    expect(roadmap.items[1].order).toBe(2);
    expect(roadmap.items[2].order).toBe(3);
  });
  it('each item has status Pending', async () => {
    const p = createPlanner();
    p.setImprovements([makeImprovement()]);
    const roadmap = await p.generateRoadmap();
    for (const item of roadmap.items) {
      expect(item.status).toBe(RoadmapItemStatus.Pending);
    }
  });
  it('each item has empty dependsOn', async () => {
    const p = createPlanner();
    p.setImprovements([makeImprovement()]);
    const roadmap = await p.generateRoadmap();
    for (const item of roadmap.items) {
      expect(item.dependsOn).toEqual([]);
    }
  });
  it('each item copies improvementId', async () => {
    const p = createPlanner();
    const imp = makeImprovement();
    p.setImprovements([imp]);
    const roadmap = await p.generateRoadmap();
    expect(roadmap.items[0].improvementId).toBe(imp.id);
  });
  it('each item copies estimatedEffort', async () => {
    const p = createPlanner();
    p.setImprovements([makeImprovement({ estimatedEffort: 'large' })]);
    const roadmap = await p.generateRoadmap();
    expect(roadmap.items[0].estimatedEffort).toBe('large');
  });
  it('roadmap has unique id', async () => {
    const p = createPlanner();
    p.setImprovements([makeImprovement()]);
    const r1 = await p.generateRoadmap();
    const r2 = await p.generateRoadmap();
    expect(r1.id).not.toBe(r2.id);
  });
  it('totalEffort joins estimated efforts', async () => {
    const p = createPlanner();
    p.setImprovements([
      makeImprovement({ estimatedEffort: 'small', priority: 100, valueScore: 10 }),
      makeImprovement({ estimatedEffort: 'large', priority: 90, valueScore: 10 }),
    ]);
    const roadmap = await p.generateRoadmap();
    expect(roadmap.totalEffort).toContain('small');
    expect(roadmap.totalEffort).toContain('large');
  });
  it('totalEffort defaults to Not estimated when no items', async () => {
    const p = createPlanner();
    const roadmap = await p.generateRoadmap();
    expect(roadmap.totalEffort).toBe('Not estimated');
  });
  it('createdAt and updatedAt are set', async () => {
    const p = createPlanner();
    p.setImprovements([makeImprovement()]);
    const roadmap = await p.generateRoadmap();
    expect(roadmap.createdAt).toBeDefined();
    expect(roadmap.updatedAt).toBeDefined();
  });
  it('createdAt equals updatedAt on fresh roadmap', async () => {
    const p = createPlanner();
    p.setImprovements([makeImprovement()]);
    const roadmap = await p.generateRoadmap();
    expect(roadmap.createdAt).toBe(roadmap.updatedAt);
  });
  it('emits evolution.roadmap.created event', async () => {
    const bus = new InProcessEventBus();
    const p = createPlanner(bus);
    p.setImprovements([makeImprovement()]);
    await p.generateRoadmap();
    const log = bus.getLog();
    const events = log.filter(e => e.eventType === 'evolution.roadmap.created');
    expect(events.length).toBe(1);
  });
  it('event envelope has correct fields', async () => {
    const bus = new InProcessEventBus();
    const p = createPlanner(bus);
    p.setImprovements([makeImprovement()]);
    await p.generateRoadmap();
    const log = bus.getLog();
    const evt = log.find(e => e.eventType === 'evolution.roadmap.created');
    expect(evt).toBeDefined();
    expect(evt!.eventType).toBe('evolution.roadmap.created');
    expect(evt!.timestamp).toBeDefined();
  });
  it('emits one event per roadmap', async () => {
    const bus = new InProcessEventBus();
    const p = createPlanner(bus);
    p.setImprovements([makeImprovement(), makeImprovement()]);
    await p.generateRoadmap('R1');
    await p.generateRoadmap('R2');
    const log = bus.getLog();
    const events = log.filter(e => e.eventType === 'evolution.roadmap.created');
    expect(events.length).toBe(2);
  });
  it('does not emit events without eventBus', async () => {
    const p = createPlanner();
    p.setImprovements([makeImprovement()]);
    await p.generateRoadmap();
  });
  it('without improvements returns empty roadmap', async () => {
    const p = createPlanner();
    const roadmap = await p.generateRoadmap();
    expect(roadmap.items.length).toBe(0);
    expect(roadmap.totalValue).toBe(0);
  });
});

describe('OptimizationPlanner — getRoadmap', () => {
  it('returns null for unknown id', async () => {
    const p = createPlanner();
    const result = await p.getRoadmap('nonexistent' as any);
    expect(result).toBeNull();
  });
  it('returns roadmap after generateRoadmap', async () => {
    const p = createPlanner();
    p.setImprovements([makeImprovement()]);
    const roadmap = await p.generateRoadmap();
    const found = await p.getRoadmap(roadmap.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(roadmap.id);
  });
  it('returns frozen roadmap', async () => {
    const p = createPlanner();
    p.setImprovements([makeImprovement()]);
    const roadmap = await p.generateRoadmap();
    const found = await p.getRoadmap(roadmap.id);
    expect(Object.isFrozen(found!)).toBe(true);
  });
});

describe('OptimizationPlanner — listRoadmaps', () => {
  it('returns empty array initially', async () => {
    const p = createPlanner();
    const roadmaps = await p.listRoadmaps();
    expect(roadmaps).toEqual([]);
  });
  it('returns all generated roadmaps', async () => {
    const p = createPlanner();
    p.setImprovements([makeImprovement()]);
    await p.generateRoadmap('R1');
    await p.generateRoadmap('R2');
    const roadmaps = await p.listRoadmaps();
    expect(roadmaps.length).toBe(2);
  });
  it('returns frozen array', async () => {
    const p = createPlanner();
    p.setImprovements([makeImprovement()]);
    await p.generateRoadmap();
    const roadmaps = await p.listRoadmaps();
    expect(Object.isFrozen(roadmaps)).toBe(true);
  });
});

describe('OptimizationPlanner — updateItemStatus', () => {
  it('updates item status', async () => {
    const p = createPlanner();
    const imp = makeImprovement();
    p.setImprovements([imp]);
    const roadmap = await p.generateRoadmap();
    await p.updateItemStatus(roadmap.id, imp.id, RoadmapItemStatus.InProgress);
    const updated = await p.getRoadmap(roadmap.id);
    expect(updated!.items[0].status).toBe(RoadmapItemStatus.InProgress);
  });
  it('updates updatedAt timestamp', async () => {
    const p = createPlanner();
    const imp = makeImprovement();
    p.setImprovements([imp]);
    const roadmap = await p.generateRoadmap();
    const beforeUpdate = roadmap.updatedAt;
    // small delay to ensure timestamp differs
    await new Promise(r => setTimeout(r, 5));
    await p.updateItemStatus(roadmap.id, imp.id, RoadmapItemStatus.Completed);
    const updated = await p.getRoadmap(roadmap.id);
    expect(updated!.updatedAt).not.toBe(beforeUpdate);
  });
  it('does not throw for unknown roadmap', async () => {
    const p = createPlanner();
    await expect(
      p.updateItemStatus('nonexistent' as any, 'item' as any, RoadmapItemStatus.Pending)
    ).resolves.toBeUndefined();
  });
  it('does not modify other items', async () => {
    const p = createPlanner();
    const imp1 = makeImprovement({ name: 'A', priority: 100, valueScore: 10 });
    const imp2 = makeImprovement({ name: 'B', priority: 90, valueScore: 20 });
    p.setImprovements([imp1, imp2]);
    const roadmap = await p.generateRoadmap();
    await p.updateItemStatus(roadmap.id, imp1.id, RoadmapItemStatus.InProgress);
    const updated = await p.getRoadmap(roadmap.id);
    expect(updated!.items[0].status).toBe(RoadmapItemStatus.InProgress);
    expect(updated!.items[1].status).toBe(RoadmapItemStatus.Pending);
  });
  it('updated roadmap is frozen', async () => {
    const p = createPlanner();
    const imp = makeImprovement();
    p.setImprovements([imp]);
    const roadmap = await p.generateRoadmap();
    await p.updateItemStatus(roadmap.id, imp.id, RoadmapItemStatus.InProgress);
    const updated = await p.getRoadmap(roadmap.id);
    expect(Object.isFrozen(updated!)).toBe(true);
  });
});

describe('OptimizationPlanner — store access', () => {
  it('getStore returns store', () => {
    const p = createPlanner();
    expect(p.getStore()).toBeDefined();
  });
  it('store size is 0 initially', () => {
    const p = createPlanner();
    expect(p.getStore().size).toBe(0);
  });
  it('store size increases after generateRoadmap', async () => {
    const p = createPlanner();
    p.setImprovements([makeImprovement()]);
    await p.generateRoadmap();
    expect(p.getStore().size).toBe(1);
  });
});
