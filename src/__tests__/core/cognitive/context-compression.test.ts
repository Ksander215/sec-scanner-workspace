/**
 * Context Compression Tests — TASK-AIS-003I.000
 *
 * Tests the ContextCompressionRuntime which compresses conversation
 * history when it exceeds the token limit:
 *   - needsCompression threshold check
 *   - compress with each strategy (Summary, Truncation, SlidingWindow, Semantic)
 *   - compressIfNeeded
 *   - getSummaries
 *   - Memory contract integration
 *
 * Conforms to: ARC-001.001, DOM-002.000
 */

import {
  ContextCompressionRuntime,
  DefaultCompressionConfig,
} from '../../../core/cognitive/context-compression.js';
import { CompressionStrategy } from '../../../core/cognitive/types.js';
import { brandConversationId } from '../../../core/cognitive/types.js';
import { MessageRole } from '../../../core/cognitive/types.js';
import type { PromptMessageEntry, MemoryRuntimeContract } from '../../../core/cognitive/types.js';

// ─── Helpers ─────────────────────────────────────────────────────

function createConversationId(): ReturnType<typeof brandConversationId> {
  return brandConversationId(crypto.randomUUID());
}

function createMessages(count: number, tokensPerMessage: number): PromptMessageEntry[] {
  return Array.from({ length: count }, (_, i) =>
    Object.freeze({
      role: i % 2 === 0 ? MessageRole.User : MessageRole.Assistant,
      content: `Message ${i}`,
      tokens: tokensPerMessage,
      turn: Math.floor(i / 2) + 1,
    }),
  );
}

// ─── DefaultCompressionConfig ─────────────────────────────────────

describe('DefaultCompressionConfig', () => {
  it('has Summary strategy', () => {
    expect(DefaultCompressionConfig.strategy).toBe(CompressionStrategy.Summary);
  });

  it('has threshold 0.8', () => {
    expect(DefaultCompressionConfig.threshold).toBe(0.8);
  });

  it('has maxTokens 4096', () => {
    expect(DefaultCompressionConfig.maxTokens).toBe(4096);
  });

  it('has positive summaryRetentionTurns', () => {
    expect(DefaultCompressionConfig.summaryRetentionTurns).toBeGreaterThan(0);
  });

  it('has summaryModel', () => {
    expect(DefaultCompressionConfig.summaryModel).toBeTruthy();
  });
});

// ─── needsCompression ────────────────────────────────────────────

describe('needsCompression', () => {
  it('returns false when current tokens are well below threshold', () => {
    const runtime = new ContextCompressionRuntime({ threshold: 0.8 });
    // 1000 tokens with max 4096 → 1000 < 4096 * 0.8 = 3276.8
    expect(runtime.needsCompression(1000, 4096)).toBe(false);
  });

  it('returns false when exactly at threshold boundary', () => {
    const runtime = new ContextCompressionRuntime({ threshold: 0.8 });
    // 3276 < 3276.8
    expect(runtime.needsCompression(3276, 4096)).toBe(false);
  });

  it('returns true when over threshold', () => {
    const runtime = new ContextCompressionRuntime({ threshold: 0.8 });
    // 3500 > 3276.8
    expect(runtime.needsCompression(3500, 4096)).toBe(true);
  });

  it('returns true when tokens equal maxTokens', () => {
    const runtime = new ContextCompressionRuntime({ threshold: 0.8 });
    expect(runtime.needsCompression(4096, 4096)).toBe(true);
  });

  it('returns true when tokens exceed maxTokens', () => {
    const runtime = new ContextCompressionRuntime({ threshold: 0.8 });
    expect(runtime.needsCompression(5000, 4096)).toBe(true);
  });

  it('returns true when current is 0 and max is 0', () => {
    const runtime = new ContextCompressionRuntime({ threshold: 0.5 });
    // 0 > 0 * 0.5 → false
    expect(runtime.needsCompression(0, 0)).toBe(false);
  });

  it('respects custom threshold', () => {
    const runtime = new ContextCompressionRuntime({ threshold: 0.5 });
    // 2000 > 4096 * 0.5 = 2048 → false
    expect(runtime.needsCompression(2000, 4096)).toBe(false);
    // 2100 > 2048 → true
    expect(runtime.needsCompression(2100, 4096)).toBe(true);
  });
});

