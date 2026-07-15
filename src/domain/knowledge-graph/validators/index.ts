/**
 * Knowledge Graph Domain Validators
 *
 * Validators enforce domain invariants at the boundary of the domain layer.
 * They check:
 * - Required fields
 * - Type correctness
 * - Self-references
 * - Duplicate IDs
 * - Cyclic references (in graph structure)
 * - Domain constraint compliance
 *
 * Validators return ValidationResult objects rather than throwing,
 * allowing accumulation of multiple validation issues.
 */

import type { GraphNode, GraphEdge, GraphSubgraph } from '../models/index.ts';
import type { Metadata } from '../types/index.ts';
import {
  NodeType, EdgeType, ValidationSeverity,
  MAX_NODE_PROPERTIES, MAX_EDGE_PROPERTIES, MAX_ID_LENGTH, MAX_LABEL_LENGTH,
  VALID_SOURCE_EDGE_MAP,
} from '../types/index.ts';

// ─── Validation Result ─────────────────────────────────────────

/** A single validation issue found during validation */
export interface ValidationIssue {
  readonly severity: ValidationSeverity;
  readonly code: string;
  readonly message: string;
  readonly path: string;
  readonly details?: Record<string, unknown>;
}

/** The result of a validation operation */
export interface ValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
  readonly errorCount: number;
  readonly warningCount: number;
}

/** Create a passing validation result */
export function validResult(): ValidationResult {
  return Object.freeze({ valid: true, issues: [], errorCount: 0, warningCount: 0 });
}

/** Create a failing validation result with issues */
export function invalidResult(issues: readonly ValidationIssue[]): ValidationResult {
  const errorCount = issues.filter(i => i.severity === ValidationSeverity.Error).length;
  const warningCount = issues.filter(i => i.severity === ValidationSeverity.Warning).length;
  return Object.freeze({
    valid: errorCount === 0,
    issues: Object.freeze([...issues]),
    errorCount,
    warningCount,
  });
}

/** Merge multiple validation results */
export function mergeResults(...results: ValidationResult[]): ValidationResult {
  const allIssues = results.flatMap(r => r.issues);
  return invalidResult(allIssues);
}

// ─── NodeValidator ─────────────────────────────────────────────

/**
 * Validates GraphNode instances against domain constraints.
 */
export const NodeValidator = {
  /** Validate a single GraphNode */
  validate(node: GraphNode): ValidationResult {
    const issues: ValidationIssue[] = [];

    // ID validation
    if (!node.identity.id || node.identity.id.length > MAX_ID_LENGTH) {
      issues.push({
        severity: ValidationSeverity.Error,
        code: 'INVALID_NODE_ID',
        message: `Node id must be 1-${MAX_ID_LENGTH} characters`,
        path: 'identity.id',
        details: { id: node.identity.id },
      });
    }

    // Type validation
    if (!Object.values(NodeType).includes(node.identity.type)) {
      issues.push({
        severity: ValidationSeverity.Error,
        code: 'INVALID_NODE_TYPE',
        message: `Invalid node type: ${node.identity.type}`,
        path: 'identity.type',
        details: { type: node.identity.type },
      });
    }

    // Label validation
    for (let i = 0; i < node.identity.labels.length; i++) {
      if (node.identity.labels[i].length > MAX_LABEL_LENGTH) {
        issues.push({
          severity: ValidationSeverity.Warning,
          code: 'LABEL_TOO_LONG',
          message: `Label exceeds max length ${MAX_LABEL_LENGTH}`,
          path: `identity.labels[${i}]`,
        });
      }
    }

    // Metadata validation
    if (node.metadata.confidence < 0 || node.metadata.confidence > 1) {
      issues.push({
        severity: ValidationSeverity.Error,
        code: 'INVALID_CONFIDENCE',
        message: `Confidence must be 0-1, got: ${node.metadata.confidence}`,
        path: 'metadata.confidence',
      });
    }

    // Properties count validation
    const propCount = Object.keys(node.properties).length;
    if (propCount > MAX_NODE_PROPERTIES) {
      issues.push({
        severity: ValidationSeverity.Warning,
        code: 'TOO_MANY_PROPERTIES',
        message: `Node has ${propCount} properties (max: ${MAX_NODE_PROPERTIES})`,
        path: 'properties',
      });
    }

    return issues.length > 0 ? invalidResult(issues) : validResult();
  },

  /** Validate that no duplicate node IDs exist in a collection */
  validateNoDuplicates(nodes: readonly GraphNode[]): ValidationResult {
    const issues: ValidationIssue[] = [];
    const seen = new Map<string, number>();

    for (const node of nodes) {
      const count = seen.get(node.identity.id) ?? 0;
      if (count > 0) {
        issues.push({
          severity: ValidationSeverity.Error,
          code: 'DUPLICATE_NODE_ID',
          message: `Duplicate node id: '${node.identity.id}'`,
          path: 'identity.id',
          details: { id: node.identity.id, occurrences: count + 1 },
        });
      }
      seen.set(node.identity.id, count + 1);
    }

    return issues.length > 0 ? invalidResult(issues) : validResult();
  },
} as const;

