/**
 * Personal Intelligence Capability Pack — Domain Events
 * TASK-AIS-007A.000
 *
 * Events published by the pack following ADR-002 (Event Bus).
 * All events extend DomainEventBase and carry typed payloads.
 * INV-012: No domain event without a classification.
 */
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { Timestamp } from '../types/common.js';

// ─── Pack Lifecycle Events ───────────────────────────────────

/** Classification: StateChange — pack was created */
export interface PackCreated extends DomainEventBase {
  readonly eventType: 'PackCreated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly packId: string;
    readonly createdAt: Timestamp;
  };
}

/** Classification: StateChange — pack state transitioned */
export interface PackStateChanged extends DomainEventBase {
  readonly eventType: 'PackStateChanged';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly packId: string;
    readonly oldState: string;
    readonly newState: string;
    readonly changedAt: Timestamp;
  };
}

/** Classification: StateChange — pack was initialized */
export interface PackInitialized extends DomainEventBase {
  readonly eventType: 'PackInitialized';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly packId: string;
    readonly subsystemCount: number;
    readonly initializedAt: Timestamp;
  };
}

// ─── Daily Brief Events ──────────────────────────────────────

/** Classification: Info — a brief was generated */
export interface BriefGenerated extends DomainEventBase {
  readonly eventType: 'BriefGenerated';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly briefId: string;
    readonly briefType: string;
    readonly date: string;
    readonly itemCount: number;
    readonly productivityIndex: number;
    readonly developmentIndex: number;
    readonly generatedAt: Timestamp;
  };
}

/** Classification: Action — a brief was delivered */
export interface BriefDelivered extends DomainEventBase {
  readonly eventType: 'BriefDelivered';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly briefId: string;
    readonly deliveredAt: Timestamp;
  };
}

// ─── Reflection Events ───────────────────────────────────────

/** Classification: Info — a reflection was generated */
export interface ReflectionGenerated extends DomainEventBase {
  readonly eventType: 'ReflectionGenerated';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly reflectionId: string;
    readonly period: string;
    readonly date: string;
    readonly score: number;
    readonly sentiment: string;
    readonly generatedAt: Timestamp;
  };
}

// ─── Goal Events ─────────────────────────────────────────────

/** Classification: StateChange — a goal was created */
export interface PackGoalCreated extends DomainEventBase {
  readonly eventType: 'PackGoalCreated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly goalId: string;
    readonly title: string;
    readonly level: string;
    readonly parentId: string | null;
    readonly createdAt: Timestamp;
  };
}

/** Classification: StateChange — a goal was updated */
export interface PackGoalUpdated extends DomainEventBase {
  readonly eventType: 'PackGoalUpdated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly goalId: string;
    readonly changedAttributes: readonly string[];
    readonly updatedAt: Timestamp;
  };
}

/** Classification: StateChange — a goal status changed */
export interface PackGoalStatusChanged extends DomainEventBase {
  readonly eventType: 'PackGoalStatusChanged';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly goalId: string;
    readonly oldStatus: string;
    readonly newStatus: string;
    readonly changedAt: Timestamp;
  };
}

/** Classification: Result — a goal was completed */
export interface PackGoalCompleted extends DomainEventBase {
  readonly eventType: 'PackGoalCompleted';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly goalId: string;
    readonly title: string;
    readonly completedAt: Timestamp;
  };
}

// ─── Decision Events ─────────────────────────────────────────

/** Classification: StateChange — a decision was created */
export interface PackDecisionCreated extends DomainEventBase {
  readonly eventType: 'PackDecisionCreated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly decisionId: string;
    readonly title: string;
    readonly optionCount: number;
    readonly createdAt: Timestamp;
  };
}

/** Classification: Result — a decision was resolved */
export interface PackDecisionResolved extends DomainEventBase {
  readonly eventType: 'PackDecisionResolved';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly decisionId: string;
    readonly conclusion: string;
    readonly resolvedAt: Timestamp;
  };
}

// ─── Constraint Events ───────────────────────────────────────

/** Classification: Info — a constraint was detected */
export interface ConstraintDetected extends DomainEventBase {
  readonly eventType: 'ConstraintDetected';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly constraintId: string;
    readonly title: string;
    readonly severity: string;
    readonly goalId: string | null;
    readonly detectedAt: Timestamp;
  };
}

/** Classification: Result — a constraint was resolved */
export interface ConstraintResolved extends DomainEventBase {
  readonly eventType: 'ConstraintResolved';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly constraintId: string;
    readonly title: string;
    readonly resolvedAt: Timestamp;
  };
}

/** Classification: StateChange — a constraint lifecycle changed */
export interface ConstraintLifecycleChanged extends DomainEventBase {
  readonly eventType: 'ConstraintLifecycleChanged';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly constraintId: string;
    readonly oldLifecycle: string;
    readonly newLifecycle: string;
    readonly changedAt: Timestamp;
  };
}

// ─── Value Events ────────────────────────────────────────────

/** Classification: Info — a value assessment was created */
export interface ValueAssessmentCreated extends DomainEventBase {
  readonly eventType: 'ValueAssessmentCreated';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly assessmentId: string;
    readonly dimension: string;
    readonly confidence: number;
    readonly createdAt: Timestamp;
  };
}

// ─── Recommendation Events ───────────────────────────────────

