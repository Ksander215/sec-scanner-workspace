/**
 * Security Intelligence Impact Analysis — Events
 *
 * 4 domain events for the Impact Analysis Engine:
 * - ImpactAnalysisStarted
 * - ImpactCalculated
 * - ScenarioCompleted
 * - RecommendationRanked
 */

import type {
  ImpactAnalysisId, ImpactScenarioId, Timestamp, Metadata,
} from '../types/index.ts';
import type { RemediationRankingStrategy } from '../types/index.ts';
import { brandImpactAnalysisId } from '../types/index.ts';

// ─── Event Types ─────────────────────────────────────────────

export interface ImpactAnalysisStartedEvent {
  readonly type: 'ImpactAnalysisStarted';
  readonly scenarioId: ImpactScenarioId;
  readonly scenarioType: string;
  readonly timestamp: Timestamp;
  readonly metadata: Metadata;
}

export interface ImpactCalculatedEvent {
  readonly type: 'ImpactCalculated';
  readonly analysisId: ImpactAnalysisId;
  readonly scenarioId: ImpactScenarioId;
  readonly riskDelta: number;
  readonly pathsEliminated: number;
  readonly timestamp: Timestamp;
  readonly metadata: Metadata;
}

export interface ScenarioCompletedEvent {
  readonly type: 'ScenarioCompleted';
  readonly scenarioId: ImpactScenarioId;
  readonly analysisId: ImpactAnalysisId;
  readonly durationMs: number;
  readonly timestamp: Timestamp;
  readonly metadata: Metadata;
}

export interface RecommendationRankedEvent {
  readonly type: 'RecommendationRanked';
  readonly analysisId: ImpactAnalysisId;
  readonly rankingStrategy: RemediationRankingStrategy;
  readonly totalCandidates: number;
  readonly topCandidateId: string | null;
  readonly timestamp: Timestamp;
  readonly metadata: Metadata;
}

export type AnyImpactEvent =
  | ImpactAnalysisStartedEvent
  | ImpactCalculatedEvent
  | ScenarioCompletedEvent
  | RecommendationRankedEvent;

export type ImpactEventHandler = (event: AnyImpactEvent) => void;

// ─── Event Factories ─────────────────────────────────────────

export function createImpactAnalysisStartedEvent(
  scenarioId: ImpactScenarioId,
  scenarioType: string,
  metadata?: Metadata,
): ImpactAnalysisStartedEvent {
  return Object.freeze({
    type: 'ImpactAnalysisStarted',
    scenarioId,
    scenarioType,
    timestamp: new Date().toISOString() as Timestamp,
    metadata: Object.freeze({ ...(metadata ?? {}) }),
  });
}

export function createImpactCalculatedEvent(
  analysisId: ImpactAnalysisId,
  scenarioId: ImpactScenarioId,
  riskDelta: number,
  pathsEliminated: number,
  metadata?: Metadata,
): ImpactCalculatedEvent {
  return Object.freeze({
    type: 'ImpactCalculated',
    analysisId,
    scenarioId,
    riskDelta,
    pathsEliminated,
    timestamp: new Date().toISOString() as Timestamp,
    metadata: Object.freeze({ ...(metadata ?? {}) }),
  });
}

export function createScenarioCompletedEvent(
  scenarioId: ImpactScenarioId,
  analysisId: ImpactAnalysisId,
  durationMs: number,
  metadata?: Metadata,
): ScenarioCompletedEvent {
  return Object.freeze({
    type: 'ScenarioCompleted',
    scenarioId,
    analysisId,
    durationMs,
    timestamp: new Date().toISOString() as Timestamp,
    metadata: Object.freeze({ ...(metadata ?? {}) }),
  });
}

export function createRecommendationRankedEvent(
  analysisId: ImpactAnalysisId,
  rankingStrategy: RemediationRankingStrategy,
  totalCandidates: number,
  topCandidateId: string | null,
  metadata?: Metadata,
): RecommendationRankedEvent {
  return Object.freeze({
    type: 'RecommendationRanked',
    analysisId,
    rankingStrategy,
    totalCandidates,
    topCandidateId,
    timestamp: new Date().toISOString() as Timestamp,
    metadata: Object.freeze({ ...(metadata ?? {}) }),
  });
}

// ─── Event Bus ───────────────────────────────────────────────

export class ImpactEventBus {
  private readonly _handlers: ImpactEventHandler[] = [];

  subscribe(handler: ImpactEventHandler): () => void {
    this._handlers.push(handler);
    return () => {
      const idx = this._handlers.indexOf(handler);
      if (idx >= 0) this._handlers.splice(idx, 1);
    };
  }

  publish(event: AnyImpactEvent): void {
    for (const handler of this._handlers) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors to preserve engine stability
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
