/**
 * AIS Companion — Types & Domain Entities
 * TASK-AIS-011A.000
 */

import type { Timestamp } from '../types/common.js';

// ── Branded IDs ───────────────────────────────────────────────────────────
export type CompanionSessionId = string & { readonly __brand: 'CompanionSessionId' };
export type WorkspaceId = string & { readonly __brand: 'WorkspaceId' };
export type ConversationId = string & { readonly __brand: 'ConversationId' };
export type CompanionGoalId = string & { readonly __brand: 'CompanionGoalId' };
export type DailyPlanId = string & { readonly __brand: 'DailyPlanId' };
export type DailyTaskId = string & { readonly __brand: 'DailyTaskId' };
export type SolutionInstanceId = string & { readonly __brand: 'SolutionInstanceId' };
export type InsightId = string & { readonly __brand: 'InsightId' };
export type CompanionNotificationId = string & { readonly __brand: 'CompanionNotificationId' };
export type RecommendationId = string & { readonly __brand: 'RecommendationId' };
export type ExplainabilityRecordId = string & { readonly __brand: 'ExplainabilityRecordId' };

export function brandCompanionSessionId(v: string): CompanionSessionId { return v as CompanionSessionId; }
export function brandWorkspaceId(v: string): WorkspaceId { return v as WorkspaceId; }
export function brandConversationId(v: string): ConversationId { return v as ConversationId; }
export function brandCompanionGoalId(v: string): CompanionGoalId { return v as CompanionGoalId; }
export function brandDailyPlanId(v: string): DailyPlanId { return v as DailyPlanId; }
export function brandDailyTaskId(v: string): DailyTaskId { return v as DailyTaskId; }
export function brandSolutionInstanceId(v: string): SolutionInstanceId { return v as SolutionInstanceId; }
export function brandInsightId(v: string): InsightId { return v as InsightId; }
export function brandCompanionNotificationId(v: string): CompanionNotificationId { return v as CompanionNotificationId; }
export function brandRecommendationId(v: string): RecommendationId { return v as RecommendationId; }
export function brandExplainabilityRecordId(v: string): ExplainabilityRecordId { return v as ExplainabilityRecordId; }

// ── Enums ──────────────────────────────────────────────────────────────────
export enum CompanionState {
  Uninitialized = 'Uninitialized',
  Initializing = 'Initializing',
  Active = 'Active',
  Paused = 'Paused',
  ShuttingDown = 'ShuttingDown',
  Shutdown = 'Shutdown',
  Error = 'Error',
}

export enum NavigationSection {
  Conversation = 'Conversation',
  Goals = 'Goals',
  DailyPlan = 'DailyPlan',
  Solutions = 'Solutions',
  Workflows = 'Workflows',
  Capabilities = 'Capabilities',
  Marketplace = 'Marketplace',
  Knowledge = 'Knowledge',
}

export enum ConversationRole {
  User = 'User',
  Assistant = 'Assistant',
  System = 'System',
}

export enum GoalPriority {
  Critical = 'Critical',
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
  Aspirational = 'Aspirational',
}

export enum GoalStatus {
  Draft = 'Draft',
  Active = 'Active',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Abandoned = 'Abandoned',
  Paused = 'Paused',
}

export enum DailyTaskStatus {
  Pending = 'Pending',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Skipped = 'Skipped',
  Deferred = 'Deferred',
}

export enum SolutionStatus {
  Draft = 'Draft',
  Assembling = 'Assembling',
  Validating = 'Validating',
  Active = 'Active',
  Completed = 'Completed',
  Failed = 'Failed',
  Cancelled = 'Cancelled',
}

export enum InsightType {
  Pattern = 'Pattern',
  Opportunity = 'Opportunity',
  Risk = 'Risk',
  Suggestion = 'Suggestion',
  Correlation = 'Correlation',
}

export enum NotificationPriority {
  Critical = 'Critical',
  High = 'High',
  Normal = 'Normal',
  Low = 'Low',
  Info = 'Info',
}

export enum NotificationStatus {
  Unread = 'Unread',
  Read = 'Read',
  Dismissed = 'Dismissed',
  Actioned = 'Actioned',
}

export enum ExplainabilityLevel {
  Full = 'Full',
  Standard = 'Standard',
  Minimal = 'Minimal',
}

export enum RecommendationCategory {
  Capability = 'Capability',
  Workflow = 'Workflow',
  Goal = 'Goal',
  Knowledge = 'Knowledge',
  Efficiency = 'Efficiency',
}

