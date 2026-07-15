/**
 * Knowledge Graph Storage Adapter — Storage Indexes
 *
 * Index system optimized for the NetworkX adapter.
 * Provides O(1) lookups for:
 * - Identity: node by ID
 * - NodeType: nodes by type
 * - RelationshipType: edges by relationship type
 * - Metadata: nodes by metadata keys
 * - Labels: nodes by label
 *
 * Indexes are incrementally maintained on each mutation.
 * Full rebuild is available via rebuildIndexes().
 */

import type { GraphNode, GraphEdge } from '../../models/index.ts';
import type { NodeId, EdgeId, Timestamp } from '../../types/index.ts';
import { StorageIndexType } from '../types/index.ts';
import type { StorageIndexStats } from '../types/index.ts';

// ─── Identity Index ───────────────────────────────────────────

/** O(1) lookup for nodes by their ID */
export class StorageIdentityIndex {
  private readonly _index: Map<NodeId, GraphNode> = new Map();

  add(node: GraphNode): void {
    this._index.set(node.identity.id, node);
  }

  remove(id: NodeId): void {
    this._index.delete(id);
  }

  get(id: NodeId): GraphNode | undefined {
    return this._index.get(id);
  }

  has(id: NodeId): boolean {
    return this._index.has(id);
  }

  get size(): number {
    return this._index.size;
  }

  clear(): void {
    this._index.clear();
  }

  getStats(lastRebuiltAt: Timestamp | null): StorageIndexStats {
    return {
      type: StorageIndexType.Identity,
      entryCount: this._index.size,
      memoryUsageBytes: this._index.size * 200,
      lastRebuiltAt,
    };
  }
}

// ─── NodeType Index ───────────────────────────────────────────

/** O(1) lookup for node IDs by NodeType */
export class StorageNodeTypeIndex {
  private readonly _index: Map<string, Set<NodeId>> = new Map();

  add(node: GraphNode): void {
    let set = this._index.get(node.identity.type);
    if (!set) {
      set = new Set();
      this._index.set(node.identity.type, set);
    }
    set.add(node.identity.id);
  }

  remove(id: NodeId, type: string): void {
    const set = this._index.get(type);
    if (set) {
      set.delete(id);
      if (set.size === 0) this._index.delete(type);
    }
  }

  getByType(type: string): ReadonlySet<NodeId> {
    return this._index.get(type) ?? new Set();
  }

  countByType(type: string): number {
    return this._index.get(type)?.size ?? 0;
  }

  getDistribution(): ReadonlyMap<string, number> {
    const dist = new Map<string, number>();
    for (const [type, set] of this._index) {
      if (set.size > 0) dist.set(type, set.size);
    }
    return dist;
  }

  get size(): number {
    return this._index.size;
  }

  clear(): void {
    this._index.clear();
  }

  getStats(lastRebuiltAt: Timestamp | null): StorageIndexStats {
    let totalEntries = 0;
    for (const set of this._index.values()) totalEntries += set.size;
    return {
      type: StorageIndexType.NodeType,
      entryCount: totalEntries,
      memoryUsageBytes: totalEntries * 80,
      lastRebuiltAt,
    };
  }
}

// ─── RelationshipType Index ───────────────────────────────────

/** O(1) lookup for edge IDs by relationship type */
export class StorageRelationshipTypeIndex {
  private readonly _index: Map<string, Set<EdgeId>> = new Map();

  add(edge: GraphEdge): void {
    let set = this._index.get(edge.relationship.edgeType);
    if (!set) {
      set = new Set();
      this._index.set(edge.relationship.edgeType, set);
    }
    set.add(edge.id);
  }

  remove(id: EdgeId, type: string): void {
    const set = this._index.get(type);
    if (set) {
      set.delete(id);
      if (set.size === 0) this._index.delete(type);
    }
  }

  getByType(type: string): ReadonlySet<EdgeId> {
    return this._index.get(type) ?? new Set();
  }

  countByType(type: string): number {
    return this._index.get(type)?.size ?? 0;
  }

