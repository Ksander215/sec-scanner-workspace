/**
 * Theme Runtime — Implementation
 */
import type { Timestamp } from '../../core/types/common.js';
import type { Service } from '../../core/services/service.js';
import type { ThemeId, ThemeEntity, CreateThemeOptions } from './types.js';
import { ThemeNotFoundError } from './errors.js';

function brand(id: string): ThemeId { return id as ThemeId; }

export class ThemeRuntime implements Service {
  readonly name = 'ThemeRuntime';
  private items = new Map<ThemeId, ThemeEntity>();
  private _initialized = false;

  async initialize(): Promise<void> { this._initialized = true; }
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async shutdown(): Promise<void> { this.items.clear(); this._initialized = false; }

  get initialized(): boolean { return this._initialized; }
  get count(): number { return this.items.size; }
  create(opts: CreateThemeOptions): ThemeEntity {
    const now = new Date().toISOString() as Timestamp;
    const entity: ThemeEntity = { id: brand(crypto.randomUUID()), name: opts.name, colors: opts.colors ?? {}, fontFamily: opts.fontFamily ?? 'sans-serif', fontSize: opts.fontSize ?? 14, isDark: opts.isDark ?? false, createdAt: now, updatedAt: now };
    this.items.set(entity.id, entity); return entity;
  }
  getById(id: ThemeId): ThemeEntity { const item = this.items.get(id); if (!item) throw new ThemeNotFoundError(id); return item; }
  getAll(): readonly ThemeEntity[] { return [...this.items.values()]; }
  delete(id: ThemeId): void { if (!this.items.has(id)) throw new ThemeNotFoundError(id); this.items.delete(id); }
}
