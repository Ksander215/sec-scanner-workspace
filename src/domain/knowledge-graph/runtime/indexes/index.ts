/**
 * Knowledge Graph Runtime — Index System
 *
 * Provides O(1) lookups by node type, edge type, identity (id),
 * and metadata fields. Indexes are maintained incrementally —
 * each mutation updates only the affected index entries.
 *
 * Index types:
 * - NodeTypeIndex: NodeId[] by NodeType — O(1) lookup for all nodes of a given type
 * - EdgeTypeIndex: EdgeId[] by EdgeType — O(1) lookup for all edges of a given type
 * - IdentityIndex: NodeId by id string — O(1) identity resolution
 * - MetadataIndex: NodeId[] by metadata key-value — O(1) lookup for metadata matches
 *
 * No external dependencies.
 */

import type { GraphNode, GraphEdge } from '../../models/index.ts';
import type { NodeId, EdgeId } from '../../types/index.ts';
import { NodeType, EdgeType } from '../../types/index.ts';

// ─── NodeTypeIndex ───────────────────────────────────────────

/**
 * Index for fast lookup of node IDs by NodeType.
 * Maintains a Map<NodeType, Set<NodeId>> for O(1) type-based retrieval.
 */
export class NodeTypeIndex {
  private readonly _index: Map<string, Set<NodeId>> = new Map();

  constructor() {
    // Pre-initialize with all known node types
    for (const nt of Object.values(NodeType)) {
      this._index.set(nt, new Set());
    }
  }

  /** Add a node to the index. */
  add(node: GraphNode): void {
    const set = this._index.get(node.identity.type);
    if (set) {
      set.add(node.identity.id);
    } else {
      this._index.set(node.identity.type, new Set([node.identity.id]));
    }
  }

  /** Remove a node from the index. */
  remove(nodeId: NodeId, nodeType: string): void {
    const set = this._index.get(nodeType);
    if (set) {
      set.delete(nodeId);
    }
  }

  /** Get all node IDs of a given type. O(1). */
  getByType(type: string): ReadonlySet<NodeId> {
    return this._index.get(type) ?? new Set();
  }

  /** Get count of nodes by type. O(1). */
  countByType(type: string): number {
    return this._index.get(type)?.size ?? 0;
  }

  /** Get distribution of all node types. */
  getDistribution(): ReadonlyMap<string, number> {
    const dist = new Map<string, number>();
    for (const [type, set] of this._index) {
      if (set.size > 0) {
        dist.set(type, set.size);
      }
    }
    return dist;
  }

  /** Clear the index. */
  clear(): void {
    for (const set of this._index.values()) {
      set.clear();
    }
  }
}

// ─── EdgeTypeIndex ───────────────────────────────────────────

/**
 * Index for fast lookup of edge IDs by EdgeType.
 * Maintains a Map<EdgeType, Set<EdgeId>> for O(1) type-based retrieval.
 */
export class EdgeTypeIndex {
  private readonly _index: Map<string, Set<EdgeId>> = new Map();

  constructor() {
    // Pre-initialize with all known edge types
    for (const et of Object.values(EdgeType)) {
      this._index.set(et, new Set());
    }
  }

  /** Add an edge to the index. */
  add(edge: GraphEdge): void {
    const set = this._index.get(edge.relationship.edgeType);
    if (set) {
      set.add(edge.id);
    } else {
      this._index.set(edge.relationship.edgeType, new Set([edge.id]));
    }
  }

  /** Remove an edge from the index. */
  remove(edgeId: EdgeId, edgeType: string): void {
    const set = this._index.get(edgeType);
    if (set) {
      set.delete(edgeId);
    }
  }

  /** Get all edge IDs of a given type. O(1). */
  getByType(type: string): ReadonlySet<EdgeId> {
    return this._index.get(type) ?? new Set();
  }

  /** Get count of edges by type. O(1). */
  countByType(type: string): number {
    return this._index.get(type)?.size ?? 0;
  }

  /** Get distribution of all edge types. */
  getDistribution(): ReadonlyMap<string, number> {
    const dist = new Map<string, number>();
    for (const [type, set] of this._index) {
      if (set.size > 0) {
        dist.set(type, set.size);
      }
    }
    return dist;
  }

  /** Clear the index. */
  clear(): void {
    for (const set of this._index.values()) {
      set.clear();
    }
  }
}

// ─── IdentityIndex ───────────────────────────────────────────

/**
 * Index for O(1) identity resolution — given a node ID string,
 * quickly determine if it exists and retrieve the NodeId.
 * This is essentially a Set<string> for fast ID existence checks
 * beyond what the primary Map<NodeId, GraphNode> already provides.
 *
 * The real value is in tracking identity semantics — e.g., nodes
 * can be looked up by alternative identity keys (labels, aliases).
 */
export class IdentityIndex {
  private readonly _ids: Set<string> = new Set();
  private readonly _labelToIds: Map<string, Set<NodeId>> = new Map();

  /** Register a node's identity. */
  add(node: GraphNode): void {
    this._ids.add(node.identity.id);
    for (const label of node.identity.labels) {
      let set = this._labelToIds.get(label);
      if (!set) {
        set = new Set();
        this._labelToIds.set(label, set);
      }
      set.add(node.identity.id);
    }
  }

