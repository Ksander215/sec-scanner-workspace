/**
 * Knowledge Runtime — Domain Types
 * TASK-AIS-003E.000 — Knowledge Runtime Foundation
 *
 * All knowledge domain entities, enums, branded identifiers,
 * serializable counterparts, and public interfaces.
 */

import type { Timestamp, Identifier, SemVer } from '../types/common.js';

// ─── Branded Identifiers ───────────────────────────────────────────

/** Opaque type-safe identifier for a KnowledgeItem. */
export type KnowledgeItemId = Identifier & { readonly __brand: 'KnowledgeItemId' };

/** Opaque type-safe identifier for a KnowledgeDocument. */
export type KnowledgeDocumentId = Identifier & { readonly __brand: 'KnowledgeDocumentId' };

/** Opaque type-safe identifier for a KnowledgeFragment. */
export type KnowledgeFragmentId = Identifier & { readonly __brand: 'KnowledgeFragmentId' };

/** Opaque type-safe identifier for a KnowledgeCollection. */
export type KnowledgeCollectionId = Identifier & { readonly __brand: 'KnowledgeCollectionId' };

/** Opaque type-safe identifier for a KnowledgeNamespace. */
export type KnowledgeNamespaceId = Identifier & { readonly __brand: 'KnowledgeNamespaceId' };

/** Opaque type-safe identifier for a KnowledgeVersion. */
export type KnowledgeVersionId = Identifier & { readonly __brand: 'KnowledgeVersionId' };

/** Opaque type-safe identifier for a KnowledgeRelation. */
export type KnowledgeRelationId = Identifier & { readonly __brand: 'KnowledgeRelationId' };

/** Opaque type-safe identifier for a KnowledgeIndex entry. */
export type KnowledgeIndexEntryId = Identifier & { readonly __brand: 'KnowledgeIndexEntryId' };

// ─── Branding Helpers ───────────────────────────────────────────────

export function brandKnowledgeItemId(id: string): KnowledgeItemId {
  return id as KnowledgeItemId;
}

export function brandKnowledgeDocumentId(id: string): KnowledgeDocumentId {
  return id as KnowledgeDocumentId;
}

export function brandKnowledgeFragmentId(id: string): KnowledgeFragmentId {
  return id as KnowledgeFragmentId;
}

export function brandKnowledgeCollectionId(id: string): KnowledgeCollectionId {
  return id as KnowledgeCollectionId;
}

export function brandKnowledgeNamespaceId(id: string): KnowledgeNamespaceId {
  return id as KnowledgeNamespaceId;
}

export function brandKnowledgeVersionId(id: string): KnowledgeVersionId {
  return id as KnowledgeVersionId;
}

export function brandKnowledgeRelationId(id: string): KnowledgeRelationId {
  return id as KnowledgeRelationId;
}

export function brandKnowledgeIndexEntryId(id: string): KnowledgeIndexEntryId {
  return id as KnowledgeIndexEntryId;
}

// ─── Enums ───────────────────────────────────────────────────────────

/** Knowledge item kind. */
export enum KnowledgeKind {
  Item = 'Item',
  Document = 'Document',
  Fragment = 'Fragment',
  Collection = 'Collection',
}

/** Knowledge item state. */
export enum KnowledgeState {
  Draft = 'Draft',
  Active = 'Active',
  Deprecated = 'Deprecated',
  Archived = 'Archived',
}

/** Relation types between knowledge items. */
export enum KnowledgeRelationType {
  Parent = 'Parent',
  Child = 'Child',
  Dependency = 'Dependency',
  Reference = 'Reference',
  DerivedFrom = 'DerivedFrom',
  Duplicate = 'Duplicate',
  Supersedes = 'Supersedes',
  Related = 'Related',
}

/** Index type for knowledge indexing. */
export enum KnowledgeIndexType {
  Key = 'Key',
  Namespace = 'Namespace',
  Tag = 'Tag',
  Relation = 'Relation',
  Source = 'Source',
  Timestamp = 'Timestamp',
}

/** Sort direction for retrieval. */
export enum KnowledgeSortDirection {
  Ascending = 'Ascending',
  Descending = 'Descending',
}

/** Sort field for knowledge retrieval. */
export enum KnowledgeSortField {
  CreatedAt = 'CreatedAt',
  UpdatedAt = 'UpdatedAt',
  Version = 'Version',
  Relevance = 'Relevance',
  Name = 'Name',
}

// ─── Core Interfaces ────────────────────────────────────────────────

/** Metadata attached to every knowledge entity. */
export interface KnowledgeMetadata {
  readonly tags: readonly string[];
  readonly source: KnowledgeSource;
  readonly confidence: number;
  readonly expiresAt?: Timestamp;
  readonly custom: Readonly<Record<string, string>>;
}

