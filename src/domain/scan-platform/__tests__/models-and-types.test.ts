/**
 * Tests: Domain Models
 */

import { describe, it, expect } from 'vitest';
import { Severity, SEVERITY_WEIGHTS, SEVERITY_ORDER, ScanCapability, ScanJobStatus, TERMINAL_STATUSES, FindingStatus } from '../types/index.ts';
import { emptySeverityBreakdown, computeSeverityBreakdown, toScanSummary } from '../models/scan-result.ts';
import { toSecurityStateFinding, toSecurityStateFindings } from '../models/finding.ts';
import { ScanContextBuilder, DEFAULT_CONSTRAINTS } from '../scan-context/scan-context.ts';
import { BuiltinProfiles, DEFAULT_SCOPE, DEFAULT_RATE_LIMIT, DEFAULT_AUTH, AuthMethod } from '../models/index.ts';

// ─── Types ─────────────────────────────────────────────────

describe('Severity', () => {
  it('should have correct weight mapping', () => {
    expect(SEVERITY_WEIGHTS[Severity.Critical]).toBe(25);
    expect(SEVERITY_WEIGHTS[Severity.High]).toBe(15);
    expect(SEVERITY_WEIGHTS[Severity.Medium]).toBe(5);
    expect(SEVERITY_WEIGHTS[Severity.Low]).toBe(1);
    expect(SEVERITY_WEIGHTS[Severity.Info]).toBe(0);
  });

  it('should have ordered severity from critical to info', () => {
    expect(SEVERITY_ORDER).toEqual([
      Severity.Critical, Severity.High, Severity.Medium, Severity.Low, Severity.Info,
    ]);
  });
});

describe('ScanJobStatus', () => {
  it('should have correct terminal statuses', () => {
    expect(TERMINAL_STATUSES.has(ScanJobStatus.Completed)).toBe(true);
    expect(TERMINAL_STATUSES.has(ScanJobStatus.Failed)).toBe(true);
    expect(TERMINAL_STATUSES.has(ScanJobStatus.Cancelled)).toBe(true);
    expect(TERMINAL_STATUSES.has(ScanJobStatus.Pending)).toBe(false);
    expect(TERMINAL_STATUSES.has(ScanJobStatus.Running)).toBe(false);
  });
});

// ─── Severity Breakdown ────────────────────────────────────

describe('SeverityBreakdown', () => {
  it('should create empty breakdown', () => {
    const b = emptySeverityBreakdown();
    expect(b.critical).toBe(0);
    expect(b.high).toBe(0);
    expect(b.medium).toBe(0);
    expect(b.low).toBe(0);
    expect(b.info).toBe(0);
  });

  it('should compute breakdown from findings', () => {
    const findings = [
      { severity: 'critical' },
      { severity: 'critical' },
      { severity: 'high' },
      { severity: 'medium' },
      { severity: 'low' },
      { severity: 'info' },
    ] as any[];

    const b = computeSeverityBreakdown(findings);
    expect(b.critical).toBe(2);
    expect(b.high).toBe(1);
    expect(b.medium).toBe(1);
    expect(b.low).toBe(1);
    expect(b.info).toBe(1);
  });

  it('should handle empty findings array', () => {
    const b = computeSeverityBreakdown([]);
    expect(b.critical).toBe(0);
  });
});

// ─── SSE Compatibility ─────────────────────────────────────

