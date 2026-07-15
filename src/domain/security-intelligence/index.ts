/**
 * Security Intelligence — Public API
 *
 * Entry point for the Security Intelligence domain.
 * Provides the Finding Normalization Engine, Correlation Engine, and Risk Engine.
 *
 * Future modules (NOT yet implemented):
 * - Attack Path Builder
 * - Recommendation Engine
 */

// ─── Normalization ───────────────────────────────────────────

export {
  // Types
  type FindingId, type EvidenceId, type AssetId, type Timestamp, type Metadata, type StringMap,
  type Severity, type SourceEngine, type FindingCategory, type ConfidenceLevel,
  type EvidenceType, type AssetType,
  type CWEReference, type CVEReference, type CVSSScore,
  type CanonicalURL, type AffectedAsset, type NormalizedEvidence,
  type CanonicalFinding,
  type RawFinding,
  type NormalizationResult, type BatchNormalizationResult,
  type NormalizationError, type NormalizationWarning, type BatchNormalizationError,
  type ValidationResult, type ValidationError, type ValidationWarning,
  type NormalizationConfig, type NormalizationStatistics,

  // Enums & Constants
  brandFindingId, brandEvidenceId, brandAssetId,
  Severity, SourceEngine, FindingCategory, ConfidenceLevel,
  EvidenceType, AssetType,
  ALL_SEVERITIES, ALL_SOURCE_ENGINES, SEVERITY_ORDER, CONFIDENCE_ORDER,
  DEFAULT_NORMALIZATION_CONFIG,

  // Models
  generateFindingId, generateEvidenceId, generateAssetId,
  createCanonicalFinding, createCWEReference, createCVEReference,
  createCVSSScore, createCanonicalURL, createAffectedAsset, createNormalizedEvidence,
  canonicalFindingToJSON, canonicalFindingFromJSON,
  canonicalFindingsEqual, cloneCanonicalFinding, hashCanonicalFinding,

  // Events
  type FindingNormalizedEvent, type NormalizationFailedEvent,
  type BatchNormalizedEvent, type CanonicalizationCompletedEvent,
  type AnyNormalizationEvent, type NormalizationEventHandler,
  createFindingNormalizedEvent, createNormalizationFailedEvent,
  createBatchNormalizedEvent, createCanonicalizationCompletedEvent,
  NormalizationEventBus,

  // Normalizers
  normalizeSeverity, cvssScoreToSeverity, compareSeverities, maxSeverity,
  calculateConfidence, normalizeConfidence, compareConfidence, CONFIDENCE_WEIGHTS,
  normalizeCWE, normalizeCWEList, normalizeCVE, normalizeCVEList, normalizeCVSS,
  normalizeTechnology, normalizeTechnologyList, isKnownTechnology, getKnownTechnologies, getTechnologyAliases,
  normalizeURL, urlsEqual, canonicalURLToString, extractRootURL,
  normalizeEvidence, normalizeEvidenceList, detectEvidenceType,
  resolveAsset, determineAssetType,
  validateFinding, validateFindingBatch,

  // Normalizer Types
  type SeverityNormalizationResult, type ConfidenceInput, type ConfidenceResult,
  type TechnologyNormalizationResult, type URLNormalizationResult,
  type EvidenceNormalizationResult, type AssetResolutionResult,

  // Engine
  FindingNormalizationEngine,

  // Statistics
  NormalizationStatisticsCollector,
} from './normalization/index.ts';

// ─── Correlation ─────────────────────────────────────────────

