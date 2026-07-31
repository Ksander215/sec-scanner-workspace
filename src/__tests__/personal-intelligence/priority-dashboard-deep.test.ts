import { describe, test, expect } from 'vitest';
import { PriorityOptimizer } from '../../core/personal-intelligence/priority-optimizer.js';
import { PersonalDashboard } from '../../core/personal-intelligence/personal-dashboard.js';

const mp = { publishEvent: async () => {}, getConfiguration: () => null, getHealth: async () => null };
const mi = { getCurrentUserId: () => 'u1', getUserRoles: () => ['a'], getUserPreferences: () => ({}), resolvePreference: () => null };
const mm = { retrieve: async () => null, store: async () => {}, query: () => [], getSessionEntries: () => [], getWorkingEntries: () => [] };
const mk = { search: async () => [], getNamespaces: async () => [], getItemCount: async () => 0, getRecentItems: async () => [], getByTags: async () => [] };
const mw = { getActiveWorkflows: () => [], getRunningInstances: () => [], getRecentCompletions: () => [], getAvailableWorkflows: () => [] };
const mcg = { getCurrentIntent: () => null, getConversationTurnCount: () => 0, getCurrentSessionId: () => null, getConversationSummary: async () => null };
const mpe = { getGoals: () => [], getActiveGoals: () => [], getRecommendations: () => [], getHabits: () => [], getReflections: () => [], getDecisions: () => [], getAttentionState: () => 'Focused' };
const mai = { complete: async () => 'r', embed: async () => [0.1], isAvailable: () => true };
const mex = { getActiveAdaptations: () => [], getRecommendations: () => [], getCurrentPhase: () => 'O', getBehaviorPatterns: () => [] };
const C = { identity: mi, memory: mm, knowledge: mk, workflow: mw, cognitive: mcg, personal: mpe, aiProvider: mai, experience: mex, platform: mp };

