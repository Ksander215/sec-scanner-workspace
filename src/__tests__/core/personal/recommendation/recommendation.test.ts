import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PersonalRuntimeContracts } from '../../../../core/personal/contracts.js';
import { RecommendationRuntime } from '../../../../core/personal/recommendation-runtime.js';
import { RecommendationType } from '../../../../core/personal/types.js';
import { RecommendationError } from '../../../../core/personal/errors.js';

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

describe('RecommendationRuntime', () => {
  let contracts: PersonalRuntimeContracts;
  let runtime: RecommendationRuntime;

  beforeEach(() => {
    contracts = createMockContracts();
    runtime = new RecommendationRuntime(contracts);
  });

  // ── generateRecommendation ──────────────────────────────────
  describe('generateRecommendation', () => {
    it('creates a recommendation with required fields', () => {
      const r = runtime.generateRecommendation(
        RecommendationType.Action, 'Take a break', 'Rest your eyes', 'High focus time', 0.8,
      );
      expect(r.id).toBeDefined();
      expect(r.title).toBe('Take a break');
      expect(r.type).toBe(RecommendationType.Action);
    });

    it('sets accepted and dismissed to false', () => {
      const r = runtime.generateRecommendation(
        RecommendationType.Action, 'Title', 'desc', 'reason', 0.5,
      );
      expect(r.accepted).toBe(false);
      expect(r.dismissed).toBe(false);
    });

    it('trims title', () => {
      const r = runtime.generateRecommendation(
        RecommendationType.Action, '  Title  ', 'desc', 'reason', 0.5,
      );
      expect(r.title).toBe('Title');
    });

    it('trims description', () => {
      const r = runtime.generateRecommendation(
        RecommendationType.Action, 'Title', '  desc  ', 'reason', 0.5,
      );
      expect(r.description).toBe('desc');
    });

    it('clamps confidence to [0, 1]', () => {
      const r1 = runtime.generateRecommendation(
        RecommendationType.Action, 'A', 'd', 'r', 2.0,
      );
      expect(r1.confidence).toBe(1);

      const r2 = runtime.generateRecommendation(
        RecommendationType.Action, 'B', 'd', 'r', -1.0,
      );
      expect(r2.confidence).toBe(0);
    });

    it('throws for empty title', () => {
      expect(() =>
        runtime.generateRecommendation(RecommendationType.Action, '  ', 'desc', 'reason', 0.5),
      ).toThrow(RecommendationError);
    });

    it('stores goalId when provided', () => {
      const r = runtime.generateRecommendation(
        RecommendationType.Action, 'T', 'd', 'r', 0.5, 'goal-1',
      );
      expect(r.goalId).toBe('goal-1');
    });

    it('sets goalId to null when not provided', () => {
      const r = runtime.generateRecommendation(
        RecommendationType.Action, 'T', 'd', 'r', 0.5,
      );
      expect(r.goalId).toBeNull();
    });

    it('stores expiresAt when provided', () => {
      const exp = new Date(Date.now() + 86400000).toISOString();
      const r = runtime.generateRecommendation(
        RecommendationType.Action, 'T', 'd', 'r', 0.5, undefined, exp,
      );
      expect(r.expiresAt).toBe(exp);
    });

    it('sets expiresAt to null when not provided', () => {
      const r = runtime.generateRecommendation(
        RecommendationType.Action, 'T', 'd', 'r', 0.5,
      );
      expect(r.expiresAt).toBeNull();
    });

    it('publishes RecommendationGenerated event', () => {
      runtime.generateRecommendation(RecommendationType.Action, 'T', 'd', 'r', 0.5);
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith('RecommendationGenerated', expect.any(Object));
    });

    it('evicts oldest when at capacity', () => {
      const small = new RecommendationRuntime(contracts, 3);
      small.generateRecommendation(RecommendationType.Action, 'R1', 'd', 'r', 0.5);
      small.generateRecommendation(RecommendationType.Action, 'R2', 'd', 'r', 0.5);
      small.generateRecommendation(RecommendationType.Action, 'R3', 'd', 'r', 0.5);
      // 4th should evict oldest
      const r4 = small.generateRecommendation(RecommendationType.Action, 'R4', 'd', 'r', 0.5);
      expect(small.getRecommendations()).toHaveLength(3);
      expect(small.getRecommendations().find(r => r.id === r4.id)).toBeDefined();
    });
  });

  // ── acceptRecommendation ────────────────────────────────────
  describe('acceptRecommendation', () => {
    it('marks recommendation as accepted', () => {
      const r = runtime.generateRecommendation(RecommendationType.Action, 'T', 'd', 'r', 0.5);
      const accepted = runtime.acceptRecommendation(r.id);
      expect(accepted.accepted).toBe(true);
    });

    it('throws for unknown id', () => {
      expect(() => runtime.acceptRecommendation('nonexistent')).toThrow(RecommendationError);
    });

    it('is idempotent - accepting twice returns same', () => {
      const r = runtime.generateRecommendation(RecommendationType.Action, 'T', 'd', 'r', 0.5);
      const a1 = runtime.acceptRecommendation(r.id);
      const a2 = runtime.acceptRecommendation(r.id);
      expect(a1.id).toBe(a2.id);
    });

    it('throws when accepting a dismissed recommendation', () => {
      const r = runtime.generateRecommendation(RecommendationType.Action, 'T', 'd', 'r', 0.5);
      runtime.dismissRecommendation(r.id);
      expect(() => runtime.acceptRecommendation(r.id)).toThrow(RecommendationError);
    });

    it('preserves original createdAt', () => {
      const r = runtime.generateRecommendation(RecommendationType.Action, 'T', 'd', 'r', 0.5);
      const accepted = runtime.acceptRecommendation(r.id);
      expect(accepted.createdAt).toBe(r.createdAt);
    });

    it('publishes RecommendationAccepted event', () => {
      const r = runtime.generateRecommendation(RecommendationType.Action, 'T', 'd', 'r', 0.5);
      runtime.acceptRecommendation(r.id);
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith('RecommendationAccepted', expect.any(Object));
    });
  });

  // ── dismissRecommendation ───────────────────────────────────
  describe('dismissRecommendation', () => {
    it('marks recommendation as dismissed', () => {
      const r = runtime.generateRecommendation(RecommendationType.Action, 'T', 'd', 'r', 0.5);
      const dismissed = runtime.dismissRecommendation(r.id);
      expect(dismissed.dismissed).toBe(true);
    });

    it('throws for unknown id', () => {
      expect(() => runtime.dismissRecommendation('nonexistent')).toThrow(RecommendationError);
    });

    it('is idempotent', () => {
      const r = runtime.generateRecommendation(RecommendationType.Action, 'T', 'd', 'r', 0.5);
      const d1 = runtime.dismissRecommendation(r.id);
      const d2 = runtime.dismissRecommendation(r.id);
      expect(d1.id).toBe(d2.id);
    });

    it('throws when dismissing an accepted recommendation', () => {
      const r = runtime.generateRecommendation(RecommendationType.Action, 'T', 'd', 'r', 0.5);
      runtime.acceptRecommendation(r.id);
      expect(() => runtime.dismissRecommendation(r.id)).toThrow(RecommendationError);
    });

    it('publishes RecommendationDismissed event', () => {
      const r = runtime.generateRecommendation(RecommendationType.Action, 'T', 'd', 'r', 0.5);
      runtime.dismissRecommendation(r.id);
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith('RecommendationDismissed', expect.any(Object));
    });
  });

  // ── getRecommendations ──────────────────────────────────────
  describe('getRecommendations', () => {
    it('returns all recommendations', () => {
      runtime.generateRecommendation(RecommendationType.Action, 'A', 'd', 'r', 0.5);
      runtime.generateRecommendation(RecommendationType.Learning, 'B', 'd', 'r', 0.5);
      expect(runtime.getRecommendations()).toHaveLength(2);
    });

    it('filters by type', () => {
      runtime.generateRecommendation(RecommendationType.Action, 'A', 'd', 'r', 0.5);
      runtime.generateRecommendation(RecommendationType.Learning, 'B', 'd', 'r', 0.5);
      expect(runtime.getRecommendations(RecommendationType.Action)).toHaveLength(1);
    });

    it('returns empty array when no recommendations', () => {
      expect(runtime.getRecommendations()).toHaveLength(0);
    });

    it('returns frozen array', () => {
      runtime.generateRecommendation(RecommendationType.Action, 'T', 'd', 'r', 0.5);
      expect(Object.isFrozen(runtime.getRecommendations())).toBe(true);
    });
  });

  // ── getActiveRecommendations ────────────────────────────────
  describe('getActiveRecommendations', () => {
    it('returns only non-accepted, non-dismissed', () => {
      const a = runtime.generateRecommendation(RecommendationType.Action, 'Active', 'd', 'r', 0.5);
      const b = runtime.generateRecommendation(RecommendationType.Action, 'Accepted', 'd', 'r', 0.5);
      const c = runtime.generateRecommendation(RecommendationType.Action, 'Dismissed', 'd', 'r', 0.5);
      runtime.acceptRecommendation(b.id);
      runtime.dismissRecommendation(c.id);
      const active = runtime.getActiveRecommendations();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(a.id);
    });

    it('returns empty when all accepted or dismissed', () => {
      const a = runtime.generateRecommendation(RecommendationType.Action, 'A', 'd', 'r', 0.5);
      runtime.acceptRecommendation(a.id);
      expect(runtime.getActiveRecommendations()).toHaveLength(0);
    });
  });

  // ── getAcceptedCount / getDismissedCount ────────────────────
  describe('counts', () => {
    it('accepted count starts at 0', () => {
      expect(runtime.getAcceptedCount()).toBe(0);
    });

    it('dismissed count starts at 0', () => {
      expect(runtime.getDismissedCount()).toBe(0);
    });

    it('counts accepted recommendations', () => {
      const a = runtime.generateRecommendation(RecommendationType.Action, 'A', 'd', 'r', 0.5);
      const b = runtime.generateRecommendation(RecommendationType.Action, 'B', 'd', 'r', 0.5);
      runtime.acceptRecommendation(a.id);
      runtime.acceptRecommendation(b.id);
      expect(runtime.getAcceptedCount()).toBe(2);
    });

    it('counts dismissed recommendations', () => {
      const a = runtime.generateRecommendation(RecommendationType.Action, 'A', 'd', 'r', 0.5);
      runtime.dismissRecommendation(a.id);
      expect(runtime.getDismissedCount()).toBe(1);
    });

    it('does not double-count', () => {
      const a = runtime.generateRecommendation(RecommendationType.Action, 'A', 'd', 'r', 0.5);
      runtime.acceptRecommendation(a.id);
      runtime.acceptRecommendation(a.id); // idempotent
      expect(runtime.getAcceptedCount()).toBe(1);
    });
  });

  // ── cleanup ─────────────────────────────────────────────────
  describe('cleanup', () => {
    it('removes expired recommendations', () => {
      const past = new Date(Date.now() - 86400000).toISOString();
      const future = new Date(Date.now() + 86400000).toISOString();
      runtime.generateRecommendation(RecommendationType.Action, 'Expired', 'd', 'r', 0.5, undefined, past);
      runtime.generateRecommendation(RecommendationType.Action, 'Active', 'd', 'r', 0.5, undefined, future);
      const removed = runtime.cleanup();
      expect(removed).toBe(1);
      expect(runtime.getRecommendations()).toHaveLength(1);
    });

    it('returns 0 when nothing expired', () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      runtime.generateRecommendation(RecommendationType.Action, 'A', 'd', 'r', 0.5, undefined, future);
      expect(runtime.cleanup()).toBe(0);
    });

    it('keeps recommendations with no expiry', () => {
      runtime.generateRecommendation(RecommendationType.Action, 'NoExpiry', 'd', 'r', 0.5);
      runtime.cleanup();
      expect(runtime.getRecommendations()).toHaveLength(1);
    });
  });

  // ── dispose ─────────────────────────────────────────────────
  describe('dispose', () => {
    it('clears all recommendations', () => {
      runtime.generateRecommendation(RecommendationType.Action, 'T', 'd', 'r', 0.5);
      runtime.dispose();
      expect(runtime.getRecommendations()).toHaveLength(0);
    });
  });
});
