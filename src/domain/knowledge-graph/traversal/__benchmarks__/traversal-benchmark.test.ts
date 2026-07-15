/**
 * Knowledge Graph Traversal Engine — Benchmarks
 *
 * Performance benchmarks for various graph sizes:
 * - 1K nodes, 3K edges
 * - 10K nodes, 30K edges
 * - 50K nodes, 150K edges
 * - 100K nodes, 300K edges
 *
 * Measures:
 * - BFS traversal
 * - DFS traversal
 * - Shortest path lookup
 * - Reachability
 * - Cycle detection
 * - Connected components
 * - Subgraph extraction
 */

import { describe, it, expect } from 'vitest';
import { NodeType, EdgeType, brandNodeId } from '../../types/index.ts';
import { createGraphNode, createGraphEdge, createRelationship } from '../../models/index.ts';
import type { GraphNode, GraphEdge, GraphRepository } from '../../models/index.ts';
import { GraphTraversalEngineImpl } from '../engine/index.ts';

// ─── Benchmark Repository ─────────────────────────────────────

class BenchRepository implements GraphRepository {
  private _nodes = new Map<string, GraphNode>();
  private _edges = new Map<string, GraphEdge>();
  private _edgesFrom = new Map<string, GraphEdge[]>();
  private _edgesTo = new Map<string, GraphEdge[]>();

  async addNode(node: GraphNode): Promise<void> {
    this._nodes.set(node.identity.id, node);
  }

  async getNode(id: string): Promise<GraphNode | undefined> {
    return this._nodes.get(id);
  }

  async removeNode(id: string): Promise<boolean> { return this._nodes.delete(id); }
  async updateNodeProperties(id: string, p: Record<string, unknown>): Promise<GraphNode> {
    const n = this._nodes.get(id)!;
    const u = { ...n, properties: { ...n.properties, ...p } } as GraphNode;
    this._nodes.set(id, u);
    return u;
  }

  async addEdge(edge: GraphEdge): Promise<void> {
    this._edges.set(edge.id, edge);
    if (!this._edgesFrom.has(edge.sourceId)) this._edgesFrom.set(edge.sourceId, []);
    this._edgesFrom.get(edge.sourceId)!.push(edge);
    if (!this._edgesTo.has(edge.targetId)) this._edgesTo.set(edge.targetId, []);
    this._edgesTo.get(edge.targetId)!.push(edge);
  }

  async getEdge(id: string): Promise<GraphEdge | undefined> { return this._edges.get(id); }
  async removeEdge(id: string): Promise<boolean> { return this._edges.delete(id); }
  async getEdgesFrom(nodeId: string): Promise<readonly GraphEdge[]> { return this._edgesFrom.get(nodeId) ?? []; }
  async getEdgesTo(nodeId: string): Promise<readonly GraphEdge[]> { return this._edgesTo.get(nodeId) ?? []; }
  async getAllNodes(): Promise<readonly GraphNode[]> { return [...this._nodes.values()]; }
  async getAllEdges(): Promise<readonly GraphEdge[]> { return [...this._edges.values()]; }
  async nodeCount(): Promise<number> { return this._nodes.size; }
  async edgeCount(): Promise<number> { return this._edges.size; }
  async hasNode(id: string): Promise<boolean> { return this._nodes.has(id); }
  async hasEdge(id: string): Promise<boolean> { return this._edges.has(id); }
}

/** Generate a random graph with given node count and average degree */
async function generateGraph(nodeCount: number, avgDegree: number): Promise<BenchRepository> {
  const repo = new BenchRepository();
  const edgeCount = Math.floor(nodeCount * avgDegree);

  // Create nodes
  for (let i = 0; i < nodeCount; i++) {
    const node = createGraphNode(`n${i}`, NodeType.Host, { properties: { idx: i } });
    await repo.addNode(node);
  }

  // Create edges (random, avoiding self-loops)
  const edgeTypes = [EdgeType.DEPENDS_ON, EdgeType.HOSTS, EdgeType.USES, EdgeType.CONNECTED_TO];
  for (let i = 0; i < edgeCount; i++) {
    const src = Math.floor(Math.random() * nodeCount);
    let tgt = Math.floor(Math.random() * nodeCount);
    if (tgt === src) tgt = (tgt + 1) % nodeCount;
    const edgeType = edgeTypes[i % edgeTypes.length];
    const edge = createGraphEdge(
      `e${i}`,
      `n${src}`,
      `n${tgt}`,
      createRelationship(edgeType),
    );
    await repo.addEdge(edge);
  }

  return repo;
}

/** Generate a chain graph */
async function generateChain(nodeCount: number): Promise<BenchRepository> {
  const repo = new BenchRepository();
  for (let i = 0; i < nodeCount; i++) {
    await repo.addNode(createGraphNode(`n${i}`, NodeType.Host, { properties: { idx: i } }));
  }
  for (let i = 0; i < nodeCount - 1; i++) {
    await repo.addEdge(createGraphEdge(`e${i}`, `n${i}`, `n${i + 1}`, createRelationship(EdgeType.DEPENDS_ON)));
  }
  return repo;
}