  getDistribution(): ReadonlyMap<string, number> {
    const dist = new Map<string, number>();
    for (const [type, set] of this._index) {
      if (set.size > 0) dist.set(type, set.size);
    }
    return dist;
  }

  get size(): number {
    return this._index.size;
  }

  clear(): void {
    this._index.clear();
  }

  getStats(lastRebuiltAt: Timestamp | null): StorageIndexStats {
    let totalEntries = 0;
    for (const set of this._index.values()) totalEntries += set.size;
    return {
      type: StorageIndexType.RelationshipType,
      entryCount: totalEntries,
      memoryUsageBytes: totalEntries * 80,
      lastRebuiltAt,
    };
  }
}

// ─── Metadata Index ───────────────────────────────────────────

/** O(1) lookup for nodes by metadata source, tags, and arbitrary key-value pairs */
export class StorageMetadataIndex {
  private readonly _sourceIndex: Map<string, Set<NodeId>> = new Map();
  private readonly _tagIndex: Map<string, Set<NodeId>> = new Map();
  private readonly _propertyIndex: Map<string, Map<string, Set<NodeId>>> = new Map();

  add(node: GraphNode): void {
    // Index by source
    let sourceSet = this._sourceIndex.get(node.metadata.source);
    if (!sourceSet) {
      sourceSet = new Set();
      this._sourceIndex.set(node.metadata.source, sourceSet);
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

    // Index by arbitrary properties
    for (const [key, value] of Object.entries(node.properties)) {
      const strValue = String(value);
      let keyMap = this._propertyIndex.get(key);
      if (!keyMap) {
        keyMap = new Map();
        this._propertyIndex.set(key, keyMap);
      }
      let valueSet = keyMap.get(strValue);
      if (!valueSet) {
        valueSet = new Set();
        keyMap.set(strValue, valueSet);
      }
      valueSet.add(node.identity.id);
    }
  }

  remove(node: GraphNode): void {
    // Remove from source index
    const sourceSet = this._sourceIndex.get(node.metadata.source);
    if (sourceSet) {
      sourceSet.delete(node.identity.id);
      if (sourceSet.size === 0) this._sourceIndex.delete(node.metadata.source);
    }

    // Remove from tag index
    for (const tag of node.metadata.tags) {
      const tagSet = this._tagIndex.get(tag);
      if (tagSet) {
        tagSet.delete(node.identity.id);
        if (tagSet.size === 0) this._tagIndex.delete(tag);
      }
    }

    // Remove from property index
    for (const [key, value] of Object.entries(node.properties)) {
      const strValue = String(value);
      const keyMap = this._propertyIndex.get(key);
      if (keyMap) {
        const valueSet = keyMap.get(strValue);
        if (valueSet) {
          valueSet.delete(node.identity.id);
          if (valueSet.size === 0) keyMap.delete(strValue);
        }
        if (keyMap.size === 0) this._propertyIndex.delete(key);
      }
    }
  }

  findBySource(source: string): ReadonlySet<NodeId> {
    return this._sourceIndex.get(source) ?? new Set();
  }

  findByTag(tag: string): ReadonlySet<NodeId> {
    return this._tagIndex.get(tag) ?? new Set();
  }

  findByProperty(key: string, value: string): ReadonlySet<NodeId> {
    return this._propertyIndex.get(key)?.get(value) ?? new Set();
  }

  clear(): void {
    this._sourceIndex.clear();
    this._tagIndex.clear();
    this._propertyIndex.clear();
  }

  getStats(lastRebuiltAt: Timestamp | null): StorageIndexStats {
    let totalEntries = 0;
    for (const set of this._sourceIndex.values()) totalEntries += set.size;
    for (const set of this._tagIndex.values()) totalEntries += set.size;
    return {
      type: StorageIndexType.Metadata,
      entryCount: totalEntries,
      memoryUsageBytes: totalEntries * 100,
      lastRebuiltAt,
    };
  }
}

// ─── Labels Index ─────────────────────────────────────────────

/** O(1) lookup for node IDs by label */
export class StorageLabelsIndex {
  private readonly _index: Map<string, Set<NodeId>> = new Map();

