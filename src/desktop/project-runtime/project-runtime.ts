/**
 * Project Runtime — Implementation
 */
import type { Timestamp } from '../../core/types/common.js';
import type { Service } from '../../core/services/service.js';
import type { ProjectId, ProjectEntity, CreateProjectOptions } from './types.js';
import { ProjectNotFoundError } from './errors.js';

function brand(id: string): ProjectId { return id as ProjectId; }

export class ProjectRuntime implements Service {
  readonly name = 'ProjectRuntime';
  private items = new Map<ProjectId, ProjectEntity>();
  private _initialized = false;

  async initialize(): Promise<void> { this._initialized = true; }
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async shutdown(): Promise<void> { this.items.clear(); this._initialized = false; }

  get initialized(): boolean { return this._initialized; }
  get count(): number { return this.items.size; }
  create(opts: CreateProjectOptions): ProjectEntity {
    const now = new Date().toISOString() as Timestamp;
    const entity: ProjectEntity = { id: brand(crypto.randomUUID()), name: opts.name, description: opts.description ?? '', settings: opts.settings ?? {}, tags: opts.tags ?? [], createdAt: now, updatedAt: now };
    this.items.set(entity.id, entity); return entity;
  }
  getById(id: ProjectId): ProjectEntity { const item = this.items.get(id); if (!item) throw new ProjectNotFoundError(id); return item; }
  getAll(): readonly ProjectEntity[] { return [...this.items.values()]; }
  delete(id: ProjectId): void { if (!this.items.has(id)) throw new ProjectNotFoundError(id); this.items.delete(id); }
}
