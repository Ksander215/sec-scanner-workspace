/**
 * Cognitive Runtime — Cognitive Policies
 * TASK-AIS-003I.000
 *
 * Enforces policies across the Cognitive Runtime:
 *   - Privacy Policy
 *   - Cost Policy
 *   - Token Policy
 *   - Trust Policy
 *   - Capability Policy
 *   - Conversation Policy
 *
 * Conforms to: ARC-001.001, DOM-002.000
 */

import { CognitivePolicyType } from './types.js';
import type {
  CognitivePolicyDefinition,
  CognitivePolicyResult,
  CognitiveContext,
  Intent,
  PromptContext,
} from './types.js';

/**
 * Policy evaluator function type.
 */
export type PolicyEvaluator = (params: {
  context: CognitiveContext;
  intent: Intent | null;
  prompt: PromptContext | null;
  policy: CognitivePolicyDefinition;
}) => Promise<CognitivePolicyResult>;

/**
 * Cognitive Policy Engine — evaluates and enforces policies.
 */
export class CognitivePolicyEngine {
  private readonly _policies: Map<string, CognitivePolicyDefinition> = new Map();
  private readonly _evaluators: Map<CognitivePolicyType, PolicyEvaluator> = new Map();

  /**
   * Register a policy.
   */
  registerPolicy(policy: CognitivePolicyDefinition): void {
    this._policies.set(policy.id, policy);
  }

  /**
   * Register a custom policy evaluator for a policy type.
   */
  registerEvaluator(type: CognitivePolicyType, evaluator: PolicyEvaluator): void {
    this._evaluators.set(type, evaluator);
  }

  /**
   * Register default evaluators for all built-in policy types.
   */
  registerDefaultEvaluators(): void {
    this._evaluators.set(CognitivePolicyType.Privacy, this.evaluatePrivacyPolicy);
    this._evaluators.set(CognitivePolicyType.Cost, this.evaluateCostPolicy);
    this._evaluators.set(CognitivePolicyType.Token, this.evaluateTokenPolicy);
    this._evaluators.set(CognitivePolicyType.Trust, this.evaluateTrustPolicy);
    this._evaluators.set(CognitivePolicyType.Capability, this.evaluateCapabilityPolicy);
    this._evaluators.set(CognitivePolicyType.Conversation, this.evaluateConversationPolicy);
  }

  /**
   * Evaluate all applicable policies for a given context.
   */
  async evaluate(params: {
    context: CognitiveContext;
    intent: Intent | null;
    prompt: PromptContext | null;
    requiredTypes?: readonly CognitivePolicyType[];
  }): Promise<{
    allowed: boolean;
    results: readonly CognitivePolicyResult[];
    violations: readonly CognitivePolicyResult[];
  }> {
    const results: CognitivePolicyResult[] = [];
    const violations: CognitivePolicyResult[] = [];

    const policies = this.getApplicablePolicies(params.requiredTypes);

    for (const policy of policies) {
      try {
        const result = await this.evaluatePolicy(policy, params);
        results.push(result);
        if (!result.allowed) {
          violations.push(result);
        }
      } catch (error) {
        results.push({
          allowed: false,
          policyId: policy.id,
          policyType: policy.type,
          reason: `Policy evaluation error: ${error instanceof Error ? error.message : 'unknown'}`,
          constraints: Object.freeze({}),
        });
        violations.push(results[results.length - 1]);
      }
    }

    return {
      allowed: violations.length === 0,
      results: Object.freeze(results),
      violations: Object.freeze(violations),
    };
  }

  /**
   * Get all registered policies.
   */
  listPolicies(): readonly CognitivePolicyDefinition[] {
    return Array.from(this._policies.values());
  }

  /**
   * Get policies of a specific type.
   */
  getPoliciesByType(type: CognitivePolicyType): readonly CognitivePolicyDefinition[] {
    return Array.from(this._policies.values()).filter(p => p.type === type);
  }

