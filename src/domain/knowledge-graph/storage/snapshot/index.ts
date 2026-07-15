/**
 * Knowledge Graph Storage Adapter — Snapshot Persistence
 *
 * Provides point-in-time snapshots for the storage adapter.
 * Snapshots capture the complete graph state (nodes, edges, indexes)
 * and can be restored atomically.
 *
 * Features:
 * - saveSnapshot(): capture current state
 * - restoreSnapshot(): rollback to a snapshot
 * - listSnapshots(): enumerate all snapshots
 * - Automatic cleanup of old snapshots (configurable retention)
 */

import type { GraphNode, GraphEdge, GraphSnapshot, Metadata } from '../../models/index.ts';
import { createGraphSnapshot } from '../../models/index.ts';
import type { NodeId, EdgeId, SnapshotId, Timestamp } from '../../types/index.ts';
import { brandSnapshotId, brandVersionId, SnapshotStatus } from '../../types/index.ts';
import type { StorageSnapshotData } from '../types/index.ts';

// ─── Snapshot Entry ───────────────────────────────────────────

interface SnapshotEntry {
  readonly meta: GraphSnapshot;
  readonly data: StorageSnapshotData;
}

// ─── Snapshot Persistence ─────────────────────────────────────

export class StorageSnapshotManager {
  private readonly _snapshots: Map<SnapshotId, SnapshotEntry> = new Map();
  private readonly _maxSnapshots: number;
  private _snapshotCounter = 0;
  private _versionCounter = 0;

  constructor(maxSnapshots: number = 0) {
    this._maxSnapshots = maxSnapshots;
  }

  /** Generate unique snapshot ID */
  private generateSnapshotId(): SnapshotId {
    return brandSnapshotId(`snap_${Date.now().toString(36)}_${(this._snapshotCounter++).toString(36)}`);
  }

  /** Generate unique version string */
  private generateVersion(): string {
    return `v${++this._versionCounter}`;
  }

  /**
   * Save a snapshot of the current graph state.
   * Returns the snapshot metadata.
   */
  saveSnapshot(
    nodes: readonly GraphNode[],
    edges: readonly GraphEdge[],
    metadata?: Metadata,
  ): { meta: GraphSnapshot; data: StorageSnapshotData } {
    const id = this.generateSnapshotId();
    const version = this.generateVersion();
    const now = new Date().toISOString() as Timestamp;

    // Compute type distributions
    const nodeTypeCounts: Record<string, number> = {};
    for (const node of nodes) {
      const t = node.identity.type;
      nodeTypeCounts[t] = (nodeTypeCounts[t] ?? 0) + 1;
    }

    const edgeTypeCounts: Record<string, number> = {};
    for (const edge of edges) {
      const t = edge.relationship.edgeType;
      edgeTypeCounts[t] = (edgeTypeCounts[t] ?? 0) + 1;
    }

    const meta = createGraphSnapshot(
      id as string,
      version,
      nodes.length,
      edges.length,
      {
        nodeTypeCounts,
        edgeTypeCounts,
        createdAt: now,
        status: SnapshotStatus.Active,
        metadata: metadata ?? {},
      },
    );

    const data: StorageSnapshotData = Object.freeze({
      id,
      nodes: [...nodes],
      edges: [...edges],
      createdAt: now,
      metadata: metadata ?? {},
    });

    const entry: SnapshotEntry = Object.freeze({ meta, data });
    this._snapshots.set(id, entry);

    // Enforce retention limit
    if (this._maxSnapshots > 0 && this._snapshots.size > this._maxSnapshots) {
      const sorted = Array.from(this._snapshots.entries())
        .sort(([, a], [, b]) => a.meta.createdAt.localeCompare(b.meta.createdAt));
      while (this._snapshots.size > this._maxSnapshots && sorted.length > 0) {
        const [oldestId] = sorted.shift()!;
        this._snapshots.delete(oldestId);
      }
    }

    return { meta, data };
  }

  /**
   * Restore a snapshot by ID.
   * Returns the snapshot data for the adapter to apply.
   */
  restoreSnapshot(snapshotId: SnapshotId): StorageSnapshotData {
    const entry = this._snapshots.get(snapshotId);
    if (!entry) {
      throw new Error(`Snapshot '${snapshotId}' not found`);
    }
    return entry.data;
  }

  /** List all snapshots ordered by creation time */
  listSnapshots(): readonly GraphSnapshot[] {
    return Array.from(this._snapshots.values())
      .map(entry => entry.meta)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /** Get snapshot metadata by ID */
  getSnapshot(id: SnapshotId): GraphSnapshot | undefined {
    return this._snapshots.get(id)?.meta;
  }

  /** Check if a snapshot exists */
  hasSnapshot(id: SnapshotId): boolean {
    return this._snapshots.has(id);
  }

  /** Number of stored snapshots */
  get snapshotCount(): number {
    return this._snapshots.size;
  }

  /** Clear all snapshots */
  clear(): void {
    this._snapshots.clear();
  }
}
