/**
 * Security Intelligence Risk Engine — Main Engine
 *
 * The main orchestrator that transforms CorrelationResults and
 * Knowledge Graph context into deterministic risk assessments.
 *
 * Public API:
 * - calculate(finding, correlationResult): RiskAssessment
 * - calculateBatch(findings, correlationResult): RiskAssessment[]
 * - aggregate(assessments, scope, scopeId): RiskSummary
 * - history(findingId): RiskHistoryEntry[]
 * - statistics(): RiskStatistics
 *
 * Architecture:
 * - Findings are converted to RiskFactorInput
 * - Context is resolved from Knowledge Graph (or heuristic fallback)
 * - All factors are evaluated through the Factor Registry
 * - Risk Formula Engine computes the deterministic score
 * - Risk History records changes over time
 * - Risk Aggregator provides scoped summaries
 * - Results are cached for performance
 * - Events are emitted for observability
 */

import type {
  RiskEngineConfig, RiskStatistics, RiskAssessment, RiskSummary,
  RiskLevel, RiskTrend, RiskHistoryEntry as RiskHistoryEntryType,
  RiskFactorInput,
} from '../types/index.ts';
import {
  DEFAULT_RISK_ENGINE_CONFIG,
  RiskLevel as RLvl, RiskTrend as RTrend, AggregationScope as AScope,
  RiskReason as RReason,
} from '../types/index.ts';
import type {
  CanonicalFinding, FindingId, Severity, ConfidenceLevel, FindingCategory,
} from '../../normalization/types/index.ts';
import type {
  CorrelationResult, CorrelationGroup,
} from '../../correlation/types/index.ts';
import {
  createRiskAssessment, createRiskScore, createDefaultRiskContext,
  determineRiskTrend,
} from '../models/index.ts';
import { FactorRegistry } from '../factors/index.ts';
import { RiskFormulaEngine } from '../formula/index.ts';
import { ContextEngine } from '../context/index.ts';
import { RiskAggregator } from '../aggregation/index.ts';
import { RiskHistoryManager } from '../history/index.ts';
import { RiskCache } from '../cache/index.ts';
import { RiskStatisticsCollector } from '../statistics/index.ts';
import {
  RiskEventBus,
  createRiskCalculatedEvent,
  createRiskUpdatedEvent,
  createRiskChangedEvent,
  createRiskHistoryRecordedEvent,
} from '../events/index.ts';

// ─── Finding to RiskFactorInput Conversion ───────────────────

/**
 * Convert a CanonicalFinding to a RiskFactorInput.
 * Uses correlation data and context to enrich the input.
 */
function toRiskFactorInput(
  finding: CanonicalFinding,
  correlationResult: CorrelationResult | null,
  contextEngine: ContextEngine,
): RiskFactorInput {
  // Find correlation data for this finding
  const findingId = finding.id;
  const correlations = correlationResult?.correlations.filter(
    c => c.sourceFindingId === findingId || c.targetFindingId === findingId
  ) ?? [];

  // Find the group this finding belongs to
  const group = correlationResult?.groups.find(
    g => g.findingIds.includes(findingId)
  ) ?? null;

  // Build the base input
  const baseInput: RiskFactorInput = {
    findingId,
    severity: finding.severity,
    confidence: finding.confidence,
    confidenceScore: finding.confidenceScore,
    category: finding.category,
    cve: finding.cve.map(c => c.id),
    cwe: finding.cwe.map(c => c.id),
    technology: finding.technology,
    tags: finding.tags,
    endpoint: finding.endpoint
      ? `${finding.endpoint.scheme}://${finding.endpoint.host}${finding.endpoint.port ? ':' + finding.endpoint.port : ''}${finding.endpoint.path}`
      : null,
    affectedAsset: finding.affectedAsset?.identifier ?? null,
    correlationScore: correlations.length > 0
      ? Math.max(...correlations.map(c => c.score))
      : 0,
    correlationCount: correlations.length,
    groupCount: group ? 1 : 0,
    context: createDefaultRiskContext(),
    metadata: finding.metadata as RiskFactorInput['metadata'],
  };

  // Resolve context
  baseInput.context = contextEngine.resolve(baseInput);

  return baseInput;
}

// ─── Risk Engine ─────────────────────────────────────────────

export class RiskEngine {
  private readonly _config: RiskEngineConfig;
  private readonly _factorRegistry: FactorRegistry;
  private readonly _formulaEngine: RiskFormulaEngine;
  private readonly _contextEngine: ContextEngine;
  private readonly _aggregator: RiskAggregator;
  private readonly _historyManager: RiskHistoryManager;
  private readonly _cache: RiskCache;
  private readonly _statisticsCollector: RiskStatisticsCollector;
  readonly eventBus: RiskEventBus;

