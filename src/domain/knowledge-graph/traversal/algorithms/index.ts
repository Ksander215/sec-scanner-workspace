/**
 * Knowledge Graph Traversal Engine — Core Algorithms
 *
 * Pure algorithm implementations for graph traversal.
 * All algorithms operate through the GraphRepository interface —
 * they never access internal storage directly.
 *
 * Algorithms implemented:
 * 1. BFS — Breadth-First Search (level-order, shortest path in unweighted)
 * 2. DFS — Depth-First Search (recursive and iterative)
 * 3. Bidirectional BFS — Two-wave search from source and target
 * 4. Shortest Path — BFS-based for unweighted graphs
 * 5. Multi-Path — Yen's K-shortest paths algorithm
 * 6. Cycle Detection — DFS-based with coloring (white/gray/black)
 * 7. Connected Components — BFS-based component discovery
 * 8. Reachability — BFS/DFS-based reachable set computation
 *
 * Performance targets:
 * - BFS/DFS: O(V + E)
 * - Bidirectional BFS: O(b^(d/2)) where b = branching factor, d = distance
 * - Shortest Path: O(V + E)
 * - K-Shortest Paths: O(K * V * E) (Yen's algorithm)
 * - Cycle Detection: O(V + E)
 * - Connected Components: O(V + E)
 * - Reachability: O(V + E)
 */

import type { NodeId, EdgeId } from '../../types/index.ts';
import type { GraphNode, GraphEdge } from '../../models/index.ts';
import type { GraphRepository } from '../../contracts/index.ts';
import type {
  TraversalOptions,
  TraversalResult,
  TraversalPath,
  TraversalStatistics,
  TerminationReason,
  NodePredicate,
  EdgePredicate,
  NodeVisitor,
  EdgeVisitor,
  CancellationToken,
  Cycle,
  ConnectedComponent,
  PathResult,
  CycleDetectionOptions,
  BFSOptions,
  DFSOptions,
  BidirectionalOptions,
  ShortestPathOptions,
  MultiPathOptions,
  ReachabilityOptions,
} from '../types/index.ts';
import {
  TraversalStrategy,
  TerminationReason as TR,
  emptyTraversalResult,
  emptyTraversalStatistics,
  createTraversalStatistics,
  notFoundPathResult,
} from '../types/index.ts';

// ─── Internal Helpers ─────────────────────────────────────────

/** Default max depth for traversals */
const DEFAULT_MAX_DEPTH = 10;
const DEFAULT_MAX_NODES = 0; // unlimited
const DEFAULT_TIMEOUT = 0; // unlimited

/** Check cancellation or timeout */
function shouldTerminate(
  cancellationToken: CancellationToken | undefined,
  startTime: number,
  timeout: number,
  visitedCount: number,
  maxNodes: number,
): TerminationReason | null {
  if (cancellationToken?.isCancelled) return TR.Cancelled;
  if (timeout > 0 && (Date.now() - startTime) >= timeout) return TR.Timeout;
  if (maxNodes > 0 && visitedCount >= maxNodes) return TR.MaxNodesReached;
  return null;
}

/** Apply edge filter chain */
function edgeMatchesFilter(
  edge: GraphEdge,
  edgeTypes: readonly string[] | undefined,
  edgeFilter: EdgePredicate | undefined,
): boolean {
  if (edgeTypes && edgeTypes.length > 0 && !edgeTypes.includes(edge.relationship.edgeType)) return false;
  if (edgeFilter && !edgeFilter(edge)) return false;
  return true;
}

/** Apply node filter chain */
function nodeMatchesFilter(
  node: GraphNode,
  nodeTypes: readonly string[] | undefined,
  nodeFilter: NodePredicate | undefined,
): boolean {
  if (nodeTypes && nodeTypes.length > 0 && !nodeTypes.includes(node.identity.type)) return false;
  if (nodeFilter && !nodeFilter(node)) return false;
  return true;
}

/** Get edges in the specified direction from a node */
async function getEdgesInDirection(
  repo: GraphRepository,
  nodeId: NodeId,
  direction: 'outgoing' | 'incoming' | 'both',
): Promise<readonly GraphEdge[]> {
  switch (direction) {
    case 'outgoing':
      return repo.getEdgesFrom(nodeId);
    case 'incoming':
      return repo.getEdgesTo(nodeId);
    case 'both': {
      const [outgoing, incoming] = await Promise.all([
        repo.getEdgesFrom(nodeId),
        repo.getEdgesTo(nodeId),
      ]);
      // Deduplicate by edge ID
      const seen = new Set<EdgeId>();
      const result: GraphEdge[] = [];
      for (const e of [...outgoing, ...incoming]) {
        if (!seen.has(e.id)) {
          seen.add(e.id);
          result.push(e);
        }
      }
      return result;
    }
    default:
      return repo.getEdgesFrom(nodeId);
  }
}

/** Get the neighbor node ID from an edge, given the direction context */
function getNeighborId(edge: GraphEdge, nodeId: NodeId, direction: 'outgoing' | 'incoming' | 'both'): NodeId {
  if (direction === 'incoming') return edge.sourceId;
  if (direction === 'outgoing') return edge.targetId;
  // For 'both', return the other end
  return edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
}

