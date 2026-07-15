/**
 * Security Intelligence Normalization — Statistics Collector
 *
 * Tracks comprehensive normalization engine statistics:
 * - Total normalized/failed findings
 * - Average normalization time
 * - Throughput metrics
 * - Cache performance
 * - Severity/source/category distributions
 * - Memory usage estimates
 */

import type {
  NormalizationStatistics, Timestamp, Severity, SourceEngine, FindingCategory,
} from '../types/index.ts';
import { Severity as Sev, SourceEngine as Src, FindingCategory as Cat } from '../types/index.ts';

// ─── Statistics Collector ────────────────────────────────────

export class NormalizationStatisticsCollector {
  private _totalNormalized = 0;
  private _totalFailed = 0;
  private _totalValidated = 0;
  private _totalBatches = 0;
  private _totalNormalizationTimeMs = 0;
  private _totalBatchTimeMs = 0;
  private _cacheHits = 0;
  private _cacheMisses = 0;
  private readonly _severityDistribution: Record<string, number> = {};
  private readonly _sourceDistribution: Record<string, number> = {};
  private readonly _categoryDistribution: Record<string, number> = {};
  private _startedAt: Timestamp;

  constructor() {
    this._startedAt = new Date().toISOString() as Timestamp;
    this.initDistributions();
  }

  private initDistributions(): void {
    for (const s of Object.values(Sev)) this._severityDistribution[s] = 0;
    for (const s of Object.values(Src)) this._sourceDistribution[s] = 0;
    for (const c of Object.values(Cat)) this._categoryDistribution[c] = 0;
  }

  /** Record a successful normalization */
  recordNormalization(durationMs: number, severity: Severity, source: SourceEngine, category: FindingCategory): void {
    this._totalNormalized++;
    this._totalNormalizationTimeMs += durationMs;
    this._severityDistribution[severity] = (this._severityDistribution[severity] ?? 0) + 1;
    this._sourceDistribution[source] = (this._sourceDistribution[source] ?? 0) + 1;
    this._categoryDistribution[category] = (this._categoryDistribution[category] ?? 0) + 1;
  }

  /** Record a failed normalization */
  recordFailure(): void {
    this._totalFailed++;
  }

  /** Record a validation */
  recordValidation(): void {
    this._totalValidated++;
  }

  /** Record a batch operation */
  recordBatch(durationMs: number, count: number): void {
    this._totalBatches++;
    this._totalBatchTimeMs += durationMs;
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
    this._totalNormalized = 0;
    this._totalFailed = 0;
    this._totalValidated = 0;
    this._totalBatches = 0;
    this._totalNormalizationTimeMs = 0;
    this._totalBatchTimeMs = 0;
    this._cacheHits = 0;
    this._cacheMisses = 0;
    this._startedAt = new Date().toISOString() as Timestamp;
    this.initDistributions();
  }

  /** Collect current statistics */
  collect(): NormalizationStatistics {
    const totalOps = this._totalNormalized + this._totalFailed;
    const avgNormTime = totalOps > 0 ? this._totalNormalizationTimeMs / totalOps : 0;
    const avgBatchTime = this._totalBatches > 0 ? this._totalBatchTimeMs / this._totalBatches : 0;
    const totalCacheOps = this._cacheHits + this._cacheMisses;
    const cacheHitRate = totalCacheOps > 0 ? this._cacheHits / totalCacheOps : 0;
    const throughput = totalOps > 0 && this._totalNormalizationTimeMs > 0
      ? (totalOps / this._totalNormalizationTimeMs) * 1000
      : 0;

    // Estimate memory usage
    const memoryUsageBytes =
      this._totalNormalized * 500 + // ~500 bytes per finding
      this._cacheHits * 200 +       // cache entry overhead
      1024 * 100;                   // base overhead ~100KB

    return {
      totalNormalized: this._totalNormalized,
      totalFailed: this._totalFailed,
      totalValidated: this._totalValidated,
      totalBatches: this._totalBatches,
      averageNormalizationTimeMs: Math.round(avgNormTime * 1000) / 1000,
      averageBatchTimeMs: Math.round(avgBatchTime * 1000) / 1000,
      throughputPerSecond: Math.round(throughput * 1000) / 1000,
      cacheHitRate: Math.round(cacheHitRate * 1000) / 1000,
      cacheHits: this._cacheHits,
      cacheMisses: this._cacheMisses,
      memoryUsageBytes,
      severityDistribution: Object.freeze({ ...this._severityDistribution }) as Readonly<Record<Severity, number>>,
      sourceDistribution: Object.freeze({ ...this._sourceDistribution }) as Readonly<Record<SourceEngine, number>>,
      categoryDistribution: Object.freeze({ ...this._categoryDistribution }) as Readonly<Record<FindingCategory, number>>,
      collectedAt: new Date().toISOString() as Timestamp,
    };
  }

  // ─── Getters ────────────────────────────────────────────

  get totalNormalized(): number { return this._totalNormalized; }
  get totalFailed(): number { return this._totalFailed; }
  get totalValidated(): number { return this._totalValidated; }
  get totalBatches(): number { return this._totalBatches; }
  get cacheHits(): number { return this._cacheHits; }
  get cacheMisses(): number { return this._cacheMisses; }
  get startedAt(): Timestamp { return this._startedAt; }
}
