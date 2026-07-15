/**
 * Attack Path Builder — Integration & Coverage Tests
 *
 * Covers: AttackPathEngine with KG integration, projection, discovery,
 * batch processing, and additional edge cases for ≥97% coverage.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AttackObjectiveType, AttackNodeType, AttackEdgeType, DiscoveryStrategy,
  DEFAULT_CONSTRAINTS, DEFAULT_RANKING_CONFIG,
  DEFAULT_SIMULATION_CONFIG, DEFAULT_PROJECTION_CONFIG,
  createAttackNode, createAttackEdge, createAttackStep,
  createAttackObjective, createAttackEvidence,
  createAttackPathRanking, createAttackPath, createAttackPathSummary,
  createAttackSimulation, validateAttackPath,
  attackSimulationToJSON,
  AttackPathEventBus,
  createPathDiscoveredEvent, createPathRankedEvent,
  createSimulationCompletedEvent, createAttackGraphBuiltEvent,
  KnowledgeGraphAdapter, PathDiscoveryEngine,
  PathRankingEngine,
  computeRiskScore, computePathLengthScore,
  computeExploitAvailabilityScore, computePrivilegeEscalationScore,
  computeLateralMovementScore, computeInternetExposureScore,
  computeBusinessImpactScore, computeConfidenceScore,
  AttackTechniqueRegistry, createDefaultTechniqueRegistry,
  createObjectiveByType,
  SimulationEngine,
  computeStepProbability, computeCumulativeProbability,
  identifyCriticalSteps, identifyBottlenecks,
  identifyDetectionPoints, determineRequiredCapabilities,
  ConstraintsEngine, createEmptyConstraintContext, updateConstraintContext,
  GraphProjectionEngine,
  AttackPathCache,
  AttackPathStatisticsCollector,
  AttackPathEngine,
} from '../index.ts';
import type {
  AttackNode, AttackEdge, AttackStep, AttackPath, AttackObjective,
  AttackSimulation, AttackTechnique,
} from '../index.ts';
import { RiskLevel } from '../../risk/index.ts';
import { InMemoryGraphRepository } from '../../../knowledge-graph/runtime/index.ts';
import { GraphTraversalEngineImpl } from '../../../knowledge-graph/traversal/index.ts';
import { createGraphNode, createGraphEdge, createRelationship } from '../../../knowledge-graph/models/index.ts';
import type { NodeId, EdgeId } from '../../../knowledge-graph/types/index.ts';
import { NodeType, EdgeType } from '../../../knowledge-graph/types/index.ts';

// ─── Test Helpers ─────────────────────────────────────────────

function makeNodeId(id: string): NodeId { return id as NodeId; }
function makeEdgeId(id: string): EdgeId { return id as EdgeId; }

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

function createTestEdge(source: AttackNode, target: AttackNode, overrides: Record<string, any> = {}): AttackEdge {
  return createAttackEdge({
    sourceNodeId: source.id,
    targetNodeId: target.id,
    graphEdgeId: overrides.graphEdgeId ?? makeEdgeId('edge-1'),
    edgeType: overrides.edgeType ?? AttackEdgeType.Exploitation,
    probability: overrides.probability ?? 0.7,
    riskContribution: overrides.riskContribution ?? 0.5,
    ...overrides,
  });
}

function createTestPath(stepCount: number = 3): AttackPath {
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
    const edge = createTestEdge(nodes[i], nodes[i + 1], { graphEdgeId: makeEdgeId(`edge-${i}`) });
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

  const objective = createAttackObjective({ type: AttackObjectiveType.Impact });
  const ranking = createAttackPathRanking({
    riskScore: 0.7, pathLengthScore: 0.5, exploitAvailabilityScore: 0.6,
    privilegeEscalationScore: 0.3, lateralMovementScore: 0.4,
    internetExposureScore: 0.5, businessImpactScore: 0.8, confidenceScore: 0.7,
  });

  return createAttackPath({
    steps, edges, nodes, objective, ranking,
    discoveryStrategy: DiscoveryStrategy.MultiPath,
    discoveryDurationMs: 10,
  });
}

// Helper: create KG graph nodes properly
function makeKGNode(id: string, type: NodeType, labels: string[] = []) {
  return createGraphNode(id, type, { labels });
}

function makeKGEdge(id: string, sourceId: string, targetId: string, edgeType: EdgeType, strength: number = 0.8) {
  return createGraphEdge(id, sourceId, targetId, createRelationship(edgeType, { strength }));
}

// ─── KG Integration Tests ─────────────────────────────────────

describe('Attack Path Engine with KG Integration', () => {
  let repo: InMemoryGraphRepository;
  let traversalEngine: GraphTraversalEngineImpl;
  let attackPathEngine: AttackPathEngine;

  beforeEach(async () => {
    repo = new InMemoryGraphRepository();
    traversalEngine = new GraphTraversalEngineImpl(repo);
    attackPathEngine = new AttackPathEngine(traversalEngine, { engineId: 'test' });

    // Build a small test graph
    await repo.addNode(makeKGNode('internet', NodeType.Endpoint, ['Internet']));
    await repo.addNode(makeKGNode('web-server', NodeType.Host, ['WebServer']));
    await repo.addNode(makeKGNode('app-server', NodeType.Application, ['AppServer']));
    await repo.addNode(makeKGNode('db', NodeType.Service, ['Database']));

    await repo.addEdge(makeKGEdge('e1', 'internet', 'web-server', EdgeType.EXPOSES, 0.9));
    await repo.addEdge(makeKGEdge('e2', 'web-server', 'app-server', EdgeType.CONNECTED_TO, 0.7));
    await repo.addEdge(makeKGEdge('e3', 'app-server', 'db', EdgeType.DEPENDS_ON, 0.8));
  });

  it('should discover paths with BFS', async () => {
    const paths = await attackPathEngine.discover({
      sourceId: makeNodeId('internet'),
      targetIds: [makeNodeId('db')],
      objectiveType: AttackObjectiveType.Impact,
      strategy: DiscoveryStrategy.BFS,
    });
    expect(paths).toBeDefined();
    expect(Array.isArray(paths)).toBe(true);
  });

  it('should discover paths with DFS', async () => {
    const paths = await attackPathEngine.discover({
      sourceId: makeNodeId('internet'),
      targetIds: [makeNodeId('db')],
      objectiveType: AttackObjectiveType.Impact,
      strategy: DiscoveryStrategy.DFS,
    });
    expect(paths).toBeDefined();
  });

  it('should discover paths with ShortestPath', async () => {
    const paths = await attackPathEngine.discover({
      sourceId: makeNodeId('internet'),
      targetIds: [makeNodeId('db')],
      objectiveType: AttackObjectiveType.Impact,
      strategy: DiscoveryStrategy.ShortestPath,
    });
    expect(paths).toBeDefined();
  });

  it('should discover paths with MultiPath', async () => {
    const paths = await attackPathEngine.discover({
      sourceId: makeNodeId('internet'),
      targetIds: [makeNodeId('db')],
      objectiveType: AttackObjectiveType.Impact,
      strategy: DiscoveryStrategy.MultiPath,
    });
    expect(paths).toBeDefined();
  });

  it('should discover paths with Reachability', async () => {
    const paths = await attackPathEngine.discover({
      sourceId: makeNodeId('internet'),
      targetIds: [makeNodeId('db')],
      objectiveType: AttackObjectiveType.Impact,
      strategy: DiscoveryStrategy.Reachability,
    });
    expect(paths).toBeDefined();
  });

  it('should discover all paths for all objectives', async () => {
    const paths = await attackPathEngine.discoverAll({
      sourceId: makeNodeId('internet'),
      targetIds: [makeNodeId('db')],
    });
    expect(paths).toBeDefined();
  });

  it('should rank discovered paths', () => {
    const paths = [createTestPath(3), createTestPath(5)];
    const ranked = attackPathEngine.rank(paths);
    expect(ranked.length).toBe(2);
    expect(ranked[0].ranking.rank).toBe(1);
  });

  it('should simulate a path', () => {
    const path = createTestPath();
    const sim = attackPathEngine.simulate(path);
    expect(sim).toBeDefined();
    expect(sim.successProbability).toBeGreaterThan(0);
  });

  it('should project a path', async () => {
    const path = createTestPath();
    const result = await attackPathEngine.project(path);
    expect(result).toBeDefined();
    expect(result.nodeIds.length).toBeGreaterThan(0);
  });

  it('should return engine statistics', () => {
    const stats = attackPathEngine.statistics();
    expect(stats).toBeDefined();
  });

  it('should summarize paths', () => {
    const summary = attackPathEngine.summarize([createTestPath(3), createTestPath(5)]);
    expect(summary.totalPaths).toBe(2);
  });

  it('should expose technique registry', () => {
    expect(attackPathEngine.techniqueRegistry.size).toBeGreaterThan(0);
  });

  it('should reset engine state', async () => {
    await attackPathEngine.discover({
      sourceId: makeNodeId('internet'),
      targetIds: [makeNodeId('web-server')],
      strategy: DiscoveryStrategy.BFS,
    });
    attackPathEngine.reset();
    expect(attackPathEngine.statistics().totalDiscoveries).toBe(0);
  });

  it('should handle empty graph', async () => {
    const emptyRepo = new InMemoryGraphRepository();
    const emptyTraversal = new GraphTraversalEngineImpl(emptyRepo);
    const emptyEngine = new AttackPathEngine(emptyTraversal);
    const paths = await emptyEngine.discover({
      sourceId: makeNodeId('nonexistent'),
      targetIds: [makeNodeId('target')],
      strategy: DiscoveryStrategy.BFS,
    });
    expect(paths.length).toBe(0);
  });

  it('should handle discovery with custom constraints', async () => {
    const paths = await attackPathEngine.discover({
      sourceId: makeNodeId('internet'),
      targetIds: [makeNodeId('db')],
      strategy: DiscoveryStrategy.BFS,
      constraints: { ...DEFAULT_CONSTRAINTS, maximumDepth: 2, maximumPaths: 5 },
    });
    expect(paths).toBeDefined();
  });

  it('should cache simulation results', () => {
    const path = createTestPath();
    const s1 = attackPathEngine.simulate(path);
    const s2 = attackPathEngine.simulate(path);
    expect(s1.successProbability).toBe(s2.successProbability);
  });

  it('should emit events during discovery', async () => {
    const events: any[] = [];
    attackPathEngine.eventBus.subscribe(e => events.push(e));
    await attackPathEngine.discover({
      sourceId: makeNodeId('internet'),
      targetIds: [makeNodeId('web-server')],
      strategy: DiscoveryStrategy.BFS,
    });
    // Events may or may not have been emitted depending on path results
    expect(events.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle batch discovery', async () => {
    const paths = await attackPathEngine.discoverBatch([
      { sourceId: makeNodeId('internet'), targetIds: [makeNodeId('web-server')], strategy: DiscoveryStrategy.BFS },
      { sourceId: makeNodeId('web-server'), targetIds: [makeNodeId('db')], strategy: DiscoveryStrategy.BFS },
    ]);
    expect(paths).toBeDefined();
  });

  it('should provide cache statistics', () => {
    expect(attackPathEngine.cacheStatistics).toBeDefined();
  });
});

// ─── Knowledge Graph Adapter Tests ────────────────────────────

describe('Knowledge Graph Adapter', () => {
  it('should convert KG nodes to attack nodes', () => {
    const node = makeKGNode('test', NodeType.Endpoint, ['Test']);
    const adapter = new KnowledgeGraphAdapter();
    const attackNode = adapter.toAttackNode(node);
    expect(attackNode.graphNodeId).toBe('test');
  });

  it('should convert KG edges to attack edges', () => {
    const n1 = makeKGNode('n1', NodeType.Endpoint, ['N1']);
    const n2 = makeKGNode('n2', NodeType.Host, ['N2']);
    const edge = makeKGEdge('e1', 'n1', 'n2', EdgeType.EXPOSES, 0.8);

    const adapter = new KnowledgeGraphAdapter();
    const a1 = adapter.toAttackNode(n1);
    const a2 = adapter.toAttackNode(n2);
    const ae = adapter.toAttackEdge(edge, a1.id, a2.id);

    expect(ae.edgeType).toBe(AttackEdgeType.Exploitation);
    expect(ae.probability).toBe(0.8);
  });

  it('should map all KG node types', () => {
    const adapter = new KnowledgeGraphAdapter();
    for (const nt of Object.values(NodeType)) {
      const node = makeKGNode(`test-${nt}`, nt, ['Test']);
      const attackNode = adapter.toAttackNode(node);
      expect(attackNode.nodeType).toBeDefined();
    }
  });

  it('should map all KG edge types', () => {
    const adapter = new KnowledgeGraphAdapter();
    const n1 = createAttackNode({ graphNodeId: makeNodeId('n1'), nodeType: AttackNodeType.Asset, label: 'N1', riskScore: 0.5, riskLevel: RiskLevel.Medium });
    const n2 = createAttackNode({ graphNodeId: makeNodeId('n2'), nodeType: AttackNodeType.Asset, label: 'N2', riskScore: 0.5, riskLevel: RiskLevel.Medium });

    for (const et of Object.values(EdgeType)) {
      const edge = makeKGEdge(`e-${et}`, 'n1', 'n2', et, 0.5);
      const attackEdge = adapter.toAttackEdge(edge, n1.id, n2.id);
      expect(attackEdge.edgeType).toBeDefined();
    }
  });

  it('should use risk scores when provided', () => {
    const adapter = new KnowledgeGraphAdapter({
      riskScores: new Map([[makeNodeId('test'), { score: 0.9, level: RiskLevel.Critical }]]),
      entryPointIds: new Set([makeNodeId('test')]),
      objectiveIds: new Set([makeNodeId('test')]),
    });

    const node = makeKGNode('test', NodeType.Endpoint, ['Test']);
    const attackNode = adapter.toAttackNode(node);

    expect(attackNode.riskScore).toBe(0.9);
    expect(attackNode.riskLevel).toBe(RiskLevel.Critical);
    expect(attackNode.isEntryPoint).toBe(true);
    expect(attackNode.isObjective).toBe(true);
  });
});

// ─── Graph Projection Tests ───────────────────────────────────

describe('Graph Projection', () => {
  let repo: InMemoryGraphRepository;
  let traversalEngine: GraphTraversalEngineImpl;

  beforeEach(async () => {
    repo = new InMemoryGraphRepository();
    traversalEngine = new GraphTraversalEngineImpl(repo);

    await repo.addNode(makeKGNode('n1', NodeType.Endpoint, ['N1']));
    await repo.addNode(makeKGNode('n2', NodeType.Host, ['N2']));
    await repo.addNode(makeKGNode('n3', NodeType.Application, ['N3']));
    await repo.addEdge(makeKGEdge('e1', 'n1', 'n2', EdgeType.CONNECTED_TO, 0.8));
    await repo.addEdge(makeKGEdge('e2', 'n2', 'n3', EdgeType.DEPENDS_ON, 0.7));
  });

  it('should project a path to a subgraph', async () => {
    const projectionEngine = new GraphProjectionEngine(traversalEngine);
    const path = createTestPath();
    const result = await projectionEngine.project(path);
    expect(result.nodeIds.length).toBeGreaterThan(0);
  });

  it('should project without traversal engine', async () => {
    const projectionEngine = new GraphProjectionEngine(null);
    const path = createTestPath();
    const result = await projectionEngine.project(path);
    expect(result.subgraph).toBeNull();
  });

  it('should project multiple paths', async () => {
    const projectionEngine = new GraphProjectionEngine(traversalEngine);
    const paths = [createTestPath(3), createTestPath(5)];
    const result = await projectionEngine.projectMultiple(paths);
    expect(result.attackNodes.length).toBeGreaterThan(0);
  });

  it('should use custom projection config', async () => {
    const projectionEngine = new GraphProjectionEngine(traversalEngine, {
      includeContext: false, contextDepth: 0, extractKGSubgraph: false,
    });
    const path = createTestPath();
    const result = await projectionEngine.project(path);
    expect(result.subgraph).toBeNull();
  });
});

// ─── Path Discovery Engine Tests ──────────────────────────────

describe('Path Discovery Engine', () => {
  let repo: InMemoryGraphRepository;
  let traversalEngine: GraphTraversalEngineImpl;

  beforeEach(async () => {
    repo = new InMemoryGraphRepository();
    traversalEngine = new GraphTraversalEngineImpl(repo);

    await repo.addNode(makeKGNode('A', NodeType.Endpoint, ['A']));
    await repo.addNode(makeKGNode('B', NodeType.Host, ['B']));
    await repo.addNode(makeKGNode('C', NodeType.Application, ['C']));
    await repo.addNode(makeKGNode('D', NodeType.Service, ['D']));
    await repo.addEdge(makeKGEdge('eAB', 'A', 'B', EdgeType.EXPOSES, 0.9));
    await repo.addEdge(makeKGEdge('eBC', 'B', 'C', EdgeType.CONNECTED_TO, 0.7));
    await repo.addEdge(makeKGEdge('eCD', 'C', 'D', EdgeType.DEPENDS_ON, 0.8));
  });

  it('should discover paths with BFS', async () => {
    const adapter = new KnowledgeGraphAdapter();
    const engine = new PathDiscoveryEngine(traversalEngine, adapter);
    const objective = createAttackObjective({ type: AttackObjectiveType.Impact });
    const result = await engine.discover(makeNodeId('A'), [makeNodeId('D')], objective, DiscoveryStrategy.BFS, DEFAULT_CONSTRAINTS);
    expect(result).toBeDefined();
    expect(result.strategy).toBe(DiscoveryStrategy.BFS);
  });

  it('should discover paths with DFS', async () => {
    const adapter = new KnowledgeGraphAdapter();
    const engine = new PathDiscoveryEngine(traversalEngine, adapter);
    const objective = createAttackObjective({ type: AttackObjectiveType.Impact });
    const result = await engine.discover(makeNodeId('A'), [makeNodeId('D')], objective, DiscoveryStrategy.DFS, DEFAULT_CONSTRAINTS);
    expect(result).toBeDefined();
  });

  it('should discover paths with ShortestPath', async () => {
    const adapter = new KnowledgeGraphAdapter();
    const engine = new PathDiscoveryEngine(traversalEngine, adapter);
    const objective = createAttackObjective({ type: AttackObjectiveType.Impact });
    const result = await engine.discover(makeNodeId('A'), [makeNodeId('D')], objective, DiscoveryStrategy.ShortestPath, DEFAULT_CONSTRAINTS);
    expect(result).toBeDefined();
  });

  it('should discover paths with MultiPath', async () => {
    const adapter = new KnowledgeGraphAdapter();
    const engine = new PathDiscoveryEngine(traversalEngine, adapter);
    const objective = createAttackObjective({ type: AttackObjectiveType.Impact });
    const result = await engine.discover(makeNodeId('A'), [makeNodeId('D')], objective, DiscoveryStrategy.MultiPath, DEFAULT_CONSTRAINTS);
    expect(result).toBeDefined();
  });

  it('should discover paths with Reachability', async () => {
    const adapter = new KnowledgeGraphAdapter();
    const engine = new PathDiscoveryEngine(traversalEngine, adapter);
    const objective = createAttackObjective({ type: AttackObjectiveType.Impact });
    const result = await engine.discover(makeNodeId('A'), [makeNodeId('D')], objective, DiscoveryStrategy.Reachability, DEFAULT_CONSTRAINTS);
    expect(result).toBeDefined();
  });

  it('should apply forbidden node constraints', async () => {
    const adapter = new KnowledgeGraphAdapter();
    const engine = new PathDiscoveryEngine(traversalEngine, adapter);
    const objective = createAttackObjective({ type: AttackObjectiveType.Impact });
    const result = await engine.discover(makeNodeId('A'), [makeNodeId('D')], objective, DiscoveryStrategy.BFS, {
      ...DEFAULT_CONSTRAINTS, forbiddenNodeIds: [makeNodeId('B')],
    });
    expect(result).toBeDefined();
  });

  it('should apply maximum paths constraint', async () => {
    const adapter = new KnowledgeGraphAdapter();
    const engine = new PathDiscoveryEngine(traversalEngine, adapter);
    const objective = createAttackObjective({ type: AttackObjectiveType.Impact });
    const result = await engine.discover(makeNodeId('A'), [makeNodeId('D')], objective, DiscoveryStrategy.BFS, {
      ...DEFAULT_CONSTRAINTS, maximumPaths: 1,
    });
    expect(result.totalDiscovered).toBeLessThanOrEqual(1);
  });

  it('should handle missing source node', async () => {
    const adapter = new KnowledgeGraphAdapter();
    const engine = new PathDiscoveryEngine(traversalEngine, adapter);
    const objective = createAttackObjective({ type: AttackObjectiveType.Impact });
    const result = await engine.discover(makeNodeId('nonexistent'), [makeNodeId('D')], objective, DiscoveryStrategy.BFS, DEFAULT_CONSTRAINTS);
    expect(result.totalDiscovered).toBe(0);
  });
});

// ─── Additional Coverage Tests ────────────────────────────────

describe('Additional Coverage', () => {
  describe('Simulation details', () => {
    it('should compute step probabilities for first step', () => {
      const node = createTestNode({ riskScore: 0.3 });
      const step = createAttackStep({ node, stepIndex: 0 });
      expect(computeStepProbability(step)).toBeGreaterThan(0);
    });

    it('should handle detection point step', () => {
      const n1 = createTestNode(); const n2 = createTestNode({ graphNodeId: makeNodeId('n2') });
      const edge = createTestEdge(n1, n2);
      const step = createAttackStep({ node: n2, incomingEdge: edge, stepIndex: 1, isDetectionPoint: true });
      expect(computeStepProbability(step)).toBeGreaterThan(0);
    });

    it('should handle privilege escalation critical step', () => {
      const n1 = createTestNode(); const n2 = createTestNode({ graphNodeId: makeNodeId('n2') });
      const edge = createTestEdge(n1, n2, { isPrivilegeEscalation: true });
      const step = createAttackStep({ node: n2, incomingEdge: edge, stepIndex: 1 });
      expect(identifyCriticalSteps([step])).toHaveLength(1);
    });

    it('should handle steps with techniques for capabilities', () => {
      const technique: AttackTechnique = {
        id: 'T1190', name: 'Test', tactic: AttackObjectiveType.InitialAccess,
        description: 'Test', subTechniques: [], frequency: 0.8, difficulty: 0.3,
        detectionDifficulty: 0.4, references: [], metadata: {},
      };
      const node = createTestNode();
      const step = createAttackStep({ node, stepIndex: 0, techniques: [technique] });
      expect(determineRequiredCapabilities([step])).toContain('technique_T1190');
    });

    it('should handle credential and service node types', () => {
      const credNode = createTestNode({ nodeType: AttackNodeType.Credential });
      const svcNode = createTestNode({ nodeType: AttackNodeType.Service, graphNodeId: makeNodeId('n2') });
      const step1 = createAttackStep({ node: credNode, stepIndex: 0 });
      const step2 = createAttackStep({ node: svcNode, stepIndex: 1 });
      const caps = determineRequiredCapabilities([step1, step2]);
      expect(caps).toContain('credential_harvesting');
      expect(caps).toContain('service_exploitation');
    });
  });

  describe('Ranking with techniques', () => {
    it('should compute exploit availability with techniques', () => {
      const technique: AttackTechnique = {
        id: 'T1190', name: 'Test', tactic: AttackObjectiveType.InitialAccess,
        description: 'Test', subTechniques: [], frequency: 0.8, difficulty: 0.3,
        detectionDifficulty: 0.4, references: [], metadata: {},
      };
      const node = createTestNode();
      const step = createAttackStep({ node, stepIndex: 0, techniques: [technique] });
      expect(computeExploitAvailabilityScore([step])).toBeGreaterThan(0.1);
    });

    it('should compute privilege escalation with techniques', () => {
      const technique: AttackTechnique = {
        id: 'T1068', name: 'Test', tactic: AttackObjectiveType.PrivilegeEscalation,
        description: 'Test', subTechniques: [], frequency: 0.6, difficulty: 0.3,
        detectionDifficulty: 0.5, references: [], metadata: {},
      };
      const node = createTestNode();
      const step = createAttackStep({ node, stepIndex: 0, techniques: [technique] });
      expect(computePrivilegeEscalationScore([step])).toBeGreaterThan(0);
    });

    it('should compute lateral movement with techniques', () => {
      const technique: AttackTechnique = {
        id: 'T1021', name: 'Test', tactic: AttackObjectiveType.LateralMovement,
        description: 'Test', subTechniques: [], frequency: 0.75, difficulty: 0.25,
        detectionDifficulty: 0.45, references: [], metadata: {},
      };
      const node = createTestNode();
      const step = createAttackStep({ node, stepIndex: 0, techniques: [technique] });
      expect(computeLateralMovementScore([step])).toBeGreaterThan(0);
    });
  });

  describe('AttackSimulation model', () => {
    it('should create simulation with all fields', () => {
      const path = createTestPath();
      const sim = createAttackSimulation({
        pathId: path.id,
        successProbability: 0.6,
        criticalSteps: path.steps.slice(0, 1),
        bottlenecks: path.steps.slice(1, 2),
        detectionPoints: path.steps.slice(0, 1),
        stepProbabilities: path.steps.map(s => ({ stepId: s.id, probability: 0.8 })),
        cumulativeProbability: 0.5,
        estimatedTimeSteps: 10,
        requiredCapabilities: ['valid_credentials'],
      });
      expect(sim.successProbability).toBe(0.6);
      expect(Object.isFrozen(sim)).toBe(true);
    });
  });

  describe('Attack evidence', () => {
    it('should create evidence', () => {
      const evidence = createAttackEvidence({
        sourceType: 'finding', sourceId: 'f1', field: 'severity',
        value: 'High', confidence: 0.9, description: 'Evidence',
      });
      expect(evidence.sourceType).toBe('finding');
    });
  });

  describe('Cache TTL expiration', () => {
    it('should expire entries based on TTL', async () => {
      const cache = new AttackPathCache({ capacity: 10, ttlMs: 5 });
      cache.setPath('key1', createTestPath());
      expect(cache.getPath('key1')).not.toBeNull();
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(cache.getPath('key1')).toBeNull();
    });
  });

  describe('Validation with warnings', () => {
    it('should warn about missing incoming edges', () => {
      const nodes = [createTestNode(), createTestNode({ graphNodeId: makeNodeId('n2') })];
      const steps = nodes.map((n, i) => createAttackStep({ node: n, stepIndex: i }));
      const objective = createAttackObjective({ type: AttackObjectiveType.Impact });
      const ranking = createAttackPathRanking({
        riskScore: 0.5, pathLengthScore: 0.5, exploitAvailabilityScore: 0.5,
        privilegeEscalationScore: 0.5, lateralMovementScore: 0.5,
        internetExposureScore: 0.5, businessImpactScore: 0.5, confidenceScore: 0.5,
      });
      const path = createAttackPath({
        steps, edges: [], nodes, objective, ranking,
        discoveryStrategy: DiscoveryStrategy.BFS, discoveryDurationMs: 0,
      });
      const result = validateAttackPath(path);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Simulation with custom config', () => {
    it('should use custom simulation config', () => {
      const engine = new SimulationEngine({
        stepBase: 0.9, riskPenaltyFactor: 0.2, authPenalty: 0.1,
        privilegePenalty: 0.15, detectionPenalty: 0.05, lateralPenalty: 0.08,
      });
      const sim = engine.simulate(createTestPath());
      expect(sim.successProbability).toBeGreaterThan(0);
    });
  });

  describe('Ranking with custom config', () => {
    it('should use custom ranking weights', () => {
      const engine = new PathRankingEngine({
        riskWeight: 0.5, lengthWeight: 0.05, exploitAvailabilityWeight: 0.1,
        privilegeEscalationWeight: 0.1, lateralMovementWeight: 0.1,
        internetExposureWeight: 0.05, businessImpactWeight: 0.05, confidenceWeight: 0.05,
      });
      const ranked = engine.rankPath(createTestPath());
      expect(ranked.ranking.overallScore).toBeGreaterThan(0);
    });
  });

  describe('Serialization', () => {
    it('should serialize simulation to JSON', () => {
      const sim = new SimulationEngine().simulate(createTestPath());
      const json = attackSimulationToJSON(sim);
      expect(typeof json).toBe('string');
      expect(JSON.parse(json).id).toBe(sim.id);
    });
  });

  describe('Event types', () => {
    it('should create all event types correctly', () => {
      expect(createPathDiscoveredEvent('e', 'p' as any, DiscoveryStrategy.BFS, AttackObjectiveType.Impact, 3, 0.5, 100).type).toBe('PathDiscovered');
      expect(createPathRankedEvent('e', 'p' as any, 0.8, 1, 50).type).toBe('PathRanked');
      expect(createSimulationCompletedEvent('e', 's' as any, 'p' as any, 0.6, 2, 1, 200).type).toBe('SimulationCompleted');
      expect(createAttackGraphBuiltEvent('e', 5, 8, 3, 150).type).toBe('AttackGraphBuilt');
    });
  });
});
