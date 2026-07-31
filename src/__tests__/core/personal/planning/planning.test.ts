import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PersonalRuntimeContracts } from '../../../../core/personal/contracts.js';
import { PlanningRuntime } from '../../../../core/personal/planning-runtime.js';
import { PlanPeriod } from '../../../../core/personal/types.js';
import { PlanValidationError } from '../../../../core/personal/errors.js';

function createMockContracts(): PersonalRuntimeContracts {
  return {
    identity: { getCurrentUserId: vi.fn(() => 'user-1'), getUserRoles: vi.fn(() => ['admin']), getUserPreferences: vi.fn(() => ({theme:'dark'})), resolvePreference: vi.fn(() => 'dark') },
    memory: { retrieve: vi.fn(async() => null), store: vi.fn(async() => {}), query: vi.fn(() => []), getSessionEntries: vi.fn(() => []), getWorkingEntries: vi.fn(() => []) },
    knowledge: { search: vi.fn(async() => []), getNamespaces: vi.fn(async() => [{id:'ns-1'}]), getItemCount: vi.fn(async() => 42), getRecentItems: vi.fn(async() => []), getByTags: vi.fn(async() => []) },
    workflow: { getActiveWorkflows: vi.fn(() => []), getRunningInstances: vi.fn(() => []), getRecentCompletions: vi.fn(() => []), getAvailableWorkflows: vi.fn(() => []) },
    experience: { getActiveAdaptations: vi.fn(() => []), getRecommendations: vi.fn(() => []), getCurrentPhase: vi.fn(() => 'Learning'), getBehaviorPatterns: vi.fn(() => []) },
    cognitive: { getCurrentIntent: vi.fn(() => null), getConversationTurnCount: vi.fn(() => 0), getCurrentSessionId: vi.fn(() => null), getConversationSummary: vi.fn(async() => null) },
    capability: { getActivePacks: vi.fn(() => []), getAvailableCapabilities: vi.fn(() => []) },
    desktop: { getOpenWindowCount: vi.fn(() => 3), getActiveWindow: vi.fn(() => 'editor'), getDesktopState: vi.fn(() => 'Ready'), getSubsystemCount: vi.fn(() => 14) },
    platform: { publishEvent: vi.fn(async() => {}), getConfiguration: vi.fn(() => null), getHealth: vi.fn(async() => ({})) },
  };
}

