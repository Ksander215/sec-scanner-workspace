import { describe, it, expect } from 'vitest';
import {
  brandKnowledgeItemId,
  brandKnowledgeDocumentId,
  brandKnowledgeFragmentId,
  brandKnowledgeCollectionId,
  brandKnowledgeNamespaceId,
  brandKnowledgeVersionId,
  brandKnowledgeRelationId,
  brandKnowledgeIndexEntryId,
  KnowledgeKind,
  KnowledgeState,
  KnowledgeRelationType,
  KnowledgeIndexType,
  KnowledgeSortDirection,
  KnowledgeSortField,
  serializeKnowledgeItem,
  deserializeKnowledgeItem,
  serializeKnowledgeDocument,
  deserializeKnowledgeDocument,
  serializeKnowledgeFragment,
  deserializeKnowledgeFragment,
  serializeKnowledgeCollection,
  deserializeKnowledgeCollection,
  serializeKnowledgeNamespace,
  deserializeKnowledgeNamespace,
  serializeKnowledgeVersion,
  deserializeKnowledgeVersion,
  serializeKnowledgeRelation,
  deserializeKnowledgeRelation,
  serializeKnowledgeIndexEntry,
  deserializeKnowledgeIndexEntry,
} from '../../core/knowledge/types.js';
import type {
  KnowledgeItemId,
  KnowledgeDocumentId,
  KnowledgeFragmentId,
  KnowledgeCollectionId,
  KnowledgeNamespaceId,
  KnowledgeVersionId,
  KnowledgeRelationId,
  KnowledgeIndexEntryId,
  KnowledgeItem,
  KnowledgeDocument,
  KnowledgeFragment,
  KnowledgeCollection,
  KnowledgeNamespace,
  KnowledgeVersion,
  KnowledgeRelation,
  KnowledgeIndexEntry,
  SerializableKnowledgeItem,
  SerializableKnowledgeNamespace,
  SerializableKnowledgeVersion,
  SerializableKnowledgeRelation,
  SerializableKnowledgeIndexEntry,
} from '../../core/knowledge/types.js';

// ─── Helpers ────────────────────────────────────────────────────────

const TS = 1_700_000_000_000; // fixed timestamp for tests
const makeMetadata = () => ({
  tags: ['test'] as const,
  source: {
    type: 'unit-test',
    identifier: 'test-source',
    timestamp: TS,
  } as const,
  confidence: 0.95,
  custom: Object.freeze({ key: 'value' }) as Readonly<Record<string, string>>,
});

// ─── Branded Type Helpers ───────────────────────────────────────────

describe('Branded Type Helpers', () => {
  it('brandKnowledgeItemId returns branded string', () => {
    const id = brandKnowledgeItemId('item-001');
    expect(id).toBe('item-001');
    expect(typeof id).toBe('string');
  });

  it('brandKnowledgeDocumentId returns branded string', () => {
    const id = brandKnowledgeDocumentId('doc-001');
    expect(id).toBe('doc-001');
    expect(typeof id).toBe('string');
  });

  it('brandKnowledgeFragmentId returns branded string', () => {
    const id = brandKnowledgeFragmentId('frag-001');
    expect(id).toBe('frag-001');
    expect(typeof id).toBe('string');
  });

  it('brandKnowledgeCollectionId returns branded string', () => {
    const id = brandKnowledgeCollectionId('col-001');
    expect(id).toBe('col-001');
    expect(typeof id).toBe('string');
  });

  it('brandKnowledgeNamespaceId returns branded string', () => {
    const id = brandKnowledgeNamespaceId('ns-001');
    expect(id).toBe('ns-001');
    expect(typeof id).toBe('string');
  });

  it('brandKnowledgeVersionId returns branded string', () => {
    const id = brandKnowledgeVersionId('ver-001');
    expect(id).toBe('ver-001');
    expect(typeof id).toBe('string');
  });

  it('brandKnowledgeRelationId returns branded string', () => {
    const id = brandKnowledgeRelationId('rel-001');
    expect(id).toBe('rel-001');
    expect(typeof id).toBe('string');
  });

  it('brandKnowledgeIndexEntryId returns branded string', () => {
    const id = brandKnowledgeIndexEntryId('idx-001');
    expect(id).toBe('idx-001');
    expect(typeof id).toBe('string');
  });

  it('all brand functions preserve the original string value exactly', () => {
    const raw = 'my-unique-id-42';
    expect(brandKnowledgeItemId(raw)).toBe(raw);
    expect(brandKnowledgeDocumentId(raw)).toBe(raw);
    expect(brandKnowledgeFragmentId(raw)).toBe(raw);
    expect(brandKnowledgeCollectionId(raw)).toBe(raw);
    expect(brandKnowledgeNamespaceId(raw)).toBe(raw);
    expect(brandKnowledgeVersionId(raw)).toBe(raw);
    expect(brandKnowledgeRelationId(raw)).toBe(raw);
    expect(brandKnowledgeIndexEntryId(raw)).toBe(raw);
  });

  it('branded ids are assignable to string type', () => {
    const item: KnowledgeItemId = brandKnowledgeItemId('i1');
    const plain: string = item; // must not error
    expect(plain).toBe('i1');
  });

  it('brand functions handle empty strings', () => {
    expect(brandKnowledgeItemId('')).toBe('');
    expect(brandKnowledgeDocumentId('')).toBe('');
    expect(brandKnowledgeNamespaceId('')).toBe('');
  });

  it('brand functions handle UUID-like strings', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(brandKnowledgeItemId(uuid)).toBe(uuid);
    expect(brandKnowledgeVersionId(uuid)).toBe(uuid);
  });
});

