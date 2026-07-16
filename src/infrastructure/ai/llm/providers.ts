/** INT-012: AI Layer — LLM Provider Implementations */
import type {
  LlmProvider, LlmChatRequest, LlmChatResponse, LlmCompletionRequest,
  LlmCompletionResponse, LlmHealth, LlmModel, LlmUsage, LlmProviderType,
  OpenAiConfig, AzureOpenAiConfig, AnthropicConfig, OllamaConfig, VllmConfig, LocalGgufConfig, LlmConfig,
} from './types.js';

// ─── OpenAI Provider ───────────────────────────────────────────────────────

export class OpenAiLlmProvider implements LlmProvider {
  readonly type: LlmProviderType = 'openai';
  readonly name = 'OpenAI';
  private config: OpenAiConfig;

  constructor(config: OpenAiConfig) { this.config = config; }

  async chat(request: LlmChatRequest): Promise<LlmChatResponse> {
    // Production: fetch('https://api.openai.com/v1/chat/completions', ...)
    const start = Date.now();
    return {
      id: `chatcmpl-${crypto.randomUUID().slice(0, 8)}`,
      content: `[OpenAI ${this.config.defaultModel}] Response to: ${request.messages.slice(-1)[0]?.content?.slice(0, 100)}`,
      model: request.model ?? this.config.defaultModel,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      finishReason: 'stop',
      latencyMs: Date.now() - start,
    };
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const start = Date.now();
    return {
      id: `cmpl-${crypto.randomUUID().slice(0, 8)}`,
      text: `[OpenAI] Completion for: ${request.prompt.slice(0, 100)}`,
      model: request.model ?? this.config.defaultModel,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      finishReason: 'stop',
      latencyMs: Date.now() - start,
    };
  }

  async embed(_text: string): Promise<number[]> {
    return Array(1536).fill(0).map(() => Math.random());
  }

  async health(): Promise<LlmHealth> {
    return { available: true, model: this.config.defaultModel, latencyMs: 50 };
  }

  getModels(): LlmModel[] {
    return [
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', contextWindow: 128000, supportsTools: true, supportsJson: true, costPer1kTokens: { prompt: 0.005, completion: 0.015 } },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', contextWindow: 128000, supportsTools: true, supportsJson: true, costPer1kTokens: { prompt: 0.00015, completion: 0.0006 } },
    ];
  }
}

// ─── Azure OpenAI Provider ─────────────────────────────────────────────────

export class AzureLlmProvider implements LlmProvider {
  readonly type: LlmProviderType = 'azure';
  readonly name = 'Azure OpenAI';
  private config: AzureOpenAiConfig;

  constructor(config: AzureOpenAiConfig) { this.config = config; }

  async chat(request: LlmChatRequest): Promise<LlmChatResponse> {
    const start = Date.now();
    return {
      id: crypto.randomUUID(), content: `[Azure ${this.config.deploymentName}] Response`,
      model: this.config.deploymentName,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      finishReason: 'stop', latencyMs: Date.now() - start,
    };
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const start = Date.now();
    return { id: crypto.randomUUID(), text: `[Azure] Completion`, model: this.config.deploymentName, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, finishReason: 'stop', latencyMs: Date.now() - start };
  }

  async embed(_text: string): Promise<number[]> { return Array(1536).fill(0).map(() => Math.random()); }
  async health(): Promise<LlmHealth> { return { available: true, model: this.config.deploymentName }; }
  getModels(): LlmModel[] { return [{ id: this.config.deploymentName, name: this.config.deploymentName, provider: 'azure', contextWindow: 128000, supportsTools: true, supportsJson: true }]; }
}

// ─── Anthropic Provider ────────────────────────────────────────────────────

export class AnthropicLlmProvider implements LlmProvider {
  readonly type: LlmProviderType = 'anthropic';
  readonly name = 'Anthropic';
  private config: AnthropicConfig;

  constructor(config: AnthropicConfig) { this.config = config; }

  async chat(request: LlmChatRequest): Promise<LlmChatResponse> {
    const start = Date.now();
    return {
      id: crypto.randomUUID(), content: `[Anthropic ${this.config.defaultModel}] Response`,
      model: request.model ?? this.config.defaultModel,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      finishReason: 'stop', latencyMs: Date.now() - start,
    };
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const start = Date.now();
    return { id: crypto.randomUUID(), text: `[Anthropic] Completion`, model: request.model ?? this.config.defaultModel, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, finishReason: 'stop', latencyMs: Date.now() - start };
  }

  async embed(_text: string): Promise<number[]> { return Array(1024).fill(0).map(() => Math.random()); }
  async health(): Promise<LlmHealth> { return { available: true, model: this.config.defaultModel }; }
  getModels(): LlmModel[] {
    return [
      { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic', contextWindow: 200000, supportsTools: true, supportsJson: true, costPer1kTokens: { prompt: 0.003, completion: 0.015 } },
      { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'anthropic', contextWindow: 200000, supportsTools: true, supportsJson: true, costPer1kTokens: { prompt: 0.00025, completion: 0.00125 } },
    ];
  }
}

// ─── Ollama Provider ───────────────────────────────────────────────────────

export class OllamaLlmProvider implements LlmProvider {
  readonly type: LlmProviderType = 'ollama';
  readonly name = 'Ollama';
  private config: OllamaConfig;

  constructor(config: OllamaConfig) { this.config = config; }

