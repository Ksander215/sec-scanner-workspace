/**
 * Knowledge Graph Query Engine — Query Plan
 *
 * Builds detailed execution plans for queries.
 * Each plan consists of ordered stages that describe how the query
 * will be executed, including estimated costs and index usage.
 */

import type { QuerySpecification, QueryPlan, QueryPlanStage, ExplainResult } from '../types/index.ts';
import { QueryTarget } from '../types/index.ts';
import { countPredicates, flattenPredicates } from '../filters/index.ts';
import { brandQueryId } from '../../types/index.ts';
import { queryOptimizer } from '../optimizer/index.ts';

/**
 * Build an explain plan for a query specification.
 * Returns the plan without executing the query.
 */
export function buildExplainPlan(spec: QuerySpecification): ExplainResult {
  const optimization = queryOptimizer.optimize(spec);
  const plan = optimization.plan;

  const description = plan.stages
    .map((stage, i) => `${i + 1}. ${stage.name}: ${stage.description} (cost: ${stage.estimatedCost})`)
    .join('\n');

  return Object.freeze({
    plan,
    description,
    estimatedCost: plan.totalEstimatedCost,
    indexesUsed: plan.indexesUsed,
    filtersApplied: plan.filtersApplied,
    estimatedComplexity: plan.estimatedComplexity,
  });
}

/**
 * Build a quick plan without full optimization.
 * Used for simple queries where optimization overhead isn't justified.
 */
export function buildQuickPlan(spec: QuerySpecification): QueryPlan {
  const predCount = spec.filter ? countPredicates(spec.filter) : 0;

  const stages: QueryPlanStage[] = [
    {
      name: 'scan',
      estimatedCost: spec.target === QueryTarget.Edges ? 15 : 10,
      estimatedRows: 1000,
      description: `Scan ${spec.target}`,
      indexUsed: null,
      canShortCircuit: false,
    },
  ];

  if (predCount > 0) {
    stages.push({
      name: 'filter',
      estimatedCost: predCount * 0.5,
      estimatedRows: Math.max(1, Math.floor(1000 * 0.3)),
      description: `Apply ${predCount} predicate(s)`,
      indexUsed: null,
      canShortCircuit: false,
    });
  }

  if (spec.pagination.limit < 10000) {
    stages.push({
      name: 'paginate',
      estimatedCost: 0.5,
      estimatedRows: spec.pagination.limit,
      description: `Limit ${spec.pagination.limit}`,
      indexUsed: null,
      canShortCircuit: true,
    });
  }

  return Object.freeze({
    queryId: spec.id,
    stages: Object.freeze(stages),
    totalEstimatedCost: stages.reduce((sum, s) => sum + s.estimatedCost, 0),
    indexesUsed: [],
    filtersApplied: [],
    estimatedComplexity: predCount > 0 ? 'O(N)' : 'O(N)',
    cacheable: false,
  });
}
