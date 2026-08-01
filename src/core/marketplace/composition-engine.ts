/**
 * Composition Engine Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { Composition, CompositionStep, CompositionEngineConfig } from './types.js';
import { brandCompositionId } from './types.js';
import type { ICompositionEngine, CompositionCreationParams } from './contracts.js';
import { CompositionError, CompositionLimitExceededError, CompositionValidationError } from './errors.js';
import type { CompositionCreatedEvent, CompositionActivatedEvent, CompositionDeactivatedEvent } from './events.js';
import { CompositionType } from './types.js';

export class CompositionEngine implements ICompositionEngine {
  private readonly config: CompositionEngineConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly compositions = new Map<string, Composition>();

  constructor(config: CompositionEngineConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async create(params: CompositionCreationParams): Promise<Composition> {
    if (this.compositions.size >= this.config.maxCompositions) {
      throw new CompositionLimitExceededError(this.config.maxCompositions);
    }
    if (params.steps.length > this.config.maxStepsPerComposition) {
      throw new CompositionValidationError(`Max steps exceeded: ${params.steps.length} > ${this.config.maxStepsPerComposition}`);
    }
    const capIds = [...new Set(params.steps.map(s => s.capabilityId))];
    if (capIds.length > this.config.maxCapabilitiesPerComposition) {
      throw new CompositionValidationError(`Max capabilities exceeded: ${capIds.length} > ${this.config.maxCapabilitiesPerComposition}`);
    }
    const now: Timestamp = new Date().toISOString();
    const id = brandCompositionId(crypto.randomUUID());
    const steps: CompositionStep[] = params.steps.map(s => Object.freeze({
      order: s.order,
      capabilityId: s.capabilityId,
      config: Object.freeze({ ...s.config }),
      fallbackCapabilityId: s.fallbackCapabilityId,
      condition: s.condition,
    }));
    const composition: Composition = Object.freeze({
      id,
      name: params.name,
      description: params.description,
      type: params.type,
      steps: Object.freeze(steps),
      capabilities: Object.freeze(capIds),
      active: false,
      createdAt: now,
      updatedAt: now,
      metadata: Object.freeze({ ...params.metadata }),
    });
    this.compositions.set(id as string, composition);
    const event: CompositionCreatedEvent = Object.freeze({
      eventType: 'marketplace.composition.created',
      classification: EventClassification.Info,
      compositionId: id,
      name: params.name,
      type: params.type,
      capabilityCount: capIds.length,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, id as string, 'Composition');
    return composition;
  }

  async activate(compositionId: import('./types.js').CompositionId): Promise<void> {
    const key = compositionId as string;
    const existing = this.compositions.get(key);
    if (!existing) throw new CompositionError('Composition not found');
    const now: Timestamp = new Date().toISOString();
    const updated: Composition = Object.freeze({ ...existing, active: true, updatedAt: now });
    this.compositions.set(key, updated);
    const event: CompositionActivatedEvent = Object.freeze({
      eventType: 'marketplace.composition.activated',
      classification: EventClassification.StateChange,
      compositionId,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, key, 'Composition');
  }

  async deactivate(compositionId: import('./types.js').CompositionId): Promise<void> {
    const key = compositionId as string;
    const existing = this.compositions.get(key);
    if (!existing) throw new CompositionError('Composition not found');
    const now: Timestamp = new Date().toISOString();
    const updated: Composition = Object.freeze({ ...existing, active: false, updatedAt: now });
    this.compositions.set(key, updated);
    const event: CompositionDeactivatedEvent = Object.freeze({
      eventType: 'marketplace.composition.deactivated',
      classification: EventClassification.StateChange,
      compositionId,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, key, 'Composition');
  }

  async getById(id: import('./types.js').CompositionId): Promise<Composition | null> {
    return this.compositions.get(id as string) ?? null;
  }

  async list(filter?: Partial<{ active: boolean; type: CompositionType }>): Promise<readonly Composition[]> {
    let results = [...this.compositions.values()];
    if (filter) {
      if (filter.active !== undefined) {
        results = results.filter(c => c.active === filter.active);
      }
      if (filter.type !== undefined) {
        results = results.filter(c => c.type === filter.type);
      }
    }
    return Object.freeze(results);
  }

  async count(): Promise<number> {
    return this.compositions.size;
  }


  private async publishEvent(event: Record<string, unknown>, aggregateId: string, aggregateType: string): Promise<void> {
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
