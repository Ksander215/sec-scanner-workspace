/**
 * Security Intelligence Recommendation Engine — Domain Models
 *
 * Factory functions for creating immutable recommendation domain models.
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
  RecommendationId, RecommendationGroupId, RecommendationActionId,
  RemediationPlanId, RemediationTaskId, RecommendationEvidenceId,
  RecommendationStatisticsId, RecommendationCostId, RecommendationBenefitId,
  Timestamp, Metadata,
  Recommendation, RecommendationGroup, RecommendationAction,
  RemediationPlan, RemediationTask, RecommendationEvidence,
  RecommendationStatistics, RecommendationCost, RecommendationBenefit,
  RecommendationRanking, ExplainabilityData, Conflict, ConflictResolution,
} from '../types/index.ts';
import {
  brandRecommendationId, brandRecommendationGroupId, brandRecommendationActionId,
  brandRemediationPlanId, brandRemediationTaskId, brandRecommendationEvidenceId,
  brandRecommendationStatisticsId, brandRecommendationCostId, brandRecommendationBenefitId,
  RecommendationRuleType, RecommendationSource, PlanningStrategy,
  ConflictType, ActionStatus, RecommendationSeverity,
} from '../types/index.ts';
import type { FindingId } from '../../normalization/types/index.ts';
import type { CorrelationGroupId } from '../../correlation/types/index.ts';
import type { AttackPathId } from '../../attack-path/types/index.ts';
import type { ImpactAnalysisId } from '../../impact/types/index.ts';
import type { AssetId } from '../../normalization/types/index.ts';

// ─── ID Generation ───────────────────────────────────────────

// Deterministic monotonic counters — no Math.random(), no Date.now().
// Same call order always produces the same IDs within a process.
let _recCounter = 0;
let _rgCounter = 0;
let _raCounter = 0;
let _rpCounter = 0;
let _rtCounter = 0;
let _revCounter = 0;
let _rsCounter = 0;
let _rcCounter = 0;
let _rbCounter = 0;
let _conflictCounter = 0;

/** Generate a unique RecommendationId */
export function generateRecommendationId(): RecommendationId {
  return brandRecommendationId(`rec_${++_recCounter}`);
}

/** Generate a unique RecommendationGroupId */
export function generateRecommendationGroupId(): RecommendationGroupId {
  return brandRecommendationGroupId(`rg_${++_rgCounter}`);
}

/** Generate a unique RecommendationActionId */
export function generateRecommendationActionId(): RecommendationActionId {
  return brandRecommendationActionId(`ra_${++_raCounter}`);
}

/** Generate a unique RemediationPlanId */
export function generateRemediationPlanId(): RemediationPlanId {
  return brandRemediationPlanId(`rp_${++_rpCounter}`);
}

/** Generate a unique RemediationTaskId */
export function generateRemediationTaskId(): RemediationTaskId {
  return brandRemediationTaskId(`rt_${++_rtCounter}`);
}

/** Generate a unique RecommendationEvidenceId */
export function generateRecommendationEvidenceId(): RecommendationEvidenceId {
  return brandRecommendationEvidenceId(`rev_${++_revCounter}`);
}

/** Generate a unique RecommendationStatisticsId */
export function generateRecommendationStatisticsId(): RecommendationStatisticsId {
  return brandRecommendationStatisticsId(`rs_${++_rsCounter}`);
}

/** Generate a unique RecommendationCostId */
export function generateRecommendationCostId(): RecommendationCostId {
  return brandRecommendationCostId(`rc_${++_rcCounter}`);
}

/** Generate a unique RecommendationBenefitId */
export function generateRecommendationBenefitId(): RecommendationBenefitId {
  return brandRecommendationBenefitId(`rb_${++_rbCounter}`);
}

/** Generate a unique conflict ID (deterministic) */
export function generateConflictId(): string {
  return `conflict_${++_conflictCounter}`;
}

// ─── Recommendation Cost ────────────────────────────────────

