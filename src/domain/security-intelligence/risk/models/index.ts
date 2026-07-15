/**
 * Security Intelligence Risk Engine — Models
 *
 * All risk domain models with factory functions,
 * serialization, equality, cloning, and hashing.
 *
 * Design principles:
 * - All models are deeply frozen and immutable
 * - Factory functions are the only way to create instances
 * - JSON round-trip is lossless
 * - equals/clone/hash provided for all models
 */

import type {
  RiskAssessmentId, RiskScoreId, Timestamp, Metadata,
  RiskLevel, RiskTrend, RiskReason, RiskFactorType, AggregationScope,
  RiskFactor, RiskEvidence, RiskScore, RiskContext,
  RiskAssessment, RiskHistoryEntry, RiskSummary,
  RiskFactorEvaluatorResult,
} from '../types/index.ts';
import {
  brandRiskAssessmentId, brandRiskScoreId,
  RiskLevel as RLvl, RiskTrend as RTrend, RiskReason as RReason,
  RiskFactorType as RFT, AggregationScope as AScope,
  RISK_LEVEL_THRESHOLDS, RISK_LEVEL_ORDER,
} from '../types/index.ts';
import type {
  FindingId, Severity, AssetId, ConfidenceLevel, FindingCategory,
} from '../../normalization/types/index.ts';
import {
  Severity as Sev, ConfidenceLevel as CLevel,
} from '../../normalization/types/index.ts';

// ─── ID Generation ───────────────────────────────────────────

/** Generate a unique RiskAssessmentId */
export function generateRiskAssessmentId(): RiskAssessmentId {
  return brandRiskAssessmentId(`risk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`);
}

/** Generate a unique RiskScoreId */
export function generateRiskScoreId(): RiskScoreId {
  return brandRiskScoreId(`rscr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`);
}

// ─── Risk Level Determination ────────────────────────────────

/**
 * Determine risk level from a raw score using thresholds.
 * Deterministic: same score always maps to the same level.
 */
export function determineRiskLevel(rawScore: number): RiskLevel {
  const score = Math.max(0, Math.min(1, rawScore));

  if (score >= RISK_LEVEL_THRESHOLDS[Rlvl.Critical]) return RLvl.Critical;
  if (score >= RISK_LEVEL_THRESHOLDS[Rlvl.High]) return RLvl.High;
  if (score >= RISK_LEVEL_THRESHOLDS[Rlvl.Medium]) return RLvl.Medium;
  if (score >= RISK_LEVEL_THRESHOLDS[Rlvl.Low]) return RLvl.Low;
  return RLvl.Informational;
}

// Workaround: RLvl alias for inner scope
const Rlvl = RLvl;

// ─── Factory: RiskContext ────────────────────────────────────

/** Create a default RiskContext */
export function createDefaultRiskContext(overrides?: Partial<RiskContext>): RiskContext {
  return Object.freeze({
    internetFacing: false,
    internalOnly: true,
    isProduction: false,
    isDevelopment: true,
    isCriticalAsset: false,
    authenticationChain: Object.freeze([]),
    dependencyCount: 0,
    dependentAssetCount: 0,
    metadata: Object.freeze({}),
    ...overrides,
  });
}

/** Create a RiskContext */
export function createRiskContext(params: {
  readonly internetFacing: boolean;
  readonly internalOnly: boolean;
  readonly isProduction: boolean;
  readonly isDevelopment: boolean;
  readonly isCriticalAsset: boolean;
  readonly authenticationChain: readonly string[];
  readonly dependencyCount: number;
  readonly dependentAssetCount: number;
  readonly metadata?: Metadata;
}): RiskContext {
  return Object.freeze({
    internetFacing: params.internetFacing,
    internalOnly: params.internalOnly,
    isProduction: params.isProduction,
    isDevelopment: params.isDevelopment,
    isCriticalAsset: params.isCriticalAsset,
    authenticationChain: Object.freeze([...params.authenticationChain]),
    dependencyCount: params.dependencyCount,
    dependentAssetCount: params.dependentAssetCount,
    metadata: Object.freeze({ ...(params.metadata ?? {}) }),
  });
}

// ─── Factory: RiskFactor ─────────────────────────────────────

/** Create a RiskFactor */
export function createRiskFactor(params: {
  readonly type: RiskFactorType;
  readonly value: number;
  readonly weight: number;
  readonly source: string;
  readonly description: string;
  readonly metadata?: Metadata;
}): RiskFactor {
  const value = Math.max(0, Math.min(1, params.value));
  const weight = Math.max(0, Math.min(1, params.weight));
  return Object.freeze({
    type: params.type,
    value,
    weight,
    weightedValue: Math.round(value * weight * 10000) / 10000,
    source: params.source,
    description: params.description,
    metadata: Object.freeze({ ...(params.metadata ?? {}) }),
  });
}

// ─── Factory: RiskEvidence ───────────────────────────────────

