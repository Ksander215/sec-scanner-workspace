/**
 * Security Intelligence Attack Path Builder — Public API
 *
 * Single entry point for the Attack Path Builder layer.
 * Transforms RiskAssessments, CorrelationGroups, and Knowledge Graph data
 * into deterministic attack paths.
 *
 * Usage:
 * ```ts
 * import { AttackPathEngine } from './attack-path/index.ts';
 *
 * const engine = new AttackPathEngine(traversalEngine, { engineId: 'main' });
 *
 * const paths = await engine.discover({
 *   sourceId: 'node-1',
 *   targetIds: ['node-10'],
 *   objectiveType: 'Impact',
 * });
 *
 * const ranked = engine.rank(paths);
 * const simulation = engine.simulate(ranked[0]);
 * ```
 *
 * Architecture:
 * - Types: Enums, branded IDs, interfaces
 * - Models: AttackPath, AttackStep, AttackChain, etc.
 * - Events: Attack path lifecycle observability
 * - Discovery: Path discovery via GraphTraversalEngine
 * - Ranking: Deterministic 8-factor weighted ranking
 * - Techniques: MITRE ATT&CK extensible technique registry
 * - Objectives: 9 MITRE ATT&CK-aligned objectives
 * - Simulation: Deterministic attack simulation
 * - Constraints: Path discovery constraint enforcement
 * - Projection: Subgraph extraction for paths
 * - Cache: Dual LRU cache (path + simulation)
 * - Engine: AttackPathEngine (main orchestrator)
 * - Statistics: Comprehensive metrics
 */

// ─── Types ───────────────────────────────────────────────────

export type {
  AttackPathId, AttackStepId, AttackChainId, AttackEdgeId, AttackNodeId,
  AttackObjectiveId, AttackSimulationId, Timestamp, Metadata,
  DiscoveryStrategy, AttackObjectiveType, AttackNodeType, AttackEdgeType,
  AttackNode, AttackEdge, AttackStep, AttackChain, AttackObjective,
  AttackPath, AttackPathRanking, AttackPathSummary, AttackSimulation,
  AttackEvidence, AttackTechnique, DiscoveryConstraints, StopCondition,
  StopConditionType, RankingConfig, AttackPathEngineConfig,
  AttackPathStatistics, AttackPathCacheEntry,
  AttackPathValidationResult, AttackPathValidationError, AttackPathValidationWarning,
  TechniqueRegistry,
} from './types/index.ts';

export {
  brandAttackPathId, brandAttackStepId, brandAttackChainId, brandAttackEdgeId,
  brandAttackNodeId, brandAttackObjectiveId, brandAttackSimulationId,
  DiscoveryStrategy, AttackObjectiveType, AttackNodeType, AttackEdgeType,
  StopConditionType,
  ALL_DISCOVERY_STRATEGIES, ALL_ATTACK_OBJECTIVE_TYPES, ALL_ATTACK_NODE_TYPES, ALL_ATTACK_EDGE_TYPES,
  DEFAULT_RANKING_CONFIG, DEFAULT_CONSTRAINTS, DEFAULT_ATTACK_PATH_ENGINE_CONFIG,
} from './types/index.ts';

// ─── Models ──────────────────────────────────────────────────

export type {
  AttackNodeInput, AttackEdgeInput, AttackStepInput,
  AttackChainInput, AttackObjectiveInput, AttackPathRankingInput,
  AttackPathInput, AttackSimulationInput,
} from './models/index.ts';

export {
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
} from './models/index.ts';

// ─── Events ──────────────────────────────────────────────────

export type {
  PathDiscoveredEvent, PathRankedEvent,
  SimulationCompletedEvent, AttackGraphBuiltEvent,
  AnyAttackPathEvent, AttackPathEventHandler,
} from './events/index.ts';

export {
  createPathDiscoveredEvent, createPathRankedEvent,
  createSimulationCompletedEvent, createAttackGraphBuiltEvent,
  AttackPathEventBus,
} from './events/index.ts';

// ─── Discovery ───────────────────────────────────────────────

export type {
  DiscoveryResult, DiscoveredPath,
} from './discovery/index.ts';

export {
  KnowledgeGraphAdapter, PathDiscoveryEngine,
} from './discovery/index.ts';

// ─── Ranking ─────────────────────────────────────────────────

export type {
  RankingResult,
} from './ranking/index.ts';

export {
  computeRiskScore, computePathLengthScore,
  computeExploitAvailabilityScore, computePrivilegeEscalationScore,
  computeLateralMovementScore, computeInternetExposureScore,
  computeBusinessImpactScore, computeConfidenceScore,
  PathRankingEngine,
} from './ranking/index.ts';

// ─── Techniques ──────────────────────────────────────────────

export {
  AttackTechniqueRegistry, DEFAULT_TECHNIQUES,
  createDefaultTechniqueRegistry,
} from './techniques/index.ts';

// ─── Objectives ──────────────────────────────────────────────

export {
  createInitialAccessObjective, createCredentialAccessObjective,
  createDiscoveryObjective, createLateralMovementObjective,
  createPrivilegeEscalationObjective, createPersistenceObjective,
  createCollectionObjective, createExfiltrationObjective,
  createImpactObjective, createObjectiveByType,
  getObjectivePriorities,
} from './objectives/index.ts';

// ─── Simulation ──────────────────────────────────────────────

export type {
  SimulationConfig,
} from './simulation/index.ts';

export {
  DEFAULT_SIMULATION_CONFIG,
  computeStepProbability, computeCumulativeProbability,
  identifyCriticalSteps, identifyBottlenecks,
  identifyDetectionPoints, determineRequiredCapabilities,
  SimulationEngine,
} from './simulation/index.ts';

// ─── Constraints ─────────────────────────────────────────────

export type {
  ConstraintCheckResult, ConstraintContext,
} from './constraints/index.ts';

export {
  ConstraintsEngine,
  createEmptyConstraintContext, updateConstraintContext,
} from './constraints/index.ts';

// ─── Projection ──────────────────────────────────────────────

export type {
  ProjectionResult, ProjectionConfig,
} from './projection/index.ts';

export {
  DEFAULT_PROJECTION_CONFIG, GraphProjectionEngine,
} from './projection/index.ts';

// ─── Cache ───────────────────────────────────────────────────

export type {
  AttackPathCacheStatistics,
} from './cache/index.ts';

export {
  AttackPathCache,
} from './cache/index.ts';

// ─── Engine ──────────────────────────────────────────────────

export type {
  DiscoveryInput,
} from './engine/index.ts';

export {
  AttackPathEngine,
} from './engine/index.ts';

// ─── Statistics ──────────────────────────────────────────────

export {
  AttackPathStatisticsCollector,
} from './statistics/index.ts';