// ─── Benchmark Results ────────────────────────────────────────

interface BenchResult {
  operation: string;
  nodeCount: number;
  edgeCount: number;
  duration: number;
  resultSize: number;
}

const results: BenchResult[] = [];

function recordBench(operation: string, nodeCount: number, edgeCount: number, duration: number, resultSize: number) {
  results.push({ operation, nodeCount, edgeCount, duration, resultSize });
}

// ─── 1K Benchmark ─────────────────────────────────────────────

describe('Benchmark: 1K nodes', () => {
  it('BFS traversal', async () => {
    const repo = await generateGraph(1000, 3);
    const engine = new GraphTraversalEngineImpl(repo);
    const start = Date.now();
    const result = await engine.bfs(brandNodeId('n0'), { maxDepth: 5 });
    const duration = Date.now() - start;
    recordBench('BFS', 1000, 3000, duration, result.visitedNodes.length);
    expect(result.visitedNodes.length).toBeGreaterThan(0);
  });

  it('DFS traversal', async () => {
    const repo = await generateGraph(1000, 3);
    const engine = new GraphTraversalEngineImpl(repo);
    const start = Date.now();
    const result = await engine.dfs(brandNodeId('n0'), { maxDepth: 5 });
    const duration = Date.now() - start;
    recordBench('DFS', 1000, 3000, duration, result.visitedNodes.length);
    expect(result.visitedNodes.length).toBeGreaterThan(0);
  });

  it('Shortest path', async () => {
    const repo = await generateChain(1000);
    const engine = new GraphTraversalEngineImpl(repo);
    const start = Date.now();
    const result = await engine.shortestPath(brandNodeId('n0'), brandNodeId('n999'), { maxDepth: 1000 });
    const duration = Date.now() - start;
    recordBench('ShortestPath', 1000, 999, duration, result.path?.length ?? 0);
    expect(result.found).toBe(true);
  });

  it('Cycle detection', async () => {
    const repo = await generateGraph(1000, 3);
    const engine = new GraphTraversalEngineImpl(repo);
    const start = Date.now();
    const has = await engine.hasCycle();
    const duration = Date.now() - start;
    recordBench('HasCycle', 1000, 3000, duration, has ? 1 : 0);
  });

  it('Connected components', async () => {
    const repo = await generateGraph(1000, 3);
    const engine = new GraphTraversalEngineImpl(repo);
    const start = Date.now();
    const components = await engine.getConnectedComponents();
    const duration = Date.now() - start;
    recordBench('ConnectedComponents', 1000, 3000, duration, components.length);
    expect(components.length).toBeGreaterThan(0);
  });

  it('Reachability', async () => {
    const repo = await generateGraph(1000, 3);
    const engine = new GraphTraversalEngineImpl(repo);
    const start = Date.now();
    const result = await engine.reachableNodes(brandNodeId('n0'), { maxDepth: 5 });
    const duration = Date.now() - start;
    recordBench('Reachability', 1000, 3000, duration, result.visitedNodes.length);
  });

  it('Subgraph extraction', async () => {
    const repo = await generateGraph(1000, 3);
    const engine = new GraphTraversalEngineImpl(repo);
    const start = Date.now();
    const sg = await engine.extractSubgraph(brandNodeId('n0'), { maxDepth: 3 });
    const duration = Date.now() - start;
    recordBench('Subgraph', 1000, 3000, duration, sg.nodes.length);
  });
});

// ─── 10K Benchmark ────────────────────────────────────────────

describe('Benchmark: 10K nodes', () => {
  it('BFS traversal', async () => {
    const repo = await generateGraph(10000, 3);
    const engine = new GraphTraversalEngineImpl(repo);
    const start = Date.now();
    const result = await engine.bfs(brandNodeId('n0'), { maxDepth: 5 });
    const duration = Date.now() - start;
    recordBench('BFS', 10000, 30000, duration, result.visitedNodes.length);
  });

  it('Shortest path (chain)', async () => {
    const repo = await generateChain(10000);
    const engine = new GraphTraversalEngineImpl(repo);
    const start = Date.now();
    const result = await engine.shortestPath(brandNodeId('n0'), brandNodeId('n9999'), { maxDepth: 10000 });
    const duration = Date.now() - start;
    recordBench('ShortestPath', 10000, 9999, duration, result.path?.length ?? 0);
  });

  it('Cycle detection', async () => {
    const repo = await generateGraph(10000, 3);
    const engine = new GraphTraversalEngineImpl(repo);
    const start = Date.now();
    await engine.hasCycle();
    const duration = Date.now() - start;
    recordBench('HasCycle', 10000, 30000, duration, 0);
  });

  it('Connected components', async () => {
    const repo = await generateGraph(10000, 3);
    const engine = new GraphTraversalEngineImpl(repo);
    const start = Date.now();
    const components = await engine.getConnectedComponents();
    const duration = Date.now() - start;
    recordBench('ConnectedComponents', 10000, 30000, duration, components.length);
  });
});

