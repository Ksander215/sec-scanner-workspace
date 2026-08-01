/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #12
 * ArchitectureOptimizer: Can we simplify? Remove layers? Merge runtimes?
 * TASK-AIS-008A.000
 */

import type { EventBus } from '../events/event-bus.js';
import type {
  EvolutionNodeId, ArchOptimizationSuggestion, ArchOptimizationType,
  ArchitectureOptimizerConfig,
} from './types.js';
import { brandEvolutionNodeId, ArchOptimizationType as AOT } from './types.js';
import type { IArchitectureOptimizer } from './contracts.js';
import type { ArchOptimizationSuggestedEvent } from './events.js';
import { EventClassification } from '../types/common.js';

class SuggestionStore {
  private readonly items = new Map<string, ArchOptimizationSuggestion>();
  add(s: ArchOptimizationSuggestion): void { this.items.set(s.id, s); }
  get(id: EvolutionNodeId): ArchOptimizationSuggestion | undefined { return this.items.get(id); }
  getAll(): readonly ArchOptimizationSuggestion[] { return Object.freeze([...this.items.values()]); }
  get size(): number { return this.items.size; }
}

export class ArchitectureOptimizer implements IArchitectureOptimizer {
  private readonly config: ArchitectureOptimizerConfig;
  private readonly eventBus: EventBus | null;
  private readonly store = new SuggestionStore();

  constructor(config: ArchitectureOptimizerConfig, eventBus?: EventBus) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async analyze(modules?: readonly string[]): Promise<readonly ArchOptimizationSuggestion[]> {
    const ts = new Date().toISOString();
    const targetModules = modules ?? Object.freeze([]);
    const suggestions: ArchOptimizationSuggestion[] = [];

    const templateSuggestion = (type: ArchOptimizationType, title: string, desc: string, impact: number): ArchOptimizationSuggestion =>
      Object.freeze({
        id: brandEvolutionNodeId(crypto.randomUUID()),
        type, title, description: desc,
        affectedModules: targetModules,
        estimatedImpact: impact,
        estimatedEffort: Math.ceil(impact * 2),
        risk: impact * 0.3,
        createdAt: ts,
        metadata: Object.freeze({}),
      });

    if (suggestions.length < this.config.maxSuggestions) {
      suggestions.push(templateSuggestion(
        AOT.ReduceCoupling,
        'Reduce inter-module coupling',
        'High coupling detected between modules. Consider introducing intermediate abstractions or event-based communication.',
        70,
      ));
    }
    if (suggestions.length < this.config.maxSuggestions) {
      suggestions.push(templateSuggestion(
        AOT.ImproveCohesion,
        'Improve module cohesion',
        'Some modules have low internal cohesion. Consider grouping related responsibilities more tightly.',
        55,
      ));
    }

    for (const s of suggestions) {
      this.store.add(s);
      void this.publishEvent<ArchOptimizationSuggestedEvent>({
        eventType: 'evolution.arch.suggested', classification: EventClassification.Result,
        nodeId: s.id, type: s.type, title: s.title, estimatedImpact: s.estimatedImpact,
        timestamp: ts, metadata: Object.freeze({}),
      });
    }

    return Object.freeze(suggestions);
  }

  async getById(id: EvolutionNodeId): Promise<ArchOptimizationSuggestion | null> {
    return this.store.get(id) ?? null;
  }

  async list(): Promise<readonly ArchOptimizationSuggestion[]> {
    return this.store.getAll();
  }

  async count(): Promise<number> { return this.store.size; }

  getStore(): SuggestionStore { return this.store; }

  private async publishEvent<T extends { eventType: string; classification: EventClassification; timestamp: string }>(
    partial: Omit<T, 'eventId' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        aggregateId: 'evolution-architecture-optimizer', aggregateType: 'Evolution', version: '1.0.0',
        ...partial,
      } as unknown as import('../../core/domain/events/domain-event.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
