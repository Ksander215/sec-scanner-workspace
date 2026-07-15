/**
 * Knowledge Graph Query Engine — Events
 *
 * Query lifecycle events for observability and monitoring.
 * Events follow the same pattern as domain events:
 * - Base interface with id, type, timestamp
 * - Discriminated type literal for each event kind
 * - Readonly data payload
 *
 * Event types:
 * - query.started      — query execution has begun
 * - query.completed    — query execution finished successfully
 * - query.cancelled    — query execution was cancelled
 * - query.cached       — query result was served from cache
 */

import type { QueryId, Timestamp, Metadata } from '../../types/index.ts';
import { brandQueryId } from '../../types/index.ts';
import type { QueryTarget, QueryStatistics } from '../types/index.ts';

// ─── Base Event ────────────────────────────────────────────────

/**
 * Base interface for all query events.
 */
export interface QueryEvent {
  readonly id: string;
  readonly type: string;
  readonly timestamp: Timestamp;
  readonly correlationId?: string;
  readonly metadata?: Metadata;
}

// ─── Query Started ─────────────────────────────────────────────

export interface QueryStartedEvent extends QueryEvent {
  readonly type: 'query.started';
  readonly data: {
    readonly queryId: QueryId;
    readonly target: QueryTarget;
    readonly filterCount: number;
    readonly hasAggregations: boolean;
  };
}

export function createQueryStartedEvent(
  queryId: string,
  target: QueryTarget,
  data: { filterCount?: number; hasAggregations?: boolean; correlationId?: string },
): QueryStartedEvent {
  return Object.freeze({
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'query.started',
    timestamp: new Date().toISOString(),
    correlationId: data.correlationId,
    data: Object.freeze({
      queryId: brandQueryId(queryId),
      target,
      filterCount: data.filterCount ?? 0,
      hasAggregations: data.hasAggregations ?? false,
    }),
  });
}

// ─── Query Completed ───────────────────────────────────────────

export interface QueryCompletedEvent extends QueryEvent {
  readonly type: 'query.completed';
  readonly data: {
    readonly queryId: QueryId;
    readonly target: QueryTarget;
    readonly returnedRows: number;
    readonly duration: number;
    readonly cacheHit: boolean;
  };
}

export function createQueryCompletedEvent(
  queryId: string,
  target: QueryTarget,
  data: { returnedRows: number; duration: number; cacheHit?: boolean; correlationId?: string },
): QueryCompletedEvent {
  return Object.freeze({
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'query.completed',
    timestamp: new Date().toISOString(),
    correlationId: data.correlationId,
    data: Object.freeze({
      queryId: brandQueryId(queryId),
      target,
      returnedRows: data.returnedRows,
      duration: data.duration,
      cacheHit: data.cacheHit ?? false,
    }),
  });
}

// ─── Query Cancelled ───────────────────────────────────────────

export interface QueryCancelledEvent extends QueryEvent {
  readonly type: 'query.cancelled';
  readonly data: {
    readonly queryId: QueryId;
    readonly target: QueryTarget;
    readonly reason: string;
    readonly duration: number;
  };
}

export function createQueryCancelledEvent(
  queryId: string,
  target: QueryTarget,
  data: { reason: string; duration: number; correlationId?: string },
): QueryCancelledEvent {
  return Object.freeze({
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'query.cancelled',
    timestamp: new Date().toISOString(),
    correlationId: data.correlationId,
    data: Object.freeze({
      queryId: brandQueryId(queryId),
      target,
      reason: data.reason,
      duration: data.duration,
    }),
  });
}

// ─── Query Cached ──────────────────────────────────────────────

export interface QueryCachedEvent extends QueryEvent {
  readonly type: 'query.cached';
  readonly data: {
    readonly queryId: QueryId;
    readonly target: QueryTarget;
    readonly cacheHitCount: number;
    readonly age: number;
  };
}

export function createQueryCachedEvent(
  queryId: string,
  target: QueryTarget,
  data: { cacheHitCount: number; age: number; correlationId?: string },
): QueryCachedEvent {
  return Object.freeze({
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'query.cached',
    timestamp: new Date().toISOString(),
    correlationId: data.correlationId,
    data: Object.freeze({
      queryId: brandQueryId(queryId),
      target,
      cacheHitCount: data.cacheHitCount,
      age: data.age,
    }),
  });
}

// ─── Event Union ───────────────────────────────────────────────

/** Union of all query event types */
export type AnyQueryEvent =
  | QueryStartedEvent
  | QueryCompletedEvent
  | QueryCancelledEvent
  | QueryCachedEvent;
