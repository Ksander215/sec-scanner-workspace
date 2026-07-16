/**
 * Security Intelligence Impact Analysis — Engine
 *
 * Public API for the Impact Analysis Engine.
 * Answers: "What changes if we eliminate a specific problem?"
 *
 * Methods:
 * - analyze()      : Compute full impact analysis for a scenario
 * - simulate()     : Simulate a specific mitigation scenario
 * - compare()      : Compare two impact analyses
 * - rank()         : Rank remediation candidates
 * - statistics()   : Get engine statistics
 *
 * All calculations are fully deterministic.
 * No modifications to existing modules.
 */

import type {
  ImpactEngineConfig, ImpactAnalysis, ImpactScenario,
  ImpactStatistics, ComparisonInput, ComparisonResult,
  AnalysisInput, MitigationScenarioType, Metadata,
} from '../types/index.ts';
import { DEFAULT_IMPACT_ENGINE_CONFIG, RemediationRankingStrategy } from '../types/index.ts';
import type { AttackPath } from '../../attack-path/types/index.ts';
import type { RiskAssessment } from '../../risk/types/index.ts';
import type { CorrelationGroup } from '../../correlation/types/index.ts';

import { evaluateScenario } from '../scenarios/index.ts';
import { computeAttackPathDelta, computeAttackSurfaceReduction } from '../delta/index.ts';
import { computeRiskDelta, computeOverallRisk } from '../risk-delta/index.ts';
import { computeGraphDelta } from '../graph-delta/index.ts';
import {
  computeRecommendationImpact,
  rankRemediationCandidates,
  type RankingResult,
} from '../recommendation/index.ts';
import {
  createImpactAnalysis,
  createMitigationEffect,
  createSecurityScoreDelta,
  createDependencyImpact,
  computeSecurityScore,
  impactAnalysesEqual,
} from '../models/index.ts';
import { ImpactEventBus } from '../events/index.ts';
import {
  createImpactAnalysisStartedEvent,
  createImpactCalculatedEvent,
  createScenarioCompletedEvent,
  createRecommendationRankedEvent,
} from '../events/index.ts';
import { ImpactCache } from '../cache/index.ts';
import { ImpactStatisticsCollector } from '../statistics/index.ts';

// ─── Engine ──────────────────────────────────────────────────

export class ImpactAnalysisEngine {
  private readonly _config: ImpactEngineConfig;
  private readonly _cache: ImpactCache;
  private readonly _statistics: ImpactStatisticsCollector;
  private readonly _eventBus: ImpactEventBus;

  constructor(config?: Partial<ImpactEngineConfig>) {
    this._config = Object.freeze({ ...DEFAULT_IMPACT_ENGINE_CONFIG, ...config });
    this._cache = new ImpactCache({
      capacity: this._config.cacheSize,
      ttlMs: this._config.cacheTtlMs,
    });
    this._statistics = new ImpactStatisticsCollector();
    this._eventBus = new ImpactEventBus();
  }

  // ─── Public API ──────────────────────────────────────────────

  /**
   * Compute full impact analysis for a scenario.
   * The primary entry point for impact analysis.
   */
  analyze(input: AnalysisInput): ImpactAnalysis {
    const start = performance.now();
    const scenario = input.scenario;

    // Check cache
    const cacheKey = `analysis_${scenario.id}_${scenario.type}_${scenario.targetId}`;
    if (this._config.enableCaching) {
      const cached = this._cache.getAnalysis(cacheKey);
      if (cached) {
        this._statistics.recordCacheHit();
        return cached;
      }
      this._statistics.recordCacheMiss();
    }

    // Emit started event
    this._eventBus.publish(createImpactAnalysisStartedEvent(scenario.id, scenario.type));

    try {
      // 1. Evaluate the scenario
      const evaluation = evaluateScenario(
        scenario,
        input.attackPaths,
        input.riskAssessments,
        input.correlationGroups,
      );

      // 2. Compute attack path delta
      const attackPathDelta = computeAttackPathDelta(
        scenario.id,
        input.attackPaths,
        evaluation,
      );

      // 3. Compute risk delta
      const riskDelta = computeRiskDelta(
        scenario.id,
        input.riskAssessments,
        input.attackPaths,
        evaluation,
      );

      // 4. Compute security score delta
      const scoreBefore = computeSecurityScore(riskDelta.overallBefore);
      const scoreAfter = computeSecurityScore(riskDelta.overallAfter);
      const securityScoreDelta = createSecurityScoreDelta({
        scenarioId: scenario.id,
        scoreBefore,
        scoreAfter,
      });

      // 5. Compute mitigation effect
      const attackSurfaceReduction = computeAttackSurfaceReduction(attackPathDelta);
      const mitigationEffect = createMitigationEffect({
        scenarioId: scenario.id,
        riskReduction: evaluation.riskReductionFactor,
        attackSurfaceReduction,
        businessImpact: evaluation.businessImpact,
        confidenceImprovement: evaluation.confidenceFactor,
        exploitabilityReduction: evaluation.exploitabilityFactor,
        estimatedCost: evaluation.estimatedCost,
        implementationComplexity: evaluation.implementationComplexity,
      });

      // 6. Compute dependency impacts
      const dependencyImpacts = evaluation.dependencies.map(dep =>
        createDependencyImpact({
          scenarioId: scenario.id,
          sourceType: dep.sourceType,
          sourceId: dep.sourceId,
          affectedType: dep.affectedType,
          affectedId: dep.affectedId,
          impactType: dep.impactType,
          impactScore: dep.impactScore,
          description: dep.description,
        })
      );

      // 7. Compute recommendation impact
      const remediationCandidate = computeRecommendationImpact(
        scenario.id,
        scenario.type,
        scenario.targetId,
        scenario.description,
        evaluation,
        input.attackPaths.length,
      );

      // 8. Build the complete impact analysis
      const durationMs = performance.now() - start;
      const analysis = createImpactAnalysis({
        scenarioId: scenario.id,
        scenarioType: scenario.type,
        attackPathDelta,
        riskDelta,
        securityScoreDelta,
        dependencyImpacts,
        mitigationEffect,
        remediationCandidate,
        analysisDurationMs: durationMs,
      });

      // Cache the result
      if (this._config.enableCaching) {
        this._cache.setAnalysis(cacheKey, analysis);
      }

      // Emit events
      this._eventBus.publish(createImpactCalculatedEvent(
        analysis.id, scenario.id, riskDelta.overallDifference, attackPathDelta.eliminatedPaths.length
      ));
      this._eventBus.publish(createScenarioCompletedEvent(scenario.id, analysis.id, durationMs));

      // Record statistics
      this._statistics.recordAnalysis(durationMs, scenario.type);

      return analysis;
    } catch (error) {
      this._statistics.recordFailure();
      throw error;
    }
  }

