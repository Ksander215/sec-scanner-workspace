import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PersonalRuntimeContracts } from '../../../../core/personal/contracts.js';
import { AssistantRuntime } from '../../../../core/personal/assistant-runtime.js';
import { AssistantError } from '../../../../core/personal/errors.js';

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

describe('AssistantRuntime', () => {
  let contracts: PersonalRuntimeContracts;
  let runtime: AssistantRuntime;

  beforeEach(() => {
    contracts = createMockContracts();
    runtime = new AssistantRuntime(contracts);
  });

  // ── activate ──────────────────────────────────────────────
  describe('activate', () => {
    it('returns an active state', () => {
      const state = runtime.activate();
      expect(state.active).toBe(true);
    });

    it('uses provided userId', () => {
      const state = runtime.activate('custom-user');
      expect(state.userId).toBe('custom-user');
    });

    it('falls back to identity contract userId', () => {
      const state = runtime.activate();
      expect(state.userId).toBe('user-1');
    });

    it('sets currentActivity to null initially', () => {
      const state = runtime.activate();
      expect(state.currentActivity).toBeNull();
    });

    it('sets yesterdaySummary to null initially', () => {
      const state = runtime.activate();
      expect(state.yesterdaySummary).toBeNull();
    });

    it('sets todayPlan to null initially', () => {
      const state = runtime.activate();
      expect(state.todayPlan).toBeNull();
    });

    it('sets nextSuggestedAction to null initially', () => {
      const state = runtime.activate();
      expect(state.nextSuggestedAction).toBeNull();
    });

    it('sets context to null initially', () => {
      const state = runtime.activate();
      expect(state.context).toBeNull();
    });

    it('sets updatedAt', () => {
      const state = runtime.activate();
      expect(() => new Date(state.updatedAt).toISOString()).not.toThrow();
    });

    it('publishes AssistantStateChanged event on first activate', () => {
      runtime.activate();
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith('AssistantStateChanged', expect.any(Object));
    });

    it('does not publish event on re-activate', () => {
      runtime.activate();
      (contracts.platform.publishEvent as ReturnType<typeof vi.fn>).mockClear();
      runtime.activate();
      expect(contracts.platform.publishEvent).not.toHaveBeenCalled();
    });

    it('preserves existing state on re-activate', () => {
      const s1 = runtime.activate();
      runtime.updateState({ currentActivity: 'coding' });
      const s2 = runtime.activate();
      expect(s2.currentActivity).toBe('coding');
    });
  });

  // ── deactivate ────────────────────────────────────────────
  describe('deactivate', () => {
    it('sets active to false', () => {
      runtime.activate();
      const state = runtime.deactivate();
      expect(state.active).toBe(false);
    });

    it('throws when not active', () => {
      expect(() => runtime.deactivate()).toThrow(AssistantError);
    });

    it('publishes AssistantStateChanged event', () => {
      runtime.activate();
      (contracts.platform.publishEvent as ReturnType<typeof vi.fn>).mockClear();
      runtime.deactivate();
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith('AssistantStateChanged', expect.any(Object));
    });

    it('preserves userId on deactivate', () => {
      runtime.activate();
      const state = runtime.deactivate();
      expect(state.userId).toBe('user-1');
    });
  });

  // ── updateState ───────────────────────────────────────────
  describe('updateState', () => {
    it('throws when not initialized', () => {
      expect(() => runtime.updateState({ currentActivity: 'coding' })).toThrow(AssistantError);
    });

    it('updates currentActivity', () => {
      runtime.activate();
      const state = runtime.updateState({ currentActivity: 'coding' });
      expect(state.currentActivity).toBe('coding');
    });

    it('updates yesterdaySummary', () => {
      runtime.activate();
      const state = runtime.updateState({ yesterdaySummary: 'Did 3 things.' });
      expect(state.yesterdaySummary).toBe('Did 3 things.');
    });

    it('updates todayPlan', () => {
      runtime.activate();
      const state = runtime.updateState({ todayPlan: 'Focus on X.' });
      expect(state.todayPlan).toBe('Focus on X.');
    });

    it('updates nextSuggestedAction', () => {
      runtime.activate();
      const state = runtime.updateState({ nextSuggestedAction: 'Take a break' });
      expect(state.nextSuggestedAction).toBe('Take a break');
    });

    it('updates context', () => {
      runtime.activate();
      const ctx = { userId: 'u1', focus: 'test', skills: [], goals: [], interests: [], activity: { type: 'working' as const, description: 'd', startedAt: new Date().toISOString(), relatedGoalId: null, relatedWorkflowId: null }, environment: 'office', preferences: {}, updatedAt: new Date().toISOString() };
      const state = runtime.updateState({ context: ctx });
      expect(state.context).not.toBeNull();
    });

    it('truncates yesterdaySummary to maxSummaryLength', () => {
      const rt = new AssistantRuntime(contracts, { maxSummaryLength: 10 });
      rt.activate();
      const state = rt.updateState({ yesterdaySummary: 'A very long summary that exceeds the limit' });
      expect(state.yesterdaySummary!.length).toBe(10);
    });

    it('does not modify state fields not provided', () => {
      runtime.activate();
      runtime.updateState({ currentActivity: 'coding' });
      const state = runtime.updateState({ yesterdaySummary: 'Done.' });
      expect(state.currentActivity).toBe('coding');
    });

    it('allows setting fields to null', () => {
      runtime.activate();
      runtime.updateState({ currentActivity: 'coding' });
      const state = runtime.updateState({ currentActivity: null });
      expect(state.currentActivity).toBeNull();
    });
  });

  // ── getState ──────────────────────────────────────────────
  describe('getState', () => {
    it('returns null when not activated', () => {
      expect(runtime.getState()).toBeNull();
    });

    it('returns state after activation', () => {
      runtime.activate();
      expect(runtime.getState()).not.toBeNull();
      expect(runtime.getState()!.active).toBe(true);
    });
  });

  // ── getFormattedSummary (getSummary) ──────────────────────
  describe('getSummary', () => {
    it('returns inactive message when not active', () => {
      expect(runtime.getSummary()).toBe('Assistant is not active');
    });

    it('includes userId', () => {
      runtime.activate();
      const summary = runtime.getSummary();
      expect(summary).toContain('user-1');
    });

    it('includes currentActivity when set', () => {
      runtime.activate();
      runtime.updateState({ currentActivity: 'coding' });
      const summary = runtime.getSummary();
      expect(summary).toContain('Activity: coding');
    });

    it('includes yesterdaySummary when set', () => {
      runtime.activate();
      runtime.updateState({ yesterdaySummary: 'Completed 3 goals.' });
      const summary = runtime.getSummary();
      expect(summary).toContain('Yesterday:');
    });

    it('includes todayPlan when set', () => {
      runtime.activate();
      runtime.updateState({ todayPlan: 'Focus on A.' });
      const summary = runtime.getSummary();
      expect(summary).toContain('Today:');
    });

    it('includes nextSuggestedAction when set', () => {
      runtime.activate();
      runtime.updateState({ nextSuggestedAction: 'Break' });
      const summary = runtime.getSummary();
      expect(summary).toContain('Next action: Break');
    });
  });

  // ── buildYesterdaySummary ────────────────────────────────
  describe('buildYesterdaySummary', () => {
    it('throws when not initialized', () => {
      expect(() => runtime.buildYesterdaySummary([], 0)).toThrow(AssistantError);
    });

    it('mentions completed goals', () => {
      runtime.activate();
      const state = runtime.buildYesterdaySummary([], 3);
      expect(state.yesterdaySummary).toContain('Completed 3 goals');
    });

    it('mentions no completions when zero', () => {
      runtime.activate();
      const state = runtime.buildYesterdaySummary([], 0);
      expect(state.yesterdaySummary).toContain('No goals were completed');
    });

    it('mentions active goals', () => {
      runtime.activate();
      const goals = [{ id: 'g1', title: 'Ship feature', status: 'Active' as const, progress: 50, deadline: null }];
      const state = runtime.buildYesterdaySummary(goals, 0);
      expect(state.yesterdaySummary).toContain('Ship feature');
    });
  });

  // ── buildTodayPlan ────────────────────────────────────────
  describe('buildTodayPlan', () => {
    it('throws when not initialized', () => {
      expect(() => runtime.buildTodayPlan([])).toThrow(AssistantError);
    });

    it('includes goal titles in plan', () => {
      runtime.activate();
      const goals = [{ id: 'g1', title: 'Task A', status: 'Active' as const, progress: 30, deadline: null }];
      const state = runtime.buildTodayPlan(goals);
      expect(state.todayPlan).toContain('Task A');
    });

    it('shows no goals message when empty', () => {
      runtime.activate();
      const state = runtime.buildTodayPlan([]);
      expect(state.todayPlan).toContain('No active goals');
    });

    it('limits to top 5 goals', () => {
      runtime.activate();
      const goals = Array.from({ length: 10 }, (_, i) => ({
        id: `g${i}`, title: `Goal ${i}`, status: 'Active' as const, progress: 10, deadline: null,
      }));
      const state = runtime.buildTodayPlan(goals);
      const lines = state.todayPlan!.split('\n');
      expect(lines.length).toBeLessThanOrEqual(7); // header + 5 items + maybe header line
    });
  });

  // ── helpers ───────────────────────────────────────────────
  describe('isActive', () => {
    it('returns false initially', () => {
      expect(runtime.isActive()).toBe(false);
    });

    it('returns true after activate', () => {
      runtime.activate();
      expect(runtime.isActive()).toBe(true);
    });

    it('returns false after deactivate', () => {
      runtime.activate();
      runtime.deactivate();
      expect(runtime.isActive()).toBe(false);
    });
  });

  describe('getUserId', () => {
    it('returns null when not active', () => {
      expect(runtime.getUserId()).toBeNull();
    });

    it('returns userId when active', () => {
      runtime.activate();
      expect(runtime.getUserId()).toBe('user-1');
    });
  });

  describe('setNextAction', () => {
    it('throws when not initialized', () => {
      expect(() => runtime.setNextAction('do stuff')).toThrow(AssistantError);
    });

    it('throws for empty action', () => {
      runtime.activate();
      expect(() => runtime.setNextAction('  ')).toThrow(AssistantError);
    });

    it('sets the next suggested action', () => {
      runtime.activate();
      const state = runtime.setNextAction('Take a 5-min break');
      expect(state.nextSuggestedAction).toBe('Take a 5-min break');
    });
  });
});
