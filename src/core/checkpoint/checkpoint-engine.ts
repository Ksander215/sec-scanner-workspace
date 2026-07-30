/**
 * Checkpoint Engine — Main orchestrator for the Checkpoint subsystem.
 *
 * Creates checkpoints after each successfully completed pipeline stage,
 * enabling crash recovery by restoring execution state from the last valid checkpoint.
 *
 * Responsibilities:
 * - Create, consume, and invalidate checkpoints
 * - Enforce maxCheckpoints limit (purge oldest when exceeded)
 * - Persist/load via pluggable CheckpointStorageAdapter
 * - Serialize/deserialize between branded and plain representations
 * - Publish domain events for all state transitions
 *
 * Publishes domain events for all state changes via the Event Bus.
 *
 * Conforms to: DOM-002.000 (Domain Model), ADR-002 (Event Bus), ADR-014 (Execution Model)
 */
import type { EventBus } from '../events/event-bus.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { Checkpoint, CheckpointId, CheckpointConfig, SerializableCheckpoint } from './types.js';
import type { CheckpointStorageAdapter } from './checkpoint-store.js';
import { InMemoryCheckpointStorageAdapter } from './checkpoint-store.js';
import {
  CheckpointCreated,
  CheckpointConsumed,
  CheckpointFailed,
  CheckpointPurged,
  createCheckpointEventBase,
} from './events.js';
import { EventClassification } from '../types/common.js';
import {
  CheckpointNotFoundError,
  CheckpointStateError,
  CheckpointCorruptedError,
} from './errors.js';

// ─── Defaults ────────────────────────────────────────────────

export const DEFAULT_CHECKPOINT_CONFIG: CheckpointConfig = {
  maxCheckpoints: 1000,
  autoCheckpointStages: ['planning', 'ready', 'step-completed', 'execution-completed'],
  persistOnCreate: false,
};

// ─── Create Checkpoint Parameters ────────────────────────────

export interface CreateCheckpointParams {
  readonly executionId: string;
  readonly goalId: string;
  readonly planId?: string;
  readonly stage: string;
  readonly executionState: string;
  readonly variables: Readonly<Record<string, unknown>>;
  readonly completedSteps: readonly string[];
  readonly pendingSteps: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ─── Engine ──────────────────────────────────────────────────

/**
 * Main orchestrator for the Checkpoint subsystem.
 * Provides a unified API for creating, consuming, invalidating, querying,
 * persisting, and purging checkpoints.
 */
export class CheckpointEngine {
  private readonly checkpoints = new Map<string, Checkpoint>();
  private readonly executionCheckpoints = new Map<string, CheckpointId[]>();
  private readonly storage: CheckpointStorageAdapter;
  private readonly eventBus?: EventBus;
  private readonly config: CheckpointConfig;

  constructor(config?: {
    eventBus?: EventBus;
    storage?: CheckpointStorageAdapter;
    config?: Partial<CheckpointConfig>;
  }) {
    this.config = {
      ...DEFAULT_CHECKPOINT_CONFIG,
      ...config?.config,
    };
    this.storage = config?.storage ?? new InMemoryCheckpointStorageAdapter();
    this.eventBus = config?.eventBus;
  }

  // ─── Creation ──────────────────────────────────────────────

