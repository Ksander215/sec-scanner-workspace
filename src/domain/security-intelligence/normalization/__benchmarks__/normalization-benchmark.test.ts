/**
 * Security Intelligence Normalization Engine — Benchmarks
 *
 * Performance benchmarks for the normalization pipeline:
 * - Latency per finding (single normalization)
 * - Throughput (findings/second)
 * - Memory usage
 * - Batch processing at 100, 1K, 10K, 100K scales
 *
 * Metrics tracked:
 * - Normalization latency (ms)
 * - Batch processing time (ms)
 * - Throughput (findings/sec)
 * - Memory delta (bytes)
 */

import { describe, it, expect } from 'vitest';
import { FindingNormalizationEngine } from '../engine/index.ts';
import type { RawFinding } from '../types/index.ts';
import { normalizeSeverity } from '../normalizers/severity/index.ts';
import { normalizeCWE } from '../normalizers/cwe-cve/index.ts';
import { normalizeURL } from '../normalizers/url/index.ts';

// ─── Helpers ─────────────────────────────────────────────────

function generateRawFindings(count: number): RawFinding[] {
  const severities = ['info', 'low', 'medium', 'high', 'critical'];
  const sources = ['Nuclei', 'browser-intelligence', 'HTTPIntelligence', 'discovery-engine'];
  const categories = ['vulnerability', 'misconfiguration', 'exposure', 'injection', 'xss'];

  return Array.from({ length: count }, (_, i) => ({
    sourceEngine: sources[i % sources.length],
    title: `Finding ${i}: ${categories[i % categories.length]} vulnerability detected`,
    description: `Description for finding ${i}. This is a ${categories[i % categories.length]} type finding with severity ${severities[i % severities.length]}. The finding was detected by ${sources[i % sources.length]} scanner during routine assessment.`,
    severity: severities[i % severities.length],
    cwe: i % 3 === 0 ? `CWE-${79 + (i % 20)}` : undefined,
    cve: i % 5 === 0 ? `CVE-2024-${1000 + i}` : undefined,
    endpoint: `https://example-${i % 10}.com/api/v1/resource/${i}`,
    affectedAsset: `app-${i % 5}.example.com`,
    references: i % 2 === 0 ? ['https://owasp.org/www-project-top-ten/'] : [],
    evidence: i % 4 === 0 ? [{ method: 'GET', url: `/api/v1/resource/${i}` }] : undefined,
  }));
}

function getMemoryUsage(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed;
  }
  return 0;
}

// ═══════════════════════════════════════════════════════════════
// SINGLE FINDING LATENCY
// ═══════════════════════════════════════════════════════════════

