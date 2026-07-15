/**
 * Security Intelligence Correlation Engine — Main Engine
 *
 * The main orchestrator that correlates CanonicalFindings into
 * a unified intelligence model.
 *
 * Public API:
 * - correlate(findings): CorrelationResult
 * - correlateBatch(findings): CorrelationResult
 * - incremental(newFindings, existingResult): CorrelationResult
 * - deduplicate(findings): DuplicateDetection[]
 * - buildCorrelationGraph(findings): CorrelationGraph
 * - statistics(): CorrelationStatistics
 *
 * Architecture:
 * - Findings are converted to CorrelationFindingInput
 * - Duplicate detection runs first (prunes duplicates)
 * - Index-based pre-filtering reduces candidate pairs from O(n²) to O(k)
 * - Only candidate pairs sharing indexed keys are evaluated
 * - Correlation edges with score ≥ minScore are kept
 * - Groups are formed via connected components
 * - Results are cached for incremental updates
 * - Events are emitted for observability
 */

import type {
  CorrelationConfig, CorrelationResult, CorrelationStatistics,
  Correlation, CorrelationGroup, CorrelationEvidence,
  CorrelationRuleResult, CorrelationFindingInput, DuplicateDetection,
  CorrelationResultStatistics,
} from '../types/index.ts';
import {
  DEFAULT_CORRELATION_CONFIG,
  CorrelationReason as Reason,
  DuplicateType as DupType,
} from '../types/index.ts';
import type {
  FindingId, CanonicalFinding, Severity,
} from '../../normalization/types/index.ts';
import {
  Severity as Sev, SourceEngine as Src,
  SEVERITY_ORDER,
} from '../../normalization/types/index.ts';
import {
  createCorrelation, createCorrelationResult,
  createEmptyResultStatistics, toCorrelationFindingInput,
} from '../models/index.ts';
import { RuleRegistry } from '../rules/index.ts';
import { DuplicateDetector } from '../deduplication/index.ts';
import { CorrelationGraph } from '../graph/index.ts';
import { CorrelationCache } from '../cache/index.ts';
import { CorrelationKGAdapter } from '../kg-adapter/index.ts';
import { CorrelationStatisticsCollector } from '../statistics/index.ts';
import {
  CorrelationEventBus,
  createCorrelationStartedEvent,
  createCorrelationCompletedEvent,
  createCorrelationFailedEvent,
  createDuplicateDetectedEvent,
  createCorrelationGraphBuiltEvent,
} from '../events/index.ts';

// ─── Index-Based Pre-Filter ──────────────────────────────────

/**
 * Builds inverted indexes on high-cardinality fields.
 * Only findings sharing at least one indexed key become candidate pairs.
 * This reduces the candidate set from O(n²) to O(k) where k is the
 * number of actual overlaps, dramatically improving performance.
 */
function buildCandidatePairs(
  inputs: readonly CorrelationFindingInput[],
): Set<string> {
  const index: Map<string, number[]> = new Map();

  const addToIndex = (key: string, idx: number) => {
    const existing = index.get(key);
    if (existing) {
      existing.push(idx);
    } else {
      index.set(key, [idx]);
    }
  };

  // Build indexes on high-cardinality fields
  for (let i = 0; i < inputs.length; i++) {
    const f = inputs[i];

    // CVE index (highest weight: 1.00)
    for (const cve of f.cve) {
      addToIndex(`cve:${cve}`, i);
    }

    // CWE index (high weight: 0.90)
    for (const cwe of f.cwe) {
      addToIndex(`cwe:${cwe}`, i);
    }

    // Host / affectedAsset index (weight: 0.80)
    if (f.affectedAsset) {
      addToIndex(`host:${f.affectedAsset.toLowerCase()}`, i);
    }

    // Endpoint index (weight: 0.85)
    if (f.endpoint) {
      addToIndex(`endpoint:${f.endpoint.toLowerCase()}`, i);
    }

    // Technology index (weight: 0.60)
    for (const tech of f.technology) {
      addToIndex(`tech:${tech.toLowerCase()}`, i);
    }

    // Service tag index (weight: 0.75)
    for (const tag of f.tags) {
      if (tag.startsWith('service:')) {
        addToIndex(`service:${tag.toLowerCase()}`, i);
      }
    }

    // Category index (for grouping)
    addToIndex(`cat:${f.category}`, i);
  }

  // Generate candidate pairs from index overlaps
  const candidatePairs: Set<string> = new Set();
  for (const [, indices] of index) {
    if (indices.length < 2) continue;
    for (let a = 0; a < indices.length; a++) {
      for (let b = a + 1; b < indices.length; b++) {
        const i = indices[a];
        const j = indices[b];
        // Always store smaller index first for dedup
        const key = i < j ? `${i}:${j}` : `${j}:${i}`;
        candidatePairs.add(key);
      }
    }
  }

  return candidatePairs;
}

