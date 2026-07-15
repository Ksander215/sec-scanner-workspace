/**
 * Knowledge Graph Storage Adapter — Persistence Cache
 *
 * Two-tier caching:
 * 1. Read Cache — LRU with optional TTL for frequently accessed nodes/edges
 * 2. Write Buffer — batches pending write operations for efficient persistence
 *
 * Cache invalidation is automatic on mutations.
 * Write buffer flushes on threshold or explicit flush().
 */

import type { GraphNode, GraphEdge } from '../../models/index.ts';
import type { NodeId, EdgeId, Timestamp } from '../../types/index.ts';
import type { WriteBufferEntry, CacheEntry } from '../types/index.ts';
import { StorageOperationType } from '../types/index.ts';

// ─── LRU Cache with TTL ───────────────────────────────────────

class TTLCache<K, V> {
  private readonly _map: Map<K, CacheEntry<V>> = new Map();
  private readonly _capacity: number;
  private readonly _ttlMs: number;
  private _hits = 0;
  private _misses = 0;

  constructor(capacity: number = 5000, ttlMs: number = 60_000) {
    this._capacity = Math.max(1, capacity);
    this._ttlMs = Math.max(0, ttlMs);
  }

  get(key: K): V | undefined {
    const entry = this._map.get(key);
    if (!entry) {
      this._misses++;
      return undefined;
    }

    // Check TTL expiry
    if (entry.expiresAt && Date.now() > new Date(entry.expiresAt).getTime()) {
      this._map.delete(key);
      this._misses++;
      return undefined;
    }

    // Move to end (LRU)
    this._map.delete(key);
    this._map.set(key, { ...entry, accessCount: entry.accessCount + 1 });
    this._hits++;
    return entry.value;
  }

  set(key: K, value: V): void {
    const now = new Date().toISOString();
    const expiresAt = this._ttlMs > 0 ? new Date(Date.now() + this._ttlMs).toISOString() : null;

    if (this._map.has(key)) {
      this._map.delete(key);
    } else if (this._map.size >= this._capacity) {
      const firstKey = this._map.keys().next().value;
      if (firstKey !== undefined) this._map.delete(firstKey);
    }

    this._map.set(key, {
      key: String(key),
      value,
      createdAt: now as Timestamp,
      expiresAt,
      accessCount: 0,
    });
  }

  has(key: K): boolean {
    const entry = this._map.get(key);
    if (!entry) return false;
    if (entry.expiresAt && Date.now() > new Date(entry.expiresAt).getTime()) {
      this._map.delete(key);
      return false;
    }
    return true;
  }

  delete(key: K): boolean {
    return this._map.delete(key);
  }

  clear(): void {
    this._map.clear();
    this._hits = 0;
    this._misses = 0;
  }

  get size(): number {
    return this._map.size;
  }

  get hitRate(): number {
    const total = this._hits + this._misses;
    return total === 0 ? 0 : this._hits / total;
  }

  get hits(): number {
    return this._hits;
  }

  get misses(): number {
    return this._misses;
  }

  /** Remove expired entries */
  evictExpired(): number {
    let evicted = 0;
    const now = Date.now();
    for (const [key, entry] of this._map) {
      if (entry.expiresAt && now > new Date(entry.expiresAt).getTime()) {
        this._map.delete(key);
        evicted++;
      }
    }
    return evicted;
  }
}

// ─── Read Cache ───────────────────────────────────────────────

/** Read-through cache for frequently accessed nodes and edges */
export class StorageReadCache {
  private readonly _nodeCache: TTLCache<string, GraphNode>;
  private readonly _edgeCache: TTLCache<string, GraphEdge>;

  constructor(capacity: number = 5000, ttlMs: number = 60_000) {
    this._nodeCache = new TTLCache<string, GraphNode>(capacity, ttlMs);
    this._edgeCache = new TTLCache<string, GraphEdge>(capacity, ttlMs);
  }

  // Node cache operations
  getNode(id: NodeId): GraphNode | undefined {
    return this._nodeCache.get(id);
  }

  setNode(id: NodeId, node: GraphNode): void {
    this._nodeCache.set(id, node);
  }

  hasNode(id: NodeId): boolean {
    return this._nodeCache.has(id);
  }

