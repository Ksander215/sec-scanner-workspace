import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PersonalRuntimeContracts } from '../../../../core/personal/contracts.js';
import { ContextRuntime } from '../../../../core/personal/context-runtime.js';

function createMockContracts(): PersonalRuntimeContracts {
  return {
    identity: { getCurrentUserId: vi.fn(() => 'user-1'), getUserRoles: vi.fn(() => ['admin', 'dev']), getUserPreferences: vi.fn(() => ({theme:'dark', lang:'en'})), resolvePreference: vi.fn(() => 'org-1') },
    memory: { retrieve: vi.fn(async() => null), store: vi.fn(async() => {}), query: vi.fn(() => [{key:'m1'}, {key:'m2'}, {key:'m3'}, {key:'m4'}, {key:'m5'}, {key:'m6'}]), getSessionEntries: vi.fn(() => ['se1', 'se2']), getWorkingEntries: vi.fn(() => ['we1']) },
    knowledge: { search: vi.fn(async() => []), getNamespaces: vi.fn(async() => [{id:'ns-1'}, {id:'ns-2'}]), getItemCount: vi.fn(async() => 99), getRecentItems: vi.fn(async() => [{name:'AI'}, {title:'ML'}]), getByTags: vi.fn(async() => []) },
    workflow: { getActiveWorkflows: vi.fn(() => ['wf1', 'wf2']), getRunningInstances: vi.fn(() => [{id:'ri-1'}, {id:'ri-2'}]), getRecentCompletions: vi.fn(() => [{id:'rc-1'}]), getAvailableWorkflows: vi.fn(() => []) },
    experience: { getActiveAdaptations: vi.fn(() => ['a1']), getRecommendations: vi.fn(() => ['r1', 'r2']), getCurrentPhase: vi.fn(() => 'Adapting'), getBehaviorPatterns: vi.fn(() => []) },
    cognitive: { getCurrentIntent: vi.fn(() => 'plan-sprint'), getConversationTurnCount: vi.fn(() => 5), getCurrentSessionId: vi.fn(() => 'sess-42'), getConversationSummary: vi.fn(async() => null) },
    capability: { getActivePacks: vi.fn(() => []), getAvailableCapabilities: vi.fn(() => []) },
    desktop: { getOpenWindowCount: vi.fn(() => 7), getActiveWindow: vi.fn(() => 'vscode'), getDesktopState: vi.fn(() => 'Focused'), getSubsystemCount: vi.fn(() => 14) },
    platform: { publishEvent: vi.fn(async() => {}), getConfiguration: vi.fn(() => null), getHealth: vi.fn(async() => ({})) },
  };
}

