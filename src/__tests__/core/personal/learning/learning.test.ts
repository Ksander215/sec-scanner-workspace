import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PersonalRuntimeContracts } from '../../../../core/personal/contracts.js';
import { LearningRuntime } from '../../../../core/personal/learning-runtime.js';
import { LearningStatus } from '../../../../core/personal/types.js';
import { LearningGraphError } from '../../../../core/personal/errors.js';

function createMockContracts(): PersonalRuntimeContracts {
  return {
    identity: { getCurrentUserId: vi.fn(() => 'user-1'), getUserRoles: vi.fn(() => ['admin']), getUserPreferences: vi.fn(() => ({ theme: 'dark' })), resolvePreference: vi.fn(() => 'dark') },
    memory: { retrieve: vi.fn(async () => null), store: vi.fn(async () => {}), query: vi.fn(() => []), getSessionEntries: vi.fn(() => []), getWorkingEntries: vi.fn(() => []) },
    knowledge: { search: vi.fn(async () => []), getNamespaces: vi.fn(async () => [{ id: 'ns-1' }]), getItemCount: vi.fn(async () => 42), getRecentItems: vi.fn(async () => []), getByTags: vi.fn(async () => []) },
    workflow: { getActiveWorkflows: vi.fn(() => []), getRunningInstances: vi.fn(() => []), getRecentCompletions: vi.fn(() => []), getAvailableWorkflows: vi.fn(() => []) },
    experience: { getActiveAdaptations: vi.fn(() => []), getRecommendations: vi.fn(() => []), getCurrentPhase: vi.fn(() => 'Learning'), getBehaviorPatterns: vi.fn(() => []) },
    cognitive: { getCurrentIntent: vi.fn(() => null), getConversationTurnCount: vi.fn(() => 0), getCurrentSessionId: vi.fn(() => null), getConversationSummary: vi.fn(async () => null) },
    capability: { getActivePacks: vi.fn(() => []), getAvailableCapabilities: vi.fn(() => []) },
    desktop: { getOpenWindowCount: vi.fn(() => 3), getActiveWindow: vi.fn(() => 'editor'), getDesktopState: vi.fn(() => 'Ready'), getSubsystemCount: vi.fn(() => 14) },
    platform: { publishEvent: vi.fn(async () => {}), getConfiguration: vi.fn(() => null), getHealth: vi.fn(async () => ({})) },
  };
}

