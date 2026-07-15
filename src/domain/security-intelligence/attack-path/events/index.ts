/**
 * Security Intelligence Attack Path Builder — Events
 *
 * Domain events for the Attack Path Builder lifecycle.
 * Provides observability into path discovery, ranking, simulation, and graph building.
 *
 * Events:
 * - PathDiscovered: A new attack path was discovered
 * - PathRanked: A path was ranked
 * - SimulationCompleted: An attack simulation finished
 * - AttackGraphBuilt: The attack graph was constructed
 */

import type {
  AttackPathId, AttackSimulationId, AttackNodeId,
  Timestamp, Metadata, DiscoveryStrategy, AttackObjectiveType,
} from '../types/index.ts';

// ─── Event Types ─────────────────────────────────────────────

/** Discriminator for attack path events */
export type AttackPathEventType =
  | 'PathDiscovered'
  | 'PathRanked'
  | 'SimulationCompleted'
  | 'AttackGraphBuilt';

/** Base event shape */
interface AttackPathBaseEvent {
  readonly type: AttackPathEventType;
  readonly engineId: string;
  readonly timestamp: Timestamp;
  readonly metadata: Metadata;
}

/** Event: A new attack path was discovered */
export interface PathDiscoveredEvent extends AttackPathBaseEvent {
  readonly type: 'PathDiscovered';
  readonly pathId: AttackPathId;
  readonly strategy: DiscoveryStrategy;
  readonly objective: AttackObjectiveType;
  readonly pathLength: number;
  readonly totalRisk: number;
  readonly discoveryDurationMs: number;
}

/** Event: A path was ranked */
export interface PathRankedEvent extends AttackPathBaseEvent {
  readonly type: 'PathRanked';
  readonly pathId: AttackPathId;
  readonly overallScore: number;
  readonly rank: number;
  readonly rankingDurationMs: number;
}

/** Event: An attack simulation finished */
export interface SimulationCompletedEvent extends AttackPathBaseEvent {
  readonly type: 'SimulationCompleted';
  readonly simulationId: AttackSimulationId;
  readonly pathId: AttackPathId;
  readonly successProbability: number;
  readonly criticalStepCount: number;
  readonly detectionPointCount: number;
  readonly simulationDurationMs: number;
}

/** Event: The attack graph was built */
export interface AttackGraphBuiltEvent extends AttackPathBaseEvent {
  readonly type: 'AttackGraphBuilt';
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly pathCount: number;
  readonly buildDurationMs: number;
}

/** Union of all attack path events */
export type AnyAttackPathEvent =
  | PathDiscoveredEvent
  | PathRankedEvent
  | SimulationCompletedEvent
  | AttackGraphBuiltEvent;

/** Event handler function */
export type AttackPathEventHandler = (event: AnyAttackPathEvent) => void;

// ─── Event Factories ─────────────────────────────────────────

/** Create a PathDiscoveredEvent */
export function createPathDiscoveredEvent(
  engineId: string,
  pathId: AttackPathId,
  strategy: DiscoveryStrategy,
  objective: AttackObjectiveType,
  pathLength: number,
  totalRisk: number,
  discoveryDurationMs: number,
  extra?: { readonly metadata?: Metadata },
): PathDiscoveredEvent {
  return Object.freeze({
    type: 'PathDiscovered',
    engineId,
    timestamp: new Date().toISOString() as Timestamp,
    pathId,
    strategy,
    objective,
    pathLength,
    totalRisk,
    discoveryDurationMs,
    metadata: Object.freeze({ ...(extra?.metadata ?? {}) }),
  });
}

/** Create a PathRankedEvent */
export function createPathRankedEvent(
  engineId: string,
  pathId: AttackPathId,
  overallScore: number,
  rank: number,
  rankingDurationMs: number,
  extra?: { readonly metadata?: Metadata },
): PathRankedEvent {
  return Object.freeze({
    type: 'PathRanked',
    engineId,
    timestamp: new Date().toISOString() as Timestamp,
    pathId,
    overallScore,
    rank,
    rankingDurationMs,
    metadata: Object.freeze({ ...(extra?.metadata ?? {}) }),
  });
}

/** Create a SimulationCompletedEvent */
export function createSimulationCompletedEvent(
  engineId: string,
  simulationId: AttackSimulationId,
  pathId: AttackPathId,
  successProbability: number,
  criticalStepCount: number,
  detectionPointCount: number,
  simulationDurationMs: number,
  extra?: { readonly metadata?: Metadata },
): SimulationCompletedEvent {
  return Object.freeze({
    type: 'SimulationCompleted',
    engineId,
    timestamp: new Date().toISOString() as Timestamp,
    simulationId,
    pathId,
    successProbability,
    criticalStepCount,
    detectionPointCount,
    simulationDurationMs,
    metadata: Object.freeze({ ...(extra?.metadata ?? {}) }),
  });
}

/** Create an AttackGraphBuiltEvent */
export function createAttackGraphBuiltEvent(
  engineId: string,
  nodeCount: number,
  edgeCount: number,
  pathCount: number,
  buildDurationMs: number,
  extra?: { readonly metadata?: Metadata },
): AttackGraphBuiltEvent {
  return Object.freeze({
    type: 'AttackGraphBuilt',
    engineId,
    timestamp: new Date().toISOString() as Timestamp,
    nodeCount,
    edgeCount,
    pathCount,
    buildDurationMs,
    metadata: Object.freeze({ ...(extra?.metadata ?? {}) }),
  });
}

// ─── Event Bus ───────────────────────────────────────────────

/**
 * Simple synchronous event bus for attack path events.
 * Follows the same pattern as RiskEventBus and CorrelationEventBus.
 */
export class AttackPathEventBus {
  private readonly _handlers: AttackPathEventHandler[] = [];

  /** Subscribe to all attack path events */
  subscribe(handler: AttackPathEventHandler): void {
    this._handlers.push(handler);
  }

  /** Unsubscribe a handler */
  unsubscribe(handler: AttackPathEventHandler): void {
    const idx = this._handlers.indexOf(handler);
    if (idx !== -1) this._handlers.splice(idx, 1);
  }

  /** Emit an event to all subscribers */
  emit(event: AnyAttackPathEvent): void {
    for (const handler of this._handlers) {
      try {
        handler(event);
      } catch {
        // Handler errors should not affect the engine
      }
    }
  }

  /** Clear all handlers */
  clear(): void {
    this._handlers.length = 0;
  }

  /** Get number of subscribers */
  get handlerCount(): number {
    return this._handlers.length;
  }
}
