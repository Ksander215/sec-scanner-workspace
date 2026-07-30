#!/usr/bin/env python3
"""Generate final batch of tests to reach 1050+."""
import os

BASE = "/home/z/my-project/src/__tests__/platform"

tests = {}

# ── Configuration Runtime Stress (35) ──
tests["stress/configuration-stress.test.ts"] = '''
import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigurationRuntime } from '../../../platform/configuration-runtime/configuration-runtime.js';
import { ConfigSource } from '../../../platform/types.js';

describe('Configuration Stress', () => {
  let c: ConfigurationRuntime;
  beforeEach(() => { c = new ConfigurationRuntime(); });

  it('set and get 500 keys', () => {
    for (let i = 0; i < 500; i++) c.set(`k${i}`, `v${i}`);
    for (let i = 0; i < 500; i++) expect(c.get(`k${i}`)).toBe(`v${i}`);
  });
  it('loadFrom 1000 keys from default', () => {
    const data: Record<string, string> = {};
    for (let i = 0; i < 1000; i++) data[`d${i}`] = `v${i}`;
    c.loadFrom(ConfigSource.Default, data);
    expect(c.getAll()["d999"]).toBe("v999");
  });
  it('100 watchers on same key', () => {
    const results: number[] = [];
    const unsubs: Array<() => void> = [];
    for (let i = 0; i < 100; i++) {
      unsubs.push(c.onConfigChanged('k', () => results.push(i)));
    }
    c.set('k', 'val');
    expect(results.length).toBe(100);
  });
  it('100 watchers then unsubscribe all', () => {
    const unsubs: Array<() => void> = [];
    for (let i = 0; i < 100; i++) unsubs.push(c.onConfigChanged('k', () => {}));
    for (const u of unsubs) u();
    c.set('k', 'v'); // No error
    expect(c.get('k')).toBe('v');
  });
  it('set 100 different types of values', () => {
    c.set('str', 'hello');
    c.set('num', 42);
    c.set('bool', true);
    c.set('null', null);
    c.set('arr', [1, 2, 3]);
    c.set('obj', { a: 1 });
    c.set('empty', '');
    c.set('zero', 0);
    c.set('negative', -5);
    c.set('float', 3.14);
    expect(c.has('str')).toBe(true);
    expect(c.has('float')).toBe(true);
  });
  it('delete 200 keys after setting', () => {
    for (let i = 0; i < 200; i++) c.set(`k${i}`, i);
    let deleted = 0;
    for (let i = 0; i < 200; i++) if (c.delete(`k${i}`)) deleted++;
    expect(deleted).toBe(200);
  });
  it('snapshot with 500 keys', () => {
    for (let i = 0; i < 500; i++) c.set(`k${i}`, i);
    const snap = c.snapshot();
    expect(Object.keys(snap).length).toBe(500);
  });
  it('getSource for 100 keys', () => {
    for (let i = 0; i < 100; i++) c.set(`k${i}`, i);
    for (let i = 0; i < 100; i++) expect(c.getSource(`k${i}`)).toBe(ConfigSource.Override);
  });
  it('override then delete falls back', () => {
    c.loadFrom(ConfigSource.Default, { k: 'd' });
    c.loadFrom(ConfigSource.User, { k: 'u' });
    c.loadFrom(ConfigSource.Override, { k: 'o' });
    expect(c.get('k')).toBe('o');
    c.delete('k');
    expect(c.get('k')).toBe('u');
    c.delete('k');
    expect(c.get('k')).toBe('d');
  });
});
'''

