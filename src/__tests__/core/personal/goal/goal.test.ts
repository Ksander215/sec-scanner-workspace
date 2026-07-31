import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PersonalRuntimeContracts } from '../../../../core/personal/contracts.js';
import { GoalRuntime } from '../../../../core/personal/goal-runtime.js';
import { GoalStatus, GoalLevel } from '../../../../core/personal/types.js';
import { GoalNotFoundError, GoalValidationError, GoalHierarchyError } from '../../../../core/personal/errors.js';

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

describe('GoalRuntime', () => {
  let contracts: PersonalRuntimeContracts;
  let runtime: GoalRuntime;

  beforeEach(() => {
    contracts = createMockContracts();
    runtime = new GoalRuntime(contracts);
  });

  // ── createGoal ────────────────────────────────────────────────

  describe('createGoal', () => {
    it('creates a goal with required fields', () => {
      const goal = runtime.createGoal({ title: 'Learn TS', level: GoalLevel.Goal });
      expect(goal.id).toBeDefined();
      expect(goal.title).toBe('Learn TS');
      expect(goal.level).toBe(GoalLevel.Goal);
    });

    it('assigns Draft status on creation', () => {
      const goal = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(goal.status).toBe(GoalStatus.Draft);
    });

    it('sets progress to 0', () => {
      const goal = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(goal.progress).toBe(0);
    });

    it('sets completedAt to null', () => {
      const goal = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(goal.completedAt).toBeNull();
    });

    it('sets parentId to null by default', () => {
      const goal = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(goal.parentId).toBeNull();
    });

    it('sets childrenIds to empty array', () => {
      const goal = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(goal.childrenIds).toEqual([]);
    });

    it('defaults description to empty string', () => {
      const goal = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(goal.description).toBe('');
    });

    it('defaults priority to 0', () => {
      const goal = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(goal.priority).toBe(0);
    });

    it('defaults tags to empty array', () => {
      const goal = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(goal.tags).toEqual([]);
    });

    it('defaults metadata to empty object', () => {
      const goal = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(goal.metadata).toEqual({});
    });

    it('defaults deadline to null', () => {
      const goal = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(goal.deadline).toBeNull();
    });

    it('sets createdAt to ISO timestamp', () => {
      const goal = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(goal.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('sets updatedAt equal to createdAt', () => {
      const goal = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(goal.updatedAt).toBe(goal.createdAt);
    });

    it('accepts optional description', () => {
      const goal = runtime.createGoal({ title: 'X', level: GoalLevel.Goal, description: 'desc' });
      expect(goal.description).toBe('desc');
    });

    it('accepts optional priority', () => {
      const goal = runtime.createGoal({ title: 'X', level: GoalLevel.Goal, priority: 7 });
      expect(goal.priority).toBe(7);
    });

    it('accepts optional deadline', () => {
      const goal = runtime.createGoal({ title: 'X', level: GoalLevel.Goal, deadline: '2030-01-01' });
      expect(goal.deadline).toBe('2030-01-01');
    });

    it('accepts optional tags', () => {
      const goal = runtime.createGoal({ title: 'X', level: GoalLevel.Goal, tags: ['a', 'b'] });
      expect(goal.tags).toEqual(['a', 'b']);
    });

    it('accepts optional metadata', () => {
      const goal = runtime.createGoal({ title: 'X', level: GoalLevel.Goal, metadata: { k: 'v' } });
      expect(goal.metadata).toEqual({ k: 'v' });
    });

    it('trims title whitespace', () => {
      const goal = runtime.createGoal({ title: '  Hello  ', level: GoalLevel.Goal });
      expect(goal.title).toBe('Hello');
    });

    it('throws on empty title', () => {
      expect(() => runtime.createGoal({ title: '', level: GoalLevel.Goal })).toThrow(GoalValidationError);
    });

    it('throws on whitespace-only title', () => {
      expect(() => runtime.createGoal({ title: '   ', level: GoalLevel.Goal })).toThrow(GoalValidationError);
    });

    it('throws GoalNotFoundError for non-existent parent', () => {
      expect(() => runtime.createGoal({ title: 'X', level: GoalLevel.Goal, parentId: 'nope' })).toThrow(GoalNotFoundError);
    });

    it('publishes GoalCreated event', () => {
      runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith(
        'GoalCreated',
        expect.objectContaining({ eventType: 'GoalCreated' }),
      );
    });

    it('freezes the goal object', () => {
      const goal = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(Object.isFrozen(goal)).toBe(true);
    });
  });

  // ── Parent-child hierarchy ────────────────────────────────────

  describe('parent-child hierarchy', () => {
    it('adds child to parent childrenIds', () => {
      const parent = runtime.createGoal({ title: 'Parent', level: GoalLevel.Vision });
      const child = runtime.createGoal({ title: 'Child', level: GoalLevel.Strategy, parentId: parent.id });
      expect(runtime.getGoal(parent.id).childrenIds).toContain(child.id);
    });

    it('child has correct parentId', () => {
      const parent = runtime.createGoal({ title: 'P', level: GoalLevel.Vision });
      const child = runtime.createGoal({ title: 'C', level: GoalLevel.Strategy, parentId: parent.id });
      expect(child.parentId).toBe(parent.id);
    });

    it('supports multiple children', () => {
      const parent = runtime.createGoal({ title: 'P', level: GoalLevel.Vision });
      runtime.createGoal({ title: 'C1', level: GoalLevel.Strategy, parentId: parent.id });
      runtime.createGoal({ title: 'C2', level: GoalLevel.Strategy, parentId: parent.id });
      expect(runtime.getGoal(parent.id).childrenIds).toHaveLength(2);
    });

    it('detects hierarchy cycles and throws', () => {
      const a = runtime.createGoal({ title: 'A', level: GoalLevel.Vision });
      const b = runtime.createGoal({ title: 'B', level: GoalLevel.Strategy, parentId: a.id });
      expect(() => runtime.updateGoal(a.id, { parentId: b.id })).toThrow(GoalHierarchyError);
    });

    it('does not allow self as parent', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Vision });
      // We can't use createGoal with self as parent because it checks hierarchy
      // But updateGoal should detect cycle too
      expect(() => runtime.updateGoal(g.id, { parentId: g.id })).toThrow(GoalHierarchyError);
    });
  });

  // ── Status transitions ────────────────────────────────────────

  describe('status transitions', () => {
    it('activateGoal transitions Draft to Active', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      const activated = runtime.activateGoal(g.id);
      expect(activated.status).toBe(GoalStatus.Active);
    });

    it('pauseGoal transitions Active to Paused', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      const paused = runtime.pauseGoal(g.id);
      expect(paused.status).toBe(GoalStatus.Paused);
    });

    it('resumeGoal transitions Paused to Active', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      runtime.pauseGoal(g.id);
      const resumed = runtime.resumeGoal(g.id);
      expect(resumed.status).toBe(GoalStatus.Active);
    });

    it('completeGoal transitions Active to Completed', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      const completed = runtime.completeGoal(g.id);
      expect(completed.status).toBe(GoalStatus.Completed);
    });

    it('completeGoal sets progress to 100', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      const completed = runtime.completeGoal(g.id);
      expect(completed.progress).toBe(100);
    });

    it('completeGoal sets completedAt timestamp', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      const completed = runtime.completeGoal(g.id);
      expect(completed.completedAt).not.toBeNull();
      expect(completed.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('archiveGoal transitions Active to Archived', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      const archived = runtime.archiveGoal(g.id);
      expect(archived.status).toBe(GoalStatus.Archived);
    });

    it('archiveGoal transitions Completed to Archived', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      runtime.completeGoal(g.id);
      const archived = runtime.archiveGoal(g.id);
      expect(archived.status).toBe(GoalStatus.Archived);
    });

    it('cancelGoal transitions Active to Cancelled', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      const cancelled = runtime.cancelGoal(g.id);
      expect(cancelled.status).toBe(GoalStatus.Cancelled);
    });

    it('cancelGoal transitions Draft to Cancelled', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      const cancelled = runtime.cancelGoal(g.id);
      expect(cancelled.status).toBe(GoalStatus.Cancelled);
    });

    it('reactivateGoal transitions Archived to Active', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      runtime.archiveGoal(g.id);
      const reactivated = runtime.activateGoal(g.id);
      expect(reactivated.status).toBe(GoalStatus.Active);
    });

    it('throws on invalid transition Draft -> Completed', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(() => runtime.completeGoal(g.id)).toThrow(GoalValidationError);
    });

    it('throws on invalid transition Draft -> Archived', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(() => runtime.archiveGoal(g.id)).toThrow(GoalValidationError);
    });

    it('throws on invalid transition Draft -> Paused', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(() => runtime.pauseGoal(g.id)).toThrow(GoalValidationError);
    });

    it('throws GoalNotFoundError for non-existent goal activation', () => {
      expect(() => runtime.activateGoal('nope')).toThrow(GoalNotFoundError);
    });

    it('throws GoalNotFoundError for non-existent goal pause', () => {
      expect(() => runtime.pauseGoal('nope')).toThrow(GoalNotFoundError);
    });

    it('throws GoalNotFoundError for non-existent goal complete', () => {
      expect(() => runtime.completeGoal('nope')).toThrow(GoalNotFoundError);
    });

    it('publishes GoalStatusChanged event on transition', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith(
        'GoalStatusChanged',
        expect.objectContaining({ eventType: 'GoalStatusChanged' }),
      );
    });

    it('publishes GoalCompleted event on completion', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      runtime.completeGoal(g.id);
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith(
        'GoalCompleted',
        expect.objectContaining({ eventType: 'GoalCompleted' }),
      );
    });

    it('publishes GoalArchived event on archive', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      runtime.archiveGoal(g.id);
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith(
        'GoalArchived',
        expect.objectContaining({ eventType: 'GoalArchived' }),
      );
    });
  });

  // ── Parent progress propagation ───────────────────────────────

  describe('parent progress propagation', () => {
    it('updates parent progress when a child is completed', () => {
      const parent = runtime.createGoal({ title: 'P', level: GoalLevel.Vision });
      runtime.activateGoal(parent.id);
      const c1 = runtime.createGoal({ title: 'C1', level: GoalLevel.Strategy, parentId: parent.id });
      runtime.activateGoal(c1.id);
      const c2 = runtime.createGoal({ title: 'C2', level: GoalLevel.Strategy, parentId: parent.id });
      runtime.activateGoal(c2.id);
      runtime.completeGoal(c1.id);
      expect(runtime.getGoal(parent.id).progress).toBe(50);
    });

    it('sets parent to 100 when all children completed', () => {
      const parent = runtime.createGoal({ title: 'P', level: GoalLevel.Vision });
      runtime.activateGoal(parent.id);
      const c1 = runtime.createGoal({ title: 'C1', level: GoalLevel.Strategy, parentId: parent.id });
      runtime.activateGoal(c1.id);
      const c2 = runtime.createGoal({ title: 'C2', level: GoalLevel.Strategy, parentId: parent.id });
      runtime.activateGoal(c2.id);
      runtime.completeGoal(c1.id);
      runtime.completeGoal(c2.id);
      expect(runtime.getGoal(parent.id).progress).toBe(100);
    });

    it('propagates progress up multiple levels', () => {
      const vision = runtime.createGoal({ title: 'V', level: GoalLevel.Vision });
      runtime.activateGoal(vision.id);
      const strategy = runtime.createGoal({ title: 'S', level: GoalLevel.Strategy, parentId: vision.id });
      runtime.activateGoal(strategy.id);
      const task = runtime.createGoal({ title: 'T', level: GoalLevel.Goal, parentId: strategy.id });
      runtime.activateGoal(task.id);
      runtime.completeGoal(task.id);
      expect(runtime.getGoal(strategy.id).progress).toBe(100);
      expect(runtime.getGoal(vision.id).progress).toBe(100);
    });

    it('does not crash when completing root goal', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      runtime.completeGoal(g.id);
      expect(runtime.getGoal(g.id).progress).toBe(100);
    });

    it('averages child progress correctly', () => {
      const parent = runtime.createGoal({ title: 'P', level: GoalLevel.Vision });
      runtime.activateGoal(parent.id);
      const c1 = runtime.createGoal({ title: 'C1', level: GoalLevel.Strategy, parentId: parent.id });
      runtime.activateGoal(c1.id);
      const c2 = runtime.createGoal({ title: 'C2', level: GoalLevel.Strategy, parentId: parent.id });
      runtime.activateGoal(c2.id);
      const c3 = runtime.createGoal({ title: 'C3', level: GoalLevel.Strategy, parentId: parent.id });
      runtime.activateGoal(c3.id);
      runtime.completeGoal(c1.id);
      // (100 + 0 + 0) / 3 = 33.33... => Math.round => 33
      expect(runtime.getGoal(parent.id).progress).toBe(33);
    });
  });

  // ── updateGoal ────────────────────────────────────────────────

  describe('updateGoal', () => {
    it('updates title', () => {
      const g = runtime.createGoal({ title: 'Old', level: GoalLevel.Goal });
      const updated = runtime.updateGoal(g.id, { title: 'New' });
      expect(updated.title).toBe('New');
    });

    it('updates description', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      const updated = runtime.updateGoal(g.id, { description: 'new desc' });
      expect(updated.description).toBe('new desc');
    });

    it('updates level', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      const updated = runtime.updateGoal(g.id, { level: GoalLevel.Objective });
      expect(updated.level).toBe(GoalLevel.Objective);
    });

    it('updates priority', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      const updated = runtime.updateGoal(g.id, { priority: 8 });
      expect(updated.priority).toBe(8);
    });

    it('updates deadline', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      const updated = runtime.updateGoal(g.id, { deadline: '2030-12-31' });
      expect(updated.deadline).toBe('2030-12-31');
    });

    it('clears deadline when set to null', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal, deadline: '2030-01-01' });
      const updated = runtime.updateGoal(g.id, { deadline: null });
      expect(updated.deadline).toBeNull();
    });

    it('updates tags', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      const updated = runtime.updateGoal(g.id, { tags: ['a', 'b'] });
      expect(updated.tags).toEqual(['a', 'b']);
    });

    it('updates metadata', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      const updated = runtime.updateGoal(g.id, { metadata: { x: 1 } });
      expect(updated.metadata).toEqual({ x: 1 });
    });

    it('updates updatedAt on change', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      const updated = runtime.updateGoal(g.id, { title: 'Y' });
      expect(updated.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('throws GoalNotFoundError for non-existent goal', () => {
      expect(() => runtime.updateGoal('nope', { title: 'Y' })).toThrow(GoalNotFoundError);
    });

    it('throws on empty title update', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(() => runtime.updateGoal(g.id, { title: '' })).toThrow(GoalValidationError);
    });

    it('trims updated title', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      const updated = runtime.updateGoal(g.id, { title: '  Y  ' });
      expect(updated.title).toBe('Y');
    });

    it('publishes GoalUpdated event when title changes', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.updateGoal(g.id, { title: 'Y' });
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith(
        'GoalUpdated',
        expect.objectContaining({ eventType: 'GoalUpdated' }),
      );
    });

    it('allows changing parentId to null (removing parent)', () => {
      const parent = runtime.createGoal({ title: 'P', level: GoalLevel.Vision });
      const child = runtime.createGoal({ title: 'C', level: GoalLevel.Strategy, parentId: parent.id });
      const updated = runtime.updateGoal(child.id, { parentId: null });
      expect(updated.parentId).toBeNull();
      expect(runtime.getGoal(parent.id).childrenIds).not.toContain(child.id);
    });

    it('throws GoalNotFoundError when setting parentId to non-existent goal', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(() => runtime.updateGoal(g.id, { parentId: 'non-existent' })).toThrow(GoalNotFoundError);
    });

    it('reverts to old parent when new parent not found', () => {
      const p1 = runtime.createGoal({ title: 'P1', level: GoalLevel.Vision });
      const child = runtime.createGoal({ title: 'C', level: GoalLevel.Strategy, parentId: p1.id });
      try { runtime.updateGoal(child.id, { parentId: 'non-existent' }); } catch {}
      expect(runtime.getGoal(p1.id).childrenIds).toContain(child.id);
    });

    it('throws when level change makes child level invalid', () => {
      const parent = runtime.createGoal({ title: 'P', level: GoalLevel.Vision });
      runtime.createGoal({ title: 'C', level: GoalLevel.Strategy, parentId: parent.id });
      expect(() => runtime.updateGoal(parent.id, { level: GoalLevel.Goal })).toThrow(GoalValidationError);
    });

    it('throws when level change makes parent level invalid', () => {
      const parent = runtime.createGoal({ title: 'P', level: GoalLevel.Vision });
      const child = runtime.createGoal({ title: 'C', level: GoalLevel.Strategy, parentId: parent.id });
      expect(() => runtime.updateGoal(child.id, { level: GoalLevel.Vision })).toThrow(GoalValidationError);
    });

    it('can reparent a goal', () => {
      const p1 = runtime.createGoal({ title: 'P1', level: GoalLevel.Vision });
      const p2 = runtime.createGoal({ title: 'P2', level: GoalLevel.Vision });
      const child = runtime.createGoal({ title: 'C', level: GoalLevel.Strategy, parentId: p1.id });
      const updated = runtime.updateGoal(child.id, { parentId: p2.id });
      expect(updated.parentId).toBe(p2.id);
      expect(runtime.getGoal(p1.id).childrenIds).not.toContain(child.id);
      expect(runtime.getGoal(p2.id).childrenIds).toContain(child.id);
    });
  });

  // ── Queries ───────────────────────────────────────────────────

  describe('queries', () => {
    it('getGoal returns the goal by id', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(runtime.getGoal(g.id).title).toBe('X');
    });

    it('getGoal throws GoalNotFoundError for missing id', () => {
      expect(() => runtime.getGoal('nope')).toThrow(GoalNotFoundError);
    });

    it('getGoalsByStatus returns matching goals', () => {
      const g1 = runtime.createGoal({ title: 'A', level: GoalLevel.Goal });
      runtime.activateGoal(g1.id);
      runtime.createGoal({ title: 'B', level: GoalLevel.Goal });
      expect(runtime.getGoalsByStatus(GoalStatus.Active)).toHaveLength(1);
      expect(runtime.getGoalsByStatus(GoalStatus.Draft)).toHaveLength(1);
    });

    it('getGoalsByLevel returns matching goals', () => {
      runtime.createGoal({ title: 'V', level: GoalLevel.Vision });
      runtime.createGoal({ title: 'G', level: GoalLevel.Goal });
      expect(runtime.getGoalsByLevel(GoalLevel.Vision)).toHaveLength(1);
      expect(runtime.getGoalsByLevel(GoalLevel.Goal)).toHaveLength(1);
    });

    it('getChildren returns child goals', () => {
      const parent = runtime.createGoal({ title: 'P', level: GoalLevel.Vision });
      runtime.createGoal({ title: 'C1', level: GoalLevel.Strategy, parentId: parent.id });
      runtime.createGoal({ title: 'C2', level: GoalLevel.Strategy, parentId: parent.id });
      expect(runtime.getChildren(parent.id)).toHaveLength(2);
    });

    it('getChildren throws for non-existent parent', () => {
      expect(() => runtime.getChildren('nope')).toThrow(GoalNotFoundError);
    });

    it('getChildren returns empty for parent with no children', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Vision });
      expect(runtime.getChildren(g.id)).toHaveLength(0);
    });

    it('getRootGoals returns goals with null parentId', () => {
      const parent = runtime.createGoal({ title: 'P', level: GoalLevel.Vision });
      runtime.createGoal({ title: 'C', level: GoalLevel.Strategy, parentId: parent.id });
      expect(runtime.getRootGoals()).toHaveLength(1);
    });

    it('getPath returns path from goal to root', () => {
      const vision = runtime.createGoal({ title: 'V', level: GoalLevel.Vision });
      const strategy = runtime.createGoal({ title: 'S', level: GoalLevel.Strategy, parentId: vision.id });
      const goal = runtime.createGoal({ title: 'G', level: GoalLevel.Goal, parentId: strategy.id });
      const path = runtime.getPath(goal.id);
      expect(path).toHaveLength(3);
      expect(path[0].id).toBe(vision.id);
      expect(path[2].id).toBe(goal.id);
    });

    it('getPath returns single-element path for root goal', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Vision });
      expect(runtime.getPath(g.id)).toHaveLength(1);
    });

    it('getPath for non-existent goal returns empty', () => {
      expect(runtime.getPath('nope')).toHaveLength(0);
    });

    it('getActiveGoals returns only active goals', () => {
      const g1 = runtime.createGoal({ title: 'A', level: GoalLevel.Goal });
      runtime.activateGoal(g1.id);
      runtime.createGoal({ title: 'B', level: GoalLevel.Goal });
      expect(runtime.getActiveGoals()).toHaveLength(1);
    });

    it('getAllGoals returns all goals', () => {
      runtime.createGoal({ title: 'A', level: GoalLevel.Goal });
      runtime.createGoal({ title: 'B', level: GoalLevel.Goal });
      expect(runtime.getAllGoals()).toHaveLength(2);
    });

    it('getGoalCount returns the count', () => {
      runtime.createGoal({ title: 'A', level: GoalLevel.Goal });
      runtime.createGoal({ title: 'B', level: GoalLevel.Goal });
      expect(runtime.getGoalCount()).toBe(2);
    });

    it('getGoalRefs returns refs for active goals only', () => {
      const g1 = runtime.createGoal({ title: 'A', level: GoalLevel.Goal });
      runtime.activateGoal(g1.id);
      runtime.createGoal({ title: 'B', level: GoalLevel.Goal });
      const refs = runtime.getGoalRefs();
      expect(refs).toHaveLength(1);
      expect(refs[0].id).toBe(g1.id);
      expect(refs[0].title).toBe('A');
      expect(refs[0].status).toBe(GoalStatus.Active);
      expect(refs[0].progress).toBe(0);
      expect(refs[0].deadline).toBeNull();
    });

    it('getGoalsByStatus returns frozen array', () => {
      runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(Object.isFrozen(runtime.getGoalsByStatus(GoalStatus.Draft))).toBe(true);
    });

    it('getAllGoals returns frozen array', () => {
      runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(Object.isFrozen(runtime.getAllGoals())).toBe(true);
    });

    it('getGoalRefs returns frozen array', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      expect(Object.isFrozen(runtime.getGoalRefs())).toBe(true);
    });
  });

  // ── Max goals limit ───────────────────────────────────────────

  describe('max goals limit', () => {
    it('throws when max goals exceeded', () => {
      const limited = new GoalRuntime(contracts, 2);
      limited.createGoal({ title: 'A', level: GoalLevel.Goal });
      limited.createGoal({ title: 'B', level: GoalLevel.Goal });
      expect(() => limited.createGoal({ title: 'C', level: GoalLevel.Goal })).toThrow(GoalValidationError);
    });

    it('allows exactly maxGoals goals', () => {
      const limited = new GoalRuntime(contracts, 2);
      limited.createGoal({ title: 'A', level: GoalLevel.Goal });
      limited.createGoal({ title: 'B', level: GoalLevel.Goal });
      expect(limited.getGoalCount()).toBe(2);
    });

    it('respects default maxGoals of 1000', () => {
      const rt = new GoalRuntime(contracts);
      for (let i = 0; i < 1000; i++) {
        rt.createGoal({ title: `G${i}`, level: GoalLevel.Goal });
      }
      expect(rt.getGoalCount()).toBe(1000);
    });
  });

  // ── Edge cases ────────────────────────────────────────────────

  describe('edge cases', () => {
    it('createGoal generates unique ids', () => {
      const g1 = runtime.createGoal({ title: 'A', level: GoalLevel.Goal });
      const g2 = runtime.createGoal({ title: 'B', level: GoalLevel.Goal });
      expect(g1.id).not.toBe(g2.id);
    });

    it('cancelGoal does not set progress to 100', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      const cancelled = runtime.cancelGoal(g.id);
      expect(cancelled.progress).toBe(0);
    });

    it('archiveGoal does not set progress to 100', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      const archived = runtime.archiveGoal(g.id);
      expect(archived.progress).toBe(0);
    });

    it('freeze prevents mutation of returned goals', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(() => { (g as any).title = 'Y'; }).toThrow();
    });

    it('completeGoal preserves completedAt when archived', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      const completed = runtime.completeGoal(g.id);
      const archived = runtime.archiveGoal(g.id);
      expect(archived.completedAt).toBe(completed.completedAt);
    });

    it('resumeGoal from Paused returns to Active with same progress', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      runtime.pauseGoal(g.id);
      const resumed = runtime.resumeGoal(g.id);
      expect(resumed.status).toBe(GoalStatus.Active);
      expect(resumed.progress).toBe(0);
    });

    it('cannot complete a Draft goal directly', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(() => runtime.completeGoal(g.id)).toThrow(GoalValidationError);
    });

    it('cannot complete a Paused goal', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      runtime.pauseGoal(g.id);
      expect(() => runtime.completeGoal(g.id)).toThrow(GoalValidationError);
    });

    it('cannot complete a Completed goal again', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      runtime.completeGoal(g.id);
      expect(() => runtime.completeGoal(g.id)).toThrow(GoalValidationError);
    });

    it('cannot cancel an Archived goal', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      runtime.archiveGoal(g.id);
      expect(() => runtime.cancelGoal(g.id)).toThrow(GoalValidationError);
    });

    it('cannot pause a Completed goal', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      runtime.completeGoal(g.id);
      expect(() => runtime.pauseGoal(g.id)).toThrow(GoalValidationError);
    });

    it('cannot pause a Draft goal', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      expect(() => runtime.pauseGoal(g.id)).toThrow(GoalValidationError);
    });

    it('cannot activate an already Active goal', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      expect(() => runtime.activateGoal(g.id)).toThrow(GoalValidationError);
    });

    it('cannot pause an Archived goal', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      runtime.activateGoal(g.id);
      runtime.archiveGoal(g.id);
      expect(() => runtime.pauseGoal(g.id)).toThrow(GoalValidationError);
    });

    it('updating a goal does not change its status', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      const updated = runtime.updateGoal(g.id, { title: 'Y' });
      expect(updated.status).toBe(GoalStatus.Draft);
    });

    it('updating a goal does not change its progress', () => {
      const g = runtime.createGoal({ title: 'X', level: GoalLevel.Goal });
      const updated = runtime.updateGoal(g.id, { priority: 5 });
      expect(updated.progress).toBe(0);
    });

    it('creates goals at all five levels', () => {
      const v = runtime.createGoal({ title: 'V', level: GoalLevel.Vision });
      const s = runtime.createGoal({ title: 'S', level: GoalLevel.Strategy });
      const g = runtime.createGoal({ title: 'G', level: GoalLevel.Goal });
      const o = runtime.createGoal({ title: 'O', level: GoalLevel.Objective });
      const t = runtime.createGoal({ title: 'T', level: GoalLevel.Task });
      expect(runtime.getGoalCount()).toBe(5);
      expect(runtime.getGoalsByLevel(GoalLevel.Vision)[0].id).toBe(v.id);
      expect(runtime.getGoalsByLevel(GoalLevel.Task)[0].id).toBe(t.id);
    });

    it('getGoalCount returns 0 for new runtime', () => {
      expect(runtime.getGoalCount()).toBe(0);
    });

    it('getAllGoals returns empty for new runtime', () => {
      expect(runtime.getAllGoals()).toEqual([]);
    });
  });
});