describe('Single Finding Latency', () => {
  const engine = new FindingNormalizationEngine({ engineId: 'bench-single' });

  it('should normalize a minimal finding in <1ms', () => {
    const start = performance.now();
    engine.normalize({ sourceEngine: 'Nuclei', title: 'Test', severity: 'high' });
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1);
  });

  it('should normalize a fully populated finding in <2ms', () => {
    const raw: RawFinding = {
      sourceEngine: 'Nuclei',
      title: 'SQL Injection in Login Form',
      description: 'A SQL injection vulnerability was found in the login endpoint',
      severity: 'critical',
      cwe: 'CWE-89',
      cve: 'CVE-2024-1234',
      cvss: 9.8,
      endpoint: 'https://example.com/login',
      affectedAsset: 'example.com',
      evidence: [{ method: 'POST', url: '/login' }],
      references: ['https://owasp.org'],
    };

    const start = performance.now();
    const result = engine.normalize(raw);
    const duration = performance.now() - start;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(2);
  });

  it('should normalize 100 individual findings with average <1ms each', () => {
    const raws = generateRawFindings(100);
    const start = performance.now();

    for (const raw of raws) {
      engine.normalize(raw);
    }

    const totalDuration = performance.now() - start;
    const avgMs = totalDuration / 100;

    expect(avgMs).toBeLessThan(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// BATCH PROCESSING
// ═══════════════════════════════════════════════════════════════

describe('Batch Processing', () => {
  it('should process 100 findings batch', () => {
    const engine = new FindingNormalizationEngine({ engineId: 'bench-100' });
    const raws = generateRawFindings(100);

    const start = performance.now();
    const result = engine.normalizeBatch(raws);
    const duration = performance.now() - start;

    expect(result.succeeded).toBe(100);
    expect(result.throughputPerSecond).toBeGreaterThan(100);
  });

  it('should process 1,000 findings batch', () => {
    const engine = new FindingNormalizationEngine({ engineId: 'bench-1k' });
    const raws = generateRawFindings(1_000);

    const start = performance.now();
    const result = engine.normalizeBatch(raws);
    const duration = performance.now() - start;

    expect(result.succeeded).toBe(1_000);
    expect(result.throughputPerSecond).toBeGreaterThan(100);
  });

  it('should process 10,000 findings batch', () => {
    const engine = new FindingNormalizationEngine({ engineId: 'bench-10k' });
    const raws = generateRawFindings(10_000);

    const start = performance.now();
    const result = engine.normalizeBatch(raws);
    const duration = performance.now() - start;

    expect(result.succeeded).toBe(10_000);
    expect(duration).toBeLessThan(30_000); // <30s
    expect(result.throughputPerSecond).toBeGreaterThan(50);
  });

  it('should process 100,000 findings batch', () => {
    const engine = new FindingNormalizationEngine({ engineId: 'bench-100k' });
    const raws = generateRawFindings(100_000);

    const start = performance.now();
    const result = engine.normalizeBatch(raws);
    const duration = performance.now() - start;

    expect(result.succeeded).toBe(100_000);
    expect(duration).toBeLessThan(120_000); // <2 minutes
  });
});

// ═══════════════════════════════════════════════════════════════
// THROUGHPUT
// ═══════════════════════════════════════════════════════════════

describe('Throughput', () => {
  it('should achieve >1,000 findings/sec for simple findings', () => {
    const engine = new FindingNormalizationEngine({ engineId: 'bench-throughput' });
    const raws = Array.from({ length: 5_000 }, (_, i) => ({
      sourceEngine: 'Nuclei',
      title: `Finding ${i}`,
      severity: 'medium',
    }));

    const result = engine.normalizeBatch(raws);
    expect(result.throughputPerSecond).toBeGreaterThan(1000);
  });

  it('should achieve >500 findings/sec for complex findings', () => {
    const engine = new FindingNormalizationEngine({ engineId: 'bench-throughput-complex' });
    const raws = generateRawFindings(5_000);

    const result = engine.normalizeBatch(raws);
    expect(result.throughputPerSecond).toBeGreaterThan(500);
  });
});

// ═══════════════════════════════════════════════════════════════
// MEMORY
// ═══════════════════════════════════════════════════════════════

describe('Memory Usage', () => {
  it('should not exceed 50MB for 10K findings', () => {
    const memBefore = getMemoryUsage();
    const engine = new FindingNormalizationEngine({ engineId: 'bench-mem' });
    const raws = generateRawFindings(10_000);

    engine.normalizeBatch(raws);

    const memAfter = getMemoryUsage();
    const memDelta = memAfter - memBefore;

    // Only check if we can measure memory
    if (memBefore > 0 && memAfter > 0) {
      expect(memDelta).toBeLessThan(50 * 1024 * 1024); // 50MB
    }
  });

  it('should report memory in statistics', () => {
    const engine = new FindingNormalizationEngine({ engineId: 'bench-mem-stats' });
    engine.normalizeBatch(generateRawFindings(100));

    const stats = engine.statistics();
    expect(stats.memoryUsageBytes).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// INDIVIDUAL NORMALIZER BENCHMARKS
// ═══════════════════════════════════════════════════════════════

describe('Individual Normalizer Performance', () => {
  it('should normalize severity in <0.05ms per call', () => {
    const start = performance.now();
    for (let i = 0; i < 10_000; i++) {
      normalizeSeverity('high', 'Nuclei');
    }
    const duration = performance.now() - start;
    expect(duration / 10_000).toBeLessThan(0.05);
  });

  it('should normalize CWE in <0.05ms per call', () => {
    const start = performance.now();
    for (let i = 0; i < 10_000; i++) {
      normalizeCWE('CWE-79');
    }
    const duration = performance.now() - start;
    expect(duration / 10_000).toBeLessThan(0.05);
  });

  it('should normalize URLs in <0.1ms per call', () => {
    const start = performance.now();
    for (let i = 0; i < 10_000; i++) {
      normalizeURL('https://example.com/api/users?a=1&b=2');
    }
    const duration = performance.now() - start;
    expect(duration / 10_000).toBeLessThan(0.1);
  });
});
