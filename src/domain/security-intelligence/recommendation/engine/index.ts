/**
 * Security Intelligence Recommendation Engine — Main Engine
 *
 * The main orchestrator that transforms analysis results into
 * a ranked remediation plan.
 *
 * Public API:
 * - generate(): Generate recommendations from a single source
 * - generateBatch(): Generate from multiple sources
 * - rank(): Rank a set of recommendations
 * - plan(): Build a remediation plan
 * - comparePlans(): Compare two remediation plans
 * - statistics(): Get engine statistics
 */

import type {
  Recommendation, RemediationPlan, RecommendationEngineConfig,
  GenerateInput, GenerateBatchInput, PlanConstraints, PlanComparison,
  Metadata,
} from '../types/index.ts';
import {
  DEFAULT_RECOMMENDATION_ENGINE_CONFIG,
  PlanningStrategy,
  RecommendationSource,
} from '../types/index.ts';
import { RuleRegistry, createDefaultRuleRegistry } from '../rules/index.ts';
import { generateFromSource, generateFromAllSources } from '../sources/index.ts';
import { rankRecommendations } from '../ranking/index.ts';
import { buildPlan } from '../planner/index.ts';
import { generateBatch } from '../batch/index.ts';
import { resolveAllConflicts } from '../conflicts/index.ts';
import { RecommendationCache } from '../cache/index.ts';
import { RecommendationEventBus, createRecommendationGeneratedEvent, createRecommendationRankedEvent, createRemediationPlanBuiltEvent } from '../events/index.ts';
import { RecommendationStatisticsCollector } from '../statistics/index.ts';

// ─── RecommendationEngine ───────────────────────────────────

export class RecommendationEngine {
  private readonly _config: RecommendationEngineConfig;
  private readonly _ruleRegistry: RuleRegistry;
  private readonly _cache: RecommendationCache;
  private readonly _statisticsCollector: RecommendationStatisticsCollector;
  readonly eventBus: RecommendationEventBus;

  constructor(config: Partial<RecommendationEngineConfig> = {}) {
    this._config = { ...DEFAULT_RECOMMENDATION_ENGINE_CONFIG, ...config };
    this._ruleRegistry = createDefaultRuleRegistry();
    this._cache = new RecommendationCache({
      capacity: this._config.cacheSize,
      ttlMs: this._config.cacheTtlMs,
    });
    this._statisticsCollector = new RecommendationStatisticsCollector();
    this.eventBus = new RecommendationEventBus();
  }

  // ─── Public API ────────────────────────────────────────

  /**
   * Generate recommendations from a single source.
   * Evaluates all applicable rules against the provided context.
   */
  generate(input: GenerateInput): readonly Recommendation[] {
    const startTime = performance.now();

    try {
      // Check cache
      const cacheKey = this.computeCacheKey('rec', input.source, input.sourceId);
      if (this._config.enableCaching) {
        // Cache check for individual recommendations is done at source level
        this._statisticsCollector.recordCacheMiss();
      }

      // Generate from source
      const recommendations = generateFromSource(input, this._ruleRegistry);

      // Record statistics
      const durationMs = performance.now() - startTime;
      for (const rec of recommendations) {
        this._statisticsCollector.recordGeneration(
          durationMs / recommendations.length,
          rec.ruleType,
          rec.source,
          rec.severity,
          rec.benefit.riskReduction,
          rec.cost.totalCost,
          rec.benefit.totalBenefit,
        );

        // Cache
        if (this._config.enableCaching) {
          this._cache.setRecommendation(this.computeCacheKey('rec', rec.source, rec.sourceId + '_' + rec.ruleType), rec);
        }

        // Emit event
        this.eventBus.emit(createRecommendationGeneratedEvent(
          this._config.engineId,
          rec.id,
          rec.ruleType,
          rec.source,
          rec.severity,
        ));
      }

      return recommendations;
    } catch (error) {
      this._statisticsCollector.recordFailure();
      // Re-throw — silent failures in a security engine are unacceptable.
      // Callers must know when generation fails so they can take action.
      throw error;
    }
  }

  /**
   * Generate recommendations from multiple sources in batch.
   */
  generateBatch(input: GenerateBatchInput): readonly Recommendation[] {
    const startTime = performance.now();

    try {
      const result = generateBatch(
        input,
        this._ruleRegistry,
        this._config.defaultStrategy,
      );

      this._statisticsCollector.recordBatch();
      const durationMs = performance.now() - startTime;

      // Emit events for each recommendation
      for (const rec of result.recommendations) {
        this.eventBus.emit(createRecommendationGeneratedEvent(
          this._config.engineId,
          rec.id,
          rec.ruleType,
          rec.source,
          rec.severity,
        ));
      }

      return result.recommendations;
    } catch (error) {
      this._statisticsCollector.recordFailure();
      // Re-throw — silent failures in a security engine are unacceptable.
      throw error;
    }
  }

