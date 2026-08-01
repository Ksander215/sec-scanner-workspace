/**
 * Rating Runtime Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { RatingEntry, RatingRuntimeConfig } from './types.js';
import { brandRatingId } from './types.js';
import type { IRatingRuntime, RatingSubmissionParams } from './contracts.js';
import { RatingError } from './errors.js';
import type { RatingSubmittedEvent } from './events.js';

export class RatingRuntime implements IRatingRuntime {
  private readonly config: RatingRuntimeConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly ratings = new Map<string, RatingEntry>();

  constructor(config: RatingRuntimeConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async submit(params: RatingSubmissionParams): Promise<RatingEntry> {
    const scores = params.scores as Readonly<Record<string, number>>;
    for (const dim of this.config.dimensions) {
      const val = scores[dim];
      if (val === undefined || val < this.config.minScore || val > this.config.maxScore) {
        throw new RatingError(`Score for ${dim} must be between ${this.config.minScore} and ${this.config.maxScore}`);
      }
    }
    const now: Timestamp = new Date().toISOString();
    const id = brandRatingId(crypto.randomUUID());
    const entry: RatingEntry = Object.freeze({
      id,
      capabilityId: params.capabilityId,
      userId: params.userId,
      scores: Object.freeze({ ...params.scores }),
      comment: params.comment,
      createdAt: now,
      metadata: Object.freeze({ ...params.metadata }),
    });
    this.ratings.set(id as string, entry);
    const values = Object.values(params.scores);
    const averageScore = values.reduce((a, b) => a + b, 0) / values.length;
    const event: RatingSubmittedEvent = Object.freeze({
      eventType: 'marketplace.rating.submitted',
      classification: EventClassification.Info,
      ratingId: id,
      capabilityId: params.capabilityId,
      averageScore,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, id as string, 'RatingEntry');
    return entry;
  }

  async getByCapabilityId(capId: import('./types.js').CapabilityId): Promise<readonly RatingEntry[]> {
    return Object.freeze([...this.ratings.values()].filter(r => r.capabilityId === capId));
  }

  async getAverage(capId: import('./types.js').CapabilityId): Promise<number> {
    const capRatings = [...this.ratings.values()].filter(r => r.capabilityId === capId);
    if (capRatings.length === 0) return 0;
    const allScores = capRatings.flatMap(r => Object.values(r.scores));
    return allScores.reduce((a, b) => a + b, 0) / allScores.length;
  }

  async getById(id: import('./types.js').RatingId): Promise<RatingEntry | null> {
    return this.ratings.get(id as string) ?? null;
  }

  async list(): Promise<readonly RatingEntry[]> {
    return Object.freeze([...this.ratings.values()]);
  }

  async count(): Promise<number> {
    return this.ratings.size;
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
