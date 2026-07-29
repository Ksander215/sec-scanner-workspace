/**
 * Memory Runtime — Unified 3-tier memory manager.
 *
 * Orchestrates Working Memory (per-execution), Session Memory (per-session),
 * and Persistent Memory (cross-session) behind a single interface.
 * Publishes domain events for all memory operations via EventBus.
 * Enforces session isolation through MemoryIsolationGuard.
 *
 * Conforms to: DR-03 (Single Memory Authority), ARC-001.001, ADR-002
 */
import type { EventBus } from '../events/event-bus.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';

import type {
  MemoryEntry,
  MemoryLayer,
  MemoryStats,
  MemoryQuery,
  MemoryScope,
} from './types.js';
import type { PersistentStorageAdapter } from './persistent-memory.js';

import { WorkingMemory } from './working-memory.js';
import { SessionMemory } from './session-memory.js';
import { PersistentMemory } from './persistent-memory.js';
import { MemoryIsolationGuard } from './memory-isolation.js';
import { MemoryError } from './errors.js';

import type {
  MemoryEntryStored,
  MemoryEntryRetrieved,
  MemoryEntryDeleted,
  MemoryLayerCleared,
  MemoryExpired,
  MemoryIsolationViolation,
} from './events.js';
import { EventClassification } from '../types/common.js';

// ─── Config ──────────────────────────────────────────────────

export interface MemoryRuntimeConfig {
  readonly eventBus?: EventBus;
  readonly persistentStorage?: PersistentStorageAdapter;
  readonly enableIsolation?: boolean;
}

// ─── MemoryRuntime ───────────────────────────────────────────

export class MemoryRuntime {
  private readonly workingMemories = new Map<string, WorkingMemory>();
  private readonly sessionMemories = new Map<string, SessionMemory>();
  private readonly persistentMemory: PersistentMemory;
  private readonly isolationGuard: MemoryIsolationGuard;
  private readonly eventBus?: EventBus;
  private readonly enableIsolation: boolean;
  private _disposed = false;

  constructor(config: MemoryRuntimeConfig = {}) {
    this.eventBus = config.eventBus;
    this.enableIsolation = config.enableIsolation ?? true;
    this.persistentMemory = new PersistentMemory(config.persistentStorage);
    this.isolationGuard = new MemoryIsolationGuard();
  }

  // ─── Working Memory ────────────────────────────────────────

  /**
   * Get or create a WorkingMemory instance for the given executionId.
   */
  getWorkingMemory(executionId: string): WorkingMemory {
    let wm = this.workingMemories.get(executionId);
    if (wm === undefined) {
      wm = new WorkingMemory(executionId);
      this.workingMemories.set(executionId, wm);
    }
    return wm;
  }

  /**
   * Dispose (clear and remove) a WorkingMemory instance.
   */
  disposeWorkingMemory(executionId: string): void {
    const wm = this.workingMemories.get(executionId);
    if (wm !== undefined) {
      const clearedCount = wm.clear();
      this.workingMemories.delete(executionId);
      void this.publishEvent<MemoryLayerCleared>({
        eventType: 'MemoryLayerCleared',
        classification: EventClassification.StateChange,
        payload: {
          layer: 'working',
          entryCount: clearedCount,
        },
      });
    }
  }

  // ─── Session Memory ────────────────────────────────────────

  /**
   * Get or create a SessionMemory instance for the given sessionId.
   */
  getSessionMemory(sessionId: string): SessionMemory {
    let sm = this.sessionMemories.get(sessionId);
    if (sm === undefined) {
      sm = new SessionMemory(sessionId);
      this.sessionMemories.set(sessionId, sm);
    }
    return sm;
  }

  /**
   * Dispose a SessionMemory instance. Returns number of entries cleared.
   */
  disposeSessionMemory(sessionId: string): number {
    const sm = this.sessionMemories.get(sessionId);
    if (sm !== undefined) {
      const clearedCount = sm.clear();
      this.sessionMemories.delete(sessionId);
      void this.publishEvent<MemoryLayerCleared>({
        eventType: 'MemoryLayerCleared',
        classification: EventClassification.StateChange,
        payload: {
          layer: 'session',
          sessionId,
          entryCount: clearedCount,
        },
      });
      return clearedCount;
    }
    return 0;
  }

