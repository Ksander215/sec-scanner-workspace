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
import { PackMetricsRuntime } from '../../core/personal-intelligence/pack-metrics-runtime.js';
import { PackTraceRuntime } from '../../core/personal-intelligence/pack-trace-runtime.js';
import {
  BriefType, GoalLevel, ConstraintSeverity, ValueDimension, KnowledgeNodeType,
  KnowledgeEdgeType, HabitDirection, ReflectionPeriod, HabitStrength, RecommendationStage,
} from '../../core/personal-intelligence/types.js';

const C = {
  identity: { getCurrentUserId: () => 'u1', getUserRoles: () => ['admin'], getUserPreferences: () => ({}), resolvePreference: () => null },
  memory: { retrieve: async () => null, store: async () => {}, query: () => [], getSessionEntries: () => [], getWorkingEntries: () => [] },
  knowledge: { search: async () => [], getNamespaces: async () => [], getItemCount: async () => 0, getRecentItems: async () => [], getByTags: async () => [] },
  workflow: { getActiveWorkflows: () => [], getRunningInstances: () => [], getRecentCompletions: () => [], getAvailableWorkflows: () => [] },
  cognitive: { getCurrentIntent: () => null, getConversationTurnCount: () => 0, getCurrentSessionId: () => null, getConversationSummary: async () => null },
  personal: { getGoals: () => [], getActiveGoals: () => [], getRecommendations: () => [], getHabits: () => [], getReflections: () => [], getDecisions: () => [], getAttentionState: () => 'Focused' },
  aiProvider: { complete: async () => 'r', embed: async () => [0.1], isAvailable: () => true },
  experience: { getActiveAdaptations: () => [], getRecommendations: () => [], getCurrentPhase: () => 'Observing', getBehaviorPatterns: () => [] },
  platform: { publishEvent: async () => {}, getConfiguration: () => null, getHealth: async () => null },
};
const sid = (o: any) => o.id as unknown as string;

