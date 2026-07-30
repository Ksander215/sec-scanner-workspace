/**
 * Metrics Aggregator — Collects metrics from all Runtimes
 * TASK-AIS-005A.000 — Platform Integration Foundation
 *
 * Supports counters, gauges, and time-series with labels.
 * Provides export capability for external monitoring systems.
 */
import type { MetricPoint, MetricSeries, MetricsAggregator } from '../types.js';

export class PlatformMetricsAggregator implements MetricsAggregator {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private series = new Map<string, MetricPoint[]>();
  private maxPointsPerSeries: number;

  constructor(maxPointsPerSeries = 10000) {
    this.maxPointsPerSeries = maxPointsPerSeries;
  }

  record(name: string, value: number, labels?: Readonly<Record<string, string>>): void {
    const key = labels ? `${name}:${JSON.stringify(labels)}` : name;
    let points = this.series.get(key);
    if (!points) {
      points = [];
      this.series.set(key, points);
    }
    if (points.length >= this.maxPointsPerSeries) {
      points = points.slice(-this.maxPointsPerSeries + 1);
      this.series.set(key, points);
    }
    points.push({
      timestamp: new Date().toISOString(),
      value,
      labels,
    });
  }

  increment(name: string, labels?: Readonly<Record<string, string>>): void {
    const key = labels ? `${name}:${JSON.stringify(labels)}` : name;
    const current = this.counters.get(key) ?? 0;
    this.counters.set(key, current + 1);
    this.record(name, current + 1, labels);
  }

  decrement(name: string, labels?: Readonly<Record<string, string>>): void {
    const key = labels ? `${name}:${JSON.stringify(labels)}` : name;
    const current = this.counters.get(key) ?? 0;
    this.counters.set(key, current - 1);
    this.record(name, current - 1, labels);
  }

  counter(name: string): number {
    return this.counters.get(name) ?? 0;
  }

  gauge(name: string): number {
    return this.gauges.get(name) ?? 0;
  }

  setGauge(name: string, value: number): void {
    this.gauges.set(name, value);
    this.record(name, value);
  }

  getSeries(name: string): MetricSeries | undefined {
    const points = this.series.get(name);
    if (!points) return undefined;
    return { name, points: [...points] };
  }

  getAllSeries(): readonly MetricSeries[] {
    return [...this.series.entries()].map(([name, points]) => ({
      name,
      points: [...points],
    }));
  }

  snapshot(): Readonly<Record<string, MetricPoint[]>> {
    const result: Record<string, MetricPoint[]> = {};
    for (const [name, points] of this.series) {
      result[name] = [...points];
    }
    return Object.freeze(result);
  }

  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.series.clear();
  }

  export(): string {
    return JSON.stringify({
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      seriesCount: this.series.size,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }
}
