/**
 * Diagnostics Runtime — Implementation
 */
import type { Timestamp } from '../../core/types/common.js';
import type { Service } from '../../core/services/service.js';

export class DiagnosticsRuntime implements Service {
  readonly name = 'DiagnosticsRuntime';
  private healthChecks = new Map<string, () => Promise<{healthy: boolean; message?: string}>>();
  private metrics = new Map<string, number>();
  private logs: Array<{level: string; message: string; timestamp: Timestamp}> = [];
  private _initialized = false;

  async initialize(): Promise<void> { this._initialized = true; }
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async shutdown(): Promise<void> { this.healthChecks.clear(); this.metrics.clear(); this.logs = []; this._initialized = false; }

  get initialized(): boolean { return this._initialized; }
  registerHealthCheck(name: string, check: () => Promise<{healthy: boolean; message?: string}>): void { this.healthChecks.set(name, check); }
  async runHealthChecks(): Promise<Record<string, {healthy: boolean; message?: string}>> {
    const results: Record<string, {healthy: boolean; message?: string}> = {};
    for (const [name, check] of this.healthChecks) { results[name] = await check(); }
    return results;
  }
  recordMetric(name: string, value: number): void { this.metrics.set(name, value); }
  getMetric(name: string): number | undefined { return this.metrics.get(name); }
  getAllMetrics(): ReadonlyMap<string, number> { return this.metrics; }
  log(level: string, message: string): void { this.logs.push({ level, message, timestamp: new Date().toISOString() as Timestamp }); }
  getLogs(): Array<{level: string; message: string; timestamp: Timestamp}> { return this.logs; }
  clearLogs(): void { this.logs = []; }
  getHealthCheckCount(): number { return this.healthChecks.size; }
}
