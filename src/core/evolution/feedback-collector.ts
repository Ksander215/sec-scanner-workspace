/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #9
 * FeedbackCollector: Collects feedback from User, Developer, Logs, Metrics, AI, etc.
 * TASK-AIS-008A.000
 */

import type { Timestamp } from '../types/common.js';
import { EventClassification } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { IFeedbackCollector, FeedbackCollectionParams } from './contracts.js';
import type {
  FeedbackId, FeedbackEntry, FeedbackSource, FeedbackSentiment,
  FeedbackCollectorConfig,
} from './types.js';
import { brandFeedbackId } from './types.js';
import type { FeedbackReceivedEvent, FeedbackProcessedEvent } from './events.js';
import { FeedbackNotFoundError, FeedbackLimitExceededError } from './errors.js';

const INSIGHT_KEYWORDS: readonly string[] = Object.freeze([
  'slow', 'error', 'confusing', 'broken', 'crash', 'bug', 'timeout',
  'frustrating', 'unclear', 'missing', 'wrong', 'fail', 'lag',
  'complex', 'difficult', 'unresponsive', 'inconsistent',
]);

export class FeedbackCollector implements IFeedbackCollector {
  private readonly config: FeedbackCollectorConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly feedback = new Map<string, FeedbackEntry>();

  constructor(config: FeedbackCollectorConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async collect(params: FeedbackCollectionParams): Promise<FeedbackEntry> {
    if (this.feedback.size >= this.config.maxFeedback) {
      throw new FeedbackLimitExceededError(this.config.maxFeedback);
    }

    const now: Timestamp = new Date().toISOString();
    const id = brandFeedbackId(crypto.randomUUID());

    const entry: FeedbackEntry = Object.freeze({
      id,
      source: params.source,
      sentiment: params.sentiment,
      content: params.content,
      relatedBottleneckId: params.relatedBottleneckId,
      relatedImprovementId: params.relatedImprovementId,
      receivedAt: now,
      processed: false,
      processedAt: null,
      extractedInsights: Object.freeze([]),
      metadata: Object.freeze({ ...params.metadata }),
    });

    this.feedback.set(id as string, entry);

    const event = Object.freeze({
      eventType: 'evolution.feedback.received',
      classification: EventClassification.Action,
      feedbackId: id,
      source: params.source,
      sentiment: params.sentiment,
      timestamp: now,
      metadata: Object.freeze({}),
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId: id as string,
      aggregateType: 'FeedbackEntry',
      version: '1.0.0',
    } as FeedbackReceivedEvent & DomainEventBase);

    this.eventBus?.publish(event);

    return entry;
  }

  async process(feedbackId: FeedbackId): Promise<FeedbackEntry> {
    const key = feedbackId as string;
    const existing = this.feedback.get(key);
    if (!existing) throw new FeedbackNotFoundError(key);

    const now: Timestamp = new Date().toISOString();
    const insights = this.extractInsights(existing.content);

    const updated: FeedbackEntry = Object.freeze({
      ...existing,
      processed: true,
      processedAt: now,
      extractedInsights: Object.freeze(insights),
    });

    this.feedback.set(key, updated);

    const event = Object.freeze({
      eventType: 'evolution.feedback.processed',
      classification: EventClassification.Result,
      feedbackId,
      insightCount: insights.length,
      timestamp: now,
      metadata: Object.freeze({}),
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId: key,
      aggregateType: 'FeedbackEntry',
      version: '1.0.0',
    } as FeedbackProcessedEvent & DomainEventBase);

    this.eventBus?.publish(event);

    return updated;
  }

  async getById(id: FeedbackId): Promise<FeedbackEntry | null> {
    return this.feedback.get(id as string) ?? null;
  }

  async list(filter?: Partial<{ source: FeedbackSource; sentiment: FeedbackSentiment; processed: boolean }>): Promise<readonly FeedbackEntry[]> {
    let results = Array.from(this.feedback.values());
    if (filter) {
      if (filter.source !== undefined) results = results.filter(f => f.source === filter.source);
      if (filter.sentiment !== undefined) results = results.filter(f => f.sentiment === filter.sentiment);
      if (filter.processed !== undefined) results = results.filter(f => f.processed === filter.processed);
    }
    return results;
  }

  async count(): Promise<number> {
    return this.feedback.size;
  }

  private extractInsights(content: string): string[] {
    const lower = content.toLowerCase();
    const insights: string[] = [];

    for (const keyword of INSIGHT_KEYWORDS) {
      if (lower.includes(keyword)) {
        insights.push(`Keyword detected: "${keyword}" — potential issue area identified`);
      }
    }

    if (insights.length === 0) {
      insights.push('General feedback recorded — no specific issue keywords detected');
    }

    return insights;
  }
}
