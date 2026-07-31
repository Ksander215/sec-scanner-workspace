import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PersonalRuntimeContracts } from '../../../core/personal/contracts.js';
import { PersonalRuntime } from '../../../core/personal/personal-runtime.js';

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

describe('PersonalRuntime', () => {
  let contracts: PersonalRuntimeContracts;
  let runtime: PersonalRuntime;

  beforeEach(() => {
    contracts = createMockContracts();
    runtime = new PersonalRuntime(contracts);
  });

  // ── Constructor creates all 14 subsystems + metrics ──────────
  describe('constructor', () => {
    it('creates userProfile subsystem', () => {
      expect(runtime.userProfile).toBeDefined();
    });

    it('creates goals subsystem', () => {
      expect(runtime.goals).toBeDefined();
    });

    it('creates priorities subsystem', () => {
      expect(runtime.priorities).toBeDefined();
    });

    it('creates context subsystem', () => {
      expect(runtime.context).toBeDefined();
    });

    it('creates planning subsystem', () => {
      expect(runtime.planning).toBeDefined();
    });

    it('creates predictions subsystem', () => {
      expect(runtime.predictions).toBeDefined();
    });

    it('creates habits subsystem', () => {
      expect(runtime.habits).toBeDefined();
    });

    it('creates recommendations subsystem', () => {
      expect(runtime.recommendations).toBeDefined();
    });

    it('creates attention subsystem', () => {
      expect(runtime.attention).toBeDefined();
    });

    it('creates reflections subsystem', () => {
      expect(runtime.reflections).toBeDefined();
    });

    it('creates learning subsystem', () => {
      expect(runtime.learning).toBeDefined();
    });

    it('creates decisions subsystem', () => {
      expect(runtime.decisions).toBeDefined();
    });

    it('creates daily subsystem', () => {
      expect(runtime.daily).toBeDefined();
    });

    it('creates assistant subsystem', () => {
      expect(runtime.assistant).toBeDefined();
    });

    it('creates metrics collector', () => {
      expect(runtime.metrics).toBeDefined();
    });

    it('creates 15 subsystem-like objects total', () => {
      // 14 subsystems + 1 metrics collector
      const subsystems = [
        runtime.userProfile, runtime.goals, runtime.priorities, runtime.context,
        runtime.planning, runtime.predictions, runtime.habits, runtime.recommendations,
        runtime.attention, runtime.reflections, runtime.learning, runtime.decisions,
        runtime.daily, runtime.assistant, runtime.metrics,
      ];
      expect(subsystems.length).toBe(15);
      expect(subsystems.every(s => s !== undefined && s !== null)).toBe(true);
    });
  });

  // ── Subsystem getters are consistent ──────────────────────────
  describe('subsystem getters', () => {
    it('returns same instance on repeated access', () => {
      expect(runtime.goals).toBe(runtime.goals);
    });

    it('goals is a GoalRuntime instance', () => {
      expect(runtime.goals.constructor.name).toBe('GoalRuntime');
    });

    it('predictions is a PredictionRuntime instance', () => {
      expect(runtime.predictions.constructor.name).toBe('PredictionRuntime');
    });

    it('recommendations is a RecommendationRuntime instance', () => {
      expect(runtime.recommendations.constructor.name).toBe('RecommendationRuntime');
    });

    it('attention is an AttentionRuntime instance', () => {
      expect(runtime.attention.constructor.name).toBe('AttentionRuntime');
    });

    it('reflections is a ReflectionRuntime instance', () => {
      expect(runtime.reflections.constructor.name).toBe('ReflectionRuntime');
    });

    it('habits is a HabitRuntime instance', () => {
      expect(runtime.habits.constructor.name).toBe('HabitRuntime');
    });

    it('learning is a LearningRuntime instance', () => {
      expect(runtime.learning.constructor.name).toBe('LearningRuntime');
    });

    it('decisions is a DecisionRuntime instance', () => {
      expect(runtime.decisions.constructor.name).toBe('DecisionRuntime');
    });

    it('daily is a DailyBriefRuntime instance', () => {
      expect(runtime.daily.constructor.name).toBe('DailyBriefRuntime');
    });

    it('assistant is an AssistantRuntime instance', () => {
      expect(runtime.assistant.constructor.name).toBe('AssistantRuntime');
    });

    it('metrics is a PersonalMetricsCollector instance', () => {
      expect(runtime.metrics.constructor.name).toBe('PersonalMetricsCollector');
    });
  });

  // ── initialize ───────────────────────────────────────────────
  describe('initialize', () => {
    it('builds profile via userProfile', async () => {
      await runtime.initialize();
      expect(contracts.identity.getCurrentUserId).toHaveBeenCalled();
    });

    it('builds context via context subsystem', async () => {
      await runtime.initialize();
      // Context build pulls from multiple contracts
      expect(contracts.knowledge.getNamespaces).toHaveBeenCalled();
      expect(contracts.desktop.getDesktopState).toHaveBeenCalled();
    });

    it('is idempotent', async () => {
      await runtime.initialize();
      await runtime.initialize();
      // No error thrown
      expect(true).toBe(true);
    });
  });

  // ── getPersonalContext ────────────────────────────────────────
  describe('getPersonalContext', () => {
    it('delegates to userProfile', async () => {
      const ctx = await runtime.getPersonalContext();
      expect(ctx.userId).toBe('user-1');
    });

    it('returns cached context after initialize', async () => {
      await runtime.initialize();
      const ctx = await runtime.getPersonalContext();
      expect(ctx.userId).toBe('user-1');
    });
  });

  // ── getUnifiedContext ────────────────────────────────────────
  describe('getUnifiedContext', () => {
    it('delegates to context subsystem', async () => {
      const ctx = await runtime.getUnifiedContext();
      expect(ctx.userId).toBe('user-1');
      expect(ctx.memory).toBeDefined();
      expect(ctx.knowledge).toBeDefined();
    });
  });

  // ── getState ─────────────────────────────────────────────────
  describe('getState', () => {
    it('returns frozen object', () => {
      const state = runtime.getState();
      expect(Object.isFrozen(state)).toBe(true);
    });

    it('includes goals summary', () => {
      const state = runtime.getState() as Record<string, unknown>;
      expect(state.goals).toBeDefined();
    });

    it('includes predictions summary', () => {
      const state = runtime.getState() as Record<string, unknown>;
      expect(state.predictions).toBeDefined();
    });

    it('includes habits summary', () => {
      const state = runtime.getState() as Record<string, unknown>;
      expect(state.habits).toBeDefined();
    });

    it('includes recommendations summary', () => {
      const state = runtime.getState() as Record<string, unknown>;
      expect(state.recommendations).toBeDefined();
    });

    it('includes attention summary', () => {
      const state = runtime.getState() as Record<string, unknown>;
      expect(state.attention).toBeDefined();
    });

    it('includes reflections summary', () => {
      const state = runtime.getState() as Record<string, unknown>;
      expect(state.reflections).toBeDefined();
    });

    it('includes learning summary', () => {
      const state = runtime.getState() as Record<string, unknown>;
      expect(state.learning).toBeDefined();
    });

    it('includes decisions summary', () => {
      const state = runtime.getState() as Record<string, unknown>;
      expect(state.decisions).toBeDefined();
    });

    it('includes daily summary', () => {
      const state = runtime.getState() as Record<string, unknown>;
      expect(state.daily).toBeDefined();
    });

    it('includes assistant summary', () => {
      const state = runtime.getState() as Record<string, unknown>;
      expect(state.assistant).toBeDefined();
    });

    it('includes planning summary', () => {
      const state = runtime.getState() as Record<string, unknown>;
      expect(state.planning).toBeDefined();
    });

    it('reflects goal count', () => {
      runtime.goals.createGoal({ title: 'Test', level: 'Goal' as any });
      const state = runtime.getState() as Record<string, any>;
      expect(state.goals.total).toBe(1);
    });

    it('reflects prediction accuracy', () => {
      const state = runtime.getState() as Record<string, any>;
      expect(state.predictions.accuracy).toBe(0);
    });

    it('assistant.active is false initially', () => {
      const state = runtime.getState() as Record<string, any>;
      expect(state.assistant.active).toBe(false);
    });
  });

  // ── dispose ─────────────────────────────────────────────────
  describe('dispose', () => {
    it('clears predictions', () => {
      runtime.predictions.recordAction('code');
      runtime.dispose();
      expect(runtime.predictions.getPredictions()).toHaveLength(0);
    });

    it('clears recommendations', () => {
      runtime.recommendations.generateRecommendation('Action' as any, 'T', 'd', 'r', 0.5);
      runtime.dispose();
      expect(runtime.recommendations.getRecommendations()).toHaveLength(0);
    });

    it('clears attention', () => {
      runtime.attention.recordSnapshot();
      runtime.dispose();
      expect(runtime.attention.getSnapshots()).toHaveLength(0);
    });

    it('clears reflections', async () => {
      await runtime.reflections.generateReflection('Daily' as any);
      runtime.dispose();
      expect(runtime.reflections.getReflections()).toHaveLength(0);
    });

    it('resets metrics', () => {
      runtime.metrics.increment('test');
      runtime.dispose();
      expect(runtime.metrics.getCounter('test')).toBe(0);
    });

    it('does not throw when called twice', () => {
      runtime.dispose();
      runtime.dispose();
      expect(true).toBe(true);
    });
  });

  // ── Config passing ───────────────────────────────────────────
  describe('config', () => {
    it('passes maxGoals to GoalRuntime', () => {
      const rt = new PersonalRuntime(contracts, { maxGoals: 5 });
      // Can create 5 goals without error
      for (let i = 0; i < 5; i++) {
        rt.goals.createGoal({ title: `G${i}`, level: 'Goal' as any });
      }
      expect(rt.goals.getGoalCount()).toBe(5);
    });

    it('passes maxPlans to PlanningRuntime', () => {
      const rt = new PersonalRuntime(contracts, { maxPlans: 2 });
      // Subsystem created without error
      expect(rt.planning).toBeDefined();
    });
  });
});
