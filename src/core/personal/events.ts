/**
 * Personal Intelligence Runtime — Domain Events
 *
 * Events published by the Personal Intelligence Runtime following
 * ADR-002 (Event Bus). All events extend DomainEventBase and carry
 * typed payloads.
 * INV-012: No domain event without a classification.
 */
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { Timestamp } from '../types/common.js';

// ─── Goal Events ─────────────────────────────────────────────

/** Classification: StateChange — a new goal was created */
export interface GoalCreated extends DomainEventBase {
  readonly eventType: 'GoalCreated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly goalId: string;
    readonly title: string;
    readonly level: string;
    readonly parentId: string | null;
    readonly createdAt: Timestamp;
  };
}

/** Classification: StateChange — a goal's mutable fields were updated */
export interface GoalUpdated extends DomainEventBase {
  readonly eventType: 'GoalUpdated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly goalId: string;
    readonly changedAttributes: readonly string[];
    readonly updatedAt: Timestamp;
  };
}

/** Classification: StateChange — a goal transitioned between statuses */
export interface GoalStatusChanged extends DomainEventBase {
  readonly eventType: 'GoalStatusChanged';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly goalId: string;
    readonly oldStatus: string;
    readonly newStatus: string;
    readonly changedAt: Timestamp;
  };
}

/** Classification: Result — a goal was marked as completed */
export interface GoalCompleted extends DomainEventBase {
  readonly eventType: 'GoalCompleted';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly goalId: string;
    readonly title: string;
    readonly completedAt: Timestamp;
  };
}

/** Classification: StateChange — a goal was archived */
export interface GoalArchived extends DomainEventBase {
  readonly eventType: 'GoalArchived';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly goalId: string;
    readonly archivedAt: Timestamp;
  };
}

// ─── Priority Events ──────────────────────────────────────────

/** Classification: Result — priority scores were calculated for a set of goals */
export interface PriorityCalculated extends DomainEventBase {
  readonly eventType: 'PriorityCalculated';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly goalIds: readonly string[];
    readonly topGoalId: string;
    readonly calculatedAt: Timestamp;
  };
}

/** Classification: StateChange — a goal's priority rank changed */
export interface PriorityChanged extends DomainEventBase {
  readonly eventType: 'PriorityChanged';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly goalId: string;
    readonly oldRank: number;
    readonly newRank: number;
    readonly oldScore: number;
    readonly newScore: number;
    readonly changedAt: Timestamp;
  };
}

// ─── Context Events ───────────────────────────────────────────

/** Classification: StateChange — the unified context was updated */
export interface ContextUpdated extends DomainEventBase {
  readonly eventType: 'ContextUpdated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly userId: string;
    readonly changedSnapshots: readonly string[];
    readonly updatedAt: Timestamp;
  };
}

/** Classification: Info — a full context refresh was performed */
export interface ContextRefreshed extends DomainEventBase {
  readonly eventType: 'ContextRefreshed';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly userId: string;
    readonly refreshedAt: Timestamp;
  };
}

// ─── Plan Events ──────────────────────────────────────────────

/** Classification: StateChange — a new plan was created */
export interface PlanCreated extends DomainEventBase {
  readonly eventType: 'PlanCreated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly planId: string;
    readonly period: string;
    readonly goalId: string | null;
    readonly itemCount: number;
    readonly createdAt: Timestamp;
  };
}

/** Classification: StateChange — a plan was modified */
export interface PlanUpdated extends DomainEventBase {
  readonly eventType: 'PlanUpdated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly planId: string;
    readonly changedAttributes: readonly string[];
    readonly updatedAt: Timestamp;
  };
}

/** Classification: Result — a plan item was marked as done */
export interface PlanItemCompleted extends DomainEventBase {
  readonly eventType: 'PlanItemCompleted';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly planId: string;
    readonly planItemId: string;
    readonly title: string;
    readonly completedAt: Timestamp;
  };
}

// ─── Prediction Events ────────────────────────────────────────

