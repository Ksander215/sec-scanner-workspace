/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Bottleneck Detector
 * TASK-AIS-008A.000
 *
 * Detects the weakest links limiting value creation across all scopes.
 * PHI-004: The primary constraint must be identified first.
 */

import type { Timestamp } from '../types/common.js';
import { EventClassification } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { IBottleneckDetector, BottleneckDetectionParams } from './contracts.js';
import type {
  BottleneckId, Bottleneck, BottleneckDetectorConfig,
} from './types.js';
import { brandBottleneckId, BottleneckScope, BottleneckSeverity, ConstraintType } from './types.js';
import { BottleneckNotFoundError, BottleneckLimitExceededError } from './errors.js';

export class BottleneckDetector implements IBottleneckDetector {
  private readonly config: BottleneckDetectorConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly bottlenecks = new Map<string, Bottleneck>();

  constructor(config: BottleneckDetectorConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async detect(params: Partial<BottleneckDetectionParams>): Promise<readonly Bottleneck[]> {
    const now: Timestamp = new Date().toISOString();
    if (this.bottlenecks.size >= this.config.maxBottlenecks) {
      throw new BottleneckLimitExceededError(this.config.maxBottlenecks);
    }

    const runtimeName = params.runtimeName ?? 'unknown';
    const errors = params.errors ?? [];
    const metrics = params.metrics ?? {};
    const evidence: string[] = [...errors];
    if (evidence.length < this.config.minEvidenceItems) {
      evidence.push('auto-detected');
    }

    const severity: BottleneckSeverity =
      errors.length >= 5 ? BottleneckSeverity.Critical :
      errors.length >= 3 ? BottleneckSeverity.High :
      errors.length >= 1 ? BottleneckSeverity.Medium :
      BottleneckSeverity.Low;

    const scope: BottleneckScope = params.workflowName
      ? BottleneckScope.Workflow
      : params.capabilityName
        ? BottleneckScope.Capability
        : BottleneckScope.Runtime;

    const constraintType = this.inferConstraintType(metrics, errors);

    const id = brandBottleneckId(`bn-${crypto.randomUUID()}`);
    const bottleneck: Bottleneck = Object.freeze({
      id,
      name: `Bottleneck in ${runtimeName}`,
      description: `Detected constraint in ${runtimeName} at ${now}`,
      constraintType,
      scope,
      severity,
      targetRuntime: runtimeName,
      targetCapability: params.capabilityName ?? null,
      targetWorkflow: params.workflowName ?? null,
      evidence: Object.freeze(evidence),
      detectedAt: now,
      resolvedAt: null,
      relatedBottleneckIds: Object.freeze([]),
      metadata: Object.freeze({ ...params.metadata }),
    });

    this.bottlenecks.set(id as string, bottleneck);

    await this.publishEvent({
      eventType: 'evolution.bottleneck.detected',
      classification: EventClassification.Result,
      bottleneckId: id,
      name: bottleneck.name,
      constraintType,
      severity,
      targetRuntime: runtimeName,
      timestamp: now,
      metadata: Object.freeze({ ...params.metadata }),
    }, id as string, 'Bottleneck');

    return [bottleneck];
  }

  async getById(id: BottleneckId): Promise<Bottleneck | null> {
    return this.bottlenecks.get(id as string) ?? null;
  }

  async list(filter?: Partial<{ scope: BottleneckScope; severity: BottleneckSeverity; resolved: boolean }>): Promise<readonly Bottleneck[]> {
    let results = Array.from(this.bottlenecks.values());
    if (filter) {
      if (filter.scope !== undefined) results = results.filter(b => b.scope === filter.scope);
      if (filter.severity !== undefined) results = results.filter(b => b.severity === filter.severity);
      if (filter.resolved !== undefined) {
        results = results.filter(b => filter.resolved ? b.resolvedAt !== null : b.resolvedAt === null);
      }
    }
    return results;
  }

  async resolve(id: BottleneckId): Promise<void> {
    const key = id as string;
    const existing = this.bottlenecks.get(key);
    if (!existing) throw new BottleneckNotFoundError(key);

    const now: Timestamp = new Date().toISOString();
    this.bottlenecks.set(key, Object.freeze({ ...existing, resolvedAt: now }));

    await this.publishEvent({
      eventType: 'evolution.bottleneck.resolved',
      classification: EventClassification.StateChange,
      bottleneckId: id,
      resolvedAt: now,
      timestamp: now,
      metadata: {},
    }, key, 'Bottleneck');
  }

  async count(): Promise<number> {
    return this.bottlenecks.size;
  }

  private inferConstraintType(metrics: Readonly<Record<string, number>>, errors: readonly string[]): ConstraintType {
    if (metrics['latency_ms'] !== undefined || metrics['response_time'] !== undefined) return ConstraintType.Performance;
    if (metrics['error_rate'] !== undefined || errors.length > 0) return ConstraintType.Quality;
    if (metrics['ux_score'] !== undefined) return ConstraintType.UX;
    return ConstraintType.Architecture;
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
