import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformQueryBus } from '../../../platform/query-bus/query-bus.js';

describe('QueryBus Stress', () => {
  let b: PlatformQueryBus;
  beforeEach(() => { b = new PlatformQueryBus(); b.registerHandler('q', async (q) => q.payload); });

  it('100 queries', async () => {
    for (let i = 0; i < 100; i++) {
      const r = await b.execute('q', i);
      expect(r.success).toBe(true);
    }
  });
  it('500 queries', async () => {
    for (let i = 0; i < 500; i++) {
      const r = await b.execute('q', i);
      expect(r.data).toBe(i);
    }
  });
  it('log grows to 500', async () => {
    for (let i = 0; i < 500; i++) await b.execute('q', i);
    expect(b.getQueryLog()).toHaveLength(500);
  });
  it('20 different query types', async () => {
    for (let i = 0; i < 20; i++) b.registerHandler(`q${i}`, async (q) => q.payload);
    for (let i = 0; i < 20; i++) {
      const r = await b.execute(`q${i}`, i);
      expect(r.success).toBe(true);
    }
  });
  it('missing handler 100 times', async () => {
    for (let i = 0; i < 100; i++) {
      const r = await b.execute('missing', {});
      expect(r.success).toBe(false);
    }
  });
  it('clearLog', async () => {
    for (let i = 0; i < 50; i++) await b.execute('q', i);
    b.clearLog();
    expect(b.getQueryLog()).toHaveLength(0);
  });
  it('large payload', async () => {
    const large = Array(10000).fill('x').join('');
    const r = await b.execute('q', large);
    expect(r.success).toBe(true);
  });
  it('null result from handler', async () => {
    b.registerHandler('null', async () => null);
    const r = await b.execute('null', {});
    expect(r.success).toBe(true);
    expect(r.data).toBeNull();
  });
  it('overwrite handler', async () => {
    b.registerHandler('q', async () => 'first');
    b.registerHandler('q', async () => 'second');
    const r = await b.execute('q', {});
    expect(r.data).toBe('second');
  });
});