/** Classification: Info — a new prediction was generated */
export interface PredictionGenerated extends DomainEventBase {
  readonly eventType: 'PredictionGenerated';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly predictionId: string;
    readonly type: string;
    readonly value: string;
    readonly confidence: number;
    readonly predictedAt: Timestamp;
  };
}

/** Classification: Result — a prediction was validated against actual behavior */
export interface PredictionValidated extends DomainEventBase {
  readonly eventType: 'PredictionValidated';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly predictionId: string;
    readonly correct: boolean;
    readonly actualValue: string;
    readonly validatedAt: Timestamp;
  };
}

// ─── Habit Events ─────────────────────────────────────────────

/** Classification: Info — a new recurring pattern was detected */
export interface HabitDetected extends DomainEventBase {
  readonly eventType: 'HabitDetected';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly habitId: string;
    readonly name: string;
    readonly frequency: string;
    readonly confidence: number;
    readonly detectedAt: Timestamp;
  };
}

/** Classification: StateChange — a detected habit was confirmed by the user */
export interface HabitConfirmed extends DomainEventBase {
  readonly eventType: 'HabitConfirmed';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly habitId: string;
    readonly confirmedAt: Timestamp;
  };
}

/** Classification: Info — a previously detected habit pattern was broken */
export interface HabitBroken extends DomainEventBase {
  readonly eventType: 'HabitBroken';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly habitId: string;
    readonly name: string;
    readonly brokenAt: Timestamp;
  };
}

// ─── Recommendation Events ────────────────────────────────────

/** Classification: Info — a new recommendation was generated */
export interface RecommendationGenerated extends DomainEventBase {
  readonly eventType: 'RecommendationGenerated';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly recommendationId: string;
    readonly type: string;
    readonly title: string;
    readonly confidence: number;
    readonly createdAt: Timestamp;
  };
}

/** Classification: Action — the user accepted a recommendation */
export interface RecommendationAccepted extends DomainEventBase {
  readonly eventType: 'RecommendationAccepted';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly recommendationId: string;
    readonly acceptedAt: Timestamp;
  };
}

/** Classification: Action — the user dismissed a recommendation */
export interface RecommendationDismissed extends DomainEventBase {
  readonly eventType: 'RecommendationDismissed';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly recommendationId: string;
    readonly dismissedAt: Timestamp;
  };
}

// ─── Attention Events ─────────────────────────────────────────

/** Classification: StateChange — the user's attention state changed */
export interface AttentionChanged extends DomainEventBase {
  readonly eventType: 'AttentionChanged';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly oldState: string;
    readonly newState: string;
    readonly cognitiveLoad: number;
    readonly changedAt: Timestamp;
  };
}

/** Classification: Error — an attention alert condition was detected */
export interface AttentionAlert extends DomainEventBase {
  readonly eventType: 'AttentionAlert';
  readonly classification: EventClassification.Error;
  readonly payload: {
    readonly state: string;
    readonly reason: string;
    readonly cognitiveLoad: number;
    readonly alertedAt: Timestamp;
  };
}

// ─── Reflection Events ────────────────────────────────────────

/** Classification: Info — a reflection was generated for a time period */
export interface ReflectionGenerated extends DomainEventBase {
  readonly eventType: 'ReflectionGenerated';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly reflectionId: string;
    readonly period: string;
    readonly date: string;
    readonly score: number;
    readonly createdAt: Timestamp;
  };
}

/** Classification: Result — a reflection was scored/graded */
export interface ReflectionScored extends DomainEventBase {
  readonly eventType: 'ReflectionScored';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly reflectionId: string;
    readonly score: number;
    readonly scoredAt: Timestamp;
  };
}

// ─── Learning Events ──────────────────────────────────────────

/** Classification: StateChange — a learning item's status or confidence changed */
export interface LearningItemUpdated extends DomainEventBase {
  readonly eventType: 'LearningItemUpdated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly itemId: string;
    readonly topic: string;
    readonly oldStatus: string;
    readonly newStatus: string;
    readonly confidence: number;
    readonly updatedAt: Timestamp;
  };
}

