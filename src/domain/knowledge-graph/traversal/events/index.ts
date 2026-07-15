/**
 * Knowledge Graph Traversal Engine — Events
 *
 * Domain events specific to traversal operations.
 * Follows the same pattern as the core Knowledge Graph events:
 * - Base interface with common fields
 * - Discriminated type literal and data payload
 * - All event data is readonly
 * - Factory functions for event creation
 *
 * Events:
 * - TraversalStarted: when a traversal begins
 * - TraversalCompleted: when a traversal finishes normally
 * - TraversalCancelled: when a traversal is cancelled
 * - PathFound: when a path is discovered
 * - CycleDetected: when a cycle is found
 */

import type { NodeId, EdgeId, Timestamp, Metadata } from '../../types/index.ts';
import { brandNodeId, brandEdgeId } from '../../types/index.ts';
import type { TraversalStrategy, TerminationReason } from '../types/index.ts';
import { TraversalStrategy as TS, TerminationReason as TR } from '../types/index.ts';

// ─── Base ─────────────────────────────────────────────────────

/** Base interface for all traversal events */
export interface TraversalEvent {
  readonly id: string;
  readonly type: string;
  readonly timestamp: Timestamp;
  readonly correlationId?: string;
  readonly metadata?: Metadata;
}

// ─── TraversalStarted ─────────────────────────────────────────

export interface TraversalStartedEvent extends TraversalEvent {
  readonly type: 'traversal.started';
  readonly data: {
    readonly strategy: TraversalStrategy;
    readonly startNodeId: NodeId;
    readonly targetNodeId?: NodeId;
    readonly maxDepth: number;
    readonly direction: string;
  };
}

// ─── TraversalCompleted ───────────────────────────────────────

export interface TraversalCompletedEvent extends TraversalEvent {
  readonly type: 'traversal.completed';
  readonly data: {
    readonly strategy: TraversalStrategy;
    readonly startNodeId: NodeId;
    readonly visitedNodeCount: number;
    readonly visitedEdgeCount: number;
    readonly maxDepthReached: number;
    readonly duration: number;
    readonly terminationReason: TerminationReason;
  };
}

// ─── TraversalCancelled ───────────────────────────────────────

export interface TraversalCancelledEvent extends TraversalEvent {
  readonly type: 'traversal.cancelled';
  readonly data: {
    readonly strategy: TraversalStrategy;
    readonly startNodeId: NodeId;
    readonly reason: string;
    readonly visitedNodeCount: number;
    readonly duration: number;
  };
}

// ─── PathFound ────────────────────────────────────────────────

export interface PathFoundEvent extends TraversalEvent {
  readonly type: 'traversal.path_found';
  readonly data: {
    readonly sourceId: NodeId;
    readonly targetId: NodeId;
    readonly pathLength: number;
    readonly totalStrength: number;
    readonly strategy: TraversalStrategy;
  };
}

// ─── CycleDetected ────────────────────────────────────────────

export interface CycleDetectedEvent extends TraversalEvent {
  readonly type: 'traversal.cycle_detected';
  readonly data: {
    readonly cycleLength: number;
    readonly nodeIds: readonly NodeId[];
  };
}

// ─── Event Union ──────────────────────────────────────────────

/** Union of all traversal events */
export type AnyTraversalEvent =
  | TraversalStartedEvent
  | TraversalCompletedEvent
  | TraversalCancelledEvent
  | PathFoundEvent
  | CycleDetectedEvent;

// ─── Event Factory Functions ──────────────────────────────────

function eventId(): string {
  return `trav_evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function now(): Timestamp {
  return new Date().toISOString();
}

/** Create a TraversalStartedEvent */
export function createTraversalStartedEvent(
  strategy: TraversalStrategy,
  startNodeId: string,
  options: {
    targetNodeId?: string;
    maxDepth?: number;
    direction?: string;
    correlationId?: string;
    metadata?: Metadata;
  } = {},
): TraversalStartedEvent {
  return Object.freeze({
    id: eventId(),
    type: 'traversal.started',
    timestamp: now(),
    correlationId: options.correlationId,
    metadata: options.metadata,
    data: Object.freeze({
      strategy,
      startNodeId: brandNodeId(startNodeId),
      targetNodeId: options.targetNodeId ? brandNodeId(options.targetNodeId) : undefined,
      maxDepth: options.maxDepth ?? 10,
      direction: options.direction ?? 'outgoing',
    }),
  });
}

/** Create a TraversalCompletedEvent */
export function createTraversalCompletedEvent(
  strategy: TraversalStrategy,
  startNodeId: string,
  data: {
    visitedNodeCount: number;
    visitedEdgeCount: number;
    maxDepthReached: number;
    duration: number;
    terminationReason: TerminationReason;
  },
  options: {
    correlationId?: string;
    metadata?: Metadata;
  } = {},
): TraversalCompletedEvent {
  return Object.freeze({
    id: eventId(),
    type: 'traversal.completed',
    timestamp: now(),
    correlationId: options.correlationId,
    metadata: options.metadata,
    data: Object.freeze({
      strategy,
      startNodeId: brandNodeId(startNodeId),
      visitedNodeCount: data.visitedNodeCount,
      visitedEdgeCount: data.visitedEdgeCount,
      maxDepthReached: data.maxDepthReached,
      duration: data.duration,
      terminationReason: data.terminationReason,
    }),
  });
}

/** Create a TraversalCancelledEvent */
export function createTraversalCancelledEvent(
  strategy: TraversalStrategy,
  startNodeId: string,
  reason: string,
  data: {
    visitedNodeCount: number;
    duration: number;
  },
  options: {
    correlationId?: string;
    metadata?: Metadata;
  } = {},
): TraversalCancelledEvent {
  return Object.freeze({
    id: eventId(),
    type: 'traversal.cancelled',
    timestamp: now(),
    correlationId: options.correlationId,
    metadata: options.metadata,
    data: Object.freeze({
      strategy,
      startNodeId: brandNodeId(startNodeId),
      reason,
      visitedNodeCount: data.visitedNodeCount,
      duration: data.duration,
    }),
  });
}

/** Create a PathFoundEvent */
export function createPathFoundEvent(
  sourceId: string,
  targetId: string,
  data: {
    pathLength: number;
    totalStrength: number;
    strategy: TraversalStrategy;
  },
  options: {
    correlationId?: string;
    metadata?: Metadata;
  } = {},
): PathFoundEvent {
  return Object.freeze({
    id: eventId(),
    type: 'traversal.path_found',
    timestamp: now(),
    correlationId: options.correlationId,
    metadata: options.metadata,
    data: Object.freeze({
      sourceId: brandNodeId(sourceId),
      targetId: brandNodeId(targetId),
      pathLength: data.pathLength,
      totalStrength: data.totalStrength,
      strategy: data.strategy,
    }),
  });
}

/** Create a CycleDetectedEvent */
export function createCycleDetectedEvent(
  cycleLength: number,
  nodeIds: readonly string[],
  options: {
    correlationId?: string;
    metadata?: Metadata;
  } = {},
): CycleDetectedEvent {
  return Object.freeze({
    id: eventId(),
    type: 'traversal.cycle_detected',
    timestamp: now(),
    correlationId: options.correlationId,
    metadata: options.metadata,
    data: Object.freeze({
      cycleLength,
      nodeIds: nodeIds.map(id => brandNodeId(id)),
    }),
  });
}
