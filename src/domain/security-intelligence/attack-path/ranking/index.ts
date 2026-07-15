/**
 * Security Intelligence Attack Path Builder — Path Ranking
 *
 * Deterministic ranking engine for attack paths.
 * All factors are computed deterministically — no probabilistic algorithms.
 *
 * Ranking factors:
 * - Risk Score: From risk assessments along the path
 * - Path Length: Shorter paths are generally more exploitable
 * - Exploit Availability: Whether known exploits exist
 * - Privilege Escalation: Whether the path involves privilege escalation
 * - Lateral Movement: Whether the path involves lateral movement
 * - Internet Exposure: Whether the path starts from internet-facing assets
 * - Business Impact: Impact on business-critical assets
 * - Confidence: Confidence in the path's feasibility
 */

import type {
  AttackPath, AttackPathRanking, AttackStep, RankingConfig,
} from '../types/index.ts';
import {
  DEFAULT_RANKING_CONFIG,
} from '../types/index.ts';
import {
  createAttackPathRanking, computeOverallRankingScore,
} from '../models/index.ts';

// ─── Ranking Result ──────────────────────────────────────────

/** Result of ranking a set of paths */
export interface RankingResult {
  readonly rankedPaths: readonly AttackPath[];
  readonly rankings: readonly AttackPathRanking[];
  readonly durationMs: number;
}

// ─── Individual Score Computations ───────────────────────────

/** Compute risk score from path steps */
export function computeRiskScore(steps: readonly AttackStep[]): number {
  if (steps.length === 0) return 0;
  const maxRisk = Math.max(...steps.map(s => s.node.riskScore));
  const avgRisk = steps.reduce((sum, s) => sum + s.node.riskScore, 0) / steps.length;
  // Weighted: max risk is more important than average
  return 0.7 * maxRisk + 0.3 * avgRisk;
}

/** Compute path length score (shorter paths score higher) */
export function computePathLengthScore(steps: readonly AttackStep[]): number {
  if (steps.length === 0) return 0;
  // Inverse relationship: longer paths are less exploitable
  // Score = 1 / (1 + log(length))
  const length = steps.length;
  return 1 / (1 + Math.log2(Math.max(1, length)));
}

/** Compute exploit availability score */
export function computeExploitAvailabilityScore(steps: readonly AttackStep[]): number {
  if (steps.length === 0) return 0;
  const stepsWithTechniques = steps.filter(s => s.techniques.length > 0);
  if (stepsWithTechniques.length === 0) return 0.1; // Low default

  // Average frequency of techniques across steps
  const avgFrequency = stepsWithTechniques.reduce((sum, s) => {
    const maxFreq = Math.max(...s.techniques.map(t => t.frequency), 0);
    return sum + maxFreq;
  }, 0) / stepsWithTechniques.length;

  // Also consider difficulty (easier = more exploitable)
  const avgDifficulty = stepsWithTechniques.reduce((sum, s) => {
    const minDiff = Math.min(...s.techniques.map(t => t.difficulty), 1);
    return sum + minDiff;
  }, 0) / stepsWithTechniques.length;

  // Higher frequency + lower difficulty = higher exploit availability
  return 0.6 * avgFrequency + 0.4 * (1 - avgDifficulty);
}

/** Compute privilege escalation score */
export function computePrivilegeEscalationScore(steps: readonly AttackStep[]): number {
  if (steps.length === 0) return 0;
  let privEscSteps = 0;
  for (const step of steps) {
    if (step.incomingEdge?.isPrivilegeEscalation) privEscSteps++;
    if (step.techniques.some(t => t.tactic === 'PrivilegeEscalation')) privEscSteps++;
  }
  // More privilege escalation steps = higher score
  return Math.min(1, privEscSteps / Math.max(1, steps.length) * 2);
}

/** Compute lateral movement score */
export function computeLateralMovementScore(steps: readonly AttackStep[]): number {
  if (steps.length === 0) return 0;
  let lateralSteps = 0;
  for (const step of steps) {
    if (step.incomingEdge?.isLateralMovement) lateralSteps++;
    if (step.techniques.some(t => t.tactic === 'LateralMovement')) lateralSteps++;
  }
  return Math.min(1, lateralSteps / Math.max(1, steps.length) * 2);
}

/** Compute internet exposure score */
export function computeInternetExposureScore(steps: readonly AttackStep[]): number {
  if (steps.length === 0) return 0;
  // If the entry point is internet-facing, the path is more exposed
  const entryPoint = steps[0];
  if (entryPoint.node.isEntryPoint) return 1.0;

  // Check if any early steps (first 30%) are entry points
  const earlySteps = steps.slice(0, Math.max(1, Math.ceil(steps.length * 0.3)));
  const entryPointCount = earlySteps.filter(s => s.node.isEntryPoint).length;
  return entryPointCount / earlySteps.length;
}

