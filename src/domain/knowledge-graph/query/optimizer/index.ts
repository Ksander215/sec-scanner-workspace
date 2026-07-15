/**
 * Knowledge Graph Query Engine — Query Optimizer
 *
 * Optimizes query execution plans by:
 * 1. Predicate pushdown — moving filters closer to the data source
 * 2. Index selection — choosing optimal access paths
 * 3. Early termination — detecting when enough results are collected
 * 4. Cached execution — reusing previous query results when possible
 *
 * The optimizer transforms a QuerySpecification into an optimized
 * execution strategy without changing the query semantics.
 */

import type { QuerySpecification, QueryPlan, QueryPlanStage, CompositeFilter, QueryPredicate } from '../types/index.ts';
import { QueryTarget, FilterComposition, PredicateOperator } from '../types/index.ts';
import { countPredicates, flattenPredicates } from '../filters/index.ts';
import type { GraphRepository } from '../../contracts/index.ts';
import { brandQueryId } from '../../types/index.ts';

// ─── Optimization Result ───────────────────────────────────────

/**
 * Result of query optimization.
 * Contains the execution plan and optimization decisions.
 */
export interface OptimizationResult {
  /** Optimized execution plan */
  readonly plan: QueryPlan;
  /** Whether the result can be served from cache */
  readonly cacheable: boolean;
  /** Whether early termination is possible */
  readonly canEarlyTerminate: boolean;
  /** Recommended scan order (field names to scan first) */
  readonly recommendedScanOrder: readonly string[];
  /** Whether predicate pushdown was applied */
  readonly pushdownApplied: boolean;
}

// ─── Optimizer ─────────────────────────────────────────────────

/**
 * Query optimizer that analyzes specifications and produces
 * optimized execution plans.
 */
