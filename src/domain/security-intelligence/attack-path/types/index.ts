/**
 * Security Intelligence Attack Path Builder — Type Definitions
 *
 * All types, interfaces, and enums for the Attack Path Builder layer.
 * These types define the attack path models that transform
 * RiskAssessments, CorrelationGroups, and Knowledge Graph data
 * into deterministic attack paths.
 *
 * Design principles:
 * - All attack path models are immutable and deeply frozen
 * - Branded IDs prevent accidental mixing with Finding/Risk/Node IDs
 * - Path ranking is deterministic (all weights configurable)
 * - Simulation is fully deterministic (no probabilistic algorithms)
 * - Attack techniques use MITRE ATT&CK as extensible model (no hardcoding)
 * - Constraints are enforced during discovery
 */

import type { FindingId, AssetId } from '../../normalization/types/index.ts';
import type { CorrelationGroupId } from '../../correlation/types/index.ts';
import type { RiskAssessmentId, RiskLevel } from '../../risk/types/index.ts';
import type { NodeId, EdgeId } from '../../../knowledge-graph/types/index.ts';

// ─── Branded ID Types ────────────────────────────────────────

/** Branded string for Attack Path IDs */
export type AttackPathId = string & { readonly __brand: 'AttackPathId' };

/** Branded string for Attack Step IDs */
export type AttackStepId = string & { readonly __brand: 'AttackStepId' };

/** Branded string for Attack Chain IDs */
export type AttackChainId = string & { readonly __brand: 'AttackChainId' };

/** Branded string for Attack Edge IDs */
export type AttackEdgeId = string & { readonly __brand: 'AttackEdgeId' };

/** Branded string for Attack Node IDs */
export type AttackNodeId = string & { readonly __brand: 'AttackNodeId' };

/** Branded string for Attack Objective IDs */
export type AttackObjectiveId = string & { readonly __brand: 'AttackObjectiveId' };

/** Branded string for Attack Simulation IDs */
export type AttackSimulationId = string & { readonly __brand: 'AttackSimulationId' };

/** Brand a plain string as an AttackPathId */
export function brandAttackPathId(id: string): AttackPathId {
  return id as AttackPathId;
}

/** Brand a plain string as an AttackStepId */
export function brandAttackStepId(id: string): AttackStepId {
  return id as AttackStepId;
}

/** Brand a plain string as an AttackChainId */
export function brandAttackChainId(id: string): AttackChainId {
  return id as AttackChainId;
}

/** Brand a plain string as an AttackEdgeId */
export function brandAttackEdgeId(id: string): AttackEdgeId {
  return id as AttackEdgeId;
}

/** Brand a plain string as an AttackNodeId */
export function brandAttackNodeId(id: string): AttackNodeId {
  return id as AttackNodeId;
}

/** Brand a plain string as an AttackObjectiveId */
export function brandAttackObjectiveId(id: string): AttackObjectiveId {
  return id as AttackObjectiveId;
}

/** Brand a plain string as an AttackSimulationId */
export function brandAttackSimulationId(id: string): AttackSimulationId {
  return id as AttackSimulationId;
}

// ─── Utility Types ───────────────────────────────────────────

/** ISO-8601 timestamp string */
export type Timestamp = string;

/** Arbitrary key-value metadata */
export type Metadata = Readonly<Record<string, string | number | boolean | null>>;

// ─── Discovery Strategy ──────────────────────────────────────

/**
 * Strategy for path discovery algorithm selection.
 * Maps directly to the Knowledge Graph TraversalEngine strategies.
 */
export enum DiscoveryStrategy {
  /** Breadth-First Search — level-by-level exploration */
  BFS = 'BFS',
  /** Depth-First Search — deep exploration before backtracking */
  DFS = 'DFS',
  /** Shortest Path — minimal hop count path */
  ShortestPath = 'ShortestPath',
  /** Multi Path — K-shortest paths discovery */
  MultiPath = 'MultiPath',
  /** Reachability — all reachable nodes from a source */
  Reachability = 'Reachability',
}

/** All discovery strategy values */
export const ALL_DISCOVERY_STRATEGIES: readonly DiscoveryStrategy[] = Object.values(DiscoveryStrategy) as DiscoveryStrategy[];

// ─── Attack Objective Type ────────────────────────────────────

/**
 * Types of attack objectives aligned with MITRE ATT&CK tactics.
 * Each objective represents a goal an attacker may pursue.
 */
