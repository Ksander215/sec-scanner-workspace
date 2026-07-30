import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeIndexRuntime } from '../../core/knowledge/knowledge-index.js';
import {
  KnowledgeIndexType,
  KnowledgeKind,
  KnowledgeState,
  brandKnowledgeItemId,
  brandKnowledgeNamespaceId,
  brandKnowledgeVersionId,
} from '../../core/knowledge/types.js';
import type {
  KnowledgeItem,
  KnowledgeItemId,
  KnowledgeNamespaceId,
  KnowledgeVersionId,
  Timestamp,
  KnowledgeIndexStats,
} from '../../core/knowledge/types.js';

// ─── Test Factories ──────────────────────────────────────────────────

let idCounter = 0;

function resetIdCounter(): void {
  idCounter = 0;
}

function nextId(): string {
  return `item-${++idCounter}`;
}

function makeItemId(): KnowledgeItemId {
  return brandKnowledgeItemId(nextId());
}

function makeNamespaceId(ns: string = 'ns-default'): KnowledgeNamespaceId {
  return brandKnowledgeNamespaceId(ns);
}

function makeVersionId(rev: number = 1): KnowledgeVersionId {
  return brandKnowledgeVersionId(`ver-${rev}`);
}

const BASE_TS: Timestamp = '2025-01-01T00:00:00.000Z';

interface MakeItemOverrides {
  readonly id?: KnowledgeItemId;
  readonly kind?: KnowledgeKind;
  readonly namespaceId?: KnowledgeNamespaceId;
  readonly name?: string;
  readonly content?: string;
  readonly tags?: readonly string[];
  readonly sourceType?: string;
  readonly sourceIdentifier?: string;
  readonly confidence?: number;
  readonly custom?: Readonly<Record<string, string>>;
  readonly state?: KnowledgeState;
  readonly versionId?: KnowledgeVersionId;
  readonly createdAt?: Timestamp;
  readonly updatedAt?: Timestamp;
}

