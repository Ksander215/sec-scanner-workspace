/**
 * Context Loader — Loads and saves UnifiedContext from/to serialized storage.
 *
 * Implements ADR-004 (File Storage) for context persistence.
 * Uses a pluggable storage adapter for the actual I/O operations.
 *
 * Conforms to: DOM-002.000 (Domain Model), ADR-004 (File Storage)
 */
import type { UnifiedContext } from './types.js';
import { ContextSerializer } from './context-serializer.js';
import { ContextDeserializationError, ContextSerializationError } from './errors.js';

/**
 * Pluggable storage adapter interface for context persistence.
 * Abstracts away the actual storage mechanism (file system, database, etc.).
 */
export interface ContextStorageAdapter {
  save(path: string, data: string): Promise<void>;
  load(path: string): Promise<string | null>;
  delete(path: string): Promise<boolean>;
  exists(path: string): Promise<boolean>;
  list(prefix?: string): Promise<string[]>;
}

/**
 * In-memory implementation of ContextStorageAdapter.
 * Useful for testing and in-process scenarios.
 */
export class InMemoryContextStorageAdapter implements ContextStorageAdapter {
  private readonly store = new Map<string, string>();

  async save(path: string, data: string): Promise<void> {
    this.store.set(path, data);
  }

  async load(path: string): Promise<string | null> {
    return this.store.get(path) ?? null;
  }

  async delete(path: string): Promise<boolean> {
    return this.store.delete(path);
  }

  async exists(path: string): Promise<boolean> {
    return this.store.has(path);
  }

  async list(prefix?: string): Promise<string[]> {
    const keys = Array.from(this.store.keys());
    if (!prefix) return keys;
    return keys.filter((key) => key.startsWith(prefix));
  }
}

/**
 * Loads and saves UnifiedContext instances via a storage adapter.
 * Uses ContextSerializer for the data format transformation.
 */
export class ContextLoader {
  constructor(
    private readonly serializer: ContextSerializer,
    private readonly storage: ContextStorageAdapter,
  ) {}

  /**
   * Load a UnifiedContext from storage at the given path.
   * @throws ContextNotFoundError if the path doesn't exist
   * @throws ContextDeserializationError if the data is corrupted
   */
  async loadContext(path: string): Promise<UnifiedContext> {
    const data = await this.storage.load(path);
    if (data === null) {
      throw new ContextDeserializationError(
        `No context found at path: ${path}`,
      );
    }

    // Validate before deserializing
    const validationResult = this.serializer.validate(data);
    if (!validationResult.ok) {
      throw new ContextDeserializationError(
        `Invalid context data at ${path}: ${validationResult.error.message}`,
      );
    }

    return this.serializer.fromSerializable(validationResult.value);
  }

  /**
   * Save a UnifiedContext to storage at the given path.
   * Serializes the context and delegates to the storage adapter.
   */
  async saveContext(path: string, context: UnifiedContext): Promise<void> {
    try {
      const data = this.serializer.serialize(context);
      await this.storage.save(path, data);
    } catch (error) {
      if (error instanceof ContextSerializationError) throw error;
      throw new ContextSerializationError(
        `Failed to save context ${context.contextId} to ${path}: ${error instanceof Error ? error.message : String(error)}`,
        context.contextId,
      );
    }
  }

  /**
   * Delete a context from storage at the given path.
   * Returns true if the file was deleted, false if it didn't exist.
   */
  async deleteContext(path: string): Promise<boolean> {
    return this.storage.delete(path);
  }

  /**
   * Check if a context exists at the given path.
   */
  async contextExists(path: string): Promise<boolean> {
    return this.storage.exists(path);
  }

  /**
   * List all context paths under a given prefix.
   */
  async listContexts(prefix?: string): Promise<string[]> {
    return this.storage.list(prefix);
  }
}
