/**
 * Knowledge Graph Traversal Engine — Neighborhood Queries
 *
 * Provides methods for exploring the neighborhood of a node:
 * - neighbors: all adjacent nodes (both directions or filtered)
 * - incoming: nodes connected via incoming edges
 * - outgoing: nodes connected via outgoing edges
 *
 * All methods support filtering by EdgeType, NodeType, and custom predicates.
 * Uses only the public GraphRepository API.
 */

import type { NodeId } from '../../types/index.ts';
import type { GraphNode, GraphEdge } from '../../models/index.ts';
import type { GraphRepository } from '../../contracts/index.ts';
import type { NeighborhoodOptions, NodePredicate, EdgePredicate } from '../types/index.ts';

/** Check if an edge matches the edge type and predicate filters */
function matchesEdgeFilter(
  edge: GraphEdge,
  edgeTypes: readonly string[] | undefined,
  edgeFilter: EdgePredicate | undefined,
): boolean {
  if (edgeTypes && edgeTypes.length > 0 && !edgeTypes.includes(edge.relationship.edgeType)) return false;
  if (edgeFilter && !edgeFilter(edge)) return false;
  return true;
}

/** Check if a node matches the node type and predicate filters */
function matchesNodeFilter(
  node: GraphNode,
  nodeTypes: readonly string[] | undefined,
  nodeFilter: NodePredicate | undefined,
): boolean {
  if (nodeTypes && nodeTypes.length > 0 && !nodeTypes.includes(node.identity.type)) return false;
  if (nodeFilter && !nodeFilter(node)) return false;
  return true;
}

/**
 * Get all neighbor nodes of a given node.
 *
 * Supports direction filtering (outgoing, incoming, or both) and
 * type/predicate filtering for both edges and nodes.
 *
 * Time Complexity: O(degree) where degree is the number of adjacent edges
 * Space Complexity: O(degree)
 *
 * @param repo - Graph repository
 * @param nodeId - The node whose neighbors to find
 * @param options - Neighborhood options (depth, direction, filters)
 * @returns Array of neighbor nodes
 */
export async function neighbors(
  repo: GraphRepository,
  nodeId: NodeId,
  options: NeighborhoodOptions = {},
): Promise<readonly GraphNode[]> {
  const depth = options.depth ?? 1;
  const direction = options.direction ?? 'both';
  const edgeTypes = options.edgeTypes;
  const nodeTypes = options.nodeTypes;
  const edgeFilter = options.edgeFilter;
  const nodeFilter = options.nodeFilter;

  // For depth = 1, direct neighbors
  if (depth === 1) {
    return getDirectNeighbors(repo, nodeId, direction, edgeTypes, nodeTypes, edgeFilter, nodeFilter);
  }

  // For depth > 1, BFS-based neighborhood expansion
  return getMultiHopNeighbors(repo, nodeId, depth, direction, edgeTypes, nodeTypes, edgeFilter, nodeFilter);
}

/**
 * Get nodes connected via outgoing edges from a node.
 * Shorthand for neighbors with direction='outgoing'.
 */
export async function outgoing(
  repo: GraphRepository,
  nodeId: NodeId,
  options: Omit<NeighborhoodOptions, 'direction'> = {},
): Promise<readonly GraphNode[]> {
  return neighbors(repo, nodeId, { ...options, direction: 'outgoing' });
}

/**
 * Get nodes connected via incoming edges to a node.
 * Shorthand for neighbors with direction='incoming'.
 */
export async function incoming(
  repo: GraphRepository,
  nodeId: NodeId,
  options: Omit<NeighborhoodOptions, 'direction'> = {},
): Promise<readonly GraphNode[]> {
  return neighbors(repo, nodeId, { ...options, direction: 'incoming' });
}

/**
 * Get the edges connecting a node to its neighbors.
 * Useful when you need the relationship information, not just the nodes.
 *
 * @param repo - Graph repository
 * @param nodeId - The node to get adjacent edges for
 * @param options - Neighborhood options
 * @returns Array of adjacent edges
 */
