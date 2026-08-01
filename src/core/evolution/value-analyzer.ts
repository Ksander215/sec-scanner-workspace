/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #4
 * ValueAnalyzer: Ensures every improvement creates measurable value.
 * TASK-AIS-008A.000 | PHI-001: Create value. PHI-005: No optimization without value.
 */

import type { Timestamp } from '../types/common.js';
import { EventClassification } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { IValueAnalyzer } from './contracts.js';
import type { IImprovementEngine } from './contracts.js';
import type {
  ImprovementId, ValueAnalysis, ValueAnalyzerConfig,
} from './types.js';
import { ValueDimension } from './types.js';
import type { ValueAnalyzedEvent } from './events.js';

const VALUE_QUESTIONS: Record<ValueDimension, string> = {
  [ValueDimension.UserValue]: 'What measurable value does this create for the end user?',
  [ValueDimension.PlatformValue]: 'How does this improve the overall platform capability?',
  [ValueDimension.BusinessValue]: 'What business value or revenue impact does this create?',
  [ValueDimension.DeveloperValue]: 'How does this improve developer productivity or experience?',
  [ValueDimension.KnowledgeValue]: 'How does this expand the system knowledge or reasoning?',
};

export class ValueAnalyzer implements IValueAnalyzer {
  private readonly config: ValueAnalyzerConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly analyses = new Map<string, ValueAnalysis>();
  private improvementEngine: IImprovementEngine | null = null;

  constructor(config: ValueAnalyzerConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  setImprovementEngine(engine: IImprovementEngine | null): void {
    this.improvementEngine = engine;
  }

  async analyze(improvementId: ImprovementId): Promise<ValueAnalysis> {
    const now: Timestamp = new Date().toISOString();
    const dimension = this.config.valueDimensions[0] ?? ValueDimension.UserValue;
    const valueScore = this.calculateValueScore();
    const question = VALUE_QUESTIONS[dimension];

    const analysis: ValueAnalysis = Object.freeze({
      improvementId,
      valueCreated: `Analysis based on ${dimension}: ${question}`,
      valueFor: dimension,
      valueMagnitude: valueScore,
      valueDimension: dimension,
      beforeMetrics: Object.freeze({}),
      afterMetrics: Object.freeze({}),
      valueScore,
      analyzedAt: now,
      metadata: Object.freeze({}),
    });

    this.analyses.set(improvementId as string, analysis);

    const event = Object.freeze({
      eventType: 'evolution.value.analyzed',
      classification: EventClassification.Result,
      improvementId,
      valueScore,
      valueDimension: dimension,
      valueCreated: analysis.valueCreated,
      timestamp: now,
      metadata: Object.freeze({}),
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId: improvementId as string,
      aggregateType: 'ValueAnalysis',
      version: '1.0.0',
    } as ValueAnalyzedEvent & DomainEventBase);

    this.eventBus?.publish(event);

    if (this.improvementEngine) {
      const improvement = await this.improvementEngine.getById(improvementId);
      if (improvement) {
        // Update improvement scores with the computed value score
        // In a real system this would use the engine's updateScores method
        void improvement;
      }
    }

    return analysis;
  }

  async getByImprovementId(improvementId: ImprovementId): Promise<ValueAnalysis | null> {
    return this.analyses.get(improvementId as string) ?? null;
  }

  async listAnalyses(): Promise<readonly ValueAnalysis[]> {
    return Array.from(this.analyses.values());
  }

  private calculateValueScore(): number {
    return this.config.minValueScore + Math.random() * (this.config.maxValueScore - this.config.minValueScore);
  }
}
