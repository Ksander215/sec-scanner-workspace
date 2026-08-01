/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Experiment Runtime
 * TASK-AIS-008A.000
 *
 * Manages A/B experiments to validate improvement hypotheses.
 * Supports auto-timeout, confidence calculation, and winner determination.
 */

import type { Timestamp } from '../types/common.js';
import { EventClassification } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { IExperimentRuntime } from './contracts.js';
import type {
  ExperimentId, Experiment, ExperimentStatus, ExperimentConfig,
} from './types.js';
import { brandExperimentId, ExperimentStatus as ES } from './types.js';
import type { ExperimentProposalParams } from './contracts.js';
import {
  ExperimentNotFoundError, ExperimentLimitExceededError, ExperimentStateError,
} from './errors.js';

const EXPERIMENT_TRANSITIONS: Record<ExperimentStatus, readonly ExperimentStatus[]> = Object.freeze({
  [ES.Proposed]: Object.freeze([ES.Running, ES.Cancelled]),
  [ES.Running]: Object.freeze([ES.Completed, ES.Failed, ES.Cancelled, ES.Inconclusive]),
  [ES.Completed]: Object.freeze([]),
  [ES.Failed]: Object.freeze([ES.Proposed]),
  [ES.Cancelled]: Object.freeze([]),
  [ES.Inconclusive]: Object.freeze([ES.Proposed]),
});

export class ExperimentRuntime implements IExperimentRuntime {
  private readonly config: ExperimentConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly experiments = new Map<string, Experiment>();
  private readonly timeouts = new Map<string, NodeJS.Timeout>();

  constructor(config: ExperimentConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async propose(params: ExperimentProposalParams): Promise<Experiment> {
    if (this.experiments.size >= this.config.maxExperiments) {
      throw new ExperimentLimitExceededError(this.config.maxExperiments);
    }

    const now: Timestamp = new Date().toISOString();
    const id = brandExperimentId(crypto.randomUUID());

    const experiment: Experiment = Object.freeze({
      id,
      name: params.name,
      description: params.description,
      status: ES.Proposed,
      improvementId: params.improvementId,
      variantA: params.variantA,
      variantB: params.variantB,
      metricName: params.metricName,
      variantAResult: null,
      variantBResult: null,
      winner: null,
      confidence: 0,
      startedAt: null,
      completedAt: null,
      proposedAt: now,
      metadata: Object.freeze({ ...params.metadata }),
    });

    this.experiments.set(id as string, experiment);
    return experiment;
  }

  async start(experimentId: ExperimentId): Promise<void> {
    const key = experimentId as string;
    const existing = this.experiments.get(key);
    if (!existing) throw new ExperimentNotFoundError(key);

    const validTargets = EXPERIMENT_TRANSITIONS[existing.status];
    if (!validTargets.includes(ES.Running)) {
      throw new ExperimentStateError(key, existing.status, ES.Running);
    }

    // Check max concurrent experiments
    const runningCount = Array.from(this.experiments.values()).filter(e => e.status === ES.Running).length;
    if (runningCount >= this.config.maxConcurrentExperiments) {
      throw new ExperimentStateError(key, existing.status, ES.Running, { reason: 'Max concurrent experiments reached' });
    }

    const now: Timestamp = new Date().toISOString();

    const updated: Experiment = Object.freeze({
      ...existing,
      status: ES.Running,
      startedAt: now,
    });

    this.experiments.set(key, updated);

    await this.publishEvent({
      eventType: 'evolution.experiment.started',
      classification: EventClassification.Action,
      experimentId,
      name: updated.name,
      improvementId: updated.improvementId,
      timestamp: now,
      metadata: Object.freeze({}),
    }, key, 'Experiment');

    // Set up auto-timeout
    const timer = setTimeout(() => {
      this.failExperiment(experimentId, `Experiment timed out after ${this.config.experimentTimeoutMs}ms`);
    }, this.config.experimentTimeoutMs);
    timer.unref();
    this.timeouts.set(key, timer);
  }

  async complete(experimentId: ExperimentId, resultA: number, resultB: number): Promise<void> {
    const key = experimentId as string;
    const existing = this.experiments.get(key);
    if (!existing) throw new ExperimentNotFoundError(key);

    if (existing.status !== ES.Running) {
      throw new ExperimentStateError(key, existing.status, ES.Completed);
    }

    // Clear timeout
    const timer = this.timeouts.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timeouts.delete(key);
    }

    const now: Timestamp = new Date().toISOString();

    // Calculate confidence: 1 - (|A-B| / max(|A|, |B|, 0.001))
    const maxAbs = Math.max(Math.abs(resultA), Math.abs(resultB), 0.001);
    const confidence = 1 - (Math.abs(resultA - resultB) / maxAbs);

    // Determine winner: A if A >= B, else B
    const winner: 'A' | 'B' = resultA >= resultB ? 'A' : 'B';

    const updated: Experiment = Object.freeze({
      ...existing,
      status: ES.Completed,
      variantAResult: resultA,
      variantBResult: resultB,
      winner,
      confidence,
      completedAt: now,
    });

    this.experiments.set(key, updated);

    await this.publishEvent({
      eventType: 'evolution.experiment.completed',
      classification: EventClassification.Result,
      experimentId,
      winner,
      confidence,
      timestamp: now,
      metadata: Object.freeze({}),
    }, key, 'Experiment');
  }

  async cancel(experimentId: ExperimentId): Promise<void> {
    const key = experimentId as string;
    const existing = this.experiments.get(key);
    if (!existing) throw new ExperimentNotFoundError(key);

    const validTargets = EXPERIMENT_TRANSITIONS[existing.status];
    if (!validTargets.includes(ES.Cancelled)) {
      throw new ExperimentStateError(key, existing.status, ES.Cancelled);
    }

    // Clear timeout if running
    const timer = this.timeouts.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timeouts.delete(key);
    }

    const now: Timestamp = new Date().toISOString();

    const updated: Experiment = Object.freeze({
      ...existing,
      status: ES.Cancelled,
      completedAt: now,
    });

    this.experiments.set(key, updated);
  }

  async getById(id: ExperimentId): Promise<Experiment | null> {
    return this.experiments.get(id as string) ?? null;
  }

  async list(filter?: Partial<{ status: ExperimentStatus }>): Promise<readonly Experiment[]> {
    let results = Array.from(this.experiments.values());
    if (filter?.status !== undefined) {
      results = results.filter(e => e.status === filter.status);
    }
    return results;
  }

  async count(): Promise<number> {
    return this.experiments.size;
  }

  private async failExperiment(experimentId: ExperimentId, reason: string): Promise<void> {
    const key = experimentId as string;
    const existing = this.experiments.get(key);
    if (!existing || existing.status !== ES.Running) return;

    // Clear timeout
    const timer = this.timeouts.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timeouts.delete(key);
    }

    const now: Timestamp = new Date().toISOString();

    const updated: Experiment = Object.freeze({
      ...existing,
      status: ES.Failed,
      completedAt: now,
    });

    this.experiments.set(key, updated);

    await this.publishEvent({
      eventType: 'evolution.experiment.failed',
      classification: EventClassification.Error,
      experimentId,
      reason,
      timestamp: now,
      metadata: Object.freeze({}),
    }, key, 'Experiment');
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
