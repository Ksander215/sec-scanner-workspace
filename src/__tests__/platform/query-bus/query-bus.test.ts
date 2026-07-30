import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformQueryBus } from '../../../platform/query-bus/query-bus.js';

describe('PlatformQueryBus', () => {
  let bus: PlatformQueryBus;
  beforeEach(() => { bus = new PlatformQueryBus(); });

  it('executes query with handler', async () => {
    bus.registerHandler('q', async (q) => q.payload);
    const r = await bus.execute('q', 'data');
    expect(r.success).toBe(true);
    expect(r.data).toBe('data');
  });
  it('returns error for unregistered query', async () => {
    const r = await bus.execute('unknown', {});
    expect(r.success).toBe(false);
  });
  it('captures handler errors', async () => {
    bus.registerHandler('fail', async () => { throw new Error('qerr'); });
    const r = await bus.execute('fail', {});
    expect(r.success).toBe(false);
    expect(r.error).toBe('qerr');
  });
  it('generates unique queryId', async () => {
    bus.registerHandler('q', async () => null);
    const r1 = await bus.execute('q', {});
    const r2 = await bus.execute('q', {});
    expect(r1.timestamp).toBeDefined();
    expect(r2.timestamp).toBeDefined();
  });
  it('records processing time', async () => {
    bus.registerHandler('q', async () => {
      await new Promise(r => setTimeout(r, 10));
      return null;
    });
    const r = await bus.execute('q', {});
    expect(r.processingTimeMs).toBeGreaterThanOrEqual(0);
  });
  it('query log records all', async () => {
    bus.registerHandler('q', async () => null);
    await bus.execute('q', { a: 1 });
    await bus.execute('q', { b: 2 });
    expect(bus.getQueryLog()).toHaveLength(2);
  });
  it('clearLog empties the log', async () => {
    bus.registerHandler('q', async () => null);
    await bus.execute('q', {});
    bus.clearLog();
    expect(bus.getQueryLog()).toHaveLength(0);
  });
  it('async handler works', async () => {
    bus.registerHandler('q', async (q) => { await new Promise(r => setTimeout(r, 5)); return q.payload; });
    const r = await bus.execute('q', 'result');
    expect(r.data).toBe('result');
  });
  it('handles complex payload', async () => {
    bus.registerHandler('q', async (q) => q.payload);
    const r = await bus.execute('q', { items: [1, 2, 3] });
    expect(r.data).toEqual({ items: [1, 2, 3] });
  });
  it('handles 100 queries', async () => {
    bus.registerHandler('q', async (q) => q.payload);
    for (let i = 0; i < 100; i++) {
      const r = await bus.execute('q', i);
      expect(r.success).toBe(true);
    }
  });
});
