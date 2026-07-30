/**
 * Persistent Memory — Long-term, cross-session memory store.
 *
 * Survives restarts by delegating to a PersistentStorageAdapter.
 * Uses an in-memory cache with dirty-tracking for deferred writes.
 * Supports TTL-based expiration.
 *
 * Conforms to: DR-03 (Single Memory Authority), ARC-001.001
 */
import type { MemoryEntry, MemoryEntryId, SerializableMemoryEntry } from './types.js';
import { MemorySerializationError, MemoryDeserializationError } from './errors.js';

// ─── Storage Adapter Interface ────────────────────────────────

export interface PersistentStorageAdapter {
  save(key: string, data: string): Promise<void>;
  load(key: string): Promise<string | null>;
  delete(key: string): Promise<boolean>;
  keys(): Promise<readonly string[]>;
}

// ─── In-Memory Default Adapter ────────────────────────────────

export class InMemoryPersistentStorageAdapter implements PersistentStorageAdapter {
  private readonly store = new Map<string, string>();

  async save(key: string, data: string): Promise<void> {
    this.store.set(key, data);
  }

  async load(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async keys(): Promise<readonly string[]> {
    return Array.from(this.store.keys());
  }
}

// ─── Helpers ──────────────────────────────────────────────────

/** Check if an entry has expired */
function isExpired(entry: MemoryEntry): boolean {
  if (entry.expiresAt === undefined) return false;
  return Date.now() > new Date(entry.expiresAt).getTime();
}

/** Storage key prefix to avoid collision with other data */
const STORAGE_PREFIX = 'mem:';

function toStorageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

// ─── PersistentMemory ─────────────────────────────────────────

export class PersistentMemory {
  private readonly cache = new Map<string, MemoryEntry>();
  private readonly storage: PersistentStorageAdapter;
  private readonly dirty = new Set<string>();

  constructor(storage?: PersistentStorageAdapter) {
    this.storage = storage ?? new InMemoryPersistentStorageAdapter();
  }

  /**
   * Store a new entry. Marks it as dirty for deferred persistence.
   */
  async store(key: string, value: unknown, metadata?: Record<string, unknown>): Promise<MemoryEntry> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID() as unknown as MemoryEntryId;

    const entry: MemoryEntry = {
      id,
      key,
      value,
      layer: 'persistent',
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
      metadata: metadata != null ? Object.freeze({ ...metadata }) : undefined,
    };

    this.cache.set(key, entry);
    this.dirty.add(key);
    return entry;
  }

