/**
 * Recovery Module — Public API
 *
 * Re-exports all types, events, errors, strategies, and the runtime.
 */

// ─── Types ──────────────────────────────────────────────
export type {
  RecoveryId,
  RecoveryPlan,
  RecoveryStep,
  RestoredState,
  SerializableRecoveryPlan,
} from './types.js';
export { RecoveryStatus } from './types.js';

// ─── Events ─────────────────────────────────────────────
export type {
  RecoveryStarted,
  RecoveryStepCompleted,
  RecoveryStepFailed,
  RecoveryCompleted,
  RecoveryFailed,
  RecoveryDomainEvent,
} from './events.js';

// ─── Errors ─────────────────────────────────────────────
export {
  RecoveryError,
  RecoveryNotFoundError,
  RecoveryStateError,
  SessionRecoveryError,
  MemoryRecoveryError,
  PipelineRecoveryError,
} from './errors.js';

// ─── Strategies ─────────────────────────────────────────
export type { RecoveryStrategy } from './recovery-strategy.js';
export {
  FullRecoveryStrategy,
  MemoryOnlyRecoveryStrategy,
  SessionOnlyRecoveryStrategy,
} from './recovery-strategy.js';

// ─── Runtime ────────────────────────────────────────────
export type { RecoveryRuntimeConfig } from './recovery-runtime.js';
export { RecoveryRuntime } from './recovery-runtime.js';
