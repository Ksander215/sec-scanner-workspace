/**
 * Knowledge Graph Traversal Engine — Subgraph Extraction
 *
 * Provides methods for extracting subgraphs from the knowledge graph:
 * - By depth (N-hop neighborhood)
 * - By predicate (custom filter)
 * - By node type
 * - By edge type
 *
 * Extracted subgraphs are returned as GraphSubgraph instances
 * containing the matched nodes and edges.
 *
 * Uses only the public GraphRepository API.
 */

import type { NodeId, EdgeId } from '../../types/index.ts';
import type { GraphNode, GraphEdge, GraphSubgraph } from '../../models/index.ts';
import { createGraphSubgraph } from '../../models/index.ts';
import type { GraphRepository } from '../../contracts/index.ts';
import type { SubgraphOptions, NodePredicate, EdgePredicate } from '../types/index.ts';

/** Generate a unique ID for subgraph results */
function generateSubgraphId(): string {
  return `sg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Extract a subgraph from the graph starting from a seed node.
 *
 * Performs BFS from the seed, collecting nodes and edges that match
 * the specified filters up to the given depth.
 *
 * Time Complexity: O(V_sub + E_sub) where V_sub and E_sub are the subgraph size
 * Space Complexity: O(V_sub + E_sub)
 *
 * @param repo - Graph repository
 * @param startNodeId - Seed node ID to start extraction from
 * @param options - Subgraph extraction options
 * @returns Extracted subgraph
 */
export async function extractSubgraph(
  repo: GraphRepository,
  startNodeId: NodeId,
  options: SubgraphOptions = {},
): Promise<GraphSubgraph> {
  const maxDepth = options.maxDepth ?? 3;
  const direction = options.direction ?? 'both';
  const edgeTypes = options.edgeTypes;
  const nodeTypes = options.nodeTypes;
  const edgeFilter = options.edgeFilter;
  const nodeFilter = options.nodeFilter;
  const maxNodes = options.maxNodes ?? 0;
  const cancellationToken = options.cancellationToken;

  // Validate start node
  const startNode = await repo.getNode(startNodeId);
  if (!startNode) {
    return createGraphSubgraph(generateSubgraphId(), [], [], {
      description: `Empty subgraph — start node ${startNodeId} not found`,
    });
  }

  const collectedNodes = new Map<NodeId, GraphNode>();
  const collectedEdges = new Map<EdgeId, GraphEdge>();
  const visited = new Set<NodeId>();

  // Add start node if it passes filter
  if (nodeMatchesFilter(startNode, nodeTypes, nodeFilter)) {
    collectedNodes.set(startNodeId, startNode);
  }

  const queue: Array<{ nodeId: NodeId; depth: number }> = [{ nodeId: startNodeId, depth: 0 }];
  visited.add(startNodeId);

  while (queue.length > 0) {
    if (cancellationToken?.isCancelled) break;
    if (maxNodes > 0 && collectedNodes.size >= maxNodes) break;

    const { nodeId, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

    // Get edges based on direction
    const edges = await getEdgesInDirection(repo, nodeId, direction);

    for (const edge of edges) {
      // Apply edge filter
      if (!edgeMatchesFilter(edge, edgeTypes, edgeFilter)) continue;

      // Add edge to collection
      collectedEdges.set(edge.id, edge);

      // Get neighbor
      const neighborId = getNeighborId(edge, nodeId, direction);

      // Apply node filter
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        const neighborNode = await repo.getNode(neighborId);
        if (neighborNode && nodeMatchesFilter(neighborNode, nodeTypes, nodeFilter)) {
          if (maxNodes <= 0 || collectedNodes.size < maxNodes) {
            collectedNodes.set(neighborId, neighborNode);
            queue.push({ nodeId: neighborId, depth: depth + 1 });
          }
        }
      }
    }
  }

  // Filter edges to only include those whose both endpoints are in the node set
  const validEdges = [...collectedEdges.values()].filter(
    e => collectedNodes.has(e.sourceId) && collectedNodes.has(e.targetId)
  );

  return createGraphSubgraph(
    generateSubgraphId(),
    [...collectedNodes.values()],
    validEdges,
    {
      description: `Subgraph extracted from ${startNodeId} (depth=${maxDepth}, nodes=${collectedNodes.size}, edges=${validEdges.length})`,
    },
  );
}

/**
 * Extract a subgraph containing only nodes of specified types.
 *
 * @param repo - Graph repository
 * @param nodeTypes - Node types to include
 * @param edgeTypes - Optional edge types to include
 * @returns Extracted subgraph
 */
export async function extractSubgraphByType(
  repo: GraphRepository,
  nodeTypes: readonly string[],
  edgeTypes?: readonly string[],
): Promise<GraphSubgraph> {
  const allNodes = await repo.getAllNodes();
  const filteredNodes = allNodes.filter(n => nodeTypes.includes(n.identity.type));

  const nodeIds = new Set(filteredNodes.map(n => n.identity.id));
  const collectedEdges: GraphEdge[] = [];

  for (const node of filteredNodes) {
    const outEdges = await repo.getEdgesFrom(node.identity.id);
    for (const edge of outEdges) {
      if (nodeIds.has(edge.targetId)) {
        if (!edgeTypes || edgeTypes.length === 0 || edgeTypes.includes(edge.relationship.edgeType)) {
          collectedEdges.push(edge);
        }
      }
    }
  }

  // Deduplicate edges
  const seen = new Set<EdgeId>();
  const uniqueEdges = collectedEdges.filter(e => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  return createGraphSubgraph(
    generateSubgraphId(),
    filteredNodes,
    uniqueEdges,
    {
      description: `Subgraph by type: nodes=[${nodeTypes.join(',')}], edges=[${edgeTypes?.join(',') ?? 'all'}]`,
    },
  );
}

/**
 * Extract a subgraph using a custom predicate.
 * All nodes for which the predicate returns true are included,
 * along with all edges between them.
 *
 * @param repo - Graph repository
 * @param predicate - Node predicate function
 * @param edgePredicate - Optional edge predicate
 * @returns Extracted subgraph
 */
export async function extractSubgraphByPredicate(
  repo: GraphRepository,
  predicate: NodePredicate,
  edgePredicate?: EdgePredicate,
): Promise<GraphSubgraph> {
  const allNodes = await repo.getAllNodes();
  const filteredNodes = allNodes.filter(predicate);

  const nodeIds = new Set(filteredNodes.map(n => n.identity.id));
  const collectedEdges: GraphEdge[] = [];

  for (const node of filteredNodes) {
    const outEdges = await repo.getEdgesFrom(node.identity.id);
    for (const edge of outEdges) {
      if (nodeIds.has(edge.targetId)) {
        if (!edgePredicate || edgePredicate(edge)) {
          collectedEdges.push(edge);
        }
      }
    }
  }

  const seen = new Set<EdgeId>();
  const uniqueEdges = collectedEdges.filter(e => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  return createGraphSubgraph(
    generateSubgraphId(),
    filteredNodes,
    uniqueEdges,
    {
      description: `Subgraph by predicate (nodes=${filteredNodes.length}, edges=${uniqueEdges.length})`,
    },
  );
}

// ─── Internal Helpers ─────────────────────────────────────────

function nodeMatchesFilter(
  node: GraphNode,
  nodeTypes: readonly string[] | undefined,
  nodeFilter: NodePredicate | undefined,
): boolean {
  if (nodeTypes && nodeTypes.length > 0 && !nodeTypes.includes(node.identity.type)) return false;
  if (nodeFilter && !nodeFilter(node)) return false;
  return true;
}

function edgeMatchesFilter(
  edge: GraphEdge,
  edgeTypes: readonly string[] | undefined,
  edgeFilter: EdgePredicate | undefined,
): boolean {
  if (edgeTypes && edgeTypes.length > 0 && !edgeTypes.includes(edge.relationship.edgeType)) return false;
  if (edgeFilter && !edgeFilter(edge)) return false;
  return true;
}

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
      const [out, inc] = await Promise.all([
        repo.getEdgesFrom(nodeId),
        repo.getEdgesTo(nodeId),
      ]);
      return [...out, ...inc];
    }
    default:
      return repo.getEdgesFrom(nodeId);
  }
}

function getNeighborId(edge: GraphEdge, nodeId: NodeId, direction: 'outgoing' | 'incoming' | 'both'): NodeId {
  if (direction === 'incoming') return edge.sourceId;
  if (direction === 'outgoing') return edge.targetId;
  return edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
}
