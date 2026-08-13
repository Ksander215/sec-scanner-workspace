/**
 * AIS Companion — Explainability Center
 * TASK-AIS-011A.001 — Explainable AI (Stage 5)
 *
 * Every recommendation must answer:
 * 1. Why? — reasoning
 * 2. What value does it create? — value proposition
 * 3. What constraint does it remove? — constraint addressed
 * 4. What alternatives exist? — alternatives considered
 * 5. Why was this specific choice made? — justification
 */

import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import {
  ExplainabilityLevel,
} from './types.js';
import type {
  ExplainabilityRecord,
  RecommendationId, CompanionSessionId, RecommendationCategory,
} from './types.js';
import { brandExplainabilityRecordId, brandCompanionSessionId, brandRecommendationId } from './types.js';
import { ExplainabilityRecordNotFoundError, ExplainabilityLimitExceededError } from './errors.js';

export interface ExplainabilityInput {
  readonly sessionId: string;
  readonly recommendationId?: string;
  readonly level: ExplainabilityLevel;
  readonly why: string;
  readonly whatValue: string;
  readonly whatConstraintRemoved: string;
  readonly whatAlternatives: ReadonlyArray<string>;
  readonly whyThisChoice: string;
}

export interface ExplainableRecommendation {
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

export class ExplainabilityCenter {
  private readonly maxRecordsPerSession: number;
  private readonly eventBus: InProcessEventBus | null;
  private readonly records = new Map<string, ExplainabilityRecord>();

  constructor(maxRecordsPerSession: number = 500, eventBus?: InProcessEventBus | null) {
    this.maxRecordsPerSession = maxRecordsPerSession;
    this.eventBus = eventBus ?? null;
  }

  async record(input: ExplainabilityInput): Promise<ExplainabilityRecord> {
    const count = this.countForSession(input.sessionId);
    if (count >= this.maxRecordsPerSession) {
      throw new ExplainabilityLimitExceededError(this.maxRecordsPerSession, count);
    }
    const now: Timestamp = new Date().toISOString();
    const id = brandExplainabilityRecordId(`expl-${crypto.randomUUID()}`);
    const record: ExplainabilityRecord = Object.freeze({
      id,
      sessionId: brandCompanionSessionId(input.sessionId),
      recommendationId: input.recommendationId ? brandRecommendationId(input.recommendationId) : brandRecommendationId('none'),
      level: input.level,
      why: input.why,
      whatValue: input.whatValue,
      whatConstraintRemoved: input.whatConstraintRemoved,
      whatAlternatives: Object.freeze([...input.whatAlternatives]),
      whyThisChoice: input.whyThisChoice,
      createdAt: now,
      metadata: Object.freeze({}),
    });
    this.records.set(id as string, record);
    await this.publishEvent({
      eventType: 'companion.explainability.recorded',
      classification: 'Result' as const,
      recordId: id,
      sessionId: input.sessionId,
      level: input.level,
      timestamp: now,
      metadata: Object.freeze({}),
    }, id as string, 'ExplainabilityRecord');
    return record;
  }

  async get(id: string): Promise<ExplainabilityRecord | null> {
    return this.records.get(id) ?? null;
  }

  async list(sessionId: string): Promise<ReadonlyArray<ExplainabilityRecord>> {
    return [...this.records.values()].filter(r => r.sessionId === sessionId);
  }

  async listByRecommendation(recommendationId: string): Promise<ReadonlyArray<ExplainabilityRecord>> {
    return [...this.records.values()].filter(r => r.recommendationId === recommendationId);
  }

  async remove(id: string): Promise<void> {
    const rec = this.records.get(id);
    if (!rec) throw new ExplainabilityRecordNotFoundError(id);
    this.records.delete(id);
  }

  async count(sessionId: string): Promise<number> {
    return this.countForSession(sessionId);
  }

  /**
   * Validates that a recommendation contains all 5 explainability dimensions.
   * Returns missing dimensions.
   */
  validate(rec: Partial<ExplainabilityInput>): ReadonlyArray<string> {
    const missing: string[] = [];
    if (!rec.why) missing.push('why');
    if (!rec.whatValue) missing.push('whatValue');
    if (!rec.whatConstraintRemoved) missing.push('whatConstraintRemoved');
    if (!rec.whatAlternatives || rec.whatAlternatives.length === 0) missing.push('whatAlternatives');
    if (!rec.whyThisChoice) missing.push('whyThisChoice');
    return Object.freeze(missing);
  }

  /**
   * Generates a full explainability record from a recommendation context.
   * Implements the 5-question model required by PHI-004 and GOV-008.
   */
  async generateExplanation(
    sessionId: string,
    recommendationId: string,
    context: {
      readonly category: RecommendationCategory;
      readonly title: string;
      readonly valueScore: number;
      readonly constraintIdentified: string;
      readonly alternativesConsidered: ReadonlyArray<string>;
      readonly reasoning: string;
    },
  ): Promise<ExplainabilityRecord> {
    const input: ExplainabilityInput = {
      sessionId,
      recommendationId,
      level: context.valueScore >= 0.8 ? ExplainabilityLevel.Full : ExplainabilityLevel.Standard,
      why: context.reasoning,
      whatValue: `This ${context.category} recommendation creates measurable value by addressing ${context.constraintIdentified} with a projected value score of ${context.valueScore}.`,
      whatConstraintRemoved: context.constraintIdentified,
      whatAlternatives: context.alternativesConsidered,
      whyThisChoice: `Selected based on highest value score (${context.valueScore}) among ${context.alternativesConsidered.length + 1} alternatives, optimal constraint removal, and alignment with user goals.`,
    };
    return this.record(input);
  }

  private countForSession(sessionId: string): number {
    return [...this.records.values()].filter(r => r.sessionId === sessionId).length;
  }

  private async publishEvent(event: Record<string, unknown>, aggregateId: string, aggregateType: string): Promise<void> {
    const full = Object.freeze({
      ...event, eventId: crypto.randomUUID(), sequence: 0, aggregateId, aggregateType, version: '1.0.0',
    });
    if (this.eventBus) await this.eventBus.publish(full as DomainEventBase);
  }
}