// ─── Enums ───────────────────────────────────────────────────────────

describe('KnowledgeKind enum', () => {
  it('has 4 values', () => {
    expect(Object.values(KnowledgeKind)).toHaveLength(4);
  });

  it('contains Item, Document, Fragment, Collection', () => {
    expect(KnowledgeKind.Item).toBe('Item');
    expect(KnowledgeKind.Document).toBe('Document');
    expect(KnowledgeKind.Fragment).toBe('Fragment');
    expect(KnowledgeKind.Collection).toBe('Collection');
  });

  it('supports reverse mapping via enum object', () => {
    expect(KnowledgeKind['Item']).toBe('Item');
    expect(KnowledgeKind['Document']).toBe('Document');
  });
});

describe('KnowledgeState enum', () => {
  it('has 4 values', () => {
    expect(Object.values(KnowledgeState)).toHaveLength(4);
  });

  it('contains Draft, Active, Deprecated, Archived', () => {
    expect(KnowledgeState.Draft).toBe('Draft');
    expect(KnowledgeState.Active).toBe('Active');
    expect(KnowledgeState.Deprecated).toBe('Deprecated');
    expect(KnowledgeState.Archived).toBe('Archived');
  });
});

describe('KnowledgeRelationType enum', () => {
  it('has 8 values', () => {
    expect(Object.values(KnowledgeRelationType)).toHaveLength(8);
  });

  it('contains all relation types', () => {
    expect(KnowledgeRelationType.Parent).toBe('Parent');
    expect(KnowledgeRelationType.Child).toBe('Child');
    expect(KnowledgeRelationType.Dependency).toBe('Dependency');
    expect(KnowledgeRelationType.Reference).toBe('Reference');
    expect(KnowledgeRelationType.DerivedFrom).toBe('DerivedFrom');
    expect(KnowledgeRelationType.Duplicate).toBe('Duplicate');
    expect(KnowledgeRelationType.Supersedes).toBe('Supersedes');
    expect(KnowledgeRelationType.Related).toBe('Related');
  });
});

describe('KnowledgeIndexType enum', () => {
  it('has 6 values', () => {
    expect(Object.values(KnowledgeIndexType)).toHaveLength(6);
  });

  it('contains Key, Namespace, Tag, Relation, Source, Timestamp', () => {
    expect(KnowledgeIndexType.Key).toBe('Key');
    expect(KnowledgeIndexType.Namespace).toBe('Namespace');
    expect(KnowledgeIndexType.Tag).toBe('Tag');
    expect(KnowledgeIndexType.Relation).toBe('Relation');
    expect(KnowledgeIndexType.Source).toBe('Source');
    expect(KnowledgeIndexType.Timestamp).toBe('Timestamp');
  });
});

describe('KnowledgeSortDirection enum', () => {
  it('has 2 values', () => {
    expect(Object.values(KnowledgeSortDirection)).toHaveLength(2);
  });

  it('contains Ascending and Descending', () => {
    expect(KnowledgeSortDirection.Ascending).toBe('Ascending');
    expect(KnowledgeSortDirection.Descending).toBe('Descending');
  });
});

describe('KnowledgeSortField enum', () => {
  it('has 5 values', () => {
    expect(Object.values(KnowledgeSortField)).toHaveLength(5);
  });

  it('contains CreatedAt, UpdatedAt, Version, Relevance, Name', () => {
    expect(KnowledgeSortField.CreatedAt).toBe('CreatedAt');
    expect(KnowledgeSortField.UpdatedAt).toBe('UpdatedAt');
    expect(KnowledgeSortField.Version).toBe('Version');
    expect(KnowledgeSortField.Relevance).toBe('Relevance');
    expect(KnowledgeSortField.Name).toBe('Name');
  });
});

// ─── Serialization / Deserialization Round-Trips ─────────────────────

