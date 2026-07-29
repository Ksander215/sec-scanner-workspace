import { describe, it, expect } from 'vitest';
import { DefaultRecoveryPolicy } from '../core/pipeline/recovery/recovery-policy.js';
import { NoRetryPolicy, FixedRetryPolicy } from '../core/pipeline/recovery/retry-policy.js';
import { ExecutionError } from '../core/pipeline/errors.js';
import { CancellationTokenImpl } from '../core/pipeline/cancellation-token.js';

describe('DefaultRecoveryPolicy', () => {
  it('uses default retry policy when none provided', () => {
    const policy = new DefaultRecoveryPolicy();
    expect(policy.policyName).toBe('default-recovery');
  });

  it('aborts when token is cancelled', () => {
    const policy = new DefaultRecoveryPolicy(new NoRetryPolicy());
    const token = new CancellationTokenImpl();
    token.cancel('user request');
    const decision = policy.decide(new Error('test'), 1, token);
    expect(decision.action).toBe('abort');
    expect(decision.reason).toBe('Execution is cancelled');
  });

  it('escalates non-retryable errors immediately', () => {
    const policy = new DefaultRecoveryPolicy(new FixedRetryPolicy(5, 100));
    const err = new ExecutionError('NOT_RETRYABLE', 'Something broke', false);
    const decision = policy.decide(err, 1);
    expect(decision.action).toBe('escalate');
    expect(decision.reason).toContain('not retryable');
  });

  it('retries retryable errors when retry policy allows', () => {
    const policy = new DefaultRecoveryPolicy(new FixedRetryPolicy(2, 50));
    const err = new ExecutionError('RETRYABLE', 'Transient failure', true);
    const decision = policy.decide(err, 1);
    expect(decision.action).toBe('retry');
    expect(decision.retryDecision).toBeDefined();
    expect(decision.retryDecision!.shouldRetry).toBe(true);
    expect(decision.retryDecision!.delayMs).toBe(50);
  });

  it('escalates when retry policy exhausted', () => {
    const policy = new DefaultRecoveryPolicy(new FixedRetryPolicy(1, 100));
    const err = new ExecutionError('RETRYABLE', 'Transient failure', true);
    const decision = policy.decide(err, 2); // attempt 2, maxAttempts = 2
    expect(decision.action).toBe('escalate');
    expect(decision.reason).toContain('exhausted');
  });

  it('wraps unknown errors as non-retryable and escalates', () => {
    const policy = new DefaultRecoveryPolicy(new FixedRetryPolicy(5, 100));
    const decision = policy.decide('some string error', 1);
    expect(decision.action).toBe('escalate');
  });

  it('wraps null/undefined errors gracefully', () => {
    const policy = new DefaultRecoveryPolicy(new FixedRetryPolicy(5, 100));
    const decision = policy.decide(null, 1);
    expect(decision.action).toBe('escalate');
  });

  it('aborts on retryable error if token cancelled mid-execution', () => {
    const policy = new DefaultRecoveryPolicy(new FixedRetryPolicy(5, 100));
    const token = new CancellationTokenImpl();
    token.cancel();
    const err = new ExecutionError('RETRYABLE', 'Transient', true);
    const decision = policy.decide(err, 1, token);
    expect(decision.action).toBe('abort');
  });
});
