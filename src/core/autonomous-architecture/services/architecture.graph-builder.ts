/**
 * Autonomous Architecture Runtime — Architecture Graph Builder
 * TASK-AIS-012A.013
 *
 * Immutable Builder for sequential construction of ArchitectureGraph.
 * No validation. No business logic. Only assembly.
 */

import type {
  ArchitectureGraphModel,
  ArchitectureLayer,
  ArchitectureNode,
  ArchitectureEdge,
} from '../architecture.model.js';

import { ArchitectureGraph } from '../architecture.graph.js';

export class ArchitectureGraphBuilder {
  private readonly layers: ArchitectureLayer[];
  private readonly nodes: ArchitectureNode[];
  private readonly edges: ArchitectureEdge[];

  constructor() {
    this.layers = [];
    this.nodes = [];
    this.edges = [];
  }

  addLayer(layer: ArchitectureLayer): this {
    this.layers.push(layer);
    return this;
  }

  addNode(node: ArchitectureNode): this {
    this.nodes.push(node);
    return this;
  }

  addEdge(edge: ArchitectureEdge): this {
    this.edges.push(edge);
    return this;
  }

  build(): ArchitectureGraph {
    const model: ArchitectureGraphModel = {
      layers: this.layers,
      nodes: this.nodes,
      edges: this.edges,
    };

    return new ArchitectureGraph(model);
  }
}