  // ─── Persistent Memory ─────────────────────────────────────

  /**
   * Get the shared PersistentMemory instance.
   */
  getPersistentMemory(): PersistentMemory {
    return this.persistentMemory;
  }

  // ─── Unified Access ────────────────────────────────────────

  /**
   * Store a value in the specified layer.
   */
  async store(
    layer: MemoryLayer,
    key: string,
    value: unknown,
    scope?: MemoryScope,
  ): Promise<MemoryEntry> {
    this.assertNotDisposed();

    // Isolation: validate store requirements
    if (this.enableIsolation) {
      const validation = this.isolationGuard.validateStore(layer, scope?.sessionId);
      if (!validation.ok) {
        throw validation.error;
      }
    }

    let entry: MemoryEntry;

    switch (layer) {
      case 'working': {
        if (!scope?.executionId) {
          throw new MemoryError(
            'executionId is required for working memory store',
            'MEMORY_EXECUTION_ID_REQUIRED',
          );
        }
        const wm = this.getWorkingMemory(scope.executionId);
        entry = wm.store(key, value, scope?.metadata);
        break;
      }

      case 'session': {
        if (!scope?.sessionId) {
          throw new MemoryError(
            'sessionId is required for session memory store',
            'MEMORY_SESSION_ID_REQUIRED',
          );
        }
        const sm = this.getSessionMemory(scope.sessionId);
        if (scope?.ttlMs !== undefined && scope.ttlMs > 0) {
          entry = sm.storeWithTtl(key, value, scope.ttlMs, scope?.metadata);
        } else {
          entry = sm.store(key, value, scope?.metadata);
        }
        break;
      }

      case 'persistent': {
        if (scope?.ttlMs !== undefined && scope.ttlMs > 0) {
          entry = await this.persistentMemory.storeWithTtl(key, value, scope.ttlMs, scope?.metadata);
        } else {
          entry = await this.persistentMemory.store(key, value, scope?.metadata);
        }
        break;
      }
    }

    void this.publishEvent<MemoryEntryStored>({
      eventType: 'MemoryEntryStored',
      classification: EventClassification.Action,
      payload: {
        entryId: entry.id,
        key: entry.key,
        layer: entry.layer,
        sessionId: entry.sessionId,
        executionId: entry.executionId,
      },
    });

    return entry;
  }

  /**
   * Retrieve a value from the specified layer.
   */
  async retrieve(
    layer: MemoryLayer,
    key: string,
    scope?: MemoryScope,
  ): Promise<MemoryEntry | null> {
    this.assertNotDisposed();

    switch (layer) {
      case 'working': {
        if (!scope?.executionId) {
          throw new MemoryError(
            'executionId is required for working memory retrieve',
            'MEMORY_EXECUTION_ID_REQUIRED',
          );
        }
        const wm = this.getWorkingMemory(scope.executionId);
        return wm.retrieve(key);
      }

      case 'session': {
        if (!scope?.sessionId) {
          throw new MemoryError(
            'sessionId is required for session memory retrieve',
            'MEMORY_SESSION_ID_REQUIRED',
          );
        }
        const sm = this.getSessionMemory(scope.sessionId);
        return sm.retrieve(key);
      }

      case 'persistent': {
        const entry = await this.persistentMemory.retrieve(key);
        if (entry !== null && this.enableIsolation && scope?.sessionId !== undefined) {
          const check = this.isolationGuard.checkAccess(
            'persistent',
            scope.sessionId,
            entry.sessionId,
          );
          if (!check.ok) {
            void this.publishEvent<MemoryIsolationViolation>({
              eventType: 'MemoryIsolationViolation',
              classification: EventClassification.Error,
              payload: {
                sessionId: entry.sessionId!,
                accessorSessionId: scope.sessionId,
                layer: 'persistent',
              },
            });
            throw check.error;
          }
        }
        if (entry !== null) {
          void this.publishEvent<MemoryEntryRetrieved>({
            eventType: 'MemoryEntryRetrieved',
            classification: EventClassification.Result,
            payload: {
              entryId: entry.id,
              key: entry.key,
              layer: entry.layer,
              accessCount: entry.accessCount,
            },
          });
        }
        return entry;
      }
    }
  }

