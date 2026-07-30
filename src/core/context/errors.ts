/**
 * Context Engine — Error Types
 * Typed errors for all Context subsystem failures.
 *
 * Conforms to: DOM-002.000 (Domain Model)
 */
export class ContextError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly contextId?: string,
  ) {
    super(message);
    this.name = 'ContextError';
  }
}

export class ContextNotFoundError extends ContextError {
  constructor(contextId: string) {
    super(
      `Context not found: ${contextId}`,
      'CONTEXT_NOT_FOUND',
      contextId,
    );
    this.name = 'ContextNotFoundError';
  }
}

export class ContextSizeExceededError extends ContextError {
  public readonly currentSize: number;
  public readonly actualSize: number;
  constructor(
    currentSize: number,
    public readonly maxSize: number,
    contextId?: string,
  ) {
    super(
      `Context size exceeded: ${currentSize} > ${maxSize}`,
      'CONTEXT_SIZE_EXCEEDED',
      contextId,
    );
    this.name = 'ContextSizeExceededError';
    this.currentSize = currentSize;
    this.actualSize = currentSize;
  }
}

export class ContextValidationError extends ContextError {
  public readonly violations: readonly string[] = [];
  constructor(
    message: string,
    violations?: readonly string[],
    contextId?: string,
  ) {
    super(message, 'CONTEXT_VALIDATION_FAILED', contextId);
    this.name = 'ContextValidationError';
    if (violations !== undefined) {
      this.violations = violations;
    }
  }
}

export class ContextIsolationError extends ContextError {
  constructor(
    public readonly sessionId: string,
    contextId?: string,
  ) {
    super(
      `Context isolation violation — session ${sessionId} accessed forbidden context`,
      'CONTEXT_ISOLATION_VIOLATION',
      contextId,
    );
    this.name = 'ContextIsolationError';
  }
}

export class ContextSerializationError extends ContextError {
  constructor(message: string, contextId?: string) {
    super(message, 'CONTEXT_SERIALIZATION_FAILED', contextId);
    this.name = 'ContextSerializationError';
  }
}

export class ContextDeserializationError extends ContextError {
  constructor(message: string, contextId?: string) {
    super(message, 'CONTEXT_DESERIALIZATION_FAILED', contextId);
    this.name = 'ContextDeserializationError';
  }
}

export class SnapshotNotFoundError extends ContextError {
  constructor(
    public readonly snapshotId: string,
    contextId?: string,
  ) {
    super(
      `Snapshot not found: ${snapshotId}`,
      'SNAPSHOT_NOT_FOUND',
      contextId,
    );
    this.name = 'SnapshotNotFoundError';
  }
}

export class SnapshotCorruptedError extends ContextError {
  public readonly snapshotId?: string;
  constructor(snapshotIdOrMessage: string, contextIdOrMessage?: string) {
    // Support both (snapshotId, message) and (message) signatures
    const hasSnapshotId = contextIdOrMessage !== undefined;
    const message = hasSnapshotId ? contextIdOrMessage : snapshotIdOrMessage;
    const contextId = hasSnapshotId ? undefined : undefined;
    super(message, 'SNAPSHOT_CORRUPTED', contextId);
    this.name = 'SnapshotCorruptedError';
    if (hasSnapshotId) {
      this.snapshotId = snapshotIdOrMessage;
    }
  }
}
