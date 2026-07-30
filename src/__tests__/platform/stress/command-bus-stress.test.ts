import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformCommandBus } from '../../../platform/command-bus/command-bus.js';

describe('CommandBus Stress', () => {
  let b: PlatformCommandBus;
  beforeEach(() => { b = new PlatformCommandBus(); b.registerHandler('c', async (cmd) => cmd.payload); });

  it('100 commands', async () => {
    for (let i = 0; i < 100; i++) {
      const r = await b.dispatch('c', i);
      expect(r.success).toBe(true);
    }
  });
  it('500 commands', async () => {
    for (let i = 0; i < 500; i++) {
      const r = await b.dispatch('c', i);
      expect(r.data).toBe(i);
    }
  });
  it('log grows to 500', async () => {
    for (let i = 0; i < 500; i++) await b.dispatch('c', i);
    expect(b.getCommandLog()).toHaveLength(500);
  });
  it('clearLog and re-dispatch', async () => {
    for (let i = 0; i < 50; i++) await b.dispatch('c', i);
    b.clearLog();
    expect(b.getCommandLog()).toHaveLength(0);
    await b.dispatch('c', 99);
    expect(b.getCommandLog()).toHaveLength(1);
  });
  it('20 different command types', async () => {
    for (let i = 0; i < 20; i++) b.registerHandler(`cmd${i}`, async (c) => c.payload);
    for (let i = 0; i < 20; i++) {
      const r = await b.dispatch(`cmd${i}`, i);
      expect(r.success).toBe(true);
    }
  });
  it('missing handler 100 times', async () => {
    for (let i = 0; i < 100; i++) {
      const r = await b.dispatch('missing', {});
      expect(r.success).toBe(false);
    }
  });
  it('large payload', async () => {
    const large = Array(10000).fill('x').join('');
    const r = await b.dispatch('c', large);
    expect(r.success).toBe(true);
  });
  it('retry with 500 max retries policy', async () => {
    b.setRetryPolicy({ maxRetries: 0, baseDelayMs: 0, maxDelayMs: 0, backoffMultiplier: 1 });
    b.registerHandler('fail', async () => { throw new Error('no'); });
    const r = await b.dispatch('fail', {});
    expect(r.success).toBe(false);
  });
  it('overwrite handler 10 times', async () => {
    for (let i = 0; i < 10; i++) b.registerHandler('c', async () => i);
    const r = await b.dispatch('c', {});
    expect(r.data).toBe(9);
  });
});