/** Provenance tracking — where knowledge came from. */
export interface KnowledgeSource {
  readonly type: string;
  readonly identifier: string;
  readonly version?: SemVer;
  readonly timestamp: Timestamp;
  readonly description?: string;
}

/** A single knowledge item — the atomic unit of knowledge. */
export interface KnowledgeItem {
  readonly id: KnowledgeItemId;
  readonly kind: KnowledgeKind;
  readonly namespaceId: KnowledgeNamespaceId;
  readonly name: string;
  readonly content: string;
  readonly metadata: KnowledgeMetadata;
  readonly state: KnowledgeState;
  readonly currentVersionId: KnowledgeVersionId;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

/** A knowledge document — a structured collection of fragments. */
export interface KnowledgeDocument extends KnowledgeItem {
  readonly kind: KnowledgeKind.Document;
  readonly fragmentIds: readonly KnowledgeFragmentId[];
  readonly documentType: string;
}

/** A knowledge fragment — a piece of a document. */
export interface KnowledgeFragment extends KnowledgeItem {
  readonly kind: KnowledgeKind.Fragment;
  readonly documentId?: KnowledgeDocumentId;
  readonly position: number;
  readonly language?: string;
}

/** A knowledge collection — a curated set of knowledge items. */
export interface KnowledgeCollection extends KnowledgeItem {
  readonly kind: KnowledgeKind.Collection;
  readonly memberIds: readonly KnowledgeItemId[];
  readonly collectionType: string;
}

/** A namespace — isolation boundary for knowledge. */
export interface KnowledgeNamespace {
  readonly id: KnowledgeNamespaceId;
  readonly name: string;
  readonly description?: string;
  readonly parentId?: KnowledgeNamespaceId;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly metadata: Readonly<Record<string, string>>;
}

/** A version of a knowledge item — immutable revision. */
export interface KnowledgeVersion {
  readonly id: KnowledgeVersionId;
  readonly itemId: KnowledgeItemId;
  readonly revision: number;
  readonly content: string;
  readonly metadata: KnowledgeMetadata;
  readonly state: KnowledgeState;
  readonly parentId?: KnowledgeVersionId;
  readonly changelog?: string;
  readonly createdAt: Timestamp;
}

/** A relation between two knowledge items. */
export interface KnowledgeRelation {
  readonly id: KnowledgeRelationId;
  readonly type: KnowledgeRelationType;
  readonly sourceId: KnowledgeItemId;
  readonly targetId: KnowledgeItemId;
  readonly metadata: Readonly<Record<string, string>>;
  readonly createdAt: Timestamp;
}

/** A reference pointing to a knowledge item from external context. */
export interface KnowledgeReference {
  readonly itemId: KnowledgeItemId;
  readonly context: string;
  readonly createdAt: Timestamp;
}

// ─── Index & Retrieval Types ─────────────────────────────────────────

/** A single index entry. */
export interface KnowledgeIndexEntry {
  readonly id: KnowledgeIndexEntryId;
  readonly indexType: KnowledgeIndexType;
  readonly key: string;
  readonly itemId: KnowledgeItemId;
  readonly weight: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

/** Index statistics. */
export interface KnowledgeIndexStats {
  readonly indexType: KnowledgeIndexType;
  readonly entryCount: number;
  readonly lastRebuilt?: Timestamp;
}

/** Filter criteria for knowledge retrieval. */
export interface KnowledgeFilter {
  readonly namespaceId?: KnowledgeNamespaceId;
  readonly kinds?: readonly KnowledgeKind[];
  readonly states?: readonly KnowledgeState[];
  readonly tags?: readonly string[];
  readonly sourceTypes?: readonly string[];
  readonly createdAfter?: Timestamp;
  readonly createdBefore?: Timestamp;
  readonly updatedAfter?: Timestamp;
  readonly updatedBefore?: Timestamp;
  readonly minConfidence?: number;
  readonly maxConfidence?: number;
}

/** Sort specification for retrieval. */
export interface KnowledgeSort {
  readonly field: KnowledgeSortField;
  readonly direction: KnowledgeSortDirection;
}

/** Pagination parameters. */
export interface KnowledgePagination {
  readonly offset: number;
  readonly limit: number;
}

/** Paginated result set. */
export interface KnowledgePage<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
  readonly hasMore: boolean;
}

/** A knowledge query result. */
export interface KnowledgeQueryResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly pagination?: KnowledgePage<T>;
}

// ─── Validation Result ──────────────────────────────────────────────

/** A single validation issue. */
export interface KnowledgeValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly severity: 'error' | 'warning' | 'info';
  readonly itemId?: KnowledgeItemId;
  readonly details?: Readonly<Record<string, string>>;
}

/** Result of a validation run. */
export interface KnowledgeValidationResult {
  readonly valid: boolean;
  readonly issues: readonly KnowledgeValidationIssue[];
  readonly checkedAt: Timestamp;
}

