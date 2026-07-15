/**
 * Attack Path Builder — Full Test Suite
 *
 * Covers: ranking, simulation, traversal integration, constraints,
 * cache, edge cases. Target: ≥97% coverage.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Types & Enums
  AttackObjectiveType, AttackNodeType, AttackEdgeType, DiscoveryStrategy,
  StopConditionType,
  ALL_DISCOVERY_STRATEGIES, ALL_ATTACK_OBJECTIVE_TYPES, ALL_ATTACK_NODE_TYPES, ALL_ATTACK_EDGE_TYPES,
  DEFAULT_RANKING_CONFIG, DEFAULT_CONSTRAINTS, DEFAULT_ATTACK_PATH_ENGINE_CONFIG,
  DEFAULT_SIMULATION_CONFIG,
  DEFAULT_PROJECTION_CONFIG,
  brandAttackPathId, brandAttackStepId, brandAttackChainId, brandAttackEdgeId,
  brandAttackNodeId, brandAttackObjectiveId, brandAttackSimulationId,

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
  attackPathToJSON, attackPathFromJSON,
  attackPathsEqual, attackNodesEqual, attackEdgesEqual, attackSimulationsEqual,
  cloneAttackPath, hashAttackPath,

  // Events
  createPathDiscoveredEvent, createPathRankedEvent,
  createSimulationCompletedEvent, createAttackGraphBuiltEvent,
  AttackPathEventBus,

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
  computeStepProbability, computeCumulativeProbability,
  identifyCriticalSteps, identifyBottlenecks,
  identifyDetectionPoints, determineRequiredCapabilities,
  SimulationEngine,

  // Constraints
  ConstraintsEngine,
  createEmptyConstraintContext, updateConstraintContext,

  // Cache
  AttackPathCache,

  // Statistics
  AttackPathStatisticsCollector,
} from '../index.ts';
import type {
  AttackNode, AttackEdge, AttackStep, AttackObjective, AttackPath,
  AttackPathRanking, AttackSimulation, AttackTechnique,
} from '../index.ts';
import { RiskLevel } from '../../risk/index.ts';
import type { NodeId, EdgeId } from '../../../knowledge-graph/types/index.ts';

// ─── Test Helpers ─────────────────────────────────────────────

function makeNodeId(id: string): NodeId { return id as NodeId; }
function makeEdgeId(id: string): EdgeId { return id as EdgeId; }

/** Create a test attack node */
function createTestNode(overrides: Record<string, any> = {}): AttackNode {
  return createAttackNode({
    graphNodeId: overrides.graphNodeId ?? makeNodeId('node-1'),
    nodeType: overrides.nodeType ?? AttackNodeType.Asset,
    label: overrides.label ?? 'Test Node',
    riskScore: overrides.riskScore ?? 0.5,
    riskLevel: overrides.riskLevel ?? RiskLevel.Medium,
    findingIds: overrides.findingIds ?? [],
    isEntryPoint: overrides.isEntryPoint ?? false,
    isObjective: overrides.isObjective ?? false,
    ...overrides,
  });
}

/** Create a test attack edge */
function createTestEdge(source: AttackNode, target: AttackNode, overrides: Record<string, any> = {}): AttackEdge {
  return createAttackEdge({
    sourceNodeId: source.id,
    targetNodeId: target.id,
    graphEdgeId: overrides.graphEdgeId ?? makeEdgeId('edge-1'),
    edgeType: overrides.edgeType ?? AttackEdgeType.Exploitation,
    probability: overrides.probability ?? 0.7,
    riskContribution: overrides.riskContribution ?? 0.5,
    requiresAuthentication: overrides.requiresAuthentication ?? false,
    requiresPrivilege: overrides.requiresPrivilege ?? false,
    isLateralMovement: overrides.isLateralMovement ?? false,
    isPrivilegeEscalation: overrides.isPrivilegeEscalation ?? false,
    ...overrides,
  });
}

/** Create a test attack objective */
function createTestObjective(): AttackObjective {
  return createAttackObjective({
    type: AttackObjectiveType.Impact,
    name: 'Test Objective',
    targetNodeIds: [],
    entryNodeIds: [],
  });
}

/** Create a simple attack path with N steps */
function createTestPath(stepCount: number = 3, overrides: Record<string, any> = {}): AttackPath {
  const nodes: AttackNode[] = [];
  const edges: AttackEdge[] = [];
  const steps: AttackStep[] = [];

  for (let i = 0; i < stepCount; i++) {
    const node = createTestNode({
      graphNodeId: makeNodeId(`node-${i}`),
      label: `Node ${i}`,
      riskScore: Math.min(0.3 + i * 0.15, 1.0),
      riskLevel: i < 2 ? RiskLevel.Medium : RiskLevel.High,
      isEntryPoint: i === 0,
      isObjective: i === stepCount - 1,
    });
    nodes.push(node);
  }

  for (let i = 0; i < stepCount - 1; i++) {
    const edge = createTestEdge(nodes[i], nodes[i + 1], {
      graphEdgeId: makeEdgeId(`edge-${i}`),
    });
    edges.push(edge);
  }

  for (let i = 0; i < stepCount; i++) {
    const step = createAttackStep({
      node: nodes[i],
      incomingEdge: i > 0 ? edges[i - 1] : null,
      outgoingEdges: i < stepCount - 1 ? [edges[i]] : [],
      stepIndex: i,
      objective: i === stepCount - 1 ? AttackObjectiveType.Impact : null,
      isCritical: nodes[i].riskScore >= 0.7,
      isDetectionPoint: i === 0,
    });
    steps.push(step);
  }

  const objective = createTestObjective();
  const ranking = createAttackPathRanking({
    riskScore: 0.7,
    pathLengthScore: 0.5,
    exploitAvailabilityScore: 0.6,
    privilegeEscalationScore: 0.3,
    lateralMovementScore: 0.4,
    internetExposureScore: 0.5,
    businessImpactScore: 0.8,
    confidenceScore: 0.7,
  });

  return createAttackPath({
    steps,
    edges,
    nodes,
    objective,
    ranking,
    discoveryStrategy: DiscoveryStrategy.MultiPath,
    discoveryDurationMs: 10,
    ...overrides,
  });
}

// ─── Types & Enums ────────────────────────────────────────────

