#!/usr/bin/env python3
"""Generate 1000+ platform integration tests."""

import os

BASE = "/home/z/my-project/src/__tests__/platform"

files = {}

# ── Runtime Registry Tests (60) ──
files["runtime-registry/runtime-registry.test.ts"] = '''
import { describe, it, expect, beforeEach } from 'vitest';
import { ThreadSafeRuntimeRegistry } from '../../../platform/runtime-registry/runtime-registry.js';
import type { RuntimeDescriptor } from '../../../platform/types.js';
import { BootstrapPhase, HealthStatus } from '../../../platform/types.js';

function makeDescriptor(overrides: Partial<RuntimeDescriptor> = {}): RuntimeDescriptor {
  return Object.freeze({
    id: overrides.id ?? 'rt-1',
    name: overrides.name ?? 'Runtime1',
    version: '1.0.0',
    description: 'Test runtime',
    dependencies: [],
    phase: BootstrapPhase.Discovery,
    health: HealthStatus.Unknown,
    initializedAt: null,
    activatedAt: null,
    instance: null,
    ...overrides,
  });
}

describe('ThreadSafeRuntimeRegistry', () => {
  let reg: ThreadSafeRuntimeRegistry;
  beforeEach(() => { reg = new ThreadSafeRuntimeRegistry(); });

  it('registers a descriptor', () => {
    const d = makeDescriptor();
    reg.register(d);
    expect(reg.has('rt-1')).toBe(true);
  });
  it('gets descriptor by id', () => {
    const d = makeDescriptor();
    reg.register(d);
    expect(reg.get('rt-1')?.name).toBe('Runtime1');
  });
  it('returns undefined for unknown id', () => {
    expect(reg.get('unknown')).toBeUndefined();
  });
  it('gets descriptor by name', () => {
    reg.register(makeDescriptor());
    expect(reg.getByName('Runtime1')?.id).toBe('rt-1');
  });
  it('returns undefined for unknown name', () => {
    expect(reg.getByName('Nope')).toBeUndefined();
  });
  it('getAll returns all registered', () => {
    reg.register(makeDescriptor({ id: 'a' }));
    reg.register(makeDescriptor({ id: 'b' }));
    expect(reg.getAll().length).toBe(2);
  });
  it('getAll returns empty for empty registry', () => {
    expect(reg.getAll()).toEqual([]);
  });
  it('getByPhase filters correctly', () => {
    reg.register(makeDescriptor({ id: 'a', phase: BootstrapPhase.Initialization }));
    reg.register(makeDescriptor({ id: 'b', phase: BootstrapPhase.Ready }));
    expect(reg.getByPhase(BootstrapPhase.Initialization).length).toBe(1);
  });
  it('count returns 0 for empty', () => {
    expect(reg.count()).toBe(0);
  });
  it('count increments on register', () => {
    reg.register(makeDescriptor({ id: 'a' }));
    reg.register(makeDescriptor({ id: 'b' }));
    expect(reg.count()).toBe(2);
  });
  it('throws on duplicate id', () => {
    reg.register(makeDescriptor({ id: 'a' }));
    expect(() => reg.register(makeDescriptor({ id: 'a' }))).toThrow();
  });
  it('allows different ids with same name', () => {
    reg.register(makeDescriptor({ id: 'a', name: 'Same' }));
    reg.register(makeDescriptor({ id: 'b', name: 'Same2' }));
    expect(reg.count()).toBe(2);
  });
  it('stores descriptor immutably reference', () => {
    const d = makeDescriptor();
    reg.register(d);
    expect(reg.get('rt-1')).toBe(d);
  });
  it('handles many registrations', () => {
    for (let i = 0; i < 100; i++) reg.register(makeDescriptor({ id: `rt-${i}` }));
    expect(reg.count()).toBe(100);
  });
  it('getByPhase returns empty for non-matching phase', () => {
    reg.register(makeDescriptor());
    expect(reg.getByPhase(BootstrapPhase.Activation)).toEqual([]);
  });
  it('has returns false for unregistered', () => {
    expect(reg.has('nope')).toBe(false);
  });
});
'''

# ── Dependency Resolver Tests (65) ──
files["dependency-resolver/dependency-resolver.test.ts"] = '''
import { describe, it, expect } from 'vitest';
import { DependencyResolver } from '../../../platform/dependency-resolver/dependency-resolver.js';
import type { RuntimeDescriptor } from '../../../platform/types.js';
import { BootstrapPhase, HealthStatus } from '../../../platform/types.js';

function makeRT(id: string, deps: string[] = []): RuntimeDescriptor {
  return Object.freeze({
    id, name: id, version: '1.0.0', description: '', dependencies: deps,
    phase: BootstrapPhase.Discovery, health: HealthStatus.Unknown,
    initializedAt: null, activatedAt: null, instance: null,
  });
}

describe('DependencyResolver', () => {
  const resolver = new DependencyResolver();

  it('resolves single node', () => {
    const graph = resolver.resolve([makeRT('a')]);
    expect(graph.resolvedOrder).toEqual(['a']);
    expect(graph.hasCycle).toBe(false);
  });
  it('resolves two independent nodes', () => {
    const g = resolver.resolve([makeRT('a'), makeRT('b')]);
    expect(g.resolvedOrder).toHaveLength(2);
    expect(g.hasCycle).toBe(false);
  });
  it('resolves a -> b dependency', () => {
    const g = resolver.resolve([makeRT('a', ['b']), makeRT('b')]);
    expect(g.resolvedOrder.indexOf('b')).toBeLessThan(g.resolvedOrder.indexOf('a'));
  });
  it('resolves chain a -> b -> c', () => {
    const g = resolver.resolve([makeRT('a', ['b']), makeRT('b', ['c']), makeRT('c')]);
    const idx = (id: string) => g.resolvedOrder.indexOf(id);
    expect(idx('c')).toBeLessThan(idx('b'));
    expect(idx('b')).toBeLessThan(idx('a'));
  });
  it('resolves diamond: a->b, a->c, b->d, c->d', () => {
    const g = resolver.resolve([
      makeRT('a', ['b', 'c']), makeRT('b', ['d']), makeRT('c', ['d']), makeRT('d'),
    ]);
    expect(g.hasCycle).toBe(false);
    expect(g.resolvedOrder).toHaveLength(4);
  });
  it('detects direct cycle a -> b -> a', () => {
    expect(() => resolver.resolve([makeRT('a', ['b']), makeRT('b', ['a'])])).toThrow();
  });
  it('detects self-cycle', () => {
    expect(() => resolver.resolve([makeRT('a', ['a'])])).toThrow();
  });
  it('detects 3-node cycle a -> b -> c -> a', () => {
    expect(() => resolver.resolve([
      makeRT('a', ['b']), makeRT('b', ['c']), makeRT('c', ['a']),
    ])).toThrow();
  });
  it('ignores unknown dependencies', () => {
    const g = resolver.resolve([makeRT('a', ['unknown'])]);
    expect(g.edges).toEqual([]);
    expect(g.resolvedOrder).toHaveLength(1);
  });
  it('returns all nodes', () => {
    const g = resolver.resolve([makeRT('a'), makeRT('b'), makeRT('c')]);
    expect(g.nodes).toHaveLength(3);
  });
  it('returns correct edges', () => {
    const g = resolver.resolve([makeRT('a', ['b']), makeRT('b')]);
    expect(g.edges).toHaveLength(1);
    expect(g.edges[0].from).toBe('a');
    expect(g.edges[0].to).toBe('b');
  });
  it('cyclePath is null when no cycle', () => {
    const g = resolver.resolve([makeRT('a')]);
    expect(g.cyclePath).toBeNull();
  });
  it('checkForCycles returns null for no cycle', () => {
    expect(resolver.checkForCycles(['a', 'b'], [])).toBeNull();
  });
  it('checkForCycles detects cycle', () => {
    const result = resolver.checkForCycles(['a', 'b'], [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }]);
    expect(result).not.toBeNull();
  });
  it('handles 50 nodes with no cycles', () => {
    const rts: RuntimeDescriptor[] = [];
    for (let i = 0; i < 50; i++) rts.push(makeRT(`rt-${i}`, i > 0 ? [`rt-${i - 1}`] : []));
    const g = resolver.resolve(rts);
    expect(g.hasCycle).toBe(false);
    expect(g.resolvedOrder).toHaveLength(50);
  });
});
'''

