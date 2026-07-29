/**
 * Experience Runtime — Subsystem 4: Adaptation Engine
 * TASK-AIS-004A.000
 *
 * Gradually changes platform behavior. All changes are reversible and explainable.
 * Adaptations go through a lifecycle: Proposed → Applied → Reverted/Expired.
 *
 * Conforms to: DOM-002, ADR-014, CON-001, AL-012
 */

import type { ExperienceRuntimeConfig } from './types.js';
import type {
  ObservationId,
  Adaptation,
  AdaptationId,
  AdaptationType,
} from './types.js';
import { AdaptationState } from './types.js';
import {
  AdaptationApplied,
  AdaptationReverted,
} from './events.js';
import {
  AdaptationValidationError,
  AdaptationRevertError,
  AdaptationExpiredError,
} from './errors.js';
import { createId } from '../domain/identifiers.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import { TraceCollector } from '../trace/trace-collector.js';

/** Default adaptation TTL: 7 days in ms */
const DEFAULT_ADAPTATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class AdaptationEngine {
  private readonly config: ExperienceRuntimeConfig;
  private readonly eventBus: InProcessEventBus;
  private readonly trace: TraceCollector;
  /** userIdHash → Adaptation[] */
  private readonly adaptationsByUser = new Map<string, Adaptation[]>();
  /** adaptationId → Adaptation for fast lookup */
  private readonly adaptationIndex = new Map<string, Adaptation>();

  constructor(config: ExperienceRuntimeConfig, eventBus: InProcessEventBus, trace?: TraceCollector) {
    this.config = config;
    this.eventBus = eventBus;
    this.trace = trace ?? new TraceCollector();
    this.trace.traceInfo('AdaptationEngine initialized', {
      adaptationRate: config.adaptationRate,
    });
  }

  /**
   * Propose a new adaptation. The adaptation starts in Proposed state.
   * Requires at least one observation as evidence.
   */
  proposeAdaptation(
    type: AdaptationType,
    userIdHash: string,
    newValue: string,
    evidence: readonly ObservationId[],
    reason: string,
  ): Adaptation {
    if (!userIdHash || typeof userIdHash !== 'string') {
      throw new AdaptationValidationError(
        'Adaptation requires a valid userIdHash',
        { userIdHash },
      );
    }
    if (!newValue || typeof newValue !== 'string') {
      throw new AdaptationValidationError(
        'Adaptation requires a valid newValue',
        { newValue },
      );
    }
    if (evidence.length === 0) {
      throw new AdaptationValidationError(
        'Adaptation requires at least one observation as evidence',
        { evidenceCount: 0 },
      );
    }
    if (!reason || typeof reason !== 'string') {
      throw new AdaptationValidationError(
        'Adaptation requires a reason for explainability',
        { reason },
      );
    }

    const expiresAt = new Date(Date.now() + DEFAULT_ADAPTATION_TTL_MS).toISOString();

    const adaptation: Adaptation = {
      id: createId<AdaptationId>(),
      type,
      userIdHash,
      previousValue: '',
      newValue,
      state: AdaptationState.Proposed,
      reason,
      evidence: [...evidence],
      confidence: this.config.adaptationRate,
      expiresAt,
    };

    this.storeAdaptation(adaptation);

    this.trace.traceInfo('Adaptation proposed', {
      adaptationId: adaptation.id,
      userIdHash,
      type,
      newValue,
      evidenceCount: evidence.length,
    });

    return adaptation;
  }

  /**
   * Apply a proposed adaptation. Marks it as Applied with appliedAt timestamp.
   * Only Proposed adaptations can be applied.
   */
  applyAdaptation(adaptationId: AdaptationId): Adaptation {
    const existing = this.adaptationIndex.get(adaptationId);
    if (!existing) {
      throw new AdaptationValidationError(
        `Adaptation not found: ${adaptationId}`,
        { adaptationId },
      );
    }
    if (existing.state !== AdaptationState.Proposed) {
      throw new AdaptationValidationError(
        `Cannot apply adaptation in state '${existing.state}'. Only Proposed adaptations can be applied.`,
        { adaptationId, currentState: existing.state },
      );
    }

    if (this.isExpired(existing)) {
      this.markExpired(existing);
      throw new AdaptationExpiredError(
        `Adaptation has expired: ${adaptationId}`,
        { adaptationId, expiredAt: existing.expiresAt },
      );
    }

    const now = new Date().toISOString();
    const applied: Adaptation = {
      ...existing,
      state: AdaptationState.Applied,
      appliedAt: now,
    };

    this.storeAdaptation(applied);

    void this.publishAdaptationApplied(applied);

    this.trace.traceInfo('Adaptation applied', {
      adaptationId: applied.id,
      userIdHash: applied.userIdHash,
      type: applied.type,
      previousValue: applied.previousValue,
      newValue: applied.newValue,
    });

    return applied;
  }

  /**
   * Revert an applied adaptation. Marks it as Reverted with revertedAt timestamp.
   * Only Applied adaptations can be reverted.
   */
  revertAdaptation(adaptationId: AdaptationId, reason: string): Adaptation {
    const existing = this.adaptationIndex.get(adaptationId);
    if (!existing) {
      throw new AdaptationRevertError(
        `Adaptation not found: ${adaptationId}`,
        { adaptationId },
      );
    }
    if (existing.state !== AdaptationState.Applied) {
      throw new AdaptationRevertError(
        `Cannot revert adaptation in state '${existing.state}'. Only Applied adaptations can be reverted.`,
        { adaptationId, currentState: existing.state },
      );
    }

    if (!reason || typeof reason !== 'string') {
      throw new AdaptationRevertError(
        'Revert reason is required for explainability',
        { reason },
      );
    }

    const now = new Date().toISOString();
    const reverted: Adaptation = {
      ...existing,
      state: AdaptationState.Reverted,
      revertedAt: now,
    };

    this.storeAdaptation(reverted);

    void this.publishAdaptationReverted(reverted, reason);

    this.trace.traceInfo('Adaptation reverted', {
      adaptationId: reverted.id,
      userIdHash: reverted.userIdHash,
      type: reverted.type,
      reason,
    });

    return reverted;
  }

  /** Get all currently active (Applied) adaptations for a user */
  getActiveAdaptations(userIdHash: string): readonly Adaptation[] {
    const all = this.adaptationsByUser.get(userIdHash) ?? [];
    return all.filter(a => a.state === AdaptationState.Applied);
  }

  /** Get a specific adaptation by ID */
  getAdaptation(adaptationId: AdaptationId): Adaptation | null {
    return this.adaptationIndex.get(adaptationId) ?? null;
  }

  /**
   * Check for and mark expired adaptations across all users.
   * Returns the list of adaptations that were expired.
   */
  checkExpiredAdaptations(): readonly Adaptation[] {
    const now = Date.now();
    const expired: Adaptation[] = [];

    for (const [userIdHash, adaptations] of this.adaptationsByUser) {
      let changed = false;
      const updated: Adaptation[] = [];

      for (const adaptation of adaptations) {
        if (
          adaptation.state === AdaptationState.Applied &&
          adaptation.expiresAt &&
          new Date(adaptation.expiresAt).getTime() <= now
        ) {
          const expiredAdaptation = this.markExpired(adaptation);
          expired.push(expiredAdaptation);
          updated.push(expiredAdaptation);
          changed = true;
        } else {
          updated.push(adaptation);
        }
      }

      if (changed) {
        this.adaptationsByUser.set(userIdHash, updated);
      }
    }

    if (expired.length > 0) {
      this.trace.traceInfo('Expired adaptations checked', {
        expiredCount: expired.length,
      });
    }

    return expired;
  }

  /** Get the full adaptation history (all states) for a user */
  getAdaptationHistory(userIdHash: string): readonly Adaptation[] {
    return this.adaptationsByUser.get(userIdHash) ?? [];
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private storeAdaptation(adaptation: Adaptation): void {
    this.adaptationIndex.set(adaptation.id, adaptation);

    const userIdHash = adaptation.userIdHash;
    const existing = this.adaptationsByUser.get(userIdHash) ?? [];
    const idx = existing.findIndex(a => a.id === adaptation.id);

    if (idx >= 0) {
      const updated = [...existing];
      updated[idx] = adaptation;
      this.adaptationsByUser.set(userIdHash, updated);
    } else {
      this.adaptationsByUser.set(userIdHash, [...existing, adaptation]);
    }
  }

  private isExpired(adaptation: Adaptation): boolean {
    if (!adaptation.expiresAt) return false;
    return new Date(adaptation.expiresAt).getTime() <= Date.now();
  }

  private markExpired(adaptation: Adaptation): Adaptation {
    const expired: Adaptation = {
      ...adaptation,
      state: AdaptationState.Expired,
    };
    this.adaptationIndex.set(expired.id, expired);
    return expired;
  }

  private async publishAdaptationApplied(adaptation: Adaptation): Promise<void> {
    const domainEvent: AdaptationApplied = {
      eventId: crypto.randomUUID(),
      eventType: 'AdaptationApplied',
      classification: EventClassification.Action,
      timestamp: new Date().toISOString(),
      sequence: 0,
      aggregateId: adaptation.userIdHash,
      aggregateType: 'AdaptationEngine',
      version: '1.0.0',
      payload: {
        adaptationId: adaptation.id,
        userIdHash: adaptation.userIdHash,
        adaptationType: adaptation.type,
        previousValue: adaptation.previousValue,
        newValue: adaptation.newValue,
        confidence: adaptation.confidence,
        appliedAt: adaptation.appliedAt ?? new Date().toISOString(),
        reason: adaptation.reason,
      },
    };
    await this.eventBus.publish(domainEvent);
  }

  private async publishAdaptationReverted(adaptation: Adaptation, reason: string): Promise<void> {
    const domainEvent: AdaptationReverted = {
      eventId: crypto.randomUUID(),
      eventType: 'AdaptationReverted',
      classification: EventClassification.StateChange,
      timestamp: new Date().toISOString(),
      sequence: 0,
      aggregateId: adaptation.userIdHash,
      aggregateType: 'AdaptationEngine',
      version: '1.0.0',
      payload: {
        adaptationId: adaptation.id,
        userIdHash: adaptation.userIdHash,
        adaptationType: adaptation.type,
        revertedValue: adaptation.newValue,
        originalValue: adaptation.previousValue,
        revertedAt: adaptation.revertedAt ?? new Date().toISOString(),
        reason,
      },
    };
    await this.eventBus.publish(domainEvent);
  }
}
