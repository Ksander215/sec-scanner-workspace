/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #13
 * TechnicalDebtAnalyzer: Evaluates tech debt cost, priority of elimination.
 * TASK-AIS-008A.000
 */

import type { EventBus } from '../events/event-bus.js';
import type {
  TechDebtId, TechDebtItem, TechDebtPriority, TechDebtConfig,
} from './types.js';
import { brandTechDebtId } from './types.js';
import type { ITechDebtAnalyzer, TechDebtRegistrationParams } from './contracts.js';
import { TechDebtNotFoundError, TechDebtLimitExceededError } from './errors.js';
import type { TechDebtDetectedEvent, TechDebtResolvedEvent } from './events.js';
import { EventClassification } from '../types/common.js';

class TechDebtStore {
  private readonly items = new Map<string, TechDebtItem>();
  add(t: TechDebtItem): void { this.items.set(t.id, t); }
  get(id: TechDebtId): TechDebtItem | undefined { return this.items.get(id); }
  getAll(): readonly TechDebtItem[] { return Object.freeze([...this.items.values()]); }
  update(id: TechDebtId, t: TechDebtItem): void { this.items.set(id, t); }
  get size(): number { return this.items.size; }
}

export class TechnicalDebtAnalyzer implements ITechDebtAnalyzer {
  private readonly config: TechDebtConfig;
  private readonly eventBus: EventBus | null;
  private readonly store = new TechDebtStore();

  constructor(config: TechDebtConfig, eventBus?: EventBus) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async register(params: TechDebtRegistrationParams): Promise<TechDebtItem> {
    if (this.store.size >= this.config.maxItems) {
      throw new TechDebtLimitExceededError(this.config.maxItems);
    }
    const ts = new Date().toISOString();
    const item: TechDebtItem = Object.freeze({
      id: brandTechDebtId(crypto.randomUUID()),
      name: params.name,
      description: params.description,
      priority: params.priority,
      estimatedCost: params.estimatedCost,
      impact: params.impact,
      targetModule: params.targetModule,
      targetFile: params.targetFile,
      createdAt: ts,
      resolvedAt: null,
      metadata: params.metadata,
    });
    this.store.add(item);
    void this.publishEvent<TechDebtDetectedEvent>({
      eventType: 'evolution.techDebt.detected', classification: EventClassification.Action,
      techDebtId: item.id, name: item.name, priority: params.priority,
      estimatedCost: params.estimatedCost, timestamp: ts, metadata: Object.freeze({}),
    });
    return item;
  }

  async resolve(id: TechDebtId): Promise<void> {
    const existing = this.store.get(id);
    if (!existing) throw new TechDebtNotFoundError(id);
    const ts = new Date().toISOString();
    this.store.update(id, Object.freeze({ ...existing, resolvedAt: ts }));
    void this.publishEvent<TechDebtResolvedEvent>({
      eventType: 'evolution.techDebt.resolved', classification: EventClassification.StateChange,
      techDebtId: id, timestamp: ts, metadata: Object.freeze({}),
    });
  }

  async getById(id: TechDebtId): Promise<TechDebtItem | null> {
    return this.store.get(id) ?? null;
  }

  async list(filter?: Partial<{ priority: TechDebtPriority; resolved: boolean }>): Promise<readonly TechDebtItem[]> {
    let items = this.store.getAll();
    if (filter?.priority !== undefined) items = items.filter(t => t.priority === filter.priority);
    if (filter?.resolved !== undefined) items = items.filter(t => (t.resolvedAt !== null) === filter.resolved);
    return items;
  }

  async getTotalCost(): Promise<number> {
    return this.store.getAll()
      .filter(t => t.resolvedAt === null)
      .reduce((sum, t) => sum + t.estimatedCost, 0);
  }

  async count(): Promise<number> { return this.store.size; }

  getStore(): TechDebtStore { return this.store; }

  private async publishEvent<T extends { eventType: string; classification: EventClassification; timestamp: string }>(
    partial: Omit<T, 'eventId' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        aggregateId: 'evolution-tech-debt-analyzer', aggregateType: 'Evolution', version: '1.0.0',
        ...partial,
      } as unknown as import('../../core/domain/events/domain-event.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
