/**
 * Experience Runtime — Subsystem 1: Behavior Runtime
 * TASK-AIS-004A.000
 *
 * Collects anonymized behavioral events. Maintains an in-memory store
 * keyed by userIdHash. Publishes events for provenance and audit.
 *
 * Conforms to: DOM-002, ADR-014, CON-001, AL-012
 */

import type { ExperienceRuntimeConfig } from './types.js';
import type {
  BehaviorEvent,
  Observation,
  ObservationId,
} from './types.js';
import { BehaviorEventType } from './types.js';
import {
  BehaviorEventCollected,
  ObservationRecorded,
} from './events.js';
import { BehaviorEventValidationError, BehaviorEventStorageError } from './errors.js';
import { createId } from '../domain/identifiers.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import { TraceCollector } from '../trace/trace-collector.js';

class UserBehaviorStore {
  private readonly events: BehaviorEvent[] = [];
  private readonly observations: Observation[] = [];

  addEvent(event: BehaviorEvent): void {
    this.events.push(event);
  }

  addObservation(observation: Observation): void {
    this.observations.push(observation);
  }

  getEvents(): readonly BehaviorEvent[] {
    return this.events;
  }

  getObservations(): readonly Observation[] {
    return this.observations;
  }

  getEventsByType(type: BehaviorEventType): readonly BehaviorEvent[] {
    return this.events.filter(e => e.type === type);
  }

  getEventCount(): number {
    return this.events.length;
  }

  getObservationCount(): number {
    return this.observations.length;
  }
}

export class BehaviorRuntime {
  private readonly config: ExperienceRuntimeConfig;
  private readonly eventBus: InProcessEventBus | undefined;
  private readonly trace: TraceCollector;
  private readonly stores = new Map<string, UserBehaviorStore>();

  constructor(config: ExperienceRuntimeConfig, eventBus?: InProcessEventBus, trace?: TraceCollector) {
    this.config = config;
    this.eventBus = eventBus;
    this.trace = trace ?? new TraceCollector();
    this.trace.traceInfo('BehaviorRuntime initialized', {
      maxObservationsPerUser: config.maxObservationsPerUser,
    });
  }

  /**
   * Record a validated behavioral event. Stores the event in-memory keyed
   * by userIdHash and publishes a BehaviorEventCollected domain event.
   */
  recordEvent(event: BehaviorEvent): void {
    this.validateEvent(event);

    const store = this.getOrCreateStore(event.userIdHash);

    // Enforce per-user observation limit
    if (store.getEventCount() >= this.config.maxObservationsPerUser) {
      this.trace.traceError(
        'EXP-BEH-002',
        `Max observations reached for user ${event.userIdHash}`,
        { userIdHash: event.userIdHash, limit: this.config.maxObservationsPerUser },
      );
      throw new BehaviorEventStorageError(
        `Max observations per user reached: ${this.config.maxObservationsPerUser}`,
        { userIdHash: event.userIdHash, limit: this.config.maxObservationsPerUser },
      );
    }

    store.addEvent(event);

    void this.publishBehaviorEventCollected(event);

    this.trace.traceInfo('Behavior event recorded', {
      eventId: event.id,
      userIdHash: event.userIdHash,
      eventType: event.type,
      sessionId: event.sessionId,
    });
  }

  /**
   * Convert a behavior event into an Observation for downstream provenance.
   * Publishes an ObservationRecorded domain event.
   */
  recordObservation(event: BehaviorEvent): Observation {
    const observationId = createId<ObservationId>();
    const now = new Date().toISOString();

    const observation: Observation = {
      id: observationId,
      userIdHash: event.userIdHash,
      type: event.type,
      value: event.data,
      timestamp: now,
      source: 'BehaviorRuntime',
      confidence: 1.0,
    };

    const store = this.getOrCreateStore(event.userIdHash);
    store.addObservation(observation);

    void this.publishObservationRecorded(observation);

    this.trace.traceInfo('Observation recorded from behavior event', {
      observationId,
      behaviorEventId: event.id,
      userIdHash: event.userIdHash,
    });

    return observation;
  }

  /** Get all behavior events for a user */
  getEventsForUser(userIdHash: string): readonly BehaviorEvent[] {
    return this.getOrCreateStore(userIdHash).getEvents();
  }

  /** Get all behavior events of a specific type for a user */
  getEventsByType(userIdHash: string, type: BehaviorEventType): readonly BehaviorEvent[] {
    return this.getOrCreateStore(userIdHash).getEventsByType(type);
  }

