/**
 * Autonomous Architecture Runtime — Architecture Graph Builder Smoke Tests
 * TASK-AIS-012A.013
 */

import { describe, it, expect } from 'vitest';
import { ArchitectureGraphBuilder } from '../../../core/autonomous-architecture/services/architecture.graph-builder.js';
import {
  ArchitectureNodeKind,
  ArchitectureEdgeKind,
  ArchitectureLayerKind,
  type ArchitectureNodeId,
  type ArchitectureEdgeId,
  type ArchitectureLayerId,
} from '../../../core/autonomous-architecture/index.js';

describe('ArchitectureGraphBuilder', () => {
  const layerId = 'layer-core' as ArchitectureLayerId;
  const nodeId = 'node-001' as ArchitectureNodeId;
  const edgeId = 'edge-001' as ArchitectureEdgeId;

  // ─── Construction ───────────────────────────────────────────────

  it('should create builder', () => {
    const builder = new ArchitectureGraphBuilder();
    expect(builder).toBeInstanceOf(ArchitectureGraphBuilder);
  });

  it('should create empty graph from empty builder', () => {
    const builder = new ArchitectureGraphBuilder();
    const graph = builder.build();
    expect(graph.layers).toHaveLength(0);
    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
  });

  // ─── Layers ─────────────────────────────────────────────────────

  it('should store layer via addLayer', () => {
    const builder = new ArchitectureGraphBuilder();
    builder.addLayer({ id: layerId, kind: ArchitectureLayerKind.Core, name: 'Core' });
    const graph = builder.build();
    expect(graph.layers).toHaveLength(1);
    expect(graph.layers[0].name).toBe('Core');
  });

  it('should preserve multiple layers', () => {
    const builder = new ArchitectureGraphBuilder();
    const layerId2 = 'layer-app' as ArchitectureLayerId;
    builder
      .addLayer({ id: layerId, kind: ArchitectureLayerKind.Core, name: 'Core' })
      .addLayer({ id: layerId2, kind: ArchitectureLayerKind.Application, name: 'App' });
    const graph = builder.build();
    expect(graph.layers).toHaveLength(2);
  });

  // ─── Nodes ──────────────────────────────────────────────────────

  it('should store node via addNode', () => {
    const builder = new ArchitectureGraphBuilder();
    builder.addNode({ id: nodeId, kind: ArchitectureNodeKind.Service, name: 'Auth', layer: layerId });
    const graph = builder.build();
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].name).toBe('Auth');
  });

  it('should preserve multiple nodes', () => {
    const builder = new ArchitectureGraphBuilder();
    const nodeId2 = 'node-002' as ArchitectureNodeId;
    builder
      .addNode({ id: nodeId, kind: ArchitectureNodeKind.Service, name: 'Auth', layer: layerId })
      .addNode({ id: nodeId2, kind: ArchitectureNodeKind.Module, name: 'Users', layer: layerId });
    const graph = builder.build();
    expect(graph.nodes).toHaveLength(2);
  });

  // ─── Edges ──────────────────────────────────────────────────────

  it('should store edge via addEdge', () => {
    const builder = new ArchitectureGraphBuilder();
    builder.addEdge({ id: edgeId, kind: ArchitectureEdgeKind.DependsOn, from: nodeId, to: nodeId });
    const graph = builder.build();
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].kind).toBe(ArchitectureEdgeKind.DependsOn);
  });

  it('should preserve multiple edges', () => {
    const builder = new ArchitectureGraphBuilder();
    const edgeId2 = 'edge-002' as ArchitectureEdgeId;
    builder
      .addEdge({ id: edgeId, kind: ArchitectureEdgeKind.DependsOn, from: nodeId, to: nodeId })
      .addEdge({ id: edgeId2, kind: ArchitectureEdgeKind.Uses, from: nodeId, to: nodeId });
    const graph = builder.build();
    expect(graph.edges).toHaveLength(2);
  });

  // ─── Build ──────────────────────────────────────────────────────

  it('should return ArchitectureGraph from build', () => {
    const builder = new ArchitectureGraphBuilder();
    const graph = builder.build();
    expect(graph).toBeDefined();
    expect(graph.layers).toBeDefined();
    expect(graph.nodes).toBeDefined();
    expect(graph.edges).toBeDefined();
  });

  it('should create different graph instances on multiple builds', () => {
    const builder = new ArchitectureGraphBuilder();
    builder.addLayer({ id: layerId, kind: ArchitectureLayerKind.Core, name: 'Core' });
    const graph1 = builder.build();
    const graph2 = builder.build();
    expect(graph1).not.toBe(graph2);
    expect(graph1.layers).toBe(graph2.layers);
  });

  // ─── Fluent API ─────────────────────────────────────────────────

  it('should return builder instance from addLayer/addNode/addEdge', () => {
    const builder = new ArchitectureGraphBuilder();
    const afterLayer = builder.addLayer({ id: layerId, kind: ArchitectureLayerKind.Core, name: 'Core' });
    const afterNode = builder.addNode({ id: nodeId, kind: ArchitectureNodeKind.Service, name: 'Auth', layer: layerId });
    const afterEdge = builder.addEdge({ id: edgeId, kind: ArchitectureEdgeKind.DependsOn, from: nodeId, to: nodeId });
    expect(afterLayer).toBe(builder);
    expect(afterNode).toBe(builder);
    expect(afterEdge).toBe(builder);
  });

  // ─── Fluent chain ───────────────────────────────────────────────

  it('should support fluent chaining', () => {
    const builder = new ArchitectureGraphBuilder();
    const graph = builder
      .addLayer({ id: layerId, kind: ArchitectureLayerKind.Core, name: 'Core' })
      .addNode({ id: nodeId, kind: ArchitectureNodeKind.Service, name: 'Auth', layer: layerId })
      .addEdge({ id: edgeId, kind: ArchitectureEdgeKind.DependsOn, from: nodeId, to: nodeId })
      .build();
    expect(graph.layers).toHaveLength(1);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(1);
  });

  // ─── Export ─────────────────────────────────────────────────────

  it('should be publicly exported', () => {
    expect(ArchitectureGraphBuilder).toBeDefined();
    expect(typeof ArchitectureGraphBuilder).toBe('function');
  });
});