/** Compute business impact score */
export function computeBusinessImpactScore(steps: readonly AttackStep[]): number {
  if (steps.length === 0) return 0;
  // Score based on objective node risk and criticality
  const endStep = steps[steps.length - 1];
  const objectiveRisk = endStep.node.riskScore;
  const criticalSteps = steps.filter(s => s.isCritical).length;
  const criticalRatio = criticalSteps / steps.length;

  return 0.6 * objectiveRisk + 0.4 * criticalRatio;
}

/** Compute confidence score */
export function computeConfidenceScore(steps: readonly AttackStep[]): number {
  if (steps.length === 0) return 0;
  // Average edge probability (deterministic, not probabilistic)
  const edges = steps.filter(s => s.incomingEdge !== null).map(s => s.incomingEdge!);
  if (edges.length === 0) return 0.5;

  const avgProbability = edges.reduce((sum, e) => sum + e.probability, 0) / edges.length;
  // Also factor in risk score stability
  const riskVariance = computeRiskVariance(steps);
  const stabilityFactor = 1 - Math.min(1, riskVariance * 2);

  return 0.7 * avgProbability + 0.3 * stabilityFactor;
}

/** Compute risk variance across steps (for confidence estimation) */
function computeRiskVariance(steps: readonly AttackStep[]): number {
  if (steps.length <= 1) return 0;
  const risks = steps.map(s => s.node.riskScore);
  const mean = risks.reduce((a, b) => a + b, 0) / risks.length;
  const variance = risks.reduce((sum, r) => sum + (r - mean) ** 2, 0) / risks.length;
  return Math.sqrt(variance);
}

// ─── Ranking Engine ──────────────────────────────────────────

/**
 * Ranks attack paths using deterministic weighted factors.
 *
 * Formula:
 * Ranking = RiskWeight × RiskScore +
 *           LengthWeight × LengthScore +
 *           ExploitWeight × ExploitScore +
 *           PrivEscWeight × PrivEscScore +
 *           LateralWeight × LateralScore +
 *           ExposureWeight × ExposureScore +
 *           ImpactWeight × ImpactScore +
 *           ConfidenceWeight × ConfidenceScore
 */
export class PathRankingEngine {
  private readonly _config: RankingConfig;

  constructor(config: RankingConfig = DEFAULT_RANKING_CONFIG) {
    this._config = Object.freeze({ ...config });
  }

  /**
   * Rank a single path.
   * Returns the path with its ranking attached.
   */
  rankPath(path: AttackPath, rank: number = 0): AttackPath {
    const startTime = performance.now();

    const scores = this.computeScores(path.steps);

    const ranking = createAttackPathRanking({
      ...scores,
      config: this._config,
      rank,
    });

    // Return a new path with the ranking attached
    return Object.freeze({
      ...path,
      ranking,
    });
  }

  /**
   * Rank multiple paths and sort by overall score (descending).
   */
  rankPaths(paths: readonly AttackPath[]): RankingResult {
    const startTime = performance.now();

    // Compute rankings for all paths
    const rankedEntries: { path: AttackPath; ranking: AttackPathRanking }[] = paths.map(path => {
      const scores = this.computeScores(path.steps);
      const overallScore = computeOverallRankingScore(scores, this._config);
      return {
        path,
        ranking: createAttackPathRanking({
          ...scores,
          config: this._config,
        }),
      };
    });

    // Sort by overall score descending
    rankedEntries.sort((a, b) => b.ranking.overallScore - a.ranking.overallScore);

    // Assign ranks
    const rankedPaths = rankedEntries.map((entry, index) => {
      const rank = index + 1;
      const ranking: AttackPathRanking = Object.freeze({ ...entry.ranking, rank });
      return Object.freeze({ ...entry.path, ranking });
    });

    const rankings = rankedPaths.map(p => p.ranking);
    const durationMs = performance.now() - startTime;

    return Object.freeze({
      rankedPaths: Object.freeze(rankedPaths),
      rankings: Object.freeze(rankings),
      durationMs,
    });
  }

  /** Compute all ranking scores for a set of steps */
  computeScores(steps: readonly AttackStep[]): {
    riskScore: number;
    pathLengthScore: number;
    exploitAvailabilityScore: number;
    privilegeEscalationScore: number;
    lateralMovementScore: number;
    internetExposureScore: number;
    businessImpactScore: number;
    confidenceScore: number;
  } {
    return {
      riskScore: computeRiskScore(steps),
      pathLengthScore: computePathLengthScore(steps),
      exploitAvailabilityScore: computeExploitAvailabilityScore(steps),
      privilegeEscalationScore: computePrivilegeEscalationScore(steps),
      lateralMovementScore: computeLateralMovementScore(steps),
      internetExposureScore: computeInternetExposureScore(steps),
      businessImpactScore: computeBusinessImpactScore(steps),
      confidenceScore: computeConfidenceScore(steps),
    };
  }

  /** Get the ranking configuration */
  get config(): RankingConfig {
    return this._config;
  }
}