/** Classification: StateChange — the learning graph was structurally modified */
export interface LearningGraphUpdated extends DomainEventBase {
  readonly eventType: 'LearningGraphUpdated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly nodeCount: number;
    readonly edgeCount: number;
    readonly updatedAt: Timestamp;
  };
}

// ─── Decision Events ──────────────────────────────────────────

/** Classification: StateChange — a new decision was created */
export interface DecisionCreated extends DomainEventBase {
  readonly eventType: 'DecisionCreated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly decisionId: string;
    readonly title: string;
    readonly method: string;
    readonly optionCount: number;
    readonly createdAt: Timestamp;
  };
}

/** Classification: Result — a decision was resolved with a conclusion */
export interface DecisionResolved extends DomainEventBase {
  readonly eventType: 'DecisionResolved';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly decisionId: string;
    readonly conclusion: string;
    readonly resolvedAt: Timestamp;
  };
}

// ─── Daily Brief Events ───────────────────────────────────────

/** Classification: Info — a daily brief was generated */
export interface DailyBriefGenerated extends DomainEventBase {
  readonly eventType: 'DailyBriefGenerated';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly briefId: string;
    readonly type: string;
    readonly date: string;
    readonly createdAt: Timestamp;
  };
}

/** Classification: Action — a daily brief was delivered to the user */
export interface DailyBriefDelivered extends DomainEventBase {
  readonly eventType: 'DailyBriefDelivered';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly briefId: string;
    readonly type: string;
    readonly deliveredAt: Timestamp;
  };
}

// ─── Assistant Events ─────────────────────────────────────────

/** Classification: StateChange — the personal assistant state changed */
export interface AssistantStateChanged extends DomainEventBase {
  readonly eventType: 'AssistantStateChanged';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly active: boolean;
    readonly userId: string | null;
    readonly changedAt: Timestamp;
  };
}

// ─── Profile Events ───────────────────────────────────────────

/** Classification: StateChange — the user profile was updated */
export interface ProfileUpdated extends DomainEventBase {
  readonly eventType: 'ProfileUpdated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly userId: string;
    readonly changedAttributes: readonly string[];
    readonly updatedAt: Timestamp;
  };
}

/** Classification: StateChange — the personal context snapshot changed */
export interface PersonalContextChanged extends DomainEventBase {
  readonly eventType: 'PersonalContextChanged';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly userId: string;
    readonly focus: string | null;
    readonly activityType: string;
    readonly changedAt: Timestamp;
  };
}

// ─── Union type ────────────────────────────────────────────────

/** Union of all PIR domain events. */
export type PersonalEvent =
  | GoalCreated
  | GoalUpdated
  | GoalStatusChanged
  | GoalCompleted
  | GoalArchived
  | PriorityCalculated
  | PriorityChanged
  | ContextUpdated
  | ContextRefreshed
  | PlanCreated
  | PlanUpdated
  | PlanItemCompleted
  | PredictionGenerated
  | PredictionValidated
  | HabitDetected
  | HabitConfirmed
  | HabitBroken
  | RecommendationGenerated
  | RecommendationAccepted
  | RecommendationDismissed
  | AttentionChanged
  | AttentionAlert
  | ReflectionGenerated
  | ReflectionScored
  | LearningItemUpdated
  | LearningGraphUpdated
  | DecisionCreated
  | DecisionResolved
  | DailyBriefGenerated
  | DailyBriefDelivered
  | AssistantStateChanged
  | ProfileUpdated
  | PersonalContextChanged;

/**
 * Create a personal event base envelope.
 * Used by PersonalRuntime to publish consistent events.
 * Follows the same pattern as identity/events.ts createIdentityEventBase.
 */
export function createPersonalEventBase(
  eventType: string,
  classification: EventClassification,
  aggregateId: string,
): {
  eventId: string;
  eventType: string;
  classification: EventClassification;
  timestamp: string;
  aggregateId: string;
  aggregateType: string;
} {
  return {
    eventId: crypto.randomUUID(),
    eventType,
    classification,
    timestamp: new Date().toISOString(),
    aggregateId,
    aggregateType: 'Personal',
  };
}
