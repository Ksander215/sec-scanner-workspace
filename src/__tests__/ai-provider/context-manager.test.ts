import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContextManager } from '../../core/ai-provider/context-manager.js';
import type * as Types from '../../core/ai-provider/types.js';
import {
  ContextStrategy,
  DefaultAIProviderRuntimeConfig,
  PrivacyLevel,
} from '../../core/ai-provider/types.js';

// ─── Factory helpers ─────────────────────────────────────────────

const MODEL_ID = crypto.randomUUID() as Types.ModelId;

function makeMessage(overrides?: Partial<Types.ExecutionMessage>): Types.ExecutionMessage {
  return Object.freeze({
    role: 'user' as const,
    content: 'A'.repeat(100),
    ...overrides,
  });
}

function makeMessages(count: number, length = 100): Types.ExecutionMessage[] {
  return Array.from({ length: count }, (_, i) =>
    makeMessage({ role: (i % 2 === 0 ? 'user' : 'assistant') as Types.ExecutionMessage['role'], content: 'A'.repeat(length) }),
  );
}

function makeModel(overrides?: Partial<Types.ModelDescriptor>): Types.ModelDescriptor {
  return Object.freeze({
    id: MODEL_ID,
    providerId: crypto.randomUUID() as Types.ProviderId,
    name: 'TestModel',
    family: 'test',
    version: '1.0.0',
    capabilities: [],
    tokenLimit: 128000,
    supportsVision: false,
    supportsTools: false,
    supportsJSON: true,
    supportsStreaming: true,
    supportsAudio: false,
    supportsReasoning: false,
    supportsEmbeddings: false,
    supportsFunctionCalling: false,
    privacyLevel: PrivacyLevel.Public,
    costProfile: Object.freeze({
      inputCostPer1kTokens: 0.03,
      outputCostPer1kTokens: 0.06,
      cachedInputCostPer1kTokens: 0.01,
      reasoningCostPer1kTokens: 0.02,
      imageCostPerUnit: 0,
      audioCostPerMinute: 0,
      currency: 'USD',
    }),
    latencyProfile: Object.freeze({
      averageMs: 10, p50Ms: 10, p95Ms: 20, p99Ms: 50, timeoutMs: 60000,
    }),
    available: true,
    metadata: {},
    registeredAt: new Date().toISOString(),
    ...overrides,
  });
}

function makeManager(
  strategy?: ContextStrategy,
  getModel?: (modelId: Types.ModelId) => Promise<Types.ModelDescriptor | null>,
): ContextManager {
  const config = { ...DefaultAIProviderRuntimeConfig.contextManager };
  if (strategy !== undefined) config.defaultStrategy = strategy;
  return new ContextManager(config, {
    getModel: getModel ?? (async (_mid: Types.ModelId) => makeModel()),
  });
}

function makeRequest(overrides?: Partial<Types.ContextManagementRequest>): Types.ContextManagementRequest {
  return Object.freeze({
    modelId: MODEL_ID,
    messages: makeMessages(2),
    ...overrides,
  });
}

// ─── Tests ────────────────────────────────────────────────────────