describe('KnowledgeItem round-trip', () => {
  const makeItem = (): KnowledgeItem =>
    Object.freeze({
      id: brandKnowledgeItemId('item-1'),
      kind: KnowledgeKind.Item,
      namespaceId: brandKnowledgeNamespaceId('ns-1'),
      name: 'Test Item',
      content: 'Some content',
      metadata: makeMetadata(),
      state: KnowledgeState.Active,
      currentVersionId: brandKnowledgeVersionId('ver-1'),
      createdAt: TS,
      updatedAt: TS,
    });

  it('serializes branded ids to plain strings', () => {
    const serialized = serializeKnowledgeItem(makeItem());
    expect(typeof serialized.id).toBe('string');
    expect(typeof serialized.namespaceId).toBe('string');
    expect(typeof serialized.currentVersionId).toBe('string');
    expect(serialized.id).toBe('item-1');
  });

  it('deserializes plain strings back to branded ids', () => {
    const serialized = serializeKnowledgeItem(makeItem());
    const deserialized = deserializeKnowledgeItem(serialized);
    expect(deserialized.id).toBe('item-1');
    expect(deserialized.namespaceId).toBe('ns-1');
    expect(deserialized.currentVersionId).toBe('ver-1');
  });

  it('round-trips preserve all fields', () => {
    const original = makeItem();
    const serialized = serializeKnowledgeItem(original);
    const restored = deserializeKnowledgeItem(serialized);

    expect(restored.name).toBe(original.name);
    expect(restored.content).toBe(original.content);
    expect(restored.state).toBe(original.state);
    expect(restored.kind).toBe(original.kind);
    expect(restored.createdAt).toBe(original.createdAt);
    expect(restored.updatedAt).toBe(original.updatedAt);
    expect(restored.metadata.confidence).toBe(original.metadata.confidence);
  });
});

describe('KnowledgeDocument round-trip', () => {
  const makeDocument = (): KnowledgeDocument =>
    Object.freeze({
      id: brandKnowledgeItemId('doc-1'),
      kind: KnowledgeKind.Document,
      namespaceId: brandKnowledgeNamespaceId('ns-1'),
      name: 'Test Document',
      content: 'Document content',
      metadata: makeMetadata(),
      state: KnowledgeState.Active,
      currentVersionId: brandKnowledgeVersionId('ver-1'),
      createdAt: TS,
      updatedAt: TS,
      fragmentIds: [
        brandKnowledgeFragmentId('frag-1'),
        brandKnowledgeFragmentId('frag-2'),
      ] as const,
      documentType: 'markdown',
    });

  it('serializes fragment ids as plain strings', () => {
    const serialized = serializeKnowledgeDocument(makeDocument());
    expect(serialized.fragmentIds).toEqual(['frag-1', 'frag-2']);
    expect(serialized.documentType).toBe('markdown');
  });

  it('deserializes back to branded fragment ids', () => {
    const serialized = serializeKnowledgeDocument(makeDocument());
    const restored = deserializeKnowledgeDocument(serialized);
    expect(restored.fragmentIds).toHaveLength(2);
    expect(restored.fragmentIds[0]).toBe('frag-1');
    expect(restored.fragmentIds[1]).toBe('frag-2');
    expect(restored.documentType).toBe('markdown');
  });

  it('round-trip preserves all document-specific fields', () => {
    const original = makeDocument();
    const serialized = serializeKnowledgeDocument(original);
    const restored = deserializeKnowledgeDocument(serialized);

    expect(restored.kind).toBe(KnowledgeKind.Document);
    expect(restored.name).toBe(original.name);
    expect(restored.content).toBe(original.content);
    expect(restored.state).toBe(original.state);
    expect(restored.fragmentIds).toEqual([...original.fragmentIds]);
    expect(restored.documentType).toBe(original.documentType);
  });
});

describe('KnowledgeFragment round-trip', () => {
  const makeFragment = (): KnowledgeFragment =>
    Object.freeze({
      id: brandKnowledgeItemId('frag-1'),
      kind: KnowledgeKind.Fragment,
      namespaceId: brandKnowledgeNamespaceId('ns-1'),
      name: 'Test Fragment',
      content: 'Fragment content',
      metadata: makeMetadata(),
      state: KnowledgeState.Draft,
      currentVersionId: brandKnowledgeVersionId('ver-1'),
      createdAt: TS,
      updatedAt: TS,
      documentId: brandKnowledgeDocumentId('doc-1'),
      position: 3,
      language: 'en',
    });

  it('serializes fragment-specific fields', () => {
    const serialized = serializeKnowledgeFragment(makeFragment());
    expect(serialized.documentId).toBe('doc-1');
    expect(serialized.position).toBe(3);
    expect(serialized.language).toBe('en');
  });

  it('deserializes back with branded documentId', () => {
    const serialized = serializeKnowledgeFragment(makeFragment());
    const restored = deserializeKnowledgeFragment(serialized);
    expect(restored.documentId).toBe('doc-1');
    expect(restored.position).toBe(3);
    expect(restored.language).toBe('en');
  });

  it('handles fragment without documentId', () => {
    const fragNoDoc = Object.freeze({
      ...makeFragment(),
      documentId: undefined,
    });
    const serialized = serializeKnowledgeFragment(fragNoDoc);
    expect(serialized.documentId).toBeUndefined();
    const restored = deserializeKnowledgeFragment(serialized);
    expect(restored.documentId).toBeUndefined();
  });

  it('round-trip preserves all fragment fields', () => {
    const original = makeFragment();
    const serialized = serializeKnowledgeFragment(original);
    const restored = deserializeKnowledgeFragment(serialized);

    expect(restored.kind).toBe(KnowledgeKind.Fragment);
    expect(restored.name).toBe(original.name);
    expect(restored.position).toBe(original.position);
    expect(restored.language).toBe(original.language);
  });
});

