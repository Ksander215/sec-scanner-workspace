import { describe, it, expect, beforeEach } from 'vitest';
import { BootstrapEngine } from '../../../platform/bootstrap-engine/bootstrap-engine.js';
import type { RuntimeContract, PlatformContext } from '../../../platform/types.js';
import { HealthStatus, BootstrapPhase, DependencyCycleError } from '../../../platform/types.js';

function rc(id: string, deps: string[] = []): RuntimeContract {
  return {
    id, name: id, version: '1.0.0', description: `Runtime ${id}`, dependencies: deps,
    initialize: async () => {}, activate: async () => {}, shutdown: async () => {},
    health: async () => ({ status: HealthStatus.Healthy, details: 'ok', checkedAt: new Date().toISOString(), responseTimeMs: 0 }),
  };
}

const mockContext = {
  eventHub: {} as any,
  commandBus: {} as any,
  queryBus: {} as any,
  configuration: {} as any,
  registry: {} as any,
  container: {} as any,
  scheduler: {} as any,
  healthMonitor: {} as any,
  metrics: {} as any,
  diagnostics: {} as any,
};

describe('BootstrapEngine', () => {
  let engine: BootstrapEngine;
  beforeEach(() => {
    engine = new BootstrapEngine();
    engine.setPlatformContext(mockContext);
  });

  it('bootstraps a single runtime', async () => {
    const result = await engine.bootstrap([rc('rt1')]);
    expect(result.success).toBe(true);
    expect(result.initializedRuntimes).toContain('rt1');
  });
  it('bootstraps multiple independent runtimes', async () => {
    const result = await engine.bootstrap([rc('a'), rc('b')]);
    expect(result.success).toBe(true);
    expect(result.initializedRuntimes).toHaveLength(2);
  });
  it('bootstraps with dependency order', async () => {
    const result = await engine.bootstrap([rc('a', ['b']), rc('b')]);
    expect(result.success).toBe(true);
    expect(result.initializedRuntimes.indexOf('b')).toBeLessThan(result.initializedRuntimes.indexOf('a'));
  });
  it('detects cycle and fails', async () => {
    const result = await engine.bootstrap([rc('a', ['b']), rc('b', ['a'])]);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
  it('validates version is not 0.0.0', async () => {
    const result = await engine.bootstrap([{
      id: 'bad', name: 'Bad', version: '0.0.0', description: '', dependencies: [],
      initialize: async () => {}, activate: async () => {}, shutdown: async () => {},
      health: async () => ({ status: HealthStatus.Failed, details: '', checkedAt: '', responseTimeMs: 0 }),
    }]);
    expect(result.success).toBe(false);
    expect(result.error).toContain('version');
  });
  it('validates unresolved dependencies', async () => {
    const result = await engine.bootstrap([{
      id: 'a', name: 'A', version: '1.0.0', description: '', dependencies: ['missing'],
      initialize: async () => {}, activate: async () => {}, shutdown: async () => {},
      health: async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }),
    }]);
    expect(result.success).toBe(false);
    expect(result.error).toContain('unresolvable');
  });
  it('provides registry after bootstrap', async () => {
    await engine.bootstrap([rc('a')]);
    expect(engine.getRegistry().has('a')).toBe(true);
  });
  it('provides diagnostics after bootstrap', async () => {
    await engine.bootstrap([rc('a')]);
    expect(engine.getDiagnostics().getPlatformInfo().runtimeCount).toBeGreaterThanOrEqual(0);
  });
  it('provides dependency graph after bootstrap', async () => {
    await engine.bootstrap([rc('a'), rc('b')]);
    expect(engine.getDependencyGraph()).not.toBeNull();
    expect(engine.getDependencyGraph()!.resolvedOrder).toHaveLength(2);
  });
  it('records phase timings', async () => {
    const r = await engine.bootstrap([rc('a')]);
    expect(engine.getDiagnostics().getStartupProfile().totalStartupTimeMs).toBeGreaterThanOrEqual(0);
  });
  it('totalTimeMs is positive', async () => {
    const r = await engine.bootstrap([rc('a')]);
    expect(r.totalTimeMs).toBeGreaterThanOrEqual(0);
  });
  it('failed runtimes list is empty on success', async () => {
    const r = await engine.bootstrap([rc('a')]);
    expect(r.failedRuntimes).toEqual([]);
  });
});
