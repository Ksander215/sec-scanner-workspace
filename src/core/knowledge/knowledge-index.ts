/**
 * Knowledge Runtime — Index Runtime
 * TASK-AIS-003E.000 — Knowledge Runtime Foundation
 *
 * Manages in-memory indexes for knowledge items across multiple index types
 * (key, namespace, tag, source, timestamp). Supports optional persistence
 * through a pluggable {@link KnowledgeStorageAdapter}.
 *
 * Internal state is a `Map<string, Map<string, KnowledgeIndexEntry>>`
 * indexed by indexType then compound key (`${indexKey}::${itemId}`).
 * Auto-rebuild of indexes is the caller's responsibility.
 */

import type { KnowledgeItem, KnowledgeItemId, KnowledgeIndexEntry, KnowledgeIndexStats } from './types.js';
import { KnowledgeIndexType, brandKnowledgeIndexEntryId } from './types.js';
import type { KnowledgeStorageAdapter } from './types.js';
import type { Timestamp } from '../types/common.js';

// ─── Configuration ────────────────────────────────────────────────────

/** Configuration for the knowledge index runtime. */
export interface KnowledgeIndexConfig {
  readonly storageAdapter?: KnowledgeStorageAdapter;
}

// ─── Constants ────────────────────────────────────────────────────────

/** Separator used in compound index keys. */
const KEY_SEPARATOR = '::' as const;

/** Default weight assigned to every index entry. */
const DEFAULT_ENTRY_WEIGHT = 1.0;

/** All index types maintained by {@link KnowledgeIndexRuntime.indexItem}. */
const MANAGED_INDEX_TYPES: readonly KnowledgeIndexType[] = [
  KnowledgeIndexType.Key,
  KnowledgeIndexType.Namespace,
  KnowledgeIndexType.Tag,
  KnowledgeIndexType.Source,
  KnowledgeIndexType.Timestamp,
] as const;

// ─── KnowledgeIndexRuntime ───────────────────────────────────────────

/**
 * Manages indexes for knowledge items.
 *
 * Maintains in-memory indexes across multiple index types (key, namespace,
 * tag, source, timestamp). Each index type maps index keys to knowledge
 * item IDs via {@link KnowledgeIndexEntry} records.
 *
 * Supports optional persistence through a {@link KnowledgeStorageAdapter}.
 * Auto-rebuild of indexes when items change is the caller's responsibility.
 */
export class KnowledgeIndexRuntime {
  private readonly storageAdapter: KnowledgeStorageAdapter | undefined;

  /**
   * Internal index state — indexed by indexType (string), then compound key.
   * Compound key format: `${indexKey}::${itemId}`.
   * This ensures uniqueness per (indexType, indexKey, itemId) triple while
   * still allowing {@link getByIndex} to filter by prefix.
   */
  private readonly indexes: Map<string, Map<string, KnowledgeIndexEntry>>;

  /** Tracks the last rebuild timestamp per index type. */
  private readonly lastRebuilt: Map<string, Timestamp>;

  constructor(config: Readonly<KnowledgeIndexConfig> = {}) {
    this.storageAdapter = config.storageAdapter;
    this.indexes = new Map();
    this.lastRebuilt = new Map();
  }

  // ─── Public API ──────────────────────────────────────────────────

  /**
   * Indexes the item across ALL managed index types.
   *
   * Creates entries for:
   * - key       → item.id
   * - namespace → item.namespaceId
   * - tag       → each tag in item.metadata.tags
   * - source    → item.metadata.source.type
   * - timestamp → item.createdAt
   *
   * Any pre-existing entries for the same item are removed first to
   * prevent stale data on re-index.
   */
  async indexItem(item: KnowledgeItem): Promise<void> {
    // Remove stale entries for this item before re-indexing
    this.removeItemEntries(item.id);

    const now = new Date().toISOString() as Timestamp;
    const indexKeys = this.extractIndexKeys(item);

    for (const { indexType, key } of indexKeys) {
      const entry = this.createEntry(indexType, key, item.id, now);
      const indexMap = this.getOrCreateIndexMap(indexType);
      const compoundKey = this.makeCompoundKey(key, item.id);
      indexMap.set(compoundKey, entry);
    }
  }

