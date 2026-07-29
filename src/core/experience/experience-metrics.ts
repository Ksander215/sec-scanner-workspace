/**
 * Experience Runtime — Metrics Collector
 * TASK-AIS-004A.000, Subsystem 11
 *
 * Collects and manages experience runtime metrics.
 */

import type {
  ExperienceMetricKey,
  ExperienceMetric,
} from './types.js';

export class ExperienceMetrics {
  private readonly storage = new Map<string, ExperienceMetric[]>();

  /** Record a metric data point */
  recordMetric(
    key: ExperienceMetricKey,
    value: number,
    tags?: Readonly<Record<string, string>>,
  ): void {
    const metric: ExperienceMetric = {
      key,
      value,
      timestamp: new Date().toISOString(),
      tags: tags ?? {},
    };
    let entries = this.storage.get(key);
    if (!entries) {
      entries = [];
      this.storage.set(key, entries);
    }
    entries.push(metric);
  }

  /** Get all data points for a metric key */
  getMetric(key: ExperienceMetricKey): readonly ExperienceMetric[] {
    return this.storage.get(key) ?? [];
  }

  /** Get latest data point for a metric key */
  getLatestMetric(key: ExperienceMetricKey): ExperienceMetric | null {
    const entries = this.storage.get(key);
    if (!entries || entries.length === 0) return null;
    return entries[entries.length - 1];
  }

  /** Get all metrics associated with a user hash (from tags) */
  getMetricsForUser(userIdHash: string): readonly ExperienceMetric[] {
    const result: ExperienceMetric[] = [];
    for (const entries of this.storage.values()) {
      for (const m of entries) {
        if (m.tags['userIdHash'] === userIdHash) {
          result.push(m);
        }
      }
    }
    return result;
  }

  /** Increment a counter metric by 1 */
  incrementCounter(
    key: ExperienceMetricKey,
    tags?: Readonly<Record<string, string>>,
  ): void {
    const current = this.getCounter(key, tags);
    this.recordMetric(key, current + 1, tags);
  }

  /** Get current counter value for a key+tags combination */
  getCounter(
    key: ExperienceMetricKey,
    tags?: Readonly<Record<string, string>>,
  ): number {
    const entries = this.storage.get(key);
    if (!entries || entries.length === 0) return 0;

    const filtered = tags
      ? entries.filter((m) => {
          for (const [k, v] of Object.entries(tags)) {
            if (m.tags[k] !== v) return false;
          }
          return true;
        })
      : entries;

    return filtered.length > 0 ? filtered[filtered.length - 1].value : 0;
  }

  /** Get aggregated summary of all metrics */
  getSummary(): Readonly<Record<string, number>> {
    const summary: Record<string, number> = {};
    for (const [key, entries] of this.storage) {
      if (entries.length > 0) {
        summary[key] = entries[entries.length - 1].value;
      }
    }
    return summary;
  }

  /** Clear all metrics */
  reset(): void {
    this.storage.clear();
  }
}
