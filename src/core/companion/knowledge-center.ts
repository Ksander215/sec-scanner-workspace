/**
 * AIS Companion — Knowledge Center
 * TASK-AIS-011A.000
 */

import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { IKnowledgeCenter } from './contracts.js';
import type { KnowledgeCenterConfig } from './types.js';
import { KnowledgeError } from './errors.js';

interface KnowledgeEntry {
  readonly id: string;
  readonly sessionId: string;
  readonly category: string;
  readonly title: string;
  readonly content: string;
  readonly createdAt: Timestamp;
}

export class KnowledgeCenter implements IKnowledgeCenter {
  private readonly config: KnowledgeCenterConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly entries = new Map<string, KnowledgeEntry>();

  constructor(config: KnowledgeCenterConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async add(sessionId: string, category: string, title: string, content: string): Promise<{ id: string; category: string; title: string; createdAt: string }> {
    const count = await this.count(sessionId);
    if (count >= this.config.maxKnowledgeEntries) {
      throw new KnowledgeError(sessionId, `Limit exceeded: ${count}/${this.config.maxKnowledgeEntries}`);
    }
    const now: Timestamp = new Date().toISOString();
    const id = `ke-${crypto.randomUUID()}`;
    const entry: KnowledgeEntry = Object.freeze({ id, sessionId, category, title, content, createdAt: now });
    this.entries.set(id, entry);
    await this.publishEvent({
      eventType: 'companion.knowledge.entryAdded', classification: 'Result' as const,
      entryId: id, sessionId, category,
      timestamp: now, metadata: Object.freeze({}),
    }, id, 'KnowledgeEntry');
    return { id, category, title, createdAt: now };
  }

  async get(sessionId: string, entryId: string): Promise<{ id: string; category: string; title: string; content: string; createdAt: string } | null> {
    const e = this.entries.get(entryId);
    if (!e || e.sessionId !== sessionId) return null;
    return { id: e.id, category: e.category, title: e.title, content: e.content, createdAt: e.createdAt };
  }

  async list(sessionId: string, category?: string): Promise<ReadonlyArray<{ id: string; category: string; title: string; createdAt: string }>> {
    let results = [...this.entries.values()].filter(e => e.sessionId === sessionId);
    if (category) results = results.filter(e => e.category === category);
    return results.map(e => ({ id: e.id, category: e.category, title: e.title, createdAt: e.createdAt }));
  }

  async remove(sessionId: string, entryId: string): Promise<void> {
    const e = this.entries.get(entryId);
    if (!e || e.sessionId !== sessionId) throw new KnowledgeError(entryId, 'Not found');
    this.entries.delete(entryId);
  }

  async search(sessionId: string, query: string): Promise<ReadonlyArray<{ id: string; title: string; category: string }>> {
    const q = query.toLowerCase();
    return [...this.entries.values()]
      .filter(e => e.sessionId === sessionId && (e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q)))
      .map(e => ({ id: e.id, title: e.title, category: e.category }));
  }

  async count(sessionId: string): Promise<number> {
    return [...this.entries.values()].filter(e => e.sessionId === sessionId).length;
  }

  private async publishEvent(event: Record<string, unknown>, aggregateId: string, aggregateType: string): Promise<void> {
    const full = Object.freeze({ ...event, eventId: crypto.randomUUID(), sequence: 0, aggregateId, aggregateType, version: '1.0.0' });
    if (this.eventBus) await this.eventBus.publish(full as DomainEventBase);
  }
}
