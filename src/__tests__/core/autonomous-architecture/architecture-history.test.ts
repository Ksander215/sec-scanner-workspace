/**
 * Autonomous Architecture Runtime — Architecture History Smoke Tests
 * TASK-AIS-012A.018
 */

import { describe, it, expect } from 'vitest';
import { ArchitectureHistory } from '../../../core/autonomous-architecture/services/architecture.history.js';
import {
  ArchitectureGraph,
  ArchitectureGraphSnapshot,
  ArchitectureGraphDiff,
  ArchitectureChangeSet,
  ArchitectureOperation,
  ArchitectureNodeKind,
  ArchitectureEdgeKind,
  ArchitectureLayerKind,
  type ArchitectureGraphModel,
  type ArchitectureNodeId,
  type ArchitectureEdgeId,
  type ArchitectureLayerId,
} from '../../../core/autonomous-architecture/index.js';

describe('ArchitectureHistory', () => {
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

  function createOperation(): ArchitectureOperation {
    const graph = new ArchitectureGraph(model);
    const before = new ArchitectureGraphSnapshot(graph);
    const after = new ArchitectureGraphSnapshot(graph);
    const diff = new ArchitectureGraphDiff(before, after);
    const changes = new ArchitectureChangeSet(diff.getResult());
    return new ArchitectureOperation(before, after, changes);
  }

  it('should construct with operations', () => {
    const op = createOperation();
    const history = new ArchitectureHistory([op]);
    expect(history).toBeInstanceOf(ArchitectureHistory);
  });

  it('should create empty history', () => {
    const history = new ArchitectureHistory([]);
    expect(history.isEmpty()).toBe(true);
    expect(history.getOperationCount()).toBe(0);
  });

  it('should return operations via getOperations', () => {
    const op = createOperation();
    const history = new ArchitectureHistory([op]);
    expect(history.getOperations()).toHaveLength(1);
    expect(history.getOperations()[0]).toBe(op);
  });

  it('should return same reference on repeated getOperations calls', () => {
    const op = createOperation();
    const history = new ArchitectureHistory([op]);
    expect(history.getOperations()).toBe(history.getOperations());
  });

  it('should return correct operation count', () => {
    const op1 = createOperation();
    const op2 = createOperation();
    const history = new ArchitectureHistory([op1, op2]);
    expect(history.getOperationCount()).toBe(2);
  });

  it('should return isEmpty true for empty history', () => {
    const history = new ArchitectureHistory([]);
    expect(history.isEmpty()).toBe(true);
  });

  it('should return isEmpty false for non-empty history', () => {
    const op = createOperation();
    const history = new ArchitectureHistory([op]);
    expect(history.isEmpty()).toBe(false);
  });

  it('should not mutate operations', () => {
    const op = createOperation();
    const history = new ArchitectureHistory([op]);
    const before = history.getOperations().length;
    history.getOperations();
    history.getOperationCount();
    history.isEmpty();
    const after = history.getOperations().length;
    expect(after).toBe(before);
  });

  it('should hold immutable references', () => {
    const op = createOperation();
    const history = new ArchitectureHistory([op]);
    const ops = history.getOperations();
    expect(ops).toBe(history.getOperations());
    expect(ops[0]).toBe(op);
  });

  it('should have no side effects on getter calls', () => {
    const op = createOperation();
    const history = new ArchitectureHistory([op]);
    const ops1 = history.getOperations();
    const count1 = history.getOperationCount();
    const empty1 = history.isEmpty();

    history.getOperations();
    history.getOperationCount();
    history.isEmpty();

    expect(history.getOperations()).toBe(ops1);
    expect(history.getOperationCount()).toBe(count1);
    expect(history.isEmpty()).toBe(empty1);
  });

  it('should be publicly exported', () => {
    expect(ArchitectureHistory).toBeDefined();
    expect(typeof ArchitectureHistory).toBe('function');
  });
});
