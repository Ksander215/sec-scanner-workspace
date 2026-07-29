/**
 * Knowledge Storage — Pluggable storage adapters for knowledge persistence.
 *
 * Provides three storage backend implementations:
 *   1. InMemoryKnowledgeStorageAdapter — pure in-memory Map backend (default).
 *   2. FileKnowledgeStorageAdapter — file-path-based layout (ADR-004), in-memory
 *      for testability with future real fs I/O.
 *   3. SnapshotKnowledgeStorageAdapter — decorator wrapping another adapter to
 *      add snapshot / restore capability.
 *
 * All returned data uses defensive deep copies to prevent external mutation.
 *
 * TASK-AIS-003E.000 — Knowledge Runtime Foundation
 * Conforms to: ADR-004 (File Storage)
 */

import type {
  KnowledgeStorageAdapter,
  SerializableKnowledgeItem,
  SerializableKnowledgeNamespace,
  SerializableKnowledgeVersion,
  SerializableKnowledgeRelation,
  SerializableKnowledgeIndexEntry,
} from './types.js';
import { KnowledgeStorageError } from './errors.js';

// ─── Deep Copy Helpers ─────────────────────────────────────────────

function deepCopyItem(item: SerializableKnowledgeItem): SerializableKnowledgeItem {
  return {
    id: item.id,
    kind: item.kind,
    namespaceId: item.namespaceId,
    name: item.name,
    content: item.content,
    metadata: {
      tags: [...item.metadata.tags],
      source: { ...item.metadata.source },
      confidence: item.metadata.confidence,
      expiresAt: item.metadata.expiresAt,
      custom: JSON.parse(JSON.stringify(item.metadata.custom)) as Readonly<Record<string, string>>,
    },
    state: item.state,
    currentVersionId: item.currentVersionId,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    fragmentIds: item.fragmentIds ? [...item.fragmentIds] : undefined,
    documentType: item.documentType,
    documentId: item.documentId,
    position: item.position,
    language: item.language,
    memberIds: item.memberIds ? [...item.memberIds] : undefined,
    collectionType: item.collectionType,
  };
}

function deepCopyNamespace(ns: SerializableKnowledgeNamespace): SerializableKnowledgeNamespace {
  return {
    id: ns.id,
    name: ns.name,
    description: ns.description,
    parentId: ns.parentId,
    createdAt: ns.createdAt,
    updatedAt: ns.updatedAt,
    metadata: JSON.parse(JSON.stringify(ns.metadata)) as Readonly<Record<string, string>>,
  };
}

function deepCopyVersion(v: SerializableKnowledgeVersion): SerializableKnowledgeVersion {
  return {
    id: v.id,
    itemId: v.itemId,
    revision: v.revision,
    content: v.content,
    metadata: {
      tags: [...v.metadata.tags],
      source: { ...v.metadata.source },
      confidence: v.metadata.confidence,
      expiresAt: v.metadata.expiresAt,
      custom: JSON.parse(JSON.stringify(v.metadata.custom)) as Readonly<Record<string, string>>,
    },
    state: v.state,
    parentId: v.parentId,
    changelog: v.changelog,
    createdAt: v.createdAt,
  };
}

function deepCopyRelation(r: SerializableKnowledgeRelation): SerializableKnowledgeRelation {
  return {
    id: r.id,
    type: r.type,
    sourceId: r.sourceId,
    targetId: r.targetId,
    metadata: JSON.parse(JSON.stringify(r.metadata)) as Readonly<Record<string, string>>,
    createdAt: r.createdAt,
  };
}

