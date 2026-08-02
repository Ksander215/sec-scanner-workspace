/**
 * AIS Companion — Error Classes
 * TASK-AIS-011A.000
 * PHI-007: Never use `name` as a field — use domain-specific names.
 */

export class CompanionError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export class CompanionInitializationError extends CompanionError {
  readonly stage: string;
  readonly details: Readonly<Record<string, unknown>>;
  constructor(stage: string, details: Record<string, unknown> = {}) {
    super('COMPANION_INIT_ERROR', `Companion initialization failed at stage: ${stage}`);
    this.stage = stage;
    this.details = Object.freeze(details);
  }
}

export class SessionNotFoundError extends CompanionError {
  readonly sessionId: string;
  constructor(sessionId: string) {
    super('SESSION_NOT_FOUND', `Session not found: ${sessionId}`);
    this.sessionId = sessionId;
  }
}

export class WorkspaceNotFoundError extends CompanionError {
  readonly workspaceId: string;
  constructor(workspaceId: string) {
    super('WORKSPACE_NOT_FOUND', `Workspace not found: ${workspaceId}`);
    this.workspaceId = workspaceId;
  }
}

export class ConversationNotFoundError extends CompanionError {
  readonly conversationId: string;
  constructor(conversationId: string) {
    super('CONVERSATION_NOT_FOUND', `Conversation not found: ${conversationId}`);
    this.conversationId = conversationId;
  }
}

export class GoalNotFoundError extends CompanionError {
  readonly goalId: string;
  constructor(goalId: string) {
    super('GOAL_NOT_FOUND', `Goal not found: ${goalId}`);
    this.goalId = goalId;
  }
}

export class DailyPlanNotFoundError extends CompanionError {
  readonly planId: string;
  constructor(planId: string) {
    super('DAILY_PLAN_NOT_FOUND', `Daily plan not found: ${planId}`);
    this.planId = planId;
  }
}

export class SolutionNotFoundError extends CompanionError {
  readonly solutionId: string;
  constructor(solutionId: string) {
    super('SOLUTION_NOT_FOUND', `Solution not found: ${solutionId}`);
    this.solutionId = solutionId;
  }
}

export class InsightNotFoundError extends CompanionError {
  readonly insightId: string;
  constructor(insightId: string) {
    super('INSIGHT_NOT_FOUND', `Insight not found: ${insightId}`);
    this.insightId = insightId;
  }
}

export class NotificationNotFoundError extends CompanionError {
  readonly notificationId: string;
  constructor(notificationId: string) {
    super('NOTIFICATION_NOT_FOUND', `Notification not found: ${notificationId}`);
    this.notificationId = notificationId;
  }
}

export class RecommendationNotFoundError extends CompanionError {
  readonly recommendationId: string;
  constructor(recommendationId: string) {
    super('RECOMMENDATION_NOT_FOUND', `Recommendation not found: ${recommendationId}`);
    this.recommendationId = recommendationId;
  }
}

export class StateTransitionError extends CompanionError {
  readonly fromState: string;
  readonly toState: string;
  readonly reason: string;
  constructor(from: string, to: string, reason: string = '') {
    super('STATE_TRANSITION_ERROR', `Invalid transition from ${from} to ${to}${reason ? ': ' + reason : ''}`);
    this.fromState = from;
    this.toState = to;
    this.reason = reason;
  }
}

export class NavigationError extends CompanionError {
  readonly section: string;
  constructor(section: string, reason: string = '') {
    super('NAVIGATION_ERROR', `Navigation error for section ${section}${reason ? ': ' + reason : ''}`);
    this.section = section;
  }
}

export class ConversationLimitExceededError extends CompanionError {
  readonly limit: number;
  readonly current: number;
  constructor(limit: number, current: number) {
    super('CONVERSATION_LIMIT', `Conversation limit exceeded: ${current}/${limit}`);
    this.limit = limit;
    this.current = current;
  }
}

export class GoalLimitExceededError extends CompanionError {
  readonly limit: number;
  readonly current: number;
  constructor(limit: number, current: number) {
    super('GOAL_LIMIT', `Goal limit exceeded: ${current}/${limit}`);
    this.limit = limit;
    this.current = current;
  }
}