// ─── Correlation Engine ──────────────────────────────────────

export class CorrelationEngine {
  private readonly _config: CorrelationConfig;
  private readonly _ruleRegistry: RuleRegistry;
  private readonly _duplicateDetector: DuplicateDetector;
  private readonly _graph: CorrelationGraph;
  private readonly _cache: CorrelationCache;
  private readonly _kgAdapter: CorrelationKGAdapter;
  private readonly _statisticsCollector: CorrelationStatisticsCollector;
  readonly eventBus: CorrelationEventBus;

  constructor(config: Partial<CorrelationConfig> = {}) {
    this._config = { ...DEFAULT_CORRELATION_CONFIG, ...config };
    this._ruleRegistry = new RuleRegistry();
    this._duplicateDetector = new DuplicateDetector({
      exactThreshold: this._config.exactDuplicateThreshold,
      semanticThreshold: this._config.semanticDuplicateThreshold,
      similarThreshold: this._config.similarFindingThreshold,
    });
    this._graph = new CorrelationGraph();
    this._cache = new CorrelationCache({
      capacity: this._config.cacheSize,
      ttlMs: this._config.cacheTtlMs,
    });
    this._kgAdapter = new CorrelationKGAdapter({
      sourcePrefix: `correlation-engine-${this._config.engineId}`,
    });
    this._statisticsCollector = new CorrelationStatisticsCollector();
    this.eventBus = new CorrelationEventBus();
  }

  // ─── Public API ────────────────────────────────────────