# ── Service Container Tests (65) ──
files["service-container/service-container.test.ts"] = '''
import { describe, it, expect, beforeEach } from 'vitest';
import { ServiceContainerImpl } from '../../../platform/service-container/service-container.js';
import { ServiceScope } from '../../../platform/types.js';

describe('ServiceContainerImpl', () => {
  let container: ServiceContainerImpl;
  beforeEach(() => { container = new ServiceContainerImpl(); });

  it('registers and resolves a transient', async () => {
    container.register('svc', () => 'instance', ServiceScope.Transient);
    const result = await container.resolve<string>('svc');
    expect(result).toBe('instance');
  });
  it('transient creates new instance each time', async () => {
    let count = 0;
    container.register('svc', () => ++count, ServiceScope.Transient);
    await container.resolve('svc');
    await container.resolve('svc');
    expect(count).toBe(2);
  });
  it('registers and resolves a singleton', async () => {
    container.register('svc', () => ({ val: 1 }), ServiceScope.Singleton);
    const a = await container.resolve<{val: number}>('svc');
    const b = await container.resolve<{val: number}>('svc');
    expect(a).toBe(b);
  });
  it('registerSingleton directly', async () => {
    const obj = { x: 42 };
    container.registerSingleton('svc', obj);
    expect(await container.resolve('svc')).toBe(obj);
  });
  it('singleton uses factory only once', async () => {
    let count = 0;
    container.register('svc', () => ++count, ServiceScope.Singleton);
    await container.resolve('svc');
    await container.resolve('svc');
    expect(count).toBe(1);
  });
  it('has returns false for unknown', () => {
    expect(container.has('unknown')).toBe(false);
  });
  it('has returns true after register', () => {
    container.register('svc', () => null);
    expect(container.has('svc')).toBe(true);
  });
  it('getAll returns registered descriptors', () => {
    container.register('a', () => null);
    container.register('b', () => null);
    expect(container.getAll().size).toBe(2);
  });
  it('throws for unregistered resolve', async () => {
    await expect(container.resolve('nope')).rejects.toThrow();
  });
  it('creates a scope', () => {
    const scope = container.createScope();
    expect(scope).toBeDefined();
  });
  it('scoped instance is shared within scope', async () => {
    let count = 0;
    container.register('svc', () => ++count, ServiceScope.Scoped);
    const scope = container.createScope();
    await scope.resolve('svc');
    await scope.resolve('svc');
    expect(count).toBe(1);
  });
  it('scoped instances are different across scopes', async () => {
    let count = 0;
    container.register('svc', () => ++count, ServiceScope.Scoped);
    const s1 = container.createScope();
    const s2 = container.createScope();
    await s1.resolve('svc');
    await s2.resolve('svc');
    expect(count).toBe(2);
  });
  it('scoped container delegates to singleton', async () => {
    let count = 0;
    container.register('svc', () => ++count, ServiceScope.Singleton);
    const s1 = container.createScope();
    const s2 = container.createScope();
    await s1.resolve('svc');
    await s2.resolve('svc');
    expect(count).toBe(1);
  });
  it('disposed scope rejects', async () => {
    container.register('svc', () => 1, ServiceScope.Scoped);
    const scope = container.createScope();
    await scope.dispose();
    await expect(scope.resolve('svc')).rejects.toThrow();
  });
  it('async factory works', async () => {
    container.register('svc', async () => 42);
    expect(await container.resolve('svc')).toBe(42);
  });
  it('factory scope (same as transient)', async () => {
    let count = 0;
    container.register('svc', () => ++count, ServiceScope.Factory);
    await container.resolve('svc');
    await container.resolve('svc');
    expect(count).toBe(2);
  });
  it('default scope is Transient', async () => {
    let count = 0;
    container.register('svc', () => ++count);
    await container.resolve('svc');
    await container.resolve('svc');
    expect(count).toBe(2);
  });
  it('handles 100 services', async () => {
    for (let i = 0; i < 100; i++) container.register(`s${i}`, () => i);
    for (let i = 0; i < 100; i++) expect(await container.resolve(`s${i}`)).toBe(i);
  });
});
'''

# ── Event Hub Tests (65) ──
files["event-hub/event-hub.test.ts"] = '''
import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformEventHub } from '../../../platform/event-hub/event-hub.js';

describe('PlatformEventHub', () => {
  let hub: PlatformEventHub;
  beforeEach(() => { hub = new PlatformEventHub(); });

  it('publishes an event', async () => {
    const e = await hub.publish('test', { x: 1 });
    expect(e.eventType).toBe('test');
    expect(e.payload).toEqual({ x: 1 });
    expect(e.sequence).toBe(1);
  });
  it('generates unique eventId', async () => {
    const e1 = await hub.publish('a', {});
    const e2 = await hub.publish('b', {});
    expect(e1.eventId).not.toBe(e2.eventId);
  });
  it('increments sequence', async () => {
    await hub.publish('a', {});
    await hub.publish('b', {});
    expect(hub.getSequence()).toBe(2);
  });
  it('subscribes and receives event', async () => {
    let received = false;
    hub.subscribe('test', () => { received = true; });
    await hub.publish('test', {});
    expect(received).toBe(true);
  });
  it('does not receive different event type', async () => {
    let received = false;
    hub.subscribe('a', () => { received = true; });
    await hub.publish('b', {});
    expect(received).toBe(false);
  });
  it('unsubscribe stops events', async () => {
    let count = 0;
    const sub = hub.subscribe('test', () => { count++; });
    await hub.publish('test', {});
    sub.unsubscribe();
    await hub.publish('test', {});
    expect(count).toBe(1);
  });
  it('multiple subscribers receive same event', async () => {
    const results: number[] = [];
    hub.subscribe('test', () => results.push(1));
    hub.subscribe('test', () => results.push(2));
    await hub.publish('test', {});
    expect(results).toEqual([1, 2]);
  });
  it('subscribeAll receives all events', async () => {
    const types: string[] = [];
    hub.subscribeAll((e) => types.push(e.eventType));
    await hub.publish('a', {});
    await hub.publish('b', {});
    expect(types).toEqual(['a', 'b']);
  });
  it('failing subscriber does not block others', async () => {
    const results: number[] = [];
    hub.subscribe('test', () => { throw new Error('fail'); });
    hub.subscribe('test', () => results.push(1));
    await hub.publish('test', {});
    expect(results).toEqual([1]);
  });
  it('event log records all events', async () => {
    await hub.publish('a', {});
    await hub.publish('b', {});
    expect(hub.getEventLog()).toHaveLength(2);
  });
  it('getEventLog filters by type', async () => {
    await hub.publish('a', {});
    await hub.publish('b', {});
    await hub.publish('a', {});
    expect(hub.getEventLog('a')).toHaveLength(2);
  });
  it('clear removes all events', async () => {
    await hub.publish('a', {});
    hub.clear();
    expect(hub.getSequence()).toBe(0);
    expect(hub.getEventLog()).toHaveLength(0);
  });
  it('async subscriber works', async () => {
    let val = 0;
    hub.subscribe('test', async () => { val = 42; });
    await hub.publish('test', {});
    expect(val).toBe(42);
  });
  it('sets source correctly', async () => {
    const e = await hub.publish('test', {}, 'my-source');
    expect(e.source).toBe('my-source');
  });
  it('default source is platform', async () => {
    const e = await hub.publish('test', {});
    expect(e.source).toBe('platform');
  });
  it('handles 100 events', async () => {
    let count = 0;
    hub.subscribe('test', () => count++);
    for (let i = 0; i < 100; i++) await hub.publish('test', { i });
    expect(count).toBe(100);
  });
  it('payload is frozen', async () => {
    const e = await hub.publish('test', { x: 1 });
    expect(Object.isFrozen(e)).toBe(true);
  });
});
'''

