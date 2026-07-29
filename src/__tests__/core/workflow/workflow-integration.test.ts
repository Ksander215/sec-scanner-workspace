/**
 * Workflow Runtime — Integration Tests
 * TASK-AIS-003H.000
 *
 * End-to-end tests combining multiple components:
 * - Full workflow lifecycle with handlers
 * - Error handling and recovery
 * - Parallel stage execution patterns
 * - Checkpoint and restore
 * - Metrics aggregation
 * - Event flow verification
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowRuntime } from '../../../core/workflow/workflow-runtime.js';
import { InMemoryWorkflowStorage } from '../../../core/workflow/workflow-storage.js';
import { InProcessEventBus } from '../../../core/events/event-bus.js';
import { createWorkflowDefinition } from '../../../core/workflow/workflow-definition.js';
import { WorkflowState, StageType, CompensationAction, TraceLevel } from '../../../core/workflow/types.js';
import type { StageHandler, WorkflowDefinition } from '../../../core/workflow/types.js';

describe('Workflow Runtime Integration', () => {
  let runtime: WorkflowRuntime;
  let eventBus: InProcessEventBus;
  let storage: InMemoryWorkflowStorage;

  beforeEach(() => {
    eventBus = new InProcessEventBus();
    storage = new InMemoryWorkflowStorage();
    runtime = new WorkflowRuntime({ eventBus, storage });
  });

  // ─── Complete Lifecycle Tests ─────────────────────────────

  describe('complete workflow lifecycle', () => {
    it('should execute a 5-stage sequential workflow', async () => {
      for (let i = 1; i <= 5; i++) {
        runtime.registerHandler(`handler-${i}`, {
          execute: vi.fn(async () => ({ step: i })),
        });
      }
      const def = createWorkflowDefinition({
        name: 'five-stage',
        stages: [
          { name: 's1', handler: 'handler-1' },
          { name: 's2', handler: 'handler-2' },
          { name: 's3', handler: 'handler-3' },
          { name: 's4', handler: 'handler-4' },
          { name: 's5', handler: 'handler-5' },
        ],
      });
      await runtime.registerDefinition(def);
      const instanceId = await runtime.createInstance(def.id);
      await runtime.startInstance(instanceId);
      const instance = runtime.getInstance(instanceId);
      expect(instance.state).toBe(WorkflowState.Completed);
    });

    it('should persist instance state across operations', async () => {
      runtime.registerHandler('h1', { execute: vi.fn(async () => ({ done: true })) });
      const def = createWorkflowDefinition({
        name: 'persist-test',
        stages: [{ name: 's1', handler: 'h1' }],
      });
      await runtime.registerDefinition(def);
      const instanceId = await runtime.createInstance(def.id);
      const loaded = await storage.loadWorkflowInstance(instanceId);
      expect(loaded).not.toBeNull();
      expect(loaded!.state).toBe(WorkflowState.Draft);
    });
  });

  // ─── Error Handling ──────────────────────────────────────

  describe('error handling', () => {
    it('should handle first stage failure', async () => {
      runtime.registerHandler('fail-handler', {
        execute: vi.fn(async () => { throw new Error('stage-1-failed'); }),
      });
      const def = createWorkflowDefinition({
        name: 'fail-first',
        stages: [
          { name: 's1', handler: 'fail-handler' },
          { name: 's2', handler: 'handler-2' },
        ],
      });
      await runtime.registerDefinition(def);
      const instanceId = await runtime.createInstance(def.id);
      await runtime.startInstance(instanceId);
      const instance = runtime.getInstance(instanceId);
      expect(instance.state).toBe(WorkflowState.Failed);
      // s2 should not have been executed
      const stages = Array.from(instance.stages.values());
      const s2 = stages.find(s => s.name === 's2');
      expect(s2!.state).toBe('Pending');
    });

    it('should handle middle stage failure', async () => {
      runtime.registerHandler('h1', { execute: vi.fn(async () => ({ a: 1 })) });
      runtime.registerHandler('h-fail', {
        execute: vi.fn(async () => { throw new Error('mid-fail'); }),
      });
      const def = createWorkflowDefinition({
        name: 'fail-mid',
        stages: [
          { name: 's1', handler: 'h1' },
          { name: 's2', handler: 'h-fail' },
          { name: 's3', handler: 'h1' },
        ],
      });
      await runtime.registerDefinition(def);
      const instanceId = await runtime.createInstance(def.id);
      await runtime.startInstance(instanceId);
      const instance = runtime.getInstance(instanceId);
      expect(instance.state).toBe(WorkflowState.Failed);
      const s1 = Array.from(instance.stages.values()).find(s => s.name === 's1');
      expect(s1!.state).toBe('Completed');
      const s3 = Array.from(instance.stages.values()).find(s => s.name === 's3');
      expect(s3!.state).toBe('Pending');
    });

    it('should handle handler that returns undefined', async () => {
      runtime.registerHandler('h-empty', {
        execute: vi.fn(async () => undefined as any),
      });
      const def = createWorkflowDefinition({
        name: 'empty-output',
        stages: [{ name: 's1', handler: 'h-empty' }],
      });
      await runtime.registerDefinition(def);
      const instanceId = await runtime.createInstance(def.id);
      await runtime.startInstance(instanceId);
      expect(runtime.getInstance(instanceId).state).toBe(WorkflowState.Completed);
    });
  });

  // ─── Event Flow ──────────────────────────────────────────────

  describe('event flow', () => {
    it('should publish events in correct order for successful workflow', async () => {
      runtime.registerHandler('h1', { execute: vi.fn(async () => ({ done: true })) });
      const def = createWorkflowDefinition({
        name: 'event-order',
        stages: [
          { name: 's1', handler: 'h1' },
          { name: 's2', handler: 'h1' },
        ],
      });
      await runtime.registerDefinition(def);
      const instanceId = await runtime.createInstance(def.id);
      await runtime.startInstance(instanceId);

      const events = eventBus.getLog();
      const eventTypes = events.map(e => e.eventType);

      const workflowCreatedIdx = eventTypes.indexOf('WorkflowCreated');
      const workflowStartedIdx = eventTypes.indexOf('WorkflowStarted');
      const stage1StartedIdx = eventTypes.indexOf('StageStarted');
      const stage1CompletedIdx = eventTypes.indexOf('StageCompleted');
      const stage2StartedIdx = eventTypes.indexOf('StageStarted', stage1CompletedIdx);
      const stage2CompletedIdx = eventTypes.indexOf('StageCompleted', stage2StartedIdx);
      const workflowCompletedIdx = eventTypes.indexOf('WorkflowCompleted');

      expect(workflowCreatedIdx).toBeLessThan(workflowStartedIdx);
      expect(workflowStartedIdx).toBeLessThan(stage1StartedIdx);
      expect(stage1StartedIdx).toBeLessThan(stage1CompletedIdx);
      expect(stage1CompletedIdx).toBeLessThan(stage2StartedIdx!);
    });
  });

  // ─── Metrics ───────────────────────────────────────────────

  describe('metrics aggregation', () => {
    it('should track metrics across multiple workflows', async () => {
      runtime.registerHandler('h-ok', { execute: vi.fn(async () => ({ result: 'ok' })) });
      runtime.registerHandler('h-fail', {
        execute: vi.fn(async () => { throw new Error('fail'); }),
      });

      const defOk = createWorkflowDefinition({
        name: 'ok',
        stages: [{ name: 's1', handler: 'h-ok' }],
      });
      const defFail = createWorkflowDefinition({
        name: 'fail',
        stages: [{ name: 's1', handler: 'h-fail' }],
      });

      await runtime.registerDefinition(defOk);
      await runtime.registerDefinition(defFail);

      // Complete 2 successful workflows
      await runtime.startInstance(await runtime.createInstance(defOk.id));
      await runtime.startInstance(await runtime.createInstance(defOk.id));
      // Fail 1 workflow
      await runtime.startInstance(await runtime.createInstance(defFail.id));

      const metrics = runtime.getMetrics();
      expect(metrics.totalWorkflows).toBe(2); // definitions registered
      expect(metrics.completedWorkflows).toBe(2);
      expect(metrics.failedWorkflows).toBe(1);
      expect(metrics.successRate).toBe(67); // 2/3 = 67%
      expect(metrics.eventsPublished).toBeGreaterThan(0);
    });
  });

  // ─── Storage Integration ───────────────────────────────────

  describe('storage integration', () => {
    it('should persist definitions to storage', async () => {
      const def = createWorkflowDefinition({
        name: 'storage-def',
        stages: [{ name: 's1', handler: 'h1' }],
      });
      await runtime.registerDefinition(def);
      const loaded = await storage.loadDefinition(def.id);
      expect(loaded).toEqual(def);
    });

    it('should list instances from storage', async () => {
      runtime.registerHandler('h1', { execute: vi.fn(async () => ({ done: true })) });
      const def = createWorkflowDefinition({
        name: 'list-test',
        stages: [{ name: 's1', handler: 'h1' }],
      });
      await runtime.registerDefinition(def);
      await runtime.createInstance(def.id);
      await runtime.createInstance(def.id);
      const instances = await storage.listWorkflowInstances();
      expect(instances).toHaveLength(2);
    });

    it('should use separate storage per runtime', async () => {
      const storage2 = new InMemoryWorkflowStorage();
      const runtime2 = new WorkflowRuntime({ storage: storage2 });
      const def = createWorkflowDefinition({
        name: 'isolated',
        stages: [{ name: 's1', handler: 'h1' }],
      });
      await runtime2.registerDefinition(def);
      await runtime2.createInstance(def.id);

      // Original runtime should not see this
      expect(runtime.listInstances()).toHaveLength(0);
      expect(runtime2.listInstances()).toHaveLength(1);
    });
  });

  // ─── Stage Types ──────────────────────────────────────────

  describe('stage types', () => {
    it('should execute parallel stage type', async () => {
      runtime.registerHandler('h-parallel', {
        execute: vi.fn(async () => ({ parallel: true })),
      });
      const def = createWorkflowDefinition({
        name: 'parallel-test',
        stages: [
          { name: 'p1', handler: 'h-parallel', type: StageType.Parallel },
          { name: 'p2', handler: 'h-parallel', type: StageType.Parallel },
        ],
      });
      await runtime.registerDefinition(def);
      const instanceId = await runtime.createInstance(def.id);
      await runtime.startInstance(instanceId);
      expect(runtime.getInstance(instanceId).state).toBe(WorkflowState.Completed);
    });

    it('should execute conditional stage type', async () => {
      runtime.registerHandler('h-cond', {
        execute: vi.fn(async () => ({ cond: true })),
      });
      const def = createWorkflowDefinition({
        name: 'conditional-test',
        stages: [
          { name: 'c1', handler: 'h-cond', type: StageType.Conditional },
        ],
      });
      await runtime.registerDefinition(def);
      const instanceId = await runtime.createInstance(def.id);
      await runtime.startInstance(instanceId);
      expect(runtime.getInstance(instanceId).state).toBe(WorkflowState.Completed);
    });

    it('should execute delayed stage type', async () => {
      runtime.registerHandler('h-delay', {
        execute: vi.fn(async () => ({ delayed: true })),
      });
      const def = createWorkflowDefinition({
        name: 'delayed-test',
        stages: [
          { name: 'd1', handler: 'h-delay', type: StageType.Delayed, delayMs: 10 },
        ],
      });
      await runtime.registerDefinition(def);
      const instanceId = await runtime.createInstance(def.id);
      await runtime.startInstance(instanceId);
      expect(runtime.getInstance(instanceId).state).toBe(WorkflowState.Completed);
    });

    it('should execute event-driven stage type', async () => {
      runtime.registerHandler('h-event', {
        execute: vi.fn(async () => ({ event: true })),
      });
      const def = createWorkflowDefinition({
        name: 'event-test',
        stages: [
          { name: 'e1', handler: 'h-event', type: StageType.EventDriven, eventType: 'test.event' },
        ],
      });
      await runtime.registerDefinition(def);
      const instanceId = await runtime.createInstance(def.id);
      await runtime.startInstance(instanceId);
      expect(runtime.getInstance(instanceId).state).toBe(WorkflowState.Completed);
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────

  describe('edge cases', () => {
    it('should handle workflow with no stages', async () => {
      // This should fail validation
      const def = createWorkflowDefinition({
        name: 'no-stages',
        stages: [],
      });
      await expect(runtime.registerDefinition(def)).rejects.toThrow();
    });

    it('should handle duplicate stage names', async () => {
      runtime.registerHandler('h1', { execute: vi.fn(async () => ({})) });
      const def = createWorkflowDefinition({
        name: 'dup-stages',
        stages: [
          { name: 's1', handler: 'h1' },
          { name: 's1', handler: 'h1' },
        ],
      });
      // Should succeed (stage names can be duplicate, IDs are unique)
      await runtime.registerDefinition(def);
    });

    it('should handle handler that takes time', async () => {
      runtime.registerHandler('h-slow', {
        execute: vi.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { slow: true };
        }),
      });
      const def = createWorkflowDefinition({
        name: 'slow-test',
        stages: [{ name: 's1', handler: 'h-slow' }],
      });
      await runtime.registerDefinition(def);
      const instanceId = await runtime.createInstance(def.id);
      await runtime.startInstance(instanceId);
      expect(runtime.getInstance(instanceId).state).toBe(WorkflowState.Completed);
    });

    it('should handle handler that returns complex objects', async () => {
      runtime.registerHandler('h-complex', {
        execute: vi.fn(async () => ({
          nested: { deep: { value: 42 } },
          array: [1, 2, 3],
          date: new Date().toISOString(),
        })),
      });
      const def = createWorkflowDefinition({
        name: 'complex-output',
        stages: [{ name: 's1', handler: 'h-complex' }],
      });
      await runtime.registerDefinition(def);
      const instanceId = await runtime.createInstance(def.id);
      await runtime.startInstance(instanceId);
      const instance = runtime.getInstance(instanceId);
      expect(instance.output).toBeDefined();
    });

    it('should handle empty input', async () => {
      runtime.registerHandler('h1', { execute: vi.fn(async () => ({ ok: true })) });
      const def = createWorkflowDefinition({
        name: 'empty-input',
        stages: [{ name: 's1', handler: 'h1' }],
      });
      await runtime.registerDefinition(def);
      const instanceId = await runtime.createInstance(def.id, {});
      await runtime.startInstance(instanceId);
      expect(runtime.getInstance(instanceId).state).toBe(WorkflowState.Completed);
    });
  });
});
