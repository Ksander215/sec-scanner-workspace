/**
 * Cognitive Runtime — Conversation Runtime
 * TASK-AIS-003I.000
 *
 * Manages conversations, messages, turns, threads, and sessions.
 * Supports streaming, history, summaries, and attachments.
 *
 * Conforms to: ARC-001.001, DOM-002.000
 */

import type {
  Conversation,
  ConversationId,
  Message,
  MessageId,
  MessageRole,
  Turn,
  TurnId,
  Thread,
  ThreadId,
  TokenUsage,
  CognitiveSessionId,
  Attachment,
  PromptMessageEntry,
  Timestamp,
} from './types.js';
import {
  brandConversationId,
  brandMessageId,
  brandTurnId,
  brandThreadId,
} from './types.js';
import { ConversationState as CS, MessageStatus } from './types.js';
import {
  ConversationNotFoundError,
  ConversationClosedError,
  TurnLimitError,
} from './cognitive-errors.js';

/**
 * In-memory conversation store.
 */
export class ConversationStore {
  private readonly _conversations: Map<string, Conversation> = new Map();
  private readonly _messages: Map<string, Message> = new Map();

  saveConversation(conversation: Conversation): void {
    this._conversations.set(conversation.id, conversation);
  }

  loadConversation(id: ConversationId): Conversation | undefined {
    return this._conversations.get(id);
  }

  deleteConversation(id: ConversationId): boolean {
    return this._conversations.delete(id);
  }

  saveMessage(message: Message): void {
    this._messages.set(message.id, message);
  }

  loadMessage(id: MessageId): Message | undefined {
    return this._messages.get(id);
  }

  listConversations(sessionId?: CognitiveSessionId): readonly Conversation[] {
    if (!sessionId) return Array.from(this._conversations.values());
    return Array.from(this._conversations.values()).filter(c => c.sessionId === sessionId);
  }

  getConversationCount(sessionId?: CognitiveSessionId): number {
    if (!sessionId) return this._conversations.size;
    return Array.from(this._conversations.values()).filter(c => c.sessionId === sessionId).length;
  }
}

/**
 * Configuration for Conversation Runtime.
 */
export interface ConversationRuntimeConfig {
  readonly maxTurnsPerConversation: number;
  readonly maxConversationsPerSession: number;
  readonly maxAttachmentsPerMessage: number;
  readonly maxMessageLength: number;
}

/**
 * Default configuration.
 */
export const DefaultConversationRuntimeConfig: ConversationRuntimeConfig = {
  maxTurnsPerConversation: 100,
  maxConversationsPerSession: 10,
  maxAttachmentsPerMessage: 10,
  maxMessageLength: 50000,
};

/**
 * ConversationRuntime — manages conversations lifecycle.
 */
export class ConversationRuntime {
  private readonly _config: ConversationRuntimeConfig;
  private readonly _store: ConversationStore;

  constructor(config?: Partial<ConversationRuntimeConfig>, store?: ConversationStore) {
    this._config = { ...DefaultConversationRuntimeConfig, ...config };
    this._store = store ?? new ConversationStore();
  }

  /**
   * Get the conversation store.
   */
  get store(): ConversationStore {
    return this._store;
  }

  /**
   * Create a new conversation.
   */
  createConversation(params: {
    sessionId: CognitiveSessionId;
    title?: string;
  }): Conversation {
    this.validateSessionLimit(params.sessionId);

    const now: Timestamp = new Date().toISOString();
    const id: ConversationId = brandConversationId(crypto.randomUUID());

    const conversation: Conversation = Object.freeze({
      id,
      sessionId: params.sessionId,
      state: CS.Active,
      title: params.title ?? 'New Conversation',
      turns: Object.freeze([]),
      threads: Object.freeze([]),
      summary: null,
      tokenCount: 0,
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
      metadata: Object.freeze({}),
    });

    this._store.saveConversation(conversation);
    return conversation;
  }

  /**
   * Get a conversation by ID.
   */
  getConversation(conversationId: ConversationId): Conversation {
    const conv = this._store.loadConversation(conversationId);
    if (!conv) {
      throw new ConversationNotFoundError(conversationId);
    }
    return conv;
  }

  /**
   * Add a message to a conversation turn.
   */
  addMessage(params: {
    conversationId: ConversationId;
    role: MessageRole;
    content: string;
    attachments?: readonly Attachment[];
    tokens?: TokenUsage;
  }): { conversation: Conversation; message: Message; turn: Turn } {
    let conversation = this.getConversation(params.conversationId);
    if (conversation.state === CS.Closed) {
      throw new ConversationClosedError(params.conversationId);
    }

    // Create or continue a turn
    const turnNumber = conversation.turns.length + 1;
    const turn = this.createTurn(conversation.id, turnNumber, conversation.turns.length === 0);

    // Create the message
    const now: Timestamp = new Date().toISOString();
    const messageId: MessageId = brandMessageId(crypto.randomUUID());
    const message: Message = Object.freeze({
      id: messageId,
      conversationId: conversation.id,
      turnId: turn.id,
      threadId: null,
      role: params.role,
      content: params.content,
      attachments: Object.freeze(params.attachments ?? []),
      status: MessageStatus.Sent,
      tokens: params.tokens ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      createdAt: now,
      metadata: Object.freeze({}),
    });

    this._store.saveMessage(message);

    // Rebuild conversation with new turn + message
    conversation = this.rebuildConversation(conversation, message, turn);
    this._store.saveConversation(conversation);

    return { conversation, message, turn };
  }

