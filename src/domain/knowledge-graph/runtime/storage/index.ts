/**
 * Knowledge Graph Runtime — Internal Storage
 *
 * Low-level storage engine for the in-memory graph.
 * Provides O(1) operations for most CRUD via Map-based data structures.
 *
 * Storage Layout:
 * - nodes: Map<NodeId, GraphNode> — primary node store
 * - edges: Map<EdgeId, GraphEdge> — primary edge store
 * - adjacencyOut: Map<NodeId, Set<EdgeId>> — outgoing edges per node
 * - adjacencyIn: Map<NodeId, Set<EdgeId>> — incoming edges per node
 *
 * All mutations go through the storage layer to maintain index consistency.
 * No external dependencies. No network. No persistence.
 */

import type { GraphNode, GraphEdge } from '../../models/index.ts';
import type { NodeId, EdgeId } from '../../types/index.ts';

// ─── Storage Types ────────────────────────────────────────────

/** Snapshot of the entire storage state for transaction rollback */
export interface StorageSnapshot {
  readonly nodes: ReadonlyMap<NodeId, GraphNode>;
  readonly edges: ReadonlyMap<EdgeId, GraphEdge>;
  readonly adjacencyOut: ReadonlyMap<NodeId, ReadonlySet<EdgeId>>;
  readonly adjacencyIn: ReadonlyMap<NodeId, ReadonlySet<EdgeId>>;
}

// ─── Internal Storage ────────────────────────────────────────

/**
 * InternalStorage manages the core data structures for the graph.
 * All operations are O(1) for lookup, insert, and delete.
 * Adjacency lists provide O(k) neighbor access where k is degree.
 */
export class InternalStorage {
  private readonly _nodes: Map<NodeId, GraphNode> = new Map();
  private readonly _edges: Map<EdgeId, GraphEdge> = new Map();
  private readonly _adjacencyOut: Map<NodeId, Set<EdgeId>> = new Map();
  private readonly _adjacencyIn: Map<NodeId, Set<EdgeId>> = new Map();

  // ─── Node Operations ─────────────────────────────────────

  /** Store a node. Returns true if this was a new insertion. */
  setNode(id: NodeId, node: GraphNode): boolean {
    const isNew = !this._nodes.has(id);
    this._nodes.set(id, node);
    if (isNew) {
      this._adjacencyOut.set(id, new Set());
      this._adjacencyIn.set(id, new Set());
    }
    return isNew;
  }

  /** Get a node by ID. O(1). */
  getNode(id: NodeId): GraphNode | undefined {
    return this._nodes.get(id);
  }

  /** Delete a node by ID. Also cleans up adjacency sets. O(1) + O(degree). */
  deleteNode(id: NodeId): GraphNode | undefined {
    const node = this._nodes.get(id);
    if (!node) return undefined;

    this._nodes.delete(id);
    this._adjacencyOut.delete(id);
    this._adjacencyIn.delete(id);

    return node;
  }

  /** Check if a node exists. O(1). */
  hasNode(id: NodeId): boolean {
    return this._nodes.has(id);
  }

  /** Get all nodes. Returns the internal map for read-only iteration. */
  get nodes(): ReadonlyMap<NodeId, GraphNode> {
    return this._nodes;
  }

  /** Count of nodes. O(1). */
  get nodeCount(): number {
    return this._nodes.size;
  }

  // ─── Edge Operations ─────────────────────────────────────

  /** Store an edge and update adjacency indexes. */
  setEdge(id: EdgeId, edge: GraphEdge): boolean {
    const isNew = !this._edges.has(id);
    this._edges.set(id, edge);

    // Update adjacency indexes
    let outSet = this._adjacencyOut.get(edge.sourceId);
    if (!outSet) {
      outSet = new Set();
      this._adjacencyOut.set(edge.sourceId, outSet);
    }
    outSet.add(id);

    let inSet = this._adjacencyIn.get(edge.targetId);
    if (!inSet) {
      inSet = new Set();
      this._adjacencyIn.set(edge.targetId, inSet);
    }
    inSet.add(id);

    return isNew;
  }

  /** Get an edge by ID. O(1). */
  getEdge(id: EdgeId): GraphEdge | undefined {
    return this._edges.get(id);
  }

  /** Delete an edge by ID and update adjacency indexes. */
  deleteEdge(id: EdgeId): GraphEdge | undefined {
    const edge = this._edges.get(id);
    if (!edge) return undefined;

    this._edges.delete(id);

    // Update adjacency indexes
    const outSet = this._adjacencyOut.get(edge.sourceId);
    if (outSet) {
      outSet.delete(id);
    }

    const inSet = this._adjacencyIn.get(edge.targetId);
    if (inSet) {
      inSet.delete(id);
    }

    return edge;
  }

  /** Check if an edge exists. O(1). */
  hasEdge(id: EdgeId): boolean {
    return this._edges.has(id);
  }

  /** Get all edges. */
  get edges(): ReadonlyMap<EdgeId, GraphEdge> {
    return this._edges;
  }

  /** Count of edges. O(1). */
  get edgeCount(): number {
    return this._edges.size;
  }

