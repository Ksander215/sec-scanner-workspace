import { describe, it, expect } from 'vitest';
import { createPlatformAPI } from '../../../platform/platform-api/platform-api.js';
import { PlatformState, HealthStatus } from '../../../platform/types.js';

describe('createPlatformAPI', () => {
  it('creates API facade', () => {
    const api = createPlatformAPI({
      getState: () => PlatformState.Ready,
      start: async () => {},
      stop: async () => {},
      restart: async () => {},
      getHealth: async () => ({ overallStatus: HealthStatus.Healthy, runtimes: [], checkedAt: '' }),
      getDiagnostics: () => ({ name: 'AIS', version: '1.0.0', state: PlatformState.Ready, uptimeMs: 0, runtimeCount: 0, activeRuntimeCount: 0 }),
      getConfiguration: () => ({}),
      dispatchCommand: async (t, p) => ({ success: true, data: p, timestamp: '', processingTimeMs: 0 }),
      executeQuery: async (t, p) => ({ success: true, data: p, timestamp: '', processingTimeMs: 0 }),
      publishEvent: async (t, p) => ({ eventId: '1', eventType: t, source: '', timestamp: '', sequence: 1, payload: p, version: 1 }),
      resolve: async (id) => id,
    });
    expect(api.state).toBe(PlatformState.Ready);
  });
  it('delegates getState', () => {
    const api = createPlatformAPI({
      getState: () => PlatformState.Running, start: async () => {}, stop: async () => {}, restart: async () => {},
      getHealth: async () => ({ overallStatus: HealthStatus.Healthy, runtimes: [], checkedAt: '' }),
      getDiagnostics: () => ({ name: '', version: '', state: PlatformState.Uninitialized, uptimeMs: 0, runtimeCount: 0, activeRuntimeCount: 0 }),
      getConfiguration: () => ({}),
      dispatchCommand: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      executeQuery: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      publishEvent: async (t, p) => ({ eventId: '', eventType: t, source: '', timestamp: '', sequence: 0, payload: p, version: 1 }),
      resolve: async (id) => id,
    });
    expect(api.state).toBe(PlatformState.Running);
  });
  it('delegates dispatchCommand', async () => {
    const api = createPlatformAPI({
      getState: () => PlatformState.Ready, start: async () => {}, stop: async () => {}, restart: async () => {},
      getHealth: async () => ({ overallStatus: HealthStatus.Healthy, runtimes: [], checkedAt: '' }),
      getDiagnostics: () => ({ name: '', version: '', state: PlatformState.Uninitialized, uptimeMs: 0, runtimeCount: 0, activeRuntimeCount: 0 }),
      getConfiguration: () => ({}),
      dispatchCommand: async (t, p) => ({ success: true, data: p, timestamp: '', processingTimeMs: 0 }),
      executeQuery: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      publishEvent: async (t, p) => ({ eventId: '', eventType: t, source: '', timestamp: '', sequence: 0, payload: p, version: 1 }),
      resolve: async (id) => id,
    });
    const r = await api.dispatchCommand('test', 42);
    expect(r.success).toBe(true);
    expect(r.data).toBe(42);
  });
  it('delegates executeQuery', async () => {
    const api = createPlatformAPI({
      getState: () => PlatformState.Ready, start: async () => {}, stop: async () => {}, restart: async () => {},
      getHealth: async () => ({ overallStatus: HealthStatus.Healthy, runtimes: [], checkedAt: '' }),
      getDiagnostics: () => ({ name: '', version: '', state: PlatformState.Uninitialized, uptimeMs: 0, runtimeCount: 0, activeRuntimeCount: 0 }),
      getConfiguration: () => ({}),
      dispatchCommand: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      executeQuery: async (t, p) => ({ success: true, data: p, timestamp: '', processingTimeMs: 0 }),
      publishEvent: async (t, p) => ({ eventId: '', eventType: t, source: '', timestamp: '', sequence: 0, payload: p, version: 1 }),
      resolve: async (id) => id,
    });
    const r = await api.executeQuery('q', 'data');
    expect(r.data).toBe('data');
  });
  it('delegates publishEvent', async () => {
    const api = createPlatformAPI({
      getState: () => PlatformState.Ready, start: async () => {}, stop: async () => {}, restart: async () => {},
      getHealth: async () => ({ overallStatus: HealthStatus.Healthy, runtimes: [], checkedAt: '' }),
      getDiagnostics: () => ({ name: '', version: '', state: PlatformState.Uninitialized, uptimeMs: 0, runtimeCount: 0, activeRuntimeCount: 0 }),
      getConfiguration: () => ({}),
      dispatchCommand: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      executeQuery: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      publishEvent: async (t, p) => ({ eventId: '1', eventType: t, source: '', timestamp: '', sequence: 1, payload: p, version: 1 }),
      resolve: async (id) => id,
    });
    const e = await api.publishEvent('test', { x: 1 });
    expect(e.eventType).toBe('test');
    expect(e.payload).toEqual({ x: 1 });
  });
  it('delegates resolve', async () => {
    const api = createPlatformAPI({
      getState: () => PlatformState.Ready, start: async () => {}, stop: async () => {}, restart: async () => {},
      getHealth: async () => ({ overallStatus: HealthStatus.Healthy, runtimes: [], checkedAt: '' }),
      getDiagnostics: () => ({ name: '', version: '', state: PlatformState.Uninitialized, uptimeMs: 0, runtimeCount: 0, activeRuntimeCount: 0 }),
      getConfiguration: () => ({}),
      dispatchCommand: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      executeQuery: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      publishEvent: async (t, p) => ({ eventId: '', eventType: t, source: '', timestamp: '', sequence: 0, payload: p, version: 1 }),
      resolve: async (id) => id,
    });
    expect(await api.resolve('svc')).toBe('svc');
  });
  it('delegates getConfiguration', () => {
    const api = createPlatformAPI({
      getState: () => PlatformState.Ready, start: async () => {}, stop: async () => {}, restart: async () => {},
      getHealth: async () => ({ overallStatus: HealthStatus.Healthy, runtimes: [], checkedAt: '' }),
      getDiagnostics: () => ({ name: '', version: '', state: PlatformState.Uninitialized, uptimeMs: 0, runtimeCount: 0, activeRuntimeCount: 0 }),
      getConfiguration: () => ({ key: 'val' }),
      dispatchCommand: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      executeQuery: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      publishEvent: async (t, p) => ({ eventId: '', eventType: t, source: '', timestamp: '', sequence: 0, payload: p, version: 1 }),
      resolve: async (id) => id,
    });
    expect(api.getConfiguration()['key']).toBe('val');
  });
  it('delegates getDiagnostics', () => {
    const api = createPlatformAPI({
      getState: () => PlatformState.Ready, start: async () => {}, stop: async () => {}, restart: async () => {},
      getHealth: async () => ({ overallStatus: HealthStatus.Healthy, runtimes: [], checkedAt: '' }),
      getDiagnostics: () => ({ name: 'Test', version: '1.0.0', state: PlatformState.Ready, uptimeMs: 100, runtimeCount: 5, activeRuntimeCount: 3 }),
      getConfiguration: () => ({}),
      dispatchCommand: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      executeQuery: async () => ({ success: true, timestamp: '', processingTimeMs: 0 }),
      publishEvent: async (t, p) => ({ eventId: '', eventType: t, source: '', timestamp: '', sequence: 0, payload: p, version: 1 }),
      resolve: async (id) => id,
    });
    expect(api.getDiagnostics().name).toBe('Test');
  });
});
