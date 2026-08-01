/**
 * Solution Builder Runtime — Orchestrator
 * TASK-AIS-010A.000 — Solution Builder Runtime
 *
 * The central orchestrator that wires all 14 subsystems together and
 * executes the full solution build pipeline:
 *   create → interpret → analyze domain → extract requirements →
 *   plan → select capabilities → compose workflow → compose knowledge →
 *   configure AI → compose desktop → generate state → validate →
 *   optimize → plan deployment → catalog → return manifest
 *
 * Manages runtime lifecycle (Uninitialized → Ready → Stopped) and
 * aggregates metrics from all subsystems.
 */
import type { Timestamp, SemVer } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type {
  SolutionId, SolutionManifest, SolutionBuilderMetrics,
  SolutionBuilderState, SolutionState,
  SolutionBlueprint, Goal, DomainAnalysis, Requirement,
  CapabilitySelection, WorkflowPackage, KnowledgePackage,
  AIConfiguration, DesktopConfiguration,
  OptimizationReport, DeploymentPlan,
} from './types.js';
import {
  SolutionBuilderState as SBState,
  LifecycleTransition as LTrans,
  SolutionState as SStateEnum,
  ValidationVerdict,
} from './types.js';
import type {
  ISolutionRuntime, IGoalInterpreter, IDomainAnalyzer,
  IRequirementExtractor, ISolutionPlanner, ICapabilitySelector,
  IWorkflowComposer, IKnowledgeComposer, IAIConfigRuntime,
  IDesktopComposer, ISolutionValidator, ISolutionOptimizer,
  IDeploymentPlanner, ILifecycleManager, ISolutionCatalog,
  SolutionBuildOverrides,
} from './contracts.js';
import type { SolutionBuilderRuntimeConfig } from './types.js';
import { DefaultSolutionBuilderConfig } from './types.js';
import { SolutionBuilderError } from './errors.js';
import {
  SolutionBuilderNotInitializedError,
  SolutionBuilderDisposedError,
  SolutionBuilderRuntimeError,
} from './errors.js';
import type {
  SolutionBuilderInitializedEvent,
  SolutionBuilderStateChangedEvent,
  SolutionBuildCompletedEvent,
} from './events.js';

// Import all 14 subsystem implementations
import { GoalInterpreter } from './goal-interpreter.js';
import { DomainAnalyzer } from './domain-analyzer.js';
import { RequirementExtractor } from './requirement-extractor.js';
import { SolutionPlanner } from './solution-planner.js';
import { CapabilitySelector } from './capability-selector.js';
import { WorkflowComposer } from './workflow-composer.js';
import { KnowledgeComposer } from './knowledge-composer.js';
import { AIConfigRuntime } from './ai-config-runtime.js';
import { DesktopComposer } from './desktop-composer.js';
import { SolutionValidator } from './solution-validator.js';
import { SolutionOptimizer } from './solution-optimizer.js';
import { DeploymentPlanner } from './deployment-planner.js';
import { LifecycleManager } from './lifecycle-manager.js';
import { SolutionCatalog } from './solution-catalog.js';

export class SolutionRuntime implements ISolutionRuntime {
  private readonly config: SolutionBuilderRuntimeConfig;
  private readonly eventBus: InProcessEventBus | null;
  private _state: SolutionBuilderState = SBState.Uninitialized;

  // All 14 subsystems
  private readonly goalInterpreter: GoalInterpreter;
  private readonly domainAnalyzer: DomainAnalyzer;
  private readonly requirementExtractor: RequirementExtractor;
  private readonly solutionPlanner: SolutionPlanner;
  private readonly capabilitySelector: CapabilitySelector;
  private readonly workflowComposer: WorkflowComposer;
  private readonly knowledgeComposer: KnowledgeComposer;
  private readonly aiConfigRuntime: AIConfigRuntime;
  private readonly desktopComposer: DesktopComposer;
  private readonly solutionValidator: SolutionValidator;
  private readonly solutionOptimizer: SolutionOptimizer;
  private readonly deploymentPlanner: DeploymentPlanner;
  private readonly lifecycleManager: LifecycleManager;
  private readonly solutionCatalog: SolutionCatalog;

  // Track last build time for metrics
  private lastBuildAt: Timestamp | null = null;
  private lastBuildDurationMs: number = 0;

