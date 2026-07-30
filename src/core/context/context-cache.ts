/**
 * Context Cache — In-memory LRU cache for UnifiedContext instances.
 *
 * Evicts the least-recently-used entry when the cache is full.
 * Keyed by contextId (as string).
 *
 * Conforms to: DOM-002.000 (Domain Model)
 */
import type { UnifiedContext } from './types.js';

interface CacheEntry {
  readonly context: UnifiedContext;
  mutableLastAccessed: number;
}

/**
 * LRU cache for contexts.
 * When maxSize is exceeded, the least recently accessed context is evicted.
 */
export class ContextCache {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private accessCounter = 0;

  constructor(maxSize: number = 100) {
    if (maxSize < 1) {
      throw new Error('ContextCache maxSize must be at least 1');
    }
    this.maxSize = maxSize;
  }

  /** Retrieve a context from cache, updating access time. Returns null if not found. */
  get(contextId: string): UnifiedContext | null {
    const entry = this.cache.get(contextId);
    if (!entry) return null;

    // Update LRU timestamp
    entry.mutableLastAccessed = ++this.accessCounter;
    return entry.context;
  }

  /** Store a context in cache, evicting LRU entry if necessary. */
  set(contextId: string, context: UnifiedContext): void {
    // If already in cache, update access time and replace
    if (this.cache.has(contextId)) {
      this.cache.set(contextId, { context, mutableLastAccessed: ++this.accessCounter });
      return;
    }

    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(contextId, { context, mutableLastAccessed: ++this.accessCounter });
  }

  /** Remove a context from cache. Returns true if the entry existed. */
  delete(contextId: string): boolean {
    return this.cache.delete(contextId);
  }

  /** Clear all entries from the cache. */
  clear(): void {
    this.cache.clear();
  }

  /** Check if a context is cached. */
  has(contextId: string): boolean {
    return this.cache.has(contextId);
  }

  /** Number of contexts currently cached. */
  get size(): number {
    return this.cache.size;
  }

  /** Evict the least-recently-used entry from the cache. */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.mutableLastAccessed < oldestTime) {
        oldestTime = entry.mutableLastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      this.cache.delete(oldestKey);
    }
  }
}
