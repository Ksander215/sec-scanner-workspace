import { describe, it, expect, beforeEach } from 'vitest';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { TechnicalDebtAnalyzer } from '../../core/evolution/tech-debt-analyzer.js';
import { DefaultEvolutionRuntimeConfig, TechDebtPriority } from '../../core/evolution/types.js';
import { TechDebtNotFoundError, TechDebtLimitExceededError } from '../../core/evolution/errors.js';

const cfg = DefaultEvolutionRuntimeConfig.techDebt;

function createAnalyzer(bus?: InProcessEventBus) {
  return new TechnicalDebtAnalyzer(cfg, bus);
}

const baseParams = {
  name: 'Missing tests for auth module',
  description: 'Auth module has no unit tests',
  priority: TechDebtPriority.High,
  estimatedCost: 40,
  impact: 8,
  targetModule: 'auth',
  targetFile: 'auth/service.ts',
  metadata: Object.freeze({}),
};

describe('TechnicalDebtAnalyzer — constructor', () => {
  it('creates instance without eventBus', () => {
    const t = createAnalyzer();
    expect(t).toBeDefined();
  });
  it('creates instance with eventBus', () => {
    const t = createAnalyzer(new InProcessEventBus());
    expect(t).toBeDefined();
  });
});

describe('TechnicalDebtAnalyzer — register', () => {
  it('creates item with all fields', async () => {
    const t = createAnalyzer();
    const item = await t.register(baseParams);
    expect(item.id).toBeDefined();
    expect(item.name).toBe('Missing tests for auth module');
    expect(item.description).toBe('Auth module has no unit tests');
    expect(item.priority).toBe(TechDebtPriority.High);
    expect(item.estimatedCost).toBe(40);
    expect(item.impact).toBe(8);
    expect(item.targetModule).toBe('auth');
    expect(item.targetFile).toBe('auth/service.ts');
    expect(item.resolvedAt).toBeNull();
    expect(item.createdAt).toBeDefined();
  });
  it('item is frozen', async () => {
    const t = createAnalyzer();
    const item = await t.register(baseParams);
    expect(Object.isFrozen(item)).toBe(true);
  });
  it('each item has unique id', async () => {
    const t = createAnalyzer();
    const i1 = await t.register(baseParams);
    const i2 = await t.register(baseParams);
    expect(i1.id).not.toBe(i2.id);
  });
  it('preserves metadata', async () => {
    const t = createAnalyzer();
    const meta = Object.freeze({ key: 'val' });
    const item = await t.register({ ...baseParams, metadata: meta });
    expect(item.metadata).toBe(meta);
  });
  it('allows targetFile null', async () => {
    const t = createAnalyzer();
    const item = await t.register({ ...baseParams, targetFile: null });
    expect(item.targetFile).toBeNull();
  });
  it('emits evolution.techDebt.detected event', async () => {
    const bus = new InProcessEventBus();
    const t = createAnalyzer(bus);
    await t.register(baseParams);
    const log = bus.getLog();
    const events = log.filter(e => e.eventType === 'evolution.techDebt.detected');
    expect(events.length).toBe(1);
  });
  it('event envelope has correct fields', async () => {
    const bus = new InProcessEventBus();
    const t = createAnalyzer(bus);
    await t.register(baseParams);
    const log = bus.getLog();
    const evt = log.find(e => e.eventType === 'evolution.techDebt.detected');
    expect(evt).toBeDefined();
    expect(evt!.eventType).toBe('evolution.techDebt.detected');
    expect(evt!.timestamp).toBeDefined();
  });
  it('emits one event per register', async () => {
    const bus = new InProcessEventBus();
    const t = createAnalyzer(bus);
    await t.register(baseParams);
    await t.register({ ...baseParams, name: 'debt2' });
    const log = bus.getLog();
    const events = log.filter(e => e.eventType === 'evolution.techDebt.detected');
    expect(events.length).toBe(2);
  });
  it('does not emit events without eventBus', async () => {
    const t = createAnalyzer();
    await t.register(baseParams);
  });
  it('throws TechDebtLimitExceededError when limit reached', async () => {
    const t = new TechnicalDebtAnalyzer({ maxItems: 1, depreciationRate: 0.1 });
    await t.register(baseParams);
    await expect(t.register(baseParams)).rejects.toThrow(TechDebtLimitExceededError);
  });
  it('registers with Low priority', async () => {
    const t = createAnalyzer();
    const item = await t.register({ ...baseParams, priority: TechDebtPriority.Low });
    expect(item.priority).toBe(TechDebtPriority.Low);
  });
  it('registers with Critical priority', async () => {
    const t = createAnalyzer();
    const item = await t.register({ ...baseParams, priority: TechDebtPriority.Critical });
    expect(item.priority).toBe(TechDebtPriority.Critical);
  });
  it('registers with Medium priority', async () => {
    const t = createAnalyzer();
    const item = await t.register({ ...baseParams, priority: TechDebtPriority.Medium });
    expect(item.priority).toBe(TechDebtPriority.Medium);
  });
});