/** Create a RiskEvidence */
export function createRiskEvidence(params: {
  readonly sourceType: 'finding' | 'correlation' | 'knowledge-graph' | 'context';
  readonly sourceId: string;
  readonly field: string;
  readonly value: string | number | boolean | null;
  readonly confidence: number;
  readonly description: string;
}): RiskEvidence {
  return Object.freeze({
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    field: params.field,
    value: params.value,
    confidence: Math.max(0, Math.min(1, params.confidence)),
    description: params.description,
  });
}

// ─── Factory: RiskScore ──────────────────────────────────────

/** Create a RiskScore */
export function createRiskScore(params: {
  readonly rawScore: number;
  readonly factors: readonly RiskFactor[];
  readonly evidence: readonly RiskEvidence[];
  readonly reasons: readonly RiskReason[];
  readonly context: RiskContext;
  readonly formulaVersion: string;
}): RiskScore {
  const rawScore = Math.max(0, Math.min(1, params.rawScore));
  return Object.freeze({
    id: generateRiskScoreId(),
    rawScore,
    level: determineRiskLevel(rawScore),
    factors: Object.freeze([...params.factors]),
    evidence: Object.freeze([...params.evidence]),
    reasons: Object.freeze([...params.reasons]),
    context: params.context,
    computedAt: new Date().toISOString() as Timestamp,
    formulaVersion: params.formulaVersion,
  });
}

// ─── Factory: RiskAssessment ─────────────────────────────────

/** Create a RiskAssessment */
export function createRiskAssessment(params: {
  readonly findingId: FindingId;
  readonly score: RiskScore;
  readonly trend: RiskTrend;
  readonly previousScore: number | null;
  readonly scope: AggregationScope;
  readonly scopeId: string;
  readonly groupId?: string | null;
  readonly assetId?: AssetId | null;
  readonly metadata?: Metadata;
}): RiskAssessment {
  return Object.freeze({
    id: generateRiskAssessmentId(),
    findingId: params.findingId,
    score: params.score,
    trend: params.trend,
    previousScore: params.previousScore,
    scope: params.scope,
    scopeId: params.scopeId,
    groupId: params.groupId ?? null,
    assetId: params.assetId ?? null,
    metadata: Object.freeze({ ...(params.metadata ?? {}) }),
    assessedAt: new Date().toISOString() as Timestamp,
  });
}

// ─── Factory: RiskHistoryEntry ───────────────────────────────

/** Create a RiskHistoryEntry */
export function createRiskHistoryEntry(params: {
  readonly assessmentId: RiskAssessmentId;
  readonly findingId: FindingId;
  readonly rawScore: number;
  readonly level: RiskLevel;
  readonly trend: RiskTrend;
  readonly reasons: readonly RiskReason[];
  readonly delta: number;
  readonly assessedAt?: Timestamp;
}): RiskHistoryEntry {
  return Object.freeze({
    assessmentId: params.assessmentId,
    findingId: params.findingId,
    rawScore: Math.max(0, Math.min(1, params.rawScore)),
    level: params.level,
    trend: params.trend,
    reasons: Object.freeze([...params.reasons]),
    delta: params.delta,
    assessedAt: params.assessedAt ?? new Date().toISOString() as Timestamp,
  });
}

// ─── Factory: RiskSummary ────────────────────────────────────

/** Create a RiskSummary */
export function createRiskSummary(params: {
  readonly scope: AggregationScope;
  readonly scopeId: string;
  readonly totalAssessments: number;
  readonly averageScore: number;
  readonly maxScore: number;
  readonly minScore: number;
  readonly levelDistribution: Readonly<Record<RiskLevel, number>>;
  readonly trendDistribution: Readonly<Record<RiskTrend, number>>;
  readonly topReasons: readonly { readonly reason: RiskReason; readonly count: number }[];
}): RiskSummary {
  return Object.freeze({
    scope: params.scope,
    scopeId: params.scopeId,
    totalAssessments: params.totalAssessments,
    averageScore: Math.round(params.averageScore * 10000) / 10000,
    maxScore: Math.round(params.maxScore * 10000) / 10000,
    minScore: Math.round(params.minScore * 10000) / 10000,
    levelDistribution: Object.freeze({ ...params.levelDistribution }),
    trendDistribution: Object.freeze({ ...params.trendDistribution }),
    topReasons: Object.freeze([...params.topReasons]),
    assessedAt: new Date().toISOString() as Timestamp,
  });
}

// ─── Factory: Empty Distributions ────────────────────────────

/** Create empty level distribution */
export function createEmptyLevelDistribution(): Readonly<Record<RiskLevel, number>> {
  const dist: Record<string, number> = {};
  for (const lvl of Object.values(RLvl)) dist[lvl] = 0;
  return Object.freeze(dist as Readonly<Record<RiskLevel, number>>);
}

/** Create empty trend distribution */
export function createEmptyTrendDistribution(): Readonly<Record<RiskTrend, number>> {
  const dist: Record<string, number> = {};
  for (const t of Object.values(RTrend)) dist[t] = 0;
  return Object.freeze(dist as Readonly<Record<RiskTrend, number>>);
}

