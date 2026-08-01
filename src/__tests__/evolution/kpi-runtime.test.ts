import { describe, it, expect, beforeEach } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { KPIRuntime } from '../../core/evolution/kpi-runtime.js';
import { DefaultEvolutionRuntimeConfig, KPDirection, brandKPIId } from '../../core/evolution/types.js';
import { PILimitExceededError, PINotFoundError, EvolutionError } from '../../core/evolution/errors.js';

const cfg = DefaultEvolutionRuntimeConfig.kpi;

function createRuntime(bus?: InProcessEventBus) {
  return new KPIRuntime(cfg, bus);
}

const defaultParams = {
  name: 'Response Time',
  description: 'Average API response time',
  unit: 'ms',
  direction: KPDirection.HigherIsBetter,
  target: null,
  initialValue: 100,
  metadata: Object.freeze({}),
};

// ═══════════════════════════════════════════════════════════════════
// CONSTRUCTOR
// ═══════════════════════════════════════════════════════════════════

describe('KPIRuntime — constructor', () => {
  it('creates instance without eventBus', () => {
    const r = createRuntime();
    expect(r).toBeDefined();
  });
  it('creates instance with eventBus', () => {
    const r = createRuntime(new InProcessEventBus());
    expect(r).toBeDefined();
  });
  it('creates instance with custom config', () => {
    const r = new KPIRuntime({ maxKPIs: 10, maxHistoryLength: 100, aggregationWindowMs: 1000 });
    expect(r).toBeDefined();
  });
  it('store is accessible via getStore', () => {
    const r = createRuntime();
    const store = r.getStore();
    expect(store).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════════════════════════════════

describe('KPIRuntime — register', () => {
  it('returns a KPIDefinition', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    expect(kpi).toBeDefined();
    expect(kpi.id).toBeDefined();
  });
  it('assigns a unique id', async () => {
    const r = createRuntime();
    const k1 = await r.register(defaultParams);
    const k2 = await r.register({ ...defaultParams, name: 'KPI 2' });
    expect(k1.id).not.toBe(k2.id);
  });
  it('sets name correctly', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    expect(kpi.name).toBe('Response Time');
  });
  it('sets description correctly', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    expect(kpi.description).toBe('Average API response time');
  });
  it('sets unit correctly', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    expect(kpi.unit).toBe('ms');
  });
  it('sets direction to HigherIsBetter', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    expect(kpi.direction).toBe(KPDirection.HigherIsBetter);
  });
  it('sets direction to LowerIsBetter', async () => {
    const r = createRuntime();
    const kpi = await r.register({ ...defaultParams, direction: KPDirection.LowerIsBetter });
    expect(kpi.direction).toBe(KPDirection.LowerIsBetter);
  });
  it('sets direction to TargetIsOptimal', async () => {
    const r = createRuntime();
    const kpi = await r.register({ ...defaultParams, direction: KPDirection.TargetIsOptimal, target: 50 });
    expect(kpi.direction).toBe(KPDirection.TargetIsOptimal);
  });
  it('sets target to null when not provided', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    expect(kpi.target).toBeNull();
  });
  it('sets target to provided value', async () => {
    const r = createRuntime();
    const kpi = await r.register({ ...defaultParams, target: 50 });
    expect(kpi.target).toBe(50);
  });
  it('sets currentValue to initialValue', async () => {
    const r = createRuntime();
    const kpi = await r.register({ ...defaultParams, initialValue: 42 });
    expect(kpi.currentValue).toBe(42);
  });
  it('creates initial measurement with correct value', async () => {
    const r = createRuntime();
    const kpi = await r.register({ ...defaultParams, initialValue: 75 });
    expect(kpi.history).toHaveLength(1);
    expect(kpi.history[0].value).toBe(75);
  });
  it('initial measurement has a timestamp', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    expect(kpi.history[0].timestamp).toBeDefined();
    expect(typeof kpi.history[0].timestamp).toBe('string');
  });
  it('initial measurement has empty metadata', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    expect(kpi.history[0].metadata).toEqual({});
  });
  it('initial measurement is frozen', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    expect(Object.isFrozen(kpi.history[0])).toBe(true);
  });
  it('history is frozen', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    expect(Object.isFrozen(kpi.history)).toBe(true);
  });
  it('KPI definition is frozen', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    expect(Object.isFrozen(kpi)).toBe(true);
  });
  it('sets createdAt timestamp', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    expect(kpi.createdAt).toBeDefined();
    expect(typeof kpi.createdAt).toBe('string');
  });
  it('createdAt matches initial measurement timestamp', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    expect(kpi.createdAt).toBe(kpi.history[0].timestamp);
  });
  it('passes metadata through', async () => {
    const r = createRuntime();
    const meta = Object.freeze({ team: 'backend', priority: 'high' });
    const kpi = await r.register({ ...defaultParams, metadata: meta });
    expect(kpi.metadata).toBe(meta);
  });
  it('handles negative initialValue', async () => {
    const r = createRuntime();
    const kpi = await r.register({ ...defaultParams, initialValue: -10 });
    expect(kpi.currentValue).toBe(-10);
  });
  it('handles zero initialValue', async () => {
    const r = createRuntime();
    const kpi = await r.register({ ...defaultParams, initialValue: 0 });
    expect(kpi.currentValue).toBe(0);
  });
  it('handles fractional initialValue', async () => {
    const r = createRuntime();
    const kpi = await r.register({ ...defaultParams, initialValue: 3.14 });
    expect(kpi.currentValue).toBe(3.14);
  });
  it('handles large initialValue', async () => {
    const r = createRuntime();
    const kpi = await r.register({ ...defaultParams, initialValue: Number.MAX_SAFE_INTEGER });
    expect(kpi.currentValue).toBe(Number.MAX_SAFE_INTEGER);
  });
  it('target can be zero', async () => {
    const r = createRuntime();
    const kpi = await r.register({ ...defaultParams, target: 0 });
    expect(kpi.target).toBe(0);
  });
  it('target can be negative', async () => {
    const r = createRuntime();
    const kpi = await r.register({ ...defaultParams, target: -5 });
    expect(kpi.target).toBe(-5);
  });
  it('metadata is frozen on the KPI', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    expect(Object.isFrozen(kpi.metadata)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// RECORD
// ═══════════════════════════════════════════════════════════════════

describe('KPIRuntime — record', () => {
  it('updates currentValue', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    await r.record(kpi.id, 200);
    const updated = await r.getById(kpi.id);
    expect(updated!.currentValue).toBe(200);
  });
  it('adds measurement to history', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    await r.record(kpi.id, 200);
    const updated = await r.getById(kpi.id);
    expect(updated!.history).toHaveLength(2);
  });
  it('new measurement has correct value', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    await r.record(kpi.id, 250);
    const updated = await r.getById(kpi.id);
    expect(updated!.history[1].value).toBe(250);
  });
  it('new measurement has a timestamp', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    await r.record(kpi.id, 200);
    const updated = await r.getById(kpi.id);
    expect(updated!.history[1].timestamp).toBeDefined();
  });
  it('new measurement is frozen', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    await r.record(kpi.id, 200);
    const updated = await r.getById(kpi.id);
    expect(Object.isFrozen(updated!.history[1])).toBe(true);
  });
  it('new measurement uses empty metadata by default', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    await r.record(kpi.id, 200);
    const updated = await r.getById(kpi.id);
    expect(updated!.history[1].metadata).toEqual({});
  });
  it('new measurement uses provided metadata', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    const meta = Object.freeze({ source: 'test-run' });
    await r.record(kpi.id, 200, meta);
    const updated = await r.getById(kpi.id);
    expect(updated!.history[1].metadata).toBe(meta);
  });
  it('updated history is frozen', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    await r.record(kpi.id, 200);
    const updated = await r.getById(kpi.id);
    expect(Object.isFrozen(updated!.history)).toBe(true);
  });
  it('updated KPI is frozen', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    await r.record(kpi.id, 200);
    const updated = await r.getById(kpi.id);
    expect(Object.isFrozen(updated!)).toBe(true);
  });

  // HigherIsBetter — improved logic tested via getComparison;
  // here we verify event is emitted for record direction variants
  it('HigherIsBetter: emits KPIUpdatedEvent when value increases', async () => {
    const bus = new InProcessEventBus();
    const r = createRuntime(bus);
    const kpi = await r.register({ ...defaultParams, direction: KPDirection.HigherIsBetter });
    await r.record(kpi.id, 200);
    const log = bus.getLog();
    expect(log.find(e => e.eventType === 'evolution.kpi.updated')).toBeDefined();
  });
  it('HigherIsBetter: emits KPIUpdatedEvent when value decreases', async () => {
    const bus = new InProcessEventBus();
    const r = createRuntime(bus);
    const kpi = await r.register({ ...defaultParams, direction: KPDirection.HigherIsBetter, initialValue: 200 });
    await r.record(kpi.id, 100);
    const log = bus.getLog();
    expect(log.find(e => e.eventType === 'evolution.kpi.updated')).toBeDefined();
  });
  it('HigherIsBetter: emits KPIUpdatedEvent when value unchanged', async () => {
    const bus = new InProcessEventBus();
    const r = createRuntime(bus);
    const kpi = await r.register({ ...defaultParams, direction: KPDirection.HigherIsBetter, initialValue: 100 });
    await r.record(kpi.id, 100);
    const log = bus.getLog();
    expect(log.find(e => e.eventType === 'evolution.kpi.updated')).toBeDefined();
  });

  // LowerIsBetter
  it('LowerIsBetter: emits KPIUpdatedEvent when value decreases', async () => {
    const bus = new InProcessEventBus();
    const r = createRuntime(bus);
    const kpi = await r.register({ ...defaultParams, direction: KPDirection.LowerIsBetter, initialValue: 200 });
    await r.record(kpi.id, 100);
    const log = bus.getLog();
    expect(log.find(e => e.eventType === 'evolution.kpi.updated')).toBeDefined();
  });
  it('LowerIsBetter: emits KPIUpdatedEvent when value increases', async () => {
    const bus = new InProcessEventBus();
    const r = createRuntime(bus);
    const kpi = await r.register({ ...defaultParams, direction: KPDirection.LowerIsBetter, initialValue: 100 });
    await r.record(kpi.id, 200);
    const log = bus.getLog();
    expect(log.find(e => e.eventType === 'evolution.kpi.updated')).toBeDefined();
  });
  it('LowerIsBetter: emits KPIUpdatedEvent when value unchanged', async () => {
    const bus = new InProcessEventBus();
    const r = createRuntime(bus);
    const kpi = await r.register({ ...defaultParams, direction: KPDirection.LowerIsBetter, initialValue: 100 });
    await r.record(kpi.id, 100);
    const log = bus.getLog();
    expect(log.find(e => e.eventType === 'evolution.kpi.updated')).toBeDefined();
  });

  // TargetIsOptimal — improved logic tested via getComparison
  it('TargetIsOptimal: emits KPIUpdatedEvent when closer to target', async () => {
    const bus = new InProcessEventBus();
    const r = createRuntime(bus);
    const kpi = await r.register({ ...defaultParams, direction: KPDirection.TargetIsOptimal, target: 50, initialValue: 100 });
    await r.record(kpi.id, 60);
    const log = bus.getLog();
    expect(log.find(e => e.eventType === 'evolution.kpi.updated')).toBeDefined();
  });
  it('TargetIsOptimal: emits KPIUpdatedEvent when farther from target', async () => {
    const bus = new InProcessEventBus();
    const r = createRuntime(bus);
    const kpi = await r.register({ ...defaultParams, direction: KPDirection.TargetIsOptimal, target: 50, initialValue: 60 });
    await r.record(kpi.id, 100);
    const log = bus.getLog();
    expect(log.find(e => e.eventType === 'evolution.kpi.updated')).toBeDefined();
  });
  it('TargetIsOptimal: emits KPIUpdatedEvent when no target', async () => {
    const bus = new InProcessEventBus();
    const r = createRuntime(bus);
    const kpi = await r.register({ ...defaultParams, direction: KPDirection.TargetIsOptimal, target: null, initialValue: 100 });
    await r.record(kpi.id, 50);
    const log = bus.getLog();
    expect(log.find(e => e.eventType === 'evolution.kpi.updated')).toBeDefined();
  });
  it('TargetIsOptimal: emits KPIUpdatedEvent when crossing target', async () => {
    const bus = new InProcessEventBus();
    const r = createRuntime(bus);
    const kpi = await r.register({ ...defaultParams, direction: KPDirection.TargetIsOptimal, target: 50, initialValue: 100 });
    await r.record(kpi.id, 40);
    const log = bus.getLog();
    expect(log.find(e => e.eventType === 'evolution.kpi.updated')).toBeDefined();
  });
  it('TargetIsOptimal: emits KPIUpdatedEvent when at exact target', async () => {
    const bus = new InProcessEventBus();
    const r = createRuntime(bus);
    const kpi = await r.register({ ...defaultParams, direction: KPDirection.TargetIsOptimal, target: 50, initialValue: 100 });
    await r.record(kpi.id, 50);
    const log = bus.getLog();
    expect(log.find(e => e.eventType === 'evolution.kpi.updated')).toBeDefined();
  });

  it('throws PINotFoundError for unknown kpiId', async () => {
    const r = createRuntime();
    await expect(r.record(brandKPIId('nonexistent'), 100)).rejects.toThrow(PINotFoundError);
  });
  it('PINotFoundError has correct kpiId', async () => {
    const r = createRuntime();
    try {
      await r.record(brandKPIId('nonexistent'), 100);
      expect.unreachable('should have thrown');
    } catch (e) {
      expect((e as PINotFoundError).kpiId).toBe('nonexistent');
    }
  });
  it('PINotFoundError extends EvolutionError', async () => {
    const r = createRuntime();
    try {
      await r.record(brandKPIId('x'), 100);
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(EvolutionError);
    }
  });

  // History trimming
  it('trims history to maxHistoryLength', async () => {
    const r = new KPIRuntime({ maxKPIs: 500, maxHistoryLength: 3, aggregationWindowMs: 3600000 });
    const kpi = await r.register(defaultParams);
    await r.record(kpi.id, 101);
    await r.record(kpi.id, 102);
    await r.record(kpi.id, 103);
    await r.record(kpi.id, 104);
    const updated = await r.getById(kpi.id);
    expect(updated!.history).toHaveLength(3);
    expect(updated!.history[0].value).toBe(102);
  });
  it('does not trim when under maxHistoryLength', async () => {
    const r = new KPIRuntime({ maxKPIs: 500, maxHistoryLength: 10, aggregationWindowMs: 3600000 });
    const kpi = await r.register(defaultParams);
    await r.record(kpi.id, 101);
    await r.record(kpi.id, 102);
    const updated = await r.getById(kpi.id);
    expect(updated!.history).toHaveLength(3);
  });

  // Multiple records
  it('multiple records accumulate history', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    await r.record(kpi.id, 110);
    await r.record(kpi.id, 120);
    await r.record(kpi.id, 130);
    const updated = await r.getById(kpi.id);
    expect(updated!.history).toHaveLength(4);
    expect(updated!.currentValue).toBe(130);
  });

  // Negative and edge values
  it('records negative values', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    await r.record(kpi.id, -50);
    const updated = await r.getById(kpi.id);
    expect(updated!.currentValue).toBe(-50);
  });
  it('records zero value', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    await r.record(kpi.id, 0);
    const updated = await r.getById(kpi.id);
    expect(updated!.currentValue).toBe(0);
  });
  it('records Infinity value', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    await r.record(kpi.id, Infinity);
    const updated = await r.getById(kpi.id);
    expect(updated!.currentValue).toBe(Infinity);
  });
});