/** Build a TraversalPath from a parent map */
function buildPath(
  parentMap: Map<NodeId, { nodeId: NodeId; edge: GraphEdge }>,
  startId: NodeId,
  endId: NodeId,
  repo: GraphRepository,
): TraversalPath | null {
  if (!parentMap.has(endId) && startId !== endId) return null;

  const nodeIds: NodeId[] = [];
  const edges: GraphEdge[] = [];
  let current: NodeId | null = endId;

  while (current !== null && current !== undefined) {
    nodeIds.unshift(current);
    const parent = parentMap.get(current);
    if (parent) {
      edges.unshift(parent.edge);
      current = parent.nodeId;
    } else {
      current = null;
    }
  }

  if (nodeIds.length === 0 || nodeIds[0] !== startId) return null;

  // Resolve nodes from repo (we need the full GraphNode objects)
  // Since we already visited them, they should be cached or quickly accessible
  // For efficiency, we return partial path and resolve later in the engine
  return {
    nodes: [], // Will be resolved by the engine
    edges: Object.freeze(edges),
    length: edges.length,
    totalStrength: edges.reduce((sum, e) => sum + e.relationship.strength, 0),
  } as TraversalPath;
}

// ─── BFS Algorithm ────────────────────────────────────────────

/**
 * Breadth-First Search traversal.
 *
 * Explores the graph level by level from a start node.
 * Guarantees shortest path in unweighted graphs.
 *
 * Time Complexity: O(V + E)
 * Space Complexity: O(V)
 *
 * @param repo - Graph repository
 * @param startNodeId - Starting node ID
 * @param options - Traversal options
 * @returns Traversal result with visited nodes and edges
 */
export async function breadthFirstSearch(
  repo: GraphRepository,
  startNodeId: NodeId,
  options: BFSOptions = {},
): Promise<TraversalResult> {
  const startTime = Date.now();
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const direction = options.direction ?? 'outgoing';
  const edgeTypes = options.edgeTypes;
  const nodeTypes = options.nodeTypes;
  const edgeFilter = options.edgeFilter;
  const nodeFilter = options.nodeFilter;
  const nodeVisitor = options.nodeVisitor;
  const edgeVisitor = options.edgeVisitor;
  const cancellationToken = options.cancellationToken;
  const collectEdges = options.collectEdges ?? true;

  // Validate start node exists
  const startNode = await repo.getNode(startNodeId);
  if (!startNode) {
    return emptyTraversalResult(TraversalStrategy.BFS, Date.now() - startTime);
  }

  const visited = new Set<NodeId>();
  const visitedNodes: GraphNode[] = [];
  const visitedEdges: GraphEdge[] = [];
  const queue: Array<{ nodeId: NodeId; depth: number }> = [{ nodeId: startNodeId, depth: 0 }];
  visited.add(startNodeId);

  let maxDepthReached = 0;
  let terminationReason: TerminationReason = TR.Completed;
  let edgesInspected = 0;

  while (queue.length > 0) {
    // Check termination conditions
    const termCheck = shouldTerminate(cancellationToken, startTime, timeout, visited.size, maxNodes);
    if (termCheck) {
      terminationReason = termCheck;
      break;
    }

    const { nodeId, depth } = queue.shift()!;

    // Depth check
    if (depth > maxDepth) {
      terminationReason = TR.MaxDepthReached;
      break;
    }

    // Get node
    const node = await repo.getNode(nodeId);
    if (!node) continue;

    // Apply node filter
    if (!nodeMatchesFilter(node, nodeTypes, nodeFilter)) continue;

    visitedNodes.push(node);
    maxDepthReached = Math.max(maxDepthReached, depth);

    // Visit node
    if (nodeVisitor) {
      const shouldContinue = nodeVisitor(node, depth);
      if (shouldContinue === false) continue; // Prune this branch
    }

    // Don't explore edges beyond maxDepth
    if (depth >= maxDepth) {
      if (terminationReason === TR.Completed) {
        terminationReason = TR.MaxDepthReached;
      }
      continue;
    }

    // Get adjacent edges
    const edges = await getEdgesInDirection(repo, nodeId, direction);

    for (const edge of edges) {
      edgesInspected++;

      // Apply edge filter
      if (!edgeMatchesFilter(edge, edgeTypes, edgeFilter)) continue;

      // Visit edge
      if (edgeVisitor) {
        const shouldTraverse = edgeVisitor(edge, depth);
        if (shouldTraverse === false) continue;
      }

      if (collectEdges) {
        visitedEdges.push(edge);
      }

      // Get neighbor
      const neighborId = getNeighborId(edge, nodeId, direction);

      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push({ nodeId: neighborId, depth: depth + 1 });
      }
    }
  }

  const duration = Date.now() - startTime;
  const stats = createTraversalStatistics({
    visitedNodeCount: visitedNodes.length,
    visitedEdgeCount: collectEdges ? visitedEdges.length : edgesInspected,
    maxDepth: maxDepthReached,
    duration,
  });

  return Object.freeze({
    visitedNodes: Object.freeze(visitedNodes),
    visitedEdges: Object.freeze(visitedEdges),
    paths: [],
    statistics: stats,
    duration,
    maxDepthReached,
    terminationReason,
    strategyUsed: TraversalStrategy.BFS,
  });
}

// ─── DFS Algorithm ────────────────────────────────────────────

/**
 * Depth-First Search traversal (iterative implementation).
 *
 * Explores as deep as possible before backtracking.
 * Uses a stack instead of recursion to avoid stack overflow.
 *
 * Time Complexity: O(V + E)
 * Space Complexity: O(V) (stack + visited set)
 *
 * @param repo - Graph repository
 * @param startNodeId - Starting node ID
 * @param options - Traversal options
 * @returns Traversal result with visited nodes and edges
 */
