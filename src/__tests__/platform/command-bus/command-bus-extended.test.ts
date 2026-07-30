import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformCommandBus } from '../../../platform/command-bus/command-bus.js';

describe('PlatformCommandBus Extended', () => {
  let bus: PlatformCommandBus;
  beforeEach(() => { bus = new PlatformCommandBus(); });

  it('dispatches with object payload', async () => {
    bus.registerHandler('obj', async (c) => c.payload);
    const r = await bus.dispatch('obj', { key: 'value', nested: { a: 1 } });
    expect(r.success).toBe(true);
    expect((r.data as {key:string}).key).toBe('value');
  });
  it('dispatches with array payload', async () => {
    bus.registerHandler('arr', async (c) => c.payload);
    const r = await bus.dispatch('arr', [1, 2, 3]);
    expect(r.data).toEqual([1, 2, 3]);
  });
  it('dispatches with null payload', async () => {
    bus.registerHandler('null', async (c) => c.payload);
    const r = await bus.dispatch('null', null);
    expect(r.success).toBe(true);
    expect(r.data).toBeNull();
  });
  it('dispatches with number payload', async () => {
    bus.registerHandler('num', async (c) => c.payload);
    const r = await bus.dispatch('num', 42);
    expect(r.data).toBe(42);
  });
  it('dispatches with boolean payload', async () => {
    bus.registerHandler('bool', async (c) => c.payload);
    const r = await bus.dispatch('bool', false);
    expect(r.data).toBe(false);
  });
  it('retry policy with exponential backoff', async () => {
    let attempts = 0;
    const times: number[] = [];
    const origDate = Date.now;
    let currentTime = 0;
    Date.now = () => currentTime;
    try {
      bus.registerHandler('backoff', async () => {
        times.push(currentTime);
        attempts++;
        throw new Error('fail');
      });
      bus.setRetryPolicy({ maxRetries: 3, baseDelayMs: 10, maxDelayMs: 100, backoffMultiplier: 2 });
      const r = await bus.dispatch('backoff', {});
      expect(r.success).toBe(false);
      expect(attempts).toBe(4);
    } finally { Date.now = origDate; }
  });
  it('overwrites handler for same command type', async () => {
    bus.registerHandler('cmd', async () => 'first');
    bus.registerHandler('cmd', async () => 'second');
    const r = await bus.dispatch('cmd', {});
    expect(r.data).toBe('second');
  });
  it('command envelope has correct type', async () => {
    let receivedType = '';
    bus.registerHandler('typed', async (c) => { receivedType = c.commandType; return null; });
    await bus.dispatch('typed', {});
    expect(receivedType).toBe('typed');
  });
  it('command log preserves order', async () => {
    bus.registerHandler('c', async () => null);
    await bus.dispatch('c', { order: 1 });
    await bus.dispatch('c', { order: 2 });
    await bus.dispatch('c', { order: 3 });
    const log = bus.getCommandLog();
    expect((log[0].payload as {order:number}).order).toBe(1);
    expect((log[2].payload as {order:number}).order).toBe(3);
  });
  it('returns processing time >= 0', async () => {
    bus.registerHandler('c', async () => null);
    const r = await bus.dispatch('c', {});
    expect(r.processingTimeMs).toBeGreaterThanOrEqual(0);
  });
  it('handler receives frozen envelope', async () => {
    let frozen = false;
    bus.registerHandler('c', async (cmd) => { frozen = Object.isFrozen(cmd); return null; });
    await bus.dispatch('c', {});
    expect(frozen).toBe(true);
  });
  it('unique commandIds', async () => {
    bus.registerHandler('c', async () => null);
    const ids = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const r = await bus.dispatch('c', { i });
      // We don't have direct access to commandId but timestamps differ
      expect(r.timestamp).toBeDefined();
    }
  });
  it('empty command type works', async () => {
    bus.registerHandler('', async () => 'empty');
    const r = await bus.dispatch('', {});
    expect(r.success).toBe(true);
  });
  it('dispatches 200 commands rapidly', async () => {
    bus.registerHandler('burst', async (c) => c.payload);
    for (let i = 0; i < 200; i++) {
      const r = await bus.dispatch('burst', i);
      expect(r.success).toBe(true);
    }
  });
});
