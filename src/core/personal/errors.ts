/**
 * Personal Intelligence Runtime — Error Hierarchy
 *
 * Structured errors for the PIR. Each error carries a `code`
 * for programmatic handling without re-parsing messages.
 */

// ─── Base ─────────────────────────────────────────────────────

/**
 * Base error for all Personal Intelligence Runtime errors.
 */
export class PersonalRuntimeError extends Error {
  /** Machine-readable error code */
  readonly code: string;
  /** Additional structured details */
  readonly details: Readonly<Record<string, unknown>>;

  constructor(message: string, code: string, details: Readonly<Record<string, unknown>> = {}) {
    super(message);
    this.name = 'PersonalRuntimeError';
    this.code = code;
    this.details = details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// ─── Goal Errors ──────────────────────────────────────────────

/** Thrown when a goal cannot be found by id. */
export class GoalNotFoundError extends PersonalRuntimeError {
  readonly goalId: string;

  constructor(goalId: string) {
    super(`Goal not found: id="${goalId}"`, 'GOAL_NOT_FOUND');
    this.name = 'GoalNotFoundError';
    this.goalId = goalId;
  }
}

/** Thrown when a goal fails validation (invalid transition, empty title, etc.). */
export class GoalValidationError extends PersonalRuntimeError {
  readonly violations: readonly string[];

  constructor(violations: readonly string[]) {
    super(
      `Goal validation failed: ${violations.join('; ')}`,
      'GOAL_VALIDATION_ERROR',
    );
    this.name = 'GoalValidationError';
    this.violations = violations;
  }
}

/** Thrown when setting a parent goal would create a cycle. */
export class GoalHierarchyError extends PersonalRuntimeError {
  readonly goalId: string;
  readonly parentId: string;

  constructor(goalId: string, parentId: string) {
    super(
      `Goal hierarchy cycle detected: setting parent "${parentId}" on goal "${goalId}" would create a cycle`,
      'GOAL_HIERARCHY_CYCLE',
    );
    this.name = 'GoalHierarchyError';
    this.goalId = goalId;
    this.parentId = parentId;
  }
}

// ─── Priority Errors ──────────────────────────────────────────

/** Thrown when priority calculation fails for a goal. */
export class PriorityCalculationError extends PersonalRuntimeError {
  readonly goalId: string;

  constructor(goalId: string, reason?: string) {
    super(
      `Priority calculation failed for goal "${goalId}"${reason ? `: ${reason}` : ''}`,
      'PRIORITY_CALCULATION_ERROR',
    );
    this.name = 'PriorityCalculationError';
    this.goalId = goalId;
  }
}

// ─── Context Errors ───────────────────────────────────────────

/** Thrown when building the unified context snapshot fails. */
export class ContextBuildError extends PersonalRuntimeError {
  readonly contractName: string;

  constructor(contractName: string, reason?: string) {
    super(
      `Context build failed for contract "${contractName}"${reason ? `: ${reason}` : ''}`,
      'CONTEXT_BUILD_ERROR',
    );
    this.name = 'ContextBuildError';
    this.contractName = contractName;
  }
}

// ─── Plan Errors ──────────────────────────────────────────────

/** Thrown when a plan fails validation. */
export class PlanValidationError extends PersonalRuntimeError {
  readonly violations: readonly string[];

  constructor(violations: readonly string[]) {
    super(
      `Plan validation failed: ${violations.join('; ')}`,
      'PLAN_VALIDATION_ERROR',
    );
    this.name = 'PlanValidationError';
    this.violations = violations;
  }
}

// ─── Prediction Errors ────────────────────────────────────────

/** Thrown when prediction generation fails. */
export class PredictionError extends PersonalRuntimeError {
  constructor(message?: string) {
    super(message ?? 'Prediction generation failed', 'PREDICTION_ERROR');
    this.name = 'PredictionError';
  }
}

// ─── Habit Errors ─────────────────────────────────────────────

/** Thrown when a habit operation fails. */
export class HabitError extends PersonalRuntimeError {
  readonly habitId: string;

  constructor(habitId: string, reason?: string) {
    super(
      `Habit operation failed for "${habitId}"${reason ? `: ${reason}` : ''}`,
      'HABIT_ERROR',
    );
    this.name = 'HabitError';
    this.habitId = habitId;
  }
}

// ─── Recommendation Errors ────────────────────────────────────

/** Thrown when a recommendation operation fails. */
export class RecommendationError extends PersonalRuntimeError {
  readonly recommendationId: string;

  constructor(recommendationId: string, reason?: string) {
    super(
      `Recommendation operation failed for "${recommendationId}"${reason ? `: ${reason}` : ''}`,
      'RECOMMENDATION_ERROR',
    );
    this.name = 'RecommendationError';
    this.recommendationId = recommendationId;
  }
}

// ─── Attention Errors ─────────────────────────────────────────

/** Thrown when attention tracking fails. */
export class AttentionTrackingError extends PersonalRuntimeError {
  constructor(message?: string) {
    super(message ?? 'Attention tracking failed', 'ATTENTION_TRACKING_ERROR');
    this.name = 'AttentionTrackingError';
  }
}

// ─── Reflection Errors ────────────────────────────────────────

/** Thrown when reflection generation or scoring fails. */
export class ReflectionError extends PersonalRuntimeError {
  constructor(message?: string) {
    super(message ?? 'Reflection operation failed', 'REFLECTION_ERROR');
    this.name = 'ReflectionError';
  }
}

// ─── Learning Errors ──────────────────────────────────────────

/** Thrown when a learning graph operation fails. */
export class LearningGraphError extends PersonalRuntimeError {
  readonly itemId: string;

  constructor(itemId: string, reason?: string) {
    super(
      `Learning graph operation failed for item "${itemId}"${reason ? `: ${reason}` : ''}`,
      'LEARNING_GRAPH_ERROR',
    );
    this.name = 'LearningGraphError';
    this.itemId = itemId;
  }
}

// ─── Decision Errors ──────────────────────────────────────────

/** Thrown when a decision operation fails. */
export class DecisionError extends PersonalRuntimeError {
  readonly decisionId: string;

  constructor(decisionId: string, reason?: string) {
    super(
      `Decision operation failed for "${decisionId}"${reason ? `: ${reason}` : ''}`,
      'DECISION_ERROR',
    );
    this.name = 'DecisionError';
    this.decisionId = decisionId;
  }
}

// ─── Daily Brief Errors ───────────────────────────────────────

/** Thrown when daily brief generation fails. */
export class DailyBriefError extends PersonalRuntimeError {
  constructor(message?: string) {
    super(message ?? 'Daily brief operation failed', 'DAILY_BRIEF_ERROR');
    this.name = 'DailyBriefError';
  }
}

// ─── Assistant Errors ─────────────────────────────────────────

/** Thrown when the personal assistant encounters an error. */
export class AssistantError extends PersonalRuntimeError {
  constructor(message?: string) {
    super(message ?? 'Assistant operation failed', 'ASSISTANT_ERROR');
    this.name = 'AssistantError';
  }
}

// ─── Contract Errors ──────────────────────────────────────────

/** Thrown when a required runtime contract is not available. */
export class ContractNotAvailableError extends PersonalRuntimeError {
  readonly contractName: string;

  constructor(contractName: string) {
    super(
      `Required runtime contract is not available: "${contractName}"`,
      'CONTRACT_NOT_AVAILABLE',
    );
    this.name = 'ContractNotAvailableError';
    this.contractName = contractName;
  }
}
