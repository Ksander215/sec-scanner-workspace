/**
 * Capability Registry Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { CapabilityEntry, CapabilityRegistryConfig } from './types.js';
import { brandCapabilityId } from './types.js';
import type { ICapabilityRegistry, CapabilityRegistrationParams } from './contracts.js';
import { CapabilityNotFoundError, CapabilityLimitExceededError, CapabilityDuplicateError } from './errors.js';
import type { CapabilityRegisteredEvent } from './events.js';
import { PackageStatus } from './types.js';

export class CapabilityRegistry implements ICapabilityRegistry {
  private readonly config: CapabilityRegistryConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly capabilities = new Map<string, CapabilityEntry>();
  private readonly nameIndex = new Map<string, string>();

  constructor(config: CapabilityRegistryConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async register(params: CapabilityRegistrationParams): Promise<CapabilityEntry> {
    if (this.capabilities.size >= this.config.maxCapabilities) {
      throw new CapabilityLimitExceededError(this.config.maxCapabilities);
    }
    const existing = this.nameIndex.get(params.name);
    if (existing) {
      throw new CapabilityDuplicateError(params.name);
    }
    const now: Timestamp = new Date().toISOString();
    const id = brandCapabilityId(crypto.randomUUID());
    const entry: CapabilityEntry = Object.freeze({
      id,
      name: params.name,
      description: params.description,
      version: params.version,
      publisherId: params.publisherId,
      category: params.category,
      tags: Object.freeze([...params.tags]),
      permissions: Object.freeze([...params.permissions]),
      dependencies: Object.freeze([...params.dependencies]),
      compatibilityRequirements: Object.freeze([...params.compatibilityRequirements]),
      signatureId: null,
      status: PackageStatus.Draft,
      installed: false,
      installCount: 0,
      rating: 0,
      ratingCount: 0,
      createdAt: now,
      updatedAt: now,
      metadata: Object.freeze({ ...params.metadata }),
    });
    this.capabilities.set(id as string, entry);
    this.nameIndex.set(params.name, id as string);
    const event: CapabilityRegisteredEvent = Object.freeze({
      eventType: 'marketplace.capability.registered',
      classification: EventClassification.Info,
      capabilityId: id,
      name: params.name,
      version: params.version,
      publisherId: params.publisherId,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, id as string, 'Capability');
    return entry;
  }

  async updateStatus(id: import('./types.js').CapabilityId, status: PackageStatus): Promise<void> {
    const key = id as string;
    const existing = this.capabilities.get(key);
    if (!existing) {
      throw new CapabilityNotFoundError(key);
    }
    const now: Timestamp = new Date().toISOString();
    const updated: CapabilityEntry = Object.freeze({
      ...existing,
      status,
      updatedAt: now,
    });
    this.capabilities.set(key, updated);
  }

  async getById(id: import('./types.js').CapabilityId): Promise<CapabilityEntry | null> {
    return this.capabilities.get(id as string) ?? null;
  }

  async getByName(name: string): Promise<CapabilityEntry | null> {
    const key = this.nameIndex.get(name);
    if (!key) return null;
    return this.capabilities.get(key) ?? null;
  }

  async list(filter?: Partial<{ status: PackageStatus; category: string; publisherId: import('./types.js').PublisherId; installed: boolean }>): Promise<readonly CapabilityEntry[]> {
    let results = [...this.capabilities.values()];
    if (filter) {
      if (filter.status !== undefined) {
        results = results.filter(e => e.status === filter.status);
      }
      if (filter.category !== undefined) {
        results = results.filter(e => e.category === filter.category);
      }
      if (filter.publisherId !== undefined) {
        results = results.filter(e => e.publisherId === filter.publisherId);
      }
      if (filter.installed !== undefined) {
        results = results.filter(e => e.installed === filter.installed);
      }
    }
    return Object.freeze(results);
  }

  async remove(id: import('./types.js').CapabilityId): Promise<void> {
    const key = id as string;
    const entry = this.capabilities.get(key);
    if (!entry) {
      throw new CapabilityNotFoundError(key);
    }
    this.capabilities.delete(key);
    this.nameIndex.delete(entry.name);
  }

  async count(): Promise<number> {
    return this.capabilities.size;
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
