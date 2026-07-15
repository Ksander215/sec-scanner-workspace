/**
 * Security Intelligence Risk Engine — Benchmarks
 *
 * Measures:
 * - Latency: single finding risk calculation
 * - Throughput: findings/sec
 * - Batch: 100, 1K, 10K, 100K findings
 * - Memory: heap usage for 10K findings
 * - Aggregation: aggregation performance
 */

import { describe, it, expect } from 'vitest';
import {
  RiskEngine, RiskLevel, RiskFactorType, AggregationScope,
  FactorRegistry, RiskFormulaEngine,
  DEFAULT_RISK_FORMULA_CONFIG,
  createDefaultRiskContext, createRiskContext,
  RiskCache, RiskHistoryManager, RiskAggregator, AggregationMethod,
} from '../index.ts';
import type { RiskFactorInput } from '../index.ts';
import {
  brandFindingId, Severity, ConfidenceLevel, FindingCategory,
  createCanonicalFinding, createCVEReference, createCWEReference,
  createCVSSScore, createCanonicalURL, createAffectedAsset, createNormalizedEvidence,
} from '../../normalization/index.ts';
import type { FindingId, CanonicalFinding } from '../../normalization/index.ts';

// ─── Helpers ─────────────────────────────────────────────

function makeFindingId(id: string): FindingId { return brandFindingId(id); }

const severities = [Severity.Info, Severity.Low, Severity.Medium, Severity.High, Severity.Critical];
const categories = Object.values(FindingCategory);
const confidenceLevels = [ConfidenceLevel.Unknown, ConfidenceLevel.Low, ConfidenceLevel.Medium, ConfidenceLevel.High, ConfidenceLevel.Confirmed];

