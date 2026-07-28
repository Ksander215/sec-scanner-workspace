/**
 * Recovery Policy — Determines how the pipeline handles failures.
 *
 * Conforms to: AIS-003B.000 Requirement #8
 *   ExecutionError → RecoveryPolicy → Retry | Abort | Escalation
 *
 * Recovery actions:
 *   - retry:     Re-execute the task (delegated to RetryPolicy).
 *   - abort:     Stop the entire pipeline; transition FSM to Failed.
 *   - escalate:  Forward the error to a higher authority (caller).
 *
 * The DefaultRecoveryPolicy inspects the error and applies rules:
 *   1. If the cancellation token is cancelled → abort.
 *   2. If the error is retryable → retry (via RetryPolicy).
 *   3. If the error is not retryable → escalate.
 *   4. If retry policy says no more retries → escalate.
 */
import type { CancellationToken } from '../types.js';
import type { RetryPolicy, RetryDecision } from './retry-policy.js';
import { DEFAULT_RETRY_POLICY } from './retry-policy.js';
import { ExecutionError } from '../errors.js';

export type RecoveryAction = 'retry' | 'abort' | 'escalate';

export interface RecoveryDecision {
  readonly action: RecoveryAction;
  readonly retryDecision?: RetryDecision;
  readonly reason: string;
}

export interface RecoveryPolicy {
  readonly policyName: string;
  decide(error: unknown, attempt: number, token?: CancellationToken): RecoveryDecision;
}

export class DefaultRecoveryPolicy implements RecoveryPolicy {
  readonly policyName = 'default-recovery';
  private readonly retryPolicy: RetryPolicy;

  constructor(retryPolicy?: RetryPolicy) {
    this.retryPolicy = retryPolicy ?? DEFAULT_RETRY_POLICY;
  }

  decide(error: unknown, attempt: number, token?: CancellationToken): RecoveryDecision {
    // Rule 1: If cancelled, always abort
    if (token?.cancelled) {
      return {
        action: 'abort',
        reason: 'Execution is cancelled',
      };
    }

    // Rule 2: Map to structured error
    const execError = error instanceof ExecutionError
      ? error
      : new ExecutionError('UNKNOWN', String(error), false, error);

    // Rule 3: Non-retryable errors → escalate immediately
    if (!execError.retryable) {
      return {
        action: 'escalate',
        reason: `Error '${execError.code}' is not retryable`,
      };
    }

    // Rule 4: Retryable errors → delegate to RetryPolicy
    const retryDecision = this.retryPolicy.decide(attempt, error);
    if (retryDecision.shouldRetry) {
      return {
        action: 'retry',
        retryDecision,
        reason: retryDecision.reason,
      };
    }

    // Rule 5: Retry policy exhausted → escalate
    return {
      action: 'escalate',
      reason: `Retry policy exhausted: ${retryDecision.reason}`,
    };
  }
}