  constructor(config?: Partial<SolutionBuilderRuntimeConfig>, eventBus?: InProcessEventBus | null) {
    const merged: SolutionBuilderRuntimeConfig = {
      ...DefaultSolutionBuilderConfig,
      ...config,
      // Deep-merge nested config sections
      goalInterpreter: { ...DefaultSolutionBuilderConfig.goalInterpreter, ...config?.goalInterpreter },
      domainAnalyzer: { ...DefaultSolutionBuilderConfig.domainAnalyzer, ...config?.domainAnalyzer },
      requirementExtractor: { ...DefaultSolutionBuilderConfig.requirementExtractor, ...config?.requirementExtractor },
      solutionPlanner: { ...DefaultSolutionBuilderConfig.solutionPlanner, ...config?.solutionPlanner },
      capabilitySelector: { ...DefaultSolutionBuilderConfig.capabilitySelector, ...config?.capabilitySelector },
      workflowComposer: { ...DefaultSolutionBuilderConfig.workflowComposer, ...config?.workflowComposer },
      knowledgeComposer: { ...DefaultSolutionBuilderConfig.knowledgeComposer, ...config?.knowledgeComposer },
      aiConfigRuntime: { ...DefaultSolutionBuilderConfig.aiConfigRuntime, ...config?.aiConfigRuntime },
      desktopComposer: { ...DefaultSolutionBuilderConfig.desktopComposer, ...config?.desktopComposer },
      solutionValidator: { ...DefaultSolutionBuilderConfig.solutionValidator, ...config?.solutionValidator },
      solutionOptimizer: { ...DefaultSolutionBuilderConfig.solutionOptimizer, ...config?.solutionOptimizer },
      deploymentPlanner: { ...DefaultSolutionBuilderConfig.deploymentPlanner, ...config?.deploymentPlanner },
      lifecycleManager: { ...DefaultSolutionBuilderConfig.lifecycleManager, ...config?.lifecycleManager },
      solutionCatalog: { ...DefaultSolutionBuilderConfig.solutionCatalog, ...config?.solutionCatalog },
    };
    this.config = merged;
    this.eventBus = eventBus ?? null;

    // Instantiate all 14 subsystems with their respective config sub-sections
    const bus = this.config.eventBusEnabled ? (eventBus ?? null) : null;

    this.goalInterpreter = new GoalInterpreter(this.config.goalInterpreter, bus);
    this.domainAnalyzer = new DomainAnalyzer(this.config.domainAnalyzer, bus);
    this.requirementExtractor = new RequirementExtractor(this.config.requirementExtractor, bus);
    this.solutionPlanner = new SolutionPlanner(this.config.solutionPlanner, bus);
    this.capabilitySelector = new CapabilitySelector(this.config.capabilitySelector, bus);
    this.workflowComposer = new WorkflowComposer(this.config.workflowComposer, bus);
    this.knowledgeComposer = new KnowledgeComposer(this.config.knowledgeComposer, bus);
    this.aiConfigRuntime = new AIConfigRuntime(this.config.aiConfigRuntime, bus);
    this.desktopComposer = new DesktopComposer(this.config.desktopComposer, bus);
    this.solutionValidator = new SolutionValidator(this.config.solutionValidator, bus);
    this.solutionOptimizer = new SolutionOptimizer(this.config.solutionOptimizer, bus);
    this.deploymentPlanner = new DeploymentPlanner(this.config.deploymentPlanner, bus);
    this.lifecycleManager = new LifecycleManager(this.config.lifecycleManager, bus);
    this.solutionCatalog = new SolutionCatalog(this.config.solutionCatalog, bus);
  }

  get state(): SolutionBuilderState {
    return this._state;
  }

  async initialize(): Promise<void> {
    if (this._state !== SBState.Uninitialized) {
      if (this._state === SBState.Stopped) {
        throw new SolutionBuilderDisposedError();
      }
      return; // Already initialized
    }

    await this.setState(SBState.Initializing);

    // All subsystems are already instantiated; no async init needed
    // In a production system, this would warm caches, connect to providers, etc.

    await this.setState(SBState.Ready);

    const now: Timestamp = new Date().toISOString();
    const event: SolutionBuilderInitializedEvent = Object.freeze({
      eventType: 'solution.builder.initialized',
      classification: EventClassification.Info,
      subsystemCount: 14,
      timestamp: now,
      metadata: Object.freeze({}),
    });

    await this.publishEvent(event as unknown as Record<string, unknown>, 'SolutionRuntime', 'SolutionRuntime');
  }