describe('KnowledgeCollection round-trip', () => {
  const makeCollection = (): KnowledgeCollection =>
    Object.freeze({
      id: brandKnowledgeItemId('col-1'),
      kind: KnowledgeKind.Collection,
      namespaceId: brandKnowledgeNamespaceId('ns-1'),
      name: 'Test Collection',
      content: 'Collection description',
      metadata: makeMetadata(),
      state: KnowledgeState.Active,
      currentVersionId: brandKnowledgeVersionId('ver-1'),
      createdAt: TS,
      updatedAt: TS,
      memberIds: [
        brandKnowledgeItemId('item-a'),
        brandKnowledgeItemId('item-b'),
      ] as const,
      collectionType: 'curated',
    });

  it('serializes member ids as plain strings', () => {
    const serialized = serializeKnowledgeCollection(makeCollection());
    expect(serialized.memberIds).toEqual(['item-a', 'item-b']);
    expect(serialized.collectionType).toBe('curated');
  });

  it('deserializes back to branded member ids', () => {
    const serialized = serializeKnowledgeCollection(makeCollection());
    const restored = deserializeKnowledgeCollection(serialized);
    expect(restored.memberIds).toHaveLength(2);
    expect(restored.memberIds[0]).toBe('item-a');
    expect(restored.memberIds[1]).toBe('item-b');
  });

  it('round-trip preserves all collection fields', () => {
    const original = makeCollection();
    const serialized = serializeKnowledgeCollection(original);
    const restored = deserializeKnowledgeCollection(serialized);

    expect(restored.kind).toBe(KnowledgeKind.Collection);
    expect(restored.name).toBe(original.name);
    expect(restored.collectionType).toBe(original.collectionType);
  });
});

describe('KnowledgeNamespace round-trip', () => {
  const makeNamespace = (): KnowledgeNamespace =>
    Object.freeze({
      id: brandKnowledgeNamespaceId('ns-1'),
      name: 'Test Namespace',
      description: 'A test namespace',
      parentId: brandKnowledgeNamespaceId('ns-root'),
      createdAt: TS,
      updatedAt: TS,
      metadata: Object.freeze({ owner: 'test' }) as Readonly<Record<string, string>>,
    });

  it('serializes branded ids to plain strings', () => {
    const serialized = serializeKnowledgeNamespace(makeNamespace());
    expect(typeof serialized.id).toBe('string');
    expect(typeof serialized.parentId).toBe('string');
    expect(serialized.id).toBe('ns-1');
    expect(serialized.parentId).toBe('ns-root');
  });

  it('deserializes back to branded ids', () => {
    const serialized = serializeKnowledgeNamespace(makeNamespace());
    const restored = deserializeKnowledgeNamespace(serialized);
    expect(restored.id).toBe('ns-1');
    expect(restored.parentId).toBe('ns-root');
  });

  it('round-trip preserves all namespace fields', () => {
    const original = makeNamespace();
    const serialized = serializeKnowledgeNamespace(original);
    const restored = deserializeKnowledgeNamespace(serialized);

    expect(restored.name).toBe(original.name);
    expect(restored.description).toBe(original.description);
    expect(restored.createdAt).toBe(original.createdAt);
    expect(restored.updatedAt).toBe(original.updatedAt);
  });

  it('handles namespace without parentId', () => {
    const noParent = Object.freeze({ ...makeNamespace(), parentId: undefined });
    const serialized = serializeKnowledgeNamespace(noParent);
    expect(serialized.parentId).toBeUndefined();
    const restored = deserializeKnowledgeNamespace(serialized);
    expect(restored.parentId).toBeUndefined();
  });
});

describe('KnowledgeVersion round-trip', () => {
  const makeVersion = (): KnowledgeVersion =>
    Object.freeze({
      id: brandKnowledgeVersionId('ver-1'),
      itemId: brandKnowledgeItemId('item-1'),
      revision: 3,
      content: 'Version content rev 3',
      metadata: makeMetadata(),
      state: KnowledgeState.Active,
      parentId: brandKnowledgeVersionId('ver-2'),
      changelog: 'Added new section',
      createdAt: TS,
    });

  it('serializes branded ids to plain strings', () => {
    const serialized = serializeKnowledgeVersion(makeVersion());
    expect(typeof serialized.id).toBe('string');
    expect(typeof serialized.itemId).toBe('string');
    expect(typeof serialized.parentId).toBe('string');
    expect(serialized.id).toBe('ver-1');
  });

  it('deserializes back to branded ids', () => {
    const serialized = serializeKnowledgeVersion(makeVersion());
    const restored = deserializeKnowledgeVersion(serialized);
    expect(restored.id).toBe('ver-1');
    expect(restored.itemId).toBe('item-1');
    expect(restored.parentId).toBe('ver-2');
  });

  it('round-trip preserves all version fields', () => {
    const original = makeVersion();
    const serialized = serializeKnowledgeVersion(original);
    const restored = deserializeKnowledgeVersion(serialized);

    expect(restored.revision).toBe(original.revision);
    expect(restored.content).toBe(original.content);
    expect(restored.state).toBe(original.state);
    expect(restored.changelog).toBe(original.changelog);
    expect(restored.createdAt).toBe(original.createdAt);
  });

  it('handles version without parentId', () => {
    const noParent = Object.freeze({ ...makeVersion(), parentId: undefined });
    const serialized = serializeKnowledgeVersion(noParent);
    expect(serialized.parentId).toBeUndefined();
    const restored = deserializeKnowledgeVersion(serialized);
    expect(restored.parentId).toBeUndefined();
  });
});

