/**
 * Knowledge Runtime — Main Orchestrator
 * TASK-AIS-003E.000 — Knowledge Runtime Foundation
 *
 * Integrates all knowledge subsystems: storage, indexing, retrieval,
 * graph, versioning, and validation. Publishes events via Event Bus.
 * Coordinates with Memory Runtime, Context Engine, and Execution Pipeline.
 */

import type { Timestamp } from '../types/common.js';
import type { EventBus } from '../events/event-bus.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';

import type {
  KnowledgeItem,
  KnowledgeDocument,
  KnowledgeFragment,
  KnowledgeCollection,
  KnowledgeNamespace,
  KnowledgeVersion,
  KnowledgeRelation,
  KnowledgeItemId,
  KnowledgeDocumentId,
  KnowledgeFragmentId,
  KnowledgeNamespaceId,
  KnowledgeVersionId,
  KnowledgeRelationId,
  KnowledgeMetadata,
  KnowledgeKind,
  KnowledgeState,
  KnowledgeRelationType,
  KnowledgeFilter,
  KnowledgeSort,
  KnowledgePagination,
  KnowledgeQueryResult,
  KnowledgeValidationResult,
  KnowledgeStorageAdapter,
} from './types.js';
import {
  brandKnowledgeItemId,
  brandKnowledgeNamespaceId,
  KnowledgeKind as KK,
  KnowledgeState as KS,
  KnowledgeIndexType,
  serializeKnowledgeItem,
  serializeKnowledgeDocument,
  serializeKnowledgeFragment,
  serializeKnowledgeCollection,
  serializeKnowledgeNamespace,
  serializeKnowledgeRelation,
} from './types.js';

import { KnowledgeStorageError, KnowledgeItemNotFoundError, KnowledgeNamespaceNotFoundError, KnowledgeNamespaceAlreadyExistsError, KnowledgeDuplicateIdError, KnowledgeValidationError } from './errors.js';
import { KnowledgeIndexRuntime, type KnowledgeIndexConfig } from './knowledge-index.js';
import { KnowledgeGraph } from './knowledge-graph.js';
import { KnowledgeVersionManager, type KnowledgeVersioningConfig } from './versioning.js';
import { KnowledgeValidator, type KnowledgeValidationConfig } from './validation.js';
import { KnowledgeRetrievalRuntime, type KnowledgeRetrievalConfig } from './retrieval.js';
import { InMemoryKnowledgeStorageAdapter } from './storage.js';

import type {
  KnowledgeItemCreated,
  KnowledgeItemUpdated,
  KnowledgeItemDeleted,
  KnowledgeItemStateChanged,
  KnowledgeNamespaceCreated,
  KnowledgeNamespaceDeleted,
  KnowledgeVersionRolledBack,
  KnowledgeRelationCreated,
  KnowledgeIndexRebuilt,
  KnowledgeValidationCompleted,
} from './events.js';

// ─── Configuration ───────────────────────────────────────────────────

export interface KnowledgeRuntimeConfig {
  readonly eventBus?: EventBus;
  readonly storageAdapter?: KnowledgeStorageAdapter;
  readonly indexConfig?: KnowledgeIndexConfig;
  readonly versioningConfig?: KnowledgeVersioningConfig;
  readonly validationConfig?: KnowledgeValidationConfig;
  readonly retrievalConfig?: KnowledgeRetrievalConfig;
}

// ─── Knowledge Runtime ───────────────────────────────────────────────

export class KnowledgeRuntime {
  private readonly eventBus?: EventBus;
  private readonly storage: KnowledgeStorageAdapter;
  private readonly index: KnowledgeIndexRuntime;
  private readonly graph: KnowledgeGraph;
  private readonly versioning: KnowledgeVersionManager;
  private readonly validator: KnowledgeValidator;
  private readonly retrieval: KnowledgeRetrievalRuntime;

  private readonly items = new Map<string, KnowledgeItem>();
  private readonly namespaces = new Map<string, KnowledgeNamespace>();

  private _disposed = false;

