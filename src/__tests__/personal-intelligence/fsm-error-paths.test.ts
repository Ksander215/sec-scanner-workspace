import { describe, test, expect } from 'vitest';
import { PersonalIntelligencePackRuntime } from '../../core/personal-intelligence/personal-intelligence-pack-runtime.js';
import { GoalPlanner } from '../../core/personal-intelligence/goal-planner.js';
import { ConstraintAnalyzer } from '../../core/personal-intelligence/constraint-analyzer.js';
import { DailyBriefGenerator } from '../../core/personal-intelligence/daily-brief-generator.js';
import { ReflectionEngine } from '../../core/personal-intelligence/reflection-engine.js';
import { GoalStatus, GoalLevel, ConstraintSeverity, ConstraintLifecycle, PackState, BriefType, ReflectionPeriod, RecommendationStatus } from '../../core/personal-intelligence/types.js';
import { PackDisposedError, GoalValidationError, GoalNotFoundError, BriefNotFoundError, ReflectionGenerationError, DecisionNotFoundError, ConstraintNotFoundError, ConstraintAnalysisError, ValueAssessmentError, RecommendationComposeError, RecommendationNotFoundError, KnowledgeNodeError, KnowledgeEdgeError, ConversationInterpretError, HabitInsightError, PriorityCalculationError, DashboardGenerationError } from '../../core/personal-intelligence/errors.js';

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

