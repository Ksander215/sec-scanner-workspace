/**
 * Security Intelligence Risk Engine — Risk History
 *
 * Tracks the history of risk assessments over time.
 * Supports querying history by finding, time range, and level.
 *
 * Features:
 * - History entry creation with delta tracking
 * - Retention-based cleanup
 * - History queries with filters
 * - Statistics on history changes
 */

import type {
  RiskAssessmentId, FindingId, Timestamp, RiskLevel, RiskTrend, RiskReason,
  RiskHistoryEntry, RiskAssessment,
} from '../types/index.ts';
import {
  RiskLevel as RLvl, RiskTrend as RTrend,
} from '../types/index.ts';
import {
  createRiskHistoryEntry, determineRiskTrend,
} from '../models/index.ts';

// ─── History Query ───────────────────────────────────────────

/** Filter options for querying history */
export interface HistoryQuery {
  readonly findingId?: FindingId;
  readonly fromTimestamp?: Timestamp;
  readonly toTimestamp?: Timestamp;
  readonly level?: RiskLevel;
  readonly trend?: RiskTrend;
  readonly limit?: number;
}

/** Statistics about risk history */
export interface HistoryStatistics {
  readonly totalEntries: number;
  readonly uniqueFindings: number;
  readonly averageDelta: number;
  readonly maxDelta: number;
  readonly increasingCount: number;
  readonly decreasingCount: number;
  readonly stableCount: number;
  readonly newCount: number;
  readonly resolvedCount: number;
  readonly levelTransitionCounts: Readonly<Record<string, number>>;
}

// ─── Risk History Manager ────────────────────────────────────

/**
 * Manages risk assessment history with retention and queries.
 * All methods are deterministic.
 */
export class RiskHistoryManager {
  private readonly _entries: RiskHistoryEntry[] = [];
  private readonly _retentionDays: number;
  private readonly _maxEntries: number;
  private readonly _previousScores: Map<string, { readonly score: number; readonly level: RiskLevel }> = new Map();
  private _autoPurgeCounter = 0;
  private static readonly AUTO_PURGE_INTERVAL = 1000; // Purge every 1000 entries

  constructor(config: { readonly retentionDays?: number; readonly maxEntries?: number } = {}) {
    this._retentionDays = config.retentionDays ?? 90;
    this._maxEntries = config.maxEntries ?? 100_000; // FIX #4: Cap max entries
  }

  /**
   * Record a risk assessment in history.
   * Creates a history entry with the delta from the previous assessment.
   */
  record(assessment: RiskAssessment): RiskHistoryEntry {
    const findingKey = assessment.findingId;
    const previous = this._previousScores.get(findingKey);

    const delta = previous
      ? assessment.score.rawScore - previous.score
      : 0;

    const entry = createRiskHistoryEntry({
      assessmentId: assessment.id,
      findingId: assessment.findingId,
      rawScore: assessment.score.rawScore,
      level: assessment.score.level,
      trend: assessment.trend,
      reasons: assessment.score.reasons,
      delta: Math.round(delta * 10000) / 10000,
    });

    this._entries.push(entry);
    this._previousScores.set(findingKey, {
      score: assessment.score.rawScore,
      level: assessment.score.level,
    });

    // FIX #4: Auto-purge expired entries periodically
    this._autoPurgeCounter++;
    if (this._autoPurgeCounter >= RiskHistoryManager.AUTO_PURGE_INTERVAL) {
      this.purgeExpired();
      this._autoPurgeCounter = 0;
    }

    // FIX #4: Cap max entries to prevent unbounded growth
    while (this._entries.length > this._maxEntries) {
      this._entries.shift();
    }

    return entry;
  }

  /**
   * Record multiple assessments.
   */
  recordBatch(assessments: readonly RiskAssessment[]): readonly RiskHistoryEntry[] {
    return Object.freeze(assessments.map(a => this.record(a)));
  }