  /**
   * Create a new checkpoint capturing the current pipeline state.
   * Enforces maxCheckpoints limit by purging the oldest checkpoints.
   * Optionally persists to storage based on config.
   */
  createCheckpoint(params: CreateCheckpointParams): Checkpoint {
    const checkpointId = crypto.randomUUID() as CheckpointId;
    const now = new Date().toISOString();

    const checkpoint: Checkpoint = {
      checkpointId,
      executionId: params.executionId,
      goalId: params.goalId,
      planId: params.planId,
      stage: params.stage,
      status: 'valid',
      createdAt: now,
      executionState: params.executionState,
      variables: JSON.parse(JSON.stringify(params.variables)) as Readonly<Record<string, unknown>>,
      completedSteps: [...params.completedSteps],
      pendingSteps: [...params.pendingSteps],
      metadata: params.metadata !== undefined
        ? JSON.parse(JSON.stringify(params.metadata)) as Readonly<Record<string, unknown>>
        : undefined,
    };

    // Store in-memory
    this.checkpoints.set(checkpointId as string, checkpoint);

    // Track by execution
    const execIds = this.executionCheckpoints.get(params.executionId);
    if (execIds === undefined) {
      this.executionCheckpoints.set(params.executionId, [checkpointId]);
    } else {
      execIds.push(checkpointId);
    }

    // Enforce maxCheckpoints
    this.enforceMaxCheckpoints();

    // Publish event (fire-and-forget)
    void this.publishEvent<CheckpointCreated>({
      ...createCheckpointEventBase(
        'CheckpointCreated',
        EventClassification.Info,
        checkpointId as string,
      ),
      eventType: 'CheckpointCreated',
      classification: EventClassification.Info,
      payload: {
        checkpointId: checkpointId as string,
        executionId: params.executionId,
        stage: params.stage,
        createdAt: now,
      },
    });

    // Auto-persist if configured
    if (this.config.persistOnCreate) {
      void this.save(checkpointId as string);
    }

    return checkpoint;
  }

  // ─── Consumption ───────────────────────────────────────────

  /**
   * Mark a checkpoint as consumed (used for recovery).
   * @throws CheckpointNotFoundError if the checkpoint does not exist.
   * @throws CheckpointStateError if the checkpoint is not in 'valid' status.
   */
  consumeCheckpoint(checkpointId: string): Checkpoint {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (checkpoint === undefined) {
      throw new CheckpointNotFoundError(checkpointId);
    }
    if (checkpoint.status !== 'valid') {
      throw new CheckpointStateError(
        `Cannot consume checkpoint with status '${checkpoint.status}'`,
        checkpointId,
        checkpoint.status,
      );
    }

    const consumed: Checkpoint = {
      ...checkpoint,
      status: 'consumed',
    };
    this.checkpoints.set(checkpointId, consumed);

    // Publish event (fire-and-forget)
    void this.publishEvent<CheckpointConsumed>({
      ...createCheckpointEventBase(
        'CheckpointConsumed',
        EventClassification.StateChange,
        checkpointId,
      ),
      eventType: 'CheckpointConsumed',
      classification: EventClassification.StateChange,
      payload: {
        checkpointId,
        executionId: consumed.executionId,
        consumedAt: new Date().toISOString(),
      },
    });

    return consumed;
  }

  // ─── Invalidation ──────────────────────────────────────────

  /**
   * Mark a checkpoint as failed (e.g. corruption detected).
   * @throws CheckpointNotFoundError if the checkpoint does not exist.
   */
  invalidateCheckpoint(checkpointId: string): void {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (checkpoint === undefined) {
      throw new CheckpointNotFoundError(checkpointId);
    }

    const failed: Checkpoint = {
      ...checkpoint,
      status: 'failed',
    };
    this.checkpoints.set(checkpointId, failed);

    // Publish event (fire-and-forget)
    void this.publishEvent<CheckpointFailed>({
      ...createCheckpointEventBase(
        'CheckpointFailed',
        EventClassification.Error,
        checkpointId,
      ),
      eventType: 'CheckpointFailed',
      classification: EventClassification.Error,
      payload: {
        checkpointId,
        executionId: failed.executionId,
        reason: 'invalidated',
      },
    });
  }

  // ─── Queries ───────────────────────────────────────────────

  /** Get a checkpoint by ID. Returns null if not found. */
  getCheckpoint(checkpointId: string): Checkpoint | null {
    return this.checkpoints.get(checkpointId) ?? null;
  }

