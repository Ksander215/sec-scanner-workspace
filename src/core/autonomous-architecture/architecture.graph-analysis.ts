/**
 * Autonomous Architecture Runtime — Architecture Graph Analysis Foundation
 * TASK-AIS-012A.006
 *
 * Lightweight structural metrics. No recommendations. No scoring. No algorithms.
 */

import {
  ArchitectureGraph,
  ArchitectureNodeKind,
  ArchitectureEdgeKind,
} from './architecture.graph.js';

export class ArchitectureGraphAnalysis {
  private readonly graph: ArchitectureGraph;

  constructor(graph: ArchitectureGraph) {
    this.graph = graph;
  }

  getLayerCount(): number {
    return this.graph.layers.length;
  }

  getNodeCount(): number {
    return this.graph.nodes.length;
  }

  getEdgeCount(): number {
    return this.graph.edges.length;
  }

  getNodeKindDistribution(): Readonly<Record<ArchitectureNodeKind, number>> {
    const distribution: Record<ArchitectureNodeKind, number> = {} as Record<
      ArchitectureNodeKind,
      number
    >;

    for (const kind of Object.values(ArchitectureNodeKind)) {
      distribution[kind] = 0;
    }

    for (const node of this.graph.nodes) {
      distribution[node.kind] += 1;
    }

    return Object.freeze(distribution);
  }

  getEdgeKindDistribution(): Readonly<Record<ArchitectureEdgeKind, number>> {
    const distribution: Record<ArchitectureEdgeKind, number> = {} as Record<
      ArchitectureEdgeKind,
      number
    >;

    for (const kind of Object.values(ArchitectureEdgeKind)) {
      distribution[kind] = 0;
    }

    for (const edge of this.graph.edges) {
      distribution[edge.kind] += 1;
    }

    return Object.freeze(distribution);
  }

  getDensity(): number {
    const nodeCount = this.graph.nodes.length;
    if (nodeCount <= 1) {
      return 0;
    }
    return this.graph.edges.length / (nodeCount * (nodeCount - 1));
  }
}
