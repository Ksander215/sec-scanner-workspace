/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Types, Enums, Interfaces
 * TASK-AIS-008A.000
 *
 * Core type definitions:
 *   - Branded identifiers (BottleneckId, ImprovementId, ExperimentId, etc.)
 *   - Enums (ConstraintType, ImprovementStatus, ExperimentStatus, etc.)
 *   - Domain entities (Bottleneck, Improvement, Experiment, EvolutionNode, etc.)
 *   - Configuration (EvolutionRuntimeConfig, subsystem configs)
 *
 * Architecture: SOLID, DDD, Event-Driven
 * Conforms to: ARC-001.001, PHI-001.000–PHI-004.000, GOV-008.000
 */

import type { Timestamp, Identifier, SemVer } from '../types/common.js';

export type { Timestamp, SemVer };

// ═══════════════════════════════════════════════════════════════════
// BRANDED IDENTIFIERS
// ═══════════════════════════════════════════════════════════════════

export type BottleneckId = Identifier & { readonly __brand: 'EvolutionBottleneckId' };
export type ImprovementId = Identifier & { readonly __brand: 'EvolutionImprovementId' };
export type ExperimentId = Identifier & { readonly __brand: 'EvolutionExperimentId' };
export type KPIId = Identifier & { readonly __brand: 'EvolutionKPIId' };
export type FeedbackId = Identifier & { readonly __brand: 'EvolutionFeedbackId' };
export type EvolutionNodeId = Identifier & { readonly __brand: 'EvolutionNodeId' };
export type TechDebtId = Identifier & { readonly __brand: 'EvolutionTechDebtId' };
export type RecommendationId = Identifier & { readonly __brand: 'EvolutionRecommendationId' };
export type EvolutionSessionId = Identifier & { readonly __brand: 'EvolutionSessionId' };
export type RoadmapId = Identifier & { readonly __brand: 'EvolutionRoadmapId' };
export type LearningRecordId = Identifier & { readonly __brand: 'EvolutionLearningRecordId' };

function brandBottleneckId(id: string): BottleneckId { return id as BottleneckId; }
function brandImprovementId(id: string): ImprovementId { return id as ImprovementId; }
function brandExperimentId(id: string): ExperimentId { return id as ExperimentId; }
function brandKPIId(id: string): KPIId { return id as KPIId; }
function brandFeedbackId(id: string): FeedbackId { return id as FeedbackId; }
function brandEvolutionNodeId(id: string): EvolutionNodeId { return id as EvolutionNodeId; }
function brandTechDebtId(id: string): TechDebtId { return id as TechDebtId; }
function brandRecommendationId(id: string): RecommendationId { return id as RecommendationId; }
function brandEvolutionSessionId(id: string): EvolutionSessionId { return id as EvolutionSessionId; }
function brandRoadmapId(id: string): RoadmapId { return id as RoadmapId; }
function brandLearningRecordId(id: string): LearningRecordId { return id as LearningRecordId; }

export {
  brandBottleneckId, brandImprovementId, brandExperimentId, brandKPIId,
  brandFeedbackId, brandEvolutionNodeId, brandTechDebtId, brandRecommendationId,
  brandEvolutionSessionId, brandRoadmapId, brandLearningRecordId,
};

// ═══════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════

/** Types of constraints that limit value creation (PHI-003.000) */
export enum ConstraintType {
  Performance = 'Performance',
  Quality = 'Quality',
  UX = 'UX',
  Knowledge = 'Knowledge',
  Memory = 'Memory',
  Reasoning = 'Reasoning',
  Architecture = 'Architecture',
  DeveloperExperience = 'DeveloperExperience',
  Documentation = 'Documentation',
  Marketing = 'Marketing',
  Sales = 'Sales',
  Business = 'Business',
  Learning = 'Learning',
}

/** Scope at which a bottleneck is detected */
export enum BottleneckScope {
  Platform = 'Platform',
  Runtime = 'Runtime',
  Capability = 'Capability',
  Workflow = 'Workflow',
  User = 'User',
}

