/**
 * Security Intelligence Recommendation Engine — Type Definitions
 *
 * All types, interfaces, and enums for the Recommendation Engine.
 * This module transforms analysis results into a ranked remediation plan.
 *
 * Design principles:
 * - All models are immutable and deeply frozen
 * - Branded IDs prevent accidental mixing with other domain IDs
 * - All calculations are fully deterministic (no probabilistic algorithms)
 * - Uses Impact Analysis instead of re-computing effects
 * - Rule Registry is extensible, not hardcoded
 * - No mutations to existing modules
 */

import type { FindingId, AssetId } from '../../normalization/types/index.ts';
import type { CorrelationGroupId } from '../../correlation/types/index.ts';
import type { RiskAssessmentId, RiskLevel } from '../../risk/types/index.ts';
import type { AttackPathId } from '../../attack-path/types/index.ts';
import type { ImpactAnalysisId, RemediationCandidateId, MitigationScenarioType } from '../../impact/types/index.ts';

// ─── Branded ID Types ────────────────────────────────────────

/** Branded string for Recommendation IDs */
export type RecommendationId = string & { readonly __brand: 'RecommendationId' };

/** Branded string for RecommendationGroup IDs */
export type RecommendationGroupId = string & { readonly __brand: 'RecommendationGroupId' };

/** Branded string for RecommendationAction IDs */
export type RecommendationActionId = string & { readonly __brand: 'RecommendationActionId' };

/** Branded string for RemediationPlan IDs */
export type RemediationPlanId = string & { readonly __brand: 'RemediationPlanId' };

/** Branded string for RemediationTask IDs */
export type RemediationTaskId = string & { readonly __brand: 'RemediationTaskId' };

/** Branded string for RecommendationEvidence IDs */
export type RecommendationEvidenceId = string & { readonly __brand: 'RecommendationEvidenceId' };

/** Branded string for RecommendationStatistics IDs */
export type RecommendationStatisticsId = string & { readonly __brand: 'RecommendationStatisticsId' };

/** Branded string for RecommendationCost IDs */
export type RecommendationCostId = string & { readonly __brand: 'RecommendationCostId' };

/** Branded string for RecommendationBenefit IDs */
export type RecommendationBenefitId = string & { readonly __brand: 'RecommendationBenefitId' };

/** Brand a plain string as a RecommendationId */
export function brandRecommendationId(id: string): RecommendationId {
  return id as RecommendationId;
}

/** Brand a plain string as a RecommendationGroupId */
export function brandRecommendationGroupId(id: string): RecommendationGroupId {
  return id as RecommendationGroupId;
}

/** Brand a plain string as a RecommendationActionId */
export function brandRecommendationActionId(id: string): RecommendationActionId {
  return id as RecommendationActionId;
}

/** Brand a plain string as a RemediationPlanId */
export function brandRemediationPlanId(id: string): RemediationPlanId {
  return id as RemediationPlanId;
}

/** Brand a plain string as a RemediationTaskId */
export function brandRemediationTaskId(id: string): RemediationTaskId {
  return id as RemediationTaskId;
}

/** Brand a plain string as a RecommendationEvidenceId */
export function brandRecommendationEvidenceId(id: string): RecommendationEvidenceId {
  return id as RecommendationEvidenceId;
}

/** Brand a plain string as a RecommendationStatisticsId */
export function brandRecommendationStatisticsId(id: string): RecommendationStatisticsId {
  return id as RecommendationStatisticsId;
}

/** Brand a plain string as a RecommendationCostId */
export function brandRecommendationCostId(id: string): RecommendationCostId {
  return id as RecommendationCostId;
}

/** Brand a plain string as a RecommendationBenefitId */
export function brandRecommendationBenefitId(id: string): RecommendationBenefitId {
  return id as RecommendationBenefitId;
}

// ─── Utility Types ───────────────────────────────────────────

/** ISO-8601 timestamp string */
export type Timestamp = string;

/** Arbitrary key-value metadata */
export type Metadata = Readonly<Record<string, string | number | boolean | null>>;

// ─── Recommendation Rule Type ────────────────────────────────

/**
 * Types of remediation rules that can generate recommendations.
 * Each rule maps to a specific remediation action type.
 */