export enum AttackObjectiveType {
  InitialAccess = 'InitialAccess',
  CredentialAccess = 'CredentialAccess',
  Discovery = 'Discovery',
  LateralMovement = 'LateralMovement',
  PrivilegeEscalation = 'PrivilegeEscalation',
  Persistence = 'Persistence',
  Collection = 'Collection',
  Exfiltration = 'Exfiltration',
  Impact = 'Impact',
}

/** All attack objective type values */
export const ALL_ATTACK_OBJECTIVE_TYPES: readonly AttackObjectiveType[] = Object.values(AttackObjectiveType) as AttackObjectiveType[];

// ─── Attack Technique ────────────────────────────────────────

/**
 * An extensible attack technique representation.
 * Uses MITRE ATT&CK as the reference framework but does not
 * hardcode techniques — they are registered at runtime.
 */
export interface AttackTechnique {
  /** MITRE ATT&CK technique ID (e.g. T1190) */
  readonly id: string;
  /** Human-readable technique name */
  readonly name: string;
  /** MITRE ATT&CK tactic this technique belongs to */
  readonly tactic: AttackObjectiveType;
  /** Description of the technique */
  readonly description: string;
  /** Sub-technique IDs if applicable */
  readonly subTechniques: readonly string[];
  /** Whether this technique is commonly observed */
  readonly frequency: number; // 0.0–1.0
  /** Difficulty of execution (0.0 = trivial, 1.0 = very hard) */
  readonly difficulty: number; // 0.0–1.0
  /** Detection difficulty (0.0 = easy to detect, 1.0 = very hard) */
  readonly detectionDifficulty: number; // 0.0–1.0
  /** External references (URLs) */
  readonly references: readonly string[];
  readonly metadata: Metadata;
}

// ─── Attack Node ─────────────────────────────────────────────

/**
 * A node in the attack graph.
 * Represents an asset, finding, or intermediate step in an attack path.
 */
export interface AttackNode {
  readonly id: AttackNodeId;
  readonly graphNodeId: NodeId;          // Corresponding KG node
  readonly nodeType: AttackNodeType;
  readonly label: string;
  readonly riskScore: number;            // 0.0–1.0 from RiskAssessment
  readonly riskLevel: RiskLevel;
  readonly findingIds: readonly FindingId[];
  readonly assetId: AssetId | null;
  readonly techniques: readonly AttackTechnique[];
  readonly isEntryPoint: boolean;        // Internet-facing / external
  readonly isObjective: boolean;         // High-value target
  readonly metadata: Metadata;
}

// ─── Attack Node Type ────────────────────────────────────────

/**
 * Types of nodes in the attack graph.
 * Corresponds to the types of entities that can appear in an attack path.
 */
export enum AttackNodeType {
  EntryPoint = 'EntryPoint',
  Asset = 'Asset',
  Vulnerability = 'Vulnerability',
  Misconfiguration = 'Misconfiguration',
  Credential = 'Credential',
  Service = 'Service',
  Application = 'Application',
  Infrastructure = 'Infrastructure',
  DataStore = 'DataStore',
  Objective = 'Objective',
}

/** All attack node type values */
export const ALL_ATTACK_NODE_TYPES: readonly AttackNodeType[] = Object.values(AttackNodeType) as AttackNodeType[];

// ─── Attack Edge ─────────────────────────────────────────────

/**
 * An edge in the attack graph.
 * Represents a step an attacker can take between two nodes.
 */
export interface AttackEdge {
  readonly id: AttackEdgeId;
  readonly sourceNodeId: AttackNodeId;
  readonly targetNodeId: AttackNodeId;
  readonly graphEdgeId: EdgeId;          // Corresponding KG edge
  readonly edgeType: AttackEdgeType;
  readonly technique: AttackTechnique | null;
  readonly probability: number;          // 0.0–1.0 (deterministic, based on factors)
  readonly riskContribution: number;     // 0.0–1.0
  readonly requiresAuthentication: boolean;
  readonly requiresPrivilege: boolean;
  readonly isLateralMovement: boolean;
  readonly isPrivilegeEscalation: boolean;
  readonly metadata: Metadata;
}

// ─── Attack Edge Type ────────────────────────────────────────

/**
 * Types of edges in the attack graph.
 * Describes the nature of the attacker's transition between nodes.
 */
