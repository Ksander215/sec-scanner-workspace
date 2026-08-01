/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #9
 * FeedbackCollector: Collects feedback from User, Developer, Logs, Metrics, AI, etc.
 * TASK-AIS-008A.000
 */

import type { EventBus } from '../events/event-bus.js';
import type {
  FeedbackId, FeedbackEntry, FeedbackSource, FeedbackSentiment,
  FeedbackCollectorConfig,
} from './types.js';
import { brandFeedbackId } from './types.js';
import type { IFeedbackCollector, FeedbackCollectionParams } from './contracts.js';
import { FeedbackNotFoundError, FeedbackLimitExceededError } from './errors.js';
import type { FeedbackReceivedEvent, FeedbackProcessedEvent } from './events.js';
import { EventClassification } from '../types/common.js';

class FeedbackStore {
  private readonly items = new Map<string, FeedbackEntry>();
  add(f: FeedbackEntry): void { this.items.set(f.id, f); }
  get(id: FeedbackId): FeedbackEntry | undefined { return this.items.get(id); }
  getAll(): readonly FeedbackEntry[] { return Object.freeze([...this.items.values()]); }
  update(id: FeedbackId, f: FeedbackEntry): void { this.items.set(id, f); }
  get size(): number { return this.items.size; }
}

const INSIGHT_PATTERNS: Partial<Record<FeedbackSentiment, readonly string[]>> = {
  Negative: ['Potential bottleneck', 'Quality concern', 'UX friction detected'] as const,
  Positive: ['Working well', 'Value confirmed', 'User satisfied'] as const,
  Critical: ['Critical issue', 'Immediate action needed', 'Value destruction detected'] as const,
  Neutral: ['Observation', 'Data point recorded', 'Monitoring recommended'] as const,
};

export class FeedbackCollector implements IFeedbackCollector {
  private readonly config: FeedbackCollectorConfig;
  private readonly eventBus: EventBus | null;
  private readonly store = new FeedbackStore();

  constructor(config: FeedbackCollectorConfig, eventBus?: EventBus) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async collect(params: FeedbackCollectionParams): Promise<FeedbackEntry> {
    if (this.store.size >= this.config.maxFeedback) {
      throw new FeedbackLimitExceededError(this.config.maxFeedback);
    }
    const ts = new Date().toISOString();
    const entry: FeedbackEntry = Object.freeze({
      id: brandFeedbackId(crypto.randomUUID()),
      source: params.source,
      sentiment: params.sentiment,
      content: params.content,
      relatedBottleneckId: params.relatedBottleneckId,
      relatedImprovementId: params.relatedImprovementId,
      receivedAt: ts,
      processed: false,
      processedAt: null,
      extractedInsights: Object.freeze([]),
      metadata: params.metadata,
    });
    this.store.add(entry);
    void this.publishEvent<FeedbackReceivedEvent>({
      eventType: 'evolution.feedback.received', classification: EventClassification.Action,
      feedbackId: entry.id, source: params.source, sentiment: params.sentiment,
      timestamp: ts, metadata: Object.freeze({}),
    });
    if (this.config.autoProcessEnabled) {
      return this.process(entry.id);
    }
    return entry;
  }

  async process(feedbackId: FeedbackId): Promise<FeedbackEntry> {
    const existing = this.store.get(feedbackId);
    if (!existing) throw new FeedbackNotFoundError(feedbackId);
    const ts = new Date().toISOString();
    const insights = INSIGHT_PATTERNS[existing.sentiment] ?? ['General feedback recorded'];
    const updated: FeedbackEntry = Object.freeze({
      ...existing,
      processed: true,
      processedAt: ts,
      extractedInsights: Object.freeze(insights),
    });
    this.store.update(feedbackId, updated);
    void this.publishEvent<FeedbackProcessedEvent>({
      eventType: 'evolution.feedback.processed', classification: EventClassification.Result,
      feedbackId, insightCount: insights.length, timestamp: ts, metadata: Object.freeze({}),
    });
    return updated;
  }

  async getById(id: FeedbackId): Promise<FeedbackEntry | null> {
    return this.store.get(id) ?? null;
  }

  async list(filter?: Partial<{ source: FeedbackSource; sentiment: FeedbackSentiment; processed: boolean }>): Promise<readonly FeedbackEntry[]> {
    let items = this.store.getAll();
    if (filter?.source !== undefined) items = items.filter(f => f.source === filter.source);
    if (filter?.sentiment !== undefined) items = items.filter(f => f.sentiment === filter.sentiment);
    if (filter?.processed !== undefined) items = items.filter(f => f.processed === filter.processed);
    return items;
  }

  async count(): Promise<number> { return this.store.size; }

  getStore(): FeedbackStore { return this.store; }

  private async publishEvent<T extends { eventType: string; classification: EventClassification; timestamp: string }>(
    partial: Omit<T, 'eventId' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        aggregateId: 'evolution-feedback-collector', aggregateType: 'Evolution', version: '1.0.0',
        ...partial,
      } as unknown as import('../../core/domain/events/domain-event.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
