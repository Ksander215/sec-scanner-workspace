import { describe, test, expect } from 'vitest';
import { PersonalIntelligencePackRuntime } from '../../core/personal-intelligence/personal-intelligence-pack-runtime.js';
import {
  PackState, BriefType, OnboardingCategory, GoalLevel, ConstraintSeverity,
  ReflectionPeriod, ValueDimension, HabitDirection, RecommendationStatus,
  KnowledgeNodeType, KnowledgeEdgeType,
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

const why = { why: 'w', whyNow: 'n', whatValue: 'v', whyMainConstraint: 'c' };

describe('First Intelligence Experience Extended', () => {
  describe('Onboarding questions structure', () => {
    test('questions are in correct category order', () => {
      const r = new PersonalIntelligencePackRuntime(C);
      const q = r.getOnboardingQuestions();
      expect(q[0].category).toBe(OnboardingCategory.Goals);
      expect(q[1].category).toBe(OnboardingCategory.CurrentProjects);
      expect(q[2].category).toBe(OnboardingCategory.Habits);
      expect(q[3].category).toBe(OnboardingCategory.Challenges);
      expect(q[4].category).toBe(OnboardingCategory.Values);
    });
    test('question IDs are q1..q5', () => {
      const q = new PersonalIntelligencePackRuntime(C).getOnboardingQuestions();
      expect(q.map(q => q.id)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5']);
    });
    test('followUps are non-empty arrays', () => {
      const q = new PersonalIntelligencePackRuntime(C).getOnboardingQuestions();
      for (const question of q) {
        expect(Array.isArray(question.followUps)).toBe(true);
        expect(question.followUps.length).toBeGreaterThan(0);
      }
    });
    test('questions array is frozen', () => {
      const q = new PersonalIntelligencePackRuntime(C).getOnboardingQuestions();
      expect(Object.isFrozen(q)).toBe(true);
    });
    test('each question has required fields', () => {
      const q = new PersonalIntelligencePackRuntime(C).getOnboardingQuestions();
      for (const question of q) {
        expect(question.id).toBeDefined();
        expect(question.question).toBeDefined();
        expect(question.category).toBeDefined();
        expect(typeof question.required).toBe('boolean');
      }
    });
    test('each followUps has content', () => {
      const q = new PersonalIntelligencePackRuntime(C).getOnboardingQuestions();
      for (const question of q) {
        for (const fu of question.followUps) {
          expect(fu.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Full First Intelligence flow', () => {
    test('complete flow: onboarding -> goals -> constraint -> value -> recommendation -> brief -> reflection -> dashboard', async () => {
      const r = new PersonalIntelligencePackRuntime(C);
      await r.initialize();
      
      // 1. Onboarding
      const answers = r.processOnboardingAnswers({
        q1: 'Ship AIS v1\nGet 100 users',
        q2: 'AIS Platform',
        q3: 'Morning planning',
        q4: 'Scope creep is killing velocity',
        q5: 'Systematic value creation',
      });
      expect(answers.extractedGoals.length).toBe(2);
      expect(answers.mainConstraint).toBe('Scope creep is killing velocity');
      expect(answers.valueProposition.length).toBeGreaterThan(0);
      expect(answers.firstActionStep.length).toBeGreaterThan(0);

      // 2. Create goals from extracted goals
      for (const g of answers.extractedGoals) {
        r.goalPlanner.createGoal({ title: g, level: GoalLevel.Goals });
      }
      expect(r.goalPlanner.getGoalCount()).toBe(2);

      // 3. Detect main constraint
      const constraint = r.constraintAnalyzer.detectConstraint(answers.mainConstraint, 'From onboarding', ConstraintSeverity.Major);
      expect(constraint.severity).toBe(ConstraintSeverity.Major);

      // 4. Value assessment
      const va = r.valueAnalyzer.createAssessment(ValueDimension.UserValue, 'Faster progress', ['saves time'], 'user', ['velocity'], 'higher throughput', 0.8);
      expect(va.dimension).toBe(ValueDimension.UserValue);

      // 5. Recommendation with full chain
      const rec = r.recommendationComposer.composeRecommendation(
        'Address scope creep', 'Use constraint-first planning',
        { why: 'Scope creep wastes 40% of sprint capacity', whyNow: 'Current sprint is blocked', whatValue: 'Regain 40% throughput', whyMainConstraint: 'Scope creep is the primary bottleneck' },
        sid(va), sid(constraint), undefined, 0.85,
      );
      expect(rec.chain.length).toBe(6);
      expect(rec.chain.every(s => s.completed)).toBe(true);

      // 6. Morning brief
      const brief = r.generateMorningBrief();
      expect(brief.type).toBe(BriefType.MorningBrief);
      expect(brief.items.length).toBe(12);

      // 7. Evening reflection
      const reflection = r.generateEveningReflection();
      expect(reflection.period).toBe(ReflectionPeriod.Daily);
      expect(reflection.accomplishments.length).toBeGreaterThan(0);

      // 8. Verify state
      const state = r.getState() as any;
      expect(state.state).toBe(PackState.Active);
      expect(state.subsystems.goals.count).toBe(2);
      expect(state.subsystems.constraints.active).toBe(1);
      expect(state.subsystems.valueAssessments.count).toBe(1);
      expect(state.subsystems.recommendations.total).toBe(1);
      expect(state.metrics.counters.briefs_generated).toBe(1);
      expect(state.metrics.counters.reflections_generated).toBe(1);
    });

    test('minimal onboarding (only required answers) produces valid result', async () => {
      const r = new PersonalIntelligencePackRuntime(C);
      await r.initialize();
      const answers = r.processOnboardingAnswers({ q1: 'Ship product' });
      expect(answers.extractedGoals.length).toBe(1);
      expect(answers.extractedProjects.length).toBe(0);
      expect(answers.valueProposition.length).toBeGreaterThan(0);
    });

    test('empty onboarding produces default results', async () => {
      const r = new PersonalIntelligencePackRuntime(C);
      await r.initialize();
      const answers = r.processOnboardingAnswers({});
      expect(answers.extractedGoals.length).toBe(0);
      expect(answers.mainConstraint).toBe('No constraint identified yet');
      expect(answers.firstActionStep.length).toBeGreaterThan(0);
    });

    test('onboarding metrics are tracked', async () => {
      const r = new PersonalIntelligencePackRuntime(C);
      await r.initialize();
      r.processOnboardingAnswers({ q1: 'G1', q4: 'C1' });
      expect(r.metrics.getCounter('goals_created' as any)).toBe(1);
      expect(r.metrics.getCounter('constraints_detected' as any)).toBe(1);
    });
  });

  describe('Daily cycle integration', () => {
    test('morning brief + evening reflection + metrics', async () => {
      const r = new PersonalIntelligencePackRuntime(C);
      await r.initialize();
      
      const b = r.generateMorningBrief();
      expect(b.productivityIndex).toBeGreaterThanOrEqual(0);
      expect(r.metrics.getGauge('productivity_index' as any)).toBe(b.productivityIndex);

      const ref = r.generateEveningReflection();
      expect(ref.score).toBeGreaterThanOrEqual(0);
      expect(r.metrics.getCounter('reflections_generated' as any)).toBe(1);

      // Trace verification
      const briefSpans = r.trace.getSpansByOperation('generateMorningBrief');
      expect(briefSpans.length).toBe(1);
      expect(briefSpans[0].status).toBe('Completed');

      const reflSpans = r.trace.getSpansByOperation('generateEveningReflection');
      expect(reflSpans.length).toBe(1);
      expect(reflSpans[0].status).toBe('Completed');
    });

    test('multiple briefs increment counter', async () => {
      const r = new PersonalIntelligencePackRuntime(C);
      await r.initialize();
      r.generateMorningBrief();
      r.generateMorningBrief();
      r.generateMorningBrief();
      expect(r.metrics.getCounter('briefs_generated' as any)).toBe(3);
    });
  });

  describe('Multi-subsystem orchestration', () => {
    test('goals feed into dashboard', async () => {
      const r = new PersonalIntelligencePackRuntime(C);
      await r.initialize();
      const g1 = r.goalPlanner.createGoal({ title: 'G1', level: GoalLevel.Goals });
      const g2 = r.goalPlanner.createGoal({ title: 'G2', level: GoalLevel.Goals });
      const d = r.dashboard.generateDashboard({
        userId: 'u1', todaySummary: 'Good', topGoals: [g1, g2],
        nextActions: ['Do X', 'Do Y'],
        mainConstraint: null, mainRecommendation: null,
        productivityIndex: 80, developmentIndex: 70,
      });
      expect(d.goalCount).toBe(2);
      expect(d.nextActions.length).toBe(2);
    });

    test('constraint + recommendation on dashboard', async () => {
      const r = new PersonalIntelligencePackRuntime(C);
      await r.initialize();
      const c = r.constraintAnalyzer.detectConstraint('T', 'D', ConstraintSeverity.Major);
      const rec = r.recommendationComposer.composeRecommendation('T', 'D', why);
      r.recommendationComposer.present(sid(rec));
      const d = r.dashboard.generateDashboard({
        userId: 'u1', todaySummary: 'G', topGoals: [], nextActions: [],
        mainConstraint: c, mainRecommendation: rec,
        productivityIndex: 60, developmentIndex: 50,
      });
      expect(d.constraintCount).toBe(1);
      expect(d.recommendationCount).toBe(1);
      expect(d.mainConstraint).toBeDefined();
      expect(d.mainRecommendation).toBeDefined();
    });

    test('knowledge graph from conversation + goals', async () => {
      const r = new PersonalIntelligencePackRuntime(C);
      await r.initialize();
      const conv = r.conversationInterpreter.interpret('I want to set a goal for launching AIS v1');
      expect(conv.intent).toBe('GoalSetting');
      
      const goalNode = r.knowledgeSynthesizer.addNode(KnowledgeNodeType.Project, 'AIS v1 Launch', 'Main product', 'conversation');
      const conceptNode = r.knowledgeSynthesizer.addNode(KnowledgeNodeType.Concept, 'Scope Management', 'Managing project scope', 'knowledge');
      r.knowledgeSynthesizer.addEdge(goalNode.id, conceptNode.id, KnowledgeEdgeType.DependsOn);
      
      const synthesis = r.knowledgeSynthesizer.getSynthesis();
      expect(synthesis.totalNodes).toBe(2);
      expect(synthesis.totalEdges).toBe(1);
    });

    test('habit tracking with knowledge graph', async () => {
      const r = new PersonalIntelligencePackRuntime(C);
      await r.initialize();
      const h = r.habitInsights.detectHabit('Morning planning', 'Planning every morning', HabitDirection.Positive);
      for (let i = 0; i < 10; i++) r.habitInsights.recordObservation(sid(h));
      expect(r.habitInsights.getHabit(sid(h)).strength).toBe('Established');
      expect(r.habitInsights.getHabit(sid(h)).observationCount).toBe(11);
    });

    test('priority calculation after goals created', async () => {
      const r = new PersonalIntelligencePackRuntime(C);
      await r.initialize();
      const g1 = r.goalPlanner.createGoal({ title: 'G1', level: GoalLevel.Goals, priority: 8 });
      const g2 = r.goalPlanner.createGoal({ title: 'G2', level: GoalLevel.Goals, priority: 5 });
      const factors = new Map([
        [sid(g1), { deadline: 3, importance: 9, urgency: 8, energy: 7, context: 6, dependencies: 5, risk: 4, value: 10 }],
        [sid(g2), { deadline: 8, importance: 6, urgency: 4, energy: 5, context: 3, dependencies: 2, risk: 1, value: 5 }],
      ]);
      const ranked = r.priorityOptimizer.calculateAllPriorities([sid(g1), sid(g2)], factors);
      expect(ranked.length).toBe(2);
      expect(ranked[0].rank).toBe(1);
      expect(ranked[0].totalScore).toBeGreaterThan(ranked[1].totalScore);
    });

    test('decision with constraint analysis', async () => {
      const r = new PersonalIntelligencePackRuntime(C);
      await r.initialize();
      const c = r.constraintAnalyzer.detectConstraint('Budget limit', 'Only $50K available', ConstraintSeverity.Major);
      const d = r.decisionAdvisor.createDecision('Hire vs Outsource', 'Need dev capacity', ['Hire in-house', 'Outsource to agency']);
      r.decisionAdvisor.addAnalysis(sid(d), 0, { pros: ['Full control'] });
      r.decisionAdvisor.addAnalysis(sid(d), 1, { cons: ['Less control'] });
      const resolved = r.decisionAdvisor.resolve(sid(d), 'Hire in-house for core, outsource non-core');
      expect(resolved.status).toBe('Resolved');
      expect(resolved.conclusion).toBeDefined();
    });
  });

  describe('Dispose cleanup verification', () => {
    test('dispose clears all subsystems', async () => {
      const r = new PersonalIntelligencePackRuntime(C);
      await r.initialize();
      r.generateMorningBrief();
      r.goalPlanner.createGoal({ title: 'G', level: GoalLevel.Goals });
      r.constraintAnalyzer.detectConstraint('T', 'D', ConstraintSeverity.Major);
      r.valueAnalyzer.createAssessment(ValueDimension.UserValue, 'D', ['r'], 'u', ['m'], 'i', 0.5);
      r.recommendationComposer.composeRecommendation('T', 'D', why);
      r.knowledgeSynthesizer.addNode(KnowledgeNodeType.Note, 'N', 'C', 's');
      r.conversationInterpreter.interpret('test');
      r.habitInsights.detectHabit('H', 'D', HabitDirection.Positive);
      r.priorityOptimizer.calculatePriority('g1', { deadline: 5, importance: 8, urgency: 6, energy: 7, context: 5, dependencies: 4, risk: 3, value: 9 });
      r.dashboard.addInsight('I', 'D', 'c', 's');
      
      r.dispose();
      expect(r.dailyBrief.getBriefCount()).toBe(0);
      expect(r.reflection.getReflectionCount()).toBe(0);
      expect(r.goalPlanner.getGoalCount()).toBe(0);
      expect(r.decisionAdvisor.getDecisionCount()).toBe(0);
      expect(r.constraintAnalyzer.getConstraintCount()).toBe(0);
      expect(r.valueAnalyzer.getAssessmentCount()).toBe(0);
      expect(r.recommendationComposer.getRecommendationCount()).toBe(0);
      expect(r.knowledgeSynthesizer.getNodeCount()).toBe(0);
      expect(r.conversationInterpreter.getInterpretationCount()).toBe(0);
      expect(r.habitInsights.getHabitCount()).toBe(0);
      expect(r.priorityOptimizer.getScoreCount()).toBe(0);
      expect(r.dashboard.getDashboardCount()).toBe(0);
    });

    test('getState after dispose shows Disabled', async () => {
      const r = new PersonalIntelligencePackRuntime(C);
      await r.initialize();
      r.dispose();
      const state = r.getState() as any;
      expect(state.state).toBe(PackState.Disabled);
    });
  });

  describe('Config propagation', () => {
    test('custom maxGoals propagates to GoalPlanner', () => {
      const r = new PersonalIntelligencePackRuntime(C, { maxGoals: 5 });
      for (let i = 0; i < 5; i++) r.goalPlanner.createGoal({ title: `G${i}`, level: GoalLevel.Tasks });
      expect(() => r.goalPlanner.createGoal({ title: 'G5', level: GoalLevel.Tasks })).toThrow();
    });
    test('custom maxDecisions propagates to DecisionAdvisor', () => {
      const r = new PersonalIntelligencePackRuntime(C, { maxDecisions: 2 });
      r.decisionAdvisor.createDecision('D1', 'd', []);
      r.decisionAdvisor.createDecision('D2', 'd', []);
      expect(() => r.decisionAdvisor.createDecision('D3', 'd', [])).toThrow();
    });
    test('custom maxConstraints propagates to ConstraintAnalyzer', () => {
      const r = new PersonalIntelligencePackRuntime(C, { maxConstraints: 1 });
      r.constraintAnalyzer.detectConstraint('C1', 'd', ConstraintSeverity.Minor);
      expect(() => r.constraintAnalyzer.detectConstraint('C2', 'd', ConstraintSeverity.Minor)).toThrow();
    });
  });
});
