/**
 * Experience Runtime — Experience Policies
 * TASK-AIS-004A.000  Subsystem 10
 *
 * Implements the policy engine governing all experience runtime behavior.
 * Provides built-in default policies for Privacy, Explainability, AdaptationRate,
 * RecommendationFrequency, LearningThreshold, Consent, and DataRetention.
 * Validates adaptations and recommendations against active policies.
 *
 * Conforms to: DOM-002, ADR-014, CON-001
 */

import type { Timestamp } from '../types/common.js';
import {
  ExperiencePolicyType,
  type ExperiencePolicy,
  type AdaptationType,
  type RecommendationType,
} from './types.js';
import { PolicyViolationError, PolicyNotFoundError } from './errors.js';

// ─── Default Policy Parameters ───────────────────────────────

/** Default parameters for each built-in policy type */
const DEFAULT_POLICY_PARAMETERS: Readonly<Record<ExperiencePolicyType, Readonly<Record<string, unknown>>>> = {
  [ExperiencePolicyType.Privacy]: {
    requireAnonymization: true,
    allowCrossUserInference: false,
    maxDataPointsPerSession: 1000,
    sensitiveFields: ['location', 'health', 'financial'],
  },
  [ExperiencePolicyType.Explainability]: {
    requireExplanation: true,
    minExplanationDetail: 'basic',
    storeExplanationHistory: true,
    maxExplanationHistoryDays: 90,
  },
  [ExperiencePolicyType.AdaptationRate]: {
    maxAdaptationsPerHour: 10,
    maxAdaptationsPerDay: 50,
    minIntervalBetweenAdaptationsMs: 60_000,
    cooldownAfterRevertMs: 300_000,
  },
  [ExperiencePolicyType.RecommendationFrequency]: {
    maxRecommendationsPerSession: 5,
    maxRecommendationsPerDay: 20,
    minIntervalBetweenRecommendationsMs: 120_000,
    maxActiveRecommendations: 10,
  },
  [ExperiencePolicyType.LearningThreshold]: {
    minConfidenceForAdaptation: 0.7,
    minConfidenceForRecommendation: 0.6,
    minObservationsBeforeAdaptation: 5,
    preferenceStabilityThreshold: 0.6,
  },
  [ExperiencePolicyType.Consent]: {
    requireConsentForAdaptation: true,
    requireConsentForRecommendation: false,
    requireConsentForContextDetection: true,
    requireConsentForDataCollection: true,
    defaultConsentMode: 'Ask',
  },
  [ExperiencePolicyType.DataRetention]: {
    maxRetentionDays: 365,
    anonymizeAfterDays: 30,
    purgeAfterDays: 730,
    autoArchiveAfterDays: 180,
  },
};

// ─── Policy Evaluator Functions ──────────────────────────────

type PolicyEvaluator = (
  parameters: Readonly<Record<string, unknown>>,
  context: Readonly<Record<string, unknown>>,
) => { allowed: boolean; reason: string };

