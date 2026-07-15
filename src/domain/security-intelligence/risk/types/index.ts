/**
 * Security Intelligence Risk Engine — Type Definitions
 *
 * All types, interfaces, and enums for the Risk Engine layer.
 * These types define the risk assessment models that transform
 * CorrelationResults and Knowledge Graph context into risk scores.
 *
 * Design principles:
 * - All risk models are immutable and deeply frozen
 * - Branded IDs prevent accidental mixing with Finding/Correlation/Node IDs
 * - Risk scores are deterministic (0.0–1.0)
 * - Factors are independent and extensible through the Factor Registry
 * - Batch processing is first-class
 */

import type { FindingId, Severity, FindingCategory, ConfidenceLevel, AssetId } from '../../normalization/types/index.ts';

// ─── Branded ID Types ────────────────────────────────────────

/** Branded string for Risk Assessment IDs */
export type RiskAssessmentId = string & { readonly __brand: 'RiskAssessmentId' };

/** Branded string for Risk Score IDs */
export type RiskScoreId = string & { readonly __brand: 'RiskScoreId' };

/** Brand a plain string as a RiskAssessmentId */
export function brandRiskAssessmentId(id: string): RiskAssessmentId {
  return id as RiskAssessmentId;
}

/** Brand a plain string as a RiskScoreId */
export function brandRiskScoreId(id: string): RiskScoreId {
  return id as RiskScoreId;
}

// ─── Utility Types ───────────────────────────────────────────

/** ISO-8601 timestamp string */
export type Timestamp = string;

/** Arbitrary key-value metadata */
export type Metadata = Readonly<Record<string, string | number | boolean | null>>;

// ─── Risk Level ──────────────────────────────────────────────

/**
 * Canonical risk levels derived from computed risk scores.
 * Mapped from the deterministic risk formula output.
 */