export enum RecommendationRuleType {
  Patch = 'Patch',
  UpgradeDependency = 'UpgradeDependency',
  ConfigurationChange = 'ConfigurationChange',
  DisableEndpoint = 'DisableEndpoint',
  NetworkIsolation = 'NetworkIsolation',
  SecretRotation = 'SecretRotation',
  MFAEnrollment = 'MFAEnrollment',
  WAFRule = 'WAFRule',
  RateLimiting = 'RateLimiting',
  CSP = 'CSP',
  HSTS = 'HSTS',
  InputValidation = 'InputValidation',
  AccessControl = 'AccessControl',
  LoggingMonitoring = 'LoggingMonitoring',
}

/** All recommendation rule type values */
export const ALL_RECOMMENDATION_RULE_TYPES: readonly RecommendationRuleType[] =
  Object.values(RecommendationRuleType) as RecommendationRuleType[];

// ─── Recommendation Source ───────────────────────────────────

/**
 * Where a recommendation originates from.
 * Each source maps to a different upstream analysis engine.
 */
export enum RecommendationSource {
  CanonicalFinding = 'CanonicalFinding',
  CorrelationGroup = 'CorrelationGroup',
  RiskAssessment = 'RiskAssessment',
  AttackPath = 'AttackPath',
  ImpactAnalysis = 'ImpactAnalysis',
}

/** All recommendation source values */
export const ALL_RECOMMENDATION_SOURCES: readonly RecommendationSource[] =
  Object.values(RecommendationSource) as RecommendationSource[];

// ─── Planning Strategy ──────────────────────────────────────

/**
 * Strategy for building a remediation plan.
 * Each strategy optimizes for a different objective.
 */
export enum PlanningStrategy {
  MaximumRiskReduction = 'MaximumRiskReduction',
  MinimumCost = 'MinimumCost',
  QuickWins = 'QuickWins',
  ComplianceFirst = 'ComplianceFirst',
  Balanced = 'Balanced',
}

/** All planning strategy values */
export const ALL_PLANNING_STRATEGIES: readonly PlanningStrategy[] =
  Object.values(PlanningStrategy) as PlanningStrategy[];

// ─── Conflict Type ──────────────────────────────────────────

/**
 * Types of conflicts between recommendations.
 */
export enum ConflictType {
  /** Recommendations that contradict each other */
  Contradiction = 'Contradiction',
  /** Duplicate recommendations targeting the same issue */
  Duplicate = 'Duplicate',
  /** One recommendation depends on another being applied first */
  Dependency = 'Dependency',
  /** Required ordering of actions */
  RequiredOrder = 'RequiredOrder',
}

/** All conflict type values */
export const ALL_CONFLICT_TYPES: readonly ConflictType[] =
  Object.values(ConflictType) as ConflictType[];

// ─── Action Status ──────────────────────────────────────────

/**
 * Status of a remediation action within a plan.
 */
export enum ActionStatus {
  Pending = 'Pending',
  Accepted = 'Accepted',
  Rejected = 'Rejected',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Skipped = 'Skipped',
}

/** All action status values */
export const ALL_ACTION_STATUSES: readonly ActionStatus[] =
  Object.values(ActionStatus) as ActionStatus[];

// ─── Severity Classification ────────────────────────────────

/**
 * Severity of a recommendation (derived from source risk).
 */
export enum RecommendationSeverity {
  Critical = 'Critical',
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
  Informational = 'Informational',
}

/** All recommendation severity values */
export const ALL_RECOMMENDATION_SEVERITIES: readonly RecommendationSeverity[] =
  Object.values(RecommendationSeverity) as RecommendationSeverity[];

// ─── Recommendation ─────────────────────────────────────────

/**
 * A single remediation recommendation.
 * Generated from an analysis source, enriched with ranking,
 * cost/benefit analysis, and explainability hooks.
 */
