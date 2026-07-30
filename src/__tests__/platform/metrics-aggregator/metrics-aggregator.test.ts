import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformMetricsAggregator } from '../../../platform/metrics-aggregator/metrics-aggregator.js';

describe('PlatformMetricsAggregator', () => {
  let metrics: PlatformMetricsAggregator;
  beforeEach(() => { metrics = new PlatformMetricsAggregator(); });

  it('increments a counter', () => {
    metrics.increment('requests');
    metrics.increment('requests');
    expect(metrics.counter('requests')).toBe(2);
  });
  it('decrements a counter', () => {
    metrics.increment('active');
    metrics.increment('active');
    metrics.decrement('active');
    expect(metrics.counter('active')).toBe(1);
  });
  it('counter returns 0 for unknown', () => {
    expect(metrics.counter('unknown')).toBe(0);
  });
  it('gauge returns 0 for unknown', () => {
    expect(metrics.gauge('unknown')).toBe(0);
  });
  it('setGauge and getGauge', () => {
    metrics.setGauge('cpu', 75);
    expect(metrics.gauge('cpu')).toBe(75);
  });
  it('setGauge overwrites', () => {
    metrics.setGauge('cpu', 50);
    metrics.setGauge('cpu', 80);
    expect(metrics.gauge('cpu')).toBe(80);
  });
  it('record adds a point', () => {
    metrics.record('latency', 100);
    const s = metrics.getSeries('latency');
    expect(s).toBeDefined();
    expect(s!.points).toHaveLength(1);
  });
  it('record with labels creates separate series', () => {
    metrics.record('req', 1, { path: '/a' });
    metrics.record('req', 2, { path: '/b' });
    expect(metrics.getAllSeries().length).toBe(2);
  });
  it('getAllSeries returns all', () => {
    metrics.record('a', 1);
    metrics.record('b', 2);
    expect(metrics.getAllSeries()).toHaveLength(2);
  });
  it('getSeries returns undefined for unknown', () => {
    expect(metrics.getSeries('unknown')).toBeUndefined();
  });
  it('snapshot returns all points', () => {
    metrics.record('a', 1);
    metrics.record('a', 2);
    const snap = metrics.snapshot();
    expect(snap['a']).toHaveLength(2);
  });
  it('reset clears everything', () => {
    metrics.increment('a');
    metrics.setGauge('b', 5);
    metrics.reset();
    expect(metrics.counter('a')).toBe(0);
    expect(metrics.gauge('b')).toBe(0);
  });
  it('export produces JSON string', () => {
    metrics.increment('a');
    const json = metrics.export();
    expect(() => JSON.parse(json)).not.toThrow();
  });
  it('export contains counters', () => {
    metrics.increment('requests');
    const data = JSON.parse(metrics.export());
    expect(data.counters.requests).toBe(1);
  });
  it('export contains gauges', () => {
    metrics.setGauge('cpu', 50);
    const data = JSON.parse(metrics.export());
    expect(data.gauges.cpu).toBe(50);
  });
  it('respects maxPointsPerSeries', () => {
    const m = new PlatformMetricsAggregator(3);
    for (let i = 0; i < 5; i++) m.record('s', i);
    expect(m.getSeries('s')!.points).toHaveLength(3);
  });
  it('increment with labels', () => {
    metrics.increment('req', { method: 'GET' });
    expect(metrics.counter('req:{"method":"GET"}')).toBe(1);
  });
  it('handles 1000 records', () => {
    for (let i = 0; i < 1000; i++) metrics.record('perf', i);
    expect(metrics.getSeries('perf')!.points).toHaveLength(1000);
  });
});
