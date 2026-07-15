/**
 * Security Intelligence Risk Engine — Risk Aggregation
 *
 * Aggregates risk assessments across different scopes:
 * - Per Finding: individual finding risk
 * - Per Asset: aggregated risk for an asset
 * - Per Application: aggregated risk for an application
 * - Per Scan: aggregated risk for an entire scan
 * - Per Correlation Group: aggregated risk for a group
 *
 * Uses a deterministic weighted aggregation formula.
 */

import type {
  RiskAssessment, RiskSummary, RiskLevel, RiskTrend, RiskReason,
  AggregationScope, Metadata,
} from '../types/index.ts';
import {
  RiskLevel as RLvl, RiskTrend as RTrend, AggregationScope as AScope,
} from '../types/index.ts';
import {
  createRiskSummary, createEmptyLevelDistribution, createEmptyTrendDistribution,
} from '../models/index.ts';

// ─── Aggregation Method ──────────────────────────────────────

/**
 * Aggregation method for combining risk scores.
 * - Max: take the maximum score (most conservative)
 * - WeightedAverage: weighted by severity of each finding
 * - GeometricMean: reduces impact of outliers
 */
export enum AggregationMethod {
  Max = 'Max',
  WeightedAverage = 'WeightedAverage',
  GeometricMean = 'GeometricMean',
}

// ─── Aggregator ──────────────────────────────────────────────

/**
 * Aggregates risk assessments across scopes.
 * All methods are deterministic: same inputs always produce the same output.
 */
export class RiskAggregator {
  private readonly _method: AggregationMethod;

  constructor(method: AggregationMethod = AggregationMethod.WeightedAverage) {
    this._method = method;
  }

  /**
   * Aggregate a set of risk assessments into a summary.
   * Groups assessments by the specified scope.
   */
  aggregate(
    assessments: readonly RiskAssessment[],
    scope: AggregationScope,
    scopeId: string,
  ): RiskSummary {
    // FIX #7: For aggregateAll-style calls, include all assessments regardless of their original scope
    // The scope parameter here determines the aggregation scope, not a filter on assessment.scope
    const scoped = assessments;

    if (scoped.length === 0) {
      return createRiskSummary({
        scope,
        scopeId,
        totalAssessments: 0,
        averageScore: 0,
        maxScore: 0,
        minScore: 0,
        levelDistribution: createEmptyLevelDistribution(),
        trendDistribution: createEmptyTrendDistribution(),
        topReasons: [],
      });
    }

    // Compute aggregated score
    const scores = scoped.map(a => a.score.rawScore);
    const averageScore = this.computeAggregatedScore(scores);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    // Compute distributions
    const levelDist = this.computeLevelDistribution(scoped);
    const trendDist = this.computeTrendDistribution(scoped);

    // Compute top reasons
    const topReasons = this.computeTopReasons(scoped);

    return createRiskSummary({
      scope,
      scopeId,
      totalAssessments: scoped.length,
      averageScore,
      maxScore,
      minScore,
      levelDistribution: levelDist,
      trendDistribution: trendDist,
      topReasons,
    });
  }

  /**
   * Aggregate by finding: returns one summary per unique finding scopeId.
   */
  aggregateByFinding(assessments: readonly RiskAssessment[]): readonly RiskSummary[] {
    return this.aggregateByScope(assessments, AScope.Finding);
  }

  /**
   * Aggregate by asset: returns one summary per unique asset scopeId.
   */
  aggregateByAsset(assessments: readonly RiskAssessment[]): readonly RiskSummary[] {
    return this.aggregateByScope(assessments, AScope.Asset);
  }

  /**
   * Aggregate by application: returns one summary per unique application scopeId.
   */
  aggregateByApplication(assessments: readonly RiskAssessment[]): readonly RiskSummary[] {
    return this.aggregateByScope(assessments, AScope.Application);
  }

  /**
   * Aggregate by scan: returns one summary per unique scan scopeId.
   */
  aggregateByScan(assessments: readonly RiskAssessment[]): readonly RiskSummary[] {
    return this.aggregateByScope(assessments, AScope.Scan);
  }

  /**
   * Aggregate by correlation group: returns one summary per unique group scopeId.
   */
  aggregateByCorrelationGroup(assessments: readonly RiskAssessment[]): readonly RiskSummary[] {
    return this.aggregateByScope(assessments, AScope.CorrelationGroup);
  }

