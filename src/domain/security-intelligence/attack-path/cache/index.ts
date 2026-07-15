/**
 * Security Intelligence Attack Path Builder — Cache
 *
 * Dual LRU cache for attack paths and simulations.
 * Supports TTL, invalidation, and statistics tracking.
 *
 * Features:
 * - Path Cache: Caches discovered attack paths
 * - Simulation Cache: Caches simulation results
 * - LRU eviction when cache is full
 * - TTL-based expiration
 * - Key-based and pattern-based invalidation
 * - Separate statistics for each cache type
 */

import type { AttackPath, AttackSimulation, Timestamp, AttackPathCacheEntry } from '../types/index.ts';

// ─── Cache Statistics ────────────────────────────────────────

export interface AttackPathCacheStatistics {
  readonly pathCacheSize: number;
  readonly simulationCacheSize: number;
  readonly totalSize: number;
  readonly capacity: number;
  readonly hits: number;
  readonly misses: number;
  readonly hitRate: number;
  readonly evictions: number;
  readonly expirations: number;
  readonly invalidations: number;
  readonly memoryEstimateBytes: number;
}

// ─── Mutable Cache Entry ─────────────────────────────────────

interface MutableCacheEntry {
  key: string;
  value: AttackPath | AttackSimulation;
  type: 'path' | 'simulation';
  createdAt: Timestamp;
  expiresAt: Timestamp;
  accessCount: number;
}

// ─── Attack Path Cache ───────────────────────────────────────

/**
 * Dual LRU cache for attack paths and simulations.
 * Maintains separate compartments but shared capacity and statistics.
 */
export class AttackPathCache {
  private readonly _capacity: number;
  private readonly _ttlMs: number;
  private readonly _entries: Map<string, MutableCacheEntry> = new Map();
  private _hits = 0;
  private _misses = 0;
  private _evictions = 0;
  private _expirations = 0;
  private _invalidations = 0;

  constructor(config: { readonly capacity?: number; readonly ttlMs?: number } = {}) {
    this._capacity = config.capacity ?? 5_000;
    this._ttlMs = config.ttlMs ?? 300_000; // 5 minutes default
  }

  // ─── Path Cache Operations ──────────────────────────────

  /** Get a cached path */
  getPath(key: string): AttackPath | null {
    const entry = this.getEntry(key, 'path');
    return entry ? entry.value as AttackPath : null;
  }

  /** Set a cached path */
  setPath(key: string, value: AttackPath): void {
    this.setEntry(key, value, 'path');
  }

  // ─── Simulation Cache Operations ────────────────────────

  /** Get a cached simulation */
  getSimulation(key: string): AttackSimulation | null {
    const entry = this.getEntry(key, 'simulation');
    return entry ? entry.value as AttackSimulation : null;
  }

  /** Set a cached simulation */
  setSimulation(key: string, value: AttackSimulation): void {
    this.setEntry(key, value, 'simulation');
  }

  // ─── General Cache Operations ───────────────────────────

  /** Get any cached value */
  get(key: string): AttackPath | AttackSimulation | null {
    const entry = this._entries.get(key);
    if (!entry) {
      this._misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this._entries.delete(key);
      this._expirations++;
      this._misses++;
      return null;
    }

    entry.accessCount++;
    this._entries.delete(key);
    this._entries.set(key, entry);

    this._hits++;
    return entry.value;
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

  /** Invalidate keys matching a glob pattern */
  invalidatePattern(pattern: string): number {
    let count = 0;
    const safeRegex = new RegExp(
      '^' + pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
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

  /** Invalidate all path cache entries */
  invalidatePaths(): number {
    let count = 0;
    for (const [key, entry] of this._entries) {
      if (entry.type === 'path') {
        this._entries.delete(key);
        count++;
        this._invalidations++;
      }
    }
    return count;
  }

  /** Invalidate all simulation cache entries */
  invalidateSimulations(): number {
    let count = 0;
    for (const [key, entry] of this._entries) {
      if (entry.type === 'simulation') {
        this._entries.delete(key);
        count++;
        this._invalidations++;
      }
    }
    return count;
  }

  /** Purge all expired entries */
  purgeExpired(): number {
    let count = 0;
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

  /** Get path cache size */
  get pathCacheSize(): number {
    let count = 0;
    for (const entry of this._entries.values()) {
      if (entry.type === 'path') count++;
    }
    return count;
  }

  /** Get simulation cache size */
  get simulationCacheSize(): number {
    let count = 0;
    for (const entry of this._entries.values()) {
      if (entry.type === 'simulation') count++;
    }
    return count;
  }

  /** Get cache capacity */
  get capacity(): number {
    return this._capacity;
  }

  /** Get cache statistics */
  getStatistics(): AttackPathCacheStatistics {
    const totalAccesses = this._hits + this._misses;
    const hitRate = totalAccesses > 0 ? this._hits / totalAccesses : 0;
    const memoryEstimateBytes = this._entries.size * 2048; // Paths are larger than risk assessments

    return Object.freeze({
      pathCacheSize: this.pathCacheSize,
      simulationCacheSize: this.simulationCacheSize,
      totalSize: this._entries.size,
      capacity: this._capacity,
      hits: this._hits,
      misses: this._misses,
      hitRate: Math.round(hitRate * 10000) / 10000,
      evictions: this._evictions,
      expirations: this._expirations,
      invalidations: this._invalidations,
      memoryEstimateBytes,
    });
  }

  // ─── Private Helpers ────────────────────────────────────

  private getEntry(key: string, expectedType: 'path' | 'simulation'): MutableCacheEntry | null {
    const entry = this._entries.get(key);
    if (!entry) {
      this._misses++;
      return null;
    }

    if (entry.type !== expectedType) {
      this._misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this._entries.delete(key);
      this._expirations++;
      this._misses++;
      return null;
    }

    entry.accessCount++;
    this._entries.delete(key);
    this._entries.set(key, entry);

    this._hits++;
    return entry;
  }

  private setEntry(key: string, value: AttackPath | AttackSimulation, type: 'path' | 'simulation'): void {
    if (this._entries.has(key)) {
      this._entries.delete(key);
    }

    while (this._entries.size >= this._capacity) {
      this.evictOldest();
    }

    const now = new Date();
    const entry: MutableCacheEntry = {
      key,
      value,
      type,
      createdAt: now.toISOString() as Timestamp,
      expiresAt: new Date(now.getTime() + this._ttlMs).toISOString() as Timestamp,
      accessCount: 1,
    };

    this._entries.set(key, entry);
  }

  private isExpired(entry: MutableCacheEntry): boolean {
    const expiresAt = new Date(entry.expiresAt).getTime();
    return Date.now() > expiresAt;
  }

  private evictOldest(): void {
    const oldestKey = this._entries.keys().next().value;
    if (oldestKey !== undefined) {
      this._entries.delete(oldestKey);
      this._evictions++;
    }
  }
}
