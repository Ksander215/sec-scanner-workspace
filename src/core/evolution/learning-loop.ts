/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #10
 * LearningLoop: Every improvement becomes experience. Remembers what helped/hurt.
 * TASK-AIS-008A.000 | PHI-002: Continuous improvement through learning.
 */

import type { Timestamp } from '../types/common.js';
import { EventClassification } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { ILearningLoop, LearningRecordParams } from './contracts.js';
import type {
  LearningRecordId, LearningRecord, LearningOutcome, LearningLoopConfig,
} from './types.js';
import { brandLearningRecordId } from './types.js';
import type { LearningRecordedEvent } from './events.js';

export class LearningLoop implements ILearningLoop {
  private readonly config: LearningLoopConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly records = new Map<string, LearningRecord>();

  constructor(config: LearningLoopConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async record(params: LearningRecordParams): Promise<LearningRecord> {
    if (this.records.size >= this.config.maxLearningRecords) {
      // Evict oldest record (first key)
      const firstKey = this.records.keys().next().value;
      if (firstKey !== undefined) {
        this.records.delete(firstKey);
      }
    }

    const now: Timestamp = new Date().toISOString();
    const id = brandLearningRecordId(crypto.randomUUID());

    const record: LearningRecord = Object.freeze({
      id,
      improvementId: params.improvementId,
      experimentId: params.experimentId,
      action: params.action,
      outcome: params.outcome,
      lesson: params.lesson,
      context: params.context,
      createdAt: now,
      metadata: Object.freeze({ ...params.metadata }),
    });

    this.records.set(id as string, record);

    const event = Object.freeze({
      eventType: 'evolution.learning.recorded',
      classification: EventClassification.Action,
      recordId: id,
      outcome: params.outcome,
      lesson: params.lesson,
      timestamp: now,
      metadata: Object.freeze({}),
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId: id as string,
      aggregateType: 'LearningRecord',
      version: '1.0.0',
    } as LearningRecordedEvent & DomainEventBase);

    this.eventBus?.publish(event);

    return record;
  }

  async getById(id: LearningRecordId): Promise<LearningRecord | null> {
    return this.records.get(id as string) ?? null;
  }

  async list(filter?: Partial<{ outcome: LearningOutcome }>): Promise<readonly LearningRecord[]> {
    let results = Array.from(this.records.values());
    if (filter?.outcome !== undefined) {
      results = results.filter(r => r.outcome === filter.outcome);
    }
    return results;
  }

  async getLessonsForAction(action: string): Promise<readonly LearningRecord[]> {
    const lower = action.toLowerCase();
    return Array.from(this.records.values()).filter(r => r.action.toLowerCase().includes(lower));
  }

  async count(): Promise<number> {
    return this.records.size;
  }
}
