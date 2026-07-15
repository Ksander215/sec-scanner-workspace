/**
 * Knowledge Graph Runtime — InMemoryGraphRepository
 *
 * Full implementation of the GraphRepository contract plus extended
 * runtime operations: batch, find, list, clear, consistency checks,
 * statistics, and event publishing.
 *
 * All operations are synchronous under the hood (in-memory) but
 * return Promises to satisfy the async contract interface.
 *
 * Performance guarantees:
 * - lookup: O(1)
 * - create: O(1)
 * - delete: O(1) + O(degree) for edge cleanup
 * - find by type: O(1) via indexes
 * - adjacent nodes: O(k) where k = degree
 *
 * No external dependencies.
 */

import type { GraphRepository } from '../../contracts/index.ts';
import type { GraphNode, GraphEdge, GraphStatistics } from '../../models/index.ts';
import type { NodeId, EdgeId, SnapshotId } from '../../types/index.ts';
import {
  DuplicateNodeError,
  DuplicateEdgeError,
  GraphValidationError,
  SelfReferenceError,
} from '../../errors/index.ts';
import { createGraphStatistics } from '../../models/index.ts';
import { createNodeCreatedEvent, createNodeUpdatedEvent, createNodeDeletedEvent, createEdgeCreatedEvent, createEdgeDeletedEvent, createSnapshotCreatedEvent } from '../../events/index.ts';
import type { AnyGraphDomainEvent, EventPublisher } from '../../adapters/index.ts';
import { InternalStorage } from '../storage/index.ts';
import { IndexManager } from '../indexes/index.ts';
import { CacheManager } from '../cache/index.ts';
import { SnapshotEngine } from '../snapshot/index.ts';
import { TransactionManager, ChangeSet } from '../transaction/index.ts';
import type { SnapshotDiff } from '../snapshot/index.ts';

// ─── Extended Repository Interface ──────────────────────────

/**
 * Extended repository interface beyond the base GraphRepository contract.
 * These methods are specific to the in-memory runtime implementation.
 */
export interface ExtendedRepositoryOperations {
  // Batch operations
  addNodes(nodes: readonly GraphNode[]): Promise<void>;
  addEdges(edges: readonly GraphEdge[]): Promise<void>;
  removeNodes(ids: readonly NodeId[]): Promise<void>;
  removeEdges(ids: readonly EdgeId[]): Promise<void>;
  replaceNodes(nodes: readonly GraphNode[]): Promise<void>;
  replaceEdges(edges: readonly GraphEdge[]): Promise<void>;

  // Find operations (leverage indexes)
  findNodesByType(type: string): Promise<readonly GraphNode[]>;
  findEdgesByType(type: string): Promise<readonly GraphEdge[]>;
  findNodesByLabel(label: string): Promise<readonly GraphNode[]>;
  findNodesBySource(source: string): Promise<readonly GraphNode[]>;
  findNodesByTag(tag: string): Promise<readonly GraphNode[]>;

  // List operations
  listNodes(limit?: number, offset?: number): Promise<readonly GraphNode[]>;
  listEdges(limit?: number, offset?: number): Promise<readonly GraphEdge[]>;

  // Clear
  clear(): Promise<void>;

  // Statistics
  getStatistics(): Promise<GraphStatistics>;

  // Consistency
  checkConsistency(): Promise<ConsistencyReport>;

  // Snapshot operations (delegated to SnapshotEngine)
  createSnapshot(metadata?: Record<string, string | number | boolean | null>): Promise<import('../../models/index.ts').GraphSnapshot>;
  restoreSnapshot(snapshotId: SnapshotId): Promise<import('../../models/index.ts').GraphSnapshot>;
  diffSnapshots(fromId: SnapshotId, toId: SnapshotId): Promise<SnapshotDiff>;
  listSnapshots(): readonly import('../../models/index.ts').GraphSnapshot[];

  // Transaction operations (delegated to TransactionManager)
  beginTransaction(): TransactionId;
  commitTransaction(): ChangeSet;
  rollbackTransaction(): void;
  abortAllTransactions(): void;
  get transactionDepth(): number;
  get isTransactionActive(): boolean;