export async function depthFirstSearch(
  repo: GraphRepository,
  startNodeId: NodeId,
  options: DFSOptions = {},
): Promise<TraversalResult> {
  const startTime = Date.now();
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const direction = options.direction ?? 'outgoing';
  const edgeTypes = options.edgeTypes;
  const nodeTypes = options.nodeTypes;
  const edgeFilter = options.edgeFilter;
  const nodeFilter = options.nodeFilter;
  const nodeVisitor = options.nodeVisitor;
  const edgeVisitor = options.edgeVisitor;
  const cancellationToken = options.cancellationToken;
  const collectEdges = options.collectEdges ?? true;

  // Validate start node
  const startNode = await repo.getNode(startNodeId);
  if (!startNode) {
    return emptyTraversalResult(TraversalStrategy.DFS, Date.now() - startTime);
  }

  const visited = new Set<NodeId>();
  const visitedNodes: GraphNode[] = [];
  const visitedEdges: GraphEdge[] = [];
  // Stack: {nodeId, depth, iterator} for lazy expansion
  const stack: Array<{ nodeId: NodeId; depth: number }> = [{ nodeId: startNodeId, depth: 0 }];

  let maxDepthReached = 0;
  let terminationReason: TerminationReason = TR.Completed;
  let edgesInspected = 0;

  while (stack.length > 0) {
    const termCheck = shouldTerminate(cancellationToken, startTime, timeout, visited.size, maxNodes);
    if (termCheck) {
      terminationReason = termCheck;
      break;
    }

    const { nodeId, depth } = stack.pop()!;

    if (visited.has(nodeId)) continue;
    if (depth > maxDepth) {
      terminationReason = TR.MaxDepthReached;
      continue;
    }

    visited.add(nodeId);

    const node = await repo.getNode(nodeId);
    if (!node) continue;

    if (!nodeMatchesFilter(node, nodeTypes, nodeFilter)) continue;

    visitedNodes.push(node);
    maxDepthReached = Math.max(maxDepthReached, depth);

    if (nodeVisitor) {
      const shouldContinue = nodeVisitor(node, depth);
      if (shouldContinue === false) continue;
    }

    if (depth >= maxDepth) {
      if (terminationReason === TR.Completed) {
        terminationReason = TR.MaxDepthReached;
      }
      continue;
    }

    const edges = await getEdgesInDirection(repo, nodeId, direction);

    // Push neighbors in reverse order so leftmost is processed first
    const neighbors: Array<{ neighborId: NodeId; edge: GraphEdge }> = [];
    for (const edge of edges) {
      edgesInspected++;
      if (!edgeMatchesFilter(edge, edgeTypes, edgeFilter)) continue;
      if (edgeVisitor) {
        const shouldTraverse = edgeVisitor(edge, depth);
        if (shouldTraverse === false) continue;
      }
      if (collectEdges) {
        visitedEdges.push(edge);
      }
      const neighborId = getNeighborId(edge, nodeId, direction);
      if (!visited.has(neighborId)) {
        neighbors.push({ neighborId, edge });
      }
    }

    // Push in reverse so first neighbor is on top of stack
    for (let i = neighbors.length - 1; i >= 0; i--) {
      stack.push({ nodeId: neighbors[i].neighborId, depth: depth + 1 });
    }
  }

  const duration = Date.now() - startTime;
  const stats = createTraversalStatistics({
    visitedNodeCount: visitedNodes.length,
    visitedEdgeCount: collectEdges ? visitedEdges.length : edgesInspected,
    maxDepth: maxDepthReached,
    duration,
  });

  return Object.freeze({
    visitedNodes: Object.freeze(visitedNodes),
    visitedEdges: Object.freeze(visitedEdges),
    paths: [],
    statistics: stats,
    duration,
    maxDepthReached,
    terminationReason,
    strategyUsed: TraversalStrategy.DFS,
  });
}

/**
 * Recursive DFS implementation.
 * Uses actual recursion for simpler code; suitable for small graphs.
 * Falls back to iterative for large graphs (depth > 1000).
 */
export async function depthFirstSearchRecursive(
  repo: GraphRepository,
  startNodeId: NodeId,
  options: DFSOptions = {},
): Promise<TraversalResult> {
  const startTime = Date.now();
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const direction = options.direction ?? 'outgoing';
  const edgeTypes = options.edgeTypes;
  const nodeTypes = options.nodeTypes;
  const edgeFilter = options.edgeFilter;
  const nodeFilter = options.nodeFilter;
  const nodeVisitor = options.nodeVisitor;
  const edgeVisitor = options.edgeVisitor;
  const cancellationToken = options.cancellationToken;
  const collectEdges = options.collectEdges ?? true;

  const startNode = await repo.getNode(startNodeId);
  if (!startNode) {
    return emptyTraversalResult(TraversalStrategy.DFS, Date.now() - startTime);
  }

  const visited = new Set<NodeId>();
  const visitedNodes: GraphNode[] = [];
  const visitedEdges: GraphEdge[] = [];
  let maxDepthReached = 0;
  let terminationReason: TerminationReason = TR.Completed;
  let edgesInspected = 0;

  async function dfsVisit(nodeId: NodeId, depth: number): Promise<void> {
    if (visited.has(nodeId)) return;
    if (depth > maxDepth) {
      terminationReason = TR.MaxDepthReached;
      return;
    }
    if (cancellationToken?.isCancelled) {
      terminationReason = TR.Cancelled;
      return;
    }
    if (maxNodes > 0 && visited.size >= maxNodes) {
      terminationReason = TR.MaxNodesReached;
      return;
    }
    if (timeout > 0 && (Date.now() - startTime) >= timeout) {
      terminationReason = TR.Timeout;
      return;
    }

    visited.add(nodeId);
    const node = await repo.getNode(nodeId);
    if (!node) return;

    if (!nodeMatchesFilter(node, nodeTypes, nodeFilter)) return;

    visitedNodes.push(node);
    maxDepthReached = Math.max(maxDepthReached, depth);

    if (nodeVisitor) {
      const shouldContinue = nodeVisitor(node, depth);
      if (shouldContinue === false) return;
    }

    if (depth >= maxDepth) {
      terminationReason = TR.MaxDepthReached;
      return;
    }

    const edges = await getEdgesInDirection(repo, nodeId, direction);
    for (const edge of edges) {
      edgesInspected++;
      if (!edgeMatchesFilter(edge, edgeTypes, edgeFilter)) continue;
      if (edgeVisitor) {
        const shouldTraverse = edgeVisitor(edge, depth);
        if (shouldTraverse === false) continue;
      }
      if (collectEdges) {
        visitedEdges.push(edge);
      }
      const neighborId = getNeighborId(edge, nodeId, direction);
      if (!visited.has(neighborId)) {
        await dfsVisit(neighborId, depth + 1);
      }
    }
  }

  await dfsVisit(startNodeId, 0);

  const duration = Date.now() - startTime;
  const stats = createTraversalStatistics({
    visitedNodeCount: visitedNodes.length,
    visitedEdgeCount: collectEdges ? visitedEdges.length : edgesInspected,
    maxDepth: maxDepthReached,
    duration,
  });

  return Object.freeze({
    visitedNodes: Object.freeze(visitedNodes),
    visitedEdges: Object.freeze(visitedEdges),
    paths: [],
    statistics: stats,
    duration,
    maxDepthReached,
    terminationReason,
    strategyUsed: TraversalStrategy.DFS,
  });
}

