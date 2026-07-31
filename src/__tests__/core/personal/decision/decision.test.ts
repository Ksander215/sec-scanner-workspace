import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PersonalRuntimeContracts } from '../../../../core/personal/contracts.js';
import { DecisionRuntime } from '../../../../core/personal/decision-runtime.js';
import { DecisionMethod } from '../../../../core/personal/types.js';
import { DecisionError } from '../../../../core/personal/errors.js';

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

describe('DecisionRuntime', () => {
  let contracts: PersonalRuntimeContracts;
  let runtime: DecisionRuntime;

  beforeEach(() => {
    contracts = createMockContracts();
    runtime = new DecisionRuntime(contracts);
  });

  // ── createDecision ──────────────────────────────────────────
  describe('createDecision', () => {
    it('creates a decision with id', () => {
      const d = runtime.createDecision('Choose framework', 'Pick a JS framework', DecisionMethod.ProsCons);
      expect(d.id).toBeDefined();
    });

    it('stores the title', () => {
      const d = runtime.createDecision('Choose framework', 'desc', DecisionMethod.ProsCons);
      expect(d.title).toBe('Choose framework');
    });

    it('stores the method', () => {
      const d = runtime.createDecision('T', 'd', DecisionMethod.SWOT);
      expect(d.method).toBe(DecisionMethod.SWOT);
    });

    it('sets conclusion to null', () => {
      const d = runtime.createDecision('T', 'd', DecisionMethod.ProsCons);
      expect(d.conclusion).toBeNull();
    });

    it('sets resolvedAt to null', () => {
      const d = runtime.createDecision('T', 'd', DecisionMethod.ProsCons);
      expect(d.resolvedAt).toBeNull();
    });

    it('trims title', () => {
      const d = runtime.createDecision('  Title  ', 'desc', DecisionMethod.ProsCons);
      expect(d.title).toBe('Title');
    });

    it('throws for empty title', () => {
      expect(() => runtime.createDecision('  ', 'desc', DecisionMethod.ProsCons)).toThrow(DecisionError);
    });

    it('creates with initial options', () => {
      const d = runtime.createDecision('T', 'd', DecisionMethod.ProsCons, [
        { title: 'Option A', pros: ['fast'], cons: ['complex'] },
        { title: 'Option B', pros: ['simple'] },
      ]);
      expect(d.options).toHaveLength(2);
    });

    it('option has id and null score', () => {
      const d = runtime.createDecision('T', 'd', DecisionMethod.ProsCons, [
        { title: 'A', pros: ['good'] },
      ]);
      expect(d.options[0].id).toBeDefined();
      expect(d.options[0].score).toBeNull();
    });

    it('option stores pros and cons', () => {
      const d = runtime.createDecision('T', 'd', DecisionMethod.ProsCons, [
        { title: 'A', pros: ['p1'], cons: ['c1'], risks: ['r1'] },
      ]);
      expect(d.options[0].pros).toEqual(['p1']);
      expect(d.options[0].cons).toEqual(['c1']);
      expect(d.options[0].risks).toEqual(['r1']);
    });

    it('throws on capacity exceeded', () => {
      const rt = new DecisionRuntime(contracts, { maxDecisions: 1 });
      rt.createDecision('A', 'd', DecisionMethod.ProsCons);
      expect(() => rt.createDecision('B', 'd', DecisionMethod.ProsCons)).toThrow(DecisionError);
    });

    it('publishes DecisionCreated event', () => {
      runtime.createDecision('T', 'd', DecisionMethod.ProsCons);
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith('DecisionCreated', expect.any(Object));
    });
  });

  // ── addOption ───────────────────────────────────────────────
  describe('addOption', () => {
    it('adds an option to a decision', () => {
      const d = runtime.createDecision('T', 'd', DecisionMethod.ProsCons);
      const updated = runtime.addOption(d.id, { title: 'New Option', pros: ['good'] });
      expect(updated.options).toHaveLength(1);
    });

    it('throws for unknown decision', () => {
      expect(() => runtime.addOption('nonexistent', { title: 'X' })).toThrow(DecisionError);
    });

    it('throws for resolved decision', () => {
      const d = runtime.createDecision('T', 'd', DecisionMethod.ProsCons);
      runtime.resolveDecision(d.id, 'Done');
      expect(() => runtime.addOption(d.id, { title: 'X' })).toThrow(DecisionError);
    });

    it('throws for empty option title', () => {
      const d = runtime.createDecision('T', 'd', DecisionMethod.ProsCons);
      expect(() => runtime.addOption(d.id, { title: '  ' })).toThrow(DecisionError);
    });
  });

  // ── scoreOption ─────────────────────────────────────────────
  describe('scoreOption', () => {
    it('sets score on an option', () => {
      const d = runtime.createDecision('T', 'd', DecisionMethod.ProsCons, [
        { title: 'A' },
      ]);
      const updated = runtime.scoreOption(d.id, d.options[0].id, 75);
      expect(updated.options[0].score).toBe(75);
    });

    it('clamps score to [-100, 100]', () => {
      const d = runtime.createDecision('T', 'd', DecisionMethod.ProsCons, [
        { title: 'A' },
      ]);
      const u1 = runtime.scoreOption(d.id, d.options[0].id, 200);
      expect(u1.options[0].score).toBe(100);
      const u2 = runtime.scoreOption(d.id, d.options[0].id, -200);
      expect(u2.options[0].score).toBe(-100);
    });

    it('rounds score', () => {
      const d = runtime.createDecision('T', 'd', DecisionMethod.ProsCons, [
        { title: 'A' },
      ]);
      const updated = runtime.scoreOption(d.id, d.options[0].id, 75.7);
      expect(updated.options[0].score).toBe(76);
    });

    it('throws for unknown decision', () => {
      expect(() => runtime.scoreOption('nonexistent', 'opt', 50)).toThrow(DecisionError);
    });
  });

  // ── resolve ────────────────────────────────────────────────
  describe('resolveDecision', () => {
    it('sets conclusion', () => {
      const d = runtime.createDecision('T', 'd', DecisionMethod.ProsCons);
      const resolved = runtime.resolveDecision(d.id, 'Chose option A');
      expect(resolved.conclusion).toBe('Chose option A');
    });

    it('sets resolvedAt', () => {
      const d = runtime.createDecision('T', 'd', DecisionMethod.ProsCons);
      const resolved = runtime.resolveDecision(d.id, 'Done');
      expect(resolved.resolvedAt).not.toBeNull();
    });

    it('throws for unknown decision', () => {
      expect(() => runtime.resolveDecision('nonexistent', 'X')).toThrow(DecisionError);
    });

    it('throws for already resolved', () => {
      const d = runtime.createDecision('T', 'd', DecisionMethod.ProsCons);
      runtime.resolveDecision(d.id, 'Done');
      expect(() => runtime.resolveDecision(d.id, 'Again')).toThrow(DecisionError);
    });

    it('throws for empty conclusion', () => {
      const d = runtime.createDecision('T', 'd', DecisionMethod.ProsCons);
      expect(() => runtime.resolveDecision(d.id, '  ')).toThrow(DecisionError);
    });

    it('publishes DecisionResolved event', () => {
      const d = runtime.createDecision('T', 'd', DecisionMethod.ProsCons);
      runtime.resolveDecision(d.id, 'Done');
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith('DecisionResolved', expect.any(Object));
    });

    it('trims conclusion', () => {
      const d = runtime.createDecision('T', 'd', DecisionMethod.ProsCons);
      const resolved = runtime.resolveDecision(d.id, '  Done  ');
      expect(resolved.conclusion).toBe('Done');
    });
  });

  // ── getDecision / getDecisions ─────────────────────────────
  describe('queries', () => {
    it('getDecision returns by id', () => {
      const d = runtime.createDecision('T', 'd', DecisionMethod.ProsCons);
      expect(runtime.getDecision(d.id).id).toBe(d.id);
    });

    it('getDecision throws for unknown', () => {
      expect(() => runtime.getDecision('nonexistent')).toThrow(DecisionError);
    });

    it('getUnresolved returns only unresolved', () => {
      const d1 = runtime.createDecision('A', 'd', DecisionMethod.ProsCons);
      const d2 = runtime.createDecision('B', 'd', DecisionMethod.ProsCons);
      runtime.resolveDecision(d2.id, 'Done');
      expect(runtime.getUnresolved()).toHaveLength(1);
      expect(runtime.getUnresolved()[0].id).toBe(d1.id);
    });

    it('getResolved returns only resolved', () => {
      const d1 = runtime.createDecision('A', 'd', DecisionMethod.ProsCons);
      runtime.resolveDecision(d1.id, 'Done');
      runtime.createDecision('B', 'd', DecisionMethod.ProsCons);
      expect(runtime.getResolved()).toHaveLength(1);
    });

    it('getAllDecisions returns all', () => {
      runtime.createDecision('A', 'd', DecisionMethod.ProsCons);
      runtime.createDecision('B', 'd', DecisionMethod.SWOT);
      expect(runtime.getAllDecisions()).toHaveLength(2);
    });

    it('getDecisionCount returns count', () => {
      runtime.createDecision('A', 'd', DecisionMethod.ProsCons);
      expect(runtime.getDecisionCount()).toBe(1);
    });

    it('getBestOption returns highest scored option', () => {
      const d = runtime.createDecision('T', 'd', DecisionMethod.ProsCons, [
        { title: 'A' },
        { title: 'B' },
      ]);
      runtime.scoreOption(d.id, d.options[0].id, 30);
      runtime.scoreOption(d.id, d.options[1].id, 80);
      const best = runtime.getBestOption(d.id);
      expect(best!.title).toBe('B');
    });

    it('getBestOption returns null when none scored', () => {
      const d = runtime.createDecision('T', 'd', DecisionMethod.ProsCons, [
        { title: 'A' },
      ]);
      expect(runtime.getBestOption(d.id)).toBeNull();
    });

    it('getMethodComparison returns stats for all methods', () => {
      runtime.createDecision('A', 'd', DecisionMethod.ProsCons);
      runtime.createDecision('B', 'd', DecisionMethod.SWOT);
      const comp = runtime.getMethodComparison();
      expect(comp[DecisionMethod.ProsCons].count).toBe(1);
      expect(comp[DecisionMethod.SWOT].count).toBe(1);
      expect(comp[DecisionMethod.RiskAnalysis].count).toBe(0);
    });

    it('deleteDecision removes a decision', () => {
      const d = runtime.createDecision('A', 'd', DecisionMethod.ProsCons);
      runtime.deleteDecision(d.id);
      expect(runtime.getDecisionCount()).toBe(0);
    });

    it('deleteDecision throws for unknown', () => {
      expect(() => runtime.deleteDecision('nonexistent')).toThrow(DecisionError);
    });
  });
});
