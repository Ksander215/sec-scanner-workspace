/**
 * CrashRecovery Runtime — Errors
 */
export class CrashRecoveryError extends Error {
  constructor(message: string, public readonly code: string, public readonly crashrecoveryId?: string) {
    super(message);
    this.name = 'CrashRecoveryError';
  }
}

export class CrashRecoveryNotFoundError extends CrashRecoveryError {
  constructor(id: string) {
    super('CrashRecovery not found: ' + id, 'CRASHRECOVERY_NOT_FOUND', id);
    this.name = 'CrashRecoveryNotFoundError';
  }
}
