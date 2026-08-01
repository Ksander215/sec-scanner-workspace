/**
 * Personal Intelligence Capability Pack — Error Hierarchy
 * TASK-AIS-007A.000
 *
 * Structured errors for the pack. Each error carries a `code`
 * for programmatic handling without re-parsing messages.
 */

// ─── Base ─────────────────────────────────────────────────────

/** Base error for all Personal Intelligence Pack errors. */
export class PackError extends Error {
  readonly code: string;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(message: string, code: string = 'PACK_ERROR', details: Readonly<Record<string, unknown>> = {}) {
    super(message);
    this.name = 'PackError';
    this.code = code;
    this.details = details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// ─── Daily Brief Errors ───────────────────────────────────────

export class BriefGenerationError extends PackError {
  constructor(reason?: string) {
    super(reason ?? 'Daily brief generation failed', 'BRIEF_GENERATION_ERROR');
    this.name = 'BriefGenerationError';
  }
}

export class BriefNotFoundError extends PackError {
  readonly briefId: string;
  constructor(briefId: string) {
    super(`Brief not found: "${briefId}"`, 'BRIEF_NOT_FOUND');
    this.name = 'BriefNotFoundError';
    this.briefId = briefId;
  }
}

// ─── Reflection Errors ───────────────────────────────────────

export class ReflectionGenerationError extends PackError {
  constructor(reason?: string) {
    super(reason ?? 'Reflection generation failed', 'REFLECTION_GENERATION_ERROR');
    this.name = 'ReflectionGenerationError';
  }
}

// ─── Goal Errors ─────────────────────────────────────────────

export class GoalNotFoundError extends PackError {
  readonly goalId: string;
  constructor(goalId: string) {
    super(`Goal not found: "${goalId}"`, 'GOAL_NOT_FOUND');
    this.name = 'GoalNotFoundError';
    this.goalId = goalId;
  }
}

export class GoalValidationError extends PackError {
  readonly violations: readonly string[];
  constructor(violations: readonly string[]) {
    super(`Goal validation failed: ${violations.join('; ')}`, 'GOAL_VALIDATION_ERROR');
    this.name = 'GoalValidationError';
    this.violations = violations;
  }
}

export class GoalHierarchyError extends PackError {
  readonly goalId: string;
  readonly parentId: string;
  constructor(goalId: string, parentId: string) {
    super(`Goal hierarchy cycle: setting parent "${parentId}" on "${goalId}"`, 'GOAL_HIERARCHY_CYCLE');
    this.name = 'GoalHierarchyError';
    this.goalId = goalId;
    this.parentId = parentId;
  }
}

// ─── Decision Errors ─────────────────────────────────────────

export class DecisionNotFoundError extends PackError {
  readonly decisionId: string;
  constructor(decisionId: string) {
    super(`Decision not found: "${decisionId}"`, 'DECISION_NOT_FOUND');
    this.name = 'DecisionNotFoundError';
    this.decisionId = decisionId;
  }
}

export class DecisionValidationError extends PackError {
  readonly violations: readonly string[];
  constructor(violations: readonly string[]) {
    super(`Decision validation failed: ${violations.join('; ')}`, 'DECISION_VALIDATION_ERROR');
    this.name = 'DecisionValidationError';
    this.violations = violations;
  }
}

// ─── Constraint Errors ───────────────────────────────────────

export class ConstraintNotFoundError extends PackError {
  readonly constraintId: string;
  constructor(constraintId: string) {
    super(`Constraint not found: "${constraintId}"`, 'CONSTRAINT_NOT_FOUND');
    this.name = 'ConstraintNotFoundError';
    this.constraintId = constraintId;
  }
}

export class ConstraintAnalysisError extends PackError {
  constructor(reason?: string) {
    super(reason ?? 'Constraint analysis failed', 'CONSTRAINT_ANALYSIS_ERROR');
    this.name = 'ConstraintAnalysisError';
  }
}

// ─── Value Errors ────────────────────────────────────────────

export class ValueAssessmentError extends PackError {
  constructor(reason?: string) {
    super(reason ?? 'Value assessment failed', 'VALUE_ASSESSMENT_ERROR');
    this.name = 'ValueAssessmentError';
  }
}

// ─── Recommendation Errors ───────────────────────────────────

export class RecommendationComposeError extends PackError {
  constructor(reason?: string) {
    super(reason ?? 'Recommendation composition failed', 'RECOMMENDATION_COMPOSE_ERROR');
    this.name = 'RecommendationComposeError';
  }
}

export class RecommendationChainError extends PackError {
  readonly stage: string;
  constructor(stage: string, reason?: string) {
    super(`Recommendation chain broken at "${stage}": ${reason ?? 'unknown reason'}`, 'RECOMMENDATION_CHAIN_ERROR');
    this.name = 'RecommendationChainError';
    this.stage = stage;
  }
}

export class RecommendationNotFoundError extends PackError {
  readonly recommendationId: string;
  constructor(recommendationId: string) {
    super(`Recommendation not found: "${recommendationId}"`, 'RECOMMENDATION_NOT_FOUND');
    this.name = 'RecommendationNotFoundError';
    this.recommendationId = recommendationId;
  }
}

// ─── Knowledge Errors ────────────────────────────────────────

export class KnowledgeNodeError extends PackError {
  constructor(reason?: string, code?: string) {
    super(reason ?? 'Knowledge node operation failed', code ?? 'KNOWLEDGE_NODE_ERROR');
    this.name = 'KnowledgeNodeError';
  }
}

export class KnowledgeEdgeError extends PackError {
  constructor(reason?: string) {
    super(reason ?? 'Knowledge edge operation failed', 'KNOWLEDGE_EDGE_ERROR');
    this.name = 'KnowledgeEdgeError';
  }
}

// ─── Conversation Errors ─────────────────────────────────────

export class ConversationInterpretError extends PackError {
  constructor(reason?: string) {
    super(reason ?? 'Conversation interpretation failed', 'CONVERSATION_INTERPRET_ERROR');
    this.name = 'ConversationInterpretError';
  }
}

// ─── Habit Errors ────────────────────────────────────────────

export class HabitInsightError extends PackError {
  constructor(reason?: string) {
    super(reason ?? 'Habit insight operation failed', 'HABIT_INSIGHT_ERROR');
    this.name = 'HabitInsightError';
  }
}

// ─── Priority Errors ────────────────────────────────────────

export class PriorityCalculationError extends PackError {
  readonly goalId: string;
  constructor(goalId: string, reason?: string) {
    super(`Priority calculation failed for goal "${goalId}"${reason ? `: ${reason}` : ''}`, 'PRIORITY_CALCULATION_ERROR');
    this.name = 'PriorityCalculationError';
    this.goalId = goalId;
  }
}

// ─── Dashboard Errors ────────────────────────────────────────

export class DashboardGenerationError extends PackError {
  constructor(reason?: string) {
    super(reason ?? 'Dashboard generation failed', 'DASHBOARD_GENERATION_ERROR');
    this.name = 'DashboardGenerationError';
  }
}

// ─── First Intelligence Errors ───────────────────────────────

export class FirstIntelligenceError extends PackError {
  constructor(reason?: string) {
    super(reason ?? 'First Intelligence experience failed', 'FIRST_INTELLIGENCE_ERROR');
    this.name = 'FirstIntelligenceError';
  }
}

// ─── Pack Lifecycle Errors ───────────────────────────────────

export class PackDisposedError extends PackError {
  constructor() {
    super('Pack has been disposed', 'PACK_DISPOSED');
    this.name = 'PackDisposedError';
  }
}

export class PackStateError extends PackError {
  readonly currentState: string;
  readonly targetState: string;
  constructor(currentState: string, targetState: string) {
    super(`Invalid state transition: "${currentState}" -> "${targetState}"`, 'PACK_STATE_ERROR');
    this.name = 'PackStateError';
    this.currentState = currentState;
    this.targetState = targetState;
  }
}

export class ContractNotAvailableError extends PackError {
  readonly contractName: string;
  constructor(contractName: string) {
    super(`Runtime contract not available: "${contractName}"`, 'CONTRACT_NOT_AVAILABLE');
    this.name = 'ContractNotAvailableError';
    this.contractName = contractName;
  }
}