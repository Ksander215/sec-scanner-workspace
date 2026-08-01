/**
 * AIS Companion — Insight Engine
 * TASK-AIS-011A.000
 */

import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { IInsightEngine } from './contracts.js';
import type { InsightEngineConfig, Insight } from './types.js';
import { brandInsightId, InsightType } from './types.js';
import { InsightNotFoundError, InsightLimitExceededError } from './errors.js';

export class InsightEngine implements IInsightEngine {
  private readonly config: InsightEngineConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly insights = new Map<string, Insight>();

  constructor(config: InsightEngineConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async generate(sessionId: string, userId: string, type: InsightType, title: string, description: string, confidence?: number): Promise<Insight> {
    const count = await this.count(sessionId);
    if (count >= this.config.maxInsightsPerSession) {
      throw new InsightLimitExceededError(this.config.maxInsightsPerSession, count);
    }
    const conf = confidence ?? this.config.minConfidence;
    const now: Timestamp = new Date().toISOString();
    const id = brandInsightId(`insight-${crypto.randomUUID()}`);
    const insight: Insight = Object.freeze({
      id, sessionId: sessionId as any, userId, type, title, description,
      confidence: conf, actionable: conf >= 0.7,
      createdAt: now, metadata: Object.freeze({}),
    });
    this.insights.set(id as string, insight);
    await this.publishEvent({
      eventType: 'companion.insight.generated', classification: 'Result' as const,
      insightId: id, sessionId, type, confidence: conf,
      timestamp: now, metadata: Object.freeze({}),
    }, id as string, 'Insight');
    return insight;
  }

  async get(id: string): Promise<Insight | null> {
    return this.insights.get(id) ?? null;
  }

  async list(sessionId: string): Promise<ReadonlyArray<Insight>> {
    return [...this.insights.values()].filter(i => i.sessionId === sessionId);
  }

  async listByType(sessionId: string, type: InsightType): Promise<ReadonlyArray<Insight>> {
    return [...this.insights.values()].filter(i => i.sessionId === sessionId && i.type === type);
  }

  async remove(id: string): Promise<void> {
    const insight = this.insights.get(id);
    if (!insight) throw new InsightNotFoundError(id);
    this.insights.delete(id);
  }

  async count(sessionId: string): Promise<number> {
    return [...this.insights.values()].filter(i => i.sessionId === sessionId).length;
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