  // Cache
  getCacheStats(): CacheStatsReport;
  invalidateCache(): void;
}

// ─── Consistency Report ─────────────────────────────────────

export interface ConsistencyReport {
  readonly valid: boolean;
  readonly danglingEdges: number;
  readonly duplicateNodeIds: number;
  readonly duplicateEdgeIds: number;
  readonly selfReferences: number;
  readonly invalidNodeReferences: number;
  readonly duplicateRelationships: number;
  readonly issues: readonly ConsistencyIssue[];
}

export interface ConsistencyIssue {
  readonly severity: 'error' | 'warning';
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

// ─── Cache Stats Report ─────────────────────────────────────

export interface CacheStatsReport {
  readonly nodeCacheSize: number;
  readonly edgeCacheSize: number;
  readonly traversalCacheSize: number;
  readonly nodeCacheHitRate: number;
  readonly nodeCacheCapacity: number;
  readonly edgeCacheCapacity: number;
  readonly traversalCacheCapacity: number;
}

// ─── InMemoryGraphRepository ────────────────────────────────

/**
 * In-memory implementation of GraphRepository with extended operations.
 *
 * Architecture:
 * - InternalStorage: core Maps and adjacency indexes
 * - IndexManager: type/identity/metadata indexes
 * - CacheManager: LRU caches for hot data
 * - SnapshotEngine: point-in-time snapshots
 * - TransactionManager: ACID-like transactions
 * - EventPublisher: domain event publishing (injected)
 */
export class InMemoryGraphRepository implements GraphRepository, ExtendedRepositoryOperations {
  private readonly _storage: InternalStorage;
  private readonly _indexManager: IndexManager;
  private readonly _cacheManager: CacheManager;
  private readonly _snapshotEngine: SnapshotEngine;
  private readonly _transactionManager: TransactionManager;
  private readonly _eventPublisher: EventPublisher | null;
  private readonly _pendingEvents: AnyGraphDomainEvent[] = [];

  constructor(options: {
    eventPublisher?: EventPublisher;
    nodeCacheCapacity?: number;
    edgeCacheCapacity?: number;
    traversalCacheCapacity?: number;
  } = {}) {
    this._storage = new InternalStorage();
    this._indexManager = new IndexManager();
    this._cacheManager = new CacheManager({
      nodeCacheCapacity: options.nodeCacheCapacity,
      edgeCacheCapacity: options.edgeCacheCapacity,
      traversalCacheCapacity: options.traversalCacheCapacity,
    });
    this._snapshotEngine = new SnapshotEngine(this._storage, this._indexManager);
    this._transactionManager = new TransactionManager(
      this._storage,
      this._indexManager,
      this._cacheManager,
    );
    this._eventPublisher = options.eventPublisher ?? null;
  }

  // ─── GraphRepository Contract (async) ────────────────────

  async addNode(node: GraphNode): Promise<void> {
    this.createNode(node);
  }

  async getNode(id: NodeId): Promise<GraphNode | undefined> {
    return this.readNode(id);
  }

  async removeNode(id: NodeId): Promise<boolean> {
    return this.deleteNode(id);
  }

  async updateNodeProperties(id: NodeId, properties: Record<string, unknown>): Promise<GraphNode> {
    return this.updateNode(id, properties);
  }

  async addEdge(edge: GraphEdge): Promise<void> {
    this.createEdge(edge);
  }

  async getEdge(id: EdgeId): Promise<GraphEdge | undefined> {
    return this.readEdge(id);
  }

  async removeEdge(id: EdgeId): Promise<boolean> {
    return this.deleteEdge(id);
  }

  async getEdgesFrom(nodeId: NodeId): Promise<readonly GraphEdge[]> {
    // Check cache first
    const cached = this._cacheManager.traversalCache.get(nodeId, 'out');
    if (cached) return cached;

    const edges = this._storage.getOutgoingEdges(nodeId);
    this._cacheManager.traversalCache.set(nodeId, 'out', edges);
    return edges;
  }

