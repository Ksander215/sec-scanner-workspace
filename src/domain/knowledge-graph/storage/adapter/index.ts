/**
 * Knowledge Graph Storage Adapter — NetworkX Storage Adapter
 *
 * Full implementation of GraphStorageProvider backed by an
 * in-memory graph data structure compatible with NetworkX-style
 * operations (adjacency lists, directed graphs, etc.).
 *
 * This is the MVP backend. Architecture allows future replacement
 * with Neo4j, Memgraph, JanusGraph, or TigerGraph without
 * changing any business logic.
 *
 * Performance characteristics:
 * - Node lookup: O(1) via Map + Identity index
 * - Edge lookup: O(1) via Map
 * - Adjacency: O(k) where k = degree
 * - Type queries: O(1) via NodeType/RelationshipType indexes
 * - Batch: O(n) sequential (NetworkX limitation)
 * - Snapshot: O(n+m) full copy
 *
 * No external dependencies. No files. No network.
 */

import type { GraphNode, GraphEdge, GraphSnapshot, Metadata } from '../../models/index.ts';
import {
  createGraphNode,
  graphNodeToJSON,
  graphNodeFromJSON,
} from '../../models/index.ts';
import type { NodeId, EdgeId, SnapshotId, TransactionId } from '../../types/index.ts';
import type {
  StorageAdapterConfig,
  StorageConnectionState,
  StorageStatistics,
  StorageHealthResult,
  StorageHealthIssue,
  StorageOperationResult,
  BatchOperationResult,
  BatchError,
  ExportOptions,
  ExportResult,
  ImportOptions,
  ImportResult,
  StorageTransactionInfo,
} from '../types/index.ts';
import { DEFAULT_STORAGE_CONFIG, StorageConnectionState as ConnState } from '../types/index.ts';
import type { GraphStorageProvider } from '../provider/index.ts';
import { StorageIndexManager } from '../indexes/index.ts';
import { StorageCacheManager } from '../cache/index.ts';
import { StorageSnapshotManager } from '../snapshot/index.ts';
import { StorageTransactionManager } from '../transaction/index.ts';
import { exportGraph, parseImportData } from '../import-export/index.ts';
import { StorageStatisticsCollector } from '../statistics/index.ts';
import {
  StorageEventBus,
  createStorageConnectedEvent,
  createStorageDisconnectedEvent,
  createStorageSnapshotCreatedEvent,
  createStorageRecoveredEvent,
} from '../events/index.ts';

// ─── NetworkX Storage Adapter ─────────────────────────────────

export class NetworkXStorageAdapter implements GraphStorageProvider {
  // ─── Core Data Structures ─────────────────────────────────
  private readonly _nodes: Map<NodeId, GraphNode> = new Map();
  private readonly _edges: Map<EdgeId, GraphEdge> = new Map();
  private readonly _adjacencyOut: Map<NodeId, Set<EdgeId>> = new Map();
  private readonly _adjacencyIn: Map<NodeId, Set<EdgeId>> = new Map();

  // ─── Subsystems ───────────────────────────────────────────
  private readonly _indexManager: StorageIndexManager;
  private readonly _cacheManager: StorageCacheManager;
  private readonly _snapshotManager: StorageSnapshotManager;
  private readonly _transactionManager: StorageTransactionManager;
  private readonly _statisticsCollector: StorageStatisticsCollector;
  readonly eventBus: StorageEventBus;

  // ─── State ────────────────────────────────────────────────
  private _connectionState: StorageConnectionState = ConnState.Disconnected;
  private readonly _config: StorageAdapterConfig;

  constructor(config: Partial<StorageAdapterConfig> = {}) {
    this._config = { ...DEFAULT_STORAGE_CONFIG, ...config };
    this._indexManager = new StorageIndexManager();
    this._cacheManager = new StorageCacheManager({
      readCacheCapacity: this._config.readCacheCapacity,
      readCacheTTL: this._config.readCacheTTL,
      writeBufferThreshold: this._config.writeBufferThreshold,
    });
    this._snapshotManager = new StorageSnapshotManager(this._config.maxSnapshots);
    this._transactionManager = new StorageTransactionManager();
    this._statisticsCollector = new StorageStatisticsCollector();
    this.eventBus = new StorageEventBus();
  }

  // ─── Identity ─────────────────────────────────────────────

  get id(): string {
    return this._config.id;
  }

  get adapterType(): string {
    return 'networkx';
  }

  get connectionState(): StorageConnectionState {
    return this._connectionState;
  }

  get config(): StorageAdapterConfig {
    return this._config;
  }

  get isConnected(): boolean {
    return this._connectionState === ConnState.Connected;
  }

