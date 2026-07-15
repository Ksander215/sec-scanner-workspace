/**
 * Knowledge Graph Query Engine — Immutable Fluent Query Builder
 *
 * Provides a chainable, immutable API for constructing queries.
 * Each method returns a NEW builder instance — the original is never mutated.
 *
 * Usage:
 * ```ts
 * const result = await builder
 *   .find(QueryTarget.Nodes)
 *   .where(equals('identity.type', 'Host'))
 *   .and(greaterThan('metadata.confidence', 0.8))
 *   .limit(50)
 *   .sortAsc('metadata.createdAt')
 *   .execute();
 * ```
 *
 * Immutability is enforced by Object.freeze() on each state snapshot.
 */

import type { NodeId, EdgeId, QueryId } from '../../types/index.ts';
import type { GraphNode, GraphEdge, GraphSubgraph, GraphStatistics } from '../../models/index.ts';
import type { NodeType, EdgeType } from '../../types/index.ts';
import type {
  QuerySpecification,
  QueryTarget,
  CompositeFilter,
  QueryPredicate,
  Projection,
  AggregationSpec,
  GroupBySpec,
  PaginationSpec,
  PaginationMode,
  SortSpec,
  SortDirection,
  QueryResult,
  SubgraphQueryResult,
  PathQueryResult,
  ExplainResult,
  AggregationResult,
  GroupByResult,
  QueryStatistics,
  QueryEngineConfig,
} from '../types/index.ts';
import {
  QueryTarget as QT,
  PaginationMode as PM,
  SortDirection as SD,
  EMPTY_PROJECTION,
  DEFAULT_PAGINATION,
  DEFAULT_QUERY_ENGINE_CONFIG,
} from '../types/index.ts';
import { brandQueryId } from '../../types/index.ts';
import { and, or, notFilter, group } from '../filters/index.ts';
import { executeQuery, executeSubgraphQuery, executePathQuery } from '../engine/index.ts';
import { buildExplainPlan } from '../plan/index.ts';
import type { GraphQueryEngineImpl } from '../engine/index.ts';

// ─── Builder State ─────────────────────────────────────────────

/**
 * Internal mutable state for building queries.
 * Copied on each builder method call to achieve immutability.
 */
interface BuilderState {
  target: QueryTarget;
  filter: CompositeFilter | null;
  projection: Projection;
  aggregations: AggregationSpec[];
  groupBy: GroupBySpec | null;
  pagination: PaginationSpec;
  sort: SortSpec[];
  nodeTypes: NodeType[];
  edgeTypes: EdgeType[];
  pathSource: NodeId | null;
  pathTarget: NodeId | null;
  pathMaxDepth: number;
  subgraphStart: NodeId | null;
  subgraphMaxDepth: number;
  useCache: boolean;
  timeout: number;
}

function initialBuilderState(): BuilderState {
  return {
    target: QT.Nodes,
    filter: null,
    projection: EMPTY_PROJECTION,
    aggregations: [],
    groupBy: null,
    pagination: { ...DEFAULT_PAGINATION },
    sort: [],
    nodeTypes: [],
    edgeTypes: [],
    pathSource: null,
    pathTarget: null,
    pathMaxDepth: 10,
    subgraphStart: null,
    subgraphMaxDepth: 3,
    useCache: true,
    timeout: DEFAULT_QUERY_ENGINE_CONFIG.defaultTimeout,
  };
}

function cloneState(state: BuilderState): BuilderState {
  return {
    target: state.target,
    filter: state.filter,
    projection: { select: Object.freeze([...state.projection.select]), exclude: Object.freeze([...state.projection.exclude]) },
    aggregations: [...state.aggregations],
    groupBy: state.groupBy ? { fields: [...state.groupBy.fields], aggregations: [...state.groupBy.aggregations] } : null,
    pagination: { ...state.pagination },
    sort: [...state.sort],
    nodeTypes: [...state.nodeTypes],
    edgeTypes: [...state.edgeTypes],
    pathSource: state.pathSource,
    pathTarget: state.pathTarget,
    pathMaxDepth: state.pathMaxDepth,
    subgraphStart: state.subgraphStart,
    subgraphMaxDepth: state.subgraphMaxDepth,
    useCache: state.useCache,
    timeout: state.timeout,
  };
}

