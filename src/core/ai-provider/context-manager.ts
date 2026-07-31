/**
 * Universal AI Provider Runtime — Context Manager
 * TASK-AIS-006A.000
 *
 * Manages context window: token estimation, strategies for fitting
 * messages into model context windows.
 *
 * Strategies:
 *   SlidingWindow       — keep last N tokens
 *   SemanticCompression — 70% window (approximation)
 *   Summarization       — keep first + last + summary placeholder
 *   ContextSplitting    — sliding window variant
 *   ContextMerge        — merge consecutive same-role messages
 *   LongConversation    — summarize + sliding window
 */

import type { IContextManager } from './contracts.js';
import type {
  ModelId, ExecutionMessage, ContextManagementRequest,
  ContextManagementResult, ContextWindow, ContextManagerConfig,
  ContextStrategy, ModelDescriptor,
} from './types.js';
import { ContextStrategy as CS } from './types.js';

const CHARS_PER_TOKEN = 4;

class StrategyNotImplemented extends Error {
  constructor(strategy: string) {
    super(`Strategy not implemented: ${strategy}`);
    this.name = 'StrategyNotImplemented';
  }
}

export class ContextManager implements IContextManager {
  private readonly config: ContextManagerConfig;
  private readonly getModel: (modelId: ModelId) => Promise<ModelDescriptor | null>;
  private currentStrategy: CS;
  private readonly windows = new Map<string, ContextWindow>();

  constructor(
    config: ContextManagerConfig,
    deps: {
    getModel: (modelId: ModelId) => Promise<ModelDescriptor | null>;
    },
  ) {
    this.config = config;
    this.getModel = deps.getModel;
    this.currentStrategy = config.defaultStrategy;
  }

  setStrategy(strategy: ContextStrategy): void {
    this.currentStrategy = strategy as CS;
  }

  getStrategy(): ContextStrategy {
    return this.currentStrategy as ContextStrategy;
  }

  async estimateTokens(messages: readonly ExecutionMessage[]): Promise<number> {
    let totalChars = 0;
    for (const msg of messages) {
      totalChars += msg.content.length;
    }
    return Math.ceil(totalChars / CHARS_PER_TOKEN);
  }

  async manage(request: ContextManagementRequest): Promise<ContextManagementResult> {
    const strategy = (request.strategy ?? this.currentStrategy) as CS;
    const model = await this.getModel(request.modelId);
    const maxTokens = request.maxTokens ?? model?.tokenLimit ?? 128000;

    const originalTokens = await this.estimateTokens(request.messages);
    const effectiveMax = Math.floor(maxTokens * this.config.maxContextRatio);

    let resultMessages: readonly ExecutionMessage[];
    let systemPrompt: string | null = request.systemPrompt ?? null;
    let compressionRatio = 1;

    if (originalTokens <= effectiveMax) {
      resultMessages = request.messages;
    } else {
      switch (strategy) {
        case CS.SlidingWindow:
          ({ messages: resultMessages } = this.slidingWindow(request.messages, effectiveMax));
          break;
        case CS.SemanticCompression:
          ({ messages: resultMessages } = this.semanticCompression(request.messages, effectiveMax));
          break;
        case CS.Summarization:
          ({ messages: resultMessages, systemPrompt } = this.summarization(request.messages, effectiveMax, systemPrompt));
          break;
        case CS.ContextSplitting:
          ({ messages: resultMessages } = this.slidingWindow(request.messages, effectiveMax));
          break;
        case CS.ContextMerge:
          ({ messages: resultMessages } = this.contextMerge(request.messages, effectiveMax));
          break;
        case CS.LongConversation:
          ({ messages: resultMessages, systemPrompt } = this.longConversation(request.messages, effectiveMax, systemPrompt));
          break;
        default:
          throw new StrategyNotImplemented(strategy);
      }

      const resultingTokens = await this.estimateTokens(resultMessages);
      compressionRatio = originalTokens > 0 ? resultingTokens / originalTokens : 1;

      // Cache the context window
      const resultingTokens2 = await this.estimateTokens(resultMessages);
      this.windows.set(request.modelId as string, Object.freeze({
        modelId: request.modelId,
        totalCapacity: maxTokens,
        usedTokens: resultingTokens2,
        availableTokens: maxTokens - resultingTokens2,
        messages: resultMessages,
        strategy: strategy as ContextStrategy,
        compressionRatio,
        metadata: request.metadata ?? {},
      }));
    }

    const resultingTokens = await this.estimateTokens(resultMessages);
    compressionRatio = originalTokens > 0 ? resultingTokens / originalTokens : 1;

    return Object.freeze({
      messages: resultMessages,
      systemPrompt,
      originalTokenCount: originalTokens,
      resultingTokenCount: resultingTokens,
      compressionRatio,
      strategy: strategy as ContextStrategy,
      metadata: request.metadata ?? {},
    });
  }