describe('FSM Error Paths', () => {
  describe('GoalPlanner invalid transitions', () => {
    const navTo = (pl: GoalPlanner, id: string, states: GoalStatus[]) => { for (const s of states) pl.setStatus(id, s); };
    const validTransitions: Array<[GoalStatus, GoalStatus[], GoalStatus]> = [
      [GoalStatus.Draft, [], GoalStatus.Active],
      [GoalStatus.Draft, [], GoalStatus.Cancelled],
      [GoalStatus.Active, [GoalStatus.Active], GoalStatus.InProgress],
      [GoalStatus.Active, [GoalStatus.Active], GoalStatus.Paused],
      [GoalStatus.Active, [GoalStatus.Active], GoalStatus.Cancelled],
      [GoalStatus.Active, [GoalStatus.Active], GoalStatus.Completed],
      [GoalStatus.InProgress, [GoalStatus.Active, GoalStatus.InProgress], GoalStatus.Active],
      [GoalStatus.InProgress, [GoalStatus.Active, GoalStatus.InProgress], GoalStatus.Paused],
      [GoalStatus.InProgress, [GoalStatus.Active, GoalStatus.InProgress], GoalStatus.Completed],
      [GoalStatus.InProgress, [GoalStatus.Active, GoalStatus.InProgress], GoalStatus.Cancelled],
      [GoalStatus.Paused, [GoalStatus.Active, GoalStatus.Paused], GoalStatus.Active],
      [GoalStatus.Paused, [GoalStatus.Active, GoalStatus.Paused], GoalStatus.Cancelled],
    ];
    for (const [from, path, to] of validTransitions) {
      test(`${from} -> ${to} is valid (no throw)`, () => {
        const pl = new GoalPlanner(C);
        const g = pl.createGoal({ title: 'T', level: GoalLevel.Tasks });
        navTo(pl, sid(g), path);
        expect(() => pl.setStatus(sid(g), to)).not.toThrow();
      });
    }
    const invalidTransitions: Array<[GoalStatus[], GoalStatus]> = [
      [[GoalStatus.Active, GoalStatus.InProgress, GoalStatus.Completed], GoalStatus.Active],
      [[GoalStatus.Active, GoalStatus.InProgress, GoalStatus.Completed], GoalStatus.InProgress],
      [[GoalStatus.Active, GoalStatus.InProgress, GoalStatus.Completed], GoalStatus.Paused],
      [[GoalStatus.Active, GoalStatus.InProgress, GoalStatus.Completed], GoalStatus.Draft],
      [[GoalStatus.Active, GoalStatus.Cancelled], GoalStatus.Active],
      [[], GoalStatus.InProgress],
      [[], GoalStatus.Completed],
      [[], GoalStatus.Paused],
    ];
    for (const [path, to] of invalidTransitions) {
      const fromName = path.length > 0 ? path[path.length - 1] : 'Draft';
      test(`${fromName} -> ${to} throws GoalValidationError`, () => {
        const pl = new GoalPlanner(C);
        const g = pl.createGoal({ title: 'T', level: GoalLevel.Tasks });
        navTo(pl, sid(g), path);
        expect(() => pl.setStatus(sid(g), to)).toThrow(GoalValidationError);
      });
    }
  });

  describe('PackDisposedError', () => {
    test('generateMorningBrief after dispose throws PackDisposedError', async () => {
      const r = new PersonalIntelligencePackRuntime(C);
      await r.initialize();
      r.dispose();
      expect(() => r.generateMorningBrief()).toThrow(PackDisposedError);
    });
    test('generateEveningReflection after dispose throws PackDisposedError', async () => {
      const r = new PersonalIntelligencePackRuntime(C);
      await r.initialize();
      r.dispose();
      expect(() => r.generateEveningReflection()).toThrow(PackDisposedError);
    });
    test('getOnboardingQuestions after dispose still works (no state check)', () => {
      const r = new PersonalIntelligencePackRuntime(C);
      r.dispose();
      expect(r.getOnboardingQuestions().length).toBe(5);
    });
    test('processOnboardingAnswers after dispose throws PackDisposedError', () => {
      const r = new PersonalIntelligencePackRuntime(C);
      r.dispose();
      expect(() => r.processOnboardingAnswers({ q1: 'G' })).toThrow(PackDisposedError);
    });
    test('state is Disabled after dispose', async () => {
      const r = new PersonalIntelligencePackRuntime(C);
      await r.initialize();
      r.dispose();
      expect(r.state).toBe(PackState.Disabled);
    });
    test('isDisposed is true after dispose', async () => {
      const r = new PersonalIntelligencePackRuntime(C);
      await r.initialize();
      r.dispose();
      expect(r.isDisposed).toBe(true);
    });
    test('isDisposed is false before dispose', () => {
      const r = new PersonalIntelligencePackRuntime(C);
      expect(r.isDisposed).toBe(false);
    });
    test('initial state is Created', () => {
      expect(new PersonalIntelligencePackRuntime(C).state).toBe(PackState.Created);
    });
  });

  describe('Subsystem NotFound errors', () => {
    test('DailyBriefGenerator getBrief throws BriefNotFoundError', () => {
      expect(() => new DailyBriefGenerator(C).getBrief('nonexistent')).toThrow(BriefNotFoundError);
    });
    test('DailyBriefGenerator markDelivered throws BriefNotFoundError', () => {
      expect(() => new DailyBriefGenerator(C).markDelivered('nonexistent')).toThrow(BriefNotFoundError);
    });
    test('ReflectionEngine getReflection throws ReflectionGenerationError', () => {
      expect(() => new ReflectionEngine(C).getReflection('nonexistent')).toThrow(ReflectionGenerationError);
    });
    test('GoalPlanner getGoal throws GoalNotFoundError', () => {
      expect(() => new GoalPlanner(C).getGoal('nonexistent')).toThrow(GoalNotFoundError);
    });
    test('GoalPlanner updateGoal throws GoalNotFoundError', () => {
      expect(() => new GoalPlanner(C).updateGoal('nonexistent', { title: 'U' })).toThrow(GoalNotFoundError);
    });
    test('GoalPlanner setStatus throws GoalNotFoundError', () => {
      expect(() => new GoalPlanner(C).setStatus('nonexistent', GoalStatus.Active)).toThrow(GoalNotFoundError);
    });
    test('ConstraintAnalyzer getConstraint throws ConstraintNotFoundError', () => {
      expect(() => new ConstraintAnalyzer(C).getConstraint('nonexistent')).toThrow(ConstraintNotFoundError);
    });
    test('ConstraintAnalyzer advanceLifecycle throws ConstraintNotFoundError', () => {
      expect(() => new ConstraintAnalyzer(C).advanceLifecycle('nonexistent', ConstraintLifecycle.Analyzed)).toThrow(ConstraintNotFoundError);
    });
    test('ConstraintAnalyzer addEvidence throws ConstraintNotFoundError', () => {
      expect(() => new ConstraintAnalyzer(C).addEvidence('nonexistent', 'ev')).toThrow(ConstraintNotFoundError);
    });
    test('ConstraintAnalyzer addActionSteps throws ConstraintNotFoundError', () => {
      expect(() => new ConstraintAnalyzer(C).addActionSteps('nonexistent', ['s1'])).toThrow(ConstraintNotFoundError);
    });
    test('ValueAnalyzer getAssessment throws ValueAssessmentError', () => {
      const va = new ValueAnalyzer(C);
      va.createAssessment(ValueDimension.UserValue, 'D', ['r'], 'u', ['m'], 'i', 0.5);
      expect(() => va.getAssessment('nonexistent')).toThrow(ValueAssessmentError);
    });
    test('RecommendationComposer getRecommendation throws RecommendationNotFoundError', () => {
      expect(() => new RecommendationComposer(C).getRecommendation('nonexistent')).toThrow(RecommendationNotFoundError);
    });
    test('KnowledgeSynthesizer getNode throws KnowledgeNodeError', () => {
      expect(() => new KnowledgeSynthesizer(C).getNode('nonexistent')).toThrow(KnowledgeNodeError);
    });
    test('ConversationInterpreter getInterpretation throws ConversationInterpretError', () => {
      const ci = new ConversationInterpreter(C);
      ci.interpret('test');
      expect(() => ci.getInterpretation('nonexistent')).toThrow(ConversationInterpretError);
    });
    test('HabitInsights getHabit throws HabitInsightError', () => {
      const hi = new HabitInsights(C);
      hi.detectHabit('H', 'D', 'Positive' as any);
      expect(() => hi.getHabit('nonexistent')).toThrow(HabitInsightError);
    });
    test('PriorityOptimizer getScore throws PriorityCalculationError', () => {
      const po = new PriorityOptimizer(C);
      po.calculatePriority('g1', { deadline: 5, importance: 8, urgency: 6, energy: 7, context: 5, dependencies: 4, risk: 3, value: 9 });
      expect(() => po.getScore('nonexistent')).toThrow(PriorityCalculationError);
    });
    test('PersonalDashboard getDashboard throws DashboardGenerationError', () => {
      expect(() => new PersonalDashboard(C).getDashboard('nonexistent')).toThrow(DashboardGenerationError);
    });
    test('PersonalDashboard getInsight throws DashboardGenerationError', () => {
      expect(() => new PersonalDashboard(C).getInsight('nonexistent')).toThrow(DashboardGenerationError);
    });
  });

  describe('Validation errors', () => {
    test('GoalPlanner createGoal empty title throws GoalValidationError', () => {
      expect(() => new GoalPlanner(C).createGoal({ title: '', level: GoalLevel.Vision })).toThrow(GoalValidationError);
    });
    test('GoalPlanner createGoal whitespace title throws GoalValidationError', () => {
      expect(() => new GoalPlanner(C).createGoal({ title: '   ', level: GoalLevel.Vision })).toThrow(GoalValidationError);
    });
    test('ConstraintAnalyzer empty title throws ConstraintAnalysisError', () => {
      expect(() => new ConstraintAnalyzer(C).detectConstraint('', 'D', ConstraintSeverity.Major)).toThrow(ConstraintAnalysisError);
    });
    test('ConstraintAnalyzer whitespace title throws ConstraintAnalysisError', () => {
      expect(() => new ConstraintAnalyzer(C).detectConstraint('  ', 'D', ConstraintSeverity.Major)).toThrow(ConstraintAnalysisError);
    });
    test('ValueAnalyzer empty description throws ValueAssessmentError', () => {
      expect(() => new ValueAnalyzer(C).createAssessment('UserValue' as any, '', ['r'], 'u', ['m'], 'i', 0.5)).toThrow(ValueAssessmentError);
    });
    test('ValueAnalyzer empty reasons throws ValueAssessmentError', () => {
      expect(() => new ValueAnalyzer(C).createAssessment('UserValue' as any, 'D', [], 'u', ['m'], 'i', 0.5)).toThrow(ValueAssessmentError);
    });
    test('ValueAnalyzer empty forWhom throws ValueAssessmentError', () => {
      expect(() => new ValueAnalyzer(C).createAssessment('UserValue' as any, 'D', ['r'], '', ['m'], 'i', 0.5)).toThrow(ValueAssessmentError);
    });
    test('RecommendationComposer empty title throws RecommendationComposeError', () => {
      expect(() => new RecommendationComposer(C).composeRecommendation('', 'D', { why: 'w', whyNow: 'n', whatValue: 'v', whyMainConstraint: 'c' })).toThrow(RecommendationComposeError);
    });
    test('RecommendationComposer empty why throws RecommendationComposeError', () => {
      expect(() => new RecommendationComposer(C).composeRecommendation('T', 'D', { why: '', whyNow: 'n', whatValue: 'v', whyMainConstraint: 'c' })).toThrow(RecommendationComposeError);
    });
    test('RecommendationComposer empty whyNow throws RecommendationComposeError', () => {
      expect(() => new RecommendationComposer(C).composeRecommendation('T', 'D', { why: 'w', whyNow: '', whatValue: 'v', whyMainConstraint: 'c' })).toThrow(RecommendationComposeError);
    });
    test('RecommendationComposer empty whatValue throws RecommendationComposeError', () => {
      expect(() => new RecommendationComposer(C).composeRecommendation('T', 'D', { why: 'w', whyNow: 'n', whatValue: '', whyMainConstraint: 'c' })).toThrow(RecommendationComposeError);
    });
    test('RecommendationComposer empty whyMainConstraint throws RecommendationComposeError', () => {
      expect(() => new RecommendationComposer(C).composeRecommendation('T', 'D', { why: 'w', whyNow: 'n', whatValue: 'v', whyMainConstraint: '' })).toThrow(RecommendationComposeError);
    });
    test('RecommendationComposer present nonexistent throws RecommendationNotFoundError', () => {
      const rc = new RecommendationComposer(C);
      expect(() => rc.present('nonexistent')).toThrow(RecommendationNotFoundError);
    });
    test('KnowledgeSynthesizer empty title throws KnowledgeNodeError', () => {
      expect(() => new KnowledgeSynthesizer(C).addNode(KnowledgeNodeType.Note, '', 'C', 's')).toThrow(KnowledgeNodeError);
    });
    test('KnowledgeSynthesizer edge with missing source throws KnowledgeEdgeError', () => {
      const ks = new KnowledgeSynthesizer(C);
      const n = ks.addNode(KnowledgeNodeType.Note, 'N', 'C', 's');
      expect(() => ks.addEdge('nonexistent' as any, n.id, KnowledgeEdgeType.RelatedTo)).toThrow(KnowledgeEdgeError);
    });
    test('KnowledgeSynthesizer edge with missing target throws KnowledgeEdgeError', () => {
      const ks = new KnowledgeSynthesizer(C);
      const n = ks.addNode(KnowledgeNodeType.Note, 'N', 'C', 's');
      expect(() => ks.addEdge(n.id, 'nonexistent' as any, KnowledgeEdgeType.RelatedTo)).toThrow(KnowledgeEdgeError);
    });
    test('ConversationInterpreter empty input throws ConversationInterpretError', () => {
      expect(() => new ConversationInterpreter(C).interpret('')).toThrow(ConversationInterpretError);
    });
    test('ConversationInterpreter whitespace input throws ConversationInterpretError', () => {
      expect(() => new ConversationInterpreter(C).interpret('   ')).toThrow(ConversationInterpretError);
    });
    test('HabitInsights empty name throws HabitInsightError', () => {
      expect(() => new HabitInsights(C).detectHabit('', 'D', 'Positive' as any)).toThrow(HabitInsightError);
    });
  });

  describe('Pack Runtime state transitions', () => {
    test('initial state is Created', () => {
      expect(new PersonalIntelligencePackRuntime(C).state).toBe(PackState.Created);
    });
    test('after initialize state is Active', async () => {
      const r = new PersonalIntelligencePackRuntime(C);
      await r.initialize();
      expect(r.state).toBe(PackState.Active);
    });
    test('initialize transitions through Initializing', async () => {
      const localC = { ...C, platform: { publishEvent: async (type: string, payload: any) => {}, getConfiguration: () => null, getHealth: async () => null } };
      const localR = new PersonalIntelligencePackRuntime(localC);
      let sawInitializing = false;
      localC.platform.publishEvent = async (type: string, payload: any) => {
        if (type === 'PackStateChanged' && payload?.newState === 'Initializing') sawInitializing = true;
      };
      await localR.initialize();
      expect(sawInitializing).toBe(true);
    });
  });