// ─── Fluent Query Builder ──────────────────────────────────────

/**
 * Immutable fluent query builder.
 *
 * Every method returns a NEW builder instance with the updated state.
 * The original builder is never modified.
 */
export class QueryBuilder {
  private readonly _state: BuilderState;
  private readonly _engine: GraphQueryEngineImpl;

  constructor(engine: GraphQueryEngineImpl, state?: BuilderState) {
    this._engine = engine;
    this._state = state ? Object.freeze(cloneState(state)) : Object.freeze(initialBuilderState());
  }

  // ─── Target Selection ───────────────────────────────────────

  /** Query nodes */
  findNodes(): QueryBuilder {
    return new QueryBuilder(this._engine, { ...cloneState(this._state), target: QT.Nodes });
  }

  /** Query edges */
  findEdges(): QueryBuilder {
    return new QueryBuilder(this._engine, { ...cloneState(this._state), target: QT.Edges });
  }

  /** Query a subgraph */
  findSubgraph(startNodeId: NodeId, maxDepth: number = 3): QueryBuilder {
    const state = cloneState(this._state);
    state.target = QT.Subgraph;
    state.subgraphStart = startNodeId;
    state.subgraphMaxDepth = maxDepth;
    return new QueryBuilder(this._engine, state);
  }

  /** Query a path between two nodes */
  findPath(sourceId: NodeId, targetId: NodeId, maxDepth: number = 10): QueryBuilder {
    const state = cloneState(this._state);
    state.target = QT.Path;
    state.pathSource = sourceId;
    state.pathTarget = targetId;
    state.pathMaxDepth = maxDepth;
    return new QueryBuilder(this._engine, state);
  }

  // ─── Filtering ──────────────────────────────────────────────

  /** Add a filter predicate (replaces existing filter) */
  where(predicate: QueryPredicate): QueryBuilder {
    const state = cloneState(this._state);
    state.filter = and(predicate);
    return new QueryBuilder(this._engine, state);
  }

  /** Add an AND predicate to the existing filter */
  and(predicate: QueryPredicate | CompositeFilter): QueryBuilder {
    const state = cloneState(this._state);
    if (!state.filter) {
      if ('operator' in predicate) {
        state.filter = and(predicate as QueryPredicate);
      } else {
        state.filter = predicate as CompositeFilter;
      }
    } else {
      state.filter = and(state.filter, 'operator' in predicate ? predicate as QueryPredicate : predicate as CompositeFilter);
    }
    return new QueryBuilder(this._engine, state);
  }

  /** Add an OR predicate to the existing filter */
  or(predicate: QueryPredicate | CompositeFilter): QueryBuilder {
    const state = cloneState(this._state);
    if (!state.filter) {
      if ('operator' in predicate) {
        state.filter = or(predicate as QueryPredicate);
      } else {
        state.filter = predicate as CompositeFilter;
      }
    } else {
      state.filter = or(state.filter, 'operator' in predicate ? predicate as QueryPredicate : predicate as CompositeFilter);
    }
    return new QueryBuilder(this._engine, state);
  }

  /** Add a NOT filter */
  not(predicate: QueryPredicate | CompositeFilter): QueryBuilder {
    const state = cloneState(this._state);
    const notF = 'operator' in predicate
      ? notFilter(predicate as QueryPredicate)
      : notFilter(predicate as CompositeFilter);
    if (!state.filter) {
      state.filter = notF;
    } else {
      state.filter = and(state.filter, notF);
    }
    return new QueryBuilder(this._engine, state);
  }

