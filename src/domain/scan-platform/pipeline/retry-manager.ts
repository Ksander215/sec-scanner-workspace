/**
 * Pipeline Executor Core — Retry Manager
 *
 * Manages retry logic with exponential backoff,
 * error classification, and retry budget tracking.
 */

import type { Timestamp } from '../types/index.ts';
import type { PipelineStageError, PipelineStageDefinition } from './types.ts';

// ─── Error Classification ─────────────────────────────────

export interface ClassifiedError {
  readonly retryable: boolean;
  readonly category: 'transient' | 'permanent' | 'unknown';
  readonly suggestedDelayMs: number;
}

/**
 * Classify an error for retry purposes.
 * Uses error code patterns and message heuristics.
 */
export function classifyError(error: PipelineStageError): ClassifiedError {
  const code = error.code.toUpperCase();
  const msg = error.message.toLowerCase();

  // Permanent errors — no retry
  if (code.includes('INVALID_CONFIG') ||
      code.includes('AUTH_FAILED') ||
      code.includes('BINARY_MISSING') ||
      code.includes('CONTRACT_VIOLATION') ||
      msg.includes('invalid configuration') ||
      msg.includes('authentication failed') ||
      msg.includes('binary not found') ||
      msg.includes('permission denied')) {
    return { retryable: false, category: 'permanent', suggestedDelayMs: 0 };
  }

  // Transient errors — retry with backoff
  if (code.includes('TIMEOUT') ||
      code.includes('NETWORK') ||
      code.includes('RATE_LIMIT') ||
      code.includes('CONNECTION') ||
      msg.includes('timeout') ||
      msg.includes('econnrefused') ||
      msg.includes('econnreset') ||
      msg.includes('429') ||
      msg.includes('503') ||
      msg.includes('rate limit')) {
    return { retryable: true, category: 'transient', suggestedDelayMs: 1000 };
  }

  // Default: not retryable
  return { retryable: false, category: 'unknown', suggestedDelayMs: 0 };
}

// ─── Retry Manager ─────────────────────────────────────────

export class RetryManager {
  private readonly attempts = new Map<string, number>();
  private readonly lastAttemptAt = new Map<string, Timestamp>();

  /**
   * Check if a retry is allowed and compute delay.
   * Returns the delay in ms, or -1 if no retry allowed.
   */
  getRetryDelay(
    stageId: string,
    stageDef: PipelineStageDefinition,
    error: PipelineStageError,
  ): number {
    const currentAttempts = this.attempts.get(stageId) ?? 0;

    if (currentAttempts >= stageDef.maxRetries) {
      return -1; // Budget exhausted
    }

    const classified = classifyError(error);
    if (!classified.retryable && !error.retryable) {
      return -1; // Not retryable
    }

    // Exponential backoff with jitter
    const baseDelay = classified.suggestedDelayMs || 1000;
    const backoff = baseDelay * Math.pow(2, currentAttempts);
    const jitter = Math.random() * baseDelay * 0.5;
    const delay = Math.min(backoff + jitter, 30_000); // Cap at 30s

    return Math.round(delay);
  }

  /**
   * Record that a retry attempt is starting.
   */
  recordAttempt(stageId: string): void {
    this.attempts.set(stageId, (this.attempts.get(stageId) ?? 0) + 1);
    this.lastAttemptAt.set(stageId, new Date().toISOString());
  }

  /**
   * Get the number of retry attempts for a stage.
   */
  getAttemptCount(stageId: string): number {
    return this.attempts.get(stageId) ?? 0;
  }

  /**
   * Get all retried stage IDs.
   */
  getRetriedStageIds(): readonly string[] {
    return Array.from(this.attempts.keys()).filter(id => (this.attempts.get(id) ?? 0) > 0);
  }

  /**
   * Reset all state (for new pipeline run).
   */
  reset(): void {
    this.attempts.clear();
    this.lastAttemptAt.clear();
  }
}

/** Factory function. */
export function createRetryManager(): RetryManager {
  return new RetryManager();
}