/** Input for creating a RecommendationCost */
export interface RecommendationCostInput {
  readonly recommendationId: RecommendationId;
  readonly implementationCost?: number;
  readonly operationalCost?: number;
  readonly effortHours?: number;
  readonly complexity?: number;
  readonly disruption?: number;
  readonly metadata?: Metadata;
}

/** Create an immutable RecommendationCost */
export function createRecommendationCost(input: RecommendationCostInput): RecommendationCost {
  if (!input.recommendationId) throw new Error('RecommendationCost requires recommendationId');

  const implementationCost = clamp01(input.implementationCost ?? 0);
  const operationalCost = clamp01(input.operationalCost ?? 0);
  const complexity = clamp01(input.complexity ?? 0);
  const disruption = clamp01(input.disruption ?? 0);

  const totalCost = computeTotalCost(implementationCost, operationalCost, complexity, disruption);

  return Object.freeze({
    id: generateRecommendationCostId(),
    recommendationId: input.recommendationId,
    implementationCost,
    operationalCost,
    effortHours: Math.max(0, input.effortHours ?? 0),
    complexity,
    disruption,
    totalCost: clamp01(totalCost),
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

/** Compute composite total cost */
export function computeTotalCost(
  implementationCost: number,
  operationalCost: number,
  complexity: number,
  disruption: number,
): number {
  return 0.35 * implementationCost + 0.20 * operationalCost + 0.25 * complexity + 0.20 * disruption;
}

// ─── Recommendation Benefit ─────────────────────────────────

/** Input for creating a RecommendationBenefit */
export interface RecommendationBenefitInput {
  readonly recommendationId: RecommendationId;
  readonly riskReduction?: number;
  readonly attackPathElimination?: number;
  readonly complianceImprovement?: number;
  readonly securityScoreImprovement?: number;
  readonly confidenceImprovement?: number;
  readonly coverageImprovement?: number;
  readonly metadata?: Metadata;
}

/** Create an immutable RecommendationBenefit */
export function createRecommendationBenefit(input: RecommendationBenefitInput): RecommendationBenefit {
  if (!input.recommendationId) throw new Error('RecommendationBenefit requires recommendationId');

  const riskReduction = clamp01(input.riskReduction ?? 0);
  const attackPathElimination = clamp01(input.attackPathElimination ?? 0);
  const complianceImprovement = clamp01(input.complianceImprovement ?? 0);
  const confidenceImprovement = clamp01(input.confidenceImprovement ?? 0);
  const coverageImprovement = clamp01(input.coverageImprovement ?? 0);

  const totalBenefit = computeTotalBenefit(
    riskReduction, attackPathElimination, complianceImprovement,
    confidenceImprovement, coverageImprovement,
  );

  return Object.freeze({
    id: generateRecommendationBenefitId(),
    recommendationId: input.recommendationId,
    riskReduction,
    attackPathElimination,
    complianceImprovement,
    securityScoreImprovement: Math.max(0, Math.min(100, Math.round(input.securityScoreImprovement ?? 0))),
    confidenceImprovement,
    coverageImprovement,
    totalBenefit: clamp01(totalBenefit),
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

/** Compute composite total benefit */
export function computeTotalBenefit(
  riskReduction: number,
  attackPathElimination: number,
  complianceImprovement: number,
  confidenceImprovement: number,
  coverageImprovement: number,
): number {
  return 0.30 * riskReduction + 0.25 * attackPathElimination + 0.20 * complianceImprovement + 0.15 * confidenceImprovement + 0.10 * coverageImprovement;
}

// ─── Recommendation Evidence ────────────────────────────────

/** Create an immutable RecommendationEvidence */
export function createRecommendationEvidence(params: {
  readonly recommendationId: RecommendationId;
  readonly sourceType: RecommendationSource;
  readonly sourceId: string;
  readonly field: string;
  readonly value: string | number | boolean | null;
  readonly confidence: number;
  readonly description: string;
}): RecommendationEvidence {
  return Object.freeze({
    id: generateRecommendationEvidenceId(),
    recommendationId: params.recommendationId,
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    field: params.field,
    value: params.value,
    confidence: clamp01(params.confidence),
    description: params.description,
  });
}

// ─── Explainability Data ────────────────────────────────────

/** Create an immutable ExplainabilityData */
export function createExplainabilityData(params: {
  readonly whyGenerated: readonly string[];
  readonly affectedFindings: readonly FindingId[];
  readonly affectedAttackPaths: readonly AttackPathId[];
  readonly expectedRiskDelta: number;
  readonly expectedScoreDelta: number;
  readonly confidenceReasoning?: Readonly<Record<string, number>>;
}): ExplainabilityData {
  const reasoning: Record<string, number> = {};
  if (params.confidenceReasoning) {
    for (const [key, value] of Object.entries(params.confidenceReasoning)) {
      reasoning[key] = clamp01(value);
    }
  }

  return Object.freeze({
    whyGenerated: Object.freeze([...params.whyGenerated]),
    affectedFindings: Object.freeze([...params.affectedFindings]),
    affectedAttackPaths: Object.freeze([...params.affectedAttackPaths]),
    expectedRiskDelta: clamp01(params.expectedRiskDelta),
    expectedScoreDelta: Math.max(0, Math.min(100, Math.round(params.expectedScoreDelta))),
    confidenceReasoning: Object.freeze(reasoning),
  });
}

// ─── Recommendation Ranking ─────────────────────────────────

/** Input for creating a RecommendationRanking */
export interface RecommendationRankingInput {
  readonly riskReductionScore?: number;
  readonly attackPathEliminationScore?: number;
  readonly costScore?: number;
  readonly confidenceScore?: number;
  readonly businessImpactScore?: number;
  readonly fixComplexityScore?: number;
  readonly coverageScore?: number;
  readonly timeToRemediateScore?: number;
  readonly config?: {
    readonly riskReductionWeight: number;
    readonly attackPathEliminationWeight: number;
    readonly costWeight: number;
    readonly confidenceWeight: number;
    readonly businessImpactWeight: number;
    readonly fixComplexityWeight: number;
    readonly coverageWeight: number;
    readonly timeToRemediateWeight: number;
  };
  readonly rank?: number;
}

/** Compute overall ranking score */
export function computeOverallRankingScore(
  scores: Omit<RecommendationRankingInput, 'rank' | 'config'>,
  config: NonNullable<RecommendationRankingInput['config']>,
): number {
  return clamp01(
    config.riskReductionWeight * (scores.riskReductionScore ?? 0) +
    config.attackPathEliminationWeight * (scores.attackPathEliminationScore ?? 0) +
    config.costWeight * (scores.costScore ?? 0) +
    config.confidenceWeight * (scores.confidenceScore ?? 0) +
    config.businessImpactWeight * (scores.businessImpactScore ?? 0) +
    config.fixComplexityWeight * (scores.fixComplexityScore ?? 0) +
    config.coverageWeight * (scores.coverageScore ?? 0) +
    config.timeToRemediateWeight * (scores.timeToRemediateScore ?? 0),
  );
}

/** Create an immutable RecommendationRanking */
export function createRecommendationRanking(input: RecommendationRankingInput): RecommendationRanking {
  const config = input.config ?? {
    riskReductionWeight: 0.20,
    attackPathEliminationWeight: 0.15,
    costWeight: 0.10,
    confidenceWeight: 0.10,
    businessImpactWeight: 0.15,
    fixComplexityWeight: 0.10,
    coverageWeight: 0.10,
    timeToRemediateWeight: 0.10,
  };

  const overallScore = computeOverallRankingScore(input, config);

  return Object.freeze({
    overallScore,
    riskReductionScore: clamp01(input.riskReductionScore ?? 0),
    attackPathEliminationScore: clamp01(input.attackPathEliminationScore ?? 0),
    costScore: clamp01(input.costScore ?? 0),
    confidenceScore: clamp01(input.confidenceScore ?? 0),
    businessImpactScore: clamp01(input.businessImpactScore ?? 0),
    fixComplexityScore: clamp01(input.fixComplexityScore ?? 0),
    coverageScore: clamp01(input.coverageScore ?? 0),
    timeToRemediateScore: clamp01(input.timeToRemediateScore ?? 0),
    rank: input.rank ?? 0,
  });
}

// ─── Conflict ───────────────────────────────────────────────

/** Create an immutable Conflict */
export function createConflict(params: {
  readonly type: ConflictType;
  readonly recommendationIdA: RecommendationId;
  readonly recommendationIdB: RecommendationId;
  readonly description: string;
  readonly resolution?: ConflictResolution | null;
  readonly severity?: 'critical' | 'high' | 'medium' | 'low';
  readonly metadata?: Metadata;
}): Conflict {
  return Object.freeze({
    id: generateConflictId(),
    type: params.type,
    recommendationIdA: params.recommendationIdA,
    recommendationIdB: params.recommendationIdB,
    description: params.description,
    resolution: params.resolution ?? null,
    severity: params.severity ?? 'medium',
    metadata: Object.freeze({ ...(params.metadata ?? {}) }),
  });
}

// ─── Recommendation ─────────────────────────────────────────

/** Input for creating a Recommendation */
export interface RecommendationInput {
  readonly ruleType: RecommendationRuleType;
  readonly source: RecommendationSource;
  readonly sourceId: string;
  readonly title: string;
  readonly description: string;
  readonly severity: RecommendationSeverity;
  readonly targetId: string;
  readonly targetType: string;
  readonly targetLabel: string;
  readonly findingIds?: readonly FindingId[];
  readonly correlationGroupIds?: readonly CorrelationGroupId[];
  readonly attackPathIds?: readonly AttackPathId[];
  readonly impactAnalysisId?: ImpactAnalysisId | null;
  readonly cost: RecommendationCost;
  readonly benefit: RecommendationBenefit;
  readonly evidence?: readonly RecommendationEvidence[];
  readonly ranking?: RecommendationRanking;
  readonly explainability?: ExplainabilityData;
  readonly status?: ActionStatus;
  readonly metadata?: Metadata;
}

/** Create an immutable Recommendation */
export function createRecommendation(input: RecommendationInput): Recommendation {
  if (!input.sourceId) throw new Error('Recommendation requires sourceId');
  if (!input.title) throw new Error('Recommendation requires title');
  if (!input.targetId) throw new Error('Recommendation requires targetId');

  const id = generateRecommendationId();
  const cost = input.cost;
  const benefit = input.benefit;

  // If cost/benefit were created with a placeholder recommendationId, update them
  const finalCost = cost.recommendationId === id ? cost : createRecommendationCost({
    ...cost,
    recommendationId: id,
    metadata: cost.metadata,
  });
  const finalBenefit = benefit.recommendationId === id ? benefit : createRecommendationBenefit({
    ...benefit,
    recommendationId: id,
    metadata: benefit.metadata,
  });

  // Generate ranking from cost/benefit if not provided
  const ranking = input.ranking ?? createRecommendationRanking({
    riskReductionScore: benefit.riskReduction,
    attackPathEliminationScore: benefit.attackPathElimination,
    costScore: 1 - cost.totalCost,
    confidenceScore: benefit.confidenceImprovement,
    businessImpactScore: benefit.riskReduction * 0.6 + benefit.attackPathElimination * 0.4,
    fixComplexityScore: 1 - cost.complexity,
    coverageScore: benefit.coverageImprovement,
    timeToRemediateScore: 1 - clamp01(cost.effortHours / 200),
  });

  return Object.freeze({
    id,
    ruleType: input.ruleType,
    source: input.source,
    sourceId: input.sourceId,
    title: input.title,
    description: input.description,
    severity: input.severity,
    targetId: input.targetId,
    targetType: input.targetType,
    targetLabel: input.targetLabel,
    findingIds: Object.freeze([...(input.findingIds ?? [])]),
    correlationGroupIds: Object.freeze([...(input.correlationGroupIds ?? [])]),
    attackPathIds: Object.freeze([...(input.attackPathIds ?? [])]),
    impactAnalysisId: input.impactAnalysisId ?? null,
    cost: finalCost,
    benefit: finalBenefit,
    evidence: Object.freeze([...(input.evidence ?? [])]),
    ranking,
    explainability: input.explainability ?? createExplainabilityData({
      whyGenerated: [input.ruleType],
      affectedFindings: input.findingIds ?? [],
      affectedAttackPaths: input.attackPathIds ?? [],
      expectedRiskDelta: benefit.riskReduction,
      expectedScoreDelta: benefit.securityScoreImprovement,
    }),
    status: input.status ?? ActionStatus.Pending,
    createdAt: new Date().toISOString() as Timestamp,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

// ─── Recommendation Group ───────────────────────────────────

/** Input for creating a RecommendationGroup */
export interface RecommendationGroupInput {
  readonly name: string;
  readonly description?: string;
  readonly recommendationIds: readonly RecommendationId[];
  readonly dominantRuleType: RecommendationRuleType;
  readonly dominantSeverity: RecommendationSeverity;
  readonly targetAssetId?: AssetId | null;
  readonly aggregateRiskReduction?: number;
  readonly aggregateCost?: number;
  readonly metadata?: Metadata;
}

/** Create an immutable RecommendationGroup */
export function createRecommendationGroup(input: RecommendationGroupInput): RecommendationGroup {
  if (!input.name) throw new Error('RecommendationGroup requires name');

  return Object.freeze({
    id: generateRecommendationGroupId(),
    name: input.name,
    description: input.description ?? `Group: ${input.name}`,
    recommendationIds: Object.freeze([...input.recommendationIds]),
    dominantRuleType: input.dominantRuleType,
    dominantSeverity: input.dominantSeverity,
    targetAssetId: input.targetAssetId ?? null,
    aggregateRiskReduction: clamp01(input.aggregateRiskReduction ?? 0),
    aggregateCost: clamp01(input.aggregateCost ?? 0),
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

// ─── Recommendation Action ──────────────────────────────────

/** Input for creating a RecommendationAction */
export interface RecommendationActionInput {
  readonly recommendationId: RecommendationId;
  readonly planId: RemediationPlanId;
  readonly order?: number;
  readonly status?: ActionStatus;
  readonly dependsOn?: readonly RecommendationActionId[];
  readonly blocks?: readonly RecommendationActionId[];
  readonly estimatedEffortHours?: number;
  readonly actualEffortHours?: number | null;
  readonly startedAt?: Timestamp | null;
  readonly completedAt?: Timestamp | null;
  readonly metadata?: Metadata;
}

/** Create an immutable RecommendationAction */
export function createRecommendationAction(input: RecommendationActionInput): RecommendationAction {
  if (!input.recommendationId) throw new Error('RecommendationAction requires recommendationId');
  if (!input.planId) throw new Error('RecommendationAction requires planId');

  return Object.freeze({
    id: generateRecommendationActionId(),
    recommendationId: input.recommendationId,
    planId: input.planId,
    order: input.order ?? 0,
    status: input.status ?? ActionStatus.Pending,
    dependsOn: Object.freeze([...(input.dependsOn ?? [])]),
    blocks: Object.freeze([...(input.blocks ?? [])]),
    estimatedEffortHours: Math.max(0, input.estimatedEffortHours ?? 0),
    actualEffortHours: input.actualEffortHours ?? null,
    startedAt: input.startedAt ?? null,
    completedAt: input.completedAt ?? null,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

// ─── Remediation Plan ───────────────────────────────────────

/** Input for creating a RemediationPlan */
export interface RemediationPlanInput {
  readonly name: string;
  readonly description?: string;
  readonly strategy: PlanningStrategy;
  readonly actions: readonly RecommendationAction[];
  readonly recommendations: readonly Recommendation[];
  readonly groups?: readonly RecommendationGroup[];
  readonly conflicts?: readonly Conflict[];
  readonly totalEstimatedCost?: number;
  readonly totalEstimatedEffortHours?: number;
  readonly totalRiskReduction?: number;
  readonly totalAttackSurfaceReduction?: number;
  readonly coverageScore?: number;
  readonly priority?: number;
  readonly metadata?: Metadata;
}

/** Create an immutable RemediationPlan */
export function createRemediationPlan(input: RemediationPlanInput): RemediationPlan {
  if (!input.name) throw new Error('RemediationPlan requires name');
  if (!input.strategy) throw new Error('RemediationPlan requires strategy');

  const totalRiskReduction = input.totalRiskReduction ?? computePlanRiskReduction(input.recommendations);
  const totalAttackSurfaceReduction = input.totalAttackSurfaceReduction ?? computePlanAttackSurfaceReduction(input.recommendations);
  const totalEstimatedCost = input.totalEstimatedCost ?? computePlanCost(input.recommendations);
  const totalEstimatedEffortHours = input.totalEstimatedEffortHours ?? computePlanEffort(input.recommendations);
  const coverageScore = input.coverageScore ?? computePlanCoverage(input.recommendations);
  const priority = input.priority ?? computePlanPriority(totalRiskReduction, totalEstimatedCost, coverageScore);

  return Object.freeze({
    id: generateRemediationPlanId(),
    name: input.name,
    description: input.description ?? `Remediation plan: ${input.name}`,
    strategy: input.strategy,
    actions: Object.freeze([...input.actions]),
    recommendations: Object.freeze([...input.recommendations]),
    groups: Object.freeze([...(input.groups ?? [])]),
    conflicts: Object.freeze([...(input.conflicts ?? [])]),
    totalEstimatedCost: clamp01(totalEstimatedCost),
    totalEstimatedEffortHours,
    totalRiskReduction: clamp01(totalRiskReduction),
    totalAttackSurfaceReduction: clamp01(totalAttackSurfaceReduction),
    coverageScore: clamp01(coverageScore),
    priority: Math.max(0, Math.min(100, Math.round(priority))),
    createdAt: new Date().toISOString() as Timestamp,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

// ─── Remediation Task ───────────────────────────────────────

/** Input for creating a RemediationTask */
export interface RemediationTaskInput {
  readonly actionId: RecommendationActionId;
  readonly recommendationId: RecommendationId;
  readonly title: string;
  readonly description?: string;
  readonly assignee?: string | null;
  readonly dueDate?: Timestamp | null;
  readonly status?: ActionStatus;
  readonly dependencies?: readonly RemediationTaskId[];
  readonly verificationSteps?: readonly string[];
  readonly rollbackSteps?: readonly string[];
  readonly metadata?: Metadata;
}

/** Create an immutable RemediationTask */
export function createRemediationTask(input: RemediationTaskInput): RemediationTask {
  if (!input.actionId) throw new Error('RemediationTask requires actionId');
  if (!input.title) throw new Error('RemediationTask requires title');

  return Object.freeze({
    id: generateRemediationTaskId(),
    actionId: input.actionId,
    recommendationId: input.recommendationId,
    title: input.title,
    description: input.description ?? input.title,
    assignee: input.assignee ?? null,
    dueDate: input.dueDate ?? null,
    status: input.status ?? ActionStatus.Pending,
    dependencies: Object.freeze([...(input.dependencies ?? [])]),
    verificationSteps: Object.freeze([...(input.verificationSteps ?? [])]),
    rollbackSteps: Object.freeze([...(input.rollbackSteps ?? [])]),
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

// ─── Serialization ──────────────────────────────────────────

/** Serialize a Recommendation to JSON */
export function recommendationToJSON(rec: Recommendation): string {
  return JSON.stringify(rec, null, 2);
}

/** Deserialize a Recommendation from JSON with validation */
export function recommendationFromJSON(json: string): Recommendation {
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON: cannot deserialize Recommendation');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid Recommendation JSON: expected object');
  }
  if (!parsed.id || typeof parsed.id !== 'string') {
    throw new Error('Invalid Recommendation JSON: missing or invalid id');
  }
  if (!parsed.ruleType || typeof parsed.ruleType !== 'string') {
    throw new Error('Invalid Recommendation JSON: missing or invalid ruleType');
  }
  if (!parsed.source || typeof parsed.source !== 'string') {
    throw new Error('Invalid Recommendation JSON: missing or invalid source');
  }
  if (!parsed.title || typeof parsed.title !== 'string') {
    throw new Error('Invalid Recommendation JSON: missing or invalid title');
  }
  if (!parsed.targetId || typeof parsed.targetId !== 'string') {
    throw new Error('Invalid Recommendation JSON: missing or invalid targetId');
  }
  if (!parsed.cost || typeof parsed.cost !== 'object') {
    throw new Error('Invalid Recommendation JSON: missing or invalid cost');
  }
  if (!parsed.benefit || typeof parsed.benefit !== 'object') {
    throw new Error('Invalid Recommendation JSON: missing or invalid benefit');
  }
  if (!parsed.ranking || typeof parsed.ranking !== 'object') {
    throw new Error('Invalid Recommendation JSON: missing or invalid ranking');
  }

  // Strip prototype-polluting keys from untrusted parsed JSON
  const { __proto__: _0, constructor: _1, prototype: _2, ...safeParsed } = parsed;

  return Object.freeze({
    ...safeParsed,
    findingIds: Object.freeze(safeParsed.findingIds ?? []),
    correlationGroupIds: Object.freeze(safeParsed.correlationGroupIds ?? []),
    attackPathIds: Object.freeze(safeParsed.attackPathIds ?? []),
    evidence: Object.freeze(safeParsed.evidence ?? []),
    explainability: Object.freeze(safeParsed.explainability ?? {
      whyGenerated: [],
      affectedFindings: [],
      affectedAttackPaths: [],
      expectedRiskDelta: 0,
      expectedScoreDelta: 0,
      confidenceReasoning: {},
    }),
    cost: Object.freeze(safeParsed.cost),
    benefit: Object.freeze(safeParsed.benefit),
    ranking: Object.freeze(safeParsed.ranking),
    metadata: Object.freeze(safeParsed.metadata ?? {}),
  });
}

/** Serialize a RemediationPlan to JSON */
export function remediationPlanToJSON(plan: RemediationPlan): string {
  return JSON.stringify(plan, null, 2);
}

/** Deserialize a RemediationPlan from JSON with validation */
export function remediationPlanFromJSON(json: string): RemediationPlan {
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON: cannot deserialize RemediationPlan');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid RemediationPlan JSON: expected object');
  }
  if (!parsed.id || typeof parsed.id !== 'string') {
    throw new Error('Invalid RemediationPlan JSON: missing or invalid id');
  }
  if (!parsed.strategy || typeof parsed.strategy !== 'string') {
    throw new Error('Invalid RemediationPlan JSON: missing or invalid strategy');
  }

  // Strip prototype-polluting keys from untrusted parsed JSON
  const { __proto__: _0, constructor: _1, prototype: _2, ...safeParsed } = parsed;

  return Object.freeze({
    ...safeParsed,
    actions: Object.freeze(safeParsed.actions ?? []),
    recommendations: Object.freeze(safeParsed.recommendations ?? []),
    groups: Object.freeze(safeParsed.groups ?? []),
    conflicts: Object.freeze(safeParsed.conflicts ?? []),
    metadata: Object.freeze(safeParsed.metadata ?? {}),
  });
}

// ─── Equality / Clone / Hash ────────────────────────────────

/** Check two Recommendations for equality (by ID) */
export function recommendationsEqual(a: Recommendation, b: Recommendation): boolean {
  return a.id === b.id;
}

/** Check two RecommendationGroups for equality (by ID) */
export function recommendationGroupsEqual(a: RecommendationGroup, b: RecommendationGroup): boolean {
  return a.id === b.id;
}

/** Check two RemediationPlans for equality (by ID) */
export function remediationPlansEqual(a: RemediationPlan, b: RemediationPlan): boolean {
  return a.id === b.id;
}

/** Check two RecommendationActions for equality (by ID) */
export function recommendationActionsEqual(a: RecommendationAction, b: RecommendationAction): boolean {
  return a.id === b.id;
}

/** Clone a Recommendation (deep clone via JSON round-trip) */
export function cloneRecommendation(rec: Recommendation): Recommendation {
  return recommendationFromJSON(recommendationToJSON(rec));
}

/** Clone a RemediationPlan (deep clone via JSON round-trip) */
export function cloneRemediationPlan(plan: RemediationPlan): RemediationPlan {
  return remediationPlanFromJSON(remediationPlanToJSON(plan));
}

/** Compute a hash for a Recommendation */
export function hashRecommendation(rec: Recommendation): number {
  let hash = 0;
  const str = rec.id;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
}

/** Compute a hash for a RemediationPlan */
export function hashRemediationPlan(plan: RemediationPlan): number {
  let hash = 0;
  const str = plan.id;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
}

// ─── Plan Computation Helpers ───────────────────────────────

/** Compute total risk reduction for a set of recommendations.
 *  Uses the complement-of-products formula: 1 - Π(1 - rᵢ)
 *  This correctly models diminishing returns and never exceeds 1.0
 *  regardless of how many recommendations are combined.
 */
export function computePlanRiskReduction(recommendations: readonly Recommendation[]): number {
  if (recommendations.length === 0) return 0;
  const product = recommendations.reduce((acc, r) => acc * (1 - r.benefit.riskReduction), 1);
  return clamp01(1 - product);
}

/** Compute total attack surface reduction for a set of recommendations.
 *  Uses the complement-of-products formula: 1 - Π(1 - aᵢ)
 *  Correctly models diminishing returns and never exceeds 1.0.
 */
export function computePlanAttackSurfaceReduction(recommendations: readonly Recommendation[]): number {
  if (recommendations.length === 0) return 0;
  const product = recommendations.reduce((acc, r) => acc * (1 - r.benefit.attackPathElimination), 1);
  return clamp01(1 - product);
}

/** Compute total estimated cost for a set of recommendations */
export function computePlanCost(recommendations: readonly Recommendation[]): number {
  if (recommendations.length === 0) return 0;
  return clamp01(recommendations.reduce((sum, r) => sum + r.cost.totalCost, 0) / recommendations.length);
}

/** Compute total estimated effort hours for a set of recommendations */
export function computePlanEffort(recommendations: readonly Recommendation[]): number {
  return recommendations.reduce((sum, r) => sum + r.cost.effortHours, 0);
}

/** Compute coverage score for a set of recommendations */
export function computePlanCoverage(recommendations: readonly Recommendation[]): number {
  if (recommendations.length === 0) return 0;
  // Coverage is the fraction of unique findings covered
  const allFindings = new Set<string>();
  const coveredFindings = new Set<string>();
  for (const r of recommendations) {
    for (const f of r.findingIds) {
      allFindings.add(f);
      coveredFindings.add(f);
    }
  }
  return allFindings.size > 0 ? coveredFindings.size / allFindings.size : 0;
}

/** Compute plan priority score (0–100) */
export function computePlanPriority(
  riskReduction: number,
  cost: number,
  coverage: number,
): number {
  return Math.round(clamp01(0.50 * riskReduction + 0.25 * coverage + 0.25 * (1 - cost)) * 100);
}

// ─── Internal Helpers ───────────────────────────────────────

/** Clamp a number to [0.0, 1.0] */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
