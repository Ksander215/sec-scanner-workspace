import { describe, test, expect } from 'vitest';
import { PersonalIntelligencePackRuntime } from '../../core/personal-intelligence/personal-intelligence-pack-runtime.js';
import { PackState, BriefType } from '../../core/personal-intelligence/types.js';

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

describe('PersonalIntelligencePackRuntime', () => {
test('constructs with default config', () => { const r = new PersonalIntelligencePackRuntime(contracts); expect(r.state).toBe(PackState.Created); expect(r.isDisposed).toBe(false); });
test('constructs with custom config', () => { const r = new PersonalIntelligencePackRuntime(contracts, {maxGoals: 50}); expect(r.state).toBe(PackState.Created); });
test('initialize transitions to Active', async () => { const r = new PersonalIntelligencePackRuntime(contracts); await r.initialize(); expect(r.state).toBe(PackState.Active); });
test('all subsystems are accessible', () => { const r = new PersonalIntelligencePackRuntime(contracts); expect(r.dailyBrief).toBeDefined(); expect(r.reflection).toBeDefined(); expect(r.goalPlanner).toBeDefined(); expect(r.decisionAdvisor).toBeDefined(); expect(r.constraintAnalyzer).toBeDefined(); expect(r.valueAnalyzer).toBeDefined(); expect(r.recommendationComposer).toBeDefined(); expect(r.knowledgeSynthesizer).toBeDefined(); expect(r.conversationInterpreter).toBeDefined(); expect(r.habitInsights).toBeDefined(); expect(r.priorityOptimizer).toBeDefined(); expect(r.dashboard).toBeDefined(); expect(r.metrics).toBeDefined(); expect(r.trace).toBeDefined(); });
test('getState returns structured state', async () => { const r = new PersonalIntelligencePackRuntime(contracts); await r.initialize(); const state = r.getState() as any; expect(state.state).toBe(PackState.Active); expect(state.subsystems).toBeDefined(); expect(state.metrics).toBeDefined(); expect(state.trace).toBeDefined(); });
test('generateMorningBrief works', async () => { const r = new PersonalIntelligencePackRuntime(contracts); await r.initialize(); const b = r.generateMorningBrief(); expect(b.type).toBe(BriefType.MorningBrief); expect(b.items.length).toBeGreaterThan(0); });
test('generateEveningReflection works', async () => { const r = new PersonalIntelligencePackRuntime(contracts); await r.initialize(); const ref = r.generateEveningReflection(); expect(ref.accomplishments.length).toBeGreaterThan(0); });
test('getOnboardingQuestions returns 5 questions', () => { const r = new PersonalIntelligencePackRuntime(contracts); const q = r.getOnboardingQuestions(); expect(q.length).toBe(5); expect(q[0].question).toBeTruthy(); });
test('processOnboardingAnswers extracts goals', () => { const r = new PersonalIntelligencePackRuntime(contracts); const result = r.processOnboardingAnswers({'q1':'Learn TS\nBuild product\nShip MVP'}); expect(result.extractedGoals.length).toBe(3); expect(result.mainConstraint).toBeTruthy(); expect(result.firstActionStep).toBeTruthy(); });
test('processOnboardingAnswers handles empty', () => { const r = new PersonalIntelligencePackRuntime(contracts); const result = r.processOnboardingAnswers({}); expect(result.extractedGoals.length).toBe(0); });
test('dispose sets disposed flag', async () => { const r = new PersonalIntelligencePackRuntime(contracts); await r.initialize(); r.dispose(); expect(r.isDisposed).toBe(true); });
test('throws on operation after dispose', async () => { const r = new PersonalIntelligencePackRuntime(contracts); r.dispose(); expect(() => r.generateMorningBrief()).toThrow(); });
test('dispose clears all subsystems', async () => { const r = new PersonalIntelligencePackRuntime(contracts); await r.initialize(); r.generateMorningBrief(); r.dispose(); expect(r.dailyBrief.getBriefCount()).toBe(0); });
});