describe('KnowledgeRelation round-trip', () => {
  const makeRelation = (): KnowledgeRelation =>
    Object.freeze({
      id: brandKnowledgeRelationId('rel-1'),
      type: KnowledgeRelationType.Dependency,
      sourceId: brandKnowledgeItemId('item-1'),
      targetId: brandKnowledgeItemId('item-2'),
      metadata: Object.freeze({ strength: 'strong' }) as Readonly<Record<string, string>>,
      createdAt: TS,
    });

  it('serializes branded ids to plain strings', () => {
    const serialized = serializeKnowledgeRelation(makeRelation());
    expect(typeof serialized.id).toBe('string');
    expect(typeof serialized.sourceId).toBe('string');
    expect(typeof serialized.targetId).toBe('string');
  });

  it('deserializes back to branded ids', () => {
    const serialized = serializeKnowledgeRelation(makeRelation());
    const restored = deserializeKnowledgeRelation(serialized);
    expect(restored.id).toBe('rel-1');
    expect(restored.sourceId).toBe('item-1');
    expect(restored.targetId).toBe('item-2');
  });

  it('round-trip preserves all relation fields', () => {
    const original = makeRelation();
    const serialized = serializeKnowledgeRelation(original);
    const restored = deserializeKnowledgeRelation(serialized);

    expect(restored.type).toBe(original.type);
    expect(restored.metadata).toEqual(original.metadata);
    expect(restored.createdAt).toBe(original.createdAt);
  });
});

describe('KnowledgeIndexEntry round-trip', () => {
  const makeEntry = (): KnowledgeIndexEntry =>
    Object.freeze({
      id: brandKnowledgeIndexEntryId('idx-1'),
      indexType: KnowledgeIndexType.Tag,
      key: 'important',
      itemId: brandKnowledgeItemId('item-1'),
      weight: 0.85,
      createdAt: TS,
      updatedAt: TS,
    });

  it('serializes branded ids to plain strings', () => {
    const serialized = serializeKnowledgeIndexEntry(makeEntry());
    expect(typeof serialized.id).toBe('string');
    expect(typeof serialized.itemId).toBe('string');
    expect(serialized.id).toBe('idx-1');
  });

  it('deserializes back to branded ids', () => {
    const serialized = serializeKnowledgeIndexEntry(makeEntry());
    const restored = deserializeKnowledgeIndexEntry(serialized);
    expect(restored.id).toBe('idx-1');
    expect(restored.itemId).toBe('item-1');
  });

  it('round-trip preserves all index entry fields', () => {
    const original = makeEntry();
    const serialized = serializeKnowledgeIndexEntry(original);
    const restored = deserializeKnowledgeIndexEntry(serialized);

    expect(restored.indexType).toBe(original.indexType);
    expect(restored.key).toBe(original.key);
    expect(restored.weight).toBe(original.weight);
    expect(restored.createdAt).toBe(original.createdAt);
    expect(restored.updatedAt).toBe(original.updatedAt);
  });
});

// ─── Frozen Object Immutability ──────────────────────────────────────

