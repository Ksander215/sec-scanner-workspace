/**
 * Personal Intelligence Capability Pack — Main Orchestrator
 * TASK-AIS-007A.000
 *
 * Wires together all 15 subsystems and provides the single entry-point
 * for initialization, the First Intelligence Experience, and disposal.
 */
import type { PersonalIntelligencePackConfig } from './types.js';
import { PackState, DefaultPersonalIntelligencePackConfig, OnboardingCategory, BriefType, ReflectionPeriod } from './types.js';
import type { PersonalIntelligenceContracts } from './contracts.js';
import type { PackDailyBrief, PackReflection } from './types.js';
import { createPackEventBase } from './events.js';
import { EventClassification } from '../types/common.js';
import { PackDisposedError } from './errors.js';
import { DailyBriefGenerator } from './daily-brief-generator.js';
import { ReflectionEngine } from './reflection-engine.js';
import { GoalPlanner } from './goal-planner.js';
import { DecisionAdvisor } from './decision-advisor.js';
import { ConstraintAnalyzer } from './constraint-analyzer.js';
import { ValueAnalyzer } from './value-analyzer.js';
import { RecommendationComposer } from './recommendation-composer.js';
import { KnowledgeSynthesizer } from './knowledge-synthesizer.js';
import { ConversationInterpreter } from './conversation-interpreter.js';
import { HabitInsights } from './habit-insights.js';
import { PriorityOptimizer } from './priority-optimizer.js';
import { PersonalDashboard } from './personal-dashboard.js';
import { PackMetricsRuntime } from './pack-metrics-runtime.js';
import { PackTraceRuntime } from './pack-trace-runtime.js';

export class PersonalIntelligencePackRuntime {
  private readonly contracts: PersonalIntelligenceContracts;
  private readonly config: PersonalIntelligencePackConfig;
  private _state: PackState = PackState.Created;
  private _disposed = false;

  // ── Subsystems (13 domain + 2 infra) ─────────────────────────

  private readonly _dailyBrief: DailyBriefGenerator;
  private readonly _reflection: ReflectionEngine;
  private readonly _goalPlanner: GoalPlanner;
  private readonly _decisionAdvisor: DecisionAdvisor;
  private readonly _constraintAnalyzer: ConstraintAnalyzer;
  private readonly _valueAnalyzer: ValueAnalyzer;
  private readonly _recommendationComposer: RecommendationComposer;
  private readonly _knowledgeSynthesizer: KnowledgeSynthesizer;
  private readonly _conversationInterpreter: ConversationInterpreter;
  private readonly _habitInsights: HabitInsights;
  private readonly _priorityOptimizer: PriorityOptimizer;
  private readonly _dashboard: PersonalDashboard;
  private readonly _metrics: PackMetricsRuntime;
  private readonly _trace: PackTraceRuntime;

  constructor(contracts: PersonalIntelligenceContracts, config?: Partial<PersonalIntelligencePackConfig>) {
    this.contracts = contracts;
    this.config = { ...DefaultPersonalIntelligencePackConfig, ...config };

    const maxB = this.config.maxBriefHistory;
    const maxG = this.config.maxGoals;
    const maxD = this.config.maxDecisions;
    const maxC = this.config.maxConstraints;
    const maxR = this.config.maxRecommendations;
    const maxK = this.config.maxKnowledgeNodes;
    const maxH = this.config.maxHabits;
    const ttlR = this.config.recommendationTtlHours;
    const maxRef = this.config.maxReflectionHistory ?? maxB;

    this._dailyBrief = new DailyBriefGenerator(contracts, maxB);
    this._reflection = new ReflectionEngine(contracts, maxRef);
    this._goalPlanner = new GoalPlanner(contracts, maxG);
    this._decisionAdvisor = new DecisionAdvisor(contracts, maxD);
    this._constraintAnalyzer = new ConstraintAnalyzer(contracts, maxC);
    this._valueAnalyzer = new ValueAnalyzer(contracts);
    this._recommendationComposer = new RecommendationComposer(contracts, maxR, ttlR);
    this._knowledgeSynthesizer = new KnowledgeSynthesizer(contracts, maxK);
    this._conversationInterpreter = new ConversationInterpreter(contracts);
    this._habitInsights = new HabitInsights(contracts, maxH);
    this._priorityOptimizer = new PriorityOptimizer(contracts);
    this._dashboard = new PersonalDashboard(contracts);
    this._metrics = new PackMetricsRuntime();
    this._trace = new PackTraceRuntime();
  }

