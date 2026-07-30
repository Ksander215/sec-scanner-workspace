/**
 * Workflow Runtime — Persistence
 * TASK-AIS-003H.000
 *
 * In-memory storage adapter for workflow instances, definitions,
 * and checkpoints. Implements the WorkflowStorageAdapter interface.
 */

import type {
  WorkflowStorageAdapter,
  WorkflowInstance,
  WorkflowDefinition,
  WorkflowCheckpoint,
  WorkflowInstanceId,
  WorkflowId,
  WorkflowInstanceFilter,
} from './types.js';

export class InMemoryWorkflowStorage implements WorkflowStorageAdapter {
  private readonly instances = new Map<WorkflowInstanceId, WorkflowInstance>();
  private readonly definitions = new Map<WorkflowId, WorkflowDefinition>();
  private readonly checkpoints = new Map<WorkflowInstanceId, WorkflowCheckpoint[]>();

  // ─── Instance ────────────────────────────────────────────────

  async saveWorkflowInstance(instance: WorkflowInstance): Promise<void> {
    this.instances.set(instance.id, instance);
  }

  async loadWorkflowInstance(id: WorkflowInstanceId): Promise<WorkflowInstance | null> {
    return this.instances.get(id) ?? null;
  }

  async deleteWorkflowInstance(id: WorkflowInstanceId): Promise<boolean> {
    return this.instances.delete(id);
  }

  async listWorkflowInstances(filter?: WorkflowInstanceFilter): Promise<readonly WorkflowInstance[]> {
    let result = Array.from(this.instances.values());

    if (filter) {
      if (filter.state) {
        result = result.filter(i => i.state === filter.state);
      }
      if (filter.workflowId) {
        result = result.filter(i => i.workflowId === filter.workflowId);
      }
      if (filter.from) {
        result = result.filter(i => i.createdAt >= filter.from!);
      }
      if (filter.to) {
        result = result.filter(i => i.createdAt <= filter.to!);
      }
    }

    return result;
  }

  // ─── Definition ──────────────────────────────────────────────

  async saveDefinition(definition: WorkflowDefinition): Promise<void> {
    this.definitions.set(definition.id, definition);
  }

  async loadDefinition(id: WorkflowId): Promise<WorkflowDefinition | null> {
    return this.definitions.get(id) ?? null;
  }

  async deleteDefinition(id: WorkflowId): Promise<boolean> {
    return this.definitions.delete(id);
  }

  async listDefinitions(): Promise<readonly WorkflowDefinition[]> {
    return Array.from(this.definitions.values());
  }

  // ─── Checkpoint ─────────────────────────────────────────────

  async saveCheckpoint(checkpoint: WorkflowCheckpoint): Promise<void> {
    if (!this.checkpoints.has(checkpoint.workflowInstanceId)) {
      this.checkpoints.set(checkpoint.workflowInstanceId, []);
    }
    this.checkpoints.get(checkpoint.workflowInstanceId)!.push(checkpoint);
  }

  async loadCheckpoint(instanceId: WorkflowInstanceId): Promise<WorkflowCheckpoint | null> {
    const checkpoints = this.checkpoints.get(instanceId);
    if (!checkpoints || checkpoints.length === 0) return null;
    return checkpoints[checkpoints.length - 1];
  }

  async listCheckpoints(instanceId: WorkflowInstanceId): Promise<readonly WorkflowCheckpoint[]> {
    return this.checkpoints.get(instanceId) ?? [];
  }

  // ─── Utilities ───────────────────────────────────────────────

  clear(): void {
    this.instances.clear();
    this.definitions.clear();
    this.checkpoints.clear();
  }

  get size(): { instances: number; definitions: number; checkpoints: number } {
    let totalCheckpoints = 0;
    for (const cps of this.checkpoints.values()) {
      totalCheckpoints += cps.length;
    }
    return {
      instances: this.instances.size,
      definitions: this.definitions.size,
      checkpoints: totalCheckpoints,
    };
  }
}