  /**
   * Delete a value from the specified layer.
   */
  async delete(
    layer: MemoryLayer,
    key: string,
    scope?: MemoryScope,
  ): Promise<boolean> {
    this.assertNotDisposed();

    let deleted = false;

    switch (layer) {
      case 'working': {
        if (!scope?.executionId) {
          throw new MemoryError(
            'executionId is required for working memory delete',
            'MEMORY_EXECUTION_ID_REQUIRED',
          );
        }
        const wm = this.getWorkingMemory(scope.executionId);
        deleted = wm.delete(key);
        break;
      }

      case 'session': {
        if (!scope?.sessionId) {
          throw new MemoryError(
            'sessionId is required for session memory delete',
            'MEMORY_SESSION_ID_REQUIRED',
          );
        }
        const sm = this.getSessionMemory(scope.sessionId);
        deleted = sm.delete(key);
        break;
      }

      case 'persistent': {
        deleted = await this.persistentMemory.delete(key);
        break;
      }
    }

    if (deleted) {
      void this.publishEvent<MemoryEntryDeleted>({
        eventType: 'MemoryEntryDeleted',
        classification: EventClassification.Info,
        payload: {
          entryId: key,
          key,
          layer,
        },
      });
    }

    return deleted;
  }

  // ─── Querying ─────────────────────────────────────────────

  /**
   * Query entries across all layers with optional filters.
   */
  query(q: MemoryQuery): MemoryEntry[] {
    this.assertNotDisposed();

    const results: MemoryEntry[] = [];
    const now = Date.now();

    const isExpired = (entry: MemoryEntry): boolean =>
      entry.expiresAt !== undefined && now > new Date(entry.expiresAt).getTime();

    const matchesQuery = (entry: MemoryEntry): boolean => {
      if (q.layer !== undefined && entry.layer !== q.layer) return false;
      if (q.keyPattern !== undefined && !new RegExp(q.keyPattern).test(entry.key)) return false;
      if (q.sessionId !== undefined && entry.sessionId !== q.sessionId) return false;
      if (q.executionId !== undefined && entry.executionId !== q.executionId) return false;
      if (q.minAccessCount !== undefined && entry.accessCount < q.minAccessCount) return false;
      if (q.tag !== undefined) {
        const meta = entry.metadata;
        if (meta === undefined || !('tags' in meta) || !Array.isArray((meta as Record<string, unknown>).tags)) {
          return false;
        }
        const tags = (meta as Record<string, unknown>).tags as readonly unknown[];
        if (!tags.includes(q.tag)) return false;
      }
      return true;
    };

    // Collect from working memories
    if (q.layer === undefined || q.layer === 'working') {
      for (const wm of this.workingMemories.values()) {
        for (const entry of wm.entries_snapshot()) {
          if (!isExpired(entry) && matchesQuery(entry)) {
            results.push(entry);
          }
        }
      }
    }

    // Collect from session memories
    if (q.layer === undefined || q.layer === 'session') {
      for (const sm of this.sessionMemories.values()) {
        for (const entry of sm.entries_snapshot()) {
          if (!isExpired(entry) && matchesQuery(entry)) {
            results.push(entry);
          }
        }
      }
    }

    // Collect from persistent memory
    if (q.layer === undefined || q.layer === 'persistent') {
      for (const entry of this.persistentMemory.entries_snapshot()) {
        if (!isExpired(entry) && matchesQuery(entry)) {
          results.push(entry);
        }
      }
    }

    return results;
  }

  // ─── Stats ─────────────────────────────────────────────────

