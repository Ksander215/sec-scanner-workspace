/**
 * Experience Runtime — Experience Graph
 * TASK-AIS-004A.000  Subsystem 6
 *
 * Builds a directed graph of relationships between user experience elements
 * (habits, preferences, goals, projects, domains, skills, contexts).
 * Supports BFS path finding, subgraph extraction, and per-user views.
 *
 * Conforms to: DOM-002, ADR-014, CON-001
 */

import type { Identifier } from '../types/common.js';
import type {
  ExperienceNodeId,
  ExperienceEdge,
  ExperienceNode,
} from './types.js';
import { ExperienceGraphError } from './errors.js';

// ─── Internal storage types ──────────────────────────────────

/** Index of edges by source node */
interface NodeEdgeIndex {
  readonly outgoing: readonly ExperienceEdge[];
  readonly incoming: readonly ExperienceEdge[];
}


// ─── ExperienceGraph ─────────────────────────────────────────

/**
 * Graph data structure for experience elements.
 * Nodes represent experience entities; edges represent typed relationships.
 * Internal maps provide O(1) lookups by ID, O(k) edge queries per node.
 */
export class ExperienceGraph {
  private readonly nodes = new Map<ExperienceNodeId, ExperienceNode>();
  private readonly edges = new Map<Identifier, ExperienceEdge>();
  private readonly nodeEdgeIndex = new Map<ExperienceNodeId, NodeEdgeIndex>();
  private readonly userNodes = new Map<string, Set<ExperienceNodeId>>();

  // ─── Node operations ─────────────────────────────────────

  /** Adds a node to the graph. Throws if a node with the same ID already exists. */
  addNode(node: ExperienceNode): ExperienceNode {
    if (this.nodes.has(node.id)) {
      throw new ExperienceGraphError(
        `Duplicate node: ${node.id}`,
        { nodeId: node.id },
      );
    }
    this.nodes.set(node.id, node);
    this.nodeEdgeIndex.set(node.id, { outgoing: [], incoming: [] });

    // Maintain user index
    const userSet = this.userNodes.get(node.userIdHash);
    if (userSet) {
      (userSet as Set<ExperienceNodeId>).add(node.id);
    } else {
      this.userNodes.set(node.userIdHash, new Set([node.id]));
    }

    return node;
  }

  /** Removes a node and all connected edges from the graph. */
  removeNode(nodeId: ExperienceNodeId): void {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new ExperienceGraphError(
        `Node not found: ${nodeId}`,
        { nodeId },
      );
    }

    // Remove all edges connected to this node
    const index = this.nodeEdgeIndex.get(nodeId);
    if (index) {
      for (const edge of index.outgoing) {
        this.edges.delete(edge.id);
        this.removeEdgeFromIndex(edge.targetId, edge.id, 'incoming');
      }
      for (const edge of index.incoming) {
        this.edges.delete(edge.id);
        this.removeEdgeFromIndex(edge.sourceId, edge.id, 'outgoing');
      }
      this.nodeEdgeIndex.delete(nodeId);
    }

    // Remove from user index
    const userSet = this.userNodes.get(node.userIdHash);
    if (userSet) {
      (userSet as Set<ExperienceNodeId>).delete(nodeId);
      if (userSet.size === 0) {
        this.userNodes.delete(node.userIdHash);
      }
    }

