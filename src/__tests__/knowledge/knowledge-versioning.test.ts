/**
 * Knowledge Versioning — Comprehensive Tests
 * TASK-AIS-003E.000 — Knowledge Runtime Foundation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeVersionManager } from '../../core/knowledge/versioning.js';
import type { KnowledgeVersioningConfig } from '../../core/knowledge/versioning.js';
import {
  brandKnowledgeItemId,
  brandKnowledgeVersionId,
  KnowledgeState,
} from '../../core/knowledge/types.js';
import type {
  KnowledgeItemId,
  KnowledgeVersionId,
  KnowledgeMetadata,
  KnowledgeVersion,
} from '../../core/knowledge/types.js';
import { KnowledgeStateError, KnowledgeVersionNotFoundError, KnowledgeStorageError } from '../../core/knowledge/errors.js';

// ─── Helpers ──────────────────────────────────────────────────────

function makeItemId(id = 'item-1'): KnowledgeItemId {
  return brandKnowledgeItemId(id);
}

function makeMetadata(overrides?: Partial<KnowledgeMetadata>): KnowledgeMetadata {
  return Object.freeze({
    tags: ['test'],
    source: {
      type: 'manual',
      identifier: 'test-source',
      timestamp: new Date().toISOString() as any,
    },
    confidence: 1.0,
    custom: {},
    ...overrides,
  });
}

const BASE_META = makeMetadata();
const BASE_STATE = KnowledgeState.Active;

// ─── Tests ─────────────────────────────────────────────────────────

describe('KnowledgeVersionManager', () => {
  let manager: KnowledgeVersionManager;

  beforeEach(() => {
    manager = new KnowledgeVersionManager();
  });

  // ── createVersion ───────────────────────────────────────────────

  describe('createVersion', () => {
    it('creates a version with revision 1 for a new item', async () => {
      const v = await manager.createVersion(makeItemId(), 'content', BASE_META, BASE_STATE);
      expect(v.revision).toBe(1);
    });

    it('increments revision for subsequent versions', async () => {
      await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      const v2 = await manager.createVersion(makeItemId(), 'v2', BASE_META, BASE_STATE);
      expect(v2.revision).toBe(2);
    });

    it('continues incrementing for third and later versions', async () => {
      await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      await manager.createVersion(makeItemId(), 'v2', BASE_META, BASE_STATE);
      const v3 = await manager.createVersion(makeItemId(), 'v3', BASE_META, BASE_STATE);
      expect(v3.revision).toBe(3);
    });

    it('sets parentId to undefined for the first version', async () => {
      const v = await manager.createVersion(makeItemId(), 'content', BASE_META, BASE_STATE);
      expect(v.parentId).toBeUndefined();
    });

    it('sets parentId to the previous version id', async () => {
      const v1 = await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      const v2 = await manager.createVersion(makeItemId(), 'v2', BASE_META, BASE_STATE);
      expect(v2.parentId).toBe(v1.id);
    });

    it('sets parentId to the most recent version when there are multiple', async () => {
      const v1 = await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      const v2 = await manager.createVersion(makeItemId(), 'v2', BASE_META, BASE_STATE);
      const v3 = await manager.createVersion(makeItemId(), 'v3', BASE_META, BASE_STATE);
      expect(v3.parentId).toBe(v2.id);
      expect(v3.parentId).not.toBe(v1.id);
    });

    it('stores the provided content', async () => {
      const v = await manager.createVersion(makeItemId(), 'hello world', BASE_META, BASE_STATE);
      expect(v.content).toBe('hello world');
    });

    it('stores the provided metadata', async () => {
      const meta = makeMetadata({ confidence: 0.85, tags: ['special'] });
      const v = await manager.createVersion(makeItemId(), 'c', meta, BASE_STATE);
      expect(v.metadata.confidence).toBe(0.85);
      expect(v.metadata.tags).toEqual(['special']);
    });

    it('stores the provided state', async () => {
      const v = await manager.createVersion(makeItemId(), 'c', BASE_META, KnowledgeState.Draft);
      expect(v.state).toBe(KnowledgeState.Draft);
    });

    it('stores the changelog when provided', async () => {
      const v = await manager.createVersion(makeItemId(), 'c', BASE_META, BASE_STATE, 'initial commit');
      expect(v.changelog).toBe('initial commit');
    });

    it('changelog is undefined when not provided', async () => {
      const v = await manager.createVersion(makeItemId(), 'c', BASE_META, BASE_STATE);
      expect(v.changelog).toBeUndefined();
    });

    it('generates a unique id for each version', async () => {
      const v1 = await manager.createVersion(makeItemId(), 'c', BASE_META, BASE_STATE);
      const v2 = await manager.createVersion(makeItemId(), 'c', BASE_META, BASE_STATE);
      expect(v1.id).not.toBe(v2.id);
    });

    it('returns an immutable (frozen) version object', async () => {
      const v = await manager.createVersion(makeItemId(), 'c', BASE_META, BASE_STATE);
      expect(Object.isFrozen(v)).toBe(true);
    });

    it('sets createdAt to a valid ISO timestamp', async () => {
      const before = new Date().toISOString();
      const v = await manager.createVersion(makeItemId(), 'c', BASE_META, BASE_STATE);
      const after = new Date().toISOString();
      expect(v.createdAt >= before && v.createdAt <= after).toBe(true);
    });

    it('tracks versions independently per item', async () => {
      const v1a = await manager.createVersion(makeItemId('item-a'), 'a', BASE_META, BASE_STATE);
      const v1b = await manager.createVersion(makeItemId('item-b'), 'b', BASE_META, BASE_STATE);
      expect(v1a.revision).toBe(1);
      expect(v1b.revision).toBe(1);

      const v2a = await manager.createVersion(makeItemId('item-a'), 'a2', BASE_META, BASE_STATE);
      expect(v2a.revision).toBe(2);
    });
  });

  // ── getVersion ──────────────────────────────────────────────────

  describe('getVersion', () => {
    it('returns null for an unknown version id', async () => {
      const result = await manager.getVersion(brandKnowledgeVersionId('nonexistent'));
      expect(result).toBeNull();
    });

    it('returns the version for a known version id', async () => {
      const created = await manager.createVersion(makeItemId(), 'content', BASE_META, BASE_STATE);
      const found = await manager.getVersion(created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.content).toBe('content');
    });

    it('returns the correct version when multiple exist', async () => {
      const v1 = await manager.createVersion(makeItemId(), 'first', BASE_META, BASE_STATE);
      const v2 = await manager.createVersion(makeItemId(), 'second', BASE_META, BASE_STATE);
      const found = await manager.getVersion(v1.id);
      expect(found!.content).toBe('first');
    });
  });

  // ── getLatestVersion ─────────────────────────────────────────────

  describe('getLatestVersion', () => {
    it('returns null for an item with no versions', async () => {
      const result = await manager.getLatestVersion(makeItemId('ghost'));
      expect(result).toBeNull();
    });

    it('returns the only version when there is one', async () => {
      const v = await manager.createVersion(makeItemId(), 'only', BASE_META, BASE_STATE);
      const latest = await manager.getLatestVersion(makeItemId());
      expect(latest!.id).toBe(v.id);
    });

    it('returns the highest revision version', async () => {
      await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      await manager.createVersion(makeItemId(), 'v2', BASE_META, BASE_STATE);
      const v3 = await manager.createVersion(makeItemId(), 'v3', BASE_META, BASE_STATE);
      const latest = await manager.getLatestVersion(makeItemId());
      expect(latest!.revision).toBe(3);
      expect(latest!.id).toBe(v3.id);
      expect(latest!.content).toBe('v3');
    });
  });

  // ── getVersions ──────────────────────────────────────────────────

  describe('getVersions', () => {
    it('returns an empty array for an item with no versions', async () => {
      const versions = await manager.getVersions(makeItemId('ghost'));
      expect(versions).toEqual([]);
    });

    it('returns all versions in descending revision order', async () => {
      await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      await manager.createVersion(makeItemId(), 'v2', BASE_META, BASE_STATE);
      await manager.createVersion(makeItemId(), 'v3', BASE_META, BASE_STATE);
      const versions = await manager.getVersions(makeItemId());
      expect(versions).toHaveLength(3);
      expect(versions[0]!.revision).toBe(3);
      expect(versions[1]!.revision).toBe(2);
      expect(versions[2]!.revision).toBe(1);
    });

    it('returns a frozen array', async () => {
      await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      const versions = await manager.getVersions(makeItemId());
      expect(Object.isFrozen(versions)).toBe(true);
    });
  });

  // ── rollback ────────────────────────────────────────────────────

  describe('rollback', () => {
    it('throws KnowledgeVersionNotFoundError for an unknown item', async () => {
      await expect(
        manager.rollback(makeItemId('ghost'), 1),
      ).rejects.toThrow(KnowledgeVersionNotFoundError);
    });

    it('throws KnowledgeVersionNotFoundError for an unknown revision', async () => {
      await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      await expect(
        manager.rollback(makeItemId(), 99),
      ).rejects.toThrow(KnowledgeVersionNotFoundError);
    });

    it('creates a new version with the rolled-back content', async () => {
      await manager.createVersion(makeItemId(), 'original', BASE_META, BASE_STATE);
      await manager.createVersion(makeItemId(), 'modified', BASE_META, BASE_STATE);
      const rolledBack = await manager.rollback(makeItemId(), 1);
      expect(rolledBack.content).toBe('original');
    });

    it('the new version has an incremented revision number', async () => {
      await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      await manager.createVersion(makeItemId(), 'v2', BASE_META, BASE_STATE);
      const rolledBack = await manager.rollback(makeItemId(), 1);
      expect(rolledBack.revision).toBe(3);
    });

    it('preserves immutability of the original rolled-back version', async () => {
      const v1 = await manager.createVersion(makeItemId(), 'original', BASE_META, BASE_STATE);
      await manager.createVersion(makeItemId(), 'modified', BASE_META, BASE_STATE);
      await manager.rollback(makeItemId(), 1);
      // Re-fetch v1 and verify it's unchanged
      const fetched = await manager.getVersion(v1.id);
      expect(fetched!.content).toBe('original');
      expect(fetched!.revision).toBe(1);
    });

    it('sets changelog indicating rollback target revision', async () => {
      await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      await manager.createVersion(makeItemId(), 'v2', BASE_META, BASE_STATE);
      const rolledBack = await manager.rollback(makeItemId(), 1);
      expect(rolledBack.changelog).toBe('Rollback to revision 1');
    });

    it('rolls back to an intermediate revision correctly', async () => {
      await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      await manager.createVersion(makeItemId(), 'v2', BASE_META, BASE_STATE);
      await manager.createVersion(makeItemId(), 'v3', BASE_META, BASE_STATE);
      const rolledBack = await manager.rollback(makeItemId(), 2);
      expect(rolledBack.content).toBe('v2');
      expect(rolledBack.revision).toBe(4);
    });

    it('the rollback version becomes the latest version', async () => {
      await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      await manager.createVersion(makeItemId(), 'v2', BASE_META, BASE_STATE);
      const rolledBack = await manager.rollback(makeItemId(), 1);
      const latest = await manager.getLatestVersion(makeItemId());
      expect(latest!.id).toBe(rolledBack.id);
    });
  });

  // ── getLineage ──────────────────────────────────────────────────

  describe('getLineage', () => {
    it('returns an empty array for an item with no versions', async () => {
      const lineage = await manager.getLineage(makeItemId('ghost'));
      expect(lineage).toEqual([]);
    });

    it('returns all versions in chronological (ascending) order', async () => {
      await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      await manager.createVersion(makeItemId(), 'v2', BASE_META, BASE_STATE);
      await manager.createVersion(makeItemId(), 'v3', BASE_META, BASE_STATE);
      const lineage = await manager.getLineage(makeItemId());
      expect(lineage).toHaveLength(3);
      expect(lineage[0]!.revision).toBe(1);
      expect(lineage[1]!.revision).toBe(2);
      expect(lineage[2]!.revision).toBe(3);
    });

    it('returns a frozen array', async () => {
      await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      const lineage = await manager.getLineage(makeItemId());
      expect(Object.isFrozen(lineage)).toBe(true);
    });

    it('includes rollback versions in lineage', async () => {
      await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      await manager.createVersion(makeItemId(), 'v2', BASE_META, BASE_STATE);
      await manager.rollback(makeItemId(), 1);
      const lineage = await manager.getLineage(makeItemId());
      expect(lineage).toHaveLength(3);
      expect(lineage[2]!.changelog).toContain('Rollback to revision 1');
    });
  });

  // ── getHistory (paginated) ───────────────────────────────────────

  describe('getHistory', () => {
    it('returns empty versions and total 0 for unknown item', async () => {
      const result = await manager.getHistory(makeItemId('ghost'));
      expect(result.versions).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('returns the total count of all versions', async () => {
      await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      await manager.createVersion(makeItemId(), 'v2', BASE_META, BASE_STATE);
      await manager.createVersion(makeItemId(), 'v3', BASE_META, BASE_STATE);
      const result = await manager.getHistory(makeItemId());
      expect(result.total).toBe(3);
    });

    it('defaults offset to 0 and limit to 20', async () => {
      for (let i = 0; i < 5; i++) {
        await manager.createVersion(makeItemId(), `v${i}`, BASE_META, BASE_STATE);
      }
      const result = await manager.getHistory(makeItemId());
      // With offset=0, limit=20 → returns all 5 in reverse order
      expect(result.versions).toHaveLength(5);
      expect(result.versions[0]!.revision).toBe(5); // descending
    });

    it('respects the offset parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await manager.createVersion(makeItemId(), `v${i}`, BASE_META, BASE_STATE);
      }
      const result = await manager.getHistory(makeItemId(), 2);
      // offset=2, limit=20 → skips first 2 (rev 1,2), returns [3,4,5] reversed = [5,4,3]
      expect(result.versions).toHaveLength(3);
      expect(result.versions[0]!.revision).toBe(5);
      expect(result.total).toBe(5);
    });

    it('respects the limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await manager.createVersion(makeItemId(), `v${i}`, BASE_META, BASE_STATE);
      }
      const result = await manager.getHistory(makeItemId(), 0, 2);
      // Internal array is [rev1..rev5], slice(0,2)=[rev1,rev2], reversed=[rev2,rev1]
      expect(result.versions).toHaveLength(2);
      expect(result.versions[0]!.revision).toBe(2);
      expect(result.versions[1]!.revision).toBe(1);
      expect(result.total).toBe(5);
    });

    it('returns versions in descending order within the page', async () => {
      for (let i = 0; i < 5; i++) {
        await manager.createVersion(makeItemId(), `v${i}`, BASE_META, BASE_STATE);
      }
      const result = await manager.getHistory(makeItemId(), 1, 2);
      // offset=1 → internal [rev1..rev5], slice(1,3)=[rev2,rev3], reversed=[rev3,rev2]
      expect(result.versions).toHaveLength(2);
      expect(result.versions[0]!.revision).toBe(3);
      expect(result.versions[1]!.revision).toBe(2);
    });

    it('handles offset beyond total gracefully', async () => {
      await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      const result = await manager.getHistory(makeItemId(), 10, 5);
      expect(result.versions).toEqual([]);
      expect(result.total).toBe(1);
    });

    it('clamps negative offset to 0', async () => {
      await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      const result = await manager.getHistory(makeItemId(), -5, 10);
      expect(result.versions).toHaveLength(1);
    });

    it('clamps limit below 1 to at least 1', async () => {
      for (let i = 0; i < 3; i++) {
        await manager.createVersion(makeItemId(), `v${i}`, BASE_META, BASE_STATE);
      }
      const result = await manager.getHistory(makeItemId(), 0, 0);
      expect(result.versions).toHaveLength(1);
    });

    it('returns frozen result object', async () => {
      await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      const result = await manager.getHistory(makeItemId());
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  // ── deleteVersions ───────────────────────────────────────────────

  describe('deleteVersions', () => {
    it('removes all versions for an item', async () => {
      await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      await manager.createVersion(makeItemId(), 'v2', BASE_META, BASE_STATE);
      await manager.deleteVersions(makeItemId());
      const versions = await manager.getVersions(makeItemId());
      expect(versions).toEqual([]);
    });

    it('count returns 0 after deletion', async () => {
      await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      await manager.deleteVersions(makeItemId());
      expect(manager.count(makeItemId())).toBe(0);
    });

    it('getLatestVersion returns null after deletion', async () => {
      await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      await manager.deleteVersions(makeItemId());
      const latest = await manager.getLatestVersion(makeItemId());
      expect(latest).toBeNull();
    });

    it('does not affect versions of other items', async () => {
      await manager.createVersion(makeItemId('item-a'), 'a', BASE_META, BASE_STATE);
      await manager.createVersion(makeItemId('item-b'), 'b', BASE_META, BASE_STATE);
      await manager.deleteVersions(makeItemId('item-a'));
      expect(manager.count(makeItemId('item-a'))).toBe(0);
      expect(manager.count(makeItemId('item-b'))).toBe(1);
    });
  });

  // ── count / totalVersionCount ────────────────────────────────────

  describe('count', () => {
    it('returns 0 for an item with no versions', () => {
      expect(manager.count(makeItemId('ghost'))).toBe(0);
    });

    it('returns the correct number of versions for a known item', async () => {
      await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      expect(manager.count(makeItemId())).toBe(1);
      await manager.createVersion(makeItemId(), 'v2', BASE_META, BASE_STATE);
      expect(manager.count(makeItemId())).toBe(2);
    });
  });

  describe('totalVersionCount', () => {
    it('returns 0 when no versions exist', () => {
      expect(manager.totalVersionCount()).toBe(0);
    });

    it('returns the sum of all version counts across items', async () => {
      await manager.createVersion(makeItemId('a'), 'a1', BASE_META, BASE_STATE);
      await manager.createVersion(makeItemId('a'), 'a2', BASE_META, BASE_STATE);
      await manager.createVersion(makeItemId('b'), 'b1', BASE_META, BASE_STATE);
      expect(manager.totalVersionCount()).toBe(3);
    });

    it('decreases after deletion', async () => {
      await manager.createVersion(makeItemId('a'), 'a1', BASE_META, BASE_STATE);
      await manager.createVersion(makeItemId('b'), 'b1', BASE_META, BASE_STATE);
      expect(manager.totalVersionCount()).toBe(2);
      await manager.deleteVersions(makeItemId('a'));
      expect(manager.totalVersionCount()).toBe(1);
    });
  });

  // ── maxRevisionsPerItem ──────────────────────────────────────────

  describe('maxRevisionsPerItem', () => {
    it('trims oldest revisions when maxRevisionsPerItem is exceeded', async () => {
      const mgr = new KnowledgeVersionManager({ maxRevisionsPerItem: 3 });
      const v1 = await mgr.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      await mgr.createVersion(makeItemId(), 'v2', BASE_META, BASE_STATE);
      await mgr.createVersion(makeItemId(), 'v3', BASE_META, BASE_STATE);
      await mgr.createVersion(makeItemId(), 'v4', BASE_META, BASE_STATE);

      // Only 3 revisions should remain (oldest trimmed)
      expect(mgr.count(makeItemId())).toBe(3);

      // v1 should be gone
      const found = await mgr.getVersion(v1.id);
      expect(found).toBeNull();
    });

    it('retains the most recent revisions after trimming', async () => {
      const mgr = new KnowledgeVersionManager({ maxRevisionsPerItem: 2 });
      await mgr.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      await mgr.createVersion(makeItemId(), 'v2', BASE_META, BASE_STATE);
      await mgr.createVersion(makeItemId(), 'v3', BASE_META, BASE_STATE);

      const versions = await mgr.getVersions(makeItemId());
      expect(versions).toHaveLength(2);
      expect(versions[0]!.content).toBe('v3');
      expect(versions[1]!.content).toBe('v2');
    });

    it('does not trim when under the limit', async () => {
      const mgr = new KnowledgeVersionManager({ maxRevisionsPerItem: 10 });
      await mgr.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      await mgr.createVersion(makeItemId(), 'v2', BASE_META, BASE_STATE);
      expect(mgr.count(makeItemId())).toBe(2);
    });
  });

  // ── dispose ──────────────────────────────────────────────────────

  describe('dispose', () => {
    it('throws KnowledgeStateError on createVersion after dispose', async () => {
      manager.dispose();
      await expect(
        manager.createVersion(makeItemId(), 'c', BASE_META, BASE_STATE),
      ).rejects.toThrow(KnowledgeStateError);
    });

    it('throws KnowledgeStateError on getVersion after dispose', async () => {
      manager.dispose();
      await expect(
        manager.getVersion(brandKnowledgeVersionId('any')),
      ).rejects.toThrow(KnowledgeStateError);
    });

    it('throws KnowledgeStateError on getLatestVersion after dispose', async () => {
      manager.dispose();
      await expect(
        manager.getLatestVersion(makeItemId()),
      ).rejects.toThrow(KnowledgeStateError);
    });

    it('throws KnowledgeStateError on getVersions after dispose', async () => {
      manager.dispose();
      await expect(
        manager.getVersions(makeItemId()),
      ).rejects.toThrow(KnowledgeStateError);
    });

    it('throws KnowledgeStateError on rollback after dispose', async () => {
      manager.dispose();
      await expect(
        manager.rollback(makeItemId(), 1),
      ).rejects.toThrow(KnowledgeStateError);
    });

    it('throws KnowledgeStateError on getLineage after dispose', async () => {
      manager.dispose();
      await expect(
        manager.getLineage(makeItemId()),
      ).rejects.toThrow(KnowledgeStateError);
    });

    it('throws KnowledgeStateError on getHistory after dispose', async () => {
      manager.dispose();
      await expect(
        manager.getHistory(makeItemId()),
      ).rejects.toThrow(KnowledgeStateError);
    });

    it('throws KnowledgeStateError on deleteVersions after dispose', async () => {
      manager.dispose();
      await expect(
        manager.deleteVersions(makeItemId()),
      ).rejects.toThrow(KnowledgeStateError);
    });

    it('clears all version data on dispose', async () => {
      await manager.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      manager.dispose();
      expect(manager.totalVersionCount()).toBe(0);
    });
  });

  // ── Storage Adapter ─────────────────────────────────────────────

  describe('storage adapter integration', () => {
    it('calls storageAdapter.saveVersion on createVersion', async () => {
      let saved = false;
      const adapter = {
        saveVersion: async () => { saved = true; },
        loadVersions: async () => [],
        deleteVersions: async () => {},
        saveItem: async () => {},
        loadItem: async () => null,
        deleteItem: async () => {},
        listItems: async () => [],
        saveNamespace: async () => {},
        loadNamespace: async () => null,
        deleteNamespace: async () => {},
        listNamespaces: async () => [],
        saveRelation: async () => {},
        loadRelations: async () => [],
        deleteRelation: async () => {},
        saveIndexEntry: async () => {},
        loadIndexEntries: async () => [],
        deleteIndexEntries: async () => {},
      } as any;

      const mgr = new KnowledgeVersionManager({ storageAdapter: adapter });
      await mgr.createVersion(makeItemId(), 'c', BASE_META, BASE_STATE);
      expect(saved).toBe(true);
    });

    it('throws KnowledgeStorageError when storage adapter fails', async () => {
      const adapter = {
        saveVersion: async () => { throw new Error('disk full'); },
        loadVersions: async () => [],
        deleteVersions: async () => {},
        saveItem: async () => {},
        loadItem: async () => null,
        deleteItem: async () => {},
        listItems: async () => [],
        saveNamespace: async () => {},
        loadNamespace: async () => null,
        deleteNamespace: async () => {},
        listNamespaces: async () => [],
        saveRelation: async () => {},
        loadRelations: async () => [],
        deleteRelation: async () => {},
        saveIndexEntry: async () => {},
        loadIndexEntries: async () => [],
        deleteIndexEntries: async () => {},
      } as any;

      const mgr = new KnowledgeVersionManager({ storageAdapter: adapter });
      await expect(
        mgr.createVersion(makeItemId(), 'c', BASE_META, BASE_STATE),
      ).rejects.toThrow(KnowledgeStorageError);
    });

    it('calls storageAdapter.deleteVersions on deleteVersions', async () => {
      let deleted = false;
      const adapter = {
        saveVersion: async () => {},
        loadVersions: async () => [],
        deleteVersions: async () => { deleted = true; },
        saveItem: async () => {},
        loadItem: async () => null,
        deleteItem: async () => {},
        listItems: async () => [],
        saveNamespace: async () => {},
        loadNamespace: async () => null,
        deleteNamespace: async () => {},
        listNamespaces: async () => [],
        saveRelation: async () => {},
        loadRelations: async () => [],
        deleteRelation: async () => {},
        saveIndexEntry: async () => {},
        loadIndexEntries: async () => [],
        deleteIndexEntries: async () => {},
      } as any;

      const mgr = new KnowledgeVersionManager({ storageAdapter: adapter });
      await mgr.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      await mgr.deleteVersions(makeItemId());
      expect(deleted).toBe(true);
    });

    it('throws KnowledgeStorageError when deleteVersions storage fails', async () => {
      const adapter = {
        saveVersion: async () => {},
        loadVersions: async () => [],
        deleteVersions: async () => { throw new Error('io error'); },
        saveItem: async () => {},
        loadItem: async () => null,
        deleteItem: async () => {},
        listItems: async () => [],
        saveNamespace: async () => {},
        loadNamespace: async () => null,
        deleteNamespace: async () => {},
        listNamespaces: async () => [],
        saveRelation: async () => {},
        loadRelations: async () => [],
        deleteRelation: async () => {},
        saveIndexEntry: async () => {},
        loadIndexEntries: async () => [],
        deleteIndexEntries: async () => {},
      } as any;

      const mgr = new KnowledgeVersionManager({ storageAdapter: adapter });
      await mgr.createVersion(makeItemId(), 'v1', BASE_META, BASE_STATE);
      await expect(
        mgr.deleteVersions(makeItemId()),
      ).rejects.toThrow(KnowledgeStorageError);
    });
  });
});