  // ─── Lifecycle ────────────────────────────────────────────

  async connect(): Promise<void> {
    if (this._connectionState === ConnState.Connected) return;

    this._connectionState = ConnState.Connecting;
    try {
      // NetworkX is in-memory, no external connection needed
      this._connectionState = ConnState.Connected;
      this.eventBus.emit(createStorageConnectedEvent(this.id, this.adapterType));
    } catch (e) {
      this._connectionState = ConnState.Error;
      throw e;
    }
  }

  async disconnect(): Promise<void> {
    if (this._connectionState === ConnState.Disconnected) return;

    // Flush write buffer before disconnecting
    if (this._config.enableWriteBuffer && !this._cacheManager.writeBuffer.isEmpty) {
      await this.flushWriteBuffer();
    }

    this._cacheManager.dispose();
    const wasGraceful = this._connectionState === ConnState.Connected;
    this._connectionState = ConnState.Disconnected;
    this.eventBus.emit(createStorageDisconnectedEvent(this.id, this.adapterType, wasGraceful));
  }

  // ─── Node Persistence ─────────────────────────────────────

  async createNode(node: GraphNode): Promise<StorageOperationResult<GraphNode>> {
    this._ensureConnected();
    this._ensureCapacity(1, 0);
    const start = performance.now();

    try {
      if (this._nodes.has(node.identity.id)) {
        return {
          success: false,
          data: null,
          error: `Node '${node.identity.id}' already exists`,
          durationMs: performance.now() - start,
          fromCache: false,
        };
      }

      this._nodes.set(node.identity.id, node);
      this._adjacencyOut.set(node.identity.id, new Set());
      this._adjacencyIn.set(node.identity.id, new Set());

      if (this._config.enableIndexes) {
        this._indexManager.indexNode(node);
      }

      this._cacheManager.readCache.setNode(node.identity.id, node);
      this._transactionManager.trackNodeCreated(node);
      this._statisticsCollector.recordWrite();

      return {
        success: true,
        data: node,
        error: null,
        durationMs: performance.now() - start,
        fromCache: false,
      };
    } catch (e) {
      return {
        success: false,
        data: null,
        error: (e as Error).message,
        durationMs: performance.now() - start,
        fromCache: false,
      };
    }
  }

  async updateNode(id: NodeId, properties: Metadata): Promise<StorageOperationResult<GraphNode>> {
    this._ensureConnected();
    const start = performance.now();

    try {
      const existing = this._nodes.get(id);
      if (!existing) {
        return {
          success: false,
          data: null,
          error: `Node '${id}' not found`,
          durationMs: performance.now() - start,
          fromCache: false,
        };
      }

      const updated = createGraphNode(
        existing.identity.id as string,
        existing.identity.type,
        {
          labels: existing.identity.labels,
          metadata: {
            createdAt: existing.metadata.createdAt,
            source: existing.metadata.source,
            confidence: existing.metadata.confidence,
            tags: existing.metadata.tags,
          },
          properties: { ...existing.properties, ...properties },
        },
      );

      this._nodes.set(id, updated);

      if (this._config.enableIndexes) {
        this._indexManager.reindexNode(existing, updated);
      }

      this._cacheManager.invalidateNode(id);
      this._cacheManager.readCache.setNode(id, updated);
      this._transactionManager.trackNodeUpdated(existing, updated);
      this._statisticsCollector.recordWrite();

      return {
        success: true,
        data: updated,
        error: null,
        durationMs: performance.now() - start,
        fromCache: false,
      };
    } catch (e) {
      return {
        success: false,
        data: null,
        error: (e as Error).message,
        durationMs: performance.now() - start,
        fromCache: false,
      };
    }
  }

  async deleteNode(id: NodeId): Promise<StorageOperationResult<boolean>> {
    this._ensureConnected();
    const start = performance.now();

    try {
      const node = this._nodes.get(id);
      if (!node) {
        return {
          success: false,
          data: null,
          error: `Node '${id}' not found`,
          durationMs: performance.now() - start,
          fromCache: false,
        };
      }

      // Remove all connected edges
      const removedEdges = this._removeAllEdgesForNode(id);

      // De-index removed edges
      if (this._config.enableIndexes) {
        for (const edge of removedEdges) {
          this._indexManager.deindexEdge(edge);
        }
        this._indexManager.deindexNode(node);
      }

      // Remove node
      this._nodes.delete(id);
      this._adjacencyOut.delete(id);
      this._adjacencyIn.delete(id);

      this._cacheManager.invalidateNode(id);
      for (const edge of removedEdges) {
        this._cacheManager.invalidateEdge(edge.id);
      }
      this._transactionManager.trackNodeDeleted(node);
      for (const edge of removedEdges) {
        this._transactionManager.trackEdgeDeleted(edge);
      }
      this._statisticsCollector.recordWrite();

      return {
        success: true,
        data: true,
        error: null,
        durationMs: performance.now() - start,
        fromCache: false,
      };
    } catch (e) {
      return {
        success: false,
        data: null,
        error: (e as Error).message,
        durationMs: performance.now() - start,
        fromCache: false,
      };
    }
  }

