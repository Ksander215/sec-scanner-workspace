import { describe, it, expect } from 'vitest';
import {
  PersonalRuntimeError,
  GoalNotFoundError,
  GoalValidationError,
  GoalHierarchyError,
  PriorityCalculationError,
  ContextBuildError,
  PlanValidationError,
  PredictionError,
  HabitError,
  RecommendationError,
  AttentionTrackingError,
  ReflectionError,
  LearningGraphError,
  DecisionError,
  DailyBriefError,
  AssistantError,
  ContractNotAvailableError,
} from '../../../core/personal/errors.js';

// ── PersonalRuntimeError (base) ────────────────────────────────

describe('PersonalRuntimeError', () => {
  it('is an instance of Error', () => {
    const err = new PersonalRuntimeError('test', 'TEST_CODE');
    expect(err).toBeInstanceOf(Error);
  });

  it('has the correct name', () => {
    const err = new PersonalRuntimeError('test', 'TEST_CODE');
    expect(err.name).toBe('PersonalRuntimeError');
  });

  it('has the correct message', () => {
    const err = new PersonalRuntimeError('something broke', 'TEST_CODE');
    expect(err.message).toBe('something broke');
  });

  it('has the correct code', () => {
    const err = new PersonalRuntimeError('test', 'MY_CODE');
    expect(err.code).toBe('MY_CODE');
  });

  it('has empty details by default', () => {
    const err = new PersonalRuntimeError('test', 'CODE');
    expect(err.details).toEqual({});
  });

  it('accepts custom details', () => {
    const err = new PersonalRuntimeError('test', 'CODE', { key: 'value' });
    expect(err.details).toEqual({ key: 'value' });
  });
});

// ── GoalNotFoundError ──────────────────────────────────────────

describe('GoalNotFoundError', () => {
  it('is instanceof PersonalRuntimeError', () => {
    const err = new GoalNotFoundError('g-1');
    expect(err).toBeInstanceOf(PersonalRuntimeError);
  });

  it('is instanceof Error', () => {
    const err = new GoalNotFoundError('g-1');
    expect(err).toBeInstanceOf(Error);
  });

  it('has name GoalNotFoundError', () => {
    const err = new GoalNotFoundError('g-1');
    expect(err.name).toBe('GoalNotFoundError');
  });

  it('has code GOAL_NOT_FOUND', () => {
    const err = new GoalNotFoundError('g-1');
    expect(err.code).toBe('GOAL_NOT_FOUND');
  });

  it('stores goalId', () => {
    const err = new GoalNotFoundError('g-42');
    expect(err.goalId).toBe('g-42');
  });

  it('includes goalId in message', () => {
    const err = new GoalNotFoundError('g-99');
    expect(err.message).toContain('g-99');
  });
});

// ── GoalValidationError ────────────────────────────────────────

describe('GoalValidationError', () => {
  it('is instanceof PersonalRuntimeError', () => {
    const err = new GoalValidationError(['bad']);
    expect(err).toBeInstanceOf(PersonalRuntimeError);
  });

  it('has name GoalValidationError', () => {
    const err = new GoalValidationError(['bad']);
    expect(err.name).toBe('GoalValidationError');
  });

  it('has code GOAL_VALIDATION_ERROR', () => {
    const err = new GoalValidationError(['bad']);
    expect(err.code).toBe('GOAL_VALIDATION_ERROR');
  });

  it('stores violations array', () => {
    const violations = ['empty title', 'bad level'];
    const err = new GoalValidationError(violations);
    expect(err.violations).toEqual(['empty title', 'bad level']);
  });

  it('includes violations in message', () => {
    const err = new GoalValidationError(['title must be non-empty']);
    expect(err.message).toContain('title must be non-empty');
  });
});

// ── GoalHierarchyError ─────────────────────────────────────────