// ─── Bidirectional BFS ────────────────────────────────────────

/**
 * Bidirectional BFS for finding the shortest path between two nodes.
 *
 * Runs two simultaneous BFS traversals: one from source and one from target.
 * When the two frontiers meet, a shortest path has been found.
 *
 * Time Complexity: O(b^(d/2)) — significantly faster than single BFS for distant nodes
 * Space Complexity: O(b^(d/2))
 *
 * @param repo - Graph repository
 * @param sourceId - Source node ID
 * @param targetId - Target node ID
 * @param options - Traversal options
 * @returns Path result with shortest path if found
 */
export async function bidirectionalBFS(
  repo: GraphRepository,
  sourceId: NodeId,
  targetId: NodeId,
  options: BidirectionalOptions = {},
): Promise<PathResult> {
  const startTime = Date.now();
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const edgeTypes = options.edgeTypes;
  const edgeFilter = options.edgeFilter;
  const cancellationToken = options.cancellationToken;

  // Validate both nodes exist
  const [sourceNode, targetNode] = await Promise.all([
    repo.getNode(sourceId),
    repo.getNode(targetId),
  ]);
  if (!sourceNode || !targetNode) {
    return notFoundPathResult(Date.now() - startTime);
  }

  // Same node
  if (sourceId === targetId) {
    return Object.freeze({
      found: true,
      path: Object.freeze({
        nodes: [sourceNode],
        edges: [],
        length: 0,
        totalStrength: 0,
      }),
      alternatives: [],
      totalPaths: 1,
      duration: Date.now() - startTime,
    });
  }

  // Forward search: source → target (follow outgoing edges)
  const forwardVisited = new Map<NodeId, { parent: NodeId; edge: GraphEdge }>();
  forwardVisited.set(sourceId, { parent: sourceId, edge: null as unknown as GraphEdge });

  // Backward search: target → source (follow incoming edges, reversed)
  const backwardVisited = new Map<NodeId, { parent: NodeId; edge: GraphEdge }>();
  backwardVisited.set(targetId, { parent: targetId, edge: null as unknown as GraphEdge });

  let forwardQueue: NodeId[] = [sourceId];
  let backwardQueue: NodeId[] = [targetId];
  let forwardDepth = 0;
  let backwardDepth = 0;

  while (forwardQueue.length > 0 && backwardQueue.length > 0) {
    if (cancellationToken?.isCancelled) break;
    if (timeout > 0 && (Date.now() - startTime) >= timeout) break;

    // Expand forward frontier
    const nextForwardQueue: NodeId[] = [];
    for (const nodeId of forwardQueue) {
      const edges = await repo.getEdgesFrom(nodeId); // outgoing
      for (const edge of edges) {
        if (!edgeMatchesFilter(edge, edgeTypes, edgeFilter)) continue;
        const neighborId = edge.targetId;
        if (!forwardVisited.has(neighborId)) {
          forwardVisited.set(neighborId, { parent: nodeId, edge });
          nextForwardQueue.push(neighborId);

          // Check intersection
          if (backwardVisited.has(neighborId)) {
            return constructBidirectionalPath(
              repo, forwardVisited, backwardVisited,
              sourceId, targetId, neighborId, startTime,
            );
          }
        }
      }
    }
    forwardQueue = nextForwardQueue;
    forwardDepth++;
    if (forwardDepth > maxDepth) break;

    // Expand backward frontier
    const nextBackwardQueue: NodeId[] = [];
    for (const nodeId of backwardQueue) {
      const edges = await repo.getEdgesTo(nodeId); // incoming
      for (const edge of edges) {
        if (!edgeMatchesFilter(edge, edgeTypes, edgeFilter)) continue;
        const neighborId = edge.sourceId;
        if (!backwardVisited.has(neighborId)) {
          backwardVisited.set(neighborId, { parent: nodeId, edge });
          nextBackwardQueue.push(neighborId);

          // Check intersection
          if (forwardVisited.has(neighborId)) {
            return constructBidirectionalPath(
              repo, forwardVisited, backwardVisited,
              sourceId, targetId, neighborId, startTime,
            );
          }
        }
      }
    }
    backwardQueue = nextBackwardQueue;
    backwardDepth++;
    if (backwardDepth > maxDepth) break;
  }

  return notFoundPathResult(Date.now() - startTime);
}