describe('TechnicalDebtAnalyzer — resolve', () => {
  it('sets resolvedAt', async () => {
    const t = createAnalyzer();
    const item = await t.register(baseParams);
    await t.resolve(item.id);
    const resolved = await t.getById(item.id);
    expect(resolved!.resolvedAt).toBeDefined();
  });
  it('resolvedAt is ISO string', async () => {
    const t = createAnalyzer();
    const item = await t.register(baseParams);
    await t.resolve(item.id);
    const resolved = await t.getById(item.id);
    expect(typeof resolved!.resolvedAt).toBe('string');
    expect(new Date(resolved!.resolvedAt!).getTime()).not.toBeNaN();
  });
  it('emits evolution.techDebt.resolved event', async () => {
    const bus = new InProcessEventBus();
    const t = createAnalyzer(bus);
    const item = await t.register(baseParams);
    await t.resolve(item.id);
    const log = bus.getLog();
    const events = log.filter(e => e.eventType === 'evolution.techDebt.resolved');
    expect(events.length).toBe(1);
  });
  it('throws TechDebtNotFoundError for unknown id', async () => {
    const t = createAnalyzer();
    await expect(t.resolve('nonexistent' as any)).rejects.toThrow(TechDebtNotFoundError);
  });
});

describe('TechnicalDebtAnalyzer — getById', () => {
  it('returns null for unknown id', async () => {
    const t = createAnalyzer();
    const result = await t.getById('nonexistent' as any);
    expect(result).toBeNull();
  });
  it('returns item after register', async () => {
    const t = createAnalyzer();
    const item = await t.register(baseParams);
    const found = await t.getById(item.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(item.id);
  });
  it('returns frozen item', async () => {
    const t = createAnalyzer();
    const item = await t.register(baseParams);
    const found = await t.getById(item.id);
    expect(Object.isFrozen(found!)).toBe(true);
  });
});

describe('TechnicalDebtAnalyzer — list', () => {
  it('returns empty array initially', async () => {
    const t = createAnalyzer();
    const items = await t.list();
    expect(items).toEqual([]);
  });
  it('returns all items', async () => {
    const t = createAnalyzer();
    await t.register(baseParams);
    await t.register({ ...baseParams, name: 'debt2' });
    const items = await t.list();
    expect(items.length).toBe(2);
  });
  it('filter by priority', async () => {
    const t = createAnalyzer();
    await t.register(baseParams); // High
    await t.register({ ...baseParams, name: 'debt2', priority: TechDebtPriority.Low });
    const items = await t.list({ priority: TechDebtPriority.High });
    expect(items.length).toBe(1);
    expect(items[0].priority).toBe(TechDebtPriority.High);
  });
  it('filter by resolved=true', async () => {
    const t = createAnalyzer();
    const item = await t.register(baseParams);
    await t.register({ ...baseParams, name: 'debt2' });
    await t.resolve(item.id);
    const items = await t.list({ resolved: true });
    expect(items.length).toBe(1);
  });
  it('filter by resolved=false', async () => {
    const t = createAnalyzer();
    const item = await t.register(baseParams);
    await t.register({ ...baseParams, name: 'debt2' });
    await t.resolve(item.id);
    const items = await t.list({ resolved: false });
    expect(items.length).toBe(1);
  });
  it('returns frozen array', async () => {
    const t = createAnalyzer();
    await t.register(baseParams);
    const items = await t.list();
    expect(Object.isFrozen(items)).toBe(true);
  });
});

describe('TechnicalDebtAnalyzer — getTotalCost', () => {
  it('returns 0 when no items', async () => {
    const t = createAnalyzer();
    expect(await t.getTotalCost()).toBe(0);
  });
  it('sums unresolved costs', async () => {
    const t = createAnalyzer();
    await t.register(baseParams); // 40
    await t.register({ ...baseParams, name: 'd2', estimatedCost: 60 });
    expect(await t.getTotalCost()).toBe(100);
  });
  it('excludes resolved items', async () => {
    const t = createAnalyzer();
    const item = await t.register(baseParams); // 40
    await t.register({ ...baseParams, name: 'd2', estimatedCost: 60 });
    await t.resolve(item.id);
    expect(await t.getTotalCost()).toBe(60);
  });
});

describe('TechnicalDebtAnalyzer — count', () => {
  it('returns 0 initially', async () => {
    const t = createAnalyzer();
    expect(await t.count()).toBe(0);
  });
  it('returns correct count after register', async () => {
    const t = createAnalyzer();
    await t.register(baseParams);
    await t.register({ ...baseParams, name: 'd2' });
    expect(await t.count()).toBe(2);
  });
});

describe('TechnicalDebtAnalyzer — store access', () => {
  it('getStore returns store', () => {
    const t = createAnalyzer();
    expect(t.getStore()).toBeDefined();
  });
  it('store size is 0 initially', () => {
    const t = createAnalyzer();
    expect(t.getStore().size).toBe(0);
  });
  it('store size increases after register', async () => {
    const t = createAnalyzer();
    await t.register(baseParams);
    expect(t.getStore().size).toBe(1);
  });
});