  /**
   * Get applicable policies.
   */
  private getApplicablePolicies(requiredTypes?: readonly CognitivePolicyType[]): CognitivePolicyDefinition[] {
    let policies = Array.from(this._policies.values());

    if (requiredTypes && requiredTypes.length > 0) {
      policies = policies.filter(p => requiredTypes.includes(p.type));
    }

    return policies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Evaluate a single policy.
   */
  private async evaluatePolicy(
    policy: CognitivePolicyDefinition,
    params: { context: CognitiveContext; intent: Intent | null; prompt: PromptContext | null },
  ): Promise<CognitivePolicyResult> {
    const evaluator = this._evaluators.get(policy.type);
    if (evaluator) {
      return evaluator({ ...params, policy });
    }

    // Default: allow
    return {
      allowed: true,
      policyId: policy.id,
      policyType: policy.type,
      reason: 'No evaluator registered; default allow',
      constraints: Object.freeze({}),
    };
  }

  /**
   * Privacy policy evaluator.
   */
  private async evaluatePrivacyPolicy(params: {
    context: CognitiveContext;
    intent: Intent | null;
    prompt: PromptContext | null;
    policy: CognitivePolicyDefinition;
  }): Promise<CognitivePolicyResult> {
    const privacyLevel = (params.policy.rules.privacyLevel as number) ?? 1;
    const contextPrivacy = params.context.policies.privacyLevel;

    return {
      allowed: contextPrivacy >= privacyLevel,
      policyId: params.policy.id,
      policyType: CognitivePolicyType.Privacy,
      reason: contextPrivacy >= privacyLevel
        ? `Privacy level ${contextPrivacy} meets requirement ${privacyLevel}`
        : `Privacy level ${contextPrivacy} below requirement ${privacyLevel}`,
      constraints: Object.freeze({ privacyLevel, contextPrivacy }),
    };
  }

  /**
   * Cost policy evaluator.
   */
  private async evaluateCostPolicy(params: {
    context: CognitiveContext;
    intent: Intent | null;
    prompt: PromptContext | null;
    policy: CognitivePolicyDefinition;
  }): Promise<CognitivePolicyResult> {
    const costBudget = (params.policy.rules.costBudget as number) ?? Infinity;
    const estimatedCost = (params.policy.rules.estimatedCost as number) ?? 0;

    return {
      allowed: estimatedCost <= costBudget,
      policyId: params.policy.id,
      policyType: CognitivePolicyType.Cost,
      reason: estimatedCost <= costBudget
        ? `Estimated cost ${estimatedCost} within budget ${costBudget}`
        : `Estimated cost ${estimatedCost} exceeds budget ${costBudget}`,
      constraints: Object.freeze({ costBudget, estimatedCost }),
    };
  }

  /**
   * Token policy evaluator.
   */
  private async evaluateTokenPolicy(params: {
    context: CognitiveContext;
    intent: Intent | null;
    prompt: PromptContext | null;
    policy: CognitivePolicyDefinition;
  }): Promise<CognitivePolicyResult> {
    const maxTokens = (params.policy.rules.maxTokens as number) ?? 4096;
    const currentTokens = params.context.tokenEstimate;

    return {
      allowed: currentTokens <= maxTokens,
      policyId: params.policy.id,
      policyType: CognitivePolicyType.Token,
      reason: currentTokens <= maxTokens
        ? `Token count ${currentTokens} within limit ${maxTokens}`
        : `Token count ${currentTokens} exceeds limit ${maxTokens}`,
      constraints: Object.freeze({ maxTokens, currentTokens }),
    };
  }

  /**
   * Trust policy evaluator.
   */
  private async evaluateTrustPolicy(params: {
    context: CognitiveContext;
    intent: Intent | null;
    prompt: PromptContext | null;
    policy: CognitivePolicyDefinition;
  }): Promise<CognitivePolicyResult> {
    const requiredTrustLevel = (params.policy.rules.trustLevel as number) ?? 1;
    const contextTrustLevel = params.context.policies.trustLevel;

    return {
      allowed: contextTrustLevel >= requiredTrustLevel,
      policyId: params.policy.id,
      policyType: CognitivePolicyType.Trust,
      reason: contextTrustLevel >= requiredTrustLevel
        ? `Trust level ${contextTrustLevel} meets requirement ${requiredTrustLevel}`
        : `Trust level ${contextTrustLevel} below requirement ${requiredTrustLevel}`,
      constraints: Object.freeze({ trustLevel: requiredTrustLevel, contextTrustLevel }),
    };
  }

  /**
   * Capability policy evaluator.
   */
  private async evaluateCapabilityPolicy(params: {
    context: CognitiveContext;
    intent: Intent | null;
    prompt: PromptContext | null;
    policy: CognitivePolicyDefinition;
  }): Promise<CognitivePolicyResult> {
    const deniedCapabilities = params.context.capabilities.denied;
    const requiredCapabilities = params.intent?.requiredCapabilities ?? [];

    const denied = requiredCapabilities.some(cap => deniedCapabilities.includes(cap));

    return {
      allowed: !denied,
      policyId: params.policy.id,
      policyType: CognitivePolicyType.Capability,
      reason: denied
        ? `Required capability is denied`
        : `All required capabilities are available`,
      constraints: Object.freeze({ deniedCapabilities, requiredCapabilities }),
    };
  }

  /**
   * Conversation policy evaluator.
   */
  private async evaluateConversationPolicy(params: {
    context: CognitiveContext;
    intent: Intent | null;
    prompt: PromptContext | null;
    policy: CognitivePolicyDefinition;
  }): Promise<CognitivePolicyResult> {
    const maxTurns = (params.policy.rules.maxTurns as number) ?? 100;
    const currentTurns = params.context.conversationHistory.turnCount;

    return {
      allowed: currentTurns < maxTurns,
      policyId: params.policy.id,
      policyType: CognitivePolicyType.Conversation,
      reason: currentTurns < maxTurns
        ? `Turn count ${currentTurns} within limit ${maxTurns}`
        : `Turn count ${currentTurns} exceeds limit ${maxTurns}`,
      constraints: Object.freeze({ maxTurns, currentTurns }),
    };
  }
}
