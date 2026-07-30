/**
 * Cognitive Metrics Tests — TASK-AIS-003I.000
 *
 * Tests the CognitiveMetricsCollector which aggregates metrics across
 * all Cognitive Runtime subsystems: sessions, conversations, turns,
 * messages, tokens, cost, latency, provider/model usage, retries,
 * failures, tool/workflow invocations, memory/knowledge/cache hits,
 * completions, streams, compressions, events.
 */

import { CognitiveMetricsCollector } from '../../../core/cognitive/cognitive-metrics.js';

describe('CognitiveMetricsCollector', () => {
  let collector: CognitiveMetricsCollector;

  beforeEach(() => {
    collector = new CognitiveMetricsCollector();
  });

  // ─── Initial state ────────────────────────────────────────────

  describe('initial state', () => {
    it('returns all zeros on fresh collector', () => {
      const m = collector.getMetrics();
      expect(m.totalSessions).toBe(0);
      expect(m.activeSessions).toBe(0);
      expect(m.totalConversations).toBe(0);
      expect(m.activeConversations).toBe(0);
      expect(m.totalTurns).toBe(0);
      expect(m.totalMessages).toBe(0);
      expect(m.totalPromptTokens).toBe(0);
      expect(m.totalCompletionTokens).toBe(0);
      expect(m.totalTokens).toBe(0);
      expect(m.totalCost).toBe(0);
      expect(m.totalLatencyMs).toBe(0);
      expect(m.averageLatencyMs).toBe(0);
      expect(m.totalRetries).toBe(0);
      expect(m.totalFailures).toBe(0);
      expect(m.toolInvocations).toBe(0);
      expect(m.workflowInvocations).toBe(0);
      expect(m.memoryHits).toBe(0);
      expect(m.knowledgeHits).toBe(0);
      expect(m.cacheHits).toBe(0);
      expect(m.totalCompletions).toBe(0);
      expect(m.totalStreams).toBe(0);
      expect(m.totalCompressions).toBe(0);
      expect(m.eventsPublished).toBe(0);
    });

    it('providerUsage and modelUsage are empty Maps', () => {
      const m = collector.getMetrics();
      expect(m.providerUsage.size).toBe(0);
      expect(m.modelUsage.size).toBe(0);
    });
  });

  // ─── Sessions ─────────────────────────────────────────────────

  describe('recordSession', () => {
    it('increments totalSessions when active=false', () => {
      collector.recordSession(false);
      expect(collector.getMetrics().totalSessions).toBe(1);
      expect(collector.getMetrics().activeSessions).toBe(0);
    });

    it('increments totalSessions and activeSessions when active=true', () => {
      collector.recordSession(true);
      expect(collector.getMetrics().totalSessions).toBe(1);
      expect(collector.getMetrics().activeSessions).toBe(1);
    });

    it('accumulates across multiple calls', () => {
      collector.recordSession(true);
      collector.recordSession(false);
      collector.recordSession(true);
      const m = collector.getMetrics();
      expect(m.totalSessions).toBe(3);
      expect(m.activeSessions).toBe(2);
    });
  });

  // ─── Conversations ────────────────────────────────────────────

  describe('recordConversation', () => {
    it('increments totalConversations', () => {
      collector.recordConversation(false);
      expect(collector.getMetrics().totalConversations).toBe(1);
    });

    it('increments activeConversations when active=true', () => {
      collector.recordConversation(true);
      expect(collector.getMetrics().activeConversations).toBe(1);
    });
  });

  // ─── Turns ────────────────────────────────────────────────────

  describe('recordTurn', () => {
    it('increments totalTurns', () => {
      collector.recordTurn();
      collector.recordTurn();
      expect(collector.getMetrics().totalTurns).toBe(2);
    });
  });

  // ─── Messages ──────────────────────────────────────────────────

  describe('recordMessage', () => {
    it('increments totalMessages', () => {
      collector.recordMessage();
      expect(collector.getMetrics().totalMessages).toBe(1);
    });
  });

  // ─── Tokens ────────────────────────────────────────────────────

  describe('recordTokens', () => {
    it('accumulates prompt and completion tokens separately', () => {
      collector.recordTokens(100, 50);
      const m = collector.getMetrics();
      expect(m.totalPromptTokens).toBe(100);
      expect(m.totalCompletionTokens).toBe(50);
    });

    it('computes totalTokens as sum of prompt + completion', () => {
      collector.recordTokens(200, 300);
      expect(collector.getMetrics().totalTokens).toBe(500);
    });

    it('accumulates across multiple calls', () => {
      collector.recordTokens(100, 50);
      collector.recordTokens(50, 25);
      const m = collector.getMetrics();
      expect(m.totalPromptTokens).toBe(150);
      expect(m.totalCompletionTokens).toBe(75);
      expect(m.totalTokens).toBe(225);
    });
  });

  // ─── Cost ─────────────────────────────────────────────────────

  describe('recordCost', () => {
    it('accumulates cost', () => {
      collector.recordCost(0.01);
      collector.recordCost(0.005);
      expect(collector.getMetrics().totalCost).toBeCloseTo(0.015, 4);
    });

    it('rounds to 4 decimal places', () => {
      collector.recordCost(0.0123456);
      expect(collector.getMetrics().totalCost).toBeCloseTo(0.0123, 4);
    });
  });

  // ─── Latency ──────────────────────────────────────────────────

  describe('recordLatency', () => {
    it('accumulates totalLatencyMs', () => {
      collector.recordLatency(100);
      collector.recordLatency(200);
      expect(collector.getMetrics().totalLatencyMs).toBe(300);
    });

    it('computes averageLatencyMs', () => {
      collector.recordLatency(100);
      collector.recordLatency(300);
      expect(collector.getMetrics().averageLatencyMs).toBe(200);
    });

    it('returns 0 averageLatencyMs when no completions recorded', () => {
      expect(collector.getMetrics().averageLatencyMs).toBe(0);
    });
  });

  // ─── Provider Usage ────────────────────────────────────────────

  describe('recordProviderUsage', () => {
    it('records a single provider usage', () => {
      collector.recordProviderUsage('openai');
      expect(collector.getMetrics().providerUsage.get('openai')).toBe(1);
    });

    it('accumulates for the same provider', () => {
      collector.recordProviderUsage('openai');
      collector.recordProviderUsage('openai');
      expect(collector.getMetrics().providerUsage.get('openai')).toBe(2);
    });

    it('tracks multiple providers', () => {
      collector.recordProviderUsage('openai');
      collector.recordProviderUsage('anthropic');
      collector.recordProviderUsage('openai');
      const m = collector.getMetrics();
      expect(m.providerUsage.get('openai')).toBe(2);
      expect(m.providerUsage.get('anthropic')).toBe(1);
    });
  });

  // ─── Model Usage ──────────────────────────────────────────────

  describe('recordModelUsage', () => {
    it('records a single model usage', () => {
      collector.recordModelUsage('gpt-4');
      expect(collector.getMetrics().modelUsage.get('gpt-4')).toBe(1);
    });

    it('tracks multiple models', () => {
      collector.recordModelUsage('gpt-4');
      collector.recordModelUsage('claude-3');
      expect(collector.getMetrics().modelUsage.get('claude-3')).toBe(1);
    });
  });

  // ─── Retries ──────────────────────────────────────────────────

  describe('recordRetry', () => {
    it('increments totalRetries', () => {
      collector.recordRetry();
      collector.recordRetry();
      expect(collector.getMetrics().totalRetries).toBe(2);
    });
  });

  // ─── Failures ──────────────────────────────────────────────────

  describe('recordFailure', () => {
    it('increments totalFailures', () => {
      collector.recordFailure();
      expect(collector.getMetrics().totalFailures).toBe(1);
    });
  });

  // ─── Tool Invocations ──────────────────────────────────────────

  describe('recordToolInvocation', () => {
    it('increments toolInvocations', () => {
      collector.recordToolInvocation();
      expect(collector.getMetrics().toolInvocations).toBe(1);
    });
  });

  // ─── Workflow Invocations ───────────────────────────────────────

  describe('recordWorkflowInvocation', () => {
    it('increments workflowInvocations', () => {
      collector.recordWorkflowInvocation();
      expect(collector.getMetrics().workflowInvocations).toBe(1);
    });
  });

  // ─── Memory Hits ──────────────────────────────────────────────

  describe('recordMemoryHit', () => {
    it('increments memoryHits', () => {
      collector.recordMemoryHit();
      expect(collector.getMetrics().memoryHits).toBe(1);
    });
  });

  // ─── Knowledge Hits ────────────────────────────────────────────

  describe('recordKnowledgeHit', () => {
    it('increments knowledgeHits', () => {
      collector.recordKnowledgeHit();
      expect(collector.getMetrics().knowledgeHits).toBe(1);
    });
  });

  // ─── Cache Hits ───────────────────────────────────────────────

  describe('recordCacheHit', () => {
    it('increments cacheHits', () => {
      collector.recordCacheHit();
      expect(collector.getMetrics().cacheHits).toBe(1);
    });
  });

  // ─── Completions ──────────────────────────────────────────────

  describe('recordCompletion', () => {
    it('increments totalCompletions', () => {
      collector.recordCompletion();
      expect(collector.getMetrics().totalCompletions).toBe(1);
    });
  });

  // ─── Streams ───────────────────────────────────────────────────

  describe('recordStream', () => {
    it('increments totalStreams', () => {
      collector.recordStream();
      expect(collector.getMetrics().totalStreams).toBe(1);
    });
  });

  // ─── Compressions ──────────────────────────────────────────────

  describe('recordCompression', () => {
    it('increments totalCompressions', () => {
      collector.recordCompression();
      expect(collector.getMetrics().totalCompressions).toBe(1);
    });
  });

  // ─── Events Published ──────────────────────────────────────────

  describe('recordEventPublished', () => {
    it('increments eventsPublished', () => {
      collector.recordEventPublished();
      expect(collector.getMetrics().eventsPublished).toBe(1);
    });
  });

  // ─── getMetrics snapshot ──────────────────────────────────────

  describe('getMetrics', () => {
    it('returns a frozen object', () => {
      const m = collector.getMetrics();
      expect(Object.isFrozen(m)).toBe(true);
    });

    it('returns frozen providerUsage Map', () => {
      collector.recordProviderUsage('openai');
      const m = collector.getMetrics();
      expect(Object.isFrozen(m.providerUsage)).toBe(true);
    });

    it('returns frozen modelUsage Map', () => {
      collector.recordModelUsage('gpt-4');
      const m = collector.getMetrics();
      expect(Object.isFrozen(m.modelUsage)).toBe(true);
    });

    it('multiple getMetrics calls return independent snapshots', () => {
      collector.recordProviderUsage('openai');
      const m1 = collector.getMetrics();
      collector.recordProviderUsage('anthropic');
      const m2 = collector.getMetrics();
      // m1 should still show only openai
      expect(m1.providerUsage.size).toBe(1);
      // m2 should show both
      expect(m2.providerUsage.size).toBe(2);
    });
  });

  // ─── Reset ─────────────────────────────────────────────────────

  describe('reset', () => {
    it('clears all counters to zero', () => {
      collector.recordSession(true);
      collector.recordConversation(true);
      collector.recordTurn();
      collector.recordMessage();
      collector.recordTokens(100, 50);
      collector.recordCost(0.01);
      collector.recordLatency(100);
      collector.recordRetry();
      collector.recordFailure();
      collector.recordToolInvocation();
      collector.recordWorkflowInvocation();
      collector.recordMemoryHit();
      collector.recordKnowledgeHit();
      collector.recordCacheHit();
      collector.recordCompletion();
      collector.recordStream();
      collector.recordCompression();
      collector.recordEventPublished();

      collector.reset();

      const m = collector.getMetrics();
      expect(m.totalSessions).toBe(0);
      expect(m.totalConversations).toBe(0);
      expect(m.totalTurns).toBe(0);
      expect(m.totalMessages).toBe(0);
      expect(m.totalTokens).toBe(0);
      expect(m.totalCost).toBe(0);
      expect(m.totalLatencyMs).toBe(0);
      expect(m.averageLatencyMs).toBe(0);
      expect(m.totalRetries).toBe(0);
      expect(m.totalFailures).toBe(0);
      expect(m.toolInvocations).toBe(0);
      expect(m.workflowInvocations).toBe(0);
      expect(m.memoryHits).toBe(0);
      expect(m.knowledgeHits).toBe(0);
      expect(m.cacheHits).toBe(0);
      expect(m.totalCompletions).toBe(0);
      expect(m.totalStreams).toBe(0);
      expect(m.totalCompressions).toBe(0);
      expect(m.eventsPublished).toBe(0);
    });

    it('clears providerUsage and modelUsage maps', () => {
      collector.recordProviderUsage('openai');
      collector.recordModelUsage('gpt-4');
      collector.reset();

      expect(collector.getMetrics().providerUsage.size).toBe(0);
      expect(collector.getMetrics().modelUsage.size).toBe(0);
    });

    it('allows recording after reset', () => {
      collector.recordSession(true);
      collector.reset();
      collector.recordSession(false);
      const m = collector.getMetrics();
      expect(m.totalSessions).toBe(1);
      expect(m.activeSessions).toBe(0);
    });
  });

  // ─── Accumulation integration ────────────────────────────────

  describe('metrics accumulation', () => {
    it('all metrics accumulate correctly in a realistic scenario', () => {
      // Simulate a session with conversations
      collector.recordSession(true);
      collector.recordConversation(true);
      collector.recordTurn();
      collector.recordMessage();
      collector.recordTokens(500, 200);
      collector.recordCost(0.035);
      collector.recordLatency(1200);
      collector.recordProviderUsage('openai');
      collector.recordModelUsage('gpt-4');
      collector.recordCompletion();
      collector.recordMemoryHit();
      collector.recordKnowledgeHit();
      collector.recordEventPublished();

      const m = collector.getMetrics();
      expect(m.totalSessions).toBe(1);
      expect(m.activeSessions).toBe(1);
      expect(m.totalConversations).toBe(1);
      expect(m.activeConversations).toBe(1);
      expect(m.totalTurns).toBe(1);
      expect(m.totalMessages).toBe(1);
      expect(m.totalPromptTokens).toBe(500);
      expect(m.totalCompletionTokens).toBe(200);
      expect(m.totalTokens).toBe(700);
      expect(m.totalCost).toBeCloseTo(0.035, 4);
      expect(m.totalLatencyMs).toBe(1200);
      expect(m.averageLatencyMs).toBe(1200);
      expect(m.totalCompletions).toBe(1);
      expect(m.memoryHits).toBe(1);
      expect(m.knowledgeHits).toBe(1);
      expect(m.eventsPublished).toBe(1);

      // Then a retry
      collector.recordRetry();
      collector.recordLatency(800);
      const m2 = collector.getMetrics();
      expect(m2.totalRetries).toBe(1);
      expect(m2.totalLatencyMs).toBe(2000);
      expect(m2.averageLatencyMs).toBe(1000); // 2000/2
    });
  });
});
