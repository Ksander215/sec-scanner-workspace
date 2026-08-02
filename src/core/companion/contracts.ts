/**
 * AIS Companion — Public Interfaces
 * TASK-AIS-011A.000
 */

import type {
  CompanionSession, CompanionSessionId, CompanionState, NavigationSection,
  CompanionMetrics, Workspace, Conversation, CompanionGoal, DailyPlan,
  SolutionInstance, Insight, CompanionNotification, SectionMetrics, ConversationMessage,
  GoalPriority, GoalStatus, InsightType, NotificationPriority, ConversationRole,
} from './types.js';

export interface ICompanionRuntime {
  readonly lifecycle: ILifecycleManager;
  readonly workspace: IUserWorkspaceManager;
  readonly conversation: IConversationCenter;
  readonly goals: IGoalCenter;
  readonly dailyPlanner: IDailyPlanner;
  readonly solutions: ISolutionCenter;
  readonly workflows: IWorkflowDashboard;
  readonly capabilities: ICapabilityManager;
  readonly marketplace: IMarketplaceCenter;
  readonly knowledge: IKnowledgeCenter;
  readonly aiControl: IAIControlCenter;
  readonly insights: IInsightEngine;
  readonly notifications: INotificationCenter;
  readonly analytics: IAnalyticsDashboard;
  initialize(userId: string): Promise<CompanionSession>;
  getSession(id: CompanionSessionId): Promise<CompanionSession | null>;
  getState(): Promise<CompanionState>;
  shutdown(sessionId: CompanionSessionId): Promise<void>;
  navigate(sessionId: CompanionSessionId, section: NavigationSection): Promise<void>;
  getMetrics(sessionId: CompanionSessionId): Promise<CompanionMetrics>;
}

export interface ILifecycleManager {
  getCurrentState(): CompanionState;
  transition(from: CompanionState, to: CompanionState, reason?: string): Promise<void>;
  reset(): Promise<void>;
  getHistory(): ReadonlyArray<{ from: CompanionState; to: CompanionState; timestamp: string }>;
}

export interface IUserWorkspaceManager {
  create(userId: string, label?: string): Promise<Workspace>;
  get(id: string): Promise<Workspace | null>;
  list(userId: string): Promise<ReadonlyArray<Workspace>>;
  update(id: string, label: string): Promise<Workspace>;
  remove(id: string): Promise<void>;
  count(userId: string): Promise<number>;
}

export interface IConversationCenter {
  create(sessionId: string, userId: string, title?: string): Promise<Conversation>;
  get(id: string): Promise<Conversation | null>;
  list(sessionId: string): Promise<ReadonlyArray<Conversation>>;
  addMessage(conversationId: string, role: ConversationRole, content: string): Promise<ConversationMessage>;
  remove(id: string): Promise<void>;
  count(sessionId: string): Promise<number>;
}

export interface IGoalCenter {
  create(sessionId: string, userId: string, title: string, description?: string, priority?: GoalPriority): Promise<CompanionGoal>;
  get(id: string): Promise<CompanionGoal | null>;
  list(sessionId: string): Promise<ReadonlyArray<CompanionGoal>>;
  update(id: string, updates: Partial<{ title: string; description: string; priority: GoalPriority; progress: number; status: GoalStatus; targetDate: string }>): Promise<CompanionGoal>;
  complete(id: string): Promise<CompanionGoal>;
  remove(id: string): Promise<void>;
  count(sessionId: string): Promise<number>;
}

export interface IDailyPlanner {
  create(sessionId: string, userId: string, date?: string): Promise<DailyPlan>;
  get(id: string): Promise<DailyPlan | null>;
  getActivePlan(userId: string): Promise<DailyPlan | null>;
  addTask(planId: string, title: string, description?: string, priority?: GoalPriority, estimatedMinutes?: number, relatedGoalId?: string): Promise<DailyPlan>;
  completeTask(planId: string, taskId: string): Promise<DailyPlan>;
  completePlan(planId: string): Promise<DailyPlan>;
  list(userId: string): Promise<ReadonlyArray<DailyPlan>>;
  count(userId: string): Promise<number>;
}

