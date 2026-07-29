/**
 * Context Engine — Main orchestrator for the Context subsystem.
 *
 * Ties together:
 * - ContextBuilder: builds context from source providers
 * - ContextResolver: queries context entries
 * - ContextSerializer: serialization/deserialization
 * - ContextSnapshotManager: point-in-time snapshots
 * - ContextCache: in-memory LRU cache
 * - ContextLoader: file-based persistence (ADR-004)
 * - ContextPolicyManager: lifecycle policies
 *
 * Publishes domain events for all state changes via the Event Bus.
 *
 * Conforms to: DOM-002.000 (Domain Model), ADR-002 (Event Bus), ADR-004 (File Storage)
 */
import type { EventBus } from '../events/event-bus.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type {
  UnifiedContext,
  ContextEntry,
  ContextVersion,
} from './types.js';
import { ContextSource } from './types.js';
import { ContextBuilder, type ContextSourceProvider } from './context-builder.js';
import { ContextResolver } from './context-resolver.js';
import { ContextSerializer } from './context-serializer.js';
import { ContextSnapshotManager, type ContextSnapshot } from './context-snapshot.js';
import { ContextCache } from './context-cache.js';
import { ContextLoader, InMemoryContextStorageAdapter } from './context-loader.js';
import type { ContextStorageAdapter } from './context-loader.js';
import { ContextPolicyManager, DEFAULT_CONTEXT_POLICY } from './policies.js';
import type { ContextPolicyConfig } from './policies.js';
import {
  ContextCreated,
  ContextUpdated,
  ContextCleared,
  ContextSerialized,
  ContextDeserialized,
  ContextEntryEvicted,
  createContextEventBase,
} from './events.js';
import { EventClassification } from '../types/common.js';
import {
  ContextNotFoundError,
} from './errors.js';

/** Configuration for the ContextEngine. */
export interface ContextEngineConfig {
  readonly eventBus?: EventBus;
  readonly policyConfig?: Partial<ContextPolicyConfig>;
  readonly cacheSize?: number;
  readonly storageAdapter?: ContextStorageAdapter;
}

/** Extracted change tracking for update events. */
interface ChangeTracker {
  readonly addedKeys: string[];
  readonly removedKeys: string[];
  readonly updatedKeys: string[];
}

/**
 * Main orchestrator for the Context subsystem.
 * Provides a unified API for building, updating, querying, snapshotting,
 * caching, and persisting context.
 */
export class ContextEngine {
  private readonly builder: ContextBuilder;
  private readonly resolver: ContextResolver;
  private readonly serializer: ContextSerializer;
  private readonly snapshotManager: ContextSnapshotManager;
  private readonly cache: ContextCache;
  private readonly loader: ContextLoader;
  private readonly policyManager: ContextPolicyManager;
  private readonly contexts = new Map<string, UnifiedContext>();
  private readonly eventBus?: EventBus;

  constructor(config: ContextEngineConfig = {}) {
    const mergedPolicy = {
      ...DEFAULT_CONTEXT_POLICY,
      ...config.policyConfig,
    };
    this.policyManager = new ContextPolicyManager(mergedPolicy);
    this.builder = new ContextBuilder(this.policyManager);
    this.resolver = new ContextResolver(this.policyManager);
    this.serializer = new ContextSerializer();
    this.snapshotManager = new ContextSnapshotManager(config.eventBus);
    this.cache = new ContextCache(config.cacheSize ?? 100);
    this.eventBus = config.eventBus;

    const storage = config.storageAdapter ?? new InMemoryContextStorageAdapter();
    this.loader = new ContextLoader(this.serializer, storage);
  }

  /**
   * Register a context source provider.
   * Providers contribute entries when buildContext() is called.
   */
  registerProvider(provider: ContextSourceProvider): void {
    this.builder.registerProvider(provider);
  }

  /**
   * Build a new UnifiedContext from all registered providers.
   * The context is stored in the engine and cached for fast lookup.
   */
  async buildContext(
    sessionId?: string,
    executionId?: string,
  ): Promise<UnifiedContext> {
    // Evict expired entries from all existing contexts
    this.evictExpiredFromAll();

    const context = await this.builder.build(sessionId, executionId);

    // Store in the engine's context map
    this.contexts.set(context.contextId, context);

    // Cache it
    this.cache.set(context.contextId, context);

    // Publish event
    await this.publishEvent<ContextCreated>({
      ...createContextEventBase(
        'ContextCreated',
        EventClassification.StateChange,
        context.contextId,
      ),
      eventType: 'ContextCreated',
      classification: EventClassification.StateChange,
      payload: {
        contextId: context.contextId,
        version: context.version,
        entryCount: context.entries.size,
        sizeBytes: context.sizeBytes,
        sessionId: context.sessionId,
        executionId: context.executionId,
        createdAt: context.createdAt,
      },
    });

    return context;
  }

