import { describe, test, expect } from 'vitest';
import { DailyBriefGenerator } from '../../core/personal-intelligence/daily-brief-generator.js';
import { ReflectionEngine } from '../../core/personal-intelligence/reflection-engine.js';
import { GoalPlanner } from '../../core/personal-intelligence/goal-planner.js';
import { DecisionAdvisor } from '../../core/personal-intelligence/decision-advisor.js';
import { ConstraintAnalyzer } from '../../core/personal-intelligence/constraint-analyzer.js';
import { ValueAnalyzer } from '../../core/personal-intelligence/value-analyzer.js';
import { RecommendationComposer } from '../../core/personal-intelligence/recommendation-composer.js';
import { KnowledgeSynthesizer } from '../../core/personal-intelligence/knowledge-synthesizer.js';
import { ConversationInterpreter } from '../../core/personal-intelligence/conversation-interpreter.js';
import { HabitInsights } from '../../core/personal-intelligence/habit-insights.js';
import { PriorityOptimizer } from '../../core/personal-intelligence/priority-optimizer.js';
import { PersonalDashboard } from '../../core/personal-intelligence/personal-dashboard.js';
import { BriefType, ReflectionPeriod, GoalLevel, GoalStatus, DecisionStatus, ConstraintSeverity, ConstraintLifecycle, ValueDimension, RecommendationStatus, KnowledgeNodeType, KnowledgeEdgeType, ConversationIntent, HabitDirection, HabitStrength } from '../../core/personal-intelligence/types.js';

const mockPlatform = { publishEvent: async () => {}, getConfiguration: () => null, getHealth: async () => null };
const mockIdentity = { getCurrentUserId: () => 'user-1', getUserRoles: () => ['admin'], getUserPreferences: () => ({}), resolvePreference: () => null };
const mockMemory = { retrieve: async () => null, store: async () => {}, query: () => [], getSessionEntries: () => [], getWorkingEntries: () => [] };
const mockKnowledge = { search: async () => [], getNamespaces: async () => [], getItemCount: async () => 0, getRecentItems: async () => [], getByTags: async () => [] };
const mockWorkflow = { getActiveWorkflows: () => [], getRunningInstances: () => [], getRecentCompletions: () => [], getAvailableWorkflows: () => [] };
const mockCognitive = { getCurrentIntent: () => null, getConversationTurnCount: () => 0, getCurrentSessionId: () => null, getConversationSummary: async () => null };
const mockPersonal = { getGoals: () => [], getActiveGoals: () => [], getRecommendations: () => [], getHabits: () => [], getReflections: () => [], getDecisions: () => [], getAttentionState: () => 'Focused' };
const mockAIProvider = { complete: async () => 'response', embed: async () => [0.1], isAvailable: () => true };
const mockExperience = { getActiveAdaptations: () => [], getRecommendations: () => [], getCurrentPhase: () => 'Observing', getBehaviorPatterns: () => [] };
const contracts = { identity: mockIdentity, memory: mockMemory, knowledge: mockKnowledge, workflow: mockWorkflow, cognitive: mockCognitive, personal: mockPersonal, aiProvider: mockAIProvider, experience: mockExperience, platform: mockPlatform };

