/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #5
 * OpportunityCostEngine: If we improve X, what can we NOT improve?
 * TASK-AIS-008A.000 | PHI-006: Local optimization is forbidden.
 */

import type { EventBus } from '../events/event-bus.js';
import type {
  ImprovementId, OpportunityCost, OpportunityCostConfig,
} from './types.js';
import type { IOpportunityCostEngine } from './contracts.js';
import type { OpportunityCostAnalyzedEvent } from './events.js';
import { EventClassification } from '../types/common.js';

class OpportunityCostStore {
  private readonly items = new Map<string, OpportunityCost>();
  private readonly byImprovement = new Map<string, OpportunityCost>();

  add(a: OpportunityCost): void {
    this.items.set(a.improvementId, a);
    this.byImprovement.set(a.improvementId, a);
  }
  getByImprovement(id: ImprovementId): OpportunityCost | undefined { return this.byImprovement.get(id); }
  getAll(): readonly OpportunityCost[] { return Object.freeze([...this.items.values()]); }
  get size(): number { return this.items.size; }
}

export class OpportunityCostEngine implements IOpportunityCostEngine {
  private readonly eventBus: EventBus | null;
  private readonly store = new OpportunityCostStore();

  constructor(config: OpportunityCostConfig, eventBus?: EventBus) {
    void config;
    this.eventBus = eventBus ?? null;
  }

  async analyze(improvementId: ImprovementId): Promise<OpportunityCost> {
    const ts = new Date().toISOString();

    const analysis: OpportunityCost = Object.freeze({
      improvementId,
      foregoneImprovements: Object.freeze([] as ImprovementId[]),
      foregoneValue: 0,
      foregoneImpact: 0,
      netBenefit: 0,
      analyzedAt: ts,
      metadata: Object.freeze({}),
    });

    this.store.add(analysis);

    void this.publishEvent<OpportunityCostAnalyzedEvent>({
      eventType: 'evolution.opportunityCost.analyzed',
      classification: EventClassification.Result,
      improvementId,
      netBenefit: analysis.netBenefit,
      foregoneCount: analysis.foregoneImprovements.length,
      timestamp: ts,
      metadata: Object.freeze({}),
    });

    return analysis;
  }

  async getByImprovementId(improvementId: ImprovementId): Promise<OpportunityCost | null> {
    return this.store.getByImprovement(improvementId) ?? null;
  }

  async listAnalyses(): Promise<readonly OpportunityCost[]> {
    return this.store.getAll();
  }

  getStore(): OpportunityCostStore { return this.store; }

  private async publishEvent<T extends { eventType: string; classification: EventClassification; timestamp: string }>(
    partial: Omit<T, 'eventId' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        eventId: crypto.randomUUID(),
        sequence: 0,
        aggregateId: 'evolution-opportunity-cost',
        aggregateType: 'Evolution',
        version: '1.0.0',
        ...partial,
      } as unknown as import('../../core/domain/events/domain-event.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
