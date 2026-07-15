/**
 * Security Intelligence Attack Path Builder — Domain Models
 *
 * Factory functions for creating immutable attack path domain models.
 * All models are deeply frozen and validated on construction.
 *
 * Design principles:
 * - Factory functions are the ONLY way to create instances
 * - All outputs are deeply frozen (Object.freeze)
 * - Validation happens at construction time
 * - Round-trip serialization via toJSON/fromJSON
 * - Equality, clone, and hash utilities
 */

import type {
  AttackPathId, AttackStepId, AttackChainId, AttackEdgeId, AttackNodeId,
  AttackObjectiveId, AttackSimulationId, Timestamp, Metadata,
  AttackNode, AttackEdge,
  AttackStep, AttackChain, AttackObjective,
  AttackPath, AttackPathRanking, AttackPathSummary, AttackSimulation,
  AttackEvidence, AttackTechnique, DiscoveryConstraints, StopCondition,
  RankingConfig, AttackPathValidationResult, AttackPathValidationError, AttackPathValidationWarning,
} from '../types/index.ts';
import {
  brandAttackPathId, brandAttackStepId, brandAttackChainId, brandAttackEdgeId,
  brandAttackNodeId, brandAttackObjectiveId, brandAttackSimulationId,
  AttackObjectiveType, AttackNodeType, AttackEdgeType, DiscoveryStrategy,
  ALL_ATTACK_OBJECTIVE_TYPES,
} from '../types/index.ts';
import type { RiskLevel } from '../../risk/types/index.ts';
import type { NodeId, EdgeId } from '../../../knowledge-graph/types/index.ts';
import type { FindingId, AssetId } from '../../normalization/types/index.ts';

// ─── ID Generation ───────────────────────────────────────────

/** Generate a unique AttackPathId */
export function generateAttackPathId(): AttackPathId {
  return brandAttackPathId(`ap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`);
}

/** Generate a unique AttackStepId */
export function generateAttackStepId(): AttackStepId {
  return brandAttackStepId(`as_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`);
}

/** Generate a unique AttackChainId */
export function generateAttackChainId(): AttackChainId {
  return brandAttackChainId(`ac_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`);
}

/** Generate a unique AttackEdgeId */
export function generateAttackEdgeId(): AttackEdgeId {
  return brandAttackEdgeId(`ae_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`);
}

/** Generate a unique AttackNodeId */
export function generateAttackNodeId(): AttackNodeId {
  return brandAttackNodeId(`an_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`);
}

/** Generate a unique AttackObjectiveId */
export function generateAttackObjectiveId(): AttackObjectiveId {
  return brandAttackObjectiveId(`ao_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`);
}

/** Generate a unique AttackSimulationId */
export function generateAttackSimulationId(): AttackSimulationId {
  return brandAttackSimulationId(`sim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`);
}

// ─── Attack Node ─────────────────────────────────────────────

/** Input for creating an AttackNode */
export interface AttackNodeInput {
  readonly graphNodeId: NodeId;
  readonly nodeType: AttackNodeType;
  readonly label: string;
  readonly riskScore: number;
  readonly riskLevel: RiskLevel;
  readonly findingIds?: readonly FindingId[];
  readonly assetId?: AssetId | null;
  readonly techniques?: readonly AttackTechnique[];
  readonly isEntryPoint?: boolean;
  readonly isObjective?: boolean;
  readonly metadata?: Metadata;
}

