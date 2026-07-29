/**
 * Cognitive Runtime — Cognitive Metrics
 * TASK-AIS-003I.000
 *
 * Collects and aggregates metrics across all Cognitive Runtime subsystems:
 *   - latency, tokens, provider, model, cost
 *   - retries, failures, tool usage, workflow usage
 *   - memory hits, knowledge hits, cache hits
 *
 * Conforms to: ARC-001.001, DOM-002.000
 */

import type { CognitiveMetrics } from './types.js';

/**
 * Mutable metrics accumulator.
 */
export class CognitiveMetricsCollector {
  private _totalSessions: number = 0;
  private _activeSessions: number = 0;
  private _totalConversations: number = 0;
  private _activeConversations: number = 0;
  private _totalTurns: number = 0;
  private _totalMessages: number = 0;
  private _totalPromptTokens: number = 0;
  private _totalCompletionTokens: number = 0;
  private _totalCost: number = 0;
  private _totalLatencyMs: number = 0;
  private _completionCount: number = 0;
  private _totalRetries: number = 0;
  private _totalFailures: number = 0;
  private _toolInvocations: number = 0;
  private _workflowInvocations: number = 0;
  private _memoryHits: number = 0;
  private _knowledgeHits: number = 0;
  private _cacheHits: number = 0;
  private _totalCompletions: number = 0;
  private _totalStreams: number = 0;
  private _totalCompressions: number = 0;
  private _eventsPublished: number = 0;

  private readonly _providerUsage: Map<string, number> = new Map();
  private readonly _modelUsage: Map<string, number> = new Map();

  /**
   * Record a session lifecycle event.
   */
  recordSession(active: boolean): void {
    this._totalSessions++;
    if (active) this._activeSessions++;
  }

  /**
   * Record a conversation lifecycle event.
   */
  recordConversation(active: boolean): void {
    this._totalConversations++;
    if (active) this._activeConversations++;
  }

  /**
   * Record a turn completion.
   */
  recordTurn(): void {
    this._totalTurns++;
  }

  /**
   * Record a message.
   */
  recordMessage(): void {
    this._totalMessages++;
  }

  /**
   * Record token usage.
   */
  recordTokens(promptTokens: number, completionTokens: number): void {
    this._totalPromptTokens += promptTokens;
    this._totalCompletionTokens += completionTokens;
  }

  /**
   * Record cost.
   */
  recordCost(cost: number): void {
    this._totalCost += cost;
  }

  /**
   * Record latency.
   */
  recordLatency(latencyMs: number): void {
    this._totalLatencyMs += latencyMs;
    this._completionCount++;
  }

  /**
   * Record provider usage.
   */
  recordProviderUsage(providerName: string): void {
    const current = this._providerUsage.get(providerName) ?? 0;
    this._providerUsage.set(providerName, current + 1);
  }

  /**
   * Record model usage.
   */
  recordModelUsage(modelName: string): void {
    const current = this._modelUsage.get(modelName) ?? 0;
    this._modelUsage.set(modelName, current + 1);
  }

  /**
   * Record a retry.
   */
  recordRetry(): void {
    this._totalRetries++;
  }

  /**
   * Record a failure.
   */
  recordFailure(): void {
    this._totalFailures++;
  }

  /**
   * Record tool invocation.
   */
  recordToolInvocation(): void {
    this._toolInvocations++;
  }

  /**
   * Record workflow invocation.
   */
  recordWorkflowInvocation(): void {
    this._workflowInvocations++;
  }

  /**
   * Record memory hit.
   */
  recordMemoryHit(): void {
    this._memoryHits++;
  }

  /**
   * Record knowledge hit.
   */
  recordKnowledgeHit(): void {
    this._knowledgeHits++;
  }

  /**
   * Record cache hit.
   */
  recordCacheHit(): void {
    this._cacheHits++;
  }

  /**
   * Record completion.
   */
  recordCompletion(): void {
    this._totalCompletions++;
  }

  /**
   * Record stream.
   */
  recordStream(): void {
    this._totalStreams++;
  }

  /**
   * Record compression.
   */
  recordCompression(): void {
    this._totalCompressions++;
  }

  /**
   * Record event published.
   */
  recordEventPublished(): void {
    this._eventsPublished++;
  }

  /**
   * Get a snapshot of current metrics.
   */
  getMetrics(): CognitiveMetrics {
    return Object.freeze({
      totalSessions: this._totalSessions,
      activeSessions: this._activeSessions,
      totalConversations: this._totalConversations,
      activeConversations: this._activeConversations,
      totalTurns: this._totalTurns,
      totalMessages: this._totalMessages,
      totalPromptTokens: this._totalPromptTokens,
      totalCompletionTokens: this._totalCompletionTokens,
      totalTokens: this._totalPromptTokens + this._totalCompletionTokens,
      totalCost: Math.round(this._totalCost * 10000) / 10000,
      totalLatencyMs: this._totalLatencyMs,
      averageLatencyMs: this._completionCount > 0
        ? Math.round(this._totalLatencyMs / this._completionCount)
        : 0,
      providerUsage: Object.freeze(new Map(this._providerUsage)),
      modelUsage: Object.freeze(new Map(this._modelUsage)),
      totalRetries: this._totalRetries,
      totalFailures: this._totalFailures,
      toolInvocations: this._toolInvocations,
      workflowInvocations: this._workflowInvocations,
      memoryHits: this._memoryHits,
      knowledgeHits: this._knowledgeHits,
      cacheHits: this._cacheHits,
      totalCompletions: this._totalCompletions,
      totalStreams: this._totalStreams,
      totalCompressions: this._totalCompressions,
      eventsPublished: this._eventsPublished,
    });
  }

  /**
   * Reset all metrics.
   */
  reset(): void {
    this._totalSessions = 0;
    this._activeSessions = 0;
    this._totalConversations = 0;
    this._activeConversations = 0;
    this._totalTurns = 0;
    this._totalMessages = 0;
    this._totalPromptTokens = 0;
    this._totalCompletionTokens = 0;
    this._totalCost = 0;
    this._totalLatencyMs = 0;
    this._completionCount = 0;
    this._totalRetries = 0;
    this._totalFailures = 0;
    this._toolInvocations = 0;
    this._workflowInvocations = 0;
    this._memoryHits = 0;
    this._knowledgeHits = 0;
    this._cacheHits = 0;
    this._totalCompletions = 0;
    this._totalStreams = 0;
    this._totalCompressions = 0;
    this._eventsPublished = 0;
    this._providerUsage.clear();
    this._modelUsage.clear();
  }
}
