/**
 * Knowledge Runtime — Integration Tests
 * Comprehensive full-orchestrator tests exercising all subsystems:
 * namespaces, item CRUD, retrieval, graph, versioning, indexing,
 * validation, namespace isolation, lifecycle, and statistics.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  KnowledgeRuntime,
  KnowledgeKind,
  KnowledgeState,
  KnowledgeRelationType,
  KnowledgeIndexType,
  KnowledgeSortField,
  KnowledgeSortDirection,
  brandKnowledgeNamespaceId,
  brandKnowledgeItemId,
  brandKnowledgeFragmentId,
  KnowledgeNamespaceAlreadyExistsError,
  KnowledgeNamespaceNotFoundError,
  KnowledgeItemNotFoundError,
  KnowledgeValidationError,
  KnowledgeStorageError,
  KnowledgeCyclicRelationError,
} from '../../core/knowledge/index.js';
import type {
  KnowledgeNamespaceId,
  KnowledgeItemId,
  KnowledgeFragmentId,
  KnowledgeMetadata,
  KnowledgeItem,
  KnowledgeDocument,
  KnowledgeFragment,
  KnowledgeCollection,
  KnowledgeNamespace,
  KnowledgeVersion,
  KnowledgeRelation,
  KnowledgeValidationResult,
} from '../../core/knowledge/index.js';

// ─── Helper Functions ───────────────────────────────────────────────

function makeMetadata(
  overrides?: Partial<KnowledgeMetadata>,
): KnowledgeMetadata {
  return Object.freeze({
    tags: overrides?.tags ?? ['test', 'integration'],
    source: overrides?.source ?? {
      type: 'unit-test',
      identifier: 'test-harness',
      timestamp: new Date().toISOString() as any,
    },
    confidence: overrides?.confidence ?? 0.95,
    expiresAt: overrides?.expiresAt,
    custom: overrides?.custom ?? { env: 'test' },
  });
}

/** Create a fresh runtime for each test. */
function createRuntime(): KnowledgeRuntime {
  return new KnowledgeRuntime();
}

/** Helper: create a namespace and return its ID. */
async function createNs(
  runtime: KnowledgeRuntime,
  name: string,
  parentId?: KnowledgeNamespaceId,
): Promise<KnowledgeNamespaceId> {
  const ns = await runtime.createNamespace(name, `desc for ${name}`, parentId);
  return ns.id;
}

/** Helper: create a basic Item and return it. */
async function createBasicItem(
  runtime: KnowledgeRuntime,
  nsId: KnowledgeNamespaceId,
  name: string,
  content = 'default content',
  meta?: KnowledgeMetadata,
): Promise<KnowledgeItem> {
  return runtime.createItem(
    nsId,
    name,
    content,
    KnowledgeKind.Item,
    meta ?? makeMetadata(),
  );
}

/** Helper: create a Document item. */
async function createDoc(
  runtime: KnowledgeRuntime,
  nsId: KnowledgeNamespaceId,
  name: string,
  fragmentIds: readonly KnowledgeFragmentId[] = [],
): Promise<KnowledgeDocument> {
  return runtime.createItem(
    nsId,
    name,
    'document body',
    KnowledgeKind.Document,
    makeMetadata(),
    { fragmentIds, documentType: 'markdown' },
  ) as Promise<KnowledgeDocument>;
}

/** Helper: create a Fragment item. */
async function createFrag(
  runtime: KnowledgeRuntime,
  nsId: KnowledgeNamespaceId,
  name: string,
  position = 0,
): Promise<KnowledgeFragment> {
  return runtime.createItem(
    nsId,
    name,
    'fragment text',
    KnowledgeKind.Fragment,
    makeMetadata(),
    { position, language: 'en' },
  ) as Promise<KnowledgeFragment>;
}

/** Helper: create a Collection item. */
async function createCol(
  runtime: KnowledgeRuntime,
  nsId: KnowledgeNamespaceId,
  name: string,
  memberIds: readonly KnowledgeItemId[] = [],
): Promise<KnowledgeCollection> {
  return runtime.createItem(
    nsId,
    name,
    'collection summary',
    KnowledgeKind.Collection,
    makeMetadata(),
    { memberIds, collectionType: 'manual' },
  ) as Promise<KnowledgeCollection>;
}

// ═══════════════════════════════════════════════════════════════════
// NAMESPACE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

