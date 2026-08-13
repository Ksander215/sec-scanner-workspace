/**
 * AIS Companion — Capability Manager
 * TASK-AIS-011A.000
 */

import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { ICapabilityManager } from './contracts.js';
import type { CapabilityManagerConfig } from './types.js';
import { CapabilityError } from './errors.js';

interface CapabilityInstance {
  readonly id: string;
  readonly capabilityId: string;
  readonly sessionId: string;
  readonly label: string;
  readonly installedAt: Timestamp;
}

export class CapabilityManager implements ICapabilityManager {
  private readonly config: CapabilityManagerConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly instances = new Map<string, CapabilityInstance>();

  constructor(config: CapabilityManagerConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async install(sessionId: string, capabilityId: string, label: string): Promise<{ id: string; capabilityId: string; label: string; installedAt: string }> {
    const count = await this.count(sessionId);
    if (count >= this.config.maxManagedCapabilities) {
      throw new CapabilityError(capabilityId, `Limit exceeded: ${count}/${this.config.maxManagedCapabilities}`);
    }
    const now: Timestamp = new Date().toISOString();
    const id = `capinst-${crypto.randomUUID()}`;
    const inst: CapabilityInstance = Object.freeze({ id, capabilityId, sessionId, label, installedAt: now });
    this.instances.set(id, inst);
    await this.publishEvent({
      eventType: 'companion.capability.installed', classification: 'Result' as const,
      capabilityId, sessionId,
      timestamp: now, metadata: Object.freeze({}),
    }, id, 'CapabilityInstance');
    return { id, capabilityId, label, installedAt: now };
  }

  async remove(sessionId: string, instanceId: string): Promise<void> {
    const inst = this.instances.get(instanceId);
    if (!inst || inst.sessionId !== sessionId) throw new CapabilityError(instanceId, 'Not found');
    this.instances.delete(instanceId);
    await this.publishEvent({
      eventType: 'companion.capability.removed', classification: 'StateChange' as const,
      capabilityId: inst.capabilityId, sessionId,
      timestamp: new Date().toISOString(), metadata: Object.freeze({}),
    }, instanceId, 'CapabilityInstance');
  }

  async list(sessionId: string): Promise<ReadonlyArray<{ id: string; capabilityId: string; label: string; installedAt: string }>> {
    return [...this.instances.values()].filter(i => i.sessionId === sessionId).map(i => ({
      id: i.id, capabilityId: i.capabilityId, label: i.label, installedAt: i.installedAt,
    }));
  }

  async get(sessionId: string, instanceId: string): Promise<{ id: string; capabilityId: string; label: string; installedAt: string } | null> {
    const inst = this.instances.get(instanceId);
    if (!inst || inst.sessionId !== sessionId) return null;
    return { id: inst.id, capabilityId: inst.capabilityId, label: inst.label, installedAt: inst.installedAt };
  }

  async count(sessionId: string): Promise<number> {
    return [...this.instances.values()].filter(i => i.sessionId === sessionId).length;
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
