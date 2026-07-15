/**
 * Security Intelligence Attack Path Builder — Graph Projection
 *
 * Builds a subgraph for a specific AttackPath.
 * Uses the Knowledge Graph's subgraph extraction capabilities
 * to create a focused view of the attack path.
 *
 * The projection includes:
 * - Only the nodes and edges in the attack path
 * - Supporting context (neighbors of path nodes within depth 1)
 * - Risk assessment data overlaid on the subgraph
 */

import type { NodeId, EdgeId } from '../../../knowledge-graph/types/index.ts';
import type { GraphSubgraph, GraphNode, GraphEdge } from '../../../knowledge-graph/models/index.ts';
import type { GraphTraversalEngineImpl } from '../../../knowledge-graph/traversal/engine/index.ts';
import type { AttackPath, AttackNode, AttackEdge } from '../types/index.ts';

// ─── Projection Result ───────────────────────────────────────

/** Result of projecting an attack path to a subgraph */
export interface ProjectionResult {
  /** The projected subgraph (if KG integration available) */
  readonly subgraph: GraphSubgraph | null;
  /** Node IDs in the projection */
  readonly nodeIds: readonly NodeId[];
  /** Edge IDs in the projection */
  readonly edgeIds: readonly EdgeId[];
  /** Attack nodes in the projection */
  readonly attackNodes: readonly AttackNode[];
  /** Attack edges in the projection */
  readonly attackEdges: readonly AttackEdge[];
  /** Context depth used for the projection */
  readonly contextDepth: number;
  /** Duration of projection in ms */
  readonly durationMs: number;
}

// ─── Projection Configuration ────────────────────────────────

/** Configuration for graph projection */
export interface ProjectionConfig {
  /** Whether to include context neighbors (default: true) */
  readonly includeContext: boolean;
  /** Context depth for neighbors (default: 1) */
  readonly contextDepth: number;
  /** Whether to include KG subgraph extraction (default: true) */
  readonly extractKGSubgraph: boolean;
}

/** Default projection configuration */
export const DEFAULT_PROJECTION_CONFIG: ProjectionConfig = Object.freeze({
  includeContext: true,
  contextDepth: 1,
  extractKGSubgraph: true,
});

// ─── Graph Projection Engine ─────────────────────────────────

/**
 * Projects an attack path onto the Knowledge Graph to create
 * a focused subgraph view.
 *
 * Uses the Knowledge Graph's extractSubgraph() method.
 * Does NOT implement custom subgraph extraction algorithms.
 */
export class GraphProjectionEngine {
  private readonly _traversalEngine: GraphTraversalEngineImpl | null;
  private readonly _config: ProjectionConfig;

  constructor(
    traversalEngine: GraphTraversalEngineImpl | null = null,
    config: ProjectionConfig = DEFAULT_PROJECTION_CONFIG,
  ) {
    this._traversalEngine = traversalEngine;
    this._config = Object.freeze({ ...config });
  }

  /**
   * Project an attack path to a subgraph.
   *
   * Extracts the minimal subgraph that contains all path nodes and edges,
   * optionally including context neighbors.
   */
  async project(path: AttackPath): Promise<ProjectionResult> {
    const startTime = performance.now();

    const nodeIds = path.nodes.map(n => n.graphNodeId);
    const edgeIds = path.edges.map(e => e.graphEdgeId);

    let subgraph: GraphSubgraph | null = null;

    // Extract KG subgraph if engine is available
    if (this._traversalEngine && this._config.extractKGSubgraph && nodeIds.length > 0) {
      try {
        // Start from the first node and extract with enough depth to cover the path
        const maxDepth = this._config.includeContext
          ? Math.max(path.length, this._config.contextDepth)
          : path.length;

        subgraph = await this._traversalEngine.extractSubgraph(nodeIds[0], {
          maxDepth,
          direction: 'both',
        });
      } catch {
        // If subgraph extraction fails, continue without it
        subgraph = null;
      }
    }

    const durationMs = performance.now() - startTime;

    return Object.freeze({
      subgraph,
      nodeIds: Object.freeze(nodeIds),
      edgeIds: Object.freeze(edgeIds),
      attackNodes: path.nodes,
      attackEdges: path.edges,
      contextDepth: this._config.contextDepth,
      durationMs,
    });
  }

  /**
   * Project multiple paths and merge into a single subgraph view.
   */
  async projectMultiple(paths: readonly AttackPath[]): Promise<ProjectionResult> {
    const startTime = performance.now();

    // Collect all unique node and edge IDs
    const nodeIdSet = new Set<NodeId>();
    const edgeIdSet = new Set<EdgeId>();
    const allAttackNodes: AttackNode[] = [];
    const allAttackEdges: AttackEdge[] = [];

    for (const path of paths) {
      for (const node of path.nodes) {
        if (!nodeIdSet.has(node.graphNodeId)) {
          nodeIdSet.add(node.graphNodeId);
          allAttackNodes.push(node);
        }
      }
      for (const edge of path.edges) {
        if (!edgeIdSet.has(edge.graphEdgeId)) {
          edgeIdSet.add(edge.graphEdgeId);
          allAttackEdges.push(edge);
        }
      }
    }

    let subgraph: GraphSubgraph | null = null;

    if (this._traversalEngine && this._config.extractKGSubgraph && nodeIdSet.size > 0) {
      try {
        const firstNodeId = nodeIdSet.values().next().value!;
        subgraph = await this._traversalEngine.extractSubgraph(firstNodeId, {
          maxDepth: Math.max(...paths.map(p => p.length), this._config.contextDepth),
          direction: 'both',
        });
      } catch {
        subgraph = null;
      }
    }

    const durationMs = performance.now() - startTime;

    return Object.freeze({
      subgraph,
      nodeIds: Object.freeze([...nodeIdSet]),
      edgeIds: Object.freeze([...edgeIdSet]),
      attackNodes: Object.freeze(allAttackNodes),
      attackEdges: Object.freeze(allAttackEdges),
      contextDepth: this._config.contextDepth,
      durationMs,
    });
  }

  /** Get the projection configuration */
  get config(): ProjectionConfig {
    return this._config;
  }
}