describe('GoalHierarchyError', () => {
  it('is instanceof PersonalRuntimeError', () => {
    const err = new GoalHierarchyError('child', 'parent');
    expect(err).toBeInstanceOf(PersonalRuntimeError);
  });

  it('has name GoalHierarchyError', () => {
    const err = new GoalHierarchyError('child', 'parent');
    expect(err.name).toBe('GoalHierarchyError');
  });

  it('has code GOAL_HIERARCHY_CYCLE', () => {
    const err = new GoalHierarchyError('child', 'parent');
    expect(err.code).toBe('GOAL_HIERARCHY_CYCLE');
  });

  it('stores goalId and parentId', () => {
    const err = new GoalHierarchyError('a', 'b');
    expect(err.goalId).toBe('a');
    expect(err.parentId).toBe('b');
  });
});

// ── PriorityCalculationError ───────────────────────────────────

describe('PriorityCalculationError', () => {
  it('is instanceof PersonalRuntimeError', () => {
    const err = new PriorityCalculationError('g-1');
    expect(err).toBeInstanceOf(PersonalRuntimeError);
  });

  it('has name PriorityCalculationError', () => {
    const err = new PriorityCalculationError('g-1');
    expect(err.name).toBe('PriorityCalculationError');
  });

  it('has code PRIORITY_CALCULATION_ERROR', () => {
    const err = new PriorityCalculationError('g-1');
    expect(err.code).toBe('PRIORITY_CALCULATION_ERROR');
  });

  it('stores goalId', () => {
    const err = new PriorityCalculationError('g-5');
    expect(err.goalId).toBe('g-5');
  });

  it('includes optional reason in message', () => {
    const err = new PriorityCalculationError('g-1', 'missing data');
    expect(err.message).toContain('missing data');
  });
});

// ── ContextBuildError ──────────────────────────────────────────

describe('ContextBuildError', () => {
  it('is instanceof PersonalRuntimeError', () => {
    const err = new ContextBuildError('memory');
    expect(err).toBeInstanceOf(PersonalRuntimeError);
  });

  it('has name ContextBuildError', () => {
    const err = new ContextBuildError('memory');
    expect(err.name).toBe('ContextBuildError');
  });

  it('has code CONTEXT_BUILD_ERROR', () => {
    const err = new ContextBuildError('memory');
    expect(err.code).toBe('CONTEXT_BUILD_ERROR');
  });

  it('stores contractName', () => {
    const err = new ContextBuildError('knowledge');
    expect(err.contractName).toBe('knowledge');
  });
});

// ── PlanValidationError ────────────────────────────────────────

describe('PlanValidationError', () => {
  it('is instanceof PersonalRuntimeError', () => {
    const err = new PlanValidationError(['bad plan']);
    expect(err).toBeInstanceOf(PersonalRuntimeError);
  });

  it('has name PlanValidationError', () => {
    const err = new PlanValidationError(['bad plan']);
    expect(err.name).toBe('PlanValidationError');
  });

  it('has code PLAN_VALIDATION_ERROR', () => {
    const err = new PlanValidationError(['bad plan']);
    expect(err.code).toBe('PLAN_VALIDATION_ERROR');
  });

  it('stores violations', () => {
    const err = new PlanValidationError(['no items']);
    expect(err.violations).toEqual(['no items']);
  });
});

// ── Simple message-only errors ─────────────────────────────────

describe('PredictionError', () => {
  it('is instanceof PersonalRuntimeError', () => {
    expect(new PredictionError()).toBeInstanceOf(PersonalRuntimeError);
  });

  it('has default message', () => {
    expect(new PredictionError().message).toBe('Prediction generation failed');
  });

  it('accepts custom message', () => {
    expect(new PredictionError('custom msg').message).toBe('custom msg');
  });

  it('has name PredictionError', () => {
    expect(new PredictionError().name).toBe('PredictionError');
  });
});

describe('HabitError', () => {
  it('is instanceof PersonalRuntimeError', () => {
    expect(new HabitError('h-1')).toBeInstanceOf(PersonalRuntimeError);
  });

  it('has code HABIT_ERROR', () => {
    expect(new HabitError('h-1').code).toBe('HABIT_ERROR');
  });

  it('stores habitId', () => {
    expect(new HabitError('h-2').habitId).toBe('h-2');
  });

  it('includes optional reason', () => {
    expect(new HabitError('h-1', 'timeout').message).toContain('timeout');
  });
});

