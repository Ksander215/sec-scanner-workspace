import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformDiagnosticsRuntime } from '../../../platform/diagnostics-runtime/diagnostics-runtime.js';
import { PlatformState, HealthStatus } from '../../../platform/types.js';

function rInfo(id: string, state: PlatformState = PlatformState.Ready, health: HealthStatus = HealthStatus.Healthy) {
  return { id, name: id, version: '1.0.0', state, health, dependencies: [], memoryUsage: 0, startupTimeMs: 0 };
}

describe('PlatformDiagnosticsRuntime Extended', () => {
  let d: PlatformDiagnosticsRuntime;
  beforeEach(() => { d = new PlatformDiagnosticsRuntime(); });

  it('tracks multiple phase timings', () => {
    d.recordPhaseTiming('Discovery', 10);
    d.recordPhaseTiming('Validation', 20);
    d.recordPhaseTiming('Registration', 15);
    d.recordPhaseTiming('Initialization', 100);
    d.recordPhaseTiming('Activation', 50);
    d.recordPhaseTiming('Ready', 0);
    expect(d.getStartupProfile().totalStartupTimeMs).toBe(195);
  });

  it('activeRuntimeCount with mixed states', () => {
    d.registerRuntimeInfo(rInfo('a', PlatformState.Ready));
    d.registerRuntimeInfo(rInfo('b', PlatformState.Running));
    d.registerRuntimeInfo(rInfo('c', PlatformState.Stopped));
    d.registerRuntimeInfo(rInfo('d', PlatformState.Uninitialized));
    expect(d.getPlatformInfo().activeRuntimeCount).toBe(2);
  });

  it('uptime grows over time', () => {
    d.setStartedAt(Date.now() - 10000);
    const u1 = d.getPlatformInfo().uptimeMs;
    expect(u1).toBeGreaterThanOrEqual(9900);
  });

  it('setPlatformVersion changes displayed version', () => {
    d.setPlatformVersion('99.99.99');
    expect(d.getPlatformInfo().version).toBe('99.99.99');
  });

  it('dependency graph with cycle', () => {
    const g = Object.freeze({ nodes: ['a', 'b'], edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }], resolvedOrder: [], hasCycle: true, cyclePath: ['a', 'b', 'a'] });
    d.setDependencyGraph(g);
    expect(d.getDependencyGraph().hasCycle).toBe(true);
  });

  it('memory snapshot is frozen', () => {
    const m = d.getMemorySnapshot();
    expect(Object.isFrozen(m)).toBe(true);
    expect(Object.isFrozen(m.perRuntime)).toBe(true);
  });

  it('runtime diagnostics returns all registered', () => {
    for (let i = 0; i < 10; i++) d.registerRuntimeInfo(rInfo(`rt${i}`));
    expect(d.getRuntimeDiagnostics()).toHaveLength(10);
  });

  it('platform info is frozen', () => {
    const info = d.getPlatformInfo();
    expect(Object.isFrozen(info)).toBe(true);
  });

  it('setStartedAt 0 gives 0 uptime', () => {
    d.setStartedAt(0);
    expect(d.getPlatformInfo().uptimeMs).toBe(0);
  });

  it('all platform states', () => {
    for (const s of [PlatformState.Uninitialized, PlatformState.Discovering, PlatformState.Validating, PlatformState.Registering, PlatformState.Initializing, PlatformState.Activating, PlatformState.Ready, PlatformState.Running, PlatformState.ShuttingDown, PlatformState.Stopped, PlatformState.Error, PlatformState.Restarting]) {
      d.setState(s);
      expect(d.getPlatformInfo().state).toBe(s);
    }
  });

  it('memory snapshot freeMemoryMB is non-negative', () => {
    const m = d.getMemorySnapshot();
    expect(m.freeMemoryMB).toBeGreaterThanOrEqual(0);
  });
});
