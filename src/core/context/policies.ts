/**
 * Context Policies — govern context lifecycle, sizing, and merging.
 *
 * Enforces:
 * - Max context size in bytes
 * - Max entries per context
 * - TTL expiration
 * - Priority-based eviction
 * - Merge conflict resolution strategies
 *
 * Conforms to: DOM-002.000 (Domain Model)
 */
import type { Result } from '../types/common.js';
import type { UnifiedContext, ContextEntry, SerializableContext } from './types.js';
import { ContextValidationError, ContextError } from './errors.js';

/** Configuration for context lifecycle policies. */
export interface ContextPolicyConfig {
  readonly maxContextSizeBytes: number;
  readonly maxEntriesPerContext: number;
  readonly defaultTtlMs: number;
  readonly compressionThresholdBytes: number;
  readonly enablePriority: boolean;
  readonly enableExpiration: boolean;
  readonly enableMerge: boolean;
  readonly mergeConflictStrategy: 'priority-wins' | 'newest-wins' | 'manual';
}

/** Sensible defaults for context policies. */
export const DEFAULT_CONTEXT_POLICY: ContextPolicyConfig = {
  maxContextSizeBytes: 10 * 1024 * 1024, // 10 MB
  maxEntriesPerContext: 10_000,
  defaultTtlMs: 3_600_000, // 1 hour
  compressionThresholdBytes: 1024 * 1024, // 1 MB
  enablePriority: true,
  enableExpiration: true,
  enableMerge: true,
  mergeConflictStrategy: 'priority-wins',
};

/**
 * Manages context lifecycle policies.
 * Validates additions, determines eviction, handles merges.
 */
export class ContextPolicyManager {
  constructor(
    private readonly config: ContextPolicyConfig = DEFAULT_CONTEXT_POLICY,
  ) {}

  /** Check if an entry can be added to the given context. */
  canAddEntry(context: UnifiedContext, entry: ContextEntry): Result<void, ContextError> {
    // Check entry count limit
    if (context.entries.size >= this.config.maxEntriesPerContext) {
      return {
        ok: false,
        error: new ContextError(
          `Maximum entry count (${this.config.maxEntriesPerContext}) exceeded`,
          'MAX_ENTRIES_EXCEEDED',
          context.contextId,
        ),
      };
    }

    // Estimate entry size in bytes (JSON serialization)
    const entrySize = this.estimateEntrySizeBytes(entry);
    const projectedSize = context.sizeBytes + entrySize;

    // Check size limit
    if (projectedSize > this.config.maxContextSizeBytes) {
      return {
        ok: false,
        error: new ContextError(
          `Adding entry '${entry.key}' would exceed max context size ` +
          `(${projectedSize} > ${this.config.maxContextSizeBytes} bytes)`,
          'MAX_SIZE_EXCEEDED',
          context.contextId,
        ),
      };
    }

    // Check for duplicate key (merge needed)
    if (context.entries.has(entry.key)) {
      if (!this.config.enableMerge) {
        return {
          ok: false,
          error: new ContextError(
            `Duplicate key '${entry.key}' and merging is disabled`,
            'MERGE_DISABLED',
            context.contextId,
          ),
        };
      }
    }

    return { ok: true, value: undefined };
  }

  /** Check whether the context needs eviction to make room. */
  shouldEvict(context: UnifiedContext): boolean {
    const sizePressure = context.sizeBytes > this.config.compressionThresholdBytes;
    const countPressure = context.entries.size > (this.config.maxEntriesPerContext * 0.8);
    return sizePressure || countPressure;
  }

  /** Select the best entry key to evict based on policy. */
  selectEvictionCandidate(context: UnifiedContext): string | null {
    if (context.entries.size === 0) return null;

    const now = Date.now();
    let bestKey: string | null = null;
    let bestScore = Infinity;

    for (const [key, entry] of context.entries) {
      // Skip non-expirable entries if expiration is enabled
      const isExpired = this.config.enableExpiration && this.checkExpiration(entry);

      // Priority score: lower priority = more evictable (subtract from base score)
      const priorityScore = this.config.enablePriority
        ? (1000 - entry.priority)
        : 500;

      // Recency score: older = more evictable
      const entryAge = now - new Date(entry.createdAt).getTime();
      const recencyScore = Math.max(0, entryAge / 1000); // seconds

      // If expired, give maximum eviction priority
      let score: number;
      if (isExpired) {
        score = -1; // expired entries evicted first
      } else {
        score = priorityScore + recencyScore;
      }

      if (score < bestScore) {
        bestScore = score;
        bestKey = key;
      }
    }

    return bestKey;
  }

  /** Check if a context entry has expired. */
  checkExpiration(entry: ContextEntry): boolean {
    if (!this.config.enableExpiration) return false;
    if (!entry.expiresAt) return false;

    const now = Date.now();
    const expiresAt = new Date(entry.expiresAt).getTime();
    return now >= expiresAt;
  }

  /** Resolve a merge conflict between an existing entry and an incoming entry. */
  resolveMergeConflict(existing: ContextEntry, incoming: ContextEntry): ContextEntry {
    switch (this.config.mergeConflictStrategy) {
      case 'priority-wins': {
        return incoming.priority >= existing.priority ? incoming : existing;
      }
      case 'newest-wins': {
        const existingTime = new Date(existing.createdAt).getTime();
        const incomingTime = new Date(incoming.createdAt).getTime();
        return incomingTime >= existingTime ? incoming : existing;
      }
      case 'manual': {
        // Manual strategy always keeps existing; caller must handle conflict
        return existing;
      }
      default: {
        return existing;
      }
    }
  }

  /** Validate a serializable context structure. */
  validateSerializable(context: SerializableContext): Result<void, ContextValidationError> {
    const violations: string[] = [];

    if (!context.contextId || typeof context.contextId !== 'string') {
      violations.push('contextId must be a non-empty string');
    }
    if (!context.version || typeof context.version !== 'string') {
      violations.push('version must be a non-empty string');
    }
    if (!context.createdAt || typeof context.createdAt !== 'string') {
      violations.push('createdAt must be an ISO-8601 string');
    }
    if (!context.updatedAt || typeof context.updatedAt !== 'string') {
      violations.push('updatedAt must be an ISO-8601 string');
    }
    if (!Array.isArray(context.entries)) {
      violations.push('entries must be an array');
    } else {
      for (let i = 0; i < context.entries.length; i++) {
        const entry = context.entries[i]!;
        if (!entry.key || typeof entry.key !== 'string') {
          violations.push(`entries[${i}].key must be a non-empty string`);
        }
        if (entry.value === undefined) {
          violations.push(`entries[${i}].value must not be undefined`);
        }
        if (typeof entry.source !== 'string') {
          violations.push(`entries[${i}].source must be a valid ContextSource`);
        }
      }
    }
    if (typeof context.sizeBytes !== 'number' || context.sizeBytes < 0) {
      violations.push('sizeBytes must be a non-negative number');
    }

    if (violations.length > 0) {
      return {
        ok: false,
        error: new ContextValidationError(
          `Context validation failed with ${violations.length} violation(s)`,
          violations,
          context.contextId,
        ),
      };
    }

    return { ok: true, value: undefined };
  }

  /** Approximate byte size of an entry when serialized. */
  private estimateEntrySizeBytes(entry: ContextEntry): number {
    const keySize = new TextEncoder().encode(entry.key).length;
    const valueSize = new TextEncoder().encode(JSON.stringify(entry.value)).length;
    // Overhead for source enum, priority number, dates, tags
    const metadataSize = 128;
    return keySize + valueSize + metadataSize;
  }
}
