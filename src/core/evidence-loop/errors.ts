/**
 * Evidence Loop — Custom Errors
 * TASK-MVP-EVIDENCE-LOOP-001A
 */

export class EvidenceLoopError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvidenceLoopError';
  }
}

export class SessionNotFoundError extends EvidenceLoopError {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = 'SessionNotFoundError';
  }
}

export class IntentNotFoundError extends EvidenceLoopError {
  constructor(intentId: string) {
    super(`Intent not found: ${intentId}`);
    this.name = 'IntentNotFoundError';
  }
}

export class ResponseNotFoundError extends EvidenceLoopError {
  constructor(responseId: string) {
    super(`Response not found: ${responseId}`);
    this.name = 'ResponseNotFoundError';
  }
}

export class ClaimNotFoundError extends EvidenceLoopError {
  constructor(claimId: string) {
    super(`Claim not found: ${claimId}`);
    this.name = 'ClaimNotFoundError';
  }
}

export class FindingNotFoundError extends EvidenceLoopError {
  constructor(findingId: string) {
    super(`Finding not found: ${findingId}`);
    this.name = 'FindingNotFoundError';
  }
}

/** Thrown when a required entity linkage is missing (I-01..I-04, I-10). */
export class LinkageError extends EvidenceLoopError {
  constructor(message: string) {
    super(message);
    this.name = 'LinkageError';
  }
}

/** Thrown when attempting to mutate immutable evidence (I-08). */
export class ImmutableEvidenceError extends EvidenceLoopError {
  constructor(message: string) {
    super(message);
    this.name = 'ImmutableEvidenceError';
  }
}

/** Thrown when synthetic evidence is presented as human (I-07). */
export class SourceTypeMismatchError extends EvidenceLoopError {
  constructor(message: string) {
    super(message);
    this.name = 'SourceTypeMismatchError';
  }
}
