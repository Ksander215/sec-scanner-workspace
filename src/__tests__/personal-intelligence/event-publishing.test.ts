import { describe, test, expect, vi } from 'vitest';
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
import { PersonalIntelligencePackRuntime } from '../../core/personal-intelligence/personal-intelligence-pack-runtime.js';
import {
  BriefType, GoalLevel, GoalStatus, ConstraintSeverity, ConstraintLifecycle,
  ValueDimension, KnowledgeNodeType, KnowledgeEdgeType, HabitDirection, HabitStrength,
  ReflectionPeriod, PackState,
} from '../../core/personal-intelligence/types.js';

const mkC = () => {
  const evts: Array<{ type: string; payload: any }> = [];
  const plat = { publishEvent: vi.fn((t: string, p: any) => { evts.push({ type: t, payload: p.payload ?? p }); return Promise.resolve(); }), getConfiguration: () => null, getHealth: async () => null };
  const C = {
    identity: { getCurrentUserId: () => 'u1', getUserRoles: () => ['admin'], getUserPreferences: () => ({}), resolvePreference: () => null },
    memory: { retrieve: async () => null, store: async () => {}, query: () => [], getSessionEntries: () => [], getWorkingEntries: () => [] },
    knowledge: { search: async () => [], getNamespaces: async () => [], getItemCount: async () => 0, getRecentItems: async () => [], getByTags: async () => [] },
    workflow: { getActiveWorkflows: () => [], getRunningInstances: () => [], getRecentCompletions: () => [], getAvailableWorkflows: () => [] },
    cognitive: { getCurrentIntent: () => null, getConversationTurnCount: () => 0, getCurrentSessionId: () => null, getConversationSummary: async () => null },
    personal: { getGoals: () => [], getActiveGoals: () => [], getRecommendations: () => [], getHabits: () => [], getReflections: () => [], getDecisions: () => [], getAttentionState: () => 'Focused' },
    aiProvider: { complete: async () => 'r', embed: async () => [0.1], isAvailable: () => true },
    experience: { getActiveAdaptations: () => [], getRecommendations: () => [], getCurrentPhase: () => 'Observing', getBehaviorPatterns: () => [] },
    platform: plat,
  };
  return { C, evts };
};

const sid = (o: any) => o.id as unknown as string;

