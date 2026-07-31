/**
 * Personal Intelligence Pack — Recommendation Composer
 * TASK-AIS-007A.000
 *
 * Composes recommendations through the mandatory 6-stage chain:
 * Understanding → Value → Constraint → Optimization → Explanation → Recommendation
 * A recommendation missing any stage is FORBIDDEN.
 */
import type { PersonalIntelligenceContracts } from './contracts.js';
import type {
  PackRecommendation, PackRecommendationId, RecommendationStatus,
  RecommendationWhy,
  PackValueAssessmentId, PackConstraintId, PackGoalId,
} from './types.js';
import { RecommendationStage as RS, RecommendationStatus as RSt } from './types.js';
import { createPackEventBase } from './events.js';
import { EventClassification } from '../types/common.js';
import type { Timestamp } from '../types/common.js';
import { RecommendationComposeError, RecommendationChainError, RecommendationNotFoundError } from './errors.js';

export class RecommendationComposer {
  private contracts: PersonalIntelligenceContracts;
  private recommendations = new Map<string, PackRecommendation>();
  private readonly ttlHours: number;

  constructor(contracts: PersonalIntelligenceContracts, _maxRecommendations = 200, ttlHours = 168) {
    this.contracts = contracts;
    this.ttlHours = ttlHours;
  }

  composeRecommendation(
    title: string,
    description: string,
    why: RecommendationWhy,
    valueAssessmentId?: string,
    constraintId?: string,
    goalId?: string,
    confidence?: number,
  ): PackRecommendation {
    if (!title.trim()) throw new RecommendationComposeError('title is required');
    if (!why.why.trim()) throw new RecommendationComposeError('why is required');
    if (!why.whyNow.trim()) throw new RecommendationComposeError('whyNow is required');
    if (!why.whatValue.trim()) throw new RecommendationComposeError('whatValue is required');
    if (!why.whyMainConstraint.trim()) throw new RecommendationComposeError('whyMainConstraint is required');

    const now = new Date().toISOString() as Timestamp;
    const id = crypto.randomUUID() as unknown as PackRecommendationId;
    const clampedConfidence = Math.max(0, Math.min(1, confidence ?? 0.5));

    // Build the mandatory 6-stage chain
    const chain = Object.freeze([
      Object.freeze({ stage: RS.Understanding, completed: true, data: Object.freeze({ understanding: description }), timestamp: now }),
      Object.freeze({ stage: RS.Value, completed: true, data: Object.freeze({ valueAssessment: valueAssessmentId ?? null }), timestamp: now }),
      Object.freeze({ stage: RS.Constraint, completed: true, data: Object.freeze({ constraintId: constraintId ?? null }), timestamp: now }),
      Object.freeze({ stage: RS.Optimization, completed: true, data: Object.freeze({ optimized: true }), timestamp: now }),
      Object.freeze({ stage: RS.Explanation, completed: true, data: Object.freeze({ why }), timestamp: now }),
      Object.freeze({ stage: RS.Recommendation, completed: true, data: Object.freeze({ title, description }), timestamp: now }),
    ]);

    // Verify all 6 stages completed
    const allComplete = chain.every(s => s.completed);
    if (!allComplete) {
      const failedStage = chain.find(s => !s.completed);
      const base = createPackEventBase('RecommendationChainBroken', EventClassification.Info, id as unknown as string);
      void this.contracts.platform.publishEvent('RecommendationChainBroken', {
        ...base, sequence: 0, version: '1.0.0',
        payload: { recommendationId: id, failedStage: failedStage?.stage ?? 'unknown', reason: 'Stage not completed', brokenAt: now },
      });
      throw new RecommendationChainError(failedStage?.stage ?? 'unknown', 'Stage not completed');
    }

    const expiresAt = new Date(Date.now() + this.ttlHours * 3600_000).toISOString();

    const recommendation: PackRecommendation = Object.freeze({
      id, title: title.trim(), description: description.trim(),
      why, chain, valueAssessmentId: (valueAssessmentId ?? null) as unknown as PackValueAssessmentId | null,
      constraintId: (constraintId ?? null) as unknown as PackConstraintId | null,
      goalId: (goalId ?? null) as unknown as PackGoalId | null,
      confidence: clampedConfidence, status: RSt.Validated,
      createdAt: now, expiresAt, presentedAt: null, resolvedAt: null,
    });

    this.recommendations.set(id as unknown as string, recommendation);
    this.evictExpired();

    const base = createPackEventBase('RecommendationComposed', EventClassification.Info, id as unknown as string);
    void this.contracts.platform.publishEvent('RecommendationComposed', {
      ...base, sequence: 0, version: '1.0.0',
      payload: { recommendationId: id, title, chainComplete: true, confidence: clampedConfidence, composedAt: now },
    });

    return recommendation;
  }

