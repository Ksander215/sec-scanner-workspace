/**
 * Personal Intelligence Runtime — Metrics Collector
 *
 * Lightweight in-process metrics: counters, gauges, and time series.
 * No external dependencies; suitable for embedding inside PersonalRuntime.
 */

interface SeriesEntry {
  readonly timestamp: string;
  readonly value: number;
}

export class PersonalMetricsCollector {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private series = new Map<string, SeriesEntry[]>();

  // ── Counter operations ──────────────────────────────────────

  increment(name: string): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + 1);
  }

  decrement(name: string): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) - 1);
  }

  // ── Gauge operations ────────────────────────────────────────

  setGauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  // ── Series operations ───────────────────────────────────────

  recordSeries(name: string, value: number): void {
    const entry: SeriesEntry = Object.freeze({
      timestamp: new Date().toISOString(),
      value,
    });

    const existing = this.series.get(name);
    if (existing) {
      existing.push(entry);
    } else {
      this.series.set(name, [entry]);
    }
  }

  // ── Read operations ─────────────────────────────────────────

  getCounter(name: string): number {
    return this.counters.get(name) ?? 0;
  }

  getGauge(name: string): number {
    return this.gauges.get(name) ?? 0;
  }

  getSeries(name: string): readonly { timestamp: string; value: number }[] {
    return Object.freeze(this.series.get(name) ?? []);
  }

  getSnapshot(): Readonly<Record<string, unknown>> {
    const snapshot: Record<string, unknown> = {};

    for (const [key, value] of this.counters) {
      snapshot[`counter:${key}`] = value;
    }
    for (const [key, value] of this.gauges) {
      snapshot[`gauge:${key}`] = value;
    }

    return Object.freeze(snapshot);
  }

  // ── Convenience getters ─────────────────────────────────────

  getGoalsCompleted(): number {
    return this.getGauge('goals.completed');
  }

  getHabitsDetected(): number {
    return this.getGauge('habits.detected');
  }

  getRecommendationsAccepted(): number {
    return this.getGauge('recommendations.accepted');
  }

  getPredictionAccuracy(): number {
    return this.getGauge('predictions.accuracy');
  }

  getLearningProgress(): number {
    return this.getGauge('learning.progress');
  }

  getDecisionSuccessRate(): number {
    return this.getGauge('decisions.successRate');
  }

  getAttentionScore(): number {
    return this.getGauge('attention.score');
  }

  getDailyProductivity(): number {
    return this.getGauge('daily.productivity');
  }

  // ── Trend analysis ──────────────────────────────────────────

  getWeeklyTrend(): 'improving' | 'declining' | 'stable' {
    return this.computeTrend(7);
  }

  getMonthlyTrend(): 'improving' | 'declining' | 'stable' {
    return this.computeTrend(30);
  }

  // ── Export & reset ──────────────────────────────────────────

  export(): string {
    const data = {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      series: Object.fromEntries(
        Array.from(this.series.entries()).map(([k, v]) => [k, v]),
      ),
    };
    return JSON.stringify(data, null, 2);
  }

  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.series.clear();
  }

  // ── Private helpers ─────────────────────────────────────────

  private computeTrend(windowDays: number): 'improving' | 'declining' | 'stable' {
    // Aggregate all series into a single normalized trend
    // by looking at the 'daily.productivity' series if available
    const productivitySeries = this.series.get('daily.productivity');
    if (!productivitySeries || productivitySeries.length < 2) return 'stable';

    const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
    const recent = productivitySeries.filter(e => e.timestamp >= cutoff);

    if (recent.length < 2) return 'stable';

    const mid = Math.floor(recent.length / 2);
    const firstHalf = recent.slice(0, mid);
    const secondHalf = recent.slice(mid);

    const firstAvg = firstHalf.reduce((sum, e) => sum + e.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, e) => sum + e.value, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;
    const threshold = firstAvg * 0.05 || 1; // at least 1 unit or 5%

    if (diff > threshold) return 'improving';
    if (diff < -threshold) return 'declining';
    return 'stable';
  }
}
