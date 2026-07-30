/**
 * Search Runtime — Implementation
 */
import type { Service } from '../../core/services/service.js';

export class SearchRuntime implements Service {
  readonly name = 'SearchRuntime';
  private index = new Map<string, Map<string, Record<string, unknown>>>();
  private _initialized = false;

  async initialize(): Promise<void> { this._initialized = true; }
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async shutdown(): Promise<void> { this.index.clear(); this._initialized = false; }

  get initialized(): boolean { return this._initialized; }
  indexDocument(collection: string, id: string, data: Record<string, unknown>): void {
    if (!this.index.has(collection)) this.index.set(collection, new Map());
    this.index.get(collection)!.set(id, data);
  }
  removeFromIndex(collection: string, id: string): void { this.index.get(collection)?.delete(id); }
  search(collection: string, query: string): Record<string, unknown>[] {
    const col = this.index.get(collection);
    if (!col) return [];
    const q = query.toLowerCase();
    const results: Record<string, unknown>[] = [];
    for (const doc of col.values()) {
      if (Object.values(doc).some(v => String(v).toLowerCase().includes(q))) {
        results.push(doc);
      }
    }
    return results;
  }
  getCollectionNames(): readonly string[] { return [...this.index.keys()]; }
  getCollectionSize(collection: string): number { return this.index.get(collection)?.size ?? 0; }
  clearCollection(collection: string): void { this.index.delete(collection); }
  clearAll(): void { this.index.clear(); }
}
