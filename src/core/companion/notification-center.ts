/**
 * AIS Companion — Notification Center
 * TASK-AIS-011A.000
 */

import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { INotificationCenter } from './contracts.js';
import type { NotificationCenterConfig, CompanionNotification } from './types.js';
import { brandCompanionNotificationId, brandCompanionSessionId, NotificationPriority, NotificationStatus } from './types.js';
import { NotificationNotFoundError, NotificationLimitExceededError } from './errors.js';

export class NotificationCenter implements INotificationCenter {
  private readonly config: NotificationCenterConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly notifications = new Map<string, CompanionNotification>();

  constructor(config: NotificationCenterConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async create(sessionId: string, userId: string, title: string, content: string, priority?: NotificationPriority): Promise<CompanionNotification> {
    const count = await this.count(sessionId);
    if (count >= this.config.maxNotifications) {
      throw new NotificationLimitExceededError(this.config.maxNotifications, count);
    }
    const now: Timestamp = new Date().toISOString();
    const id = brandCompanionNotificationId(`notif-${crypto.randomUUID()}`);
    const notif: CompanionNotification = Object.freeze({
      id, sessionId: brandCompanionSessionId(sessionId), userId, title, content,
      priority: priority ?? this.config.defaultPriority,
      status: NotificationStatus.Unread, createdAt: now, readAt: null,
      metadata: Object.freeze({}),
    });
    this.notifications.set(id as string, notif);
    await this.publishEvent({
      eventType: 'companion.notification.created', classification: 'Result' as const,
      notificationId: id, sessionId, priority: notif.priority,
      timestamp: now, metadata: Object.freeze({}),
    }, id as string, 'CompanionNotification');
    return notif;
  }

  async get(id: string): Promise<CompanionNotification | null> {
    return this.notifications.get(id) ?? null;
  }

  async list(sessionId: string): Promise<ReadonlyArray<CompanionNotification>> {
    return [...this.notifications.values()].filter(n => n.sessionId === sessionId);
  }

  async markRead(id: string): Promise<CompanionNotification> {
    const notif = this.notifications.get(id);
    if (!notif) throw new NotificationNotFoundError(id);
    const now: Timestamp = new Date().toISOString();
    const updated: CompanionNotification = Object.freeze({ ...notif, status: NotificationStatus.Read, readAt: now });
    this.notifications.set(id, updated);
    await this.publishEvent({
      eventType: 'companion.notification.read', classification: 'StateChange' as const,
      notificationId: id, sessionId: notif.sessionId,
      timestamp: now, metadata: Object.freeze({}),
    }, id, 'CompanionNotification');
    return updated;
  }

  async markDismissed(id: string): Promise<CompanionNotification> {
    const notif = this.notifications.get(id);
    if (!notif) throw new NotificationNotFoundError(id);
    const updated: CompanionNotification = Object.freeze({ ...notif, status: NotificationStatus.Dismissed });
    this.notifications.set(id, updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const notif = this.notifications.get(id);
    if (!notif) throw new NotificationNotFoundError(id);
    this.notifications.delete(id);
  }

  async count(sessionId: string): Promise<number> {
    return [...this.notifications.values()].filter(n => n.sessionId === sessionId).length;
  }

  async unreadCount(sessionId: string): Promise<number> {
    return [...this.notifications.values()].filter(n => n.sessionId === sessionId && n.status === NotificationStatus.Unread).length;
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
