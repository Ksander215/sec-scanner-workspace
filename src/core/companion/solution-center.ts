/**
 * AIS Companion — Solution Center
 * TASK-AIS-011A.000
 */

import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { ISolutionCenter } from './contracts.js';
import type { SolutionCenterConfig, SolutionInstance } from './types.js';
import { brandSolutionInstanceId, brandCompanionSessionId, brandCompanionGoalId, SolutionStatus } from './types.js';
import { SolutionNotFoundError, SolutionLimitExceededError } from './errors.js';

export class SolutionCenter implements ISolutionCenter {
  private readonly config: SolutionCenterConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly solutions = new Map<string, SolutionInstance>();
  private onAnalytics?: (event: 'solutionCreated' | 'solutionCompleted') => void;

  constructor(config: SolutionCenterConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  setAnalyticsCallback(cb: (event: 'solutionCreated' | 'solutionCompleted') => void): void {
    this.onAnalytics = cb;
  }

  async create(sessionId: string, userId: string, title: string, description?: string, goalId?: string): Promise<SolutionInstance> {
    const count = await this.count(sessionId);
    if (count >= this.config.maxSolutionsPerSession) {
      throw new SolutionLimitExceededError(this.config.maxSolutionsPerSession, count);
    }
    const now: Timestamp = new Date().toISOString();
    const id = brandSolutionInstanceId(`sol-${crypto.randomUUID()}`);
    const sol: SolutionInstance = Object.freeze({
      id, sessionId: brandCompanionSessionId(sessionId), userId, title, description: description ?? '',
      status: SolutionStatus.Draft, goalId: goalId ? brandCompanionGoalId(goalId) : null,
      valueScore: this.config.defaultValueScore, workflowsGenerated: 0,
      createdAt: now, completedAt: null, updatedAt: now, metadata: Object.freeze({}),
    });
    this.solutions.set(id as string, sol);
    this.onAnalytics?.('solutionCreated');
    await this.publishEvent({
      eventType: 'companion.solution.created', classification: 'Result' as const,
      solutionId: id, sessionId, userId, title,
      timestamp: now, metadata: Object.freeze({}),
    }, id as string, 'SolutionInstance');
    return sol;
  }

  async get(id: string): Promise<SolutionInstance | null> {
    return this.solutions.get(id) ?? null;
  }

  async open(sessionId: string, userId: string, title: string, goalId?: string): Promise<SolutionInstance> {
    const sol = await this.create(sessionId, userId, title, '', goalId);
    const now: Timestamp = new Date().toISOString();
    const opened: SolutionInstance = Object.freeze({ ...sol, status: SolutionStatus.Assembling, updatedAt: now });
    this.solutions.set(sol.id as string, opened);
    return opened;
  }

  async generate(id: string): Promise<SolutionInstance> {
    const sol = this.solutions.get(id);
    if (!sol) throw new SolutionNotFoundError(id);
    const now: Timestamp = new Date().toISOString();
    const updated: SolutionInstance = Object.freeze({
      ...sol, status: SolutionStatus.Validating,
      workflowsGenerated: sol.workflowsGenerated + 1, updatedAt: now,
    });
    this.solutions.set(id, updated);
    return updated;
  }

  async list(sessionId: string): Promise<ReadonlyArray<SolutionInstance>> {
    return [...this.solutions.values()].filter(s => s.sessionId === sessionId);
  }

  async complete(id: string): Promise<SolutionInstance> {
    const sol = this.solutions.get(id);
    if (!sol) throw new SolutionNotFoundError(id);
    const now: Timestamp = new Date().toISOString();
    const updated: SolutionInstance = Object.freeze({
      ...sol, status: SolutionStatus.Completed, completedAt: now, updatedAt: now,
    });
    this.solutions.set(id, updated);
    this.onAnalytics?.('solutionCompleted');
    await this.publishEvent({
      eventType: 'companion.solution.completed', classification: 'Result' as const,
      solutionId: id, sessionId: sol.sessionId,
      durationMs: new Date(now).getTime() - new Date(sol.createdAt).getTime(),
      timestamp: now, metadata: Object.freeze({}),
    }, id, 'SolutionInstance');
    return updated;
  }

  async cancel(id: string, reason?: string): Promise<SolutionInstance> {
    const sol = this.solutions.get(id);
    if (!sol) throw new SolutionNotFoundError(id);
    const now: Timestamp = new Date().toISOString();
    const updated: SolutionInstance = Object.freeze({ ...sol, status: SolutionStatus.Cancelled, updatedAt: now });
    this.solutions.set(id, updated);
    await this.publishEvent({
      eventType: 'companion.solution.cancelled', classification: 'StateChange' as const,
      solutionId: id, sessionId: sol.sessionId, reason: reason ?? '',
      timestamp: now, metadata: Object.freeze({}),
    }, id, 'SolutionInstance');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const sol = this.solutions.get(id);
    if (!sol) throw new SolutionNotFoundError(id);
    this.solutions.delete(id);
  }

  async count(sessionId: string): Promise<number> {
    return [...this.solutions.values()].filter(s => s.sessionId === sessionId).length;
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
