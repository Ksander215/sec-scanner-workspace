/**
 * Autonomous Architecture Runtime — Architecture Graph Validation Foundation Smoke Tests
 * TASK-AIS-012A.007
 */

import { describe, it, expect } from 'vitest';
import { ArchitectureGraph } from '../../../core/autonomous-architecture/architecture.graph.js';
import {
  ArchitectureGraphValidator,
  type ArchitectureGraphValidationResult,
} from '../../../core/autonomous-architecture/architecture.graph-validator.js';
import {
  ArchitectureNodeKind,
  ArchitectureEdgeKind,
  ArchitectureLayerKind,
  type ArchitectureNodeId,
  type ArchitectureEdgeId,
  type ArchitectureLayerId,
} from '../../../core/autonomous-architecture/index.js';

describe('ArchitectureGraphValidator', () => {
  const layerId = 'layer-core' as ArchitectureLayerId;
  const nodeA = 'node-a' as ArchitectureNodeId;
  const nodeB = 'node-b' as ArchitectureNodeId;
  const edgeAB = 'edge-ab' as ArchitectureEdgeId;

  const validGraph = new ArchitectureGraph({
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
    const validator = new ArchitectureGraphValidator(validGraph);
    expect(validator).toBeInstanceOf(ArchitectureGraphValidator);
  });

  it('should fail node existence validation for empty graph', () => {
    const empty = new ArchitectureGraph({ layers: [], nodes: [], edges: [] });
    const validator = new ArchitectureGraphValidator(empty);
    expect(validator.validateNodesExist()).toBe(false);
  });

  it('should pass node existence validation for graph with nodes', () => {
    const validator = new ArchitectureGraphValidator(validGraph);
    expect(validator.validateNodesExist()).toBe(true);
  });

  it('should detect duplicate node ids', () => {
    const dup = new ArchitectureGraph({
      layers: [],
      nodes: [
        { id: nodeA, kind: ArchitectureNodeKind.Service, name: 'A1', layer: layerId },
        { id: nodeA, kind: ArchitectureNodeKind.Service, name: 'A2', layer: layerId },
      ],
      edges: [],
    });
    const validator = new ArchitectureGraphValidator(dup);
    expect(validator.validateUniqueNodeIds()).toBe(false);
  });

  it('should detect duplicate edge ids', () => {
    const dup = new ArchitectureGraph({
      layers: [],
      nodes: [
        { id: nodeA, kind: ArchitectureNodeKind.Service, name: 'A', layer: layerId },
        { id: nodeB, kind: ArchitectureNodeKind.Service, name: 'B', layer: layerId },
      ],
      edges: [
        { id: edgeAB, kind: ArchitectureEdgeKind.DependsOn, from: nodeA, to: nodeB },
        { id: edgeAB, kind: ArchitectureEdgeKind.DependsOn, from: nodeB, to: nodeA },
      ],
    });
    const validator = new ArchitectureGraphValidator(dup);
    expect(validator.validateUniqueEdgeIds()).toBe(false);
  });

  it('should pass endpoint validation for valid edges', () => {
    const validator = new ArchitectureGraphValidator(validGraph);
    expect(validator.validateEdgeEndpoints()).toBe(true);
  });

  it('should fail endpoint validation for invalid from', () => {
    const bad = new ArchitectureGraph({
      layers: [],
      nodes: [{ id: nodeA, kind: ArchitectureNodeKind.Service, name: 'A', layer: layerId }],
      edges: [
        { id: edgeAB, kind: ArchitectureEdgeKind.DependsOn, from: 'missing' as ArchitectureNodeId, to: nodeA },
      ],
    });
    const validator = new ArchitectureGraphValidator(bad);
    expect(validator.validateEdgeEndpoints()).toBe(false);
  });

  it('should fail endpoint validation for invalid to', () => {
    const bad = new ArchitectureGraph({
      layers: [],
      nodes: [{ id: nodeA, kind: ArchitectureNodeKind.Service, name: 'A', layer: layerId }],
      edges: [
        { id: edgeAB, kind: ArchitectureEdgeKind.DependsOn, from: nodeA, to: 'missing' as ArchitectureNodeId },
      ],
    });
    const validator = new ArchitectureGraphValidator(bad);
    expect(validator.validateEdgeEndpoints()).toBe(false);
  });

  it('should return valid=true for a valid graph', () => {
    const validator = new ArchitectureGraphValidator(validGraph);
    const result = validator.validate();
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should return expected error messages for an invalid graph', () => {
    const empty = new ArchitectureGraph({ layers: [], nodes: [], edges: [] });
    const validator = new ArchitectureGraphValidator(empty);
    const result = validator.validate();
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Graph contains no nodes');
  });

  it('should never modify the graph during validation', () => {
    const before = validGraph.nodes.length;
    const validator = new ArchitectureGraphValidator(validGraph);
    validator.validate();
    expect(validGraph.nodes.length).toBe(before);
  });

  it('should be exported from the module', () => {
    expect(ArchitectureGraphValidator).toBeDefined();
    expect(typeof ArchitectureGraphValidator).toBe('function');
  });
});
