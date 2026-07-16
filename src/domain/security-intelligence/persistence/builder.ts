import { PersistenceEngine } from './engine.js';
import { JsonPersistenceProvider } from './json-provider.js';
import type { PersistenceEventHandler } from './types.js';

/**
 * Builder for PersistenceEngine with dependency injection
 */
export class PersistenceBuilder {
  private dataDir = './data/si-platform';
  private eventHandlers: PersistenceEventHandler[] = [];

  withDataDir(dir: string): this {
    this.dataDir = dir;
    return this;
  }

  onEvent(handler: PersistenceEventHandler): this {
    this.eventHandlers.push(handler);
    return this;
  }

  build(): PersistenceEngine {
    const provider = new JsonPersistenceProvider(this.dataDir);
    for (const handler of this.eventHandlers) {
      provider.onEvent(handler);
    }
    return new PersistenceEngine(provider);
  }
}
