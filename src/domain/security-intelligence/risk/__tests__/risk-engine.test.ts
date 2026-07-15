/**
 * Risk Engine — Full Test Suite
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RiskLevel, RiskTrend, RiskReason, RiskFactorType, AggregationScope,
  ALL_RISK_LEVELS, ALL_RISK_TRENDS, ALL_RISK_REASONS, ALL_RISK_FACTOR_TYPES, ALL_AGGREGATION_SCOPES,
  RISK_LEVEL_ORDER, RISK_LEVEL_THRESHOLDS,
  brandRiskAssessmentId, brandRiskScoreId,
  DEFAULT_RISK_FORMULA_CONFIG, DEFAULT_RISK_ENGINE_CONFIG,
  generateRiskAssessmentId, generateRiskScoreId,
  determineRiskLevel, determineRiskTrend,
  createDefaultRiskContext, createRiskContext,
  createRiskFactor, createRiskEvidence,
  createRiskScore, createRiskAssessment,
  createRiskHistoryEntry, createRiskSummary,
  createEmptyLevelDistribution, createEmptyTrendDistribution, createEmptyFactorDistribution,
  severityToNormalized, confidenceToNormalized,
  riskAssessmentToJSON, riskScoreToJSON, riskAssessmentFromJSON,
  riskAssessmentsEqual, riskScoresEqual,
  cloneRiskAssessment, hashRiskAssessment,
  createRiskCalculatedEvent, createRiskUpdatedEvent,
  createRiskChangedEvent, createRiskHistoryRecordedEvent,
  RiskEventBus,
  BUILT_IN_EVALUATORS, FactorRegistry,
  RiskFormulaEngine,
  HeuristicContextSource, KnowledgeGraphContextSource, ContextEngine,
  AggregationMethod, RiskAggregator,
  RiskHistoryManager,
  RiskCache,
  RiskEngine,
  RiskStatisticsCollector,
} from '../index.ts';
import type { RiskFactorInput, RiskAssessment } from '../index.ts';
import { brandFindingId, brandAssetId, Severity, ConfidenceLevel, FindingCategory } from '../../normalization/index.ts';
import type { FindingId, CanonicalFinding } from '../../normalization/index.ts';
import {
  createCanonicalFinding, createCVEReference, createCWEReference,
  createCVSSScore, createCanonicalURL, createAffectedAsset, createNormalizedEvidence,
} from '../../normalization/index.ts';
import {
  createCorrelationResult, createCorrelation, createCorrelationGroup,
  createEmptyResultStatistics,
} from '../../correlation/index.ts';

// ─── Helpers ─────────────────────────────────────────────

function makeFindingId(id: string): FindingId { return brandFindingId(id); }
function makeAssetId(id: string) { return brandAssetId(id); }

function createTestFinding(overrides: Record<string, any> = {}): CanonicalFinding {
  return createCanonicalFinding({
    sourceEngine: 'Nuclei' as any,
    category: overrides.category ?? FindingCategory.Vulnerability,
    title: overrides.title ?? 'Test Finding',
    description: overrides.description ?? 'Test description',
    severity: overrides.severity ?? Severity.High,
    confidence: overrides.confidence ?? ConfidenceLevel.High,
    confidenceScore: overrides.confidenceScore ?? 0.85,
    cve: overrides.cve ?? [createCVEReference({ id: 'CVE-2024-1234', year: 2024, sequence: '1234' })],
    cwe: overrides.cwe ?? [createCWEReference({ id: 'CWE-79', numericId: 79 })],
    cvss: createCVSSScore({ score: 7.5, vector: 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N', version: '3.1' }),
    affectedAsset: overrides.affectedAsset ?? createAffectedAsset({ identifier: 'test.example.com', name: 'Test' }),
    endpoint: overrides.endpoint ?? createCanonicalURL({ scheme: 'https', host: 'test.example.com', port: 443, path: '/api', query: '', fragment: '' }),
    evidence: [createNormalizedEvidence({ type: 'Request' as any, data: {} })],
    technology: overrides.technology ?? ['nginx'],
    tags: overrides.tags ?? ['production'],
    references: [],
    metadata: overrides.metadata ?? {},
  });
}

function createTestInput(overrides: Partial<RiskFactorInput> = {}): RiskFactorInput {
  return {
    findingId: makeFindingId('f1'),
    severity: Severity.High, confidence: ConfidenceLevel.High, confidenceScore: 0.85,
    category: FindingCategory.Vulnerability, cve: ['CVE-2024-1234'], cwe: ['CWE-79'],
    technology: ['nginx'], tags: ['production'],
    endpoint: 'https://test.example.com/api', affectedAsset: 'test.example.com',
    correlationScore: 0.5, correlationCount: 2, groupCount: 1,
    context: createDefaultRiskContext(), metadata: {},
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────

describe('Risk Engine', () => {

  describe('Types and Enums', () => {
    it('has all RiskLevel values', () => {
      expect(ALL_RISK_LEVELS).toHaveLength(5);
      expect(RISK_LEVEL_ORDER[RiskLevel.Critical]).toBeGreaterThan(RISK_LEVEL_ORDER[RiskLevel.High]);
    });
    it('has ascending thresholds', () => {
      expect(RISK_LEVEL_THRESHOLDS[RiskLevel.Low]).toBeLessThan(RISK_LEVEL_THRESHOLDS[RiskLevel.Medium]);
    });
    it('has all RiskTrend values', () => expect(ALL_RISK_TRENDS).toHaveLength(5));
    it('has 14 RiskFactorType values', () => expect(ALL_RISK_FACTOR_TYPES).toHaveLength(14));
    it('has all AggregationScope values', () => expect(ALL_AGGREGATION_SCOPES).toHaveLength(5));
    it('has all RiskReason values', () => expect(ALL_RISK_REASONS.length).toBeGreaterThanOrEqual(15));
    it('brands IDs', () => expect(brandRiskAssessmentId('test')).toBe('test'));
  });

  describe('Models', () => {
    it('generates unique IDs', () => {
      expect(generateRiskAssessmentId()).not.toBe(generateRiskAssessmentId());
      expect(generateRiskAssessmentId()).toMatch(/^risk_/);
    });
    it('determines RiskLevel from score', () => {
      expect(determineRiskLevel(0.0)).toBe(RiskLevel.Informational);
      expect(determineRiskLevel(0.15)).toBe(RiskLevel.Low);
      expect(determineRiskLevel(0.35)).toBe(RiskLevel.Medium);
      expect(determineRiskLevel(0.60)).toBe(RiskLevel.High);
      expect(determineRiskLevel(0.80)).toBe(RiskLevel.Critical);
      expect(determineRiskLevel(1.0)).toBe(RiskLevel.Critical);
    });
    it('clamps score in determineRiskLevel', () => {
      expect(determineRiskLevel(-0.5)).toBe(RiskLevel.Informational);
      expect(determineRiskLevel(1.5)).toBe(RiskLevel.Critical);
    });
    it('determines RiskTrend', () => {
      expect(determineRiskTrend(0.5, null)).toBe(RiskTrend.New);
      expect(determineRiskTrend(0.7, 0.5)).toBe(RiskTrend.Increasing);
      expect(determineRiskTrend(0.3, 0.5)).toBe(RiskTrend.Decreasing);
      expect(determineRiskTrend(0.52, 0.5)).toBe(RiskTrend.Stable);
      expect(determineRiskTrend(0.01, 0.5)).toBe(RiskTrend.Resolved);
    });
    it('creates default RiskContext', () => {
      const ctx = createDefaultRiskContext();
      expect(ctx.internetFacing).toBe(false);
      expect(ctx.internalOnly).toBe(true);
      expect(Object.isFrozen(ctx)).toBe(true);
    });
    it('creates RiskContext with params', () => {
      const ctx = createRiskContext({
        internetFacing: true, internalOnly: false, isProduction: true,
        isDevelopment: false, isCriticalAsset: true, authenticationChain: ['oauth'],
        dependencyCount: 5, dependentAssetCount: 10,
      });
      expect(ctx.internetFacing).toBe(true);
      expect(ctx.isCriticalAsset).toBe(true);
    });
    it('creates RiskFactor with clamped values', () => {
      const f = createRiskFactor({ type: RiskFactorType.Severity, value: 0.75, weight: 1.0, source: 'test', description: 'test' });
      expect(f.value).toBe(0.75);
      expect(f.weightedValue).toBe(0.75);
      const f2 = createRiskFactor({ type: RiskFactorType.Severity, value: 1.5, weight: 2.0, source: 'test', description: 'test' });
      expect(f2.value).toBe(1.0);
      expect(f2.weight).toBe(1.0);
    });
    it('creates RiskScore with correct level', () => {
      const ctx = createDefaultRiskContext();
      const s = createRiskScore({ rawScore: 0.75, factors: [], evidence: [], reasons: [RiskReason.HighSeverity], context: ctx, formulaVersion: '1.0.0' });
      expect(s.level).toBe(RiskLevel.High);
      expect(Object.isFrozen(s)).toBe(true);
    });
    it('creates RiskAssessment', () => {
      const ctx = createDefaultRiskContext();
      const s = createRiskScore({ rawScore: 0.5, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' });
      const a = createRiskAssessment({ findingId: makeFindingId('f1'), score: s, trend: RiskTrend.New, previousScore: null, scope: AggregationScope.Finding, scopeId: 'f1' });
      expect(a.findingId).toBe('f1');
      expect(Object.isFrozen(a)).toBe(true);
    });
    it('serializes and deserializes RiskAssessment', () => {
      const ctx = createDefaultRiskContext();
      const s = createRiskScore({ rawScore: 0.65, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' });
      const a = createRiskAssessment({ findingId: makeFindingId('f1'), score: s, trend: RiskTrend.New, previousScore: null, scope: AggregationScope.Finding, scopeId: 'f1' });
      const json = riskAssessmentToJSON(a);
      expect(json.findingId).toBe('f1');
      const restored = riskAssessmentFromJSON(json as Record<string, unknown>);
      expect(restored.findingId).toBe('f1');
      expect(restored.score.rawScore).toBe(0.65);
    });
    it('clones RiskAssessment', () => {
      const ctx = createDefaultRiskContext();
      const s = createRiskScore({ rawScore: 0.5, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' });
      const a = createRiskAssessment({ findingId: makeFindingId('f1'), score: s, trend: RiskTrend.New, previousScore: null, scope: AggregationScope.Finding, scopeId: 'f1' });
      const c = cloneRiskAssessment(a);
      expect(c.findingId).toBe(a.findingId);
    });
    it('hashes RiskAssessment', () => {
      const ctx = createDefaultRiskContext();
      const s = createRiskScore({ rawScore: 0.5, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' });
      const a = createRiskAssessment({ findingId: makeFindingId('f1'), score: s, trend: RiskTrend.New, previousScore: null, scope: AggregationScope.Finding, scopeId: 'f1' });
      expect(typeof hashRiskAssessment(a)).toBe('number');
    });
    it('normalizes severity', () => {
      expect(severityToNormalized(Severity.Critical)).toBe(1.0);
      expect(severityToNormalized(Severity.High)).toBe(0.75);
      expect(severityToNormalized(Severity.Medium)).toBe(0.50);
      expect(severityToNormalized(Severity.Low)).toBe(0.25);
      expect(severityToNormalized(Severity.Info)).toBe(0.05);
    });
    it('normalizes confidence', () => {
      expect(confidenceToNormalized(ConfidenceLevel.Confirmed)).toBe(1.0);
      expect(confidenceToNormalized(ConfidenceLevel.High)).toBe(0.85);
      expect(confidenceToNormalized(ConfidenceLevel.Low)).toBe(0.35);
    });
    it('creates empty distributions', () => {
      expect(Object.keys(createEmptyLevelDistribution())).toHaveLength(5);
      expect(Object.keys(createEmptyTrendDistribution())).toHaveLength(5);
      expect(Object.keys(createEmptyFactorDistribution())).toHaveLength(14);
    });
  });

  describe('Events', () => {
    let bus: RiskEventBus;
    beforeEach(() => { bus = new RiskEventBus(); });

    it('creates events', () => {
      const e = createRiskCalculatedEvent('e1', makeFindingId('f1'), 0.5, RiskLevel.Medium, 14, 2);
      expect(e.type).toBe('risk.calculated');
      expect(Object.isFrozen(e)).toBe(true);
    });
    it('subscribes and emits', () => {
      const received: any[] = [];
      bus.subscribe(e => received.push(e));
      bus.emit(createRiskCalculatedEvent('e1', makeFindingId('f1'), 0.5, RiskLevel.Medium, 14, 2));
      expect(received).toHaveLength(1);
    });
    it('unsubscribes', () => {
      const received: any[] = [];
      const unsub = bus.subscribe(e => received.push(e));
      unsub();
      bus.emit(createRiskCalculatedEvent('e1', makeFindingId('f1'), 0.5, RiskLevel.Medium, 14, 2));
      expect(received).toHaveLength(0);
    });
    it('clears handlers', () => {
      bus.subscribe(() => {});
      bus.clear();
      expect(bus.handlerCount).toBe(0);
    });
    it('swallows handler errors', () => {
      bus.subscribe(() => { throw new Error('boom'); });
      expect(() => bus.emit(createRiskCalculatedEvent('e1', makeFindingId('f1'), 0.5, RiskLevel.Medium, 14, 2))).not.toThrow();
    });
  });

  describe('Factor Registry', () => {
    let registry: FactorRegistry;
    beforeEach(() => { registry = new FactorRegistry(); });

    it('has 14 built-in evaluators', () => {
      expect(BUILT_IN_EVALUATORS).toHaveLength(14);
      expect(registry.size).toBe(14);
    });
    it('evaluates all factors', () => {
      const results = registry.evaluateAll(createTestInput());
      expect(results).toHaveLength(14);
      for (const r of results) expect(r.value).toBeGreaterThanOrEqual(0);
    });
    it('registers custom evaluator', () => {
      registry.register({ type: 'Custom' as any, description: 'test', evaluate: () => Object.freeze({ value: 0.5, source: 'custom', description: 'c', metadata: Object.freeze({}) }) });
      expect(registry.size).toBe(15);
    });
    it('unregisters evaluator', () => {
      expect(registry.unregister(RiskFactorType.Severity)).toBe(true);
      expect(registry.size).toBe(13);
    });
    it('resets to built-in evaluators', () => {
      registry.unregister(RiskFactorType.Severity);
      registry.reset();
      expect(registry.size).toBe(14);
    });
    it('handles evaluation errors gracefully', () => {
      registry.register({ type: 'Bad' as any, description: 'throws', evaluate: () => { throw new Error('boom'); } });
      const results = registry.evaluateAll(createTestInput());
      const badResult = results.find(r => r.source.includes('error'));
      expect(badResult?.value).toBe(0.5);
    });
    it('evaluates Severity factor correctly', () => {
      const input = createTestInput({ severity: Severity.Critical });
      const results = registry.evaluateAll(input);
      expect(results[0].value).toBe(1.0);
    });
    it('evaluates Confidence factor correctly', () => {
      const input = createTestInput({ confidence: ConfidenceLevel.Low });
      const results = registry.evaluateAll(input);
      expect(results[1].value).toBe(0.35);
    });
  });

  describe('Risk Formula', () => {
    let formula: RiskFormulaEngine;
    let registry: FactorRegistry;
    beforeEach(() => {
      registry = new FactorRegistry();
      formula = new RiskFormulaEngine(DEFAULT_RISK_FORMULA_CONFIG, registry);
    });

    it('computes a risk score', () => {
      const result = formula.compute(createTestInput());
      expect(result.rawScore).toBeGreaterThanOrEqual(0);
      expect(result.rawScore).toBeLessThanOrEqual(1);
      expect(result.factors.length).toBe(14);
    });
    it('is deterministic', () => {
      const input = createTestInput();
      expect(formula.compute(input).rawScore).toBe(formula.compute(input).rawScore);
    });
    it('produces higher scores for higher severity', () => {
      const lowInput = createTestInput({ severity: Severity.Low });
      const highInput = createTestInput({ severity: Severity.Critical });
      expect(formula.compute(highInput).rawScore).toBeGreaterThan(formula.compute(lowInput).rawScore);
    });
    it('respects configurable weights', () => {
      const custom = { ...DEFAULT_RISK_FORMULA_CONFIG, severityWeight: 1.0, confidenceWeight: 0, contextWeight: 0, exposureWeight: 0, correlationWeight: 0 };
      const f = new RiskFormulaEngine(custom, registry);
      const result = f.compute(createTestInput({ severity: Severity.Critical }));
      expect(result.rawScore).toBeCloseTo(1.0, 1);
    });
    it('produces reasons for high-risk inputs', () => {
      const input = createTestInput({ severity: Severity.Critical, tags: ['internet-facing', 'no-auth', 'exploit'], context: createRiskContext({ internetFacing: true, internalOnly: false, isProduction: true, isDevelopment: false, isCriticalAsset: true, authenticationChain: [], dependencyCount: 10, dependentAssetCount: 20 }) });
      const result = formula.compute(input);
      expect(result.reasons.length).toBeGreaterThan(0);
    });
    it('returns group values', () => {
      const result = formula.compute(createTestInput());
      expect(result.groupValues.severity).toBeGreaterThanOrEqual(0);
      expect(result.groupValues.context).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Context Engine', () => {
    it('resolves heuristic context for internet-facing', () => {
      const src = new HeuristicContextSource();
      const ctx = src.resolve('f1', { endpoint: 'https://api.example.com/v1', affectedAsset: 'api.example.com', technology: ['nginx'], tags: ['production', 'internet-facing', 'critical'], metadata: {} });
      expect(ctx.internetFacing).toBe(true);
      expect(ctx.isProduction).toBe(true);
      expect(ctx.isCriticalAsset).toBe(true);
    });
    it('identifies internal endpoints', () => {
      const src = new HeuristicContextSource();
      const ctx = src.resolve('f1', { endpoint: 'http://localhost:8080/admin', affectedAsset: 'localhost', technology: [], tags: ['internal', 'development'], metadata: {} });
      expect(ctx.internetFacing).toBe(false);
      expect(ctx.internalOnly).toBe(true);
    });
    it('resolves KG context', () => {
      const kg = new KnowledgeGraphContextSource();
      kg.registerNode('f1', { internetFacing: true, internalOnly: false, isProduction: true, isDevelopment: false, isCriticalAsset: true, authenticationChain: ['oauth2'], dependencyCount: 7, dependentAssetCount: 12 });
      const ctx = kg.resolve('f1', { endpoint: null, affectedAsset: null, technology: [], tags: [], metadata: {} });
      expect(ctx.internetFacing).toBe(true);
      expect(ctx.isCriticalAsset).toBe(true);
    });
    it('falls back for unknown KG nodes', () => {
      const kg = new KnowledgeGraphContextSource();
      const ctx = kg.resolve('unknown', { endpoint: 'http://192.168.1.1/admin', affectedAsset: '192.168.1.1', technology: [], tags: ['internal'], metadata: {} });
      expect(ctx.internalOnly).toBe(true);
    });
    it('resolves through ContextEngine', () => {
      const engine = new ContextEngine({ contextEnabled: true });
      const ctx = engine.resolve(createTestInput());
      expect(typeof ctx.internetFacing).toBe('boolean');
    });
    it('returns default context when disabled', () => {
      const engine = new ContextEngine({ contextEnabled: false });
      const ctx = engine.resolve(createTestInput());
      expect(ctx.internetFacing).toBe(false);
    });
  });

  describe('Aggregation', () => {
    let aggregator: RiskAggregator;
    let assessments: RiskAssessment[];
    beforeEach(() => {
      aggregator = new RiskAggregator();
      const ctx = createDefaultRiskContext();
      assessments = [
        createRiskAssessment({ findingId: makeFindingId('f1'), score: createRiskScore({ rawScore: 0.8, factors: [], evidence: [], reasons: [RiskReason.HighSeverity], context: ctx, formulaVersion: '1.0.0' }), trend: RiskTrend.New, previousScore: null, scope: AggregationScope.Finding, scopeId: 'f1' }),
        createRiskAssessment({ findingId: makeFindingId('f2'), score: createRiskScore({ rawScore: 0.5, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' }), trend: RiskTrend.New, previousScore: null, scope: AggregationScope.Finding, scopeId: 'f2' }),
        createRiskAssessment({ findingId: makeFindingId('f3'), score: createRiskScore({ rawScore: 0.2, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' }), trend: RiskTrend.New, previousScore: null, scope: AggregationScope.Finding, scopeId: 'f3' }),
      ];
    });
    it('aggregates all', () => {
      const s = aggregator.aggregateAll(assessments);
      expect(s.totalAssessments).toBe(3);
      expect(s.maxScore).toBe(0.8);
      expect(s.minScore).toBe(0.2);
    });
    it('handles empty', () => {
      const s = aggregator.aggregateAll([]);
      expect(s.totalAssessments).toBe(0);
    });
    it('uses Max method', () => {
      const s = new RiskAggregator(AggregationMethod.Max).aggregateAll(assessments);
      expect(s.averageScore).toBe(0.8);
    });
    it('uses GeometricMean method', () => {
      const s = new RiskAggregator(AggregationMethod.GeometricMean).aggregateAll(assessments);
      expect(s.averageScore).toBeGreaterThan(0);
    });
    it('computes level distribution', () => {
      const s = aggregator.aggregateAll(assessments);
      expect(Object.values(s.levelDistribution).reduce((a, b) => a + b, 0)).toBe(3);
    });
  });

  describe('History', () => {
    let history: RiskHistoryManager;
    beforeEach(() => { history = new RiskHistoryManager(); });

    it('records assessments', () => {
      const ctx = createDefaultRiskContext();
      const a = createRiskAssessment({ findingId: makeFindingId('f1'), score: createRiskScore({ rawScore: 0.7, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' }), trend: RiskTrend.New, previousScore: null, scope: AggregationScope.Finding, scopeId: 'f1' });
      const entry = history.record(a);
      expect(entry.rawScore).toBe(0.7);
      expect(entry.trend).toBe(RiskTrend.New);
    });
    it('tracks delta', () => {
      const ctx = createDefaultRiskContext();
      history.record(createRiskAssessment({ findingId: makeFindingId('f1'), score: createRiskScore({ rawScore: 0.5, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' }), trend: RiskTrend.New, previousScore: null, scope: AggregationScope.Finding, scopeId: 'f1' }));
      const entry = history.record(createRiskAssessment({ findingId: makeFindingId('f1'), score: createRiskScore({ rawScore: 0.7, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' }), trend: RiskTrend.Increasing, previousScore: 0.5, scope: AggregationScope.Finding, scopeId: 'f1' }));
      expect(entry.delta).toBeGreaterThan(0);
    });
    it('queries by findingId', () => {
      const ctx = createDefaultRiskContext();
      const a = createRiskAssessment({ findingId: makeFindingId('f1'), score: createRiskScore({ rawScore: 0.5, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' }), trend: RiskTrend.New, previousScore: null, scope: AggregationScope.Finding, scopeId: 'f1' });
      history.record(a);
      expect(history.getHistoryForFinding(makeFindingId('f1'))).toHaveLength(1);
    });
    it('computes statistics', () => {
      const ctx = createDefaultRiskContext();
      history.record(createRiskAssessment({ findingId: makeFindingId('f1'), score: createRiskScore({ rawScore: 0.7, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' }), trend: RiskTrend.New, previousScore: null, scope: AggregationScope.Finding, scopeId: 'f1' }));
      const stats = history.getStatistics();
      expect(stats.totalEntries).toBe(1);
      expect(stats.newCount).toBe(1);
    });
    it('clears history', () => {
      const ctx = createDefaultRiskContext();
      history.record(createRiskAssessment({ findingId: makeFindingId('f1'), score: createRiskScore({ rawScore: 0.5, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' }), trend: RiskTrend.New, previousScore: null, scope: AggregationScope.Finding, scopeId: 'f1' }));
      history.clear();
      expect(history.size).toBe(0);
    });
    it('records batch', () => {
      const ctx = createDefaultRiskContext();
      const entries = history.recordBatch([
        createRiskAssessment({ findingId: makeFindingId('f1'), score: createRiskScore({ rawScore: 0.5, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' }), trend: RiskTrend.New, previousScore: null, scope: AggregationScope.Finding, scopeId: 'f1' }),
        createRiskAssessment({ findingId: makeFindingId('f2'), score: createRiskScore({ rawScore: 0.7, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' }), trend: RiskTrend.New, previousScore: null, scope: AggregationScope.Finding, scopeId: 'f2' }),
      ]);
      expect(entries).toHaveLength(2);
    });
  });

  describe('Cache', () => {
    let cache: RiskCache;
    beforeEach(() => { cache = new RiskCache({ capacity: 100, ttlMs: 60000 }); });

    it('sets and gets values', () => {
      const ctx = createDefaultRiskContext();
      const a = createRiskAssessment({ findingId: makeFindingId('f1'), score: createRiskScore({ rawScore: 0.5, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' }), trend: RiskTrend.New, previousScore: null, scope: AggregationScope.Finding, scopeId: 'f1' });
      cache.set('k1', a);
      expect(cache.get('k1')?.findingId).toBe('f1');
    });
    it('returns null for missing keys', () => expect(cache.get('missing')).toBeNull());
    it('tracks hits and misses', () => {
      cache.get('m1');
      const ctx = createDefaultRiskContext();
      cache.set('k1', createRiskAssessment({ findingId: makeFindingId('f1'), score: createRiskScore({ rawScore: 0.5, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' }), trend: RiskTrend.New, previousScore: null, scope: AggregationScope.Finding, scopeId: 'f1' }));
      cache.get('k1');
      const stats = cache.getStatistics();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });
    it('invalidates keys', () => {
      const ctx = createDefaultRiskContext();
      cache.set('k1', createRiskAssessment({ findingId: makeFindingId('f1'), score: createRiskScore({ rawScore: 0.5, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' }), trend: RiskTrend.New, previousScore: null, scope: AggregationScope.Finding, scopeId: 'f1' }));
      expect(cache.invalidate('k1')).toBe(true);
      expect(cache.get('k1')).toBeNull();
    });
    it('supports pattern invalidation', () => {
      const ctx = createDefaultRiskContext();
      for (let i = 0; i < 5; i++) cache.set(`risk_f${i}`, createRiskAssessment({ findingId: makeFindingId(`f${i}`), score: createRiskScore({ rawScore: 0.5, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' }), trend: RiskTrend.New, previousScore: null, scope: AggregationScope.Finding, scopeId: `f${i}` }));
      expect(cache.invalidatePattern('risk_*')).toBe(5);
    });
    it('evicts LRU entries', () => {
      const small = new RiskCache({ capacity: 3, ttlMs: 60000 });
      const ctx = createDefaultRiskContext();
      for (let i = 0; i < 5; i++) small.set(`k${i}`, createRiskAssessment({ findingId: makeFindingId(`f${i}`), score: createRiskScore({ rawScore: 0.5, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' }), trend: RiskTrend.New, previousScore: null, scope: AggregationScope.Finding, scopeId: `f${i}` }));
      expect(small.size).toBe(3);
      expect(small.getStatistics().evictions).toBeGreaterThan(0);
    });
    it('clears cache', () => {
      const ctx = createDefaultRiskContext();
      cache.set('k1', createRiskAssessment({ findingId: makeFindingId('f1'), score: createRiskScore({ rawScore: 0.5, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' }), trend: RiskTrend.New, previousScore: null, scope: AggregationScope.Finding, scopeId: 'f1' }));
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  describe('Statistics', () => {
    let collector: RiskStatisticsCollector;
    beforeEach(() => { collector = new RiskStatisticsCollector(); });

    it('records assessments', () => {
      collector.recordAssessment(10, RiskLevel.High, RiskTrend.New, [RiskFactorType.Severity]);
      expect(collector.totalAssessed).toBe(1);
    });
    it('records failures', () => {
      collector.recordFailure();
      expect(collector.totalFailed).toBe(1);
    });
    it('collects statistics', () => {
      collector.recordAssessment(10, RiskLevel.High, RiskTrend.New, [RiskFactorType.Severity]);
      const s = collector.collect();
      expect(s.totalAssessed).toBe(1);
      expect(s.levelDistribution[RiskLevel.High]).toBe(1);
    });
    it('resets', () => {
      collector.recordAssessment(10, RiskLevel.High, RiskTrend.New, []);
      collector.reset();
      expect(collector.totalAssessed).toBe(0);
    });
  });

  describe('RiskEngine Integration', () => {
    let engine: RiskEngine;
    beforeEach(() => { engine = new RiskEngine({ engineId: 'test' }); });

    it('calculates risk for a single finding', () => {
      const a = engine.calculate(createTestFinding());
      expect(a.score.rawScore).toBeGreaterThanOrEqual(0);
      expect(a.score.rawScore).toBeLessThanOrEqual(1);
      expect(a.score.factors.length).toBe(14);
      expect(a.trend).toBe(RiskTrend.New);
    });
    it('calculates risk without correlation result', () => {
      const a = engine.calculate(createTestFinding(), null);
      expect(a.score.rawScore).toBeGreaterThan(0);
    });
    it('calculates batch', () => {
      const findings = Array.from({ length: 10 }, (_, i) => createTestFinding({ severity: [Severity.Info, Severity.Low, Severity.Medium, Severity.High, Severity.Critical][i % 5] as Severity }));
      const assessments = engine.calculateBatch(findings);
      expect(assessments).toHaveLength(10);
    });
    it('aggregates assessments', () => {
      const findings = Array.from({ length: 5 }, () => createTestFinding());
      const assessments = engine.calculateBatch(findings);
      const summary = engine.aggregate(assessments, AggregationScope.Scan, 'scan_1');
      expect(summary.totalAssessments).toBe(5);
    });
    it('tracks history', () => {
      const f = createTestFinding();
      engine.calculate(f);
      expect(engine.history(f.id).length).toBeGreaterThanOrEqual(1);
    });
    it('emits events', () => {
      const events: any[] = [];
      engine.eventBus.subscribe(e => events.push(e));
      engine.calculate(createTestFinding());
      expect(events.some(e => e.type === 'risk.calculated')).toBe(true);
    });
    it('returns statistics', () => {
      engine.calculate(createTestFinding());
      expect(engine.statistics().totalAssessed).toBe(1);
    });
    it('resets engine', () => {
      engine.calculate(createTestFinding());
      engine.reset();
      expect(engine.statistics().totalAssessed).toBe(0);
    });
    it('gives High or Critical for Critical+internet+exploit+critical', () => {
      const a = engine.calculate(createTestFinding({ severity: Severity.Critical, confidence: ConfidenceLevel.Confirmed, tags: ['internet-facing', 'no-auth', 'exploit', 'production', 'critical', 'mission-critical'], technology: ['nginx', 'deprecated-php', 'flash'] }));
      // Composite formula may produce High or Critical depending on factor interactions
      expect([RiskLevel.High, RiskLevel.Critical]).toContain(a.score.level);
      expect(a.score.rawScore).toBeGreaterThanOrEqual(0.6);
    });
    it('gives Informational or Low for Info+internal+mitigated', () => {
      const a = engine.calculate(createTestFinding({ severity: Severity.Info, confidence: ConfidenceLevel.Unknown, tags: ['internal', 'development', 'mitigated', 'requires-auth'], technology: [] }));
      // Composite formula may produce Informational or Low depending on factor interactions
      expect([RiskLevel.Informational, RiskLevel.Low]).toContain(a.score.level);
      expect(a.score.rawScore).toBeLessThan(0.35);
    });
    it('is deterministic', () => {
      const f = createTestFinding({ severity: Severity.High });
      expect(engine.calculate(f).score.rawScore).toBe(engine.calculate(f).score.rawScore);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty fields', () => {
      const engine = new RiskEngine();
      const a = engine.calculate(createTestFinding({ technology: [], tags: [], cve: [], cwe: [] }));
      expect(a.score.rawScore).toBeGreaterThanOrEqual(0);
    });
    it('handles empty batch', () => {
      expect(new RiskEngine().calculateBatch([])).toHaveLength(0);
    });
    it('handles zero weights', () => {
      const registry = new FactorRegistry();
      // Zero total weights should throw in constructor (FIX #13)
      expect(() => new RiskFormulaEngine({ ...DEFAULT_RISK_FORMULA_CONFIG, severityWeight: 0, confidenceWeight: 0, contextWeight: 0, exposureWeight: 0, correlationWeight: 0 }, registry)).toThrow();
    });
    it('handles default config', () => {
      expect(DEFAULT_RISK_ENGINE_CONFIG.engineId).toBe('default');
      expect(DEFAULT_RISK_FORMULA_CONFIG.severityWeight + DEFAULT_RISK_FORMULA_CONFIG.confidenceWeight + DEFAULT_RISK_FORMULA_CONFIG.contextWeight + DEFAULT_RISK_FORMULA_CONFIG.exposureWeight + DEFAULT_RISK_FORMULA_CONFIG.correlationWeight).toBeCloseTo(1.0);
    });
  });
});
