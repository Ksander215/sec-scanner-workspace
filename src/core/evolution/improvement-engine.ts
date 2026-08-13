/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Improvement Engine
 * TASK-AIS-008A.000
 *
 * Builds and manages improvement recommendations.
 * PHI-001: Create value; PHI-005: No optimization without value.
 */

import type { Timestamp } from '../types/common.js';
import { EventClassification } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { IImprovementEngine, ImprovementProposalParams } from './contracts.js';
import type {
  ImprovementId, Improvement, ImprovementStatus, ConstraintType,
  ImprovementEngineConfig,
} from './types.js';
import { brandImprovementId, ImprovementStatus as IS, ValueDimension as VD } from './types.js';
import {
  ImprovementNotFoundError, ImprovementLimitExceededError, ImprovementStateError,
} from './errors.js';

const VALID_TRANSITIONS: Record<ImprovementStatus, readonly ImprovementStatus[]> = Object.freeze({
  [IS.Proposed]: Object.freeze([IS.Planned, IS.Rejected]),
  [IS.Planned]: Object.freeze([IS.InProgress, IS.Rejected]),
  [IS.InProgress]: Object.freeze([IS.Completed, IS.Failed, IS.RolledBack]),
  [IS.Completed]: Object.freeze([]),
  [IS.Failed]: Object.freeze([IS.Proposed]),
  [IS.Rejected]: Object.freeze([]),
  [IS.RolledBack]: Object.freeze([IS.Proposed]),
});

export class ImprovementEngine implements IImprovementEngine {
  private readonly config: ImprovementEngineConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly improvements = new Map<string, Improvement>();

  constructor(config: ImprovementEngineConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async propose(params: ImprovementProposalParams): Promise<Improvement> {
    if (this.improvements.size >= this.config.maxImprovements) {
      throw new ImprovementLimitExceededError(this.config.maxImprovements);
    }

    const now: Timestamp = new Date().toISOString();
    const id = brandImprovementId(crypto.randomUUID());

    const improvement: Improvement = Object.freeze({
      id,
      name: params.name,
      description: params.description,
      status: IS.Proposed,
      bottleneckId: params.bottleneckId,
      constraintType: params.constraintType,
      valueScore: 0,
      impactScore: 0,
      costScore: 0,
      riskScore: 0,
      urgencyScore: 0,
      constraintWeight: 1.0,
      priority: 0,
      valueDimension: VD.PlatformValue,
      targetRuntime: params.targetRuntime,
      targetCapability: params.targetCapability,
      estimatedEffort: params.estimatedEffort,
      proposedAt: now,
      startedAt: null,
      completedAt: null,
      evidence: Object.freeze([...params.evidence]),
      metadata: Object.freeze({ ...params.metadata }),
    });

    this.improvements.set(id as string, improvement);

    await this.publishEvent({
      eventType: 'evolution.improvement.proposed',
      classification: EventClassification.Action,
      improvementId: id,
      name: improvement.name,
      constraintType: improvement.constraintType,
      valueScore: improvement.valueScore,
      priority: improvement.priority,
      valueDimension: improvement.valueDimension,
      timestamp: now,
      metadata: Object.freeze({}),
    }, id as string, 'Improvement');

    return improvement;
  }

  async getById(id: ImprovementId): Promise<Improvement | null> {
    return this.improvements.get(id as string) ?? null;
  }

  async list(filter?: Partial<{ status: ImprovementStatus; constraintType: ConstraintType }>): Promise<readonly Improvement[]> {
    let results = Array.from(this.improvements.values());
    if (filter) {
      if (filter.status !== undefined) {
        results = results.filter(i => i.status === filter.status);
      }
      if (filter.constraintType !== undefined) {
        results = results.filter(i => i.constraintType === filter.constraintType);
      }
    }
    return results;
  }

  async updateStatus(id: ImprovementId, status: ImprovementStatus): Promise<void> {
    const key = id as string;
    const existing = this.improvements.get(key);
    if (!existing) throw new ImprovementNotFoundError(key);

    const validTargets = VALID_TRANSITIONS[existing.status];
    if (!validTargets.includes(status)) {
      throw new ImprovementStateError(key, existing.status, status);
    }

    const now: Timestamp = new Date().toISOString();
    const startedAt = status === IS.InProgress ? now : existing.startedAt;
    const completedAt = (status === IS.Completed || status === IS.Failed) ? now : existing.completedAt;

    const updated: Improvement = Object.freeze({
      ...existing,
      status,
      startedAt,
      completedAt,
    });

    this.improvements.set(key, updated);

    await this.publishEvent({
      eventType: 'evolution.improvement.statusChanged',
      classification: EventClassification.StateChange,
      improvementId: id,
      fromStatus: existing.status,
      toStatus: status,
      timestamp: now,
      metadata: Object.freeze({}),
    }, key, 'Improvement');

    if (status === IS.Completed) {
      await this.publishEvent({
        eventType: 'evolution.improvement.completed',
        classification: EventClassification.Result,
        improvementId: id,
        valueScore: updated.valueScore,
        durationMs: startedAt ? Date.now() - new Date(startedAt).getTime() : 0,
        timestamp: now,
        metadata: Object.freeze({}),
      }, key, 'Improvement');
    }

    if (status === IS.Rejected) {
      await this.publishEvent({
        eventType: 'evolution.improvement.rejected',
        classification: EventClassification.StateChange,
        improvementId: id,
        reason: 'Improvement rejected',
        timestamp: now,
        metadata: Object.freeze({}),
      }, key, 'Improvement');
    }
  }

  async count(): Promise<number> {
    return this.improvements.size;
  }

  /**
   * Update scoring fields on an improvement. Used by ValueAnalyzer and RecommendationPrioritizer.
   * This is a public method but NOT part of the IImprovementEngine interface.
   */
  async updateScores(
    id: ImprovementId,
    scores: {
      valueScore?: number;
      impactScore?: number;
      costScore?: number;
      riskScore?: number;
      urgencyScore?: number;
      constraintWeight?: number;
      priority?: number;
      valueDimension?: VD;
    },
  ): Promise<void> {
    const key = id as string;
    const existing = this.improvements.get(key);
    if (!existing) throw new ImprovementNotFoundError(key);

    const updated: Improvement = Object.freeze({
      ...existing,
      valueScore: scores.valueScore ?? existing.valueScore,
      impactScore: scores.impactScore ?? existing.impactScore,
      costScore: scores.costScore ?? existing.costScore,
      riskScore: scores.riskScore ?? existing.riskScore,
      urgencyScore: scores.urgencyScore ?? existing.urgencyScore,
      constraintWeight: scores.constraintWeight ?? existing.constraintWeight,
      priority: scores.priority ?? existing.priority,
      valueDimension: scores.valueDimension ?? existing.valueDimension,
    });

    this.improvements.set(key, updated);
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