  async shutdown(): Promise<void> {
    if (this._state === SBState.Stopped || this._state === SBState.Uninitialized) {
      return;
    }

    await this.setState(SBState.Stopping);
    // In production: drain queues, flush caches, release resources
    await this.setState(SBState.Stopped);
  }

  async build(rawInput: string, overrides?: SolutionBuildOverrides): Promise<SolutionManifest> {
    this.requireReady();
    await this.setState(SBState.Building);

    const buildStart = Date.now();

    try {
      // 1. Create solution lifecycle entry
      const name = overrides?.name ?? this.extractNameFromInput(rawInput);
      const version = overrides?.version ?? '1.0.0';
      const description = rawInput.substring(0, 200).trim();
      const solutionId = await this.lifecycleManager.create(name, version, description);

      // 2. Interpret goal
      await this.lifecycleManager.transition(solutionId, LTrans.Plan);
      const goal = await this.goalInterpreter.interpret(solutionId, rawInput);

      // 3. Analyze domain
      const domain = await this.domainAnalyzer.analyze(solutionId, rawInput);

      // 4. Extract requirements
      const requirements = await this.requirementExtractor.extract(solutionId, rawInput, domain);

      // 5. Plan solution (blueprint)
      await this.lifecycleManager.transition(solutionId, LTrans.Generate);
      const blueprint = await this.solutionPlanner.plan(solutionId, goal, requirements, domain);

      // 6. Select capabilities
      const capabilities = await this.capabilitySelector.select(solutionId, blueprint);

      // 7. Compose workflow
      const workflow = await this.workflowComposer.compose(solutionId, blueprint);

      // 8. Compose knowledge
      const knowledge = await this.knowledgeComposer.compose(solutionId, domain);

      // 9. Configure AI
      const aiConfig = await this.aiConfigRuntime.configure(solutionId);

      // 10. Compose desktop
      const desktopConfig = await this.desktopComposer.compose(solutionId, domain);

      // 11. Generate state → validate
      await this.lifecycleManager.transition(solutionId, LTrans.Validate);

      // 12. Build preliminary manifest for validation
      const preliminaryManifest = await this.buildManifest(
        solutionId, name, version, goal, domain, requirements, blueprint,
        capabilities, workflow, knowledge, aiConfig, desktopConfig,
        null, null, overrides, buildStart,
      );

      const validationReport = await this.solutionValidator.validate(solutionId, preliminaryManifest);

      // 13. Optimize
      const optimizationReport = await this.solutionOptimizer.optimize(solutionId, preliminaryManifest);

      // 14. Plan deployment
      const deploymentPlan = await this.deploymentPlanner.plan(solutionId, preliminaryManifest);

      // 15. Install
      await this.lifecycleManager.transition(solutionId, LTrans.Install);

      // 16. Start
      await this.lifecycleManager.transition(solutionId, LTrans.Start);

      // 17. Build final manifest
      const manifest = await this.buildManifest(
        solutionId, name, version, goal, domain, requirements, blueprint,
        capabilities, workflow, knowledge, aiConfig, desktopConfig,
        deploymentPlan, optimizationReport, overrides, buildStart,
      );

      // 18. Add to catalog
      await this.solutionCatalog.add(
        solutionId,
        name,
        description,
        version,
        overrides?.category ?? 'General',
        domain.businessDomain,
      );

      const buildDurationMs = Date.now() - buildStart;
      this.lastBuildAt = new Date().toISOString();
      this.lastBuildDurationMs = buildDurationMs;

      await this.setState(SBState.Ready);

      // Emit build completed event
      const now: Timestamp = new Date().toISOString();
      const buildEvent: SolutionBuildCompletedEvent = Object.freeze({
        eventType: 'solution.build.completed',
        classification: EventClassification.Info,
        solutionId,
        durationMs: buildDurationMs,
        manifestValid: validationReport.overallVerdict !== ValidationVerdict.Fail,
        timestamp: now,
        metadata: Object.freeze({}),
      });
      await this.publishEvent(buildEvent as unknown as Record<string, unknown>, solutionId as string, 'Solution');

      return manifest;
    } catch (error) {
      await this.setState(SBState.Error);
      if (error instanceof SolutionBuilderError) throw error;
      throw new SolutionBuilderRuntimeError(
        `Build pipeline failed: ${error instanceof Error ? error.message : String(error)}`,
        { rawInputLength: rawInput.length },
      );
    }
  }

