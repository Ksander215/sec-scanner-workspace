/**
 * AIS Companion — Workflow Dashboard
 * TASK-AIS-011A.000
 */

import type { InProcessEventBus } from '../events/event-bus.js';
import type { IWorkflowDashboard } from './contracts.js';
import type { WorkflowDashboardConfig } from './types.js';

interface WorkflowEntry {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly solutionId: string;
  readonly sessionId: string;
}

export class WorkflowDashboard implements IWorkflowDashboard {
  private readonly config: WorkflowDashboardConfig;
  private readonly workflows = new Map<string, WorkflowEntry>();

  constructor(config: WorkflowDashboardConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    void eventBus;
  }

  async list(sessionId: string): Promise<ReadonlyArray<{ id: string; title: string; status: string; solutionId: string }>> {
    return [...this.workflows.values()]
      .filter(w => w.sessionId === sessionId)
      .slice(0, this.config.maxVisibleWorkflows)
      .map(w => ({ id: w.id, title: w.title, status: w.status, solutionId: w.solutionId }));
  }

  async getBySolution(solutionId: string): Promise<ReadonlyArray<{ id: string; title: string; status: string }>> {
    return [...this.workflows.values()]
      .filter(w => w.solutionId === solutionId)
      .map(w => ({ id: w.id, title: w.title, status: w.status }));
  }

  async count(sessionId: string): Promise<number> {
    return [...this.workflows.values()].filter(w => w.sessionId === sessionId).length;
  }

  async register(sessionId: string, solutionId: string, workflowId: string, title: string, status: string = 'Pending'): Promise<void> {
    this.workflows.set(workflowId, Object.freeze({ id: workflowId, title, status, solutionId, sessionId }));
  }
}
