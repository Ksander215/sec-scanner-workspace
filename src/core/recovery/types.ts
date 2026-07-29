/**
 * Recovery Module — Core Types
 *
 * Defines branded identifiers, status enum, and immutable interfaces
 * for the AIS crash recovery subsystem.
 *
 * Conforms to:
 * - ARC-001.001 §5 (Module Architecture)
 * - ADR-005 (TypeScript strict mode, branded types)
 */

// ─── Branded Identifier ─────────────────────────────────────

/** Branded type for Recovery identity */
export type RecoveryId = string & { readonly __brand: 'RecoveryId' };

// ─── Status ─────────────────────────────────────────────────

/** Recovery lifecycle states */
export enum RecoveryStatus {
  Pending = 'Pending',
  RestoringSession = 'RestoringSession',
  RestoringMemory = 'RestoringMemory',
  RestoringPipeline = 'RestoringPipeline',
  Ready = 'Ready',
  Failed = 'Failed',
  Completed = 'Completed',
}

// ─── Recovery Step ──────────────────────────────────────────

/** A single step in the recovery process */
export interface RecoveryStep {
  readonly name: string;
  readonly description: string;
  readonly status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly error?: { code: string; message: string };
}

// ─── Restored State ─────────────────────────────────────────

/** The fully restored execution state after successful recovery */
export interface RestoredState {
  readonly executionId: string;
  readonly goalId: string;
  readonly executionState: string;
  readonly variables: Readonly<Record<string, unknown>>;
  readonly completedSteps: readonly string[];
  readonly pendingSteps: readonly string[];
  readonly sessionId?: string;
}

// ─── Recovery Plan ──────────────────────────────────────────

/** Immutable recovery plan tracking the full recovery lifecycle */
export interface RecoveryPlan {
  readonly recoveryId: RecoveryId;
  readonly executionId: string;
  readonly sessionId?: string;
  readonly checkpointId?: string;
  readonly status: RecoveryStatus;
  readonly createdAt: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly failedAt?: string;
  readonly error?: { code: string; message: string };
  readonly steps: readonly RecoveryStep[];
  readonly currentStepIndex: number;
  readonly restoredState?: RestoredState;
}

// ─── Serializable Form ──────────────────────────────────────

/** Serializable form (no branded type) for persistence */
export interface SerializableRecoveryPlan {
  readonly recoveryId: string;
  readonly executionId: string;
  readonly sessionId?: string;
  readonly checkpointId?: string;
  readonly status: RecoveryStatus;
  readonly createdAt: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly failedAt?: string;
  readonly error?: { code: string; message: string };
  readonly steps: readonly RecoveryStep[];
  readonly currentStepIndex: number;
  readonly restoredState?: RestoredState;
}