  async getEdgesTo(nodeId: NodeId): Promise<readonly GraphEdge[]> {
    const cached = this._cacheManager.traversalCache.get(nodeId, 'in');
    if (cached) return cached;

    const edges = this._storage.getIncomingEdges(nodeId);
    this._cacheManager.traversalCache.set(nodeId, 'in', edges);
    return edges;
  }

  async getAllNodes(): Promise<readonly GraphNode[]> {
    return Array.from(this._storage.nodes.values());
  }

  async getAllEdges(): Promise<readonly GraphEdge[]> {
    return Array.from(this._storage.edges.values());
  }

  async nodeCount(): Promise<number> {
    return this._storage.nodeCount;
  }

  async edgeCount(): Promise<number> {
    return this._storage.edgeCount;
  }

  async hasNode(id: NodeId): Promise<boolean> {
    return this._storage.hasNode(id);
  }

  async hasEdge(id: EdgeId): Promise<boolean> {
    return this._storage.hasEdge(id);
  }

  // ─── Synchronous CRUD Operations ─────────────────────────

  /** Create a node. Throws DuplicateNodeError if ID exists. */
  createNode(node: GraphNode): void {
    if (this._storage.hasNode(node.identity.id)) {
      throw new DuplicateNodeError(node.identity.id as string);
    }
    this._storage.setNode(node.identity.id, node);
    this._indexManager.indexNode(node);
    this._cacheManager.nodeCache.set(node.identity.id, node);
    this._transactionManager.trackNodeCreated(node);
    this._emitEvent(createNodeCreatedEvent(
      node.identity.id as string,
      node.identity.type,
      node.identity.labels,
    ));
  }

  /** Read a node by ID. O(1). */
  readNode(id: NodeId): GraphNode | undefined {
    // Check cache first
    const cached = this._cacheManager.nodeCache.get(id);
    if (cached) {
      this._cacheManager.nodeCache.recordHit();
      return cached;
    }
    this._cacheManager.nodeCache.recordMiss();

    const node = this._storage.getNode(id);
    if (node) {
      this._cacheManager.nodeCache.set(id, node);
    }
    return node;
  }

  /** Update a node's properties. Returns the updated node. */
  updateNode(id: NodeId, properties: Record<string, unknown>): GraphNode {
    const oldNode = this._storage.getNode(id);
    if (!oldNode) {
      throw new GraphValidationError(`Node '${id}' not found`, { nodeId: id });
    }

    // Create updated node with new properties merged
    const updatedNode: GraphNode = Object.freeze({
      ...oldNode,
      properties: Object.freeze({
        ...oldNode.properties,
        ...properties,
      }),
      metadata: Object.freeze({
        ...oldNode.metadata,
        updatedAt: new Date().toISOString(),
      }),
    });

    this._storage.setNode(id, updatedNode);
    this._indexManager.reindexNode(oldNode, updatedNode);
    this._cacheManager.invalidateNode(id);
    this._cacheManager.nodeCache.set(id, updatedNode);
    this._transactionManager.trackNodeUpdated(oldNode, updatedNode);

    // Build changes record for event
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    for (const key of Object.keys(properties)) {
      changes[key] = {
        old: oldNode.properties[key],
        new: properties[key],
      };
    }
    this._emitEvent(createNodeUpdatedEvent(id as string, changes));

    return updatedNode;
  }

  /** Delete a node by ID. Also removes all connected edges. Returns true if deleted. */
  deleteNode(id: NodeId): boolean {
    const node = this._storage.getNode(id);
    if (!node) return false;

    // Remove all connected edges first
    const removedEdges = this._storage.removeAllEdgesForNode(id);

    // De-index removed edges
    for (const edge of removedEdges) {
      this._indexManager.deindexEdge(edge);
      this._cacheManager.invalidateEdge(edge);
      this._transactionManager.trackEdgeDeleted(edge);
      this._emitEvent(createEdgeDeletedEvent(
        edge.id as string,
        edge.sourceId as string,
        edge.targetId as string,
        edge.relationship.edgeType,
      ));
    }

    // Remove node
    this._storage.deleteNode(id);
    this._indexManager.deindexNode(node);
    this._cacheManager.invalidateNode(id);
    this._transactionManager.trackNodeDeleted(node);

    this._emitEvent(createNodeDeletedEvent(
      id as string,
      node.identity.type,
    ));

    return true;
  }

