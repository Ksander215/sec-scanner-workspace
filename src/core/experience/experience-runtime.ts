/**
 * Experience Runtime — Main Orchestrator
 * TASK-AIS-004A.000
 *
 * Central orchestrator that coordinates all 15 subsystems.
 * Implements Service interface for lifecycle management.
 * Integrates with other runtimes only through contracts.
 */

import { InProcessEventBus } from '../events/event-bus.js';
import { TraceCollector } from '../trace/trace-collector.js';
import type { Service } from '../services/service.js';
import { EventClassification } from '../types/common.js';
import { createId } from '../domain/identifiers.js';
import type {
  ExperienceRuntimeConfig,
  BehaviorEvent,
  Observation,
  AdaptationType,
  RecommendationType,
  ConsentScope,
  ExperienceSnapshot,
  RecommendationId,
  ObservationId,
} from './types.js';
import { DefaultExperienceRuntimeConfig } from './types.js';
import { ExperienceState as ExpState } from './types.js';
import { BehaviorRuntime } from './behavior-runtime.js';
import { PreferenceEvolution } from './preference-evolution.js';
import { HabitEngine } from './habit-engine.js';
import { AdaptationEngine } from './adaptation-engine.js';
import { RecommendationRuntime } from './recommendation-runtime.js';
import { ExperienceGraph } from './experience-graph.js';
import { PersonalizationProfiles } from './personalization-profiles.js';
import { ContextSwitching } from './context-switching.js';
import { ExplainabilityRuntime } from './explainability-runtime.js';
import { ExperiencePolicies } from './experience-policies.js';
import { ExperienceMetrics } from './experience-metrics.js';
import { SnapshotRuntime } from './snapshot-runtime.js';
import { ConsentRuntime } from './consent-runtime.js';
import { ExperienceContext } from './experience-context.js';
import type { IExperienceContracts } from './contracts.js';

export class ExperienceRuntime implements Service {
  readonly name = 'ExperienceRuntime';

  // Subsystems
  private readonly behavior: BehaviorRuntime;
  private readonly preferenceEvolution: PreferenceEvolution;
  private readonly habitEngine: HabitEngine;
  private readonly adaptationEngine: AdaptationEngine;
  private readonly recommendationRuntime: RecommendationRuntime;
  private readonly graph: ExperienceGraph;
  private readonly profiles: PersonalizationProfiles;
  private readonly contextSwitching: ContextSwitching;
  private readonly explainability: ExplainabilityRuntime;
  private readonly policies: ExperiencePolicies;
  private readonly metrics: ExperienceMetrics;
  private readonly snapshots: SnapshotRuntime;
  private readonly consent: ConsentRuntime;
  private readonly context: ExperienceContext;

  private readonly config: ExperienceRuntimeConfig;
  private readonly eventBus: InProcessEventBus;
  private readonly trace: TraceCollector;
  private readonly _contracts: IExperienceContracts;
  /** Access runtime contracts for external integrations */
  get contracts(): IExperienceContracts { return this._contracts; }

  private _initialized = false;
  private _running = false;

  constructor(
    config?: Partial<ExperienceRuntimeConfig>,
    eventBus?: InProcessEventBus,
    contracts?: IExperienceContracts,
  ) {
    this.config = { ...DefaultExperienceRuntimeConfig, ...config };
    this.eventBus = eventBus ?? new InProcessEventBus();
    this.trace = new TraceCollector();
    this._contracts = contracts ?? {};

    // Initialize all subsystems
    this.behavior = new BehaviorRuntime(this.config, this.eventBus, this.trace);
    this.preferenceEvolution = new PreferenceEvolution(this.config, this.eventBus, this.trace);
    this.habitEngine = new HabitEngine(this.config, this.eventBus, this.trace);
    this.adaptationEngine = new AdaptationEngine(this.config, this.eventBus, this.trace);
    this.recommendationRuntime = new RecommendationRuntime(this.config, this.eventBus, this.trace);
    this.graph = new ExperienceGraph();
    this.profiles = new PersonalizationProfiles(this.eventBus);
    this.contextSwitching = new ContextSwitching(this.config, this.eventBus);
    this.explainability = new ExplainabilityRuntime();
    this.policies = new ExperiencePolicies();
    this.metrics = new ExperienceMetrics();
    this.snapshots = new SnapshotRuntime(this.eventBus);
    this.consent = new ConsentRuntime(this.config, this.eventBus);
    this.context = new ExperienceContext(this.config);
  }