  add(node: GraphNode): void {
    for (const label of node.identity.labels) {
      let set = this._index.get(label);
      if (!set) {
        set = new Set();
        this._index.set(label, set);
      }
      set.add(node.identity.id);
    }
  }

  remove(node: GraphNode): void {
    for (const label of node.identity.labels) {
      const set = this._index.get(label);
      if (set) {
        set.delete(node.identity.id);
        if (set.size === 0) this._index.delete(label);
      }
    }
  }

  findByLabel(label: string): ReadonlySet<NodeId> {
    return this._index.get(label) ?? new Set();
  }

  getDistribution(): ReadonlyMap<string, number> {
    const dist = new Map<string, number>();
    for (const [label, set] of this._index) {
      if (set.size > 0) dist.set(label, set.size);
    }
    return dist;
  }

  get size(): number {
    return this._index.size;
  }

  clear(): void {
    this._index.clear();
  }

  getStats(lastRebuiltAt: Timestamp | null): StorageIndexStats {
    let totalEntries = 0;
    for (const set of this._index.values()) totalEntries += set.size;
    return {
      type: StorageIndexType.Labels,
      entryCount: totalEntries,
      memoryUsageBytes: totalEntries * 80,
      lastRebuiltAt,
    };
  }
}

// ─── Composite Index Manager ──────────────────────────────────

/** Manages all storage indexes as a cohesive unit */
export class StorageIndexManager {
  readonly identityIndex = new StorageIdentityIndex();
  readonly nodeTypeIndex = new StorageNodeTypeIndex();
  readonly relationshipTypeIndex = new StorageRelationshipTypeIndex();
  readonly metadataIndex = new StorageMetadataIndex();
  readonly labelsIndex = new StorageLabelsIndex();

  private _lastRebuiltAt: Timestamp | null = null;

  /** Index a newly added node */
  indexNode(node: GraphNode): void {
    this.identityIndex.add(node);
    this.nodeTypeIndex.add(node);
    this.metadataIndex.add(node);
    this.labelsIndex.add(node);
  }

  /** De-index a removed node */
  deindexNode(node: GraphNode): void {
    this.identityIndex.remove(node.identity.id);
    this.nodeTypeIndex.remove(node.identity.id, node.identity.type);
    this.metadataIndex.remove(node);
    this.labelsIndex.remove(node);
  }

  /** Re-index a node (remove old, add new) */
  reindexNode(oldNode: GraphNode, newNode: GraphNode): void {
    this.deindexNode(oldNode);
    this.indexNode(newNode);
  }

  /** Index a newly added edge */
  indexEdge(edge: GraphEdge): void {
    this.relationshipTypeIndex.add(edge);
  }

  /** De-index a removed edge */
  deindexEdge(edge: GraphEdge): void {
    this.relationshipTypeIndex.remove(edge.id, edge.relationship.edgeType);
  }

  /** Clear all indexes */
  clear(): void {
    this.identityIndex.clear();
    this.nodeTypeIndex.clear();
    this.relationshipTypeIndex.clear();
    this.metadataIndex.clear();
    this.labelsIndex.clear();
    this._lastRebuiltAt = null;
  }

  /** Get statistics for all indexes */
  getAllStats(): StorageIndexStats[] {
    const t = this._lastRebuiltAt;
    return [
      this.identityIndex.getStats(t),
      this.nodeTypeIndex.getStats(t),
      this.relationshipTypeIndex.getStats(t),
      this.metadataIndex.getStats(t),
      this.labelsIndex.getStats(t),
    ];
  }

  /** Total memory usage across all indexes */
  get totalMemoryUsage(): number {
    return this.getAllStats().reduce((sum, s) => sum + s.memoryUsageBytes, 0);
  }

  /** Set the last rebuild timestamp */
  setRebuiltAt(timestamp: Timestamp): void {
    this._lastRebuiltAt = timestamp;
  }
}