export interface Recommendation {
  readonly id: RecommendationId;
  readonly ruleType: RecommendationRuleType;
  readonly source: RecommendationSource;
  readonly sourceId: string;                    // ID of the source entity
  readonly title: string;
  readonly description: string;
  readonly severity: RecommendationSeverity;
  readonly targetId: string;                    // What to remediate
  readonly targetType: string;                  // Type of the target entity
  readonly targetLabel: string;
  readonly findingIds: readonly FindingId[];
  readonly correlationGroupIds: readonly CorrelationGroupId[];
  readonly attackPathIds: readonly AttackPathId[];
  readonly impactAnalysisId: ImpactAnalysisId | null;
  readonly cost: RecommendationCost;
  readonly benefit: RecommendationBenefit;
  readonly evidence: readonly RecommendationEvidence[];
  readonly ranking: RecommendationRanking;
  readonly explainability: ExplainabilityData;
  readonly status: ActionStatus;
  readonly createdAt: Timestamp;
  readonly metadata: Metadata;
}

// ─── Recommendation Group ───────────────────────────────────

/**
 * Group of related recommendations.
 * Groups recommendations that address the same root cause
 * or affect the same asset/application.
 */
export interface RecommendationGroup {
  readonly id: RecommendationGroupId;
  readonly name: string;
  readonly description: string;
  readonly recommendationIds: readonly RecommendationId[];
  readonly dominantRuleType: RecommendationRuleType;
  readonly dominantSeverity: RecommendationSeverity;
  readonly targetAssetId: AssetId | null;
  readonly aggregateRiskReduction: number;      // 0.0–1.0
  readonly aggregateCost: number;               // 0.0–1.0
  readonly metadata: Metadata;
}

// ─── Recommendation Action ──────────────────────────────────

/**
 * An actionable step within a remediation plan.
 * Each action corresponds to one recommendation
 * with execution details and ordering.
 */
export interface RecommendationAction {
  readonly id: RecommendationActionId;
  readonly recommendationId: RecommendationId;
  readonly planId: RemediationPlanId;
  readonly order: number;                       // Execution order in the plan
  readonly status: ActionStatus;
  readonly dependsOn: readonly RecommendationActionId[]; // Actions that must complete first
  readonly blocks: readonly RecommendationActionId[];    // Actions blocked by this one
  readonly estimatedEffortHours: number;
  readonly actualEffortHours: number | null;
  readonly startedAt: Timestamp | null;
  readonly completedAt: Timestamp | null;
  readonly metadata: Metadata;
}

// ─── Remediation Plan ───────────────────────────────────────

/**
 * A complete remediation plan with ordered actions.
 * Built from ranked recommendations using a planning strategy.
 */
export interface RemediationPlan {
  readonly id: RemediationPlanId;
  readonly name: string;
  readonly description: string;
  readonly strategy: PlanningStrategy;
  readonly actions: readonly RecommendationAction[];
  readonly recommendations: readonly Recommendation[];
  readonly groups: readonly RecommendationGroup[];
  readonly conflicts: readonly Conflict[];
  readonly totalEstimatedCost: number;          // 0.0–1.0, normalized
  readonly totalEstimatedEffortHours: number;
  readonly totalRiskReduction: number;          // 0.0–1.0
  readonly totalAttackSurfaceReduction: number; // 0.0–1.0
  readonly coverageScore: number;               // 0.0–1.0
  readonly priority: number;                    // 0–100, plan priority score
  readonly createdAt: Timestamp;
  readonly metadata: Metadata;
}

// ─── Remediation Task ───────────────────────────────────────

/**
 * A concrete task derived from a recommendation action.
 * Represents a single unit of work in the remediation workflow.
 */
export interface RemediationTask {
  readonly id: RemediationTaskId;
  readonly actionId: RecommendationActionId;
  readonly recommendationId: RecommendationId;
  readonly title: string;
  readonly description: string;
  readonly assignee: string | null;
  readonly dueDate: Timestamp | null;
  readonly status: ActionStatus;
  readonly dependencies: readonly RemediationTaskId[];
  readonly verificationSteps: readonly string[];
  readonly rollbackSteps: readonly string[];
  readonly metadata: Metadata;
}

// ─── Recommendation Evidence ────────────────────────────────

/**
 * Evidence supporting a recommendation.
 * Links back to the source data that triggered the recommendation.
 */
