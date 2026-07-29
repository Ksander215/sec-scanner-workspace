/**
 * Prompt Composer Tests — TASK-AIS-003I.000
 *
 * Tests the PromptComposer which creates structured PromptContext objects
 * from CognitiveContext. The PromptContext is NOT a string — it is an object.
 *
 * Conforms to: ARC-001.001, DOM-002.000
 */

import { PromptComposer, DefaultPromptComposerConfig } from '../../../core/cognitive/prompt-composer.js';
import { brandCognitiveSessionId, brandConversationId } from '../../../core/cognitive/types.js';
import type { CognitiveContext, CognitiveIdentityContext } from '../../../core/cognitive/types.js';
import { DefaultCognitiveRuntimeConfig } from '../../../core/cognitive/types.js';
import { MessageRole } from '../../../core/cognitive/types.js';

// ─── Helpers ─────────────────────────────────────────────────────

function createMinimalCognitiveContext(overrides?: Partial<CognitiveContext>): CognitiveContext {
  const sessionId = brandCognitiveSessionId(crypto.randomUUID());
  return Object.freeze({
    sessionId,
    conversationId: null,
    turnId: null,
    intent: null,
    identity: null,
    memory: Object.freeze({
      workingEntries: [],
      sessionEntries: [],
      relevantEntries: [],
      summary: null,
    }),
    knowledge: Object.freeze({
      relevantItems: [],
      namespaces: [],
      totalItems: 0,
    }),
    capabilities: Object.freeze({
      available: [],
      required: [],
      denied: [],
      activePacks: [],
    }),
    policies: Object.freeze({
      maxTokens: 4096,
      allowedProviders: [],
      privacyLevel: 1,
      trustLevel: 1,
      costBudget: 10,
      activePolicies: [],
    }),
    environment: Object.freeze({
      runtimeVersion: '1.0.0',
      sessionId: sessionId,
      timezone: 'UTC',
      timestamp: new Date().toISOString(),
    }),
    conversationHistory: Object.freeze({
      turnCount: 0,
      recentMessages: [],
      summary: null,
    }),
    assembledAt: new Date().toISOString(),
    tokenEstimate: 0,
    ...overrides,
  });
}

function createIdentityContext(): CognitiveIdentityContext {
  return Object.freeze({
    identityId: 'user-001',
    name: 'Test User',
    roles: Object.freeze(['admin', 'developer']),
    preferences: Object.freeze({
      language: 'en',
      timezone: 'America/New_York',
      verbosity: 'concise',
      explanationLevel: 'advanced',
      answerStyle: 'technical',
      creativity: 0.5,
    }),
    profile: Object.freeze({}),
  });
}

// ─── DefaultPromptComposerConfig ──────────────────────────────────

describe('DefaultPromptComposerConfig', () => {
  it('has systemInstructions', () => {
    expect(DefaultPromptComposerConfig.systemInstructions).toBeTruthy();
  });

  it('has maxHistoryMessages > 0', () => {
    expect(DefaultPromptComposerConfig.maxHistoryMessages).toBeGreaterThan(0);
  });

  it('has runtimeConfig', () => {
    expect(DefaultPromptComposerConfig.runtimeConfig).toBeDefined();
    expect(DefaultPromptComposerConfig.runtimeConfig).toBe(DefaultCognitiveRuntimeConfig);
  });
});

// ─── PromptComposer ───────────────────────────────────────────────

