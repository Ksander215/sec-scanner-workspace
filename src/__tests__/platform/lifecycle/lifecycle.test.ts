import { describe, it, expect, afterEach } from 'vitest';
import { PlatformRuntime } from '../../../platform/platform-runtime/platform-runtime.js';
import { PlatformState, HealthStatus } from '../../../platform/types.js';
import type { RuntimeContract } from '../../../platform/types.js';

describe('Platform Lifecycle', () => {
  let platform: PlatformRuntime;
  afterEach(async () => { try { await platform.stop(); } catch { /* noop */ } });

  it('Uninitialized → Discovering → Ready', async () => {
    platform = new PlatformRuntime();
    expect(platform.getState()).toBe(PlatformState.Uninitialized);
    platform.registerRuntime({
      id: 'a', name: 'A', version: '1.0.0', description: '', dependencies: [],
      initialize: async () => {}, activate: async () => {}, shutdown: async () => {},
      health: async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }),
    });
    await platform.start();
    expect(platform.getState()).toBe(PlatformState.Ready);
  });

  it('Ready → ShuttingDown → Stopped', async () => {
    platform = new PlatformRuntime();
    platform.registerRuntime({
      id: 'a', name: 'A', version: '1.0.0', description: '', dependencies: [],
      initialize: async () => {}, activate: async () => {}, shutdown: async () => {},
      health: async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }),
    });
    await platform.start();
    await platform.stop();
    expect(platform.getState()).toBe(PlatformState.Stopped);
  });

  it('Stopped → Restarting → Ready', async () => {
    platform = new PlatformRuntime();
    platform.registerRuntime({
      id: 'a', name: 'A', version: '1.0.0', description: '', dependencies: [],
      initialize: async () => {}, activate: async () => {}, shutdown: async () => {},
      health: async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }),
    });
    await platform.start();
    await platform.stop();
    await platform.restart();
    expect(platform.getState()).toBe(PlatformState.Ready);
  });

  it('lifecycle events are published', async () => {
    platform = new PlatformRuntime();
    const events: string[] = [];
    platform.getEventHub().subscribeAll((e) => events.push(e.eventType));
    platform.registerRuntime({
      id: 'a', name: 'A', version: '1.0.0', description: '', dependencies: [],
      initialize: async () => {}, activate: async () => {}, shutdown: async () => {},
      health: async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }),
    });
    await platform.start();
    expect(events).toContain('platform.ready');
    await platform.stop();
    expect(events).toContain('platform.stopped');
  });

  it('multiple start calls are idempotent', async () => {
    platform = new PlatformRuntime();
    platform.registerRuntime({
      id: 'a', name: 'A', version: '1.0.0', description: '', dependencies: [],
      initialize: async () => {}, activate: async () => {}, shutdown: async () => {},
      health: async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }),
    });
    await platform.start();
    const state = platform.getState();
    await platform.start();
    expect(platform.getState()).toBe(state);
  });
});