export interface RecommendationEvidence {
  readonly id: RecommendationEvidenceId;
  readonly recommendationId: RecommendationId;
  readonly sourceType: RecommendationSource;
  readonly sourceId: string;
  readonly field: string;
  readonly value: string | number | boolean | null;
  readonly confidence: number;                  // 0.0–1.0
  readonly description: string;
}

// ─── Recommendation Statistics ──────────────────────────────

/**
 * Statistics about the recommendation engine operation.
 */
export interface RecommendationStatistics {
  readonly id: RecommendationStatisticsId;
  readonly totalRecommendations: number;
  readonly totalGroups: number;
  readonly totalPlans: number;
  readonly totalActions: number;
  readonly totalConflicts: number;
  readonly averageRiskReduction: number;
  readonly averageCost: number;
  readonly averageBenefit: number;
  readonly coverageScore: number;
  readonly ruleTypeDistribution: Readonly<Record<RecommendationRuleType, number>>;
  readonly sourceDistribution: Readonly<Record<RecommendationSource, number>>;
  readonly severityDistribution: Readonly<Record<RecommendationSeverity, number>>;
  readonly statusDistribution: Readonly<Record<ActionStatus, number>>;
  readonly collectedAt: Timestamp;
}

// ─── Recommendation Cost ────────────────────────────────────

/**
 * Cost estimation for implementing a recommendation.
 */
export interface RecommendationCost {
  readonly id: RecommendationCostId;
  readonly recommendationId: RecommendationId;
  readonly implementationCost: number;          // 0.0–1.0, relative
  readonly operationalCost: number;             // 0.0–1.0, relative ongoing cost
  readonly effortHours: number;                 // Estimated person-hours
  readonly complexity: number;                  // 0.0–1.0
  readonly disruption: number;                  // 0.0–1.0, business disruption
  readonly totalCost: number;                   // 0.0–1.0, composite
  readonly metadata: Metadata;
}

// ─── Recommendation Benefit ─────────────────────────────────

/**
 * Benefit estimation for implementing a recommendation.
 */
export interface RecommendationBenefit {
  readonly id: RecommendationBenefitId;
  readonly recommendationId: RecommendationId;
  readonly riskReduction: number;               // 0.0–1.0
  readonly attackPathElimination: number;       // 0.0–1.0
  readonly complianceImprovement: number;       // 0.0–1.0
  readonly securityScoreImprovement: number;    // 0–100, points
  readonly confidenceImprovement: number;       // 0.0–1.0
  readonly coverageImprovement: number;         // 0.0–1.0
  readonly totalBenefit: number;                // 0.0–1.0, composite
  readonly metadata: Metadata;
}

// ─── Recommendation Ranking ─────────────────────────────────

/**
 * Ranking data for a recommendation.
 * Used to determine priority order.
 */
export interface RecommendationRanking {
  readonly overallScore: number;                // 0.0–1.0, composite
  readonly riskReductionScore: number;          // 0.0–1.0
  readonly attackPathEliminationScore: number;  // 0.0–1.0
  readonly costScore: number;                   // 0.0–1.0 (inverted: lower cost = higher score)
  readonly confidenceScore: number;             // 0.0–1.0
  readonly businessImpactScore: number;         // 0.0–1.0
  readonly fixComplexityScore: number;          // 0.0–1.0 (inverted)
  readonly coverageScore: number;               // 0.0–1.0
  readonly timeToRemediateScore: number;        // 0.0–1.0 (inverted: faster = higher score)
  readonly rank: number;                        // 1-based rank
}

// ─── Explainability Data ────────────────────────────────────

/**
 * Structured explainability hooks for the future Explainability Engine.
 * Contains data only — no text explanations.
 */
export interface ExplainabilityData {
  readonly whyGenerated: readonly string[];     // Rule IDs that triggered this
  readonly affectedFindings: readonly FindingId[];
  readonly affectedAttackPaths: readonly AttackPathId[];
  readonly expectedRiskDelta: number;           // 0.0–1.0, expected reduction
  readonly expectedScoreDelta: number;          // 0–100, expected improvement
  readonly confidenceReasoning: Readonly<Record<string, number>>; // Factor → weight
}

// ─── Conflict ───────────────────────────────────────────────

/**
 * A conflict between recommendations.
 */