function createBenchmarkFinding(index: number): CanonicalFinding {
  const sev = severities[index % severities.length];
  const conf = confidenceLevels[index % confidenceLevels.length];
  const cat = categories[index % categories.length];
  return createCanonicalFinding({
    sourceEngine: 'Nuclei' as any,
    category: cat,
    title: `Benchmark Finding ${index}`,
    description: `Benchmark description ${index}`,
    severity: sev,
    confidence: conf,
    confidenceScore: 0.5 + (index % 5) * 0.1,
    cve: index % 3 === 0 ? [createCVEReference({ id: `CVE-2024-${String(index).padStart(4, '0')}`, year: 2024, sequence: String(index).padStart(4, '0') })] : [],
    cwe: [createCWEReference({ id: `CWE-${79 + (index % 10)}`, numericId: 79 + (index % 10) })],
    cvss: createCVSSScore({ score: 3 + (index % 8), vector: 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N', version: '3.1' }),
    affectedAsset: createAffectedAsset({ identifier: `host-${index % 50}.example.com`, name: `Host ${index % 50}` }),
    endpoint: createCanonicalURL({ scheme: 'https', host: `host-${index % 50}.example.com`, port: 443, path: `/api/v${index % 3}/endpoint`, query: '', fragment: '' }),
    evidence: [],
    technology: ['nginx', 'php', 'mysql'].slice(0, 1 + (index % 3)),
    tags: ['production', 'internet-facing', 'critical'].slice(0, 1 + (index % 3)),
    references: [],
    metadata: {},
  });
}

function createBatch(size: number): CanonicalFinding[] {
  return Array.from({ length: size }, (_, i) => createBenchmarkFinding(i));
}

function createBenchmarkInput(index: number): RiskFactorInput {
  return {
    findingId: makeFindingId(`f${index}`),
    severity: severities[index % severities.length],
    confidence: confidenceLevels[index % confidenceLevels.length],
    confidenceScore: 0.5,
    category: categories[index % categories.length],
    cve: index % 3 === 0 ? [`CVE-2024-${index}`] : [],
    cwe: [`CWE-${79 + (index % 10)}`],
    technology: ['nginx'],
    tags: ['production'],
    endpoint: `https://host-${index % 50}.example.com/api`,
    affectedAsset: `host-${index % 50}.example.com`,
    correlationScore: 0.5,
    correlationCount: 2,
    groupCount: 1,
    context: createDefaultRiskContext(),
    metadata: {},
  };
}

// ─── Benchmarks ──────────────────────────────────────────

describe('Risk Engine Benchmarks', () => {

  describe('Latency', () => {
    it('should calculate single finding under 5ms', () => {
      const engine = new RiskEngine({ engineId: 'bench', enableCaching: false });
      const finding = createBenchmarkFinding(0);
      const start = performance.now();
      const assessment = engine.calculate(finding);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(5);
      expect(assessment.score.rawScore).toBeGreaterThanOrEqual(0);
    });

    it('should calculate single finding with formula engine under 2ms', () => {
      const registry = new FactorRegistry();
      const formula = new RiskFormulaEngine(DEFAULT_RISK_FORMULA_CONFIG, registry);
      const input = createBenchmarkInput(0);
      const start = performance.now();
      const result = formula.compute(input);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(2);
      expect(result.rawScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Throughput', () => {
    it('should achieve >500 findings/sec for single calculations', () => {
      const engine = new RiskEngine({ engineId: 'bench', enableCaching: false });
      const findings = createBatch(100);
      const start = performance.now();
      for (const finding of findings) {
        engine.calculate(finding);
      }
      const duration = performance.now() - start;
      const throughput = (findings.length / duration) * 1000;
      expect(throughput).toBeGreaterThan(500);
    });

    it('should achieve >1000 formula evaluations/sec', () => {
      const registry = new FactorRegistry();
      const formula = new RiskFormulaEngine(DEFAULT_RISK_FORMULA_CONFIG, registry);
      const inputs = Array.from({ length: 100 }, (_, i) => createBenchmarkInput(i));
      const start = performance.now();
      for (const input of inputs) {
        formula.compute(input);
      }
      const duration = performance.now() - start;
      const throughput = (inputs.length / duration) * 1000;
      expect(throughput).toBeGreaterThan(1000);
    });
  });

  describe('Batch Processing', () => {
    it('should process 100 findings under 1 second', () => {
      const engine = new RiskEngine({ engineId: 'bench', enableCaching: false });
      const findings = createBatch(100);
      const start = performance.now();
      const assessments = engine.calculateBatch(findings);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1000);
      expect(assessments).toHaveLength(100);
    });

    it('should process 1K findings under 10 seconds', () => {
      const engine = new RiskEngine({ engineId: 'bench', enableCaching: false });
      const findings = createBatch(1000);
      const start = performance.now();
      const assessments = engine.calculateBatch(findings);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10000);
      expect(assessments).toHaveLength(1000);
    });

    it('should process 10K findings under 60 seconds', () => {
      const engine = new RiskEngine({ engineId: 'bench', enableCaching: false });
      const findings = createBatch(10000);
      const start = performance.now();
      const assessments = engine.calculateBatch(findings);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(60000);
      expect(assessments).toHaveLength(10000);
    });
  });

  describe('Memory', () => {
    it('should not exceed 50MB for 10K findings', () => {
      const memBefore = process.memoryUsage().heapUsed;
      const engine = new RiskEngine({ engineId: 'bench', enableCaching: false });
      const findings = createBatch(10000);
      engine.calculateBatch(findings);
      const memAfter = process.memoryUsage().heapUsed;
      const memDelta = memAfter - memBefore;
      expect(memDelta).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Cache Performance', () => {
    it('should achieve >10,000 cache ops/sec', () => {
      const cache = new RiskCache({ capacity: 1000, ttlMs: 60000 });
      const engine = new RiskEngine({ engineId: 'bench', enableCaching: false });
      const finding = createBenchmarkFinding(0);
      const assessment = engine.calculate(finding);

      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        cache.set(`key_${i}`, assessment);
        cache.get(`key_${i}`);
      }
      const duration = performance.now() - start;
      const opsPerSec = (20000 / duration) * 1000;
      expect(opsPerSec).toBeGreaterThan(10000);
    });
  });

  describe('Aggregation Performance', () => {
    it('should aggregate 1K assessments under 100ms', () => {
      const engine = new RiskEngine({ engineId: 'bench', enableCaching: false });
      const findings = createBatch(1000);
      const assessments = engine.calculateBatch(findings);

      const aggregator = new RiskAggregator();
      const start = performance.now();
      const summary = aggregator.aggregateAll(assessments);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);
      expect(summary.totalAssessments).toBe(1000);
    });

    it('should aggregate with all 3 methods under 100ms each', () => {
      const engine = new RiskEngine({ engineId: 'bench', enableCaching: false });
      const findings = createBatch(500);
      const assessments = engine.calculateBatch(findings);

      for (const method of [AggregationMethod.Max, AggregationMethod.WeightedAverage, AggregationMethod.GeometricMean]) {
        const aggregator = new RiskAggregator(method);
        const start = performance.now();
        aggregator.aggregateAll(assessments);
        const duration = performance.now() - start;
        expect(duration).toBeLessThan(100);
      }
    });
  });

  describe('History Performance', () => {
    it('should record 1K history entries under 50ms', () => {
      const history = new RiskHistoryManager();
      const engine = new RiskEngine({ engineId: 'bench', enableCaching: false });
      const findings = createBatch(1000);
      const assessments = engine.calculateBatch(findings);

      const start = performance.now();
      for (const a of assessments) {
        history.record(a);
      }
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
      expect(history.size).toBe(1000);
    });
  });
});
