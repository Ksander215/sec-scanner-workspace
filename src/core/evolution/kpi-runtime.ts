/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #8
 * KPIRuntime: All improvements are measured — Before, After, ROI, Value, Cost, Time.
 * TASK-AIS-008A.000 | PHI-003: Every recommendation must be measurable.
 */

import type { Timestamp } from '../types/common.js';
import { EventClassification } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { IKPIRuntime, KPIRegistrationParams } from './contracts.js';
import type {
  KPIId, KPIDefinition, KPIMeasurement, KPIComparison, KPIRuntimeConfig,
} from './types.js';
import { brandKPIId, KPDirection } from './types.js';
import type { KPIRegisteredEvent, KPIUpdatedEvent } from './events.js';
import { PINotFoundError, PILimitExceededError } from './errors.js';

export class KPIRuntime implements IKPIRuntime {
  private readonly config: KPIRuntimeConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly kpis = new Map<string, KPIDefinition>();

  constructor(config: KPIRuntimeConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async register(params: KPIRegistrationParams): Promise<KPIDefinition> {
    if (this.kpis.size >= this.config.maxKPIs) {
      throw new PILimitExceededError(this.config.maxKPIs);
    }

    const now: Timestamp = new Date().toISOString();
    const id = brandKPIId(crypto.randomUUID());

    const measurement: KPIMeasurement = Object.freeze({
      value: params.initialValue,
      timestamp: now,
      metadata: Object.freeze({}),
    });

    const kpi: KPIDefinition = Object.freeze({
      id,
      name: params.name,
      description: params.description,
      unit: params.unit,
      direction: params.direction,
      target: params.target,
      currentValue: params.initialValue,
      history: Object.freeze([measurement]),
      createdAt: now,
      metadata: Object.freeze({ ...params.metadata }),
    });

    this.kpis.set(id as string, kpi);

    const event = Object.freeze({
      eventType: 'evolution.kpi.registered',
      classification: EventClassification.Action,
      kpiId: id,
      name: kpi.name,
      timestamp: now,
      metadata: Object.freeze({}),
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId: id as string,
      aggregateType: 'KPIDefinition',
      version: '1.0.0',
    } as KPIRegisteredEvent & DomainEventBase);

    this.eventBus?.publish(event);

    return kpi;
  }

  async record(kpiId: KPIId, value: number, metadata?: Readonly<Record<string, unknown>>): Promise<void> {
    const key = kpiId as string;
    const existing = this.kpis.get(key);
    if (!existing) throw new PINotFoundError(key);

    const previousValue = existing.currentValue;
    const now: Timestamp = new Date().toISOString();
    const improved = this.isImproved(existing.direction, value, previousValue, existing.target);

    const measurement: KPIMeasurement = Object.freeze({
      value,
      timestamp: now,
      metadata: Object.freeze({ ...(metadata ?? {}) }),
    });

    const newHistory = [...existing.history, measurement];
    if (newHistory.length > this.config.maxHistoryLength) {
      newHistory.splice(0, newHistory.length - this.config.maxHistoryLength);
    }

    const updated: KPIDefinition = Object.freeze({
      ...existing,
      currentValue: value,
      history: Object.freeze(newHistory),
    });

    this.kpis.set(key, updated);

    const classification = improved ? EventClassification.Result : EventClassification.Info;

    const event = Object.freeze({
      eventType: 'evolution.kpi.updated',
      classification,
      kpiId,
      newValue: value,
      previousValue,
      improved,
      timestamp: now,
      metadata: Object.freeze({}),
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId: key,
      aggregateType: 'KPIDefinition',
      version: '1.0.0',
    } as KPIUpdatedEvent & DomainEventBase);

    this.eventBus?.publish(event);
  }

  async getById(id: KPIId): Promise<KPIDefinition | null> {
    return this.kpis.get(id as string) ?? null;
  }

  async list(): Promise<readonly KPIDefinition[]> {
    return Array.from(this.kpis.values());
  }

  async getComparison(kpiId: KPIId, beforeTimestamp: string, afterTimestamp: string): Promise<KPIComparison | null> {
    const kpi = this.kpis.get(kpiId as string);
    if (!kpi) return null;

    const beforeEntry = kpi.history.find(m => m.timestamp <= beforeTimestamp);
    const afterEntry = [...kpi.history].reverse().find(m => m.timestamp >= afterTimestamp);
    if (!beforeEntry || !afterEntry) return null;

    const change = afterEntry.value - beforeEntry.value;
    const changePercent = beforeEntry.value === 0
      ? (afterEntry.value === 0 ? 0 : 100)
      : (change / beforeEntry.value) * 100;
    const improved = this.isImproved(kpi.direction, afterEntry.value, beforeEntry.value, kpi.target);

    return Object.freeze({
      kpiId,
      kpiName: kpi.name,
      beforeValue: beforeEntry.value,
      afterValue: afterEntry.value,
      change,
      changePercent,
      direction: kpi.direction,
      improved,
      metadata: Object.freeze({}),
    });
  }

  async count(): Promise<number> {
    return this.kpis.size;
  }

  private isImproved(
    direction: KPDirection,
    afterValue: number,
    beforeValue: number,
    target: number | null,
  ): boolean {
    switch (direction) {
      case KPDirection.HigherIsBetter:
        return afterValue > beforeValue;
      case KPDirection.LowerIsBetter:
        return afterValue < beforeValue;
      case KPDirection.TargetIsOptimal:
        if (target === null) return false;
        return Math.abs(afterValue - target) < Math.abs(beforeValue - target);
      default:
        return false;
    }
  }
}