export async function neighborEdges(
  repo: GraphRepository,
  nodeId: NodeId,
  options: NeighborhoodOptions = {},
): Promise<readonly GraphEdge[]> {
  const direction = options.direction ?? 'both';
  const edgeTypes = options.edgeTypes;
  const edgeFilter = options.edgeFilter;

  let edges: GraphEdge[];

  switch (direction) {
    case 'outgoing':
      edges = [...await repo.getEdgesFrom(nodeId)];
      break;
    case 'incoming':
      edges = [...await repo.getEdgesTo(nodeId)];
      break;
    case 'both': {
      const [out, inc] = await Promise.all([
        repo.getEdgesFrom(nodeId),
        repo.getEdgesTo(nodeId),
      ]);
      const seen = new Set<string>();
      edges = [];
      for (const e of [...out, ...inc]) {
        if (!seen.has(e.id)) {
          seen.add(e.id);
          edges.push(e);
        }
      }
      break;
    }
    default:
      edges = [...await repo.getEdgesFrom(nodeId)];
  }

  return edges.filter(e => matchesEdgeFilter(e, edgeTypes, edgeFilter));
}

// ─── Internal Helpers ─────────────────────────────────────────

async function getDirectNeighbors(
  repo: GraphRepository,
  nodeId: NodeId,
  direction: 'outgoing' | 'incoming' | 'both',
  edgeTypes: readonly string[] | undefined,
  nodeTypes: readonly string[] | undefined,
  edgeFilter: EdgePredicate | undefined,
  nodeFilter: NodePredicate | undefined,
): Promise<readonly GraphNode[]> {
  const neighborIds = new Set<NodeId>();

  if (direction === 'outgoing' || direction === 'both') {
    const outEdges = await repo.getEdgesFrom(nodeId);
    for (const edge of outEdges) {
      if (matchesEdgeFilter(edge, edgeTypes, edgeFilter)) {
        neighborIds.add(edge.targetId);
      }
    }
  }

  if (direction === 'incoming' || direction === 'both') {
    const inEdges = await repo.getEdgesTo(nodeId);
    for (const edge of inEdges) {
      if (matchesEdgeFilter(edge, edgeTypes, edgeFilter)) {
        neighborIds.add(edge.sourceId);
      }
    }
  }

  // Resolve and filter nodes
  const result: GraphNode[] = [];
  for (const nid of neighborIds) {
    const node = await repo.getNode(nid);
    if (node && matchesNodeFilter(node, nodeTypes, nodeFilter)) {
      result.push(node);
    }
  }

  return Object.freeze(result);
}

async function getMultiHopNeighbors(
  repo: GraphRepository,
  startNodeId: NodeId,
  maxDepth: number,
  direction: 'outgoing' | 'incoming' | 'both',
  edgeTypes: readonly string[] | undefined,
  nodeTypes: readonly string[] | undefined,
  edgeFilter: EdgePredicate | undefined,
  nodeFilter: NodePredicate | undefined,
): Promise<readonly GraphNode[]> {
  const visited = new Set<NodeId>([startNodeId]);
  const queue: Array<{ nodeId: NodeId; depth: number }> = [{ nodeId: startNodeId, depth: 0 }];
  const result: GraphNode[] = [];

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

    // Get adjacent edges based on direction
    let edges: GraphEdge[];
    switch (direction) {
      case 'outgoing':
        edges = [...await repo.getEdgesFrom(nodeId)];
        break;
      case 'incoming':
        edges = [...await repo.getEdgesTo(nodeId)];
        break;
      case 'both': {
        const [out, inc] = await Promise.all([
          repo.getEdgesFrom(nodeId),
          repo.getEdgesTo(nodeId),
        ]);
        edges = [...out, ...inc];
        break;
      }
      default:
        edges = [...await repo.getEdgesFrom(nodeId)];
    }

    for (const edge of edges) {
      if (!matchesEdgeFilter(edge, edgeTypes, edgeFilter)) continue;

      const neighborId = direction === 'incoming' ? edge.sourceId : edge.targetId;

      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        const node = await repo.getNode(neighborId);
        if (node && matchesNodeFilter(node, nodeTypes, nodeFilter)) {
          result.push(node);
        }
        queue.push({ nodeId: neighborId, depth: depth + 1 });
      }
    }
  }

  return Object.freeze(result);
}
