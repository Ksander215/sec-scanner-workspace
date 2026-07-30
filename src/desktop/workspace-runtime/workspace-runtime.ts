/**
 * Workspace Runtime — Implementation
 */
import type { Timestamp } from '../../core/types/common.js';
import type { Service } from '../../core/services/service.js';
import { WorkspaceState } from './types.js';
import type { WorkspaceId, Workspace, CreateWorkspaceOptions } from './types.js';
import { WorkspaceNotFoundError, DuplicateWorkspaceError } from './errors.js';

function brand(id: string): WorkspaceId { return id as WorkspaceId; }

export class WorkspaceRuntime implements Service {
  readonly name = 'WorkspaceRuntime';
  private workspaces = new Map<WorkspaceId, Workspace>();
  private activeId: WorkspaceId | null = null;
  private _initialized = false;

  async initialize(): Promise<void> { this._initialized = true; }
  async start(): Promise<void> {}
  async stop(): Promise<void> { this.activeId = null; }
  async shutdown(): Promise<void> { this.workspaces.clear(); this._initialized = false; }

  get initialized(): boolean { return this._initialized; }
  get activeWorkspace(): Workspace | null {
    if (!this.activeId) return null;
    return this.workspaces.get(this.activeId) ?? null;
  }
  get count(): number { return this.workspaces.size; }

  create(opts: CreateWorkspaceOptions): Workspace {
    const existing = [...this.workspaces.values()].find(w => w.name === opts.name);
    if (existing) throw new DuplicateWorkspaceError(opts.name);
    const now = new Date().toISOString() as Timestamp;
    const ws: Workspace = {
      id: brand(crypto.randomUUID()), name: opts.name,
      description: opts.description ?? '', state: WorkspaceState.Active,
      projectId: opts.projectId, layout: opts.layout ?? {}, createdAt: now, updatedAt: now,
    };
    this.workspaces.set(ws.id, ws);
    if (!this.activeId) this.activeId = ws.id;
    return ws;
  }

  getById(id: WorkspaceId): Workspace {
    const ws = this.workspaces.get(id);
    if (!ws) throw new WorkspaceNotFoundError(id);
    return ws;
  }

  getAll(): readonly Workspace[] { return [...this.workspaces.values()]; }

  getActive(): Workspace | null {
    if (!this.activeId) return null;
    return this.workspaces.get(this.activeId) ?? null;
  }

  switch(id: WorkspaceId): void {
    const ws = this.workspaces.get(id);
    if (!ws) throw new WorkspaceNotFoundError(id);
    this.activeId = id;
  }

  updateLayout(id: WorkspaceId, layout: Record<string, unknown>): void {
    const ws = this.workspaces.get(id);
    if (!ws) throw new WorkspaceNotFoundError(id);
    const updated: Workspace = { ...ws, layout, updatedAt: new Date().toISOString() as Timestamp };
    this.workspaces.set(id, updated);
  }

  archive(id: WorkspaceId): void {
    const ws = this.workspaces.get(id);
    if (!ws) throw new WorkspaceNotFoundError(id);
    const updated: Workspace = { ...ws, state: WorkspaceState.Archived, updatedAt: new Date().toISOString() as Timestamp };
    this.workspaces.set(id, updated);
    if (this.activeId === id) {
      const next = [...this.workspaces.values()].find(w => w.state === WorkspaceState.Active);
      this.activeId = next?.id ?? null;
    }
  }

  delete(id: WorkspaceId): void {
    if (!this.workspaces.has(id)) throw new WorkspaceNotFoundError(id);
    this.workspaces.delete(id);
    if (this.activeId === id) {
      const next = [...this.workspaces.values()].find(w => w.state === WorkspaceState.Active);
      this.activeId = next?.id ?? null;
    }
  }
}
