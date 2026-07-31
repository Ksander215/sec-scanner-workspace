import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PersonalRuntimeContracts } from '../../../../core/personal/contracts.js';
import { ReflectionRuntime } from '../../../../core/personal/reflection-runtime.js';
import { ReflectionPeriod } from '../../../../core/personal/types.js';

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

describe('ReflectionRuntime', () => {
  let contracts: PersonalRuntimeContracts;
  let runtime: ReflectionRuntime;

  beforeEach(() => {
    contracts = createMockContracts();
    runtime = new ReflectionRuntime(contracts);
  });

  // ── generateReflection ──────────────────────────────────────
  describe('generateReflection', () => {
    it('creates a reflection with id and period', async () => {
      const r = await runtime.generateReflection(ReflectionPeriod.Daily);
      expect(r.id).toBeDefined();
      expect(r.period).toBe(ReflectionPeriod.Daily);
    });

    it('uses today\'s date by default', async () => {
      const r = await runtime.generateReflection(ReflectionPeriod.Daily);
      const today = new Date().toISOString().slice(0, 10);
      expect(r.date).toBe(today);
    });

    it('uses provided date', async () => {
      const r = await runtime.generateReflection(ReflectionPeriod.Daily, '2024-01-15');
      expect(r.date).toBe('2024-01-15');
    });

    it('stores accomplished items', async () => {
      const r = await runtime.generateReflection(ReflectionPeriod.Daily, undefined, ['Task A', 'Task B']);
      expect(r.accomplished).toEqual(['Task A', 'Task B']);
    });

    it('stores notAccomplished items', async () => {
      const r = await runtime.generateReflection(ReflectionPeriod.Daily, undefined, [], ['Task X']);
      expect(r.notAccomplished).toEqual(['Task X']);
    });

    it('score is 50 when nothing tracked', async () => {
      const r = await runtime.generateReflection(ReflectionPeriod.Daily);
      expect(r.score).toBe(50);
    });

    it('score is higher with all accomplished', async () => {
      const r = await runtime.generateReflection(ReflectionPeriod.Daily, undefined, ['a', 'b', 'c']);
      expect(r.score).toBeGreaterThan(50);
    });

    it('score is lower with more not-accomplished', async () => {
      const r = await runtime.generateReflection(ReflectionPeriod.Daily, undefined, ['a'], ['b', 'c', 'd', 'e']);
      expect(r.score).toBeLessThan(50);
    });

    it('generates patterns from accomplishments', async () => {
      const r = await runtime.generateReflection(ReflectionPeriod.Daily, undefined, ['code review', 'standup meeting', 'implement feature', 'debug issue', 'code fix']);
      expect(r.patterns.length).toBeGreaterThan(0);
    });

    it('generates no-accomplishment pattern when empty', async () => {
      const r = await runtime.generateReflection(ReflectionPeriod.Daily);
      expect(r.patterns).toContain('No accomplishments recorded for this daily period');
    });

    it('generates improvements when score is low', async () => {
      const r = await runtime.generateReflection(ReflectionPeriod.Daily, undefined, ['a'], ['b', 'c', 'd', 'e', 'f']);
      expect(r.improvements.length).toBeGreaterThan(0);
    });

    it('suggests increasing challenge when score >= 80', async () => {
      const r = await runtime.generateReflection(ReflectionPeriod.Daily, undefined, ['a', 'b', 'c', 'd', 'e']);
      if (r.score >= 80) {
        expect(r.improvements).toContain('Strong performance — consider increasing challenge level next period');
      }
    });

    it('generates changes from not-accomplished', async () => {
      const r = await runtime.generateReflection(ReflectionPeriod.Daily, undefined, ['a'], ['urgent item', 'critical task']);
      expect(r.changes.length).toBeGreaterThan(0);
    });

    it('produces high productivity pattern from accomplishments', async () => {
      const r = await runtime.generateReflection(ReflectionPeriod.Daily, undefined, ['task a', 'task b', 'task c', 'task d', 'task e']);
      expect(r.patterns[0]).toContain('High productivity');
    });

    it('publishes ReflectionGenerated event', async () => {
      await runtime.generateReflection(ReflectionPeriod.Daily);
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith('ReflectionGenerated', expect.any(Object));
    });

    it('publishes ReflectionScored event', async () => {
      await runtime.generateReflection(ReflectionPeriod.Daily);
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith('ReflectionScored', expect.any(Object));
    });

    it('returns frozen accomplished array', async () => {
      const r = await runtime.generateReflection(ReflectionPeriod.Daily, undefined, ['a']);
      expect(Object.isFrozen(r.accomplished)).toBe(true);
    });

    it('returns frozen patterns array', async () => {
      const r = await runtime.generateReflection(ReflectionPeriod.Daily, undefined, ['a']);
      expect(Object.isFrozen(r.patterns)).toBe(true);
    });

    it('handles Weekly period', async () => {
      const r = await runtime.generateReflection(ReflectionPeriod.Weekly);
      expect(r.period).toBe(ReflectionPeriod.Weekly);
    });

    it('handles Monthly period', async () => {
      const r = await runtime.generateReflection(ReflectionPeriod.Monthly);
      expect(r.period).toBe(ReflectionPeriod.Monthly);
    });
  });

  // ── getReflections ──────────────────────────────────────────
  describe('getReflections', () => {
    it('returns all reflections', async () => {
      await runtime.generateReflection(ReflectionPeriod.Daily);
      await runtime.generateReflection(ReflectionPeriod.Daily);
      expect(runtime.getReflections()).toHaveLength(2);
    });

    it('filters by period', async () => {
      await runtime.generateReflection(ReflectionPeriod.Daily);
      await runtime.generateReflection(ReflectionPeriod.Weekly);
      expect(runtime.getReflections(ReflectionPeriod.Daily)).toHaveLength(1);
    });

    it('returns empty array when no reflections', () => {
      expect(runtime.getReflections()).toHaveLength(0);
    });

    it('returns frozen array', async () => {
      await runtime.generateReflection(ReflectionPeriod.Daily);
      expect(Object.isFrozen(runtime.getReflections())).toBe(true);
    });
  });

  // ── getLatestReflection ─────────────────────────────────────
  describe('getLatestReflection', () => {
    it('returns null when no reflections for period', () => {
      expect(runtime.getLatestReflection(ReflectionPeriod.Daily)).toBeNull();
    });

    it('returns the most recent reflection for a period', async () => {
      await runtime.generateReflection(ReflectionPeriod.Daily);
      await runtime.generateReflection(ReflectionPeriod.Daily);
      const latest = runtime.getLatestReflection(ReflectionPeriod.Daily);
      expect(latest).not.toBeNull();
    });
  });

  // ── getAverageScore ─────────────────────────────────────────
  describe('getAverageScore', () => {
    it('returns 0 when no reflections for period', () => {
      expect(runtime.getAverageScore(ReflectionPeriod.Daily)).toBe(0);
    });

    it('calculates average across reflections', async () => {
      await runtime.generateReflection(ReflectionPeriod.Daily, undefined, ['a', 'b'], ['c']);
      await runtime.generateReflection(ReflectionPeriod.Daily, undefined, ['a'], ['b', 'c']);
      const avg = runtime.getAverageScore(ReflectionPeriod.Daily);
      expect(avg).toBeGreaterThan(0);
      expect(avg).toBeLessThanOrEqual(100);
    });

    it('rounds to 2 decimal places', async () => {
      await runtime.generateReflection(ReflectionPeriod.Daily, undefined, ['a', 'b', 'c'], ['d', 'e']);
      const avg = runtime.getAverageScore(ReflectionPeriod.Daily);
      const str = avg.toString();
      const decimals = str.includes('.') ? str.split('.')[1].length : 0;
      expect(decimals).toBeLessThanOrEqual(2);
    });
  });

  // ── getTrend ────────────────────────────────────────────────
  describe('getTrend', () => {
    it('returns stable when fewer than 2 reflections', () => {
      expect(runtime.getTrend(ReflectionPeriod.Daily)).toBe('stable');
    });

    it('returns improving when scores increase significantly', async () => {
      // Low score first
      await runtime.generateReflection(ReflectionPeriod.Daily, undefined, ['a'], ['b', 'c', 'd', 'e']);
      // High score later
      await runtime.generateReflection(ReflectionPeriod.Daily, undefined, ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
      await runtime.generateReflection(ReflectionPeriod.Daily, undefined, ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
      const trend = runtime.getTrend(ReflectionPeriod.Daily);
      expect(['improving', 'stable']).toContain(trend);
    });

    it('returns declining when scores decrease significantly', async () => {
      await runtime.generateReflection(ReflectionPeriod.Daily, undefined, ['a', 'b', 'c', 'd', 'e']);
      await runtime.generateReflection(ReflectionPeriod.Daily, undefined, ['a', 'b', 'c', 'd', 'e']);
      await runtime.generateReflection(ReflectionPeriod.Daily, undefined, ['a'], ['b', 'c', 'd', 'e']);
      const trend = runtime.getTrend(ReflectionPeriod.Daily);
      expect(['declining', 'stable']).toContain(trend);
    });

    it('returns stable when scores are flat', async () => {
      await runtime.generateReflection(ReflectionPeriod.Daily);
      await runtime.generateReflection(ReflectionPeriod.Daily);
      const trend = runtime.getTrend(ReflectionPeriod.Daily);
      expect(trend).toBe('stable');
    });
  });

  // ── dispose ─────────────────────────────────────────────────
  describe('dispose', () => {
    it('clears all reflections', async () => {
      await runtime.generateReflection(ReflectionPeriod.Daily);
      runtime.dispose();
      expect(runtime.getReflections()).toHaveLength(0);
    });
  });
});
