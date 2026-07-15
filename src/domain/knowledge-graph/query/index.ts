/**
 * Knowledge Graph Query Engine — Public API
 *
 * Single entry point for the Query Engine layer.
 * The engine provides comprehensive query capabilities
 * built on top of the GraphRepository and GraphTraversalEngine interfaces.
 *
 * Usage:
 * ```ts
 * import { GraphQueryEngineImpl } from './query/index.ts';
 * import { InMemoryGraphRepository } from './runtime/index.ts';
 * import { GraphTraversalEngineImpl } from './traversal/index.ts';
 *
 * const repo = new InMemoryGraphRepository();
 * const traversal = new GraphTraversalEngineImpl(repo);
 * const engine = new GraphQueryEngineImpl(repo, traversal);
 *
 * // Fluent API
 * const result = await engine.query()
 *   .findNodes()
 *   .where(equals('identity.type', 'Host'))
 *   .limit(10)
 *   .execute();
 *
 * // Direct API
 * const nodes = await engine.findByType(NodeType.Host);
 * const path = await engine.shortestPath(sourceId, targetId);
 * ```
 *
 * Architecture:
 * - Predicates: Serializable filter predicates (equals, contains, regex, etc.)
 * - Filters: Composite filter trees (AND, OR, NOT, GROUP)
 * - Builder: Immutable fluent query builder
 * - Optimizer: Query plan optimization (pushdown, index selection)
 * - Plan: Execution plan construction and explain
 * - Statistics: Execution metrics and query result caching
 * - Events: Query lifecycle events for observability
 * - Engine: Main orchestrator with direct and fluent APIs
 */

// ─── Types ────────────────────────────────────────────────────

export type {
  QueryPredicate,
  CompositeFilter,
  Projection,
  AggregationSpec,
  AggregationResult,
  GroupBySpec,
  GroupByResult,
  PaginationSpec,
  SortSpec,
  QuerySpecification,
  QueryPlan,
  QueryPlanStage,
  QueryStatistics,
  QueryResult,
  ExplainResult,
  SubgraphQueryResult,
  PathQueryResult,
  QueryEngineConfig,
  QueryCacheEntry,
} from './types/index.ts';

export {
  PredicateOperator,
  FilterComposition,
  AggregationOp,
  PaginationMode,
  SortDirection,
  QueryTarget,
  EMPTY_PROJECTION,
  DEFAULT_PAGINATION,
  DEFAULT_QUERY_ENGINE_CONFIG,
  emptyQueryStatistics,
} from './types/index.ts';

// ─── Predicates ───────────────────────────────────────────────

export {
  evaluateNodePredicate,
  evaluateEdgePredicate,
  equals,
  notEquals,
  contains,
  startsWith,
  endsWith,
  regex,
  exists,
  inList,
  greaterThan,
  lessThan,
  gte,
  lte,
  negate,
} from './predicates/index.ts';

// ─── Filters ──────────────────────────────────────────────────

export {
  evaluateNodeFilter,
  evaluateEdgeFilter,
  and,
  or,
  notFilter,
  group,
  countPredicates,
  flattenPredicates,
} from './filters/index.ts';

// ─── Builder ──────────────────────────────────────────────────

export {
  QueryBuilder,
} from './builder/index.ts';

// ─── Optimizer ────────────────────────────────────────────────

export {
  QueryOptimizer,
  queryOptimizer,
} from './optimizer/index.ts';

export type {
  OptimizationResult,
} from './optimizer/index.ts';

// ─── Plan ─────────────────────────────────────────────────────

export {
  buildExplainPlan,
  buildQuickPlan,
} from './plan/index.ts';

// ─── Statistics ───────────────────────────────────────────────

export {
  QueryStatisticsCollector,
  QueryCache,
} from './statistics/index.ts';

// ─── Events ───────────────────────────────────────────────────

export type {
  QueryEvent,
  QueryStartedEvent,
  QueryCompletedEvent,
  QueryCancelledEvent,
  QueryCachedEvent,
  AnyQueryEvent,
} from './events/index.ts';

export {
  createQueryStartedEvent,
  createQueryCompletedEvent,
  createQueryCancelledEvent,
  createQueryCachedEvent,
} from './events/index.ts';

// ─── Engine ───────────────────────────────────────────────────

export {
  GraphQueryEngineImpl,
} from './engine/index.ts';