// ─── Storage Adapter Interface ───────────────────────────────────────

/** Interface for pluggable knowledge storage adapters. */
export interface KnowledgeStorageAdapter {
  saveItem(item: SerializableKnowledgeItem): Promise<void>;
  loadItem(id: string): Promise<SerializableKnowledgeItem | null>;
  deleteItem(id: string): Promise<void>;
  listItems(namespaceId?: string): Promise<readonly SerializableKnowledgeItem[]>;
  saveNamespace(ns: SerializableKnowledgeNamespace): Promise<void>;
  loadNamespace(id: string): Promise<SerializableKnowledgeNamespace | null>;
  deleteNamespace(id: string): Promise<void>;
  listNamespaces(): Promise<readonly SerializableKnowledgeNamespace[]>;
  saveVersion(version: SerializableKnowledgeVersion): Promise<void>;
  loadVersions(itemId: string): Promise<readonly SerializableKnowledgeVersion[]>;
  deleteVersions(itemId: string): Promise<void>;
  saveRelation(relation: SerializableKnowledgeRelation): Promise<void>;
  loadRelations(itemId: string): Promise<readonly SerializableKnowledgeRelation[]>;
  deleteRelation(id: string): Promise<void>;
  saveIndexEntry(entry: SerializableKnowledgeIndexEntry): Promise<void>;
  loadIndexEntries(indexType: string): Promise<readonly SerializableKnowledgeIndexEntry[]>;
  deleteIndexEntries(indexType: string): Promise<void>;
}

// ─── Serializable Counterparts ───────────────────────────────────────

/** Serializable form of KnowledgeItem (strips branding). */
export interface SerializableKnowledgeItem {
  readonly id: string;
  readonly kind: KnowledgeKind;
  readonly namespaceId: string;
  readonly name: string;
  readonly content: string;
  readonly metadata: KnowledgeMetadata;
  readonly state: KnowledgeState;
  readonly currentVersionId: string;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly fragmentIds?: readonly string[];
  readonly documentType?: string;
  readonly documentId?: string;
  readonly position?: number;
  readonly language?: string;
  readonly memberIds?: readonly string[];
  readonly collectionType?: string;
}

/** Serializable form of KnowledgeNamespace. */
export interface SerializableKnowledgeNamespace {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly parentId?: string;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly metadata: Readonly<Record<string, string>>;
}

/** Serializable form of KnowledgeVersion. */
export interface SerializableKnowledgeVersion {
  readonly id: string;
  readonly itemId: string;
  readonly revision: number;
  readonly content: string;
  readonly metadata: KnowledgeMetadata;
  readonly state: KnowledgeState;
  readonly parentId?: string;
  readonly changelog?: string;
  readonly createdAt: Timestamp;
}

/** Serializable form of KnowledgeRelation. */
export interface SerializableKnowledgeRelation {
  readonly id: string;
  readonly type: KnowledgeRelationType;
  readonly sourceId: string;
  readonly targetId: string;
  readonly metadata: Readonly<Record<string, string>>;
  readonly createdAt: Timestamp;
}