  /**
   * Retrieve an entry by key, incrementing its access count.
   * Returns null if key does not exist or entry has expired.
   */
  async retrieve(key: string): Promise<MemoryEntry | null> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached !== undefined) {
      if (isExpired(cached)) {
        this.cache.delete(key);
        this.dirty.delete(key);
        return null;
      }

      const now = new Date().toISOString();
      const updated: MemoryEntry = {
        ...cached,
        accessCount: cached.accessCount + 1,
        lastAccessedAt: now,
        updatedAt: now,
      };
      this.cache.set(key, updated);
      this.dirty.add(key);
      return updated;
    }

    // Fall back to storage
    return this.load(key);
  }

  /**
   * Update the value of an existing entry. Returns null if key doesn't exist.
   */
  async update(key: string, value: unknown): Promise<MemoryEntry | null> {
    const existing = this.cache.get(key);
    if (existing !== undefined) {
      if (isExpired(existing)) {
        this.cache.delete(key);
        this.dirty.delete(key);
        return null;
      }

      const now = new Date().toISOString();
      const updated: MemoryEntry = {
        ...existing,
        value,
        updatedAt: now,
      };
      this.cache.set(key, updated);
      this.dirty.add(key);
      return updated;
    }

    // Try loading from storage first
    const loaded = await this.load(key);
    if (loaded === null) return null;

    const now = new Date().toISOString();
    const updated: MemoryEntry = {
      ...loaded,
      value,
      updatedAt: now,
    };
    this.cache.set(key, updated);
    this.dirty.add(key);
    return updated;
  }

  /**
   * Delete an entry by key. Removes from both cache and storage.
   */
  async delete(key: string): Promise<boolean> {
    const existed = this.cache.has(key);
    this.cache.delete(key);
    this.dirty.delete(key);
    try {
      await this.storage.delete(toStorageKey(key));
    } catch {
      // Storage deletion failure is non-fatal
    }
    return existed;
  }

  /**
   * Check if a key exists in cache or storage (non-expired).
   */
  has(key: string): boolean {
    const cached = this.cache.get(key);
    if (cached !== undefined) {
      if (isExpired(cached)) {
        this.cache.delete(key);
        this.dirty.delete(key);
        return false;
      }
      return true;
    }
    // Note: does not check storage for performance; use retrieve() for that
    return false;
  }

  /**
   * Return a readonly snapshot of all cached entries.
   */
  entries_snapshot(): readonly MemoryEntry[] {
    return Array.from(this.cache.values()).filter((entry) => !isExpired(entry));
  }

  /**
   * Number of entries in cache.
   */
  size(): number {
    return this.cache.size;
  }

  // ─── Persistence ────────────────────────────────────────────

  /**
   * Flush all dirty entries to storage. Returns the count of entries flushed.
   */
  async flush(): Promise<number> {
    let count = 0;
    for (const key of this.dirty) {
      const entry = this.cache.get(key);
      if (entry === undefined) continue;
      try {
        const data = this.serializeEntry(entry);
        await this.storage.save(toStorageKey(key), data);
        count++;
      } catch (error) {
        throw new MemorySerializationError(
          `Failed to flush entry "${key}": ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    this.dirty.clear();
    return count;
  }

  /**
   * Load a single entry from storage by key.
   */
  async load(key: string): Promise<MemoryEntry | null> {
    const cached = this.cache.get(key);
    if (cached !== undefined) {
      if (isExpired(cached)) {
        this.cache.delete(key);
        this.dirty.delete(key);
        return null;
      }
      return cached;
    }

    try {
      const data = await this.storage.load(toStorageKey(key));
      if (data === null) return null;

      const entry = this.deserializeEntry(data);
      if (isExpired(entry)) {
        await this.storage.delete(toStorageKey(key));
        return null;
      }

      this.cache.set(key, entry);
      return entry;
    } catch (error) {
      if (error instanceof MemoryDeserializationError) throw error;
      throw new MemoryDeserializationError(
        `Failed to load entry "${key}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Load all entries from storage into cache. Returns count loaded.
   */
  async loadAll(): Promise<number> {
    try {
      const keys = await this.storage.keys();
      let count = 0;
      for (const rawKey of keys) {
        // Only process keys with our prefix
        if (!rawKey.startsWith(STORAGE_PREFIX)) continue;
        const key = rawKey.slice(STORAGE_PREFIX.length);
        if (this.cache.has(key)) continue;

        const data = await this.storage.load(rawKey);
        if (data === null) continue;

        try {
          const entry = this.deserializeEntry(data);
          if (isExpired(entry)) continue;
          this.cache.set(key, entry);
          count++;
        } catch {
          // Skip corrupted entries
        }
      }
      return count;
    } catch (error) {
      throw new MemoryDeserializationError(
        `Failed to load entries: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ─── TTL Support ──────────────────────────────────────────

  /**
   * Store a new entry with a time-to-live in milliseconds.
   */
  async storeWithTtl(key: string, value: unknown, ttlMs: number, metadata?: Record<string, unknown>): Promise<MemoryEntry> {
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    const id = crypto.randomUUID() as unknown as MemoryEntryId;

    const entry: MemoryEntry = {
      id,
      key,
      value,
      layer: 'persistent',
      createdAt: now,
      updatedAt: now,
      expiresAt,
      accessCount: 0,
      metadata: metadata != null ? Object.freeze({ ...metadata }) : undefined,
    };

    this.cache.set(key, entry);
    this.dirty.add(key);
    return entry;
  }

  /**
   * Get all expired cached entries (without removing them).
   */
  getExpiredEntries(): MemoryEntry[] {
    return Array.from(this.cache.values()).filter(isExpired);
  }

  /**
   * Remove expired entries from cache and storage. Returns count removed.
   */
  async purgeExpired(): Promise<number> {
    const expired: string[] = [];
    for (const [key, entry] of this.cache) {
      if (isExpired(entry)) {
        expired.push(key);
      }
    }

    for (const key of expired) {
      this.cache.delete(key);
      this.dirty.delete(key);
      try {
        await this.storage.delete(toStorageKey(key));
      } catch {
        // Non-fatal
      }
    }

    return expired.length;
  }

  // ─── Serialization ────────────────────────────────────────

  /**
   * Serialize a single MemoryEntry to a JSON string.
   */
  serializeEntry(entry: MemoryEntry): string {
    try {
      const serializable: SerializableMemoryEntry = {
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
      };
      return JSON.stringify(serializable);
    } catch (error) {
      throw new MemorySerializationError(
        `Failed to serialize entry: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Deserialize a JSON string back into a MemoryEntry.
   */
  deserializeEntry(data: string): MemoryEntry {
    try {
      const raw = JSON.parse(data) as SerializableMemoryEntry;
      return {
        id: raw.id as unknown as MemoryEntryId,
        key: raw.key,
        value: raw.value,
        layer: 'persistent',
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        expiresAt: raw.expiresAt,
        accessCount: raw.accessCount,
        lastAccessedAt: raw.lastAccessedAt,
        metadata: raw.metadata,
        sessionId: raw.sessionId,
        executionId: raw.executionId,
      };
    } catch (error) {
      throw new MemoryDeserializationError(
        `Failed to deserialize entry: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Stats for this persistent memory instance.
   */
  getStats(): { entries: number; dirtyEntries: number; expiredEntries: number } {
    let expiredEntries = 0;
    for (const entry of this.cache.values()) {
      if (isExpired(entry)) expiredEntries++;
    }
    return {
      entries: this.cache.size,
      dirtyEntries: this.dirty.size,
      expiredEntries,
    };
  }
}
