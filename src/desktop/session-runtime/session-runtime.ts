/**
 * Session Runtime — Implementation
 */
import type { Timestamp } from '../../core/types/common.js';
import type { Service } from '../../core/services/service.js';
import type { SessionId, SessionEntity, CreateSessionOptions } from './types.js';
import { SessionNotFoundError } from './errors.js';

function brand(id: string): SessionId { return id as SessionId; }

export class SessionRuntime implements Service {
  readonly name = 'SessionRuntime';
  private items = new Map<SessionId, SessionEntity>();
  private _initialized = false;

  async initialize(): Promise<void> { this._initialized = true; }
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async shutdown(): Promise<void> { this.items.clear(); this._initialized = false; }

  get initialized(): boolean { return this._initialized; }
  get count(): number { return this.items.size; }
  create(opts: CreateSessionOptions): SessionEntity {
    const now = new Date().toISOString() as Timestamp;
    const entity: SessionEntity = { id: brand(crypto.randomUUID()), userId: opts.userId, identitySnapshot: opts.identitySnapshot ?? {}, metadata: {}, createdAt: now, updatedAt: now };
    this.items.set(entity.id, entity); return entity;
  }
  getById(id: SessionId): SessionEntity { const item = this.items.get(id); if (!item) throw new SessionNotFoundError(id); return item; }
  getAll(): readonly SessionEntity[] { return [...this.items.values()]; }
  delete(id: SessionId): void { if (!this.items.has(id)) throw new SessionNotFoundError(id); this.items.delete(id); }
}
