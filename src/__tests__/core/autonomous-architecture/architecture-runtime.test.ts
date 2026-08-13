/**
 * Autonomous Architecture Runtime — Architecture Runtime Smoke Tests
 * TASK-AIS-012A.021
 */

import { describe, it, expect } from 'vitest';
import {
  ArchitectureRuntime,
  ArchitectureWorkspace,
  ArchitectureHistory,
  ArchitectureEventBus,
  ArchitectureGraph,
  ArchitectureGraphValidator,
  ArchitectureGraphAnalysis,
  ArchitectureNodeKind,
  ArchitectureEdgeKind,
  ArchitectureLayerKind,
  type ArchitectureGraphModel,
  type ArchitectureLayerId,
  type ArchitectureNodeId,
  type ArchitectureEdgeId,
} from '../../../core/autonomous-architecture/index.js';

describe('ArchitectureRuntime', () => {
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

  const createWorkspace = (): ArchitectureWorkspace => {
    const graph = new ArchitectureGraph(model);
    const validator = new ArchitectureGraphValidator(graph);
    const analysis = new ArchitectureGraphAnalysis(graph);
    return new ArchitectureWorkspace(graph, validator, analysis);
  };

  it('should construct with workspace, history, and eventBus', () => {
    const workspace = createWorkspace();
    const history = new ArchitectureHistory([]);
    const eventBus = new ArchitectureEventBus();
    const runtime = new ArchitectureRuntime(workspace, history, eventBus);
    expect(runtime).toBeInstanceOf(ArchitectureRuntime);
  });

  it('should return workspace via getWorkspace', () => {
    const workspace = createWorkspace();
    const history = new ArchitectureHistory([]);
    const eventBus = new ArchitectureEventBus();
    const runtime = new ArchitectureRuntime(workspace, history, eventBus);
    expect(runtime.getWorkspace()).toBe(workspace);
  });

  it('should return history via getHistory', () => {
    const workspace = createWorkspace();
    const history = new ArchitectureHistory([]);
    const eventBus = new ArchitectureEventBus();
    const runtime = new ArchitectureRuntime(workspace, history, eventBus);
    expect(runtime.getHistory()).toBe(history);
  });

  it('should return eventBus via getEventBus', () => {
    const workspace = createWorkspace();
    const history = new ArchitectureHistory([]);
    const eventBus = new ArchitectureEventBus();
    const runtime = new ArchitectureRuntime(workspace, history, eventBus);
    expect(runtime.getEventBus()).toBe(eventBus);
  });

  it('should return same reference on multiple getWorkspace calls', () => {
    const workspace = createWorkspace();
    const history = new ArchitectureHistory([]);
    const eventBus = new ArchitectureEventBus();
    const runtime = new ArchitectureRuntime(workspace, history, eventBus);
    expect(runtime.getWorkspace()).toBe(runtime.getWorkspace());
  });

  it('should return same reference on multiple getHistory calls', () => {
    const workspace = createWorkspace();
    const history = new ArchitectureHistory([]);
    const eventBus = new ArchitectureEventBus();
    const runtime = new ArchitectureRuntime(workspace, history, eventBus);
    expect(runtime.getHistory()).toBe(runtime.getHistory());
  });

  it('should return same reference on multiple getEventBus calls', () => {
    const workspace = createWorkspace();
    const history = new ArchitectureHistory([]);
    const eventBus = new ArchitectureEventBus();
    const runtime = new ArchitectureRuntime(workspace, history, eventBus);
    expect(runtime.getEventBus()).toBe(runtime.getEventBus());
  });

  it('should not modify workspace', () => {
    const workspace = createWorkspace();
    const history = new ArchitectureHistory([]);
    const eventBus = new ArchitectureEventBus();
    const runtime = new ArchitectureRuntime(workspace, history, eventBus);
    const nodeCountBefore = workspace.getGraph().nodes.length;
    runtime.getWorkspace();
    runtime.getHistory();
    runtime.getEventBus();
    expect(workspace.getGraph().nodes.length).toBe(nodeCountBefore);
  });

  it('should not modify history', () => {
    const workspace = createWorkspace();
    const history = new ArchitectureHistory([]);
    const eventBus = new ArchitectureEventBus();
    const runtime = new ArchitectureRuntime(workspace, history, eventBus);
    const countBefore = history.getOperationCount();
    runtime.getWorkspace();
    runtime.getHistory();
    runtime.getEventBus();
    expect(history.getOperationCount()).toBe(countBefore);
  });

  it('should not modify eventBus', () => {
    const workspace = createWorkspace();
    const history = new ArchitectureHistory([]);
    const eventBus = new ArchitectureEventBus();
    const runtime = new ArchitectureRuntime(workspace, history, eventBus);
    const subscriberCountBefore = eventBus.getSubscriberCount('test');
    runtime.getWorkspace();
    runtime.getHistory();
    runtime.getEventBus();
    expect(eventBus.getSubscriberCount('test')).toBe(subscriberCountBefore);
  });

  it('should be publicly exported', () => {
    expect(ArchitectureRuntime).toBeDefined();
    expect(typeof ArchitectureRuntime).toBe('function');
  });
});