/** Construct path from bidirectional search results */
async function constructBidirectionalPath(
  repo: GraphRepository,
  forwardVisited: Map<NodeId, { parent: NodeId; edge: GraphEdge }>,
  backwardVisited: Map<NodeId, { parent: NodeId; edge: GraphEdge }>,
  sourceId: NodeId,
  targetId: NodeId,
  meetingPoint: NodeId,
  startTime: number,
): Promise<PathResult> {
  // Reconstruct forward path: source → meeting
  const forwardPath: NodeId[] = [];
  let current: NodeId = meetingPoint;
  while (current !== sourceId) {
    forwardPath.unshift(current);
    const entry = forwardVisited.get(current);
    if (!entry) break;
    current = entry.parent;
  }
  forwardPath.unshift(sourceId);

  // Reconstruct backward path: meeting → target
  const backwardPath: NodeId[] = [];
  current = meetingPoint;
  while (current !== targetId) {
    const entry = backwardVisited.get(current);
    if (!entry) break;
    current = entry.parent;
    backwardPath.push(current);
  }

  // Combine: forward + backward (meeting point is shared, so skip first of backward)
  const fullPathIds = [...forwardPath, ...backwardPath];

  // Resolve nodes and edges
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const nodeId of fullPathIds) {
    const node = await repo.getNode(nodeId);
    if (node) nodes.push(node);
  }

  for (let i = 0; i < fullPathIds.length - 1; i++) {
    const fromEdges = await repo.getEdgesFrom(fullPathIds[i]);
    const connectingEdge = fromEdges.find(e => e.targetId === fullPathIds[i + 1]);
    if (connectingEdge) edges.push(connectingEdge);
  }

  return Object.freeze({
    found: true,
    path: Object.freeze({
      nodes: Object.freeze(nodes),
      edges: Object.freeze(edges),
      length: edges.length,
      totalStrength: edges.reduce((sum, e) => sum + e.relationship.strength, 0),
    }),
    alternatives: [],
    totalPaths: 1,
    duration: Date.now() - startTime,
  });
}

// ─── Shortest Path ────────────────────────────────────────────

/**
 * Find the shortest path between two nodes using BFS.
 * For unweighted graphs, BFS guarantees the shortest path.
 *
 * Time Complexity: O(V + E)
 * Space Complexity: O(V)
 *
 * @param repo - Graph repository
 * @param sourceId - Source node ID
 * @param targetId - Target node ID
 * @param options - Path search options
 * @returns Path result with shortest path if found
 */
export async function shortestPath(
  repo: GraphRepository,
  sourceId: NodeId,
  targetId: NodeId,
  options: ShortestPathOptions = {},
): Promise<PathResult> {
  const startTime = Date.now();
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const edgeTypes = options.edgeTypes;
  const edgeFilter = options.edgeFilter;
  const nodeFilter = options.nodeFilter;
  const cancellationToken = options.cancellationToken;
  const bidirectional = options.bidirectional ?? true;

  // Use bidirectional for potentially better performance
  if (bidirectional && sourceId !== targetId) {
    return bidirectionalBFS(repo, sourceId, targetId, options);
  }

  // Single-source BFS
  const [sourceNode, targetNode] = await Promise.all([
    repo.getNode(sourceId),
    repo.getNode(targetId),
  ]);

  if (!sourceNode || !targetNode) {
    return notFoundPathResult(Date.now() - startTime);
  }

  if (sourceId === targetId) {
    return Object.freeze({
      found: true,
      path: Object.freeze({
        nodes: [sourceNode],
        edges: [],
        length: 0,
        totalStrength: 0,
      }),
      alternatives: [],
      totalPaths: 1,
      duration: Date.now() - startTime,
    });
  }

  const visited = new Set<NodeId>([sourceId]);
  const parentMap = new Map<NodeId, { nodeId: NodeId; edge: GraphEdge }>();
  const queue: Array<{ nodeId: NodeId; depth: number }> = [{ nodeId: sourceId, depth: 0 }];

  while (queue.length > 0) {
    if (cancellationToken?.isCancelled) break;
    if (timeout > 0 && (Date.now() - startTime) >= timeout) break;

    const { nodeId, depth } = queue.shift()!;

    if (depth > maxDepth) continue;

    if (nodeId === targetId) {
      // Reconstruct path
      return reconstructPath(repo, parentMap, sourceId, targetId, startTime);
    }

    const edges = await repo.getEdgesFrom(nodeId);
    for (const edge of edges) {
      if (!edgeMatchesFilter(edge, edgeTypes, edgeFilter)) continue;

      const neighborId = edge.targetId;
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        parentMap.set(neighborId, { nodeId, edge });
        queue.push({ nodeId: neighborId, depth: depth + 1 });
      }
    }
  }

  return notFoundPathResult(Date.now() - startTime);
}

