/**
 * Knowledge Graph Storage Adapter — Public API
 *
 * Single entry point for the Storage Adapter layer.
 * The adapter provides a fully replaceable storage backend
 * for the Knowledge Graph, with NetworkX as the MVP implementation.
 *
 * Usage:
 * ```ts
 * import { NetworkXStorageAdapter } from './storage/index.ts';
 *
 * const adapter = new NetworkXStorageAdapter({ id: 'main' });
 * await adapter.connect();
 *
 * await adapter.createNode(myNode);
 * const result = await adapter.getNode(nodeId);
 *
 * await adapter.disconnect();
 * ```
 *
 * Architecture:
 * - Provider: Interface for all storage backends
 * - Adapter: NetworkX implementation
 * - Indexes: Storage-specific index system
 * - Cache: Two-tier (read cache + write buffer)
 * - Snapshot: Point-in-time state capture
 * - Transaction: ACID-like begin/commit/rollback
 * - Import/Export: JSON, DOT, GraphML formats
 * - Migration: Interface for backend migrations
 * - Statistics: Comprehensive metrics
 * - Events: Storage lifecycle observability
 */

// ─── Provider ─────────────────────────────────────────────────

export type { GraphStorageProvider } from './provider/index.ts';

// ─── Adapter ──────────────────────────────────────────────────

export { NetworkXStorageAdapter } from './adapter/index.ts';

// ─── Types ────────────────────────────────────────────────────

export type {
  StorageAdapterConfig,
  StorageOperationResult,
  BatchOperationResult,
  BatchError,
  StorageIndexStats,
  StorageTransactionInfo,
  StorageStatistics,
  StorageHealthResult,
  StorageHealthIssue,
  ExportOptions,
  ExportResult,
  ImportOptions,
  ImportResult,
  StorageMigrationStep,
  MigrationProgress,
  MigrationResult,
  CacheEntry,
  WriteBufferEntry,
  StorageSnapshotData,
} from './types/index.ts';

export {
  DEFAULT_STORAGE_CONFIG,
  StorageConnectionState,
  StorageOperationType,
  StorageIndexType,
  StorageTransactionState,
  ExportFormat,
  ImportFormat,
} from './types/index.ts';

// ─── Indexes ──────────────────────────────────────────────────

export {
  StorageIdentityIndex,
  StorageNodeTypeIndex,
  StorageRelationshipTypeIndex,
  StorageMetadataIndex,
  StorageLabelsIndex,
  StorageIndexManager,
} from './indexes/index.ts';

// ─── Cache ────────────────────────────────────────────────────

export {
  StorageReadCache,
  StorageWriteBuffer,
  StorageCacheManager,
} from './cache/index.ts';

// ─── Snapshot ─────────────────────────────────────────────────

export { StorageSnapshotManager } from './snapshot/index.ts';

// ─── Transaction ──────────────────────────────────────────────

export {
  StorageTransactionManager,
  StorageChangeSet,
} from './transaction/index.ts';

// ─── Import / Export ──────────────────────────────────────────

export {
  exportGraph,
  importGraph,
} from './import-export/index.ts';

// ─── Migration ────────────────────────────────────────────────

export type { StorageMigration } from './migration/index.ts';
export {
  GenericJSONMigration,
  MigrationRegistry,
  createDefaultMigrationRegistry,
} from './migration/index.ts';

// ─── Statistics ───────────────────────────────────────────────

export { StorageStatisticsCollector } from './statistics/index.ts';

// ─── Events ───────────────────────────────────────────────────

export type {
  StorageEvent,
  StorageConnectedEvent,
  StorageDisconnectedEvent,
  StorageSnapshotCreatedEvent,
  StorageRecoveredEvent,
  StorageCompactedEvent,
  AnyStorageEvent,
  StorageEventHandler,
} from './events/index.ts';

export {
  createStorageConnectedEvent,
  createStorageDisconnectedEvent,
  createStorageSnapshotCreatedEvent,
  createStorageRecoveredEvent,
  createStorageCompactedEvent,
  StorageEventBus,
} from './events/index.ts';
