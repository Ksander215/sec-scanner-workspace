/**
 * AIS Companion — Companion Runtime (Orchestrator)
 * TASK-AIS-011A.000
 */

import type { Timestamp } from '../types/common.js';
import { EventClassification } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { ICompanionRuntime } from './contracts.js';
import type {
  CompanionSessionId, CompanionSession, CompanionRuntimeConfig,
  CompanionState, NavigationSection, CompanionMetrics,
} from './types.js';
import { brandCompanionSessionId, CompanionState as CS, DefaultCompanionRuntimeConfig } from './types.js';
import { CompanionInitializationError, SessionNotFoundError } from './errors.js';
import { LifecycleManager } from './lifecycle-manager.js';
import { UserWorkspaceManager } from './user-workspace.js';
import { ConversationCenter } from './conversation-center.js';
import { GoalCenter } from './goal-center.js';
import { DailyPlanner } from './daily-planner.js';
import { SolutionCenter } from './solution-center.js';
import { WorkflowDashboard } from './workflow-dashboard.js';
import { CapabilityManager } from './capability-manager.js';
import { MarketplaceCenter } from './marketplace-center.js';
import { KnowledgeCenter } from './knowledge-center.js';
import { AIControlCenter } from './ai-control-center.js';
import { InsightEngine } from './insight-engine.js';
import { NotificationCenter } from './notification-center.js';
import { AnalyticsDashboard } from './analytics-dashboard.js';

export class CompanionRuntime implements ICompanionRuntime {
  private readonly config: CompanionRuntimeConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly sessions = new Map<string, CompanionSession>();
  readonly lifecycle: LifecycleManager;
  readonly workspace: UserWorkspaceManager;
  readonly conversation: ConversationCenter;
  readonly goals: GoalCenter;
  readonly dailyPlanner: DailyPlanner;
  readonly solutions: SolutionCenter;
  readonly workflows: WorkflowDashboard;
  readonly capabilities: CapabilityManager;
  readonly marketplace: MarketplaceCenter;
  readonly knowledge: KnowledgeCenter;
  readonly aiControl: AIControlCenter;
  readonly insights: InsightEngine;
  readonly notifications: NotificationCenter;
  readonly analytics: AnalyticsDashboard;

  constructor(config?: Partial<CompanionRuntimeConfig>, eventBus?: InProcessEventBus | null) {
    this.config = config ? { ...DefaultCompanionRuntimeConfig, ...config } : DefaultCompanionRuntimeConfig;
    this.eventBus = eventBus ?? null;
    this.lifecycle = new LifecycleManager(this.config.lifecycleManagerConfig, eventBus);
    this.workspace = new UserWorkspaceManager(this.config.userWorkspaceConfig, eventBus);
    this.conversation = new ConversationCenter(this.config.conversationCenterConfig, eventBus);
    this.goals = new GoalCenter(this.config.goalCenterConfig, eventBus);
    this.dailyPlanner = new DailyPlanner(this.config.dailyPlannerConfig, eventBus);
    this.solutions = new SolutionCenter(this.config.solutionCenterConfig, eventBus);
    this.workflows = new WorkflowDashboard(this.config.workflowDashboardConfig, eventBus);
    this.capabilities = new CapabilityManager(this.config.capabilityManagerConfig, eventBus);
    this.marketplace = new MarketplaceCenter(this.config.marketplaceCenterConfig, eventBus);
    this.knowledge = new KnowledgeCenter(this.config.knowledgeCenterConfig, eventBus);
    this.aiControl = new AIControlCenter(this.config.aiControlCenterConfig, eventBus);
    this.insights = new InsightEngine(this.config.insightEngineConfig, eventBus);
    this.notifications = new NotificationCenter(this.config.notificationCenterConfig, eventBus);
    this.analytics = new AnalyticsDashboard(this.config.analyticsDashboardConfig, eventBus);
    // Wire analytics callbacks to subsystems
    this.goals.setAnalyticsCallback((e) => {
      if (e === 'goalCreated') this.analytics.recordGoalCreated();
      if (e === 'goalCompleted') this.analytics.recordGoalCompleted();
    });
    this.solutions.setAnalyticsCallback((e) => {
      if (e === 'solutionCreated') this.analytics.recordSolutionCreated();
      if (e === 'solutionCompleted') this.analytics.recordSolutionCreated();
    });
    this.insights.setAnalyticsCallback(() => {
      this.analytics.recordInsightGenerated();
    });
  }

