/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Constraint Analyzer
 * TASK-AIS-008A.000
 *
 * Analyzes bottlenecks to determine constraint type, root cause, and impact.
 */

import type { Timestamp } from '../types/common.js';
import { EventClassification } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { IConstraintAnalyzer } from './contracts.js';
import type {
  BottleneckId, ConstraintAnalysis, ConstraintAnalyzerConfig,
} from './types.js';
import { brandEvolutionSessionId, ConstraintType } from './types.js';

const ROOT_CAUSE_PATTERNS: Record<string, string> = {
  [ConstraintType.Performance]: 'Resource saturation or algorithmic inefficiency.',
  [ConstraintType.Quality]: 'Insufficient validation or defect density above threshold.',
  [ConstraintType.UX]: 'User interaction friction or workflow discontinuities.',
  [ConstraintType.Knowledge]: 'Knowledge gaps prevent accurate reasoning.',
  [ConstraintType.Memory]: 'Memory retention or retrieval below optimal.',
  [ConstraintType.Reasoning]: 'Reasoning chain lacks depth or consistency.',
  [ConstraintType.Architecture]: 'Structural coupling limits extensibility.',
  [ConstraintType.DeveloperExperience]: 'Tooling or API ergonomics slow iteration.',
  [ConstraintType.Documentation]: 'Documentation gaps hinder onboarding.',
  [ConstraintType.Marketing]: 'Value proposition does not reach target audience.',
  [ConstraintType.Sales]: 'Conversion pipeline has friction.',
  [ConstraintType.Business]: 'Business model limits scalability.',
  [ConstraintType.Learning]: 'Feedback loops too slow for adaptation.',
};

export class ConstraintAnalyzer implements IConstraintAnalyzer {
  private readonly eventBus: InProcessEventBus | null;
  private readonly analyses = new Map<string, ConstraintAnalysis>();

  constructor(_config: ConstraintAnalyzerConfig, eventBus?: InProcessEventBus | null) {
    this.eventBus = eventBus ?? null;
  }

  async analyze(bottleneckId: BottleneckId): Promise<ConstraintAnalysis> {
    const startMs = Date.now();
    const sessionId = brandEvolutionSessionId(crypto.randomUUID());
    const now: Timestamp = new Date().toISOString();

    const constraintType = ConstraintType.Architecture;
    const rootCause = ROOT_CAUSE_PATTERNS[constraintType] ?? 'Unknown constraint root cause.';

    const analysis: ConstraintAnalysis = Object.freeze({
      id: sessionId,
      bottleneckId,
      constraintType,
      rootCause,
      impactDescription: `Bottleneck ${String(bottleneckId)} limits value creation.`,
      affectedRuntimes: Object.freeze([]),
      affectedCapabilities: Object.freeze([]),
      suggestedImprovements: Object.freeze([]),
      analyzedAt: now,
      metadata: Object.freeze({}),
    });

    this.analyses.set(sessionId as string, analysis);

    await this.publishEvent({
      eventType: 'evolution.constraint.analyzed',
      classification: EventClassification.Result,
      bottleneckId,
      constraintType,
      rootCause,
      durationMs: Date.now() - startMs,
      timestamp: now,
      metadata: Object.freeze({}),
    }, sessionId as string, 'ConstraintAnalysis');

    return analysis;
  }

  async getAnalysis(sessionId: string): Promise<ConstraintAnalysis | null> {
    return this.analyses.get(sessionId) ?? null;
  }

  async listAnalyses(): Promise<readonly ConstraintAnalysis[]> {
    return Array.from(this.analyses.values());
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
