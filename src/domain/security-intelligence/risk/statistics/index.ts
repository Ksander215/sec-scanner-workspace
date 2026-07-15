/**
 * Security Intelligence Risk Engine — Statistics Collector
 *
 * Tracks comprehensive risk engine statistics:
 * - Total assessments, failures, batches
 * - Risk level and trend distributions
 * - Factor usage distribution
 * - Cache performance
 * - Throughput and latency
 */

import type { RiskStatistics, Timestamp, RiskLevel, RiskTrend, RiskFactorType } from '../types/index.ts';
import { RiskLevel as RLvl, RiskTrend as RTrend, RiskFactorType as RFT } from '../types/index.ts';
import { createEmptyLevelDistribution, createEmptyTrendDistribution, createEmptyFactorDistribution } from '../models/index.ts';

// ─── Statistics Collector ────────────────────────────────────

export class RiskStatisticsCollector {
  private _totalAssessed = 0;
  private _totalFailed = 0;
  private _totalBatches = 0;
  private _totalAggregations = 0;
  private _totalHistoryRecords = 0;
  private _totalAssessmentTimeMs = 0;
  private _totalBatchTimeMs = 0;
  private _cacheHits = 0;
  private _cacheMisses = 0;
  private readonly _levelDistribution: Record<string, number>;
  private readonly _trendDistribution: Record<string, number>;
  private readonly _factorDistribution: Record<string, number>;
  private _startedAt: Timestamp;

  constructor() {
    this._startedAt = new Date().toISOString() as Timestamp;
    this._levelDistribution = { ...createEmptyLevelDistribution() };
    this._trendDistribution = { ...createEmptyTrendDistribution() };
    this._factorDistribution = { ...createEmptyFactorDistribution() };
  }

  /** Record a successful assessment */
  recordAssessment(durationMs: number, level: RiskLevel, trend: RiskTrend, factorTypes: readonly RiskFactorType[]): void {
    this._totalAssessed++;
    this._totalAssessmentTimeMs += durationMs;
    this._levelDistribution[level] = (this._levelDistribution[level] ?? 0) + 1;
    this._trendDistribution[trend] = (this._trendDistribution[trend] ?? 0) + 1;
    for (const ft of factorTypes) {
      this._factorDistribution[ft] = (this._factorDistribution[ft] ?? 0) + 1;
    }
  }

  /** Record a failed assessment */
  recordFailure(): void {
    this._totalFailed++;
  }

  /** Record a batch operation */
  recordBatch(durationMs: number, count: number): void {
    this._totalBatches++;
    this._totalBatchTimeMs += durationMs;
  }

  /** Record an aggregation */
  recordAggregation(): void {
    this._totalAggregations++;
  }

  /** Record a history entry */
  recordHistoryEntry(): void {
    this._totalHistoryRecords++;
  }

  /** Record a cache hit */
  recordCacheHit(): void {
    this._cacheHits++;
  }

  /** Record a cache miss */
  recordCacheMiss(): void {
    this._cacheMisses++;
  }

  /** Reset all counters */
  reset(): void {
    this._totalAssessed = 0;
    this._totalFailed = 0;
    this._totalBatches = 0;
    this._totalAggregations = 0;
    this._totalHistoryRecords = 0;
    this._totalAssessmentTimeMs = 0;
    this._totalBatchTimeMs = 0;
    this._cacheHits = 0;
    this._cacheMisses = 0;
    this._startedAt = new Date().toISOString() as Timestamp;
    for (const k of Object.keys(this._levelDistribution)) this._levelDistribution[k] = 0;
    for (const k of Object.keys(this._trendDistribution)) this._trendDistribution[k] = 0;
    for (const k of Object.keys(this._factorDistribution)) this._factorDistribution[k] = 0;
  }

  /** Collect current statistics */
  collect(): RiskStatistics {
    const totalOps = this._totalAssessed + this._totalFailed;
    const avgTime = totalOps > 0 ? this._totalAssessmentTimeMs / totalOps : 0;
    const avgBatchTime = this._totalBatches > 0 ? this._totalBatchTimeMs / this._totalBatches : 0;
    const totalCacheOps = this._cacheHits + this._cacheMisses;
    const cacheHitRate = totalCacheOps > 0 ? this._cacheHits / totalCacheOps : 0;
    const throughput = totalOps > 0 && this._totalAssessmentTimeMs > 0
      ? (totalOps / this._totalAssessmentTimeMs) * 1000
      : 0;

    const memoryUsageBytes =
      this._totalAssessed * 600 +
      this._cacheHits * 200 +
      1024 * 200;

    return {
      totalAssessed: this._totalAssessed,
      totalFailed: this._totalFailed,
      totalBatches: this._totalBatches,
      totalAggregations: this._totalAggregations,
      totalHistoryRecords: this._totalHistoryRecords,
      averageAssessmentTimeMs: Math.round(avgTime * 1000) / 1000,
      averageBatchTimeMs: Math.round(avgBatchTime * 1000) / 1000,
      throughputPerSecond: Math.round(throughput * 1000) / 1000,
      cacheHitRate: Math.round(cacheHitRate * 1000) / 1000,
      cacheHits: this._cacheHits,
      cacheMisses: this._cacheMisses,
      memoryUsageBytes,
      levelDistribution: Object.freeze({ ...this._levelDistribution }) as Readonly<Record<RiskLevel, number>>,
      trendDistribution: Object.freeze({ ...this._trendDistribution }) as Readonly<Record<RiskTrend, number>>,
      factorDistribution: Object.freeze({ ...this._factorDistribution }) as Readonly<Record<RiskFactorType, number>>,
      collectedAt: new Date().toISOString() as Timestamp,
    };
  }

  // ─── Getters ────────────────────────────────────────────

  get totalAssessed(): number { return this._totalAssessed; }
  get totalFailed(): number { return this._totalFailed; }
  get totalBatches(): number { return this._totalBatches; }
  get totalAggregations(): number { return this._totalAggregations; }
  get totalHistoryRecords(): number { return this._totalHistoryRecords; }
  get cacheHits(): number { return this._cacheHits; }
  get cacheMisses(): number { return this._cacheMisses; }
  get startedAt(): Timestamp { return this._startedAt; }
}
