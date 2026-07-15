/**
 * Knowledge Graph Traversal Engine — Comprehensive Tests
 *
 * Tests cover:
 * - BFS: basic, filtered, depth-limited, visitors, cancellation, timeout
 * - DFS: iterative, recursive, filtered, depth-limited
 * - Bidirectional BFS: basic, same node, no path, filtered
 * - Shortest Path: basic, no path, same node, depth-limited
 * - Multi-Path: K-shortest paths, single path, no alternative
 * - Cycle Detection: cycles, DAG, self-loops (handled at edge creation), multiple cycles
 * - Connected Components: connected, disconnected, isolated nodes
 * - Reachability: reachable set, filtered, direction
 * - Neighborhood: direct, multi-hop, filtered, incoming, outgoing
 * - Subgraph Extraction: by depth, by type, by predicate
 * - Events: started, completed, cancelled, path found, cycle detected
 * - Statistics: visited counts, depth, duration, branching factor
 * - Strategy Selection: AUTO heuristic
 * - Edge Cases: empty graph, single node, disconnected, dense, sparse
 * - Performance: large graphs
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  NodeType, EdgeType, brandNodeId, brandEdgeId,
} from '../../types/index.ts';
import {
  createGraphNode, createGraphEdge, createRelationship,
} from '../../models/index.ts';
import type { GraphNode, GraphEdge, GraphRepository } from '../../models/index.ts';
import { GraphTraversalEngineImpl } from '../engine/index.ts';
import {
  breadthFirstSearch,
  depthFirstSearch,
  depthFirstSearchRecursive,
  bidirectionalBFS,
  shortestPath,
  findPaths,
  findCycles,
  hasCycle,
  connectedComponents,
  reachableNodes,
  pathExists,
} from '../algorithms/index.ts';
import { neighbors, outgoing, incoming, neighborEdges } from '../neighborhood/index.ts';
import { extractSubgraph, extractSubgraphByType, extractSubgraphByPredicate } from '../subgraph/index.ts';
import {
  createTraversalStartedEvent,
  createTraversalCompletedEvent,
  createTraversalCancelledEvent,
  createPathFoundEvent,
  createCycleDetectedEvent,
} from '../events/index.ts';
import {
  TraversalStatisticsCollector,
  VisitedTracker,
  PathPool,
} from '../statistics/index.ts';
import {
  TraversalStrategy,
  TerminationReason,
  createCancellationToken,
  emptyTraversalResult,
  emptyTraversalStatistics,
  createTraversalStatistics,
  notFoundPathResult,
} from '../types/index.ts';

// ─── Test Helpers ─────────────────────────────────────────────

/** Create a simple in-memory repository for testing */
class TestRepository implements GraphRepository {
  private _nodes = new Map<string, GraphNode>();
  private _edges = new Map<string, GraphEdge>();
  private _edgesFrom = new Map<string, GraphEdge[]>();
  private _edgesTo = new Map<string, GraphEdge[]>();

  async addNode(node: GraphNode): Promise<void> {
    const id = node.identity.id;
    this._nodes.set(id, node);
  }

  async getNode(id: string): Promise<GraphNode | undefined> {
    return this._nodes.get(id);
  }

  async removeNode(id: string): Promise<boolean> {
    return this._nodes.delete(id);
  }

  async updateNodeProperties(id: string, properties: Record<string, unknown>): Promise<GraphNode> {
    const node = this._nodes.get(id);
    if (!node) throw new Error(`Node ${id} not found`);
    const updated = { ...node, properties: { ...node.properties, ...properties } } as GraphNode;
    this._nodes.set(id, updated);
    return updated;
  }

  async addEdge(edge: GraphEdge): Promise<void> {
    this._edges.set(edge.id, edge);
    if (!this._edgesFrom.has(edge.sourceId)) this._edgesFrom.set(edge.sourceId, []);
    this._edgesFrom.get(edge.sourceId)!.push(edge);
    if (!this._edgesTo.has(edge.targetId)) this._edgesTo.set(edge.targetId, []);
    this._edgesTo.get(edge.targetId)!.push(edge);
  }

  async getEdge(id: string): Promise<GraphEdge | undefined> {
    return this._edges.get(id);
  }

  async removeEdge(id: string): Promise<boolean> {
    const edge = this._edges.get(id);
    if (!edge) return false;
    this._edges.delete(id);
    const fromList = this._edgesFrom.get(edge.sourceId);
    if (fromList) {
      const idx = fromList.findIndex(e => e.id === id);
      if (idx >= 0) fromList.splice(idx, 1);
    }
    const toList = this._edgesTo.get(edge.targetId);
    if (toList) {
      const idx = toList.findIndex(e => e.id === id);
      if (idx >= 0) toList.splice(idx, 1);
    }
    return true;
  }

  async getEdgesFrom(nodeId: string): Promise<readonly GraphEdge[]> {
    return this._edgesFrom.get(nodeId) ?? [];
  }

  async getEdgesTo(nodeId: string): Promise<readonly GraphEdge[]> {
    return this._edgesTo.get(nodeId) ?? [];
  }

  async getAllNodes(): Promise<readonly GraphNode[]> {
    return [...this._nodes.values()];
  }

  async getAllEdges(): Promise<readonly GraphEdge[]> {
    return [...this._edges.values()];
  }

  async nodeCount(): Promise<number> { return this._nodes.size; }
  async edgeCount(): Promise<number> { return this._edges.size; }
  async hasNode(id: string): Promise<boolean> { return this._nodes.has(id); }
  async hasEdge(id: string): Promise<boolean> { return this._edges.has(id); }
}

/** Helper to create a test node */
function makeNode(id: string, type: NodeType = NodeType.Host): GraphNode {
  return createGraphNode(id, type, { properties: { name: id } });
}

/** Helper to create a test edge */
function makeEdge(sourceId: string, targetId: string, edgeType: EdgeType = EdgeType.DEPENDS_ON, id?: string): GraphEdge {
  return createGraphEdge(
    id ?? `e_${sourceId}_${targetId}`,
    sourceId,
    targetId,
    createRelationship(edgeType),
  );
}

/** Build a simple chain: A → B → C → D */
function buildChain(): { repo: TestRepository; nodeIds: string[] } {
  const repo = new TestRepository();
  const nodeIds = ['A', 'B', 'C', 'D'];
  for (const id of nodeIds) repo.addNode(makeNode(id));
  repo.addEdge(makeEdge('A', 'B'));
  repo.addEdge(makeEdge('B', 'C'));
  repo.addEdge(makeEdge('C', 'D'));
  return { repo, nodeIds };
}

/** Build a tree:
 *       A
 *      / \
 *     B   C
 *    / \
 *   D   E
 */