  /** Create an edge. Validates source/target exist and no self-reference. */
  createEdge(edge: GraphEdge): void {
    if (this._storage.hasEdge(edge.id)) {
      throw new DuplicateEdgeError(edge.id as string);
    }

    if (edge.sourceId === edge.targetId) {
      throw new SelfReferenceError(edge.sourceId as string, edge.relationship.edgeType);
    }

    // Validate source and target nodes exist
    if (!this._storage.hasNode(edge.sourceId)) {
      throw new GraphValidationError(
        `Edge source node '${edge.sourceId}' does not exist`,
        { edgeId: edge.id, sourceId: edge.sourceId },
      );
    }
    if (!this._storage.hasNode(edge.targetId)) {
      throw new GraphValidationError(
        `Edge target node '${edge.targetId}' does not exist`,
        { edgeId: edge.id, targetId: edge.targetId },
      );
    }

    this._storage.setEdge(edge.id, edge);
    this._indexManager.indexEdge(edge);
    this._cacheManager.edgeCache.set(edge.id, edge);
    this._transactionManager.trackEdgeCreated(edge);
    this._emitEvent(createEdgeCreatedEvent(
      edge.id as string,
      edge.sourceId as string,
      edge.targetId as string,
      edge.relationship.edgeType,
    ));
  }

  /** Read an edge by ID. O(1). */
  readEdge(id: EdgeId): GraphEdge | undefined {
    const cached = this._cacheManager.edgeCache.get(id);
    if (cached) return cached;

    const edge = this._storage.getEdge(id);
    if (edge) {
      this._cacheManager.edgeCache.set(id, edge);
    }
    return edge;
  }

  /** Delete an edge by ID. Returns true if deleted. */
  deleteEdge(id: EdgeId): boolean {
    const edge = this._storage.getEdge(id);
    if (!edge) return false;

    this._storage.deleteEdge(id);
    this._indexManager.deindexEdge(edge);
    this._cacheManager.invalidateEdge(edge);
    this._transactionManager.trackEdgeDeleted(edge);
    this._emitEvent(createEdgeDeletedEvent(
      id as string,
      edge.sourceId as string,
      edge.targetId as string,
      edge.relationship.edgeType,
    ));

    return true;
  }

  // ─── Batch Operations ────────────────────────────────────

  async addNodes(nodes: readonly GraphNode[]): Promise<void> {
    // Validate all first — no partial inserts
    for (const node of nodes) {
      if (this._storage.hasNode(node.identity.id)) {
        throw new DuplicateNodeError(node.identity.id as string);
      }
    }
    for (const node of nodes) {
      this.createNode(node);
    }
  }

  async addEdges(edges: readonly GraphEdge[]): Promise<void> {
    // Validate all first — no partial inserts
    for (const edge of edges) {
      if (this._storage.hasEdge(edge.id)) {
        throw new DuplicateEdgeError(edge.id as string);
      }
      if (edge.sourceId === edge.targetId) {
        throw new SelfReferenceError(edge.sourceId as string, edge.relationship.edgeType);
      }
    }
    for (const edge of edges) {
      this.createEdge(edge);
    }
  }

  async removeNodes(ids: readonly NodeId[]): Promise<void> {
    for (const id of ids) {
      this.deleteNode(id);
    }
  }

  async removeEdges(ids: readonly EdgeId[]): Promise<void> {
    for (const id of ids) {
      this.deleteEdge(id);
    }
  }

  async replaceNodes(nodes: readonly GraphNode[]): Promise<void> {
    // Replace is upsert — delete existing then add new
    for (const node of nodes) {
      if (this._storage.hasNode(node.identity.id)) {
        this.deleteNode(node.identity.id);
      }
      this.createNode(node);
    }
  }

