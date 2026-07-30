/**
 * Memory Module — Domain Events
 *
 * Events published by the memory runtime following ADR-002 (Event Bus).
 * All events extend DomainEventBase and carry typed payloads.
 * INV-012: No domain event without a classification.
 */
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { Identifier } from '../types/common.js';
import type { MemoryLayer } from './types.js';

// ─── MemoryEntryStored ────────────────────────────────────────
// Classification: Action — a new entry was persisted
export interface MemoryEntryStored extends DomainEventBase {
  readonly eventType: 'MemoryEntryStored';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly entryId: Identifier;
    readonly key: string;
    readonly layer: MemoryLayer;
    readonly sessionId?: string;
    readonly executionId?: string;
  };
}

// ─── MemoryEntryRetrieved ──────────────────────────────────
// Classification: Result — an entry was read
export interface MemoryEntryRetrieved extends DomainEventBase {
  readonly eventType: 'MemoryEntryRetrieved';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly entryId: Identifier;
    readonly key: string;
    readonly layer: MemoryLayer;
    readonly accessCount: number;
  };
}

// ─── MemoryEntryUpdated ──────────────────────────────────
// Classification: StateChange — an existing entry was modified
export interface MemoryEntryUpdated extends DomainEventBase {
  readonly eventType: 'MemoryEntryUpdated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly entryId: Identifier;
    readonly key: string;
    readonly layer: MemoryLayer;
  };
}

// ─── MemoryEntryDeleted ──────────────────────────────────
// Classification: Info — an entry was removed
export interface MemoryEntryDeleted extends DomainEventBase {
  readonly eventType: 'MemoryEntryDeleted';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly entryId: Identifier;
    readonly key: string;
    readonly layer: MemoryLayer;
  };
}

// ─── MemoryLayerCleared ──────────────────────────────────
// Classification: StateChange — an entire layer was purged
export interface MemoryLayerCleared extends DomainEventBase {
  readonly eventType: 'MemoryLayerCleared';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly layer: MemoryLayer;
    readonly sessionId?: string;
    readonly entryCount: number;
  };
}

// ─── MemoryExpired ────────────────────────────────────────
// Classification: Info — expired entries were purged
export interface MemoryExpired extends DomainEventBase {
  readonly eventType: 'MemoryExpired';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly expiredCount: number;
    readonly layer: MemoryLayer;
  };
}

// ─── MemoryIsolationViolation ──────────────────────────────
// Classification: Error — a session tried to access another session's memory
export interface MemoryIsolationViolation extends DomainEventBase {
  readonly eventType: 'MemoryIsolationViolation';
  readonly classification: EventClassification.Error;
  readonly payload: {
    readonly sessionId: string;
    readonly accessorSessionId: string;
    readonly layer: MemoryLayer;
  };
}

// ─── Union type ───────────────────────────────────────────────
export type MemoryEvent =
  | MemoryEntryStored
  | MemoryEntryRetrieved
  | MemoryEntryUpdated
  | MemoryEntryDeleted
  | MemoryLayerCleared
  | MemoryExpired
  | MemoryIsolationViolation;