describe('Deserialized objects are frozen (immutable)', () => {
  it('deserializeKnowledgeItem returns a frozen object', () => {
    const item = deserializeKnowledgeItem({
      id: 'i',
      kind: KnowledgeKind.Item,
      namespaceId: 'ns',
      name: 'n',
      content: 'c',
      metadata: makeMetadata(),
      state: KnowledgeState.Active,
      currentVersionId: 'v',
      createdAt: TS,
      updatedAt: TS,
    });
    expect(Object.isFrozen(item)).toBe(true);
  });

  it('deserializeKnowledgeDocument returns a frozen object', () => {
    const doc = deserializeKnowledgeDocument({
      id: 'i',
      kind: KnowledgeKind.Document,
      namespaceId: 'ns',
      name: 'n',
      content: 'c',
      metadata: makeMetadata(),
      state: KnowledgeState.Active,
      currentVersionId: 'v',
      createdAt: TS,
      updatedAt: TS,
      fragmentIds: ['f1'],
      documentType: 'md',
    });
    expect(Object.isFrozen(doc)).toBe(true);
  });

  it('deserializeKnowledgeFragment returns a frozen object', () => {
    const frag = deserializeKnowledgeFragment({
      id: 'i',
      kind: KnowledgeKind.Fragment,
      namespaceId: 'ns',
      name: 'n',
      content: 'c',
      metadata: makeMetadata(),
      state: KnowledgeState.Active,
      currentVersionId: 'v',
      createdAt: TS,
      updatedAt: TS,
      position: 1,
    });
    expect(Object.isFrozen(frag)).toBe(true);
  });

  it('deserializeKnowledgeCollection returns a frozen object', () => {
    const col = deserializeKnowledgeCollection({
      id: 'i',
      kind: KnowledgeKind.Collection,
      namespaceId: 'ns',
      name: 'n',
      content: 'c',
      metadata: makeMetadata(),
      state: KnowledgeState.Active,
      currentVersionId: 'v',
      createdAt: TS,
      updatedAt: TS,
      memberIds: ['m1'],
      collectionType: 'curated',
    });
    expect(Object.isFrozen(col)).toBe(true);
  });

  it('deserializeKnowledgeNamespace returns a frozen object', () => {
    const ns = deserializeKnowledgeNamespace({
      id: 'ns-1',
      name: 'Test',
      createdAt: TS,
      updatedAt: TS,
      metadata: Object.freeze({}),
    });
    expect(Object.isFrozen(ns)).toBe(true);
  });

  it('deserializeKnowledgeVersion returns a frozen object', () => {
    const ver = deserializeKnowledgeVersion({
      id: 'v-1',
      itemId: 'i-1',
      revision: 1,
      content: 'c',
      metadata: makeMetadata(),
      state: KnowledgeState.Active,
      createdAt: TS,
    });
    expect(Object.isFrozen(ver)).toBe(true);
  });

  it('deserializeKnowledgeRelation returns a frozen object', () => {
    const rel = deserializeKnowledgeRelation({
      id: 'r-1',
      type: KnowledgeRelationType.Related,
      sourceId: 's-1',
      targetId: 't-1',
      metadata: Object.freeze({}),
      createdAt: TS,
    });
    expect(Object.isFrozen(rel)).toBe(true);
  });

  it('deserializeKnowledgeIndexEntry returns a frozen object', () => {
    const entry = deserializeKnowledgeIndexEntry({
      id: 'e-1',
      indexType: KnowledgeIndexType.Key,
      key: 'k',
      itemId: 'i-1',
      weight: 1.0,
      createdAt: TS,
      updatedAt: TS,
    });
    expect(Object.isFrozen(entry)).toBe(true);
  });

  it('mutating a deserialized item throws in strict mode', () => {
    const item = deserializeKnowledgeItem({
      id: 'i',
      kind: KnowledgeKind.Item,
      namespaceId: 'ns',
      name: 'n',
      content: 'c',
      metadata: makeMetadata(),
      state: KnowledgeState.Active,
      currentVersionId: 'v',
      createdAt: TS,
      updatedAt: TS,
    });
    expect(() => {
      (item as Record<string, unknown>).name = 'mutated';
    }).toThrow();
  });

  it('mutating a deserialized namespace throws in strict mode', () => {
    const ns = deserializeKnowledgeNamespace({
      id: 'ns-1',
      name: 'Test',
      createdAt: TS,
      updatedAt: TS,
      metadata: Object.freeze({}),
    });
    expect(() => {
      (ns as Record<string, unknown>).name = 'mutated';
    }).toThrow();
  });
});

// ─── Serializable Counterparts Strip Branding ───────────────────────

