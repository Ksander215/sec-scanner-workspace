/**
 * Knowledge Graph Traversal Engine — Types
 *
 * All type definitions for the Traversal Engine layer.
 * Types define the vocabulary of traversal operations:
 * strategies, options, filters, results, contexts, events, and statistics.
 *
 * Design decisions:
 * - TraversalStrategy enum for algorithm selection (AUTO delegates to engine)
 * - Immutable TraversalContext tracks walk state
 * - TraversalResult captures complete outcome including statistics
 * - Predicate types enable filtering at node/edge level
 * - TerminationReason for graceful result interpretation
 */

import type { NodeId, EdgeId, Timestamp, Metadata } from '../../types/index.ts';
import type { GraphNode, GraphEdge } from '../../models/index.ts';
import type { NodeType, EdgeType, TraversalDirection } from '../../types/index.ts';

// ─── Traversal Strategy ───────────────────────────────────────

/**
 * Strategy for graph traversal algorithm selection.
 * AUTO lets the engine pick the best algorithm based on graph properties.
 */
export enum TraversalStrategy {
  /** Engine selects optimal algorithm based on graph properties and query */
  AUTO = 'AUTO',
  /** Breadth-First Search — level-by-level exploration */
  BFS = 'BFS',
  /** Depth-First Search — deep exploration before backtracking */
  DFS = 'DFS',
  /** Bidirectional BFS — two-wave search from source and target */
  BIDIRECTIONAL = 'BIDIRECTIONAL',
}

// ─── Termination Reason ───────────────────────────────────────

/**
 * Why a traversal terminated.
 * Allows callers to distinguish between complete and partial results.
 */
export enum TerminationReason {
  /** All reachable nodes were visited */
  Completed = 'Completed',
  /** Maximum depth was reached */
  MaxDepthReached = 'MaxDepthReached',
  /** Maximum number of visited nodes was reached */
  MaxNodesReached = 'MaxNodesReached',
  /** Traversal was explicitly cancelled */
  Cancelled = 'Cancelled',
  /** Time limit exceeded */
  Timeout = 'Timeout',
  /** Target node was found (for path searches) */
  TargetFound = 'TargetFound',
  /** No more nodes to visit */
  Exhausted = 'Exhausted',
}

// ─── Predicates ───────────────────────────────────────────────

/** Predicate function for filtering nodes during traversal */
export type NodePredicate = (node: GraphNode) => boolean;

/** Predicate function for filtering edges during traversal */
export type EdgePredicate = (edge: GraphEdge) => boolean;

// ─── Visitor Callbacks ────────────────────────────────────────

/**
 * Visitor callback invoked for each node during traversal.
 * Return false to skip this node's edges (prune branch).
 */
export type NodeVisitor = (node: GraphNode, depth: number) => boolean | void;

/**
 * Visitor callback invoked for each edge during traversal.
 * Return false to skip traversing this edge.
 */
export type EdgeVisitor = (edge: GraphEdge, depth: number) => boolean | void;

// ─── Cancellation ─────────────────────────────────────────────

/**
 * Cancellation token for traversal operations.
 * Allows external cancellation of long-running traversals.
 */
export interface CancellationToken {
  /** Whether cancellation has been requested */
  readonly isCancelled: boolean;
  /** Optional reason for cancellation */
  readonly reason?: string;
}

/** Create a simple cancellation token */
export function createCancellationToken(): { token: CancellationToken; cancel: (reason?: string) => void } {
  let cancelled = false;
  let reason: string | undefined;
  return {
    token: Object.freeze({
      get isCancelled() { return cancelled; },
      get reason() { return reason; },
    }),
    cancel: (r?: string) => { cancelled = true; reason = r; },
  };
}

// ─── Traversal Options ────────────────────────────────────────

/** Options common to all traversal operations */
export interface TraversalOptions {
  /** Maximum depth to traverse (default: 10) */
  readonly maxDepth?: number;
  /** Maximum number of nodes to visit (0 = unlimited) */
  readonly maxNodes?: number;
  /** Maximum time in milliseconds (0 = unlimited) */
  readonly timeout?: number;
  /** Direction of traversal */
  readonly direction?: TraversalDirection | 'outgoing' | 'incoming' | 'both';
  /** Filter edges by types (empty = all) */
  readonly edgeTypes?: readonly EdgeType[];
  /** Filter nodes by types (empty = all) */
  readonly nodeTypes?: readonly NodeType[];
  /** Custom edge filter predicate */
  readonly edgeFilter?: EdgePredicate;
  /** Custom node filter predicate */
  readonly nodeFilter?: NodePredicate;
  /** Visitor callback for nodes */
  readonly nodeVisitor?: NodeVisitor;
  /** Visitor callback for edges */
  readonly edgeVisitor?: EdgeVisitor;
  /** Cancellation token */
  readonly cancellationToken?: CancellationToken;
  /** Whether to collect visited edges (default: true) */
  readonly collectEdges?: boolean;
  /** Whether to collect paths (default: false) */
  readonly collectPaths?: boolean;
}

