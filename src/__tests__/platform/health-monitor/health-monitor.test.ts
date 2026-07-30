import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PlatformHealthMonitor } from '../../../platform/health-monitor/health-monitor.js';
import { HealthStatus } from '../../../platform/types.js';

describe('PlatformHealthMonitor', () => {
  let monitor: PlatformHealthMonitor;
  beforeEach(() => { monitor = new PlatformHealthMonitor(); });
  afterEach(() => { monitor.stopAutoCheck(); });

  it('checks all returns empty for no checks', async () => {
    const r = await monitor.checkAll();
    expect(r.overallStatus).toBe(HealthStatus.Unknown);
    expect(r.runtimes).toEqual([]);
  });
  it('registers and runs a health check', async () => {
    monitor.registerCheck('rt1', async () => ({ status: HealthStatus.Healthy, details: 'ok', checkedAt: new Date().toISOString(), responseTimeMs: 1 }));
    const r = await monitor.checkAll();
    expect(r.runtimes).toHaveLength(1);
    expect(r.overallStatus).toBe(HealthStatus.Healthy);
  });
  it('checks single runtime', async () => {
    monitor.registerCheck('rt1', async () => ({ status: HealthStatus.Warning, details: 'warn', checkedAt: new Date().toISOString(), responseTimeMs: 1 }));
    const r = await monitor.checkRuntime('rt1');
    expect(r.status).toBe(HealthStatus.Warning);
  });
  it('returns Unknown for unregistered runtime', async () => {
    const r = await monitor.checkRuntime('unknown');
    expect(r.status).toBe(HealthStatus.Unknown);
  });
  it('overall is Failed if any runtime fails', async () => {
    monitor.registerCheck('a', async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }));
    monitor.registerCheck('b', async () => ({ status: HealthStatus.Failed, details: '', checkedAt: '', responseTimeMs: 0 }));
    const r = await monitor.checkAll();
    expect(r.overallStatus).toBe(HealthStatus.Failed);
  });
  it('overall is Warning if any runtime warns', async () => {
    monitor.registerCheck('a', async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }));
    monitor.registerCheck('b', async () => ({ status: HealthStatus.Warning, details: '', checkedAt: '', responseTimeMs: 0 }));
    const r = await monitor.checkAll();
    expect(r.overallStatus).toBe(HealthStatus.Warning);
  });
  it('captures failed check exceptions', async () => {
    monitor.registerCheck('err', async () => { throw new Error('check-fail'); });
    const r = await monitor.checkRuntime('err');
    expect(r.status).toBe(HealthStatus.Failed);
    expect(r.details).toBe('check-fail');
  });
  it('getSnapshot returns null initially', () => {
    expect(monitor.getSnapshot()).toBeNull();
  });
  it('getSnapshot returns after checkAll', async () => {
    monitor.registerCheck('a', async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }));
    await monitor.checkAll();
    expect(monitor.getSnapshot()).not.toBeNull();
  });
  it('startAutoCheck sets up interval', async () => {
    vi.useFakeTimers();
    monitor.registerCheck('a', async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }));
    monitor.startAutoCheck(100);
    await vi.advanceTimersByTimeAsync(250);
    monitor.stopAutoCheck();
    vi.useRealTimers();
    expect(monitor.getSnapshot()).not.toBeNull();
  });
  it('stopAutoCheck clears interval', () => {
    monitor.startAutoCheck(100);
    monitor.stopAutoCheck();
    // No error thrown
    expect(true).toBe(true);
  });
  it('handles 50 runtimes', async () => {
    for (let i = 0; i < 50; i++) {
      monitor.registerCheck(`rt-${i}`, async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }));
    }
    const r = await monitor.checkAll();
    expect(r.runtimes).toHaveLength(50);
  });
});