describe('Subsystems Deep Integration', () => {
test('DailyBriefGenerator: brief items have correct shape', () => {
      const g = new DailyBriefGenerator(contracts);
      const b = g.generateBrief(BriefType.MorningBrief);
      for (const item of b.items) {
        expect(item.id).toBeTruthy();
        expect(item.title).toBeTruthy();
        expect(item.description).toBeTruthy();
        expect(item.priority).toBeDefined();
        expect(item.actionability).toBeTruthy();
      }
    });
test('DailyBriefGenerator: multiple briefs increment count', () => {
      const g = new DailyBriefGenerator(contracts);
      g.generateBrief(BriefType.MorningBrief);
      g.generateBrief(BriefType.MorningBrief);
      g.generateBrief(BriefType.EveningSummary);
      expect(g.getBriefCount()).toBe(3);
    });
test('DailyBriefGenerator: productivity index is 0-100', () => {
      const g = new DailyBriefGenerator(contracts);
      for (const bt of [BriefType.MorningBrief, BriefType.MiddayReview, BriefType.EveningSummary, BriefType.WeeklyReview]) {
        const b = g.generateBrief(bt);
        expect(b.productivityIndex).toBeGreaterThanOrEqual(0);
        expect(b.productivityIndex).toBeLessThanOrEqual(100);
      }
    });
test('DailyBriefGenerator: development index is 0-100', () => {
      const g = new DailyBriefGenerator(contracts);
      const b = g.generateBrief(BriefType.MorningBrief);
      expect(b.developmentIndex).toBeGreaterThanOrEqual(0);
      expect(b.developmentIndex).toBeLessThanOrEqual(100);
    });
test('DailyBriefGenerator: items include all categories', () => {
      const g = new DailyBriefGenerator(contracts);
      const b = g.generateBrief(BriefType.WeeklyReview);
      const cats = new Set(b.items.map(i => i.category));
      expect(cats.size).toBeGreaterThan(1);
    });
test('DailyBriefGenerator: eviction respects maxHistory', () => {
      const g = new DailyBriefGenerator(contracts, 3);
      g.generateBrief(BriefType.MorningBrief);
      g.generateBrief(BriefType.MorningBrief);
      g.generateBrief(BriefType.MorningBrief);
      g.generateBrief(BriefType.MorningBrief);
      expect(g.getBriefCount()).toBeLessThanOrEqual(3);
    });
test('ReflectionEngine: reflection has all required fields', () => {
      const e = new ReflectionEngine(contracts);
      const r = e.generateReflection(ReflectionPeriod.Daily);
      expect(r.id).toBeTruthy();
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.accomplishments).toBeTruthy();
      expect(r.notAccomplished).toBeTruthy();
      expect(r.reasons).toBeTruthy();
      expect(r.lessonsLearned).toBeTruthy();
      expect(r.habitsStrengthened).toBeTruthy();
      expect(r.habitsToChange).toBeTruthy();
      expect(r.sentiment).toBeTruthy();
      expect(r.highlights).toBeTruthy();
    });
test('ReflectionEngine: average score by period', () => {
      const e = new ReflectionEngine(contracts);
      e.generateReflection(ReflectionPeriod.Daily);
      e.generateReflection(ReflectionPeriod.Daily);
      const avg = e.getAverageScore(ReflectionPeriod.Daily);
      expect(avg).toBeGreaterThan(0);
    });
test('ReflectionEngine: getReflection throws for invalid id', () => {
      const e = new ReflectionEngine(contracts);
      expect(() => e.getReflection('invalid')).toThrow();
    });
test('GoalPlanner: create and update goal with all fields', () => {
      const p = new GoalPlanner(contracts);
      const g = p.createGoal({ title: 'G', description: 'D', level: GoalLevel.Tasks, priority: 7, deadline: '2025-12-31', tags: ['a','b'] });
      expect(g.tags).toEqual(['a','b']);
      expect(g.deadline).toBe('2025-12-31');
      const u = p.updateGoal(g.id as unknown as string, { title: 'Updated', priority: 10 });
      expect(u.title).toBe('Updated');
      expect(u.priority).toBe(10);
    });
test('GoalPlanner: getGoalsByStatus works after transitions', () => {
      const p = new GoalPlanner(contracts);
      const g = p.createGoal({ title: 'G', level: GoalLevel.Tasks });
      p.setStatus(g.id as unknown as string, GoalStatus.Active);
      p.setStatus(g.id as unknown as string, GoalStatus.InProgress);
      p.setStatus(g.id as unknown as string, GoalStatus.Completed);
      expect(p.getGoalsByStatus(GoalStatus.Completed).length).toBe(1);
      expect(p.getGoalsByStatus(GoalStatus.Draft).length).toBe(0);
    });
test('GoalPlanner: completed goal has completedAt', () => {
      const p = new GoalPlanner(contracts);
      const g = p.createGoal({ title: 'G', level: GoalLevel.Tasks });
      p.setStatus(g.id as unknown as string, GoalStatus.Active);
      const c = p.setStatus(g.id as unknown as string, GoalStatus.InProgress);
      const done = p.setStatus(c.id as unknown as string, GoalStatus.Completed);
      expect(done.completedAt).not.toBeNull();
      expect(done.progress).toBe(100);
    });
test('GoalPlanner: max goals limit', () => {
      const p = new GoalPlanner(contracts, 2);
      p.createGoal({ title: 'G1', level: GoalLevel.Tasks });
      p.createGoal({ title: 'G2', level: GoalLevel.Tasks });
      expect(() => p.createGoal({ title: 'G3', level: GoalLevel.Tasks })).toThrow();
    });
test('DecisionAdvisor: full analysis workflow', () => {
      const a = new DecisionAdvisor(contracts);
      const d = a.createDecision('Choose framework', 'Which to use', ['React', 'Vue', 'Angular']);
      a.addAnalysis(d.id as unknown as string, 0, { pros: ['Popular', 'Big ecosystem'], cons: ['Complex'], risks: ['Over-engineering'], alternatives: ['Svelte'], consequences: ['Learning curve'] });
      a.addAnalysis(d.id as unknown as string, 1, { pros: ['Simple'], cons: ['Smaller ecosystem'] });
      const r = a.resolve(d.id as unknown as string, 'React', 'Best fit for project');
      expect(r.status).toBe(DecisionStatus.Resolved);
      expect(r.options[0].pros.length).toBe(2);
    });
test('ConstraintAnalyzer: full lifecycle', () => {
      const a = new ConstraintAnalyzer(contracts);
      const c = a.detectConstraint('Bottleneck in delivery', 'desc', ConstraintSeverity.Systemic, 'goal-1', 'Delays everything');
      a.addEvidence(c.id as unknown as string, 'Sprint velocity dropped 30%');
      a.addEvidence(c.id as unknown as string, 'Customer complaints increased');
      a.addActionSteps(c.id as unknown as string, ['Hire more engineers', 'Simplify scope']);
      a.advanceLifecycle(c.id as unknown as string, ConstraintLifecycle.Analyzed);
      a.advanceLifecycle(c.id as unknown as string, ConstraintLifecycle.ActionPlan);
      a.advanceLifecycle(c.id as unknown as string, ConstraintLifecycle.Exploiting);
      const resolved = a.advanceLifecycle(c.id as unknown as string, ConstraintLifecycle.Resolved);
      expect(resolved.resolvedAt).not.toBeNull();
      expect(resolved.evidence.length).toBe(2);
      expect(resolved.actionSteps.length).toBe(2);
    });
test('ValueAnalyzer: multiple assessments and aggregation', () => {
      const a = new ValueAnalyzer(contracts);
      a.createAssessment(ValueDimension.UserValue, 'Saves 2h daily', ['Automation'], 'User', ['Hours saved'], 'High', 0.9);
      a.createAssessment(ValueDimension.UserValue, 'Reduces errors', ['Validation'], 'User', ['Error rate'], 'Medium', 0.8);
      a.createAssessment(ValueDimension.EconomicValue, 'Cost reduction', ['Efficiency'], 'Company', ['Cost savings'], 'High', 0.7);
      const top = a.getTopValueDimensions();
      expect(top.length).toBe(2);
      expect(top[0].dimension).toBe('UserValue');
    });
test('RecommendationComposer: full workflow compose -> present -> accept', () => {
      const c = new RecommendationComposer(contracts);
      const r = c.composeRecommendation('Automate reports', 'Set up automated daily brief generation', { why: 'Saves 30 min daily', whyNow: 'Report deadline tomorrow', whatValue: 'UserValue - time savings', whyMainConstraint: 'Manual reporting is the bottleneck' });
      const presented = c.present(r.id as unknown as string);
      expect(presented.status).toBe(RecommendationStatus.Presented);
      const accepted = c.accept(presented.id as unknown as string);
      expect(accepted.status).toBe(RecommendationStatus.Accepted);
    });
test('RecommendationComposer: full workflow compose -> present -> reject', () => {
      const c = new RecommendationComposer(contracts);
      const r = c.composeRecommendation('R', 'D', { why: 'w', whyNow: 'n', whatValue: 'v', whyMainConstraint: 'm' });
      c.present(r.id as unknown as string);
      const rejected = c.reject(r.id as unknown as string, 'Not relevant now');
      expect(rejected.status).toBe(RecommendationStatus.Rejected);
    });
test('RecommendationComposer: chain has all 6 stages', () => {
      const c = new RecommendationComposer(contracts);
      const r = c.composeRecommendation('T', 'D', { why: 'w', whyNow: 'n', whatValue: 'v', whyMainConstraint: 'm' });
      expect(r.chain.length).toBe(6);
      const stageNames = r.chain.map(s => s.stage);
      expect(stageNames).toContain('Understanding');
      expect(stageNames).toContain('Value');
      expect(stageNames).toContain('Constraint');
      expect(stageNames).toContain('Optimization');
      expect(stageNames).toContain('Explanation');
      expect(stageNames).toContain('Recommendation');
    });
test('RecommendationComposer: getByStatus works', () => {
      const c = new RecommendationComposer(contracts);
      const r = c.composeRecommendation('T', 'D', { why: 'w', whyNow: 'n', whatValue: 'v', whyMainConstraint: 'm' });
      expect(c.getByStatus(RecommendationStatus.Validated).length).toBe(1);
      expect(c.getByStatus(RecommendationStatus.Accepted).length).toBe(0);
    });
test('KnowledgeSynthesizer: full graph workflow', () => {
      const k = new KnowledgeSynthesizer(contracts);
      const n1 = k.addNode(KnowledgeNodeType.Note, 'Meeting notes', 'Discussed Q4 targets', 'meeting');
      const n2 = k.addNode(KnowledgeNodeType.Project, 'Q4 Targets', 'Revenue goals', 'planning');
      const n3 = k.addNode(KnowledgeNodeType.Decision, 'Hire decision', 'Decided to hire 2 engineers', 'meeting');
      const n4 = k.addNode(KnowledgeNodeType.Conclusion, 'Team growth needed', 'Conclusion from decision', 'analysis');
      k.addEdge(n1.id, n2.id, KnowledgeEdgeType.ProjectTo);
      k.addEdge(n1.id, n3.id, KnowledgeEdgeType.DecisionTo);
      k.addEdge(n3.id, n4.id, KnowledgeEdgeType.ConclusionTo);
      k.addEdge(n2.id, n4.id, KnowledgeEdgeType.Supports);
      expect(k.getNodeCount()).toBe(4);
      expect(k.getEdgeCount()).toBe(4);
      expect(k.getConnectedNodes(n1.id as unknown as string).length).toBe(2);
      const synthesis = k.getSynthesis();
      expect(synthesis.totalNodes).toBe(4);
      expect(synthesis.totalEdges).toBe(4);
    });
test('KnowledgeSynthesizer: nodes with tags', () => {
      const k = new KnowledgeSynthesizer(contracts);
      k.addNode(KnowledgeNodeType.Note, 'N', 'C', 's', ['tag1','tag2','tag3']);
      expect(k.getNodesByType(KnowledgeNodeType.Note)[0].tags.length).toBe(3);
    });
test('ConversationInterpreter: multiple interpretations', async () => {
      const i = new ConversationInterpreter(contracts);
      await i.interpret('I want to set a new goal for Q1');
      await i.interpret('Help me decide between option A and B');
      await i.interpret('Let me reflect on last week');
      expect(i.getInterpretationCount()).toBe(3);
      expect(i.getByIntent(ConversationIntent.GoalSetting).length).toBe(1);
      expect(i.getByIntent(ConversationIntent.DecisionMaking).length).toBe(1);
      expect(i.getByIntent(ConversationIntent.Reflection).length).toBe(1);
    });
test('HabitInsights: full habit lifecycle', () => {
      const h = new HabitInsights(contracts);
      const habit = h.detectHabit('Morning routine', 'Wakes up at 6am and exercises', HabitDirection.Positive);
      for (let i = 0; i < 15; i++) h.recordObservation(habit.id as unknown as string);
      const updated = h.getHabit(habit.id as unknown as string);
      expect(updated.strength).toBe(HabitStrength.Strong);
      expect(updated.impact).toBeTruthy();
      expect(updated.suggestion).toBeTruthy();
    });
test('PriorityOptimizer: full priority ranking', () => {
      const p = new PriorityOptimizer(contracts);
      const f = new Map();
      f.set('g1', {deadline:5,importance:5,urgency:5,energy:5,context:5,dependencies:5,risk:5,value:5});
      f.set('g2', {deadline:9,importance:9,urgency:9,energy:9,context:9,dependencies:9,risk:9,value:9});
      f.set('g3', {deadline:3,importance:3,urgency:3,energy:3,context:3,dependencies:3,risk:3,value:3});
      const r = p.calculateAllPriorities(['g1','g2','g3'], f as any);
      expect(r.length).toBe(3);
      expect(r[0].rank).toBe(1);
      expect(r[2].rank).toBe(3);
      expect(r[0].totalScore).toBeGreaterThan(r[2].totalScore);
    });
test('PersonalDashboard: dashboard with all fields', () => {
      const d = new PersonalDashboard(contracts);
      d.addInsight('Great progress today', 'Completed 3 tasks ahead of schedule', 'productivity', 'system', 0.9);
      d.addInsight('Pattern detected', 'Deep work sessions most effective before noon', 'behavior', 'analysis', 0.8);
      const db = d.generateDashboard({
        userId: 'u1', todaySummary: 'Productive day',
        topGoals: [], nextActions: ['Task 1', 'Task 2'],
        mainConstraint: null, mainRecommendation: null,
        productivityIndex: 85, developmentIndex: 70
      });
      expect(db.recentInsights.length).toBe(2);
      expect(db.nextActions.length).toBe(2);
    });
});
