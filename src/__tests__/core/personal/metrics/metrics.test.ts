import { describe, it, expect, beforeEach } from 'vitest';
import { PersonalMetricsCollector } from '../../../../core/personal/metrics.js';

describe('PersonalMetricsCollector', () => {
  let metrics: PersonalMetricsCollector;

  beforeEach(() => {
    metrics = new PersonalMetricsCollector();
  });

  // ── increment / decrement ──────────────────────────────────
  describe('increment / decrement', () => {
    it('increment starts at 1 for new counter', () => {
      metrics.increment('test');
      expect(metrics.getCounter('test')).toBe(1);
    });

    it('increment accumulates', () => {
      metrics.increment('test');
      metrics.increment('test');
      metrics.increment('test');
      expect(metrics.getCounter('test')).toBe(3);
    });

    it('decrement starts at -1 for new counter', () => {
      metrics.decrement('test');
      expect(metrics.getCounter('test')).toBe(-1);
    });

    it('decrement decreases', () => {
      metrics.increment('test');
      metrics.increment('test');
      metrics.decrement('test');
      expect(metrics.getCounter('test')).toBe(1);
    });

    it('different counters are independent', () => {
      metrics.increment('a');
      metrics.increment('b');
      metrics.increment('b');
      expect(metrics.getCounter('a')).toBe(1);
      expect(metrics.getCounter('b')).toBe(2);
    });
  });

  // ── setGauge / getGauge ────────────────────────────────────
  describe('setGauge / getGauge', () => {
    it('sets and gets a gauge value', () => {
      metrics.setGauge('cpu', 85);
      expect(metrics.getGauge('cpu')).toBe(85);
    });

    it('overwrites previous value', () => {
      metrics.setGauge('cpu', 50);
      metrics.setGauge('cpu', 90);
      expect(metrics.getGauge('cpu')).toBe(90);
    });

    it('returns 0 for unknown gauge', () => {
      expect(metrics.getGauge('unknown')).toBe(0);
    });

    it('stores negative values', () => {
      metrics.setGauge('temp', -5);
      expect(metrics.getGauge('temp')).toBe(-5);
    });

    it('stores zero', () => {
      metrics.setGauge('zero', 0);
      expect(metrics.getGauge('zero')).toBe(0);
    });
  });

  // ── recordSeries / getSeries ───────────────────────────────
  describe('recordSeries / getSeries', () => {
    it('records and retrieves series entries', () => {
      metrics.recordSeries('productivity', 80);
      const series = metrics.getSeries('productivity');
      expect(series).toHaveLength(1);
      expect(series[0].value).toBe(80);
    });

    it('entries have timestamps', () => {
      metrics.recordSeries('p', 1);
      const series = metrics.getSeries('p');
      expect(() => new Date(series[0].timestamp).toISOString()).not.toThrow();
    });

    it('appends to existing series', () => {
      metrics.recordSeries('p', 1);
      metrics.recordSeries('p', 2);
      expect(metrics.getSeries('p')).toHaveLength(2);
    });

    it('returns empty array for unknown series', () => {
      expect(metrics.getSeries('unknown')).toEqual([]);
    });

    it('returns frozen array', () => {
      metrics.recordSeries('p', 1);
      expect(Object.isFrozen(metrics.getSeries('p'))).toBe(true);
    });
  });

  // ── getSnapshot ─────────────────────────────────────────────
  describe('getSnapshot', () => {
    it('returns empty object initially', () => {
      expect(Object.keys(metrics.getSnapshot())).toHaveLength(0);
    });

    it('includes counter values with prefix', () => {
      metrics.increment('goals');
      const snapshot = metrics.getSnapshot();
      expect(snapshot['counter:goals']).toBe(1);
    });

    it('includes gauge values with prefix', () => {
      metrics.setGauge('score', 75);
      const snapshot = metrics.getSnapshot();
      expect(snapshot['gauge:score']).toBe(75);
    });

    it('does not include series data', () => {
      metrics.recordSeries('p', 1);
      const snapshot = metrics.getSnapshot();
      const keys = Object.keys(snapshot);
      const hasSeries = keys.some(k => k.startsWith('series:'));
      expect(hasSeries).toBe(false);
    });

    it('returns frozen object', () => {
      expect(Object.isFrozen(metrics.getSnapshot())).toBe(true);
    });
  });

  // ── Convenience getters ─────────────────────────────────────
  describe('convenience getters', () => {
    it('getGoalsCompleted returns gauge value', () => {
      metrics.setGauge('goals.completed', 5);
      expect(metrics.getGoalsCompleted()).toBe(5);
    });

    it('getHabitsDetected returns gauge value', () => {
      metrics.setGauge('habits.detected', 3);
      expect(metrics.getHabitsDetected()).toBe(3);
    });

    it('getRecommendationsAccepted returns gauge value', () => {
      metrics.setGauge('recommendations.accepted', 2);
      expect(metrics.getRecommendationsAccepted()).toBe(2);
    });

    it('getPredictionAccuracy returns gauge value', () => {
      metrics.setGauge('predictions.accuracy', 0.85);
      expect(metrics.getPredictionAccuracy()).toBeCloseTo(0.85);
    });

    it('getLearningProgress returns gauge value', () => {
      metrics.setGauge('learning.progress', 60);
      expect(metrics.getLearningProgress()).toBe(60);
    });

    it('getDecisionSuccessRate returns gauge value', () => {
      metrics.setGauge('decisions.successRate', 0.7);
      expect(metrics.getDecisionSuccessRate()).toBeCloseTo(0.7);
    });

    it('getAttentionScore returns gauge value', () => {
      metrics.setGauge('attention.score', 82);
      expect(metrics.getAttentionScore()).toBe(82);
    });

    it('getDailyProductivity returns gauge value', () => {
      metrics.setGauge('daily.productivity', 90);
      expect(metrics.getDailyProductivity()).toBe(90);
    });

    it('returns 0 when gauge not set', () => {
      expect(metrics.getGoalsCompleted()).toBe(0);
    });
  });

  // ── getWeeklyTrend / getMonthlyTrend ────────────────────────
  describe('trend analysis', () => {
    it('getWeeklyTrend returns stable with no data', () => {
      expect(metrics.getWeeklyTrend()).toBe('stable');
    });

    it('getMonthlyTrend returns stable with no data', () => {
      expect(metrics.getMonthlyTrend()).toBe('stable');
    });

    it('returns stable when only 1 data point', () => {
      metrics.recordSeries('daily.productivity', 50);
      expect(metrics.getWeeklyTrend()).toBe('stable');
    });

    it('returns improving when second half averages higher', () => {
      metrics.recordSeries('daily.productivity', 40);
      metrics.recordSeries('daily.productivity', 100);
      expect(metrics.getWeeklyTrend()).toBe('improving');
    });

    it('returns declining when second half averages lower', () => {
      metrics.recordSeries('daily.productivity', 100);
      metrics.recordSeries('daily.productivity', 40);
      expect(metrics.getWeeklyTrend()).toBe('declining');
    });
  });

  // ── export ──────────────────────────────────────────────────
  describe('export', () => {
    it('returns valid JSON string', () => {
      metrics.increment('test');
      metrics.setGauge('score', 75);
      const json = metrics.export();
      const parsed = JSON.parse(json);
      expect(parsed.counters.test).toBe(1);
      expect(parsed.gauges.score).toBe(75);
    });

    it('includes series data', () => {
      metrics.recordSeries('p', 1);
      const parsed = JSON.parse(metrics.export());
      expect(parsed.series.p).toHaveLength(1);
    });
  });

  // ── reset ───────────────────────────────────────────────────
  describe('reset', () => {
    it('clears all counters', () => {
      metrics.increment('test');
      metrics.reset();
      expect(metrics.getCounter('test')).toBe(0);
    });

    it('clears all gauges', () => {
      metrics.setGauge('score', 75);
      metrics.reset();
      expect(metrics.getGauge('score')).toBe(0);
    });

    it('clears all series', () => {
      metrics.recordSeries('p', 1);
      metrics.reset();
      expect(metrics.getSeries('p')).toEqual([]);
    });

    it('snapshot is empty after reset', () => {
      metrics.increment('a');
      metrics.setGauge('b', 1);
      metrics.reset();
      expect(Object.keys(metrics.getSnapshot())).toHaveLength(0);
    });
  });
});
