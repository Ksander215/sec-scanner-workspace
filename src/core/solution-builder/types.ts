/**
 * Solution Builder Runtime — Types, Enums, Interfaces
 * TASK-AIS-010A.000
 *
 * Core type definitions:
 *   - Branded identifiers (SolutionId, GoalId, RequirementId, etc.)
 *   - Enums (SolutionState, GoalPriority, RequirementType, etc.)
 *   - Domain entities (SolutionManifest, Goal, Requirement, etc.)
 *   - Configuration (SolutionBuilderRuntimeConfig, subsystem configs)
 *
 * Architecture: SOLID, DDD, Event-Driven
 * Conforms to: PHI-001–PHI-007, GOV-008, ARC-001.001
 */

import type { Timestamp, Identifier, SemVer } from '../types/common.js';
export type { Timestamp, SemVer };

// ═══════════════════════════════════════════════════════════════════
// BRANDED IDENTIFIERS
// ═══════════════════════════════════════════════════════════════════

export type SolutionId = Identifier & { readonly __brand: 'SolutionBuilderSolutionId' };
export type GoalId = Identifier & { readonly __brand: 'SolutionBuilderGoalId' };
export type RequirementId = Identifier & { readonly __brand: 'SolutionBuilderRequirementId' };
export type BlueprintId = Identifier & { readonly __brand: 'SolutionBuilderBlueprintId' };
export type CapabilitySelectionId = Identifier & { readonly __brand: 'SolutionBuilderCapabilitySelectionId' };
export type WorkflowPackageId = Identifier & { readonly __brand: 'SolutionBuilderWorkflowPackageId' };
export type KnowledgePackageId = Identifier & { readonly __brand: 'SolutionBuilderKnowledgePackageId' };
export type AIConfigId = Identifier & { readonly __brand: 'SolutionBuilderAIConfigId' };
export type DesktopConfigId = Identifier & { readonly __brand: 'SolutionBuilderDesktopConfigId' };
export type ValidationReportId = Identifier & { readonly __brand: 'SolutionBuilderValidationReportId' };
export type DeploymentPlanId = Identifier & { readonly __brand: 'SolutionBuilderDeploymentPlanId' };
export type LifecycleEventId = Identifier & { readonly __brand: 'SolutionBuilderLifecycleEventId' };
export type CatalogEntryId = Identifier & { readonly __brand: 'SolutionBuilderCatalogEntryId' };
export type OptimizationReportId = Identifier & { readonly __brand: 'SolutionBuilderOptimizationReportId' };

function brandSolutionId(id: string): SolutionId { return id as SolutionId; }
function brandGoalId(id: string): GoalId { return id as GoalId; }
function brandRequirementId(id: string): RequirementId { return id as RequirementId; }
function brandBlueprintId(id: string): BlueprintId { return id as BlueprintId; }
function brandCapabilitySelectionId(id: string): CapabilitySelectionId { return id as CapabilitySelectionId; }
function brandWorkflowPackageId(id: string): WorkflowPackageId { return id as WorkflowPackageId; }
function brandKnowledgePackageId(id: string): KnowledgePackageId { return id as KnowledgePackageId; }
function brandAIConfigId(id: string): AIConfigId { return id as AIConfigId; }
function brandDesktopConfigId(id: string): DesktopConfigId { return id as DesktopConfigId; }
function brandValidationReportId(id: string): ValidationReportId { return id as ValidationReportId; }
function brandDeploymentPlanId(id: string): DeploymentPlanId { return id as DeploymentPlanId; }
function brandLifecycleEventId(id: string): LifecycleEventId { return id as LifecycleEventId; }
function brandCatalogEntryId(id: string): CatalogEntryId { return id as CatalogEntryId; }
function brandOptimizationReportId(id: string): OptimizationReportId { return id as OptimizationReportId; }

export {
  brandSolutionId, brandGoalId, brandRequirementId, brandBlueprintId,
  brandCapabilitySelectionId, brandWorkflowPackageId, brandKnowledgePackageId,
  brandAIConfigId, brandDesktopConfigId, brandValidationReportId,
  brandDeploymentPlanId, brandLifecycleEventId, brandCatalogEntryId,
  brandOptimizationReportId,
};

// ═══════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════

/** Solution lifecycle states */
export enum SolutionState {
  Draft = 'Draft',
  Planned = 'Planned',
  Generated = 'Generated',
  Validated = 'Validated',
  Installed = 'Installed',
  Running = 'Running',
  Updating = 'Updating',
  Deprecated = 'Deprecated',
  Archived = 'Archived',
}