  /**
   * Correlate a set of findings.
   * Runs duplicate detection, then uses index-based pre-filtering
   * to efficiently identify candidate pairs.
   */
  correlate(findings: readonly CanonicalFinding[]): CorrelationResult {
    const startTime = performance.now();

    try {
      this.eventBus.emit(createCorrelationStartedEvent(
        this._config.engineId,
        findings.length,
        this._ruleRegistry.size,
        this._config.batchSize,
      ));

      // Convert to correlation inputs
      const inputs = findings.map(f => toCorrelationFindingInput(f));

      // Step 1: Duplicate detection
      const dedupResult = this._duplicateDetector.detect(inputs);
      const uniqueInputs = dedupResult.uniqueFindings;

      // Record deduplication events
      for (const dup of dedupResult.duplicates) {
        this._statisticsCollector.recordDeduplication(dup.duplicateType);
        this.eventBus.emit(createDuplicateDetectedEvent(
          this._config.engineId,
          dup.originalFindingId,
          dup.duplicateFindingId,
          dup.duplicateType,
          dup.similarity,
        ));
      }

      // Step 2: Add all unique findings to the graph
      this._graph.clear();
      for (const input of uniqueInputs) {
        this._graph.addNode(input);
      }

      // Step 3: Build candidate pairs via index-based pre-filtering
      const candidatePairKeys = buildCandidatePairs(uniqueInputs);
      const correlations: Correlation[] = [];

      for (const pairKey of candidatePairKeys) {
        const [iStr, jStr] = pairKey.split(':');
        const i = parseInt(iStr, 10);
        const j = parseInt(jStr, 10);
        const source = uniqueInputs[i];
        const target = uniqueInputs[j];

        const result = this.correlatePair(source, target);
        if (result) {
          correlations.push(result);

          // Add edge to graph
          this._graph.addEdge(
            source.id,
            target.id,
            result.reasons,
            result.score,
            result.evidence,
          );
        }
      }

      // Step 4: Build groups
      const groups = this._graph.buildGroups(
        this._config.minCorrelationScore,
        this._config.maxGroupSize,
      );

      const durationMs = performance.now() - startTime;
      const throughputPerSecond = durationMs > 0 ? (findings.length / durationMs) * 1000 : 0;

      // Build result
      const result = createCorrelationResult({
        correlations,
        groups,
        duplicates: dedupResult.duplicates,
        statistics: this.buildResultStatistics(
          uniqueInputs.length,
          correlations,
          groups,
          dedupResult.duplicates,
        ),
        durationMs,
      });

      // Cache result
      if (this._config.enableCaching) {
        const cacheKey = this.computeCacheKey(inputs);
        this._cache.set(cacheKey, result);
      }

      // Record statistics
      this._statisticsCollector.recordCorrelation(durationMs, []);

      // Emit event
      this.eventBus.emit(createCorrelationCompletedEvent(
        this._config.engineId,
        correlations.length,
        groups.length,
        dedupResult.duplicates.length,
        durationMs,
        throughputPerSecond,
      ));

      return result;
    } catch (e) {
      const durationMs = performance.now() - startTime;
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      this._statisticsCollector.recordFailure();

      this.eventBus.emit(createCorrelationFailedEvent(
        this._config.engineId,
        findings.length,
        [errorMsg],
        durationMs,
      ));

      return createCorrelationResult({
        correlations: [],
        groups: [],
        duplicates: [],
        statistics: createEmptyResultStatistics(findings.length),
        durationMs,
      });
    }
  }

  /**
   * Correlate a batch of findings with index-based pre-filtering.
   */
  correlateBatch(findings: readonly CanonicalFinding[]): CorrelationResult {
    const startTime = performance.now();

    if (findings.length <= this._config.batchSize) {
      return this.correlate(findings);
    }

    const inputs = findings.map(f => toCorrelationFindingInput(f));

    // Deduplicate across all findings first
    const dedupResult = this._duplicateDetector.detect(inputs);
    const uniqueInputs = dedupResult.uniqueFindings;
    const allDuplicates: DuplicateDetection[] = [...dedupResult.duplicates];
    for (const dup of dedupResult.duplicates) {
      this._statisticsCollector.recordDeduplication(dup.duplicateType);
    }

    // Add unique findings to graph
    this._graph.clear();
    for (const input of uniqueInputs) {
      this._graph.addNode(input);
    }

    // Build candidate pairs via index-based pre-filtering
    const candidatePairKeys = buildCandidatePairs(uniqueInputs);
    const allCorrelations: Correlation[] = [];

    for (const pairKey of candidatePairKeys) {
      const [iStr, jStr] = pairKey.split(':');
      const i = parseInt(iStr, 10);
      const j = parseInt(jStr, 10);
      const source = uniqueInputs[i];
      const target = uniqueInputs[j];

      const result = this.correlatePair(source, target);
      if (result) {
        allCorrelations.push(result);
        this._graph.addEdge(
          source.id,
          target.id,
          result.reasons,
          result.score,
          result.evidence,
        );
      }
    }

    // Build groups
    const allGroups = this._graph.buildGroups(
      this._config.minCorrelationScore,
      this._config.maxGroupSize,
    );

    const durationMs = performance.now() - startTime;
    const throughputPerSecond = durationMs > 0 ? (findings.length / durationMs) * 1000 : 0;

    this._statisticsCollector.recordBatch(durationMs, findings.length);

    const batchResult = createCorrelationResult({
      correlations: allCorrelations,
      groups: allGroups,
      duplicates: allDuplicates,
      statistics: this.buildResultStatistics(
        uniqueInputs.length,
        allCorrelations,
        allGroups,
        allDuplicates,
      ),
      durationMs,
    });

    this.eventBus.emit(createCorrelationCompletedEvent(
      this._config.engineId,
      allCorrelations.length,
      allGroups.length,
      allDuplicates.length,
      durationMs,
      throughputPerSecond,
    ));

    return batchResult;
  }

