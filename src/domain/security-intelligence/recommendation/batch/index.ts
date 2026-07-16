/**
 * Security Intelligence Recommendation Engine — Batch Processing
 *
 * Supports batch generation from:
 * - One Finding
 * - One Risk
 * - One Impact Analysis
 * - Full Scan
 * - Multiple Scans
 */

import type {
  Recommendation, GenerateBatchInput, PlanConstraints,
} from '../types/index.ts';
import { PlanningStrategy } from '../types/index.ts';
import type { RuleRegistry } from '../rules/index.ts';
import { generateFromAllSources } from '../sources/index.ts';
import { rankRecommendations } from '../ranking/index.ts';
import { buildPlan } from '../planner/index.ts';
import type { RemediationPlan } from '../types/index.ts';
import type { CanonicalFinding } from '../../normalization/types/index.ts';
import type { RiskAssessment } from '../../risk/types/index.ts';
import type { ImpactAnalysis } from '../../impact/types/index.ts';

/** Batch result */
export interface BatchResult {
  readonly recommendations: readonly Recommendation[];
  readonly plan: RemediationPlan | null;
  readonly totalSources: number;
  readonly durationMs: number;
}

/**
 * Generate recommendations and build a plan from a batch of sources.
 */
export function generateBatch(
  input: GenerateBatchInput,
  ruleRegistry: RuleRegistry,
  strategy: PlanningStrategy = PlanningStrategy.Balanced,
  constraints?: PlanConstraints,
): BatchResult {
  const startTime = performance.now();

  // Count total sources
  const totalSources =
    (input.findings?.length ?? 0) +
    (input.correlationGroups?.length ?? 0) +
    (input.riskAssessments?.length ?? 0) +
    (input.attackPaths?.length ?? 0) +
    (input.impactAnalyses?.length ?? 0);

  // Generate from all sources
  const rawRecommendations = generateFromAllSources(
    input.findings,
    input.correlationGroups,
    input.riskAssessments,
    input.attackPaths,
    input.impactAnalyses,
    ruleRegistry,
  );

  // Rank
  const ranked = rankRecommendations(rawRecommendations);

  // Build plan
  let plan: RemediationPlan | null = null;
  if (ranked.ranked.length > 0) {
    const planResult = buildPlan(ranked.ranked, strategy, constraints);
    plan = planResult.plan;
  }

  return {
    recommendations: ranked.ranked,
    plan,
    totalSources,
    durationMs: performance.now() - startTime,
  };
}

/**
 * Generate recommendations from a single finding.
 */
export function generateFromSingleFinding(
  finding: CanonicalFinding,
  ruleRegistry: RuleRegistry,
): readonly Recommendation[] {
  return generateFromAllSources([finding], undefined, undefined, undefined, undefined, ruleRegistry);
}

/**
 * Generate recommendations from a single risk assessment.
 */
export function generateFromSingleRisk(
  riskAssessment: RiskAssessment,
  ruleRegistry: RuleRegistry,
): readonly Recommendation[] {
  return generateFromAllSources(undefined, undefined, [riskAssessment], undefined, undefined, ruleRegistry);
}

/**
 * Generate recommendations from a single impact analysis.
 */
export function generateFromSingleImpact(
  impactAnalysis: ImpactAnalysis,
  ruleRegistry: RuleRegistry,
): readonly Recommendation[] {
  return generateFromAllSources(undefined, undefined, undefined, undefined, [impactAnalysis], ruleRegistry);
}
