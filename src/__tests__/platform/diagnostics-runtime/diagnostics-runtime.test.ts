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
