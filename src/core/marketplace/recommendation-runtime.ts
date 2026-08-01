/**
 * Recommendation Runtime Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { Recommendation, RecommendationRuntimeConfig, CapabilityEntry } from './types.js';
import { brandRecommendationId } from './types.js';
import type { IRecommendationRuntime, RecommendationContext } from './contracts.js';
import type { RecommendationGeneratedEvent } from './events.js';

export class RecommendationRuntime implements IRecommendationRuntime {
  private readonly config: RecommendationRuntimeConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly recommendations = new Map<string, Recommendation>();
  private capabilities: readonly CapabilityEntry[] = Object.freeze([]);

  constructor(config: RecommendationRuntimeConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  setCapabilities(caps: readonly CapabilityEntry[]): void {
    this.capabilities = caps;
  }

  async recommend(params: RecommendationContext): Promise<readonly Recommendation[]> {
    const installedSet = new Set(params.installedCapabilities.map(c => c as string));
    const candidates = this.capabilities.filter(c => !installedSet.has(c.id as string));
    const results: Recommendation[] = [];
    for (const cap of candidates) {
      if (results.length >= this.config.maxRecommendations) break;
      let score = 0;
      const reasons: string[] = [];
      for (const goal of params.goals) {
        if (cap.category.toLowerCase().includes(goal.toLowerCase()) ||
            cap.description.toLowerCase().includes(goal.toLowerCase()) ||
            cap.tags.some(t => t.toLowerCase().includes(goal.toLowerCase()))) {
          score += this.config.goalWeight;
          reasons.push(`matches goal: ${goal}`);
        }
      }
      const ctx = params.workflowContext;
      if (ctx != null &&
          (cap.description.toLowerCase().includes(ctx.toLowerCase()) ||
           cap.tags.some(t => t.toLowerCase().includes(ctx.toLowerCase())))) {
        score += this.config.contextWeight;
        reasons.push('matches workflow context');
      }
      if (cap.rating > 3) {
        score += this.config.experienceWeight * (cap.rating / 5);
        reasons.push(`high rating: ${cap.rating}`);
      }
      if (score >= this.config.minScore) {
        const now: Timestamp = new Date().toISOString();
        const id = brandRecommendationId(crypto.randomUUID());
        const rec: Recommendation = Object.freeze({
          id,
          capabilityId: cap.id,
          reason: reasons.join('; '),
          score,
          basedOn: Object.freeze(reasons),
          createdAt: now,
          metadata: Object.freeze({}),
        });
        results.push(rec);
        this.recommendations.set(id as string, rec);
        const event: RecommendationGeneratedEvent = Object.freeze({
          eventType: 'marketplace.recommendation.generated',
          classification: EventClassification.Info,
          recommendationId: id,
          capabilityId: cap.id,
          score,
          timestamp: now,
          metadata: Object.freeze({}),
        });
        await this.publishEvent(event as unknown as Record<string, unknown>, id as string, 'Recommendation');
      }
    }
    return Object.freeze(results);
  }

  async getById(id: import('./types.js').RecommendationId): Promise<Recommendation | null> {
    return this.recommendations.get(id as string) ?? null;
  }

  async list(): Promise<readonly Recommendation[]> {
    return Object.freeze([...this.recommendations.values()]);
  }

  async count(): Promise<number> {
    return this.recommendations.size;
  }


  private async publishEvent(event: Record<string, unknown>, aggregateId: string, aggregateType: string): Promise<void> {
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
