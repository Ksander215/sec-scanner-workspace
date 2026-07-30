/**
 * Recovery Errors — Typed error hierarchy for recovery operations.
 */

/** Base recovery error with code and optional recoveryId */
export class RecoveryError extends Error {
  public readonly code: string;
  public readonly recoveryId?: string;

  constructor(message: string, code: string, recoveryId?: string) {
    super(message);
    this.name = 'RecoveryError';
    this.code = code;
    this.recoveryId = recoveryId;
  }
}

/** Thrown when a recovery plan is not found by ID */
export class RecoveryNotFoundError extends RecoveryError {
  public override readonly code = 'RECOVERY_NOT_FOUND' as const;

  constructor(recoveryId: string) {
    super(
      `Recovery plan not found: ${recoveryId}`,
      'RECOVERY_NOT_FOUND',
      recoveryId,
    );
    this.name = 'RecoveryNotFoundError';
  }
}

/** Thrown when a recovery state transition is invalid */
export class RecoveryStateError extends RecoveryError {
  public override readonly code = 'RECOVERY_INVALID_STATE' as const;

  constructor(message: string, recoveryId?: string) {
    super(message, 'RECOVERY_INVALID_STATE', recoveryId);
    this.name = 'RecoveryStateError';
  }
}

/** Thrown when session recovery fails */
export class SessionRecoveryError extends RecoveryError {
  public override readonly code = 'SESSION_RECOVERY_FAILED' as const;

  constructor(message: string, recoveryId?: string) {
    super(message, 'SESSION_RECOVERY_FAILED', recoveryId);
    this.name = 'SessionRecoveryError';
  }
}

/** Thrown when memory recovery fails */
export class MemoryRecoveryError extends RecoveryError {
  public override readonly code = 'MEMORY_RECOVERY_FAILED' as const;

  constructor(message: string, recoveryId?: string) {
    super(message, 'MEMORY_RECOVERY_FAILED', recoveryId);
    this.name = 'MemoryRecoveryError';
  }
}

/** Thrown when pipeline recovery fails */
export class PipelineRecoveryError extends RecoveryError {
  public override readonly code = 'PIPELINE_RECOVERY_FAILED' as const;

  constructor(message: string, recoveryId?: string) {
    super(message, 'PIPELINE_RECOVERY_FAILED', recoveryId);
    this.name = 'PipelineRecoveryError';
  }
}
