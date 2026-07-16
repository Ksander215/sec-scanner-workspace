/**
 * Security Intelligence Impact Analysis Engine — Type Definitions
 *
 * All types, interfaces, and enums for the Impact Analysis Engine.
 * This module answers: "What changes if we eliminate a specific problem?"
 *
 * Design principles:
 * - All models are immutable and deeply frozen
 * - Branded IDs prevent accidental mixing with other domain IDs
 * - All calculations are fully deterministic (no probabilistic algorithms)
 * - Delta calculations use existing Risk Engine and Attack Path Engine
 * - No mutations to existing modules (Knowledge Graph, Risk Engine, etc.)
 */

import type { FindingId, AssetId } from '../../normalization/types/index.ts';
import type { CorrelationGroupId } from '../../correlation/types/index.ts';
import type { RiskAssessmentId, RiskLevel } from '../../risk/types/index.ts';
import type { AttackPathId, AttackStepId, AttackNodeId, AttackEdgeId, AttackObjectiveType } from '../../attack-path/types/index.ts';
import type { NodeId, EdgeId } from '../../../knowledge-graph/types/index.ts';

// ─── Branded ID Types ────────────────────────────────────────

/** Branded string for Impact Analysis IDs */
export type ImpactAnalysisId = string & { readonly __brand: 'ImpactAnalysisId' };

/** Branded string for Impact Scenario IDs */
export type ImpactScenarioId = string & { readonly __brand: 'ImpactScenarioId' };

/** Branded string for Mitigation Effect IDs */
export type MitigationEffectId = string & { readonly __brand: 'MitigationEffectId' };

/** Branded string for Attack Path Delta IDs */
export type AttackPathDeltaId = string & { readonly __brand: 'AttackPathDeltaId' };

/** Branded string for Risk Delta IDs */
export type RiskDeltaId = string & { readonly __brand: 'RiskDeltaId' };

/** Branded string for Security Score Delta IDs */
export type SecurityScoreDeltaId = string & { readonly __brand: 'SecurityScoreDeltaId' };

/** Branded string for Dependency Impact IDs */
export type DependencyImpactId = string & { readonly __brand: 'DependencyImpactId' };

/** Branded string for Remediation Candidate IDs */
export type RemediationCandidateId = string & { readonly __brand: 'RemediationCandidateId' };

/** Brand a plain string as an ImpactAnalysisId */
export function brandImpactAnalysisId(id: string): ImpactAnalysisId {
  return id as ImpactAnalysisId;
}

/** Brand a plain string as an ImpactScenarioId */
export function brandImpactScenarioId(id: string): ImpactScenarioId {
  return id as ImpactScenarioId;
}

/** Brand a plain string as an MitigationEffectId */
export function brandMitigationEffectId(id: string): MitigationEffectId {
  return id as MitigationEffectId;
}

/** Brand a plain string as an AttackPathDeltaId */
export function brandAttackPathDeltaId(id: string): AttackPathDeltaId {
  return id as AttackPathDeltaId;
}

/** Brand a plain string as an RiskDeltaId */
export function brandRiskDeltaId(id: string): RiskDeltaId {
  return id as RiskDeltaId;
}

/** Brand a plain string as an SecurityScoreDeltaId */
export function brandSecurityScoreDeltaId(id: string): SecurityScoreDeltaId {
  return id as SecurityScoreDeltaId;
}

/** Brand a plain string as an DependencyImpactId */
export function brandDependencyImpactId(id: string): DependencyImpactId {
  return id as DependencyImpactId;
}

/** Brand a plain string as an RemediationCandidateId */
export function brandRemediationCandidateId(id: string): RemediationCandidateId {
  return id as RemediationCandidateId;
}

// ─── Utility Types ───────────────────────────────────────────

/** ISO-8601 timestamp string */
export type Timestamp = string;

/** Arbitrary key-value metadata */
export type Metadata = Readonly<Record<string, string | number | boolean | null>>;

// ─── Mitigation Scenario Type ────────────────────────────────

/**
 * Types of mitigation scenarios that can be simulated.
 * Each scenario models a different way to reduce attack surface.
 */
export enum MitigationScenarioType {
  RemoveFinding = 'RemoveFinding',
  RemoveCorrelation = 'RemoveCorrelation',
  RemoveAsset = 'RemoveAsset',
  PatchVulnerability = 'PatchVulnerability',
  DisableService = 'DisableService',
  CloseEndpoint = 'CloseEndpoint',
  RotateCredential = 'RotateCredential',
  NetworkIsolation = 'NetworkIsolation',
}

/** All mitigation scenario type values */
export const ALL_MITIGATION_SCENARIO_TYPES: readonly MitigationScenarioType[] =
  Object.values(MitigationScenarioType) as MitigationScenarioType[];