  /**
   * Get the latest valid checkpoint for an execution.
   * Returns the most recent checkpoint (by createdAt) with status 'valid'.
   */
  getLatestForExecution(executionId: string): Checkpoint | null {
    const ids = this.executionCheckpoints.get(executionId);
    if (ids === undefined || ids.length === 0) return null;

    let latest: Checkpoint | null = null;
    for (const id of ids) {
      const cp = this.checkpoints.get(id as string);
      if (cp !== undefined && cp.status === 'valid') {
        if (latest === null || cp.createdAt > latest.createdAt) {
          latest = cp;
        }
      }
    }
    return latest;
  }

  /** Get all checkpoints for an execution, sorted by createdAt ascending. */
  getCheckpointsForExecution(executionId: string): readonly Checkpoint[] {
    const ids = this.executionCheckpoints.get(executionId);
    if (ids === undefined || ids.length === 0) return [];

    const results: Checkpoint[] = [];
    for (const id of ids) {
      const cp = this.checkpoints.get(id as string);
      if (cp !== undefined) {
        results.push(cp);
      }
    }
    results.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return results;
  }

  /** Get all checkpoints across all executions, sorted by createdAt ascending. */
  getAllCheckpoints(): readonly Checkpoint[] {
    const results: Checkpoint[] = Array.from(this.checkpoints.values());
    results.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return results;
  }

  // ─── Purging ───────────────────────────────────────────────

  /**
   * Purge all checkpoints for a given execution.
   * Also deletes from storage if present.
   * Returns the number of checkpoints purged.
   */
  purgeForExecution(executionId: string): number {
    const ids = this.executionCheckpoints.get(executionId);
    if (ids === undefined || ids.length === 0) return 0;

    let purgedCount = 0;
    const now = new Date().toISOString();

    for (const id of ids) {
      this.checkpoints.delete(id as string);
      purgedCount++;

      // Delete from storage (fire-and-forget)
      void this.storage.delete(id as string);

      // Publish event (fire-and-forget)
      void this.publishEvent<CheckpointPurged>({
        ...createCheckpointEventBase(
          'CheckpointPurged',
          EventClassification.Info,
          id as string,
        ),
        eventType: 'CheckpointPurged',
        classification: EventClassification.Info,
        payload: {
          checkpointId: id as string,
          executionId,
          purgedAt: now,
          reason: 'execution-purge',
        },
      });
    }

    this.executionCheckpoints.delete(executionId);
    return purgedCount;
  }

  /**
   * Purge all checkpoints older than the given ISO-8601 timestamp.
   * Also deletes from storage if present.
   * Returns the number of checkpoints purged.
   */
  purgeOlderThan(timestamp: string): number {
    const toPurge: string[] = [];

    for (const [id, cp] of this.checkpoints) {
      if (cp.createdAt < timestamp) {
        toPurge.push(id);
      }
    }

    const now = new Date().toISOString();

    for (const id of toPurge) {
      const cp = this.checkpoints.get(id)!;

      // Remove from execution index
      const execIds = this.executionCheckpoints.get(cp.executionId);
      if (execIds !== undefined) {
        const idx = execIds.findIndex((cid) => (cid as string) === id);
        if (idx !== -1) {
          execIds.splice(idx, 1);
        }
        if (execIds.length === 0) {
          this.executionCheckpoints.delete(cp.executionId);
        }
      }

      // Remove from main store
      this.checkpoints.delete(id);

      // Delete from storage (fire-and-forget)
      void this.storage.delete(id);

      // Publish event (fire-and-forget)
      void this.publishEvent<CheckpointPurged>({
        ...createCheckpointEventBase(
          'CheckpointPurged',
          EventClassification.Info,
          id,
        ),
        eventType: 'CheckpointPurged',
        classification: EventClassification.Info,
        payload: {
          checkpointId: id,
          executionId: cp.executionId,
          purgedAt: now,
          reason: 'age-purge',
        },
      });
    }

    return toPurge.length;
  }

  // ─── Persistence ───────────────────────────────────────────

