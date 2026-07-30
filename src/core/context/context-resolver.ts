/**
 * Context Resolver — Resolves and queries context entries by various criteria.
 *
 * Provides typed accessors for looking up entries within a UnifiedContext:
 * - By key
 * - By source
 * - By minimum priority
 * - By tag
 * - Expired entries
 *
 * Conforms to: DOM-002.000 (Domain Model)
 */
import type { UnifiedContext, ContextEntry } from './types.js';
import { ContextSource } from './types.js';
import { ContextPolicyManager } from './policies.js';

/**
 * Resolves context entries by various predicates.
 * Stateless query interface over a UnifiedContext.
 */
export class ContextResolver {
  private readonly policyManager: ContextPolicyManager;

  constructor(policyManager?: ContextPolicyManager) {
    this.policyManager = policyManager ?? new ContextPolicyManager();
  }

  /** Resolve a single entry by key. Returns undefined if not found. */
  resolve(context: UnifiedContext, key: string): ContextEntry | undefined {
    return context.entries.get(key);
  }

  /** Resolve all entries from a specific source. */
  resolveBySource(context: UnifiedContext, source: ContextSource): ContextEntry[] {
    const results: ContextEntry[] = [];
    for (const entry of context.entries.values()) {
      if (entry.source === source) {
        results.push(entry);
      }
    }
    return results;
  }

  /**
   * Resolve all entries at or above a minimum priority level.
   * Entries are returned sorted by priority descending.
   */
  resolveByPriority(context: UnifiedContext, minPriority: number): ContextEntry[] {
    const results: ContextEntry[] = [];
    for (const entry of context.entries.values()) {
      if (entry.priority >= minPriority) {
        results.push(entry);
      }
    }
    // Sort by priority descending (highest first)
    results.sort((a, b) => b.priority - a.priority);
    return results;
  }

  /** Resolve all entries that have a specific tag. */
  resolveByTag(context: UnifiedContext, tag: string): ContextEntry[] {
    const results: ContextEntry[] = [];
    for (const entry of context.entries.values()) {
      if (entry.tags?.includes(tag)) {
        results.push(entry);
      }
    }
    return results;
  }

  /** Resolve all entries that have expired based on the policy's TTL settings. */
  resolveExpired(context: UnifiedContext): ContextEntry[] {
    const results: ContextEntry[] = [];
    for (const entry of context.entries.values()) {
      if (this.policyManager.checkExpiration(entry)) {
        results.push(entry);
      }
    }
    return results;
  }

  /**
   * Search entries by a custom predicate.
   * Returns all entries for which the predicate returns true.
   */
  resolveWhere(context: UnifiedContext, predicate: (entry: ContextEntry) => boolean): ContextEntry[] {
    const results: ContextEntry[] = [];
    for (const entry of context.entries.values()) {
      if (predicate(entry)) {
        results.push(entry);
      }
    }
    return results;
  }

  /** Get all unique tags across all entries in the context. */
  getUniqueTags(context: UnifiedContext): string[] {
    const tagSet = new Set<string>();
    for (const entry of context.entries.values()) {
      if (entry.tags) {
        for (const tag of entry.tags) {
          tagSet.add(tag);
        }
      }
    }
    return Array.from(tagSet).sort();
  }

  /** Get all unique sources represented in the context. */
  getUniqueSources(context: UnifiedContext): ContextSource[] {
    const sourceSet = new Set<ContextSource>();
    for (const entry of context.entries.values()) {
      sourceSet.add(entry.source);
    }
    return Array.from(sourceSet);
  }
}