describe('PlanningRuntime', () => {
  let contracts: PersonalRuntimeContracts;
  let runtime: PlanningRuntime;

  beforeEach(() => {
    contracts = createMockContracts();
    runtime = new PlanningRuntime(contracts);
  });

  // ── createPlan ────────────────────────────────────────────────

  describe('createPlan', () => {
    it('creates a plan with id', () => {
      const plan = runtime.createPlan(PlanPeriod.Today);
      expect(plan.id).toBeDefined();
    });

    it('creates a plan with correct period', () => {
      const plan = runtime.createPlan(PlanPeriod.Week);
      expect(plan.period).toBe(PlanPeriod.Week);
    });

    it('defaults goalId to null', () => {
      const plan = runtime.createPlan(PlanPeriod.Today);
      expect(plan.goalId).toBeNull();
    });

    it('accepts goalId', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, 'g-1');
      expect(plan.goalId).toBe('g-1');
    });

    it('creates with empty items by default', () => {
      const plan = runtime.createPlan(PlanPeriod.Today);
      expect(plan.items).toEqual([]);
    });

    it('creates items from input', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [
        { title: 'Task 1' },
        { title: 'Task 2' },
      ]);
      expect(plan.items).toHaveLength(2);
      expect(plan.items[0].title).toBe('Task 1');
    });

    it('sets item default estimatedMinutes to 30', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [{ title: 'X' }]);
      expect(plan.items[0].estimatedMinutes).toBe(30);
    });

    it('sets item default priority to 5', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [{ title: 'X' }]);
      expect(plan.items[0].priority).toBe(5);
    });

    it('sets item status to pending', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [{ title: 'X' }]);
      expect(plan.items[0].status).toBe('pending');
    });

    it('sets item order sequentially', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [
        { title: 'A' },
        { title: 'B' },
        { title: 'C' },
      ]);
      expect(plan.items[0].order).toBe(0);
      expect(plan.items[1].order).toBe(1);
      expect(plan.items[2].order).toBe(2);
    });

    it('accepts item estimatedMinutes', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [
        { title: 'X', estimatedMinutes: 60 },
      ]);
      expect(plan.items[0].estimatedMinutes).toBe(60);
    });

    it('accepts item priority', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [
        { title: 'X', priority: 9 },
      ]);
      expect(plan.items[0].priority).toBe(9);
    });

    it('inherits plan goalId to items when not specified', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, 'g-1', [
        { title: 'X' },
      ]);
      expect(plan.items[0].goalId).toBe('g-1');
    });

    it('item goalId overrides plan goalId', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, 'g-1', [
        { title: 'X', goalId: 'g-2' },
      ]);
      expect(plan.items[0].goalId).toBe('g-2');
    });

    it('item defaults goalId to null when no plan goalId', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [
        { title: 'X' },
      ]);
      expect(plan.items[0].goalId).toBeNull();
    });

    it('sets createdAt and updatedAt', () => {
      const plan = runtime.createPlan(PlanPeriod.Today);
      expect(plan.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(plan.updatedAt).toBe(plan.createdAt);
    });

    it('publishes PlanCreated event', () => {
      runtime.createPlan(PlanPeriod.Today);
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith(
        'PlanCreated',
        expect.objectContaining({ eventType: 'PlanCreated' }),
      );
    });

    it('freezes the plan', () => {
      const plan = runtime.createPlan(PlanPeriod.Today);
      expect(Object.isFrozen(plan)).toBe(true);
    });

    it('freezes items array', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [{ title: 'X' }]);
      expect(Object.isFrozen(plan.items)).toBe(true);
    });

    it('throws when max plans exceeded', () => {
      const limited = new PlanningRuntime(contracts, 1);
      limited.createPlan(PlanPeriod.Today);
      expect(() => limited.createPlan(PlanPeriod.Today)).toThrow(PlanValidationError);
    });

    it('item accepts description', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [
        { title: 'X', description: 'do stuff' },
      ]);
      expect(plan.items[0].description).toBe('do stuff');
    });

    it('trims item title', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [
        { title: '  Hello  ' },
      ]);
      expect(plan.items[0].title).toBe('Hello');
    });

    it('item defaults description to empty string', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [
        { title: 'X' },
      ]);
      expect(plan.items[0].description).toBe('');
    });
  });

  // ── updatePlan ────────────────────────────────────────────────

  describe('updatePlan', () => {
    it('updates period', () => {
      const plan = runtime.createPlan(PlanPeriod.Today);
      const updated = runtime.updatePlan(plan.id, { period: PlanPeriod.Week });
      expect(updated.period).toBe(PlanPeriod.Week);
    });

    it('updates goalId', () => {
      const plan = runtime.createPlan(PlanPeriod.Today);
      const updated = runtime.updatePlan(plan.id, { goalId: 'g-1' });
      expect(updated.goalId).toBe('g-1');
    });

    it('updates updatedAt', () => {
      const plan = runtime.createPlan(PlanPeriod.Today);
      const updated = runtime.updatePlan(plan.id, { period: PlanPeriod.Week });
      expect(updated.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('throws PlanValidationError for non-existent plan', () => {
      expect(() => runtime.updatePlan('nope', { period: PlanPeriod.Week })).toThrow(PlanValidationError);
    });

    it('publishes PlanUpdated event when period changes', () => {
      const plan = runtime.createPlan(PlanPeriod.Today);
      runtime.updatePlan(plan.id, { period: PlanPeriod.Week });
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith(
        'PlanUpdated',
        expect.objectContaining({ eventType: 'PlanUpdated' }),
      );
    });

    it('does not publish PlanUpdated when nothing changes', () => {
      const plan = runtime.createPlan(PlanPeriod.Today);
      const callCount = vi.mocked(contracts.platform.publishEvent).mock.calls.length;
      runtime.updatePlan(plan.id, { period: PlanPeriod.Today });
      const newCallCount = vi.mocked(contracts.platform.publishEvent).mock.calls.length;
      expect(newCallCount).toBe(callCount);
    });

    it('can set goalId to null', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, 'g-1');
      const updated = runtime.updatePlan(plan.id, { goalId: null });
      expect(updated.goalId).toBeNull();
    });

    it('preserves items on update', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [{ title: 'X' }]);
      const updated = runtime.updatePlan(plan.id, { period: PlanPeriod.Week });
      expect(updated.items).toHaveLength(1);
    });
  });

  // ── addItem ───────────────────────────────────────────────────

  describe('addItem', () => {
    it('adds an item to the plan', () => {
      const plan = runtime.createPlan(PlanPeriod.Today);
      const updated = runtime.addItem(plan.id, { title: 'New Task' });
      expect(updated.items).toHaveLength(1);
      expect(updated.items[0].title).toBe('New Task');
    });

    it('appends item at end', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [{ title: 'A' }]);
      const updated = runtime.addItem(plan.id, { title: 'B' });
      expect(updated.items).toHaveLength(2);
      expect(updated.items[1].title).toBe('B');
      expect(updated.items[1].order).toBe(1);
    });

    it('throws for non-existent plan', () => {
      expect(() => runtime.addItem('nope', { title: 'X' })).toThrow(PlanValidationError);
    });

    it('throws on empty title', () => {
      const plan = runtime.createPlan(PlanPeriod.Today);
      expect(() => runtime.addItem(plan.id, { title: '' })).toThrow(PlanValidationError);
    });

    it('trims item title', () => {
      const plan = runtime.createPlan(PlanPeriod.Today);
      const updated = runtime.addItem(plan.id, { title: '  Z  ' });
      expect(updated.items[0].title).toBe('Z');
    });

    it('updates updatedAt', () => {
      const plan = runtime.createPlan(PlanPeriod.Today);
      const updated = runtime.addItem(plan.id, { title: 'X' });
      expect(updated.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ── completeItem ─────────────────────────────────────────────

  describe('completeItem', () => {
    it('marks item as done', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [{ title: 'X' }]);
      const itemId = plan.items[0].id;
      const updated = runtime.completeItem(plan.id, itemId);
      expect(updated.items[0].status).toBe('done');
    });

    it('throws for non-existent plan', () => {
      expect(() => runtime.completeItem('nope', 'item-1')).toThrow(PlanValidationError);
    });

    it('throws for non-existent item', () => {
      const plan = runtime.createPlan(PlanPeriod.Today);
      expect(() => runtime.completeItem(plan.id, 'nope')).toThrow(PlanValidationError);
    });

    it('publishes PlanItemCompleted event', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [{ title: 'X' }]);
      runtime.completeItem(plan.id, plan.items[0].id);
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith(
        'PlanItemCompleted',
        expect.objectContaining({ eventType: 'PlanItemCompleted' }),
      );
    });

    it('updates updatedAt', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [{ title: 'X' }]);
      const updated = runtime.completeItem(plan.id, plan.items[0].id);
      expect(updated.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('preserves other item data', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [
        { title: 'X', estimatedMinutes: 45, priority: 8, description: 'do x' },
      ]);
      const updated = runtime.completeItem(plan.id, plan.items[0].id);
      expect(updated.items[0].title).toBe('X');
      expect(updated.items[0].estimatedMinutes).toBe(45);
      expect(updated.items[0].priority).toBe(8);
      expect(updated.items[0].description).toBe('do x');
    });
  });

  // ── reorderItems ─────────────────────────────────────────────

  describe('reorderItems', () => {
    it('reorders items by id list', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [
        { title: 'A' },
        { title: 'B' },
        { title: 'C' },
      ]);
      const [a, b, c] = plan.items;
      const updated = runtime.reorderItems(plan.id, [c.id, a.id, b.id]);
      expect(updated.items[0].id).toBe(c.id);
      expect(updated.items[0].order).toBe(0);
      expect(updated.items[1].id).toBe(a.id);
      expect(updated.items[1].order).toBe(1);
    });

    it('throws for non-existent plan', () => {
      expect(() => runtime.reorderItems('nope', ['a'])).toThrow(PlanValidationError);
    });

    it('throws for non-existent item ids', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [{ title: 'A' }]);
      expect(() => runtime.reorderItems(plan.id, ['bogus'])).toThrow(PlanValidationError);
    });

    it('keeps items not in reorder list at end', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [
        { title: 'A' },
        { title: 'B' },
        { title: 'C' },
      ]);
      const [a] = plan.items;
      const updated = runtime.reorderItems(plan.id, [a.id]);
      expect(updated.items[0].id).toBe(a.id);
      expect(updated.items[0].order).toBe(0);
      expect(updated.items).toHaveLength(3);
    });

    it('updates updatedAt', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [
        { title: 'A' },
        { title: 'B' },
      ]);
      const [a, b] = plan.items;
      const updated = runtime.reorderItems(plan.id, [b.id, a.id]);
      expect(updated.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ── mergePlans ───────────────────────────────────────────────

  describe('mergePlans', () => {
    it('merges items from both plans', () => {
      const p1 = runtime.createPlan(PlanPeriod.Today, undefined, [{ title: 'A' }]);
      const p2 = runtime.createPlan(PlanPeriod.Today, undefined, [{ title: 'B' }]);
      const merged = runtime.mergePlans(p1.id, p2.id);
      expect(merged.items).toHaveLength(2);
      expect(merged.items[0].title).toBe('A');
      expect(merged.items[1].title).toBe('B');
    });

    it('deletes the second plan', () => {
      const p1 = runtime.createPlan(PlanPeriod.Today, undefined, [{ title: 'A' }]);
      const p2 = runtime.createPlan(PlanPeriod.Today, undefined, [{ title: 'B' }]);
      runtime.mergePlans(p1.id, p2.id);
      expect(() => runtime.getPlan(p2.id)).toThrow(PlanValidationError);
    });

    it('reorders merged items', () => {
      const p1 = runtime.createPlan(PlanPeriod.Today, undefined, [{ title: 'A' }]);
      const p2 = runtime.createPlan(PlanPeriod.Today, undefined, [{ title: 'B' }]);
      const merged = runtime.mergePlans(p1.id, p2.id);
      expect(merged.items[0].order).toBe(0);
      expect(merged.items[1].order).toBe(1);
    });

    it('throws when first plan not found', () => {
      const p2 = runtime.createPlan(PlanPeriod.Today);
      expect(() => runtime.mergePlans('nope', p2.id)).toThrow(PlanValidationError);
    });

    it('throws when second plan not found', () => {
      const p1 = runtime.createPlan(PlanPeriod.Today);
      expect(() => runtime.mergePlans(p1.id, 'nope')).toThrow(PlanValidationError);
    });

    it('keeps first plan metadata', () => {
      const p1 = runtime.createPlan(PlanPeriod.Week, 'g-1', [{ title: 'A' }]);
      const p2 = runtime.createPlan(PlanPeriod.Today, 'g-2', [{ title: 'B' }]);
      const merged = runtime.mergePlans(p1.id, p2.id);
      expect(merged.period).toBe(PlanPeriod.Week);
      expect(merged.goalId).toBe('g-1');
    });
  });

  // ── splitPlan ────────────────────────────────────────────────

  describe('splitPlan', () => {
    it('splits items into two plans', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [
        { title: 'A' },
        { title: 'B' },
        { title: 'C' },
      ]);
      const [a] = plan.items;
      const result = runtime.splitPlan(plan.id, [a.id]);
      expect(result.original.items).toHaveLength(2);
      expect(result.split.items).toHaveLength(1);
      expect(result.split.items[0].title).toBe('A');
    });

    it('split plan gets a new id', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [{ title: 'A' }]);
      const result = runtime.splitPlan(plan.id, [plan.items[0].id]);
      expect(result.split.id).not.toBe(plan.id);
    });

    it('split plan inherits period and goalId', () => {
      const plan = runtime.createPlan(PlanPeriod.Week, 'g-1', [{ title: 'A' }, { title: 'B' }]);
      const result = runtime.splitPlan(plan.id, [plan.items[0].id]);
      expect(result.split.period).toBe(PlanPeriod.Week);
      expect(result.split.goalId).toBe('g-1');
    });

    it('throws when no matching items', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [{ title: 'A' }]);
      expect(() => runtime.splitPlan(plan.id, ['bogus'])).toThrow(PlanValidationError);
    });

    it('throws for non-existent plan', () => {
      expect(() => runtime.splitPlan('nope', ['x'])).toThrow(PlanValidationError);
    });

    it('reorders items in both plans', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [
        { title: 'A' },
        { title: 'B' },
        { title: 'C' },
      ]);
      const a = plan.items[0];
      const c = plan.items[2];
      const result = runtime.splitPlan(plan.id, [c.id, a.id]);
      // Split items maintain original order from the plan, then re-indexed
      expect(result.split.items).toHaveLength(2);
      expect(result.split.items[0].id).toBe(a.id);
      expect(result.split.items[0].order).toBe(0);
      expect(result.split.items[1].id).toBe(c.id);
      expect(result.split.items[1].order).toBe(1);
      expect(result.original.items).toHaveLength(1);
      expect(result.original.items[0].title).toBe('B');
    });
  });

  // ── optimizePlan ─────────────────────────────────────────────

  describe('optimizePlan', () => {
    it('sorts items by priority descending', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [
        { title: 'Low', priority: 2 },
        { title: 'High', priority: 10 },
        { title: 'Mid', priority: 5 },
      ]);
      const optimized = runtime.optimizePlan(plan.id);
      expect(optimized.items[0].title).toBe('High');
      expect(optimized.items[1].title).toBe('Mid');
      expect(optimized.items[2].title).toBe('Low');
    });

    it('updates order values after optimization', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [
        { title: 'A', priority: 1 },
        { title: 'B', priority: 10 },
      ]);
      const optimized = runtime.optimizePlan(plan.id);
      expect(optimized.items[0].order).toBe(0);
      expect(optimized.items[1].order).toBe(1);
    });

    it('throws for non-existent plan', () => {
      expect(() => runtime.optimizePlan('nope')).toThrow(PlanValidationError);
    });

    it('updates updatedAt', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [{ title: 'A' }]);
      const optimized = runtime.optimizePlan(plan.id);
      expect(optimized.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('preserves item count', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [
        { title: 'A' },
        { title: 'B' },
        { title: 'C' },
      ]);
      const optimized = runtime.optimizePlan(plan.id);
      expect(optimized.items).toHaveLength(3);
    });
  });

  // ── rePlan ────────────────────────────────────────────────────

  describe('rePlan', () => {
    it('filters by priorityThreshold', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [
        { title: 'Low', priority: 2 },
        { title: 'High', priority: 8 },
      ]);
      const replanned = runtime.rePlan(plan.id, { priorityThreshold: 5 });
      expect(replanned.items).toHaveLength(1);
      expect(replanned.items[0].title).toBe('High');
    });

    it('filters by maxMinutes', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [
        { title: 'Big', priority: 10, estimatedMinutes: 120 },
        { title: 'Small', priority: 5, estimatedMinutes: 30 },
      ]);
      const replanned = runtime.rePlan(plan.id, { maxMinutes: 60 });
      expect(replanned.items).toHaveLength(1);
      expect(replanned.items[0].title).toBe('Small');
    });

    it('filters by maxItems', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [
        { title: 'A' },
        { title: 'B' },
        { title: 'C' },
      ]);
      const replanned = runtime.rePlan(plan.id, { maxItems: 2 });
      expect(replanned.items).toHaveLength(2);
    });

    it('sorts by priority descending after filtering', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [
        { title: 'C', priority: 3 },
        { title: 'A', priority: 10 },
        { title: 'B', priority: 7 },
      ]);
      const replanned = runtime.rePlan(plan.id, { maxItems: 2 });
      expect(replanned.items[0].title).toBe('A');
      expect(replanned.items[1].title).toBe('B');
    });

    it('throws for non-existent plan', () => {
      expect(() => runtime.rePlan('nope', {})).toThrow(PlanValidationError);
    });

    it('returns all items when no constraints', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [
        { title: 'A' },
        { title: 'B' },
      ]);
      const replanned = runtime.rePlan(plan.id, {});
      expect(replanned.items).toHaveLength(2);
    });

    it('updates order after replan', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [
        { title: 'C', priority: 3 },
        { title: 'A', priority: 10 },
      ]);
      const replanned = runtime.rePlan(plan.id, {});
      expect(replanned.items[0].order).toBe(0);
      expect(replanned.items[1].order).toBe(1);
    });

    it('updates updatedAt', () => {
      const plan = runtime.createPlan(PlanPeriod.Today, undefined, [{ title: 'A' }]);
      const replanned = runtime.rePlan(plan.id, {});
      expect(replanned.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ── Queries ───────────────────────────────────────────────────

  describe('queries', () => {
    it('getPlan returns the plan', () => {
      const plan = runtime.createPlan(PlanPeriod.Today);
      expect(runtime.getPlan(plan.id).id).toBe(plan.id);
    });

    it('getPlan throws for non-existent plan', () => {
      expect(() => runtime.getPlan('nope')).toThrow(PlanValidationError);
    });

    it('getPlansByPeriod returns matching plans', () => {
      runtime.createPlan(PlanPeriod.Today);
      runtime.createPlan(PlanPeriod.Week);
      expect(runtime.getPlansByPeriod(PlanPeriod.Today)).toHaveLength(1);
      expect(runtime.getPlansByPeriod(PlanPeriod.Week)).toHaveLength(1);
    });

    it('getAllPlans returns all plans', () => {
      runtime.createPlan(PlanPeriod.Today);
      runtime.createPlan(PlanPeriod.Week);
      expect(runtime.getAllPlans()).toHaveLength(2);
    });

    it('getAllPlans returns frozen array', () => {
      runtime.createPlan(PlanPeriod.Today);
      expect(Object.isFrozen(runtime.getAllPlans())).toBe(true);
    });

    it('getPlansByPeriod returns frozen array', () => {
      runtime.createPlan(PlanPeriod.Today);
      expect(Object.isFrozen(runtime.getPlansByPeriod(PlanPeriod.Today))).toBe(true);
    });

    it('deletePlan removes the plan', () => {
      const plan = runtime.createPlan(PlanPeriod.Today);
      runtime.deletePlan(plan.id);
      expect(() => runtime.getPlan(plan.id)).toThrow(PlanValidationError);
    });

    it('deletePlan throws for non-existent plan', () => {
      expect(() => runtime.deletePlan('nope')).toThrow(PlanValidationError);
    });

    it('getAllPlans returns empty for new runtime', () => {
      expect(runtime.getAllPlans()).toEqual([]);
    });
  });
});
