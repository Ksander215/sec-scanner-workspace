/**
 * Workflow Runtime — Storage Tests
 * TASK-AIS-003H.000
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryWorkflowStorage } from '../../../core/workflow/workflow-storage.js';
import type { WorkflowInstance, WorkflowDefinition } from '../../../core/workflow/types.js';
import { brandWorkflowId, brandWorkflowInstanceId, brandStageId, brandCheckpointId } from '../../../core/workflow/types.js';
import { WorkflowState, StageState, StageType } from '../../../core/workflow/types.js';

function makeDefinition(name = 'test-workflow'): WorkflowDefinition {
  return Object.freeze({
    id: brandWorkflowId(crypto.randomUUID()),
    name,
    description: '',
    version: '1.0.0',
    stages: Object.freeze([Object.freeze({
      id: brandStageId(crypto.randomUUID()),
      name: 'stage-1',
      description: '',
      type: StageType.Sequential,
      handler: 'handler',
      inputMapping: Object.freeze({}),
      outputMapping: Object.freeze({}),
      timeoutMs: 30000,
      retryPolicy: Object.freeze({ maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2, retryableErrors: [] }),
      compensation: Object.freeze({ action: 'Undo' as any, timeoutMs: 30000, retryPolicy: Object.freeze({ maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2, retryableErrors: [] }) }),
      conditions: [],
      metadata: Object.freeze({}),
      dependencies: [],
    })]),
    transitions: Object.freeze([]),
    conditions: Object.freeze([]),
    policies: Object.freeze([]),
    metadata: Object.freeze({}),
    inputSchema: Object.freeze({}),
    outputSchema: Object.freeze({}),
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  });
}

function makeInstance(workflowId: string, state: WorkflowState = WorkflowState.Draft): WorkflowInstance {
  return Object.freeze({
    id: brandWorkflowInstanceId(crypto.randomUUID()),
    workflowId: workflowId as any,
    definitionVersion: '1.0.0',
    state,
    currentStageId: null,
    stages: new Map(),
    variables: new Map(),
    input: Object.freeze({}),
    output: Object.freeze({}),
    error: null,
    createdAt: '2024-01-01T00:00:00Z',
    startedAt: null,
    completedAt: null,
    updatedAt: '2024-01-01T00:00:00Z',
    metadata: Object.freeze({}),
  });
}

describe('InMemoryWorkflowStorage', () => {
  let storage: InMemoryWorkflowStorage;

  beforeEach(() => {
    storage = new InMemoryWorkflowStorage();
  });

  describe('Workflow Instances', () => {
    it('should save and load an instance', async () => {
      const instance = makeInstance('wf-1');
      await storage.saveWorkflowInstance(instance);
      const loaded = await storage.loadWorkflowInstance(instance.id);
      expect(loaded).toEqual(instance);
    });

    it('should return null for non-existent instance', async () => {
      const loaded = await storage.loadWorkflowInstance(brandWorkflowInstanceId('nonexistent'));
      expect(loaded).toBeNull();
    });

    it('should delete an instance', async () => {
      const instance = makeInstance('wf-1');
      await storage.saveWorkflowInstance(instance);
      const deleted = await storage.deleteWorkflowInstance(instance.id);
      expect(deleted).toBe(true);
      expect(await storage.loadWorkflowInstance(instance.id)).toBeNull();
    });

    it('should return false when deleting non-existent instance', async () => {
      const deleted = await storage.deleteWorkflowInstance(brandWorkflowInstanceId('nonexistent'));
      expect(deleted).toBe(false);
    });

    it('should list all instances', async () => {
      await storage.saveWorkflowInstance(makeInstance('wf-1'));
      await storage.saveWorkflowInstance(makeInstance('wf-2'));
      const list = await storage.listWorkflowInstances();
      expect(list).toHaveLength(2);
    });

    it('should filter instances by state', async () => {
      const wfId = brandWorkflowId('wf-1');
      await storage.saveWorkflowInstance(makeInstance(wfId, WorkflowState.Running));
      await storage.saveWorkflowInstance(makeInstance(wfId, WorkflowState.Completed));
      const list = await storage.listWorkflowInstances({ state: WorkflowState.Running });
      expect(list).toHaveLength(1);
    });

    it('should filter instances by workflowId', async () => {
      const wf1 = brandWorkflowId('wf-1');
      const wf2 = brandWorkflowId('wf-2');
      await storage.saveWorkflowInstance(makeInstance(wf1));
      await storage.saveWorkflowInstance(makeInstance(wf2));
      const list = await storage.listWorkflowInstances({ workflowId: wf1 as any });
      expect(list).toHaveLength(1);
    });

    it('should filter instances by date range', async () => {
      await storage.saveWorkflowInstance(Object.freeze({
        ...makeInstance('wf-1'),
        createdAt: '2024-01-01T00:00:00Z',
      }));
      await storage.saveWorkflowInstance(Object.freeze({
        ...makeInstance('wf-2'),
        createdAt: '2024-06-01T00:00:00Z',
      }));
      const list = await storage.listWorkflowInstances({
        from: '2024-03-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z',
      });
      expect(list).toHaveLength(1);
    });

    it('should return empty list when no instances', async () => {
      const list = await storage.listWorkflowInstances();
      expect(list).toHaveLength(0);
    });

    it('should overwrite existing instance on save', async () => {
      const instance1 = makeInstance('wf-1');
      const instance2 = Object.freeze({ ...instance1, state: WorkflowState.Completed });
      await storage.saveWorkflowInstance(instance1);
      await storage.saveWorkflowInstance(instance2);
      const loaded = await storage.loadWorkflowInstance(instance1.id);
      expect(loaded!.state).toBe(WorkflowState.Completed);
    });
  });

  describe('Definitions', () => {
    it('should save and load a definition', async () => {
      const def = makeDefinition();
      await storage.saveDefinition(def);
      const loaded = await storage.loadDefinition(def.id);
      expect(loaded).toEqual(def);
    });

    it('should return null for non-existent definition', async () => {
      const loaded = await storage.loadDefinition(brandWorkflowId('nonexistent'));
      expect(loaded).toBeNull();
    });

    it('should delete a definition', async () => {
      const def = makeDefinition();
      await storage.saveDefinition(def);
      expect(await storage.deleteDefinition(def.id)).toBe(true);
      expect(await storage.loadDefinition(def.id)).toBeNull();
    });

    it('should list all definitions', async () => {
      await storage.saveDefinition(makeDefinition('wf-1'));
      await storage.saveDefinition(makeDefinition('wf-2'));
      const list = await storage.listDefinitions();
      expect(list).toHaveLength(2);
    });
  });

  describe('Checkpoints', () => {
    it('should save and load latest checkpoint', async () => {
      const instanceId = brandWorkflowInstanceId('inst-1');
      const cp1 = Object.freeze({
        id: brandCheckpointId('cp-1'),
        workflowInstanceId: instanceId,
        state: WorkflowState.Running,
        currentStageId: null,
        stageStates: new Map(),
        variables: new Map(),
        createdAt: '2024-01-01T00:00:00Z',
        metadata: Object.freeze({}),
      });
      const cp2 = Object.freeze({
        id: brandCheckpointId('cp-2'),
        workflowInstanceId: instanceId,
        state: WorkflowState.Paused,
        currentStageId: null,
        stageStates: new Map(),
        variables: new Map(),
        createdAt: '2024-01-01T00:01:00Z',
        metadata: Object.freeze({}),
      });
      await storage.saveCheckpoint(cp1);
      await storage.saveCheckpoint(cp2);
      const loaded = await storage.loadCheckpoint(instanceId);
      expect(loaded!.id).toBe(cp2.id);
    });

    it('should return null when no checkpoints', async () => {
      const loaded = await storage.loadCheckpoint(brandWorkflowInstanceId('nonexistent'));
      expect(loaded).toBeNull();
    });

    it('should list all checkpoints', async () => {
      const instanceId = brandWorkflowInstanceId('inst-1');
      await storage.saveCheckpoint(Object.freeze({
        id: brandCheckpointId('cp-1'),
        workflowInstanceId: instanceId,
        state: WorkflowState.Running,
        currentStageId: null,
        stageStates: new Map(),
        variables: new Map(),
        createdAt: '2024-01-01T00:00:00Z',
        metadata: Object.freeze({}),
      }));
      await storage.saveCheckpoint(Object.freeze({
        id: brandCheckpointId('cp-2'),
        workflowInstanceId: instanceId,
        state: WorkflowState.Paused,
        currentStageId: null,
        stageStates: new Map(),
        variables: new Map(),
        createdAt: '2024-01-01T00:01:00Z',
        metadata: Object.freeze({}),
      }));
      const list = await storage.listCheckpoints(instanceId);
      expect(list).toHaveLength(2);
    });
  });

  describe('Clear', () => {
    it('should clear all data', async () => {
      await storage.saveWorkflowInstance(makeInstance('wf-1'));
      await storage.saveDefinition(makeDefinition());
      expect(storage.size.instances).toBe(1);
      storage.clear();
      expect(storage.size.instances).toBe(0);
      expect(storage.size.definitions).toBe(0);
      expect(storage.size.checkpoints).toBe(0);
    });
  });

  describe('Size', () => {
    it('should report correct size', async () => {
      await storage.saveWorkflowInstance(makeInstance('wf-1'));
      await storage.saveDefinition(makeDefinition());
      expect(storage.size.instances).toBe(1);
      expect(storage.size.definitions).toBe(1);
    });
  });
});
