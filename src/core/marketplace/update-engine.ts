/**
 * Update Engine Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { UpdateRecord, UpdateEngineConfig } from './types.js';
import type { IUpdateEngine } from './contracts.js';
import { RollbackError } from './errors.js';
import type { UpdateStartedEvent, UpdateCompletedEvent, UpdateRolledBackEvent } from './events.js';
import { InstallationStatus } from './types.js';

export class UpdateEngine implements IUpdateEngine {
  private readonly eventBus: InProcessEventBus | null;
  private readonly updates = new Map<string, UpdateRecord[]>();

  constructor(_config: UpdateEngineConfig, eventBus?: InProcessEventBus | null) {
    this.eventBus = eventBus ?? null;
  }

  async checkForUpdates(installationId: import('./types.js').InstallationId): Promise<UpdateRecord | null> {
    const history = this.updates.get(installationId as string);
    if (!history || history.length === 0) return null;
    return history[history.length - 1];
  }

  async update(installationId: import('./types.js').InstallationId, toVersion: string): Promise<UpdateRecord> {
    const key = installationId as string;
    const history = this.updates.get(key) ?? [];
    const fromVersion = history.length > 0 ? history[history.length - 1].toVersion : '0.0.0';
    const now: Timestamp = new Date().toISOString();
    const startedRecord: UpdateRecord = Object.freeze({
      installationId,
      capabilityId: '' as unknown as import('./types.js').CapabilityId,
      fromVersion,
      toVersion,
      status: InstallationStatus.Updating,
      initiatedAt: now,
      completedAt: null,
      error: null,
      rolledBack: false,
      metadata: Object.freeze({}),
    });
    const startedEvent: UpdateStartedEvent = Object.freeze({
      eventType: 'marketplace.update.started',
      classification: EventClassification.Info,
      installationId,
      capabilityId: '' as unknown as import('./types.js').CapabilityId,
      fromVersion,
      toVersion,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(startedEvent as unknown as Record<string, unknown>, key, 'UpdateRecord');
    const completedNow: Timestamp = new Date().toISOString();
    const completedRecord: UpdateRecord = Object.freeze({
      ...startedRecord,
      status: InstallationStatus.Installed,
      completedAt: completedNow,
    });
    const updatedHistory = [...history, completedRecord];
    this.updates.set(key, updatedHistory);
    const completedEvent: UpdateCompletedEvent = Object.freeze({
      eventType: 'marketplace.update.completed',
      classification: EventClassification.Result,
      installationId,
      capabilityId: '' as unknown as import('./types.js').CapabilityId,
      fromVersion,
      toVersion,
      durationMs: 0,
      timestamp: completedNow,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(completedEvent as unknown as Record<string, unknown>, key, 'UpdateRecord');
    return completedRecord;
  }

  async rollback(installationId: import('./types.js').InstallationId): Promise<UpdateRecord> {
    const key = installationId as string;
    const history = this.updates.get(key);
    if (!history || history.length === 0) {
      throw new RollbackError('No update history to roll back');
    }
    const lastRecord = history[history.length - 1];
    const now: Timestamp = new Date().toISOString();
    const rollbackRecord: UpdateRecord = Object.freeze({
      installationId,
      capabilityId: lastRecord.capabilityId,
      fromVersion: lastRecord.toVersion,
      toVersion: lastRecord.fromVersion,
      status: InstallationStatus.RolledBack,
      initiatedAt: now,
      completedAt: now,
      error: null,
      rolledBack: true,
      metadata: Object.freeze({}),
    });
    const updatedHistory = [...history, rollbackRecord];
    this.updates.set(key, updatedHistory);
    const event: UpdateRolledBackEvent = Object.freeze({
      eventType: 'marketplace.update.rolledBack',
      classification: EventClassification.Info,
      installationId,
      capabilityId: lastRecord.capabilityId,
      fromVersion: lastRecord.toVersion,
      toVersion: lastRecord.fromVersion,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, key, 'UpdateRecord');
    return rollbackRecord;
  }

  async listUpdates(filter?: Partial<{ status: InstallationStatus; capabilityId: import('./types.js').CapabilityId }>): Promise<readonly UpdateRecord[]> {
    let results: UpdateRecord[] = [];
    for (const history of this.updates.values()) {
      results.push(...history);
    }
    if (filter) {
      if (filter.status !== undefined) {
        results = results.filter(r => r.status === filter.status);
      }
      if (filter.capabilityId !== undefined) {
        results = results.filter(r => r.capabilityId === filter.capabilityId);
      }
    }
    return Object.freeze(results);
  }

  async getUpdateHistory(installationId: import('./types.js').InstallationId): Promise<readonly UpdateRecord[]> {
    const history = this.updates.get(installationId as string);
    return Object.freeze(history ?? []);
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
