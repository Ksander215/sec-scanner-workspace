/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Opportunity Cost Engine
 * TASK-AIS-008A.000
 *
 * Analyzes opportunity cost of pursuing one improvement over alternatives.
 * PHI-006: Avoid local optimization; consider global value impact.
 */

import type { Timestamp } from '../types/common.js';
import { EventClassification } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { IOpportunityCostEngine } from './contracts.js';
import type {
  ImprovementId, OpportunityCost, OpportunityCostConfig,
} from './types.js';
import type { IImprovementEngine } from './contracts.js';
import { OpportunityCostError } from './errors.js';

export class OpportunityCostEngine implements IOpportunityCostEngine {
  private readonly config: OpportunityCostConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly analyses = new Map<string, OpportunityCost>();
  private improvementEngine: IImprovementEngine | null = null;

  constructor(config: OpportunityCostConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  setImprovementEngine(engine: IImprovementEngine): void {
    this.improvementEngine = engine;
  }

  async analyze(improvementId: ImprovementId): Promise<OpportunityCost> {
    if (!this.improvementEngine) {
      throw new OpportunityCostError('Improvement engine not set');
    }

    const improvement = await this.improvementEngine.getById(improvementId);
    if (!improvement) {
      throw new OpportunityCostError(`Improvement not found: ${improvementId as string}`);
    }

    const now: Timestamp = new Date().toISOString();

    // Get other proposed improvements as foregone alternatives
    const allImprovements = await this.improvementEngine.list({ status: undefined as never });
    const others = allImprovements
      .filter(i => (i.id as string) !== (improvementId as string))
      .sort((a, b) => b.valueScore - a.valueScore)
      .slice(0, this.config.maxForegoneItems);

    const foregoneImprovements = others.map(i => i.id);
    const foregoneValue = others.reduce((sum, i) => sum + i.valueScore, 0);
    const foregoneImpact = others.reduce((sum, i) => sum + i.impactScore, 0);
    const netBenefit = improvement.valueScore - foregoneValue;

    const analysis: OpportunityCost = Object.freeze({
      improvementId,
      foregoneImprovements: Object.freeze(foregoneImprovements),
      foregoneValue,
      foregoneImpact,
      netBenefit,
      analyzedAt: now,
      metadata: Object.freeze({}),
    });

    this.analyses.set(improvementId as string, analysis);

    await this.publishEvent({
      eventType: 'evolution.opportunityCost.analyzed',
      classification: EventClassification.Result,
      improvementId,
      netBenefit,
      foregoneCount: foregoneImprovements.length,
      timestamp: now,
      metadata: Object.freeze({}),
    }, improvementId as string, 'OpportunityCost');

    return analysis;
  }

  async getByImprovementId(improvementId: ImprovementId): Promise<OpportunityCost | null> {
    return this.analyses.get(improvementId as string) ?? null;
  }

  async listAnalyses(): Promise<readonly OpportunityCost[]> {
    return Array.from(this.analyses.values());
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
