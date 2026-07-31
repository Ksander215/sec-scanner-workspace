import { describe, test, expect } from 'vitest';
import { ValueAnalyzer } from '../../core/personal-intelligence/value-analyzer.js';
import { RecommendationComposer } from '../../core/personal-intelligence/recommendation-composer.js';
import { ValueDimension, RecommendationStatus } from '../../core/personal-intelligence/types.js';
import { RecommendationNotFoundError } from '../../core/personal-intelligence/errors.js';

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

describe('ValueAnalyzer', () => {
test('creates UserValue assessment', () => { const a = new ValueAnalyzer(contracts); const v = a.createAssessment(ValueDimension.UserValue, 'desc', ['r1'], 'user', ['metric1'], 'impact', 0.8); expect(v.dimension).toBe(ValueDimension.UserValue); expect(v.confidence).toBe(0.8); });
test('getByDimension for UserValue', () => { const a = new ValueAnalyzer(contracts); a.createAssessment(ValueDimension.UserValue,'d',['r'],'u',['m'],'i',0.7); expect(a.getByDimension(ValueDimension.UserValue).length).toBe(1); });
test('creates EconomicValue assessment', () => { const a = new ValueAnalyzer(contracts); const v = a.createAssessment(ValueDimension.EconomicValue, 'desc', ['r1'], 'user', ['metric1'], 'impact', 0.8); expect(v.dimension).toBe(ValueDimension.EconomicValue); expect(v.confidence).toBe(0.8); });
test('getByDimension for EconomicValue', () => { const a = new ValueAnalyzer(contracts); a.createAssessment(ValueDimension.EconomicValue,'d',['r'],'u',['m'],'i',0.7); expect(a.getByDimension(ValueDimension.EconomicValue).length).toBe(1); });
test('creates KnowledgeValue assessment', () => { const a = new ValueAnalyzer(contracts); const v = a.createAssessment(ValueDimension.KnowledgeValue, 'desc', ['r1'], 'user', ['metric1'], 'impact', 0.8); expect(v.dimension).toBe(ValueDimension.KnowledgeValue); expect(v.confidence).toBe(0.8); });
test('getByDimension for KnowledgeValue', () => { const a = new ValueAnalyzer(contracts); a.createAssessment(ValueDimension.KnowledgeValue,'d',['r'],'u',['m'],'i',0.7); expect(a.getByDimension(ValueDimension.KnowledgeValue).length).toBe(1); });
test('creates SocialValue assessment', () => { const a = new ValueAnalyzer(contracts); const v = a.createAssessment(ValueDimension.SocialValue, 'desc', ['r1'], 'user', ['metric1'], 'impact', 0.8); expect(v.dimension).toBe(ValueDimension.SocialValue); expect(v.confidence).toBe(0.8); });
test('getByDimension for SocialValue', () => { const a = new ValueAnalyzer(contracts); a.createAssessment(ValueDimension.SocialValue,'d',['r'],'u',['m'],'i',0.7); expect(a.getByDimension(ValueDimension.SocialValue).length).toBe(1); });
test('creates CreativeValue assessment', () => { const a = new ValueAnalyzer(contracts); const v = a.createAssessment(ValueDimension.CreativeValue, 'desc', ['r1'], 'user', ['metric1'], 'impact', 0.8); expect(v.dimension).toBe(ValueDimension.CreativeValue); expect(v.confidence).toBe(0.8); });
test('getByDimension for CreativeValue', () => { const a = new ValueAnalyzer(contracts); a.createAssessment(ValueDimension.CreativeValue,'d',['r'],'u',['m'],'i',0.7); expect(a.getByDimension(ValueDimension.CreativeValue).length).toBe(1); });
test('creates OperationalValue assessment', () => { const a = new ValueAnalyzer(contracts); const v = a.createAssessment(ValueDimension.OperationalValue, 'desc', ['r1'], 'user', ['metric1'], 'impact', 0.8); expect(v.dimension).toBe(ValueDimension.OperationalValue); expect(v.confidence).toBe(0.8); });
test('getByDimension for OperationalValue', () => { const a = new ValueAnalyzer(contracts); a.createAssessment(ValueDimension.OperationalValue,'d',['r'],'u',['m'],'i',0.7); expect(a.getByDimension(ValueDimension.OperationalValue).length).toBe(1); });
test('creates StrategicValue assessment', () => { const a = new ValueAnalyzer(contracts); const v = a.createAssessment(ValueDimension.StrategicValue, 'desc', ['r1'], 'user', ['metric1'], 'impact', 0.8); expect(v.dimension).toBe(ValueDimension.StrategicValue); expect(v.confidence).toBe(0.8); });
test('getByDimension for StrategicValue', () => { const a = new ValueAnalyzer(contracts); a.createAssessment(ValueDimension.StrategicValue,'d',['r'],'u',['m'],'i',0.7); expect(a.getByDimension(ValueDimension.StrategicValue).length).toBe(1); });
test('creates EmotionalValue assessment', () => { const a = new ValueAnalyzer(contracts); const v = a.createAssessment(ValueDimension.EmotionalValue, 'desc', ['r1'], 'user', ['metric1'], 'impact', 0.8); expect(v.dimension).toBe(ValueDimension.EmotionalValue); expect(v.confidence).toBe(0.8); });
test('getByDimension for EmotionalValue', () => { const a = new ValueAnalyzer(contracts); a.createAssessment(ValueDimension.EmotionalValue,'d',['r'],'u',['m'],'i',0.7); expect(a.getByDimension(ValueDimension.EmotionalValue).length).toBe(1); });
test('throws on empty description', () => { const a = new ValueAnalyzer(contracts); expect(() => a.createAssessment(ValueDimension.UserValue,'',[],'u',[],'i',0.5)).toThrow(); });
test('throws on empty reasons', () => { const a = new ValueAnalyzer(contracts); expect(() => a.createAssessment(ValueDimension.UserValue,'d',[],'u',[],'i',0.5)).toThrow(); });
test('throws on empty forWhom', () => { const a = new ValueAnalyzer(contracts); expect(() => a.createAssessment(ValueDimension.UserValue,'d',['r'],'',[],'i',0.5)).toThrow(); });
test('clamps confidence to [0,1]', () => { const a = new ValueAnalyzer(contracts); const v1 = a.createAssessment(ValueDimension.UserValue,'d',['r'],'u',[],'i',1.5); expect(v1.confidence).toBe(1); const v2 = a.createAssessment(ValueDimension.UserValue,'d2',['r2'],'u2',[],'i2',-0.5); expect(v2.confidence).toBe(0); });
test('getTopValueDimensions returns sorted', () => { const a = new ValueAnalyzer(contracts); a.createAssessment(ValueDimension.UserValue,'d',['r'],'u',[],'i',0.9); a.createAssessment(ValueDimension.EconomicValue,'d2',['r2'],'u2',[],'i2',0.7); const top = a.getTopValueDimensions(); expect(top.length).toBe(2); expect(top[0].avgConfidence).toBeGreaterThanOrEqual(top[1].avgConfidence); });
test('dispose clears', () => { const a = new ValueAnalyzer(contracts); a.createAssessment(ValueDimension.UserValue,'d',['r'],'u',[],'i',0.5); a.dispose(); expect(a.getAssessmentCount()).toBe(0); });
});