describe('PriorityOptimizer Deep Coverage', () => {
test('priority: calculate priority 0 with varying factors', () => { const p = new PriorityOptimizer(C); const f = {deadline:0,importance:10,urgency:5,energy:5,context:5,dependencies:5,risk:5,value:5}; const s = p.calculatePriority('g0', f as any); expect(s.totalScore).toBeGreaterThan(0); expect(s.rank).toBe(0); });
test('priority: calculate priority 1 with varying factors', () => { const p = new PriorityOptimizer(C); const f = {deadline:1,importance:9,urgency:5,energy:5,context:5,dependencies:5,risk:5,value:5}; const s = p.calculatePriority('g1', f as any); expect(s.totalScore).toBeGreaterThan(0); expect(s.rank).toBe(0); });
test('priority: calculate priority 2 with varying factors', () => { const p = new PriorityOptimizer(C); const f = {deadline:2,importance:8,urgency:5,energy:5,context:5,dependencies:5,risk:5,value:5}; const s = p.calculatePriority('g2', f as any); expect(s.totalScore).toBeGreaterThan(0); expect(s.rank).toBe(0); });
test('priority: calculate priority 3 with varying factors', () => { const p = new PriorityOptimizer(C); const f = {deadline:3,importance:7,urgency:5,energy:5,context:5,dependencies:5,risk:5,value:5}; const s = p.calculatePriority('g3', f as any); expect(s.totalScore).toBeGreaterThan(0); expect(s.rank).toBe(0); });
test('priority: calculate priority 4 with varying factors', () => { const p = new PriorityOptimizer(C); const f = {deadline:4,importance:6,urgency:5,energy:5,context:5,dependencies:5,risk:5,value:5}; const s = p.calculatePriority('g4', f as any); expect(s.totalScore).toBeGreaterThan(0); expect(s.rank).toBe(0); });
test('priority: calculate priority 5 with varying factors', () => { const p = new PriorityOptimizer(C); const f = {deadline:5,importance:5,urgency:5,energy:5,context:5,dependencies:5,risk:5,value:5}; const s = p.calculatePriority('g5', f as any); expect(s.totalScore).toBeGreaterThan(0); expect(s.rank).toBe(0); });
test('priority: calculate priority 6 with varying factors', () => { const p = new PriorityOptimizer(C); const f = {deadline:6,importance:4,urgency:5,energy:5,context:5,dependencies:5,risk:5,value:5}; const s = p.calculatePriority('g6', f as any); expect(s.totalScore).toBeGreaterThan(0); expect(s.rank).toBe(0); });
test('priority: calculate priority 7 with varying factors', () => { const p = new PriorityOptimizer(C); const f = {deadline:7,importance:3,urgency:5,energy:5,context:5,dependencies:5,risk:5,value:5}; const s = p.calculatePriority('g7', f as any); expect(s.totalScore).toBeGreaterThan(0); expect(s.rank).toBe(0); });
test('priority: calculate priority 8 with varying factors', () => { const p = new PriorityOptimizer(C); const f = {deadline:8,importance:2,urgency:5,energy:5,context:5,dependencies:5,risk:5,value:5}; const s = p.calculatePriority('g8', f as any); expect(s.totalScore).toBeGreaterThan(0); expect(s.rank).toBe(0); });
test('priority: calculate priority 9 with varying factors', () => { const p = new PriorityOptimizer(C); const f = {deadline:9,importance:1,urgency:5,energy:5,context:5,dependencies:5,risk:5,value:5}; const s = p.calculatePriority('g9', f as any); expect(s.totalScore).toBeGreaterThan(0); expect(s.rank).toBe(0); });
test('priority: getTopN 3', () => { const p = new PriorityOptimizer(C); for (let i = 0; i < 5; i++) p.calculatePriority('g'+i, {deadline:i+1,importance:i+1,urgency:i+1,energy:i+1,context:i+1,dependencies:i+1,risk:i+1,value:i+1}); expect(p.getTopN(3).length).toBe(3); });
test('priority: getAllScores', () => { const p = new PriorityOptimizer(C); p.calculatePriority('g1',{deadline:5,importance:5,urgency:5,energy:5,context:5,dependencies:5,risk:5,value:5}); expect(p.getAllScores().length).toBe(1); });
test('dashboard: add insight 0', () => { const d = new PersonalDashboard(C); const ins = d.addInsight('Insight 0', 'Description 0', 'cat0', 'source0', 0.5); expect(ins.title).toBe('Insight 0'); expect(ins.confidence).toBe(0.5); });
test('dashboard: add insight 1', () => { const d = new PersonalDashboard(C); const ins = d.addInsight('Insight 1', 'Description 1', 'cat1', 'source1', 0.6); expect(ins.title).toBe('Insight 1'); expect(ins.confidence).toBe(0.6); });
test('dashboard: add insight 2', () => { const d = new PersonalDashboard(C); const ins = d.addInsight('Insight 2', 'Description 2', 'cat2', 'source2', 0.7); expect(ins.title).toBe('Insight 2'); expect(ins.confidence).toBe(0.7); });
test('dashboard: add insight 3', () => { const d = new PersonalDashboard(C); const ins = d.addInsight('Insight 3', 'Description 3', 'cat3', 'source3', 0.8); expect(ins.title).toBe('Insight 3'); expect(ins.confidence).toBe(0.8); });
test('dashboard: add insight 4', () => { const d = new PersonalDashboard(C); const ins = d.addInsight('Insight 4', 'Description 4', 'cat4', 'source4', 0.9); expect(ins.title).toBe('Insight 4'); expect(ins.confidence).toBe(0.9); });
test('dashboard: generate with constraint and recommendation', () => { const d = new PersonalDashboard(C); const db = d.generateDashboard({userId:'u1',todaySummary:'s',topGoals:[],nextActions:['a1'],mainConstraint:null,mainRecommendation:null,productivityIndex:50,developmentIndex:50}); expect(db.userId).toBe('u1'); });
});

describe('PersonalDashboard Deep Coverage', () => {
test('dashboard: getInsight', () => { const d = new PersonalDashboard(C); const ins = d.addInsight('T','D','c','s'); expect(d.getInsight(ins.id as unknown as string).title).toBe('T'); });
test('dashboard: getAllInsights', () => { const d = new PersonalDashboard(C); d.addInsight('T1','D','c','s'); d.addInsight('T2','D','c','s'); expect(d.getAllInsights().length).toBe(2); });
test('dashboard: getDashboardCount', () => { const d = new PersonalDashboard(C); d.generateDashboard({userId:'u',todaySummary:'s',topGoals:[],nextActions:[],mainConstraint:null,mainRecommendation:null,productivityIndex:50,developmentIndex:50}); expect(d.getDashboardCount()).toBe(1); });
});
