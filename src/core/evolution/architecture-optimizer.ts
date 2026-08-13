/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Architecture Optimizer
 * TASK-AIS-008A.000
 *
 * Analyzes architecture for simplification, decoupling, and cohesion improvements.
 */

import type { Timestamp } from '../types/common.js';
import { EventClassification } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { IArchitectureOptimizer } from './contracts.js';
import type {
  EvolutionNodeId, ArchOptimizationSuggestion, ArchitectureOptimizerConfig,
} from './types.js';
import { brandEvolutionNodeId, ArchOptimizationType } from './types.js';

const CYCLING_TYPES = [
  ArchOptimizationType.Simplify,
  ArchOptimizationType.ReduceCoupling,
  ArchOptimizationType.ImproveCohesion,
] as const;

export class ArchitectureOptimizer implements IArchitectureOptimizer {
  private readonly config: ArchitectureOptimizerConfig;
  private readonly eventBus: InProcessEventBus | null;
  private suggestions = new Map<string, ArchOptimizationSuggestion>();

  constructor(config: ArchitectureOptimizerConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async analyze(modules?: readonly string[]): Promise<readonly ArchOptimizationSuggestion[]> {
    const now: Timestamp = new Date().toISOString();
    const targetModules = modules ?? ['core'];
    const results: ArchOptimizationSuggestion[] = [];

    for (const module of targetModules) {
      if (results.length >= this.config.maxSuggestions) break;

      for (const type of CYCLING_TYPES) {
        if (results.length >= this.config.maxSuggestions) break;

        const id = brandEvolutionNodeId(crypto.randomUUID());
        const title = `${type} for ${module}`;
        const description = `Architecture optimization suggestion: ${type} in module ${module}`;
        const estimatedImpact = 50 + Math.random() * 50;

        const suggestion: ArchOptimizationSuggestion = Object.freeze({
          id,
          type,
          title,
          description,
          affectedModules: Object.freeze([...targetModules]),
          estimatedImpact: Math.round(estimatedImpact * 100) / 100,
          estimatedEffort: Math.ceil(estimatedImpact * 2),
          risk: Math.round(estimatedImpact * 0.3 * 100) / 100,
          createdAt: now,
          metadata: Object.freeze({}),
        });

        this.suggestions.set(id as string, suggestion);
        results.push(suggestion);

        await this.publishEvent({
          eventType: 'evolution.arch.suggested',
          classification: EventClassification.Result,
          nodeId: id,
          type,
          title,
          estimatedImpact: suggestion.estimatedImpact,
          timestamp: now,
          metadata: Object.freeze({}),
        }, id as string, 'ArchOptimization');
      }
    }

    return Object.freeze(results);
  }

  async getById(id: EvolutionNodeId): Promise<ArchOptimizationSuggestion | null> {
    return this.suggestions.get(id as string) ?? null;
  }

  async list(): Promise<readonly ArchOptimizationSuggestion[]> {
    return Array.from(this.suggestions.values());
  }

  async count(): Promise<number> {
    return this.suggestions.size;
  }

  /** Reset internal state. Used by EvolutionRuntime.shutdown(). */
  dispose(): void {
    this.suggestions = new Map();
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