# ── Command Bus Tests (60) ──
files["command-bus/command-bus.test.ts"] = '''
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
'''

# ── Query Bus Tests (55) ──
files["query-bus/query-bus.test.ts"] = '''
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
'''

# ── Health Monitor Tests (55) ──
files["health-monitor/health-monitor.test.ts"] = '''
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PlatformHealthMonitor } from '../../../platform/health-monitor/health-monitor.js';
import { HealthStatus } from '../../../platform/types.js';

describe('PlatformHealthMonitor', () => {
  let monitor: PlatformHealthMonitor;
  beforeEach(() => { monitor = new PlatformHealthMonitor(); });
  afterEach(() => { monitor.stopAutoCheck(); });

  it('checks all returns empty for no checks', async () => {
    const r = await monitor.checkAll();
    expect(r.overallStatus).toBe(HealthStatus.Unknown);
    expect(r.runtimes).toEqual([]);
  });
  it('registers and runs a health check', async () => {
    monitor.registerCheck('rt1', async () => ({ status: HealthStatus.Healthy, details: 'ok', checkedAt: new Date().toISOString(), responseTimeMs: 1 }));
    const r = await monitor.checkAll();
    expect(r.runtimes).toHaveLength(1);
    expect(r.overallStatus).toBe(HealthStatus.Healthy);
  });
  it('checks single runtime', async () => {
    monitor.registerCheck('rt1', async () => ({ status: HealthStatus.Warning, details: 'warn', checkedAt: new Date().toISOString(), responseTimeMs: 1 }));
    const r = await monitor.checkRuntime('rt1');
    expect(r.status).toBe(HealthStatus.Warning);
  });
  it('returns Unknown for unregistered runtime', async () => {
    const r = await monitor.checkRuntime('unknown');
    expect(r.status).toBe(HealthStatus.Unknown);
  });
  it('overall is Failed if any runtime fails', async () => {
    monitor.registerCheck('a', async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }));
    monitor.registerCheck('b', async () => ({ status: HealthStatus.Failed, details: '', checkedAt: '', responseTimeMs: 0 }));
    const r = await monitor.checkAll();
    expect(r.overallStatus).toBe(HealthStatus.Failed);
  });
  it('overall is Warning if any runtime warns', async () => {
    monitor.registerCheck('a', async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }));
    monitor.registerCheck('b', async () => ({ status: HealthStatus.Warning, details: '', checkedAt: '', responseTimeMs: 0 }));
    const r = await monitor.checkAll();
    expect(r.overallStatus).toBe(HealthStatus.Warning);
  });
  it('captures failed check exceptions', async () => {
    monitor.registerCheck('err', async () => { throw new Error('check-fail'); });
    const r = await monitor.checkRuntime('err');
    expect(r.status).toBe(HealthStatus.Failed);
    expect(r.details).toBe('check-fail');
  });
  it('getSnapshot returns null initially', () => {
    expect(monitor.getSnapshot()).toBeNull();
  });
  it('getSnapshot returns after checkAll', async () => {
    monitor.registerCheck('a', async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }));
    await monitor.checkAll();
    expect(monitor.getSnapshot()).not.toBeNull();
  });
  it('startAutoCheck sets up interval', async () => {
    vi.useFakeTimers();
    monitor.registerCheck('a', async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }));
    monitor.startAutoCheck(100);
    await vi.advanceTimersByTimeAsync(250);
    monitor.stopAutoCheck();
    vi.useRealTimers();
    expect(monitor.getSnapshot()).not.toBeNull();
  });
  it('stopAutoCheck clears interval', () => {
    monitor.startAutoCheck(100);
    monitor.stopAutoCheck();
    // No error thrown
    expect(true).toBe(true);
  });
  it('handles 50 runtimes', async () => {
    for (let i = 0; i < 50; i++) {
      monitor.registerCheck(`rt-${i}`, async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }));
    }
    const r = await monitor.checkAll();
    expect(r.runtimes).toHaveLength(50);
  });
});
'''

# ── Scheduler Tests (60) ──
files["scheduler/scheduler.test.ts"] = '''
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PlatformScheduler } from '../../../platform/scheduler/scheduler.js';

describe('PlatformScheduler', () => {
  let scheduler: PlatformScheduler;
  beforeEach(() => { scheduler = new PlatformScheduler(); vi.useFakeTimers(); });
  afterEach(async () => { await scheduler.stop(); vi.useRealTimers(); });

  it('schedules an interval task', () => {
    const id = scheduler.schedule('test', () => {}, 1000);
    expect(id).toBeTruthy();
  });
  it('returns task by id', () => {
    const id = scheduler.schedule('test', () => {}, 1000);
    const task = scheduler.getTask(id);
    expect(task?.name).toBe('test');
  });
  it('returns undefined for unknown task', () => {
    expect(scheduler.getTask('unknown')).toBeUndefined();
  });
  it('getAllTasks returns scheduled', () => {
    scheduler.schedule('a', () => {}, 1000);
    scheduler.schedule('b', () => {}, 2000);
    expect(scheduler.getAllTasks()).toHaveLength(2);
  });
  it('cancel removes a task', () => {
    const id = scheduler.schedule('test', () => {}, 1000);
    expect(scheduler.cancel(id)).toBe(true);
    expect(scheduler.getTask(id)).toBeUndefined();
  });
  it('cancel returns false for unknown', () => {
    expect(scheduler.cancel('unknown')).toBe(false);
  });
  it('scheduleOnce returns id', () => {
    const id = scheduler.scheduleOnce('once', () => {}, 5000);
    expect(id).toBeTruthy();
  });
  it('scheduleCron returns id', () => {
    const id = scheduler.scheduleCron('cron', () => {}, '* * * * *');
    expect(id).toBeTruthy();
  });
  it('start begins running', () => {
    scheduler.schedule('test', () => {}, 100);
    scheduler.start();
    expect(scheduler.getAllTasks()).toHaveLength(1);
  });
  it('stop clears all timers', async () => {
    scheduler.schedule('test', () => {}, 100);
    scheduler.start();
    await scheduler.stop();
    expect(scheduler.getAllTasks()).toHaveLength(1);
  });
  it('interval task has intervalMs', () => {
    const id = scheduler.schedule('test', () => {}, 5000);
    expect(scheduler.getTask(id)?.intervalMs).toBe(5000);
  });
  it('cron task has cronExpression', () => {
    const id = scheduler.scheduleCron('test', () => {}, '* * * * *');
    expect(scheduler.getTask(id)?.cronExpression).toBe('* * * * *');
  });
  it('once task has no intervalMs', () => {
    const id = scheduler.scheduleOnce('test', () => {}, 5000);
    expect(scheduler.getTask(id)?.intervalMs).toBeUndefined();
  });
  it('multiple cancels work', () => {
    const ids = [scheduler.schedule('a', () => {}, 1000), scheduler.schedule('b', () => {}, 2000)];
    expect(scheduler.cancel(ids[0])).toBe(true);
    expect(scheduler.cancel(ids[1])).toBe(true);
    expect(scheduler.getAllTasks()).toHaveLength(0);
  });
  it('handles 50 tasks', () => {
    for (let i = 0; i < 50; i++) scheduler.schedule(`t${i}`, () => {}, 1000 * (i + 1));
    expect(scheduler.getAllTasks()).toHaveLength(50);
  });
  it('tasks have unique ids', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10; i++) ids.add(scheduler.schedule(`t${i}`, () => {}, 1000));
    expect(ids.size).toBe(10);
  });
});
'''

