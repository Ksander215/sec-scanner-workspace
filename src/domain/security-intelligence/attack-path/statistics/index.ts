/**
 * Security Intelligence Attack Path Builder — Statistics Collector
 *
 * Collects and reports metrics for the Attack Path Engine.
 * Tracks discovery, ranking, simulation, projection, and cache metrics.
 */

import type {
  AttackPathStatistics, Timestamp, DiscoveryStrategy, AttackObjectiveType,
} from '../types/index.ts';
import { DiscoveryStrategy as DS, AttackObjectiveType as AOT, ALL_ATTACK_OBJECTIVE_TYPES } from '../types/index.ts';

// ─── Mutable Statistics (internal) ───────────────────────────

interface MutableStatistics {
  totalDiscoveries: number;
  totalRankings: number;
  totalSimulations: number;
  totalProjections: number;
  totalFailed: number;
  totalBatches: number;
  discoveryTimes: number[];
  rankingTimes: number[];
  simulationTimes: number[];
  projectionTimes: number[];
  cacheHits: number;
  cacheMisses: number;
  strategyDistribution: Record<string, number>;
  objectiveDistribution: Record<string, number>;
}

// ─── Statistics Collector ────────────────────────────────────

/**
 * Collects real-time metrics for the Attack Path Engine.
 * Follows the same pattern as RiskStatisticsCollector.
 */
export class AttackPathStatisticsCollector {
  private readonly _stats: MutableStatistics;

  constructor() {
    const stratDist: Record<string, number> = {};
    const objDist: Record<string, number> = {};
    for (const s of Object.values(DS)) stratDist[s] = 0;
    for (const t of ALL_ATTACK_OBJECTIVE_TYPES) objDist[t] = 0;

    this._stats = {
      totalDiscoveries: 0,
      totalRankings: 0,
      totalSimulations: 0,
      totalProjections: 0,
      totalFailed: 0,
      totalBatches: 0,
      discoveryTimes: [],
      rankingTimes: [],
      simulationTimes: [],
      projectionTimes: [],
      cacheHits: 0,
      cacheMisses: 0,
      strategyDistribution: stratDist,
      objectiveDistribution: objDist,
    };
  }

  /** Record a discovery operation */
  recordDiscovery(durationMs: number, strategy: DiscoveryStrategy, objectiveType: AttackObjectiveType): void {
    this._stats.totalDiscoveries++;
    this._stats.discoveryTimes.push(durationMs);
    this._stats.strategyDistribution[strategy] = (this._stats.strategyDistribution[strategy] ?? 0) + 1;
    this._stats.objectiveDistribution[objectiveType] = (this._stats.objectiveDistribution[objectiveType] ?? 0) + 1;
  }

  /** Record a ranking operation */
  recordRanking(durationMs: number): void {
    this._stats.totalRankings++;
    this._stats.rankingTimes.push(durationMs);
  }

  /** Record a simulation operation */
  recordSimulation(durationMs: number): void {
    this._stats.totalSimulations++;
    this._stats.simulationTimes.push(durationMs);
  }

  /** Record a projection operation */
  recordProjection(durationMs: number): void {
    this._stats.totalProjections++;
    this._stats.projectionTimes.push(durationMs);
  }

  /** Record a failed operation */
  recordFailure(): void {
    this._stats.totalFailed++;
  }

  /** Record a batch operation */
  recordBatch(): void {
    this._stats.totalBatches++;
  }

  /** Record a cache hit */
  recordCacheHit(): void {
    this._stats.cacheHits++;
  }

  /** Record a cache miss */
  recordCacheMiss(): void {
    this._stats.cacheMisses++;
  }

  /** Collect and return current statistics */
  collect(): AttackPathStatistics {
    const total = this._stats.cacheHits + this._stats.cacheMisses;
    const hitRate = total > 0 ? this._stats.cacheHits / total : 0;

    const avgDisc = this.average(this._stats.discoveryTimes);
    const avgRank = this.average(this._stats.rankingTimes);
    const avgSim = this.average(this._stats.simulationTimes);
    const avgProj = this.average(this._stats.projectionTimes);

    const throughput = avgDisc > 0 ? 1000 / avgDisc : 0;
    const memoryEstimate = this._stats.totalDiscoveries * 2048 + this._stats.totalSimulations * 1024;

    return Object.freeze({
      totalDiscoveries: this._stats.totalDiscoveries,
      totalRankings: this._stats.totalRankings,
      totalSimulations: this._stats.totalSimulations,
      totalProjections: this._stats.totalProjections,
      totalFailed: this._stats.totalFailed,
      totalBatches: this._stats.totalBatches,
      averageDiscoveryTimeMs: avgDisc,
      averageRankingTimeMs: avgRank,
      averageSimulationTimeMs: avgSim,
      averageProjectionTimeMs: avgProj,
      throughputPerSecond: Math.round(throughput * 100) / 100,
      cacheHitRate: Math.round(hitRate * 10000) / 10000,
      cacheHits: this._stats.cacheHits,
      cacheMisses: this._stats.cacheMisses,
      memoryUsageBytes: memoryEstimate,
      strategyDistribution: Object.freeze({ ...this._stats.strategyDistribution } as Readonly<Record<DiscoveryStrategy, number>>),
      objectiveDistribution: Object.freeze({ ...this._stats.objectiveDistribution } as Readonly<Record<AttackObjectiveType, number>>),
      collectedAt: new Date().toISOString() as Timestamp,
    });
  }

  /** Reset all statistics */
  reset(): void {
    this._stats.totalDiscoveries = 0;
    this._stats.totalRankings = 0;
    this._stats.totalSimulations = 0;
    this._stats.totalProjections = 0;
    this._stats.totalFailed = 0;
    this._stats.totalBatches = 0;
    this._stats.discoveryTimes = [];
    this._stats.rankingTimes = [];
    this._stats.simulationTimes = [];
    this._stats.projectionTimes = [];
    this._stats.cacheHits = 0;
    this._stats.cacheMisses = 0;
    for (const s of Object.values(DS)) this._stats.strategyDistribution[s] = 0;
    for (const t of ALL_ATTACK_OBJECTIVE_TYPES) this._stats.objectiveDistribution[t] = 0;
  }

  // ─── Private Helpers ────────────────────────────────────

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length * 100) / 100;
  }
}
