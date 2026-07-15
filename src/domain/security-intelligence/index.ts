/**
 * Security Intelligence — Public API
 *
 * Entry point for the Security Intelligence domain.
 * Provides the Finding Normalization Engine, Correlation Engine,
 * Risk Engine, and Attack Path Builder.
 *
 * Future modules (NOT yet implemented):
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

// ─── Attack Path ─────────────────────────────────────────────

export {
  // Types
  type AttackPathId, type AttackStepId, type AttackChainId, type AttackEdgeId, type AttackNodeId,
  type AttackObjectiveId, type AttackSimulationId, type Timestamp as AttackPathTimestamp, type Metadata as AttackPathMetadata,
  type DiscoveryStrategy, type AttackObjectiveType, type AttackNodeType, type AttackEdgeType,
  type AttackNode, type AttackEdge, type AttackStep, type AttackChain, type AttackObjective,
  type AttackPath, type AttackPathRanking, type AttackPathSummary, type AttackSimulation,
  type AttackEvidence, type AttackTechnique, type DiscoveryConstraints, type StopCondition,
  type StopConditionType, type RankingConfig, type AttackPathEngineConfig,
  type AttackPathStatistics, type AttackPathCacheEntry,
  type AttackPathValidationResult, type AttackPathValidationError, type AttackPathValidationWarning,
  type TechniqueRegistry,
  type DiscoveryResult, type DiscoveredPath,
  type RankingResult,
  type SimulationConfig,
  type ConstraintCheckResult, type ConstraintContext,
  type ProjectionResult, type ProjectionConfig,
  type AttackPathCacheStatistics,
  type DiscoveryInput,

  // Enums & Constants
  brandAttackPathId, brandAttackStepId, brandAttackChainId, brandAttackEdgeId,
  brandAttackNodeId, brandAttackObjectiveId, brandAttackSimulationId,
  DiscoveryStrategy, AttackObjectiveType, AttackNodeType, AttackEdgeType,
  StopConditionType,
  ALL_DISCOVERY_STRATEGIES, ALL_ATTACK_OBJECTIVE_TYPES, ALL_ATTACK_NODE_TYPES, ALL_ATTACK_EDGE_TYPES,
  DEFAULT_RANKING_CONFIG, DEFAULT_CONSTRAINTS, DEFAULT_ATTACK_PATH_ENGINE_CONFIG,

  // Models
  generateAttackPathId, generateAttackStepId, generateAttackChainId,
  generateAttackEdgeId, generateAttackNodeId, generateAttackObjectiveId,
  generateAttackSimulationId,
  createAttackNode, createAttackEdge, createAttackStep,
  createAttackChain, createAttackObjective, createAttackEvidence,
  createAttackPathRanking, computeOverallRankingScore,
  createAttackPath, createAttackPathSummary,
  createAttackSimulation,
  validateAttackPath,
  attackPathToJSON, attackPathFromJSON, attackSimulationToJSON,
  attackPathsEqual, attackNodesEqual, attackEdgesEqual, attackSimulationsEqual,
  cloneAttackPath, hashAttackPath,

  // Events
  type PathDiscoveredEvent, type PathRankedEvent,
  type SimulationCompletedEvent, type AttackGraphBuiltEvent,
  type AnyAttackPathEvent, type AttackPathEventHandler,
  createPathDiscoveredEvent, createPathRankedEvent,
  createSimulationCompletedEvent, createAttackGraphBuiltEvent,
  AttackPathEventBus,

  // Discovery
  KnowledgeGraphAdapter, PathDiscoveryEngine,

  // Ranking
  computeRiskScore, computePathLengthScore,
  computeExploitAvailabilityScore, computePrivilegeEscalationScore,
  computeLateralMovementScore, computeInternetExposureScore,
  computeBusinessImpactScore, computeConfidenceScore,
  PathRankingEngine,

  // Techniques
  AttackTechniqueRegistry, DEFAULT_TECHNIQUES,
  createDefaultTechniqueRegistry,

  // Objectives
  createInitialAccessObjective, createCredentialAccessObjective,
  createDiscoveryObjective, createLateralMovementObjective,
  createPrivilegeEscalationObjective, createPersistenceObjective,
  createCollectionObjective, createExfiltrationObjective,
  createImpactObjective, createObjectiveByType,
  getObjectivePriorities,

  // Simulation
  DEFAULT_SIMULATION_CONFIG,
  computeStepProbability, computeCumulativeProbability,
  identifyCriticalSteps, identifyBottlenecks,
  identifyDetectionPoints, determineRequiredCapabilities,
  SimulationEngine,

  // Constraints
  ConstraintsEngine,
  createEmptyConstraintContext, updateConstraintContext,

  // Projection
  DEFAULT_PROJECTION_CONFIG, GraphProjectionEngine,

  // Cache
  AttackPathCache,

  // Engine
  AttackPathEngine,

  // Statistics
  AttackPathStatisticsCollector,
} from './attack-path/index.ts';