export class SolutionLimitExceededError extends CompanionError {
  readonly limit: number;
  readonly current: number;
  constructor(limit: number, current: number) {
    super('SOLUTION_LIMIT', `Solution limit exceeded: ${current}/${limit}`);
    this.limit = limit;
    this.current = current;
  }
}

export class InsightLimitExceededError extends CompanionError {
  readonly limit: number;
  readonly current: number;
  constructor(limit: number, current: number) {
    super('INSIGHT_LIMIT', `Insight limit exceeded: ${current}/${limit}`);
    this.limit = limit;
    this.current = current;
  }
}

export class NotificationLimitExceededError extends CompanionError {
  readonly limit: number;
  readonly current: number;
  constructor(limit: number, current: number) {
    super('NOTIFICATION_LIMIT', `Notification limit exceeded: ${current}/${limit}`);
    this.limit = limit;
    this.current = current;
  }
}

export class WorkspaceLimitExceededError extends CompanionError {
  readonly limit: number;
  readonly current: number;
  constructor(limit: number, current: number) {
    super('WORKSPACE_LIMIT', `Workspace limit exceeded: ${current}/${limit}`);
    this.limit = limit;
    this.current = current;
  }
}

export class TaskLimitExceededError extends CompanionError {
  readonly limit: number;
  readonly current: number;
  constructor(limit: number, current: number) {
    super('TASK_LIMIT', `Task limit exceeded: ${current}/${limit}`);
    this.limit = limit;
    this.current = current;
  }
}

export class MessageLimitExceededError extends CompanionError {
  readonly limit: number;
  readonly current: number;
  constructor(limit: number, current: number) {
    super('MESSAGE_LIMIT', `Message limit exceeded: ${current}/${limit}`);
    this.limit = limit;
    this.current = current;
  }
}

export class ExplainabilityError extends CompanionError {
  readonly recordId: string;
  constructor(recordId: string, reason: string = '') {
    super('EXPLAINABILITY_ERROR', `Explainability error for ${recordId}${reason ? ': ' + reason : ''}`);
    this.recordId = recordId;
  }
}

export class ExplainabilityRecordNotFoundError extends CompanionError {
  readonly recordId: string;
  constructor(recordId: string) {
    super('EXPLAINABILITY_RECORD_NOT_FOUND', `Explainability record not found: ${recordId}`);
    this.recordId = recordId;
  }
}

export class ExplainabilityLimitExceededError extends CompanionError {
  readonly limit: number;
  readonly current: number;
  constructor(limit: number, current: number) {
    super('EXPLAINABILITY_LIMIT', `Explainability record limit exceeded: ${current}/${limit}`);
    this.limit = limit;
    this.current = current;
  }
}

export class ValueOptimizationError extends CompanionError {
  readonly stage: string;
  constructor(stage: string, message: string) {
    super('VALUE_OPTIMIZATION_ERROR', `Value optimization error at ${stage}: ${message}`);
    this.stage = stage;
  }
}

export class AIControlError extends CompanionError {
  readonly autonomyLevel: string;
  constructor(autonomyLevel: string, reason: string = '') {
    super('AI_CONTROL_ERROR', `AI control error at level ${autonomyLevel}${reason ? ': ' + reason : ''}`);
    this.autonomyLevel = autonomyLevel;
  }
}

export class AnalyticsError extends CompanionError {
  readonly metricKey: string;
  constructor(metricKey: string, reason: string = '') {
    super('ANALYTICS_ERROR', `Analytics error for metric ${metricKey}${reason ? ': ' + reason : ''}`);
    this.metricKey = metricKey;
  }
}

export class KnowledgeError extends CompanionError {
  readonly entryId: string;
  constructor(entryId: string, reason: string = '') {
    super('KNOWLEDGE_ERROR', `Knowledge error for ${entryId}${reason ? ': ' + reason : ''}`);
    this.entryId = entryId;
  }
}

export class CapabilityError extends CompanionError {
  readonly capabilityId: string;
  constructor(capabilityId: string, reason: string = '') {
    super('CAPABILITY_ERROR', `Capability error for ${capabilityId}${reason ? ': ' + reason : ''}`);
    this.capabilityId = capabilityId;
  }
}

export class MarketplaceError extends CompanionError {
  readonly listingId: string;
  constructor(listingId: string, reason: string = '') {
    super('MARKETPLACE_ERROR', `Marketplace error for listing ${listingId}${reason ? ': ' + reason : ''}`);
    this.listingId = listingId;
  }
}
