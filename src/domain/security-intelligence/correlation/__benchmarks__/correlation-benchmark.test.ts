/**
 * Security Intelligence Correlation Engine — Benchmarks
 *
 * Measures:
 * - Throughput (findings/second)
 * - Latency (ms per correlation)
 * - Memory usage
 * - Batch processing (100, 1K, 10K findings)
 * - Incremental update performance
 */

import { describe, it, expect } from 'vitest';
import { CorrelationEngine } from '../engine/index.ts';
import {
  createCanonicalFinding,
  createCVEReference,
  createCWEReference,
  createCanonicalURL,
  createAffectedAsset,
} from '../../normalization/models/index.ts';
import {
  Severity, SourceEngine, FindingCategory, ConfidenceLevel,
  EvidenceType, AssetType, brandFindingId,
} from '../../normalization/types/index.ts';
import { DuplicateDetector } from '../deduplication/index.ts';
import { CorrelationGraph } from '../graph/index.ts';
import { CorrelationCache } from '../cache/index.ts';
import { RuleRegistry } from '../rules/index.ts';
import { toCorrelationFindingInput } from '../models/index.ts';
import { createCorrelationResult, createEmptyResultStatistics } from '../models/index.ts';

// ─── Test Helpers ────────────────────────────────────────────

function generateFindings(count: number, hostCount: number = 10): any[] {
  const findings = [];
  for (let i = 0; i < count; i++) {
    const hostIndex = i % hostCount;
    const host = `host-${hostIndex}.example.com`;
    findings.push(createCanonicalFinding({
      id: brandFindingId(`fnd_bench_${i}`),
      sourceEngine: [SourceEngine.Nuclei, SourceEngine.BrowserIntelligence, SourceEngine.HTTPIntelligence, SourceEngine.DiscoveryEngine][i % 4],
      category: [FindingCategory.Vulnerability, FindingCategory.Misconfiguration, FindingCategory.Exposure, FindingCategory.InformationDisclosure][i % 4],
      title: `Vulnerability ${i} on ${host}`,
      description: `A security finding was discovered on ${host}`,
      severity: [Severity.Info, Severity.Low, Severity.Medium, Severity.High, Severity.Critical][i % 5],
      confidence: [ConfidenceLevel.Low, ConfidenceLevel.Medium, ConfidenceLevel.High, ConfidenceLevel.Confirmed][i % 4],
      confidenceScore: 0.5 + (i % 5) * 0.1,
      cve: i % 3 === 0 ? [createCVEReference(2024, String(1000 + i))] : [],
      cwe: i % 2 === 0 ? [createCWEReference([79, 89, 79, 352, 22][i % 5], 'Test CWE')] : [],
      affectedAsset: createAffectedAsset({ type: AssetType.Host, identifier: host }),
      endpoint: createCanonicalURL({ scheme: 'https', host, path: `/api/endpoint-${i % 20}`, original: `https://${host}/api/endpoint-${i % 20}` }),
      technology: [['nginx', 'php'], ['apache', 'python'], ['nodejs', 'express'], ['nginx', 'mysql']][i % 4],
      tags: [[`service:api-${i % 5}`], [`service:web-${i % 3}`]][i % 2],
    }));
  }
  return findings;
}

// ─── Latency Benchmarks ──────────────────────────────────────

describe('Correlation Latency Benchmarks', () => {
  it('should correlate 10 findings under 100ms', () => {
    const engine = new CorrelationEngine({ engineId: 'bench-latency-10' });
    const findings = generateFindings(10);
    const start = performance.now();
    const result = engine.correlate(findings);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
    expect(result.correlations.length).toBeGreaterThan(0);
  });

  it('should correlate 50 findings under 500ms', () => {
    const engine = new CorrelationEngine({ engineId: 'bench-latency-50' });
    const findings = generateFindings(50, 5);
    const start = performance.now();
    const result = engine.correlate(findings);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500);
  });
});

// ─── Throughput Benchmarks ───────────────────────────────────

describe('Correlation Throughput Benchmarks', () => {
  it('should achieve >100 findings/s for 50 findings', () => {
    const engine = new CorrelationEngine({ engineId: 'bench-throughput-50' });
    const findings = generateFindings(50, 5);
    const start = performance.now();
    engine.correlate(findings);
    const duration = performance.now() - start;
    const throughput = findings.length / (duration / 1000);
    expect(throughput).toBeGreaterThan(100);
  });
});