export enum AttackEdgeType {
  Exploitation = 'Exploitation',
  CredentialUse = 'CredentialUse',
  LateralMovement = 'LateralMovement',
  PrivilegeEscalation = 'PrivilegeEscalation',
  Discovery = 'Discovery',
  Persistence = 'Persistence',
  DataAccess = 'DataAccess',
  Exfiltration = 'Exfiltration',
  Dependency = 'Dependency',
  TrustRelationship = 'TrustRelationship',
}

/** All attack edge type values */
export const ALL_ATTACK_EDGE_TYPES: readonly AttackEdgeType[] = Object.values(AttackEdgeType) as AttackEdgeType[];

// ─── Attack Step ─────────────────────────────────────────────

/**
 * A single step in an attack path.
 * Combines an attack node with incoming/outgoing edges and context.
 */
export interface AttackStep {
  readonly id: AttackStepId;
  readonly node: AttackNode;
  readonly incomingEdge: AttackEdge | null;  // null for the first step
  readonly outgoingEdges: readonly AttackEdge[];
  readonly stepIndex: number;                // Position in the path (0-based)
  readonly objective: AttackObjectiveType | null;
  readonly techniques: readonly AttackTechnique[];
  readonly isCritical: boolean;              // Whether this step is a bottleneck
  readonly isDetectionPoint: boolean;        // Whether this step can be detected
  readonly metadata: Metadata;
}

// ─── Attack Chain ────────────────────────────────────────────

/**
 * A sequence of attack steps forming a logical attack chain.
 * Multiple chains can be combined into an attack path.
 */
export interface AttackChain {
  readonly id: AttackChainId;
  readonly steps: readonly AttackStep[];
  readonly objective: AttackObjectiveType;
  readonly totalRisk: number;              // 0.0–1.0
  readonly totalProbability: number;       // 0.0–1.0
  readonly length: number;
  readonly entryPoint: AttackNode;
  readonly endPoint: AttackNode;
  readonly metadata: Metadata;
}

// ─── Attack Evidence ─────────────────────────────────────────

/**
 * Evidence supporting an attack path or step.
 * References findings, risk assessments, and KG data.
 */
export interface AttackEvidence {
  readonly sourceType: 'finding' | 'risk-assessment' | 'correlation' | 'knowledge-graph';
  readonly sourceId: string;
  readonly field: string;
  readonly value: string | number | boolean | null;
  readonly confidence: number;  // 0.0–1.0
  readonly description: string;
}

// ─── Attack Objective ────────────────────────────────────────

/**
 * A specific attack objective that paths can be discovered for.
 * Combines a type with target nodes and success criteria.
 */
export interface AttackObjective {
  readonly id: AttackObjectiveId;
  readonly type: AttackObjectiveType;
  readonly name: string;
  readonly description: string;
  readonly targetNodeIds: readonly AttackNodeId[];
  readonly entryNodeIds: readonly AttackNodeId[];
  readonly successCriteria: readonly string[];
  readonly priority: number;  // 0.0–1.0
  readonly metadata: Metadata;
}

// ─── Attack Path ─────────────────────────────────────────────

/**
 * A complete attack path from entry point to objective.
 * Contains all steps, edges, rankings, and supporting evidence.
 */
export interface AttackPath {
  readonly id: AttackPathId;
  readonly steps: readonly AttackStep[];
  readonly chains: readonly AttackChain[];
  readonly edges: readonly AttackEdge[];
  readonly nodes: readonly AttackNode[];
  readonly objective: AttackObjective;
  readonly ranking: AttackPathRanking;
  readonly evidence: readonly AttackEvidence[];
  readonly entryPoint: AttackNode;
  readonly endPoint: AttackNode;
  readonly length: number;
  readonly totalRisk: number;            // 0.0–1.0
  readonly totalProbability: number;     // 0.0–1.0
  readonly discoveryStrategy: DiscoveryStrategy;
  readonly discoveryDurationMs: number;
  readonly discoveredAt: Timestamp;
  readonly metadata: Metadata;
}

// ─── Attack Path Ranking ─────────────────────────────────────

/**
 * Ranking of an attack path based on multiple weighted factors.
 * All factors are computed deterministically.
 */