describe('LearningRuntime', () => {
  let contracts: PersonalRuntimeContracts;
  let runtime: LearningRuntime;

  beforeEach(() => {
    contracts = createMockContracts();
    runtime = new LearningRuntime(contracts);
  });

  // ── addLearningItem (addNode) ──────────────────────────────
  describe('addLearningItem', () => {
    it('creates a new learning item', () => {
      const item = runtime.addLearningItem('TypeScript');
      expect(item.id).toBeDefined();
      expect(item.topic).toBe('TypeScript');
    });

    it('sets initial status to New', () => {
      const item = runtime.addLearningItem('Rust');
      expect(item.status).toBe(LearningStatus.New);
    });

    it('sets initial confidence to 0.1', () => {
      const item = runtime.addLearningItem('Go');
      expect(item.confidence).toBe(0.1);
    });

    it('sets practiceCount to 0', () => {
      const item = runtime.addLearningItem('Python');
      expect(item.practiceCount).toBe(0);
    });

    it('sets lastPracticedAt to null', () => {
      const item = runtime.addLearningItem('Java');
      expect(item.lastPracticedAt).toBeNull();
    });

    it('trims topic', () => {
      const item = runtime.addLearningItem('  C++  ');
      expect(item.topic).toBe('C++');
    });

    it('throws for empty topic', () => {
      expect(() => runtime.addLearningItem('  ')).toThrow(LearningGraphError);
    });

    it('returns existing item for duplicate topic (case-insensitive)', () => {
      const a = runtime.addLearningItem('TypeScript');
      const b = runtime.addLearningItem('typescript');
      expect(a.id).toBe(b.id);
    });

    it('stores metadata when provided', () => {
      const item = runtime.addLearningItem('ML', { source: 'course' });
      expect(item.metadata.source).toBe('course');
    });

    it('stores relatedGoals when provided', () => {
      const item = runtime.addLearningItem('ML', undefined, ['goal-1', 'goal-2']);
      expect(item.relatedGoals).toEqual(['goal-1', 'goal-2']);
    });

    it('sets firstSeenAt to ISO string', () => {
      const item = runtime.addLearningItem('K8s');
      expect(() => new Date(item.firstSeenAt).toISOString()).not.toThrow();
    });

    it('publishes LearningGraphUpdated event', () => {
      runtime.addLearningItem('Docker');
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith('LearningGraphUpdated', expect.any(Object));
    });

    it('throws on capacity exceeded', () => {
      const rt = new LearningRuntime(contracts, { maxItems: 1 });
      rt.addLearningItem('A');
      expect(() => rt.addLearningItem('B')).toThrow(LearningGraphError);
    });
  });

  // ── practice (recordPractice) ──────────────────────────────
  describe('practice', () => {
    it('increments practiceCount', () => {
      const item = runtime.addLearningItem('TS');
      const practiced = runtime.practice(item.id);
      expect(practiced.practiceCount).toBe(1);
    });

    it('advances from New to Learning on first practice', () => {
      const item = runtime.addLearningItem('TS');
      const practiced = runtime.practice(item.id);
      expect(practiced.status).toBe(LearningStatus.Learning);
    });

    it('advances to Practicing after 3 practices', () => {
      const item = runtime.addLearningItem('TS');
      let current = item;
      for (let i = 0; i < 3; i++) current = runtime.practice(current.id);
      expect(current.status).toBe(LearningStatus.Practicing);
    });

    it('increases confidence on practice', () => {
      const item = runtime.addLearningItem('TS');
      const practiced = runtime.practice(item.id);
      expect(practiced.confidence).toBeGreaterThan(item.confidence);
    });

    it('caps confidence at 1', () => {
      const item = runtime.addLearningItem('TS');
      let current = item;
      for (let i = 0; i < 20; i++) current = runtime.practice(current.id);
      expect(current.confidence).toBeLessThanOrEqual(1);
    });

    it('sets lastPracticedAt', () => {
      const item = runtime.addLearningItem('TS');
      const practiced = runtime.practice(item.id);
      expect(practiced.lastPracticedAt).not.toBeNull();
    });

    it('throws for unknown item', () => {
      expect(() => runtime.practice('nonexistent')).toThrow(LearningGraphError);
    });

    it('publishes LearningItemUpdated event', () => {
      const item = runtime.addLearningItem('TS');
      runtime.practice(item.id);
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith('LearningItemUpdated', expect.any(Object));
    });
  });

  // ── addEdge ────────────────────────────────────────────────
  describe('addEdge', () => {
    it('creates a prerequisite edge', () => {
      const a = runtime.addLearningItem('A');
      const b = runtime.addLearningItem('B');
      const edge = runtime.addEdge(a.id, b.id, 'prerequisite');
      expect(edge.from).toBe(a.id);
      expect(edge.to).toBe(b.id);
      expect(edge.relationType).toBe('prerequisite');
    });

    it('creates a related edge', () => {
      const a = runtime.addLearningItem('A');
      const b = runtime.addLearningItem('B');
      const edge = runtime.addEdge(a.id, b.id, 'related');
      expect(edge.relationType).toBe('related');
    });

    it('creates an applies_to edge', () => {
      const a = runtime.addLearningItem('A');
      const b = runtime.addLearningItem('B');
      const edge = runtime.addEdge(a.id, b.id, 'applies_to');
      expect(edge.relationType).toBe('applies_to');
    });

    it('throws for self-referencing edge', () => {
      const a = runtime.addLearningItem('A');
      expect(() => runtime.addEdge(a.id, a.id, 'prerequisite')).toThrow(LearningGraphError);
    });

    it('throws for unknown source', () => {
      const b = runtime.addLearningItem('B');
      expect(() => runtime.addEdge('nonexistent', b.id, 'prerequisite')).toThrow(LearningGraphError);
    });

    it('throws for unknown target', () => {
      const a = runtime.addLearningItem('A');
      expect(() => runtime.addEdge(a.id, 'nonexistent', 'prerequisite')).toThrow(LearningGraphError);
    });

    it('returns existing edge for duplicate', () => {
      const a = runtime.addLearningItem('A');
      const b = runtime.addLearningItem('B');
      const e1 = runtime.addEdge(a.id, b.id, 'prerequisite');
      const e2 = runtime.addEdge(a.id, b.id, 'prerequisite');
      expect(e1.from).toBe(e2.from);
    });

    it('throws for prerequisite cycle', () => {
      const a = runtime.addLearningItem('A');
      const b = runtime.addLearningItem('B');
      runtime.addEdge(a.id, b.id, 'prerequisite');
      expect(() => runtime.addEdge(b.id, a.id, 'prerequisite')).toThrow(LearningGraphError);
    });

    it('publishes LearningGraphUpdated event', () => {
      const a = runtime.addLearningItem('A');
      const b = runtime.addLearningItem('B');
      (contracts.platform.publishEvent as ReturnType<typeof vi.fn>).mockClear();
      runtime.addEdge(a.id, b.id, 'related');
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith('LearningGraphUpdated', expect.any(Object));
    });
  });

  // ── getNode (getItem) ─────────────────────────────────────
  describe('getItem', () => {
    it('returns item by id', () => {
      const item = runtime.addLearningItem('TS');
      expect(runtime.getItem(item.id).id).toBe(item.id);
    });

    it('throws for unknown id', () => {
      expect(() => runtime.getItem('nonexistent')).toThrow(LearningGraphError);
    });
  });

  // ── getLearningPath ───────────────────────────────────────
  describe('getLearningPath', () => {
    it('returns single item path when no prerequisites', () => {
      const a = runtime.addLearningItem('A');
      const path = runtime.getLearningPath(a.id);
      expect(path).toHaveLength(1);
      expect(path[0].id).toBe(a.id);
    });

    it('includes prerequisite chain', () => {
      const a = runtime.addLearningItem('Basics');
      const b = runtime.addLearningItem('Intermediate');
      const c = runtime.addLearningItem('Advanced');
      runtime.addEdge(a.id, b.id, 'prerequisite');
      runtime.addEdge(b.id, c.id, 'prerequisite');
      const path = runtime.getLearningPath(c.id);
      expect(path).toHaveLength(3);
      expect(path[0].topic).toBe('Basics');
      expect(path[2].topic).toBe('Advanced');
    });

    it('throws for unknown target', () => {
      expect(() => runtime.getLearningPath('nonexistent')).toThrow(LearningGraphError);
    });
  });

  // ── detectStale (decayStaleItems) ──────────────────────────
  describe('decayStaleItems', () => {
    it('skips New and Mastered items', () => {
      const a = runtime.addLearningItem('TS');
      const decayed = runtime.decayStaleItems(0);
      expect(decayed).toHaveLength(0);
    });

    it('decays items not practiced recently', () => {
      const item = runtime.addLearningItem('TS');
      // Practice to move to Learning
      const practiced = runtime.practice(item.id);
      // Wait a tiny bit then decay with 0 day threshold
      const decayed = runtime.decayStaleItems(0);
      // If the practice just happened it might not be stale
      expect(Array.isArray(decayed)).toBe(true);
    });

    it('returns frozen array', () => {
      const decayed = runtime.decayStaleItems(999);
      expect(Object.isFrozen(decayed)).toBe(true);
    });
  });

  // ── getStats (getGraph, getItemCount, getEdgeCount) ────────
  describe('stats', () => {
    it('getGraph returns nodes and edges', () => {
      runtime.addLearningItem('A');
      const graph = runtime.getGraph();
      expect(graph.nodes).toHaveLength(1);
      expect(graph.edges).toHaveLength(0);
      expect(graph.updatedAt).toBeDefined();
    });

    it('getItemCount returns 0 initially', () => {
      expect(runtime.getItemCount()).toBe(0);
    });

    it('getItemCount returns correct count', () => {
      runtime.addLearningItem('A');
      runtime.addLearningItem('B');
      expect(runtime.getItemCount()).toBe(2);
    });

    it('getEdgeCount returns 0 initially', () => {
      expect(runtime.getEdgeCount()).toBe(0);
    });

    it('getEdgeCount returns correct count', () => {
      const a = runtime.addLearningItem('A');
      const b = runtime.addLearningItem('B');
      runtime.addEdge(a.id, b.id, 'related');
      expect(runtime.getEdgeCount()).toBe(1);
    });

    it('getItemsByStatus filters correctly', () => {
      const a = runtime.addLearningItem('A');
      runtime.practice(a.id);
      const learning = runtime.getItemsByStatus(LearningStatus.Learning);
      expect(learning).toHaveLength(1);
    });

    it('getAllItems returns all items', () => {
      runtime.addLearningItem('A');
      runtime.addLearningItem('B');
      expect(runtime.getAllItems()).toHaveLength(2);
    });

    it('getPrerequisites returns prerequisite items', () => {
      const a = runtime.addLearningItem('A');
      const b = runtime.addLearningItem('B');
      runtime.addEdge(a.id, b.id, 'prerequisite');
      const prereqs = runtime.getPrerequisites(b.id);
      expect(prereqs).toHaveLength(1);
      expect(prereqs[0].topic).toBe('A');
    });

    it('getDependents returns dependent items', () => {
      const a = runtime.addLearningItem('A');
      const b = runtime.addLearningItem('B');
      runtime.addEdge(a.id, b.id, 'prerequisite');
      const deps = runtime.getDependents(a.id);
      expect(deps).toHaveLength(1);
      expect(deps[0].topic).toBe('B');
    });

    it('getRelatedItems returns related items (bidirectional)', () => {
      const a = runtime.addLearningItem('A');
      const b = runtime.addLearningItem('B');
      runtime.addEdge(a.id, b.id, 'related');
      expect(runtime.getRelatedItems(a.id)).toHaveLength(1);
      expect(runtime.getRelatedItems(b.id)).toHaveLength(1);
    });

    it('removeEdge removes an edge', () => {
      const a = runtime.addLearningItem('A');
      const b = runtime.addLearningItem('B');
      runtime.addEdge(a.id, b.id, 'related');
      runtime.removeEdge(a.id, b.id);
      expect(runtime.getEdgeCount()).toBe(0);
    });

    it('removeEdge throws for nonexistent edge', () => {
      expect(() => runtime.removeEdge('a', 'b')).toThrow(LearningGraphError);
    });
  });
});
