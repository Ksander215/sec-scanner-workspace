/**
 * Universal AI Provider Runtime — Retry Engine
 * TASK-AIS-006A.000
 *
 * Determines retry eligibility, computes backoff delay,
 * tracks attempt history per execution.
 */

import type { IRetryEngine } from './contracts.js';
import type {
  RetryConfig, RetryAttempt, RetryEngineConfig, BackoffStrategy,
} from './types.js';
import { BackoffStrategy as BS } from './types.js';

class MutableRetryConfig implements RetryConfig {
  readonly maxRetries: number;
  readonly backoffStrategy: BackoffStrategy;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
  readonly jitter: boolean;
  readonly retryableErrors: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;

  constructor(config: RetryEngineConfig) {
    this.maxRetries = config.defaultMaxRetries;
    this.backoffStrategy = config.defaultBackoff;
    this.initialDelayMs = config.defaultInitialDelayMs;
    this.maxDelayMs = config.defaultMaxDelayMs;
    this.jitter = config.defaultJitter;
    this.retryableErrors = Object.freeze([
      'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND',
      '502', '503', '504', '429', 'rate_limit', 'timeout',
      'overloaded', 'capacity',
    ]);
    this.metadata = Object.freeze({ ...config.metadata });
  }
}

export class RetryEngine implements IRetryEngine {
  private config: MutableRetryConfig;
  private readonly attempts = new Map<string, RetryAttempt[]>();

  constructor(config: RetryEngineConfig) {
    this.config = new MutableRetryConfig(config);
  }

  getConfig(): RetryConfig {
    return Object.freeze({ ...this.config });
  }

  setConfig(partial: Partial<RetryConfig>): void {
    this.config = new MutableRetryConfig({
      defaultMaxRetries: partial.maxRetries ?? this.config.maxRetries,
      defaultBackoff: partial.backoffStrategy ?? this.config.backoffStrategy,
      defaultInitialDelayMs: partial.initialDelayMs ?? this.config.initialDelayMs,
      defaultMaxDelayMs: partial.maxDelayMs ?? this.config.maxDelayMs,
      defaultJitter: partial.jitter ?? this.config.jitter,
      metadata: { ...this.config.metadata, ...partial.metadata },
    });
  }

  shouldRetry(error: Error, attempt: number): boolean {
    if (attempt >= this.config.maxRetries) return false;
    const msg = error.message.toLowerCase();
    for (const pattern of this.config.retryableErrors) {
      if (msg.includes(pattern.toLowerCase())) return true;
    }
    return false;
  }

  getDelay(attempt: number): number {
    let delay: number;

    switch (this.config.backoffStrategy) {
      case BS.Fixed:
        delay = this.config.initialDelayMs;
        break;

      case BS.Linear:
        delay = this.config.initialDelayMs * attempt;
        break;

      case BS.Exponential:
        delay = this.config.initialDelayMs * Math.pow(2, attempt - 1);
        break;

      case BS.ExponentialJitter:
        delay = this.config.initialDelayMs * Math.pow(2, attempt - 1);
        delay += Math.random() * this.config.initialDelayMs;
        break;

      default:
        delay = this.config.initialDelayMs;
    }

    // Cap at maxDelayMs
    if (delay > this.config.maxDelayMs) {
      delay = this.config.maxDelayMs;
    }

    return Math.floor(delay);
  }

  recordAttempt(attempt: RetryAttempt): void {
    // Use the attempt's metadata to get executionId if present
    const eid = attempt.metadata['executionId'] as string | undefined;
    const key = eid ?? '__global__';
    const list = this.attempts.get(key) ?? [];
    list.push(attempt);
    this.attempts.set(key, list);
  }

  getAttempts(executionId: string): readonly RetryAttempt[] {
    return this.attempts.get(executionId) ?? [];
  }

  reset(executionId: string): void {
    this.attempts.delete(executionId);
  }
}