/** Goal priority level */
export enum GoalPriority {
  Critical = 'Critical',
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
}

/** Requirement type */
export enum RequirementType {
  Functional = 'Functional',
  NonFunctional = 'NonFunctional',
  Constraint = 'Constraint',
  Dependency = 'Dependency',
}

/** Business domain */
export enum BusinessDomain {
  Construction = 'Construction',
  Healthcare = 'Healthcare',
  Finance = 'Finance',
  Education = 'Education',
  ECommerce = 'ECommerce',
  Manufacturing = 'Manufacturing',
  Logistics = 'Logistics',
  RealEstate = 'RealEstate',
  Legal = 'Legal',
  HR = 'HR',
  Marketing = 'Marketing',
  General = 'General',
}

/** Validation check category */
export enum ValidationCategory {
  Compliance = 'Compliance',
  Security = 'Security',
  Privacy = 'Privacy',
  Architecture = 'Architecture',
  Performance = 'Performance',
  Value = 'Value',
}

/** Validation verdict */
export enum ValidationVerdict {
  Pass = 'Pass',
  PassWithWarnings = 'PassWithWarnings',
  Fail = 'Fail',
  Skipped = 'Skipped',
}

/** Deployment mode */
export enum DeploymentMode {
  Local = 'Local',
  Cloud = 'Cloud',
  Hybrid = 'Hybrid',
}

/** Optimization dimension */
export enum OptimizationDimension {
  Cost = 'Cost',
  Speed = 'Speed',
  Quality = 'Quality',
  UX = 'UX',
  Constraints = 'Constraints',
  ROI = 'ROI',
}

/** AI provider type */
export enum AIProviderType {
  OpenAI = 'OpenAI',
  Anthropic = 'Anthropic',
  Google = 'Google',
  Local = 'Local',
  Custom = 'Custom',
}

/** Workflow complexity level */
export enum WorkflowComplexity {
  Simple = 'Simple',
  Moderate = 'Moderate',
  Complex = 'Complex',
  Enterprise = 'Enterprise',
}

/** Desktop layout type */
export enum DesktopLayout {
  SinglePane = 'SinglePane',
  Sidebar = 'Sidebar',
  Dashboard = 'Dashboard',
  SplitView = 'SplitView',
  Custom = 'Custom',
}

/** Theme type */
export enum ThemeType {
  Light = 'Light',
  Dark = 'Dark',
  System = 'System',
}

/** Knowledge pack type */
export enum KnowledgePackType {
  DomainKnowledge = 'DomainKnowledge',
  BestPractices = 'BestPractices',
  Policies = 'Policies',
  PromptAssets = 'PromptAssets',
  Templates = 'Templates',
}

/** Lifecycle transition type */
export enum LifecycleTransition {
  Create = 'Create',
  Plan = 'Plan',
  Generate = 'Generate',
  Validate = 'Validate',
  Install = 'Install',
  Start = 'Start',
  Update = 'Update',
  Deprecate = 'Deprecate',
  Archive = 'Archive',
  Rollback = 'Rollback',
}

/** Solution Builder Runtime state */
export enum SolutionBuilderState {
  Uninitialized = 'Uninitialized',
  Initializing = 'Initializing',
  Ready = 'Ready',
  Building = 'Building',
  Validating = 'Validating',
  Deploying = 'Deploying',
  Stopping = 'Stopping',
  Stopped = 'Stopped',
  Error = 'Error',
}