describe('ContextRuntime', () => {
  let contracts: PersonalRuntimeContracts;
  let runtime: ContextRuntime;

  beforeEach(() => {
    contracts = createMockContracts();
    runtime = new ContextRuntime(contracts);
  });

  // ── buildContext ──────────────────────────────────────────────

  describe('buildContext', () => {
    it('returns a UnifiedContext', async () => {
      const ctx = await runtime.buildContext();
      expect(ctx).toBeDefined();
      expect(ctx.userId).toBe('user-1');
    });

    it('uses "anonymous" when identity returns null', async () => {
      contracts.identity.getCurrentUserId = vi.fn(() => null);
      const ctx = await runtime.buildContext();
      expect(ctx.userId).toBe('anonymous');
    });

    it('sets a valid timestamp', async () => {
      const ctx = await runtime.buildContext();
      expect(ctx.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('builds memory snapshot', async () => {
      const ctx = await runtime.buildContext();
      expect(ctx.memory.workingEntries).toBe(1);
      expect(ctx.memory.sessionEntries).toBe(2);
    });

    it('memory snapshot limits recentKeys to 5', async () => {
      const ctx = await runtime.buildContext();
      expect(ctx.memory.recentKeys).toHaveLength(5);
      expect(ctx.memory.recentKeys).toEqual(['m2', 'm3', 'm4', 'm5', 'm6']);
    });

    it('builds knowledge snapshot', async () => {
      const ctx = await runtime.buildContext();
      expect(ctx.knowledge.namespaceCount).toBe(2);
      expect(ctx.knowledge.itemCount).toBe(99);
      expect(ctx.knowledge.recentItems).toEqual(['AI', 'ML']);
    });

    it('builds identity snapshot', async () => {
      const ctx = await runtime.buildContext();
      expect(ctx.identity.roles).toEqual(['admin', 'dev']);
      expect(ctx.identity.activePreferences).toEqual({ theme: 'dark', lang: 'en' });
      expect(ctx.identity.organizationId).toBe('org-1');
    });

    it('identity snapshot sets organizationId to null when not a string', async () => {
      contracts.identity.resolvePreference = vi.fn(() => 42);
      const ctx = await runtime.buildContext();
      expect(ctx.identity.organizationId).toBeNull();
    });

    it('builds desktop snapshot', async () => {
      const ctx = await runtime.buildContext();
      expect(ctx.desktop.openWindows).toBe(7);
      expect(ctx.desktop.activeWindow).toBe('vscode');
      expect(ctx.desktop.desktopState).toBe('Focused');
    });

    it('builds workflow snapshot', async () => {
      const ctx = await runtime.buildContext();
      expect(ctx.workflow.activeWorkflows).toBe(2);
      expect(ctx.workflow.runningInstances).toBe(2);
      expect(ctx.workflow.recentCompletions).toEqual(['rc-1']);
    });

    it('builds experience snapshot', async () => {
      const ctx = await runtime.buildContext();
      expect(ctx.experience.adaptationCount).toBe(1);
      expect(ctx.experience.recommendationCount).toBe(2);
      expect(ctx.experience.currentPhase).toBe('Adapting');
    });

    it('builds conversation snapshot', async () => {
      const ctx = await runtime.buildContext();
      expect(ctx.conversation.currentIntent).toBe('plan-sprint');
      expect(ctx.conversation.turnCount).toBe(5);
      expect(ctx.conversation.sessionId).toBe('sess-42');
    });

    it('publishes ContextUpdated event', async () => {
      await runtime.buildContext();
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith(
        'ContextUpdated',
        expect.objectContaining({ eventType: 'ContextUpdated' }),
      );
    });

    it('stores the context', async () => {
      const ctx = await runtime.buildContext();
      expect(runtime.getContext()).toBe(ctx);
    });

    it('freezes the returned context', async () => {
      const ctx = await runtime.buildContext();
      expect(Object.isFrozen(ctx)).toBe(true);
    });

    it('freezes sub-snapshots', async () => {
      const ctx = await runtime.buildContext();
      expect(Object.isFrozen(ctx.memory)).toBe(true);
      expect(Object.isFrozen(ctx.knowledge)).toBe(true);
      expect(Object.isFrozen(ctx.identity)).toBe(true);
      expect(Object.isFrozen(ctx.desktop)).toBe(true);
      expect(Object.isFrozen(ctx.workflow)).toBe(true);
      expect(Object.isFrozen(ctx.experience)).toBe(true);
      expect(Object.isFrozen(ctx.conversation)).toBe(true);
    });
  });

  // ── refreshContext ────────────────────────────────────────────

  describe('refreshContext', () => {
    it('returns a UnifiedContext', async () => {
      const ctx = await runtime.refreshContext();
      expect(ctx.userId).toBe('user-1');
    });

    it('publishes ContextRefreshed event', async () => {
      await runtime.refreshContext();
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith(
        'ContextRefreshed',
        expect.objectContaining({ eventType: 'ContextRefreshed' }),
      );
    });

    it('updates the stored context', async () => {
      const ctx = await runtime.refreshContext();
      expect(runtime.getContext()).toBe(ctx);
    });
  });

  // ── getContext ────────────────────────────────────────────────

  describe('getContext', () => {
    it('returns null before any build', () => {
      expect(runtime.getContext()).toBeNull();
    });
  });

  // ── getSnapshot ───────────────────────────────────────────────

  describe('getSnapshot', () => {
    it('returns undefined before build', () => {
      expect(runtime.getSnapshot('memory')).toBeUndefined();
    });

    it('returns memory snapshot after build', async () => {
      await runtime.buildContext();
      const snap = runtime.getSnapshot('memory');
      expect(snap).toBeDefined();
      expect((snap as any).workingEntries).toBe(1);
    });

    it('returns knowledge snapshot', async () => {
      await runtime.buildContext();
      const snap = runtime.getSnapshot('knowledge');
      expect((snap as any).itemCount).toBe(99);
    });

    it('returns identity snapshot', async () => {
      await runtime.buildContext();
      const snap = runtime.getSnapshot('identity');
      expect((snap as any).roles).toEqual(['admin', 'dev']);
    });

    it('returns desktop snapshot', async () => {
      await runtime.buildContext();
      const snap = runtime.getSnapshot('desktop');
      expect((snap as any).openWindows).toBe(7);
    });

    it('returns workflow snapshot', async () => {
      await runtime.buildContext();
      const snap = runtime.getSnapshot('workflow');
      expect((snap as any).activeWorkflows).toBe(2);
    });

    it('returns experience snapshot', async () => {
      await runtime.buildContext();
      const snap = runtime.getSnapshot('experience');
      expect((snap as any).currentPhase).toBe('Adapting');
    });

    it('returns conversation snapshot', async () => {
      await runtime.buildContext();
      const snap = runtime.getSnapshot('conversation');
      expect((snap as any).turnCount).toBe(5);
    });

    it('returns undefined for unknown snapshot type', async () => {
      await runtime.buildContext();
      expect(runtime.getSnapshot('nonexistent')).toBeUndefined();
    });
  });

  // ── Error handling ────────────────────────────────────────────

  describe('error handling', () => {
    it('handles memory query errors gracefully', async () => {
      contracts.memory.query = vi.fn(() => { throw new Error('boom'); });
      const ctx = await runtime.buildContext();
      expect(ctx.memory.recentKeys).toEqual([]);
    });

    it('handles knowledge errors gracefully', async () => {
      contracts.knowledge.getNamespaces = vi.fn(async () => { throw new Error('boom'); });
      contracts.knowledge.getItemCount = vi.fn(async () => { throw new Error('boom'); });
      contracts.knowledge.getRecentItems = vi.fn(async () => { throw new Error('boom'); });
      const ctx = await runtime.buildContext();
      expect(ctx.knowledge.namespaceCount).toBe(0);
      expect(ctx.knowledge.itemCount).toBe(0);
    });

    it('handles identity resolvePreference errors gracefully', async () => {
      contracts.identity.resolvePreference = vi.fn(() => { throw new Error('boom'); });
      const ctx = await runtime.buildContext();
      expect(ctx.identity.organizationId).toBeNull();
    });

    it('handles workflow recentCompletions errors gracefully', async () => {
      contracts.workflow.getRecentCompletions = vi.fn(() => { throw new Error('boom'); });
      const ctx = await runtime.buildContext();
      expect(ctx.workflow.recentCompletions).toEqual([]);
    });

    it('handles experience errors gracefully', async () => {
      contracts.experience.getActiveAdaptations = vi.fn(() => { throw new Error('boom'); });
      contracts.experience.getRecommendations = vi.fn(() => { throw new Error('boom'); });
      contracts.experience.getCurrentPhase = vi.fn(() => { throw new Error('boom'); });
      const ctx = await runtime.buildContext();
      expect(ctx.experience.adaptationCount).toBe(0);
      expect(ctx.experience.recommendationCount).toBe(0);
      expect(ctx.experience.currentPhase).toBe('unknown');
    });

    it('handles cognitive errors gracefully', async () => {
      contracts.cognitive.getCurrentIntent = vi.fn(() => { throw new Error('boom'); });
      contracts.cognitive.getConversationTurnCount = vi.fn(() => { throw new Error('boom'); });
      contracts.cognitive.getCurrentSessionId = vi.fn(() => { throw new Error('boom'); });
      const ctx = await runtime.buildContext();
      expect(ctx.conversation.currentIntent).toBeNull();
      expect(ctx.conversation.turnCount).toBe(0);
      expect(ctx.conversation.sessionId).toBeNull();
    });

    it('handles memory session/working errors gracefully', async () => {
      contracts.memory.getSessionEntries = vi.fn(() => { throw new Error('boom'); });
      contracts.memory.getWorkingEntries = vi.fn(() => { throw new Error('boom'); });
      const ctx = await runtime.buildContext();
      expect(ctx.memory.sessionEntries).toBe(0);
      expect(ctx.memory.workingEntries).toBe(0);
    });
  });
});
