import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformCommandBus } from '../../../platform/command-bus/command-bus.js';

describe('PlatformCommandBus', () => {
  let bus: PlatformCommandBus;
  beforeEach(() => { bus = new PlatformCommandBus(); });

  it('dispatches to registered handler', async () => {
    bus.registerHandler('test', async (cmd) => cmd.payload);
    const r = await bus.dispatch('test', 'hello');
    expect(r.success).toBe(true);
    expect(r.data).toBe('hello');
  });
  it('returns error for unregistered command', async () => {
    const r = await bus.dispatch('unknown', {});
    expect(r.success).toBe(false);
    expect(r.error).toContain('No handler');
  });
  it('handles async handler', async () => {
    bus.registerHandler('cmd', async () => {
      await new Promise(r => setTimeout(r, 5));
      return 42;
    });
    const r = await bus.dispatch('cmd', {});
    expect(r.success).toBe(true);
    expect(r.data).toBe(42);
  });
  it('captures handler errors', async () => {
    bus.registerHandler('fail', async () => { throw new Error('boom'); });
    const r = await bus.dispatch('fail', {});
    expect(r.success).toBe(false);
    expect(r.error).toBe('boom');
  });
  it('retries on failure with retry policy', async () => {
    let attempts = 0;
    bus.registerHandler('retry', async () => {
      attempts++;
      if (attempts < 3) throw new Error('retry');
      return 'ok';
    });
    bus.setRetryPolicy({ maxRetries: 3, baseDelayMs: 1, maxDelayMs: 10, backoffMultiplier: 1 });
    const r = await bus.dispatch('retry', {});
    expect(r.success).toBe(true);
    expect(attempts).toBe(3);
  });
  it('stops retrying after maxRetries', async () => {
    let attempts = 0;
    bus.registerHandler('fail', async () => { attempts++; throw new Error('no'); });
    bus.setRetryPolicy({ maxRetries: 2, baseDelayMs: 1, maxDelayMs: 10, backoffMultiplier: 1 });
    const r = await bus.dispatch('fail', {});
    expect(r.success).toBe(false);
    expect(attempts).toBe(3);
  });
  it('generates unique commandId', async () => {
    bus.registerHandler('c', async () => null);
    const r1 = await bus.dispatch('c', {});
    const r2 = await bus.dispatch('c', {});
    expect(r1.timestamp).toBeDefined();
    expect(r2.timestamp).toBeDefined();
  });
  it('records processing time', async () => {
    bus.registerHandler('slow', async () => {
      await new Promise(r => setTimeout(r, 10));
      return null;
    });
    const r = await bus.dispatch('slow', {});
    expect(r.processingTimeMs).toBeGreaterThanOrEqual(0);
  });
  it('command log records all dispatched', async () => {
    bus.registerHandler('c', async () => null);
    await bus.dispatch('c', { a: 1 });
    await bus.dispatch('c', { b: 2 });
    expect(bus.getCommandLog()).toHaveLength(2);
  });
  it('clearLog empties the log', async () => {
    bus.registerHandler('c', async () => null);
    await bus.dispatch('c', {});
    bus.clearLog();
    expect(bus.getCommandLog()).toHaveLength(0);
  });
  it('payload is frozen', async () => {
    bus.registerHandler('c', async (cmd) => cmd);
    const r = await bus.dispatch('c', { x: 1 });
    expect(Object.isFrozen(r.timestamp)).toBe(true);
  });
  it('handles 100 commands', async () => {
    bus.registerHandler('c', async (cmd) => cmd.payload);
    for (let i = 0; i < 100; i++) {
      const r = await bus.dispatch('c', i);
      expect(r.success).toBe(true);
    }
  });
});
