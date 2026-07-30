/**
 * Experience Runtime — Snapshot Runtime
 * TASK-AIS-004A.000, Subsystem 13
 *
 * Supports snapshots, rollback, export, import, comparison.
 */

import { createId } from '../domain/identifiers.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type {
  SnapshotId,
  Preference,
  Habit,
  Adaptation,
  Recommendation,
  ProfileId,
  ContextId,
  ExperienceSnapshot,
  ExperienceState,
} from './types.js';
import { SnapshotNotFoundError, SnapshotExportError, SnapshotImportError } from './errors.js';

export class SnapshotRuntime {
  private readonly snapshots = new Map<SnapshotId, ExperienceSnapshot>();
  private readonly userSnapshots = new Map<string, SnapshotId[]>();
  private versionCounter = 0;
  private eventBus?: InProcessEventBus;

  constructor(eventBus?: InProcessEventBus) {
    this.eventBus = eventBus;
  }

  /** Create a new snapshot of user experience state */
  createSnapshot(
    userIdHash: string,
    preferences: readonly Preference[],
    habits: readonly Habit[],
    adaptations: readonly Adaptation[],
    recommendations: readonly Recommendation[],
    activeProfileId?: ProfileId,
    activeContextId?: ContextId,
    state: ExperienceState = 'Created' as unknown as ExperienceState,
    metrics: Readonly<Record<string, number>> = {},
  ): ExperienceSnapshot {
    const snapshot: ExperienceSnapshot = {
      id: createId<SnapshotId>(),
      userIdHash,
      timestamp: new Date().toISOString(),
      version: ++this.versionCounter,
      preferences: [...preferences],
      habits: [...habits],
      adaptations: [...adaptations],
      recommendations: [...recommendations],
      activeProfileId,
      activeContextId,
      state,
      metrics: { ...metrics },
    };

    this.snapshots.set(snapshot.id, snapshot);
    this.trackUserSnapshot(userIdHash, snapshot.id);
    this.emitSnapshotCreated(snapshot);
    return snapshot;
  }

  /** Get a specific snapshot by ID */
  getSnapshot(snapshotId: SnapshotId): ExperienceSnapshot | null {
    return this.snapshots.get(snapshotId) ?? null;
  }

  /** Get all snapshots for a user */
  getUserSnapshots(userIdHash: string): readonly ExperienceSnapshot[] {
    const ids = this.userSnapshots.get(userIdHash) ?? [];
    return ids
      .map((id) => this.snapshots.get(id))
      .filter((s): s is ExperienceSnapshot => s !== undefined);
  }

  /** Get the latest snapshot for a user */
  getLatestSnapshot(userIdHash: string): ExperienceSnapshot | null {
    const ids = this.userSnapshots.get(userIdHash);
    if (!ids || ids.length === 0) return null;
    return this.snapshots.get(ids[ids.length - 1]) ?? null;
  }

