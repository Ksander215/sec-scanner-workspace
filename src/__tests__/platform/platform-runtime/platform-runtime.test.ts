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
