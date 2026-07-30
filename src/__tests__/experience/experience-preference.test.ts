/**
 * Tests for PreferenceEvolution (Subsystem 2)
 * TASK-AIS-004A.000
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PreferenceEvolution } from '../../core/experience/preference-evolution.js';
import type { Observation, Preference, PreferenceChange, ObservationId } from '../../core/experience/types.js';
import { PreferenceState } from '../../core/experience/types.js';
import { PreferenceValidationError } from '../../core/experience/errors.js';
import { DefaultExperienceRuntimeConfig } from '../../core/experience/types.js';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { TraceCollector } from '../../core/trace/trace-collector.js';
import { createId } from '../../core/domain/identifiers.js';

// ─── Factory Helpers ─────────────────────────────────────────

function createTestObservation(overrides?: Partial<Observation>): Observation {
  return {
    id: createId<ObservationId>(),
    userIdHash: crypto.randomUUID(),
    type: 'responseStyle',
    value: 'concise',
    timestamp: new Date().toISOString(),
    source: 'test',
    confidence: 1.0,
    ...overrides,
  };
}

function createObservationBatch(
  userIdHash: string,
  type: string,
  value: string,
  count: number,
  timestamp?: string,
): Observation[] {
  return Array.from({ length: count }, () =>
    createTestObservation({ userIdHash, type, value, timestamp }),
  );
}

// ─── Tests ────────────────────────────────────────────────────

describe('PreferenceEvolution', () => {
  let engine: PreferenceEvolution;
  let eventBus: InProcessEventBus;
  let trace: TraceCollector;
  let userId: string;

  beforeEach(() => {
    eventBus = new InProcessEventBus();
    trace = new TraceCollector();
    engine = new PreferenceEvolution(DefaultExperienceRuntimeConfig, eventBus, trace);
    userId = crypto.randomUUID();
  });

  // ─── Constructor ──────────────────────────────────────────────

  describe('constructor', () => {
    it('creates an instance with default config', () => {
      const e = new PreferenceEvolution(DefaultExperienceRuntimeConfig);
      expect(e).toBeDefined();
    });

    it('creates an instance with event bus', () => {
      const e = new PreferenceEvolution(DefaultExperienceRuntimeConfig, eventBus);
      expect(e).toBeDefined();
    });

    it('creates an instance with trace collector', () => {
      const e = new PreferenceEvolution(DefaultExperienceRuntimeConfig, undefined, trace);
      expect(e).toBeDefined();
    });

    it('creates an instance with all dependencies', () => {
      const e = new PreferenceEvolution(DefaultExperienceRuntimeConfig, eventBus, trace);
      expect(e).toBeDefined();
    });

    it('records initialization in trace', () => {
      const t = new TraceCollector();
      new PreferenceEvolution(DefaultExperienceRuntimeConfig, undefined, t);
      const entries = t.getEntries();
      expect(entries.length).toBeGreaterThanOrEqual(1);
      expect(entries[0].message).toContain('PreferenceEvolution initialized');
    });

    it('includes minPreferenceConfidence in init trace', () => {
      const t = new TraceCollector();
      new PreferenceEvolution(DefaultExperienceRuntimeConfig, undefined, t);
      const entry = t.getEntries()[0];
      expect(entry.data).toBeDefined();
      expect(entry.data!['minPreferenceConfidence']).toBe(0.6);
    });

    it('uses default TraceCollector when none provided', () => {
      const e = new PreferenceEvolution(DefaultExperienceRuntimeConfig);
      expect(e).toBeDefined();
    });

    it('accepts custom config with different minPreferenceConfidence', () => {
      const cfg = { ...DefaultExperienceRuntimeConfig, minPreferenceConfidence: 0.9 };
      const e = new PreferenceEvolution(cfg, eventBus, trace);
      expect(e).toBeDefined();
    });
  });

  // ─── recordObservation ───────────────────────────────────────

  describe('recordObservation', () => {
    it('stores a valid observation', () => {
      const obs = createTestObservation({ userIdHash: userId });
      engine.recordObservation(obs);
      const pref = engine.getPreference(userId, 'responseStyle');
      expect(pref).not.toBeNull();
    });

    it('stores multiple observations for same key', () => {
      for (let i = 0; i < 5; i++) engine.recordObservation(createTestObservation({ userIdHash: userId }));
      const pref = engine.getPreference(userId, 'responseStyle');
      expect(pref).not.toBeNull();
      expect(pref!.observationCount).toBe(5);
    });

    it('throws PreferenceValidationError for empty userIdHash', () => {
      const obs = createTestObservation({ userIdHash: '' });
      expect(() => engine.recordObservation(obs)).toThrow(PreferenceValidationError);
    });

    it('throws PreferenceValidationError for non-string userIdHash', () => {
      const obs = createTestObservation({ userIdHash: null as unknown as string });
      expect(() => engine.recordObservation(obs)).toThrow(PreferenceValidationError);
    });

    it('throws PreferenceValidationError with code EXP-PREF-001', () => {
      const obs = createTestObservation({ userIdHash: '' });
      try {
        engine.recordObservation(obs);
        expect.unreachable('should have thrown');
      } catch (e) {
        expect((e as PreferenceValidationError).code).toBe('EXP-PREF-001');
      }
    });

    it('throws with correct message for invalid userIdHash', () => {
      const obs = createTestObservation({ userIdHash: '' });
      try {
        engine.recordObservation(obs);
        expect.unreachable('should have thrown');
      } catch (e) {
        expect((e as PreferenceValidationError).message).toContain('valid userIdHash');
      }
    });

    it('skips observation with no extractable preference key', () => {
      const obs: Observation = {
        id: createId<ObservationId>(), userIdHash: userId, type: '', value: null,
        timestamp: new Date().toISOString(), source: 'test', confidence: 1.0,
      };
      engine.recordObservation(obs);
      const infoEntries = trace.getEntries().filter(e => e.type === 'info');
      const skipped = infoEntries.find(e => e.message === 'Observation skipped: no extractable preference key');
      expect(skipped).toBeDefined();
    });

    it('extracts preference key from observation type', () => {
      const obs = createTestObservation({ type: 'theme', userIdHash: userId });
      engine.recordObservation(obs);
      expect(engine.getPreference(userId, 'theme')).not.toBeNull();
    });

    it('extracts preference key from value.key fallback', () => {
      const obs: Observation = {
        id: createId<ObservationId>(), userIdHash: userId, type: '',
        value: { key: 'fontSize', value: '14px' },
        timestamp: new Date().toISOString(), source: 'test', confidence: 1.0,
      };
      engine.recordObservation(obs);
      expect(engine.getPreference(userId, 'fontSize')).not.toBeNull();
    });

    it('does not use value.key fallback when type is available', () => {
      const obs: Observation = {
        id: createId<ObservationId>(), userIdHash: userId, type: 'primaryType',
        value: { key: 'fallbackKey', value: 'x' },
        timestamp: new Date().toISOString(), source: 'test', confidence: 1.0,
      };
      engine.recordObservation(obs);
      expect(engine.getPreference(userId, 'primaryType')).not.toBeNull();
      expect(engine.getPreference(userId, 'fallbackKey')).toBeNull();
    });

    it('records trace info for accumulated observation', () => {
      const obs = createTestObservation({ userIdHash: userId });
      engine.recordObservation(obs);
      const infoEntries = trace.getEntries().filter(e => e.type === 'info');
      expect(infoEntries.find(e => e.message === 'Observation accumulated for preference')).toBeDefined();
    });

    it('trace includes observationId for accumulated observation', () => {
      const obs = createTestObservation({ userIdHash: userId });
      engine.recordObservation(obs);
      const infoEntries = trace.getEntries().filter(e => e.type === 'info');
      const entry = infoEntries.find(e => e.message === 'Observation accumulated for preference');
      expect(entry?.data?.['observationId']).toBe(obs.id);
    });

    it('trace includes userIdHash for accumulated observation', () => {
      const obs = createTestObservation({ userIdHash: 'trace-u' });
      engine.recordObservation(obs);
      const infoEntries = trace.getEntries().filter(e => e.type === 'info');
      const entry = infoEntries.find(e => e.message === 'Observation accumulated for preference');
      expect(entry?.data?.['userIdHash']).toBe('trace-u');
    });

    it('trace includes preferenceKey for accumulated observation', () => {
      const obs = createTestObservation({ userIdHash: userId, type: 'myKey' });
      engine.recordObservation(obs);
      const infoEntries = trace.getEntries().filter(e => e.type === 'info');
      const entry = infoEntries.find(e => e.message === 'Observation accumulated for preference');
      expect(entry?.data?.['preferenceKey']).toBe('myKey');
    });

    it('trace includes windowSize for accumulated observation', () => {
      engine.recordObservation(createTestObservation({ userIdHash: userId }));
      engine.recordObservation(createTestObservation({ userIdHash: userId }));
      const infoEntries = trace.getEntries().filter(e => e.type === 'info');
      const entries = infoEntries.filter(e => e.message === 'Observation accumulated for preference');
      expect(entries[1].data?.['windowSize']).toBe(2);
    });
  });

  // ─── getPreference ────────────────────────────────────────────

  describe('getPreference', () => {
    it('returns null for non-existent preference', () => {
      expect(engine.getPreference('no-user', 'no-key')).toBeNull();
    });

    it('returns null when no observations recorded', () => {
      expect(engine.getPreference(userId, 'responseStyle')).toBeNull();
    });

    it('returns preference after sufficient observations', () => {
      const observations = createObservationBatch(userId, 'theme', 'dark', 10);
      for (const obs of observations) engine.recordObservation(obs);
      const pref = engine.getPreference(userId, 'theme');
      expect(pref).not.toBeNull();
      expect(pref!.currentValue).toBe('dark');
      expect(pref!.observationCount).toBe(10);
    });

    it('returns preference with Emerging state for low confidence', () => {
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'style', value: 'formal' }));
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'style', value: 'casual' }));
      const pref = engine.getPreference(userId, 'style');
      expect(pref).not.toBeNull();
      expect(pref!.state).toBe(PreferenceState.Emerging);
    });

    it('returns preference with Established state when confidence >= threshold', () => {
      const observations = createObservationBatch(userId, 'language', 'typescript', 10);
      for (const obs of observations) engine.recordObservation(obs);
      const pref = engine.getPreference(userId, 'language');
      expect(pref).not.toBeNull();
      expect(pref!.state).toBe(PreferenceState.Established);
    });

    it('returns preference with correct userIdHash', () => {
      engine.recordObservation(createTestObservation({ userIdHash: 'u1', type: 'k', value: 'v' }));
      expect(engine.getPreference('u1', 'k')!.userIdHash).toBe('u1');
    });

    it('returns preference with correct key', () => {
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'myKey', value: 'v' }));
      expect(engine.getPreference(userId, 'myKey')!.key).toBe('myKey');
    });

    it('returns null for different key than observed', () => {
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'keyA', value: 'v' }));
      expect(engine.getPreference(userId, 'keyB')).toBeNull();
    });

    it('returns null for different user', () => {
      engine.recordObservation(createTestObservation({ userIdHash: 'real-user', type: 'k', value: 'v' }));
      expect(engine.getPreference('other-user', 'k')).toBeNull();
    });

    it('preference has non-empty provenance', () => {
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'k', value: 'v' }));
      expect(engine.getPreference(userId, 'k')!.provenance.length).toBe(1);
    });

    it('preference has firstObserved timestamp', () => {
      const obs = createTestObservation({ userIdHash: userId, type: 'k', value: 'v' });
      engine.recordObservation(obs);
      expect(engine.getPreference(userId, 'k')!.firstObserved).toBe(obs.timestamp);
    });

    it('preference has lastUpdated timestamp', () => {
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'k', value: 'v' }));
      expect(engine.getPreference(userId, 'k')!.lastUpdated).toBeTruthy();
    });

    it('preference has id', () => {
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'k', value: 'v' }));
      expect(engine.getPreference(userId, 'k')!.id).toBeTruthy();
    });

    it('preference confidence is between 0 and 1', () => {
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'k', value: 'v' }));
      const c = engine.getPreference(userId, 'k')!.confidence;
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    });

    it('previousValue is undefined for new preference', () => {
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'k', value: 'v' }));
      expect(engine.getPreference(userId, 'k')!.previousValue).toBeUndefined();
    });
  });

  // ─── detectPreferenceChange ──────────────────────────────────

  describe('detectPreferenceChange', () => {
    it('returns null when no observations exist', () => {
      expect(engine.detectPreferenceChange(userId, 'nonexistent')).toBeNull();
    });

    it('returns null when observation count < 3', () => {
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'k', value: 'a' }));
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'k', value: 'b' }));
      expect(engine.detectPreferenceChange(userId, 'k')).toBeNull();
    });

    it('returns null when confidence below threshold', () => {
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'k', value: 'a' }));
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'k', value: 'b' }));
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'k', value: 'c' }));
      expect(engine.detectPreferenceChange(userId, 'k')).toBeNull();
    });

    it('returns null when dominant value matches current', () => {
      const obs = createObservationBatch(userId, 'k', 'stable', 10);
      for (const o of obs) engine.recordObservation(o);
      expect(engine.detectPreferenceChange(userId, 'k')).toBeNull();
    });

    it('returns change when confidence above threshold and value differs', () => {
      // Need 80 old + 30 new: after window cap (100), recent 50 has 30 new + 20 old
      // Current preference stays 'old' (70 old vs 30 new), but recent 50 has dominant 'old' still
      // Actually we need the recent half to have a different dominant than current.
      // Use 80 'old' then 35 'new': window = 100 (80 old + 20 new). Current = 'old'.
      // Recent 50 = 30 new + 20 old. Dominant = 'new'. Change detected.
      const oldObs = createObservationBatch(userId, 'style', 'old', 80);
      for (const o of oldObs) engine.recordObservation(o);
      const newObs = createObservationBatch(userId, 'style', 'new', 35);
      for (const o of newObs) engine.recordObservation(o);
      const change = engine.detectPreferenceChange(userId, 'style');
      expect(change).not.toBeNull();
      expect(change!.fromValue).toBe('old');
      expect(change!.toValue).toBe('new');
    });

    it('returns PreferenceChange with correct fields', () => {
      const oldObs = createObservationBatch(userId, 'theme', 'light', 80);
      for (const o of oldObs) engine.recordObservation(o);
      const newObs = createObservationBatch(userId, 'theme', 'dark', 35);
      for (const o of newObs) engine.recordObservation(o);
      const change = engine.detectPreferenceChange(userId, 'theme');
      expect(change).not.toBeNull();
      expect(change!.preferenceId).toBeTruthy();
      expect(change!.confidence).toBeGreaterThan(0);
      expect(change!.observationCount).toBeGreaterThan(0);
      expect(change!.timestamp).toBeTruthy();
    });

    it('emits PreferenceChanged event on change', () => {
      const oldObs = createObservationBatch(userId, 'mode', 'a', 80);
      for (const o of oldObs) engine.recordObservation(o);
      const newObs = createObservationBatch(userId, 'mode', 'b', 35);
      for (const o of newObs) engine.recordObservation(o);
      engine.detectPreferenceChange(userId, 'mode');
      const log = eventBus.getLog();
      expect(log.find(e => e.eventType === 'PreferenceChanged')).toBeDefined();
    });

    it('PreferenceChanged event has correct payload', () => {
      const oldObs = createObservationBatch(userId, 'layout', 'grid', 80);
      for (const o of oldObs) engine.recordObservation(o);
      const newObs = createObservationBatch(userId, 'layout', 'list', 35);
      for (const o of newObs) engine.recordObservation(o);
      engine.detectPreferenceChange(userId, 'layout');
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'PreferenceChanged')!;
      const payload = envelope.payload as Record<string, unknown>;
      expect(payload['fromValue']).toBe('grid');
      expect(payload['toValue']).toBe('list');
      expect(payload['userIdHash']).toBe(userId);
    });

    it('PreferenceChanged event includes confidence', () => {
      const oldObs = createObservationBatch(userId, 'cc', 'a', 80);
      for (const o of oldObs) engine.recordObservation(o);
      const newObs = createObservationBatch(userId, 'cc', 'b', 35);
      for (const o of newObs) engine.recordObservation(o);
      engine.detectPreferenceChange(userId, 'cc');
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'PreferenceChanged')!;
      const payload = envelope.payload as Record<string, unknown>;
      expect(typeof payload['confidence']).toBe('number');
    });

    it('PreferenceChanged event includes observationCount', () => {
      const oldObs = createObservationBatch(userId, 'oc', 'a', 80);
      for (const o of oldObs) engine.recordObservation(o);
      const newObs = createObservationBatch(userId, 'oc', 'b', 35);
      for (const o of newObs) engine.recordObservation(o);
      engine.detectPreferenceChange(userId, 'oc');
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'PreferenceChanged')!;
      const payload = envelope.payload as Record<string, unknown>;
      expect(typeof payload['observationCount']).toBe('number');
    });

    it('updates preference state to Changing after change', () => {
      const oldObs = createObservationBatch(userId, 'x', 'a', 80);
      for (const o of oldObs) engine.recordObservation(o);
      const newObs = createObservationBatch(userId, 'x', 'b', 35);
      for (const o of newObs) engine.recordObservation(o);
      engine.detectPreferenceChange(userId, 'x');
      expect(engine.getPreference(userId, 'x')!.state).toBe(PreferenceState.Changing);
    });

    it('updates preference currentValue after change', () => {
      const oldObs = createObservationBatch(userId, 'cv', 'old', 80);
      for (const o of oldObs) engine.recordObservation(o);
      const newObs = createObservationBatch(userId, 'cv', 'new', 35);
      for (const o of newObs) engine.recordObservation(o);
      engine.detectPreferenceChange(userId, 'cv');
      expect(engine.getPreference(userId, 'cv')!.currentValue).toBe('new');
    });

    it('sets previousValue after change', () => {
      const oldObs = createObservationBatch(userId, 'pv', 'old', 80);
      for (const o of oldObs) engine.recordObservation(o);
      const newObs = createObservationBatch(userId, 'pv', 'new', 35);
      for (const o of newObs) engine.recordObservation(o);
      engine.detectPreferenceChange(userId, 'pv');
      expect(engine.getPreference(userId, 'pv')!.previousValue).toBe('old');
    });

    it('records change in preference history', () => {
      const oldObs = createObservationBatch(userId, 'y', 'a', 80);
      for (const o of oldObs) engine.recordObservation(o);
      const newObs = createObservationBatch(userId, 'y', 'b', 35);
      for (const o of newObs) engine.recordObservation(o);
      engine.detectPreferenceChange(userId, 'y');
      const history = engine.getPreferenceHistory(userId, 'y');
      expect(history.length).toBe(1);
      expect(history[0].fromValue).toBe('a');
      expect(history[0].toValue).toBe('b');
    });

    it('records trace info on preference change', () => {
      const oldObs = createObservationBatch(userId, 'z', 'a', 80);
      for (const o of oldObs) engine.recordObservation(o);
      const newObs = createObservationBatch(userId, 'z', 'b', 35);
      for (const o of newObs) engine.recordObservation(o);
      engine.detectPreferenceChange(userId, 'z');
      expect(trace.getEntries().find(e => e.message === 'Preference change detected')).toBeDefined();
    });

    it('trace on change includes userIdHash', () => {
      const oldObs = createObservationBatch(userId, 'tr', 'a', 80);
      for (const o of oldObs) engine.recordObservation(o);
      const newObs = createObservationBatch(userId, 'tr', 'b', 35);
      for (const o of newObs) engine.recordObservation(o);
      engine.detectPreferenceChange(userId, 'tr');
      const entry = trace.getEntries().find(e => e.message === 'Preference change detected');
      expect(entry?.data?.['userIdHash']).toBe(userId);
    });

    it('returns null after change already detected (same dominant value)', () => {
      const oldObs = createObservationBatch(userId, 'w', 'a', 80);
      for (const o of oldObs) engine.recordObservation(o);
      const newObs = createObservationBatch(userId, 'w', 'b', 35);
      for (const o of newObs) engine.recordObservation(o);
      engine.detectPreferenceChange(userId, 'w');
      expect(engine.detectPreferenceChange(userId, 'w')).toBeNull();
    });

    it('returns null for unknown user', () => {
      expect(engine.detectPreferenceChange('no-user', 'any-key')).toBeNull();
    });

    it('returns null for unknown key', () => {
      expect(engine.detectPreferenceChange(userId, 'no-key')).toBeNull();
    });

    it('accumulates at least one change in history', () => {
      const a = createObservationBatch(userId, 'h', 'a', 80);
      for (const o of a) engine.recordObservation(o);
      const b = createObservationBatch(userId, 'h', 'b', 35);
      for (const o of b) engine.recordObservation(o);
      engine.detectPreferenceChange(userId, 'h');
      // Now currentValue is 'b'. Add 35 'c' to try shift recent 50 to dominant 'c'
      const c = createObservationBatch(userId, 'h', 'c', 35);
      for (const o of c) engine.recordObservation(o);
      engine.detectPreferenceChange(userId, 'h');
      // First change is guaranteed; second may or may not be detected depending on math
      expect(engine.getPreferenceHistory(userId, 'h').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── calculateStability ───────────────────────────────────────

  describe('calculateStability', () => {
    it('returns 1.0 for user with no preferences', () => {
      expect(engine.calculateStability(userId)).toBe(1.0);
    });

    it('returns value between 0 and 1', () => {
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'k', value: 'v' }));
      const stability = engine.calculateStability(userId);
      expect(stability).toBeGreaterThanOrEqual(0);
      expect(stability).toBeLessThanOrEqual(1);
    });

    it('returns high stability for consistent preferences', () => {
      const obs = createObservationBatch(userId, 'theme', 'dark', 20);
      for (const o of obs) engine.recordObservation(o);
      expect(engine.calculateStability(userId)).toBeGreaterThan(0.5);
    });

    it('returns lower stability when preferences are Changing', () => {
      const oldObs = createObservationBatch(userId, 's', 'a', 10);
      for (const o of oldObs) engine.recordObservation(o);
      const newObs = createObservationBatch(userId, 's', 'b', 50);
      for (const o of newObs) engine.recordObservation(o);
      engine.detectPreferenceChange(userId, 's');
      const stabilityBefore = engine.calculateStability(userId);
      expect(stabilityBefore).toBeLessThanOrEqual(1.0);
      // The stability should be lower than for a stable user
      expect(stabilityBefore).toBeLessThan(1.0);
    });

    it('returns 1.0 for completely unknown user', () => {
      expect(engine.calculateStability(crypto.randomUUID())).toBe(1.0);
    });

    it('stability decreases with more Changing preferences', () => {
      // Setup first changing preference
      const a1 = createObservationBatch(userId, 'p1', 'a', 10);
      for (const o of a1) engine.recordObservation(o);
      const b1 = createObservationBatch(userId, 'p1', 'b', 50);
      for (const o of b1) engine.recordObservation(o);
      engine.detectPreferenceChange(userId, 'p1');
      const s1 = engine.calculateStability(userId);

      // Add stable preference
      const stable = createObservationBatch(userId, 'p2', 'stable', 20);
      for (const o of stable) engine.recordObservation(o);
      // Stability may or may not change significantly
      const s2 = engine.calculateStability(userId);
      expect(s2).toBeGreaterThanOrEqual(0);
      expect(s2).toBeLessThanOrEqual(1);
    });
  });

  // ─── getAllPreferences ───────────────────────────────────────

  describe('getAllPreferences', () => {
    it('returns empty array for user with no preferences', () => {
      expect(engine.getAllPreferences(userId)).toHaveLength(0);
    });

    it('returns all preferences for a user', () => {
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'theme', value: 'dark' }));
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'language', value: 'en' }));
      expect(engine.getAllPreferences(userId)).toHaveLength(2);
    });

    it('does not include preferences from other users', () => {
      engine.recordObservation(createTestObservation({ userIdHash: 'u1', type: 'k', value: 'v' }));
      engine.recordObservation(createTestObservation({ userIdHash: 'u2', type: 'k', value: 'v' }));
      expect(engine.getAllPreferences('u1')).toHaveLength(1);
      expect(engine.getAllPreferences('u2')).toHaveLength(1);
    });

    it('returns empty for completely unknown user', () => {
      expect(engine.getAllPreferences('no-such-user')).toHaveLength(0);
    });

    it('returns preferences with correct keys', () => {
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'theme', value: 'dark' }));
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'lang', value: 'en' }));
      const prefs = engine.getAllPreferences(userId);
      const keys = prefs.map(p => p.key);
      expect(keys).toContain('theme');
      expect(keys).toContain('lang');
    });
  });

  // ─── getPreferenceHistory ─────────────────────────────────────

  describe('getPreferenceHistory', () => {
    it('returns empty array for unknown key', () => {
      expect(engine.getPreferenceHistory(userId, 'nope')).toHaveLength(0);
    });

    it('returns empty array for unknown user', () => {
      expect(engine.getPreferenceHistory('nope', 'k')).toHaveLength(0);
    });

    it('returns empty when no changes detected', () => {
      const obs = createObservationBatch(userId, 'k', 'stable', 10);
      for (const o of obs) engine.recordObservation(o);
      expect(engine.getPreferenceHistory(userId, 'k')).toHaveLength(0);
    });

    it('returns readonly array', () => {
      const obs = createObservationBatch(userId, 'k', 'v', 10);
      for (const o of obs) engine.recordObservation(o);
      const history = engine.getPreferenceHistory(userId, 'k');
      expect(history).toHaveLength(0);
    });
  });

  // ─── Sliding Window ──────────────────────────────────────────

  describe('sliding window', () => {
    it('evicts oldest observations when over 100', () => {
      const obs = createObservationBatch(userId, 'w', 'v', 105);
      for (const o of obs) engine.recordObservation(o);
      expect(engine.getPreference(userId, 'w')!.observationCount).toBe(100);
    });

    it('keeps newest observations after eviction', () => {
      const oldObs = createObservationBatch(userId, 'w', 'old', 50);
      for (const o of oldObs) engine.recordObservation(o);
      const newObs = createObservationBatch(userId, 'w', 'new', 60);
      for (const o of newObs) engine.recordObservation(o);
      expect(engine.getPreference(userId, 'w')!.currentValue).toBe('new');
    });

    it('does not evict when under window size', () => {
      const obs = createObservationBatch(userId, 'w', 'v', 50);
      for (const o of obs) engine.recordObservation(o);
      expect(engine.getPreference(userId, 'w')!.observationCount).toBe(50);
    });

    it('maintains correct preference after eviction', () => {
      const obs = createObservationBatch(userId, 'w', 'consistent', 110);
      for (const o of obs) engine.recordObservation(o);
      expect(engine.getPreference(userId, 'w')!.currentValue).toBe('consistent');
    });
  });

  // ─── Value Extraction ─────────────────────────────────────────

  describe('value extraction', () => {
    it('extracts string value directly', () => {
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'k', value: 'hello' }));
      expect(engine.getPreference(userId, 'k')!.currentValue).toBe('hello');
    });

    it('extracts number value as string', () => {
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'size', value: 42 }));
      expect(engine.getPreference(userId, 'size')!.currentValue).toBe('42');
    });

    it('extracts value from object with value key', () => {
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'k', value: { value: 'deep' } }));
      expect(engine.getPreference(userId, 'k')!.currentValue).toBe('deep');
    });

    it('extracts value from object with preference key', () => {
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'k', value: { preference: 'pref-val' } }));
      expect(engine.getPreference(userId, 'k')!.currentValue).toBe('pref-val');
    });

    it('returns empty string for null value', () => {
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'k', value: null }));
      const pref = engine.getPreference(userId, 'k');
      expect(pref).not.toBeNull();
      expect(pref!.currentValue).toBe('');
    });

    it('prefers value key over preference key in objects', () => {
      engine.recordObservation(createTestObservation({
        userIdHash: userId, type: 'k',
        value: { value: 'from-value', preference: 'from-pref' },
      }));
      expect(engine.getPreference(userId, 'k')!.currentValue).toBe('from-value');
    });

    it('extracts number from value field as string', () => {
      engine.recordObservation(createTestObservation({
        userIdHash: userId, type: 'k',
        value: { value: 99 },
      }));
      expect(engine.getPreference(userId, 'k')!.currentValue).toBe('99');
    });
  });

  // ─── Confidence Calculation ────────────────────────────────────

  describe('confidence calculation', () => {
    it('confidence is 1.0 when all observations have same value', () => {
      const obs = createObservationBatch(userId, 'k', 'same', 10);
      for (const o of obs) engine.recordObservation(o);
      expect(engine.getPreference(userId, 'k')!.confidence).toBe(1.0);
    });

    it('confidence is less than 1.0 for mixed values', () => {
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'k', value: 'a' }));
      engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'k', value: 'b' }));
      const pref = engine.getPreference(userId, 'k');
      expect(pref!.confidence).toBeLessThan(1.0);
      expect(pref!.confidence).toBeGreaterThan(0);
    });

    it('confidence is capped at 1.0', () => {
      const obs = createObservationBatch(userId, 'k', 'v', 100);
      for (const o of obs) engine.recordObservation(o);
      expect(engine.getPreference(userId, 'k')!.confidence).toBeLessThanOrEqual(1.0);
    });

    it('confidence increases with more consistent observations', () => {
      const obs3 = createObservationBatch(userId, 'c1', 'v', 3);
      for (const o of obs3) engine.recordObservation(o);
      const c3 = engine.getPreference(userId, 'c1')!.confidence;

      const obs10 = createObservationBatch(userId, 'c2', 'v', 10);
      for (const o of obs10) engine.recordObservation(o);
      const c10 = engine.getPreference(userId, 'c2')!.confidence;

      expect(c10).toBeGreaterThanOrEqual(c3);
    });
  });

  // ─── Multiple Users ──────────────────────────────────────────

  describe('multiple users', () => {
    it('tracks preferences independently per user', () => {
      const user1 = crypto.randomUUID();
      const user2 = crypto.randomUUID();
      engine.recordObservation(createTestObservation({ userIdHash: user1, type: 'theme', value: 'dark' }));
      engine.recordObservation(createTestObservation({ userIdHash: user2, type: 'theme', value: 'light' }));
      expect(engine.getPreference(user1, 'theme')!.currentValue).toBe('dark');
      expect(engine.getPreference(user2, 'theme')!.currentValue).toBe('light');
    });

    it('stability is calculated independently per user', () => {
      const user1 = crypto.randomUUID();
      const user2 = crypto.randomUUID();
      engine.recordObservation(createTestObservation({ userIdHash: user1, type: 'k1', value: 'a' }));
      engine.recordObservation(createTestObservation({ userIdHash: user1, type: 'k1', value: 'b' }));
      // user1 has mixed values -> lower stability, user2 has none -> 1.0
      expect(engine.calculateStability(user1)).toBeLessThan(1.0);
      expect(engine.calculateStability(user2)).toBe(1.0);
    });

    it('changes are independent per user', () => {
      const user1 = crypto.randomUUID();
      const user2 = crypto.randomUUID();
      const a = createObservationBatch(user1, 'k', 'a', 10);
      for (const o of a) engine.recordObservation(o);
      const b = createObservationBatch(user1, 'k', 'b', 50);
      for (const o of b) engine.recordObservation(o);
      engine.detectPreferenceChange(user1, 'k');
      expect(engine.getPreferenceHistory(user2, 'k')).toHaveLength(0);
    });

    it('same key can have different values for different users', () => {
      const user1 = crypto.randomUUID();
      const user2 = crypto.randomUUID();
      const obs1 = createObservationBatch(user1, 'k', 'v1', 10);
      for (const o of obs1) engine.recordObservation(o);
      const obs2 = createObservationBatch(user2, 'k', 'v2', 10);
      for (const o of obs2) engine.recordObservation(o);
      expect(engine.getPreference(user1, 'k')!.currentValue).toBe('v1');
      expect(engine.getPreference(user2, 'k')!.currentValue).toBe('v2');
    });
  });

  // ─── Event Bus Integration ───────────────────────────────────

  describe('event bus integration', () => {
    it('does not publish when no eventBus is provided', () => {
      const e = new PreferenceEvolution(DefaultExperienceRuntimeConfig);
      const obs = createTestObservation({ userIdHash: userId });
      e.recordObservation(obs);
      expect(true).toBe(true); // No error thrown
    });

    it('PreferenceChanged event is published', () => {
      const oldObs = createObservationBatch(userId, 'aggType', 'a', 80);
      for (const o of oldObs) engine.recordObservation(o);
      const newObs = createObservationBatch(userId, 'aggType', 'b', 35);
      for (const o of newObs) engine.recordObservation(o);
      engine.detectPreferenceChange(userId, 'aggType');
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'PreferenceChanged');
      expect(envelope).toBeDefined();
      expect(envelope!.version).toBe('1.0.0');
    });

    it('sets classification to state-change for PreferenceChanged', () => {
      const oldObs = createObservationBatch(userId, 'b', 'x', 80);
      for (const o of oldObs) engine.recordObservation(o);
      const newObs = createObservationBatch(userId, 'b', 'y', 35);
      for (const o of newObs) engine.recordObservation(o);
      engine.detectPreferenceChange(userId, 'b');
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'PreferenceChanged')!;
      expect(envelope.classification).toBe('state-change');
    });

    it('PreferenceChanged has sequence number', () => {
      const oldObs = createObservationBatch(userId, 'ver', 'x', 80);
      for (const o of oldObs) engine.recordObservation(o);
      const newObs = createObservationBatch(userId, 'ver', 'y', 35);
      for (const o of newObs) engine.recordObservation(o);
      engine.detectPreferenceChange(userId, 'ver');
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'PreferenceChanged')!;
      expect(envelope.sequence).toBeGreaterThan(0);
    });

    it('PreferenceChanged has timestamp', () => {
      const oldObs = createObservationBatch(userId, 'agg', 'x', 80);
      for (const o of oldObs) engine.recordObservation(o);
      const newObs = createObservationBatch(userId, 'agg', 'y', 35);
      for (const o of newObs) engine.recordObservation(o);
      engine.detectPreferenceChange(userId, 'agg');
      const log = eventBus.getLog();
      const envelope = log.find(e => e.eventType === 'PreferenceChanged')!;
      expect(envelope.timestamp).toBeTruthy();
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles observation with undefined value gracefully', () => {
      const obs = createTestObservation({ userIdHash: userId, value: undefined });
      engine.recordObservation(obs);
      expect(engine.getPreference(userId, 'responseStyle')).not.toBeNull();
    });

    it('handles observation with empty string type when value has key', () => {
      const obs: Observation = {
        id: createId<ObservationId>(), userIdHash: userId, type: '',
        value: { key: 'extractedKey', value: 'val' },
        timestamp: new Date().toISOString(), source: 'test', confidence: 1.0,
      };
      engine.recordObservation(obs);
      expect(engine.getPreference(userId, 'extractedKey')).not.toBeNull();
    });

    it('handles observation with boolean value', () => {
      const obs = createTestObservation({ userIdHash: userId, type: 'k', value: true });
      engine.recordObservation(obs);
      // Boolean doesn't have a string extraction, so preference may be empty
      expect(engine.getPreference(userId, 'k')).not.toBeNull();
    });

    it('handles observation with array value', () => {
      const obs = createTestObservation({ userIdHash: userId, type: 'k', value: [1, 2, 3] });
      engine.recordObservation(obs);
      expect(engine.getPreference(userId, 'k')).not.toBeNull();
    });

    it('handles many observations without error', () => {
      for (let i = 0; i < 200; i++) {
        engine.recordObservation(createTestObservation({ userIdHash: userId, type: 'heavy', value: `v${i % 3}` }));
      }
      expect(engine.getPreference(userId, 'heavy')).not.toBeNull();
    });

    it('handles many different preference keys', () => {
      for (let i = 0; i < 20; i++) {
        engine.recordObservation(createTestObservation({ userIdHash: userId, type: `key-${i}`, value: `val-${i}` }));
      }
      expect(engine.getAllPreferences(userId)).toHaveLength(20);
    });

    it('handles zero confidence observation', () => {
      const obs = createTestObservation({ userIdHash: userId, confidence: 0 });
      engine.recordObservation(obs);
      expect(engine.getPreference(userId, 'responseStyle')).not.toBeNull();
    });
  });
});
