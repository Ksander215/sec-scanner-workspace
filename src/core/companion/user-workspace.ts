/**
 * AIS Companion — User Workspace Manager
 * TASK-AIS-011A.000
 */

import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { IUserWorkspaceManager } from './contracts.js';
import type { UserWorkspaceConfig, Workspace } from './types.js';
import { brandWorkspaceId } from './types.js';
import { WorkspaceNotFoundError, WorkspaceLimitExceededError } from './errors.js';

export class UserWorkspaceManager implements IUserWorkspaceManager {
  private readonly config: UserWorkspaceConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly workspaces = new Map<string, Workspace>();

  constructor(config: UserWorkspaceConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async create(userId: string, label?: string): Promise<Workspace> {
    const count = await this.count(userId);
    if (count >= this.config.maxWorkspacesPerUser) {
      throw new WorkspaceLimitExceededError(this.config.maxWorkspacesPerUser, count);
    }
    const now: Timestamp = new Date().toISOString();
    const id = brandWorkspaceId(`ws-${crypto.randomUUID()}`);
    const ws: Workspace = Object.freeze({
      id, userId, label: label ?? this.config.defaultLabel,
      createdAt: now, updatedAt: now, metadata: Object.freeze({}),
    });
    this.workspaces.set(id as string, ws);
    await this.publishEvent({
      eventType: 'companion.workspace.created', classification: 'Result' as const,
      workspaceId: id, userId, label: ws.label,
      timestamp: now, metadata: Object.freeze({}),
    }, id as string, 'Workspace');
    return ws;
  }

  async get(id: string): Promise<Workspace | null> {
    return this.workspaces.get(id) ?? null;
  }

  async list(userId: string): Promise<ReadonlyArray<Workspace>> {
    return [...this.workspaces.values()].filter(ws => ws.userId === userId);
  }

  async update(id: string, label: string): Promise<Workspace> {
    const existing = this.workspaces.get(id);
    if (!existing) throw new WorkspaceNotFoundError(id);
    const now: Timestamp = new Date().toISOString();
    const updated: Workspace = Object.freeze({ ...existing, label, updatedAt: now });
    this.workspaces.set(id, updated);
    await this.publishEvent({
      eventType: 'companion.workspace.updated', classification: 'StateChange' as const,
      workspaceId: id, userId: existing.userId,
      timestamp: now, metadata: Object.freeze({}),
    }, id, 'Workspace');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const ws = this.workspaces.get(id);
    if (!ws) throw new WorkspaceNotFoundError(id);
    this.workspaces.delete(id);
  }

  async count(userId: string): Promise<number> {
    return [...this.workspaces.values()].filter(ws => ws.userId === userId).length;
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
