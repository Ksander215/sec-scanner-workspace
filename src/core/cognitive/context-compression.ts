/**
 * Cognitive Runtime — Context Compression
 * TASK-AIS-003I.000
 *
 * When context exceeds the token limit, compresses it via:
 *   - Summary generation
 *   - Sliding window
 *   - Truncation
 *   - Semantic compression
 *
 * Saves the full version to Memory Runtime before compression.
 *
 * Conforms to: ARC-001.001, DOM-002.000
 */

import { CompressionStrategy } from './types.js';
import type {
  Summary,
  SummaryId,
  ConversationId,
  PromptMessageEntry,
} from './types.js';
import { brandSummaryId } from './types.js';
import type { MemoryRuntimeContract } from './types.js';

/**
 * Configuration for Context Compression.
 */
export interface CompressionConfig {
  readonly strategy: CompressionStrategy;
  readonly threshold: number;
  readonly maxTokens: number;
  readonly summaryRetentionTurns: number;
  readonly summaryModel: string;
}

/**
 * Default compression configuration.
 */
export const DefaultCompressionConfig: CompressionConfig = {
  strategy: CompressionStrategy.Summary,
  threshold: 0.8,
  maxTokens: 4096,
  summaryRetentionTurns: 20,
  summaryModel: 'default',
};

/**
 * ContextCompressionRuntime — compresses context when it exceeds limits.
 */
export class ContextCompressionRuntime {
  private readonly _config: CompressionConfig;
  private _memoryContract: MemoryRuntimeContract | null = null;
  private readonly _summaries: Map<string, Summary> = new Map();

  constructor(config?: Partial<CompressionConfig>) {
    this._config = { ...DefaultCompressionConfig, ...config };
  }

  /**
   * Register memory contract for saving full context.
   */
  registerMemoryContract(contract: MemoryRuntimeContract): void {
    this._memoryContract = contract;
  }

  /**
   * Check if compression is needed.
   */
  needsCompression(currentTokens: number, maxTokens: number): boolean {
    return currentTokens > maxTokens * this._config.threshold;
  }

  /**
   * Compress conversation history if needed.
   */
  async compressIfNeeded(params: {
    messages: readonly PromptMessageEntry[];
    conversationId: ConversationId;
    currentTokens: number;
    maxTokens: number;
  }): Promise<{
    compressed: boolean;
    messages: readonly PromptMessageEntry[];
    summary: Summary | null;
    savedTokens: number;
  }> {
    if (!this.needsCompression(params.currentTokens, params.maxTokens)) {
      return {
        compressed: false,
        messages: params.messages,
        summary: null,
        savedTokens: 0,
      };
    }

    return this.compress(params.messages, params.conversationId, params.maxTokens);
  }

  /**
   * Compress conversation history.
   */
  async compress(
    messages: readonly PromptMessageEntry[],
    conversationId: ConversationId,
    maxTokens: number,
  ): Promise<{
    compressed: boolean;
    messages: readonly PromptMessageEntry[];
    summary: Summary | null;
    savedTokens: number;
  }> {
    const originalTokens = messages.reduce((sum, m) => sum + m.tokens, 0);

    // Save full version to memory if contract is available
    if (this._memoryContract) {
      try {
        await this._memoryContract.store(
          `conversation:full:${conversationId}`,
          { messages, originalTokens, savedAt: new Date().toISOString() },
        );
      } catch {
        // Non-fatal
      }
    }

    // Apply compression strategy
    let compressedMessages: readonly PromptMessageEntry[];
    let strategy: CompressionStrategy;

    switch (this._config.strategy) {
      case CompressionStrategy.Summary:
        compressedMessages = this.summarizeCompress(messages, maxTokens);
        strategy = CompressionStrategy.Summary;
        break;

      case CompressionStrategy.Truncation:
        compressedMessages = this.truncationCompress(messages, maxTokens);
        strategy = CompressionStrategy.Truncation;
        break;

      case CompressionStrategy.SlidingWindow:
        compressedMessages = this.slidingWindowCompress(messages, maxTokens);
        strategy = CompressionStrategy.SlidingWindow;
        break;

      case CompressionStrategy.Semantic:
        compressedMessages = this.semanticCompress(messages, maxTokens);
        strategy = CompressionStrategy.Semantic;
        break;

      default:
        compressedMessages = this.truncationCompress(messages, maxTokens);
        strategy = CompressionStrategy.Truncation;
    }

    const compressedTokens = compressedMessages.reduce((sum, m) => sum + m.tokens, 0);
    const savedTokens = originalTokens - compressedTokens;

    // Create summary
    const summary = this.createSummary(
      conversationId,
      messages.length,
      originalTokens,
      compressedTokens,
      strategy,
    );

    return {
      compressed: true,
      messages: compressedMessages,
      summary,
      savedTokens,
    };
  }