  /**
   * Save a single checkpoint to persistent storage.
   * @throws CheckpointNotFoundError if the checkpoint does not exist in memory.
   */
  async save(checkpointId: string): Promise<void> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (checkpoint === undefined) {
      throw new CheckpointNotFoundError(checkpointId);
    }
    const serializable = this.serialize(checkpoint);
    await this.storage.save(serializable);
  }

  /**
   * Load a single checkpoint from persistent storage into memory.
   * If a checkpoint with the same ID already exists in memory, it is replaced.
   * @throws CheckpointCorruptedError if deserialization fails.
   */
  async load(checkpointId: string): Promise<Checkpoint | null> {
    const serializable = await this.storage.load(checkpointId);
    if (serializable === null) return null;

    try {
      const checkpoint = this.deserialize(serializable);

      // Store in memory
      this.checkpoints.set(checkpointId, checkpoint);

      // Track by execution
      const execIds = this.executionCheckpoints.get(checkpoint.executionId);
      if (execIds === undefined) {
        this.executionCheckpoints.set(checkpoint.executionId, [checkpoint.checkpointId]);
      } else {
        // Avoid duplicates
        if (!execIds.some((eid) => (eid as string) === checkpointId)) {
          execIds.push(checkpoint.checkpointId);
        }
      }

      return checkpoint;
    } catch (error) {
      if (error instanceof CheckpointCorruptedError) throw error;
      throw new CheckpointCorruptedError(
        `Failed to deserialize checkpoint ${checkpointId}: ${error instanceof Error ? error.message : String(error)}`,
        checkpointId,
      );
    }
  }

  /**
   * Load all checkpoints from persistent storage into memory.
   * Returns the number of checkpoints loaded.
   */
  async loadAll(): Promise<number> {
    const all = await this.storage.listAll();
    let loaded = 0;

    for (const serializable of all) {
      try {
        const checkpoint = this.deserialize(serializable);
        const id = checkpoint.checkpointId as string;

        // Only load if not already in memory (don't overwrite newer state)
        if (!this.checkpoints.has(id)) {
          this.checkpoints.set(id, checkpoint);

          // Track by execution
          const execIds = this.executionCheckpoints.get(checkpoint.executionId);
          if (execIds === undefined) {
            this.executionCheckpoints.set(checkpoint.executionId, [checkpoint.checkpointId]);
          } else {
            if (!execIds.some((eid) => (eid as string) === id)) {
              execIds.push(checkpoint.checkpointId);
            }
          }

          loaded++;
        }
      } catch {
        // Skip corrupted checkpoints during bulk load
      }
    }

    return loaded;
  }

  // ─── Serialization ─────────────────────────────────────────

  /**
   * Convert a branded Checkpoint to a SerializableCheckpoint (strip branding).
   */
  serialize(checkpoint: Checkpoint): SerializableCheckpoint {
    return {
      checkpointId: checkpoint.checkpointId as string,
      executionId: checkpoint.executionId,
      goalId: checkpoint.goalId,
      planId: checkpoint.planId,
      stage: checkpoint.stage,
      status: checkpoint.status,
      createdAt: checkpoint.createdAt,
      executionState: checkpoint.executionState,
      variables: JSON.parse(JSON.stringify(checkpoint.variables)) as Readonly<Record<string, unknown>>,
      completedSteps: [...checkpoint.completedSteps],
      pendingSteps: [...checkpoint.pendingSteps],
      metadata: checkpoint.metadata !== undefined
        ? JSON.parse(JSON.stringify(checkpoint.metadata)) as Readonly<Record<string, unknown>>
        : undefined,
    };
  }

