import { describe, it, expect } from 'vitest';
import {
  NoRetryPolicy,
  FixedRetryPolicy,
  LimitedRetryPolicy,
} from '../core/pipeline/recovery/retry-policy.js';

describe('NoRetryPolicy', () => {
  it('has maxAttempts = 1', () => {
    expect(new NoRetryPolicy().maxAttempts).toBe(1);
  });

  it('never retries', () => {
    const policy = new NoRetryPolicy();
    const decision = policy.decide(1, new Error('fail'));
    expect(decision.shouldRetry).toBe(false);
    expect(decision.delayMs).toBe(0);
  });

  it('never retries regardless of attempt number', () => {
    const policy = new NoRetryPolicy();
    expect(policy.decide(1, 'err').shouldRetry).toBe(false);
    expect(policy.decide(5, 'err').shouldRetry).toBe(false);
  });
});

describe('FixedRetryPolicy', () => {
  it('rejects negative maxRetries', () => {
    expect(() => new FixedRetryPolicy(-1, 100)).toThrow('maxRetries must be >= 0');
  });

  it('rejects negative delayMs', () => {
    expect(() => new FixedRetryPolicy(2, -1)).toThrow('delayMs must be >= 0');
  });

  it('maxAttempts = maxRetries + 1', () => {
    expect(new FixedRetryPolicy(2, 100).maxAttempts).toBe(3);
    expect(new FixedRetryPolicy(0, 100).maxAttempts).toBe(1);
  });

  it('retries up to maxRetries times', () => {
    const policy = new FixedRetryPolicy(2, 50);
    expect(policy.decide(1, 'err').shouldRetry).toBe(true);
    expect(policy.decide(2, 'err').shouldRetry).toBe(true);
    expect(policy.decide(3, 'err').shouldRetry).toBe(false);
  });

  it('uses fixed delay', () => {
    const policy = new FixedRetryPolicy(3, 200);
    const d1 = policy.decide(1, 'err');
    const d2 = policy.decide(2, 'err');
    expect(d1.delayMs).toBe(200);
    expect(d2.delayMs).toBe(200);
  });

  it('zero retries is same as NoRetry', () => {
    const policy = new FixedRetryPolicy(0, 100);
    expect(policy.maxAttempts).toBe(1);
    expect(policy.decide(1, 'err').shouldRetry).toBe(false);
  });

  it('zero delay means immediate retry', () => {
    const policy = new FixedRetryPolicy(1, 0);
    const d = policy.decide(1, 'err');
    expect(d.shouldRetry).toBe(true);
    expect(d.delayMs).toBe(0);
  });
});

describe('LimitedRetryPolicy', () => {
  it('rejects negative maxRetries', () => {
    expect(() => new LimitedRetryPolicy({ maxRetries: -1 })).toThrow('maxRetries must be >= 0');
  });

  it('maxAttempts = maxRetries + 1', () => {
    expect(new LimitedRetryPolicy({ maxRetries: 3 }).maxAttempts).toBe(4);
  });

  it('retries retryable errors within limit', () => {
    const policy = new LimitedRetryPolicy({ maxRetries: 2, baseDelayMs: 100 });
    const err = new Error('fail');
    (err as unknown as Record<string, boolean>).retryable = true;
    expect(policy.decide(1, err).shouldRetry).toBe(true);
    expect(policy.decide(2, err).shouldRetry).toBe(true);
    expect(policy.decide(3, err).shouldRetry).toBe(false);
  });

  it('does not retry non-retryable errors by default', () => {
    const policy = new LimitedRetryPolicy({ maxRetries: 5 });
    const err = new Error('fail');
    (err as unknown as Record<string, boolean>).retryable = false;
    expect(policy.decide(1, err).shouldRetry).toBe(false);
  });

  it('retries non-retryable errors when retryNonRetryable is true', () => {
    const policy = new LimitedRetryPolicy({ maxRetries: 2, retryNonRetryable: true });
    const err = new Error('fail');
    (err as unknown as Record<string, boolean>).retryable = false;
    expect(policy.decide(1, err).shouldRetry).toBe(true);
  });

  it('applies exponential backoff with cap', () => {
    const policy = new LimitedRetryPolicy({
      maxRetries: 5,
      baseDelayMs: 100,
      maxDelayMs: 500,
    });
    const err = { retryable: true };
    expect(policy.decide(1, err).delayMs).toBe(100);   // 100 * 2^0 = 100
    expect(policy.decide(2, err).delayMs).toBe(200);   // 100 * 2^1 = 200
    expect(policy.decide(3, err).delayMs).toBe(400);   // 100 * 2^2 = 400
    expect(policy.decide(4, err).delayMs).toBe(500);   // 100 * 2^3 = 800, capped at 500
    expect(policy.decide(5, err).delayMs).toBe(500);   // capped
  });

  it('uses default baseDelayMs and maxDelayMs', () => {
    const policy = new LimitedRetryPolicy({ maxRetries: 1 });
    const err = { retryable: true };
    const d = policy.decide(1, err);
    expect(d.shouldRetry).toBe(true);
    expect(d.delayMs).toBeGreaterThan(0);
  });
});