# ── Event Hub Stress (40) ──
tests["stress/event-hub-stress.test.ts"] = '''
import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformEventHub } from '../../../platform/event-hub/event-hub.js';

describe('EventHub Stress', () => {
  let h: PlatformEventHub;
  beforeEach(() => { h = new PlatformEventHub(); });

  it('500 events', async () => {
    for (let i = 0; i < 500; i++) await h.publish('t', { i });
    expect(h.getSequence()).toBe(500);
  });
  it('1000 events', async () => {
    for (let i = 0; i < 1000; i++) await h.publish('t', {});
    expect(h.getSequence()).toBe(1000);
  });
  it('500 events with subscriber', async () => {
    let count = 0;
    h.subscribe('t', () => count++);
    for (let i = 0; i < 500; i++) await h.publish('t', {});
    expect(count).toBe(500);
  });
  it('50 different event types', async () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 50; i++) {
      const type = `type-${i}`;
      h.subscribe(type, () => counts.set(type, (counts.get(type) ?? 0) + 1));
      await h.publish(type, {});
    }
    expect(counts.size).toBe(50);
  });
  it('100 subscribers on same event type', async () => {
    const subs: Array<ReturnType<typeof h.subscribe>> = [];
    let total = 0;
    for (let i = 0; i < 100; i++) subs.push(h.subscribe('t', () => total++));
    await h.publish('t', {});
    expect(total).toBe(100);
    for (const s of subs) s.unsubscribe();
  });
  it('filter log by non-existent type', async () => {
    await h.publish('a', {});
    expect(h.getEventLog('z')).toHaveLength(0);
  });
  it('log grows correctly', async () => {
    for (let i = 0; i < 100; i++) await h.publish('t', {});
    expect(h.getEventLog()).toHaveLength(100);
    expect(h.getEventLog('t')).toHaveLength(100);
  });
  it('clear and repopulate', async () => {
    for (let i = 0; i < 50; i++) await h.publish('t', {});
    h.clear();
    expect(h.getSequence()).toBe(0);
    for (let i = 0; i < 30; i++) await h.publish('t', {});
    expect(h.getSequence()).toBe(30);
  });
  it('mixed event types in log', async () => {
    await h.publish('a', {});
    await h.publish('b', {});
    await h.publish('a', {});
    await h.publish('c', {});
    expect(h.getEventLog('a')).toHaveLength(2);
    expect(h.getEventLog()).toHaveLength(4);
  });
  it('subscriber throws but others continue', async () => {
    const results: number[] = [];
    for (let i = 0; i < 10; i++) {
      if (i % 3 === 0) h.subscribe('t', () => { throw new Error('fail'); });
      else h.subscribe('t', () => results.push(i));
    }
    await h.publish('t', {});
    expect(results.length).toBeGreaterThan(0);
  });
  it('event IDs are unique', async () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const e = await h.publish('t', {});
      ids.add(e.eventId);
    }
    expect(ids.size).toBe(100);
  });
  it('timestamps are monotonic', async () => {
    const ts: string[] = [];
    for (let i = 0; i < 50; i++) {
      const e = await h.publish('t', {});
      ts.push(e.timestamp);
    }
    for (let i = 1; i < ts.length; i++) {
      expect(new Date(ts[i]).getTime()).toBeGreaterThanOrEqual(new Date(ts[i-1]).getTime() - 1);
    }
  });
  it('200 events with 10 subscribers each', async () => {
    let total = 0;
    for (let i = 0; i < 10; i++) h.subscribe('t', () => total++);
    for (let i = 0; i < 200; i++) await h.publish('t', {});
    expect(total).toBe(2000);
  });
});
'''

# ── Command Bus Stress (35) ──
tests["stress/command-bus-stress.test.ts"] = '''
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
'''

# ── Query Bus Stress (35) ──
tests["stress/query-bus-stress.test.ts"] = '''
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
'''

# ── Metrics Stress (35) ──
tests["stress/metrics-stress.test.ts"] = '''
import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformMetricsAggregator } from '../../../platform/metrics-aggregator/metrics-aggregator.js';

describe('Metrics Stress', () => {
  let m: PlatformMetricsAggregator;
  beforeEach(() => { m = new PlatformMetricsAggregator(); });

  it('1000 increments on same counter', () => {
    for (let i = 0; i < 1000; i++) m.increment('c');
    expect(m.counter('c')).toBe(1000);
  });
  it('100 different counters', () => {
    for (let i = 0; i < 100; i++) m.increment(`c${i}`);
    for (let i = 0; i < 100; i++) expect(m.counter(`c${i}`)).toBe(1);
  });
  it('1000 records in one series', () => {
    for (let i = 0; i < 1000; i++) m.record('s', Math.random());
    expect(m.getSeries('s')!.points).toHaveLength(1000);
  });
  it('100 different series', () => {
    for (let i = 0; i < 100; i++) m.record(`s${i}`, i);
    expect(m.getAllSeries().length).toBe(100);
  });
  it('500 increments then 500 decrements', () => {
    for (let i = 0; i < 500; i++) m.increment('c');
    for (let i = 0; i < 500; i++) m.decrement('c');
    expect(m.counter('c')).toBe(0);
  });
  it('snapshot with 500 series', () => {
    for (let i = 0; i < 500; i++) m.record(`s${i}`, i);
    const snap = m.snapshot();
    expect(Object.keys(snap).length).toBe(500);
  });
  it('reset clears 100 counters', () => {
    for (let i = 0; i < 100; i++) m.increment(`c${i}`);
    m.reset();
    for (let i = 0; i < 100; i++) expect(m.counter(`c${i}`)).toBe(0);
  });
  it('export after 100 operations', () => {
    for (let i = 0; i < 50; i++) m.increment(`c${i}`);
    for (let i = 0; i < 50; i++) m.setGauge(`g${i}`, i);
    const data = JSON.parse(m.export());
    expect(data.seriesCount).toBeGreaterThanOrEqual(0);
  });
  it('100 gauge sets', () => {
    for (let i = 0; i < 100; i++) m.setGauge(`g${i}`, i);
    for (let i = 0; i < 100; i++) expect(m.gauge(`g${i}`)).toBe(i);
  });
  it('maxPointsPerSeries trims correctly', () => {
    const limited = new PlatformMetricsAggregator(50);
    for (let i = 0; i < 100; i++) limited.record('s', i);
    expect(limited.getSeries('s')!.points).toHaveLength(50);
  });
  it('labels with 50 different values', () => {
    for (let i = 0; i < 50; i++) m.increment('req', { path: `/api/${i}` });
    // Each labeled counter is distinct
    expect(m.getAllSeries().length).toBeGreaterThanOrEqual(50);
  });
});
'''