const POLICY_EVALUATORS: Readonly<Record<ExperiencePolicyType, PolicyEvaluator>> = {
  [ExperiencePolicyType.Privacy]: (params, ctx) => {
    // Check if sensitive fields are being accessed without anonymization
    const sensitiveFields = params.sensitiveFields as readonly string[];
    const accessedFields = ctx.accessedFields as readonly string[] | undefined;

    if (accessedFields) {
      const hasSensitive = accessedFields.some(
        (f: string) => sensitiveFields.includes(f),
      );
      if (hasSensitive && params.requireAnonymization && !ctx.isAnonymized) {
        return {
          allowed: false,
          reason: 'Access to sensitive fields requires anonymization',
        };
      }
    }

    // Check cross-user inference
    if (
      params.allowCrossUserInference === false &&
      ctx.isCrossUserInference === true
    ) {
      return {
        allowed: false,
        reason: 'Cross-user inference is not allowed by privacy policy',
      };
    }

    return { allowed: true, reason: 'Privacy policy check passed' };
  },

  [ExperiencePolicyType.Explainability]: (params, ctx) => {
    if (params.requireExplanation && !ctx.hasExplanation) {
      return {
        allowed: false,
        reason: 'Explainability policy requires an explanation for this change',
      };
    }
    return { allowed: true, reason: 'Explainability policy check passed' };
  },

  [ExperiencePolicyType.AdaptationRate]: (params, ctx) => {
    const maxPerHour = params.maxAdaptationsPerHour as number;
    const maxPerDay = params.maxAdaptationsPerDay as number;
    const adaptationsThisHour = ctx.adaptationsThisHour as number | undefined;
    const adaptationsThisDay = ctx.adaptationsThisDay as number | undefined;

    if (
      adaptationsThisHour !== undefined &&
      adaptationsThisHour >= maxPerHour
    ) {
      return {
        allowed: false,
        reason: `Adaptation rate limit reached: ${adaptationsThisHour}/${maxPerHour} per hour`,
      };
    }

    if (
      adaptationsThisDay !== undefined &&
      adaptationsThisDay >= maxPerDay
    ) {
      return {
        allowed: false,
        reason: `Adaptation rate limit reached: ${adaptationsThisDay}/${maxPerDay} per day`,
      };
    }

    return { allowed: true, reason: 'Adaptation rate policy check passed' };
  },

  [ExperiencePolicyType.RecommendationFrequency]: (params, ctx) => {
    const maxPerSession = params.maxRecommendationsPerSession as number;
    const maxPerDay = params.maxRecommendationsPerDay as number;
    const recsThisSession = ctx.recommendationsThisSession as number | undefined;
    const recsThisDay = ctx.recommendationsThisDay as number | undefined;

    if (
      recsThisSession !== undefined &&
      recsThisSession >= maxPerSession
    ) {
      return {
        allowed: false,
        reason: `Recommendation frequency limit reached: ${recsThisSession}/${maxPerSession} per session`,
      };
    }

    if (
      recsThisDay !== undefined &&
      recsThisDay >= maxPerDay
    ) {
      return {
        allowed: false,
        reason: `Recommendation frequency limit reached: ${recsThisDay}/${maxPerDay} per day`,
      };
    }

    return { allowed: true, reason: 'Recommendation frequency policy check passed' };
  },

  [ExperiencePolicyType.LearningThreshold]: (params, ctx) => {
    const minConfidence = params.minConfidenceForAdaptation as number;
    const confidence = ctx.confidence as number | undefined;

    if (confidence !== undefined && confidence < minConfidence) {
      return {
        allowed: false,
        reason: `Confidence ${confidence} below learning threshold ${minConfidence}`,
      };
    }

    return { allowed: true, reason: 'Learning threshold policy check passed' };
  },

  [ExperiencePolicyType.Consent]: (_params, ctx) => {
    // Check consent status
    const hasConsent = ctx.hasConsent as boolean | undefined;
    if (hasConsent === false) {
      return {
        allowed: false,
        reason: 'Consent has not been granted for this operation',
      };
    }

    return { allowed: true, reason: 'Consent policy check passed' };
  },

  [ExperiencePolicyType.DataRetention]: (params, ctx) => {
    const maxRetentionDays = params.maxRetentionDays as number;
    const dataAgeDays = ctx.dataAgeDays as number | undefined;

    if (
      dataAgeDays !== undefined &&
      dataAgeDays > maxRetentionDays
    ) {
      return {
        allowed: false,
        reason: `Data exceeds retention period: ${dataAgeDays} days (max ${maxRetentionDays})`,
      };
    }

    return { allowed: true, reason: 'Data retention policy check passed' };
  },
};

// ─── ExperiencePolicies ──────────────────────────────────────

/**
 * Policy engine for the experience runtime.
 * Manages active policies, evaluates them against provided contexts,
 * and validates adaptations and recommendations.
 *
 * Built-in default policies are registered at construction time.
 */
export class ExperiencePolicies {
  private readonly policies = new Map<ExperiencePolicyType, ExperiencePolicy>();

  constructor() {
    this.initializeDefaults();
  }

  // ─── Policy Management ───────────────────────────────────

  /**
   * Sets (or replaces) a policy. If a policy of the same type already
   * exists, it is overwritten with the new one.
   */
  setPolicy(policy: ExperiencePolicy): ExperiencePolicy {
    const now = new Date().toISOString() as Timestamp;

    const updated: ExperiencePolicy = {
      ...policy,
      updatedAt: now,
    };

    this.policies.set(policy.type, updated);
    return updated;
  }

  /** Retrieves a policy by type, or null if not set. */
  getPolicy(type: ExperiencePolicyType): ExperiencePolicy | null {
    return this.policies.get(type) ?? null;
  }

  /** Returns all registered policies. */
  getAllPolicies(): readonly ExperiencePolicy[] {
    return [...this.policies.values()];
  }

