/**
 * Workflow Runtime — Transition Engine
 * TASK-AIS-003H.000
 *
 * Evaluates conditions, guards, timeouts, retries, and dependencies
 * to determine valid transitions between workflow stages.
 */

import type {
  TransitionDefinition,
  StageDefinition,
  StageId,
} from './types.js';

export interface TransitionEvaluation {
  readonly transition: TransitionDefinition;
  readonly allowed: boolean;
  readonly reason: string;
}

export interface TransitionResult {
  readonly nextStageId: StageId;
  readonly transition: TransitionDefinition;
  readonly conditionMet: boolean;
  readonly guardPassed: boolean;
}

export class TransitionEngine {
  private readonly conditionEvaluators = new Map<string, ConditionEvaluator>();
  private readonly guardEvaluators = new Map<string, GuardEvaluator>();

  registerConditionEvaluator(name: string, evaluator: ConditionEvaluator): void {
    this.conditionEvaluators.set(name, evaluator);
  }

  registerGuardEvaluator(name: string, evaluator: GuardEvaluator): void {
    this.guardEvaluators.set(name, evaluator);
  }

  /**
   * Find all valid next stages from the current stage.
   */
  findValidTransitions(
    currentStageId: StageId,
    transitions: readonly TransitionDefinition[],
    variables: ReadonlyMap<string, unknown>,
  ): readonly TransitionEvaluation[] {
    return transitions
      .filter(t => t.from === currentStageId)
      .sort((a, b) => a.priority - b.priority)
      .map(t => this.evaluateTransition(t, variables));
  }

  /**
   * Evaluate a single transition.
   */
  evaluateTransition(
    transition: TransitionDefinition,
    variables: ReadonlyMap<string, unknown>,
  ): TransitionEvaluation {
    // If no condition, always allowed
    if (!transition.condition) {
      // Check guard
      if (transition.guard) {
        const guard = this.guardEvaluators.get(transition.guard);
        if (!guard) {
          return { transition, allowed: false, reason: `Guard "${transition.guard}" not registered` };
        }
        try {
          const passed = guard(variables);
          if (!passed) {
            return { transition, allowed: false, reason: `Guard "${transition.guard}" denied` };
          }
        } catch (e) {
          return {
            transition,
            allowed: false,
            reason: `Guard "${transition.guard}" error: ${e instanceof Error ? e.message : String(e)}`,
          };
        }
      }
      return { transition, allowed: true, reason: 'Allowed' };
    }

    const evaluator = this.conditionEvaluators.get(transition.condition);
    if (!evaluator) {
      return {
        transition,
        allowed: false,
        reason: `Condition evaluator "${transition.condition}" not registered`,
      };
    }

    try {
      const met = evaluator(variables);
      if (!met) {
        return { transition, allowed: false, reason: `Condition "${transition.condition}" not met` };
      }
    } catch (e) {
      return {
        transition,
        allowed: false,
        reason: `Condition "${transition.condition}" error: ${e instanceof Error ? e.message : String(e)}`,
      };
    }

    // Check guard after condition passes
    if (transition.guard) {
      const guard = this.guardEvaluators.get(transition.guard);
      if (!guard) {
        return { transition, allowed: false, reason: `Guard "${transition.guard}" not registered` };
      }
      try {
        const passed = guard(variables);
        if (!passed) {
          return { transition, allowed: false, reason: `Guard "${transition.guard}" denied` };
        }
      } catch (e) {
        return {
          transition,
          allowed: false,
          reason: `Guard "${transition.guard}" error: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
    }

    return { transition, allowed: true, reason: 'Condition met, guard passed' };
  }

  /**
   * Check if a stage's dependencies are all satisfied.
   */
  checkDependencies(
    stage: StageDefinition,
    completedStages: ReadonlySet<StageId>,
    skippedStages: ReadonlySet<StageId>,
  ): boolean {
    for (const dep of stage.dependencies) {
      if (!completedStages.has(dep) && !skippedStages.has(dep)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Select the best next transition from available valid transitions.
   * Returns the highest-priority allowed transition.
   */
  selectTransition(
    transitions: readonly TransitionEvaluation[],
  ): TransitionEvaluation | null {
    const allowed = transitions.filter(t => t.allowed);
    if (allowed.length === 0) return null;
    return allowed[0];
  }

  /**
   * Check timeout for a stage.
   */
  checkTimeout(stage: StageDefinition, startedAt: Date): boolean {
    const elapsed = Date.now() - startedAt.getTime();
    return elapsed > stage.timeoutMs;
  }

  /**
   * Check if retry is possible for a stage.
   */
  checkRetry(stage: StageDefinition, attempt: number, errorCode: string): boolean {
    const policy = stage.retryPolicy;
    if (attempt >= policy.maxAttempts) return false;
    if (policy.retryableErrors.length === 0) return true;
    return policy.retryableErrors.includes(errorCode);
  }

  /**
   * Calculate retry delay with exponential backoff.
   */
  calculateRetryDelay(stage: StageDefinition, attempt: number): number {
    const policy = stage.retryPolicy;
    return Math.round(policy.delayMs * Math.pow(policy.backoffMultiplier, attempt));
  }
}

// ─── Evaluator Types ────────────────────────────────────────────

export type ConditionEvaluator = (variables: ReadonlyMap<string, unknown>) => boolean;
export type GuardEvaluator = (variables: ReadonlyMap<string, unknown>) => boolean;
