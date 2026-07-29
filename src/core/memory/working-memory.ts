/**
 * Working Memory — Short-term, per-execution memory store.
 *
 * Cleared when execution completes. Bound to a single executionId.
 * No expiration support — entries live for the duration of the execution.
 *
 * Conforms to: DR-03 (Single Memory Authority), ARC-001.001
 */
import type { MemoryEntry, MemoryEntryId } from './types.js';

/** Approximate byte size of a JSON-serializable value */
function estimateSize(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

export class WorkingMemory {
  private readonly entries = new Map<string, MemoryEntry>();
  private readonly executionId: string;

  constructor(executionId: string) {
    this.executionId = executionId;
  }

  /**
   * Store a new entry. Overwrites existing key with a fresh entry.
   */
  store(key: string, value: unknown, metadata?: Record<string, unknown>): MemoryEntry {
    const now = new Date().toISOString();
    const id = crypto.randomUUID() as unknown as MemoryEntryId;

    const entry: MemoryEntry = {
      id,
      key,
      value,
      layer: 'working',
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
      metadata: metadata != null ? Object.freeze({ ...metadata }) : undefined,
      executionId: this.executionId,
    };

    this.entries.set(key, entry);
    return entry;
  }

  /**
   * Retrieve an entry by key, incrementing its access count.
   * Returns null if key does not exist.
   */
  retrieve(key: string): MemoryEntry | null {
    const existing = this.entries.get(key);
    if (existing === undefined) {
      return null;
    }

    const now = new Date().toISOString();
    const updated: MemoryEntry = {
      ...existing,
      accessCount: existing.accessCount + 1,
      lastAccessedAt: now,
      updatedAt: now,
    };

    this.entries.set(key, updated);
    return updated;
  }

  /**
   * Update the value of an existing entry. Returns null if key doesn't exist.
   */
  update(key: string, value: unknown): MemoryEntry | null {
    const existing = this.entries.get(key);
    if (existing === undefined) {
      return null;
    }

    const now = new Date().toISOString();
    const updated: MemoryEntry = {
      ...existing,
      value,
      updatedAt: now,
    };

    this.entries.set(key, updated);
    return updated;
  }

  /**
   * Delete an entry by key. Returns true if the entry existed.
   */
  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  /**
   * Check if a key exists.
   */
  has(key: string): boolean {
    return this.entries.has(key);
  }

  /**
   * Clear all entries. Returns the count of entries that were removed.
   */
  clear(): number {
    const count = this.entries.size;
    this.entries.clear();
    return count;
  }

  /**
   * Return a readonly snapshot of all entries.
   */
  entries_snapshot(): readonly MemoryEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Number of entries currently stored.
   */
  size(): number {
    return this.entries.size;
  }

  /**
   * Basic stats for this working memory instance.
   */
  getStats(): { entries: number; sizeBytes: number } {
    let sizeBytes = 0;
    for (const entry of this.entries.values()) {
      sizeBytes += estimateSize(entry.value);
    }
    return { entries: this.entries.size, sizeBytes };
  }
}
