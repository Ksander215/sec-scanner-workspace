/**
 * Session Memory — Medium-term, per-session memory store.
 *
 * Persists for the lifetime of a session. Supports optional TTL-based expiration.
 * Provides serialization/deserialization for session persistence.
 *
 * Conforms to: DR-03 (Single Memory Authority), ARC-001.001
 */
import type { MemoryEntry, MemoryEntryId, SerializableMemoryEntry } from './types.js';
import { MemorySerializationError, MemoryDeserializationError } from './errors.js';

/** Approximate byte size of a JSON-serializable value */
function estimateSize(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

/** Check if an entry has expired based on its expiresAt timestamp */
function isExpired(entry: MemoryEntry): boolean {
  if (entry.expiresAt === undefined) return false;
  return Date.now() > new Date(entry.expiresAt).getTime();
}

export class SessionMemory {
  private readonly entries = new Map<string, MemoryEntry>();
  private readonly sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
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
      layer: 'session',
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
      metadata: metadata != null ? Object.freeze({ ...metadata }) : undefined,
      sessionId: this.sessionId,
    };

    this.entries.set(key, entry);
    return entry;
  }

  /**
   * Retrieve an entry by key, incrementing its access count.
   * Returns null if key does not exist or entry has expired.
   */
  retrieve(key: string): MemoryEntry | null {
    const existing = this.entries.get(key);
    if (existing === undefined) {
      return null;
    }

    if (isExpired(existing)) {
      this.entries.delete(key);
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

    if (isExpired(existing)) {
      this.entries.delete(key);
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
   * Check if a key exists (and is not expired).
   */
  has(key: string): boolean {
    const existing = this.entries.get(key);
    if (existing === undefined) return false;
    if (isExpired(existing)) {
      this.entries.delete(key);
      return false;
    }
    return true;
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
   * Return a readonly snapshot of all non-expired entries.
   */
  entries_snapshot(): readonly MemoryEntry[] {
    const now = Date.now();
    return Array.from(this.entries.values()).filter(
      (entry) => entry.expiresAt === undefined || now <= new Date(entry.expiresAt).getTime(),
    );
  }

  /**
   * Number of entries currently stored (including expired).
   */
  size(): number {
    return this.entries.size;
  }

  /**
   * Store a new entry with a time-to-live in milliseconds.
   */
  storeWithTtl(key: string, value: unknown, ttlMs: number, metadata?: Record<string, unknown>): MemoryEntry {
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    const id = crypto.randomUUID() as unknown as MemoryEntryId;

    const entry: MemoryEntry = {
      id,
      key,
      value,
      layer: 'session',
      createdAt: now,
      updatedAt: now,
      expiresAt,
      accessCount: 0,
      metadata: metadata != null ? Object.freeze({ ...metadata }) : undefined,
      sessionId: this.sessionId,
    };

    this.entries.set(key, entry);
    return entry;
  }

  /**
   * Get all expired entries (without removing them).
   */
  getExpiredEntries(): MemoryEntry[] {
    return Array.from(this.entries.values()).filter(isExpired);
  }

  /**
   * Remove and return the count of expired entries.
   */
  purgeExpired(): number {
    let count = 0;
    for (const [key, entry] of this.entries) {
      if (isExpired(entry)) {
        this.entries.delete(key);
        count++;
      }
    }
    return count;
  }

  // ─── Serialization ────────────────────────────────────────

  /**
   * Serialize all entries to a JSON-safe array.
   */
  serialize(): ReadonlyArray<SerializableMemoryEntry> {
    return Array.from(this.entries.values()).map((entry) => ({
      id: entry.id,
      key: entry.key,
      value: entry.value,
      layer: entry.layer,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      expiresAt: entry.expiresAt,
      accessCount: entry.accessCount,
      lastAccessedAt: entry.lastAccessedAt,
      metadata: entry.metadata,
      sessionId: entry.sessionId,
      executionId: entry.executionId,
    }));
  }

  /**
   * Deserialize entries and create a new SessionMemory instance.
   * Silently skips entries that belong to a different sessionId.
   */
  static deserialize(sessionId: string, entries: ReadonlyArray<SerializableMemoryEntry>): SessionMemory {
    const memory = new SessionMemory(sessionId);
    for (const raw of entries) {
      // Only restore entries that belong to this session
      if (raw.sessionId !== undefined && raw.sessionId !== sessionId) {
        continue;
      }

      const entry: MemoryEntry = {
        id: raw.id as unknown as MemoryEntryId,
        key: raw.key,
        value: raw.value,
        layer: 'session',
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        expiresAt: raw.expiresAt,
        accessCount: raw.accessCount,
        lastAccessedAt: raw.lastAccessedAt,
        metadata: raw.metadata,
        sessionId: raw.sessionId,
        executionId: raw.executionId,
      };

      memory.entries.set(raw.key, entry);
    }
    return memory;
  }

  /**
   * JSON serialization helper for transport.
   */
  toJSON(): string {
    try {
      return JSON.stringify(this.serialize());
    } catch (error) {
      throw new MemorySerializationError(
        `Failed to serialize session memory: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * JSON deserialization helper.
   */
  static fromJSON(sessionId: string, json: string): SessionMemory {
    try {
      const parsed = JSON.parse(json) as ReadonlyArray<SerializableMemoryEntry>;
      return SessionMemory.deserialize(sessionId, parsed);
    } catch (error) {
      if (error instanceof MemoryDeserializationError) throw error;
      throw new MemoryDeserializationError(
        `Failed to deserialize session memory: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Get the session ID this memory belongs to */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Stats for this session memory instance.
   */
  getStats(): { entries: number; sizeBytes: number; expiredEntries: number } {
    let sizeBytes = 0;
    let expiredEntries = 0;
    for (const entry of this.entries.values()) {
      sizeBytes += estimateSize(entry.value);
      if (isExpired(entry)) {
        expiredEntries++;
      }
    }
    return { entries: this.entries.size, sizeBytes, expiredEntries };
  }
}
