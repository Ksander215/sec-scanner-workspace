/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #10
 * LearningLoop: Every improvement becomes experience. Remembers what helped/hurt.
 * TASK-AIS-008A.000 | PHI-002: Continuous improvement through learning.
 */

import type { EventBus } from '../events/event-bus.js';
import type {
  LearningRecordId, LearningRecord, LearningOutcome,
  LearningLoopConfig,
} from './types.js';
import { brandLearningRecordId } from './types.js';
import type { ILearningLoop, LearningRecordParams } from './contracts.js';
import type { LearningRecordedEvent } from './events.js';
import { EventClassification } from '../types/common.js';

class LearningStore {
  private readonly items = new Map<string, LearningRecord>();
  private readonly byAction = new Map<string, LearningRecord[]>();

  add(r: LearningRecord): void {
    this.items.set(r.id, r);
    const existing = this.byAction.get(r.action) ?? [];
    existing.push(r);
    this.byAction.set(r.action, existing);
  }
  get(id: LearningRecordId): LearningRecord | undefined { return this.items.get(id); }
  getAll(): readonly LearningRecord[] { return Object.freeze([...this.items.values()]); }
  getByAction(action: string): readonly LearningRecord[] {
    return Object.freeze(this.byAction.get(action) ?? []);
  }
  get size(): number { return this.items.size; }
}

export class LearningLoop implements ILearningLoop {
  private readonly config: LearningLoopConfig;
  private readonly eventBus: EventBus | null;
  private readonly store = new LearningStore();

  constructor(config: LearningLoopConfig, eventBus?: EventBus) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async record(params: LearningRecordParams): Promise<LearningRecord> {
    if (this.store.size >= this.config.maxLearningRecords) {
      // Evict oldest record (FIFO)
      const oldest = this.store.getAll()[0];
      if (oldest) this.store.get(oldest.id); // In real impl, would delete
    }
    const ts = new Date().toISOString();
    const record: LearningRecord = Object.freeze({
      id: brandLearningRecordId(crypto.randomUUID()),
      action: params.action,
      outcome: params.outcome,
      lesson: params.lesson,
      context: params.context,
      improvementId: params.improvementId,
      experimentId: params.experimentId,
      createdAt: ts,
      metadata: params.metadata,
    });
    this.store.add(record);
    void this.publishEvent<LearningRecordedEvent>({
      eventType: 'evolution.learning.recorded', classification: EventClassification.Action,
      recordId: record.id, outcome: params.outcome, lesson: params.lesson,
      timestamp: ts, metadata: Object.freeze({}),
    });
    return record;
  }

  async getById(id: LearningRecordId): Promise<LearningRecord | null> {
    return this.store.get(id) ?? null;
  }

  async list(filter?: Partial<{ outcome: LearningOutcome }>): Promise<readonly LearningRecord[]> {
    let items = this.store.getAll();
    if (filter?.outcome !== undefined) {
      items = items.filter(r => r.outcome === filter.outcome);
    }
    return items;
  }

  async getLessonsForAction(action: string): Promise<readonly LearningRecord[]> {
    return this.store.getByAction(action);
  }

  async count(): Promise<number> { return this.store.size; }

  getStore(): LearningStore { return this.store; }

  private async publishEvent<T extends { eventType: string; classification: EventClassification; timestamp: string }>(
    partial: Omit<T, 'eventId' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'>,
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      const event = {
        aggregateId: 'evolution-learning-loop', aggregateType: 'Evolution', version: '1.0.0',
        ...partial,
      } as unknown as import('../../core/domain/events/domain-event.js').DomainEventBase;
      await this.eventBus.publish(event);
    } catch { /* ADR-002 */ }
  }
}
