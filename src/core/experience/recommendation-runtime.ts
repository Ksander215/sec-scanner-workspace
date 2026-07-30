/**
 * Experience Runtime — Subsystem 5: Recommendation Runtime
 * TASK-AIS-004A.000
 *
 * Forms non-intrusive recommendations. Recommendations go through
 * a lifecycle: Generated → Presented → Accepted/Dismissed/Expired.
 * Respects maxRecommendationsPerSession from config.
 *
 * Conforms to: DOM-002, ADR-014, CON-001, AL-012
 */

import type { ExperienceRuntimeConfig } from './types.js';
import type {
  ObservationId,
  Recommendation,
  RecommendationId,
  RecommendationType,
} from './types.js';
import { RecommendationState } from './types.js';
import { RecommendationGenerated } from './events.js';
import {
  RecommendationValidationError,
} from './errors.js';
import { createId } from '../domain/identifiers.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import { TraceCollector } from '../trace/trace-collector.js';

/** Default recommendation TTL: 7 days in ms */
const DEFAULT_RECOMMENDATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class RecommendationRuntime {
  private readonly config: ExperienceRuntimeConfig;
  private readonly eventBus: InProcessEventBus;
  private readonly trace: TraceCollector;
  /** userIdHash → Recommendation[] */
  private readonly recommendationsByUser = new Map<string, Recommendation[]>();
  /** recommendationId → Recommendation for fast lookup */
  private readonly recommendationIndex = new Map<string, Recommendation>();

  constructor(config: ExperienceRuntimeConfig, eventBus: InProcessEventBus, trace?: TraceCollector) {
    this.config = config;
    this.eventBus = eventBus;
    this.trace = trace ?? new TraceCollector();
    this.trace.traceInfo('RecommendationRuntime initialized', {
      maxRecommendationsPerSession: config.maxRecommendationsPerSession,
    });
  }

  /**
   * Generate a new recommendation in Generated state.
   * Validates inputs and requires at least one observation as evidence.
   */
  generateRecommendation(
    type: RecommendationType,
    userIdHash: string,
    title: string,
    description: string,
    evidence: readonly ObservationId[],
    confidence: number,
  ): Recommendation {
    if (!userIdHash || typeof userIdHash !== 'string') {
      throw new RecommendationValidationError(
        'Recommendation requires a valid userIdHash',
        { userIdHash },
      );
    }
    if (!title || typeof title !== 'string') {
      throw new RecommendationValidationError(
        'Recommendation requires a valid title',
        { title },
      );
    }
    if (!description || typeof description !== 'string') {
      throw new RecommendationValidationError(
        'Recommendation requires a valid description',
        { description },
      );
    }
    if (evidence.length === 0) {
      throw new RecommendationValidationError(
        'Recommendation requires at least one observation as evidence',
        { evidenceCount: 0 },
      );
    }
    if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
      throw new RecommendationValidationError(
        'Confidence must be a number between 0 and 1',
        { confidence },
      );
    }

    const now = new Date().toISOString();

    const recommendation: Recommendation = {
      id: createId<RecommendationId>(),
      type,
      userIdHash,
      title,
      description,
      state: RecommendationState.Generated,
      confidence,
      evidence: [...evidence],
      generatedAt: now,
    };

    this.storeRecommendation(recommendation);

    void this.publishRecommendationGenerated(recommendation);

    this.trace.traceInfo('Recommendation generated', {
      recommendationId: recommendation.id,
      userIdHash,
      type,
      title,
      confidence,
      evidenceCount: evidence.length,
    });

    return recommendation;
  }

  /**
   * Mark a recommendation as Presented.
   * Only Generated recommendations can be presented.
   */
  presentRecommendation(recommendationId: RecommendationId): Recommendation {
    const existing = this.recommendationIndex.get(recommendationId);
    if (!existing) {
      throw new RecommendationValidationError(
        `Recommendation not found: ${recommendationId}`,
        { recommendationId },
      );
    }
    if (existing.state !== RecommendationState.Generated) {
      throw new RecommendationValidationError(
        `Cannot present recommendation in state '${existing.state}'. Only Generated recommendations can be presented.`,
        { recommendationId, currentState: existing.state },
      );
    }

    const presented: Recommendation = {
      ...existing,
      state: RecommendationState.Presented,
      presentedAt: new Date().toISOString(),
    };

    this.storeRecommendation(presented);

    this.trace.traceInfo('Recommendation presented', {
      recommendationId: presented.id,
      userIdHash: presented.userIdHash,
      title: presented.title,
    });

    return presented;
  }

  /**
   * Mark a recommendation as Accepted.
   * Only Presented recommendations can be accepted.
   */
  acceptRecommendation(recommendationId: RecommendationId): Recommendation {
    const existing = this.recommendationIndex.get(recommendationId);
    if (!existing) {
      throw new RecommendationValidationError(
        `Recommendation not found: ${recommendationId}`,
        { recommendationId },
      );
    }
    if (existing.state !== RecommendationState.Presented) {
      throw new RecommendationValidationError(
        `Cannot accept recommendation in state '${existing.state}'. Only Presented recommendations can be accepted.`,
        { recommendationId, currentState: existing.state },
      );
    }

    const accepted: Recommendation = {
      ...existing,
      state: RecommendationState.Accepted,
      resolvedAt: new Date().toISOString(),
    };

    this.storeRecommendation(accepted);

    this.trace.traceInfo('Recommendation accepted', {
      recommendationId: accepted.id,
      userIdHash: accepted.userIdHash,
      title: accepted.title,
    });

    return accepted;
  }

  /**
   * Mark a recommendation as Dismissed.
   * Only Presented recommendations can be dismissed.
   */
  dismissRecommendation(recommendationId: RecommendationId): Recommendation {
    const existing = this.recommendationIndex.get(recommendationId);
    if (!existing) {
      throw new RecommendationValidationError(
        `Recommendation not found: ${recommendationId}`,
        { recommendationId },
      );
    }
    if (existing.state !== RecommendationState.Presented) {
      throw new RecommendationValidationError(
        `Cannot dismiss recommendation in state '${existing.state}'. Only Presented recommendations can be dismissed.`,
        { recommendationId, currentState: existing.state },
      );
    }

    const dismissed: Recommendation = {
      ...existing,
      state: RecommendationState.Dismissed,
      resolvedAt: new Date().toISOString(),
    };

    this.storeRecommendation(dismissed);

    this.trace.traceInfo('Recommendation dismissed', {
      recommendationId: dismissed.id,
      userIdHash: dismissed.userIdHash,
      title: dismissed.title,
    });

    return dismissed;
  }

  /**
   * Get pending (Generated or Presented) recommendations for a user.
   */
  getPendingRecommendations(userIdHash: string): readonly Recommendation[] {
    const all = this.recommendationsByUser.get(userIdHash) ?? [];
    return all.filter(
      r => r.state === RecommendationState.Generated || r.state === RecommendationState.Presented,
    );
  }

  /**
   * Get recommendations suitable for presentation in a session.
   * Respects maxRecommendationsPerSession from config.
   * Prioritizes Generated recommendations, then Presented.
   */
  getRecommendationsForSession(userIdHash: string): readonly Recommendation[] {
    const pending = this.getPendingRecommendations(userIdHash);

    // Check if we've already presented too many
    const presentedCount = pending.filter(
      r => r.state === RecommendationState.Presented,
    ).length;

    if (presentedCount >= this.config.maxRecommendationsPerSession) {
      this.trace.traceInfo('Session recommendation limit reached', {
        userIdHash,
        presentedCount,
        max: this.config.maxRecommendationsPerSession,
      });
      return [];
    }

    // Sort: Generated first (highest confidence first), then Presented
    const sorted = [...pending].sort((a, b) => {
      // Generated before Presented
      if (a.state === RecommendationState.Generated && b.state !== RecommendationState.Generated) return -1;
      if (a.state !== RecommendationState.Generated && b.state === RecommendationState.Generated) return 1;
      // Within same state, sort by confidence descending
      return b.confidence - a.confidence;
    });

    const remaining = this.config.maxRecommendationsPerSession - presentedCount;
    return sorted.slice(0, remaining);
  }

  /**
   * Expire old Generated/Presented recommendations that have exceeded TTL.
   * Returns the count of expired recommendations.
   */
  expireRecommendations(): number {
    const now = Date.now();
    let expiredCount = 0;

    for (const [userIdHash, recommendations] of this.recommendationsByUser) {
      let changed = false;
      const updated: Recommendation[] = [];

      for (const rec of recommendations) {
        if (
          (rec.state === RecommendationState.Generated ||
           rec.state === RecommendationState.Presented) &&
          new Date(rec.generatedAt).getTime() + DEFAULT_RECOMMENDATION_TTL_MS <= now
        ) {
          const expired: Recommendation = {
            ...rec,
            state: RecommendationState.Expired,
          };
          this.recommendationIndex.set(expired.id, expired);
          updated.push(expired);
          changed = true;
          expiredCount++;
        } else {
          updated.push(rec);
        }
      }

      if (changed) {
        this.recommendationsByUser.set(userIdHash, updated);
      }
    }

    if (expiredCount > 0) {
      this.trace.traceInfo('Recommendations expired', { expiredCount });
    }

    return expiredCount;
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private storeRecommendation(recommendation: Recommendation): void {
    this.recommendationIndex.set(recommendation.id, recommendation);

    const userIdHash = recommendation.userIdHash;
    const existing = this.recommendationsByUser.get(userIdHash) ?? [];
    const idx = existing.findIndex(r => r.id === recommendation.id);

    if (idx >= 0) {
      const updated = [...existing];
      updated[idx] = recommendation;
      this.recommendationsByUser.set(userIdHash, updated);
    } else {
      this.recommendationsByUser.set(userIdHash, [...existing, recommendation]);
    }
  }

  private async publishRecommendationGenerated(recommendation: Recommendation): Promise<void> {
    const domainEvent: RecommendationGenerated = {
      eventId: crypto.randomUUID(),
      eventType: 'RecommendationGenerated',
      classification: EventClassification.Info,
      timestamp: new Date().toISOString(),
      sequence: 0,
      aggregateId: recommendation.userIdHash,
      aggregateType: 'RecommendationRuntime',
      version: '1.0.0',
      payload: {
        recommendationId: recommendation.id,
        userIdHash: recommendation.userIdHash,
        recommendationType: recommendation.type,
        title: recommendation.title,
        confidence: recommendation.confidence,
        generatedAt: recommendation.generatedAt,
      },
    };
    await this.eventBus.publish(domainEvent);
  }
}