export class QueryOptimizer {
  /**
   * Optimize a query specification into an execution plan.
   */
  optimize(spec: QuerySpecification): OptimizationResult {
    const stages: QueryPlanStage[] = [];
    let totalCost = 0;
    const indexesUsed: string[] = [];
    const filtersApplied: string[] = [];
    let pushdownApplied = false;
    let canEarlyTerminate = false;

    // Stage 1: Source scan
    const scanStage = this.planScanStage(spec);
    stages.push(scanStage);
    totalCost += scanStage.estimatedCost;

    // Stage 2: Type filtering (index-based)
    if (spec.nodeTypes.length > 0 || spec.edgeTypes.length > 0) {
      const typeStage = this.planTypeFilterStage(spec);
      stages.push(typeStage);
      totalCost += typeStage.estimatedCost;
      if (spec.nodeTypes.length > 0) {
        indexesUsed.push('NodeTypeIndex');
      }
      if (spec.edgeTypes.length > 0) {
        indexesUsed.push('EdgeTypeIndex');
      }
      filtersApplied.push(`type: ${spec.nodeTypes.join(',') || spec.edgeTypes.join(',')}`);
    }

    // Stage 3: Predicate pushdown
    if (spec.filter) {
      const pushdown = this.applyPredicatePushdown(spec);
      pushdownApplied = pushdown.applied;
      if (pushdown.pushdownFilters.length > 0) {
        const filterStage: QueryPlanStage = {
          name: 'filter_pushdown',
          estimatedCost: pushdown.pushdownCost,
          estimatedRows: Math.max(1, Math.floor(scanStage.estimatedRows * pushdown.selectivity)),
          description: `Push down ${pushdown.pushdownFilters.length} filter(s) to scan stage`,
          indexUsed: null,
          canShortCircuit: pushdown.canShortCircuit,
        };
        stages.push(filterStage);
        totalCost += filterStage.estimatedCost;
        filtersApplied.push(...pushdown.pushdownFilters);
      }

      // Remaining filters
      if (pushdown.remainingPredicates > 0) {
        const remainStage: QueryPlanStage = {
          name: 'filter_remaining',
          estimatedCost: pushdown.remainingPredicates * 0.5,
          estimatedRows: Math.max(1, Math.floor(scanStage.estimatedRows * pushdown.selectivity * 0.5)),
          description: `Apply ${pushdown.remainingPredicates} remaining predicate(s)`,
          indexUsed: null,
          canShortCircuit: false,
        };
        stages.push(remainStage);
        totalCost += remainStage.estimatedCost;
      }
    }

    // Stage 4: Aggregation
    if (spec.aggregations.length > 0) {
      const aggStage: QueryPlanStage = {
        name: 'aggregate',
        estimatedCost: spec.aggregations.length * 2,
        estimatedRows: 1,
        description: `Compute ${spec.aggregations.length} aggregation(s)`,
        indexUsed: null,
        canShortCircuit: false,
      };
      stages.push(aggStage);
      totalCost += aggStage.estimatedCost;
    }

    // Stage 5: Group-by
    if (spec.groupBy) {
      const groupStage: QueryPlanStage = {
        name: 'group_by',
        estimatedCost: spec.groupBy.fields.length * 3,
        estimatedRows: Math.max(1, Math.floor(scanStage.estimatedRows * 0.1)),
        description: `Group by ${spec.groupBy.fields.join(', ')}`,
        indexUsed: null,
        canShortCircuit: false,
      };
      stages.push(groupStage);
      totalCost += groupStage.estimatedCost;
    }

    // Stage 6: Sort
    if (spec.sort.length > 0) {
      const sortStage: QueryPlanStage = {
        name: 'sort',
        estimatedCost: spec.sort.length * 1.5,
        estimatedRows: scanStage.estimatedRows,
        description: `Sort by ${spec.sort.map(s => `${s.field} ${s.direction}`).join(', ')}`,
        indexUsed: null,
        canShortCircuit: false,
      };
      stages.push(sortStage);
      totalCost += sortStage.estimatedCost;
    }

    // Stage 7: Pagination
    if (spec.pagination.limit < 10000 || spec.pagination.offset > 0) {
      const pageStage: QueryPlanStage = {
        name: 'paginate',
        estimatedCost: 0.5,
        estimatedRows: Math.min(spec.pagination.limit, scanStage.estimatedRows),
        description: `Limit ${spec.pagination.limit}, offset ${spec.pagination.offset}`,
        indexUsed: null,
        canShortCircuit: spec.pagination.limit > 0 && !spec.aggregations.length,
      };
      stages.push(pageStage);
      totalCost += pageStage.estimatedCost;
      canEarlyTerminate = pageStage.canShortCircuit;
    }

    // Stage 8: Projection
    if (spec.projection.select.length > 0 || spec.projection.exclude.length > 0) {
      const projStage: QueryPlanStage = {
        name: 'project',
        estimatedCost: 0.3,
        estimatedRows: stages[stages.length - 1]?.estimatedRows ?? 0,
        description: spec.projection.select.length > 0
          ? `Select fields: ${spec.projection.select.join(', ')}`
          : `Exclude fields: ${spec.projection.exclude.join(', ')}`,
        indexUsed: null,
        canShortCircuit: false,
      };
      stages.push(projStage);
      totalCost += projStage.estimatedCost;
    }

    // Determine complexity
    const estimatedComplexity = this.estimateComplexity(spec, totalCost);

    const plan: QueryPlan = Object.freeze({
      queryId: spec.id,
      stages: Object.freeze(stages),
      totalEstimatedCost: Math.round(totalCost * 100) / 100,
      indexesUsed: Object.freeze(indexesUsed),
      filtersApplied: Object.freeze(filtersApplied),
      estimatedComplexity,
      cacheable: this.isCacheable(spec),
    });

    return Object.freeze({
      plan,
      cacheable: plan.cacheable,
      canEarlyTerminate,
      recommendedScanOrder: Object.freeze(this.recommendScanOrder(spec)),
      pushdownApplied,
    });
  }

  // ─── Scan Planning ──────────────────────────────────────────

  private planScanStage(spec: QuerySpecification): QueryPlanStage {
    switch (spec.target) {
      case QueryTarget.Nodes:
        return {
          name: 'scan_nodes',
          estimatedCost: 10,
          estimatedRows: 1000,
          description: 'Full node scan',
          indexUsed: null,
          canShortCircuit: false,
        };
      case QueryTarget.Edges:
        return {
          name: 'scan_edges',
          estimatedCost: 15,
          estimatedRows: 2000,
          description: 'Full edge scan',
          indexUsed: null,
          canShortCircuit: false,
        };
      case QueryTarget.Subgraph:
        return {
          name: 'traverse_subgraph',
          estimatedCost: 20,
          estimatedRows: 500,
          description: `BFS from ${spec.subgraphStart} depth ${spec.subgraphMaxDepth}`,
          indexUsed: null,
          canShortCircuit: true,
        };
      case QueryTarget.Path:
        return {
          name: 'find_path',
          estimatedCost: 25,
          estimatedRows: 1,
          description: `Path from ${spec.pathSource} to ${spec.pathTarget}`,
          indexUsed: null,
          canShortCircuit: true,
        };
      default:
        return {
          name: 'scan_unknown',
          estimatedCost: 20,
          estimatedRows: 1000,
          description: 'Unknown target scan',
          indexUsed: null,
          canShortCircuit: false,
        };
    }
  }

