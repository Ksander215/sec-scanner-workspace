/**
 * Knowledge Runtime — Domain Events
 * TASK-AIS-003E.000 — Knowledge Runtime Foundation
 *
 * All domain events published by the Knowledge Runtime through the Event Bus.
 * Follows ADR-002 patterns: typed events with literal eventType, classification, payload.
 */

import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { KnowledgeItemId, KnowledgeNamespaceId, KnowledgeVersionId, KnowledgeRelationId } from './types.js';
import { EventClassification } from '../types/common.js';

// ─── Item Events ────────────────────────────────────────────────────

export interface KnowledgeItemCreated extends DomainEventBase {
  readonly eventType: 'KnowledgeItemCreated';
  readonly classification: typeof EventClassification.Action;
  readonly payload: {
    readonly itemId: KnowledgeItemId;
    readonly namespaceId: KnowledgeNamespaceId;
    readonly kind: string;
    readonly name: string;
  };
}

export interface KnowledgeItemUpdated extends DomainEventBase {
  readonly eventType: 'KnowledgeItemUpdated';
  readonly classification: typeof EventClassification.Action;
  readonly payload: {
    readonly itemId: KnowledgeItemId;
    readonly namespaceId: KnowledgeNamespaceId;
    readonly fieldCount: number;
  };
}

export interface KnowledgeItemDeleted extends DomainEventBase {
  readonly eventType: 'KnowledgeItemDeleted';
  readonly classification: typeof EventClassification.Action;
  readonly payload: {
    readonly itemId: KnowledgeItemId;
    readonly namespaceId: KnowledgeNamespaceId;
  };
}

export interface KnowledgeItemRetrieved extends DomainEventBase {
  readonly eventType: 'KnowledgeItemRetrieved';
  readonly classification: typeof EventClassification.Info;
  readonly payload: {
    readonly itemId: KnowledgeItemId;
    readonly namespaceId: KnowledgeNamespaceId;
  };
}

export interface KnowledgeItemStateChanged extends DomainEventBase {
  readonly eventType: 'KnowledgeItemStateChanged';
  readonly classification: typeof EventClassification.StateChange;
  readonly payload: {
    readonly itemId: KnowledgeItemId;
    readonly fromState: string;
    readonly toState: string;
  };
}

// ─── Namespace Events ─────────────────────────────────────────────────

export interface KnowledgeNamespaceCreated extends DomainEventBase {
  readonly eventType: 'KnowledgeNamespaceCreated';
  readonly classification: typeof EventClassification.Action;
  readonly payload: {
    readonly namespaceId: KnowledgeNamespaceId;
    readonly name: string;
  };
}

export interface KnowledgeNamespaceDeleted extends DomainEventBase {
  readonly eventType: 'KnowledgeNamespaceDeleted';
  readonly classification: typeof EventClassification.Action;
  readonly payload: {
    readonly namespaceId: KnowledgeNamespaceId;
    readonly name: string;
  };
}

// ─── Version Events ──────────────────────────────────────────────────

export interface KnowledgeVersionCreated extends DomainEventBase {
  readonly eventType: 'KnowledgeVersionCreated';
  readonly classification: typeof EventClassification.Action;
  readonly payload: {
    readonly versionId: KnowledgeVersionId;
    readonly itemId: KnowledgeItemId;
    readonly revision: number;
  };
}

export interface KnowledgeVersionRolledBack extends DomainEventBase {
  readonly eventType: 'KnowledgeVersionRolledBack';
  readonly classification: typeof EventClassification.Action;
  readonly payload: {
    readonly itemId: KnowledgeItemId;
    readonly fromRevision: number;
    readonly toRevision: number;
  };
}

// ─── Relation Events ─────────────────────────────────────────────────

export interface KnowledgeRelationCreated extends DomainEventBase {
  readonly eventType: 'KnowledgeRelationCreated';
  readonly classification: typeof EventClassification.Action;
  readonly payload: {
    readonly relationId: KnowledgeRelationId;
    readonly sourceId: KnowledgeItemId;
    readonly targetId: KnowledgeItemId;
    readonly relationType: string;
  };
}

export interface KnowledgeRelationDeleted extends DomainEventBase {
  readonly eventType: 'KnowledgeRelationDeleted';
  readonly classification: typeof EventClassification.Action;
  readonly payload: {
    readonly relationId: KnowledgeRelationId;
    readonly sourceId: KnowledgeItemId;
    readonly targetId: KnowledgeItemId;
  };
}

// ─── Index Events ─────────────────────────────────────────────────────

export interface KnowledgeIndexRebuilt extends DomainEventBase {
  readonly eventType: 'KnowledgeIndexRebuilt';
  readonly classification: typeof EventClassification.StateChange;
  readonly payload: {
    readonly indexType: string;
    readonly entryCount: number;
    readonly durationMs: number;
  };
}

export interface KnowledgeIndexEntryAdded extends DomainEventBase {
  readonly eventType: 'KnowledgeIndexEntryAdded';
  readonly classification: typeof EventClassification.Info;
  readonly payload: {
    readonly indexType: string;
    readonly key: string;
    readonly itemId: KnowledgeItemId;
  };
}

// ─── Validation Events ──────────────────────────────────────────────

export interface KnowledgeValidationCompleted extends DomainEventBase {
  readonly eventType: 'KnowledgeValidationCompleted';
  readonly classification: typeof EventClassification.Result;
  readonly payload: {
    readonly valid: boolean;
    readonly issueCount: number;
    readonly errorCount: number;
  };
}

// ─── Union Type ───────────────────────────────────────────────────────

export type KnowledgeEvent =
  | KnowledgeItemCreated
  | KnowledgeItemUpdated
  | KnowledgeItemDeleted
  | KnowledgeItemRetrieved
  | KnowledgeItemStateChanged
  | KnowledgeNamespaceCreated
  | KnowledgeNamespaceDeleted
  | KnowledgeVersionCreated
  | KnowledgeVersionRolledBack
  | KnowledgeRelationCreated
  | KnowledgeRelationDeleted
  | KnowledgeIndexRebuilt
  | KnowledgeIndexEntryAdded
  | KnowledgeValidationCompleted;
