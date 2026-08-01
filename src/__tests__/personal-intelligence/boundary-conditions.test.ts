import { describe, test, expect } from 'vitest';
import { GoalPlanner } from '../../core/personal-intelligence/goal-planner.js';
import { DecisionAdvisor } from '../../core/personal-intelligence/decision-advisor.js';
import { ConstraintAnalyzer } from '../../core/personal-intelligence/constraint-analyzer.js';
import { HabitInsights } from '../../core/personal-intelligence/habit-insights.js';
import { DailyBriefGenerator } from '../../core/personal-intelligence/daily-brief-generator.js';
import { ReflectionEngine } from '../../core/personal-intelligence/reflection-engine.js';
import { KnowledgeSynthesizer } from '../../core/personal-intelligence/knowledge-synthesizer.js';
import { ValueAnalyzer } from '../../core/personal-intelligence/value-analyzer.js';
import { RecommendationComposer } from '../../core/personal-intelligence/recommendation-composer.js';
import { PriorityOptimizer } from '../../core/personal-intelligence/priority-optimizer.js';
import { PersonalIntelligencePackRuntime } from '../../core/personal-intelligence/personal-intelligence-pack-runtime.js';
import { ConversationInterpreter } from '../../core/personal-intelligence/conversation-interpreter.js';
import { PersonalDashboard } from '../../core/personal-intelligence/personal-dashboard.js';
import { PackMetricsRuntime } from '../../core/personal-intelligence/pack-metrics-runtime.js';
import { PackTraceRuntime } from '../../core/personal-intelligence/pack-trace-runtime.js';
import {
  GoalLevel, GoalStatus, ConstraintSeverity, ConstraintLifecycle, ValueDimension, HabitDirection,
  HabitStrength, BriefType, ReflectionPeriod, KnowledgeNodeType, KnowledgeEdgeType,
} from '../../core/personal-intelligence/types.js';
import { GoalValidationError, DecisionValidationError, ConstraintAnalysisError, HabitInsightError } from '../../core/personal-intelligence/errors.js';

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