  async getNode(id: NodeId): Promise<StorageOperationResult<GraphNode | undefined>> {
    this._ensureConnected();
    const start = performance.now();

    // Check read cache first
    if (this._config.enableReadCache) {
      const cached = this._cacheManager.readCache.getNode(id);
      if (cached) {
        this._statisticsCollector.recordRead();
        return {
          success: true,
          data: cached,
          error: null,
          durationMs: performance.now() - start,
          fromCache: true,
        };
      }
    }

    const node = this._nodes.get(id);
    this._statisticsCollector.recordRead();

    if (node && this._config.enableReadCache) {
      this._cacheManager.readCache.setNode(id, node);
    }

    return {
      success: true,
      data: node,
      error: null,
      durationMs: performance.now() - start,
      fromCache: false,
    };
  }

  async hasNode(id: NodeId): Promise<boolean> {
    this._ensureConnected();
    return this._nodes.has(id);
  }

  async getAllNodes(): Promise<readonly GraphNode[]> {
    this._ensureConnected();
    return Array.from(this._nodes.values());
  }

  async nodeCount(): Promise<number> {
    this._ensureConnected();
    return this._nodes.size;
  }

  // ─── Node Batch Operations ────────────────────────────────

  async batchCreateNodes(nodes: readonly GraphNode[]): Promise<BatchOperationResult> {
    this._ensureConnected();
    this._ensureCapacity(nodes.length, 0);
    const start = performance.now();
    const errors: BatchError[] = [];
    let succeeded = 0;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      try {
        if (this._nodes.has(node.identity.id)) {
          errors.push({ index: i, id: node.identity.id, error: 'Already exists' });
          continue;
        }
        this._nodes.set(node.identity.id, node);
        this._adjacencyOut.set(node.identity.id, new Set());
        this._adjacencyIn.set(node.identity.id, new Set());
        if (this._config.enableIndexes) this._indexManager.indexNode(node);
        this._cacheManager.readCache.setNode(node.identity.id, node);
        this._transactionManager.trackNodeCreated(node);
        succeeded++;
      } catch (e) {
        errors.push({ index: i, id: node.identity.id, error: (e as Error).message });
      }
    }

