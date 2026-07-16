/**
 * Security Intelligence Impact Analysis — Cache
 *
 * Dual LRU cache for Scenario results and Delta computations.
 * Supports TTL expiration and capacity-based eviction.
 *
 * All cache operations are O(1) amortized for LRU eviction.
 */

import type {
  ImpactCacheStatistics, ImpactCacheEntry, Timestamp, Metadata,
} from '../types/index.ts';

// ─── Cache Entry Internal ────────────────────────────────────

interface InternalCacheEntry<T> {
  readonly key: string;
  readonly value: T;
  readonly type: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  accessCount: number;
}

// ─── Impact Analysis Cache ───────────────────────────────────

export class ImpactCache {
  private readonly _scenarioCache: Map<string, InternalCacheEntry<import('../types/index.ts').ImpactAnalysis>>;
  private readonly _deltaCache: Map<string, InternalCacheEntry<any>>;
  private readonly _capacity: number;
  private readonly _ttlMs: number;
  private _hits = 0;
  private _misses = 0;
  private _evictions = 0;
  private _expirations = 0;
  private _invalidations = 0;

  constructor(config?: { capacity?: number; ttlMs?: number }) {
    this._capacity = config?.capacity ?? 5_000;
    this._ttlMs = config?.ttlMs ?? 300_000;
    this._scenarioCache = new Map();
    this._deltaCache = new Map();
  }

  // ─── Scenario Cache ──────────────────────────────────────────

  getAnalysis(key: string): import('../types/index.ts').ImpactAnalysis | null {
    const entry = this._scenarioCache.get(key);
    if (!entry) {
      this._misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this._scenarioCache.delete(key);
      this._expirations++;
      this._misses++;
      return null;
    }
    entry.accessCount++;
    this._hits++;
    return entry.value;
  }

  setAnalysis(key: string, value: import('../types/index.ts').ImpactAnalysis): void {
    this._ensureCapacity(this._scenarioCache);
    this._scenarioCache.set(key, {
      key,
      value,
      type: 'analysis',
      createdAt: Date.now(),
      expiresAt: Date.now() + this._ttlMs,
      accessCount: 0,
    });
  }

  // ─── Delta Cache ─────────────────────────────────────────────

  getDelta(key: string): any | null {
    const entry = this._deltaCache.get(key);
    if (!entry) {
      this._misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this._deltaCache.delete(key);
      this._expirations++;
      this._misses++;
      return null;
    }
    entry.accessCount++;
    this._hits++;
    return entry.value;
  }

  setDelta(key: string, value: any, type: string = 'delta'): void {
    this._ensureCapacity(this._deltaCache);
    this._deltaCache.set(key, {
      key,
      value,
      type,
      createdAt: Date.now(),
      expiresAt: Date.now() + this._ttlMs,
      accessCount: 0,
    });
  }

  // ─── Common Operations ───────────────────────────────────────

  has(key: string): boolean {
    const scenarioEntry = this._scenarioCache.get(key);
    if (scenarioEntry && Date.now() <= scenarioEntry.expiresAt) return true;
    const deltaEntry = this._deltaCache.get(key);
    if (deltaEntry && Date.now() <= deltaEntry.expiresAt) return true;
    return false;
  }

  invalidate(key: string): boolean {
    const deleted1 = this._scenarioCache.delete(key);
    const deleted2 = this._deltaCache.delete(key);
    if (deleted1 || deleted2) {
      this._invalidations++;
      return true;
    }
    return false;
  }

  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern);
    let count = 0;

    for (const key of [...this._scenarioCache.keys()]) {
      if (regex.test(key)) {
        this._scenarioCache.delete(key);
        count++;
      }
    }

    for (const key of [...this._deltaCache.keys()]) {
      if (regex.test(key)) {
        this._deltaCache.delete(key);
        count++;
      }
    }

    this._invalidations += count;
    return count;
  }

  invalidateAnalyses(): number {
    const count = this._scenarioCache.size;
    this._scenarioCache.clear();
    this._invalidations += count;
    return count;
  }

  invalidateDeltas(): number {
    const count = this._deltaCache.size;
    this._deltaCache.clear();
    this._invalidations += count;
    return count;
  }

  purgeExpired(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this._scenarioCache) {
      if (now > entry.expiresAt) {
        this._scenarioCache.delete(key);
        count++;
      }
    }

    for (const [key, entry] of this._deltaCache) {
      if (now > entry.expiresAt) {
        this._deltaCache.delete(key);
        count++;
      }
    }

    this._expirations += count;
    return count;
  }

  clear(): void {
    this._scenarioCache.clear();
    this._deltaCache.clear();
  }

  getStatistics(): ImpactCacheStatistics {
    const totalSize = this._scenarioCache.size + this._deltaCache.size;
    const totalOps = this._hits + this._misses;

    // Rough memory estimate: ~2KB per scenario entry, ~1KB per delta entry
    const memoryEstimateBytes =
      this._scenarioCache.size * 2048 +
      this._deltaCache.size * 1024;

    return Object.freeze({
      scenarioCacheSize: this._scenarioCache.size,
      deltaCacheSize: this._deltaCache.size,
      totalSize,
      capacity: this._capacity,
      hits: this._hits,
      misses: this._misses,
      hitRate: totalOps > 0 ? this._hits / totalOps : 0,
      evictions: this._evictions,
      expirations: this._expirations,
      invalidations: this._invalidations,
      memoryEstimateBytes,
    });
  }

  // ─── Internal Helpers ────────────────────────────────────────

  private _ensureCapacity(cache: Map<string, any>): void {
    while (cache.size >= this._capacity) {
      // Evict oldest entry (first in Map = least recently used in insertion order)
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
        this._evictions++;
      } else {
        break;
      }
    }
  }
}