  /** Filter by node type */
  findByType(type: NodeType): QueryBuilder {
    const state = cloneState(this._state);
    state.nodeTypes = [...state.nodeTypes, type];
    return new QueryBuilder(this._engine, state);
  }

  /** Filter by edge type */
  findByEdgeType(type: EdgeType): QueryBuilder {
    const state = cloneState(this._state);
    state.edgeTypes = [...state.edgeTypes, type];
    return new QueryBuilder(this._engine, state);
  }

  // ─── Projection ─────────────────────────────────────────────

  /** Select specific fields to include */
  select(...fields: string[]): QueryBuilder {
    const state = cloneState(this._state);
    state.projection = { select: Object.freeze(fields), exclude: [] };
    return new QueryBuilder(this._engine, state);
  }

  /** Exclude specific fields from the result */
  exclude(...fields: string[]): QueryBuilder {
    const state = cloneState(this._state);
    state.projection = { select: [], exclude: Object.freeze(fields) };
    return new QueryBuilder(this._engine, state);
  }

  /** Project (alias for select) */
  project(...fields: string[]): QueryBuilder {
    return this.select(...fields);
  }

  // ─── Aggregation ────────────────────────────────────────────

  /** Count matching items */
  count(alias?: string): QueryBuilder {
    const state = cloneState(this._state);
    state.aggregations = [...state.aggregations, { op: 'count' as any, alias: alias ?? 'count' }];
    return new QueryBuilder(this._engine, state);
  }

  /** Sum a numeric field */
  sum(field: string, alias?: string): QueryBuilder {
    const state = cloneState(this._state);
    state.aggregations = [...state.aggregations, { op: 'sum' as any, field, alias: alias ?? `sum_${field}` }];
    return new QueryBuilder(this._engine, state);
  }

  /** Average a numeric field */
  avg(field: string, alias?: string): QueryBuilder {
    const state = cloneState(this._state);
    state.aggregations = [...state.aggregations, { op: 'avg' as any, field, alias: alias ?? `avg_${field}` }];
    return new QueryBuilder(this._engine, state);
  }

  /** Get minimum value of a field */
  min(field: string, alias?: string): QueryBuilder {
    const state = cloneState(this._state);
    state.aggregations = [...state.aggregations, { op: 'min' as any, field, alias: alias ?? `min_${field}` }];
    return new QueryBuilder(this._engine, state);
  }

  /** Get maximum value of a field */
  max(field: string, alias?: string): QueryBuilder {
    const state = cloneState(this._state);
    state.aggregations = [...state.aggregations, { op: 'max' as any, field, alias: alias ?? `max_${field}` }];
    return new QueryBuilder(this._engine, state);
  }

  /** Get distinct values of a field */
  distinct(field: string, alias?: string): QueryBuilder {
    const state = cloneState(this._state);
    state.aggregations = [...state.aggregations, { op: 'distinct' as any, field, alias: alias ?? `distinct_${field}` }];
    return new QueryBuilder(this._engine, state);
  }

  /** Group by fields with aggregations */
  groupBy(fields: string[], aggregations: AggregationSpec[]): QueryBuilder {
    const state = cloneState(this._state);
    state.groupBy = { fields: Object.freeze([...fields]), aggregations: Object.freeze([...aggregations]) };
    return new QueryBuilder(this._engine, state);
  }

  // ─── Pagination ─────────────────────────────────────────────

  /** Set limit */
  limit(n: number): QueryBuilder {
    const state = cloneState(this._state);
    state.pagination = { ...state.pagination, limit: n };
    return new QueryBuilder(this._engine, state);
  }

  /** Set offset */
  offset(n: number): QueryBuilder {
    const state = cloneState(this._state);
    state.pagination = { ...state.pagination, mode: PM.Offset, offset: n };
    return new QueryBuilder(this._engine, state);
  }

