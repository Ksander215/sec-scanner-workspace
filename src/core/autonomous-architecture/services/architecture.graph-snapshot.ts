/**
 * Autonomous Architecture Runtime — Architecture Graph Snapshot Foundation
 * TASK-AIS-012A.010
 *
 * Immutable wrapper holding a reference to an ArchitectureGraph.
 * No versioning. No persistence. No analysis. No runtime.
 */

import { ArchitectureGraph } from '../architecture.graph.js';

export class ArchitectureGraphSnapshot {
  private readonly graph: ArchitectureGraph;

  constructor(graph: ArchitectureGraph) {
    this.graph = graph;
  }

  getGraph(): ArchitectureGraph {
    return this.graph;
  }
}
