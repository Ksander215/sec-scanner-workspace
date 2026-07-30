/**
 * Experience Runtime — Error Hierarchy
 * TASK-AIS-004A.000
 *
 * Structured errors for all subsystems.
 */

// ─── Base ────────────────────────────────────────────────────

/** Base error for the Experience Runtime */
export class ExperienceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = 'ExperienceError';
  }
}

// ─── Behavior Runtime Errors ─────────────────────────────────

export class BehaviorEventValidationError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-BEH-001', details);
    this.name = 'BehaviorEventValidationError';
  }
}

export class BehaviorEventStorageError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-BEH-002', details);
    this.name = 'BehaviorEventStorageError';
  }
}

// ─── Preference Evolution Errors ───────────────────────────

export class PreferenceValidationError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-PREF-001', details);
    this.name = 'PreferenceValidationError';
  }
}

export class InsufficientObservationsError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-PREF-002', details);
    this.name = 'InsufficientObservationsError';
  }
}

export class PreferenceConflictError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-PREF-003', details);
    this.name = 'PreferenceConflictError';
  }
}

// ─── Habit Engine Errors ─────────────────────────────────────

export class HabitDetectionError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-HAB-001', details);
    this.name = 'HabitDetectionError';
  }
}

export class HabitNotFoundError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-HAB-002', details);
    this.name = 'HabitNotFoundError';
  }
}

// ─── Adaptation Engine Errors ───────────────────────────────

export class AdaptationValidationError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-ADAPT-001', details);
    this.name = 'AdaptationValidationError';
  }
}

export class AdaptationRevertError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-ADAPT-002', details);
    this.name = 'AdaptationRevertError';
  }
}

export class AdaptationExpiredError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-ADAPT-003', details);
    this.name = 'AdaptationExpiredError';
  }
}

// ─── Recommendation Runtime Errors ───────────────────────────

export class RecommendationLimitError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-REC-001', details);
    this.name = 'RecommendationLimitError';
  }
}

export class RecommendationValidationError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-REC-002', details);
    this.name = 'RecommendationValidationError';
  }
}

// ─── Profile Errors ──────────────────────────────────────────

export class ProfileNotFoundError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-PROF-001', details);
    this.name = 'ProfileNotFoundError';
  }
}

export class ProfileConflictError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-PROF-002', details);
    this.name = 'ProfileConflictError';
  }
}

// ─── Context Switching Errors ────────────────────────────────

export class ContextDetectionError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-CTX-001', details);
    this.name = 'ContextDetectionError';
  }
}

// ─── Consent Errors ──────────────────────────────────────────

export class ConsentRequiredError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-CNS-001', details);
    this.name = 'ConsentRequiredError';
  }
}

export class ConsentDeniedError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-CNS-002', details);
    this.name = 'ConsentDeniedError';
  }
}

export class ConsentExpiredError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-CNS-003', details);
    this.name = 'ConsentExpiredError';
  }
}

// ─── Snapshot Errors ─────────────────────────────────────────

export class SnapshotNotFoundError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-SNP-001', details);
    this.name = 'SnapshotNotFoundError';
  }
}

export class SnapshotExportError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-SNP-002', details);
    this.name = 'SnapshotExportError';
  }
}

export class SnapshotImportError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-SNP-003', details);
    this.name = 'SnapshotImportError';
  }
}

// ─── FSM Errors ──────────────────────────────────────────────

export class ExperienceFSMError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-FSM-001', details);
    this.name = 'ExperienceFSMError';
  }
}

// ─── Graph Errors ────────────────────────────────────────────

export class ExperienceGraphError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-GRF-001', details);
    this.name = 'ExperienceGraphError';
  }
}

// ─── Explainability Errors ──────────────────────────────────

export class ExplainabilityError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-XPL-001', details);
    this.name = 'ExplainabilityError';
  }
}

// ─── Policy Errors ───────────────────────────────────────────

export class PolicyViolationError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-POL-001', details);
    this.name = 'PolicyViolationError';
  }
}

export class PolicyNotFoundError extends ExperienceError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, 'EXP-POL-002', details);
    this.name = 'PolicyNotFoundError';
  }
}
