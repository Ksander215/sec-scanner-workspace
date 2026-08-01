/**
 * AIS Companion — Marketplace Center
 * TASK-AIS-011A.000
 */

import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { IMarketplaceCenter } from './contracts.js';
import type { MarketplaceCenterConfig } from './types.js';
import { MarketplaceError } from './errors.js';

interface Listing {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly rating: number;
  readonly version: string;
  readonly author: string;
}

export class MarketplaceCenter implements IMarketplaceCenter {
  private readonly config: MarketplaceCenterConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly listings = new Map<string, Listing>();

  constructor(config: MarketplaceCenterConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  seedListings(items: Array<{ id: string; title: string; description: string; category: string; rating: number; version: string; author: string }>): void {
    for (const l of items) { this.listings.set(l.id, Object.freeze(l)); }
  }

  async browse(sessionId: string, query?: string, category?: string): Promise<ReadonlyArray<{ id: string; title: string; description: string; category: string; rating: number }>> {
    let results = [...this.listings.values()];
    if (query) { const q = query.toLowerCase(); results = results.filter(l => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)); }
    if (category) { results = results.filter(l => l.category === category); }
    const sliced = results.slice(0, this.config.maxBrowseResults);
    const sid = sessionId;
    await this.publishEvent({
      eventType: 'companion.marketplace.browsed', classification: 'Action' as const,
      sessionId: sid, query: query ?? '', resultCount: sliced.length,
      timestamp: new Date().toISOString(), metadata: Object.freeze({}),
    }, sid, 'MarketplaceCenter');
    return sliced.map(l => ({ id: l.id, title: l.title, description: l.description, category: l.category, rating: l.rating }));
  }

  async getDetails(_sessionId: string, listingId: string): Promise<{ id: string; title: string; description: string; version: string; author: string } | null> {
    const l = this.listings.get(listingId);
    if (!l) return null;
    return { id: l.id, title: l.title, description: l.description, version: l.version, author: l.author };
  }

  async install(sessionId: string, listingId: string): Promise<{ instanceId: string; listingId: string }> {
    const l = this.listings.get(listingId);
    if (!l) throw new MarketplaceError(listingId, 'Listing not found');
    const instanceId = `inst-${crypto.randomUUID()}`;
    await this.publishEvent({
      eventType: 'companion.marketplace.installed', classification: 'Result' as const,
      sessionId, listingId, listingTitle: l.title,
      timestamp: new Date().toISOString(), metadata: Object.freeze({}),
    }, sessionId, 'MarketplaceCenter');
    return { instanceId, listingId };
  }

  private async publishEvent(event: Record<string, unknown>, aggregateId: string, aggregateType: string): Promise<void> {
    const full = Object.freeze({ ...event, eventId: crypto.randomUUID(), sequence: 0, aggregateId, aggregateType, version: '1.0.0' });
    if (this.eventBus) await this.eventBus.publish(full as DomainEventBase);
  }
}