  // ─── Lifecycle ─────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this._initialized) return;
    this.trace.traceInfo('ExperienceRuntime initializing');
    this._initialized = true;
  }

  async start(): Promise<void> {
    if (!this._initialized) throw new Error('ExperienceRuntime must be initialized first');
    if (this._running) return;
    this.trace.traceInfo('ExperienceRuntime started');
    this._running = true;
  }

  async stop(): Promise<void> {
    if (!this._running) return;
    this.trace.traceInfo('ExperienceRuntime stopped');
    this._running = false;
  }

  async shutdown(): Promise<void> {
    this.trace.traceInfo('ExperienceRuntime shutdown');
    this._running = false;
    this._initialized = false;
  }

  // ─── Public Accessors ──────────────────────────────────────

  get state(): { initialized: boolean; running: boolean } {
    return { initialized: this._initialized, running: this._running };
  }

  get behaviorRuntime(): BehaviorRuntime { return this.behavior; }
  get preferenceEvolutionRuntime(): PreferenceEvolution { return this.preferenceEvolution; }
  get habitEngineRuntime(): HabitEngine { return this.habitEngine; }
  get adaptationEngineRuntime(): AdaptationEngine { return this.adaptationEngine; }
  get recommendationEngineRuntime(): RecommendationRuntime { return this.recommendationRuntime; }
  get experienceGraph(): ExperienceGraph { return this.graph; }
  get personalizationProfiles(): PersonalizationProfiles { return this.profiles; }
  get contextSwitchingRuntime(): ContextSwitching { return this.contextSwitching; }
  get explainabilityRuntime(): ExplainabilityRuntime { return this.explainability; }
  get experiencePolicies(): ExperiencePolicies { return this.policies; }
  get experienceMetrics(): ExperienceMetrics { return this.metrics; }
  get snapshotRuntime(): SnapshotRuntime { return this.snapshots; }
  get consentRuntime(): ConsentRuntime { return this.consent; }
  get experienceContext(): ExperienceContext { return this.context; }
  get EventBus(): InProcessEventBus { return this.eventBus; }
  get Trace(): TraceCollector { return this.trace; }

  // ─── Orchestration Methods ──────────────────────────────────

  /** Record a behavioral event and trigger downstream processing */
  recordBehaviorEvent(event: BehaviorEvent): Observation {
    this.trace.traceInfo(`Recording behavior event ${event.id} for user ${event.userIdHash}`);
    const observation = this.behavior.recordObservation(event);

    // Feed observation to preference evolution
    this.preferenceEvolution.recordObservation(observation);

    // Feed observations to habit engine
    this.habitEngine.addObservations(event.userIdHash, [observation]);

    // Update metrics
    this.metrics.incrementCounter('observation_count' as any, { userIdHash: event.userIdHash });

    // Transition FSM state based on observation count
    this.maybeTransitionState(event.userIdHash);

    return observation;
  }

  /** Propose an adaptation (with consent check) */
  proposeAdaptation(
    type: AdaptationType,
    userIdHash: string,
    newValue: string,
    evidence: readonly ObservationId[],
    reason: string,
  ): void {
    // Check consent
    const consentStatus = this.consent.checkConsent(userIdHash, 'Adaptation' as unknown as ConsentScope);
    if (!consentStatus.allowed) {
      this.trace.traceInfo(`Adaptation blocked by consent for user ${userIdHash}`);
      return;
    }

    // Check policies
    const policyResult = this.policies.validateAdaptation(type, userIdHash, {});
    if (!policyResult.allowed) {
      this.trace.traceInfo(`Adaptation blocked by policy: ${policyResult.reason}`);
      return;
    }

    this.adaptationEngine.proposeAdaptation(type, userIdHash, newValue, evidence, reason);
    this.metrics.incrementCounter('adaptation_count' as any, { userIdHash });
  }

  /** Generate a recommendation */
  generateRecommendation(
    type: RecommendationType,
    userIdHash: string,
    title: string,
    description: string,
    evidence: readonly ObservationId[],
    confidence: number,
  ): void {
    const policyResult = this.policies.validateRecommendation(type, userIdHash, {});
    if (!policyResult.allowed) {
      this.trace.traceInfo(`Recommendation blocked by policy: ${policyResult.reason}`);
      return;
    }

    this.recommendationRuntime.generateRecommendation(type, userIdHash, title, description, evidence, confidence);
  }

  /** Accept a recommendation and track metrics */
  acceptRecommendation(recommendationId: RecommendationId): void {
    this.recommendationRuntime.acceptRecommendation(recommendationId);
    this.metrics.incrementCounter('recommendation_accepted' as any);
  }

  /** Dismiss a recommendation and track metrics */
  dismissRecommendation(recommendationId: RecommendationId): void {
    this.recommendationRuntime.dismissRecommendation(recommendationId);
    this.metrics.incrementCounter('recommendation_dismissed' as any);
  }

  /** Create a snapshot of current user experience state */
  createSnapshot(userIdHash: string): ExperienceSnapshot {
    const session = this.context.getUserSession(userIdHash);
    const state = session?.state ?? ExpState.Created;

    return this.snapshots.createSnapshot(
      userIdHash,
      this.preferenceEvolution.getAllPreferences(userIdHash),
      this.habitEngine.getHabits(userIdHash),
      this.adaptationEngine.getAdaptationHistory(userIdHash),
      this.recommendationRuntime.getPendingRecommendations(userIdHash),
      session?.activeProfileId,
      session?.activeContextId,
      state,
      this.metrics.getSummary(),
    );
  }

  /** Get current state for a user */
  getUserState(userIdHash: string): ExpState | null {
    return this.context.getState(userIdHash);
  }

  /** Maybe advance FSM state based on accumulated observations */
  private maybeTransitionState(userIdHash: string): void {
    const currentState = this.context.getState(userIdHash);
    if (!currentState) return;

    const fsm = this.context.getFSM(userIdHash);
    if (!fsm) return;

    const observationCount = this.metrics.getCounter('observation_count' as any, { userIdHash });
    const habitCount = this.habitEngine.getHabits(userIdHash).length;

    // Progression logic
    if (currentState === ExpState.Created && observationCount >= 5) {
      if (fsm.canTransition(ExpState.Learning)) {
        this.context.transitionState(userIdHash, ExpState.Learning);
        this.emitStateChange(userIdHash, ExpState.Created, ExpState.Learning, 'Sufficient observations collected');
      }
    } else if (currentState === ExpState.Learning && observationCount >= 20) {
      if (fsm.canTransition(ExpState.Observing)) {
        this.context.transitionState(userIdHash, ExpState.Observing);
        this.emitStateChange(userIdHash, ExpState.Learning, ExpState.Observing, 'Pattern observation threshold reached');
      }
    } else if (currentState === ExpState.Observing && habitCount >= 3) {
      if (fsm.canTransition(ExpState.Adapting)) {
        this.context.transitionState(userIdHash, ExpState.Adapting);
        this.emitStateChange(userIdHash, ExpState.Observing, ExpState.Adapting, 'Sufficient habits detected for adaptation');
      }
    } else if (currentState === ExpState.Adapting) {
      const adaptations = this.adaptationEngine.getActiveAdaptations(userIdHash);
      if (adaptations.length >= 3) {
        if (fsm.canTransition(ExpState.Stable)) {
          this.context.transitionState(userIdHash, ExpState.Stable);
          this.emitStateChange(userIdHash, ExpState.Adapting, ExpState.Stable, 'Adaptation stable threshold reached');
        }
      }
    }
  }

  /** Emit ExperienceStateChanged event */
  private emitStateChange(
    userIdHash: string,
    fromState: ExpState,
    toState: ExpState,
    reason: string,
  ): void {
    this.eventBus.publish({
      eventId: createId(),
      eventType: 'ExperienceStateChanged',
      classification: EventClassification.StateChange,
      timestamp: new Date().toISOString(),
      sequence: 0,
      aggregateId: userIdHash,
      aggregateType: 'ExperienceRuntime',
      version: '1.0.0',
      payload: { userIdHash, fromState, toState, changedAt: new Date().toISOString(), reason },
    });
  }
}
