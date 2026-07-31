import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PersonalRuntimeContracts } from '../../../../core/personal/contracts.js';
import { PredictionRuntime } from '../../../../core/personal/prediction-runtime.js';
import { PredictionType } from '../../../../core/personal/types.js';
import { PredictionError } from '../../../../core/personal/errors.js';

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

describe('PredictionRuntime', () => {
  let contracts: PersonalRuntimeContracts;
  let runtime: PredictionRuntime;

  beforeEach(() => {
    contracts = createMockContracts();
    runtime = new PredictionRuntime(contracts);
  });

  // ── predictNextAction ───────────────────────────────────────
  describe('predictNextAction', () => {
    it('returns a prediction with NextAction type', () => {
      const p = runtime.predictNextAction({ activities: ['code', 'review'], timeOfDay: 'morning' });
      expect(p.type).toBe(PredictionType.NextAction);
    });

    it('returns a prediction with a string value', () => {
      const p = runtime.predictNextAction({ activities: ['code'], timeOfDay: 'morning' });
      expect(typeof p.value).toBe('string');
      expect(p.value.length).toBeGreaterThan(0);
    });

    it('confidence is between 0.1 and 1', () => {
      const p = runtime.predictNextAction({ activities: ['code'], timeOfDay: 'morning' });
      expect(p.confidence).toBeGreaterThanOrEqual(0.1);
      expect(p.confidence).toBeLessThanOrEqual(1);
    });

    it('generates a unique id', () => {
      const p1 = runtime.predictNextAction({ activities: ['code'], timeOfDay: 'morning' });
      const p2 = runtime.predictNextAction({ activities: ['code'], timeOfDay: 'morning' });
      expect(p1.id).not.toBe(p2.id);
    });

    it('sets predictedAt to an ISO string', () => {
      const p = runtime.predictNextAction({ activities: ['code'], timeOfDay: 'morning' });
      expect(() => new Date(p.predictedAt).toISOString()).not.toThrow();
    });

    it('includes timeOfDay in context', () => {
      const p = runtime.predictNextAction({ activities: ['code'], timeOfDay: 'evening' });
      expect(p.context.timeOfDay).toBe('evening');
    });

    it('includes activityCount in context', () => {
      const p = runtime.predictNextAction({ activities: ['a', 'b', 'c'], timeOfDay: 'morning' });
      expect(p.context.activityCount).toBe(3);
    });

    it('has non-empty reasoning', () => {
      const p = runtime.predictNextAction({ activities: ['code'], timeOfDay: 'morning' });
      expect(p.reasoning.length).toBeGreaterThan(0);
    });

    it('throws PredictionError with empty activities', () => {
      expect(() => runtime.predictNextAction({ activities: [], timeOfDay: 'morning' })).toThrow(PredictionError);
    });

    it('publishes PredictionGenerated event', () => {
      runtime.predictNextAction({ activities: ['code'], timeOfDay: 'morning' });
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith('PredictionGenerated', expect.any(Object));
    });

    it('stores the prediction internally', () => {
      const p = runtime.predictNextAction({ activities: ['code'], timeOfDay: 'morning' });
      expect(runtime.getPrediction(p.id)).toBeDefined();
    });

    it('picks the most frequent action from history', () => {
      runtime.recordAction('code');
      runtime.recordAction('code');
      runtime.recordAction('code');
      runtime.recordAction('review');
      const p = runtime.predictNextAction({ activities: ['code', 'review'], timeOfDay: 'morning' });
      expect(p.value).toBe('code');
    });

    it('uses the first activity when no history', () => {
      const p = runtime.predictNextAction({ activities: ['code', 'review'], timeOfDay: 'morning' });
      expect(['code', 'review']).toContain(p.value);
    });
  });

  // ── predictNextTask ─────────────────────────────────────────
  describe('predictNextTask', () => {
    it('returns a prediction with NextTask type', () => {
      const p = runtime.predictNextTask([{ id: 'g1', title: 'Task A', deadline: null, priority: 5 }]);
      expect(p.type).toBe(PredictionType.NextTask);
    });

    it('throws with empty goals array', () => {
      expect(() => runtime.predictNextTask([])).toThrow(PredictionError);
    });

    it('picks the goal with nearest deadline', () => {
      const soon = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
      const later = new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString();
      const p = runtime.predictNextTask([
        { id: 'g1', title: 'Far task', deadline: later, priority: 10 },
        { id: 'g2', title: 'Near task', deadline: soon, priority: 1 },
      ]);
      expect(p.value).toBe('Near task');
    });

    it('picks the highest priority when no deadlines', () => {
      const p = runtime.predictNextTask([
        { id: 'g1', title: 'Low', deadline: null, priority: 1 },
        { id: 'g2', title: 'High', deadline: null, priority: 10 },
      ]);
      expect(p.value).toBe('High');
    });

    it('goal without deadline loses to goal with deadline', () => {
      const p = runtime.predictNextTask([
        { id: 'g1', title: 'No deadline', deadline: null, priority: 10 },
        { id: 'g2', title: 'Has deadline', deadline: new Date(Date.now() + 1000 * 86400000 * 5).toISOString(), priority: 1 },
      ]);
      expect(p.value).toBe('Has deadline');
    });

    it('includes goalId in context', () => {
      const p = runtime.predictNextTask([{ id: 'g1', title: 'T', deadline: null, priority: 5 }]);
      expect(p.context.goalId).toBe('g1');
    });

    it('includes goalCount in context', () => {
      const p = runtime.predictNextTask([
        { id: 'g1', title: 'T1', deadline: null, priority: 5 },
        { id: 'g2', title: 'T2', deadline: null, priority: 3 },
      ]);
      expect(p.context.goalCount).toBe(2);
    });

    it('higher confidence for nearer deadlines', () => {
      const near = new Date(Date.now() + 86400000).toISOString();
      const p = runtime.predictNextTask([{ id: 'g1', title: 'T', deadline: near, priority: 5 }]);
      expect(p.confidence).toBeGreaterThan(0.5);
    });

    it('lower confidence for no deadline', () => {
      const p = runtime.predictNextTask([{ id: 'g1', title: 'T', deadline: null, priority: 5 }]);
      expect(p.confidence).toBe(0.3);
    });

    it('publishes event', () => {
      runtime.predictNextTask([{ id: 'g1', title: 'T', deadline: null, priority: 5 }]);
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith('PredictionGenerated', expect.any(Object));
    });

    it('stores prediction', () => {
      const p = runtime.predictNextTask([{ id: 'g1', title: 'T', deadline: null, priority: 5 }]);
      expect(runtime.getPrediction(p.id)).toBeDefined();
    });
  });

  // ── predictNextQuestion ─────────────────────────────────────
  describe('predictNextQuestion', () => {
    it('returns a prediction with NextQuestion type', () => {
      const p = runtime.predictNextQuestion(['topic-a', 'topic-b']);
      expect(p.type).toBe(PredictionType.NextQuestion);
    });

    it('throws with empty topics', () => {
      expect(() => runtime.predictNextQuestion([])).toThrow(PredictionError);
    });

    it('picks least recent topic (last in array)', () => {
      const p = runtime.predictNextQuestion(['recent', 'older']);
      expect(p.value).toBe('older');
    });

    it('confidence is capped at 0.6', () => {
      const p = runtime.predictNextQuestion(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
      expect(p.confidence).toBeLessThanOrEqual(0.6);
    });

    it('confidence is at least 0.1', () => {
      const p = runtime.predictNextQuestion(['single']);
      expect(p.confidence).toBeGreaterThanOrEqual(0.1);
    });

    it('includes topicCount in context', () => {
      const p = runtime.predictNextQuestion(['a', 'b', 'c']);
      expect(p.context.topicCount).toBe(3);
    });

    it('includes recentTopics in context', () => {
      const topics = ['a', 'b'];
      const p = runtime.predictNextQuestion(topics);
      expect(p.context.recentTopics).toEqual(expect.arrayContaining(topics));
    });

    it('publishes event', () => {
      runtime.predictNextQuestion(['a']);
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith('PredictionGenerated', expect.any(Object));
    });

    it('stores prediction', () => {
      const p = runtime.predictNextQuestion(['a']);
      expect(runtime.getPrediction(p.id)).toBeDefined();
    });
  });

  // ── predictNextDocument ─────────────────────────────────────
  describe('predictNextDocument', () => {
    it('returns a prediction with NextDocument type', () => {
      const p = runtime.predictNextDocument(['doc-a']);
      expect(p.type).toBe(PredictionType.NextDocument);
    });

    it('throws with empty docs', () => {
      expect(() => runtime.predictNextDocument([])).toThrow(PredictionError);
    });

    it('picks the most frequent document', () => {
      const p = runtime.predictNextDocument(['doc-a', 'doc-a', 'doc-b']);
      expect(p.value).toBe('doc-a');
    });

    it('confidence reflects frequency ratio', () => {
      const p = runtime.predictNextDocument(['doc-a', 'doc-a', 'doc-a', 'doc-b']);
      expect(p.confidence).toBeCloseTo(0.75, 1);
    });

    it('confidence is at least 0.1', () => {
      const p = runtime.predictNextDocument(['doc-a', 'doc-b', 'doc-c', 'doc-d', 'doc-e']);
      expect(p.confidence).toBeGreaterThanOrEqual(0.1);
    });

    it('confidence is at most 0.9', () => {
      const p = runtime.predictNextDocument(['doc-a']);
      expect(p.confidence).toBeLessThanOrEqual(0.9);
    });

    it('includes documentCount in context', () => {
      const p = runtime.predictNextDocument(['a', 'b', 'c']);
      expect(p.context.documentCount).toBe(3);
    });

    it('includes frequency in context', () => {
      const p = runtime.predictNextDocument(['a', 'a', 'b']);
      expect(p.context.frequency).toBe(2);
    });

    it('publishes event', () => {
      runtime.predictNextDocument(['doc']);
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith('PredictionGenerated', expect.any(Object));
    });

    it('stores prediction', () => {
      const p = runtime.predictNextDocument(['doc']);
      expect(runtime.getPrediction(p.id)).toBeDefined();
    });
  });

  // ── predictNextWorkflow ─────────────────────────────────────
  describe('predictNextWorkflow', () => {
    it('returns a prediction with NextWorkflow type', () => {
      const p = runtime.predictNextWorkflow(2);
      expect(p.type).toBe(PredictionType.NextWorkflow);
    });

    it('predicts "none" with zero active workflows', () => {
      const p = runtime.predictNextWorkflow(0);
      expect(p.value).toBe('none');
    });

    it('predicts "continue" with active workflows', () => {
      const p = runtime.predictNextWorkflow(3);
      expect(p.value).toBe('continue');
    });

    it('high confidence for zero workflows', () => {
      const p = runtime.predictNextWorkflow(0);
      expect(p.confidence).toBe(0.9);
    });

    it('confidence scales with workflow count (max 0.95)', () => {
      const p = runtime.predictNextWorkflow(10);
      expect(p.confidence).toBeLessThanOrEqual(0.95);
    });

    it('includes activeWorkflows in context', () => {
      const p = runtime.predictNextWorkflow(3);
      expect(p.context.activeWorkflows).toBe(3);
    });

    it('publishes event', () => {
      runtime.predictNextWorkflow(1);
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith('PredictionGenerated', expect.any(Object));
    });

    it('stores prediction', () => {
      const p = runtime.predictNextWorkflow(1);
      expect(runtime.getPrediction(p.id)).toBeDefined();
    });

    it('handles negative workflow count', () => {
      const p = runtime.predictNextWorkflow(-1);
      expect(p.value).toBe('none');
    });
  });

  // ── recordOutcome ───────────────────────────────────────────
  describe('recordOutcome', () => {
    it('throws for unknown prediction id', () => {
      expect(() => runtime.recordOutcome('nonexistent', 'value')).toThrow(PredictionError);
    });

    it('records a correct outcome', () => {
      const p = runtime.predictNextAction({ activities: ['code'], timeOfDay: 'morning' });
      runtime.recordOutcome(p.id, p.value);
      // accuracy should be 1.0 after one correct
      expect(runtime.getAccuracy()).toBe(1);
    });

    it('records an incorrect outcome', () => {
      const p = runtime.predictNextAction({ activities: ['code'], timeOfDay: 'morning' });
      runtime.recordOutcome(p.id, 'different');
      expect(runtime.getAccuracy()).toBe(0);
    });

    it('publishes PredictionValidated event', () => {
      const p = runtime.predictNextAction({ activities: ['code'], timeOfDay: 'morning' });
      runtime.recordOutcome(p.id, p.value);
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith('PredictionValidated', expect.any(Object));
    });

    it('tracks accuracy across multiple predictions', () => {
      const p1 = runtime.predictNextAction({ activities: ['code'], timeOfDay: 'morning' });
      const p2 = runtime.predictNextAction({ activities: ['review'], timeOfDay: 'afternoon' });
      runtime.recordOutcome(p1.id, p1.value); // correct
      runtime.recordOutcome(p2.id, 'wrong'); // incorrect
      expect(runtime.getAccuracy()).toBeCloseTo(0.5);
    });
  });

  // ── getAccuracy ─────────────────────────────────────────────
  describe('getAccuracy', () => {
    it('returns 0 with no validations', () => {
      expect(runtime.getAccuracy()).toBe(0);
    });

    it('returns 1 after all correct outcomes', () => {
      const p1 = runtime.predictNextAction({ activities: ['a'], timeOfDay: 'm' });
      const p2 = runtime.predictNextAction({ activities: ['b'], timeOfDay: 'm' });
      runtime.recordOutcome(p1.id, p1.value);
      runtime.recordOutcome(p2.id, p2.value);
      expect(runtime.getAccuracy()).toBe(1);
    });

    it('returns 0 after all incorrect outcomes', () => {
      const p = runtime.predictNextAction({ activities: ['a'], timeOfDay: 'm' });
      runtime.recordOutcome(p.id, 'wrong');
      expect(runtime.getAccuracy()).toBe(0);
    });
  });

  // ── recordAction ────────────────────────────────────────────
  describe('recordAction', () => {
    it('stores an action in history', () => {
      runtime.recordAction('code');
      // The action should influence future predictions
      const p = runtime.predictNextAction({ activities: ['code', 'review'], timeOfDay: 'm' });
      expect(p.value).toBe('code');
    });

    it('counts repeated actions', () => {
      runtime.recordAction('code');
      runtime.recordAction('code');
      runtime.recordAction('review');
      const p = runtime.predictNextAction({ activities: ['code', 'review'], timeOfDay: 'm' });
      expect(p.value).toBe('code');
    });

    it('ignores empty strings', () => {
      runtime.recordAction('');
      runtime.recordAction('   ');
      // No crash, history should be empty
      expect(runtime.getAccuracy()).toBe(0);
    });

    it('trims whitespace', () => {
      runtime.recordAction('  code  ');
      const p = runtime.predictNextAction({ activities: ['code'], timeOfDay: 'm' });
      expect(p.value).toBe('code');
    });
  });

  // ── getPrediction ───────────────────────────────────────────
  describe('getPrediction', () => {
    it('returns a prediction by id', () => {
      const p = runtime.predictNextAction({ activities: ['code'], timeOfDay: 'm' });
      const retrieved = runtime.getPrediction(p.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(p.id);
    });

    it('returns undefined for unknown id', () => {
      expect(runtime.getPrediction('nonexistent')).toBeUndefined();
    });
  });

  // ── getPredictions ──────────────────────────────────────────
  describe('getPredictions', () => {
    it('returns all predictions when no filter', () => {
      runtime.predictNextAction({ activities: ['a'], timeOfDay: 'm' });
      runtime.predictNextTask([{ id: 'g1', title: 'T', deadline: null, priority: 5 }]);
      expect(runtime.getPredictions()).toHaveLength(2);
    });

    it('filters by type', () => {
      runtime.predictNextAction({ activities: ['a'], timeOfDay: 'm' });
      runtime.predictNextTask([{ id: 'g1', title: 'T', deadline: null, priority: 5 }]);
      expect(runtime.getPredictions(PredictionType.NextAction)).toHaveLength(1);
    });

    it('returns empty array when no predictions', () => {
      expect(runtime.getPredictions()).toHaveLength(0);
    });

    it('returns frozen array', () => {
      runtime.predictNextAction({ activities: ['a'], timeOfDay: 'm' });
      const arr = runtime.getPredictions();
      expect(Object.isFrozen(arr)).toBe(true);
    });
  });

  // ── dispose ─────────────────────────────────────────────────
  describe('dispose', () => {
    it('clears all predictions', () => {
      runtime.predictNextAction({ activities: ['a'], timeOfDay: 'm' });
      runtime.dispose();
      expect(runtime.getPredictions()).toHaveLength(0);
    });

    it('clears history', () => {
      runtime.recordAction('code');
      runtime.dispose();
      // After dispose, predictions should default to context activities
      const p = runtime.predictNextAction({ activities: ['code', 'review'], timeOfDay: 'm' });
      // Should still work after dispose
      expect(p).toBeDefined();
    });

    it('clears validations', () => {
      const p = runtime.predictNextAction({ activities: ['a'], timeOfDay: 'm' });
      runtime.recordOutcome(p.id, p.value);
      runtime.dispose();
      expect(runtime.getAccuracy()).toBe(0);
    });
  });
});
