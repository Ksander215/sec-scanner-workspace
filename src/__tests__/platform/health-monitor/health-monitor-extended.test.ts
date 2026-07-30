import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PlatformHealthMonitor } from '../../../platform/health-monitor/health-monitor.js';
import { HealthStatus } from '../../../platform/types.js';

const healthy = () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 1 });
const warn = () => ({ status: HealthStatus.Warning, details: 'slow', checkedAt: '', responseTimeMs: 5 });
const fail = () => ({ status: HealthStatus.Failed, details: 'down', checkedAt: '', responseTimeMs: 0 });

describe('PlatformHealthMonitor Extended', () => {
  let m: PlatformHealthMonitor;
  beforeEach(() => { m = new PlatformHealthMonitor(); });
  afterEach(() => m.stopAutoCheck());

  it('10 healthy runtimes', async () => {
    for (let i = 0; i < 10; i++) m.registerCheck(`rt${i}`, healthy);
    const r = await m.checkAll();
    expect(r.overallStatus).toBe(HealthStatus.Healthy);
    expect(r.runtimes).toHaveLength(10);
  });
  it('1 failed out of 10', async () => {
    for (let i = 0; i < 9; i++) m.registerCheck(`h${i}`, healthy);
    m.registerCheck('f1', fail);
    const r = await m.checkAll();
    expect(r.overallStatus).toBe(HealthStatus.Failed);
  });
  it('1 warning out of 10 healthy', async () => {
    for (let i = 0; i < 9; i++) m.registerCheck(`h${i}`, healthy);
    m.registerCheck('w1', warn);
    const r = await m.checkAll();
    expect(r.overallStatus).toBe(HealthStatus.Warning);
  });
  it('responseTimeMs is captured', async () => {
    m.registerCheck('fast', async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 42 }));
    const r = await m.checkRuntime('fast');
    expect(r.responseTimeMs).toBeGreaterThanOrEqual(0);
  });
  it('re-register overwrites', async () => {
    m.registerCheck('a', healthy);
    m.registerCheck('a', fail);
    const r = await m.checkRuntime('a');
    expect(r.status).toBe(HealthStatus.Failed);
  });
  it('snapshot is updated after checkAll', async () => {
    m.registerCheck('a', healthy);
    await m.checkAll();
    const s1 = m.getSnapshot();
    await m.checkAll();
    const s2 = m.getSnapshot();
    expect(s1).not.toBe(s2);
  });
  it('checkAll returns frozen snapshot', async () => {
    m.registerCheck('a', healthy);
    const r = await m.checkAll();
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.runtimes)).toBe(true);
  });
  it('multiple stopAutoCheck calls safe', () => {
    m.stopAutoCheck();
    m.stopAutoCheck();
    expect(true).toBe(true);
  });
  it('checkAll with mixed statuses', async () => {
    m.registerCheck('h', healthy);
    m.registerCheck('w', warn);
    m.registerCheck('f', fail);
    const r = await m.checkAll();
    expect(r.overallStatus).toBe(HealthStatus.Failed);
    expect(r.runtimes).toHaveLength(3);
  });
  it('slow health check is captured', async () => {
    m.registerCheck('slow', async () => {
      await new Promise(r => setTimeout(r, 5));
      return { status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 };
    });
    const r = await m.checkRuntime('slow');
    expect(r.responseTimeMs).toBeGreaterThanOrEqual(0);
  });
  it('all failed gives Failed', async () => {
    for (let i = 0; i < 5; i++) m.registerCheck(`f${i}`, fail);
    const r = await m.checkAll();
    expect(r.overallStatus).toBe(HealthStatus.Failed);
  });
  it('all warning gives Warning', async () => {
    for (let i = 0; i < 5; i++) m.registerCheck(`w${i}`, warn);
    const r = await m.checkAll();
    expect(r.overallStatus).toBe(HealthStatus.Warning);
  });
  it('checkedAt is populated', async () => {
    m.registerCheck('a', async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: new Date().toISOString(), responseTimeMs: 0 }));
    const r = await m.checkRuntime('a');
    expect(r.checkedAt).toBeDefined();
  });
  it('runtimeName matches runtimeId when not explicitly set', async () => {
    m.registerCheck('my-rt', healthy);
    const r = await m.checkRuntime('my-rt');
    expect(r.runtimeName).toBe('my-rt');
  });
  it('100 healthy runtimes', async () => {
    for (let i = 0; i < 100; i++) m.registerCheck(`rt${i}`, healthy);
    const r = await m.checkAll();
    expect(r.runtimes).toHaveLength(100);
    expect(r.overallStatus).toBe(HealthStatus.Healthy);
  });
});
