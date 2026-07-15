/**
 * Knowledge Graph Runtime — Cache Layer
 *
 * Lightweight LRU-style cache for frequently accessed nodes, edges,
 * and traversal results. No external dependencies.
 *
 * Cache types:
 * - NodeCache: caches GraphNode lookups by NodeId
 * - EdgeCache: caches GraphEdge lookups by EdgeId
 * - TraversalCache: caches adjacency query results by NodeId
 *
 * All caches are bounded and evict least-recently-used entries
 * when capacity is reached.
 */

import type { GraphNode, GraphEdge } from '../../models/index.ts';
import type { NodeId, EdgeId } from '../../types/index.ts';

// ─── LRU Cache Core ─────────────────────────────────────────

/**
 * Simple LRU cache using a Map (which maintains insertion order in JS).
 * When capacity is exceeded, the oldest entry is evicted.
 */
class LRUCache<K, V> {
  private readonly _map: Map<K, V> = new Map();
  private readonly _capacity: number;

  constructor(capacity: number = 1000) {
    this._capacity = Math.max(1, capacity);
  }

  /** Get a value. Moves entry to most-recently-used position. */
  get(key: K): V | undefined {
    const value = this._map.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this._map.delete(key);
      this._map.set(key, value);
    }
    return value;
  }

  /** Set a value. Evicts oldest if at capacity. */
  set(key: K, value: V): void {
    if (this._map.has(key)) {
      this._map.delete(key);
    } else if (this._map.size >= this._capacity) {
      // Evict oldest (first entry)
      const firstKey = this._map.keys().next().value;
      if (firstKey !== undefined) {
        this._map.delete(firstKey);
      }
    }
    this._map.set(key, value);
  }

  /** Check if a key exists. */
  has(key: K): boolean {
    return this._map.has(key);
  }

  /** Delete a key. */
  delete(key: K): boolean {
    return this._map.delete(key);
  }

  /** Clear the cache. */
  clear(): void {
    this._map.clear();
  }

  /** Current size. */
  get size(): number {
    return this._map.size;
  }

  /** Maximum capacity. */
  get capacity(): number {
    return this._capacity;
  }
}

// ─── NodeCache ──────────────────────────────────────────────

/**
 * Cache for GraphNode lookups.
 * Reduces the need to traverse the primary Map for hot nodes.
 */
export class NodeCache {
  private readonly _cache: LRUCache<string, GraphNode>;

  constructor(capacity: number = 2000) {
    this._cache = new LRUCache<string, GraphNode>(capacity);
  }

  /** Get a cached node by ID. */
  get(id: NodeId): GraphNode | undefined {
    return this._cache.get(id);
  }

  /** Store a node in cache. */
  set(id: NodeId, node: GraphNode): void {
    this._cache.set(id, node);
  }

  /** Check if a node is cached. */
  has(id: NodeId): boolean {
    return this._cache.has(id);
  }

  /** Invalidate a cached node. */
  invalidate(id: NodeId): void {
    this._cache.delete(id);
  }

  /** Clear all cached nodes. */
  clear(): void {
    this._cache.clear();
  }

  /** Current cache size. */
  get size(): number {
    return this._cache.size;
  }

  /** Cache capacity. */
  get capacity(): number {
    return this._cache.capacity;
  }

  /** Cache hit rate tracking */
  private _hits = 0;
  private _misses = 0;

  /** Record a cache hit. */
  recordHit(): void {
    this._hits++;
  }

  /** Record a cache miss. */
  recordMiss(): void {
    this._misses++;
  }

  /** Get cache hit rate. */
  get hitRate(): number {
    const total = this._hits + this._misses;
    return total === 0 ? 0 : this._hits / total;
  }

  /** Reset hit/miss counters. */
  resetStats(): void {
    this._hits = 0;
    this._misses = 0;
  }
}

// ─── EdgeCache ──────────────────────────────────────────────

/**
 * Cache for GraphEdge lookups.
 * Reduces the need to traverse the primary Map for hot edges.
 */
export class EdgeCache {
  private readonly _cache: LRUCache<string, GraphEdge>;

  constructor(capacity: number = 5000) {
    this._cache = new LRUCache<string, GraphEdge>(capacity);
  }

  /** Get a cached edge by ID. */
  get(id: EdgeId): GraphEdge | undefined {
    return this._cache.get(id);
  }

