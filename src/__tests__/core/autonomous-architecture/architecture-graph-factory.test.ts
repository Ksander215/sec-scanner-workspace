/**
 * Autonomous Architecture Runtime — Architecture Graph Factory Smoke Tests
 * TASK-AIS-012A.015
 */

import { describe, it, expect } from 'vitest';
import { ArchitectureGraphFactory } from '../../../core/autonomous-architecture/services/architecture.graph-factory.js';
import { ArchitectureGraphBuilder } from '../../../core/autonomous-architecture/services/architecture.graph-builder.js';
import {
  ArchitectureNodeKind,
  ArchitectureEdgeKind,
  ArchitectureLayerKind,
  type ArchitectureGraphModel,
  type ArchitectureNodeId,
  type ArchitectureEdgeId,
  type ArchitectureLayerId,
} from '../../../core/autonomous-architecture/index.js';

describe('ArchitectureGraphFactory', () => {
  const layerId = 'layer-core' as ArchitectureLayerId;
  const nodeId = 'node-001' as ArchitectureNodeId;
  const edgeId = 'edge-001' as ArchitectureEdgeId;

  const model: ArchitectureGraphModel = {
    layers: [
      { id: layerId, kind: ArchitectureLayerKind.Core, name: 'Core' },
    ],
    nodes: [
      { id: nodeId, kind: ArchitectureNodeKind.Service, name: 'Auth', layer: layerId },
    ],
    edges: [
      { id: edgeId, kind: ArchitectureEdgeKind.DependsOn, from: nodeId, to: nodeId },
    ],
  };

  it('should create empty graph via createEmpty', () => {
    const factory = new ArchitectureGraphFactory();
    const graph = factory.createEmpty();
    expect(graph.layers).toHaveLength(0);
    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
  });

  it('should create graph from model via create', () => {
    const factory = new ArchitectureGraphFactory();
    const graph = factory.create(model);
    expect(graph.layers).toHaveLength(1);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(1);
  });

  it('should use original model reference in create', () => {
    const factory = new ArchitectureGraphFactory();
    const graph = factory.create(model);
    expect(graph.model).toBe(model);
    expect(graph.layers).toBe(model.layers);
    expect(graph.nodes).toBe(model.nodes);
    expect(graph.edges).toBe(model.edges);
  });

  it('should create graph from builder via fromBuilder', () => {
    const factory = new ArchitectureGraphFactory();
    const builder = new ArchitectureGraphBuilder();
    builder
      .addLayer({ id: layerId, kind: ArchitectureLayerKind.Core, name: 'Core' })
      .addNode({ id: nodeId, kind: ArchitectureNodeKind.Service, name: 'Auth', layer: layerId })
      .addEdge({ id: edgeId, kind: ArchitectureEdgeKind.DependsOn, from: nodeId, to: nodeId });

    const graph = factory.fromBuilder(builder);
    expect(graph.layers).toHaveLength(1);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(1);
  });

  it('should have no state and repeated calls are independent', () => {
    const factory = new ArchitectureGraphFactory();
    const graph1 = factory.createEmpty();
    const graph2 = factory.createEmpty();
    expect(graph1).not.toBe(graph2);
    expect(graph1.layers).toHaveLength(0);
    expect(graph2.layers).toHaveLength(0);
  });

  it('should be publicly exported', () => {
    expect(ArchitectureGraphFactory).toBeDefined();
    expect(typeof ArchitectureGraphFactory).toBe('function');
  });
});
