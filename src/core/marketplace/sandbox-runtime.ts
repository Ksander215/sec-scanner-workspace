/**
 * Sandbox Runtime Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { SandboxInstance, SandboxRuntimeConfig } from './types.js';
import { brandSandboxId } from './types.js';
import type { ISandboxRuntime } from './contracts.js';
import { SandboxError, SandboxLimitExceededError } from './errors.js';
import type { SandboxCreatedEvent, SandboxStateChangedEvent, SandboxTerminatedEvent } from './events.js';
import { SandboxLevel, SandboxState } from './types.js';

export class SandboxRuntime implements ISandboxRuntime {
  private readonly config: SandboxRuntimeConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly sandboxes = new Map<string, SandboxInstance>();

  constructor(config: SandboxRuntimeConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async create(installationId: import('./types.js').InstallationId, capId: import('./types.js').CapabilityId, level?: SandboxLevel): Promise<SandboxInstance> {
    if (this.sandboxes.size >= this.config.maxInstances) {
      throw new SandboxLimitExceededError(this.config.maxInstances);
    }
    const now: Timestamp = new Date().toISOString();
    const id = brandSandboxId(crypto.randomUUID());
    const resolvedLevel = level ?? this.config.defaultLevel;
    const instance: SandboxInstance = Object.freeze({
      id,
      installationId,
      capabilityId: capId,
      level: resolvedLevel,
      state: SandboxState.Created,
      allowedPermissions: Object.freeze([]),
      resourceLimits: this.config.defaultResourceLimits,
      createdAt: now,
      terminatedAt: null,
      metadata: Object.freeze({}),
    });
    this.sandboxes.set(id as string, instance);
    const event: SandboxCreatedEvent = Object.freeze({
      eventType: 'marketplace.sandbox.created',
      classification: EventClassification.Info,
      sandboxId: id,
      installationId,
      capabilityId: capId,
      level: resolvedLevel,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, id as string, 'SandboxInstance');
    return instance;
  }

  private async transitionState(sandboxId: import('./types.js').SandboxId, toState: SandboxState): Promise<void> {
    const key = sandboxId as string;
    const existing = this.sandboxes.get(key);
    if (!existing) throw new SandboxError('Sandbox not found');
    const fromState = existing.state;
    const updated: SandboxInstance = Object.freeze({ ...existing, state: toState });
    this.sandboxes.set(key, updated);
    const now: Timestamp = new Date().toISOString();
    const event: SandboxStateChangedEvent = Object.freeze({
      eventType: 'marketplace.sandbox.stateChanged',
      classification: EventClassification.StateChange,
      sandboxId,
      fromState,
      toState,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, key, 'SandboxInstance');
  }

  async start(sandboxId: import('./types.js').SandboxId): Promise<void> {
    await this.transitionState(sandboxId, SandboxState.Running);
  }

  async pause(sandboxId: import('./types.js').SandboxId): Promise<void> {
    await this.transitionState(sandboxId, SandboxState.Paused);
  }

  async stop(sandboxId: import('./types.js').SandboxId): Promise<void> {
    await this.transitionState(sandboxId, SandboxState.Stopped);
  }

  async terminate(sandboxId: import('./types.js').SandboxId, reason?: string): Promise<void> {
    const key = sandboxId as string;
    const existing = this.sandboxes.get(key);
    if (!existing) throw new SandboxError('Sandbox not found');
    const now: Timestamp = new Date().toISOString();
    const terminated: SandboxInstance = Object.freeze({
      ...existing,
      state: SandboxState.Terminated,
      terminatedAt: now,
    });
    this.sandboxes.set(key, terminated);
    const event: SandboxTerminatedEvent = Object.freeze({
      eventType: 'marketplace.sandbox.terminated',
      classification: EventClassification.StateChange,
      sandboxId,
      reason: reason ?? 'No reason provided',
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, key, 'SandboxInstance');
  }

  async getById(id: import('./types.js').SandboxId): Promise<SandboxInstance | null> {
    return this.sandboxes.get(id as string) ?? null;
  }

  async getByInstallationId(installationId: import('./types.js').InstallationId): Promise<SandboxInstance | null> {
    for (const sb of this.sandboxes.values()) {
      if (sb.installationId === installationId) return sb;
    }
    return null;
  }

  async list(filter?: Partial<{ state: SandboxState }>): Promise<readonly SandboxInstance[]> {
    let results = [...this.sandboxes.values()];
    if (filter?.state !== undefined) {
      results = results.filter(s => s.state === filter.state);
    }
    return Object.freeze(results);
  }

  async count(): Promise<number> {
    return this.sandboxes.size;
  }


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
