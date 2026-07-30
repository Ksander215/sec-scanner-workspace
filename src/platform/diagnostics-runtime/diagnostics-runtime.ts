import type {
  PlatformDiagnostics as DiagnosticsInterface,
  PlatformInfo,
  RuntimeDiagnosticInfo,
  StartupProfile,
  DependencyGraph,
  MemorySnapshot,
} from '../types.js';
import { PlatformState } from '../types.js';

export class PlatformDiagnosticsRuntime implements DiagnosticsInterface {
  private platformName = 'AIS Platform';
  private platformVersion = '1.0.0';
  private state: PlatformState = PlatformState.Uninitialized;
  private startedAt = 0;
  private runtimeInfos = new Map<string, RuntimeDiagnosticInfo>();
  private phaseTimings = new Map<string, number>();
  private runtimeTimings = new Map<string, number>();
  private depGraph: DependencyGraph | null = null;

  setState(state: PlatformState): void { this.state = state; }
  setPlatformVersion(version: string): void { this.platformVersion = version; }
  setStartedAt(timestamp: number): void { this.startedAt = timestamp; }

  registerRuntimeInfo(info: RuntimeDiagnosticInfo): void {
    this.runtimeInfos.set(info.id, info);
  }

  recordPhaseTiming(phase: string, timeMs: number): void {
    this.phaseTimings.set(phase, timeMs);
  }

  recordRuntimeTiming(runtimeId: string, timeMs: number): void {
    this.runtimeTimings.set(runtimeId, timeMs);
  }

  setDependencyGraph(graph: DependencyGraph): void {
    this.depGraph = graph;
  }

  getPlatformInfo(): PlatformInfo {
    return Object.freeze({
      name: this.platformName,
      version: this.platformVersion,
      state: this.state,
      uptimeMs: this.startedAt ? Date.now() - this.startedAt : 0,
      runtimeCount: this.runtimeInfos.size,
      activeRuntimeCount: [...this.runtimeInfos.values()].filter(
        (r) => r.state === PlatformState.Running || r.state === PlatformState.Ready,
      ).length,
    });
  }

  getRuntimeDiagnostics(): readonly RuntimeDiagnosticInfo[] {
    return [...this.runtimeInfos.values()];
  }

  getStartupProfile(): StartupProfile {
    const totalStartupTimeMs = [...this.phaseTimings.values()].reduce((a, b) => a + b, 0);
    const phaseTimings = Object.fromEntries(this.phaseTimings) as unknown as Record<import('../types.js').BootstrapPhase, number>;
    return Object.freeze({
      totalStartupTimeMs,
      phaseTimings,
      runtimeTimings: Object.freeze(Object.fromEntries(this.runtimeTimings)),
    });
  }

  getDependencyGraph(): DependencyGraph {
    return this.depGraph ?? {
      nodes: [],
      edges: [],
      resolvedOrder: [],
      hasCycle: false,
      cyclePath: null,
    };
  }

  getMemorySnapshot(): MemorySnapshot {
    const totalMemoryMB = 256;
    const perRuntime: Record<string, number> = {};
    for (const [id] of this.runtimeInfos) {
      perRuntime[id] = 1;
    }
    const usedMemoryMB = Object.values(perRuntime).reduce((a, b) => a + b, 0);
    return Object.freeze({
      totalMemoryMB,
      usedMemoryMB,
      freeMemoryMB: Math.max(0, totalMemoryMB - usedMemoryMB),
      perRuntime: Object.freeze(perRuntime),
    });
  }
}
