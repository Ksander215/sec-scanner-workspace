/**
 * Permission Runtime Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { PermissionRequest, PermissionRuntimeConfig } from './types.js';
import { brandPermissionSetId } from './types.js';
import type { IPermissionRuntime } from './contracts.js';
import { PermissionDeniedError, PermissionLimitExceededError } from './errors.js';
import type { PermissionRequestedEvent, PermissionGrantedEvent, PermissionDeniedEvent } from './events.js';
import { PermissionType } from './types.js';

export class PermissionRuntime implements IPermissionRuntime {
  private readonly config: PermissionRuntimeConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly requests = new Map<string, PermissionRequest>();

  constructor(config: PermissionRuntimeConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async requestPermissions(capabilityId: import('./types.js').CapabilityId, permissions: readonly PermissionType[]): Promise<PermissionRequest> {
    const pendingCount = [...this.requests.values()].filter(r => r.pendingPermissions.length > 0).length;
    if (pendingCount >= this.config.maxPendingRequests) {
      throw new PermissionLimitExceededError(this.config.maxPendingRequests);
    }
    const now: Timestamp = new Date().toISOString();
    const id = brandPermissionSetId(crypto.randomUUID());
    const permArray = [...permissions];
    const autoGrantable = this.config.autoGrantSafePermissions
      ? permArray.filter(p => !this.config.requireExplicitGrant.includes(p))
      : [];
    const pending = permArray.filter(p => !autoGrantable.includes(p));
    const request: PermissionRequest = Object.freeze({
      id,
      capabilityId,
      requestedPermissions: Object.freeze(permArray),
      grantedPermissions: Object.freeze(autoGrantable),
      deniedPermissions: Object.freeze([]),
      pendingPermissions: Object.freeze(pending),
      decidedAt: autoGrantable.length > 0 ? now : null,
      metadata: Object.freeze({}),
    });
    this.requests.set(id as string, request);
    const requestedEvent: PermissionRequestedEvent = Object.freeze({
      eventType: 'marketplace.permission.requested',
      classification: EventClassification.Info,
      permissionSetId: id,
      capabilityId,
      permissions: Object.freeze(permArray),
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(requestedEvent as unknown as Record<string, unknown>, id as string, 'PermissionRequest');
    if (autoGrantable.length > 0) {
      const grantedEvent: PermissionGrantedEvent = Object.freeze({
        eventType: 'marketplace.permission.granted',
        classification: EventClassification.Result,
        permissionSetId: id,
        capabilityId,
        permissions: Object.freeze(autoGrantable),
        timestamp: now,
        metadata: Object.freeze({}),
      });
      await this.publishEvent(grantedEvent as unknown as Record<string, unknown>, id as string, 'PermissionRequest');
    }
    return request;
  }

  async grant(permissionSetId: import('./types.js').PermissionSetId, permissions: readonly PermissionType[]): Promise<void> {
    const key = permissionSetId as string;
    const existing = this.requests.get(key);
    if (!existing) throw new PermissionDeniedError('Permission set not found');
    const now: Timestamp = new Date().toISOString();
    const newGranted = [...existing.grantedPermissions, ...permissions];
    const newPending = existing.pendingPermissions.filter(p => !permissions.includes(p));
    const updated: PermissionRequest = Object.freeze({
      ...existing,
      grantedPermissions: Object.freeze(newGranted),
      pendingPermissions: Object.freeze(newPending),
      decidedAt: now,
    });
    this.requests.set(key, updated);
    const event: PermissionGrantedEvent = Object.freeze({
      eventType: 'marketplace.permission.granted',
      classification: EventClassification.Result,
      permissionSetId,
      capabilityId: existing.capabilityId,
      permissions: Object.freeze([...permissions]),
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, key, 'PermissionRequest');
  }

  async deny(permissionSetId: import('./types.js').PermissionSetId, permissions: readonly PermissionType[]): Promise<void> {
    const key = permissionSetId as string;
    const existing = this.requests.get(key);
    if (!existing) throw new PermissionDeniedError('Permission set not found');
    const now: Timestamp = new Date().toISOString();
    const newDenied = [...existing.deniedPermissions, ...permissions];
    const newPending = existing.pendingPermissions.filter(p => !permissions.includes(p));
    const updated: PermissionRequest = Object.freeze({
      ...existing,
      deniedPermissions: Object.freeze(newDenied),
      pendingPermissions: Object.freeze(newPending),
      decidedAt: now,
    });
    this.requests.set(key, updated);
    const event: PermissionDeniedEvent = Object.freeze({
      eventType: 'marketplace.permission.denied',
      classification: EventClassification.Result,
      permissionSetId,
      capabilityId: existing.capabilityId,
      permissions: Object.freeze([...permissions]),
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, key, 'PermissionRequest');
  }

  async revoke(permissionSetId: import('./types.js').PermissionSetId): Promise<void> {
    const key = permissionSetId as string;
    const existing = this.requests.get(key);
    if (!existing) throw new PermissionDeniedError('Permission set not found');
    const now: Timestamp = new Date().toISOString();
    const updated: PermissionRequest = Object.freeze({
      ...existing,
      grantedPermissions: Object.freeze([]),
      deniedPermissions: Object.freeze([...existing.requestedPermissions]),
      pendingPermissions: Object.freeze([]),
      decidedAt: now,
    });
    this.requests.set(key, updated);
  }

  async getById(id: import('./types.js').PermissionSetId): Promise<PermissionRequest | null> {
    return this.requests.get(id as string) ?? null;
  }

  async getByCapabilityId(capId: import('./types.js').CapabilityId): Promise<PermissionRequest | null> {
    for (const req of this.requests.values()) {
      if (req.capabilityId === capId) return req;
    }
    return null;
  }

  async listPending(): Promise<readonly PermissionRequest[]> {
    return Object.freeze([...this.requests.values()].filter(r => r.pendingPermissions.length > 0));
  }

  async checkPermission(capId: import('./types.js').CapabilityId, permission: PermissionType): Promise<boolean> {
    for (const req of this.requests.values()) {
      if (req.capabilityId === capId && req.grantedPermissions.includes(permission)) {
        return true;
      }
    }
    return false;
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
