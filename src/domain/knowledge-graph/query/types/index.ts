/**
 * Knowledge Graph Query Engine — Types
 *
 * All type definitions for the Query Engine layer.
 * Defines the vocabulary of query operations: predicates, filters,
 * projections, aggregations, pagination, sorting, plans, and results.
 *
 * Design decisions:
 * - QueryPredicate is a typed discriminated union for serializable predicates
 * - CompositeFilter supports AND/OR/NOT/GROUP nesting
 * - QueryBuilder is immutable (each method returns a new instance)
 * - QueryPlan captures execution strategy for explain/debug
 * - QueryResult is the unified return type for all queries
 */

import type { NodeId, EdgeId, QueryId, Timestamp, Metadata } from '../../types/index.ts';
import type { GraphNode, GraphEdge, GraphSubgraph, GraphStatistics } from '../../models/index.ts';
import type { NodeType, EdgeType } from '../../types/index.ts';

// ─── Predicate Operator ────────────────────────────────────────

/**
 * Operators for query predicates.
 * Each operator defines a comparison or matching strategy.
 */
export enum PredicateOperator {
  Equals = 'eq',
  NotEquals = 'neq',
  Contains = 'contains',
  StartsWith = 'startsWith',
  EndsWith = 'endsWith',
  Regex = 'regex',
  Exists = 'exists',
  In = 'in',
  GreaterThan = 'gt',
  LessThan = 'lt',
  GreaterThanOrEqual = 'gte',
  LessThanOrEqual = 'lte',
}

// ─── Query Predicate ───────────────────────────────────────────

/**
 * A single predicate for filtering nodes or edges.
 * Serializable and composable — can be transmitted over the wire.
 */
export interface QueryPredicate {
  /** The field to test (e.g. 'identity.type', 'properties.severity') */
  readonly field: string;
  /** The comparison operator */
  readonly operator: PredicateOperator;
  /** The value to compare against */
  readonly value: string | number | boolean | readonly string[] | readonly number[] | null;
  /** Whether to negate the predicate result */
  readonly negated: boolean;
}

// ─── Composite Filter ──────────────────────────────────────────

/**
 * Logical composition of filters.
 * Supports AND, OR, NOT, and GROUP (parenthesized sub-expressions).
 */
export enum FilterComposition {
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  GROUP = 'GROUP',
}

/**
 * A composite filter that can contain predicates and nested filters.
 * Forms a tree structure for complex boolean expressions.
 */
export interface CompositeFilter {
  /** How to combine the children */
  readonly composition: FilterComposition;
  /** Child predicates at this level */
  readonly predicates: readonly QueryPredicate[];
  /** Nested composite filters */
  readonly filters: readonly CompositeFilter[];
}

// ─── Projection ────────────────────────────────────────────────

/**
 * Defines which fields to include or exclude in the result.
 * Only one mode (select/exclude) can be active at a time.
 */
export interface Projection {
  /** Fields to include (whitelist) */
  readonly select: readonly string[];
  /** Fields to exclude (blacklist) */
  readonly exclude: readonly string[];
}

/** Empty projection — include all fields */
export const EMPTY_PROJECTION: Projection = Object.freeze({ select: [], exclude: [] });

// ─── Aggregation ───────────────────────────────────────────────

/**
 * Aggregation operations supported by the query engine.
 */
export enum AggregationOp {
  Count = 'count',
  Sum = 'sum',
  Avg = 'avg',
  Min = 'min',
  Max = 'max',
  Distinct = 'distinct',
}

/**
 * A single aggregation specification.
 */
export interface AggregationSpec {
  /** The aggregation operation */
  readonly op: AggregationOp;
  /** The field to aggregate on (not needed for count/distinct) */
  readonly field?: string;
  /** Alias for the result column */
  readonly alias?: string;
}

/**
 * Result of an aggregation query.
 */
export interface AggregationResult {
  /** The alias or field name */
  readonly name: string;
  /** The aggregation operation used */
  readonly op: AggregationOp;
  /** The computed value */
  readonly value: number | string | readonly string[];
}

/**
 * Group-by specification for aggregation.
 */
export interface GroupBySpec {
  /** Fields to group by */
  readonly fields: readonly string[];
  /** Aggregations to compute per group */
  readonly aggregations: readonly AggregationSpec[];
}

/**
 * Result of a grouped aggregation.
 */
export interface GroupByResult {
  /** The group key values */
  readonly key: Readonly<Record<string, string | number>>;
  /** Aggregation results for this group */
  readonly results: readonly AggregationResult[];
}

