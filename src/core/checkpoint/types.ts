/**
 * Checkpoint Module — Core Types
 *
 * Defines the fundamental type system for the AIS Checkpoint subsystem.
 * Checkpoints capture pipeline state after each successfully completed stage,
 * enabling crash recovery by restoring execution from the last valid checkpoint.
 *
 * Conforms to:
 * - ARC-001.001 §5 (Module Architecture)
 * - DOM-002.000 (Domain Model)
 * - ADR-014 (Execution Model)
 *
 * Design principles:
 * - CheckpointId is branded for type safety.
 * - All interfaces are immutable (readonly).
 * - SerializableCheckpoint strips branding for wire/storage persistence.
 */

// ─── Branded Identifier ───────────────────────────────────────
/** Branded checkpoint identifier for type-safe checkpoint references. */
export type CheckpointId = string & { readonly __brand: 'CheckpointId' };

// ─── Checkpoint ───────────────────────────────────────────────
/**
 * A Checkpoint captures the full pipeline state at a point in time.
 * Created after each successfully completed pipeline stage.
 * Status lifecycle: valid → consumed (on restore) or failed (on corruption).
 */
export interface Checkpoint {
  /** Unique checkpoint identifier (branded). */
  readonly checkpointId: CheckpointId;
  /** Execution this checkpoint belongs to. */
  readonly executionId: string;
  /** Goal that initiated the execution. */
  readonly goalId: string;
  /** Plan associated with the execution, if available. */
  readonly planId?: string;
  /** Pipeline stage that was just completed (e.g. 'planning', 'step-completed'). */
  readonly stage: string;
  /** Current status of this checkpoint. */
  readonly status: 'valid' | 'consumed' | 'failed';
  /** ISO-8601 timestamp when the checkpoint was created. */
  readonly createdAt: string;
  /** ExecutionStatus value at checkpoint creation time. */
  readonly executionState: string;
  /** Snapshot of all variables at checkpoint time. */
  readonly variables: Readonly<Record<string, unknown>>;
  /** List of step IDs that were completed at checkpoint time. */
  readonly completedSteps: readonly string[];
  /** List of step IDs still pending at checkpoint time. */
  readonly pendingSteps: readonly string[];
  /** Optional caller-defined metadata for traceability. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ─── Serializable Checkpoint ──────────────────────────────────
/**
 * Wire/storage representation of a Checkpoint.
 * CheckpointId branding is stripped for serialization.
 */
export interface SerializableCheckpoint {
  readonly checkpointId: string;
  readonly executionId: string;
  readonly goalId: string;
  readonly planId?: string;
  readonly stage: string;
  readonly status: 'valid' | 'consumed' | 'failed';
  readonly createdAt: string;
  readonly executionState: string;
  readonly variables: Readonly<Record<string, unknown>>;
  readonly completedSteps: readonly string[];
  readonly pendingSteps: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ─── Configuration ────────────────────────────────────────────
/**
 * Configuration for the Checkpoint subsystem.
 */
export interface CheckpointConfig {
  /** Maximum number of checkpoints to retain (oldest purged when exceeded). */
  readonly maxCheckpoints: number;
  /** Pipeline stages that trigger automatic checkpoint creation. */
  readonly autoCheckpointStages: readonly string[];
  /** Whether to automatically persist to storage on checkpoint creation. */
  readonly persistOnCreate: boolean;
}