// ─── Attack Path Change Type ─────────────────────────────────

/**
 * How an attack path changes after mitigation.
 */
export enum AttackPathChangeType {
  /** The attack path is completely eliminated */
  Eliminated = 'Eliminated',
  /** The attack path is shortened (fewer steps) */
  Shortened = 'Shortened',
  /** The attack path remains but with reduced risk/probability */
  Reduced = 'Reduced',
  /** The attack path is unchanged */
  Unchanged = 'Unchanged',
}

/** All attack path change type values */
export const ALL_ATTACK_PATH_CHANGE_TYPES: readonly AttackPathChangeType[] =
  Object.values(AttackPathChangeType) as AttackPathChangeType[];

// ─── Remediation Ranking Strategy ────────────────────────────

/**
 * Strategy for ranking remediation candidates.
 */
export enum RemediationRankingStrategy {
  /** Sort by maximum risk reduction */
  MaximumRiskReduction = 'MaximumRiskReduction',
  /** Sort by minimum cost/effort */
  MinimumCost = 'MinimumCost',
  /** Sort by maximum coverage (most findings/paths affected) */
  MaximumCoverage = 'MaximumCoverage',
  /** Sort by shortest attack elimination */
  ShortestAttackElimination = 'ShortestAttackElimination',
}

/** All remediation ranking strategy values */
export const ALL_REMEDIATION_RANKING_STRATEGIES: readonly RemediationRankingStrategy[] =
  Object.values(RemediationRankingStrategy) as RemediationRankingStrategy[];

// ─── Impact Analysis ─────────────────────────────────────────

/**
 * Complete impact analysis result.
 * Describes the overall effect of applying a mitigation scenario.
 */
export interface ImpactAnalysis {
  readonly id: ImpactAnalysisId;
  readonly scenarioId: ImpactScenarioId;
  readonly scenarioType: MitigationScenarioType;
  readonly attackPathDelta: AttackPathDelta;
  readonly riskDelta: RiskDelta;
  readonly securityScoreDelta: SecurityScoreDelta;
  readonly dependencyImpacts: readonly DependencyImpact[];
  readonly mitigationEffect: MitigationEffect;
  readonly remediationCandidate: RemediationCandidate;
  readonly analyzedAt: Timestamp;
  readonly analysisDurationMs: number;
  readonly metadata: Metadata;
}

// ─── Impact Scenario ─────────────────────────────────────────

/**
 * A specific mitigation scenario to analyze.
 * Defines what change is being simulated and its parameters.
 */
export interface ImpactScenario {
  readonly id: ImpactScenarioId;
  readonly type: MitigationScenarioType;
  readonly targetId: string;                // ID of the entity being mitigated
  readonly targetType: 'finding' | 'correlation' | 'asset' | 'vulnerability' | 'service' | 'endpoint' | 'credential' | 'network';
  readonly description: string;
  readonly parameters: Readonly<Record<string, string | number | boolean>>;
  readonly attackPaths: readonly AttackPathId[];
  readonly riskAssessmentIds: readonly RiskAssessmentId[];
  readonly correlationGroupIds: readonly CorrelationGroupId[];
  readonly createdAt: Timestamp;
  readonly metadata: Metadata;
}

// ─── Mitigation Effect ───────────────────────────────────────

/**
 * Effect of a mitigation action on the security posture.
 * Quantifies risk reduction, attack surface reduction, etc.
 */
export interface MitigationEffect {
  readonly id: MitigationEffectId;
  readonly scenarioId: ImpactScenarioId;
  readonly riskReduction: number;            // 0.0–1.0, absolute reduction
  readonly attackSurfaceReduction: number;   // 0.0–1.0, fraction of paths eliminated
  readonly businessImpact: number;           // 0.0–1.0, business criticality affected
  readonly confidenceImprovement: number;    // 0.0–1.0, confidence gain
  readonly exploitabilityReduction: number;  // 0.0–1.0, reduction in exploit likelihood
  readonly estimatedCost: number;            // 0.0–1.0, relative cost of mitigation
  readonly implementationComplexity: number; // 0.0–1.0, complexity of implementation
  readonly metadata: Metadata;
}

// ─── Attack Path Delta ───────────────────────────────────────

/**
 * Delta describing how attack paths change after mitigation.
 * Categorizes paths by their change type.
 */