/** Options specific to BFS */
export interface BFSOptions extends TraversalOptions {
  readonly strategy?: TraversalStrategy.BFS;
}

/** Options specific to DFS */
export interface DFSOptions extends TraversalOptions {
  /** Whether to use recursive implementation (default: false = iterative) */
  readonly recursive?: boolean;
  readonly strategy?: TraversalStrategy.DFS;
}

/** Options specific to Bidirectional BFS */
export interface BidirectionalOptions extends TraversalOptions {
  readonly strategy?: TraversalStrategy.BIDIRECTIONAL;
}

/** Options for shortest path search */
export interface ShortestPathOptions extends TraversalOptions {
  /** Use bidirectional search when possible (default: auto) */
  readonly bidirectional?: boolean;
}

/** Options for multi-path search (K-shortest paths) */
export interface MultiPathOptions extends TraversalOptions {
  /** Maximum number of paths to return */
  readonly maxPaths?: number;
  /** Whether paths must be node-disjoint (default: false) */
  readonly nodeDisjoint?: boolean;
}

/** Options for cycle detection */
export interface CycleDetectionOptions {
  /** Maximum cycles to find (0 = all) */
  readonly maxCycles?: number;
  /** Filter cycles by minimum length */
  readonly minLength?: number;
  /** Maximum time in milliseconds */
  readonly timeout?: number;
  /** Cancellation token */
  readonly cancellationToken?: CancellationToken;
}

/** Options for neighborhood queries */
export interface NeighborhoodOptions {
  /** Depth of neighborhood (default: 1) */
  readonly depth?: number;
  /** Direction of edges to follow */
  readonly direction?: TraversalDirection | 'outgoing' | 'incoming' | 'both';
  /** Filter by edge types */
  readonly edgeTypes?: readonly EdgeType[];
  /** Filter by node types */
  readonly nodeTypes?: readonly NodeType[];
  /** Custom edge filter */
  readonly edgeFilter?: EdgePredicate;
  /** Custom node filter */
  readonly nodeFilter?: NodePredicate;
}

/** Options for subgraph extraction */
export interface SubgraphOptions {
  /** Maximum depth from start nodes */
  readonly maxDepth?: number;
  /** Direction of edges to follow */
  readonly direction?: TraversalDirection | 'outgoing' | 'incoming' | 'both';
  /** Filter by edge types */
  readonly edgeTypes?: readonly EdgeType[];
  /** Filter by node types */
  readonly nodeTypes?: readonly NodeType[];
  /** Custom edge filter */
  readonly edgeFilter?: EdgePredicate;
  /** Custom node filter */
  readonly nodeFilter?: NodePredicate;
  /** Maximum number of nodes in subgraph (0 = unlimited) */
  readonly maxNodes?: number;
  /** Cancellation token */
  readonly cancellationToken?: CancellationToken;
}

/** Options for reachability analysis */
export interface ReachabilityOptions extends TraversalOptions {
  /** Whether to include the start node (default: true) */
  readonly includeStart?: boolean;
}

// ─── Traversal Context ────────────────────────────────────────

/**
 * Immutable snapshot of traversal state at a given point.
 * Created during traversal for inspection and debugging.
 */
export interface TraversalContext {
  /** Set of visited node IDs */
  readonly visited: ReadonlySet<NodeId>;
  /** Current depth of traversal */
  readonly depth: number;
  /** Current path being explored (as node IDs) */
  readonly path: readonly NodeId[];
  /** Additional metadata about the traversal state */
  readonly metadata: Readonly<Record<string, unknown>>;
  /** Traversal statistics at this point */
  readonly statistics: TraversalStatistics;
}

// ─── Traversal Result ─────────────────────────────────────────

/**
 * Complete result of a traversal operation.
 * Contains all visited nodes/edges, discovered paths, and statistics.
 */
export interface TraversalResult {
  /** All nodes visited during traversal, in visitation order */
  readonly visitedNodes: readonly GraphNode[];
  /** All edges traversed during traversal */
  readonly visitedEdges: readonly GraphEdge[];
  /** Paths discovered (if collectPaths was true) */
  readonly paths: readonly TraversalPath[];
  /** Traversal statistics */
  readonly statistics: TraversalStatistics;
  /** Duration of the traversal in milliseconds */
  readonly duration: number;
  /** Maximum depth reached */
  readonly maxDepthReached: number;
  /** Why the traversal terminated */
  readonly terminationReason: TerminationReason;
  /** Strategy that was used (may differ from requested if AUTO) */
  readonly strategyUsed: TraversalStrategy;
}

