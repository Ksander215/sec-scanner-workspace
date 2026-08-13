/**
 * AIS Companion — AI Control Center
 * TASK-AIS-011A.000
 */

import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { IAIControlCenter } from './contracts.js';
import type { AIControlCenterConfig } from './types.js';
import { AIControlError } from './errors.js';

interface LevelChange {
  readonly from: string;
  readonly to: string;
  readonly timestamp: Timestamp;
}

export class AIControlCenter implements IAIControlCenter {
  private readonly config: AIControlCenterConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly levels = new Map<string, string>();
  private readonly history = new Map<string, LevelChange[]>();

  constructor(config: AIControlCenterConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async getLevel(sessionId: string): Promise<string> {
    return this.levels.get(sessionId) ?? this.config.defaultAutonomy;
  }

  async setLevel(sessionId: string, level: string): Promise<string> {
    if (!this.config.autonomyLevels.includes(level)) {
      throw new AIControlError(level, `Invalid autonomy level. Valid: ${this.config.autonomyLevels.join(', ')}`);
    }
    const from = this.levels.get(sessionId) ?? this.config.defaultAutonomy;
    this.levels.set(sessionId, level);
    const now: Timestamp = new Date().toISOString();
    const record: LevelChange = Object.freeze({ from, to: level, timestamp: now });
    const hist = this.history.get(sessionId) ?? [];
    hist.push(record);
    this.history.set(sessionId, hist);
    await this.publishEvent({
      eventType: 'companion.aicontrol.changed', classification: 'StateChange' as const,
      sessionId, fromLevel: from, toLevel: level,
      timestamp: now, metadata: Object.freeze({}),
    }, sessionId, 'AIControlCenter');
    return level;
  }

  async getHistory(sessionId: string): Promise<ReadonlyArray<{ from: string; to: string; timestamp: string }>> {
    return Object.freeze([...(this.history.get(sessionId) ?? [])]);
  }

  private async publishEvent(event: Record<string, unknown>, aggregateId: string, aggregateType: string): Promise<void> {
    const full = Object.freeze({ ...event, eventId: crypto.randomUUID(), sequence: 0, aggregateId, aggregateType, version: '1.0.0' });
    if (this.eventBus) await this.eventBus.publish(full as DomainEventBase);
  }
}
