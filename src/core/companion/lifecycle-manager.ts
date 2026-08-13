/**
 * AIS Companion — Lifecycle Manager
 * TASK-AIS-011A.000
 */

import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { ILifecycleManager } from './contracts.js';
import type { LifecycleManagerConfig } from './types.js';
import { CompanionState } from './types.js';
import { StateTransitionError } from './errors.js';

const VALID_TRANSITIONS: Record<string, ReadonlySet<CompanionState>> = {
  [CompanionState.Uninitialized]: new Set([CompanionState.Initializing]),
  [CompanionState.Initializing]: new Set([CompanionState.Active, CompanionState.Error]),
  [CompanionState.Active]: new Set([CompanionState.Paused, CompanionState.ShuttingDown, CompanionState.Error]),
  [CompanionState.Paused]: new Set([CompanionState.Active, CompanionState.ShuttingDown]),
  [CompanionState.ShuttingDown]: new Set([CompanionState.Shutdown, CompanionState.Error]),
  [CompanionState.Shutdown]: new Set(),
  [CompanionState.Error]: new Set([CompanionState.Initializing, CompanionState.Shutdown]),
};

interface TransitionRecord {
  readonly from: CompanionState;
  readonly to: CompanionState;
  readonly timestamp: Timestamp;
}

export class LifecycleManager implements ILifecycleManager {
  private readonly eventBus: InProcessEventBus | null;
  private currentState: CompanionState = CompanionState.Uninitialized;
  private readonly history: TransitionRecord[] = [];

  constructor(_config: LifecycleManagerConfig, eventBus?: InProcessEventBus | null) {
    this.eventBus = eventBus ?? null;
  }

  getCurrentState(): CompanionState {
    return this.currentState;
  }

  async transition(from: CompanionState, to: CompanionState, reason?: string): Promise<void> {
    if (from !== this.currentState) {
      throw new StateTransitionError(from, to, `Current state is ${this.currentState}`);
    }
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed || !allowed.has(to)) {
      throw new StateTransitionError(from, to, reason);
    }
    const now: Timestamp = new Date().toISOString();
    const record: TransitionRecord = Object.freeze({ from, to, timestamp: now });
    this.history.push(record);
    this.currentState = to;
    await this.publishEvent({
      eventType: 'companion.state.transition',
      classification: 'StateChange' as const,
      fromState: from, toState: to,
      timestamp: now, metadata: Object.freeze({ reason: reason ?? '' }),
    }, 'lifecycle', 'LifecycleManager');
  }

  async reset(): Promise<void> {
    this.currentState = CompanionState.Uninitialized;
    this.history.length = 0;
  }

  getHistory(): ReadonlyArray<{ from: CompanionState; to: CompanionState; timestamp: string }> {
    return this.history;
  }

  private async publishEvent(
    event: Record<string, unknown>,
    aggregateId: string,
    aggregateType: string,
  ): Promise<void> {
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