  constructor(config: KnowledgeRuntimeConfig = {}) {
    this.eventBus = config.eventBus;
    this.storage = config.storageAdapter ?? new InMemoryKnowledgeStorageAdapter();
    this.index = new KnowledgeIndexRuntime({
      ...config.indexConfig,
      storageAdapter: this.storage,
    });
    this.graph = new KnowledgeGraph();
    this.versioning = new KnowledgeVersionManager({
      ...config.versioningConfig,
      storageAdapter: this.storage,
    });
    this.validator = new KnowledgeValidator(config.validationConfig);
    this.retrieval = new KnowledgeRetrievalRuntime(config.retrievalConfig);
  }

  // ═══════════════════════════════════════════════════════════════════
  // NAMESPACE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  async createNamespace(
    name: string,
    description?: string,
    parentId?: KnowledgeNamespaceId,
    metadata?: Record<string, string>,
  ): Promise<KnowledgeNamespace> {
    this.assertNotDisposed();

    // Check for duplicate name
    for (const ns of this.namespaces.values()) {
      if (ns.name === name) {
        throw new KnowledgeNamespaceAlreadyExistsError(name);
      }
    }

    // Validate parent exists
    if (parentId !== undefined) {
      const parentKey = parentId as unknown as string;
      if (!this.namespaces.has(parentKey)) {
        throw new KnowledgeNamespaceNotFoundError(parentKey);
      }
    }

    const now = new Date().toISOString() as Timestamp;
    const namespace: KnowledgeNamespace = Object.freeze({
      id: brandKnowledgeNamespaceId(crypto.randomUUID()),
      name,
      description,
      parentId,
      createdAt: now,
      updatedAt: now,
      metadata: Object.freeze({ ...(metadata ?? {}) }),
    });

    const nsKey = namespace.id as unknown as string;
    this.namespaces.set(nsKey, namespace);

    try {
      await this.storage.saveNamespace(serializeKnowledgeNamespace(namespace));
    } catch (e) {
      this.namespaces.delete(nsKey);
      throw new KnowledgeStorageError(`Failed to persist namespace: ${(e as Error).message}`);
    }

    void this.publishEvent<KnowledgeNamespaceCreated>({
      eventType: 'KnowledgeNamespaceCreated',
      classification: EventClassification.Action,
      payload: {
        namespaceId: namespace.id,
        name: namespace.name,
      },
    });

    return namespace;
  }

  async deleteNamespace(namespaceId: KnowledgeNamespaceId): Promise<void> {
    this.assertNotDisposed();

    const nsKey = namespaceId as unknown as string;
    const namespace = this.namespaces.get(nsKey);
    if (namespace === undefined) {
      throw new KnowledgeNamespaceNotFoundError(nsKey);
    }

    // Check for items in namespace
    for (const item of this.items.values()) {
      const itemNsKey = item.namespaceId as unknown as string;
      if (itemNsKey === nsKey) {
        throw new KnowledgeValidationError(
          `Cannot delete namespace ${nsKey}: it contains knowledge items. Delete items first.`,
        );
      }
    }

    this.namespaces.delete(nsKey);

    try {
      await this.storage.deleteNamespace(nsKey);
    } catch (e) {
      throw new KnowledgeStorageError(`Failed to delete namespace: ${(e as Error).message}`);
    }

    void this.publishEvent<KnowledgeNamespaceDeleted>({
      eventType: 'KnowledgeNamespaceDeleted',
      classification: EventClassification.Action,
      payload: {
        namespaceId: namespace.id,
        name: namespace.name,
      },
    });
  }

  async getNamespace(namespaceId: KnowledgeNamespaceId): Promise<KnowledgeNamespace | null> {
    this.assertNotDisposed();
    const nsKey = namespaceId as unknown as string;
    return this.namespaces.get(nsKey) ?? null;
  }

  async listNamespaces(): Promise<readonly KnowledgeNamespace[]> {
    this.assertNotDisposed();
    return Object.freeze([...this.namespaces.values()]);
  }

  // ═══════════════════════════════════════════════════════════════════
  // ITEM CRUD
  // ═══════════════════════════════════════════════════════════════════

  async createItem(
    namespaceId: KnowledgeNamespaceId,
    name: string,
    content: string,
    kind: KnowledgeKind,
    metadata: KnowledgeMetadata,
    options?: {
      readonly fragmentIds?: readonly KnowledgeFragmentId[];
      readonly documentId?: KnowledgeDocumentId;
      readonly position?: number;
      readonly language?: string;
      readonly memberIds?: readonly KnowledgeItemId[];
      readonly documentType?: string;
      readonly collectionType?: string;
    },
  ): Promise<KnowledgeItem> {
    this.assertNotDisposed();

    // Validate namespace
    const nsKey = namespaceId as unknown as string;
    if (!this.namespaces.has(nsKey)) {
      throw new KnowledgeNamespaceNotFoundError(nsKey);
    }

    const now = new Date().toISOString() as Timestamp;
    const itemId = brandKnowledgeItemId(crypto.randomUUID());

    // Create initial version
    const initialVersion = await this.versioning.createVersion(
      itemId,
      content,
      metadata,
      KS.Active,
      'Initial version',
    );

    let item: KnowledgeItem;

    switch (kind) {
      case KK.Document:
        item = Object.freeze({
          id: itemId,
          kind: KK.Document,
          namespaceId,
          name,
          content,
          metadata,
          state: KS.Active,
          currentVersionId: initialVersion.id,
          createdAt: now,
          updatedAt: now,
          fragmentIds: Object.freeze([...(options?.fragmentIds ?? [])]),
          documentType: options?.documentType ?? '',
        } as KnowledgeDocument);
        break;

      case KK.Fragment:
        item = Object.freeze({
          id: itemId,
          kind: KK.Fragment,
          namespaceId,
          name,
          content,
          metadata,
          state: KS.Active,
          currentVersionId: initialVersion.id,
          createdAt: now,
          updatedAt: now,
          documentId: options?.documentId,
          position: options?.position ?? 0,
          language: options?.language,
        } as KnowledgeFragment);
        break;

      case KK.Collection:
        item = Object.freeze({
          id: itemId,
          kind: KK.Collection,
          namespaceId,
          name,
          content,
          metadata,
          state: KS.Active,
          currentVersionId: initialVersion.id,
          createdAt: now,
          updatedAt: now,
          memberIds: Object.freeze([...(options?.memberIds ?? [])]),
          collectionType: options?.collectionType ?? '',
        } as KnowledgeCollection);
        break;

      default:
        item = Object.freeze({
          id: itemId,
          kind: KK.Item,
          namespaceId,
          name,
          content,
          metadata,
          state: KS.Active,
          currentVersionId: initialVersion.id,
          createdAt: now,
          updatedAt: now,
        });
    }

    // Check for duplicate ID
    const itemKey = itemId as unknown as string;
    if (this.items.has(itemKey)) {
      throw new KnowledgeDuplicateIdError(itemKey);
    }

    this.items.set(itemKey, item);

    // Persist
    try {
      const serializable = kind === KK.Document
        ? serializeKnowledgeDocument(item as KnowledgeDocument)
        : kind === KK.Fragment
          ? serializeKnowledgeFragment(item as KnowledgeFragment)
          : kind === KK.Collection
            ? serializeKnowledgeCollection(item as KnowledgeCollection)
            : serializeKnowledgeItem(item);
      await this.storage.saveItem(serializable);
    } catch (e) {
      this.items.delete(itemKey);
      throw new KnowledgeStorageError(`Failed to persist item: ${(e as Error).message}`);
    }

    // Index the item
    await this.index.indexItem(item);

    void this.publishEvent<KnowledgeItemCreated>({
      eventType: 'KnowledgeItemCreated',
      classification: EventClassification.Action,
      payload: {
        itemId: item.id,
        namespaceId: item.namespaceId,
        kind: item.kind,
        name: item.name,
      },
    });

    return item;
  }

  async getItem(itemId: KnowledgeItemId): Promise<KnowledgeItem | null> {
    this.assertNotDisposed();
    const itemKey = itemId as unknown as string;
    return this.items.get(itemKey) ?? null;
  }

  async updateItem(
    itemId: KnowledgeItemId,
    updates: Partial<{
      readonly name: string;
      readonly content: string;
      readonly metadata: KnowledgeMetadata;
      readonly state: KnowledgeState;
      readonly fragmentIds: readonly KnowledgeFragmentId[];
      readonly memberIds: readonly KnowledgeItemId[];
      readonly documentType: string;
      readonly collectionType: string;
      readonly language: string;
      readonly position: number;
    }>,
  ): Promise<KnowledgeItem> {
    this.assertNotDisposed();

    const itemKey = itemId as unknown as string;
    const existing = this.items.get(itemKey);
    if (existing === undefined) {
      throw new KnowledgeItemNotFoundError(itemKey);
    }

    // If content changed, create new version
    let newVersionId = existing.currentVersionId;
    if (updates.content !== undefined && updates.content !== existing.content) {
      const newVersion = await this.versioning.createVersion(
        itemId,
        updates.content,
        updates.metadata ?? existing.metadata,
        updates.state ?? existing.state,
        'Content update',
      );
      newVersionId = newVersion.id;
    }

    // Build updated item
    const now = new Date().toISOString() as Timestamp;
    const updated: KnowledgeItem = Object.freeze({
      ...existing,
      name: updates.name ?? existing.name,
      content: updates.content ?? existing.content,
      metadata: updates.metadata ?? existing.metadata,
      state: updates.state ?? existing.state,
      currentVersionId: newVersionId,
      updatedAt: now,
    }) as KnowledgeItem;

    // Handle kind-specific updates
    let serializable;
    if (updated.kind === KK.Document && updates.fragmentIds !== undefined) {
      serializable = serializeKnowledgeDocument({
        ...updated,
        fragmentIds: Object.freeze([...updates.fragmentIds]),
        documentType: updates.documentType ?? (updated as KnowledgeDocument).documentType,
      } as KnowledgeDocument);
      this.items.set(itemKey, Object.freeze({
        ...updated,
        fragmentIds: Object.freeze([...updates.fragmentIds]),
        documentType: updates.documentType ?? (updated as KnowledgeDocument).documentType,
      }) as KnowledgeItem);
    } else if (updated.kind === KK.Collection && updates.memberIds !== undefined) {
      serializable = serializeKnowledgeCollection({
        ...updated,
        memberIds: Object.freeze([...updates.memberIds]),
        collectionType: updates.collectionType ?? (updated as KnowledgeCollection).collectionType,
      } as KnowledgeCollection);
      this.items.set(itemKey, Object.freeze({
        ...updated,
        memberIds: Object.freeze([...updates.memberIds]),
        collectionType: updates.collectionType ?? (updated as KnowledgeCollection).collectionType,
      }) as KnowledgeItem);
    } else if (updated.kind === KK.Fragment) {
      const frag = updated as KnowledgeFragment;
      serializable = serializeKnowledgeFragment(Object.freeze({
        ...frag,
        language: updates.language ?? frag.language,
        position: updates.position ?? frag.position,
      }));
      this.items.set(itemKey, Object.freeze({
        ...updated,
        language: updates.language ?? frag.language,
        position: updates.position ?? frag.position,
      }) as KnowledgeItem);
    } else {
      serializable = serializeKnowledgeItem(updated);
      this.items.set(itemKey, updated);
    }

    // Re-index
    await this.index.removeItem(itemId);
    await this.index.indexItem(this.items.get(itemKey)!);

    try {
      await this.storage.saveItem(serializable);
    } catch (e) {
      this.items.set(itemKey, existing); // Restore
      throw new KnowledgeStorageError(`Failed to persist update: ${(e as Error).message}`);
    }

    void this.publishEvent<KnowledgeItemUpdated>({
      eventType: 'KnowledgeItemUpdated',
      classification: EventClassification.Action,
      payload: {
        itemId,
        namespaceId: updated.namespaceId,
        fieldCount: Object.keys(updates).length,
      },
    });

    return this.items.get(itemKey)!;
  }

  async deleteItem(itemId: KnowledgeItemId): Promise<void> {
    this.assertNotDisposed();

    const itemKey = itemId as unknown as string;
    const item = this.items.get(itemKey);
    if (item === undefined) {
      throw new KnowledgeItemNotFoundError(itemKey);
    }

    // Remove from all subsystems
    this.items.delete(itemKey);
    await this.index.removeItem(itemId);
    await this.versioning.deleteVersions(itemId);

    // Remove relations involving this item
    const relations = await this.graph.getRelations(itemId);
    for (const rel of relations) {
      await this.graph.removeRelation(rel.id);
    }

    try {
      await this.storage.deleteItem(itemKey);
    } catch (e) {
      throw new KnowledgeStorageError(`Failed to delete item: ${(e as Error).message}`);
    }

    void this.publishEvent<KnowledgeItemDeleted>({
      eventType: 'KnowledgeItemDeleted',
      classification: EventClassification.Action,
      payload: {
        itemId,
        namespaceId: item.namespaceId,
      },
    });
  }

  async listItems(namespaceId?: KnowledgeNamespaceId): Promise<readonly KnowledgeItem[]> {
    this.assertNotDisposed();
    const allItems = [...this.items.values()];
    if (namespaceId !== undefined) {
      const nsKey = namespaceId as unknown as string;
      return Object.freeze(allItems.filter((item) => (item.namespaceId as unknown as string) === nsKey));
    }
    return Object.freeze(allItems);
  }

  // ═══════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  async setItemState(itemId: KnowledgeItemId, newState: KnowledgeState): Promise<KnowledgeItem> {
    this.assertNotDisposed();

    const itemKey = itemId as unknown as string;
    const item = this.items.get(itemKey);
    if (item === undefined) {
      throw new KnowledgeItemNotFoundError(itemKey);
    }

    const oldState = item.state;

    const updated = Object.freeze({
      ...item,
      state: newState,
      updatedAt: new Date().toISOString() as Timestamp,
    });

    this.items.set(itemKey, updated);
    await this.storage.saveItem(serializeKnowledgeItem(updated));

    void this.publishEvent<KnowledgeItemStateChanged>({
      eventType: 'KnowledgeItemStateChanged',
      classification: EventClassification.StateChange,
      payload: {
        itemId,
        fromState: oldState,
        toState: newState,
      },
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════
  // RETRIEVAL (delegates to KnowledgeRetrievalRuntime)
  // ═══════════════════════════════════════════════════════════════════

  async search(query: string): Promise<readonly KnowledgeItem[]> {
    this.assertNotDisposed();
    return this.retrieval.search([...this.items.values()], query);
  }

  async query(
    filter?: KnowledgeFilter,
    sort?: KnowledgeSort,
    pagination?: KnowledgePagination,
  ): Promise<KnowledgeQueryResult<KnowledgeItem>> {
    this.assertNotDisposed();
    return this.retrieval.query([...this.items.values()], filter, sort, pagination);
  }

  async getById(itemId: KnowledgeItemId): Promise<KnowledgeItem | null> {
    this.assertNotDisposed();
    return this.retrieval.getById([...this.items.values()], itemId);
  }

  async getByNamespace(namespaceId: KnowledgeNamespaceId): Promise<readonly KnowledgeItem[]> {
    this.assertNotDisposed();
    return this.retrieval.getByNamespace([...this.items.values()], namespaceId);
  }

  async getByTags(tags: readonly string[], matchMode?: 'all' | 'any'): Promise<readonly KnowledgeItem[]> {
    this.assertNotDisposed();
    return this.retrieval.getByTags([...this.items.values()], tags, matchMode);
  }

  async getBySource(sourceType: string): Promise<readonly KnowledgeItem[]> {
    this.assertNotDisposed();
    return this.retrieval.getBySource([...this.items.values()], sourceType);
  }

  // ═══════════════════════════════════════════════════════════════════
  // GRAPH (delegates to KnowledgeGraph)
  // ═══════════════════════════════════════════════════════════════════

  async addRelation(
    type: KnowledgeRelationType,
    sourceId: KnowledgeItemId,
    targetId: KnowledgeItemId,
    metadata?: Record<string, string>,
  ): Promise<KnowledgeRelation> {
    this.assertNotDisposed();

    // Validate both items exist
    const sourceKey = sourceId as unknown as string;
    const targetKey = targetId as unknown as string;
    if (!this.items.has(sourceKey)) {
      throw new KnowledgeItemNotFoundError(sourceKey);
    }
    if (!this.items.has(targetKey)) {
      throw new KnowledgeItemNotFoundError(targetKey);
    }

    const relation = await this.graph.addRelation(type, sourceId, targetId, metadata);

    // Persist
    try {
      await this.storage.saveRelation(serializeKnowledgeRelation(relation));
    } catch (e) {
      await this.graph.removeRelation(relation.id);
      throw new KnowledgeStorageError(`Failed to persist relation: ${(e as Error).message}`);
    }

    void this.publishEvent<KnowledgeRelationCreated>({
      eventType: 'KnowledgeRelationCreated',
      classification: EventClassification.Action,
      payload: {
        relationId: relation.id,
        sourceId,
        targetId,
        relationType: type,
      },
    });

    return relation;
  }

  async removeRelation(relationId: KnowledgeRelationId): Promise<void> {
    this.assertNotDisposed();
    await this.graph.removeRelation(relationId);
  }

  async getRelations(itemId: KnowledgeItemId, type?: KnowledgeRelationType): Promise<readonly KnowledgeRelation[]> {
    this.assertNotDisposed();
    return this.graph.getRelations(itemId, type);
  }

  async getRelatedItems(itemId: KnowledgeItemId, type?: KnowledgeRelationType): Promise<readonly KnowledgeItemId[]> {
    this.assertNotDisposed();
    return this.graph.getRelatedItems(itemId, type);
  }

  async hasPath(fromId: KnowledgeItemId, toId: KnowledgeItemId): Promise<boolean> {
    this.assertNotDisposed();
    return this.graph.hasPath(fromId, toId);
  }

  async getShortestPath(fromId: KnowledgeItemId, toId: KnowledgeItemId): Promise<readonly KnowledgeItemId[] | null> {
    this.assertNotDisposed();
    return this.graph.getShortestPath(fromId, toId);
  }

  async detectCycles(): Promise<readonly KnowledgeItemId[][]> {
    this.assertNotDisposed();
    return this.graph.detectCycles();
  }

  // ═══════════════════════════════════════════════════════════════════
  // VERSIONING (delegates to KnowledgeVersionManager)
  // ═══════════════════════════════════════════════════════════════════

  async getVersion(versionId: KnowledgeVersionId): Promise<KnowledgeVersion | null> {
    this.assertNotDisposed();
    return this.versioning.getVersion(versionId);
  }

  async getLatestVersion(itemId: KnowledgeItemId): Promise<KnowledgeVersion | null> {
    this.assertNotDisposed();
    return this.versioning.getLatestVersion(itemId);
  }

  async getVersions(itemId: KnowledgeItemId): Promise<readonly KnowledgeVersion[]> {
    this.assertNotDisposed();
    return this.versioning.getVersions(itemId);
  }

  async rollback(itemId: KnowledgeItemId, revision: number): Promise<KnowledgeVersion> {
    this.assertNotDisposed();

    const itemKey = itemId as unknown as string;
    const item = this.items.get(itemKey);
    if (item === undefined) {
      throw new KnowledgeItemNotFoundError(itemKey);
    }

    const newVersion = await this.versioning.rollback(itemId, revision);

    // Update item with rolled-back content
    const updated = Object.freeze({
      ...item,
      content: newVersion.content,
      metadata: newVersion.metadata,
      state: newVersion.state,
      currentVersionId: newVersion.id,
      updatedAt: new Date().toISOString() as Timestamp,
    });

    this.items.set(itemKey, updated);
    await this.storage.saveItem(serializeKnowledgeItem(updated));

    void this.publishEvent<KnowledgeVersionRolledBack>({
      eventType: 'KnowledgeVersionRolledBack',
      classification: EventClassification.Action,
      payload: {
        itemId,
        fromRevision: item.currentVersionId as unknown as string === newVersion.parentId
          ? (await this.versioning.getVersions(itemId))[0]?.revision ?? 0
          : 0,
        toRevision: newVersion.revision,
      },
    });

    return newVersion;
  }

  // ═══════════════════════════════════════════════════════════════════
  // INDEXING
  // ═══════════════════════════════════════════════════════════════════

  async rebuildIndex(indexType: KnowledgeIndexType): Promise<number> {
    this.assertNotDisposed();
    const items = [...this.items.values()];
    const count = await this.index.rebuildIndex(indexType, items);

    void this.publishEvent<KnowledgeIndexRebuilt>({
      eventType: 'KnowledgeIndexRebuilt',
      classification: EventClassification.StateChange,
      payload: {
        indexType,
        entryCount: count,
        durationMs: 0,
      },
    });

    return count;
  }

  async rebuildAllIndexes(): Promise<void> {
    this.assertNotDisposed();
    await this.index.rebuildAllIndexes([...this.items.values()]);
  }

  async getIndexStats(): Promise<readonly { readonly indexType: KnowledgeIndexType; readonly entryCount: number }[]> {
    this.assertNotDisposed();
    return this.index.getStats();
  }

  // ═══════════════════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════════════════

  async validate(): Promise<KnowledgeValidationResult> {
    this.assertNotDisposed();

    const allItems = [...this.items.values()];
    const allNamespaces = [...this.namespaces.values()];
    const allRelations = await this.graph.getAllRelations();
    const allVersions: KnowledgeVersion[] = [];

    for (const item of allItems) {
      const versions = await this.versioning.getVersions(item.id);
      allVersions.push(...versions);
    }

    const result = this.validator.validateAll(
      allItems,
      allNamespaces,
      allRelations,
      allVersions,
    );

    void this.publishEvent<KnowledgeValidationCompleted>({
      eventType: 'KnowledgeValidationCompleted',
      classification: EventClassification.Result,
      payload: {
        valid: result.valid,
        issueCount: result.issues.length,
        errorCount: result.issues.filter((i) => i.severity === 'error').length,
      },
    });

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════
  // NAMESPACE ISOLATION ENFORCEMENT
  // ═══════════════════════════════════════════════════════════════════

  enforceNamespaceIsolation(
    item: KnowledgeItem,
    accessorNamespaceId: KnowledgeNamespaceId,
    allowHierarchical?: boolean,
  ): boolean {
    const itemNsKey = item.namespaceId as unknown as string;
    const accessorNsKey = accessorNamespaceId as unknown as string;

    if (itemNsKey === accessorNsKey) return true;

    if (allowHierarchical) {
      // Check if accessor is a parent of item's namespace
      let current = this.namespaces.get(itemNsKey);
      while (current?.parentId !== undefined) {
        const parentKey = current.parentId as unknown as string;
        if (parentKey === accessorNsKey) return true;
        current = this.namespaces.get(parentKey);
      }
    }

    return false;
  }

  // ═══════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════

  getStats(): {
    readonly itemCount: number;
    readonly namespaceCount: number;
    readonly relationCount: number;
    readonly versionCount: number;
  } {
    return Object.freeze({
      itemCount: this.items.size,
      namespaceCount: this.namespaces.size,
      relationCount: 0, // graph doesn't expose count directly
      versionCount: this.versioning.totalVersionCount(),
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this.items.clear();
    this.namespaces.clear();
    this.index.clear();
    this.graph.clear?.();
    this.versioning.dispose();
  }

  // ═══════════════════════════════════════════════════════════════════
  // EVENT PUBLISHING (ADR-002: fire-and-forget, silent catch)
  // ═══════════════════════════════════════════════════════════════════

  private async publishEvent<T extends DomainEventBase>(
    partial: Omit<T, 'eventId' | 'timestamp' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (this.eventBus === undefined) return;
    try {
      const event = {
        ...partial,
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        sequence: 0,
        aggregateId: 'knowledge-runtime',
        aggregateType: 'Knowledge',
        version: '1.0.0',
      } as unknown as T;
      await this.eventBus.publish(event);
    } catch {
      // ADR-002: Event publishing failure must not disrupt operations
    }
  }

  private assertNotDisposed(): void {
    if (this._disposed) {
      throw new KnowledgeStorageError('KnowledgeRuntime has been disposed');
    }
  }
}