    this.nodes.delete(nodeId);
  }

  /** Returns a node by ID, or null if not found. */
  getNode(nodeId: ExperienceNodeId): ExperienceNode | null {
    return this.nodes.get(nodeId) ?? null;
  }

  // ─── Edge operations ──────────────────────────────────────

  /** Adds an edge. Validates source and target nodes exist. Throws on duplicate edge ID. */
  addEdge(edge: ExperienceEdge): ExperienceEdge {
    if (this.edges.has(edge.id)) {
      throw new ExperienceGraphError(
        `Duplicate edge: ${edge.id}`,
        { edgeId: edge.id },
      );
    }
    if (!this.nodes.has(edge.sourceId)) {
      throw new ExperienceGraphError(
        `Source node not found: ${edge.sourceId}`,
        { edgeId: edge.id, sourceId: edge.sourceId },
      );
    }
    if (!this.nodes.has(edge.targetId)) {
      throw new ExperienceGraphError(
        `Target node not found: ${edge.targetId}`,
        { edgeId: edge.id, targetId: edge.targetId },
      );
    }

    this.edges.set(edge.id, edge);
    this.addEdgeToIndex(edge.sourceId, edge, 'outgoing');
    this.addEdgeToIndex(edge.targetId, edge, 'incoming');

    return edge;
  }

  /** Removes an edge by ID. */
  removeEdge(edgeId: Identifier): void {
    const edge = this.edges.get(edgeId);
    if (!edge) {
      throw new ExperienceGraphError(
        `Edge not found: ${edgeId}`,
        { edgeId },
      );
    }

    this.removeEdgeFromIndex(edge.sourceId, edgeId, 'outgoing');
    this.removeEdgeFromIndex(edge.targetId, edgeId, 'incoming');
    this.edges.delete(edgeId);
  }

  /** Returns all edges connected to a node (both incoming and outgoing). */
  getEdgesForNode(nodeId: ExperienceNodeId): readonly ExperienceEdge[] {
    const index = this.nodeEdgeIndex.get(nodeId);
    if (!index) return [];
    return [...index.outgoing, ...index.incoming];
  }

  // ─── Traversal ────────────────────────────────────────────

  /** Returns the neighbor nodes of a given node (nodes connected by an edge). */
  getNeighbors(nodeId: ExperienceNodeId): readonly ExperienceNode[] {
    const index = this.nodeEdgeIndex.get(nodeId);
    if (!index) return [];

    const neighborIds = new Set<ExperienceNodeId>();
    for (const edge of index.outgoing) {
      neighborIds.add(edge.targetId);
    }
    for (const edge of index.incoming) {
      neighborIds.add(edge.sourceId);
    }

    const result: ExperienceNode[] = [];
    for (const id of neighborIds) {
      const node = this.nodes.get(id);
      if (node) result.push(node);
    }
    return result;
  }

  /**
   * BFS shortest path between two nodes.
   * Returns the ordered list of node IDs from `from` to `to` (inclusive),
   * or an empty array if no path exists.
   */
  findPath(from: ExperienceNodeId, to: ExperienceNodeId): readonly ExperienceNodeId[] {
    if (!this.nodes.has(from) || !this.nodes.has(to)) {
      return [];
    }
    if (from === to) return [from];

    const visited = new Set<ExperienceNodeId>([from]);
    const queue: ExperienceNodeId[] = [from];
    const parent = new Map<ExperienceNodeId, ExperienceNodeId>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      const index = this.nodeEdgeIndex.get(current);
      if (!index) continue;

      for (const edge of index.outgoing) {
        const neighbor = edge.targetId;
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        parent.set(neighbor, current);

        if (neighbor === to) {
          // Reconstruct path
          const path: ExperienceNodeId[] = [to];
          let node: ExperienceNodeId | undefined = to;
          while (node !== undefined && node !== from) {
            node = parent.get(node);
            if (node !== undefined) {
              path.push(node);
            }
          }
          return path.reverse();
        }

        queue.push(neighbor);
      }
    }

    return [];
  }

  /**
   * Extracts a subgraph rooted at the given node up to the specified depth.
   * Depth 0 returns only the root node with no edges.
   * Depth 1 returns the root and its direct neighbors with connecting edges.
   */
  getSubgraph(
    nodeId: ExperienceNodeId,
    depth: number,
  ): { nodes: readonly ExperienceNode[]; edges: readonly ExperienceEdge[] } {
    if (!this.nodes.has(nodeId)) {
      return { nodes: [], edges: [] };
    }

    const subNodes = new Map<ExperienceNodeId, ExperienceNode>();
    const subEdges = new Set<Identifier>();

    const root = this.nodes.get(nodeId)!;
    subNodes.set(nodeId, root);

    // BFS up to given depth
    let frontier = [nodeId];
    let remaining = depth;

    while (remaining > 0 && frontier.length > 0) {
      const nextFrontier: ExperienceNodeId[] = [];

      for (const currentId of frontier) {
        const index = this.nodeEdgeIndex.get(currentId);
        if (!index) continue;

        for (const edge of index.outgoing) {
          const neighborId = edge.targetId;
          if (!subNodes.has(neighborId)) {
            const neighbor = this.nodes.get(neighborId);
            if (neighbor) {
              subNodes.set(neighborId, neighbor);
              nextFrontier.push(neighborId);
            }
          }
          subEdges.add(edge.id);
        }

        for (const edge of index.incoming) {
          const neighborId = edge.sourceId;
          if (!subNodes.has(neighborId)) {
            const neighbor = this.nodes.get(neighborId);
            if (neighbor) {
              subNodes.set(neighborId, neighbor);
              nextFrontier.push(neighborId);
            }
          }
          subEdges.add(edge.id);
        }
      }

      frontier = nextFrontier;
      remaining--;
    }

    const edgeResults: ExperienceEdge[] = [];
    for (const edgeId of subEdges) {
      const edge = this.edges.get(edgeId);
      if (edge) edgeResults.push(edge);
    }

    return {
      nodes: [...subNodes.values()],
      edges: edgeResults,
    };
  }

  /**
   * Returns the full subgraph for a user — all nodes and edges belonging to that user.
   */
  getUserGraph(userIdHash: string): {
    nodes: readonly ExperienceNode[];
    edges: readonly ExperienceEdge[];
  } {
    const nodeIds = this.userNodes.get(userIdHash);
    if (!nodeIds || nodeIds.size === 0) {
      return { nodes: [], edges: [] };
    }

    const nodes: ExperienceNode[] = [];
    const edgeIds = new Set<Identifier>();

    for (const nodeId of nodeIds) {
      const node = this.nodes.get(nodeId);
      if (node) {
        nodes.push(node);
        const index = this.nodeEdgeIndex.get(nodeId);
        if (index) {
          for (const edge of index.outgoing) {
            if (nodeIds.has(edge.targetId)) {
              edgeIds.add(edge.id);
            }
          }
        }
      }
    }

    const edges: ExperienceEdge[] = [];
    for (const edgeId of edgeIds) {
      const edge = this.edges.get(edgeId);
      if (edge) edges.push(edge);
    }

    return { nodes, edges };
  }

  // ─── Internal helpers ─────────────────────────────────────

  private addEdgeToIndex(
    nodeId: ExperienceNodeId,
    edge: ExperienceEdge,
    direction: 'outgoing' | 'incoming',
  ): void {
    const index = this.nodeEdgeIndex.get(nodeId);
    if (!index) return;
    const arr = index[direction] as ExperienceEdge[];
    arr.push(edge);
  }

  private removeEdgeFromIndex(
    nodeId: ExperienceNodeId,
    edgeId: Identifier,
    direction: 'outgoing' | 'incoming',
  ): void {
    const index = this.nodeEdgeIndex.get(nodeId);
    if (!index) return;
    const arr = index[direction] as ExperienceEdge[];
    const pos = arr.findIndex(e => e.id === edgeId);
    if (pos >= 0) {
      arr.splice(pos, 1);
    }
  }
}
