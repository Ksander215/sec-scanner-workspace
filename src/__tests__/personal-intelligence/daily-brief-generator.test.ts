import { describe, test, expect } from 'vitest';
import { DailyBriefGenerator } from '../../core/personal-intelligence/daily-brief-generator.js';
import { BriefType, BriefPriority, BriefItemCategory } from '../../core/personal-intelligence/types.js';
import { BriefNotFoundError } from '../../core/personal-intelligence/errors.js';

const mockPlatform = {
  publishEvent: async () => {},
  getConfiguration: () => null,
  getHealth: async () => null,
};
const mockIdentity = { getCurrentUserId: () => 'user-1', getUserRoles: () => ['admin'], getUserPreferences: () => ({}), resolvePreference: () => null };
const mockMemory = { retrieve: async () => null, store: async () => {}, query: () => [], getSessionEntries: () => [], getWorkingEntries: () => [] };
const mockKnowledge = { search: async () => [], getNamespaces: async () => [], getItemCount: async () => 0, getRecentItems: async () => [], getByTags: async () => [] };
const mockWorkflow = { getActiveWorkflows: () => [], getRunningInstances: () => [], getRecentCompletions: () => [], getAvailableWorkflows: () => [] };
const mockCognitive = { getCurrentIntent: () => null, getConversationTurnCount: () => 0, getCurrentSessionId: () => null, getConversationSummary: async () => null };
const mockPersonal = { getGoals: () => [], getActiveGoals: () => [], getRecommendations: () => [], getHabits: () => [], getReflections: () => [], getDecisions: () => [], getAttentionState: () => 'Focused' };
const mockAIProvider = { complete: async () => 'response', embed: async () => [0.1], isAvailable: () => true };
const mockExperience = { getActiveAdaptations: () => [], getRecommendations: () => [], getCurrentPhase: () => 'Observing', getBehaviorPatterns: () => [] };
const contracts = {
  identity: mockIdentity, memory: mockMemory, knowledge: mockKnowledge,
  workflow: mockWorkflow, cognitive: mockCognitive, personal: mockPersonal,
  aiProvider: mockAIProvider, experience: mockExperience, platform: mockPlatform,
};