describe('Attack Path Types & Enums', () => {
  it('should have all DiscoveryStrategy values', () => {
    expect(ALL_DISCOVERY_STRATEGIES).toHaveLength(5);
    expect(ALL_DISCOVERY_STRATEGIES).toContain(DiscoveryStrategy.BFS);
    expect(ALL_DISCOVERY_STRATEGIES).toContain(DiscoveryStrategy.DFS);
    expect(ALL_DISCOVERY_STRATEGIES).toContain(DiscoveryStrategy.ShortestPath);
    expect(ALL_DISCOVERY_STRATEGIES).toContain(DiscoveryStrategy.MultiPath);
    expect(ALL_DISCOVERY_STRATEGIES).toContain(DiscoveryStrategy.Reachability);
  });

  it('should have all AttackObjectiveType values', () => {
    expect(ALL_ATTACK_OBJECTIVE_TYPES).toHaveLength(9);
    expect(ALL_ATTACK_OBJECTIVE_TYPES).toContain(AttackObjectiveType.InitialAccess);
    expect(ALL_ATTACK_OBJECTIVE_TYPES).toContain(AttackObjectiveType.CredentialAccess);
    expect(ALL_ATTACK_OBJECTIVE_TYPES).toContain(AttackObjectiveType.Discovery);
    expect(ALL_ATTACK_OBJECTIVE_TYPES).toContain(AttackObjectiveType.LateralMovement);
    expect(ALL_ATTACK_OBJECTIVE_TYPES).toContain(AttackObjectiveType.PrivilegeEscalation);
    expect(ALL_ATTACK_OBJECTIVE_TYPES).toContain(AttackObjectiveType.Persistence);
    expect(ALL_ATTACK_OBJECTIVE_TYPES).toContain(AttackObjectiveType.Collection);
    expect(ALL_ATTACK_OBJECTIVE_TYPES).toContain(AttackObjectiveType.Exfiltration);
    expect(ALL_ATTACK_OBJECTIVE_TYPES).toContain(AttackObjectiveType.Impact);
  });

  it('should have all AttackNodeType values', () => {
    expect(ALL_ATTACK_NODE_TYPES).toHaveLength(10);
  });

  it('should have all AttackEdgeType values', () => {
    expect(ALL_ATTACK_EDGE_TYPES).toHaveLength(10);
  });

  it('should brand IDs correctly', () => {
    expect(typeof brandAttackPathId('test')).toBe('string');
    expect(typeof brandAttackStepId('test')).toBe('string');
    expect(typeof brandAttackChainId('test')).toBe('string');
    expect(typeof brandAttackEdgeId('test')).toBe('string');
    expect(typeof brandAttackNodeId('test')).toBe('string');
    expect(typeof brandAttackObjectiveId('test')).toBe('string');
    expect(typeof brandAttackSimulationId('test')).toBe('string');
  });

  it('should have valid default configs', () => {
    expect(DEFAULT_RANKING_CONFIG.riskWeight + DEFAULT_RANKING_CONFIG.lengthWeight +
           DEFAULT_RANKING_CONFIG.exploitAvailabilityWeight + DEFAULT_RANKING_CONFIG.privilegeEscalationWeight +
           DEFAULT_RANKING_CONFIG.lateralMovementWeight + DEFAULT_RANKING_CONFIG.internetExposureWeight +
           DEFAULT_RANKING_CONFIG.businessImpactWeight + DEFAULT_RANKING_CONFIG.confidenceWeight
    ).toBeCloseTo(1.0, 1);

    expect(DEFAULT_CONSTRAINTS.maximumDepth).toBe(15);
    expect(DEFAULT_CONSTRAINTS.maximumPaths).toBe(50);
    expect(DEFAULT_ATTACK_PATH_ENGINE_CONFIG.engineId).toBe('default');
    expect(DEFAULT_ATTACK_PATH_ENGINE_CONFIG.simulationStepBase).toBe(0.85);
  });
});

// ─── Domain Models ────────────────────────────────────────────