export interface AttackPathDelta {
  readonly id: AttackPathDeltaId;
  readonly scenarioId: ImpactScenarioId;
  readonly eliminatedPaths: readonly AttackPathId[];
  readonly shortenedPaths: readonly AttackPathDeltaDetail[];
  readonly reducedPaths: readonly AttackPathDeltaDetail[];
  readonly unchangedPaths: readonly AttackPathId[];
  readonly totalBefore: number;
  readonly totalAfter: number;
  readonly netChange: number;                // Can be negative (paths eliminated)
  readonly metadata: Metadata;
}

/** Detail about a specific path delta */
export interface AttackPathDeltaDetail {
  readonly pathId: AttackPathId;
  readonly changeType: AttackPathChangeType;
  readonly riskBefore: number;
  readonly riskAfter: number;
  readonly riskDelta: number;
  readonly lengthBefore: number;
  readonly lengthAfter: number;
  readonly lengthDelta: number;
  readonly probabilityBefore: number;
  readonly probabilityAfter: number;
  readonly probabilityDelta: number;
}

// ─── Risk Delta ──────────────────────────────────────────────

/**
 * Delta describing how risk changes after mitigation.
 * Shows before/after values and the difference.
 */
export interface RiskDelta {
  readonly id: RiskDeltaId;
  readonly scenarioId: ImpactScenarioId;
  readonly overallBefore: number;           // 0.0–1.0
  readonly overallAfter: number;            // 0.0–1.0
  readonly overallDifference: number;       // before - after (positive = improvement)
  readonly levelBefore: RiskLevel;
  readonly levelAfter: RiskLevel;
  readonly levelChanged: boolean;
  readonly perAssessmentDeltas: readonly RiskAssessmentDelta[];
  readonly metadata: Metadata;
}

/** Per-assessment risk delta */
export interface RiskAssessmentDelta {
  readonly assessmentId: RiskAssessmentId;
  readonly findingId: FindingId;
  readonly scoreBefore: number;
  readonly scoreAfter: number;
  readonly scoreDelta: number;
  readonly levelBefore: RiskLevel;
  readonly levelAfter: RiskLevel;
  readonly levelChanged: boolean;
}

// ─── Security Score Delta ────────────────────────────────────

/**
 * Delta describing how security score changes after mitigation.
 * Security score is the inverse of risk (higher = more secure).
 */
export interface SecurityScoreDelta {
  readonly id: SecurityScoreDeltaId;
  readonly scenarioId: ImpactScenarioId;
  readonly scoreBefore: number;             // 0–100
  readonly scoreAfter: number;              // 0–100
  readonly scoreDelta: number;              // after - before (positive = improvement)
  readonly gradeBefore: SecurityGrade;
  readonly gradeAfter: SecurityGrade;
  readonly gradeChanged: boolean;
  readonly metadata: Metadata;
}

/** Security grade based on score ranges */
export enum SecurityGrade {
  A = 'A',    // 90–100
  B = 'B',    // 75–89
  C = 'C',    // 55–74
  D = 'D',    // 35–54
  F = 'F',    // 0–34
}

/** All security grade values */
export const ALL_SECURITY_GRADES: readonly SecurityGrade[] =
  Object.values(SecurityGrade) as SecurityGrade[];

// ─── Dependency Impact ───────────────────────────────────────

/**
 * Impact of a mitigation on dependent entities.
 * Describes cascading effects through the infrastructure.
 */
export interface DependencyImpact {
  readonly id: DependencyImpactId;
  readonly scenarioId: ImpactScenarioId;
  readonly sourceType: string;              // What was mitigated
  readonly sourceId: string;                // ID of mitigated entity
  readonly affectedType: string;            // What is affected
  readonly affectedId: string;              // ID of affected entity
  readonly impactType: 'direct' | 'indirect' | 'cascading';
  readonly impactScore: number;             // 0.0–1.0
  readonly description: string;
  readonly metadata: Metadata;
}

// ─── Remediation Candidate ──────────────────────────────────

/**
 * A candidate remediation action with its impact metrics.
 * Used for prioritizing which mitigations to apply first.
 */
export interface RemediationCandidate {
  readonly id: RemediationCandidateId;
  readonly scenarioId: ImpactScenarioId;
  readonly targetType: MitigationScenarioType;
  readonly targetId: string;
  readonly targetLabel: string;
  readonly riskReduction: number;           // 0.0–1.0
  readonly attackSurfaceReduction: number;  // 0.0–1.0
  readonly businessImpact: number;          // 0.0–1.0
  readonly confidenceImprovement: number;   // 0.0–1.0
  readonly exploitabilityReduction: number; // 0.0–1.0
  readonly estimatedCost: number;           // 0.0–1.0
  readonly implementationComplexity: number; // 0.0–1.0
  readonly pathsEliminated: number;
  readonly pathsReduced: number;
  readonly pathsAffected: number;
  readonly rank: number;
  readonly score: number;                   // 0.0–1.0, composite
  readonly metadata: Metadata;
}