  /**
   * Removes all index entries for the given item ID from every index type.
   * Returns silently (no-op) if the item has no index entries.
   */
  async removeItem(itemId: KnowledgeItemId): Promise<void> {
    this.removeItemEntries(itemId);
  }

  /**
   * Rebuilds a specific index type from scratch using the provided items.
   * Clears all existing entries for the index type before re-creating.
   *
   * @param indexType - The index type to rebuild.
   * @param items    - The source items to index.
   * @returns The number of index entries created.
   */
  async rebuildIndex(
    indexType: KnowledgeIndexType,
    items: readonly KnowledgeItem[],
  ): Promise<number> {
    // Clear the index for this type
    this.indexes.delete(indexType);
    const indexMap = new Map<string, KnowledgeIndexEntry>();
    this.indexes.set(indexType, indexMap);

    const now = new Date().toISOString() as Timestamp;
    let count = 0;

    for (const item of items) {
      const indexKeys = this.extractIndexKeys(item);
      for (const { indexType: it, key } of indexKeys) {
        if (it === indexType) {
          const entry = this.createEntry(indexType, key, item.id, now);
          const compoundKey = this.makeCompoundKey(key, item.id);
          indexMap.set(compoundKey, entry);
          count++;
        }
      }
    }

    this.lastRebuilt.set(indexType, now);

    // Persist to storage adapter if available
    if (this.storageAdapter !== undefined) {
      await this.persistIndexType(indexType, indexMap);
    }

    return count;
  }

  /**
   * Rebuilds all managed index types from scratch using the provided items.
   * Equivalent to calling {@link rebuildIndex} for each managed type.
   */
  async rebuildAllIndexes(items: readonly KnowledgeItem[]): Promise<void> {
    for (const indexType of MANAGED_INDEX_TYPES) {
      await this.rebuildIndex(indexType, items);
    }
  }

  /**
   * Looks up item IDs by index type and key.
   *
   * @param indexType - The index type to query.
   * @param key       - The index key to look up.
   * @returns A readonly array of matching item IDs. Empty if none match.
   */
  async getByIndex(
    indexType: KnowledgeIndexType,
    key: string,
  ): Promise<readonly KnowledgeItemId[]> {
    const indexMap = this.indexes.get(indexType);
    if (indexMap === undefined) {
      return [];
    }

    const prefix = `${key}${KEY_SEPARATOR}`;
    const itemIds: KnowledgeItemId[] = [];

    for (const [compoundKey, entry] of indexMap) {
      if (compoundKey.startsWith(prefix)) {
        itemIds.push(entry.itemId);
      }
    }

    return itemIds;
  }

  /**
   * Returns index statistics for each managed index type.
   * Includes entry count and last rebuild timestamp when available.
   */
  getStats(): KnowledgeIndexStats[] {
    const stats: KnowledgeIndexStats[] = [];

    for (const indexType of MANAGED_INDEX_TYPES) {
      const indexMap = this.indexes.get(indexType);
      const entryCount = indexMap?.size ?? 0;
      const rebuilt = this.lastRebuilt.get(indexType);

      stats.push({
        indexType,
        entryCount,
        lastRebuilt: rebuilt,
      });
    }

    return stats;
  }

  /**
   * Clears all index entries and rebuild timestamps from memory.
   * Does not affect the storage adapter — callers should use
   * {@link rebuildAllIndexes} to synchronise persisted data.
   */
  async clear(): Promise<void> {
    this.indexes.clear();
    this.lastRebuilt.clear();
  }

  // ─── Private Helpers ────────────────────────────────────────────

