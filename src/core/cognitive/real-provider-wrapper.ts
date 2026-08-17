/**
 * Wave 1 TD-1 — Real OpenAI Provider Adapter
 * TASK-MVP-PROTOTYPE-IMPLEMENTATION-001
 *
 * Implements ProviderAdapter interface for real OpenAI API calls.
 * Uses dynamic import to preserve zero-runtime-dependency default build.
 * Core never knows specific SDKs — only the ProviderAdapter interface.
 *
 * This is a THIN wrapper. No context orchestration, no prompt composition,
 * no architectural intelligence. Only: PromptContext → OpenAI SDK → CompletionResult.
 *
 * Feature flag: AIS_REAL_LLM (process.env.AIS_REAL_LLM === 'true')
 * Reversible: when flag is off, CognitiveRuntime uses existing stubs.
 *
 * Conforms to: ADR-003 (Provider Abstraction), DOM-002.000
 */

import {
  ProviderAdapterType,
  type ProviderAdapter,
  type ProviderAdapterId,
  type ProviderConfig,
  type ProviderMetadata,
  type ProviderHealth,
  type CompletionResult,
  type StreamingChunk,
  type EmbeddingResult,
  type TokenEstimation,
  type PromptContext,
  type TokenUsage,
} from './types.js';
import { brandProviderAdapterId } from './types.js';

/**
 * Internal type for the dynamically imported OpenAI SDK module.
 * Defined here so the rest of the codebase never imports 'openai' directly.
 */
interface OpenAIModule {
  default: {
    chat: {
      completions: {
        create: (params: unknown) => Promise<unknown>;
      };
    };
    embeddings: {
      create: (params: unknown) => Promise<unknown>;
    };
  };
}

/**
 * RealOpenAIAdapter — Wave 1 thin wrapper around OpenAI SDK.
 *
 * Responsibilities (and ONLY these):
 *  1. Convert PromptContext → OpenAI API messages format
 *  2. Call OpenAI chat completions API
 *  3. Convert OpenAI response → CompletionResult
 *
 * NOT responsible for: context building, prompt composition,
 * architecture analysis, evidence grounding, feedback collection.
 */
export class RealOpenAIAdapter implements ProviderAdapter {
  readonly id: ProviderAdapterId;
  readonly type = ProviderAdapterType.OpenAI;
  readonly name = 'openai-real';

  private _config: ProviderConfig | null = null;
  private _initialized = false;
  private _openaiClient: unknown = null;

  constructor() {
    this.id = brandProviderAdapterId(crypto.randomUUID());
  }

