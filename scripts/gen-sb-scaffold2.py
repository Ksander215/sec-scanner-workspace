#!/usr/bin/env python3
"""Generate Solution Builder events.ts and contracts.ts.
TASK-AIS-010A.000
"""

import os
BASE = '/home/z/my-project/src/core/solution-builder'

def w(path, content):
    with open(os.path.join(BASE, path), 'w') as f:
        f.write(content)
    print(f'  {path} ({len(content)} bytes)')

events = '''/**
 * Solution Builder Runtime — Domain Events
 * TASK-AIS-010A.000
 */

import type { Timestamp } from '../types/common.js';
import type {
  SolutionId, GoalId, RequirementId, BlueprintId,
  CapabilitySelectionId, WorkflowPackageId, KnowledgePackageId,
  AIConfigId, DesktopConfigId, ValidationReportId,
  DeploymentPlanId, LifecycleEventId, CatalogEntryId, OptimizationReportId,
  GoalPriority, BusinessDomain, RequirementType,
  ValidationVerdict, ValidationCategory,
  DeploymentMode, OptimizationDimension,
  WorkflowComplexity, SolutionState,
  AIProviderType, CostStrategy, ThemeType, DesktopLayout,
  KnowledgePackType, LifecycleTransition, SolutionBuilderState,
} from './types.js';
import { EventClassification } from '../types/common.js';

export interface GoalInterpretedEvent {
  readonly eventType: 'solution.goal.interpreted';
  readonly classification: EventClassification;
  readonly goalId: GoalId;
  readonly solutionId: SolutionId;
  readonly primaryGoal: string;
  readonly subGoalCount: number;
  readonly priority: GoalPriority;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface DomainDetectedEvent {
  readonly eventType: 'solution.domain.detected';
  readonly classification: EventClassification;
  readonly solutionId: SolutionId;
  readonly businessDomain: BusinessDomain;
  readonly industry: string;
  readonly terminologyCount: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface RequirementsExtractedEvent {
  readonly eventType: 'solution.requirements.extracted';
  readonly classification: EventClassification;
  readonly solutionId: SolutionId;
  readonly functionalCount: number;
  readonly nonFunctionalCount: number;
  readonly constraintCount: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolutionPlannedEvent {
  readonly eventType: 'solution.planned';
  readonly classification: EventClassification;
  readonly solutionId: SolutionId;
  readonly blueprintId: BlueprintId;
  readonly capabilityCount: number;
  readonly estimatedCost: number;
  readonly estimatedROI: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface CapabilitySelectedEvent {
  readonly eventType: 'solution.capability.selected';
  readonly classification: EventClassification;
  readonly selectionId: CapabilitySelectionId;
  readonly solutionId: SolutionId;
  readonly capabilityName: string;
  readonly required: boolean;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface WorkflowGeneratedEvent {
  readonly eventType: 'solution.workflow.generated';
  readonly classification: EventClassification;
  readonly packageId: WorkflowPackageId;
  readonly solutionId: SolutionId;
  readonly name: string;
  readonly complexity: WorkflowComplexity;
  readonly stepCount: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface KnowledgeComposedEvent {
  readonly eventType: 'solution.knowledge.composed';
  readonly classification: EventClassification;
  readonly packageId: KnowledgePackageId;
  readonly solutionId: SolutionId;
  readonly type: KnowledgePackType;
  readonly itemCount: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface AIConfiguredEvent {
  readonly eventType: 'solution.ai.configured';
  readonly classification: EventClassification;
  readonly configId: AIConfigId;
  readonly solutionId: SolutionId;
  readonly provider: AIProviderType;
  readonly model: string;
  readonly costStrategy: CostStrategy;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface DesktopComposedEvent {
  readonly eventType: 'solution.desktop.composed';
  readonly classification: EventClassification;
  readonly configId: DesktopConfigId;
  readonly solutionId: SolutionId;
  readonly layout: DesktopLayout;
  readonly theme: ThemeType;
  readonly windowCount: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ValidationCompletedEvent {
  readonly eventType: 'solution.validation.completed';
  readonly classification: EventClassification;
  readonly reportId: ValidationReportId;
  readonly solutionId: SolutionId;
  readonly verdict: ValidationVerdict;
  readonly complianceScore: number;
  readonly valueScore: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ValidationFailedEvent {
  readonly eventType: 'solution.validation.failed';
  readonly classification: EventClassification;
  readonly reportId: ValidationReportId;
  readonly solutionId: SolutionId;
  readonly reason: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface OptimizationCompletedEvent {
  readonly eventType: 'solution.optimization.completed';
  readonly classification: EventClassification;
  readonly reportId: OptimizationReportId;
  readonly solutionId: SolutionId;
  readonly costReduction: number;
  readonly qualityImprovement: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface DeploymentPlannedEvent {
  readonly eventType: 'solution.deployment.planned';
  readonly classification: EventClassification;
  readonly planId: DeploymentPlanId;
  readonly solutionId: SolutionId;
  readonly mode: DeploymentMode;
  readonly stepCount: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolutionGeneratedEvent {
  readonly eventType: 'solution.generated';
  readonly classification: EventClassification;
  readonly solutionId: SolutionId;
  readonly name: string;
  readonly version: string;
  readonly durationMs: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolutionInstalledEvent {
  readonly eventType: 'solution.installed';
  readonly classification: EventClassification;
  readonly solutionId: SolutionId;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolutionUpdatedEvent {
  readonly eventType: 'solution.updated';
  readonly classification: EventClassification;
  readonly solutionId: SolutionId;
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolutionArchivedEvent {
  readonly eventType: 'solution.archived';
  readonly classification: EventClassification;
  readonly solutionId: SolutionId;
  readonly reason: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolutionStateChangedEvent {
  readonly eventType: 'solution.state.changed';
  readonly classification: EventClassification;
  readonly solutionId: SolutionId;
  readonly fromState: SolutionState;
  readonly toState: SolutionState;
  readonly transition: LifecycleTransition;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolutionCatalogAddedEvent {
  readonly eventType: 'solution.catalog.added';
  readonly classification: EventClassification;
  readonly entryId: CatalogEntryId;
  readonly solutionId: SolutionId;
  readonly name: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolutionCatalogRemovedEvent {
  readonly eventType: 'solution.catalog.removed';
  readonly classification: EventClassification;
  readonly entryId: CatalogEntryId;
  readonly solutionId: SolutionId;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolutionBuilderInitializedEvent {
  readonly eventType: 'solution.builder.initialized';
  readonly classification: EventClassification;
  readonly subsystemCount: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolutionBuilderStateChangedEvent {
  readonly eventType: 'solution.builder.stateChanged';
  readonly classification: EventClassification;
  readonly fromState: SolutionBuilderState;
  readonly toState: SolutionBuilderState;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolutionBuildCompletedEvent {
  readonly eventType: 'solution.build.completed';
  readonly classification: EventClassification;
  readonly solutionId: SolutionId;
  readonly durationMs: number;
  readonly manifestValid: boolean;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export type SolutionBuilderEvent =
  | GoalInterpretedEvent
  | DomainDetectedEvent
  | RequirementsExtractedEvent
  | SolutionPlannedEvent
  | CapabilitySelectedEvent
  | WorkflowGeneratedEvent
  | KnowledgeComposedEvent
  | AIConfiguredEvent
  | DesktopComposedEvent
  | ValidationCompletedEvent
  | ValidationFailedEvent
  | OptimizationCompletedEvent
  | DeploymentPlannedEvent
  | SolutionGeneratedEvent
  | SolutionInstalledEvent
  | SolutionUpdatedEvent
  | SolutionArchivedEvent
  | SolutionStateChangedEvent
  | SolutionCatalogAddedEvent
  | SolutionCatalogRemovedEvent
  | SolutionBuilderInitializedEvent
  | SolutionBuilderStateChangedEvent
  | SolutionBuildCompletedEvent;
'''

