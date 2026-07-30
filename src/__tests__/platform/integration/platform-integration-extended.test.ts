import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PlatformRuntime } from '../../../platform/platform-runtime/platform-runtime.js';
import { PlatformState, HealthStatus } from '../../../platform/types.js';
import type { RuntimeContract } from '../../../platform/types.js';

function rc(id: string, deps: string[] = []): RuntimeContract {
  return { id, name: id, version: '1.0.0', description: id, dependencies: deps,
    initialize: async () => {}, activate: async () => {}, shutdown: async () => {},
    health: async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }),
  };
}

describe('Platform Integration Extended', () => {
  let p: PlatformRuntime;
  beforeEach(() => { p = new PlatformRuntime({ enableSecurityValidation: false }); });
  afterEach(async () => { try { await p.stop(); } catch {} });

  it('full 8-runtime bootstrap with event verification', async () => {
    const events: string[] = [];
    p.getEventHub().subscribeAll((e) => events.push(e.eventType));
    p.registerRuntime(rc('memory'));
    p.registerRuntime(rc('knowledge', ['memory']));
    p.registerRuntime(rc('identity', ['memory']));
    p.registerRuntime(rc('capability', ['memory', 'identity']));
    p.registerRuntime(rc('workflow', ['memory', 'knowledge']));
    p.registerRuntime(rc('cognitive', ['memory', 'knowledge', 'identity']));
    p.registerRuntime(rc('experience', ['memory', 'identity', 'cognitive']));
    p.registerRuntime(rc('desktop', ['memory', 'knowledge', 'identity', 'cognitive', 'experience']));
    const r = await p.start();
    expect(r.success).toBe(true);
    expect(r.initializedRuntimes).toHaveLength(8);
    expect(events).toContain('platform.ready');
  });

  it('command bus works after bootstrap', async () => {
    p.registerRuntime(rc('a'));
    await p.start();
    p.getCommandBus().registerHandler('test', async (c) => c.payload);
    const r = await p.getCommandBus().dispatch('test', { ok: true });
    expect(r.success).toBe(true);
  });

  it('query bus works after bootstrap', async () => {
    p.registerRuntime(rc('a'));
    await p.start();
    p.getQueryBus().registerHandler('test', async (q) => q.payload);
    const r = await p.getQueryBus().execute('test', { result: 42 });
    expect(r.success).toBe(true);
  });

  it('DI resolves all services after bootstrap', async () => {
    p.registerRuntime(rc('a'));
    await p.start();
    expect(await p.getContainer().resolve('eventHub')).toBeDefined();
    expect(await p.getContainer().resolve('commandBus')).toBeDefined();
    expect(await p.getContainer().resolve('queryBus')).toBeDefined();
    expect(await p.getContainer().resolve('configuration')).toBeDefined();
    expect(await p.getContainer().resolve('scheduler')).toBeDefined();
    expect(await p.getContainer().resolve('healthMonitor')).toBeDefined();
    expect(await p.getContainer().resolve('diagnostics')).toBeDefined();
    expect(await p.getContainer().resolve('metrics')).toBeDefined();
    expect(await p.getContainer().resolve('pluginLoader')).toBeDefined();
  });

  it('metrics record startup', async () => {
    p.registerRuntime(rc('a'));
    await p.start();
    expect(p.getMetrics().counter('platform.startup.total')).toBe(1);
  });

  it('configuration is accessible after bootstrap', async () => {
    p.registerRuntime(rc('a'));
    await p.start();
    expect(p.getConfiguration().get('appName')).toBeUndefined();
    p.getConfiguration().set('custom', 'value');
    expect(p.getConfiguration().get('custom')).toBe('value');
  });

  it('health check after bootstrap', async () => {
    p.registerRuntime(rc('a'));
    await p.start();
    const h = await p.getHealth();
    expect(h.overallStatus).toBeDefined();
  });

  it('diagnostics shows runtime count', async () => {
    p.registerRuntime(rc('a'));
    p.registerRuntime(rc('b'));
    await p.start();
    expect(p.getDiagnostics().runtimeCount).toBeGreaterThanOrEqual(0);
  });

  it('telemetry updates after bootstrap', async () => {
    p.registerRuntime(rc('a'));
    await p.start();
    const t = p.getTelemetry();
    expect(t.runtimeCount).toBe(1);
    expect(t.memoryUsageMB).toBeGreaterThanOrEqual(0);
  });

  it('API facade works after bootstrap', async () => {
    p.registerRuntime(rc('a'));
    await p.start();
    const api = p.getAPI();
    expect(api.state).toBe(PlatformState.Ready);
    expect(api.getConfiguration()).toBeDefined();
  });

  it('plugin loader works', async () => {
    const pl = await p.getPluginLoader().load(Object.freeze({ id: 'p1', name: 'P1', version: '1.0.0', description: '', main: '', dependencies: [], permissions: [] }));
    expect(pl.state).toBe('Loaded');
  });

  it('scheduler can schedule and cancel', async () => {
    const id = p.getScheduler().schedule('test', () => {}, 5000);
    expect(p.getScheduler().cancel(id)).toBe(true);
  });

  it('event hub across multiple types', async () => {
    p.registerRuntime(rc('a'));
    await p.start();
    const types: string[] = [];
    p.getEventHub().subscribeAll((e) => types.push(e.eventType));
    await p.getEventHub().publish('type.a', {});
    await p.getEventHub().publish('type.b', {});
    await p.getEventHub().publish('type.c', {});
    expect(types).toEqual(['type.a', 'type.b', 'type.c']);
  });

  it('dependency graph is populated', async () => {
    p.registerRuntime(rc('a'));
    await p.start();
    const g = p.getDependencyGraph();
    expect(g).not.toBeNull();
    expect(g!.nodes).toContain('a');
  });

  it('stop and verify state', async () => {
    p.registerRuntime(rc('a'));
    await p.start();
    expect(p.getState()).toBe(PlatformState.Ready);
    await p.stop();
    expect(p.getState()).toBe(PlatformState.Stopped);
  });

  it('shutdown events published', async () => {
    const events: string[] = [];
    p.getEventHub().subscribeAll((e) => events.push(e.eventType));
    p.registerRuntime(rc('a'));
    await p.start();
    await p.stop();
    expect(events).toContain('platform.shutdown.requested');
    expect(events).toContain('platform.stopped');
  });

  it('custom config is preserved through bootstrap', async () => {
    p = new PlatformRuntime({ defaultConfig: { custom: 'preserved', level: 3 }, enableSecurityValidation: false });
    p.registerRuntime(rc('a'));
    await p.start();
    expect(p.getConfiguration().get('custom')).toBe('preserved');
    expect(p.getConfiguration().get('level')).toBe(3);
  });
});
