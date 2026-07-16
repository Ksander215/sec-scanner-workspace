/**
 * Security Intelligence Impact Analysis — Risk Delta Engine
 *
 * Calculates how risk changes when a mitigation scenario is applied.
 * Uses the existing Risk Assessment data to compute before/after deltas.
 *
 * All calculations are fully deterministic.
 * No modifications to the existing Risk Engine.
 */

import type { RiskDelta, RiskAssessmentDelta, ImpactScenarioId } from '../types/index.ts';
import type { RiskAssessment, RiskLevel } from '../../risk/types/index.ts';
import type { AttackPath } from '../../attack-path/types/index.ts';
import type { ScenarioEvaluationResult } from '../scenarios/index.ts';
import {
  createRiskDelta,
  createRiskAssessmentDelta,
} from '../models/index.ts';
import { RiskLevel as RL } from '../../risk/types/index.ts';

/**
 * Compute the risk delta for a given scenario evaluation.
 * Shows before/after risk values and per-assessment changes.
 */
export function computeRiskDelta(
  scenarioId: ImpactScenarioId,
  riskAssessments: readonly RiskAssessment[],
  attackPaths: readonly AttackPath[],
  evaluation: ScenarioEvaluationResult,
): RiskDelta {
  // Calculate overall before risk
  const overallBefore = computeOverallRisk(riskAssessments);

  // Calculate per-assessment deltas for affected findings
  const affectedFindingIds = new Set(evaluation.affectedFindingIds);
  const affectedPathIds = new Set([
    ...evaluation.eliminatedPathIds,
    ...evaluation.reducedPathIds,
  ]);

  // Also find finding IDs from affected paths
  for (const path of attackPaths) {
    if (affectedPathIds.has(path.id)) {
      for (const node of path.nodes) {
        for (const fid of node.findingIds) {
          affectedFindingIds.add(fid);
        }
      }
    }
  }

  const perAssessmentDeltas: RiskAssessmentDelta[] = [];
  for (const ra of riskAssessments) {
    if (affectedFindingIds.has(ra.findingId)) {
      const scoreBefore = ra.score.rawScore;
      // After mitigation: risk is reduced by the reduction factor
      const scoreAfter = scoreBefore * (1 - evaluation.riskReductionFactor);
      const levelBefore = ra.score.level;
      const levelAfter = determineLevel(scoreAfter);

      perAssessmentDeltas.push(createRiskAssessmentDelta({
        assessmentId: ra.id,
        findingId: ra.findingId,
        scoreBefore,
        scoreAfter,
        levelBefore,
        levelAfter,
      }));
    }
  }

  // Calculate overall after risk
  const overallAfter = computeOverallRiskAfter(riskAssessments, perAssessmentDeltas);
  const levelBefore = determineLevel(overallBefore);
  const levelAfter = determineLevel(overallAfter);

  return createRiskDelta({
    scenarioId,
    overallBefore,
    overallAfter,
    levelBefore,
    levelAfter,
    perAssessmentDeltas,
  });
}

/**
 * Compute overall risk from a set of risk assessments.
 * Uses weighted average with critical findings weighted more heavily.
 */
export function computeOverallRisk(assessments: readonly RiskAssessment[]): number {
  if (assessments.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const ra of assessments) {
    const weight = getRiskWeight(ra.score.level);
    weightedSum += ra.score.rawScore * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Compute overall risk after mitigation.
 * Replaces affected assessment scores with their after values.
 */
function computeOverallRiskAfter(
  assessments: readonly RiskAssessment[],
  deltas: readonly RiskAssessmentDelta[],
): number {
  if (assessments.length === 0) return 0;

  const deltaMap = new Map(deltas.map(d => [d.assessmentId, d]));

  let weightedSum = 0;
  let totalWeight = 0;

  for (const ra of assessments) {
    const weight = getRiskWeight(ra.score.level);
    const delta = deltaMap.get(ra.id);
    const score = delta ? delta.scoreAfter : ra.score.rawScore;
    weightedSum += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Get weight for a risk level (higher severity = higher weight).
 */
function getRiskWeight(level: RiskLevel): number {
  switch (level) {
    case RL.Critical: return 4.0;
    case RL.High: return 3.0;
    case RL.Medium: return 2.0;
    case RL.Low: return 1.0;
    case RL.Informational: return 0.5;
    default: return 1.0;
  }
}

/**
 * Determine risk level from a raw score.
 * Matches RISK_LEVEL_THRESHOLDS from the Risk Engine.
 */
function determineLevel(score: number): RiskLevel {
  if (score >= 0.80) return RL.Critical;
  if (score >= 0.60) return RL.High;
  if (score >= 0.35) return RL.Medium;
  if (score >= 0.15) return RL.Low;
  return RL.Informational;
}
