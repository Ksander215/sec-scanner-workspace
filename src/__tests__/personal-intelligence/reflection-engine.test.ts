import { describe, test, expect } from 'vitest';
import { ReflectionEngine } from '../../core/personal-intelligence/reflection-engine.js';
import { ReflectionPeriod, ReflectionSentiment } from '../../core/personal-intelligence/types.js';

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

describe('ReflectionEngine', () => {
test('generates Daily reflection', () => { const e = new ReflectionEngine(contracts); const r = e.generateReflection(ReflectionPeriod.Daily); expect(r).toBeDefined(); expect(r.period).toBe(ReflectionPeriod.Daily); expect(r.accomplishments.length).toBeGreaterThan(0); expect(r.sentiment).toBeDefined(); expect(r.score).toBeGreaterThanOrEqual(0); expect(r.score).toBeLessThanOrEqual(100); expect(r.highlights.length).toBeGreaterThan(0); });
test('generates Daily with date', () => { const e = new ReflectionEngine(contracts); const r = e.generateReflection(ReflectionPeriod.Daily, '2025-01-15'); expect(r.date).toBe('2025-01-15'); });
test('getReflectionsByPeriod for Daily', () => { const e = new ReflectionEngine(contracts); e.generateReflection(ReflectionPeriod.Daily); expect(e.getReflectionsByPeriod(ReflectionPeriod.Daily).length).toBe(1); });
test('getLatestReflection returns latest for Daily', () => { const e = new ReflectionEngine(contracts); e.generateReflection(ReflectionPeriod.Daily); e.generateReflection(ReflectionPeriod.Daily); expect(e.getLatestReflection(ReflectionPeriod.Daily)).not.toBeNull(); });
test('getLatestReflection returns null for Daily when empty', () => { const e = new ReflectionEngine(contracts); expect(e.getLatestReflection(ReflectionPeriod.Daily)).toBeNull(); });
test('reflection has lessons for Daily', () => { const e = new ReflectionEngine(contracts); const r = e.generateReflection(ReflectionPeriod.Daily); expect(r.lessonsLearned.length).toBeGreaterThan(0); });
test('reflection has habit analysis for Daily', () => { const e = new ReflectionEngine(contracts); const r = e.generateReflection(ReflectionPeriod.Daily); expect(r.habitsStrengthened.length).toBeGreaterThanOrEqual(0); expect(r.habitsToChange.length).toBeGreaterThanOrEqual(0); });
test('dispose clears for Daily', () => { const e = new ReflectionEngine(contracts); e.generateReflection(ReflectionPeriod.Daily); e.dispose(); expect(e.getReflectionCount()).toBe(0); });
test('generates Weekly reflection', () => { const e = new ReflectionEngine(contracts); const r = e.generateReflection(ReflectionPeriod.Weekly); expect(r).toBeDefined(); expect(r.period).toBe(ReflectionPeriod.Weekly); expect(r.accomplishments.length).toBeGreaterThan(0); expect(r.sentiment).toBeDefined(); expect(r.score).toBeGreaterThanOrEqual(0); expect(r.score).toBeLessThanOrEqual(100); expect(r.highlights.length).toBeGreaterThan(0); });
test('generates Weekly with date', () => { const e = new ReflectionEngine(contracts); const r = e.generateReflection(ReflectionPeriod.Weekly, '2025-01-15'); expect(r.date).toBe('2025-01-15'); });
test('getReflectionsByPeriod for Weekly', () => { const e = new ReflectionEngine(contracts); e.generateReflection(ReflectionPeriod.Weekly); expect(e.getReflectionsByPeriod(ReflectionPeriod.Weekly).length).toBe(1); });
test('getLatestReflection returns latest for Weekly', () => { const e = new ReflectionEngine(contracts); e.generateReflection(ReflectionPeriod.Weekly); e.generateReflection(ReflectionPeriod.Weekly); expect(e.getLatestReflection(ReflectionPeriod.Weekly)).not.toBeNull(); });
test('getLatestReflection returns null for Weekly when empty', () => { const e = new ReflectionEngine(contracts); expect(e.getLatestReflection(ReflectionPeriod.Weekly)).toBeNull(); });
test('reflection has lessons for Weekly', () => { const e = new ReflectionEngine(contracts); const r = e.generateReflection(ReflectionPeriod.Weekly); expect(r.lessonsLearned.length).toBeGreaterThan(0); });
test('reflection has habit analysis for Weekly', () => { const e = new ReflectionEngine(contracts); const r = e.generateReflection(ReflectionPeriod.Weekly); expect(r.habitsStrengthened.length).toBeGreaterThanOrEqual(0); expect(r.habitsToChange.length).toBeGreaterThanOrEqual(0); });
test('dispose clears for Weekly', () => { const e = new ReflectionEngine(contracts); e.generateReflection(ReflectionPeriod.Weekly); e.dispose(); expect(e.getReflectionCount()).toBe(0); });
test('generates Monthly reflection', () => { const e = new ReflectionEngine(contracts); const r = e.generateReflection(ReflectionPeriod.Monthly); expect(r).toBeDefined(); expect(r.period).toBe(ReflectionPeriod.Monthly); expect(r.accomplishments.length).toBeGreaterThan(0); expect(r.sentiment).toBeDefined(); expect(r.score).toBeGreaterThanOrEqual(0); expect(r.score).toBeLessThanOrEqual(100); expect(r.highlights.length).toBeGreaterThan(0); });
test('generates Monthly with date', () => { const e = new ReflectionEngine(contracts); const r = e.generateReflection(ReflectionPeriod.Monthly, '2025-01-15'); expect(r.date).toBe('2025-01-15'); });
test('getReflectionsByPeriod for Monthly', () => { const e = new ReflectionEngine(contracts); e.generateReflection(ReflectionPeriod.Monthly); expect(e.getReflectionsByPeriod(ReflectionPeriod.Monthly).length).toBe(1); });
test('getLatestReflection returns latest for Monthly', () => { const e = new ReflectionEngine(contracts); e.generateReflection(ReflectionPeriod.Monthly); e.generateReflection(ReflectionPeriod.Monthly); expect(e.getLatestReflection(ReflectionPeriod.Monthly)).not.toBeNull(); });
test('getLatestReflection returns null for Monthly when empty', () => { const e = new ReflectionEngine(contracts); expect(e.getLatestReflection(ReflectionPeriod.Monthly)).toBeNull(); });
test('reflection has lessons for Monthly', () => { const e = new ReflectionEngine(contracts); const r = e.generateReflection(ReflectionPeriod.Monthly); expect(r.lessonsLearned.length).toBeGreaterThan(0); });
test('reflection has habit analysis for Monthly', () => { const e = new ReflectionEngine(contracts); const r = e.generateReflection(ReflectionPeriod.Monthly); expect(r.habitsStrengthened.length).toBeGreaterThanOrEqual(0); expect(r.habitsToChange.length).toBeGreaterThanOrEqual(0); });
test('dispose clears for Monthly', () => { const e = new ReflectionEngine(contracts); e.generateReflection(ReflectionPeriod.Monthly); e.dispose(); expect(e.getReflectionCount()).toBe(0); });
test('getAverageScore returns 0 when empty', () => { const e = new ReflectionEngine(contracts); expect(e.getAverageScore()).toBe(0); });
test('getAverageScore calculates correctly', () => { const e = new ReflectionEngine(contracts); e.generateReflection(ReflectionPeriod.Daily); const avg = e.getAverageScore(); expect(avg).toBeGreaterThan(0); });
test('getAllReflections returns all', () => { const e = new ReflectionEngine(contracts); e.generateReflection(ReflectionPeriod.Daily); e.generateReflection(ReflectionPeriod.Weekly); expect(e.getAllReflections().length).toBe(2); });
});