function buildTree(): TestRepository {
  const repo = new TestRepository();
  ['A', 'B', 'C', 'D', 'E'].forEach(id => repo.addNode(makeNode(id)));
  repo.addEdge(makeEdge('A', 'B'));
  repo.addEdge(makeEdge('A', 'C'));
  repo.addEdge(makeEdge('B', 'D'));
  repo.addEdge(makeEdge('B', 'E'));
  return repo;
}

/** Build a cycle: A → B → C → A */
function buildCycle(): TestRepository {
  const repo = new TestRepository();
  ['A', 'B', 'C'].forEach(id => repo.addNode(makeNode(id)));
  repo.addEdge(makeEdge('A', 'B'));
  repo.addEdge(makeEdge('B', 'C'));
  repo.addEdge(makeEdge('C', 'A'));
  return repo;
}

/** Build a diamond: A → B, A → C, B → D, C → D */
function buildDiamond(): TestRepository {
  const repo = new TestRepository();
  ['A', 'B', 'C', 'D'].forEach(id => repo.addNode(makeNode(id)));
  repo.addEdge(makeEdge('A', 'B'));
  repo.addEdge(makeEdge('A', 'C'));
  repo.addEdge(makeEdge('B', 'D'));
  repo.addEdge(makeEdge('C', 'D'));
  return repo;
}

/** Build disconnected graph */
function buildDisconnected(): TestRepository {
  const repo = new TestRepository();
  ['A', 'B', 'C', 'D', 'E'].forEach(id => repo.addNode(makeNode(id)));
  repo.addEdge(makeEdge('A', 'B'));
  repo.addEdge(makeEdge('D', 'E'));
  return repo;
}

// ─── BFS Tests ────────────────────────────────────────────────

describe('BFS Algorithm', () => {
  it('should traverse a chain', async () => {
    const { repo } = buildChain();
    const result = await breadthFirstSearch(repo, brandNodeId('A'));
    expect(result.visitedNodes.map(n => n.identity.id)).toEqual(['A', 'B', 'C', 'D']);
    expect(result.strategyUsed).toBe(TraversalStrategy.BFS);
    expect(result.terminationReason).toBe(TerminationReason.Completed);
  });

  it('should traverse a tree level-by-level', async () => {
    const repo = buildTree();
    const result = await breadthFirstSearch(repo, brandNodeId('A'));
    const ids = result.visitedNodes.map(n => n.identity.id);
    expect(ids[0]).toBe('A');
    expect(ids.slice(1, 3).sort()).toEqual(['B', 'C']);
    expect(ids.slice(3).sort()).toEqual(['D', 'E']);
  });

  it('should respect maxDepth', async () => {
    const repo = buildTree();
    const result = await breadthFirstSearch(repo, brandNodeId('A'), { maxDepth: 1 });
    const ids = result.visitedNodes.map(n => n.identity.id);
    expect(ids).toContain('A');
    expect(ids).toContain('B');
    expect(ids).toContain('C');
    expect(ids).not.toContain('D');
    expect(ids).not.toContain('E');
    expect(result.terminationReason).toBe(TerminationReason.MaxDepthReached);
  });

  it('should return empty for non-existent start node', async () => {
    const repo = new TestRepository();
    const result = await breadthFirstSearch(repo, brandNodeId('X'));
    expect(result.visitedNodes).toEqual([]);
  });

  it('should apply edge type filter', async () => {
    const repo = new TestRepository();
    repo.addNode(makeNode('A'));
    repo.addNode(makeNode('B'));
    repo.addNode(makeNode('C'));
    repo.addEdge(makeEdge('A', 'B', EdgeType.DEPENDS_ON));
    repo.addEdge(makeEdge('A', 'C', EdgeType.HOSTS));

    const result = await breadthFirstSearch(repo, brandNodeId('A'), {
      edgeTypes: [EdgeType.DEPENDS_ON],
    });
    const ids = result.visitedNodes.map(n => n.identity.id);
    expect(ids).toContain('A');
    expect(ids).toContain('B');
    expect(ids).not.toContain('C');
  });

  it('should apply node type filter', async () => {
    const repo = new TestRepository();
    repo.addNode(makeNode('A', NodeType.Host));
    repo.addNode(makeNode('B', NodeType.Application));
    repo.addNode(makeNode('C', NodeType.Host));
    repo.addEdge(makeEdge('A', 'B'));
    repo.addEdge(makeEdge('A', 'C'));

    const result = await breadthFirstSearch(repo, brandNodeId('A'), {
      nodeTypes: [NodeType.Host],
    });
    const ids = result.visitedNodes.map(n => n.identity.id);
    expect(ids).toContain('A');
    expect(ids).toContain('C');
    expect(ids).not.toContain('B');
  });

  it('should support node visitor', async () => {
    const repo = buildTree();
    const visited: string[] = [];
    await breadthFirstSearch(repo, brandNodeId('A'), {
      nodeVisitor: (node) => { visited.push(node.identity.id); },
    });
    expect(visited).toContain('A');
    expect(visited).toContain('B');
  });

  it('should support pruning via node visitor', async () => {
    const repo = buildTree();
    const result = await breadthFirstSearch(repo, brandNodeId('A'), {
      nodeVisitor: (node) => node.identity.id !== 'A', // prune A's edges
    });
    // A is visited but its edges are not traversed
    expect(result.visitedNodes).toHaveLength(1);
    expect(result.visitedNodes[0].identity.id).toBe('A');
  });

  it('should support edge visitor', async () => {
    const repo = buildTree();
    const edgeCount = { value: 0 };
    await breadthFirstSearch(repo, brandNodeId('A'), {
      edgeVisitor: () => { edgeCount.value++; },
    });
    expect(edgeCount.value).toBeGreaterThan(0);
  });

  it('should respect maxNodes limit', async () => {
    const repo = buildTree();
    const result = await breadthFirstSearch(repo, brandNodeId('A'), { maxNodes: 2 });
    expect(result.visitedNodes.length).toBeLessThanOrEqual(2);
    expect(result.terminationReason).toBe(TerminationReason.MaxNodesReached);
  });

  it('should support cancellation', async () => {
    const repo = buildTree();
    const { token, cancel } = createCancellationToken();
    cancel('test cancel');
    const result = await breadthFirstSearch(repo, brandNodeId('A'), {
      cancellationToken: token,
    });
    expect(result.terminationReason).toBe(TerminationReason.Cancelled);
  });

  it('should traverse in both directions', async () => {
    const repo = new TestRepository();
    repo.addNode(makeNode('A'));
    repo.addNode(makeNode('B'));
    repo.addNode(makeNode('C'));
    repo.addEdge(makeEdge('A', 'B'));
    repo.addEdge(makeEdge('C', 'A'));

    const result = await breadthFirstSearch(repo, brandNodeId('A'), {
      direction: 'both',
    });
    const ids = result.visitedNodes.map(n => n.identity.id);
    expect(ids.sort()).toEqual(['A', 'B', 'C']);
  });

  it('should traverse incoming direction', async () => {
    const repo = new TestRepository();
    repo.addNode(makeNode('A'));
    repo.addNode(makeNode('B'));
    repo.addEdge(makeEdge('A', 'B'));

    const result = await breadthFirstSearch(repo, brandNodeId('B'), {
      direction: 'incoming',
    });
    expect(result.visitedNodes.map(n => n.identity.id)).toEqual(['B', 'A']);
  });

  it('should collect statistics', async () => {
    const { repo } = buildChain();
    const result = await breadthFirstSearch(repo, brandNodeId('A'));
    expect(result.statistics.visitedNodeCount).toBe(4);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });
});