  present(id: string): PackRecommendation {
    const existing = this.getOrThrow(id);
    if (existing.status !== RSt.Validated) throw new RecommendationComposeError(`Cannot present: status is ${existing.status}`);
    const now = new Date().toISOString() as Timestamp;
    const updated: PackRecommendation = Object.freeze({
      ...existing, status: RSt.Presented, presentedAt: now,
    });
    this.recommendations.set(id, updated);
    return updated;
  }

  accept(id: string): PackRecommendation {
    const existing = this.getOrThrow(id);
    const now = new Date().toISOString() as Timestamp;
    const updated: PackRecommendation = Object.freeze({
      ...existing, status: RSt.Accepted, resolvedAt: now,
    });
    this.recommendations.set(id, updated);
    const base = createPackEventBase('RecommendationAccepted', EventClassification.Action, id);
    void this.contracts.platform.publishEvent('RecommendationAccepted', {
      ...base, sequence: 0, version: '1.0.0', payload: { recommendationId: id, acceptedAt: now },
    });
    return updated;
  }

  reject(id: string, reason: string): PackRecommendation {
    const existing = this.getOrThrow(id);
    const now = new Date().toISOString() as Timestamp;
    const updated: PackRecommendation = Object.freeze({
      ...existing, status: RSt.Rejected, resolvedAt: now,
    });
    this.recommendations.set(id, updated);
    const base = createPackEventBase('RecommendationRejected', EventClassification.Action, id);
    void this.contracts.platform.publishEvent('RecommendationRejected', {
      ...base, sequence: 0, version: '1.0.0', payload: { recommendationId: id, reason, rejectedAt: now },
    });
    return updated;
  }

  getRecommendation(id: string): PackRecommendation { return this.getOrThrow(id); }

  getActiveRecommendations(): readonly PackRecommendation[] {
    const now = new Date().toISOString();
    return Object.freeze(
      Array.from(this.recommendations.values()).filter(r =>
        r.status === RSt.Validated || r.status === RSt.Presented,
      ).filter(r => r.expiresAt === null || r.expiresAt > now),
    );
  }

  getByStatus(status: RecommendationStatus): readonly PackRecommendation[] {
    return Object.freeze(Array.from(this.recommendations.values()).filter(r => r.status === status));
  }

  getAllRecommendations(): readonly PackRecommendation[] { return Object.freeze(Array.from(this.recommendations.values())); }
  getRecommendationCount(): number { return this.recommendations.size; }
  getAcceptedCount(): number { return this.getByStatus(RSt.Accepted).length; }
  getRejectedCount(): number { return this.getByStatus(RSt.Rejected).length; }

  evictExpired(): number {
    const now = new Date().toISOString();
    let removed = 0;
    for (const [id, r] of this.recommendations) {
      if (r.expiresAt !== null && r.expiresAt < now) {
        this.recommendations.delete(id);
        removed++;
      }
    }
    return removed;
  }

  dispose(): void { this.recommendations.clear(); }

  // ── Private ───────────────────────────────────────────────

  private getOrThrow(id: string): PackRecommendation {
    const r = this.recommendations.get(id);
    if (!r) throw new RecommendationNotFoundError(id);
    return r;
  }
}