  /**
   * Convert a SerializableCheckpoint back to a branded Checkpoint.
   * @throws CheckpointCorruptedError if required fields are missing or invalid.
   */
  deserialize(data: SerializableCheckpoint): Checkpoint {
    // Validate required fields
    if (!data.checkpointId || typeof data.checkpointId !== 'string') {
      throw new CheckpointCorruptedError('Missing or invalid checkpointId', data.checkpointId);
    }
    if (!data.executionId || typeof data.executionId !== 'string') {
      throw new CheckpointCorruptedError('Missing or invalid executionId', data.checkpointId);
    }
    if (!data.goalId || typeof data.goalId !== 'string') {
      throw new CheckpointCorruptedError('Missing or invalid goalId', data.checkpointId);
    }
    if (!data.stage || typeof data.stage !== 'string') {
      throw new CheckpointCorruptedError('Missing or invalid stage', data.checkpointId);
    }
    if (!data.createdAt || typeof data.createdAt !== 'string') {
      throw new CheckpointCorruptedError('Missing or invalid createdAt', data.checkpointId);
    }
    if (!data.executionState || typeof data.executionState !== 'string') {
      throw new CheckpointCorruptedError('Missing or invalid executionState', data.checkpointId);
    }
    if (data.status !== 'valid' && data.status !== 'consumed' && data.status !== 'failed') {
      throw new CheckpointCorruptedError(`Invalid status: ${String(data.status)}`, data.checkpointId);
    }

    return {
      checkpointId: data.checkpointId as CheckpointId,
      executionId: data.executionId,
      goalId: data.goalId,
      planId: data.planId,
      stage: data.stage,
      status: data.status,
      createdAt: data.createdAt,
      executionState: data.executionState,
      variables: data.variables !== undefined && data.variables !== null
        ? JSON.parse(JSON.stringify(data.variables)) as Readonly<Record<string, unknown>>
        : {},
      completedSteps: Array.isArray(data.completedSteps) ? [...data.completedSteps] : [],
      pendingSteps: Array.isArray(data.pendingSteps) ? [...data.pendingSteps] : [],
      metadata: data.metadata !== undefined && data.metadata !== null
        ? JSON.parse(JSON.stringify(data.metadata)) as Readonly<Record<string, unknown>>
        : undefined,
    };
  }

  // ─── Internal Helpers ──────────────────────────────────────

  /**
   * Enforce the maxCheckpoints limit by purging the oldest checkpoints.
   * Purges from storage as well.
   */
  private enforceMaxCheckpoints(): void {
    while (this.checkpoints.size > this.config.maxCheckpoints) {
      // Find the oldest checkpoint across all executions
      let oldestId: string | undefined;
      let oldestCreatedAt: string | undefined;

      for (const [id, cp] of this.checkpoints) {
        if (oldestCreatedAt === undefined || cp.createdAt < oldestCreatedAt) {
          oldestId = id;
          oldestCreatedAt = cp.createdAt;
        }
      }

      if (oldestId === undefined || oldestCreatedAt === undefined) break;

      const cp = this.checkpoints.get(oldestId)!;

      // Remove from execution index
      const execIds = this.executionCheckpoints.get(cp.executionId);
      if (execIds !== undefined) {
        const idx = execIds.findIndex((cid) => (cid as string) === oldestId);
        if (idx !== -1) {
          execIds.splice(idx, 1);
        }
        if (execIds.length === 0) {
          this.executionCheckpoints.delete(cp.executionId);
        }
      }

      // Remove from main store
      this.checkpoints.delete(oldestId);

      // Delete from storage (fire-and-forget)
      void this.storage.delete(oldestId);

      // Publish event (fire-and-forget)
      void this.publishEvent<CheckpointPurged>({
        ...createCheckpointEventBase(
          'CheckpointPurged',
          EventClassification.Info,
          oldestId,
        ),
        eventType: 'CheckpointPurged',
        classification: EventClassification.Info,
        payload: {
          checkpointId: oldestId,
          executionId: cp.executionId,
          purgedAt: new Date().toISOString(),
          reason: 'max-checkpoints-exceeded',
        },
      });
    }
  }

  /** Publish an event to the event bus if available. */
  private async publishEvent<T extends DomainEventBase>(event: T): Promise<void> {
    if (!this.eventBus) return;
    await this.eventBus.publish(event);
  }
}