// ─── EdgeValidator ─────────────────────────────────────────────

/**
 * Validates GraphEdge instances against domain constraints.
 */
export const EdgeValidator = {
  /** Validate a single GraphEdge */
  validate(edge: GraphEdge): ValidationResult {
    const issues: ValidationIssue[] = [];

    // ID validation
    if (!edge.id || edge.id.length > MAX_ID_LENGTH) {
      issues.push({
        severity: ValidationSeverity.Error,
        code: 'INVALID_EDGE_ID',
        message: `Edge id must be 1-${MAX_ID_LENGTH} characters`,
        path: 'id',
      });
    }

    // Self-reference check
    if (edge.sourceId === edge.targetId) {
      issues.push({
        severity: ValidationSeverity.Error,
        code: 'SELF_REFERENCE',
        message: `Edge references same node as source and target: '${edge.sourceId}'`,
        path: 'sourceId/targetId',
        details: { nodeId: edge.sourceId, edgeType: edge.relationship.edgeType },
      });
    }

    // Edge type validation
    if (!Object.values(EdgeType).includes(edge.relationship.edgeType)) {
      issues.push({
        severity: ValidationSeverity.Error,
        code: 'INVALID_EDGE_TYPE',
        message: `Invalid edge type: ${edge.relationship.edgeType}`,
        path: 'relationship.edgeType',
      });
    }

    // Strength validation
    if (edge.relationship.strength < 0 || edge.relationship.strength > 1) {
      issues.push({
        severity: ValidationSeverity.Error,
        code: 'INVALID_STRENGTH',
        message: `Relationship strength must be 0-1, got: ${edge.relationship.strength}`,
        path: 'relationship.strength',
      });
    }

    // Properties count validation
    const propCount = Object.keys(edge.properties).length;
    if (propCount > MAX_EDGE_PROPERTIES) {
      issues.push({
        severity: ValidationSeverity.Warning,
        code: 'TOO_MANY_PROPERTIES',
        message: `Edge has ${propCount} properties (max: ${MAX_EDGE_PROPERTIES})`,
        path: 'properties',
      });
    }

    return issues.length > 0 ? invalidResult(issues) : validResult();
  },

  /** Validate edge against known source/target node types */
  validateRelationship(
    edge: GraphEdge,
    sourceType: NodeType,
    targetType: NodeType,
  ): ValidationResult {
    const issues: ValidationIssue[] = [];
    const allowedEdgeTypes = VALID_SOURCE_EDGE_MAP[sourceType];

    if (allowedEdgeTypes && !allowedEdgeTypes.includes(edge.relationship.edgeType)) {
      issues.push({
        severity: ValidationSeverity.Warning,
        code: 'INVALID_RELATIONSHIP',
        message: `${sourceType} -[${edge.relationship.edgeType}]-> ${targetType} is not a standard relationship`,
        path: 'relationship.edgeType',
        details: { sourceType, edgeType: edge.relationship.edgeType, targetType },
      });
    }

    return issues.length > 0 ? invalidResult(issues) : validResult();
  },

  /** Validate no duplicate edge IDs in a collection */
  validateNoDuplicates(edges: readonly GraphEdge[]): ValidationResult {
    const issues: ValidationIssue[] = [];
    const seen = new Map<string, number>();

    for (const edge of edges) {
      const count = seen.get(edge.id) ?? 0;
      if (count > 0) {
        issues.push({
          severity: ValidationSeverity.Error,
          code: 'DUPLICATE_EDGE_ID',
          message: `Duplicate edge id: '${edge.id}'`,
          path: 'id',
          details: { id: edge.id, occurrences: count + 1 },
        });
      }
      seen.set(edge.id, count + 1);
    }

    return issues.length > 0 ? invalidResult(issues) : validResult();
  },
} as const;