contracts = '''/**
 * Solution Builder Runtime — Public Contracts
 * TASK-AIS-010A.000
 */

import type {
  SolutionId, GoalId, RequirementId, BlueprintId,
  CapabilitySelectionId, WorkflowPackageId, KnowledgePackageId,
  AIConfigId, DesktopConfigId, ValidationReportId,
  DeploymentPlanId, LifecycleEventId, CatalogEntryId, OptimizationReportId,
  Goal, DomainAnalysis, Requirement, SolutionBlueprint,
  CapabilitySelection, WorkflowPackage, KnowledgePackage,
  AIConfiguration, DesktopConfiguration, ValidationReport,
  OptimizationReport, DeploymentPlan,
  LifecycleTransitionRecord, SolutionCatalogEntry,
  SolutionManifest, SolutionMetrics, SolutionBuilderMetrics,
  GoalPriority, RequirementType, BusinessDomain,
  ValidationCategory, ValidationVerdict,
  DeploymentMode, OptimizationDimension,
  WorkflowComplexity, SolutionState, LifecycleTransition,
  AIProviderType, CostStrategy, DesktopLayout, ThemeType,
  KnowledgePackType, SolutionBuilderState,
  SemVer, Timestamp,
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
'''

print('Generating events.ts and contracts.ts...')
w('events.ts', events)
w('contracts.ts', contracts)
print('Done.')
