/**
 * Tests for ExplainabilityRuntime (Subsystem 9)
 * TASK-AIS-004A.000
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExplainabilityRuntime } from '../../core/experience/explainability-runtime.js';
import type { ObservationId, AdaptationId, Identifier } from '../../core/experience/types.js';

describe('ExplainabilityRuntime', () => {
  let rt: ExplainabilityRuntime;

  beforeEach(() => {
    rt = new ExplainabilityRuntime();
  });

  // ─── Constructor ──────────────────────────────────────────

  describe('constructor', () => {
    it('creates instance without error', () => {
      const instance = new ExplainabilityRuntime();
      expect(instance).toBeInstanceOf(ExplainabilityRuntime);
    });

    it('initializes with size 0', () => {
      expect(rt.size).toBe(0);
    });
  });

  // ─── recordExplanation ────────────────────────────────────

  describe('recordExplanation', () => {
    it('stores an explanation record', () => {
      const rec = rt.recordExplanation(
        'target-1', 'Adaptation', 'value_update', 'User prefers dark mode',
        [crypto.randomUUID() as ObservationId], 0.9,
        { theme: 'light' }, { theme: 'dark' },
      );
      expect(rec.id).toBeDefined();
    });

    it('stores targetId', () => {
      const rec = rt.recordExplanation('target-1', 'A', 'c', 'reason', [crypto.randomUUID() as ObservationId], 0.8, { a: 1 }, { a: 2 });
      expect(rec.targetId).toBe('target-1');
    });

    it('stores targetType', () => {
      const rec = rt.recordExplanation('t1', 'Preference', 'creation', 'r', [], 0.5, {}, {});
      expect(rec.targetType).toBe('Preference');
    });

    it('stores changeType', () => {
      const rec = rt.recordExplanation('t1', 'A', 'deletion', 'r', [], 0.5, {}, {});
      expect(rec.changeType).toBe('deletion');
    });

    it('stores reason', () => {
      const rec = rt.recordExplanation('t1', 'A', 'c', 'because yes', [], 0.5, {}, {});
      expect(rec.reason).toBe('because yes');
    });

    it('stores observations', () => {
      const obs = [crypto.randomUUID() as ObservationId, crypto.randomUUID() as ObservationId];
      const rec = rt.recordExplanation('t1', 'A', 'c', 'r', obs, 0.5, {}, {});
      expect(rec.observations).toEqual(obs);
    });

    it('stores confidence', () => {
      const rec = rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.42, {}, {});
      expect(rec.confidence).toBe(0.42);
    });

    it('clamps confidence to 0 minimum', () => {
      const rec = rt.recordExplanation('t1', 'A', 'c', 'r', [], -1, {}, {});
      expect(rec.confidence).toBe(0);
    });

    it('clamps confidence to 1 maximum', () => {
      const rec = rt.recordExplanation('t1', 'A', 'c', 'r', [], 2, {}, {});
      expect(rec.confidence).toBe(1);
    });

    it('clamps confidence at exactly 0', () => {
      const rec = rt.recordExplanation('t1', 'A', 'c', 'r', [], 0, {}, {});
      expect(rec.confidence).toBe(0);
    });

    it('clamps confidence at exactly 1', () => {
      const rec = rt.recordExplanation('t1', 'A', 'c', 'r', [], 1, {}, {});
      expect(rec.confidence).toBe(1);
    });

    it('stores timestamp', () => {
      const before = new Date().toISOString();
      const rec = rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.5, {}, {});
      const after = new Date().toISOString();
      expect(rec.timestamp >= before).toBe(true);
      expect(rec.timestamp <= after).toBe(true);
    });

    it('stores previousState', () => {
      const prev = { theme: 'light', lang: 'en' };
      const rec = rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.5, prev, {});
      expect(rec.previousState).toEqual(prev);
    });

    it('stores newState', () => {
      const next = { theme: 'dark', lang: 'fr' };
      const rec = rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.5, {}, next);
      expect(rec.newState).toEqual(next);
    });

    it('extracts userIdHash from previousState', () => {
      const rec = rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.5, { userIdHash: 'user-abc' }, {});
      expect(rec.userIdHash).toBe('user-abc');
    });

    it('extracts userIdHash from newState', () => {
      const rec = rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.5, {}, { userIdHash: 'user-xyz' });
      expect(rec.userIdHash).toBe('user-xyz');
    });

    it('defaults userIdHash to unknown when not present', () => {
      const rec = rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.5, {}, {});
      expect(rec.userIdHash).toBe('unknown');
    });

    it('prioritizes previousState userIdHash over newState', () => {
      const rec = rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.5,
        { userIdHash: 'prev-user' }, { userIdHash: 'new-user' });
      expect(rec.userIdHash).toBe('prev-user');
    });

    it('creates unique ids', () => {
      const r1 = rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.5, {}, {});
      const r2 = rt.recordExplanation('t2', 'A', 'c', 'r', [], 0.5, {}, {});
      expect(r1.id).not.toBe(r2.id);
    });

    it('increments size', () => {
      expect(rt.size).toBe(0);
      rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.5, {}, {});
      expect(rt.size).toBe(1);
      rt.recordExplanation('t2', 'A', 'c', 'r', [], 0.5, {}, {});
      expect(rt.size).toBe(2);
    });

    it('does not share state object references', () => {
      const prev = { a: 1 };
      const next = { a: 2 };
      const rec = rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.5, prev, next);
      (prev as Record<string, unknown>).a = 99;
      expect(rec.previousState).toEqual({ a: 1 });
    });

    it('does not share observations array reference', () => {
      const obs = [crypto.randomUUID() as ObservationId];
      const rec = rt.recordExplanation('t1', 'A', 'c', 'r', obs, 0.5, {}, {});
      obs.push(crypto.randomUUID() as ObservationId);
      expect(rec.observations).toHaveLength(1);
    });

    it('stores empty observations array', () => {
      const rec = rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.5, {}, {});
      expect(rec.observations).toEqual([]);
    });

    it('stores empty previous and new states', () => {
      const rec = rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.5, {}, {});
      expect(rec.previousState).toEqual({});
      expect(rec.newState).toEqual({});
    });

    it('supports various targetType strings', () => {
      const types = ['Adaptation', 'Preference', 'Recommendation', 'Profile', 'Context'];
      for (const type of types) {
        const rec = rt.recordExplanation('t1', type, 'c', 'r', [], 0.5, {}, {});
        expect(rec.targetType).toBe(type);
      }
    });
  });

  // ─── getExplanation ─────────────────────────────────────

  describe('getExplanation', () => {
    it('returns record by targetId', () => {
      rt.recordExplanation('target-1', 'A', 'c', 'r', [], 0.5, {}, {});
      const rec = rt.getExplanation('target-1');
      expect(rec).not.toBeNull();
      expect(rec!.targetId).toBe('target-1');
    });

    it('returns null for non-existent target', () => {
      expect(rt.getExplanation('nope')).toBeNull();
    });

    it('returns latest record for same targetId', () => {
      rt.recordExplanation('t1', 'A', 'c1', 'r1', [], 0.5, { v: 1 }, { v: 2 });
      rt.recordExplanation('t1', 'A', 'c2', 'r2', [], 0.8, { v: 2 }, { v: 3 });
      const rec = rt.getExplanation('t1');
      expect(rec!.changeType).toBe('c2');
      expect(rec!.reason).toBe('r2');
      expect(rec!.confidence).toBe(0.8);
    });

    it('returns record with all fields populated', () => {
      const obs = [crypto.randomUUID() as ObservationId];
      const rec = rt.recordExplanation('t1', 'Adaptation', 'applied', 'Dark mode', obs, 0.9,
        { theme: 'light' }, { theme: 'dark' });
      const retrieved = rt.getExplanation('t1');
      expect(retrieved!.id).toBe(rec.id);
      expect(retrieved!.targetType).toBe('Adaptation');
      expect(retrieved!.observations).toEqual(obs);
      expect(retrieved!.previousState).toEqual({ theme: 'light' });
      expect(retrieved!.newState).toEqual({ theme: 'dark' });
    });

    it('returns null for empty runtime', () => {
      expect(rt.getExplanation('anything')).toBeNull();
    });
  });

  // ─── getExplanationHistory ─────────────────────────────

  describe('getExplanationHistory', () => {
    it('returns all records for a user', () => {
      rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.5, { userIdHash: 'u1' }, {});
      rt.recordExplanation('t2', 'A', 'c', 'r', [], 0.5, { userIdHash: 'u1' }, {});
      rt.recordExplanation('t3', 'A', 'c', 'r', [], 0.5, { userIdHash: 'u1' }, {});
      const history = rt.getExplanationHistory('u1');
      expect(history).toHaveLength(3);
    });

    it('returns empty array for unknown user', () => {
      expect(rt.getExplanationHistory('nope')).toEqual([]);
    });

    it('does not mix users', () => {
      rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.5, { userIdHash: 'u1' }, {});
      rt.recordExplanation('t2', 'A', 'c', 'r', [], 0.5, { userIdHash: 'u2' }, {});
      expect(rt.getExplanationHistory('u1')).toHaveLength(1);
      expect(rt.getExplanationHistory('u2')).toHaveLength(1);
    });

    it('includes records in creation order', () => {
      rt.recordExplanation('t1', 'A', 'c1', 'r', [], 0.5, { userIdHash: 'u1' }, {});
      rt.recordExplanation('t2', 'A', 'c2', 'r', [], 0.5, { userIdHash: 'u1' }, {});
      const history = rt.getExplanationHistory('u1');
      expect(history[0].targetId).toBe('t1');
      expect(history[1].targetId).toBe('t2');
    });

    it('returns readonly-style array', () => {
      rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.5, { userIdHash: 'u1' }, {});
      const result = rt.getExplanationHistory('u1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns records with populated fields', () => {
      rt.recordExplanation('t1', 'Adaptation', 'applied', 'Dark mode', [], 0.9,
        { userIdHash: 'u1', theme: 'light' }, { userIdHash: 'u1', theme: 'dark' });
      const history = rt.getExplanationHistory('u1');
      expect(history[0].changeType).toBe('applied');
      expect(history[0].reason).toBe('Dark mode');
      expect(history[0].confidence).toBe(0.9);
    });

    it('returns empty for empty runtime', () => {
      expect(rt.getExplanationHistory('user')).toEqual([]);
    });
  });

  // ─── getExplanationForAdaptation ────────────────────────

  describe('getExplanationForAdaptation', () => {
    it('returns record for adaptation target', () => {
      const adaptationId = crypto.randomUUID() as AdaptationId;
      rt.recordExplanation(adaptationId, 'Adaptation', 'applied', 'r', [], 0.9, {}, {});
      const rec = rt.getExplanationForAdaptation(adaptationId);
      expect(rec).not.toBeNull();
      expect(rec!.targetId).toBe(adaptationId);
    });

    it('returns null for non-existent adaptation', () => {
      expect(rt.getExplanationForAdaptation(crypto.randomUUID() as AdaptationId)).toBeNull();
    });

    it('does not index non-Adaptation targets', () => {
      rt.recordExplanation('t1', 'Preference', 'c', 'r', [], 0.5, {}, {});
      expect(rt.getExplanationForAdaptation('t1' as AdaptationId)).toBeNull();
    });

    it('returns latest for same adaptation', () => {
      const aid = crypto.randomUUID() as AdaptationId;
      rt.recordExplanation(aid, 'Adaptation', 'first', 'r', [], 0.5, {}, {});
      rt.recordExplanation(aid, 'Adaptation', 'second', 'r', [], 0.8, {}, {});
      const rec = rt.getExplanationForAdaptation(aid);
      expect(rec!.changeType).toBe('second');
    });

    it('indexes only targetType Adaptation', () => {
      rt.recordExplanation('t1', 'Recommendation', 'c', 'r', [], 0.5, {}, {});
      rt.recordExplanation('t2', 'Context', 'c', 'r', [], 0.5, {}, {});
      rt.recordExplanation('t3', 'Profile', 'c', 'r', [], 0.5, {}, {});
      expect(rt.getExplanationForAdaptation('t1' as AdaptationId)).toBeNull();
      expect(rt.getExplanationForAdaptation('t2' as AdaptationId)).toBeNull();
      expect(rt.getExplanationForAdaptation('t3' as AdaptationId)).toBeNull();
    });

    it('returns null for empty runtime', () => {
      expect(rt.getExplanationForAdaptation(crypto.randomUUID() as AdaptationId)).toBeNull();
    });
  });

  // ─── generateExplanation ─────────────────────────────────

  describe('generateExplanation', () => {
    it('returns default message when no record exists', () => {
      const explanation = rt.generateExplanation('t1', 'Adaptation');
      expect(explanation).toContain('No explanation recorded');
      expect(explanation).toContain('Adaptation');
      expect(explanation).toContain('t1');
    });

    it('includes changeType and targetType', () => {
      rt.recordExplanation('t1', 'Adaptation', 'value_update', 'User prefers dark mode', [], 0.85, { theme: 'light' }, { theme: 'dark' });
      const explanation = rt.generateExplanation('t1', 'Adaptation');
      expect(explanation).toContain('value_update');
      expect(explanation).toContain('Adaptation');
    });

    it('includes reason', () => {
      rt.recordExplanation('t1', 'A', 'c', 'User prefers dark mode', [], 0.5, {}, {});
      const explanation = rt.generateExplanation('t1', 'A');
      expect(explanation).toContain('User prefers dark mode');
    });

    it('includes observation count', () => {
      const obs = [crypto.randomUUID() as ObservationId, crypto.randomUUID() as ObservationId];
      rt.recordExplanation('t1', 'A', 'c', 'r', obs, 0.5, {}, {});
      const explanation = rt.generateExplanation('t1', 'A');
      expect(explanation).toContain('2 observation(s)');
    });

    it('includes no-observation message when empty', () => {
      rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.5, {}, {});
      const explanation = rt.generateExplanation('t1', 'A');
      expect(explanation).toContain('No observation evidence');
    });

    it('includes timestamp', () => {
      rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.5, {}, {});
      const explanation = rt.generateExplanation('t1', 'A');
      expect(explanation).toContain('at ');
    });

    it('includes confidence percentage', () => {
      rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.85, {}, {});
      const explanation = rt.generateExplanation('t1', 'A');
      expect(explanation).toContain('85%');
    });

    it('includes 0% for zero confidence', () => {
      rt.recordExplanation('t1', 'A', 'c', 'r', [], 0, {}, {});
      const explanation = rt.generateExplanation('t1', 'A');
      expect(explanation).toContain('0%');
    });

    it('includes 100% for full confidence', () => {
      rt.recordExplanation('t1', 'A', 'c', 'r', [], 1, {}, {});
      const explanation = rt.generateExplanation('t1', 'A');
      expect(explanation).toContain('100%');
    });

    it('includes state transition details', () => {
      rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.5, { theme: 'light' }, { theme: 'dark' });
      const explanation = rt.generateExplanation('t1', 'A');
      expect(explanation).toContain('Previous state:');
      expect(explanation).toContain('New state:');
    });

    it('omits state transition details when both states are empty', () => {
      rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.5, {}, {});
      const explanation = rt.generateExplanation('t1', 'A');
      expect(explanation).not.toContain('Previous state:');
      expect(explanation).not.toContain('New state:');
    });

    it('produces human-readable string', () => {
      rt.recordExplanation('t1', 'Adaptation', 'value_update', 'Dark mode preferred',
        [crypto.randomUUID() as ObservationId], 0.9,
        { theme: 'light' }, { theme: 'dark' });
      const explanation = rt.generateExplanation('t1', 'Adaptation');
      expect(typeof explanation).toBe('string');
      expect(explanation.length).toBeGreaterThan(0);
    });

    it('truncates long state values', () => {
      const longVal = 'x'.repeat(300);
      rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.5, { long: longVal }, {});
      const explanation = rt.generateExplanation('t1', 'A');
      expect(explanation).toContain('...');
    });

    it('formats state values with string quoting', () => {
      rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.5,
        { name: 'test', count: 42 }, { name: 'updated' });
      const explanation = rt.generateExplanation('t1', 'A');
      expect(explanation).toContain('"test"');
      expect(explanation).toContain('42');
    });

    it('works with numeric targetId', () => {
      rt.recordExplanation('123', 'A', 'c', 'r', [], 0.5, {}, {});
      const explanation = rt.generateExplanation('123', 'A');
      expect(explanation).toContain('123');
    });

    it('returns string for default message (no record)', () => {
      const explanation = rt.generateExplanation('missing', 'SomeType');
      expect(typeof explanation).toBe('string');
      expect(explanation.length).toBeGreaterThan(10);
    });
  });

  // ─── size property ───────────────────────────────────────

  describe('size', () => {
    it('starts at 0', () => {
      expect(rt.size).toBe(0);
    });

    it('increments with each record', () => {
      rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.5, {}, {});
      expect(rt.size).toBe(1);
      rt.recordExplanation('t2', 'A', 'c', 'r', [], 0.5, {}, {});
      expect(rt.size).toBe(2);
      rt.recordExplanation('t3', 'A', 'c', 'r', [], 0.5, {}, {});
      expect(rt.size).toBe(3);
    });

    it('does not decrement (records are append-only)', () => {
      rt.recordExplanation('t1', 'A', 'c', 'r', [], 0.5, {}, {});
      rt.recordExplanation('t2', 'A', 'c', 'r', [], 0.5, {}, {});
      expect(rt.size).toBe(2);
    });
  });

  // ─── Edge cases and integration ──────────────────────────

  describe('edge cases', () => {
    it('handles many records efficiently', () => {
      for (let i = 0; i < 100; i++) {
        rt.recordExplanation(`t${i}`, 'A', 'c', 'r', [], 0.5, { userIdHash: 'u1' }, {});
      }
      expect(rt.size).toBe(100);
      expect(rt.getExplanationHistory('u1')).toHaveLength(100);
    });

    it('multiple users each get correct history', () => {
      for (let i = 0; i < 10; i++) {
        rt.recordExplanation(`t${i}`, 'A', 'c', 'r', [], 0.5,
          { userIdHash: `user-${i % 3}` }, {});
      }
      // Users 0, 1, 2 each get records
      expect(rt.getExplanationHistory('user-0').length).toBe(4); // indices 0, 3, 6, 9
      expect(rt.getExplanationHistory('user-1').length).toBe(3); // indices 1, 4, 7
      expect(rt.getExplanationHistory('user-2').length).toBe(3); // indices 2, 5, 8
    });

    it('updating same targetId overwrites in target index', () => {
      rt.recordExplanation('target', 'A', 'v1', 'r1', [], 0.3, { userIdHash: 'u1' }, {});
      rt.recordExplanation('target', 'A', 'v2', 'r2', [], 0.7, { userIdHash: 'u1' }, {});
      const byTarget = rt.getExplanation('target');
      const byUser = rt.getExplanationHistory('u1');
      // Target index should have latest
      expect(byTarget!.changeType).toBe('v2');
      // User history should have both
      expect(byUser).toHaveLength(2);
    });
  });
});
