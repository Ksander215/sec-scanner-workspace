/**
 * Context Domain Events — Domain events for the Context Engine.
 *
 * Published via Event Bus (ADR-002).
 * All events extend DomainEventBase.
 *
 * Event lifecycle:
 *   ContextCreated → ContextUpdated → ContextSnapshotCreated → ContextRestored
 *   ContextCleared / ContextEntryEvicted / ContextSerialized / ContextDeserialized
 *
 * Conforms to:
 * - ADR-002 (Event-Driven Architecture)
 * - ARC-001.001 §5.2 (Event Classification)
 * - INV-012 (No domain event without a classification)
 */
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { Timestamp, Identifier } from '../types/common.js';
import type { ContextSource, ContextPriority } from './types.js';

// ─── ContextCreated ─────────────────────────────────────────
export interface ContextCreated extends DomainEventBase {
  readonly eventType: 'ContextCreated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly contextId: Identifier;
    readonly version: string;
    readonly entryCount: number;
    readonly sizeBytes: number;
    readonly sessionId?: string;
    readonly executionId?: string;
    readonly createdAt: Timestamp;
  };
}

// ─── ContextUpdated ──────────────────────────────────────────
export interface ContextUpdated extends DomainEventBase {
  readonly eventType: 'ContextUpdated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly contextId: Identifier;
    readonly previousVersion: string;
    readonly newVersion: string;
    readonly addedKeys: readonly string[];
    readonly removedKeys: readonly string[];
    readonly updatedKeys: readonly string[];
    readonly entryCount: number;
    readonly sizeBytes: number;
    readonly updatedAt: Timestamp;
  };
}

// ─── ContextSnapshotCreated ──────────────────────────────────
export interface ContextSnapshotCreated extends DomainEventBase {
  readonly eventType: 'ContextSnapshotCreated';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly snapshotId: Identifier;
    readonly contextId: Identifier;
    readonly trigger: 'manual' | 'state-change' | 'checkpoint' | 'auto';
    readonly version: string;
    readonly entryCount: number;
    readonly sizeBytes: number;
    readonly createdAt: Timestamp;
  };
}

// ─── ContextRestored ────────────────────────────────────────
export interface ContextRestored extends DomainEventBase {
  readonly eventType: 'ContextRestored';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly snapshotId: Identifier;
    readonly contextId: Identifier;
    readonly version: string;
    readonly entryCount: number;
    readonly restoredAt: Timestamp;
  };
}

// ─── ContextCleared ─────────────────────────────────────────
export interface ContextCleared extends DomainEventBase {
  readonly eventType: 'ContextCleared';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly contextId: Identifier;
    readonly clearedEntryCount: number;
    readonly clearedAt: Timestamp;
  };
}

// ─── ContextEntryEvicted ────────────────────────────────────
export interface ContextEntryEvicted extends DomainEventBase {
  readonly eventType: 'ContextEntryEvicted';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly contextId: Identifier;
    readonly evictedKey: string;
    readonly reason: string;
    readonly source?: ContextSource;
    readonly priority?: ContextPriority;
    readonly evictedAt: Timestamp;
  };
}

// ─── ContextSerialized ──────────────────────────────────────
export interface ContextSerialized extends DomainEventBase {
  readonly eventType: 'ContextSerialized';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly contextId: Identifier;
    readonly version: string;
    readonly sizeBytes: number;
    readonly serializedAt: Timestamp;
  };
}

// ─── ContextDeserialized ────────────────────────────────────
export interface ContextDeserialized extends DomainEventBase {
  readonly eventType: 'ContextDeserialized';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly contextId: Identifier;
    readonly version: string;
    readonly entryCount: number;
    readonly deserializedAt: Timestamp;
  };
}

// ─── Union type ──────────────────────────────────────────────
export type ContextDomainEvent =
  | ContextCreated
  | ContextUpdated
  | ContextSnapshotCreated
  | ContextRestored
  | ContextCleared
  | ContextEntryEvicted
  | ContextSerialized
  | ContextDeserialized;

/**
 * Create a context event base helper.
 * Used by ContextEngine to publish consistent events.
 */
export function createContextEventBase(
  eventType: string,
  classification: EventClassification,
  aggregateId: string,
): {
  eventId: string;
  eventType: string;
  classification: EventClassification;
  timestamp: string;
  sequence: number;
  aggregateId: string;
  aggregateType: string;
  version: string;
} {
  return {
    eventId: crypto.randomUUID(),
    eventType,
    classification,
    timestamp: new Date().toISOString(),
    sequence: 0,
    aggregateId,
    aggregateType: 'Context',
    version: '1.0.0',
  };
}