export interface AttackPathRanking {
  readonly overallScore: number;           // 0.0–1.0, weighted composite
  readonly riskScore: number;              // From risk assessments
  readonly pathLengthScore: number;        // Shorter paths score higher
  readonly exploitAvailabilityScore: number;
  readonly privilegeEscalationScore: number;
  readonly lateralMovementScore: number;
  readonly internetExposureScore: number;
  readonly businessImpactScore: number;
  readonly confidenceScore: number;
  readonly rank: number;                   // Position among all paths (1-based, 1 = best)
  readonly metadata: Metadata;
}

// ─── Attack Path Summary ─────────────────────────────────────

/**
 * Aggregated summary of all discovered attack paths.
 */
export interface AttackPathSummary {
  readonly totalPaths: number;
  readonly averageLength: number;
  readonly averageRisk: number;
  readonly averageProbability: number;
  readonly maxRisk: number;
  readonly minRisk: number;
  readonly objectiveDistribution: Readonly<Record<AttackObjectiveType, number>>;
  readonly strategyDistribution: Readonly<Record<DiscoveryStrategy, number>>;
  readonly topEntryPoints: readonly { readonly nodeId: AttackNodeId; readonly label: string; readonly count: number }[];
  readonly topObjectives: readonly { readonly nodeId: AttackNodeId; readonly label: string; readonly count: number }[];
  readonly summarizedAt: Timestamp;
}

// ─── Attack Simulation ───────────────────────────────────────

/**
 * Result of simulating an attack path.
 * All calculations are deterministic — no probabilistic algorithms.
 */
export interface AttackSimulation {
  readonly id: AttackSimulationId;
  readonly pathId: AttackPathId;
  readonly successProbability: number;     // 0.0–1.0
  readonly criticalSteps: readonly AttackStep[];
  readonly bottlenecks: readonly AttackStep[];
  readonly detectionPoints: readonly AttackStep[];
  readonly stepProbabilities: readonly { readonly stepId: AttackStepId; readonly probability: number }[];
  readonly cumulativeProbability: number;  // Product of step probabilities
  readonly estimatedTimeSteps: number;     // Estimated number of time steps
  readonly requiredCapabilities: readonly string[];
  readonly metadata: Metadata;
  readonly simulatedAt: Timestamp;
}

// ─── Discovery Constraints ───────────────────────────────────

/**
 * Constraints for path discovery.
 * Limits the scope and depth of path exploration.
 */
export interface DiscoveryConstraints {
  readonly maximumDepth: number;
  readonly maximumPaths: number;
  readonly forbiddenNodeIds: readonly NodeId[];
  readonly forbiddenEdgeIds: readonly EdgeId[];
  readonly stopConditions: readonly StopCondition[];
  readonly requiredNodeTypes: readonly AttackNodeType[];
  readonly requiredEdgeTypes: readonly AttackEdgeType[];
  readonly minimumRiskScore: number;     // 0.0–1.0, skip paths below this
  readonly timeoutMs: number;
}

/** A stop condition for path discovery */
export interface StopCondition {
  readonly type: StopConditionType;
  readonly value: string | number | boolean;
  readonly description: string;
}

/** Types of stop conditions */
export enum StopConditionType {
  MaxNodesVisited = 'MaxNodesVisited',
  MaxEdgesTraversed = 'MaxEdgesTraversed',
  RiskThresholdReached = 'RiskThresholdReached',
  ObjectiveReached = 'ObjectiveReached',
  CycleDetected = 'CycleDetected',
  Custom = 'Custom',
}

// ─── Ranking Configuration ───────────────────────────────────

/**
 * Configuration for path ranking weights.
 * All weights are configurable and determine how each factor
 * contributes to the overall path ranking score.
 *
 * Formula:
 * Ranking = RiskWeight × RiskScore +
 *           LengthWeight × LengthScore +
 *           ExploitWeight × ExploitScore +
 *           PrivEscWeight × PrivEscScore +
 *           LateralWeight × LateralScore +
 *           ExposureWeight × ExposureScore +
 *           ImpactWeight × ImpactScore +
 *           ConfidenceWeight × ConfidenceScore
 */
export interface RankingConfig {
  readonly riskWeight: number;              // Default: 0.25
  readonly lengthWeight: number;            // Default: 0.10
  readonly exploitAvailabilityWeight: number; // Default: 0.15
  readonly privilegeEscalationWeight: number; // Default: 0.12
  readonly lateralMovementWeight: number;   // Default: 0.12
  readonly internetExposureWeight: number;  // Default: 0.10
  readonly businessImpactWeight: number;    // Default: 0.10
  readonly confidenceWeight: number;        // Default: 0.06
}