describe('KnowledgeRuntime — Namespace Management', () => {
  let rt: KnowledgeRuntime;

  beforeEach(() => {
    rt = createRuntime();
  });

  it('creates a namespace with correct fields', async () => {
    const ns = await rt.createNamespace('core', 'Core knowledge area');
    expect(ns.name).toBe('core');
    expect(ns.description).toBe('Core knowledge area');
    expect(ns.parentId).toBeUndefined();
    expect(ns.id).toBeDefined();
    expect(ns.createdAt).toBeTypeOf('string');
    expect(ns.updatedAt).toBe(ns.createdAt);
    expect(ns.metadata).toEqual({});
  });

  it('creates a namespace with custom metadata', async () => {
    const ns = await rt.createNamespace('proj', 'Project NS', undefined, { team: 'alpha' });
    expect(ns.metadata).toEqual({ team: 'alpha' });
  });

  it('creates a child namespace with parentId', async () => {
    const parent = await rt.createNamespace('parent');
    const child = await rt.createNamespace('child', 'Child NS', parent.id);
    expect(child.parentId).toBe(parent.id);
  });

  it('rejects duplicate namespace name', async () => {
    await rt.createNamespace('dup');
    await expect(rt.createNamespace('dup')).rejects.toThrow(KnowledgeNamespaceAlreadyExistsError);
  });

  it('rejects child namespace with non-existent parent', async () => {
    const fakeParent = brandKnowledgeNamespaceId('nonexistent-parent-id');
    await expect(
      rt.createNamespace('orphan', 'Orphan', fakeParent),
    ).rejects.toThrow(KnowledgeNamespaceNotFoundError);
  });

  it('gets a namespace by ID', async () => {
    const created = await rt.createNamespace('findme');
    const found = await rt.getNamespace(created.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe('findme');
  });

  it('returns null for non-existent namespace', async () => {
    const result = await rt.getNamespace(brandKnowledgeNamespaceId('nope'));
    expect(result).toBeNull();
  });

  it('lists all namespaces', async () => {
    await rt.createNamespace('ns-a');
    await rt.createNamespace('ns-b');
    const list = await rt.listNamespaces();
    expect(list).toHaveLength(2);
    expect(list.map((n) => n.name).sort()).toEqual(['ns-a', 'ns-b']);
  });

  it('lists zero namespaces when empty', async () => {
    const list = await rt.listNamespaces();
    expect(list).toHaveLength(0);
  });

  it('deletes an empty namespace', async () => {
    const ns = await rt.createNamespace('temp');
    await rt.deleteNamespace(ns.id);
    const found = await rt.getNamespace(ns.id);
    expect(found).toBeNull();
  });

  it('rejects deleting a namespace that contains items', async () => {
    const nsId = await createNs(rt, 'occupied');
    await createBasicItem(rt, nsId, 'item1');
    await expect(rt.deleteNamespace(nsId)).rejects.toThrow(KnowledgeValidationError);
  });

  it('rejects deleting a non-existent namespace', async () => {
    await expect(
      rt.deleteNamespace(brandKnowledgeNamespaceId('ghost')),
    ).rejects.toThrow(KnowledgeNamespaceNotFoundError);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ITEM CRUD
// ═══════════════════════════════════════════════════════════════════

describe('KnowledgeRuntime — Item CRUD', () => {
  let rt: KnowledgeRuntime;
  let nsId: KnowledgeNamespaceId;

  beforeEach(async () => {
    rt = createRuntime();
    nsId = await createNs(rt, 'items-ns');
  });

  it('creates an Item kind', async () => {
    const item = await createBasicItem(rt, nsId, 'my-item', 'hello');
    expect(item.kind).toBe(KnowledgeKind.Item);
    expect(item.name).toBe('my-item');
    expect(item.content).toBe('hello');
    expect(item.namespaceId).toBe(nsId);
    expect(item.state).toBe(KnowledgeState.Active);
    expect(item.currentVersionId).toBeDefined();
  });

  it('creates a Document kind with fragmentIds and documentType', async () => {
    const fragId = brandKnowledgeFragmentId('fake-frag-1');
    const doc = await createDoc(rt, nsId, 'spec', [fragId]);
    expect(doc.kind).toBe(KnowledgeKind.Document);
    expect(doc.fragmentIds).toContainEqual(fragId);
    expect(doc.documentType).toBe('markdown');
  });

  it('creates a Fragment kind with position and language', async () => {
    const frag = await createFrag(rt, nsId, 'para-1', 3);
    expect(frag.kind).toBe(KnowledgeKind.Fragment);
    expect(frag.position).toBe(3);
    expect(frag.language).toBe('en');
  });

  it('creates a Collection kind with memberIds and collectionType', async () => {
    const memberId = brandKnowledgeItemId('fake-member-1');
    const col = await createCol(rt, nsId, 'reading-list', [memberId]);
    expect(col.kind).toBe(KnowledgeKind.Collection);
    expect(col.memberIds).toContainEqual(memberId);
    expect(col.collectionType).toBe('manual');
  });

  it('rejects item creation for non-existent namespace', async () => {
    const badNs = brandKnowledgeNamespaceId('ghost-ns');
    await expect(
      createBasicItem(rt, badNs, 'orphan'),
    ).rejects.toThrow(KnowledgeNamespaceNotFoundError);
  });

  it('gets an item by ID', async () => {
    const created = await createBasicItem(rt, nsId, 'get-me');
    const found = await rt.getItem(created.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe('get-me');
  });

  it('returns null for non-existent item', async () => {
    const result = await rt.getItem(brandKnowledgeItemId('no-such-item'));
    expect(result).toBeNull();
  });

  it('updates item name', async () => {
    const item = await createBasicItem(rt, nsId, 'old-name');
    const updated = await rt.updateItem(item.id, { name: 'new-name' });
    expect(updated.name).toBe('new-name');
    expect(updated.content).toBe('default content'); // unchanged
  });

  it('updates item content and creates a new version', async () => {
    const item = await createBasicItem(rt, nsId, 'versioned', 'v1');
    const updated = await rt.updateItem(item.id, { content: 'v2' });
    expect(updated.content).toBe('v2');
    expect(updated.currentVersionId).not.toBe(item.currentVersionId);

    const versions = await rt.getVersions(item.id);
    expect(versions).toHaveLength(2);
  });

  it('updates item metadata', async () => {
    const item = await createBasicItem(rt, nsId, 'meta-item');
    const newMeta = makeMetadata({ confidence: 0.5, tags: ['updated'] });
    const updated = await rt.updateItem(item.id, { metadata: newMeta });
    expect(updated.metadata.confidence).toBe(0.5);
    expect(updated.metadata.tags).toContain('updated');
  });

  it('updates item state', async () => {
    const item = await createBasicItem(rt, nsId, 'state-item');
    const updated = await rt.updateItem(item.id, { state: KnowledgeState.Draft });
    expect(updated.state).toBe(KnowledgeState.Draft);
  });

  it('rejects update for non-existent item', async () => {
    await expect(
      rt.updateItem(brandKnowledgeItemId('ghost'), { name: 'x' }),
    ).rejects.toThrow(KnowledgeItemNotFoundError);
  });

  it('deletes an item and cleans up relations, versions, and indexes', async () => {
    const item = await createBasicItem(rt, nsId, 'doomed');
    const other = await createBasicItem(rt, nsId, 'survivor');

    // Add a relation
    await rt.addRelation(KnowledgeRelationType.Reference, item.id, other.id);

    // Verify pre-conditions
    expect(await rt.getItem(item.id)).not.toBeNull();
    expect((await rt.getVersions(item.id)).length).toBeGreaterThan(0);

    // Delete
    await rt.deleteItem(item.id);

    // Item gone
    expect(await rt.getItem(item.id)).toBeNull();

    // Versions gone
    expect((await rt.getVersions(item.id))).toHaveLength(0);

    // Relation gone
    const rels = await rt.getRelations(other.id);
    expect(rels).toHaveLength(0);
  });

  it('rejects delete for non-existent item', async () => {
    await expect(
      rt.deleteItem(brandKnowledgeItemId('phantom')),
    ).rejects.toThrow(KnowledgeItemNotFoundError);
  });

  it('lists all items across all namespaces', async () => {
    await createBasicItem(rt, nsId, 'a');
    const ns2 = await createNs(rt, 'other-ns');
    await createBasicItem(rt, ns2, 'b');
    const items = await rt.listItems();
    expect(items).toHaveLength(2);
  });

  it('lists items filtered by namespace', async () => {
    await createBasicItem(rt, nsId, 'in-ns');
    const ns2 = await createNs(rt, 'filter-ns');
    await createBasicItem(rt, ns2, 'other-ns-item');
    const items = await rt.listItems(nsId);
    expect(items).toHaveLength(1);
    expect(items[0]!.name).toBe('in-ns');
  });

  it('sets item state via setItemState', async () => {
    const item = await createBasicItem(rt, nsId, 'stateful');
    const updated = await rt.setItemState(item.id, KnowledgeState.Deprecated);
    expect(updated.state).toBe(KnowledgeState.Deprecated);
  });

  it('setItemState rejects non-existent item', async () => {
    await expect(
      rt.setItemState(brandKnowledgeItemId('ghost'), KnowledgeState.Active),
    ).rejects.toThrow(KnowledgeItemNotFoundError);
  });
});

// ═══════════════════════════════════════════════════════════════════
// RETRIEVAL
// ═══════════════════════════════════════════════════════════════════

describe('KnowledgeRuntime — Retrieval', () => {
  let rt: KnowledgeRuntime;
  let nsId: KnowledgeNamespaceId;

  beforeEach(async () => {
    rt = createRuntime();
    nsId = await createNs(rt, 'retrieval-ns');
  });

  it('search returns items matching name substring', async () => {
    await createBasicItem(rt, nsId, 'alpha-widget', 'content about X');
    await createBasicItem(rt, nsId, 'beta-gadget', 'unrelated');
    const results = await rt.search('alpha');
    expect(results).toHaveLength(1);
    expect(results[0]!.name).toBe('alpha-widget');
  });

  it('search returns items matching content substring (case-insensitive)', async () => {
    await createBasicItem(rt, nsId, 'doc-a', 'UNIQUE_CONTENT_MARKER');
    await createBasicItem(rt, nsId, 'doc-b', 'something else');
    const results = await rt.search('unique_content_marker');
    expect(results).toHaveLength(1);
  });

  it('search returns all items when query is empty', async () => {
    await createBasicItem(rt, nsId, 'a');
    await createBasicItem(rt, nsId, 'b');
    const results = await rt.search('');
    expect(results).toHaveLength(2);
  });

  it('query with filter by namespace and kind', async () => {
    const ns2 = await createNs(rt, 'q-filter-ns');
    await createDoc(rt, nsId, 'doc-in-ns1');
    await createBasicItem(rt, ns2, 'item-in-ns2');

    const result = await rt.query({
      namespaceId: nsId,
      kinds: [KnowledgeKind.Document],
    });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('query with sort and pagination', async () => {
    await createBasicItem(rt, nsId, 'z-last');
    await createBasicItem(rt, nsId, 'a-first');

    const result = await rt.query(
      undefined,
      { field: KnowledgeSortField.Name, direction: KnowledgeSortDirection.Ascending },
      { offset: 0, limit: 1 },
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.name).toBe('a-first');
    expect(result.pagination).toBeDefined();
    expect(result.pagination!.hasMore).toBe(true);
  });

  it('getById returns the matching item', async () => {
    const item = await createBasicItem(rt, nsId, 'lookup');
    const found = await rt.getById(item.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(item.id);
  });

  it('getById returns null when not found', async () => {
    const result = await rt.getById(brandKnowledgeItemId('nonexistent'));
    expect(result).toBeNull();
  });

  it('getByNamespace returns items in the given namespace', async () => {
    await createBasicItem(rt, nsId, 'ns-item');
    const ns2 = await createNs(rt, 'other');
    await createBasicItem(rt, ns2, 'other-item');
    const results = await rt.getByNamespace(nsId);
    expect(results).toHaveLength(1);
    expect(results[0]!.name).toBe('ns-item');
  });

  it('getByTags with all mode requires every tag', async () => {
    await createBasicItem(rt, nsId, 't1', '', makeMetadata({ tags: ['red', 'blue', 'green'] }));
    await createBasicItem(rt, nsId, 't2', '', makeMetadata({ tags: ['red'] }));
    const results = await rt.getByTags(['red', 'blue'], 'all');
    expect(results).toHaveLength(1);
    expect(results[0]!.name).toBe('t1');
  });

  it('getByTags with any mode matches at least one tag', async () => {
    await createBasicItem(rt, nsId, 't1', '', makeMetadata({ tags: ['red'] }));
    await createBasicItem(rt, nsId, 't2', '', makeMetadata({ tags: ['blue'] }));
    const results = await rt.getByTags(['red', 'blue'], 'any');
    expect(results).toHaveLength(2);
  });

  it('getBySource filters by source type', async () => {
    await createBasicItem(rt, nsId, 'from-api', '', makeMetadata({
      source: { type: 'api', identifier: 'api-1', timestamp: new Date().toISOString() as any },
    }));
    await createBasicItem(rt, nsId, 'from-manual', '', makeMetadata({
      source: { type: 'manual', identifier: 'manual-1', timestamp: new Date().toISOString() as any },
    }));
    const results = await rt.getBySource('api');
    expect(results).toHaveLength(1);
    expect(results[0]!.name).toBe('from-api');
  });
});

// ═══════════════════════════════════════════════════════════════════
// GRAPH (via runtime)
// ═══════════════════════════════════════════════════════════════════

describe('KnowledgeRuntime — Graph', () => {
  let rt: KnowledgeRuntime;
  let nsId: KnowledgeNamespaceId;
  let itemA: KnowledgeItem;
  let itemB: KnowledgeItem;
  let itemC: KnowledgeItem;

  beforeEach(async () => {
    rt = createRuntime();
    nsId = await createNs(rt, 'graph-ns');
    itemA = await createBasicItem(rt, nsId, 'item-a', 'A');
    itemB = await createBasicItem(rt, nsId, 'item-b', 'B');
    itemC = await createBasicItem(rt, nsId, 'item-c', 'C');
  });

  it('adds a Reference relation', async () => {
    const rel = await rt.addRelation(KnowledgeRelationType.Reference, itemA.id, itemB.id);
    expect(rel.type).toBe(KnowledgeRelationType.Reference);
    expect(rel.sourceId).toBe(itemA.id);
    expect(rel.targetId).toBe(itemB.id);
    expect(rel.id).toBeDefined();
  });

  it('adds a Dependency relation', async () => {
    const rel = await rt.addRelation(KnowledgeRelationType.Dependency, itemA.id, itemB.id);
    expect(rel.type).toBe(KnowledgeRelationType.Dependency);
  });

  it('adds a Parent relation', async () => {
    const rel = await rt.addRelation(KnowledgeRelationType.Parent, itemA.id, itemB.id);
    expect(rel.type).toBe(KnowledgeRelationType.Parent);
  });

  it('adds a Child relation', async () => {
    const rel = await rt.addRelation(KnowledgeRelationType.Child, itemB.id, itemA.id);
    expect(rel.type).toBe(KnowledgeRelationType.Child);
  });

  it('adds a DerivedFrom relation', async () => {
    const rel = await rt.addRelation(KnowledgeRelationType.DerivedFrom, itemC.id, itemA.id);
    expect(rel.type).toBe(KnowledgeRelationType.DerivedFrom);
  });

  it('adds a Supersedes relation', async () => {
    const rel = await rt.addRelation(KnowledgeRelationType.Supersedes, itemA.id, itemB.id);
    expect(rel.type).toBe(KnowledgeRelationType.Supersedes);
  });

  it('adds a Related relation', async () => {
    const rel = await rt.addRelation(KnowledgeRelationType.Related, itemA.id, itemB.id);
    expect(rel.type).toBe(KnowledgeRelationType.Related);
  });

  it('rejects relation with non-existent source item', async () => {
    await expect(
      rt.addRelation(
        KnowledgeRelationType.Reference,
        brandKnowledgeItemId('ghost-src'),
        itemB.id,
      ),
    ).rejects.toThrow(KnowledgeItemNotFoundError);
  });

  it('rejects relation with non-existent target item', async () => {
    await expect(
      rt.addRelation(
        KnowledgeRelationType.Reference,
        itemA.id,
        brandKnowledgeItemId('ghost-tgt'),
      ),
    ).rejects.toThrow(KnowledgeItemNotFoundError);
  });

  it('detects and rejects cyclic Parent/Child relations', async () => {
    // A → Parent → B → Parent → C
    await rt.addRelation(KnowledgeRelationType.Parent, itemA.id, itemB.id);
    await rt.addRelation(KnowledgeRelationType.Parent, itemB.id, itemC.id);

    // C → Parent → A would create a cycle
    await expect(
      rt.addRelation(KnowledgeRelationType.Parent, itemC.id, itemA.id),
    ).rejects.toThrow(KnowledgeCyclicRelationError);
  });

  it('detects and rejects cyclic Dependency relations', async () => {
    await rt.addRelation(KnowledgeRelationType.Dependency, itemA.id, itemB.id);
    await expect(
      rt.addRelation(KnowledgeRelationType.Dependency, itemB.id, itemA.id),
    ).rejects.toThrow(KnowledgeCyclicRelationError);
  });

  it('allows non-cycle-sensitive relations to form cycles', async () => {
    // Related type is NOT cycle-sensitive, so A → Related → B → Related → A is fine
    await rt.addRelation(KnowledgeRelationType.Related, itemA.id, itemB.id);
    await rt.addRelation(KnowledgeRelationType.Related, itemB.id, itemA.id);
    const rels = await rt.getRelations(itemA.id);
    expect(rels).toHaveLength(2);
  });

  it('removes a relation', async () => {
    const rel = await rt.addRelation(KnowledgeRelationType.Reference, itemA.id, itemB.id);
    await rt.removeRelation(rel.id);
    const rels = await rt.getRelations(itemA.id);
    expect(rels).toHaveLength(0);
  });

  it('getRelations returns relations for an item', async () => {
    await rt.addRelation(KnowledgeRelationType.Reference, itemA.id, itemB.id);
    await rt.addRelation(KnowledgeRelationType.Related, itemA.id, itemC.id);
    const rels = await rt.getRelations(itemA.id);
    expect(rels).toHaveLength(2);
  });

  it('getRelations filters by type', async () => {
    await rt.addRelation(KnowledgeRelationType.Reference, itemA.id, itemB.id);
    await rt.addRelation(KnowledgeRelationType.Related, itemA.id, itemC.id);
    const refRels = await rt.getRelations(itemA.id, KnowledgeRelationType.Reference);
    expect(refRels).toHaveLength(1);
    expect(refRels[0]!.type).toBe(KnowledgeRelationType.Reference);
  });

  it('getRelatedItems returns related item IDs', async () => {
    await rt.addRelation(KnowledgeRelationType.Reference, itemA.id, itemB.id);
    await rt.addRelation(KnowledgeRelationType.Reference, itemA.id, itemC.id);
    const related = await rt.getRelatedItems(itemA.id);
    expect(related).toHaveLength(2);
    expect(related).toContainEqual(itemB.id);
    expect(related).toContainEqual(itemC.id);
  });

  it('getRelatedItems filters by type', async () => {
    await rt.addRelation(KnowledgeRelationType.Reference, itemA.id, itemB.id);
    await rt.addRelation(KnowledgeRelationType.Related, itemA.id, itemC.id);
    const related = await rt.getRelatedItems(itemA.id, KnowledgeRelationType.Reference);
    expect(related).toHaveLength(1);
    expect(related[0]).toBe(itemB.id);
  });

  it('hasPath returns true when a path exists', async () => {
    await rt.addRelation(KnowledgeRelationType.Reference, itemA.id, itemB.id);
    await rt.addRelation(KnowledgeRelationType.Reference, itemB.id, itemC.id);
    expect(await rt.hasPath(itemA.id, itemC.id)).toBe(true);
  });

  it('hasPath returns false when no path exists', async () => {
    await rt.addRelation(KnowledgeRelationType.Reference, itemA.id, itemB.id);
    // C is disconnected
    expect(await rt.hasPath(itemA.id, itemC.id)).toBe(false);
  });

  it('getShortestPath returns the ordered path', async () => {
    await rt.addRelation(KnowledgeRelationType.Reference, itemA.id, itemB.id);
    await rt.addRelation(KnowledgeRelationType.Reference, itemB.id, itemC.id);
    const path = await rt.getShortestPath(itemA.id, itemC.id);
    expect(path).not.toBeNull();
    expect(path!).toHaveLength(3);
    expect(path![0]).toBe(itemA.id);
    expect(path![1]).toBe(itemB.id);
    expect(path![2]).toBe(itemC.id);
  });

  it('getShortestPath returns null when unreachable', async () => {
    const path = await rt.getShortestPath(itemA.id, itemC.id);
    expect(path).toBeNull();
  });

  it('detectCycles returns empty array when no cycles exist', async () => {
    await rt.addRelation(KnowledgeRelationType.Reference, itemA.id, itemB.id);
    await rt.addRelation(KnowledgeRelationType.Related, itemB.id, itemC.id);
    const cycles = await rt.detectCycles();
    expect(cycles).toHaveLength(0);
  });

  it('detectCycles ignores non-cycle-sensitive relations', async () => {
    // Related type is not cycle-sensitive, so detectCycles reports 0 cycles
    await rt.addRelation(KnowledgeRelationType.Related, itemA.id, itemB.id);
    await rt.addRelation(KnowledgeRelationType.Related, itemB.id, itemA.id);
    const cycles = await rt.detectCycles();
    expect(cycles).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// VERSIONING (via runtime)
// ═══════════════════════════════════════════════════════════════════

describe('KnowledgeRuntime — Versioning', () => {
  let rt: KnowledgeRuntime;
  let nsId: KnowledgeNamespaceId;

  beforeEach(async () => {
    rt = createRuntime();
    nsId = await createNs(rt, 'version-ns');
  });

  it('creates an initial version on item creation', async () => {
    const item = await createBasicItem(rt, nsId, 'v-item', 'initial');
    const versions = await rt.getVersions(item.id);
    expect(versions).toHaveLength(1);
    expect(versions[0]!.content).toBe('initial');
    expect(versions[0]!.revision).toBe(1);
    expect(versions[0]!.changelog).toBe('Initial version');
  });

  it('getVersion returns a specific version', async () => {
    const item = await createBasicItem(rt, nsId, 'gv', 'first');
    const versions = await rt.getVersions(item.id);
    const found = await rt.getVersion(versions[0]!.id);
    expect(found).not.toBeNull();
    expect(found!.revision).toBe(1);
  });

  it('getVersion returns null for unknown version', async () => {
    const result = await rt.getVersion(brandKnowledgeItemId('no-such-version') as any);
    expect(result).toBeNull();
  });

  it('getLatestVersion returns the most recent version', async () => {
    const item = await createBasicItem(rt, nsId, 'latest', 'v1');
    await rt.updateItem(item.id, { content: 'v2' });
    await rt.updateItem(item.id, { content: 'v3' });
    const latest = await rt.getLatestVersion(item.id);
    expect(latest).not.toBeNull();
    expect(latest!.content).toBe('v3');
    expect(latest!.revision).toBe(3);
  });

  it('getVersions returns versions in descending revision order', async () => {
    const item = await createBasicItem(rt, nsId, 'ordered', 'v1');
    await rt.updateItem(item.id, { content: 'v2' });
    const versions = await rt.getVersions(item.id);
    expect(versions).toHaveLength(2);
    expect(versions[0]!.revision).toBe(2);
    expect(versions[1]!.revision).toBe(1);
  });

  it('rollback restores content from a previous revision', async () => {
    const item = await createBasicItem(rt, nsId, 'rb', 'original');
    await rt.updateItem(item.id, { content: 'modified' });

    // Verify current state
    const current = await rt.getItem(item.id);
    expect(current!.content).toBe('modified');

    // Rollback to revision 1
    const rolledBack = await rt.rollback(item.id, 1);
    expect(rolledBack.content).toBe('original');

    // Item should reflect the rollback
    const afterRollback = await rt.getItem(item.id);
    expect(afterRollback!.content).toBe('original');
  });

  it('rollback creates a new version with the old content', async () => {
    const item = await createBasicItem(rt, nsId, 'rb-ver', 'first');
    await rt.updateItem(item.id, { content: 'second' });

    await rt.rollback(item.id, 1);

    // Should now have 3 versions: rev1, rev2, rev3(rollback of rev1)
    const versions = await rt.getVersions(item.id);
    expect(versions).toHaveLength(3);
    // Most recent version should have the rolled-back content
    expect(versions[0]!.content).toBe('first');
    expect(versions[0]!.revision).toBe(3);
  });

  it('rollback restores state from the target revision', async () => {
    const item = await createBasicItem(rt, nsId, 'rb-state', 'initial');
    await rt.setItemState(item.id, KnowledgeState.Deprecated);
    const updated = await rt.updateItem(item.id, { content: 'new-content' });
    // Updated item keeps existing state when not explicitly changed
    expect(updated.state).toBe(KnowledgeState.Deprecated);

    // Rollback to rev 1 which had Active state
    const rolledBack = await rt.rollback(item.id, 1);
    expect(rolledBack.state).toBe(KnowledgeState.Active);

    // Item state should also be Active now
    const after = await rt.getItem(item.id);
    expect(after!.state).toBe(KnowledgeState.Active);
  });
});

// ═══════════════════════════════════════════════════════════════════
// INDEXING (via runtime)
// ═══════════════════════════════════════════════════════════════════

describe('KnowledgeRuntime — Indexing', () => {
  let rt: KnowledgeRuntime;
  let nsId: KnowledgeNamespaceId;

  beforeEach(async () => {
    rt = createRuntime();
    nsId = await createNs(rt, 'index-ns');
  });

  it('rebuildIndex returns entry count', async () => {
    await createBasicItem(rt, nsId, 'idx-a', '', makeMetadata({ tags: ['tag1'] }));
    await createBasicItem(rt, nsId, 'idx-b', '', makeMetadata({ tags: ['tag1'] }));
    const count = await rt.rebuildIndex(KnowledgeIndexType.Tag);
    // Each item has 3 tags (test, integration, tag1), so 6 entries
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('rebuildAllIndexes completes without error', async () => {
    await createBasicItem(rt, nsId, 'all-idx');
    await expect(rt.rebuildAllIndexes()).resolves.toBeUndefined();
  });

  it('getIndexStats returns stats for all managed index types', async () => {
    await createBasicItem(rt, nsId, 'stat-item');
    const stats = await rt.getIndexStats();
    // Should include Key, Namespace, Tag, Source, Timestamp
    expect(stats.length).toBeGreaterThanOrEqual(5);
    // At least the Key index should have 1 entry
    const keyStats = stats.find((s) => s.indexType === KnowledgeIndexType.Key);
    expect(keyStats).toBeDefined();
    expect(keyStats!.entryCount).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// VALIDATION (via runtime)
// ═══════════════════════════════════════════════════════════════════

describe('KnowledgeRuntime — Validation', () => {
  let rt: KnowledgeRuntime;

  beforeEach(() => {
    rt = createRuntime();
  });

  it('validate returns a KnowledgeValidationResult', async () => {
    const nsId = await createNs(rt, 'valid-ns');
    await createBasicItem(rt, nsId, 'valid-item');
    const result: KnowledgeValidationResult = await rt.validate();
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('issues');
    expect(result).toHaveProperty('checkedAt');
  });

  it('validate is valid for a consistent store', async () => {
    const nsId = await createNs(rt, 'clean-ns');
    await createBasicItem(rt, nsId, 'clean-item');
    const result = await rt.validate();
    // No errors expected for a clean store
    // Orphan warnings may exist (item not in any relation) — but severity is 'warning'
    const errors = result.issues.filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
    expect(result.valid).toBe(true);
  });

  it('validate reports warnings for orphaned items (not in any relation)', async () => {
    const nsId = await createNs(rt, 'orphan-ns');
    await createBasicItem(rt, nsId, 'orphan-item');
    const result = await rt.validate();
    const warnings = result.issues.filter((i) => i.severity === 'warning');
    // Graph consistency check warns about orphaned items
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(warnings.some((w) => w.code === 'KNOWLEDGE_ORPHAN_ITEM')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// NAMESPACE ISOLATION
// ═══════════════════════════════════════════════════════════════════

describe('KnowledgeRuntime — Namespace Isolation', () => {
  let rt: KnowledgeRuntime;
  let nsA: KnowledgeNamespaceId;
  let nsB: KnowledgeNamespaceId;
  let childNs: KnowledgeNamespaceId;
  let itemInA: KnowledgeItem;

  beforeEach(async () => {
    rt = createRuntime();
    nsA = await createNs(rt, 'ns-alpha');
    nsB = await createNs(rt, 'ns-beta');
    childNs = await createNs(rt, 'ns-child', nsA);
    itemInA = await createBasicItem(rt, nsA, 'alpha-item');
  });

  it('allows access when item and accessor are in the same namespace', () => {
    expect(rt.enforceNamespaceIsolation(itemInA, nsA)).toBe(true);
  });

  it('denies access when item and accessor are in different namespaces', () => {
    expect(rt.enforceNamespaceIsolation(itemInA, nsB)).toBe(false);
  });

  it('denies hierarchical access from child to parent item', () => {
    // itemInA is in nsA (root); accessor is childNs whose parent is nsA
    // Walk up from item's namespace (nsA): nsA has no parent → false
    expect(rt.enforceNamespaceIsolation(itemInA, childNs, true)).toBe(false);
  });

  it('allows hierarchical access from parent namespace to child namespace item', async () => {
    const itemInChild = await createBasicItem(rt, childNs, 'child-item');
    // item is in childNs. Walk up: childNs.parentId = nsA → matches accessor → true
    expect(rt.enforceNamespaceIsolation(itemInChild, nsA, true)).toBe(true);
  });

  it('denies hierarchical access when allowHierarchical is false', async () => {
    const itemInChild = await createBasicItem(rt, childNs, 'child-item-2');
    expect(rt.enforceNamespaceIsolation(itemInChild, nsA, false)).toBe(false);
  });

  it('allows deep hierarchical access (grandparent → grandchild)', async () => {
    const grandchildNs = await createNs(rt, 'ns-grandchild', childNs);
    const itemInGrandchild = await createBasicItem(rt, grandchildNs, 'gc-item');
    // Walk up from grandchildNs: parent=childNs, then parent=nsA → matches accessor → true
    expect(rt.enforceNamespaceIsolation(itemInGrandchild, nsA, true)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// LIFECYCLE
// ═══════════════════════════════════════════════════════════════════

describe('KnowledgeRuntime — Lifecycle', () => {
  let rt: KnowledgeRuntime;

  beforeEach(() => {
    rt = createRuntime();
  });

  it('dispose clears internal state', async () => {
    const nsId = await createNs(rt, 'dispose-ns');
    await createBasicItem(rt, nsId, 'dispose-item');

    rt.dispose();

    // After dispose, stats should show zeros
    const stats = rt.getStats();
    expect(stats.itemCount).toBe(0);
    expect(stats.namespaceCount).toBe(0);
    expect(stats.versionCount).toBe(0);
  });

  it('dispose is idempotent', async () => {
    const nsId = await createNs(rt, 'idem-ns');
    await createBasicItem(rt, nsId, 'idem-item');
    rt.dispose();
    rt.dispose(); // second call should not throw
    const stats = rt.getStats();
    expect(stats.itemCount).toBe(0);
  });

  it('throws KnowledgeStorageError on all operations after dispose', async () => {
    const nsId = await createNs(rt, 'post-dispose-ns');
    const item = await createBasicItem(rt, nsId, 'pd-item');
    rt.dispose();

    const disposedOps = [
      () => rt.createNamespace('after-dispose'),
      () => rt.getNamespace(nsId),
      () => rt.listNamespaces(),
      () => rt.createItem(nsId, 'x', '', KnowledgeKind.Item, makeMetadata()),
      () => rt.getItem(item.id),
      () => rt.updateItem(item.id, { name: 'y' }),
      () => rt.deleteItem(item.id),
      () => rt.listItems(),
      () => rt.setItemState(item.id, KnowledgeState.Archived),
      () => rt.search('q'),
      () => rt.query(),
      () => rt.getById(item.id),
      () => rt.getByNamespace(nsId),
      () => rt.getByTags(['t']),
      () => rt.getBySource('s'),
      () => rt.addRelation(KnowledgeRelationType.Related, item.id, item.id),
      () => rt.removeRelation(brandKnowledgeItemId('x') as any),
      () => rt.getRelations(item.id),
      () => rt.getRelatedItems(item.id),
      () => rt.hasPath(item.id, item.id),
      () => rt.getShortestPath(item.id, item.id),
      () => rt.detectCycles(),
      () => rt.getVersion(brandKnowledgeItemId('x') as any),
      () => rt.getLatestVersion(item.id),
      () => rt.getVersions(item.id),
      () => rt.rollback(item.id, 1),
      () => rt.rebuildIndex(KnowledgeIndexType.Key),
      () => rt.rebuildAllIndexes(),
      () => rt.getIndexStats(),
      () => rt.validate(),
    ];

    for (const op of disposedOps) {
      await expect(op()).rejects.toThrow(KnowledgeStorageError);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════

describe('KnowledgeRuntime — Statistics', () => {
  it('getStats returns accurate counts', async () => {
    const rt = createRuntime();
    const ns1 = await createNs(rt, 'stats-ns1');
    const ns2 = await createNs(rt, 'stats-ns2');
    await createBasicItem(rt, ns1, 'item-1');
    await createBasicItem(rt, ns1, 'item-2');
    await createBasicItem(rt, ns2, 'item-3');
    // Each item creation creates 1 version
    const stats = rt.getStats();
    expect(stats.namespaceCount).toBe(2);
    expect(stats.itemCount).toBe(3);
    expect(stats.versionCount).toBe(3);
  });

  it('getStats returns zeros for empty runtime', () => {
    const rt = createRuntime();
    const stats = rt.getStats();
    expect(stats.namespaceCount).toBe(0);
    expect(stats.itemCount).toBe(0);
    expect(stats.versionCount).toBe(0);
    expect(stats.relationCount).toBe(0);
  });

  it('versionCount increases with content updates', async () => {
    const rt = createRuntime();
    const nsId = await createNs(rt, 'vc-ns');
    const item = await createBasicItem(rt, nsId, 'vc-item', 'v1');
    await rt.updateItem(item.id, { content: 'v2' });
    await rt.updateItem(item.id, { content: 'v3' });
    const stats = rt.getStats();
    expect(stats.versionCount).toBe(3);
  });

  it('versionCount decreases when items are deleted', async () => {
    const rt = createRuntime();
    const nsId = await createNs(rt, 'vcd-ns');
    const item = await createBasicItem(rt, nsId, 'vcd-item', 'v1');
    await rt.updateItem(item.id, { content: 'v2' });
    expect(rt.getStats().versionCount).toBe(2);
    await rt.deleteItem(item.id);
    expect(rt.getStats().versionCount).toBe(0);
  });
});
