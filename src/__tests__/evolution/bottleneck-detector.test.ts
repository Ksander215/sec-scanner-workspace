import { describe, it, expect, beforeEach } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { BottleneckDetector } from '../../core/evolution/bottleneck-detector.js';
import { DefaultEvolutionRuntimeConfig } from '../../core/evolution/types.js';

const cfg = DefaultEvolutionRuntimeConfig.bottleneckDetector;

function createDetector(bus?: InProcessEventBus) {
  return new BottleneckDetector(cfg, bus);
}

describe('BottleneckDetector — constructor', () => {
  it('creates instance without eventBus', () => {
    const d = createDetector();
    expect(d).toBeDefined();
  });
  it('creates instance with eventBus', () => {
    const d = createDetector(new InProcessEventBus());
    expect(d).toBeDefined();
  });
});

describe('BottleneckDetector — detect', () => {
  it('returns empty array when no metrics', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'test' });
    expect(result).toEqual([]);
  });
  it('detects Performance bottleneck when responseTime > 5000', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 6000 } });
    expect(result.length).toBe(1);
    expect(result[0].constraintType).toBe('Performance');
  });
  it('detects Critical Performance when responseTime > 20000', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 25000 } });
    expect(result.length).toBe(1);
    expect(result[0].severity).toBe('Critical');
  });
  it('detects High Performance when 5000 < responseTime <= 20000', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000 } });
    expect(result[0].severity).toBe('High');
  });
  it('does not detect Performance when responseTime <= 5000', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 5000 } });
    expect(result).toEqual([]);
  });
  it('detects Performance via avgResponseTimeMs', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { avgResponseTimeMs: 8000 } });
    expect(result.length).toBe(1);
  });
  it('detects Quality bottleneck when errors >= 3', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', errors: ['e1', 'e2', 'e3'] });
    expect(result.length).toBe(1);
    expect(result[0].constraintType).toBe('Quality');
  });
  it('detects Critical Quality when errors > 10', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', errors: Array(11).fill('err') });
    expect(result[0].severity).toBe('Critical');
  });
  it('does not detect Quality when errors < 3', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', errors: ['e1', 'e2'] });
    expect(result).toEqual([]);
  });
  it('detects Knowledge bottleneck when coverage < 50', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { knowledgeCoverage: 30 } });
    expect(result.length).toBe(1);
    expect(result[0].constraintType).toBe('Knowledge');
  });
  it('detects Knowledge via knowledgeCoveragePercent', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { knowledgeCoveragePercent: 25 } });
    expect(result.length).toBe(1);
  });
  it('does not detect Knowledge when coverage >= 50', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { knowledgeCoverage: 50 } });
    expect(result).toEqual([]);
  });
  it('detects Memory bottleneck when memoryUsage > 500', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { memoryUsageMB: 600 } });
    expect(result.length).toBe(1);
    expect(result[0].constraintType).toBe('Memory');
  });
  it('detects Critical Memory when memoryUsage > 1000', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { memoryUsageMB: 1200 } });
    expect(result[0].severity).toBe('Critical');
  });
  it('detects Memory via memoryUsage', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { memoryUsage: 800 } });
    expect(result.length).toBe(1);
  });
  it('does not detect Memory when memoryUsage <= 500', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { memoryUsageMB: 500 } });
    expect(result).toEqual([]);
  });
  it('detects UX bottleneck when uxScore < 40', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { uxScore: 30 } });
    expect(result.length).toBe(1);
    expect(result[0].constraintType).toBe('UX');
  });
  it('does not detect UX when uxScore >= 40', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { uxScore: 40 } });
    expect(result).toEqual([]);
  });
  it('detects Architecture bottleneck when couplingScore > 0.7', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { couplingScore: 0.8 } });
    expect(result.length).toBe(1);
    expect(result[0].constraintType).toBe('Architecture');
  });
  it('detects Architecture via moduleCoupling', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { moduleCoupling: 0.9 } });
    expect(result.length).toBe(1);
  });
  it('does not detect Architecture when couplingScore <= 0.7', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { couplingScore: 0.7 } });
    expect(result).toEqual([]);
  });
  it('detects Documentation bottleneck when docCoverage < 30', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { documentationCoverage: 20 } });
    expect(result.length).toBe(1);
    expect(result[0].constraintType).toBe('Documentation');
  });
  it('detects Documentation via docCoveragePercent', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { docCoveragePercent: 10 } });
    expect(result.length).toBe(1);
  });
  it('does not detect Documentation when docCoverage >= 30', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { documentationCoverage: 30 } });
    expect(result).toEqual([]);
  });
  it('detects multiple bottlenecks at once', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000, memoryUsageMB: 800, uxScore: 20 } });
    expect(result.length).toBeGreaterThanOrEqual(3);
  });
  it('each bottleneck is frozen', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000 } });
    for (const b of result) {
      expect(Object.isFrozen(b)).toBe(true);
    }
  });
  it('each bottleneck has unique id', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000, memoryUsageMB: 800 } });
    const ids = result.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('each bottleneck has resolvedAt null', async () => {
    const d = createDetector();
    const result = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000 } });
    for (const b of result) {
      expect(b.resolvedAt).toBeNull();
    }
  });
  it('throws BottleneckLimitExceededError when limit reached', async () => {
    const d = new BottleneckDetector({ maxBottlenecks: 1, scanIntervalMs: 60000, minEvidenceItems: 1 });
    await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000 } });
    await expect(d.detect({ runtimeName: 'rt1', metrics: { memoryUsageMB: 800 } })).rejects.toThrow();
  });
});