  /**
   * Query history entries with optional filters.
   */
  query(query: HistoryQuery = {}): readonly RiskHistoryEntry[] {
    let results = [...this._entries];

    if (query.findingId) {
      results = results.filter(e => e.findingId === query.findingId);
    }

    if (query.fromTimestamp) {
      results = results.filter(e => e.assessedAt >= (query.fromTimestamp as string));
    }

    if (query.toTimestamp) {
      results = results.filter(e => e.assessedAt <= (query.toTimestamp as string));
    }

    if (query.level) {
      results = results.filter(e => e.level === query.level);
    }

    if (query.trend) {
      results = results.filter(e => e.trend === query.trend);
    }

    if (query.limit && query.limit > 0) {
      results = results.slice(-query.limit);
    }

    return Object.freeze(results);
  }

  /**
   * Get the previous score for a finding.
   */
  getPreviousScore(findingId: FindingId): { readonly score: number; readonly level: RiskLevel } | null {
    return this._previousScores.get(findingId) ?? null;
  }

  /**
   * Get all history entries for a specific finding.
   */
  getHistoryForFinding(findingId: FindingId): readonly RiskHistoryEntry[] {
    return Object.freeze(
      this._entries.filter(e => e.findingId === findingId),
    );
  }

  /**
   * Compute history statistics.
   */
  getStatistics(): HistoryStatistics {
    const findingIds = new Set(this._entries.map(e => e.findingId));
    const deltas = this._entries.filter(e => e.delta !== 0).map(e => e.delta);

    const trendCounts = {
      [RTrend.Increasing]: 0,
      [RTrend.Decreasing]: 0,
      [RTrend.Stable]: 0,
      [RTrend.New]: 0,
      [RTrend.Resolved]: 0,
    };

    for (const entry of this._entries) {
      trendCounts[entry.trend] = (trendCounts[entry.trend] ?? 0) + 1;
    }

    // Level transitions: "Low→Medium" → count
    const transitionCounts: Record<string, number> = {};
    const findingHistories = new Map<FindingId, RiskHistoryEntry[]>();
    for (const entry of this._entries) {
      const hist = findingHistories.get(entry.findingId) ?? [];
      hist.push(entry);
      findingHistories.set(entry.findingId, hist);
    }

    for (const [, entries] of findingHistories) {
      for (let i = 1; i < entries.length; i++) {
        const prev = entries[i - 1];
        const curr = entries[i];
        if (prev.level !== curr.level) {
          const key = `${prev.level}→${curr.level}`;
          transitionCounts[key] = (transitionCounts[key] ?? 0) + 1;
        }
      }
    }

    return Object.freeze({
      totalEntries: this._entries.length,
      uniqueFindings: findingIds.size,
      averageDelta: deltas.length > 0
        ? Math.round((deltas.reduce((a, b) => a + b, 0) / deltas.length) * 10000) / 10000
        : 0,
      maxDelta: deltas.length > 0
        ? Math.round(Math.max(...deltas.map(Math.abs)) * 10000) / 10000
        : 0,
      increasingCount: trendCounts[RTrend.Increasing],
      decreasingCount: trendCounts[RTrend.Decreasing],
      stableCount: trendCounts[RTrend.Stable],
      newCount: trendCounts[RTrend.New],
      resolvedCount: trendCounts[RTrend.Resolved],
      levelTransitionCounts: Object.freeze(transitionCounts),
    });
  }

  /**
   * Purge entries older than retention period.
   */
  purgeExpired(): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this._retentionDays);
    const cutoffStr = cutoff.toISOString();

    const before = this._entries.length;
    const remaining = this._entries.filter(e => e.assessedAt >= cutoffStr);
    this._entries.length = 0;
    this._entries.push(...remaining);

    return before - this._entries.length;
  }

  /**
   * Clear all history entries.
   */
  clear(): void {
    this._entries.length = 0;
    this._previousScores.clear();
  }

  /** Number of history entries */
  get size(): number {
    return this._entries.length;
  }

  /** Number of tracked findings */
  get findingCount(): number {
    return new Set(this._entries.map(e => e.findingId)).size;
  }
}
