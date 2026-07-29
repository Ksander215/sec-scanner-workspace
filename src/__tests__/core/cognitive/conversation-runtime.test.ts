/**
 * Conversation Runtime — Tests
 * TASK-AIS-003I.000
 */
import { describe, it, expect } from 'vitest';
import {
  ConversationRuntime,
  ConversationStore,
  DefaultConversationRuntimeConfig,
} from '../../../core/cognitive/conversation-runtime.js';
import {
  ConversationState,
  MessageRole,
  MessageStatus,
} from '../../../core/cognitive/types.js';
import {
  ConversationNotFoundError,
  ConversationClosedError,
} from '../../../core/cognitive/cognitive-errors.js';

describe('ConversationRuntime', () => {
  const sessionId = 'test-session-001' as any;

  function createRuntime(config?: any): ConversationRuntime {
    return new ConversationRuntime(config);
  }

  describe('createConversation', () => {
    it('should create a conversation with default title', () => {
      const runtime = createRuntime();
      const conv = runtime.createConversation({ sessionId });
      expect(conv.id).toBeDefined();
      expect(conv.sessionId).toBe(sessionId);
      expect(conv.state).toBe(ConversationState.Active);
      expect(conv.turns).toEqual([]);
      expect(conv.threads).toEqual([]);
      expect(conv.summary).toBeNull();
      expect(conv.tokenCount).toBe(0);
      expect(conv.messageCount).toBe(0);
    });

    it('should create a conversation with custom title', () => {
      const runtime = createRuntime();
      const conv = runtime.createConversation({ sessionId, title: 'Test Conversation' });
      expect(conv.title).toBe('Test Conversation');
    });

    it('should create a frozen conversation', () => {
      const runtime = createRuntime();
      const conv = runtime.createConversation({ sessionId });
      expect(Object.isFrozen(conv)).toBe(true);
    });

    it('should throw if session conversation limit exceeded', () => {
      const runtime = createRuntime({ maxConversationsPerSession: 1 });
      runtime.createConversation({ sessionId });
      expect(() => runtime.createConversation({ sessionId })).toThrow();
    });
  });

  describe('getConversation', () => {
    it('should return an existing conversation', () => {
      const runtime = createRuntime();
      const created = runtime.createConversation({ sessionId });
      const fetched = runtime.getConversation(created.id);
      expect(fetched.id).toBe(created.id);
    });

    it('should throw ConversationNotFoundError for missing conversation', () => {
      const runtime = createRuntime();
      expect(() => runtime.getConversation('nonexistent' as any)).toThrow(ConversationNotFoundError);
    });
  });

  describe('addMessage', () => {
    it('should add a user message and create a turn', () => {
      const runtime = createRuntime();
      const conv = runtime.createConversation({ sessionId });
      const result = runtime.addMessage({
        conversationId: conv.id,
        role: MessageRole.User,
        content: 'Hello!',
      });
      expect(result.message.role).toBe(MessageRole.User);
      expect(result.message.content).toBe('Hello!');
      expect(result.conversation.messageCount).toBe(1);
    });

    it('should add assistant message and increment token count', () => {
      const runtime = createRuntime();
      const conv = runtime.createConversation({ sessionId });
      runtime.addMessage({ conversationId: conv.id, role: MessageRole.User, content: 'Hello' });
      const result = runtime.addMessage({
        conversationId: conv.id,
        role: MessageRole.Assistant,
        content: 'Hi there!',
        tokens: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      });
      expect(result.conversation.messageCount).toBe(2);
      expect(result.conversation.tokenCount).toBe(30);
    });

    it('should throw if conversation is closed', () => {
      const runtime = createRuntime();
      const conv = runtime.createConversation({ sessionId });
      runtime.closeConversation(conv.id);
      expect(() => runtime.addMessage({
        conversationId: conv.id,
        role: MessageRole.User,
        content: 'Test',
      })).toThrow(ConversationClosedError);
    });

    it('should freeze messages', () => {
      const runtime = createRuntime();
      const conv = runtime.createConversation({ sessionId });
      const result = runtime.addMessage({
        conversationId: conv.id,
        role: MessageRole.User,
        content: 'Test',
      });
      expect(Object.isFrozen(result.message)).toBe(true);
    });

    it('should include attachments', () => {
      const runtime = createRuntime();
      const conv = runtime.createConversation({ sessionId });
      const attachments = [{ id: '1', name: 'file.txt', type: 'text/plain', size: 100, metadata: Object.freeze({}) }];
      const result = runtime.addMessage({
        conversationId: conv.id,
        role: MessageRole.User,
        content: 'See attached',
        attachments,
      });
      expect(result.message.attachments).toHaveLength(1);
      expect(result.message.attachments[0].name).toBe('file.txt');
    });
  });

  describe('closeConversation', () => {
    it('should set state to Closed', () => {
      const runtime = createRuntime();
      const conv = runtime.createConversation({ sessionId });
      const closed = runtime.closeConversation(conv.id);
      expect(closed.state).toBe(ConversationState.Closed);
    });

    it('should include close reason in metadata', () => {
      const runtime = createRuntime();
      const conv = runtime.createConversation({ sessionId });
      const closed = runtime.closeConversation(conv.id, 'Test reason');
      expect(closed.metadata.closeReason).toBe('Test reason');
    });

    it('should freeze the closed conversation', () => {
      const runtime = createRuntime();
      const conv = runtime.createConversation({ sessionId });
      const closed = runtime.closeConversation(conv.id);
      expect(Object.isFrozen(closed)).toBe(true);
    });
  });

  describe('archiveConversation', () => {
    it('should set state to Archived', () => {
      const runtime = createRuntime();
      const conv = runtime.createConversation({ sessionId });
      const archived = runtime.archiveConversation(conv.id);
      expect(archived.state).toBe(ConversationState.Archived);
    });
  });

  describe('getConversationHistory', () => {
    it('should return empty array for new conversation', () => {
      const runtime = createRuntime();
      const conv = runtime.createConversation({ sessionId });
      const history = runtime.getConversationHistory(conv.id);
      expect(history).toEqual([]);
    });

    it('should return entries for messages', () => {
      const runtime = createRuntime();
      const conv = runtime.createConversation({ sessionId });
      runtime.addMessage({ conversationId: conv.id, role: MessageRole.User, content: 'Hello' });
      const history = runtime.getConversationHistory(conv.id);
      expect(history).toHaveLength(1);
      expect(history[0].role).toBe(MessageRole.User);
    });
  });

  describe('updateSummary', () => {
    it('should update conversation summary', () => {
      const runtime = createRuntime();
      const conv = runtime.createConversation({ sessionId });
      const updated = runtime.updateSummary(conv.id, 'Summary text');
      expect(updated.summary).toBe('Summary text');
    });
  });

  describe('createThread', () => {
    it('should create a thread with title', () => {
      const runtime = createRuntime();
      const conv = runtime.createConversation({ sessionId });
      const thread = runtime.createThread({
        conversationId: conv.id,
        parentTurnId: null,
        title: 'Side discussion',
      });
      expect(thread.id).toBeDefined();
      expect(thread.title).toBe('Side discussion');
      expect(Object.isFrozen(thread)).toBe(true);
    });

    it('should add thread to conversation', () => {
      const runtime = createRuntime();
      const conv = runtime.createConversation({ sessionId });
      runtime.createThread({ conversationId: conv.id, parentTurnId: null, title: 'Thread 1' });
      const updated = runtime.getConversation(conv.id);
      expect(updated.threads).toHaveLength(1);
    });
  });

  describe('listConversations', () => {
    it('should return all conversations for a session', () => {
      const runtime = createRuntime();
      runtime.createConversation({ sessionId });
      runtime.createConversation({ sessionId: 'other-session' as any });
      const list = runtime.listConversations(sessionId);
      expect(list).toHaveLength(1);
    });

    it('should return empty array for session with no conversations', () => {
      const runtime = createRuntime();
      const list = runtime.listConversations('empty-session' as any);
      expect(list).toEqual([]);
    });
  });
});

