/**
 * Knowledge Graph Query Engine — Composite Filters
 *
 * Evaluates composite filter trees (AND/OR/NOT/GROUP) against
 * GraphNode and GraphEdge objects.
 *
 * Filter evaluation uses short-circuit logic:
 * - AND: stops at first false child
 * - OR: stops at first true child
 * - NOT: negates the single child
 * - GROUP: evaluates all children (same as AND)
 */

import type { GraphNode, GraphEdge } from '../../models/index.ts';
import type { CompositeFilter, QueryPredicate } from '../types/index.ts';
import { FilterComposition } from '../types/index.ts';
import { evaluateNodePredicate, evaluateEdgePredicate } from '../predicates/index.ts';

// ─── Filter Evaluation ─────────────────────────────────────────

/**
 * Evaluate a CompositeFilter tree against a GraphNode.
 * Uses short-circuit evaluation for AND/OR.
 */
export function evaluateNodeFilter(filter: CompositeFilter | null, node: GraphNode): boolean {
  if (!filter) return true;
  return evaluateNodeFilterInternal(filter, node);
}

/**
 * Evaluate a CompositeFilter tree against a GraphEdge.
 */
export function evaluateEdgeFilter(filter: CompositeFilter | null, edge: GraphEdge): boolean {
  if (!filter) return true;
  return evaluateEdgeFilterInternal(filter, edge);
}

function evaluateNodeFilterInternal(filter: CompositeFilter, node: GraphNode): boolean {
  switch (filter.composition) {
    case FilterComposition.AND: {
      // Short-circuit: stop at first false
      for (const pred of filter.predicates) {
        if (!evaluateNodePredicate(pred, node)) return false;
      }
      for (const sub of filter.filters) {
        if (!evaluateNodeFilterInternal(sub, node)) return false;
      }
      return true;
    }
    case FilterComposition.OR: {
      // Short-circuit: stop at first true
      for (const pred of filter.predicates) {
        if (evaluateNodePredicate(pred, node)) return true;
      }
      for (const sub of filter.filters) {
        if (evaluateNodeFilterInternal(sub, node)) return true;
      }
      // If no children, OR of nothing is false
      return filter.predicates.length + filter.filters.length === 0 ? true : false;
    }
    case FilterComposition.NOT: {
      // NOT negates: if any child matches, return false
      for (const pred of filter.predicates) {
        if (evaluateNodePredicate(pred, node)) return false;
      }
      for (const sub of filter.filters) {
        if (evaluateNodeFilterInternal(sub, node)) return false;
      }
      return true;
    }
    case FilterComposition.GROUP: {
      // GROUP is like AND but semantically a parenthesized unit
      for (const pred of filter.predicates) {
        if (!evaluateNodePredicate(pred, node)) return false;
      }
      for (const sub of filter.filters) {
        if (!evaluateNodeFilterInternal(sub, node)) return false;
      }
      return true;
    }
    default:
      return true;
  }
}

function evaluateEdgeFilterInternal(filter: CompositeFilter, edge: GraphEdge): boolean {
  switch (filter.composition) {
    case FilterComposition.AND: {
      for (const pred of filter.predicates) {
        if (!evaluateEdgePredicate(pred, edge)) return false;
      }
      for (const sub of filter.filters) {
        if (!evaluateEdgeFilterInternal(sub, edge)) return false;
      }
      return true;
    }
    case FilterComposition.OR: {
      for (const pred of filter.predicates) {
        if (evaluateEdgePredicate(pred, edge)) return true;
      }
      for (const sub of filter.filters) {
        if (evaluateEdgeFilterInternal(sub, edge)) return true;
      }
      return filter.predicates.length + filter.filters.length === 0 ? true : false;
    }
    case FilterComposition.NOT: {
      for (const pred of filter.predicates) {
        if (evaluateEdgePredicate(pred, edge)) return false;
      }
      for (const sub of filter.filters) {
        if (evaluateEdgeFilterInternal(sub, edge)) return false;
      }
      return true;
    }
    case FilterComposition.GROUP: {
      for (const pred of filter.predicates) {
        if (!evaluateEdgePredicate(pred, edge)) return false;
      }
      for (const sub of filter.filters) {
        if (!evaluateEdgeFilterInternal(sub, edge)) return false;
      }
      return true;
    }
    default:
      return true;
  }
}

// ─── Filter Factories ──────────────────────────────────────────

/** Create an AND composite filter */
export function and(
  ...children: (QueryPredicate | CompositeFilter)[]
): CompositeFilter {
  const predicates = children.filter((c): c is QueryPredicate => 'operator' in c);
  const filters = children.filter((c): c is CompositeFilter => 'composition' in c);
  return Object.freeze({
    composition: FilterComposition.AND,
    predicates: Object.freeze(predicates),
    filters: Object.freeze(filters),
  });
}

/** Create an OR composite filter */
export function or(
  ...children: (QueryPredicate | CompositeFilter)[]
): CompositeFilter {
  const predicates = children.filter((c): c is QueryPredicate => 'operator' in c);
  const filters = children.filter((c): c is CompositeFilter => 'composition' in c);
  return Object.freeze({
    composition: FilterComposition.OR,
    predicates: Object.freeze(predicates),
    filters: Object.freeze(filters),
  });
}

/** Create a NOT composite filter */
export function notFilter(
  ...children: (QueryPredicate | CompositeFilter)[]
): CompositeFilter {
  const predicates = children.filter((c): c is QueryPredicate => 'operator' in c);
  const filters = children.filter((c): c is CompositeFilter => 'composition' in c);
  return Object.freeze({
    composition: FilterComposition.NOT,
    predicates: Object.freeze(predicates),
    filters: Object.freeze(filters),
  });
}

/** Create a GROUP composite filter (parenthesized AND) */
export function group(
  ...children: (QueryPredicate | CompositeFilter)[]
): CompositeFilter {
  const predicates = children.filter((c): c is QueryPredicate => 'operator' in c);
  const filters = children.filter((c): c is CompositeFilter => 'composition' in c);
  return Object.freeze({
    composition: FilterComposition.GROUP,
    predicates: Object.freeze(predicates),
    filters: Object.freeze(filters),
  });
}

/**
 * Count the total number of predicates in a filter tree.
 */
export function countPredicates(filter: CompositeFilter | null): number {
  if (!filter) return 0;
  let count = filter.predicates.length;
  for (const sub of filter.filters) {
    count += countPredicates(sub);
  }
  return count;
}

/**
 * Flatten a composite filter into a list of all predicates.
 */
export function flattenPredicates(filter: CompositeFilter | null): QueryPredicate[] {
  if (!filter) return [];
  const result: QueryPredicate[] = [...filter.predicates];
  for (const sub of filter.filters) {
    result.push(...flattenPredicates(sub));
  }
  return result;
}
