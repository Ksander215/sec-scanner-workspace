import { describe, test, expect } from 'vitest';
import { ConstraintAnalyzer } from '../../core/personal-intelligence/constraint-analyzer.js';
import { ConstraintSeverity, ConstraintLifecycle } from '../../core/personal-intelligence/types.js';
import { ConstraintNotFoundError } from '../../core/personal-intelligence/errors.js';

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

describe('ConstraintAnalyzer', () => {
test('detects Systemic constraint', () => { const a = new ConstraintAnalyzer(contracts); const c = a.detectConstraint('Systemic bottleneck', 'desc', ConstraintSeverity.Systemic); expect(c.severity).toBe(ConstraintSeverity.Systemic); expect(c.lifecycle).toBe(ConstraintLifecycle.Detected); expect(c.id).toBeDefined(); });
test('getBySeverity for Systemic', () => { const a = new ConstraintAnalyzer(contracts); a.detectConstraint('C','d',ConstraintSeverity.Systemic); expect(a.getBySeverity(ConstraintSeverity.Systemic).length).toBe(1); });
test('detects Major constraint', () => { const a = new ConstraintAnalyzer(contracts); const c = a.detectConstraint('Major bottleneck', 'desc', ConstraintSeverity.Major); expect(c.severity).toBe(ConstraintSeverity.Major); expect(c.lifecycle).toBe(ConstraintLifecycle.Detected); expect(c.id).toBeDefined(); });
test('getBySeverity for Major', () => { const a = new ConstraintAnalyzer(contracts); a.detectConstraint('C','d',ConstraintSeverity.Major); expect(a.getBySeverity(ConstraintSeverity.Major).length).toBe(1); });
test('detects Moderate constraint', () => { const a = new ConstraintAnalyzer(contracts); const c = a.detectConstraint('Moderate bottleneck', 'desc', ConstraintSeverity.Moderate); expect(c.severity).toBe(ConstraintSeverity.Moderate); expect(c.lifecycle).toBe(ConstraintLifecycle.Detected); expect(c.id).toBeDefined(); });
test('getBySeverity for Moderate', () => { const a = new ConstraintAnalyzer(contracts); a.detectConstraint('C','d',ConstraintSeverity.Moderate); expect(a.getBySeverity(ConstraintSeverity.Moderate).length).toBe(1); });
test('detects Minor constraint', () => { const a = new ConstraintAnalyzer(contracts); const c = a.detectConstraint('Minor bottleneck', 'desc', ConstraintSeverity.Minor); expect(c.severity).toBe(ConstraintSeverity.Minor); expect(c.lifecycle).toBe(ConstraintLifecycle.Detected); expect(c.id).toBeDefined(); });
test('getBySeverity for Minor', () => { const a = new ConstraintAnalyzer(contracts); a.detectConstraint('C','d',ConstraintSeverity.Minor); expect(a.getBySeverity(ConstraintSeverity.Minor).length).toBe(1); });
test('advances lifecycle to Detected', () => { const a = new ConstraintAnalyzer(contracts); const c = a.detectConstraint('C','d',ConstraintSeverity.Major); const u = a.advanceLifecycle(c.id as unknown as string, ConstraintLifecycle.Detected); expect(u.lifecycle).toBe(ConstraintLifecycle.Detected); });
test('advances lifecycle to Analyzed', () => { const a = new ConstraintAnalyzer(contracts); const c = a.detectConstraint('C','d',ConstraintSeverity.Major); const u = a.advanceLifecycle(c.id as unknown as string, ConstraintLifecycle.Analyzed); expect(u.lifecycle).toBe(ConstraintLifecycle.Analyzed); });
test('advances lifecycle to ActionPlan', () => { const a = new ConstraintAnalyzer(contracts); const c = a.detectConstraint('C','d',ConstraintSeverity.Major); const u = a.advanceLifecycle(c.id as unknown as string, ConstraintLifecycle.ActionPlan); expect(u.lifecycle).toBe(ConstraintLifecycle.ActionPlan); });
test('advances lifecycle to Exploiting', () => { const a = new ConstraintAnalyzer(contracts); const c = a.detectConstraint('C','d',ConstraintSeverity.Major); const u = a.advanceLifecycle(c.id as unknown as string, ConstraintLifecycle.Exploiting); expect(u.lifecycle).toBe(ConstraintLifecycle.Exploiting); });
test('advances lifecycle to Elevated', () => { const a = new ConstraintAnalyzer(contracts); const c = a.detectConstraint('C','d',ConstraintSeverity.Major); const u = a.advanceLifecycle(c.id as unknown as string, ConstraintLifecycle.Elevated); expect(u.lifecycle).toBe(ConstraintLifecycle.Elevated); });
test('advances lifecycle to Resolved', () => { const a = new ConstraintAnalyzer(contracts); const c = a.detectConstraint('C','d',ConstraintSeverity.Major); const u = a.advanceLifecycle(c.id as unknown as string, ConstraintLifecycle.Resolved); expect(u.lifecycle).toBe(ConstraintLifecycle.Resolved); });
test('getByLifecycle', () => { const a = new ConstraintAnalyzer(contracts); a.detectConstraint('C','d',ConstraintSeverity.Major); expect(a.getByLifecycle(ConstraintLifecycle.Detected).length).toBe(1); });
test('getMainConstraint returns most severe', () => { const a = new ConstraintAnalyzer(contracts); a.detectConstraint('Minor','d',ConstraintSeverity.Minor); a.detectConstraint('Systemic','d',ConstraintSeverity.Systemic); const main = a.getMainConstraint(); expect(main).not.toBeNull(); expect(main!.severity).toBe(ConstraintSeverity.Systemic); });
test('getMainConstraint returns null when empty', () => { const a = new ConstraintAnalyzer(contracts); expect(a.getMainConstraint()).toBeNull(); });
test('addEvidence appends', () => { const a = new ConstraintAnalyzer(contracts); const c = a.detectConstraint('C','d',ConstraintSeverity.Major); const u = a.addEvidence(c.id as unknown as string, 'evidence1'); expect(u.evidence).toContain('evidence1'); });
test('addActionSteps appends', () => { const a = new ConstraintAnalyzer(contracts); const c = a.detectConstraint('C','d',ConstraintSeverity.Major); const u = a.addActionSteps(c.id as unknown as string, ['step1','step2']); expect(u.actionSteps).toEqual(['step1','step2']); });
test('getActiveCount and getResolvedCount', () => { const a = new ConstraintAnalyzer(contracts); a.detectConstraint('C1','d',ConstraintSeverity.Major); const c2 = a.detectConstraint('C2','d',ConstraintSeverity.Minor); a.advanceLifecycle(c2.id as unknown as string, ConstraintLifecycle.Resolved); expect(a.getActiveCount()).toBe(1); expect(a.getResolvedCount()).toBe(1); });
test('throws on not found', () => { const a = new ConstraintAnalyzer(contracts); expect(() => a.getConstraint('invalid')).toThrow(ConstraintNotFoundError); });
test('dispose clears', () => { const a = new ConstraintAnalyzer(contracts); a.detectConstraint('C','d',ConstraintSeverity.Major); a.dispose(); expect(a.getConstraintCount()).toBe(0); });
test('detects with goalId', () => { const a = new ConstraintAnalyzer(contracts); const c = a.detectConstraint('C','d',ConstraintSeverity.Major,'goal-1'); expect(c.goalId).toBe('goal-1'); });
test('detects with impact', () => { const a = new ConstraintAnalyzer(contracts); const c = a.detectConstraint('C','d',ConstraintSeverity.Major,'','High impact on delivery'); expect(c.impact).toBe('High impact on delivery'); });
});
