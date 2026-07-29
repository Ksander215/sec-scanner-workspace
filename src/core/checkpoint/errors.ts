/**
 * Checkpoint Module — Error Types
 * Typed errors for all Checkpoint subsystem failures.
 *
 * Conforms to: DOM-002.000 (Domain Model)
 */
export class CheckpointError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly checkpointId?: string,
  ) {
    super(message);
    this.name = 'CheckpointError';
  }
}

export class CheckpointNotFoundError extends CheckpointError {
  constructor(checkpointId: string) {
    super(
      `Checkpoint not found: ${checkpointId}`,
      'CHECKPOINT_NOT_FOUND',
      checkpointId,
    );
    this.name = 'CheckpointNotFoundError';
  }
}

export class CheckpointCorruptedError extends CheckpointError {
  public readonly contextId?: string;
  constructor(message: string, checkpointId?: string) {
    super(message, 'CHECKPOINT_CORRUPTED', checkpointId);
    this.name = 'CheckpointCorruptedError';
    // Alias: tests expect .contextId when second arg is passed as context identifier
    if (checkpointId !== undefined) {
      this.contextId = checkpointId;
    }
  }
}

export class CheckpointStateError extends CheckpointError {
  constructor(
    currentStatusOrMessage: string,
    checkpointId?: string,
    currentStatus?: string,
  ) {
    // Support both (currentStatus) and (message, checkpointId, currentStatus) signatures
    const hasFullArgs = checkpointId !== undefined;
    const message = hasFullArgs ? currentStatusOrMessage : `Invalid checkpoint state: ${currentStatusOrMessage}`;
    const cid = hasFullArgs ? checkpointId : undefined;
    const status = hasFullArgs ? currentStatus! : currentStatusOrMessage;
    super(message, 'CHECKPOINT_INVALID_STATE', cid);
    this.name = 'CheckpointStateError';
    this.currentStatus = status;
  }
}