  /** Removes a policy by type. */
  removePolicy(type: ExperiencePolicyType): void {
    if (!this.policies.has(type)) {
      throw new PolicyNotFoundError(
        `Policy not found: ${type}`,
        { policyType: type },
      );
    }
    this.policies.delete(type);
  }

  // ─── Evaluation ───────────────────────────────────────────

  /**
   * Evaluates a specific policy type against the given context.
   * Returns true if the action is allowed by the policy.
   * Throws PolicyViolationError if the policy exists and denies the action.
   */
  evaluate(
    policyType: ExperiencePolicyType,
    context: Readonly<Record<string, unknown>>,
  ): boolean {
    const policy = this.policies.get(policyType);

    // If no policy is set, allow by default
    if (!policy) return true;

    // Inactive policies don't block actions
    if (!policy.isActive) return true;

    const evaluator = POLICY_EVALUATORS[policyType];
    const result = evaluator(policy.parameters, context);

    if (!result.allowed) {
      throw new PolicyViolationError(
        result.reason,
        { policyType, context },
      );
    }

    return true;
  }

  /**
   * Validates whether an adaptation of the given type is allowed.
   * Checks AdaptationRate, Privacy, Explainability, LearningThreshold, and Consent policies.
   */
  validateAdaptation(
    type: AdaptationType,
    userIdHash: string,
    context: Readonly<Record<string, unknown>>,
  ): { allowed: boolean; reason: string } {
    // Enrich context with adaptation-specific fields
    const enriched = { ...context, adaptationType: type, userIdHash };

    // Check all relevant policies
    const relevantPolicies: readonly ExperiencePolicyType[] = [
      ExperiencePolicyType.AdaptationRate,
      ExperiencePolicyType.Privacy,
      ExperiencePolicyType.Explainability,
      ExperiencePolicyType.LearningThreshold,
      ExperiencePolicyType.Consent,
    ];

    for (const policyType of relevantPolicies) {
      const policy = this.policies.get(policyType);
      if (!policy || !policy.isActive) continue;

      const evaluator = POLICY_EVALUATORS[policyType];
      const result = evaluator(policy.parameters, enriched);
      if (!result.allowed) {
        return { allowed: false, reason: result.reason };
      }
    }

    return { allowed: true, reason: 'All adaptation policies passed' };
  }

  /**
   * Validates whether a recommendation of the given type is allowed.
   * Checks RecommendationFrequency, Privacy, Explainability, LearningThreshold, and Consent policies.
   */
  validateRecommendation(
    type: RecommendationType,
    userIdHash: string,
    context: Readonly<Record<string, unknown>>,
  ): { allowed: boolean; reason: string } {
    // Enrich context with recommendation-specific fields
    const enriched = { ...context, recommendationType: type, userIdHash };

    // Check all relevant policies
    const relevantPolicies: readonly ExperiencePolicyType[] = [
      ExperiencePolicyType.RecommendationFrequency,
      ExperiencePolicyType.Privacy,
      ExperiencePolicyType.Explainability,
      ExperiencePolicyType.LearningThreshold,
      ExperiencePolicyType.Consent,
    ];

    for (const policyType of relevantPolicies) {
      const policy = this.policies.get(policyType);
      if (!policy || !policy.isActive) continue;

      const evaluator = POLICY_EVALUATORS[policyType];
      const result = evaluator(policy.parameters, enriched);
      if (!result.allowed) {
        return { allowed: false, reason: result.reason };
      }
    }

    return { allowed: true, reason: 'All recommendation policies passed' };
  }

  // ─── Initialization ────────────────────────────────────────

  /**
   * Initializes built-in default policies.
   */
  private initializeDefaults(): void {
    const now = new Date().toISOString() as Timestamp;

    for (const policyType of [
      ExperiencePolicyType.Privacy,
      ExperiencePolicyType.Explainability,
      ExperiencePolicyType.AdaptationRate,
      ExperiencePolicyType.RecommendationFrequency,
      ExperiencePolicyType.LearningThreshold,
      ExperiencePolicyType.Consent,
      ExperiencePolicyType.DataRetention,
    ] as readonly ExperiencePolicyType[]) {
      const policy: ExperiencePolicy = {
        type: policyType,
        parameters: { ...DEFAULT_POLICY_PARAMETERS[policyType] },
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      this.policies.set(policyType, policy);
    }
  }
}