  /**
   * Simulate a mitigation scenario.
   * Shortcut for creating a scenario and analyzing it.
   */
  simulate(
    scenario: ImpactScenario,
    attackPaths: readonly AttackPath[],
    riskAssessments: readonly RiskAssessment[],
    correlationGroups: readonly CorrelationGroup[] = [],
  ): ImpactAnalysis {
    const start = performance.now();

    const analysis = this.analyze({
      scenario,
      attackPaths,
      riskAssessments,
      correlationGroups,
    });

    this._statistics.recordSimulation(performance.now() - start);
    return analysis;
  }

  /**
   * Compare two impact analyses.
   * Determines which scenario produces a better outcome.
   */
  compare(input: ComparisonInput): ComparisonResult {
    const start = performance.now();
    const baseline = input.baseline;
    const alternative = input.alternative;

    const riskDeltaDifference = alternative.riskDelta.overallDifference - baseline.riskDelta.overallDifference;
    const attackSurfaceDifference =
      (alternative.attackPathDelta.eliminatedPaths.length / Math.max(1, alternative.attackPathDelta.totalBefore)) -
      (baseline.attackPathDelta.eliminatedPaths.length / Math.max(1, baseline.attackPathDelta.totalBefore));
    const securityScoreDifference = alternative.securityScoreDelta.scoreDelta - baseline.securityScoreDelta.scoreDelta;
    const pathsEliminatedDifference =
      alternative.attackPathDelta.eliminatedPaths.length - baseline.attackPathDelta.eliminatedPaths.length;
    const costDifference =
      alternative.mitigationEffect.estimatedCost - baseline.mitigationEffect.estimatedCost;

    // Determine winner based on composite score
    const baselineScore = baseline.remediationCandidate.score;
    const alternativeScore = alternative.remediationCandidate.score;
    const winner: 'baseline' | 'alternative' | 'tie' =
      alternativeScore > baselineScore ? 'alternative' :
      baselineScore > alternativeScore ? 'baseline' : 'tie';

    const result: ComparisonResult = Object.freeze({
      baselineScenarioId: baseline.scenarioId,
      alternativeScenarioId: alternative.scenarioId,
      riskDeltaDifference,
      attackSurfaceDifference,
      securityScoreDifference,
      pathsEliminatedDifference,
      costDifference,
      winner,
      metadata: Object.freeze({}),
    });

    this._statistics.recordComparison(performance.now() - start);
    return result;
  }

  /**
   * Rank a list of impact analyses by remediation priority.
   */
  rank(
    analyses: readonly ImpactAnalysis[],
    strategy?: RemediationRankingStrategy,
  ): RankingResult {
    const candidates = analyses.map(a => a.remediationCandidate);
    const result = rankRemediationCandidates(
      candidates,
      strategy ?? this._config.rankingStrategy,
    );

    this._statistics.recordRanking();

    // Emit ranking event
    if (analyses.length > 0 && result.topCandidate) {
      this._eventBus.publish(createRecommendationRankedEvent(
        analyses[0].id,
        result.strategy,
        result.totalCandidates,
        result.topCandidate.id,
      ));
    }

    return result;
  }

  /**
   * Analyze a batch of scenarios.
   */
  analyzeBatch(
    scenarios: readonly ImpactScenario[],
    attackPaths: readonly AttackPath[],
    riskAssessments: readonly RiskAssessment[],
    correlationGroups: readonly CorrelationGroup[] = [],
  ): readonly ImpactAnalysis[] {
    const results: ImpactAnalysis[] = [];
    const batchSize = this._config.batchSize;

    for (let i = 0; i < scenarios.length; i += batchSize) {
      const batch = scenarios.slice(i, i + batchSize);
      for (const scenario of batch) {
        const analysis = this.analyze({
          scenario,
          attackPaths,
          riskAssessments,
          correlationGroups,
        });
        results.push(analysis);
      }
    }

    this._statistics.recordBatch();
    return Object.freeze(results);
  }

  /**
   * Get engine statistics.
   */
  statistics(): ImpactStatistics {
    return this._statistics.getStatistics();
  }

  /**
   * Reset engine state.
   */
  reset(): void {
    this._cache.clear();
    this._statistics.reset();
    this._eventBus.clear();
  }

  // ─── Accessors ───────────────────────────────────────────────

  get config(): ImpactEngineConfig {
    return this._config;
  }

  get cacheStatistics() {
    return this._cache.getStatistics();
  }

  get eventBus(): ImpactEventBus {
    return this._eventBus;
  }
}
