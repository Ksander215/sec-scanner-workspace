/**
 * Autonomous Architecture Runtime — Architecture Runtime Controller Smoke Tests
 * TASK-AIS-012A.026
 */

import { describe, it, expect } from 'vitest';
import {
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

const createTestDependencies = (): {
  runtime: ArchitectureRuntime;
  lifecycle: ArchitectureRuntimeLifecycle;
} => {
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
  const t2 = new ArchitectureRuntimeTransition(ArchitectureRuntimeStatus.Ready, ArchitectureRuntimeStatus.Running);
  const lifecycle = new ArchitectureRuntimeLifecycle([t1, t2]);

  return { runtime, lifecycle };
};

describe('ArchitectureRuntimeController', () => {
  it('should construct with runtime and lifecycle', () => {
    const { runtime, lifecycle } = createTestDependencies();
    const controller = new ArchitectureRuntimeController(runtime, lifecycle);
    expect(controller).toBeInstanceOf(ArchitectureRuntimeController);
  });

  it('should return runtime via getRuntime', () => {
    const { runtime, lifecycle } = createTestDependencies();
    const controller = new ArchitectureRuntimeController(runtime, lifecycle);
    expect(controller.getRuntime()).toBe(runtime);
  });

  it('should return lifecycle via getLifecycle', () => {
    const { runtime, lifecycle } = createTestDependencies();
    const controller = new ArchitectureRuntimeController(runtime, lifecycle);
    expect(controller.getLifecycle()).toBe(lifecycle);
  });

  it('should return same reference on repeated getRuntime calls', () => {
    const { runtime, lifecycle } = createTestDependencies();
    const controller = new ArchitectureRuntimeController(runtime, lifecycle);
    expect(controller.getRuntime()).toBe(controller.getRuntime());
  });

  it('should return same reference on repeated getLifecycle calls', () => {
    const { runtime, lifecycle } = createTestDependencies();
    const controller = new ArchitectureRuntimeController(runtime, lifecycle);
    expect(controller.getLifecycle()).toBe(controller.getLifecycle());
  });

  it('should hold immutable references', () => {
    const { runtime, lifecycle } = createTestDependencies();
    const controller = new ArchitectureRuntimeController(runtime, lifecycle);
    const r1 = controller.getRuntime();
    const l1 = controller.getLifecycle();
    controller.getRuntime();
    controller.getLifecycle();
    expect(controller.getRuntime()).toBe(r1);
    expect(controller.getLifecycle()).toBe(l1);
  });

  it('should support empty lifecycle', () => {
    const { runtime } = createTestDependencies();
    const emptyLifecycle = new ArchitectureRuntimeLifecycle([]);
    const controller = new ArchitectureRuntimeController(runtime, emptyLifecycle);
    expect(controller.getLifecycle().isEmpty()).toBe(true);
    expect(controller.getRuntime()).toBe(runtime);
  });

  it('should preserve runtime reference', () => {
    const { runtime, lifecycle } = createTestDependencies();
    const controller = new ArchitectureRuntimeController(runtime, lifecycle);
    expect(controller.getRuntime().getWorkspace()).toBe(runtime.getWorkspace());
    expect(controller.getRuntime().getHistory()).toBe(runtime.getHistory());
    expect(controller.getRuntime().getEventBus()).toBe(runtime.getEventBus());
  });

  it('should have no side effects on getter calls', () => {
    const { runtime, lifecycle } = createTestDependencies();
    const controller = new ArchitectureRuntimeController(runtime, lifecycle);
    const countBefore = controller.getLifecycle().getTransitionCount();
    controller.getRuntime();
    controller.getLifecycle();
    controller.getRuntime();
    controller.getLifecycle();
    expect(controller.getLifecycle().getTransitionCount()).toBe(countBefore);
  });

  it('should be publicly exported', () => {
    expect(ArchitectureRuntimeController).toBeDefined();
    expect(typeof ArchitectureRuntimeController).toBe('function');
  });

  it('should keep different instances independent', () => {
    const { runtime: r1, lifecycle: l1 } = createTestDependencies();
    const { runtime: r2, lifecycle: l2 } = createTestDependencies();
    const c1 = new ArchitectureRuntimeController(r1, l1);
    const c2 = new ArchitectureRuntimeController(r2, l2);
    expect(c1.getRuntime()).toBe(r1);
    expect(c2.getRuntime()).toBe(r2);
    expect(c1.getLifecycle()).toBe(l1);
    expect(c2.getLifecycle()).toBe(l2);
  });

  it('should expose readonly behavior — getters return stable values', () => {
    const { runtime, lifecycle } = createTestDependencies();
    const controller = new ArchitectureRuntimeController(runtime, lifecycle);
    const runtimeRef = controller.getRuntime();
    const lifecycleRef = controller.getLifecycle();
    expect(runtimeRef).toBe(runtime);
    expect(lifecycleRef).toBe(lifecycle);
  });
});