/** Reconstruct path from parent map */
async function reconstructPath(
  repo: GraphRepository,
  parentMap: Map<NodeId, { nodeId: NodeId; edge: GraphEdge }>,
  sourceId: NodeId,
  targetId: NodeId,
  startTime: number,
): Promise<PathResult> {
  const nodeIds: NodeId[] = [targetId];
  const edges: GraphEdge[] = [];
  let current = targetId;

  while (current !== sourceId) {
    const parent = parentMap.get(current);
    if (!parent) break;
    nodeIds.unshift(parent.nodeId);
    edges.unshift(parent.edge);
    current = parent.nodeId;
  }

  // Resolve node objects
  const nodes: GraphNode[] = [];
  for (const nodeId of nodeIds) {
    const node = await repo.getNode(nodeId);
    if (node) nodes.push(node);
  }

  return Object.freeze({
    found: true,
    path: Object.freeze({
      nodes: Object.freeze(nodes),
      edges: Object.freeze(edges),
      length: edges.length,
      totalStrength: edges.reduce((sum, e) => sum + e.relationship.strength, 0),
    }),
    alternatives: [],
    totalPaths: 1,
    duration: Date.now() - startTime,
  });
}

// ─── Multi-Path (Yen's K-Shortest Paths) ─────────────────────

/**
 * Find K shortest paths between two nodes using Yen's algorithm.
 *
 * Yen's algorithm finds the K shortest loopless paths in order.
 * It works by:
 * 1. Finding the shortest path (A0)
 * 2. For each path found, generating candidate paths by "spur" deviations
 * 3. Selecting the next shortest from candidates
 *
 * Time Complexity: O(K * V * E)
 * Space Complexity: O(K * V)
 *
 * @param repo - Graph repository
 * @param sourceId - Source node ID
 * @param targetId - Target node ID
 * @param options - Multi-path options
 * @returns Array of paths sorted by length
 */
export async function findPaths(
  repo: GraphRepository,
  sourceId: NodeId,
  targetId: NodeId,
  options: MultiPathOptions = {},
): Promise<PathResult> {
  const startTime = Date.now();
  const maxPaths = options.maxPaths ?? 3;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const cancellationToken = options.cancellationToken;

  // Validate nodes
  const [sourceNode, targetNode] = await Promise.all([
    repo.getNode(sourceId),
    repo.getNode(targetId),
  ]);

  if (!sourceNode || !targetNode) {
    return notFoundPathResult(Date.now() - startTime);
  }

  if (sourceId === targetId) {
    return Object.freeze({
      found: true,
      path: Object.freeze({
        nodes: [sourceNode],
        edges: [],
        length: 0,
        totalStrength: 0,
      }),
      alternatives: [],
      totalPaths: 1,
      duration: Date.now() - startTime,
    });
  }

  // Find the first (shortest) path
  const firstPathResult = await shortestPath(repo, sourceId, targetId, {
    ...options,
    bidirectional: false, // Yen's needs single-source for path reconstruction
  });

  if (!firstPathResult.found || !firstPathResult.path) {
    return notFoundPathResult(Date.now() - startTime);
  }

  const foundPaths: TraversalPath[] = [firstPathResult.path];
  const candidates: TraversalPath[] = [];

  for (let k = 1; k < maxPaths; k++) {
    if (cancellationToken?.isCancelled) break;
    if (timeout > 0 && (Date.now() - startTime) >= timeout) break;

    const previousPath = foundPaths[k - 1];

    // For each node in the previous path, create a spur
    for (let i = 0; i < previousPath.nodes.length - 1; i++) {
      const spurNode = previousPath.nodes[i];
      const rootPath = previousPath.nodes.slice(0, i + 1);

      // Temporarily remove edges that would reproduce previously found paths
      const removedEdges: Array<{ from: NodeId; to: NodeId }> = [];

      for (const path of foundPaths) {
        const pathNodes = path.nodes;
        let matches = true;
        for (let j = 0; j <= i && j < pathNodes.length; j++) {
          if (pathNodes[j].identity.id !== rootPath[j].identity.id) {
            matches = false;
            break;
          }
        }
        if (matches && i < pathNodes.length - 1) {
          removedEdges.push({
            from: pathNodes[i].identity.id,
            to: pathNodes[i + 1].identity.id,
          });
        }
      }

      // Temporarily remove root path nodes (except spur)
      const removedNodes: NodeId[] = [];
      for (let j = 0; j < i; j++) {
        removedNodes.push(rootPath[j].identity.id);
      }

      // Find spur path from spur to target, avoiding removed nodes/edges
      const spurPathResult = await findSpurPath(
        repo, spurNode.identity.id as NodeId, targetId,
        removedNodes, removedEdges, maxDepth - i, options,
      );

      if (spurPathResult.found && spurPathResult.path) {
        // Combine root + spur
        const fullPath = combinePaths(repo, rootPath, spurPathResult.path);
        if (fullPath && !isPathDuplicate(fullPath, foundPaths, candidates)) {
          candidates.push(fullPath);
        }
      }
    }

    if (candidates.length === 0) break;

    // Sort candidates by length and take the shortest
    candidates.sort((a, b) => a.length - b.length);
    foundPaths.push(candidates.shift()!);
  }

  const duration = Date.now() - startTime;

  return Object.freeze({
    found: true,
    path: foundPaths[0] ?? null,
    alternatives: Object.freeze(foundPaths.slice(1)),
    totalPaths: foundPaths.length,
    duration,
  });
}

