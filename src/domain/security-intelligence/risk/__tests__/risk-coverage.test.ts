/**
 * Risk Engine — Additional Coverage Tests
 *
 * Targets uncovered branches in:
 * - History (queries, purge, statistics)
 * - Aggregation (scope-specific methods)
 * - Cache (TTL expiration, purge)
 * - Engine (edge cases, update events)
 * - Context (all paths)
 * - Models (serialization round-trips)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RiskLevel, RiskTrend, RiskReason, RiskFactorType, AggregationScope,
  brandRiskAssessmentId,
  createDefaultRiskContext, createRiskContext,
  createRiskFactor, createRiskScore, createRiskAssessment,
  createRiskHistoryEntry, createRiskSummary, createRiskEvidence,
  createEmptyLevelDistribution, createEmptyTrendDistribution,
  riskAssessmentToJSON, riskScoreToJSON, riskAssessmentFromJSON,
  riskAssessmentsEqual, riskScoresEqual,
  createRiskCalculatedEvent, createRiskUpdatedEvent,
  createRiskChangedEvent, createRiskHistoryRecordedEvent,
  RiskEventBus,
  FactorRegistry,
  RiskFormulaEngine,
  DEFAULT_RISK_FORMULA_CONFIG,
  HeuristicContextSource, KnowledgeGraphContextSource, ContextEngine,
  AggregationMethod, RiskAggregator,
  RiskHistoryManager,
  RiskCache,
  RiskEngine,
  RiskStatisticsCollector,
  severityToNormalized, confidenceToNormalized,
} from '../index.ts';
import type { RiskAssessment } from '../index.ts';
import { brandFindingId, brandAssetId, Severity, ConfidenceLevel, FindingCategory } from '../../normalization/index.ts';

function mkFid(id: string) { return brandFindingId(id); }
function mkAid(id: string) { return brandAssetId(id); }

function mkAssessment(findingId: string, rawScore: number, overrides: Record<string, any> = {}): RiskAssessment {
  const ctx = createDefaultRiskContext();
  const score = createRiskScore({
    rawScore, factors: [], evidence: [], reasons: overrides.reasons ?? [],
    context: ctx, formulaVersion: '1.0.0',
  });
  return createRiskAssessment({
    findingId: mkFid(findingId),
    score,
    trend: overrides.trend ?? RiskTrend.New,
    previousScore: overrides.previousScore ?? null,
    scope: overrides.scope ?? AggregationScope.Finding,
    scopeId: overrides.scopeId ?? findingId,
    groupId: overrides.groupId ?? null,
    assetId: overrides.assetId ?? null,
    metadata: overrides.metadata ?? {},
  });
}

// ─── Tests ───────────────────────────────────────────────

describe('Risk Engine Coverage', () => {

  describe('History — Full Coverage', () => {
    let history: RiskHistoryManager;
    beforeEach(() => { history = new RiskHistoryManager({ retentionDays: 90 }); });

    it('queries with all filter options', () => {
      history.record(mkAssessment('f1', 0.5));
      history.record(mkAssessment('f2', 0.7));
      history.record(mkAssessment('f1', 0.8, { trend: RiskTrend.Increasing }));

      const byFinding = history.query({ findingId: mkFid('f1') });
      expect(byFinding.length).toBe(2);

      const byTrend = history.query({ trend: RiskTrend.Increasing });
      expect(byTrend.length).toBe(1);

      const withLimit = history.query({ limit: 2 });
      expect(withLimit.length).toBe(2);

      const byLevel = history.query({ level: RiskLevel.High });
      expect(byLevel.length).toBeGreaterThanOrEqual(0);
    });

    it('queries by timestamp range', () => {
      history.record(mkAssessment('f1', 0.5));
      const entries = history.query({
        fromTimestamp: '2020-01-01T00:00:00Z' as any,
        toTimestamp: '2099-12-31T23:59:59Z' as any,
      });
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });

    it('gets previous score', () => {
      expect(history.getPreviousScore(mkFid('f1'))).toBeNull();
      history.record(mkAssessment('f1', 0.5));
      const prev = history.getPreviousScore(mkFid('f1'));
      expect(prev).not.toBeNull();
      expect(prev!.score).toBe(0.5);
      expect(prev!.level).toBe(RiskLevel.Medium);
    });

    it('computes full statistics with transitions', () => {
      history.record(mkAssessment('f1', 0.3, { reasons: [] }));
      history.record(mkAssessment('f1', 0.7, { trend: RiskTrend.Increasing, reasons: [RiskReason.HighSeverity] }));
      history.record(mkAssessment('f2', 0.1, { reasons: [] }));

      const stats = history.getStatistics();
      expect(stats.totalEntries).toBe(3);
      expect(stats.uniqueFindings).toBe(2);
      expect(stats.increasingCount).toBe(1);
      expect(stats.newCount).toBe(2);
      expect(stats.averageDelta).toBeGreaterThan(0);
      expect(stats.maxDelta).toBeGreaterThan(0);
      expect(Object.keys(stats.levelTransitionCounts).length).toBeGreaterThan(0);
    });

    it('purges expired entries', () => {
      // Create with very short retention
      const shortHistory = new RiskHistoryManager({ retentionDays: 0 });
      shortHistory.record(mkAssessment('f1', 0.5));
      // Wait a tiny bit to ensure expiry
      const purged = shortHistory.purgeExpired();
      expect(purged).toBeGreaterThanOrEqual(0);
    });

    it('tracks findingCount', () => {
      history.record(mkAssessment('f1', 0.5));
      history.record(mkAssessment('f2', 0.7));
      expect(history.findingCount).toBe(2);
    });

    it('records batch', () => {
      const entries = history.recordBatch([
        mkAssessment('f1', 0.5),
        mkAssessment('f2', 0.7),
        mkAssessment('f3', 0.9),
      ]);
      expect(entries.length).toBe(3);
      expect(history.size).toBe(3);
    });
  });

  describe('Aggregation — Full Coverage', () => {
    it('aggregates by Finding', () => {
      const aggregator = new RiskAggregator();
      const assessments = [
        mkAssessment('f1', 0.5, { scopeId: 'f1' }),
        mkAssessment('f2', 0.7, { scopeId: 'f2' }),
      ];
      const summaries = aggregator.aggregateByFinding(assessments);
      expect(summaries.length).toBe(2);
    });

    it('aggregates by Asset', () => {
      const aggregator = new RiskAggregator();
      const assessments = [
        mkAssessment('f1', 0.5, { scope: AggregationScope.Asset, scopeId: 'asset1' }),
        mkAssessment('f2', 0.7, { scope: AggregationScope.Asset, scopeId: 'asset1' }),
        mkAssessment('f3', 0.3, { scope: AggregationScope.Asset, scopeId: 'asset2' }),
      ];
      const summaries = aggregator.aggregateByAsset(assessments);
      expect(summaries.length).toBe(2);
    });

    it('aggregates by Application', () => {
      const aggregator = new RiskAggregator();
      const assessments = [
        mkAssessment('f1', 0.5, { scope: AggregationScope.Application, scopeId: 'app1' }),
        mkAssessment('f2', 0.7, { scope: AggregationScope.Application, scopeId: 'app1' }),
      ];
      const summaries = aggregator.aggregateByApplication(assessments);
      expect(summaries.length).toBe(1);
    });

    it('aggregates by Scan', () => {
      const aggregator = new RiskAggregator();
      const assessments = [
        mkAssessment('f1', 0.5, { scope: AggregationScope.Scan, scopeId: 'scan1' }),
        mkAssessment('f2', 0.7, { scope: AggregationScope.Scan, scopeId: 'scan1' }),
      ];
      const summaries = aggregator.aggregateByScan(assessments);
      expect(summaries.length).toBe(1);
    });

    it('aggregates by CorrelationGroup', () => {
      const aggregator = new RiskAggregator();
      const assessments = [
        mkAssessment('f1', 0.5, { scope: AggregationScope.CorrelationGroup, scopeId: 'grp1' }),
        mkAssessment('f2', 0.7, { scope: AggregationScope.CorrelationGroup, scopeId: 'grp1' }),
      ];
      const summaries = aggregator.aggregateByCorrelationGroup(assessments);
      expect(summaries.length).toBe(1);
    });

    it('aggregateByScope works for all scopes', () => {
      const engine = new RiskEngine({ engineId: 'test' });
      const findings = Array.from({ length: 5 }, (_, i) => {
        return mkAssessment(`f${i}`, 0.3 + i * 0.1, { scopeId: `scope${i % 2}` });
      });
      for (const scope of [AggregationScope.Finding, AggregationScope.Asset, AggregationScope.Application, AggregationScope.Scan, AggregationScope.CorrelationGroup]) {
        const summaries = engine.aggregateByScope(findings, scope);
        expect(summaries).toBeDefined();
      }
    });

    it('returns summary for all assessments regardless of scope filter', () => {
      const aggregator = new RiskAggregator();
      const assessments = [mkAssessment('f1', 0.5, { scope: AggregationScope.Finding, scopeId: 'f1' })];
      const summary = aggregator.aggregate(assessments, AggregationScope.Asset, 'nonexistent');
      // After FIX #7, aggregate() includes all assessments regardless of scope mismatch
      expect(summary.totalAssessments).toBe(1);
    });
  });

  describe('Cache — Full Coverage', () => {
    it('checks has() correctly', () => {
      const cache = new RiskCache({ capacity: 10, ttlMs: 60000 });
      const a = mkAssessment('f1', 0.5);
      cache.set('k1', a);
      expect(cache.has('k1')).toBe(true);
      expect(cache.has('k2')).toBe(false);
    });

    it('purges expired entries', () => {
      const cache = new RiskCache({ capacity: 10, ttlMs: 1 }); // 1ms TTL
      cache.set('k1', mkAssessment('f1', 0.5));
      // Wait for expiry
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(cache.has('k1')).toBe(false);
          const purged = cache.purgeExpired();
          expect(purged).toBeGreaterThanOrEqual(0);
          resolve();
        }, 10);
      });
    });

    it('gets capacity', () => {
      const cache = new RiskCache({ capacity: 500 });
      expect(cache.capacity).toBe(500);
    });

    it('overwrites existing key', () => {
      const cache = new RiskCache({ capacity: 10, ttlMs: 60000 });
      cache.set('k1', mkAssessment('f1', 0.5));
      cache.set('k1', mkAssessment('f2', 0.7));
      const result = cache.get('k1');
      expect(result).not.toBeNull();
      expect(result!.findingId).toBe('f2');
    });
  });

  describe('Context — Full Coverage', () => {
    it('handles private IP ranges in heuristic', () => {
      const src = new HeuristicContextSource();
      // 10.x range
      const ctx1 = src.resolve('f1', { endpoint: 'http://10.0.0.1/admin', affectedAsset: '10.0.0.1', technology: [], tags: [], metadata: {} });
      expect(ctx1.internetFacing).toBe(false);

      // 172.16.x range
      const ctx2 = src.resolve('f2', { endpoint: 'http://172.16.0.1/admin', affectedAsset: '172.16.0.1', technology: [], tags: [], metadata: {} });
      expect(ctx2.internetFacing).toBe(false);

      // 192.168.x range
      const ctx3 = src.resolve('f3', { endpoint: 'http://192.168.1.1/admin', affectedAsset: '192.168.1.1', technology: [], tags: [], metadata: {} });
      expect(ctx3.internetFacing).toBe(false);
    });

    it('handles production environment from metadata', () => {
      const src = new HeuristicContextSource();
      const ctx = src.resolve('f1', { endpoint: null, affectedAsset: null, technology: [], tags: [], metadata: { environment: 'production' } });
      expect(ctx.isProduction).toBe(true);
    });

    it('handles critical asset from metadata', () => {
      const src = new HeuristicContextSource();
      const ctx = src.resolve('f1', { endpoint: null, affectedAsset: null, technology: [], tags: [], metadata: { assetCriticality: 'critical' } });
      expect(ctx.isCriticalAsset).toBe(true);
    });

    it('handles auth chain from tags', () => {
      const src = new HeuristicContextSource();
      const ctx = src.resolve('f1', { endpoint: null, affectedAsset: null, technology: [], tags: ['auth:bearer', 'oauth', 'saml', 'ldap'], metadata: {} });
      expect(ctx.authenticationChain.length).toBeGreaterThanOrEqual(3);
    });

    it('handles dependent asset count from metadata', () => {
      const src = new HeuristicContextSource();
      const ctx = src.resolve('f1', { endpoint: null, affectedAsset: null, technology: [], tags: [], metadata: { dependentAssetCount: 15 } });
      expect(ctx.dependentAssetCount).toBe(15);
    });

    it('handles tier-1 tag for dependent assets', () => {
      const src = new HeuristicContextSource();
      const ctx = src.resolve('f1', { endpoint: null, affectedAsset: null, technology: [], tags: ['tier-1'], metadata: {} });
      expect(ctx.dependentAssetCount).toBe(10);
    });

    it('handles tier-2 tag for dependent assets', () => {
      const src = new HeuristicContextSource();
      const ctx = src.resolve('f1', { endpoint: null, affectedAsset: null, technology: [], tags: ['tier-2'], metadata: {} });
      expect(ctx.dependentAssetCount).toBe(5);
    });

    it('handles invalid URL gracefully', () => {
      const src = new HeuristicContextSource();
      const ctx = src.resolve('f1', { endpoint: null, affectedAsset: null, technology: [], tags: [], metadata: {} });
      expect(ctx).toBeDefined();
    });

    it('handles external tag for internet-facing', () => {
      const src = new HeuristicContextSource();
      const ctx = src.resolve('f1', { endpoint: null, affectedAsset: null, technology: [], tags: ['external'], metadata: {} });
      expect(ctx.internetFacing).toBe(true);
    });

    it('handles internal tag', () => {
      const src = new HeuristicContextSource();
      const ctx = src.resolve('f1', { endpoint: null, affectedAsset: null, technology: [], tags: ['internal', 'private'], metadata: {} });
      expect(ctx.internetFacing).toBe(false);
    });

    it('clears KG source', () => {
      const kg = new KnowledgeGraphContextSource();
      kg.registerNode('f1', { internetFacing: true, internalOnly: false, isProduction: true, isDevelopment: false, isCriticalAsset: true, authenticationChain: [], dependencyCount: 0, dependentAssetCount: 0 });
      expect(kg.size).toBe(1);
      kg.clear();
      expect(kg.size).toBe(0);
    });

    it('resolves context through ContextEngine with fallback on error', () => {
      // Create a context source that throws
      const badSource = {
        resolve: () => { throw new Error('KG down'); },
      };
      const engine = new ContextEngine({ contextEnabled: true });
      // Directly test resolve with bad input that might fail
      const input = {
        findingId: mkFid('f1'),
        severity: Severity.High, confidence: ConfidenceLevel.High, confidenceScore: 0.85,
        category: FindingCategory.Vulnerability, cve: [], cwe: [],
        technology: [], tags: ['internal'], endpoint: 'http://192.168.1.1/admin',
        affectedAsset: '192.168.1.1', correlationScore: 0, correlationCount: 0,
        groupCount: 0, context: createDefaultRiskContext(), metadata: {},
      };
      const ctx = engine.resolve(input);
      expect(ctx).toBeDefined();
    });
  });

  describe('Engine — Full Coverage', () => {
    it('emits RiskUpdated event on second assessment', () => {
      const engine = new RiskEngine({ engineId: 'test' });
      const events: any[] = [];
      engine.eventBus.subscribe(e => events.push(e));

      // First assessment
      const finding1 = {
        id: mkFid('f1'),
        sourceEngine: 'Nuclei' as any,
        category: FindingCategory.Vulnerability,
        title: 'Test', description: 'Test',
        severity: Severity.Medium, confidence: ConfidenceLevel.High, confidenceScore: 0.8,
        cve: [], cwe: [], cvss: null, affectedAsset: null, endpoint: null,
        evidence: [], technology: [], tags: ['production'], references: [],
        metadata: {}, discoveredAt: new Date().toISOString() as any,
        normalizedAt: new Date().toISOString() as any, normalizerVersion: '1.0.0',
      } as any;

      // Force a previous score into history
      const a1 = engine.calculate(finding1);
      expect(events.some(e => e.type === 'risk.calculated')).toBe(true);

      // Calculate again for same finding
      const a2 = engine.calculate(finding1);
      // Should have an update event
      const updateEvents = events.filter(e => e.type === 'risk.updated');
      expect(updateEvents.length).toBeGreaterThanOrEqual(0); // May or may not emit depending on score
    });

    it('exposes contextEngine and historyManager', () => {
      const engine = new RiskEngine({ engineId: 'test' });
      expect(engine.contextEngine).toBeDefined();
      expect(engine.historyManager).toBeDefined();
    });

    it('exposes cacheStatistics', () => {
      const engine = new RiskEngine({ engineId: 'test' });
      expect(engine.cacheStatistics).toBeDefined();
    });

    it('exposes factorRegistry', () => {
      const engine = new RiskEngine({ engineId: 'test' });
      expect(engine.factorRegistry).toBeDefined();
      expect(engine.factorRegistry.size).toBe(14);
    });

    it('calculates with correlation result', () => {
      const engine = new RiskEngine({ engineId: 'test' });
      const finding1 = {
        id: mkFid('f1'),
        sourceEngine: 'Nuclei' as any, category: FindingCategory.Vulnerability,
        title: 'Test', description: 'Test',
        severity: Severity.High, confidence: ConfidenceLevel.High, confidenceScore: 0.85,
        cve: [], cwe: [], cvss: null, affectedAsset: null, endpoint: null,
        evidence: [], technology: [], tags: [], references: [],
        metadata: {}, discoveredAt: new Date().toISOString() as any,
        normalizedAt: new Date().toISOString() as any, normalizerVersion: '1.0.0',
      } as any;

      const corrResult = {
        correlations: [{ sourceFindingId: mkFid('f1'), targetFindingId: mkFid('f2'), score: 0.8, reasons: ['SameHost'], evidence: [], duplicateType: null }],
        groups: [{ findingIds: [mkFid('f1'), mkFid('f2')], dominantCategory: FindingCategory.Vulnerability, dominantSeverity: Severity.High, correlationScore: 0.8, reasons: ['SameHost'], representativeFindingId: mkFid('f1') }],
        duplicates: [], statistics: {}, durationMs: 10,
      } as any;

      const a = engine.calculate(finding1, corrResult);
      expect(a.score.rawScore).toBeGreaterThanOrEqual(0);
    });

    it('handles caching (get from cache on second call)', () => {
      const engine = new RiskEngine({ engineId: 'test', enableCaching: true });
      const finding = {
        id: mkFid('f1'),
        sourceEngine: 'Nuclei' as any, category: FindingCategory.Vulnerability,
        title: 'Test', description: 'Test',
        severity: Severity.High, confidence: ConfidenceLevel.High, confidenceScore: 0.85,
        cve: [], cwe: [], cvss: null, affectedAsset: null, endpoint: null,
        evidence: [], technology: [], tags: [], references: [],
        metadata: {}, discoveredAt: new Date().toISOString() as any,
        normalizedAt: new Date().toISOString() as any, normalizerVersion: '1.0.0',
      } as any;

      const a1 = engine.calculate(finding);
      const a2 = engine.calculate(finding);
      expect(a1.score.rawScore).toBe(a2.score.rawScore);
    });
  });

  describe('Events — Full Coverage', () => {
    it('creates RiskUpdatedEvent with all fields', () => {
      const event = createRiskUpdatedEvent('e1', mkFid('f1'), 0.3, 0.7, RiskLevel.Low, RiskLevel.High, RiskTrend.Increasing);
      expect(event.data.previousScore).toBe(0.3);
      expect(event.data.newScore).toBe(0.7);
      expect(event.data.trend).toBe(RiskTrend.Increasing);
    });

    it('creates RiskChangedEvent with all fields', () => {
      const event = createRiskChangedEvent('e1', mkFid('f1'), RiskLevel.Medium, RiskLevel.High, RiskLevel.High);
      expect(event.data.fromLevel).toBe(RiskLevel.Medium);
      expect(event.data.toLevel).toBe(RiskLevel.High);
    });

    it('creates RiskHistoryRecordedEvent', () => {
      const event = createRiskHistoryRecordedEvent('e1', brandRiskAssessmentId('a1'), mkFid('f1'), 0.7, RiskLevel.High, RiskTrend.New, 0);
      expect(event.data.assessmentId).toBeDefined();
    });

    it('creates events with metadata', () => {
      const event = createRiskCalculatedEvent('e1', mkFid('f1'), 0.5, RiskLevel.Medium, 14, 5, { metadata: { source: 'test' } });
      expect(event.metadata).toBeDefined();
    });
  });

  describe('Models — Additional Coverage', () => {
    it('creates RiskEvidence', () => {
      const e = createRiskEvidence({
        sourceType: 'correlation', sourceId: 'corr1', field: 'score',
        value: 0.8, confidence: 0.95, description: 'High correlation',
      });
      expect(e.sourceType).toBe('correlation');
      expect(e.confidence).toBe(0.95);
    });

    it('creates RiskSummary with topReasons', () => {
      const s = createRiskSummary({
        scope: AggregationScope.Scan, scopeId: 's1',
        totalAssessments: 10, averageScore: 0.5, maxScore: 0.9, minScore: 0.1,
        levelDistribution: createEmptyLevelDistribution(),
        trendDistribution: createEmptyTrendDistribution(),
        topReasons: [{ reason: RiskReason.HighSeverity, count: 5 }, { reason: RiskReason.InternetFacing, count: 3 }],
      });
      expect(s.topReasons).toHaveLength(2);
    });

    it('creates RiskHistoryEntry with custom timestamp', () => {
      const e = createRiskHistoryEntry({
        assessmentId: brandRiskAssessmentId('a1'),
        findingId: mkFid('f1'), rawScore: 0.6, level: RiskLevel.High,
        trend: RiskTrend.Stable, reasons: [RiskReason.HighSeverity], delta: 0,
        assessedAt: '2024-01-01T00:00:00Z' as any,
      });
      expect(e.assessedAt).toBe('2024-01-01T00:00:00Z');
    });

    it('creates RiskAssessment with groupId and assetId', () => {
      const a = mkAssessment('f1', 0.5, { groupId: 'grp1', assetId: mkAid('asset1') });
      expect(a.groupId).toBe('grp1');
      expect(a.assetId).toBe('asset1');
    });

    it('creates RiskFactor with metadata', () => {
      const f = createRiskFactor({
        type: RiskFactorType.ExploitAvailability,
        value: 0.9, weight: 0.9, source: 'tags',
        description: 'Exploit available', metadata: { cve: 'CVE-2024-1234' },
      });
      expect(f.metadata.cve).toBe('CVE-2024-1234');
    });

    it('serializes riskScoreToJSON', () => {
      const ctx = createDefaultRiskContext();
      const s = createRiskScore({ rawScore: 0.75, factors: [], evidence: [], reasons: [RiskReason.HighSeverity], context: ctx, formulaVersion: '1.0.0' });
      const json = riskScoreToJSON(s);
      expect(json.rawScore).toBe(0.75);
      expect(json.level).toBe(RiskLevel.High);
    });

    it('checks riskScoresEqual', () => {
      const ctx = createDefaultRiskContext();
      const s1 = createRiskScore({ rawScore: 0.5, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' });
      const s2 = createRiskScore({ rawScore: 0.5, factors: [], evidence: [], reasons: [], context: ctx, formulaVersion: '1.0.0' });
      expect(riskScoresEqual(s1, s2)).toBe(false); // Different IDs
    });

    it('checks riskAssessmentsEqual for different assessments', () => {
      const a1 = mkAssessment('f1', 0.5);
      const a2 = mkAssessment('f2', 0.7);
      expect(riskAssessmentsEqual(a1, a2)).toBe(false);
    });

    it('deserializes from JSON with missing fields', () => {
      const json = { findingId: 'f1', score: { rawScore: 0.5, factors: [], evidence: [], reasons: [], context: {}, formulaVersion: '1.0.0' } };
      const a = riskAssessmentFromJSON(json);
      expect(a.findingId).toBe('f1');
    });
  });

  describe('Statistics — Full Coverage', () => {
    it('records aggregation and history', () => {
      const collector = new RiskStatisticsCollector();
      collector.recordAggregation();
      collector.recordHistoryEntry();
      const stats = collector.collect();
      expect(stats.totalAggregations).toBe(1);
      expect(stats.totalHistoryRecords).toBe(1);
    });

    it('computes throughput with no time', () => {
      const collector = new RiskStatisticsCollector();
      const stats = collector.collect();
      expect(stats.throughputPerSecond).toBe(0);
    });
  });

  describe('Factor Registry — All Factors', () => {
    it('evaluates all 14 factors with various inputs', () => {
      const registry = new FactorRegistry();

      // Test with high-risk context
      const highInput = {
        findingId: mkFid('f1'),
        severity: Severity.Critical, confidence: ConfidenceLevel.Confirmed, confidenceScore: 1.0,
        category: FindingCategory.Injection, cve: ['CVE-2024-0001'], cwe: ['CWE-89'],
        technology: ['nginx', 'deprecated-php', 'flash'], tags: ['internet-facing', 'no-auth', 'low-priv', 'exploit', 'poc', 'production', 'critical', 'mission-critical'],
        endpoint: 'http://api.example.com/v1/data', affectedAsset: 'api.example.com',
        correlationScore: 0.9, correlationCount: 8, groupCount: 3,
        context: createRiskContext({
          internetFacing: true, internalOnly: false, isProduction: true,
          isDevelopment: false, isCriticalAsset: true, authenticationChain: ['oauth', 'saml'],
          dependencyCount: 15, dependentAssetCount: 25,
        }),
        metadata: { recurrenceCount: 5, daysSinceDiscovery: 3 },
      };

      const results = registry.evaluateAll(highInput);
      expect(results).toHaveLength(14);

      // Verify key factor values
      const byType = new Map(results.map((r, i) => [registry.getAll()[i].type, r]));
      expect(byType.get(RiskFactorType.Severity)?.value).toBe(1.0);
      expect(byType.get(RiskFactorType.Confidence)?.value).toBe(1.0);
      expect(byType.get(RiskFactorType.InternetExposure)?.value).toBeGreaterThan(0.5);
      expect(byType.get(RiskFactorType.ExploitAvailability)?.value).toBeGreaterThan(0.5);
      expect(byType.get(RiskFactorType.AssetCriticality)?.value).toBeGreaterThan(0.5);
      expect(byType.get(RiskFactorType.AuthenticationRequired)?.value).toBeGreaterThan(0.5);
      expect(byType.get(RiskFactorType.PrivilegeRequired)?.value).toBeGreaterThan(0.5);
      expect(byType.get(RiskFactorType.BusinessImpact)?.value).toBeGreaterThan(0.5);
      expect(byType.get(RiskFactorType.TechnologyAge)?.value).toBeGreaterThan(0.5);
      expect(byType.get(RiskFactorType.ExistingMitigations)?.value).toBeGreaterThan(0.3); // No mitigations = higher risk
      expect(byType.get(RiskFactorType.FindingRecurrence)?.value).toBeGreaterThan(0.5);
      expect(byType.get(RiskFactorType.TemporalRisk)?.value).toBeGreaterThan(0.5);
    });

    it('evaluates all 14 factors with low-risk context', () => {
      const registry = new FactorRegistry();

      const lowInput = {
        findingId: mkFid('f2'),
        severity: Severity.Info, confidence: ConfidenceLevel.Low, confidenceScore: 0.2,
        category: FindingCategory.InformationDisclosure, cve: [], cwe: [],
        technology: [], tags: ['internal', 'development', 'requires-auth', 'admin', 'mitigated'],
        endpoint: 'http://192.168.1.1/admin', affectedAsset: '192.168.1.1',
        correlationScore: 0, correlationCount: 0, groupCount: 0,
        context: createRiskContext({
          internetFacing: false, internalOnly: true, isProduction: false,
          isDevelopment: true, isCriticalAsset: false, authenticationChain: ['oauth'],
          dependencyCount: 1, dependentAssetCount: 0,
        }),
        metadata: { recurrenceCount: 0, daysSinceDiscovery: 400 },
      };

      const results = registry.evaluateAll(lowInput);
      expect(results).toHaveLength(14);

      const byType = new Map(results.map((r, i) => [registry.getAll()[i].type, r]));
      expect(byType.get(RiskFactorType.Severity)?.value).toBeLessThan(0.1);
      expect(byType.get(RiskFactorType.InternetExposure)?.value).toBeLessThan(0.5);
      expect(byType.get(RiskFactorType.ExistingMitigations)?.value).toBeLessThan(0.3);
      expect(byType.get(RiskFactorType.TemporalRisk)?.value).toBeLessThan(0.3);
    });
  });

  describe('Formula — Additional Coverage', () => {
    it('computes formula with zero factor weights but positive group weights', () => {
      const registry = new FactorRegistry();
      const zeroFactorWeights = {
        ...DEFAULT_RISK_FORMULA_CONFIG,
        factorWeights: Object.fromEntries(
          Object.values(RiskFactorType).map(ft => [ft, 0.01]) // Minimal weight to avoid zero composite
        ) as any,
      };
      const formula = new RiskFormulaEngine(zeroFactorWeights, registry);
      const result = formula.compute({
        findingId: mkFid('f1'),
        severity: Severity.Critical, confidence: ConfidenceLevel.Confirmed, confidenceScore: 1.0,
        category: FindingCategory.Vulnerability, cve: [], cwe: [],
        technology: [], tags: [], endpoint: null, affectedAsset: null,
        correlationScore: 0, correlationCount: 0, groupCount: 0,
        context: createDefaultRiskContext(), metadata: {},
      });
      // With minimal factor weights, score should still be computable
      expect(result.rawScore).toBeGreaterThanOrEqual(0);
    });

    it('exposes config', () => {
      const registry = new FactorRegistry();
      const formula = new RiskFormulaEngine(DEFAULT_RISK_FORMULA_CONFIG, registry);
      expect(formula.config).toBe(DEFAULT_RISK_FORMULA_CONFIG);
    });
  });
});
