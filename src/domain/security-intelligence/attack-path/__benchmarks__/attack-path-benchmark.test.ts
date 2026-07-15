/**
 * Attack Path Builder — Benchmarks
 *
 * Measures: discovery, ranking, simulation, projection, cache performance.
 */

import { describe, it, expect } from 'vitest';
import {
  AttackPathEngine, AttackPathCache, PathRankingEngine, SimulationEngine,
  GraphProjectionEngine, KnowledgeGraphAdapter, PathDiscoveryEngine,
  DiscoveryStrategy, AttackObjectiveType, AttackNodeType, AttackEdgeType,
  DEFAULT_CONSTRAINTS, createAttackNode, createAttackEdge, createAttackStep,
  createAttackObjective, createAttackPathRanking, createAttackPath,
  createAttackSimulation,
  AttackPathEventBus,
} from '../index.ts';
import { RiskLevel } from '../../risk/index.ts';
import { InMemoryGraphRepository } from '../../../knowledge-graph/runtime/index.ts';
import { GraphTraversalEngineImpl } from '../../../knowledge-graph/traversal/index.ts';
import { createGraphNode, createGraphEdge, createRelationship } from '../../../knowledge-graph/models/index.ts';
import type { NodeId } from '../../../knowledge-graph/types/index.ts';
import { NodeType, EdgeType } from '../../../knowledge-graph/types/index.ts';

function makeNodeId(id: string): NodeId { return id as NodeId; }

function createTestPath(stepCount: number = 3) {
  const nodes: any[] = [];
  const edges: any[] = [];
  const steps: any[] = [];

  for (let i = 0; i < stepCount; i++) {
    const node = createAttackNode({
      graphNodeId: makeNodeId(`node-${i}`),
      nodeType: AttackNodeType.Asset,
      label: `Node ${i}`,
      riskScore: Math.min(0.3 + i * 0.15, 1.0),
      riskLevel: i < 2 ? RiskLevel.Medium : RiskLevel.High,
      isEntryPoint: i === 0,
      isObjective: i === stepCount - 1,
    });
    nodes.push(node);
  }

  for (let i = 0; i < stepCount - 1; i++) {
    const edge = createAttackEdge({
      sourceNodeId: nodes[i].id,
      targetNodeId: nodes[i + 1].id,
      graphEdgeId: `edge-${i}` as any,
      edgeType: AttackEdgeType.Exploitation,
      probability: 0.7,
    });
    edges.push(edge);
  }

  for (let i = 0; i < stepCount; i++) {
    const step = createAttackStep({
      node: nodes[i],
      incomingEdge: i > 0 ? edges[i - 1] : null,
      outgoingEdges: i < stepCount - 1 ? [edges[i]] : [],
      stepIndex: i,
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

// ─── Ranking Benchmarks ──────────────────────────────────────

describe('Ranking Benchmarks', () => {
  it('should rank 100 paths in < 100ms', () => {
    const paths = Array.from({ length: 100 }, () => createTestPath(5));
    const engine = new PathRankingEngine();
    const start = performance.now();
    engine.rankPaths(paths);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('should rank 1K paths in < 1s', () => {
    const paths = Array.from({ length: 1000 }, () => createTestPath(3));
    const engine = new PathRankingEngine();
    const start = performance.now();
    engine.rankPaths(paths);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1000);
  });
});

// ─── Simulation Benchmarks ───────────────────────────────────

describe('Simulation Benchmarks', () => {
  it('should simulate 100 paths in < 200ms', () => {
    const engine = new SimulationEngine();
    const paths = Array.from({ length: 100 }, () => createTestPath(5));
    const start = performance.now();
    for (const path of paths) engine.simulate(path);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(200);
  });

  it('should simulate 1K paths in < 2s', () => {
    const engine = new SimulationEngine();
    const paths = Array.from({ length: 1000 }, () => createTestPath(3));
    const start = performance.now();
    for (const path of paths) engine.simulate(path);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(2000);
  });
});

// ─── Cache Benchmarks ────────────────────────────────────────

describe('Cache Benchmarks', () => {
  it('should handle 1K cache writes in < 100ms', () => {
    const cache = new AttackPathCache({ capacity: 2000, ttlMs: 60000 });
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      cache.setPath(`key-${i}`, createTestPath(3));
    }
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('should handle 1K cache reads with > 90% hit rate', () => {
    const cache = new AttackPathCache({ capacity: 2000, ttlMs: 60000 });
    for (let i = 0; i < 100; i++) {
      cache.setPath(`key-${i}`, createTestPath(3));
    }
    let hits = 0;
    for (let i = 0; i < 1000; i++) {
      const key = `key-${i % 100}`;
      if (cache.getPath(key)) hits++;
    }
    expect(hits / 1000).toBeGreaterThan(0.9);
  });
});

// ─── Projection Benchmarks ───────────────────────────────────

describe('Projection Benchmarks', () => {
  it('should project 100 paths in < 500ms', async () => {
    const engine = new GraphProjectionEngine(null);
    const paths = Array.from({ length: 100 }, () => createTestPath(3));
    const start = performance.now();
    for (const path of paths) {
      await engine.project(path);
    }
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500);
  });
});

// ─── Discovery Benchmarks ────────────────────────────────────

describe('Discovery Benchmarks', () => {
  it('should discover paths in a 20-node graph in < 1s', async () => {
    const repo = new InMemoryGraphRepository();
    for (let i = 0; i < 20; i++) {
      await repo.addNode(createGraphNode(`node-${i}`, i % 2 === 0 ? NodeType.Endpoint : NodeType.Host, { labels: [`Node ${i}`] }));
    }
    for (let i = 0; i < 19; i++) {
      await repo.addEdge(createGraphEdge(`edge-${i}`, `node-${i}`, `node-${i + 1}`, createRelationship(EdgeType.CONNECTED_TO, { strength: 0.7 })));
    }

    const traversalEngine = new GraphTraversalEngineImpl(repo);
    const adapter = new KnowledgeGraphAdapter();
    const discoveryEngine = new PathDiscoveryEngine(traversalEngine, adapter);
    const objective = createAttackObjective({ type: AttackObjectiveType.Impact });

    const start = performance.now();
    const result = await discoveryEngine.discover(
      makeNodeId('node-0'), [makeNodeId('node-19')], objective,
      DiscoveryStrategy.BFS, DEFAULT_CONSTRAINTS,
    );
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1000);
  });
});