// ─── 50K Benchmark ────────────────────────────────────────────

describe('Benchmark: 50K nodes', () => {
  it('BFS traversal (depth-limited)', async () => {
    const repo = await generateGraph(50000, 3);
    const engine = new GraphTraversalEngineImpl(repo);
    const start = Date.now();
    const result = await engine.bfs(brandNodeId('n0'), { maxDepth: 3 });
    const duration = Date.now() - start;
    recordBench('BFS_depth3', 50000, 150000, duration, result.visitedNodes.length);
  });

  it('Shortest path (1000-node chain)', async () => {
    const repo = await generateChain(1000);
    const engine = new GraphTraversalEngineImpl(repo);
    const start = Date.now();
    const result = await engine.shortestPath(brandNodeId('n0'), brandNodeId('n999'));
    const duration = Date.now() - start;
    recordBench('ShortestPath_1K', 50000, 150000, duration, result.path?.length ?? 0);
  });

  it('Cycle detection', async () => {
    const repo = await generateGraph(50000, 3);
    const engine = new GraphTraversalEngineImpl(repo);
    const start = Date.now();
    await engine.hasCycle();
    const duration = Date.now() - start;
    recordBench('HasCycle', 50000, 150000, duration, 0);
  });
});

// ─── 100K Benchmark ───────────────────────────────────────────

describe('Benchmark: 100K nodes', () => {
  it('BFS traversal (depth-limited)', async () => {
    const repo = await generateGraph(100000, 3);
    const engine = new GraphTraversalEngineImpl(repo);
    const start = Date.now();
    const result = await engine.bfs(brandNodeId('n0'), { maxDepth: 2 });
    const duration = Date.now() - start;
    recordBench('BFS_depth2', 100000, 300000, duration, result.visitedNodes.length);
  });

  it('Has cycle check', async () => {
    const repo = await generateGraph(100000, 3);
    const engine = new GraphTraversalEngineImpl(repo);
    const start = Date.now();
    await engine.hasCycle();
    const duration = Date.now() - start;
    recordBench('HasCycle', 100000, 300000, duration, 0);
  });

  it('Path existence (shallow)', async () => {
    const repo = await generateGraph(100000, 3);
    const engine = new GraphTraversalEngineImpl(repo);
    const start = Date.now();
    await engine.pathExists(brandNodeId('n0'), brandNodeId('n1'));
    const duration = Date.now() - start;
    recordBench('PathExists', 100000, 300000, duration, 0);
  });
});

// ─── Algorithm Comparison ─────────────────────────────────────

describe('Algorithm Comparison', () => {
  it('compare BFS vs DFS on same graph', async () => {
    const repo = await generateGraph(5000, 3);
    const engine = new GraphTraversalEngineImpl(repo);

    const bfsStart = Date.now();
    const bfsResult = await engine.bfs(brandNodeId('n0'), { maxDepth: 4 });
    const bfsDuration = Date.now() - bfsStart;

    const dfsStart = Date.now();
    const dfsResult = await engine.dfs(brandNodeId('n0'), { maxDepth: 4 });
    const dfsDuration = Date.now() - dfsStart;

    recordBench('BFS_5K', 5000, 15000, bfsDuration, bfsResult.visitedNodes.length);
    recordBench('DFS_5K', 5000, 15000, dfsDuration, dfsResult.visitedNodes.length);

    // Both should visit similar number of nodes (may differ slightly due to traversal order with filters)
    expect(Math.abs(bfsResult.visitedNodes.length - dfsResult.visitedNodes.length)).toBeLessThanOrEqual(5);
  });

  it('compare single-source vs bidirectional BFS', async () => {
    const repo = await generateChain(5000);
    const engine = new GraphTraversalEngineImpl(repo);

    const singleStart = Date.now();
    const singleResult = await engine.shortestPath(brandNodeId('n0'), brandNodeId('n4999'), {
      bidirectional: false,
    });
    const singleDuration = Date.now() - singleStart;

    const biStart = Date.now();
    const biResult = await engine.shortestPath(brandNodeId('n0'), brandNodeId('n4999'), {
      bidirectional: true,
    });
    const biDuration = Date.now() - biStart;

    recordBench('ShortestPath_Single', 5000, 4999, singleDuration, singleResult.path?.length ?? 0);
    recordBench('ShortestPath_BiDir', 5000, 4999, biDuration, biResult.path?.length ?? 0);

    expect(singleResult.path?.length).toBe(biResult.path?.length);
  });
});