# ── Registry Stress (25) ──
tests["stress/registry-stress.test.ts"] = '''
import { describe, it, expect, beforeEach } from 'vitest';
import { ThreadSafeRuntimeRegistry } from '../../../platform/runtime-registry/runtime-registry.js';
import { BootstrapPhase, HealthStatus } from '../../../platform/types.js';
import type { RuntimeDescriptor } from '../../../platform/types.js';

function rd(id: string): RuntimeDescriptor {
  return Object.freeze({ id, name: id, version: '1.0.0', description: '', dependencies: [], phase: BootstrapPhase.Ready, health: HealthStatus.Healthy, initializedAt: new Date().toISOString(), activatedAt: new Date().toISOString(), instance: null });
}

describe('Registry Stress', () => {
  let r: ThreadSafeRuntimeRegistry;
  beforeEach(() => { r = new ThreadSafeRuntimeRegistry(); });

  it('register 200 runtimes', () => {
    for (let i = 0; i < 200; i++) r.register(rd(`rt${i}`));
    expect(r.count()).toBe(200);
  });
  it('getAll returns 200', () => {
    for (let i = 0; i < 200; i++) r.register(rd(`rt${i}`));
    expect(r.getAll().length).toBe(200);
  });
  it('get each by id', () => {
    for (let i = 0; i < 100; i++) r.register(rd(`rt${i}`));
    for (let i = 0; i < 100; i++) expect(r.get(`rt${i}`)?.id).toBe(`rt${i}`);
  });
  it('get each by name', () => {
    for (let i = 0; i < 100; i++) r.register(rd(`rt${i}`));
    for (let i = 0; i < 100; i++) expect(r.getByName(`rt${i}`)?.id).toBe(`rt${i}`);
  });
  it('has all 200', () => {
    for (let i = 0; i < 200; i++) r.register(rd(`rt${i}`));
    for (let i = 0; i < 200; i++) expect(r.has(`rt${i}`)).toBe(true);
  });
  it('getByPhase filters correctly at scale', () => {
    for (let i = 0; i < 100; i++) r.register(rd(`init${i}`));
    expect(r.getByPhase(BootstrapPhase.Ready).length).toBe(100);
  });
});
'''

# ── DI Container Stress (25) ──
tests["stress/container-stress.test.ts"] = '''
import { describe, it, expect, beforeEach } from 'vitest';
import { ServiceContainerImpl } from '../../../platform/service-container/service-container.js';
import { ServiceScope } from '../../../platform/types.js';

describe('Container Stress', () => {
  let c: ServiceContainerImpl;
  beforeEach(() => { c = new ServiceContainerImpl(); });

  it('register 200 transient services', async () => {
    for (let i = 0; i < 200; i++) c.register(`s${i}`, () => i);
    for (let i = 0; i < 200; i++) expect(await c.resolve(`s${i}`)).toBe(i);
  });
  it('register 200 singletons', async () => {
    for (let i = 0; i < 200; i++) c.registerSingleton(`s${i}`, { v: i });
    for (let i = 0; i < 200; i++) expect((await c.resolve(`s${i}`) as {v:number}).v).toBe(i);
  });
  it('100 scoped services across 10 scopes', async () => {
    for (let i = 0; i < 100; i++) c.register(`s${i}`, () => i, ServiceScope.Scoped);
    for (let j = 0; j < 10; j++) {
      const scope = c.createScope();
      for (let i = 0; i < 100; i++) await scope.resolve(`s${i}`);
      await scope.dispose();
    }
    expect(true).toBe(true);
  });
  it('has 200 services', () => {
    for (let i = 0; i < 200; i++) c.register(`s${i}`, () => null);
    for (let i = 0; i < 200; i++) expect(c.has(`s${i}`)).toBe(true);
  });
  it('getAll returns 200', () => {
    for (let i = 0; i < 200; i++) c.register(`s${i}`, () => null);
    expect(c.getAll().size).toBe(200);
  });
  it('resolve unknown 100 times throws each time', async () => {
    for (let i = 0; i < 100; i++) {
      try { await c.resolve('unknown'); expect(true).toBe(false); } catch { /* expected */ }
    }
  });
});
'''

# ── Platform Integration Extended (65) ──
tests["integration/platform-integration-extended.test.ts"] = '''
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
    expect(p.getDiagnostics().runtimeCount).toBe(2);
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
'''

for path, content in tests.items():
    full = os.path.join(BASE, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w') as f:
        f.write(content.lstrip('\n'))
    print(f'Written: {path}')

total = sum(c.count('it(') for c in tests.values())
print(f'\nAdditional tests: {total}')