/** Default ranking configuration */
export const DEFAULT_RANKING_CONFIG: RankingConfig = Object.freeze({
  riskWeight: 0.25,
  lengthWeight: 0.10,
  exploitAvailabilityWeight: 0.15,
  privilegeEscalationWeight: 0.12,
  lateralMovementWeight: 0.12,
  internetExposureWeight: 0.10,
  businessImpactWeight: 0.10,
  confidenceWeight: 0.06,
});

// ─── Engine Configuration ────────────────────────────────────

/** Configuration for the attack path engine */
export interface AttackPathEngineConfig {
  readonly engineId: string;
  readonly rankingConfig: RankingConfig;
  readonly defaultConstraints: DiscoveryConstraints;
  readonly enableCaching: boolean;
  readonly cacheSize: number;
  readonly cacheTtlMs: number;
  readonly batchSize: number;
  readonly formulaVersion: string;
  readonly simulationStepBase: number;       // Base probability per step (default: 0.85)
}

/** Default discovery constraints */
export const DEFAULT_CONSTRAINTS: DiscoveryConstraints = Object.freeze({
  maximumDepth: 15,
  maximumPaths: 50,
  forbiddenNodeIds: [],
  forbiddenEdgeIds: [],
  stopConditions: [],
  requiredNodeTypes: [],
  requiredEdgeTypes: [],
  minimumRiskScore: 0.0,
  timeoutMs: 30_000,
});

/** Default engine configuration */
export const DEFAULT_ATTACK_PATH_ENGINE_CONFIG: AttackPathEngineConfig = Object.freeze({
  engineId: 'default',
  rankingConfig: DEFAULT_RANKING_CONFIG,
  defaultConstraints: DEFAULT_CONSTRAINTS,
  enableCaching: true,
  cacheSize: 5_000,
  cacheTtlMs: 300_000,
  batchSize: 1000,
  formulaVersion: '1.0.0',
  simulationStepBase: 0.85,
});

// ─── Engine Statistics ───────────────────────────────────────

/** Comprehensive attack path engine statistics */
export interface AttackPathStatistics {
  readonly totalDiscoveries: number;
  readonly totalRankings: number;
  readonly totalSimulations: number;
  readonly totalProjections: number;
  readonly totalFailed: number;
  readonly totalBatches: number;
  readonly averageDiscoveryTimeMs: number;
  readonly averageRankingTimeMs: number;
  readonly averageSimulationTimeMs: number;
  readonly averageProjectionTimeMs: number;
  readonly throughputPerSecond: number;
  readonly cacheHitRate: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly memoryUsageBytes: number;
  readonly strategyDistribution: Readonly<Record<DiscoveryStrategy, number>>;
  readonly objectiveDistribution: Readonly<Record<AttackObjectiveType, number>>;
  readonly collectedAt: Timestamp;
}

// ─── Cache Entry ─────────────────────────────────────────────

/** Entry in the path cache */
export interface AttackPathCacheEntry {
  readonly key: string;
  readonly value: AttackPath | AttackSimulation;
  readonly type: 'path' | 'simulation';
  readonly createdAt: Timestamp;
  readonly expiresAt: Timestamp;
  readonly accessCount: number;
}

// ─── Validation Result ───────────────────────────────────────

/** Result of validating an attack path */
export interface AttackPathValidationResult {
  readonly valid: boolean;
  readonly errors: readonly AttackPathValidationError[];
  readonly warnings: readonly AttackPathValidationWarning[];
}

/** Attack path validation error */
export interface AttackPathValidationError {
  readonly field: string;
  readonly message: string;
  readonly code: string;
}

/** Attack path validation warning */
export interface AttackPathValidationWarning {
  readonly field: string;
  readonly message: string;
  readonly code: string;
}

// ─── Technique Registry Interface ────────────────────────────

/** Interface for registering and retrieving attack techniques */
export interface TechniqueRegistry {
  /** Register a technique */
  register(technique: AttackTechnique): void;
  /** Get a technique by ID */
  getById(id: string): AttackTechnique | null;
  /** Get techniques by tactic */
  getByTactic(tactic: AttackObjectiveType): readonly AttackTechnique[];
  /** Get all registered techniques */
  getAll(): readonly AttackTechnique[];
  /** Check if a technique is registered */
  has(id: string): boolean;
  /** Get count of registered techniques */
  readonly size: number;
}