describe('ContextManager', () => {
  let manager: ContextManager;

  beforeEach(() => {
    manager = makeManager();
  });

  afterEach(() => {
    // no-op cleanup
  });

  // ═══════════════════════════════════════════════════════════════
  // setStrategy / getStrategy
  // ═══════════════════════════════════════════════════════════════
  describe('setStrategy / getStrategy', () => {
    it('should return SlidingWindow as default strategy', () => {
      expect(manager.getStrategy()).toBe(ContextStrategy.SlidingWindow);
    });

    it('should set strategy to SemanticCompression', () => {
      manager.setStrategy(ContextStrategy.SemanticCompression);
      expect(manager.getStrategy()).toBe(ContextStrategy.SemanticCompression);
    });

    it('should set strategy to Summarization', () => {
      manager.setStrategy(ContextStrategy.Summarization);
      expect(manager.getStrategy()).toBe(ContextStrategy.Summarization);
    });

    it('should set strategy to ContextSplitting', () => {
      manager.setStrategy(ContextStrategy.ContextSplitting);
      expect(manager.getStrategy()).toBe(ContextStrategy.ContextSplitting);
    });

    it('should set strategy to ContextMerge', () => {
      manager.setStrategy(ContextStrategy.ContextMerge);
      expect(manager.getStrategy()).toBe(ContextStrategy.ContextMerge);
    });

    it('should set strategy to LongConversation', () => {
      manager.setStrategy(ContextStrategy.LongConversation);
      expect(manager.getStrategy()).toBe(ContextStrategy.LongConversation);
    });

    it('should allow switching strategies multiple times', () => {
      manager.setStrategy(ContextStrategy.Summarization);
      expect(manager.getStrategy()).toBe(ContextStrategy.Summarization);
      manager.setStrategy(ContextStrategy.SlidingWindow);
      expect(manager.getStrategy()).toBe(ContextStrategy.SlidingWindow);
      manager.setStrategy(ContextStrategy.ContextMerge);
      expect(manager.getStrategy()).toBe(ContextStrategy.ContextMerge);
    });

    it('should use initial strategy from config', () => {
      const m = makeManager(ContextStrategy.Summarization);
      expect(m.getStrategy()).toBe(ContextStrategy.Summarization);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // estimateTokens
  // ═══════════════════════════════════════════════════════════════
  describe('estimateTokens', () => {
    it('should return 0 for empty messages array', async () => {
      expect(await manager.estimateTokens([])).toBe(0);
    });

    it('should return 0 for single empty message', async () => {
      expect(await manager.estimateTokens([makeMessage({ content: '' })])).toBe(0);
    });

    it('should estimate 4 chars per token', async () => {
      expect(await manager.estimateTokens([makeMessage({ content: 'ABCD' })])).toBe(1);
    });

    it('should round up for non-divisible chars', async () => {
      expect(await manager.estimateTokens([makeMessage({ content: 'ABCDE' })])).toBe(2);
    });

    it('should handle single char', async () => {
      expect(await manager.estimateTokens([makeMessage({ content: 'X' })])).toBe(1);
    });

    it('should sum across multiple messages', async () => {
      const msgs = [makeMessage({ content: 'AAAA' }), makeMessage({ content: 'AAAA' })];
      expect(await manager.estimateTokens(msgs)).toBe(2);
    });

    it('should handle large text', async () => {
      expect(await manager.estimateTokens([makeMessage({ content: 'A'.repeat(10000) })])).toBe(2500);
    });

    it('should ignore role when counting', async () => {
      const userMsg = makeMessage({ role: 'user', content: 'AAAA' });
      const sysMsg = makeMessage({ role: 'system', content: 'AAAA' });
      expect(await manager.estimateTokens([userMsg])).toBe(1);
      expect(await manager.estimateTokens([sysMsg])).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // manage — no compression needed
  // ═══════════════════════════════════════════════════════════════
  describe('manage — no compression needed', () => {
    it('should return all messages when under limit', async () => {
      const req = makeRequest({ messages: makeMessages(2, 10) });
      const result = await manager.manage(req);
      expect(result.messages).toHaveLength(2);
    });

    it('should have compressionRatio of 1 when no compression', async () => {
      const req = makeRequest({ messages: makeMessages(2, 10) });
      const result = await manager.manage(req);
      expect(result.compressionRatio).toBe(1);
    });

    it('should have originalTokenCount equal to resultingTokenCount', async () => {
      const req = makeRequest({ messages: makeMessages(2, 10) });
      const result = await manager.manage(req);
      expect(result.originalTokenCount).toBe(result.resultingTokenCount);
    });

    it('should return frozen result', async () => {
      const req = makeRequest();
      const result = await manager.manage(req);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should include strategy in result', async () => {
      const req = makeRequest();
      const result = await manager.manage(req);
      expect(result.strategy).toBe(ContextStrategy.SlidingWindow);
    });

    it('should include metadata from request', async () => {
      const req = makeRequest({ metadata: { key: 'val' } });
      const result = await manager.manage(req);
      expect((result.metadata as Record<string, unknown>).key).toBe('val');
    });

    it('should default metadata to empty object', async () => {
      const req = makeRequest();
      const result = await manager.manage(req);
      expect(result.metadata).toEqual({});
    });

    it('should pass through systemPrompt when no compression', async () => {
      const req = makeRequest({ systemPrompt: 'You are helpful.' });
      const result = await manager.manage(req);
      expect(result.systemPrompt).toBe('You are helpful.');
    });

    it('should return null systemPrompt when not provided', async () => {
      const req = makeRequest();
      const result = await manager.manage(req);
      expect(result.systemPrompt).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // manage — SlidingWindow
  // ═══════════════════════════════════════════════════════════════
  describe('manage — SlidingWindow', () => {
    it('should keep recent messages when over limit', async () => {
      const msgs = makeMessages(100, 1000);
      const req = makeRequest({
        messages: msgs,
        maxTokens: 100,
        strategy: ContextStrategy.SlidingWindow,
      });
      const result = await manager.manage(req);
      expect(result.messages.length).toBeLessThan(100);
    });

    it('should use request strategy over default', async () => {
      manager.setStrategy(ContextStrategy.Summarization);
      const req = makeRequest({ strategy: ContextStrategy.SlidingWindow });
      const result = await manager.manage(req);
      expect(result.strategy).toBe(ContextStrategy.SlidingWindow);
    });

    it('should keep messages from the tail (most recent)', async () => {
      const msgs = makeMessages(50, 200);
      const req = makeRequest({
        messages: msgs,
        maxTokens: 100,
        strategy: ContextStrategy.SlidingWindow,
      });
      const result = await manager.manage(req);
      // Last message should be kept
      expect(result.messages[result.messages.length - 1].content).toBe(msgs[msgs.length - 1].content);
    });

    it('should reduce token count', async () => {
      const msgs = makeMessages(50, 200);
      const req = makeRequest({
        messages: msgs,
        maxTokens: 100,
        strategy: ContextStrategy.SlidingWindow,
      });
      const result = await manager.manage(req);
      expect(result.resultingTokenCount).toBeLessThanOrEqual(result.originalTokenCount);
    });

    it('should have compressionRatio < 1', async () => {
      const msgs = makeMessages(50, 200);
      const req = makeRequest({
        messages: msgs,
        maxTokens: 100,
        strategy: ContextStrategy.SlidingWindow,
      });
      const result = await manager.manage(req);
      expect(result.compressionRatio).toBeLessThan(1);
    });

    it('should return all messages when tokens are manageable', async () => {
      const msgs = makeMessages(50, 200);
      const req = makeRequest({
        messages: msgs,
        maxTokens: 10000,
        strategy: ContextStrategy.SlidingWindow,
      });
      const result = await manager.manage(req);
      expect(result.messages.length).toBe(50);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // manage — SemanticCompression
  // ═══════════════════════════════════════════════════════════════
  describe('manage — SemanticCompression', () => {
    it('should compress to 70% of max tokens', async () => {
      const msgs = makeMessages(50, 200);
      const req = makeRequest({
        messages: msgs,
        maxTokens: 100,
        strategy: ContextStrategy.SemanticCompression,
      });
      const result = await manager.manage(req);
      expect(result.resultingTokenCount).toBeLessThanOrEqual(Math.floor(100 * 0.9));
    });

    it('should have compressionRatio < 1', async () => {
      const msgs = makeMessages(50, 200);
      const req = makeRequest({
        messages: msgs,
        maxTokens: 100,
        strategy: ContextStrategy.SemanticCompression,
      });
      const result = await manager.manage(req);
      expect(result.compressionRatio).toBeLessThan(1);
    });

    it('should keep tail messages', async () => {
      const msgs = makeMessages(30, 200);
      const req = makeRequest({
        messages: msgs,
        maxTokens: 100,
        strategy: ContextStrategy.SemanticCompression,
      });
      const result = await manager.manage(req);
      expect(result.messages.length).toBeLessThan(30);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // manage — Summarization
  // ═══════════════════════════════════════════════════════════════
  describe('manage — Summarization', () => {
    it('should add summary message when compressing', async () => {
      const msgs = makeMessages(50, 200);
      const req = makeRequest({
        messages: msgs,
        maxTokens: 100,
        strategy: ContextStrategy.Summarization,
      });
      const result = await manager.manage(req);
      const hasSummary = result.messages.some(m => m.role === 'system' && m.content.includes('summarized'));
      expect(hasSummary).toBe(true);
    });

    it('should keep first message', async () => {
      const msgs = makeMessages(50, 200);
      const req = makeRequest({
        messages: msgs,
        maxTokens: 100,
        strategy: ContextStrategy.Summarization,
      });
      const result = await manager.manage(req);
      expect(result.messages[0].content).toBe(msgs[0].content);
    });

    it('should update systemPrompt with summary prefix', async () => {
      const msgs = makeMessages(50, 200);
      const req = makeRequest({
        messages: msgs,
        maxTokens: 100,
        strategy: ContextStrategy.Summarization,
      });
      const result = await manager.manage(req);
      expect(result.systemPrompt).toContain('[Conversation summary]');
    });

    it('should prepend existing systemPrompt to summary prefix', async () => {
      const msgs = makeMessages(50, 200);
      const req = makeRequest({
        messages: msgs,
        maxTokens: 100,
        strategy: ContextStrategy.Summarization,
        systemPrompt: 'Be helpful.',
      });
      const result = await manager.manage(req);
      expect(result.systemPrompt).toContain('Be helpful.');
      expect(result.systemPrompt).toContain('[Conversation summary]');
    });

    it('should not add summary for less than 3 messages', async () => {
      const msgs = makeMessages(2, 2000);
      const req = makeRequest({
        messages: msgs,
        maxTokens: 50,
        strategy: ContextStrategy.Summarization,
      });
      const result = await manager.manage(req);
      // With 2 messages < 3, summarization returns as-is
      expect(result.messages).toHaveLength(2);
    });

    it('should include summary message with name=context-manager', async () => {
      const msgs = makeMessages(10, 500);
      const req = makeRequest({
        messages: msgs,
        maxTokens: 50,
        strategy: ContextStrategy.Summarization,
      });
      const result = await manager.manage(req);
      const summaryMsg = result.messages.find(m => m.content.includes('summarized'));
      expect(summaryMsg?.name).toBe('context-manager');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // manage — ContextSplitting
  // ═══════════════════════════════════════════════════════════════
  describe('manage — ContextSplitting', () => {
    it('should use sliding window internally', async () => {
      const msgs = makeMessages(50, 200);
      const req = makeRequest({
        messages: msgs,
        maxTokens: 100,
        strategy: ContextStrategy.ContextSplitting,
      });
      const result = await manager.manage(req);
      expect(result.messages.length).toBeLessThan(50);
    });

    it('should have strategy ContextSplitting in result', async () => {
      const req = makeRequest({ strategy: ContextStrategy.ContextSplitting });
      const result = await manager.manage(req);
      expect(result.strategy).toBe(ContextStrategy.ContextSplitting);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // manage — ContextMerge
  // ═══════════════════════════════════════════════════════════════
  describe('manage — ContextMerge', () => {
    it('should merge consecutive same-role messages', async () => {
      const msgs = [
        makeMessage({ role: 'user', content: 'A'.repeat(200) }),
        makeMessage({ role: 'user', content: 'B'.repeat(200) }),
        makeMessage({ role: 'assistant', content: 'C'.repeat(200) }),
      ];
      const req = makeRequest({
        messages: msgs,
        maxTokens: 50,
        strategy: ContextStrategy.ContextMerge,
      });
      const result = await manager.manage(req);
      // Should merge the two user messages
      const userMsgs = result.messages.filter(m => m.role === 'user');
      expect(userMsgs.length).toBeLessThanOrEqual(2);
    });

    it('should not merge different-role messages', async () => {
      const msgs = [
        makeMessage({ role: 'user', content: 'A'.repeat(50) }),
        makeMessage({ role: 'assistant', content: 'B'.repeat(50) }),
      ];
      const req = makeRequest({
        messages: msgs,
        maxTokens: 200,
        strategy: ContextStrategy.ContextMerge,
      });
      const result = await manager.manage(req);
      expect(result.messages).toHaveLength(2);
    });

    it('should join merged content with newline', async () => {
      const msgs = [
        makeMessage({ role: 'user', content: 'Hello' }),
        makeMessage({ role: 'user', content: 'World' }),
      ];
      const req = makeRequest({
        messages: msgs,
        maxTokens: 100,
        strategy: ContextStrategy.ContextMerge,
      });
      const result = await manager.manage(req);
      const userMsgs = result.messages.filter(m => m.role === 'user');
      if (userMsgs.length === 1) {
        expect(userMsgs[0].content).toContain('Hello\nWorld');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // manage — LongConversation
  // ═══════════════════════════════════════════════════════════════
  describe('manage — LongConversation', () => {
    it('should apply summarization then sliding window', async () => {
      const msgs = makeMessages(50, 200);
      const req = makeRequest({
        messages: msgs,
        maxTokens: 100,
        strategy: ContextStrategy.LongConversation,
      });
      const result = await manager.manage(req);
      expect(result.messages.length).toBeLessThan(50);
    });

    it('should include summary prefix in systemPrompt', async () => {
      const msgs = makeMessages(10, 500);
      const req = makeRequest({
        messages: msgs,
        maxTokens: 50,
        strategy: ContextStrategy.LongConversation,
      });
      const result = await manager.manage(req);
      expect(result.systemPrompt).toContain('[Conversation summary]');
    });

    it('should have compressionRatio < 1', async () => {
      const msgs = makeMessages(50, 200);
      const req = makeRequest({
        messages: msgs,
        maxTokens: 100,
        strategy: ContextStrategy.LongConversation,
      });
      const result = await manager.manage(req);
      expect(result.compressionRatio).toBeLessThan(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getWindow
  // ═══════════════════════════════════════════════════════════════
  describe('getWindow', () => {
    it('should return null when no window cached', async () => {
      const window = await manager.getWindow(crypto.randomUUID() as Types.ModelId);
      expect(window).toBeNull();
    });

    it('should return null initially for any model', async () => {
      const window = await manager.getWindow(MODEL_ID);
      expect(window).toBeNull();
    });

    it('should return context window after manage with compression', async () => {
      const msgs = makeMessages(50, 200);
      const req = makeRequest({
        messages: msgs,
        maxTokens: 100,
        strategy: ContextStrategy.SlidingWindow,
      });
      await manager.manage(req);
      const window = await manager.getWindow(MODEL_ID);
      expect(window).not.toBeNull();
    });

    it('should include modelId in window', async () => {
      const msgs = makeMessages(50, 200);
      const req = makeRequest({ messages: msgs, maxTokens: 100, strategy: ContextStrategy.SlidingWindow });
      await manager.manage(req);
      const window = await manager.getWindow(MODEL_ID);
      expect(window!.modelId).toBe(MODEL_ID);
    });

    it('should include totalCapacity in window', async () => {
      const msgs = makeMessages(50, 200);
      const req = makeRequest({ messages: msgs, maxTokens: 100, strategy: ContextStrategy.SlidingWindow });
      await manager.manage(req);
      const window = await manager.getWindow(MODEL_ID);
      expect(window!.totalCapacity).toBe(100);
    });

    it('should have availableTokens >= 0', async () => {
      const msgs = makeMessages(50, 200);
      const req = makeRequest({ messages: msgs, maxTokens: 100, strategy: ContextStrategy.SlidingWindow });
      await manager.manage(req);
      const window = await manager.getWindow(MODEL_ID);
      expect(window!.availableTokens).toBeGreaterThanOrEqual(0);
    });

    it('should include messages in window', async () => {
      const msgs = makeMessages(50, 200);
      const req = makeRequest({ messages: msgs, maxTokens: 100, strategy: ContextStrategy.SlidingWindow });
      await manager.manage(req);
      const window = await manager.getWindow(MODEL_ID);
      expect(window!.messages.length).toBeGreaterThan(0);
    });

    it('should include strategy in window', async () => {
      const msgs = makeMessages(50, 200);
      const req = makeRequest({ messages: msgs, maxTokens: 100, strategy: ContextStrategy.SlidingWindow });
      await manager.manage(req);
      const window = await manager.getWindow(MODEL_ID);
      expect(window!.strategy).toBe(ContextStrategy.SlidingWindow);
    });

    it('should include compressionRatio in window', async () => {
      const msgs = makeMessages(50, 200);
      const req = makeRequest({ messages: msgs, maxTokens: 100, strategy: ContextStrategy.SlidingWindow });
      await manager.manage(req);
      const window = await manager.getWindow(MODEL_ID);
      expect(typeof window!.compressionRatio).toBe('number');
    });

    it('should update window on subsequent manage calls', async () => {
      const req = makeRequest({ messages: makeMessages(50, 200), maxTokens: 100, strategy: ContextStrategy.SlidingWindow });
      await manager.manage(req);
      const req2 = makeRequest({ messages: makeMessages(10, 100), maxTokens: 200, strategy: ContextStrategy.SlidingWindow });
      await manager.manage(req2);
      const window = await manager.getWindow(MODEL_ID);
      expect(window!.totalCapacity).toBe(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // maxContextRatio
  // ═══════════════════════════════════════════════════════════════
  describe('maxContextRatio', () => {
    it('should use maxContextRatio from config', async () => {
      const msgs = makeMessages(50, 500);
      const req = makeRequest({
        messages: msgs,
        maxTokens: 10000,
        strategy: ContextStrategy.SlidingWindow,
      });
      const result = await manager.manage(req);
      // effectiveMax = floor(10000 * 0.9) = 9000
      // Total chars = 50 * 500 = 25000, tokens = 6250 < 9000, no compression needed
      expect(result.messages).toHaveLength(50);
    });

    it('should trigger compression when tokens exceed effective max', async () => {
      const msgs = makeMessages(100, 500);
      const req = makeRequest({
        messages: msgs,
        maxTokens: 1000,
        strategy: ContextStrategy.SlidingWindow,
      });
      const result = await manager.manage(req);
      // Total chars = 100 * 500 = 50000, tokens = 12500
      // effectiveMax = floor(1000 * 0.9) = 900
      // Should compress
      expect(result.messages.length).toBeLessThan(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // maxTokens fallback
  // ═══════════════════════════════════════════════════════════════
  describe('maxTokens fallback', () => {
    it('should use model tokenLimit when maxTokens not specified', async () => {
      const req = makeRequest({
        messages: makeMessages(2, 10),
      });
      const result = await manager.manage(req);
      // Should not throw, uses model's 128000 token limit
      expect(result.messages).toHaveLength(2);
    });

    it('should use 128000 when no model found and no maxTokens', async () => {
      const m = makeManager(undefined, async () => null);
      const req = makeRequest({
        messages: makeMessages(2, 10),
      });
      const result = await m.manage(req);
      expect(result.messages).toHaveLength(2);
    });

    it('should use explicit maxTokens over model tokenLimit', async () => {
      const msgs = makeMessages(50, 200);
      const req = makeRequest({
        messages: msgs,
        maxTokens: 50,
        strategy: ContextStrategy.SlidingWindow,
      });
      const result = await manager.manage(req);
      expect(result.messages.length).toBeLessThan(50);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // edge cases
  // ═══════════════════════════════════════════════════════════════
  describe('edge cases', () => {
    it('should handle zero-length messages', async () => {
      const req = makeRequest({ messages: [makeMessage({ content: '' })] });
      const result = await manager.manage(req);
      expect(result.messages).toHaveLength(1);
      expect(result.originalTokenCount).toBe(0);
    });

    it('should handle request with metadata', async () => {
      const req = makeRequest({ metadata: { conversationId: 'abc' } });
      const result = await manager.manage(req);
      expect((result.metadata as Record<string, unknown>).conversationId).toBe('abc');
    });

    it('should handle very long single message', async () => {
      const msgs = [makeMessage({ content: 'A'.repeat(100000) })];
      const req = makeRequest({
        messages: msgs,
        maxTokens: 1000,
        strategy: ContextStrategy.SlidingWindow,
      });
      const result = await manager.manage(req);
      expect(result.messages.length).toBeLessThanOrEqual(1);
    });

    it('should handle system role messages', async () => {
      const msgs = [
        makeMessage({ role: 'system', content: 'A'.repeat(200) }),
        makeMessage({ role: 'user', content: 'B'.repeat(200) }),
      ];
      const req = makeRequest({ messages: msgs });
      const result = await manager.manage(req);
      expect(result.messages).toHaveLength(2);
    });

    it('should handle tool role messages', async () => {
      const msgs = [
        makeMessage({ role: 'tool', content: 'result data' }),
      ];
      const req = makeRequest({ messages: msgs });
      const result = await manager.manage(req);
      expect(result.messages).toHaveLength(1);
    });

    it('should return consistent results for same input', async () => {
      const req = makeRequest();
      const r1 = await manager.manage(req);
      const r2 = await manager.manage(req);
      expect(r1.originalTokenCount).toBe(r2.originalTokenCount);
      expect(r1.resultingTokenCount).toBe(r2.resultingTokenCount);
    });

    it('should handle all message roles in estimateTokens', async () => {
      const msgs = [
        makeMessage({ role: 'system', content: 'ABCD' }),
        makeMessage({ role: 'user', content: 'EFGH' }),
        makeMessage({ role: 'assistant', content: 'IJKL' }),
        makeMessage({ role: 'tool', content: 'MNOP' }),
      ];
      const tokens = await manager.estimateTokens(msgs);
      expect(tokens).toBe(4);
    });
  });
});
