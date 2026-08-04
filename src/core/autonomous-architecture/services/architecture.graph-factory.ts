/**
 * Autonomous Architecture Runtime — Architecture Graph Factory
 * TASK-AIS-012A.015
 *
 * Single point of ArchitectureGraph creation.
 * No business logic. No validation. No state. No analysis.
 */

import type { ArchitectureGraphModel } from '../architecture.model.js';
import { ArchitectureGraph } from '../architecture.graph.js';
import { ArchitectureGraphBuilder } from './architecture.graph-builder.js';

export class ArchitectureGraphFactory {
  createEmpty(): ArchitectureGraph {
    return new ArchitectureGraph({
      layers: [],
      nodes: [],
      edges: [],
    });
  }

  create(model: ArchitectureGraphModel): ArchitectureGraph {
    return new ArchitectureGraph(model);
  }

  fromBuilder(builder: ArchitectureGraphBuilder): ArchitectureGraph {
    return builder.build();
  }
}
