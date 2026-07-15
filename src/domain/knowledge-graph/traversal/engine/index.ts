/**
 * Knowledge Graph Traversal Engine — Main Orchestrator
 *
 * The GraphTraversalEngineImpl is the main entry point for all traversal operations.
 * It implements the domain GraphTraversalEngine contract and provides a rich
 * API for graph traversal, path finding, cycle detection, and subgraph extraction.
 *
 * Architecture:
 * - Delegates to algorithm implementations in ./algorithms/
 * - Delegates to neighborhood queries in ./neighborhood/
 * - Delegates to subgraph extraction in ./subgraph/
 * - Publishes events via EventPublisher (optional)
 * - Selects optimal strategy when AUTO is specified
 * - Uses only the public GraphRepository API
 *
 * Performance optimizations:
 * - AUTO strategy selection based on graph properties
 * - VisitedTracker for efficient visited-set management
 * - PathPool for GC-friendly path array reuse
 * - Statistics collector for real-time metrics
 */

import type { NodeId } from '../../types/index.ts';
import { TraversalDirection } from '../../types/index.ts';
import type { GraphNode, GraphEdge, GraphTraversal, GraphSubgraph } from '../../models/index.ts';
import type { GraphRepository } from '../../contracts/index.ts';
import type { EventPublisher } from '../../adapters/index.ts';
import type {
  TraversalStrategy,
  TraversalOptions,
  TraversalResult,
  TraversalPath,
  BFSOptions,
  DFSOptions,
  BidirectionalOptions,
  ShortestPathOptions,
  MultiPathOptions,
  CycleDetectionOptions,
  NeighborhoodOptions,
  SubgraphOptions,
  ReachabilityOptions,
  PathResult,
  Cycle,
  ConnectedComponent,
} from '../types/index.ts';
import {
  TraversalStrategy as TS,
  TerminationReason,
} from '../types/index.ts';
import {
  breadthFirstSearch,
  depthFirstSearch,
  depthFirstSearchRecursive,
  bidirectionalBFS,
  shortestPath,
  findPaths,
  findCycles,
  hasCycle,
  connectedComponents,
  reachableNodes,
  pathExists,
} from '../algorithms/index.ts';
import {
  neighbors,
  outgoing,
  incoming,
  neighborEdges,
} from '../neighborhood/index.ts';
import {
  extractSubgraph,
  extractSubgraphByType,
  extractSubgraphByPredicate,
} from '../subgraph/index.ts';
import {
  createTraversalStartedEvent,
  createTraversalCompletedEvent,
  createTraversalCancelledEvent,
  createPathFoundEvent,
  createCycleDetectedEvent,
} from '../events/index.ts';
import type { AnyTraversalEvent } from '../events/index.ts';

// ─── Engine Configuration ─────────────────────────────────────

/** Configuration for the traversal engine */
export interface TraversalEngineConfig {
  /** Default max depth for traversals (default: 10) */
  readonly defaultMaxDepth?: number;
  /** Default timeout in milliseconds (default: 0 = unlimited) */
  readonly defaultTimeout?: number;
  /** Default strategy (default: AUTO) */
  readonly defaultStrategy?: TraversalStrategy;
  /** Whether to publish events (default: true if publisher provided) */
  readonly publishEvents?: boolean;
}

const DEFAULT_CONFIG: Required<TraversalEngineConfig> = {
  defaultMaxDepth: 10,
  defaultTimeout: 0,
  defaultStrategy: TS.AUTO,
  publishEvents: true,
};

// ─── GraphTraversalEngineImpl ─────────────────────────────────

/**
 * Main implementation of the Graph Traversal Engine.
 *
 * Provides a comprehensive API for graph traversal that extends
 * the domain GraphTraversalEngine contract with additional methods:
 * - BFS, DFS, Bidirectional BFS with fine-grained options
 * - Shortest path and K-shortest paths
 * - Cycle detection and connected components
 * - Neighborhood queries with filters
 * - Subgraph extraction by depth, type, or predicate
 * - Reachability analysis
 * - Event publishing for observability
 * - Strategy auto-selection for optimal performance
 */
export class GraphTraversalEngineImpl {
  private readonly _repo: GraphRepository;
  private readonly _publisher: EventPublisher | null;
  private readonly _config: Required<TraversalEngineConfig>;