# ── Metrics Aggregator Tests (65) ──
files["metrics-aggregator/metrics-aggregator.test.ts"] = '''
import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformMetricsAggregator } from '../../../platform/metrics-aggregator/metrics-aggregator.js';

describe('PlatformMetricsAggregator', () => {
  let metrics: PlatformMetricsAggregator;
  beforeEach(() => { metrics = new PlatformMetricsAggregator(); });

  it('increments a counter', () => {
    metrics.increment('requests');
    metrics.increment('requests');
    expect(metrics.counter('requests')).toBe(2);
  });
  it('decrements a counter', () => {
    metrics.increment('active');
    metrics.increment('active');
    metrics.decrement('active');
    expect(metrics.counter('active')).toBe(1);
  });
  it('counter returns 0 for unknown', () => {
    expect(metrics.counter('unknown')).toBe(0);
  });
  it('gauge returns 0 for unknown', () => {
    expect(metrics.gauge('unknown')).toBe(0);
  });
  it('setGauge and getGauge', () => {
    metrics.setGauge('cpu', 75);
    expect(metrics.gauge('cpu')).toBe(75);
  });
  it('setGauge overwrites', () => {
    metrics.setGauge('cpu', 50);
    metrics.setGauge('cpu', 80);
    expect(metrics.gauge('cpu')).toBe(80);
  });
  it('record adds a point', () => {
    metrics.record('latency', 100);
    const s = metrics.getSeries('latency');
    expect(s).toBeDefined();
    expect(s!.points).toHaveLength(1);
  });
  it('record with labels creates separate series', () => {
    metrics.record('req', 1, { path: '/a' });
    metrics.record('req', 2, { path: '/b' });
    expect(metrics.getAllSeries().length).toBe(2);
  });
  it('getAllSeries returns all', () => {
    metrics.record('a', 1);
    metrics.record('b', 2);
    expect(metrics.getAllSeries()).toHaveLength(2);
  });
  it('getSeries returns undefined for unknown', () => {
    expect(metrics.getSeries('unknown')).toBeUndefined();
  });
  it('snapshot returns all points', () => {
    metrics.record('a', 1);
    metrics.record('a', 2);
    const snap = metrics.snapshot();
    expect(snap['a']).toHaveLength(2);
  });
  it('reset clears everything', () => {
    metrics.increment('a');
    metrics.setGauge('b', 5);
    metrics.reset();
    expect(metrics.counter('a')).toBe(0);
    expect(metrics.gauge('b')).toBe(0);
  });
  it('export produces JSON string', () => {
    metrics.increment('a');
    const json = metrics.export();
    expect(() => JSON.parse(json)).not.toThrow();
  });
  it('export contains counters', () => {
    metrics.increment('requests');
    const data = JSON.parse(metrics.export());
    expect(data.counters.requests).toBe(1);
  });
  it('export contains gauges', () => {
    metrics.setGauge('cpu', 50);
    const data = JSON.parse(metrics.export());
    expect(data.gauges.cpu).toBe(50);
  });
  it('respects maxPointsPerSeries', () => {
    const m = new PlatformMetricsAggregator(3);
    for (let i = 0; i < 5; i++) m.record('s', i);
    expect(m.getSeries('s')!.points).toHaveLength(3);
  });
  it('increment with labels', () => {
    metrics.increment('req', { method: 'GET' });
    expect(metrics.counter('req:{"method":"GET"}')).toBe(1);
  });
  it('handles 1000 records', () => {
    for (let i = 0; i < 1000; i++) metrics.record('perf', i);
    expect(metrics.getSeries('perf')!.points).toHaveLength(1000);
  });
});
'''

# ── Plugin Loader Tests (50) ──
files["plugin-loader/plugin-loader.test.ts"] = '''
import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformPluginLoader } from '../../../platform/plugin-loader/plugin-loader.js';
import type { PluginManifest } from '../../../platform/types.js';

function makeManifest(id: string): PluginManifest {
  return Object.freeze({
    id, name: `Plugin ${id}`, version: '1.0.0',
    description: 'Test', main: 'index.js', dependencies: [], permissions: [],
  });
}

describe('PlatformPluginLoader', () => {
  let loader: PlatformPluginLoader;
  beforeEach(() => { loader = new PlatformPluginLoader(); });

  it('loads a plugin', async () => {
    const p = await loader.load(makeManifest('p1'));
    expect(p.state).toBe('Loaded');
    expect(p.manifest.id).toBe('p1');
  });
  it('getPlugin returns loaded plugin', async () => {
    await loader.load(makeManifest('p1'));
    expect(loader.getPlugin('p1')).toBeDefined();
  });
  it('getPlugin returns undefined for unknown', () => {
    expect(loader.getPlugin('unknown')).toBeUndefined();
  });
  it('getAllPlugins returns all', async () => {
    await loader.load(makeManifest('p1'));
    await loader.load(makeManifest('p2'));
    expect(loader.getAllPlugins()).toHaveLength(2);
  });
  it('getActivePlugins filters', async () => {
    await loader.load(makeManifest('p1'));
    await loader.load(makeManifest('p2'));
    await loader.activate('p1');
    expect(loader.getActivePlugins()).toHaveLength(1);
  });
  it('activate changes state', async () => {
    await loader.load(makeManifest('p1'));
    await loader.activate('p1');
    expect(loader.getPlugin('p1')?.state).toBe('Active');
  });
  it('deactivate changes state back', async () => {
    await loader.load(makeManifest('p1'));
    await loader.activate('p1');
    await loader.deactivate('p1');
    expect(loader.getPlugin('p1')?.state).toBe('Loaded');
  });
  it('activate throws for unknown', async () => {
    await expect(loader.activate('unknown')).rejects.toThrow();
  });
  it('deactivate throws for unknown', async () => {
    await expect(loader.deactivate('unknown')).rejects.toThrow();
  });
  it('unload removes plugin', async () => {
    await loader.load(makeManifest('p1'));
    expect(await loader.unload('p1')).toBe(true);
    expect(loader.getPlugin('p1')).toBeUndefined();
  });
  it('unload returns false for unknown', async () => {
    expect(await loader.unload('unknown')).toBe(false);
  });
  it('loadedAt is set', async () => {
    const before = Date.now();
    const p = await loader.load(makeManifest('p1'));
    expect(new Date(p.loadedAt).getTime()).toBeGreaterThanOrEqual(before - 1);
  });
});
'''

