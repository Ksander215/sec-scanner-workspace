/**
 * AIS Companion — Conversation Center
 * TASK-AIS-011A.000
 */

import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { IConversationCenter } from './contracts.js';
import type { ConversationCenterConfig, Conversation, ConversationMessage } from './types.js';
import { brandConversationId, ConversationRole, ConversationId } from './types.js';
import { ConversationNotFoundError, ConversationLimitExceededError, MessageLimitExceededError } from './errors.js';

export class ConversationCenter implements IConversationCenter {
  private readonly config: ConversationCenterConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly conversations = new Map<string, Conversation>();

  constructor(config: ConversationCenterConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async create(sessionId: string, userId: string, title?: string): Promise<Conversation> {
    const count = await this.count(sessionId);
    if (count >= this.config.maxConversationsPerSession) {
      throw new ConversationLimitExceededError(this.config.maxConversationsPerSession, count);
    }
    const now: Timestamp = new Date().toISOString();
    const id = brandConversationId(`conv-${crypto.randomUUID()}`);
    const conv: Conversation = Object.freeze({
      id, sessionId: sessionId as any, userId, title: title ?? 'New Conversation',
      messages: [], createdAt: now, updatedAt: now, metadata: Object.freeze({}),
    });
    this.conversations.set(id as string, conv);
    await this.publishEvent({
      eventType: 'companion.conversation.created', classification: 'Result' as const,
      conversationId: id, sessionId, userId, title: conv.title,
      timestamp: now, metadata: Object.freeze({}),
    }, id as string, 'Conversation');
    return conv;
  }

  async get(id: string): Promise<Conversation | null> {
    return this.conversations.get(id) ?? null;
  }

  async list(sessionId: string): Promise<ReadonlyArray<Conversation>> {
    return [...this.conversations.values()].filter(c => c.sessionId === sessionId);
  }

  async addMessage(conversationId: string, role: ConversationRole, content: string): Promise<ConversationMessage> {
    const conv = this.conversations.get(conversationId);
    if (!conv) throw new ConversationNotFoundError(conversationId);
    if (conv.messages.length >= this.config.maxMessagesPerConversation) {
      throw new MessageLimitExceededError(this.config.maxMessagesPerConversation, conv.messages.length);
    }
    const now: Timestamp = new Date().toISOString();
    const msg: ConversationMessage = Object.freeze({
      id: crypto.randomUUID(), conversationId: conversationId as ConversationId, role, content,
      timestamp: now, metadata: Object.freeze({}),
    });
    const updated: Conversation = Object.freeze({
      ...conv, messages: [...conv.messages, msg], updatedAt: now,
    });
    this.conversations.set(conversationId, updated);
    await this.publishEvent({
      eventType: 'companion.conversation.messageAdded', classification: 'Action' as const,
      conversationId, messageId: msg.id, role,
      timestamp: now, metadata: Object.freeze({}),
    }, conversationId, 'Conversation');
    return msg;
  }

  async remove(id: string): Promise<void> {
    const conv = this.conversations.get(id);
    if (!conv) throw new ConversationNotFoundError(id);
    this.conversations.delete(id);
  }

  async count(sessionId: string): Promise<number> {
    return [...this.conversations.values()].filter(c => c.sessionId === sessionId).length;
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
