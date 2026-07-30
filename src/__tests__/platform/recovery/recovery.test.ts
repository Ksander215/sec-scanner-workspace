import { describe, it, expect, afterEach } from 'vitest';
import { PlatformRuntime } from '../../../platform/platform-runtime/platform-runtime.js';
import { PlatformState, HealthStatus } from '../../../platform/types.js';
import type { RuntimeContract } from '../../../platform/types.js';

describe('Platform Recovery', () => {
  let platform: PlatformRuntime;
  afterEach(async () => { try { await platform.stop(); } catch { /* noop */ } });

  it('recovers from runtime init failure with degradation', async () => {
    platform = new PlatformRuntime({ enableSecurityValidation: false, maxInitializationRetries: 1 });
    const failing: RuntimeContract = {
      id: 'fail', name: 'Fail', version: '1.0.0', description: '', dependencies: [],
      initialize: async () => { throw new Error('init-fail'); },
      activate: async () => {}, shutdown: async () => {},
      health: async () => ({ status: HealthStatus.Failed, details: '', checkedAt: '', responseTimeMs: 0 }),
    };
    const healthy: RuntimeContract = {
      id: 'ok', name: 'OK', version: '1.0.0', description: '', dependencies: [],
      initialize: async () => {}, activate: async () => {}, shutdown: async () => {},
      health: async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }),
    };
    platform.registerRuntime(failing);
    platform.registerRuntime(healthy);
    const result = await platform.start();
    expect(result.initializedRuntimes).toContain('ok');
    expect(result.degradedRuntimes).toContain('fail');
  });

  it('platform still usable after partial failure', async () => {
    platform = new PlatformRuntime({ enableSecurityValidation: false });
    const ok: RuntimeContract = {
      id: 'ok', name: 'OK', version: '1.0.0', description: '', dependencies: [],
      initialize: async () => {}, activate: async () => {}, shutdown: async () => {},
      health: async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }),
    };
    platform.registerRuntime(ok);
    await platform.start();
    const config = platform.getConfiguration();
    config.set('test', 'value');
    expect(config.get('test')).toBe('value');
  });

  it('error state on security validation failure', async () => {
    platform = new PlatformRuntime({ enableSecurityValidation: true });
    const bad: RuntimeContract = {
      id: 'bad', name: 'Bad', version: '0.0.0', description: '', dependencies: [],
      initialize: async () => {}, activate: async () => {}, shutdown: async () => {},
      health: async () => ({ status: HealthStatus.Healthy, details: '', checkedAt: '', responseTimeMs: 0 }),
    };
    platform.registerRuntime(bad);
    const result = await platform.start();
    expect(platform.getState()).toBe(PlatformState.Error);
  });
});