describe('RecommendationComposer', () => {
test('composes recommendation with full chain', () => { const c = new RecommendationComposer(contracts); const r = c.composeRecommendation('Title','Desc',{why:'Because',whyNow:'Now',whatValue:'Value',whyMainConstraint:'Main constraint'},'va-1','c-1','g-1',0.9); expect(r.title).toBe('Title'); expect(r.chain.length).toBe(6); expect(r.chain.every(s => s.completed)).toBe(true); expect(r.status).toBe(RecommendationStatus.Validated); });
test('recommendation has TTL', () => { const c = new RecommendationComposer(contracts); const r = c.composeRecommendation('T','D',{why:'w',whyNow:'n',whatValue:'v',whyMainConstraint:'m'}); expect(r.expiresAt).not.toBeNull(); });
test('present transitions to Presented', () => { const c = new RecommendationComposer(contracts); const r = c.composeRecommendation('T','D',{why:'w',whyNow:'n',whatValue:'v',whyMainConstraint:'m'}); const p = c.present(r.id as unknown as string); expect(p.status).toBe(RecommendationStatus.Presented); expect(p.presentedAt).not.toBeNull(); });
test('accept transitions to Accepted', () => { const c = new RecommendationComposer(contracts); const r = c.composeRecommendation('T','D',{why:'w',whyNow:'n',whatValue:'v',whyMainConstraint:'m'}); c.present(r.id as unknown as string); const a = c.accept(r.id as unknown as string); expect(a.status).toBe(RecommendationStatus.Accepted); expect(a.resolvedAt).not.toBeNull(); });
test('reject transitions to Rejected', () => { const c = new RecommendationComposer(contracts); const r = c.composeRecommendation('T','D',{why:'w',whyNow:'n',whatValue:'v',whyMainConstraint:'m'}); c.present(r.id as unknown as string); const rej = c.reject(r.id as unknown as string, 'not relevant'); expect(rej.status).toBe(RecommendationStatus.Rejected); });
test('getActiveRecommendations filters', () => { const c = new RecommendationComposer(contracts); c.composeRecommendation('T','D',{why:'w',whyNow:'n',whatValue:'v',whyMainConstraint:'m'}); expect(c.getActiveRecommendations().length).toBe(1); });
test('throws on missing title', () => { const c = new RecommendationComposer(contracts); expect(() => c.composeRecommendation('','D',{why:'w',whyNow:'n',whatValue:'v',whyMainConstraint:'m'})).toThrow(); });
test('throws on missing why', () => { const c = new RecommendationComposer(contracts); expect(() => c.composeRecommendation('T','D',{why:'',whyNow:'n',whatValue:'v',whyMainConstraint:'m'})).toThrow(); });
test('throws on missing whyNow', () => { const c = new RecommendationComposer(contracts); expect(() => c.composeRecommendation('T','D',{why:'w',whyNow:'',whatValue:'v',whyMainConstraint:'m'})).toThrow(); });
test('throws on missing whatValue', () => { const c = new RecommendationComposer(contracts); expect(() => c.composeRecommendation('T','D',{why:'w',whyNow:'n',whatValue:'',whyMainConstraint:'m'})).toThrow(); });
test('throws on missing whyMainConstraint', () => { const c = new RecommendationComposer(contracts); expect(() => c.composeRecommendation('T','D',{why:'w',whyNow:'n',whatValue:'v',whyMainConstraint:''})).toThrow(); });
test('throws on not found', () => { const c = new RecommendationComposer(contracts); expect(() => c.getRecommendation('invalid')).toThrow(RecommendationNotFoundError); });
test('getAcceptedCount and getRejectedCount', () => { const c = new RecommendationComposer(contracts); const r = c.composeRecommendation('T','D',{why:'w',whyNow:'n',whatValue:'v',whyMainConstraint:'m'}); c.present(r.id as unknown as string); c.accept(r.id as unknown as string); const r2 = c.composeRecommendation('T2','D2',{why:'w',whyNow:'n',whatValue:'v',whyMainConstraint:'m'}); c.present(r2.id as unknown as string); c.reject(r2.id as unknown as string, 'no'); expect(c.getAcceptedCount()).toBe(1); expect(c.getRejectedCount()).toBe(1); });
test('dispose clears', () => { const c = new RecommendationComposer(contracts); c.composeRecommendation('T','D',{why:'w',whyNow:'n',whatValue:'v',whyMainConstraint:'m'}); c.dispose(); expect(c.getRecommendationCount()).toBe(0); });
});
