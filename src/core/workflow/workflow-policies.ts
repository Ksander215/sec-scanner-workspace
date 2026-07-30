/**
 * Workflow Runtime — Policies
 * TASK-AIS-003H.000
 *
 * Enforces workflow-level policies:
 *   - Timeout: maximum workflow/stage execution time
 *   - Retry: retry behavior on failure
 *   - Parallelism: maximum concurrent stages
 *   - Security: access control and authorization
 *   - ResourceLimit: CPU, memory, stage limits
 */

import type {
  WorkflowPolicyDefinition,
  PolicyType,
  WorkflowInstanceId,
} from './types.js';
import { PolicyType as PT } from './types.js';
import {
  WorkflowPolicyViolationError,
} from './workflow-errors.js';

export interface PolicyEvaluation {
  readonly policyName: string;
  readonly type: PolicyType;
  readonly passed: boolean;
  readonly reason: string;
}

export class WorkflowPolicyEngine {
  private readonly policies = new Map<string, WorkflowPolicyDefinition>();
  private readonly policyHandlers = new Map<PolicyType, PolicyHandler>();

  registerPolicy(policy: WorkflowPolicyDefinition): void {
    this.policies.set(policy.id, policy);
  }

  registerPolicyHandler(type: PolicyType, handler: PolicyHandler): void {
    this.policyHandlers.set(type, handler);
  }

  /**
   * Evaluate all registered policies against a context.
   */
  evaluateAll(context: PolicyContext): readonly PolicyEvaluation[] {
    const evaluations: PolicyEvaluation[] = [];

    for (const policy of this.policies.values()) {
      const evaluation = this.evaluatePolicy(policy, context);
      evaluations.push(evaluation);
    }

    return evaluations;
  }

  /**
   * Evaluate a single policy.
   */
  evaluatePolicy(policy: WorkflowPolicyDefinition, context: PolicyContext): PolicyEvaluation {
    const handler = this.policyHandlers.get(policy.type);

    if (!handler) {
      return {
        policyName: policy.name,
        type: policy.type,
        passed: true,
        reason: `No handler registered for policy type "${policy.type}"`,
      };
    }

    try {
      const result = handler(policy.rules, context);
      return {
        policyName: policy.name,
        type: policy.type,
        passed: result.passed,
        reason: result.reason,
      };
    } catch (e) {
      return {
        policyName: policy.name,
        type: policy.type,
        passed: false,
        reason: `Policy handler error: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }

  /**
   * Validate and throw on any policy violation.
   */
  async validate(context: PolicyContext): Promise<void> {
    const evaluations = this.evaluateAll(context);
    const violations = evaluations.filter(e => !e.passed);

    if (violations.length > 0) {
      const details = violations.map(v => `${v.policyName}: ${v.reason}`);
      throw new WorkflowPolicyViolationError(
        violations.map(v => v.policyName).join(', '),
        details,
      );
    }
  }

  /**
   * Remove a policy by ID.
   */
  removePolicy(policyId: string): boolean {
    return this.policies.delete(policyId);
  }

  /**
   * Get all registered policies.
   */
  getPolicies(): readonly WorkflowPolicyDefinition[] {
    return Array.from(this.policies.values());
  }

  /**
   * Register default policy handlers for common policy types.
   */
  registerDefaults(): void {
    // Timeout handler
    this.registerPolicyHandler(PT.Timeout, (rules, _context) => {
      const maxTimeout = rules.maxTimeoutMs as number ?? 3600000;
      const elapsed = rules.elapsedMs as number ?? 0;

      if (elapsed > maxTimeout) {
        return { passed: false, reason: `Timeout: elapsed ${elapsed}ms exceeds max ${maxTimeout}ms` };
      }
      return { passed: true, reason: 'Within timeout limit' };
    });

    // Retry handler
    this.registerPolicyHandler(PT.Retry, (rules, _context) => {
      const maxRetries = rules.maxRetries as number ?? 3;
      const attempts = rules.attempts as number ?? 0;

      if (attempts > maxRetries) {
        return { passed: false, reason: `Retry limit: ${attempts} attempts exceeds max ${maxRetries}` };
      }
      return { passed: true, reason: 'Within retry limit' };
    });

    // Parallelism handler
    this.registerPolicyHandler(PT.Parallelism, (rules, _context) => {
      const maxParallel = rules.maxParallel as number ?? 10;
      const currentParallel = rules.currentParallel as number ?? 0;

      if (currentParallel > maxParallel) {
        return {
          passed: false,
          reason: `Parallelism limit: ${currentParallel} exceeds max ${maxParallel}`,
        };
      }
      return { passed: true, reason: 'Within parallelism limit' };
    });

    // Resource limit handler
    this.registerPolicyHandler(PT.ResourceLimit, (rules, _context) => {
      const maxStages = rules.maxStages as number ?? 100;
      const currentStages = rules.currentStages as number ?? 0;

      if (currentStages > maxStages) {
        return {
          passed: false,
          reason: `Stage limit: ${currentStages} exceeds max ${maxStages}`,
        };
      }
      return { passed: true, reason: 'Within resource limits' };
    });

    // Security handler
    this.registerPolicyHandler(PT.Security, (rules, _context) => {
      const requiredRole = rules.requiredRole as string | undefined;
      const currentRole = rules.currentRole as string | undefined;

      if (requiredRole && requiredRole !== currentRole) {
        return {
          passed: false,
          reason: `Security: required role "${requiredRole}" but current role is "${currentRole ?? 'none'}"`,
        };
      }
      return { passed: true, reason: 'Security check passed' };
    });
  }

  clear(): void {
    this.policies.clear();
    this.policyHandlers.clear();
  }
}

// ─── Supporting Types ───────────────────────────────────────────

export interface PolicyContext {
  readonly workflowInstanceId?: WorkflowInstanceId;
  readonly stageId?: string;
  readonly stageType?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface PolicyResult {
  readonly passed: boolean;
  readonly reason: string;
}

export type PolicyHandler = (
  rules: Readonly<Record<string, unknown>>,
  context: PolicyContext,
) => PolicyResult;