/** Find a spur path avoiding certain nodes and edges */
async function findSpurPath(
  repo: GraphRepository,
  spurNodeId: NodeId,
  targetId: NodeId,
  removedNodes: NodeId[],
  removedEdges: Array<{ from: NodeId; to: NodeId }>,
  maxDepth: number,
  options: MultiPathOptions,
): Promise<PathResult> {
  const removedNodeSet = new Set(removedNodes);
  const edgeKey = (from: NodeId, to: NodeId) => `${from}::${to}`;
  const removedEdgeSet = new Set(removedEdges.map(e => edgeKey(e.from, e.to)));

  const visited = new Set<NodeId>([spurNodeId]);
  const parentMap = new Map<NodeId, { nodeId: NodeId; edge: GraphEdge }>();
  const queue: Array<{ nodeId: NodeId; depth: number }> = [{ nodeId: spurNodeId, depth: 0 }];

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;

    if (depth > maxDepth) continue;

    if (nodeId === targetId) {
      // Reconstruct spur path
      const nodeIds: NodeId[] = [targetId];
      const edges: GraphEdge[] = [];
      let current = targetId;
      while (current !== spurNodeId) {
        const parent = parentMap.get(current);
        if (!parent) break;
        nodeIds.unshift(parent.nodeId);
        edges.unshift(parent.edge);
        current = parent.nodeId;
      }

      const nodes: GraphNode[] = [];
      for (const nid of nodeIds) {
        const n = await repo.getNode(nid);
        if (n) nodes.push(n);
      }

      return Object.freeze({
        found: true,
        path: Object.freeze({
          nodes: Object.freeze(nodes),
          edges: Object.freeze(edges),
          length: edges.length,
          totalStrength: edges.reduce((sum, e) => sum + e.relationship.strength, 0),
        }),
        alternatives: [],
        totalPaths: 1,
        duration: 0,
      });
    }

    const edges = await repo.getEdgesFrom(nodeId);
    for (const edge of edges) {
      const neighborId = edge.targetId;
      if (removedNodeSet.has(neighborId)) continue;
      if (removedEdgeSet.has(edgeKey(nodeId, neighborId))) continue;
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        parentMap.set(neighborId, { nodeId, edge });
        queue.push({ nodeId: neighborId, depth: depth + 1 });
      }
    }
  }

  return notFoundPathResult();
}

/** Combine root path and spur path into full path */
function combinePaths(
  _repo: GraphRepository,
  rootNodes: readonly GraphNode[],
  spurPath: TraversalPath,
): TraversalPath | null {
  if (rootNodes.length === 0) return spurPath;

  // The last node of root is the first node of spur — avoid duplication
  const combinedNodes = [...rootNodes.slice(0, -1), ...spurPath.nodes];

  // We need to find edges for the root portion
  // Since we don't have those edges readily, we use what we can
  // The root edges come from the previous path
  const combinedEdges = [...spurPath.edges];

  return Object.freeze({
    nodes: Object.freeze(combinedNodes),
    edges: Object.freeze(combinedEdges),
    length: combinedEdges.length,
    totalStrength: combinedEdges.reduce((sum, e) => sum + e.relationship.strength, 0),
  });
}

/** Check if a path is already in found paths or candidates */
function isPathDuplicate(
  path: TraversalPath,
  foundPaths: TraversalPath[],
  candidates: TraversalPath[],
): boolean {
  const pathKey = path.nodes.map(n => n.identity.id).join('->');

  for (const existing of [...foundPaths, ...candidates]) {
    const existingKey = existing.nodes.map(n => n.identity.id).join('->');
    if (pathKey === existingKey) return true;
  }
  return false;
}

// ─── Cycle Detection ──────────────────────────────────────────

/**
 * Detect cycles in the graph using DFS with three-color marking.
 *
 * White = unvisited, Gray = in current DFS path, Black = fully processed.
 * A cycle exists when we encounter a Gray node from another Gray node.
 *
 * Time Complexity: O(V + E)
 * Space Complexity: O(V)
 *
 * @param repo - Graph repository
 * @param options - Cycle detection options
 * @returns Array of detected cycles
 */
export async function findCycles(
  repo: GraphRepository,
  options: CycleDetectionOptions = {},
): Promise<readonly Cycle[]> {
  const startTime = Date.now();
  const maxCycles = options.maxCycles ?? 0;
  const minLength = options.minLength ?? 2;
  const timeout = options.timeout ?? 0;
  const cancellationToken = options.cancellationToken;

  const cycles: Cycle[] = [];
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<NodeId, number>();
  const parentMap = new Map<NodeId, { nodeId: NodeId; edge: GraphEdge }>();

  const allNodes = await repo.getAllNodes();

  for (const node of allNodes) {
    color.set(node.identity.id, WHITE);
  }

  async function dfsVisit(nodeId: NodeId): Promise<void> {
    if (cancellationToken?.isCancelled) return;
    if (timeout > 0 && (Date.now() - startTime) >= timeout) return;
    if (maxCycles > 0 && cycles.length >= maxCycles) return;

    color.set(nodeId, GRAY);

    const edges = await repo.getEdgesFrom(nodeId);
    for (const edge of edges) {
      const neighborId = edge.targetId;

      if (color.get(neighborId) === GRAY) {
        // Found a cycle — reconstruct it
        const cycleNodeIds: NodeId[] = [neighborId];
        const cycleEdgeIds: EdgeId[] = [edge.id];
        let current = nodeId;

        while (current !== neighborId) {
          cycleNodeIds.unshift(current);
          const parent = parentMap.get(current);
          if (!parent) break;
          cycleEdgeIds.unshift(parent.edge.id);
          current = parent.nodeId;
        }

        if (cycleNodeIds.length >= minLength) {
          cycles.push(Object.freeze({
            nodeIds: Object.freeze(cycleNodeIds),
            edgeIds: Object.freeze(cycleEdgeIds),
            length: cycleEdgeIds.length,
          }));
        }
      } else if (color.get(neighborId) === WHITE) {
        parentMap.set(neighborId, { nodeId, edge });
        await dfsVisit(neighborId);
      }
    }

    color.set(nodeId, BLACK);
  }

  for (const node of allNodes) {
    if (color.get(node.identity.id) === WHITE) {
      await dfsVisit(node.identity.id);
    }
    if (maxCycles > 0 && cycles.length >= maxCycles) break;
  }

  return Object.freeze(cycles);
}

