/**
 * Autonomous Architecture Runtime — Architecture Graph Container Smoke Tests
 * TASK-AIS-012A.003
 */

import { describe, it, expect } from 'vitest';
import { ArchitectureGraph } from '../../../core/autonomous-architecture/architecture.graph.js';
import {
  ArchitectureNodeKind,
  ArchitectureEdgeKind,
  ArchitectureLayerKind,
  type ArchitectureGraphModel,
  type ArchitectureNodeId,
  type ArchitectureEdgeId,
  type ArchitectureLayerId,
} from '../../../core/autonomous-architecture/index.js';

describe('ArchitectureGraph', () => {
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

  it('should construct with a model', () => {
    const graph = new ArchitectureGraph(model);
    expect(graph).toBeInstanceOf(ArchitectureGraph);
  });

  it('should return the model via getter', () => {
    const graph = new ArchitectureGraph(model);
    expect(graph.model).toBe(model);
  });

  it('should return layers via getter', () => {
    const graph = new ArchitectureGraph(model);
    expect(graph.layers).toBe(model.layers);
    expect(graph.layers.length).toBe(1);
  });

  it('should return nodes via getter', () => {
    const graph = new ArchitectureGraph(model);
    expect(graph.nodes).toBe(model.nodes);
    expect(graph.nodes.length).toBe(1);
  });

  it('should return edges via getter', () => {
    const graph = new ArchitectureGraph(model);
    expect(graph.edges).toBe(model.edges);
    expect(graph.edges.length).toBe(1);
  });

  it('should return the same reference on repeated access', () => {
    const graph = new ArchitectureGraph(model);
    expect(graph.model).toBe(graph.model);
    expect(graph.layers).toBe(graph.layers);
    expect(graph.nodes).toBe(graph.nodes);
    expect(graph.edges).toBe(graph.edges);
  });

  it('should return the original readonly reference, not a copy', () => {
    const graph = new ArchitectureGraph(model);
    expect(graph.model).toBe(model);
    expect(graph.layers).toBe(model.layers);
    expect(graph.nodes).toBe(model.nodes);
    expect(graph.edges).toBe(model.edges);
  });

  it('should be exported from the module', () => {
    expect(ArchitectureGraph).toBeDefined();
    expect(typeof ArchitectureGraph).toBe('function');
  });
});