  // ── Public readonly getters ─────────────────────────────────

  get state(): PackState { return this._state; }
  get isDisposed(): boolean { return this._disposed; }
  get dailyBrief(): DailyBriefGenerator { return this._dailyBrief; }
  get reflection(): ReflectionEngine { return this._reflection; }
  get goalPlanner(): GoalPlanner { return this._goalPlanner; }
  get decisionAdvisor(): DecisionAdvisor { return this._decisionAdvisor; }
  get constraintAnalyzer(): ConstraintAnalyzer { return this._constraintAnalyzer; }
  get valueAnalyzer(): ValueAnalyzer { return this._valueAnalyzer; }
  get recommendationComposer(): RecommendationComposer { return this._recommendationComposer; }
  get knowledgeSynthesizer(): KnowledgeSynthesizer { return this._knowledgeSynthesizer; }
  get conversationInterpreter(): ConversationInterpreter { return this._conversationInterpreter; }
  get habitInsights(): HabitInsights { return this._habitInsights; }
  get priorityOptimizer(): PriorityOptimizer { return this._priorityOptimizer; }
  get dashboard(): PersonalDashboard { return this._dashboard; }
  get metrics(): PackMetricsRuntime { return this._metrics; }
  get trace(): PackTraceRuntime { return this._trace; }

  // ── Lifecycle ───────────────────────────────────────────────

  async initialize(): Promise<void> {
    this.assertNotDisposed();
    this.setState(PackState.Initializing);
    const span = this._trace.startSpan('initialize', 'PackRuntime');
    this._trace.activateSpan(span.id as unknown as string);
    try {
      this._trace.completeSpan(span.id as unknown as string);
      this.setState(PackState.Active);
      const base = createPackEventBase('PackInitialized', EventClassification.StateChange, 'pack-runtime');
      void this.contracts.platform.publishEvent('PackInitialized', {
        ...base, sequence: 0, version: '1.0.0',
        payload: { packId: 'personal-intelligence', subsystemCount: 15, initializedAt: new Date().toISOString() },
      });
    } catch (err) {
      this._trace.failSpan(span.id as unknown as string);
      throw err;
    }
  }

  // ── First Intelligence Experience ───────────────────────────

  getOnboardingQuestions(): readonly { id: string; question: string; category: OnboardingCategory; required: boolean; followUps: readonly string[] }[] {
    return Object.freeze([
      { id: 'q1', question: 'What are your top 3 goals right now?', category: OnboardingCategory.Goals, required: true, followUps: ['What would achieving this look like?', 'What is the timeline?'] },
      { id: 'q2', question: 'What projects are you currently working on?', category: OnboardingCategory.CurrentProjects, required: true, followUps: ['Which is the highest priority?', 'What blocks progress?'] },
      { id: 'q3', question: 'What daily habits do you maintain?', category: OnboardingCategory.Habits, required: true, followUps: ['Which habit has the most impact?', 'Which habit do you want to change?'] },
      { id: 'q4', question: 'What is your biggest current challenge?', category: OnboardingCategory.Challenges, required: true, followUps: ['How long has this been a challenge?', 'What have you tried?'] },
      { id: 'q5', question: 'What matters most to you in your work?', category: OnboardingCategory.Values, required: false, followUps: ['Why is this important?', 'How do you measure it?'] },
    ]);
  }

  processOnboardingAnswers(answers: Readonly<Record<string, string>>): {
    extractedGoals: readonly string[];
    extractedProjects: readonly string[];
    extractedChallenges: readonly string[];
    mainConstraint: string;
    valueProposition: string;
    firstActionStep: string;
  } {
    this.assertNotDisposed();
    const goals = this.extractList(answers['q1']);
    const projects = this.extractList(answers['q2']);
    const challenges = this.extractList(answers['q4']);
    const mainConstraint = challenges.length > 0 ? challenges[0] : 'No constraint identified yet';
    const valueProposition = this.buildValueProposition(goals, challenges);
    const firstActionStep = this.buildFirstActionStep(mainConstraint);

    this._metrics.increment('goals_created');
    this._metrics.increment('constraints_detected');

    return Object.freeze({
      extractedGoals: goals, extractedProjects: projects,
      extractedChallenges: challenges, mainConstraint,
      valueProposition, firstActionStep,
    });
  }

