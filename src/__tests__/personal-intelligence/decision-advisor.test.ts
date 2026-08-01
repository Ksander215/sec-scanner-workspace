import { describe, test, expect } from 'vitest';
import { DecisionAdvisor } from '../../core/personal-intelligence/decision-advisor.js';
import { DecisionStatus } from '../../core/personal-intelligence/types.js';
import { DecisionNotFoundError } from '../../core/personal-intelligence/errors.js';

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

describe('DecisionAdvisor', () => {
test('creates decision with options', () => { const a = new DecisionAdvisor(contracts); const d = a.createDecision('Choose tool','Which tool to use',['Option A','Option B']); expect(d.title).toBe('Choose tool'); expect(d.options.length).toBe(2); expect(d.status).toBe(DecisionStatus.Draft); expect(d.conclusion).toBeNull(); });
test('creates decision with single option', () => { const a = new DecisionAdvisor(contracts); const d = a.createDecision('Single','desc',['Only']); expect(d.options.length).toBe(1); });
test('addAnalysis adds pros', () => { const a = new DecisionAdvisor(contracts); const d = a.createDecision('D','d',['A']); const u = a.addAnalysis(d.id as unknown as string, 0, {pros:['pro1']}); expect(u.options[0].pros).toEqual(['pro1']); });
test('addAnalysis adds cons', () => { const a = new DecisionAdvisor(contracts); const d = a.createDecision('D','d',['A']); const u = a.addAnalysis(d.id as unknown as string, 0, {cons:['con1']}); expect(u.options[0].cons).toEqual(['con1']); });
test('addAnalysis adds risks', () => { const a = new DecisionAdvisor(contracts); const d = a.createDecision('D','d',['A']); const u = a.addAnalysis(d.id as unknown as string, 0, {risks:['risk1']}); expect(u.options[0].risks).toEqual(['risk1']); });
test('addAnalysis adds alternatives', () => { const a = new DecisionAdvisor(contracts); const d = a.createDecision('D','d',['A']); const u = a.addAnalysis(d.id as unknown as string, 0, {alternatives:['alt1']}); expect(u.options[0].alternatives).toEqual(['alt1']); });
test('addAnalysis adds consequences', () => { const a = new DecisionAdvisor(contracts); const d = a.createDecision('D','d',['A']); const u = a.addAnalysis(d.id as unknown as string, 0, {consequences:['conseq1']}); expect(u.options[0].consequences).toEqual(['conseq1']); });
test('resolve sets conclusion', () => { const a = new DecisionAdvisor(contracts); const d = a.createDecision('D','d',['A','B']); const r = a.resolve(d.id as unknown as string, 'Chose A', 'A is better'); expect(r.status).toBe(DecisionStatus.Resolved); expect(r.conclusion).toBe('Chose A'); expect(r.recommendation).toBe('A is better'); expect(r.resolvedAt).not.toBeNull(); });
test('resolve without recommendation', () => { const a = new DecisionAdvisor(contracts); const d = a.createDecision('D','d',['A']); const r = a.resolve(d.id as unknown as string, 'Done'); expect(r.recommendation).toBeNull(); });
test('getDecisionsByStatus', () => { const a = new DecisionAdvisor(contracts); const d = a.createDecision('D','d',['A']); a.resolve(d.id as unknown as string, 'Done'); expect(a.getDecisionsByStatus(DecisionStatus.Resolved).length).toBe(1); expect(a.getDecisionsByStatus(DecisionStatus.Draft).length).toBe(0); });
test('throws on empty title', () => { const a = new DecisionAdvisor(contracts); expect(() => a.createDecision('', 'd', ['A'])).toThrow(); });
test('throws on not found', () => { const a = new DecisionAdvisor(contracts); expect(() => a.getDecision('invalid')).toThrow(DecisionNotFoundError); });
test('dispose clears', () => { const a = new DecisionAdvisor(contracts); a.createDecision('D','d',['A']); a.dispose(); expect(a.getDecisionCount()).toBe(0); });
});
