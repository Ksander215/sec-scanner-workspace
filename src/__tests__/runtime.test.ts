import { describe, it, expect } from 'vitest';
import { Runtime } from '../core/runtime/runtime.js';
import { DefaultEngineConfig } from '../core/config/engine-config.js';
import type { Service } from '../core/services/service.js';

describe('Runtime', () => {
  it('creates with default config', () => {
    const runtime = new Runtime(DefaultEngineConfig);
    expect(runtime.state).toBe('uninitialized');
  });

  it('runs full lifecycle', async () => {
    const runtime = new Runtime(DefaultEngineConfig);
    await runtime.initialize();
    expect(runtime.state).toBe('ready');
    await runtime.start();
    expect(runtime.state).toBe('running');
    await runtime.stop();
    expect(runtime.state).toBe('stopped');
    await runtime.shutdown();
    expect(runtime.state).toBe('uninitialized');
  });

  it('registers and retrieves services', () => {
    const runtime = new Runtime(DefaultEngineConfig);
    const mockService: Service = {
      name: 'test-service',
      initialize: async () => {},
      start: async () => {},
      stop: async () => {},
      shutdown: async () => {},
    };
    runtime.register(mockService);
    expect(runtime.services.has('test-service')).toBe(true);
    expect(runtime.services.get('test-service')).toBe(mockService);
  });

  it('rejects duplicate service names', () => {
    const runtime = new Runtime(DefaultEngineConfig);
    const svc: Service = {
      name: 'dup',
      initialize: async () => {},
      start: async () => {},
      stop: async () => {},
      shutdown: async () => {},
    };
    runtime.register(svc);
    expect(() => runtime.register(svc)).toThrow('already registered');
  });
});
