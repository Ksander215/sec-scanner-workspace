/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #1
 * BottleneckDetector: Finds the weakest link limiting value creation.
 * TASK-AIS-008A.000 | PHI-004: Eliminate the primary constraint first.
 */

import type { EventBus } from '../events/event-bus.js';
import type {
  BottleneckId, Bottleneck, BottleneckScope, BottleneckSeverity,
  BottleneckDetectorConfig,
} from './types.js';
import { BottleneckScope as BS, BottleneckSeverity as BSev, ConstraintType, brandBottleneckId } from './types.js';
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
    partial: Omit<T, 'eventId' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        eventId: crypto.randomUUID(),
        sequence: 0,
        aggregateId: 'evolution-bottleneck-detector',
        aggregateType: 'Evolution',
        version: '1.0.0',
        ...partial,
      } as unknown as import('../../core/domain/events/domain-event.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