  /**
   * Aggregate all assessments into a single overall summary.
   */
  aggregateAll(assessments: readonly RiskAssessment[], scopeId: string = 'overall'): RiskSummary {
    if (assessments.length === 0) {
      return createRiskSummary({
        scope: AScope.Scan,
        scopeId,
        totalAssessments: 0,
        averageScore: 0,
        maxScore: 0,
        minScore: 0,
        levelDistribution: createEmptyLevelDistribution(),
        trendDistribution: createEmptyTrendDistribution(),
        topReasons: [],
      });
    }

    const scores = assessments.map(a => a.score.rawScore);
    const averageScore = this.computeAggregatedScore(scores);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const levelDist = this.computeLevelDistribution(assessments);
    const trendDist = this.computeTrendDistribution(assessments);
    const topReasons = this.computeTopReasons(assessments);

    return createRiskSummary({
      scope: AScope.Scan,
      scopeId,
      totalAssessments: assessments.length,
      averageScore,
      maxScore,
      minScore,
      levelDistribution: levelDist,
      trendDistribution: trendDist,
      topReasons,
    });
  }

  // ─── Private Helpers ───────────────────────────────────

  /** Compute aggregated score using the configured method */
  private computeAggregatedScore(scores: readonly number[]): number {
    if (scores.length === 0) return 0;

    switch (this._method) {
      case AggregationMethod.Max:
        return Math.max(...scores);

      case AggregationMethod.WeightedAverage: {
        // Weight higher scores more: weight = score^1.5
        let totalWeight = 0;
        let weightedSum = 0;
        for (const score of scores) {
          const weight = Math.pow(score, 1.5);
          weightedSum += score * weight;
          totalWeight += weight;
        }
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
      }

      case AggregationMethod.GeometricMean: {
        // Geometric mean: (product of scores)^(1/n)
        // Add small epsilon to avoid log(0)
        const epsilon = 0.001;
        const logSum = scores.reduce((sum, s) => sum + Math.log(Math.max(s, epsilon)), 0);
        return Math.exp(logSum / scores.length);
      }

      default:
        return scores.reduce((a, b) => a + b, 0) / scores.length;
    }
  }

  /** Compute level distribution */
  private computeLevelDistribution(assessments: readonly RiskAssessment[]): Readonly<Record<RiskLevel, number>> {
    const dist = createEmptyLevelDistribution();
    const mutableDist = { ...dist };
    for (const assessment of assessments) {
      mutableDist[assessment.score.level] = (mutableDist[assessment.score.level] ?? 0) + 1;
    }
    return Object.freeze(mutableDist as Readonly<Record<RiskLevel, number>>);
  }

  /** Compute trend distribution */
  private computeTrendDistribution(assessments: readonly RiskAssessment[]): Readonly<Record<RiskTrend, number>> {
    const dist = createEmptyTrendDistribution();
    const mutableDist = { ...dist };
    for (const assessment of assessments) {
      mutableDist[assessment.trend] = (mutableDist[assessment.trend] ?? 0) + 1;
    }
    return Object.freeze(mutableDist as Readonly<Record<RiskTrend, number>>);
  }

  /** Compute top reasons */
  private computeTopReasons(assessments: readonly RiskAssessment[]): readonly { readonly reason: RiskReason; readonly count: number }[] {
    const reasonCounts = new Map<RiskReason, number>();
    for (const assessment of assessments) {
      for (const reason of assessment.score.reasons) {
        reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
      }
    }

    return Object.freeze(
      [...reasonCounts.entries()]
        .map(([reason, count]) => Object.freeze({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    );
  }

  /** Group assessments by scope — FIX #6: Use correct grouping key per scope type */
  private aggregateByScope(assessments: readonly RiskAssessment[], scope: AggregationScope): readonly RiskSummary[] {
    const groups = new Map<string, RiskAssessment[]>();

    for (const assessment of assessments) {
      // Select the correct grouping key based on scope type
      let key: string;
      switch (scope) {
        case AScope.Finding:
          key = assessment.findingId;
          break;
        case AScope.Asset:
          key = assessment.assetId ?? assessment.scopeId;
          break;
        case AScope.Application:
          key = (assessment.metadata as Record<string, unknown>)?.['applicationId'] as string ?? assessment.scopeId;
          break;
        case AScope.Scan:
          key = (assessment.metadata as Record<string, unknown>)?.['scanId'] as string ?? assessment.scopeId;
          break;
        case AScope.CorrelationGroup:
          key = assessment.groupId ?? assessment.scopeId;
          break;
        default:
          key = assessment.scopeId;
      }
      const group = groups.get(key) ?? [];
      group.push(assessment);
      groups.set(key, group);
    }

    return Object.freeze(
      [...groups.entries()].map(([scopeId, grouped]) =>
        this.aggregate(grouped, scope, scopeId)
      ),
    );
  }
}
