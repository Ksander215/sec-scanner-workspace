/**
 * Solution Builder Runtime — Public Contracts
 * TASK-AIS-010A.000
 */

import type {
  SolutionId, GoalId, RequirementId, BlueprintId,
  CapabilitySelectionId, WorkflowPackageId, KnowledgePackageId,
  AIConfigId, DesktopConfigId, ValidationReportId,
  DeploymentPlanId, CatalogEntryId, OptimizationReportId,
  Goal, DomainAnalysis, Requirement, SolutionBlueprint,
  CapabilitySelection, WorkflowPackage, KnowledgePackage,
  AIConfiguration, DesktopConfiguration, ValidationReport,
  OptimizationReport, DeploymentPlan,
  LifecycleTransitionRecord, SolutionCatalogEntry,
  SolutionManifest, SolutionBuilderMetrics,
  GoalPriority, RequirementType, BusinessDomain,
  ValidationVerdict,
  SolutionState, LifecycleTransition,
  AIProviderType, CostStrategy, DesktopLayout, ThemeType,
  SolutionBuilderState,
  SemVer,
} from './types.js';

export interface IGoalInterpreter {
  interpret(solutionId: SolutionId, rawInput: string): Promise<Goal>;
  getById(id: GoalId): Promise<Goal | null>;
  getBySolutionId(solutionId: SolutionId): Promise<Goal | null>;
  list(): Promise<readonly Goal[]>;
  count(): Promise<number>;
}

export interface IDomainAnalyzer {
  analyze(solutionId: SolutionId, rawInput: string): Promise<DomainAnalysis>;
  getBySolutionId(solutionId: SolutionId): Promise<DomainAnalysis | null>;
  list(): Promise<readonly DomainAnalysis[]>;
  count(): Promise<number>;
}

export interface IRequirementExtractor {
  extract(solutionId: SolutionId, rawInput: string, domain: DomainAnalysis): Promise<readonly Requirement[]>;
  getById(id: RequirementId): Promise<Requirement | null>;
  getBySolutionId(solutionId: SolutionId): Promise<readonly Requirement[]>;
  list(filter?: Partial<{ type: RequirementType; priority: GoalPriority }>): Promise<readonly Requirement[]>;
  count(): Promise<number>;
}

export interface ISolutionPlanner {
  plan(solutionId: SolutionId, goal: Goal, requirements: readonly Requirement[], domain: DomainAnalysis): Promise<SolutionBlueprint>;
  getById(id: BlueprintId): Promise<SolutionBlueprint | null>;
  getBySolutionId(solutionId: SolutionId): Promise<SolutionBlueprint | null>;
  list(): Promise<readonly SolutionBlueprint[]>;
  count(): Promise<number>;
}

export interface ICapabilitySelector {
  select(solutionId: SolutionId, blueprint: SolutionBlueprint): Promise<readonly CapabilitySelection[]>;
  getById(id: CapabilitySelectionId): Promise<CapabilitySelection | null>;
  getBySolutionId(solutionId: SolutionId): Promise<readonly CapabilitySelection[]>;
  list(): Promise<readonly CapabilitySelection[]>;
  count(): Promise<number>;
}

export interface IWorkflowComposer {
  compose(solutionId: SolutionId, blueprint: SolutionBlueprint): Promise<WorkflowPackage>;
  getById(id: WorkflowPackageId): Promise<WorkflowPackage | null>;
  getBySolutionId(solutionId: SolutionId): Promise<readonly WorkflowPackage[]>;
  list(): Promise<readonly WorkflowPackage[]>;
  count(): Promise<number>;
}

export interface IKnowledgeComposer {
  compose(solutionId: SolutionId, domain: DomainAnalysis): Promise<KnowledgePackage>;
  getById(id: KnowledgePackageId): Promise<KnowledgePackage | null>;
  getBySolutionId(solutionId: SolutionId): Promise<readonly KnowledgePackage[]>;
  list(): Promise<readonly KnowledgePackage[]>;
  count(): Promise<number>;
}

export interface IAIConfigRuntime {
  configure(solutionId: SolutionId, overrides?: Partial<AIConfigOverrides>): Promise<AIConfiguration>;
  getById(id: AIConfigId): Promise<AIConfiguration | null>;
  getBySolutionId(solutionId: SolutionId): Promise<AIConfiguration | null>;
  list(): Promise<readonly AIConfiguration[]>;
  count(): Promise<number>;
}

export interface AIConfigOverrides {
  readonly provider?: AIProviderType;
  readonly model?: string;
  readonly temperature?: number;
  readonly costStrategy?: CostStrategy;
}

export interface IDesktopComposer {
  compose(solutionId: SolutionId, domain: DomainAnalysis, overrides?: Partial<DesktopOverrides>): Promise<DesktopConfiguration>;
  getById(id: DesktopConfigId): Promise<DesktopConfiguration | null>;
  getBySolutionId(solutionId: SolutionId): Promise<DesktopConfiguration | null>;
  list(): Promise<readonly DesktopConfiguration[]>;
  count(): Promise<number>;
}

