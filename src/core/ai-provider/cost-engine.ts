/**
 * Universal AI Provider Runtime — Cost Engine
 * TASK-AIS-006A.000
 *
 * Calculates cost from model cost profiles, records running totals,
 * manages cost limit policies.
 */

import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import { EventClassification } from '../types/common.js';
import type { ICostEngine } from './contracts.js';
import type {
  ModelId, CostDetail, CostReport, CostReportId,
  CostLimitPolicy, CostEngineConfig, ModelDescriptor,
  Timestamp,
} from './types.js';
import type { CostRecordedEvent, BudgetExceededEvent } from './events.js';

export class CostEngine implements ICostEngine {
  private readonly config: CostEngineConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly getModel: (modelId: ModelId) => Promise<ModelDescriptor | null>;
  private totalInputCost = 0;
  private totalOutputCost = 0;
  private totalCachedCost = 0;
  private totalReasoningCost = 0;
  private totalImageCost = 0;
  private totalAudioCost = 0;
  private byProvider: Record<string, number> = {};
  private byModel: Record<string, number> = {};
  private byType: Record<string, number> = {};
  private limits = new Map<string, CostLimitPolicy>();

  constructor(
    config: CostEngineConfig,
    deps: {
      eventBus?: InProcessEventBus | null;
      getModel: (modelId: ModelId) => Promise<ModelDescriptor | null>;
    },
  ) {
    this.config = config;
    this.eventBus = deps.eventBus ?? null;
    this.getModel = deps.getModel;
  }

  private publish(event: DomainEventBase): void {
    if (this.eventBus) { void this.eventBus.publish(event); }
  }

  async calculate(inputTokens: number, outputTokens: number, modelId: ModelId): Promise<CostDetail> {
    const model = await this.getModel(modelId);
    const cp = model?.costProfile;

    const inputCost = (cp?.inputCostPer1kTokens ?? 0) * (inputTokens / 1000);
    const outputCost = (cp?.outputCostPer1kTokens ?? 0) * (outputTokens / 1000);
    const cachedCost = 0;
    const reasoningCost = 0;
    const imageCost = 0;
    const audioCost = 0;

    return Object.freeze({
      inputCost,
      outputCost,
      cachedCost,
      reasoningCost,
      imageCost,
      audioCost,
      totalCost: inputCost + outputCost + cachedCost + reasoningCost + imageCost + audioCost,
      currency: cp?.currency ?? this.config.defaultCurrency,
    });
  }

  async record(cost: CostDetail): Promise<void> {
    this.totalInputCost += cost.inputCost;
    this.totalOutputCost += cost.outputCost;
    this.totalCachedCost += cost.cachedCost;
    this.totalReasoningCost += cost.reasoningCost;
    this.totalImageCost += cost.imageCost;
    this.totalAudioCost += cost.audioCost;

    this.byType['input'] = (this.byType['input'] ?? 0) + cost.inputCost;
    this.byType['output'] = (this.byType['output'] ?? 0) + cost.outputCost;
    this.byType['cached'] = (this.byType['cached'] ?? 0) + cost.cachedCost;
    this.byType['reasoning'] = (this.byType['reasoning'] ?? 0) + cost.reasoningCost;
    this.byType['image'] = (this.byType['image'] ?? 0) + cost.imageCost;
    this.byType['audio'] = (this.byType['audio'] ?? 0) + cost.audioCost;

    this.publish(Object.freeze({
      eventType: 'cost.recorded',
      classification: EventClassification.Action,
      executionId: '' as import('./types.js').ExecutionId,
      providerId: '' as import('./types.js').ProviderId,
      modelId: '' as ModelId,
      totalCost: cost.totalCost,
      currency: cost.currency,
      timestamp: new Date().toISOString(),
      metadata: {},
      eventId: crypto.randomUUID(), sequence: 0,
      aggregateId: 'cost-engine',
      aggregateType: 'CostEngine',
      version: '1.0.0',
    } as CostRecordedEvent & DomainEventBase));
  }

  async getReport(_periodStart?: Timestamp, _periodEnd?: Timestamp): Promise<CostReport> {
    const total = this.totalInputCost + this.totalOutputCost + this.totalCachedCost
      + this.totalReasoningCost + this.totalImageCost + this.totalAudioCost;
    return Object.freeze({
      id: crypto.randomUUID() as CostReportId,
      periodStart: _periodStart ?? this.periodStart(),
      periodEnd: _periodEnd ?? new Date().toISOString(),
      totalCost: total,
      byProvider: Object.freeze({ ...this.byProvider }),
      byModel: Object.freeze({ ...this.byModel }),
      byType: Object.freeze({ ...this.byType }),
      currency: this.config.defaultCurrency,
      budgetUsed: 0,
      budgetRemaining: 0,
      metadata: {},
    });
  }

  async getByProvider(providerId: string): Promise<number> {
    return this.byProvider[providerId] ?? 0;
  }

  async getByModel(modelId: string): Promise<number> {
    return this.byModel[modelId] ?? 0;
  }

  async getTotal(): Promise<number> {
    return this.totalInputCost + this.totalOutputCost + this.totalCachedCost
      + this.totalReasoningCost + this.totalImageCost + this.totalAudioCost;
  }

  async setLimit(policy: CostLimitPolicy): Promise<void> {
    this.limits.set(policy.id, policy);
  }

  async removeLimit(id: string): Promise<void> {
    this.limits.delete(id);
  }

  async checkLimit(): Promise<{ withinLimit: boolean; usage: number; limit: number }> {
    // Check the most restrictive global limit
    let closestLimit = Infinity;
    for (const policy of this.limits.values()) {
      if (policy.scope === 'global' && policy.limit < closestLimit) {
        closestLimit = policy.limit;
      }
    }

    if (closestLimit === Infinity) {
      return { withinLimit: true, usage: 0, limit: 0 };
    }

    const total = await this.getTotal();
    const withinLimit = total < closestLimit;

    if (!withinLimit) {
      this.publish(Object.freeze({
        eventType: 'budget.exceeded',
        classification: EventClassification.Error,
        budgetLimit: closestLimit,
        currentUsage: total,
        period: 'global',
        action: 'block',
        timestamp: new Date().toISOString(),
        metadata: {},
        eventId: crypto.randomUUID(), sequence: 0,
        aggregateId: 'cost-engine',
        aggregateType: 'CostEngine',
        version: '1.0.0',
      } as BudgetExceededEvent & DomainEventBase));
    }

    return { withinLimit, usage: total, limit: closestLimit };
  }

  private periodStart(): string {
    return new Date(Date.now() - 86400000).toISOString();
  }
}
