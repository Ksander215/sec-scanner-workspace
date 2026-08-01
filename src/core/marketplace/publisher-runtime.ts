/**
 * Publisher Runtime Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { Publisher, PublisherRuntimeConfig } from './types.js';
import { brandPublisherId } from './types.js';
import type { IPublisherRuntime, PublisherRegistrationParams } from './contracts.js';
import { PublisherNotFoundError, PublisherLimitExceededError } from './errors.js';
import type { PublisherRegisteredEvent, PublisherStatusChangedEvent } from './events.js';
import { PublisherStatus } from './types.js';

export class PublisherRuntime implements IPublisherRuntime {
  private readonly config: PublisherRuntimeConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly publishers = new Map<string, Publisher>();

  constructor(config: PublisherRuntimeConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async register(params: PublisherRegistrationParams): Promise<Publisher> {
    if (this.publishers.size >= this.config.maxPublishers) {
      throw new PublisherLimitExceededError(this.config.maxPublishers);
    }
    const now: Timestamp = new Date().toISOString();
    const id = brandPublisherId(crypto.randomUUID());
    const publisher: Publisher = Object.freeze({
      id,
      name: params.name,
      description: params.description,
      status: PublisherStatus.Unverified,
      publicKey: params.publicKey,
      capabilities: Object.freeze([]),
      totalDownloads: 0,
      averageRating: 0,
      createdAt: now,
      metadata: Object.freeze({ ...params.metadata }),
    });
    this.publishers.set(id as string, publisher);
    const event: PublisherRegisteredEvent = Object.freeze({
      eventType: 'marketplace.publisher.registered',
      classification: EventClassification.Info,
      publisherId: id,
      name: params.name,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, id as string, 'Publisher');
    return publisher;
  }

  async updateStatus(publisherId: import('./types.js').PublisherId, status: PublisherStatus): Promise<void> {
    const key = publisherId as string;
    const existing = this.publishers.get(key);
    if (!existing) {
      throw new PublisherNotFoundError(key);
    }
    const now: Timestamp = new Date().toISOString();
    const updated: Publisher = Object.freeze({ ...existing, status });
    this.publishers.set(key, updated);
    const event: PublisherStatusChangedEvent = Object.freeze({
      eventType: 'marketplace.publisher.statusChanged',
      classification: EventClassification.StateChange,
      publisherId,
      fromStatus: existing.status,
      toStatus: status,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, key, 'Publisher');
  }

  async getById(id: import('./types.js').PublisherId): Promise<Publisher | null> {
    return this.publishers.get(id as string) ?? null;
  }

  async list(filter?: Partial<{ status: PublisherStatus }>): Promise<readonly Publisher[]> {
    let results = [...this.publishers.values()];
    if (filter?.status !== undefined) {
      results = results.filter(p => p.status === filter.status);
    }
    return Object.freeze(results);
  }

  async count(): Promise<number> {
    return this.publishers.size;
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