  /**
   * Update an existing context with new or modified entries.
   * Handles merges, eviction, and publishes change events.
   */
  async updateContext(
    contextId: string,
    entries: ReadonlyArray<ContextEntry>,
  ): Promise<UnifiedContext> {
    const context = this.getContext(contextId);
    if (!context) {
      throw new ContextNotFoundError(contextId);
    }

    const previousVersion = context.version;

    // Apply entries: add or merge
    const newEntries = new Map(context.entries);
    const changes: ChangeTracker = {
      addedKeys: [],
      removedKeys: [],
      updatedKeys: [],
    };

    for (const entry of entries) {
      const existing = newEntries.get(entry.key);

      // Check policy before adding
      const checkResult = this.policyManager.canAddEntry(context, entry);
      if (!checkResult.ok) {
        // If we can't add, try eviction first
        if (this.policyManager.shouldEvict(context)) {
          const evictKey = this.policyManager.selectEvictionCandidate(context);
          if (evictKey !== null) {
            newEntries.delete(evictKey);
            changes.removedKeys.push(evictKey);

            await this.publishEvent<ContextEntryEvicted>({
              ...createContextEventBase(
                'ContextEntryEvicted',
                EventClassification.Info,
                context.contextId,
              ),
              eventType: 'ContextEntryEvicted',
              classification: EventClassification.Info,
              payload: {
                contextId: context.contextId,
                evictedKey: evictKey,
                reason: 'eviction-to-make-room',
                source: newEntries.get(evictKey)?.source,
                priority: newEntries.get(evictKey)?.priority,
                evictedAt: new Date().toISOString(),
              },
            });
          }
        }
      }

      if (existing) {
        const resolved = this.policyManager.resolveMergeConflict(existing, entry);
        newEntries.set(entry.key, resolved);
        changes.updatedKeys.push(entry.key);
      } else {
        newEntries.set(entry.key, entry);
        changes.addedKeys.push(entry.key);
      }
    }

    // Evict expired entries
    for (const [key, entry] of newEntries) {
      if (this.policyManager.checkExpiration(entry)) {
        newEntries.delete(key);
        changes.removedKeys.push(key);
      }
    }

    // Run eviction if needed
    let tempContext: UnifiedContext = this.rebuildContext(context, newEntries);
    while (this.policyManager.shouldEvict(tempContext)) {
      const evictKey = this.policyManager.selectEvictionCandidate(tempContext);
      if (evictKey === null) break;
      newEntries.delete(evictKey);
      changes.removedKeys.push(evictKey);

      await this.publishEvent<ContextEntryEvicted>({
        ...createContextEventBase(
          'ContextEntryEvicted',
          EventClassification.Info,
          context.contextId,
        ),
        eventType: 'ContextEntryEvicted',
        classification: EventClassification.Info,
        payload: {
          contextId: context.contextId,
          evictedKey: evictKey,
          reason: 'policy-eviction',
          evictedAt: new Date().toISOString(),
        },
      });

      tempContext = this.rebuildContext(context, newEntries);
    }

    // Rebuild the context with new entries
    const updatedContext = this.rebuildContext(context, newEntries);

    // Store and cache
    this.contexts.set(updatedContext.contextId, updatedContext);
    this.cache.set(updatedContext.contextId, updatedContext);

    // Publish event
    await this.publishEvent<ContextUpdated>({
      ...createContextEventBase(
        'ContextUpdated',
        EventClassification.StateChange,
        context.contextId,
      ),
      eventType: 'ContextUpdated',
      classification: EventClassification.StateChange,
      payload: {
        contextId: updatedContext.contextId,
        previousVersion,
        newVersion: updatedContext.version,
        addedKeys: changes.addedKeys,
        removedKeys: changes.removedKeys,
        updatedKeys: changes.updatedKeys,
        entryCount: updatedContext.entries.size,
        sizeBytes: updatedContext.sizeBytes,
        updatedAt: updatedContext.updatedAt,
      },
    });

    return updatedContext;
  }