describe('RecommendationError', () => {
  it('is instanceof PersonalRuntimeError', () => {
    expect(new RecommendationError('r-1')).toBeInstanceOf(PersonalRuntimeError);
  });

  it('has code RECOMMENDATION_ERROR', () => {
    expect(new RecommendationError('r-1').code).toBe('RECOMMENDATION_ERROR');
  });

  it('stores recommendationId', () => {
    expect(new RecommendationError('r-3').recommendationId).toBe('r-3');
  });
});

describe('AttentionTrackingError', () => {
  it('is instanceof PersonalRuntimeError', () => {
    expect(new AttentionTrackingError()).toBeInstanceOf(PersonalRuntimeError);
  });

  it('has default message', () => {
    expect(new AttentionTrackingError().message).toBe('Attention tracking failed');
  });

  it('has code ATTENTION_TRACKING_ERROR', () => {
    expect(new AttentionTrackingError().code).toBe('ATTENTION_TRACKING_ERROR');
  });
});

describe('ReflectionError', () => {
  it('is instanceof PersonalRuntimeError', () => {
    expect(new ReflectionError()).toBeInstanceOf(PersonalRuntimeError);
  });

  it('has default message', () => {
    expect(new ReflectionError().message).toBe('Reflection operation failed');
  });

  it('has code REFLECTION_ERROR', () => {
    expect(new ReflectionError().code).toBe('REFLECTION_ERROR');
  });
});

describe('LearningGraphError', () => {
  it('is instanceof PersonalRuntimeError', () => {
    expect(new LearningGraphError('l-1')).toBeInstanceOf(PersonalRuntimeError);
  });

  it('has code LEARNING_GRAPH_ERROR', () => {
    expect(new LearningGraphError('l-1').code).toBe('LEARNING_GRAPH_ERROR');
  });

  it('stores itemId', () => {
    expect(new LearningGraphError('l-5').itemId).toBe('l-5');
  });
});

describe('DecisionError', () => {
  it('is instanceof PersonalRuntimeError', () => {
    expect(new DecisionError('d-1')).toBeInstanceOf(PersonalRuntimeError);
  });

  it('has code DECISION_ERROR', () => {
    expect(new DecisionError('d-1').code).toBe('DECISION_ERROR');
  });

  it('stores decisionId', () => {
    expect(new DecisionError('d-2').decisionId).toBe('d-2');
  });
});

describe('DailyBriefError', () => {
  it('is instanceof PersonalRuntimeError', () => {
    expect(new DailyBriefError()).toBeInstanceOf(PersonalRuntimeError);
  });

  it('has default message', () => {
    expect(new DailyBriefError().message).toBe('Daily brief operation failed');
  });

  it('has code DAILY_BRIEF_ERROR', () => {
    expect(new DailyBriefError().code).toBe('DAILY_BRIEF_ERROR');
  });
});

describe('AssistantError', () => {
  it('is instanceof PersonalRuntimeError', () => {
    expect(new AssistantError()).toBeInstanceOf(PersonalRuntimeError);
  });

  it('has default message', () => {
    expect(new AssistantError().message).toBe('Assistant operation failed');
  });

  it('has code ASSISTANT_ERROR', () => {
    expect(new AssistantError().code).toBe('ASSISTANT_ERROR');
  });
});

describe('ContractNotAvailableError', () => {
  it('is instanceof PersonalRuntimeError', () => {
    expect(new ContractNotAvailableError('memory')).toBeInstanceOf(PersonalRuntimeError);
  });

  it('has name ContractNotAvailableError', () => {
    expect(new ContractNotAvailableError('memory').name).toBe('ContractNotAvailableError');
  });

  it('has code CONTRACT_NOT_AVAILABLE', () => {
    expect(new ContractNotAvailableError('memory').code).toBe('CONTRACT_NOT_AVAILABLE');
  });

  it('stores contractName', () => {
    expect(new ContractNotAvailableError('desktop').contractName).toBe('desktop');
  });
});
