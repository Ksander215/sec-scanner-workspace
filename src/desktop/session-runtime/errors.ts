/**
 * Session Runtime — Errors
 */
export class SessionError extends Error {
  constructor(message: string, public readonly code: string, public readonly sessionId?: string) {
    super(message);
    this.name = 'SessionError';
  }
}

export class SessionNotFoundError extends SessionError {
  constructor(id: string) {
    super('Session not found: ' + id, 'SESSION_NOT_FOUND', id);
    this.name = 'SessionNotFoundError';
  }
}
