/**
 * Security Intelligence Recommendation Engine — Statistics Collector
 *
 * Tracks engine operation metrics for monitoring and reporting.
 */

import type {
  RecommendationRuleType, RecommendationSource, RecommendationSeverity,
  ActionStatus, Timestamp,
} from '../types/index.ts';
import {
  ALL_RECOMMENDATION_RULE_TYPES, ALL_RECOMMENDATION_SOURCES,
  ALL_RECOMMENDATION_SEVERITIES, ALL_ACTION_STATUSES,
} from '../types/index.ts';
import { brandRecommendationStatisticsId } from '../types/index.ts';
import { generateRecommendationStatisticsId } from '../models/index.ts';

export interface CollectedStatistics {
  totalRecommendations: number;
  totalGroups: number;
  totalPlans: number;
  totalActions: number;
  totalConflicts: number;
  totalBatches: number;
  totalFailures: number;
  averageRiskReduction: number;
  averageCost: number;
  averageBenefit: number;
  coverageScore: number;
  ruleTypeDistribution: Record<string, number>;
  sourceDistribution: Record<string, number>;
  severityDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  totalGenerationTimeMs: number;
  totalRankingTimeMs: number;
  totalPlanningTimeMs: number;
  cacheHits: number;
  cacheMisses: number;
}

export class RecommendationStatisticsCollector {
  private _totalRecommendations = 0;
  private _totalGroups = 0;
  private _totalPlans = 0;
  private _totalActions = 0;
  private _totalConflicts = 0;
  private _totalBatches = 0;
  private _totalFailures = 0;
  private _totalGenerationTimeMs = 0;
  private _totalRankingTimeMs = 0;
  private _totalPlanningTimeMs = 0;
  private _cacheHits = 0;
  private _cacheMisses = 0;
  private _riskReductionSum = 0;
  private _costSum = 0;
  private _benefitSum = 0;

  private readonly _ruleTypeDistribution: Record<string, number> = {};
  private readonly _sourceDistribution: Record<string, number> = {};
  private readonly _severityDistribution: Record<string, number> = {};
  private readonly _statusDistribution: Record<string, number> = {};

  constructor() {
    for (const rt of ALL_RECOMMENDATION_RULE_TYPES) this._ruleTypeDistribution[rt] = 0;
    for (const s of ALL_RECOMMENDATION_SOURCES) this._sourceDistribution[s] = 0;
    for (const s of ALL_RECOMMENDATION_SEVERITIES) this._severityDistribution[s] = 0;
    for (const s of ALL_ACTION_STATUSES) this._statusDistribution[s] = 0;
  }

  recordGeneration(durationMs: number, ruleType: RecommendationRuleType, source: RecommendationSource, severity: RecommendationSeverity, riskReduction: number, cost: number, benefit: number): void {
    this._totalRecommendations++;
    this._totalGenerationTimeMs += durationMs;
    this._ruleTypeDistribution[ruleType] = (this._ruleTypeDistribution[ruleType] ?? 0) + 1;
    this._sourceDistribution[source] = (this._sourceDistribution[source] ?? 0) + 1;
    this._severityDistribution[severity] = (this._severityDistribution[severity] ?? 0) + 1;
    this._riskReductionSum += riskReduction;
    this._costSum += cost;
    this._benefitSum += benefit;
  }

  recordRanking(durationMs: number): void {
    this._totalRankingTimeMs += durationMs;
  }

  recordPlanning(durationMs: number, actionCount: number, conflictCount: number): void {
    this._totalPlans++;
    this._totalPlanningTimeMs += durationMs;
    this._totalActions += actionCount;
    this._totalConflicts += conflictCount;
  }

  recordGroup(): void {
    this._totalGroups++;
  }

  recordBatch(): void {
    this._totalBatches++;
  }

  recordFailure(): void {
    this._totalFailures++;
  }

  recordCacheHit(): void {
    this._cacheHits++;
  }

  recordCacheMiss(): void {
    this._cacheMisses++;
  }

  recordStatus(status: ActionStatus): void {
    this._statusDistribution[status] = (this._statusDistribution[status] ?? 0) + 1;
  }

  collect(): import('../types/index.ts').RecommendationStatistics {
    const n = this._totalRecommendations || 1;
    return Object.freeze({
      id: generateRecommendationStatisticsId(),
      totalRecommendations: this._totalRecommendations,
      totalGroups: this._totalGroups,
      totalPlans: this._totalPlans,
      totalActions: this._totalActions,
      totalConflicts: this._totalConflicts,
      averageRiskReduction: this._totalRecommendations > 0 ? this._riskReductionSum / n : 0,
      averageCost: this._totalRecommendations > 0 ? this._costSum / n : 0,
      averageBenefit: this._totalRecommendations > 0 ? this._benefitSum / n : 0,
      coverageScore: 0,
      ruleTypeDistribution: Object.freeze({ ...this._ruleTypeDistribution }) as any,
      sourceDistribution: Object.freeze({ ...this._sourceDistribution }) as any,
      severityDistribution: Object.freeze({ ...this._severityDistribution }) as any,
      statusDistribution: Object.freeze({ ...this._statusDistribution }) as any,
      collectedAt: new Date().toISOString() as Timestamp,
    });
  }

  reset(): void {
    this._totalRecommendations = 0;
    this._totalGroups = 0;
    this._totalPlans = 0;
    this._totalActions = 0;
    this._totalConflicts = 0;
    this._totalBatches = 0;
    this._totalFailures = 0;
    this._totalGenerationTimeMs = 0;
    this._totalRankingTimeMs = 0;
    this._totalPlanningTimeMs = 0;
    this._cacheHits = 0;
    this._cacheMisses = 0;
    this._riskReductionSum = 0;
    this._costSum = 0;
    this._benefitSum = 0;
    for (const rt of ALL_RECOMMENDATION_RULE_TYPES) this._ruleTypeDistribution[rt] = 0;
    for (const s of ALL_RECOMMENDATION_SOURCES) this._sourceDistribution[s] = 0;
    for (const s of ALL_RECOMMENDATION_SEVERITIES) this._severityDistribution[s] = 0;
    for (const s of ALL_ACTION_STATUSES) this._statusDistribution[s] = 0;
  }
}
