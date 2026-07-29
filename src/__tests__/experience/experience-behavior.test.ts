/**
 * Tests for BehaviorRuntime (Subsystem 1)
 * TASK-AIS-004A.000
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BehaviorRuntime } from '../../core/experience/behavior-runtime.js';
import type { BehaviorEvent, BehaviorEventType, Observation } from '../../core/experience/types.js';
import { BehaviorEventType as BET } from '../../core/experience/types.js';
import { BehaviorEventValidationError, BehaviorEventStorageError } from '../../core/experience/errors.js';
import { DefaultExperienceRuntimeConfig } from '../../core/experience/types.js';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { TraceCollector } from '../../core/trace/trace-collector.js';
import { createId } from '../../core/domain/identifiers.js';

// ─── Factory Helpers ─────────────────────────────────────────

function createTestEvent(overrides?: Partial<BehaviorEvent>): BehaviorEvent {
  return {
    id: crypto.randomUUID(),
    type: BET.FeatureUsed,
    userIdHash: crypto.randomUUID(),
    sessionId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    data: { feature: 'test-feature' },
    metadata: {},
    ...overrides,
  };
}

function createFixedUserEvent(userIdHash: string, overrides?: Partial<BehaviorEvent>): BehaviorEvent {
  return createTestEvent({ userIdHash, ...overrides });
}

function createSessionDurationEvent(userIdHash: string, sessionId: string, durationMs: number): BehaviorEvent {
  return createTestEvent({ userIdHash, sessionId, type: BET.SessionDuration, data: { durationMs } });
}

// ─── Tests ────────────────────────────────────────────────────

describe('BehaviorRuntime', () => {
  let runtime: BehaviorRuntime;
  let eventBus: InProcessEventBus;
  let trace: TraceCollector;

  beforeEach(() => {
    eventBus = new InProcessEventBus();
    trace = new TraceCollector();
    runtime = new BehaviorRuntime(DefaultExperienceRuntimeConfig, eventBus, trace);
  });

  // ─── Constructor ──────────────────────────────────────────────

  describe('constructor', () => {
    it('creates an instance with default config', () => {
      const rt = new BehaviorRuntime(DefaultExperienceRuntimeConfig);
      expect(rt).toBeDefined();
    });

    it('creates an instance with event bus only', () => {
      const rt = new BehaviorRuntime(DefaultExperienceRuntimeConfig, eventBus);
      expect(rt).toBeDefined();
    });

    it('creates an instance with trace collector only', () => {
      const rt = new BehaviorRuntime(DefaultExperienceRuntimeConfig, undefined, trace);
      expect(rt).toBeDefined();
    });

    it('creates an instance with all dependencies', () => {
      const rt = new BehaviorRuntime(DefaultExperienceRuntimeConfig, eventBus, trace);
      expect(rt).toBeDefined();
    });

    it('records initialization in trace', () => {
      const t = new TraceCollector();
      new BehaviorRuntime(DefaultExperienceRuntimeConfig, undefined, t);
      const entries = t.getEntries();
      expect(entries.length).toBeGreaterThanOrEqual(1);
      expect(entries[0].message).toContain('BehaviorRuntime initialized');
    });

    it('includes maxObservationsPerUser in init trace', () => {
      const t = new TraceCollector();
      new BehaviorRuntime(DefaultExperienceRuntimeConfig, undefined, t);
      const entry = t.getEntries()[0];
      expect(entry.data).toBeDefined();
      expect(entry.data!['maxObservationsPerUser']).toBe(10_000);
    });

    it('uses default TraceCollector when none provided', () => {
      const rt = new BehaviorRuntime(DefaultExperienceRuntimeConfig);
      expect(rt).toBeDefined();
    });

    it('accepts custom config with low maxObservationsPerUser', () => {
      const cfg = { ...DefaultExperienceRuntimeConfig, maxObservationsPerUser: 2 };
      const rt = new BehaviorRuntime(cfg);
      expect(rt).toBeDefined();
    });
  });

  // ─── recordEvent ─────────────────────────────────────────────

  describe('recordEvent', () => {
    it('stores a valid event', () => {
      const event = createTestEvent();
      runtime.recordEvent(event);
      const events = runtime.getEventsForUser(event.userIdHash);
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe(event.id);
    });

    it('stores multiple events for same user', () => {
      const userId = crypto.randomUUID();
      const e1 = createTestEvent({ userIdHash: userId });
      const e2 = createTestEvent({ userIdHash: userId });
      runtime.recordEvent(e1);
      runtime.recordEvent(e2);
      expect(runtime.getEventsForUser(userId)).toHaveLength(2);
    });

    it('stores events for different users separately', () => {
      const e1 = createTestEvent({ userIdHash: 'user1' });
      const e2 = createTestEvent({ userIdHash: 'user2' });
      runtime.recordEvent(e1);
      runtime.recordEvent(e2);
      expect(runtime.getEventsForUser('user1')).toHaveLength(1);
      expect(runtime.getEventsForUser('user2')).toHaveLength(1);
    });

    it('throws BehaviorEventValidationError when id is missing', () => {
      const event = createTestEvent({ id: undefined as unknown as BehaviorEvent['id'] });
      expect(() => runtime.recordEvent(event)).toThrow(BehaviorEventValidationError);
    });

    it('throws with correct message for missing id', () => {
      const event = createTestEvent({ id: undefined as unknown as BehaviorEvent['id'] });
      try {
        runtime.recordEvent(event);
        expect.unreachable('should have thrown');
      } catch (e) {
        expect((e as BehaviorEventValidationError).message).toContain('must have an id');
      }
    });

    it('throws BehaviorEventValidationError when userIdHash is empty', () => {
      const event = createTestEvent({ userIdHash: '' });
      expect(() => runtime.recordEvent(event)).toThrow(BehaviorEventValidationError);
    });

    it('throws BehaviorEventValidationError when userIdHash is not a string', () => {
      const event = createTestEvent({ userIdHash: 123 as unknown as string });
      expect(() => runtime.recordEvent(event)).toThrow(BehaviorEventValidationError);
    });

    it('throws BehaviorEventValidationError when sessionId is empty', () => {
      const event = createTestEvent({ sessionId: '' });
      expect(() => runtime.recordEvent(event)).toThrow(BehaviorEventValidationError);
    });

    it('throws BehaviorEventValidationError when sessionId is not a string', () => {
      const event = createTestEvent({ sessionId: null as unknown as string });
      expect(() => runtime.recordEvent(event)).toThrow(BehaviorEventValidationError);
    });

    it('throws BehaviorEventValidationError when timestamp is empty', () => {
      const event = createTestEvent({ timestamp: '' });
      expect(() => runtime.recordEvent(event)).toThrow(BehaviorEventValidationError);
    });

    it('throws BehaviorEventValidationError when timestamp is not a string', () => {
      const event = createTestEvent({ timestamp: 123 as unknown as string });
      expect(() => runtime.recordEvent(event)).toThrow(BehaviorEventValidationError);
    });

    it('throws BehaviorEventValidationError for unknown event type', () => {
      const event = createTestEvent({ type: 'UnknownType' as BehaviorEventType });
      expect(() => runtime.recordEvent(event)).toThrow(BehaviorEventValidationError);
    });

    it('throws with correct message for unknown event type', () => {
      const event = createTestEvent({ type: 'UnknownType' as BehaviorEventType });
      try {
        runtime.recordEvent(event);
        expect.unreachable('should have thrown');
      } catch (e) {
        expect((e as BehaviorEventValidationError).message).toContain('Unknown behavior event type');
      }
    });

    it('throws with error code EXP-BEH-001 for validation errors', () => {
      const event = createTestEvent({ userIdHash: '' });
      try {
        runtime.recordEvent(event);
        expect.unreachable('should have thrown');
      } catch (e) {
        expect((e as BehaviorEventValidationError).code).toBe('EXP-BEH-001');
      }
    });

    it('enforces maxObservationsPerUser limit', () => {
      const config = { ...DefaultExperienceRuntimeConfig, maxObservationsPerUser: 3 };
      const rt = new BehaviorRuntime(config, eventBus, trace);
      const userId = crypto.randomUUID();
      for (let i = 0; i < 3; i++) {
        rt.recordEvent(createTestEvent({ userIdHash: userId }));
      }
      expect(() => rt.recordEvent(createTestEvent({ userIdHash: userId }))).toThrow(BehaviorEventStorageError);
    });

    it('throws BehaviorEventStorageError with code EXP-BEH-002', () => {
      const config = { ...DefaultExperienceRuntimeConfig, maxObservationsPerUser: 1 };
      const rt = new BehaviorRuntime(config, eventBus, trace);
      const userId = crypto.randomUUID();
      rt.recordEvent(createTestEvent({ userIdHash: userId }));
      try {
        rt.recordEvent(createTestEvent({ userIdHash: userId }));
        expect.unreachable('should have thrown');
      } catch (e) {
        expect((e as BehaviorEventStorageError).code).toBe('EXP-BEH-002');
      }
    });

    it('does not enforce limit across different users', () => {
      const config = { ...DefaultExperienceRuntimeConfig, maxObservationsPerUser: 1 };
      const rt = new BehaviorRuntime(config, eventBus, trace);
      rt.recordEvent(createTestEvent({ userIdHash: 'user1' }));
      rt.recordEvent(createTestEvent({ userIdHash: 'user2' }));
      expect(rt.getEventsForUser('user1')).toHaveLength(1);
      expect(rt.getEventsForUser('user2')).toHaveLength(1);
    });

    it('records error in trace when limit is reached', () => {
      const config = { ...DefaultExperienceRuntimeConfig, maxObservationsPerUser: 1 };
      const rt = new BehaviorRuntime(config, eventBus, trace);
      const userId = crypto.randomUUID();
      rt.recordEvent(createTestEvent({ userIdHash: userId }));
      try {
        rt.recordEvent(createTestEvent({ userIdHash: userId }));
      } catch { /* expected */ }
      const errorEntries = trace.getEntries().filter(e => e.type === 'error');
      expect(errorEntries.length).toBe(1);
    });

    it('trace error includes code EXP-BEH-002 on limit', () => {
      const config = { ...DefaultExperienceRuntimeConfig, maxObservationsPerUser: 1 };
      const rt = new BehaviorRuntime(config, eventBus, trace);
      const userId = crypto.randomUUID();
      rt.recordEvent(createTestEvent({ userIdHash: userId }));
      try {
        rt.recordEvent(createTestEvent({ userIdHash: userId }));
      } catch { /* expected */ }
      const errorEntries = trace.getEntries().filter(e => e.type === 'error');
      expect(errorEntries[0].message).toContain('EXP-BEH-002');
    });

    it('trace error includes userIdHash on limit', () => {
      const config = { ...DefaultExperienceRuntimeConfig, maxObservationsPerUser: 1 };
      const rt = new BehaviorRuntime(config, eventBus, trace);
      const userId = crypto.randomUUID();
      rt.recordEvent(createTestEvent({ userIdHash: userId }));
      try {
        rt.recordEvent(createTestEvent({ userIdHash: userId }));
      } catch { /* expected */ }
      const errorEntries = trace.getEntries().filter(e => e.type === 'error');
      expect(errorEntries[0].data!['userIdHash']).toBe(userId);
    });

    it('stores events with all event types', () => {
      const userId = crypto.randomUUID();
      const types = [
        BET.FeatureUsed, BET.InteractionMode, BET.SessionDuration,
        BET.ActionRepetition, BET.TimeOfDayActivity, BET.NavigationPattern,
        BET.ContentConsumption, BET.ErrorEncountered, BET.FeedbackProvided, BET.ToolUsed,
      ];
      for (const type of types) {
        runtime.recordEvent(createTestEvent({ userIdHash: userId, type }));
      }
      expect(runtime.getEventsForUser(userId)).toHaveLength(types.length);
    });

    it('preserves event data field', () => {
      const data = { feature: 'code-completion', count: 42, active: true };
      const event = createTestEvent({ data });
      runtime.recordEvent(event);
      const stored = runtime.getEventsForUser(event.userIdHash)[0];
      expect(stored.data).toEqual(data);
    });

    it('preserves event metadata field', () => {
      const metadata = { source: 'cli', version: '2.0' };
      const event = createTestEvent({ metadata });
      runtime.recordEvent(event);
      const stored = runtime.getEventsForUser(event.userIdHash)[0];
      expect(stored.metadata).toEqual(metadata);
    });
  });

  // ─── recordObservation ───────────────────────────────────────

  describe('recordObservation', () => {
    it('creates an Observation from a BehaviorEvent', () => {
      const event = createTestEvent();
      const obs = runtime.recordObservation(event);
      expect(obs).toBeDefined();
      expect(obs.userIdHash).toBe(event.userIdHash);
      expect(obs.type).toBe(event.type);
      expect(obs.source).toBe('BehaviorRuntime');
      expect(obs.confidence).toBe(1.0);
    });

    it('observation value equals event data', () => {
      const data = { feature: 'autocomplete', count: 5 };
      const event = createTestEvent({ data });
      const obs = runtime.recordObservation(event);
      expect(obs.value).toEqual(data);
    });

    it('observation has a unique id each time', () => {
      const event = createTestEvent();
      const obs1 = runtime.recordObservation(event);
      const obs2 = runtime.recordObservation(event);
      expect(obs1.id).not.toBe(obs2.id);
    });

    it('observation has a timestamp', () => {
      const event = createTestEvent();
      const obs = runtime.recordObservation(event);
      expect(obs.timestamp).toBeTruthy();
    });

    it('publishes ObservationRecorded event', () => {
      const event = createTestEvent();
      runtime.recordObservation(event);
      const log = eventBus.getLog();
      const recorded = log.find(e => e.eventType === 'ObservationRecorded');
      expect(recorded).toBeDefined();
    });

    it('ObservationRecorded includes correct source', () => {
      const event = createTestEvent();
      runtime.recordObservation(event);
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'ObservationRecorded')!;
      const payload = envelope.payload as Record<string, unknown>;
      expect(payload['source']).toBe('BehaviorRuntime');
    });

    it('ObservationRecorded includes confidence', () => {
      const event = createTestEvent();
      runtime.recordObservation(event);
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'ObservationRecorded')!;
      const payload = envelope.payload as Record<string, unknown>;
      expect(payload['confidence']).toBe(1.0);
    });

    it('ObservationRecorded includes userIdHash', () => {
      const event = createTestEvent({ userIdHash: 'obs-user' });
      runtime.recordObservation(event);
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'ObservationRecorded')!;
      const payload = envelope.payload as Record<string, unknown>;
      expect(payload['userIdHash']).toBe('obs-user');
    });

    it('ObservationRecorded includes type', () => {
      const event = createTestEvent({ type: BET.ToolUsed });
      runtime.recordObservation(event);
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'ObservationRecorded')!;
      const payload = envelope.payload as Record<string, unknown>;
      expect(payload['type']).toBe(BET.ToolUsed);
    });

    it('records trace info for observation', () => {
      const t = new TraceCollector();
      const rt = new BehaviorRuntime(DefaultExperienceRuntimeConfig, eventBus, t);
      const event = createTestEvent();
      rt.recordObservation(event);
      const infoEntries = t.getEntries().filter(e => e.type === 'info');
      const obsTrace = infoEntries.find(e => e.message === 'Observation recorded from behavior event');
      expect(obsTrace).toBeDefined();
    });

    it('trace includes observationId', () => {
      const event = createTestEvent();
      const obs = runtime.recordObservation(event);
      const infoEntries = trace.getEntries().filter(e => e.type === 'info');
      const obsTrace = infoEntries.find(e => e.message === 'Observation recorded from behavior event');
      expect(obsTrace?.data?.['observationId']).toBe(obs.id);
    });

    it('trace includes behaviorEventId', () => {
      const event = createTestEvent();
      runtime.recordObservation(event);
      const infoEntries = trace.getEntries().filter(e => e.type === 'info');
      const obsTrace = infoEntries.find(e => e.message === 'Observation recorded from behavior event');
      expect(obsTrace?.data?.['behaviorEventId']).toBe(event.id);
    });

    it('stores observation per user', () => {
      const event = createTestEvent({ userIdHash: 'u1' });
      runtime.recordObservation(event);
      const infoEntries = trace.getEntries().filter(e => e.type === 'info');
      const obsTrace = infoEntries.find(e => e.message === 'Observation recorded from behavior event');
      expect(obsTrace?.data?.['userIdHash']).toBe('u1');
    });
  });

  // ─── getEventsForUser ───────────────────────────────────────

  describe('getEventsForUser', () => {
    it('returns empty array for user with no events', () => {
      const events = runtime.getEventsForUser(crypto.randomUUID());
      expect(events).toHaveLength(0);
    });

    it('returns only events for the specified user', () => {
      const userId = crypto.randomUUID();
      runtime.recordEvent(createTestEvent({ userIdHash: userId }));
      runtime.recordEvent(createTestEvent({ userIdHash: crypto.randomUUID() }));
      runtime.recordEvent(createTestEvent({ userIdHash: userId }));
      expect(runtime.getEventsForUser(userId)).toHaveLength(2);
    });

    it('returns events in insertion order', () => {
      const userId = crypto.randomUUID();
      const ids: string[] = [];
      for (let i = 0; i < 5; i++) {
        const event = createTestEvent({ userIdHash: userId });
        ids.push(event.id);
        runtime.recordEvent(event);
      }
      const events = runtime.getEventsForUser(userId);
      expect(events.map(e => e.id)).toEqual(ids);
    });

    it('returns events for a new user after querying unknown user', () => {
      runtime.getEventsForUser('unknown'); // should not throw
      const event = createTestEvent({ userIdHash: 'known' });
      runtime.recordEvent(event);
      expect(runtime.getEventsForUser('known')).toHaveLength(1);
    });
  });

  // ─── getEventsByType ────────────────────────────────────────

  describe('getEventsByType', () => {
    it('returns only events of specified type', () => {
      const userId = crypto.randomUUID();
      runtime.recordEvent(createTestEvent({ userIdHash: userId, type: BET.FeatureUsed }));
      runtime.recordEvent(createTestEvent({ userIdHash: userId, type: BET.SessionDuration }));
      runtime.recordEvent(createTestEvent({ userIdHash: userId, type: BET.FeatureUsed }));
      const featureEvents = runtime.getEventsByType(userId, BET.FeatureUsed);
      expect(featureEvents).toHaveLength(2);
    });

    it('returns empty array when no events of type exist', () => {
      const userId = crypto.randomUUID();
      runtime.recordEvent(createTestEvent({ userIdHash: userId, type: BET.FeatureUsed }));
      const sessionEvents = runtime.getEventsByType(userId, BET.SessionDuration);
      expect(sessionEvents).toHaveLength(0);
    });

    it('returns empty for user with no events', () => {
      const events = runtime.getEventsByType(crypto.randomUUID(), BET.FeatureUsed);
      expect(events).toHaveLength(0);
    });

    it('filters by SessionDuration type correctly', () => {
      const userId = crypto.randomUUID();
      runtime.recordEvent(createTestEvent({ userIdHash: userId, type: BET.SessionDuration, data: { durationMs: 5000 } }));
      runtime.recordEvent(createTestEvent({ userIdHash: userId, type: BET.FeatureUsed }));
      const events = runtime.getEventsByType(userId, BET.SessionDuration);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(BET.SessionDuration);
    });

    it('filters by ErrorEncountered type correctly', () => {
      const userId = crypto.randomUUID();
      runtime.recordEvent(createTestEvent({ userIdHash: userId, type: BET.ErrorEncountered }));
      runtime.recordEvent(createTestEvent({ userIdHash: userId, type: BET.FeedbackProvided }));
      const events = runtime.getEventsByType(userId, BET.ErrorEncountered);
      expect(events).toHaveLength(1);
    });

    it('does not cross-contaminate between users', () => {
      runtime.recordEvent(createTestEvent({ userIdHash: 'u1', type: BET.FeatureUsed }));
      runtime.recordEvent(createTestEvent({ userIdHash: 'u2', type: BET.FeatureUsed }));
      runtime.recordEvent(createTestEvent({ userIdHash: 'u1', type: BET.ToolUsed }));
      expect(runtime.getEventsByType('u1', BET.FeatureUsed)).toHaveLength(1);
      expect(runtime.getEventsByType('u2', BET.FeatureUsed)).toHaveLength(1);
    });

    it('returns all events when all are same type', () => {
      const userId = crypto.randomUUID();
      for (let i = 0; i < 5; i++) {
        runtime.recordEvent(createTestEvent({ userIdHash: userId, type: BET.FeatureUsed }));
      }
      expect(runtime.getEventsByType(userId, BET.FeatureUsed)).toHaveLength(5);
    });
  });

  // ─── getSessionDuration ──────────────────────────────────────

  describe('getSessionDuration', () => {
    it('returns null when no session duration events exist', () => {
      const userId = crypto.randomUUID();
      const sessionId = crypto.randomUUID();
      expect(runtime.getSessionDuration(userId, sessionId)).toBeNull();
    });

    it('returns duration from a single SessionDuration event', () => {
      const userId = crypto.randomUUID();
      const sessionId = crypto.randomUUID();
      runtime.recordEvent(createSessionDurationEvent(userId, sessionId, 5000));
      expect(runtime.getSessionDuration(userId, sessionId)).toBe(5000);
    });

    it('sums multiple SessionDuration events for same session', () => {
      const userId = crypto.randomUUID();
      const sessionId = crypto.randomUUID();
      runtime.recordEvent(createSessionDurationEvent(userId, sessionId, 3000));
      runtime.recordEvent(createSessionDurationEvent(userId, sessionId, 2000));
      expect(runtime.getSessionDuration(userId, sessionId)).toBe(5000);
    });

    it('returns null when durationMs is 0', () => {
      const userId = crypto.randomUUID();
      const sessionId = crypto.randomUUID();
      runtime.recordEvent(createSessionDurationEvent(userId, sessionId, 0));
      expect(runtime.getSessionDuration(userId, sessionId)).toBeNull();
    });

    it('ignores events from different sessions', () => {
      const userId = crypto.randomUUID();
      const sessionId1 = crypto.randomUUID();
      const sessionId2 = crypto.randomUUID();
      runtime.recordEvent(createSessionDurationEvent(userId, sessionId1, 4000));
      runtime.recordEvent(createSessionDurationEvent(userId, sessionId2, 6000));
      expect(runtime.getSessionDuration(userId, sessionId1)).toBe(4000);
      expect(runtime.getSessionDuration(userId, sessionId2)).toBe(6000);
    });

    it('ignores non-durationMs data fields', () => {
      const userId = crypto.randomUUID();
      const sessionId = crypto.randomUUID();
      runtime.recordEvent(createTestEvent({
        userIdHash: userId, sessionId, type: BET.SessionDuration, data: { otherField: 5000 },
      }));
      expect(runtime.getSessionDuration(userId, sessionId)).toBeNull();
    });

    it('ignores non-SessionDuration events for same session', () => {
      const userId = crypto.randomUUID();
      const sessionId = crypto.randomUUID();
      runtime.recordEvent(createTestEvent({
        userIdHash: userId, sessionId, type: BET.FeatureUsed, data: { durationMs: 99999 },
      }));
      expect(runtime.getSessionDuration(userId, sessionId)).toBeNull();
    });

    it('returns null for unknown user', () => {
      expect(runtime.getSessionDuration('no-user', crypto.randomUUID())).toBeNull();
    });

    it('returns null for unknown session with known user', () => {
      const userId = crypto.randomUUID();
      expect(runtime.getSessionDuration(userId, crypto.randomUUID())).toBeNull();
    });

    it('handles large duration values', () => {
      const userId = crypto.randomUUID();
      const sessionId = crypto.randomUUID();
      runtime.recordEvent(createSessionDurationEvent(userId, sessionId, Number.MAX_SAFE_INTEGER));
      expect(runtime.getSessionDuration(userId, sessionId)).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  // ─── getFeatureUsageFrequency ────────────────────────────────

  describe('getFeatureUsageFrequency', () => {
    it('returns 0 when no events exist', () => {
      expect(runtime.getFeatureUsageFrequency('user1', 'feature-a')).toBe(0);
    });

    it('counts FeatureUsed events for a specific feature', () => {
      const userId = crypto.randomUUID();
      runtime.recordEvent(createTestEvent({ userIdHash: userId, type: BET.FeatureUsed, data: { feature: 'search' } }));
      runtime.recordEvent(createTestEvent({ userIdHash: userId, type: BET.FeatureUsed, data: { feature: 'search' } }));
      runtime.recordEvent(createTestEvent({ userIdHash: userId, type: BET.FeatureUsed, data: { feature: 'export' } }));
      expect(runtime.getFeatureUsageFrequency(userId, 'search')).toBe(2);
    });

    it('returns 0 for feature not used', () => {
      const userId = crypto.randomUUID();
      runtime.recordEvent(createTestEvent({ userIdHash: userId, type: BET.FeatureUsed, data: { feature: 'search' } }));
      expect(runtime.getFeatureUsageFrequency(userId, 'export')).toBe(0);
    });

    it('does not count non-FeatureUsed events', () => {
      const userId = crypto.randomUUID();
      runtime.recordEvent(createTestEvent({ userIdHash: userId, type: BET.ToolUsed, data: { feature: 'search' } }));
      expect(runtime.getFeatureUsageFrequency(userId, 'search')).toBe(0);
    });

    it('does not count events from other users', () => {
      const userId1 = crypto.randomUUID();
      const userId2 = crypto.randomUUID();
      runtime.recordEvent(createTestEvent({ userIdHash: userId1, type: BET.FeatureUsed, data: { feature: 'search' } }));
      runtime.recordEvent(createTestEvent({ userIdHash: userId2, type: BET.FeatureUsed, data: { feature: 'search' } }));
      expect(runtime.getFeatureUsageFrequency(userId1, 'search')).toBe(1);
    });

    it('returns 0 for unknown user', () => {
      expect(runtime.getFeatureUsageFrequency('no-user', 'any-feature')).toBe(0);
    });

    it('counts many features correctly', () => {
      const userId = crypto.randomUUID();
      for (let i = 0; i < 10; i++) {
        runtime.recordEvent(createTestEvent({ userIdHash: userId, type: BET.FeatureUsed, data: { feature: 'auto' } }));
      }
      expect(runtime.getFeatureUsageFrequency(userId, 'auto')).toBe(10);
    });
  });

  // ─── getInteractionSummary ────────────────────────────────────

  describe('getInteractionSummary', () => {
    it('returns zero summary for user with no events', () => {
      const summary = runtime.getInteractionSummary(crypto.randomUUID());
      expect(summary.totalEvents).toBe(0);
      expect(summary.sessions).toBe(0);
      expect(summary.avgDuration).toBe(0);
    });

    it('counts total events', () => {
      const userId = crypto.randomUUID();
      runtime.recordEvent(createTestEvent({ userIdHash: userId }));
      runtime.recordEvent(createTestEvent({ userIdHash: userId }));
      runtime.recordEvent(createTestEvent({ userIdHash: userId }));
      const summary = runtime.getInteractionSummary(userId);
      expect(summary.totalEvents).toBe(3);
    });

    it('counts unique sessions', () => {
      const userId = crypto.randomUUID();
      runtime.recordEvent(createTestEvent({ userIdHash: userId, sessionId: 's1' }));
      runtime.recordEvent(createTestEvent({ userIdHash: userId, sessionId: 's1' }));
      runtime.recordEvent(createTestEvent({ userIdHash: userId, sessionId: 's2' }));
      const summary = runtime.getInteractionSummary(userId);
      expect(summary.sessions).toBe(2);
    });

    it('calculates average session duration', () => {
      const userId = crypto.randomUUID();
      const sessionId = crypto.randomUUID();
      runtime.recordEvent(createSessionDurationEvent(userId, sessionId, 4000));
      runtime.recordEvent(createSessionDurationEvent(userId, sessionId, 6000));
      const summary = runtime.getInteractionSummary(userId);
      expect(summary.avgDuration).toBe(5000);
    });

    it('avgDuration is 0 when no duration events', () => {
      const userId = crypto.randomUUID();
      runtime.recordEvent(createTestEvent({ userIdHash: userId, type: BET.FeatureUsed }));
      const summary = runtime.getInteractionSummary(userId);
      expect(summary.avgDuration).toBe(0);
    });

    it('aggregates across multiple sessions', () => {
      const userId = crypto.randomUUID();
      runtime.recordEvent(createSessionDurationEvent(userId, 's1', 2000));
      runtime.recordEvent(createSessionDurationEvent(userId, 's2', 4000));
      runtime.recordEvent(createTestEvent({ userIdHash: userId, sessionId: 's1', type: BET.FeatureUsed }));
      const summary = runtime.getInteractionSummary(userId);
      expect(summary.totalEvents).toBe(3);
      expect(summary.sessions).toBe(2);
      expect(summary.avgDuration).toBe(3000);
    });

    it('counts single session correctly', () => {
      const userId = crypto.randomUUID();
      runtime.recordEvent(createTestEvent({ userIdHash: userId, sessionId: 'only' }));
      const summary = runtime.getInteractionSummary(userId);
      expect(summary.sessions).toBe(1);
    });

    it('ignores zero-duration events in avgDuration calculation', () => {
      const userId = crypto.randomUUID();
      const sessionId = crypto.randomUUID();
      runtime.recordEvent(createSessionDurationEvent(userId, sessionId, 0)); // should be ignored
      runtime.recordEvent(createSessionDurationEvent(userId, sessionId, 1000));
      const summary = runtime.getInteractionSummary(userId);
      expect(summary.avgDuration).toBe(1000);
    });
  });

  // ─── Event Bus Integration ───────────────────────────────────

  describe('event bus integration', () => {
    it('does not publish when no eventBus is provided', () => {
      const rt = new BehaviorRuntime(DefaultExperienceRuntimeConfig);
      const event = createTestEvent();
      rt.recordEvent(event);
      expect(true).toBe(true); // No error thrown
    });

    it('publishes BehaviorEventCollected event on recordEvent', () => {
      const event = createTestEvent();
      runtime.recordEvent(event);
      const log = eventBus.getLog();
      const collected = log.find(e => e.eventType === 'BehaviorEventCollected');
      expect(collected).toBeDefined();
    });

    it('BehaviorEventCollected has correct payload fields', () => {
      const event = createTestEvent({ userIdHash: 'u1', sessionId: 's1' });
      runtime.recordEvent(event);
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'BehaviorEventCollected')!;
      const payload = envelope.payload as Record<string, unknown>;
      expect(payload['userIdHash']).toBe('u1');
      expect(payload['sessionId']).toBe('s1');
      expect(payload['eventType']).toBe(BET.FeatureUsed);
    });

    it('increments event bus sequence for each published event', () => {
      const event = createTestEvent();
      runtime.recordEvent(event);
      runtime.recordObservation(event);
      const log = eventBus.getLog();
      expect(log[0].sequence).toBe(1);
      expect(log[1].sequence).toBe(2);
    });

    it('event payload includes userIdHash', () => {
      const event = createTestEvent({ userIdHash: 'test-user-agg' });
      runtime.recordEvent(event);
      const log = eventBus.getLog();
      const payload = log[0].payload as Record<string, unknown>;
      expect(payload['userIdHash']).toBe('test-user-agg');
    });

    it('event has incrementing sequence numbers', () => {
      const e1 = createTestEvent();
      const e2 = createTestEvent();
      runtime.recordEvent(e1);
      runtime.recordEvent(e2);
      const log = eventBus.getLog();
      expect(log[0].sequence).toBe(1);
      expect(log[1].sequence).toBe(2);
    });

    it('sets version to 1.0.0', () => {
      const event = createTestEvent();
      runtime.recordEvent(event);
      const log = eventBus.getLog();
      expect(log[0].version).toBe('1.0.0');
    });

    it('sets classification to info', () => {
      const event = createTestEvent();
      runtime.recordEvent(event);
      const log = eventBus.getLog();
      expect(log[0].classification).toBe('info');
    });

    it('publishes both event types in correct order', () => {
      const event = createTestEvent();
      runtime.recordEvent(event);
      runtime.recordObservation(event);
      const log = eventBus.getLog();
      expect(log[0].eventType).toBe('BehaviorEventCollected');
      expect(log[1].eventType).toBe('ObservationRecorded');
    });
  });

  // ─── TraceCollector Integration ──────────────────────────────

  describe('trace collector integration', () => {
    it('records trace entry for each event recorded', () => {
      const event = createTestEvent();
      runtime.recordEvent(event);
      runtime.recordEvent(createTestEvent());
      expect(trace.length).toBeGreaterThanOrEqual(3); // init + 2 recorded
    });

    it('includes eventId in trace data', () => {
      const event = createTestEvent();
      runtime.recordEvent(event);
      const infoEntries = trace.getEntries().filter(e => e.type === 'info');
      const recorded = infoEntries.find(e => e.message === 'Behavior event recorded');
      expect(recorded?.data?.['eventId']).toBe(event.id);
    });

    it('includes eventType in trace data', () => {
      const event = createTestEvent({ type: BET.ToolUsed });
      runtime.recordEvent(event);
      const infoEntries = trace.getEntries().filter(e => e.type === 'info');
      const recorded = infoEntries.find(e => e.message === 'Behavior event recorded');
      expect(recorded?.data?.['eventType']).toBe(BET.ToolUsed);
    });

    it('includes sessionId in trace data', () => {
      const event = createTestEvent({ sessionId: 'trace-session' });
      runtime.recordEvent(event);
      const infoEntries = trace.getEntries().filter(e => e.type === 'info');
      const recorded = infoEntries.find(e => e.message === 'Behavior event recorded');
      expect(recorded?.data?.['sessionId']).toBe('trace-session');
    });

    it('includes userIdHash in trace data', () => {
      const event = createTestEvent({ userIdHash: 'trace-user' });
      runtime.recordEvent(event);
      const infoEntries = trace.getEntries().filter(e => e.type === 'info');
      const recorded = infoEntries.find(e => e.message === 'Behavior event recorded');
      expect(recorded?.data?.['userIdHash']).toBe('trace-user');
    });
  });

  // ─── All BehaviorEventType Values ─────────────────────────────

  describe('all BehaviorEventType values', () => {
    const types: BehaviorEventType[] = [
      BET.FeatureUsed, BET.InteractionMode, BET.SessionDuration,
      BET.ActionRepetition, BET.TimeOfDayActivity, BET.NavigationPattern,
      BET.ContentConsumption, BET.ErrorEncountered, BET.FeedbackProvided, BET.ToolUsed,
    ];

    for (const type of types) {
      it(`accepts valid type ${type}`, () => {
        const event = createTestEvent({ type });
        expect(() => runtime.recordEvent(event)).not.toThrow();
      });
    }
  });

  // ─── Edge Cases ──────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles event with empty data object', () => {
      const event = createTestEvent({ data: {} });
      runtime.recordEvent(event);
      expect(runtime.getEventsForUser(event.userIdHash)).toHaveLength(1);
    });

    it('handles event with empty metadata object', () => {
      const event = createTestEvent({ metadata: {} });
      runtime.recordEvent(event);
      expect(runtime.getEventsForUser(event.userIdHash)).toHaveLength(1);
    });

    it('handles event with complex nested data', () => {
      const data = { nested: { deeply: { value: true } }, arr: [1, 2, 3] };
      const event = createTestEvent({ data });
      runtime.recordEvent(event);
      const stored = runtime.getEventsForUser(event.userIdHash)[0];
      expect(stored.data).toEqual(data);
    });

    it('handles many users simultaneously', () => {
      const users = Array.from({ length: 50 }, () => crypto.randomUUID());
      for (const userId of users) {
        runtime.recordEvent(createTestEvent({ userIdHash: userId }));
      }
      for (const userId of users) {
        expect(runtime.getEventsForUser(userId)).toHaveLength(1);
      }
    });

    it('getEventsByType returns empty for unknown user', () => {
      expect(runtime.getEventsByType('no-user', BET.FeatureUsed)).toHaveLength(0);
    });

    it('getFeatureUsageFrequency handles feature name with special chars', () => {
      const userId = crypto.randomUUID();
      const featureName = 'feat/with.special-chars_123';
      runtime.recordEvent(createTestEvent({ userIdHash: userId, type: BET.FeatureUsed, data: { feature: featureName } }));
      expect(runtime.getFeatureUsageFrequency(userId, featureName)).toBe(1);
    });

    it('validation stops at first error', () => {
      const event = createTestEvent({ id: undefined as unknown as BehaviorEvent['id'], userIdHash: '' });
      expect(() => runtime.recordEvent(event)).toThrow(BehaviorEventValidationError);
      // Should throw about id first (checked first in validateEvent)
      try {
        runtime.recordEvent(event);
        expect.unreachable('should have thrown');
      } catch (e) {
        expect((e as BehaviorEventValidationError).message).toContain('id');
      }
    });

    it('does not store event when validation fails', () => {
      const event = createTestEvent({ userIdHash: '' });
      try { runtime.recordEvent(event); } catch { /* expected */ }
      expect(runtime.getEventsForUser('')).toHaveLength(0);
    });

    it('does not store event when storage limit is reached', () => {
      const config = { ...DefaultExperienceRuntimeConfig, maxObservationsPerUser: 2 };
      const rt = new BehaviorRuntime(config, eventBus, trace);
      const userId = crypto.randomUUID();
      rt.recordEvent(createTestEvent({ userIdHash: userId }));
      rt.recordEvent(createTestEvent({ userIdHash: userId }));
      try { rt.recordEvent(createTestEvent({ userIdHash: userId })); } catch { /* expected */ }
      expect(rt.getEventsForUser(userId)).toHaveLength(2);
    });
  });
});
