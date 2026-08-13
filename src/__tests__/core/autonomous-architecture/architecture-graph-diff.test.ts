/**
 * Autonomous Architecture Runtime — Architecture Graph Diff Foundation Smoke Tests
 * TASK-AIS-012A.011
 */

import { describe, it, expect } from 'vitest';
import { ArchitectureGraph } from '../../../core/autonomous-architecture/architecture.graph.js';
import { ArchitectureGraphSnapshot } from '../../../core/autonomous-architecture/services/architecture.graph-snapshot.js';
import { ArchitectureGraphDiff } from '../../../core/autonomous-architecture/services/architecture.graph-diff.js';
import {
  ArchitectureNodeKind,
  ArchitectureEdgeKind,
  ArchitectureLayerKind,
  type ArchitectureNodeId,
  type ArchitectureEdgeId,
  type ArchitectureLayerId,
} from '../../../core/autonomous-architecture/index.js';

describe('ArchitectureGraphDiff', () => {
  const layerId = 'layer-core' as ArchitectureLayerId;
  const nodeA = 'node-a' as ArchitectureNodeId;
  const nodeB = 'node-b' as ArchitectureNodeId;
  const nodeC = 'node-c' as ArchitectureNodeId;
  const edgeAB = 'edge-ab' as ArchitectureEdgeId;
  const edgeAC = 'edge-ac' as ArchitectureEdgeId;

  const baseGraph = new ArchitectureGraph({
    layers: [{ id: layerId, kind: ArchitectureLayerKind.Core, name: 'Core' }],
    nodes: [
      { id: nodeA, kind: ArchitectureNodeKind.Service, name: 'A', layer: layerId },
      { id: nodeB, kind: ArchitectureNodeKind.Module, name: 'B', layer: layerId },
    ],
    edges: [
      { id: edgeAB, kind: ArchitectureEdgeKind.DependsOn, from: nodeA, to: nodeB },
    ],
  });

  it('should create a diff from two snapshots', () => {
    const before = new ArchitectureGraphSnapshot(baseGraph);
    const after = new ArchitectureGraphSnapshot(baseGraph);
    const diff = new ArchitectureGraphDiff(before, after);
    expect(diff).toBeInstanceOf(ArchitectureGraphDiff);
  });

  it('should detect an added node', () => {
    const before = new ArchitectureGraphSnapshot(baseGraph);
    const afterGraph = baseGraph.withNode({
      id: nodeC,
      kind: ArchitectureNodeKind.Component,
      name: 'C',
      layer: layerId,
    });
    const after = new ArchitectureGraphSnapshot(afterGraph);
    const diff = new ArchitectureGraphDiff(before, after).getResult();
    expect(diff.addedNodes.length).toBe(1);
    expect(diff.addedNodes[0].id).toBe(nodeC);
    expect(diff.removedNodes.length).toBe(0);
  });

  it('should detect a removed node', () => {
    const before = new ArchitectureGraphSnapshot(baseGraph);
    const afterGraph = baseGraph.withoutNode(nodeB);
    const after = new ArchitectureGraphSnapshot(afterGraph);
    const diff = new ArchitectureGraphDiff(before, after).getResult();
    expect(diff.removedNodes.length).toBe(1);
    expect(diff.removedNodes[0].id).toBe(nodeB);
    expect(diff.addedNodes.length).toBe(0);
  });

  it('should produce empty node changes for empty graphs', () => {
    const empty = new ArchitectureGraph({ layers: [], nodes: [], edges: [] });
    const before = new ArchitectureGraphSnapshot(empty);
    const after = new ArchitectureGraphSnapshot(empty);
    const diff = new ArchitectureGraphDiff(before, after).getResult();
    expect(diff.addedNodes.length).toBe(0);
    expect(diff.removedNodes.length).toBe(0);
  });

  it('should detect an added edge', () => {
    const before = new ArchitectureGraphSnapshot(baseGraph);
    const afterGraph = baseGraph.withEdge({
      id: edgeAC,
      kind: ArchitectureEdgeKind.DependsOn,
      from: nodeA,
      to: nodeC,
    });
    const after = new ArchitectureGraphSnapshot(afterGraph);
    const diff = new ArchitectureGraphDiff(before, after).getResult();
    expect(diff.addedEdges.length).toBe(1);
    expect(diff.addedEdges[0].id).toBe(edgeAC);
    expect(diff.removedEdges.length).toBe(0);
  });

  it('should detect a removed edge', () => {
    const before = new ArchitectureGraphSnapshot(baseGraph);
    const afterGraph = baseGraph.withoutEdge(edgeAB);
    const after = new ArchitectureGraphSnapshot(afterGraph);
    const diff = new ArchitectureGraphDiff(before, after).getResult();
    expect(diff.removedEdges.length).toBe(1);
    expect(diff.removedEdges[0].id).toBe(edgeAB);
    expect(diff.addedEdges.length).toBe(0);
  });

  it('should produce empty edge changes for empty graphs', () => {
    const empty = new ArchitectureGraph({ layers: [], nodes: [], edges: [] });
    const before = new ArchitectureGraphSnapshot(empty);
    const after = new ArchitectureGraphSnapshot(empty);
    const diff = new ArchitectureGraphDiff(before, after).getResult();
    expect(diff.addedEdges.length).toBe(0);
    expect(diff.removedEdges.length).toBe(0);
  });

  it('should produce empty diff for identical snapshots', () => {
    const before = new ArchitectureGraphSnapshot(baseGraph);
    const after = new ArchitectureGraphSnapshot(baseGraph);
    const diff = new ArchitectureGraphDiff(before, after).getResult();
    expect(diff.addedNodes.length).toBe(0);
    expect(diff.removedNodes.length).toBe(0);
    expect(diff.addedEdges.length).toBe(0);
    expect(diff.removedEdges.length).toBe(0);
  });

  it('should not modify original graphs', () => {
    const before = new ArchitectureGraphSnapshot(baseGraph);
    const afterGraph = baseGraph.withNode({
      id: nodeC,
      kind: ArchitectureNodeKind.Component,
      name: 'C',
      layer: layerId,
    });
    const after = new ArchitectureGraphSnapshot(afterGraph);
    const beforeCount = baseGraph.nodes.length;
    const afterCount = afterGraph.nodes.length;
    new ArchitectureGraphDiff(before, after).getResult();
    expect(baseGraph.nodes.length).toBe(beforeCount);
    expect(afterGraph.nodes.length).toBe(afterCount);
  });

  it('should return equal immutable data on multiple getResult() calls', () => {
    const before = new ArchitectureGraphSnapshot(baseGraph);
    const afterGraph = baseGraph.withNode({
      id: nodeC,
      kind: ArchitectureNodeKind.Component,
      name: 'C',
      layer: layerId,
    });
    const after = new ArchitectureGraphSnapshot(afterGraph);
    const diff = new ArchitectureGraphDiff(before, after);
    const result1 = diff.getResult();
    const result2 = diff.getResult();
    expect(result1.addedNodes.length).toBe(result2.addedNodes.length);
    expect(result1.removedNodes.length).toBe(result2.removedNodes.length);
  });

  it('should expose the class and result interface as public exports', () => {
    expect(ArchitectureGraphDiff).toBeDefined();
    expect(typeof ArchitectureGraphDiff).toBe('function');
  });

  it('should return a result with all four collections', () => {
    const before = new ArchitectureGraphSnapshot(baseGraph);
    const after = new ArchitectureGraphSnapshot(baseGraph);
    const diff = new ArchitectureGraphDiff(before, after).getResult();
    expect(Array.isArray(diff.addedNodes)).toBe(true);
    expect(Array.isArray(diff.removedNodes)).toBe(true);
    expect(Array.isArray(diff.addedEdges)).toBe(true);
    expect(Array.isArray(diff.removedEdges)).toBe(true);
  });
});
