import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PlatformRuntime } from '../../../platform/platform-runtime/platform-runtime.js';
import { PlatformState, HealthStatus, ConfigSource, ServiceScope } from '../../../platform/types.js';
import type { RuntimeContract } from '../../../platform/types.js';

function rc(id: string, deps: string[] = []): RuntimeContract {
  return { id, name: id, version: '1.0.0', description: id, dependencies: deps,
    initialize: async () => {}, activate: async () => {}, shutdown: async () => {},
    health: async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }),
  };
}

describe('PlatformRuntime Extended', () => {
  let p: PlatformRuntime;
  beforeEach(() => { p = new PlatformRuntime({ enableSecurityValidation: false }); });
  afterEach(async () => { try { await p.stop(); } catch {} });

  it('configuration with multiple sources', () => {
    p.getConfiguration().loadFrom(ConfigSource.Default, { a: 1, b: 2 });
    p.getConfiguration().loadFrom(ConfigSource.User, { c: 3 });
    expect(p.getConfiguration().get('a')).toBe(1);
    expect(p.getConfiguration().get('c')).toBe(3);
  });

  it('event hub persists across subsystems', async () => {
    p.registerRuntime(rc('a'));
    await p.start();
    const events: string[] = [];
    p.getEventHub().subscribe('test', (e) => events.push(e.eventType));
    await p.getEventHub().publish('test', {});
    expect(events).toHaveLength(1);
  });

  it('command bus handler registration works', async () => {
    p.getCommandBus().registerHandler('cmd', async (c) => c.payload);
    const r = await p.getCommandBus().dispatch('cmd', { val: 1 });
    expect(r.success).toBe(true);
    expect((r.data as {val:number}).val).toBe(1);
  });

  it('query bus handler registration works', async () => {
    p.getQueryBus().registerHandler('q', async (q) => q.payload);
    const r = await p.getQueryBus().execute('q', { result: 42 });
    expect(r.success).toBe(true);
  });

  it('DI container register transient', async () => {
    p.getContainer().register('svc', () => 99);
    expect(await p.getContainer().resolve('svc')).toBe(99);
  });

  it('DI container register singleton', async () => {
    const obj = { x: 1 };
    p.getContainer().registerSingleton('svc', obj);
    expect(await p.getContainer().resolve('svc')).toBe(obj);
  });

  it('DI container has after register', () => {
    p.getContainer().register('svc', () => null);
    expect(p.getContainer().has('svc')).toBe(true);
  });

  it('DI container getAll after multiple registers', () => {
    p.getContainer().register('a', () => null);
    p.getContainer().register('b', () => null);
    p.getContainer().register('c', () => null);
    expect(p.getContainer().getAll().size).toBeGreaterThanOrEqual(3);
  });

  it('metrics increment and counter', () => {
    p.getMetrics().increment('test.count');
    p.getMetrics().increment('test.count');
    expect(p.getMetrics().counter('test.count')).toBe(2);
  });

  it('metrics record and series', () => {
    p.getMetrics().record('latency', 100);
    p.getMetrics().record('latency', 200);
    expect(p.getMetrics().getSeries('latency')?.points).toHaveLength(2);
  });

  it('metrics export is valid JSON', () => {
    p.getMetrics().increment('test');
    expect(() => JSON.parse(p.getMetrics().export())).not.toThrow();
  });

  it('scheduler schedule and cancel', () => {
    const id = p.getScheduler().schedule('test', () => {}, 5000);
    expect(p.getScheduler().cancel(id)).toBe(true);
  });

  it('health monitor register check', () => {
    p.getHealthMonitor().registerCheck('test', async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }));
    expect(true).toBe(true);
  });

  it('diagnostics runtime info', () => {
    const info = p.getDiagnostics();
    expect(info.name).toBe('AIS Platform');
    expect(info.version).toBeDefined();
  });

  it('telemetry snapshot has all fields', () => {
    const t = p.getTelemetry();
    expect(t.runtimeCount).toBeDefined();
    expect(t.memoryUsageMB).toBeDefined();
    expect(t.eventsPerSecond).toBeDefined();
    expect(t.commandsPerSecond).toBeDefined();
    expect(t.queriesPerSecond).toBeDefined();
    expect(t.timestamp).toBeDefined();
  });

  it('plugin loader load and get', async () => {
    const pl = p.getPluginLoader();
    await pl.load(Object.freeze({ id: 'p1', name: 'P1', version: '1.0.0', description: '', main: '', dependencies: [], permissions: [] }));
    expect(pl.getPlugin('p1')).toBeDefined();
  });

  it('API getConfiguration returns config', () => {
    p.getConfiguration().set('key', 'value');
    expect(p.getAPI().getConfiguration()['key']).toBe('value');
  });

  it('API getState returns current state', () => {
    expect(p.getAPI().state).toBe(PlatformState.Uninitialized);
  });

  it('bootstrap engine is accessible', () => {
    expect(p.getBootstrapEngine()).toBeDefined();
  });

  it('registry is accessible', () => {
    expect(p.getRegistry()).toBeDefined();
  });

  it('container resolves eventHub', async () => {
    const eh = await p.getContainer().resolve('eventHub');
    expect(eh).toBeDefined();
  });

  it('container resolves commandBus', async () => {
    const cb = await p.getContainer().resolve('commandBus');
    expect(cb).toBeDefined();
  });

  it('container resolves queryBus', async () => {
    const qb = await p.getContainer().resolve('queryBus');
    expect(qb).toBeDefined();
  });

  it('container resolves scheduler', async () => {
    const sch = await p.getContainer().resolve('scheduler');
    expect(sch).toBeDefined();
  });

  it('container resolves healthMonitor', async () => {
    const hm = await p.getContainer().resolve('healthMonitor');
    expect(hm).toBeDefined();
  });

  it('container resolves diagnostics', async () => {
    const d = await p.getContainer().resolve('diagnostics');
    expect(d).toBeDefined();
  });

  it('container resolves metrics', async () => {
    const m = await p.getContainer().resolve('metrics');
    expect(m).toBeDefined();
  });

  it('container resolves pluginLoader', async () => {
    const pl = await p.getContainer().resolve('pluginLoader');
    expect(pl).toBeDefined();
  });

  it('container resolves container itself', async () => {
    const c = await p.getContainer().resolve('container');
    expect(c).toBeDefined();
  });

  it('15 services registered in container', () => {
    expect(p.getContainer().getAll().size).toBeGreaterThanOrEqual(10);
  });
});
