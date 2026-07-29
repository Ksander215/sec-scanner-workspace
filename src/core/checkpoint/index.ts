/**
 * Checkpoint Module — Public API.
 *
 * Re-exports all types, events, errors, storage, and classes
 * for the Checkpoint subsystem.
 *
 * Conforms to: ARC-001.001 §5 (Module Architecture)
 */

// ─── Core Types ──────────────────────────────────────────────
export type {
  CheckpointId,
  Checkpoint,
  SerializableCheckpoint,
  CheckpointConfig,
} from './types.js';

// ─── Domain Events ────────────────────────────────────────────
export type {
  CheckpointDomainEvent,
  CheckpointCreated,
  CheckpointConsumed,
  CheckpointFailed,
  CheckpointPurged,
} from './events.js';
export { createCheckpointEventBase } from './events.js';

// ─── Errors ──────────────────────────────────────────────────
export {
  CheckpointError,
  CheckpointNotFoundError,
  CheckpointCorruptedError,
  CheckpointStateError,
} from './errors.js';

// ─── Storage ─────────────────────────────────────────────────
export type { CheckpointStorageAdapter } from './checkpoint-store.js';
export { InMemoryCheckpointStorageAdapter } from './checkpoint-store.js';

// ─── Engine ──────────────────────────────────────────────────
export type { CreateCheckpointParams } from './checkpoint-engine.js';
export { DEFAULT_CHECKPOINT_CONFIG, CheckpointEngine } from './checkpoint-engine.js';
