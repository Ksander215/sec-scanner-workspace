/**
 * Session Errors — Typed error hierarchy for session operations.
 */
import { SessionState } from './types.js';

/** Base session error with code and optional sessionId */
export class SessionError extends Error {
  public readonly code: string;
  public readonly sessionId?: string;

  constructor(message: string, code: string, sessionId?: string) {
    super(message);
    this.name = 'SessionError';
    this.code = code;
    this.sessionId = sessionId;
  }
}

/** Thrown when a session is not found by ID */
export class SessionNotFoundError extends SessionError {
  public override readonly code = 'SESSION_NOT_FOUND' as const;

  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`, 'SESSION_NOT_FOUND', sessionId);
    this.name = 'SessionNotFoundError';
  }
}

/** Thrown when a state transition is invalid */
export class SessionStateError extends SessionError {
  public override readonly code = 'SESSION_INVALID_STATE' as const;
  public readonly from: SessionState;
  public readonly to: SessionState;

  constructor(from: SessionState, to: SessionState, sessionId?: string) {
    super(
      `Invalid session state transition: ${from} → ${to}`,
      'SESSION_INVALID_STATE',
      sessionId,
    );
    this.name = 'SessionStateError';
    this.from = from;
    this.to = to;
  }
}

/** Thrown when attempting to create a session with a duplicate ID */
export class SessionAlreadyExistsError extends SessionError {
  public override readonly code = 'SESSION_ALREADY_EXISTS' as const;

  constructor(sessionId: string) {
    super(
      `Session already exists: ${sessionId}`,
      'SESSION_ALREADY_EXISTS',
      sessionId,
    );
    this.name = 'SessionAlreadyExistsError';
  }
}
