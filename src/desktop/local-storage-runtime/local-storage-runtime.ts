/**
 * Local Storage Runtime — Implementation
 */
import type { Service } from '../../core/services/service.js';

export class LocalStorageRuntime implements Service {
  readonly name = 'LocalStorageRuntime';
  private store = new Map<string, unknown>();
  private _initialized = false;

  async initialize(): Promise<void> { this._initialized = true; }
  async start(): Promise<void> {}
  async stop(): Promise<void> { this.store.clear(); }
  async shutdown(): Promise<void> { this.store.clear(); this._initialized = false; }

  get initialized(): boolean { return this._initialized; }
  get<T>(key: string): T | undefined { return this.store.get(key) as T | undefined; }
  set<T>(key: string, value: T): void { this.store.set(key, value); }
  has(key: string): boolean { return this.store.has(key); }
  delete(key: string): boolean { return this.store.delete(key); }
  clear(): void { this.store.clear(); }
  get size(): number { return this.store.size; }
  keys(): readonly string[] { return [...this.store.keys()]; }
  entries(): readonly [string, unknown][] { return [...this.store.entries()]; }
}
