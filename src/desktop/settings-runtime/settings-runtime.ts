/**
 * Settings Runtime — Implementation
 */
import type { Service } from '../../core/services/service.js';

export class SettingsRuntime implements Service {
  readonly name = 'SettingsRuntime';
  private settings = new Map<string, unknown>();
  private defaults = new Map<string, unknown>();
  private _initialized = false;

  async initialize(): Promise<void> { this._initialized = true; }
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async shutdown(): Promise<void> { this.settings.clear(); this.defaults.clear(); this._initialized = false; }

  get initialized(): boolean { return this._initialized; }
  registerDefault(key: string, value: unknown): void { this.defaults.set(key, value); }
  get<T>(key: string): T | undefined {
    if (this.settings.has(key)) return this.settings.get(key) as T | undefined;
    return this.defaults.get(key) as T | undefined;
  }
  set<T>(key: string, value: T): void { this.settings.set(key, value); }
  has(key: string): boolean { return this.settings.has(key); }
  delete(key: string): boolean { return this.settings.delete(key); }
  getAll(): ReadonlyMap<string, unknown> { return this.settings; }
  getDefaults(): ReadonlyMap<string, unknown> { return this.defaults; }
  clear(): void { this.settings.clear(); }
  exportSettings(): Record<string, unknown> { return Object.fromEntries(this.settings); }
  importSettings(data: Record<string, unknown>): void {
    for (const [k, v] of Object.entries(data)) this.settings.set(k, v);
  }
}