  constructor(
    repo: GraphRepository,
    publisher?: EventPublisher,
    config?: TraversalEngineConfig,
  ) {
    this._repo = repo;
    this._publisher = publisher ?? null;
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─── GraphTraversalEngine Contract Methods ──────────────────

  /**
   * Execute a traversal specification and return matching nodes.
   * Implements the domain GraphTraversalEngine contract.
   *
   * @param spec - Traversal specification
   * @returns Array of visited nodes
   */
  async traverse(spec: GraphTraversal): Promise<readonly GraphNode[]> {
    const result = await this.bfs(spec.startNodeId, {
      maxDepth: spec.maxDepth,
      direction: spec.direction as 'outgoing' | 'incoming' | 'both',
      edgeTypes: spec.edgeTypes,
      nodeTypes: spec.nodeTypes,
    });
    return result.visitedNodes;
  }

  /**
   * Find shortest path between two nodes.
   * Implements the domain GraphTraversalEngine contract.
   */
  async findPath(fromId: NodeId, toId: NodeId, maxDepth?: number): Promise<readonly GraphNode[]> {
    const result = await this.shortestPath(fromId, toId, { maxDepth });
    return result.found && result.path ? result.path.nodes : [];
  }

  /**
   * Find all neighbors of a node within given depth.
   * Implements the domain GraphTraversalEngine contract.
   */
  async findNeighbors(nodeId: NodeId, depth: number): Promise<readonly GraphNode[]> {
    return neighbors(this._repo, nodeId, { depth, direction: 'both' });
  }

  /**
   * Check if a path exists between two nodes.
   * Implements the domain GraphTraversalEngine contract.
   */
  async pathExists(fromId: NodeId, toId: NodeId): Promise<boolean> {
    return pathExists(this._repo, fromId, toId, this._config.defaultMaxDepth);
  }

  /**
   * Detect cycles in the graph.
   * Implements the domain GraphTraversalEngine contract.
   */
  async detectCycles(): Promise<readonly NodeId[][]> {
    const cycles = await findCycles(this._repo);
    return cycles.map(c => c.nodeIds);
  }

  // ─── Extended API: BFS ─────────────────────────────────────

  /**
   * Breadth-First Search traversal.
   *
   * Explores the graph level by level from a start node.
   * Guarantees shortest path in unweighted graphs.
   *
   * Time Complexity: O(V + E)
   */
  async bfs(startNodeId: NodeId, options?: BFSOptions): Promise<TraversalResult> {
    await this.publishEvent(
      createTraversalStartedEvent(TS.BFS, startNodeId, {
        maxDepth: options?.maxDepth ?? this._config.defaultMaxDepth,
        direction: options?.direction ?? 'outgoing',
      })
    );

    const result = await breadthFirstSearch(this._repo, startNodeId, {
      maxDepth: options?.maxDepth ?? this._config.defaultMaxDepth,
      timeout: options?.timeout ?? this._config.defaultTimeout,
      ...options,
    });

    await this.publishEvent(
      createTraversalCompletedEvent(TS.BFS, startNodeId, {
        visitedNodeCount: result.visitedNodes.length,
        visitedEdgeCount: result.visitedEdges.length,
        maxDepthReached: result.maxDepthReached,
        duration: result.duration,
        terminationReason: result.terminationReason,
      })
    );

    return result;
  }

  // ─── Extended API: DFS ─────────────────────────────────────

  /**
   * Depth-First Search traversal (iterative by default).
   *
   * Explores as deep as possible before backtracking.
   *
   * Time Complexity: O(V + E)
   */
  async dfs(startNodeId: NodeId, options?: DFSOptions): Promise<TraversalResult> {
    await this.publishEvent(
      createTraversalStartedEvent(TS.DFS, startNodeId, {
        maxDepth: options?.maxDepth ?? this._config.defaultMaxDepth,
        direction: options?.direction ?? 'outgoing',
      })
    );

    const result = options?.recursive
      ? await depthFirstSearchRecursive(this._repo, startNodeId, {
          maxDepth: options?.maxDepth ?? this._config.defaultMaxDepth,
          timeout: options?.timeout ?? this._config.defaultTimeout,
          ...options,
        })
      : await depthFirstSearch(this._repo, startNodeId, {
          maxDepth: options?.maxDepth ?? this._config.defaultMaxDepth,
          timeout: options?.timeout ?? this._config.defaultTimeout,
          ...options,
        });

    await this.publishEvent(
      createTraversalCompletedEvent(TS.DFS, startNodeId, {
        visitedNodeCount: result.visitedNodes.length,
        visitedEdgeCount: result.visitedEdges.length,
        maxDepthReached: result.maxDepthReached,
        duration: result.duration,
        terminationReason: result.terminationReason,
      })
    );

    return result;
  }

  // ─── Extended API: Bidirectional BFS ───────────────────────

  /**
   * Bidirectional BFS for shortest path between two nodes.
   *
   * Runs two simultaneous BFS waves from source and target.
   * Significantly faster than single BFS for distant nodes.
   *
   * Time Complexity: O(b^(d/2))
   */
  async bidirectional(
    sourceId: NodeId,
    targetId: NodeId,
    options?: BidirectionalOptions,
  ): Promise<PathResult> {
    await this.publishEvent(
      createTraversalStartedEvent(TS.BIDIRECTIONAL, sourceId, {
        targetNodeId: targetId,
        maxDepth: options?.maxDepth ?? this._config.defaultMaxDepth,
      })
    );

    const result = await bidirectionalBFS(this._repo, sourceId, targetId, {
      maxDepth: options?.maxDepth ?? this._config.defaultMaxDepth,
      timeout: options?.timeout ?? this._config.defaultTimeout,
      ...options,
    });

    if (result.found) {
      await this.publishEvent(
        createPathFoundEvent(sourceId, targetId, {
          pathLength: result.path?.length ?? 0,
          totalStrength: result.path?.totalStrength ?? 0,
          strategy: TS.BIDIRECTIONAL,
        })
      );
    }

    return result;
  }

  // ─── Extended API: Shortest Path ───────────────────────────

  /**
   * Find the shortest path between two nodes.
   *
   * Uses BFS for unweighted graphs (guaranteed shortest).
   * Automatically selects bidirectional search when beneficial.
   *
   * Time Complexity: O(V + E)
   */
  async shortestPath(
    sourceId: NodeId,
    targetId: NodeId,
    options?: ShortestPathOptions,
  ): Promise<PathResult> {
    await this.publishEvent(
      createTraversalStartedEvent(TS.BFS, sourceId, {
        targetNodeId: targetId,
        maxDepth: options?.maxDepth ?? this._config.defaultMaxDepth,
      })
    );

    const result = await shortestPath(this._repo, sourceId, targetId, {
      maxDepth: options?.maxDepth ?? this._config.defaultMaxDepth,
      timeout: options?.timeout ?? this._config.defaultTimeout,
      ...options,
    });

    if (result.found) {
      await this.publishEvent(
        createPathFoundEvent(sourceId, targetId, {
          pathLength: result.path?.length ?? 0,
          totalStrength: result.path?.totalStrength ?? 0,
          strategy: options?.bidirectional !== false ? TS.BIDIRECTIONAL : TS.BFS,
        })
      );
    }

    return result;
  }

  // ─── Extended API: Multi-Path ──────────────────────────────

  /**
   * Find K shortest paths between two nodes (Yen's algorithm).
   *
   * Returns paths sorted by length (shortest first).
   *
   * Time Complexity: O(K * V * E)
   */
  async findPaths(
    sourceId: NodeId,
    targetId: NodeId,
    options?: MultiPathOptions,
  ): Promise<PathResult> {
    const result = await findPaths(this._repo, sourceId, targetId, {
      maxDepth: options?.maxDepth ?? this._config.defaultMaxDepth,
      timeout: options?.timeout ?? this._config.defaultTimeout,
      ...options,
    });

    return result;
  }

  // ─── Extended API: Cycle Detection ─────────────────────────

  /**
   * Detect all cycles in the graph.
   *
   * Uses DFS with three-color marking (white/gray/black).
   *
   * Time Complexity: O(V + E)
   */
  async findCycles(options?: CycleDetectionOptions): Promise<readonly Cycle[]> {
    const cycles = await findCycles(this._repo, options);

    // Publish cycle events (limit to avoid flooding)
    const maxEvents = 10;
    for (let i = 0; i < Math.min(cycles.length, maxEvents); i++) {
      await this.publishEvent(
        createCycleDetectedEvent(cycles[i].length, cycles[i].nodeIds as readonly string[])
      );
    }

    return cycles;
  }

  /**
   * Check if the graph contains any cycle.
   * More efficient than findCycles when you only need a boolean.
   *
   * Time Complexity: O(V + E) but stops at first cycle
   */
  async hasCycle(): Promise<boolean> {
    return hasCycle(this._repo);
  }

  // ─── Extended API: Connected Components ────────────────────

  /**
   * Find all connected components in the graph.
   *
   * Treats the graph as undirected for component analysis.
   * Returns components sorted by size (largest first).
   *
   * Time Complexity: O(V + E)
   */
  async getConnectedComponents(): Promise<readonly ConnectedComponent[]> {
    return connectedComponents(this._repo);
  }

  // ─── Extended API: Reachability ────────────────────────────

  /**
   * Find all nodes reachable from a start node.
   *
   * Uses BFS for level-order discovery.
   *
   * Time Complexity: O(V + E)
   */
  async reachableNodes(
    startNodeId: NodeId,
    options?: ReachabilityOptions,
  ): Promise<TraversalResult> {
    return reachableNodes(this._repo, startNodeId, options);
  }

  // ─── Extended API: Neighborhood ────────────────────────────

  /**
   * Get all neighbor nodes of a given node.
   *
   * Supports direction filtering and type/predicate filters.
   *
   * Time Complexity: O(degree)
   */
  async getNeighbors(
    nodeId: NodeId,
    options?: NeighborhoodOptions,
  ): Promise<readonly GraphNode[]> {
    return neighbors(this._repo, nodeId, options);
  }

  /**
   * Get nodes connected via outgoing edges.
   */
  async getOutgoing(
    nodeId: NodeId,
    options?: Omit<NeighborhoodOptions, 'direction'>,
  ): Promise<readonly GraphNode[]> {
    return outgoing(this._repo, nodeId, options);
  }

  /**
   * Get nodes connected via incoming edges.
   */
  async getIncoming(
    nodeId: NodeId,
    options?: Omit<NeighborhoodOptions, 'direction'>,
  ): Promise<readonly GraphNode[]> {
    return incoming(this._repo, nodeId, options);
  }

  /**
   * Get the edges connecting a node to its neighbors.
   */
  async getNeighborEdges(
    nodeId: NodeId,
    options?: NeighborhoodOptions,
  ): Promise<readonly GraphEdge[]> {
    return neighborEdges(this._repo, nodeId, options);
  }

  // ─── Extended API: Subgraph Extraction ─────────────────────

  /**
   * Extract a subgraph starting from a seed node.
   *
   * Performs BFS from the seed, collecting matching nodes and edges
   * up to the specified depth.
   *
   * Time Complexity: O(V_sub + E_sub)
   */
  async extractSubgraph(
    startNodeId: NodeId,
    options?: SubgraphOptions,
  ): Promise<GraphSubgraph> {
    return extractSubgraph(this._repo, startNodeId, options);
  }

  /**
   * Extract a subgraph containing only nodes of specified types.
   */
  async extractSubgraphByType(
    nodeTypes: readonly string[],
    edgeTypes?: readonly string[],
  ): Promise<GraphSubgraph> {
    return extractSubgraphByType(this._repo, nodeTypes, edgeTypes);
  }

  /**
   * Extract a subgraph using a custom predicate.
   */
  async extractSubgraphByPredicate(
    predicate: (node: GraphNode) => boolean,
    edgePredicate?: (edge: GraphEdge) => boolean,
  ): Promise<GraphSubgraph> {
    return extractSubgraphByPredicate(this._repo, predicate, edgePredicate);
  }

  // ─── Extended API: Traversal with Strategy ─────────────────

  /**
   * Traverse with automatic strategy selection.
   *
   * When strategy is AUTO:
   * - If source and target are given → Bidirectional BFS
   * - If only source → BFS for shallow, DFS for deep exploration
   * - If target is close (estimated) → BFS
   * - Otherwise → DFS
   */
  async traverseWithStrategy(
    startNodeId: NodeId,
    strategy?: TraversalStrategy,
    options?: TraversalOptions,
  ): Promise<TraversalResult> {
    const selectedStrategy = strategy ?? this._config.defaultStrategy;

    switch (selectedStrategy) {
      case TS.BFS:
        return this.bfs(startNodeId, options);
      case TS.DFS:
        return this.dfs(startNodeId, options);
      case TS.BIDIRECTIONAL:
        // Bidirectional requires a target; fall back to BFS if not specified
        return this.bfs(startNodeId, options);
      case TS.AUTO:
      default:
        return this.autoSelectTraversal(startNodeId, options);
    }
  }

  // ─── Strategy Selection ────────────────────────────────────

  /**
   * Automatically select the best traversal strategy.
   *
   * Heuristics:
   * - Small maxDepth (≤3) → BFS (better for nearby exploration)
   * - Large maxDepth (>3) → DFS (better for deep exploration)
   * - Target node specified → Bidirectional BFS
   * - Dense graph → BFS (level-order is more predictable)
   * - Sparse graph → DFS (less branching, more efficient)
   */
  private async autoSelectTraversal(
    startNodeId: NodeId,
    options?: TraversalOptions,
  ): Promise<TraversalResult> {
    const maxDepth = options?.maxDepth ?? this._config.defaultMaxDepth;
    const nodeCount = await this._repo.nodeCount();

    // Heuristic: small depth → BFS, large depth → DFS
    if (maxDepth <= 3 || nodeCount < 100) {
      return this.bfs(startNodeId, options);
    }

    // For deeper traversals on larger graphs, DFS is often more efficient
    return this.dfs(startNodeId, options);
  }

  // ─── Event Publishing ──────────────────────────────────────

  private async publishEvent(event: AnyTraversalEvent): Promise<void> {
    if (!this._config.publishEvents || !this._publisher) return;
    try {
      await this._publisher.publish(event as any);
    } catch {
      // Event publishing failures should not affect traversal
    }
  }

  // ─── Accessors ─────────────────────────────────────────────

  /** Get the underlying repository */
  get repository(): GraphRepository {
    return this._repo;
  }

  /** Get the engine configuration */
  get config(): Readonly<Required<TraversalEngineConfig>> {
    return this._config;
  }
}
