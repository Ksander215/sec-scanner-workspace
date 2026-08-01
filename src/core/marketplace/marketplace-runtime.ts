/**
 * Marketplace Runtime Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { CatalogEntry, MarketplaceConfig } from './types.js';
import type { IMarketplaceRuntime, CatalogAddParams } from './contracts.js';
import { CatalogLimitExceededError, CapabilityNotFoundError } from './errors.js';
import type { CatalogEntryAddedEvent } from './events.js';
import { CatalogSource } from './types.js';

export class MarketplaceRuntime implements IMarketplaceRuntime {
  private readonly config: MarketplaceConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly catalog = new Map<string, CatalogEntry>();

  constructor(config: MarketplaceConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async addToCatalog(params: CatalogAddParams): Promise<CatalogEntry> {
    if (this.catalog.size >= this.config.maxCatalogEntries) {
      throw new CatalogLimitExceededError(this.config.maxCatalogEntries);
    }
    const now: Timestamp = new Date().toISOString();
    const entry: CatalogEntry = Object.freeze({
      capabilityId: params.capabilityId,
      name: '',
      description: '',
      version: '0.0.0',
      publisherId: '' as unknown as import('./types.js').PublisherId,
      source: params.source,
      category: '',
      tags: Object.freeze([]),
      rating: 0,
      downloadCount: 0,
      compatible: true,
      featured: params.featured,
      publishedAt: now,
      metadata: Object.freeze({ ...params.metadata }),
    });
    this.catalog.set(params.capabilityId as string, entry);
    const event: CatalogEntryAddedEvent = Object.freeze({
      eventType: 'marketplace.catalog.entryAdded',
      classification: EventClassification.Info,
      capabilityId: params.capabilityId,
      name: entry.name,
      source: params.source,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, params.capabilityId as string, 'CatalogEntry');
    return entry;
  }

  async removeFromCatalog(capId: import('./types.js').CapabilityId): Promise<void> {
    const key = capId as string;
    if (!this.catalog.has(key)) {
      throw new CapabilityNotFoundError(key);
    }
    this.catalog.delete(key);
  }

  async search(query: string, filter?: Partial<{ category: string; source: CatalogSource; compatible: boolean }>): Promise<readonly CatalogEntry[]> {
    const lower = query.toLowerCase();
    let results = [...this.catalog.values()];
    results = results.filter(e =>
      e.name.toLowerCase().includes(lower) ||
      e.description.toLowerCase().includes(lower)
    );
    if (filter) {
      if (filter.category !== undefined) {
        results = results.filter(e => e.category === filter.category);
      }
      if (filter.source !== undefined) {
        results = results.filter(e => e.source === filter.source);
      }
      if (filter.compatible !== undefined) {
        results = results.filter(e => e.compatible === filter.compatible);
      }
    }
    return Object.freeze(results);
  }

  async getFeatured(): Promise<readonly CatalogEntry[]> {
    return Object.freeze([...this.catalog.values()].filter(e => e.featured));
  }

  async getById(capId: import('./types.js').CapabilityId): Promise<CatalogEntry | null> {
    return this.catalog.get(capId as string) ?? null;
  }

  async list(filter?: Partial<{ source: CatalogSource; category: string }>): Promise<readonly CatalogEntry[]> {
    let results = [...this.catalog.values()];
    if (filter) {
      if (filter.source !== undefined) {
        results = results.filter(e => e.source === filter.source);
      }
      if (filter.category !== undefined) {
        results = results.filter(e => e.category === filter.category);
      }
    }
    return Object.freeze(results);
  }

  async count(): Promise<number> {
    return this.catalog.size;
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
