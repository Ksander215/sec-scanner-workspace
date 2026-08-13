/**
 * Autonomous Architecture Runtime — Architecture Graph Snapshot Foundation Smoke Tests
 * TASK-AIS-012A.010
 */

import { describe, it, expect } from 'vitest';
import { ArchitectureGraph } from '../../../core/autonomous-architecture/architecture.graph.js';
import { ArchitectureGraphSnapshot } from '../../../core/autonomous-architecture/services/architecture.graph-snapshot.js';
import {
  ArchitectureNodeKind,
  ArchitectureEdgeKind,
  ArchitectureLayerKind,
  type ArchitectureNodeId,
  type ArchitectureEdgeId,
  type ArchitectureLayerId,
} from '../../../core/autonomous-architecture/index.js';

describe('ArchitectureGraphSnapshot', () => {
  const layerId = 'layer-core' as ArchitectureLayerId;
  const nodeA = 'node-a' as ArchitectureNodeId;
  const nodeB = 'node-b' as ArchitectureNodeId;
  const edgeAB = 'edge-ab' as ArchitectureEdgeId;

  const graph = new ArchitectureGraph({
    layers: [{ id: layerId, kind: ArchitectureLayerKind.Core, name: 'Core' }],
    nodes: [
      { id: nodeA, kind: ArchitectureNodeKind.Service, name: 'A', layer: layerId },
      { id: nodeB, kind: ArchitectureNodeKind.Module, name: 'B', layer: layerId },
    ],
    edges: [
      { id: edgeAB, kind: ArchitectureEdgeKind.DependsOn, from: nodeA, to: nodeB },
    ],
  });

  it('should create a snapshot from an ArchitectureGraph', () => {
    const snapshot = new ArchitectureGraphSnapshot(graph);
    expect(snapshot).toBeInstanceOf(ArchitectureGraphSnapshot);
  });

  it('should return the original graph via getGraph()', () => {
    const snapshot = new ArchitectureGraphSnapshot(graph);
    expect(snapshot.getGraph()).toBe(graph);
  });

  it('should return the same reference on multiple calls', () => {
    const snapshot = new ArchitectureGraphSnapshot(graph);
    expect(snapshot.getGraph()).toBe(snapshot.getGraph());
  });

  it('should not mutate the original graph', () => {
    const before = graph.nodes.length;
    const snapshot = new ArchitectureGraphSnapshot(graph);
    snapshot.getGraph();
    expect(graph.nodes.length).toBe(before);
  });

  it('should leave the original graph unchanged after snapshot creation', () => {
    const before = graph.nodes.length;
    new ArchitectureGraphSnapshot(graph);
    expect(graph.nodes.length).toBe(before);
  });

  it('should support an empty graph', () => {
    const empty = new ArchitectureGraph({ layers: [], nodes: [], edges: [] });
    const snapshot = new ArchitectureGraphSnapshot(empty);
    expect(snapshot.getGraph()).toBe(empty);
    expect(snapshot.getGraph().nodes.length).toBe(0);
  });

  it('should work with a graph created through the existing API', () => {
    const extended = graph
      .withNode({ id: nodeB, kind: ArchitectureNodeKind.Module, name: 'B', layer: layerId })
      .withEdge({ id: edgeAB, kind: ArchitectureEdgeKind.DependsOn, from: nodeA, to: nodeB });
    const snapshot = new ArchitectureGraphSnapshot(extended);
    expect(snapshot.getGraph()).toBe(extended);
  });

  it('should expose the class as a public export', () => {
    expect(ArchitectureGraphSnapshot).toBeDefined();
    expect(typeof ArchitectureGraphSnapshot).toBe('function');
  });

  it('should contain only the graph reference', () => {
    const snapshot = new ArchitectureGraphSnapshot(graph);
    const retrieved = snapshot.getGraph();
    expect(retrieved).toBe(graph);
    expect(retrieved.nodes).toBe(graph.nodes);
    expect(retrieved.edges).toBe(graph.edges);
  });
});