  /**
   * Extracts all (indexType, key) pairs for the given item
   * across all managed index types.
   */
  private extractIndexKeys(
    item: KnowledgeItem,
  ): ReadonlyArray<{ readonly indexType: KnowledgeIndexType; readonly key: string }> {
    const keys: Array<{ readonly indexType: KnowledgeIndexType; readonly key: string }> = [];

    // Key index — primary lookup by item ID
    keys.push({ indexType: KnowledgeIndexType.Key, key: item.id });

    // Namespace index — isolation boundary lookup
    keys.push({ indexType: KnowledgeIndexType.Namespace, key: item.namespaceId });

    // Tag index — one entry per tag (may produce zero entries)
    for (const tag of item.metadata.tags) {
      keys.push({ indexType: KnowledgeIndexType.Tag, key: tag });
    }

    // Source index — grouped by source.type
    keys.push({ indexType: KnowledgeIndexType.Source, key: item.metadata.source.type });

    // Timestamp index — grouped by creation time
    keys.push({ indexType: KnowledgeIndexType.Timestamp, key: item.createdAt });

    return keys;
  }

  /**
   * Creates a new frozen {@link KnowledgeIndexEntry} with a unique ID.
   */
  private createEntry(
    indexType: KnowledgeIndexType,
    key: string,
    itemId: KnowledgeItemId,
    timestamp: Timestamp,
  ): KnowledgeIndexEntry {
    return Object.freeze({
      id: brandKnowledgeIndexEntryId(crypto.randomUUID()),
      indexType,
      key,
      itemId,
      weight: DEFAULT_ENTRY_WEIGHT,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  /**
   * Builds a compound key from an index key and item ID.
   * Format: `${indexKey}::${itemId}`
   */
  private makeCompoundKey(indexKey: string, itemId: KnowledgeItemId): string {
    return `${indexKey}${KEY_SEPARATOR}${itemId}`;
  }

  /**
   * Gets or creates the inner `Map` for a given index type.
   */
  private getOrCreateIndexMap(indexType: KnowledgeIndexType): Map<string, KnowledgeIndexEntry> {
    let map = this.indexes.get(indexType);
    if (map === undefined) {
      map = new Map();
      this.indexes.set(indexType, map);
    }
    return map;
  }

  /**
   * Removes all entries referencing `itemId` from every index map.
   * Cleans up empty inner maps and their rebuild timestamps.
   *
   * Used by both {@link indexItem} (to clear stale entries before
   * re-indexing) and {@link removeItem}.
   */
  private removeItemEntries(itemId: KnowledgeItemId): void {
    const suffix = `${KEY_SEPARATOR}${itemId}`;
    const emptyTypes: string[] = [];

    for (const [indexType, indexMap] of this.indexes) {
      for (const compoundKey of [...indexMap.keys()]) {
        if (compoundKey.endsWith(suffix)) {
          indexMap.delete(compoundKey);
        }
      }
      if (indexMap.size === 0) {
        emptyTypes.push(indexType);
      }
    }

    // Remove emptied maps to avoid unbounded growth
    for (const type of emptyTypes) {
      this.indexes.delete(type);
      this.lastRebuilt.delete(type);
    }
  }

  /**
   * Persists all entries for a single index type to the storage adapter.
   * Deletes existing persisted entries for the type first.
   */
  private async persistIndexType(
    indexType: KnowledgeIndexType,
    indexMap: ReadonlyMap<string, KnowledgeIndexEntry>,
  ): Promise<void> {
    const adapter = this.storageAdapter;
    if (adapter === undefined) {
      return;
    }

    await adapter.deleteIndexEntries(indexType);

    for (const entry of indexMap.values()) {
      await adapter.saveIndexEntry({
        id: entry.id as unknown as string,
        indexType: entry.indexType,
        key: entry.key,
        itemId: entry.itemId as unknown as string,
        weight: entry.weight,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      });
    }
  }
}
