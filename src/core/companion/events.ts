/**
 * AIS Companion — Domain Events
 * TASK-AIS-011A.000
 */

import type { DomainEventBase } from '../domain/events/domain-event.js';

export interface CompanionInitializedEvent extends DomainEventBase {
  readonly eventType: 'companion.initialized';
  readonly sessionId: string;
  readonly userId: string;
}

export interface CompanionShutdownEvent extends DomainEventBase {
  readonly eventType: 'companion.shutdown';
  readonly sessionId: string;
  readonly durationMs: number;
}

export interface NavigationChangedEvent extends DomainEventBase {
  readonly eventType: 'companion.navigation.changed';
  readonly sessionId: string;
  readonly fromSection: string;
  readonly toSection: string;
}

export interface WorkspaceCreatedEvent extends DomainEventBase {
  readonly eventType: 'companion.workspace.created';
  readonly workspaceId: string;
  readonly userId: string;
  readonly label: string;
}

export interface WorkspaceUpdatedEvent extends DomainEventBase {
  readonly eventType: 'companion.workspace.updated';
  readonly workspaceId: string;
  readonly userId: string;
}

export interface ConversationCreatedEvent extends DomainEventBase {
  readonly eventType: 'companion.conversation.created';
  readonly conversationId: string;
  readonly sessionId: string;
  readonly userId: string;
  readonly title: string;
}

export interface MessageAddedEvent extends DomainEventBase {
  readonly eventType: 'companion.conversation.messageAdded';
  readonly conversationId: string;
  readonly messageId: string;
  readonly role: string;
}

export interface GoalCreatedEvent extends DomainEventBase {
  readonly eventType: 'companion.goal.created';
  readonly goalId: string;
  readonly sessionId: string;
  readonly userId: string;
  readonly title: string;
  readonly priority: string;
}

export interface GoalUpdatedEvent extends DomainEventBase {
  readonly eventType: 'companion.goal.updated';
  readonly goalId: string;
  readonly sessionId: string;
  readonly changes: ReadonlyArray<string>;
}

export interface GoalCompletedEvent extends DomainEventBase {
  readonly eventType: 'companion.goal.completed';
  readonly goalId: string;
  readonly sessionId: string;
  readonly durationMs: number;
}

export interface DailyPlanCreatedEvent extends DomainEventBase {
  readonly eventType: 'companion.dailyplan.created';
  readonly planId: string;
  readonly sessionId: string;
  readonly userId: string;
  readonly date: string;
}

export interface DailyTaskAddedEvent extends DomainEventBase {
  readonly eventType: 'companion.dailyplan.taskAdded';
  readonly planId: string;
  readonly taskId: string;
  readonly title: string;
}

export interface DailyTaskCompletedEvent extends DomainEventBase {
  readonly eventType: 'companion.dailyplan.taskCompleted';
  readonly planId: string;
  readonly taskId: string;
}

export interface SolutionCreatedEvent extends DomainEventBase {
  readonly eventType: 'companion.solution.created';
  readonly solutionId: string;
  readonly sessionId: string;
  readonly userId: string;
  readonly title: string;
}

export interface SolutionCompletedEvent extends DomainEventBase {
  readonly eventType: 'companion.solution.completed';
  readonly solutionId: string;
  readonly sessionId: string;
  readonly durationMs: number;
}

export interface SolutionCancelledEvent extends DomainEventBase {
  readonly eventType: 'companion.solution.cancelled';
  readonly solutionId: string;
  readonly sessionId: string;
  readonly reason: string;
}

export interface InsightGeneratedEvent extends DomainEventBase {
  readonly eventType: 'companion.insight.generated';
  readonly insightId: string;
  readonly sessionId: string;
  readonly type: string;
  readonly confidence: number;
}

export interface NotificationCreatedEvent extends DomainEventBase {
  readonly eventType: 'companion.notification.created';
  readonly notificationId: string;
  readonly sessionId: string;
  readonly priority: string;
}

export interface NotificationReadEvent extends DomainEventBase {
  readonly eventType: 'companion.notification.read';
  readonly notificationId: string;
  readonly sessionId: string;
}

export interface RecommendationCreatedEvent extends DomainEventBase {
  readonly eventType: 'companion.recommendation.created';
  readonly recommendationId: string;
  readonly sessionId: string;
  readonly category: string;
  readonly valueScore: number;
}

export interface ExplainabilityRecordCreatedEvent extends DomainEventBase {
  readonly eventType: 'companion.explainability.recordCreated';
  readonly recordId: string;
  readonly recommendationId: string;
  readonly level: string;
}

export interface StateTransitionEvent extends DomainEventBase {
  readonly eventType: 'companion.state.transition';
  readonly sessionId: string;
  readonly fromState: string;
  readonly toState: string;
}

export interface CapabilityInstalledEvent extends DomainEventBase {
  readonly eventType: 'companion.capability.installed';
  readonly capabilityId: string;
  readonly sessionId: string;
}

export interface CapabilityRemovedEvent extends DomainEventBase {
  readonly eventType: 'companion.capability.removed';
  readonly capabilityId: string;
  readonly sessionId: string;
}

export interface KnowledgeEntryAddedEvent extends DomainEventBase {
  readonly eventType: 'companion.knowledge.entryAdded';
  readonly entryId: string;
  readonly sessionId: string;
  readonly category: string;
}

export interface AIControlChangedEvent extends DomainEventBase {
  readonly eventType: 'companion.aicontrol.changed';
  readonly sessionId: string;
  readonly fromLevel: string;
  readonly toLevel: string;
}

export interface MetricsSnapshotEvent extends DomainEventBase {
  readonly eventType: 'companion.metrics.snapshot';
  readonly sessionId: string;
  readonly totalGoals: number;
  readonly completedGoals: number;
  readonly totalSolutions: number;
  readonly totalInsights: number;
}

export interface MarketplaceBrowsedEvent extends DomainEventBase {
  readonly eventType: 'companion.marketplace.browsed';
  readonly sessionId: string;
  readonly query: string;
  readonly resultCount: number;
}

export interface MarketplaceInstalledEvent extends DomainEventBase {
  readonly eventType: 'companion.marketplace.installed';
  readonly sessionId: string;
  readonly listingId: string;
  readonly listingTitle: string;
}

export type CompanionEvent =
  | CompanionInitializedEvent
  | CompanionShutdownEvent
  | NavigationChangedEvent
  | WorkspaceCreatedEvent
  | WorkspaceUpdatedEvent
  | ConversationCreatedEvent
  | MessageAddedEvent
  | GoalCreatedEvent
  | GoalUpdatedEvent
  | GoalCompletedEvent
  | DailyPlanCreatedEvent
  | DailyTaskAddedEvent
  | DailyTaskCompletedEvent
  | SolutionCreatedEvent
  | SolutionCompletedEvent
  | SolutionCancelledEvent
  | InsightGeneratedEvent
  | NotificationCreatedEvent
  | NotificationReadEvent
  | RecommendationCreatedEvent
  | ExplainabilityRecordCreatedEvent
  | StateTransitionEvent
  | CapabilityInstalledEvent
  | CapabilityRemovedEvent
  | KnowledgeEntryAddedEvent
  | AIControlChangedEvent
  | MetricsSnapshotEvent
  | MarketplaceBrowsedEvent
  | MarketplaceInstalledEvent;
