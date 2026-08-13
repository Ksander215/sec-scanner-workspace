/**
 * Autonomous Architecture Runtime — Architecture Graph Query API Smoke Tests
 * TASK-AIS-012A.005
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

describe('ArchitectureGraph query API', () => {
  const layerId = 'layer-core' as ArchitectureLayerId;
  const nodeA = 'node-a' as ArchitectureNodeId;
  const nodeB = 'node-b' as ArchitectureNodeId;
  const edgeAB = 'edge-ab' as ArchitectureEdgeId;
  const edgeBA = 'edge-ba' as ArchitectureEdgeId;

  const graph = new ArchitectureGraph({
    layers: [{ id: layerId, kind: ArchitectureLayerKind.Core, name: 'Core' }],
    nodes: [
      { id: nodeA, kind: ArchitectureNodeKind.Service, name: 'A', layer: layerId },
      { id: nodeB, kind: ArchitectureNodeKind.Module, name: 'B', layer: layerId },
    ],
    edges: [
      { id: edgeAB, kind: ArchitectureEdgeKind.DependsOn, from: nodeA, to: nodeB },
      { id: edgeBA, kind: ArchitectureEdgeKind.CommunicatesWith, from: nodeB, to: nodeA },
    ],
  });

  it('should find an existing node by id', () => {
    const found = graph.findNode(nodeA);
    expect(found).toBeDefined();
    expect(found?.name).toBe('A');
  });

  it('should return undefined for a missing node', () => {
    const found = graph.findNode('missing' as ArchitectureNodeId);
    expect(found).toBeUndefined();
  });

  it('should find an existing edge by id', () => {
    const found = graph.findEdge(edgeAB);
    expect(found).toBeDefined();
    expect(found?.kind).toBe(ArchitectureEdgeKind.DependsOn);
  });

  it('should return undefined for a missing edge', () => {
    const found = graph.findEdge('missing' as ArchitectureEdgeId);
    expect(found).toBeUndefined();
  });

  it('should filter nodes by kind', () => {
    const services = graph.getNodesByKind(ArchitectureNodeKind.Service);
    expect(services.length).toBe(1);
    expect(services[0].id).toBe(nodeA);
  });

  it('should filter edges by kind', () => {
    const depends = graph.getEdgesByKind(ArchitectureEdgeKind.DependsOn);
    expect(depends.length).toBe(1);
    expect(depends[0].id).toBe(edgeAB);
  });

  it('should return only outgoing edges for a node', () => {
    const outgoing = graph.getOutgoingEdges(nodeA);
    expect(outgoing.length).toBe(1);
    expect(outgoing[0].id).toBe(edgeAB);
  });

  it('should return only incoming edges for a node', () => {
    const incoming = graph.getIncomingEdges(nodeA);
    expect(incoming.length).toBe(1);
    expect(incoming[0].id).toBe(edgeBA);
  });

  it('should never modify the graph during queries', () => {
    const before = graph.nodes.length;
    graph.findNode(nodeA);
    graph.getNodesByKind(ArchitectureNodeKind.Service);
    graph.getOutgoingEdges(nodeA);
    graph.getIncomingEdges(nodeA);
    expect(graph.nodes.length).toBe(before);
  });

  it('should expose all six query methods on the public API', () => {
    expect(typeof graph.findNode).toBe('function');
    expect(typeof graph.findEdge).toBe('function');
    expect(typeof graph.getNodesByKind).toBe('function');
    expect(typeof graph.getEdgesByKind).toBe('function');
    expect(typeof graph.getOutgoingEdges).toBe('function');
    expect(typeof graph.getIncomingEdges).toBe('function');
  });
});