/** Bottleneck severity */
export enum BottleneckSeverity {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

/** Improvement status lifecycle */
export enum ImprovementStatus {
  Proposed = 'Proposed',
  Planned = 'Planned',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Failed = 'Failed',
  Rejected = 'Rejected',
  RolledBack = 'RolledBack',
}

/** Experiment status */
export enum ExperimentStatus {
  Proposed = 'Proposed',
  Running = 'Running',
  Completed = 'Completed',
  Failed = 'Failed',
  Cancelled = 'Cancelled',
  Inconclusive = 'Inconclusive',
}

/** KPI measurement direction */
export enum KPDirection {
  HigherIsBetter = 'HigherIsBetter',
  LowerIsBetter = 'LowerIsBetter',
  TargetIsOptimal = 'TargetIsOptimal',
}

/** Feedback source */
export enum FeedbackSource {
  User = 'User',
  Developer = 'Developer',
  Logs = 'Logs',
  Metrics = 'Metrics',
  AI = 'AI',
  Workflow = 'Workflow',
  Errors = 'Errors',
  Conversation = 'Conversation',
  Capability = 'Capability',
}

/** Feedback sentiment */
export enum FeedbackSentiment {
  Positive = 'Positive',
  Negative = 'Negative',
  Neutral = 'Neutral',
  Critical = 'Critical',
}

/** Learning outcome — what happened as a result of an improvement */
export enum LearningOutcome {
  Improved = 'Improved',
  Worsened = 'Worsened',
  NoChange = 'NoChange',
  UnexpectedSideEffect = 'UnexpectedSideEffect',
}

/** Technical debt priority */
export enum TechDebtPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

/** Evolution Runtime lifecycle state */
export enum EvolutionState {
  Uninitialized = 'Uninitialized',
  Initializing = 'Initializing',
  Ready = 'Ready',
  Analyzing = 'Analyzing',
  Planning = 'Planning',
  Evolving = 'Evolving',
  Stopping = 'Stopping',
  Stopped = 'Stopped',
  Error = 'Error',
}

/** Architecture optimization suggestion type */
export enum ArchOptimizationType {
  Simplify = 'Simplify',
  RemoveLayer = 'RemoveLayer',
  MergeRuntimes = 'MergeRuntimes',
  SplitResponsibility = 'SplitResponsibility',
  ReduceCoupling = 'ReduceCoupling',
  ImproveCohesion = 'ImproveCohesion',
}

/** Roadmap item status */
export enum RoadmapItemStatus {
  Pending = 'Pending',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Deferred = 'Deferred',
  Cancelled = 'Cancelled',
}

/** Value dimension for PHI-002.000 alignment */
export enum ValueDimension {
  UserValue = 'UserValue',
  PlatformValue = 'PlatformValue',
  BusinessValue = 'BusinessValue',
  DeveloperValue = 'DeveloperValue',
  KnowledgeValue = 'KnowledgeValue',
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES
// ═══════════════════════════════════════════════════════════════════

/** A detected bottleneck — the weakest link limiting value creation */
export interface Bottleneck {
  readonly id: BottleneckId;
  readonly name: string;
  readonly description: string;
  readonly constraintType: ConstraintType;
  readonly scope: BottleneckScope;
  readonly severity: BottleneckSeverity;
  readonly targetRuntime: string;
  readonly targetCapability: string | null;
  readonly targetWorkflow: string | null;
  readonly evidence: readonly string[];
  readonly detectedAt: Timestamp;
  readonly resolvedAt: Timestamp | null;
  readonly relatedBottleneckIds: readonly BottleneckId[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** A constraint analysis result */
export interface ConstraintAnalysis {
  readonly id: EvolutionSessionId;
  readonly bottleneckId: BottleneckId;
  readonly constraintType: ConstraintType;
  readonly rootCause: string;
  readonly impactDescription: string;
  readonly affectedRuntimes: readonly string[];
  readonly affectedCapabilities: readonly string[];
  readonly suggestedImprovements: readonly ImprovementId[];
  readonly analyzedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** An improvement recommendation */
export interface Improvement {
  readonly id: ImprovementId;
  readonly name: string;
  readonly description: string;
  readonly status: ImprovementStatus;
  readonly bottleneckId: BottleneckId | null;
  readonly constraintType: ConstraintType;
  readonly valueScore: number;
  readonly impactScore: number;
  readonly costScore: number;
  readonly riskScore: number;
  readonly urgencyScore: number;
  readonly constraintWeight: number;
  readonly priority: number;
  readonly valueDimension: ValueDimension;
  readonly targetRuntime: string | null;
  readonly targetCapability: string | null;
  readonly estimatedEffort: string;
  readonly proposedAt: Timestamp;
  readonly startedAt: Timestamp | null;
  readonly completedAt: Timestamp | null;
  readonly evidence: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Value analysis for an improvement */
export interface ValueAnalysis {
  readonly improvementId: ImprovementId;
  readonly valueCreated: string;
  readonly valueFor: string;
  readonly valueMagnitude: number;
  readonly valueDimension: ValueDimension;
  readonly beforeMetrics: Readonly<Record<string, number>>;
  readonly afterMetrics: Readonly<Record<string, number>>;
  readonly valueScore: number;
  readonly analyzedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Opportunity cost analysis */
export interface OpportunityCost {
  readonly improvementId: ImprovementId;
  readonly foregoneImprovements: readonly ImprovementId[];
  readonly foregoneValue: number;
  readonly foregoneImpact: number;
  readonly netBenefit: number;
  readonly analyzedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** An A/B experiment */
export interface Experiment {
  readonly id: ExperimentId;
  readonly name: string;
  readonly description: string;
  readonly status: ExperimentStatus;
  readonly improvementId: ImprovementId;
  readonly variantA: string;
  readonly variantB: string;
  readonly metricName: string;
  readonly variantAResult: number | null;
  readonly variantBResult: number | null;
  readonly winner: 'A' | 'B' | null;
  readonly confidence: number;
  readonly startedAt: Timestamp | null;
  readonly completedAt: Timestamp | null;
  readonly proposedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** A KPI definition */
export interface KPIDefinition {
  readonly id: KPIId;
  readonly name: string;
  readonly description: string;
  readonly unit: string;
  readonly direction: KPDirection;
  readonly target: number | null;
  readonly currentValue: number;
  readonly history: readonly KPIMeasurement[];
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** A single KPI measurement */
export interface KPIMeasurement {
  readonly value: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** KPI before/after comparison */
export interface KPIComparison {
  readonly kpiId: KPIId;
  readonly kpiName: string;
  readonly beforeValue: number;
  readonly afterValue: number;
  readonly change: number;
  readonly changePercent: number;
  readonly direction: KPDirection;
  readonly improved: boolean;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** A piece of feedback */
export interface FeedbackEntry {
  readonly id: FeedbackId;
  readonly source: FeedbackSource;
  readonly sentiment: FeedbackSentiment;
  readonly content: string;
  readonly relatedBottleneckId: BottleneckId | null;
  readonly relatedImprovementId: ImprovementId | null;
  readonly receivedAt: Timestamp;
  readonly processed: boolean;
  readonly processedAt: Timestamp | null;
  readonly extractedInsights: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** A learning record */
export interface LearningRecord {
  readonly id: LearningRecordId;
  readonly improvementId: ImprovementId | null;
  readonly experimentId: ExperimentId | null;
  readonly action: string;
  readonly outcome: LearningOutcome;
  readonly lesson: string;
  readonly context: string;
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** An evolution graph node */
export interface EvolutionNode {
  readonly id: EvolutionNodeId;
  readonly type: 'improvement' | 'experiment' | 'bottleneck_resolved' | 'tech_debt_fixed' | 'architecture_change';
  readonly title: string;
  readonly description: string;
  readonly relatedIds: readonly string[];
  readonly parentId: EvolutionNodeId | null;
  readonly childIds: readonly EvolutionNodeId[];
  readonly valueImpact: number;
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** An edge in the evolution graph */
export interface EvolutionEdge {
  readonly from: EvolutionNodeId;
  readonly to: EvolutionNodeId;
  readonly label: string;
  readonly weight: number;
  readonly createdAt: Timestamp;
}

/** A technical debt item */
export interface TechDebtItem {
  readonly id: TechDebtId;
  readonly name: string;
  readonly description: string;
  readonly priority: TechDebtPriority;
  readonly estimatedCost: number;
  readonly impact: number;
  readonly targetModule: string;
  readonly targetFile: string | null;
  readonly createdAt: Timestamp;
  readonly resolvedAt: Timestamp | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** An architecture optimization suggestion */
export interface ArchOptimizationSuggestion {
  readonly id: EvolutionNodeId;
  readonly type: ArchOptimizationType;
  readonly title: string;
  readonly description: string;
  readonly affectedModules: readonly string[];
  readonly estimatedImpact: number;
  readonly estimatedEffort: number;
  readonly risk: number;
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** A roadmap item */
export interface RoadmapItem {
  readonly id: ImprovementId;
  readonly improvementId: ImprovementId;
  readonly name: string;
  readonly priority: number;
  readonly status: RoadmapItemStatus;
  readonly order: number;
  readonly estimatedEffort: string;
  readonly valueScore: number;
  readonly dependsOn: readonly ImprovementId[];
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** A full evolution roadmap */
export interface EvolutionRoadmap {
  readonly id: RoadmapId;
  readonly title: string;
  readonly description: string;
  readonly items: readonly RoadmapItem[];
  readonly totalValue: number;
  readonly totalEffort: string;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Evolution metrics snapshot */
export interface EvolutionMetrics {
  readonly totalBottlenecksDetected: number;
  readonly activeBottlenecks: number;
  readonly resolvedBottlenecks: number;
  readonly totalImprovements: number;
  readonly activeImprovements: number;
  readonly completedImprovements: number;
  readonly failedImprovements: number;
  readonly totalExperiments: number;
  readonly successfulExperiments: number;
  readonly totalKPIs: number;
  readonly kpisImproved: number;
  readonly totalFeedback: number;
  readonly processedFeedback: number;
  readonly totalLearningRecords: number;
  readonly evolutionGraphNodes: number;
  readonly techDebtItems: number;
  readonly resolvedTechDebt: number;
  readonly totalTechDebtCost: number;
  readonly averageImprovementPriority: number;
  readonly lastAnalysisAt: Timestamp | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

export interface BottleneckDetectorConfig {
  readonly maxBottlenecks: number;
  readonly scanIntervalMs: number;
  readonly minEvidenceItems: number;
}

export interface ConstraintAnalyzerConfig {
  readonly maxAnalysisDepth: number;
  readonly analysisTimeoutMs: number;
}

export interface ImprovementEngineConfig {
  readonly maxImprovements: number;
  readonly maxActiveImprovements: number;
  readonly autoApproveThreshold: number;
}

export interface ValueAnalyzerConfig {
  readonly minValueScore: number;
  readonly maxValueScore: number;
  readonly valueDimensions: readonly ValueDimension[];
}

export interface OpportunityCostConfig {
  readonly maxForegoneItems: number;
  readonly minNetBenefit: number;
}

export interface OptimizationPlannerConfig {
  readonly maxRoadmapItems: number;
  readonly maxConcurrentImprovements: number;
  readonly replanIntervalMs: number;
}

export interface ExperimentConfig {
  readonly maxExperiments: number;
  readonly maxConcurrentExperiments: number;
  readonly minConfidence: number;
  readonly experimentTimeoutMs: number;
}

export interface KPIRuntimeConfig {
  readonly maxKPIs: number;
  readonly maxHistoryLength: number;
  readonly aggregationWindowMs: number;
}

export interface FeedbackCollectorConfig {
  readonly maxFeedback: number;
  readonly autoProcessEnabled: boolean;
  readonly processingTimeoutMs: number;
}

export interface LearningLoopConfig {
  readonly maxLearningRecords: number;
  readonly similarityThreshold: number;
  readonly retentionPeriodMs: number;
}

export interface EvolutionGraphConfig {
  readonly maxNodes: number;
  readonly maxDepth: number;
}

export interface ArchitectureOptimizerConfig {
  readonly maxSuggestions: number;
  readonly analysisTimeoutMs: number;
}

export interface TechDebtConfig {
  readonly maxItems: number;
  readonly depreciationRate: number;
}

export interface PrioritizerConfig {
  readonly valueWeight: number;
  readonly impactWeight: number;
  readonly constraintWeight: number;
  readonly costWeight: number;
  readonly riskWeight: number;
  readonly urgencyWeight: number;
}

export interface EvolutionRuntimeConfig {
  readonly bottleneckDetector: BottleneckDetectorConfig;
  readonly constraintAnalyzer: ConstraintAnalyzerConfig;
  readonly improvementEngine: ImprovementEngineConfig;
  readonly valueAnalyzer: ValueAnalyzerConfig;
  readonly opportunityCost: OpportunityCostConfig;
  readonly optimizationPlanner: OptimizationPlannerConfig;
  readonly experiment: ExperimentConfig;
  readonly kpi: KPIRuntimeConfig;
  readonly feedbackCollector: FeedbackCollectorConfig;
  readonly learningLoop: LearningLoopConfig;
  readonly evolutionGraph: EvolutionGraphConfig;
  readonly architectureOptimizer: ArchitectureOptimizerConfig;
  readonly techDebt: TechDebtConfig;
  readonly prioritizer: PrioritizerConfig;
  readonly eventBusEnabled: boolean;
}

export const DefaultEvolutionRuntimeConfig: EvolutionRuntimeConfig = Object.freeze({
  bottleneckDetector: Object.freeze({
    maxBottlenecks: 1000,
    scanIntervalMs: 60_000,
    minEvidenceItems: 1,
  }),
  constraintAnalyzer: Object.freeze({
    maxAnalysisDepth: 5,
    analysisTimeoutMs: 30_000,
  }),
  improvementEngine: Object.freeze({
    maxImprovements: 5000,
    maxActiveImprovements: 50,
    autoApproveThreshold: 90,
  }),
  valueAnalyzer: Object.freeze({
    minValueScore: 0,
    maxValueScore: 100,
    valueDimensions: Object.freeze([
      ValueDimension.UserValue,
      ValueDimension.PlatformValue,
      ValueDimension.BusinessValue,
      ValueDimension.DeveloperValue,
      ValueDimension.KnowledgeValue,
    ]),
  }),
  opportunityCost: Object.freeze({
    maxForegoneItems: 100,
    minNetBenefit: 0,
  }),
  optimizationPlanner: Object.freeze({
    maxRoadmapItems: 200,
    maxConcurrentImprovements: 10,
    replanIntervalMs: 300_000,
  }),
  experiment: Object.freeze({
    maxExperiments: 1000,
    maxConcurrentExperiments: 5,
    minConfidence: 0.8,
    experimentTimeoutMs: 300_000,
  }),
  kpi: Object.freeze({
    maxKPIs: 500,
    maxHistoryLength: 10_000,
    aggregationWindowMs: 3_600_000,
  }),
  feedbackCollector: Object.freeze({
    maxFeedback: 10_000,
    autoProcessEnabled: true,
    processingTimeoutMs: 10_000,
  }),
  learningLoop: Object.freeze({
    maxLearningRecords: 10_000,
    similarityThreshold: 0.8,
    retentionPeriodMs: 7 * 24 * 60 * 60 * 1000,
  }),
  evolutionGraph: Object.freeze({
    maxNodes: 10_000,
    maxDepth: 20,
  }),
  architectureOptimizer: Object.freeze({
    maxSuggestions: 100,
    analysisTimeoutMs: 60_000,
  }),
  techDebt: Object.freeze({
    maxItems: 1000,
    depreciationRate: 0.1,
  }),
  prioritizer: Object.freeze({
    valueWeight: 1.0,
    impactWeight: 1.0,
    constraintWeight: 1.5,
    costWeight: 1.0,
    riskWeight: 1.0,
    urgencyWeight: 0.8,
  }),
  eventBusEnabled: true,
} as EvolutionRuntimeConfig);
