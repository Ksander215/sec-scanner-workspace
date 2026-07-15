/**
 * Knowledge Graph Storage Adapter — Statistics
 *
 * Comprehensive statistics collection for the storage adapter.
 * Tracks:
 * - Node/Edge counts
 * - Read/Write operation counts
 * - Cache hit rates
 * - Memory usage
 * - Index statistics
 * - Uptime
 */

import type { StorageStatistics, StorageIndexStats, Timestamp } from '../types/index.ts';
import type { StorageIndexManager } from '../indexes/index.ts';
import type { StorageReadCache } from '../cache/index.ts';

// ─── Statistics Collector ─────────────────────────────────────

export class StorageStatisticsCollector {
  private _totalReads = 0;
  private _totalWrites = 0;
  private _startedAt: Timestamp;

  constructor() {
    this._startedAt = new Date().toISOString() as Timestamp;
  }

  /** Record a read operation */
  recordRead(): void {
    this._totalReads++;
  }

  /** Record a write operation */
  recordWrite(): void {
    this._totalWrites++;
  }

  /** Reset counters */
  reset(): void {
    this._totalReads = 0;
    this._totalWrites = 0;
    this._startedAt = new Date().toISOString() as Timestamp;
  }

  /**
   * Collect comprehensive storage statistics.
   */
  collect(options: {
    nodeCount: number;
    edgeCount: number;
    indexManager: StorageIndexManager;
    readCache: StorageReadCache;
    writeBufferPending: number;
    snapshotCount: number;
    activeTransactions: number;
  }): StorageStatistics {
    const uptimeMs = Date.now() - new Date(this._startedAt).getTime();
    const indexStats = options.indexManager.getAllStats();
    const indexSizeBytes = indexStats.reduce((sum, s) => sum + s.memoryUsageBytes, 0);

    // Estimate total memory usage
    const nodeMemory = options.nodeCount * 200; // ~200 bytes per node
    const edgeMemory = options.edgeCount * 150; // ~150 bytes per edge
    const totalMemory = nodeMemory + edgeMemory + indexSizeBytes;

    return {
      nodeCount: options.nodeCount,
      edgeCount: options.edgeCount,
      indexCount: indexStats.length,
      indexSizeBytes,
      memoryUsageBytes: totalMemory,
      totalReadOperations: this._totalReads,
      totalWriteOperations: this._totalWrites,
      cacheHitRate: options.readCache.hitRate,
      cacheHits: options.readCache.hits,
      cacheMisses: options.readCache.misses,
      writeBufferPending: options.writeBufferPending,
      snapshotCount: options.snapshotCount,
      activeTransactions: options.activeTransactions,
      uptimeMs,
      collectedAt: new Date().toISOString() as Timestamp,
    };
  }

  get totalReads(): number {
    return this._totalReads;
  }

  get totalWrites(): number {
    return this._totalWrites;
  }

  get startedAt(): Timestamp {
    return this._startedAt;
  }
}
