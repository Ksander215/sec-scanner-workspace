/**
 * Autonomous Architecture Runtime — Architecture Graph Container
 * TASK-AIS-012A.005
 *
 * Immutable data container over ArchitectureGraphModel.
 * No algorithms. No traversal. No validation. No business logic.
 */

import type {
  ArchitectureGraphModel,
  ArchitectureLayer,
  ArchitectureNode,
  ArchitectureEdge,
  ArchitectureNodeId,
  ArchitectureEdgeId,
  ArchitectureNodeKind,
  ArchitectureEdgeKind,
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

  withNode(node: ArchitectureNode): ArchitectureGraph {
    return new ArchitectureGraph({
      layers: this.model.layers,
      nodes: [...this.model.nodes, node],
      edges: this.model.edges,
    });
  }

  withEdge(edge: ArchitectureEdge): ArchitectureGraph {
    return new ArchitectureGraph({
      layers: this.model.layers,
      nodes: this.model.nodes,
      edges: [...this.model.edges, edge],
    });
  }

  withoutNode(nodeId: ArchitectureNodeId): ArchitectureGraph {
    return new ArchitectureGraph({
      layers: this.model.layers,
      nodes: this.model.nodes.filter((n) => n.id !== nodeId),
      edges: this.model.edges.filter(
        (e) => e.from !== nodeId && e.to !== nodeId
      ),
    });
  }

  withoutEdge(edgeId: ArchitectureEdgeId): ArchitectureGraph {
    return new ArchitectureGraph({
      layers: this.model.layers,
      nodes: this.model.nodes,
      edges: this.model.edges.filter((e) => e.id !== edgeId),
    });
  }

  findNode(id: ArchitectureNodeId): ArchitectureNode | undefined {
    return this.model.nodes.find((n) => n.id === id);
  }

  findEdge(id: ArchitectureEdgeId): ArchitectureEdge | undefined {
    return this.model.edges.find((e) => e.id === id);
  }

  getNodesByKind(kind: ArchitectureNodeKind): readonly ArchitectureNode[] {
    return this.model.nodes.filter((n) => n.kind === kind);
  }

  getEdgesByKind(kind: ArchitectureEdgeKind): readonly ArchitectureEdge[] {
    return this.model.edges.filter((e) => e.kind === kind);
  }

  getOutgoingEdges(nodeId: ArchitectureNodeId): readonly ArchitectureEdge[] {
    return this.model.edges.filter((e) => e.from === nodeId);
  }

  getIncomingEdges(nodeId: ArchitectureNodeId): readonly ArchitectureEdge[] {
    return this.model.edges.filter((e) => e.to === nodeId);
  }
}