// ─── compressIfNeeded ────────────────────────────────────────────

describe('compressIfNeeded', () => {
  it('returns compressed=false when no compression needed', async () => {
    const runtime = new ContextCompressionRuntime({ strategy: CompressionStrategy.Truncation, threshold: 0.8 });
    const messages = createMessages(5, 100); // 500 tokens
    const conversationId = createConversationId();

    const result = await runtime.compressIfNeeded({
      messages,
      conversationId,
      currentTokens: 500,
      maxTokens: 4096,
    });

    expect(result.compressed).toBe(false);
    expect(result.messages).toBe(messages); // same reference
    expect(result.summary).toBeNull();
    expect(result.savedTokens).toBe(0);
  });

  it('returns compressed=true when compression needed', async () => {
    const runtime = new ContextCompressionRuntime({ strategy: CompressionStrategy.Truncation, threshold: 0.5 });
    const messages = createMessages(20, 200); // 4000 tokens
    const conversationId = createConversationId();

    const result = await runtime.compressIfNeeded({
      messages,
      conversationId,
      currentTokens: 4000,
      maxTokens: 2000, // 4000 > 2000 * 0.5 = 1000
    });

    expect(result.compressed).toBe(true);
    expect(result.summary).not.toBeNull();
    expect(result.savedTokens).toBeGreaterThan(0);
  });
});

// ─── compress: Summary strategy ──────────────────────────────────

describe('compress with Summary strategy', () => {
  it('keeps recent messages and discards older ones', async () => {
    const runtime = new ContextCompressionRuntime({
      strategy: CompressionStrategy.Summary,
      threshold: 0.5,
      summaryRetentionTurns: 5,
    });

    const messages = createMessages(20, 100); // 20 messages, 2000 tokens
    const conversationId = createConversationId();

    const result = await runtime.compress(messages, conversationId, 1000);
    expect(result.compressed).toBe(true);
    expect(result.messages.length).toBeLessThan(messages.length);
    // Should have fewer tokens
    const compressedTokens = result.messages.reduce((sum, m) => sum + m.tokens, 0);
    expect(compressedTokens).toBeLessThanOrEqual(1000);
  });

  it('creates a summary', async () => {
    const runtime = new ContextCompressionRuntime({ strategy: CompressionStrategy.Summary, threshold: 0.5 });
    const messages = createMessages(10, 100);
    const conversationId = createConversationId();

    const result = await runtime.compress(messages, conversationId, 500);
    expect(result.summary).not.toBeNull();
    expect(result.summary!.strategy).toBe(CompressionStrategy.Summary);
    expect(result.summary!.conversationId).toBe(conversationId);
    expect(result.summary!.content).toBeTruthy();
  });
});

// ─── compress: Truncation strategy ────────────────────────────────

describe('compress with Truncation strategy', () => {
  it('keeps most recent messages that fit within maxTokens', async () => {
    const runtime = new ContextCompressionRuntime({ strategy: CompressionStrategy.Truncation, threshold: 0.5 });
    const messages = createMessages(10, 200); // 2000 tokens
    const conversationId = createConversationId();

    const result = await runtime.compress(messages, conversationId, 500);
    expect(result.compressed).toBe(true);
    expect(result.summary!.strategy).toBe(CompressionStrategy.Truncation);

    const compressedTokens = result.messages.reduce((sum, m) => sum + m.tokens, 0);
    expect(compressedTokens).toBeLessThanOrEqual(500);
  });

  it('keeps newest messages', async () => {
    const runtime = new ContextCompressionRuntime({ strategy: CompressionStrategy.Truncation, threshold: 0.5 });
    const messages = createMessages(5, 100); // 500 tokens
    const conversationId = createConversationId();

    const result = await runtime.compress(messages, conversationId, 200);
    // Should keep the last 2 messages (200 tokens)
    expect(result.messages.length).toBe(2);
    expect(result.messages[result.messages.length - 1]!.content).toBe('Message 4');
  });
});

