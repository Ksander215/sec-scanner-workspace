/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #6
 * OptimizationPlanner: Builds roadmap of improvements using TOC, Kaizen, Pareto.
 * TASK-AIS-008A.000 | PHI-004: Eliminate the main constraint first.
 */

import type { EventBus } from '../events/event-bus.js';
import type {
  ImprovementId, Improvement, RoadmapId, RoadmapItem, EvolutionRoadmap,
  OptimizationPlannerConfig, RoadmapItemStatus,
} from './types.js';
import { RoadmapItemStatus as RIS, brandRoadmapId, ImprovementStatus as IS } from './types.js';
import type { IOptimizationPlanner } from './contracts.js';
import type { RoadmapCreatedEvent } from './events.js';
import { EventClassification } from '../types/common.js';

class RoadmapStore {
  private readonly items = new Map<string, EvolutionRoadmap>();
  add(r: EvolutionRoadmap): void { this.items.set(r.id, r); }
  get(id: RoadmapId): EvolutionRoadmap | undefined { return this.items.get(id); }
  getAll(): readonly EvolutionRoadmap[] { return Object.freeze([...this.items.values()]); }
  get size(): number { return this.items.size; }
}

export class OptimizationPlanner implements IOptimizationPlanner {
  private readonly config: OptimizationPlannerConfig;
  private readonly eventBus: EventBus | null;
  private readonly store = new RoadmapStore();
  private improvements: readonly Improvement[] = Object.freeze([]);

  constructor(config: OptimizationPlannerConfig, eventBus?: EventBus) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  setImprovements(improvements: readonly Improvement[]): void {
    this.improvements = improvements;
  }

  async generateRoadmap(title?: string, description?: string): Promise<EvolutionRoadmap> {
    const ts = new Date().toISOString();
    const sorted = [...this.improvements]
      .filter(i => i.status === IS.Proposed || i.status === IS.Planned)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, this.config.maxRoadmapItems);

    const items: RoadmapItem[] = sorted.map((imp, idx) =>
      Object.freeze({
        id: imp.id,
        improvementId: imp.id,
        name: imp.name,
        priority: imp.priority,
        status: RIS.Pending,
        order: idx + 1,
        estimatedEffort: imp.estimatedEffort,
        valueScore: imp.valueScore,
        dependsOn: Object.freeze([] as ImprovementId[]),
        createdAt: ts,
        metadata: Object.freeze({}),
      })
    );

    const totalValue = items.reduce((sum, i) => sum + i.valueScore, 0);

    const roadmap: EvolutionRoadmap = Object.freeze({
      id: brandRoadmapId(crypto.randomUUID()),
      title: title ?? 'Evolution Roadmap',
      description: description ?? 'Auto-generated improvement roadmap based on priority analysis',
      items: Object.freeze(items),
      totalValue,
      totalEffort: items.map(i => i.estimatedEffort).join(', ')
        || 'Not estimated',
      createdAt: ts,
      updatedAt: ts,
      metadata: Object.freeze({}),
    });

    this.store.add(roadmap);

    void this.publishEvent<RoadmapCreatedEvent>({
      eventType: 'evolution.roadmap.created',
      classification: EventClassification.Result,
      roadmapId: roadmap.id,
      title: roadmap.title,
      itemCount: items.length,
      totalValue,
      timestamp: ts,
      metadata: Object.freeze({}),
    });

    return roadmap;
  }

  async getRoadmap(id: RoadmapId): Promise<EvolutionRoadmap | null> {
    return this.store.get(id) ?? null;
  }

  async listRoadmaps(): Promise<readonly EvolutionRoadmap[]> {
    return this.store.getAll();
  }

  async updateItemStatus(roadmapId: RoadmapId, itemId: ImprovementId, status: RoadmapItemStatus): Promise<void> {
    const roadmap = this.store.get(roadmapId);
    if (!roadmap) return;
    const updatedItems = roadmap.items.map(item =>
      item.id === itemId ? Object.freeze({ ...item, status }) : item
    );
    const updated: EvolutionRoadmap = Object.freeze({
      ...roadmap,
      items: Object.freeze(updatedItems),
      updatedAt: new Date().toISOString(),
    });
    this.store.add(updated);
  }

  getStore(): RoadmapStore { return this.store; }

  private async publishEvent<T extends { eventType: string; classification: EventClassification; timestamp: string }>(
    partial: Omit<T, 'eventId' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        eventId: crypto.randomUUID(),
        sequence: 0,
        aggregateId: 'evolution-optimization-planner',
        aggregateType: 'Evolution',
        version: '1.0.0',
        ...partial,
      } as unknown as import('../../core/domain/events/domain-event.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
