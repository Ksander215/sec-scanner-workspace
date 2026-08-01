/**
 * Personal Intelligence Pack — Metrics Runtime
 * TASK-AIS-007A.000
 *
 * In-process metrics collection: counters, gauges, trends.
 */
import type { Timestamp } from '../types/common.js';
import { PackMetricKey } from './types.js';

interface SeriesEntry {
  readonly timestamp: string;
  readonly value: number;
}

export class PackMetricsRuntime {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private series = new Map<string, SeriesEntry[]>();

  // ── Counter operations ──────────────────────────────────────

  increment(key: PackMetricKey | string): void {
    this.counters.set(key, (this.counters.get(key) ?? 0) + 1);
  }

  decrement(key: PackMetricKey | string): void {
    this.counters.set(key, (this.counters.get(key) ?? 0) - 1);
  }

  getCounter(key: PackMetricKey | string): number {
    return this.counters.get(key) ?? 0;
  }

  // ── Gauge operations ────────────────────────────────────────

  setGauge(key: PackMetricKey | string, value: number): void {
    this.gauges.set(key, value);
  }

  getGauge(key: PackMetricKey | string): number {
    return this.gauges.get(key) ?? 0;
  }

  // ── Series operations ───────────────────────────────────────

  recordSeries(key: string, value: number): void {
    const entry: SeriesEntry = Object.freeze({ timestamp: new Date().toISOString(), value });
    const existing = this.series.get(key);
    if (existing) { existing.push(entry); } else { this.series.set(key, [entry]); }
  }

  getSeries(key: string): readonly { timestamp: string; value: number }[] {
    return Object.freeze(this.series.get(key) ?? []);
  }

  // ── Snapshot ────────────────────────────────────────────────

  getSnapshot(): { counters: Readonly<Record<string, number>>; gauges: Readonly<Record<string, number>>; trends: Readonly<Record<string, 'improving' | 'declining' | 'stable'>>; exportedAt: Timestamp } {
    const counters: Record<string, number> = {};
    for (const [k, v] of this.counters) counters[k] = v;
    const gauges: Record<string, number> = {};
    for (const [k, v] of this.gauges) gauges[k] = v;
    const trends: Record<string, 'improving' | 'declining' | 'stable'> = {};
    for (const [k] of this.series) trends[k] = this.computeTrend(k, 7);
    return Object.freeze({ counters, gauges, trends, exportedAt: new Date().toISOString() as Timestamp });
  }

  // ── Convenience getters ─────────────────────────────────────

  getProductivityIndex(): number { return this.getGauge(PackMetricKey.ProductivityIndex); }
  getDevelopmentIndex(): number { return this.getGauge(PackMetricKey.DevelopmentIndex); }
  getRecommendationChainCompletion(): number { return this.getGauge(PackMetricKey.RecommendationChainCompletion); }

  // ── Export & reset ──────────────────────────────────────────

  export(): string {
    const data = { counters: Object.fromEntries(this.counters), gauges: Object.fromEntries(this.gauges) };
    return JSON.stringify(data, null, 2);
  }

  reset(): void { this.counters.clear(); this.gauges.clear(); this.series.clear(); }

  dispose(): void { this.reset(); }

  // ── Private ────────────────────────────────────────────────

  private computeTrend(key: string, windowDays: number): 'improving' | 'declining' | 'stable' {
    const s = this.series.get(key);
    if (!s || s.length < 2) return 'stable';
    const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
    const recent = s.filter(e => e.timestamp >= cutoff);
    if (recent.length < 2) return 'stable';
    const mid = Math.floor(recent.length / 2);
    const firstAvg = recent.slice(0, mid).reduce((sum, e) => sum + e.value, 0) / (mid || 1);
    const secondAvg = recent.slice(mid).reduce((sum, e) => sum + e.value, 0) / (recent.length - mid || 1);
    const diff = secondAvg - firstAvg;
    const threshold = Math.abs(firstAvg) * 0.05 || 1;
    if (diff > threshold) return 'improving';
    if (diff < -threshold) return 'declining';
    return 'stable';
  }
}