/**
 * A single path in the graph, consisting of alternating nodes and edges.
 */
export interface TraversalPath {
  /** Nodes in the path, from start to end */
  readonly nodes: readonly GraphNode[];
  /** Edges connecting the nodes */
  readonly edges: readonly GraphEdge[];
  /** Total path length (number of edges) */
  readonly length: number;
  /** Sum of edge strengths along the path */
  readonly totalStrength: number;
}

/** An empty traversal result */
export function emptyTraversalResult(
  strategy: TraversalStrategy = TraversalStrategy.AUTO,
  duration: number = 0,
): TraversalResult {
  return Object.freeze({
    visitedNodes: [],
    visitedEdges: [],
    paths: [],
    statistics: emptyTraversalStatistics(),
    duration,
    maxDepthReached: 0,
    terminationReason: TerminationReason.Exhausted,
    strategyUsed: strategy,
  });
}

// ─── Traversal Statistics ─────────────────────────────────────

/**
 * Statistics collected during traversal.
 * Provides performance and behavioral metrics.
 */
export interface TraversalStatistics {
  /** Number of nodes visited */
  readonly visitedNodeCount: number;
  /** Number of edges traversed */
  readonly visitedEdgeCount: number;
  /** Maximum depth reached */
  readonly maxDepth: number;
  /** Average branching factor */
  readonly avgBranchingFactor: number;
  /** Duration in milliseconds */
  readonly duration: number;
  /** Estimated memory usage in bytes */
  readonly memoryEstimate: number;
  /** Number of paths found */
  readonly pathCount: number;
  /** Number of cycles found */
  readonly cycleCount: number;
}

/** Create empty statistics */
export function emptyTraversalStatistics(): TraversalStatistics {
  return Object.freeze({
    visitedNodeCount: 0,
    visitedEdgeCount: 0,
    maxDepth: 0,
    avgBranchingFactor: 0,
    duration: 0,
    memoryEstimate: 0,
    pathCount: 0,
    cycleCount: 0,
  });
}

/** Create statistics from collected data */
export function createTraversalStatistics(data: {
  visitedNodeCount: number;
  visitedEdgeCount: number;
  maxDepth: number;
  duration: number;
  pathCount?: number;
  cycleCount?: number;
}): TraversalStatistics {
  const avgBranchingFactor = data.visitedNodeCount > 0
    ? data.visitedEdgeCount / data.visitedNodeCount
    : 0;
  // Rough memory estimate: node ID (32 bytes) + edge ID (32 bytes) + overhead
  const memoryEstimate =
    data.visitedNodeCount * 64 +
    data.visitedEdgeCount * 64 +
    data.visitedNodeCount * 32; // visited set overhead

  return Object.freeze({
    visitedNodeCount: data.visitedNodeCount,
    visitedEdgeCount: data.visitedEdgeCount,
    maxDepth: data.maxDepth,
    avgBranchingFactor: Math.round(avgBranchingFactor * 100) / 100,
    duration: data.duration,
    memoryEstimate,
    pathCount: data.pathCount ?? 0,
    cycleCount: data.cycleCount ?? 0,
  });
}

// ─── Connected Component ──────────────────────────────────────

/**
 * A connected component in the graph.
 * Contains the set of node IDs and optionally the edges within.
 */
export interface ConnectedComponent {
  /** Node IDs in this component */
  readonly nodeIds: readonly NodeId[];
  /** Size of the component (number of nodes) */
  readonly size: number;
  /** Whether the component is a single node with no edges */
  readonly isIsolated: boolean;
}

// ─── Cycle ────────────────────────────────────────────────────

/**
 * A cycle in the graph.
 * Represented as an ordered sequence of node IDs forming the cycle.
 */
export interface Cycle {
  /** Node IDs forming the cycle */
  readonly nodeIds: readonly NodeId[];
  /** Edge IDs connecting the cycle */
  readonly edgeIds: readonly EdgeId[];
  /** Length of the cycle (number of edges) */
  readonly length: number;
}

// ─── Path Result ──────────────────────────────────────────────

/**
 * Result of a path search operation.
 * Contains the path and optional alternatives.
 */
export interface PathResult {
  /** Whether a path was found */
  readonly found: boolean;
  /** The primary path (shortest/first found) */
  readonly path: TraversalPath | null;
  /** Alternative paths (for multi-path search) */
  readonly alternatives: readonly TraversalPath[];
  /** Total number of paths found */
  readonly totalPaths: number;
  /** Duration in milliseconds */
  readonly duration: number;
}

/** Create a not-found path result */
export function notFoundPathResult(duration: number = 0): PathResult {
  return Object.freeze({
    found: false,
    path: null,
    alternatives: [],
    totalPaths: 0,
    duration,
  });
}