  /**
   * Calculate session duration from SessionDuration events for a given session.
   * Returns duration in milliseconds, or null if no duration events found.
   */
  getSessionDuration(userIdHash: string, sessionId: string): number | null {
    const events = this.getOrCreateStore(userIdHash).getEvents();
    const sessionEvents = events.filter(
      e => e.sessionId === sessionId && e.type === BehaviorEventType.SessionDuration,
    );

    if (sessionEvents.length === 0) {
      return null;
    }

    // Sum all duration events for the session
    let totalDuration = 0;
    for (const event of sessionEvents) {
      const duration = event.data['durationMs'];
      if (typeof duration === 'number') {
        totalDuration += duration;
      }
    }

    return totalDuration > 0 ? totalDuration : null;
  }

  /**
   * Count how many times a specific feature has been used by a user.
   */
  getFeatureUsageFrequency(userIdHash: string, feature: string): number {
    const events = this.getOrCreateStore(userIdHash).getEvents();
    let count = 0;
    for (const event of events) {
      if (
        event.type === BehaviorEventType.FeatureUsed &&
        event.data['feature'] === feature
      ) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get an interaction summary for a user including total events,
   * unique sessions, and average session duration.
   */
  getInteractionSummary(userIdHash: string): {
    readonly totalEvents: number;
    readonly sessions: number;
    readonly avgDuration: number;
  } {
    const store = this.getOrCreateStore(userIdHash);
    const events = store.getEvents();
    const sessionIds = new Set<string>();
    const durations: number[] = [];

    for (const event of events) {
      sessionIds.add(event.sessionId);
      if (event.type === BehaviorEventType.SessionDuration) {
        const duration = event.data['durationMs'];
        if (typeof duration === 'number' && duration > 0) {
          durations.push(duration);
        }
      }
    }

    const avgDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    return {
      totalEvents: events.length,
      sessions: sessionIds.size,
      avgDuration,
    } as const;
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private validateEvent(event: BehaviorEvent): void {
    if (!event.id) {
      throw new BehaviorEventValidationError('Behavior event must have an id', { event });
    }
    if (!event.userIdHash || typeof event.userIdHash !== 'string') {
      throw new BehaviorEventValidationError(
        'Behavior event must have a valid userIdHash',
        { userIdHash: event.userIdHash },
      );
    }
    if (!event.sessionId || typeof event.sessionId !== 'string') {
      throw new BehaviorEventValidationError(
        'Behavior event must have a valid sessionId',
        { sessionId: event.sessionId },
      );
    }
    if (!event.timestamp || typeof event.timestamp !== 'string') {
      throw new BehaviorEventValidationError(
        'Behavior event must have a valid timestamp',
        { timestamp: event.timestamp },
      );
    }
    if (!Object.values(BehaviorEventType).includes(event.type)) {
      throw new BehaviorEventValidationError(
        `Unknown behavior event type: ${event.type as string}`,
        { type: event.type },
      );
    }
  }

  private getOrCreateStore(userIdHash: string): UserBehaviorStore {
    let store = this.stores.get(userIdHash);
    if (!store) {
      store = new UserBehaviorStore();
      this.stores.set(userIdHash, store);
    }
    return store;
  }

  private async publishBehaviorEventCollected(event: BehaviorEvent): Promise<void> {
    if (!this.eventBus) return;
    const domainEvent: BehaviorEventCollected = {
      eventId: crypto.randomUUID(),
      eventType: 'BehaviorEventCollected',
      classification: EventClassification.Info,
      timestamp: new Date().toISOString(),
      sequence: 0,
      aggregateId: event.userIdHash,
      aggregateType: 'BehaviorRuntime',
      version: '1.0.0',
      payload: {
        eventId: event.id,
        userIdHash: event.userIdHash,
        eventType: event.type,
        sessionId: event.sessionId,
        collectedAt: new Date().toISOString(),
      },
    };
    await this.eventBus.publish(domainEvent);
  }

  private async publishObservationRecorded(observation: Observation): Promise<void> {
    if (!this.eventBus) return;
    const domainEvent: ObservationRecorded = {
      eventId: crypto.randomUUID(),
      eventType: 'ObservationRecorded',
      classification: EventClassification.Info,
      timestamp: new Date().toISOString(),
      sequence: 0,
      aggregateId: observation.userIdHash,
      aggregateType: 'BehaviorRuntime',
      version: '1.0.0',
      payload: {
        observationId: observation.id,
        userIdHash: observation.userIdHash,
        type: observation.type,
        source: observation.source,
        confidence: observation.confidence,
        recordedAt: observation.timestamp,
      },
    };
    await this.eventBus.publish(domainEvent);
  }
}
