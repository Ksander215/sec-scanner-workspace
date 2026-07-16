/**
 * Security Intelligence Impact Analysis — Recommendation Impact & Ranking
 *
 * Computes the impact of each remediation candidate and ranks them
 * by various strategies (MaximumRiskReduction, MinimumCost, etc.)
 *
 * All calculations are fully deterministic.
 */

import type {
  ImpactScenarioId, RemediationCandidate, Metadata,
  RemediationRankingStrategy,
} from '../types/index.ts';
import { RemediationRankingStrategy as Strategy } from '../types/index.ts';
import type { ImpactAnalysis } from '../types/index.ts';
import type { ScenarioEvaluationResult } from '../scenarios/index.ts';
import {
  createRemediationCandidate,
  computeRemediationScore,
} from '../models/index.ts';

// ─── Recommendation Impact ───────────────────────────────────

/**
 * Compute recommendation impact metrics from a scenario evaluation.
 */
export function computeRecommendationImpact(
  scenarioId: ImpactScenarioId,
  scenarioType: import('../types/index.ts').MitigationScenarioType,
  targetId: string,
  targetLabel: string,
  evaluation: ScenarioEvaluationResult,
  totalPaths: number,
): RemediationCandidate {
  const pathsEliminated = evaluation.eliminatedPathIds.length;
  const pathsReduced = evaluation.reducedPathIds.length + evaluation.shortenedPathIds.length;
  const pathsAffected = pathsEliminated + pathsReduced;

  const attackSurfaceReduction = totalPaths > 0 ? pathsEliminated / totalPaths : 0;

  return createRemediationCandidate({
    scenarioId,
    targetType: scenarioType,
    targetId,
    targetLabel,
    riskReduction: evaluation.riskReductionFactor,
    attackSurfaceReduction,
    businessImpact: evaluation.businessImpact,
    confidenceImprovement: evaluation.confidenceFactor,
    exploitabilityReduction: evaluation.exploitabilityFactor,
    estimatedCost: evaluation.estimatedCost,
    implementationComplexity: evaluation.implementationComplexity,
    pathsEliminated,
    pathsReduced,
    pathsAffected,
  });
}

// ─── Ranking ─────────────────────────────────────────────────

/** Result of ranking remediation candidates */
export interface RankingResult {
  readonly ranked: readonly RemediationCandidate[];
  readonly strategy: RemediationRankingStrategy;
  readonly totalCandidates: number;
  readonly topCandidate: RemediationCandidate | null;
  readonly durationMs: number;
}

/**
 * Rank remediation candidates by a specified strategy.
 */
export function rankRemediationCandidates(
  candidates: readonly RemediationCandidate[],
  strategy: RemediationRankingStrategy = Strategy.MaximumRiskReduction,
): RankingResult {
  const start = performance.now();

  const sorted = [...candidates].sort((a, b) => {
    switch (strategy) {
      case Strategy.MaximumRiskReduction:
        return b.riskReduction - a.riskReduction;
      case Strategy.MinimumCost:
        return a.estimatedCost - b.estimatedCost;
      case Strategy.MaximumCoverage:
        return b.pathsAffected - a.pathsAffected;
      case Strategy.ShortestAttackElimination:
        // Prefer candidates that eliminate more paths with fewer steps
        if (b.pathsEliminated !== a.pathsEliminated) return b.pathsEliminated - a.pathsEliminated;
        return a.implementationComplexity - b.implementationComplexity;
      default:
        return b.score - a.score;
    }
  });

  // Assign ranks based on sort order
  const ranked = sorted.map((candidate, index) =>
    Object.freeze({ ...candidate, rank: index + 1 }) as RemediationCandidate
  );

  const durationMs = performance.now() - start;

  return Object.freeze({
    ranked: Object.freeze(ranked),
    strategy,
    totalCandidates: candidates.length,
    topCandidate: ranked.length > 0 ? ranked[0] : null,
    durationMs,
  });
}

/**
 * Compare two remediation candidates and determine which is better.
 */
export function compareRemediationCandidates(
  a: RemediationCandidate,
  b: RemediationCandidate,
  strategy: RemediationRankingStrategy = Strategy.MaximumRiskReduction,
): number {
  switch (strategy) {
    case Strategy.MaximumRiskReduction:
      return b.riskReduction - a.riskReduction;
    case Strategy.MinimumCost:
      return a.estimatedCost - b.estimatedCost;
    case Strategy.MaximumCoverage:
      return b.pathsAffected - a.pathsAffected;
    case Strategy.ShortestAttackElimination:
      if (b.pathsEliminated !== a.pathsEliminated) return b.pathsEliminated - a.pathsEliminated;
      return a.implementationComplexity - b.implementationComplexity;
    default:
      return b.score - a.score;
  }
}
