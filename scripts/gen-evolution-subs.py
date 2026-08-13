#!/usr/bin/env python3
"""
Generate all 15 ECIR subsystem source files for TASK-AIS-008A.000.
"""
import os

BASE = "/home/z/my-project/src/core/evolution"

def w(path, content):
    full = os.path.join(BASE, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w") as f:
        f.write(content)
    print(f"  wrote {path}")

# ═══════════════════════════════════════════════════════════════════
# 1. BottleneckDetector
# ═══════════════════════════════════════════════════════════════════
w("bottleneck-detector.ts", r"""/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #1
 * BottleneckDetector: Finds the weakest link limiting value creation.
 * TASK-AIS-008A.000 | PHI-004: Eliminate the primary constraint first.
 */

import type { EventBus } from '../events/event-bus.js';
import type {
  BottleneckId, Bottleneck, BottleneckScope, BottleneckSeverity,
  ConstraintType, EvolutionSessionId,
  BottleneckDetectorConfig,
} from './types.js';
import { BottleneckScope as BS, BottleneckSeverity as BSev, brandBottleneckId } from './types.js';
import type { IBottleneckDetector, BottleneckDetectionParams } from './contracts.js';
import { BottleneckLimitExceededError } from './errors.js';
import type { BottleneckDetectedEvent, BottleneckResolvedEvent } from './events.js';
import { EventClassification } from '../types/common.js';

class BottleneckStore {
  private readonly items = new Map<string, Bottleneck>();

  add(b: Bottleneck): void { this.items.set(b.id, b); }
  get(id: BottleneckId): Bottleneck | undefined { return this.items.get(id); }
  getAll(): readonly Bottleneck[] { return Object.freeze([...this.items.values()]); }
  delete(id: BottleneckId): boolean { return this.items.delete(id); }
  get size(): number { return this.items.size; }
}

export class BottleneckDetector implements IBottleneckDetector {
  private readonly config: BottleneckDetectorConfig;
  private readonly eventBus: EventBus | null;
  private readonly store = new BottleneckStore();

  constructor(config: BottleneckDetectorConfig, eventBus?: EventBus) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async detect(params: Partial<BottleneckDetectionParams>): Promise<readonly Bottleneck[]> {
    const ts = new Date().toISOString();
    const runtimeName = params.runtimeName ?? 'unknown';
    const metrics = params.metrics ?? {};
    const errors = params.errors ?? [];
    const metadata = params.metadata ?? Object.freeze({});
    const results: Bottleneck[] = [];

    // Detect performance bottleneck
    const responseTime = metrics['responseTime'] ?? metrics['avgResponseTimeMs'];
    if (typeof responseTime === 'number' && responseTime > 5000) {
      results.push(this.createBottleneck({
        name: `Slow response in ${runtimeName}`,
        description: `Response time ${responseTime}ms exceeds 5000ms threshold`,
        constraintType: ConstraintType.Performance,
        severity: responseTime > 20000 ? BSev.Critical : BSev.High,
        targetRuntime: runtimeName,
        evidence: [`responseTime=${responseTime}ms`],
        timestamp: ts,
        metadata,
      }));
    }

    // Detect error rate bottleneck
    if (errors.length >= 3) {
      results.push(this.createBottleneck({
        name: `High error rate in ${runtimeName}`,
        description: `${errors.length} errors detected`,
        constraintType: ConstraintType.Quality,
        severity: errors.length > 10 ? BSev.Critical : BSev.High,
        targetRuntime: runtimeName,
        evidence: [...errors],
        timestamp: ts,
        metadata,
      }));
    }

    // Detect knowledge gap
    const knowledgeCoverage = metrics['knowledgeCoverage'] ?? metrics['knowledgeCoveragePercent'];
    if (typeof knowledgeCoverage === 'number' && knowledgeCoverage < 50) {
      results.push(this.createBottleneck({
        name: `Low knowledge coverage in ${runtimeName}`,
        description: `Knowledge coverage at ${knowledgeCoverage}% (threshold 50%)`,
        constraintType: ConstraintType.Knowledge,
        severity: BSev.Medium,
        targetRuntime: runtimeName,
        evidence: [`knowledgeCoverage=${knowledgeCoverage}%`],
        timestamp: ts,
        metadata,
      }));
    }

    // Detect memory bottleneck
    const memoryUsage = metrics['memoryUsageMB'] ?? metrics['memoryUsage'];
    if (typeof memoryUsage === 'number' && memoryUsage > 500) {
      results.push(this.createBottleneck({
        name: `High memory usage in ${runtimeName}`,
        description: `Memory usage ${memoryUsage}MB exceeds 500MB threshold`,
        constraintType: ConstraintType.Memory,
        severity: memoryUsage > 1000 ? BSev.Critical : BSev.High,
        targetRuntime: runtimeName,
        evidence: [`memoryUsage=${memoryUsage}MB`],
        timestamp: ts,
        metadata,
      }));
    }

    // Detect UX bottleneck
    const uxScore = metrics['uxScore'] ?? metrics['userSatisfaction'];
    if (typeof uxScore === 'number' && uxScore < 40) {
      results.push(this.createBottleneck({
        name: `Poor UX in ${runtimeName}`,
        description: `UX score at ${uxScore} (threshold 40)`,
        constraintType: ConstraintType.UX,
        severity: BSev.Medium,
        targetRuntime: runtimeName,
        evidence: [`uxScore=${uxScore}`],
        timestamp: ts,
        metadata,
      }));
    }

    // Detect architecture bottleneck
    const couplingScore = metrics['couplingScore'] ?? metrics['moduleCoupling'];
    if (typeof couplingScore === 'number' && couplingScore > 0.7) {
      results.push(this.createBottleneck({
        name: `High coupling in ${runtimeName}`,
        description: `Coupling score ${couplingScore} exceeds 0.7 threshold`,
        constraintType: ConstraintType.Architecture,
        severity: BSev.Medium,
        targetRuntime: runtimeName,
        evidence: [`couplingScore=${couplingScore}`],
        timestamp: ts,
        metadata,
      }));
    }

    // Detect documentation bottleneck
    const docCoverage = metrics['documentationCoverage'] ?? metrics['docCoveragePercent'];
    if (typeof docCoverage === 'number' && docCoverage < 30) {
      results.push(this.createBottleneck({
        name: `Low documentation coverage in ${runtimeName}`,
        description: `Documentation coverage at ${docCoverage}% (threshold 30%)`,
        constraintType: ConstraintType.Documentation,
        severity: BSev.Low,
        targetRuntime: runtimeName,
        evidence: [`docCoverage=${docCoverage}%`],
        timestamp: ts,
        metadata,
      }));
    }

    // Store and emit events for each bottleneck
    for (const b of results) {
      this.store.add(b);
      void this.publishEvent<BottleneckDetectedEvent>({
        eventType: 'evolution.bottleneck.detected',
        classification: EventClassification.Result,
        bottleneckId: b.id,
        name: b.name,
        constraintType: b.constraintType,
        severity: b.severity,
        targetRuntime: b.targetRuntime,
        timestamp: ts,
        metadata: Object.freeze({}),
      });
    }

    return Object.freeze(results);
  }

  async getById(id: BottleneckId): Promise<Bottleneck | null> {
    return this.store.get(id) ?? null;
  }

  async list(filter?: Partial<{ scope: BottleneckScope; severity: BottleneckSeverity; resolved: boolean }>): Promise<readonly Bottleneck[]> {
    let items = this.store.getAll();
    if (filter?.scope !== undefined) {
      items = items.filter(b => b.scope === filter.scope);
    }
    if (filter?.severity !== undefined) {
      items = items.filter(b => b.severity === filter.severity);
    }
    if (filter?.resolved !== undefined) {
      items = items.filter(b => (b.resolvedAt !== null) === filter.resolved);
    }
    return items;
  }

  async resolve(id: BottleneckId): Promise<void> {
    const b = this.store.get(id);
    if (!b) throw new (await import('./errors.js')).BottleneckNotFoundError(id);
    const updated: Bottleneck = Object.freeze({
      ...b,
      resolvedAt: new Date().toISOString(),
    });
    this.store.delete(id);
    this.store.add(updated);
    void this.publishEvent<BottleneckResolvedEvent>({
      eventType: 'evolution.bottleneck.resolved',
      classification: EventClassification.StateChange,
      bottleneckId: id,
      resolvedAt: updated.resolvedAt!,
      timestamp: updated.resolvedAt!,
      metadata: Object.freeze({}),
    });
  }

  async count(): Promise<number> {
    return this.store.size;
  }

  getStore(): BottleneckStore { return this.store; }

  private createBottleneck(p: {
    name: string; description: string; constraintType: ConstraintType;
    severity: BottleneckSeverity; targetRuntime: string;
    evidence: readonly string[]; timestamp: string;
    metadata: Readonly<Record<string, unknown>>;
  }): Bottleneck {
    if (this.store.size >= this.config.maxBottlenecks) {
      throw new BottleneckLimitExceededError(this.config.maxBottlenecks);
    }
    return Object.freeze({
      id: brandBottleneckId(crypto.randomUUID()),
      scope: BS.Platform,
      targetCapability: null,
      targetWorkflow: null,
      detectedAt: p.timestamp,
      resolvedAt: null,
      relatedBottleneckIds: Object.freeze([]),
      ...p,
    });
  }

  private async publishEvent<T extends { eventType: string; classification: EventClassification; timestamp: string }>(
    partial: Omit<T, 'eventId' | 'timestamp' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        sequence: 0,
        aggregateId: 'evolution-bottleneck-detector',
        aggregateType: 'Evolution',
        version: '1.0.0',
        ...partial,
      } as unknown as import('../events/event-bus.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
""")

# ═══════════════════════════════════════════════════════════════════
# 2. ConstraintAnalyzer
# ═══════════════════════════════════════════════════════════════════
w("constraint-analyzer.ts", r"""/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #2
 * ConstraintAnalyzer: Determines the type and root cause of constraints.
 * TASK-AIS-008A.000 | PHI-003.000: FOCUS 5-step constraint analysis.
 */

import type { EventBus } from '../events/event-bus.js';
import type {
  BottleneckId, ConstraintAnalysis, ConstraintType,
  EvolutionSessionId, ImprovementId, ConstraintAnalyzerConfig,
} from './types.js';
import { brandEvolutionSessionId, ConstraintType as CT } from './types.js';
import type { IConstraintAnalyzer } from './contracts.js';
import { ConstraintAnalysisError, BottleneckNotFoundError } from './errors.js';
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
  private readonly config: ConstraintAnalyzerConfig;
  private readonly eventBus: EventBus | null;
  private readonly store = new AnalysisStore();

  constructor(config: ConstraintAnalyzerConfig, eventBus?: EventBus) {
    this.config = config;
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
    partial: Omit<T, 'eventId' | 'timestamp' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        sequence: 0,
        aggregateId: 'evolution-constraint-analyzer',
        aggregateType: 'Evolution',
        version: '1.0.0',
        ...partial,
      } as unknown as import('../events/event-bus.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
""")

# ═══════════════════════════════════════════════════════════════════
# 3. ImprovementEngine
# ═══════════════════════════════════════════════════════════════════
w("improvement-engine.ts", r"""/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #3
 * ImprovementEngine: Builds and manages improvement recommendations.
 * TASK-AIS-008A.000 | PHI-001: Create value; PHI-005: No optimization without value.
 */

import type { EventBus } from '../events/event-bus.js';
import type {
  ImprovementId, Improvement, ImprovementStatus,
  ConstraintType, ValueDimension, ImprovementEngineConfig,
} from './types.js';
import { ImprovementStatus as IS, ValueDimension as VD, brandImprovementId } from './types.js';
import type { IImprovementEngine, ImprovementProposalParams } from './contracts.js';
import {
  ImprovementNotFoundError, ImprovementLimitExceededError, ImprovementStateError,
} from './errors.js';
import type { ImprovementProposedEvent, ImprovementStatusChangedEvent, ImprovementCompletedEvent } from './events.js';
import { EventClassification } from '../types/common.js';

const VALID_TRANSITIONS: Record<ImprovementStatus, readonly ImprovementStatus[]> = {
  [IS.Proposed]: Object.freeze([IS.Planned, IS.Rejected]),
  [IS.Planned]: Object.freeze([IS.InProgress, IS.Rejected]),
  [IS.InProgress]: Object.freeze([IS.Completed, IS.Failed, IS.RolledBack]),
  [IS.Completed]: Object.freeze([]),
  [IS.Failed]: Object.freeze([IS.Proposed]),
  [IS.Rejected]: Object.freeze([]),
  [IS.RolledBack]: Object.freeze([IS.Proposed]),
};

class ImprovementStore {
  private readonly items = new Map<string, Improvement>();

  add(i: Improvement): void { this.items.set(i.id, i); }
  get(id: ImprovementId): Improvement | undefined { return this.items.get(id); }
  getAll(): readonly Improvement[] { return Object.freeze([...this.items.values()]); }
  update(id: ImprovementId, i: Improvement): void { this.items.set(id, i); }
  get size(): number { return this.items.size; }
}

export class ImprovementEngine implements IImprovementEngine {
  private readonly config: ImprovementEngineConfig;
  private readonly eventBus: EventBus | null;
  private readonly store = new ImprovementStore();

  constructor(config: ImprovementEngineConfig, eventBus?: EventBus) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async propose(params: ImprovementProposalParams): Promise<Improvement> {
    if (this.store.size >= this.config.maxImprovements) {
      throw new ImprovementLimitExceededError(this.config.maxImprovements);
    }
    const ts = new Date().toISOString();
    const improvement: Improvement = Object.freeze({
      id: brandImprovementId(crypto.randomUUID()),
      status: IS.Proposed,
      valueScore: 0,
      impactScore: 0,
      costScore: 0,
      riskScore: 0,
      urgencyScore: 0,
      constraintWeight: 1.0,
      priority: 0,
      valueDimension: VD.UserValue,
      proposedAt: ts,
      startedAt: null,
      completedAt: null,
      evidence: params.evidence,
      metadata: params.metadata,
      ...params,
    });

    this.store.add(improvement);

    void this.publishEvent<ImprovementProposedEvent>({
      eventType: 'evolution.improvement.proposed',
      classification: EventClassification.Action,
      improvementId: improvement.id,
      name: improvement.name,
      constraintType: improvement.constraintType,
      valueScore: improvement.valueScore,
      priority: improvement.priority,
      valueDimension: improvement.valueDimension,
      timestamp: ts,
      metadata: Object.freeze({}),
    });

    return improvement;
  }

  async getById(id: ImprovementId): Promise<Improvement | null> {
    return this.store.get(id) ?? null;
  }

  async list(filter?: Partial<{ status: ImprovementStatus; constraintType: ConstraintType }>): Promise<readonly Improvement[]> {
    let items = this.store.getAll();
    if (filter?.status !== undefined) {
      items = items.filter(i => i.status === filter.status);
    }
    if (filter?.constraintType !== undefined) {
      items = items.filter(i => i.constraintType === filter.constraintType);
    }
    return items;
  }

  async updateStatus(id: ImprovementId, status: ImprovementStatus): Promise<void> {
    const existing = this.store.get(id);
    if (!existing) throw new ImprovementNotFoundError(id);

    const validTargets = VALID_TRANSITIONS[existing.status];
    if (!validTargets.includes(status)) {
      throw new ImprovementStateError(id, existing.status, status);
    }

    const ts = new Date().toISOString();
    const startedAt = status === IS.InProgress ? ts : existing.startedAt;
    const completedAt = (status === IS.Completed || status === IS.Failed) ? ts : existing.completedAt;

    const updated: Improvement = Object.freeze({
      ...existing,
      status,
      startedAt,
      completedAt,
    });
    this.store.update(id, updated);

    void this.publishEvent<ImprovementStatusChangedEvent>({
      eventType: 'evolution.improvement.statusChanged',
      classification: EventClassification.StateChange,
      improvementId: id,
      fromStatus: existing.status,
      toStatus: status,
      timestamp: ts,
      metadata: Object.freeze({}),
    });

    if (status === IS.Completed) {
      void this.publishEvent<ImprovementCompletedEvent>({
        eventType: 'evolution.improvement.completed',
        classification: EventClassification.Result,
        improvementId: id,
        valueScore: updated.valueScore,
        durationMs: startedAt ? Date.now() - new Date(startedAt).getTime() : 0,
        timestamp: ts,
        metadata: Object.freeze({}),
      });
    }
  }

  async count(): Promise<number> {
    return this.store.size;
  }

  getStore(): ImprovementStore { return this.store; }

  private async publishEvent<T extends { eventType: string; classification: EventClassification; timestamp: string }>(
    partial: Omit<T, 'eventId' | 'timestamp' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        sequence: 0,
        aggregateId: 'evolution-improvement-engine',
        aggregateType: 'Evolution',
        version: '1.0.0',
        ...partial,
      } as unknown as import('../events/event-bus.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
""")

# ═══════════════════════════════════════════════════════════════════
# 4. ValueAnalyzer
# ═══════════════════════════════════════════════════════════════════
w("value-analyzer.ts", r"""/**
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
import { ValueAnalysisError } from './errors.js';
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
    partial: Omit<T, 'eventId' | 'timestamp' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        sequence: 0,
        aggregateId: 'evolution-value-analyzer',
        aggregateType: 'Evolution',
        version: '1.0.0',
        ...partial,
      } as unknown as import('../events/event-bus.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
""")

# ═══════════════════════════════════════════════════════════════════
# 5. OpportunityCostEngine
# ═══════════════════════════════════════════════════════════════════
w("opportunity-cost-engine.ts", r"""/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #5
 * OpportunityCostEngine: If we improve X, what can we NOT improve?
 * TASK-AIS-008A.000 | PHI-006: Local optimization is forbidden.
 */

import type { EventBus } from '../events/event-bus.js';
import type {
  ImprovementId, OpportunityCost, OpportunityCostConfig,
} from './types.js';
import type { IOpportunityCostEngine } from './contracts.js';
import { OpportunityCostError } from './errors.js';
import type { OpportunityCostAnalyzedEvent } from './events.js';
import { EventClassification } from '../types/common.js';

class OpportunityCostStore {
  private readonly items = new Map<string, OpportunityCost>();
  private readonly byImprovement = new Map<string, OpportunityCost>();

  add(a: OpportunityCost): void {
    this.items.set(a.improvementId, a);
    this.byImprovement.set(a.improvementId, a);
  }
  getByImprovement(id: ImprovementId): OpportunityCost | undefined { return this.byImprovement.get(id); }
  getAll(): readonly OpportunityCost[] { return Object.freeze([...this.items.values()]); }
  get size(): number { return this.items.size; }
}

export class OpportunityCostEngine implements IOpportunityCostEngine {
  private readonly config: OpportunityCostConfig;
  private readonly eventBus: EventBus | null;
  private readonly store = new OpportunityCostStore();

  constructor(config: OpportunityCostConfig, eventBus?: EventBus) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async analyze(improvementId: ImprovementId): Promise<OpportunityCost> {
    const ts = new Date().toISOString();

    const analysis: OpportunityCost = Object.freeze({
      improvementId,
      foregoneImprovements: Object.freeze([] as ImprovementId[]),
      foregoneValue: 0,
      foregoneImpact: 0,
      netBenefit: 0,
      analyzedAt: ts,
      metadata: Object.freeze({}),
    });

    this.store.add(analysis);

    void this.publishEvent<OpportunityCostAnalyzedEvent>({
      eventType: 'evolution.opportunityCost.analyzed',
      classification: EventClassification.Result,
      improvementId,
      netBenefit: analysis.netBenefit,
      foregoneCount: analysis.foregoneImprovements.length,
      timestamp: ts,
      metadata: Object.freeze({}),
    });

    return analysis;
  }

  async getByImprovementId(improvementId: ImprovementId): Promise<OpportunityCost | null> {
    return this.store.getByImprovement(improvementId) ?? null;
  }

  async listAnalyses(): Promise<readonly OpportunityCost[]> {
    return this.store.getAll();
  }

  getStore(): OpportunityCostStore { return this.store; }

  private async publishEvent<T extends { eventType: string; classification: EventClassification; timestamp: string }>(
    partial: Omit<T, 'eventId' | 'timestamp' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        sequence: 0,
        aggregateId: 'evolution-opportunity-cost',
        aggregateType: 'Evolution',
        version: '1.0.0',
        ...partial,
      } as unknown as import('../events/event-bus.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
""")

# ═══════════════════════════════════════════════════════════════════
# 6. OptimizationPlanner
# ═══════════════════════════════════════════════════════════════════
w("optimization-planner.ts", r"""/**
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
import { RoadmapLimitExceededError } from './errors.js';
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
    partial: Omit<T, 'eventId' | 'timestamp' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        sequence: 0,
        aggregateId: 'evolution-optimization-planner',
        aggregateType: 'Evolution',
        version: '1.0.0',
        ...partial,
      } as unknown as import('../events/event-bus.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
""")

# ═══════════════════════════════════════════════════════════════════
# 7. ExperimentRuntime
# ═══════════════════════════════════════════════════════════════════
w("experiment-runtime.ts", r"""/**
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
  ExperimentStateError, ExperimentTimeoutError,
} from './errors.js';
import type { ExperimentStartedEvent, ExperimentCompletedEvent, ExperimentFailedEvent } from './events.js';
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
      ...params,
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
    partial: Omit<T, 'eventId' | 'timestamp' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        eventId: crypto.randomUUID(), timestamp: new Date().toISOString(), sequence: 0,
        aggregateId: 'evolution-experiment-runtime', aggregateType: 'Evolution', version: '1.0.0',
        ...partial,
      } as unknown as import('../events/event-bus.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
""")

# ═══════════════════════════════════════════════════════════════════
# 8. KPIRuntime
# ═══════════════════════════════════════════════════════════════════
w("kpi-runtime.ts", r"""/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #8
 * KPIRuntime: All improvements are measured — Before, After, ROI, Value, Cost, Time.
 * TASK-AIS-008A.000 | PHI-003: Every recommendation must be measurable.
 */

import type { EventBus } from '../events/event-bus.js';
import type {
  KPIId, KPIDefinition, KPIMeasurement, KPIComparison, KPDirection, KPIRuntimeConfig,
} from './types.js';
import { brandKPIId } from './types.js';
import type { IKPIRuntime, KPIRegistrationParams } from './contracts.js';
import { PINotFoundError, PILimitExceededError } from './errors.js';
import type { KPIRegisteredEvent, KPIUpdatedEvent } from './events.js';
import { EventClassification } from '../types/common.js';

class KPIStore {
  private readonly items = new Map<string, KPIDefinition>();
  add(k: KPIDefinition): void { this.items.set(k.id, k); }
  get(id: KPIId): KPIDefinition | undefined { return this.items.get(id); }
  getAll(): readonly KPIDefinition[] { return Object.freeze([...this.items.values()]); }
  update(id: KPIId, k: KPIDefinition): void { this.items.set(id, k); }
  get size(): number { return this.items.size; }
}

export class KPIRuntime implements IKPIRuntime {
  private readonly config: KPIRuntimeConfig;
  private readonly eventBus: EventBus | null;
  private readonly store = new KPIStore();

  constructor(config: KPIRuntimeConfig, eventBus?: EventBus) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async register(params: KPIRegistrationParams): Promise<KPIDefinition> {
    if (this.store.size >= this.config.maxKPIs) {
      throw new PILimitExceededError(this.config.maxKPIs);
    }
    const ts = new Date().toISOString();
    const measurement: KPIMeasurement = Object.freeze({
      value: params.initialValue, timestamp: ts, metadata: Object.freeze({}),
    });
    const kpi: KPIDefinition = Object.freeze({
      id: brandKPIId(crypto.randomUUID()),
      name: params.name,
      description: params.description,
      unit: params.unit,
      direction: params.direction,
      target: params.target,
      currentValue: params.initialValue,
      history: Object.freeze([measurement]),
      createdAt: ts,
      metadata: params.metadata,
    });
    this.store.add(kpi);
    void this.publishEvent<KPIRegisteredEvent>({
      eventType: 'evolution.kpi.registered', classification: EventClassification.Action,
      kpiId: kpi.id, name: kpi.name, timestamp: ts, metadata: Object.freeze({}),
    });
    return kpi;
  }

  async record(kpiId: KPIId, value: number, metadata?: Readonly<Record<string, unknown>>): Promise<void> {
    const existing = this.store.get(kpiId);
    if (!existing) throw new PINotFoundError(kpiId);
    const previousValue = existing.currentValue;
    const ts = new Date().toISOString();
    const measurement: KPIMeasurement = Object.freeze({
      value, timestamp: ts, metadata: metadata ?? Object.freeze({}),
    });
    const newHistory = [...existing.history, measurement];
    if (newHistory.length > this.config.maxHistoryLength) {
      newHistory.splice(0, newHistory.length - this.config.maxHistoryLength);
    }
    const improved = existing.direction === 'HigherIsBetter'
      ? value > previousValue
      : existing.direction === 'LowerIsBetter'
        ? value < previousValue
        : existing.target !== null
          ? Math.abs(value - existing.target) < Math.abs(previousValue - existing.target)
          : false;
    this.store.update(kpiId, Object.freeze({
      ...existing, currentValue: value, history: Object.freeze(newHistory),
    }));
    void this.publishEvent<KPIUpdatedEvent>({
      eventType: 'evolution.kpi.updated', classification: EventClassification.Result,
      kpiId, newValue: value, previousValue, improved, timestamp: ts, metadata: Object.freeze({}),
    });
  }

  async getById(id: KPIId): Promise<KPIDefinition | null> {
    return this.store.get(id) ?? null;
  }

  async list(): Promise<readonly KPIDefinition[]> {
    return this.store.getAll();
  }

  async getComparison(kpiId: KPIId, beforeTimestamp: string, afterTimestamp: string): Promise<KPIComparison | null> {
    const kpi = this.store.get(kpiId);
    if (!kpi) return null;
    const beforeEntry = kpi.history.find(m => m.timestamp <= beforeTimestamp);
    const afterEntry = [...kpi.history].reverse().find(m => m.timestamp >= afterTimestamp);
    if (!beforeEntry || !afterEntry) return null;
    const change = afterEntry.value - beforeEntry.value;
    const changePercent = beforeEntry.value === 0
      ? (afterEntry.value === 0 ? 0 : 100)
      : (change / beforeEntry.value) * 100;
    const improved = kpi.direction === 'HigherIsBetter'
      ? change > 0
      : kpi.direction === 'LowerIsBetter'
        ? change < 0
        : kpi.target !== null
          ? Math.abs(afterEntry.value - kpi.target) < Math.abs(beforeEntry.value - kpi.target)
          : false;
    return Object.freeze({
      kpiId, kpiName: kpi.name,
      beforeValue: beforeEntry.value, afterValue: afterEntry.value,
      change, changePercent, direction: kpi.direction, improved,
      metadata: Object.freeze({}),
    });
  }

  async count(): Promise<number> { return this.store.size; }

  getStore(): KPIStore { return this.store; }

  private async publishEvent<T extends { eventType: string; classification: EventClassification; timestamp: string }>(
    partial: Omit<T, 'eventId' | 'timestamp' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        eventId: crypto.randomUUID(), timestamp: new Date().toISOString(), sequence: 0,
        aggregateId: 'evolution-kpi-runtime', aggregateType: 'Evolution', version: '1.0.0',
        ...partial,
      } as unknown as import('../events/event-bus.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
""")

# ═══════════════════════════════════════════════════════════════════
# 9. FeedbackCollector
# ═══════════════════════════════════════════════════════════════════
w("feedback-collector.ts", r"""/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #9
 * FeedbackCollector: Collects feedback from User, Developer, Logs, Metrics, AI, etc.
 * TASK-AIS-008A.000
 */

import type { EventBus } from '../events/event-bus.js';
import type {
  FeedbackId, FeedbackEntry, FeedbackSource, FeedbackSentiment,
  BottleneckId, ImprovementId, FeedbackCollectorConfig,
} from './types.js';
import { brandFeedbackId } from './types.js';
import type { IFeedbackCollector, FeedbackCollectionParams } from './contracts.js';
import { FeedbackNotFoundError, FeedbackLimitExceededError } from './errors.js';
import type { FeedbackReceivedEvent, FeedbackProcessedEvent } from './events.js';
import { EventClassification } from '../types/common.js';

class FeedbackStore {
  private readonly items = new Map<string, FeedbackEntry>();
  add(f: FeedbackEntry): void { this.items.set(f.id, f); }
  get(id: FeedbackId): FeedbackEntry | undefined { return this.items.get(id); }
  getAll(): readonly FeedbackEntry[] { return Object.freeze([...this.items.values()]); }
  update(id: FeedbackId, f: FeedbackEntry): void { this.items.set(id, f); }
  get size(): number { return this.items.size; }
}

const INSIGHT_PATTERNS: Partial<Record<FeedbackSentiment, string[]>> = {
  Negative: Object.freeze(['Potential bottleneck', 'Quality concern', 'UX friction detected']),
  Positive: Object.freeze(['Working well', 'Value confirmed', 'User satisfied']),
  Critical: Object.freeze(['Critical issue', 'Immediate action needed', 'Value destruction detected']),
  Neutral: Object.freeze(['Observation', 'Data point recorded', 'Monitoring recommended']),
};

export class FeedbackCollector implements IFeedbackCollector {
  private readonly config: FeedbackCollectorConfig;
  private readonly eventBus: EventBus | null;
  private readonly store = new FeedbackStore();

  constructor(config: FeedbackCollectorConfig, eventBus?: EventBus) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async collect(params: FeedbackCollectionParams): Promise<FeedbackEntry> {
    if (this.store.size >= this.config.maxFeedback) {
      throw new FeedbackLimitExceededError(this.config.maxFeedback);
    }
    const ts = new Date().toISOString();
    const entry: FeedbackEntry = Object.freeze({
      id: brandFeedbackId(crypto.randomUUID()),
      source: params.source,
      sentiment: params.sentiment,
      content: params.content,
      relatedBottleneckId: params.relatedBottleneckId,
      relatedImprovementId: params.relatedImprovementId,
      receivedAt: ts,
      processed: false,
      processedAt: null,
      extractedInsights: Object.freeze([]),
      metadata: params.metadata,
    });
    this.store.add(entry);
    void this.publishEvent<FeedbackReceivedEvent>({
      eventType: 'evolution.feedback.received', classification: EventClassification.Action,
      feedbackId: entry.id, source: params.source, sentiment: params.sentiment,
      timestamp: ts, metadata: Object.freeze({}),
    });
    if (this.config.autoProcessEnabled) {
      return this.process(entry.id);
    }
    return entry;
  }

  async process(feedbackId: FeedbackId): Promise<FeedbackEntry> {
    const existing = this.store.get(feedbackId);
    if (!existing) throw new FeedbackNotFoundError(feedbackId);
    const ts = new Date().toISOString();
    const insights = INSIGHT_PATTERNS[existing.sentiment] ?? ['General feedback recorded'];
    const updated: FeedbackEntry = Object.freeze({
      ...existing,
      processed: true,
      processedAt: ts,
      extractedInsights: Object.freeze(insights),
    });
    this.store.update(feedbackId, updated);
    void this.publishEvent<FeedbackProcessedEvent>({
      eventType: 'evolution.feedback.processed', classification: EventClassification.Result,
      feedbackId, insightCount: insights.length, timestamp: ts, metadata: Object.freeze({}),
    });
    return updated;
  }

  async getById(id: FeedbackId): Promise<FeedbackEntry | null> {
    return this.store.get(id) ?? null;
  }

  async list(filter?: Partial<{ source: FeedbackSource; sentiment: FeedbackSentiment; processed: boolean }>): Promise<readonly FeedbackEntry[]> {
    let items = this.store.getAll();
    if (filter?.source !== undefined) items = items.filter(f => f.source === filter.source);
    if (filter?.sentiment !== undefined) items = items.filter(f => f.sentiment === filter.sentiment);
    if (filter?.processed !== undefined) items = items.filter(f => f.processed === filter.processed);
    return items;
  }

  async count(): Promise<number> { return this.store.size; }

  getStore(): FeedbackStore { return this.store; }

  private async publishEvent<T extends { eventType: string; classification: EventClassification; timestamp: string }>(
    partial: Omit<T, 'eventId' | 'timestamp' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        eventId: crypto.randomUUID(), timestamp: new Date().toISOString(), sequence: 0,
        aggregateId: 'evolution-feedback-collector', aggregateType: 'Evolution', version: '1.0.0',
        ...partial,
      } as unknown as import('../events/event-bus.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
""")

# ═══════════════════════════════════════════════════════════════════
# 10. LearningLoop
# ═══════════════════════════════════════════════════════════════════
w("learning-loop.ts", r"""/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #10
 * LearningLoop: Every improvement becomes experience. Remembers what helped/hurt.
 * TASK-AIS-008A.000 | PHI-002: Continuous improvement through learning.
 */

import type { EventBus } from '../events/event-bus.js';
import type {
  LearningRecordId, LearningRecord, LearningOutcome,
  ImprovementId, ExperimentId, LearningLoopConfig,
} from './types.js';
import { brandLearningRecordId } from './types.js';
import type { ILearningLoop, LearningRecordParams } from './contracts.js';
import { LearningRecordNotFoundError } from './errors.js';
import type { LearningRecordedEvent } from './events.js';
import { EventClassification } from '../types/common.js';

class LearningStore {
  private readonly items = new Map<string, LearningRecord>();
  private readonly byAction = new Map<string, LearningRecord[]>();

  add(r: LearningRecord): void {
    this.items.set(r.id, r);
    const existing = this.byAction.get(r.action) ?? [];
    existing.push(r);
    this.byAction.set(r.action, existing);
  }
  get(id: LearningRecordId): LearningRecord | undefined { return this.items.get(id); }
  getAll(): readonly LearningRecord[] { return Object.freeze([...this.items.values()]); }
  getByAction(action: string): readonly LearningRecord[] {
    return Object.freeze(this.byAction.get(action) ?? []);
  }
  get size(): number { return this.items.size; }
}

export class LearningLoop implements ILearningLoop {
  private readonly config: LearningLoopConfig;
  private readonly eventBus: EventBus | null;
  private readonly store = new LearningStore();

  constructor(config: LearningLoopConfig, eventBus?: EventBus) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async record(params: LearningRecordParams): Promise<LearningRecord> {
    if (this.store.size >= this.config.maxLearningRecords) {
      // Evict oldest record (FIFO)
      const oldest = this.store.getAll()[0];
      if (oldest) this.store.get(oldest.id); // In real impl, would delete
    }
    const ts = new Date().toISOString();
    const record: LearningRecord = Object.freeze({
      id: brandLearningRecordId(crypto.randomUUID()),
      action: params.action,
      outcome: params.outcome,
      lesson: params.lesson,
      context: params.context,
      improvementId: params.improvementId,
      experimentId: params.experimentId,
      createdAt: ts,
      metadata: params.metadata,
    });
    this.store.add(record);
    void this.publishEvent<LearningRecordedEvent>({
      eventType: 'evolution.learning.recorded', classification: EventClassification.Action,
      recordId: record.id, outcome: params.outcome, lesson: params.lesson,
      timestamp: ts, metadata: Object.freeze({}),
    });
    return record;
  }

  async getById(id: LearningRecordId): Promise<LearningRecord | null> {
    return this.store.get(id) ?? null;
  }

  async list(filter?: Partial<{ outcome: LearningOutcome }>): Promise<readonly LearningRecord[]> {
    let items = this.store.getAll();
    if (filter?.outcome !== undefined) {
      items = items.filter(r => r.outcome === filter.outcome);
    }
    return items;
  }

  async getLessonsForAction(action: string): Promise<readonly LearningRecord[]> {
    return this.store.getByAction(action);
  }

  async count(): Promise<number> { return this.store.size; }

  getStore(): LearningStore { return this.store; }

  private async publishEvent<T extends { eventType: string; classification: EventClassification; timestamp: string }>(
    partial: Omit<T, 'eventId' | 'timestamp' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        eventId: crypto.randomUUID(), timestamp: new Date().toISOString(), sequence: 0,
        aggregateId: 'evolution-learning-loop', aggregateType: 'Evolution', version: '1.0.0',
        ...partial,
      } as unknown as import('../events/event-bus.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
""")

# ═══════════════════════════════════════════════════════════════════
# 11. EvolutionGraph
# ═══════════════════════════════════════════════════════════════════
w("evolution-graph.ts", r"""/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #11
 * EvolutionGraph: Graph of platform evolution. Each change is a node.
 * TASK-AIS-008A.000
 */

import type { EventBus } from '../events/event-bus.js';
import type {
  EvolutionNodeId, EvolutionNode, EvolutionEdge,
  EvolutionGraphConfig,
} from './types.js';
import { brandEvolutionNodeId } from './types.js';
import type { IEvolutionGraph, EvolutionNodeParams } from './contracts.js';
import { GraphNodeLimitExceededError, EvolutionGraphError } from './errors.js';
import type { EvolutionNodeAddedEvent } from './events.js';
import { EventClassification } from '../types/common.js';

class GraphStore {
  private readonly nodes = new Map<string, EvolutionNode>();
  private readonly edges: EvolutionEdge[] = [];

  addNode(n: EvolutionNode): void { this.nodes.set(n.id, n); }
  getNode(id: EvolutionNodeId): EvolutionNode | undefined { return this.nodes.get(id); }
  getAllNodes(): readonly EvolutionNode[] { return Object.freeze([...this.nodes.values()]); }
  addEdge(e: EvolutionEdge): void { this.edges.push(e); }
  getAllEdges(): readonly EvolutionEdge[] { return Object.freeze([...this.edges]); }
  get nodeCount(): number { return this.nodes.size; }
  get edgeCount(): number { return this.edges.length; }
}

export class EvolutionGraph implements IEvolutionGraph {
  private readonly config: EvolutionGraphConfig;
  private readonly eventBus: EventBus | null;
  private readonly store = new GraphStore();

  constructor(config: EvolutionGraphConfig, eventBus?: EventBus) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async addNode(params: EvolutionNodeParams): Promise<EvolutionNode> {
    if (this.store.nodeCount >= this.config.maxNodes) {
      throw new GraphNodeLimitExceededError(this.config.maxNodes);
    }
    const ts = new Date().toISOString();
    const nodeId = brandEvolutionNodeId(crypto.randomUUID());
    const node: EvolutionNode = Object.freeze({
      id: nodeId,
      type: params.type,
      title: params.title,
      description: params.description,
      relatedIds: params.relatedIds,
      parentId: params.parentId,
      childIds: Object.freeze([]),
      valueImpact: params.valueImpact,
      createdAt: ts,
      metadata: params.metadata,
    });

    // Update parent's childIds
    if (params.parentId) {
      const parent = this.store.getNode(params.parentId);
      if (parent) {
        const updatedParent: EvolutionNode = Object.freeze({
          ...parent,
          childIds: Object.freeze([...parent.childIds, nodeId]),
        });
        this.store.addNode(updatedParent);
      }
    }

    this.store.addNode(node);
    void this.publishEvent<EvolutionNodeAddedEvent>({
      eventType: 'evolution.graph.nodeAdded', classification: EventClassification.Action,
      nodeId, type: params.type, title: params.title,
      timestamp: ts, metadata: Object.freeze({}),
    });
    return node;
  }

  async addEdge(from: EvolutionNodeId, to: EvolutionNodeId, label: string, weight: number = 1): Promise<EvolutionEdge> {
    const edge: EvolutionEdge = Object.freeze({
      from, to, label, weight, createdAt: new Date().toISOString(),
    });
    this.store.addEdge(edge);
    return edge;
  }

  async getNode(id: EvolutionNodeId): Promise<EvolutionNode | null> {
    return this.store.getNode(id) ?? null;
  }

  async getRootNodes(): Promise<readonly EvolutionNode[]> {
    return this.store.getAllNodes().filter(n => n.parentId === null);
  }

  async getPath(nodeId: EvolutionNodeId): Promise<readonly EvolutionNode[]> {
    const path: EvolutionNode[] = [];
    let current = this.store.getNode(nodeId);
    while (current && path.length < this.config.maxDepth) {
      path.unshift(current);
      if (current.parentId) {
        current = this.store.getNode(current.parentId);
      } else {
        break;
      }
    }
    return Object.freeze(path);
  }

  async listNodes(): Promise<readonly EvolutionNode[]> {
    return this.store.getAllNodes();
  }

  async listEdges(): Promise<readonly EvolutionEdge[]> {
    return this.store.getAllEdges();
  }

  async count(): Promise<number> { return this.store.nodeCount; }

  getStore(): GraphStore { return this.store; }

  private async publishEvent<T extends { eventType: string; classification: EventClassification; timestamp: string }>(
    partial: Omit<T, 'eventId' | 'timestamp' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        eventId: crypto.randomUUID(), timestamp: new Date().toISOString(), sequence: 0,
        aggregateId: 'evolution-graph', aggregateType: 'Evolution', version: '1.0.0',
        ...partial,
      } as unknown as import('../events/event-bus.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
""")

# ═══════════════════════════════════════════════════════════════════
# 12. ArchitectureOptimizer
# ═══════════════════════════════════════════════════════════════════
w("architecture-optimizer.ts", r"""/**
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
import { ArchitectureAnalysisError } from './errors.js';
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
    partial: Omit<T, 'eventId' | 'timestamp' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        eventId: crypto.randomUUID(), timestamp: new Date().toISOString(), sequence: 0,
        aggregateId: 'evolution-architecture-optimizer', aggregateType: 'Evolution', version: '1.0.0',
        ...partial,
      } as unknown as import('../events/event-bus.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
""")

# ═══════════════════════════════════════════════════════════════════
# 13. TechnicalDebtAnalyzer
# ═══════════════════════════════════════════════════════════════════
w("tech-debt-analyzer.ts", r"""/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #13
 * TechnicalDebtAnalyzer: Evaluates tech debt cost, priority of elimination.
 * TASK-AIS-008A.000
 */

import type { EventBus } from '../events/event-bus.js';
import type {
  TechDebtId, TechDebtItem, TechDebtPriority, TechDebtConfig,
} from './types.js';
import { brandTechDebtId } from './types.js';
import type { ITechDebtAnalyzer, TechDebtRegistrationParams } from './contracts.js';
import { TechDebtNotFoundError, TechDebtLimitExceededError } from './errors.js';
import type { TechDebtDetectedEvent, TechDebtResolvedEvent } from './events.js';
import { EventClassification } from '../types/common.js';

class TechDebtStore {
  private readonly items = new Map<string, TechDebtItem>();
  add(t: TechDebtItem): void { this.items.set(t.id, t); }
  get(id: TechDebtId): TechDebtItem | undefined { return this.items.get(id); }
  getAll(): readonly TechDebtItem[] { return Object.freeze([...this.items.values()]); }
  update(id: TechDebtId, t: TechDebtItem): void { this.items.set(id, t); }
  get size(): number { return this.items.size; }
}

export class TechnicalDebtAnalyzer implements ITechDebtAnalyzer {
  private readonly config: TechDebtConfig;
  private readonly eventBus: EventBus | null;
  private readonly store = new TechDebtStore();

  constructor(config: TechDebtConfig, eventBus?: EventBus) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async register(params: TechDebtRegistrationParams): Promise<TechDebtItem> {
    if (this.store.size >= this.config.maxItems) {
      throw new TechDebtLimitExceededError(this.config.maxItems);
    }
    const ts = new Date().toISOString();
    const item: TechDebtItem = Object.freeze({
      id: brandTechDebtId(crypto.randomUUID()),
      name: params.name,
      description: params.description,
      priority: params.priority,
      estimatedCost: params.estimatedCost,
      impact: params.impact,
      targetModule: params.targetModule,
      targetFile: params.targetFile,
      createdAt: ts,
      resolvedAt: null,
      metadata: params.metadata,
    });
    this.store.add(item);
    void this.publishEvent<TechDebtDetectedEvent>({
      eventType: 'evolution.techDebt.detected', classification: EventClassification.Action,
      techDebtId: item.id, name: item.name, priority: params.priority,
      estimatedCost: params.estimatedCost, timestamp: ts, metadata: Object.freeze({}),
    });
    return item;
  }

  async resolve(id: TechDebtId): Promise<void> {
    const existing = this.store.get(id);
    if (!existing) throw new TechDebtNotFoundError(id);
    const ts = new Date().toISOString();
    this.store.update(id, Object.freeze({ ...existing, resolvedAt: ts }));
    void this.publishEvent<TechDebtResolvedEvent>({
      eventType: 'evolution.techDebt.resolved', classification: EventClassification.StateChange,
      techDebtId: id, timestamp: ts, metadata: Object.freeze({}),
    });
  }

  async getById(id: TechDebtId): Promise<TechDebtItem | null> {
    return this.store.get(id) ?? null;
  }

  async list(filter?: Partial<{ priority: TechDebtPriority; resolved: boolean }>): Promise<readonly TechDebtItem[]> {
    let items = this.store.getAll();
    if (filter?.priority !== undefined) items = items.filter(t => t.priority === filter.priority);
    if (filter?.resolved !== undefined) items = items.filter(t => (t.resolvedAt !== null) === filter.resolved);
    return items;
  }

  async getTotalCost(): Promise<number> {
    return this.store.getAll()
      .filter(t => t.resolvedAt === null)
      .reduce((sum, t) => sum + t.estimatedCost, 0);
  }

  async count(): Promise<number> { return this.store.size; }

  getStore(): TechDebtStore { return this.store; }

  private async publishEvent<T extends { eventType: string; classification: EventClassification; timestamp: string }>(
    partial: Omit<T, 'eventId' | 'timestamp' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        eventId: crypto.randomUUID(), timestamp: new Date().toISOString(), sequence: 0,
        aggregateId: 'evolution-tech-debt-analyzer', aggregateType: 'Evolution', version: '1.0.0',
        ...partial,
      } as unknown as import('../events/event-bus.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
""")

# ═══════════════════════════════════════════════════════════════════
# 14. RecommendationPrioritizer
# ═══════════════════════════════════════════════════════════════════
w("recommendation-prioritizer.ts", r"""/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #14
 * RecommendationPrioritizer: Uses Value, Impact, Cost, Risk, Urgency, Constraint, Opportunity Cost.
 * TASK-AIS-008A.000 | Formula: Priority = (Value x Impact x ConstraintWeight) / (Cost x Risk)
 */

import type {
  Improvement, PrioritizerConfig,
} from './types.js';
import type { IRecommendationPrioritizer } from './contracts.js';

export class RecommendationPrioritizer implements IRecommendationPrioritizer {
  private readonly config: PrioritizerConfig;

  constructor(config: PrioritizerConfig) {
    this.config = config;
  }

  calculatePriority(improvement: Improvement): number {
    const costFactor = improvement.costScore > 0 ? improvement.costScore : 0.1;
    const riskFactor = improvement.riskScore > 0 ? improvement.riskScore : 0.1;
    const priority =
      (improvement.valueScore * this.config.valueWeight *
       improvement.impactScore * this.config.impactWeight *
       improvement.constraintWeight * this.config.constraintWeight) /
      (costFactor * this.config.costWeight *
       riskFactor * this.config.riskWeight);
    return Math.round(priority * 100) / 100;
  }

  async prioritize(improvements: readonly Improvement[]): Promise<readonly Improvement[]> {
    const withPriority = improvements.map(imp => {
      const priority = this.calculatePriority(imp);
      return { ...imp, priority };
    });
    withPriority.sort((a, b) => b.priority - a.priority);
    return Object.freeze(withPriority);
  }
}
""")

print("Generated 14 subsystem files.")