describe('PromptComposer', () => {
  let composer: PromptComposer;

  beforeEach(() => {
    composer = new PromptComposer();
  });

  // ─── compose ───────────────────────────────────────────────────

  describe('compose', () => {
    it('creates a complete PromptContext', () => {
      const ctx = createMinimalCognitiveContext();
      const prompt = composer.compose(ctx, 'Hello');

      expect(prompt).toBeDefined();
      expect(prompt.id).toBeTruthy();
      expect(prompt.systemInstructions).toBeTruthy();
      expect(prompt.userMessage).toBe('Hello');
      expect(prompt.createdAt).toBeTruthy();
      expect(prompt.identity).toBeDefined();
      expect(prompt.preferences).toBeDefined();
      expect(prompt.intent).toBeNull();
      expect(prompt.memory).toBeDefined();
      expect(prompt.knowledge).toBeDefined();
      expect(prompt.capabilities).toBeDefined();
      expect(prompt.policies).toBeDefined();
      expect(prompt.constraints).toBeDefined();
      expect(prompt.environment).toBeDefined();
      expect(prompt.conversation).toBeDefined();
    });

    it('prompt id is a branded string', () => {
      const ctx = createMinimalCognitiveContext();
      const prompt = composer.compose(ctx, 'Hello');
      expect(typeof prompt.id).toBe('string');
      expect(prompt.id.length).toBeGreaterThan(0);
    });

    it('prompt is frozen', () => {
      const ctx = createMinimalCognitiveContext();
      const prompt = composer.compose(ctx, 'Hello');
      expect(Object.isFrozen(prompt)).toBe(true);
    });

    it('sets createdAt to a valid ISO timestamp', () => {
      const before = new Date().toISOString();
      const ctx = createMinimalCognitiveContext();
      const prompt = composer.compose(ctx, 'Hello');
      const after = new Date().toISOString();
      expect(prompt.createdAt >= before && prompt.createdAt <= after).toBe(true);
    });

    it('passes through the intent from context', () => {
      const intent = Object.freeze({
        id: 'intent-1' as any,
        type: 'Question' as any,
        goal: 'answer question',
        priority: 1,
        complexity: 'Simple' as any,
        confidence: 0.95,
        requiredCapabilities: [],
        parameters: {},
        detectedAt: new Date().toISOString(),
        metadata: {},
      });
      const ctx = createMinimalCognitiveContext({ intent });
      const prompt = composer.compose(ctx, 'What is AI?');
      expect(prompt.intent).toBe(intent);
    });

    it('metadata includes sessionId and conversationId', () => {
      const sessionId = brandCognitiveSessionId('session-123');
      const conversationId = brandConversationId('conv-456');
      const ctx = createMinimalCognitiveContext({ sessionId, conversationId });
      const prompt = composer.compose(ctx, 'Hi');
      expect(prompt.metadata.sessionId).toBe(sessionId);
      expect(prompt.metadata.conversationId).toBe(conversationId);
    });
  });

  // ─── Identity section ────────────────────────────────────────

  describe('identity section', () => {
    it('returns anonymous identity when context has no identity', () => {
      const ctx = createMinimalCognitiveContext({ identity: null });
      const prompt = composer.compose(ctx, 'Hello');
      expect(prompt.identity.identityId).toBe('anonymous');
      expect(prompt.identity.name).toBe('Anonymous');
      expect(prompt.identity.roles).toEqual([]);
    });

    it('returns identity from context when present', () => {
      const identity = createIdentityContext();
      const ctx = createMinimalCognitiveContext({ identity });
      const prompt = composer.compose(ctx, 'Hello');

      expect(prompt.identity.identityId).toBe('user-001');
      expect(prompt.identity.name).toBe('Test User');
      expect(prompt.identity.roles).toEqual(['admin', 'developer']);
    });

    it('permissions is always empty array', () => {
      const ctx = createMinimalCognitiveContext({ identity: createIdentityContext() });
      const prompt = composer.compose(ctx, 'Hello');
      expect(prompt.identity.permissions).toEqual([]);
    });
  });

  // ─── Preferences section ─────────────────────────────────────

  describe('preferences section', () => {
    it('returns default preferences when no identity', () => {
      const ctx = createMinimalCognitiveContext({ identity: null });
      const prompt = composer.compose(ctx, 'Hello');
      expect(prompt.preferences.language).toBe('en');
      expect(prompt.preferences.timezone).toBe('UTC');
      expect(prompt.preferences.verbosity).toBe('normal');
      expect(prompt.preferences.explanationLevel).toBe('standard');
      expect(prompt.preferences.answerStyle).toBe('professional');
      expect(prompt.preferences.creativity).toBe(0.7);
    });

    it('returns identity preferences when present', () => {
      const identity = createIdentityContext();
      const ctx = createMinimalCognitiveContext({ identity });
      const prompt = composer.compose(ctx, 'Hello');

      expect(prompt.preferences.language).toBe('en');
      expect(prompt.preferences.timezone).toBe('America/New_York');
      expect(prompt.preferences.verbosity).toBe('concise');
      expect(prompt.preferences.explanationLevel).toBe('advanced');
      expect(prompt.preferences.answerStyle).toBe('technical');
      expect(prompt.preferences.creativity).toBe(0.5);
    });

    it('custom is always empty object', () => {
      const ctx = createMinimalCognitiveContext();
      const prompt = composer.compose(ctx, 'Hello');
      expect(prompt.preferences.custom).toEqual({});
    });
  });

  // ─── Memory section ───────────────────────────────────────────

  describe('memory section', () => {
    it('passes through session entries', () => {
      const sessionEntry = Object.freeze({
        key: 'session-key',
        value: 'session-value',
        layer: 'session',
      });
      const ctx = createMinimalCognitiveContext({
        memory: Object.freeze({
          workingEntries: [],
          sessionEntries: [sessionEntry],
          relevantEntries: [],
          summary: null,
        }),
      });
      const prompt = composer.compose(ctx, 'Hello');
      expect(prompt.memory.sessionEntries.length).toBe(1);
      expect(prompt.memory.sessionEntries[0]!.key).toBe('session-key');
    });

    it('passes through relevant entries', () => {
      const relevantEntry = Object.freeze({
        key: 'rel-key',
        value: 'rel-value',
        relevance: 0.9,
        source: 'long-term',
      });
      const ctx = createMinimalCognitiveContext({
        memory: Object.freeze({
          workingEntries: [],
          sessionEntries: [],
          relevantEntries: [relevantEntry],
          summary: 'Previous summary',
        }),
      });
      const prompt = composer.compose(ctx, 'Hello');
      expect(prompt.memory.relevantMemories.length).toBe(1);
      expect(prompt.memory.summary).toBe('Previous summary');
    });

    it('workingEntries is always empty', () => {
      const ctx = createMinimalCognitiveContext();
      const prompt = composer.compose(ctx, 'Hello');
      expect(prompt.memory.workingEntries).toEqual([]);
    });
  });

  // ─── Knowledge section ───────────────────────────────────────

  describe('knowledge section', () => {
    it('passes through relevant items', () => {
      const item = Object.freeze({
        id: 'k-1',
        name: 'AI Basics',
        content: 'AI is...',
        relevance: 0.8,
        source: 'knowledge-base',
      });
      const ctx = createMinimalCognitiveContext({
        knowledge: Object.freeze({
          relevantItems: [item],
          namespaces: ['general'],
          totalItems: 1,
        }),
      });
      const prompt = composer.compose(ctx, 'Hello');
      expect(prompt.knowledge.relevantItems.length).toBe(1);
      expect(prompt.knowledge.namespaces).toEqual(['general']);
    });

    it('computes confidence as average relevance', () => {
      const items = Object.freeze([
        Object.freeze({ id: 'k-1', name: 'A', content: 'a', relevance: 0.6, source: 's' }),
        Object.freeze({ id: 'k-2', name: 'B', content: 'b', relevance: 1.0, source: 's' }),
      ]);
      const ctx = createMinimalCognitiveContext({
        knowledge: Object.freeze({
          relevantItems: items,
          namespaces: [],
          totalItems: 2,
        }),
      });
      const prompt = composer.compose(ctx, 'Hello');
      // (0.6 + 1.0) / 2 = 0.8
      expect(prompt.knowledge.confidence).toBeCloseTo(0.8, 2);
    });

    it('confidence is 0 when no relevant items', () => {
      const ctx = createMinimalCognitiveContext();
      const prompt = composer.compose(ctx, 'Hello');
      expect(prompt.knowledge.confidence).toBe(0);
    });
  });

  // ─── Policies section ─────────────────────────────────────────

  describe('policies section', () => {
    it('uses maxTokens from context policies', () => {
      const ctx = createMinimalCognitiveContext({
        policies: Object.freeze({
          maxTokens: 8192,
          allowedProviders: [],
          privacyLevel: 1,
          trustLevel: 1,
          costBudget: 10,
          activePolicies: [],
        }),
      });
      const prompt = composer.compose(ctx, 'Hello');
      expect(prompt.policies.maxTokens).toBe(8192);
    });

    it('uses default temperature from runtime config', () => {
      const ctx = createMinimalCognitiveContext();
      const prompt = composer.compose(ctx, 'Hello');
      expect(prompt.policies.temperature).toBe(DefaultCognitiveRuntimeConfig.defaultTemperature);
    });

    it('uses default topP from runtime config', () => {
      const ctx = createMinimalCognitiveContext();
      const prompt = composer.compose(ctx, 'Hello');
      expect(prompt.policies.topP).toBe(DefaultCognitiveRuntimeConfig.defaultTopP);
    });
  });

  // ─── Environment section ───────────────────────────────────────

  describe('environment section', () => {
    it('passes through environment values', () => {
      const sessionId = brandCognitiveSessionId('sess-1');
      const ctx = createMinimalCognitiveContext({
        sessionId,
        conversationId: brandConversationId('conv-1'),
        environment: Object.freeze({
          runtimeVersion: '2.0.0',
          sessionId: sessionId,
          timezone: 'PST',
          timestamp: '2024-01-01T00:00:00Z',
        }),
      });
      const prompt = composer.compose(ctx, 'Hello');
      expect(prompt.environment.runtimeVersion).toBe('2.0.0');
      expect(prompt.environment.sessionId).toBe(sessionId);
      expect(prompt.environment.conversationId).toBe('conv-1');
      expect(prompt.environment.timezone).toBe('PST');
      expect(prompt.environment.timestamp).toBe('2024-01-01T00:00:00Z');
    });

    it('uses "none" for conversationId when null', () => {
      const ctx = createMinimalCognitiveContext({ conversationId: null });
      const prompt = composer.compose(ctx, 'Hello');
      expect(prompt.environment.conversationId).toBe('none');
    });
  });

  // ─── Conversation section ─────────────────────────────────────

  describe('conversation section', () => {
    it('passes through turn count and summary', () => {
      const messages = Object.freeze([
        Object.freeze({ role: MessageRole.User, content: 'Hi', tokens: 10, turn: 1 }),
        Object.freeze({ role: MessageRole.Assistant, content: 'Hello!', tokens: 15, turn: 1 }),
      ]);
      const ctx = createMinimalCognitiveContext({
        conversationHistory: Object.freeze({
          turnCount: 5,
          recentMessages: messages,
          summary: 'We discussed AI',
        }),
      });
      const prompt = composer.compose(ctx, 'Hello');
      expect(prompt.conversation.turnCount).toBe(5);
      expect(prompt.conversation.summary).toBe('We discussed AI');
      expect(prompt.conversation.recentMessages.length).toBe(2);
    });

    it('respects maxHistoryMessages', () => {
      const messages = Array.from({ length: 100 }, (_, i) =>
        Object.freeze({ role: MessageRole.User, content: `msg-${i}`, tokens: 5, turn: i }),
      );
      const ctx = createMinimalCognitiveContext({
        conversationHistory: Object.freeze({
          turnCount: 100,
          recentMessages: messages,
          summary: null,
        }),
      });

      // Default maxHistoryMessages is 50
      const prompt = composer.compose(ctx, 'Hello');
      expect(prompt.conversation.recentMessages.length).toBe(50);
    });

    it('threadContext is always null', () => {
      const ctx = createMinimalCognitiveContext();
      const prompt = composer.compose(ctx, 'Hello');
      expect(prompt.conversation.threadContext).toBeNull();
    });
  });

  // ─── Custom config ───────────────────────────────────────────

  describe('custom config', () => {
    it('uses custom systemInstructions', () => {
      const composer = new PromptComposer({
        systemInstructions: 'You are a code assistant.',
      });
      const ctx = createMinimalCognitiveContext();
      const prompt = composer.compose(ctx, 'Hello');
      expect(prompt.systemInstructions).toBe('You are a code assistant.');
    });

    it('uses custom maxHistoryMessages', () => {
      const composer = new PromptComposer({ maxHistoryMessages: 5 });
      const messages = Array.from({ length: 100 }, (_, i) =>
        Object.freeze({ role: MessageRole.User, content: `msg-${i}`, tokens: 5, turn: i }),
      );
      const ctx = createMinimalCognitiveContext({
        conversationHistory: Object.freeze({
          turnCount: 100,
          recentMessages: messages,
          summary: null,
        }),
      });
      const prompt = composer.compose(ctx, 'Hello');
      expect(prompt.conversation.recentMessages.length).toBe(5);
    });
  });
});

