/**
 * Knowledge Runtime — Barrel Exports
 * TASK-AIS-003E.000 — Knowledge Runtime Foundation
 */

// ─── Types (export type for interfaces) ─────────────────────────────
export type {
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
  KnowledgeReference,
  KnowledgeMetadata,
  KnowledgeSource,
  KnowledgeIndexEntry,
  KnowledgeIndexStats,
  KnowledgeFilter,
  KnowledgeSort,
  KnowledgePagination,
  KnowledgePage,
  KnowledgeQueryResult,
  KnowledgeValidationIssue,
  KnowledgeValidationResult,
  KnowledgeStorageAdapter,
  SerializableKnowledgeItem,
  SerializableKnowledgeNamespace,
  SerializableKnowledgeVersion,
  SerializableKnowledgeRelation,
  SerializableKnowledgeIndexEntry,
} from './types.js';

// ─── Enums (export for values) ──────────────────────────────────────
export {
  KnowledgeKind,
  KnowledgeState,
  KnowledgeRelationType,
  KnowledgeIndexType,
  KnowledgeSortDirection,
  KnowledgeSortField,
} from './types.js';

// ─── Branding helpers ───────────────────────────────────────────────
export {
  brandKnowledgeItemId,
  brandKnowledgeDocumentId,
  brandKnowledgeFragmentId,
  brandKnowledgeCollectionId,
  brandKnowledgeNamespaceId,
  brandKnowledgeVersionId,
  brandKnowledgeRelationId,
  brandKnowledgeIndexEntryId,
} from './types.js';

// ─── Serialization helpers ──────────────────────────────────────────
export {
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
} from './types.js';

// ─── Events (export type only — interfaces) ──────────────────────────
export type {
  KnowledgeItemCreated,
  KnowledgeItemUpdated,
  KnowledgeItemDeleted,
  KnowledgeItemRetrieved,
  KnowledgeItemStateChanged,
  KnowledgeNamespaceCreated,
  KnowledgeNamespaceDeleted,
  KnowledgeVersionCreated,
  KnowledgeVersionRolledBack,
  KnowledgeRelationCreated,
  KnowledgeRelationDeleted,
  KnowledgeIndexRebuilt,
  KnowledgeIndexEntryAdded,
  KnowledgeValidationCompleted,
  KnowledgeEvent,
} from './events.js';

// ─── Errors (export concrete classes) ────────────────────────────────
export {
  KnowledgeError,
  KnowledgeItemNotFoundError,
  KnowledgeNamespaceNotFoundError,
  KnowledgeNamespaceAlreadyExistsError,
  KnowledgeDuplicateIdError,
  KnowledgeVersionNotFoundError,
  KnowledgeRelationError,
  KnowledgeCyclicRelationError,
  KnowledgeBrokenReferenceError,
  KnowledgeIsolationViolationError,
  KnowledgeStateError,
  KnowledgeValidationError,
  KnowledgeStorageError,
  KnowledgeIndexError,
  KnowledgeCapacityError,
  KnowledgeGraphConsistencyError,
} from './errors.js';

// ─── Storage ────────────────────────────────────────────────────────
export { InMemoryKnowledgeStorageAdapter, FileKnowledgeStorageAdapter, SnapshotKnowledgeStorageAdapter } from './storage.js';

// ─── Index ─────────────────────────────────────────────────────────
export type { KnowledgeIndexConfig } from './knowledge-index.js';
export { KnowledgeIndexRuntime } from './knowledge-index.js';

// ─── Graph ──────────────────────────────────────────────────────────
export { KnowledgeGraph } from './knowledge-graph.js';

// ─── Versioning ─────────────────────────────────────────────────────
export type { KnowledgeVersioningConfig } from './versioning.js';
export { KnowledgeVersionManager } from './versioning.js';

// ─── Validation ─────────────────────────────────────────────────────
export type { KnowledgeValidationConfig } from './validation.js';
export { KnowledgeValidator, createValidationResult } from './validation.js';

// ─── Retrieval ───────────────────────────────────────────────────────
export type { KnowledgeRetrievalConfig } from './retrieval.js';
export { KnowledgeRetrievalRuntime } from './retrieval.js';

// ─── Runtime ─────────────────────────────────────────────────────────
export type { KnowledgeRuntimeConfig } from './knowledge-runtime.js';
export { KnowledgeRuntime } from './knowledge-runtime.js';
