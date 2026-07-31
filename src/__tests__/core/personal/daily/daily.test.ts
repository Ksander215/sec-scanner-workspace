import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PersonalRuntimeContracts } from '../../../../core/personal/contracts.js';
import { DailyBriefRuntime } from '../../../../core/personal/daily-brief-runtime.js';
import { BriefType } from '../../../../core/personal/types.js';
import { DailyBriefError } from '../../../../core/personal/errors.js';

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

describe('DailyBriefRuntime', () => {
  let contracts: PersonalRuntimeContracts;
  let runtime: DailyBriefRuntime;

  beforeEach(() => {
    contracts = createMockContracts();
    runtime = new DailyBriefRuntime(contracts);
  });

  // ── generateBrief ──────────────────────────────────────────
  describe('generateBrief', () => {
    it('creates a brief with id', () => {
      const b = runtime.generateBrief({
        type: BriefType.MorningBrief, date: '2024-01-15', summary: 'Good morning',
      });
      expect(b.id).toBeDefined();
    });

    it('stores the type', () => {
      const b = runtime.generateBrief({
        type: BriefType.EveningSummary, date: '2024-01-15', summary: 'Good evening',
      });
      expect(b.type).toBe(BriefType.EveningSummary);
    });

    it('stores the date', () => {
      const b = runtime.generateBrief({
        type: BriefType.MorningBrief, date: '2024-01-15', summary: 'Morning',
      });
      expect(b.date).toBe('2024-01-15');
    });

    it('trims the summary', () => {
      const b = runtime.generateBrief({
        type: BriefType.MorningBrief, date: '2024-01-15', summary: '  Hello  ',
      });
      expect(b.summary).toBe('Hello');
    });

    it('throws for empty summary', () => {
      expect(() =>
        runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: '  ' }),
      ).toThrow(DailyBriefError);
    });

    it('stores keyPoints when provided', () => {
      const b = runtime.generateBrief({
        type: BriefType.MorningBrief, date: '2024-01-15', summary: 'S',
        keyPoints: ['Point A', 'Point B'],
      });
      expect(b.keyPoints).toEqual(['Point A', 'Point B']);
    });

    it('stores metrics when provided', () => {
      const b = runtime.generateBrief({
        type: BriefType.MorningBrief, date: '2024-01-15', summary: 'S',
        metrics: { productivity: 85, focus: 72 },
      });
      expect(b.metrics.productivity).toBe(85);
    });

    it('empty metrics by default', () => {
      const b = runtime.generateBrief({
        type: BriefType.MorningBrief, date: '2024-01-15', summary: 'S',
      });
      expect(b.metrics).toEqual({});
    });

    it('publishes DailyBriefGenerated event', () => {
      runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: 'S' });
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith('DailyBriefGenerated', expect.any(Object));
    });

    it('evicts oldest when at capacity', () => {
      const rt = new DailyBriefRuntime(contracts, { maxBriefs: 2 });
      rt.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-01', summary: 'A' });
      rt.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-02', summary: 'B' });
      rt.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-03', summary: 'C' });
      expect(rt.getBriefCount()).toBe(2);
    });
  });

  // ── deliver ───────────────────────────────────────────────
  describe('deliverBrief', () => {
    it('marks brief as delivered', () => {
      const b = runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: 'S' });
      runtime.deliverBrief(b.id);
      expect(runtime.isDelivered(b.id)).toBe(true);
    });

    it('throws for unknown brief', () => {
      expect(() => runtime.deliverBrief('nonexistent')).toThrow(DailyBriefError);
    });

    it('publishes DailyBriefDelivered event', () => {
      const b = runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: 'S' });
      runtime.deliverBrief(b.id);
      expect(contracts.platform.publishEvent).toHaveBeenCalledWith('DailyBriefDelivered', expect.any(Object));
    });

    it('is idempotent', () => {
      const b = runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: 'S' });
      runtime.deliverBrief(b.id);
      runtime.deliverBrief(b.id);
      expect(runtime.getDeliveredBriefs()).toHaveLength(1);
    });
  });

  // ── getBrief / getBriefs ───────────────────────────────────
  describe('queries', () => {
    it('getBrief returns by id', () => {
      const b = runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: 'S' });
      expect(runtime.getBrief(b.id).id).toBe(b.id);
    });

    it('getBrief throws for unknown', () => {
      expect(() => runtime.getBrief('nonexistent')).toThrow(DailyBriefError);
    });

    it('getBriefsByDate filters by date', () => {
      runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: 'A' });
      runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-16', summary: 'B' });
      expect(runtime.getBriefsByDate('2024-01-15')).toHaveLength(1);
    });

    it('getBriefsByType filters by type', () => {
      runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: 'A' });
      runtime.generateBrief({ type: BriefType.EveningSummary, date: '2024-01-15', summary: 'B' });
      expect(runtime.getBriefsByType(BriefType.MorningBrief)).toHaveLength(1);
    });

    it('getLatestBrief returns most recent', () => {
      runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: 'A' });
      runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-16', summary: 'B' });
      const latest = runtime.getLatestBrief()!;
      expect(latest.date).toBe('2024-01-16');
      expect(latest.summary).toBe('B');
    });

    it('getLatestBrief returns null when empty', () => {
      expect(runtime.getLatestBrief()).toBeNull();
    });

    it('getUndeliveredBriefs returns undelivered', () => {
      const b1 = runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: 'A' });
      const b2 = runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-16', summary: 'B' });
      runtime.deliverBrief(b1.id);
      expect(runtime.getUndeliveredBriefs()).toHaveLength(1);
      expect(runtime.getUndeliveredBriefs()[0].id).toBe(b2.id);
    });

    it('getDeliveredBriefs returns delivered', () => {
      const b1 = runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: 'A' });
      runtime.deliverBrief(b1.id);
      expect(runtime.getDeliveredBriefs()).toHaveLength(1);
    });

    it('getAllBriefs returns all', () => {
      runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: 'A' });
      runtime.generateBrief({ type: BriefType.EveningSummary, date: '2024-01-15', summary: 'B' });
      expect(runtime.getAllBriefs()).toHaveLength(2);
    });

    it('deleteBrief removes a brief', () => {
      const b = runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: 'A' });
      runtime.deleteBrief(b.id);
      expect(runtime.getBriefCount()).toBe(0);
    });

    it('deleteBrief throws for unknown', () => {
      expect(() => runtime.deleteBrief('nonexistent')).toThrow(DailyBriefError);
    });
  });

  // ── getMetricHistory ───────────────────────────────────────
  describe('getMetricHistory', () => {
    it('returns entries for a metric key', () => {
      runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: 'S', metrics: { productivity: 80 } });
      runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-16', summary: 'S', metrics: { productivity: 90 } });
      const history = runtime.getMetricHistory('productivity');
      expect(history).toHaveLength(2);
    });

    it('returns empty for unknown metric', () => {
      runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: 'S', metrics: { a: 1 } });
      expect(runtime.getMetricHistory('nonexistent')).toHaveLength(0);
    });

    it('respects limit parameter', () => {
      runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: 'S', metrics: { p: 1 } });
      runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-16', summary: 'S', metrics: { p: 2 } });
      runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-17', summary: 'S', metrics: { p: 3 } });
      expect(runtime.getMetricHistory('p', 2)).toHaveLength(2);
    });

    it('is sorted by date descending', () => {
      runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: 'S', metrics: { p: 1 } });
      runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-16', summary: 'S', metrics: { p: 2 } });
      const history = runtime.getMetricHistory('p');
      expect(history[0].date).toBe('2024-01-16');
    });
  });

  // ── getMetricTrend (getTrendAnalysis) ──────────────────────
  describe('getMetricTrend', () => {
    it('returns unknown for insufficient data', () => {
      expect(runtime.getMetricTrend('p')).toBe('unknown');
    });

    it('returns stable when values are flat', () => {
      runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: 'S', metrics: { p: 50 } });
      runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-16', summary: 'S', metrics: { p: 50 } });
      expect(runtime.getMetricTrend('p')).toBe('stable');
    });

    it('returns improving when values increase', () => {
      runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: 'S', metrics: { p: 50 } });
      runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-16', summary: 'S', metrics: { p: 100 } });
      expect(runtime.getMetricTrend('p')).toBe('improving');
    });

    it('returns declining when values decrease', () => {
      runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-15', summary: 'S', metrics: { p: 100 } });
      runtime.generateBrief({ type: BriefType.MorningBrief, date: '2024-01-16', summary: 'S', metrics: { p: 50 } });
      expect(runtime.getMetricTrend('p')).toBe('declining');
    });
  });
});
