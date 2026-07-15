/**
 * Knowledge Graph Runtime — Snapshot Engine
 *
 * Provides point-in-time snapshots of the entire graph state.
 * Snapshots are immutable and can be used for:
 * - Rollback / restore
 * - Version tracking
 * - Diff computation between states
 * - Audit trail
 *
 * No external dependencies.
 */

import type { InternalStorage, StorageSnapshot } from '../storage/index.ts';
import type { GraphSnapshot } from '../../models/index.ts';
import type { NodeId, EdgeId, SnapshotId } from '../../types/index.ts';
import { brandSnapshotId, brandVersionId } from '../../types/index.ts';
import { createGraphSnapshot } from '../../models/index.ts';
import { SnapshotError } from '../../errors/index.ts';
import { IndexManager } from '../indexes/index.ts';

// ─── Snapshot Data ───────────────────────────────────────────

/** Internal representation of a snapshot, including the raw storage state. */
interface SnapshotEntry {
  readonly meta: GraphSnapshot;
  readonly storageSnapshot: StorageSnapshot;
}

/** Diff between two snapshots. */
export interface SnapshotDiff {
  readonly fromSnapshotId: SnapshotId;
  readonly toSnapshotId: SnapshotId;
  readonly nodesAdded: number;
  readonly nodesRemoved: number;
  readonly edgesAdded: number;
  readonly edgesRemoved: number;
  readonly nodeIdsAdded: ReadonlySet<NodeId>;
  readonly nodeIdsRemoved: ReadonlySet<NodeId>;
  readonly edgeIdsAdded: ReadonlySet<EdgeId>;
  readonly edgeIdsRemoved: ReadonlySet<EdgeId>;
}

// ─── Snapshot Engine ─────────────────────────────────────────

/**
 * SnapshotEngine creates, stores, and manages graph snapshots.
 * Snapshots capture the full state of the graph at a point in time.
 */
export class SnapshotEngine {
  private readonly _snapshots: Map<SnapshotId, SnapshotEntry> = new Map();
  private readonly _storage: InternalStorage;
  private readonly _indexManager: IndexManager;
  private _versionCounter: number = 0;

  constructor(storage: InternalStorage, indexManager: IndexManager) {
    this._storage = storage;
    this._indexManager = indexManager;
  }

  /** Generate a unique snapshot ID. */
  private generateSnapshotId(): SnapshotId {
    return brandSnapshotId(`snap_${Date.now().toString(36)}_${this._versionCounter.toString(36)}`);
  }

  /** Generate a unique version string. */
  private generateVersion(): string {
    this._versionCounter++;
    return `v${this._versionCounter}`;
  }

  /**
   * Create a snapshot of the current graph state.
   * The snapshot is immutable — subsequent mutations do not affect it.
   */
  createSnapshot(metadata?: Record<string, string | number | boolean | null>): GraphSnapshot {
    const id = this.generateSnapshotId();
    const version = this.generateVersion();

    // Capture storage state
    const storageSnapshot = this._storage.snapshot();

    // Compute type distributions from index
    const nodeTypeDist = this._indexManager.nodeTypeIndex.getDistribution();
    const edgeTypeDist = this._indexManager.edgeTypeIndex.getDistribution();

    // Convert distributions to StringMap
    const nodeTypeCounts: Record<string, number> = {};
    for (const [type, count] of nodeTypeDist) {
      nodeTypeCounts[type] = count;
    }

    const edgeTypeCounts: Record<string, number> = {};
    for (const [type, count] of edgeTypeDist) {
      edgeTypeCounts[type] = count;
    }

    // Create snapshot metadata
    const meta = createGraphSnapshot(
      id as string,
      version,
      this._storage.nodeCount,
      this._storage.edgeCount,
      {
        nodeTypeCounts,
        edgeTypeCounts,
        metadata: metadata ?? {},
      },
    );

    // Store the entry
    const entry: SnapshotEntry = Object.freeze({
      meta,
      storageSnapshot,
    });
    this._snapshots.set(id, entry);

    return meta;
  }

