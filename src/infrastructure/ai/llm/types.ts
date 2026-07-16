/** INT-012: AI Layer — LLM Provider Types */

export type LlmProviderType = 'openai' | 'azure' | 'anthropic' | 'ollama' | 'vllm' | 'local-gguf';

export interface LlmProvider {
  readonly type: LlmProviderType;
  readonly name: string;
  chat(request: LlmChatRequest): Promise<LlmChatResponse>;
  complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse>;
  embed(text: string): Promise<number[]>;
  health(): Promise<LlmHealth>;
  getModels(): LlmModel[];
}

export interface LlmChatRequest {
  messages: LlmMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  tools?: LlmTool[];
  responseFormat?: 'text' | 'json';
  systemPrompt?: string;
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  name?: string;
}

export interface LlmTool {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface LlmChatResponse {
  id: string;
  content: string;
  model: string;
  usage: LlmUsage;
  toolCalls?: LlmToolCall[];
  finishReason: 'stop' | 'length' | 'tool_call';
  latencyMs: number;
}

export interface LlmToolCall {
  id: string;
  function: { name: string; arguments: string };
}

export interface LlmCompletionRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

export interface LlmCompletionResponse {
  id: string;
  text: string;
  model: string;
  usage: LlmUsage;
  finishReason: 'stop' | 'length';
  latencyMs: number;
}

export interface LlmUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LlmHealth {
  available: boolean;
  model?: string;
  latencyMs?: number;
  error?: string;
}

export interface LlmModel {
  id: string;
  name: string;
  provider: LlmProviderType;
  contextWindow: number;
  supportsTools: boolean;
  supportsJson: boolean;
  costPer1kTokens?: { prompt: number; completion: number };
}

// Provider-specific configs

export interface OpenAiConfig {
  type: 'openai';
  apiKey: string;
  baseUrl?: string;
  organization?: string;
  defaultModel: string;
}

export interface AzureOpenAiConfig {
  type: 'azure';
  endpoint: string;
  apiKey: string;
  deploymentName: string;
  apiVersion: string;
}

export interface AnthropicConfig {
  type: 'anthropic';
  apiKey: string;
  defaultModel: string;
  baseUrl?: string;
}

export interface OllamaConfig {
  type: 'ollama';
  baseUrl: string;
  defaultModel: string;
}

export interface VllmConfig {
  type: 'vllm';
  baseUrl: string;
  defaultModel: string;
  trustRemoteCode?: boolean;
}

export interface LocalGgufConfig {
  type: 'local-gguf';
  modelPath: string;
  contextSize?: number;
  gpuLayers?: number;
  threads?: number;
}

export type LlmConfig = OpenAiConfig | AzureOpenAiConfig | AnthropicConfig | OllamaConfig | VllmConfig | LocalGgufConfig;
