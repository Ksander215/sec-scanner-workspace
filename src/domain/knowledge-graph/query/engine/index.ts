/**
 * Knowledge Graph Query Engine — Main Engine
 *
 * The GraphQueryEngineImpl is the central orchestrator for all query operations.
 * It implements the domain GraphQueryEngine contract and provides a rich API
 * for querying nodes, edges, paths, subgraphs, aggregations, and more.
 *
 * Architecture:
 * - Uses only public GraphRepository and GraphTraversalEngine APIs
 * - Delegates filtering to predicates/ and filters/ modules
 * - Delegates optimization to optimizer/ module
 * - Delegates statistics to statistics/ module
 * - Publishes events via EventPublisher (optional)
 * - Supports query caching with TTL
 *
 * Performance:
 * - Predicate pushdown reduces scan volume
 * - Type-based index shortcuts for common queries
 * - Short-circuit evaluation in composite filters
 * - Cached execution for repeated queries
 */

import type { NodeId, EdgeId, QueryId } from '../../types/index.ts';
import type { GraphNode, GraphEdge, GraphSubgraph, GraphStatistics, GraphQuery } from '../../models/index.ts';
import type { GraphRepository } from '../../contracts/index.ts';
import type { EventPublisher } from '../../adapters/index.ts';
import type { GraphTraversalEngineImpl } from '../../traversal/engine/index.ts';
import type {
  QuerySpecification,
  QueryTarget,
  QueryResult,
  QueryStatistics,
  QueryPlan,
  AggregationSpec,
  AggregationOp,
  AggregationResult,
  GroupBySpec,
  GroupByResult,
  SubgraphQueryResult,
  PathQueryResult,
  ExplainResult,
  Projection,
  SortSpec,
  PaginationSpec,
  QueryEngineConfig,
} from '../types/index.ts';
import {
  QueryTarget as QT,
  SortDirection as SD,
  DEFAULT_QUERY_ENGINE_CONFIG,
  EMPTY_PROJECTION,
  DEFAULT_PAGINATION,
  emptyQueryStatistics,
  PredicateOperator,
  AggregationOp as AggOp,
} from '../types/index.ts';
import { NodeType, EdgeType, brandNodeId, brandEdgeId, brandQueryId } from '../../types/index.ts';
import { createGraphNode, createGraphEdge, createRelationship, createGraphSubgraph } from '../../models/index.ts';
import { evaluateNodeFilter, evaluateEdgeFilter, countPredicates } from '../filters/index.ts';
import { evaluateNodePredicate, evaluateEdgePredicate } from '../predicates/index.ts';
import { queryOptimizer } from '../optimizer/index.ts';
import { QueryStatisticsCollector, QueryCache } from '../statistics/index.ts';
import { QueryBuilder } from '../builder/index.ts';
import {
  createQueryStartedEvent,
  createQueryCompletedEvent,
  createQueryCancelledEvent,
  createQueryCachedEvent,
} from '../events/index.ts';
import type { AnyQueryEvent } from '../events/index.ts';
import { buildExplainPlan, buildQuickPlan } from '../plan/index.ts';

// ─── Engine Configuration ──────────────────────────────────────

const DEFAULT_CONFIG: Required<QueryEngineConfig> = { ...DEFAULT_QUERY_ENGINE_CONFIG };

// ─── GraphQueryEngineImpl ──────────────────────────────────────

/**
 * Main implementation of the Knowledge Graph Query Engine.
 *
 * Provides a comprehensive query API that works exclusively through
 * the public GraphRepository and GraphTraversalEngine interfaces.
 */
export class GraphQueryEngineImpl {
  private readonly _repo: GraphRepository;
  private readonly _traversal: GraphTraversalEngineImpl;
  private readonly _publisher: EventPublisher | null;
  private readonly _config: Required<QueryEngineConfig>;
  private readonly _cache: QueryCache;
  private readonly _statsCollector: QueryStatisticsCollector;

