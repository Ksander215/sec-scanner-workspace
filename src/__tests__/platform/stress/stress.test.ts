import { describe, it, expect, afterEach } from 'vitest';
import { PlatformRuntime } from '../../../platform/platform-runtime/platform-runtime.js';
import { PlatformState, HealthStatus } from '../../../platform/types.js';
import type { RuntimeContract } from '../../../platform/types.js';

describe('Platform Stress', () => {
  let platform: PlatformRuntime;
  afterEach(async () => { try { await platform.stop(); } catch { /* noop */ } });

  it('handles 50 concurrent runtimes', async () => {
    platform = new PlatformRuntime({ enableSecurityValidation: false });
    for (let i = 0; i < 50; i++) {
      platform.registerRuntime({
        id: `rt-${i}`, name: `Runtime ${i}`, version: '1.0.0', description: '', dependencies: [],
        initialize: async () => {}, activate: async () => {}, shutdown: async () => {},
        health: async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }),
      });
    }
    const result = await platform.start();
    expect(result.success).toBe(true);
    expect(result.initializedRuntimes).toHaveLength(50);
  });

  it('handles 1000 events rapidly', async () => {
    platform = new PlatformRuntime();
    let count = 0;
    platform.getEventHub().subscribe('stress', () => count++);
    for (let i = 0; i < 1000; i++) await platform.getEventHub().publish('stress', { i });
    expect(count).toBe(1000);
  });

  it('handles 1000 commands rapidly', async () => {
    platform = new PlatformRuntime();
    platform.getCommandBus().registerHandler('stress', async (c) => c.payload);
    for (let i = 0; i < 1000; i++) {
      const r = await platform.getCommandBus().dispatch('stress', i);
      expect(r.success).toBe(true);
    }
  });

  it('handles 1000 queries rapidly', async () => {
    platform = new PlatformRuntime();
    platform.getQueryBus().registerHandler('stress', async (q) => q.payload);
    for (let i = 0; i < 1000; i++) {
      const r = await platform.getQueryBus().execute('stress', i);
      expect(r.success).toBe(true);
    }
  });

  it('handles 1000 metric increments', () => {
    platform = new PlatformRuntime();
    for (let i = 0; i < 1000; i++) platform.getMetrics().increment('stress');
    expect(platform.getMetrics().counter('stress')).toBe(1000);
  });

  it('handles 100 config operations', () => {
    platform = new PlatformRuntime();
    for (let i = 0; i < 100; i++) platform.getConfiguration().set(`key-${i}`, i);
    for (let i = 0; i < 100; i++) expect(platform.getConfiguration().get(`key-${i}`)).toBe(i);
  });
});