// ─── DFS Tests ────────────────────────────────────────────────

describe('DFS Algorithm', () => {
  it('should traverse a chain iteratively', async () => {
    const { repo } = buildChain();
    const result = await depthFirstSearch(repo, brandNodeId('A'));
    expect(result.visitedNodes.map(n => n.identity.id)).toEqual(['A', 'B', 'C', 'D']);
    expect(result.strategyUsed).toBe(TraversalStrategy.DFS);
  });

  it('should traverse recursively', async () => {
    const { repo } = buildChain();
    const result = await depthFirstSearchRecursive(repo, brandNodeId('A'));
    expect(result.visitedNodes.map(n => n.identity.id)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('should respect maxDepth', async () => {
    const repo = buildTree();
    const result = await depthFirstSearch(repo, brandNodeId('A'), { maxDepth: 1 });
    const ids = result.visitedNodes.map(n => n.identity.id);
    expect(ids).toContain('A');
    expect(ids).not.toContain('D');
    expect(ids).not.toContain('E');
  });

  it('should return empty for non-existent start node', async () => {
    const repo = new TestRepository();
    const result = await depthFirstSearch(repo, brandNodeId('X'));
    expect(result.visitedNodes).toEqual([]);
  });

  it('should apply edge and node filters', async () => {
    const repo = new TestRepository();
    repo.addNode(makeNode('A', NodeType.Host));
    repo.addNode(makeNode('B', NodeType.Application));
    repo.addEdge(makeEdge('A', 'B', EdgeType.DEPENDS_ON));

    const result = await depthFirstSearch(repo, brandNodeId('A'), {
      nodeTypes: [NodeType.Host],
    });
    expect(result.visitedNodes).toHaveLength(1);
    expect(result.visitedNodes[0].identity.id).toBe('A');
  });

  it('should support cancellation', async () => {
    const repo = buildTree();
    const { token, cancel } = createCancellationToken();
    cancel('test');
    const result = await depthFirstSearch(repo, brandNodeId('A'), {
      cancellationToken: token,
    });
    expect(result.terminationReason).toBe(TerminationReason.Cancelled);
  });

  it('should handle disconnected graph', async () => {
    const repo = buildDisconnected();
    const result = await depthFirstSearch(repo, brandNodeId('A'));
    expect(result.visitedNodes.map(n => n.identity.id).sort()).toEqual(['A', 'B']);
  });
});

// ─── Bidirectional BFS Tests ──────────────────────────────────

describe('Bidirectional BFS', () => {
  it('should find shortest path in a chain', async () => {
    const { repo } = buildChain();
    const result = await bidirectionalBFS(repo, brandNodeId('A'), brandNodeId('D'));
    expect(result.found).toBe(true);
    expect(result.path).not.toBeNull();
    expect(result.path!.length).toBe(3);
  });

  it('should return same-node path for source == target', async () => {
    const repo = buildTree();
    const result = await bidirectionalBFS(repo, brandNodeId('A'), brandNodeId('A'));
    expect(result.found).toBe(true);
    expect(result.path!.length).toBe(0);
  });

  it('should return not-found for disconnected nodes', async () => {
    const repo = buildDisconnected();
    const result = await bidirectionalBFS(repo, brandNodeId('A'), brandNodeId('D'));
    expect(result.found).toBe(false);
  });

  it('should return not-found for non-existent nodes', async () => {
    const repo = new TestRepository();
    const result = await bidirectionalBFS(repo, brandNodeId('X'), brandNodeId('Y'));
    expect(result.found).toBe(false);
  });

  it('should find path in diamond', async () => {
    const repo = buildDiamond();
    const result = await bidirectionalBFS(repo, brandNodeId('A'), brandNodeId('D'));
    expect(result.found).toBe(true);
    expect(result.path!.length).toBe(2);
  });

  it('should respect edge filter', async () => {
    const repo = new TestRepository();
    repo.addNode(makeNode('A'));
    repo.addNode(makeNode('B'));
    repo.addEdge(makeEdge('A', 'B', EdgeType.HOSTS));

    const result = await bidirectionalBFS(repo, brandNodeId('A'), brandNodeId('B'), {
      edgeTypes: [EdgeType.DEPENDS_ON], // Only DEPENDS_ON, not HOSTS
    });
    expect(result.found).toBe(false);
  });
});

// ─── Shortest Path Tests ──────────────────────────────────────

describe('Shortest Path', () => {
  it('should find shortest path in a chain', async () => {
    const { repo } = buildChain();
    const result = await shortestPath(repo, brandNodeId('A'), brandNodeId('D'));
    expect(result.found).toBe(true);
    expect(result.path!.nodes.map(n => n.identity.id)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('should find shortest path in diamond (2 hops)', async () => {
    const repo = buildDiamond();
    const result = await shortestPath(repo, brandNodeId('A'), brandNodeId('D'));
    expect(result.found).toBe(true);
    expect(result.path!.length).toBe(2);
  });

  it('should return not-found for disconnected', async () => {
    const repo = buildDisconnected();
    const result = await shortestPath(repo, brandNodeId('A'), brandNodeId('E'));
    expect(result.found).toBe(false);
  });

  it('should return same-node for source == target', async () => {
    const repo = buildTree();
    const result = await shortestPath(repo, brandNodeId('A'), brandNodeId('A'));
    expect(result.found).toBe(true);
    expect(result.path!.length).toBe(0);
  });

  it('should respect maxDepth', async () => {
    const { repo } = buildChain();
    const result = await shortestPath(repo, brandNodeId('A'), brandNodeId('D'), {
      maxDepth: 2,
      bidirectional: false,
    });
    expect(result.found).toBe(false); // 3 hops needed but max 2
  });

  it('should support bidirectional=false (single BFS)', async () => {
    const { repo } = buildChain();
    const result = await shortestPath(repo, brandNodeId('A'), brandNodeId('D'), {
      bidirectional: false,
    });
    expect(result.found).toBe(true);
  });
});

// ─── Multi-Path Tests ─────────────────────────────────────────

describe('Multi-Path (K-Shortest)', () => {
  it('should find multiple paths in diamond', async () => {
    const repo = buildDiamond();
    const result = await findPaths(repo, brandNodeId('A'), brandNodeId('D'), { maxPaths: 2 });
    expect(result.found).toBe(true);
    expect(result.totalPaths).toBeGreaterThanOrEqual(2);
  });

  it('should find single path in chain', async () => {
    const { repo } = buildChain();
    const result = await findPaths(repo, brandNodeId('A'), brandNodeId('D'));
    expect(result.found).toBe(true);
    expect(result.totalPaths).toBe(1);
  });

  it('should return not-found for disconnected', async () => {
    const repo = buildDisconnected();
    const result = await findPaths(repo, brandNodeId('A'), brandNodeId('D'));
    expect(result.found).toBe(false);
  });

  it('should respect maxPaths limit', async () => {
    const repo = buildDiamond();
    const result = await findPaths(repo, brandNodeId('A'), brandNodeId('D'), { maxPaths: 1 });
    expect(result.totalPaths).toBe(1);
  });

  it('should return same-node path', async () => {
    const repo = buildTree();
    const result = await findPaths(repo, brandNodeId('A'), brandNodeId('A'));
    expect(result.found).toBe(true);
  });
});

// ─── Cycle Detection Tests ────────────────────────────────────

describe('Cycle Detection', () => {
  it('should detect a simple cycle', async () => {
    const repo = buildCycle();
    const cycles = await findCycles(repo);
    expect(cycles.length).toBeGreaterThan(0);
  });

  it('should detect no cycles in a tree (DAG)', async () => {
    const repo = buildTree();
    const has = await hasCycle(repo);
    expect(has).toBe(false);
  });

  it('should detect no cycles in a chain', async () => {
    const { repo } = buildChain();
    const has = await hasCycle(repo);
    expect(has).toBe(false);
  });

  it('hasCycle should return true for cyclic graph', async () => {
    const repo = buildCycle();
    const has = await hasCycle(repo);
    expect(has).toBe(true);
  });

  it('should respect maxCycles limit', async () => {
    const repo = new TestRepository();
    ['A', 'B', 'C', 'D', 'E'].forEach(id => repo.addNode(makeNode(id)));
    repo.addEdge(makeEdge('A', 'B'));
    repo.addEdge(makeEdge('B', 'A')); // cycle 1
    repo.addEdge(makeEdge('C', 'D'));
    repo.addEdge(makeEdge('D', 'C')); // cycle 2

    const cycles = await findCycles(repo, { maxCycles: 1 });
    expect(cycles.length).toBeLessThanOrEqual(1);
  });

  it('should respect minLength filter', async () => {
    const repo = buildCycle();
    const cycles = await findCycles(repo, { minLength: 10 });
    // Cycle of length 3 should not pass minLength 10
    expect(cycles.length).toBe(0);
  });
});

// ─── Connected Components Tests ───────────────────────────────

describe('Connected Components', () => {
  it('should find single component in connected graph', async () => {
    const repo = buildTree();
    const components = await connectedComponents(repo);
    expect(components.length).toBe(1);
    expect(components[0].size).toBe(5);
  });

  it('should find multiple components in disconnected graph', async () => {
    const repo = buildDisconnected();
    const components = await connectedComponents(repo);
    // A-B, C (isolated), D-E = 3 components (undirected analysis)
    expect(components.length).toBe(3);
  });

  it('should mark isolated nodes', async () => {
    const repo = new TestRepository();
    repo.addNode(makeNode('A'));
    repo.addNode(makeNode('B'));
    const components = await connectedComponents(repo);
    expect(components.every(c => c.isIsolated)).toBe(true);
  });

  it('should sort components by size descending', async () => {
    const repo = new TestRepository();
    repo.addNode(makeNode('A'));
    repo.addNode(makeNode('B'));
    repo.addNode(makeNode('C'));
    repo.addNode(makeNode('D'));
    repo.addEdge(makeEdge('A', 'B'));

    const components = await connectedComponents(repo);
    expect(components[0].size).toBeGreaterThanOrEqual(components[1]?.size ?? 0);
  });
});

// ─── Reachability Tests ───────────────────────────────────────

describe('Reachability', () => {
  it('should find all reachable nodes', async () => {
    const { repo } = buildChain();
    const result = await reachableNodes(repo, brandNodeId('A'));
    expect(result.visitedNodes.map(n => n.identity.id)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('should exclude start node when includeStart=false', async () => {
    const { repo } = buildChain();
    const result = await reachableNodes(repo, brandNodeId('A'), { includeStart: false });
    const ids = result.visitedNodes.map(n => n.identity.id);
    expect(ids).not.toContain('A');
  });

  it('should find partial reachability in disconnected graph', async () => {
    const repo = buildDisconnected();
    const result = await reachableNodes(repo, brandNodeId('A'));
    expect(result.visitedNodes.map(n => n.identity.id).sort()).toEqual(['A', 'B']);
  });
});

// ─── Path Existence Tests ─────────────────────────────────────

describe('Path Exists', () => {
  it('should return true for connected nodes', async () => {
    const { repo } = buildChain();
    expect(await pathExists(repo, brandNodeId('A'), brandNodeId('D'))).toBe(true);
  });

  it('should return false for disconnected nodes', async () => {
    const repo = buildDisconnected();
    expect(await pathExists(repo, brandNodeId('A'), brandNodeId('D'))).toBe(false);
  });

  it('should return true for same node', async () => {
    const repo = buildTree();
    expect(await pathExists(repo, brandNodeId('A'), brandNodeId('A'))).toBe(true);
  });

  it('should respect maxDepth', async () => {
    const { repo } = buildChain();
    expect(await pathExists(repo, brandNodeId('A'), brandNodeId('D'), 2)).toBe(false);
    expect(await pathExists(repo, brandNodeId('A'), brandNodeId('D'), 3)).toBe(true);
  });
});

// ─── Neighborhood Tests ───────────────────────────────────────

describe('Neighborhood Queries', () => {
  it('should get direct neighbors', async () => {
    const repo = buildTree();
    const result = await neighbors(repo, brandNodeId('A'));
    expect(result.map(n => n.identity.id).sort()).toEqual(['B', 'C']);
  });

  it('should get outgoing neighbors', async () => {
    const repo = new TestRepository();
    repo.addNode(makeNode('A'));
    repo.addNode(makeNode('B'));
    repo.addNode(makeNode('C'));
    repo.addEdge(makeEdge('A', 'B'));
    repo.addEdge(makeEdge('C', 'A'));

    const result = await outgoing(repo, brandNodeId('A'));
    expect(result.map(n => n.identity.id)).toEqual(['B']);
  });

  it('should get incoming neighbors', async () => {
    const repo = new TestRepository();
    repo.addNode(makeNode('A'));
    repo.addNode(makeNode('B'));
    repo.addNode(makeNode('C'));
    repo.addEdge(makeEdge('A', 'B'));
    repo.addEdge(makeEdge('C', 'A'));

    const result = await incoming(repo, brandNodeId('A'));
    expect(result.map(n => n.identity.id)).toEqual(['C']);
  });

  it('should get multi-hop neighbors', async () => {
    const repo = buildTree();
    const result = await neighbors(repo, brandNodeId('A'), { depth: 2 });
    const ids = result.map(n => n.identity.id).sort();
    expect(ids).toEqual(['B', 'C', 'D', 'E']);
  });

  it('should filter neighbors by edge type', async () => {
    const repo = new TestRepository();
    repo.addNode(makeNode('A'));
    repo.addNode(makeNode('B'));
    repo.addNode(makeNode('C'));
    repo.addEdge(makeEdge('A', 'B', EdgeType.DEPENDS_ON));
    repo.addEdge(makeEdge('A', 'C', EdgeType.HOSTS));

    const result = await neighbors(repo, brandNodeId('A'), {
      edgeTypes: [EdgeType.HOSTS],
    });
    expect(result.map(n => n.identity.id)).toEqual(['C']);
  });

  it('should filter neighbors by node type', async () => {
    const repo = new TestRepository();
    repo.addNode(makeNode('A', NodeType.Host));
    repo.addNode(makeNode('B', NodeType.Application));
    repo.addNode(makeNode('C', NodeType.Host));
    repo.addEdge(makeEdge('A', 'B'));
    repo.addEdge(makeEdge('A', 'C'));

    const result = await neighbors(repo, brandNodeId('A'), {
      nodeTypes: [NodeType.Host],
    });
    expect(result.map(n => n.identity.id)).toEqual(['C']);
  });

  it('should get neighbor edges', async () => {
    const repo = buildTree();
    const edges = await neighborEdges(repo, brandNodeId('A'));
    expect(edges.length).toBe(2);
  });
});

// ─── Subgraph Extraction Tests ────────────────────────────────

describe('Subgraph Extraction', () => {
  it('should extract subgraph by depth', async () => {
    const repo = buildTree();
    const subgraph = await extractSubgraph(repo, brandNodeId('A'), { maxDepth: 1 });
    expect(subgraph.nodes.length).toBe(3); // A, B, C
  });

  it('should extract subgraph by node type', async () => {
    const repo = new TestRepository();
    repo.addNode(makeNode('A', NodeType.Host));
    repo.addNode(makeNode('B', NodeType.Application));
    repo.addNode(makeNode('C', NodeType.Host));
    repo.addEdge(makeEdge('A', 'B'));
    repo.addEdge(makeEdge('C', 'B'));

    const subgraph = await extractSubgraphByType(repo, [NodeType.Host]);
    expect(subgraph.nodes.length).toBe(2);
  });

  it('should extract subgraph by predicate', async () => {
    const repo = new TestRepository();
    repo.addNode(makeNode('A', NodeType.Host));
    repo.addNode(makeNode('B', NodeType.Application));
    repo.addNode(makeNode('C', NodeType.Host));
    repo.addEdge(makeEdge('A', 'C'));

    const subgraph = await extractSubgraphByPredicate(
      repo,
      n => n.identity.type === NodeType.Host,
    );
    expect(subgraph.nodes.length).toBe(2);
  });

  it('should return empty subgraph for non-existent start', async () => {
    const repo = new TestRepository();
    const subgraph = await extractSubgraph(repo, brandNodeId('X'));
    expect(subgraph.nodes.length).toBe(0);
  });

  it('should respect maxNodes limit', async () => {
    const repo = buildTree();
    const subgraph = await extractSubgraph(repo, brandNodeId('A'), { maxNodes: 2 });
    expect(subgraph.nodes.length).toBeLessThanOrEqual(2);
  });

  it('should filter by edge type in subgraph', async () => {
    const repo = new TestRepository();
    repo.addNode(makeNode('A'));
    repo.addNode(makeNode('B'));
    repo.addNode(makeNode('C'));
    repo.addEdge(makeEdge('A', 'B', EdgeType.DEPENDS_ON));
    repo.addEdge(makeEdge('A', 'C', EdgeType.HOSTS));

    const subgraph = await extractSubgraph(repo, brandNodeId('A'), {
      edgeTypes: [EdgeType.DEPENDS_ON],
      maxDepth: 1,
    });
    const ids = subgraph.nodes.map(n => n.identity.id);
    expect(ids).toContain('A');
    expect(ids).toContain('B');
    expect(ids).not.toContain('C');
  });
});

// ─── Events Tests ─────────────────────────────────────────────

describe('Traversal Events', () => {
  it('should create TraversalStartedEvent', () => {
    const event = createTraversalStartedEvent(TraversalStrategy.BFS, 'A', {
      maxDepth: 5,
      direction: 'outgoing',
    });
    expect(event.type).toBe('traversal.started');
    expect(event.data.strategy).toBe(TraversalStrategy.BFS);
    expect(event.data.startNodeId).toBeDefined();
  });

  it('should create TraversalCompletedEvent', () => {
    const event = createTraversalCompletedEvent(TraversalStrategy.BFS, 'A', {
      visitedNodeCount: 10,
      visitedEdgeCount: 20,
      maxDepthReached: 3,
      duration: 50,
      terminationReason: TerminationReason.Completed,
    });
    expect(event.type).toBe('traversal.completed');
    expect(event.data.visitedNodeCount).toBe(10);
  });

  it('should create TraversalCancelledEvent', () => {
    const event = createTraversalCancelledEvent(TraversalStrategy.DFS, 'A', 'timeout', {
      visitedNodeCount: 5,
      duration: 100,
    });
    expect(event.type).toBe('traversal.cancelled');
    expect(event.data.reason).toBe('timeout');
  });

  it('should create PathFoundEvent', () => {
    const event = createPathFoundEvent('A', 'D', {
      pathLength: 3,
      totalStrength: 2.5,
      strategy: TraversalStrategy.BFS,
    });
    expect(event.type).toBe('traversal.path_found');
    expect(event.data.pathLength).toBe(3);
  });

  it('should create CycleDetectedEvent', () => {
    const event = createCycleDetectedEvent(3, ['A', 'B', 'C']);
    expect(event.type).toBe('traversal.cycle_detected');
    expect(event.data.cycleLength).toBe(3);
  });
});

// ─── Statistics Tests ─────────────────────────────────────────

describe('Traversal Statistics', () => {
  it('should collect node visits', () => {
    const collector = new TraversalStatisticsCollector();
    collector.recordNodeVisit(0);
    collector.recordNodeVisit(1);
    collector.recordNodeVisit(3);
    const stats = collector.snapshot();
    expect(stats.visitedNodeCount).toBe(3);
    expect(stats.maxDepth).toBe(3);
  });

  it('should collect edge traversals', () => {
    const collector = new TraversalStatisticsCollector();
    collector.recordEdgeTraversal();
    collector.recordEdgeTraversal();
    const stats = collector.snapshot();
    expect(stats.visitedEdgeCount).toBe(2);
  });

  it('should track paths and cycles', () => {
    const collector = new TraversalStatisticsCollector();
    collector.recordPath();
    collector.recordPath();
    collector.recordCycle();
    const stats = collector.snapshot();
    expect(stats.pathCount).toBe(2);
    expect(stats.cycleCount).toBe(1);
  });

  it('should reset correctly', () => {
    const collector = new TraversalStatisticsCollector();
    collector.recordNodeVisit(1);
    collector.reset();
    const stats = collector.snapshot();
    expect(stats.visitedNodeCount).toBe(0);
  });
});

describe('VisitedTracker', () => {
  it('should track visited nodes', () => {
    const tracker = new VisitedTracker();
    tracker.visit(brandNodeId('A'));
    expect(tracker.isVisited(brandNodeId('A'))).toBe(true);
    expect(tracker.isVisited(brandNodeId('B'))).toBe(false);
    expect(tracker.size).toBe(1);
  });

  it('should reset', () => {
    const tracker = new VisitedTracker();
    tracker.visit(brandNodeId('A'));
    tracker.reset();
    expect(tracker.size).toBe(0);
  });
});

describe('PathPool', () => {
  it('should acquire and release paths', () => {
    const pool = new PathPool();
    const path = pool.acquire();
    expect(Array.isArray(path)).toBe(true);
    pool.release(path);
    expect(pool.stats.poolSize).toBe(1);
  });

  it('should reuse paths', () => {
    const pool = new PathPool();
    const path1 = pool.acquire();
    pool.release(path1);
    const path2 = pool.acquire();
    expect(path2).toBe(path1);
    expect(pool.stats.reused).toBe(1);
  });
});

// ─── Type Factories Tests ─────────────────────────────────────

describe('Type Factory Functions', () => {
  it('should create empty result', () => {
    const result = emptyTraversalResult();
    expect(result.visitedNodes).toEqual([]);
    expect(result.terminationReason).toBe(TerminationReason.Exhausted);
  });

  it('should create empty statistics', () => {
    const stats = emptyTraversalStatistics();
    expect(stats.visitedNodeCount).toBe(0);
    expect(stats.avgBranchingFactor).toBe(0);
  });

  it('should create statistics from data', () => {
    const stats = createTraversalStatistics({
      visitedNodeCount: 100,
      visitedEdgeCount: 200,
      maxDepth: 5,
      duration: 50,
    });
    expect(stats.visitedNodeCount).toBe(100);
    expect(stats.maxDepth).toBe(5);
  });

  it('should create not-found path result', () => {
    const result = notFoundPathResult(10);
    expect(result.found).toBe(false);
    expect(result.path).toBeNull();
  });

  it('should create cancellation token', () => {
    const { token, cancel } = createCancellationToken();
    expect(token.isCancelled).toBe(false);
    cancel('test');
    expect(token.isCancelled).toBe(true);
    expect(token.reason).toBe('test');
  });
});

// ─── Engine Integration Tests ─────────────────────────────────

describe('GraphTraversalEngineImpl', () => {
  let repo: TestRepository;
  let engine: GraphTraversalEngineImpl;

  beforeEach(() => {
    repo = buildTree();
    engine = new GraphTraversalEngineImpl(repo);
  });

  it('should implement traverse (contract)', async () => {
    const nodes = await engine.traverse({
      id: brandNodeId('q1'),
      startNodeId: brandNodeId('A'),
      direction: 'outgoing',
      edgeTypes: [],
      nodeTypes: [],
      maxDepth: 10,
      createdAt: new Date().toISOString(),
    });
    expect(nodes.length).toBe(5);
  });

  it('should implement findPath (contract)', async () => {
    const nodes = await engine.findPath(brandNodeId('A'), brandNodeId('D'));
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes[nodes.length - 1].identity.id).toBe('D');
  });

  it('should implement findNeighbors (contract)', async () => {
    const nodes = await engine.findNeighbors(brandNodeId('A'), 1);
    expect(nodes.length).toBe(2);
  });

  it('should implement pathExists (contract)', async () => {
    expect(await engine.pathExists(brandNodeId('A'), brandNodeId('D'))).toBe(true);
    expect(await engine.pathExists(brandNodeId('D'), brandNodeId('A'))).toBe(false); // directed
  });

  it('should implement detectCycles (contract)', async () => {
    const cycles = await engine.detectCycles();
    expect(cycles).toEqual([]); // Tree has no cycles
  });

  it('should support BFS via engine', async () => {
    const result = await engine.bfs(brandNodeId('A'));
    expect(result.visitedNodes.length).toBe(5);
  });

  it('should support DFS via engine', async () => {
    const result = await engine.dfs(brandNodeId('A'));
    expect(result.visitedNodes.length).toBe(5);
  });

  it('should support recursive DFS via engine', async () => {
    const result = await engine.dfs(brandNodeId('A'), { recursive: true });
    expect(result.visitedNodes.length).toBe(5);
  });

  it('should support bidirectional via engine', async () => {
    const result = await engine.bidirectional(brandNodeId('A'), brandNodeId('D'));
    expect(result.found).toBe(true);
  });

  it('should support shortestPath via engine', async () => {
    const result = await engine.shortestPath(brandNodeId('A'), brandNodeId('D'));
    expect(result.found).toBe(true);
  });

  it('should support findPaths via engine', async () => {
    const diamondRepo = buildDiamond();
    const diamondEngine = new GraphTraversalEngineImpl(diamondRepo);
    const result = await diamondEngine.findPaths(brandNodeId('A'), brandNodeId('D'), { maxPaths: 2 });
    expect(result.found).toBe(true);
  });

  it('should support findCycles via engine', async () => {
    const cycleRepo = buildCycle();
    const cycleEngine = new GraphTraversalEngineImpl(cycleRepo);
    const cycles = await cycleEngine.findCycles();
    expect(cycles.length).toBeGreaterThan(0);
  });

  it('should support hasCycle via engine', async () => {
    expect(await engine.hasCycle()).toBe(false);
    const cycleRepo = buildCycle();
    const cycleEngine = new GraphTraversalEngineImpl(cycleRepo);
    expect(await cycleEngine.hasCycle()).toBe(true);
  });

  it('should support connected components via engine', async () => {
    const components = await engine.getConnectedComponents();
    expect(components.length).toBe(1);
  });

  it('should support reachability via engine', async () => {
    const result = await engine.reachableNodes(brandNodeId('A'));
    expect(result.visitedNodes.length).toBe(5);
  });

  it('should support neighbors via engine', async () => {
    const nodes = await engine.getNeighbors(brandNodeId('A'));
    expect(nodes.length).toBe(2);
  });

  it('should support outgoing via engine', async () => {
    const nodes = await engine.getOutgoing(brandNodeId('A'));
    expect(nodes.length).toBe(2);
  });

  it('should support incoming via engine', async () => {
    const nodes = await engine.getIncoming(brandNodeId('D'));
    expect(nodes.length).toBe(1);
  });

  it('should support neighborEdges via engine', async () => {
    const edges = await engine.getNeighborEdges(brandNodeId('A'));
    expect(edges.length).toBe(2);
  });

  it('should support subgraph extraction via engine', async () => {
    const sg = await engine.extractSubgraph(brandNodeId('A'), { maxDepth: 1 });
    expect(sg.nodes.length).toBe(3);
  });

  it('should support subgraph by type via engine', async () => {
    const sg = await engine.extractSubgraphByType([NodeType.Host]);
    expect(sg.nodes.length).toBe(5);
  });

  it('should support subgraph by predicate via engine', async () => {
    const sg = await engine.extractSubgraphByPredicate(
      n => n.identity.type === NodeType.Host,
    );
    expect(sg.nodes.length).toBe(5);
  });

  it('should support traverseWithStrategy (AUTO)', async () => {
    const result = await engine.traverseWithStrategy(brandNodeId('A'), TraversalStrategy.AUTO);
    expect(result.visitedNodes.length).toBe(5);
  });

  it('should support traverseWithStrategy (BFS)', async () => {
    const result = await engine.traverseWithStrategy(brandNodeId('A'), TraversalStrategy.BFS);
    expect(result.strategyUsed).toBe(TraversalStrategy.BFS);
  });

  it('should support traverseWithStrategy (DFS)', async () => {
    const result = await engine.traverseWithStrategy(brandNodeId('A'), TraversalStrategy.DFS);
    expect(result.strategyUsed).toBe(TraversalStrategy.DFS);
  });

  it('should expose repository and config', () => {
    expect(engine.repository).toBe(repo);
    expect(engine.config.defaultMaxDepth).toBe(10);
  });

  it('should publish events when publisher is provided', async () => {
    const publishedEvents: any[] = [];
    const mockPublisher = {
      publish: async (event: any) => { publishedEvents.push(event); },
      publishAll: async (events: any[]) => { publishedEvents.push(...events); },
    };
    const eng = new GraphTraversalEngineImpl(repo, mockPublisher);
    await eng.bfs(brandNodeId('A'));
    expect(publishedEvents.length).toBeGreaterThanOrEqual(2); // started + completed
    expect(publishedEvents[0].type).toBe('traversal.started');
    expect(publishedEvents[1].type).toBe('traversal.completed');
  });

  it('should publish path found event', async () => {
    const publishedEvents: any[] = [];
    const mockPublisher = {
      publish: async (event: any) => { publishedEvents.push(event); },
      publishAll: async (events: any[]) => { publishedEvents.push(...events); },
    };
    const eng = new GraphTraversalEngineImpl(repo, mockPublisher);
    await eng.shortestPath(brandNodeId('A'), brandNodeId('D'));
    const types = publishedEvents.map(e => e.type);
    expect(types).toContain('traversal.path_found');
  });

  it('should publish cycle detected event', async () => {
    const cycleRepo = buildCycle();
    const publishedEvents: any[] = [];
    const mockPublisher = {
      publish: async (event: any) => { publishedEvents.push(event); },
      publishAll: async (events: any[]) => { publishedEvents.push(...events); },
    };
    const eng = new GraphTraversalEngineImpl(cycleRepo, mockPublisher);
    await eng.findCycles();
    const types = publishedEvents.map(e => e.type);
    expect(types).toContain('traversal.cycle_detected');
  });

  it('should handle publisher failure gracefully', async () => {
    const badPublisher = {
      publish: async () => { throw new Error('publisher down'); },
      publishAll: async () => { throw new Error('publisher down'); },
    };
    const eng = new GraphTraversalEngineImpl(repo, badPublisher);
    // Should not throw
    const result = await eng.bfs(brandNodeId('A'));
    expect(result.visitedNodes.length).toBe(5);
  });
});

// ─── Edge Cases ───────────────────────────────────────────────

describe('Edge Cases', () => {
  it('should handle empty graph', async () => {
    const repo = new TestRepository();
    const engine = new GraphTraversalEngineImpl(repo);
    const result = await engine.bfs(brandNodeId('X'));
    expect(result.visitedNodes).toEqual([]);
  });

  it('should handle single node', async () => {
    const repo = new TestRepository();
    repo.addNode(makeNode('A'));
    const engine = new GraphTraversalEngineImpl(repo);
    const result = await engine.bfs(brandNodeId('A'));
    expect(result.visitedNodes.length).toBe(1);
  });

  it('should handle self-referencing prevention at edge creation', async () => {
    // Our edge factory prevents self-loops, so we test the traversal
    // on a graph that cannot have self-loops
    const repo = new TestRepository();
    repo.addNode(makeNode('A'));
    repo.addNode(makeNode('B'));
    repo.addEdge(makeEdge('A', 'B'));
    repo.addEdge(makeEdge('B', 'A'));
    const engine = new GraphTraversalEngineImpl(repo);
    const hasC = await engine.hasCycle();
    expect(hasC).toBe(true);
  });

  it('should handle dense graph', async () => {
    const repo = new TestRepository();
    const nodeIds = ['A', 'B', 'C', 'D', 'E'];
    nodeIds.forEach(id => repo.addNode(makeNode(id)));
    // Fully connected (except self-loops)
    for (const src of nodeIds) {
      for (const tgt of nodeIds) {
        if (src !== tgt) repo.addEdge(makeEdge(src, tgt, EdgeType.RELATED_TO, `e_${src}_${tgt}`));
      }
    }
    const engine = new GraphTraversalEngineImpl(repo);
    const result = await engine.bfs(brandNodeId('A'));
    expect(result.visitedNodes.length).toBe(5);
  });

  it('should handle sparse graph', async () => {
    const repo = new TestRepository();
    const nodeIds = Array.from({ length: 10 }, (_, i) => `N${i}`);
    nodeIds.forEach(id => repo.addNode(makeNode(id)));
    // Single chain
    for (let i = 0; i < nodeIds.length - 1; i++) {
      repo.addEdge(makeEdge(nodeIds[i], nodeIds[i + 1]));
    }
    const engine = new GraphTraversalEngineImpl(repo);
    const result = await engine.bfs(brandNodeId('N0'));
    expect(result.visitedNodes.length).toBe(10);
  });

  it('should handle DAG (directed acyclic graph)', async () => {
    const repo = new TestRepository();
    ['A', 'B', 'C', 'D', 'E'].forEach(id => repo.addNode(makeNode(id)));
    repo.addEdge(makeEdge('A', 'B'));
    repo.addEdge(makeEdge('A', 'C'));
    repo.addEdge(makeEdge('B', 'D'));
    repo.addEdge(makeEdge('C', 'D'));
    repo.addEdge(makeEdge('D', 'E'));
    const engine = new GraphTraversalEngineImpl(repo);
    expect(await engine.hasCycle()).toBe(false);
    const path = await engine.shortestPath(brandNodeId('A'), brandNodeId('E'));
    expect(path.found).toBe(true);
    expect(path.path!.length).toBe(3);
  });

  it('should handle custom predicates in neighbors', async () => {
    const repo = new TestRepository();
    repo.addNode(makeNode('A'));
    repo.addNode(makeNode('B'));
    repo.addNode(makeNode('C'));
    repo.addEdge(makeEdge('A', 'B', EdgeType.DEPENDS_ON));
    repo.addEdge(makeEdge('A', 'C', EdgeType.HOSTS));

    const result = await neighbors(repo, brandNodeId('A'), {
      edgeFilter: e => e.relationship.strength > 0.5,
    });
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle custom predicates in subgraph', async () => {
    const repo = new TestRepository();
    repo.addNode(makeNode('A'));
    repo.addNode(makeNode('B'));
    repo.addNode(makeNode('C'));
    repo.addEdge(makeEdge('A', 'B'));
    repo.addEdge(makeEdge('A', 'C'));

    const sg = await extractSubgraph(repo, brandNodeId('A'), {
      nodeFilter: n => n.identity.id !== 'C',
      maxDepth: 1,
    });
    expect(sg.nodes.map(n => n.identity.id)).not.toContain('C');
  });

  it('should handle timeout', async () => {
    const repo = new TestRepository();
    // Small timeout on a non-trivial graph
    ['A', 'B', 'C'].forEach(id => repo.addNode(makeNode(id)));
    repo.addEdge(makeEdge('A', 'B'));
    repo.addEdge(makeEdge('B', 'C'));

    const result = await breadthFirstSearch(repo, brandNodeId('A'), { timeout: 1 });
    // With 1ms timeout, might complete or timeout depending on execution speed
    expect([TerminationReason.Completed, TerminationReason.Timeout]).toContain(result.terminationReason);
  });

  it('should handle extractSubgraphByType with edge type filter', async () => {
    const repo = new TestRepository();
    repo.addNode(makeNode('A', NodeType.Host));
    repo.addNode(makeNode('B', NodeType.Host));
    repo.addEdge(makeEdge('A', 'B', EdgeType.DEPENDS_ON));
    repo.addEdge(makeEdge('B', 'A', EdgeType.HOSTS));

    const sg = await extractSubgraphByType(repo, [NodeType.Host], [EdgeType.DEPENDS_ON]);
    expect(sg.edges.length).toBe(1);
  });

  it('should handle extractSubgraphByPredicate with edge predicate', async () => {
    const repo = new TestRepository();
    repo.addNode(makeNode('A', NodeType.Host));
    repo.addNode(makeNode('B', NodeType.Host));
    repo.addEdge(makeEdge('A', 'B', EdgeType.DEPENDS_ON));
    repo.addEdge(makeEdge('B', 'A', EdgeType.HOSTS));

    const sg = await extractSubgraphByPredicate(
      repo,
      n => n.identity.type === NodeType.Host,
      e => e.relationship.edgeType === EdgeType.DEPENDS_ON,
    );
    expect(sg.edges.length).toBe(1);
  });
});

// ─── Performance Tests ────────────────────────────────────────

describe('Performance', () => {
  it('should handle 100-node graph efficiently', async () => {
    const repo = new TestRepository();
    const nodeCount = 100;
    for (let i = 0; i < nodeCount; i++) {
      repo.addNode(makeNode(`n${i}`));
    }
    // Chain
    for (let i = 0; i < nodeCount - 1; i++) {
      repo.addEdge(makeEdge(`n${i}`, `n${i + 1}`));
    }
    const engine = new GraphTraversalEngineImpl(repo);
    const start = Date.now();
    const result = await engine.bfs(brandNodeId('n0'), { maxDepth: 100 });
    const duration = Date.now() - start;
    expect(result.visitedNodes.length).toBe(nodeCount);
    expect(duration).toBeLessThan(5000);
  });

  it('should handle path search in 100-node chain', async () => {
    const repo = new TestRepository();
    const nodeCount = 100;
    for (let i = 0; i < nodeCount; i++) {
      repo.addNode(makeNode(`n${i}`));
    }
    for (let i = 0; i < nodeCount - 1; i++) {
      repo.addEdge(makeEdge(`n${i}`, `n${i + 1}`));
    }
    const engine = new GraphTraversalEngineImpl(repo);
    const result = await engine.shortestPath(brandNodeId('n0'), brandNodeId('n99'), { maxDepth: 100 });
    expect(result.found).toBe(true);
    expect(result.path!.length).toBe(99);
  });

  it('should handle cycle detection in 50-node graph', async () => {
    const repo = new TestRepository();
    for (let i = 0; i < 50; i++) {
      repo.addNode(makeNode(`N${i}`));
    }
    for (let i = 0; i < 49; i++) {
      repo.addEdge(makeEdge(`N${i}`, `N${i + 1}`));
    }
    // No cycle
    const engine = new GraphTraversalEngineImpl(repo);
    expect(await engine.hasCycle()).toBe(false);
  });

  it('should handle connected components in 100-node graph', async () => {
    const repo = new TestRepository();
    for (let i = 0; i < 100; i++) {
      repo.addNode(makeNode(`N${i}`));
    }
    // Two components
    for (let i = 0; i < 49; i++) {
      repo.addEdge(makeEdge(`N${i}`, `N${i + 1}`));
    }
    for (let i = 50; i < 99; i++) {
      repo.addEdge(makeEdge(`N${i}`, `N${i + 1}`));
    }
    const engine = new GraphTraversalEngineImpl(repo);
    const components = await engine.getConnectedComponents();
    expect(components.length).toBe(2);
  });
});
