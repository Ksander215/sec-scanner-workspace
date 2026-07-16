/**
 * Security Intelligence Impact Analysis Engine — Domain Models
 *
 * Factory functions for creating immutable impact analysis domain models.
 * All models are deeply frozen and validated on construction.
 *
 * Design principles:
 * - Factory functions are the ONLY way to create instances
 * - All outputs are deeply frozen (Object.freeze)
 * - Validation happens at construction time
 * - Round-trip serialization via toJSON/fromJSON
 * - Equality, clone, and hash utilities
 */

import type {
  ImpactAnalysisId, ImpactScenarioId, MitigationEffectId, AttackPathDeltaId,
  RiskDeltaId, SecurityScoreDeltaId, DependencyImpactId, RemediationCandidateId,
  Timestamp, Metadata,
  ImpactAnalysis, ImpactScenario, MitigationEffect,
  AttackPathDelta, AttackPathDeltaDetail, RiskDelta, RiskAssessmentDelta,
  SecurityScoreDelta, DependencyImpact, RemediationCandidate,
} from '../types/index.ts';
import {
  brandImpactAnalysisId, brandImpactScenarioId, brandMitigationEffectId,
  brandAttackPathDeltaId, brandRiskDeltaId, brandSecurityScoreDeltaId,
  brandDependencyImpactId, brandRemediationCandidateId,
  MitigationScenarioType, AttackPathChangeType, SecurityGrade,
} from '../types/index.ts';
import type { AttackPathId, AttackObjectiveType } from '../../attack-path/types/index.ts';
import type { RiskAssessmentId, RiskLevel } from '../../risk/types/index.ts';
import type { CorrelationGroupId } from '../../correlation/types/index.ts';
import type { FindingId } from '../../normalization/types/index.ts';

// ─── ID Generation ───────────────────────────────────────────

/** Generate a unique ImpactAnalysisId */
export function generateImpactAnalysisId(): ImpactAnalysisId {
  return brandImpactAnalysisId(`ia_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`);
}

/** Generate a unique ImpactScenarioId */
export function generateImpactScenarioId(): ImpactScenarioId {
  return brandImpactScenarioId(`is_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`);
}

/** Generate a unique MitigationEffectId */
export function generateMitigationEffectId(): MitigationEffectId {
  return brandMitigationEffectId(`me_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`);
}

/** Generate a unique AttackPathDeltaId */
export function generateAttackPathDeltaId(): AttackPathDeltaId {
  return brandAttackPathDeltaId(`apd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`);
}

/** Generate a unique RiskDeltaId */
export function generateRiskDeltaId(): RiskDeltaId {
  return brandRiskDeltaId(`rd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`);
}

/** Generate a unique SecurityScoreDeltaId */
export function generateSecurityScoreDeltaId(): SecurityScoreDeltaId {
  return brandSecurityScoreDeltaId(`ssd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`);
}

/** Generate a unique DependencyImpactId */
export function generateDependencyImpactId(): DependencyImpactId {
  return brandDependencyImpactId(`di_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`);
}

/** Generate a unique RemediationCandidateId */
export function generateRemediationCandidateId(): RemediationCandidateId {
  return brandRemediationCandidateId(`rc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`);
}

// ─── Impact Scenario ─────────────────────────────────────────

/** Input for creating an ImpactScenario */
export interface ImpactScenarioInput {
  readonly type: MitigationScenarioType;
  readonly targetId: string;
  readonly targetType: 'finding' | 'correlation' | 'asset' | 'vulnerability' | 'service' | 'endpoint' | 'credential' | 'network';
  readonly description?: string;
  readonly parameters?: Readonly<Record<string, string | number | boolean>>;
  readonly attackPaths?: readonly AttackPathId[];
  readonly riskAssessmentIds?: readonly RiskAssessmentId[];
  readonly correlationGroupIds?: readonly CorrelationGroupId[];
  readonly metadata?: Metadata;
}