  generateMorningBrief(date?: string): PackDailyBrief {
    this.assertNotDisposed();
    const span = this._trace.startSpan('generateMorningBrief', 'DailyBriefGenerator');
    const brief = this._dailyBrief.generateBrief(BriefType.MorningBrief, date);
    this._metrics.increment('briefs_generated');
    this._metrics.setGauge('productivity_index', brief.productivityIndex);
    this._metrics.setGauge('development_index', brief.developmentIndex);
    this._trace.completeSpan(span.id as unknown as string);
    return brief;
  }

  generateEveningReflection(date?: string): PackReflection {
    this.assertNotDisposed();
    const span = this._trace.startSpan('generateEveningReflection', 'ReflectionEngine');
    const reflection = this._reflection.generateReflection(ReflectionPeriod.Daily, date);
    this._metrics.increment('reflections_generated');
    this._trace.completeSpan(span.id as unknown as string);
    return reflection;
  }

  // ── State summary ──────────────────────────────────────────

  getState(): object {
    return Object.freeze({
      state: this._state,
      subsystems: {
        dailyBrief: { count: this._dailyBrief.getBriefCount() },
        reflection: { count: this._reflection.getReflectionCount() },
        goals: { count: this._goalPlanner.getGoalCount() },
        decisions: { count: this._decisionAdvisor.getDecisionCount() },
        constraints: { active: this._constraintAnalyzer.getActiveCount(), resolved: this._constraintAnalyzer.getResolvedCount() },
        valueAssessments: { count: this._valueAnalyzer.getAssessmentCount() },
        recommendations: { total: this._recommendationComposer.getRecommendationCount(), accepted: this._recommendationComposer.getAcceptedCount(), rejected: this._recommendationComposer.getRejectedCount() },
        knowledge: { nodes: this._knowledgeSynthesizer.getNodeCount(), edges: this._knowledgeSynthesizer.getEdgeCount() },
        conversations: { count: this._conversationInterpreter.getInterpretationCount() },
        habits: { count: this._habitInsights.getHabitCount() },
        priorities: { count: this._priorityOptimizer.getScoreCount() },
        dashboard: { count: this._dashboard.getDashboardCount() },
      },
      metrics: this._metrics.getSnapshot(),
      trace: { spans: this._trace.getSpanCount(), active: this._trace.getActiveSpans().length },
    });
  }

  // ── Dispose ─────────────────────────────────────────────────

  dispose(): void {
    this._disposed = true;
    this._state = PackState.Disabled;
    this._dailyBrief.dispose();
    this._reflection.dispose();
    this._goalPlanner.dispose();
    this._decisionAdvisor.dispose();
    this._constraintAnalyzer.dispose();
    this._valueAnalyzer.dispose();
    this._recommendationComposer.dispose();
    this._knowledgeSynthesizer.dispose();
    this._conversationInterpreter.dispose();
    this._habitInsights.dispose();
    this._priorityOptimizer.dispose();
    this._dashboard.dispose();
    this._metrics.dispose();
    this._trace.dispose();
  }

  // ── Private ─────────────────────────────────────────────────

  private assertNotDisposed(): void {
    if (this._disposed) throw new PackDisposedError();
  }

  private setState(newState: PackState): void {
    const oldState = this._state;
    this._state = newState;
    const base = createPackEventBase('PackStateChanged', EventClassification.StateChange, 'pack-runtime');
    void this.contracts.platform.publishEvent('PackStateChanged', {
      ...base, sequence: 0, version: '1.0.0',
      payload: { packId: 'personal-intelligence', oldState, newState, changedAt: new Date().toISOString() },
    });
  }

  private extractList(answer: string | undefined): readonly string[] {
    if (!answer?.trim()) return Object.freeze([]);
    return Object.freeze(
      answer.split(/[\n,;]+/).map(s => s.replace(/^[-•*\d.]+\s*/, '').trim()).filter(s => s.length > 0),
    );
  }

  private buildValueProposition(goals: readonly string[], challenges: readonly string[]): string {
    if (goals.length === 0) return 'Identify your goals to unlock personalized value';
    const goalStr = goals.slice(0, 3).join(', ');
    if (challenges.length > 0) return `By addressing "${challenges[0]}", you will unlock faster progress toward ${goalStr}`;
    return `AIS will help you systematically achieve ${goalStr} through intelligent constraints and daily optimization`;
  }

  private buildFirstActionStep(constraint: string): string {
    return `Focus on: ${constraint}. Set a 15-minute timer right now to take the first concrete step toward resolving it.`;
  }
}
