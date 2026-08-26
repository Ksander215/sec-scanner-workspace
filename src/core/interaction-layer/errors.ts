/**
 * Interaction Layer — Custom Errors
 * TASK-MVP-EVIDENCE-LOOP-001B
 *
 * Error types for the interaction boundary.
 * User-facing errors never expose internal details (§19, §20).
 */

export class InteractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InteractionError';
  }
}

/** Question is empty or whitespace-only. */
export class EmptyQuestionError extends InteractionError {
  constructor() {
    super('Question must not be empty.');
    this.name = 'EmptyQuestionError';
  }
}

/** Interaction is in wrong state for the requested operation. */
export class InteractionStateError extends InteractionError {
  constructor(current: string, expected: string, sessionId: string) {
    super(`Invalid state ${current} for session ${sessionId}. Expected: ${expected}`);
    this.name = 'InteractionStateError';
  }
}

/** Session not found in interaction layer. */
export class InteractionSessionNotFoundError extends InteractionError {
  constructor(sessionId: string) {
    super(`Interaction session not found: ${sessionId}`);
    this.name = 'InteractionSessionNotFoundError';
  }
}

/** AIS execution failed (provider unavailable, timeout, etc.). */
export class ExecutionFailedError extends InteractionError {
  /** Safe message for user — never includes stack trace. */
  readonly userMessage: string;

  constructor(userMessage?: string) {
    super(userMessage ?? 'AIS temporarily cannot process the request.');
    this.name = 'ExecutionFailedError';
    this.userMessage = this.message;
  }
}
