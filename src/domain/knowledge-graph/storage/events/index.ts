/**
 * Knowledge Graph Storage Adapter — Events
 *
 * Storage lifecycle events for observability:
 * - StorageConnected: adapter connected to backend
 * - StorageDisconnected: adapter disconnected from backend
 * - StorageSnapshotCreated: snapshot saved
 * - StorageRecovered: snapshot restored
 * - StorageCompacted: storage compaction performed
 */

import type { Timestamp, Metadata, SnapshotId } from '../../types/index.ts';

// ─── Base Storage Event ───────────────────────────────────────

export interface StorageEvent {
  readonly id: string;
  readonly type: string;
  readonly timestamp: Timestamp;
  readonly adapterId: string;
  readonly adapterType: string;
  readonly metadata?: Metadata;
}

// ─── StorageConnected ─────────────────────────────────────────

export interface StorageConnectedEvent extends StorageEvent {
  readonly type: 'storage.connected';
  readonly data: {
    readonly adapterId: string;
    readonly adapterType: string;
  };
}

export function createStorageConnectedEvent(
  adapterId: string,
  adapterType: string,
  options: { metadata?: Metadata } = {},
): StorageConnectedEvent {
  return Object.freeze({
    id: `sevt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'storage.connected',
    timestamp: new Date().toISOString() as Timestamp,
    adapterId,
    adapterType,
    metadata: options.metadata,
    data: Object.freeze({ adapterId, adapterType }),
  });
}

// ─── StorageDisconnected ──────────────────────────────────────

export interface StorageDisconnectedEvent extends StorageEvent {
  readonly type: 'storage.disconnected';
  readonly data: {
    readonly adapterId: string;
    readonly adapterType: string;
    readonly graceful: boolean;
  };
}

export function createStorageDisconnectedEvent(
  adapterId: string,
  adapterType: string,
  graceful: boolean,
  options: { metadata?: Metadata } = {},
): StorageDisconnectedEvent {
  return Object.freeze({
    id: `sevt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'storage.disconnected',
    timestamp: new Date().toISOString() as Timestamp,
    adapterId,
    adapterType,
    metadata: options.metadata,
    data: Object.freeze({ adapterId, adapterType, graceful }),
  });
}

// ─── StorageSnapshotCreated ───────────────────────────────────

export interface StorageSnapshotCreatedEvent extends StorageEvent {
  readonly type: 'storage.snapshot.created';
  readonly data: {
    readonly snapshotId: SnapshotId;
    readonly nodeCount: number;
    readonly edgeCount: number;
  };
}

export function createStorageSnapshotCreatedEvent(
  adapterId: string,
  adapterType: string,
  snapshotId: SnapshotId,
  nodeCount: number,
  edgeCount: number,
  options: { metadata?: Metadata } = {},
): StorageSnapshotCreatedEvent {
  return Object.freeze({
    id: `sevt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'storage.snapshot.created',
    timestamp: new Date().toISOString() as Timestamp,
    adapterId,
    adapterType,
    metadata: options.metadata,
    data: Object.freeze({ snapshotId, nodeCount, edgeCount }),
  });
}

// ─── StorageRecovered ─────────────────────────────────────────

export interface StorageRecoveredEvent extends StorageEvent {
  readonly type: 'storage.recovered';
  readonly data: {
    readonly snapshotId: SnapshotId;
    readonly nodeCount: number;
    readonly edgeCount: number;
  };
}

export function createStorageRecoveredEvent(
  adapterId: string,
  adapterType: string,
  snapshotId: SnapshotId,
  nodeCount: number,
  edgeCount: number,
  options: { metadata?: Metadata } = {},
): StorageRecoveredEvent {
  return Object.freeze({
    id: `sevt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'storage.recovered',
    timestamp: new Date().toISOString() as Timestamp,
    adapterId,
    adapterType,
    metadata: options.metadata,
    data: Object.freeze({ snapshotId, nodeCount, edgeCount }),
  });
}

// ─── StorageCompacted ─────────────────────────────────────────

export interface StorageCompactedEvent extends StorageEvent {
  readonly type: 'storage.compacted';
  readonly data: {
    readonly nodesBefore: number;
    readonly nodesAfter: number;
    readonly edgesBefore: number;
    readonly edgesAfter: number;
    readonly freedBytes: number;
  };
}

export function createStorageCompactedEvent(
  adapterId: string,
  adapterType: string,
  nodesBefore: number,
  nodesAfter: number,
  edgesBefore: number,
  edgesAfter: number,
  freedBytes: number,
  options: { metadata?: Metadata } = {},
): StorageCompactedEvent {
  return Object.freeze({
    id: `sevt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'storage.compacted',
    timestamp: new Date().toISOString() as Timestamp,
    adapterId,
    adapterType,
    metadata: options.metadata,
    data: Object.freeze({ nodesBefore, nodesAfter, edgesBefore, edgesAfter, freedBytes }),
  });
}

// ─── Event Union ──────────────────────────────────────────────

export type AnyStorageEvent =
  | StorageConnectedEvent
  | StorageDisconnectedEvent
  | StorageSnapshotCreatedEvent
  | StorageRecoveredEvent
  | StorageCompactedEvent;

// ─── Event Handler ────────────────────────────────────────────

export type StorageEventHandler = (event: AnyStorageEvent) => void;

/** Simple event bus for storage events */
export class StorageEventBus {
  private readonly _handlers: StorageEventHandler[] = [];

  /** Subscribe to storage events */
  subscribe(handler: StorageEventHandler): () => void {
    this._handlers.push(handler);
    return () => {
      const idx = this._handlers.indexOf(handler);
      if (idx >= 0) this._handlers.splice(idx, 1);
    };
  }

  /** Emit a storage event to all subscribers */
  emit(event: AnyStorageEvent): void {
    for (const handler of this._handlers) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors
      }
    }
  }

  /** Remove all handlers */
  clear(): void {
    this._handlers.length = 0;
  }

  /** Number of active handlers */
  get handlerCount(): number {
    return this._handlers.length;
  }
}