  private planTypeFilterStage(spec: QuerySpecification): QueryPlanStage {
    const hasNodeTypes = spec.nodeTypes.length > 0;
    const hasEdgeTypes = spec.edgeTypes.length > 0;
    return {
      name: 'type_filter',
      estimatedCost: 2,
      estimatedRows: hasNodeTypes
        ? Math.max(1, Math.floor(1000 / spec.nodeTypes.length))
        : Math.max(1, Math.floor(2000 / spec.edgeTypes.length)),
      description: hasNodeTypes
        ? `Filter by node type(s): ${spec.nodeTypes.join(', ')}`
        : `Filter by edge type(s): ${spec.edgeTypes.join(', ')}`,
      indexUsed: hasNodeTypes ? 'NodeTypeIndex' : 'EdgeTypeIndex',
      canShortCircuit: false,
    };
  }

  // ─── Predicate Pushdown ─────────────────────────────────────

  private applyPredicatePushdown(spec: QuerySpecification): {
    applied: boolean;
    pushdownFilters: string[];
    pushdownCost: number;
    remainingPredicates: number;
    selectivity: number;
    canShortCircuit: boolean;
  } {
    if (!spec.filter) {
      return { applied: false, pushdownFilters: [], pushdownCost: 0, remainingPredicates: 0, selectivity: 1, canShortCircuit: false };
    }

    const allPredicates = flattenPredicates(spec.filter);
    const pushdownFilters: string[] = [];
    let pushdownCount = 0;
    let canShortCircuit = false;
    let selectivity = 1.0;

    for (const pred of allPredicates) {
      // Equality and IN predicates are highly selective — good candidates for pushdown
      if (
        pred.operator === PredicateOperator.Equals ||
        pred.operator === PredicateOperator.In ||
        pred.operator === PredicateOperator.Exists
      ) {
        pushdownFilters.push(`${pred.field} ${pred.operator} ${String(pred.value)}`);
        pushdownCount++;
        // Equality is very selective; IN depends on list size
        if (pred.operator === PredicateOperator.Equals) {
          selectivity *= 0.05; // ~5% selectivity
        } else if (pred.operator === PredicateOperator.In) {
          const arr = pred.value as readonly string[];
          selectivity *= Math.min(0.5, arr.length * 0.1);
        }
      }

      // Exists can short-circuit
      if (pred.operator === PredicateOperator.Exists) {
        canShortCircuit = true;
      }
    }

    return {
      applied: pushdownCount > 0,
      pushdownFilters,
      pushdownCost: pushdownCount * 0.5,
      remainingPredicates: allPredicates.length - pushdownCount,
      selectivity: Math.max(0.01, selectivity),
      canShortCircuit,
    };
  }

  // ─── Scan Order ─────────────────────────────────────────────

  private recommendScanOrder(spec: QuerySpecification): string[] {
    const order: string[] = [];

    // Type-based filters are cheapest — scan by type first
    if (spec.nodeTypes.length > 0) {
      order.push('type');
    }
    if (spec.edgeTypes.length > 0) {
      order.push('edgeType');
    }

    // Then by highly selective predicates
    if (spec.filter) {
      const preds = flattenPredicates(spec.filter);
      for (const pred of preds) {
        if (pred.operator === PredicateOperator.Equals && !order.includes(pred.field)) {
          order.push(pred.field);
        }
      }
    }

    return order;
  }

  // ─── Cacheability ───────────────────────────────────────────

  private isCacheable(spec: QuerySpecification): boolean {
    // Path queries are not cacheable (graph may change)
    if (spec.target === QueryTarget.Path) return false;
    // Subgraph queries are not cacheable (depends on current graph state)
    if (spec.target === QueryTarget.Subgraph) return false;
    // Queries with timeout are not reliably cacheable
    if (spec.timeout > 0 && spec.timeout < 5000) return false;
    // Queries explicitly requesting no cache
    if (!spec.useCache) return false;
    return true;
  }

  // ─── Complexity Estimation ──────────────────────────────────

  private estimateComplexity(spec: QuerySpecification, cost: number): string {
    const predCount = spec.filter ? countPredicates(spec.filter) : 0;

    if (spec.target === QueryTarget.Path) return 'O(V + E)';
    if (spec.target === QueryTarget.Subgraph) return 'O(V_sub + E_sub)';

    if (predCount === 0 && spec.aggregations.length === 0) {
      return 'O(N)';  // Simple scan
    }
    if (spec.groupBy) {
      return 'O(N log N)';  // Group-by requires sorting
    }
    if (spec.sort.length > 0) {
      return 'O(N log N)';  // Sorting
    }
    if (predCount > 5) {
      return 'O(N * P)';  // Many predicates
    }
    return 'O(N)';  // Linear scan with filters
  }
}

// ─── Singleton Optimizer ───────────────────────────────────────

/** Shared optimizer instance */
export const queryOptimizer = new QueryOptimizer();
