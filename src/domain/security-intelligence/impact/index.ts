/**
 * Security Intelligence Impact Analysis Engine — Public API
 *
 * Entry point for the Impact Analysis Engine domain.
 * Provides all types, models, scenarios, delta engines,
 * recommendation ranking, events, cache, and the main engine.
 */

// ─── Types ───────────────────────────────────────────────────

export {
  // Branded IDs
  type ImpactAnalysisId, type ImpactScenarioId, type MitigationEffectId,
  type AttackPathDeltaId, type RiskDeltaId, type SecurityScoreDeltaId,
  type DependencyImpactId, type RemediationCandidateId,

  // Brand functions
  brandImpactAnalysisId, brandImpactScenarioId, brandMitigationEffectId,
  brandAttackPathDeltaId, brandRiskDeltaId, brandSecurityScoreDeltaId,
  brandDependencyImpactId, brandRemediationCandidateId,

  // Utility types
  type Timestamp, type Metadata,

  // Enums
  MitigationScenarioType, AttackPathChangeType, RemediationRankingStrategy, SecurityGrade,

  // Enum value arrays
  ALL_MITIGATION_SCENARIO_TYPES, ALL_ATTACK_PATH_CHANGE_TYPES,
  ALL_REMEDIATION_RANKING_STRATEGIES, ALL_SECURITY_GRADES,

  // Interfaces
  type ImpactAnalysis, type ImpactScenario, type MitigationEffect,
  type AttackPathDelta, type AttackPathDeltaDetail,
  type RiskDelta, type RiskAssessmentDelta,
  type SecurityScoreDelta, type DependencyImpact, type RemediationCandidate,

  // Config
  type ImpactEngineConfig,
  DEFAULT_IMPACT_ENGINE_CONFIG,

  // Statistics
  type ImpactStatistics,

  // Input/Output types
  type AnalysisInput, type ComparisonInput, type ComparisonResult,

  // Cache types
  type ImpactCacheStatistics, type ImpactCacheEntry,
} from './types/index.ts';

// ─── Models ──────────────────────────────────────────────────

export {
  // ID Generation
  generateImpactAnalysisId, generateImpactScenarioId,
  generateMitigationEffectId, generateAttackPathDeltaId,
  generateRiskDeltaId, generateSecurityScoreDeltaId,
  generateDependencyImpactId, generateRemediationCandidateId,

  // Factory Functions
  createImpactScenario, createMitigationEffect,
  createAttackPathDelta, createAttackPathDeltaDetail,
  createRiskDelta, createRiskAssessmentDelta,
  createSecurityScoreDelta, computeSecurityGrade, computeSecurityScore,
  createDependencyImpact, createRemediationCandidate,
  computeRemediationScore, createImpactAnalysis,

  // Input Types
  type ImpactScenarioInput, type MitigationEffectInput,
  type AttackPathDeltaInput, type AttackPathDeltaDetailInput,
  type RiskDeltaInput, type RiskAssessmentDeltaInput,
  type SecurityScoreDeltaInput,
  type DependencyImpactInput, type RemediationCandidateInput,
  type ImpactAnalysisInput,

  // Serialization
  impactAnalysisToJSON, impactAnalysisFromJSON,

  // Equality / Clone / Hash
  impactAnalysesEqual, impactScenariosEqual, remediationCandidatesEqual,
  cloneImpactAnalysis, hashImpactAnalysis,
} from './models/index.ts';

// ─── Scenarios ───────────────────────────────────────────────

export {
  evaluateScenario,
  type ScenarioEvaluationResult,
  createRemoveFindingScenario,
  createPatchVulnerabilityScenario,
  createNetworkIsolationScenario,
  createRemoveCorrelationScenario,
  createRemoveAssetScenario,
  createDisableServiceScenario,
  createCloseEndpointScenario,
  createRotateCredentialScenario,
} from './scenarios/index.ts';

// ─── Delta ───────────────────────────────────────────────────

export {
  computeAttackPathDelta,
  countPathsByChangeType,
  computeAttackSurfaceReduction,
} from './delta/index.ts';

// ─── Risk Delta ──────────────────────────────────────────────

export {
  computeRiskDelta,
  computeOverallRisk,
} from './risk-delta/index.ts';

// ─── Graph Delta ─────────────────────────────────────────────

export {
  computeGraphDelta,
  computeConnectivityScore,
  type GraphDelta, type GraphNodeChange, type GraphEdgeChange, type GraphComponentChange,
} from './graph-delta/index.ts';

// ─── Recommendation ──────────────────────────────────────────

export {
  computeRecommendationImpact,
  rankRemediationCandidates,
  compareRemediationCandidates,
  type RankingResult,
} from './recommendation/index.ts';

// ─── Events ──────────────────────────────────────────────────

export {
  type ImpactAnalysisStartedEvent, type ImpactCalculatedEvent,
  type ScenarioCompletedEvent, type RecommendationRankedEvent,
  type AnyImpactEvent, type ImpactEventHandler,
  createImpactAnalysisStartedEvent, createImpactCalculatedEvent,
  createScenarioCompletedEvent, createRecommendationRankedEvent,
  ImpactEventBus,
} from './events/index.ts';

// ─── Cache ───────────────────────────────────────────────────

export {
  ImpactCache,
} from './cache/index.ts';

// ─── Statistics ──────────────────────────────────────────────

export {
  ImpactStatisticsCollector,
} from './statistics/index.ts';

// ─── Engine ──────────────────────────────────────────────────

export {
  ImpactAnalysisEngine,
} from './engine/index.ts';
