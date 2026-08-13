/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Tech Debt Analyzer
 * TASK-AIS-008A.000
 *
 * Evaluates tech debt cost, priority of elimination.
 */

import type { Timestamp } from '../types/common.js';
import { EventClassification } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { ITechDebtAnalyzer, TechDebtRegistrationParams } from './contracts.js';
import type {
  TechDebtId, TechDebtItem, TechDebtPriority, TechDebtConfig,
} from './types.js';
import { brandTechDebtId } from './types.js';
import { TechDebtNotFoundError, TechDebtLimitExceededError } from './errors.js';

export class TechDebtAnalyzer implements ITechDebtAnalyzer {
  private readonly config: TechDebtConfig;
  private readonly eventBus: InProcessEventBus | null;
  private items = new Map<string, TechDebtItem>();

  constructor(config: TechDebtConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async register(params: TechDebtRegistrationParams): Promise<TechDebtItem> {
    if (this.items.size >= this.config.maxItems) {
      throw new TechDebtLimitExceededError(this.config.maxItems);
    }

    const now: Timestamp = new Date().toISOString();
    const id = brandTechDebtId(crypto.randomUUID());

    const item: TechDebtItem = Object.freeze({
      id,
      name: params.name,
      description: params.description,
      priority: params.priority,
      estimatedCost: params.estimatedCost,
      impact: params.impact,
      targetModule: params.targetModule,
      targetFile: params.targetFile,
      createdAt: now,
      resolvedAt: null,
      metadata: Object.freeze({ ...params.metadata }),
    });

    this.items.set(id as string, item);

    await this.publishEvent({
      eventType: 'evolution.techDebt.detected',
      classification: EventClassification.Action,
      techDebtId: id,
      name: params.name,
      priority: params.priority,
      estimatedCost: params.estimatedCost,
      timestamp: now,
      metadata: Object.freeze({}),
    }, id as string, 'TechDebt');

    return item;
  }

  async resolve(id: TechDebtId): Promise<void> {
    const key = id as string;
    const existing = this.items.get(key);
    if (!existing) throw new TechDebtNotFoundError(key);

    const now: Timestamp = new Date().toISOString();
    const resolved: TechDebtItem = Object.freeze({
      ...existing,
      resolvedAt: now,
    });

    this.items.set(key, resolved);

    await this.publishEvent({
      eventType: 'evolution.techDebt.resolved',
      classification: EventClassification.StateChange,
      techDebtId: id,
      timestamp: now,
      metadata: Object.freeze({}),
    }, key, 'TechDebt');
  }

  async getById(id: TechDebtId): Promise<TechDebtItem | null> {
    return this.items.get(id as string) ?? null;
  }

  async list(filter?: Partial<{ priority: TechDebtPriority; resolved: boolean }>): Promise<readonly TechDebtItem[]> {
    let results = Array.from(this.items.values());
    if (filter) {
      if (filter.priority !== undefined) {
        results = results.filter(t => t.priority === filter.priority);
      }
      if (filter.resolved !== undefined) {
        results = results.filter(t => (t.resolvedAt !== null) === filter.resolved);
      }
    }
    return results;
  }

  async getTotalCost(): Promise<number> {
    return Array.from(this.items.values())
      .filter(t => t.resolvedAt === null)
      .reduce((sum, t) => sum + t.estimatedCost, 0);
  }

  async count(): Promise<number> {
    return this.items.size;
  }

  /** Reset internal state. Used by EvolutionRuntime.shutdown(). */
  dispose(): void {
    this.items = new Map();
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
