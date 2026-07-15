/**
 * Knowledge Graph Traversal Engine — Public API
 *
 * Single entry point for the Traversal Engine layer.
 * The engine provides comprehensive graph traversal capabilities
 * built on top of the GraphRepository interface.
 *
 * Usage:
 * ```ts
 * import { GraphTraversalEngineImpl } from './traversal/index.ts';
 *
 * const engine = new GraphTraversalEngineImpl(repository);
 * const result = await engine.bfs(startNodeId, { maxDepth: 5 });
 * const path = await engine.shortestPath(sourceId, targetId);
 * const cycles = await engine.findCycles();
 * ```
 *
 * Architecture:
 * - Algorithms: BFS, DFS, Bidirectional BFS, Shortest Path, K-Shortest, Cycle Detection
 * - Neighborhood: Direct and multi-hop neighbor queries with filters
 * - Subgraph: Extraction by depth, type, and predicate
 * - Events: Traversal lifecycle events for observability
 * - Statistics: Real-time metrics collection
 * - Engine: Main orchestrator with strategy selection
 */

// ─── Types ────────────────────────────────────────────────────

export type {
  TraversalOptions,
  TraversalResult,
  TraversalContext,
  TraversalPath,
  TraversalStatistics,
  TerminationReason,
  NodePredicate,
  EdgePredicate,
  NodeVisitor,
  EdgeVisitor,
  CancellationToken,
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
} from './types/index.ts';

export {
  TraversalStrategy,
  TerminationReason as TerminationReasonEnum,
  emptyTraversalResult,
  emptyTraversalStatistics,
  createTraversalStatistics,
  createCancellationToken,
  notFoundPathResult,
} from './types/index.ts';

// ─── Algorithms ───────────────────────────────────────────────

export {
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
} from './algorithms/index.ts';

// ─── Neighborhood ─────────────────────────────────────────────

export {
  neighbors,
  outgoing,
  incoming,
  neighborEdges,
} from './neighborhood/index.ts';

// ─── Subgraph ─────────────────────────────────────────────────

export {
  extractSubgraph,
  extractSubgraphByType,
  extractSubgraphByPredicate,
} from './subgraph/index.ts';

// ─── Events ───────────────────────────────────────────────────

export type {
  TraversalEvent,
  TraversalStartedEvent,
  TraversalCompletedEvent,
  TraversalCancelledEvent,
  PathFoundEvent,
  CycleDetectedEvent,
  AnyTraversalEvent,
} from './events/index.ts';

export {
  createTraversalStartedEvent,
  createTraversalCompletedEvent,
  createTraversalCancelledEvent,
  createPathFoundEvent,
  createCycleDetectedEvent,
} from './events/index.ts';

// ─── Statistics ───────────────────────────────────────────────

export {
  TraversalStatisticsCollector,
  VisitedTracker,
  PathPool,
} from './statistics/index.ts';

// ─── Engine ───────────────────────────────────────────────────

export {
  GraphTraversalEngineImpl,
} from './engine/index.ts';

export type {
  TraversalEngineConfig,
} from './engine/index.ts';
