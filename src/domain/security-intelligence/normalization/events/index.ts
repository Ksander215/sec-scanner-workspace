/**
 * Security Intelligence Normalization Engine — Events
 *
 * Normalization lifecycle events for observability:
 * - FindingNormalized: single finding normalized successfully
 * - NormalizationFailed: normalization failed for a finding
 * - BatchNormalized: batch of findings normalized
 * - CanonicalizationCompleted: full canonicalization pipeline finished
 */

import type { Timestamp, Metadata, FindingId } from '../types/index.ts';

// ─── Base Normalization Event ────────────────────────────────

export interface NormalizationEvent {
  readonly id: string;
  readonly type: string;
  readonly timestamp: Timestamp;
  readonly engineId: string;
  readonly metadata?: Metadata;
}

// ─── FindingNormalized ───────────────────────────────────────

export interface FindingNormalizedEvent extends NormalizationEvent {
  readonly type: 'normalization.finding.normalized';
  readonly data: {
    readonly findingId: FindingId;
    readonly sourceEngine: string;
    readonly severity: string;
    readonly confidence: string;
    readonly appliedNormalizations: readonly string[];
    readonly durationMs: number;
  };
}

export function createFindingNormalizedEvent(
  engineId: string,
  findingId: FindingId,
  sourceEngine: string,
  severity: string,
  confidence: string,
  appliedNormalizations: readonly string[],
  durationMs: number,
  options: { metadata?: Metadata } = {},
): FindingNormalizedEvent {
  return Object.freeze({
    id: `nevt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'normalization.finding.normalized',
    timestamp: new Date().toISOString() as Timestamp,
    engineId,
    metadata: options.metadata,
    data: Object.freeze({ findingId, sourceEngine, severity, confidence, appliedNormalizations, durationMs }),
  });
}

// ─── NormalizationFailed ─────────────────────────────────────

export interface NormalizationFailedEvent extends NormalizationEvent {
  readonly type: 'normalization.finding.failed';
  readonly data: {
    readonly findingId: string;
    readonly sourceEngine: string;
    readonly errors: readonly string[];
    readonly durationMs: number;
  };
}

export function createNormalizationFailedEvent(
  engineId: string,
  findingId: string,
  sourceEngine: string,
  errors: readonly string[],
  durationMs: number,
  options: { metadata?: Metadata } = {},
): NormalizationFailedEvent {
  return Object.freeze({
    id: `nevt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'normalization.finding.failed',
    timestamp: new Date().toISOString() as Timestamp,
    engineId,
    metadata: options.metadata,
    data: Object.freeze({ findingId, sourceEngine, errors, durationMs }),
  });
}

// ─── BatchNormalized ─────────────────────────────────────────

export interface BatchNormalizedEvent extends NormalizationEvent {
  readonly type: 'normalization.batch.normalized';
  readonly data: {
    readonly total: number;
    readonly succeeded: number;
    readonly failed: number;
    readonly durationMs: number;
    readonly throughputPerSecond: number;
  };
}

export function createBatchNormalizedEvent(
  engineId: string,
  total: number,
  succeeded: number,
  failed: number,
  durationMs: number,
  throughputPerSecond: number,
  options: { metadata?: Metadata } = {},
): BatchNormalizedEvent {
  return Object.freeze({
    id: `nevt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'normalization.batch.normalized',
    timestamp: new Date().toISOString() as Timestamp,
    engineId,
    metadata: options.metadata,
    data: Object.freeze({ total, succeeded, failed, durationMs, throughputPerSecond }),
  });
}

// ─── CanonicalizationCompleted ───────────────────────────────

export interface CanonicalizationCompletedEvent extends NormalizationEvent {
  readonly type: 'normalization.canonicalization.completed';
  readonly data: {
    readonly findingId: FindingId;
    readonly fieldCount: number;
    readonly normalizationsApplied: number;
    readonly durationMs: number;
  };
}

export function createCanonicalizationCompletedEvent(
  engineId: string,
  findingId: FindingId,
  fieldCount: number,
  normalizationsApplied: number,
  durationMs: number,
  options: { metadata?: Metadata } = {},
): CanonicalizationCompletedEvent {
  return Object.freeze({
    id: `nevt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'normalization.canonicalization.completed',
    timestamp: new Date().toISOString() as Timestamp,
    engineId,
    metadata: options.metadata,
    data: Object.freeze({ findingId, fieldCount, normalizationsApplied, durationMs }),
  });
}

// ─── Event Union ─────────────────────────────────────────────

export type AnyNormalizationEvent =
  | FindingNormalizedEvent
  | NormalizationFailedEvent
  | BatchNormalizedEvent
  | CanonicalizationCompletedEvent;

// ─── Event Handler ───────────────────────────────────────────

export type NormalizationEventHandler = (event: AnyNormalizationEvent) => void;

/** Simple event bus for normalization events */
export class NormalizationEventBus {
  private readonly _handlers: NormalizationEventHandler[] = [];

  /** Subscribe to normalization events */
  subscribe(handler: NormalizationEventHandler): () => void {
    this._handlers.push(handler);
    return () => {
      const idx = this._handlers.indexOf(handler);
      if (idx >= 0) this._handlers.splice(idx, 1);
    };
  }

  /** Emit a normalization event to all subscribers */
  emit(event: AnyNormalizationEvent): void {
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
