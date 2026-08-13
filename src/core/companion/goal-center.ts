/**
 * AIS Companion — Goal Center
 * TASK-AIS-011A.000
 */

import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { IGoalCenter } from './contracts.js';
import type { GoalCenterConfig, CompanionGoal } from './types.js';
import { brandCompanionGoalId, brandCompanionSessionId, GoalPriority, GoalStatus } from './types.js';
import { GoalNotFoundError, GoalLimitExceededError } from './errors.js';

export class GoalCenter implements IGoalCenter {
  private readonly config: GoalCenterConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly goals = new Map<string, CompanionGoal>();
  private onAnalytics?: (event: 'goalCreated' | 'goalCompleted') => void;

  constructor(config: GoalCenterConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  setAnalyticsCallback(cb: (event: 'goalCreated' | 'goalCompleted') => void): void {
    this.onAnalytics = cb;
  }

  async create(sessionId: string, userId: string, title: string, description?: string, priority?: GoalPriority): Promise<CompanionGoal> {
    const count = await this.count(sessionId);
    if (count >= this.config.maxGoalsPerSession) {
      throw new GoalLimitExceededError(this.config.maxGoalsPerSession, count);
    }
    const now: Timestamp = new Date().toISOString();
    const id = brandCompanionGoalId(`goal-${crypto.randomUUID()}`);
    const goal: CompanionGoal = Object.freeze({
      id, sessionId: brandCompanionSessionId(sessionId), userId, title,
      description: description ?? '', priority: priority ?? GoalPriority.Medium,
      status: GoalStatus.Draft, targetDate: null, progress: this.config.defaultProgress,
      createdAt: now, completedAt: null, updatedAt: now, metadata: Object.freeze({}),
    });
    this.goals.set(id as string, goal);
    this.onAnalytics?.('goalCreated');
    await this.publishEvent({
      eventType: 'companion.goal.created', classification: 'Result' as const,
      goalId: id, sessionId, userId, title, priority: goal.priority,
      timestamp: now, metadata: Object.freeze({}),
    }, id as string, 'CompanionGoal');
    return goal;
  }

  async get(id: string): Promise<CompanionGoal | null> {
    return this.goals.get(id) ?? null;
  }

  async list(sessionId: string): Promise<ReadonlyArray<CompanionGoal>> {
    return [...this.goals.values()].filter(g => g.sessionId === sessionId);
  }

  async update(id: string, updates: Partial<{ title: string; description: string; priority: GoalPriority; progress: number; status: GoalStatus; targetDate: string }>): Promise<CompanionGoal> {
    const existing = this.goals.get(id);
    if (!existing) throw new GoalNotFoundError(id);
    const now: Timestamp = new Date().toISOString();
    const changes: string[] = [];
    if (updates.title !== undefined && updates.title !== existing.title) changes.push('title');
    if (updates.description !== undefined && updates.description !== existing.description) changes.push('description');
    if (updates.priority !== undefined && updates.priority !== existing.priority) changes.push('priority');
    if (updates.progress !== undefined && updates.progress !== existing.progress) changes.push('progress');
    if (updates.status !== undefined && updates.status !== existing.status) changes.push('status');
    if (updates.targetDate !== undefined && updates.targetDate !== existing.targetDate) changes.push('targetDate');
    const updated: CompanionGoal = Object.freeze({ ...existing, ...updates, updatedAt: now });
    this.goals.set(id, updated);
    await this.publishEvent({
      eventType: 'companion.goal.updated', classification: 'StateChange' as const,
      goalId: id, sessionId: existing.sessionId, changes,
      timestamp: now, metadata: Object.freeze({}),
    }, id, 'CompanionGoal');
    return updated;
  }

  async complete(id: string): Promise<CompanionGoal> {
    const existing = this.goals.get(id);
    if (!existing) throw new GoalNotFoundError(id);
    const now: Timestamp = new Date().toISOString();
    const updated: CompanionGoal = Object.freeze({
      ...existing, status: GoalStatus.Completed, progress: 100,
      completedAt: now, updatedAt: now,
    });
    this.goals.set(id, updated);
    this.onAnalytics?.('goalCompleted');
    await this.publishEvent({
      eventType: 'companion.goal.completed', classification: 'Result' as const,
      goalId: id, sessionId: existing.sessionId,
      durationMs: new Date(now).getTime() - new Date(existing.createdAt).getTime(),
      timestamp: now, metadata: Object.freeze({}),
    }, id, 'CompanionGoal');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const goal = this.goals.get(id);
    if (!goal) throw new GoalNotFoundError(id);
    this.goals.delete(id);
  }

  async count(sessionId: string): Promise<number> {
    return [...this.goals.values()].filter(g => g.sessionId === sessionId).length;
  }

  private async publishEvent(
    event: Record<string, unknown>,
    aggregateId: string,
    aggregateType: string,
  ): Promise<void> {
    const full = Object.freeze({
      ...event,
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId,
      aggregateType,
      version: '1.0.0',
    });
    if (this.eventBus) {
      await this.eventBus.publish(full as DomainEventBase);
    }
  }
}