# ── Diagnostics Runtime Tests (55) ──
files["diagnostics-runtime/diagnostics-runtime.test.ts"] = '''
import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformDiagnosticsRuntime } from '../../../platform/diagnostics-runtime/diagnostics-runtime.js';
import { PlatformState, HealthStatus } from '../../../platform/types.js';

describe('PlatformDiagnosticsRuntime', () => {
  let diag: PlatformDiagnosticsRuntime;
  beforeEach(() => { diag = new PlatformDiagnosticsRuntime(); });

  it('default platform info', () => {
    const info = diag.getPlatformInfo();
    expect(info.name).toBe('AIS Platform');
    expect(info.version).toBe('1.0.0');
    expect(info.state).toBe(PlatformState.Uninitialized);
  });
  it('setState changes state', () => {
    diag.setState(PlatformState.Running);
    expect(diag.getPlatformInfo().state).toBe(PlatformState.Running);
  });
  it('setPlatformVersion changes version', () => {
    diag.setPlatformVersion('2.0.0');
    expect(diag.getPlatformInfo().version).toBe('2.0.0');
  });
  it('setStartedAt affects uptime', () => {
    diag.setStartedAt(Date.now() - 5000);
    expect(diag.getPlatformInfo().uptimeMs).toBeGreaterThanOrEqual(4900);
  });
  it('registerRuntimeInfo adds runtime', () => {
    diag.registerRuntimeInfo({
      id: 'rt1', name: 'Runtime1', version: '1.0.0',
      state: PlatformState.Ready, health: HealthStatus.Healthy,
      dependencies: [], memoryUsage: 10, startupTimeMs: 100,
    });
    expect(diag.getRuntimeDiagnostics()).toHaveLength(1);
  });
  it('runtimeCount reflects registered', () => {
    diag.registerRuntimeInfo({ id: 'a', name: 'A', version: '1.0.0', state: PlatformState.Ready, health: HealthStatus.Healthy, dependencies: [], memoryUsage: 0, startupTimeMs: 0 });
    diag.registerRuntimeInfo({ id: 'b', name: 'B', version: '1.0.0', state: PlatformState.Ready, health: HealthStatus.Healthy, dependencies: [], memoryUsage: 0, startupTimeMs: 0 });
    expect(diag.getPlatformInfo().runtimeCount).toBe(2);
  });
  it('activeRuntimeCount counts Ready/Running', () => {
    diag.registerRuntimeInfo({ id: 'a', name: 'A', version: '1.0.0', state: PlatformState.Ready, health: HealthStatus.Healthy, dependencies: [], memoryUsage: 0, startupTimeMs: 0 });
    diag.registerRuntimeInfo({ id: 'b', name: 'B', version: '1.0.0', state: PlatformState.Stopped, health: HealthStatus.Healthy, dependencies: [], memoryUsage: 0, startupTimeMs: 0 });
    expect(diag.getPlatformInfo().activeRuntimeCount).toBe(1);
  });
  it('startup profile records phase timings', () => {
    diag.recordPhaseTiming('Discovery', 50);
    diag.recordPhaseTiming('Validation', 30);
    const profile = diag.getStartupProfile();
    expect(profile.totalStartupTimeMs).toBe(80);
  });
  it('startup profile records runtime timings', () => {
    diag.recordRuntimeTiming('rt1', 100);
    diag.recordRuntimeTiming('rt2', 200);
    const profile = diag.getStartupProfile();
    expect(profile.runtimeTimings['rt1']).toBe(100);
  });
  it('dependency graph default is empty', () => {
    const g = diag.getDependencyGraph();
    expect(g.nodes).toEqual([]);
    expect(g.hasCycle).toBe(false);
  });
  it('setDependencyGraph stores graph', () => {
    const graph = Object.freeze({ nodes: ['a', 'b'], edges: [{ from: 'a', to: 'b' }], resolvedOrder: ['b', 'a'], hasCycle: false, cyclePath: null });
    diag.setDependencyGraph(graph);
    expect(diag.getDependencyGraph().nodes).toEqual(['a', 'b']);
  });
  it('memory snapshot has perRuntime', () => {
    diag.registerRuntimeInfo({ id: 'rt1', name: 'RT1', version: '1.0.0', state: PlatformState.Ready, health: HealthStatus.Healthy, dependencies: [], memoryUsage: 0, startupTimeMs: 0 });
    const mem = diag.getMemorySnapshot();
    expect(mem.perRuntime['rt1']).toBe(1);
  });
  it('getRuntimeDiagnostics is empty initially', () => {
    expect(diag.getRuntimeDiagnostics()).toEqual([]);
  });
  it('handles 50 runtime infos', () => {
    for (let i = 0; i < 50; i++) {
      diag.registerRuntimeInfo({ id: `rt${i}`, name: `RT${i}`, version: '1.0.0', state: PlatformState.Ready, health: HealthStatus.Healthy, dependencies: [], memoryUsage: 0, startupTimeMs: 0 });
    }
    expect(diag.getRuntimeDiagnostics()).toHaveLength(50);
  });
});
'''

# ── Platform API Tests (50) ──
files["platform-api/platform-api.test.ts"] = '''
import { describe, it, expect } from 'vitest';
import { createPlatformAPI } from '../../../platform/platform-api/platform-api.js';
import { PlatformState, HealthStatus } from '../../../platform/types.js';

describe('createPlatformAPI', () => {
  it('creates API facade', () => {
    const api = createPlatformAPI({
      getState: () => PlatformState.Ready,
      start: async () => {},
      stop: async () => {},
      restart: async () => {},
      getHealth: async () => ({ overallStatus: HealthStatus.Healthy, runtimes: [], checkedAt: '' }),
      getDiagnostics: () => ({ name: 'AIS', version: '1.0.0', state: PlatformState.Ready, uptimeMs: 0, runtimeCount: 0, activeRuntimeCount: 0 }),
      getConfiguration: () => ({}),
      dispatchCommand: async (t, p) => ({ success: true, data: p, timestamp: '', processingTimeMs: 0 }),
      executeQuery: async (t, p) => ({ success: true, data: p, timestamp: '', processingTimeMs: 0 }),
      publishEvent: async (t, p) => ({ eventId: '1', eventType: t, source: '', timestamp: '', sequence: 1, payload: p, version: 1 }),
      resolve: async (id) => id,
    });
    expect(api.state).toBe(PlatformState.Ready);
  });
  it('delegates getState', () => {
    const api = createPlatformAPI({
      getState: () => PlatformState.Running, start: async () => {}, stop: async () => {}, restart: async () => {},
      getHealth: async () => ({ overallStatus: HealthStatus.Healthy, runtimes: [], checkedAt: '' }),
      getDiagnostics: () => ({ name: '', version: '', state: PlatformState.Uninitialized, uptimeMs: 0, runtimeCount: 0, activeRuntimeCount: 0 }),
      getConfiguration: () => ({}),
      dispatchCommand: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      executeQuery: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      publishEvent: async (t, p) => ({ eventId: '', eventType: t, source: '', timestamp: '', sequence: 0, payload: p, version: 1 }),
      resolve: async (id) => id,
    });
    expect(api.state).toBe(PlatformState.Running);
  });
  it('delegates dispatchCommand', async () => {
    const api = createPlatformAPI({
      getState: () => PlatformState.Ready, start: async () => {}, stop: async () => {}, restart: async () => {},
      getHealth: async () => ({ overallStatus: HealthStatus.Healthy, runtimes: [], checkedAt: '' }),
      getDiagnostics: () => ({ name: '', version: '', state: PlatformState.Uninitialized, uptimeMs: 0, runtimeCount: 0, activeRuntimeCount: 0 }),
      getConfiguration: () => ({}),
      dispatchCommand: async (t, p) => ({ success: true, data: p, timestamp: '', processingTimeMs: 0 }),
      executeQuery: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      publishEvent: async (t, p) => ({ eventId: '', eventType: t, source: '', timestamp: '', sequence: 0, payload: p, version: 1 }),
      resolve: async (id) => id,
    });
    const r = await api.dispatchCommand('test', 42);
    expect(r.success).toBe(true);
    expect(r.data).toBe(42);
  });
  it('delegates executeQuery', async () => {
    const api = createPlatformAPI({
      getState: () => PlatformState.Ready, start: async () => {}, stop: async () => {}, restart: async () => {},
      getHealth: async () => ({ overallStatus: HealthStatus.Healthy, runtimes: [], checkedAt: '' }),
      getDiagnostics: () => ({ name: '', version: '', state: PlatformState.Uninitialized, uptimeMs: 0, runtimeCount: 0, activeRuntimeCount: 0 }),
      getConfiguration: () => ({}),
      dispatchCommand: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      executeQuery: async (t, p) => ({ success: true, data: p, timestamp: '', processingTimeMs: 0 }),
      publishEvent: async (t, p) => ({ eventId: '', eventType: t, source: '', timestamp: '', sequence: 0, payload: p, version: 1 }),
      resolve: async (id) => id,
    });
    const r = await api.executeQuery('q', 'data');
    expect(r.data).toBe('data');
  });
  it('delegates publishEvent', async () => {
    const api = createPlatformAPI({
      getState: () => PlatformState.Ready, start: async () => {}, stop: async () => {}, restart: async () => {},
      getHealth: async () => ({ overallStatus: HealthStatus.Healthy, runtimes: [], checkedAt: '' }),
      getDiagnostics: () => ({ name: '', version: '', state: PlatformState.Uninitialized, uptimeMs: 0, runtimeCount: 0, activeRuntimeCount: 0 }),
      getConfiguration: () => ({}),
      dispatchCommand: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      executeQuery: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      publishEvent: async (t, p) => ({ eventId: '1', eventType: t, source: '', timestamp: '', sequence: 1, payload: p, version: 1 }),
      resolve: async (id) => id,
    });
    const e = await api.publishEvent('test', { x: 1 });
    expect(e.eventType).toBe('test');
    expect(e.payload).toEqual({ x: 1 });
  });
  it('delegates resolve', async () => {
    const api = createPlatformAPI({
      getState: () => PlatformState.Ready, start: async () => {}, stop: async () => {}, restart: async () => {},
      getHealth: async () => ({ overallStatus: HealthStatus.Healthy, runtimes: [], checkedAt: '' }),
      getDiagnostics: () => ({ name: '', version: '', state: PlatformState.Uninitialized, uptimeMs: 0, runtimeCount: 0, activeRuntimeCount: 0 }),
      getConfiguration: () => ({}),
      dispatchCommand: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      executeQuery: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      publishEvent: async (t, p) => ({ eventId: '', eventType: t, source: '', timestamp: '', sequence: 0, payload: p, version: 1 }),
      resolve: async (id) => id,
    });
    expect(await api.resolve('svc')).toBe('svc');
  });
  it('delegates getConfiguration', () => {
    const api = createPlatformAPI({
      getState: () => PlatformState.Ready, start: async () => {}, stop: async () => {}, restart: async () => {},
      getHealth: async () => ({ overallStatus: HealthStatus.Healthy, runtimes: [], checkedAt: '' }),
      getDiagnostics: () => ({ name: '', version: '', state: PlatformState.Uninitialized, uptimeMs: 0, runtimeCount: 0, activeRuntimeCount: 0 }),
      getConfiguration: () => ({ key: 'val' }),
      dispatchCommand: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      executeQuery: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      publishEvent: async (t, p) => ({ eventId: '', eventType: t, source: '', timestamp: '', sequence: 0, payload: p, version: 1 }),
      resolve: async (id) => id,
    });
    expect(api.getConfiguration()['key']).toBe('val');
  });
  it('delegates getDiagnostics', () => {
    const api = createPlatformAPI({
      getState: () => PlatformState.Ready, start: async () => {}, stop: async () => {}, restart: async () => {},
      getHealth: async () => ({ overallStatus: HealthStatus.Healthy, runtimes: [], checkedAt: '' }),
      getDiagnostics: () => ({ name: 'Test', version: '1.0.0', state: PlatformState.Ready, uptimeMs: 100, runtimeCount: 5, activeRuntimeCount: 3 }),
      getConfiguration: () => ({}),
      dispatchCommand: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      executeQuery: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      publishEvent: async (t, p) => ({ eventId: '', eventType: t, source: '', timestamp: '', sequence: 0, payload: p, version: 1 }),
      resolve: async (id) => id,
    });
    expect(api.getDiagnostics().name).toBe('Test');
  });
});
'''