  /**
   * Close a conversation.
   */
  closeConversation(conversationId: ConversationId, reason?: string): Conversation {
    const conversation = this.getConversation(conversationId);
    const now: Timestamp = new Date().toISOString();

    const closed: Conversation = Object.freeze({
      ...conversation,
      state: CS.Closed,
      updatedAt: now,
      lastActivityAt: now,
      metadata: Object.freeze({
        ...conversation.metadata,
        closeReason: reason ?? 'User closed',
      }),
    });

    this._store.saveConversation(closed);
    return closed;
  }

  /**
   * Archive a conversation.
   */
  archiveConversation(conversationId: ConversationId): Conversation {
    const conversation = this.getConversation(conversationId);
    const now: Timestamp = new Date().toISOString();

    const archived: Conversation = Object.freeze({
      ...conversation,
      state: CS.Archived,
      updatedAt: now,
    });

    this._store.saveConversation(archived);
    return archived;
  }

  /**
   * Get conversation history as prompt entries.
   */
  getConversationHistory(conversationId: ConversationId): PromptMessageEntry[] {
    const conversation = this.getConversation(conversationId);
    const entries: PromptMessageEntry[] = [];

    for (const turn of conversation.turns) {
      for (const message of turn.messages) {
        entries.push({
          role: message.role,
          content: message.content,
          tokens: message.tokens.totalTokens,
          turn: turn.number,
        });
      }
    }

    return entries;
  }

  /**
   * Update conversation summary.
   */
  updateSummary(conversationId: ConversationId, summary: string): Conversation {
    const conversation = this.getConversation(conversationId);
    const now: Timestamp = new Date().toISOString();

    const updated: Conversation = Object.freeze({
      ...conversation,
      summary,
      updatedAt: now,
      lastActivityAt: now,
    });

    this._store.saveConversation(updated);
    return updated;
  }

  /**
   * Create a new thread within a conversation.
   */
  createThread(params: {
    conversationId: ConversationId;
    parentTurnId: TurnId | null;
    title: string;
  }): Thread {
    const conversation = this.getConversation(params.conversationId);
    const now: Timestamp = new Date().toISOString();
    const id: ThreadId = brandThreadId(crypto.randomUUID());

    const thread: Thread = Object.freeze({
      id,
      conversationId: conversation.id,
      parentId: params.parentTurnId,
      title: params.title,
      turns: Object.freeze([]),
      createdAt: now,
      metadata: Object.freeze({}),
    });

    // Rebuild conversation with new thread
    const updated = Object.freeze({
      ...conversation,
      threads: Object.freeze([...conversation.threads, thread]),
      updatedAt: now,
    });
    this._store.saveConversation(updated);

    return thread;
  }

  /**
   * List conversations for a session.
   */
  listConversations(sessionId: CognitiveSessionId): readonly Conversation[] {
    return this._store.listConversations(sessionId);
  }

  /**
   * Validate session conversation limit.
   */
  private validateSessionLimit(sessionId: CognitiveSessionId): void {
    const count = this._store.getConversationCount(sessionId);
    if (count >= this._config.maxConversationsPerSession) {
      throw new TurnLimitError(count, this._config.maxConversationsPerSession);
    }
  }

  /**
   * Create a new turn.
   */
  private createTurn(conversationId: ConversationId, turnNumber: number, isFirst: boolean): Turn {
    const now: Timestamp = new Date().toISOString();
    const id: TurnId = brandTurnId(crypto.randomUUID());

    return Object.freeze({
      id,
      conversationId,
      number: turnNumber,
      messages: Object.freeze([]),
      intent: null,
      responsePlan: null,
      summary: null,
      startedAt: now,
      completedAt: null,
      durationMs: null,
      metadata: Object.freeze({ isFirst }),
    });
  }

  /**
   * Rebuild conversation with a new message.
   */
  private rebuildConversation(conversation: Conversation, message: Message, turn: Turn): Conversation {
    const now: Timestamp = new Date().toISOString();

    const updatedTurn: Turn = Object.freeze({
      ...turn,
      messages: Object.freeze([...turn.messages, message]),
    });

    const newTurns = [...conversation.turns];
    // Replace last turn or add new one
    if (newTurns.length > 0 && newTurns[newTurns.length - 1].id === turn.id) {
      newTurns[newTurns.length - 1] = updatedTurn;
    } else {
      newTurns.push(updatedTurn);
    }

    return Object.freeze({
      ...conversation,
      turns: Object.freeze(newTurns),
      messageCount: conversation.messageCount + 1,
      tokenCount: conversation.tokenCount + message.tokens.totalTokens,
      updatedAt: now,
      lastActivityAt: now,
    });
  }
}