describe('DailyBriefGenerator', () => {
test('constructs with default config', () => { const g = new DailyBriefGenerator(contracts); expect(g.getBriefCount()).toBe(0); });
test('constructs with custom maxHistory', () => { const g = new DailyBriefGenerator(contracts, 10); expect(g.getBriefCount()).toBe(0); });
test('generates MorningBrief', () => { const g = new DailyBriefGenerator(contracts); const b = g.generateBrief(BriefType.MorningBrief); expect(b).toBeDefined(); expect(b.type).toBe(BriefType.MorningBrief); expect(b.items.length).toBeGreaterThan(0); expect(b.summary).toBeTruthy(); expect(b.productivityIndex).toBeGreaterThanOrEqual(0); expect(b.developmentIndex).toBeGreaterThanOrEqual(0); g.getBriefCount(); });
test('generates MorningBrief with date', () => { const g = new DailyBriefGenerator(contracts); const b = g.generateBrief(BriefType.MorningBrief, '2025-01-15'); expect(b.date).toBe('2025-01-15'); });
test('generates MiddayReview', () => { const g = new DailyBriefGenerator(contracts); const b = g.generateBrief(BriefType.MiddayReview); expect(b).toBeDefined(); expect(b.type).toBe(BriefType.MiddayReview); expect(b.items.length).toBeGreaterThan(0); expect(b.summary).toBeTruthy(); expect(b.productivityIndex).toBeGreaterThanOrEqual(0); expect(b.developmentIndex).toBeGreaterThanOrEqual(0); g.getBriefCount(); });
test('generates MiddayReview with date', () => { const g = new DailyBriefGenerator(contracts); const b = g.generateBrief(BriefType.MiddayReview, '2025-01-15'); expect(b.date).toBe('2025-01-15'); });
test('generates EveningSummary', () => { const g = new DailyBriefGenerator(contracts); const b = g.generateBrief(BriefType.EveningSummary); expect(b).toBeDefined(); expect(b.type).toBe(BriefType.EveningSummary); expect(b.items.length).toBeGreaterThan(0); expect(b.summary).toBeTruthy(); expect(b.productivityIndex).toBeGreaterThanOrEqual(0); expect(b.developmentIndex).toBeGreaterThanOrEqual(0); g.getBriefCount(); });
test('generates EveningSummary with date', () => { const g = new DailyBriefGenerator(contracts); const b = g.generateBrief(BriefType.EveningSummary, '2025-01-15'); expect(b.date).toBe('2025-01-15'); });
test('generates WeeklyReview', () => { const g = new DailyBriefGenerator(contracts); const b = g.generateBrief(BriefType.WeeklyReview); expect(b).toBeDefined(); expect(b.type).toBe(BriefType.WeeklyReview); expect(b.items.length).toBeGreaterThan(0); expect(b.summary).toBeTruthy(); expect(b.productivityIndex).toBeGreaterThanOrEqual(0); expect(b.developmentIndex).toBeGreaterThanOrEqual(0); g.getBriefCount(); });
test('generates WeeklyReview with date', () => { const g = new DailyBriefGenerator(contracts); const b = g.generateBrief(BriefType.WeeklyReview, '2025-01-15'); expect(b.date).toBe('2025-01-15'); });
test('getBriefsByType returns correct type for WeeklyReview', () => { const g = new DailyBriefGenerator(contracts); g.generateBrief(BriefType.WeeklyReview); const r = g.getBriefsByType(BriefType.WeeklyReview); expect(r.length).toBe(1); });
test('getBriefsByDate filters correctly for WeeklyReview', () => { const g = new DailyBriefGenerator(contracts); g.generateBrief(BriefType.WeeklyReview, '2025-01-15'); g.generateBrief(BriefType.WeeklyReview, '2025-01-16'); expect(g.getBriefsByDate('2025-01-15').length).toBe(1); });
test('getLatestBrief returns latest for WeeklyReview', () => { const g = new DailyBriefGenerator(contracts); g.generateBrief(BriefType.WeeklyReview); g.generateBrief(BriefType.WeeklyReview); const latest = g.getLatestBrief(BriefType.WeeklyReview); expect(latest).not.toBeNull(); });
test('getLatestBrief returns null when empty for WeeklyReview', () => { const g = new DailyBriefGenerator(contracts); expect(g.getLatestBrief(BriefType.WeeklyReview)).toBeNull(); });
test('brief has correct structure for WeeklyReview', () => { const g = new DailyBriefGenerator(contracts); const b = g.generateBrief(BriefType.WeeklyReview); expect(b.id).toBeDefined(); expect(b.topPriority).toBeTruthy(); expect(b.mainConstraint).toBeTruthy(); expect(b.mainRecommendation).toBeTruthy(); expect(b.deliveredAt).toBeNull(); expect(b.createdAt).toBeDefined(); });
test('brief items have correct categories for WeeklyReview', () => { const g = new DailyBriefGenerator(contracts); const b = g.generateBrief(BriefType.WeeklyReview); const cats = b.items.map(i => i.category); expect(cats.length).toBeGreaterThan(0); });
test('markDelivered sets deliveredAt', () => { const g = new DailyBriefGenerator(contracts); const b = g.generateBrief(BriefType.WeeklyReview); const updated = g.markDelivered(b.id as unknown as string); expect(updated.deliveredAt).not.toBeNull(); });
test('markDelivered throws for invalid id', () => { const g = new DailyBriefGenerator(contracts); expect(() => g.markDelivered('invalid')).toThrow(BriefNotFoundError); });
test('getBrief throws for invalid id', () => { const g = new DailyBriefGenerator(contracts); expect(() => g.getBrief('invalid')).toThrow(BriefNotFoundError); });
test('dispose clears all briefs for WeeklyReview', () => { const g = new DailyBriefGenerator(contracts); g.generateBrief(BriefType.WeeklyReview); g.dispose(); expect(g.getBriefCount()).toBe(0); });
test('getAllBriefs returns all for WeeklyReview', () => { const g = new DailyBriefGenerator(contracts); g.generateBrief(BriefType.WeeklyReview); g.generateBrief(BriefType.WeeklyReview); expect(g.getAllBriefs().length).toBe(2); });
});