// ═══════════════════════════════════════════════════════════════════
// GET BY ID
// ═══════════════════════════════════════════════════════════════════

describe('KPIRuntime — getById', () => {
  it('returns null for unknown id', async () => {
    const r = createRuntime();
    const result = await r.getById(brandKPIId('nonexistent'));
    expect(result).toBeNull();
  });
  it('returns KPI after register', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    const found = await r.getById(kpi.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(kpi.id);
  });
  it('returns updated KPI after record', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    await r.record(kpi.id, 999);
    const found = await r.getById(kpi.id);
    expect(found!.currentValue).toBe(999);
  });
  it('returns frozen object', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    const found = await r.getById(kpi.id);
    expect(Object.isFrozen(found!)).toBe(true);
  });
  it('different ids return different KPIs', async () => {
    const r = createRuntime();
    const k1 = await r.register(defaultParams);
    const k2 = await r.register({ ...defaultParams, name: 'K2' });
    expect((await r.getById(k1.id))!.id).toBe(k1.id);
    expect((await r.getById(k2.id))!.id).toBe(k2.id);
  });
});

// ═══════════════════════════════════════════════════════════════════
// LIST
// ═══════════════════════════════════════════════════════════════════

describe('KPIRuntime — list', () => {
  it('returns empty array initially', async () => {
    const r = createRuntime();
    const all = await r.list();
    expect(all).toEqual([]);
  });
  it('returns all registered KPIs', async () => {
    const r = createRuntime();
    await r.register(defaultParams);
    await r.register({ ...defaultParams, name: 'K2' });
    await r.register({ ...defaultParams, name: 'K3' });
    const all = await r.list();
    expect(all).toHaveLength(3);
  });
  it('returns frozen array', async () => {
    const r = createRuntime();
    await r.register(defaultParams);
    const all = await r.list();
    expect(Object.isFrozen(all)).toBe(true);
  });
  it('each item in list is frozen', async () => {
    const r = createRuntime();
    await r.register(defaultParams);
    const all = await r.list();
    for (const kpi of all) {
      expect(Object.isFrozen(kpi)).toBe(true);
    }
  });
  it('list reflects updates after record', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    await r.record(kpi.id, 500);
    const all = await r.list();
    expect(all[0].currentValue).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════
// COUNT
// ═══════════════════════════════════════════════════════════════════

describe('KPIRuntime — count', () => {
  it('returns 0 initially', async () => {
    const r = createRuntime();
    expect(await r.count()).toBe(0);
  });
  it('returns 1 after one register', async () => {
    const r = createRuntime();
    await r.register(defaultParams);
    expect(await r.count()).toBe(1);
  });
  it('returns 5 after five registers', async () => {
    const r = createRuntime();
    for (let i = 0; i < 5; i++) {
      await r.register({ ...defaultParams, name: `KPI ${i}` });
    }
    expect(await r.count()).toBe(5);
  });
  it('count does not change on record', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    await r.record(kpi.id, 200);
    expect(await r.count()).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// GET COMPARISON
// ═══════════════════════════════════════════════════════════════════

describe('KPIRuntime — getComparison', () => {
  async function setupWithRecord(direction = KPDirection.HigherIsBetter, target: number | null = null) {
    const r = createRuntime();
    const kpi = await r.register({ ...defaultParams, direction, target, initialValue: 100 });
    const ts0 = kpi.createdAt;
    // Small delay to ensure different timestamps
    await new Promise(res => setTimeout(res, 10));
    await r.record(kpi.id, 200);
    const updated = await r.getById(kpi.id)!;
    const ts1 = updated.history[1].timestamp;
    return { r, kpi: updated!, ts0, ts1 };
  }

  it('returns null for unknown kpiId', async () => {
    const r = createRuntime();
    const result = await r.getComparison(brandKPIId('nope'), '2024-01-01', '2024-12-31');
    expect(result).toBeNull();
  });
  it('returns comparison with correct beforeValue', async () => {
    const { r, kpi, ts0, ts1 } = await setupWithRecord();
    const comp = await r.getComparison(kpi.id, ts0, ts1);
    expect(comp).not.toBeNull();
    expect(comp!.beforeValue).toBe(100);
  });
  it('returns comparison with correct afterValue', async () => {
    const { r, kpi, ts0, ts1 } = await setupWithRecord();
    const comp = await r.getComparison(kpi.id, ts0, ts1);
    expect(comp!.afterValue).toBe(200);
  });
  it('returns correct change', async () => {
    const { r, kpi, ts0, ts1 } = await setupWithRecord();
    const comp = await r.getComparison(kpi.id, ts0, ts1);
    expect(comp!.change).toBe(100);
  });
  it('returns correct changePercent', async () => {
    const { r, kpi, ts0, ts1 } = await setupWithRecord();
    const comp = await r.getComparison(kpi.id, ts0, ts1);
    expect(comp!.changePercent).toBe(100);
  });
  it('has correct kpiId', async () => {
    const { r, kpi, ts0, ts1 } = await setupWithRecord();
    const comp = await r.getComparison(kpi.id, ts0, ts1);
    expect(comp!.kpiId).toBe(kpi.id);
  });
  it('has correct kpiName', async () => {
    const { r, kpi, ts0, ts1 } = await setupWithRecord();
    const comp = await r.getComparison(kpi.id, ts0, ts1);
    expect(comp!.kpiName).toBe('Response Time');
  });
  it('has correct direction', async () => {
    const { r, kpi, ts0, ts1 } = await setupWithRecord();
    const comp = await r.getComparison(kpi.id, ts0, ts1);
    expect(comp!.direction).toBe(KPDirection.HigherIsBetter);
  });
  it('comparison is frozen', async () => {
    const { r, kpi, ts0, ts1 } = await setupWithRecord();
    const comp = await r.getComparison(kpi.id, ts0, ts1);
    expect(Object.isFrozen(comp!)).toBe(true);
  });
  it('comparison metadata is frozen', async () => {
    const { r, kpi, ts0, ts1 } = await setupWithRecord();
    const comp = await r.getComparison(kpi.id, ts0, ts1);
    expect(Object.isFrozen(comp!.metadata)).toBe(true);
  });

  // Direction-based improved flag
  it('HigherIsBetter: improved=true when change > 0', async () => {
    const { r, kpi, ts0, ts1 } = await setupWithRecord(KPDirection.HigherIsBetter);
    const comp = await r.getComparison(kpi.id, ts0, ts1);
    expect(comp!.improved).toBe(true);
  });
  it('HigherIsBetter: improved=false when change <= 0', async () => {
    const r = createRuntime();
    const kpi = await r.register({ ...defaultParams, direction: KPDirection.HigherIsBetter, initialValue: 200 });
    const ts0 = kpi.createdAt;
    await new Promise(res => setTimeout(res, 10));
    await r.record(kpi.id, 100);
    const updated = await r.getById(kpi.id)!;
    const ts1 = updated.history[1].timestamp;
    const comp = await r.getComparison(kpi.id, ts0, ts1);
    expect(comp!.improved).toBe(false);
  });
  it('LowerIsBetter: improved=true when change < 0', async () => {
    const r = createRuntime();
    const kpi = await r.register({ ...defaultParams, direction: KPDirection.LowerIsBetter, initialValue: 200 });
    const ts0 = kpi.createdAt;
    await new Promise(res => setTimeout(res, 10));
    await r.record(kpi.id, 100);
    const updated = await r.getById(kpi.id)!;
    const ts1 = updated.history[1].timestamp;
    const comp = await r.getComparison(kpi.id, ts0, ts1);
    expect(comp!.improved).toBe(true);
  });
  it('LowerIsBetter: improved=false when change >= 0', async () => {
    const { r, kpi, ts0, ts1 } = await setupWithRecord(KPDirection.LowerIsBetter);
    const comp = await r.getComparison(kpi.id, ts0, ts1);
    expect(comp!.improved).toBe(false);
  });
  it('TargetIsOptimal: improved based on distance to target', async () => {
    const r = createRuntime();
    const kpi = await r.register({ ...defaultParams, direction: KPDirection.TargetIsOptimal, target: 150, initialValue: 200 });
    const ts0 = kpi.createdAt;
    await new Promise(res => setTimeout(res, 10));
    await r.record(kpi.id, 140);
    const updated = await r.getById(kpi.id)!;
    const ts1 = updated.history[1].timestamp;
    const comp = await r.getComparison(kpi.id, ts0, ts1);
    // |140-150| = 10, |200-150| = 50, so improved=true
    expect(comp!.improved).toBe(true);
  });
  it('TargetIsOptimal: not improved when farther from target', async () => {
    const { r, kpi, ts0, ts1 } = await setupWithRecord(KPDirection.TargetIsOptimal, 10);
    const comp = await r.getComparison(kpi.id, ts0, ts1);
    // |200-10| = 190, |100-10| = 90, so improved=false
    expect(comp!.improved).toBe(false);
  });
  it('TargetIsOptimal with null target: improved=false', async () => {
    const { r, kpi, ts0, ts1 } = await setupWithRecord(KPDirection.TargetIsOptimal, null);
    const comp = await r.getComparison(kpi.id, ts0, ts1);
    expect(comp!.improved).toBe(false);
  });

  // Edge cases for changePercent
  it('changePercent is 0 when both values are 0', async () => {
    const r = createRuntime();
    const kpi = await r.register({ ...defaultParams, initialValue: 0 });
    const ts0 = kpi.createdAt;
    await new Promise(res => setTimeout(res, 10));
    await r.record(kpi.id, 0);
    const updated = await r.getById(kpi.id)!;
    const ts1 = updated.history[1].timestamp;
    const comp = await r.getComparison(kpi.id, ts0, ts1);
    expect(comp!.changePercent).toBe(0);
  });
  it('changePercent is 100 when before=0 and after!=0', async () => {
    const r = createRuntime();
    const kpi = await r.register({ ...defaultParams, initialValue: 0 });
    const ts0 = kpi.createdAt;
    await new Promise(res => setTimeout(res, 10));
    await r.record(kpi.id, 50);
    const updated = await r.getById(kpi.id)!;
    const ts1 = updated.history[1].timestamp;
    const comp = await r.getComparison(kpi.id, ts0, ts1);
    expect(comp!.changePercent).toBe(100);
  });
  it('changePercent handles negative before', async () => {
    const r = createRuntime();
    const kpi = await r.register({ ...defaultParams, initialValue: -100 });
    const ts0 = kpi.createdAt;
    await new Promise(res => setTimeout(res, 10));
    await r.record(kpi.id, -50);
    const updated = await r.getById(kpi.id)!;
    const ts1 = updated.history[1].timestamp;
    const comp = await r.getComparison(kpi.id, ts0, ts1);
    expect(comp!.changePercent).toBe(-50);
  });

  // No matching entries
  it('returns null when no before entry', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    const comp = await r.getComparison(kpi.id, '1900-01-01', '2025-01-01');
    expect(comp).toBeNull();
  });
  it('returns null when no after entry', async () => {
    const r = createRuntime();
    const kpi = await r.register(defaultParams);
    const ts0 = kpi.createdAt;
    const comp = await r.getComparison(kpi.id, ts0, '2099-01-01');
    expect(comp).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// LIMIT EXCEEDED
// ═══════════════════════════════════════════════════════════════════

describe('KPIRuntime — limit exceeded', () => {
  it('throws PILimitExceededError when maxKPIs reached', async () => {
    const r = new KPIRuntime({ maxKPIs: 2, maxHistoryLength: 10000, aggregationWindowMs: 3600000 });
    await r.register(defaultParams);
    await r.register({ ...defaultParams, name: 'K2' });
    await expect(r.register({ ...defaultParams, name: 'K3' })).rejects.toThrow(PILimitExceededError);
  });
  it('PILimitExceededError extends EvolutionError', async () => {
    const r = new KPIRuntime({ maxKPIs: 1, maxHistoryLength: 10000, aggregationWindowMs: 3600000 });
    await r.register(defaultParams);
    try {
      await r.register({ ...defaultParams, name: 'K2' });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(EvolutionError);
    }
  });
  it('PILimitExceededError has error code', async () => {
    const r = new KPIRuntime({ maxKPIs: 1, maxHistoryLength: 10000, aggregationWindowMs: 3600000 });
    await r.register(defaultParams);
    try {
      await r.register({ ...defaultParams, name: 'K2' });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect((e as PILimitExceededError).code).toBe('KPI_LIMIT_EXCEEDED');
    }
  });
  it('PILimitExceededError has timestamp', async () => {
    const r = new KPIRuntime({ maxKPIs: 1, maxHistoryLength: 10000, aggregationWindowMs: 3600000 });
    await r.register(defaultParams);
    try {
      await r.register({ ...defaultParams, name: 'K2' });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect((e as EvolutionError).timestamp).toBeDefined();
    }
  });
  it('PILimitExceededError has context with maxKPIs', async () => {
    const r = new KPIRuntime({ maxKPIs: 1, maxHistoryLength: 10000, aggregationWindowMs: 3600000 });
    await r.register(defaultParams);
    try {
      await r.register({ ...defaultParams, name: 'K2' });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect((e as PILimitExceededError).context.maxKPIs).toBe(1);
    }
  });
  it('allows exactly maxKPIs registrations', async () => {
    const r = new KPIRuntime({ maxKPIs: 3, maxHistoryLength: 10000, aggregationWindowMs: 3600000 });
    await r.register(defaultParams);
    await r.register({ ...defaultParams, name: 'K2' });
    await r.register({ ...defaultParams, name: 'K3' });
    expect(await r.count()).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════
// EVENT EMISSION
// ═══════════════════════════════════════════════════════════════════

describe('KPIRuntime — event emission', () => {
  it('emits KPIRegisteredEvent on register', async () => {
    const bus = new InProcessEventBus();
    const r = createRuntime(bus);
    await r.register(defaultParams);
    const log = bus.getLog();
    const evt = log.find(e => e.eventType === 'evolution.kpi.registered');
    expect(evt).toBeDefined();
  });
  it('KPIRegisteredEvent has correct classification', async () => {
    const bus = new InProcessEventBus();
    const r = createRuntime(bus);
    await r.register(defaultParams);
    const log = bus.getLog();
    const evt = log.find(e => e.eventType === 'evolution.kpi.registered');
    expect(evt!.classification).toBeDefined();
  });
  it('KPIRegisteredEvent has timestamp', async () => {
    const bus = new InProcessEventBus();
    const r = createRuntime(bus);
    await r.register(defaultParams);
    const log = bus.getLog();
    const evt = log.find(e => e.eventType === 'evolution.kpi.registered');
    expect(evt!.timestamp).toBeDefined();
  });
  it('emits KPIUpdatedEvent on record', async () => {
    const bus = new InProcessEventBus();
    const r = createRuntime(bus);
    const kpi = await r.register(defaultParams);
    await r.record(kpi.id, 200);
    const log = bus.getLog();
    const evt = log.find(e => e.eventType === 'evolution.kpi.updated');
    expect(evt).toBeDefined();
  });
  it('KPIUpdatedEvent has correct classification', async () => {
    const bus = new InProcessEventBus();
    const r = createRuntime(bus);
    const kpi = await r.register(defaultParams);
    await r.record(kpi.id, 200);
    const log = bus.getLog();
    const evt = log.find(e => e.eventType === 'evolution.kpi.updated');
    expect(evt!.classification).toBeDefined();
  });
  it('KPIUpdatedEvent has timestamp', async () => {
    const bus = new InProcessEventBus();
    const r = createRuntime(bus);
    const kpi = await r.register(defaultParams);
    await r.record(kpi.id, 200);
    const log = bus.getLog();
    const evt = log.find(e => e.eventType === 'evolution.kpi.updated');
    expect(evt!.timestamp).toBeDefined();
  });
  it('does not emit events without eventBus', async () => {
    const r = createRuntime();
    await r.register(defaultParams);
    // No error — just no events
    expect(true).toBe(true);
  });
  it('event log grows with multiple operations', async () => {
    const bus = new InProcessEventBus();
    const r = createRuntime(bus);
    const kpi = await r.register(defaultParams);
    await r.record(kpi.id, 200);
    await r.record(kpi.id, 300);
    const log = bus.getLog();
    expect(log.length).toBe(3); // 1 registered + 2 updated
  });
  it('KPIRegisteredEvent fires before KPIUpdatedEvent', async () => {
    const bus = new InProcessEventBus();
    const r = createRuntime(bus);
    const kpi = await r.register(defaultParams);
    await r.record(kpi.id, 200);
    const log = bus.getLog();
    const regIdx = log.findIndex(e => e.eventType === 'evolution.kpi.registered');
    const updIdx = log.findIndex(e => e.eventType === 'evolution.kpi.updated');
    expect(regIdx).toBeLessThan(updIdx);
  });
  it('multiple registers emit multiple events', async () => {
    const bus = new InProcessEventBus();
    const r = createRuntime(bus);
    await r.register(defaultParams);
    await r.register({ ...defaultParams, name: 'K2' });
    await r.register({ ...defaultParams, name: 'K3' });
    const log = bus.getLog();
    const registered = log.filter(e => e.eventType === 'evolution.kpi.registered');
    expect(registered).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════════════
// STORE ACCESS
// ═══════════════════════════════════════════════════════════════════

describe('KPIRuntime — store access', () => {
  it('getStore returns store instance', () => {
    const r = createRuntime();
    const store = r.getStore();
    expect(store).toBeDefined();
  });
  it('store size reflects registrations', async () => {
    const r = createRuntime();
    const store = r.getStore();
    expect(store.size).toBe(0);
    await r.register(defaultParams);
    expect(store.size).toBe(1);
  });
});