export interface ISolutionCenter {
  create(sessionId: string, userId: string, title: string, description?: string, goalId?: string): Promise<SolutionInstance>;
  get(id: string): Promise<SolutionInstance | null>;
  open(sessionId: string, userId: string, title: string, goalId?: string): Promise<SolutionInstance>;
  generate(id: string): Promise<SolutionInstance>;
  list(sessionId: string): Promise<ReadonlyArray<SolutionInstance>>;
  complete(id: string): Promise<SolutionInstance>;
  cancel(id: string, reason?: string): Promise<SolutionInstance>;
  remove(id: string): Promise<void>;
  count(sessionId: string): Promise<number>;
}

export interface IWorkflowDashboard {
  list(sessionId: string): Promise<ReadonlyArray<{ id: string; title: string; status: string; solutionId: string }>>;
  getBySolution(solutionId: string): Promise<ReadonlyArray<{ id: string; title: string; status: string }>>;
  count(sessionId: string): Promise<number>;
  register(sessionId: string, solutionId: string, workflowId: string, title: string, status?: string): Promise<void>;
}

export interface ICapabilityManager {
  install(sessionId: string, capabilityId: string, label: string): Promise<{ id: string; capabilityId: string; label: string; installedAt: string }>;
  remove(sessionId: string, instanceId: string): Promise<void>;
  list(sessionId: string): Promise<ReadonlyArray<{ id: string; capabilityId: string; label: string; installedAt: string }>>;
  get(sessionId: string, instanceId: string): Promise<{ id: string; capabilityId: string; label: string; installedAt: string } | null>;
  count(sessionId: string): Promise<number>;
}

export interface IMarketplaceCenter {
  browse(sessionId: string, query?: string, category?: string): Promise<ReadonlyArray<{ id: string; title: string; description: string; category: string; rating: number }>>;
  getDetails(sessionId: string, listingId: string): Promise<{ id: string; title: string; description: string; version: string; author: string } | null>;
  install(sessionId: string, listingId: string): Promise<{ instanceId: string; listingId: string }>;
  seedListings(items: ReadonlyArray<{ id: string; title: string; description: string; category: string; rating: number; version: string; author: string }>): void;
}

export interface IKnowledgeCenter {
  add(sessionId: string, category: string, title: string, content: string): Promise<{ id: string; category: string; title: string; createdAt: string }>;
  get(sessionId: string, entryId: string): Promise<{ id: string; category: string; title: string; content: string; createdAt: string } | null>;
  list(sessionId: string, category?: string): Promise<ReadonlyArray<{ id: string; category: string; title: string; createdAt: string }>>;
  remove(sessionId: string, entryId: string): Promise<void>;
  search(sessionId: string, query: string): Promise<ReadonlyArray<{ id: string; title: string; category: string }>>;
  count(sessionId: string): Promise<number>;
}

export interface IAIControlCenter {
  getLevel(sessionId: string): Promise<string>;
  setLevel(sessionId: string, level: string): Promise<string>;
  getHistory(sessionId: string): Promise<ReadonlyArray<{ from: string; to: string; timestamp: string }>>;
}

export interface IInsightEngine {
  generate(sessionId: string, userId: string, type: InsightType, title: string, description: string, confidence?: number): Promise<Insight>;
  get(id: string): Promise<Insight | null>;
  list(sessionId: string): Promise<ReadonlyArray<Insight>>;
  listByType(sessionId: string, type: InsightType): Promise<ReadonlyArray<Insight>>;
  remove(id: string): Promise<void>;
  count(sessionId: string): Promise<number>;
}

export interface INotificationCenter {
  create(sessionId: string, userId: string, title: string, content: string, priority?: NotificationPriority): Promise<CompanionNotification>;
  get(id: string): Promise<CompanionNotification | null>;
  list(sessionId: string): Promise<ReadonlyArray<CompanionNotification>>;
  markRead(id: string): Promise<CompanionNotification>;
  markDismissed(id: string): Promise<CompanionNotification>;
  remove(id: string): Promise<void>;
  count(sessionId: string): Promise<number>;
  unreadCount(sessionId: string): Promise<number>;
}

export interface IAnalyticsDashboard {
  getSummary(): CompanionMetrics;
  getSectionMetrics(section: NavigationSection): SectionMetrics;
  recordVisit(section: NavigationSection, durationMs: number): void;
  recordGoalCreated(): void;
  recordGoalCompleted(): void;
  recordSolutionCreated(): void;
  recordInsightGenerated(): void;
  recordRecommendationCreated(): void;
  incrementSessions(): void;
  decrementActiveSessions(): void;
  recordSessionDuration(ms: number): void;
}
