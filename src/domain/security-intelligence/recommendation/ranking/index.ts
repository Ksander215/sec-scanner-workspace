/**
 * Security Intelligence Recommendation Engine — Ranking
 *
 * Ranks recommendations using 8 weighted factors:
 * Risk Reduction, Attack Path Elimination, Cost, Confidence,
 * Business Impact, Fix Complexity, Coverage, Time To Remediate
 */

import type {
  Recommendation, RecommendationRanking, RecommendationEngineConfig,
} from '../types/index.ts';
import { DEFAULT_RECOMMENDATION_ENGINE_CONFIG } from '../types/index.ts';
import { createRecommendationRanking, computeOverallRankingScore } from '../models/index.ts';

/** Ranking result */
export interface RankingResult {
  readonly ranked: readonly Recommendation[];
  readonly strategy: string;
  readonly totalRecommendations: number;
  readonly durationMs: number;
}

/**
 * Rank recommendations by computing scores and sorting.
 * The ranking is deterministic — same input always produces the same output.
 */
export function rankRecommendations(
  recommendations: readonly Recommendation[],
  config: Partial<RecommendationEngineConfig> = {},
): RankingResult {
  const startTime = performance.now();
  const fullConfig = { ...DEFAULT_RECOMMENDATION_ENGINE_CONFIG, ...config };

  if (recommendations.length === 0) {
    return Object.freeze({
      ranked: Object.freeze([]),
      strategy: 'weighted-composite',
      totalRecommendations: 0,
      durationMs: performance.now() - startTime,
    });
  }

  // Compute scores for each recommendation
  const scored = recommendations.map(rec => {
    const scores = computeRankingScores(rec, fullConfig);
    const ranking = createRecommendationRanking({
      ...scores,
      config: {
        riskReductionWeight: fullConfig.riskReductionWeight,
        attackPathEliminationWeight: fullConfig.attackPathEliminationWeight,
        costWeight: fullConfig.costWeight,
        confidenceWeight: fullConfig.confidenceWeight,
        businessImpactWeight: fullConfig.businessImpactWeight,
        fixComplexityWeight: fullConfig.fixComplexityWeight,
        coverageWeight: fullConfig.coverageWeight,
        timeToRemediateWeight: fullConfig.timeToRemediateWeight,
      },
    });

    return { rec, ranking };
  });

  // Sort by overall score descending
  scored.sort((a, b) => b.ranking.overallScore - a.ranking.overallScore);

  // Assign ranks and update recommendations with ranking
  const ranked: Recommendation[] = scored.map((item, index) => {
    const newRanking = createRecommendationRanking({
      ...item.ranking,
      rank: index + 1,
      config: {
        riskReductionWeight: fullConfig.riskReductionWeight,
        attackPathEliminationWeight: fullConfig.attackPathEliminationWeight,
        costWeight: fullConfig.costWeight,
        confidenceWeight: fullConfig.confidenceWeight,
        businessImpactWeight: fullConfig.businessImpactWeight,
        fixComplexityWeight: fullConfig.fixComplexityWeight,
        coverageWeight: fullConfig.coverageWeight,
        timeToRemediateWeight: fullConfig.timeToRemediateWeight,
      },
    });

    return Object.freeze({
      ...item.rec,
      ranking: newRanking,
    }) as Recommendation;
  });

  return Object.freeze({
    ranked: Object.freeze(ranked),
    strategy: 'weighted-composite',
    totalRecommendations: ranked.length,
    durationMs: performance.now() - startTime,
  });
}

/**
 * Compute the 8 ranking factor scores for a recommendation.
 */
export function computeRankingScores(
  rec: Recommendation,
  config: RecommendationEngineConfig,
): Omit<import('../types/index.ts').RecommendationRanking, 'overallScore' | 'rank'> {
  const benefit = rec.benefit;
  const cost = rec.cost;

  return {
    riskReductionScore: benefit.riskReduction,
    attackPathEliminationScore: benefit.attackPathElimination,
    costScore: 1 - cost.totalCost,                              // Inverted: lower cost = higher score
    confidenceScore: benefit.confidenceImprovement,
    businessImpactScore: benefit.riskReduction * 0.6 + benefit.attackPathElimination * 0.4,
    fixComplexityScore: 1 - cost.complexity,                    // Inverted: lower complexity = higher score
    coverageScore: benefit.coverageImprovement,
    timeToRemediateScore: 1 - clamp01(cost.effortHours / 200),  // Inverted: faster = higher score
  };
}

/**
 * Compare two recommendations by ranking score.
 * Returns negative if a > b, positive if a < b, 0 if equal.
 */
export function compareRecommendations(
  a: Recommendation,
  b: Recommendation,
): number {
  return b.ranking.overallScore - a.ranking.overallScore;
}

// ─── Internal Helpers ───────────────────────────────────────

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