  /**
   * Initialize with provider config.
   * Dynamic import of 'openai' SDK — only loaded when this adapter is instantiated.
   */
  async initialize(config: ProviderConfig): Promise<void> {
    const apiKey = config.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'RealOpenAIAdapter: No API key provided. ' +
        'Set config.apiKey or OPENAI_API_KEY environment variable.'
      );
    }

    try {
      // Dynamic import — only resolved at runtime when openai is installed.
      // Cast to OpenAIModule to keep AIS domain types provider-independent.
      const openaiModule = (await import('openai')) as unknown as OpenAIModule;
      const OpenAIClass = openaiModule.default;
      this._openaiClient = new (OpenAIClass as unknown as new (opts: { apiKey: string }) => unknown)({ apiKey });
    } catch (error) {
      throw new Error(
        `RealOpenAIAdapter: Failed to load OpenAI SDK. ` +
        `Install with: npm install openai. Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    this._config = config;
    this._initialized = true;
  }

  async shutdown(): Promise<void> {
    this._openaiClient = null;
    this._initialized = false;
  }

  async metadata(): Promise<ProviderMetadata> {
    return Object.freeze({
      name: this.name,
      version: '1.0.0-wave1',
      adapterType: this.type,
      supportedModels: Object.freeze([
        this._config?.model ?? 'gpt-4o',
      ]),
      capabilities: Object.freeze(['generate', 'stream', 'embed', 'tokenize', 'estimate']),
      maxContextTokens: this._config?.maxTokens ?? 128000,
      supportsStreaming: true,
      supportsEmbedding: true,
      supportsVision: false,
    });
  }

  async health(): Promise<ProviderHealth> {
    return Object.freeze({
      healthy: this._initialized,
      latencyMs: 0,
      errorRate: 0,
      lastCheckAt: new Date().toISOString(),
      details: this._initialized ? 'OpenAI SDK loaded and configured' : 'Not initialized',
    });
  }

  /**
   * Generate a completion from PromptContext.
   *
   * Converts the structured PromptContext into OpenAI messages format:
   *  - systemInstructions → system message
   *  - conversation.recentMessages → assistant/user message pairs
   *  - userMessage → final user message
   *  - knowledge + memory → appended as context in user message
   *  - policies → model parameters (temperature, max_tokens)
   */
  async generate(context: PromptContext): Promise<CompletionResult> {
    if (!this._initialized || !this._openaiClient) {
      throw new Error('RealOpenAIAdapter: Not initialized. Call initialize() first.');
    }

    const startTime = Date.now();
    const model = this._config?.model ?? 'gpt-4o';
    const client = this._openaiClient as { chat: { completions: { create: (p: unknown) => Promise<unknown> } } };

    // Build messages array from PromptContext
    const messages: Array<{ role: string; content: string }> = [];

    // System message
    if (context.systemInstructions) {
      messages.push({ role: 'system', content: context.systemInstructions });
    }

    // Conversation history
    for (const msg of context.conversation.recentMessages) {
      const role = String(msg.role) === 'assistant' ? 'assistant' as const : 'user' as const;
      messages.push({
        role,
        content: String(msg.content ?? ''),
      });
    }

    // Build user message with architecture context
    let userContent = context.userMessage;

    // Append knowledge items as context if available
    if (context.knowledge.relevantItems.length > 0) {
      const knowledgeContext = context.knowledge.relevantItems
        .map(item => `[(knowledge)] ${JSON.stringify(item)}`)
        .join('\n');
      userContent += '\n\n## Project Context\n' + knowledgeContext;
    }

    // Append memory entries as context if available
    if (context.memory.sessionEntries.length > 0) {
      const memoryContext = context.memory.sessionEntries
        .map(entry => JSON.stringify(entry))
        .filter(Boolean)
        .join('\n');
      if (memoryContext) {
        userContent += '\n\n## Session Memory\n' + memoryContext;
      }
    }

    messages.push({ role: 'user', content: userContent });

    // Call OpenAI API
    const response = await client.chat.completions.create({
      model,
      messages,
      temperature: context.policies.temperature,
      max_tokens: context.constraints.maxOutputTokens,
      top_p: context.policies.topP,
    }) as {
      id: string;
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    const latencyMs = Date.now() - startTime;
    const choice = response.choices[0];
    const usage = response.usage;

    const tokens: TokenUsage = {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
    };

    return Object.freeze({
      id: response.id,
      content: choice.message.content,
      tokens,
      model,
      provider: this.name,
      finishReason: choice.finish_reason === 'stop' ? 'stop' : 'length',
      latencyMs,
      createdAt: new Date().toISOString(),
      metadata: Object.freeze({}),
    });
  }

  /**
   * Stream a completion. Wave 1: delegates to generate() and yields as single chunk.
   * Full streaming can be added in a later wave.
   */
  async *stream(context: PromptContext): AsyncIterable<StreamingChunk> {
    const result = await this.generate(context);
    yield Object.freeze({
      id: crypto.randomUUID(),
      content: result.content,
      model: result.model,
      provider: this.name,
      finishReason: 'stop' as const,
      tokenCount: result.tokens.completionTokens,
      latencyMs: result.latencyMs,
      createdAt: result.createdAt,
    });
  }

  /**
   * Generate embeddings via OpenAI API.
   */
  async embed(text: string): Promise<EmbeddingResult> {
    if (!this._initialized || !this._openaiClient) {
      throw new Error('RealOpenAIAdapter: Not initialized. Call initialize() first.');
    }

    const startTime = Date.now();
    const model = this._config?.model ?? 'text-embedding-ada-002';
    const client = this._openaiClient as { embeddings: { create: (p: unknown) => Promise<unknown> } };

    const response = await client.embeddings.create({
      model: model.includes('embedding') ? model : 'text-embedding-ada-002',
      input: text,
    }) as {
      data: Array<{ embedding: number[]; index: number }>;
      usage: { prompt_tokens: number; total_tokens: number };
    };

    return Object.freeze({
      id: crypto.randomUUID(),
      embedding: Object.freeze(response.data[0].embedding),
      model,
      provider: this.name,
      tokens: response.usage.prompt_tokens,
      latencyMs: Date.now() - startTime,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Estimate token count. Uses ~4 chars/token heuristic.
   * Real tokenization requires tiktoken which is an OpenAI-specific dependency.
   * Wave 1 uses the same heuristic as stubs for parity.
   */
  async tokenize(text: string): Promise<TokenEstimation> {
    const tokens = Math.ceil(text.length / 4);
    return Object.freeze({
      inputTokens: tokens,
      outputTokensEstimate: Math.ceil(tokens * 0.5),
      totalTokens: tokens + Math.ceil(tokens * 0.5),
    });
  }

  /**
   * Estimate cost in USD for a given token count.
   * Uses GPT-4o pricing: $5/1M input, $15/1M output.
   */
  async estimate(promptTokens: number, outputTokens: number): Promise<number> {
    return (promptTokens * 5 + outputTokens * 15) / 1_000_000;
  }
}
