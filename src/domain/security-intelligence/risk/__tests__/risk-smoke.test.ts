/**
 * Risk Engine — Quick smoke test
 */
import { describe, it, expect } from 'vitest';
import {
  RiskLevel, RiskTrend, RiskFactorType, AggregationScope,
  ALL_RISK_LEVELS, ALL_RISK_FACTOR_TYPES,
  RISK_LEVEL_THRESHOLDS, RISK_LEVEL_ORDER,
  determineRiskLevel, determineRiskTrend,
  createDefaultRiskContext, createRiskContext,
  createRiskFactor, createRiskScore, createRiskAssessment,
  RiskEventBus, createRiskCalculatedEvent,
  FactorRegistry,
  RiskCache,
  RiskHistoryManager,
} from '../index.ts';
import { brandFindingId, Severity, ConfidenceLevel } from '../../normalization/index.ts';

describe('Risk Engine Smoke Tests', () => {
  it('should have correct enums', () => {
    expect(ALL_RISK_LEVELS).toHaveLength(5);
    expect(ALL_RISK_FACTOR_TYPES).toHaveLength(14);
  });

  it('should determine risk level', () => {
    expect(determineRiskLevel(0.0)).toBe(RiskLevel.Informational);
    expect(determineRiskLevel(0.85)).toBe(RiskLevel.Critical);
  });

  it('should determine risk trend', () => {
    expect(determineRiskTrend(0.5, null)).toBe(RiskTrend.New);
    expect(determineRiskTrend(0.7, 0.5)).toBe(RiskTrend.Increasing);
  });

  it('should create risk context', () => {
    const ctx = createDefaultRiskContext();
    expect(ctx.internetFacing).toBe(false);
    expect(Object.isFrozen(ctx)).toBe(true);
  });

  it('should create risk score', () => {
    const ctx = createDefaultRiskContext();
    const score = createRiskScore({
      rawScore: 0.75,
      factors: [],
      evidence: [],
      reasons: [],
      context: ctx,
      formulaVersion: '1.0.0',
    });
    expect(score.rawScore).toBe(0.75);
    expect(score.level).toBe(RiskLevel.High);
  });

  it('should create risk assessment', () => {
    const ctx = createDefaultRiskContext();
    const score = createRiskScore({
      rawScore: 0.5, factors: [], evidence: [], reasons: [],
      context: ctx, formulaVersion: '1.0.0',
    });
    const assessment = createRiskAssessment({
      findingId: brandFindingId('f1'),
      score, trend: RiskTrend.New, previousScore: null,
      scope: AggregationScope.Finding, scopeId: 'f1',
    });
    expect(assessment.findingId).toBe('f1');
    expect(Object.isFrozen(assessment)).toBe(true);
  });

  it('should emit and receive events', () => {
    const bus = new RiskEventBus();
    const events: any[] = [];
    bus.subscribe(e => events.push(e));
    bus.emit(createRiskCalculatedEvent('e1', brandFindingId('f1'), 0.5, RiskLevel.Medium, 14, 2));
    expect(events).toHaveLength(1);
  });

  it('should evaluate all factors', () => {
    const registry = new FactorRegistry();
    expect(registry.size).toBe(14);
    const input = {
      findingId: brandFindingId('f1'),
      severity: Severity.High,
      confidence: ConfidenceLevel.High,
      confidenceScore: 0.85,
      category: 'Vulnerability' as any,
      cve: ['CVE-2024-1234'],
      cwe: ['CWE-79'],
      technology: ['nginx'],
      tags: ['production'],
      endpoint: 'https://example.com',
      affectedAsset: 'example.com',
      correlationScore: 0.5,
      correlationCount: 2,
      groupCount: 1,
      context: createDefaultRiskContext(),
      metadata: {},
    };
    const results = registry.evaluateAll(input);
    expect(results).toHaveLength(14);
    for (const r of results) {
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThanOrEqual(1);
    }
  });

  it('should cache risk assessments', () => {
    const cache = new RiskCache({ capacity: 10, ttlMs: 60000 });
    const ctx = createDefaultRiskContext();
    const assessment = createRiskAssessment({
      findingId: brandFindingId('f1'),
      score: createRiskScore({ rawScore: 0.5, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' }),
      trend: RiskTrend.New, previousScore: null, scope: AggregationScope.Finding, scopeId: 'f1',
    });
    cache.set('key1', assessment);
    const cached = cache.get('key1');
    expect(cached).not.toBeNull();
    expect(cached!.findingId).toBe('f1');
  });

  it('should manage history', () => {
    const history = new RiskHistoryManager();
    const ctx = createDefaultRiskContext();
    const a1 = createRiskAssessment({
      findingId: brandFindingId('f1'),
      score: createRiskScore({ rawScore: 0.5, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' }),
      trend: RiskTrend.New, previousScore: null, scope: AggregationScope.Finding, scopeId: 'f1',
    });
    history.record(a1);
    expect(history.size).toBe(1);
    const entries = history.getHistoryForFinding(brandFindingId('f1'));
    expect(entries).toHaveLength(1);
  });
});
