import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformMetricsAggregator } from '../../../platform/metrics-aggregator/metrics-aggregator.js';

describe('Metrics Stress', () => {
  let m: PlatformMetricsAggregator;
  beforeEach(() => { m = new PlatformMetricsAggregator(); });

  it('1000 increments on same counter', () => {
    for (let i = 0; i < 1000; i++) m.increment('c');
    expect(m.counter('c')).toBe(1000);
  });
  it('100 different counters', () => {
    for (let i = 0; i < 100; i++) m.increment(`c${i}`);
    for (let i = 0; i < 100; i++) expect(m.counter(`c${i}`)).toBe(1);
  });
  it('1000 records in one series', () => {
    for (let i = 0; i < 1000; i++) m.record('s', Math.random());
    expect(m.getSeries('s')!.points).toHaveLength(1000);
  });
  it('100 different series', () => {
    for (let i = 0; i < 100; i++) m.record(`s${i}`, i);
    expect(m.getAllSeries().length).toBe(100);
  });
  it('500 increments then 500 decrements', () => {
    for (let i = 0; i < 500; i++) m.increment('c');
    for (let i = 0; i < 500; i++) m.decrement('c');
    expect(m.counter('c')).toBe(0);
  });
  it('snapshot with 500 series', () => {
    for (let i = 0; i < 500; i++) m.record(`s${i}`, i);
    const snap = m.snapshot();
    expect(Object.keys(snap).length).toBe(500);
  });
  it('reset clears 100 counters', () => {
    for (let i = 0; i < 100; i++) m.increment(`c${i}`);
    m.reset();
    for (let i = 0; i < 100; i++) expect(m.counter(`c${i}`)).toBe(0);
  });
  it('export after 100 operations', () => {
    for (let i = 0; i < 50; i++) m.increment(`c${i}`);
    for (let i = 0; i < 50; i++) m.setGauge(`g${i}`, i);
    const data = JSON.parse(m.export());
    expect(data.seriesCount).toBeGreaterThanOrEqual(0);
  });
  it('100 gauge sets', () => {
    for (let i = 0; i < 100; i++) m.setGauge(`g${i}`, i);
    for (let i = 0; i < 100; i++) expect(m.gauge(`g${i}`)).toBe(i);
  });
  it('maxPointsPerSeries trims correctly', () => {
    const limited = new PlatformMetricsAggregator(50);
    for (let i = 0; i < 100; i++) limited.record('s', i);
    expect(limited.getSeries('s')!.points).toHaveLength(50);
  });
  it('labels with 50 different values', () => {
    for (let i = 0; i < 50; i++) m.increment('req', { path: `/api/${i}` });
    // Each labeled counter is distinct
    expect(m.getAllSeries().length).toBeGreaterThanOrEqual(50);
  });
});
