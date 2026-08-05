/**
 * Autonomous Architecture Runtime — Architecture Runtime Engine Smoke Tests
 * TASK-AIS-012A.027
 */

import { describe, it, expect } from 'vitest';
import {
  ArchitectureRuntimeEngine,
  ArchitectureRuntimeController,
  ArchitectureRuntime,
  ArchitectureRuntimeLifecycle,
  ArchitectureWorkspace,
  ArchitectureHistory,
  ArchitectureEventBus,
  ArchitectureGraph,
  ArchitectureGraphValidator,
  ArchitectureGraphAnalysis,
  ArchitectureRuntimeTransition,
  ArchitectureRuntimeStatus,
  ArchitectureNodeKind,
  ArchitectureEdgeKind,
  ArchitectureLayerKind,
  type ArchitectureGraphModel,
  type ArchitectureLayerId,
  type ArchitectureNodeId,
  type ArchitectureEdgeId,
} from '../../../core/autonomous-architecture/index.js';

const createTestController = (): ArchitectureRuntimeController => {
  const layerId = 'layer-core' as ArchitectureLayerId;
  const nodeId = 'node-001' as ArchitectureNodeId;
  const edgeId = 'edge-001' as ArchitectureEdgeId;

  const model: ArchitectureGraphModel = {
    layers: [{ id: layerId, kind: ArchitectureLayerKind.Core, name: 'Core' }],
    nodes: [{ id: nodeId, kind: ArchitectureNodeKind.Service, name: 'Auth', layer: layerId }],
    edges: [{ id: edgeId, kind: ArchitectureEdgeKind.DependsOn, from: nodeId, to: nodeId }],
  };

  const graph = new ArchitectureGraph(model);
  const validator = new ArchitectureGraphValidator(graph);
  const analysis = new ArchitectureGraphAnalysis(graph);
  const workspace = new ArchitectureWorkspace(graph, validator, analysis);
  const history = new ArchitectureHistory([]);
  const eventBus = new ArchitectureEventBus();
  const runtime = new ArchitectureRuntime(workspace, history, eventBus);

  const t1 = new ArchitectureRuntimeTransition(ArchitectureRuntimeStatus.Created, ArchitectureRuntimeStatus.Ready);
  const lifecycle = new ArchitectureRuntimeLifecycle([t1]);

  return new ArchitectureRuntimeController(runtime, lifecycle);
};

describe('ArchitectureRuntimeEngine', () => {
  it('should construct with controller', () => {
    const controller = createTestController();
    const engine = new ArchitectureRuntimeEngine(controller);
    expect(engine).toBeInstanceOf(ArchitectureRuntimeEngine);
  });

  it('should return controller via getController', () => {
    const controller = createTestController();
    const engine = new ArchitectureRuntimeEngine(controller);
    expect(engine.getController()).toBe(controller);
  });

  it('should return same reference on repeated getController calls', () => {
    const controller = createTestController();
    const engine = new ArchitectureRuntimeEngine(controller);
    expect(engine.getController()).toBe(engine.getController());
  });

  it('should hold immutable reference', () => {
    const controller = createTestController();
    const engine = new ArchitectureRuntimeEngine(controller);
    const c1 = engine.getController();
    engine.getController();
    engine.getController();
    expect(engine.getController()).toBe(c1);
  });

  it('should provide access to Runtime through Controller', () => {
    const controller = createTestController();
    const engine = new ArchitectureRuntimeEngine(controller);
    expect(engine.getController().getRuntime()).toBe(controller.getRuntime());
  });

  it('should provide access to Lifecycle through Controller', () => {
    const controller = createTestController();
    const engine = new ArchitectureRuntimeEngine(controller);
    expect(engine.getController().getLifecycle()).toBe(controller.getLifecycle());
  });

  it('should have no side effects on getter calls', () => {
    const controller = createTestController();
    const engine = new ArchitectureRuntimeEngine(controller);
    const lifecycleCountBefore = controller.getLifecycle().getTransitionCount();
    engine.getController();
    engine.getController();
    engine.getController();
    expect(controller.getLifecycle().getTransitionCount()).toBe(lifecycleCountBefore);
  });

  it('should be publicly exported', () => {
    expect(ArchitectureRuntimeEngine).toBeDefined();
    expect(typeof ArchitectureRuntimeEngine).toBe('function');
  });

  it('should keep different instances independent', () => {
    const c1 = createTestController();
    const c2 = createTestController();
    const e1 = new ArchitectureRuntimeEngine(c1);
    const e2 = new ArchitectureRuntimeEngine(c2);
    expect(e1.getController()).toBe(c1);
    expect(e2.getController()).toBe(c2);
    expect(e1.getController()).not.toBe(e2.getController());
  });

  it('should expose readonly behavior — stable getter', () => {
    const controller = createTestController();
    const engine = new ArchitectureRuntimeEngine(controller);
    const ref = engine.getController();
    expect(ref).toBe(controller);
    expect(engine.getController()).toBe(ref);
  });

  it('should not expose Workspace directly', () => {
    const controller = createTestController();
    const engine = new ArchitectureRuntimeEngine(controller);
    const engineProto = Object.getOwnPropertyNames(ArchitectureRuntimeEngine.prototype);
    expect(engineProto).not.toContain('getWorkspace');
  });

  it('should not expose EventBus directly', () => {
    const controller = createTestController();
    const engine = new ArchitectureRuntimeEngine(controller);
    const engineProto = Object.getOwnPropertyNames(ArchitectureRuntimeEngine.prototype);
    expect(engineProto).not.toContain('getEventBus');
  });
});
