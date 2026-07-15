/**
 * Security Intelligence Correlation Engine — Statistics Collector
 *
 * Tracks comprehensive correlation engine statistics:
 * - Total correlated findings, failures, batches
 * - Correlation score distributions
 * - Duplicate detection metrics
 * - Cache performance
 * - Throughput and latency
 */

import type { CorrelationStatistics, Timestamp, CorrelationReason, DuplicateType } from '../types/index.ts';
import { CorrelationReason as Reason, DuplicateType as DupType } from '../types/index.ts';
import { Severity as Sev, SourceEngine as Src } from '../../normalization/types/index.ts';

// ─── Statistics Collector ────────────────────────────────────

export class CorrelationStatisticsCollector {
  private _totalCorrelated = 0;
  private _totalFailed = 0;
  private _totalBatches = 0;
  private _totalIncremental = 0;
  private _totalDeduplications = 0;
  private _totalCorrelationTimeMs = 0;
  private _totalBatchTimeMs = 0;
  private _cacheHits = 0;
  private _cacheMisses = 0;
  private readonly _correlationDistribution: Record<string, number> = {};
  private readonly _duplicateDistribution: Record<string, number> = {};
  private _startedAt: Timestamp;

  constructor() {
    this._startedAt = new Date().toISOString() as Timestamp;
    this.initDistributions();
  }

  private initDistributions(): void {
    for (const r of Object.values(Reason)) this._correlationDistribution[r] = 0;
    for (const d of Object.values(DupType)) this._duplicateDistribution[d] = 0;
  }

  /** Record a successful correlation */
  recordCorrelation(durationMs: number, reasons: readonly CorrelationReason[]): void {
    this._totalCorrelated++;
    this._totalCorrelationTimeMs += durationMs;
    for (const reason of reasons) {
      this._correlationDistribution[reason] = (this._correlationDistribution[reason] ?? 0) + 1;
    }
  }

  /** Record a failed correlation */
  recordFailure(): void {
    this._totalFailed++;
  }

  /** Record a batch operation */
  recordBatch(durationMs: number, count: number): void {
    this._totalBatches++;
    this._totalBatchTimeMs += durationMs;
  }

  /** Record an incremental update */
  recordIncremental(): void {
    this._totalIncremental++;
  }

  /** Record a deduplication */
  recordDeduplication(type: DuplicateType): void {
    this._totalDeduplications++;
    this._duplicateDistribution[type] = (this._duplicateDistribution[type] ?? 0) + 1;
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
    this._totalCorrelated = 0;
    this._totalFailed = 0;
    this._totalBatches = 0;
    this._totalIncremental = 0;
    this._totalDeduplications = 0;
    this._totalCorrelationTimeMs = 0;
    this._totalBatchTimeMs = 0;
    this._cacheHits = 0;
    this._cacheMisses = 0;
    this._startedAt = new Date().toISOString() as Timestamp;
    this.initDistributions();
  }

  /** Collect current statistics */
  collect(): CorrelationStatistics {
    const totalOps = this._totalCorrelated + this._totalFailed;
    const avgCorrTime = totalOps > 0 ? this._totalCorrelationTimeMs / totalOps : 0;
    const avgBatchTime = this._totalBatches > 0 ? this._totalBatchTimeMs / this._totalBatches : 0;
    const totalCacheOps = this._cacheHits + this._cacheMisses;
    const cacheHitRate = totalCacheOps > 0 ? this._cacheHits / totalCacheOps : 0;
    const throughput = totalOps > 0 && this._totalCorrelationTimeMs > 0
      ? (totalOps / this._totalCorrelationTimeMs) * 1000
      : 0;

    const memoryUsageBytes =
      this._totalCorrelated * 800 + // ~800 bytes per correlation
      this._cacheHits * 200 +
      1024 * 200; // base overhead ~200KB

    return {
      totalCorrelated: this._totalCorrelated,
      totalFailed: this._totalFailed,
      totalBatches: this._totalBatches,
      totalIncremental: this._totalIncremental,
      totalDeduplications: this._totalDeduplications,
      averageCorrelationTimeMs: Math.round(avgCorrTime * 1000) / 1000,
      averageBatchTimeMs: Math.round(avgBatchTime * 1000) / 1000,
      throughputPerSecond: Math.round(throughput * 1000) / 1000,
      cacheHitRate: Math.round(cacheHitRate * 1000) / 1000,
      cacheHits: this._cacheHits,
      cacheMisses: this._cacheMisses,
      memoryUsageBytes,
      correlationDistribution: Object.freeze({ ...this._correlationDistribution }) as Readonly<Record<CorrelationReason, number>>,
      duplicateDistribution: Object.freeze({ ...this._duplicateDistribution }) as Readonly<Record<DuplicateType, number>>,
      collectedAt: new Date().toISOString() as Timestamp,
    };
  }

  // ─── Getters ────────────────────────────────────────────

  get totalCorrelated(): number { return this._totalCorrelated; }
  get totalFailed(): number { return this._totalFailed; }
  get totalBatches(): number { return this._totalBatches; }
  get totalIncremental(): number { return this._totalIncremental; }
  get totalDeduplications(): number { return this._totalDeduplications; }
  get cacheHits(): number { return this._cacheHits; }
  get cacheMisses(): number { return this._cacheMisses; }
  get startedAt(): Timestamp { return this._startedAt; }
}
