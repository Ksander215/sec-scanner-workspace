/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #3
 * ImprovementEngine: Builds and manages improvement recommendations.
 * TASK-AIS-008A.000 | PHI-001: Create value; PHI-005: No optimization without value.
 */

import type { EventBus } from '../events/event-bus.js';
import type {
  ImprovementId, Improvement, ImprovementStatus,
  ConstraintType, ImprovementEngineConfig,
} from './types.js';
import { ImprovementStatus as IS, ValueDimension as VD, brandImprovementId } from './types.js';
import type { IImprovementEngine, ImprovementProposalParams } from './contracts.js';
import {
  ImprovementNotFoundError, ImprovementLimitExceededError, ImprovementStateError,
} from './errors.js';
import type { ImprovementProposedEvent, ImprovementStatusChangedEvent, ImprovementCompletedEvent } from './events.js';
import { EventClassification } from '../types/common.js';

const VALID_TRANSITIONS: Record<ImprovementStatus, readonly ImprovementStatus[]> = {
  [IS.Proposed]: Object.freeze([IS.Planned, IS.Rejected]),
  [IS.Planned]: Object.freeze([IS.InProgress, IS.Rejected]),
  [IS.InProgress]: Object.freeze([IS.Completed, IS.Failed, IS.RolledBack]),
  [IS.Completed]: Object.freeze([]),
  [IS.Failed]: Object.freeze([IS.Proposed]),
  [IS.Rejected]: Object.freeze([]),
  [IS.RolledBack]: Object.freeze([IS.Proposed]),
};

class ImprovementStore {
  private readonly items = new Map<string, Improvement>();

  add(i: Improvement): void { this.items.set(i.id, i); }
  get(id: ImprovementId): Improvement | undefined { return this.items.get(id); }
  getAll(): readonly Improvement[] { return Object.freeze([...this.items.values()]); }
  update(id: ImprovementId, i: Improvement): void { this.items.set(id, i); }
  get size(): number { return this.items.size; }
}

export class ImprovementEngine implements IImprovementEngine {
  private readonly config: ImprovementEngineConfig;
  private readonly eventBus: EventBus | null;
  private readonly store = new ImprovementStore();

  constructor(config: ImprovementEngineConfig, eventBus?: EventBus) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async propose(params: ImprovementProposalParams): Promise<Improvement> {
    if (this.store.size >= this.config.maxImprovements) {
      throw new ImprovementLimitExceededError(this.config.maxImprovements);
    }
    const ts = new Date().toISOString();
    const improvement: Improvement = Object.freeze({
      id: brandImprovementId(crypto.randomUUID()),
      status: IS.Proposed,
      name: params.name,
      description: params.description,
      bottleneckId: params.bottleneckId,
      constraintType: params.constraintType,
      targetRuntime: params.targetRuntime,
      targetCapability: params.targetCapability,
      estimatedEffort: params.estimatedEffort,
      valueScore: 0,
      impactScore: 0,
      costScore: 0,
      riskScore: 0,
      urgencyScore: 0,
      constraintWeight: 1.0,
      priority: 0,
      valueDimension: VD.UserValue,
      proposedAt: ts,
      startedAt: null,
      completedAt: null,
      evidence: params.evidence,
      metadata: params.metadata,
    });

    this.store.add(improvement);

    void this.publishEvent<ImprovementProposedEvent>({
      eventType: 'evolution.improvement.proposed',
      classification: EventClassification.Action,
      improvementId: improvement.id,
      name: improvement.name,
      constraintType: improvement.constraintType,
      valueScore: improvement.valueScore,
      priority: improvement.priority,
      valueDimension: improvement.valueDimension,
      timestamp: ts,
      metadata: Object.freeze({}),
    });

    return improvement;
  }

  async getById(id: ImprovementId): Promise<Improvement | null> {
    return this.store.get(id) ?? null;
  }

  async list(filter?: Partial<{ status: ImprovementStatus; constraintType: ConstraintType }>): Promise<readonly Improvement[]> {
    let items = this.store.getAll();
    if (filter?.status !== undefined) {
      items = items.filter(i => i.status === filter.status);
    }
    if (filter?.constraintType !== undefined) {
      items = items.filter(i => i.constraintType === filter.constraintType);
    }
    return items;
  }

  async updateStatus(id: ImprovementId, status: ImprovementStatus): Promise<void> {
    const existing = this.store.get(id);
    if (!existing) throw new ImprovementNotFoundError(id);

    const validTargets = VALID_TRANSITIONS[existing.status];
    if (!validTargets.includes(status)) {
      throw new ImprovementStateError(id, existing.status, status);
    }

    const ts = new Date().toISOString();
    const startedAt = status === IS.InProgress ? ts : existing.startedAt;
    const completedAt = (status === IS.Completed || status === IS.Failed) ? ts : existing.completedAt;

    const updated: Improvement = Object.freeze({
      ...existing,
      status,
      startedAt,
      completedAt,
    });
    this.store.update(id, updated);

    void this.publishEvent<ImprovementStatusChangedEvent>({
      eventType: 'evolution.improvement.statusChanged',
      classification: EventClassification.StateChange,
      improvementId: id,
      fromStatus: existing.status,
      toStatus: status,
      timestamp: ts,
      metadata: Object.freeze({}),
    });

    if (status === IS.Completed) {
      void this.publishEvent<ImprovementCompletedEvent>({
        eventType: 'evolution.improvement.completed',
        classification: EventClassification.Result,
        improvementId: id,
        valueScore: updated.valueScore,
        durationMs: startedAt ? Date.now() - new Date(startedAt).getTime() : 0,
        timestamp: ts,
        metadata: Object.freeze({}),
      });
    }
  }

  async count(): Promise<number> {
    return this.store.size;
  }

  getStore(): ImprovementStore { return this.store; }

  private async publishEvent<T extends { eventType: string; classification: EventClassification; timestamp: string }>(
    partial: Omit<T, 'eventId' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        eventId: crypto.randomUUID(),
        sequence: 0,
        aggregateId: 'evolution-improvement-engine',
        aggregateType: 'Evolution',
        version: '1.0.0',
        ...partial,
      } as unknown as import('../../core/domain/events/domain-event.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