describe('Security State Engine Compatibility', () => {
  const mockFinding = {
    id: 'f1',
    targetId: 't1',
    title: 'XSS',
    description: 'Cross-site scripting',
    severity: 'high' as Severity,
    status: 'open' as FindingStatus,
    cweId: 'CWE-79',
    firstSeenAt: '2026-01-01T00:00:00Z',
    lastSeenAt: '2026-01-01T00:00:00Z',
    lastResolvedAt: null,
    resolutionCount: 0,
    confidence: 0.9,
    hash: 'abc123',
    location: { url: 'https://example.com/page?q=1' },
    evidence: [{ id: 'ev1', type: 'request_response_pair' as any, content: 'GET /page?q=1', capturedAt: '2026-01-01T00:00:00Z' }],
    detectedBy: 'nuclei',
    scanJobId: 'j1',
    tags: ['xss', 'injection'],
  };

  it('toSecurityStateFinding should produce SSE-compatible output', () => {
    const sseFinding = toSecurityStateFinding(mockFinding);

    // Verify all SSE-required fields are present.
    expect(sseFinding.id).toBe('f1');
    expect(sseFinding.targetId).toBe('t1');
    expect(sseFinding.title).toBe('XSS');
    expect(sseFinding.severity).toBe('high');
    expect(sseFinding.cweId).toBe('CWE-79');
    expect(sseFinding.status).toBe('open');
    expect(sseFinding.confidence).toBe(0.9);
    expect(sseFinding.hash).toBe('abc123');
    // Extra fields (description, owaspCategory, cvssScore) should NOT be present.
    expect('description' in sseFinding).toBe(false);
    expect('owaspCategory' in sseFinding).toBe(false);
    expect('detectedBy' in sseFinding).toBe(false);
  });

  it('toSecurityStateFindings should convert array', () => {
    const results = toSecurityStateFindings([mockFinding]);
    expect(results).toHaveLength(1);
  });

  it('toScanSummary should produce SSE-compatible ScanSummary', () => {
    const scanResult = {
      id: 'sr1',
      scanJobId: 'j1',
      targetId: 't1',
      status: 'completed',
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T00:05:00Z',
      durationMs: 300000,
      findings: [],
      findingsCount: 5,
      findingsBySeverity: { critical: 1, high: 1, medium: 1, low: 1, info: 1 },
      engineResults: [],
      totalRequestsCount: 100,
      enginesUsed: 2,
      partialSuccess: false,
    } as any;

    const summary = toScanSummary(scanResult);
    expect(summary.id).toBe('sr1');
    expect(summary.targetId).toBe('t1');
    expect(summary.findingsCount).toBe(5);
    expect(summary.score).toBeNull(); // Score computed by SSE, not here.
  });
});

// ─── Scan Context Builder ──────────────────────────────────

describe('ScanContextBuilder', () => {
  it('should build with all required fields', () => {
    const ctx = new ScanContextBuilder()
      .withId('ctx-1')
      .withScanJobId('job-1')
      .withCorrelationId('corr-1')
      .withTarget('t1', 'https://example.com', 'Example')
      .build();

    expect(ctx.id).toBe('ctx-1');
    expect(ctx.scanJobId).toBe('job-1');
    expect(ctx.targetUrl).toBe('https://example.com');
    expect(ctx.scope).toEqual(DEFAULT_SCOPE);
    expect(ctx.rateLimit).toEqual(DEFAULT_RATE_LIMIT);
    expect(ctx.constraints).toEqual(DEFAULT_CONSTRAINTS);
  });

  it('should throw if required fields are missing', () => {
    expect(() => new ScanContextBuilder().build()).toThrow('id is required');
    expect(() => new ScanContextBuilder().withId('x').build()).toThrow('scanJobId is required');
  });

  it('should produce frozen objects', () => {
    const ctx = new ScanContextBuilder()
      .withId('ctx-1')
      .withScanJobId('job-1')
      .withCorrelationId('corr-1')
      .withTarget('t1', 'https://example.com', 'Example')
      .build();

    expect(Object.isFrozen(ctx)).toBe(true);
    expect(Object.isFrozen(ctx.scope)).toBe(true);
    expect(Object.isFrozen(ctx.rateLimit)).toBe(true);
  });
});

// ─── Builtin Profiles ──────────────────────────────────────

describe('BuiltinProfiles', () => {
  it('quickScan should have passive capabilities', () => {
    const profile = BuiltinProfiles.quickScan();
    expect(profile.isBuiltin).toBe(true);
    expect(profile.timeoutSeconds).toBe(300);
  });

  it('fullScan should have comprehensive capabilities', () => {
    const profile = BuiltinProfiles.fullScan();
    expect(profile.requiredCapabilities.length).toBeGreaterThan(3);
    expect(profile.timeoutSeconds).toBe(3600);
  });

  it('apiScan should focus on API', () => {
    const profile = BuiltinProfiles.apiScan();
    expect(profile.tags).toContain('api');
  });
});

// ─── Default Configs ───────────────────────────────────────

describe('Default configs', () => {
  it('DEFAULT_SCOPE should be frozen', () => {
    expect(Object.isFrozen(DEFAULT_SCOPE)).toBe(true);
    expect(DEFAULT_SCOPE.followRedirects).toBe(true);
  });

  it('DEFAULT_RATE_LIMIT should be respectful', () => {
    expect(Object.isFrozen(DEFAULT_RATE_LIMIT)).toBe(true);
    expect(DEFAULT_RATE_LIMIT.requestsPerSecond).toBe(10);
  });

  it('DEFAULT_AUTH should be none', () => {
    expect(DEFAULT_AUTH.method).toBe(AuthMethod.None);
  });

  it('DEFAULT_CONSTRAINTS should be frozen', () => {
    expect(Object.isFrozen(DEFAULT_CONSTRAINTS)).toBe(true);
    expect(DEFAULT_CONSTRAINTS.maxDurationSeconds).toBe(3600);
  });
});