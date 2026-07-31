/**
 * Personal Intelligence Runtime — Recommendation Subsystem
 *
 * Generates, stores, and manages personal recommendations.
 * Tracks acceptance and dismissal.  Owns all recommendation data.
 */
import type { PersonalRecommendation } from './types.js';
import { RecommendationType } from './types.js';
import type { PersonalRuntimeContracts } from './contracts.js';
import { createPersonalEventBase } from './events.js';
import { EventClassification } from '../types/common.js';
import { RecommendationError } from './errors.js';

export class RecommendationRuntime {
  private contracts: PersonalRuntimeContracts;
  private recommendations = new Map<string, PersonalRecommendation>();
  private readonly maxRecommendations: number;

  constructor(contracts: PersonalRuntimeContracts, maxRecommendations = 100) {
    this.contracts = contracts;
    this.maxRecommendations = maxRecommendations;
  }

  // ── Generate ──────────────────────────────────────────────────

  generateRecommendation(
    type: RecommendationType,
    title: string,
    description: string,
    reasoning: string,
    confidence: number,
    goalId?: string,
    expiresAt?: string,
  ): PersonalRecommendation {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      throw new RecommendationError('', 'title must be non-empty');
    }

    if (this.recommendations.size >= this.maxRecommendations) {
      // Evict the oldest non-accepted, non-dismissed recommendation
      let oldestId: string | null = null;
      let oldestTime = '';
      for (const [id, rec] of this.recommendations) {
        if (rec.accepted || rec.dismissed) continue;
        if (!oldestId || rec.createdAt < oldestTime) {
          oldestId = id;
          oldestTime = rec.createdAt;
        }
      }
      if (oldestId) {
        this.recommendations.delete(oldestId);
      }
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const clampedConfidence = Math.max(0, Math.min(1, confidence));

    const recommendation: PersonalRecommendation = Object.freeze({
      id,
      type,
      title: trimmedTitle,
      description: description.trim(),
      reasoning: reasoning.trim(),
      confidence: clampedConfidence,
      goalId: goalId ?? null,
      expiresAt: expiresAt ?? null,
      dismissed: false,
      accepted: false,
      createdAt: now,
    });

    this.recommendations.set(id, recommendation);

    const base = createPersonalEventBase('RecommendationGenerated', EventClassification.Info, id);
    void this.contracts.platform.publishEvent('RecommendationGenerated', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        recommendationId: id,
        type: recommendation.type,
        title: recommendation.title,
        confidence: clampedConfidence,
        createdAt: now,
      },
    });

    return recommendation;
  }

  // ── Accept ────────────────────────────────────────────────────

  acceptRecommendation(id: string): PersonalRecommendation {
    const existing = this.recommendations.get(id);
    if (!existing) {
      throw new RecommendationError(id, 'Recommendation not found');
    }
    if (existing.accepted) {
      return existing;
    }
    if (existing.dismissed) {
      throw new RecommendationError(id, 'Cannot accept a dismissed recommendation');
    }

    const now = new Date().toISOString();
    const updated: PersonalRecommendation = Object.freeze({
      ...existing,
      accepted: true,
      createdAt: existing.createdAt, // preserve original
    });

    this.recommendations.set(id, updated);

    const base = createPersonalEventBase('RecommendationAccepted', EventClassification.Action, id);
    void this.contracts.platform.publishEvent('RecommendationAccepted', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        recommendationId: id,
        acceptedAt: now,
      },
    });

    return updated;
  }

  // ── Dismiss ───────────────────────────────────────────────────

  dismissRecommendation(id: string): PersonalRecommendation {
    const existing = this.recommendations.get(id);
    if (!existing) {
      throw new RecommendationError(id, 'Recommendation not found');
    }
    if (existing.dismissed) {
      return existing;
    }
    if (existing.accepted) {
      throw new RecommendationError(id, 'Cannot dismiss an accepted recommendation');
    }

    const now = new Date().toISOString();
    const updated: PersonalRecommendation = Object.freeze({
      ...existing,
      dismissed: true,
      createdAt: existing.createdAt, // preserve original
    });

    this.recommendations.set(id, updated);

    const base = createPersonalEventBase('RecommendationDismissed', EventClassification.Action, id);
    void this.contracts.platform.publishEvent('RecommendationDismissed', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        recommendationId: id,
        dismissedAt: now,
      },
    });

    return updated;
  }

  // ── Queries ───────────────────────────────────────────────────

  getRecommendations(type?: RecommendationType): readonly PersonalRecommendation[] {
    const all = Array.from(this.recommendations.values());
    const filtered = type !== undefined
      ? all.filter(r => r.type === type)
      : all;
    return Object.freeze(filtered);
  }

  getActiveRecommendations(): readonly PersonalRecommendation[] {
    return Object.freeze(
      Array.from(this.recommendations.values()).filter(
        r => !r.accepted && !r.dismissed,
      ),
    );
  }

  getAcceptedCount(): number {
    let count = 0;
    for (const rec of this.recommendations.values()) {
      if (rec.accepted) count++;
    }
    return count;
  }

  getDismissedCount(): number {
    let count = 0;
    for (const rec of this.recommendations.values()) {
      if (rec.dismissed) count++;
    }
    return count;
  }

  // ── Cleanup ──────────────────────────────────────────────────

  cleanup(): number {
    const now = new Date().toISOString();
    let removed = 0;
    for (const [id, rec] of this.recommendations) {
      if (rec.expiresAt !== null && rec.expiresAt < now) {
        this.recommendations.delete(id);
        removed++;
      }
    }
    return removed;
  }

  // ── Dispose ──────────────────────────────────────────────────

  dispose(): void {
    this.recommendations.clear();
  }
}