describe('Boundary Conditions', () => {
  describe('Max limits', () => {
    test('GoalPlanner maxGoals=2 rejects third goal', () => {
      const pl = new GoalPlanner(C, 2);
      pl.createGoal({ title: 'G1', level: GoalLevel.Tasks });
      pl.createGoal({ title: 'G2', level: GoalLevel.Tasks });
      expect(() => pl.createGoal({ title: 'G3', level: GoalLevel.Tasks })).toThrow(GoalValidationError);
    });
    test('DecisionAdvisor maxDecisions=1 rejects second decision', () => {
      const da = new DecisionAdvisor(C, 1);
      da.createDecision('D1', 'desc', []);
      expect(() => da.createDecision('D2', 'desc', [])).toThrow(DecisionValidationError);
    });
    test('ConstraintAnalyzer maxConstraints=1 rejects second constraint', () => {
      const ca = new ConstraintAnalyzer(C, 1);
      ca.detectConstraint('C1', 'd', ConstraintSeverity.Minor);
      expect(() => ca.detectConstraint('C2', 'd', ConstraintSeverity.Minor)).toThrow(ConstraintAnalysisError);
    });
    test('HabitInsights maxHabits=1 rejects second habit', () => {
      const hi = new HabitInsights(C, 1);
      hi.detectHabit('H1', 'd', HabitDirection.Positive);
      expect(() => hi.detectHabit('H2', 'd', HabitDirection.Positive)).toThrow(HabitInsightError);
    });
    test('DailyBriefGenerator maxHistory=2 evicts oldest', () => {
      const g = new DailyBriefGenerator(C, 2);
      g.generateBrief(BriefType.MorningBrief, '2025-01-01');
      g.generateBrief(BriefType.MorningBrief, '2025-01-02');
      g.generateBrief(BriefType.MorningBrief, '2025-01-03');
      expect(g.getBriefCount()).toBe(2);
    });
    test('ReflectionEngine maxHistory=2 evicts oldest', () => {
      const e = new ReflectionEngine(C, 2);
      e.generateReflection(ReflectionPeriod.Daily, '2025-01-01');
      e.generateReflection(ReflectionPeriod.Daily, '2025-01-02');
      e.generateReflection(ReflectionPeriod.Daily, '2025-01-03');
      expect(e.getReflectionCount()).toBe(2);
    });
  });

  describe('Confidence clamping', () => {
    test('ValueAnalyzer clamps confidence > 1 to 1', () => {
      const a = new ValueAnalyzer(C).createAssessment(ValueDimension.UserValue, 'D', ['r'], 'u', ['m'], 'i', 5);
      expect(a.confidence).toBe(1);
    });
    test('ValueAnalyzer clamps confidence < 0 to 0', () => {
      const a = new ValueAnalyzer(C).createAssessment(ValueDimension.UserValue, 'D', ['r'], 'u', ['m'], 'i', -3);
      expect(a.confidence).toBe(0);
    });
    test('ValueAnalyzer exact 0 is preserved', () => {
      const a = new ValueAnalyzer(C).createAssessment(ValueDimension.UserValue, 'D', ['r'], 'u', ['m'], 'i', 0);
      expect(a.confidence).toBe(0);
    });
    test('ValueAnalyzer exact 1 is preserved', () => {
      const a = new ValueAnalyzer(C).createAssessment(ValueDimension.UserValue, 'D', ['r'], 'u', ['m'], 'i', 1);
      expect(a.confidence).toBe(1);
    });
    test('RecommendationComposer clamps confidence > 1', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', { why: 'w', whyNow: 'n', whatValue: 'v', whyMainConstraint: 'c' }, undefined, undefined, undefined, 10);
      expect(r.confidence).toBe(1);
    });
    test('RecommendationComposer clamps confidence < 0', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', { why: 'w', whyNow: 'n', whatValue: 'v', whyMainConstraint: 'c' }, undefined, undefined, undefined, -5);
      expect(r.confidence).toBe(0);
    });
    test('RecommendationComposer default confidence is 0.5', () => {
      const r = new RecommendationComposer(C).composeRecommendation('T', 'D', { why: 'w', whyNow: 'n', whatValue: 'v', whyMainConstraint: 'c' });
      expect(r.confidence).toBe(0.5);
    });
  });

  describe('Unicode and edge case inputs', () => {
    test('GoalPlanner handles Unicode title', () => {
      const g = new GoalPlanner(C).createGoal({ title: 'Цель на квартал — улучшить продукт', level: GoalLevel.Goals });
      expect(g.title).toContain('Цель');
    });
    test('ConstraintAnalyzer handles Unicode description', () => {
      const c = new ConstraintAnalyzer(C).detectConstraint('Нехватка времени', 'Описание проблемы на русском', ConstraintSeverity.Major);
      expect(c.title).toContain('Нехватка');
    });
    test('ConversationInterpreter handles Russian input', async () => {
      const i = await new ConversationInterpreter(C).interpret('моя цель на этот квартал');
      expect(i.intent).toBe('GoalSetting');
    });
    test('ConversationInterpreter handles mixed language', async () => {
      const i = await new ConversationInterpreter(C).interpret('I need to решить эту проблему');
      expect(i).toBeDefined();
    });
    test('DecisionAdvisor handles very long description', () => {
      const d = new DecisionAdvisor(C).createDecision('T', 'x'.repeat(10000), []);
      expect(d.description.length).toBe(10000);
    });
    test('KnowledgeSynthesizer handles Unicode content', () => {
      const n = new KnowledgeSynthesizer(C).addNode(KnowledgeNodeType.Note, 'Заметка', 'Содержание на русском', 'source');
      expect(n.title).toBe('Заметка');
    });
    test('HabitInsights handles Unicode name', () => {
      const h = new HabitInsights(C).detectHabit('Утренняя медитация', 'Описание', HabitDirection.Positive);
      expect(h.name).toBe('Утренняя медитация');
    });
    test('ReflectionEngine handles custom date format', () => {
      const r = new ReflectionEngine(C).generateReflection(ReflectionPeriod.Daily, '2025-06-15');
      expect(r.date).toBe('2025-06-15');
    });
    test('DailyBriefGenerator handles custom date', () => {
      const b = new DailyBriefGenerator(C).generateBrief(BriefType.MorningBrief, '2025-12-31');
      expect(b.date).toBe('2025-12-31');
    });
  });

  describe('Priority edge cases', () => {
    test('all factors zero gives score 0', () => {
      const s = new PriorityOptimizer(C).calculatePriority('g1', { deadline: 0, importance: 0, urgency: 0, energy: 0, context: 0, dependencies: 0, risk: 0, value: 0 });
      expect(s.totalScore).toBe(0);
    });
    test('all factors max gives score 10', () => {
      const s = new PriorityOptimizer(C).calculatePriority('g1', { deadline: 10, importance: 10, urgency: 10, energy: 10, context: 10, dependencies: 10, risk: 10, value: 10 });
      expect(s.totalScore).toBe(10);
    });
    test('importance has highest weight (0.25)', () => {
      const onlyImportance = new PriorityOptimizer(C).calculatePriority('g1', { deadline: 0, importance: 10, urgency: 0, energy: 0, context: 0, dependencies: 0, risk: 0, value: 0 });
      const onlyDeadline = new PriorityOptimizer(C).calculatePriority('g2', { deadline: 10, importance: 0, urgency: 0, energy: 0, context: 0, dependencies: 0, risk: 0, value: 0 });
      expect(onlyImportance.totalScore).toBeGreaterThan(onlyDeadline.totalScore);
    });
    test('calculateAllPriorities missing factors throws', () => {
      const po = new PriorityOptimizer(C);
      expect(() => po.calculateAllPriorities(['g1'], new Map())).toThrow();
    });
    test('getTopN with N > count returns all', () => {
      const po = new PriorityOptimizer(C);
      po.calculatePriority('g1', { deadline: 5, importance: 8, urgency: 6, energy: 7, context: 5, dependencies: 4, risk: 3, value: 9 });
      expect(po.getTopN(100).length).toBe(1);
    });
    test('getTopN with N=0 returns empty', () => {
      const po = new PriorityOptimizer(C);
      po.calculatePriority('g1', { deadline: 5, importance: 8, urgency: 6, energy: 7, context: 5, dependencies: 4, risk: 3, value: 9 });
      expect(po.getTopN(0).length).toBe(0);
    });
  });

  describe('Habit strength progression', () => {
    test('Emerging (0 obs) -> Established (7 obs)', () => {
      const hi = new HabitInsights(C);
      const h = hi.detectHabit('H', 'D', HabitDirection.Positive);
      expect(h.strength).toBe(HabitStrength.Emerging);
      for (let i = 0; i < 6; i++) hi.recordObservation(sid(h));
      const updated = hi.recordObservation(sid(h));
      expect(updated.strength).toBe(HabitStrength.Established);
    });
    test('Established (7 obs) -> Strong (15 obs)', () => {
      const hi = new HabitInsights(C);
      const h = hi.detectHabit('H', 'D', HabitDirection.Positive);
      for (let i = 0; i < 14; i++) hi.recordObservation(sid(h));
      const updated = hi.recordObservation(sid(h));
      expect(updated.strength).toBe(HabitStrength.Strong);
    });
    test('Strong (15 obs) -> Core (30 obs)', () => {
      const hi = new HabitInsights(C);
      const h = hi.detectHabit('H', 'D', HabitDirection.Positive);
      for (let i = 0; i < 29; i++) hi.recordObservation(sid(h));
      const updated = hi.recordObservation(sid(h));
      expect(updated.strength).toBe(HabitStrength.Core);
    });
    test('confidence caps at 1.0', () => {
      const hi = new HabitInsights(C);
      const h = hi.detectHabit('H', 'D', HabitDirection.Positive);
      for (let i = 0; i < 100; i++) hi.recordObservation(sid(h));
      expect(hi.getHabit(sid(h)).confidence).toBe(1);
    });
    test('observationCount increments correctly', () => {
      const hi = new HabitInsights(C);
      const h = hi.detectHabit('H', 'D', HabitDirection.Positive);
      expect(h.observationCount).toBe(1);
      hi.recordObservation(sid(h));
      expect(hi.getHabit(sid(h)).observationCount).toBe(2);
    });
  });

  describe('Brief index bounds', () => {
    test('productivityIndex is 0-100', () => {
      for (const bt of [BriefType.MorningBrief, BriefType.EveningSummary, BriefType.WeeklyReview, BriefType.MiddayReview]) {
        const b = new DailyBriefGenerator(C).generateBrief(bt);
        expect(b.productivityIndex).toBeGreaterThanOrEqual(0);
        expect(b.productivityIndex).toBeLessThanOrEqual(100);
      }
    });
    test('developmentIndex is 0-100', () => {
      for (const bt of [BriefType.MorningBrief, BriefType.EveningSummary, BriefType.WeeklyReview, BriefType.MiddayReview]) {
        const b = new DailyBriefGenerator(C).generateBrief(bt);
        expect(b.developmentIndex).toBeGreaterThanOrEqual(0);
        expect(b.developmentIndex).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Reflection score bounds', () => {
    test('score is 0-100 for all periods', () => {
      for (const p of [ReflectionPeriod.Daily, ReflectionPeriod.Weekly, ReflectionPeriod.Monthly]) {
        const r = new ReflectionEngine(C).generateReflection(p);
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(100);
      }
    });
    test('sentiment is valid enum', () => {
      const validSentiments = ['Positive', 'Mixed', 'Neutral', 'Negative'];
      for (const p of [ReflectionPeriod.Daily, ReflectionPeriod.Weekly, ReflectionPeriod.Monthly]) {
        const r = new ReflectionEngine(C).generateReflection(p);
        expect(validSentiments).toContain(r.sentiment);
      }
    });
  });

  describe('Knowledge graph edge cases', () => {
    test('empty graph synthesis', () => {
      const s = new KnowledgeSynthesizer(C).getSynthesis();
      expect(s.totalNodes).toBe(0);
      expect(s.totalEdges).toBe(0);
      expect(s.nodes.length).toBe(0);
      expect(s.edges.length).toBe(0);
    });
    test('searchNodes with no match returns empty', () => {
      const ks = new KnowledgeSynthesizer(C);
      ks.addNode(KnowledgeNodeType.Note, 'Test', 'Content', 'src');
      expect(ks.searchNodes('zzz-nonexistent').length).toBe(0);
    });
    test('searchNodes matches title', () => {
      const ks = new KnowledgeSynthesizer(C);
      ks.addNode(KnowledgeNodeType.Note, 'My Goal Plan', 'Content', 'src');
      expect(ks.searchNodes('Goal').length).toBe(1);
    });
    test('searchNodes matches content', () => {
      const ks = new KnowledgeSynthesizer(C);
      ks.addNode(KnowledgeNodeType.Note, 'Title', 'Goal analysis content', 'src');
      expect(ks.searchNodes('Goal analysis').length).toBe(1);
    });
    test('searchNodes is case-insensitive', () => {
      const ks = new KnowledgeSynthesizer(C);
      ks.addNode(KnowledgeNodeType.Note, 'Test Title', 'Content', 'src');
      expect(ks.searchNodes('test title').length).toBe(1);
    });
    test('getNodesByType with no matches returns empty', () => {
      expect(new KnowledgeSynthesizer(C).getNodesByType(KnowledgeNodeType.Note).length).toBe(0);
    });
    test('getEdgesForNode returns only connected edges', () => {
      const ks = new KnowledgeSynthesizer(C);
      const n1 = ks.addNode(KnowledgeNodeType.Note, 'N1', 'C', 's');
      const n2 = ks.addNode(KnowledgeNodeType.Concept, 'N2', 'C', 's');
      const n3 = ks.addNode(KnowledgeNodeType.Project, 'N3', 'C', 's');
      ks.addEdge(n1.id, n2.id, KnowledgeEdgeType.RelatedTo);
      ks.addEdge(n2.id, n3.id, KnowledgeEdgeType.DependsOn);
      expect(ks.getEdgesForNode(sid(n1)).length).toBe(1);
      expect(ks.getEdgesForNode(sid(n2)).length).toBe(2);
      expect(ks.getEdgesForNode(sid(n3)).length).toBe(1);
    });
    test('edge weight defaults to 1.0', () => {
      const ks = new KnowledgeSynthesizer(C);
      const n1 = ks.addNode(KnowledgeNodeType.Note, 'N1', 'C', 's');
      const n2 = ks.addNode(KnowledgeNodeType.Concept, 'N2', 'C', 's');
      const e = ks.addEdge(n1.id, n2.id, KnowledgeEdgeType.RelatedTo);
      expect(e.weight).toBe(1.0);
    });
    test('edge custom weight', () => {
      const ks = new KnowledgeSynthesizer(C);
      const n1 = ks.addNode(KnowledgeNodeType.Note, 'N1', 'C', 's');
      const n2 = ks.addNode(KnowledgeNodeType.Concept, 'N2', 'C', 's');
      const e = ks.addEdge(n1.id, n2.id, KnowledgeEdgeType.RelatedTo, 0.5);
      expect(e.weight).toBe(0.5);
    });
  });

  describe('Conversation edge cases', () => {
    test('getByIntent returns empty for unseen intent', () => {
      const ci = new ConversationInterpreter(C);
      expect(ci.getByIntent('GoalSetting' as any).length).toBe(0);
    });
    test('entity extraction from goal: pattern', async () => {
      const ci = new ConversationInterpreter(C);
      const i = await ci.interpret('goal: launch product by Q4');
      const goalEntity = i.entities.find(e => e.type === 'goal');
      expect(goalEntity).toBeDefined();
    });
    test('entity extraction from decision: pattern', async () => {
      const ci = new ConversationInterpreter(C);
      const i = await ci.interpret('decision: hire contractor vs outsource');
      const decEntity = i.entities.find(e => e.type === 'decision');
      expect(decEntity).toBeDefined();
    });
    test('confidence > 0.5 for specific intent with entities', async () => {
      const ci = new ConversationInterpreter(C);
      const i = await ci.interpret('goal: improve team productivity');
      expect(i.confidence).toBeGreaterThan(0.5);
    });
    test('confidence is lower for general input', async () => {
      const ci = new ConversationInterpreter(C);
      const i = await ci.interpret('hello world');
      expect(i.confidence).toBeLessThanOrEqual(0.5);
    });
  });

  describe('Metrics edge cases', () => {
    test('missing counter returns 0', () => {
      expect(new PackMetricsRuntime().getCounter('nonexistent' as any)).toBe(0);
    });
    test('missing gauge returns 0', () => {
      expect(new PackMetricsRuntime().getGauge('nonexistent' as any)).toBe(0);
    });
    test('missing series returns empty', () => {
      expect(new PackMetricsRuntime().getSeries('nonexistent').length).toBe(0);
    });
    test('decrement below zero stays at -1 (no floor)', () => {
      const m = new PackMetricsRuntime();
      m.decrement('briefs_generated' as any);
      expect(m.getCounter('briefs_generated' as any)).toBe(-1);
    });
    test('setGauge overwrites previous value', () => {
      const m = new PackMetricsRuntime();
      m.setGauge('pi' as any, 50);
      m.setGauge('pi' as any, 75);
      expect(m.getGauge('pi' as any)).toBe(75);
    });
    test('reset clears everything', () => {
      const m = new PackMetricsRuntime();
      m.increment('a' as any);
      m.setGauge('b' as any, 5);
      m.recordSeries('c', 10);
      m.reset();
      expect(m.getCounter('a' as any)).toBe(0);
      expect(m.getGauge('b' as any)).toBe(0);
      expect(m.getSeries('c').length).toBe(0);
    });
    test('export produces valid JSON', () => {
      const m = new PackMetricsRuntime();
      m.increment('test' as any);
      const json = m.export();
      const parsed = JSON.parse(json);
      expect(parsed).toBeDefined();
    });
  });

  describe('Trace edge cases', () => {
    test('getSpan throws for invalid id', () => {
      expect(() => new PackTraceRuntime().getSpan('nonexistent')).toThrow();
    });
    test('average duration is 0 with no completed spans', () => {
      expect(new PackTraceRuntime().getAverageDurationMs()).toBe(0);
    });
    test('average duration by subsystem is 0 when none match', () => {
      const t = new PackTraceRuntime();
      t.startSpan('op', 'other');
      t.completeSpan(t.getAllSpans()[0].id as unknown as string);
      expect(t.getAverageDurationMs('nonexistent')).toBe(0);
    });
    test('child spans returned correctly', () => {
      const t = new PackTraceRuntime();
      const p = t.startSpan('parent', 'sub');
      const c = t.startSpan('child', 'sub', sid(p));
      t.completeSpan(sid(p));
      t.completeSpan(sid(c));
      expect(t.getChildSpans(sid(p)).length).toBe(1);
    });
    test('activateSpan is idempotent', () => {
      const t = new PackTraceRuntime();
      const s = t.startSpan('op', 'sub');
      t.activateSpan(sid(s));
      t.activateSpan(sid(s));
      expect(t.getActiveSpans().length).toBe(1);
    });
    test('completed span has durationMs', () => {
      const t = new PackTraceRuntime();
      const s = t.startSpan('op', 'sub');
      const c = t.completeSpan(sid(s));
      expect(c.durationMs).toBeGreaterThanOrEqual(0);
    });
    test('failed span has durationMs', () => {
      const t = new PackTraceRuntime();
      const s = t.startSpan('op', 'sub');
      const f = t.failSpan(sid(s));
      expect(f.durationMs).toBeGreaterThanOrEqual(0);
    });
    test('getSpansByOperation filters correctly', () => {
      const t = new PackTraceRuntime();
      t.startSpan('op1', 'sub');
      t.startSpan('op2', 'sub');
      t.startSpan('op1', 'sub');
      expect(t.getSpansByOperation('op1').length).toBe(2);
    });
  });

  describe('Dashboard edge cases', () => {
    test('getLatestDashboard returns null when empty', () => {
      const db = new PersonalDashboard(C);
      expect(db.getLatestDashboard()).toBeNull();
    });
    test('dashboard without constraint has constraintCount=0', () => {
      const db = new PersonalDashboard(C);
      const d = db.generateDashboard({ userId: 'u1', todaySummary: 'G', topGoals: [], nextActions: [], mainConstraint: null, mainRecommendation: null, productivityIndex: 50, developmentIndex: 50 });
      expect(d.constraintCount).toBe(0);
      expect(d.recommendationCount).toBe(0);
      expect(d.goalCount).toBe(0);
      expect(d.habitCount).toBe(0);
    });
    test('insight with default confidence is 0.5', () => {
      const db = new PersonalDashboard(C);
      const i = db.addInsight('T', 'D', 'c', 's');
      expect(i.confidence).toBe(0.5);
    });
    test('recentInsights limited to 10', () => {
      const db = new PersonalDashboard(C);
      for (let i = 0; i < 15; i++) db.addInsight(`I${i}`, 'D', 'c', 's');
      const d = db.generateDashboard({ userId: 'u1', todaySummary: 'G', topGoals: [], nextActions: [], mainConstraint: null, mainRecommendation: null, productivityIndex: 50, developmentIndex: 50 });
      expect(d.recentInsights.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Constraint getMainConstraint edge cases', () => {
    test('returns null when empty', () => {
      expect(new ConstraintAnalyzer(C).getMainConstraint()).toBeNull();
    });
    test('returns Systemic over Major', () => {
      const ca = new ConstraintAnalyzer(C);
      const major = ca.detectConstraint('M', 'd', ConstraintSeverity.Major);
      const systemic = ca.detectConstraint('S', 'd', ConstraintSeverity.Systemic);
      expect(ca.getMainConstraint()!.id).toBe(systemic.id);
    });
    test('ignores Resolved constraints', () => {
      const ca = new ConstraintAnalyzer(C);
      const c = ca.detectConstraint('T', 'd', ConstraintSeverity.Systemic);
      ca.advanceLifecycle(sid(c), ConstraintLifecycle.Resolved);
      const mc = ca.getMainConstraint();
      expect(mc).toBeNull();
    });
    test('severity ordering: Systemic > Major > Moderate > Minor', () => {
      const ca = new ConstraintAnalyzer(C);
      const minor = ca.detectConstraint('Mi', 'd', ConstraintSeverity.Minor);
      const moderate = ca.detectConstraint('Mo', 'd', ConstraintSeverity.Moderate);
      const major = ca.detectConstraint('Ma', 'd', ConstraintSeverity.Major);
      const systemic = ca.detectConstraint('S', 'd', ConstraintSeverity.Systemic);
      expect(ca.getMainConstraint()!.id).toBe(systemic.id);
    });
  });

  describe('Recommendation TTL', () => {
    test('active recommendations excludes expired', () => {
      const rc = new RecommendationComposer(C, 200, -1); // TTL -1 hours = already expired
      rc.composeRecommendation('T', 'D', { why: 'w', whyNow: 'n', whatValue: 'v', whyMainConstraint: 'c' });
      expect(rc.getActiveRecommendations().length).toBe(0);
    });
    test('evictExpired removes expired recommendations', () => {
      const rc = new RecommendationComposer(C, 200, -1);
      rc.composeRecommendation('T', 'D', { why: 'w', whyNow: 'n', whatValue: 'v', whyMainConstraint: 'c' });
      const removed = rc.evictExpired();
      expect(removed).toBeGreaterThanOrEqual(0);
    });
    test('present from non-Validated status throws', () => {
      const rc = new RecommendationComposer(C);
      const r = rc.composeRecommendation('T', 'D', { why: 'w', whyNow: 'n', whatValue: 'v', whyMainConstraint: 'c' });
      rc.accept(sid(r)); // skip present
      const r2 = rc.composeRecommendation('T2', 'D', { why: 'w', whyNow: 'n', whatValue: 'v', whyMainConstraint: 'c' });
      // Present then present again should throw
      rc.present(sid(r2));
      expect(() => rc.present(sid(r2))).toThrow();
    });
  });

  describe('Goal hierarchy edge cases', () => {
    test('deep hierarchy (5 levels) works', () => {
      const pl = new GoalPlanner(C);
      const v = pl.createGoal({ title: 'Vision', level: GoalLevel.Vision });
      const g = pl.createGoal({ title: 'Goal', level: GoalLevel.Goals, parentId: v.id });
      const p = pl.createGoal({ title: 'Project', level: GoalLevel.Projects, parentId: g.id });
      const m = pl.createGoal({ title: 'Milestone', level: GoalLevel.Milestones, parentId: p.id });
      const t = pl.createGoal({ title: 'Task', level: GoalLevel.Tasks, parentId: m.id });
      const a = pl.createGoal({ title: 'Action', level: GoalLevel.Actions, parentId: t.id });
      expect(pl.getGoalHierarchy(sid(a)).length).toBe(6);
    });
    test('getDescendants of leaf returns empty', () => {
      const pl = new GoalPlanner(C);
      const v = pl.createGoal({ title: 'V', level: GoalLevel.Vision });
      expect(pl.getDescendants(sid(v)).length).toBe(0);
    });
    test('getChildren of leaf returns empty', () => {
      const pl = new GoalPlanner(C);
      const v = pl.createGoal({ title: 'V', level: GoalLevel.Vision });
      expect(pl.getChildren(sid(v)).length).toBe(0);
    });
    test('goal with all fields set', () => {
      const g = new GoalPlanner(C).createGoal({
        title: 'T', description: 'D', level: GoalLevel.Projects,
        priority: 8, deadline: '2025-12-31', tags: ['a', 'b', 'c'],
      });
      expect(g.description).toBe('D');
      expect(g.priority).toBe(8);
      expect(g.deadline).toBe('2025-12-31');
      expect(g.tags).toEqual(['a', 'b', 'c']);
    });
    test('completed goal has progress=100 and completedAt set', () => {
      const pl = new GoalPlanner(C);
      const g = pl.createGoal({ title: 'T', level: GoalLevel.Tasks });
      pl.setStatus(sid(g), GoalStatus.Active);
      pl.setStatus(sid(g), GoalStatus.InProgress);
      const c = pl.setStatus(sid(g), GoalStatus.Completed);
      expect(c.progress).toBe(100);
      expect(c.completedAt).toBeDefined();
    });
  });

  describe('Onboarding answer parsing edge cases', () => {
    test('semicolon-separated goals', () => {
      const r = new PersonalIntelligencePackRuntime(C);
      const res = r.processOnboardingAnswers({ q1: 'G1; G2; G3' });
      expect(res.extractedGoals.length).toBe(3);
    });
    test('mixed separators', () => {
      const r = new PersonalIntelligencePackRuntime(C);
      const res = r.processOnboardingAnswers({ q1: 'G1, G2; G3\nG4' });
      expect(res.extractedGoals.length).toBe(4);
    });
    test('strips bullet prefixes', () => {
      const r = new PersonalIntelligencePackRuntime(C);
      const res = r.processOnboardingAnswers({ q1: '- Goal 1\n* Goal 2\n• Goal 3\n1. Goal 4' });
      expect(res.extractedGoals.length).toBe(4);
    });
    test('filters empty strings', () => {
      const r = new PersonalIntelligencePackRuntime(C);
      const res = r.processOnboardingAnswers({ q1: 'G1,,G2,,G3' });
      expect(res.extractedGoals.length).toBe(3);
    });
    test('no main constraint when no challenges', () => {
      const r = new PersonalIntelligencePackRuntime(C);
      const res = r.processOnboardingAnswers({ q1: 'G1' });
      expect(res.mainConstraint).toBe('No constraint identified yet');
    });
    test('value proposition without goals', () => {
      const r = new PersonalIntelligencePackRuntime(C);
      const res = r.processOnboardingAnswers({ q4: 'No time' });
      expect(res.valueProposition).toContain('Identify your goals');
    });
  });

  describe('ValueAnalyzer aggregation', () => {
    test('getTopValueDimensions sorts by avgConfidence descending', () => {
      const va = new ValueAnalyzer(C);
      va.createAssessment(ValueDimension.UserValue, 'D', ['r'], 'u', ['m'], 'i', 0.9);
      va.createAssessment(ValueDimension.UserValue, 'D', ['r'], 'u', ['m'], 'i', 0.7);
      va.createAssessment(ValueDimension.EconomicValue, 'D', ['r'], 'u', ['m'], 'i', 0.5);
      const top = va.getTopValueDimensions();
      expect(top[0].avgConfidence).toBeGreaterThanOrEqual(top[top.length - 1].avgConfidence);
    });
    test('getTopValueDimensions count is correct', () => {
      const va = new ValueAnalyzer(C);
      va.createAssessment(ValueDimension.UserValue, 'D', ['r'], 'u', ['m'], 'i', 0.5);
      va.createAssessment(ValueDimension.UserValue, 'D', ['r'], 'u', ['m'], 'i', 0.5);
      va.createAssessment(ValueDimension.EconomicValue, 'D', ['r'], 'u', ['m'], 'i', 0.5);
      const top = va.getTopValueDimensions();
      expect(top[0].count).toBe(2);
      expect(top[1].count).toBe(1);
    });
  });

  describe('Recommendation linked IDs', () => {
    test('recommendation with linked value assessment', () => {
      const rc = new RecommendationComposer(C);
      const r = rc.composeRecommendation('T', 'D', { why: 'w', whyNow: 'n', whatValue: 'v', whyMainConstraint: 'c' }, 'va-1');
      expect(r.valueAssessmentId).toBe('va-1');
    });
    test('recommendation with linked constraint', () => {
      const rc = new RecommendationComposer(C);
      const r = rc.composeRecommendation('T', 'D', { why: 'w', whyNow: 'n', whatValue: 'v', whyMainConstraint: 'c' }, undefined, 'co-1');
      expect(r.constraintId).toBe('co-1');
    });
    test('recommendation with linked goal', () => {
      const rc = new RecommendationComposer(C);
      const r = rc.composeRecommendation('T', 'D', { why: 'w', whyNow: 'n', whatValue: 'v', whyMainConstraint: 'c' }, undefined, undefined, 'go-1');
      expect(r.goalId).toBe('go-1');
    });
    test('recommendation without linked IDs has null refs', () => {
      const rc = new RecommendationComposer(C);
      const r = rc.composeRecommendation('T', 'D', { why: 'w', whyNow: 'n', whatValue: 'v', whyMainConstraint: 'c' });
      expect(r.valueAssessmentId).toBeNull();
      expect(r.constraintId).toBeNull();
      expect(r.goalId).toBeNull();
    });
  });
});