  async getMetrics(): Promise<SolutionBuilderMetrics> {
    const totalSolutions = await this.lifecycleManager.count();
    const totalGoals = await this.goalInterpreter.count();
    const totalRequirements = await this.requirementExtractor.count();
    const totalCapabilitySelections = await this.capabilitySelector.count();
    const totalCatalogEntries = await this.solutionCatalog.count();

    // Compute solutions by state
    const allStates = Object.values(SStateEnum) as readonly SolutionState[];
    const solutionsByStateEntries = await this.lifecycleManager.list();
    const solutionsByState: Record<string, number> = {} as Record<string, number>;
    for (const s of allStates) {
      solutionsByState[s] = 0;
    }

    for (const solId of solutionsByStateEntries) {
      const state = await this.lifecycleManager.getState(solId);
      if (state) {
        solutionsByState[state] = (solutionsByState[state] ?? 0) + 1;
      }
    }

    // Get all validation reports for average score
    const validationReports = await this.solutionValidator.list();
    let averageValidationScore = 0;
    if (validationReports.length > 0) {
      const totalScore = validationReports.reduce((sum, r) => sum + r.complianceScore, 0);
      averageValidationScore = Math.round(totalScore / validationReports.length);
    }

    // Get all blueprints for average ROI
    const blueprints = await this.solutionPlanner.list();
    let averageROI = 0;
    if (blueprints.length > 0) {
      const totalROI = blueprints.reduce((sum, b) => sum + b.estimatedROI, 0);
      averageROI = Math.round(totalROI / blueprints.length);
    }

    return Object.freeze({
      totalSolutions,
      solutionsByState: Object.freeze(solutionsByState) as unknown as Readonly<Record<SolutionState, number>>,
      totalGoals,
      totalRequirements,
      totalCapabilitySelections,
      averageBuildTimeMs: this.lastBuildDurationMs,
      averageValidationScore,
      averageROI,
      totalCatalogEntries,
      lastBuildAt: this.lastBuildAt,
      metadata: Object.freeze({}),
    });
  }

  // ─── Subsystem Getters ────────────────────────────────────────────

  getGoalInterpreter(): IGoalInterpreter { return this.goalInterpreter; }
  getDomainAnalyzer(): IDomainAnalyzer { return this.domainAnalyzer; }
  getRequirementExtractor(): IRequirementExtractor { return this.requirementExtractor; }
  getSolutionPlanner(): ISolutionPlanner { return this.solutionPlanner; }
  getCapabilitySelector(): ICapabilitySelector { return this.capabilitySelector; }
  getWorkflowComposer(): IWorkflowComposer { return this.workflowComposer; }
  getKnowledgeComposer(): IKnowledgeComposer { return this.knowledgeComposer; }
  getAIConfigRuntime(): IAIConfigRuntime { return this.aiConfigRuntime; }
  getDesktopComposer(): IDesktopComposer { return this.desktopComposer; }
  getSolutionValidator(): ISolutionValidator { return this.solutionValidator; }
  getSolutionOptimizer(): ISolutionOptimizer { return this.solutionOptimizer; }
  getDeploymentPlanner(): IDeploymentPlanner { return this.deploymentPlanner; }
  getLifecycleManager(): ILifecycleManager { return this.lifecycleManager; }
  getSolutionCatalog(): ISolutionCatalog { return this.solutionCatalog; }

  // ─── Private Helpers ──────────────────────────────────────────────

  private requireReady(): void {
    if (this._state === SBState.Uninitialized) {
      throw new SolutionBuilderNotInitializedError();
    }
    if (this._state === SBState.Stopped) {
      throw new SolutionBuilderDisposedError();
    }
    if (this._state === SBState.Error) {
      throw new SolutionBuilderRuntimeError('Runtime is in error state; re-initialization required');
    }
  }

  private async setState(newState: SolutionBuilderState): Promise<void> {
    const previous = this._state;
    this._state = newState;

    if (this.config.eventBusEnabled) {
      const now: Timestamp = new Date().toISOString();
      const event: SolutionBuilderStateChangedEvent = Object.freeze({
        eventType: 'solution.builder.stateChanged',
        classification: EventClassification.StateChange,
        fromState: previous,
        toState: newState,
        timestamp: now,
        metadata: Object.freeze({}),
      });
      await this.publishEvent(event as unknown as Record<string, unknown>, 'SolutionRuntime', 'SolutionRuntime');
    }
  }