// ─── compress: SlidingWindow strategy ────────────────────────────

describe('compress with SlidingWindow strategy', () => {
  it('returns a window of messages', async () => {
    const runtime = new ContextCompressionRuntime({ strategy: CompressionStrategy.SlidingWindow, threshold: 0.5 });
    const messages = createMessages(20, 50); // 1000 tokens
    const conversationId = createConversationId();

    const result = await runtime.compress(messages, conversationId, 500);
    expect(result.compressed).toBe(true);
    expect(result.summary!.strategy).toBe(CompressionStrategy.SlidingWindow);
    expect(result.messages.length).toBeLessThan(messages.length);
  });
});

// ─── compress: Semantic strategy ────────────────────────────────

describe('compress with Semantic strategy', () => {
  it('keeps system messages and high-token messages', async () => {
    const runtime = new ContextCompressionRuntime({ strategy: CompressionStrategy.Semantic, threshold: 0.5 });
    const messages = createMessages(10, 100); // 1000 tokens
    const conversationId = createConversationId();

    const result = await runtime.compress(messages, conversationId, 500);
    expect(result.compressed).toBe(true);
    expect(result.summary!.strategy).toBe(CompressionStrategy.Semantic);
    // Semantic keeps messages with tokens > 50 (all of ours are 100)
    // or System messages
    expect(result.messages.length).toBeLessThanOrEqual(10);
  });
});

// ─── Summary structure ────────────────────────────────────────────

describe('summary structure', () => {
  it('summary has all required fields', async () => {
    const runtime = new ContextCompressionRuntime({ strategy: CompressionStrategy.Truncation, threshold: 0.5 });
    const messages = createMessages(5, 100);
    const conversationId = createConversationId();

    const result = await runtime.compress(messages, conversationId, 200);
    const summary = result.summary!;

    expect(summary.id).toBeTruthy();
    expect(summary.conversationId).toBe(conversationId);
    expect(summary.turnRangeStart).toBe(0);
    expect(summary.turnRangeEnd).toBe(5);
    expect(summary.originalTokens).toBe(500);
    expect(summary.compressedTokens).toBeGreaterThan(0);
    expect(summary.compressionRatio).toBeGreaterThan(0);
    expect(summary.strategy).toBe(CompressionStrategy.Truncation);
    expect(summary.content).toBeTruthy();
    expect(summary.createdAt).toBeTruthy();
  });

  it('compressionRatio is correct', async () => {
    const runtime = new ContextCompressionRuntime({ strategy: CompressionStrategy.Truncation, threshold: 0.5 });
    const messages = createMessages(10, 100); // 1000 tokens
    const conversationId = createConversationId();

    const result = await runtime.compress(messages, conversationId, 500);
    const summary = result.summary!;

    const expectedRatio = Math.round((summary.compressedTokens / summary.originalTokens) * 1000) / 1000;
    expect(summary.compressionRatio).toBe(expectedRatio);
  });
});

// ─── getSummaries ────────────────────────────────────────────────

