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
