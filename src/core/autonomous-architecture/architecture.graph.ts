/**
 * Autonomous Architecture Runtime — Architecture Graph Container
 * TASK-AIS-012A.003
 *
 * Immutable data container over ArchitectureGraphModel.
 * No algorithms. No traversal. No validation. No business logic.
 */

import type {
  ArchitectureGraphModel,
  ArchitectureLayer,
  ArchitectureNode,
  ArchitectureEdge,
} from './architecture.model.js';

export class ArchitectureGraph {
  private readonly model: ArchitectureGraphModel;

  constructor(model: ArchitectureGraphModel) {
    this.model = model;
  }

  get model(): ArchitectureGraphModel {
    return this.model;
  }

  get layers(): readonly ArchitectureLayer[] {
    return this.model.layers;
  }

  get nodes(): readonly ArchitectureNode[] {
    return this.model.nodes;
  }

  get edges(): readonly ArchitectureEdge[] {
    return this.model.edges;
  }
}
