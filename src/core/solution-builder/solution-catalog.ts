/**
 * Solution Catalog Implementation
 * TASK-AIS-010A.000 — Solution Builder Runtime
 *
 * Manages a catalog of solution entries with search, filtering,
 * and lifecycle integration. Emits SolutionCatalogAddedEvent and
 * SolutionCatalogRemovedEvent.
 */
import type { Timestamp, SemVer } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type {
  SolutionId, CatalogEntryId, SolutionCatalogEntry,
  SolutionState, BusinessDomain,
} from './types.js';
import { brandCatalogEntryId, SolutionState as SState } from './types.js';
import type { ISolutionCatalog } from './contracts.js';
import type { SolutionCatalogConfig } from './types.js';
import { CatalogLimitExceededError, SolutionNotFoundError } from './errors.js';
import type { SolutionCatalogAddedEvent, SolutionCatalogRemovedEvent } from './events.js';

export class SolutionCatalog implements ISolutionCatalog {
  private readonly config: SolutionCatalogConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly entries = new Map<string, SolutionCatalogEntry>();
  private readonly solutionIndex = new Map<string, CatalogEntryId>();

  constructor(config: SolutionCatalogConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async add(
    solutionId: SolutionId,
    name: string,
    description: string,
    version: SemVer,
    category: string,
    businessDomain: BusinessDomain,
  ): Promise<SolutionCatalogEntry> {
    if (this.entries.size >= this.config.maxEntries) {
      throw new CatalogLimitExceededError(this.config.maxEntries);
    }

    const now: Timestamp = new Date().toISOString();
    const entryId = brandCatalogEntryId(crypto.randomUUID());

    const entry: SolutionCatalogEntry = Object.freeze({
      id: entryId,
      solutionId,
      name,
      description,
      version,
      category,
      state: SState.Draft,
      businessDomain,
      createdAt: now,
      updatedAt: now,
      metadata: Object.freeze({}),
    });

    const key = entryId as string;
    this.entries.set(key, entry);
    this.solutionIndex.set(solutionId as string, entryId);

    const event: SolutionCatalogAddedEvent = Object.freeze({
      eventType: 'solution.catalog.added',
      classification: EventClassification.Info,
      entryId,
      solutionId,
      name,
      timestamp: now,
      metadata: Object.freeze({}),
    });

    await this.publishEvent(event as unknown as Record<string, unknown>, solutionId as string, 'SolutionCatalogEntry');

    return entry;
  }

  async remove(entryId: CatalogEntryId): Promise<void> {
    const key = entryId as string;
    const entry = this.entries.get(key);

    if (!entry) {
      throw new SolutionNotFoundError(`CatalogEntry:${key}`);
    }

    this.entries.delete(key);
    this.solutionIndex.delete(entry.solutionId as string);

    const now: Timestamp = new Date().toISOString();

    const event: SolutionCatalogRemovedEvent = Object.freeze({
      eventType: 'solution.catalog.removed',
      classification: EventClassification.Info,
      entryId,
      solutionId: entry.solutionId,
      timestamp: now,
      metadata: Object.freeze({}),
    });

    await this.publishEvent(event as unknown as Record<string, unknown>, entry.solutionId as string, 'SolutionCatalogEntry');
  }

  async getById(id: CatalogEntryId): Promise<SolutionCatalogEntry | null> {
    return this.entries.get(id as string) ?? null;
  }

  async getBySolutionId(solutionId: SolutionId): Promise<SolutionCatalogEntry | null> {
    const entryId = this.solutionIndex.get(solutionId as string);
    if (!entryId) return null;
    return this.entries.get(entryId as string) ?? null;
  }

  async search(query: string): Promise<readonly SolutionCatalogEntry[]> {
    const lower = query.toLowerCase();
    return Object.freeze(
      [...this.entries.values()].filter(
        e =>
          e.name.toLowerCase().includes(lower) ||
          e.description.toLowerCase().includes(lower),
      ),
    );
  }

  async list(
    filter?: Partial<{ state: SolutionState; category: string; businessDomain: BusinessDomain }>,
  ): Promise<readonly SolutionCatalogEntry[]> {
    let results = [...this.entries.values()];

    if (filter?.state !== undefined) {
      results = results.filter(e => e.state === filter.state);
    }
    if (filter?.category !== undefined) {
      results = results.filter(e => e.category === filter.category);
    }
    if (filter?.businessDomain !== undefined) {
      results = results.filter(e => e.businessDomain === filter.businessDomain);
    }

    return Object.freeze(results);
  }

  async count(): Promise<number> {
    return this.entries.size;
  }

  // ─── Event Publishing ──────────────────────────────────────────────

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