export {
  // Types
  type CorrelationId, type CorrelationGroupId, type CorrelationEdgeId, type Timestamp as CorrelationTimestamp, type Metadata as CorrelationMetadata,
  type CorrelationReason, type DuplicateType,
  type CorrelationEvidence, type CorrelationEdge, type CorrelationGroup, type Correlation,
  type CorrelationResult, type CorrelationResultStatistics, type DuplicateDetection,
  type CorrelationConfig, type CorrelationStatistics,
  type CorrelationRule, type CorrelationFindingInput, type CorrelationEvidenceInput,
  type CorrelationRuleResult, type CorrelationCacheEntry,
  type CorrelationValidationResult, type CorrelationValidationError, type CorrelationValidationWarning,

  // Enums & Constants
  brandCorrelationId, brandCorrelationGroupId, brandCorrelationEdgeId,
  CorrelationReason, DuplicateType,
  ALL_CORRELATION_REASONS, ALL_DUPLICATE_TYPES,
  DEFAULT_CORRELATION_CONFIG,

  // Models
  generateCorrelationId, generateCorrelationGroupId, generateCorrelationEdgeId,
  createCorrelationEvidence, createCorrelationEdge, createCorrelationGroup,
  createCorrelation, createDuplicateDetection, createCorrelationResult,
  createEmptyResultStatistics,
  toCorrelationFindingInput,
  correlationToJSON, correlationFromJSON,
  correlationGroupToJSON, correlationResultToJSON,
  correlationsEqual, correlationGroupsEqual,
  cloneCorrelation, hashCorrelation,

  // Events
  type CorrelationEvent,
  type CorrelationStartedEvent, type CorrelationCompletedEvent,
  type CorrelationFailedEvent, type DuplicateDetectedEvent, type CorrelationGraphBuiltEvent,
  type AnyCorrelationEvent, type CorrelationEventHandler,
  createCorrelationStartedEvent, createCorrelationCompletedEvent,
  createCorrelationFailedEvent, createDuplicateDetectedEvent,
  createCorrelationGraphBuiltEvent,
  CorrelationEventBus,

  // Rules
  BUILT_IN_RULES,
  RuleRegistry,

  // Deduplication
  type DuplicateDetectionResult, type DuplicateDetectionStatistics,
  DuplicateDetector,

  // Graph
  type CorrelationGraphSnapshot,
  CorrelationGraph,

  // Cache
  type CacheStatistics,
  CorrelationCache,

  // KG Adapter
  type KGAdapterResult, type KGAdapterStatistics,
  CorrelationKGAdapter,

  // Engine
  CorrelationEngine,

  // Statistics
  CorrelationStatisticsCollector,
} from './correlation/index.ts';

// ─── Risk ────────────────────────────────────────────────────

export {
  // Types
  type RiskAssessmentId, type RiskScoreId, type Timestamp as RiskTimestamp, type Metadata as RiskMetadata,
  type RiskLevel, type RiskTrend, type RiskReason, type RiskFactorType, type AggregationScope,
  type RiskFactor, type RiskEvidence, type RiskScore, type RiskContext,
  type RiskAssessment, type RiskHistoryEntry, type RiskSummary,
  type RiskFormulaConfig, type RiskEngineConfig, type RiskStatistics,
  type RiskFactorEvaluator, type RiskFactorInput, type RiskFactorEvaluatorResult,
  type RiskCacheEntry, type RiskValidationResult, type RiskValidationError, type RiskValidationWarning,

  // Enums & Constants
  brandRiskAssessmentId, brandRiskScoreId,
  RiskLevel, RiskTrend, RiskReason, RiskFactorType, AggregationScope,
  ALL_RISK_LEVELS, ALL_RISK_TRENDS, ALL_RISK_REASONS, ALL_RISK_FACTOR_TYPES, ALL_AGGREGATION_SCOPES,
  RISK_LEVEL_ORDER, RISK_LEVEL_THRESHOLDS,
  DEFAULT_RISK_FORMULA_CONFIG, DEFAULT_RISK_ENGINE_CONFIG,

  // Models
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

  // Events
  type RiskEvent,
  type RiskCalculatedEvent, type RiskUpdatedEvent,
  type RiskChangedEvent, type RiskHistoryRecordedEvent,
  type AnyRiskEvent, type RiskEventHandler,
  createRiskCalculatedEvent, createRiskUpdatedEvent,
  createRiskChangedEvent, createRiskHistoryRecordedEvent,
  RiskEventBus,

  // Factors
  BUILT_IN_EVALUATORS,
  FactorRegistry,

  // Formula
  type RiskFormulaResult,
  RiskFormulaEngine,

  // Context
  type ContextSource, type ContextHints, type GraphNodeData,
  HeuristicContextSource, KnowledgeGraphContextSource, ContextEngine,

  // Aggregation
  AggregationMethod,
  RiskAggregator,

  // History
  type HistoryQuery, type HistoryStatistics,
  RiskHistoryManager,

  // Cache
  type RiskCacheStatistics,
  RiskCache,

  // Engine
  RiskEngine,

  // Statistics
  RiskStatisticsCollector,
} from './risk/index.ts';
