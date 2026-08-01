/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Optimization Planner
 * TASK-AIS-008A.000
 *
 * Generates evolution roadmaps by prioritizing improvements (Pareto ordering).
 * PHI-004: Address the primary constraint first.
 */

import type { Timestamp } from '../types/common.js';
import { EventClassification } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { IOptimizationPlanner } from './contracts.js';
import type {
  RoadmapId, EvolutionRoadmap, RoadmapItem, ImprovementId,
  OptimizationPlannerConfig,
} from './types.js';
import { brandRoadmapId, RoadmapItemStatus as RIS, ImprovementStatus as IS } from './types.js';
import type { IImprovementEngine } from './contracts.js';
import { RoadmapLimitExceededError } from './errors.js';

export class OptimizationPlanner implements IOptimizationPlanner {
  private readonly config: OptimizationPlannerConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly roadmaps = new Map<string, EvolutionRoadmap>();
  private improvementEngine: IImprovementEngine | null = null;

  constructor(config: OptimizationPlannerConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  setImprovementEngine(engine: IImprovementEngine): void {
    this.improvementEngine = engine;
  }

  async generateRoadmap(title?: string, description?: string): Promise<EvolutionRoadmap> {
    if (!this.improvementEngine) {
      throw new RoadmapLimitExceededError(this.config.maxRoadmapItems, { reason: 'Improvement engine not set' });
    }

    const now: Timestamp = new Date().toISOString();
    const roadmapId = brandRoadmapId(crypto.randomUUID());

    // Get proposed improvements, sort by priority descending (Pareto)
    const proposed = await this.improvementEngine.list({ status: IS.Proposed });
    const sorted = [...proposed]
      .sort((a, b) => b.priority - a.priority)
      .slice(0, this.config.maxRoadmapItems);

    if (sorted.length > this.config.maxRoadmapItems) {
      throw new RoadmapLimitExceededError(this.config.maxRoadmapItems);
    }

    let totalValue = 0;
    const items: RoadmapItem[] = sorted.map((improvement, index) => {
      totalValue += improvement.valueScore;
      return Object.freeze({
        id: improvement.id,
        improvementId: improvement.id,
        name: improvement.name,
        priority: improvement.priority,
        status: RIS.Pending,
        order: index,
        estimatedEffort: improvement.estimatedEffort,
        valueScore: improvement.valueScore,
        dependsOn: Object.freeze([]),
        createdAt: now,
        metadata: Object.freeze({}),
      });
    });

    const roadmap: EvolutionRoadmap = Object.freeze({
      id: roadmapId,
      title: title ?? `Evolution Roadmap ${now}`,
      description: description ?? `Generated at ${now} with ${items.length} items`,
      items: Object.freeze(items),
      totalValue,
      totalEffort: sorted.map(i => i.estimatedEffort).join(', ') || 'unknown',
      createdAt: now,
      updatedAt: now,
      metadata: Object.freeze({}),
    });

    this.roadmaps.set(roadmapId as string, roadmap);

    await this.publishEvent({
      eventType: 'evolution.roadmap.created',
      classification: EventClassification.Result,
      roadmapId,
      title: roadmap.title,
      itemCount: items.length,
      totalValue,
      timestamp: now,
      metadata: Object.freeze({}),
    }, roadmapId as string, 'EvolutionRoadmap');

    return roadmap;
  }

  async getRoadmap(id: RoadmapId): Promise<EvolutionRoadmap | null> {
    return this.roadmaps.get(id as string) ?? null;
  }

  async listRoadmaps(): Promise<readonly EvolutionRoadmap[]> {
    return Array.from(this.roadmaps.values());
  }

  async updateItemStatus(roadmapId: RoadmapId, itemId: ImprovementId, status: RIS): Promise<void> {
    const key = roadmapId as string;
    const roadmap = this.roadmaps.get(key);
    if (!roadmap) throw new RoadmapLimitExceededError(this.config.maxRoadmapItems, { reason: 'Roadmap not found' });

    const now: Timestamp = new Date().toISOString();
    const updatedItems = roadmap.items.map(item => {
      if ((item.id as string) === (itemId as string)) {
        return Object.freeze({ ...item, status });
      }
      return item;
    });

    const updated: EvolutionRoadmap = Object.freeze({
      ...roadmap,
      items: Object.freeze(updatedItems),
      updatedAt: now,
    });

    this.roadmaps.set(key, updated);
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
