/**
 * Security Intelligence Recommendation Engine — Events
 *
 * 5 domain events + event bus for observability.
 */

import type {
  RecommendationId, RecommendationGroupId,
  RemediationPlanId, RecommendationRuleType, Timestamp, Metadata,
} from '../types/index.ts';
import {
  brandRecommendationId, brandRemediationPlanId,
} from '../types/index.ts';

// ─── Event Types ────────────────────────────────────────────

export interface RecommendationGeneratedEvent {
  readonly type: 'recommendation.generated';
  readonly engineId: string;
  readonly recommendationId: RecommendationId;
  readonly ruleType: RecommendationRuleType;
  readonly source: string;
  readonly severity: string;
  readonly timestamp: Timestamp;
}

export interface RecommendationRankedEvent {
  readonly type: 'recommendation.ranked';
  readonly engineId: string;
  readonly recommendationIds: readonly RecommendationId[];
  readonly strategy: string;
  readonly durationMs: number;
  readonly timestamp: Timestamp;
}

export interface RecommendationAcceptedEvent {
  readonly type: 'recommendation.accepted';
  readonly engineId: string;
  readonly recommendationId: RecommendationId;
  readonly planId: RemediationPlanId | null;
  readonly timestamp: Timestamp;
}

export interface RecommendationRejectedEvent {
  readonly type: 'recommendation.rejected';
  readonly engineId: string;
  readonly recommendationId: RecommendationId;
  readonly reason: string;
  readonly timestamp: Timestamp;
}

export interface RemediationPlanBuiltEvent {
  readonly type: 'remediation.plan.built';
  readonly engineId: string;
  readonly planId: RemediationPlanId;
  readonly strategy: string;
  readonly actionCount: number;
  readonly totalRiskReduction: number;
  readonly durationMs: number;
  readonly timestamp: Timestamp;
}

export type AnyRecommendationEvent =
  | RecommendationGeneratedEvent
  | RecommendationRankedEvent
  | RecommendationAcceptedEvent
  | RecommendationRejectedEvent
  | RemediationPlanBuiltEvent;

export type RecommendationEventHandler = (event: AnyRecommendationEvent) => void;

// ─── Event Factories ────────────────────────────────────────

export function createRecommendationGeneratedEvent(
  engineId: string,
  recommendationId: RecommendationId,
  ruleType: RecommendationRuleType,
  source: string,
  severity: string,
): RecommendationGeneratedEvent {
  return Object.freeze({
    type: 'recommendation.generated',
    engineId,
    recommendationId,
    ruleType,
    source,
    severity,
    timestamp: new Date().toISOString() as Timestamp,
  });
}

export function createRecommendationRankedEvent(
  engineId: string,
  recommendationIds: readonly RecommendationId[],
  strategy: string,
  durationMs: number,
): RecommendationRankedEvent {
  return Object.freeze({
    type: 'recommendation.ranked',
    engineId,
    recommendationIds: Object.freeze([...recommendationIds]),
    strategy,
    durationMs,
    timestamp: new Date().toISOString() as Timestamp,
  });
}

export function createRecommendationAcceptedEvent(
  engineId: string,
  recommendationId: RecommendationId,
  planId: RemediationPlanId | null,
): RecommendationAcceptedEvent {
  return Object.freeze({
    type: 'recommendation.accepted',
    engineId,
    recommendationId,
    planId,
    timestamp: new Date().toISOString() as Timestamp,
  });
}

export function createRecommendationRejectedEvent(
  engineId: string,
  recommendationId: RecommendationId,
  reason: string,
): RecommendationRejectedEvent {
  return Object.freeze({
    type: 'recommendation.rejected',
    engineId,
    recommendationId,
    reason,
    timestamp: new Date().toISOString() as Timestamp,
  });
}

export function createRemediationPlanBuiltEvent(
  engineId: string,
  planId: RemediationPlanId,
  strategy: string,
  actionCount: number,
  totalRiskReduction: number,
  durationMs: number,
): RemediationPlanBuiltEvent {
  return Object.freeze({
    type: 'remediation.plan.built',
    engineId,
    planId,
    strategy,
    actionCount,
    totalRiskReduction,
    durationMs,
    timestamp: new Date().toISOString() as Timestamp,
  });
}

// ─── Event Bus ──────────────────────────────────────────────

export class RecommendationEventBus {
  private readonly _handlers: RecommendationEventHandler[] = [];

  subscribe(handler: RecommendationEventHandler): () => void {
    this._handlers.push(handler);
    return () => {
      const idx = this._handlers.indexOf(handler);
      if (idx >= 0) this._handlers.splice(idx, 1);
    };
  }

  emit(event: AnyRecommendationEvent): void {
    for (const handler of this._handlers) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors — never let a subscriber break the engine
      }
    }
  }

  get handlerCount(): number {
    return this._handlers.length;
  }

  clear(): void {
    this._handlers.length = 0;
  }
}
