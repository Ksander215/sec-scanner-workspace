/**
 * Universal AI Provider Runtime — Model Registry
 * TASK-AIS-006A.000
 */

import type { IModelRegistry } from './contracts.js';
import type {
  ModelId, ModelDescriptor, ModelFilter, ModelRegistryConfig, ProviderId,
} from './types.js';
import {
  ModelAlreadyRegisteredError,
  ModelNotFoundError,
} from './errors.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { ModelRegisteredEvent, ModelUnregisteredEvent, ModelAvailabilityChangedEvent } from './events.js';

export class ModelRegistry implements IModelRegistry {
  private readonly config: ModelRegistryConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly models = new Map<string, ModelDescriptor>();
  private defaultModelId: ModelId | null = null;

  constructor(config: ModelRegistryConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  private publish(event: DomainEventBase): void {
    if (this.eventBus) {
      void this.eventBus.publish(event);
    }
  }

  async register(descriptor: ModelDescriptor): Promise<void> {
    const id = descriptor.id as string;
    if (this.models.has(id)) {
      throw new ModelAlreadyRegisteredError(id);
    }
    const providerModels = this.countByProvider(descriptor.providerId as string);
    if (providerModels >= this.config.maxModelsPerProvider) {
      throw new ModelAlreadyRegisteredError(id);
    }
    this.models.set(id, descriptor);

    this.publish(Object.freeze({
      eventType: 'model.registered',
      classification: EventClassification.Action,
      modelId: descriptor.id,
      modelName: descriptor.name,
      providerId: descriptor.providerId,
      timestamp: new Date().toISOString(),
      metadata: { ...descriptor.metadata },
      eventId: crypto.randomUUID(), sequence: 0,
      aggregateId: id, aggregateType: 'Model', version: '1.0.0',
    } as ModelRegisteredEvent & DomainEventBase));
  }

  async unregister(modelId: ModelId): Promise<void> {
    const id = modelId as string;
    if (!this.models.has(id)) {
      throw new ModelNotFoundError(id);
    }
    this.models.delete(id);
    if (this.defaultModelId === modelId) {
      this.defaultModelId = null;
    }
    this.publish(Object.freeze({
      eventType: 'model.unregistered',
      classification: EventClassification.Action,
      modelId,
      timestamp: new Date().toISOString(),
      metadata: {},
      eventId: crypto.randomUUID(), sequence: 0,
      aggregateId: id, aggregateType: 'Model', version: '1.0.0',
    } as ModelUnregisteredEvent & DomainEventBase));
  }

  async get(modelId: ModelId): Promise<ModelDescriptor | null> {
    return this.models.get(modelId as string) ?? null;
  }

  async getByName(name: string): Promise<ModelDescriptor | null> {
    for (const m of this.models.values()) {
      if (m.name === name) return m;
    }
    return null;
  }

  async list(filter?: ModelFilter): Promise<readonly ModelDescriptor[]> {
    let results = Array.from(this.models.values());
    if (filter) {
      if (filter.providerId) results = results.filter(m => m.providerId === filter.providerId);
      if (filter.capability) results = results.filter(m => m.capabilities.includes(filter.capability!));
      if (filter.privacyLevel) results = results.filter(m => m.privacyLevel === filter.privacyLevel);
      if (filter.minTokenLimit !== undefined) results = results.filter(m => m.tokenLimit >= filter.minTokenLimit!);
      if (filter.availableOnly) results = results.filter(m => m.available);
      if (filter.family) results = results.filter(m => m.family === filter.family);
    }
    return results;
  }

  async listByProvider(providerId: ProviderId): Promise<readonly ModelDescriptor[]> {
    return Array.from(this.models.values()).filter(m => m.providerId === providerId);
  }

  async getByCapability(capability: string): Promise<readonly ModelDescriptor[]> {
    return Array.from(this.models.values()).filter(m =>
      m.capabilities.some(c => c === capability),
    );
  }

  async getDefaultModel(): Promise<ModelDescriptor | null> {
    if (!this.defaultModelId) return null;
    return this.models.get(this.defaultModelId as string) ?? null;
  }

  async setDefaultModel(modelId: ModelId): Promise<void> {
    if (!this.models.has(modelId as string)) {
      throw new ModelNotFoundError(modelId as string);
    }
    this.defaultModelId = modelId;
  }

  async setModelAvailability(modelId: ModelId, available: boolean): Promise<void> {
    const id = modelId as string;
    const existing = this.models.get(id);
    if (!existing) {
      throw new ModelNotFoundError(id);
    }
    const updated: ModelDescriptor = Object.freeze({
      ...existing,
      available,
    });
    this.models.set(id, updated);
    this.publish(Object.freeze({
      eventType: 'model.availability-changed',
      classification: EventClassification.StateChange,
      modelId,
      available,
      reason: available ? 'Manually enabled' : 'Manually disabled',
      timestamp: new Date().toISOString(),
      metadata: {},
      eventId: crypto.randomUUID(), sequence: 0,
      aggregateId: id, aggregateType: 'Model', version: '1.0.0',
    } as ModelAvailabilityChangedEvent & DomainEventBase));
  }

  async count(filter?: ModelFilter): Promise<number> {
    const all = filter ? await this.list(filter) : Array.from(this.models.values());
    return all.length;
  }

  private countByProvider(providerId: string): number {
    let count = 0;
    for (const m of this.models.values()) {
      if ((m.providerId as string) === providerId) count++;
    }
    return count;
  }
}