// ─── Pagination ────────────────────────────────────────────────

/**
 * Pagination mode for query results.
 */
export enum PaginationMode {
  Offset = 'offset',
  Cursor = 'cursor',
  Page = 'page',
}

/**
 * Pagination specification.
 * Supports offset-based, cursor-based, and page-based pagination.
 */
export interface PaginationSpec {
  /** Pagination mode */
  readonly mode: PaginationMode;
  /** Number of results per page/batch */
  readonly limit: number;
  /** Offset for offset-based pagination */
  readonly offset: number;
  /** Cursor for cursor-based pagination (opaque token) */
  readonly cursor: string | null;
  /** Page number for page-based pagination (1-based) */
  readonly page: number;
}

/** Default pagination */
export const DEFAULT_PAGINATION: PaginationSpec = Object.freeze({
  mode: PaginationMode.Offset,
  limit: 100,
  offset: 0,
  cursor: null,
  page: 1,
});

// ─── Sorting ───────────────────────────────────────────────────

/**
 * Sort direction.
 */
export enum SortDirection {
  Ascending = 'asc',
  Descending = 'desc',
}

/**
 * A single sort specification.
 */
export interface SortSpec {
  /** Field to sort by */
  readonly field: string;
  /** Sort direction */
  readonly direction: SortDirection;
}

// ─── Query Target ──────────────────────────────────────────────

/**
 * What the query targets: nodes or edges.
 */
export enum QueryTarget {
  Nodes = 'nodes',
  Edges = 'edges',
  Subgraph = 'subgraph',
  Path = 'path',
}

// ─── Query Specification ───────────────────────────────────────

/**
 * Complete specification of a query.
 * This is the internal representation built by the QueryBuilder.
 */
export interface QuerySpecification {
  /** Unique query ID */
  readonly id: QueryId;
  /** What to query */
  readonly target: QueryTarget;
  /** Root composite filter */
  readonly filter: CompositeFilter | null;
  /** Projection specification */
  readonly projection: Projection;
  /** Aggregation specifications */
  readonly aggregations: readonly AggregationSpec[];
  /** Group-by specification */
  readonly groupBy: GroupBySpec | null;
  /** Pagination specification */
  readonly pagination: PaginationSpec;
  /** Sort specifications */
  readonly sort: readonly SortSpec[];
  /** Node type filter shortcut */
  readonly nodeTypes: readonly NodeType[];
  /** Edge type filter shortcut */
  readonly edgeTypes: readonly EdgeType[];
  /** Path query: source node ID */
  readonly pathSource: NodeId | null;
  /** Path query: target node ID */
  readonly pathTarget: NodeId | null;
  /** Path query: max depth */
  readonly pathMaxDepth: number;
  /** Subgraph query: start node ID */
  readonly subgraphStart: NodeId | null;
  /** Subgraph query: max depth */
  readonly subgraphMaxDepth: number;
  /** Whether to use cached results if available */
  readonly useCache: boolean;
  /** Query timeout in ms (0 = no timeout) */
  readonly timeout: number;
  /** Created timestamp */
  readonly createdAt: Timestamp;
}

// ─── Query Plan ────────────────────────────────────────────────

/**
 * A single stage in the query execution plan.
 */
export interface QueryPlanStage {
  /** Stage name (e.g. 'scan', 'filter', 'sort', 'paginate') */
  readonly name: string;
  /** Estimated cost of this stage */
  readonly estimatedCost: number;
  /** Estimated rows output */
  readonly estimatedRows: number;
  /** Description of what this stage does */
  readonly description: string;
  /** Index used (if any) */
  readonly indexUsed: string | null;
  /** Whether this stage can short-circuit */
  readonly canShortCircuit: boolean;
}

/**
 * Complete query execution plan.
 */
export interface QueryPlan {
  /** The query this plan is for */
  readonly queryId: QueryId;
  /** Ordered list of execution stages */
  readonly stages: readonly QueryPlanStage[];
  /** Total estimated cost */
  readonly totalEstimatedCost: number;
  /** Indexes that will be used */
  readonly indexesUsed: readonly string[];
  /** Filters that will be applied */
  readonly filtersApplied: readonly string[];
  /** Estimated complexity class */
  readonly estimatedComplexity: string;
  /** Whether the result can be served from cache */
  readonly cacheable: boolean;
}

// ─── Query Statistics ──────────────────────────────────────────