  constructor(config: Partial<RiskEngineConfig> = {}) {
    this._config = { ...DEFAULT_RISK_ENGINE_CONFIG, ...config };
    this._factorRegistry = new FactorRegistry();
    this._formulaEngine = new RiskFormulaEngine(
      this._config.formulaConfig,
      this._factorRegistry,
    );
    this._contextEngine = new ContextEngine({
      contextEnabled: this._config.contextEnabled,
    });
    this._aggregator = new RiskAggregator();
    this._historyManager = new RiskHistoryManager({
      retentionDays: this._config.historyRetentionDays,
    });
    this._cache = new RiskCache({
      capacity: this._config.cacheSize,
      ttlMs: this._config.cacheTtlMs,
    });
    this._statisticsCollector = new RiskStatisticsCollector();
    this.eventBus = new RiskEventBus();
  }

  // ─── Public API ────────────────────────────────────────

  /**
   * Calculate risk for a single finding.
   * Uses correlation data and Knowledge Graph context.
   */
  calculate(
    finding: CanonicalFinding,
    correlationResult: CorrelationResult | null = null,
  ): RiskAssessment {
    const startTime = performance.now();

    try {
      // Check cache
      if (this._config.enableCaching) {
        const cacheKey = this.computeCacheKey(finding.id);
        const cached = this._cache.get(cacheKey);
        if (cached) {
          this._statisticsCollector.recordCacheHit();
          return cached;
        }
        this._statisticsCollector.recordCacheMiss();
      }

      // Convert to factor input
      const input = toRiskFactorInput(finding, correlationResult, this._contextEngine);

      // Compute risk score via formula
      const formulaResult = this._formulaEngine.compute(input);

      // Get previous score for trend
      const previous = this._historyManager.getPreviousScore(finding.id);
      const previousScore = previous?.score ?? null;

      // Determine trend
      const trend = determineRiskTrend(formulaResult.rawScore, previousScore);

      // Create risk score
      const score = createRiskScore({
        rawScore: formulaResult.rawScore,
        factors: formulaResult.factors,
        evidence: this.buildEvidence(finding, correlationResult),
        reasons: formulaResult.reasons,
        context: input.context,
        formulaVersion: this._config.formulaVersion,
      });

      // Create assessment
      const assessment = createRiskAssessment({
        findingId: finding.id,
        score,
        trend,
        previousScore,
        scope: AScope.Finding,
        scopeId: finding.id,
        groupId: null,
        assetId: finding.affectedAsset?.id ?? null,
      });

      // Record in history
      const historyEntry = this._historyManager.record(assessment);
      this._statisticsCollector.recordHistoryEntry();

      // Emit events
      const durationMs = performance.now() - startTime;

      this.eventBus.emit(createRiskCalculatedEvent(
        this._config.engineId,
        finding.id,
        formulaResult.rawScore,
        score.level,
        formulaResult.factors.length,
        durationMs,
      ));

      // If there was a previous assessment, emit update/change events
      if (previous && previousScore !== null) {
        this.eventBus.emit(createRiskUpdatedEvent(
          this._config.engineId,
          finding.id,
          previousScore,
          formulaResult.rawScore,
          previous.level,
          score.level,
          trend,
        ));

        if (previous.level !== score.level) {
          // FIX #2: Pass actual assessment.id as the assessmentId parameter
          this.eventBus.emit(createRiskChangedEvent(
            this._config.engineId,
            finding.id,
            previous.level,
            assessment.id,
            score.level,
          ));
        }
      }

      this.eventBus.emit(createRiskHistoryRecordedEvent(
        this._config.engineId,
        assessment.id,
        finding.id,
        formulaResult.rawScore,
        score.level,
        trend,
        historyEntry.delta,
      ));

      // Cache result
      if (this._config.enableCaching) {
        const cacheKey = this.computeCacheKey(finding.id);
        this._cache.set(cacheKey, assessment);
      }

      // Record statistics
      this._statisticsCollector.recordAssessment(
        durationMs,
        score.level,
        trend,
        formulaResult.factors.map(f => f.type),
      );

      return assessment;
    } catch (e) {
      const durationMs = performance.now() - startTime;
      this._statisticsCollector.recordFailure();

      // FIX #1: Return HIGH-risk fallback instead of zero-risk on failure
      // A failure in risk computation must never produce a false negative
      const errorScore = createRiskScore({
        rawScore: 1.0,
        factors: [],
        evidence: [],
        reasons: [RReason.CompositeRisk],
        context: createDefaultRiskContext(),
        formulaVersion: this._config.formulaVersion,
      });

      const errorAssessment = createRiskAssessment({
        findingId: finding.id,
        score: errorScore,
        trend: RTrend.New,
        previousScore: null,
        scope: AScope.Finding,
        scopeId: finding.id,
        metadata: { __error: true, __errorMessage: e instanceof Error ? e.message : 'Unknown error' },
      });

      // Emit failure event for observability
      this.eventBus.emit(createRiskCalculatedEvent(
        this._config.engineId,
        finding.id,
        1.0,
        RLvl.Critical,
        0,
        durationMs,
        { metadata: { error: true } },
      ));

      return errorAssessment;
    }
  }