  async replaceEdges(edges: readonly GraphEdge[]): Promise<void> {
    for (const edge of edges) {
      if (this._storage.hasEdge(edge.id)) {
        this.deleteEdge(edge.id);
      }
      this.createEdge(edge);
    }
  }

  // ─── Find Operations (via indexes) ───────────────────────

  async findNodesByType(type: string): Promise<readonly GraphNode[]> {
    const nodeIds = this._indexManager.nodeTypeIndex.getByType(type);
    const result: GraphNode[] = [];
    for (const id of nodeIds) {
      const node = this._storage.getNode(id);
      if (node) result.push(node);
    }
    return result;
  }

  async findEdgesByType(type: string): Promise<readonly GraphEdge[]> {
    const edgeIds = this._indexManager.edgeTypeIndex.getByType(type);
    const result: GraphEdge[] = [];
    for (const id of edgeIds) {
      const edge = this._storage.getEdge(id);
      if (edge) result.push(edge);
    }
    return result;
  }

  async findNodesByLabel(label: string): Promise<readonly GraphNode[]> {
    const nodeIds = this._indexManager.identityIndex.findByLabel(label);
    const result: GraphNode[] = [];
    for (const id of nodeIds) {
      const node = this._storage.getNode(id);
      if (node) result.push(node);
    }
    return result;
  }

  async findNodesBySource(source: string): Promise<readonly GraphNode[]> {
    const nodeIds = this._indexManager.metadataIndex.findBySource(source);
    const result: GraphNode[] = [];
    for (const id of nodeIds) {
      const node = this._storage.getNode(id);
      if (node) result.push(node);
    }
    return result;
  }

  async findNodesByTag(tag: string): Promise<readonly GraphNode[]> {
    const nodeIds = this._indexManager.metadataIndex.findByTag(tag);
    const result: GraphNode[] = [];
    for (const id of nodeIds) {
      const node = this._storage.getNode(id);
      if (node) result.push(node);
    }
    return result;
  }

  // ─── List Operations ─────────────────────────────────────

  async listNodes(limit: number = 100, offset: number = 0): Promise<readonly GraphNode[]> {
    const all = Array.from(this._storage.nodes.values());
    return all.slice(offset, offset + limit);
  }

  async listEdges(limit: number = 100, offset: number = 0): Promise<readonly GraphEdge[]> {
    const all = Array.from(this._storage.edges.values());
    return all.slice(offset, offset + limit);
  }

  // ─── Clear ───────────────────────────────────────────────

  async clear(): Promise<void> {
    this._storage.clear();
    this._indexManager.clear();
    this._cacheManager.clear();
    this._snapshotEngine.clear();
  }

  // ─── Statistics ──────────────────────────────────────────

  async getStatistics(): Promise<GraphStatistics> {
    const nodeCount = this._storage.nodeCount;
    const edgeCount = this._storage.edgeCount;

    // Build type distributions
    const nodeTypeDistribution: Record<string, number> = {};
    for (const [type, count] of this._indexManager.nodeTypeIndex.getDistribution()) {
      nodeTypeDistribution[type] = count;
    }

    const edgeTypeDistribution: Record<string, number> = {};
    for (const [type, count] of this._indexManager.edgeTypeIndex.getDistribution()) {
      edgeTypeDistribution[type] = count;
    }

    // Compute degree statistics
    let totalDegree = 0;
    let maxDegree = 0;
    for (const [nodeId] of this._storage.nodes) {
      const outDegree = this._storage.getOutgoingEdgeIds(nodeId).size;
      const inDegree = this._storage.getIncomingEdgeIds(nodeId).size;
      const degree = outDegree + inDegree;
      totalDegree += degree;
      if (degree > maxDegree) maxDegree = degree;
    }

    const avgDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;

    return createGraphStatistics(nodeCount, edgeCount, {
      nodeTypeDistribution,
      edgeTypeDistribution,
      avgDegree,
      maxDegree,
    });
  }

