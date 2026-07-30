/**
 * Health Monitor — Checks health of all registered Runtimes
 * TASK-AIS-005A.000 — Platform Integration Foundation
 */
import type { HealthCheckResult, HealthMonitor as HealthMonitorInterface, PlatformHealthSnapshot, RuntimeHealthSnapshot } from '../types.js';
import { HealthStatus } from '../types.js';

export class PlatformHealthMonitor implements HealthMonitorInterface {
  private checks = new Map<string, () => Promise<HealthCheckResult>>();
  private autoCheckTimer: ReturnType<typeof setInterval> | null = null;
  private lastSnapshot: PlatformHealthSnapshot | null = null;

  registerCheck(runtimeId: string, checkFn: () => Promise<HealthCheckResult>): void {
    this.checks.set(runtimeId, checkFn);
  }

  async checkAll(): Promise<PlatformHealthSnapshot> {
    const results: RuntimeHealthSnapshot[] = [];

    for (const [runtimeId, checkFn] of this.checks) {
      const start = performance.now();
      try {
        const result = await checkFn();
        results.push({
          runtimeId,
          runtimeName: runtimeId,
          status: result.status,
          details: result.details,
          checkedAt: result.checkedAt,
          responseTimeMs: performance.now() - start,
        });
      } catch (err) {
        results.push({
          runtimeId,
          runtimeName: runtimeId,
          status: HealthStatus.Failed,
          details: err instanceof Error ? err.message : String(err),
          checkedAt: new Date().toISOString(),
          responseTimeMs: performance.now() - start,
        });
      }
    }

    const overallStatus = this.computeOverallStatus(results);
    const snapshot: PlatformHealthSnapshot = Object.freeze({
      overallStatus,
      runtimes: Object.freeze(results),
      checkedAt: new Date().toISOString(),
    });
    this.lastSnapshot = snapshot;
    return snapshot;
  }

  async checkRuntime(runtimeId: string): Promise<RuntimeHealthSnapshot> {
    const checkFn = this.checks.get(runtimeId);
    if (!checkFn) {
      return {
        runtimeId,
        runtimeName: runtimeId,
        status: HealthStatus.Unknown,
        details: 'No health check registered',
        checkedAt: new Date().toISOString(),
        responseTimeMs: 0,
      };
    }
    const start = performance.now();
    try {
      const result = await checkFn();
      return {
        runtimeId,
        runtimeName: runtimeId,
        status: result.status,
        details: result.details,
        checkedAt: result.checkedAt,
        responseTimeMs: performance.now() - start,
      };
    } catch (err) {
      return {
        runtimeId,
        runtimeName: runtimeId,
        status: HealthStatus.Failed,
        details: err instanceof Error ? err.message : String(err),
        checkedAt: new Date().toISOString(),
        responseTimeMs: performance.now() - start,
      };
    }
  }

  getSnapshot(): PlatformHealthSnapshot | null {
    return this.lastSnapshot;
  }

  startAutoCheck(intervalMs: number): void {
    if (this.autoCheckTimer) clearInterval(this.autoCheckTimer);
    this.autoCheckTimer = setInterval(() => { void this.checkAll(); }, intervalMs);
  }

  stopAutoCheck(): void {
    if (this.autoCheckTimer) {
      clearInterval(this.autoCheckTimer);
      this.autoCheckTimer = null;
    }
  }

  private computeOverallStatus(results: readonly RuntimeHealthSnapshot[]): HealthStatus {
    if (results.length === 0) return HealthStatus.Unknown;
    if (results.some((r) => r.status === HealthStatus.Failed)) return HealthStatus.Failed;
    if (results.some((r) => r.status === HealthStatus.Warning)) return HealthStatus.Warning;
    if (results.every((s) => s.status === HealthStatus.Healthy)) return HealthStatus.Healthy;
    return HealthStatus.Warning;
  }
}