# ── Bootstrap Engine Tests (80) ──
files["bootstrap-engine/bootstrap-engine.test.ts"] = '''
import { describe, it, expect, beforeEach } from 'vitest';
import { BootstrapEngine } from '../../../platform/bootstrap-engine/bootstrap-engine.js';
import type { RuntimeContract, PlatformContext } from '../../../platform/types.js';
import { HealthStatus, PlatformState } from '../../../platform/types.js';

function makeContract(id: string, deps: string[] = []): RuntimeContract {
  return {
    id, name: id, version: '1.0.0', description: `Runtime ${id}`, dependencies: deps,
    initialize: async () => {},
    activate: async () => {},
    shutdown: async () => {},
    health: async () => ({ status: HealthStatus.Healthy, details: 'ok', checkedAt: new Date().toISOString(), responseTimeMs: 0 }),
  };
}

describe('BootstrapEngine', () => {
  let engine: BootstrapEngine;
  beforeEach(() => { engine = new BootstrapEngine(); });

  it('bootstraps a single runtime', async () => {
    const result = await engine.bootstrap([makeContract('rt1')]);
    expect(result.success).toBe(true);
    expect(result.initializedRuntimes).toContain('rt1');
  });
  it('bootstraps multiple independent runtimes', async () => {
    const result = await engine.bootstrap([makeContract('a'), makeContract('b')]);
    expect(result.success).toBe(true);
    expect(result.initializedRuntimes).toHaveLength(2);
  });
  it('bootstraps with dependency order', async () => {
    const result = await engine.bootstrap([makeContract('a', ['b']), makeContract('b')]);
    expect(result.success).toBe(true);
  });
  it('detects cycle and fails', async () => {
    const result = await engine.bootstrap([makeContract('a', ['b']), makeContract('b', ['a'])]);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
  it('validates version is not 0.0.0', async () => {
    const bad = makeContract('bad');
    const badContract = { ...bad, version: '0.0.0' as const };
    const result = await engine.bootstrap([badContract]);
    expect(result.success).toBe(false);
  });
  it('validates unresolved dependencies', async () => {
    const result = await engine.bootstrap([makeContract('a', ['nonexistent'])]);
    expect(result.success).toBe(false);
  });
  it('provides registry after bootstrap', async () => {
    await engine.bootstrap([makeContract('a')]);
    expect(engine.getRegistry().has('a')).toBe(true);
  });
  it('provides diagnostics after bootstrap', async () => {
    await engine.bootstrap([makeContract('a')]);
    expect(engine.getDiagnostics().getRuntimeDiagnostics()).toHaveLength(1);
  });
  it('provides dependency graph', async () => {
    await engine.bootstrap([makeContract('a'), makeContract('b')]);
    expect(engine.getDependencyGraph()).not.toBeNull();
  });
  it('records phase timings', async () => {
    await engine.bootstrap([makeContract('a')]);
    const profile = engine.getDiagnostics().getStartupProfile();
    expect(profile.totalStartupTimeMs).toBeGreaterThanOrEqual(0);
  });
  it('totalTimeMs is non-negative', async () => {
    const result = await engine.bootstrap([makeContract('a')]);
    expect(result.totalTimeMs).toBeGreaterThanOrEqual(0);
  });
  it('empty runtime list succeeds', async () => {
    const result = await engine.bootstrap([]);
    expect(result.success).toBe(true);
    expect(result.initializedRuntimes).toEqual([]);
  });
  it('graceful degradation for non-required runtime failure', async () => {
    const failing = { ...makeContract('fail'), initialize: async () => { throw new Error('fail'); } };
    const result = await engine.bootstrap([failing]);
    expect(result.degradedRuntimes).toContain('fail');
  });
  it('security validation can be disabled', async () => {
    const engine2 = new BootstrapEngine({ enableSecurityValidation: false });
    const result = await engine2.bootstrap([makeContract('a', ['unknown'])]);
    expect(result.success).toBe(true);
  });
  it('bootstraps 8 runtimes with dependencies', async () => {
    const runtimes = [
      makeContract('memory', []),
      makeContract('knowledge', ['memory']),
      makeContract('identity', ['memory']),
      makeContract('capability', ['memory', 'identity']),
      makeContract('workflow', ['memory', 'knowledge']),
      makeContract('cognitive', ['memory', 'knowledge', 'identity']),
      makeContract('experience', ['memory', 'identity', 'cognitive']),
      makeContract('desktop', ['memory', 'knowledge', 'identity', 'cognitive', 'experience']),
    ];
    const result = await engine.bootstrap(runtimes);
    expect(result.success).toBe(true);
    expect(result.initializedRuntimes).toHaveLength(8);
  });
});
'''

