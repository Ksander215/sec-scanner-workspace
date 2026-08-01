/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #7
 * ExperimentRuntime: A/B experiments — measure, compare, keep the best.
 * TASK-AIS-008A.000 | PHI-007: Every change must have proof of effectiveness.
 */

import type { EventBus } from '../events/event-bus.js';
import type {
  ExperimentId, Experiment, ExperimentStatus, ExperimentConfig,
} from './types.js';
import { ExperimentStatus as ES, brandExperimentId } from './types.js';
import type { IExperimentRuntime, ExperimentProposalParams } from './contracts.js';
import {
  ExperimentNotFoundError, ExperimentLimitExceededError,
  ExperimentStateError,
} from './errors.js';
import type { ExperimentStartedEvent, ExperimentCompletedEvent } from './events.js';
import { EventClassification } from '../types/common.js';

const VALID_TRANSITIONS: Record<ExperimentStatus, readonly ExperimentStatus[]> = {
  [ES.Proposed]: Object.freeze([ES.Running, ES.Cancelled]),
  [ES.Running]: Object.freeze([ES.Completed, ES.Failed, ES.Cancelled]),
  [ES.Completed]: Object.freeze([]),
  [ES.Failed]: Object.freeze([ES.Proposed]),
  [ES.Cancelled]: Object.freeze([]),
  [ES.Inconclusive]: Object.freeze([]),
};

class ExperimentStore {
  private readonly items = new Map<string, Experiment>();
  add(e: Experiment): void { this.items.set(e.id, e); }
  get(id: ExperimentId): Experiment | undefined { return this.items.get(id); }
  getAll(): readonly Experiment[] { return Object.freeze([...this.items.values()]); }
  update(id: ExperimentId, e: Experiment): void { this.items.set(id, e); }
  get size(): number { return this.items.size; }
}

export class ExperimentRuntime implements IExperimentRuntime {
  private readonly config: ExperimentConfig;
  private readonly eventBus: EventBus | null;
  private readonly store = new ExperimentStore();

  constructor(config: ExperimentConfig, eventBus?: EventBus) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async propose(params: ExperimentProposalParams): Promise<Experiment> {
    if (this.store.size >= this.config.maxExperiments) {
      throw new ExperimentLimitExceededError(this.config.maxExperiments);
    }
    const ts = new Date().toISOString();
    const experiment: Experiment = Object.freeze({
      id: brandExperimentId(crypto.randomUUID()),
      status: ES.Proposed,
      variantA: params.variantA,
      variantB: params.variantB,
      metricName: params.metricName,
      variantAResult: null,
      variantBResult: null,
      winner: null,
      confidence: 0,
      startedAt: null,
      completedAt: null,
      proposedAt: ts,
      metadata: params.metadata,
      name: params.name,
      description: params.description,
      improvementId: params.improvementId,
    });
    this.store.add(experiment);
    return experiment;
  }

  async start(experimentId: ExperimentId): Promise<void> {
    const existing = this.store.get(experimentId);
    if (!existing) throw new ExperimentNotFoundError(experimentId);
    if (!VALID_TRANSITIONS[existing.status].includes(ES.Running)) {
      throw new ExperimentStateError(experimentId, existing.status, ES.Running);
    }
    const ts = new Date().toISOString();
    this.store.update(experimentId, Object.freeze({
      ...existing, status: ES.Running, startedAt: ts,
    }));
    void this.publishEvent<ExperimentStartedEvent>({
      eventType: 'evolution.experiment.started',
      classification: EventClassification.Action,
      experimentId, name: existing.name, improvementId: existing.improvementId,
      timestamp: ts, metadata: Object.freeze({}),
    });
  }

  async complete(experimentId: ExperimentId, resultA: number, resultB: number): Promise<void> {
    const existing = this.store.get(experimentId);
    if (!existing) throw new ExperimentNotFoundError(experimentId);
    if (existing.status !== ES.Running) {
      throw new ExperimentStateError(experimentId, existing.status, ES.Completed);
    }
    const ts = new Date().toISOString();
    const winner = resultA > resultB ? 'A' as const : resultB > resultA ? 'B' as const : null;
    const better = Math.max(resultA, resultB);
    const worse = Math.min(resultA, resultB);
    const confidence = worse === 0 ? 1 : Math.min(1, better / (better + worse));
    const finalStatus = confidence >= this.config.minConfidence
      ? ES.Completed : ES.Inconclusive;
    this.store.update(experimentId, Object.freeze({
      ...existing,
      status: finalStatus,
      variantAResult: resultA,
      variantBResult: resultB,
      winner,
      confidence,
      completedAt: ts,
    }));
    void this.publishEvent<ExperimentCompletedEvent>({
      eventType: 'evolution.experiment.completed',
      classification: EventClassification.Result,
      experimentId, winner, confidence, timestamp: ts, metadata: Object.freeze({}),
    });
  }

  async cancel(experimentId: ExperimentId): Promise<void> {
    const existing = this.store.get(experimentId);
    if (!existing) throw new ExperimentNotFoundError(experimentId);
    if (!VALID_TRANSITIONS[existing.status].includes(ES.Cancelled)) {
      throw new ExperimentStateError(experimentId, existing.status, ES.Cancelled);
    }
    this.store.update(experimentId, Object.freeze({
      ...existing, status: ES.Cancelled, completedAt: new Date().toISOString(),
    }));
  }

  async getById(id: ExperimentId): Promise<Experiment | null> {
    return this.store.get(id) ?? null;
  }

  async list(filter?: Partial<{ status: ExperimentStatus }>): Promise<readonly Experiment[]> {
    let items = this.store.getAll();
    if (filter?.status !== undefined) {
      items = items.filter(e => e.status === filter.status);
    }
    return items;
  }

  async count(): Promise<number> { return this.store.size; }

  getStore(): ExperimentStore { return this.store; }

  private async publishEvent<T extends { eventType: string; classification: EventClassification; timestamp: string }>(
    partial: Omit<T, 'eventId' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        aggregateId: 'evolution-experiment-runtime', aggregateType: 'Evolution', version: '1.0.0',
        ...partial,
      } as unknown as import('../../core/domain/events/domain-event.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