  /** Remove a node's identity. */
  remove(node: GraphNode): void {
    this._ids.delete(node.identity.id);
    for (const label of node.identity.labels) {
      const set = this._labelToIds.get(label);
      if (set) {
        set.delete(node.identity.id);
        if (set.size === 0) {
          this._labelToIds.delete(label);
        }
      }
    }
  }

  /** Check if a node ID exists. O(1). */
  has(id: string): boolean {
    return this._ids.has(id);
  }

  /** Find node IDs by label. O(1). */
  findByLabel(label: string): ReadonlySet<NodeId> {
    return this._labelToIds.get(label) ?? new Set();
  }

  /** Clear the index. */
  clear(): void {
    this._ids.clear();
    this._labelToIds.clear();
  }
}

// ─── MetadataIndex ───────────────────────────────────────────

/**
 * Index for fast lookup of nodes by metadata key-value pairs.
 * Supports indexing specific metadata fields for O(1) retrieval.
 *
 * Indexable fields: source, confidence ranges, tags.
 * Not all metadata is indexed — only commonly queried fields.
 */
export class MetadataIndex {
  private readonly _sourceIndex: Map<string, Set<NodeId>> = new Map();
  private readonly _tagIndex: Map<string, Set<NodeId>> = new Map();

  /** Add a node's metadata to the index. */
  add(node: GraphNode): void {
    // Index by source
    const source = node.metadata.source;
    let sourceSet = this._sourceIndex.get(source);
    if (!sourceSet) {
      sourceSet = new Set();
      this._sourceIndex.set(source, sourceSet);
    }
    sourceSet.add(node.identity.id);

    // Index by tags
    for (const tag of node.metadata.tags) {
      let tagSet = this._tagIndex.get(tag);
      if (!tagSet) {
        tagSet = new Set();
        this._tagIndex.set(tag, tagSet);
      }
      tagSet.add(node.identity.id);
    }
  }

  /** Remove a node's metadata from the index. */
  remove(node: GraphNode): void {
    // Remove from source index
    const source = node.metadata.source;
    const sourceSet = this._sourceIndex.get(source);
    if (sourceSet) {
      sourceSet.delete(node.identity.id);
      if (sourceSet.size === 0) {
        this._sourceIndex.delete(source);
      }
    }

    // Remove from tag index
    for (const tag of node.metadata.tags) {
      const tagSet = this._tagIndex.get(tag);
      if (tagSet) {
        tagSet.delete(node.identity.id);
        if (tagSet.size === 0) {
          this._tagIndex.delete(tag);
        }
      }
    }
  }

  /** Find node IDs by source. O(1). */
  findBySource(source: string): ReadonlySet<NodeId> {
    return this._sourceIndex.get(source) ?? new Set();
  }

  /** Find node IDs by tag. O(1). */
  findByTag(tag: string): ReadonlySet<NodeId> {
    return this._tagIndex.get(tag) ?? new Set();
  }

  /** Get distribution of sources. */
  getSourceDistribution(): ReadonlyMap<string, number> {
    const dist = new Map<string, number>();
    for (const [source, set] of this._sourceIndex) {
      dist.set(source, set.size);
    }
    return dist;
  }

  /** Clear the index. */
  clear(): void {
    this._sourceIndex.clear();
    this._tagIndex.clear();
  }
}

// ─── Composite Index Manager ────────────────────────────────

/**
 * Manages all indexes as a cohesive unit.
 * Provides a single point of index maintenance for the repository.
 */
export class IndexManager {
  readonly nodeTypeIndex = new NodeTypeIndex();
  readonly edgeTypeIndex = new EdgeTypeIndex();
  readonly identityIndex = new IdentityIndex();
  readonly metadataIndex = new MetadataIndex();

  /** Index a newly added node. */
  indexNode(node: GraphNode): void {
    this.nodeTypeIndex.add(node);
    this.identityIndex.add(node);
    this.metadataIndex.add(node);
  }

  /** De-index a removed node. */
  deindexNode(node: GraphNode): void {
    this.nodeTypeIndex.remove(node.identity.id, node.identity.type);
    this.identityIndex.remove(node);
    this.metadataIndex.remove(node);
  }

  /** Re-index a node (remove old, add new — for updates). */
  reindexNode(oldNode: GraphNode, newNode: GraphNode): void {
    if (oldNode.identity.type !== newNode.identity.type) {
      this.nodeTypeIndex.remove(oldNode.identity.id, oldNode.identity.type);
      this.nodeTypeIndex.add(newNode);
    }
    if (oldNode.identity.labels !== newNode.identity.labels) {
      this.identityIndex.remove(oldNode);
      this.identityIndex.add(newNode);
    }
    // Always re-index metadata since source/tags may change
    this.metadataIndex.remove(oldNode);
    this.metadataIndex.add(newNode);
  }

  /** Index a newly added edge. */
  indexEdge(edge: GraphEdge): void {
    this.edgeTypeIndex.add(edge);
  }

  /** De-index a removed edge. */
  deindexEdge(edge: GraphEdge): void {
    this.edgeTypeIndex.remove(edge.id, edge.relationship.edgeType);
  }

  /** Clear all indexes. */
  clear(): void {
    this.nodeTypeIndex.clear();
    this.edgeTypeIndex.clear();
    this.identityIndex.clear();
    this.metadataIndex.clear();
  }
}
