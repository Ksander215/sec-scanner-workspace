/**
 * Universal AI Provider Runtime — Metrics Runtime
 * TASK-AIS-006A.000
 *
 * Accumulates counters for executions, streams, retries, etc.
 * getSnapshot() computes percentiles (p50/p95/p99) from latency array.
 */

import type { IMetricsRuntime } from './contracts.js';
import type {
  ExecutionResult, StreamChunk, AIProviderMetrics,
} from './types.js';
import { ExecutionStatus as ES } from './types.js';

export class MetricsRuntime implements IMetricsRuntime {
  private totalExecutions = 0;
  private successfulExecutions = 0;
  private failedExecutions = 0;
  private cancelledExecutions = 0;
  private totalLatencyMs = 0;
  private latencies: number[] = [];
  private totalCost = 0;
  private totalTokens = 0;
  private totalInputTokens = 0;
  private totalOutputTokens = 0;
  private totalCachedTokens = 0;
  private totalReasoningTokens = 0;
  private totalRetries = 0;
  private totalFailovers = 0;
  private totalToolCalls = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private hallucinationReports = 0;
  private providerUsage: Record<string, number> = {};
  private modelUsage: Record<string, number> = {};
  private streamTokens = 0;
  private contextSize = 0;

  recordExecution(result: ExecutionResult): void {
    this.totalExecutions++;
    this.totalLatencyMs += result.latencyMs;
    this.latencies.push(result.latencyMs);
    this.totalCost += result.cost.totalCost;
    this.totalTokens += result.tokenUsage.totalTokens;
    this.totalInputTokens += result.tokenUsage.inputTokens;
    this.totalOutputTokens += result.tokenUsage.outputTokens;
    this.totalCachedTokens += result.tokenUsage.cachedTokens;
    this.totalReasoningTokens += result.tokenUsage.reasoningTokens;

    const pid = result.providerId as string;
    this.providerUsage[pid] = (this.providerUsage[pid] ?? 0) + 1;

    const mid = result.modelId as string;
    this.modelUsage[mid] = (this.modelUsage[mid] ?? 0) + 1;

    if (result.status === ES.Completed) {
      this.successfulExecutions++;
    } else if (result.status === ES.Failed || result.status === ES.TimedOut) {
      this.failedExecutions++;
    } else if (result.status === ES.Cancelled) {
      this.cancelledExecutions++;
    }
  }

  recordStreamChunk(chunk: StreamChunk): void {
    this.streamTokens += chunk.tokenCount;
  }

  recordRetry(): void {
    this.totalRetries++;
  }

  recordFailover(): void {
    this.totalFailovers++;
  }

  recordCacheHit(): void {
    this.cacheHits++;
  }

  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  recordHallucination(): void {
    this.hallucinationReports++;
  }

  recordToolCall(): void {
    this.totalToolCalls++;
  }

  getSnapshot(): AIProviderMetrics {
    const totalCacheOps = this.cacheHits + this.cacheMisses;
    const sorted = [...this.latencies].sort((a, b) => a - b);

    return Object.freeze({
      totalExecutions: this.totalExecutions,
      successfulExecutions: this.successfulExecutions,
      failedExecutions: this.failedExecutions,
      cancelledExecutions: this.cancelledExecutions,
      totalLatencyMs: this.totalLatencyMs,
      averageLatencyMs: this.totalExecutions > 0 ? this.totalLatencyMs / this.totalExecutions : 0,
      p50LatencyMs: this.percentile(sorted, 50),
      p95LatencyMs: this.percentile(sorted, 95),
      p99LatencyMs: this.percentile(sorted, 99),
      totalCost: this.totalCost,
      averageCostPerExecution: this.totalExecutions > 0 ? this.totalCost / this.totalExecutions : 0,
      totalTokens: this.totalTokens,
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      totalCachedTokens: this.totalCachedTokens,
      totalReasoningTokens: this.totalReasoningTokens,
      totalRetries: this.totalRetries,
      totalFailovers: this.totalFailovers,
      totalToolCalls: this.totalToolCalls,
      cacheHitRate: totalCacheOps > 0 ? this.cacheHits / totalCacheOps : 0,
      cacheMissRate: totalCacheOps > 0 ? this.cacheMisses / totalCacheOps : 0,
      contextCompressionRatio: 0,
      hallucinationReports: this.hallucinationReports,
      providerUsage: Object.freeze({ ...this.providerUsage }),
      modelUsage: Object.freeze({ ...this.modelUsage }),
      streamingSpeed: this.streamTokens,
      contextSize: this.contextSize,
      metadata: {},
    });
  }

  reset(): void {
    this.totalExecutions = 0;
    this.successfulExecutions = 0;
    this.failedExecutions = 0;
    this.cancelledExecutions = 0;
    this.totalLatencyMs = 0;
    this.latencies = [];
    this.totalCost = 0;
    this.totalTokens = 0;
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.totalCachedTokens = 0;
    this.totalReasoningTokens = 0;
    this.totalRetries = 0;
    this.totalFailovers = 0;
    this.totalToolCalls = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.hallucinationReports = 0;
    this.providerUsage = {};
    this.modelUsage = {};
    this.streamTokens = 0;
    this.contextSize = 0;
  }

  private percentile(sorted: readonly number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }
}