  /**
   * Calculate risk for a batch of findings.
   * Supports 100, 1K, 10K, 100K batch sizes.
   */
  calculateBatch(
    findings: readonly CanonicalFinding[],
    correlationResult: CorrelationResult | null = null,
  ): readonly RiskAssessment[] {
    const startTime = performance.now();

    const assessments: RiskAssessment[] = [];

    for (const finding of findings) {
      assessments.push(this.calculate(finding, correlationResult));
    }

    const durationMs = performance.now() - startTime;
    this._statisticsCollector.recordBatch(durationMs, findings.length);

    return Object.freeze(assessments);
  }

  /**
   * Aggregate risk assessments by scope.
   */
  aggregate(
    assessments: readonly RiskAssessment[],
    scope: AggregationScope = AScope.Scan,
    scopeId: string = 'overall',
  ): RiskSummary {
    this._statisticsCollector.recordAggregation();
    // FIX #7: Pass scope and scopeId through to the aggregator
    return this._aggregator.aggregate(assessments, scope, scopeId);
  }

  /**
   * Aggregate risk assessments by specific scope type.
   */
  aggregateByScope(
    assessments: readonly RiskAssessment[],
    scope: AggregationScope,
  ): readonly RiskSummary[] {
    this._statisticsCollector.recordAggregation();
    switch (scope) {
      case AScope.Finding: return this._aggregator.aggregateByFinding(assessments);
      case AScope.Asset: return this._aggregator.aggregateByAsset(assessments);
      case AScope.Application: return this._aggregator.aggregateByApplication(assessments);
      case AScope.Scan: return this._aggregator.aggregateByScan(assessments);
      case AScope.CorrelationGroup: return this._aggregator.aggregateByCorrelationGroup(assessments);
    }
  }

  /**
   * Get risk history for a finding.
   */
  history(findingId: FindingId): readonly RiskHistoryEntryType[] {
    return this._historyManager.getHistoryForFinding(findingId);
  }

  /**
   * Get current risk engine statistics.
   */
  statistics(): RiskStatistics {
    return this._statisticsCollector.collect();
  }

  /**
   * Get the factor registry for extending factors.
   */
  get factorRegistry(): FactorRegistry {
    return this._factorRegistry;
  }

  /**
   * Get the context engine.
   */
  get contextEngine(): ContextEngine {
    return this._contextEngine;
  }

  /**
   * Get the history manager.
   */
  get historyManager(): RiskHistoryManager {
    return this._historyManager;
  }

  /**
   * Get the cache statistics.
   */
  get cacheStatistics() {
    return this._cache.getStatistics();
  }

  /**
   * Reset all engine state.
   */
  reset(): void {
    this._statisticsCollector.reset();
    this._historyManager.clear();
    this._cache.clear();
    this.eventBus.clear();
  }

  // ─── Private Helpers ───────────────────────────────────

  /** Compute a cache key for a finding (includes formula version for cache invalidation) */
  private computeCacheKey(findingId: FindingId): string {
    // FIX #3: Include formula version in cache key to prevent stale results
    return `risk_${findingId}_v${this._config.formulaVersion}`;
  }

  /** Build evidence from finding and correlation data */
  private buildEvidence(
    finding: CanonicalFinding,
    correlationResult: CorrelationResult | null,
  ): readonly import('../types/index.ts').RiskEvidence[] {
    const evidence: import('../types/index.ts').RiskEvidence[] = [];

    // From finding
    evidence.push(Object.freeze({
      sourceType: 'finding',
      sourceId: finding.id,
      field: 'severity',
      value: finding.severity,
      confidence: 1.0,
      description: `Finding severity: ${finding.severity}`,
    }));

    evidence.push(Object.freeze({
      sourceType: 'finding',
      sourceId: finding.id,
      field: 'confidence',
      value: finding.confidence,
      confidence: 0.9,
      description: `Finding confidence: ${finding.confidence}`,
    }));

    // From correlation
    if (correlationResult) {
      const corrCount = correlationResult.correlations.filter(
        c => c.sourceFindingId === finding.id || c.targetFindingId === finding.id
      ).length;

      if (corrCount > 0) {
        evidence.push(Object.freeze({
          sourceType: 'correlation',
          sourceId: finding.id,
          field: 'correlationCount',
          value: corrCount,
          confidence: 0.95,
          description: `Finding has ${corrCount} correlations`,
        }));
      }
    }

    return Object.freeze(evidence);
  }
}

// Re-export for convenience
export type { RiskHistoryEntry } from '../types/index.ts';