describe('Serializable counterparts strip branding', () => {
  it('SerializableKnowledgeItem uses plain string id', () => {
    const obj: SerializableKnowledgeItem = {
      id: 'plain-string-id',
      kind: KnowledgeKind.Item,
      namespaceId: 'plain-ns',
      name: 'Test',
      content: 'c',
      metadata: makeMetadata(),
      state: KnowledgeState.Active,
      currentVersionId: 'plain-ver',
      createdAt: TS,
      updatedAt: TS,
    };
    expect(typeof obj.id).toBe('string');
    expect(obj.id).toBe('plain-string-id');
    expect(obj.id).not.toHaveProperty('__brand');
  });

  it('SerializableKnowledgeNamespace uses plain string id', () => {
    const obj: SerializableKnowledgeNamespace = {
      id: 'plain-ns-id',
      name: 'Test',
      createdAt: TS,
      updatedAt: TS,
      metadata: Object.freeze({}),
    };
    expect(typeof obj.id).toBe('string');
    expect(obj.id).toBe('plain-ns-id');
  });

  it('SerializableKnowledgeVersion uses plain string id', () => {
    const obj: SerializableKnowledgeVersion = {
      id: 'plain-ver-id',
      itemId: 'plain-item-id',
      revision: 1,
      content: 'c',
      metadata: makeMetadata(),
      state: KnowledgeState.Active,
      createdAt: TS,
    };
    expect(typeof obj.id).toBe('string');
    expect(typeof obj.itemId).toBe('string');
  });

  it('SerializableKnowledgeRelation uses plain string id', () => {
    const obj: SerializableKnowledgeRelation = {
      id: 'plain-rel-id',
      type: KnowledgeRelationType.Reference,
      sourceId: 'plain-src',
      targetId: 'plain-tgt',
      metadata: Object.freeze({}),
      createdAt: TS,
    };
    expect(typeof obj.id).toBe('string');
    expect(typeof obj.sourceId).toBe('string');
    expect(typeof obj.targetId).toBe('string');
  });

  it('SerializableKnowledgeIndexEntry uses plain string id', () => {
    const obj: SerializableKnowledgeIndexEntry = {
      id: 'plain-idx-id',
      indexType: KnowledgeIndexType.Tag,
      key: 'k',
      itemId: 'plain-item',
      weight: 0.5,
      createdAt: TS,
      updatedAt: TS,
    };
    expect(typeof obj.id).toBe('string');
    expect(typeof obj.itemId).toBe('string');
  });

  it('serialized item id is a plain string (no brand marker)', () => {
    const item: KnowledgeItem = Object.freeze({
      id: brandKnowledgeItemId('branded-123'),
      kind: KnowledgeKind.Item,
      namespaceId: brandKnowledgeNamespaceId('ns'),
      name: 'n',
      content: 'c',
      metadata: makeMetadata(),
      state: KnowledgeState.Active,
      currentVersionId: brandKnowledgeVersionId('v'),
      createdAt: TS,
      updatedAt: TS,
    });
    const serialized = serializeKnowledgeItem(item);
    // The serialized id should be a plain string value
    expect(serialized.id).toBe('branded-123');
    expect(serialized.id).toEqual('branded-123');
  });

  it('serialized document has plain string fragmentIds', () => {
    const doc: KnowledgeDocument = Object.freeze({
      id: brandKnowledgeItemId('d1'),
      kind: KnowledgeKind.Document,
      namespaceId: brandKnowledgeNamespaceId('ns'),
      name: 'Doc',
      content: 'c',
      metadata: makeMetadata(),
      state: KnowledgeState.Active,
      currentVersionId: brandKnowledgeVersionId('v'),
      createdAt: TS,
      updatedAt: TS,
      fragmentIds: [brandKnowledgeFragmentId('f1'), brandKnowledgeFragmentId('f2')],
      documentType: 'md',
    });
    const serialized = serializeKnowledgeDocument(doc);
    expect(serialized.fragmentIds).toEqual(['f1', 'f2']);
  });

  it('serialized relation has plain string sourceId and targetId', () => {
    const rel: KnowledgeRelation = Object.freeze({
      id: brandKnowledgeRelationId('r1'),
      type: KnowledgeRelationType.DerivedFrom,
      sourceId: brandKnowledgeItemId('src'),
      targetId: brandKnowledgeItemId('tgt'),
      metadata: Object.freeze({}),
      createdAt: TS,
    });
    const serialized = serializeKnowledgeRelation(rel);
    expect(serialized.sourceId).toBe('src');
    expect(serialized.targetId).toBe('tgt');
  });
});

// ─── Cross-Entity Round-Trip Integration ─────────────────────────────