  // ─── Consistency Checks ──────────────────────────────────

  async checkConsistency(): Promise<ConsistencyReport> {
    const issues: ConsistencyIssue[] = [];
    let danglingEdges = 0;
    let duplicateNodeIds = 0;
    let duplicateEdgeIds = 0;
    let selfReferences = 0;
    let invalidNodeReferences = 0;
    let duplicateRelationships = 0;

    // Check for duplicate node IDs
    const seenNodeIds = new Set<string>();
    for (const [id] of this._storage.nodes) {
      if (seenNodeIds.has(id)) {
        duplicateNodeIds++;
        issues.push({
          severity: 'error',
          code: 'DUPLICATE_NODE_ID',
          message: `Duplicate node ID: '${id}'`,
          details: { nodeId: id },
        });
      }
      seenNodeIds.add(id);
    }

    // Check for duplicate edge IDs
    const seenEdgeIds = new Set<string>();
    for (const [id] of this._storage.edges) {
      if (seenEdgeIds.has(id)) {
        duplicateEdgeIds++;
        issues.push({
          severity: 'error',
          code: 'DUPLICATE_EDGE_ID',
          message: `Duplicate edge ID: '${id}'`,
          details: { edgeId: id },
        });
      }
      seenEdgeIds.add(id);
    }

    // Check for dangling edges (source or target node doesn't exist)
    for (const [, edge] of this._storage.edges) {
      if (!this._storage.hasNode(edge.sourceId)) {
        danglingEdges++;
        issues.push({
          severity: 'error',
          code: 'DANGLING_EDGE_SOURCE',
          message: `Edge '${edge.id}' source node '${edge.sourceId}' does not exist`,
          details: { edgeId: edge.id, sourceId: edge.sourceId },
        });
      }
      if (!this._storage.hasNode(edge.targetId)) {
        danglingEdges++;
        issues.push({
          severity: 'error',
          code: 'DANGLING_EDGE_TARGET',
          message: `Edge '${edge.id}' target node '${edge.targetId}' does not exist`,
          details: { edgeId: edge.id, targetId: edge.targetId },
        });
      }

      // Self-reference check
      if (edge.sourceId === edge.targetId) {
        selfReferences++;
        issues.push({
          severity: 'error',
          code: 'SELF_REFERENCE',
          message: `Edge '${edge.id}' references same node as source and target`,
          details: { edgeId: edge.id, nodeId: edge.sourceId },
        });
      }
    }

    // Check for invalid node references in adjacency indexes
    for (const [nodeId] of this._storage.nodes) {
      const outIds = this._storage.getOutgoingEdgeIds(nodeId);
      for (const edgeId of outIds) {
        if (!this._storage.hasEdge(edgeId)) {
          invalidNodeReferences++;
          issues.push({
            severity: 'warning',
            code: 'INVALID_ADJACENCY_REFERENCE',
            message: `Node '${nodeId}' outgoing adjacency references non-existent edge '${edgeId}'`,
            details: { nodeId, edgeId },
          });
        }
      }
    }

    // Check for duplicate relationships (same source, target, edgeType)
    const relationshipKeys = new Set<string>();
    for (const [, edge] of this._storage.edges) {
      const key = `${edge.sourceId}:${edge.targetId}:${edge.relationship.edgeType}`;
      if (relationshipKeys.has(key)) {
        duplicateRelationships++;
        issues.push({
          severity: 'warning',
          code: 'DUPLICATE_RELATIONSHIP',
          message: `Duplicate relationship: ${key}`,
          details: { edgeId: edge.id, key },
        });
      }
      relationshipKeys.add(key);
    }

    const valid = issues.filter(i => i.severity === 'error').length === 0;

    return Object.freeze({
      valid,
      danglingEdges,
      duplicateNodeIds,
      duplicateEdgeIds,
      selfReferences,
      invalidNodeReferences,
      duplicateRelationships,
      issues: Object.freeze([...issues]),
    });
  }