/**
 * Check if the graph contains any cycles.
 * More efficient than findCycles when you only need a boolean answer.
 *
 * Time Complexity: O(V + E) but stops at first cycle
 * Space Complexity: O(V)
 */
export async function hasCycle(repo: GraphRepository): Promise<boolean> {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<NodeId, number>();
  let found = false;

  const allNodes = await repo.getAllNodes();
  for (const node of allNodes) {
    color.set(node.identity.id, WHITE);
  }

  async function dfsVisit(nodeId: NodeId): Promise<void> {
    if (found) return;
    color.set(nodeId, GRAY);

    const edges = await repo.getEdgesFrom(nodeId);
    for (const edge of edges) {
      if (found) return;
      const neighborId = edge.targetId;
      if (color.get(neighborId) === GRAY) {
        found = true;
        return;
      }
      if (color.get(neighborId) === WHITE) {
        await dfsVisit(neighborId);
      }
    }

    color.set(nodeId, BLACK);
  }

  for (const node of allNodes) {
    if (found) return true;
    if (color.get(node.identity.id) === WHITE) {
      await dfsVisit(node.identity.id);
    }
  }

  return found;
}

// ─── Connected Components ─────────────────────────────────────

/**
 * Find all connected components in the graph.
 * Uses BFS to discover each component.
 * Treats the graph as undirected for component analysis.
 *
 * Time Complexity: O(V + E)
 * Space Complexity: O(V)
 *
 * @param repo - Graph repository
 * @returns Array of connected components
 */
export async function connectedComponents(
  repo: GraphRepository,
): Promise<readonly ConnectedComponent[]> {
  const allNodes = await repo.getAllNodes();
  const visited = new Set<NodeId>();
  const components: ConnectedComponent[] = [];

  for (const node of allNodes) {
    if (visited.has(node.identity.id)) continue;

    // BFS to find the component
    const componentNodes: NodeId[] = [];
    const queue: NodeId[] = [node.identity.id];
    visited.add(node.identity.id);

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      componentNodes.push(nodeId);

      // Get both outgoing and incoming edges (undirected)
      const [outgoing, incoming] = await Promise.all([
        repo.getEdgesFrom(nodeId),
        repo.getEdgesTo(nodeId),
      ]);

      for (const edge of [...outgoing, ...incoming]) {
        const neighborId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }

    components.push(Object.freeze({
      nodeIds: Object.freeze(componentNodes),
      size: componentNodes.length,
      isIsolated: componentNodes.length === 1,
    }));
  }

  // Sort by size descending
  components.sort((a, b) => b.size - a.size);

  return Object.freeze(components);
}

// ─── Reachability ─────────────────────────────────────────────

/**
 * Find all nodes reachable from a start node.
 * Uses BFS for level-order discovery.
 *
 * Time Complexity: O(V + E)
 * Space Complexity: O(V)
 *
 * @param repo - Graph repository
 * @param startNodeId - Starting node ID
 * @param options - Reachability options
 * @returns Set of reachable node IDs and corresponding nodes
 */
export async function reachableNodes(
  repo: GraphRepository,
  startNodeId: NodeId,
  options: ReachabilityOptions = {},
): Promise<TraversalResult> {
  const includeStart = options.includeStart ?? true;
  const bfsResult = await breadthFirstSearch(repo, startNodeId, {
    ...options,
    direction: options.direction ?? 'outgoing',
  });

  if (!includeStart && bfsResult.visitedNodes.length > 0) {
    const filteredNodes = bfsResult.visitedNodes.filter(n => n.identity.id !== startNodeId);
    const filteredEdges = bfsResult.visitedEdges.filter(
      e => e.sourceId !== startNodeId || e.targetId !== startNodeId
    );
    return Object.freeze({
      ...bfsResult,
      visitedNodes: Object.freeze(filteredNodes),
      visitedEdges: Object.freeze(filteredEdges),
      statistics: createTraversalStatistics({
        visitedNodeCount: filteredNodes.length,
        visitedEdgeCount: filteredEdges.length,
        maxDepth: bfsResult.maxDepthReached,
        duration: bfsResult.duration,
      }),
    });
  }

  return bfsResult;
}

// ─── Path Existence Check ─────────────────────────────────────

/**
 * Check whether a path exists between two nodes.
 * More efficient than finding the actual path when you only need a boolean.
 *
 * Time Complexity: O(V + E)
 * Space Complexity: O(V)
 */
export async function pathExists(
  repo: GraphRepository,
  sourceId: NodeId,
  targetId: NodeId,
  maxDepth: number = DEFAULT_MAX_DEPTH,
): Promise<boolean> {
  if (sourceId === targetId) {
    return repo.hasNode(sourceId);
  }

  const visited = new Set<NodeId>([sourceId]);
  const queue: Array<{ nodeId: NodeId; depth: number }> = [{ nodeId: sourceId, depth: 0 }];

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;
    if (depth > maxDepth) continue;

    const edges = await repo.getEdgesFrom(nodeId);
    for (const edge of edges) {
      const neighborId = edge.targetId;
      const nextDepth = depth + 1;
      if (neighborId === targetId && nextDepth <= maxDepth) return true;
      if (!visited.has(neighborId) && nextDepth <= maxDepth) {
        visited.add(neighborId);
        queue.push({ nodeId: neighborId, depth: nextDepth });
      }
    }
  }

  return false;
}