describe('Cross-entity serialization integrity', () => {
  it('different entity types produce different serializable shapes', () => {
    const doc: KnowledgeDocument = Object.freeze({
      id: brandKnowledgeItemId('d1'),
      kind: KnowledgeKind.Document,
      namespaceId: brandKnowledgeNamespaceId('ns'),
      name: 'Doc',
      content: 'c',
      metadata: makeMetadata(),
      state: KnowledgeState.Active,
      currentVersionId: brandKnowledgeVersionId('v'),
      createdAt: TS,
      updatedAt: TS,
      fragmentIds: [brandKnowledgeFragmentId('f1')],
      documentType: 'md',
    });

    const frag: KnowledgeFragment = Object.freeze({
      id: brandKnowledgeItemId('f1'),
      kind: KnowledgeKind.Fragment,
      namespaceId: brandKnowledgeNamespaceId('ns'),
      name: 'Frag',
      content: 'c',
      metadata: makeMetadata(),
      state: KnowledgeState.Active,
      currentVersionId: brandKnowledgeVersionId('v'),
      createdAt: TS,
      updatedAt: TS,
      documentId: brandKnowledgeDocumentId('d1'),
      position: 0,
    });

    const sDoc = serializeKnowledgeDocument(doc);
    const sFrag = serializeKnowledgeFragment(frag);

    // Documents have fragmentIds and documentType
    expect(sDoc.fragmentIds).toBeDefined();
    expect(sDoc.documentType).toBeDefined();
    // Fragments have position and documentId
    expect(sFrag.position).toBeDefined();
    expect(sFrag.documentId).toBeDefined();
    // They should not bleed into each other
    expect(sDoc.position).toBeUndefined();
    expect(sFrag.fragmentIds).toBeUndefined();
  });

  it('multiple round-trips produce identical results', () => {
    const original: KnowledgeItem = Object.freeze({
      id: brandKnowledgeItemId('item-x'),
      kind: KnowledgeKind.Item,
      namespaceId: brandKnowledgeNamespaceId('ns-y'),
      name: 'Stability Test',
      content: 'Ensure round-trip stability',
      metadata: makeMetadata(),
      state: KnowledgeState.Active,
      currentVersionId: brandKnowledgeVersionId('ver-z'),
      createdAt: TS,
      updatedAt: TS,
    });

    // First round-trip
    const s1 = serializeKnowledgeItem(original);
    const r1 = deserializeKnowledgeItem(s1);
    // Second round-trip
    const s2 = serializeKnowledgeItem(r1);
    const r2 = deserializeKnowledgeItem(s2);

    expect(r2.name).toBe(r1.name);
    expect(r2.id).toBe(r1.id);
    expect(r2.content).toBe(r1.content);
    expect(s1).toEqual(s2);
  });

  it('namespace round-trip preserves metadata object', () => {
    const meta = Object.freeze({ region: 'us-east', env: 'prod' });
    const ns: KnowledgeNamespace = Object.freeze({
      id: brandKnowledgeNamespaceId('ns-meta'),
      name: 'Meta NS',
      description: 'desc',
      createdAt: TS,
      updatedAt: TS,
      metadata: meta,
    });

    const serialized = serializeKnowledgeNamespace(ns);
    const restored = deserializeKnowledgeNamespace(serialized);
    expect(restored.metadata).toEqual(meta);
  });

  it('index entry round-trip preserves weight precision', () => {
    const entry: KnowledgeIndexEntry = Object.freeze({
      id: brandKnowledgeIndexEntryId('e-prec'),
      indexType: KnowledgeIndexType.Key,
      key: 'test-key',
      itemId: brandKnowledgeItemId('i'),
      weight: 0.123456789,
      createdAt: TS,
      updatedAt: TS,
    });

    const serialized = serializeKnowledgeIndexEntry(entry);
    const restored = deserializeKnowledgeIndexEntry(serialized);
    expect(restored.weight).toBeCloseTo(0.123456789, 9);
  });

  it('relation round-trip with all relation types', () => {
    for (const relType of Object.values(KnowledgeRelationType)) {
      const rel: KnowledgeRelation = Object.freeze({
        id: brandKnowledgeRelationId('rel-test'),
        type: relType,
        sourceId: brandKnowledgeItemId('src'),
        targetId: brandKnowledgeItemId('tgt'),
        metadata: Object.freeze({}),
        createdAt: TS,
      });

      const serialized = serializeKnowledgeRelation(rel);
      const restored = deserializeKnowledgeRelation(serialized);
      expect(restored.type).toBe(relType);
    }
  });
});

// ─── Edge Cases ──────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('deserializeKnowledgeDocument with empty fragmentIds defaults to empty array', () => {
    const doc = deserializeKnowledgeDocument({
      id: 'i',
      kind: KnowledgeKind.Document,
      namespaceId: 'ns',
      name: 'n',
      content: 'c',
      metadata: makeMetadata(),
      state: KnowledgeState.Active,
      currentVersionId: 'v',
      createdAt: TS,
      updatedAt: TS,
    });
    expect(doc.fragmentIds).toEqual([]);
  });

  it('deserializeKnowledgeCollection with empty memberIds defaults to empty array', () => {
    const col = deserializeKnowledgeCollection({
      id: 'i',
      kind: KnowledgeKind.Collection,
      namespaceId: 'ns',
      name: 'n',
      content: 'c',
      metadata: makeMetadata(),
      state: KnowledgeState.Active,
      currentVersionId: 'v',
      createdAt: TS,
      updatedAt: TS,
    });
    expect(col.memberIds).toEqual([]);
  });

  it('deserializeKnowledgeFragment with missing position defaults to 0', () => {
    const frag = deserializeKnowledgeFragment({
      id: 'i',
      kind: KnowledgeKind.Fragment,
      namespaceId: 'ns',
      name: 'n',
      content: 'c',
      metadata: makeMetadata(),
      state: KnowledgeState.Active,
      currentVersionId: 'v',
      createdAt: TS,
      updatedAt: TS,
    });
    expect(frag.position).toBe(0);
  });

  it('deserializeKnowledgeDocument with missing documentType defaults to empty string', () => {
    const doc = deserializeKnowledgeDocument({
      id: 'i',
      kind: KnowledgeKind.Document,
      namespaceId: 'ns',
      name: 'n',
      content: 'c',
      metadata: makeMetadata(),
      state: KnowledgeState.Active,
      currentVersionId: 'v',
      createdAt: TS,
      updatedAt: TS,
      fragmentIds: ['f1'],
    });
    expect(doc.documentType).toBe('');
  });

  it('deserializeKnowledgeCollection with missing collectionType defaults to empty string', () => {
    const col = deserializeKnowledgeCollection({
      id: 'i',
      kind: KnowledgeKind.Collection,
      namespaceId: 'ns',
      name: 'n',
      content: 'c',
      metadata: makeMetadata(),
      state: KnowledgeState.Active,
      currentVersionId: 'v',
      createdAt: TS,
      updatedAt: TS,
      memberIds: ['m1'],
    });
    expect(col.collectionType).toBe('');
  });
});