  /** Rollback to a specific snapshot — returns the snapshot for restoration */
  rollback(userIdHash: string, snapshotId: SnapshotId): ExperienceSnapshot {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new SnapshotNotFoundError(
        `Snapshot ${snapshotId} not found`,
        { snapshotId, userIdHash },
      );
    }
    if (snapshot.userIdHash !== userIdHash) {
      throw new SnapshotNotFoundError(
        `Snapshot ${snapshotId} does not belong to user ${userIdHash}`,
        { snapshotId, userIdHash },
      );
    }
    this.emitSnapshotRestored(snapshot);
    return snapshot;
  }

  /** Export a snapshot as JSON string */
  exportSnapshot(snapshotId: SnapshotId): string {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new SnapshotNotFoundError(
        `Snapshot ${snapshotId} not found for export`,
        { snapshotId },
      );
    }
    try {
      return JSON.stringify(snapshot, null, 2);
    } catch (err) {
      throw new SnapshotExportError(
        `Failed to export snapshot ${snapshotId}: ${err instanceof Error ? err.message : String(err)}`,
        { snapshotId },
      );
    }
  }

  /** Import a snapshot from JSON string */
  importSnapshot(data: string): ExperienceSnapshot {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      throw new SnapshotImportError('Invalid JSON data for snapshot import');
    }

    const obj = parsed as Record<string, unknown>;
    if (
      typeof obj.id !== 'string' ||
      typeof obj.userIdHash !== 'string' ||
      typeof obj.timestamp !== 'string' ||
      typeof obj.version !== 'number'
    ) {
      throw new SnapshotImportError(
        'Snapshot data is missing required fields (id, userIdHash, timestamp, version)',
      );
    }

    const snapshot = obj as unknown as ExperienceSnapshot;
    this.snapshots.set(snapshot.id, snapshot);
    this.trackUserSnapshot(snapshot.userIdHash, snapshot.id);
    if (snapshot.version > this.versionCounter) {
      this.versionCounter = snapshot.version;
    }
    return snapshot;
  }

  /** Compare two snapshots and categorize differences */
  compareSnapshots(
    snapshotId1: SnapshotId,
    snapshotId2: SnapshotId,
  ): { added: string[]; removed: string[]; changed: string[]; unchanged: string[] } {
    const s1 = this.snapshots.get(snapshotId1);
    const s2 = this.snapshots.get(snapshotId2);

    if (!s1 || !s2) {
      const missing = !s1 ? snapshotId1 : snapshotId2;
      throw new SnapshotNotFoundError(`Snapshot ${missing} not found for comparison`);
    }

    const prefs1 = new Map(s1.preferences.map((p) => [p.key, p.currentValue]));
    const prefs2 = new Map(s2.preferences.map((p) => [p.key, p.currentValue]));

    const allKeys = new Set([...prefs1.keys(), ...prefs2.keys()]);
    const added: string[] = [];
    const removed: string[] = [];
    const changed: string[] = [];
    const unchanged: string[] = [];

    for (const key of allKeys) {
      const v1 = prefs1.get(key);
      const v2 = prefs2.get(key);
      if (v1 === undefined) {
        added.push(key);
      } else if (v2 === undefined) {
        removed.push(key);
      } else if (v1 !== v2) {
        changed.push(key);
      } else {
        unchanged.push(key);
      }
    }

    return { added, removed, changed, unchanged };
  }

  /** Track a snapshot under a user */
  private trackUserSnapshot(userIdHash: string, snapshotId: SnapshotId): void {
    let ids = this.userSnapshots.get(userIdHash);
    if (!ids) {
      ids = [];
      this.userSnapshots.set(userIdHash, ids);
    }
    ids.push(snapshotId);
  }

  /** Emit SnapshotCreated event */
  private emitSnapshotCreated(snapshot: ExperienceSnapshot): void {
    if (!this.eventBus) return;
    const now = new Date().toISOString();
    this.eventBus.publish({
      eventId: createId(),
      eventType: 'SnapshotCreated',
      classification: EventClassification.Info,
      timestamp: now,
      sequence: 0,
      aggregateId: snapshot.id,
      aggregateType: 'ExperienceSnapshot',
      version: '1.0.0',
      payload: {
        snapshotId: snapshot.id,
        userIdHash: snapshot.userIdHash,
        version: snapshot.version,
        preferenceCount: snapshot.preferences.length,
        habitCount: snapshot.habits.length,
        adaptationCount: snapshot.adaptations.length,
        createdAt: now,
      },
    });
  }

  /** Emit SnapshotRestored event */
  private emitSnapshotRestored(snapshot: ExperienceSnapshot): void {
    if (!this.eventBus) return;
    this.eventBus.publish({
      eventId: createId(),
      eventType: 'SnapshotRestored',
      classification: EventClassification.Action,
      timestamp: new Date().toISOString(),
      sequence: 0,
      aggregateId: snapshot.id,
      aggregateType: 'ExperienceSnapshot',
      version: '1.0.0',
      payload: {
        snapshotId: snapshot.id,
        userIdHash: snapshot.userIdHash,
        version: snapshot.version,
        restoredAt: new Date().toISOString(),
      },
    });
  }
}
