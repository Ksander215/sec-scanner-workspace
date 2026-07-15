/**
 * Security Intelligence Risk Engine — Public API
 *
 * Single entry point for the Risk Engine layer.
 * Transforms CorrelationResults and Knowledge Graph context
 * into deterministic risk assessments.
 *
 * Usage:
 * ```ts
 * import { RiskEngine } from './risk/index.ts';
 *
 * const engine = new RiskEngine({ engineId: 'main' });
 *
 * const assessment = engine.calculate(finding, correlationResult);
 *
 * console.log(assessment.score.rawScore);
 * console.log(assessment.score.level);
 * console.log(assessment.trend);
 * ```
 *
 * Architecture:
 * - Types: Enums, branded IDs, interfaces
 * - Models: RiskAssessment, RiskScore, RiskFactor, etc.
 * - Events: Risk lifecycle observability
 * - Factors: 14 weighted risk factors with extensible registry
 * - Formula: Deterministic 5-group weighted formula
 * - Context: Knowledge Graph integration with heuristic fallback
 * - Aggregation: Per Finding/Asset/Application/Scan/CorrelationGroup
 * - History: Risk change tracking over time
 * - Cache: LRU cache with TTL and invalidation
 * - Engine: RiskEngine (main orchestrator)
 * - Statistics: Comprehensive metrics
 */

// ─── Types ───────────────────────────────────────────────────

export type {
  RiskAssessmentId, RiskScoreId, Timestamp, Metadata,
  RiskLevel, RiskTrend, RiskReason, RiskFactorType, AggregationScope,
  RiskFactor, RiskEvidence, RiskScore, RiskContext,
  RiskAssessment, RiskHistoryEntry, RiskSummary,
  RiskFormulaConfig, RiskEngineConfig, RiskStatistics,
  RiskFactorEvaluator, RiskFactorInput, RiskFactorEvaluatorResult,
  RiskCacheEntry, RiskValidationResult, RiskValidationError, RiskValidationWarning,
} from './types/index.ts';

export {
  brandRiskAssessmentId, brandRiskScoreId,
  RiskLevel, RiskTrend, RiskReason, RiskFactorType, AggregationScope,
  ALL_RISK_LEVELS, ALL_RISK_TRENDS, ALL_RISK_REASONS, ALL_RISK_FACTOR_TYPES, ALL_AGGREGATION_SCOPES,
  RISK_LEVEL_ORDER, RISK_LEVEL_THRESHOLDS,
  DEFAULT_RISK_FORMULA_CONFIG, DEFAULT_RISK_ENGINE_CONFIG,
} from './types/index.ts';

// ─── Models ──────────────────────────────────────────────────

export {
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
} from './models/index.ts';

// ─── Events ──────────────────────────────────────────────────

export type {
  RiskEvent,
  RiskCalculatedEvent, RiskUpdatedEvent,
  RiskChangedEvent, RiskHistoryRecordedEvent,
  AnyRiskEvent, RiskEventHandler,
} from './events/index.ts';

export {
  createRiskCalculatedEvent, createRiskUpdatedEvent,
  createRiskChangedEvent, createRiskHistoryRecordedEvent,
  RiskEventBus,
} from './events/index.ts';

// ─── Factors ─────────────────────────────────────────────────

export {
  BUILT_IN_EVALUATORS,
  FactorRegistry,
} from './factors/index.ts';

// ─── Formula ─────────────────────────────────────────────────

export type {
  RiskFormulaResult,
} from './formula/index.ts';

export {
  RiskFormulaEngine,
} from './formula/index.ts';

// ─── Context ─────────────────────────────────────────────────

export type {
  ContextSource, ContextHints, GraphNodeData,
} from './context/index.ts';

export {
  HeuristicContextSource, KnowledgeGraphContextSource, ContextEngine,
} from './context/index.ts';

// ─── Aggregation ─────────────────────────────────────────────

export type {
  HistoryQuery as AggregationHistoryQuery,
} from './history/index.ts';

export {
  AggregationMethod,
  RiskAggregator,
} from './aggregation/index.ts';

// ─── History ─────────────────────────────────────────────────

export type {
  HistoryQuery, HistoryStatistics,
} from './history/index.ts';

export {
  RiskHistoryManager,
} from './history/index.ts';

// ─── Cache ───────────────────────────────────────────────────

export type {
  RiskCacheStatistics,
} from './cache/index.ts';

export {
  RiskCache,
} from './cache/index.ts';

// ─── Engine ──────────────────────────────────────────────────

export { RiskEngine } from './engine/index.ts';

// ─── Statistics ──────────────────────────────────────────────

export { RiskStatisticsCollector } from './statistics/index.ts';