  /** Set cursor for cursor-based pagination */
  cursor(token: string): QueryBuilder {
    const state = cloneState(this._state);
    state.pagination = { ...state.pagination, mode: PM.Cursor, cursor: token };
    return new QueryBuilder(this._engine, state);
  }

  /** Set page number for page-based pagination */
  page(n: number): QueryBuilder {
    const state = cloneState(this._state);
    state.pagination = { ...state.pagination, mode: PM.Page, page: n };
    return new QueryBuilder(this._engine, state);
  }

  // ─── Sorting ────────────────────────────────────────────────

  /** Sort ascending by field */
  sortAsc(field: string): QueryBuilder {
    const state = cloneState(this._state);
    state.sort = [...state.sort, { field, direction: SD.Ascending }];
    return new QueryBuilder(this._engine, state);
  }

  /** Sort descending by field */
  sortDesc(field: string): QueryBuilder {
    const state = cloneState(this._state);
    state.sort = [...state.sort, { field, direction: SD.Descending }];
    return new QueryBuilder(this._engine, state);
  }

  /** Multi-sort with explicit specs */
  multiSort(specs: readonly SortSpec[]): QueryBuilder {
    const state = cloneState(this._state);
    state.sort = [...state.sort, ...specs];
    return new QueryBuilder(this._engine, state);
  }

  // ─── Cache Control ──────────────────────────────────────────

  /** Disable caching for this query */
  noCache(): QueryBuilder {
    const state = cloneState(this._state);
    state.useCache = false;
    return new QueryBuilder(this._engine, state);
  }

  /** Set timeout */
  timeout(ms: number): QueryBuilder {
    const state = cloneState(this._state);
    state.timeout = ms;
    return new QueryBuilder(this._engine, state);
  }

  // ─── Execution ──────────────────────────────────────────────

  /**
   * Build the query specification from the current builder state.
   */
  build(): QuerySpecification {
    const id = brandQueryId(`q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`);
    return Object.freeze({
      id,
      target: this._state.target,
      filter: this._state.filter,
      projection: Object.freeze({ ...this._state.projection }),
      aggregations: Object.freeze([...this._state.aggregations]),
      groupBy: this._state.groupBy ? Object.freeze({ ...this._state.groupBy }) : null,
      pagination: Object.freeze({ ...this._state.pagination }),
      sort: Object.freeze([...this._state.sort]),
      nodeTypes: Object.freeze([...this._state.nodeTypes]),
      edgeTypes: Object.freeze([...this._state.edgeTypes]),
      pathSource: this._state.pathSource,
      pathTarget: this._state.pathTarget,
      pathMaxDepth: this._state.pathMaxDepth,
      subgraphStart: this._state.subgraphStart,
      subgraphMaxDepth: this._state.subgraphMaxDepth,
      useCache: this._state.useCache,
      timeout: this._state.timeout,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Execute the query and return results.
   */
  async execute(): Promise<QueryResult<GraphNode | GraphEdge>> {
    const spec = this.build();
    return executeQuery(this._engine, spec);
  }

  /**
   * Execute as a subgraph query.
   */
  async executeSubgraph(): Promise<SubgraphQueryResult> {
    const spec = this.build();
    return executeSubgraphQuery(this._engine, spec);
  }

  /**
   * Execute as a path query.
   */
  async executePath(): Promise<PathQueryResult> {
    const spec = this.build();
    return executePathQuery(this._engine, spec);
  }

  /**
   * Get the execution plan without running the query.
   */
  explain(): ExplainResult {
    const spec = this.build();
    return buildExplainPlan(spec);
  }

  // ─── Accessors ──────────────────────────────────────────────

  /** Get the current query target */
  get target(): QueryTarget {
    return this._state.target;
  }

  /** Get the current filter */
  get filter(): CompositeFilter | null {
    return this._state.filter;
  }

  /** Get the current pagination */
  get pagination(): PaginationSpec {
    return this._state.pagination;
  }
}
