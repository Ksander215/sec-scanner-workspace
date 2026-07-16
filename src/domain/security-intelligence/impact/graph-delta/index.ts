/**
 * Security Intelligence Impact Analysis — Graph Delta Engine
 *
 * Computes the difference in the Knowledge Graph when a mitigation
 * scenario is applied. Shows removed nodes, removed edges, and
 * new disconnected components.
 *
 * Does NOT modify the Knowledge Graph — only computes the delta.
 * All calculations are fully deterministic.
 */

import type { ImpactScenarioId, Metadata } from '../types/index.ts';
import type { AttackPath } from '../../attack-path/types/index.ts';
import type { ScenarioEvaluationResult } from '../scenarios/index.ts';

// ─── Graph Delta Types ───────────────────────────────────────

/** Node change in the graph delta */
export interface GraphNodeChange {
  readonly nodeId: string;
  readonly changeType: 'removed' | 'isolated';
  readonly reason: string;
}

/** Edge change in the graph delta */
export interface GraphEdgeChange {
  readonly edgeId: string;
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly changeType: 'removed' | 'broken';
  readonly reason: string;
}

/** Component change in the graph delta */
export interface GraphComponentChange {
  readonly componentId: string;
  readonly nodeIds: readonly string[];
  readonly changeType: 'new' | 'split' | 'shrunk';
  readonly reason: string;
}

/** Complete graph delta result */
export interface GraphDelta {
  readonly scenarioId: ImpactScenarioId;
  readonly removedNodes: readonly GraphNodeChange[];
  readonly removedEdges: readonly GraphEdgeChange[];
  readonly componentChanges: readonly GraphComponentChange[];
  readonly totalNodesBefore: number;
  readonly totalNodesAfter: number;
  readonly totalEdgesBefore: number;
  readonly totalEdgesAfter: number;
  readonly connectivityDelta: number; // Change in overall connectivity (negative = less connected)
  readonly metadata: Metadata;
}

// ─── Graph Delta Computation ─────────────────────────────────

/**
 * Compute the graph delta for a scenario evaluation.
 * Analyzes which nodes and edges would be affected without modifying the graph.
 */
export function computeGraphDelta(
  scenarioId: ImpactScenarioId,
  attackPaths: readonly AttackPath[],
  evaluation: ScenarioEvaluationResult,
  allNodeIds?: readonly string[],
  allEdgeIds?: readonly string[],
): GraphDelta {
  // Collect all unique node and edge IDs from paths
  const pathNodeIds = new Set<string>();
  const pathEdgeIds = new Set<string>();

  for (const path of attackPaths) {
    for (const node of path.nodes) pathNodeIds.add(node.graphNodeId);
    for (const edge of path.edges) pathEdgeIds.add(edge.graphEdgeId);
  }

  // Compute removed nodes
  const removedNodeIds = new Set(evaluation.affectedNodeIds);
  // Also map attack node IDs to graph node IDs
  for (const path of attackPaths) {
    for (const node of path.nodes) {
      if (evaluation.affectedNodeIds.includes(node.id)) {
        removedNodeIds.add(node.graphNodeId);
      }
    }
  }

  const removedNodes: GraphNodeChange[] = [];
  for (const nodeId of removedNodeIds) {
    removedNodes.push(Object.freeze({
      nodeId,
      changeType: 'removed',
      reason: `Removed by ${evaluation.eliminatedPathIds.length > 0 ? 'path elimination' : 'mitigation'}`,
    }));
  }

  // Compute removed edges
  const removedEdgeIds = new Set(evaluation.affectedEdgeIds);
  // Map attack edge IDs to graph edge IDs
  for (const path of attackPaths) {
    for (const edge of path.edges) {
      if (evaluation.affectedEdgeIds.includes(edge.id)) {
        removedEdgeIds.add(edge.graphEdgeId);
      }
    }
  }

  // Also remove edges connected to removed nodes
  for (const path of attackPaths) {
    for (const edge of path.edges) {
      const sourceGraphNode = path.nodes.find(n => n.id === edge.sourceNodeId);
      const targetGraphNode = path.nodes.find(n => n.id === edge.targetNodeId);
      if (
        (sourceGraphNode && removedNodeIds.has(sourceGraphNode.graphNodeId)) ||
        (targetGraphNode && removedNodeIds.has(targetGraphNode.graphNodeId))
      ) {
        removedEdgeIds.add(edge.graphEdgeId);
      }
    }
  }

  const removedEdges: GraphEdgeChange[] = [];
  for (const path of attackPaths) {
    for (const edge of path.edges) {
      if (removedEdgeIds.has(edge.graphEdgeId) && !removedEdges.some(re => re.edgeId === edge.graphEdgeId)) {
        removedEdges.push(Object.freeze({
          edgeId: edge.graphEdgeId,
          sourceNodeId: edge.sourceNodeId,
          targetNodeId: edge.targetNodeId,
          changeType: 'removed',
          reason: `Edge removed due to node removal or direct mitigation`,
        }));
      }
    }
  }

  // Detect new components (simplified — based on eliminated paths)
  const componentChanges: GraphComponentChange[] = [];
  const eliminatedPaths = attackPaths.filter(p => evaluation.eliminatedPathIds.includes(p.id));
  if (eliminatedPaths.length > 0) {
    const componentNodeIds = new Set<string>();
    for (const path of eliminatedPaths) {
      for (const node of path.nodes) componentNodeIds.add(node.graphNodeId);
    }
    componentChanges.push(Object.freeze({
      componentId: `comp_${scenarioId}`,
      nodeIds: Object.freeze([...componentNodeIds]),
      changeType: 'split',
      reason: `Paths eliminated creating isolated component`,
    }));
  }

  // Compute totals
  const totalNodesBefore = allNodeIds?.length ?? pathNodeIds.size;
  const totalEdgesBefore = allEdgeIds?.length ?? pathEdgeIds.size;
  const totalNodesAfter = totalNodesBefore - removedNodes.length;
  const totalEdgesAfter = totalEdgesBefore - removedEdges.length;

  // Connectivity delta: fraction of edges removed
  const connectivityDelta = totalEdgesBefore > 0
    ? -(removedEdges.length / totalEdgesBefore)
    : 0;

  return Object.freeze({
    scenarioId,
    removedNodes: Object.freeze(removedNodes),
    removedEdges: Object.freeze(removedEdges),
    componentChanges: Object.freeze(componentChanges),
    totalNodesBefore,
    totalNodesAfter,
    totalEdgesBefore,
    totalEdgesAfter,
    connectivityDelta,
    metadata: Object.freeze({}),
  });
}

/**
 * Calculate the graph connectivity score (0.0–1.0).
 * Higher = more connected, lower = more fragmented.
 */
export function computeConnectivityScore(delta: GraphDelta): number {
  if (delta.totalNodesBefore === 0) return 1;
  const edgeRatio = delta.totalEdgesAfter / Math.max(1, delta.totalEdgesBefore);
  const nodeRatio = delta.totalNodesAfter / Math.max(1, delta.totalNodesBefore);
  return (edgeRatio + nodeRatio) / 2;
}
