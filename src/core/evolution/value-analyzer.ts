/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #4
 * ValueAnalyzer: Ensures every improvement creates measurable value.
 * TASK-AIS-008A.000 | PHI-001: Create value. PHI-005: No optimization without value.
 */

import type { EventBus } from '../events/event-bus.js';
import type {
  ImprovementId, ValueAnalysis, ValueDimension, ValueAnalyzerConfig,
} from './types.js';
import { ValueDimension as VD } from './types.js';
import type { IValueAnalyzer } from './contracts.js';
import type { ValueAnalyzedEvent } from './events.js';
import { EventClassification } from '../types/common.js';

class ValueAnalysisStore {
  private readonly items = new Map<string, ValueAnalysis>();
  private readonly byImprovement = new Map<string, ValueAnalysis>();

  add(a: ValueAnalysis): void {
    this.items.set(a.improvementId, a);
    this.byImprovement.set(a.improvementId, a);
  }
  getByImprovement(id: ImprovementId): ValueAnalysis | undefined { return this.byImprovement.get(id); }
  getAll(): readonly ValueAnalysis[] { return Object.freeze([...this.items.values()]); }
  get size(): number { return this.items.size; }
}

const VALUE_QUESTIONS: Record<ValueDimension, string> = {
  [VD.UserValue]: 'What measurable value does this create for the end user?',
  [VD.PlatformValue]: 'How does this improve the overall platform capability?',
  [VD.BusinessValue]: 'What business value or revenue impact does this create?',
  [VD.DeveloperValue]: 'How does this improve developer productivity or experience?',
  [VD.KnowledgeValue]: 'How does this expand the system knowledge or reasoning?',
};

export class ValueAnalyzer implements IValueAnalyzer {
  private readonly config: ValueAnalyzerConfig;
  private readonly eventBus: EventBus | null;
  private readonly store = new ValueAnalysisStore();

  constructor(config: ValueAnalyzerConfig, eventBus?: EventBus) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async analyze(improvementId: ImprovementId): Promise<ValueAnalysis> {
    const ts = new Date().toISOString();
    const dimension = this.config.valueDimensions[0] ?? VD.UserValue;
    const question = VALUE_QUESTIONS[dimension];

    // Default analysis with score 0 — real system would use AI/ML
    const analysis: ValueAnalysis = Object.freeze({
      improvementId,
      valueCreated: `Analysis based on ${dimension}: ${question}`,
      valueFor: dimension,
      valueMagnitude: 0,
      valueDimension: dimension,
      beforeMetrics: Object.freeze({}),
      afterMetrics: Object.freeze({}),
      valueScore: 0,
      analyzedAt: ts,
      metadata: Object.freeze({}),
    });

    this.store.add(analysis);

    void this.publishEvent<ValueAnalyzedEvent>({
      eventType: 'evolution.value.analyzed',
      classification: EventClassification.Result,
      improvementId,
      valueScore: analysis.valueScore,
      valueDimension: dimension,
      valueCreated: analysis.valueCreated,
      timestamp: ts,
      metadata: Object.freeze({}),
    });

    return analysis;
  }

  async getByImprovementId(improvementId: ImprovementId): Promise<ValueAnalysis | null> {
    return this.store.getByImprovement(improvementId) ?? null;
  }

  async listAnalyses(): Promise<readonly ValueAnalysis[]> {
    return this.store.getAll();
  }

  getStore(): ValueAnalysisStore { return this.store; }

  private async publishEvent<T extends { eventType: string; classification: EventClassification; timestamp: string }>(
    partial: Omit<T, 'eventId' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        eventId: crypto.randomUUID(),
        sequence: 0,
        aggregateId: 'evolution-value-analyzer',
        aggregateType: 'Evolution',
        version: '1.0.0',
        ...partial,
      } as unknown as import('../../core/domain/events/domain-event.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