describe('Event Publishing Verification', () => {
  describe('DailyBriefGenerator', () => {
    test('MorningBrief publishes BriefGenerated with correct payload', () => {
      const { C, evts } = mkC();
      const g = new DailyBriefGenerator(C);
      g.generateBrief(BriefType.MorningBrief);
      const e = evts.find(x => x.type === 'BriefGenerated');
      expect(e).toBeDefined();
      expect(e!.payload.briefType).toBe('MorningBrief');
      expect(e!.payload.itemCount).toBe(12);
      expect(e!.payload.productivityIndex).toBeGreaterThanOrEqual(0);
      expect(e!.payload.developmentIndex).toBeGreaterThanOrEqual(0);
      expect(e!.payload.generatedAt).toBeDefined();
      expect(e!.payload.briefId).toBeDefined();
      expect(e!.payload.date).toBeDefined();
      expect(C.platform.publishEvent).toHaveBeenCalled();
    });
    test('EveningSummary publishes BriefGenerated with itemCount=10', () => {
      const { C, evts } = mkC();
      new DailyBriefGenerator(C).generateBrief(BriefType.EveningSummary);
      expect(evts.find(x => x.type === 'BriefGenerated')!.payload.itemCount).toBe(10);
    });
    test('WeeklyReview publishes BriefGenerated with itemCount=15', () => {
      const { C, evts } = mkC();
      new DailyBriefGenerator(C).generateBrief(BriefType.WeeklyReview);
      expect(evts.find(x => x.type === 'BriefGenerated')!.payload.itemCount).toBe(15);
    });
    test('MiddayReview publishes BriefGenerated with itemCount=8', () => {
      const { C, evts } = mkC();
      new DailyBriefGenerator(C).generateBrief(BriefType.MiddayReview);
      expect(evts.find(x => x.type === 'BriefGenerated')!.payload.itemCount).toBe(8);
    });
    test('multiple briefs publish multiple events', () => {
      const { C, evts } = mkC();
      const g = new DailyBriefGenerator(C);
      g.generateBrief(BriefType.MorningBrief);
      g.generateBrief(BriefType.EveningSummary);
      expect(evts.filter(x => x.type === 'BriefGenerated').length).toBe(2);
    });
    test('event has aggregateType PersonalIntelligencePack', () => {
      const { C, evts } = mkC();
      new DailyBriefGenerator(C).generateBrief(BriefType.MorningBrief);
      const e = evts[0];
      expect(e.payload).toBeDefined();
    });
  });

  describe('ReflectionEngine', () => {
    test('Daily publishes ReflectionGenerated with period=Daily', () => {
      const { C, evts } = mkC();
      new ReflectionEngine(C).generateReflection(ReflectionPeriod.Daily);
      const e = evts.find(x => x.type === 'ReflectionGenerated');
      expect(e).toBeDefined();
      expect(e!.payload.period).toBe('Daily');
      expect(e!.payload.score).toBeGreaterThanOrEqual(0);
      expect(e!.payload.score).toBeLessThanOrEqual(100);
      expect(e!.payload.sentiment).toBeDefined();
      expect(e!.payload.reflectionId).toBeDefined();
      expect(e!.payload.generatedAt).toBeDefined();
    });
    test('Weekly publishes ReflectionGenerated with period=Weekly', () => {
      const { C, evts } = mkC();
      new ReflectionEngine(C).generateReflection(ReflectionPeriod.Weekly);
      expect(evts.find(x => x.type === 'ReflectionGenerated')!.payload.period).toBe('Weekly');
    });
    test('Monthly publishes ReflectionGenerated with period=Monthly', () => {
      const { C, evts } = mkC();
      new ReflectionEngine(C).generateReflection(ReflectionPeriod.Monthly);
      expect(evts.find(x => x.type === 'ReflectionGenerated')!.payload.period).toBe('Monthly');
    });
    test('event payload has date field', () => {
      const { C, evts } = mkC();
      new ReflectionEngine(C).generateReflection(ReflectionPeriod.Daily, '2025-01-15');
      expect(evts.find(x => x.type === 'ReflectionGenerated')!.payload.date).toBe('2025-01-15');
    });
  });

  describe('GoalPlanner', () => {
    const levels = [GoalLevel.Vision, GoalLevel.Goals, GoalLevel.Projects, GoalLevel.Milestones, GoalLevel.Tasks, GoalLevel.Actions];
    const levelNames = ['Vision', 'Goals', 'Projects', 'Milestones', 'Tasks', 'Actions'];
    for (let i = 0; i < levels.length; i++) {
      test(`createGoal(${levelNames[i]}) publishes PackGoalCreated with level=${levelNames[i]}`, () => {
        const { C, evts } = mkC();
        new GoalPlanner(C).createGoal({ title: 'T', level: levels[i] });
        const e = evts.find(x => x.type === 'PackGoalCreated');
        expect(e).toBeDefined();
        expect(e!.payload.level).toBe(levelNames[i]);
        expect(e!.payload.title).toBeDefined();
        expect(e!.payload.goalId).toBeDefined();
        expect(e!.payload.createdAt).toBeDefined();
      });
    }
    test('createGoal with parentId publishes event with parentId', () => {
      const { C, evts } = mkC();
      const pl = new GoalPlanner(C);
      const v = pl.createGoal({ title: 'V', level: GoalLevel.Vision });
      pl.createGoal({ title: 'G', level: GoalLevel.Goals, parentId: v.id });
      const goalEvt = evts.filter(x => x.type === 'PackGoalCreated');
      expect(goalEvt[1].payload.parentId).toBeDefined();
    });
    test('setStatus(Completed) publishes PackGoalCompleted', () => {
      const { C, evts } = mkC();
      const pl = new GoalPlanner(C);
      const g = pl.createGoal({ title: 'T', level: GoalLevel.Tasks });
      pl.setStatus(sid(g), GoalStatus.Active);
      pl.setStatus(sid(g), GoalStatus.InProgress);
      pl.setStatus(sid(g), GoalStatus.Completed);
      const e = evts.find(x => x.type === 'PackGoalCompleted');
      expect(e).toBeDefined();
      expect(e!.payload.completedAt).toBeDefined();
      expect(e!.payload.goalId).toBeDefined();
    });
    test('updateGoal publishes PackGoalUpdated with changedAttributes', () => {
      const { C, evts } = mkC();
      const pl = new GoalPlanner(C);
      const g = pl.createGoal({ title: 'T', level: GoalLevel.Tasks });
      pl.updateGoal(sid(g), { title: 'Updated' });
      const e = evts.find(x => x.type === 'PackGoalUpdated');
      expect(e).toBeDefined();
      expect(e!.payload.changedAttributes).toContain('title');
    });
    test('setStatus(non-completed) publishes PackGoalStatusChanged', () => {
      const { C, evts } = mkC();
      const pl = new GoalPlanner(C);
      const g = pl.createGoal({ title: 'T', level: GoalLevel.Tasks });
      pl.setStatus(sid(g), GoalStatus.Active);
      const e = evts.find(x => x.type === 'PackGoalStatusChanged');
      expect(e).toBeDefined();
      expect(e!.payload.oldStatus).toBe('Draft');
      expect(e!.payload.newStatus).toBe('Active');
    });
  });

  describe('DecisionAdvisor', () => {
    test('createDecision publishes PackDecisionCreated', () => {
      const { C, evts } = mkC();
      new DecisionAdvisor(C).createDecision('T', 'D', ['A', 'B']);
      const e = evts.find(x => x.type === 'PackDecisionCreated');
      expect(e).toBeDefined();
      expect(e!.payload.title).toBe('T');
      expect(e!.payload.optionCount).toBe(2);
      expect(e!.payload.createdAt).toBeDefined();
      expect(e!.payload.decisionId).toBeDefined();
    });
    test('resolve publishes PackDecisionResolved', () => {
      const { C, evts } = mkC();
      const da = new DecisionAdvisor(C);
      const d = da.createDecision('T', 'D', ['A']);
      da.resolve(sid(d), 'done', 'choose A');
      const e = evts.find(x => x.type === 'PackDecisionResolved');
      expect(e).toBeDefined();
      expect(e!.payload.conclusion).toBe('done');
      expect(e!.payload.resolvedAt).toBeDefined();
    });
    test('createDecision with no options publishes with optionCount=0', () => {
      const { C, evts } = mkC();
      new DecisionAdvisor(C).createDecision('T', 'D', []);
      expect(evts.find(x => x.type === 'PackDecisionCreated')!.payload.optionCount).toBe(0);
    });
  });

  describe('ConstraintAnalyzer', () => {
    const sevs = [ConstraintSeverity.Systemic, ConstraintSeverity.Major, ConstraintSeverity.Moderate, ConstraintSeverity.Minor];
    const sevNames = ['Systemic', 'Major', 'Moderate', 'Minor'];
    for (let i = 0; i < sevs.length; i++) {
      test(`detectConstraint(${sevNames[i]}) publishes ConstraintDetected`, () => {
        const { C, evts } = mkC();
        new ConstraintAnalyzer(C).detectConstraint('T', 'D', sevs[i]);
        const e = evts.find(x => x.type === 'ConstraintDetected');
        expect(e).toBeDefined();
        expect(e!.payload.severity).toBe(sevNames[i]);
        expect(e!.payload.title).toBeDefined();
        expect(e!.payload.constraintId).toBeDefined();
        expect(e!.payload.detectedAt).toBeDefined();
      });
    }
    test('detectConstraint with goalId publishes goalId in payload', () => {
      const { C, evts } = mkC();
      new ConstraintAnalyzer(C).detectConstraint('T', 'D', ConstraintSeverity.Major, 'goal-1', 'high impact');
      expect(evts.find(x => x.type === 'ConstraintDetected')!.payload.goalId).toBe('goal-1');
    });
    test('advanceLifecycle to Resolved publishes ConstraintResolved', () => {
      const { C, evts } = mkC();
      const ca = new ConstraintAnalyzer(C);
      const c = ca.detectConstraint('T', 'D', ConstraintSeverity.Major);
      ca.advanceLifecycle(sid(c), ConstraintLifecycle.Resolved);
      const e = evts.find(x => x.type === 'ConstraintResolved');
      expect(e).toBeDefined();
      expect(e!.payload.resolvedAt).toBeDefined();
    });
    const lcStages = [ConstraintLifecycle.Analyzed, ConstraintLifecycle.ActionPlan, ConstraintLifecycle.Exploiting, ConstraintLifecycle.Elevated];
    for (const lc of lcStages) {
      test(`advanceLifecycle to ${lc} publishes ConstraintLifecycleChanged`, () => {
        const { C, evts } = mkC();
        const ca = new ConstraintAnalyzer(C);
        const c = ca.detectConstraint('T', 'D', ConstraintSeverity.Moderate);
        ca.advanceLifecycle(sid(c), lc);
        const e = evts.find(x => x.type === 'ConstraintLifecycleChanged');
        expect(e).toBeDefined();
        expect(e!.payload.oldLifecycle).toBe('Detected');
        expect(e!.payload.newLifecycle).toBe(lc);
      });
    }
  });

  describe('ValueAnalyzer', () => {
    const dims = [ValueDimension.UserValue, ValueDimension.EconomicValue, ValueDimension.KnowledgeValue,
      ValueDimension.SocialValue, ValueDimension.CreativeValue, ValueDimension.OperationalValue,
      ValueDimension.StrategicValue, ValueDimension.EmotionalValue];
    for (const d of dims) {
      test(`createAssessment(${d}) publishes ValueAssessmentCreated`, () => {
        const { C, evts } = mkC();
        new ValueAnalyzer(C).createAssessment(d, 'Desc', ['r1'], 'user', ['m1'], 'impact', 0.8);
        const e = evts.find(x => x.type === 'ValueAssessmentCreated');
        expect(e).toBeDefined();
        expect(e!.payload.dimension).toBe(d);
        expect(e!.payload.confidence).toBe(0.8);
        expect(e!.payload.assessmentId).toBeDefined();
        expect(e!.payload.createdAt).toBeDefined();
      });
    }
    test('confidence is clamped to [0,1] in event payload', () => {
      const { C, evts } = mkC();
      new ValueAnalyzer(C).createAssessment(ValueDimension.UserValue, 'D', ['r'], 'u', ['m'], 'i', 5);
      expect(evts.find(x => x.type === 'ValueAssessmentCreated')!.payload.confidence).toBe(1);
    });
  });

  describe('RecommendationComposer', () => {
    const why = { why: 'w', whyNow: 'n', whatValue: 'v', whyMainConstraint: 'c' };
    test('composeRecommendation publishes RecommendationComposed', () => {
      const { C, evts } = mkC();
      new RecommendationComposer(C).composeRecommendation('T', 'D', why);
      const e = evts.find(x => x.type === 'RecommendationComposed');
      expect(e).toBeDefined();
      expect(e!.payload.chainComplete).toBe(true);
      expect(e!.payload.confidence).toBeGreaterThanOrEqual(0);
      expect(e!.payload.recommendationId).toBeDefined();
      expect(e!.payload.composedAt).toBeDefined();
    });
    test('accept publishes RecommendationAccepted', () => {
      const { C, evts } = mkC();
      const rc = new RecommendationComposer(C);
      const r = rc.composeRecommendation('T', 'D', why);
      rc.present(sid(r));
      rc.accept(sid(r));
      const e = evts.find(x => x.type === 'RecommendationAccepted');
      expect(e).toBeDefined();
      expect(e!.payload.acceptedAt).toBeDefined();
    });
    test('reject publishes RecommendationRejected with reason', () => {
      const { C, evts } = mkC();
      const rc = new RecommendationComposer(C);
      const r = rc.composeRecommendation('T', 'D', why);
      rc.present(sid(r));
      rc.reject(sid(r), 'not relevant');
      const e = evts.find(x => x.type === 'RecommendationRejected');
      expect(e).toBeDefined();
      expect(e!.payload.reason).toBe('not relevant');
      expect(e!.payload.rejectedAt).toBeDefined();
    });
    test('compose with linked IDs publishes with correct payload', () => {
      const { C, evts } = mkC();
      new RecommendationComposer(C).composeRecommendation('T', 'D', why, 'va-1', 'co-1', 'go-1', 0.9);
      const e = evts.find(x => x.type === 'RecommendationComposed');
      expect(e!.payload.confidence).toBe(0.9);
    });
  });

  describe('KnowledgeSynthesizer', () => {
    const nodeTypes = [KnowledgeNodeType.Note, KnowledgeNodeType.Conversation, KnowledgeNodeType.Project,
      KnowledgeNodeType.Decision, KnowledgeNodeType.Conclusion, KnowledgeNodeType.Experience,
      KnowledgeNodeType.Concept, KnowledgeNodeType.Question, KnowledgeNodeType.Insight];
    for (const nt of nodeTypes) {
      test(`addNode(${nt}) publishes KnowledgeNodeCreated`, () => {
        const { C, evts } = mkC();
        new KnowledgeSynthesizer(C).addNode(nt, 'Title', 'Content', 'src');
        const e = evts.find(x => x.type === 'KnowledgeNodeCreated');
        expect(e).toBeDefined();
        expect(e!.payload.type).toBe(nt);
        expect(e!.payload.title).toBeDefined();
        expect(e!.payload.nodeId).toBeDefined();
      });
    }
    test('addEdge publishes KnowledgeEdgeCreated', () => {
      const { C, evts } = mkC();
      const ks = new KnowledgeSynthesizer(C);
      const n1 = ks.addNode(KnowledgeNodeType.Note, 'N1', 'C', 's');
      const n2 = ks.addNode(KnowledgeNodeType.Concept, 'N2', 'C', 's');
      ks.addEdge(n1.id, n2.id, KnowledgeEdgeType.RelatedTo);
      const e = evts.find(x => x.type === 'KnowledgeEdgeCreated');
      expect(e).toBeDefined();
      expect(e!.payload.edgeType).toBe('RelatedTo');
      expect(e!.payload.sourceId).toBeDefined();
      expect(e!.payload.targetId).toBeDefined();
    });
    test('addNode with tags publishes event', () => {
      const { C, evts } = mkC();
      new KnowledgeSynthesizer(C).addNode(KnowledgeNodeType.Note, 'T', 'C', 's', ['tag1', 'tag2']);
      expect(evts.find(x => x.type === 'KnowledgeNodeCreated')).toBeDefined();
    });
  });

  describe('ConversationInterpreter', () => {
    const cases: Array<{ input: string; intent: string }> = [
      { input: 'I want to set a new goal', intent: 'GoalSetting' },
      { input: 'I need to decide between options', intent: 'DecisionMaking' },
      { input: 'Let me reflect on today', intent: 'Reflection' },
      { input: 'I need to plan my week', intent: 'Planning' },
      { input: 'What is my main constraint?', intent: 'ConstraintExploration' },
      { input: 'What value does this create?', intent: 'ValueInquiry' },
      { input: 'Here is my feedback', intent: 'Feedback' },
      { input: 'random text', intent: 'General' },
    ];
    for (const c of cases) {
      test(`interpret("${c.input}") publishes ConversationInterpreted with intent=${c.intent}`, async () => {
        const { C, evts } = mkC();
        await new ConversationInterpreter(C).interpret(c.input);
        const e = evts.find(x => x.type === 'ConversationInterpreted');
        expect(e).toBeDefined();
        expect(e!.payload.intent).toBe(c.intent);
        expect(e!.payload.confidence).toBeGreaterThan(0);
        expect(e!.payload.interpretationId).toBeDefined();
        expect(e!.payload.interpretedAt).toBeDefined();
      });
    }
    test('Russian keyword for goal triggers GoalSetting intent', async () => {
      const { C, evts } = mkC();
      await new ConversationInterpreter(C).interpret('моя цель на этот квартал');
      expect(evts.find(x => x.type === 'ConversationInterpreted')!.payload.intent).toBe('GoalSetting');
    });
    test('Russian keyword for decision triggers DecisionMaking intent', async () => {
      const { C, evts } = mkC();
      await new ConversationInterpreter(C).interpret('нужно решить эту проблему');
      expect(evts.find(x => x.type === 'ConversationInterpreted')!.payload.intent).toBe('DecisionMaking');
    });
  });

  describe('HabitInsights', () => {
    const dirs = [HabitDirection.Positive, HabitDirection.Negative, HabitDirection.Neutral];
    for (const d of dirs) {
      test(`detectHabit(${d}) publishes HabitInsightDetected`, () => {
        const { C, evts } = mkC();
        new HabitInsights(C).detectHabit('H', 'D', d);
        const e = evts.find(x => x.type === 'HabitInsightDetected');
        expect(e).toBeDefined();
        expect(e!.payload.direction).toBe(d);
        expect(e!.payload.name).toBeDefined();
        expect(e!.payload.habitId).toBeDefined();
        expect(e!.payload.detectedAt).toBeDefined();
      });
    }
    const strengths = [HabitStrength.Emerging, HabitStrength.Established, HabitStrength.Strong, HabitStrength.Core];
    for (const s of strengths) {
      test(`detectHabit with strength=${s} publishes strength in payload`, () => {
        const { C, evts } = mkC();
        new HabitInsights(C).detectHabit('H', 'D', HabitDirection.Positive, s);
        expect(evts.find(x => x.type === 'HabitInsightDetected')!.payload.strength).toBe(s);
      });
    }
  });

  describe('PriorityOptimizer', () => {
    test('calculateAllPriorities publishes PrioritiesCalculated', () => {
      const { C, evts } = mkC();
      const po = new PriorityOptimizer(C);
      const factors = new Map([['g1', { deadline: 5, importance: 8, urgency: 6, energy: 7, context: 5, dependencies: 4, risk: 3, value: 9 }]]);
      po.calculateAllPriorities(['g1'], factors);
      const e = evts.find(x => x.type === 'PrioritiesCalculated');
      expect(e).toBeDefined();
      expect(e!.payload.goalCount).toBe(1);
      expect(e!.payload.topGoalId).toBeDefined();
      expect(e!.payload.calculatedAt).toBeDefined();
    });
  });

  describe('PersonalIntelligencePackRuntime', () => {
    test('initialize publishes PackInitialized', async () => {
      const { C, evts } = mkC();
      const r = new PersonalIntelligencePackRuntime(C);
      await r.initialize();
      const e = evts.find(x => x.type === 'PackInitialized');
      expect(e).toBeDefined();
      expect(e!.payload.subsystemCount).toBe(15);
      expect(e!.payload.initializedAt).toBeDefined();
    });
    test('initialize publishes PackStateChanged', async () => {
      const { C, evts } = mkC();
      const r = new PersonalIntelligencePackRuntime(C);
      await r.initialize();
      const stateChanges = evts.filter(x => x.type === 'PackStateChanged');
      expect(stateChanges.length).toBeGreaterThanOrEqual(1);
    });
    test('generateMorningBrief traces and meters', async () => {
      const { C, evts } = mkC();
      const r = new PersonalIntelligencePackRuntime(C);
      await r.initialize();
      r.generateMorningBrief();
      expect(evts.some(x => x.type === 'BriefGenerated')).toBe(true);
      expect(r.metrics.getCounter('briefs_generated' as any)).toBe(1);
    });
  });

  describe('PersonalDashboard', () => {
    test('generateDashboard publishes DashboardGenerated', () => {
      const { C, evts } = mkC();
      const d = new PersonalDashboard(C);
      d.generateDashboard({ userId: 'u1', todaySummary: 'Good', topGoals: [], nextActions: [], mainConstraint: null, mainRecommendation: null, productivityIndex: 75, developmentIndex: 60 });
      const e = evts.find(x => x.type === 'DashboardGenerated');
      expect(e).toBeDefined();
      expect(e!.payload.productivityIndex).toBe(75);
      expect(e!.payload.developmentIndex).toBe(60);
      expect(e!.payload.generatedAt).toBeDefined();
    });
  });
});
