/**
 * Autonomous Architecture Runtime — Architecture Graph Analysis Foundation Smoke Tests
 * TASK-AIS-012A.006
 */

import { describe, it, expect } from 'vitest';
import { ArchitectureGraph } from '../../../core/autonomous-architecture/architecture.graph.js';
import { ArchitectureGraphAnalysis } from '../../../core/autonomous-architecture/architecture.graph-analysis.js';
import {
  ArchitectureNodeKind,
  ArchitectureEdgeKind,
  ArchitectureLayerKind,
  type ArchitectureNodeId,
  type ArchitectureEdgeId,
  type ArchitectureLayerId,
} from '../../../core/autonomous-architecture/index.js';

describe('ArchitectureGraphAnalysis', () => {
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

  it('should construct with a graph', () => {
    const analysis = new ArchitectureGraphAnalysis(graph);
    expect(analysis).toBeInstanceOf(ArchitectureGraphAnalysis);
  });

  it('should return layer count', () => {
    const analysis = new ArchitectureGraphAnalysis(graph);
    expect(analysis.getLayerCount()).toBe(1);
  });

  it('should return node count', () => {
    const analysis = new ArchitectureGraphAnalysis(graph);
    expect(analysis.getNodeCount()).toBe(2);
  });

  it('should return edge count', () => {
    const analysis = new ArchitectureGraphAnalysis(graph);
    expect(analysis.getEdgeCount()).toBe(1);
  });

  it('should return zero counts for an empty graph', () => {
    const empty = new ArchitectureGraph({ layers: [], nodes: [], edges: [] });
    const analysis = new ArchitectureGraphAnalysis(empty);
    expect(analysis.getLayerCount()).toBe(0);
    expect(analysis.getNodeCount()).toBe(0);
    expect(analysis.getEdgeCount()).toBe(0);
  });

  it('should return node kind distribution', () => {
    const analysis = new ArchitectureGraphAnalysis(graph);
    const dist = analysis.getNodeKindDistribution();
    expect(dist[ArchitectureNodeKind.Service]).toBe(1);
    expect(dist[ArchitectureNodeKind.Module]).toBe(1);
  });

  it('should return edge kind distribution', () => {
    const analysis = new ArchitectureGraphAnalysis(graph);
    const dist = analysis.getEdgeKindDistribution();
    expect(dist[ArchitectureEdgeKind.DependsOn]).toBe(1);
  });

  it('should initialize missing enum values to zero', () => {
    const analysis = new ArchitectureGraphAnalysis(graph);
    const nodeDist = analysis.getNodeKindDistribution();
    expect(nodeDist[ArchitectureNodeKind.Runtime]).toBe(0);
    const edgeDist = analysis.getEdgeKindDistribution();
    expect(edgeDist[ArchitectureEdgeKind.Composes]).toBe(0);
  });

  it('should compute density correctly', () => {
    const analysis = new ArchitectureGraphAnalysis(graph);
    // 1 edge / (2 nodes * 1) = 0.5
    expect(analysis.getDensity()).toBe(0.5);
  });

  it('should return zero density for one node', () => {
    const single = new ArchitectureGraph({
      layers: [],
      nodes: [{ id: nodeA, kind: ArchitectureNodeKind.Service, name: 'A', layer: layerId }],
      edges: [],
    });
    const analysis = new ArchitectureGraphAnalysis(single);
    expect(analysis.getDensity()).toBe(0);
  });

  it('should never modify the graph', () => {
    const analysis = new ArchitectureGraphAnalysis(graph);
    analysis.getNodeCount();
    analysis.getNodeKindDistribution();
    analysis.getDensity();
    expect(graph.nodes.length).toBe(2);
    expect(graph.edges.length).toBe(1);
  });

  it('should be exported from the module', () => {
    expect(ArchitectureGraphAnalysis).toBeDefined();
    expect(typeof ArchitectureGraphAnalysis).toBe('function');
  });
});