  async getWindow(modelId: ModelId): Promise<ContextWindow | null> {
    return this.windows.get(modelId as string) ?? null;
  }

  // ─── Strategy Implementations ─────────────────────────────────

  private slidingWindow(
    messages: readonly ExecutionMessage[],
    maxTokens: number,
  ): { messages: readonly ExecutionMessage[] } {
    const result: ExecutionMessage[] = [];
    let currentTokens = 0;

    for (let i = messages.length - 1; i >= 0; i--) {
      const msgTokens = Math.ceil(messages[i].content.length / CHARS_PER_TOKEN);
      if (currentTokens + msgTokens > maxTokens) break;
      result.unshift(messages[i]);
      currentTokens += msgTokens;
    }

    return { messages: result };
  }

  private semanticCompression(
    messages: readonly ExecutionMessage[],
    maxTokens: number,
  ): { messages: readonly ExecutionMessage[] } {
    // 70% window — keep messages that fit in 70% of max tokens
    const effectiveMax = Math.floor(maxTokens * 0.7);
    return this.slidingWindow(messages, effectiveMax);
  }

  private summarization(
    messages: readonly ExecutionMessage[],
    maxTokens: number,
    systemPrompt: string | null,
  ): { messages: readonly ExecutionMessage[]; systemPrompt: string | null } {
    if (messages.length < 3) return { messages, systemPrompt };

    // Keep first message, add summary placeholder, keep last messages
    const first = messages[0];
    const lastTokens = Math.floor(maxTokens * 0.6);
    const tail = this.slidingWindow(messages.slice(1), lastTokens);
    const summaryTokens = Math.floor(maxTokens * 0.2);

    const summaryMsg: ExecutionMessage = {
      role: 'system',
      content: `[Previous conversation summarized — ~${summaryTokens} tokens compressed]`,
      name: 'context-manager',
    };

    const summaryPrefix = systemPrompt
      ? `${systemPrompt}\n\n[Conversation summary]`
      : '[Conversation summary]';

    return {
      messages: [first, summaryMsg, ...tail.messages],
      systemPrompt: summaryPrefix,
    };
  }

  private contextMerge(
    messages: readonly ExecutionMessage[],
    maxTokens: number,
  ): { messages: readonly ExecutionMessage[] } {
    const merged: ExecutionMessage[] = [];
    let currentTokens = 0;

    for (const msg of messages) {
      const msgTokens = Math.ceil(msg.content.length / CHARS_PER_TOKEN);

      // Merge consecutive same-role messages
      if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
        const last = merged[merged.length - 1];
        const combinedContent = last.content + '\n' + msg.content;
        const combinedTokens = Math.ceil(combinedContent.length / CHARS_PER_TOKEN);
        if (currentTokens - Math.ceil(last.content.length / CHARS_PER_TOKEN) + combinedTokens <= maxTokens) {
          merged[merged.length - 1] = { ...last, content: combinedContent };
          currentTokens = currentTokens - Math.ceil(last.content.length / CHARS_PER_TOKEN) + combinedTokens;
          continue;
        }
      }

      if (currentTokens + msgTokens > maxTokens) break;
      merged.push(msg);
      currentTokens += msgTokens;
    }

    return { messages: merged };
  }

  private longConversation(
    messages: readonly ExecutionMessage[],
    maxTokens: number,
    systemPrompt: string | null,
  ): { messages: readonly ExecutionMessage[]; systemPrompt: string | null } {
    // First summarize, then apply sliding window
    const { messages: summarized, systemPrompt: newPrompt } = this.summarization(messages, maxTokens, systemPrompt);
    const { messages: windowed } = this.slidingWindow(summarized, maxTokens);
    return { messages: windowed, systemPrompt: newPrompt };
  }
}