// ─── validate ────────────────────────────────────────────────────

describe('PromptComposer.validate', () => {
  let composer: PromptComposer;

  beforeEach(() => {
    composer = new PromptComposer();
  });

  it('returns valid=true for a properly composed context', () => {
    const ctx = createMinimalCognitiveContext();
    const prompt = composer.compose(ctx, 'Hello world');
    const result = composer.validate(prompt);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('catches empty user message', () => {
    const ctx = createMinimalCognitiveContext();
    const prompt = composer.compose(ctx, '   ');
    const result = composer.validate(prompt);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('User message is empty');
  });

  it('catches empty user message (empty string)', () => {
    const ctx = createMinimalCognitiveContext();
    const prompt = composer.compose(ctx, '');
    const result = composer.validate(prompt);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('User message is empty');
  });

  it('catches empty system instructions', () => {
    const composerWithEmptySys = new PromptComposer({ systemInstructions: '   ' });
    const ctx = createMinimalCognitiveContext();
    const prompt = composerWithEmptySys.compose(ctx, 'Hello');
    const result = composerWithEmptySys.validate(prompt);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('System instructions are empty');
  });

  it('catches invalid max tokens (0)', () => {
    const ctx = createMinimalCognitiveContext({
      policies: Object.freeze({
        maxTokens: 0,
        allowedProviders: [],
        privacyLevel: 1,
        trustLevel: 1,
        costBudget: 10,
        activePolicies: [],
      }),
    });
    const prompt = composer.compose(ctx, 'Hello');
    const result = composer.validate(prompt);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('Max tokens must be positive');
  });

  it('catches negative max tokens', () => {
    const ctx = createMinimalCognitiveContext({
      policies: Object.freeze({
        maxTokens: -100,
        allowedProviders: [],
        privacyLevel: 1,
        trustLevel: 1,
        costBudget: 10,
        activePolicies: [],
      }),
    });
    const prompt = composer.compose(ctx, 'Hello');
    const result = composer.validate(prompt);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('Max tokens must be positive');
  });

  it('returns multiple issues at once', () => {
    const ctx = createMinimalCognitiveContext({
      policies: Object.freeze({
        maxTokens: 0,
        allowedProviders: [],
        privacyLevel: 1,
        trustLevel: 1,
        costBudget: 10,
        activePolicies: [],
      }),
    });
    const composerWithEmptySys = new PromptComposer({ systemInstructions: '' });
    const prompt = composerWithEmptySys.compose(ctx, '');
    const result = composerWithEmptySys.validate(prompt);
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThanOrEqual(3); // user empty, system empty, max tokens
  });

  it('issues array is frozen', () => {
    const ctx = createMinimalCognitiveContext();
    const prompt = composer.compose(ctx, '');
    const result = composer.validate(prompt);
    expect(Object.isFrozen(result.issues)).toBe(true);
  });
});