  private async buildManifest(
    solutionId: SolutionId,
    name: string,
    version: SemVer,
    goal: Goal,
    domain: DomainAnalysis,
    requirements: readonly Requirement[],
    blueprint: SolutionBlueprint,
    capabilities: readonly CapabilitySelection[],
    workflow: WorkflowPackage,
    knowledge: KnowledgePackage,
    aiConfig: AIConfiguration,
    desktopConfig: DesktopConfiguration,
    deploymentPlan: DeploymentPlan | null,
    optimizationReport: OptimizationReport | null,
    overrides: SolutionBuildOverrides | undefined,
    buildStart: number,
  ): Promise<SolutionManifest> {
    const now: Timestamp = new Date().toISOString();
    const buildTimeMs = Date.now() - buildStart;

    const requiredCapabilities = capabilities
      .filter(c => c.required)
      .map(c => c.capabilityName);

    const functionalReqs = requirements.filter(r => r.type === 'Functional' as never);
    const nonFunctionalReqs = requirements.filter(r => r.type === 'NonFunctional' as never);

    return Object.freeze({
      solutionId,
      version,
      name,
      description: overrides?.author ? `${name} by ${overrides.author}` : name,
      goal: goal.primaryGoal,
      expectedValue: goal.kpis.length > 0 ? goal.kpis[0] : 'To be determined',
      businessDomain: domain.businessDomain,
      constraints: Object.freeze(goal.constraints),
      stakeholders: Object.freeze(goal.stakeholders),
      kpis: Object.freeze(goal.kpis),
      runtimeDependencies: Object.freeze(blueprint.runtimeDependencies),
      capabilityDependencies: Object.freeze(requiredCapabilities),
      workflowPackages: Object.freeze([workflow.id]),
      knowledgePackages: Object.freeze([knowledge.id]),
      aiConfiguration: aiConfig,
      desktopConfiguration: desktopConfig,
      securityProfile: Object.freeze({}),
      privacyProfile: Object.freeze({}),
      complianceStatus: ValidationVerdict.Pass,
      marketplaceDependencies: Object.freeze([]),
      evolutionHistory: Object.freeze([]),
      metrics: Object.freeze({
        buildTimeMs,
        solutionComplexity: blueprint.complexity,
        estimatedROI: blueprint.estimatedROI,
        estimatedCost: blueprint.estimatedCost,
        capabilityReuse: capabilities.length > 0
          ? capabilities.filter(c => c.required).length / capabilities.length
          : 0,
        workflowComplexity: workflow.complexity,
        aiCost: aiConfig.estimatedMonthlyCost,
        aiLatencyMs: aiConfig.estimatedLatencyMs,
        userSatisfactionPrediction: 75,
        constraintScore: goal.constraints.length > 0 ? 80 : 50,
        complianceScore: 85,
        evolutionScore: 60,
      }),
      deploymentConfiguration: deploymentPlan,
      license: overrides?.license ?? 'MIT',
      author: overrides?.author ?? 'Solution Builder',
      digitalSignature: null,
      createdAt: now,
      updatedAt: now,
      metadata: Object.freeze({
        functionalReqCount: functionalReqs.length,
        nonFunctionalReqCount: nonFunctionalReqs.length,
        capabilityCount: capabilities.length,
        optimizationSuggestionCount: optimizationReport?.suggestions.length ?? 0,
      }),
    });
  }

  private extractNameFromInput(input: string): string {
    // Try to extract a meaningful name from the first line or first 50 chars
    const firstLine = input.split(/[.\n]/)[0]?.trim();
    if (firstLine && firstLine.length <= 60) {
      // Capitalize first letter
      return firstLine.charAt(0).toUpperCase() + firstLine.slice(1);
    }
    return 'Untitled Solution';
  }

  // ─── Event Publishing ──────────────────────────────────────────────

  private async publishEvent(event: Record<string, unknown>, aggregateId: string, aggregateType: string): Promise<void> {
    const full = Object.freeze({
      ...event,
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId,
      aggregateType,
      version: '1.0.0',
    });
    if (this.eventBus) {
      await this.eventBus.publish(full as DomainEventBase);
    }
  }
}
