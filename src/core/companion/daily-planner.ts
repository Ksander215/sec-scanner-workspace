/**
 * AIS Companion — Daily Planner
 * TASK-AIS-011A.000
 */

import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { IDailyPlanner } from './contracts.js';
import type { DailyPlannerConfig, DailyPlan, DailyTask } from './types.js';
import { brandDailyPlanId, brandDailyTaskId, brandCompanionSessionId, brandCompanionGoalId, GoalPriority, DailyTaskStatus, DailyPlanId } from './types.js';
import { DailyPlanNotFoundError, TaskLimitExceededError } from './errors.js';

export class DailyPlanner implements IDailyPlanner {
  private readonly config: DailyPlannerConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly plans = new Map<string, DailyPlan>();

  constructor(config: DailyPlannerConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async create(sessionId: string, userId: string, date?: string): Promise<DailyPlan> {
    const now: Timestamp = new Date().toISOString();
    const planDate = date ?? now.slice(0, 10);
    const id = brandDailyPlanId(`plan-${crypto.randomUUID()}`);
    const plan: DailyPlan = Object.freeze({
      id, sessionId: brandCompanionSessionId(sessionId), userId, date: planDate,
      focusArea: '', overallPriority: GoalPriority.Medium,
      tasks: [], createdAt: now, updatedAt: now, metadata: Object.freeze({}),
    });
    this.plans.set(id as string, plan);
    await this.publishEvent({
      eventType: 'companion.dailyplan.created', classification: 'Result' as const,
      planId: id, sessionId, userId, date: planDate,
      timestamp: now, metadata: Object.freeze({}),
    }, id as string, 'DailyPlan');
    return plan;
  }

  async get(id: string): Promise<DailyPlan | null> {
    return this.plans.get(id) ?? null;
  }

  async getActivePlan(userId: string): Promise<DailyPlan | null> {
    const today = new Date().toISOString().slice(0, 10);
    for (const plan of this.plans.values()) {
      if (plan.userId === userId && plan.date === today) return plan;
    }
    return null;
  }

  async addTask(planId: string, title: string, description?: string, priority?: GoalPriority, estimatedMinutes?: number, relatedGoalId?: string): Promise<DailyPlan> {
    const plan = this.plans.get(planId);
    if (!plan) throw new DailyPlanNotFoundError(planId);
    if (plan.tasks.length >= this.config.maxTasksPerPlan) {
      throw new TaskLimitExceededError(this.config.maxTasksPerPlan, plan.tasks.length);
    }
    const now: Timestamp = new Date().toISOString();
    const taskId = brandDailyTaskId(`task-${crypto.randomUUID()}`);
    const task: DailyTask = Object.freeze({
      id: taskId, planId: planId as unknown as DailyPlanId, title, description: description ?? '',
      status: DailyTaskStatus.Pending, priority: priority ?? GoalPriority.Medium,
      estimatedMinutes: estimatedMinutes ?? this.config.defaultEstimatedMinutes,
      relatedGoalId: relatedGoalId ? brandCompanionGoalId(relatedGoalId) : null,
      completedAt: null, metadata: Object.freeze({}),
    });
    const updated: DailyPlan = Object.freeze({ ...plan, tasks: [...plan.tasks, task], updatedAt: now });
    this.plans.set(planId, updated);
    await this.publishEvent({
      eventType: 'companion.dailyplan.taskAdded', classification: 'Action' as const,
      planId, taskId, title,
      timestamp: now, metadata: Object.freeze({}),
    }, planId, 'DailyPlan');
    return updated;
  }

  async completeTask(planId: string, taskId: string): Promise<DailyPlan> {
    const plan = this.plans.get(planId);
    if (!plan) throw new DailyPlanNotFoundError(planId);
    const now: Timestamp = new Date().toISOString();
    const tasks = plan.tasks.map(t =>
      t.id === taskId ? Object.freeze({ ...t, status: DailyTaskStatus.Completed, completedAt: now } as DailyTask) : t
    );
    const updated: DailyPlan = Object.freeze({ ...plan, tasks, updatedAt: now });
    this.plans.set(planId, updated);
    await this.publishEvent({
      eventType: 'companion.dailyplan.taskCompleted', classification: 'Result' as const,
      planId, taskId,
      timestamp: now, metadata: Object.freeze({}),
    }, planId, 'DailyPlan');
    return updated;
  }

  async completePlan(planId: string): Promise<DailyPlan> {
    const plan = this.plans.get(planId);
    if (!plan) throw new DailyPlanNotFoundError(planId);
    const now: Timestamp = new Date().toISOString();
    const tasks = plan.tasks.map(t =>
      t.status !== DailyTaskStatus.Completed
        ? Object.freeze({ ...t, status: DailyTaskStatus.Completed, completedAt: now } as DailyTask)
        : t
    );
    const updated: DailyPlan = Object.freeze({ ...plan, tasks, updatedAt: now });
    this.plans.set(planId, updated);
    return updated;
  }

  async list(userId: string): Promise<ReadonlyArray<DailyPlan>> {
    return [...this.plans.values()].filter(p => p.userId === userId);
  }

  async count(userId: string): Promise<number> {
    return [...this.plans.values()].filter(p => p.userId === userId).length;
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
