/**
 * Session Storage — Pluggable storage adapter with in-memory default.
 *
 * ADR-004: File persistence is future scope; this module provides the
 * abstraction boundary so persistence can be swapped without changing
 * the runtime.
 */
import type { SerializableSession } from './types.js';

/** Abstract storage adapter interface */
export interface SessionStorageAdapter {
  save(session: SerializableSession): Promise<void>;
  load(sessionId: string): Promise<SerializableSession | null>;
  delete(sessionId: string): Promise<boolean>;
  list(): Promise<readonly string[]>;
}

/**
 * In-memory session storage.
 * Suitable for single-process, non-durable use (testing, prototyping).
 */
export class InMemorySessionStorageAdapter implements SessionStorageAdapter {
  private readonly store = new Map<string, SerializableSession>();

  async save(session: SerializableSession): Promise<void> {
    this.store.set(session.id, { ...session, metadata: { ...session.metadata } });
  }

  async load(sessionId: string): Promise<SerializableSession | null> {
    const session = this.store.get(sessionId);
    if (session === undefined) {
      return null;
    }
    return { ...session, metadata: { ...session.metadata } };
  }

  async delete(sessionId: string): Promise<boolean> {
    return this.store.delete(sessionId);
  }

  async list(): Promise<readonly string[]> {
    return Array.from(this.store.keys());
  }

  /** Get the number of stored sessions (useful for testing) */
  get size(): number {
    return this.store.size;
  }

  /** Clear all stored sessions (useful for testing) */
  clear(): void {
    this.store.clear();
  }
}