    this._statisticsCollector.recordWrite();
    return {
      total: nodes.length,
      succeeded,
      failed: errors.length,
      errors,
      durationMs: performance.now() - start,
    };
  }

  async batchDeleteNodes(ids: readonly NodeId[]): Promise<BatchOperationResult> {
    this._ensureConnected();
    const start = performance.now();
    const errors: BatchError[] = [];
    let succeeded = 0;

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      try {
        const node = this._nodes.get(id);
        if (!node) {
          errors.push({ index: i, id, error: 'Not found' });
          continue;
        }

        const removedEdges = this._removeAllEdgesForNode(id);
        if (this._config.enableIndexes) {
          for (const edge of removedEdges) this._indexManager.deindexEdge(edge);
          this._indexManager.deindexNode(node);
        }
        this._nodes.delete(id);
        this._adjacencyOut.delete(id);
        this._adjacencyIn.delete(id);
        this._cacheManager.invalidateNode(id);
        this._transactionManager.trackNodeDeleted(node);
        for (const edge of removedEdges) this._transactionManager.trackEdgeDeleted(edge);
        succeeded++;
      } catch (e) {
        errors.push({ index: i, id, error: (e as Error).message });
      }
    }

    this._statisticsCollector.recordWrite();
    return {
      total: ids.length,
      succeeded,
      failed: errors.length,
      errors,
      durationMs: performance.now() - start,
    };
  }

  // ─── Edge Persistence ─────────────────────────────────────

  async createEdge(edge: GraphEdge): Promise<StorageOperationResult<GraphEdge>> {
    this._ensureConnected();
    this._ensureCapacity(0, 1);
    const start = performance.now();

    try {
      if (this._edges.has(edge.id)) {
        return {
          success: false,
          data: null,
          error: `Edge '${edge.id}' already exists`,
          durationMs: performance.now() - start,
          fromCache: false,
        };
      }

      // Verify source and target exist
      if (!this._nodes.has(edge.sourceId)) {
        return {
          success: false,
          data: null,
          error: `Source node '${edge.sourceId}' not found`,
          durationMs: performance.now() - start,
          fromCache: false,
        };
      }
      if (!this._nodes.has(edge.targetId)) {
        return {
          success: false,
          data: null,
          error: `Target node '${edge.targetId}' not found`,
          durationMs: performance.now() - start,
          fromCache: false,
        };
      }

      this._edges.set(edge.id, edge);

      // Update adjacency
      let outSet = this._adjacencyOut.get(edge.sourceId);
      if (!outSet) {
        outSet = new Set();
        this._adjacencyOut.set(edge.sourceId, outSet);
      }
      outSet.add(edge.id);

      let inSet = this._adjacencyIn.get(edge.targetId);
      if (!inSet) {
        inSet = new Set();
        this._adjacencyIn.set(edge.targetId, inSet);
      }
      inSet.add(edge.id);

      if (this._config.enableIndexes) this._indexManager.indexEdge(edge);
      this._cacheManager.readCache.setEdge(edge.id, edge);
      this._transactionManager.trackEdgeCreated(edge);
      this._statisticsCollector.recordWrite();

      return {
        success: true,
        data: edge,
        error: null,
        durationMs: performance.now() - start,
        fromCache: false,
      };
    } catch (e) {
      return {
        success: false,
        data: null,
        error: (e as Error).message,
        durationMs: performance.now() - start,
        fromCache: false,
      };
    }
  }

  async updateEdge(id: EdgeId, properties: Metadata): Promise<StorageOperationResult<GraphEdge>> {
    this._ensureConnected();
    const start = performance.now();

    try {
      const existing = this._edges.get(id);
      if (!existing) {
        return {
          success: false,
          data: null,
          error: `Edge '${id}' not found`,
          durationMs: performance.now() - start,
          fromCache: false,
        };
      }

      // Create updated edge (immutable pattern)
      const updated: GraphEdge = Object.freeze({
        ...existing,
        properties: Object.freeze({ ...existing.properties, ...properties }),
      });

      this._edges.set(id, updated);
      this._cacheManager.invalidateEdge(id);
      this._cacheManager.readCache.setEdge(id, updated);
      this._statisticsCollector.recordWrite();

      return {
        success: true,
        data: updated,
        error: null,
        durationMs: performance.now() - start,
        fromCache: false,
      };
    } catch (e) {
      return {
        success: false,
        data: null,
        error: (e as Error).message,
        durationMs: performance.now() - start,
        fromCache: false,
      };
    }
  }

  async deleteEdge(id: EdgeId): Promise<StorageOperationResult<boolean>> {
    this._ensureConnected();
    const start = performance.now();

    try {
      const edge = this._edges.get(id);
      if (!edge) {
        return {
          success: false,
          data: null,
          error: `Edge '${id}' not found`,
          durationMs: performance.now() - start,
          fromCache: false,
        };
      }

      this._edges.delete(id);

      // Update adjacency
      const outSet = this._adjacencyOut.get(edge.sourceId);
      if (outSet) outSet.delete(id);
      const inSet = this._adjacencyIn.get(edge.targetId);
      if (inSet) inSet.delete(id);

      if (this._config.enableIndexes) this._indexManager.deindexEdge(edge);
      this._cacheManager.invalidateEdge(id);
      this._transactionManager.trackEdgeDeleted(edge);
      this._statisticsCollector.recordWrite();

      return {
        success: true,
        data: true,
        error: null,
        durationMs: performance.now() - start,
        fromCache: false,
      };
    } catch (e) {
      return {
        success: false,
        data: null,
        error: (e as Error).message,
        durationMs: performance.now() - start,
        fromCache: false,
      };
    }
  }

  async getEdge(id: EdgeId): Promise<StorageOperationResult<GraphEdge | undefined>> {
    this._ensureConnected();
    const start = performance.now();

    if (this._config.enableReadCache) {
      const cached = this._cacheManager.readCache.getEdge(id);
      if (cached) {
        this._statisticsCollector.recordRead();
        return {
          success: true,
          data: cached,
          error: null,
          durationMs: performance.now() - start,
          fromCache: true,
        };
      }
    }

    const edge = this._edges.get(id);
    this._statisticsCollector.recordRead();

    if (edge && this._config.enableReadCache) {
      this._cacheManager.readCache.setEdge(id, edge);
    }

    return {
      success: true,
      data: edge,
      error: null,
      durationMs: performance.now() - start,
      fromCache: false,
    };
  }

  async hasEdge(id: EdgeId): Promise<boolean> {
    this._ensureConnected();
    return this._edges.has(id);
  }

  async getAllEdges(): Promise<readonly GraphEdge[]> {
    this._ensureConnected();
    return Array.from(this._edges.values());
  }

  async edgeCount(): Promise<number> {
    this._ensureConnected();
    return this._edges.size;
  }

  async getEdgesFrom(nodeId: NodeId): Promise<readonly GraphEdge[]> {
    this._ensureConnected();
    const edgeIds = this._adjacencyOut.get(nodeId);
    if (!edgeIds) return [];
    const result: GraphEdge[] = [];
    for (const id of edgeIds) {
      const edge = this._edges.get(id);
      if (edge) result.push(edge);
    }
    return result;
  }

  async getEdgesTo(nodeId: NodeId): Promise<readonly GraphEdge[]> {
    this._ensureConnected();
    const edgeIds = this._adjacencyIn.get(nodeId);
    if (!edgeIds) return [];
    const result: GraphEdge[] = [];
    for (const id of edgeIds) {
      const edge = this._edges.get(id);
      if (edge) result.push(edge);
    }
    return result;
  }

  // ─── Edge Batch Operations ────────────────────────────────

  async batchCreateEdges(edges: readonly GraphEdge[]): Promise<BatchOperationResult> {
    this._ensureConnected();
    this._ensureCapacity(0, edges.length);
    const start = performance.now();
    const errors: BatchError[] = [];
    let succeeded = 0;

    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      try {
        if (this._edges.has(edge.id)) {
          errors.push({ index: i, id: edge.id, error: 'Already exists' });
          continue;
        }
        if (!this._nodes.has(edge.sourceId)) {
          errors.push({ index: i, id: edge.id, error: `Source '${edge.sourceId}' not found` });
          continue;
        }
        if (!this._nodes.has(edge.targetId)) {
          errors.push({ index: i, id: edge.id, error: `Target '${edge.targetId}' not found` });
          continue;
        }

        this._edges.set(edge.id, edge);
        let outSet = this._adjacencyOut.get(edge.sourceId);
        if (!outSet) { outSet = new Set(); this._adjacencyOut.set(edge.sourceId, outSet); }
        outSet.add(edge.id);
        let inSet = this._adjacencyIn.get(edge.targetId);
        if (!inSet) { inSet = new Set(); this._adjacencyIn.set(edge.targetId, inSet); }
        inSet.add(edge.id);
        if (this._config.enableIndexes) this._indexManager.indexEdge(edge);
        this._cacheManager.readCache.setEdge(edge.id, edge);
        this._transactionManager.trackEdgeCreated(edge);
        succeeded++;
      } catch (e) {
        errors.push({ index: i, id: edge.id, error: (e as Error).message });
      }
    }

    this._statisticsCollector.recordWrite();
    return {
      total: edges.length,
      succeeded,
      failed: errors.length,
      errors,
      durationMs: performance.now() - start,
    };
  }

  async batchDeleteEdges(ids: readonly EdgeId[]): Promise<BatchOperationResult> {
    this._ensureConnected();
    const start = performance.now();
    const errors: BatchError[] = [];
    let succeeded = 0;

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      try {
        const edge = this._edges.get(id);
        if (!edge) {
          errors.push({ index: i, id, error: 'Not found' });
          continue;
        }
        this._edges.delete(id);
        const outSet = this._adjacencyOut.get(edge.sourceId);
        if (outSet) outSet.delete(id);
        const inSet = this._adjacencyIn.get(edge.targetId);
        if (inSet) inSet.delete(id);
        if (this._config.enableIndexes) this._indexManager.deindexEdge(edge);
        this._cacheManager.invalidateEdge(id);
        this._transactionManager.trackEdgeDeleted(edge);
        succeeded++;
      } catch (e) {
        errors.push({ index: i, id, error: (e as Error).message });
      }
    }

    this._statisticsCollector.recordWrite();
    return {
      total: ids.length,
      succeeded,
      failed: errors.length,
      errors,
      durationMs: performance.now() - start,
    };
  }

  // ─── Snapshot Persistence ─────────────────────────────────

  async saveSnapshot(metadata?: Metadata): Promise<GraphSnapshot> {
    this._ensureConnected();
    const nodes = Array.from(this._nodes.values());
    const edges = Array.from(this._edges.values());
    const { meta } = this._snapshotManager.saveSnapshot(nodes, edges, metadata);

    this.eventBus.emit(createStorageSnapshotCreatedEvent(
      this.id, this.adapterType, meta.id, meta.nodeCount, meta.edgeCount,
    ));

    return meta;
  }

  async restoreSnapshot(snapshotId: SnapshotId): Promise<GraphSnapshot> {
    this._ensureConnected();
    const data = this._snapshotManager.restoreSnapshot(snapshotId);

    // Clear current state
    this._nodes.clear();
    this._edges.clear();
    this._adjacencyOut.clear();
    this._adjacencyIn.clear();
    this._indexManager.clear();
    this._cacheManager.clear();

    // Restore from snapshot data
    for (const node of data.nodes) {
      this._nodes.set(node.identity.id, node);
      this._adjacencyOut.set(node.identity.id, new Set());
      this._adjacencyIn.set(node.identity.id, new Set());
      if (this._config.enableIndexes) this._indexManager.indexNode(node);
    }

    for (const edge of data.edges) {
      this._edges.set(edge.id, edge);
      let outSet = this._adjacencyOut.get(edge.sourceId);
      if (!outSet) { outSet = new Set(); this._adjacencyOut.set(edge.sourceId, outSet); }
      outSet.add(edge.id);
      let inSet = this._adjacencyIn.get(edge.targetId);
      if (!inSet) { inSet = new Set(); this._adjacencyIn.set(edge.targetId, inSet); }
      inSet.add(edge.id);
      if (this._config.enableIndexes) this._indexManager.indexEdge(edge);
    }

    const meta = this._snapshotManager.getSnapshot(snapshotId)!;

    this.eventBus.emit(createStorageRecoveredEvent(
      this.id, this.adapterType, snapshotId, data.nodes.length, data.edges.length,
    ));

    return meta;
  }

  async listSnapshots(): Promise<readonly GraphSnapshot[]> {
    this._ensureConnected();
    return this._snapshotManager.listSnapshots();
  }

  // ─── Transactions ─────────────────────────────────────────

  async beginTransaction(): Promise<TransactionId> {
    this._ensureConnected();
    if (!this._config.enableTransactions) {
      throw new Error('Transactions are disabled in this adapter configuration');
    }
    return this._transactionManager.begin(this._nodes, this._edges);
  }

  async commitTransaction(): Promise<StorageTransactionInfo> {
    this._ensureConnected();
    return this._transactionManager.commit();
  }

  async rollbackTransaction(): Promise<StorageTransactionInfo> {
    this._ensureConnected();
    const { info, nodeSnapshot, edgeSnapshot } = this._transactionManager.rollback();

    // Restore from transaction snapshot
    this._nodes.clear();
    this._edges.clear();
    this._adjacencyOut.clear();
    this._adjacencyIn.clear();
    this._indexManager.clear();
    this._cacheManager.clear();

    for (const [id, node] of nodeSnapshot) {
      this._nodes.set(id, node);
      this._adjacencyOut.set(id, new Set());
      this._adjacencyIn.set(id, new Set());
      if (this._config.enableIndexes) this._indexManager.indexNode(node);
    }

    for (const [id, edge] of edgeSnapshot) {
      this._edges.set(id, edge);
      let outSet = this._adjacencyOut.get(edge.sourceId);
      if (!outSet) { outSet = new Set(); this._adjacencyOut.set(edge.sourceId, outSet); }
      outSet.add(edge.id);
      let inSet = this._adjacencyIn.get(edge.targetId);
      if (!inSet) { inSet = new Set(); this._adjacencyIn.set(edge.targetId, inSet); }
      inSet.add(edge.id);
      if (this._config.enableIndexes) this._indexManager.indexEdge(edge);
    }

    return info;
  }

  get isTransactionActive(): boolean {
    return this._transactionManager.isActive;
  }

  // ─── Import / Export ──────────────────────────────────────

  async exportGraph(options: ExportOptions): Promise<ExportResult> {
    this._ensureConnected();
    const nodes = Array.from(this._nodes.values());
    const edges = Array.from(this._edges.values());
    return exportGraph(nodes, edges, options);
  }

  async importGraph(data: string, options: ImportOptions): Promise<ImportResult> {
    this._ensureConnected();
    const start = performance.now();
    const parsed = parseImportData(data, options.format);

    if (options.mergeStrategy === 'replace') {
      // Clear current state and import fresh
      this._nodes.clear();
      this._edges.clear();
      this._adjacencyOut.clear();
      this._adjacencyIn.clear();
      this._indexManager.clear();
      this._cacheManager.clear();
    }

    let nodesSkipped = 0;
    let edgesSkipped = 0;

    for (const node of parsed.nodes) {
      if (options.mergeStrategy === 'skip_existing' && this._nodes.has(node.identity.id)) {
        nodesSkipped++;
        continue;
      }

      if (options.mergeStrategy === 'merge' && this._nodes.has(node.identity.id)) {
        // Merge properties into existing node
        const existing = this._nodes.get(node.identity.id)!;
        const merged = createGraphNode(
          existing.identity.id as string,
          existing.identity.type,
          {
            labels: [...new Set([...existing.identity.labels, ...node.identity.labels])],
            metadata: existing.metadata,
            properties: { ...existing.properties, ...node.properties },
          },
        );
        this._nodes.set(node.identity.id, merged);
        if (this._config.enableIndexes) this._indexManager.reindexNode(existing, merged);
        this._cacheManager.invalidateNode(node.identity.id);
        this._cacheManager.readCache.setNode(node.identity.id, merged);
        continue;
      }

      this._nodes.set(node.identity.id, node);
      if (!this._adjacencyOut.has(node.identity.id)) {
        this._adjacencyOut.set(node.identity.id, new Set());
      }
      if (!this._adjacencyIn.has(node.identity.id)) {
        this._adjacencyIn.set(node.identity.id, new Set());
      }
      if (this._config.enableIndexes) this._indexManager.indexNode(node);
    }

    for (const edge of parsed.edges) {
      if (options.mergeStrategy === 'skip_existing' && this._edges.has(edge.id)) {
        edgesSkipped++;
        continue;
      }

      if (options.mergeStrategy === 'merge' && this._edges.has(edge.id)) {
        // Merge properties into existing edge
        const existing = this._edges.get(edge.id)!;
        const merged: GraphEdge = Object.freeze({
          ...existing,
          properties: Object.freeze({ ...existing.properties, ...edge.properties }),
        });
        this._edges.set(edge.id, merged);
        this._cacheManager.invalidateEdge(edge.id);
        this._cacheManager.readCache.setEdge(edge.id, merged);
        continue;
      }

      this._edges.set(edge.id, edge);
      let outSet = this._adjacencyOut.get(edge.sourceId);
      if (!outSet) { outSet = new Set(); this._adjacencyOut.set(edge.sourceId, outSet); }
      outSet.add(edge.id);
      let inSet = this._adjacencyIn.get(edge.targetId);
      if (!inSet) { inSet = new Set(); this._adjacencyIn.set(edge.targetId, inSet); }
      inSet.add(edge.id);
      if (this._config.enableIndexes) this._indexManager.indexEdge(edge);
    }

    return {
      nodesImported: parsed.nodes.length - nodesSkipped,
      edgesImported: parsed.edges.length - edgesSkipped,
      nodesSkipped,
      edgesSkipped,
      errors: parsed.errors,
      durationMs: performance.now() - start,
    };
  }

  // ─── Statistics & Health ──────────────────────────────────

  getStatistics(): StorageStatistics {
    return this._statisticsCollector.collect({
      nodeCount: this._nodes.size,
      edgeCount: this._edges.size,
      indexManager: this._indexManager,
      readCache: this._cacheManager.readCache,
      writeBufferPending: this._cacheManager.writeBuffer.size,
      snapshotCount: this._snapshotManager.snapshotCount,
      activeTransactions: this._transactionManager.activeTransactionCount,
    });
  }

  health(): StorageHealthResult {
    const issues: StorageHealthIssue[] = [];

    if (!this.isConnected) {
      issues.push({
        severity: 'error',
        component: 'connection',
        message: 'Storage adapter is not connected',
      });
    }

    // Verify index consistency
    if (this._config.enableIndexes) {
      const identityIndexSize = this._indexManager.identityIndex.size;
      if (identityIndexSize !== this._nodes.size) {
        issues.push({
          severity: 'warning',
          component: 'identity_index',
          message: `Identity index size (${identityIndexSize}) != node count (${this._nodes.size})`,
        });
      }
    }

    // Verify adjacency consistency
    for (const [nodeId, outSet] of this._adjacencyOut) {
      if (!this._nodes.has(nodeId)) {
        issues.push({
          severity: 'warning',
          component: 'adjacency_out',
          message: `Adjacency entry for non-existent node '${nodeId}'`,
        });
      }
    }

    return {
      healthy: issues.filter(i => i.severity === 'error').length === 0,
      connectionState: this._connectionState,
      issues,
      checkedAt: new Date().toISOString() as import('../../types/index.ts').Timestamp,
    };
  }

  verify(): StorageHealthResult {
    const issues: StorageHealthIssue[] = [];

    // Check 1: All edge endpoints exist as nodes
    for (const [edgeId, edge] of this._edges) {
      if (!this._nodes.has(edge.sourceId)) {
        issues.push({
          severity: 'error',
          component: 'edge_integrity',
          message: `Edge '${edgeId}' references non-existent source '${edge.sourceId}'`,
        });
      }
      if (!this._nodes.has(edge.targetId)) {
        issues.push({
          severity: 'error',
          component: 'edge_integrity',
          message: `Edge '${edgeId}' references non-existent target '${edge.targetId}'`,
        });
      }
    }

    // Check 2: Adjacency consistency
    for (const [nodeId, outSet] of this._adjacencyOut) {
      for (const edgeId of outSet) {
        const edge = this._edges.get(edgeId);
        if (!edge || edge.sourceId !== nodeId) {
          issues.push({
            severity: 'error',
            component: 'adjacency_out',
            message: `Adjacency out mismatch for node '${nodeId}', edge '${edgeId}'`,
          });
        }
      }
    }

    for (const [nodeId, inSet] of this._adjacencyIn) {
      for (const edgeId of inSet) {
        const edge = this._edges.get(edgeId);
        if (!edge || edge.targetId !== nodeId) {
          issues.push({
            severity: 'error',
            component: 'adjacency_in',
            message: `Adjacency in mismatch for node '${nodeId}', edge '${edgeId}'`,
          });
        }
      }
    }

    // Check 3: Index consistency
    if (this._config.enableIndexes) {
      if (this._indexManager.identityIndex.size !== this._nodes.size) {
        issues.push({
          severity: 'warning',
          component: 'identity_index',
          message: 'Identity index size mismatch',
        });
      }
    }

    return {
      healthy: issues.filter(i => i.severity === 'error').length === 0,
      connectionState: this._connectionState,
      issues,
      checkedAt: new Date().toISOString() as import('../../types/index.ts').Timestamp,
    };
  }

  async rebuildIndexes(): Promise<void> {
    this._indexManager.clear();
    for (const [, node] of this._nodes) {
      this._indexManager.indexNode(node);
    }
    for (const [, edge] of this._edges) {
      this._indexManager.indexEdge(edge);
    }
    this._indexManager.setRebuiltAt(new Date().toISOString() as import('../../types/index.ts').Timestamp);
  }

  // ─── Cache Management ─────────────────────────────────────

  clearCache(): void {
    this._cacheManager.clear();
  }

  async flushWriteBuffer(): Promise<BatchOperationResult> {
    // For NetworkX adapter, write buffer is a no-op since
    // all operations are applied immediately. But we maintain
    // the interface for consistency with remote backends.
    const pending = this._cacheManager.writeBuffer.size;
    this._cacheManager.writeBuffer.clear();
    return {
      total: pending,
      succeeded: pending,
      failed: 0,
      errors: [],
      durationMs: 0,
    };
  }

  // ─── Cleanup ──────────────────────────────────────────────

  async clear(): Promise<void> {
    this._nodes.clear();
    this._edges.clear();
    this._adjacencyOut.clear();
    this._adjacencyIn.clear();
    this._indexManager.clear();
    this._cacheManager.clear();
    // Snapshots are retained
  }

  // ─── Internal Helpers ─────────────────────────────────────

  /** Remove all edges connected to a node. Returns removed edges. */
  private _removeAllEdgesForNode(nodeId: NodeId): GraphEdge[] {
    const removed: GraphEdge[] = [];

    const outIds = this._adjacencyOut.get(nodeId);
    if (outIds) {
      for (const edgeId of outIds) {
        const edge = this._edges.get(edgeId);
        if (edge) {
          removed.push(edge);
          const targetIn = this._adjacencyIn.get(edge.targetId);
          if (targetIn) targetIn.delete(edgeId);
        }
        this._edges.delete(edgeId);
      }
      outIds.clear();
    }

    const inIds = this._adjacencyIn.get(nodeId);
    if (inIds) {
      for (const edgeId of inIds) {
        const edge = this._edges.get(edgeId);
        if (edge) {
          removed.push(edge);
          const sourceOut = this._adjacencyOut.get(edge.sourceId);
          if (sourceOut) sourceOut.delete(edgeId);
        }
        this._edges.delete(edgeId);
      }
      inIds.clear();
    }

    return removed;
  }

  /** Ensure the adapter is connected before operations */
  private _ensureConnected(): void {
    if (this._connectionState !== ConnState.Connected) {
      throw new Error(`Storage adapter is not connected (state: ${this._connectionState})`);
    }
  }

  /** Ensure capacity limits are not exceeded */
  private _ensureCapacity(additionalNodes: number = 0, additionalEdges: number = 0): void {
    if (this._config.maxNodes > 0 && this._nodes.size + additionalNodes > this._config.maxNodes) {
      throw new Error(`Node limit exceeded: ${this._nodes.size + additionalNodes} > ${this._config.maxNodes}`);
    }
    if (this._config.maxEdges > 0 && this._edges.size + additionalEdges > this._config.maxEdges) {
      throw new Error(`Edge limit exceeded: ${this._edges.size + additionalEdges} > ${this._config.maxEdges}`);
    }
  }
}