// ─── Engine Configuration ────────────────────────────────────

/** Configuration for the Impact Analysis Engine */
export interface ImpactEngineConfig {
  readonly engineId: string;
  readonly enableCaching: boolean;
  readonly cacheSize: number;
  readonly cacheTtlMs: number;
  readonly batchSize: number;
  readonly formulaVersion: string;
  readonly rankingStrategy: RemediationRankingStrategy;
  /** Weight for risk reduction in composite score */
  readonly riskReductionWeight: number;     // Default: 0.30
  /** Weight for attack surface reduction */
  readonly attackSurfaceWeight: number;     // Default: 0.25
  /** Weight for business impact */
  readonly businessImpactWeight: number;    // Default: 0.15
  /** Weight for confidence improvement */
  readonly confidenceWeight: number;        // Default: 0.10
  /** Weight for exploitability reduction */
  readonly exploitabilityWeight: number;    // Default: 0.10
  /** Weight for cost (inverted — lower cost = better) */
  readonly costWeight: number;              // Default: 0.10
}

/** Default engine configuration */
export const DEFAULT_IMPACT_ENGINE_CONFIG: ImpactEngineConfig = Object.freeze({
  engineId: 'default',
  enableCaching: true,
  cacheSize: 5_000,
  cacheTtlMs: 300_000,
  batchSize: 1000,
  formulaVersion: '1.0.0',
  rankingStrategy: RemediationRankingStrategy.MaximumRiskReduction,
  riskReductionWeight: 0.30,
  attackSurfaceWeight: 0.25,
  businessImpactWeight: 0.15,
  confidenceWeight: 0.10,
  exploitabilityWeight: 0.10,
  costWeight: 0.10,
});

// ─── Engine Statistics ───────────────────────────────────────

/** Comprehensive impact analysis engine statistics */
export interface ImpactStatistics {
  readonly totalAnalyses: number;
  readonly totalSimulations: number;
  readonly totalComparisons: number;
  readonly totalRankings: number;
  readonly totalFailed: number;
  readonly totalBatches: number;
  readonly averageAnalysisTimeMs: number;
  readonly averageSimulationTimeMs: number;
  readonly averageComparisonTimeMs: number;
  readonly throughputPerSecond: number;
  readonly cacheHitRate: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly scenarioTypeDistribution: Readonly<Record<MitigationScenarioType, number>>;
  readonly collectedAt: Timestamp;
}

// ─── Analysis Input ──────────────────────────────────────────

/** Input for impact analysis */
export interface AnalysisInput {
  readonly scenario: ImpactScenario;
  readonly attackPaths: readonly import('../../attack-path/types/index.ts').AttackPath[];
  readonly riskAssessments: readonly import('../../risk/types/index.ts').RiskAssessment[];
  readonly correlationGroups?: readonly import('../../correlation/types/index.ts').CorrelationGroup[];
}

// ─── Comparison Input ────────────────────────────────────────

/** Input for comparing two scenarios */
export interface ComparisonInput {
  readonly baseline: ImpactAnalysis;
  readonly alternative: ImpactAnalysis;
}

// ─── Comparison Result ───────────────────────────────────────

/** Result of comparing two impact analyses */
export interface ComparisonResult {
  readonly baselineScenarioId: ImpactScenarioId;
  readonly alternativeScenarioId: ImpactScenarioId;
  readonly riskDeltaDifference: number;
  readonly attackSurfaceDifference: number;
  readonly securityScoreDifference: number;
  readonly pathsEliminatedDifference: number;
  readonly costDifference: number;
  readonly winner: 'baseline' | 'alternative' | 'tie';
  readonly metadata: Metadata;
}

// ─── Cache Statistics ────────────────────────────────────────

/** Impact analysis cache statistics */
export interface ImpactCacheStatistics {
  readonly scenarioCacheSize: number;
  readonly deltaCacheSize: number;
  readonly totalSize: number;
  readonly capacity: number;
  readonly hits: number;
  readonly misses: number;
  readonly hitRate: number;
  readonly evictions: number;
  readonly expirations: number;
  readonly invalidations: number;
  readonly memoryEstimateBytes: number;
}

// ─── Cache Entry ─────────────────────────────────────────────

/** Entry in the impact analysis cache */
export interface ImpactCacheEntry {
  readonly key: string;
  readonly value: ImpactAnalysis | AttackPathDelta | RiskDelta | SecurityScoreDelta;
  readonly type: 'analysis' | 'path-delta' | 'risk-delta' | 'score-delta';
  readonly createdAt: Timestamp;
  readonly expiresAt: Timestamp;
  readonly accessCount: number;
}
