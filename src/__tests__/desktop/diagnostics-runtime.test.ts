import { describe, it, expect, beforeEach } from 'vitest';
import { DiagnosticsRuntime } from '../../desktop/diagnostics-runtime/diagnostics-runtime.js';

describe('DiagnosticsRuntime', () => {
  let rt: DiagnosticsRuntime;
  beforeEach(async () => { rt = new DiagnosticsRuntime(); await rt.initialize(); });

  describe('lifecycle', () => {
    it('should initialize', async () => { await rt.initialize(); expect(rt.initialized).toBe(true); });
    it('should have name', () => { expect(rt.name).toBe('DiagnosticsRuntime'); });
    it('should start', async () => { await rt.initialize(); await rt.start(); });
    it('should stop', async () => { await rt.initialize(); await rt.stop(); });
    it('should shutdown', async () => { await rt.initialize(); await rt.shutdown(); expect(rt.initialized).toBe(false); });
  });

  describe('methods', () => {
    it('register health check', () => { rt.registerHealthCheck("db", async () => ({healthy:true})); expect(rt.getHealthCheckCount()).toBe(1); });
    it('run health checks', async () => { rt.registerHealthCheck("db", async () => ({healthy:true})); const r = await rt.runHealthChecks(); expect(r.db.healthy).toBe(true); });
    it('unhealthy', async () => { rt.registerHealthCheck("f", async () => ({healthy:false, message:"err"})); const r = await rt.runHealthChecks(); expect(r.f.healthy).toBe(false); });
    it('record metric', () => { rt.recordMetric("cpu", 75.5); expect(rt.getMetric("cpu")).toBe(75.5); });
    it('get missing metric', () => { expect(rt.getMetric("m")).toBeUndefined(); });
    it('getAllMetrics', () => { rt.recordMetric("a", 1); rt.recordMetric("b", 2); expect(rt.getAllMetrics().size).toBe(2); });
    it('log message', () => { rt.log("info", "test"); expect(rt.getLogs().length).toBe(1); });
    it('clear logs', () => { rt.log("info", "a"); rt.clearLogs(); expect(rt.getLogs().length).toBe(0); });
    it('log has timestamp', () => { rt.log("info", "t"); expect(rt.getLogs()[0]!.timestamp).toBeTruthy(); });
    it('multiple logs', () => { rt.log("info", "a"); rt.log("error", "b"); expect(rt.getLogs().length).toBe(2); });
    it('log levels', () => { rt.log("warn", "w"); rt.log("debug", "d"); expect(rt.getLogs()[0]!.level).toBe("warn"); });
    it('health check count', () => { rt.registerHealthCheck("a", async () => ({healthy:true})); rt.registerHealthCheck("b", async () => ({healthy:true})); expect(rt.getHealthCheckCount()).toBe(2); });
    it('empty health checks', async () => { const r = await rt.runHealthChecks(); expect(Object.keys(r).length).toBe(0); });
    it('multiple metrics', () => { rt.recordMetric("a", 1); rt.recordMetric("a", 2); expect(rt.getMetric("a")).toBe(2); });
  });

  describe('edge cases', () => {
    it('should handle shutdown and reinit', async () => { await rt.shutdown(); await rt.initialize(); expect(rt.initialized).toBe(true); });
    it('should handle double init', async () => { await rt.initialize(); await rt.initialize(); expect(rt.initialized).toBe(true); });
  });
});