export interface Conflict {
  readonly id: string;
  readonly type: ConflictType;
  readonly recommendationIdA: RecommendationId;
  readonly recommendationIdB: RecommendationId;
  readonly description: string;
  readonly resolution: ConflictResolution | null;
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly metadata: Metadata;
}

// ─── Conflict Resolution ────────────────────────────────────

/**
 * Resolution for a conflict between recommendations.
 */
export interface ConflictResolution {
  readonly strategy: 'prefer-a' | 'prefer-b' | 'merge' | 'sequence' | 'skip';
  readonly winningId: RecommendationId | null;
  readonly reason: string;
  readonly resultingActions: readonly RecommendationActionId[];
}

// ─── Rule Interface ─────────────────────────────────────────

/**
 * Interface for a pluggable recommendation rule.
 * Each rule determines if a recommendation should be generated
 * for a given source and what the recommendation should contain.
 */
export interface RecommendationRule {
  readonly id: string;
  readonly type: RecommendationRuleType;
  readonly name: string;
  readonly description: string;
  readonly priority: number;                    // 0.0–1.0, rule priority
  readonly appliesTo: readonly RecommendationSource[];
  evaluate(context: RuleContext): RuleResult | null;
}

/** Context passed to a rule for evaluation */
export interface RuleContext {
  readonly finding?: import('../../normalization/types/index.ts').CanonicalFinding;
  readonly correlationGroup?: import('../../correlation/types/index.ts').CorrelationGroup;
  readonly riskAssessment?: import('../../risk/types/index.ts').RiskAssessment;
  readonly attackPath?: import('../../attack-path/types/index.ts').AttackPath;
  readonly impactAnalysis?: import('../../impact/types/index.ts').ImpactAnalysis;
}

/** Result from evaluating a rule */
export interface RuleResult {
  readonly ruleType: RecommendationRuleType;
  readonly source: RecommendationSource;
  readonly sourceId: string;
  readonly title: string;
  readonly description: string;
  readonly severity: RecommendationSeverity;
  readonly targetId: string;
  readonly targetType: string;
  readonly targetLabel: string;
  readonly findingIds: readonly FindingId[];
  readonly correlationGroupIds: readonly CorrelationGroupId[];
  readonly attackPathIds: readonly AttackPathId[];
  readonly costEstimate: {
    readonly implementationCost: number;
    readonly operationalCost: number;
    readonly effortHours: number;
    readonly complexity: number;
    readonly disruption: number;
  };
  readonly benefitEstimate: {
    readonly riskReduction: number;
    readonly attackPathElimination: number;
    readonly complianceImprovement: number;
    readonly securityScoreImprovement: number;
    readonly confidenceImprovement: number;
    readonly coverageImprovement: number;
  };
  readonly evidence: readonly {
    readonly sourceType: RecommendationSource;
    readonly sourceId: string;
    readonly field: string;
    readonly value: string | number | boolean | null;
    readonly confidence: number;
    readonly description: string;
  }[];
  readonly explainability: {
    readonly whyGenerated: readonly string[];
    readonly affectedFindings: readonly FindingId[];
    readonly affectedAttackPaths: readonly AttackPathId[];
    readonly expectedRiskDelta: number;
    readonly expectedScoreDelta: number;
    readonly confidenceReasoning: Readonly<Record<string, number>>;
  };
}

// ─── Engine Configuration ───────────────────────────────────

/** Configuration for the Recommendation Engine */
export interface RecommendationEngineConfig {
  readonly engineId: string;
  readonly enableCaching: boolean;
  readonly cacheSize: number;
  readonly cacheTtlMs: number;
  readonly batchSize: number;
  readonly formulaVersion: string;
  readonly defaultStrategy: PlanningStrategy;
  /** Weight for risk reduction in ranking */
  readonly riskReductionWeight: number;         // Default: 0.20
  /** Weight for attack path elimination */
  readonly attackPathEliminationWeight: number; // Default: 0.15
  /** Weight for cost (inverted) */
  readonly costWeight: number;                  // Default: 0.10
  /** Weight for confidence */
  readonly confidenceWeight: number;            // Default: 0.10
  /** Weight for business impact */
  readonly businessImpactWeight: number;        // Default: 0.15
  /** Weight for fix complexity (inverted) */
  readonly fixComplexityWeight: number;         // Default: 0.10
  /** Weight for coverage */
  readonly coverageWeight: number;              // Default: 0.10
  /** Weight for time to remediate (inverted) */
  readonly timeToRemediateWeight: number;       // Default: 0.10
}

