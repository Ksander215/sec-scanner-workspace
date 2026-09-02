/**
 * Autonomous Architecture Runtime — Architecture Graph Container
 * TASK-AIS-012A.008
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
  // TASK-AIS-MEMORY-CAPTURE-BRIDGE-001 (S-0): renamed private backing field to
  // `_model` to resolve TS2300 duplicate identifier with the `model` getter.
  // Public API (`graph.model`) unchanged.
  private readonly _model: ArchitectureGraphModel;

  constructor(model: ArchitectureGraphModel) {
    this._model = model;
  }

  get model(): ArchitectureGraphModel {
    return this._model;
  }

  get layers(): readonly ArchitectureLayer[] {
    return this._model.layers;
  }

  get nodes(): readonly ArchitectureNode[] {
    return this._model.nodes;
  }

  get edges(): readonly ArchitectureEdge[] {
    return this._model.edges;
  }

  withNode(node: ArchitectureNode): ArchitectureGraph {
    return new ArchitectureGraph({
      layers: this._model.layers,
      nodes: [...this._model.nodes, node],
      edges: this._model.edges,
    });
  }

  withEdge(edge: ArchitectureEdge): ArchitectureGraph {
    return new ArchitectureGraph({
      layers: this._model.layers,
      nodes: this._model.nodes,
      edges: [...this._model.edges, edge],
    });
  }

  withoutNode(nodeId: ArchitectureNodeId): ArchitectureGraph {
    return new ArchitectureGraph({
      layers: this._model.layers,
      nodes: this._model.nodes.filter((n) => n.id !== nodeId),
      edges: this._model.edges.filter(
        (e) => e.from !== nodeId && e.to !== nodeId
      ),
    });
  }

  withoutEdge(edgeId: ArchitectureEdgeId): ArchitectureGraph {
    return new ArchitectureGraph({
      layers: this._model.layers,
      nodes: this._model.nodes,
      edges: this._model.edges.filter((e) => e.id !== edgeId),
    });
  }

  findNode(id: ArchitectureNodeId): ArchitectureNode | undefined {
    return this._model.nodes.find((n) => n.id === id);
  }

  findEdge(id: ArchitectureEdgeId): ArchitectureEdge | undefined {
    return this._model.edges.find((e) => e.id === id);
  }

  getNodesByKind(kind: ArchitectureNodeKind): readonly ArchitectureNode[] {
    return this._model.nodes.filter((n) => n.kind === kind);
  }

  getEdgesByKind(kind: ArchitectureEdgeKind): readonly ArchitectureEdge[] {
    return this._model.edges.filter((e) => e.kind === kind);
  }

  getOutgoingEdges(nodeId: ArchitectureNodeId): readonly ArchitectureEdge[] {
    return this._model.edges.filter((e) => e.from === nodeId);
  }

  getIncomingEdges(nodeId: ArchitectureNodeId): readonly ArchitectureEdge[] {
    return this._model.edges.filter((e) => e.to === nodeId);
  }

  getOutgoingNeighbors(nodeId: ArchitectureNodeId): readonly ArchitectureNode[] {
    return this._model.edges
      .filter((e) => e.from === nodeId)
      .map((e) => this.findNode(e.to))
      .filter((n): n is ArchitectureNode => n !== undefined);
  }

  getIncomingNeighbors(nodeId: ArchitectureNodeId): readonly ArchitectureNode[] {
    return this._model.edges
      .filter((e) => e.to === nodeId)
      .map((e) => this.findNode(e.from))
      .filter((n): n is ArchitectureNode => n !== undefined);
  }

  getNeighbors(nodeId: ArchitectureNodeId): readonly ArchitectureNode[] {
    const outgoing = this.getOutgoingNeighbors(nodeId);
    const incoming = this.getIncomingNeighbors(nodeId);
    const seen = new Set<string>();
    const result: ArchitectureNode[] = [];

    for (const node of outgoing) {
      if (!seen.has(node.id)) {
        seen.add(node.id);
        result.push(node);
      }
    }

    for (const node of incoming) {
      if (!seen.has(node.id)) {
        seen.add(node.id);
        result.push(node);
      }
    }

    return result;
  }
}