describe('Attack Path Domain Models', () => {
  describe('createAttackNode', () => {
    it('should create an immutable AttackNode', () => {
      const node = createTestNode();
      expect(node.id).toBeDefined();
      expect(node.graphNodeId).toBe('node-1');
      expect(node.nodeType).toBe(AttackNodeType.Asset);
      expect(node.label).toBe('Test Node');
      expect(node.riskScore).toBe(0.5);
      expect(node.riskLevel).toBe(RiskLevel.Medium);
      expect(node.isEntryPoint).toBe(false);
      expect(node.isObjective).toBe(false);
      expect(Object.isFrozen(node)).toBe(true);
    });

    it('should clamp riskScore to [0, 1]', () => {
      const nodeLow = createTestNode({ riskScore: -0.5 });
      expect(nodeLow.riskScore).toBe(0);

      const nodeHigh = createTestNode({ riskScore: 1.5 });
      expect(nodeHigh.riskScore).toBe(1);
    });

    it('should throw on missing required fields', () => {
      expect(() => createAttackNode({ graphNodeId: '', nodeType: AttackNodeType.Asset, label: '', riskScore: 0.5, riskLevel: RiskLevel.Medium }))
        .toThrow();
    });

    it('should support entry point and objective flags', () => {
      const ep = createTestNode({ isEntryPoint: true });
      expect(ep.isEntryPoint).toBe(true);

      const obj = createTestNode({ isObjective: true });
      expect(obj.isObjective).toBe(true);
    });

    it('should support all AttackNodeType values', () => {
      for (const nt of ALL_ATTACK_NODE_TYPES) {
        const node = createTestNode({ nodeType: nt });
        expect(node.nodeType).toBe(nt);
      }
    });
  });

  describe('createAttackEdge', () => {
    it('should create an immutable AttackEdge', () => {
      const source = createTestNode();
      const target = createTestNode({ graphNodeId: makeNodeId('node-2') });
      const edge = createTestEdge(source, target);

      expect(edge.id).toBeDefined();
      expect(edge.sourceNodeId).toBe(source.id);
      expect(edge.targetNodeId).toBe(target.id);
      expect(edge.edgeType).toBe(AttackEdgeType.Exploitation);
      expect(edge.probability).toBe(0.7);
      expect(Object.isFrozen(edge)).toBe(true);
    });

    it('should default probability and riskContribution', () => {
      const source = createTestNode();
      const target = createTestNode({ graphNodeId: makeNodeId('node-2') });
      const edge = createAttackEdge({
        sourceNodeId: source.id,
        targetNodeId: target.id,
        graphEdgeId: makeEdgeId('e1'),
        edgeType: AttackEdgeType.CredentialUse,
      });

      expect(edge.probability).toBe(0.5);
      expect(edge.riskContribution).toBe(0.5);
    });

    it('should support all AttackEdgeType values', () => {
      const source = createTestNode();
      const target = createTestNode({ graphNodeId: makeNodeId('node-2') });
      for (const et of ALL_ATTACK_EDGE_TYPES) {
        const edge = createTestEdge(source, target, { edgeType: et });
        expect(edge.edgeType).toBe(et);
      }
    });

    it('should track lateral movement and privilege escalation', () => {
      const source = createTestNode();
      const target = createTestNode({ graphNodeId: makeNodeId('node-2') });
      const latEdge = createTestEdge(source, target, { isLateralMovement: true });
      expect(latEdge.isLateralMovement).toBe(true);

      const privEdge = createTestEdge(source, target, { isPrivilegeEscalation: true });
      expect(privEdge.isPrivilegeEscalation).toBe(true);
    });
  });

  describe('createAttackStep', () => {
    it('should create an immutable AttackStep', () => {
      const node = createTestNode();
      const step = createAttackStep({ node, stepIndex: 0 });

      expect(step.id).toBeDefined();
      expect(step.node).toBe(node);
      expect(step.incomingEdge).toBeNull();
      expect(step.stepIndex).toBe(0);
      expect(Object.isFrozen(step)).toBe(true);
    });

    it('should throw on negative stepIndex', () => {
      const node = createTestNode();
      expect(() => createAttackStep({ node, stepIndex: -1 })).toThrow();
    });
  });

  describe('createAttackChain', () => {
    it('should create an immutable AttackChain', () => {
      const node1 = createTestNode();
      const node2 = createTestNode({ graphNodeId: makeNodeId('node-2') });
      const edge = createTestEdge(node1, node2);
      const step1 = createAttackStep({ node: node1, outgoingEdges: [edge], stepIndex: 0 });
      const step2 = createAttackStep({ node: node2, incomingEdge: edge, stepIndex: 1 });
      const chain = createAttackChain({ steps: [step1, step2], objective: AttackObjectiveType.LateralMovement });

      expect(chain.id).toBeDefined();
      expect(chain.length).toBe(2);
      expect(chain.entryPoint).toBe(node1);
      expect(chain.endPoint).toBe(node2);
      expect(chain.objective).toBe(AttackObjectiveType.LateralMovement);
      expect(Object.isFrozen(chain)).toBe(true);
    });

    it('should throw on empty steps', () => {
      expect(() => createAttackChain({ steps: [], objective: AttackObjectiveType.Impact })).toThrow();
    });

    it('should compute totalRisk and totalProbability', () => {
      const node1 = createTestNode({ riskScore: 0.8 });
      const node2 = createTestNode({ graphNodeId: makeNodeId('node-2'), riskScore: 0.9 });
      const edge = createTestEdge(node1, node2, { probability: 0.6 });
      const step1 = createAttackStep({ node: node1, outgoingEdges: [edge], stepIndex: 0 });
      const step2 = createAttackStep({ node: node2, incomingEdge: edge, stepIndex: 1 });
      const chain = createAttackChain({ steps: [step1, step2], objective: AttackObjectiveType.Impact });

      expect(chain.totalRisk).toBeGreaterThan(0);
      expect(chain.totalProbability).toBeLessThanOrEqual(1);
    });
  });

  describe('createAttackObjective', () => {
    it('should create an immutable AttackObjective', () => {
      const obj = createTestObjective();
      expect(obj.id).toBeDefined();
      expect(obj.type).toBe(AttackObjectiveType.Impact);
      expect(obj.priority).toBe(0.5);
      expect(Object.isFrozen(obj)).toBe(true);
    });
  });

  describe('createAttackPath', () => {
    it('should create an immutable AttackPath', () => {
      const path = createTestPath();
      expect(path.id).toBeDefined();
      expect(path.length).toBe(3);
      expect(path.steps.length).toBe(3);
      expect(path.entryPoint).toBe(path.steps[0].node);
      expect(path.endPoint).toBe(path.steps[2].node);
      expect(path.totalRisk).toBeGreaterThan(0);
      expect(path.totalProbability).toBeGreaterThan(0);
      expect(Object.isFrozen(path)).toBe(true);
    });

    it('should throw on empty steps', () => {
      const objective = createTestObjective();
      const ranking = createAttackPathRanking({ riskScore: 0.5, pathLengthScore: 0.5, exploitAvailabilityScore: 0.5, privilegeEscalationScore: 0.5, lateralMovementScore: 0.5, internetExposureScore: 0.5, businessImpactScore: 0.5, confidenceScore: 0.5 });
      expect(() => createAttackPath({
        steps: [], edges: [], nodes: [], objective, ranking,
        discoveryStrategy: DiscoveryStrategy.BFS, discoveryDurationMs: 0,
      })).toThrow();
    });

    it('should serialize and deserialize via JSON', () => {
      const path = createTestPath();
      const json = attackPathToJSON(path);
      const restored = attackPathFromJSON(json);
      expect(restored.id).toBe(path.id);
      expect(restored.length).toBe(path.length);
      expect(restored.steps.length).toBe(path.steps.length);
    });
  });

  describe('createAttackPathRanking', () => {
    it('should compute overall score deterministically', () => {
      const ranking = createAttackPathRanking({
        riskScore: 0.8,
        pathLengthScore: 0.6,
        exploitAvailabilityScore: 0.7,
        privilegeEscalationScore: 0.3,
        lateralMovementScore: 0.5,
        internetExposureScore: 0.4,
        businessImpactScore: 0.9,
        confidenceScore: 0.6,
      });

      expect(ranking.overallScore).toBeGreaterThan(0);
      expect(ranking.overallScore).toBeLessThanOrEqual(1);
      expect(ranking.riskScore).toBe(0.8);
      expect(ranking.confidenceScore).toBe(0.6);
    });

    it('should produce identical results for identical inputs', () => {
      const input = {
        riskScore: 0.7,
        pathLengthScore: 0.5,
        exploitAvailabilityScore: 0.6,
        privilegeEscalationScore: 0.4,
        lateralMovementScore: 0.3,
        internetExposureScore: 0.5,
        businessImpactScore: 0.8,
        confidenceScore: 0.7,
      };

      const r1 = createAttackPathRanking(input);
      const r2 = createAttackPathRanking(input);
      expect(r1.overallScore).toBe(r2.overallScore);
    });
  });

  describe('computeOverallRankingScore', () => {
    it('should return 0 when all scores are 0', () => {
      const score = computeOverallRankingScore(
        { riskScore: 0, pathLengthScore: 0, exploitAvailabilityScore: 0, privilegeEscalationScore: 0, lateralMovementScore: 0, internetExposureScore: 0, businessImpactScore: 0, confidenceScore: 0 },
        DEFAULT_RANKING_CONFIG,
      );
      expect(score).toBe(0);
    });

    it('should weight factors correctly', () => {
      const score = computeOverallRankingScore(
        { riskScore: 1, pathLengthScore: 0, exploitAvailabilityScore: 0, privilegeEscalationScore: 0, lateralMovementScore: 0, internetExposureScore: 0, businessImpactScore: 0, confidenceScore: 0 },
        DEFAULT_RANKING_CONFIG,
      );
      expect(score).toBeCloseTo(DEFAULT_RANKING_CONFIG.riskWeight, 5);
    });
  });

  describe('createAttackPathSummary', () => {
    it('should handle empty paths', () => {
      const summary = createAttackPathSummary([]);
      expect(summary.totalPaths).toBe(0);
      expect(summary.averageRisk).toBe(0);
    });

    it('should compute summary from paths', () => {
      const paths = [createTestPath(3), createTestPath(5)];
      const summary = createAttackPathSummary(paths);
      expect(summary.totalPaths).toBe(2);
      expect(summary.averageLength).toBe(4);
      expect(summary.maxRisk).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateAttackPath', () => {
    it('should validate a correct path', () => {
      const path = createTestPath();
      const result = validateAttackPath(path);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Equality / Clone / Hash', () => {
    it('should compare paths by ID', () => {
      const p1 = createTestPath();
      const p2 = createTestPath();
      expect(attackPathsEqual(p1, p1)).toBe(true);
      expect(attackPathsEqual(p1, p2)).toBe(false);
    });

    it('should clone a path via JSON round-trip', () => {
      const path = createTestPath();
      const cloned = cloneAttackPath(path);
      expect(cloned.id).toBe(path.id);
      expect(cloned.length).toBe(path.length);
    });

    it('should compute a hash', () => {
      const path = createTestPath();
      const hash = hashAttackPath(path);
      expect(typeof hash).toBe('number');
      expect(hash).not.toBeNaN();
    });
  });
});

// ─── Events ───────────────────────────────────────────────────

describe('Attack Path Events', () => {
  let eventBus: AttackPathEventBus;

  beforeEach(() => {
    eventBus = new AttackPathEventBus();
  });

  it('should create and emit PathDiscoveredEvent', () => {
    const received: any[] = [];
    eventBus.subscribe(e => received.push(e));

    const event = createPathDiscoveredEvent('eng-1', brandAttackPathId('p1'), DiscoveryStrategy.BFS, AttackObjectiveType.Impact, 5, 0.8, 100);
    eventBus.emit(event);

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('PathDiscovered');
    expect(received[0].strategy).toBe(DiscoveryStrategy.BFS);
  });

  it('should create and emit PathRankedEvent', () => {
    const received: any[] = [];
    eventBus.subscribe(e => received.push(e));

    const event = createPathRankedEvent('eng-1', brandAttackPathId('p1'), 0.85, 1, 50);
    eventBus.emit(event);

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('PathRanked');
    expect(received[0].overallScore).toBe(0.85);
  });

  it('should create and emit SimulationCompletedEvent', () => {
    const event = createSimulationCompletedEvent('eng-1', brandAttackSimulationId('s1'), brandAttackPathId('p1'), 0.6, 3, 2, 200);
    expect(event.type).toBe('SimulationCompleted');
    expect(event.successProbability).toBe(0.6);
  });

  it('should create and emit AttackGraphBuiltEvent', () => {
    const event = createAttackGraphBuiltEvent('eng-1', 10, 15, 5, 300);
    expect(event.type).toBe('AttackGraphBuilt');
    expect(event.nodeCount).toBe(10);
  });

  it('should support subscribe/unsubscribe', () => {
    const received: any[] = [];
    const handler = (e: any) => received.push(e);

    eventBus.subscribe(handler);
    eventBus.emit(createAttackGraphBuiltEvent('eng', 1, 1, 1, 1));
    expect(received).toHaveLength(1);

    eventBus.unsubscribe(handler);
    eventBus.emit(createAttackGraphBuiltEvent('eng', 1, 1, 1, 1));
    expect(received).toHaveLength(1);
  });

  it('should handle errors in handlers gracefully', () => {
    eventBus.subscribe(() => { throw new Error('test'); });
    eventBus.subscribe((e: any) => expect(e).toBeDefined());
    expect(() => eventBus.emit(createAttackGraphBuiltEvent('eng', 1, 1, 1, 1))).not.toThrow();
  });

  it('should clear handlers', () => {
    const received: any[] = [];
    eventBus.subscribe(e => received.push(e));
    eventBus.clear();
    eventBus.emit(createAttackGraphBuiltEvent('eng', 1, 1, 1, 1));
    expect(received).toHaveLength(0);
  });
});

// ─── Ranking ──────────────────────────────────────────────────

describe('Path Ranking', () => {
  describe('computeRiskScore', () => {
    it('should return 0 for empty steps', () => {
      expect(computeRiskScore([])).toBe(0);
    });

    it('should compute weighted risk from steps', () => {
      const path = createTestPath(3);
      const score = computeRiskScore(path.steps);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should be deterministic', () => {
      const path = createTestPath(4);
      const s1 = computeRiskScore(path.steps);
      const s2 = computeRiskScore(path.steps);
      expect(s1).toBe(s2);
    });
  });

  describe('computePathLengthScore', () => {
    it('should score short paths higher', () => {
      const shortPath = createTestPath(2);
      const longPath = createTestPath(10);
      expect(computePathLengthScore(shortPath.steps)).toBeGreaterThan(computePathLengthScore(longPath.steps));
    });

    it('should return 0 for empty steps', () => {
      expect(computePathLengthScore([])).toBe(0);
    });
  });

  describe('computeExploitAvailabilityScore', () => {
    it('should return low default when no techniques', () => {
      const path = createTestPath(2);
      const score = computeExploitAvailabilityScore(path.steps);
      expect(score).toBe(0.1);
    });
  });

  describe('computePrivilegeEscalationScore', () => {
    it('should detect privilege escalation edges', () => {
      const node1 = createTestNode();
      const node2 = createTestNode({ graphNodeId: makeNodeId('node-2') });
      const edge = createTestEdge(node1, node2, { isPrivilegeEscalation: true });
      const step1 = createAttackStep({ node: node1, outgoingEdges: [edge], stepIndex: 0 });
      const step2 = createAttackStep({ node: node2, incomingEdge: edge, stepIndex: 1 });

      const score = computePrivilegeEscalationScore([step1, step2]);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('computeLateralMovementScore', () => {
    it('should detect lateral movement edges', () => {
      const node1 = createTestNode();
      const node2 = createTestNode({ graphNodeId: makeNodeId('node-2') });
      const edge = createTestEdge(node1, node2, { isLateralMovement: true });
      const step1 = createAttackStep({ node: node1, outgoingEdges: [edge], stepIndex: 0 });
      const step2 = createAttackStep({ node: node2, incomingEdge: edge, stepIndex: 1 });

      const score = computeLateralMovementScore([step1, step2]);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('computeInternetExposureScore', () => {
    it('should score internet-facing entry points high', () => {
      const node = createTestNode({ isEntryPoint: true });
      const step = createAttackStep({ node, stepIndex: 0 });
      const score = computeInternetExposureScore([step]);
      expect(score).toBe(1.0);
    });
  });

  describe('computeBusinessImpactScore', () => {
    it('should compute impact from objective node', () => {
      const path = createTestPath(3);
      const score = computeBusinessImpactScore(path.steps);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('computeConfidenceScore', () => {
    it('should compute confidence from edge probabilities', () => {
      const path = createTestPath(3);
      const score = computeConfidenceScore(path.steps);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('PathRankingEngine', () => {
    it('should rank a single path', () => {
      const engine = new PathRankingEngine();
      const path = createTestPath();
      const ranked = engine.rankPath(path, 1);
      expect(ranked.ranking.rank).toBe(1);
      expect(ranked.ranking.overallScore).toBeGreaterThan(0);
    });

    it('should rank multiple paths and sort by score', () => {
      const engine = new PathRankingEngine();
      const lowPath = createTestPath(2);
      const highPath = createTestPath(5, {});

      const result = engine.rankPaths([lowPath, highPath]);
      expect(result.rankedPaths).toHaveLength(2);
      expect(result.rankedPaths[0].ranking.rank).toBe(1);
      expect(result.rankedPaths[1].ranking.rank).toBe(2);
      expect(result.rankedPaths[0].ranking.overallScore).toBeGreaterThanOrEqual(result.rankedPaths[1].ranking.overallScore);
    });

    it('should be deterministic', () => {
      const engine = new PathRankingEngine();
      const path = createTestPath();
      const r1 = engine.rankPath(path);
      const r2 = engine.rankPath(path);
      expect(r1.ranking.overallScore).toBe(r2.ranking.overallScore);
    });
  });
});

// ─── Techniques ───────────────────────────────────────────────

describe('Attack Technique Registry', () => {
  it('should register and retrieve techniques', () => {
    const registry = new AttackTechniqueRegistry();
    const technique: AttackTechnique = {
      id: 'T9999', name: 'Test Technique', tactic: AttackObjectiveType.InitialAccess,
      description: 'Test', subTechniques: [], frequency: 0.5, difficulty: 0.5,
      detectionDifficulty: 0.5, references: [], metadata: {},
    };
    registry.register(technique);

    expect(registry.has('T9999')).toBe(true);
    expect(registry.getById('T9999')?.name).toBe('Test Technique');
  });

  it('should return null for unknown technique', () => {
    const registry = new AttackTechniqueRegistry();
    expect(registry.getById('UNKNOWN')).toBeNull();
  });

  it('should get techniques by tactic', () => {
    const registry = createDefaultTechniqueRegistry();
    const initialAccess = registry.getByTactic(AttackObjectiveType.InitialAccess);
    expect(initialAccess.length).toBeGreaterThan(0);
    expect(initialAccess.every(t => t.tactic === AttackObjectiveType.InitialAccess)).toBe(true);
  });

  it('should register multiple techniques', () => {
    const registry = new AttackTechniqueRegistry();
    const techniques = [
      { id: 'T1', name: 'T1', tactic: AttackObjectiveType.Impact, description: '', subTechniques: [], frequency: 0.5, difficulty: 0.5, detectionDifficulty: 0.5, references: [], metadata: {} },
      { id: 'T2', name: 'T2', tactic: AttackObjectiveType.Impact, description: '', subTechniques: [], frequency: 0.5, difficulty: 0.5, detectionDifficulty: 0.5, references: [], metadata: {} },
    ];
    registry.registerAll(techniques);
    expect(registry.size).toBe(2);
  });

  it('should have 18 default techniques', () => {
    expect(DEFAULT_TECHNIQUES).toHaveLength(18);
  });

  it('should throw on empty technique id', () => {
    const registry = new AttackTechniqueRegistry();
    expect(() => registry.register({ id: '', name: 'X', tactic: AttackObjectiveType.Impact, description: '', subTechniques: [], frequency: 0.5, difficulty: 0.5, detectionDifficulty: 0.5, references: [], metadata: {} }))
      .toThrow();
  });

  it('should clear all techniques', () => {
    const registry = createDefaultTechniqueRegistry();
    expect(registry.size).toBeGreaterThan(0);
    registry.clear();
    expect(registry.size).toBe(0);
  });
});

// ─── Objectives ───────────────────────────────────────────────

describe('Attack Objectives', () => {
  it('should create all 9 objective types', () => {
    const objectives = [
      createInitialAccessObjective(),
      createCredentialAccessObjective(),
      createDiscoveryObjective(),
      createLateralMovementObjective(),
      createPrivilegeEscalationObjective(),
      createPersistenceObjective(),
      createCollectionObjective(),
      createExfiltrationObjective(),
      createImpactObjective(),
    ];
    expect(objectives).toHaveLength(9);
    expect(new Set(objectives.map(o => o.type)).size).toBe(9);
  });

  it('should create objectives by type', () => {
    for (const type of ALL_ATTACK_OBJECTIVE_TYPES) {
      const obj = createObjectiveByType(type);
      expect(obj.type).toBe(type);
    }
  });

  it('should have correct priorities', () => {
    const priorities = getObjectivePriorities();
    expect(Object.keys(priorities)).toHaveLength(9);
    expect(priorities[AttackObjectiveType.Impact]).toBe(0.95);
    expect(priorities[AttackObjectiveType.Discovery]).toBe(0.6);
  });

  it('should accept target and entry node IDs', () => {
    const obj = createImpactObjective([brandAttackNodeId('n1')], [brandAttackNodeId('n2')]);
    expect(obj.targetNodeIds).toHaveLength(1);
    expect(obj.entryNodeIds).toHaveLength(1);
  });
});

// ─── Simulation ───────────────────────────────────────────────

describe('Attack Simulation', () => {
  describe('computeStepProbability', () => {
    it('should compute deterministic step probability', () => {
      const path = createTestPath(3);
      const prob = computeStepProbability(path.steps[1]);
      expect(prob).toBeGreaterThan(0);
      expect(prob).toBeLessThanOrEqual(1);
    });

    it('should reduce probability for authentication requirements', () => {
      const node1 = createTestNode();
      const node2 = createTestNode({ graphNodeId: makeNodeId('node-2') });
      const edgeNoAuth = createTestEdge(node1, node2, { requiresAuthentication: false });
      const edgeAuth = createTestEdge(node1, node2, { requiresAuthentication: true });

      const stepNoAuth = createAttackStep({ node: node2, incomingEdge: edgeNoAuth, stepIndex: 1 });
      const stepAuth = createAttackStep({ node: node2, incomingEdge: edgeAuth, stepIndex: 1 });

      expect(computeStepProbability(stepNoAuth)).toBeGreaterThan(computeStepProbability(stepAuth));
    });

    it('should reduce probability for privilege requirements', () => {
      const node1 = createTestNode();
      const node2 = createTestNode({ graphNodeId: makeNodeId('node-2') });
      const edgeNoPriv = createTestEdge(node1, node2, { requiresPrivilege: false });
      const edgePriv = createTestEdge(node1, node2, { requiresPrivilege: true });

      const stepNoPriv = createAttackStep({ node: node2, incomingEdge: edgeNoPriv, stepIndex: 1 });
      const stepPriv = createAttackStep({ node: node2, incomingEdge: edgePriv, stepIndex: 1 });

      expect(computeStepProbability(stepNoPriv)).toBeGreaterThan(computeStepProbability(stepPriv));
    });

    it('should be deterministic', () => {
      const path = createTestPath(3);
      const p1 = computeStepProbability(path.steps[1]);
      const p2 = computeStepProbability(path.steps[1]);
      expect(p1).toBe(p2);
    });
  });

  describe('computeCumulativeProbability', () => {
    it('should return 1.0 for empty steps', () => {
      expect(computeCumulativeProbability([])).toBe(1.0);
    });

    it('should be the product of step probabilities', () => {
      const path = createTestPath(3);
      const cumProb = computeCumulativeProbability(path.steps);
      expect(cumProb).toBeGreaterThan(0);
      expect(cumProb).toBeLessThanOrEqual(1);
    });
  });

  describe('identifyCriticalSteps', () => {
    it('should identify high-risk steps as critical', () => {
      const node = createTestNode({ riskScore: 0.9 });
      const step = createAttackStep({ node, stepIndex: 0, isCritical: true });
      const critical = identifyCriticalSteps([step]);
      expect(critical).toHaveLength(1);
    });

    it('should identify authentication steps as critical', () => {
      const node1 = createTestNode();
      const node2 = createTestNode({ graphNodeId: makeNodeId('node-2') });
      const edge = createTestEdge(node1, node2, { requiresAuthentication: true });
      const step = createAttackStep({ node: node2, incomingEdge: edge, stepIndex: 1 });
      const critical = identifyCriticalSteps([step]);
      expect(critical).toHaveLength(1);
    });
  });

  describe('identifyBottlenecks', () => {
    it('should find steps with lowest probability', () => {
      const path = createTestPath(5);
      const bottlenecks = identifyBottlenecks(path.steps);
      expect(bottlenecks.length).toBeGreaterThan(0);
    });
  });

  describe('identifyDetectionPoints', () => {
    it('should find detection point steps', () => {
      const path = createTestPath(3);
      const detection = identifyDetectionPoints(path.steps);
      expect(detection.length).toBeGreaterThan(0);
    });
  });

  describe('determineRequiredCapabilities', () => {
    it('should list required capabilities', () => {
      const node1 = createTestNode();
      const node2 = createTestNode({ graphNodeId: makeNodeId('node-2') });
      const edge = createTestEdge(node1, node2, { requiresAuthentication: true, isLateralMovement: true });
      const step1 = createAttackStep({ node: node1, stepIndex: 0 });
      const step2 = createAttackStep({ node: node2, incomingEdge: edge, stepIndex: 1 });

      const caps = determineRequiredCapabilities([step1, step2]);
      expect(caps).toContain('valid_credentials');
      expect(caps).toContain('network_access');
    });
  });

  describe('SimulationEngine', () => {
    it('should produce a complete simulation', () => {
      const engine = new SimulationEngine();
      const path = createTestPath();
      const sim = engine.simulate(path);

      expect(sim.id).toBeDefined();
      expect(sim.pathId).toBe(path.id);
      expect(sim.successProbability).toBeGreaterThan(0);
      expect(sim.successProbability).toBeLessThanOrEqual(1);
      expect(sim.cumulativeProbability).toBeGreaterThan(0);
      expect(sim.criticalSteps).toBeDefined();
      expect(sim.bottlenecks).toBeDefined();
      expect(sim.detectionPoints).toBeDefined();
      expect(sim.stepProbabilities).toHaveLength(path.steps.length);
      expect(sim.estimatedTimeSteps).toBeGreaterThan(0);
      expect(sim.requiredCapabilities).toBeDefined();
      expect(Object.isFrozen(sim)).toBe(true);
    });

    it('should be deterministic', () => {
      const engine = new SimulationEngine();
      const path = createTestPath();
      const s1 = engine.simulate(path);
      const s2 = engine.simulate(path);
      expect(s1.successProbability).toBe(s2.successProbability);
      expect(s1.cumulativeProbability).toBe(s2.cumulativeProbability);
    });
  });
});

// ─── Constraints ──────────────────────────────────────────────

describe('Constraints Engine', () => {
  it('should allow nodes not in forbidden list', () => {
    const engine = new ConstraintsEngine(DEFAULT_CONSTRAINTS);
    const result = engine.isNodeAllowed(makeNodeId('allowed-node'));
    expect(result.allowed).toBe(true);
  });

  it('should block forbidden nodes', () => {
    const constraints = { ...DEFAULT_CONSTRAINTS, forbiddenNodeIds: [makeNodeId('bad-node')] };
    const engine = new ConstraintsEngine(constraints);
    const result = engine.isNodeAllowed(makeNodeId('bad-node'));
    expect(result.allowed).toBe(false);
    expect(result.violatedConstraint).toBe('forbiddenNodeIds');
  });

  it('should block forbidden edges', () => {
    const constraints = { ...DEFAULT_CONSTRAINTS, forbiddenEdgeIds: [makeEdgeId('bad-edge')] };
    const engine = new ConstraintsEngine(constraints);
    const result = engine.isEdgeAllowed(makeEdgeId('bad-edge'));
    expect(result.allowed).toBe(false);
  });

  it('should enforce maximum depth', () => {
    const engine = new ConstraintsEngine({ ...DEFAULT_CONSTRAINTS, maximumDepth: 5 });
    expect(engine.isDepthAllowed(4).allowed).toBe(true);
    expect(engine.isDepthAllowed(6).allowed).toBe(false);
  });

  it('should enforce maximum paths', () => {
    const engine = new ConstraintsEngine({ ...DEFAULT_CONSTRAINTS, maximumPaths: 10 });
    expect(engine.isPathCountAllowed(9).allowed).toBe(true);
    expect(engine.isPathCountAllowed(10).allowed).toBe(false);
  });

  it('should enforce minimum risk score', () => {
    const engine = new ConstraintsEngine({ ...DEFAULT_CONSTRAINTS, minimumRiskScore: 0.3 });
    expect(engine.isRiskScoreSufficient(0.4).allowed).toBe(true);
    expect(engine.isRiskScoreSufficient(0.2).allowed).toBe(false);
  });

  it('should evaluate stop conditions', () => {
    const engine = new ConstraintsEngine({
      ...DEFAULT_CONSTRAINTS,
      stopConditions: [
        { type: StopConditionType.MaxNodesVisited, value: 100, description: 'Max nodes' },
        { type: StopConditionType.ObjectiveReached, value: true, description: 'Objective' },
      ],
    });

    const ctx1 = createEmptyConstraintContext();
    expect(engine.shouldStop(ctx1)).toBe(false);

    const ctx2 = updateConstraintContext(ctx1, { nodesVisited: 100 });
    expect(engine.shouldStop(ctx2)).toBe(true);

    const ctx3 = updateConstraintContext(ctx1, { objectiveReached: true });
    expect(engine.shouldStop(ctx3)).toBe(true);
  });
});

// ─── Cache ────────────────────────────────────────────────────

describe('Attack Path Cache', () => {
  let cache: AttackPathCache;

  beforeEach(() => {
    cache = new AttackPathCache({ capacity: 10, ttlMs: 60000 });
  });

  it('should cache and retrieve paths', () => {
    const path = createTestPath();
    cache.setPath('key1', path);
    const retrieved = cache.getPath('key1');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(path.id);
  });

  it('should cache and retrieve simulations', () => {
    const engine = new SimulationEngine();
    const path = createTestPath();
    const sim = engine.simulate(path);
    cache.setSimulation('sim1', sim);
    const retrieved = cache.getSimulation('sim1');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(sim.id);
  });

  it('should return null for missing keys', () => {
    expect(cache.getPath('missing')).toBeNull();
    expect(cache.getSimulation('missing')).toBeNull();
  });

  it('should evict LRU when at capacity', () => {
    const smallCache = new AttackPathCache({ capacity: 2, ttlMs: 60000 });
    for (let i = 0; i < 3; i++) {
      smallCache.setPath(`key-${i}`, createTestPath());
    }
    expect(smallCache.size).toBe(2);
    expect(smallCache.getPath('key-0')).toBeNull();
  });

  it('should track cache statistics', () => {
    const path = createTestPath();
    cache.setPath('key1', path);
    cache.getPath('key1'); // hit
    cache.getPath('missing'); // miss

    const stats = cache.getStatistics();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(0.5, 1);
  });

  it('should invalidate specific keys', () => {
    cache.setPath('key1', createTestPath());
    cache.setPath('key2', createTestPath());
    expect(cache.invalidate('key1')).toBe(true);
    expect(cache.getPath('key1')).toBeNull();
    expect(cache.getPath('key2')).not.toBeNull();
  });

  it('should invalidate by pattern', () => {
    cache.setPath('path_1', createTestPath());
    cache.setPath('path_2', createTestPath());
    cache.setPath('sim_1', createTestPath());
    const count = cache.invalidatePattern('path_*');
    expect(count).toBe(2);
  });

  it('should invalidate all paths', () => {
    cache.setPath('p1', createTestPath());
    cache.setSimulation('s1', new SimulationEngine().simulate(createTestPath()));
    const count = cache.invalidatePaths();
    expect(count).toBe(1);
    expect(cache.simulationCacheSize).toBe(1);
  });

  it('should invalidate all simulations', () => {
    cache.setPath('p1', createTestPath());
    cache.setSimulation('s1', new SimulationEngine().simulate(createTestPath()));
    const count = cache.invalidateSimulations();
    expect(count).toBe(1);
    expect(cache.pathCacheSize).toBe(1);
  });

  it('should clear all entries', () => {
    cache.setPath('p1', createTestPath());
    cache.setSimulation('s1', new SimulationEngine().simulate(createTestPath()));
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('should expire entries based on TTL', () => {
    const shortCache = new AttackPathCache({ capacity: 10, ttlMs: 1 });
    shortCache.setPath('key1', createTestPath());
    // Wait for expiry
    return new Promise<void>(resolve => {
      setTimeout(() => {
        expect(shortCache.getPath('key1')).toBeNull();
        resolve();
      }, 10);
    });
  });
});

// ─── Statistics ───────────────────────────────────────────────

describe('Attack Path Statistics Collector', () => {
  let collector: AttackPathStatisticsCollector;

  beforeEach(() => {
    collector = new AttackPathStatisticsCollector();
  });

  it('should track discovery operations', () => {
    collector.recordDiscovery(100, DiscoveryStrategy.BFS, AttackObjectiveType.Impact);
    const stats = collector.collect();
    expect(stats.totalDiscoveries).toBe(1);
    expect(stats.averageDiscoveryTimeMs).toBe(100);
    expect(stats.strategyDistribution[DiscoveryStrategy.BFS]).toBe(1);
    expect(stats.objectiveDistribution[AttackObjectiveType.Impact]).toBe(1);
  });

  it('should track ranking operations', () => {
    collector.recordRanking(50);
    const stats = collector.collect();
    expect(stats.totalRankings).toBe(1);
    expect(stats.averageRankingTimeMs).toBe(50);
  });

  it('should track simulation operations', () => {
    collector.recordSimulation(200);
    const stats = collector.collect();
    expect(stats.totalSimulations).toBe(1);
  });

  it('should track projection operations', () => {
    collector.recordProjection(150);
    const stats = collector.collect();
    expect(stats.totalProjections).toBe(1);
  });

  it('should track failures', () => {
    collector.recordFailure();
    const stats = collector.collect();
    expect(stats.totalFailed).toBe(1);
  });

  it('should track batch operations', () => {
    collector.recordBatch();
    const stats = collector.collect();
    expect(stats.totalBatches).toBe(1);
  });

  it('should track cache hits and misses', () => {
    collector.recordCacheHit();
    collector.recordCacheHit();
    collector.recordCacheMiss();
    const stats = collector.collect();
    expect(stats.cacheHits).toBe(2);
    expect(stats.cacheMisses).toBe(1);
    expect(stats.cacheHitRate).toBeCloseTo(0.6667, 2);
  });

  it('should compute throughput', () => {
    collector.recordDiscovery(10, DiscoveryStrategy.BFS, AttackObjectiveType.Impact);
    const stats = collector.collect();
    expect(stats.throughputPerSecond).toBeGreaterThan(0);
  });

  it('should reset all statistics', () => {
    collector.recordDiscovery(100, DiscoveryStrategy.BFS, AttackObjectiveType.Impact);
    collector.recordRanking(50);
    collector.recordFailure();
    collector.reset();
    const stats = collector.collect();
    expect(stats.totalDiscoveries).toBe(0);
    expect(stats.totalRankings).toBe(0);
    expect(stats.totalFailed).toBe(0);
  });
});

// ─── Edge Cases ───────────────────────────────────────────────

describe('Edge Cases', () => {
  it('should handle single-step paths', () => {
    const node = createTestNode();
    const step = createAttackStep({ node, stepIndex: 0 });
    const objective = createTestObjective();
    const ranking = createAttackPathRanking({ riskScore: 0.5, pathLengthScore: 1, exploitAvailabilityScore: 0.5, privilegeEscalationScore: 0, lateralMovementScore: 0, internetExposureScore: 0.5, businessImpactScore: 0.5, confidenceScore: 0.5 });
    const path = createAttackPath({ steps: [step], edges: [], nodes: [node], objective, ranking, discoveryStrategy: DiscoveryStrategy.BFS, discoveryDurationMs: 0 });

    expect(path.length).toBe(1);
    expect(path.entryPoint).toBe(path.endPoint);
  });

  it('should handle nodes with zero risk', () => {
    const node = createTestNode({ riskScore: 0 });
    expect(node.riskScore).toBe(0);
    const sim = new SimulationEngine();
    const step = createAttackStep({ node, stepIndex: 0 });
    const prob = computeStepProbability(step);
    expect(prob).toBeGreaterThan(0);
  });

  it('should handle paths with all high-risk nodes', () => {
    const nodes = Array.from({ length: 3 }, (_, i) =>
      createTestNode({ graphNodeId: makeNodeId(`node-${i}`), riskScore: 0.95, riskLevel: RiskLevel.Critical })
    );
    const edges = nodes.slice(0, -1).map((n, i) => createTestEdge(n, nodes[i + 1], { graphEdgeId: makeEdgeId(`edge-${i}`) }));
    const steps = nodes.map((n, i) => createAttackStep({
      node: n,
      incomingEdge: i > 0 ? edges[i - 1] : null,
      outgoingEdges: i < nodes.length - 1 ? [edges[i]] : [],
      stepIndex: i,
    }));

    const riskScore = computeRiskScore(steps);
    expect(riskScore).toBeGreaterThan(0.8);
  });

  it('should handle empty constraint context', () => {
    const ctx = createEmptyConstraintContext();
    expect(ctx.nodesVisited).toBe(0);
    expect(ctx.edgesTraversed).toBe(0);
    expect(ctx.currentDepth).toBe(0);
    expect(ctx.currentRisk).toBe(0);
    expect(ctx.objectiveReached).toBe(false);
    expect(ctx.cycleDetected).toBe(false);
  });

  it('should handle updating constraint context', () => {
    const ctx = createEmptyConstraintContext();
    const updated = updateConstraintContext(ctx, { nodesVisited: 50, currentRisk: 0.7 });
    expect(updated.nodesVisited).toBe(50);
    expect(updated.currentRisk).toBe(0.7);
    expect(updated.edgesTraversed).toBe(0); // unchanged
  });

  it('should handle cloning a path preserves all data', () => {
    const path = createTestPath(5);
    const cloned = cloneAttackPath(path);
    expect(cloned.length).toBe(path.length);
    expect(cloned.totalRisk).toBe(path.totalRisk);
    expect(cloned.totalProbability).toBe(path.totalProbability);
  });

  it('should handle very long paths', () => {
    const path = createTestPath(50);
    expect(path.length).toBe(50);
    expect(path.steps.length).toBe(50);

    const sim = new SimulationEngine().simulate(path);
    expect(sim.successProbability).toBeGreaterThan(0);
    expect(sim.stepProbabilities.length).toBe(50);
  });

  it('should handle empty path summary', () => {
    const summary = createAttackPathSummary([]);
    expect(summary.totalPaths).toBe(0);
    expect(summary.averageRisk).toBe(0);
    expect(summary.topEntryPoints).toHaveLength(0);
  });

  it('should produce deterministic simulations with same config', () => {
    const path = createTestPath(5);
    const engine1 = new SimulationEngine();
    const engine2 = new SimulationEngine();
    const s1 = engine1.simulate(path);
    const s2 = engine2.simulate(path);
    expect(s1.successProbability).toBe(s2.successProbability);
    expect(s1.cumulativeProbability).toBe(s2.cumulativeProbability);
  });

  it('should handle technique registry with custom techniques', () => {
    const registry = new AttackTechniqueRegistry();
    const customTechnique: AttackTechnique = {
      id: 'CUSTOM-001', name: 'Custom Attack', tactic: AttackObjectiveType.Exfiltration,
      description: 'Custom technique for testing', subTechniques: [],
      frequency: 0.3, difficulty: 0.8, detectionDifficulty: 0.7,
      references: [], metadata: { custom: true },
    };
    registry.register(customTechnique);

    const retrieved = registry.getById('CUSTOM-001');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.name).toBe('Custom Attack');
    expect(retrieved!.metadata.custom).toBe(true);
  });
});

// ─── ID Generation Uniqueness ─────────────────────────────────

describe('ID Generation', () => {
  it('should generate unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateAttackPathId());
      ids.add(generateAttackStepId());
      ids.add(generateAttackChainId());
      ids.add(generateAttackEdgeId());
      ids.add(generateAttackNodeId());
      ids.add(generateAttackObjectiveId());
      ids.add(generateAttackSimulationId());
    }
    // All 700 IDs should be unique
    expect(ids.size).toBe(700);
  });
});

// ─── Immutability ─────────────────────────────────────────────

describe('Immutability', () => {
  it('should freeze AttackNode deeply', () => {
    const node = createTestNode();
    expect(Object.isFrozen(node)).toBe(true);
    expect(() => { (node as any).label = 'modified'; }).toThrow();
  });

  it('should freeze AttackEdge deeply', () => {
    const source = createTestNode();
    const target = createTestNode({ graphNodeId: makeNodeId('node-2') });
    const edge = createTestEdge(source, target);
    expect(Object.isFrozen(edge)).toBe(true);
    expect(() => { (edge as any).probability = 0.99; }).toThrow();
  });

  it('should freeze AttackPath deeply', () => {
    const path = createTestPath();
    expect(Object.isFrozen(path)).toBe(true);
    expect(() => { (path as any).totalRisk = 1.0; }).toThrow();
  });

  it('should freeze AttackSimulation deeply', () => {
    const path = createTestPath();
    const sim = new SimulationEngine().simulate(path);
    expect(Object.isFrozen(sim)).toBe(true);
    expect(() => { (sim as any).successProbability = 1.0; }).toThrow();
  });

  it('should freeze AttackPathRanking deeply', () => {
    const ranking = createAttackPathRanking({
      riskScore: 0.5, pathLengthScore: 0.5, exploitAvailabilityScore: 0.5,
      privilegeEscalationScore: 0.5, lateralMovementScore: 0.5,
      internetExposureScore: 0.5, businessImpactScore: 0.5, confidenceScore: 0.5,
    });
    expect(Object.isFrozen(ranking)).toBe(true);
    expect(() => { (ranking as any).overallScore = 0.99; }).toThrow();
  });
});