/** Default engine configuration */
export const DEFAULT_RECOMMENDATION_ENGINE_CONFIG: RecommendationEngineConfig = Object.freeze({
  engineId: 'default',
  enableCaching: true,
  cacheSize: 5_000,
  cacheTtlMs: 300_000,
  batchSize: 1000,
  formulaVersion: '1.0.0',
  defaultStrategy: PlanningStrategy.Balanced,
  riskReductionWeight: 0.20,
  attackPathEliminationWeight: 0.15,
  costWeight: 0.10,
  confidenceWeight: 0.10,
  businessImpactWeight: 0.15,
  fixComplexityWeight: 0.10,
  coverageWeight: 0.10,
  timeToRemediateWeight: 0.10,
});

// ─── Engine Input Types ─────────────────────────────────────

/** Input for generating a single recommendation */
export interface GenerateInput {
  readonly source: RecommendationSource;
  readonly sourceId: string;
  readonly finding?: import('../../normalization/types/index.ts').CanonicalFinding;
  readonly correlationGroup?: import('../../correlation/types/index.ts').CorrelationGroup;
  readonly riskAssessment?: import('../../risk/types/index.ts').RiskAssessment;
  readonly attackPath?: import('../../attack-path/types/index.ts').AttackPath;
  readonly impactAnalysis?: import('../../impact/types/index.ts').ImpactAnalysis;
}

/** Input for batch generation */
export interface GenerateBatchInput {
  readonly findings?: readonly import('../../normalization/types/index.ts').CanonicalFinding[];
  readonly correlationGroups?: readonly import('../../correlation/types/index.ts').CorrelationGroup[];
  readonly riskAssessments?: readonly import('../../risk/types/index.ts').RiskAssessment[];
  readonly attackPaths?: readonly import('../../attack-path/types/index.ts').AttackPath[];
  readonly impactAnalyses?: readonly import('../../impact/types/index.ts').ImpactAnalysis[];
}

/** Input for building a remediation plan */
export interface PlanInput {
  readonly recommendations: readonly Recommendation[];
  readonly strategy: PlanningStrategy;
  readonly constraints?: PlanConstraints;
}

/** Constraints for plan building */
export interface PlanConstraints {
  readonly maxActions?: number;
  readonly maxCost?: number;                    // 0.0–1.0
  readonly maxEffortHours?: number;
  readonly minRiskReduction?: number;           // 0.0–1.0
  readonly requiredActionIds?: readonly RecommendationActionId[];
  readonly excludedRecommendationIds?: readonly RecommendationId[];
}

/** Result of comparing two plans */
export interface PlanComparison {
  readonly planA: RemediationPlanId;
  readonly planB: RemediationPlanId;
  readonly riskReductionDifference: number;
  readonly costDifference: number;
  readonly coverageDifference: number;
  readonly effortDifference: number;
  readonly actionCountDifference: number;
  readonly winner: 'plan-a' | 'plan-b' | 'tie';
  readonly metadata: Metadata;
}

// ─── Cache Statistics ───────────────────────────────────────

/** Recommendation engine cache statistics */
export interface RecommendationCacheStatistics {
  readonly recommendationCacheSize: number;
  readonly planningCacheSize: number;
  readonly totalSize: number;
  readonly capacity: number;
  readonly hits: number;
  readonly misses: number;
  readonly hitRate: number;
  readonly evictions: number;
  readonly expirations: number;
  readonly memoryEstimateBytes: number;
}

// ─── Cache Entry ────────────────────────────────────────────

/** Entry in the recommendation cache */
export interface RecommendationCacheEntry {
  readonly key: string;
  readonly value: Recommendation | RemediationPlan;
  readonly type: 'recommendation' | 'plan';
  readonly createdAt: Timestamp;
  readonly expiresAt: Timestamp;
  readonly accessCount: number;
}