  /** Store an edge in cache. */
  set(id: EdgeId, edge: GraphEdge): void {
    this._cache.set(id, edge);
  }

  /** Check if an edge is cached. */
  has(id: EdgeId): boolean {
    return this._cache.has(id);
  }

  /** Invalidate a cached edge. */
  invalidate(id: EdgeId): void {
    this._cache.delete(id);
  }

  /** Clear all cached edges. */
  clear(): void {
    this._cache.clear();
  }

  /** Current cache size. */
  get size(): number {
    return this._cache.size;
  }

  /** Cache capacity. */
  get capacity(): number {
    return this._cache.capacity;
  }
}

// ─── TraversalCache ─────────────────────────────────────────

/**
 * Cache for adjacency traversal results.
 * Key: `${nodeId}:${direction}` → value: array of GraphEdge
 * Direction: 'out' | 'in' | 'both'
 */
export class TraversalCache {
  private readonly _cache: LRUCache<string, readonly GraphEdge[]>;

  constructor(capacity: number = 3000) {
    this._cache = new LRUCache<string, readonly GraphEdge[]>(capacity);
  }

  /** Build cache key for adjacency queries. */
  private makeKey(nodeId: NodeId, direction: 'out' | 'in'): string {
    return `${nodeId}:${direction}`;
  }

  /** Get cached adjacency result. */
  get(nodeId: NodeId, direction: 'out' | 'in'): readonly GraphEdge[] | undefined {
    return this._cache.get(this.makeKey(nodeId, direction));
  }

  /** Store adjacency result in cache. */
  set(nodeId: NodeId, direction: 'out' | 'in', edges: readonly GraphEdge[]): void {
    this._cache.set(this.makeKey(nodeId, direction), edges);
  }

  /** Invalidate cached adjacency for a node (both directions). */
  invalidateNode(nodeId: NodeId): void {
    this._cache.delete(`${nodeId}:out`);
    this._cache.delete(`${nodeId}:in`);
  }

  /** Invalidate cached adjacency for an edge source/target. */
  invalidateEdge(edge: GraphEdge): void {
    this.invalidateNode(edge.sourceId);
    this.invalidateNode(edge.targetId);
  }

  /** Clear all traversal cache entries. */
  clear(): void {
    this._cache.clear();
  }

  /** Current cache size. */
  get size(): number {
    return this._cache.size;
  }

  /** Cache capacity. */
  get capacity(): number {
    return this._cache.capacity;
  }
}

// ─── Cache Manager ──────────────────────────────────────────

/**
 * Manages all caches as a cohesive unit.
 * Provides a single point of cache invalidation and management.
 */
export class CacheManager {
  readonly nodeCache: NodeCache;
  readonly edgeCache: EdgeCache;
  readonly traversalCache: TraversalCache;

  constructor(options: {
    nodeCacheCapacity?: number;
    edgeCacheCapacity?: number;
    traversalCacheCapacity?: number;
  } = {}) {
    this.nodeCache = new NodeCache(options.nodeCacheCapacity ?? 2000);
    this.edgeCache = new EdgeCache(options.edgeCacheCapacity ?? 5000);
    this.traversalCache = new TraversalCache(options.traversalCacheCapacity ?? 3000);
  }

  /** Invalidate all cache entries related to a node. */
  invalidateNode(nodeId: NodeId): void {
    this.nodeCache.invalidate(nodeId);
    this.traversalCache.invalidateNode(nodeId);
  }

  /** Invalidate all cache entries related to an edge. */
  invalidateEdge(edge: GraphEdge): void {
    this.edgeCache.invalidate(edge.id);
    this.traversalCache.invalidateEdge(edge);
  }

  /** Clear all caches. */
  clear(): void {
    this.nodeCache.clear();
    this.edgeCache.clear();
    this.traversalCache.clear();
  }

  /** Get aggregate cache statistics. */
  getStats(): {
    nodeCacheSize: number;
    edgeCacheSize: number;
    traversalCacheSize: number;
    nodeCacheHitRate: number;
  } {
    return {
      nodeCacheSize: this.nodeCache.size,
      edgeCacheSize: this.edgeCache.size,
      traversalCacheSize: this.traversalCache.size,
      nodeCacheHitRate: this.nodeCache.hitRate,
    };
  }
}
