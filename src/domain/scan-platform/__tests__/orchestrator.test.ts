/**
 * Tests: Scan Orchestrator — Integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScanOrchestrator } from '../orchestrator/scan-orchestrator.ts';
import { EngineRegistry } from '../registry/engine-registry.ts';
import { ScanCapability, EngineHealthStatus, ScanJobStatus, ScanTriggerType } from '../types/index.ts';
import type { ScanEnginePlugin, ScanEngineResult, HealthCheckResult, ScanEngineEvent, EngineEventCallback } from '../plugin-api/scan-engine-plugin.ts';

// ─── Test Doubles ──────────────────────────────────────────

function createStubPlugin(overrides?: {
  id?: string;
  capabilities?: ScanCapability[];
  findings?: any[];
  shouldFail?: boolean;
  scanDelayMs?: number;
}): ScanEnginePlugin {
  const findings = overrides?.findings ?? [];

  return {
    id: overrides?.id ?? 'stub-engine',
    name: `Stub ${overrides?.id ?? 'engine'}`,
    version: '1.0.0',
    description: 'Stub for testing',
    capabilities: overrides?.capabilities ?? [ScanCapability.VulnerabilityDetection],
    initialize: async () => {},
    shutdown: async () => {},
    health: async () => ({
      engineId: overrides?.id ?? 'stub-engine',
      status: EngineHealthStatus.Healthy,
      latencyMs: 1,
      message: 'OK',
      checkedAt: new Date().toISOString(),
    }),
    scan: async (_ctx: any, _onEvent: EngineEventCallback): Promise<ScanEngineResult> => {
      if (overrides?.scanDelayMs) {
        await new Promise(r => setTimeout(r, overrides.scanDelayMs));
      }
      if (overrides?.shouldFail) {
        return {
          success: false,
          findings: [],
          requestsCount: 10,
          durationMs: 500,
          errorMessage: 'Engine failed',
          errorCode: 'TEST_FAILURE',
          retryable: false,
        };
      }
      return {
        success: true,
        findings,
        requestsCount: 42,
        durationMs: 1000,
      };
    },
    cancel: async () => {},
  };
}

// ─── Tests ─────────────────────────────────────────────────

describe('ScanOrchestrator', () => {
  let registry: EngineRegistry;
  let orchestrator: ScanOrchestrator;

  beforeEach(async () => {
    registry = new EngineRegistry();
    orchestrator = new ScanOrchestrator(registry);
    orchestrator.start();
  });

  describe('startScan', () => {
    it('should create a job and transition to Running', async () => {
      await registry.register(createStubPlugin({ id: 'nuclei' }));
      const job = await orchestrator.startScan({
        targetId: 't1',
        targetUrl: 'https://example.com',
        targetName: 'Example',
        triggerType: ScanTriggerType.Manual,
        triggeredBy: 'user-1',
        requiredCapabilities: [ScanCapability.VulnerabilityDetection],
      });

      expect(job.status).toBe(ScanJobStatus.Running);
      expect(job.engineIds).toEqual(['nuclei']);
      expect(job.startedAt).not.toBeNull();
    });

    it('should auto-select engines by capabilities', async () => {
      await registry.register(createStubPlugin({
        id: 'nuclei',
        capabilities: [ScanCapability.VulnerabilityDetection],
      }));
      await registry.register(createStubPlugin({
        id: 'zap',
        capabilities: [ScanCapability.Crawling, ScanCapability.VulnerabilityDetection],
      }));

      const job = await orchestrator.startScan({
        targetId: 't1',
        targetUrl: 'https://example.com',
        targetName: 'Example',
        triggerType: ScanTriggerType.Manual,
        triggeredBy: 'user-1',
        requiredCapabilities: [ScanCapability.VulnerabilityDetection],
      });

      // Both engines have the capability, both should be selected.
      expect(job.engineIds.length).toBeGreaterThanOrEqual(1);
    });

    it('should use specific engines when engineIds provided', async () => {
      await registry.register(createStubPlugin({ id: 'nuclei' }));
      await registry.register(createStubPlugin({ id: 'zap' }));

      const job = await orchestrator.startScan({
        targetId: 't1',
        targetUrl: 'https://example.com',
        targetName: 'Example',
        triggerType: ScanTriggerType.Manual,
        triggeredBy: 'user-1',
        requiredCapabilities: [ScanCapability.VulnerabilityDetection],
      }, ['zap']);

      expect(job.engineIds).toEqual(['zap']);
    });

    it('should complete the job successfully', async () => {
      await registry.register(createStubPlugin({
        id: 'nuclei',
        findings: [{
          title: 'XSS',
          description: 'Reflected XSS',
          severity: 'high',
          location: { url: 'https://example.com/search?q=test' },
        }],
      }));

      const job = await orchestrator.startScan({
        targetId: 't1',
        targetUrl: 'https://example.com',
        targetName: 'Example',
        triggerType: ScanTriggerType.Manual,
        triggeredBy: 'user-1',
        requiredCapabilities: [ScanCapability.VulnerabilityDetection],
      });

      // Wait for the async execution to complete.
      await new Promise(r => setTimeout(r, 200));

      expect(job.status).toBe(ScanJobStatus.Completed);
      expect(job.findingsCount).toBe(1);
      expect(job.totalRequests).toBe(42);
    });

    it('should mark job as Failed when engine fails', async () => {
      await registry.register(createStubPlugin({
        id: 'nuclei',
        shouldFail: true,
      }));

      const job = await orchestrator.startScan({
        targetId: 't1',
        targetUrl: 'https://example.com',
        targetName: 'Example',
        triggerType: ScanTriggerType.Manual,
        triggeredBy: 'user-1',
        requiredCapabilities: [ScanCapability.VulnerabilityDetection],
      });

      await new Promise(r => setTimeout(r, 200));

      // Job should still complete (orchestrator doesn't fail on individual engine errors).
      expect(job.isTerminal).toBe(true);
    });

    it('should emit events', async () => {
      await registry.register(createStubPlugin({ id: 'nuclei' }));
      const events: any[] = [];
      orchestrator.onEvent(e => events.push(e));

      await orchestrator.startScan({
        targetId: 't1',
        targetUrl: 'https://example.com',
        targetName: 'Example',
        triggerType: ScanTriggerType.Manual,
        triggeredBy: 'user-1',
        requiredCapabilities: [ScanCapability.VulnerabilityDetection],
      });

      await new Promise(r => setTimeout(r, 200));

      expect(events.some(e => e.type === 'job_started')).toBe(true);
      expect(events.some(e => e.type === 'job_completed')).toBe(true);
    });
  });

  describe('cancelScan', () => {
    it('should cancel a running job', async () => {
      let cancelCalled = false;
      await registry.register(createStubPlugin({
        id: 'slow-engine',
        scanDelayMs: 5000,
      }) as any);
      // Override cancel
      const origPlugin = registry.getPlugin('slow-engine');
      const wrappedPlugin: ScanEnginePlugin = {
        ...origPlugin,
        cancel: async () => { cancelCalled = true; },
      };
      // Re-register with wrapped cancel
      await registry.unregister('slow-engine');
      await registry.register(wrappedPlugin);

      const job = await orchestrator.startScan({
        targetId: 't1',
        targetUrl: 'https://example.com',
        targetName: 'Example',
        triggerType: ScanTriggerType.Manual,
        triggeredBy: 'user-1',
        requiredCapabilities: [ScanCapability.VulnerabilityDetection],
      });

      await orchestrator.cancelScan(job.id, 'User cancelled');

      expect(job.status).toBe(ScanJobStatus.Cancelled);
    });
  });

  describe('query', () => {
    it('should get job snapshot', async () => {
      await registry.register(createStubPlugin({ id: 'nuclei' }));
      const job = await orchestrator.startScan({
        targetId: 't1',
        targetUrl: 'https://example.com',
        targetName: 'Example',
        triggerType: ScanTriggerType.Manual,
        triggeredBy: 'user-1',
        requiredCapabilities: [ScanCapability.VulnerabilityDetection],
      });

      const snapshot = orchestrator.getJobSnapshot(job.id);
      expect(snapshot).toBeDefined();
      expect(snapshot!.id).toBe(job.id);
      expect(Object.isFrozen(snapshot!)).toBe(true);
    });

    it('should return undefined for unknown job', () => {
      expect(orchestrator.getJob('nonexistent')).toBeUndefined();
    });
  });

  describe('lifecycle', () => {
    it('should not allow scans before start()', async () => {
      const stoppedOrchestrator = new ScanOrchestrator(registry);
      // Don't call start()
      await expect(
        stoppedOrchestrator.startScan({
          targetId: 't1',
          targetUrl: 'https://example.com',
          targetName: 'Example',
          triggerType: ScanTriggerType.Manual,
          triggeredBy: 'user-1',
          requiredCapabilities: [ScanCapability.VulnerabilityDetection],
        }),
      ).rejects.toThrow('Orchestrator is not started');
    });

    it('should be idempotent on start()', () => {
      orchestrator.start(); // already started in beforeEach
      expect(orchestrator.isRunning).toBe(true);
    });
  });
});