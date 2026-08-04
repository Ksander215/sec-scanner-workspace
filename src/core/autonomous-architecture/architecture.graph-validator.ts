/**
 * Autonomous Architecture Runtime — Architecture Graph Validation Foundation
 * TASK-AIS-012A.007
 *
 * Structural integrity checks only. No recommendations. No auto-fix. No algorithms.
 */

import {
  ArchitectureGraph,
  ArchitectureNodeId,
} from './architecture.graph.js';

export interface ArchitectureGraphValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export class ArchitectureGraphValidator {
  private readonly graph: ArchitectureGraph;

  constructor(graph: ArchitectureGraph) {
    this.graph = graph;
  }

  validateNodesExist(): boolean {
    return this.graph.nodes.length > 0;
  }

  validateUniqueNodeIds(): boolean {
    const seen = new Set<string>();
    for (const node of this.graph.nodes) {
      if (seen.has(node.id)) {
        return false;
      }
      seen.add(node.id);
    }
    return true;
  }

  validateUniqueEdgeIds(): boolean {
    const seen = new Set<string>();
    for (const edge of this.graph.edges) {
      if (seen.has(edge.id)) {
        return false;
      }
      seen.add(edge.id);
    }
    return true;
  }

  validateEdgeEndpoints(): boolean {
    const nodeIds = new Set<string>();
    for (const node of this.graph.nodes) {
      nodeIds.add(node.id);
    }

    for (const edge of this.graph.edges) {
      if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
        return false;
      }
    }
    return true;
  }

  validate(): ArchitectureGraphValidationResult {
    const errors: string[] = [];

    if (!this.validateNodesExist()) {
      errors.push('Graph contains no nodes');
    }

    if (!this.validateUniqueNodeIds()) {
      errors.push('Duplicate node ids detected');
    }

    if (!this.validateUniqueEdgeIds()) {
      errors.push('Duplicate edge ids detected');
    }

    if (!this.validateEdgeEndpoints()) {
      errors.push('Edge references missing node');
    }

    return Object.freeze({
      valid: errors.length === 0,
      errors: Object.freeze([...errors]),
    });
  }
}
