import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PersonalRuntimeContracts } from '../../../core/personal/contracts.js';
import { UserProfileRuntime } from '../../../core/personal/user-profile.js';

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

describe('UserProfileRuntime', () => {
  let contracts: PersonalRuntimeContracts;
  let runtime: UserProfileRuntime;

  beforeEach(() => {
    contracts = createMockContracts();
    runtime = new UserProfileRuntime(contracts);
  });

  // ── buildProfile ──────────────────────────────────────────────

  describe('buildProfile', () => {
    it('returns a PersonalContext object', async () => {
      const ctx = await runtime.buildProfile();
      expect(ctx).toBeDefined();
      expect(ctx.userId).toBe('user-1');
    });

    it('sets userId from identity contract', async () => {
      const ctx = await runtime.buildProfile();
      expect(ctx.userId).toBe('user-1');
    });

    it('uses "anonymous" when identity returns null userId', async () => {
      contracts.identity.getCurrentUserId = vi.fn(() => null);
      const ctx = await runtime.buildProfile();
      expect(ctx.userId).toBe('anonymous');
    });

    it('sets focus to first role when roles exist', async () => {
      const ctx = await runtime.buildProfile();
      expect(ctx.focus).toBe('admin');
    });

    it('sets focus to null when no roles', async () => {
      contracts.identity.getUserRoles = vi.fn(() => []);
      const ctx = await runtime.buildProfile();
      expect(ctx.focus).toBeNull();
    });

    it('extracts skills from knowledge items with type "skill"', async () => {
      contracts.knowledge.getRecentItems = vi.fn(async () => [
        { name: 'TypeScript', type: 'skill' },
      ]);
      const ctx = await runtime.buildProfile();
      expect(ctx.skills).toContain('TypeScript');
    });

    it('extracts skills using title when name is absent', async () => {
      contracts.knowledge.getRecentItems = vi.fn(async () => [
        { title: 'Rust', type: 'skill' },
      ]);
      const ctx = await runtime.buildProfile();
      expect(ctx.skills).toContain('Rust');
    });

    it('treats non-skill items as interests', async () => {
      contracts.knowledge.getRecentItems = vi.fn(async () => [
        { name: 'Machine Learning' },
      ]);
      const ctx = await runtime.buildProfile();
      expect(ctx.interests).toContain('Machine Learning');
      expect(ctx.skills).toHaveLength(0);
    });

    it('sets goals to empty array', async () => {
      const ctx = await runtime.buildProfile();
      expect(ctx.goals).toEqual([]);
    });

    it('copies preferences from identity', async () => {
      const ctx = await runtime.buildProfile();
      expect(ctx.preferences).toEqual({ theme: 'dark' });
    });

    it('sets updatedAt to a valid ISO timestamp', async () => {
      const ctx = await runtime.buildProfile();
      expect(ctx.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('sets environment to "office" when desktop state is truthy', async () => {
      const ctx = await runtime.buildProfile();
      expect(ctx.environment).toBe('office');
    });

    it('sets environment to null when desktop state is falsy', async () => {
      contracts.desktop.getDesktopState = vi.fn(() => '');
      const ctx = await runtime.buildProfile();
      expect(ctx.environment).toBeNull();
    });

    it('handles knowledge errors gracefully', async () => {
      contracts.knowledge.getRecentItems = vi.fn(async () => { throw new Error('boom'); });
      const ctx = await runtime.buildProfile();
      expect(ctx.skills).toEqual([]);
      expect(ctx.interests).toEqual([]);
    });

    it('publishes ProfileUpdated event', async () => {
      await runtime.buildProfile();
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith(
        'ProfileUpdated',
        expect.objectContaining({
          eventType: 'ProfileUpdated',
        }),
      );
    });

    it('sets activity to working when running instances exist', async () => {
      contracts.workflow.getRunningInstances = vi.fn(() => [
        { name: 'Build pipeline', id: 'w-1' },
      ]);
      const ctx = await runtime.buildProfile();
      expect(ctx.activity.type).toBe('working');
      expect(ctx.activity.description).toContain('Build pipeline');
    });

    it('sets activity to working when active window exists but no workflows', async () => {
      const ctx = await runtime.buildProfile();
      expect(ctx.activity.type).toBe('working');
      expect(ctx.activity.description).toContain('editor');
    });

    it('sets activity to idle when no workflows and no active window', async () => {
      contracts.workflow.getRunningInstances = vi.fn(() => []);
      contracts.desktop.getActiveWindow = vi.fn(() => null);
      const ctx = await runtime.buildProfile();
      expect(ctx.activity.type).toBe('idle');
    });

    it('sets relatedGoalId from running instance when present', async () => {
      contracts.workflow.getRunningInstances = vi.fn(() => [
        { name: 'X', id: 'w-1', goalId: 'g-5' },
      ]);
      const ctx = await runtime.buildProfile();
      expect(ctx.activity.relatedGoalId).toBe('g-5');
    });

    it('sets relatedWorkflowId from running instance when present', async () => {
      contracts.workflow.getRunningInstances = vi.fn(() => [
        { name: 'X', id: 'w-1' },
      ]);
      const ctx = await runtime.buildProfile();
      expect(ctx.activity.relatedWorkflowId).toBe('w-1');
    });

    it('handles knowledge items that are not objects', async () => {
      contracts.knowledge.getRecentItems = vi.fn(async () => ['string-item', null, 42]);
      const ctx = await runtime.buildProfile();
      expect(ctx.skills).toEqual([]);
      expect(ctx.interests).toEqual([]);
    });

    it('uses workflow instance title when name is absent', async () => {
      contracts.workflow.getRunningInstances = vi.fn(() => [
        { title: 'Pipeline Job', id: 'w-1' },
      ]);
      const ctx = await runtime.buildProfile();
      expect(ctx.activity.description).toContain('Pipeline Job');
    });

    it('freezes the returned context', async () => {
      const ctx = await runtime.buildProfile();
      expect(Object.isFrozen(ctx)).toBe(true);
    });

    it('freezes skills array', async () => {
      contracts.knowledge.getRecentItems = vi.fn(async () => [
        { name: 'TS', type: 'skill' },
      ]);
      const ctx = await runtime.buildProfile();
      expect(Object.isFrozen(ctx.skills)).toBe(true);
    });

    it('freezes interests array', async () => {
      contracts.knowledge.getRecentItems = vi.fn(async () => [
        { name: 'AI' },
      ]);
      const ctx = await runtime.buildProfile();
      expect(Object.isFrozen(ctx.interests)).toBe(true);
    });
  });

  // ── getContext ────────────────────────────────────────────────

  describe('getContext', () => {
    it('returns null before buildProfile is called', () => {
      expect(runtime.getContext()).toBeNull();
    });

    it('returns the context after buildProfile', async () => {
      const ctx = await runtime.buildProfile();
      expect(runtime.getContext()).toBe(ctx);
    });
  });

  // ── refreshContext ────────────────────────────────────────────

  describe('refreshContext', () => {
    it('returns a PersonalContext', async () => {
      const ctx = await runtime.refreshContext();
      expect(ctx).toBeDefined();
      expect(ctx.userId).toBe('user-1');
    });

    it('updates the stored context', async () => {
      await runtime.refreshContext();
      expect(runtime.getContext()).not.toBeNull();
    });

    it('publishes ProfileUpdated event on refresh', async () => {
      await runtime.refreshContext();
      expect(contracts.platform.publishEvent).toHaveBeenCalled();
    });
  });

  // ── getSummary ────────────────────────────────────────────────

  describe('getSummary', () => {
    it('returns "No profile loaded" before buildProfile', () => {
      expect(runtime.getSummary()).toBe('No profile loaded');
    });

    it('includes userId in summary', async () => {
      await runtime.buildProfile();
      const summary = runtime.getSummary();
      expect(summary).toContain('user-1');
    });

    it('includes focus in summary when set', async () => {
      await runtime.buildProfile();
      const summary = runtime.getSummary();
      expect(summary).toContain('Focus: admin');
    });

    it('omits focus when null', async () => {
      contracts.identity.getUserRoles = vi.fn(() => []);
      await runtime.buildProfile();
      const summary = runtime.getSummary();
      expect(summary).not.toContain('Focus:');
    });

    it('includes skills in summary when present', async () => {
      contracts.knowledge.getRecentItems = vi.fn(async () => [
        { name: 'TypeScript', type: 'skill' },
        { name: 'Rust', type: 'skill' },
      ]);
      await runtime.buildProfile();
      const summary = runtime.getSummary();
      expect(summary).toContain('Skills: TypeScript, Rust');
    });

    it('includes interests in summary when present', async () => {
      contracts.knowledge.getRecentItems = vi.fn(async () => [
        { name: 'AI' },
      ]);
      await runtime.buildProfile();
      const summary = runtime.getSummary();
      expect(summary).toContain('Interests: AI');
    });

    it('includes activity type and description', async () => {
      await runtime.buildProfile();
      const summary = runtime.getSummary();
      expect(summary).toContain('Activity: working');
    });

    it('includes environment when set', async () => {
      await runtime.buildProfile();
      const summary = runtime.getSummary();
      expect(summary).toContain('Environment: office');
    });

    it('omits environment when null', async () => {
      contracts.desktop.getDesktopState = vi.fn(() => '');
      await runtime.buildProfile();
      const summary = runtime.getSummary();
      expect(summary).not.toContain('Environment:');
    });

    it('omits skills line when no skills', async () => {
      await runtime.buildProfile();
      const summary = runtime.getSummary();
      expect(summary).not.toContain('Skills:');
    });

    it('omits interests line when no interests', async () => {
      await runtime.buildProfile();
      const summary = runtime.getSummary();
      expect(summary).not.toContain('Interests:');
    });
  });
});