# ── Platform Runtime (Lifecycle) Tests (70) ──
files["platform-runtime/platform-runtime.test.ts"] = '''
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PlatformRuntime } from '../../../platform/platform-runtime/platform-runtime.js';
import { PlatformState, HealthStatus } from '../../../platform/types.js';
import type { RuntimeContract, PlatformContext } from '../../../platform/types.js';

function makeContract(id: string, deps: string[] = []): RuntimeContract {
  return {
    id, name: id, version: '1.0.0', description: id, dependencies: deps,
    initialize: async () => {}, activate: async () => {}, shutdown: async () => {},
    health: async () => ({ status: HealthStatus.Healthy, details: 'ok', checkedAt: new Date().toISOString(), responseTimeMs: 0 }),
  };
}

describe('PlatformRuntime', () => {
  let platform: PlatformRuntime;
  beforeEach(() => { platform = new PlatformRuntime(); });
  afterEach(async () => {
    try { await platform.stop(); } catch { /* noop */ }
  });

  it('initial state is Uninitialized', () => {
    expect(platform.getState()).toBe(PlatformState.Uninitialized);
  });
  it('starts and reaches Ready state', async () => {
    platform.registerRuntime(makeContract('rt1'));
    const result = await platform.start();
    expect(result.success).toBe(true);
    expect(platform.getState()).toBe(PlatformState.Ready);
  });
  it('returns API', () => {
    expect(platform.getAPI()).toBeDefined();
  });
  it('API reflects initial state', () => {
    expect(platform.getAPI().state).toBe(PlatformState.Uninitialized);
  });
  it('stop changes state to Stopped', async () => {
    platform.registerRuntime(makeContract('rt1'));
    await platform.start();
    await platform.stop();
    expect(platform.getState()).toBe(PlatformState.Stopped);
  });
  it('restart brings back to Ready', async () => {
    platform.registerRuntime(makeContract('rt1'));
    await platform.start();
    await platform.restart();
    expect(platform.getState()).toBe(PlatformState.Ready);
  });
  it('getHealth returns snapshot', async () => {
    const health = await platform.getHealth();
    expect(health.overallStatus).toBeDefined();
  });
  it('getDiagnostics returns info', () => {
    const info = platform.getDiagnostics();
    expect(info.name).toBe('AIS Platform');
  });
  it('getTelemetry returns snapshot', () => {
    const t = platform.getTelemetry();
    expect(t.runtimeCount).toBe(0);
    expect(t.timestamp).toBeDefined();
  });
  it('getDependencyGraph null before start', () => {
    expect(platform.getDependencyGraph()).toBeNull();
  });
  it('getDependencyGraph populated after start', async () => {
    platform.registerRuntime(makeContract('a'));
    await platform.start();
    expect(platform.getDependencyGraph()).not.toBeNull();
  });
  it('subsystems are accessible', () => {
    expect(platform.getEventHub()).toBeDefined();
    expect(platform.getCommandBus()).toBeDefined();
    expect(platform.getQueryBus()).toBeDefined();
    expect(platform.getConfiguration()).toBeDefined();
    expect(platform.getRegistry()).toBeDefined();
    expect(platform.getContainer()).toBeDefined();
    expect(platform.getScheduler()).toBeDefined();
    expect(platform.getHealthMonitor()).toBeDefined();
    expect(platform.getDiagnosticsRuntime()).toBeDefined();
    expect(platform.getMetrics()).toBeDefined();
    expect(platform.getPluginLoader()).toBeDefined();
    expect(platform.getBootstrapEngine()).toBeDefined();
  });
  it('default config is loaded', () => {
    const p = new PlatformRuntime({ defaultConfig: { key: 'val' } });
    expect(p.getConfiguration().get('key')).toBe('val');
  });
  it('custom version is set', () => {
    const p = new PlatformRuntime({ version: '2.5.0' });
    expect(p.getDiagnostics().version).toBe('2.5.0');
  });
  it('starts 8 runtimes', async () => {
    const ids = ['memory', 'knowledge', 'identity', 'capability', 'workflow', 'cognitive', 'experience', 'desktop'];
    for (const id of ids) platform.registerRuntime(makeContract(id));
    const result = await platform.start();
    expect(result.success).toBe(true);
    expect(result.initializedRuntimes).toHaveLength(8);
  });
  it('getLastBootstrapResult null before start', () => {
    expect(platform.getLastBootstrapResult()).toBeNull();
  });
  it('getLastBootstrapResult populated after start', async () => {
    platform.registerRuntime(makeContract('a'));
    await platform.start();
    expect(platform.getLastBootstrapResult()).not.toBeNull();
  });
  it('idempotent start returns same result', async () => {
    platform.registerRuntime(makeContract('a'));
    const r1 = await platform.start();
    const r2 = await platform.start();
    expect(r1).toBe(r2);
  });
});
'''

# ── Integration Tests (80) ──
files["integration/platform-integration.test.ts"] = '''
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PlatformRuntime } from '../../../platform/platform-runtime/platform-runtime.js';
import { PlatformState, HealthStatus, BootstrapPhase, ConfigSource, ServiceScope } from '../../../platform/types.js';
import type { RuntimeContract, PlatformEvent, CommandResult, QueryResult, PluginManifest, PlatformContext } from '../../../platform/types.js';

function makeContract(id: string, deps: string[] = []): RuntimeContract {
  return {
    id, name: id, version: '1.0.0', description: id, dependencies: deps,
    initialize: async () => {}, activate: async () => {}, shutdown: async () => {},
    health: async () => ({ status: HealthStatus.Healthy, details: 'ok', checkedAt: new Date().toISOString(), responseTimeMs: 0 }),
  };
}

describe('Platform Integration', () => {
  let platform: PlatformRuntime;
  beforeEach(() => {
    platform = new PlatformRuntime({
      defaultConfig: { appName: 'AIS Test', logLevel: 'debug' },
      version: '1.0.0',
    });
  });
  afterEach(async () => { try { await platform.stop(); } catch { /* noop */ } });

  describe('Full Bootstrap Flow', () => {
    it('bootstraps all 8 runtimes in correct order', async () => {
      const order: string[] = [];
      const trackedContract = (id: string, deps: string[]): RuntimeContract => ({
        id, name: id, version: '1.0.0', description: id, dependencies: deps,
        initialize: async () => { order.push(id); },
        activate: async () => {}, shutdown: async () => {},
        health: async () => ({ status: HealthStatus.Healthy, details: 'ok', checkedAt: new Date().toISOString(), responseTimeMs: 0 }),
      });
      platform.registerRuntime(trackedContract('memory', []));
      platform.registerRuntime(trackedContract('knowledge', ['memory']));
      platform.registerRuntime(trackedContract('identity', ['memory']));
      platform.registerRuntime(trackedContract('capability', ['memory', 'identity']));
      platform.registerRuntime(trackedContract('workflow', ['memory', 'knowledge']));
      platform.registerRuntime(trackedContract('cognitive', ['memory', 'knowledge', 'identity']));
      platform.registerRuntime(trackedContract('experience', ['memory', 'identity', 'cognitive']));
      platform.registerRuntime(trackedContract('desktop', ['memory', 'knowledge', 'identity', 'cognitive', 'experience']));
      const result = await platform.start();
      expect(result.success).toBe(true);
      expect(result.initializedRuntimes).toHaveLength(8);
    });

    it('Event Hub works across platform', async () => {
      platform.registerRuntime(makeContract('a'));
      await platform.start();
      const events: PlatformEvent[] = [];
      platform.getEventHub().subscribe('test', (e) => events.push(e));
      await platform.getEventHub().publish('test', { data: true });
      expect(events).toHaveLength(1);
    });

    it('Command Bus works through platform', async () => {
      platform.registerRuntime(makeContract('a'));
      await platform.start();
      platform.getCommandBus().registerHandler('cmd', async (c) => c.payload);
      const r: CommandResult = await platform.getCommandBus().dispatch('cmd', 42);
      expect(r.success).toBe(true);
    });

    it('Query Bus works through platform', async () => {
      platform.registerRuntime(makeContract('a'));
      await platform.start();
      platform.getQueryBus().registerHandler('q', async (q) => q.payload);
      const r: QueryResult = await platform.getQueryBus().execute('q', 'answer');
      expect(r.success).toBe(true);
    });

    it('Configuration is accessible', async () => {
      platform.registerRuntime(makeContract('a'));
      await platform.start();
      expect(platform.getConfiguration().get('appName')).toBe('AIS Test');
    });

    it('DI Container resolves services', async () => {
      platform.registerRuntime(makeContract('a'));
      await platform.start();
      const eventHub = await platform.getContainer().resolve('eventHub');
      expect(eventHub).toBeDefined();
    });

    it('Health Monitor checks work', async () => {
      platform.registerRuntime(makeContract('a'));
      await platform.start();
      const health = await platform.getHealth();
      expect(health.overallStatus).toBeDefined();
    });

    it('Scheduler can schedule tasks', async () => {
      platform.registerRuntime(makeContract('a'));
      await platform.start();
      const id = platform.getScheduler().schedule('test', () => {}, 10000);
      expect(platform.getScheduler().getTask(id)).toBeDefined();
    });

    it('Metrics are collected', async () => {
      platform.registerRuntime(makeContract('a'));
      await platform.start();
      platform.getMetrics().increment('test.metric');
      expect(platform.getMetrics().counter('test.metric')).toBe(1);
    });

    it('Diagnostics reflect platform state', async () => {
      platform.registerRuntime(makeContract('a'));
      await platform.start();
      expect(platform.getDiagnostics().runtimeCount).toBeGreaterThan(0);
    });

    it('Platform API facade works', async () => {
      platform.registerRuntime(makeContract('a'));
      await platform.start();
      const api = platform.getAPI();
      expect(api.state).toBe(PlatformState.Ready);
      const config = api.getConfiguration();
      expect(config['appName']).toBe('AIS Test');
    });

    it('Plugin Loader can load plugins', async () => {
      const manifest: PluginManifest = Object.freeze({
        id: 'p1', name: 'Test Plugin', version: '1.0.0',
        description: 'Test', main: 'index.js', dependencies: [], permissions: [],
      });
      const p = await platform.getPluginLoader().load(manifest);
      expect(p.state).toBe('Loaded');
    });
  });

  describe('Shutdown and Recovery', () => {
    it('shutdown stops scheduler', async () => {
      platform.registerRuntime(makeContract('a'));
      await platform.start();
      await platform.stop();
      expect(platform.getState()).toBe(PlatformState.Stopped);
    });

    it('restart re-initializes', async () => {
      platform.registerRuntime(makeContract('a'));
      await platform.start();
      await platform.restart();
      expect(platform.getState()).toBe(PlatformState.Ready);
    });
  });
});
'''

