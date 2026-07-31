/**
 * Universal AI Provider Runtime — Parallel Engine
 * TASK-AIS-006A.000
 *
 * Executes requests in parallel via Promise.allSettled,
 * then aggregates results using various methods.
 */

import type { IParallelEngine } from './contracts.js';
import type {
  ExecutionRequest, ExecutionResult, ParallelExecutionRequest,
  ParallelExecutionResult, AggregationMethod,
} from './types.js';
import { AggregationMethod as AM } from './types.js';
import { ParallelExecutionError } from './errors.js';

export class ParallelEngine implements IParallelEngine {
  private readonly executeRequest: (req: ExecutionRequest) => Promise<ExecutionResult>;

  constructor(executeRequest: (req: ExecutionRequest) => Promise<ExecutionResult>) {
    this.executeRequest = executeRequest;
  }

  async execute(request: ParallelExecutionRequest): Promise<ParallelExecutionResult> {
    const startTime = Date.now();

    const settled = await Promise.allSettled(
      request.requests.map(req => this.executeRequest(req)),
    );

    const results: ExecutionResult[] = [];
    const errors: string[] = [];

    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        results.push(outcome.value);
      } else {
        errors.push(outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason));
      }
    }

    if (results.length === 0) {
      throw new ParallelExecutionError(
        `All ${request.requests.length} parallel executions failed: ${errors.join('; ')}`,
      );
    }

    const { content, confidence } = await this.aggregate(results, request.aggregation);

    const totalLatencyMs = Date.now() - startTime;

    return Object.freeze({
      id: request.id,
      results,
      aggregated: content,
      aggregation: request.aggregation,
      confidence,
      totalLatencyMs,
      metadata: { ...request.metadata },
    });
  }

  async aggregate(
    results: readonly ExecutionResult[],
    method: AggregationMethod,
  ): Promise<{ content: string; confidence: number }> {
    if (results.length === 0) {
      return { content: '', confidence: 0 };
    }

    switch (method) {
      case AM.First:
        return { content: results[0].content, confidence: 1 };

      case AM.Voting: {
        const counts = new Map<string, number>();
        for (const r of results) {
          counts.set(r.content, (counts.get(r.content) ?? 0) + 1);
        }
        let maxCount = 0;
        let winner = results[0].content;
        for (const [text, count] of counts) {
          if (count > maxCount) { maxCount = count; winner = text; }
        }
        const confidence = results.length > 0 ? maxCount / results.length : 0;
        return { content: winner, confidence };
      }

      case AM.Consensus: {
        // Majority vote — require > 50%
        const { content, confidence } = await this.aggregate(results, AM.Voting);
        if (confidence > 0.5) {
          return { content, confidence };
        }
        // Fall back to first result if no consensus
        return { content: results[0].content, confidence };
      }

      case AM.Average: {
        // Average: concatenate all unique responses
        const unique = [...new Set(results.map(r => r.content))];
        const confidence = results.length > 0 ? 1 / unique.length : 0;
        return { content: unique.join('\n---\n'), confidence };
      }

      case AM.BestConfidence: {
        // Pick the result with the lowest latency (proxy for confidence)
        let best = results[0];
        for (let i = 1; i < results.length; i++) {
          if (results[i].latencyMs < best.latencyMs) {
            best = results[i];
          }
        }
        return { content: best.content, confidence: 0.9 };
      }

      case AM.Merge: {
        // Merge all responses into one
        const merged = results.map(r => r.content).join('\n');
        const confidence = results.length > 0 ? 0.7 : 0;
        return { content: merged, confidence };
      }

      default:
        return { content: results[0].content, confidence: 1 };
    }
  }
}
