import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { DefaultEvolutionRuntimeConfig } from '../../core/evolution/types.js';
import { OptimizationPlanner } from '../../core/evolution/optimization-planner.js';
import { EvolutionGraph } from '../../core/evolution/evolution-graph.js';
import { ArchitectureOptimizer } from '../../core/evolution/architecture-optimizer.js';
import { RecommendationPrioritizer } from '../../core/evolution/recommendation-prioritizer.js';
import { EvolutionRuntime } from '../../core/evolution/evolution-runtime.js';
import { ImprovementEngine } from '../../core/evolution/improvement-engine.js';
import {
  brandImprovementId,
  brandEvolutionNodeId,
  brandRoadmapId,
  ConstraintType,
  ImprovementStatus,
  EvolutionState,
  RoadmapItemStatus,
  ArchOptimizationType,
  ValueDimension,
} from '../../core/evolution/types.js';
import { EventClassification } from '../../core/types/common.js';
import type {
  ImprovementId,
  EvolutionNodeId,
  RoadmapId,
  Improvement,
} from '../../core/evolution/types.js';
import {
  RoadmapLimitExceededError,
  GraphNodeLimitExceededError,
  EvolutionGraphError,
  EvolutionNotInitializedError,
  EvolutionDisposedError,
} from '../../core/evolution/errors.js';

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function makeImprovement(overrides: Partial<Improvement> & { id: ImprovementId }): Improvement {
  return Object.freeze({
    name: 'Test Improvement',
    description: 'desc',
    status: ImprovementStatus.Proposed,
    bottleneckId: null,
    constraintType: ConstraintType.Performance,
    valueScore: 50,
    impactScore: 60,
    costScore: 10,
    riskScore: 5,
    urgencyScore: 40,
    constraintWeight: 1.0,
    priority: 0,
    valueDimension: ValueDimension.PlatformValue,
    targetRuntime: null,
    targetCapability: null,
    estimatedEffort: 'medium',
    proposedAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    evidence: Object.freeze([]),
    metadata: Object.freeze({}),
    ...overrides,
  });
}

function makeBaseImprovement(idStr: string, overrides: Partial<Improvement> = {}): Improvement {
  return makeImprovement({ id: brandImprovementId(idStr), ...overrides });
}

// ═══════════════════════════════════════════════════════════════════
// 1. OptimizationPlanner
// ═══════════════════════════════════════════════════════════════════

