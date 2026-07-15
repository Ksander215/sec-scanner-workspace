/**
 * Security Intelligence Risk Engine — Events
 *
 * Risk lifecycle events for observability:
 * - RiskCalculated: risk score computed for a finding
 * - RiskUpdated: existing risk score updated
 * - RiskChanged: risk level changed (e.g., Medium → High)
 * - RiskHistoryRecorded: history entry recorded
 */

import type { Timestamp, Metadata, FindingId, RiskLevel, RiskTrend, RiskReason, RiskAssessmentId } from '../types/index.ts';

// ─── Base Risk Event ─────────────────────────────────────────

export interface RiskEvent {
  readonly id: string;
  readonly type: string;
  readonly timestamp: Timestamp;
  readonly engineId: string;
  readonly metadata?: Metadata;
}

// ─── RiskCalculated ──────────────────────────────────────────

export interface RiskCalculatedEvent extends RiskEvent {
  readonly type: 'risk.calculated';
  readonly data: {
    readonly findingId: FindingId;
    readonly rawScore: number;
    readonly level: RiskLevel;
    readonly factorCount: number;
    readonly durationMs: number;
  };
}

export function createRiskCalculatedEvent(
  engineId: string,
  findingId: FindingId,
  rawScore: number,
  level: RiskLevel,
  factorCount: number,
  durationMs: number,
  options: { metadata?: Metadata } = {},
): RiskCalculatedEvent {
  return Object.freeze({
    id: `revt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'risk.calculated',
    timestamp: new Date().toISOString() as Timestamp,
    engineId,
    metadata: options.metadata,
    data: Object.freeze({ findingId, rawScore, level, factorCount, durationMs }),
  });
}

// ─── RiskUpdated ─────────────────────────────────────────────

export interface RiskUpdatedEvent extends RiskEvent {
  readonly type: 'risk.updated';
  readonly data: {
    readonly findingId: FindingId;
    readonly previousScore: number;
    readonly newScore: number;
    readonly previousLevel: RiskLevel;
    readonly newLevel: RiskLevel;
    readonly trend: RiskTrend;
  };
}

export function createRiskUpdatedEvent(
  engineId: string,
  findingId: FindingId,
  previousScore: number,
  newScore: number,
  previousLevel: RiskLevel,
  newLevel: RiskLevel,
  trend: RiskTrend,
  options: { metadata?: Metadata } = {},
): RiskUpdatedEvent {
  return Object.freeze({
    id: `revt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'risk.updated',
    timestamp: new Date().toISOString() as Timestamp,
    engineId,
    metadata: options.metadata,
    data: Object.freeze({ findingId, previousScore, newScore, previousLevel, newLevel, trend }),
  });
}

// ─── RiskChanged ─────────────────────────────────────────────

export interface RiskChangedEvent extends RiskEvent {
  readonly type: 'risk.changed';
  readonly data: {
    readonly findingId: FindingId;
    readonly fromLevel: RiskLevel;
    readonly toLevel: RiskLevel;
    readonly assessmentId: RiskAssessmentId;
  };
}

export function createRiskChangedEvent(
  engineId: string,
  findingId: FindingId,
  fromLevel: RiskLevel,
  assessmentId: RiskAssessmentId,
  toLevel: RiskLevel,
  options: { metadata?: Metadata } = {},
): RiskChangedEvent {
  return Object.freeze({
    id: `revt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'risk.changed',
    timestamp: new Date().toISOString() as Timestamp,
    engineId,
    metadata: options.metadata,
    data: Object.freeze({
      findingId,
      fromLevel,
      toLevel,
      assessmentId,
    }),
  });
}

// ─── RiskHistoryRecorded ─────────────────────────────────────

export interface RiskHistoryRecordedEvent extends RiskEvent {
  readonly type: 'risk.history.recorded';
  readonly data: {
    readonly assessmentId: RiskAssessmentId;
    readonly findingId: FindingId;
    readonly rawScore: number;
    readonly level: RiskLevel;
    readonly trend: RiskTrend;
    readonly delta: number;
  };
}

export function createRiskHistoryRecordedEvent(
  engineId: string,
  assessmentId: RiskAssessmentId,
  findingId: FindingId,
  rawScore: number,
  level: RiskLevel,
  trend: RiskTrend,
  delta: number,
  options: { metadata?: Metadata } = {},
): RiskHistoryRecordedEvent {
  return Object.freeze({
    id: `revt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'risk.history.recorded',
    timestamp: new Date().toISOString() as Timestamp,
    engineId,
    metadata: options.metadata,
    data: Object.freeze({ assessmentId, findingId, rawScore, level, trend, delta }),
  });
}

// ─── Event Union ─────────────────────────────────────────────

export type AnyRiskEvent =
  | RiskCalculatedEvent
  | RiskUpdatedEvent
  | RiskChangedEvent
  | RiskHistoryRecordedEvent;

// ─── Event Handler ───────────────────────────────────────────

export type RiskEventHandler = (event: AnyRiskEvent) => void;

/** Simple event bus for risk events */
export class RiskEventBus {
  private readonly _handlers: RiskEventHandler[] = [];

  /** Subscribe to risk events */
  subscribe(handler: RiskEventHandler): () => void {
    this._handlers.push(handler);
    return () => {
      const idx = this._handlers.indexOf(handler);
      if (idx >= 0) this._handlers.splice(idx, 1);
    };
  }

  /** Emit a risk event to all subscribers */
  emit(event: AnyRiskEvent): void {
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
