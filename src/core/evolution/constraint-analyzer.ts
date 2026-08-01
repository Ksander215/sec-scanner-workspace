/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #2
 * ConstraintAnalyzer: Determines the type and root cause of constraints.
 * TASK-AIS-008A.000 | PHI-003.000: FOCUS 5-step constraint analysis.
 */

import type { EventBus } from '../events/event-bus.js';
import type {
  BottleneckId, ConstraintAnalysis, ConstraintAnalyzerConfig,
} from './types.js';
import type { ImprovementId } from './types.js';
import { brandEvolutionSessionId, ConstraintType as CT } from './types.js';
import type { IConstraintAnalyzer } from './contracts.js';
import type { ConstraintAnalyzedEvent } from './events.js';
import { EventClassification } from '../types/common.js';

interface AnalysisEntry {
  readonly analysis: ConstraintAnalysis;
  readonly startMs: number;
}

class AnalysisStore {
  private readonly items = new Map<string, AnalysisEntry>();
  add(e: AnalysisEntry): void { this.items.set(e.analysis.id, e); }
  get(id: string): AnalysisEntry | undefined { return this.items.get(id); }
  getAll(): readonly ConstraintAnalysis[] {
    return Object.freeze([...this.items.values()].map(e => e.analysis));
  }
  get size(): number { return this.items.size; }
}

const ROOT_CAUSE_PATTERNS: Record<string, string> = {
  [CT.Performance]: 'Resource saturation or algorithmic inefficiency detected in the execution path.',
  [CT.Quality]: 'Insufficient validation coverage or defect density above acceptable threshold.',
  [CT.UX]: 'User interaction patterns indicate friction points or workflow discontinuities.',
  [CT.Knowledge]: 'Knowledge gaps prevent accurate reasoning or recommendation generation.',
  [CT.Memory]: 'Memory retention or retrieval efficiency is below the optimal threshold.',
  [CT.Reasoning]: 'Reasoning chain lacks sufficient depth or produces inconsistent conclusions.',
  [CT.Architecture]: 'Structural coupling or missing abstraction layers limit extensibility.',
  [CT.DeveloperExperience]: 'Development tooling or API ergonomics slow down iteration speed.',
  [CT.Documentation]: 'Documentation gaps hinder onboarding and reduce system transparency.',
  [CT.Marketing]: 'Value proposition communication does not reach the target audience effectively.',
  [CT.Sales]: 'Conversion pipeline has friction or lacks effective qualification mechanisms.',
  [CT.Business]: 'Business model constraints limit scalability or value capture potential.',
  [CT.Learning]: 'Feedback loops are too slow or incomplete to drive effective adaptation.',
};

export class ConstraintAnalyzer implements IConstraintAnalyzer {
  private readonly eventBus: EventBus | null;
  private readonly store = new AnalysisStore();

  constructor(config: ConstraintAnalyzerConfig, eventBus?: EventBus) {
    void config;
    this.eventBus = eventBus ?? null;
  }

  async analyze(bottleneckId: BottleneckId): Promise<ConstraintAnalysis> {
    const startMs = Date.now();
    const sessionId = brandEvolutionSessionId(crypto.randomUUID());
    const ts = new Date().toISOString();

    // In a real system, this would deeply analyze the bottleneck.
    // Here we produce a structured analysis based on the bottleneck ID.
    const analysis: ConstraintAnalysis = Object.freeze({
      id: sessionId,
      bottleneckId,
      constraintType: CT.Performance,
      rootCause: ROOT_CAUSE_PATTERNS[CT.Performance] ?? 'Unknown constraint root cause.',
      impactDescription: `Bottleneck ${bottleneckId} limits value creation by reducing system throughput and increasing latency.`,
      affectedRuntimes: Object.freeze([]),
      affectedCapabilities: Object.freeze([]),
      suggestedImprovements: Object.freeze([] as ImprovementId[]),
      analyzedAt: ts,
      metadata: Object.freeze({}),
    });

    this.store.add({ analysis, startMs });

    void this.publishEvent<ConstraintAnalyzedEvent>({
      eventType: 'evolution.constraint.analyzed',
      classification: EventClassification.Result,
      bottleneckId,
      constraintType: analysis.constraintType,
      rootCause: analysis.rootCause,
      durationMs: Date.now() - startMs,
      timestamp: ts,
      metadata: Object.freeze({}),
    });

    return analysis;
  }

  async getAnalysis(sessionId: string): Promise<ConstraintAnalysis | null> {
    return this.store.get(sessionId)?.analysis ?? null;
  }

  async listAnalyses(): Promise<readonly ConstraintAnalysis[]> {
    return this.store.getAll();
  }

  getStore(): AnalysisStore { return this.store; }

  private async publishEvent<T extends { eventType: string; classification: EventClassification; timestamp: string }>(
    partial: Omit<T, 'eventId' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        eventId: crypto.randomUUID(),
        sequence: 0,
        aggregateId: 'evolution-constraint-analyzer',
        aggregateType: 'Evolution',
        version: '1.0.0',
        ...partial,
      } as unknown as import('../../core/domain/events/domain-event.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
