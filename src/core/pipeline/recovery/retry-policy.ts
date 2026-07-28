/**
 * Retry Policy — Controls how failed tasks are retried.
 *
 * Conforms to: AIS-003B.000 Requirement #9
 *   - NoRetry:       Never retry.
 *   - FixedRetry:    Retry up to N times with fixed delay.
 *   - LimitedRetry:  Retry up to N times with configurable delay strategy.
 *
 * Design:
 * - Policies are immutable and stateless.
 * - State (attempt counters) lives in the Task/Executor, not the policy.
 * - Policies decide only: "should we retry?" and "how long to wait?".
 */

/** Decision returned by a retry policy after a failure. */
export interface RetryDecision {
  /** Whether to retry the task. */
  readonly shouldRetry: boolean;
  /** Delay in milliseconds before the next attempt. 0 = immediate. */
  readonly delayMs: number;
  /** Human-readable reason (for audit/tracing). */
  readonly reason: string;
}

/** Abstract retry policy interface. Implementations are stateless. */
export interface RetryPolicy {
  readonly policyType: string;
  /** Maximum number of attempts (1 = no retries, 2 = one retry, etc.). */
  readonly maxAttempts: number;
  /** Determine whether and how to retry after a failure. */
  decide(attempt: number, error: unknown): RetryDecision;
}

// ─── NoRetry ─────────────────────────────────────────────────
/**
 * Never retries. Any failure is immediately final.
 */
export class NoRetryPolicy implements RetryPolicy {
  readonly policyType = 'no-retry';
  readonly maxAttempts = 1;

  decide(_attempt: number, _error: unknown): RetryDecision {
    return {
      shouldRetry: false,
      delayMs: 0,
      reason: 'No retry policy configured',
    };
  }
}

// ─── FixedRetry ─────────────────────────────────────────────
/**
 * Retries a fixed number of times with a constant delay between attempts.
 * Retries are attempted regardless of error type.
 */
export class FixedRetryPolicy implements RetryPolicy {
  readonly policyType = 'fixed-retry';
  readonly maxRetries: number;
  readonly delayMs: number;
  readonly maxAttempts: number;

  constructor(maxRetries: number, delayMs: number) {
    if (maxRetries < 0) throw new Error('maxRetries must be >= 0');
    if (delayMs < 0) throw new Error('delayMs must be >= 0');
    this.maxRetries = maxRetries;
    this.delayMs = delayMs;
    this.maxAttempts = maxRetries + 1;
  }

  decide(attempt: number, _error: unknown): RetryDecision {
    if (attempt >= this.maxAttempts) {
      return {
        shouldRetry: false,
        delayMs: 0,
        reason: `Max attempts (${this.maxAttempts}) reached`,
      };
    }
    return {
      shouldRetry: true,
      delayMs: this.delayMs,
      reason: `Fixed retry ${attempt}/${this.maxRetries} with ${this.delayMs}ms delay`,
    };
  }
}

// ─── LimitedRetry ────────────────────────────────────────────
/**
 * Retries with configurable delay and optional error-type filtering.
 * Only retries errors marked as retryable (unless retryNonRetryable is set).
 */
export class LimitedRetryPolicy implements RetryPolicy {
  readonly policyType = 'limited-retry';
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly retryNonRetryable: boolean;
  readonly maxAttempts: number;

  constructor(options: {
    maxRetries: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    retryNonRetryable?: boolean;
  }) {
    const { maxRetries, baseDelayMs = 100, maxDelayMs = 5000, retryNonRetryable = false } = options;
    if (maxRetries < 0) throw new Error('maxRetries must be >= 0');
    this.maxRetries = maxRetries;
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
    this.retryNonRetryable = retryNonRetryable;
    this.maxAttempts = maxRetries + 1;
  }

  decide(attempt: number, error: unknown): RetryDecision {
    if (attempt >= this.maxAttempts) {
      return {
        shouldRetry: false,
        delayMs: 0,
        reason: `Max attempts (${this.maxAttempts}) reached`,
      };
    }

    // Check if error is retryable (imported errors have a `retryable` flag)
    const isRetryableError = isRetryable(error);
    if (!isRetryableError && !this.retryNonRetryable) {
      return {
        shouldRetry: false,
        delayMs: 0,
        reason: 'Error is not retryable and retryNonRetryable is false',
      };
    }

    // Exponential backoff with cap: delay = min(baseDelay * 2^(attempt-1), maxDelay)
    const delay = Math.min(
      this.baseDelayMs * Math.pow(2, attempt - 1),
      this.maxDelayMs,
    );

    return {
      shouldRetry: true,
      delayMs: delay,
      reason: `Limited retry ${attempt}/${this.maxRetries} with ${delay}ms backoff`,
    };
  }
}

/** Check if an error is retryable (has retryable flag). */
function isRetryable(error: unknown): boolean {
  if (error !== null && typeof error === 'object' && 'retryable' in error) {
    return (error as { retryable: boolean }).retryable === true;
  }
  return false;
}

/** Default retry policy used by the pipeline. */
export const DEFAULT_RETRY_POLICY: RetryPolicy = new FixedRetryPolicy(2, 200);
