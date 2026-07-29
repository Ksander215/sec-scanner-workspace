/**
 * Knowledge Runtime — Storage Layer Tests
 * TASK-AIS-003E.000
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryKnowledgeStorageAdapter,
  FileKnowledgeStorageAdapter,
  SnapshotKnowledgeStorageAdapter,
} from '../../core/knowledge/storage.js';
import {
  KnowledgeKind,
  KnowledgeState,
  KnowledgeRelationType,
  KnowledgeIndexType,
  brandKnowledgeItemId,
  brandKnowledgeNamespaceId,
  brandKnowledgeVersionId,
  brandKnowledgeRelationId,
  brandKnowledgeIndexEntryId,
} from '../../core/knowledge/types.js';
import type {
  SerializableKnowledgeItem,
  SerializableKnowledgeNamespace,
  SerializableKnowledgeVersion,
  SerializableKnowledgeRelation,
  SerializableKnowledgeIndexEntry,
  KnowledgeMetadata,
} from '../../core/knowledge/types.js';

function makeItem(id: string, nsId: string, name: string): SerializableKnowledgeItem {
  return {
    id,
    kind: KnowledgeKind.Item,
    namespaceId: nsId,
    name,
    content: `Content of ${name}`,
    metadata: { tags: [], source: { type: 'test', identifier: id, timestamp: '2025-01-01T00:00:00Z' }, confidence: 1.0, custom: {} },
    state: KnowledgeState.Active,
    currentVersionId: 'ver-1',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };
}

function makeNamespace(id: string, name: string): SerializableKnowledgeNamespace {
  return {
    id,
    name,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    metadata: {},
  };
}

function makeVersion(id: string, itemId: string, revision: number): SerializableKnowledgeVersion {
  return {
    id,
    itemId,
    revision,
    content: `Version ${revision}`,
    metadata: { tags: [], source: { type: 'test', identifier: itemId, timestamp: '2025-01-01T00:00:00Z' }, confidence: 1.0, custom: {} },
    state: KnowledgeState.Active,
    createdAt: '2025-01-01T00:00:00Z',
  };
}

function makeRelation(id: string, sourceId: string, targetId: string): SerializableKnowledgeRelation {
  return {
    id,
    type: KnowledgeRelationType.Related,
    sourceId,
    targetId,
    metadata: {},
    createdAt: '2025-01-01T00:00:00Z',
  };
}

function makeIndexEntry(id: string, indexType: KnowledgeIndexType, key: string, itemId: string): SerializableKnowledgeIndexEntry {
  return {
    id,
    indexType,
    key,
    itemId,
    weight: 1.0,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };
}

// ═══════════════════════════════════════════════════════════════════════
// InMemoryKnowledgeStorageAdapter
// ═══════════════════════════════════════════════════════════════════════

describe('InMemoryKnowledgeStorageAdapter', () => {
  let adapter: InMemoryKnowledgeStorageAdapter;

  beforeEach(() => {
    adapter = new InMemoryKnowledgeStorageAdapter();
  });

  describe('Item operations', () => {
    it('should save and load an item', async () => {
      const item = makeItem('item-1', 'ns-1', 'Test Item');
      await adapter.saveItem(item);
      const loaded = await adapter.loadItem('item-1');
      expect(loaded).toEqual(item);
    });

    it('should return null for missing item', async () => {
      const loaded = await adapter.loadItem('nonexistent');
      expect(loaded).toBeNull();
    });

    it('should overwrite existing item on save', async () => {
      const item1 = makeItem('item-1', 'ns-1', 'Original');
      const item2 = makeItem('item-1', 'ns-1', 'Updated');
      await adapter.saveItem(item1);
      await adapter.saveItem(item2);
      const loaded = await adapter.loadItem('item-1');
      expect(loaded!.name).toBe('Updated');
    });

    it('should delete an item', async () => {
      await adapter.saveItem(makeItem('item-1', 'ns-1', 'Test'));
      await adapter.deleteItem('item-1');
      const loaded = await adapter.loadItem('item-1');
      expect(loaded).toBeNull();
    });

    it('should list all items', async () => {
      await adapter.saveItem(makeItem('item-1', 'ns-1', 'A'));
      await adapter.saveItem(makeItem('item-2', 'ns-1', 'B'));
      const items = await adapter.listItems();
      expect(items).toHaveLength(2);
    });

    it('should list items filtered by namespace', async () => {
      await adapter.saveItem(makeItem('item-1', 'ns-1', 'A'));
      await adapter.saveItem(makeItem('item-2', 'ns-2', 'B'));
      const items = await adapter.listItems('ns-1');
      expect(items).toHaveLength(1);
      expect(items[0]!.id).toBe('item-1');
    });

    it('should return empty list for empty namespace', async () => {
      const items = await adapter.listItems('empty-ns');
      expect(items).toHaveLength(0);
    });
  });

  describe('Namespace operations', () => {
    it('should save and load a namespace', async () => {
      const ns = makeNamespace('ns-1', 'Test NS');
      await adapter.saveNamespace(ns);
      const loaded = await adapter.loadNamespace('ns-1');
      expect(loaded).toEqual(ns);
    });

    it('should return null for missing namespace', async () => {
      const loaded = await adapter.loadNamespace('nonexistent');
      expect(loaded).toBeNull();
    });

    it('should delete a namespace', async () => {
      await adapter.saveNamespace(makeNamespace('ns-1', 'Test'));
      await adapter.deleteNamespace('ns-1');
      const loaded = await adapter.loadNamespace('ns-1');
      expect(loaded).toBeNull();
    });

    it('should list all namespaces', async () => {
      await adapter.saveNamespace(makeNamespace('ns-1', 'NS A'));
      await adapter.saveNamespace(makeNamespace('ns-2', 'NS B'));
      const list = await adapter.listNamespaces();
      expect(list).toHaveLength(2);
    });
  });

  describe('Version operations', () => {
    it('should save and load versions', async () => {
      await adapter.saveVersion(makeVersion('ver-1', 'item-1', 1));
      await adapter.saveVersion(makeVersion('ver-2', 'item-1', 2));
      const versions = await adapter.loadVersions('item-1');
      expect(versions).toHaveLength(2);
    });

    it('should return empty array for no versions', async () => {
      const versions = await adapter.loadVersions('nonexistent');
      expect(versions).toHaveLength(0);
    });

    it('should delete versions for an item', async () => {
      await adapter.saveVersion(makeVersion('ver-1', 'item-1', 1));
      await adapter.deleteVersions('item-1');
      const versions = await adapter.loadVersions('item-1');
      expect(versions).toHaveLength(0);
    });
  });

  describe('Relation operations', () => {
    it('should save and load relations', async () => {
      await adapter.saveRelation(makeRelation('rel-1', 'item-1', 'item-2'));
      const relations = await adapter.loadRelations('item-1');
      expect(relations).toHaveLength(1);
    });

    it('should return empty array for no relations', async () => {
      const relations = await adapter.loadRelations('nonexistent');
      expect(relations).toHaveLength(0);
    });

    it('should delete a relation', async () => {
      await adapter.saveRelation(makeRelation('rel-1', 'item-1', 'item-2'));
      await adapter.deleteRelation('rel-1');
      const relations = await adapter.loadRelations('item-1');
      expect(relations).toHaveLength(0);
    });
  });

  describe('Index entry operations', () => {
    it('should save and load index entries', async () => {
      await adapter.saveIndexEntry(makeIndexEntry('idx-1', KnowledgeIndexType.Key, 'test-key', 'item-1'));
      const entries = await adapter.loadIndexEntries(KnowledgeIndexType.Key);
      expect(entries).toHaveLength(1);
    });

    it('should return empty for no entries', async () => {
      const entries = await adapter.loadIndexEntries(KnowledgeIndexType.Tag);
      expect(entries).toHaveLength(0);
    });

    it('should delete all entries for an index type', async () => {
      await adapter.saveIndexEntry(makeIndexEntry('idx-1', KnowledgeIndexType.Tag, 'tag1', 'item-1'));
      await adapter.saveIndexEntry(makeIndexEntry('idx-2', KnowledgeIndexType.Tag, 'tag2', 'item-2'));
      await adapter.deleteIndexEntries(KnowledgeIndexType.Tag);
      const entries = await adapter.loadIndexEntries(KnowledgeIndexType.Tag);
      expect(entries).toHaveLength(0);
    });
  });

  describe('Utility', () => {
    it('should track item count', async () => {
      await adapter.saveItem(makeItem('item-1', 'ns-1', 'A'));
      await adapter.saveItem(makeItem('item-2', 'ns-1', 'B'));
      expect(adapter.itemCount).toBe(2);
    });

    it('should track namespace count', async () => {
      await adapter.saveNamespace(makeNamespace('ns-1', 'A'));
      await adapter.saveNamespace(makeNamespace('ns-2', 'B'));
      expect(adapter.namespaceCount).toBe(2);
    });

    it('should clear all data', async () => {
      await adapter.saveItem(makeItem('item-1', 'ns-1', 'A'));
      await adapter.saveNamespace(makeNamespace('ns-1', 'NS'));
      adapter.clear();
      expect(adapter.itemCount).toBe(0);
      expect(adapter.namespaceCount).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// FileKnowledgeStorageAdapter
// ═══════════════════════════════════════════════════════════════════════

describe('FileKnowledgeStorageAdapter', () => {
  let adapter: FileKnowledgeStorageAdapter;

  beforeEach(() => {
    adapter = new FileKnowledgeStorageAdapter();
  });

  it('should save and load an item', async () => {
    const item = makeItem('item-1', 'ns-1', 'File Test');
    await adapter.saveItem(item);
    const loaded = await adapter.loadItem('item-1');
    expect(loaded).toBeDefined();
    expect(loaded!.id).toBe('item-1');
    expect(loaded!.name).toBe('File Test');
  });

  it('should save and load a namespace', async () => {
    const ns = makeNamespace('ns-1', 'File NS');
    await adapter.saveNamespace(ns);
    const loaded = await adapter.loadNamespace('ns-1');
    expect(loaded).toBeDefined();
    expect(loaded!.name).toBe('File NS');
  });

  it('should save and load versions', async () => {
    await adapter.saveVersion(makeVersion('ver-1', 'item-1', 1));
    await adapter.saveVersion(makeVersion('ver-2', 'item-1', 2));
    const versions = await adapter.loadVersions('item-1');
    expect(versions).toHaveLength(2);
  });

  it('should save and load relations', async () => {
    await adapter.saveRelation(makeRelation('rel-1', 'item-1', 'item-2'));
    const relations = await adapter.loadRelations('item-1');
    expect(relations).toHaveLength(1);
  });

  it('should delete an item', async () => {
    await adapter.saveItem(makeItem('item-1', 'ns-1', 'Deletable'));
    await adapter.deleteItem('item-1');
    const loaded = await adapter.loadItem('item-1');
    expect(loaded).toBeNull();
  });

  it('should list items', async () => {
    await adapter.saveItem(makeItem('item-1', 'ns-1', 'A'));
    await adapter.saveItem(makeItem('item-2', 'ns-1', 'B'));
    const items = await adapter.listItems();
    expect(items).toHaveLength(2);
  });

  it('should list items by namespace', async () => {
    await adapter.saveItem(makeItem('item-1', 'ns-1', 'A'));
    await adapter.saveItem(makeItem('item-2', 'ns-2', 'B'));
    const items = await adapter.listItems('ns-1');
    expect(items).toHaveLength(1);
  });

  it('should delete a namespace', async () => {
    await adapter.saveNamespace(makeNamespace('ns-1', 'Test'));
    await adapter.deleteNamespace('ns-1');
    const loaded = await adapter.loadNamespace('ns-1');
    expect(loaded).toBeNull();
  });

  it('should list namespaces', async () => {
    await adapter.saveNamespace(makeNamespace('ns-1', 'A'));
    await adapter.saveNamespace(makeNamespace('ns-2', 'B'));
    const list = await adapter.listNamespaces();
    expect(list).toHaveLength(2);
  });

  it('should delete versions', async () => {
    await adapter.saveVersion(makeVersion('ver-1', 'item-1', 1));
    await adapter.deleteVersions('item-1');
    const versions = await adapter.loadVersions('item-1');
    expect(versions).toHaveLength(0);
  });

  it('should delete a relation', async () => {
    await adapter.saveRelation(makeRelation('rel-1', 'item-1', 'item-2'));
    await adapter.deleteRelation('rel-1');
    const relations = await adapter.loadRelations('item-1');
    expect(relations).toHaveLength(0);
  });

  it('should save and load index entries', async () => {
    await adapter.saveIndexEntry(makeIndexEntry('idx-1', KnowledgeIndexType.Key, 'key1', 'item-1'));
    const entries = await adapter.loadIndexEntries(KnowledgeIndexType.Key);
    expect(entries).toHaveLength(1);
  });

  it('should delete index entries by type', async () => {
    await adapter.saveIndexEntry(makeIndexEntry('idx-1', KnowledgeIndexType.Tag, 't1', 'item-1'));
    await adapter.deleteIndexEntries(KnowledgeIndexType.Tag);
    const entries = await adapter.loadIndexEntries(KnowledgeIndexType.Tag);
    expect(entries).toHaveLength(0);
  });

  it('should track path count', async () => {
    await adapter.saveItem(makeItem('item-1', 'ns-1', 'A'));
    expect(adapter.pathCount).toBeGreaterThan(0);
  });

  it('should clear all data', async () => {
    await adapter.saveItem(makeItem('item-1', 'ns-1', 'A'));
    adapter.clear();
    expect(adapter.pathCount).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SnapshotKnowledgeStorageAdapter
// ═══════════════════════════════════════════════════════════════════════

describe('SnapshotKnowledgeStorageAdapter', () => {
  let inner: InMemoryKnowledgeStorageAdapter;
  let adapter: SnapshotKnowledgeStorageAdapter;

  beforeEach(() => {
    inner = new InMemoryKnowledgeStorageAdapter();
    adapter = new SnapshotKnowledgeStorageAdapter(inner);
  });

  it('should delegate save and load to inner adapter', async () => {
    await adapter.saveItem(makeItem('item-1', 'ns-1', 'Delegated'));
    const loaded = await adapter.loadItem('item-1');
    expect(loaded).toBeDefined();
    expect(loaded!.name).toBe('Delegated');
  });

  it('should delegate delete to inner adapter', async () => {
    await adapter.saveItem(makeItem('item-1', 'ns-1', 'Deletable'));
    await adapter.deleteItem('item-1');
    const loaded = await adapter.loadItem('item-1');
    expect(loaded).toBeNull();
  });

  it('should create a snapshot', async () => {
    await adapter.saveItem(makeItem('item-1', 'ns-1', 'Snapshot Test'));
    const snapshotId = await adapter.createSnapshot();
    expect(snapshotId).toBeDefined();
    expect(typeof snapshotId).toBe('string');
    expect(adapter.snapshotCount).toBe(1);
  });

  it('should create multiple snapshots', async () => {
    await adapter.saveItem(makeItem('item-1', 'ns-1', 'A'));
    await adapter.createSnapshot();
    await adapter.saveItem(makeItem('item-2', 'ns-1', 'B'));
    await adapter.createSnapshot();
    expect(adapter.snapshotCount).toBe(2);
  });

  it('should list snapshot IDs', async () => {
    await adapter.createSnapshot();
    await adapter.createSnapshot();
    const ids = adapter.listSnapshotIds();
    expect(ids).toHaveLength(2);
  });

  it('should restore a snapshot', async () => {
    await adapter.saveItem(makeItem('item-1', 'ns-1', 'Original'));
    const snapshotId = await adapter.createSnapshot();
    await adapter.deleteItem('item-1');
    expect(await adapter.loadItem('item-1')).toBeNull();
    await adapter.restoreSnapshot(snapshotId);
    const loaded = await adapter.loadItem('item-1');
    expect(loaded).toBeDefined();
    expect(loaded!.name).toBe('Original');
  });

  it('should throw on restore of nonexistent snapshot', async () => {
    await expect(adapter.restoreSnapshot('nonexistent')).rejects.toThrow();
  });

  it('should restore namespace data', async () => {
    await adapter.saveNamespace(makeNamespace('ns-1', 'NS'));
    const snapshotId = await adapter.createSnapshot();
    await adapter.deleteNamespace('ns-1');
    await adapter.restoreSnapshot(snapshotId);
    const loaded = await adapter.loadNamespace('ns-1');
    expect(loaded).toBeDefined();
    expect(loaded!.name).toBe('NS');
  });

  it('should restore version data when item exists', async () => {
    await adapter.saveItem(makeItem('item-1', 'ns-1', 'Versioned Item'));
    await adapter.saveVersion(makeVersion('ver-1', 'item-1', 1));
    const snapshotId = await adapter.createSnapshot();
    await adapter.deleteVersions('item-1');
    await adapter.restoreSnapshot(snapshotId);
    const versions = await adapter.loadVersions('item-1');
    expect(versions).toHaveLength(1);
  });

  it('should restore relation data when items exist', async () => {
    await adapter.saveItem(makeItem('item-1', 'ns-1', 'Source'));
    await adapter.saveItem(makeItem('item-2', 'ns-1', 'Target'));
    await adapter.saveRelation(makeRelation('rel-1', 'item-1', 'item-2'));
    const snapshotId = await adapter.createSnapshot();
    await adapter.deleteRelation('rel-1');
    await adapter.restoreSnapshot(snapshotId);
    const relations = await adapter.loadRelations('item-1');
    expect(relations).toHaveLength(1);
  });

  it('should preserve item data through snapshot/restore cycle', async () => {
    await adapter.saveItem(makeItem('item-1', 'ns-1', 'Preserved'));
    const snapshotId = await adapter.createSnapshot();
    await adapter.deleteItem('item-1');
    expect(await adapter.loadItem('item-1')).toBeNull();
    await adapter.restoreSnapshot(snapshotId);
    const loaded = await adapter.loadItem('item-1');
    expect(loaded).toBeDefined();
    expect(loaded!.name).toBe('Preserved');
  });

  it('should delete a snapshot', async () => {
    const snapshotId = await adapter.createSnapshot();
    await adapter.deleteSnapshot(snapshotId);
    expect(adapter.snapshotCount).toBe(0);
  });

  it('should clear all snapshots', async () => {
    await adapter.createSnapshot();
    await adapter.createSnapshot();
    adapter.clearSnapshots();
    expect(adapter.snapshotCount).toBe(0);
  });

  it('should get a snapshot', async () => {
    const snapshotId = await adapter.createSnapshot();
    const snapshot = adapter.getSnapshot(snapshotId);
    expect(snapshot).toBeDefined();
  });

  it('should return null for nonexistent snapshot', () => {
    const snapshot = adapter.getSnapshot('nonexistent');
    expect(snapshot).toBeNull();
  });
});
