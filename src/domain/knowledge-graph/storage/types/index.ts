/**
 * Knowledge Graph Storage Adapter — Type Definitions
 *
 * All types, interfaces, and enums for the Storage Adapter layer.
 * These types define the contract between the Storage Provider
 * and concrete backend implementations (NetworkX, Neo4j, etc.).
 *
 * Design principles:
 * - Storage backends are fully replaceable via GraphStorageProvider
 * - All operations return Promises for async backend compatibility
 * - Batch operations are first-class citizens
 * - Transactions are adapter-level, not repository-level
 * - Indexes are storage-specific and optional
 */

import type { GraphNode, GraphEdge, GraphSnapshot, Metadata, StringMap } from '../../models/index.ts';
import type { NodeId, EdgeId, SnapshotId, TransactionId, Timestamp } from '../../types/index.ts';

// ─── Storage Configuration ────────────────────────────────────

/** Configuration for a storage adapter instance */
export interface StorageAdapterConfig {
  /** Unique identifier for this storage instance */
  readonly id: string;
  /** Adapter type identifier (e.g., 'networkx', 'neo4j', 'memgraph') */
  readonly adapterType: string;
  /** Maximum number of nodes the adapter can hold (0 = unlimited) */
  readonly maxNodes: number;
  /** Maximum number of edges the adapter can hold (0 = unlimited) */
  readonly maxEdges: number;
  /** Enable write buffer for batched persistence */
  readonly enableWriteBuffer: boolean;
  /** Write buffer flush threshold (number of pending operations) */
  readonly writeBufferThreshold: number;
  /** Enable read cache with TTL */
  readonly enableReadCache: boolean;
  /** Read cache capacity (number of entries) */
  readonly readCacheCapacity: number;
  /** Read cache TTL in milliseconds (0 = no expiry) */
  readonly readCacheTTL: number;
  /** Enable storage indexes */
  readonly enableIndexes: boolean;
  /** Enable transaction support */
  readonly enableTransactions: boolean;
  /** Snapshot retention limit (0 = unlimited) */
  readonly maxSnapshots: number;
}

/** Default storage adapter configuration */
export const DEFAULT_STORAGE_CONFIG: StorageAdapterConfig = Object.freeze({
  id: 'default',
  adapterType: 'networkx',
  maxNodes: 0,
  maxEdges: 0,
  enableWriteBuffer: true,
  writeBufferThreshold: 100,
  enableReadCache: true,
  readCacheCapacity: 5000,
  readCacheTTL: 60_000,
  enableIndexes: true,
  enableTransactions: true,
  maxSnapshots: 0,
});

// ─── Storage Connection State ─────────────────────────────────

export enum StorageConnectionState {
  Disconnected = 'Disconnected',
  Connecting = 'Connecting',
  Connected = 'Connected',
  Error = 'Error',
}

// ─── Storage Operation Types ──────────────────────────────────

export enum StorageOperationType {
  NodeCreate = 'NodeCreate',
  NodeUpdate = 'NodeUpdate',
  NodeDelete = 'NodeDelete',
  EdgeCreate = 'EdgeCreate',
  EdgeUpdate = 'EdgeUpdate',
  EdgeDelete = 'EdgeDelete',
  BatchCreate = 'BatchCreate',
  BatchDelete = 'BatchDelete',
  SnapshotCreate = 'SnapshotCreate',
  SnapshotRestore = 'SnapshotRestore',
  TransactionBegin = 'TransactionBegin',
  TransactionCommit = 'TransactionCommit',
  TransactionRollback = 'TransactionRollback',
}

// ─── Storage Operation Result ─────────────────────────────────

/** Result of a single storage operation */
export interface StorageOperationResult<T = unknown> {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: string | null;
  readonly durationMs: number;
  readonly fromCache: boolean;
}

/** Result of a batch storage operation */
export interface BatchOperationResult {
  readonly total: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly errors: readonly BatchError[];
  readonly durationMs: number;
}

/** Error entry for a failed batch operation */
export interface BatchError {
  readonly index: number;
  readonly id: string;
  readonly error: string;
}

// ─── Storage Index Types ──────────────────────────────────────

export enum StorageIndexType {
  Identity = 'Identity',
  NodeType = 'NodeType',
  RelationshipType = 'RelationshipType',
  Metadata = 'Metadata',
  Labels = 'Labels',
}

