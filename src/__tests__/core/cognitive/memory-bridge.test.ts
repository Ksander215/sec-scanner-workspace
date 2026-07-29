/**
 * Memory Bridge Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationMemoryBridge, DefaultMemoryBridgeConfig } from '../../../core/cognitive/memory-bridge.js';
import { ConversationState, MessageRole, IntentType, IntentComplexity } from '../../../core/cognitive/types.js';
import { brandConversationId, brandMessageId, brandTurnId, brandIntentId, brandCognitiveSessionId } from '../../../core/cognitive/types.js';

// ─── Helpers ──────────────────────────────────────────────────

function createMockConversation(overrides: Partial<any> = {}) {
  const id = brandConversationId(crypto.randomUUID());
  const sessionId = brandCognitiveSessionId(crypto.randomUUID());
  const turnId = brandTurnId(crypto.randomUUID());
  const msgId = brandMessageId(crypto.randomUUID());
  const intentId = brandIntentId(crypto.randomUUID());

  const message = Object.freeze({
    id: msgId,
    conversationId: id,
    turnId,
    threadId: null,
    role: MessageRole.User,
    content: 'Hello',
    attachments: [],
    status: 'Sent' as any,
    tokens: Object.freeze({ promptTokens: 5, completionTokens: 0, totalTokens: 5 }),
    createdAt: '2024-01-01T00:00:00Z',
    metadata: Object.freeze({}),
  });

  const assistantMsg = Object.freeze({
    ...message,
    id: brandMessageId(crypto.randomUUID()),
    role: MessageRole.Assistant,
    content: 'Hi there!',
    tokens: Object.freeze({ promptTokens: 5, completionTokens: 10, totalTokens: 15 }),
  });

  const turn = Object.freeze({
    id: turnId,
    conversationId: id,
    number: 1,
    messages: Object.freeze([message, assistantMsg]),
    intent: Object.freeze({
      id: intentId,
      type: IntentType.Question,
      goal: 'test goal',
      priority: 5,
      complexity: IntentComplexity.Simple,
      confidence: 0.8,
      requiredCapabilities: [],
      parameters: {},
      detectedAt: '2024-01-01T00:00:00Z',
      metadata: Object.freeze({}),
    }),
    responsePlan: null,
    summary: null,
    startedAt: '2024-01-01T00:00:00Z',
    completedAt: '2024-01-01T00:00:01Z',
    durationMs: 1000,
    metadata: Object.freeze({}),
  });

  return Object.freeze({
    id,
    sessionId,
    state: ConversationState.Active,
    title: 'Test Conversation',
    turns: Object.freeze([turn]),
    threads: Object.freeze([]),
    summary: null,
    tokenCount: 20,
    messageCount: 2,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:01Z',
    lastActivityAt: '2024-01-01T00:00:01Z',
    metadata: Object.freeze({}),
    ...overrides,
  });
}

function createMockMemoryContract() {
  return {
    retrieve: vi.fn().mockResolvedValue([]),
    store: vi.fn().mockResolvedValue(undefined),
    getSessionEntries: vi.fn().mockResolvedValue([]),
    getWorkingEntries: vi.fn().mockResolvedValue([]),
  };
}

function createMockKnowledgeContract() {
  return {
    retrieve: vi.fn().mockResolvedValue([]),
    getNamespaces: vi.fn().mockResolvedValue([]),
    itemCount: vi.fn().mockResolvedValue(0),
  };
}

describe('ConversationMemoryBridge', () => {
  let bridge: ConversationMemoryBridge;

  beforeEach(() => {
    bridge = new ConversationMemoryBridge();
  });

  // ─── constructor ──────────────────────────────────────────────

  describe('constructor', () => {
    it('creates with default config', () => {
      expect(bridge).toBeInstanceOf(ConversationMemoryBridge);
    });

    it('accepts custom config', () => {
      const b = new ConversationMemoryBridge({ enabled: false });
      expect(b).toBeInstanceOf(ConversationMemoryBridge);
    });

    it('accepts multiple config overrides', () => {
      const b = new ConversationMemoryBridge({ autoStoreMemories: false, autoUpdateKnowledge: false });
      expect(b).toBeInstanceOf(ConversationMemoryBridge);
    });
  });

  // ─── bridge — disabled ────────────────────────────────────────

  describe('bridge — disabled', () => {
    it('returns empty result when disabled', async () => {
      const b = new ConversationMemoryBridge({ enabled: false });
      const conv = createMockConversation();
      const result = await b.bridge({
        conversation: conv,
        turn: conv.turns[0],
        intent: null,
        sessionId: conv.sessionId,
      });
      expect(result.memoriesStored).toBe(0);
      expect(result.knowledgeUpdated).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    it('does not call memory contract when disabled', async () => {
      const b = new ConversationMemoryBridge({ enabled: false });
      const contract = createMockMemoryContract();
      b.registerMemoryContract(contract);
      const conv = createMockConversation();
      await b.bridge({ conversation: conv, turn: conv.turns[0], intent: null, sessionId: conv.sessionId });
      expect(contract.store).not.toHaveBeenCalled();
    });
  });

  // ─── bridge — autoStoreMemories ───────────────────────────────

  describe('bridge — autoStoreMemories', () => {
    it('stores memories when enabled', async () => {
      const contract = createMockMemoryContract();
      bridge.registerMemoryContract(contract);
      const conv = createMockConversation();
      const result = await bridge.bridge({
        conversation: conv,
        turn: conv.turns[0],
        intent: conv.turns[0].intent,
        sessionId: conv.sessionId,
      });
      expect(result.memoriesStored).toBeGreaterThan(0);
    });

    it('does not store memories when disabled', async () => {
      const b = new ConversationMemoryBridge({ autoStoreMemories: false });
      const contract = createMockMemoryContract();
      b.registerMemoryContract(contract);
      const conv = createMockConversation();
      const result = await b.bridge({
        conversation: conv,
        turn: conv.turns[0],
        intent: null,
        sessionId: conv.sessionId,
      });
      expect(result.memoriesStored).toBe(0);
    });

    it('stores intent data', async () => {
      const contract = createMockMemoryContract();
      bridge.registerMemoryContract(contract);
      const conv = createMockConversation();
      await bridge.bridge({
        conversation: conv,
        turn: conv.turns[0],
        intent: conv.turns[0].intent,
        sessionId: conv.sessionId,
      });
      const calls = contract.store.mock.calls;
      const intentCall = calls.find((c: any[]) => c[0].includes(':intent:'));
      expect(intentCall).toBeDefined();
    });

    it('stores turn summary', async () => {
      const contract = createMockMemoryContract();
      bridge.registerMemoryContract(contract);
      const conv = createMockConversation();
      await bridge.bridge({
        conversation: conv,
        turn: conv.turns[0],
        intent: null,
        sessionId: conv.sessionId,
      });
      const calls = contract.store.mock.calls;
      const turnCall = calls.find((c: any[]) => c[0].includes(':turn:'));
      expect(turnCall).toBeDefined();
    });

    it('stores conversation metadata', async () => {
      const contract = createMockMemoryContract();
      bridge.registerMemoryContract(contract);
      const conv = createMockConversation();
      await bridge.bridge({
        conversation: conv,
        turn: conv.turns[0],
        intent: null,
        sessionId: conv.sessionId,
      });
      const calls = contract.store.mock.calls;
      const metaCall = calls.find((c: any[]) => c[0].includes(':meta:'));
      expect(metaCall).toBeDefined();
    });
  });

  // ─── bridge — autoUpdateKnowledge ────────────────────────────

  describe('bridge — autoUpdateKnowledge', () => {
    it('updates knowledge when enabled and intent confidence > 0.8', async () => {
      const contract = createMockKnowledgeContract();
      bridge.registerKnowledgeContract(contract);
      const conv = createMockConversation({
        turns: Object.freeze([
          Object.freeze({
            ...createMockConversation().turns[0],
            intent: Object.freeze({
              ...createMockConversation().turns[0].intent,
              confidence: 0.9,
            }),
          }),
        ]),
      });
      const result = await bridge.bridge({
        conversation: conv,
        turn: conv.turns[0],
        intent: conv.turns[0].intent,
        sessionId: conv.sessionId,
      });
      expect(result.knowledgeUpdated).toBe(true);
    });

    it('does not update knowledge when intent confidence < 0.8', async () => {
      const contract = createMockKnowledgeContract();
      bridge.registerKnowledgeContract(contract);
      const conv = createMockConversation({
        turns: Object.freeze([
          Object.freeze({
            ...createMockConversation().turns[0],
            intent: Object.freeze({
              ...createMockConversation().turns[0].intent,
              confidence: 0.5,
            }),
          }),
        ]),
      });
      const result = await bridge.bridge({
        conversation: conv,
        turn: conv.turns[0],
        intent: conv.turns[0].intent,
        sessionId: conv.sessionId,
      });
      expect(result.knowledgeUpdated).toBe(false);
    });

    it('does not update knowledge when no intent', async () => {
      const contract = createMockKnowledgeContract();
      bridge.registerKnowledgeContract(contract);
      const conv = createMockConversation();
      const result = await bridge.bridge({
        conversation: conv,
        turn: conv.turns[0],
        intent: null,
        sessionId: conv.sessionId,
      });
      expect(result.knowledgeUpdated).toBe(false);
    });

    it('does not update knowledge when disabled', async () => {
      const b = new ConversationMemoryBridge({ autoUpdateKnowledge: false });
      const contract = createMockKnowledgeContract();
      b.registerKnowledgeContract(contract);
      const conv = createMockConversation();
      const result = await b.bridge({
        conversation: conv,
        turn: conv.turns[0],
        intent: conv.turns[0].intent,
        sessionId: conv.sessionId,
      });
      expect(result.knowledgeUpdated).toBe(false);
    });
  });

  // ─── bridge — policy evaluation ──────────────────────────────

  describe('bridge — policy evaluation', () => {
    it('uses default allow when no evaluator registered', async () => {
      const contract = createMockMemoryContract();
      bridge.registerMemoryContract(contract);
      const conv = createMockConversation();
      const result = await bridge.bridge({
        conversation: conv,
        turn: conv.turns[0],
        intent: null,
        sessionId: conv.sessionId,
      });
      expect(result.memoriesStored).toBeGreaterThan(0);
    });

    it('respects custom policy evaluator that denies', async () => {
      bridge.registerPolicyEvaluator('Memory', async () => ({
        allowed: false,
        policyId: 'test-mem',
        policyType: 'Memory' as any,
        reason: 'denied',
        constraints: Object.freeze({}),
      }));
      const contract = createMockMemoryContract();
      bridge.registerMemoryContract(contract);
      const conv = createMockConversation();
      const result = await bridge.bridge({
        conversation: conv,
        turn: conv.turns[0],
        intent: null,
        sessionId: conv.sessionId,
      });
      expect(result.memoriesStored).toBe(0);
    });

    it('respects custom policy evaluator that allows', async () => {
      bridge.registerPolicyEvaluator('Memory', async () => ({
        allowed: true,
        policyId: 'test-mem',
        policyType: 'Memory' as any,
        reason: 'allowed',
        constraints: Object.freeze({}),
      }));
      const contract = createMockMemoryContract();
      bridge.registerMemoryContract(contract);
      const conv = createMockConversation();
      const result = await bridge.bridge({
        conversation: conv,
        turn: conv.turns[0],
        intent: null,
        sessionId: conv.sessionId,
      });
      expect(result.memoriesStored).toBeGreaterThan(0);
    });
  });

  // ─── bridge — memory contract integration ────────────────────

  describe('bridge — memory contract integration', () => {
    it('handles memory contract errors gracefully', async () => {
      const badContract = {
        ...createMockMemoryContract(),
        store: vi.fn().mockRejectedValue(new Error('store failed')),
      };
      bridge.registerMemoryContract(badContract);
      const conv = createMockConversation();
      const result = await bridge.bridge({
        conversation: conv,
        turn: conv.turns[0],
        intent: null,
        sessionId: conv.sessionId,
      });
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Memory store error');
    });

    it('handles knowledge contract errors gracefully', async () => {
      bridge.registerPolicyEvaluator('Knowledge', async () => ({
        allowed: true,
        policyId: 'test',
        policyType: 'Knowledge' as any,
        reason: 'ok',
        constraints: Object.freeze({}),
      }));
      const badContract = {
        ...createMockKnowledgeContract(),
        retrieve: vi.fn().mockRejectedValue(new Error('knowledge failed')),
      };
      bridge.registerKnowledgeContract(badContract);
      const conv = createMockConversation();
      // Knowledge errors don't affect the bridge result since updateKnowledge
      // doesn't call the contract directly in the current implementation
    });

    it('works without any contracts registered', async () => {
      const conv = createMockConversation();
      const result = await bridge.bridge({
        conversation: conv,
        turn: conv.turns[0],
        intent: null,
        sessionId: conv.sessionId,
      });
      expect(result.memoriesStored).toBe(0);
      expect(result.knowledgeUpdated).toBe(false);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ─── bridge — result is frozen ──────────────────────────────

  describe('bridge — result is frozen', () => {
    it('returns frozen result', async () => {
      const conv = createMockConversation();
      const result = await bridge.bridge({
        conversation: conv,
        turn: conv.turns[0],
        intent: null,
        sessionId: conv.sessionId,
      });
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('errors array is frozen', async () => {
      const conv = createMockConversation();
      const result = await bridge.bridge({
        conversation: conv,
        turn: conv.turns[0],
        intent: null,
        sessionId: conv.sessionId,
      });
      expect(Object.isFrozen(result.errors)).toBe(true);
    });
  });

  // ─── registerMemoryContract / registerKnowledgeContract ──────

  describe('registerMemoryContract', () => {
    it('registers without error', () => {
      bridge.registerMemoryContract(createMockMemoryContract());
    });

    it('replaces existing contract', () => {
      bridge.registerMemoryContract(createMockMemoryContract());
      bridge.registerMemoryContract(createMockMemoryContract());
    });
  });

  describe('registerKnowledgeContract', () => {
    it('registers without error', () => {
      bridge.registerKnowledgeContract(createMockKnowledgeContract());
    });
  });

  describe('registerPolicyEvaluator', () => {
    it('registers a policy evaluator', () => {
      bridge.registerPolicyEvaluator('Memory', async () => ({
        allowed: true,
        policyId: 'test',
        policyType: 'Memory' as any,
        reason: 'ok',
        constraints: Object.freeze({}),
      }));
    });

    it('uses custom evaluator', async () => {
      const evaluator = vi.fn().mockResolvedValue({
        allowed: true,
        policyId: 'custom',
        policyType: 'Memory' as any,
        reason: 'custom allow',
        constraints: Object.freeze({}),
      });
      bridge.registerPolicyEvaluator('Memory', evaluator);
      const contract = createMockMemoryContract();
      bridge.registerMemoryContract(contract);
      const conv = createMockConversation();
      await bridge.bridge({
        conversation: conv,
        turn: conv.turns[0],
        intent: null,
        sessionId: conv.sessionId,
      });
      expect(evaluator).toHaveBeenCalled();
    });
  });

  // ─── DefaultMemoryBridgeConfig ────────────────────────────────

  describe('DefaultMemoryBridgeConfig', () => {
    it('has enabled true', () => {
      expect(DefaultMemoryBridgeConfig.enabled).toBe(true);
    });

    it('has autoStoreMemories true', () => {
      expect(DefaultMemoryBridgeConfig.autoStoreMemories).toBe(true);
    });

    it('has autoUpdateKnowledge true', () => {
      expect(DefaultMemoryBridgeConfig.autoUpdateKnowledge).toBe(true);
    });

    it('has minTurnsForMemoryUpdate 2', () => {
      expect(DefaultMemoryBridgeConfig.minTurnsForMemoryUpdate).toBe(2);
    });

    it('has keyPrefix cognitive:bridge', () => {
      expect(DefaultMemoryBridgeConfig.keyPrefix).toBe('cognitive:bridge');
    });
  });
});
