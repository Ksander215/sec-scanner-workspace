/**
 * Installation Engine Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { Installation, InstallationEngineConfig } from './types.js';
import { brandInstallationId } from './types.js';
import type { IInstallationEngine, InstallationParams } from './contracts.js';
import { InstallationNotFoundError, InstallationStateError } from './errors.js';
import type { InstallationStartedEvent, InstallationCompletedEvent, InstallationRemovedEvent } from './events.js';
import { InstallationStatus } from './types.js';

export class InstallationEngine implements IInstallationEngine {
  private readonly eventBus: InProcessEventBus | null;
  private readonly installations = new Map<string, Installation>();

  constructor(_config: InstallationEngineConfig, eventBus?: InProcessEventBus | null) {
    this.eventBus = eventBus ?? null;
  }

  async install(params: InstallationParams): Promise<Installation> {
    const now: Timestamp = new Date().toISOString();
    const id = brandInstallationId(crypto.randomUUID());
    const installing: Installation = Object.freeze({
      id,
      capabilityId: params.capabilityId,
      packageId: params.packageId,
      version: params.version,
      status: InstallationStatus.Installing,
      installedAt: null,
      uninstalledAt: null,
      error: null,
      permissionsGranted: Object.freeze([]),
      sandboxId: null,
      previousVersion: null,
      rollbackVersion: null,
      metadata: Object.freeze({ ...params.metadata }),
    });
    this.installations.set(id as string, installing);
    const startedEvent: InstallationStartedEvent = Object.freeze({
      eventType: 'marketplace.installation.started',
      classification: EventClassification.Info,
      installationId: id,
      capabilityId: params.capabilityId,
      version: params.version,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(startedEvent as unknown as Record<string, unknown>, id as string, 'Installation');
    const completedNow: Timestamp = new Date().toISOString();
    const completed: Installation = Object.freeze({
      ...installing,
      status: InstallationStatus.Installed,
      installedAt: completedNow,
    });
    this.installations.set(id as string, completed);
    const completedEvent: InstallationCompletedEvent = Object.freeze({
      eventType: 'marketplace.installation.completed',
      classification: EventClassification.Result,
      installationId: id,
      capabilityId: params.capabilityId,
      version: params.version,
      durationMs: 0,
      timestamp: completedNow,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(completedEvent as unknown as Record<string, unknown>, id as string, 'Installation');
    return completed;
  }

  async uninstall(installationId: import('./types.js').InstallationId): Promise<void> {
    const key = installationId as string;
    const existing = this.installations.get(key);
    if (!existing) {
      throw new InstallationNotFoundError(key);
    }
    if (existing.status !== InstallationStatus.Installed) {
      throw new InstallationStateError(key, existing.status, 'Uninstalled');
    }
    const now: Timestamp = new Date().toISOString();
    const uninstalled: Installation = Object.freeze({
      ...existing,
      status: InstallationStatus.Uninstalled,
      uninstalledAt: now,
    });
    this.installations.set(key, uninstalled);
    const event: InstallationRemovedEvent = Object.freeze({
      eventType: 'marketplace.installation.removed',
      classification: EventClassification.Info,
      installationId,
      capabilityId: existing.capabilityId,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, key, 'Installation');
  }

  async getById(id: import('./types.js').InstallationId): Promise<Installation | null> {
    return this.installations.get(id as string) ?? null;
  }

  async getByCapabilityId(capabilityId: import('./types.js').CapabilityId): Promise<Installation | null> {
    for (const inst of this.installations.values()) {
      if (inst.capabilityId === capabilityId && inst.status === InstallationStatus.Installed) return inst;
    }
    return null;
  }

  async list(filter?: Partial<{ status: InstallationStatus; capabilityId: import('./types.js').CapabilityId }>): Promise<readonly Installation[]> {
    let results = [...this.installations.values()];
    if (filter) {
      if (filter.status !== undefined) {
        results = results.filter(i => i.status === filter.status);
      }
      if (filter.capabilityId !== undefined) {
        results = results.filter(i => i.capabilityId === filter.capabilityId);
      }
    }
    return Object.freeze(results);
  }

  async count(): Promise<number> {
    return this.installations.size;
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