// ── Domain Entities ────────────────────────────────────────────────────────
export interface CompanionSession {
  readonly id: CompanionSessionId;
  readonly userId: string;
  readonly state: CompanionState;
  readonly workspaceId: WorkspaceId;
  readonly currentSection: NavigationSection;
  readonly startedAt: Timestamp;
  readonly lastActiveAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface Workspace {
  readonly id: WorkspaceId;
  readonly userId: string;
  readonly label: string;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ConversationMessage {
  readonly id: string;
  readonly conversationId: ConversationId;
  readonly role: ConversationRole;
  readonly content: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface Conversation {
  readonly id: ConversationId;
  readonly sessionId: CompanionSessionId;
  readonly userId: string;
  readonly title: string;
  readonly messages: ReadonlyArray<ConversationMessage>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface CompanionGoal {
  readonly id: CompanionGoalId;
  readonly sessionId: CompanionSessionId;
  readonly userId: string;
  readonly title: string;
  readonly description: string;
  readonly priority: GoalPriority;
  readonly status: GoalStatus;
  readonly targetDate: Timestamp | null;
  readonly progress: number;
  readonly createdAt: Timestamp;
  readonly completedAt: Timestamp | null;
  readonly updatedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface DailyPlan {
  readonly id: DailyPlanId;
  readonly sessionId: CompanionSessionId;
  readonly userId: string;
  readonly date: string;
  readonly focusArea: string;
  readonly overallPriority: GoalPriority;
  readonly tasks: ReadonlyArray<DailyTask>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface DailyTask {
  readonly id: DailyTaskId;
  readonly planId: DailyPlanId;
  readonly title: string;
  readonly description: string;
  readonly status: DailyTaskStatus;
  readonly priority: GoalPriority;
  readonly estimatedMinutes: number;
  readonly relatedGoalId: CompanionGoalId | null;
  readonly completedAt: Timestamp | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SolutionInstance {
  readonly id: SolutionInstanceId;
  readonly sessionId: CompanionSessionId;
  readonly userId: string;
  readonly title: string;
  readonly description: string;
  readonly status: SolutionStatus;
  readonly goalId: CompanionGoalId | null;
  readonly valueScore: number;
  readonly workflowsGenerated: number;
  readonly createdAt: Timestamp;
  readonly completedAt: Timestamp | null;
  readonly updatedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface Insight {
  readonly id: InsightId;
  readonly sessionId: CompanionSessionId;
  readonly userId: string;
  readonly type: InsightType;
  readonly title: string;
  readonly description: string;
  readonly confidence: number;
  readonly actionable: boolean;
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface CompanionNotification {
  readonly id: CompanionNotificationId;
  readonly sessionId: CompanionSessionId;
  readonly userId: string;
  readonly title: string;
  readonly content: string;
  readonly priority: NotificationPriority;
  readonly status: NotificationStatus;
  readonly createdAt: Timestamp;
  readonly readAt: Timestamp | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface Recommendation {
  readonly id: RecommendationId;
  readonly sessionId: CompanionSessionId;
  readonly userId: string;
  readonly category: RecommendationCategory;
  readonly title: string;
  readonly description: string;
  readonly reasoning: string;
  readonly alternatives: ReadonlyArray<string>;
  readonly constraintRemoved: string;
  readonly valueScore: number;
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ExplainabilityRecord {
  readonly id: ExplainabilityRecordId;
  readonly sessionId: CompanionSessionId;
  readonly recommendationId: RecommendationId;
  readonly level: ExplainabilityLevel;
  readonly why: string;
  readonly whatValue: string;
  readonly whatConstraintRemoved: string;
  readonly whatAlternatives: ReadonlyArray<string>;
  readonly whyThisChoice: string;
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface CompanionMetrics {
  readonly totalSessions: number;
  readonly activeSessions: number;
  readonly totalGoals: number;
  readonly completedGoals: number;
  readonly totalSolutions: number;
  readonly totalInsights: number;
  readonly totalRecommendations: number;
  readonly averageSessionDurationMs: number;
}

export interface SectionMetrics {
  readonly section: NavigationSection;
  readonly visitCount: number;
  readonly lastVisitedAt: Timestamp | null;
  readonly averageDurationMs: number;
}

// ── Subsystem Configs ──────────────────────────────────────────────────────
export interface LifecycleManagerConfig {
  readonly stateTransitionTimeoutMs: number;
  readonly maxRetries: number;
}

export interface UserWorkspaceConfig {
  readonly defaultLabel: string;
  readonly maxWorkspacesPerUser: number;
}

export interface ConversationCenterConfig {
  readonly maxMessagesPerConversation: number;
  readonly maxConversationsPerSession: number;
}

export interface GoalCenterConfig {
  readonly maxGoalsPerSession: number;
  readonly defaultProgress: number;
}

export interface DailyPlannerConfig {
  readonly maxTasksPerPlan: number;
  readonly defaultEstimatedMinutes: number;
}

export interface SolutionCenterConfig {
  readonly maxSolutionsPerSession: number;
  readonly defaultValueScore: number;
}

export interface WorkflowDashboardConfig {
  readonly maxVisibleWorkflows: number;
}

export interface CapabilityManagerConfig {
  readonly maxManagedCapabilities: number;
}

export interface MarketplaceCenterConfig {
  readonly maxBrowseResults: number;
}

export interface KnowledgeCenterConfig {
  readonly maxKnowledgeEntries: number;
}

export interface AIControlCenterConfig {
  readonly autonomyLevels: readonly string[];
  readonly defaultAutonomy: string;
}

export interface InsightEngineConfig {
  readonly maxInsightsPerSession: number;
  readonly minConfidence: number;
}

export interface NotificationCenterConfig {
  readonly maxNotifications: number;
  readonly defaultPriority: NotificationPriority;
}

export interface AnalyticsDashboardConfig {
  readonly metricsRetentionCount: number;
}

export interface CompanionRuntimeConfig {
  readonly defaultSection: NavigationSection;
  readonly lifecycleManagerConfig: LifecycleManagerConfig;
  readonly userWorkspaceConfig: UserWorkspaceConfig;
  readonly conversationCenterConfig: ConversationCenterConfig;
  readonly goalCenterConfig: GoalCenterConfig;
  readonly dailyPlannerConfig: DailyPlannerConfig;
  readonly solutionCenterConfig: SolutionCenterConfig;
  readonly workflowDashboardConfig: WorkflowDashboardConfig;
  readonly capabilityManagerConfig: CapabilityManagerConfig;
  readonly marketplaceCenterConfig: MarketplaceCenterConfig;
  readonly knowledgeCenterConfig: KnowledgeCenterConfig;
  readonly aiControlCenterConfig: AIControlCenterConfig;
  readonly insightEngineConfig: InsightEngineConfig;
  readonly notificationCenterConfig: NotificationCenterConfig;
  readonly analyticsDashboardConfig: AnalyticsDashboardConfig;
}

export const DefaultLifecycleManagerConfig: LifecycleManagerConfig = Object.freeze({
  stateTransitionTimeoutMs: 5000, maxRetries: 3,
});
export const DefaultUserWorkspaceConfig: UserWorkspaceConfig = Object.freeze({
  defaultLabel: 'My Workspace', maxWorkspacesPerUser: 5,
});
export const DefaultConversationCenterConfig: ConversationCenterConfig = Object.freeze({
  maxMessagesPerConversation: 1000, maxConversationsPerSession: 50,
});
export const DefaultGoalCenterConfig: GoalCenterConfig = Object.freeze({
  maxGoalsPerSession: 100, defaultProgress: 0,
});
export const DefaultDailyPlannerConfig: DailyPlannerConfig = Object.freeze({
  maxTasksPerPlan: 50, defaultEstimatedMinutes: 30,
});
export const DefaultSolutionCenterConfig: SolutionCenterConfig = Object.freeze({
  maxSolutionsPerSession: 50, defaultValueScore: 0,
});
export const DefaultWorkflowDashboardConfig: WorkflowDashboardConfig = Object.freeze({
  maxVisibleWorkflows: 100,
});
export const DefaultCapabilityManagerConfig: CapabilityManagerConfig = Object.freeze({
  maxManagedCapabilities: 200,
});
export const DefaultMarketplaceCenterConfig: MarketplaceCenterConfig = Object.freeze({
  maxBrowseResults: 50,
});
export const DefaultKnowledgeCenterConfig: KnowledgeCenterConfig = Object.freeze({
  maxKnowledgeEntries: 1000,
});
export const DefaultAIControlCenterConfig: AIControlCenterConfig = Object.freeze({
  autonomyLevels: ['low', 'medium', 'high', 'full'], defaultAutonomy: 'medium',
});
export const DefaultInsightEngineConfig: InsightEngineConfig = Object.freeze({
  maxInsightsPerSession: 500, minConfidence: 0.5,
});
export const DefaultNotificationCenterConfig: NotificationCenterConfig = Object.freeze({
  maxNotifications: 500, defaultPriority: NotificationPriority.Normal,
});
export const DefaultAnalyticsDashboardConfig: AnalyticsDashboardConfig = Object.freeze({
  metricsRetentionCount: 1000,
});

export const DefaultCompanionRuntimeConfig: CompanionRuntimeConfig = Object.freeze({
  defaultSection: NavigationSection.Conversation,
  lifecycleManagerConfig: DefaultLifecycleManagerConfig,
  userWorkspaceConfig: DefaultUserWorkspaceConfig,
  conversationCenterConfig: DefaultConversationCenterConfig,
  goalCenterConfig: DefaultGoalCenterConfig,
  dailyPlannerConfig: DefaultDailyPlannerConfig,
  solutionCenterConfig: DefaultSolutionCenterConfig,
  workflowDashboardConfig: DefaultWorkflowDashboardConfig,
  capabilityManagerConfig: DefaultCapabilityManagerConfig,
  marketplaceCenterConfig: DefaultMarketplaceCenterConfig,
  knowledgeCenterConfig: DefaultKnowledgeCenterConfig,
  aiControlCenterConfig: DefaultAIControlCenterConfig,
  insightEngineConfig: DefaultInsightEngineConfig,
  notificationCenterConfig: DefaultNotificationCenterConfig,
  analyticsDashboardConfig: DefaultAnalyticsDashboardConfig,
});
