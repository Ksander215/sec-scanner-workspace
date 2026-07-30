/**
 * Recovery Strategies — Pluggable strategies for different recovery scenarios.
 *
 * Each strategy determines which steps to execute and whether it can
 * handle a given recovery situation (e.g., with or without a checkpoint).
 *
 * Conforms to: ARC-001.001 §5 (Module Architecture)
 */
import type { RecoveryStep } from './types.js';
import type { Checkpoint } from '../checkpoint/types.js';

// ─── Strategy Interface ─────────────────────────────────────

/** A recovery strategy defines what steps to take and when they apply. */
export interface RecoveryStrategy {
  /** Human-readable strategy name */
  readonly name: string;
  /** Description of what this strategy does */
  readonly description: string;
  /** Determine if this strategy can handle the given checkpoint situation */
  canRecover(checkpoint?: Checkpoint): boolean;
  /** Create the ordered list of recovery steps */
  createSteps(checkpoint?: Checkpoint): RecoveryStep[];
}

// ─── Full Recovery ───────────────────────────────────────────

/**
 * Full recovery: restore session, memory, and pipeline from checkpoint.
 * Requires a valid checkpoint to proceed.
 */
export class FullRecoveryStrategy implements RecoveryStrategy {
  public readonly name = 'full';
  public readonly description =
    'Full recovery: restore session, memory, and pipeline from checkpoint';

  public canRecover(checkpoint?: Checkpoint): boolean {
    return !!checkpoint;
  }

  public createSteps(_checkpoint?: Checkpoint): RecoveryStep[] {
    return [
      {
        name: 'load-session',
        description: 'Load and restore session state',
        status: 'pending',
      },
      {
        name: 'restore-memory',
        description: 'Restore working and session memory',
        status: 'pending',
      },
      {
        name: 'restore-pipeline',
        description: 'Restore pipeline state from checkpoint',
        status: 'pending',
      },
      {
        name: 'prepare-continuation',
        description: 'Prepare execution context for continuation',
        status: 'pending',
      },
    ];
  }
}

// ─── Memory-Only Recovery ───────────────────────────────────

/**
 * Memory-only recovery: restore session and memory without pipeline state.
 * Always applicable — no checkpoint required.
 */
export class MemoryOnlyRecoveryStrategy implements RecoveryStrategy {
  public readonly name = 'memory-only';
  public readonly description =
    'Memory-only recovery: restore session and memory without pipeline state';

  public canRecover(): boolean {
    return true;
  }

  public createSteps(): RecoveryStep[] {
    return [
      {
        name: 'load-session',
        description: 'Load session state',
        status: 'pending',
      },
      {
        name: 'restore-memory',
        description: 'Restore memory layers',
        status: 'pending',
      },
    ];
  }
}

// ─── Session-Only Recovery ───────────────────────────────────

/**
 * Session-only recovery: restore session without memory or pipeline.
 * Always applicable — no checkpoint required.
 */
export class SessionOnlyRecoveryStrategy implements RecoveryStrategy {
  public readonly name = 'session-only';
  public readonly description =
    'Session-only recovery: restore session without memory or pipeline';

  public canRecover(): boolean {
    return true;
  }

  public createSteps(): RecoveryStep[] {
    return [
      {
        name: 'load-session',
        description: 'Load session state',
        status: 'pending',
      },
    ];
  }
}