/** Create an immutable ImpactScenario */
export function createImpactScenario(input: ImpactScenarioInput): ImpactScenario {
  if (!input.type) throw new Error('ImpactScenario requires type');
  if (!input.targetId) throw new Error('ImpactScenario requires targetId');

  return Object.freeze({
    id: generateImpactScenarioId(),
    type: input.type,
    targetId: input.targetId,
    targetType: input.targetType,
    description: input.description ?? `Mitigation scenario: ${input.type} on ${input.targetId}`,
    parameters: Object.freeze({ ...(input.parameters ?? {}) }),
    attackPaths: Object.freeze([...(input.attackPaths ?? [])]),
    riskAssessmentIds: Object.freeze([...(input.riskAssessmentIds ?? [])]),
    correlationGroupIds: Object.freeze([...(input.correlationGroupIds ?? [])]),
    createdAt: new Date().toISOString() as Timestamp,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

// ─── Mitigation Effect ───────────────────────────────────────

/** Input for creating a MitigationEffect */
export interface MitigationEffectInput {
  readonly scenarioId: ImpactScenarioId;
  readonly riskReduction?: number;
  readonly attackSurfaceReduction?: number;
  readonly businessImpact?: number;
  readonly confidenceImprovement?: number;
  readonly exploitabilityReduction?: number;
  readonly estimatedCost?: number;
  readonly implementationComplexity?: number;
  readonly metadata?: Metadata;
}

/** Create an immutable MitigationEffect */
export function createMitigationEffect(input: MitigationEffectInput): MitigationEffect {
  if (!input.scenarioId) throw new Error('MitigationEffect requires scenarioId');

  return Object.freeze({
    id: generateMitigationEffectId(),
    scenarioId: input.scenarioId,
    riskReduction: clamp01(input.riskReduction ?? 0),
    attackSurfaceReduction: clamp01(input.attackSurfaceReduction ?? 0),
    businessImpact: clamp01(input.businessImpact ?? 0),
    confidenceImprovement: clamp01(input.confidenceImprovement ?? 0),
    exploitabilityReduction: clamp01(input.exploitabilityReduction ?? 0),
    estimatedCost: clamp01(input.estimatedCost ?? 0),
    implementationComplexity: clamp01(input.implementationComplexity ?? 0),
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

// ─── Attack Path Delta ───────────────────────────────────────

/** Input for creating an AttackPathDeltaDetail */
export interface AttackPathDeltaDetailInput {
  readonly pathId: AttackPathId;
  readonly changeType: AttackPathChangeType;
  readonly riskBefore: number;
  readonly riskAfter: number;
  readonly lengthBefore: number;
  readonly lengthAfter: number;
  readonly probabilityBefore: number;
  readonly probabilityAfter: number;
}

/** Create an immutable AttackPathDeltaDetail */
export function createAttackPathDeltaDetail(input: AttackPathDeltaDetailInput): AttackPathDeltaDetail {
  return Object.freeze({
    pathId: input.pathId,
    changeType: input.changeType,
    riskBefore: clamp01(input.riskBefore),
    riskAfter: clamp01(input.riskAfter),
    riskDelta: input.riskAfter - input.riskBefore,
    lengthBefore: input.lengthBefore,
    lengthAfter: input.lengthAfter,
    lengthDelta: input.lengthAfter - input.lengthBefore,
    probabilityBefore: clamp01(input.probabilityBefore),
    probabilityAfter: clamp01(input.probabilityAfter),
    probabilityDelta: input.probabilityAfter - input.probabilityBefore,
  });
}

/** Input for creating an AttackPathDelta */
export interface AttackPathDeltaInput {
  readonly scenarioId: ImpactScenarioId;
  readonly eliminatedPaths?: readonly AttackPathId[];
  readonly shortenedPaths?: readonly AttackPathDeltaDetail[];
  readonly reducedPaths?: readonly AttackPathDeltaDetail[];
  readonly unchangedPaths?: readonly AttackPathId[];
  readonly totalBefore?: number;
  readonly totalAfter?: number;
  readonly metadata?: Metadata;
}

/** Create an immutable AttackPathDelta */
export function createAttackPathDelta(input: AttackPathDeltaInput): AttackPathDelta {
  const eliminated = input.eliminatedPaths ?? [];
  const shortened = input.shortenedPaths ?? [];
  const reduced = input.reducedPaths ?? [];
  const unchanged = input.unchangedPaths ?? [];
  const totalBefore = input.totalBefore ?? eliminated.length + shortened.length + reduced.length + unchanged.length;
  const totalAfter = input.totalAfter ?? shortened.length + reduced.length + unchanged.length;

  return Object.freeze({
    id: generateAttackPathDeltaId(),
    scenarioId: input.scenarioId,
    eliminatedPaths: Object.freeze([...eliminated]),
    shortenedPaths: Object.freeze([...shortened]),
    reducedPaths: Object.freeze([...reduced]),
    unchangedPaths: Object.freeze([...unchanged]),
    totalBefore,
    totalAfter,
    netChange: totalAfter - totalBefore,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

// ─── Risk Delta ──────────────────────────────────────────────

/** Input for creating a RiskAssessmentDelta */
export interface RiskAssessmentDeltaInput {
  readonly assessmentId: RiskAssessmentId;
  readonly findingId: FindingId;
  readonly scoreBefore: number;
  readonly scoreAfter: number;
  readonly levelBefore: RiskLevel;
  readonly levelAfter: RiskLevel;
}

/** Create an immutable RiskAssessmentDelta */
export function createRiskAssessmentDelta(input: RiskAssessmentDeltaInput): RiskAssessmentDelta {
  return Object.freeze({
    assessmentId: input.assessmentId,
    findingId: input.findingId,
    scoreBefore: clamp01(input.scoreBefore),
    scoreAfter: clamp01(input.scoreAfter),
    scoreDelta: input.scoreAfter - input.scoreBefore,
    levelBefore: input.levelBefore,
    levelAfter: input.levelAfter,
    levelChanged: input.levelBefore !== input.levelAfter,
  });
}

/** Input for creating a RiskDelta */
export interface RiskDeltaInput {
  readonly scenarioId: ImpactScenarioId;
  readonly overallBefore: number;
  readonly overallAfter: number;
  readonly levelBefore: RiskLevel;
  readonly levelAfter: RiskLevel;
  readonly perAssessmentDeltas?: readonly RiskAssessmentDelta[];
  readonly metadata?: Metadata;
}

/** Create an immutable RiskDelta */
export function createRiskDelta(input: RiskDeltaInput): RiskDelta {
  return Object.freeze({
    id: generateRiskDeltaId(),
    scenarioId: input.scenarioId,
    overallBefore: clamp01(input.overallBefore),
    overallAfter: clamp01(input.overallAfter),
    overallDifference: input.overallBefore - input.overallAfter, // Positive = improvement
    levelBefore: input.levelBefore,
    levelAfter: input.levelAfter,
    levelChanged: input.levelBefore !== input.levelAfter,
    perAssessmentDeltas: Object.freeze([...(input.perAssessmentDeltas ?? [])]),
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

// ─── Security Score Delta ────────────────────────────────────

/** Input for creating a SecurityScoreDelta */
export interface SecurityScoreDeltaInput {
  readonly scenarioId: ImpactScenarioId;
  readonly scoreBefore: number;             // 0–100
  readonly scoreAfter: number;              // 0–100
  readonly metadata?: Metadata;
}

/** Compute a security grade from a score (0–100) */
export function computeSecurityGrade(score: number): SecurityGrade {
  if (score >= 90) return SecurityGrade.A;
  if (score >= 75) return SecurityGrade.B;
  if (score >= 55) return SecurityGrade.C;
  if (score >= 35) return SecurityGrade.D;
  return SecurityGrade.F;
}

/** Compute a security score (0–100) from an overall risk (0.0–1.0) */
export function computeSecurityScore(overallRisk: number): number {
  return Math.round((1 - clamp01(overallRisk)) * 100);
}

/** Create an immutable SecurityScoreDelta */
export function createSecurityScoreDelta(input: SecurityScoreDeltaInput): SecurityScoreDelta {
  const scoreBefore = Math.max(0, Math.min(100, Math.round(input.scoreBefore)));
  const scoreAfter = Math.max(0, Math.min(100, Math.round(input.scoreAfter)));
  const gradeBefore = computeSecurityGrade(scoreBefore);
  const gradeAfter = computeSecurityGrade(scoreAfter);

  return Object.freeze({
    id: generateSecurityScoreDeltaId(),
    scenarioId: input.scenarioId,
    scoreBefore,
    scoreAfter,
    scoreDelta: scoreAfter - scoreBefore,
    gradeBefore,
    gradeAfter,
    gradeChanged: gradeBefore !== gradeAfter,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

// ─── Dependency Impact ───────────────────────────────────────

/** Input for creating a DependencyImpact */
export interface DependencyImpactInput {
  readonly scenarioId: ImpactScenarioId;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly affectedType: string;
  readonly affectedId: string;
  readonly impactType?: 'direct' | 'indirect' | 'cascading';
  readonly impactScore?: number;
  readonly description?: string;
  readonly metadata?: Metadata;
}

/** Create an immutable DependencyImpact */
export function createDependencyImpact(input: DependencyImpactInput): DependencyImpact {
  if (!input.sourceId) throw new Error('DependencyImpact requires sourceId');
  if (!input.affectedId) throw new Error('DependencyImpact requires affectedId');

  return Object.freeze({
    id: generateDependencyImpactId(),
    scenarioId: input.scenarioId,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    affectedType: input.affectedType,
    affectedId: input.affectedId,
    impactType: input.impactType ?? 'direct',
    impactScore: clamp01(input.impactScore ?? 0),
    description: input.description ?? `${input.sourceType} ${input.sourceId} affects ${input.affectedType} ${input.affectedId}`,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

// ─── Remediation Candidate ──────────────────────────────────

/** Input for creating a RemediationCandidate */
export interface RemediationCandidateInput {
  readonly scenarioId: ImpactScenarioId;
  readonly targetType: MitigationScenarioType;
  readonly targetId: string;
  readonly targetLabel: string;
  readonly riskReduction?: number;
  readonly attackSurfaceReduction?: number;
  readonly businessImpact?: number;
  readonly confidenceImprovement?: number;
  readonly exploitabilityReduction?: number;
  readonly estimatedCost?: number;
  readonly implementationComplexity?: number;
  readonly pathsEliminated?: number;
  readonly pathsReduced?: number;
  readonly pathsAffected?: number;
  readonly rank?: number;
  readonly score?: number;
  readonly metadata?: Metadata;
}

/** Create an immutable RemediationCandidate */
export function createRemediationCandidate(input: RemediationCandidateInput): RemediationCandidate {
  if (!input.targetId) throw new Error('RemediationCandidate requires targetId');

  const riskReduction = clamp01(input.riskReduction ?? 0);
  const attackSurfaceReduction = clamp01(input.attackSurfaceReduction ?? 0);
  const businessImpact = clamp01(input.businessImpact ?? 0);
  const confidenceImprovement = clamp01(input.confidenceImprovement ?? 0);
  const exploitabilityReduction = clamp01(input.exploitabilityReduction ?? 0);
  const estimatedCost = clamp01(input.estimatedCost ?? 0);
  const implementationComplexity = clamp01(input.implementationComplexity ?? 0);

  const score = input.score ?? computeRemediationScore({
    riskReduction, attackSurfaceReduction, businessImpact,
    confidenceImprovement, exploitabilityReduction, estimatedCost,
  });

  return Object.freeze({
    id: generateRemediationCandidateId(),
    scenarioId: input.scenarioId,
    targetType: input.targetType,
    targetId: input.targetId,
    targetLabel: input.targetLabel,
    riskReduction,
    attackSurfaceReduction,
    businessImpact,
    confidenceImprovement,
    exploitabilityReduction,
    estimatedCost,
    implementationComplexity,
    pathsEliminated: input.pathsEliminated ?? 0,
    pathsReduced: input.pathsReduced ?? 0,
    pathsAffected: input.pathsAffected ?? 0,
    rank: input.rank ?? 0,
    score: clamp01(score),
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

/** Compute a composite remediation score */
export function computeRemediationScore(params: {
  riskReduction: number;
  attackSurfaceReduction: number;
  businessImpact: number;
  confidenceImprovement: number;
  exploitabilityReduction: number;
  estimatedCost: number;
}): number {
  const riskWeight = 0.30;
  const surfaceWeight = 0.25;
  const impactWeight = 0.15;
  const confidenceWeight = 0.10;
  const exploitWeight = 0.10;
  const costWeight = 0.10;

  // Cost is inverted: lower cost = higher score
  const costScore = 1 - params.estimatedCost;

  return clamp01(
    riskWeight * params.riskReduction +
    surfaceWeight * params.attackSurfaceReduction +
    impactWeight * params.businessImpact +
    confidenceWeight * params.confidenceImprovement +
    exploitWeight * params.exploitabilityReduction +
    costWeight * costScore
  );
}

// ─── Impact Analysis ─────────────────────────────────────────

/** Input for creating an ImpactAnalysis */
export interface ImpactAnalysisInput {
  readonly scenarioId: ImpactScenarioId;
  readonly scenarioType: MitigationScenarioType;
  readonly attackPathDelta: AttackPathDelta;
  readonly riskDelta: RiskDelta;
  readonly securityScoreDelta: SecurityScoreDelta;
  readonly dependencyImpacts?: readonly DependencyImpact[];
  readonly mitigationEffect: MitigationEffect;
  readonly remediationCandidate: RemediationCandidate;
  readonly analysisDurationMs?: number;
  readonly metadata?: Metadata;
}

/** Create an immutable ImpactAnalysis */
export function createImpactAnalysis(input: ImpactAnalysisInput): ImpactAnalysis {
  return Object.freeze({
    id: generateImpactAnalysisId(),
    scenarioId: input.scenarioId,
    scenarioType: input.scenarioType,
    attackPathDelta: input.attackPathDelta,
    riskDelta: input.riskDelta,
    securityScoreDelta: input.securityScoreDelta,
    dependencyImpacts: Object.freeze([...(input.dependencyImpacts ?? [])]),
    mitigationEffect: input.mitigationEffect,
    remediationCandidate: input.remediationCandidate,
    analyzedAt: new Date().toISOString() as Timestamp,
    analysisDurationMs: input.analysisDurationMs ?? 0,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

// ─── Serialization ───────────────────────────────────────────

/** Serialize an ImpactAnalysis to JSON */
export function impactAnalysisToJSON(analysis: ImpactAnalysis): string {
  return JSON.stringify(analysis, null, 2);
}

/** Deserialize an ImpactAnalysis from JSON with validation */
export function impactAnalysisFromJSON(json: string): ImpactAnalysis {
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON: cannot deserialize ImpactAnalysis');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid ImpactAnalysis JSON: expected object');
  }

  if (!parsed.id || typeof parsed.id !== 'string') {
    throw new Error('Invalid ImpactAnalysis JSON: missing or invalid id');
  }

  if (!parsed.scenarioId || typeof parsed.scenarioId !== 'string') {
    throw new Error('Invalid ImpactAnalysis JSON: missing or invalid scenarioId');
  }

  if (!parsed.scenarioType || typeof parsed.scenarioType !== 'string') {
    throw new Error('Invalid ImpactAnalysis JSON: missing or invalid scenarioType');
  }

  if (!parsed.attackPathDelta || typeof parsed.attackPathDelta !== 'object') {
    throw new Error('Invalid ImpactAnalysis JSON: missing or invalid attackPathDelta');
  }

  if (!parsed.riskDelta || typeof parsed.riskDelta !== 'object') {
    throw new Error('Invalid ImpactAnalysis JSON: missing or invalid riskDelta');
  }

  if (!parsed.securityScoreDelta || typeof parsed.securityScoreDelta !== 'object') {
    throw new Error('Invalid ImpactAnalysis JSON: missing or invalid securityScoreDelta');
  }

  if (!parsed.mitigationEffect || typeof parsed.mitigationEffect !== 'object') {
    throw new Error('Invalid ImpactAnalysis JSON: missing or invalid mitigationEffect');
  }

  if (!parsed.remediationCandidate || typeof parsed.remediationCandidate !== 'object') {
    throw new Error('Invalid ImpactAnalysis JSON: missing or invalid remediationCandidate');
  }

  return Object.freeze({
    ...parsed,
    dependencyImpacts: Object.freeze(parsed.dependencyImpacts ?? []),
    metadata: Object.freeze(parsed.metadata ?? {}),
  });
}

// ─── Equality / Clone / Hash ─────────────────────────────────

/** Check two ImpactAnalyses for equality (by ID) */
export function impactAnalysesEqual(a: ImpactAnalysis, b: ImpactAnalysis): boolean {
  return a.id === b.id;
}

/** Check two ImpactScenarios for equality (by ID) */
export function impactScenariosEqual(a: ImpactScenario, b: ImpactScenario): boolean {
  return a.id === b.id;
}

/** Check two RemediationCandidates for equality (by ID) */
export function remediationCandidatesEqual(a: RemediationCandidate, b: RemediationCandidate): boolean {
  return a.id === b.id;
}

/** Clone an ImpactAnalysis (deep clone via JSON round-trip) */
export function cloneImpactAnalysis(analysis: ImpactAnalysis): ImpactAnalysis {
  return impactAnalysisFromJSON(impactAnalysisToJSON(analysis));
}

/** Compute a hash for an ImpactAnalysis */
export function hashImpactAnalysis(analysis: ImpactAnalysis): number {
  let hash = 0;
  const str = analysis.id;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
}

// ─── Internal Helpers ────────────────────────────────────────

/** Clamp a number to [0.0, 1.0] */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
