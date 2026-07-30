/**
 * Checkpoint Storage — Pluggable persistence for checkpoints.
 *
 * Provides a storage adapter interface and an in-memory default implementation.
 * All returned data uses defensive copies to prevent external mutation.
 *
 * Conforms to: DOM-002.000 (Domain Model), ADR-004 (File Storage)
 */
import type { SerializableCheckpoint } from './types.js';

// ─── Storage Adapter Interface ───────────────────────────────
/**
 * Pluggable storage adapter for checkpoint persistence.
 * Abstracts away the actual storage mechanism (file system, database, etc.).
 */
export interface CheckpointStorageAdapter {
  /** Persist a checkpoint to storage. */
  save(checkpoint: SerializableCheckpoint): Promise<void>;
  /** Load a single checkpoint by ID. Returns null if not found. */
  load(checkpointId: string): Promise<SerializableCheckpoint | null>;
  /** Delete a checkpoint by ID. Returns true if it existed. */
  delete(checkpointId: string): Promise<boolean>;
  /** List all checkpoints for a given execution. */
  listByExecution(executionId: string): Promise<readonly SerializableCheckpoint[]>;
  /** List all stored checkpoints. */
  listAll(): Promise<readonly SerializableCheckpoint[]>;
}

// ─── In-Memory Implementation ─────────────────────────────────
/**
 * In-memory implementation of CheckpointStorageAdapter.
 * Stores checkpoints in a Map keyed by checkpointId.
 * All returned data uses defensive deep copies to prevent external mutation.
 * Useful for testing and in-process scenarios.
 */
export class InMemoryCheckpointStorageAdapter implements CheckpointStorageAdapter {
  private readonly store = new Map<string, SerializableCheckpoint>();

  async save(checkpoint: SerializableCheckpoint): Promise<void> {
    // Store a deep copy to prevent external mutation
    this.store.set(checkpoint.checkpointId, deepCopyCheckpoint(checkpoint));
  }

  async load(checkpointId: string): Promise<SerializableCheckpoint | null> {
    const checkpoint = this.store.get(checkpointId);
    if (checkpoint === undefined) return null;
    return deepCopyCheckpoint(checkpoint);
  }

  async delete(checkpointId: string): Promise<boolean> {
    return this.store.delete(checkpointId);
  }

  async listByExecution(executionId: string): Promise<readonly SerializableCheckpoint[]> {
    const results: SerializableCheckpoint[] = [];
    for (const checkpoint of this.store.values()) {
      if (checkpoint.executionId === executionId) {
        results.push(deepCopyCheckpoint(checkpoint));
      }
    }
    // Sort by createdAt ascending (oldest first)
    results.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return results;
  }

  async listAll(): Promise<readonly SerializableCheckpoint[]> {
    const results: SerializableCheckpoint[] = [];
    for (const checkpoint of this.store.values()) {
      results.push(deepCopyCheckpoint(checkpoint));
    }
    // Sort by createdAt ascending (oldest first)
    results.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return results;
  }
}

// ─── Helper ──────────────────────────────────────────────────
/**
 * Create a defensive deep copy of a SerializableCheckpoint.
 * Only performs structured clone for known fields; metadata and variables
 * are cloned via JSON round-trip since their shape is unknown.
 */
function deepCopyCheckpoint(cp: SerializableCheckpoint): SerializableCheckpoint {
  return {
    checkpointId: cp.checkpointId,
    executionId: cp.executionId,
    goalId: cp.goalId,
    planId: cp.planId,
    stage: cp.stage,
    status: cp.status,
    createdAt: cp.createdAt,
    executionState: cp.executionState,
    variables: JSON.parse(JSON.stringify(cp.variables)) as Readonly<Record<string, unknown>>,
    completedSteps: [...cp.completedSteps],
    pendingSteps: [...cp.pendingSteps],
    metadata: cp.metadata !== undefined
      ? JSON.parse(JSON.stringify(cp.metadata)) as Readonly<Record<string, unknown>>
      : undefined,
  };
}