  /**
   * Incremental correlation: update an existing result with new findings
   * without full recomputation.
   *
   * NOTE: Placeholder nodes are used for existing findings that aren't
   * provided in the new batch. These are marked with `__placeholder: true`
   * in metadata and are only used for graph connectivity, not rule evaluation.
   * Correlation is only evaluated between new findings and non-placeholder nodes.
   */
  incremental(
    newFindings: readonly CanonicalFinding[],
    existingResult: CorrelationResult,
  ): CorrelationResult {
    const startTime = performance.now();
    this._statisticsCollector.recordIncremental();

    // Convert new findings
    const newInputs = newFindings.map(f => toCorrelationFindingInput(f));

    // Check cache first
    if (this._config.enableCaching) {
      const cacheKey = this.computeCacheKey(newInputs);
      const cached = this._cache.get(cacheKey);
      if (cached) {
        this._statisticsCollector.recordCacheHit();
        return cached;
      }
      this._statisticsCollector.recordCacheMiss();
    }

    // Rebuild graph from existing correlations
    this._graph.clear();

    // Track which finding IDs are from existing results (placeholders)
    const placeholderIds = new Set<string>();

    // Add existing edges to graph with placeholder nodes
    for (const corr of existingResult.correlations) {
      for (const fid of [corr.sourceFindingId, corr.targetFindingId]) {
        if (!this._graph.hasNode(fid)) {
          // Create placeholder node — marked for filtering during rule evaluation
          this._graph.addNode({
            id: fid,
            sourceEngine: Src.Unknown,
            category: 'Other' as any,
            severity: Sev.Medium,
            title: '',
            description: '',
            cve: [],
            cwe: [],
            affectedAsset: null,
            endpoint: null,
            technology: [],
            evidence: [],
            tags: [],
            metadata: { __placeholder: true },
          });
          placeholderIds.add(fid);
        }
      }
      this._graph.addEdge(
        corr.sourceFindingId,
        corr.targetFindingId,
        corr.reasons,
        corr.score,
        corr.evidence,
      );
    }

    // Add new findings to graph
    for (const input of newInputs) {
      this._graph.addNode(input);
    }

    // Correlate new findings against non-placeholder nodes only
    const newCorrelations: Correlation[] = [...existingResult.correlations];
    const nonPlaceholderNodes = this._graph.getAllNodes().filter(
      n => !placeholderIds.has(n.id)
    );

    for (const newInput of newInputs) {
      for (const existingNode of nonPlaceholderNodes) {
        if (newInput.id === existingNode.id) continue;

        const result = this.correlatePair(newInput, existingNode);
        if (result) {
          newCorrelations.push(result);
          this._graph.addEdge(
            newInput.id,
            existingNode.id,
            result.reasons,
            result.score,
            result.evidence,
          );
        }
      }
    }

    // Deduplicate new findings against each other
    const newDedupResult = this._duplicateDetector.detect(newInputs);
    for (const dup of newDedupResult.duplicates) {
      this._statisticsCollector.recordDeduplication(dup.duplicateType);
    }

    // Build groups
    const groups = this._graph.buildGroups(
      this._config.minCorrelationScore,
      this._config.maxGroupSize,
    );

    const durationMs = performance.now() - startTime;
    const allDuplicates: DuplicateDetection[] = [...existingResult.duplicates, ...newDedupResult.duplicates];

    const incrementalResult = createCorrelationResult({
      correlations: newCorrelations,
      groups,
      duplicates: allDuplicates,
      statistics: this.buildResultStatistics(
        this._graph.nodeCount,
        newCorrelations,
        groups,
        allDuplicates,
      ),
      durationMs,
    });

    // Cache
    if (this._config.enableCaching) {
      const cacheKey = this.computeCacheKey(newInputs);
      this._cache.set(cacheKey, incrementalResult);
    }

    this.eventBus.emit(createCorrelationCompletedEvent(
      this._config.engineId,
      newCorrelations.length - existingResult.correlations.length,
      groups.length,
      newDedupResult.duplicates.length,
      durationMs,
      durationMs > 0 ? (newFindings.length / durationMs) * 1000 : 0,
    ));

    return incrementalResult;
  }