export enum RiskLevel {
  Informational = 'Informational',
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

/** All risk level values */
export const ALL_RISK_LEVELS: readonly RiskLevel[] = Object.values(RiskLevel) as RiskLevel[];

/** Numeric risk level ordering for comparison */
export const RISK_LEVEL_ORDER: Readonly<Record<RiskLevel, number>> = Object.freeze({
  [RiskLevel.Informational]: 0,
  [RiskLevel.Low]: 1,
  [RiskLevel.Medium]: 2,
  [RiskLevel.High]: 3,
  [RiskLevel.Critical]: 4,
});

/** Risk level thresholds (0.0–1.0 → RiskLevel) */
export const RISK_LEVEL_THRESHOLDS: Readonly<Record<RiskLevel, number>> = Object.freeze({
  [RiskLevel.Informational]: 0.0,
  [RiskLevel.Low]: 0.15,
  [RiskLevel.Medium]: 0.35,
  [RiskLevel.High]: 0.60,
  [RiskLevel.Critical]: 0.80,
});

// ─── Risk Factor Type ────────────────────────────────────────

/**
 * Enumeration of all built-in risk factors.
 * Each factor is independent and contributes a configurable weight
 * to the overall risk score.
 */
export enum RiskFactorType {
  Severity = 'Severity',
  Confidence = 'Confidence',
  CorrelationDensity = 'CorrelationDensity',
  AssetCriticality = 'AssetCriticality',
  InternetExposure = 'InternetExposure',
  AuthenticationRequired = 'AuthenticationRequired',
  PrivilegeRequired = 'PrivilegeRequired',
  ExploitAvailability = 'ExploitAvailability',
  BusinessImpact = 'BusinessImpact',
  TechnologyAge = 'TechnologyAge',
  AttackSurfaceSize = 'AttackSurfaceSize',
  ExistingMitigations = 'ExistingMitigations',
  FindingRecurrence = 'FindingRecurrence',
  TemporalRisk = 'TemporalRisk',
}

/** All risk factor type values */
export const ALL_RISK_FACTOR_TYPES: readonly RiskFactorType[] = Object.values(RiskFactorType) as RiskFactorType[];

// ─── Risk Reason ─────────────────────────────────────────────

/**
 * Reasons why a risk score changed or was computed at a certain level.
 * Provides explainability for the risk assessment.
 */
export enum RiskReason {
  HighSeverity = 'HighSeverity',
  LowConfidence = 'LowConfidence',
  HighCorrelationDensity = 'HighCorrelationDensity',
  CriticalAsset = 'CriticalAsset',
  InternetFacing = 'InternetFacing',
  NoAuthRequired = 'NoAuthRequired',
  NoPrivilegeRequired = 'NoPrivilegeRequired',
  ExploitAvailable = 'ExploitAvailable',
  HighBusinessImpact = 'HighBusinessImpact',
  OutdatedTechnology = 'OutdatedTechnology',
  LargeAttackSurface = 'LargeAttackSurface',
  NoMitigations = 'NoMitigations',
  RecurringFinding = 'RecurringFinding',
  TemporalIncrease = 'TemporalIncrease',
  CompositeRisk = 'CompositeRisk',
  ContextAdjusted = 'ContextAdjusted',
  AggregationEffect = 'AggregationEffect',
}

/** All risk reason values */
export const ALL_RISK_REASONS: readonly RiskReason[] = Object.values(RiskReason) as RiskReason[];

// ─── Risk Trend ──────────────────────────────────────────────

/**
 * Temporal trend of risk over time.
 * Used for tracking how risk evolves across scans.
 */
export enum RiskTrend {
  New = 'New',
  Increasing = 'Increasing',
  Stable = 'Stable',
  Decreasing = 'Decreasing',
  Resolved = 'Resolved',
}

/** All risk trend values */
export const ALL_RISK_TRENDS: readonly RiskTrend[] = Object.values(RiskTrend) as RiskTrend[];

// ─── Aggregation Scope ──────────────────────────────────────

/**
 * Scope of risk aggregation.
 * Determines what level the risk is aggregated at.
 */
export enum AggregationScope {
  Finding = 'Finding',
  Asset = 'Asset',
  Application = 'Application',
  Scan = 'Scan',
  CorrelationGroup = 'CorrelationGroup',
}

/** All aggregation scope values */
export const ALL_AGGREGATION_SCOPES: readonly AggregationScope[] = Object.values(AggregationScope) as AggregationScope[];

// ─── Risk Factor ─────────────────────────────────────────────

/**
 * A single risk factor with its computed value and weight.
 * Each factor is independent and contributes to the overall risk score
 * through the deterministic formula.
 */
export interface RiskFactor {
  readonly type: RiskFactorType;
  readonly value: number;          // 0.0–1.0, the computed factor value
  readonly weight: number;         // 0.0–1.0, the configurable weight
  readonly weightedValue: number;  // value × weight
  readonly source: string;         // Where the factor value came from
  readonly description: string;    // Human-readable explanation
  readonly metadata: Metadata;
}

// ─── Risk Evidence ───────────────────────────────────────────

/**
 * Evidence supporting a risk assessment.
 * References the data points that contributed to the risk score.
 */
export interface RiskEvidence {
  readonly sourceType: 'finding' | 'correlation' | 'knowledge-graph' | 'context';
  readonly sourceId: string;
  readonly field: string;
  readonly value: string | number | boolean | null;
  readonly confidence: number;  // 0.0–1.0
  readonly description: string;
}

// ─── Risk Score ──────────────────────────────────────────────

/**
 * A computed risk score with full provenance.
 * Contains the raw score, the level it maps to,
 * and all factors that contributed to it.
 */
export interface RiskScore {
  readonly id: RiskScoreId;
  readonly rawScore: number;           // 0.0–1.0, the deterministic formula output
  readonly level: RiskLevel;           // Derived from rawScore via thresholds
  readonly factors: readonly RiskFactor[];
  readonly evidence: readonly RiskEvidence[];
  readonly reasons: readonly RiskReason[];
  readonly context: RiskContext;        // Knowledge Graph context used
  readonly computedAt: Timestamp;
  readonly formulaVersion: string;
}

// ─── Risk Context ────────────────────────────────────────────

/**
 * Context derived from the Knowledge Graph
 * that influences the risk calculation.
 */
export interface RiskContext {
  readonly internetFacing: boolean;
  readonly internalOnly: boolean;
  readonly isProduction: boolean;
  readonly isDevelopment: boolean;
  readonly isCriticalAsset: boolean;
  readonly authenticationChain: readonly string[];
  readonly dependencyCount: number;
  readonly dependentAssetCount: number;
  readonly metadata: Metadata;
}

// ─── Risk Assessment ─────────────────────────────────────────

/**
 * A complete risk assessment for a finding or group of findings.
 * Contains the risk score, associated finding IDs, temporal info,
 * and aggregation metadata.
 */
export interface RiskAssessment {
  readonly id: RiskAssessmentId;
  readonly findingId: FindingId;
  readonly score: RiskScore;
  readonly trend: RiskTrend;
  readonly previousScore: number | null;    // Previous raw score, if any
  readonly scope: AggregationScope;
  readonly scopeId: string;                  // ID of the entity in this scope
  readonly groupId: string | null;           // CorrelationGroup ID if applicable
  readonly assetId: AssetId | null;
  readonly metadata: Metadata;
  readonly assessedAt: Timestamp;
}

// ─── Risk History Entry ──────────────────────────────────────

/**
 * A single entry in the risk history timeline.
 * Records the state of risk at a point in time.
 */
export interface RiskHistoryEntry {
  readonly assessmentId: RiskAssessmentId;
  readonly findingId: FindingId;
  readonly rawScore: number;
  readonly level: RiskLevel;
  readonly trend: RiskTrend;
  readonly reasons: readonly RiskReason[];
  readonly delta: number;                // Change from previous score
  readonly assessedAt: Timestamp;
}

// ─── Risk Summary ────────────────────────────────────────────

/**
 * Aggregated risk summary across multiple assessments.
 * Provides a consolidated view of risk at different aggregation scopes.
 */
export interface RiskSummary {
  readonly scope: AggregationScope;
  readonly scopeId: string;
  readonly totalAssessments: number;
  readonly averageScore: number;
  readonly maxScore: number;
  readonly minScore: number;
  readonly levelDistribution: Readonly<Record<RiskLevel, number>>;
  readonly trendDistribution: Readonly<Record<RiskTrend, number>>;
  readonly topReasons: readonly { readonly reason: RiskReason; readonly count: number }[];
  readonly assessedAt: Timestamp;
}

// ─── Risk Formula Config ─────────────────────────────────────

/**
 * Configuration for the risk formula.
 * All weights are configurable and determine how each factor
 * contributes to the final risk score.
 *
 * Formula:
 * Risk = SeverityWeight × Severity +
 *        ConfidenceWeight × Confidence +
 *        ContextWeight × ContextComposite +
 *        ExposureWeight × ExposureComposite +
 *        CorrelationWeight × CorrelationComposite
 *
 * Where ContextComposite, ExposureComposite, and CorrelationComposite
 * are themselves weighted averages of their sub-factors.
 */
export interface RiskFormulaConfig {
  readonly severityWeight: number;        // Default: 0.30
  readonly confidenceWeight: number;      // Default: 0.10
  readonly contextWeight: number;         // Default: 0.20
  readonly exposureWeight: number;        // Default: 0.25
  readonly correlationWeight: number;     // Default: 0.15
  readonly factorWeights: Readonly<Record<RiskFactorType, number>>;
}

// ─── Risk Engine Config ──────────────────────────────────────

/** Configuration for the risk engine */
export interface RiskEngineConfig {
  readonly engineId: string;
  readonly formulaConfig: RiskFormulaConfig;
  readonly enableCaching: boolean;
  readonly cacheSize: number;
  readonly cacheTtlMs: number;
  readonly batchSize: number;
  readonly formulaVersion: string;
  readonly historyRetentionDays: number;
  readonly contextEnabled: boolean;
}

/** Default risk formula configuration */
export const DEFAULT_RISK_FORMULA_CONFIG: RiskFormulaConfig = Object.freeze({
  severityWeight: 0.30,
  confidenceWeight: 0.10,
  contextWeight: 0.20,
  exposureWeight: 0.25,
  correlationWeight: 0.15,
  factorWeights: Object.freeze({
    [RiskFactorType.Severity]: 1.0,
    [RiskFactorType.Confidence]: 0.8,
    [RiskFactorType.CorrelationDensity]: 0.7,
    [RiskFactorType.AssetCriticality]: 0.9,
    [RiskFactorType.InternetExposure]: 0.85,
    [RiskFactorType.AuthenticationRequired]: 0.6,
    [RiskFactorType.PrivilegeRequired]: 0.55,
    [RiskFactorType.ExploitAvailability]: 0.9,
    [RiskFactorType.BusinessImpact]: 0.85,
    [RiskFactorType.TechnologyAge]: 0.4,
    [RiskFactorType.AttackSurfaceSize]: 0.5,
    [RiskFactorType.ExistingMitigations]: 0.65,
    [RiskFactorType.FindingRecurrence]: 0.55,
    [RiskFactorType.TemporalRisk]: 0.45,
  } as Readonly<Record<RiskFactorType, number>>),
});

/** Default risk engine configuration */
export const DEFAULT_RISK_ENGINE_CONFIG: RiskEngineConfig = Object.freeze({
  engineId: 'default',
  formulaConfig: DEFAULT_RISK_FORMULA_CONFIG,
  enableCaching: true,
  cacheSize: 10_000,
  cacheTtlMs: 300_000, // 5 minutes
  batchSize: 1000,
  formulaVersion: '1.0.0',
  historyRetentionDays: 90,
  contextEnabled: true,
});

// ─── Risk Engine Statistics ──────────────────────────────────

/** Comprehensive risk engine statistics */
export interface RiskStatistics {
  readonly totalAssessed: number;
  readonly totalFailed: number;
  readonly totalBatches: number;
  readonly totalAggregations: number;
  readonly totalHistoryRecords: number;
  readonly averageAssessmentTimeMs: number;
  readonly averageBatchTimeMs: number;
  readonly throughputPerSecond: number;
  readonly cacheHitRate: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly memoryUsageBytes: number;
  readonly levelDistribution: Readonly<Record<RiskLevel, number>>;
  readonly trendDistribution: Readonly<Record<RiskTrend, number>>;
  readonly factorDistribution: Readonly<Record<RiskFactorType, number>>;
  readonly collectedAt: Timestamp;
}

// ─── Factor Evaluation Interface ─────────────────────────────

/**
 * Interface for a risk factor evaluator.
 * Each factor evaluator takes contextual inputs and returns
 * a normalized 0.0–1.0 value.
 */
export interface RiskFactorEvaluator {
  readonly type: RiskFactorType;
  readonly description: string;

