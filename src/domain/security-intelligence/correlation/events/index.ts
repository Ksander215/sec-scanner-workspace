/**
 * Security Intelligence Correlation Engine — Events
 *
 * Correlation lifecycle events for observability:
 * - CorrelationStarted: correlation run began
 * - CorrelationCompleted: correlation run finished
 * - CorrelationFailed: correlation run failed
 * - DuplicateDetected: duplicate findings detected
 * - CorrelationGraphBuilt: correlation graph construction completed
 */

import type { Timestamp, Metadata, FindingId, CorrelationId, CorrelationGroupId } from '../types/index.ts';

// ─── Base Correlation Event ──────────────────────────────────

export interface CorrelationEvent {
  readonly id: string;
  readonly type: string;
  readonly timestamp: Timestamp;
  readonly engineId: string;
  readonly metadata?: Metadata;
}

// ─── CorrelationStarted ──────────────────────────────────────

export interface CorrelationStartedEvent extends CorrelationEvent {
  readonly type: 'correlation.started';
  readonly data: {
    readonly findingCount: number;
    readonly rulesEnabled: number;
    readonly batchSize: number;
  };
}

export function createCorrelationStartedEvent(
  engineId: string,
  findingCount: number,
  rulesEnabled: number,
  batchSize: number,
  options: { metadata?: Metadata } = {},
): CorrelationStartedEvent {
  return Object.freeze({
    id: `cevt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'correlation.started',
    timestamp: new Date().toISOString() as Timestamp,
    engineId,
    metadata: options.metadata,
    data: Object.freeze({ findingCount, rulesEnabled, batchSize }),
  });
}

// ─── CorrelationCompleted ────────────────────────────────────

export interface CorrelationCompletedEvent extends CorrelationEvent {
  readonly type: 'correlation.completed';
  readonly data: {
    readonly totalCorrelations: number;
    readonly totalGroups: number;
    readonly totalDuplicates: number;
    readonly durationMs: number;
    readonly throughputPerSecond: number;
  };
}

export function createCorrelationCompletedEvent(
  engineId: string,
  totalCorrelations: number,
  totalGroups: number,
  totalDuplicates: number,
  durationMs: number,
  throughputPerSecond: number,
  options: { metadata?: Metadata } = {},
): CorrelationCompletedEvent {
  return Object.freeze({
    id: `cevt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'correlation.completed',
    timestamp: new Date().toISOString() as Timestamp,
    engineId,
    metadata: options.metadata,
    data: Object.freeze({ totalCorrelations, totalGroups, totalDuplicates, durationMs, throughputPerSecond }),
  });
}

// ─── CorrelationFailed ───────────────────────────────────────

export interface CorrelationFailedEvent extends CorrelationEvent {
  readonly type: 'correlation.failed';
  readonly data: {
    readonly findingCount: number;
    readonly errors: readonly string[];
    readonly durationMs: number;
  };
}

export function createCorrelationFailedEvent(
  engineId: string,
  findingCount: number,
  errors: readonly string[],
  durationMs: number,
  options: { metadata?: Metadata } = {},
): CorrelationFailedEvent {
  return Object.freeze({
    id: `cevt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'correlation.failed',
    timestamp: new Date().toISOString() as Timestamp,
    engineId,
    metadata: options.metadata,
    data: Object.freeze({ findingCount, errors, durationMs }),
  });
}

// ─── DuplicateDetected ───────────────────────────────────────

export interface DuplicateDetectedEvent extends CorrelationEvent {
  readonly type: 'correlation.duplicate.detected';
  readonly data: {
    readonly originalFindingId: FindingId;
    readonly duplicateFindingId: FindingId;
    readonly duplicateType: string;
    readonly similarity: number;
  };
}

export function createDuplicateDetectedEvent(
  engineId: string,
  originalFindingId: FindingId,
  duplicateFindingId: FindingId,
  duplicateType: string,
  similarity: number,
  options: { metadata?: Metadata } = {},
): DuplicateDetectedEvent {
  return Object.freeze({
    id: `cevt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'correlation.duplicate.detected',
    timestamp: new Date().toISOString() as Timestamp,
    engineId,
    metadata: options.metadata,
    data: Object.freeze({ originalFindingId, duplicateFindingId, duplicateType, similarity }),
  });
}

// ─── CorrelationGraphBuilt ───────────────────────────────────

export interface CorrelationGraphBuiltEvent extends CorrelationEvent {
  readonly type: 'correlation.graph.built';
  readonly data: {
    readonly nodeCount: number;
    readonly edgeCount: number;
    readonly groupCount: number;
    readonly durationMs: number;
  };
}

export function createCorrelationGraphBuiltEvent(
  engineId: string,
  nodeCount: number,
  edgeCount: number,
  groupCount: number,
  durationMs: number,
  options: { metadata?: Metadata } = {},
): CorrelationGraphBuiltEvent {
  return Object.freeze({
    id: `cevt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'correlation.graph.built',
    timestamp: new Date().toISOString() as Timestamp,
    engineId,
    metadata: options.metadata,
    data: Object.freeze({ nodeCount, edgeCount, groupCount, durationMs }),
  });
}

// ─── Event Union ─────────────────────────────────────────────

export type AnyCorrelationEvent =
  | CorrelationStartedEvent
  | CorrelationCompletedEvent
  | CorrelationFailedEvent
  | DuplicateDetectedEvent
  | CorrelationGraphBuiltEvent;

// ─── Event Handler ───────────────────────────────────────────

export type CorrelationEventHandler = (event: AnyCorrelationEvent) => void;

/** Simple event bus for correlation events */
export class CorrelationEventBus {
  private readonly _handlers: CorrelationEventHandler[] = [];

  /** Subscribe to correlation events */
  subscribe(handler: CorrelationEventHandler): () => void {
    this._handlers.push(handler);
    return () => {
      const idx = this._handlers.indexOf(handler);
      if (idx >= 0) this._handlers.splice(idx, 1);
    };
  }

  /** Emit a correlation event to all subscribers */
  emit(event: AnyCorrelationEvent): void {
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