/** Statistics for a single storage index */
export interface StorageIndexStats {
  readonly type: StorageIndexType;
  readonly entryCount: number;
  readonly memoryUsageBytes: number;
  readonly lastRebuiltAt: Timestamp | null;
}

// ─── Storage Transaction State ────────────────────────────────

export enum StorageTransactionState {
  Active = 'Active',
  Committed = 'Committed',
  RolledBack = 'RolledBack',
  Failed = 'Failed',
}

/** Information about a storage-level transaction */
export interface StorageTransactionInfo {
  readonly id: TransactionId;
  readonly state: StorageTransactionState;
  readonly startedAt: Timestamp;
  readonly committedAt: Timestamp | null;
  readonly operationCount: number;
}

// ─── Storage Snapshot Data ────────────────────────────────────

/** Internal snapshot data for storage-level persistence */
export interface StorageSnapshotData {
  readonly id: SnapshotId;
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly createdAt: Timestamp;
  readonly metadata: Metadata;
}

// ─── Storage Statistics ───────────────────────────────────────

/** Comprehensive storage statistics */
export interface StorageStatistics {
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly indexCount: number;
  readonly indexSizeBytes: number;
  readonly memoryUsageBytes: number;
  readonly totalReadOperations: number;
  readonly totalWriteOperations: number;
  readonly cacheHitRate: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly writeBufferPending: number;
  readonly snapshotCount: number;
  readonly activeTransactions: number;
  readonly uptimeMs: number;
  readonly collectedAt: Timestamp;
}

// ─── Storage Health ───────────────────────────────────────────

/** Health check result */
export interface StorageHealthResult {
  readonly healthy: boolean;
  readonly connectionState: StorageConnectionState;
  readonly issues: readonly StorageHealthIssue[];
  readonly checkedAt: Timestamp;
}

/** A single health issue found during verification */
export interface StorageHealthIssue {
  readonly severity: 'error' | 'warning' | 'info';
  readonly component: string;
  readonly message: string;
  readonly details?: Metadata;
}

// ─── Import/Export Types ──────────────────────────────────────

export enum ExportFormat {
  JSON = 'JSON',
  DOT = 'DOT',
  GraphML = 'GraphML',
}

export enum ImportFormat {
  JSON = 'JSON',
  DOT = 'DOT',
  GraphML = 'GraphML',
}

/** Options for export operations */
export interface ExportOptions {
  readonly format: ExportFormat;
  readonly includeMetadata: boolean;
  readonly prettyPrint: boolean;
  readonly filter?: {
    readonly nodeTypes?: readonly string[];
    readonly edgeTypes?: readonly string[];
  };
}

/** Options for import operations */
export interface ImportOptions {
  readonly format: ImportFormat;
  readonly mergeStrategy: 'replace' | 'merge' | 'skip_existing';
  readonly validateBeforeImport: boolean;
}

/** Result of an import operation */
export interface ImportResult {
  readonly nodesImported: number;
  readonly edgesImported: number;
  readonly nodesSkipped: number;
  readonly edgesSkipped: number;
  readonly errors: readonly string[];
  readonly durationMs: number;
}

/** Result of an export operation */
export interface ExportResult {
  readonly data: string;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly format: ExportFormat;
  readonly durationMs: number;
}

// ─── Migration Types ──────────────────────────────────────────

/** Migration step from one storage backend to another */
export interface StorageMigrationStep {
  readonly fromAdapter: string;
  readonly toAdapter: string;
  readonly version: string;
  readonly description: string;
}

/** Progress callback for migration operations */
export type MigrationProgressCallback = (progress: MigrationProgress) => void;

export interface MigrationProgress {
  readonly phase: 'export' | 'transform' | 'import' | 'verify';
  readonly currentStep: number;
  readonly totalSteps: number;
  readonly message: string;
}

/** Result of a migration operation */
export interface MigrationResult {
  readonly success: boolean;
  readonly nodesMigrated: number;
  readonly edgesMigrated: number;
  readonly errors: readonly string[];
  readonly durationMs: number;
}

// ─── Cache Entry Types ────────────────────────────────────────

export interface CacheEntry<T> {
  readonly key: string;
  readonly value: T;
  readonly createdAt: Timestamp;
  readonly expiresAt: Timestamp | null;
  readonly accessCount: number;
}

/** Write buffer entry */
export interface WriteBufferEntry {
  readonly operation: StorageOperationType;
  readonly target: 'node' | 'edge';
  readonly id: string;
  readonly data: GraphNode | GraphEdge | Metadata;
  readonly timestamp: Timestamp;
}
