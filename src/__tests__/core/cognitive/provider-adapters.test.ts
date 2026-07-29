/**
 * Provider Adapters Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  OpenAIStubAdapter,
  AnthropicStubAdapter,
  GoogleStubAdapter,
  OllamaStubAdapter,
  LmStudioStubAdapter,
  VLLMStubAdapter,
} from '../../../core/cognitive/provider-adapters.js';
import { ProviderAdapterType } from '../../../core/cognitive/types.js';

// ─── Helpers ──────────────────────────────────────────────────

const providerConfig = (name: string, model: string, type: ProviderAdapterType) => Object.freeze({
  adapterType: type,
  name,
  model,
  maxTokens: 4096,
  temperature: 0.7,
  timeoutMs: 30000,
  metadata: Object.freeze({}),
});

function createPromptContext() {
  return Object.freeze({
    id: 'prompt-1' as any,
    identity: Object.freeze({ identityId: 'anon', name: 'Anon', roles: [], permissions: [], preferences: Object.freeze({}) }),
    preferences: Object.freeze({ language: 'en', timezone: 'UTC', verbosity: 'normal', explanationLevel: 'standard', answerStyle: 'professional', creativity: 0.7, custom: Object.freeze({}) }),
    intent: null,
    memory: Object.freeze({ workingEntries: [], sessionEntries: [], relevantMemories: [], summary: null }),
    knowledge: Object.freeze({ relevantItems: [], namespaces: [], confidence: 0 }),
    capabilities: Object.freeze({ available: [], required: [], denied: [] }),
    policies: Object.freeze({ maxTokens: 4096, temperature: 0.7, topP: 1, frequencyPenalty: 0, presencePenalty: 0, stopSequences: [], custom: Object.freeze({}) }),
    constraints: Object.freeze({ maxOutputTokens: 2048, forbiddenTopics: [], requiredTopics: [], formatHints: [] }),
    environment: Object.freeze({ runtimeVersion: '0.4.0', sessionId: 's-1', conversationId: 'c-1', timestamp: '2024-01-01T00:00:00Z', timezone: 'UTC' }),
    conversation: Object.freeze({ turnCount: 0, recentMessages: [], summary: null, threadContext: null }),
    systemInstructions: 'You are helpful.',
    userMessage: 'Hello, world!',
    createdAt: '2024-01-01T00:00:00Z',
    metadata: Object.freeze({}),
  });
}

describe('OpenAIStubAdapter', () => {
  let adapter: OpenAIStubAdapter;

  beforeEach(async () => {
    adapter = new OpenAIStubAdapter();
    await adapter.initialize(providerConfig('openai-stub', 'gpt-4', ProviderAdapterType.OpenAI));
  });

  it('has correct type', () => {
    expect(adapter.type).toBe(ProviderAdapterType.OpenAI);
  });

  it('has correct name', () => {
    expect(adapter.name).toBe('openai-stub');
  });

  it('generate returns completion', async () => {
    const result = await adapter.generate(createPromptContext());
    expect(result.content).toBeDefined();
    expect(result.model).toBe('gpt-4');
    expect(result.provider).toBe('openai-stub');
    expect(result.tokens.totalTokens).toBeGreaterThan(0);
    expect(result.finishReason).toBe('stop');
  });

  it('stream yields chunks', async () => {
    const chunks: any[] = [];
    for await (const chunk of adapter.stream(createPromptContext())) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].content).toBeDefined();
  });

  it('stream final chunk has finishReason', async () => {
    const chunks: any[] = [];
    for await (const chunk of adapter.stream(createPromptContext())) {
      chunks.push(chunk);
    }
    expect(chunks[chunks.length - 1].finishReason).toBe('stop');
  });

  it('embed returns embedding', async () => {
    const result = await adapter.embed('hello');
    expect(result.embedding.length).toBe(1536);
    expect(result.tokens).toBeGreaterThan(0);
  });

  it('tokenize returns estimation', async () => {
    const result = await adapter.tokenize('hello world');
    expect(result.inputTokens).toBeGreaterThan(0);
    expect(result.totalTokens).toBeGreaterThan(result.inputTokens);
  });

  it('estimate returns positive cost', async () => {
    const cost = await adapter.estimate(100, 50);
    expect(cost).toBeGreaterThan(0);
  });

  it('metadata returns correct info', async () => {
    const meta = await adapter.metadata();
    expect(meta.name).toBe('openai-stub');
    expect(meta.adapterType).toBe(ProviderAdapterType.OpenAI);
    expect(meta.supportsStreaming).toBe(true);
    expect(meta.supportsEmbedding).toBe(true);
  });

  it('health returns healthy after init', async () => {
    const health = await adapter.health();
    expect(health.healthy).toBe(true);
  });

  it('health returns not healthy before init', async () => {
    const a = new OpenAIStubAdapter();
    const health = await a.health();
    expect(health.healthy).toBe(false);
  });

  it('initialize sets adapter up', async () => {
    const a = new OpenAIStubAdapter();
    await a.initialize(providerConfig('openai-stub', 'gpt-4', ProviderAdapterType.OpenAI));
    expect(await a.health()).toBeDefined();
  });

  it('shutdown resets state', async () => {
    await adapter.shutdown();
    expect((await adapter.health()).healthy).toBe(false);
  });
});

describe('AnthropicStubAdapter', () => {
  let adapter: AnthropicStubAdapter;

  beforeEach(async () => {
    adapter = new AnthropicStubAdapter();
    await adapter.initialize(providerConfig('anthropic-stub', 'claude-3-opus', ProviderAdapterType.Anthropic));
  });

  it('has correct type', () => {
    expect(adapter.type).toBe(ProviderAdapterType.Anthropic);
  });

  it('generate returns completion', async () => {
    const result = await adapter.generate(createPromptContext());
    expect(result.content).toBeDefined();
    expect(result.model).toBe('claude-3-opus');
  });

  it('stream yields chunks', async () => {
    const chunks: any[] = [];
    for await (const chunk of adapter.stream(createPromptContext())) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('embed returns embedding', async () => {
    const result = await adapter.embed('hello');
    expect(result.embedding.length).toBe(1536);
  });

  it('tokenize returns estimation', async () => {
    const result = await adapter.tokenize('hello world');
    expect(result.inputTokens).toBeGreaterThan(0);
  });

  it('estimate returns positive cost', async () => {
    const cost = await adapter.estimate(100, 50);
    expect(cost).toBeGreaterThan(0);
  });
});

describe('GoogleStubAdapter', () => {
  let adapter: GoogleStubAdapter;

  beforeEach(async () => {
    adapter = new GoogleStubAdapter();
    await adapter.initialize(providerConfig('google-stub', 'gemini-pro', ProviderAdapterType.Google));
  });

  it('has correct type', () => {
    expect(adapter.type).toBe(ProviderAdapterType.Google);
  });

  it('generate returns completion', async () => {
    const result = await adapter.generate(createPromptContext());
    expect(result.content).toBeDefined();
    expect(result.model).toBe('gemini-pro');
  });

  it('stream yields chunks', async () => {
    const chunks: any[] = [];
    for await (const chunk of adapter.stream(createPromptContext())) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('embed returns embedding', async () => {
    const result = await adapter.embed('hello');
    expect(result.embedding.length).toBe(1536);
  });

  it('tokenize returns estimation', async () => {
    const result = await adapter.tokenize('hello world');
    expect(result.inputTokens).toBeGreaterThan(0);
  });

  it('estimate returns positive cost', async () => {
    const cost = await adapter.estimate(100, 50);
    expect(cost).toBeGreaterThan(0);
  });
});

describe('OllamaStubAdapter', () => {
  let adapter: OllamaStubAdapter;

  beforeEach(async () => {
    adapter = new OllamaStubAdapter();
    await adapter.initialize(providerConfig('ollama-stub', 'llama3', ProviderAdapterType.Ollama));
  });

  it('has correct type', () => {
    expect(adapter.type).toBe(ProviderAdapterType.Ollama);
  });

  it('generate returns completion', async () => {
    const result = await adapter.generate(createPromptContext());
    expect(result.content).toBeDefined();
    expect(result.model).toBe('llama3');
  });

  it('stream yields chunks', async () => {
    const chunks: any[] = [];
    for await (const chunk of adapter.stream(createPromptContext())) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('embed returns embedding', async () => {
    const result = await adapter.embed('hello');
    expect(result.embedding.length).toBe(1536);
  });

  it('tokenize returns estimation', async () => {
    const result = await adapter.tokenize('hello world');
    expect(result.inputTokens).toBeGreaterThan(0);
  });

  it('estimate returns 0 (local model, no cost)', async () => {
    const cost = await adapter.estimate(100, 50);
    expect(cost).toBe(0);
  });
});

describe('LmStudioStubAdapter', () => {
  let adapter: LmStudioStubAdapter;

  beforeEach(async () => {
    adapter = new LmStudioStubAdapter();
    await adapter.initialize(providerConfig('lm-studio-stub', 'local-model', ProviderAdapterType.LmStudio));
  });

  it('has correct type', () => {
    expect(adapter.type).toBe(ProviderAdapterType.LmStudio);
  });

  it('generate returns completion', async () => {
    const result = await adapter.generate(createPromptContext());
    expect(result.content).toBeDefined();
    expect(result.model).toBe('local-model');
  });

  it('stream yields chunks', async () => {
    const chunks: any[] = [];
    for await (const chunk of adapter.stream(createPromptContext())) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('embed returns embedding', async () => {
    const result = await adapter.embed('hello');
    expect(result.embedding.length).toBe(1536);
  });

  it('tokenize returns estimation', async () => {
    const result = await adapter.tokenize('hello world');
    expect(result.inputTokens).toBeGreaterThan(0);
  });

  it('estimate returns 0 (local model, no cost)', async () => {
    const cost = await adapter.estimate(100, 50);
    expect(cost).toBe(0);
  });
});

describe('VLLMStubAdapter', () => {
  let adapter: VLLMStubAdapter;

  beforeEach(async () => {
    adapter = new VLLMStubAdapter();
    await adapter.initialize(providerConfig('vllm-stub', 'vllm-model', ProviderAdapterType.VLLM));
  });

  it('has correct type', () => {
    expect(adapter.type).toBe(ProviderAdapterType.VLLM);
  });

  it('generate returns completion', async () => {
    const result = await adapter.generate(createPromptContext());
    expect(result.content).toBeDefined();
    expect(result.model).toBe('vllm-model');
  });

  it('stream yields chunks', async () => {
    const chunks: any[] = [];
    for await (const chunk of adapter.stream(createPromptContext())) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('embed returns embedding', async () => {
    const result = await adapter.embed('hello');
    expect(result.embedding.length).toBe(1536);
  });

  it('tokenize returns estimation', async () => {
    const result = await adapter.tokenize('hello world');
    expect(result.inputTokens).toBeGreaterThan(0);
  });

  it('estimate returns 0 (self-hosted, no cost)', async () => {
    const cost = await adapter.estimate(100, 50);
    expect(cost).toBe(0);
  });
});
