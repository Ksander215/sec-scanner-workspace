/**
 * Knowledge Graph Runtime — Public API
 *
 * Single entry point for the Knowledge Graph Runtime layer.
 * The runtime provides an in-memory GraphRepository implementation
 * with indexes, cache, snapshots, and transactions.
 *
 * Usage:
 * ```ts
 * import { InMemoryGraphRepository } from './runtime/index.ts';
 *
 * const repo = new InMemoryGraphRepository();
 * await repo.addNode(myNode);
 * const node = await repo.getNode(nodeId);
 * ```
 *
 * Architecture:
 * - Storage: Map-based O(1) data structures
 * - Indexes: NodeType, EdgeType, Identity, Metadata indexes
 * - Cache: LRU caches for hot data
 * - Snapshots: Immutable point-in-time state capture
 * - Transactions: ACID-like begin/commit/rollback with nesting
 */

// ─── Repository ─────────────────────────────────────────────

export {
  InMemoryGraphRepository,
} from './repository/index.ts';

export type {
  ExtendedRepositoryOperations,
  ConsistencyReport,
  ConsistencyIssue,
  CacheStatsReport,
} from './repository/index.ts';

// ─── Storage ────────────────────────────────────────────────

export {
  InternalStorage,
} from './storage/index.ts';

export type {
  StorageSnapshot,
} from './storage/index.ts';

// ─── Indexes ────────────────────────────────────────────────

export {
  NodeTypeIndex,
  EdgeTypeIndex,
  IdentityIndex,
  MetadataIndex,
  IndexManager,
} from './indexes/index.ts';

// ─── Cache ──────────────────────────────────────────────────

export {
  NodeCache,
  EdgeCache,
  TraversalCache,
  CacheManager,
} from './cache/index.ts';

// ─── Snapshot ───────────────────────────────────────────────

export {
  SnapshotEngine,
} from './snapshot/index.ts';

export type {
  SnapshotDiff,
} from './snapshot/index.ts';

// ─── Transaction ────────────────────────────────────────────

export {
  TransactionManager,
  ChangeSet,
} from './transaction/index.ts';
