import { describe, it, expect, beforeEach } from 'vitest';
import { DiagnosticsRuntime } from '../../../desktop/diagnostics-runtime/diagnostics-runtime.js';

describe('DiagnosticsRuntime', () => {
  let rt: DiagnosticsRuntime;
  beforeEach(async () => { rt = new DiagnosticsRuntime(); await rt.initialize(); });

  describe('lifecycle', () => {
    it('should have name', () => { expect(rt.name).toBe('DiagnosticsRuntime'); });
    it('should initialize', () => { expect(rt.initialized).toBe(true); });
    it('should start', async () => { await rt.start(); });
    it('should stop', async () => { await rt.stop(); });
    it('should shutdown', async () => { await rt.shutdown(); expect(rt.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof rt.initialize).toBe('function'); });
  });

  describe('health checks', () => {
    it('should register health check', () => { rt.registerHealthCheck('db', async () => ({ healthy: true })); expect(rt.getHealthCheckCount()).toBe(1); });
    it('should register multiple', () => { rt.registerHealthCheck('a', async () => ({ healthy: true })); rt.registerHealthCheck('b', async () => ({ healthy: true })); expect(rt.getHealthCheckCount()).toBe(2); });
    it('should run healthy check', async () => { rt.registerHealthCheck('db', async () => ({ healthy: true })); const r = await rt.runHealthChecks(); expect(r.db.healthy).toBe(true); });
    it('should run unhealthy check', async () => { rt.registerHealthCheck('f', async () => ({ healthy: false, message: 'err' })); const r = await rt.runHealthChecks(); expect(r.f.healthy).toBe(false); expect(r.f.message).toBe('err'); });
    it('should run empty checks', async () => { const r = await rt.runHealthChecks(); expect(Object.keys(r).length).toBe(0); });
  });

  describe('metrics', () => {
    it('should record metric', () => { rt.recordMetric('cpu', 75.5); expect(rt.getMetric('cpu')).toBe(75.5); });
    it('should return undefined for missing', () => { expect(rt.getMetric('nope')).toBeUndefined(); });
    it('should get all metrics', () => { rt.recordMetric('a', 1); rt.recordMetric('b', 2); expect(rt.getAllMetrics().size).toBe(2); });
    it('should overwrite metric', () => { rt.recordMetric('a', 1); rt.recordMetric('a', 2); expect(rt.getMetric('a')).toBe(2); });
  });

  describe('logs', () => {
    it('should log message', () => { rt.log('info', 'test'); expect(rt.getLogs().length).toBe(1); });
    it('should clear logs', () => { rt.log('info', 'a'); rt.clearLogs(); expect(rt.getLogs().length).toBe(0); });
    it('should have timestamp', () => { rt.log('info', 't'); expect(rt.getLogs()[0]!.timestamp).toBeTruthy(); });
    it('should log multiple', () => { rt.log('info', 'a'); rt.log('error', 'b'); expect(rt.getLogs().length).toBe(2); });
    it('should preserve log levels', () => { rt.log('warn', 'w'); rt.log('debug', 'd'); expect(rt.getLogs()[0]!.level).toBe('warn'); });
    it('should preserve log messages', () => { rt.log('info', 'hello'); expect(rt.getLogs()[0]!.message).toBe('hello'); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await rt.shutdown(); await rt.initialize(); expect(rt.initialized).toBe(true); });
    it('should handle double init', async () => { await rt.initialize(); expect(rt.initialized).toBe(true); });
  });
});