  /** Evaluate the factor for a given input */
  evaluate(input: RiskFactorInput): RiskFactorEvaluatorResult;
}

/** Input to a risk factor evaluator */
export interface RiskFactorInput {
  readonly findingId: FindingId;
  readonly severity: Severity;
  readonly confidence: ConfidenceLevel;
  readonly confidenceScore: number;
  readonly category: FindingCategory;
  readonly cve: readonly string[];
  readonly cwe: readonly string[];
  readonly technology: readonly string[];
  readonly tags: readonly string[];
  readonly endpoint: string | null;
  readonly affectedAsset: string | null;
  readonly correlationScore: number;
  readonly correlationCount: number;
  readonly groupCount: number;
  readonly context: RiskContext;
  readonly metadata: Metadata;
}

/** Result of evaluating a risk factor */
export interface RiskFactorEvaluatorResult {
  readonly value: number;       // 0.0–1.0
  readonly source: string;
  readonly description: string;
  readonly metadata: Metadata;
}

// ─── Cache Entry ─────────────────────────────────────────────

/** Entry in the risk cache */
export interface RiskCacheEntry {
  readonly key: string;
  readonly value: RiskAssessment;
  readonly createdAt: Timestamp;
  readonly expiresAt: Timestamp;
  readonly accessCount: number;
}

// ─── Validation Result ───────────────────────────────────────

/** Result of validating a risk assessment */
export interface RiskValidationResult {
  readonly valid: boolean;
  readonly errors: readonly RiskValidationError[];
  readonly warnings: readonly RiskValidationWarning[];
}

/** Risk validation error */
export interface RiskValidationError {
  readonly field: string;
  readonly message: string;
  readonly code: string;
}

/** Risk validation warning */
export interface RiskValidationWarning {
  readonly field: string;
  readonly message: string;
  readonly code: string;
}
