/**
 * Security Intelligence Correlation Engine — Correlation Cache
 *
 * LRU cache for correlation results with TTL, invalidation,
 * and statistics tracking.
 *
 * Features:
 * - LRU eviction when cache is full
 * - TTL-based expiration
 * - Key-based invalidation
 * - Pattern-based invalidation
 * - Cache statistics (hit rate, evictions, etc.)
 */

import type { CorrelationResult, Timestamp, CorrelationCacheEntry } from '../types/index.ts';

// ─── Cache Statistics ────────────────────────────────────────

export interface CacheStatistics {
  readonly size: number;
  readonly capacity: number;
  readonly hits: number;
  readonly misses: number;
  readonly hitRate: number;
  readonly evictions: number;
  readonly expirations: number;
  readonly invalidations: number;
  readonly averageAccessCount: number;
  readonly memoryEstimateBytes: number;
}

// ─── Cache Entry (mutable for LRU tracking) ─────────────────

interface MutableCacheEntry {
  key: string;
  value: CorrelationResult;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  accessCount: number;
}

// ─── Correlation Cache ───────────────────────────────────────

/**
 * LRU cache for correlation results.
 * Maintains access order for eviction and supports TTL expiration.
 */
export class CorrelationCache {
  private readonly _capacity: number;
  private readonly _ttlMs: number;
  private readonly _entries: Map<string, MutableCacheEntry> = new Map();
  private _hits = 0;
  private _misses = 0;
  private _evictions = 0;
  private _expirations = 0;
  private _invalidations = 0;

  constructor(config: { readonly capacity?: number; readonly ttlMs?: number } = {}) {
    this._capacity = config.capacity ?? 10_000;
    this._ttlMs = config.ttlMs ?? 300_000; // 5 minutes default
  }

  /** Get a cached result by key */
  get(key: string): CorrelationResult | null {
    const entry = this._entries.get(key);
    if (!entry) {
      this._misses++;
      return null;
    }

    // Check TTL
    if (this.isExpired(entry)) {
      this._entries.delete(key);
      this._expirations++;
      this._misses++;
      return null;
    }

    // Update access count and move to end (most recently used)
    entry.accessCount++;
    this._entries.delete(key);
    this._entries.set(key, entry);

    this._hits++;
    return entry.value;
  }

  /** Set a cached result */
  set(key: string, value: CorrelationResult): void {
    // Remove existing entry if present
    if (this._entries.has(key)) {
      this._entries.delete(key);
    }

    // Evict if at capacity
    while (this._entries.size >= this._capacity) {
      this.evictOldest();
    }

    const now = new Date();
    const entry: MutableCacheEntry = {
      key,
      value,
      createdAt: now.toISOString() as Timestamp,
      expiresAt: new Date(now.getTime() + this._ttlMs).toISOString() as Timestamp,
      accessCount: 1,
    };

    this._entries.set(key, entry);
  }

  /** Check if a key exists and is not expired */
  has(key: string): boolean {
    const entry = this._entries.get(key);
    if (!entry) return false;
    if (this.isExpired(entry)) {
      this._entries.delete(key);
      this._expirations++;
      return false;
    }
    return true;
  }

  /** Invalidate a specific key */
  invalidate(key: string): boolean {
    const deleted = this._entries.delete(key);
    if (deleted) this._invalidations++;
    return deleted;
  }

  /** Invalidate keys matching a glob pattern (* = any chars, ? = single char) */
  invalidatePattern(pattern: string): number {
    let count = 0;
    // Convert glob to safe regex (only allow * and ? wildcards)
    const safeRegex = new RegExp(
      '^' + pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape regex special chars
        .replace(/\*/g, '.*')                     // * → .*
        .replace(/\?/g, '.')                      // ? → .
      + '$'
    );
    for (const key of [...this._entries.keys()]) {
      if (safeRegex.test(key)) {
        this._entries.delete(key);
        count++;
        this._invalidations++;
      }
    }
    return count;
  }

  /** Invalidate all expired entries */
  purgeExpired(): number {
    let count = 0;
    const now = new Date();
    for (const [key, entry] of this._entries) {
      if (this.isExpired(entry)) {
        this._entries.delete(key);
        count++;
        this._expirations++;
      }
    }
    return count;
  }

  /** Clear all entries */
  clear(): void {
    this._entries.clear();
    this._hits = 0;
    this._misses = 0;
    this._evictions = 0;
    this._expirations = 0;
    this._invalidations = 0;
  }

  /** Get current cache size */
  get size(): number {
    return this._entries.size;
  }

  /** Get cache capacity */
  get capacity(): number {
    return this._capacity;
  }

  /** Get cache statistics */
  getStatistics(): CacheStatistics {
    const totalAccesses = this._hits + this._misses;
    const hitRate = totalAccesses > 0 ? this._hits / totalAccesses : 0;
    const totalAccessCount = [...this._entries.values()].reduce((sum, e) => sum + e.accessCount, 0);
    const avgAccess = this._entries.size > 0 ? totalAccessCount / this._entries.size : 0;

    // Rough memory estimate: ~1KB per entry
    const memoryEstimateBytes = this._entries.size * 1024;

    return Object.freeze({
      size: this._entries.size,
      capacity: this._capacity,
      hits: this._hits,
      misses: this._misses,
      hitRate: Math.round(hitRate * 10000) / 10000,
      evictions: this._evictions,
      expirations: this._expirations,
      invalidations: this._invalidations,
      averageAccessCount: Math.round(avgAccess * 100) / 100,
      memoryEstimateBytes,
    });
  }

  // ─── Private Helpers ───────────────────────────────────

  private isExpired(entry: MutableCacheEntry): boolean {
    const expiresAt = new Date(entry.expiresAt).getTime();
    return Date.now() > expiresAt;
  }

  private evictOldest(): void {
    // First entry in Map is the least recently used
    const oldestKey = this._entries.keys().next().value;
    if (oldestKey !== undefined) {
      this._entries.delete(oldestKey);
      this._evictions++;
    }
  }
}
