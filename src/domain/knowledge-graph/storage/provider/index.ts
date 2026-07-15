/**
 * Knowledge Graph Storage Adapter — GraphStorageProvider Interface
 *
 * The central abstraction for all storage backends.
 * Concrete implementations (NetworkX, Neo4j, etc.) must implement
 * this interface. The Runtime Repository binds to a provider via DI.
 *
 * Design principles:
 * - Fully replaceable: swap NetworkX → Neo4j without changing business logic
 * - Async-first: all operations return Promises for remote backends
 * - Batch-native: batch operations are first-class, not afterthoughts
 * - Observable: events, statistics, and health checks are built-in
 */

import type { GraphNode, GraphEdge, GraphSnapshot, Metadata } from '../../models/index.ts';
import type { NodeId, EdgeId, SnapshotId } from '../../types/index.ts';
import type {
  StorageAdapterConfig,
  StorageConnectionState,
  StorageStatistics,
  StorageHealthResult,
  StorageOperationResult,
  BatchOperationResult,
  ExportOptions,
  ExportResult,
  ImportOptions,
  ImportResult,
  StorageTransactionInfo,
} from '../types/index.ts';

// ─── GraphStorageProvider ─────────────────────────────────────

/**
 * Contract for all Knowledge Graph storage backends.
 *
 * Lifecycle:
 * 1. Construct with config
 * 2. connect() → Connected
 * 3. CRUD + batch + query operations
 * 4. disconnect() → Disconnected
 *
 * The provider owns its data, indexes, cache, and transaction state.
 * It is NOT a wrapper around the existing InMemoryGraphRepository —
 * it is an independent storage backend that can be bound to the
 * Runtime via DI.
 */
export interface GraphStorageProvider {
  // ─── Identity ──────────────────────────────────────────────

  /** Unique identifier for this provider instance */
  readonly id: string;

  /** Adapter type identifier (e.g., 'networkx', 'neo4j') */
  readonly adapterType: string;

  /** Current connection state */
  readonly connectionState: StorageConnectionState;

  /** Current configuration (immutable snapshot) */
  readonly config: StorageAdapterConfig;

  // ─── Lifecycle ─────────────────────────────────────────────

  /** Connect to the storage backend. Idempotent. */
  connect(): Promise<void>;

  /** Disconnect from the storage backend. Flushes buffers. */
  disconnect(): Promise<void>;

  /** Check if the provider is connected and operational */
  readonly isConnected: boolean;

  // ─── Node Persistence ──────────────────────────────────────

  /** Create (insert) a new node. Returns { success: false } if id already exists. */
  createNode(node: GraphNode): Promise<StorageOperationResult<GraphNode>>;

  /** Update an existing node's properties. Node identity (id, type) is immutable. */
  updateNode(id: NodeId, properties: Metadata): Promise<StorageOperationResult<GraphNode>>;

  /** Delete a node by ID. Also removes connected edges. Returns true if deleted. */
  deleteNode(id: NodeId): Promise<StorageOperationResult<boolean>>;

  /** Get a node by ID. Returns undefined if not found. */
  getNode(id: NodeId): Promise<StorageOperationResult<GraphNode | undefined>>;

  /** Check if a node exists. */
  hasNode(id: NodeId): Promise<boolean>;

  /** Get all nodes. */
  getAllNodes(): Promise<readonly GraphNode[]>;

  /** Count nodes. */
  nodeCount(): Promise<number>;

  // ─── Node Batch Operations ─────────────────────────────────

  /** Create multiple nodes in a single batch. */
  batchCreateNodes(nodes: readonly GraphNode[]): Promise<BatchOperationResult>;

  /** Delete multiple nodes by IDs in a single batch. */
  batchDeleteNodes(ids: readonly NodeId[]): Promise<BatchOperationResult>;

  // ─── Edge Persistence ──────────────────────────────────────

  /** Create (insert) a new edge. Returns { success: false } if id already exists. */
  createEdge(edge: GraphEdge): Promise<StorageOperationResult<GraphEdge>>;

  /** Update an existing edge's properties. */
  updateEdge(id: EdgeId, properties: Metadata): Promise<StorageOperationResult<GraphEdge>>;

  /** Delete an edge by ID. Returns true if deleted. */
  deleteEdge(id: EdgeId): Promise<StorageOperationResult<boolean>>;

  /** Get an edge by ID. Returns undefined if not found. */
  getEdge(id: EdgeId): Promise<StorageOperationResult<GraphEdge | undefined>>;

  /** Check if an edge exists. */
  hasEdge(id: EdgeId): Promise<boolean>;

  /** Get all edges. */
  getAllEdges(): Promise<readonly GraphEdge[]>;

  /** Count edges. */
  edgeCount(): Promise<number>;

  /** Get all edges from a given node. */
  getEdgesFrom(nodeId: NodeId): Promise<readonly GraphEdge[]>;

  /** Get all edges to a given node. */
  getEdgesTo(nodeId: NodeId): Promise<readonly GraphEdge[]>;

  // ─── Edge Batch Operations ─────────────────────────────────

  /** Create multiple edges in a single batch. */
  batchCreateEdges(edges: readonly GraphEdge[]): Promise<BatchOperationResult>;

  /** Delete multiple edges by IDs in a single batch. */
  batchDeleteEdges(ids: readonly EdgeId[]): Promise<BatchOperationResult>;

  // ─── Snapshot Persistence ──────────────────────────────────

  /** Save a snapshot of the current storage state. */
  saveSnapshot(metadata?: Metadata): Promise<GraphSnapshot>;

  /** Restore storage to a specific snapshot. */
  restoreSnapshot(snapshotId: SnapshotId): Promise<GraphSnapshot>;

  /** List all available snapshots. */
  listSnapshots(): Promise<readonly GraphSnapshot[]>;

  // ─── Transactions ──────────────────────────────────────────

  /** Begin a new transaction. Returns transaction ID. */
  beginTransaction(): Promise<TransactionId>;

  /** Commit the current transaction. */
  commitTransaction(): Promise<StorageTransactionInfo>;

  /** Rollback the current transaction. */
  rollbackTransaction(): Promise<StorageTransactionInfo>;

  /** Check if a transaction is active. */
  readonly isTransactionActive: boolean;

  // ─── Import / Export ───────────────────────────────────────

  /** Export graph data in the specified format. */
  exportGraph(options: ExportOptions): Promise<ExportResult>;

  /** Import graph data from the specified format. */
  importGraph(data: string, options: ImportOptions): Promise<ImportResult>;

  // ─── Statistics & Health ───────────────────────────────────

  /** Get comprehensive storage statistics. */
  getStatistics(): StorageStatistics;

  /** Perform a health check. */
  health(): StorageHealthResult;

  /** Verify data integrity (consistency checks). */
  verify(): StorageHealthResult;

  /** Rebuild all storage indexes from scratch. */
  rebuildIndexes(): Promise<void>;

  // ─── Cache Management ──────────────────────────────────────

  /** Clear all read caches. */
  clearCache(): void;

  /** Flush any pending write buffer operations. */
  flushWriteBuffer(): Promise<BatchOperationResult>;

  // ─── Cleanup ───────────────────────────────────────────────

  /** Clear all stored data (nodes, edges, indexes, caches). Snapshots retained. */
  clear(): Promise<void>;
}