/**
 * Statistics collected during query execution.
 */
export interface QueryStatistics {
  /** Total execution time in ms */
  readonly executionTime: number;
  /** Number of nodes scanned */
  readonly nodesScanned: number;
  /** Number of edges scanned */
  readonly edgesScanned: number;
  /** Number of cache hits */
  readonly cacheHits: number;
  /** Number of cache misses */
  readonly cacheMisses: number;
  /** Number of rows returned */
  readonly returnedRows: number;
  /** Number of predicates evaluated */
  readonly predicatesEvaluated: number;
  /** Number of predicates that short-circuited */
  readonly predicatesShortCircuited: number;
  /** Peak memory estimate in bytes */
  readonly memoryEstimate: number;
}

/** Create empty query statistics */
export function emptyQueryStatistics(): QueryStatistics {
  return Object.freeze({
    executionTime: 0,
    nodesScanned: 0,
    edgesScanned: 0,
    cacheHits: 0,
    cacheMisses: 0,
    returnedRows: 0,
    predicatesEvaluated: 0,
    predicatesShortCircuited: 0,
    memoryEstimate: 0,
  });
}

// ─── Query Result ──────────────────────────────────────────────

/**
 * Unified result type for all query operations.
 */
export interface QueryResult<T = GraphNode | GraphEdge> {
  /** The query that produced this result */
  readonly queryId: QueryId;
  /** Matching items */
  readonly rows: readonly T[];
  /** Total count of matching items (before pagination) */
  readonly totalCount: number;
  /** Whether there are more results available */
  readonly hasMore: boolean;
  /** Pagination cursor for next page */
  readonly nextCursor: string | null;
  /** Query execution statistics */
  readonly statistics: QueryStatistics;
  /** Execution plan that was used */
  readonly plan: QueryPlan | null;
  /** Aggregation results (if aggregation was requested) */
  readonly aggregations: readonly AggregationResult[];
  /** Group-by results (if group-by was requested) */
  readonly groups: readonly GroupByResult[];
  /** Duration in ms */
  readonly duration: number;
}

/**
 * Result of an explain operation.
 */
export interface ExplainResult {
  /** The execution plan */
  readonly plan: QueryPlan;
  /** Human-readable description */
  readonly description: string;
  /** Estimated cost */
  readonly estimatedCost: number;
  /** Indexes used */
  readonly indexesUsed: readonly string[];
  /** Filters applied */
  readonly filtersApplied: readonly string[];
  /** Estimated complexity */
  readonly estimatedComplexity: string;
}

/**
 * Result of a subgraph query.
 */
export interface SubgraphQueryResult {
  readonly queryId: QueryId;
  readonly subgraph: GraphSubgraph;
  readonly statistics: QueryStatistics;
  readonly duration: number;
}

/**
 * Result of a path query.
 */
export interface PathQueryResult {
  readonly queryId: QueryId;
  readonly found: boolean;
  readonly path: readonly GraphNode[];
  readonly alternatives: readonly (readonly GraphNode[])[];
  readonly statistics: QueryStatistics;
  readonly duration: number;
}

// ─── Query Engine Config ───────────────────────────────────────

/**
 * Configuration for the query engine.
 */
export interface QueryEngineConfig {
  /** Maximum result size (default: 10000) */
  readonly maxResultSize?: number;
  /** Default page size (default: 100) */
  readonly defaultPageSize?: number;
  /** Cache TTL in ms (default: 60000) */
  readonly cacheTTL?: number;
  /** Maximum cache entries (default: 500) */
  readonly maxCacheEntries?: number;
  /** Whether to enable query caching (default: true) */
  readonly enableCache?: boolean;
  /** Default timeout in ms (default: 30000) */
  readonly defaultTimeout?: number;
  /** Whether to collect statistics (default: true) */
  readonly collectStatistics?: boolean;
}

/** Default configuration */
export const DEFAULT_QUERY_ENGINE_CONFIG: Required<QueryEngineConfig> = Object.freeze({
  maxResultSize: 10000,
  defaultPageSize: 100,
  cacheTTL: 60000,
  maxCacheEntries: 500,
  enableCache: true,
  defaultTimeout: 30000,
  collectStatistics: true,
});

// ─── Cache Entry ───────────────────────────────────────────────

/**
 * Internal cache entry for query results.
 */
export interface QueryCacheEntry<T = unknown> {
  readonly key: string;
  readonly result: QueryResult<T>;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly hitCount: number;
}
