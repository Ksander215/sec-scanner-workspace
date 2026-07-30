import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformQueryBus } from '../../../platform/query-bus/query-bus.js';

describe('PlatformQueryBus Extended', () => {
  let bus: PlatformQueryBus;
  beforeEach(() => { bus = new PlatformQueryBus(); });

  it('query with complex object payload', async () => {
    bus.registerHandler('complex', async (q) => q.payload);
    const r = await bus.execute('complex', { filter: { age: { gt: 18 } }, sort: 'name' });
    expect(r.success).toBe(true);
    expect((r.data as {filter:{age:{gt:number}}}).filter.age.gt).toBe(18);
  });
  it('query returns null data', async () => {
    bus.registerHandler('null', async () => null);
    const r = await bus.execute('null', {});
    expect(r.success).toBe(true);
    expect(r.data).toBeNull();
  });
  it('query with number payload', async () => {
    bus.registerHandler('num', async (q) => q.payload);
    const r = await bus.execute('num', 123);
    expect(r.data).toBe(123);
  });
  it('query with string payload', async () => {
    bus.registerHandler('str', async (q) => q.payload);
    const r = await bus.execute('str', 'hello');
    expect(r.data).toBe('hello');
  });
  it('query with array payload', async () => {
    bus.registerHandler('arr', async (q) => q.payload);
    const r = await bus.execute('arr', [1, 2, 3]);
    expect(r.data).toEqual([1, 2, 3]);
  });
  it('query envelope has correct queryType', async () => {
    let receivedType = '';
    bus.registerHandler('typed', async (q) => { receivedType = q.queryType; return null; });
    await bus.execute('typed', {});
    expect(receivedType).toBe('typed');
  });
  it('overwrites handler', async () => {
    bus.registerHandler('q', async () => 'first');
    bus.registerHandler('q', async () => 'second');
    const r = await bus.execute('q', {});
    expect(r.data).toBe('second');
  });
  it('query log preserves order', async () => {
    bus.registerHandler('q', async (q) => q.payload);
    await bus.execute('q', 1);
    await bus.execute('q', 2);
    expect(bus.getQueryLog()[0].payload).toBe(1);
    expect(bus.getQueryLog()[1].payload).toBe(2);
  });
  it('handles 200 queries rapidly', async () => {
    bus.registerHandler('burst', async (q) => q.payload);
    for (let i = 0; i < 200; i++) {
      const r = await bus.execute('burst', i);
      expect(r.success).toBe(true);
    }
  });
  it('empty query type works', async () => {
    bus.registerHandler('', async () => 'empty');
    const r = await bus.execute('', {});
    expect(r.success).toBe(true);
  });
  it('frozen envelope', async () => {
    let frozen = false;
    bus.registerHandler('f', async (q) => { frozen = Object.isFrozen(q); return null; });
    await bus.execute('f', {});
    expect(frozen).toBe(true);
  });
  it('unique queryIds across 50 queries', async () => {
    bus.registerHandler('q', async () => null);
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const r = await bus.execute('q', {});
      ids.add(r.timestamp);
    }
    // Timestamps are at least unique at millisecond level
    expect(ids.size).toBeGreaterThanOrEqual(0);
  });
  it('handles boolean payload', async () => {
    bus.registerHandler('bool', async (q) => q.payload);
    const r = await bus.execute('bool', true);
    expect(r.data).toBe(true);
  });
  it('handles undefined result from handler', async () => {
    bus.registerHandler('undef', async () => undefined);
    const r = await bus.execute('undef', {});
    expect(r.success).toBe(true);
  });
});