export interface DesktopOverrides {
  readonly layout?: DesktopLayout;
  readonly theme?: ThemeType;
}

export interface ISolutionValidator {
  validate(solutionId: SolutionId, manifest: SolutionManifest): Promise<ValidationReport>;
  getById(id: ValidationReportId): Promise<ValidationReport | null>;
  getBySolutionId(solutionId: SolutionId): Promise<ValidationReport | null>;
  list(filter?: Partial<{ verdict: ValidationVerdict }>): Promise<readonly ValidationReport[]>;
  count(): Promise<number>;
}

export interface ISolutionOptimizer {
  optimize(solutionId: SolutionId, manifest: SolutionManifest): Promise<OptimizationReport>;
  getById(id: OptimizationReportId): Promise<OptimizationReport | null>;
  getBySolutionId(solutionId: SolutionId): Promise<OptimizationReport | null>;
  list(): Promise<readonly OptimizationReport[]>;
  count(): Promise<number>;
}

export interface IDeploymentPlanner {
  plan(solutionId: SolutionId, manifest: SolutionManifest): Promise<DeploymentPlan>;
  getById(id: DeploymentPlanId): Promise<DeploymentPlan | null>;
  getBySolutionId(solutionId: SolutionId): Promise<DeploymentPlan | null>;
  list(): Promise<readonly DeploymentPlan[]>;
  count(): Promise<number>;
}

export interface ILifecycleManager {
  create(name: string, version: SemVer, description: string): Promise<SolutionId>;
  transition(solutionId: SolutionId, transition: LifecycleTransition): Promise<LifecycleTransitionRecord>;
  getState(solutionId: SolutionId): Promise<SolutionState | null>;
  getHistory(solutionId: SolutionId): Promise<readonly LifecycleTransitionRecord[]>;
  list(filter?: Partial<{ state: SolutionState }>): Promise<readonly SolutionId[]>;
  count(): Promise<number>;
}

export interface ISolutionCatalog {
  add(solutionId: SolutionId, name: string, description: string, version: SemVer, category: string, businessDomain: BusinessDomain): Promise<SolutionCatalogEntry>;
  remove(entryId: CatalogEntryId): Promise<void>;
  getById(id: CatalogEntryId): Promise<SolutionCatalogEntry | null>;
  getBySolutionId(solutionId: SolutionId): Promise<SolutionCatalogEntry | null>;
  search(query: string): Promise<readonly SolutionCatalogEntry[]>;
  list(filter?: Partial<{ state: SolutionState; category: string; businessDomain: BusinessDomain }>): Promise<readonly SolutionCatalogEntry[]>;
  count(): Promise<number>;
}

export interface ISolutionRuntime {
  readonly state: SolutionBuilderState;
  build(rawInput: string, overrides?: SolutionBuildOverrides): Promise<SolutionManifest>;
  getMetrics(): Promise<SolutionBuilderMetrics>;
  getGoalInterpreter(): IGoalInterpreter;
  getDomainAnalyzer(): IDomainAnalyzer;
  getRequirementExtractor(): IRequirementExtractor;
  getSolutionPlanner(): ISolutionPlanner;
  getCapabilitySelector(): ICapabilitySelector;
  getWorkflowComposer(): IWorkflowComposer;
  getKnowledgeComposer(): IKnowledgeComposer;
  getAIConfigRuntime(): IAIConfigRuntime;
  getDesktopComposer(): IDesktopComposer;
  getSolutionValidator(): ISolutionValidator;
  getSolutionOptimizer(): ISolutionOptimizer;
  getDeploymentPlanner(): IDeploymentPlanner;
  getLifecycleManager(): ILifecycleManager;
  getSolutionCatalog(): ISolutionCatalog;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

export interface SolutionBuildOverrides {
  readonly name?: string;
  readonly version?: SemVer;
  readonly author?: string;
  readonly license?: string;
  readonly category?: string;
}

export interface SolutionBuilderPublicContracts {
  readonly goalInterpreter: IGoalInterpreter;
  readonly domainAnalyzer: IDomainAnalyzer;
  readonly requirementExtractor: IRequirementExtractor;
  readonly solutionPlanner: ISolutionPlanner;
  readonly capabilitySelector: ICapabilitySelector;
  readonly workflowComposer: IWorkflowComposer;
  readonly knowledgeComposer: IKnowledgeComposer;
  readonly aiConfigRuntime: IAIConfigRuntime;
  readonly desktopComposer: IDesktopComposer;
  readonly solutionValidator: ISolutionValidator;
  readonly solutionOptimizer: ISolutionOptimizer;
  readonly deploymentPlanner: IDeploymentPlanner;
  readonly lifecycleManager: ILifecycleManager;
  readonly solutionCatalog: ISolutionCatalog;
  readonly solutionRuntime: ISolutionRuntime;
}
