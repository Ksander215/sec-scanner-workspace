/**
 * Knowledge Graph Domain Events
 *
 * All domain events for the Knowledge Graph follow the same pattern as scan-platform:
 * - Base interface with common fields
 * - Specific events extend base with discriminated type literal and data payload
 * - Event type strings use dot-notation namespacing
 * - All event data is readonly
 * - Union type aggregates all event types
 */

import type { NodeId, EdgeId, SnapshotId, Timestamp, Metadata } from '../types/index.ts';
import { brandNodeId, brandEdgeId, brandSnapshotId } from '../types/index.ts';

// ─── Base Event ────────────────────────────────────────────────

/**
 * Base interface for all Knowledge Graph domain events.
 * Every event carries an ID, type, timestamp, and optional metadata.
 */
export interface GraphDomainEvent {
  readonly id: string;
  readonly type: string;
  readonly timestamp: Timestamp;
  readonly correlationId?: string;
  readonly metadata?: Metadata;
}

// ─── Node Events ───────────────────────────────────────────────

export interface NodeCreatedEvent extends GraphDomainEvent {
  readonly type: 'graph.node.created';
  readonly data: {
    readonly nodeId: NodeId;
    readonly nodeType: string;
    readonly labels: readonly string[];
  };
}

export interface NodeUpdatedEvent extends GraphDomainEvent {
  readonly type: 'graph.node.updated';
  readonly data: {
    readonly nodeId: NodeId;
    readonly changes: Readonly<Record<string, { readonly old: unknown; readonly new: unknown }>>;
  };
}

export interface NodeDeletedEvent extends GraphDomainEvent {
  readonly type: 'graph.node.deleted';
  readonly data: {
    readonly nodeId: NodeId;
    readonly nodeType: string;
  };
}

// ─── Edge Events ───────────────────────────────────────────────

export interface EdgeCreatedEvent extends GraphDomainEvent {
  readonly type: 'graph.edge.created';
  readonly data: {
    readonly edgeId: EdgeId;
    readonly sourceId: NodeId;
    readonly targetId: NodeId;
    readonly edgeType: string;
  };
}

export interface EdgeDeletedEvent extends GraphDomainEvent {
  readonly type: 'graph.edge.deleted';
  readonly data: {
    readonly edgeId: EdgeId;
    readonly sourceId: NodeId;
    readonly targetId: NodeId;
    readonly edgeType: string;
  };
}

// ─── Snapshot Events ───────────────────────────────────────────

export interface SnapshotCreatedEvent extends GraphDomainEvent {
  readonly type: 'graph.snapshot.created';
  readonly data: {
    readonly snapshotId: SnapshotId;
    readonly nodeCount: number;
    readonly edgeCount: number;
  };
}

// ─── Validation Events ─────────────────────────────────────────

export interface GraphValidatedEvent extends GraphDomainEvent {
  readonly type: 'graph.validated';
  readonly data: {
    readonly valid: boolean;
    readonly errorCount: number;
    readonly warningCount: number;
  };
}

// ─── Event Union ───────────────────────────────────────────────

/** Union of all Knowledge Graph domain events */
export type AnyGraphDomainEvent =
  | NodeCreatedEvent
  | NodeUpdatedEvent
  | NodeDeletedEvent
  | EdgeCreatedEvent
  | EdgeDeletedEvent
  | SnapshotCreatedEvent
  | GraphValidatedEvent;

// ─── Event Factory Functions ───────────────────────────────────

/** Create a NodeCreatedEvent */
export function createNodeCreatedEvent(
  nodeId: string,
  nodeType: string,
  labels: readonly string[] = [],
  options: { correlationId?: string; metadata?: Metadata } = {},
): NodeCreatedEvent {
  return Object.freeze({
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'graph.node.created',
    timestamp: new Date().toISOString(),
    correlationId: options.correlationId,
    metadata: options.metadata,
    data: Object.freeze({
      nodeId: brandNodeId(nodeId),
      nodeType,
      labels: Object.freeze([...labels]),
    }),
  });
}

/** Create a NodeUpdatedEvent */
export function createNodeUpdatedEvent(
  nodeId: string,
  changes: Readonly<Record<string, { readonly old: unknown; readonly new: unknown }>>,
  options: { correlationId?: string; metadata?: Metadata } = {},
): NodeUpdatedEvent {
  return Object.freeze({
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'graph.node.updated',
    timestamp: new Date().toISOString(),
    correlationId: options.correlationId,
    metadata: options.metadata,
    data: Object.freeze({ nodeId: brandNodeId(nodeId), changes }),
  });
}

/** Create a NodeDeletedEvent */
export function createNodeDeletedEvent(
  nodeId: string,
  nodeType: string,
  options: { correlationId?: string; metadata?: Metadata } = {},
): NodeDeletedEvent {
  return Object.freeze({
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'graph.node.deleted',
    timestamp: new Date().toISOString(),
    correlationId: options.correlationId,
    metadata: options.metadata,
    data: Object.freeze({ nodeId: brandNodeId(nodeId), nodeType }),
  });
}

/** Create an EdgeCreatedEvent */
export function createEdgeCreatedEvent(
  edgeId: string,
  sourceId: string,
  targetId: string,
  edgeType: string,
  options: { correlationId?: string; metadata?: Metadata } = {},
): EdgeCreatedEvent {
  return Object.freeze({
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'graph.edge.created',
    timestamp: new Date().toISOString(),
    correlationId: options.correlationId,
    metadata: options.metadata,
    data: Object.freeze({
      edgeId: brandEdgeId(edgeId),
      sourceId: brandNodeId(sourceId),
      targetId: brandNodeId(targetId),
      edgeType,
    }),
  });
}

/** Create an EdgeDeletedEvent */
export function createEdgeDeletedEvent(
  edgeId: string,
  sourceId: string,
  targetId: string,
  edgeType: string,
  options: { correlationId?: string; metadata?: Metadata } = {},
): EdgeDeletedEvent {
  return Object.freeze({
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'graph.edge.deleted',
    timestamp: new Date().toISOString(),
    correlationId: options.correlationId,
    metadata: options.metadata,
    data: Object.freeze({
      edgeId: brandEdgeId(edgeId),
      sourceId: brandNodeId(sourceId),
      targetId: brandNodeId(targetId),
      edgeType,
    }),
  });
}

/** Create a SnapshotCreatedEvent */
export function createSnapshotCreatedEvent(
  snapshotId: string,
  nodeCount: number,
  edgeCount: number,
  options: { correlationId?: string; metadata?: Metadata } = {},
): SnapshotCreatedEvent {
  return Object.freeze({
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'graph.snapshot.created',
    timestamp: new Date().toISOString(),
    correlationId: options.correlationId,
    metadata: options.metadata,
    data: Object.freeze({
      snapshotId: brandSnapshotId(snapshotId),
      nodeCount,
      edgeCount,
    }),
  });
}

/** Create a GraphValidatedEvent */
export function createGraphValidatedEvent(
  valid: boolean,
  errorCount: number,
  warningCount: number,
  options: { correlationId?: string; metadata?: Metadata } = {},
): GraphValidatedEvent {
  return Object.freeze({
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'graph.validated',
    timestamp: new Date().toISOString(),
    correlationId: options.correlationId,
    metadata: options.metadata,
    data: Object.freeze({ valid, errorCount, warningCount }),
  });
}