describe('BottleneckDetector — getById', () => {
  it('returns null for unknown id', async () => {
    const d = createDetector();
    const result = await d.getById('nonexistent' as any);
    expect(result).toBeNull();
  });
  it('returns bottleneck after detect', async () => {
    const d = createDetector();
    const [bn] = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000 } });
    const found = await d.getById(bn.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(bn.id);
  });
});

describe('BottleneckDetector — list', () => {
  it('returns all bottlenecks', async () => {
    const d = createDetector();
    await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000 } });
    const all = await d.list();
    expect(all.length).toBe(1);
  });
  it('filters by resolved=false', async () => {
    const d = createDetector();
    const all = await d.list({ resolved: false });
    expect(all.length).toBe(0);
  });
});

describe('BottleneckDetector — resolve', () => {
  it('sets resolvedAt', async () => {
    const d = createDetector();
    const [bn] = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000 } });
    await d.resolve(bn.id);
    const resolved = await d.getById(bn.id);
    expect(resolved!.resolvedAt).toBeDefined();
  });
});

describe('BottleneckDetector — count', () => {
  it('returns 0 initially', async () => {
    const d = createDetector();
    expect(await d.count()).toBe(0);
  });
  it('returns correct count after detect', async () => {
    const d = createDetector();
    await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000 } });
    expect(await d.count()).toBe(1);
  });
});

describe('BottleneckDetector — events', () => {
  it('emits BottleneckDetectedEvent', async () => {
    const bus = new InProcessEventBus();
    const d = createDetector(bus);
    await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000 } });
    const log = bus.getLog();
    const detected = log.filter(e => e.eventType === 'evolution.bottleneck.detected');
    expect(detected.length).toBe(1);
  });
  it('emits BottleneckResolvedEvent on resolve', async () => {
    const bus = new InProcessEventBus();
    const d = createDetector(bus);
    const [bn] = await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000 } });
    await d.resolve(bn.id);
    const log = bus.getLog();
    const resolved = log.filter(e => e.eventType === 'evolution.bottleneck.resolved');
    expect(resolved.length).toBe(1);
  });
  it('does not emit events without eventBus', async () => {
    const d = createDetector();
    await d.detect({ runtimeName: 'rt1', metrics: { responseTime: 10000 } });
    // No error thrown
  });
});
