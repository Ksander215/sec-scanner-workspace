/**
 * Knowledge Graph Query Engine — Predicate Library
 *
 * Evaluates query predicates against GraphNode and GraphEdge objects.
 * Each predicate is a serializable QueryPredicate with an operator and value.
 *
 * Supports:
 * - equals, notEquals
 * - contains, startsWith, endsWith
 * - regex
 * - exists
 * - in (membership test)
 * - greaterThan, lessThan, gte, lte
 *
 * All predicates can be negated via the `negated` flag.
 * Field paths use dot notation: 'identity.type', 'properties.severity', 'metadata.confidence'
 */

import type { GraphNode, GraphEdge } from '../../models/index.ts';
import type { QueryPredicate } from '../types/index.ts';
import { PredicateOperator } from '../types/index.ts';

// ─── Field Access ──────────────────────────────────────────────

/**
 * Resolve a dot-notation field path on an object.
 * Returns undefined if the path doesn't exist.
 */
function resolveField(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Convert a GraphNode to a queryable plain object.
 * Flattens identity and metadata for dot-notation access.
 */
function nodeToQueryable(node: GraphNode): Record<string, unknown> {
  return {
    id: node.identity.id,
    type: node.identity.type,
    labels: node.identity.labels,
    createdAt: node.metadata.createdAt,
    updatedAt: node.metadata.updatedAt,
    source: node.metadata.source,
    confidence: node.metadata.confidence,
    tags: node.metadata.tags,
    properties: node.properties,
    // Flatten for dot-notation: identity.type, metadata.confidence, properties.severity
    identity: {
      id: node.identity.id,
      type: node.identity.type,
      labels: node.identity.labels,
    },
    metadata: {
      createdAt: node.metadata.createdAt,
      updatedAt: node.metadata.updatedAt,
      source: node.metadata.source,
      confidence: node.metadata.confidence,
      tags: node.metadata.tags,
    },
  };
}

/**
 * Convert a GraphEdge to a queryable plain object.
 */
function edgeToQueryable(edge: GraphEdge): Record<string, unknown> {
  return {
    id: edge.id,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    edgeType: edge.relationship.edgeType,
    strength: edge.relationship.strength,
    description: edge.relationship.description,
    createdAt: edge.createdAt,
    properties: edge.properties,
    relationship: {
      edgeType: edge.relationship.edgeType,
      strength: edge.relationship.strength,
      description: edge.relationship.description,
    },
  };
}

// ─── Predicate Evaluation ──────────────────────────────────────

/**
 * Evaluate a single predicate operator against a field value.
 */
function evaluateOperator(
  operator: PredicateOperator,
  fieldValue: unknown,
  predicateValue: string | number | boolean | readonly string[] | readonly number[] | null,
): boolean {
  switch (operator) {
    case PredicateOperator.Equals: {
      if (fieldValue === null || fieldValue === undefined) return predicateValue === null;
      return String(fieldValue) === String(predicateValue);
    }
    case PredicateOperator.NotEquals: {
      if (fieldValue === null || fieldValue === undefined) return predicateValue !== null;
      return String(fieldValue) !== String(predicateValue);
    }
    case PredicateOperator.Contains: {
      if (fieldValue === null || fieldValue === undefined) return false;
      const str = String(fieldValue);
      return str.includes(String(predicateValue));
    }
    case PredicateOperator.StartsWith: {
      if (fieldValue === null || fieldValue === undefined) return false;
      return String(fieldValue).startsWith(String(predicateValue));
    }
    case PredicateOperator.EndsWith: {
      if (fieldValue === null || fieldValue === undefined) return false;
      return String(fieldValue).endsWith(String(predicateValue));
    }
    case PredicateOperator.Regex: {
      if (fieldValue === null || fieldValue === undefined) return false;
      try {
        const regex = new RegExp(String(predicateValue));
        return regex.test(String(fieldValue));
      } catch {
        return false;
      }
    }
    case PredicateOperator.Exists: {
      // predicateValue is ignored; we just check existence
      return fieldValue !== null && fieldValue !== undefined;
    }
    case PredicateOperator.In: {
      if (!Array.isArray(predicateValue)) return false;
      if (fieldValue === null || fieldValue === undefined) return false;
      const arr = predicateValue as readonly string[];
      return arr.includes(String(fieldValue));
    }
    case PredicateOperator.GreaterThan: {
      if (fieldValue === null || fieldValue === undefined) return false;
      if (typeof fieldValue === 'number' && typeof predicateValue === 'number') {
        return fieldValue > predicateValue;
      }
      return String(fieldValue) > String(predicateValue);
    }
    case PredicateOperator.LessThan: {
      if (fieldValue === null || fieldValue === undefined) return false;
      if (typeof fieldValue === 'number' && typeof predicateValue === 'number') {
        return fieldValue < predicateValue;
      }
      return String(fieldValue) < String(predicateValue);
    }
    case PredicateOperator.GreaterThanOrEqual: {
      if (fieldValue === null || fieldValue === undefined) return false;
      if (typeof fieldValue === 'number' && typeof predicateValue === 'number') {
        return fieldValue >= predicateValue;
      }
      return String(fieldValue) >= String(predicateValue);
    }
    case PredicateOperator.LessThanOrEqual: {
      if (fieldValue === null || fieldValue === undefined) return false;
      if (typeof fieldValue === 'number' && typeof predicateValue === 'number') {
        return fieldValue <= predicateValue;
      }
      return String(fieldValue) <= String(predicateValue);
    }
    default:
      return false;
  }
}

/**
 * Evaluate a QueryPredicate against a GraphNode.
 *
 * @param predicate - The predicate to evaluate
 * @param node - The node to test
 * @returns Whether the node matches the predicate
 */
export function evaluateNodePredicate(predicate: QueryPredicate, node: GraphNode): boolean {
  const obj = nodeToQueryable(node);
  const fieldValue = resolveField(obj, predicate.field);
  const result = evaluateOperator(predicate.operator, fieldValue, predicate.value);
  return predicate.negated ? !result : result;
}

/**
 * Evaluate a QueryPredicate against a GraphEdge.
 *
 * @param predicate - The predicate to evaluate
 * @param edge - The edge to test
 * @returns Whether the edge matches the predicate
 */
export function evaluateEdgePredicate(predicate: QueryPredicate, edge: GraphEdge): boolean {
  const obj = edgeToQueryable(edge);
  const fieldValue = resolveField(obj, predicate.field);
  const result = evaluateOperator(predicate.operator, fieldValue, predicate.value);
  return predicate.negated ? !result : result;
}

// ─── Predicate Factories ───────────────────────────────────────

/** Create an equals predicate */
export function equals(field: string, value: string | number | boolean): QueryPredicate {
  return Object.freeze({ field, operator: PredicateOperator.Equals, value, negated: false });
}

/** Create a not-equals predicate */
export function notEquals(field: string, value: string | number | boolean): QueryPredicate {
  return Object.freeze({ field, operator: PredicateOperator.NotEquals, value, negated: false });
}

/** Create a contains predicate */
export function contains(field: string, value: string): QueryPredicate {
  return Object.freeze({ field, operator: PredicateOperator.Contains, value, negated: false });
}

/** Create a starts-with predicate */
export function startsWith(field: string, value: string): QueryPredicate {
  return Object.freeze({ field, operator: PredicateOperator.StartsWith, value, negated: false });
}

/** Create an ends-with predicate */
export function endsWith(field: string, value: string): QueryPredicate {
  return Object.freeze({ field, operator: PredicateOperator.EndsWith, value, negated: false });
}

/** Create a regex predicate */
export function regex(field: string, pattern: string): QueryPredicate {
  return Object.freeze({ field, operator: PredicateOperator.Regex, value: pattern, negated: false });
}

/** Create an exists predicate */
export function exists(field: string): QueryPredicate {
  return Object.freeze({ field, operator: PredicateOperator.Exists, value: null, negated: false });
}

/** Create an in predicate */
export function inList(field: string, values: readonly string[]): QueryPredicate {
  return Object.freeze({ field, operator: PredicateOperator.In, value: Object.freeze([...values]), negated: false });
}

/** Create a greater-than predicate */
export function greaterThan(field: string, value: number): QueryPredicate {
  return Object.freeze({ field, operator: PredicateOperator.GreaterThan, value, negated: false });
}

/** Create a less-than predicate */
export function lessThan(field: string, value: number): QueryPredicate {
  return Object.freeze({ field, operator: PredicateOperator.LessThan, value, negated: false });
}

/** Create a greater-than-or-equal predicate */
export function gte(field: string, value: number): QueryPredicate {
  return Object.freeze({ field, operator: PredicateOperator.GreaterThanOrEqual, value, negated: false });
}

/** Create a less-than-or-equal predicate */
export function lte(field: string, value: number): QueryPredicate {
  return Object.freeze({ field, operator: PredicateOperator.LessThanOrEqual, value, negated: false });
}

/** Negate a predicate */
export function negate(predicate: QueryPredicate): QueryPredicate {
  return Object.freeze({ ...predicate, negated: !predicate.negated });
}
