/**
 * Tests: Nuclei Adapter — Integration with Scan Platform
 *
 * Tests the NucleiAdapter class implementing ScanEnginePlugin.
 * Tests are designed to work WITHOUT Nuclei binary installed
 * (using mocks for the child_process calls).
 *
 * For actual integration tests with a real Nuclei binary,
 * see: __tests__/nuclei-adapter-live.test.ts (skipped by default).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NucleiAdapter } from '../nuclei-adapter.ts';
import { ScanCapability, EngineHealthStatus, ScanTriggerType } from '../../../domain/scan-platform/types/index.ts';
import { DEFAULT_SCOPE, DEFAULT_RATE_LIMIT } from '../../../domain/scan-platform/models/scan-target.ts';
import { DEFAULT_CONSTRAINTS } from '../../../domain/scan-platform/scan-context/scan-context.ts';
import type { ScanContext } from '../../../domain/scan-platform/scan-context/scan-context.ts';

// ─── Helpers ──────────────────────────────────────────────

function createTestContext(overrides?: Partial<ScanContext>): ScanContext {
  return Object.freeze({
    id: 'ctx-test-1',
    scanJobId: 'job-test-1',
    correlationId: 'corr-test-1',
    targetId: 'target-1',
    targetUrl: 'https://example.com',
    targetName: 'Example',
    authentication: { method: 'none' as const },
    headers: [],
    cookies: [],
    scope: DEFAULT_SCOPE,
    rateLimit: DEFAULT_RATE_LIMIT,
    constraints: DEFAULT_CONSTRAINTS,
    profileName: 'test',
    requiredCapabilities: [ScanCapability.VulnerabilityDetection],
    triggerType: ScanTriggerType.Manual,
    triggeredBy: 'test-user',
    createdAt: new Date().toISOString(),
    metadata: {},
    ...overrides,
  } as ScanContext);
}

// ─── Tests ─────────────────────────────────────────────────

describe('NucleiAdapter', () => {
  describe('identity and capabilities', () => {
    const adapter = new NucleiAdapter();

    it('should have correct identity fields', () => {
      expect(adapter.id).toBe('nuclei-v3');
      expect(adapter.name).toBe('Nuclei v3');
      expect(adapter.description).toContain('ProjectDiscovery');
    });

    it('should advertise relevant capabilities', () => {
      expect(adapter.capabilities).toContain(ScanCapability.VulnerabilityDetection);
      expect(adapter.capabilities).toContain(ScanCapability.ApiScanning);
      expect(adapter.capabilities).toContain(ScanCapability.DnsAnalysis);
      expect(adapter.capabilities).toContain(ScanCapability.MisconfigurationDetection);
      expect(adapter.capabilities).toContain(ScanCapability.HeaderAnalysis);
      expect(adapter.capabilities).toContain(ScanCapability.PassiveAnalysis);
    });

    it('should NOT advertise crawling or fuzzing', () => {
      // Nuclei doesn't crawl — it tests discovered URLs.
      expect(adapter.capabilities).not.toContain(ScanCapability.Crawling);
      expect(adapter.capabilities).not.toContain(ScanCapability.Fuzzing);
    });
  });

  describe('initialize — missing binary', () => {
    it('should throw when Nuclei binary is not found', async () => {
      const adapter = new NucleiAdapter({
        binaryPath: '/nonexistent/path/to/nuclei',
      });

      await expect(adapter.initialize()).rejects.toThrow('Nuclei binary not found');
    });
  });

  describe('health — missing binary', () => {
    it('should return Unhealthy when binary is not found', async () => {
      const adapter = new NucleiAdapter({
        binaryPath: '/nonexistent/path/to/nuclei',
      });

      const result = await adapter.health();
      expect(result.status).toBe(EngineHealthStatus.Unhealthy);
      expect(result.engineId).toBe('nuclei-v3');
      expect(result.message).toContain('not found');
    });
  });

  describe('shutdown', () => {
    it('should complete without error even with no active scans', async () => {
      const adapter = new NucleiAdapter();
      // No initialize() — no binary needed for shutdown.
      await expect(adapter.shutdown()).resolves.toBeUndefined();
    });
  });

  describe('cancel — no active scan', () => {
    it('should complete without error when no active scan exists', async () => {
      const adapter = new NucleiAdapter();
      await expect(adapter.cancel('nonexistent-job')).resolves.toBeUndefined();
    });
  });

  describe('configuration', () => {
    it('should use default config when none provided', () => {
      const adapter = new NucleiAdapter();
      // Should not throw — config has defaults.
      expect(adapter.id).toBe('nuclei-v3');
    });

    it('should accept custom binary path', () => {
      const adapter = new NucleiAdapter({
        binaryPath: '/opt/nuclei/bin/nuclei',
      });
      expect(adapter.id).toBe('nuclei-v3');
    });

    it('should accept custom tags', () => {
      const adapter = new NucleiAdapter({
        includeTags: ['cve', 'rce'],
        excludeTags: ['dos', 'fuzz'],
      });
      expect(adapter.id).toBe('nuclei-v3');
    });
  });

  describe('scan — missing binary (graceful failure)', () => {
    it('should return success:false when binary not found', async () => {
      const adapter = new NucleiAdapter({
        binaryPath: '/nonexistent/nuclei',
      });

      const context = createTestContext();
      const events: any[] = [];
      const onEvent = (e: any) => events.push(e);

      const result = await adapter.scan(context, onEvent);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
      expect(result.findings).toHaveLength(0);
      // Contract: MUST NOT throw.
    });
  });
});

// ─── Integration Test: Full Pipeline ──────────────────────

describe('NucleiAdapter — Full Pipeline Integration', () => {
  it('should be registrable in EngineRegistry type-wise', () => {
    // This test verifies the type contract at compile time.
    // NucleiAdapter implements ScanEnginePlugin — if this compiles, the contract is met.
    const adapter: import('../../../domain/scan-platform/plugin-api/scan-engine-plugin.ts').ScanEnginePlugin =
      new NucleiAdapter({ binaryPath: 'nuclei' });

    expect(adapter.id).toBe('nuclei-v3');
    expect(typeof adapter.initialize).toBe('function');
    expect(typeof adapter.shutdown).toBe('function');
    expect(typeof adapter.health).toBe('function');
    expect(typeof adapter.scan).toBe('function');
    expect(typeof adapter.cancel).toBe('function');
    expect(adapter.capabilities.length).toBeGreaterThan(0);
  });

  it('should produce findings compatible with Orchestrator normalization', async () => {
    // Verify that the parser output matches what the Orchestrator expects.
    const { parseNucleiOutput } = await import('../nuclei-parser.ts');

    const nucleiOutput = JSON.stringify({
      'template-id': 'xss-reflected',
      info: {
        name: 'Reflected XSS',
        severity: 'high',
        tags: ['xss', 'injection'],
        classification: { 'cwe-id': ['CWE-79'], 'cvss-score': 6.1 },
        remediation: 'Encode output contextually.',
        reference: ['https://owasp.org/www-community/attacks/xss/'],
      },
      type: 'http',
      host: 'https://example.com',
      'matched-at': 'https://example.com/search?q=<script>',
      'extracted-results': ['<script>alert(1)</script>'],
      request: 'GET /search?q=<script> HTTP/1.1',
      response: 'HTTP/1.1 200 OK\n<html>...<script>alert(1)</script>...</html>',
      'curl-command': 'curl "https://example.com/search?q=<script>"',
    });

    const { findings } = parseNucleiOutput(nucleiOutput);
    expect(findings).toHaveLength(1);

    const f = findings[0];
    // Verify all required ScanEngineFinding fields are present.
    expect(f.title).toBe('Reflected XSS');
    expect(f.description).toBeTruthy();
    expect(f.severity).toBe('high');
    expect(f.cweId).toBe('CWE-79');
    expect(f.cvssScore).toBe(6.1);
    expect(f.location.url).toBeTruthy();
    expect(f.evidence.length).toBeGreaterThan(0);
    expect(f.remediation).toBeTruthy();
    expect(f.references).toBeDefined();
    expect(f.confidence).toBe(0.85);
    expect(f.tags).toContain('xss');
    expect(f.templateId).toBe('xss-reflected');
    expect(f.engineFindingId).toBe('xss-reflected');

    // Verify no extra/foreign fields that would break the Orchestrator.
    const allowedKeys = new Set([
      'engineFindingId', 'title', 'description', 'severity', 'cweId',
      'owaspCategory', 'cvssScore', 'cvssVector', 'location', 'evidence',
      'remediation', 'references', 'confidence', 'tags', 'templateId',
    ]);
    for (const key of Object.keys(f)) {
      expect(allowedKeys.has(key)).toBe(true);
    }
  });
});

// ─── SSE Compatibility ─────────────────────────────────────

describe('Nuclei → Security State Engine Compatibility', () => {
  it('should produce findings that survive Orchestrator normalization', async () => {
    // The Orchestrator's normalizeFinding() requires these fields.
    // This test verifies the parser produces them correctly.
    const { parseNucleiOutput } = await import('../nuclei-parser.ts');

    const output = JSON.stringify({
      'template-id': 'sqli',
      info: {
        name: 'SQL Injection',
        severity: 'critical',
        classification: { 'cwe-id': ['CWE-89'], 'cvss-score': 9.8 },
      },
      type: 'http',
      host: 'https://example.com',
      'matched-at': 'https://example.com/api/users?id=1',
      'extracted-results': ["' OR 1=1--"],
    });

    const { findings } = parseNucleiOutput(output);
    const f = findings[0];

    // Fields required by Orchestrator.normalizeFinding():
    expect(f.title).toBeTruthy();       // Used as finding.title
    expect(f.severity).toBeTruthy();    // Normalized by normalizeSeverity()
    expect(f.location.url).toBeTruthy(); // Used as finding.location.url
    expect(f.description).toBeTruthy();  // Used as finding.description
    expect(f.templateId).toBeTruthy();   // Used as finding.metadata.templateId

    // Fields enriched by Orchestrator (NOT required from engine):
    // id, targetId, scanJobId, detectedBy, firstSeenAt, lastSeenAt, etc.
  });
});