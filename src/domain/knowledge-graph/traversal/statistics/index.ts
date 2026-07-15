/**
 * Knowledge Graph Traversal Engine — Statistics Collection
 *
 * Provides a statistics collector that tracks metrics during traversal:
 * - Visited nodes and edges counts
 * - Maximum depth reached
 * - Branching factor
 * - Duration
 * - Memory estimate
 * - Path and cycle counts
 *
 * The collector is mutable during traversal but produces
 * immutable TraversalStatistics snapshots.
 */

import type { NodeId, EdgeId } from '../../types/index.ts';
import type { TraversalStatistics } from '../types/index.ts';
import { createTraversalStatistics } from '../types/index.ts';

/**
 * Mutable statistics collector for use during traversal.
 * Call snapshot() to produce an immutable TraversalStatistics.
 */
export class TraversalStatisticsCollector {
  private _visitedNodeCount = 0;
  private _visitedEdgeCount = 0;
  private _maxDepth = 0;
  private _pathCount = 0;
  private _cycleCount = 0;
  private _startTime: number;
  private _branchingFactors: number[] = [];

  constructor() {
    this._startTime = Date.now();
  }

  /** Record a visited node */
  recordNodeVisit(depth: number): void {
    this._visitedNodeCount++;
    if (depth > this._maxDepth) {
      this._maxDepth = depth;
    }
  }

  /** Record a traversed edge */
  recordEdgeTraversal(): void {
    this._visitedEdgeCount++;
  }

  /** Record branching factor for a node */
  recordBranchingFactor(factor: number): void {
    this._branchingFactors.push(factor);
  }

  /** Record a discovered path */
  recordPath(): void {
    this._pathCount++;
  }

  /** Record a detected cycle */
  recordCycle(): void {
    this._cycleCount++;
  }

  /** Reset the start time (for timing) */
  resetTimer(): void {
    this._startTime = Date.now();
  }

  /** Get the elapsed time in milliseconds */
  get elapsed(): number {
    return Date.now() - this._startTime;
  }

  /** Current visited node count */
  get visitedNodeCount(): number {
    return this._visitedNodeCount;
  }

  /** Current visited edge count */
  get visitedEdgeCount(): number {
    return this._visitedEdgeCount;
  }

  /** Current max depth */
  get maxDepth(): number {
    return this._maxDepth;
  }

  /** Current path count */
  get pathCount(): number {
    return this._pathCount;
  }

  /** Current cycle count */
  get cycleCount(): number {
    return this._cycleCount;
  }

  /**
   * Produce an immutable snapshot of the current statistics.
   */
  snapshot(): TraversalStatistics {
    const avgBranching = this._branchingFactors.length > 0
      ? this._branchingFactors.reduce((a, b) => a + b, 0) / this._branchingFactors.length
      : this._visitedNodeCount > 0
        ? this._visitedEdgeCount / this._visitedNodeCount
        : 0;

    return createTraversalStatistics({
      visitedNodeCount: this._visitedNodeCount,
      visitedEdgeCount: this._visitedEdgeCount,
      maxDepth: this._maxDepth,
      duration: this.elapsed,
      pathCount: this._pathCount,
      cycleCount: this._cycleCount,
    });
  }

  /**
   * Reset all statistics for reuse.
   */
  reset(): void {
    this._visitedNodeCount = 0;
    this._visitedEdgeCount = 0;
    this._maxDepth = 0;
    this._pathCount = 0;
    this._cycleCount = 0;
    this._branchingFactors = [];
    this._startTime = Date.now();
  }
}

/**
 * Lightweight visited-set tracker using a Set<NodeId>.
 * Provides O(1) membership check and add operations.
 *
 * For very large graphs (100K+ nodes), a bitmap-based implementation
 * would be more memory-efficient, but requires a node-id-to-index mapping.
 * The current Set-based approach is simpler and sufficient for most cases.
 */
export class VisitedTracker {
  private readonly _visited = new Set<NodeId>();

  /** Mark a node as visited */
  visit(nodeId: NodeId): void {
    this._visited.add(nodeId);
  }

  /** Check if a node has been visited */
  isVisited(nodeId: NodeId): boolean {
    return this._visited.has(nodeId);
  }

  /** Get the count of visited nodes */
  get size(): number {
    return this._visited.size;
  }

  /** Get all visited node IDs */
  get ids(): ReadonlySet<NodeId> {
    return this._visited;
  }

  /** Reset the visited set */
  reset(): void {
    this._visited.clear();
  }
}

/**
 * Object pool for path arrays to reduce GC pressure.
 * Reuses arrays between traversals for paths of similar length.
 */
export class PathPool {
  private readonly _pool: NodeId[][] = [];
  private _created = 0;
  private _reused = 0;

  /** Acquire a path array */
  acquire(): NodeId[] {
    if (this._pool.length > 0) {
      this._reused++;
      return this._pool.pop()!;
    }
    this._created++;
    return [];
  }

  /** Release a path array back to the pool */
  release(path: NodeId[]): void {
    path.length = 0;
    if (this._pool.length < 1000) { // Cap pool size
      this._pool.push(path);
    }
  }

  /** Pool statistics */
  get stats(): { created: number; reused: number; poolSize: number } {
    return {
      created: this._created,
      reused: this._reused,
      poolSize: this._pool.length,
    };
  }

  /** Reset pool */
  reset(): void {
    this._pool.length = 0;
    this._created = 0;
    this._reused = 0;
  }
}