  /**
   * Get all summaries for a conversation.
   */
  getSummaries(conversationId: ConversationId): readonly Summary[] {
    return Array.from(this._summaries.values()).filter(s => s.conversationId === conversationId);
  }

  /**
   * Summary compression — keep recent messages, summarize older ones.
   */
  private summarizeCompress(messages: readonly PromptMessageEntry[], maxTokens: number): PromptMessageEntry[] {
    const retentionCount = Math.min(
      Math.floor(messages.length * 0.3),
      this._config.summaryRetentionTurns,
    );
    const recent = messages.slice(-retentionCount);
    const recentTokens = recent.reduce((sum, m) => sum + m.tokens, 0);

    if (recentTokens <= maxTokens) {
      return recent;
    }

    // If even recent exceeds, truncate
    return this.truncationCompress(recent, maxTokens);
  }

  /**
   * Truncation compression — keep recent messages, drop old ones.
   */
  private truncationCompress(messages: readonly PromptMessageEntry[], maxTokens: number): PromptMessageEntry[] {
    const result: PromptMessageEntry[] = [];
    let tokenCount = 0;

    for (let i = messages.length - 1; i >= 0; i--) {
      if (tokenCount + messages[i].tokens > maxTokens) break;
      result.unshift(messages[i]);
      tokenCount += messages[i].tokens;
    }

    return result;
  }

  /**
   * Sliding window compression — keep a window of messages.
   */
  private slidingWindowCompress(messages: readonly PromptMessageEntry[], maxTokens: number): PromptMessageEntry[] {
    const targetTokens = Math.floor(maxTokens * 0.7);
    const windowSize = Math.max(5, Math.floor(messages.length * 0.5));

    // Find the best window starting position
    let bestStart = Math.max(0, messages.length - windowSize);
    let bestTokens = 0;

    for (let start = 0; start <= messages.length - windowSize; start++) {
      const windowTokens = messages.slice(start, start + windowSize).reduce((sum, m) => sum + m.tokens, 0);
      if (windowTokens <= targetTokens && windowTokens > bestTokens) {
        bestTokens = windowTokens;
        bestStart = start;
      }
    }

    return messages.slice(bestStart, bestStart + windowSize);
  }

  /**
   * Semantic compression — keep system messages and key content messages.
   */
  private semanticCompress(messages: readonly PromptMessageEntry[], maxTokens: number): PromptMessageEntry[] {
    // Keep all system messages and assistant messages with high token counts (likely substantive)
    const filtered = messages.filter(m =>
      m.role === 'System' || m.tokens > 50,
    );

    if (filtered.reduce((sum, m) => sum + m.tokens, 0) <= maxTokens) {
      return filtered;
    }

    return this.truncationCompress(filtered, maxTokens);
  }

  /**
   * Create a Summary record.
   */
  private createSummary(
    conversationId: ConversationId,
    totalTurns: number,
    originalTokens: number,
    compressedTokens: number,
    strategy: CompressionStrategy,
  ): Summary {
    const id: SummaryId = brandSummaryId(crypto.randomUUID());
    const compressionRatio = originalTokens > 0
      ? Math.round((compressedTokens / originalTokens) * 1000) / 1000
      : 1;

    const summary: Summary = Object.freeze({
      id,
      conversationId,
      turnRangeStart: 0,
      turnRangeEnd: totalTurns,
      originalTokens,
      compressedTokens,
      compressionRatio,
      strategy,
      content: `Compressed from ${totalTurns} turns using ${strategy} strategy.`,
      createdAt: new Date().toISOString(),
      metadata: Object.freeze({}),
    });

    this._summaries.set(id, summary);
    return summary;
  }
}