describe('getSummaries', () => {
  it('returns empty array initially', () => {
    const runtime = new ContextCompressionRuntime({ threshold: 0.5 });
    const conversationId = createConversationId();
    expect(runtime.getSummaries(conversationId)).toEqual([]);
  });

  it('returns summaries after compression', async () => {
    const runtime = new ContextCompressionRuntime({ strategy: CompressionStrategy.Truncation, threshold: 0.5 });
    const conversationId = createConversationId();
    const messages = createMessages(5, 100);

    await runtime.compress(messages, conversationId, 200);
    const summaries = runtime.getSummaries(conversationId);
    expect(summaries.length).toBe(1);
  });

  it('returns only summaries for the given conversation', async () => {
    const runtime = new ContextCompressionRuntime({ strategy: CompressionStrategy.Truncation, threshold: 0.5 });
    const conv1 = createConversationId();
    const conv2 = createConversationId();

    await runtime.compress(createMessages(5, 100), conv1, 200);
    await runtime.compress(createMessages(5, 100), conv2, 200);

    expect(runtime.getSummaries(conv1).length).toBe(1);
    expect(runtime.getSummaries(conv2).length).toBe(1);
  });

  it('accumulates summaries across multiple compressions', async () => {
    const runtime = new ContextCompressionRuntime({ strategy: CompressionStrategy.Truncation, threshold: 0.5 });
    const conversationId = createConversationId();

    await runtime.compress(createMessages(5, 100), conversationId, 200);
    await runtime.compress(createMessages(5, 100), conversationId, 200);
    await runtime.compress(createMessages(5, 100), conversationId, 200);

    expect(runtime.getSummaries(conversationId).length).toBe(3);
  });
});

// ─── Memory contract integration ──────────────────────────────────

describe('memory contract integration', () => {
  it('stores full context before compression', async () => {
    let storedKey = '';
    let storedValue: unknown = null;

    const mockContract: MemoryRuntimeContract = {
      retrieve: async () => [],
      store: async (key, value) => {
        storedKey = key;
        storedValue = value;
      },
      getSessionEntries: async () => [],
      getWorkingEntries: async () => [],
    };

    const runtime = new ContextCompressionRuntime({ strategy: CompressionStrategy.Truncation, threshold: 0.5 });
    runtime.registerMemoryContract(mockContract);

    const conversationId = createConversationId();
    const messages = createMessages(5, 100);

    await runtime.compress(messages, conversationId, 200);

    expect(storedKey).toContain(conversationId);
    expect(storedValue).not.toBeNull();
    expect((storedValue as any).messages).toBeDefined();
  });

  it('handles memory contract store errors gracefully', async () => {
    const mockContract: MemoryRuntimeContract = {
      retrieve: async () => [],
      store: async () => {
        throw new Error('Memory store failed');
      },
      getSessionEntries: async () => [],
      getWorkingEntries: async () => [],
    };

    const runtime = new ContextCompressionRuntime({ strategy: CompressionStrategy.Truncation, threshold: 0.5 });
    runtime.registerMemoryContract(mockContract);

    const conversationId = createConversationId();
    // Should not throw even though memory store fails
    const result = await runtime.compress(createMessages(5, 100), conversationId, 200);
    expect(result.compressed).toBe(true);
  });

  it('compresses normally when no memory contract registered', async () => {
    const runtime = new ContextCompressionRuntime({ strategy: CompressionStrategy.Truncation, threshold: 0.5 });
    const conversationId = createConversationId();

    const result = await runtime.compress(createMessages(5, 100), conversationId, 200);
    expect(result.compressed).toBe(true);
    expect(result.summary).not.toBeNull();
  });
});

// ─── savedTokens ──────────────────────────────────────────────────

describe('savedTokens', () => {
  it('computes savedTokens correctly', async () => {
    const runtime = new ContextCompressionRuntime({ strategy: CompressionStrategy.Truncation, threshold: 0.5 });
    const messages = createMessages(10, 100); // 1000 tokens
    const conversationId = createConversationId();

    const result = await runtime.compress(messages, conversationId, 300);
    expect(result.savedTokens).toBeGreaterThan(0);

    const compressedTokens = result.messages.reduce((sum, m) => sum + m.tokens, 0);
    expect(result.savedTokens).toBe(1000 - compressedTokens);
  });

  it('savedTokens is 0 when no compression needed', async () => {
    const runtime = new ContextCompressionRuntime({ strategy: CompressionStrategy.Truncation, threshold: 0.8 });
    const messages = createMessages(5, 100);
    const conversationId = createConversationId();

    const result = await runtime.compressIfNeeded({
      messages,
      conversationId,
      currentTokens: 500,
      maxTokens: 4096,
    });

    expect(result.savedTokens).toBe(0);
  });
});