  // ─── Snapshot Operations ─────────────────────────────────

  async createSnapshot(metadata?: Record<string, string | number | boolean | null>): Promise<import('../../models/index.ts').GraphSnapshot> {
    const snapshot = this._snapshotEngine.createSnapshot(metadata);
    this._emitEvent(createSnapshotCreatedEvent(
      snapshot.id as string,
      snapshot.nodeCount,
      snapshot.edgeCount,
    ));
    return snapshot;
  }

  async restoreSnapshot(snapshotId: SnapshotId): Promise<import('../../models/index.ts').GraphSnapshot> {
    return this._snapshotEngine.restoreSnapshot(snapshotId);
  }

  async diffSnapshots(fromId: SnapshotId, toId: SnapshotId): Promise<SnapshotDiff> {
    return this._snapshotEngine.diffSnapshots(fromId, toId);
  }

  listSnapshots(): readonly import('../../models/index.ts').GraphSnapshot[] {
    return this._snapshotEngine.listSnapshots();
  }

  // ─── Transaction Operations ──────────────────────────────

  beginTransaction(): import('../../types/index.ts').TransactionId {
    return this._transactionManager.begin();
  }

  commitTransaction(): ChangeSet {
    const changeSet = this._transactionManager.commit();
    // Publish all accumulated events
    this._flushEvents();
    return changeSet;
  }

  rollbackTransaction(): void {
    this._transactionManager.rollback();
    // Clear pending events since we rolled back
    this._pendingEvents.length = 0;
  }

  abortAllTransactions(): void {
    this._transactionManager.abort();
    this._pendingEvents.length = 0;
  }

  get transactionDepth(): number {
    return this._transactionManager.depth;
  }

  get isTransactionActive(): boolean {
    return this._transactionManager.isActive;
  }

  // ─── Cache Operations ───────────────────────────────────

  getCacheStats(): CacheStatsReport {
    const stats = this._cacheManager.getStats();
    return Object.freeze({
      nodeCacheSize: stats.nodeCacheSize,
      edgeCacheSize: stats.edgeCacheSize,
      traversalCacheSize: stats.traversalCacheSize,
      nodeCacheHitRate: stats.nodeCacheHitRate,
      nodeCacheCapacity: this._cacheManager.nodeCache.capacity,
      edgeCacheCapacity: this._cacheManager.edgeCache.capacity,
      traversalCacheCapacity: this._cacheManager.traversalCache.capacity,
    });
  }

  invalidateCache(): void {
    this._cacheManager.clear();
  }

  // ─── Extended Statistics ─────────────────────────────────

  get snapshotCount(): number {
    return this._snapshotEngine.snapshotCount;
  }

  get transactionCount(): number {
    return this._transactionManager.totalTransactionCount;
  }

  get committedTransactionCount(): number {
    return this._transactionManager.committedCount;
  }

  get memoryUsage(): number {
    return this._storage.memoryUsage;
  }

  // ─── Internal Event Management ──────────────────────────

  /** Queue an event for publishing. If in a transaction, defer until commit. */
  private _emitEvent(event: AnyGraphDomainEvent): void {
    if (this._transactionManager.isActive) {
      // Defer event publishing until transaction commit
      this._pendingEvents.push(event);
    } else {
      // Publish immediately
      this._publishEventNow(event);
    }
  }

  /** Publish all pending events (called at transaction commit). */
  private _flushEvents(): void {
    if (this._eventPublisher && this._pendingEvents.length > 0) {
      const events = [...this._pendingEvents];
      this._pendingEvents.length = 0;
      this._eventPublisher.publishAll(events).catch(() => {
        // Event publishing failure should not break the repository
        // In production, this would go to a dead letter queue
      });
    } else {
      this._pendingEvents.length = 0;
    }
  }

  /** Publish a single event immediately. */
  private _publishEventNow(event: AnyGraphDomainEvent): void {
    if (this._eventPublisher) {
      this._eventPublisher.publish(event).catch(() => {
        // Event publishing failure should not break the repository
      });
    }
  }
}
