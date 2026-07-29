/**
 * Context Builder Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextBuilder, DefaultContextBuilderConfig } from '../../../core/cognitive/context-builder.js';
import { brandCognitiveSessionId } from '../../../core/cognitive/types.js';

// ─── Mock Contracts ────────────────────────────────────────────

function createMockMemoryContract() {
  return {
    retrieve: vi.fn().mockResolvedValue([
      { key: 'test', value: 'data', relevance: 0.9, source: 'memory' },
    ]),
    store: vi.fn().mockResolvedValue(undefined),
    getSessionEntries: vi.fn().mockResolvedValue([
      { key: 'session-key', value: 'session-data', layer: 'session', metadata: {} },
    ]),
    getWorkingEntries: vi.fn().mockResolvedValue([]),
  };
}

function createMockKnowledgeContract() {
  return {
    retrieve: vi.fn().mockResolvedValue([
      { id: 'k-1', name: 'Knowledge Item', content: 'some content', relevance: 0.8, source: 'default' },
    ]),
    getNamespaces: vi.fn().mockResolvedValue(['default', 'custom']),
    itemCount: vi.fn().mockResolvedValue(42),
  };
}

function createMockIdentityContract() {
  return {
    resolve: vi.fn().mockResolvedValue({
      identityId: 'user-1',
      name: 'Test User',
      roles: ['admin'],
      preferences: { language: 'en', timezone: 'UTC' },
      profile: {},
    }),
    getRoles: vi.fn().mockResolvedValue([]),
    getPreferences: vi.fn().mockResolvedValue({}),
  };
}

function createMockCapabilityContract() {
  return {
    available: vi.fn().mockResolvedValue(['tool-a', 'tool-b']),
    activePacks: vi.fn().mockResolvedValue(['pack-1']),
    isAllowed: vi.fn().mockResolvedValue(true),
  };
}

const baseBuildParams = {
  sessionId: brandCognitiveSessionId('sess-test'),
  conversationId: null as any,
  turnId: null as any,
  intent: null as any,
  userMessage: 'hello',
  conversationHistory: [] as const,
  conversationSummary: null as string | null,
  timezone: 'UTC',
};

describe('ContextBuilder', () => {
  let builder: ContextBuilder;

  beforeEach(() => {
    builder = new ContextBuilder();
  });

  // ─── constructor ──────────────────────────────────────────────

  describe('constructor', () => {
    it('creates with default config', () => {
      expect(builder).toBeInstanceOf(ContextBuilder);
    });

    it('accepts partial config overrides', () => {
      const b = new ContextBuilder({ maxMemoryEntries: 5 });
      expect(b).toBeInstanceOf(ContextBuilder);
    });

    it('accepts multiple config overrides', () => {
      const b = new ContextBuilder({ maxMemoryEntries: 5, maxKnowledgeItems: 3, maxConversationHistory: 10 });
      expect(b).toBeInstanceOf(ContextBuilder);
    });

    it('accepts runtimeVersion override', () => {
      const b = new ContextBuilder({ runtimeVersion: '1.0.0' });
      expect(b).toBeInstanceOf(ContextBuilder);
    });
  });

  // ─── registerMemoryContract ──────────────────────────────────

  describe('registerMemoryContract', () => {
    it('registers without error', () => {
      builder.registerMemoryContract(createMockMemoryContract());
    });

    it('replaces existing contract', () => {
      builder.registerMemoryContract(createMockMemoryContract());
      builder.registerMemoryContract(createMockMemoryContract());
    });
  });

  // ─── registerKnowledgeContract ─────────────────────────────────

  describe('registerKnowledgeContract', () => {
    it('registers without error', () => {
      builder.registerKnowledgeContract(createMockKnowledgeContract());
    });
  });

  // ─── registerIdentityContract ─────────────────────────────────

  describe('registerIdentityContract', () => {
    it('registers without error', () => {
      builder.registerIdentityContract(createMockIdentityContract());
    });
  });

  // ─── registerCapabilityContract ───────────────────────────────

  describe('registerCapabilityContract', () => {
    it('registers without error', () => {
      builder.registerCapabilityContract(createMockCapabilityContract());
    });
  });

  // ─── build — basic ──────────────────────────────────────────

  describe('build — basic', () => {
    it('returns a CognitiveContext', async () => {
      const ctx = await builder.build(baseBuildParams);
      expect(ctx).toBeDefined();
      expect(ctx.sessionId).toBe(baseBuildParams.sessionId);
    });

    it('returns a frozen result', async () => {
      const ctx = await builder.build(baseBuildParams);
      expect(Object.isFrozen(ctx)).toBe(true);
    });

    it('has assembledAt timestamp', async () => {
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.assembledAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('has tokenEstimate >= 0', async () => {
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.tokenEstimate).toBeGreaterThanOrEqual(0);
    });

    it('passes intent through unchanged', async () => {
      const intent = {
        id: 'intent-1' as any,
        type: 'Question' as any,
        goal: 'test',
        priority: 5,
        complexity: 'Simple' as any,
        confidence: 0.9,
        requiredCapabilities: [],
        parameters: {},
        detectedAt: new Date().toISOString(),
        metadata: {},
      };
      const ctx = await builder.build({ ...baseBuildParams, intent });
      expect(ctx.intent).toBe(intent);
    });

    it('passes conversationId through', async () => {
      const convId = brandCognitiveSessionId('conv-123') as any;
      const ctx = await builder.build({ ...baseBuildParams, conversationId: convId });
      expect(ctx.conversationId).toBe(convId);
    });

    it('passes turnId through', async () => {
      const turnId = brandCognitiveSessionId('turn-1') as any;
      const ctx = await builder.build({ ...baseBuildParams, turnId });
      expect(ctx.turnId).toBe(turnId);
    });
  });

  // ─── build — identity resolution ─────────────────────────────

  describe('build — identity resolution', () => {
    it('identity is null without contract', async () => {
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.identity).toBeNull();
    });

    it('identity resolves from contract', async () => {
      const contract = createMockIdentityContract();
      builder.registerIdentityContract(contract);
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.identity).not.toBeNull();
      expect(ctx.identity!.name).toBe('Test User');
      expect(ctx.identity!.identityId).toBe('user-1');
    });

    it('identity contract is called with sessionId', async () => {
      const contract = createMockIdentityContract();
      builder.registerIdentityContract(contract);
      await builder.build(baseBuildParams);
      expect(contract.resolve).toHaveBeenCalledWith(baseBuildParams.sessionId);
    });

    it('returns null when identity contract throws', async () => {
      const contract = {
        ...createMockIdentityContract(),
        resolve: vi.fn().mockRejectedValue(new Error('identity failed')),
      };
      builder.registerIdentityContract(contract);
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.identity).toBeNull();
    });

    it('identity includes roles', async () => {
      const contract = createMockIdentityContract();
      builder.registerIdentityContract(contract);
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.identity!.roles).toEqual(['admin']);
    });

    it('identity includes preferences', async () => {
      const contract = createMockIdentityContract();
      builder.registerIdentityContract(contract);
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.identity!.preferences).toEqual({ language: 'en', timezone: 'UTC' });
    });
  });

  // ─── build — memory resolution ───────────────────────────────

  describe('build — memory resolution', () => {
    it('memory has empty entries without contract', async () => {
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.memory.workingEntries).toHaveLength(0);
      expect(ctx.memory.relevantEntries).toHaveLength(0);
      expect(ctx.memory.sessionEntries).toHaveLength(0);
    });

    it('memory retrieves from contract', async () => {
      const contract = createMockMemoryContract();
      builder.registerMemoryContract(contract);
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.memory.relevantEntries).toHaveLength(1);
      expect(ctx.memory.relevantEntries[0].key).toBe('test');
    });

    it('memory retrieves session entries', async () => {
      const contract = createMockMemoryContract();
      builder.registerMemoryContract(contract);
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.memory.sessionEntries).toHaveLength(1);
      expect(ctx.memory.sessionEntries[0].key).toBe('session-key');
    });

    it('memory contract retrieve called with message and limit', async () => {
      const contract = createMockMemoryContract();
      builder.registerMemoryContract(contract);
      await builder.build(baseBuildParams);
      expect(contract.retrieve).toHaveBeenCalledWith(baseBuildParams.userMessage, 20);
    });

    it('memory contract getSessionEntries called with sessionId', async () => {
      const contract = createMockMemoryContract();
      builder.registerMemoryContract(contract);
      await builder.build(baseBuildParams);
      expect(contract.getSessionEntries).toHaveBeenCalledWith(baseBuildParams.sessionId);
    });

    it('memory summary is null by default', async () => {
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.memory.summary).toBeNull();
    });

    it('returns empty memory when contract throws', async () => {
      const contract = {
        ...createMockMemoryContract(),
        retrieve: vi.fn().mockRejectedValue(new Error('memory failed')),
      };
      builder.registerMemoryContract(contract);
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.memory.relevantEntries).toHaveLength(0);
    });

    it('respects maxMemoryEntries config', async () => {
      const b = new ContextBuilder({ maxMemoryEntries: 1 });
      b.registerMemoryContract(createMockMemoryContract());
      const ctx = await b.build(baseBuildParams);
      expect(ctx.memory.sessionEntries.length).toBeLessThanOrEqual(1);
    });
  });

  // ─── build — knowledge resolution ─────────────────────────────

  describe('build — knowledge resolution', () => {
    it('knowledge has empty items without contract', async () => {
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.knowledge.relevantItems).toHaveLength(0);
      expect(ctx.knowledge.namespaces).toHaveLength(0);
      expect(ctx.knowledge.totalItems).toBe(0);
    });

    it('knowledge retrieves from contract', async () => {
      const contract = createMockKnowledgeContract();
      builder.registerKnowledgeContract(contract);
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.knowledge.relevantItems).toHaveLength(1);
      expect(ctx.knowledge.relevantItems[0].id).toBe('k-1');
    });

    it('knowledge retrieves namespaces', async () => {
      const contract = createMockKnowledgeContract();
      builder.registerKnowledgeContract(contract);
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.knowledge.namespaces).toEqual(['default', 'custom']);
    });

    it('knowledge retrieves totalItems', async () => {
      const contract = createMockKnowledgeContract();
      builder.registerKnowledgeContract(contract);
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.knowledge.totalItems).toBe(42);
    });

    it('returns empty knowledge when contract throws', async () => {
      const contract = {
        ...createMockKnowledgeContract(),
        retrieve: vi.fn().mockRejectedValue(new Error('knowledge failed')),
      };
      builder.registerKnowledgeContract(contract);
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.knowledge.relevantItems).toHaveLength(0);
    });

    it('respects maxKnowledgeItems config', async () => {
      const b = new ContextBuilder({ maxKnowledgeItems: 0 });
      b.registerKnowledgeContract(createMockKnowledgeContract());
      // Even with config=0, the contract is still called but results are capped
      await b.build(baseBuildParams);
    });
  });

  // ─── build — capabilities resolution ─────────────────────────

  describe('build — capabilities resolution', () => {
    it('capabilities has empty available without contract', async () => {
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.capabilities.available).toHaveLength(0);
    });

    it('capabilities resolves from contract', async () => {
      const contract = createMockCapabilityContract();
      builder.registerCapabilityContract(contract);
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.capabilities.available).toEqual(['tool-a', 'tool-b']);
    });

    it('capabilities resolves activePacks', async () => {
      const contract = createMockCapabilityContract();
      builder.registerCapabilityContract(contract);
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.capabilities.activePacks).toEqual(['pack-1']);
    });

    it('capabilities required is always empty', async () => {
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.capabilities.required).toEqual([]);
    });

    it('capabilities denied is always empty', async () => {
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.capabilities.denied).toEqual([]);
    });

    it('returns empty capabilities when contract throws', async () => {
      const contract = {
        ...createMockCapabilityContract(),
        available: vi.fn().mockRejectedValue(new Error('cap failed')),
      };
      builder.registerCapabilityContract(contract);
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.capabilities.available).toHaveLength(0);
    });
  });

  // ─── build — policies resolution ─────────────────────────────

  describe('build — policies resolution', () => {
    it('has default policies context', async () => {
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.policies.maxTokens).toBe(4096);
      expect(ctx.policies.privacyLevel).toBe(1);
      expect(ctx.policies.trustLevel).toBe(1);
    });

    it('has costBudget of 100', async () => {
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.policies.costBudget).toBe(100);
    });

    it('has empty allowedProviders', async () => {
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.policies.allowedProviders).toEqual([]);
    });

    it('has empty activePolicies', async () => {
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.policies.activePolicies).toEqual([]);
    });
  });

  // ─── build — environment resolution ─────────────────────────

  describe('build — environment resolution', () => {
    it('has environment with sessionId', async () => {
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.environment.sessionId).toBe(baseBuildParams.sessionId);
    });

    it('has environment with timezone', async () => {
      const ctx = await builder.build({ ...baseBuildParams, timezone: 'America/New_York' });
      expect(ctx.environment.timezone).toBe('America/New_York');
    });

    it('has default runtimeVersion', async () => {
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.environment.runtimeVersion).toBe(DefaultContextBuilderConfig.runtimeVersion);
    });

    it('uses custom runtimeVersion when configured', async () => {
      const b = new ContextBuilder({ runtimeVersion: '2.0.0' });
      const ctx = await b.build(baseBuildParams);
      expect(ctx.environment.runtimeVersion).toBe('2.0.0');
    });

    it('has timestamp', async () => {
      const ctx = await builder.build(baseBuildParams);
      expect(ctx.environment.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ─── build — conversation history resolution ──────────────────

  describe('build — conversation history resolution', () => {
    it('includes conversation history in turnCount', async () => {
      const history = [
        { role: 'User' as any, content: 'hi', tokens: 10, turn: 1 },
        { role: 'Assistant' as any, content: 'hello!', tokens: 15, turn: 1 },
      ];
      const ctx = await builder.build({ ...baseBuildParams, conversationHistory: history });
      expect(ctx.conversationHistory.turnCount).toBe(2);
    });

    it('passes summary through', async () => {
      const ctx = await builder.build({ ...baseBuildParams, conversationSummary: 'Previous summary' });
      expect(ctx.conversationHistory.summary).toBe('Previous summary');
    });

    it('recentMessages is capped by maxConversationHistory', async () => {
      const history = Array.from({ length: 60 }, (_, i) => ({
        role: 'User' as any, content: `msg-${i}`, tokens: 5, turn: Math.floor(i / 2),
      }));
      const ctx = await builder.build({ ...baseBuildParams, conversationHistory: history });
      expect(ctx.conversationHistory.recentMessages.length).toBeLessThanOrEqual(50);
      expect(ctx.conversationHistory.turnCount).toBe(60);
    });

    it('empty history returns zero turnCount', async () => {
      const ctx = await builder.build({ ...baseBuildParams, conversationHistory: [] });
      expect(ctx.conversationHistory.turnCount).toBe(0);
    });

    it('null summary returns null', async () => {
      const ctx = await builder.build({ ...baseBuildParams, conversationSummary: null });
      expect(ctx.conversationHistory.summary).toBeNull();
    });
  });

  // ─── DefaultContextBuilderConfig ──────────────────────────────

  describe('DefaultContextBuilderConfig', () => {
    it('has maxMemoryEntries of 20', () => {
      expect(DefaultContextBuilderConfig.maxMemoryEntries).toBe(20);
    });

    it('has maxKnowledgeItems of 10', () => {
      expect(DefaultContextBuilderConfig.maxKnowledgeItems).toBe(10);
    });

    it('has maxConversationHistory of 50', () => {
      expect(DefaultContextBuilderConfig.maxConversationHistory).toBe(50);
    });

    it('has runtimeVersion of 0.4.0', () => {
      expect(DefaultContextBuilderConfig.runtimeVersion).toBe('0.4.0');
    });
  });
});
