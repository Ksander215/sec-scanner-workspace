/**
 * Tests for ExperienceMetrics (Subsystem 11)
 * TASK-AIS-004A.000
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExperienceMetrics } from '../../core/experience/experience-metrics.js';
import { ExperienceMetricKey } from '../../core/experience/types.js';

describe('ExperienceMetrics', () => {
  let metrics: ExperienceMetrics;

  beforeEach(() => {
    metrics = new ExperienceMetrics();
  });

  // ─── recordMetric ──────────────────────────────────────────

  describe('recordMetric', () => {
    it('stores a data point', () => {
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 1);
      const data = metrics.getMetric(ExperienceMetricKey.AdaptationCount);
      expect(data).toHaveLength(1);
    });

    it('stores the correct key', () => {
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 42);
      const data = metrics.getMetric(ExperienceMetricKey.AdaptationCount);
      expect(data[0].key).toBe(ExperienceMetricKey.AdaptationCount);
    });

    it('stores the correct value', () => {
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 42);
      const data = metrics.getMetric(ExperienceMetricKey.AdaptationCount);
      expect(data[0].value).toBe(42);
    });

    it('stores a timestamp', () => {
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 1);
      const data = metrics.getMetric(ExperienceMetricKey.AdaptationCount);
      expect(data[0].timestamp).toBeTruthy();
    });

    it('stores with empty tags by default', () => {
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 1);
      const data = metrics.getMetric(ExperienceMetricKey.AdaptationCount);
      expect(data[0].tags).toEqual({});
    });

    it('stores with custom tags', () => {
      const tags = { userIdHash: crypto.randomUUID(), source: 'test' };
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 1, tags);
      const data = metrics.getMetric(ExperienceMetricKey.AdaptationCount);
      expect(data[0].tags).toEqual(tags);
    });

    it('stores multiple data points for the same key', () => {
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 1);
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 2);
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 3);
      const data = metrics.getMetric(ExperienceMetricKey.AdaptationCount);
      expect(data).toHaveLength(3);
      expect(data[0].value).toBe(1);
      expect(data[1].value).toBe(2);
      expect(data[2].value).toBe(3);
    });

    it('stores zero values correctly', () => {
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 0);
      const data = metrics.getMetric(ExperienceMetricKey.AdaptationCount);
      expect(data[0].value).toBe(0);
    });

    it('stores negative values correctly', () => {
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, -5);
      const data = metrics.getMetric(ExperienceMetricKey.AdaptationCount);
      expect(data[0].value).toBe(-5);
    });

    it('stores fractional values correctly', () => {
      metrics.recordMetric(ExperienceMetricKey.PreferenceStability, 0.75);
      const data = metrics.getMetric(ExperienceMetricKey.PreferenceStability);
      expect(data[0].value).toBe(0.75);
    });

    it('stores data for different keys independently', () => {
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 10);
      metrics.recordMetric(ExperienceMetricKey.RecommendationAccepted, 5);
      expect(metrics.getMetric(ExperienceMetricKey.AdaptationCount)).toHaveLength(1);
      expect(metrics.getMetric(ExperienceMetricKey.RecommendationAccepted)).toHaveLength(1);
    });
  });

  // ─── getMetric ──────────────────────────────────────────────

  describe('getMetric', () => {
    it('returns all data points for a key', () => {
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 1);
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 2);
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 3);
      const data = metrics.getMetric(ExperienceMetricKey.AdaptationCount);
      expect(data).toHaveLength(3);
    });

    it('returns empty array for non-existent key', () => {
      const data = metrics.getMetric('nonexistent' as ExperienceMetricKey);
      expect(data).toHaveLength(0);
      expect(data).toEqual([]);
    });

    it('returns read-only array', () => {
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 1);
      const data = metrics.getMetric(ExperienceMetricKey.AdaptationCount);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // ─── getLatestMetric ────────────────────────────────────────

  describe('getLatestMetric', () => {
    it('returns most recent data point', () => {
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 1);
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 2);
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 3);
      const latest = metrics.getLatestMetric(ExperienceMetricKey.AdaptationCount);
      expect(latest).not.toBeNull();
      expect(latest!.value).toBe(3);
    });

    it('returns null for non-existent key', () => {
      const latest = metrics.getLatestMetric('nonexistent' as ExperienceMetricKey);
      expect(latest).toBeNull();
    });

    it('returns single entry when only one recorded', () => {
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 99);
      const latest = metrics.getLatestMetric(ExperienceMetricKey.AdaptationCount);
      expect(latest!.value).toBe(99);
    });

    it('has correct timestamp on latest entry', () => {
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 1);
      const before = new Date().toISOString();
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 2);
      const latest = metrics.getLatestMetric(ExperienceMetricKey.AdaptationCount);
      expect(latest!.timestamp >= before).toBe(true);
    });
  });

  // ─── getMetricsForUser ──────────────────────────────────────

  describe('getMetricsForUser', () => {
    it('filters by userIdHash tag', () => {
      const user1 = crypto.randomUUID();
      const user2 = crypto.randomUUID();
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 1, { userIdHash: user1 });
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 2, { userIdHash: user2 });
      metrics.recordMetric(ExperienceMetricKey.RecommendationAccepted, 3, { userIdHash: user1 });

      const user1Metrics = metrics.getMetricsForUser(user1);
      expect(user1Metrics).toHaveLength(2);
      expect(user1Metrics.every(m => m.tags.userIdHash === user1)).toBe(true);
    });

    it('returns empty array for user with no metrics', () => {
      const result = metrics.getMetricsForUser(crypto.randomUUID());
      expect(result).toHaveLength(0);
    });

    it('does not return metrics without userIdHash tag', () => {
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 1);
      const result = metrics.getMetricsForUser(crypto.randomUUID());
      expect(result).toHaveLength(0);
    });

    it('returns metrics from different keys for same user', () => {
      const user = crypto.randomUUID();
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 1, { userIdHash: user });
      metrics.recordMetric(ExperienceMetricKey.HabitCount, 5, { userIdHash: user });
      metrics.recordMetric(ExperienceMetricKey.PreferenceStability, 0.8, { userIdHash: user });

      const result = metrics.getMetricsForUser(user);
      expect(result).toHaveLength(3);
    });
  });

  // ─── incrementCounter ────────────────────────────────────────

  describe('incrementCounter', () => {
    it('increments counter by 1', () => {
      metrics.incrementCounter(ExperienceMetricKey.AdaptationCount);
      const latest = metrics.getLatestMetric(ExperienceMetricKey.AdaptationCount);
      expect(latest!.value).toBe(1);
    });

    it('increments from existing value', () => {
      metrics.incrementCounter(ExperienceMetricKey.AdaptationCount);
      metrics.incrementCounter(ExperienceMetricKey.AdaptationCount);
      metrics.incrementCounter(ExperienceMetricKey.AdaptationCount);
      const latest = metrics.getLatestMetric(ExperienceMetricKey.AdaptationCount);
      expect(latest!.value).toBe(3);
    });

    it('increments with tags', () => {
      const user = crypto.randomUUID();
      metrics.incrementCounter(ExperienceMetricKey.AdaptationCount, { userIdHash: user });
      metrics.incrementCounter(ExperienceMetricKey.AdaptationCount, { userIdHash: user });
      const latest = metrics.getLatestMetric(ExperienceMetricKey.AdaptationCount);
      expect(latest!.value).toBe(2);
      expect(latest!.tags.userIdHash).toBe(user);
    });

    it('tracks separate counters per tag set', () => {
      const user1 = crypto.randomUUID();
      const user2 = crypto.randomUUID();
      metrics.incrementCounter(ExperienceMetricKey.AdaptationCount, { userIdHash: user1 });
      metrics.incrementCounter(ExperienceMetricKey.AdaptationCount, { userIdHash: user1 });
      metrics.incrementCounter(ExperienceMetricKey.AdaptationCount, { userIdHash: user2 });

      expect(metrics.getCounter(ExperienceMetricKey.AdaptationCount, { userIdHash: user1 })).toBe(2);
      expect(metrics.getCounter(ExperienceMetricKey.AdaptationCount, { userIdHash: user2 })).toBe(1);
    });
  });

  // ─── getCounter ──────────────────────────────────────────────

  describe('getCounter', () => {
    it('returns current counter value', () => {
      metrics.incrementCounter(ExperienceMetricKey.AdaptationCount);
      metrics.incrementCounter(ExperienceMetricKey.AdaptationCount);
      expect(metrics.getCounter(ExperienceMetricKey.AdaptationCount)).toBe(2);
    });

    it('returns 0 for non-existent counter', () => {
      expect(metrics.getCounter('nonexistent' as ExperienceMetricKey)).toBe(0);
    });

    it('returns 0 for empty metrics', () => {
      expect(metrics.getCounter(ExperienceMetricKey.AdaptationCount)).toBe(0);
    });

    it('filters by tags when provided', () => {
      const user = crypto.randomUUID();
      metrics.incrementCounter(ExperienceMetricKey.AdaptationCount, { userIdHash: user });
      expect(metrics.getCounter(ExperienceMetricKey.AdaptationCount, { userIdHash: user })).toBe(1);
    });

    it('returns 0 when no matching tags exist', () => {
      expect(
        metrics.getCounter(ExperienceMetricKey.AdaptationCount, { userIdHash: 'no-such-user' })
      ).toBe(0);
    });

    it('returns latest matching entry value with tags', () => {
      const user = crypto.randomUUID();
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 5, { userIdHash: user });
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 10, { userIdHash: user });
      expect(metrics.getCounter(ExperienceMetricKey.AdaptationCount, { userIdHash: user })).toBe(10);
    });

    it('returns latest value without tags (all entries)', () => {
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 5);
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 10);
      expect(metrics.getCounter(ExperienceMetricKey.AdaptationCount)).toBe(10);
    });
  });

  // ─── getSummary ──────────────────────────────────────────────

  describe('getSummary', () => {
    it('returns aggregated summary of all metrics', () => {
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 5);
      metrics.recordMetric(ExperienceMetricKey.RecommendationAccepted, 3);
      const summary = metrics.getSummary();
      expect(summary[ExperienceMetricKey.AdaptationCount]).toBe(5);
      expect(summary[ExperienceMetricKey.RecommendationAccepted]).toBe(3);
    });

    it('returns latest value for each key', () => {
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 5);
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 10);
      const summary = metrics.getSummary();
      expect(summary[ExperienceMetricKey.AdaptationCount]).toBe(10);
    });

    it('returns empty object when no metrics recorded', () => {
      const summary = metrics.getSummary();
      expect(summary).toEqual({});
    });

    it('does not include keys with no data points', () => {
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 1);
      const summary = metrics.getSummary();
      expect(Object.keys(summary)).not.toContain(ExperienceMetricKey.HabitCount);
    });
  });

  // ─── reset ────────────────────────────────────────────────

  describe('reset', () => {
    it('clears all metrics', () => {
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 5);
      metrics.recordMetric(ExperienceMetricKey.RecommendationAccepted, 3);
      metrics.reset();
      expect(metrics.getMetric(ExperienceMetricKey.AdaptationCount)).toHaveLength(0);
      expect(metrics.getMetric(ExperienceMetricKey.RecommendationAccepted)).toHaveLength(0);
    });

    it('clears counters', () => {
      metrics.incrementCounter(ExperienceMetricKey.AdaptationCount);
      metrics.incrementCounter(ExperienceMetricKey.AdaptationCount);
      metrics.reset();
      expect(metrics.getCounter(ExperienceMetricKey.AdaptationCount)).toBe(0);
    });

    it('clears summary', () => {
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 5);
      metrics.reset();
      expect(metrics.getSummary()).toEqual({});
    });

    it('clears user-tagged metrics', () => {
      const user = crypto.randomUUID();
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 5, { userIdHash: user });
      metrics.reset();
      expect(metrics.getMetricsForUser(user)).toHaveLength(0);
    });

    it('allows recording after reset', () => {
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 1);
      metrics.reset();
      metrics.recordMetric(ExperienceMetricKey.AdaptationCount, 2);
      expect(metrics.getLatestMetric(ExperienceMetricKey.AdaptationCount)!.value).toBe(2);
    });
  });
});