  constructor(
    repo: GraphRepository,
    traversal: GraphTraversalEngineImpl,
    publisher?: EventPublisher,
    config?: QueryEngineConfig,
  ) {
    this._repo = repo;
    this._traversal = traversal;
    this._publisher = publisher ?? null;
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._cache = new QueryCache(this._config);
    this._statsCollector = new QueryStatisticsCollector();
  }

  // ─── GraphQueryEngine Contract Methods ──────────────────────

  /**
   * Execute a query and return matching nodes.
   * Implements the domain GraphQueryEngine contract.
   */
  async queryNodes(query: GraphQuery): Promise<readonly GraphNode[]> {
    const spec = this.domainQueryToSpec(query, QT.Nodes);
    const result = await this.executeQueryInternal<GraphNode>(spec);
    return result.rows;
  }

  /**
   * Execute a query and return matching edges.
   * Implements the domain GraphQueryEngine contract.
   */
  async queryEdges(query: GraphQuery): Promise<readonly GraphEdge[]> {
    const spec = this.domainQueryToSpec(query, QT.Edges);
    const result = await this.executeQueryInternal<GraphEdge>(spec);
    return result.rows;
  }

  /**
   * Execute a query and return a subgraph.
   * Implements the domain GraphQueryEngine contract.
   */
  async querySubgraph(query: GraphQuery): Promise<GraphSubgraph> {
    const nodes = await this.queryNodes(query);
    const nodeIds = new Set(nodes.map(n => n.identity.id));
    const allEdges = await this._repo.getAllEdges();
    const edges = allEdges.filter(e => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId));
    return createGraphSubgraph(
      `sg_${Date.now().toString(36)}`,
      nodes,
      edges,
      { description: `Subgraph from query ${query.id}` },
    );
  }

  /**
   * Get aggregate statistics about the graph.
   * Implements the domain GraphQueryEngine contract.
   */
  async getStatistics(): Promise<GraphStatistics> {
    const nodeCount = await this._repo.nodeCount();
    const edgeCount = await this._repo.edgeCount();
    const allNodes = await this._repo.getAllNodes();
    const allEdges = await this._repo.getAllEdges();

    const nodeTypeDistribution: Record<string, number> = {};
    for (const node of allNodes) {
      const type = node.identity.type;
      nodeTypeDistribution[type] = (nodeTypeDistribution[type] ?? 0) + 1;
    }

    const edgeTypeDistribution: Record<string, number> = {};
    for (const edge of allEdges) {
      const type = edge.relationship.edgeType;
      edgeTypeDistribution[type] = (edgeTypeDistribution[type] ?? 0) + 1;
    }

    // Compute degree stats
    const degreeMap: Record<string, number> = {};
    for (const edge of allEdges) {
      degreeMap[edge.sourceId as string] = (degreeMap[edge.sourceId as string] ?? 0) + 1;
      degreeMap[edge.targetId as string] = (degreeMap[edge.targetId as string] ?? 0) + 1;
    }
    const degrees = Object.values(degreeMap);
    const avgDegree = degrees.length > 0 ? degrees.reduce((a, b) => a + b, 0) / degrees.length : 0;
    const maxDegree = degrees.length > 0 ? Math.max(...degrees) : 0;

    return Object.freeze({
      nodeCount,
      edgeCount,
      nodeTypeDistribution: Object.freeze(nodeTypeDistribution),
      edgeTypeDistribution: Object.freeze(edgeTypeDistribution),
      avgDegree: Math.round(avgDegree * 100) / 100,
      maxDegree,
      computedAt: new Date().toISOString(),
    });
  }

  // ─── Node Search API ────────────────────────────────────────

  /** Find nodes matching a filter */
  async findNodes(spec: QuerySpecification): Promise<QueryResult<GraphNode>> {
    return this.executeQueryInternal<GraphNode>(spec);
  }

  /** Find a single node by ID */
  async findNode(id: NodeId): Promise<GraphNode | undefined> {
    return this._repo.getNode(id);
  }

  /** Find a node by ID (alias) */
  async findById(id: NodeId): Promise<GraphNode | undefined> {
    return this._repo.getNode(id);
  }

  /** Find all nodes of a given type */
  async findByType(type: NodeType): Promise<readonly GraphNode[]> {
    const allNodes = await this._repo.getAllNodes();
    return allNodes.filter(n => n.identity.type === type);
  }

  /** Find nodes by label */
  async findByLabel(label: string): Promise<readonly GraphNode[]> {
    const allNodes = await this._repo.getAllNodes();
    return allNodes.filter(n => n.identity.labels.includes(label));
  }

  /** Find nodes by tag */
  async findByTag(tag: string): Promise<readonly GraphNode[]> {
    const allNodes = await this._repo.getAllNodes();
    return allNodes.filter(n => n.metadata.tags.includes(tag));
  }

  /** Find nodes matching metadata field */
  async findByMetadata(field: string, value: string | number | boolean): Promise<readonly GraphNode[]> {
    const allNodes = await this._repo.getAllNodes();
    const obj = { [field]: value };
    return allNodes.filter(n => {
      const meta = n.metadata as unknown as Record<string, unknown>;
      return meta[field] === value;
    });
  }

  // ─── Edge Search API ────────────────────────────────────────

  /** Find edges matching a filter */
  async findEdges(spec: QuerySpecification): Promise<QueryResult<GraphEdge>> {
    return this.executeQueryInternal<GraphEdge>(spec);
  }

  /** Find a single edge by ID */
  async findEdge(id: EdgeId): Promise<GraphEdge | undefined> {
    return this._repo.getEdge(id);
  }

  /** Find edges by relationship type */
  async findByRelationship(edgeType: EdgeType): Promise<readonly GraphEdge[]> {
    const allEdges = await this._repo.getAllEdges();
    return allEdges.filter(e => e.relationship.edgeType === edgeType);
  }

  /** Find incoming edges to a node */
  async findIncoming(nodeId: NodeId): Promise<readonly GraphEdge[]> {
    return this._repo.getEdgesTo(nodeId);
  }

  /** Find outgoing edges from a node */
  async findOutgoing(nodeId: NodeId): Promise<readonly GraphEdge[]> {
    return this._repo.getEdgesFrom(nodeId);
  }

  /** Find edges between two nodes */
  async findBetween(sourceId: NodeId, targetId: NodeId): Promise<readonly GraphEdge[]> {
    const fromSource = await this._repo.getEdgesFrom(sourceId);
    return fromSource.filter(e => e.targetId === targetId);
  }

  // ─── Path Queries ───────────────────────────────────────────

  /** Find a path between two nodes */
  async path(sourceId: NodeId, targetId: NodeId, maxDepth?: number): Promise<PathQueryResult> {
    const start = performance.now();
    const stats = new QueryStatisticsCollector();
    stats.start();

    const pathResult = await this._traversal.shortestPath(sourceId, targetId, { maxDepth: maxDepth ?? 10 });
    stats.recordNodeScan(pathResult.found && pathResult.path ? pathResult.path.nodes.length : 0);

    const queryId = brandQueryId(`path_${Date.now().toString(36)}`);
    return Object.freeze({
      queryId,
      found: pathResult.found,
      path: pathResult.path?.nodes ?? [],
      alternatives: pathResult.alternatives.map(a => a.nodes),
      statistics: stats.toSnapshot(),
      duration: performance.now() - start,
    });
  }

  /** Find multiple paths between two nodes */
  async paths(sourceId: NodeId, targetId: NodeId, maxPaths: number = 5): Promise<PathQueryResult> {
    const start = performance.now();
    const stats = new QueryStatisticsCollector();
    stats.start();

    const pathResult = await this._traversal.findPaths(sourceId, targetId, { maxPaths });
    stats.recordNodeScan(pathResult.totalPaths);

    const queryId = brandQueryId(`paths_${Date.now().toString(36)}`);
    return Object.freeze({
      queryId,
      found: pathResult.found,
      path: pathResult.path?.nodes ?? [],
      alternatives: pathResult.alternatives.map(a => a.nodes),
      statistics: stats.toSnapshot(),
      duration: performance.now() - start,
    });
  }

  /** Find shortest path */
  async shortestPath(sourceId: NodeId, targetId: NodeId, maxDepth?: number): Promise<PathQueryResult> {
    return this.path(sourceId, targetId, maxDepth);
  }

  /** Check if a node is reachable from another */
  async reachable(sourceId: NodeId, targetId: NodeId): Promise<boolean> {
    return this._traversal.pathExists(sourceId, targetId);
  }

  /** Get neighbor nodes */
  async neighbors(nodeId: NodeId, depth: number = 1): Promise<readonly GraphNode[]> {
    return this._traversal.getNeighbors(nodeId, { depth });
  }

  // ─── Subgraph Queries ──────────────────────────────────────

  /** Extract a subgraph from a start node */
  async subgraph(startNodeId: NodeId, maxDepth: number = 3): Promise<SubgraphQueryResult> {
    const start = performance.now();
    const stats = new QueryStatisticsCollector();
    stats.start();

    const sg = await this._traversal.extractSubgraph(startNodeId, { maxDepth });
    stats.recordNodeScan(sg.nodes.length);
    stats.recordEdgeScan(sg.edges.length);

    const queryId = brandQueryId(`sub_${Date.now().toString(36)}`);
    return Object.freeze({
      queryId,
      subgraph: sg,
      statistics: stats.toSnapshot(),
      duration: performance.now() - start,
    });
  }

  /** Expand a subgraph by additional depth */
  async expand(sg: GraphSubgraph, additionalDepth: number = 1): Promise<SubgraphQueryResult> {
    const start = performance.now();
    const stats = new QueryStatisticsCollector();
    stats.start();

    const allNewNodes = new Map<string, GraphNode>();
    const allNewEdges = new Map<string, GraphEdge>();

    // Add existing nodes/edges
    for (const n of sg.nodes) allNewNodes.set(n.identity.id as string, n);
    for (const e of sg.edges) allNewEdges.set(e.id as string, e);

    // Identify boundary nodes: nodes that have at least one edge going outside the subgraph
    // (i.e., nodes connected to edges where the other endpoint is NOT in the subgraph)
    const sgNodeIds = new Set(sg.nodes.map(n => n.identity.id as string));
    const boundaryNodeIds = new Set<string>();
    for (const node of sg.nodes) {
      const outEdges = await this._repo.getEdgesFrom(node.identity.id);
      for (const e of outEdges) {
        if (!sgNodeIds.has(e.targetId as string)) {
          boundaryNodeIds.add(node.identity.id as string);
          break;
        }
      }
      if (!boundaryNodeIds.has(node.identity.id as string)) {
        const inEdges = await this._repo.getEdgesTo(node.identity.id);
        for (const e of inEdges) {
          if (!sgNodeIds.has(e.sourceId as string)) {
            boundaryNodeIds.add(node.identity.id as string);
            break;
          }
        }
      }
    }

    // Only expand from boundary nodes (much fewer than all nodes)
    for (const nodeId of boundaryNodeIds) {
      const expanded = await this._traversal.extractSubgraph(
        brandNodeId(nodeId),
        { maxDepth: additionalDepth },
      );
      for (const n of expanded.nodes) {
        if (!allNewNodes.has(n.identity.id as string)) {
          allNewNodes.set(n.identity.id as string, n);
        }
      }
      for (const e of expanded.edges) {
        if (!allNewEdges.has(e.id as string)) {
          allNewEdges.set(e.id as string, e);
        }
      }
    }

    const nodes = [...allNewNodes.values()];
    const edges = [...allNewEdges.values()];

    // Filter edges to only those whose endpoints are in the node set
    const nodeIds = new Set(nodes.map(n => n.identity.id));
    const validEdges = edges.filter(e => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId));

    stats.recordNodeScan(nodes.length);
    stats.recordEdgeScan(validEdges.length);

    const result = createGraphSubgraph(
      `exp_${Date.now().toString(36)}`,
      nodes,
      validEdges,
      { description: `Expanded subgraph from ${sg.id} (${boundaryNodeIds.size} boundary nodes)` },
    );

    const queryId = brandQueryId(`exp_${Date.now().toString(36)}`);
    return Object.freeze({
      queryId,
      subgraph: result,
      statistics: stats.toSnapshot(),
      duration: performance.now() - start,
    });
  }

  /** Collapse a subgraph by removing leaf nodes */
  async collapse(sg: GraphSubgraph, minDegree: number = 2): Promise<SubgraphQueryResult> {
    // Compute degree for each node
    const degreeMap: Record<string, number> = {};
    for (const node of sg.nodes) {
      const id = node.identity.id as string;
      degreeMap[id] = 0;
    }
    for (const edge of sg.edges) {
      degreeMap[edge.sourceId as string] = (degreeMap[edge.sourceId as string] ?? 0) + 1;
      degreeMap[edge.targetId as string] = (degreeMap[edge.targetId as string] ?? 0) + 1;
    }

    // Keep nodes with degree >= minDegree
    const keptNodeIds = new Set(
      Object.entries(degreeMap)
        .filter(([_, deg]) => deg >= minDegree)
        .map(([id]) => id),
    );

    const nodes = sg.nodes.filter(n => keptNodeIds.has(n.identity.id as string));
    const edges = sg.edges.filter(e => keptNodeIds.has(e.sourceId as string) && keptNodeIds.has(e.targetId as string));

    const result = createGraphSubgraph(
      `col_${Date.now().toString(36)}`,
      nodes,
      edges,
      { description: `Collapsed subgraph from ${sg.id}` },
    );

    const queryId = brandQueryId(`col_${Date.now().toString(36)}`);
    return Object.freeze({
      queryId,
      subgraph: result,
      statistics: new QueryStatisticsCollector().toSnapshot(),
      duration: 0,
    });
  }

  // ─── Query Builder ─────────────────────────────────────────

  /** Create a new fluent query builder */
  query(): QueryBuilder {
    return new QueryBuilder(this);
  }

  // ─── Explain ───────────────────────────────────────────────

  /** Explain a query without executing it */
  explain(spec: QuerySpecification): ExplainResult {
    return buildExplainPlan(spec);
  }

  // ─── Cache Management ──────────────────────────────────────

  /** Invalidate the entire query cache */
  invalidateCache(): void {
    this._cache.clear();
  }

  /** Get cache statistics */
  getCacheStats(): { size: number; maxEntries: number; hitRate: number } {
    return this._cache.getStats();
  }

  // ─── Accessors ─────────────────────────────────────────────

  /** Get the underlying repository */
  get repository(): GraphRepository {
    return this._repo;
  }

  /** Get the traversal engine */
  get traversalEngine(): GraphTraversalEngineImpl {
    return this._traversal;
  }

  /** Get the engine configuration */
  get config(): Readonly<Required<QueryEngineConfig>> {
    return this._config;
  }

  // ─── Internal Execution ────────────────────────────────────

  /**
   * Execute a query specification and return results.
   * This is the main execution pipeline.
   */
  private async executeQueryInternal<T extends GraphNode | GraphEdge>(
    spec: QuerySpecification,
  ): Promise<QueryResult<T>> {
    const stats = new QueryStatisticsCollector();
    stats.start();

    // Publish started event
    await this.publishEvent(
      createQueryStartedEvent(spec.id as string, spec.target, {
        filterCount: spec.filter ? countPredicates(spec.filter) : 0,
        hasAggregations: spec.aggregations.length > 0,
      }),
    );

    try {
      // Check cache
      if (spec.useCache && this._config.enableCache) {
        const cacheKey = QueryCache.makeKey(spec);
        const cached = this._cache.get<T>(cacheKey);
        if (cached) {
          stats.recordCacheHit();
          await this.publishEvent(
            createQueryCachedEvent(spec.id as string, spec.target, {
              cacheHitCount: 1,
              age: Date.now() - (cached as any)._createdAt ?? 0,
            }),
          );
          return cached;
        }
        stats.recordCacheMiss();
      }

      // Get data from repository
      let items: (GraphNode | GraphEdge)[];
      if (spec.target === QT.Nodes) {
        items = [...(await this._repo.getAllNodes())];
        stats.recordNodeScan(items.length);
      } else {
        items = [...(await this._repo.getAllEdges())];
        stats.recordEdgeScan(items.length);
      }

      // Apply type shortcuts
      if (spec.target === QT.Nodes && spec.nodeTypes.length > 0) {
        const typeSet = new Set(spec.nodeTypes);
        items = items.filter((item): item is GraphNode =>
          typeSet.has((item as GraphNode).identity.type),
        );
      }
      if (spec.target === QT.Edges && spec.edgeTypes.length > 0) {
        const typeSet = new Set(spec.edgeTypes);
        items = items.filter((item): item is GraphEdge =>
          typeSet.has((item as GraphEdge).relationship.edgeType),
        );
      }

      // Apply filter
      if (spec.filter) {
        if (spec.target === QT.Nodes) {
          items = items.filter((item): item is GraphNode => {
            stats.recordPredicateEvaluated();
            return evaluateNodeFilter(spec.filter, item as GraphNode);
          });
        } else {
          items = items.filter((item): item is GraphEdge => {
            stats.recordPredicateEvaluated();
            return evaluateEdgeFilter(spec.filter, item as GraphEdge);
          });
        }
      }

      // Apply sort
      if (spec.sort.length > 0) {
        items = this.applySort(items, spec.sort);
      }

      // Total count before pagination
      const totalCount = items.length;

      // Apply projection
      // (Projection is applied during result construction, not to raw items)

      // Compute aggregations
      let aggregations: AggregationResult[] = [];
      if (spec.aggregations.length > 0) {
        aggregations = this.computeAggregations(items, spec.aggregations);
      }

      // Compute group-by
      let groups: GroupByResult[] = [];
      if (spec.groupBy) {
        groups = this.computeGroupBy(items, spec.groupBy);
      }

      // Apply pagination
      const paginated = this.applyPagination(items, spec.pagination);
      stats.recordReturnedRows(paginated.length);

      const hasMore = totalCount > spec.pagination.offset + paginated.length;
      const nextCursor = hasMore
        ? Buffer.from(`${spec.pagination.offset + paginated.length}`).toString('base64')
        : null;

      // Build result
      const result: QueryResult<T> = Object.freeze({
        queryId: spec.id,
        rows: Object.freeze(paginated as T[]),
        totalCount,
        hasMore,
        nextCursor,
        statistics: stats.toSnapshot(),
        plan: buildQuickPlan(spec),
        aggregations: Object.freeze(aggregations),
        groups: Object.freeze(groups),
        duration: stats.toSnapshot().executionTime,
      });

      // Cache result
      if (spec.useCache && this._config.enableCache) {
        const cacheKey = QueryCache.makeKey(spec);
        this._cache.set(cacheKey, result);
      }

      // Publish completed event
      await this.publishEvent(
        createQueryCompletedEvent(spec.id as string, spec.target, {
          returnedRows: paginated.length,
          duration: result.statistics.executionTime,
        }),
      );

      return result;
    } catch (error) {
      await this.publishEvent(
        createQueryCancelledEvent(spec.id as string, spec.target, {
          reason: error instanceof Error ? error.message : 'Unknown error',
          duration: stats.toSnapshot().executionTime,
        }),
      );
      throw error;
    }
  }

  // ─── Sort ──────────────────────────────────────────────────

  private applySort(items: (GraphNode | GraphEdge)[], sorts: readonly SortSpec[]): (GraphNode | GraphEdge)[] {
    return [...items].sort((a, b) => {
      for (const sort of sorts) {
        const aVal = this.getFieldValue(a, sort.field);
        const bVal = this.getFieldValue(b, sort.field);
        const cmp = this.compareValues(aVal, bVal);
        if (cmp !== 0) {
          return sort.direction === SD.Ascending ? cmp : -cmp;
        }
      }
      return 0;
    });
  }

  private getFieldValue(item: GraphNode | GraphEdge, field: string): unknown {
    const isNode = 'identity' in item;
    if (isNode) {
      const node = item as GraphNode;
      if (field === 'type' || field === 'identity.type') return node.identity.type;
      if (field === 'id' || field === 'identity.id') return node.identity.id;
      if (field === 'confidence' || field === 'metadata.confidence') return node.metadata.confidence;
      if (field === 'createdAt' || field === 'metadata.createdAt') return node.metadata.createdAt;
      if (field === 'updatedAt' || field === 'metadata.updatedAt') return node.metadata.updatedAt;
      // Properties
      if (field.startsWith('properties.')) {
        const propKey = field.slice('properties.'.length);
        return node.properties[propKey];
      }
      return undefined;
    } else {
      const edge = item as GraphEdge;
      if (field === 'id') return edge.id;
      if (field === 'sourceId') return edge.sourceId;
      if (field === 'targetId') return edge.targetId;
      if (field === 'edgeType' || field === 'relationship.edgeType') return edge.relationship.edgeType;
      if (field === 'strength' || field === 'relationship.strength') return edge.relationship.strength;
      if (field === 'createdAt') return edge.createdAt;
      if (field.startsWith('properties.')) {
        const propKey = field.slice('properties.'.length);
        return edge.properties[propKey];
      }
      return undefined;
    }
  }

  private compareValues(a: unknown, b: unknown): number {
    if (a === b) return 0;
    if (a === null || a === undefined) return -1;
    if (b === null || b === undefined) return 1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b));
  }

  // ─── Pagination ────────────────────────────────────────────

  private applyPagination<T>(
    items: T[],
    pagination: PaginationSpec,
  ): T[] {
    switch (pagination.mode) {
      case 'offset':
        return items.slice(pagination.offset, pagination.offset + pagination.limit);
      case 'cursor': {
        const offset = pagination.cursor
          ? Math.max(0, parseInt(Buffer.from(pagination.cursor, 'base64').toString(), 10) || 0)
          : 0;
        return items.slice(offset, offset + pagination.limit);
      }
      case 'page': {
        const offset = (pagination.page - 1) * pagination.limit;
        return items.slice(offset, offset + pagination.limit);
      }
      default:
        return items.slice(pagination.offset, pagination.offset + pagination.limit);
    }
  }

  // ─── Aggregation ──────────────────────────────────────────

  private computeAggregations(
    items: (GraphNode | GraphEdge)[],
    specs: readonly AggregationSpec[],
  ): AggregationResult[] {
    return specs.map(spec => {
      const values = items
        .map(item => this.getFieldValue(item, spec.field ?? ''))
        .filter((v): v is number => typeof v === 'number');

      switch (spec.op) {
        case AggOp.Count:
          return Object.freeze({
            name: spec.alias ?? 'count',
            op: AggOp.Count,
            value: items.length,
          });
        case AggOp.Sum:
          return Object.freeze({
            name: spec.alias ?? `sum_${spec.field}`,
            op: AggOp.Sum,
            value: values.reduce((a, b) => a + b, 0),
          });
        case AggOp.Avg:
          return Object.freeze({
            name: spec.alias ?? `avg_${spec.field}`,
            op: AggOp.Avg,
            value: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
          });
        case AggOp.Min:
          return Object.freeze({
            name: spec.alias ?? `min_${spec.field}`,
            op: AggOp.Min,
            value: values.length > 0 ? Math.min(...values) : 0,
          });
        case AggOp.Max:
          return Object.freeze({
            name: spec.alias ?? `max_${spec.field}`,
            op: AggOp.Max,
            value: values.length > 0 ? Math.max(...values) : 0,
          });
        case AggOp.Distinct: {
          const distinctValues = new Set(
            items.map(item => String(this.getFieldValue(item, spec.field ?? 'id') ?? '')),
          );
          return Object.freeze({
            name: spec.alias ?? `distinct_${spec.field}`,
            op: AggOp.Distinct,
            value: [...distinctValues],
          });
        }
        default:
          return Object.freeze({
            name: spec.alias ?? 'unknown',
            op: spec.op,
            value: 0,
          });
      }
    });
  }

  // ─── Group By ──────────────────────────────────────────────

  private computeGroupBy(
    items: (GraphNode | GraphEdge)[],
    groupBy: GroupBySpec,
  ): GroupByResult[] {
    const groups = new Map<string, { key: Record<string, string | number>; items: (GraphNode | GraphEdge)[] }>();

    for (const item of items) {
      const key: Record<string, string | number> = {};
      for (const field of groupBy.fields) {
        const val = this.getFieldValue(item, field);
        if (typeof val === 'number') {
          key[field] = val;
        } else {
          key[field] = String(val ?? '');
        }
      }
      const keyStr = JSON.stringify(key);
      if (!groups.has(keyStr)) {
        groups.set(keyStr, { key, items: [] });
      }
      groups.get(keyStr)!.items.push(item);
    }

    return [...groups.entries()].map(([_, group]) => {
      const results = this.computeAggregations(group.items, groupBy.aggregations);
      return Object.freeze({
        key: Object.freeze(group.key),
        results: Object.freeze(results),
      });
    });
  }

  // ─── Domain Query Conversion ───────────────────────────────

  private domainQueryToSpec(query: GraphQuery, target: QueryTarget): QuerySpecification {
    const filters: QueryPredicate[] = query.filters.map(f => ({
      field: f.field,
      operator: f.operator as PredicateOperator,
      value: f.value,
      negated: false,
    }));

    return Object.freeze({
      id: query.id,
      target,
      filter: filters.length > 0 ? and(...filters) : null,
      projection: EMPTY_PROJECTION,
      aggregations: [],
      groupBy: null,
      pagination: { mode: 'offset' as any, limit: query.limit, offset: query.offset, cursor: null, page: 1 },
      sort: [],
      nodeTypes: [],
      edgeTypes: [],
      pathSource: null,
      pathTarget: null,
      pathMaxDepth: 10,
      subgraphStart: null,
      subgraphMaxDepth: 3,
      useCache: true,
      timeout: 30000,
      createdAt: query.createdAt,
    });
  }

  // ─── Event Publishing ──────────────────────────────────────

  private async publishEvent(event: AnyQueryEvent): Promise<void> {
    if (!this._publisher) return;
    try {
      await this._publisher.publish(event as any);
    } catch {
      // Event publishing failures should not affect query execution
    }
  }
}

