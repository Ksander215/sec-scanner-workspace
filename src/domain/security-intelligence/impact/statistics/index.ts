/**
 * Security Intelligence Impact Analysis — Statistics Collector
 *
 * Collects and reports operational statistics for the Impact Analysis Engine.
 * Tracks analysis counts, timing, throughput, and distributions.
 */

import type { ImpactStatistics, MitigationScenarioType, Timestamp } from '../types/index.ts';
import { ALL_MITIGATION_SCENARIO_TYPES } from '../types/index.ts';

export class ImpactStatisticsCollector {
  private _totalAnalyses = 0;
  private _totalSimulations = 0;
  private _totalComparisons = 0;
  private _totalRankings = 0;
  private _totalFailed = 0;
  private _totalBatches = 0;
  private _totalAnalysisTimeMs = 0;
  private _totalSimulationTimeMs = 0;
  private _totalComparisonTimeMs = 0;
  private readonly _scenarioDistribution: Record<string, number> = {};
  private _cacheHits = 0;
  private _cacheMisses = 0;
  private _startTime = Date.now();

  constructor() {
    for (const type of ALL_MITIGATION_SCENARIO_TYPES) {
      this._scenarioDistribution[type] = 0;
    }
  }

  recordAnalysis(durationMs: number, scenarioType: MitigationScenarioType): void {
    this._totalAnalyses++;
    this._totalAnalysisTimeMs += durationMs;
    this._scenarioDistribution[scenarioType] = (this._scenarioDistribution[scenarioType] ?? 0) + 1;
  }

  recordSimulation(durationMs: number): void {
    this._totalSimulations++;
    this._totalSimulationTimeMs += durationMs;
  }

  recordComparison(durationMs: number): void {
    this._totalComparisons++;
    this._totalComparisonTimeMs += durationMs;
  }

  recordRanking(): void {
    this._totalRankings++;
  }

  recordFailure(): void {
    this._totalFailed++;
  }

  recordBatch(): void {
    this._totalBatches++;
  }

  recordCacheHit(): void {
    this._cacheHits++;
  }

  recordCacheMiss(): void {
    this._cacheMisses++;
  }

  getStatistics(): ImpactStatistics {
    const elapsed = (Date.now() - this._startTime) / 1000;
    const totalOps = this._totalAnalyses + this._totalSimulations + this._totalComparisons;
    const totalCacheOps = this._cacheHits + this._cacheMisses;

    return Object.freeze({
      totalAnalyses: this._totalAnalyses,
      totalSimulations: this._totalSimulations,
      totalComparisons: this._totalComparisons,
      totalRankings: this._totalRankings,
      totalFailed: this._totalFailed,
      totalBatches: this._totalBatches,
      averageAnalysisTimeMs: this._totalAnalyses > 0 ? this._totalAnalysisTimeMs / this._totalAnalyses : 0,
      averageSimulationTimeMs: this._totalSimulations > 0 ? this._totalSimulationTimeMs / this._totalSimulations : 0,
      averageComparisonTimeMs: this._totalComparisons > 0 ? this._totalComparisonTimeMs / this._totalComparisons : 0,
      throughputPerSecond: elapsed > 0 ? totalOps / elapsed : 0,
      cacheHitRate: totalCacheOps > 0 ? this._cacheHits / totalCacheOps : 0,
      cacheHits: this._cacheHits,
      cacheMisses: this._cacheMisses,
      scenarioTypeDistribution: Object.freeze(
        { ...this._scenarioDistribution } as Readonly<Record<MitigationScenarioType, number>>
      ),
      collectedAt: new Date().toISOString() as Timestamp,
    });
  }

  reset(): void {
    this._totalAnalyses = 0;
    this._totalSimulations = 0;
    this._totalComparisons = 0;
    this._totalRankings = 0;
    this._totalFailed = 0;
    this._totalBatches = 0;
    this._totalAnalysisTimeMs = 0;
    this._totalSimulationTimeMs = 0;
    this._totalComparisonTimeMs = 0;
    this._cacheHits = 0;
    this._cacheMisses = 0;
    this._startTime = Date.now();
    for (const type of ALL_MITIGATION_SCENARIO_TYPES) {
      this._scenarioDistribution[type] = 0;
    }
  }
}