describe('ConversationStore', () => {
  it('should save and load conversations', () => {
    const store = new ConversationStore();
    const runtime = new ConversationRuntime(undefined, store);
    const conv = runtime.createConversation({ sessionId: 'test' as any });
    const loaded = store.loadConversation(conv.id);
    expect(loaded?.id).toBe(conv.id);
  });

  it('should delete conversations', () => {
    const store = new ConversationStore();
    const runtime = new ConversationRuntime(undefined, store);
    const conv = runtime.createConversation({ sessionId: 'test' as any });
    expect(store.deleteConversation(conv.id)).toBe(true);
    expect(store.loadConversation(conv.id)).toBeUndefined();
  });

  it('should return undefined for missing conversation', () => {
    const store = new ConversationStore();
    expect(store.loadConversation('missing' as any)).toBeUndefined();
  });

  it('should save and load messages', () => {
    const store = new ConversationStore();
    const runtime = new ConversationRuntime(undefined, store);
    const conv = runtime.createConversation({ sessionId: 'test' as any });
    const { message } = runtime.addMessage({
      conversationId: conv.id,
      role: MessageRole.User,
      content: 'Test message',
    });
    const loaded = store.loadMessage(message.id);
    expect(loaded?.content).toBe('Test message');
  });

  it('should count conversations by session', () => {
    const store = new ConversationStore();
    const runtime = new ConversationRuntime(undefined, store);
    runtime.createConversation({ sessionId: 'session1' as any });
    runtime.createConversation({ sessionId: 'session1' as any });
    runtime.createConversation({ sessionId: 'session2' as any });
    expect(store.getConversationCount('session1' as any)).toBe(2);
    expect(store.getConversationCount('session2' as any)).toBe(1);
  });
});
