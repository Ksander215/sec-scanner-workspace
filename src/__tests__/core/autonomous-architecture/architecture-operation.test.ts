/**
 * Autonomous Architecture Runtime — Architecture Operation Smoke Tests
 * TASK-AIS-012A.017
 */

import { describe, it, expect } from 'vitest';
import { ArchitectureOperation } from '../../../core/autonomous-architecture/services/architecture.operation.js';
import {
  ArchitectureGraph,
  ArchitectureGraphSnapshot,
  ArchitectureChangeSet,
  ArchitectureGraphDiff,
  ArchitectureNodeKind,
  ArchitectureEdgeKind,
  ArchitectureLayerKind,
  type ArchitectureGraphModel,
  type ArchitectureNodeId,
  type ArchitectureEdgeId,
  type ArchitectureLayerId,
} from '../../../core/autonomous-architecture/index.js';

describe('ArchitectureOperation', () => {
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

  const emptyModel: ArchitectureGraphModel = {
    layers: [],
    nodes: [],
    edges: [],
  };

  it('should construct with before, after, and changes', () => {
    const graph = new ArchitectureGraph(model);
    const before = new ArchitectureGraphSnapshot(graph);
    const after = new ArchitectureGraphSnapshot(graph);
    const diff = new ArchitectureGraphDiff(before, after);
    const changes = new ArchitectureChangeSet(diff.getResult());
    const operation = new ArchitectureOperation(before, after, changes);
    expect(operation).toBeInstanceOf(ArchitectureOperation);
  });

  it('should return before snapshot via getBeforeSnapshot', () => {
    const graph = new ArchitectureGraph(model);
    const before = new ArchitectureGraphSnapshot(graph);
    const after = new ArchitectureGraphSnapshot(graph);
    const diff = new ArchitectureGraphDiff(before, after);
    const changes = new ArchitectureChangeSet(diff.getResult());
    const operation = new ArchitectureOperation(before, after, changes);
    expect(operation.getBeforeSnapshot()).toBe(before);
  });

  it('should return after snapshot via getAfterSnapshot', () => {
    const graph = new ArchitectureGraph(model);
    const before = new ArchitectureGraphSnapshot(graph);
    const after = new ArchitectureGraphSnapshot(graph);
    const diff = new ArchitectureGraphDiff(before, after);
    const changes = new ArchitectureChangeSet(diff.getResult());
    const operation = new ArchitectureOperation(before, after, changes);
    expect(operation.getAfterSnapshot()).toBe(after);
  });

  it('should return change set via getChangeSet', () => {
    const graph = new ArchitectureGraph(model);
    const before = new ArchitectureGraphSnapshot(graph);
    const after = new ArchitectureGraphSnapshot(graph);
    const diff = new ArchitectureGraphDiff(before, after);
    const changes = new ArchitectureChangeSet(diff.getResult());
    const operation = new ArchitectureOperation(before, after, changes);
    expect(operation.getChangeSet()).toBe(changes);
  });

  it('should return same reference on repeated getBeforeSnapshot calls', () => {
    const graph = new ArchitectureGraph(model);
    const before = new ArchitectureGraphSnapshot(graph);
    const after = new ArchitectureGraphSnapshot(graph);
    const diff = new ArchitectureGraphDiff(before, after);
    const changes = new ArchitectureChangeSet(diff.getResult());
    const operation = new ArchitectureOperation(before, after, changes);
    expect(operation.getBeforeSnapshot()).toBe(operation.getBeforeSnapshot());
  });

  it('should return same reference on repeated getAfterSnapshot calls', () => {
    const graph = new ArchitectureGraph(model);
    const before = new ArchitectureGraphSnapshot(graph);
    const after = new ArchitectureGraphSnapshot(graph);
    const diff = new ArchitectureGraphDiff(before, after);
    const changes = new ArchitectureChangeSet(diff.getResult());
    const operation = new ArchitectureOperation(before, after, changes);
    expect(operation.getAfterSnapshot()).toBe(operation.getAfterSnapshot());
  });

  it('should return same reference on repeated getChangeSet calls', () => {
    const graph = new ArchitectureGraph(model);
    const before = new ArchitectureGraphSnapshot(graph);
    const after = new ArchitectureGraphSnapshot(graph);
    const diff = new ArchitectureGraphDiff(before, after);
    const changes = new ArchitectureChangeSet(diff.getResult());
    const operation = new ArchitectureOperation(before, after, changes);
    expect(operation.getChangeSet()).toBe(operation.getChangeSet());
  });

  it('should work with empty snapshots', () => {
    const emptyGraph = new ArchitectureGraph(emptyModel);
    const before = new ArchitectureGraphSnapshot(emptyGraph);
    const after = new ArchitectureGraphSnapshot(emptyGraph);
    const diff = new ArchitectureGraphDiff(before, after);
    const changes = new ArchitectureChangeSet(diff.getResult());
    const operation = new ArchitectureOperation(before, after, changes);
    expect(operation.getBeforeSnapshot().getGraph().nodes).toHaveLength(0);
    expect(operation.getAfterSnapshot().getGraph().nodes).toHaveLength(0);
    expect(operation.getChangeSet().getChanges().addedNodes).toHaveLength(0);
  });

  it('should not mutate anything', () => {
    const graph = new ArchitectureGraph(model);
    const before = new ArchitectureGraphSnapshot(graph);
    const after = new ArchitectureGraphSnapshot(graph);
    const diff = new ArchitectureGraphDiff(before, after);
    const changes = new ArchitectureChangeSet(diff.getResult());
    const operation = new ArchitectureOperation(before, after, changes);

    const beforeNodes = operation.getBeforeSnapshot().getGraph().nodes.length;
    const afterNodes = operation.getAfterSnapshot().getGraph().nodes.length;

    operation.getBeforeSnapshot();
    operation.getAfterSnapshot();
    operation.getChangeSet();

    expect(operation.getBeforeSnapshot().getGraph().nodes.length).toBe(beforeNodes);
    expect(operation.getAfterSnapshot().getGraph().nodes.length).toBe(afterNodes);
  });

  it('should hold immutable references', () => {
    const graph = new ArchitectureGraph(model);
    const before = new ArchitectureGraphSnapshot(graph);
    const after = new ArchitectureGraphSnapshot(graph);
    const diff = new ArchitectureGraphDiff(before, after);
    const changes = new ArchitectureChangeSet(diff.getResult());
    const operation = new ArchitectureOperation(before, after, changes);

    expect(operation.getBeforeSnapshot()).toBe(before);
    expect(operation.getAfterSnapshot()).toBe(after);
    expect(operation.getChangeSet()).toBe(changes);
  });

  it('should have no side effects on getter calls', () => {
    const graph = new ArchitectureGraph(model);
    const before = new ArchitectureGraphSnapshot(graph);
    const after = new ArchitectureGraphSnapshot(graph);
    const diff = new ArchitectureGraphDiff(before, after);
    const changes = new ArchitectureChangeSet(diff.getResult());
    const operation = new ArchitectureOperation(before, after, changes);

    const b1 = operation.getBeforeSnapshot();
    const a1 = operation.getAfterSnapshot();
    const c1 = operation.getChangeSet();

    operation.getBeforeSnapshot();
    operation.getAfterSnapshot();
    operation.getChangeSet();

    expect(operation.getBeforeSnapshot()).toBe(b1);
    expect(operation.getAfterSnapshot()).toBe(a1);
    expect(operation.getChangeSet()).toBe(c1);
  });

  it('should be publicly exported', () => {
    expect(ArchitectureOperation).toBeDefined();
    expect(typeof ArchitectureOperation).toBe('function');
  });
});