  /**
   * Deduplicate a set of findings.
   * Returns only the duplicate detections, no correlations.
   */
  deduplicate(findings: readonly CanonicalFinding[]) {
    const inputs = findings.map(f => toCorrelationFindingInput(f));
    const result = this._duplicateDetector.detect(inputs);
    for (const dup of result.duplicates) {
      this._statisticsCollector.recordDeduplication(dup.duplicateType);
      this.eventBus.emit(createDuplicateDetectedEvent(
        this._config.engineId,
        dup.originalFindingId,
        dup.duplicateFindingId,
        dup.duplicateType,
        dup.similarity,
      ));
    }
    return result;
  }

  /**
   * Build a correlation graph from findings.
   * Returns the internal graph for inspection.
   */
  buildCorrelationGraph(findings: readonly CanonicalFinding[]): CorrelationGraph {
    const startTime = performance.now();

    const inputs = findings.map(f => toCorrelationFindingInput(f));

    this._graph.clear();
    for (const input of inputs) {
      this._graph.addNode(input);
    }

    // Use index-based candidate pairs
    const candidatePairKeys = buildCandidatePairs(inputs);

    for (const pairKey of candidatePairKeys) {
      const [iStr, jStr] = pairKey.split(':');
      const i = parseInt(iStr, 10);
      const j = parseInt(jStr, 10);
      const result = this.correlatePair(inputs[i], inputs[j]);
      if (result) {
        this._graph.addEdge(
          inputs[i].id,
          inputs[j].id,
          result.reasons,
          result.score,
          result.evidence,
        );
      }
    }

    const durationMs = performance.now() - startTime;
    const snapshot = this._graph.getSnapshot();

    this.eventBus.emit(createCorrelationGraphBuiltEvent(
      this._config.engineId,
      snapshot.nodeCount,
      snapshot.edgeCount,
      snapshot.groupCount,
      durationMs,
    ));

    return this._graph;
  }

  /**
   * Get the Knowledge Graph adapter for converting results.
   */
  get kgAdapter(): CorrelationKGAdapter {
    return this._kgAdapter;
  }

  /**
   * Get the rule registry for extending rules.
   */
  get ruleRegistry(): RuleRegistry {
    return this._ruleRegistry;
  }

  /**
   * Get current correlation engine statistics.
   */
  statistics(): CorrelationStatistics {
    return this._statisticsCollector.collect();
  }

  /**
   * Reset all engine state.
   */
  reset(): void {
    this._statisticsCollector.reset();
    this._graph.clear();
    this._cache.clear();
    this.eventBus.clear();
  }

  // ─── Private Helpers ───────────────────────────────────

  /** Minimum total weight of matching rules required to create a correlation */
  private static readonly MIN_MATCHED_WEIGHT = 0.5;