/** Cost strategy for AI */
export enum CostStrategy {
  MinimizeCost = 'MinimizeCost',
  Balanced = 'Balanced',
  MaximizeQuality = 'MaximizeQuality',
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES
// ═══════════════════════════════════════════════════════════════════

/** Interpreted goal from user input */
export interface Goal {
  readonly id: GoalId;
  readonly solutionId: SolutionId;
  readonly rawInput: string;
  readonly primaryGoal: string;
  readonly subGoals: readonly string[];
  readonly constraints: readonly string[];
  readonly kpis: readonly string[];
  readonly stakeholders: readonly string[];
  readonly risks: readonly string[];
  readonly priority: GoalPriority;
  readonly interpretedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Domain analysis result */
export interface DomainAnalysis {
  readonly solutionId: SolutionId;
  readonly industry: string;
  readonly businessDomain: BusinessDomain;
  readonly subjectArea: string;
  readonly terminology: readonly string[];
  readonly bestPractices: readonly string[];
  readonly analyzedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** An extracted requirement */
export interface Requirement {
  readonly id: RequirementId;
  readonly solutionId: SolutionId;
  readonly type: RequirementType;
  readonly description: string;
  readonly priority: GoalPriority;
  readonly source: string;
  readonly constraints: readonly string[];
  readonly dependencies: readonly RequirementId[];
  readonly estimatedEffort: string;
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Solution Blueprint — the plan */
export interface SolutionBlueprint {
  readonly id: BlueprintId;
  readonly solutionId: SolutionId;
  readonly name: string;
  readonly description: string;
  readonly runtimeDependencies: readonly string[];
  readonly capabilityDependencies: readonly string[];
  readonly workflowPackages: readonly WorkflowPackageId[];
  readonly knowledgePackages: readonly KnowledgePackageId[];
  readonly aiConfigId: AIConfigId | null;
  readonly desktopConfigId: DesktopConfigId | null;
  readonly estimatedCost: number;
  readonly estimatedROI: number;
  readonly complexity: WorkflowComplexity;
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** A selected capability for the solution */
export interface CapabilitySelection {
  readonly id: CapabilitySelectionId;
  readonly solutionId: SolutionId;
  readonly capabilityId: string;
  readonly capabilityName: string;
  readonly reason: string;
  readonly required: boolean;
  readonly selectedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** A composed workflow package */
export interface WorkflowPackage {
  readonly id: WorkflowPackageId;
  readonly solutionId: SolutionId;
  readonly name: string;
  readonly description: string;
  readonly steps: readonly string[];
  readonly complexity: WorkflowComplexity;
  readonly estimatedDuration: string;
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** A composed knowledge package */
export interface KnowledgePackage {
  readonly id: KnowledgePackageId;
  readonly solutionId: SolutionId;
  readonly type: KnowledgePackType;
  readonly name: string;
  readonly items: readonly string[];
  readonly selectedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** AI configuration for the solution */
export interface AIConfiguration {
  readonly id: AIConfigId;
  readonly solutionId: SolutionId;
  readonly provider: AIProviderType;
  readonly model: string;
  readonly temperature: number;
  readonly contextWindow: string;
  readonly privacyLevel: string;
  readonly costStrategy: CostStrategy;
  readonly estimatedMonthlyCost: number;
  readonly estimatedLatencyMs: number;
  readonly configuredAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Desktop configuration */
export interface DesktopConfiguration {
  readonly id: DesktopConfigId;
  readonly solutionId: SolutionId;
  readonly layout: DesktopLayout;
  readonly theme: ThemeType;
  readonly windows: readonly WindowConfig[];
  readonly panels: readonly PanelConfig[];
  readonly navigation: readonly NavigationItem[];
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** A window in the desktop config */
export interface WindowConfig {
  readonly id: string;
  readonly title: string;
  readonly type: string;
  readonly width: number;
  readonly height: number;
}

/** A panel in the desktop config */
export interface PanelConfig {
  readonly id: string;
  readonly title: string;
  readonly position: string;
  readonly collapsible: boolean;
}

/** A navigation item */
export interface NavigationItem {
  readonly id: string;
  readonly label: string;
  readonly path: string;
  readonly icon: string | null;
}

/** Validation check result */
export interface ValidationCheck {
  readonly category: ValidationCategory;
  readonly name: string;
  readonly verdict: ValidationVerdict;
  readonly message: string;
  readonly details: string | null;
}

/** A validation report */
export interface ValidationReport {
  readonly id: ValidationReportId;
  readonly solutionId: SolutionId;
  readonly checks: readonly ValidationCheck[];
  readonly overallVerdict: ValidationVerdict;
  readonly complianceScore: number;
  readonly securityScore: number;
  readonly privacyScore: number;
  readonly architectureScore: number;
  readonly performanceScore: number;
  readonly valueScore: number;
  readonly validatedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Optimization suggestion */
export interface OptimizationSuggestion {
  readonly dimension: OptimizationDimension;
  readonly description: string;
  readonly estimatedImpact: number;
  readonly action: string;
}

/** An optimization report */
export interface OptimizationReport {
  readonly id: OptimizationReportId;
  readonly solutionId: SolutionId;
  readonly suggestions: readonly OptimizationSuggestion[];
  readonly costBefore: number;
  readonly costAfter: number;
  readonly qualityBefore: number;
  readonly qualityAfter: number;
  readonly optimizedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Deployment plan */
export interface DeploymentPlan {
  readonly id: DeploymentPlanId;
  readonly solutionId: SolutionId;
  readonly mode: DeploymentMode;
  readonly steps: readonly string[];
  readonly rollbackSteps: readonly string[];
  readonly estimatedDowntime: string;
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** A lifecycle state transition record */
export interface LifecycleTransitionRecord {
  readonly id: LifecycleEventId;
  readonly solutionId: SolutionId;
  readonly transition: LifecycleTransition;
  readonly fromState: SolutionState;
  readonly toState: SolutionState;
  readonly reason: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Solution catalog entry */
export interface SolutionCatalogEntry {
  readonly id: CatalogEntryId;
  readonly solutionId: SolutionId;
  readonly name: string;
  readonly description: string;
  readonly version: SemVer;
  readonly category: string;
  readonly state: SolutionState;
  readonly businessDomain: BusinessDomain;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** ═════════════════════════════════════════════════════════════════════
   SOLUTION MANIFEST — the central architectural object
   ═════════════════════════════════════════════════════════════════════ */

export interface SolutionManifest {
  readonly solutionId: SolutionId;
  readonly version: SemVer;
  readonly name: string;
  readonly description: string;
  readonly goal: string;
  readonly expectedValue: string;
  readonly businessDomain: BusinessDomain;
  readonly constraints: readonly string[];
  readonly stakeholders: readonly string[];
  readonly kpis: readonly string[];
  readonly runtimeDependencies: readonly string[];
  readonly capabilityDependencies: readonly string[];
  readonly workflowPackages: readonly WorkflowPackageId[];
  readonly knowledgePackages: readonly KnowledgePackageId[];
  readonly aiConfiguration: AIConfiguration | null;
  readonly desktopConfiguration: DesktopConfiguration | null;
  readonly securityProfile: Readonly<Record<string, unknown>>;
  readonly privacyProfile: Readonly<Record<string, unknown>>;
  readonly complianceStatus: ValidationVerdict;
  readonly marketplaceDependencies: readonly string[];
  readonly evolutionHistory: readonly string[];
  readonly metrics: SolutionMetrics;
  readonly deploymentConfiguration: DeploymentPlan | null;
  readonly license: string;
  readonly author: string;
  readonly digitalSignature: string | null;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Solution metrics snapshot */
export interface SolutionMetrics {
  readonly buildTimeMs: number;
  readonly solutionComplexity: WorkflowComplexity;
  readonly estimatedROI: number;
  readonly estimatedCost: number;
  readonly capabilityReuse: number;
  readonly workflowComplexity: WorkflowComplexity;
  readonly aiCost: number;
  readonly aiLatencyMs: number;
  readonly userSatisfactionPrediction: number;
  readonly constraintScore: number;
  readonly complianceScore: number;
  readonly evolutionScore: number;
}

/** Full Solution Builder metrics */
export interface SolutionBuilderMetrics {
  readonly totalSolutions: number;
  readonly solutionsByState: Readonly<Record<SolutionState, number>>;
  readonly totalGoals: number;
  readonly totalRequirements: number;
  readonly totalCapabilitySelections: number;
  readonly averageBuildTimeMs: number;
  readonly averageValidationScore: number;
  readonly averageROI: number;
  readonly totalCatalogEntries: number;
  readonly lastBuildAt: Timestamp | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

export interface GoalInterpreterConfig {
  readonly maxGoals: number;
  readonly maxSubGoals: number;
  readonly timeoutMs: number;
}

export interface DomainAnalyzerConfig {
  readonly maxDomains: number;
  readonly maxTerminology: number;
  readonly timeoutMs: number;
}

export interface RequirementExtractorConfig {
  readonly maxRequirements: number;
  readonly maxPerType: number;
  readonly timeoutMs: number;
}

export interface SolutionPlannerConfig {
  readonly maxBlueprints: number;
  readonly maxDependencies: number;
  readonly timeoutMs: number;
}

export interface CapabilitySelectorConfig {
  readonly maxSelections: number;
  readonly minReuseTarget: number;
  readonly timeoutMs: number;
}

export interface WorkflowComposerConfig {
  readonly maxPackages: number;
  readonly maxStepsPerPackage: number;
  readonly timeoutMs: number;
}

export interface KnowledgeComposerConfig {
  readonly maxPackages: number;
  readonly maxItemsPerPackage: number;
  readonly timeoutMs: number;
}

export interface AIConfigRuntimeConfig {
  readonly defaultProvider: AIProviderType;
  readonly defaultTemperature: number;
  readonly maxConfigs: number;
  readonly timeoutMs: number;
}

export interface DesktopComposerConfig {
  readonly maxWindows: number;
  readonly maxPanels: number;
  readonly maxNavItems: number;
  readonly timeoutMs: number;
}

export interface SolutionValidatorConfig {
  readonly maxReports: number;
  readonly requiredCategories: readonly ValidationCategory[];
  readonly timeoutMs: number;
}

export interface SolutionOptimizerConfig {
  readonly maxReports: number;
  readonly maxSuggestions: number;
  readonly timeoutMs: number;
}

export interface DeploymentPlannerConfig {
  readonly maxPlans: number;
  readonly maxSteps: number;
  readonly timeoutMs: number;
}

export interface LifecycleManagerConfig {
  readonly maxTransitions: number;
  readonly maxSolutions: number;
  readonly autoArchiveDays: number;
}

export interface SolutionCatalogConfig {
  readonly maxEntries: number;
  readonly maxVersionsPerSolution: number;
  readonly searchTimeoutMs: number;
}

export interface SolutionBuilderRuntimeConfig {
  readonly goalInterpreter: GoalInterpreterConfig;
  readonly domainAnalyzer: DomainAnalyzerConfig;
  readonly requirementExtractor: RequirementExtractorConfig;
  readonly solutionPlanner: SolutionPlannerConfig;
  readonly capabilitySelector: CapabilitySelectorConfig;
  readonly workflowComposer: WorkflowComposerConfig;
  readonly knowledgeComposer: KnowledgeComposerConfig;
  readonly aiConfigRuntime: AIConfigRuntimeConfig;
  readonly desktopComposer: DesktopComposerConfig;
  readonly solutionValidator: SolutionValidatorConfig;
  readonly solutionOptimizer: SolutionOptimizerConfig;
  readonly deploymentPlanner: DeploymentPlannerConfig;
  readonly lifecycleManager: LifecycleManagerConfig;
  readonly solutionCatalog: SolutionCatalogConfig;
  readonly eventBusEnabled: boolean;
}

export const DefaultSolutionBuilderConfig: SolutionBuilderRuntimeConfig = Object.freeze({
  goalInterpreter: Object.freeze({ maxGoals: 1000, maxSubGoals: 20, timeoutMs: 30_000 }),
  domainAnalyzer: Object.freeze({ maxDomains: 100, maxTerminology: 500, timeoutMs: 15_000 }),
  requirementExtractor: Object.freeze({ maxRequirements: 5000, maxPerType: 2000, timeoutMs: 30_000 }),
  solutionPlanner: Object.freeze({ maxBlueprints: 500, maxDependencies: 100, timeoutMs: 60_000 }),
  capabilitySelector: Object.freeze({ maxSelections: 10_000, minReuseTarget: 0.6, timeoutMs: 30_000 }),
  workflowComposer: Object.freeze({ maxPackages: 1000, maxStepsPerPackage: 50, timeoutMs: 30_000 }),
  knowledgeComposer: Object.freeze({ maxPackages: 1000, maxItemsPerPackage: 100, timeoutMs: 20_000 }),
  aiConfigRuntime: Object.freeze({ defaultProvider: AIProviderType.OpenAI, defaultTemperature: 0.7, maxConfigs: 500, timeoutMs: 10_000 }),
  desktopComposer: Object.freeze({ maxWindows: 20, maxPanels: 10, maxNavItems: 50, timeoutMs: 15_000 }),
  solutionValidator: Object.freeze({ maxReports: 1000, requiredCategories: Object.freeze([ValidationCategory.Compliance, ValidationCategory.Security, ValidationCategory.Architecture, ValidationCategory.Value]), timeoutMs: 30_000 }),
  solutionOptimizer: Object.freeze({ maxReports: 500, maxSuggestions: 50, timeoutMs: 30_000 }),
  deploymentPlanner: Object.freeze({ maxPlans: 500, maxSteps: 50, timeoutMs: 20_000 }),
  lifecycleManager: Object.freeze({ maxTransitions: 10_000, maxSolutions: 1000, autoArchiveDays: 365 }),
  solutionCatalog: Object.freeze({ maxEntries: 10_000, maxVersionsPerSolution: 50, searchTimeoutMs: 10_000 }),
  eventBusEnabled: true,
} as SolutionBuilderRuntimeConfig);
