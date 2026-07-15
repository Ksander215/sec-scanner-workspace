/**
 * Tests: Engine Registry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EngineRegistry } from '../registry/engine-registry.ts';
import { ScanCapability, EngineHealthStatus } from '../types/index.ts';
import type { ScanEnginePlugin, HealthCheckResult } from '../plugin-api/scan-engine-plugin.ts';
import { EngineAlreadyRegisteredError, EngineNotFoundError, EngineDisabledError, NoCapableEngineError } from '../errors/scan-errors.ts';

// ─── Test Doubles ──────────────────────────────────────────

function createMockPlugin(overrides?: Partial<ScanEnginePlugin>): ScanEnginePlugin {
  return {
    id: overrides?.id ?? 'test-engine',
    name: overrides?.name ?? 'Test Engine',
    version: overrides?.version ?? '1.0.0',
    description: overrides?.description ?? 'A test engine',
    capabilities: overrides?.capabilities ?? [ScanCapability.VulnerabilityDetection],
    initialize: overrides?.initialize ?? (async () => {}),
    shutdown: overrides?.shutdown ?? (async () => {}),
    health: overrides?.health ?? (async (): Promise<HealthCheckResult> => ({
      engineId: overrides?.id ?? 'test-engine',
      status: EngineHealthStatus.Healthy,
      latencyMs: 5,
      message: 'OK',
      checkedAt: new Date().toISOString(),
    })),
    scan: overrides?.scan ?? (async () => ({
      success: true,
      findings: [],
      requestsCount: 0,
      durationMs: 100,
    })),
    cancel: overrides?.cancel ?? (async () => {}),
  };
}

// ─── Tests ─────────────────────────────────────────────────

describe('EngineRegistry', () => {
  let registry: EngineRegistry;

  beforeEach(() => {
    registry = new EngineRegistry();
  });

  describe('register', () => {
    it('should register a plugin and make it available', async () => {
      const plugin = createMockPlugin({ id: 'engine-1' });
      await registry.register(plugin);
      expect(registry.getAllEngineIds()).toEqual(['engine-1']);
    });

    it('should call initialize on the plugin', async () => {
      let initialized = false;
      const plugin = createMockPlugin({
        id: 'engine-1',
        initialize: async () => { initialized = true; },
      });
      await registry.register(plugin);
      expect(initialized).toBe(true);
    });

    it('should throw EngineAlreadyRegisteredError for duplicate ID', async () => {
      await registry.register(createMockPlugin({ id: 'engine-1' }));
      await expect(
        registry.register(createMockPlugin({ id: 'engine-1' })),
      ).rejects.toThrow(EngineAlreadyRegisteredError);
    });

    it('should not register plugin if initialize() throws', async () => {
      const plugin = createMockPlugin({
        id: 'engine-1',
        initialize: async () => { throw new Error('init failed'); },
      });
      await expect(registry.register(plugin)).rejects.toThrow('init failed');
      expect(registry.getAllEngineIds()).toEqual([]);
    });

    it('should emit "registered" event', async () => {
      const events: any[] = [];
      registry.onEvent(e => events.push(e));
      await registry.register(createMockPlugin({ id: 'engine-1' }));
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('registered');
      expect(events[0].engineId).toBe('engine-1');
    });
  });

  describe('unregister', () => {
    it('should remove a registered plugin', async () => {
      await registry.register(createMockPlugin({ id: 'engine-1' }));
      await registry.unregister('engine-1');
      expect(registry.getAllEngineIds()).toEqual([]);
    });

    it('should call shutdown on the plugin', async () => {
      let shutdown = false;
      await registry.register(createMockPlugin({
        id: 'engine-1',
        shutdown: async () => { shutdown = true; },
      }));
      await registry.unregister('engine-1');
      expect(shutdown).toBe(true);
    });

    it('should throw EngineNotFoundError for unknown ID', async () => {
      await expect(registry.unregister('nonexistent')).rejects.toThrow(EngineNotFoundError);
    });

    it('should unregister even if shutdown() throws', async () => {
      await registry.register(createMockPlugin({
        id: 'engine-1',
        shutdown: async () => { throw new Error('shutdown failed'); },
      }));
      await registry.unregister('engine-1');
      expect(registry.getAllEngineIds()).toEqual([]);
    });
  });

  describe('lookup', () => {
    it('should get plugin by ID', async () => {
      const plugin = createMockPlugin({ id: 'engine-1', name: 'My Engine' });
      await registry.register(plugin);
      expect(registry.getPlugin('engine-1').name).toBe('My Engine');
    });

    it('should throw EngineNotFoundError for unknown ID', () => {
      expect(() => registry.getPlugin('nonexistent')).toThrow(EngineNotFoundError);
    });

    it('should get info for all engines', async () => {
      await registry.register(createMockPlugin({ id: 'e1', name: 'Engine 1' }));
      await registry.register(createMockPlugin({ id: 'e2', name: 'Engine 2' }));
      const infos = registry.getAllInfo();
      expect(infos).toHaveLength(2);
      expect(infos.map(i => i.id)).toEqual(['e1', 'e2']);
    });
  });

  describe('findByCapabilities', () => {
    it('should find engines with all required capabilities', async () => {
      await registry.register(createMockPlugin({
        id: 'nuclei',
        capabilities: [ScanCapability.VulnerabilityDetection, ScanCapability.ApiScanning],
      }));
      await registry.register(createMockPlugin({
        id: 'crawler',
        capabilities: [ScanCapability.Crawling],
      }));

      const results = registry.findByCapabilities([ScanCapability.VulnerabilityDetection]);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('nuclei');
    });

    it('should find engines matching multiple capabilities', async () => {
      await registry.register(createMockPlugin({
        id: 'full',
        capabilities: [ScanCapability.Crawling, ScanCapability.VulnerabilityDetection],
      }));

      const results = registry.findByCapabilities([
        ScanCapability.Crawling,
        ScanCapability.VulnerabilityDetection,
      ]);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('full');
    });

    it('should return empty array if no engine has all capabilities', async () => {
      await registry.register(createMockPlugin({
        id: 'e1',
        capabilities: [ScanCapability.Crawling],
      }));
      const results = registry.findByCapabilities([ScanCapability.VulnerabilityDetection]);
      expect(results).toHaveLength(0);
    });

    it('should exclude disabled engines', async () => {
      await registry.register(createMockPlugin({
        id: 'e1',
        capabilities: [ScanCapability.VulnerabilityDetection],
      }));
      registry.disable('e1');
      const results = registry.findByCapabilities([ScanCapability.VulnerabilityDetection]);
      expect(results).toHaveLength(0);
    });
  });

  describe('enable / disable', () => {
    it('should disable and re-enable an engine', async () => {
      await registry.register(createMockPlugin({ id: 'e1' }));
      registry.disable('e1');
      expect(registry.isEnabled('e1')).toBe(false);
      registry.enable('e1');
      expect(registry.isEnabled('e1')).toBe(true);
    });

    it('should throw EngineNotFoundError for unknown ID', () => {
      expect(() => registry.disable('nonexistent')).toThrow(EngineNotFoundError);
    });

    it('should emit enable/disable events', async () => {
      const events: any[] = [];
      registry.onEvent(e => events.push(e));
      await registry.register(createMockPlugin({ id: 'e1' }));

      registry.disable('e1');
      expect(events[1].type).toBe('disabled');

      registry.enable('e1');
      expect(events[2].type).toBe('enabled');
    });
  });

  describe('health checks', () => {
    it('should return healthy result for a working engine', async () => {
      await registry.register(createMockPlugin({ id: 'e1' }));
      const result = await registry.healthCheck('e1');
      expect(result.status).toBe(EngineHealthStatus.Healthy);
    });

    it('should return unhealthy if plugin.health() throws', async () => {
      await registry.register(createMockPlugin({
        id: 'e1',
        health: async () => { throw new Error('health check failed'); },
      }));
      const result = await registry.healthCheck('e1');
      expect(result.status).toBe(EngineHealthStatus.Unhealthy);
    });

    it('should emit health_changed event when status changes', async () => {
      const events: any[] = [];
      let healthCallCount = 0;
      await registry.register(createMockPlugin({
        id: 'e1',
        health: async () => {
          healthCallCount++;
          return {
            engineId: 'e1',
            status: healthCallCount > 1 ? EngineHealthStatus.Degraded : EngineHealthStatus.Healthy,
            latencyMs: 5,
            message: healthCallCount > 1 ? 'Slow' : 'OK',
            checkedAt: new Date().toISOString(),
          };
        },
      }));
      registry.onEvent(e => events.push(e));

      await registry.healthCheck('e1'); // Healthy — first check, no previous
      await registry.healthCheck('e1'); // Degraded — change detected

      const healthEvents = events.filter(e => e.type === 'health_changed');
      expect(healthEvents).toHaveLength(1);
      expect(healthEvents[0].data?.currentStatus).toBe('degraded');
    });

    it('should check all engines with healthCheckAll', async () => {
      await registry.register(createMockPlugin({ id: 'e1' }));
      await registry.register(createMockPlugin({ id: 'e2' }));
      const results = await registry.healthCheckAll();
      expect(results.size).toBe(2);
    });
  });

  describe('statistics', () => {
    it('should track scans executed', async () => {
      await registry.register(createMockPlugin({ id: 'e1' }));
      registry.recordScanExecuted('e1');
      registry.recordScanExecuted('e1');
      const info = registry.getInfo('e1');
      expect(info.totalScansExecuted).toBe(2);
    });

    it('should track findings produced', async () => {
      await registry.register(createMockPlugin({ id: 'e1' }));
      registry.recordFindingsProduced('e1', 5);
      registry.recordFindingsProduced('e1', 3);
      const info = registry.getInfo('e1');
      expect(info.totalFindingsProduced).toBe(8);
    });
  });
});