  // ─── Adjacency Operations ────────────────────────────────

  /** Get outgoing edge IDs from a node. O(1). */
  getOutgoingEdgeIds(nodeId: NodeId): ReadonlySet<EdgeId> {
    return this._adjacencyOut.get(nodeId) ?? new Set();
  }

  /** Get incoming edge IDs to a node. O(1). */
  getIncomingEdgeIds(nodeId: NodeId): ReadonlySet<EdgeId> {
    return this._adjacencyIn.get(nodeId) ?? new Set();
  }

  /** Get outgoing edges (full objects) from a node. O(k) where k = out-degree. */
  getOutgoingEdges(nodeId: NodeId): GraphEdge[] {
    const edgeIds = this._adjacencyOut.get(nodeId);
    if (!edgeIds) return [];
    const result: GraphEdge[] = [];
    for (const id of edgeIds) {
      const edge = this._edges.get(id);
      if (edge) result.push(edge);
    }
    return result;
  }

  /** Get incoming edges (full objects) to a node. O(k) where k = in-degree. */
  getIncomingEdges(nodeId: NodeId): GraphEdge[] {
    const edgeIds = this._adjacencyIn.get(nodeId);
    if (!edgeIds) return [];
    const result: GraphEdge[] = [];
    for (const id of edgeIds) {
      const edge = this._edges.get(id);
      if (edge) result.push(edge);
    }
    return result;
  }

  // ─── Bulk Operations ─────────────────────────────────────

  /** Remove all edges connected to a given node. Returns removed edges. */
  removeAllEdgesForNode(nodeId: NodeId): GraphEdge[] {
    const removed: GraphEdge[] = [];

    // Collect outgoing edges
    const outIds = this._adjacencyOut.get(nodeId);
    if (outIds) {
      for (const edgeId of outIds) {
        const edge = this._edges.get(edgeId);
        if (edge) {
          removed.push(edge);
          // Update target's incoming set
          const targetIn = this._adjacencyIn.get(edge.targetId);
          if (targetIn) targetIn.delete(edgeId);
        }
        this._edges.delete(edgeId);
      }
      outIds.clear();
    }

    // Collect incoming edges
    const inIds = this._adjacencyIn.get(nodeId);
    if (inIds) {
      for (const edgeId of inIds) {
        const edge = this._edges.get(edgeId);
        if (edge) {
          removed.push(edge);
          // Update source's outgoing set
          const sourceOut = this._adjacencyOut.get(edge.sourceId);
          if (sourceOut) sourceOut.delete(edgeId);
        }
        this._edges.delete(edgeId);
      }
      inIds.clear();
    }

    return removed;
  }

  /** Clear all data. O(n+m) but usually called rarely. */
  clear(): void {
    this._nodes.clear();
    this._edges.clear();
    this._adjacencyOut.clear();
    this._adjacencyIn.clear();
  }

  // ─── Snapshot ────────────────────────────────────────────

  /** Create a deep snapshot of the current storage state. */
  snapshot(): StorageSnapshot {
    const nodesCopy = new Map<NodeId, GraphNode>();
    for (const [id, node] of this._nodes) {
      nodesCopy.set(id, node);
    }

    const edgesCopy = new Map<EdgeId, GraphEdge>();
    for (const [id, edge] of this._edges) {
      edgesCopy.set(id, edge);
    }

    const adjOutCopy = new Map<NodeId, ReadonlySet<EdgeId>>();
    for (const [id, set] of this._adjacencyOut) {
      adjOutCopy.set(id, new Set(set));
    }

    const adjInCopy = new Map<NodeId, ReadonlySet<EdgeId>>();
    for (const [id, set] of this._adjacencyIn) {
      adjInCopy.set(id, new Set(set));
    }

    return Object.freeze({
      nodes: nodesCopy,
      edges: edgesCopy,
      adjacencyOut: adjOutCopy,
      adjacencyIn: adjInCopy,
    });
  }

  /** Restore storage from a snapshot. */
  restore(snap: StorageSnapshot): void {
    this.clear();

    for (const [id, node] of snap.nodes) {
      this._nodes.set(id, node);
    }
    for (const [id, edge] of snap.edges) {
      this._edges.set(id, edge);
    }
    for (const [id, set] of snap.adjacencyOut) {
      this._adjacencyOut.set(id, new Set(set));
    }
    for (const [id, set] of snap.adjacencyIn) {
      this._adjacencyIn.set(id, new Set(set));
    }
  }

  // ─── Memory Estimation ──────────────────────────────────

  /** Rough memory usage estimate in bytes. */
  get memoryUsage(): number {
    // Each Map entry: ~80 bytes overhead + key/value sizes
    // Each Set entry: ~40 bytes overhead
    const nodeSize = this._nodes.size * 200; // ~200 bytes per node (rough)
    const edgeSize = this._edges.size * 150; // ~150 bytes per edge (rough)
    const adjOutSize = this._adjacencyOut.size * 80;
    const adjInSize = this._adjacencyIn.size * 80;
    return nodeSize + edgeSize + adjOutSize + adjInSize;
  }
}