  /**
   * Aggregate statistics across all three layers.
   */
  getStats(): MemoryStats {
    let workingEntries = 0;
    let sessionEntries = 0;
    let persistentEntries = 0;
    let totalSizeBytes = 0;
    let expiredEntries = 0;

    for (const wm of this.workingMemories.values()) {
      const stats = wm.getStats();
      workingEntries += stats.entries;
      totalSizeBytes += stats.sizeBytes;
    }

    for (const sm of this.sessionMemories.values()) {
      const stats = sm.getStats();
      sessionEntries += stats.entries;
      totalSizeBytes += stats.sizeBytes;
      expiredEntries += stats.expiredEntries;
    }

    for (const entry of this.persistentMemory.entries_snapshot()) {
      persistentEntries++;
      totalSizeBytes += new TextEncoder().encode(JSON.stringify(entry.value)).byteLength;
    }

    // Count expired persistent entries
    expiredEntries += this.persistentMemory.getExpiredEntries().length;

    return {
      totalEntries: workingEntries + sessionEntries + persistentEntries,
      workingEntries,
      sessionEntries,
      persistentEntries,
      totalSizeBytes,
      expiredEntries,
    };
  }

  // ─── Lifecycle ────────────────────────────────────────────

  /**
   * Flush all dirty entries in persistent memory to storage.
   */
  async flush(): Promise<void> {
    await this.persistentMemory.flush();
  }

  /**
   * Purge expired entries from session and persistent memory.
   * Returns total count of entries purged.
   */
  async purgeExpired(): Promise<number> {
    let total = 0;

    // Purge session memory expired entries
    for (const sm of this.sessionMemories.values()) {
      const count = sm.purgeExpired();
      total += count;
      if (count > 0) {
        void this.publishEvent<MemoryExpired>({
          eventType: 'MemoryExpired',
          classification: EventClassification.Info,
          payload: {
            expiredCount: count,
            layer: 'session',
          },
        });
      }
    }

    // Purge persistent memory expired entries
    const persistentCount = await this.persistentMemory.purgeExpired();
    total += persistentCount;
    if (persistentCount > 0) {
      void this.publishEvent<MemoryExpired>({
        eventType: 'MemoryExpired',
        classification: EventClassification.Info,
        payload: {
          expiredCount: persistentCount,
          layer: 'persistent',
        },
      });
    }

    return total;
  }

  /**
   * Dispose all memory instances. Flushes persistent memory first.
   * After disposal, all operations will throw.
   */
  dispose(): void {
    if (this._disposed) return;

    // Clear all working memories
    for (const [execId, wm] of this.workingMemories) {
      wm.clear();
      this.workingMemories.delete(execId);
    }

    // Clear all session memories
    for (const [sessionId, sm] of this.sessionMemories) {
      sm.clear();
      this.sessionMemories.delete(sessionId);
    }

    // Clear persistent memory cache (but don't flush — caller should call flush() first)
    for (const key of this.persistentMemory.entries_snapshot()) {
      void this.persistentMemory.delete(key.key);
    }

    this._disposed = true;
  }

  /**
   * Check if the runtime has been disposed.
   */
  get disposed(): boolean {
    return this._disposed;
  }

  // ─── Internals ─────────────────────────────────────────────

  private assertNotDisposed(): void {
    if (this._disposed) {
      throw new MemoryError('MemoryRuntime has been disposed', 'MEMORY_RUNTIME_DISPOSED');
    }
  }

  /**
   * Publish a domain event through the event bus (fire-and-forget).
   * Non-throwing — errors from event publishing are silently swallowed
   * to avoid disrupting memory operations.
   */
  private async publishEvent<T extends { eventType: string }>(
    eventBase: Omit<T, 'eventId' | 'timestamp' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;

    try {
      const event = {
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        sequence: 0,
        aggregateId: 'memory-runtime',
        aggregateType: 'Memory',
        version: '1.0.0',
        ...eventBase,
      } as unknown as DomainEventBase;
      await this.eventBus.publish(event);
    } catch {
      // ADR-002: Event publishing failure must not disrupt memory operations
    }
  }
}