  /**
   * Rank a set of recommendations.
   * Uses the deterministic 8-factor weighted ranking.
   */
  rank(recommendations: readonly Recommendation[]): readonly Recommendation[] {
    const startTime = performance.now();

    const result = rankRecommendations(recommendations, this._config);

    this._statisticsCollector.recordRanking(result.durationMs);

    // Emit ranking event
    this.eventBus.emit(createRecommendationRankedEvent(
      this._config.engineId,
      result.ranked.map(r => r.id),
      result.strategy,
      result.durationMs,
    ));

    return result.ranked;
  }

  /**
   * Build a remediation plan from ranked recommendations.
   * Uses the specified planning strategy.
   */
  plan(
    recommendations: readonly Recommendation[],
    strategy?: PlanningStrategy,
    constraints?: PlanConstraints,
  ): RemediationPlan {
    const startTime = performance.now();

    const effectiveStrategy = strategy ?? this._config.defaultStrategy;
    const result = buildPlan(recommendations, effectiveStrategy, constraints);

    this._statisticsCollector.recordPlanning(
      result.durationMs,
      result.plan.actions.length,
      result.plan.conflicts.length,
    );

    // Cache the plan
    if (this._config.enableCaching) {
      this._cache.setPlan(this.computePlanCacheKey(result.plan.id), result.plan);
    }

    // Emit plan built event
    this.eventBus.emit(createRemediationPlanBuiltEvent(
      this._config.engineId,
      result.plan.id,
      effectiveStrategy,
      result.plan.actions.length,
      result.plan.totalRiskReduction,
      result.durationMs,
    ));

    return result.plan;
  }

  /**
   * Compare two remediation plans.
   * Returns a deterministic comparison result.
   */
  comparePlans(planA: RemediationPlan, planB: RemediationPlan): PlanComparison {
    const riskDiff = planA.totalRiskReduction - planB.totalRiskReduction;
    const costDiff = planA.totalEstimatedCost - planB.totalEstimatedCost;
    const coverageDiff = planA.coverageScore - planB.coverageScore;
    const effortDiff = planA.totalEstimatedEffortHours - planB.totalEstimatedEffortHours;
    const actionDiff = planA.actions.length - planB.actions.length;

    // Deterministic winner calculation
    let scoreA = 0;
    let scoreB = 0;

    if (riskDiff > 0) scoreA += 3;
    else if (riskDiff < 0) scoreB += 3;

    if (costDiff < 0) scoreA += 2;  // Lower cost is better
    else if (costDiff > 0) scoreB += 2;

    if (coverageDiff > 0) scoreA += 2;
    else if (coverageDiff < 0) scoreB += 2;

    if (effortDiff < 0) scoreA += 1;  // Less effort is better
    else if (effortDiff > 0) scoreB += 1;

    let winner: 'plan-a' | 'plan-b' | 'tie';
    if (scoreA > scoreB) winner = 'plan-a';
    else if (scoreB > scoreA) winner = 'plan-b';
    else winner = 'tie';

    return Object.freeze({
      planA: planA.id,
      planB: planB.id,
      riskReductionDifference: riskDiff,
      costDifference: costDiff,
      coverageDifference: coverageDiff,
      effortDifference: effortDiff,
      actionCountDifference: actionDiff,
      winner,
      metadata: Object.freeze({}),
    });
  }

  /**
   * Get engine statistics.
   */
  statistics(): import('../types/index.ts').RecommendationStatistics {
    return this._statisticsCollector.collect();
  }

  /**
   * Get the rule registry for extending rules.
   */
  get ruleRegistry(): RuleRegistry {
    return this._ruleRegistry;
  }

  /**
   * Get cache statistics.
   */
  get cacheStatistics() {
    return this._cache.getStatistics();
  }

  /**
   * Get the engine configuration.
   */
  get config(): RecommendationEngineConfig {
    return this._config;
  }

  /**
   * Reset all engine state.
   */
  reset(): void {
    this._statisticsCollector.reset();
    this._cache.clear();
    this.eventBus.clear();
  }

  // ─── Private Helpers ────────────────────────────────────

  private computeCacheKey(prefix: string, source: string, id: string): string {
    return `${prefix}_${source}_${id}_v${this._config.formulaVersion}`;
  }

  private computePlanCacheKey(planId: string): string {
    return `plan_${planId}_v${this._config.formulaVersion}`;
  }
}