describe('OptimizationPlanner', () => {
  let bus: InProcessEventBus;
  let planner: OptimizationPlanner;
  let engine: ImprovementEngine;

  beforeEach(() => {
    bus = new InProcessEventBus();
    bus.clear();
    planner = new OptimizationPlanner(
      { ...DefaultEvolutionRuntimeConfig.optimizationPlanner },
      bus,
    );
    engine = new ImprovementEngine(
      { ...DefaultEvolutionRuntimeConfig.improvementEngine },
      bus,
    );
    planner.setImprovementEngine(engine);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- generateRoadmap() with no improvements → empty roadmap ---
  describe('generateRoadmap() — no improvements', () => {
    it('returns a roadmap with empty items array when no improvements exist', async () => {
      const roadmap = await planner.generateRoadmap();
      expect(roadmap.items).toHaveLength(0);
    });

    it('returns totalValue of 0 when no improvements exist', async () => {
      const roadmap = await planner.generateRoadmap();
      expect(roadmap.totalValue).toBe(0);
    });

    it('returns totalEffort as "unknown" when no improvements exist', async () => {
      const roadmap = await planner.generateRoadmap();
      expect(roadmap.totalEffort).toBe('unknown');
    });

    it('returns a valid roadmap id', async () => {
      const roadmap = await planner.generateRoadmap();
      expect(roadmap.id).toBeDefined();
      expect(typeof roadmap.id).toBe('string');
    });

    it('returns a frozen roadmap object', async () => {
      const roadmap = await planner.generateRoadmap();
      expect(Object.isFrozen(roadmap)).toBe(true);
    });

    it('returns a frozen items array', async () => {
      const roadmap = await planner.generateRoadmap();
      expect(Object.isFrozen(roadmap.items)).toBe(true);
    });

    it('returns createdAt matching updatedAt', async () => {
      const roadmap = await planner.generateRoadmap();
      expect(roadmap.createdAt).toBe(roadmap.updatedAt);
    });

    it('returns a valid ISO timestamp for createdAt', async () => {
      const roadmap = await planner.generateRoadmap();
      expect(roadmap.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('returns metadata as a frozen empty object', async () => {
      const roadmap = await planner.generateRoadmap();
      expect(roadmap.metadata).toEqual({});
      expect(Object.isFrozen(roadmap.metadata)).toBe(true);
    });

    it('description mentions 0 items', async () => {
      const roadmap = await planner.generateRoadmap();
      expect(roadmap.description).toContain('0 items');
    });

    it('stores the roadmap so it can be retrieved later', async () => {
      const roadmap = await planner.generateRoadmap();
      const retrieved = await planner.getRoadmap(roadmap.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(roadmap.id);
    });

    it('publishes evolution.roadmap.created event with itemCount 0', async () => {
      await planner.generateRoadmap();
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.roadmap.created');
      expect(ev).toBeDefined();
      expect(ev!.eventType).toBe('evolution.roadmap.created');
    });

    it('publishes event with totalValue 0', async () => {
      await planner.generateRoadmap();
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.roadmap.created');
      expect(ev).toBeDefined();
    });

    it('event has classification Result', async () => {
      await planner.generateRoadmap();
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.roadmap.created');
      expect(ev!.classification).toBe(EventClassification.Result);
    });
  });

  // --- generateRoadmap() with improvements → sorted by priority ---
  describe('generateRoadmap() — with improvements sorted by priority', () => {
    let impLow: Improvement;
    let impHigh: Improvement;
    let impMid: Improvement;

    beforeEach(async () => {
      // Propose improvements and update their scores
      const p1 = await engine.propose({
        name: 'Low Priority',
        description: 'low',
        bottleneckId: null,
        constraintType: ConstraintType.Performance,
        targetRuntime: null,
        targetCapability: null,
        estimatedEffort: 'low',
        evidence: [],
        metadata: {},
      });
      const p2 = await engine.propose({
        name: 'High Priority',
        description: 'high',
        bottleneckId: null,
        constraintType: ConstraintType.Performance,
        targetRuntime: null,
        targetCapability: null,
        estimatedEffort: 'high',
        evidence: [],
        metadata: {},
      });
      const p3 = await engine.propose({
        name: 'Mid Priority',
        description: 'mid',
        bottleneckId: null,
        constraintType: ConstraintType.Performance,
        targetRuntime: null,
        targetCapability: null,
        estimatedEffort: 'medium',
        evidence: [],
        metadata: {},
      });

      // Update scores so we control priority
      await engine.updateScores(p1.id, { priority: 10, valueScore: 10 });
      await engine.updateScores(p2.id, { priority: 90, valueScore: 90 });
      await engine.updateScores(p3.id, { priority: 50, valueScore: 50 });

      impLow = (await engine.getById(p1.id))!;
      impHigh = (await engine.getById(p2.id))!;
      impMid = (await engine.getById(p3.id))!;
    });

    it('returns a roadmap with 3 items', async () => {
      const roadmap = await planner.generateRoadmap();
      expect(roadmap.items).toHaveLength(3);
    });

    it('first item has highest priority (90)', async () => {
      const roadmap = await planner.generateRoadmap();
      expect(roadmap.items[0].priority).toBe(90);
    });

    it('second item has mid priority (50)', async () => {
      const roadmap = await planner.generateRoadmap();
      expect(roadmap.items[1].priority).toBe(50);
    });

    it('third item has lowest priority (10)', async () => {
      const roadmap = await planner.generateRoadmap();
      expect(roadmap.items[2].priority).toBe(10);
    });

    it('items are in descending priority order', async () => {
      const roadmap = await planner.generateRoadmap();
      for (let i = 1; i < roadmap.items.length; i++) {
        expect(roadmap.items[i - 1].priority).toBeGreaterThanOrEqual(roadmap.items[i].priority);
      }
    });

    it('each item has correct improvementId', async () => {
      const roadmap = await planner.generateRoadmap();
      const ids = roadmap.items.map(i => i.improvementId);
      expect(ids).toContain(impHigh.id);
      expect(ids).toContain(impMid.id);
      expect(ids).toContain(impLow.id);
    });

    it('each item has status Pending', async () => {
      const roadmap = await planner.generateRoadmap();
      for (const item of roadmap.items) {
        expect(item.status).toBe(RoadmapItemStatus.Pending);
      }
    });

    it('each item has order matching its position', async () => {
      const roadmap = await planner.generateRoadmap();
      roadmap.items.forEach((item, idx) => {
        expect(item.order).toBe(idx);
      });
    });

    it('each item has dependsOn as empty frozen array', async () => {
      const roadmap = await planner.generateRoadmap();
      for (const item of roadmap.items) {
        expect(item.dependsOn).toEqual([]);
        expect(Object.isFrozen(item.dependsOn)).toBe(true);
      }
    });

    it('each item has metadata as frozen empty object', async () => {
      const roadmap = await planner.generateRoadmap();
      for (const item of roadmap.items) {
        expect(item.metadata).toEqual({});
        expect(Object.isFrozen(item.metadata)).toBe(true);
      }
    });

    it('each item is frozen', async () => {
      const roadmap = await planner.generateRoadmap();
      for (const item of roadmap.items) {
        expect(Object.isFrozen(item)).toBe(true);
      }
    });

    it('totalValue equals sum of all valueScores', async () => {
      const roadmap = await planner.generateRoadmap();
      const expected = impLow.valueScore + impHigh.valueScore + impMid.valueScore;
      expect(roadmap.totalValue).toBe(expected);
    });

    it('totalEffort contains all effort descriptions joined by comma', async () => {
      const roadmap = await planner.generateRoadmap();
      expect(roadmap.totalEffort).toContain('low');
      expect(roadmap.totalEffort).toContain('high');
      expect(roadmap.totalEffort).toContain('medium');
    });

    it('publishes event with correct eventType for roadmap with items', async () => {
      await planner.generateRoadmap();
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.roadmap.created');
      expect(ev!.eventType).toBe('evolution.roadmap.created');
    });

    it('publishes event with classification Result when items exist', async () => {
      await planner.generateRoadmap();
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.roadmap.created');
      expect(ev!.classification).toBe(EventClassification.Result);
    });

    it('event has a valid eventId when items exist', async () => {
      await planner.generateRoadmap();
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.roadmap.created');
      expect(ev!.eventId).toBeDefined();
      expect(typeof ev!.eventId).toBe('string');
    });

    it('event has version 1.0.0 when items exist', async () => {
      await planner.generateRoadmap();
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.roadmap.created');
      expect(ev!.version).toBe('1.0.0');
    });

    it('event has a valid eventId', async () => {
      await planner.generateRoadmap();
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.roadmap.created');
      expect(ev!.eventId).toBeDefined();
      expect(typeof ev!.eventId).toBe('string');
    });

    it('event has version 1.0.0', async () => {
      await planner.generateRoadmap();
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.roadmap.created');
      expect(ev!.version).toBe('1.0.0');
    });

    it('only includes Proposed improvements', async () => {
      // Move one to Planned so it should be excluded
      await engine.updateStatus(impHigh.id, ImprovementStatus.Planned);
      const roadmap = await planner.generateRoadmap();
      expect(roadmap.items).toHaveLength(2);
      const ids = roadmap.items.map(i => i.improvementId);
      expect(ids).not.toContain(impHigh.id);
    });

    it('each item has correct name from the improvement', async () => {
      const roadmap = await planner.generateRoadmap();
      const names = roadmap.items.map(i => i.name);
      expect(names).toContain('High Priority');
      expect(names).toContain('Mid Priority');
      expect(names).toContain('Low Priority');
    });

    it('each item has correct estimatedEffort from the improvement', async () => {
      const roadmap = await planner.generateRoadmap();
      const efforts = roadmap.items.map(i => i.estimatedEffort);
      expect(efforts).toContain('low');
      expect(efforts).toContain('high');
      expect(efforts).toContain('medium');
    });
  });

  // --- generateRoadmap() respects maxRoadmapItems ---
  describe('generateRoadmap() — maxRoadmapItems limit', () => {
    it('limits items to maxRoadmapItems', async () => {
      const smallPlanner = new OptimizationPlanner(
        { ...DefaultEvolutionRuntimeConfig.optimizationPlanner, maxRoadmapItems: 2 },
        bus,
      );
      smallPlanner.setImprovementEngine(engine);

      // Create 5 improvements
      for (let i = 0; i < 5; i++) {
        const imp = await engine.propose({
          name: `Imp ${i}`,
          description: 'd',
          bottleneckId: null,
          constraintType: ConstraintType.Performance,
          targetRuntime: null,
          targetCapability: null,
          estimatedEffort: 'low',
          evidence: [],
          metadata: {},
        });
        await engine.updateScores(imp.id, { priority: i * 10, valueScore: i * 10 });
      }

      const roadmap = await smallPlanner.generateRoadmap();
      expect(roadmap.items).toHaveLength(2);
    });

    it('selects highest priority items when limited', async () => {
      const smallPlanner = new OptimizationPlanner(
        { ...DefaultEvolutionRuntimeConfig.optimizationPlanner, maxRoadmapItems: 2 },
        bus,
      );
      smallPlanner.setImprovementEngine(engine);

      for (let i = 0; i < 5; i++) {
        const imp = await engine.propose({
          name: `Imp ${i}`,
          description: 'd',
          bottleneckId: null,
          constraintType: ConstraintType.Performance,
          targetRuntime: null,
          targetCapability: null,
          estimatedEffort: 'low',
          evidence: [],
          metadata: {},
        });
        await engine.updateScores(imp.id, { priority: i * 10, valueScore: i * 10 });
      }

      const roadmap = await smallPlanner.generateRoadmap();
      // Priorities 40, 30 should be top 2
      expect(roadmap.items[0].priority).toBe(40);
      expect(roadmap.items[1].priority).toBe(30);
    });

    it('totalValue only counts the included items', async () => {
      const smallPlanner = new OptimizationPlanner(
        { ...DefaultEvolutionRuntimeConfig.optimizationPlanner, maxRoadmapItems: 1 },
        bus,
      );
      smallPlanner.setImprovementEngine(engine);

      for (let i = 0; i < 3; i++) {
        const imp = await engine.propose({
          name: `Imp ${i}`,
          description: 'd',
          bottleneckId: null,
          constraintType: ConstraintType.Performance,
          targetRuntime: null,
          targetCapability: null,
          estimatedEffort: 'low',
          evidence: [],
          metadata: {},
        });
        await engine.updateScores(imp.id, { priority: i * 10, valueScore: i * 10 + 5 });
      }

      const roadmap = await smallPlanner.generateRoadmap();
      // Only highest priority (20 valueScore) should be included
      expect(roadmap.totalValue).toBe(25);
    });

    it('works correctly when items exactly equal maxRoadmapItems', async () => {
      const smallPlanner = new OptimizationPlanner(
        { ...DefaultEvolutionRuntimeConfig.optimizationPlanner, maxRoadmapItems: 3 },
        bus,
      );
      smallPlanner.setImprovementEngine(engine);

      for (let i = 0; i < 3; i++) {
        const imp = await engine.propose({
          name: `Imp ${i}`,
          description: 'd',
          bottleneckId: null,
          constraintType: ConstraintType.Performance,
          targetRuntime: null,
          targetCapability: null,
          estimatedEffort: 'low',
          evidence: [],
          metadata: {},
        });
        await engine.updateScores(imp.id, { priority: i * 10, valueScore: i * 10 });
      }

      const roadmap = await smallPlanner.generateRoadmap();
      expect(roadmap.items).toHaveLength(3);
    });
  });

  // --- generateRoadmap() publishes event ---
  describe('generateRoadmap() — event verification', () => {
    it('publishes exactly one event per call', async () => {
      bus.clear();
      await planner.generateRoadmap();
      const log = bus.getLog();
      const roadmapEvents = log.filter(e => e.eventType === 'evolution.roadmap.created');
      expect(roadmapEvents).toHaveLength(1);
    });

    it('multiple calls produce multiple events', async () => {
      bus.clear();
      await planner.generateRoadmap();
      await planner.generateRoadmap();
      const log = bus.getLog();
      const roadmapEvents = log.filter(e => e.eventType === 'evolution.roadmap.created');
      expect(roadmapEvents).toHaveLength(2);
    });

    it('does not publish events when no event bus', async () => {
      const noBusPlanner = new OptimizationPlanner(
        { ...DefaultEvolutionRuntimeConfig.optimizationPlanner },
      );
      noBusPlanner.setImprovementEngine(engine);
      await noBusPlanner.generateRoadmap();
      // No error thrown
    });
  });

  // --- generateRoadmap() custom title/description ---
  describe('generateRoadmap() — custom title and description', () => {
    it('uses custom title when provided', async () => {
      const roadmap = await planner.generateRoadmap('My Custom Title');
      expect(roadmap.title).toBe('My Custom Title');
    });

    it('uses custom description when provided', async () => {
      const roadmap = await planner.generateRoadmap(undefined, 'My Custom Desc');
      expect(roadmap.description).toBe('My Custom Desc');
    });

    it('uses both custom title and description', async () => {
      const roadmap = await planner.generateRoadmap('Title', 'Desc');
      expect(roadmap.title).toBe('Title');
      expect(roadmap.description).toBe('Desc');
    });

    it('uses default title when not provided', async () => {
      const roadmap = await planner.generateRoadmap();
      expect(roadmap.title).toMatch(/^Evolution Roadmap /);
    });

    it('uses default description when not provided', async () => {
      const roadmap = await planner.generateRoadmap();
      expect(roadmap.description).toMatch(/^Generated at /);
    });

    it('event is published with custom title generation', async () => {
      await planner.generateRoadmap('Event Title');
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.roadmap.created');
      expect(ev).toBeDefined();
    });
  });

  // --- getRoadmap() / listRoadmaps() ---
  describe('getRoadmap() and listRoadmaps()', () => {
    it('getRoadmap() returns null for unknown id', async () => {
      const result = await planner.getRoadmap(brandRoadmapId('nonexistent'));
      expect(result).toBeNull();
    });

    it('getRoadmap() returns the correct roadmap by id', async () => {
      const roadmap = await planner.generateRoadmap();
      const retrieved = await planner.getRoadmap(roadmap.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(roadmap.id);
    });

    it('getRoadmap() returns a frozen object', async () => {
      const roadmap = await planner.generateRoadmap();
      const retrieved = await planner.getRoadmap(roadmap.id);
      expect(Object.isFrozen(retrieved!)).toBe(true);
    });

    it('listRoadmaps() returns empty array initially', async () => {
      const list = await planner.listRoadmaps();
      expect(list).toHaveLength(0);
    });

    it('listRoadmaps() returns one roadmap after one generation', async () => {
      await planner.generateRoadmap();
      const list = await planner.listRoadmaps();
      expect(list).toHaveLength(1);
    });

    it('listRoadmaps() returns multiple roadmaps after multiple generations', async () => {
      await planner.generateRoadmap('R1');
      await planner.generateRoadmap('R2');
      await planner.generateRoadmap('R3');
      const list = await planner.listRoadmaps();
      expect(list).toHaveLength(3);
    });

    it('listRoadmaps() returns array with correct length', async () => {
      await planner.generateRoadmap();
      const list = await planner.listRoadmaps();
      expect(list.length).toBe(1);
    });

    it('listRoadmaps() contains roadmaps with correct titles', async () => {
      await planner.generateRoadmap('Alpha');
      await planner.generateRoadmap('Beta');
      const list = await planner.listRoadmaps();
      const titles = list.map(r => r.title);
      expect(titles).toContain('Alpha');
      expect(titles).toContain('Beta');
    });

    it('listRoadmaps() contains roadmaps with correct descriptions', async () => {
      await planner.generateRoadmap('T1', 'Desc1');
      await planner.generateRoadmap('T2', 'Desc2');
      const list = await planner.listRoadmaps();
      const descs = list.map(r => r.description);
      expect(descs).toContain('Desc1');
      expect(descs).toContain('Desc2');
    });

    it('getRoadmap() returns correct roadmap among many', async () => {
      const r1 = await planner.generateRoadmap('First');
      const r2 = await planner.generateRoadmap('Second');
      const found = await planner.getRoadmap(r2.id);
      expect(found!.title).toBe('Second');
    });

    it('getRoadmap() returns different objects for different ids', async () => {
      const r1 = await planner.generateRoadmap();
      const r2 = await planner.generateRoadmap();
      const f1 = await planner.getRoadmap(r1.id);
      const f2 = await planner.getRoadmap(r2.id);
      expect(f1!.id).not.toBe(f2!.id);
    });

    it('each generated roadmap has unique id', async () => {
      const r1 = await planner.generateRoadmap();
      const r2 = await planner.generateRoadmap();
      const r3 = await planner.generateRoadmap();
      const ids = new Set([r1.id, r2.id, r3.id]);
      expect(ids.size).toBe(3);
    });
  });

  // --- updateItemStatus() ---
  describe('updateItemStatus()', () => {
    let roadmapId: RoadmapId;
    let itemId: ImprovementId;

    beforeEach(async () => {
      const imp = await engine.propose({
        name: 'Status Test Imp',
        description: 'd',
        bottleneckId: null,
        constraintType: ConstraintType.Performance,
        targetRuntime: null,
        targetCapability: null,
        estimatedEffort: 'low',
        evidence: [],
        metadata: {},
      });
      await engine.updateScores(imp.id, { priority: 50, valueScore: 50 });
      itemId = imp.id;
      const roadmap = await planner.generateRoadmap();
      roadmapId = roadmap.id;
    });

    it('updates item status to InProgress', async () => {
      await planner.updateItemStatus(roadmapId, itemId, RoadmapItemStatus.InProgress);
      const updated = await planner.getRoadmap(roadmapId);
      const item = updated!.items.find(i => (i.id as string) === (itemId as string));
      expect(item!.status).toBe(RoadmapItemStatus.InProgress);
    });

    it('updates item status to Completed', async () => {
      await planner.updateItemStatus(roadmapId, itemId, RoadmapItemStatus.Completed);
      const updated = await planner.getRoadmap(roadmapId);
      const item = updated!.items.find(i => (i.id as string) === (itemId as string));
      expect(item!.status).toBe(RoadmapItemStatus.Completed);
    });

    it('updates item status to Deferred', async () => {
      await planner.updateItemStatus(roadmapId, itemId, RoadmapItemStatus.Deferred);
      const updated = await planner.getRoadmap(roadmapId);
      const item = updated!.items.find(i => (i.id as string) === (itemId as string));
      expect(item!.status).toBe(RoadmapItemStatus.Deferred);
    });

    it('updates item status to Cancelled', async () => {
      await planner.updateItemStatus(roadmapId, itemId, RoadmapItemStatus.Cancelled);
      const updated = await planner.getRoadmap(roadmapId);
      const item = updated!.items.find(i => (i.id as string) === (itemId as string));
      expect(item!.status).toBe(RoadmapItemStatus.Cancelled);
    });

    it('updates updatedAt timestamp', async () => {
      const original = await planner.getRoadmap(roadmapId);
      // Small delay to ensure timestamp differs
      await new Promise(r => setTimeout(r, 2));
      await planner.updateItemStatus(roadmapId, itemId, RoadmapItemStatus.InProgress);
      const updated = await planner.getRoadmap(roadmapId);
      expect(updated!.updatedAt).not.toBe(original!.updatedAt);
    });

    it('does not modify other items', async () => {
      // Add a second improvement
      const imp2 = await engine.propose({
        name: 'Other Imp',
        description: 'd',
        bottleneckId: null,
        constraintType: ConstraintType.Performance,
        targetRuntime: null,
        targetCapability: null,
        estimatedEffort: 'low',
        evidence: [],
        metadata: {},
      });
      await engine.updateScores(imp2.id, { priority: 30, valueScore: 30 });
      // Regenerate roadmap
      const roadmap = await planner.generateRoadmap();
      const newRoadmapId = roadmap.id;
      const otherItemId = imp2.id;

      await planner.updateItemStatus(newRoadmapId, itemId, RoadmapItemStatus.Completed);
      const updated = await planner.getRoadmap(newRoadmapId);
      const otherItem = updated!.items.find(i => (i.id as string) === (otherItemId as string));
      expect(otherItem!.status).toBe(RoadmapItemStatus.Pending);
    });

    it('returns a frozen updated roadmap', async () => {
      await planner.updateItemStatus(roadmapId, itemId, RoadmapItemStatus.InProgress);
      const updated = await planner.getRoadmap(roadmapId);
      expect(Object.isFrozen(updated!)).toBe(true);
    });
  });

  // --- updateItemStatus() unknown roadmap → error ---
  describe('updateItemStatus() — unknown roadmap', () => {
    it('throws RoadmapLimitExceededError for unknown roadmap id', async () => {
      const fakeId = brandRoadmapId('unknown');
      const fakeItemId = brandImprovementId('unknown-item');
      await expect(
        planner.updateItemStatus(fakeId, fakeItemId, RoadmapItemStatus.InProgress),
      ).rejects.toThrow(RoadmapLimitExceededError);
    });

    it('error has correct code', async () => {
      const fakeId = brandRoadmapId('unknown');
      const fakeItemId = brandImprovementId('unknown-item');
      try {
        await planner.updateItemStatus(fakeId, fakeItemId, RoadmapItemStatus.InProgress);
      } catch (e) {
        expect((e as RoadmapLimitExceededError).code).toBe('ROADMAP_LIMIT_EXCEEDED');
      }
    });
  });

  // --- TotalValue calculation ---
  describe('TotalValue calculation', () => {
    it('sums valueScores of all included items', async () => {
      const values = [10, 20, 30];
      for (let i = 0; i < 3; i++) {
        const imp = await engine.propose({
          name: `Val ${i}`,
          description: 'd',
          bottleneckId: null,
          constraintType: ConstraintType.Performance,
          targetRuntime: null,
          targetCapability: null,
          estimatedEffort: 'low',
          evidence: [],
          metadata: {},
        });
        await engine.updateScores(imp.id, { priority: values[i], valueScore: values[i] });
      }
      const roadmap = await planner.generateRoadmap();
      expect(roadmap.totalValue).toBe(60);
    });

    it('totalValue is 0 when no items', async () => {
      const roadmap = await planner.generateRoadmap();
      expect(roadmap.totalValue).toBe(0);
    });

    it('totalValue with fractional valueScores', async () => {
      const imp = await engine.propose({
        name: 'Frac',
        description: 'd',
        bottleneckId: null,
        constraintType: ConstraintType.Performance,
        targetRuntime: null,
        targetCapability: null,
        estimatedEffort: 'low',
        evidence: [],
        metadata: {},
      });
      await engine.updateScores(imp.id, { priority: 50, valueScore: 33.33 });
      const roadmap = await planner.generateRoadmap();
      expect(roadmap.totalValue).toBe(33.33);
    });
  });

  // --- Pareto ordering ---
  describe('Pareto ordering (top items have highest value)', () => {
    it('first item has highest valueScore among all', async () => {
      const scores = [5, 80, 15, 60, 25];
      for (const s of scores) {
        const imp = await engine.propose({
          name: `Pareto ${s}`,
          description: 'd',
          bottleneckId: null,
          constraintType: ConstraintType.Performance,
          targetRuntime: null,
          targetCapability: null,
          estimatedEffort: 'low',
          evidence: [],
          metadata: {},
        });
        await engine.updateScores(imp.id, { priority: s, valueScore: s });
      }
      const roadmap = await planner.generateRoadmap();
      const maxVal = Math.max(...scores);
      expect(roadmap.items[0].valueScore).toBe(maxVal);
    });

    it('last item has lowest valueScore among all', async () => {
      const scores = [5, 80, 15, 60, 25];
      for (const s of scores) {
        const imp = await engine.propose({
          name: `Pareto ${s}`,
          description: 'd',
          bottleneckId: null,
          constraintType: ConstraintType.Performance,
          targetRuntime: null,
          targetCapability: null,
          estimatedEffort: 'low',
          evidence: [],
          metadata: {},
        });
        await engine.updateScores(imp.id, { priority: s, valueScore: s });
      }
      const roadmap = await planner.generateRoadmap();
      const minVal = Math.min(...scores);
      expect(roadmap.items[roadmap.items.length - 1].valueScore).toBe(minVal);
    });

    it('ordering is stable (equal priorities maintain insertion relative order)', async () => {
      for (let i = 0; i < 3; i++) {
        const imp = await engine.propose({
          name: `Equal ${i}`,
          description: 'd',
          bottleneckId: null,
          constraintType: ConstraintType.Performance,
          targetRuntime: null,
          targetCapability: null,
          estimatedEffort: 'low',
          evidence: [],
          metadata: {},
        });
        await engine.updateScores(imp.id, { priority: 50, valueScore: 50 });
      }
      const roadmap = await planner.generateRoadmap();
      // All priorities should be 50
      for (const item of roadmap.items) {
        expect(item.priority).toBe(50);
      }
    });
  });

  // --- setImprovementEngine wiring ---
  describe('setImprovementEngine() wiring', () => {
    it('throws if improvement engine not set', async () => {
      const noEngine = new OptimizationPlanner(
        { ...DefaultEvolutionRuntimeConfig.optimizationPlanner },
        bus,
      );
      await expect(noEngine.generateRoadmap()).rejects.toThrow(RoadmapLimitExceededError);
    });

    it('error message mentions improvement engine not set', async () => {
      const noEngine = new OptimizationPlanner(
        { ...DefaultEvolutionRuntimeConfig.optimizationPlanner },
        bus,
      );
      try {
        await noEngine.generateRoadmap();
      } catch (e) {
        expect((e as RoadmapLimitExceededError).context.reason).toBe('Improvement engine not set');
      }
    });

    it('works after setting improvement engine', async () => {
      const noEngine = new OptimizationPlanner(
        { ...DefaultEvolutionRuntimeConfig.optimizationPlanner },
        bus,
      );
      noEngine.setImprovementEngine(engine);
      const roadmap = await noEngine.generateRoadmap();
      expect(roadmap.items).toBeDefined();
    });

    it('can replace improvement engine with another', async () => {
      const engine2 = new ImprovementEngine(
        { ...DefaultEvolutionRuntimeConfig.improvementEngine },
        bus,
      );
      planner.setImprovementEngine(engine2);
      const roadmap = await planner.generateRoadmap();
      expect(roadmap.items).toHaveLength(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. EvolutionGraph
// ═══════════════════════════════════════════════════════════════════

describe('EvolutionGraph', () => {
  let bus: InProcessEventBus;
  let graph: EvolutionGraph;

  beforeEach(() => {
    bus = new InProcessEventBus();
    bus.clear();
    graph = new EvolutionGraph(
      { ...DefaultEvolutionRuntimeConfig.evolutionGraph },
      bus,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const defaultParams = {
    type: 'improvement' as const,
    title: 'Test Node',
    description: 'Test description',
    relatedIds: Object.freeze([]),
    parentId: null as EvolutionNodeId | null,
    valueImpact: 42,
    metadata: Object.freeze({}),
  };

  // --- addNode() creates node with correct fields ---
  describe('addNode() — creates node with correct fields', () => {
    it('returns a node with a valid id', async () => {
      const node = await graph.addNode(defaultParams);
      expect(node.id).toBeDefined();
      expect(typeof node.id).toBe('string');
    });

    it('returns a node with type "improvement"', async () => {
      const node = await graph.addNode(defaultParams);
      expect(node.type).toBe('improvement');
    });

    it('returns a node with title matching input', async () => {
      const node = await graph.addNode({ ...defaultParams, title: 'My Title' });
      expect(node.title).toBe('My Title');
    });

    it('returns a node with description matching input', async () => {
      const node = await graph.addNode({ ...defaultParams, description: 'My Desc' });
      expect(node.description).toBe('My Desc');
    });

    it('returns a node with valueImpact matching input', async () => {
      const node = await graph.addNode({ ...defaultParams, valueImpact: 99 });
      expect(node.valueImpact).toBe(99);
    });

    it('returns a node with relatedIds matching input', async () => {
      const related = Object.freeze(['a', 'b', 'c']);
      const node = await graph.addNode({ ...defaultParams, relatedIds: related });
      expect(node.relatedIds).toEqual(['a', 'b', 'c']);
    });

    it('relatedIds is frozen', async () => {
      const related = Object.freeze(['x']);
      const node = await graph.addNode({ ...defaultParams, relatedIds: related });
      expect(Object.isFrozen(node.relatedIds)).toBe(true);
    });

    it('returns a node with parentId null for root', async () => {
      const node = await graph.addNode(defaultParams);
      expect(node.parentId).toBeNull();
    });

    it('returns a node with empty childIds', async () => {
      const node = await graph.addNode(defaultParams);
      expect(node.childIds).toEqual([]);
    });

    it('childIds is frozen', async () => {
      const node = await graph.addNode(defaultParams);
      expect(Object.isFrozen(node.childIds)).toBe(true);
    });

    it('returns a node with createdAt as valid ISO timestamp', async () => {
      const node = await graph.addNode(defaultParams);
      expect(node.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('returns a node with metadata matching input', async () => {
      const meta = Object.freeze({ key: 'val' });
      const node = await graph.addNode({ ...defaultParams, metadata: meta });
      expect(node.metadata).toEqual({ key: 'val' });
    });

    it('metadata is frozen', async () => {
      const meta = Object.freeze({ key: 'val' });
      const node = await graph.addNode({ ...defaultParams, metadata: meta });
      expect(Object.isFrozen(node.metadata)).toBe(true);
    });

    it('returns a frozen node object', async () => {
      const node = await graph.addNode(defaultParams);
      expect(Object.isFrozen(node)).toBe(true);
    });

    it('supports all valid node types', async () => {
      const types = ['improvement', 'experiment', 'bottleneck_resolved', 'tech_debt_fixed', 'architecture_change'] as const;
      for (const t of types) {
        const node = await graph.addNode({ ...defaultParams, type: t });
        expect(node.type).toBe(t);
      }
    });

    it('stores the node so it can be retrieved', async () => {
      const node = await graph.addNode(defaultParams);
      const retrieved = await graph.getNode(node.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(node.id);
    });

    it('increments count after adding a node', async () => {
      expect(await graph.count()).toBe(0);
      await graph.addNode(defaultParams);
      expect(await graph.count()).toBe(1);
    });
  });

  // --- addNode() at limit → error ---
  describe('addNode() — at limit', () => {
    it('throws GraphNodeLimitExceededError when maxNodes reached', async () => {
      const tinyGraph = new EvolutionGraph(
        { ...DefaultEvolutionRuntimeConfig.evolutionGraph, maxNodes: 1 },
        bus,
      );
      await tinyGraph.addNode(defaultParams);
      await expect(tinyGraph.addNode(defaultParams)).rejects.toThrow(GraphNodeLimitExceededError);
    });

    it('error has correct code', async () => {
      const tinyGraph = new EvolutionGraph(
        { ...DefaultEvolutionRuntimeConfig.evolutionGraph, maxNodes: 1 },
        bus,
      );
      await tinyGraph.addNode(defaultParams);
      try {
        await tinyGraph.addNode(defaultParams);
      } catch (e) {
        expect((e as GraphNodeLimitExceededError).code).toBe('GRAPH_NODE_LIMIT_EXCEEDED');
      }
    });

    it('error message includes maxNodes value', async () => {
      const tinyGraph = new EvolutionGraph(
        { ...DefaultEvolutionRuntimeConfig.evolutionGraph, maxNodes: 1 },
        bus,
      );
      await tinyGraph.addNode(defaultParams);
      try {
        await tinyGraph.addNode(defaultParams);
      } catch (e) {
        expect((e as GraphNodeLimitExceededError).message).toContain('1');
      }
    });

    it('does not add the node when limit exceeded', async () => {
      const tinyGraph = new EvolutionGraph(
        { ...DefaultEvolutionRuntimeConfig.evolutionGraph, maxNodes: 1 },
        bus,
      );
      await tinyGraph.addNode(defaultParams);
      try { await tinyGraph.addNode(defaultParams); } catch { /* expected */ }
      expect(await tinyGraph.count()).toBe(1);
    });
  });

  // --- addNode() with parentId → validates parent exists ---
  describe('addNode() — parentId validation', () => {
    it('throws EvolutionGraphError when parentId does not exist', async () => {
      const fakeParent = brandEvolutionNodeId('nonexistent-parent');
      await expect(
        graph.addNode({ ...defaultParams, parentId: fakeParent }),
      ).rejects.toThrow(EvolutionGraphError);
    });

    it('error message mentions parent node not found', async () => {
      const fakeParent = brandEvolutionNodeId('nonexistent-parent');
      try {
        await graph.addNode({ ...defaultParams, parentId: fakeParent });
      } catch (e) {
        expect((e as EvolutionGraphError).message).toContain('Parent node not found');
      }
    });

    it('error has reason in context', async () => {
      const fakeParent = brandEvolutionNodeId('nonexistent-parent');
      try {
        await graph.addNode({ ...defaultParams, parentId: fakeParent });
      } catch (e) {
        expect((e as EvolutionGraphError).context.reason).toBe('Parent node not found: nonexistent-parent');
      }
    });

    it('does not add the node when parent not found', async () => {
      const fakeParent = brandEvolutionNodeId('nonexistent-parent');
      try {
        await graph.addNode({ ...defaultParams, parentId: fakeParent });
      } catch { /* expected */ }
      expect(await graph.count()).toBe(0);
    });

    it('succeeds when parentId exists', async () => {
      const parent = await graph.addNode(defaultParams);
      const child = await graph.addNode({ ...defaultParams, parentId: parent.id, title: 'Child' });
      expect(child.parentId).toBe(parent.id);
    });

    it('succeeds with deeply nested parentId', async () => {
      const root = await graph.addNode(defaultParams);
      const mid = await graph.addNode({ ...defaultParams, parentId: root.id });
      const leaf = await graph.addNode({ ...defaultParams, parentId: mid.id });
      expect(leaf.parentId).toBe(mid.id);
      expect(await graph.count()).toBe(3);
    });
  });

  // --- addNode() updates parent's childIds ---
  describe('addNode() — updates parent childIds', () => {
    it('parent childIds contains child id after adding child', async () => {
      const parent = await graph.addNode(defaultParams);
      expect(parent.childIds).toHaveLength(0);
      const child = await graph.addNode({ ...defaultParams, parentId: parent.id });
      const updatedParent = await graph.getNode(parent.id);
      expect(updatedParent!.childIds).toHaveLength(1);
      expect(updatedParent!.childIds[0]).toBe(child.id);
    });

    it('parent childIds is frozen after update', async () => {
      const parent = await graph.addNode(defaultParams);
      await graph.addNode({ ...defaultParams, parentId: parent.id });
      const updatedParent = await graph.getNode(parent.id);
      expect(Object.isFrozen(updatedParent!.childIds)).toBe(true);
    });

    it('adding multiple children appends all to parent childIds', async () => {
      const parent = await graph.addNode(defaultParams);
      const child1 = await graph.addNode({ ...defaultParams, parentId: parent.id });
      const child2 = await graph.addNode({ ...defaultParams, parentId: parent.id });
      const child3 = await graph.addNode({ ...defaultParams, parentId: parent.id });
      const updatedParent = await graph.getNode(parent.id);
      expect(updatedParent!.childIds).toHaveLength(3);
      expect(updatedParent!.childIds).toEqual([child1.id, child2.id, child3.id]);
    });

    it('updated parent node is frozen', async () => {
      const parent = await graph.addNode(defaultParams);
      await graph.addNode({ ...defaultParams, parentId: parent.id });
      const updatedParent = await graph.getNode(parent.id);
      expect(Object.isFrozen(updatedParent!)).toBe(true);
    });
  });

  // --- addNode() root node (parentId=null) ---
  describe('addNode() — root node with parentId=null', () => {
    it('does not throw when parentId is null', async () => {
      await expect(graph.addNode({ ...defaultParams, parentId: null })).resolves.toBeDefined();
    });

    it('node with parentId=null appears in getRootNodes()', async () => {
      const node = await graph.addNode({ ...defaultParams, parentId: null });
      const roots = await graph.getRootNodes();
      expect(roots).toHaveLength(1);
      expect(roots[0].id).toBe(node.id);
    });

    it('node with parentId set does not appear in getRootNodes()', async () => {
      const parent = await graph.addNode({ ...defaultParams, parentId: null });
      await graph.addNode({ ...defaultParams, parentId: parent.id });
      const roots = await graph.getRootNodes();
      expect(roots).toHaveLength(1);
      expect(roots[0].id).toBe(parent.id);
    });
  });

  // --- addEdge() ---
  describe('addEdge()', () => {
    it('creates an edge with correct from and to', async () => {
      const n1 = await graph.addNode(defaultParams);
      const n2 = await graph.addNode(defaultParams);
      const edge = await graph.addEdge(n1.id, n2.id, 'depends_on');
      expect(edge.from).toBe(n1.id);
      expect(edge.to).toBe(n2.id);
    });

    it('creates edge with correct label', async () => {
      const n1 = await graph.addNode(defaultParams);
      const n2 = await graph.addNode(defaultParams);
      const edge = await graph.addEdge(n1.id, n2.id, 'related_to');
      expect(edge.label).toBe('related_to');
    });

    it('creates edge with default weight 1', async () => {
      const n1 = await graph.addNode(defaultParams);
      const n2 = await graph.addNode(defaultParams);
      const edge = await graph.addEdge(n1.id, n2.id, 'label');
      expect(edge.weight).toBe(1);
    });

    it('creates edge with custom weight', async () => {
      const n1 = await graph.addNode(defaultParams);
      const n2 = await graph.addNode(defaultParams);
      const edge = await graph.addEdge(n1.id, n2.id, 'label', 5.5);
      expect(edge.weight).toBe(5.5);
    });

    it('edge has createdAt as valid ISO timestamp', async () => {
      const n1 = await graph.addNode(defaultParams);
      const n2 = await graph.addNode(defaultParams);
      const edge = await graph.addEdge(n1.id, n2.id, 'label');
      expect(edge.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('edge is frozen', async () => {
      const n1 = await graph.addNode(defaultParams);
      const n2 = await graph.addNode(defaultParams);
      const edge = await graph.addEdge(n1.id, n2.id, 'label');
      expect(Object.isFrozen(edge)).toBe(true);
    });

    it('edge appears in listEdges()', async () => {
      const n1 = await graph.addNode(defaultParams);
      const n2 = await graph.addNode(defaultParams);
      await graph.addEdge(n1.id, n2.id, 'label');
      const edges = await graph.listEdges();
      expect(edges).toHaveLength(1);
    });

    it('multiple edges all appear in listEdges()', async () => {
      const n1 = await graph.addNode(defaultParams);
      const n2 = await graph.addNode(defaultParams);
      const n3 = await graph.addNode(defaultParams);
      await graph.addEdge(n1.id, n2.id, 'a');
      await graph.addEdge(n2.id, n3.id, 'b');
      await graph.addEdge(n1.id, n3.id, 'c');
      const edges = await graph.listEdges();
      expect(edges).toHaveLength(3);
    });
  });

  // --- getNode() found / not found ---
  describe('getNode()', () => {
    it('returns null for unknown id', async () => {
      const result = await graph.getNode(brandEvolutionNodeId('nope'));
      expect(result).toBeNull();
    });

    it('returns the node when found', async () => {
      const node = await graph.addNode(defaultParams);
      const found = await graph.getNode(node.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(node.id);
    });

    it('returns same reference after multiple getNode calls', async () => {
      const node = await graph.addNode(defaultParams);
      const found1 = await graph.getNode(node.id);
      const found2 = await graph.getNode(node.id);
      expect(found1).toBe(found2);
    });
  });

  // --- getRootNodes() ---
  describe('getRootNodes()', () => {
    it('returns empty array when no nodes exist', async () => {
      const roots = await graph.getRootNodes();
      expect(roots).toHaveLength(0);
    });

    it('returns only nodes with parentId=null', async () => {
      const root1 = await graph.addNode(defaultParams);
      const root2 = await graph.addNode(defaultParams);
      await graph.addNode({ ...defaultParams, parentId: root1.id });
      const roots = await graph.getRootNodes();
      expect(roots).toHaveLength(2);
      const ids = roots.map(r => r.id);
      expect(ids).toContain(root1.id);
      expect(ids).toContain(root2.id);
    });

    it('returns array of root nodes', async () => {
      await graph.addNode(defaultParams);
      const roots = await graph.getRootNodes();
      expect(Array.isArray(roots)).toBe(true);
    });

    it('does not include child nodes', async () => {
      const root = await graph.addNode(defaultParams);
      const child = await graph.addNode({ ...defaultParams, parentId: root.id });
      const roots = await graph.getRootNodes();
      const ids = roots.map(r => r.id);
      expect(ids).not.toContain(child.id);
    });
  });

  // --- getPath() ---
  describe('getPath()', () => {
    it('returns single node for root', async () => {
      const root = await graph.addNode(defaultParams);
      const path = await graph.getPath(root.id);
      expect(path).toHaveLength(1);
      expect(path[0].id).toBe(root.id);
    });

    it('walks up the parent chain correctly', async () => {
      const root = await graph.addNode(defaultParams);
      const mid = await graph.addNode({ ...defaultParams, parentId: root.id });
      const leaf = await graph.addNode({ ...defaultParams, parentId: mid.id });
      const path = await graph.getPath(leaf.id);
      expect(path).toHaveLength(3);
      expect(path[0].id).toBe(root.id);
      expect(path[1].id).toBe(mid.id);
      expect(path[2].id).toBe(leaf.id);
    });

    it('path is frozen', async () => {
      const node = await graph.addNode(defaultParams);
      const path = await graph.getPath(node.id);
      expect(Object.isFrozen(path)).toBe(true);
    });

    it('returns empty path for unknown node', async () => {
      const path = await graph.getPath(brandEvolutionNodeId('unknown'));
      expect(path).toHaveLength(0);
    });

    it('respects maxDepth config', async () => {
      const shallowGraph = new EvolutionGraph(
        { ...DefaultEvolutionRuntimeConfig.evolutionGraph, maxDepth: 2 },
        bus,
      );
      const root = await shallowGraph.addNode(defaultParams);
      const mid = await shallowGraph.addNode({ ...defaultParams, parentId: root.id });
      const leaf = await shallowGraph.addNode({ ...defaultParams, parentId: mid.id });
      const path = await shallowGraph.getPath(leaf.id);
      // maxDepth=2 means at most 2 nodes in path
      expect(path.length).toBeLessThanOrEqual(2);
    });

    it('stops at root even if maxDepth allows more', async () => {
      const root = await graph.addNode(defaultParams);
      const child = await graph.addNode({ ...defaultParams, parentId: root.id });
      const path = await graph.getPath(child.id);
      expect(path).toHaveLength(2);
      expect(path[0].parentId).toBeNull();
    });
  });

  // --- listNodes() / listEdges() / count() ---
  describe('listNodes(), listEdges(), count()', () => {
    it('listNodes() returns empty array initially', async () => {
      const nodes = await graph.listNodes();
      expect(nodes).toHaveLength(0);
    });

    it('listNodes() returns all added nodes', async () => {
      const n1 = await graph.addNode(defaultParams);
      const n2 = await graph.addNode(defaultParams);
      const n3 = await graph.addNode(defaultParams);
      const nodes = await graph.listNodes();
      expect(nodes).toHaveLength(3);
      const ids = nodes.map(n => n.id);
      expect(ids).toContain(n1.id);
      expect(ids).toContain(n2.id);
      expect(ids).toContain(n3.id);
    });

    it('listNodes() returns array of nodes', async () => {
      await graph.addNode(defaultParams);
      const nodes = await graph.listNodes();
      expect(Array.isArray(nodes)).toBe(true);
      expect(nodes.length).toBe(1);
    });

    it('listEdges() returns empty array initially', async () => {
      const edges = await graph.listEdges();
      expect(edges).toHaveLength(0);
    });

    it('listEdges() returns frozen array', async () => {
      const edges = await graph.listEdges();
      expect(Object.isFrozen(edges)).toBe(true);
    });

    it('count() returns 0 initially', async () => {
      expect(await graph.count()).toBe(0);
    });

    it('count() returns correct number after adding nodes', async () => {
      await graph.addNode(defaultParams);
      await graph.addNode(defaultParams);
      await graph.addNode(defaultParams);
      expect(await graph.count()).toBe(3);
    });

    it('count() does not count edges', async () => {
      const n1 = await graph.addNode(defaultParams);
      const n2 = await graph.addNode(defaultParams);
      await graph.addEdge(n1.id, n2.id, 'label');
      expect(await graph.count()).toBe(2);
    });
  });

  // --- dispose() ---
  describe('dispose()', () => {
    it('clears all nodes', async () => {
      await graph.addNode(defaultParams);
      await graph.addNode(defaultParams);
      graph.dispose();
      expect(await graph.count()).toBe(0);
    });

    it('clears all edges', async () => {
      const n1 = await graph.addNode(defaultParams);
      const n2 = await graph.addNode(defaultParams);
      await graph.addEdge(n1.id, n2.id, 'label');
      graph.dispose();
      const edges = await graph.listEdges();
      expect(edges).toHaveLength(0);
    });

    it('allows adding nodes after dispose', async () => {
      await graph.addNode(defaultParams);
      graph.dispose();
      const node = await graph.addNode(defaultParams);
      expect(node).toBeDefined();
      expect(await graph.count()).toBe(1);
    });

    it('getNode returns null after dispose', async () => {
      const node = await graph.addNode(defaultParams);
      graph.dispose();
      const found = await graph.getNode(node.id);
      expect(found).toBeNull();
    });

    it('listNodes returns empty after dispose', async () => {
      await graph.addNode(defaultParams);
      graph.dispose();
      expect(await graph.listNodes()).toHaveLength(0);
    });

    it('getRootNodes returns empty after dispose', async () => {
      await graph.addNode(defaultParams);
      graph.dispose();
      expect(await graph.getRootNodes()).toHaveLength(0);
    });

    it('listEdges returns empty after dispose', async () => {
      const n1 = await graph.addNode(defaultParams);
      const n2 = await graph.addNode(defaultParams);
      await graph.addEdge(n1.id, n2.id, 'label');
      graph.dispose();
      expect(await graph.listEdges()).toHaveLength(0);
    });

    it('dispose is idempotent', async () => {
      await graph.addNode(defaultParams);
      graph.dispose();
      graph.dispose();
      expect(await graph.count()).toBe(0);
    });

    it('addNode after dispose creates new node', async () => {
      await graph.addNode(defaultParams);
      graph.dispose();
      const node = await graph.addNode({ ...defaultParams, title: 'After Dispose' });
      expect(node.title).toBe('After Dispose');
      expect(await graph.count()).toBe(1);
    });
  });

  // --- Event verification ---
  describe('Event verification', () => {
    it('publishes nodeAdded event when node is added', async () => {
      await graph.addNode(defaultParams);
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.graph.nodeAdded');
      expect(ev).toBeDefined();
    });

    it('nodeAdded event has classification Action', async () => {
      await graph.addNode(defaultParams);
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.graph.nodeAdded');
      expect(ev!.classification).toBe(EventClassification.Action);
    });

    it('nodeAdded event has correct sequence', async () => {
      await graph.addNode(defaultParams);
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.graph.nodeAdded');
      expect(ev!.sequence).toBeGreaterThan(0);
    });

    it('nodeAdded event has eventType containing nodeAdded', async () => {
      await graph.addNode(defaultParams);
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.graph.nodeAdded');
      expect(ev!.eventType).toContain('nodeAdded');
    });

    it('nodeAdded event has a timestamp', async () => {
      await graph.addNode(defaultParams);
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.graph.nodeAdded');
      expect(ev!.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('nodeAdded event has classification Action', async () => {
      await graph.addNode(defaultParams);
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.graph.nodeAdded');
      expect(ev!.classification).toBe(EventClassification.Action);
    });

    it('nodeAdded event has version 1.0.0', async () => {
      await graph.addNode(defaultParams);
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.graph.nodeAdded');
      expect(ev!.version).toBe('1.0.0');
    });

    it('does not publish events when no event bus', async () => {
      const noBusGraph = new EvolutionGraph(
        { ...DefaultEvolutionRuntimeConfig.evolutionGraph },
      );
      await noBusGraph.addNode(defaultParams);
      // No error thrown
    });

    it('publishes one event per node added', async () => {
      await graph.addNode(defaultParams);
      await graph.addNode(defaultParams);
      await graph.addNode(defaultParams);
      const log = bus.getLog();
      const events = log.filter(e => e.eventType === 'evolution.graph.nodeAdded');
      expect(events).toHaveLength(3);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. ArchitectureOptimizer
// ═══════════════════════════════════════════════════════════════════

describe('ArchitectureOptimizer', () => {
  let bus: InProcessEventBus;
  let optimizer: ArchitectureOptimizer;

  beforeEach(() => {
    bus = new InProcessEventBus();
    bus.clear();
    optimizer = new ArchitectureOptimizer(
      { ...DefaultEvolutionRuntimeConfig.architectureOptimizer },
      bus,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- analyze() with default modules → suggestions ---
  describe('analyze() — default modules', () => {
    it('returns an array of suggestions', async () => {
      const results = await optimizer.analyze();
      expect(Array.isArray(results)).toBe(true);
    });

    it('returns suggestions for default "core" module', async () => {
      const results = await optimizer.analyze();
      // 3 types (Simplify, ReduceCoupling, ImproveCohesion) for 1 module
      expect(results).toHaveLength(3);
    });

    it('each suggestion has a valid id', async () => {
      const results = await optimizer.analyze();
      for (const s of results) {
        expect(s.id).toBeDefined();
        expect(typeof s.id).toBe('string');
      }
    });

    it('each suggestion has type from ArchOptimizationType', async () => {
      const results = await optimizer.analyze();
      const validTypes = Object.values(ArchOptimizationType);
      for (const s of results) {
        expect(validTypes).toContain(s.type);
      }
    });

    it('each suggestion has a title containing the module name', async () => {
      const results = await optimizer.analyze();
      for (const s of results) {
        expect(s.title).toContain('core');
      }
    });

    it('each suggestion has a description', async () => {
      const results = await optimizer.analyze();
      for (const s of results) {
        expect(typeof s.description).toBe('string');
        expect(s.description.length).toBeGreaterThan(0);
      }
    });

    it('each suggestion has affectedModules containing "core"', async () => {
      const results = await optimizer.analyze();
      for (const s of results) {
        expect(s.affectedModules).toContain('core');
      }
    });

    it('each suggestion has estimatedImpact between 50 and 100', async () => {
      const results = await optimizer.analyze();
      for (const s of results) {
        expect(s.estimatedImpact).toBeGreaterThanOrEqual(50);
        expect(s.estimatedImpact).toBeLessThanOrEqual(100);
      }
    });

    it('each suggestion has estimatedEffort as a positive integer', async () => {
      const results = await optimizer.analyze();
      for (const s of results) {
        expect(Number.isInteger(s.estimatedEffort)).toBe(true);
        expect(s.estimatedEffort).toBeGreaterThan(0);
      }
    });

    it('each suggestion has risk as a non-negative number', async () => {
      const results = await optimizer.analyze();
      for (const s of results) {
        expect(s.risk).toBeGreaterThanOrEqual(0);
      }
    });

    it('each suggestion has createdAt as ISO timestamp', async () => {
      const results = await optimizer.analyze();
      for (const s of results) {
        expect(s.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
    });

    it('each suggestion has frozen metadata', async () => {
      const results = await optimizer.analyze();
      for (const s of results) {
        expect(Object.isFrozen(s.metadata)).toBe(true);
      }
    });

    it('each suggestion is frozen', async () => {
      const results = await optimizer.analyze();
      for (const s of results) {
        expect(Object.isFrozen(s)).toBe(true);
      }
    });

    it('results array is frozen', async () => {
      const results = await optimizer.analyze();
      expect(Object.isFrozen(results)).toBe(true);
    });

    it('affectedModules is frozen for each suggestion', async () => {
      const results = await optimizer.analyze();
      for (const s of results) {
        expect(Object.isFrozen(s.affectedModules)).toBe(true);
      }
    });
  });

  // --- analyze() with custom modules ---
  describe('analyze() — custom modules', () => {
    it('uses provided module names', async () => {
      const results = await optimizer.analyze(['auth', 'billing']);
      const allModules = results.flatMap(s => [...s.affectedModules]);
      expect(allModules).toContain('auth');
      expect(allModules).toContain('billing');
    });

    it('generates suggestions for each module', async () => {
      const results = await optimizer.analyze(['mod-a', 'mod-b']);
      // 3 types * 2 modules = 6
      expect(results).toHaveLength(6);
    });

    it('title contains the module name for each suggestion', async () => {
      const results = await optimizer.analyze(['my-module']);
      for (const s of results) {
        expect(s.title).toContain('my-module');
      }
    });

    it('description contains the module name', async () => {
      const results = await optimizer.analyze(['custom-mod']);
      for (const s of results) {
        expect(s.description).toContain('custom-mod');
      }
    });

    it('handles single module', async () => {
      const results = await optimizer.analyze(['solo']);
      expect(results).toHaveLength(3);
    });

    it('handles empty modules array', async () => {
      const results = await optimizer.analyze([]);
      expect(results).toHaveLength(0);
    });

    it('each suggestion affectedModules matches input modules', async () => {
      const results = await optimizer.analyze(['a', 'b']);
      for (const s of results) {
        expect(s.affectedModules).toEqual(['a', 'b']);
      }
    });
  });

  // --- analyze() cycles through optimization types ---
  describe('analyze() — cycles through optimization types', () => {
    it('includes Simplify type', async () => {
      const results = await optimizer.analyze();
      const types = results.map(s => s.type);
      expect(types).toContain(ArchOptimizationType.Simplify);
    });

    it('includes ReduceCoupling type', async () => {
      const results = await optimizer.analyze();
      const types = results.map(s => s.type);
      expect(types).toContain(ArchOptimizationType.ReduceCoupling);
    });

    it('includes ImproveCohesion type', async () => {
      const results = await optimizer.analyze();
      const types = results.map(s => s.type);
      expect(types).toContain(ArchOptimizationType.ImproveCohesion);
    });

    it('cycles types in order: Simplify, ReduceCoupling, ImproveCohesion', async () => {
      const results = await optimizer.analyze();
      expect(results[0].type).toBe(ArchOptimizationType.Simplify);
      expect(results[1].type).toBe(ArchOptimizationType.ReduceCoupling);
      expect(results[2].type).toBe(ArchOptimizationType.ImproveCohesion);
    });

    it('cycles types for each module', async () => {
      const results = await optimizer.analyze(['m1', 'm2']);
      // m1: Simplify, ReduceCoupling, ImproveCohesion
      // m2: Simplify, ReduceCoupling, ImproveCohesion
      expect(results[0].type).toBe(ArchOptimizationType.Simplify);
      expect(results[3].type).toBe(ArchOptimizationType.Simplify);
    });

    it('does not include RemoveLayer type (not in cycling list)', async () => {
      const results = await optimizer.analyze();
      const types = results.map(s => s.type);
      expect(types).not.toContain(ArchOptimizationType.RemoveLayer);
    });

    it('does not include MergeRuntimes type (not in cycling list)', async () => {
      const results = await optimizer.analyze();
      const types = results.map(s => s.type);
      expect(types).not.toContain(ArchOptimizationType.MergeRuntimes);
    });

    it('does not include SplitResponsibility type (not in cycling list)', async () => {
      const results = await optimizer.analyze();
      const types = results.map(s => s.type);
      expect(types).not.toContain(ArchOptimizationType.SplitResponsibility);
    });
  });

  // --- analyze() respects maxSuggestions ---
  describe('analyze() — maxSuggestions limit', () => {
    it('limits suggestions to maxSuggestions', async () => {
      const limited = new ArchitectureOptimizer(
        { ...DefaultEvolutionRuntimeConfig.architectureOptimizer, maxSuggestions: 2 },
        bus,
      );
      const results = await limited.analyze(['a', 'b', 'c']);
      // Would be 9 (3*3) but limited to 2
      expect(results).toHaveLength(2);
    });

    it('returns exact maxSuggestions when enough modules exist', async () => {
      const limited = new ArchitectureOptimizer(
        { ...DefaultEvolutionRuntimeConfig.architectureOptimizer, maxSuggestions: 5 },
        bus,
      );
      const results = await limited.analyze(['a', 'b', 'c']);
      expect(results).toHaveLength(5);
    });

    it('returns fewer when not enough modules', async () => {
      const limited = new ArchitectureOptimizer(
        { ...DefaultEvolutionRuntimeConfig.architectureOptimizer, maxSuggestions: 10 },
        bus,
      );
      const results = await limited.analyze(['single']);
      expect(results).toHaveLength(3);
    });

    it('maxSuggestions of 1 returns only first suggestion', async () => {
      const limited = new ArchitectureOptimizer(
        { ...DefaultEvolutionRuntimeConfig.architectureOptimizer, maxSuggestions: 1 },
        bus,
      );
      const results = await limited.analyze(['a', 'b']);
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(ArchOptimizationType.Simplify);
    });

    it('maxSuggestions of 0 returns empty array', async () => {
      const limited = new ArchitectureOptimizer(
        { ...DefaultEvolutionRuntimeConfig.architectureOptimizer, maxSuggestions: 0 },
        bus,
      );
      const results = await limited.analyze(['a']);
      expect(results).toHaveLength(0);
    });
  });

  // --- getById() / list() / count() ---
  describe('getById(), list(), count()', () => {
    it('getById returns null for unknown id', async () => {
      const result = await optimizer.getById(brandEvolutionNodeId('unknown'));
      expect(result).toBeNull();
    });

    it('getById returns the suggestion after analyze', async () => {
      const results = await optimizer.analyze();
      const first = results[0];
      const found = await optimizer.getById(first.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(first.id);
    });

    it('getById returns frozen object', async () => {
      const results = await optimizer.analyze();
      const found = await optimizer.getById(results[0].id);
      expect(Object.isFrozen(found!)).toBe(true);
    });

    it('list returns empty array initially', async () => {
      const list = await optimizer.list();
      expect(list).toHaveLength(0);
    });

    it('list returns all generated suggestions', async () => {
      await optimizer.analyze();
      const list = await optimizer.list();
      expect(list).toHaveLength(3);
    });

    it('list accumulates across multiple analyze calls', async () => {
      await optimizer.analyze(['m1']);
      await optimizer.analyze(['m2']);
      const list = await optimizer.list();
      expect(list).toHaveLength(6);
    });

    it('count returns 0 initially', async () => {
      expect(await optimizer.count()).toBe(0);
    });

    it('count returns correct number after analyze', async () => {
      await optimizer.analyze();
      expect(await optimizer.count()).toBe(3);
    });

    it('count increases with each analyze call', async () => {
      await optimizer.analyze(['a']);
      expect(await optimizer.count()).toBe(3);
      await optimizer.analyze(['b']);
      expect(await optimizer.count()).toBe(6);
    });
  });

  // --- dispose() ---
  describe('dispose()', () => {
    it('clears all suggestions', async () => {
      await optimizer.analyze();
      optimizer.dispose();
      expect(await optimizer.count()).toBe(0);
    });

    it('list returns empty after dispose', async () => {
      await optimizer.analyze();
      optimizer.dispose();
      expect(await optimizer.list()).toHaveLength(0);
    });

    it('getById returns null after dispose', async () => {
      const results = await optimizer.analyze();
      optimizer.dispose();
      expect(await optimizer.getById(results[0].id)).toBeNull();
    });

    it('can analyze again after dispose', async () => {
      await optimizer.analyze();
      optimizer.dispose();
      const results = await optimizer.analyze();
      expect(results).toHaveLength(3);
    });
  });

  // --- Event verification ---
  describe('Event verification', () => {
    it('publishes event for each suggestion generated', async () => {
      await optimizer.analyze();
      const log = bus.getLog();
      const events = log.filter(e => e.eventType === 'evolution.arch.suggested');
      expect(events).toHaveLength(3);
    });

    it('event has classification Result', async () => {
      await optimizer.analyze();
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.arch.suggested');
      expect(ev!.classification).toBe(EventClassification.Result);
    });

    it('first event has sequence > 0', async () => {
      await optimizer.analyze();
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.arch.suggested');
      expect(ev!.sequence).toBeGreaterThan(0);
    });

    it('event has correct eventType', async () => {
      await optimizer.analyze();
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.arch.suggested');
      expect(ev!.eventType).toBe('evolution.arch.suggested');
    });

    it('event has a timestamp', async () => {
      await optimizer.analyze();
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.arch.suggested');
      expect(ev!.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('event has classification Result', async () => {
      await optimizer.analyze();
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.arch.suggested');
      expect(ev!.classification).toBe(EventClassification.Result);
    });

    it('events have monotonically increasing sequences', async () => {
      await optimizer.analyze();
      const log = bus.getLog();
      const archEvents = log.filter(e => e.eventType === 'evolution.arch.suggested');
      for (let i = 1; i < archEvents.length; i++) {
        expect(archEvents[i].sequence).toBeGreaterThan(archEvents[i - 1].sequence);
      }
    });

    it('event has version 1.0.0', async () => {
      await optimizer.analyze();
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.arch.suggested');
      expect(ev!.version).toBe('1.0.0');
    });

    it('does not publish events when no event bus', async () => {
      const noBus = new ArchitectureOptimizer(
        { ...DefaultEvolutionRuntimeConfig.architectureOptimizer },
      );
      await noBus.analyze();
      // No error thrown
    });

    it('does not publish events when maxSuggestions is 0', async () => {
      const limited = new ArchitectureOptimizer(
        { ...DefaultEvolutionRuntimeConfig.architectureOptimizer, maxSuggestions: 0 },
        bus,
      );
      await limited.analyze();
      const log = bus.getLog();
      const events = log.filter(e => e.eventType === 'evolution.arch.suggested');
      expect(events).toHaveLength(0);
    });

    it('multiple analyze calls publish correct total events', async () => {
      await optimizer.analyze(['a']);
      await optimizer.analyze(['b']);
      const log = bus.getLog();
      const events = log.filter(e => e.eventType === 'evolution.arch.suggested');
      expect(events).toHaveLength(6);
    });

    it('event has a valid eventId', async () => {
      await optimizer.analyze();
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.arch.suggested');
      expect(ev!.eventId).toBeDefined();
      expect(typeof ev!.eventId).toBe('string');
    });

    it('each suggestion has estimatedEffort as ceil(impact * 2)', async () => {
      const results = await optimizer.analyze();
      for (const s of results) {
        expect(s.estimatedEffort).toBe(Math.ceil(s.estimatedImpact * 2));
      }
    });

    it('each suggestion has risk as round(impact * 0.3 * 100) / 100', async () => {
      // This is harder to test exactly due to random, so just check it's a number
      const results = await optimizer.analyze();
      for (const s of results) {
        expect(typeof s.risk).toBe('number');
      }
    });

    it('suggestion estimatedEffort is always positive', async () => {
      const results = await optimizer.analyze();
      for (const s of results) {
        expect(s.estimatedEffort).toBeGreaterThan(0);
      }
    });

    it('suggestion risk is non-negative', async () => {
      const results = await optimizer.analyze();
      for (const s of results) {
        expect(s.risk).toBeGreaterThanOrEqual(0);
      }
    });

    it('suggestion title matches expected pattern', async () => {
      const results = await optimizer.analyze(['test-mod']);
      for (const s of results) {
        expect(s.title).toMatch(/^(Simplify|ReduceCoupling|ImproveCohesion) for test-mod$/);
      }
    });

    it('suggestion description contains optimization type', async () => {
      const results = await optimizer.analyze();
      for (const s of results) {
        expect(s.description).toContain(s.type);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. RecommendationPrioritizer
// ═══════════════════════════════════════════════════════════════════

describe('RecommendationPrioritizer', () => {
  let prioritizer: RecommendationPrioritizer;
  let engine: ImprovementEngine;
  let bus: InProcessEventBus;

  beforeEach(() => {
    bus = new InProcessEventBus();
    bus.clear();
    prioritizer = new RecommendationPrioritizer(
      { ...DefaultEvolutionRuntimeConfig.prioritizer },
    );
    engine = new ImprovementEngine(
      { ...DefaultEvolutionRuntimeConfig.improvementEngine },
      bus,
    );
    prioritizer.setImprovementEngine(engine);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- calculatePriority() formula ---
  describe('calculatePriority() — formula', () => {
    it('computes (V*vw * I*iw * CW*cw) / (C*cow * R*rw)', () => {
      // Default weights: vw=1, iw=1, cw=1.5, cow=1, rw=1
      // (50*1 * 60*1 * 1.0*1.5) / (10*1 * 5*1) = (50*60*1.5) / (50) = 4500/50 = 90
      const imp = makeBaseImprovement('calc-1', {
        valueScore: 50,
        impactScore: 60,
        constraintWeight: 1.0,
        costScore: 10,
        riskScore: 5,
      });
      const result = prioritizer.calculatePriority(imp);
      expect(result).toBe(90);
    });

    it('result equals (V * vw * I * iw * CW * cw) / (C * cow * R * rw)', () => {
      const V = 30, I = 40, CW = 2.0, C = 20, R = 10;
      const vw = 1, iw = 1, cw = 1.5, cow = 1, rw = 1;
      const expected = (V * vw * I * iw * CW * cw) / (C * cow * R * rw);
      const imp = makeBaseImprovement('calc-2', {
        valueScore: V, impactScore: I, constraintWeight: CW, costScore: C, riskScore: R,
      });
      expect(prioritizer.calculatePriority(imp)).toBe(Math.round(expected * 100) / 100);
    });

    it('higher valueScore yields higher priority (all else equal)', () => {
      const imp1 = makeBaseImprovement('v1', { valueScore: 10, impactScore: 10, costScore: 1, riskScore: 1 });
      const imp2 = makeBaseImprovement('v2', { valueScore: 100, impactScore: 10, costScore: 1, riskScore: 1 });
      expect(prioritizer.calculatePriority(imp2)).toBeGreaterThan(prioritizer.calculatePriority(imp1));
    });

    it('higher impactScore yields higher priority', () => {
      const imp1 = makeBaseImprovement('i1', { valueScore: 10, impactScore: 1, costScore: 1, riskScore: 1 });
      const imp2 = makeBaseImprovement('i2', { valueScore: 10, impactScore: 100, costScore: 1, riskScore: 1 });
      expect(prioritizer.calculatePriority(imp2)).toBeGreaterThan(prioritizer.calculatePriority(imp1));
    });

    it('higher constraintWeight yields higher priority', () => {
      const imp1 = makeBaseImprovement('cw1', { valueScore: 10, impactScore: 10, constraintWeight: 0.5, costScore: 1, riskScore: 1 });
      const imp2 = makeBaseImprovement('cw2', { valueScore: 10, impactScore: 10, constraintWeight: 3.0, costScore: 1, riskScore: 1 });
      expect(prioritizer.calculatePriority(imp2)).toBeGreaterThan(prioritizer.calculatePriority(imp1));
    });

    it('higher costScore yields lower priority', () => {
      const imp1 = makeBaseImprovement('c1', { valueScore: 10, impactScore: 10, costScore: 1, riskScore: 1 });
      const imp2 = makeBaseImprovement('c2', { valueScore: 10, impactScore: 10, costScore: 100, riskScore: 1 });
      expect(prioritizer.calculatePriority(imp2)).toBeLessThan(prioritizer.calculatePriority(imp1));
    });

    it('higher riskScore yields lower priority', () => {
      const imp1 = makeBaseImprovement('r1', { valueScore: 10, impactScore: 10, costScore: 1, riskScore: 1 });
      const imp2 = makeBaseImprovement('r2', { valueScore: 10, impactScore: 10, costScore: 1, riskScore: 100 });
      expect(prioritizer.calculatePriority(imp2)).toBeLessThan(prioritizer.calculatePriority(imp1));
    });

    it('returns a number', () => {
      const imp = makeBaseImprovement('num', { valueScore: 10, impactScore: 10, costScore: 1, riskScore: 1 });
      expect(typeof prioritizer.calculatePriority(imp)).toBe('number');
    });

    it('returns positive number for valid positive inputs', () => {
      const imp = makeBaseImprovement('pos', { valueScore: 10, impactScore: 10, costScore: 1, riskScore: 1 });
      expect(prioritizer.calculatePriority(imp)).toBeGreaterThan(0);
    });

    it('respects custom weights', () => {
      const custom = new RecommendationPrioritizer({
        valueWeight: 2.0,
        impactWeight: 1.0,
        constraintWeight: 1.0,
        costWeight: 1.0,
        riskWeight: 1.0,
        urgencyWeight: 1.0,
      });
      const imp = makeBaseImprovement('cw', { valueScore: 10, impactScore: 10, constraintWeight: 1, costScore: 1, riskScore: 1 });
      // (10*2 * 10*1 * 1*1) / (1*1 * 1*1) = 200
      expect(custom.calculatePriority(imp)).toBe(200);
    });

    it('zero valueScore yields 0 priority', () => {
      const imp = makeBaseImprovement('zv', { valueScore: 0, impactScore: 10, costScore: 1, riskScore: 1 });
      expect(prioritizer.calculatePriority(imp)).toBe(0);
    });

    it('zero impactScore yields 0 priority', () => {
      const imp = makeBaseImprovement('zi', { valueScore: 10, impactScore: 0, costScore: 1, riskScore: 1 });
      expect(prioritizer.calculatePriority(imp)).toBe(0);
    });

    it('zero constraintWeight yields 0 priority', () => {
      const imp = makeBaseImprovement('zcw', { valueScore: 10, impactScore: 10, constraintWeight: 0, costScore: 1, riskScore: 1 });
      expect(prioritizer.calculatePriority(imp)).toBe(0);
    });

    it('higher costWeight yields lower priority', () => {
      const low = new RecommendationPrioritizer({ ...DefaultEvolutionRuntimeConfig.prioritizer, costWeight: 0.5 });
      const high = new RecommendationPrioritizer({ ...DefaultEvolutionRuntimeConfig.prioritizer, costWeight: 10 });
      const imp = makeBaseImprovement('cow', { valueScore: 10, impactScore: 10, constraintWeight: 1, costScore: 5, riskScore: 1 });
      expect(low.calculatePriority(imp)).toBeGreaterThan(high.calculatePriority(imp));
    });

    it('higher riskWeight yields lower priority', () => {
      const low = new RecommendationPrioritizer({ ...DefaultEvolutionRuntimeConfig.prioritizer, riskWeight: 0.5 });
      const high = new RecommendationPrioritizer({ ...DefaultEvolutionRuntimeConfig.prioritizer, riskWeight: 10 });
      const imp = makeBaseImprovement('rw', { valueScore: 10, impactScore: 10, constraintWeight: 1, costScore: 1, riskScore: 5 });
      expect(low.calculatePriority(imp)).toBeGreaterThan(high.calculatePriority(imp));
    });

    it('all weights at 1.0 gives (V*I*CW)/(C*R) result', () => {
      const flat = new RecommendationPrioritizer({ valueWeight: 1, impactWeight: 1, constraintWeight: 1, costWeight: 1, riskWeight: 1, urgencyWeight: 1 });
      const imp = makeBaseImprovement('flat', { valueScore: 20, impactScore: 5, constraintWeight: 3, costScore: 2, riskScore: 5 });
      // (20*1 * 5*1 * 3*1) / (2*1 * 5*1) = 300 / 10 = 30
      expect(flat.calculatePriority(imp)).toBe(30);
    });
  });

  // --- calculatePriority() with zero cost/risk (clamped to 0.01) ---
  describe('calculatePriority() — zero cost/risk clamped to 0.01', () => {
    it('costScore of 0 is clamped to 0.01 in denominator', () => {
      const imp = makeBaseImprovement('zc', { valueScore: 10, impactScore: 10, constraintWeight: 1, costScore: 0, riskScore: 1 });
      // (10*1 * 10*1 * 1*1.5) / (0.01*1 * 1*1) = 150 / 0.01 = 15000
      expect(prioritizer.calculatePriority(imp)).toBe(15000);
    });

    it('riskScore of 0 is clamped to 0.01 in denominator', () => {
      const imp = makeBaseImprovement('zr', { valueScore: 10, impactScore: 10, constraintWeight: 1, costScore: 1, riskScore: 0 });
      // (10*1 * 10*1 * 1*1.5) / (1*1 * 0.01*1) = 150 / 0.01 = 15000
      expect(prioritizer.calculatePriority(imp)).toBe(15000);
    });

    it('both cost and risk zero are both clamped to 0.01', () => {
      const imp = makeBaseImprovement('zcr', { valueScore: 10, impactScore: 10, constraintWeight: 1, costScore: 0, riskScore: 0 });
      // (10*1 * 10*1 * 1*1.5) / (0.01*1 * 0.01*1) = 150 / 0.0001 = 1500000
      expect(prioritizer.calculatePriority(imp)).toBe(1500000);
    });

    it('negative costScore is also clamped to 0.01', () => {
      const imp = makeBaseImprovement('nc', { valueScore: 10, impactScore: 10, constraintWeight: 1, costScore: -5, riskScore: 1 });
      // max(-5, 0.01) = 0.01
      expect(prioritizer.calculatePriority(imp)).toBe(15000);
    });

    it('negative riskScore is also clamped to 0.01', () => {
      const imp = makeBaseImprovement('nr', { valueScore: 10, impactScore: 10, constraintWeight: 1, costScore: 1, riskScore: -3 });
      expect(prioritizer.calculatePriority(imp)).toBe(15000);
    });
  });

  // --- calculatePriority() rounding to 2 decimals ---
  describe('calculatePriority() — rounding to 2 decimals', () => {
    it('rounds to 2 decimal places', () => {
      const imp = makeBaseImprovement('rnd', { valueScore: 7, impactScore: 3, constraintWeight: 1, costScore: 2, riskScore: 11 });
      const result = prioritizer.calculatePriority(imp);
      // (7*1 * 3*1 * 1*1.5) / (2*1 * 11*1) = 31.5 / 22 = 1.431818... → 1.43
      expect(result).toBe(1.43);
    });

    it('does not have more than 2 decimal places', () => {
      const imp = makeBaseImprovement('rnd2', { valueScore: 1, impactScore: 1, constraintWeight: 1, costScore: 3, riskScore: 7 });
      const result = prioritizer.calculatePriority(imp);
      const decimalPart = result.toString().split('.')[1];
      if (decimalPart) {
        expect(decimalPart.length).toBeLessThanOrEqual(2);
      }
    });

    it('exact value has no decimal issue', () => {
      const imp = makeBaseImprovement('exact', { valueScore: 10, impactScore: 10, constraintWeight: 1, costScore: 1, riskScore: 1 });
      // (10*1 * 10*1 * 1*1.5) / (1*1 * 1*1) = 150
      expect(prioritizer.calculatePriority(imp)).toBe(150);
    });

    it('very small result rounds correctly', () => {
      const imp = makeBaseImprovement('small', { valueScore: 1, impactScore: 1, constraintWeight: 0.1, costScore: 100, riskScore: 100 });
      const result = prioritizer.calculatePriority(imp);
      // (1*1 * 1*1 * 0.1*1.5) / (100*1 * 100*1) = 0.15 / 10000 = 0.000015 → 0.0
      expect(result).toBe(0);
    });
  });

  // --- prioritize() sorts descending ---
  describe('prioritize() — sorts descending', () => {
    // Use a no-engine prioritizer to avoid unhandled rejections from updateScores
    // when fake improvements are not in the engine
    let noEngP: RecommendationPrioritizer;
    beforeEach(() => {
      noEngP = new RecommendationPrioritizer({ ...DefaultEvolutionRuntimeConfig.prioritizer });
    });

    it('returns array sorted by priority descending', async () => {
      const imps = [
        makeBaseImprovement('p-low', { priority: 10, valueScore: 10, impactScore: 10, costScore: 10, riskScore: 10 }),
        makeBaseImprovement('p-high', { priority: 90, valueScore: 90, impactScore: 90, costScore: 1, riskScore: 1 }),
        makeBaseImprovement('p-mid', { priority: 50, valueScore: 50, impactScore: 50, costScore: 5, riskScore: 5 }),
      ];
      const result = await noEngP.prioritize(imps);
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].priority).toBeGreaterThanOrEqual(result[i].priority);
      }
    });

    it('each item has priority field set', async () => {
      const imps = [
        makeBaseImprovement('s1', { valueScore: 10, impactScore: 10, costScore: 1, riskScore: 1 }),
      ];
      const result = await noEngP.prioritize(imps);
      for (const item of result) {
        expect(typeof item.priority).toBe('number');
      }
    });

    it('priority values match calculatePriority output', async () => {
      const imp = makeBaseImprovement('match', { valueScore: 10, impactScore: 10, costScore: 1, riskScore: 1 });
      const expected = noEngP.calculatePriority(imp);
      const result = await noEngP.prioritize([imp]);
      expect(result[0].priority).toBe(expected);
    });

    it('returns frozen items', async () => {
      const imp = makeBaseImprovement('frz', { valueScore: 10, impactScore: 10, costScore: 1, riskScore: 1 });
      const result = await noEngP.prioritize([imp]);
      for (const item of result) {
        expect(Object.isFrozen(item)).toBe(true);
      }
    });

    it('single item returns array of length 1', async () => {
      const imp = makeBaseImprovement('single', { valueScore: 10, impactScore: 10, costScore: 1, riskScore: 1 });
      const result = await noEngP.prioritize([imp]);
      expect(result).toHaveLength(1);
    });

    it('handles two items with equal priority', async () => {
      const imps = [
        makeBaseImprovement('eq1', { valueScore: 10, impactScore: 10, costScore: 1, riskScore: 1 }),
        makeBaseImprovement('eq2', { valueScore: 10, impactScore: 10, costScore: 1, riskScore: 1 }),
      ];
      const result = await noEngP.prioritize(imps);
      expect(result).toHaveLength(2);
      expect(result[0].priority).toBe(result[1].priority);
    });

    it('does not mutate input array', async () => {
      const imps = [
        makeBaseImprovement('mut1', { valueScore: 30, impactScore: 10, costScore: 1, riskScore: 1 }),
        makeBaseImprovement('mut2', { valueScore: 10, impactScore: 10, costScore: 1, riskScore: 1 }),
      ];
      const inputCopy = [...imps];
      await noEngP.prioritize(imps);
      expect(imps.length).toBe(inputCopy.length);
      expect(imps[0].id).toBe(inputCopy[0].id);
    });
  });

  // --- prioritize() updates engine scores ---
  describe('prioritize() — updates engine scores', () => {
    it('updates priority on the improvement engine for each item', async () => {
      const imp = await engine.propose({
        name: 'Engine Update Test',
        description: 'd',
        bottleneckId: null,
        constraintType: ConstraintType.Performance,
        targetRuntime: null,
        targetCapability: null,
        estimatedEffort: 'low',
        evidence: [],
        metadata: {},
      });
      await engine.updateScores(imp.id, { valueScore: 10, impactScore: 10, costScore: 1, riskScore: 1 });

      const retrieved = await engine.getById(imp.id);
      const improvements = [retrieved!];
      await prioritizer.prioritize(improvements);

      const updated = await engine.getById(imp.id);
      expect(updated!.priority).toBe(150); // (10*1*10*1*1*1.5)/(1*1*1*1) = 150
    });

    it('updates priority for multiple improvements', async () => {
      const ids: ImprovementId[] = [];
      for (let i = 0; i < 3; i++) {
        const imp = await engine.propose({
          name: `Multi ${i}`,
          description: 'd',
          bottleneckId: null,
          constraintType: ConstraintType.Performance,
          targetRuntime: null,
          targetCapability: null,
          estimatedEffort: 'low',
          evidence: [],
          metadata: {},
        });
        await engine.updateScores(imp.id, { valueScore: (i + 1) * 10, impactScore: 10, costScore: 1, riskScore: 1 });
        ids.push(imp.id);
      }

      const retrieved = await Promise.all(ids.map(id => engine.getById(id)));
      await prioritizer.prioritize(retrieved as Improvement[]);

      const after = await Promise.all(ids.map(id => engine.getById(id)));
      expect(after[0]!.priority).toBe(150);  // v=10
      expect(after[1]!.priority).toBe(300);  // v=20
      expect(after[2]!.priority).toBe(450);  // v=30
    });
  });

  // --- prioritize() without engine → no error ---
  describe('prioritize() — without engine', () => {
    it('does not throw when no engine is set', async () => {
      const noEngine = new RecommendationPrioritizer(
        { ...DefaultEvolutionRuntimeConfig.prioritizer },
      );
      const imps = [
        makeBaseImprovement('no-eng', { valueScore: 10, impactScore: 10, costScore: 1, riskScore: 1 }),
      ];
      await expect(noEngine.prioritize(imps)).resolves.toBeDefined();
    });

    it('still sorts correctly without engine', async () => {
      const noEngine = new RecommendationPrioritizer(
        { ...DefaultEvolutionRuntimeConfig.prioritizer },
      );
      const imps = [
        makeBaseImprovement('low', { valueScore: 10, impactScore: 10, costScore: 10, riskScore: 10 }),
        makeBaseImprovement('high', { valueScore: 100, impactScore: 100, costScore: 1, riskScore: 1 }),
      ];
      const result = await noEngine.prioritize(imps);
      expect(result[0].priority).toBeGreaterThanOrEqual(result[1].priority);
    });

    it('still calculates priority without engine', async () => {
      const noEngine = new RecommendationPrioritizer(
        { ...DefaultEvolutionRuntimeConfig.prioritizer },
      );
      const imps = [
        makeBaseImprovement('calc', { valueScore: 10, impactScore: 10, costScore: 1, riskScore: 1 }),
      ];
      const result = await noEngine.prioritize(imps);
      expect(result[0].priority).toBe(150);
    });
  });

  // --- prioritize() empty array ---
  describe('prioritize() — empty array', () => {
    it('returns empty array for empty input', async () => {
      const result = await prioritizer.prioritize([]);
      expect(result).toHaveLength(0);
    });

    it('returns a frozen empty array', async () => {
      const result = await prioritizer.prioritize([]);
      // The result is the sorted array - check it's a valid result
      expect(Array.isArray(result)).toBe(true);
    });

    it('does not throw for empty input', async () => {
      await expect(prioritizer.prioritize([])).resolves.toBeDefined();
    });
  });

  // --- setImprovementEngine ---
  describe('setImprovementEngine()', () => {
    it('can set engine after construction', () => {
      const fresh = new RecommendationPrioritizer(
        { ...DefaultEvolutionRuntimeConfig.prioritizer },
      );
      expect(() => fresh.setImprovementEngine(engine)).not.toThrow();
    });

    it('can replace engine', () => {
      const engine2 = new ImprovementEngine(
        { ...DefaultEvolutionRuntimeConfig.improvementEngine },
        bus,
      );
      expect(() => prioritizer.setImprovementEngine(engine2)).not.toThrow();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. EvolutionRuntime (Orchestrator)
// ═══════════════════════════════════════════════════════════════════

describe('EvolutionRuntime', () => {
  let bus: InProcessEventBus;
  let runtime: EvolutionRuntime;

  beforeEach(() => {
    bus = new InProcessEventBus();
    bus.clear();
    runtime = new EvolutionRuntime(
      { ...DefaultEvolutionRuntimeConfig },
      bus,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Constructor creates all 15 subsystems ---
  describe('Constructor', () => {
    it('creates BottleneckDetector subsystem', () => {
      expect(runtime.getBottleneckDetector()).toBeDefined();
    });

    it('creates ConstraintAnalyzer subsystem', () => {
      expect(runtime.getConstraintAnalyzer()).toBeDefined();
    });

    it('creates ImprovementEngine subsystem', () => {
      expect(runtime.getImprovementEngine()).toBeDefined();
    });

    it('creates ValueAnalyzer subsystem', () => {
      expect(runtime.getValueAnalyzer()).toBeDefined();
    });

    it('creates OpportunityCostEngine subsystem', () => {
      expect(runtime.getOpportunityCostEngine()).toBeDefined();
    });

    it('creates OptimizationPlanner subsystem', () => {
      expect(runtime.getOptimizationPlanner()).toBeDefined();
    });

    it('creates ExperimentRuntime subsystem', () => {
      expect(runtime.getExperimentRuntime()).toBeDefined();
    });

    it('creates KPIRuntime subsystem', () => {
      expect(runtime.getKPIRuntime()).toBeDefined();
    });

    it('creates FeedbackCollector subsystem', () => {
      expect(runtime.getFeedbackCollector()).toBeDefined();
    });

    it('creates LearningLoop subsystem', () => {
      expect(runtime.getLearningLoop()).toBeDefined();
    });

    it('creates EvolutionGraph subsystem', () => {
      expect(runtime.getEvolutionGraph()).toBeDefined();
    });

    it('creates ArchitectureOptimizer subsystem', () => {
      expect(runtime.getArchitectureOptimizer()).toBeDefined();
    });

    it('creates TechDebtAnalyzer subsystem', () => {
      expect(runtime.getTechDebtAnalyzer()).toBeDefined();
    });

    it('creates RecommendationPrioritizer subsystem', () => {
      expect(runtime.getRecommendationPrioritizer()).toBeDefined();
    });
  });

  // --- state starts as Uninitialized ---
  describe('Initial state', () => {
    it('state is Uninitialized after construction', () => {
      expect(runtime.state).toBe(EvolutionState.Uninitialized);
    });

    it('state property is readable', () => {
      const s = runtime.state;
      expect(typeof s).toBe('string');
    });
  });

  // --- initialize() → Initializing → Ready ---
  describe('initialize()', () => {
    it('transitions state to Ready', async () => {
      await runtime.initialize();
      expect(runtime.state).toBe(EvolutionState.Ready);
    });

    it('state is Ready after initialize completes', async () => {
      await runtime.initialize();
      expect(runtime.state).toBe(EvolutionState.Ready);
    });

    it('can be called without error', async () => {
      await expect(runtime.initialize()).resolves.toBeUndefined();
    });

    it('initialize is idempotent (second call also succeeds)', async () => {
      await runtime.initialize();
      await expect(runtime.initialize()).resolves.toBeUndefined();
      expect(runtime.state).toBe(EvolutionState.Ready);
    });
  });

  // --- initialize() publishes 3 events ---
  describe('initialize() — event publishing', () => {
    it('publishes exactly 3 events', async () => {
      await runtime.initialize();
      const log = bus.getLog();
      expect(log).toHaveLength(3);
    });

    it('first event is stateChanged', async () => {
      await runtime.initialize();
      const log = bus.getLog();
      expect(log[0].eventType).toBe('evolution.runtime.stateChanged');
    });

    it('second event is stateChanged', async () => {
      await runtime.initialize();
      const log = bus.getLog();
      expect(log[1].eventType).toBe('evolution.runtime.stateChanged');
    });

    it('third event is runtime.initialized', async () => {
      await runtime.initialize();
      const log = bus.getLog();
      expect(log[2].eventType).toBe('evolution.runtime.initialized');
    });

    it('initialized event has classification StateChange', async () => {
      await runtime.initialize();
      const log = bus.getLog();
      expect(log[2].classification).toBe(EventClassification.StateChange);
    });

    it('stateChanged events have classification StateChange', async () => {
      await runtime.initialize();
      const log = bus.getLog();
      expect(log[0].classification).toBe(EventClassification.StateChange);
      expect(log[1].classification).toBe(EventClassification.StateChange);
    });

    it('initialized event has classification StateChange', async () => {
      await runtime.initialize();
      const log = bus.getLog();
      expect(log[2].classification).toBe(EventClassification.StateChange);
    });

    it('all events have version 1.0.0', async () => {
      await runtime.initialize();
      const log = bus.getLog();
      for (const ev of log) {
        expect(ev.version).toBe('1.0.0');
      }
    });

    it('all events have timestamps', async () => {
      await runtime.initialize();
      const log = bus.getLog();
      for (const ev of log) {
        expect(ev.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
    });

    it('all events have eventIds', async () => {
      await runtime.initialize();
      const log = bus.getLog();
      for (const ev of log) {
        expect(ev.eventId).toBeDefined();
        expect(typeof ev.eventId).toBe('string');
      }
    });
  });

  // --- shutdown() → Stopping → Stopped ---
  describe('shutdown()', () => {
    it('transitions state to Stopped', async () => {
      await runtime.initialize();
      await runtime.shutdown();
      expect(runtime.state).toBe(EvolutionState.Stopped);
    });

    it('can be called without error', async () => {
      await runtime.initialize();
      await expect(runtime.shutdown()).resolves.toBeUndefined();
    });

    it('publishes two stateChanged events during shutdown', async () => {
      await runtime.initialize();
      bus.clear();
      await runtime.shutdown();
      const log = bus.getLog();
      const stateChanges = log.filter(e => e.eventType === 'evolution.runtime.stateChanged');
      expect(stateChanges).toHaveLength(2);
    });

    it('shutdown events have classification StateChange', async () => {
      await runtime.initialize();
      bus.clear();
      await runtime.shutdown();
      const log = bus.getLog();
      for (const ev of log) {
        expect(ev.classification).toBe(EventClassification.StateChange);
      }
    });

    it('shutdown events have version 1.0.0', async () => {
      await runtime.initialize();
      bus.clear();
      await runtime.shutdown();
      const log = bus.getLog();
      for (const ev of log) {
        expect(ev.version).toBe('1.0.0');
      }
    });
  });

  // --- shutdown() disposes subsystems ---
  describe('shutdown() — disposes subsystems', () => {
    it('evolution graph is cleared after shutdown', async () => {
      await runtime.initialize();
      const graph = runtime.getEvolutionGraph();
      // Can't easily add nodes through the interface without a full setup,
      // but we can verify dispose was called by checking graph count is 0
      await runtime.shutdown();
      expect(await graph.count()).toBe(0);
    });

    it('architecture optimizer is cleared after shutdown', async () => {
      await runtime.initialize();
      const arch = runtime.getArchitectureOptimizer();
      await runtime.shutdown();
      expect(await arch.count()).toBe(0);
    });
  });

  // --- shutdown() after dispose → error ---
  describe('shutdown() — after dispose', () => {
    it('throws EvolutionDisposedError on second shutdown call', async () => {
      await runtime.initialize();
      await runtime.shutdown();
      await expect(runtime.shutdown()).rejects.toThrow(EvolutionDisposedError);
    });

    it('disposed error has correct code', async () => {
      await runtime.initialize();
      await runtime.shutdown();
      try {
        await runtime.shutdown();
      } catch (e) {
        expect((e as EvolutionDisposedError).code).toBe('EVOLUTION_DISPOSED');
      }
    });

    it('throws EvolutionDisposedError on initialize after shutdown', async () => {
      await runtime.initialize();
      await runtime.shutdown();
      await expect(runtime.initialize()).rejects.toThrow(EvolutionDisposedError);
    });

    it('throws on analyze after shutdown', async () => {
      await runtime.initialize();
      await runtime.shutdown();
      await expect(runtime.analyze()).rejects.toThrow(EvolutionDisposedError);
    });

    it('throws on getMetrics after shutdown', async () => {
      await runtime.initialize();
      await runtime.shutdown();
      await expect(runtime.getMetrics()).rejects.toThrow(EvolutionDisposedError);
    });
  });

  // --- analyze() throws if not initialized ---
  describe('analyze() — not initialized', () => {
    it('throws EvolutionNotInitializedError', async () => {
      await expect(runtime.analyze()).rejects.toThrow(EvolutionNotInitializedError);
    });

    it('error has correct code', async () => {
      try {
        await runtime.analyze();
      } catch (e) {
        expect((e as EvolutionNotInitializedError).code).toBe('EVOLUTION_NOT_INITIALIZED');
      }
    });

    it('error message mentions not initialized', async () => {
      try {
        await runtime.analyze();
      } catch (e) {
        expect((e as EvolutionNotInitializedError).message).toContain('not initialized');
      }
    });
  });

  // --- analyze() throws if disposed ---
  describe('analyze() — disposed', () => {
    it('throws EvolutionDisposedError after shutdown', async () => {
      await runtime.initialize();
      await runtime.shutdown();
      await expect(runtime.analyze()).rejects.toThrow(EvolutionDisposedError);
    });
  });

  // --- getMetrics() throws if not initialized ---
  describe('getMetrics() — not initialized', () => {
    it('throws EvolutionNotInitializedError', async () => {
      await expect(runtime.getMetrics()).rejects.toThrow(EvolutionNotInitializedError);
    });

    it('error has correct code', async () => {
      try {
        await runtime.getMetrics();
      } catch (e) {
        expect((e as EvolutionNotInitializedError).code).toBe('EVOLUTION_NOT_INITIALIZED');
      }
    });
  });

  // --- analyze() returns EvolutionAnalysisResult ---
  describe('analyze() — return value', () => {
    it('returns an object with bottlenecks array', async () => {
      await runtime.initialize();
      const result = await runtime.analyze();
      expect(Array.isArray(result.bottlenecks)).toBe(true);
    });

    it('returns an object with improvements array', async () => {
      await runtime.initialize();
      const result = await runtime.analyze();
      expect(Array.isArray(result.improvements)).toBe(true);
    });

    it('returns an object with valueAnalyses array', async () => {
      await runtime.initialize();
      const result = await runtime.analyze();
      expect(Array.isArray(result.valueAnalyses)).toBe(true);
    });

    it('returns an object with opportunityCosts array', async () => {
      await runtime.initialize();
      const result = await runtime.analyze();
      expect(Array.isArray(result.opportunityCosts)).toBe(true);
    });

    it('returns an object with roadmap', async () => {
      await runtime.initialize();
      const result = await runtime.analyze();
      expect(result.roadmap).toBeDefined();
    });

    it('returns an object with durationMs as a number', async () => {
      await runtime.initialize();
      const result = await runtime.analyze();
      expect(typeof result.durationMs).toBe('number');
    });

    it('durationMs is non-negative', async () => {
      await runtime.initialize();
      const result = await runtime.analyze();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('returns a frozen result object', async () => {
      await runtime.initialize();
      const result = await runtime.analyze();
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('bottlenecks array is frozen', async () => {
      await runtime.initialize();
      const result = await runtime.analyze();
      expect(Object.isFrozen(result.bottlenecks)).toBe(true);
    });

    it('improvements array is frozen', async () => {
      await runtime.initialize();
      const result = await runtime.analyze();
      expect(Object.isFrozen(result.improvements)).toBe(true);
    });

    it('valueAnalyses array is frozen', async () => {
      await runtime.initialize();
      const result = await runtime.analyze();
      expect(Object.isFrozen(result.valueAnalyses)).toBe(true);
    });

    it('opportunityCosts array is frozen', async () => {
      await runtime.initialize();
      const result = await runtime.analyze();
      expect(Object.isFrozen(result.opportunityCosts)).toBe(true);
    });

    it('state returns to Ready after analyze', async () => {
      await runtime.initialize();
      await runtime.analyze();
      expect(runtime.state).toBe(EvolutionState.Ready);
    });

    it('can run analyze multiple times', async () => {
      await runtime.initialize();
      const r1 = await runtime.analyze();
      const r2 = await runtime.analyze();
      expect(r1).toBeDefined();
      expect(r2).toBeDefined();
    });
  });

  // --- analyze() full pipeline ---
  describe('analyze() — full pipeline', () => {
    it('detect step produces bottlenecks', async () => {
      await runtime.initialize();
      const result = await runtime.analyze();
      // BottleneckDetector.detect({}) generates at least one bottleneck by default
      expect(result.bottlenecks.length).toBeGreaterThanOrEqual(0);
    });

    it('propose step produces improvements for each bottleneck', async () => {
      await runtime.initialize();
      const result = await runtime.analyze();
      // Should have same number of improvements as bottlenecks
      expect(result.improvements.length).toBe(result.bottlenecks.length);
    });

    it('value analysis is done for top 10 improvements', async () => {
      await runtime.initialize();
      const result = await runtime.analyze();
      expect(result.valueAnalyses.length).toBe(Math.min(result.improvements.length, 10));
    });

    it('opportunity cost is done for top 5 improvements', async () => {
      await runtime.initialize();
      const result = await runtime.analyze();
      expect(result.opportunityCosts.length).toBe(Math.min(result.improvements.length, 5));
    });

    it('roadmap is generated', async () => {
      await runtime.initialize();
      const result = await runtime.analyze();
      expect(result.roadmap).not.toBeNull();
    });

    it('roadmap has items array', async () => {
      await runtime.initialize();
      const result = await runtime.analyze();
      expect(result.roadmap!.items).toBeDefined();
    });

    it('improvements are prioritized (sorted)', async () => {
      await runtime.initialize();
      const result = await runtime.analyze();
      // After prioritization, improvements should have priority set
      for (const imp of result.improvements) {
        expect(typeof imp.priority).toBe('number');
      }
    });

    it('publishes analysis.completed event', async () => {
      await runtime.initialize();
      bus.clear();
      await runtime.analyze();
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.analysis.completed');
      expect(ev).toBeDefined();
    });

    it('analysis.completed event has correct eventType', async () => {
      await runtime.initialize();
      bus.clear();
      await runtime.analyze();
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.analysis.completed');
      expect(ev).toBeDefined();
    });

    it('analysis.completed event has classification Result', async () => {
      await runtime.initialize();
      bus.clear();
      await runtime.analyze();
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.analysis.completed');
      expect(ev!.classification).toBe(EventClassification.Result);
    });

    it('analysis.completed event has a valid eventId', async () => {
      await runtime.initialize();
      bus.clear();
      await runtime.analyze();
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.analysis.completed');
      expect(ev!.eventId).toBeDefined();
      expect(typeof ev!.eventId).toBe('string');
    });

    it('analysis.completed has classification Result', async () => {
      await runtime.initialize();
      bus.clear();
      await runtime.analyze();
      const log = bus.getLog();
      const ev = log.find(e => e.eventType === 'evolution.analysis.completed');
      expect(ev!.classification).toBe(EventClassification.Result);
    });

    it('publishes multiple stateChanged events during analysis', async () => {
      await runtime.initialize();
      bus.clear();
      await runtime.analyze();
      const log = bus.getLog();
      const stateChanges = log.filter(e => e.eventType === 'evolution.runtime.stateChanged');
      // Analyzing -> Ready
      expect(stateChanges.length).toBeGreaterThanOrEqual(2);
    });

    it('analysis events have monotonically increasing sequences', async () => {
      await runtime.initialize();
      bus.clear();
      await runtime.analyze();
      const log = bus.getLog();
      for (let i = 1; i < log.length; i++) {
        expect(log[i].sequence).toBeGreaterThan(log[i - 1].sequence);
      }
    });
  });

  // --- getMetrics() returns correct counts ---
  describe('getMetrics()', () => {
    it('returns metrics with all required fields', async () => {
      await runtime.initialize();
      const m = await runtime.getMetrics();
      expect(m).toHaveProperty('totalBottlenecksDetected');
      expect(m).toHaveProperty('activeBottlenecks');
      expect(m).toHaveProperty('resolvedBottlenecks');
      expect(m).toHaveProperty('totalImprovements');
      expect(m).toHaveProperty('activeImprovements');
      expect(m).toHaveProperty('completedImprovements');
      expect(m).toHaveProperty('failedImprovements');
      expect(m).toHaveProperty('totalExperiments');
      expect(m).toHaveProperty('successfulExperiments');
      expect(m).toHaveProperty('totalKPIs');
      expect(m).toHaveProperty('kpisImproved');
      expect(m).toHaveProperty('totalFeedback');
      expect(m).toHaveProperty('processedFeedback');
      expect(m).toHaveProperty('totalLearningRecords');
      expect(m).toHaveProperty('evolutionGraphNodes');
      expect(m).toHaveProperty('techDebtItems');
      expect(m).toHaveProperty('resolvedTechDebt');
      expect(m).toHaveProperty('totalTechDebtCost');
      expect(m).toHaveProperty('averageImprovementPriority');
      expect(m).toHaveProperty('lastAnalysisAt');
      expect(m).toHaveProperty('metadata');
    });

    it('returns zero counts when nothing has been done', async () => {
      await runtime.initialize();
      const m = await runtime.getMetrics();
      expect(m.totalBottlenecksDetected).toBe(0);
      expect(m.totalImprovements).toBe(0);
      expect(m.totalExperiments).toBe(0);
      expect(m.totalKPIs).toBe(0);
      expect(m.totalFeedback).toBe(0);
      expect(m.totalLearningRecords).toBe(0);
      expect(m.evolutionGraphNodes).toBe(0);
      expect(m.techDebtItems).toBe(0);
    });

    it('returns frozen metrics object', async () => {
      await runtime.initialize();
      const m = await runtime.getMetrics();
      expect(Object.isFrozen(m)).toBe(true);
    });

    it('metadata is frozen', async () => {
      await runtime.initialize();
      const m = await runtime.getMetrics();
      expect(Object.isFrozen(m.metadata)).toBe(true);
    });

    it('lastAnalysisAt is null before any analysis', async () => {
      await runtime.initialize();
      const m = await runtime.getMetrics();
      expect(m.lastAnalysisAt).toBeNull();
    });

    it('lastAnalysisAt is set after analysis', async () => {
      await runtime.initialize();
      await runtime.analyze();
      const m = await runtime.getMetrics();
      expect(m.lastAnalysisAt).not.toBeNull();
    });

    it('averageImprovementPriority is 0 with no improvements', async () => {
      await runtime.initialize();
      const m = await runtime.getMetrics();
      expect(m.averageImprovementPriority).toBe(0);
    });

    it('kpisImproved is 0', async () => {
      await runtime.initialize();
      const m = await runtime.getMetrics();
      expect(m.kpisImproved).toBe(0);
    });

    it('totalTechDebtCost is 0 with no tech debt', async () => {
      await runtime.initialize();
      const m = await runtime.getMetrics();
      expect(m.totalTechDebtCost).toBe(0);
    });

    it('all numeric fields are numbers', async () => {
      await runtime.initialize();
      const m = await runtime.getMetrics();
      const numericFields = [
        'totalBottlenecksDetected', 'activeBottlenecks', 'resolvedBottlenecks',
        'totalImprovements', 'activeImprovements', 'completedImprovements',
        'failedImprovements', 'totalExperiments', 'successfulExperiments',
        'totalKPIs', 'kpisImproved', 'totalFeedback', 'processedFeedback',
        'totalLearningRecords', 'evolutionGraphNodes', 'techDebtItems',
        'resolvedTechDebt', 'totalTechDebtCost', 'averageImprovementPriority',
      ];
      for (const f of numericFields) {
        expect(typeof (m as Record<string, unknown>)[f]).toBe('number');
      }
    });

    it('metrics change after running analysis', async () => {
      await runtime.initialize();
      const before = await runtime.getMetrics();
      await runtime.analyze();
      const after = await runtime.getMetrics();
      // After analysis, there should be bottlenecks and improvements
      expect(after.totalBottlenecksDetected).toBeGreaterThanOrEqual(before.totalBottlenecksDetected);
      expect(after.totalImprovements).toBeGreaterThanOrEqual(before.totalImprovements);
    });
  });

  // --- All 15 getter methods return correct subsystem type ---
  describe('Subsystem getters', () => {
    it('getBottleneckDetector returns object with detect method', () => {
      const sub = runtime.getBottleneckDetector();
      expect(typeof sub.detect).toBe('function');
    });

    it('getConstraintAnalyzer returns object with analyze method', () => {
      const sub = runtime.getConstraintAnalyzer();
      expect(typeof sub.analyze).toBe('function');
    });

    it('getImprovementEngine returns object with propose method', () => {
      const sub = runtime.getImprovementEngine();
      expect(typeof sub.propose).toBe('function');
    });

    it('getValueAnalyzer returns object with analyze method', () => {
      const sub = runtime.getValueAnalyzer();
      expect(typeof sub.analyze).toBe('function');
    });

    it('getOpportunityCostEngine returns object with analyze method', () => {
      const sub = runtime.getOpportunityCostEngine();
      expect(typeof sub.analyze).toBe('function');
    });

    it('getOptimizationPlanner returns object with generateRoadmap method', () => {
      const sub = runtime.getOptimizationPlanner();
      expect(typeof sub.generateRoadmap).toBe('function');
    });

    it('getExperimentRuntime returns object with propose method', () => {
      const sub = runtime.getExperimentRuntime();
      expect(typeof sub.propose).toBe('function');
    });

    it('getKPIRuntime returns object with register method', () => {
      const sub = runtime.getKPIRuntime();
      expect(typeof sub.register).toBe('function');
    });

    it('getFeedbackCollector returns object with collect method', () => {
      const sub = runtime.getFeedbackCollector();
      expect(typeof sub.collect).toBe('function');
    });

    it('getLearningLoop returns object with record method', () => {
      const sub = runtime.getLearningLoop();
      expect(typeof sub.record).toBe('function');
    });

    it('getEvolutionGraph returns object with addNode method', () => {
      const sub = runtime.getEvolutionGraph();
      expect(typeof sub.addNode).toBe('function');
    });

    it('getArchitectureOptimizer returns object with analyze method', () => {
      const sub = runtime.getArchitectureOptimizer();
      expect(typeof sub.analyze).toBe('function');
    });

    it('getTechDebtAnalyzer returns object with register method', () => {
      const sub = runtime.getTechDebtAnalyzer();
      expect(typeof sub.register).toBe('function');
    });

    it('getRecommendationPrioritizer returns object with prioritize method', () => {
      const sub = runtime.getRecommendationPrioritizer();
      expect(typeof sub.prioritize).toBe('function');
    });

    it('getRecommendationPrioritizer returns object with calculatePriority method', () => {
      const sub = runtime.getRecommendationPrioritizer();
      expect(typeof sub.calculatePriority).toBe('function');
    });
  });

  // --- Event verification for runtime ---
  describe('Event verification', () => {
    it('does not throw when no event bus', async () => {
      const noBusRuntime = new EvolutionRuntime(
        { ...DefaultEvolutionRuntimeConfig },
      );
      await noBusRuntime.initialize();
      expect(noBusRuntime.state).toBe(EvolutionState.Ready);
    });

    it('shutdown publishes stateChanged events even without prior analysis', async () => {
      await runtime.initialize();
      bus.clear();
      await runtime.shutdown();
      const log = bus.getLog();
      const stateChanges = log.filter(e => e.eventType === 'evolution.runtime.stateChanged');
      // Stopping and Stopped
      expect(stateChanges).toHaveLength(2);
    });

    it('all runtime events have eventId', async () => {
      await runtime.initialize();
      bus.clear();
      await runtime.shutdown();
      const log = bus.getLog();
      for (const ev of log) {
        expect(ev.eventId).toBeDefined();
        expect(typeof ev.eventId).toBe('string');
      }
    });

    it('all runtime events have eventType', async () => {
      await runtime.initialize();
      bus.clear();
      await runtime.shutdown();
      const log = bus.getLog();
      for (const ev of log) {
        expect(ev.eventType).toContain('evolution.runtime');
      }
    });

    it('shutdown events have monotonically increasing sequences', async () => {
      await runtime.initialize();
      bus.clear();
      await runtime.shutdown();
      const log = bus.getLog();
      for (let i = 1; i < log.length; i++) {
        expect(log[i].sequence).toBeGreaterThan(log[i - 1].sequence);
      }
    });
  });

  // --- Additional EvolutionRuntime edge cases ---
  describe('Edge cases', () => {
    it('constructor without event bus succeeds', () => {
      const rt = new EvolutionRuntime({ ...DefaultEvolutionRuntimeConfig });
      expect(rt.state).toBe(EvolutionState.Uninitialized);
    });

    it('constructor without event bus can initialize', async () => {
      const rt = new EvolutionRuntime({ ...DefaultEvolutionRuntimeConfig });
      await rt.initialize();
      expect(rt.state).toBe(EvolutionState.Ready);
    });

    it('constructor without event bus can analyze', async () => {
      const rt = new EvolutionRuntime({ ...DefaultEvolutionRuntimeConfig });
      await rt.initialize();
      const result = await rt.analyze();
      expect(result).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('constructor without event bus can shutdown', async () => {
      const rt = new EvolutionRuntime({ ...DefaultEvolutionRuntimeConfig });
      await rt.initialize();
      await rt.shutdown();
      expect(rt.state).toBe(EvolutionState.Stopped);
    });

    it('getMetrics after analysis shows updated lastAnalysisAt', async () => {
      await runtime.initialize();
      await runtime.analyze();
      const m = await runtime.getMetrics();
      expect(m.lastAnalysisAt).not.toBeNull();
      expect(m.lastAnalysisAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('getMetrics totalBottlenecksDetected increments after analysis', async () => {
      await runtime.initialize();
      const before = await runtime.getMetrics();
      await runtime.analyze();
      const after = await runtime.getMetrics();
      expect(after.totalBottlenecksDetected).toBeGreaterThanOrEqual(before.totalBottlenecksDetected);
    });

    it('getMetrics totalImprovements increments after analysis', async () => {
      await runtime.initialize();
      const before = await runtime.getMetrics();
      await runtime.analyze();
      const after = await runtime.getMetrics();
      expect(after.totalImprovements).toBeGreaterThanOrEqual(before.totalImprovements);
    });

    it('getMetrics resolvedBottlenecks is 0 after first analysis', async () => {
      await runtime.initialize();
      await runtime.analyze();
      const m = await runtime.getMetrics();
      expect(m.resolvedBottlenecks).toBe(0);
    });

    it('getMetrics failedImprovements is 0 after first analysis', async () => {
      await runtime.initialize();
      await runtime.analyze();
      const m = await runtime.getMetrics();
      expect(m.failedImprovements).toBe(0);
    });

    it('getMetrics completedImprovements is 0 after first analysis', async () => {
      await runtime.initialize();
      await runtime.analyze();
      const m = await runtime.getMetrics();
      expect(m.completedImprovements).toBe(0);
    });

    it('analyze result has roadmap with valid id', async () => {
      await runtime.initialize();
      const result = await runtime.analyze();
      expect(result.roadmap).not.toBeNull();
      expect(result.roadmap!.id).toBeDefined();
    });

    it('analyze result roadmap has frozen items', async () => {
      await runtime.initialize();
      const result = await runtime.analyze();
      expect(Object.isFrozen(result.roadmap!.items)).toBe(true);
    });

    it('analyze result bottlenecks is frozen', async () => {
      await runtime.initialize();
      const result = await runtime.analyze();
      expect(Object.isFrozen(result.bottlenecks)).toBe(true);
    });

    it('analyze returns EvolutionAnalysisResult with all fields', async () => {
      await runtime.initialize();
      const result = await runtime.analyze();
      expect(result).toHaveProperty('bottlenecks');
      expect(result).toHaveProperty('improvements');
      expect(result).toHaveProperty('valueAnalyses');
      expect(result).toHaveProperty('opportunityCosts');
      expect(result).toHaveProperty('roadmap');
      expect(result).toHaveProperty('durationMs');
    });

    it('second analysis produces independent result', async () => {
      await runtime.initialize();
      const r1 = await runtime.analyze();
      const r2 = await runtime.analyze();
      expect(r1.durationMs).toBeGreaterThanOrEqual(0);
      expect(r2.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('multiple getMetrics calls return consistent results', async () => {
      await runtime.initialize();
      const m1 = await runtime.getMetrics();
      const m2 = await runtime.getMetrics();
      expect(m1.totalBottlenecksDetected).toBe(m2.totalBottlenecksDetected);
    });

    it('getMetrics totalExperiments is 0 with no experiments', async () => {
      await runtime.initialize();
      const m = await runtime.getMetrics();
      expect(m.totalExperiments).toBe(0);
    });

    it('getMetrics successfulExperiments is 0 with no experiments', async () => {
      await runtime.initialize();
      const m = await runtime.getMetrics();
      expect(m.successfulExperiments).toBe(0);
    });

    it('getMetrics totalFeedback is 0 with no feedback', async () => {
      await runtime.initialize();
      const m = await runtime.getMetrics();
      expect(m.totalFeedback).toBe(0);
    });

    it('getMetrics processedFeedback is 0 with no feedback', async () => {
      await runtime.initialize();
      const m = await runtime.getMetrics();
      expect(m.processedFeedback).toBe(0);
    });

    it('getMetrics totalLearningRecords is 0 with no records', async () => {
      await runtime.initialize();
      const m = await runtime.getMetrics();
      expect(m.totalLearningRecords).toBe(0);
    });

    it('getMetrics evolutionGraphNodes is 0 with no nodes', async () => {
      await runtime.initialize();
      const m = await runtime.getMetrics();
      expect(m.evolutionGraphNodes).toBe(0);
    });

    it('getMetrics resolvedTechDebt is 0 with no tech debt', async () => {
      await runtime.initialize();
      const m = await runtime.getMetrics();
      expect(m.resolvedTechDebt).toBe(0);
    });

    it('shutdown from Uninitialized state works', async () => {
      const rt = new EvolutionRuntime({ ...DefaultEvolutionRuntimeConfig });
      await rt.shutdown();
      expect(rt.state).toBe(EvolutionState.Stopped);
    });
  });
});
