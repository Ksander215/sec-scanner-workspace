/**
 * Tests for SnapshotRuntime (Subsystem 13)
 * TASK-AIS-004A.000
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SnapshotRuntime } from '../../core/experience/snapshot-runtime.js';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import { ExperienceState, PreferenceState } from '../../core/experience/types.js';
import { createId } from '../../core/domain/identifiers.js';
import type {
  Preference,
  Habit,
  Adaptation,
  Recommendation,
  ObservationId,
} from '../../core/experience/types.js';
import { SnapshotNotFoundError, SnapshotImportError } from '../../core/experience/errors.js';

describe('SnapshotRuntime', () => {
  let snapshotRuntime: SnapshotRuntime;
  let eventBus: InProcessEventBus;

  const userId = () => crypto.randomUUID();

  function makePreference(overrides: Partial<Preference> = {}): Preference {
    return {
      id: createId<Preference['id']>(),
      userIdHash: userId(),
      key: 'theme',
      currentValue: 'dark',
      state: PreferenceState.Established,
      confidence: 0.9,
      observationCount: 10,
      firstObserved: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      provenance: [],
      ...overrides,
    };
  }

  function makeHabit(overrides: Partial<Habit> = {}): Habit {
    return {
      id: createId<Habit['id']>(),
      userIdHash: userId(),
      name: 'Test Habit',
      description: 'A test habit',
      periodicity: 'Daily' as any,
      strength: 'Strong' as any,
      frequency: 10,
      lastObserved: new Date().toISOString(),
      firstDetected: new Date().toISOString(),
      observationCount: 10,
      pattern: {},
      ...overrides,
    };
  }

  beforeEach(() => {
    eventBus = new InProcessEventBus();
    snapshotRuntime = new SnapshotRuntime(eventBus);
  });

  // ─── createSnapshot ─────────────────────────────────────────

  describe('createSnapshot', () => {
    it('creates snapshot with version 1', () => {
      const snap = snapshotRuntime.createSnapshot(userId(), [], [], [], []);
      expect(snap.version).toBe(1);
    });

    it('increments version for each new snapshot', () => {
      const user = userId();
      snapshotRuntime.createSnapshot(user, [], [], [], []);
      const snap2 = snapshotRuntime.createSnapshot(user, [], [], [], []);
      expect(snap2.version).toBe(2);
    });

    it('generates a unique snapshot ID', () => {
      const snap1 = snapshotRuntime.createSnapshot(userId(), [], [], [], []);
      const snap2 = snapshotRuntime.createSnapshot(userId(), [], [], [], []);
      expect(snap1.id).not.toBe(snap2.id);
    });

    it('stores the userIdHash', () => {
      const user = userId();
      const snap = snapshotRuntime.createSnapshot(user, [], [], [], []);
      expect(snap.userIdHash).toBe(user);
    });

    it('stores timestamp', () => {
      const snap = snapshotRuntime.createSnapshot(userId(), [], [], [], []);
      expect(snap.timestamp).toBeTruthy();
    });

    it('stores preferences', () => {
      const prefs = [makePreference()];
      const snap = snapshotRuntime.createSnapshot(userId(), prefs, [], [], []);
      expect(snap.preferences).toHaveLength(1);
      expect(snap.preferences[0].key).toBe('theme');
    });

    it('stores habits', () => {
      const habits = [makeHabit()];
      const snap = snapshotRuntime.createSnapshot(userId(), [], habits, [], []);
      expect(snap.habits).toHaveLength(1);
    });

    it('stores adaptations', () => {
      const adaptations: Adaptation[] = [{
        id: createId<Adaptation['id']>(),
        type: 'ResponseStyle' as any,
        userIdHash: userId(),
        previousValue: 'formal',
        newValue: 'casual',
        state: 'Applied' as any,
        reason: 'test',
        evidence: [],
        confidence: 0.8,
      }];
      const snap = snapshotRuntime.createSnapshot(userId(), [], [], adaptations, []);
      expect(snap.adaptations).toHaveLength(1);
    });

    it('stores recommendations', () => {
      const recs: Recommendation[] = [{
        id: createId<Recommendation['id']>(),
        type: 'Workflow' as any,
        userIdHash: userId(),
        title: 'Test Rec',
        description: 'A recommendation',
        state: 'Generated' as any,
        confidence: 0.7,
        evidence: [],
        generatedAt: new Date().toISOString(),
      }];
      const snap = snapshotRuntime.createSnapshot(userId(), [], [], [], recs);
      expect(snap.recommendations).toHaveLength(1);
    });

    it('stores state', () => {
      const snap = snapshotRuntime.createSnapshot(
        userId(), [], [], [], [], undefined, undefined, ExperienceState.Stable,
      );
      expect(snap.state).toBe(ExperienceState.Stable);
    });

    it('defaults state to Created', () => {
      const snap = snapshotRuntime.createSnapshot(userId(), [], [], [], []);
      expect(snap.state).toBe(ExperienceState.Created);
    });

    it('stores metrics', () => {
      const snap = snapshotRuntime.createSnapshot(
        userId(), [], [], [], [], undefined, undefined, undefined, { count: 42 },
      );
      expect(snap.metrics).toEqual({ count: 42 });
    });

    it('defaults metrics to empty object', () => {
      const snap = snapshotRuntime.createSnapshot(userId(), [], [], [], []);
      expect(snap.metrics).toEqual({});
    });

    it('stores activeProfileId', () => {
      const profileId = createId<any>();
      const snap = snapshotRuntime.createSnapshot(userId(), [], [], [], [], profileId);
      expect(snap.activeProfileId).toBe(profileId);
    });

    it('stores activeContextId', () => {
      const contextId = createId<any>();
      const snap = snapshotRuntime.createSnapshot(userId(), [], [], [], [], undefined, contextId);
      expect(snap.activeContextId).toBe(contextId);
    });

    it('copies arrays to prevent external mutation', () => {
      const prefs = [makePreference()];
      const snap = snapshotRuntime.createSnapshot(userId(), prefs, [], [], []);
      prefs.push(makePreference());
      expect(snap.preferences).toHaveLength(1);
    });

    it('emits SnapshotCreated event', async () => {
      const handler = vi.fn();
      eventBus.subscribe('SnapshotCreated', handler);
      snapshotRuntime.createSnapshot(userId(), [], [], [], []);
      // Event bus publish is sync in InProcessEventBus
      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0];
      expect(event.eventType).toBe('SnapshotCreated');
      expect(event.payload).toBeDefined();
    });

    it('SnapshotCreated event includes preferenceCount', async () => {
      const handler = vi.fn();
      eventBus.subscribe('SnapshotCreated', handler);
      const prefs = [makePreference(), makePreference()];
      snapshotRuntime.createSnapshot(userId(), prefs, [], [], []);
      expect(handler.mock.calls[0][0].payload.preferenceCount).toBe(2);
    });

    it('SnapshotCreated event includes habitCount', async () => {
      const handler = vi.fn();
      eventBus.subscribe('SnapshotCreated', handler);
      const habits = [makeHabit(), makeHabit(), makeHabit()];
      snapshotRuntime.createSnapshot(userId(), [], habits, [], []);
      expect(handler.mock.calls[0][0].payload.habitCount).toBe(3);
    });

    it('SnapshotCreated event includes version', async () => {
      const handler = vi.fn();
      eventBus.subscribe('SnapshotCreated', handler);
      snapshotRuntime.createSnapshot(userId(), [], [], [], []);
      expect(handler.mock.calls[0][0].payload.version).toBe(1);
    });

    it('SnapshotCreated event includes userIdHash', async () => {
      const handler = vi.fn();
      eventBus.subscribe('SnapshotCreated', handler);
      const user = userId();
      snapshotRuntime.createSnapshot(user, [], [], [], []);
      expect(handler.mock.calls[0][0].payload.userIdHash).toBe(user);
    });
  });

  // ─── getSnapshot ───────────────────────────────────────────

  describe('getSnapshot', () => {
    it('returns snapshot by ID', () => {
      const snap = snapshotRuntime.createSnapshot(userId(), [], [], [], []);
      const retrieved = snapshotRuntime.getSnapshot(snap.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(snap.id);
    });

    it('returns null for non-existent snapshot', () => {
      const result = snapshotRuntime.getSnapshot(createId<any>());
      expect(result).toBeNull();
    });

    it('returns snapshot with all data intact', () => {
      const prefs = [makePreference()];
      const snap = snapshotRuntime.createSnapshot(userId(), prefs, [], [], []);
      const retrieved = snapshotRuntime.getSnapshot(snap.id)!;
      expect(retrieved.preferences).toHaveLength(1);
      expect(retrieved.preferences[0].key).toBe('theme');
    });
  });

  // ─── getUserSnapshots ───────────────────────────────────────

  describe('getUserSnapshots', () => {
    it('returns all snapshots for a user', () => {
      const user = userId();
      snapshotRuntime.createSnapshot(user, [], [], [], []);
      snapshotRuntime.createSnapshot(user, [], [], [], []);
      const snaps = snapshotRuntime.getUserSnapshots(user);
      expect(snaps).toHaveLength(2);
    });

    it('does not include other users snapshots', () => {
      const user1 = userId();
      const user2 = userId();
      snapshotRuntime.createSnapshot(user1, [], [], [], []);
      snapshotRuntime.createSnapshot(user2, [], [], [], []);
      snapshotRuntime.createSnapshot(user2, [], [], [], []);
      expect(snapshotRuntime.getUserSnapshots(user1)).toHaveLength(1);
      expect(snapshotRuntime.getUserSnapshots(user2)).toHaveLength(2);
    });

    it('returns empty array for user with no snapshots', () => {
      expect(snapshotRuntime.getUserSnapshots(userId())).toHaveLength(0);
    });
  });

  // ─── getLatestSnapshot ─────────────────────────────────────

  describe('getLatestSnapshot', () => {
    it('returns most recent snapshot for user', () => {
      const user = userId();
      snapshotRuntime.createSnapshot(user, [], [], [], []);
      const snap2 = snapshotRuntime.createSnapshot(user, [], [], [], []);
      const latest = snapshotRuntime.getLatestSnapshot(user);
      expect(latest!.id).toBe(snap2.id);
      expect(latest!.version).toBe(2);
    });

    it('returns null for user with no snapshots', () => {
      expect(snapshotRuntime.getLatestSnapshot(userId())).toBeNull();
    });
  });

  // ─── rollback ─────────────────────────────────────────────

  describe('rollback', () => {
    it('returns the snapshot for restoration', () => {
      const user = userId();
      const prefs = [makePreference()];
      const snap = snapshotRuntime.createSnapshot(user, prefs, [], [], []);
      const result = snapshotRuntime.rollback(user, snap.id);
      expect(result.id).toBe(snap.id);
      expect(result.userIdHash).toBe(user);
    });

    it('throws SnapshotNotFoundError for non-existent snapshot', () => {
      expect(() =>
        snapshotRuntime.rollback(userId(), createId<any>())
      ).toThrow(SnapshotNotFoundError);
    });

    it('throws when snapshot belongs to different user', () => {
      const user1 = userId();
      const user2 = userId();
      const snap = snapshotRuntime.createSnapshot(user1, [], [], [], []);
      expect(() =>
        snapshotRuntime.rollback(user2, snap.id)
      ).toThrow(SnapshotNotFoundError);
    });

    it('emits SnapshotRestored event', () => {
      const handler = vi.fn();
      eventBus.subscribe('SnapshotRestored', handler);
      const user = userId();
      const snap = snapshotRuntime.createSnapshot(user, [], [], [], []);
      snapshotRuntime.rollback(user, snap.id);
      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0];
      expect(event.eventType).toBe('SnapshotRestored');
      expect(event.payload.snapshotId).toBe(snap.id);
    });

    it('SnapshotRestored event includes userIdHash', () => {
      const handler = vi.fn();
      eventBus.subscribe('SnapshotRestored', handler);
      const user = userId();
      const snap = snapshotRuntime.createSnapshot(user, [], [], [], []);
      snapshotRuntime.rollback(user, snap.id);
      expect(handler.mock.calls[0][0].payload.userIdHash).toBe(user);
    });

    it('SnapshotRestored event includes version', () => {
      const handler = vi.fn();
      eventBus.subscribe('SnapshotRestored', handler);
      const user = userId();
      const snap = snapshotRuntime.createSnapshot(user, [], [], [], []);
      snapshotRuntime.rollback(user, snap.id);
      expect(handler.mock.calls[0][0].payload.version).toBe(snap.version);
    });
  });

  // ─── exportSnapshot ────────────────────────────────────────

  describe('exportSnapshot', () => {
    it('returns JSON string', () => {
      const snap = snapshotRuntime.createSnapshot(userId(), [], [], [], []);
      const json = snapshotRuntime.exportSnapshot(snap.id);
      expect(typeof json).toBe('string');
    });

    it('JSON can be parsed back', () => {
      const snap = snapshotRuntime.createSnapshot(userId(), [], [], [], []);
      const json = snapshotRuntime.exportSnapshot(snap.id);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(snap.id);
    });

    it('throws SnapshotNotFoundError for non-existent snapshot', () => {
      expect(() =>
        snapshotRuntime.exportSnapshot(createId<any>())
      ).toThrow(SnapshotNotFoundError);
    });

    it('exported JSON contains all required fields', () => {
      const prefs = [makePreference()];
      const snap = snapshotRuntime.createSnapshot(userId(), prefs, [], [], []);
      const json = snapshotRuntime.exportSnapshot(snap.id);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBeDefined();
      expect(parsed.userIdHash).toBeDefined();
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.version).toBeDefined();
      expect(parsed.preferences).toHaveLength(1);
      expect(parsed.habits).toHaveLength(0);
      expect(parsed.adaptations).toHaveLength(0);
      expect(parsed.recommendations).toHaveLength(0);
    });
  });

  // ─── importSnapshot ────────────────────────────────────────

  describe('importSnapshot', () => {
    it('parses valid JSON and stores snapshot', () => {
      const data = JSON.stringify({
        id: createId<any>(),
        userIdHash: userId(),
        timestamp: new Date().toISOString(),
        version: 10,
        preferences: [],
        habits: [],
        adaptations: [],
        recommendations: [],
        state: ExperienceState.Stable,
        metrics: {},
      });
      const snap = snapshotRuntime.importSnapshot(data);
      expect(snap.version).toBe(10);
      expect(snap.state).toBe(ExperienceState.Stable);
    });

    it('makes imported snapshot retrievable', () => {
      const data = JSON.stringify({
        id: createId<any>(),
        userIdHash: userId(),
        timestamp: new Date().toISOString(),
        version: 1,
        preferences: [],
        habits: [],
        adaptations: [],
        recommendations: [],
        state: ExperienceState.Created,
        metrics: {},
      });
      const snap = snapshotRuntime.importSnapshot(data);
      const retrieved = snapshotRuntime.getSnapshot(snap.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(snap.id);
    });

    it('tracks imported snapshot under user', () => {
      const user = userId();
      const data = JSON.stringify({
        id: createId<any>(),
        userIdHash: user,
        timestamp: new Date().toISOString(),
        version: 1,
        preferences: [],
        habits: [],
        adaptations: [],
        recommendations: [],
        state: ExperienceState.Created,
        metrics: {},
      });
      snapshotRuntime.importSnapshot(data);
      const userSnaps = snapshotRuntime.getUserSnapshots(user);
      expect(userSnaps).toHaveLength(1);
    });

    it('updates versionCounter to highest imported version', () => {
      snapshotRuntime.createSnapshot(userId(), [], [], [], []); // version 1
      snapshotRuntime.createSnapshot(userId(), [], [], [], []); // version 2
      const data = JSON.stringify({
        id: createId<any>(),
        userIdHash: userId(),
        timestamp: new Date().toISOString(),
        version: 100,
        preferences: [],
        habits: [],
        adaptations: [],
        recommendations: [],
        state: ExperienceState.Created,
        metrics: {},
      });
      snapshotRuntime.importSnapshot(data);
      const next = snapshotRuntime.createSnapshot(userId(), [], [], [], []);
      expect(next.version).toBe(101);
    });

    it('throws SnapshotImportError for invalid JSON', () => {
      expect(() => snapshotRuntime.importSnapshot('not valid json')).toThrow(SnapshotImportError);
    });

    it('throws SnapshotImportError for missing id field', () => {
      const data = JSON.stringify({
        userIdHash: userId(),
        timestamp: new Date().toISOString(),
        version: 1,
      });
      expect(() => snapshotRuntime.importSnapshot(data)).toThrow(SnapshotImportError);
    });

    it('throws SnapshotImportError for missing userIdHash field', () => {
      const data = JSON.stringify({
        id: createId<any>(),
        timestamp: new Date().toISOString(),
        version: 1,
      });
      expect(() => snapshotRuntime.importSnapshot(data)).toThrow(SnapshotImportError);
    });

    it('throws SnapshotImportError for missing timestamp field', () => {
      const data = JSON.stringify({
        id: createId<any>(),
        userIdHash: userId(),
        version: 1,
      });
      expect(() => snapshotRuntime.importSnapshot(data)).toThrow(SnapshotImportError);
    });

    it('throws SnapshotImportError for missing version field', () => {
      const data = JSON.stringify({
        id: createId<any>(),
        userIdHash: userId(),
        timestamp: new Date().toISOString(),
      });
      expect(() => snapshotRuntime.importSnapshot(data)).toThrow(SnapshotImportError);
    });

    it('throws SnapshotImportError when id is not a string', () => {
      const data = JSON.stringify({
        id: 123,
        userIdHash: userId(),
        timestamp: new Date().toISOString(),
        version: 1,
      });
      expect(() => snapshotRuntime.importSnapshot(data)).toThrow(SnapshotImportError);
    });

    it('throws SnapshotImportError when version is not a number', () => {
      const data = JSON.stringify({
        id: createId<any>(),
        userIdHash: userId(),
        timestamp: new Date().toISOString(),
        version: 'not-a-number',
      });
      expect(() => snapshotRuntime.importSnapshot(data)).toThrow(SnapshotImportError);
    });

    it('error message mentions missing fields', () => {
      try {
        snapshotRuntime.importSnapshot('{}');
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect((err as Error).message).toContain('missing required fields');
      }
    });
  });

  // ─── compareSnapshots ───────────────────────────────────────

  describe('compareSnapshots', () => {
    it('returns empty changes for identical snapshots', () => {
      const user = userId();
      const prefs = [makePreference({ key: 'theme', currentValue: 'dark' })];
      const s1 = snapshotRuntime.createSnapshot(user, prefs, [], [], []);
      const s2 = snapshotRuntime.createSnapshot(user, prefs, [], [], []);
      const diff = snapshotRuntime.compareSnapshots(s1.id, s2.id);
      expect(diff.added).toHaveLength(0);
      expect(diff.removed).toHaveLength(0);
      expect(diff.changed).toHaveLength(0);
      expect(diff.unchanged).toHaveLength(1); // 'theme' unchanged
    });

    it('detects added preferences', () => {
      const user = userId();
      const prefs1 = [makePreference({ key: 'theme', currentValue: 'dark' })];
      const prefs2 = [
        makePreference({ key: 'theme', currentValue: 'dark' }),
        makePreference({ key: 'fontSize', currentValue: 'large' }),
      ];
      const s1 = snapshotRuntime.createSnapshot(user, prefs1, [], [], []);
      const s2 = snapshotRuntime.createSnapshot(user, prefs2, [], [], []);
      const diff = snapshotRuntime.compareSnapshots(s1.id, s2.id);
      expect(diff.added).toContain('fontSize');
    });

    it('detects removed preferences', () => {
      const user = userId();
      const prefs1 = [makePreference({ key: 'theme' }), makePreference({ key: 'fontSize' })];
      const prefs2 = [makePreference({ key: 'theme' })];
      const s1 = snapshotRuntime.createSnapshot(user, prefs1, [], [], []);
      const s2 = snapshotRuntime.createSnapshot(user, prefs2, [], [], []);
      const diff = snapshotRuntime.compareSnapshots(s1.id, s2.id);
      expect(diff.removed).toContain('fontSize');
    });

    it('detects changed preferences', () => {
      const user = userId();
      const prefs1 = [makePreference({ key: 'theme', currentValue: 'dark' })];
      const prefs2 = [makePreference({ key: 'theme', currentValue: 'light' })];
      const s1 = snapshotRuntime.createSnapshot(user, prefs1, [], [], []);
      const s2 = snapshotRuntime.createSnapshot(user, prefs2, [], [], []);
      const diff = snapshotRuntime.compareSnapshots(s1.id, s2.id);
      expect(diff.changed).toContain('theme');
    });

    it('detects unchanged preferences', () => {
      const user = userId();
      const prefs1 = [makePreference({ key: 'theme', currentValue: 'dark' })];
      const prefs2 = [makePreference({ key: 'theme', currentValue: 'dark' })];
      const s1 = snapshotRuntime.createSnapshot(user, prefs1, [], [], []);
      const s2 = snapshotRuntime.createSnapshot(user, prefs2, [], [], []);
      const diff = snapshotRuntime.compareSnapshots(s1.id, s2.id);
      expect(diff.unchanged).toContain('theme');
    });

    it('handles multiple changes simultaneously', () => {
      const user = userId();
      const prefs1 = [
        makePreference({ key: 'a', currentValue: '1' }),
        makePreference({ key: 'b', currentValue: '2' }),
        makePreference({ key: 'c', currentValue: '3' }),
      ];
      const prefs2 = [
        makePreference({ key: 'a', currentValue: '1' }),  // unchanged
        makePreference({ key: 'b', currentValue: 'changed' }), // changed
        makePreference({ key: 'd', currentValue: '4' }),  // added, 'c' removed
      ];
      const s1 = snapshotRuntime.createSnapshot(user, prefs1, [], [], []);
      const s2 = snapshotRuntime.createSnapshot(user, prefs2, [], [], []);
      const diff = snapshotRuntime.compareSnapshots(s1.id, s2.id);
      expect(diff.unchanged).toContain('a');
      expect(diff.changed).toContain('b');
      expect(diff.added).toContain('d');
      expect(diff.removed).toContain('c');
    });

    it('handles snapshots with no preferences', () => {
      const user = userId();
      const s1 = snapshotRuntime.createSnapshot(user, [], [], [], []);
      const s2 = snapshotRuntime.createSnapshot(user, [], [], [], []);
      const diff = snapshotRuntime.compareSnapshots(s1.id, s2.id);
      expect(diff.added).toHaveLength(0);
      expect(diff.removed).toHaveLength(0);
      expect(diff.changed).toHaveLength(0);
      expect(diff.unchanged).toHaveLength(0);
    });

    it('throws SnapshotNotFoundError for non-existent first snapshot', () => {
      const user = userId();
      const s2 = snapshotRuntime.createSnapshot(user, [], [], [], []);
      expect(() =>
        snapshotRuntime.compareSnapshots(createId<any>(), s2.id)
      ).toThrow(SnapshotNotFoundError);
    });

    it('throws SnapshotNotFoundError for non-existent second snapshot', () => {
      const user = userId();
      const s1 = snapshotRuntime.createSnapshot(user, [], [], [], []);
      expect(() =>
        snapshotRuntime.compareSnapshots(s1.id, createId<any>())
      ).toThrow(SnapshotNotFoundError);
    });
  });

  // ─── No EventBus ───────────────────────────────────────────

  describe('without event bus', () => {
    it('works without event bus', () => {
      const runtime = new SnapshotRuntime();
      const snap = runtime.createSnapshot(userId(), [], [], [], []);
      expect(snap.version).toBe(1);
    });

    it('does not throw on rollback without event bus', () => {
      const runtime = new SnapshotRuntime();
      const user = userId();
      const snap = runtime.createSnapshot(user, [], [], [], []);
      const result = runtime.rollback(user, snap.id);
      expect(result.id).toBe(snap.id);
    });
  });
});
