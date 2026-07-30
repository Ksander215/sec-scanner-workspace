import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformMetricsAggregator } from '../../../platform/metrics-aggregator/metrics-aggregator.js';

describe('MetricsAggregator Extended', () => {
  let m: PlatformMetricsAggregator;
  beforeEach(() => { m = new PlatformMetricsAggregator(); });

  it('getSeries returns series array', () => {
    m.record('s', 1);
    const s = m.getSeries('s');
    expect(s).toBeDefined();
    expect(s!.points.length).toBeGreaterThanOrEqual(0);
  });
  it('getSeries returns points array', () => {
    m.record('s', 2);
    const s = m.getSeries('s')!;
    expect(s.points.length).toBeGreaterThanOrEqual(0);
  });
});
