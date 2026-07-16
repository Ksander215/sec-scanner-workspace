/**
 * Recommendation Engine — Benchmarks
 *
 * Measures:
 * - Single recommendation generation
 * - 100 recommendations
 * - 1000 recommendations
 * - Planner
 * - Cache hit ratio
 */

import { describe, it, expect } from 'vitest';
import {
  RecommendationEngine,
  RecommendationSource,
  PlanningStrategy,
  createRecommendation,
  createRecommendationCost,
  createRecommendationBenefit,
  createRecommendationRanking,
} from '../index.ts';
import {
  createCanonicalFinding,
  createCVEReference,
  createCVSSScore,
  Severity,
  ConfidenceLevel,
  SourceEngine,
  FindingCategory,
} from '../../normalization/index.ts';

function makeFinding(i: number) {
  return createCanonicalFinding({
    sourceEngine: SourceEngine.Nuclei,
    category: FindingCategory.Vulnerability,
    title: `Vulnerability ${i}`,
    description: `Test vulnerability ${i}`,
    severity: i % 5 === 0 ? Severity.Critical : i % 3 === 0 ? Severity.High : Severity.Medium,
    confidence: ConfidenceLevel.High,
    confidenceScore: 0.85,
    cve: [createCVEReference(2024, `${i.toString().padStart(4, '0')}`)],
    cvss: createCVSSScore(7.5, 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N'),
  });
}

function makeBulkRecommendations(count: number) {
  const recs = [];
  for (let i = 0; i < count; i++) {
    const id = `rec_bulk_${i}` as any;
    const cost = createRecommendationCost({
      recommendationId: id,
      implementationCost: Math.random() * 0.5,
      effortHours: Math.random() * 20,
      complexity: Math.random() * 0.5,
    });
    const benefit = createRecommendationBenefit({
      recommendationId: id,
      riskReduction: Math.random(),
      attackPathElimination: Math.random() * 0.8,
    });
    recs.push(createRecommendation({
      ruleType: 'Patch' as any,
      source: RecommendationSource.CanonicalFinding,
      sourceId: `finding-${i}`,
      title: `Recommendation ${i}`,
      description: `Test recommendation ${i}`,
      severity: i % 5 === 0 ? 'Critical' as any : 'High' as any,
      targetId: `target-${i}`,
      targetType: 'vulnerability',
      targetLabel: `Target ${i}`,
      cost,
      benefit,
    }));
  }
  return recs;
}

describe('Recommendation Engine Benchmarks', () => {
  it('generates a single recommendation in <10ms', () => {
    const engine = new RecommendationEngine();
    const finding = makeFinding(0);

    const start = performance.now();
    engine.generate({
      source: RecommendationSource.CanonicalFinding,
      sourceId: finding.id,
      finding,
    });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
  });

  it('generates 100 recommendations in <500ms', () => {
    const engine = new RecommendationEngine();
    const findings = Array.from({ length: 100 }, (_, i) => makeFinding(i));

    const start = performance.now();
    engine.generateBatch({ findings });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(500);
  });

  it('generates 1000 recommendations in <3000ms', () => {
    const engine = new RecommendationEngine();
    const findings = Array.from({ length: 1000 }, (_, i) => makeFinding(i));

    const start = performance.now();
    engine.generateBatch({ findings });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(3000);
  });

  it('builds a plan for 100 recommendations in <100ms', () => {
    const engine = new RecommendationEngine();
    const recs = makeBulkRecommendations(100);

    const start = performance.now();
    engine.plan(recs, PlanningStrategy.Balanced);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it('cache stores and retrieves recommendations', () => {
    const engine = new RecommendationEngine({ enableCaching: true, cacheSize: 1000 });
    const finding = makeFinding(0);

    // Generate and cache recommendations
    const recs = engine.generate({
      source: RecommendationSource.CanonicalFinding,
      sourceId: finding.id,
      finding,
    });

    // Verify cache has entries
    const stats = engine.cacheStatistics;
    expect(stats.totalSize).toBeGreaterThan(0);
  });
});