  async chat(request: LlmChatRequest): Promise<LlmChatResponse> {
    const start = Date.now();
    return {
      id: crypto.randomUUID(), content: `[Ollama ${this.config.defaultModel}] Response`,
      model: request.model ?? this.config.defaultModel,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      finishReason: 'stop', latencyMs: Date.now() - start,
    };
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const start = Date.now();
    return { id: crypto.randomUUID(), text: `[Ollama] Completion`, model: request.model ?? this.config.defaultModel, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, finishReason: 'stop', latencyMs: Date.now() - start };
  }

  async embed(_text: string): Promise<number[]> { return Array(768).fill(0).map(() => Math.random()); }
  async health(): Promise<LlmHealth> { return { available: true, model: this.config.defaultModel }; }
  getModels(): LlmModel[] { return [{ id: this.config.defaultModel, name: this.config.defaultModel, provider: 'ollama', contextWindow: 8192, supportsTools: false, supportsJson: true }]; }
}

// ─── vLLM Provider ─────────────────────────────────────────────────────────

export class VllmLlmProvider implements LlmProvider {
  readonly type: LlmProviderType = 'vllm';
  readonly name = 'vLLM';
  private config: VllmConfig;

  constructor(config: VllmConfig) { this.config = config; }

  async chat(request: LlmChatRequest): Promise<LlmChatResponse> {
    const start = Date.now();
    return {
      id: crypto.randomUUID(), content: `[vLLM ${this.config.defaultModel}] Response`,
      model: request.model ?? this.config.defaultModel,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      finishReason: 'stop', latencyMs: Date.now() - start,
    };
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const start = Date.now();
    return { id: crypto.randomUUID(), text: `[vLLM] Completion`, model: request.model ?? this.config.defaultModel, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, finishReason: 'stop', latencyMs: Date.now() - start };
  }

  async embed(_text: string): Promise<number[]> { return Array(4096).fill(0).map(() => Math.random()); }
  async health(): Promise<LlmHealth> { return { available: true, model: this.config.defaultModel }; }
  getModels(): LlmModel[] { return [{ id: this.config.defaultModel, name: this.config.defaultModel, provider: 'vllm', contextWindow: 32768, supportsTools: true, supportsJson: true }]; }
}

// ─── Local GGUF Provider ──────────────────────────────────────────────────

export class LocalGgufLlmProvider implements LlmProvider {
  readonly type: LlmProviderType = 'local-gguf';
  readonly name = 'Local GGUF';
  private config: LocalGgufConfig;

  constructor(config: LocalGgufConfig) { this.config = config; }

  async chat(request: LlmChatRequest): Promise<LlmChatResponse> {
    const start = Date.now();
    return {
      id: crypto.randomUUID(), content: `[Local GGUF] Response`,
      model: this.config.modelPath.split('/').pop() ?? 'unknown',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      finishReason: 'stop', latencyMs: Date.now() - start,
    };
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const start = Date.now();
    return { id: crypto.randomUUID(), text: `[Local GGUF] Completion`, model: this.config.modelPath.split('/').pop() ?? 'unknown', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, finishReason: 'stop', latencyMs: Date.now() - start };
  }

  async embed(_text: string): Promise<number[]> { return Array(768).fill(0).map(() => Math.random()); }
  async health(): Promise<LlmHealth> { return { available: true }; }
  getModels(): LlmModel[] { return [{ id: 'local-gguf', name: this.config.modelPath.split('/').pop() ?? 'GGUF Model', provider: 'local-gguf', contextWindow: this.config.contextSize ?? 4096, supportsTools: false, supportsJson: false }]; }
}

// ─── LLM Router ────────────────────────────────────────────────────────────

export class LlmRouter {
  private providers: Map<string, LlmProvider> = new Map();
  private defaultProvider: string;

  constructor(defaultProviderType: LlmProviderType = 'openai') {
    this.defaultProvider = defaultProviderType;
  }

  registerProvider(provider: LlmProvider): void {
    this.providers.set(provider.type, provider);
  }

  async chat(request: LlmChatRequest, providerType?: LlmProviderType): Promise<LlmChatResponse> {
    const provider = this.getProvider(providerType);
    return provider.chat(request);
  }

  async complete(request: LlmCompletionRequest, providerType?: LlmProviderType): Promise<LlmCompletionResponse> {
    const provider = this.getProvider(providerType);
    return provider.complete(request);
  }

  async embed(text: string, providerType?: LlmProviderType): Promise<number[]> {
    const provider = this.getProvider(providerType);
    return provider.embed(text);
  }

  getProvider(type?: LlmProviderType): LlmProvider {
    const key = type ?? this.defaultProvider;
    const provider = this.providers.get(key);
    if (!provider) throw new Error(`LLM provider '${key}' not registered`);
    return provider;
  }

  listProviders(): Array<{ type: string; name: string; available: boolean }> {
    return [...this.providers.values()].map(p => ({ type: p.type, name: p.name, available: true }));
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────

export function createLlmProvider(config: LlmConfig): LlmProvider {
  switch (config.type) {
    case 'openai': return new OpenAiLlmProvider(config);
    case 'azure': return new AzureLlmProvider(config);
    case 'anthropic': return new AnthropicLlmProvider(config);
    case 'ollama': return new OllamaLlmProvider(config);
    case 'vllm': return new VllmLlmProvider(config);
    case 'local-gguf': return new LocalGgufLlmProvider(config);
  }
}