  async initialize(userId: string): Promise<CompanionSession> {
    await this.lifecycle.reset();
    await this.lifecycle.transition(CS.Uninitialized, CS.Initializing, 'Starting companion');
    try {
      const ws = await this.workspace.create(userId, this.config.userWorkspaceConfig.defaultLabel);
      const now: Timestamp = new Date().toISOString();
      const sessionId = brandCompanionSessionId(`sess-${crypto.randomUUID()}`);
      const session: CompanionSession = Object.freeze({
        id: sessionId, userId, state: CS.Active,
        workspaceId: ws.id, currentSection: this.config.defaultSection,
        startedAt: now, lastActiveAt: now, metadata: Object.freeze({}),
      });
      this.sessions.set(sessionId as string, session);
      this.analytics.incrementSessions();
      await this.lifecycle.transition(CS.Initializing, CS.Active, 'Companion ready');
      await this.publishEvent({
        eventType: 'companion.initialized', classification: EventClassification.Result,
        sessionId, userId, timestamp: now, metadata: Object.freeze({}),
      }, sessionId as string, 'CompanionSession');
      return session;
    } catch (err) {
      await this.lifecycle.transition(CS.Initializing, CS.Error, String(err)).catch(() => {});
      throw new CompanionInitializationError('initialization', { userId, error: String(err) });
    }
  }

  async getSession(id: CompanionSessionId): Promise<CompanionSession | null> {
    return this.sessions.get(id as string) ?? null;
  }

  async getState(): Promise<CompanionState> {
    return this.lifecycle.getCurrentState();
  }

  async shutdown(sessionId: CompanionSessionId): Promise<void> {
    const session = this.sessions.get(sessionId as string);
    if (!session) throw new SessionNotFoundError(sessionId as string);
    const startMs = Date.now();
    await this.lifecycle.transition(CS.Active, CS.ShuttingDown, 'User requested shutdown');
    const now: Timestamp = new Date().toISOString();
    await this.lifecycle.transition(CS.ShuttingDown, CS.Shutdown, 'Shutdown complete');
    this.analytics.decrementActiveSessions();
    this.analytics.recordSessionDuration(Date.now() - startMs);
    await this.publishEvent({
      eventType: 'companion.shutdown', classification: EventClassification.StateChange,
      sessionId, durationMs: Date.now() - startMs,
      timestamp: now, metadata: Object.freeze({}),
    }, sessionId as string, 'CompanionSession');
  }

  async navigate(sessionId: CompanionSessionId, section: NavigationSection): Promise<void> {
    const session = this.sessions.get(sessionId as string);
    if (!session) throw new SessionNotFoundError(sessionId as string);
    const now: Timestamp = new Date().toISOString();
    const from = session.currentSection;
    const updated: CompanionSession = Object.freeze({ ...session, currentSection: section, lastActiveAt: now });
    this.sessions.set(sessionId as string, updated);
    this.analytics.recordVisit(section, 0);
    await this.publishEvent({
      eventType: 'companion.navigation.changed', classification: EventClassification.Action,
      sessionId, fromSection: from, toSection: section,
      timestamp: now, metadata: Object.freeze({}),
    }, sessionId as string, 'CompanionSession');
  }

  async getMetrics(sessionId: CompanionSessionId): Promise<CompanionMetrics> {
    const session = this.sessions.get(sessionId as string);
    if (!session) throw new SessionNotFoundError(sessionId as string);
    return this.analytics.getSummary();
  }

  private async publishEvent(event: Record<string, unknown>, aggregateId: string, aggregateType: string): Promise<void> {
    const full = Object.freeze({ ...event, eventId: crypto.randomUUID(), sequence: 0, aggregateId, aggregateType, version: '1.0.0' });
    if (this.eventBus) await this.eventBus.publish(full as DomainEventBase);
  }
}