  /**
   * Clear all entries from a context, keeping the context shell.
   */
  clearContext(contextId: string): void {
    const context = this.getContext(contextId);
    if (!context) {
      throw new ContextNotFoundError(contextId);
    }

    const clearedContext: UnifiedContext = {
      ...context,
      entries: new Map(),
      updatedAt: new Date().toISOString(),
      sizeBytes: 0,
    };

    this.contexts.set(contextId, clearedContext);
    this.cache.set(contextId, clearedContext);

    // Publish event
    void this.publishEvent<ContextCleared>({
      ...createContextEventBase(
        'ContextCleared',
        EventClassification.StateChange,
        contextId,
      ),
      eventType: 'ContextCleared',
      classification: EventClassification.StateChange,
      payload: {
        contextId,
        clearedEntryCount: context.entries.size,
        clearedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Create a snapshot of a context for later restoration.
   */
  createSnapshot(
    contextId: string,
    trigger: ContextSnapshot['trigger'],
  ): ContextSnapshot | null {
    const context = this.getContext(contextId);
    if (!context) return null;

    return this.snapshotManager.createSnapshot(context, trigger);
  }

  /**
   * Restore a context from a previously created snapshot.
   */
  restoreFromSnapshot(snapshot: ContextSnapshot): UnifiedContext {
    const context = this.snapshotManager.restoreFromSnapshot(snapshot);

    // Store and cache the restored context
    this.contexts.set(context.contextId, context);
    this.cache.set(context.contextId, context);

    return context;
  }

  /**
   * Save a context to persistent storage.
   */
  async saveContext(contextId: string, path: string): Promise<void> {
    const context = this.getContext(contextId);
    if (!context) {
      throw new ContextNotFoundError(contextId);
    }

    await this.loader.saveContext(path, context);

    // Publish event
    await this.publishEvent<ContextSerialized>({
      ...createContextEventBase(
        'ContextSerialized',
        EventClassification.Info,
        context.contextId,
      ),
      eventType: 'ContextSerialized',
      classification: EventClassification.Info,
      payload: {
        contextId: context.contextId,
        version: context.version,
        sizeBytes: context.sizeBytes,
        serializedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Load a context from persistent storage.
   */
  async loadContext(path: string): Promise<UnifiedContext> {
    const context = await this.loader.loadContext(path);

    // Store and cache
    this.contexts.set(context.contextId, context);
    this.cache.set(context.contextId, context);

    // Publish event
    await this.publishEvent<ContextDeserialized>({
      ...createContextEventBase(
        'ContextDeserialized',
        EventClassification.Info,
        context.contextId,
      ),
      eventType: 'ContextDeserialized',
      classification: EventClassification.Info,
      payload: {
        contextId: context.contextId,
        version: context.version,
        entryCount: context.entries.size,
        deserializedAt: new Date().toISOString(),
      },
    });

    return context;
  }

  /**
   * Get a context by ID. Checks cache first, then in-memory store.
   */
  getContext(contextId: string): UnifiedContext | null {
    // Check cache first
    const cached = this.cache.get(contextId);
    if (cached) return cached;

    // Fall back to in-memory store
    const context = this.contexts.get(contextId) ?? null;
    if (context) {
      // Warm the cache
      this.cache.set(contextId, context);
    }
    return context;
  }

  // ─── Resolver delegates ────────────────────────────────────

  /** Resolve a single entry by key. */
  resolve(contextId: string, key: string): ContextEntry | undefined {
    const context = this.getContext(contextId);
    if (!context) return undefined;
    return this.resolver.resolve(context, key);
  }

  /** Resolve all entries from a specific source. */
  resolveBySource(contextId: string, source: ContextSource): ContextEntry[] {
    const context = this.getContext(contextId);
    if (!context) return [];
    return this.resolver.resolveBySource(context, source);
  }

  /** Resolve all entries with a specific tag. */
  resolveByTag(contextId: string, tag: string): ContextEntry[] {
    const context = this.getContext(contextId);
    if (!context) return [];
    return this.resolver.resolveByTag(context, tag);
  }

  // ─── Internal helpers ──────────────────────────────────────

  /**
   * Rebuild a UnifiedContext with new entries, preserving metadata.
   * Increments the version.
   */
  private rebuildContext(
    original: UnifiedContext,
    newEntries: Map<string, ContextEntry>,
  ): UnifiedContext {
    // Calculate size
    let sizeBytes = 0;
    for (const entry of newEntries.values()) {
      sizeBytes += this.estimateEntrySizeBytes(entry);
    }

    // Increment version
    const versionParts = original.version.split('-');
    const major = versionParts[0] ?? 'v1';
    const newVersion = `${major}-${Date.now()}` as unknown as ContextVersion;

    return {
      contextId: original.contextId,
      version: newVersion,
      createdAt: original.createdAt,
      updatedAt: new Date().toISOString(),
      entries: newEntries,
      metadata: original.metadata,
      sizeBytes,
      sessionId: original.sessionId,
      executionId: original.executionId,
    };
  }

  /** Evict expired entries from all tracked contexts. */
  private async evictExpiredFromAll(): Promise<void> {
    for (const [contextId, context] of this.contexts) {
      const expired = this.resolver.resolveExpired(context);
      if (expired.length === 0) continue;

      const newEntries = new Map(context.entries);
      for (const entry of expired) {
        newEntries.delete(entry.key);

        await this.publishEvent<ContextEntryEvicted>({
          ...createContextEventBase(
            'ContextEntryEvicted',
            EventClassification.Info,
            contextId,
          ),
          eventType: 'ContextEntryEvicted',
          classification: EventClassification.Info,
          payload: {
            contextId,
            evictedKey: entry.key,
            reason: 'ttl-expired',
            source: entry.source,
            priority: entry.priority,
            evictedAt: new Date().toISOString(),
          },
        });
      }

      const updatedContext = this.rebuildContext(context, newEntries);
      this.contexts.set(contextId, updatedContext);
      this.cache.set(contextId, updatedContext);
    }
  }

  /** Publish an event to the event bus if available. */
  private async publishEvent<T extends DomainEventBase>(event: T): Promise<void> {
    if (!this.eventBus) return;
    await this.eventBus.publish(event);
  }

  /** Approximate byte size of an entry. */
  private estimateEntrySizeBytes(entry: ContextEntry): number {
    const keySize = new TextEncoder().encode(entry.key).length;
    const valueSize = new TextEncoder().encode(JSON.stringify(entry.value)).length;
    return keySize + valueSize + 128;
  }
}
