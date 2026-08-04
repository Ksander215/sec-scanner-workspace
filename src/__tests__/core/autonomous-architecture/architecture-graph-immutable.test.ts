/**
 * Autonomous Architecture Runtime — Architecture Graph Immutable Operations Smoke Tests
 * TASK-AIS-012A.004
 */

import { describe, it, expect } from 'vitest';
import { ArchitectureGraph } from '../../../core/autonomous-architecture/architecture.graph.js';
import {
  ArchitectureNodeKind,
  ArchitectureEdgeKind,
  ArchitectureLayerKind,
  type ArchitectureNodeId,
  type ArchitectureEdgeId,
  type ArchitectureLayerId,
} from '../../../core/autonomous-architecture/index.js';

describe('ArchitectureGraph immutable operations', () => {
  const layerId = 'layer-core' as ArchitectureLayerId;
  const nodeA = 'node-a' as ArchitectureNodeId;
  const nodeB = 'node-b' as ArchitectureNodeId;
  const edgeAB = 'edge-ab' as ArchitectureEdgeId;

  const baseGraph = new ArchitectureGraph({
    layers: [{ id: layerId, kind: ArchitectureLayerKind.Core, name: 'Core' }],
    nodes: [
      { id: nodeA, kind: ArchitectureNodeKind.Service, name: 'A', layer: layerId },
    ],
    edges: [],
  });

  it('should return a new graph with withNode', () => {
    const newNode = { id: nodeB, kind: ArchitectureNodeKind.Service, name: 'B', layer: layerId };
    const next = baseGraph.withNode(newNode);
    expect(next).not.toBe(baseGraph);
    expect(next.nodes.length).toBe(2);
    expect(baseGraph.nodes.length).toBe(1);
  });

  it('should return a new graph with withEdge', () => {
    const newEdge = { id: edgeAB, kind: ArchitectureEdgeKind.DependsOn, from: nodeA, to: nodeB };
    const next = baseGraph.withEdge(newEdge);
    expect(next).not.toBe(baseGraph);
    expect(next.edges.length).toBe(1);
    expect(baseGraph.edges.length).toBe(0);
  });

  it('should return a new graph without a node via withoutNode', () => {
    const next = baseGraph.withoutNode(nodeA);
    expect(next).not.toBe(baseGraph);
    expect(next.nodes.length).toBe(0);
    expect(baseGraph.nodes.length).toBe(1);
  });

  it('should remove related edges when removing a node', () => {
    const edge = { id: edgeAB, kind: ArchitectureEdgeKind.DependsOn, from: nodeA, to: nodeB };
    const withEdge = baseGraph.withEdge(edge);
    const next = withEdge.withoutNode(nodeA);
    expect(next.edges.length).toBe(0);
    expect(withEdge.edges.length).toBe(1);
  });

  it('should return a new graph without an edge via withoutEdge', () => {
    const edge = { id: edgeAB, kind: ArchitectureEdgeKind.DependsOn, from: nodeA, to: nodeB };
    const withEdge = baseGraph.withEdge(edge);
    const next = withEdge.withoutEdge(edgeAB);
    expect(next).not.toBe(withEdge);
    expect(next.edges.length).toBe(0);
    expect(withEdge.edges.length).toBe(1);
  });

  it('should leave original graph unchanged after withNode', () => {
    const newNode = { id: nodeB, kind: ArchitectureNodeKind.Service, name: 'B', layer: layerId };
    baseGraph.withNode(newNode);
    expect(baseGraph.nodes.length).toBe(1);
  });

  it('should leave original graph unchanged after withEdge', () => {
    const newEdge = { id: edgeAB, kind: ArchitectureEdgeKind.DependsOn, from: nodeA, to: nodeB };
    baseGraph.withEdge(newEdge);
    expect(baseGraph.edges.length).toBe(0);
  });

  it('should leave original graph unchanged after withoutNode', () => {
    baseGraph.withoutNode(nodeA);
    expect(baseGraph.nodes.length).toBe(1);
  });

  it('should leave original graph unchanged after withoutEdge', () => {
    const edge = { id: edgeAB, kind: ArchitectureEdgeKind.DependsOn, from: nodeA, to: nodeB };
    const withEdge = baseGraph.withEdge(edge);
    withEdge.withoutEdge(edgeAB);
    expect(withEdge.edges.length).toBe(1);
  });

  it('should expose all four methods on the public API', () => {
    expect(typeof baseGraph.withNode).toBe('function');
    expect(typeof baseGraph.withEdge).toBe('function');
    expect(typeof baseGraph.withoutNode).toBe('function');
    expect(typeof baseGraph.withoutEdge).toBe('function');
  });
});