/** Classification: Info — a recommendation was composed */
export interface RecommendationComposed extends DomainEventBase {
  readonly eventType: 'RecommendationComposed';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly recommendationId: string;
    readonly title: string;
    readonly chainComplete: boolean;
    readonly confidence: number;
    readonly composedAt: Timestamp;
  };
}

/** Classification: Action — a recommendation was presented */
export interface RecommendationPresented extends DomainEventBase {
  readonly eventType: 'RecommendationPresented';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly recommendationId: string;
    readonly presentedAt: Timestamp;
  };
}

/** Classification: Action — a recommendation was accepted */
export interface RecommendationAccepted extends DomainEventBase {
  readonly eventType: 'RecommendationAccepted';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly recommendationId: string;
    readonly acceptedAt: Timestamp;
  };
}

/** Classification: Action — a recommendation was rejected */
export interface RecommendationRejected extends DomainEventBase {
  readonly eventType: 'RecommendationRejected';
  readonly classification: EventClassification.Action;
  readonly payload: {
    readonly recommendationId: string;
    readonly reason: string;
    readonly rejectedAt: Timestamp;
  };
}

/** Classification: Info — a recommendation was rejected at chain stage */
export interface RecommendationChainBroken extends DomainEventBase {
  readonly eventType: 'RecommendationChainBroken';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly recommendationId: string;
    readonly failedStage: string;
    readonly reason: string;
    readonly brokenAt: Timestamp;
  };
}

// ─── Knowledge Events ────────────────────────────────────────

/** Classification: StateChange — a knowledge node was created */
export interface KnowledgeNodeCreated extends DomainEventBase {
  readonly eventType: 'KnowledgeNodeCreated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly nodeId: string;
    readonly type: string;
    readonly title: string;
    readonly createdAt: Timestamp;
  };
}

/** Classification: StateChange — a knowledge edge was created */
export interface KnowledgeEdgeCreated extends DomainEventBase {
  readonly eventType: 'KnowledgeEdgeCreated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly edgeId: string;
    readonly sourceId: string;
    readonly targetId: string;
    readonly edgeType: string;
    readonly createdAt: Timestamp;
  };
}

// ─── Conversation Events ─────────────────────────────────────

/** Classification: Info — a conversation was interpreted */
export interface ConversationInterpreted extends DomainEventBase {
  readonly eventType: 'ConversationInterpreted';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly interpretationId: string;
    readonly intent: string;
    readonly confidence: number;
    readonly interpretedAt: Timestamp;
  };
}

// ─── Habit Events ────────────────────────────────────────────

/** Classification: Info — a habit insight was detected */
export interface HabitInsightDetected extends DomainEventBase {
  readonly eventType: 'HabitInsightDetected';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly habitId: string;
    readonly name: string;
    readonly strength: string;
    readonly direction: string;
    readonly detectedAt: Timestamp;
  };
}

// ─── Priority Events ─────────────────────────────────────────

/** Classification: Result — priorities were recalculated */
export interface PrioritiesCalculated extends DomainEventBase {
  readonly eventType: 'PrioritiesCalculated';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly goalCount: number;
    readonly topGoalId: string;
    readonly calculatedAt: Timestamp;
  };
}

// ─── Dashboard Events ────────────────────────────────────────

/** Classification: Result — a dashboard was generated */
export interface DashboardGenerated extends DomainEventBase {
  readonly eventType: 'DashboardGenerated';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly dashboardId: string;
    readonly productivityIndex: number;
    readonly developmentIndex: number;
    readonly generatedAt: Timestamp;
  };
}

// ─── First Intelligence Events ───────────────────────────────

/** Classification: StateChange — first intelligence session started */
export interface FirstIntelligenceStarted extends DomainEventBase {
  readonly eventType: 'FirstIntelligenceStarted';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly sessionId: string;
    readonly questionCount: number;
    readonly startedAt: Timestamp;
  };
}

/** Classification: Result — first intelligence report generated */
export interface FirstIntelligenceCompleted extends DomainEventBase {
  readonly eventType: 'FirstIntelligenceCompleted';
  readonly classification: EventClassification.Result;
  readonly payload: {
    readonly sessionId: string;
    readonly primaryInsight: string;
    readonly mainConstraintId: string;
    readonly completedAt: Timestamp;
  };
}

// ─── Union type ────────────────────────────────────────────────

/** Union of all pack domain events. */
export type PersonalIntelligenceEvent =
  | PackCreated
  | PackStateChanged
  | PackInitialized
  | BriefGenerated
  | BriefDelivered
  | ReflectionGenerated
  | PackGoalCreated
  | PackGoalUpdated
  | PackGoalStatusChanged
  | PackGoalCompleted
  | PackDecisionCreated
  | PackDecisionResolved
  | ConstraintDetected
  | ConstraintResolved
  | ConstraintLifecycleChanged
  | ValueAssessmentCreated
  | RecommendationComposed
  | RecommendationPresented
  | RecommendationAccepted
  | RecommendationRejected
  | RecommendationChainBroken
  | KnowledgeNodeCreated
  | KnowledgeEdgeCreated
  | ConversationInterpreted
  | HabitInsightDetected
  | PrioritiesCalculated
  | DashboardGenerated
  | FirstIntelligenceStarted
  | FirstIntelligenceCompleted;

/**
 * Create a pack event base envelope.
 * Used by subsystems to publish consistent events.
 */
export function createPackEventBase(
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
    aggregateType: 'PersonalIntelligencePack',
  };
}
