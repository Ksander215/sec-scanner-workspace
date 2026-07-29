/**
 * Plugin Sandbox — ADR-006
 * Z2 boundary: scoped read/write, no direct AIS internal access.
 * Resource limits: CPU, memory, network.
 */
export interface PluginSandbox {
  readonly maxMemoryMB: number;
  readonly maxCpuPercent: number;
  readonly networkAllowed: boolean;
  execute<T>(handler: () => Promise<T>, timeout: number): Promise<T>;
}