/** Create an immutable AttackNode */
export function createAttackNode(input: AttackNodeInput): AttackNode {
  if (!input.graphNodeId) throw new Error('AttackNode requires graphNodeId');
  if (!input.label) throw new Error('AttackNode requires label');

  return Object.freeze({
    id: generateAttackNodeId(),
    graphNodeId: input.graphNodeId,
    nodeType: input.nodeType,
    label: input.label,
    riskScore: clamp01(input.riskScore),
    riskLevel: input.riskLevel,
    findingIds: Object.freeze([...(input.findingIds ?? [])]),
    assetId: input.assetId ?? null,
    techniques: Object.freeze([...(input.techniques ?? [])]),
    isEntryPoint: input.isEntryPoint ?? false,
    isObjective: input.isObjective ?? false,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

// ─── Attack Edge ─────────────────────────────────────────────

/** Input for creating an AttackEdge */
export interface AttackEdgeInput {
  readonly sourceNodeId: AttackNodeId;
  readonly targetNodeId: AttackNodeId;
  readonly graphEdgeId: EdgeId;
  readonly edgeType: AttackEdgeType;
  readonly technique?: AttackTechnique | null;
  readonly probability?: number;
  readonly riskContribution?: number;
  readonly requiresAuthentication?: boolean;
  readonly requiresPrivilege?: boolean;
  readonly isLateralMovement?: boolean;
  readonly isPrivilegeEscalation?: boolean;
  readonly metadata?: Metadata;
}

/** Create an immutable AttackEdge */
export function createAttackEdge(input: AttackEdgeInput): AttackEdge {
  if (!input.sourceNodeId) throw new Error('AttackEdge requires sourceNodeId');
  if (!input.targetNodeId) throw new Error('AttackEdge requires targetNodeId');
  if (!input.graphEdgeId) throw new Error('AttackEdge requires graphEdgeId');

  return Object.freeze({
    id: generateAttackEdgeId(),
    sourceNodeId: input.sourceNodeId,
    targetNodeId: input.targetNodeId,
    graphEdgeId: input.graphEdgeId,
    edgeType: input.edgeType,
    technique: input.technique ?? null,
    probability: clamp01(input.probability ?? 0.5),
    riskContribution: clamp01(input.riskContribution ?? 0.5),
    requiresAuthentication: input.requiresAuthentication ?? false,
    requiresPrivilege: input.requiresPrivilege ?? false,
    isLateralMovement: input.isLateralMovement ?? false,
    isPrivilegeEscalation: input.isPrivilegeEscalation ?? false,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

// ─── Attack Step ─────────────────────────────────────────────

/** Input for creating an AttackStep */
export interface AttackStepInput {
  readonly node: AttackNode;
  readonly incomingEdge?: AttackEdge | null;
  readonly outgoingEdges?: readonly AttackEdge[];
  readonly stepIndex: number;
  readonly objective?: AttackObjectiveType | null;
  readonly techniques?: readonly AttackTechnique[];
  readonly isCritical?: boolean;
  readonly isDetectionPoint?: boolean;
  readonly metadata?: Metadata;
}

/** Create an immutable AttackStep */
export function createAttackStep(input: AttackStepInput): AttackStep {
  if (!input.node) throw new Error('AttackStep requires node');
  if (input.stepIndex < 0) throw new Error('stepIndex must be non-negative');

  return Object.freeze({
    id: generateAttackStepId(),
    node: input.node,
    incomingEdge: input.incomingEdge ?? null,
    outgoingEdges: Object.freeze([...(input.outgoingEdges ?? [])]),
    stepIndex: input.stepIndex,
    objective: input.objective ?? null,
    techniques: Object.freeze([...(input.techniques ?? [])]),
    isCritical: input.isCritical ?? false,
    isDetectionPoint: input.isDetectionPoint ?? false,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

// ─── Attack Chain ────────────────────────────────────────────

/** Input for creating an AttackChain */
export interface AttackChainInput {
  readonly steps: readonly AttackStep[];
  readonly objective: AttackObjectiveType;
  readonly totalRisk?: number;
  readonly totalProbability?: number;
  readonly metadata?: Metadata;
}

/** Create an immutable AttackChain */
export function createAttackChain(input: AttackChainInput): AttackChain {
  if (!input.steps || input.steps.length === 0) throw new Error('AttackChain requires at least one step');

  const totalRisk = input.totalRisk ?? computeChainRisk(input.steps);
  const totalProbability = input.totalProbability ?? computeChainProbability(input.steps);

  return Object.freeze({
    id: generateAttackChainId(),
    steps: Object.freeze([...input.steps]),
    objective: input.objective,
    totalRisk: clamp01(totalRisk),
    totalProbability: clamp01(totalProbability),
    length: input.steps.length,
    entryPoint: input.steps[0].node,
    endPoint: input.steps[input.steps.length - 1].node,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

// ─── Attack Objective ────────────────────────────────────────

/** Input for creating an AttackObjective */
export interface AttackObjectiveInput {
  readonly type: AttackObjectiveType;
  readonly name?: string;
  readonly description?: string;
  readonly targetNodeIds?: readonly AttackNodeId[];
  readonly entryNodeIds?: readonly AttackNodeId[];
  readonly successCriteria?: readonly string[];
  readonly priority?: number;
  readonly metadata?: Metadata;
}

/** Create an immutable AttackObjective */
export function createAttackObjective(input: AttackObjectiveInput): AttackObjective {
  if (!input.type) throw new Error('AttackObjective requires type');

  return Object.freeze({
    id: generateAttackObjectiveId(),
    type: input.type,
    name: input.name ?? input.type,
    description: input.description ?? `Attack objective: ${input.type}`,
    targetNodeIds: Object.freeze([...(input.targetNodeIds ?? [])]),
    entryNodeIds: Object.freeze([...(input.entryNodeIds ?? [])]),
    successCriteria: Object.freeze([...(input.successCriteria ?? [])]),
    priority: clamp01(input.priority ?? 0.5),
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

// ─── Attack Evidence ─────────────────────────────────────────

/** Create an immutable AttackEvidence */
export function createAttackEvidence(input: {
  readonly sourceType: 'finding' | 'risk-assessment' | 'correlation' | 'knowledge-graph';
  readonly sourceId: string;
  readonly field: string;
  readonly value: string | number | boolean | null;
  readonly confidence: number;
  readonly description: string;
}): AttackEvidence {
  return Object.freeze({
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    field: input.field,
    value: input.value,
    confidence: clamp01(input.confidence),
    description: input.description,
  });
}

// ─── Attack Path Ranking ─────────────────────────────────────

/** Input for creating an AttackPathRanking */
export interface AttackPathRankingInput {
  readonly riskScore: number;
  readonly pathLengthScore: number;
  readonly exploitAvailabilityScore: number;
  readonly privilegeEscalationScore: number;
  readonly lateralMovementScore: number;
  readonly internetExposureScore: number;
  readonly businessImpactScore: number;
  readonly confidenceScore: number;
  readonly config?: RankingConfig;
  readonly rank?: number;
  readonly metadata?: Metadata;
}

/** Compute the overall ranking score deterministically */
export function computeOverallRankingScore(
  scores: Omit<AttackPathRankingInput, 'rank' | 'metadata'>,
  config: RankingConfig,
): number {
  const raw = (
    config.riskWeight * scores.riskScore +
    config.lengthWeight * scores.pathLengthScore +
    config.exploitAvailabilityWeight * scores.exploitAvailabilityScore +
    config.privilegeEscalationWeight * scores.privilegeEscalationScore +
    config.lateralMovementWeight * scores.lateralMovementScore +
    config.internetExposureWeight * scores.internetExposureScore +
    config.businessImpactWeight * scores.businessImpactScore +
    config.confidenceWeight * scores.confidenceScore
  );
  return clamp01(raw);
}

/** Create an immutable AttackPathRanking */
export function createAttackPathRanking(input: AttackPathRankingInput): AttackPathRanking {
  const config = input.config ?? {
    riskWeight: 0.25, lengthWeight: 0.10, exploitAvailabilityWeight: 0.15,
    privilegeEscalationWeight: 0.12, lateralMovementWeight: 0.12,
    internetExposureWeight: 0.10, businessImpactWeight: 0.10, confidenceWeight: 0.06,
  };

  const overallScore = computeOverallRankingScore(input, config);

  return Object.freeze({
    overallScore,
    riskScore: clamp01(input.riskScore),
    pathLengthScore: clamp01(input.pathLengthScore),
    exploitAvailabilityScore: clamp01(input.exploitAvailabilityScore),
    privilegeEscalationScore: clamp01(input.privilegeEscalationScore),
    lateralMovementScore: clamp01(input.lateralMovementScore),
    internetExposureScore: clamp01(input.internetExposureScore),
    businessImpactScore: clamp01(input.businessImpactScore),
    confidenceScore: clamp01(input.confidenceScore),
    rank: input.rank ?? 0,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

// ─── Attack Path ─────────────────────────────────────────────

/** Input for creating an AttackPath */
export interface AttackPathInput {
  readonly steps: readonly AttackStep[];
  readonly chains?: readonly AttackChain[];
  readonly edges: readonly AttackEdge[];
  readonly nodes: readonly AttackNode[];
  readonly objective: AttackObjective;
  readonly ranking: AttackPathRanking;
  readonly evidence?: readonly AttackEvidence[];
  readonly discoveryStrategy: DiscoveryStrategy;
  readonly discoveryDurationMs: number;
  readonly metadata?: Metadata;
}

/** Create an immutable AttackPath */
export function createAttackPath(input: AttackPathInput): AttackPath {
  if (!input.steps || input.steps.length === 0) throw new Error('AttackPath requires at least one step');
  if (!input.nodes || input.nodes.length === 0) throw new Error('AttackPath requires at least one node');

  const entryPoint = input.steps[0].node;
  const endPoint = input.steps[input.steps.length - 1].node;
  const totalRisk = computePathRisk(input.steps);
  const totalProbability = computePathProbability(input.steps);

  return Object.freeze({
    id: generateAttackPathId(),
    steps: Object.freeze([...input.steps]),
    chains: Object.freeze([...(input.chains ?? [])]),
    edges: Object.freeze([...input.edges]),
    nodes: Object.freeze([...input.nodes]),
    objective: input.objective,
    ranking: input.ranking,
    evidence: Object.freeze([...(input.evidence ?? [])]),
    entryPoint,
    endPoint,
    length: input.steps.length,
    totalRisk: clamp01(totalRisk),
    totalProbability: clamp01(totalProbability),
    discoveryStrategy: input.discoveryStrategy,
    discoveryDurationMs: input.discoveryDurationMs,
    discoveredAt: new Date().toISOString() as Timestamp,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

// ─── Attack Path Summary ─────────────────────────────────────

/** Create an immutable AttackPathSummary from a list of paths */
export function createAttackPathSummary(paths: readonly AttackPath[]): AttackPathSummary {
  if (paths.length === 0) {
    return Object.freeze({
      totalPaths: 0,
      averageLength: 0,
      averageRisk: 0,
      averageProbability: 0,
      maxRisk: 0,
      minRisk: 0,
      objectiveDistribution: Object.freeze(
        Object.fromEntries(ALL_ATTACK_OBJECTIVE_TYPES.map(t => [t, 0])) as Readonly<Record<AttackObjectiveType, number>>
      ),
      strategyDistribution: Object.freeze(
        Object.fromEntries(Object.values(DiscoveryStrategy).map(s => [s, 0])) as Readonly<Record<DiscoveryStrategy, number>>
      ),
      topEntryPoints: [],
      topObjectives: [],
      summarizedAt: new Date().toISOString() as Timestamp,
    });
  }

  const risks = paths.map(p => p.totalRisk);
  const objDist: Record<string, number> = {};
  const stratDist: Record<string, number> = {};
  const entryCount = new Map<string, { nodeId: AttackNodeId; label: string; count: number }>();
  const objCount = new Map<string, { nodeId: AttackNodeId; label: string; count: number }>();

  for (const t of ALL_ATTACK_OBJECTIVE_TYPES) objDist[t] = 0;
  for (const s of Object.values(DiscoveryStrategy)) stratDist[s] = 0;

  for (const path of paths) {
    objDist[path.objective.type] = (objDist[path.objective.type] ?? 0) + 1;
    stratDist[path.discoveryStrategy] = (stratDist[path.discoveryStrategy] ?? 0) + 1;

    const epKey = path.entryPoint.id;
    const ep = entryCount.get(epKey) ?? { nodeId: path.entryPoint.id, label: path.entryPoint.label, count: 0 };
    ep.count++;
    entryCount.set(epKey, ep);

    const obKey = path.endPoint.id;
    const ob = objCount.get(obKey) ?? { nodeId: path.endPoint.id, label: path.endPoint.label, count: 0 };
    ob.count++;
    objCount.set(obKey, ob);
  }

  const topEntryPoints = [...entryCount.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(e => Object.freeze(e));

  const topObjectives = [...objCount.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(e => Object.freeze(e));

  return Object.freeze({
    totalPaths: paths.length,
    averageLength: paths.reduce((s, p) => s + p.length, 0) / paths.length,
    averageRisk: risks.reduce((s, r) => s + r, 0) / risks.length,
    averageProbability: paths.reduce((s, p) => s + p.totalProbability, 0) / paths.length,
    maxRisk: Math.max(...risks),
    minRisk: Math.min(...risks),
    objectiveDistribution: Object.freeze(objDist as Readonly<Record<AttackObjectiveType, number>>),
    strategyDistribution: Object.freeze(stratDist as Readonly<Record<DiscoveryStrategy, number>>),
    topEntryPoints: Object.freeze(topEntryPoints),
    topObjectives: Object.freeze(topObjectives),
    summarizedAt: new Date().toISOString() as Timestamp,
  });
}

// ─── Attack Simulation ───────────────────────────────────────

/** Input for creating an AttackSimulation */
export interface AttackSimulationInput {
  readonly pathId: AttackPathId;
  readonly successProbability: number;
  readonly criticalSteps: readonly AttackStep[];
  readonly bottlenecks: readonly AttackStep[];
  readonly detectionPoints: readonly AttackStep[];
  readonly stepProbabilities: readonly { readonly stepId: AttackStepId; readonly probability: number }[];
  readonly cumulativeProbability: number;
  readonly estimatedTimeSteps: number;
  readonly requiredCapabilities: readonly string[];
  readonly metadata?: Metadata;
}

/** Create an immutable AttackSimulation */
export function createAttackSimulation(input: AttackSimulationInput): AttackSimulation {
  return Object.freeze({
    id: generateAttackSimulationId(),
    pathId: input.pathId,
    successProbability: clamp01(input.successProbability),
    criticalSteps: Object.freeze([...input.criticalSteps]),
    bottlenecks: Object.freeze([...input.bottlenecks]),
    detectionPoints: Object.freeze([...input.detectionPoints]),
    stepProbabilities: Object.freeze(input.stepProbabilities.map(sp =>
      Object.freeze({ stepId: sp.stepId, probability: clamp01(sp.probability) })
    )),
    cumulativeProbability: clamp01(input.cumulativeProbability),
    estimatedTimeSteps: input.estimatedTimeSteps,
    requiredCapabilities: Object.freeze([...input.requiredCapabilities]),
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
    simulatedAt: new Date().toISOString() as Timestamp,
  });
}

// ─── Validation ──────────────────────────────────────────────

/** Validate an attack path */
export function validateAttackPath(path: AttackPath): AttackPathValidationResult {
  const errors: AttackPathValidationError[] = [];
  const warnings: AttackPathValidationWarning[] = [];

  if (path.steps.length === 0) {
    errors.push(Object.freeze({ field: 'steps', message: 'Path must have at least one step', code: 'EMPTY_PATH' }));
  }

  if (path.nodes.length === 0) {
    errors.push(Object.freeze({ field: 'nodes', message: 'Path must have at least one node', code: 'NO_NODES' }));
  }

  // Check step indices are sequential
  for (let i = 0; i < path.steps.length; i++) {
    if (path.steps[i].stepIndex !== i) {
      errors.push(Object.freeze({
        field: `steps[${i}].stepIndex`,
        message: `Expected stepIndex ${i}, got ${path.steps[i].stepIndex}`,
        code: 'INVALID_STEP_INDEX',
      }));
    }
  }

  // Check edge connectivity
  for (let i = 1; i < path.steps.length; i++) {
    if (path.steps[i].incomingEdge === null) {
      warnings.push(Object.freeze({
        field: `steps[${i}].incomingEdge`,
        message: `Step ${i} has no incoming edge`,
        code: 'MISSING_INCOMING_EDGE',
      }));
    }
  }

  // Check risk bounds
  if (path.totalRisk < 0 || path.totalRisk > 1) {
    errors.push(Object.freeze({
      field: 'totalRisk',
      message: 'totalRisk must be between 0.0 and 1.0',
      code: 'INVALID_RISK',
    }));
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
  });
}

// ─── Serialization ───────────────────────────────────────────

/** Serialize an AttackPath to JSON */
export function attackPathToJSON(path: AttackPath): string {
  return JSON.stringify(path, null, 2);
}

/** Deserialize an AttackPath from JSON with basic validation */
export function attackPathFromJSON(json: string): AttackPath {
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error('Invalid JSON: cannot deserialize AttackPath');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid AttackPath JSON: expected object');
  }

  if (!parsed.id || typeof parsed.id !== 'string') {
    throw new Error('Invalid AttackPath JSON: missing or invalid id');
  }

  if (!Array.isArray(parsed.steps)) {
    throw new Error('Invalid AttackPath JSON: steps must be an array');
  }

  if (!Array.isArray(parsed.nodes)) {
    throw new Error('Invalid AttackPath JSON: nodes must be an array');
  }

  return Object.freeze({
    ...parsed,
    steps: Object.freeze(parsed.steps ?? []),
    chains: Object.freeze(parsed.chains ?? []),
    edges: Object.freeze(parsed.edges ?? []),
    nodes: Object.freeze(parsed.nodes ?? []),
    evidence: Object.freeze(parsed.evidence ?? []),
    metadata: Object.freeze(parsed.metadata ?? {}),
  });
}

/** Serialize an AttackSimulation to JSON */
export function attackSimulationToJSON(sim: AttackSimulation): string {
  return JSON.stringify(sim, null, 2);
}

// ─── Equality / Clone / Hash ─────────────────────────────────

/** Check two AttackPaths for equality (by ID) */
export function attackPathsEqual(a: AttackPath, b: AttackPath): boolean {
  return a.id === b.id;
}

/** Check two AttackNodes for equality (by ID) */
export function attackNodesEqual(a: AttackNode, b: AttackNode): boolean {
  return a.id === b.id;
}

/** Check two AttackEdges for equality (by ID) */
export function attackEdgesEqual(a: AttackEdge, b: AttackEdge): boolean {
  return a.id === b.id;
}

/** Check two AttackSimulations for equality (by ID) */
export function attackSimulationsEqual(a: AttackSimulation, b: AttackSimulation): boolean {
  return a.id === b.id;
}

/** Clone an AttackPath (deep clone via JSON round-trip) */
export function cloneAttackPath(path: AttackPath): AttackPath {
  return attackPathFromJSON(attackPathToJSON(path));
}

/** Compute a hash for an AttackPath */
export function hashAttackPath(path: AttackPath): number {
  let hash = 0;
  const str = path.id;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
}

// ─── Internal Helpers ────────────────────────────────────────

/** Clamp a number to [0.0, 1.0] */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Compute total risk for a chain of steps */
function computeChainRisk(steps: readonly AttackStep[]): number {
  if (steps.length === 0) return 0;
  const maxRisk = Math.max(...steps.map(s => s.node.riskScore));
  const avgRisk = steps.reduce((sum, s) => sum + s.node.riskScore, 0) / steps.length;
  return 0.7 * maxRisk + 0.3 * avgRisk;
}

/** Compute total probability for a chain of steps */
function computeChainProbability(steps: readonly AttackStep[]): number {
  if (steps.length === 0) return 1.0;
  const probabilities = steps
    .filter(s => s.incomingEdge !== null)
    .map(s => s.incomingEdge!.probability);
  if (probabilities.length === 0) return 1.0;
  return probabilities.reduce((prod, p) => prod * p, 1.0);
}

/** Compute total risk for a path */
function computePathRisk(steps: readonly AttackStep[]): number {
  return computeChainRisk(steps);
}

/** Compute total probability for a path */
function computePathProbability(steps: readonly AttackStep[]): number {
  return computeChainProbability(steps);
}