// ─── GraphValidator ────────────────────────────────────────────

/**
 * Validates the overall graph structure — node/edge consistency,
 * referential integrity, and absence of problematic cycles.
 */
export const GraphValidator = {
  /** Validate a set of nodes and edges together */
  validate(nodes: readonly GraphNode[], edges: readonly GraphEdge[]): ValidationResult {
    const allIssues: ValidationIssue[] = [];

    // Node-level validation
    for (const node of nodes) {
      const result = NodeValidator.validate(node);
      allIssues.push(...result.issues);
    }

    // Duplicate node check
    const dupNodes = NodeValidator.validateNoDuplicates(nodes);
    allIssues.push(...dupNodes.issues);

    // Edge-level validation
    for (const edge of edges) {
      const result = EdgeValidator.validate(edge);
      allIssues.push(...result.issues);
    }

    // Duplicate edge check
    const dupEdges = EdgeValidator.validateNoDuplicates(edges);
    allIssues.push(...dupEdges.issues);

    // Referential integrity: edges must reference existing nodes
    const nodeIds = new Set(nodes.map(n => n.identity.id));
    for (const edge of edges) {
      if (!nodeIds.has(edge.sourceId)) {
        allIssues.push({
          severity: ValidationSeverity.Error,
          code: 'DANGLING_EDGE_SOURCE',
          message: `Edge source '${edge.sourceId}' does not exist in node set`,
          path: `edge.${edge.id}.sourceId`,
          details: { edgeId: edge.id, sourceId: edge.sourceId },
        });
      }
      if (!nodeIds.has(edge.targetId)) {
        allIssues.push({
          severity: ValidationSeverity.Error,
          code: 'DANGLING_EDGE_TARGET',
          message: `Edge target '${edge.targetId}' does not exist in node set`,
          path: `edge.${edge.id}.targetId`,
          details: { edgeId: edge.id, targetId: edge.targetId },
        });
      }
    }

    // Cycle detection (simple: detect if any node can reach itself)
    // This is a lightweight check — full cycle detection would be in the Traversal Engine
    const cycleIssues = detectSimpleCycles(nodes, edges);
    allIssues.push(...cycleIssues);

    return invalidResult(allIssues);
  },

  /** Validate a subgraph */
  validateSubgraph(subgraph: GraphSubgraph): ValidationResult {
    return this.validate(subgraph.nodes, subgraph.edges);
  },
} as const;

// ─── Cycle Detection ───────────────────────────────────────────

/**
 * Detect simple cycles in the graph using DFS.
 * Returns validation issues for each cycle found.
 * Only detects cycles that are "problematic" — self-loops are already
 * caught by EdgeValidator, so this focuses on multi-node cycles.
 */
function detectSimpleCycles(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Build adjacency list
  const adj = new Map<string, string[]>();
  for (const node of nodes) {
    adj.set(node.identity.id, []);
  }
  for (const edge of edges) {
    const neighbors = adj.get(edge.sourceId);
    if (neighbors) {
      neighbors.push(edge.targetId);
    }
  }

  // DFS-based cycle detection
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const node of nodes) {
    color.set(node.identity.id, WHITE);
  }

  function dfs(nodeId: string): boolean {
    color.set(nodeId, GRAY);
    const neighbors = adj.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      const neighborColor = color.get(neighbor);
      if (neighborColor === GRAY) {
        return true; // cycle found
      }
      if (neighborColor === WHITE && dfs(neighbor)) {
        return true;
      }
    }
    color.set(nodeId, BLACK);
    return false;
  }

  for (const node of nodes) {
    if (color.get(node.identity.id) === WHITE) {
      if (dfs(node.identity.id)) {
        issues.push({
          severity: ValidationSeverity.Warning,
          code: 'CYCLE_DETECTED',
          message: 'Graph contains a cycle',
          path: 'graph',
          details: { startNode: node.identity.id },
        });
        // Report only once per connected component
        break;
      }
    }
  }

  return issues;
}