  /**
   * Correlate a pair of findings using all registered rules.
   *
   * Scoring formula (quality-based):
   * - matchedWeightSum = sum of weights for matched rules
   * - If matchedWeightSum < MIN_MATCHED_WEIGHT: not enough evidence → skip
   * - qualityScore = sum(weight × score) / matchedWeightSum  (weighted average)
   * - finalScore = qualityScore  (0.0–1.0)
   *
   * This ensures:
   * - A single high-weight rule (e.g. SameCVE at 1.0) can create a correlation
   * - Low-weight rules alone (e.g. SameCookie at 0.25) need additional evidence
   * - The score reflects the quality and importance of matching evidence
   */
  private correlatePair(
    source: CorrelationFindingInput,
    target: CorrelationFindingInput,
  ): Correlation | null {
    // Skip placeholder nodes (from incremental correlation)
    if ((source.metadata as Record<string, unknown>)?.['__placeholder'] ||
        (target.metadata as Record<string, unknown>)?.['__placeholder']) {
      return null;
    }

    const ruleResults = this._ruleRegistry.evaluateAll(source, target);
    const rules = this._ruleRegistry.getAll();

    // Collect matching results with their rule weights
    let matchedWeightSum = 0;
    let weightedScoreSum = 0;
    const reasons: CorrelationReason[] = [];
    const evidence: CorrelationEvidence[] = [];

    for (let i = 0; i < ruleResults.length && i < rules.length; i++) {
      const result = ruleResults[i];
      const rule = rules[i];
      if (result.matched) {
        matchedWeightSum += rule.weight;
        weightedScoreSum += rule.weight * result.score;
        reasons.push(rule.reason);
        if (result.evidence) {
          evidence.push(result.evidence);
        }
      }
    }

    // Not enough evidence to create a correlation
    if (matchedWeightSum < CorrelationEngine.MIN_MATCHED_WEIGHT) return null;

    // Quality-based score: weighted average of matching rule scores
    const qualityScore = weightedScoreSum / matchedWeightSum;

    if (qualityScore < this._config.minCorrelationScore) return null;

    // Determine duplicate type
    const duplicateType = this._duplicateDetector.classifyDuplicate(qualityScore);

    return createCorrelation({
      sourceFindingId: source.id,
      targetFindingId: target.id,
      score: qualityScore,
      reasons,
      evidence,
      duplicateType,
    });
  }

  /** Compute a cache key for a set of findings */
  private computeCacheKey(inputs: readonly CorrelationFindingInput[]): string {
    const ids = inputs.map(i => i.id).sort().join('|');
    let hash = 0;
    for (let i = 0; i < ids.length; i++) {
      hash = ((hash << 5) - hash) + ids.charCodeAt(i);
      hash |= 0;
    }
    return `cache_${hash.toString(36)}`;
  }

  /** Build result statistics from correlation results */
  private buildResultStatistics(
    totalFindings: number,
    correlations: readonly Correlation[],
    groups: readonly CorrelationGroup[],
    duplicates: readonly DuplicateDetection[],
  ): CorrelationResultStatistics {
    const reasonDist: Record<string, number> = {};
    for (const r of Object.values(Reason)) reasonDist[r] = 0;
    for (const corr of correlations) {
      for (const reason of corr.reasons) {
        reasonDist[reason] = (reasonDist[reason] ?? 0) + 1;
      }
    }

    const dupDist: Record<string, number> = {};
    for (const d of Object.values(DupType)) dupDist[d] = 0;
    for (const dup of duplicates) {
      dupDist[dup.duplicateType] = (dupDist[dup.duplicateType] ?? 0) + 1;
    }

    const sevDist: Record<string, number> = {};
    for (const s of Object.keys(SEVERITY_ORDER)) sevDist[s] = 0;

    const srcDist: Record<string, number> = {};

    const avgScore = correlations.length > 0
      ? correlations.reduce((sum, c) => sum + c.score, 0) / correlations.length
      : 0;

    return Object.freeze({
      totalFindings,
      totalCorrelations: correlations.length,
      totalGroups: groups.length,
      totalDuplicates: duplicates.length,
      averageCorrelationScore: Math.round(avgScore * 10000) / 10000,
      reasonDistribution: Object.freeze(reasonDist) as Readonly<Record<Reason, number>>,
      duplicateTypeDistribution: Object.freeze(dupDist) as Readonly<Record<DupType, number>>,
      severityDistribution: Object.freeze(sevDist) as Readonly<Record<Sev, number>>,
      sourceDistribution: Object.freeze(srcDist) as Readonly<Record<Src, number>>,
    });
  }
}
