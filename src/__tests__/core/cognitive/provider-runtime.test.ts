/**
 * Provider Runtime Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProviderRuntime, InMemoryAdapterSandbox } from '../../../core/cognitive/provider-runtime.js';
import { OpenAIStubAdapter } from '../../../core/cognitive/provider-adapters.js';
import { brandPromptId, MessageRole, ProviderAdapterType } from '../../../core/cognitive/types.js';
import { ProviderUnavailableError } from '../../../core/cognitive/cognitive-errors.js';

// ─── Helpers ──────────────────────────────────────────────────

const providerConfig = {
  adapterType: ProviderAdapterType.OpenAI,
  name: 'openai-stub',
  model: 'gpt-4',
  maxTokens: 4096,
  temperature: 0.7,
  timeoutMs: 30000,
  metadata: {},
};

function createMockPromptContext(): any {
  return Object.freeze({
    id: brandPromptId(crypto.randomUUID()),
    identity: Object.freeze({ identityId: 'test', name: 'Test', roles: [], permissions: [], preferences: {} }),
    preferences: Object.freeze({ language: 'en', timezone: 'UTC', verbosity: 'normal', explanationLevel: 'standard', answerStyle: 'professional', creativity: 0.7, custom: {} }),
    intent: null,
    memory: Object.freeze({ workingEntries: [], sessionEntries: [], relevantMemories: [], summary: null }),
    knowledge: Object.freeze({ relevantItems: [], namespaces: [], confidence: 0 }),
    capabilities: Object.freeze({ available: [], required: [], denied: [] }),
    policies: Object.freeze({ maxTokens: 4096, temperature: 0.7, topP: 1, frequencyPenalty: 0, presencePenalty: 0, stopSequences: [], custom: {} }),
    constraints: Object.freeze({ maxOutputTokens: 2048, forbiddenTopics: [], requiredTopics: [], formatHints: [] }),
    environment: Object.freeze({ runtimeVersion: '0.4.0', sessionId: 'test', conversationId: 'test', timestamp: '2024-01-01T00:00:00Z', timezone: 'UTC' }),
    conversation: Object.freeze({ turnCount: 1, recentMessages: [{ role: MessageRole.User, content: 'Hello', tokens: 5, turn: 1 }], summary: null, threadContext: null }),
    systemInstructions: 'You are a helpful assistant.',
    userMessage: 'What is AI?',
    createdAt: '2024-01-01T00:00:00Z',
    metadata: Object.freeze({}),
  });
}

describe('InMemoryAdapterSandbox', () => {
  let sandbox: InMemoryAdapterSandbox;
  let adapter: OpenAIStubAdapter;

  beforeEach(async () => {
    sandbox = new InMemoryAdapterSandbox();
    adapter = new OpenAIStubAdapter();
    await adapter.initialize(providerConfig);
  });

  describe('register', () => {
    it('registers an adapter', () => {
      sandbox.register(adapter);
      expect(sandbox.list()).toHaveLength(1);
    });

    it('registers multiple adapters', () => {
      sandbox.register(adapter);
      const a2 = new OpenAIStubAdapter();
      sandbox.register(a2);
      expect(sandbox.list()).toHaveLength(2);
    });
  });

  describe('get', () => {
    it('gets adapter by id', () => {
      sandbox.register(adapter);
      const found = sandbox.get(adapter.id);
      expect(found).toBeDefined();
      expect(found!.name).toBe('openai-stub');
    });

    it('returns undefined for unknown id', () => {
      expect(sandbox.get('nonexistent' as any)).toBeUndefined();
    });

    it('returns undefined when no adapters registered', () => {
      expect(sandbox.get(adapter.id)).toBeUndefined();
    });
  });

  describe('getByName', () => {
    it('gets adapter by name', () => {
      sandbox.register(adapter);
      const found = sandbox.getByName('openai-stub');
      expect(found).toBeDefined();
      expect(found!.name).toBe('openai-stub');
    });

    it('returns undefined for unknown name', () => {
      expect(sandbox.getByName('nonexistent')).toBeUndefined();
    });
  });

  describe('unregister', () => {
    it('unregisters an adapter', () => {
      sandbox.register(adapter);
      sandbox.unregister(adapter.id);
      expect(sandbox.list()).toHaveLength(0);
    });

    it('ignores unregister of unknown id', () => {
      sandbox.unregister(adapter.id);
      expect(sandbox.list()).toHaveLength(0);
    });
  });

  describe('list', () => {
    it('lists all adapters', () => {
      sandbox.register(adapter);
      const list = sandbox.list();
      expect(list).toHaveLength(1);
    });

    it('lists empty when no adapters', () => {
      expect(sandbox.list()).toHaveLength(0);
    });
  });

  describe('healthCheck', () => {
    it('returns map of health results', async () => {
      sandbox.register(adapter);
      const results = await sandbox.healthCheck();
      expect(results).toBeInstanceOf(Map);
      expect(results.has(adapter.id)).toBe(true);
    });

    it('healthy adapter has healthy=true', async () => {
      sandbox.register(adapter);
      const results = await sandbox.healthCheck();
      const health = results.get(adapter.id)!;
      expect(health.healthy).toBe(true);
    });

    it('handles health check error gracefully', async () => {
      const badAdapter = {
        ...adapter,
        id: 'bad' as any,
        health: vi.fn().mockRejectedValue(new Error('fail')),
      } as any;
      sandbox.register(badAdapter);
      const results = await sandbox.healthCheck();
      const health = results.get('bad')!;
      expect(health.healthy).toBe(false);
      expect(health.errorRate).toBe(1);
    });

    it('returns empty map when no adapters', async () => {
      const results = await sandbox.healthCheck();
      expect(results.size).toBe(0);
    });
  });

  describe('shutdownAll', () => {
    it('clears all adapters', async () => {
      sandbox.register(adapter);
      await sandbox.shutdownAll();
      expect(sandbox.list()).toHaveLength(0);
    });

    it('calls shutdown on each adapter', async () => {
      const shutdownSpy = vi.spyOn(adapter, 'shutdown');
      sandbox.register(adapter);
      await sandbox.shutdownAll();
      expect(shutdownSpy).toHaveBeenCalled();
    });

    it('handles shutdown errors gracefully', async () => {
      const badAdapter = {
        ...adapter,
        id: 'bad' as any,
        shutdown: vi.fn().mockRejectedValue(new Error('shutdown fail')),
      } as any;
      sandbox.register(badAdapter);
      await sandbox.shutdownAll();
      expect(sandbox.list()).toHaveLength(0);
    });
  });
});

describe('ProviderRuntime', () => {
  let runtime: ProviderRuntime;
  let adapter: OpenAIStubAdapter;

  beforeEach(async () => {
    const sandbox = new InMemoryAdapterSandbox();
    runtime = new ProviderRuntime(sandbox, 5000);
    adapter = new OpenAIStubAdapter();
    await adapter.initialize(providerConfig);
    await runtime.registerAdapter(adapter);
  });

  // ─── constructor ──────────────────────────────────────────────

  describe('constructor', () => {
    it('creates with default sandbox', () => {
      const rt = new ProviderRuntime();
      expect(rt).toBeInstanceOf(ProviderRuntime);
    });

    it('exposes sandbox', () => {
      expect(runtime.sandbox).toBeDefined();
    });

    it('creates with custom timeout', () => {
      const rt = new ProviderRuntime(undefined, 10000);
      expect(rt).toBeInstanceOf(ProviderRuntime);
    });

    it('creates with custom sandbox and timeout', () => {
      const sb = new InMemoryAdapterSandbox();
      const rt = new ProviderRuntime(sb, 20000);
      expect(rt).toBeInstanceOf(ProviderRuntime);
    });
  });

  // ─── registerAdapter ─────────────────────────────────────────

  describe('registerAdapter', () => {
    it('registers without config', async () => {
      const rt = new ProviderRuntime();
      const a = new OpenAIStubAdapter();
      await rt.registerAdapter(a);
      expect(rt.sandbox.list()).toHaveLength(1);
    });

    it('registers with config (initializes)', async () => {
      const rt = new ProviderRuntime();
      const a = new OpenAIStubAdapter();
      await rt.registerAdapter(a, providerConfig);
      expect(rt.sandbox.list()).toHaveLength(1);
    });

    it('registers multiple adapters', async () => {
      const a2 = new OpenAIStubAdapter();
      await runtime.registerAdapter(a2);
      expect(runtime.sandbox.list().length).toBeGreaterThan(1);
    });
  });

  // ─── generate ────────────────────────────────────────────────

  describe('generate', () => {
    it('generates a completion', async () => {
      const result = await runtime.generate('openai-stub', createMockPromptContext());
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('returns result with tokens', async () => {
      const result = await runtime.generate('openai-stub', createMockPromptContext());
      expect(result.tokens.totalTokens).toBeGreaterThan(0);
    });

    it('returns result with model name', async () => {
      const result = await runtime.generate('openai-stub', createMockPromptContext());
      expect(result.model).toBe('gpt-4');
    });

    it('returns result with provider name', async () => {
      const result = await runtime.generate('openai-stub', createMockPromptContext());
      expect(result.provider).toBe('openai-stub');
    });

    it('returns result with finishReason stop', async () => {
      const result = await runtime.generate('openai-stub', createMockPromptContext());
      expect(result.finishReason).toBe('stop');
    });

    it('throws ProviderUnavailableError for unknown provider', async () => {
      await expect(runtime.generate('unknown', createMockPromptContext())).rejects.toThrow(ProviderUnavailableError);
    });

    it('throws ProviderUnavailableError has providerName', async () => {
      try {
        await runtime.generate('nonexistent', createMockPromptContext());
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ProviderUnavailableError);
        expect((err as ProviderUnavailableError).providerName).toBe('nonexistent');
      }
    });
  });

  // ─── stream ─────────────────────────────────────────────────

  describe('stream', () => {
    it('streams chunks', async () => {
      const chunks: any[] = [];
      for await (const chunk of runtime.stream('openai-stub', createMockPromptContext())) {
        chunks.push(chunk);
      }
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('chunks have content', async () => {
      const chunks: any[] = [];
      for await (const chunk of runtime.stream('openai-stub', createMockPromptContext())) {
        chunks.push(chunk);
      }
      expect(chunks[0].content).toBeDefined();
    });

    it('last chunk has finishReason stop', async () => {
      const chunks: any[] = [];
      for await (const chunk of runtime.stream('openai-stub', createMockPromptContext())) {
        chunks.push(chunk);
      }
      expect(chunks[chunks.length - 1].finishReason).toBe('stop');
    });

    it('throws ProviderUnavailableError for unknown provider', async () => {
      let caught = false;
      try {
        for await (const _chunk of runtime.stream('unknown', createMockPromptContext())) { /* empty */ }
      } catch {
        caught = true;
      }
      expect(caught).toBe(true);
    });
  });

  // ─── embed ───────────────────────────────────────────────────

  describe('embed', () => {
    it('returns embedding', async () => {
      const result = await runtime.embed('openai-stub', 'hello');
      expect(result).toBeDefined();
      expect(result.embedding.length).toBeGreaterThan(0);
    });

    it('embedding has correct dimensions (1536)', async () => {
      const result = await runtime.embed('openai-stub', 'hello');
      expect(result.embedding.length).toBe(1536);
    });

    it('throws ProviderUnavailableError for unknown provider', async () => {
      await expect(runtime.embed('unknown', 'hello')).rejects.toThrow(ProviderUnavailableError);
    });
  });

  // ─── tokenize ───────────────────────────────────────────────

  describe('tokenize', () => {
    it('returns token estimation', async () => {
      const result = await runtime.tokenize('openai-stub', 'hello world');
      expect(result).toBeDefined();
      expect(result.inputTokens).toBeGreaterThan(0);
    });

    it('totalTokens > inputTokens', async () => {
      const result = await runtime.tokenize('openai-stub', 'hello world');
      expect(result.totalTokens).toBeGreaterThan(result.inputTokens);
    });

    it('outputTokensEstimate is positive', async () => {
      const result = await runtime.tokenize('openai-stub', 'hello world');
      expect(result.outputTokensEstimate).toBeGreaterThan(0);
    });

    it('throws ProviderUnavailableError for unknown provider', async () => {
      await expect(runtime.tokenize('unknown', 'hello')).rejects.toThrow(ProviderUnavailableError);
    });
  });

  // ─── estimate ─────────────────────────────────────────────────

  describe('estimate', () => {
    it('returns cost estimate >= 0', async () => {
      const cost = await runtime.estimate('openai-stub', 100, 50);
      expect(cost).toBeGreaterThanOrEqual(0);
    });

    it('cost increases with more tokens', async () => {
      const cost1 = await runtime.estimate('openai-stub', 100, 50);
      const cost2 = await runtime.estimate('openai-stub', 1000, 500);
      expect(cost2).toBeGreaterThan(cost1);
    });

    it('throws ProviderUnavailableError for unknown provider', async () => {
      await expect(runtime.estimate('unknown', 100, 50)).rejects.toThrow(ProviderUnavailableError);
    });
  });

  // ─── getMetadata ─────────────────────────────────────────────

  describe('getMetadata', () => {
    it('returns provider metadata', async () => {
      const meta = await runtime.getMetadata('openai-stub');
      expect(meta).toBeDefined();
      expect(meta.name).toBe('openai-stub');
    });

    it('metadata has supportedModels', async () => {
      const meta = await runtime.getMetadata('openai-stub');
      expect(meta.supportedModels.length).toBeGreaterThan(0);
    });

    it('metadata has capabilities', async () => {
      const meta = await runtime.getMetadata('openai-stub');
      expect(meta.capabilities.length).toBeGreaterThan(0);
    });

    it('throws ProviderUnavailableError for unknown', async () => {
      await expect(runtime.getMetadata('unknown')).rejects.toThrow(ProviderUnavailableError);
    });
  });

  // ─── healthCheck ────────────────────────────────────────────

  describe('healthCheck', () => {
    it('returns health for provider', async () => {
      const health = await runtime.healthCheck('openai-stub');
      expect(health).toBeDefined();
      expect(health.healthy).toBe(true);
    });

    it('health has lastCheckAt timestamp', async () => {
      const health = await runtime.healthCheck('openai-stub');
      expect(health.lastCheckAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('throws ProviderUnavailableError for unknown', async () => {
      await expect(runtime.healthCheck('unknown')).rejects.toThrow(ProviderUnavailableError);
    });
  });
});