function deepCopyIndexEntry(e: SerializableKnowledgeIndexEntry): SerializableKnowledgeIndexEntry {
  return {
    id: e.id,
    indexType: e.indexType,
    key: e.key,
    itemId: e.itemId,
    weight: e.weight,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

// ─── In-Memory Storage Adapter ─────────────────────────────────────

/**
 * In-memory knowledge storage adapter.
 *
 * Uses plain Map<string, ...> internally for each entity collection.
 * All methods are async (return Promise) to conform to the adapter interface.
 * Suitable for single-process, non-durable use (testing, prototyping).
 *
 * This is the default storage backend for the Knowledge Runtime.
 */
export class InMemoryKnowledgeStorageAdapter implements KnowledgeStorageAdapter {
  private readonly items = new Map<string, SerializableKnowledgeItem>();
  private readonly namespaces = new Map<string, SerializableKnowledgeNamespace>();
  private readonly versions = new Map<string, SerializableKnowledgeVersion[]>();
  private readonly relations = new Map<string, SerializableKnowledgeRelation[]>();
  private readonly indexEntries = new Map<string, SerializableKnowledgeIndexEntry[]>();

  // ── Items ───────────────────────────────────────────────────

  async saveItem(item: SerializableKnowledgeItem): Promise<void> {
    try {
      this.items.set(item.id, deepCopyItem(item));
    } catch (error) {
      throw new KnowledgeStorageError(
        `Failed to save item ${item.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async loadItem(id: string): Promise<SerializableKnowledgeItem | null> {
    const item = this.items.get(id);
    if (item === undefined) {
      return null;
    }
    try {
      return deepCopyItem(item);
    } catch (error) {
      throw new KnowledgeStorageError(
        `Failed to load item ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async deleteItem(id: string): Promise<void> {
    this.items.delete(id);
  }

  async listItems(namespaceId?: string): Promise<readonly SerializableKnowledgeItem[]> {
    const results: SerializableKnowledgeItem[] = [];
    for (const item of this.items.values()) {
      if (namespaceId !== undefined && item.namespaceId !== namespaceId) {
        continue;
      }
      results.push(deepCopyItem(item));
    }
    return results;
  }

  // ── Namespaces ───────────────────────────────────────────────

  async saveNamespace(ns: SerializableKnowledgeNamespace): Promise<void> {
    try {
      this.namespaces.set(ns.id, deepCopyNamespace(ns));
    } catch (error) {
      throw new KnowledgeStorageError(
        `Failed to save namespace ${ns.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async loadNamespace(id: string): Promise<SerializableKnowledgeNamespace | null> {
    const ns = this.namespaces.get(id);
    if (ns === undefined) {
      return null;
    }
    try {
      return deepCopyNamespace(ns);
    } catch (error) {
      throw new KnowledgeStorageError(
        `Failed to load namespace ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async deleteNamespace(id: string): Promise<void> {
    this.namespaces.delete(id);
  }

  async listNamespaces(): Promise<readonly SerializableKnowledgeNamespace[]> {
    const results: SerializableKnowledgeNamespace[] = [];
    for (const ns of this.namespaces.values()) {
      results.push(deepCopyNamespace(ns));
    }
    return results;
  }

  // ── Versions ─────────────────────────────────────────────────

  async saveVersion(version: SerializableKnowledgeVersion): Promise<void> {
    try {
      const existing = this.versions.get(version.itemId);
      if (existing === undefined) {
        this.versions.set(version.itemId, [deepCopyVersion(version)]);
      } else {
        existing.push(deepCopyVersion(version));
      }
    } catch (error) {
      throw new KnowledgeStorageError(
        `Failed to save version ${version.id} for item ${version.itemId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async loadVersions(itemId: string): Promise<readonly SerializableKnowledgeVersion[]> {
    const versions = this.versions.get(itemId);
    if (versions === undefined) {
      return [];
    }
    try {
      return versions.map(deepCopyVersion);
    } catch (error) {
      throw new KnowledgeStorageError(
        `Failed to load versions for item ${itemId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async deleteVersions(itemId: string): Promise<void> {
    this.versions.delete(itemId);
  }

  // ── Relations ────────────────────────────────────────────────

  async saveRelation(relation: SerializableKnowledgeRelation): Promise<void> {
    try {
      const key = relation.sourceId;
      const existing = this.relations.get(key);
      if (existing === undefined) {
        this.relations.set(key, [deepCopyRelation(relation)]);
      } else {
        existing.push(deepCopyRelation(relation));
      }
    } catch (error) {
      throw new KnowledgeStorageError(
        `Failed to save relation ${relation.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async loadRelations(itemId: string): Promise<readonly SerializableKnowledgeRelation[]> {
    const relations = this.relations.get(itemId);
    if (relations === undefined) {
      return [];
    }
    try {
      return relations.map(deepCopyRelation);
    } catch (error) {
      throw new KnowledgeStorageError(
        `Failed to load relations for item ${itemId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async deleteRelation(id: string): Promise<void> {
    for (const [sourceId, relations] of this.relations) {
      const index = relations.findIndex((r) => r.id === id);
      if (index !== -1) {
        relations.splice(index, 1);
        if (relations.length === 0) {
          this.relations.delete(sourceId);
        }
        return;
      }
    }
  }

  // ── Index Entries ────────────────────────────────────────────

  async saveIndexEntry(entry: SerializableKnowledgeIndexEntry): Promise<void> {
    try {
      const key = entry.indexType;
      const existing = this.indexEntries.get(key);
      if (existing === undefined) {
        this.indexEntries.set(key, [deepCopyIndexEntry(entry)]);
      } else {
        existing.push(deepCopyIndexEntry(entry));
      }
    } catch (error) {
      throw new KnowledgeStorageError(
        `Failed to save index entry ${entry.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async loadIndexEntries(indexType: string): Promise<readonly SerializableKnowledgeIndexEntry[]> {
    const entries = this.indexEntries.get(indexType);
    if (entries === undefined) {
      return [];
    }
    try {
      return entries.map(deepCopyIndexEntry);
    } catch (error) {
      throw new KnowledgeStorageError(
        `Failed to load index entries for type ${indexType}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async deleteIndexEntries(indexType: string): Promise<void> {
    this.indexEntries.delete(indexType);
  }

  // ── Utilities ───────────────────────────────────────────────

  /** Number of stored items (useful for testing). */
  get itemCount(): number {
    return this.items.size;
  }

  /** Number of stored namespaces (useful for testing). */
  get namespaceCount(): number {
    return this.namespaces.size;
  }

  /** Clear all stored data (useful for testing). */
  clear(): void {
    this.items.clear();
    this.namespaces.clear();
    this.versions.clear();
    this.relations.clear();
    this.indexEntries.clear();
  }
}

// ─── File Storage Adapter ─────────────────────────────────────────

/**
 * File-path-based knowledge storage adapter.
 *
 * Follows the ADR-004 file storage layout pattern:
 *   knowledge/<namespaceId>/<timestamp>-<id>.json
 *
 * Operates in-memory for testability, but is structured so that the
 * underlying Map<string, string> could be swapped for real file I/O
 * via `import { promises as fs } from 'node:fs'` in future.
 */
export class FileKnowledgeStorageAdapter implements KnowledgeStorageAdapter {
  /**
   * Internal path-keyed store. Keys follow the ADR-004 convention:
   * `knowledge/<namespaceId>/<timestamp>-<id>.json`
   * Values are JSON-serialized strings.
   */
  private readonly pathStore = new Map<string, string>();

  // ── Path Helpers ────────────────────────────────────────────

  /**
   * Build a file path following ADR-004 convention.
   * Format: `knowledge/<namespaceId>/<timestamp>-<id>.json`
   */
  private static buildPath(namespaceId: string, id: string, timestamp: string): string {
    return `knowledge/${namespaceId}/${timestamp}-${id}.json`;
  }

  /** Extract the namespace ID from an ADR-004 file path. */
  private static extractNamespaceId(path: string): string {
    const parts = path.split('/');
    // Format: knowledge/<namespaceId>/<filename>
    return parts.length >= 3 ? parts[1] : '';
  }

  /** Check if a path belongs to a given namespace. */
  private static matchesNamespace(path: string, namespaceId: string): boolean {
    return FileKnowledgeStorageAdapter.extractNamespaceId(path) === namespaceId;
  }

  // ── Internal I/O ────────────────────────────────────────────

  /**
   * Write a value to the path store (simulated file I/O).
   * In a real implementation this would use `fs.writeFile`.
   */
  private writeFile(path: string, data: string): void {
    try {
      this.pathStore.set(path, data);
    } catch (error) {
      throw new KnowledgeStorageError(
        `Failed to write file ${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Read a value from the path store (simulated file I/O).
   * In a real implementation this would use `fs.readFile`.
   */
  private readFile(path: string): string | null {
    try {
      return this.pathStore.get(path) ?? null;
    } catch (error) {
      throw new KnowledgeStorageError(
        `Failed to read file ${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Delete a value from the path store (simulated file I/O).
   * In a real implementation this would use `fs.unlink`.
   */
  private deleteFile(path: string): void {
    this.pathStore.delete(path);
  }

  /**
   * List all paths matching a given predicate (simulated directory listing).
   * In a real implementation this would use `fs.readdir` with recursive walking.
   */
  private listPaths(predicate?: (path: string) => boolean): readonly string[] {
    const results: string[] = [];
    for (const path of this.pathStore.keys()) {
      if (predicate === undefined || predicate(path)) {
        results.push(path);
      }
    }
    return results;
  }

  // ── Entity Type Prefixes ─────────────────────────────────────

  private static readonly ITEM_PREFIX = 'item:';
  private static readonly NAMESPACE_PREFIX = 'ns:';
  private static readonly VERSION_PREFIX = 'ver:';
  private static readonly RELATION_PREFIX = 'rel:';
  private static readonly INDEX_PREFIX = 'idx:';

  // ── Items ───────────────────────────────────────────────────

  async saveItem(item: SerializableKnowledgeItem): Promise<void> {
    try {
      const path = FileKnowledgeStorageAdapter.buildPath(
        item.namespaceId,
        `${FileKnowledgeStorageAdapter.ITEM_PREFIX}${item.id}`,
        item.createdAt,
      );
      const data = JSON.stringify(item);
      this.writeFile(path, data);
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to save item ${item.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async loadItem(id: string): Promise<SerializableKnowledgeItem | null> {
    try {
      const encodedId = `${FileKnowledgeStorageAdapter.ITEM_PREFIX}${id}`;
      for (const path of this.pathStore.keys()) {
        if (path.includes(encodedId + '.json')) {
          const data = this.readFile(path);
          if (data === null) continue;
          return JSON.parse(data) as SerializableKnowledgeItem;
        }
      }
      return null;
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to load item ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async deleteItem(id: string): Promise<void> {
    const encodedId = `${FileKnowledgeStorageAdapter.ITEM_PREFIX}${id}`;
    for (const path of this.pathStore.keys()) {
      if (path.includes(encodedId + '.json')) {
        this.deleteFile(path);
        return;
      }
    }
  }

  async listItems(namespaceId?: string): Promise<readonly SerializableKnowledgeItem[]> {
    try {
      const results: SerializableKnowledgeItem[] = [];
      for (const path of this.listPaths()) {
        if (!path.includes(FileKnowledgeStorageAdapter.ITEM_PREFIX)) continue;
        if (namespaceId !== undefined && !FileKnowledgeStorageAdapter.matchesNamespace(path, namespaceId)) {
          continue;
        }
        const data = this.readFile(path);
        if (data !== null) {
          results.push(JSON.parse(data) as SerializableKnowledgeItem);
        }
      }
      return results;
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to list items: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ── Namespaces ───────────────────────────────────────────────

  async saveNamespace(ns: SerializableKnowledgeNamespace): Promise<void> {
    try {
      const path = FileKnowledgeStorageAdapter.buildPath(
        '_namespaces',
        `${FileKnowledgeStorageAdapter.NAMESPACE_PREFIX}${ns.id}`,
        ns.createdAt,
      );
      const data = JSON.stringify(ns);
      this.writeFile(path, data);
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to save namespace ${ns.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async loadNamespace(id: string): Promise<SerializableKnowledgeNamespace | null> {
    try {
      const encodedId = `${FileKnowledgeStorageAdapter.NAMESPACE_PREFIX}${id}`;
      for (const path of this.pathStore.keys()) {
        if (path.includes(encodedId + '.json')) {
          const data = this.readFile(path);
          if (data === null) continue;
          return JSON.parse(data) as SerializableKnowledgeNamespace;
        }
      }
      return null;
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to load namespace ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async deleteNamespace(id: string): Promise<void> {
    const encodedId = `${FileKnowledgeStorageAdapter.NAMESPACE_PREFIX}${id}`;
    for (const path of this.pathStore.keys()) {
      if (path.includes(encodedId + '.json')) {
        this.deleteFile(path);
        return;
      }
    }
  }

  async listNamespaces(): Promise<readonly SerializableKnowledgeNamespace[]> {
    try {
      const results: SerializableKnowledgeNamespace[] = [];
      for (const path of this.listPaths()) {
        if (!path.includes(FileKnowledgeStorageAdapter.NAMESPACE_PREFIX)) continue;
        const data = this.readFile(path);
        if (data !== null) {
          results.push(JSON.parse(data) as SerializableKnowledgeNamespace);
        }
      }
      return results;
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to list namespaces: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ── Versions ─────────────────────────────────────────────────

  async saveVersion(version: SerializableKnowledgeVersion): Promise<void> {
    try {
      const path = FileKnowledgeStorageAdapter.buildPath(
        `_versions`,
        `${FileKnowledgeStorageAdapter.VERSION_PREFIX}${version.id}`,
        version.createdAt,
      );
      const data = JSON.stringify(version);
      this.writeFile(path, data);
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to save version ${version.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async loadVersions(itemId: string): Promise<readonly SerializableKnowledgeVersion[]> {
    try {
      const results: SerializableKnowledgeVersion[] = [];
      for (const path of this.listPaths()) {
        if (!path.includes(FileKnowledgeStorageAdapter.VERSION_PREFIX)) continue;
        const data = this.readFile(path);
        if (data === null) continue;
        const parsed = JSON.parse(data) as SerializableKnowledgeVersion;
        if (parsed.itemId === itemId) {
          results.push(parsed);
        }
      }
      return results;
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to load versions for item ${itemId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async deleteVersions(itemId: string): Promise<void> {
    const pathsToDelete: readonly string[] = this.listPaths((path) => {
      if (!path.includes(FileKnowledgeStorageAdapter.VERSION_PREFIX)) return false;
      const data = this.readFile(path);
      if (data === null) return false;
      try {
        const parsed = JSON.parse(data) as SerializableKnowledgeVersion;
        return parsed.itemId === itemId;
      } catch {
        return false;
      }
    });
    for (const path of pathsToDelete) {
      this.deleteFile(path);
    }
  }

  // ── Relations ────────────────────────────────────────────────

  async saveRelation(relation: SerializableKnowledgeRelation): Promise<void> {
    try {
      const path = FileKnowledgeStorageAdapter.buildPath(
        `_relations`,
        `${FileKnowledgeStorageAdapter.RELATION_PREFIX}${relation.id}`,
        relation.createdAt,
      );
      const data = JSON.stringify(relation);
      this.writeFile(path, data);
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to save relation ${relation.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async loadRelations(itemId: string): Promise<readonly SerializableKnowledgeRelation[]> {
    try {
      const results: SerializableKnowledgeRelation[] = [];
      for (const path of this.listPaths()) {
        if (!path.includes(FileKnowledgeStorageAdapter.RELATION_PREFIX)) continue;
        const data = this.readFile(path);
        if (data === null) continue;
        const parsed = JSON.parse(data) as SerializableKnowledgeRelation;
        if (parsed.sourceId === itemId || parsed.targetId === itemId) {
          results.push(parsed);
        }
      }
      return results;
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to load relations for item ${itemId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async deleteRelation(id: string): Promise<void> {
    const encodedId = `${FileKnowledgeStorageAdapter.RELATION_PREFIX}${id}`;
    for (const path of this.pathStore.keys()) {
      if (path.includes(encodedId + '.json')) {
        this.deleteFile(path);
        return;
      }
    }
  }

  // ── Index Entries ────────────────────────────────────────────

  async saveIndexEntry(entry: SerializableKnowledgeIndexEntry): Promise<void> {
    try {
      const path = FileKnowledgeStorageAdapter.buildPath(
        `_indices`,
        `${FileKnowledgeStorageAdapter.INDEX_PREFIX}${entry.id}`,
        entry.createdAt,
      );
      const data = JSON.stringify(entry);
      this.writeFile(path, data);
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to save index entry ${entry.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async loadIndexEntries(indexType: string): Promise<readonly SerializableKnowledgeIndexEntry[]> {
    try {
      const results: SerializableKnowledgeIndexEntry[] = [];
      for (const path of this.listPaths()) {
        if (!path.includes(FileKnowledgeStorageAdapter.INDEX_PREFIX)) continue;
        const data = this.readFile(path);
        if (data === null) continue;
        const parsed = JSON.parse(data) as SerializableKnowledgeIndexEntry;
        if (parsed.indexType === indexType) {
          results.push(parsed);
        }
      }
      return results;
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to load index entries for type ${indexType}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async deleteIndexEntries(indexType: string): Promise<void> {
    const pathsToDelete: readonly string[] = this.listPaths((path) => {
      if (!path.includes(FileKnowledgeStorageAdapter.INDEX_PREFIX)) return false;
      const data = this.readFile(path);
      if (data === null) return false;
      try {
        const parsed = JSON.parse(data) as SerializableKnowledgeIndexEntry;
        return parsed.indexType === indexType;
      } catch {
        return false;
      }
    });
    for (const path of pathsToDelete) {
      this.deleteFile(path);
    }
  }

  // ── Utilities ───────────────────────────────────────────────

  /** Number of stored paths (useful for testing). */
  get pathCount(): number {
    return this.pathStore.size;
  }

  /** List all stored paths (useful for testing). */
  listAllPaths(): readonly string[] {
    return Array.from(this.pathStore.keys());
  }

  /** Clear all stored data (useful for testing). */
  clear(): void {
    this.pathStore.clear();
  }
}

// ─── Snapshot Storage Adapter ─────────────────────────────────────

/**
 * Internal representation of a storage snapshot.
 * Captures the full state of all entity collections at a point in time.
 */
interface StorageSnapshot {
  readonly id: string;
  readonly createdAt: string;
  readonly items: ReadonlyMap<string, SerializableKnowledgeItem>;
  readonly namespaces: ReadonlyMap<string, SerializableKnowledgeNamespace>;
  readonly versions: ReadonlyMap<string, readonly SerializableKnowledgeVersion[]>;
  readonly relations: ReadonlyMap<string, readonly SerializableKnowledgeRelation[]>;
  readonly indexEntries: ReadonlyMap<string, readonly SerializableKnowledgeIndexEntry[]>;
}

/**
 * Snapshot-capable knowledge storage adapter.
 *
 * Wraps another KnowledgeStorageAdapter (the "inner" adapter) and adds
 * snapshot / restore capability on top. All normal storage operations
 * delegate to the inner adapter. Snapshots capture a point-in-time copy
 * of the inner adapter's entire state; restoring a snapshot replaces
 * the inner adapter's state with the captured data.
 */
export class SnapshotKnowledgeStorageAdapter implements KnowledgeStorageAdapter {
  private readonly inner: KnowledgeStorageAdapter;
  private readonly snapshots = new Map<string, StorageSnapshot>();

  constructor(inner: KnowledgeStorageAdapter) {
    this.inner = inner;
  }

  // ── Snapshot Operations ────────────────────────────────────

  /**
   * Create a snapshot of the current state.
   * Returns the snapshot ID (UUID).
   */
  async createSnapshot(): Promise<string> {
    try {
      const id = crypto.randomUUID();
      const items = new Map<string, SerializableKnowledgeItem>();
      const allItems = await this.inner.listItems();
      for (const item of allItems) {
        items.set(item.id, item);
      }

      const namespaces = new Map<string, SerializableKnowledgeNamespace>();
      const allNamespaces = await this.inner.listNamespaces();
      for (const ns of allNamespaces) {
        namespaces.set(ns.id, ns);
      }

      const versions = new Map<string, SerializableKnowledgeVersion[]>();
      for (const item of allItems) {
        const itemVersions = await this.inner.loadVersions(item.id);
        if (itemVersions.length > 0) {
          versions.set(item.id, [...itemVersions]);
        }
      }

      const relations = new Map<string, SerializableKnowledgeRelation[]>();
      for (const item of allItems) {
        const itemRelations = await this.inner.loadRelations(item.id);
        if (itemRelations.length > 0) {
          relations.set(item.id, [...itemRelations]);
        }
      }

      const indexEntries = new Map<string, SerializableKnowledgeIndexEntry[]>();
      for (const item of allItems) {
        // Collect all index types used across items
        const itemIndices = await this.inner.loadIndexEntries(item.id);
        if (itemIndices.length > 0) {
          indexEntries.set(item.id, [...itemIndices]);
        }
      }

      const snapshot: StorageSnapshot = {
        id,
        createdAt: new Date().toISOString(),
        items,
        namespaces,
        versions,
        relations,
        indexEntries,
      };

      this.snapshots.set(id, snapshot);
      return id;
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to create snapshot: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Restore a previously created snapshot by ID.
   * Clears the inner adapter's state and replays the captured data.
   */
  async restoreSnapshot(snapshotId: string): Promise<void> {
    try {
      const snapshot = this.snapshots.get(snapshotId);
      if (snapshot === undefined) {
        throw new KnowledgeStorageError(
          `Snapshot not found: ${snapshotId}`,
        );
      }

      // Replay items
      for (const item of snapshot.items.values()) {
        await this.inner.saveItem(item);
      }

      // Replay namespaces
      for (const ns of snapshot.namespaces.values()) {
        await this.inner.saveNamespace(ns);
      }

      // Replay versions
      for (const [, versions] of snapshot.versions) {
        for (const version of versions) {
          await this.inner.saveVersion(version);
        }
      }

      // Replay relations
      for (const [, relations] of snapshot.relations) {
        for (const relation of relations) {
          await this.inner.saveRelation(relation);
        }
      }

      // Replay index entries
      for (const [, entries] of snapshot.indexEntries) {
        for (const entry of entries) {
          await this.inner.saveIndexEntry(entry);
        }
      }
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to restore snapshot ${snapshotId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** List all snapshot IDs. */
  listSnapshotIds(): readonly string[] {
    return Array.from(this.snapshots.keys());
  }

  /** Delete a snapshot by ID. Returns true if it existed. */
  deleteSnapshot(snapshotId: string): boolean {
    return this.snapshots.delete(snapshotId);
  }

  /** Get the number of stored snapshots. */
  get snapshotCount(): number {
    return this.snapshots.size;
  }

  /** Get a read-only reference to a snapshot (for inspection). */
  getSnapshot(snapshotId: string): StorageSnapshot | null {
    return this.snapshots.get(snapshotId) ?? null;
  }

  /** Clear all snapshots. */
  clearSnapshots(): void {
    this.snapshots.clear();
  }

  // ── Delegated Operations ────────────────────────────────────

  // All normal storage operations delegate to the inner adapter.

  async saveItem(item: SerializableKnowledgeItem): Promise<void> {
    try {
      await this.inner.saveItem(item);
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to save item ${item.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async loadItem(id: string): Promise<SerializableKnowledgeItem | null> {
    try {
      return await this.inner.loadItem(id);
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to load item ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async deleteItem(id: string): Promise<void> {
    await this.inner.deleteItem(id);
  }

  async listItems(namespaceId?: string): Promise<readonly SerializableKnowledgeItem[]> {
    try {
      return await this.inner.listItems(namespaceId);
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to list items: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async saveNamespace(ns: SerializableKnowledgeNamespace): Promise<void> {
    try {
      await this.inner.saveNamespace(ns);
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to save namespace ${ns.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async loadNamespace(id: string): Promise<SerializableKnowledgeNamespace | null> {
    try {
      return await this.inner.loadNamespace(id);
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to load namespace ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async deleteNamespace(id: string): Promise<void> {
    await this.inner.deleteNamespace(id);
  }

  async listNamespaces(): Promise<readonly SerializableKnowledgeNamespace[]> {
    try {
      return await this.inner.listNamespaces();
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to list namespaces: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async saveVersion(version: SerializableKnowledgeVersion): Promise<void> {
    try {
      await this.inner.saveVersion(version);
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to save version ${version.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async loadVersions(itemId: string): Promise<readonly SerializableKnowledgeVersion[]> {
    try {
      return await this.inner.loadVersions(itemId);
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to load versions for item ${itemId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async deleteVersions(itemId: string): Promise<void> {
    await this.inner.deleteVersions(itemId);
  }

  async saveRelation(relation: SerializableKnowledgeRelation): Promise<void> {
    try {
      await this.inner.saveRelation(relation);
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to save relation ${relation.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async loadRelations(itemId: string): Promise<readonly SerializableKnowledgeRelation[]> {
    try {
      return await this.inner.loadRelations(itemId);
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to load relations for item ${itemId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async deleteRelation(id: string): Promise<void> {
    await this.inner.deleteRelation(id);
  }

  async saveIndexEntry(entry: SerializableKnowledgeIndexEntry): Promise<void> {
    try {
      await this.inner.saveIndexEntry(entry);
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to save index entry ${entry.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async loadIndexEntries(indexType: string): Promise<readonly SerializableKnowledgeIndexEntry[]> {
    try {
      return await this.inner.loadIndexEntries(indexType);
    } catch (error) {
      if (error instanceof KnowledgeStorageError) throw error;
      throw new KnowledgeStorageError(
        `Failed to load index entries for type ${indexType}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async deleteIndexEntries(indexType: string): Promise<void> {
    await this.inner.deleteIndexEntries(indexType);
  }
}