function makeItem(overrides: Partial<MakeItemOverrides> = {}): KnowledgeItem {
  const id = overrides.id ?? makeItemId();
  const ts = overrides.createdAt ?? BASE_TS;
  return Object.freeze({
    id,
    kind: overrides.kind ?? KnowledgeKind.Item,
    namespaceId: overrides.namespaceId ?? makeNamespaceId(),
    name: overrides.name ?? `Item ${id as unknown as string}`,
    content: overrides.content ?? `Content for ${id as unknown as string}`,
    metadata: Object.freeze({
      tags: Object.freeze(overrides.tags ?? ['default']),
      source: Object.freeze({
        type: overrides.sourceType ?? 'manual',
        identifier: overrides.sourceIdentifier ?? 'test',
        timestamp: ts,
      }),
      confidence: overrides.confidence ?? 1.0,
      custom: Object.freeze(overrides.custom ?? {}),
    }),
    state: overrides.state ?? KnowledgeState.Active,
    currentVersionId: overrides.versionId ?? makeVersionId(),
    createdAt: ts,
    updatedAt: overrides.updatedAt ?? ts,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────

describe('KnowledgeIndexRuntime', () => {
  let idx: KnowledgeIndexRuntime;

  beforeEach(() => {
    resetIdCounter();
    idx = new KnowledgeIndexRuntime();
  });

  // ── indexItem: Key index ───────────────────────────────────────────

  describe('indexItem – Key index', () => {
    it('creates a Key index entry for an item', async () => {
      const item = makeItem();
      await idx.indexItem(item);
      const ids = await idx.getByIndex(KnowledgeIndexType.Key, item.id as unknown as string);
      expect(ids).toHaveLength(1);
      expect(ids[0]).toBe(item.id);
    });

    it('allows lookup by exact item id in Key index', async () => {
      const item = makeItem();
      await idx.indexItem(item);
      const ids = await idx.getByIndex(KnowledgeIndexType.Key, item.id as unknown as string);
      expect(ids).toContainEqual(item.id);
    });

    it('returns empty array for unknown key', async () => {
      const ids = await idx.getByIndex(KnowledgeIndexType.Key, 'nonexistent');
      expect(ids).toEqual([]);
    });
  });

  // ── indexItem: Namespace index ─────────────────────────────────────

  describe('indexItem – Namespace index', () => {
    it('creates a Namespace index entry', async () => {
      const nsId = makeNamespaceId('ns-alpha');
      const item = makeItem({ namespaceId: nsId });
      await idx.indexItem(item);
      const ids = await idx.getByIndex(KnowledgeIndexType.Namespace, 'ns-alpha');
      expect(ids).toHaveLength(1);
      expect(ids[0]).toBe(item.id);
    });

    it('groups multiple items under the same namespace', async () => {
      const nsId = makeNamespaceId('ns-beta');
      const item1 = makeItem({ namespaceId: nsId });
      const item2 = makeItem({ namespaceId: nsId });
      await idx.indexItem(item1);
      await idx.indexItem(item2);
      const ids = await idx.getByIndex(KnowledgeIndexType.Namespace, 'ns-beta');
      expect(ids).toHaveLength(2);
    });

    it('does not return items from other namespaces', async () => {
      const nsA = makeNamespaceId('ns-a');
      const nsB = makeNamespaceId('ns-b');
      const itemA = makeItem({ namespaceId: nsA });
      const itemB = makeItem({ namespaceId: nsB });
      await idx.indexItem(itemA);
      await idx.indexItem(itemB);
      const ids = await idx.getByIndex(KnowledgeIndexType.Namespace, 'ns-a');
      expect(ids).toHaveLength(1);
      expect(ids[0]).toBe(itemA.id);
    });
  });

  // ── indexItem: Tag index ───────────────────────────────────────────

  describe('indexItem – Tag index', () => {
    it('creates a Tag index entry for each tag', async () => {
      const item = makeItem({ tags: ['red', 'blue', 'green'] });
      await idx.indexItem(item);
      const red = await idx.getByIndex(KnowledgeIndexType.Tag, 'red');
      const blue = await idx.getByIndex(KnowledgeIndexType.Tag, 'blue');
      const green = await idx.getByIndex(KnowledgeIndexType.Tag, 'green');
      expect(red).toHaveLength(1);
      expect(blue).toHaveLength(1);
      expect(green).toHaveLength(1);
    });

    it('creates zero tag entries when item has no tags', async () => {
      const item = makeItem({ tags: [] });
      await idx.indexItem(item);
      const stats = idx.getStats();
      const tagStats = stats.find(s => s.indexType === KnowledgeIndexType.Tag)!;
      expect(tagStats.entryCount).toBe(0);
    });

    it('returns multiple items sharing the same tag', async () => {
      const item1 = makeItem({ tags: ['shared'] });
      const item2 = makeItem({ tags: ['shared', 'other'] });
      await idx.indexItem(item1);
      await idx.indexItem(item2);
      const ids = await idx.getByIndex(KnowledgeIndexType.Tag, 'shared');
      expect(ids).toHaveLength(2);
    });
  });

  // ── indexItem: Source index ────────────────────────────────────────

  describe('indexItem – Source index', () => {
    it('creates a Source index entry using source.type', async () => {
      const item = makeItem({ sourceType: 'api' });
      await idx.indexItem(item);
      const ids = await idx.getByIndex(KnowledgeIndexType.Source, 'api');
      expect(ids).toHaveLength(1);
      expect(ids[0]).toBe(item.id);
    });

    it('groups items by source type', async () => {
      const api1 = makeItem({ sourceType: 'api' });
      const api2 = makeItem({ sourceType: 'api' });
      const manual = makeItem({ sourceType: 'manual' });
      await idx.indexItem(api1);
      await idx.indexItem(api2);
      await idx.indexItem(manual);
      const apiIds = await idx.getByIndex(KnowledgeIndexType.Source, 'api');
      const manualIds = await idx.getByIndex(KnowledgeIndexType.Source, 'manual');
      expect(apiIds).toHaveLength(2);
      expect(manualIds).toHaveLength(1);
    });
  });

  // ── indexItem: Timestamp index ─────────────────────────────────────

  describe('indexItem – Timestamp index', () => {
    it('creates a Timestamp index entry using createdAt', async () => {
      const ts: Timestamp = '2025-06-15T12:00:00.000Z';
      const item = makeItem({ createdAt: ts });
      await idx.indexItem(item);
      const ids = await idx.getByIndex(KnowledgeIndexType.Timestamp, ts);
      expect(ids).toHaveLength(1);
      expect(ids[0]).toBe(item.id);
    });

    it('groups items with the same timestamp', async () => {
      const ts: Timestamp = '2025-06-15T12:00:00.000Z';
      const item1 = makeItem({ createdAt: ts });
      const item2 = makeItem({ createdAt: ts });
      await idx.indexItem(item1);
      await idx.indexItem(item2);
      const ids = await idx.getByIndex(KnowledgeIndexType.Timestamp, ts);
      expect(ids).toHaveLength(2);
    });
  });

  // ── indexItem: re-index deduplication ──────────────────────────────

  describe('indexItem – re-index deduplication', () => {
    it('removes stale entries before re-indexing the same item', async () => {
      const item = makeItem({ tags: ['old-tag'] });
      await idx.indexItem(item);

      const updated = Object.freeze({
        ...item,
        metadata: Object.freeze({
          ...item.metadata,
          tags: Object.freeze(['new-tag'] as const),
        }),
      });
      await idx.indexItem(updated);

      expect(await idx.getByIndex(KnowledgeIndexType.Tag, 'old-tag')).toHaveLength(0);
      expect(await idx.getByIndex(KnowledgeIndexType.Tag, 'new-tag')).toHaveLength(1);
    });

    it('does not duplicate Key entries on re-index', async () => {
      const item = makeItem();
      await idx.indexItem(item);
      await idx.indexItem(item);
      const ids = await idx.getByIndex(KnowledgeIndexType.Key, item.id as unknown as string);
      expect(ids).toHaveLength(1);
    });
  });

  // ── indexItem: entry structure ─────────────────────────────────────

  describe('indexItem – entry structure', () => {
    it('creates correct total entry count (key + ns + tags + source + ts)', async () => {
      const item = makeItem({ tags: ['a', 'b'] });
      await idx.indexItem(item);
      const stats = idx.getStats();
      const totalEntries = stats.reduce((sum, s) => sum + s.entryCount, 0);
      // Key(1) + Namespace(1) + Tags(2) + Source(1) + Timestamp(1) = 6
      expect(totalEntries).toBe(6);
    });

    it('creates exactly one Key entry per item', async () => {
      const item = makeItem();
      await idx.indexItem(item);
      const stats = idx.getStats();
      const keyStats = stats.find(s => s.indexType === KnowledgeIndexType.Key)!;
      expect(keyStats.entryCount).toBe(1);
    });
  });

  // ── removeItem ─────────────────────────────────────────────────────

  describe('removeItem', () => {
    it('removes all index entries for an item', async () => {
      const item = makeItem({ tags: ['x', 'y'], sourceType: 'api' });
      await idx.indexItem(item);
      await idx.removeItem(item.id);

      expect(await idx.getByIndex(KnowledgeIndexType.Key, item.id as unknown as string)).toEqual([]);
      expect(await idx.getByIndex(KnowledgeIndexType.Namespace, item.namespaceId as unknown as string)).toEqual([]);
      expect(await idx.getByIndex(KnowledgeIndexType.Tag, 'x')).toEqual([]);
      expect(await idx.getByIndex(KnowledgeIndexType.Tag, 'y')).toEqual([]);
      expect(await idx.getByIndex(KnowledgeIndexType.Source, 'api')).toEqual([]);
      expect(await idx.getByIndex(KnowledgeIndexType.Timestamp, item.createdAt)).toEqual([]);
    });

    it('is a no-op for a non-indexed item id', async () => {
      await expect(idx.removeItem(brandKnowledgeItemId('ghost'))).resolves.toBeUndefined();
    });

    it('only removes the targeted item, not others', async () => {
      const nsId = makeNamespaceId('shared-ns');
      const item1 = makeItem({ namespaceId: nsId, tags: ['keep'] });
      const item2 = makeItem({ namespaceId: nsId, tags: ['keep'] });
      await idx.indexItem(item1);
      await idx.indexItem(item2);
      await idx.removeItem(item1.id);

      const nsIds = await idx.getByIndex(KnowledgeIndexType.Namespace, 'shared-ns');
      expect(nsIds).toHaveLength(1);
      expect(nsIds[0]).toBe(item2.id);

      const tagIds = await idx.getByIndex(KnowledgeIndexType.Tag, 'keep');
      expect(tagIds).toHaveLength(1);
      expect(tagIds[0]).toBe(item2.id);
    });

    it('removes entries across all five index types', async () => {
      const item = makeItem({ tags: ['t1'], sourceType: 'src', createdAt: '2025-03-01T00:00:00.000Z' as Timestamp });
      await idx.indexItem(item);

      const typesBefore = idx.getStats().filter(s => s.entryCount > 0).length;
      await idx.removeItem(item.id);
      const typesAfter = idx.getStats().filter(s => s.entryCount > 0).length;

      expect(typesBefore).toBeGreaterThan(0);
      expect(typesAfter).toBe(0);
    });
  });

  // ── rebuildIndex ───────────────────────────────────────────────────

  describe('rebuildIndex', () => {
    it('clears and rebuilds a single index type from scratch', async () => {
      const item = makeItem({ tags: ['alpha'] });
      await idx.indexItem(item);

      const count = await idx.rebuildIndex(KnowledgeIndexType.Tag, [item]);
      expect(count).toBe(1);
      const ids = await idx.getByIndex(KnowledgeIndexType.Tag, 'alpha');
      expect(ids).toHaveLength(1);
      expect(ids[0]).toBe(item.id);
    });

    it('returns correct entry count for items with multiple tags', async () => {
      const item1 = makeItem({ tags: ['a', 'b'] });
      const item2 = makeItem({ tags: ['a', 'c'] });
      const count = await idx.rebuildIndex(KnowledgeIndexType.Tag, [item1, item2]);
      expect(count).toBe(4);
    });

    it('clears previous entries before rebuilding', async () => {
      const oldItem = makeItem({ tags: ['stale'] });
      await idx.indexItem(oldItem);

      const newItem = makeItem({ tags: ['fresh'] });
      await idx.rebuildIndex(KnowledgeIndexType.Tag, [newItem]);

      expect(await idx.getByIndex(KnowledgeIndexType.Tag, 'stale')).toEqual([]);
      expect(await idx.getByIndex(KnowledgeIndexType.Tag, 'fresh')).toHaveLength(1);
    });

    it('sets lastRebuilt in stats after rebuild', async () => {
      const item = makeItem();
      await idx.rebuildIndex(KnowledgeIndexType.Key, [item]);

      const stats = idx.getStats();
      const keyStats = stats.find(s => s.indexType === KnowledgeIndexType.Key)!;
      expect(keyStats.lastRebuilt).toBeDefined();
    });

    it('rebuilds with an empty item list producing zero entries', async () => {
      const count = await idx.rebuildIndex(KnowledgeIndexType.Tag, []);
      expect(count).toBe(0);
      expect(await idx.getByIndex(KnowledgeIndexType.Tag, 'anything')).toEqual([]);
    });

    it('only rebuilds the specified index type, not others', async () => {
      const item = makeItem({ tags: ['tag1'] });
      await idx.indexItem(item);

      await idx.rebuildIndex(KnowledgeIndexType.Tag, []);

      expect(await idx.getByIndex(KnowledgeIndexType.Tag, 'tag1')).toEqual([]);
      const keyIds = await idx.getByIndex(KnowledgeIndexType.Key, item.id as unknown as string);
      expect(keyIds).toHaveLength(1);
    });
  });

  // ── rebuildAllIndexes ──────────────────────────────────────────────

  describe('rebuildAllIndexes', () => {
    it('rebuilds all five managed index types', async () => {
      const items = [
        makeItem({ tags: ['x'], sourceType: 'src-a', createdAt: '2025-01-01T00:00:00.000Z' as Timestamp }),
        makeItem({ tags: ['y'], sourceType: 'src-b', createdAt: '2025-01-02T00:00:00.000Z' as Timestamp }),
      ];
      await idx.rebuildAllIndexes(items);

      const stats = idx.getStats();
      for (const stat of stats) {
        expect(stat.entryCount).toBeGreaterThan(0);
        expect(stat.lastRebuilt).toBeDefined();
      }
    });

    it('replaces previously indexed data', async () => {
      const old = makeItem({ tags: ['old'] });
      await idx.indexItem(old);

      const fresh = makeItem({ tags: ['new'] });
      await idx.rebuildAllIndexes([fresh]);

      expect(await idx.getByIndex(KnowledgeIndexType.Tag, 'old')).toEqual([]);
      expect(await idx.getByIndex(KnowledgeIndexType.Tag, 'new')).toHaveLength(1);
      expect(await idx.getByIndex(KnowledgeIndexType.Key, fresh.id as unknown as string)).toHaveLength(1);
      expect(await idx.getByIndex(KnowledgeIndexType.Key, old.id as unknown as string)).toEqual([]);
    });
  });

  // ── getByIndex ─────────────────────────────────────────────────────

  describe('getByIndex', () => {
    it('returns empty array for a non-existent index type', async () => {
      const ids = await idx.getByIndex(KnowledgeIndexType.Relation, 'some-key');
      expect(ids).toEqual([]);
    });

    it('returns empty array when key does not match any entry', async () => {
      await idx.indexItem(makeItem({ tags: ['existing'] }));
      const ids = await idx.getByIndex(KnowledgeIndexType.Tag, 'non-matching');
      expect(ids).toEqual([]);
    });

    it('returns multiple item IDs for a shared index key', async () => {
      const nsId = makeNamespaceId('shared');
      const items = [
        makeItem({ namespaceId: nsId }),
        makeItem({ namespaceId: nsId }),
        makeItem({ namespaceId: nsId }),
      ];
      for (const item of items) await idx.indexItem(item);
      const ids = await idx.getByIndex(KnowledgeIndexType.Namespace, 'shared');
      expect(ids).toHaveLength(3);
      for (const item of items) {
        expect(ids).toContainEqual(item.id);
      }
    });
  });

  // ── getStats ───────────────────────────────────────────────────────

  describe('getStats', () => {
    it('returns stats for all five managed index types', () => {
      const stats = idx.getStats();
      expect(stats).toHaveLength(5);
      const types = stats.map(s => s.indexType);
      expect(types).toContain(KnowledgeIndexType.Key);
      expect(types).toContain(KnowledgeIndexType.Namespace);
      expect(types).toContain(KnowledgeIndexType.Tag);
      expect(types).toContain(KnowledgeIndexType.Source);
      expect(types).toContain(KnowledgeIndexType.Timestamp);
    });

    it('reports zero entries for a fresh index', () => {
      const stats = idx.getStats();
      for (const stat of stats) {
        expect(stat.entryCount).toBe(0);
      }
    });

    it('reports correct entry counts after indexing', async () => {
      const item = makeItem({ tags: ['a', 'b', 'c'] });
      await idx.indexItem(item);
      const stats = idx.getStats();
      const tagStats = stats.find(s => s.indexType === KnowledgeIndexType.Tag)!;
      expect(tagStats.entryCount).toBe(3);
      const keyStats = stats.find(s => s.indexType === KnowledgeIndexType.Key)!;
      expect(keyStats.entryCount).toBe(1);
    });

    it('does not include lastRebuilt before any rebuild', () => {
      const stats = idx.getStats();
      for (const stat of stats) {
        expect(stat.lastRebuilt).toBeUndefined();
      }
    });

    it('reflects removals in entry counts', async () => {
      const item1 = makeItem({ tags: ['t1'] });
      const item2 = makeItem({ tags: ['t1'] });
      await idx.indexItem(item1);
      await idx.indexItem(item2);

      const before = idx.getStats().find(s => s.indexType === KnowledgeIndexType.Tag)!.entryCount;
      expect(before).toBe(2);

      await idx.removeItem(item1.id);
      const after = idx.getStats().find(s => s.indexType === KnowledgeIndexType.Tag)!.entryCount;
      expect(after).toBe(1);
    });
  });

  // ── clear ──────────────────────────────────────────────────────────

  describe('clear', () => {
    it('removes all index entries', async () => {
      const items = [
        makeItem({ tags: ['a', 'b'] }),
        makeItem({ tags: ['c'] }),
      ];
      for (const item of items) await idx.indexItem(item);

      await idx.clear();

      const stats = idx.getStats();
      for (const stat of stats) {
        expect(stat.entryCount).toBe(0);
      }
    });

    it('clears lastRebuilt timestamps', async () => {
      const item = makeItem();
      await idx.rebuildIndex(KnowledgeIndexType.Key, [item]);
      expect(idx.getStats().find(s => s.indexType === KnowledgeIndexType.Key)!.lastRebuilt).toBeDefined();

      await idx.clear();

      expect(idx.getStats().find(s => s.indexType === KnowledgeIndexType.Key)!.lastRebuilt).toBeUndefined();
    });

    it('allows re-indexing after clear', async () => {
      const item = makeItem({ tags: ['post-clear'] });
      await idx.indexItem(item);
      await idx.clear();

      const fresh = makeItem({ tags: ['after-clear'] });
      await idx.indexItem(fresh);
      const ids = await idx.getByIndex(KnowledgeIndexType.Tag, 'after-clear');
      expect(ids).toHaveLength(1);
      expect(ids[0]).toBe(fresh.id);
    });

    it('makes getByIndex return empty after clear', async () => {
      const item = makeItem({ sourceType: 'api' });
      await idx.indexItem(item);
      await idx.clear();
      expect(await idx.getByIndex(KnowledgeIndexType.Source, 'api')).toEqual([]);
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles indexing an item with no tags', async () => {
      const item = makeItem({ tags: [] });
      await idx.indexItem(item);
      const stats = idx.getStats();
      const total = stats.reduce((sum, s) => sum + s.entryCount, 0);
      // Key(1) + Namespace(1) + Tag(0) + Source(1) + Timestamp(1) = 4
      expect(total).toBe(4);
    });

    it('supports indexing many items without error', async () => {
      const items = Array.from({ length: 100 }, () => makeItem({ tags: ['bulk'] }));
      for (const item of items) await idx.indexItem(item);
      const ids = await idx.getByIndex(KnowledgeIndexType.Tag, 'bulk');
      expect(ids).toHaveLength(100);
    });

    it('handles rapid index-then-remove cycles', async () => {
      for (let i = 0; i < 20; i++) {
        const item = makeItem({ tags: [`cycle-${i}`] });
        await idx.indexItem(item);
        await idx.removeItem(item.id);
      }
      const stats = idx.getStats();
      const total = stats.reduce((sum, s) => sum + s.entryCount, 0);
      expect(total).toBe(0);
    });
  });
});