  /**
   * Restore the graph to a specific snapshot state.
   * This replaces ALL current data with the snapshot's data.
   * Indexes are rebuilt from scratch.
   */
  restoreSnapshot(snapshotId: SnapshotId): GraphSnapshot {
    const entry = this._snapshots.get(snapshotId);
    if (!entry) {
      throw new SnapshotError(`Snapshot '${snapshotId}' not found`, { snapshotId });
    }

    // Restore storage from snapshot
    this._storage.restore(entry.storageSnapshot);

    // Rebuild all indexes
    this._indexManager.clear();
    for (const [, node] of this._storage.nodes) {
      this._indexManager.indexNode(node);
    }
    for (const [, edge] of this._storage.edges) {
      this._indexManager.indexEdge(edge);
    }

    return entry.meta;
  }

  /**
   * Compute the diff between two snapshots.
   * Returns sets of added/removed node and edge IDs.
   */
  diffSnapshots(fromId: SnapshotId, toId: SnapshotId): SnapshotDiff {
    const fromEntry = this._snapshots.get(fromId);
    const toEntry = this._snapshots.get(toId);

    if (!fromEntry) {
      throw new SnapshotError(`Source snapshot '${fromId}' not found`, { snapshotId: fromId });
    }
    if (!toEntry) {
      throw new SnapshotError(`Target snapshot '${toId}' not found`, { snapshotId: toId });
    }

    const fromNodeIds = new Set(fromEntry.storageSnapshot.nodes.keys());
    const toNodeIds = new Set(toEntry.storageSnapshot.nodes.keys());
    const fromEdgeIds = new Set(fromEntry.storageSnapshot.edges.keys());
    const toEdgeIds = new Set(toEntry.storageSnapshot.edges.keys());

    // Compute additions
    const nodeIdsAdded = new Set<NodeId>();
    for (const id of toNodeIds) {
      if (!fromNodeIds.has(id)) nodeIdsAdded.add(id);
    }

    const edgeIdsAdded = new Set<EdgeId>();
    for (const id of toEdgeIds) {
      if (!fromEdgeIds.has(id)) edgeIdsAdded.add(id);
    }

    // Compute removals
    const nodeIdsRemoved = new Set<NodeId>();
    for (const id of fromNodeIds) {
      if (!toNodeIds.has(id)) nodeIdsRemoved.add(id);
    }

    const edgeIdsRemoved = new Set<EdgeId>();
    for (const id of fromEdgeIds) {
      if (!toEdgeIds.has(id)) edgeIdsRemoved.add(id);
    }

    return Object.freeze({
      fromSnapshotId: fromId,
      toSnapshotId: toId,
      nodesAdded: nodeIdsAdded.size,
      nodesRemoved: nodeIdsRemoved.size,
      edgesAdded: edgeIdsAdded.size,
      edgesRemoved: edgeIdsRemoved.size,
      nodeIdsAdded,
      nodeIdsRemoved,
      edgeIdsAdded,
      edgeIdsRemoved,
    });
  }

  /**
   * List all snapshots, ordered by creation time (oldest first).
   */
  listSnapshots(): readonly GraphSnapshot[] {
    return Array.from(this._snapshots.values())
      .map(entry => entry.meta)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /**
   * Get a snapshot's metadata by ID.
   */
  getSnapshot(id: SnapshotId): GraphSnapshot | undefined {
    return this._snapshots.get(id)?.meta;
  }

  /**
   * Check if a snapshot exists.
   */
  hasSnapshot(id: SnapshotId): boolean {
    return this._snapshots.has(id);
  }

  /** Number of stored snapshots. */
  get snapshotCount(): number {
    return this._snapshots.size;
  }

  /** Clear all snapshots. */
  clear(): void {
    this._snapshots.clear();
  }
}
