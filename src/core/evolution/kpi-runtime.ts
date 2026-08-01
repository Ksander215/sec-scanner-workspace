/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #8
 * KPIRuntime: All improvements are measured — Before, After, ROI, Value, Cost, Time.
 * TASK-AIS-008A.000 | PHI-003: Every recommendation must be measurable.
 */

import type { EventBus } from '../events/event-bus.js';
import type {
  KPIId, KPIDefinition, KPIMeasurement, KPIComparison, KPIRuntimeConfig,
} from './types.js';
import { brandKPIId } from './types.js';
import type { IKPIRuntime, KPIRegistrationParams } from './contracts.js';
import { PINotFoundError, PILimitExceededError } from './errors.js';
import type { KPIRegisteredEvent, KPIUpdatedEvent } from './events.js';
import { EventClassification } from '../types/common.js';

class KPIStore {
  private readonly items = new Map<string, KPIDefinition>();
  add(k: KPIDefinition): void { this.items.set(k.id, k); }
  get(id: KPIId): KPIDefinition | undefined { return this.items.get(id); }
  getAll(): readonly KPIDefinition[] { return Object.freeze([...this.items.values()]); }
  update(id: KPIId, k: KPIDefinition): void { this.items.set(id, k); }
  get size(): number { return this.items.size; }
}

export class KPIRuntime implements IKPIRuntime {
  private readonly config: KPIRuntimeConfig;
  private readonly eventBus: EventBus | null;
  private readonly store = new KPIStore();

  constructor(config: KPIRuntimeConfig, eventBus?: EventBus) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async register(params: KPIRegistrationParams): Promise<KPIDefinition> {
    if (this.store.size >= this.config.maxKPIs) {
      throw new PILimitExceededError(this.config.maxKPIs);
    }
    const ts = new Date().toISOString();
    const measurement: KPIMeasurement = Object.freeze({
      value: params.initialValue, timestamp: ts, metadata: Object.freeze({}),
    });
    const kpi: KPIDefinition = Object.freeze({
      id: brandKPIId(crypto.randomUUID()),
      name: params.name,
      description: params.description,
      unit: params.unit,
      direction: params.direction,
      target: params.target,
      currentValue: params.initialValue,
      history: Object.freeze([measurement]),
      createdAt: ts,
      metadata: params.metadata,
    });
    this.store.add(kpi);
    void this.publishEvent<KPIRegisteredEvent>({
      eventType: 'evolution.kpi.registered', classification: EventClassification.Action,
      kpiId: kpi.id, name: kpi.name, timestamp: ts, metadata: Object.freeze({}),
    });
    return kpi;
  }

  async record(kpiId: KPIId, value: number, metadata?: Readonly<Record<string, unknown>>): Promise<void> {
    const existing = this.store.get(kpiId);
    if (!existing) throw new PINotFoundError(kpiId);
    const previousValue = existing.currentValue;
    const ts = new Date().toISOString();
    const measurement: KPIMeasurement = Object.freeze({
      value, timestamp: ts, metadata: metadata ?? Object.freeze({}),
    });
    const newHistory = [...existing.history, measurement];
    if (newHistory.length > this.config.maxHistoryLength) {
      newHistory.splice(0, newHistory.length - this.config.maxHistoryLength);
    }
    const improved = existing.direction === 'HigherIsBetter'
      ? value > previousValue
      : existing.direction === 'LowerIsBetter'
        ? value < previousValue
        : existing.target !== null
          ? Math.abs(value - existing.target) < Math.abs(previousValue - existing.target)
          : false;
    this.store.update(kpiId, Object.freeze({
      ...existing, currentValue: value, history: Object.freeze(newHistory),
    }));
    void this.publishEvent<KPIUpdatedEvent>({
      eventType: 'evolution.kpi.updated', classification: EventClassification.Result,
      kpiId, newValue: value, previousValue, improved, timestamp: ts, metadata: Object.freeze({}),
    });
  }

  async getById(id: KPIId): Promise<KPIDefinition | null> {
    return this.store.get(id) ?? null;
  }

  async list(): Promise<readonly KPIDefinition[]> {
    return this.store.getAll();
  }

  async getComparison(kpiId: KPIId, beforeTimestamp: string, afterTimestamp: string): Promise<KPIComparison | null> {
    const kpi = this.store.get(kpiId);
    if (!kpi) return null;
    const beforeEntry = kpi.history.find(m => m.timestamp <= beforeTimestamp);
    const afterEntry = [...kpi.history].reverse().find(m => m.timestamp >= afterTimestamp);
    if (!beforeEntry || !afterEntry) return null;
    const change = afterEntry.value - beforeEntry.value;
    const changePercent = beforeEntry.value === 0
      ? (afterEntry.value === 0 ? 0 : 100)
      : (change / beforeEntry.value) * 100;
    const improved = kpi.direction === 'HigherIsBetter'
      ? change > 0
      : kpi.direction === 'LowerIsBetter'
        ? change < 0
        : kpi.target !== null
          ? Math.abs(afterEntry.value - kpi.target) < Math.abs(beforeEntry.value - kpi.target)
          : false;
    return Object.freeze({
      kpiId, kpiName: kpi.name,
      beforeValue: beforeEntry.value, afterValue: afterEntry.value,
      change, changePercent, direction: kpi.direction, improved,
      metadata: Object.freeze({}),
    });
  }

  async count(): Promise<number> { return this.store.size; }

  getStore(): KPIStore { return this.store; }

  private async publishEvent<T extends { eventType: string; classification: EventClassification; timestamp: string }>(
    partial: Omit<T, 'eventId' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        aggregateId: 'evolution-kpi-runtime', aggregateType: 'Evolution', version: '1.0.0',
        ...partial,
      } as unknown as import('../../core/domain/events/domain-event.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
