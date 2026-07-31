/**
 * Personal Intelligence Runtime — Main Orchestrator
 *
 * Creates and wires together all 14 PIR subsystems plus the
 * metrics collector.  Provides a single entry-point for
 * initialization, context access, and disposal.
 */
import type { PersonalContext, UnifiedContext, PersonalRuntimeConfig } from './types.js';
import type { PersonalRuntimeContracts } from './contracts.js';
import { UserProfileRuntime } from './user-profile.js';
import { GoalRuntime } from './goal-runtime.js';
import { PriorityRuntime } from './priority-runtime.js';
import { ContextRuntime } from './context-runtime.js';
import { PlanningRuntime } from './planning-runtime.js';
import { PredictionRuntime } from './prediction-runtime.js';
import { HabitRuntime } from './habit-runtime.js';
import { RecommendationRuntime } from './recommendation-runtime.js';
import { AttentionRuntime } from './attention-runtime.js';
import { ReflectionRuntime } from './reflection-runtime.js';
import { LearningRuntime } from './learning-runtime.js';
import { DecisionRuntime } from './decision-runtime.js';
import { DailyBriefRuntime } from './daily-brief-runtime.js';
import { AssistantRuntime } from './assistant-runtime.js';
import { PersonalMetricsCollector } from './metrics.js';

export class PersonalRuntime {
  private readonly config: PersonalRuntimeConfig;

  // ── Subsystems ───────────────────────────────────────────────

  private readonly _userProfile: UserProfileRuntime;
  private readonly _goals: GoalRuntime;
  private readonly _priorities: PriorityRuntime;
  private readonly _context: ContextRuntime;
  private readonly _planning: PlanningRuntime;
  private readonly _predictions: PredictionRuntime;
  private readonly _habits: HabitRuntime;
  private readonly _recommendations: RecommendationRuntime;
  private readonly _attention: AttentionRuntime;
  private readonly _reflections: ReflectionRuntime;
  private readonly _learning: LearningRuntime;
  private readonly _decisions: DecisionRuntime;
  private readonly _daily: DailyBriefRuntime;
  private readonly _assistant: AssistantRuntime;
  private readonly _metrics: PersonalMetricsCollector;

  constructor(contracts: PersonalRuntimeContracts, config?: Partial<PersonalRuntimeConfig>) {
    this.config = config ?? {};

    // ── Instantiate all subsystems ────────────────────────────
    this._userProfile = new UserProfileRuntime(contracts);
    this._goals = new GoalRuntime(contracts, this.config.maxGoals);
    this._priorities = new PriorityRuntime(contracts);
    this._context = new ContextRuntime(contracts);
    this._planning = new PlanningRuntime(contracts, this.config.maxPlans);
    this._predictions = new PredictionRuntime(contracts);
    this._habits = new HabitRuntime(contracts, { maxHabits: this.config.maxHabits });
    this._recommendations = new RecommendationRuntime(contracts, this.config.maxRecommendations);
    this._attention = new AttentionRuntime(contracts);
    this._reflections = new ReflectionRuntime(contracts);
    this._learning = new LearningRuntime(contracts);
    this._decisions = new DecisionRuntime(contracts);
    this._daily = new DailyBriefRuntime(contracts, {
      morningBriefTime: this.config.morningBriefTime,
    });
    this._assistant = new AssistantRuntime(contracts);
    this._metrics = new PersonalMetricsCollector();
  }

  // ── Public readonly getters ─────────────────────────────────

  get userProfile(): UserProfileRuntime { return this._userProfile; }
  get goals(): GoalRuntime { return this._goals; }
  get priorities(): PriorityRuntime { return this._priorities; }
  get context(): ContextRuntime { return this._context; }
  get planning(): PlanningRuntime { return this._planning; }
  get predictions(): PredictionRuntime { return this._predictions; }
  get habits(): HabitRuntime { return this._habits; }
  get recommendations(): RecommendationRuntime { return this._recommendations; }
  get attention(): AttentionRuntime { return this._attention; }
  get reflections(): ReflectionRuntime { return this._reflections; }
  get learning(): LearningRuntime { return this._learning; }
  get decisions(): DecisionRuntime { return this._decisions; }
  get daily(): DailyBriefRuntime { return this._daily; }
  get assistant(): AssistantRuntime { return this._assistant; }
  get metrics(): PersonalMetricsCollector { return this._metrics; }

  // ── Lifecycle ───────────────────────────────────────────────

  async initialize(): Promise<void> {
    await this._userProfile.buildProfile();
    await this._context.buildContext();
  }

  async getPersonalContext(): Promise<PersonalContext> {
    const ctx = this._userProfile.getContext();
    if (ctx) return ctx;
    return this._userProfile.buildProfile();
  }

  async getUnifiedContext(): Promise<UnifiedContext> {
    const ctx = this._context.getContext();
    if (ctx) return ctx;
    return this._context.buildContext();
  }

  // ── State summary ──────────────────────────────────────────

  getState(): object {
    return Object.freeze({
      goals: {
        total: this._goals.getGoalCount(),
      },
      planning: {
        plans: this._planning.getAllPlans().length,
      },
      predictions: {
        total: this._predictions.getPredictions().length,
        accuracy: this._predictions.getAccuracy(),
      },
      habits: {
        total: this._habits.getHabitCount(),
      },
      recommendations: {
        total: this._recommendations.getRecommendations().length,
        active: this._recommendations.getActiveRecommendations().length,
        accepted: this._recommendations.getAcceptedCount(),
        dismissed: this._recommendations.getDismissedCount(),
      },
      attention: {
        state: this._attention.getCurrentState(),
        score: this._attention.getScore(),
      },
      reflections: {
        total: this._reflections.getReflections().length,
      },
      learning: {
        total: this._learning.getItemCount(),
      },
      decisions: {
        total: this._decisions.getDecisionCount(),
      },
      daily: {
        briefs: this._daily.getBriefCount(),
      },
      assistant: {
        active: this._assistant.isActive(),
      },
    });
  }

  // ── Dispose ─────────────────────────────────────────────────

  dispose(): void {
    // Dispose subsystems that own maps (the batch-3 subsystems we created)
    this._predictions.dispose();
    this._recommendations.dispose();
    this._attention.dispose();
    this._reflections.dispose();
    // Reset metrics collector
    this._metrics.reset();
  }
}