/** Serializable form of KnowledgeIndexEntry. */
export interface SerializableKnowledgeIndexEntry {
  readonly id: string;
  readonly indexType: KnowledgeIndexType;
  readonly key: string;
  readonly itemId: string;
  readonly weight: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

// ─── Serialization Helpers ────────────────────────────────────────────

export function serializeKnowledgeItem(item: KnowledgeItem): SerializableKnowledgeItem {
  return {
    id: item.id as unknown as string,
    kind: item.kind,
    namespaceId: item.namespaceId as unknown as string,
    name: item.name,
    content: item.content,
    metadata: item.metadata,
    state: item.state,
    currentVersionId: item.currentVersionId as unknown as string,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function deserializeKnowledgeItem(s: SerializableKnowledgeItem): KnowledgeItem {
  return Object.freeze({
    id: brandKnowledgeItemId(s.id),
    kind: s.kind,
    namespaceId: brandKnowledgeNamespaceId(s.namespaceId),
    name: s.name,
    content: s.content,
    metadata: s.metadata,
    state: s.state,
    currentVersionId: brandKnowledgeVersionId(s.currentVersionId),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  });
}

export function serializeKnowledgeDocument(doc: KnowledgeDocument): SerializableKnowledgeItem {
  return {
    ...serializeKnowledgeItem(doc),
    kind: KnowledgeKind.Document,
    fragmentIds: doc.fragmentIds.map((id) => id as unknown as string),
    documentType: doc.documentType,
  };
}

export function deserializeKnowledgeDocument(s: SerializableKnowledgeItem): KnowledgeDocument {
  const base = deserializeKnowledgeItem(s);
  return Object.freeze({
    ...base,
    kind: KnowledgeKind.Document,
    fragmentIds: (s.fragmentIds ?? []).map(brandKnowledgeFragmentId),
    documentType: s.documentType ?? '',
  });
}

export function serializeKnowledgeFragment(frag: KnowledgeFragment): SerializableKnowledgeItem {
  return {
    ...serializeKnowledgeItem(frag),
    kind: KnowledgeKind.Fragment,
    documentId: frag.documentId as unknown as string | undefined,
    position: frag.position,
    language: frag.language,
  };
}

export function deserializeKnowledgeFragment(s: SerializableKnowledgeItem): KnowledgeFragment {
  const base = deserializeKnowledgeItem(s);
  return Object.freeze({
    ...base,
    kind: KnowledgeKind.Fragment,
    documentId: s.documentId ? brandKnowledgeDocumentId(s.documentId) : undefined,
    position: s.position ?? 0,
    language: s.language,
  });
}

export function serializeKnowledgeCollection(col: KnowledgeCollection): SerializableKnowledgeItem {
  return {
    ...serializeKnowledgeItem(col),
    kind: KnowledgeKind.Collection,
    memberIds: col.memberIds.map((id) => id as unknown as string),
    collectionType: col.collectionType,
  };
}

export function deserializeKnowledgeCollection(s: SerializableKnowledgeItem): KnowledgeCollection {
  const base = deserializeKnowledgeItem(s);
  return Object.freeze({
    ...base,
    kind: KnowledgeKind.Collection,
    memberIds: (s.memberIds ?? []).map(brandKnowledgeItemId),
    collectionType: s.collectionType ?? '',
  });
}

export function serializeKnowledgeNamespace(ns: KnowledgeNamespace): SerializableKnowledgeNamespace {
  return {
    id: ns.id as unknown as string,
    name: ns.name,
    description: ns.description,
    parentId: ns.parentId as unknown as string | undefined,
    createdAt: ns.createdAt,
    updatedAt: ns.updatedAt,
    metadata: ns.metadata,
  };
}

export function deserializeKnowledgeNamespace(s: SerializableKnowledgeNamespace): KnowledgeNamespace {
  return Object.freeze({
    id: brandKnowledgeNamespaceId(s.id),
    name: s.name,
    description: s.description,
    parentId: s.parentId ? brandKnowledgeNamespaceId(s.parentId) : undefined,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    metadata: s.metadata,
  });
}

export function serializeKnowledgeVersion(v: KnowledgeVersion): SerializableKnowledgeVersion {
  return {
    id: v.id as unknown as string,
    itemId: v.itemId as unknown as string,
    revision: v.revision,
    content: v.content,
    metadata: v.metadata,
    state: v.state,
    parentId: v.parentId as unknown as string | undefined,
    changelog: v.changelog,
    createdAt: v.createdAt,
  };
}

export function deserializeKnowledgeVersion(s: SerializableKnowledgeVersion): KnowledgeVersion {
  return Object.freeze({
    id: brandKnowledgeVersionId(s.id),
    itemId: brandKnowledgeItemId(s.itemId),
    revision: s.revision,
    content: s.content,
    metadata: s.metadata,
    state: s.state,
    parentId: s.parentId ? brandKnowledgeVersionId(s.parentId) : undefined,
    changelog: s.changelog,
    createdAt: s.createdAt,
  });
}

export function serializeKnowledgeRelation(r: KnowledgeRelation): SerializableKnowledgeRelation {
  return {
    id: r.id as unknown as string,
    type: r.type,
    sourceId: r.sourceId as unknown as string,
    targetId: r.targetId as unknown as string,
    metadata: r.metadata,
    createdAt: r.createdAt,
  };
}

export function deserializeKnowledgeRelation(s: SerializableKnowledgeRelation): KnowledgeRelation {
  return Object.freeze({
    id: brandKnowledgeRelationId(s.id),
    type: s.type,
    sourceId: brandKnowledgeItemId(s.sourceId),
    targetId: brandKnowledgeItemId(s.targetId),
    metadata: s.metadata,
    createdAt: s.createdAt,
  });
}

export function serializeKnowledgeIndexEntry(e: KnowledgeIndexEntry): SerializableKnowledgeIndexEntry {
  return {
    id: e.id as unknown as string,
    indexType: e.indexType,
    key: e.key,
    itemId: e.itemId as unknown as string,
    weight: e.weight,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

export function deserializeKnowledgeIndexEntry(s: SerializableKnowledgeIndexEntry): KnowledgeIndexEntry {
  return Object.freeze({
    id: brandKnowledgeIndexEntryId(s.id),
    indexType: s.indexType,
    key: s.key,
    itemId: brandKnowledgeItemId(s.itemId),
    weight: s.weight,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  });
}
