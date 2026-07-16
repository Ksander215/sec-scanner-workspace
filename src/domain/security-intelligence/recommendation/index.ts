/**
 * Security Intelligence Recommendation Engine — Public API
 *
 * Single entry point for the Recommendation Engine layer.
 * Transforms analysis results into a ranked remediation plan.
 *
 * Usage:
 * ```ts
 * import { RecommendationEngine } from './recommendation/index.ts';
 *
 * const engine = new RecommendationEngine({ engineId: 'main' });
 *
 * const recommendations = engine.generate({
 *   source: RecommendationSource.CanonicalFinding,
 *   sourceId: finding.id,
 *   finding,
 * });
 *
 * const ranked = engine.rank(recommendations);
 * const plan = engine.plan(ranked, PlanningStrategy.Balanced);
 * ```
 *
 * Architecture:
 * - Types: Enums, branded IDs, interfaces
 * - Models: Recommendation, RemediationPlan, etc.
 * - Rules: 14 extensible plug-in rules
 * - Sources: Generation from 5 upstream sources
 * - Ranking: 8-factor weighted ranking
 * - Planner: 5 planning strategies
 * - Conflicts: Detection and resolution
 * - Batch: Multi-source batch processing
 * - Events: Recommendation lifecycle observability
 * - Cache: Dual LRU cache (recommendation + plan)
 * - Engine: RecommendationEngine (main orchestrator)
 * - Statistics: Comprehensive metrics
 */

// ─── Types ───────────────────────────────────────────────────

export type {
  RecommendationId, RecommendationGroupId, RecommendationActionId,
  RemediationPlanId, RemediationTaskId, RecommendationEvidenceId,
  RecommendationStatisticsId, RecommendationCostId, RecommendationBenefitId,
  Timestamp, Metadata,
  Recommendation, RecommendationGroup, RecommendationAction,
  RemediationPlan, RemediationTask, RecommendationEvidence,
  RecommendationStatistics, RecommendationCost, RecommendationBenefit,
  RecommendationRanking, ExplainabilityData,
  Conflict, ConflictResolution,
  RecommendationRule, RuleContext, RuleResult,
  RecommendationEngineConfig, GenerateInput, GenerateBatchInput,
  PlanInput, PlanConstraints, PlanComparison,
  RecommendationCacheStatistics, RecommendationCacheEntry,
} from './types/index.ts';

export {
  brandRecommendationId, brandRecommendationGroupId, brandRecommendationActionId,
  brandRemediationPlanId, brandRemediationTaskId, brandRecommendationEvidenceId,
  brandRecommendationStatisticsId, brandRecommendationCostId, brandRecommendationBenefitId,
  RecommendationRuleType, RecommendationSource, PlanningStrategy,
  ConflictType, ActionStatus, RecommendationSeverity,
  ALL_RECOMMENDATION_RULE_TYPES, ALL_RECOMMENDATION_SOURCES, ALL_PLANNING_STRATEGIES,
  ALL_CONFLICT_TYPES, ALL_ACTION_STATUSES, ALL_RECOMMENDATION_SEVERITIES,
  DEFAULT_RECOMMENDATION_ENGINE_CONFIG,
} from './types/index.ts';

// ─── Models ──────────────────────────────────────────────────

export type {
  RecommendationCostInput, RecommendationBenefitInput,
  RecommendationInput, RecommendationGroupInput,
  RecommendationActionInput, RemediationPlanInput, RemediationTaskInput,
  RecommendationRankingInput,
} from './models/index.ts';

export {
  generateRecommendationId, generateRecommendationGroupId,
  generateRecommendationActionId, generateRemediationPlanId,
  generateRemediationTaskId, generateRecommendationEvidenceId,
  generateRecommendationStatisticsId, generateRecommendationCostId,
  generateRecommendationBenefitId,
  createRecommendationCost, computeTotalCost,
  createRecommendationBenefit, computeTotalBenefit,
  createRecommendationEvidence,
  createExplainabilityData,
  createRecommendationRanking, computeOverallRankingScore,
  createConflict,
  createRecommendation,
  createRecommendationGroup,
  createRecommendationAction,
  createRemediationPlan,
  createRemediationTask,
  recommendationToJSON, recommendationFromJSON,
  remediationPlanToJSON, remediationPlanFromJSON,
  recommendationsEqual, recommendationGroupsEqual, remediationPlansEqual,
  recommendationActionsEqual,
  cloneRecommendation, cloneRemediationPlan,
  hashRecommendation, hashRemediationPlan,
  computePlanRiskReduction, computePlanAttackSurfaceReduction,
  computePlanCost, computePlanEffort, computePlanCoverage,
  computePlanPriority,
} from './models/index.ts';

// ─── Rules ───────────────────────────────────────────────────

export {
  BUILT_IN_RULES,
  RuleRegistry,
  createDefaultRuleRegistry,
} from './rules/index.ts';

// ─── Sources ─────────────────────────────────────────────────

export {
  generateFromSource,
  generateFromAllSources,
} from './sources/index.ts';

// ─── Ranking ─────────────────────────────────────────────────

export type {
  RankingResult,
} from './ranking/index.ts';

export {
  rankRecommendations,
  computeRankingScores,
  compareRecommendations,
} from './ranking/index.ts';

// ─── Planner ─────────────────────────────────────────────────

export type {
  PlannerResult,
} from './planner/index.ts';

export {
  buildPlan,
  selectByStrategy,
  orderByStrategy,
} from './planner/index.ts';

// ─── Conflicts ───────────────────────────────────────────────

export {
  detectConflicts,
  resolveConflict,
  resolveAllConflicts,
} from './conflicts/index.ts';

// ─── Batch ───────────────────────────────────────────────────

export type {
  BatchResult,
} from './batch/index.ts';

export {
  generateBatch,
  generateFromSingleFinding,
  generateFromSingleRisk,
  generateFromSingleImpact,
} from './batch/index.ts';

// ─── Events ──────────────────────────────────────────────────

export type {
  RecommendationGeneratedEvent, RecommendationRankedEvent,
  RecommendationAcceptedEvent, RecommendationRejectedEvent,
  RemediationPlanBuiltEvent,
  AnyRecommendationEvent, RecommendationEventHandler,
} from './events/index.ts';

export {
  createRecommendationGeneratedEvent, createRecommendationRankedEvent,
  createRecommendationAcceptedEvent, createRecommendationRejectedEvent,
  createRemediationPlanBuiltEvent,
  RecommendationEventBus,
} from './events/index.ts';

// ─── Cache ───────────────────────────────────────────────────

export {
  RecommendationCache,
} from './cache/index.ts';

// ─── Statistics ──────────────────────────────────────────────

export {
  RecommendationStatisticsCollector,
} from './statistics/index.ts';

// ─── Engine ──────────────────────────────────────────────────

export {
  RecommendationEngine,
} from './engine/index.ts';
