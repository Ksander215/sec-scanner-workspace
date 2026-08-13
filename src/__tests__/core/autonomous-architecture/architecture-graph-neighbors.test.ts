/**
 * Autonomous Architecture Runtime — Architecture Graph Neighbor API Smoke Tests
 * TASK-AIS-012A.008
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

describe('ArchitectureGraph neighbor API', () => {
  const layerId = 'layer-core' as ArchitectureLayerId;
  const nodeA = 'node-a' as ArchitectureNodeId;
  const nodeB = 'node-b' as ArchitectureNodeId;
  const nodeC = 'node-c' as ArchitectureNodeId;
  const edgeAB = 'edge-ab' as ArchitectureEdgeId;
  const edgeBA = 'edge-ba' as ArchitectureEdgeId;
  const edgeAC = 'edge-ac' as ArchitectureEdgeId;

  const graph = new ArchitectureGraph({
    layers: [{ id: layerId, kind: ArchitectureLayerKind.Core, name: 'Core' }],
    nodes: [
      { id: nodeA, kind: ArchitectureNodeKind.Service, name: 'A', layer: layerId },
      { id: nodeB, kind: ArchitectureNodeKind.Module, name: 'B', layer: layerId },
      { id: nodeC, kind: ArchitectureNodeKind.Component, name: 'C', layer: layerId },
    ],
    edges: [
      { id: edgeAB, kind: ArchitectureEdgeKind.DependsOn, from: nodeA, to: nodeB },
      { id: edgeBA, kind: ArchitectureEdgeKind.CommunicatesWith, from: nodeB, to: nodeA },
      { id: edgeAC, kind: ArchitectureEdgeKind.DependsOn, from: nodeA, to: nodeC },
    ],
  });

  it('should return outgoing neighbors', () => {
    const neighbors = graph.getOutgoingNeighbors(nodeA);
    expect(neighbors.length).toBe(2);
    expect(neighbors[0].id).toBe(nodeB);
    expect(neighbors[1].id).toBe(nodeC);
  });

  it('should return incoming neighbors', () => {
    const neighbors = graph.getIncomingNeighbors(nodeA);
    expect(neighbors.length).toBe(1);
    expect(neighbors[0].id).toBe(nodeB);
  });

  it('should return combined neighbors', () => {
    const neighbors = graph.getNeighbors(nodeA);
    expect(neighbors.length).toBe(2);
    expect(neighbors[0].id).toBe(nodeB);
    expect(neighbors[1].id).toBe(nodeC);
  });

  it('should remove duplicate nodes in combined neighbors', () => {
    // nodeB is both outgoing and incoming neighbor of nodeA
    // But getNeighbors should return unique nodes only
    const neighbors = graph.getNeighbors(nodeA);
    const ids = neighbors.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should return empty array for missing node', () => {
    expect(graph.getOutgoingNeighbors('missing' as ArchitectureNodeId)).toEqual([]);
    expect(graph.getIncomingNeighbors('missing' as ArchitectureNodeId)).toEqual([]);
    expect(graph.getNeighbors('missing' as ArchitectureNodeId)).toEqual([]);
  });

  it('should return empty array for empty graph', () => {
    const empty = new ArchitectureGraph({ layers: [], nodes: [], edges: [] });
    expect(empty.getOutgoingNeighbors(nodeA)).toEqual([]);
    expect(empty.getIncomingNeighbors(nodeA)).toEqual([]);
    expect(empty.getNeighbors(nodeA)).toEqual([]);
  });

  it('should maintain outgoing order', () => {
    const neighbors = graph.getOutgoingNeighbors(nodeA);
    expect(neighbors[0].name).toBe('B');
    expect(neighbors[1].name).toBe('C');
  });

  it('should maintain incoming order', () => {
    const neighbors = graph.getIncomingNeighbors(nodeA);
    expect(neighbors[0].name).toBe('B');
  });

  it('should never modify the graph', () => {
    const before = graph.nodes.length;
    graph.getOutgoingNeighbors(nodeA);
    graph.getIncomingNeighbors(nodeA);
    graph.getNeighbors(nodeA);
    expect(graph.nodes.length).toBe(before);
  });

  it('should return readonly arrays', () => {
    const outgoing = graph.getOutgoingNeighbors(nodeA);
    const incoming = graph.getIncomingNeighbors(nodeA);
    const combined = graph.getNeighbors(nodeA);
    expect(Array.isArray(outgoing)).toBe(true);
    expect(Array.isArray(incoming)).toBe(true);
    expect(Array.isArray(combined)).toBe(true);
  });

  it('should expose all three neighbor methods on the public API', () => {
    expect(typeof graph.getNeighbors).toBe('function');
    expect(typeof graph.getOutgoingNeighbors).toBe('function');
    expect(typeof graph.getIncomingNeighbors).toBe('function');
  });

  it('should export ArchitectureGraph from the module', () => {
    expect(ArchitectureGraph).toBeDefined();
    expect(typeof ArchitectureGraph).toBe('function');
  });
});
