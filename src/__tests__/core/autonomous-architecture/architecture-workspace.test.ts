/**
 * Autonomous Architecture Runtime — Architecture Workspace Smoke Tests
 * TASK-AIS-012A.016
 */

import { describe, it, expect } from 'vitest';
import { ArchitectureWorkspace } from '../../../core/autonomous-architecture/services/architecture.workspace.js';
import {
  ArchitectureGraph,
  ArchitectureGraphValidator,
  ArchitectureGraphAnalysis,
  ArchitectureGraphBuilder,
  ArchitectureNodeKind,
  ArchitectureEdgeKind,
  ArchitectureLayerKind,
  type ArchitectureGraphModel,
  type ArchitectureNodeId,
  type ArchitectureEdgeId,
  type ArchitectureLayerId,
} from '../../../core/autonomous-architecture/index.js';

describe('ArchitectureWorkspace', () => {
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

  it('should construct with graph, validator, and analysis', () => {
    const graph = new ArchitectureGraph(model);
    const validator = new ArchitectureGraphValidator(graph);
    const analysis = new ArchitectureGraphAnalysis(graph);
    const workspace = new ArchitectureWorkspace(graph, validator, analysis);
    expect(workspace).toBeInstanceOf(ArchitectureWorkspace);
  });

  it('should return graph via getGraph', () => {
    const graph = new ArchitectureGraph(model);
    const validator = new ArchitectureGraphValidator(graph);
    const analysis = new ArchitectureGraphAnalysis(graph);
    const workspace = new ArchitectureWorkspace(graph, validator, analysis);
    expect(workspace.getGraph()).toBe(graph);
  });

  it('should return validator via getValidator', () => {
    const graph = new ArchitectureGraph(model);
    const validator = new ArchitectureGraphValidator(graph);
    const analysis = new ArchitectureGraphAnalysis(graph);
    const workspace = new ArchitectureWorkspace(graph, validator, analysis);
    expect(workspace.getValidator()).toBe(validator);
  });

  it('should return analysis via getAnalysis', () => {
    const graph = new ArchitectureGraph(model);
    const validator = new ArchitectureGraphValidator(graph);
    const analysis = new ArchitectureGraphAnalysis(graph);
    const workspace = new ArchitectureWorkspace(graph, validator, analysis);
    expect(workspace.getAnalysis()).toBe(analysis);
  });

  it('should return same reference on repeated getGraph calls', () => {
    const graph = new ArchitectureGraph(model);
    const validator = new ArchitectureGraphValidator(graph);
    const analysis = new ArchitectureGraphAnalysis(graph);
    const workspace = new ArchitectureWorkspace(graph, validator, analysis);
    expect(workspace.getGraph()).toBe(workspace.getGraph());
  });

  it('should return same reference on repeated getValidator calls', () => {
    const graph = new ArchitectureGraph(model);
    const validator = new ArchitectureGraphValidator(graph);
    const analysis = new ArchitectureGraphAnalysis(graph);
    const workspace = new ArchitectureWorkspace(graph, validator, analysis);
    expect(workspace.getValidator()).toBe(workspace.getValidator());
  });

  it('should return same reference on repeated getAnalysis calls', () => {
    const graph = new ArchitectureGraph(model);
    const validator = new ArchitectureGraphValidator(graph);
    const analysis = new ArchitectureGraphAnalysis(graph);
    const workspace = new ArchitectureWorkspace(graph, validator, analysis);
    expect(workspace.getAnalysis()).toBe(workspace.getAnalysis());
  });

  it('should support empty graph', () => {
    const emptyModel: ArchitectureGraphModel = {
      layers: [],
      nodes: [],
      edges: [],
    };
    const graph = new ArchitectureGraph(emptyModel);
    const validator = new ArchitectureGraphValidator(graph);
    const analysis = new ArchitectureGraphAnalysis(graph);
    const workspace = new ArchitectureWorkspace(graph, validator, analysis);
    expect(workspace.getGraph().nodes).toHaveLength(0);
    expect(workspace.getGraph().edges).toHaveLength(0);
    expect(workspace.getGraph().layers).toHaveLength(0);
  });

  it('should hold immutable references', () => {
    const graph = new ArchitectureGraph(model);
    const validator = new ArchitectureGraphValidator(graph);
    const analysis = new ArchitectureGraphAnalysis(graph);
    const workspace = new ArchitectureWorkspace(graph, validator, analysis);
    const g1 = workspace.getGraph();
    const g2 = workspace.getGraph();
    expect(g1).toBe(g2);
    expect(g1.model).toBe(g2.model);
  });

  it('should have no side effects on getter calls', () => {
    const graph = new ArchitectureGraph(model);
    const validator = new ArchitectureGraphValidator(graph);
    const analysis = new ArchitectureGraphAnalysis(graph);
    const workspace = new ArchitectureWorkspace(graph, validator, analysis);
    const before = workspace.getGraph().nodes.length;
    workspace.getGraph();
    workspace.getValidator();
    workspace.getAnalysis();
    const after = workspace.getGraph().nodes.length;
    expect(after).toBe(before);
  });

  it('should be publicly exported', () => {
    expect(ArchitectureWorkspace).toBeDefined();
    expect(typeof ArchitectureWorkspace).toBe('function');
  });
});