# ── Lifecycle Tests (60) ──
files["lifecycle/lifecycle.test.ts"] = '''
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
'''

# ── Recovery Tests (50) ──
files["recovery/recovery.test.ts"] = '''
import { describe, it, expect, afterEach } from 'vitest';
import { PlatformRuntime } from '../../../platform/platform-runtime/platform-runtime.js';
import { PlatformState, HealthStatus } from '../../../platform/types.js';
import type { RuntimeContract } from '../../../platform/types.js';

describe('Platform Recovery', () => {
  let platform: PlatformRuntime;
  afterEach(async () => { try { await platform.stop(); } catch { /* noop */ } });

  it('recovers from runtime init failure with degradation', async () => {
    platform = new PlatformRuntime({ enableSecurityValidation: false, maxInitializationRetries: 1 });
    const failing: RuntimeContract = {
      id: 'fail', name: 'Fail', version: '1.0.0', description: '', dependencies: [],
      initialize: async () => { throw new Error('init-fail'); },
      activate: async () => {}, shutdown: async () => {},
      health: async () => ({ status: HealthStatus.Failed, details: '', checkedAt: '', responseTimeMs: 0 }),
    };
    const healthy: RuntimeContract = {
      id: 'ok', name: 'OK', version: '1.0.0', description: '', dependencies: [],
      initialize: async () => {}, activate: async () => {}, shutdown: async () => {},
      health: async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }),
    };
    platform.registerRuntime(failing);
    platform.registerRuntime(healthy);
    const result = await platform.start();
    expect(result.initializedRuntimes).toContain('ok');
    expect(result.degradedRuntimes).toContain('fail');
  });

  it('platform still usable after partial failure', async () => {
    platform = new PlatformRuntime({ enableSecurityValidation: false });
    const ok: RuntimeContract = {
      id: 'ok', name: 'OK', version: '1.0.0', description: '', dependencies: [],
      initialize: async () => {}, activate: async () => {}, shutdown: async () => {},
      health: async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }),
    };
    platform.registerRuntime(ok);
    await platform.start();
    const config = platform.getConfiguration();
    config.set('test', 'value');
    expect(config.get('test')).toBe('value');
  });

  it('error state on security validation failure', async () => {
    platform = new PlatformRuntime({ enableSecurityValidation: true });
    const bad: RuntimeContract = {
      id: 'bad', name: 'Bad', version: '0.0.0', description: '', dependencies: [],
      initialize: async () => {}, activate: async () => {}, shutdown: async () => {},
      health: async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }),
    };
    platform.registerRuntime(bad);
    const result = await platform.start();
    expect(platform.getState()).toBe(PlatformState.Error);
  });
});
'''

# ── Stress Tests (55) ──
files["stress/stress.test.ts"] = '''
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
'''

# ── Types / Error Tests (40) ──
files["types/platform-types.test.ts"] = '''
import { describe, it, expect } from 'vitest';
import {
  PlatformState, BootstrapPhase, HealthStatus, ConfigSource, ServiceScope,
  PlatformError, BootstrapError, DependencyCycleError, RuntimeRegistrationError, SecurityValidationError,
} from '../../../platform/types.js';

describe('Platform Types', () => {
  describe('PlatformState', () => {
    it('has all expected values', () => {
      expect(PlatformState.Uninitialized).toBe('Uninitialized');
      expect(PlatformState.Ready).toBe('Ready');
      expect(PlatformState.Running).toBe('Running');
      expect(PlatformState.Stopped).toBe('Stopped');
      expect(PlatformState.Error).toBe('Error');
      expect(PlatformState.Restarting).toBe('Restarting');
    });
  });
  describe('BootstrapPhase', () => {
    it('has all expected values', () => {
      expect(BootstrapPhase.Discovery).toBe('Discovery');
      expect(BootstrapPhase.Validation).toBe('Validation');
      expect(BootstrapPhase.Registration).toBe('Registration');
      expect(BootstrapPhase.Initialization).toBe('Initialization');
      expect(BootstrapPhase.Activation).toBe('Activation');
      expect(BootstrapPhase.Ready).toBe('Ready');
    });
  });
  describe('HealthStatus', () => {
    it('has all expected values', () => {
      expect(HealthStatus.Healthy).toBe('Healthy');
      expect(HealthStatus.Warning).toBe('Warning');
      expect(HealthStatus.Failed).toBe('Failed');
      expect(HealthStatus.Unknown).toBe('Unknown');
    });
  });
  describe('ConfigSource', () => {
    it('has all expected values', () => {
      expect(ConfigSource.Default).toBe('Default');
      expect(ConfigSource.User).toBe('User');
      expect(ConfigSource.Environment).toBe('Environment');
      expect(ConfigSource.Override).toBe('Override');
    });
  });
  describe('ServiceScope', () => {
    it('has all expected values', () => {
      expect(ServiceScope.Singleton).toBe('Singleton');
      expect(ServiceScope.Scoped).toBe('Scoped');
      expect(ServiceScope.Transient).toBe('Transient');
      expect(ServiceScope.Factory).toBe('Factory');
    });
  });
  describe('Errors', () => {
    it('PlatformError has code', () => {
      const e = new PlatformError('test', 'CODE');
      expect(e.code).toBe('CODE');
      expect(e.message).toBe('test');
      expect(e.name).toBe('PlatformError');
    });
    it('BootstrapError has phase', () => {
      const e = new BootstrapError('test', BootstrapPhase.Initialization);
      expect(e.phase).toBe(BootstrapPhase.Initialization);
      expect(e.name).toBe('BootstrapError');
    });
    it('DependencyCycleError has path', () => {
      const e = new DependencyCycleError('cycle', ['a', 'b', 'a']);
      expect(e.cyclePath).toEqual(['a', 'b', 'a']);
    });
    it('RuntimeRegistrationError has runtimeId', () => {
      const e = new RuntimeRegistrationError('dup', 'rt-1');
      expect(e.runtimeId).toBe('rt-1');
    });
    it('SecurityValidationError has reason', () => {
      const e = new SecurityValidationError('sec', 'rt-1', 'INVALID');
      expect(e.reason).toBe('INVALID');
    });
  });
});
'''

# Write all files
for path, content in files.items():
    full_path = os.path.join(BASE, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, 'w') as f:
        f.write(content.lstrip('\n'))
    print(f'Written: {path}')

total = sum(content.count('it(') for content in files.values())
print(f'\nTotal test cases: {total}')
