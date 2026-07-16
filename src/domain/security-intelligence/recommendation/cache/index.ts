/**
 * Security Intelligence Recommendation Engine — Cache
 *
 * Dual LRU cache for recommendations and plans.
 * Follows the same pattern as ImpactCache.
 */

import type {
  Recommendation, RemediationPlan,
  RecommendationCacheStatistics, RecommendationCacheEntry,
  Timestamp, Metadata,
} from '../types/index.ts';

// ─── Cache Entry (internal) ─────────────────────────────────

interface InternalCacheEntry<T> {
  readonly key: string;
  readonly value: T;
  readonly createdAt: number;
  readonly expiresAt: number;
  accessCount: number;
}

// ─── Recommendation Cache ───────────────────────────────────

export class RecommendationCache {
  private readonly _recommendationCache: Map<string, InternalCacheEntry<Recommendation>>;
  private readonly _planningCache: Map<string, InternalCacheEntry<RemediationPlan>>;
  private readonly _capacity: number;
  private readonly _ttlMs: number;
  private _hits = 0;
  private _misses = 0;
  private _evictions = 0;
  private _expirations = 0;

  constructor(params: { capacity?: number; ttlMs?: number } = {}) {
    this._capacity = params.capacity ?? 5_000;
    this._ttlMs = params.ttlMs ?? 300_000;
    this._recommendationCache = new Map();
    this._planningCache = new Map();
  }

  // ─── Recommendation Cache Operations ────────────────────

  getRecommendation(key: string): Recommendation | null {
    const entry = this._recommendationCache.get(key);
    if (!entry) {
      this._misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this._recommendationCache.delete(key);
      this._expirations++;
      this._misses++;
      return null;
    }
    entry.accessCount++;
    this._hits++;
    return entry.value;
  }

  setRecommendation(key: string, value: Recommendation): void {
    this._evictIfNeeded(this._recommendationCache);
    const now = Date.now();
    this._recommendationCache.set(key, {
      key,
      value,
      createdAt: now,
      expiresAt: now + this._ttlMs,
      accessCount: 0,
    });
  }

  // ─── Planning Cache Operations ──────────────────────────

  getPlan(key: string): RemediationPlan | null {
    const entry = this._planningCache.get(key);
    if (!entry) {
      this._misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this._planningCache.delete(key);
      this._expirations++;
      this._misses++;
      return null;
    }
    entry.accessCount++;
    this._hits++;
    return entry.value;
  }

  setPlan(key: string, value: RemediationPlan): void {
    this._evictIfNeeded(this._planningCache);
    const now = Date.now();
    this._planningCache.set(key, {
      key,
      value,
      createdAt: now,
      expiresAt: now + this._ttlMs,
      accessCount: 0,
    });
  }

  // ─── Common Operations ─────────────────────────────────

  has(key: string): boolean {
    return this._recommendationCache.has(key) || this._planningCache.has(key);
  }

  invalidate(key: string): boolean {
    return this._recommendationCache.delete(key) || this._planningCache.delete(key);
  }

  invalidatePattern(pattern: string): number {
    let count = 0;
    // Use substring matching instead of RegExp to prevent ReDoS attacks.
    // A user-supplied regex pattern can cause catastrophic backtracking.
    for (const k of [...this._recommendationCache.keys()]) {
      if (k.includes(pattern)) {
        this._recommendationCache.delete(k);
        count++;
      }
    }
    for (const k of [...this._planningCache.keys()]) {
      if (k.includes(pattern)) {
        this._planningCache.delete(k);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this._recommendationCache.clear();
    this._planningCache.clear();
    this._hits = 0;
    this._misses = 0;
    this._evictions = 0;
    this._expirations = 0;
  }

  purgeExpired(): number {
    const now = Date.now();
    let count = 0;
    for (const [k, v] of this._recommendationCache) {
      if (now > v.expiresAt) {
        this._recommendationCache.delete(k);
        this._expirations++;
        count++;
      }
    }
    for (const [k, v] of this._planningCache) {
      if (now > v.expiresAt) {
        this._planningCache.delete(k);
        this._expirations++;
        count++;
      }
    }
    return count;
  }

  getStatistics(): RecommendationCacheStatistics {
    const recSize = this._recommendationCache.size;
    const planSize = this._planningCache.size;
    const total = this._hits + this._misses;
    return Object.freeze({
      recommendationCacheSize: recSize,
      planningCacheSize: planSize,
      totalSize: recSize + planSize,
      capacity: this._capacity,
      hits: this._hits,
      misses: this._misses,
      hitRate: total > 0 ? this._hits / total : 0,
      evictions: this._evictions,
      expirations: this._expirations,
      memoryEstimateBytes: (recSize + planSize) * 2048, // ~2KB per entry
    });
  }

  // ─── Private Helpers ────────────────────────────────────

  private _evictIfNeeded<T>(cache: Map<string, InternalCacheEntry<T>>): void {
    if (cache.size >= this._capacity) {
      // FIFO eviction from Map insertion order
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
        this._evictions++;
      }
    }
  }
}
