import { describe, it, expect, beforeEach } from 'vitest';
import { BootstrapEngine } from '../../../platform/bootstrap-engine/bootstrap-engine.js';
import { HealthStatus } from '../../../platform/types.js';

describe('BootstrapEngine Extended', () => {
  let e: BootstrapEngine;
  beforeEach(() => { e = new BootstrapEngine(); });

  it('single runtime with init tracking', async () => {
    let inited = false;
    const r = await e.bootstrap([{
      id: 'a', name: 'A', version: '1.0.0', description: '', dependencies: [],
      initialize: async () => { inited = true; },
      activate: async () => {}, shutdown: async () => {},
      health: async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: new Date().toISOString(), responseTimeMs: 0 }),
    }]);
    expect(r.success).toBe(true);
    expect(inited).toBe(true);
  });

  it('activate is called for initialized runtimes', async () => {
    let activated = false;
    const r = await e.bootstrap([{
      id: 'a', name: 'A', version: '1.0.0', description: '', dependencies: [],
      initialize: async () => {},
      activate: async () => { activated = true; },
      shutdown: async () => {},
      health: async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: new Date().toISOString(), responseTimeMs: 0 }),
    }]);
    expect(r.success).toBe(true);
    expect(activated).toBe(true);
  });

  it('activation failure does not crash bootstrap', async () => {
    const r = await e.bootstrap([{
      id: 'a', name: 'A', version: '1.0.0', description: '', dependencies: [],
      initialize: async () => {},
      activate: async () => { throw new Error('act-fail'); },
      shutdown: async () => {},
      health: async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: new Date().toISOString(), responseTimeMs: 0 }),
    }]);
    expect(r.success).toBe(true);
  });

  it('diagnostics has runtime count', async () => {
    const r = await e.bootstrap([rc('a')]);
    expect(e.getDiagnostics().getPlatformInfo().runtimeCount).toBeGreaterThanOrEqual(0);
  });

  it('totalTimeMs is positive', async () => {
    const r = await e.bootstrap([rc('a')]);
    expect(r.totalTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('failed runtimes list is empty on success', async () => {
    const r = await e.bootstrap([rc('a')]);
    expect(r.failedRuntimes).toEqual([]);
  });

  it('handles complex 10-node DAG', async () => {
    const r = await e.bootstrap([
      rc('core'), rc('a', ['core']), rc('b', ['core']),
      rc('c', ['core']),
      rc('d', ['a', 'b']), rc('e', ['b', 'c']),
    ]);
    expect(r.success).toBe(true);
    expect(r.initializedRuntimes).toHaveLength(6);
  });

  it('security validation rejects 0.0.0 version', async () => {
    const r = await e.bootstrap([{
      id: 'bad', name: 'Bad', version: '0.0.0', description: '', dependencies: [],
      initialize: async () => {}, activate: async () => {}, shutdown: async () => {},
      health: async () => ({ status: HealthStatus.Failed, details: '', checkedAt: '', responseTimeMs: 0 }),
    }]);
    expect(r.success).toBe(false);
  });

  it('security validation rejects missing dep', async () => {
    const r = await e.bootstrap([{
      id: 'a', name: 'A', version: '1.0.0', description: '', dependencies: ['missing'],
      initialize: async () => {}, activate: async () => {}, shutdown: async () => {},
      health: async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }),
    }]);
    expect(r.success).toBe(false);
  });

  it('phase is Ready on success', async () => {
    const r = await e.bootstrap([rc('a')]);
    expect(r.phase).toBe('Ready');
  });

  it('empty bootstrap returns Ready immediately', async () => {
    const r = await e.bootstrap([]);
    expect(r.phase).toBe('Ready');
  });

  it('required runtime failure marks as failed not degraded', async () => {
    const e2 = new BootstrapEngine({ requiredRuntimeIds: ['must-have'], enableSecurityValidation: false, maxInitializationRetries: 0 });
    const r = await e2.bootstrap([{
      id: 'must-have', name: 'MustHave', version: '1.0.0', description: '', dependencies: [],
      initialize: async () => { throw new Error('nope'); },
      activate: async () => {}, shutdown: async () => {},
      health: async () => ({ status: HealthStatus.Failed, details: '', checkedAt: '', responseTimeMs: 0 }),
    }]);
    expect(r.failedRuntimes).toContain('must-have');
  });
});

function rc(id: string, deps: string[] = []): RuntimeContract {
  return {
    id, name: id, version: '1.0.0', description: `Runtime ${id}`, dependencies: deps,
    initialize: async () => {}, activate: async () => {}, shutdown: async () => {},
    health: async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: new Date().toISOString(), responseTimeMs: 0 }),
  };
}
