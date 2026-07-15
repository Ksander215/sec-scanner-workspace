/**
 * Knowledge Graph Query Engine — Statistics Collector
 *
 * Collects and reports query execution statistics including:
 * - Execution time
 * - Nodes/edges scanned
 * - Cache hit/miss ratios
 * - Predicate evaluation counts
 * - Memory estimates
 *
 * Also provides a query result cache with TTL-based expiration.
 */

import type { QueryStatistics, QueryCacheEntry, QueryResult, QueryEngineConfig } from '../types/index.ts';
import { DEFAULT_QUERY_ENGINE_CONFIG } from '../types/index.ts';
import type { QuerySpecification } from '../types/index.ts';
import { hashString } from '../../models/index.ts';

// ─── Statistics Collector ──────────────────────────────────────

/**
 * Mutable collector for query execution statistics.
 * Produces immutable QueryStatistics snapshots.
 */
export class QueryStatisticsCollector {
  private _startTime: number = 0;
  private _nodesScanned: number = 0;
  private _edgesScanned: number = 0;
  private _cacheHits: number = 0;
  private _cacheMisses: number = 0;
  private _returnedRows: number = 0;
  private _predicatesEvaluated: number = 0;
  private _predicatesShortCircuited: number = 0;

  /** Start timing */
  start(): void {
    this._startTime = performance.now();
  }

  /** Record a node scan */
  recordNodeScan(count: number = 1): void {
    this._nodesScanned += count;
  }

  /** Record an edge scan */
  recordEdgeScan(count: number = 1): void {
    this._edgesScanned += count;
  }

  /** Record a cache hit */
  recordCacheHit(): void {
    this._cacheHits++;
  }

  /** Record a cache miss */
  recordCacheMiss(): void {
    this._cacheMisses++;
  }

  /** Record returned rows */
  recordReturnedRows(count: number): void {
    this._returnedRows = count;
  }

  /** Record a predicate evaluation */
  recordPredicateEvaluated(): void {
    this._predicatesEvaluated++;
  }

  /** Record a short-circuited predicate */
  recordPredicateShortCircuited(): void {
    this._predicatesShortCircuited++;
  }

  /** Build an immutable snapshot */
  toSnapshot(): QueryStatistics {
    const executionTime = this._startTime > 0 ? performance.now() - this._startTime : 0;
    const memoryEstimate =
      this._nodesScanned * 64 +
      this._edgesScanned * 64 +
      this._returnedRows * 128 +
      this._predicatesEvaluated * 16;

    return Object.freeze({
      executionTime: Math.round(executionTime * 100) / 100,
      nodesScanned: this._nodesScanned,
      edgesScanned: this._edgesScanned,
      cacheHits: this._cacheHits,
      cacheMisses: this._cacheMisses,
      returnedRows: this._returnedRows,
      predicatesEvaluated: this._predicatesEvaluated,
      predicatesShortCircuited: this._predicatesShortCircuited,
      memoryEstimate,
    });
  }

  /** Reset the collector */
  reset(): void {
    this._startTime = 0;
    this._nodesScanned = 0;
    this._edgesScanned = 0;
    this._cacheHits = 0;
    this._cacheMisses = 0;
    this._returnedRows = 0;
    this._predicatesEvaluated = 0;
    this._predicatesShortCircuited = 0;
  }
}

// ─── Query Cache ───────────────────────────────────────────────

/**
 * LRU cache for query results with TTL-based expiration.
 * Uses a Map for O(1) lookup and insertion.
 */
export class QueryCache {
  private readonly _cache: Map<string, QueryCacheEntry> = new Map();
  private readonly _maxEntries: number;
  private readonly _ttl: number;

  constructor(config: Required<QueryEngineConfig> = DEFAULT_QUERY_ENGINE_CONFIG) {
    this._maxEntries = config.maxCacheEntries;
    this._ttl = config.cacheTTL;
  }

  /**
   * Generate a cache key from a query specification.
   */
  static makeKey(spec: QuerySpecification): string {
    // Deterministic key based on query content
    const parts = [
      spec.target,
      spec.filter ? JSON.stringify(spec.filter) : '',
      spec.nodeTypes.join(','),
      spec.edgeTypes.join(','),
      spec.pagination.limit.toString(),
      spec.pagination.offset.toString(),
      spec.sort.map(s => `${s.field}:${s.direction}`).join(','),
      spec.aggregations.map(a => `${a.op}:${a.field ?? ''}`).join(','),
      spec.pathSource ?? '',
      spec.pathTarget ?? '',
    ];
    return hashString(parts.join('|'));
  }

  /**
   * Get a cached result if available and not expired.
   */
  get<T = unknown>(key: string): QueryResult<T> | null {
    const entry = this._cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this._cache.delete(key);
      return null;
    }

    // Update hit count (return a new entry since it's readonly)
    const updatedEntry: QueryCacheEntry<T> = {
      key: entry.key,
      result: entry.result as QueryResult<T>,
      createdAt: entry.createdAt,
      expiresAt: entry.expiresAt,
      hitCount: entry.hitCount + 1,
    };
    this._cache.set(key, updatedEntry as QueryCacheEntry);

    return updatedEntry.result;
  }

  /**
   * Store a result in the cache.
   */
  set<T = unknown>(key: string, result: QueryResult<T>, ttl?: number): void {
    // Evict oldest entries if at capacity
    while (this._cache.size >= this._maxEntries) {
      const firstKey = this._cache.keys().next().value;
      if (firstKey !== undefined) {
        this._cache.delete(firstKey);
      }
    }

    const now = Date.now();
    const entry: QueryCacheEntry<T> = {
      key,
      result,
      createdAt: now,
      expiresAt: now + (ttl ?? this._ttl),
      hitCount: 0,
    };

    this._cache.set(key, entry as QueryCacheEntry);
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: string): boolean {
    const entry = this._cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this._cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Invalidate a specific cache entry.
   */
  invalidate(key: string): boolean {
    return this._cache.delete(key);
  }

  /**
   * Clear all cache entries.
   */
  clear(): void {
    this._cache.clear();
  }

  /**
   * Get cache statistics.
   */
  getStats(): { size: number; maxEntries: number; hitRate: number } {
    let totalHits = 0;
    for (const entry of this._cache.values()) {
      totalHits += entry.hitCount;
    }
    return {
      size: this._cache.size,
      maxEntries: this._maxEntries,
      hitRate: this._cache.size > 0 ? totalHits / this._cache.size : 0,
    };
  }

  /**
   * Evict expired entries.
   */
  evictExpired(): number {
    const now = Date.now();
    let evicted = 0;
    for (const [key, entry] of this._cache.entries()) {
      if (now > entry.expiresAt) {
        this._cache.delete(key);
        evicted++;
      }
    }
    return evicted;
  }
}