// ─── Batch Processing Benchmarks ─────────────────────────────

describe('Batch Processing Benchmarks', () => {
  it('should batch correlate 100 findings', () => {
    const engine = new CorrelationEngine({ engineId: 'bench-batch-100', batchSize: 50 });
    const findings = generateFindings(100, 10);
    const start = performance.now();
    const result = engine.correlateBatch(findings);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(5000);
    expect(result.statistics.totalFindings).toBeGreaterThan(0);
  });

  it('should batch correlate 1000 findings', () => {
    const engine = new CorrelationEngine({ engineId: 'bench-batch-1k', batchSize: 500 });
    const findings = generateFindings(1000, 50);
    const start = performance.now();
    const result = engine.correlateBatch(findings);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(30000);
    expect(result.statistics.totalFindings).toBeGreaterThan(0);
  });
});

// ─── Incremental Update Benchmarks ───────────────────────────

describe('Incremental Update Benchmarks', () => {
  it('should incrementally update with new findings', () => {
    const engine = new CorrelationEngine({ engineId: 'bench-incr' });
    const baseFindings = generateFindings(50, 5);
    const existingResult = engine.correlate(baseFindings);
    engine.reset();

    const newFindings = generateFindings(10, 5).map((f, i) =>
      createCanonicalFinding({
        id: brandFindingId(`fnd_new_${i}`),
        sourceEngine: SourceEngine.Nuclei,
        category: FindingCategory.Vulnerability,
        title: `New Vulnerability ${i}`,
        description: 'New finding',
        severity: Severity.High,
        confidence: ConfidenceLevel.High,
        confidenceScore: 0.9,
        cve: [createCVEReference(2024, String(5000 + i))],
        affectedAsset: createAffectedAsset({ type: AssetType.Host, identifier: 'host-0.example.com' }),
      })
    );

    const startIncremental = performance.now();
    engine.incremental(newFindings, existingResult);
    const incrementalDuration = performance.now() - startIncremental;
    expect(incrementalDuration).toBeLessThan(5000);
  });
});

// ─── Deduplication Benchmarks ────────────────────────────────

describe('Deduplication Benchmarks', () => {
  it('should deduplicate 500 findings under 5000ms', () => {
    const detector = new DuplicateDetector();
    const inputs = generateFindings(500, 20).map(f => toCorrelationFindingInput(f));
    const start = performance.now();
    const result = detector.detect(inputs);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(5000);
    expect(result.uniqueFindings.length).toBeGreaterThan(0);
  });
});

// ─── Graph Building Benchmarks ───────────────────────────────

describe('Graph Building Benchmarks', () => {
  it('should build correlation graph for 50 findings under 2000ms', () => {
    const engine = new CorrelationEngine({ engineId: 'bench-graph' });
    const findings = generateFindings(50, 5);
    const start = performance.now();
    const graph = engine.buildCorrelationGraph(findings);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(2000);
    expect(graph.nodeCount).toBe(50);
  });
});

// ─── Cache Benchmarks ───────────────────────────────────────

describe('Cache Benchmarks', () => {
  it('should achieve >10000 ops/s for cache set/get', () => {
    const cache = new CorrelationCache({ capacity: 1000, ttlMs: 60000 });
    const result = createCorrelationResult({
      correlations: [], groups: [], duplicates: [],
      statistics: createEmptyResultStatistics(0), durationMs: 0,
    });

    const iterations = 1000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      cache.set(`key_${i}`, result);
      cache.get(`key_${i}`);
    }
    const duration = performance.now() - start;
    const opsPerSecond = (iterations * 2) / (duration / 1000);
    expect(opsPerSecond).toBeGreaterThan(10000);
  });
});

// ─── Rule Evaluation Benchmarks ──────────────────────────────

describe('Rule Evaluation Benchmarks', () => {
  it('should evaluate all rules for 500 pairs under 1000ms', () => {
    const registry = new RuleRegistry();
    const inputs = generateFindings(35, 5).map(f => toCorrelationFindingInput(f));

    const start = performance.now();
    let evaluations = 0;
    for (let i = 0; i < inputs.length; i++) {
      for (let j = i + 1; j < inputs.length; j++) {
        registry.evaluateAll(inputs[i], inputs[j]);
        evaluations++;
      }
    }
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1000);
    expect(evaluations).toBeGreaterThan(0);
  });
});
