/**
 * Context Builder — Builds a UnifiedContext from multiple source providers.
 *
 * Aggregates entries from all registered providers, merges them by key
 * using the configured policy, and produces a single UnifiedContext.
 *
 * Conforms to: DOM-002.000 (Domain Model)
 */
import type { ContextSource, ContextEntry, ContextId, ContextVersion, UnifiedContext } from './types.js';
import { ContextPolicyManager } from './policies.js';

/**
 * Interface for context source providers.
 * Each provider contributes entries from a specific source (session, history, etc.).
 */
export interface ContextSourceProvider {
  readonly source: ContextSource;
  getEntries(sessionId?: string, executionId?: string): Promise<ReadonlyArray<ContextEntry>>;
}

/**
 * Builds unified context from multiple registered source providers.
 * Handles merging of entries with the same key across providers.
 */
export class ContextBuilder {
  private readonly providers: ContextSourceProvider[] = [];
  private readonly policyManager: ContextPolicyManager;

  constructor(policyManager?: ContextPolicyManager) {
    this.policyManager = policyManager ?? new ContextPolicyManager();
  }

  /**
   * Register a context source provider.
   * Providers are called in registration order during build.
   */
  registerProvider(provider: ContextSourceProvider): void {
    this.providers.push(provider);
  }

  /**
   * Remove all registered providers.
   */
  clearProviders(): void {
    this.providers.length = 0;
  }

  /**
   * Get the list of registered providers (read-only).
   */
  getProviders(): ReadonlyArray<ContextSourceProvider> {
    return this.providers;
  }

  /**
   * Build a UnifiedContext by gathering entries from all providers.
   *
   * 1. Gather entries from each provider (in registration order)
   * 2. Merge entries by key using policy conflict resolution
   * 3. Assign IDs, timestamps, and calculate size
   * 4. Return the immutable UnifiedContext
   */
  async build(sessionId?: string, executionId?: string): Promise<UnifiedContext> {
    const allEntries: ContextEntry[] = [];

    // Gather entries from all providers
    for (const provider of this.providers) {
      try {
        const entries = await provider.getEntries(sessionId, executionId);
        for (const entry of entries) {
          allEntries.push(entry);
        }
      } catch {
        // Provider failure doesn't abort the build; skip that source
      }
    }

    // Merge entries by key
    const mergedEntries = this.mergeEntries(allEntries);

    // Build the context
    const contextId = crypto.randomUUID() as unknown as ContextId;
    const version = `v1-${Date.now()}` as unknown as ContextVersion;
    const now = new Date().toISOString();

    const entriesMap = new Map<string, ContextEntry>();
    for (const entry of mergedEntries) {
      entriesMap.set(entry.key, entry);
    }

    // Calculate total size
    let sizeBytes = 0;
    for (const entry of entriesMap.values()) {
      sizeBytes += this.estimateEntrySizeBytes(entry);
    }

    return {
      contextId,
      version,
      createdAt: now,
      updatedAt: now,
      entries: entriesMap,
      metadata: {
        providerCount: this.providers.length,
        sourceTypes: this.providers.map((p) => p.source),
      },
      sizeBytes,
      sessionId,
      executionId,
    };
  }

  /**
   * Merge entries by key. When multiple entries share the same key,
   * resolve using the policy's merge conflict strategy.
   */
  mergeEntries(entries: ReadonlyArray<ContextEntry>): ContextEntry[] {
    const entryMap = new Map<string, ContextEntry>();

    for (const entry of entries) {
      const existing = entryMap.get(entry.key);
      if (existing) {
        // Resolve conflict using policy
        const resolved = this.policyManager.resolveMergeConflict(existing, entry);
        entryMap.set(entry.key, resolved);
      } else {
        entryMap.set(entry.key, entry);
      }
    }

    return Array.from(entryMap.values());
  }

  /** Approximate byte size of an entry. */
  private estimateEntrySizeBytes(entry: ContextEntry): number {
    const keySize = new TextEncoder().encode(entry.key).length;
    const valueSize = new TextEncoder().encode(JSON.stringify(entry.value)).length;
    return keySize + valueSize + 128; // metadata overhead
  }
}
