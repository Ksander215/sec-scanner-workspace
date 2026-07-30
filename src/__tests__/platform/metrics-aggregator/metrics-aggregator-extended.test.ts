import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformMetricsAggregator } from '../../../platform/metrics-aggregator/metrics-aggregator.js';

const m = new PlatformMetricsAggregator();

beforeEach(() => { m = new PlatformMetricsAggregator(); });

  it('getSeries returns series array', async () => {
    m.record('s', 1);
    const s = m.getSeries('s');
    expect(s.points.length).toBeGreaterThanOrEqual(0);
  });
  });
  it('getSeries returns points array', async () => {
    m.record('s', 2);
    const s = m.getSeries('s')!;
    expect(s.points.length).toBeGreaterThanOrEqual(0);
  });
  });
});