describe('Immutability (Object.freeze)', () => {
  describe('DailyBriefGenerator', () => {
    test('returned brief is frozen', () => {
      const b = new DailyBriefGenerator(C).generateBrief(BriefType.MorningBrief);
      expect(Object.isFrozen(b)).toBe(true);
    });
    test('brief items array is frozen', () => {
      const b = new DailyBriefGenerator(C).generateBrief(BriefType.MorningBrief);
      expect(Object.isFrozen(b.items)).toBe(true);
    });
    test('each brief item is frozen', () => {
      const b = new DailyBriefGenerator(C).generateBrief(BriefType.MorningBrief);
      for (const item of b.items) expect(Object.isFrozen(item)).toBe(true);
    });
    test('getBriefsByType result is frozen', () => {
      const g = new DailyBriefGenerator(C);
      g.generateBrief(BriefType.MorningBrief);
      expect(Object.isFrozen(g.getBriefsByType(BriefType.MorningBrief))).toBe(true);
    });
    test('getAllBriefs result is frozen', () => {
      const g = new DailyBriefGenerator(C);
      g.generateBrief(BriefType.MorningBrief);
      expect(Object.isFrozen(g.getAllBriefs())).toBe(true);
    });
    test('markDelivered result is frozen', () => {
      const g = new DailyBriefGenerator(C);
      const b = g.generateBrief(BriefType.MorningBrief);
      expect(Object.isFrozen(g.markDelivered(sid(b)))).toBe(true);
    });
  });

  describe('ReflectionEngine', () => {
    test('returned reflection is frozen', () => {
      const r = new ReflectionEngine(C).generateReflection(ReflectionPeriod.Daily);
      expect(Object.isFrozen(r)).toBe(true);
    });
    test('accomplishments array is frozen', () => {
      const r = new ReflectionEngine(C).generateReflection(ReflectionPeriod.Daily);
      expect(Object.isFrozen(r.accomplishments)).toBe(true);
    });
    test('lessonsLearned array is frozen', () => {
      const r = new ReflectionEngine(C).generateReflection(ReflectionPeriod.Daily);
      expect(Object.isFrozen(r.lessonsLearned)).toBe(true);
    });
    test('habitsStrengthened array is frozen', () => {
      const r = new ReflectionEngine(C).generateReflection(ReflectionPeriod.Daily);
      expect(Object.isFrozen(r.habitsStrengthened)).toBe(true);
    });
    test('habitsToChange array is frozen', () => {
      const r = new ReflectionEngine(C).generateReflection(ReflectionPeriod.Daily);
      expect(Object.isFrozen(r.habitsToChange)).toBe(true);
    });
    test('highlights array is frozen', () => {
      const r = new ReflectionEngine(C).generateReflection(ReflectionPeriod.Daily);
      expect(Object.isFrozen(r.highlights)).toBe(true);
    });
    test('getReflectionsByPeriod result is frozen', () => {
      const e = new ReflectionEngine(C);
      e.generateReflection(ReflectionPeriod.Daily);
      expect(Object.isFrozen(e.getReflectionsByPeriod(ReflectionPeriod.Daily))).toBe(true);
    });
    test('getAllReflections result is frozen', () => {
      const e = new ReflectionEngine(C);
      e.generateReflection(ReflectionPeriod.Daily);
      expect(Object.isFrozen(e.getAllReflections())).toBe(true);
    });
  });

  describe('GoalPlanner', () => {
    test('returned goal is frozen', () => {
      const g = new GoalPlanner(C).createGoal({ title: 'T', level: GoalLevel.Vision });
      expect(Object.isFrozen(g)).toBe(true);
    });
    test('goal childrenIds is frozen', () => {
      const g = new GoalPlanner(C).createGoal({ title: 'T', level: GoalLevel.Vision });
      expect(Object.isFrozen(g.childrenIds)).toBe(true);
    });
    test('goal tags is frozen', () => {
      const g = new GoalPlanner(C).createGoal({ title: 'T', level: GoalLevel.Vision, tags: ['a', 'b'] });
      expect(Object.isFrozen(g.tags)).toBe(true);
    });
    test('goal constraintIds is frozen', () => {
      const g = new GoalPlanner(C).createGoal({ title: 'T', level: GoalLevel.Vision });
      expect(Object.isFrozen(g.constraintIds)).toBe(true);
    });
    test('updated goal is frozen', () => {
      const pl = new GoalPlanner(C);
      const g = pl.createGoal({ title: 'T', level: GoalLevel.Vision });
      expect(Object.isFrozen(pl.updateGoal(sid(g), { title: 'U' }))).toBe(true);
    });
    test('getGoalsByLevel result is frozen', () => {
      const pl = new GoalPlanner(C);
      pl.createGoal({ title: 'T', level: GoalLevel.Vision });
      expect(Object.isFrozen(pl.getGoalsByLevel(GoalLevel.Vision))).toBe(true);
    });
    test('getGoalsByStatus result is frozen', () => {
      const pl = new GoalPlanner(C);
      pl.createGoal({ title: 'T', level: GoalLevel.Vision });
      expect(Object.isFrozen(pl.getGoalsByStatus('Draft' as any))).toBe(true);
    });
    test('getRootGoals result is frozen', () => {
      const pl = new GoalPlanner(C);
      pl.createGoal({ title: 'T', level: GoalLevel.Vision });
      expect(Object.isFrozen(pl.getRootGoals())).toBe(true);
    });
    test('getGoalHierarchy result is frozen', () => {
      const pl = new GoalPlanner(C);
      const v = pl.createGoal({ title: 'V', level: GoalLevel.Vision });
      expect(Object.isFrozen(pl.getGoalHierarchy(sid(v)))).toBe(true);
    });
    test('getDescendants result is frozen', () => {
      const pl = new GoalPlanner(C);
      const v = pl.createGoal({ title: 'V', level: GoalLevel.Vision });
      expect(Object.isFrozen(pl.getDescendants(sid(v)))).toBe(true);
    });
    test('getAllGoals result is frozen', () => {
      const pl = new GoalPlanner(C);
      pl.createGoal({ title: 'T', level: GoalLevel.Vision });
      expect(Object.isFrozen(pl.getAllGoals())).toBe(true);
    });
  });

  describe('DecisionAdvisor', () => {
    test('returned decision is frozen', () => {
      const d = new DecisionAdvisor(C).createDecision('T', 'D', ['A']);
      expect(Object.isFrozen(d)).toBe(true);
    });
    test('decision options array is frozen', () => {
      const d = new DecisionAdvisor(C).createDecision('T', 'D', ['A', 'B']);
      expect(Object.isFrozen(d.options)).toBe(true);
    });
    test('each option is frozen', () => {
      const d = new DecisionAdvisor(C).createDecision('T', 'D', ['A', 'B']);
      for (const o of d.options) expect(Object.isFrozen(o)).toBe(true);
    });
    test('option pros array is frozen', () => {
      const da = new DecisionAdvisor(C);
      const d = da.createDecision('T', 'D', ['A']);
      const u = da.addAnalysis(sid(d), 0, { pros: ['p1'] });
      expect(Object.isFrozen(u.options[0].pros)).toBe(true);
    });
    test('getDecisionsByStatus result is frozen', () => {
      const da = new DecisionAdvisor(C);
      da.createDecision('T', 'D', []);
      expect(Object.isFrozen(da.getDecisionsByStatus('Draft' as any))).toBe(true);
    });
    test('getAllDecisions result is frozen', () => {
      const da = new DecisionAdvisor(C);
      da.createDecision('T', 'D', []);
      expect(Object.isFrozen(da.getAllDecisions())).toBe(true);
    });
  });

  describe('ConstraintAnalyzer', () => {
    test('returned constraint is frozen', () => {
      const c = new ConstraintAnalyzer(C).detectConstraint('T', 'D', ConstraintSeverity.Major);
      expect(Object.isFrozen(c)).toBe(true);
    });
    test('constraint evidence array is frozen', () => {
      const ca = new ConstraintAnalyzer(C);
      const c = ca.detectConstraint('T', 'D', ConstraintSeverity.Major);
      const u = ca.addEvidence(sid(c), 'ev1');
      expect(Object.isFrozen(u.evidence)).toBe(true);
    });
    test('constraint actionSteps array is frozen', () => {
      const ca = new ConstraintAnalyzer(C);
      const c = ca.detectConstraint('T', 'D', ConstraintSeverity.Major);
      const u = ca.addActionSteps(sid(c), ['step1']);
      expect(Object.isFrozen(u.actionSteps)).toBe(true);
    });
    test('getBySeverity result is frozen', () => {
      const ca = new ConstraintAnalyzer(C);
      ca.detectConstraint('T', 'D', ConstraintSeverity.Major);
      expect(Object.isFrozen(ca.getBySeverity(ConstraintSeverity.Major))).toBe(true);
    });
    test('getAllConstraints result is frozen', () => {
      const ca = new ConstraintAnalyzer(C);
      ca.detectConstraint('T', 'D', ConstraintSeverity.Major);
      expect(Object.isFrozen(ca.getAllConstraints())).toBe(true);
    });
  });

  describe('ValueAnalyzer', () => {
    test('returned assessment is frozen', () => {
      const a = new ValueAnalyzer(C).createAssessment(ValueDimension.UserValue, 'D', ['r'], 'u', ['m'], 'i', 0.5);
      expect(Object.isFrozen(a)).toBe(true);
    });
    test('assessment reasons array is frozen', () => {
      const a = new ValueAnalyzer(C).createAssessment(ValueDimension.UserValue, 'D', ['r1', 'r2'], 'u', ['m'], 'i', 0.5);
      expect(Object.isFrozen(a.reasons)).toBe(true);
    });
    test('assessment measurementCriteria array is frozen', () => {
      const a = new ValueAnalyzer(C).createAssessment(ValueDimension.UserValue, 'D', ['r'], 'u', ['m1', 'm2'], 'i', 0.5);
      expect(Object.isFrozen(a.measurementCriteria)).toBe(true);
    });
    test('getByDimension result is frozen', () => {
      const va = new ValueAnalyzer(C);
      va.createAssessment(ValueDimension.UserValue, 'D', ['r'], 'u', ['m'], 'i', 0.5);
      expect(Object.isFrozen(va.getByDimension(ValueDimension.UserValue))).toBe(true);
    });
    test('getAllAssessments result is frozen', () => {
      const va = new ValueAnalyzer(C);
      va.createAssessment(ValueDimension.UserValue, 'D', ['r'], 'u', ['m'], 'i', 0.5);
      expect(Object.isFrozen(va.getAllAssessments())).toBe(true);
    });
  });

  describe('RecommendationComposer', () => {
    const why = { why: 'w', whyNow: 'n', whatValue: 'v', whyMainConstraint: 'c' };
    test('returned recommendation is frozen', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', why);
      expect(Object.isFrozen(r)).toBe(true);
    });
    test('chain array is frozen', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', why);
      expect(Object.isFrozen(r.chain)).toBe(true);
    });
    test('each chain step is frozen', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', why);
      for (const s of r.chain) expect(Object.isFrozen(s)).toBe(true);
    });
    test('chain step data is frozen', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', why);
      for (const s of r.chain) expect(Object.isFrozen(s.data)).toBe(true);
    });
    test('why fields are accessible', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', why);
      expect(r.why.why).toBe('w');
      expect(r.why.whyNow).toBe('n');
      expect(r.why.whatValue).toBe('v');
      expect(r.why.whyMainConstraint).toBe('c');
    });
    test('present result is frozen', () => {
      const rc = new RecommendationComposer(C);
      const r = rc.composeRecommendation('T', 'D', why);
      expect(Object.isFrozen(rc.present(sid(r)))).toBe(true);
    });
    test('accept result is frozen', () => {
      const rc = new RecommendationComposer(C);
      const r = rc.composeRecommendation('T', 'D', why);
      rc.present(sid(r));
      expect(Object.isFrozen(rc.accept(sid(r)))).toBe(true);
    });
    test('reject result is frozen', () => {
      const rc = new RecommendationComposer(C);
      const r = rc.composeRecommendation('T', 'D', why);
      rc.present(sid(r));
      expect(Object.isFrozen(rc.reject(sid(r), 'no'))).toBe(true);
    });
    test('getActiveRecommendations result is frozen', () => {
      const rc = new RecommendationComposer(C);
      rc.composeRecommendation('T', 'D', why);
      expect(Object.isFrozen(rc.getActiveRecommendations())).toBe(true);
    });
    test('getByStatus result is frozen', () => {
      const rc = new RecommendationComposer(C);
      rc.composeRecommendation('T', 'D', why);
      expect(Object.isFrozen(rc.getByStatus('Validated' as any))).toBe(true);
    });
  });

  describe('KnowledgeSynthesizer', () => {
    test('returned node is frozen', () => {
      const n = new KnowledgeSynthesizer(C).addNode(KnowledgeNodeType.Note, 'T', 'C', 's');
      expect(Object.isFrozen(n)).toBe(true);
    });
    test('node tags is frozen', () => {
      const n = new KnowledgeSynthesizer(C).addNode(KnowledgeNodeType.Note, 'T', 'C', 's', ['a']);
      expect(Object.isFrozen(n.tags)).toBe(true);
    });
    test('node goalIds is frozen', () => {
      const n = new KnowledgeSynthesizer(C).addNode(KnowledgeNodeType.Note, 'T', 'C', 's');
      expect(Object.isFrozen(n.goalIds)).toBe(true);
    });
    test('returned edge is frozen', () => {
      const ks = new KnowledgeSynthesizer(C);
      const n1 = ks.addNode(KnowledgeNodeType.Note, 'N1', 'C', 's');
      const n2 = ks.addNode(KnowledgeNodeType.Concept, 'N2', 'C', 's');
      expect(Object.isFrozen(ks.addEdge(n1.id, n2.id, KnowledgeEdgeType.RelatedTo))).toBe(true);
    });
    test('getConnectedNodes result is frozen', () => {
      const ks = new KnowledgeSynthesizer(C);
      const n1 = ks.addNode(KnowledgeNodeType.Note, 'N1', 'C', 's');
      const n2 = ks.addNode(KnowledgeNodeType.Concept, 'N2', 'C', 's');
      ks.addEdge(n1.id, n2.id, KnowledgeEdgeType.RelatedTo);
      expect(Object.isFrozen(ks.getConnectedNodes(sid(n1)))).toBe(true);
    });
    test('getSynthesis result is frozen', () => {
      const ks = new KnowledgeSynthesizer(C);
      ks.addNode(KnowledgeNodeType.Note, 'T', 'C', 's');
      const s = ks.getSynthesis();
      expect(Object.isFrozen(s)).toBe(true);
      expect(Object.isFrozen(s.nodes)).toBe(true);
      expect(Object.isFrozen(s.edges)).toBe(true);
    });
    test('getAllNodes result is frozen', () => {
      const ks = new KnowledgeSynthesizer(C);
      ks.addNode(KnowledgeNodeType.Note, 'T', 'C', 's');
      expect(Object.isFrozen(ks.getAllNodes())).toBe(true);
    });
  });

  describe('ConversationInterpreter', () => {
    test('returned interpretation is frozen', () => {
      const i = new ConversationInterpreter(C).interpret('I want to set a goal');
      expect(Object.isFrozen(i)).toBe(true);
    });
    test('entities array is frozen', () => {
      const i = new ConversationInterpreter(C).interpret('goal: launch product');
      expect(Object.isFrozen(i.entities)).toBe(true);
    });
    test('suggestedActions array is frozen', () => {
      const i = new ConversationInterpreter(C).interpret('I want to set a goal');
      expect(Object.isFrozen(i.suggestedActions)).toBe(true);
    });
    test('goalIds is frozen', () => {
      const i = new ConversationInterpreter(C).interpret('test');
      expect(Object.isFrozen(i.goalIds)).toBe(true);
    });
    test('getAllInterpretations result is frozen', () => {
      const ci = new ConversationInterpreter(C);
      ci.interpret('test');
      expect(Object.isFrozen(ci.getAllInterpretations())).toBe(true);
    });
  });

  describe('HabitInsights', () => {
    test('returned habit is frozen', () => {
      const h = new HabitInsights(C).detectHabit('H', 'D', HabitDirection.Positive);
      expect(Object.isFrozen(h)).toBe(true);
    });
    test('recordObservation result is frozen', () => {
      const hi = new HabitInsights(C);
      const h = hi.detectHabit('H', 'D', HabitDirection.Positive);
      expect(Object.isFrozen(hi.recordObservation(sid(h)))).toBe(true);
    });
    test('getByDirection result is frozen', () => {
      const hi = new HabitInsights(C);
      hi.detectHabit('H', 'D', HabitDirection.Positive);
      expect(Object.isFrozen(hi.getByDirection(HabitDirection.Positive))).toBe(true);
    });
    test('getTopPositiveHabits result is frozen', () => {
      const hi = new HabitInsights(C);
      hi.detectHabit('H', 'D', HabitDirection.Positive);
      expect(Object.isFrozen(hi.getTopPositiveHabits())).toBe(true);
    });
    test('getAllHabits result is frozen', () => {
      const hi = new HabitInsights(C);
      hi.detectHabit('H', 'D', HabitDirection.Positive);
      expect(Object.isFrozen(hi.getAllHabits())).toBe(true);
    });
  });

  describe('PriorityOptimizer', () => {
    test('returned score is frozen', () => {
      const s = new PriorityOptimizer(C).calculatePriority('g1', { deadline: 5, importance: 8, urgency: 6, energy: 7, context: 5, dependencies: 4, risk: 3, value: 9 });
      expect(Object.isFrozen(s)).toBe(true);
    });
    test('score factors is frozen', () => {
      const s = new PriorityOptimizer(C).calculatePriority('g1', { deadline: 5, importance: 8, urgency: 6, energy: 7, context: 5, dependencies: 4, risk: 3, value: 9 });
      expect(Object.isFrozen(s.factors)).toBe(true);
    });
    test('getAllScores result is frozen', () => {
      const po = new PriorityOptimizer(C);
      po.calculatePriority('g1', { deadline: 5, importance: 8, urgency: 6, energy: 7, context: 5, dependencies: 4, risk: 3, value: 9 });
      expect(Object.isFrozen(po.getAllScores())).toBe(true);
    });
    test('getTopN result is frozen', () => {
      const po = new PriorityOptimizer(C);
      po.calculatePriority('g1', { deadline: 5, importance: 8, urgency: 6, energy: 7, context: 5, dependencies: 4, risk: 3, value: 9 });
      expect(Object.isFrozen(po.getTopN(5))).toBe(true);
    });
  });

  describe('PersonalDashboard', () => {
    test('returned insight is frozen', () => {
      const i = new PersonalDashboard(C).addInsight('T', 'D', 'cat', 'src', 0.8);
      expect(Object.isFrozen(i)).toBe(true);
    });
    test('returned dashboard is frozen', () => {
      const d = new PersonalDashboard(C).generateDashboard({ userId: 'u1', todaySummary: 'G', topGoals: [], nextActions: [], mainConstraint: null, mainRecommendation: null, productivityIndex: 75, developmentIndex: 60 });
      expect(Object.isFrozen(d)).toBe(true);
    });
    test('dashboard topGoals is frozen', () => {
      const pl = new GoalPlanner(C);
      const g = pl.createGoal({ title: 'G', level: GoalLevel.Goals });
      const d = new PersonalDashboard(C).generateDashboard({ userId: 'u1', todaySummary: 'G', topGoals: [g], nextActions: [], mainConstraint: null, mainRecommendation: null, productivityIndex: 75, developmentIndex: 60 });
      expect(Object.isFrozen(d.topGoals)).toBe(true);
    });
    test('dashboard nextActions is frozen', () => {
      const d = new PersonalDashboard(C).generateDashboard({ userId: 'u1', todaySummary: 'G', topGoals: [], nextActions: ['a1'], mainConstraint: null, mainRecommendation: null, productivityIndex: 75, developmentIndex: 60 });
      expect(Object.isFrozen(d.nextActions)).toBe(true);
    });
    test('dashboard recentInsights is frozen', () => {
      const db = new PersonalDashboard(C);
      db.addInsight('T', 'D', 'c', 's');
      const d = db.generateDashboard({ userId: 'u1', todaySummary: 'G', topGoals: [], nextActions: [], mainConstraint: null, mainRecommendation: null, productivityIndex: 75, developmentIndex: 60 });
      expect(Object.isFrozen(d.recentInsights)).toBe(true);
    });
    test('getAllDashboards result is frozen', () => {
      const db = new PersonalDashboard(C);
      db.generateDashboard({ userId: 'u1', todaySummary: 'G', topGoals: [], nextActions: [], mainConstraint: null, mainRecommendation: null, productivityIndex: 75, developmentIndex: 60 });
      expect(Object.isFrozen(db.getAllDashboards())).toBe(true);
    });
    test('getAllInsights result is frozen', () => {
      const db = new PersonalDashboard(C);
      db.addInsight('T', 'D', 'c', 's');
      expect(Object.isFrozen(db.getAllInsights())).toBe(true);
    });
  });

  describe('PackMetricsRuntime', () => {
    test('getSnapshot result is frozen', () => {
      const m = new PackMetricsRuntime();
      m.increment('briefs_generated' as any);
      const s = m.getSnapshot();
      expect(Object.isFrozen(s)).toBe(true);
      expect(s.counters).toBeDefined();
      expect(s.gauges).toBeDefined();
      expect(s.trends).toBeDefined();
      expect(s.exportedAt).toBeDefined();
    });
    test('getSeries result is frozen', () => {
      const m = new PackMetricsRuntime();
      m.recordSeries('test', 42);
      expect(Object.isFrozen(m.getSeries('test'))).toBe(true);
    });
  });

  describe('PackTraceRuntime', () => {
    test('startSpan result is frozen', () => {
      const s = new PackTraceRuntime().startSpan('op', 'sub');
      expect(Object.isFrozen(s)).toBe(true);
    });
    test('span attributes are accessible', () => {
      const s = new PackTraceRuntime().startSpan('op', 'sub', undefined, { key: 'val' });
      expect((s.attributes as any).key).toBe('val');
    });
    test('addSpanEvent increments events count', () => {
      const t = new PackTraceRuntime();
      const s = t.startSpan('op', 'sub');
      const u = t.addSpanEvent(sid(s), 'evt');
      expect(u.events.length).toBe(1);
    });
    test('completeSpan result is frozen', () => {
      const t = new PackTraceRuntime();
      const s = t.startSpan('op', 'sub');
      expect(Object.isFrozen(t.completeSpan(sid(s)))).toBe(true);
    });
    test('failSpan result is frozen', () => {
      const t = new PackTraceRuntime();
      const s = t.startSpan('op', 'sub');
      expect(Object.isFrozen(t.failSpan(sid(s)))).toBe(true);
    });
    test('getSpansBySubsystem result is frozen', () => {
      const t = new PackTraceRuntime();
      t.startSpan('op', 'sub');
      expect(Object.isFrozen(t.getSpansBySubsystem('sub'))).toBe(true);
    });
    test('getActiveSpans result is frozen', () => {
      const t = new PackTraceRuntime();
      t.startSpan('op', 'sub');
      expect(Object.isFrozen(t.getActiveSpans())).toBe(true);
    });
    test('getAllSpans result is frozen', () => {
      const t = new PackTraceRuntime();
      t.startSpan('op', 'sub');
      expect(Object.isFrozen(t.getAllSpans())).toBe(true);
    });
  });
});