// ─── Re-export for Builder ────────────────────────────────────

// Import the 'and' function from filters for domainQueryToSpec
import { and } from '../filters/index.ts';

// ─── Public Execution Functions (for Builder) ─────────────────

/**
 * Execute a query specification through the engine.
 * Used by QueryBuilder.execute().
 */
export async function executeQuery(
  engine: GraphQueryEngineImpl,
  spec: QuerySpecification,
): Promise<QueryResult<GraphNode | GraphEdge>> {
  if (spec.target === QT.Nodes) {
    return engine.findNodes(spec);
  } else if (spec.target === QT.Edges) {
    return engine.findEdges(spec);
  } else if (spec.target === QT.Subgraph && spec.subgraphStart) {
    const sgResult = await engine.subgraph(spec.subgraphStart, spec.subgraphMaxDepth);
    return Object.freeze({
      queryId: spec.id,
      rows: sgResult.subgraph.nodes as (GraphNode | GraphEdge)[],
      totalCount: sgResult.subgraph.nodes.length,
      hasMore: false,
      nextCursor: null,
      statistics: sgResult.statistics,
      plan: null,
      aggregations: [],
      groups: [],
      duration: sgResult.duration,
    });
  } else {
    // Default to nodes
    return engine.findNodes(spec);
  }
}

/**
 * Execute a subgraph query through the engine.
 */
export async function executeSubgraphQuery(
  engine: GraphQueryEngineImpl,
  spec: QuerySpecification,
): Promise<SubgraphQueryResult> {
  if (spec.subgraphStart) {
    return engine.subgraph(spec.subgraphStart, spec.subgraphMaxDepth);
  }
  throw new Error('Subgraph query requires a start node ID');
}

/**
 * Execute a path query through the engine.
 */
export async function executePathQuery(
  engine: GraphQueryEngineImpl,
  spec: QuerySpecification,
): Promise<PathQueryResult> {
  if (spec.pathSource && spec.pathTarget) {
    return engine.path(spec.pathSource, spec.pathTarget, spec.pathMaxDepth);
  }
  throw new Error('Path query requires both source and target node IDs');
}