  invalidateNode(id: NodeId): void {
    this._nodeCache.delete(id);
  }

  // Edge cache operations
  getEdge(id: EdgeId): GraphEdge | undefined {
    return this._edgeCache.get(id);
  }

  setEdge(id: EdgeId, edge: GraphEdge): void {
    this._edgeCache.set(id, edge);
  }

  hasEdge(id: EdgeId): boolean {
    return this._edgeCache.has(id);
  }

  invalidateEdge(id: EdgeId): void {
    this._edgeCache.delete(id);
  }

  // Aggregate operations
  clear(): void {
    this._nodeCache.clear();
    this._edgeCache.clear();
  }

  evictExpired(): void {
    this._nodeCache.evictExpired();
    this._edgeCache.evictExpired();
  }

  get hitRate(): number {
    const totalHits = this._nodeCache.hits + this._edgeCache.hits;
    const totalMisses = this._nodeCache.misses + this._edgeCache.misses;
    const total = totalHits + totalMisses;
    return total === 0 ? 0 : totalHits / total;
  }

  get hits(): number {
    return this._nodeCache.hits + this._edgeCache.hits;
  }

  get misses(): number {
    return this._nodeCache.misses + this._edgeCache.misses;
  }

  get nodeCacheSize(): number {
    return this._nodeCache.size;
  }

  get edgeCacheSize(): number {
    return this._edgeCache.size;
  }
}

// ─── Write Buffer ─────────────────────────────────────────────

/** Batches pending write operations for efficient persistence */
export class StorageWriteBuffer {
  private readonly _buffer: WriteBufferEntry[] = [];
  private readonly _threshold: number;

  constructor(threshold: number = 100) {
    this._threshold = Math.max(1, threshold);
  }

  /** Add an operation to the buffer */
  push(entry: WriteBufferEntry): void {
    this._buffer.push(entry);
  }

  /** Check if the buffer has reached the flush threshold */
  get shouldFlush(): boolean {
    return this._buffer.length >= this._threshold;
  }

  /** Get all pending operations and clear the buffer */
  drain(): readonly WriteBufferEntry[] {
    const entries = [...this._buffer];
    this._buffer.length = 0;
    return entries;
  }

  /** Peek at pending operations without draining */
  get pending(): readonly WriteBufferEntry[] {
    return this._buffer;
  }

  /** Number of pending operations */
  get size(): number {
    return this._buffer.length;
  }

  /** Check if the buffer is empty */
  get isEmpty(): boolean {
    return this._buffer.length === 0;
  }

  /** Clear the buffer without processing */
  clear(): void {
    this._buffer.length = 0;
  }
}

// ─── Cache Manager ────────────────────────────────────────────

/** Manages read cache and write buffer as a cohesive unit */
export class StorageCacheManager {
  readonly readCache: StorageReadCache;
  readonly writeBuffer: StorageWriteBuffer;
  private _evictionInterval: ReturnType<typeof setInterval> | null = null;

  constructor(options: {
    readCacheCapacity?: number;
    readCacheTTL?: number;
    writeBufferThreshold?: number;
    enableAutoEviction?: boolean;
    evictionIntervalMs?: number;
  } = {}) {
    this.readCache = new StorageReadCache(
      options.readCacheCapacity ?? 5000,
      options.readCacheTTL ?? 60_000,
    );
    this.writeBuffer = new StorageWriteBuffer(
      options.writeBufferThreshold ?? 100,
    );

    if (options.enableAutoEviction ?? false) {
      const intervalMs = options.evictionIntervalMs ?? 30_000;
      this._evictionInterval = setInterval(() => {
        this.readCache.evictExpired();
      }, intervalMs);
    }
  }

  /** Invalidate all cache entries for a node */
  invalidateNode(id: NodeId): void {
    this.readCache.invalidateNode(id);
  }

  /** Invalidate all cache entries for an edge */
  invalidateEdge(id: EdgeId): void {
    this.readCache.invalidateEdge(id);
  }

  /** Clear all caches and buffer */
  clear(): void {
    this.readCache.clear();
    this.writeBuffer.clear();
  }

  /** Stop auto eviction if running */
  dispose(): void {
    if (this._evictionInterval) {
      clearInterval(this._evictionInterval);
      this._evictionInterval = null;
    }
  }
}