/** Create empty factor distribution */
export function createEmptyFactorDistribution(): Readonly<Record<RiskFactorType, number>> {
  const dist: Record<string, number> = {};
  for (const f of Object.values(RFT)) dist[f] = 0;
  return Object.freeze(dist as Readonly<Record<RiskFactorType, number>>);
}

// ─── Risk Trend Determination ────────────────────────────────

/**
 * Determine risk trend based on current and previous scores.
 * Deterministic: same inputs always produce the same trend.
 */
export function determineRiskTrend(
  currentScore: number,
  previousScore: number | null,
): RiskTrend {
  if (previousScore === null) return RTrend.New;

  const delta = currentScore - previousScore;
  const threshold = 0.05; // 5% change threshold

  if (currentScore <= 0.01 && previousScore > 0.01) return RTrend.Resolved;
  if (delta > threshold) return RTrend.Increasing;
  if (delta < -threshold) return RTrend.Decreasing;
  return RTrend.Stable;
}

// ─── Serialization ───────────────────────────────────────────

/** Serialize a RiskAssessment to JSON */
export function riskAssessmentToJSON(assessment: RiskAssessment): Record<string, unknown> {
  return {
    id: assessment.id,
    findingId: assessment.findingId,
    score: riskScoreToJSON(assessment.score),
    trend: assessment.trend,
    previousScore: assessment.previousScore,
    scope: assessment.scope,
    scopeId: assessment.scopeId,
    groupId: assessment.groupId,
    assetId: assessment.assetId,
    metadata: { ...assessment.metadata },
    assessedAt: assessment.assessedAt,
  };
}

/** Serialize a RiskScore to JSON */
export function riskScoreToJSON(score: RiskScore): Record<string, unknown> {
  return {
    id: score.id,
    rawScore: score.rawScore,
    level: score.level,
    factors: score.factors.map(f => ({ ...f })),
    evidence: score.evidence.map(e => ({ ...e })),
    reasons: [...score.reasons],
    context: { ...score.context },
    computedAt: score.computedAt,
    formulaVersion: score.formulaVersion,
  };
}

/** Deserialize a RiskAssessment from JSON */
export function riskAssessmentFromJSON(json: Record<string, unknown>): RiskAssessment {
  const scoreJson = json.score as Record<string, unknown>;
  return createRiskAssessment({
    findingId: json.findingId as FindingId,
    score: createRiskScore({
      rawScore: scoreJson.rawScore as number,
      factors: (scoreJson.factors as RiskFactor[]) ?? [],
      evidence: (scoreJson.evidence as RiskEvidence[]) ?? [],
      reasons: (scoreJson.reasons as RiskReason[]) ?? [],
      context: (scoreJson.context as RiskContext) ?? createDefaultRiskContext(),
      formulaVersion: (scoreJson.formulaVersion as string) ?? '1.0.0',
    }),
    trend: (json.trend as RiskTrend) ?? RTrend.New,
    previousScore: (json.previousScore as number) ?? null,
    scope: (json.scope as AggregationScope) ?? AScope.Finding,
    scopeId: (json.scopeId as string) ?? '',
    groupId: (json.groupId as string) ?? null,
    assetId: (json.assetId as AssetId) ?? null,
    metadata: (json.metadata as Metadata) ?? {},
  });
}

// ─── Equality / Clone / Hash ─────────────────────────────────

/** Check equality of two RiskAssessments */
export function riskAssessmentsEqual(a: RiskAssessment, b: RiskAssessment): boolean {
  return a.id === b.id;
}

/** Check equality of two RiskScores */
export function riskScoresEqual(a: RiskScore, b: RiskScore): boolean {
  return a.id === b.id;
}

/** Clone a RiskAssessment */
export function cloneRiskAssessment(assessment: RiskAssessment): RiskAssessment {
  return riskAssessmentFromJSON(riskAssessmentToJSON(assessment));
}

/** Hash a RiskAssessment */
export function hashRiskAssessment(assessment: RiskAssessment): number {
  let hash = 0;
  const str = assessment.id;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

// ─── Severity to Numeric ─────────────────────────────────────

/** Convert a Severity to a 0.0–1.0 normalized value */
export function severityToNormalized(severity: Severity): number {
  switch (severity) {
    case Sev.Critical: return 1.0;
    case Sev.High: return 0.75;
    case Sev.Medium: return 0.50;
    case Sev.Low: return 0.25;
    case Sev.Info: return 0.05;
    default: return 0.0;
  }
}

/** Convert a ConfidenceLevel to a 0.0–1.0 normalized value */
export function confidenceToNormalized(confidence: ConfidenceLevel): number {
  switch (confidence) {
    case CLevel.Confirmed: return 1.0;
    case CLevel.High: return 0.85;
    case CLevel.Medium: return 0.60;
    case CLevel.Low: return 0.35;
    case CLevel.Unknown: return 0.10;
    default: return 0.0;
  }
}
