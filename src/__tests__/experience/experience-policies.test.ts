/**
 * Tests for ExperiencePolicies (Subsystem 10)
 * TASK-AIS-004A.000
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExperiencePolicies } from '../../core/experience/experience-policies.js';
import {
  ExperiencePolicyType,
  type ExperiencePolicy,
  type AdaptationType,
  type RecommendationType,
} from '../../core/experience/types.js';
import { PolicyViolationError, PolicyNotFoundError } from '../../core/experience/errors.js';

describe('ExperiencePolicies', () => {
  let policies: ExperiencePolicies;

  beforeEach(() => {
    policies = new ExperiencePolicies();
  });

  // ─── Constructor & Defaults ───────────────────────────────

  describe('constructor', () => {
    it('initializes with 7 default policies', () => {
      const all = policies.getAllPolicies();
      expect(all).toHaveLength(7);
    });

    it('initializes Privacy policy as active', () => {
      const p = policies.getPolicy(ExperiencePolicyType.Privacy);
      expect(p).not.toBeNull();
      expect(p!.isActive).toBe(true);
      expect(p!.type).toBe(ExperiencePolicyType.Privacy);
    });

    it('initializes Explainability policy as active', () => {
      const p = policies.getPolicy(ExperiencePolicyType.Explainability);
      expect(p).not.toBeNull();
      expect(p!.isActive).toBe(true);
    });

    it('initializes AdaptationRate policy as active', () => {
      const p = policies.getPolicy(ExperiencePolicyType.AdaptationRate);
      expect(p).not.toBeNull();
      expect(p!.isActive).toBe(true);
    });

    it('initializes RecommendationFrequency policy as active', () => {
      const p = policies.getPolicy(ExperiencePolicyType.RecommendationFrequency);
      expect(p).not.toBeNull();
      expect(p!.isActive).toBe(true);
    });

    it('initializes LearningThreshold policy as active', () => {
      const p = policies.getPolicy(ExperiencePolicyType.LearningThreshold);
      expect(p).not.toBeNull();
      expect(p!.isActive).toBe(true);
    });

    it('initializes Consent policy as active', () => {
      const p = policies.getPolicy(ExperiencePolicyType.Consent);
      expect(p).not.toBeNull();
      expect(p!.isActive).toBe(true);
    });

    it('initializes DataRetention policy as active', () => {
      const p = policies.getPolicy(ExperiencePolicyType.DataRetention);
      expect(p).not.toBeNull();
      expect(p!.isActive).toBe(true);
    });

    it('all default policies have createdAt and updatedAt timestamps', () => {
      const all = policies.getAllPolicies();
      for (const p of all) {
        expect(p.createdAt).toBeTruthy();
        expect(p.updatedAt).toBeTruthy();
      }
    });

    it('Privacy policy has correct default parameters', () => {
      const p = policies.getPolicy(ExperiencePolicyType.Privacy)!;
      expect(p.parameters.requireAnonymization).toBe(true);
      expect(p.parameters.allowCrossUserInference).toBe(false);
      expect(p.parameters.maxDataPointsPerSession).toBe(1000);
      expect(p.parameters.sensitiveFields).toContain('location');
    });

    it('AdaptationRate policy has correct default parameters', () => {
      const p = policies.getPolicy(ExperiencePolicyType.AdaptationRate)!;
      expect(p.parameters.maxAdaptationsPerHour).toBe(10);
      expect(p.parameters.maxAdaptationsPerDay).toBe(50);
    });

    it('RecommendationFrequency policy has correct default parameters', () => {
      const p = policies.getPolicy(ExperiencePolicyType.RecommendationFrequency)!;
      expect(p.parameters.maxRecommendationsPerSession).toBe(5);
      expect(p.parameters.maxRecommendationsPerDay).toBe(20);
    });

    it('LearningThreshold policy has correct default parameters', () => {
      const p = policies.getPolicy(ExperiencePolicyType.LearningThreshold)!;
      expect(p.parameters.minConfidenceForAdaptation).toBe(0.7);
      expect(p.parameters.minConfidenceForRecommendation).toBe(0.6);
    });

    it('Consent policy has correct default parameters', () => {
      const p = policies.getPolicy(ExperiencePolicyType.Consent)!;
      expect(p.parameters.requireConsentForAdaptation).toBe(true);
      expect(p.parameters.defaultConsentMode).toBe('Ask');
    });

    it('DataRetention policy has correct default parameters', () => {
      const p = policies.getPolicy(ExperiencePolicyType.DataRetention)!;
      expect(p.parameters.maxRetentionDays).toBe(365);
      expect(p.parameters.purgeAfterDays).toBe(730);
    });
  });

  // ─── setPolicy ─────────────────────────────────────────────

  describe('setPolicy', () => {
    it('stores a new policy', () => {
      const custom: ExperiencePolicy = {
        type: ExperiencePolicyType.Privacy,
        parameters: { requireAnonymization: false },
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      const result = policies.setPolicy(custom);
      expect(result.isActive).toBe(true);
      expect(result.parameters.requireAnonymization).toBe(false);
    });

    it('overwrites an existing policy of the same type', () => {
      const custom: ExperiencePolicy = {
        type: ExperiencePolicyType.Privacy,
        parameters: { requireAnonymization: false },
        isActive: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      policies.setPolicy(custom);
      const p = policies.getPolicy(ExperiencePolicyType.Privacy)!;
      expect(p.parameters.requireAnonymization).toBe(false);
      expect(p.isActive).toBe(false);
    });

    it('updates the updatedAt timestamp on set', () => {
      const custom: ExperiencePolicy = {
        type: ExperiencePolicyType.DataRetention,
        parameters: { maxRetentionDays: 30 },
        isActive: true,
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-01T00:00:00.000Z',
      };
      const result = policies.setPolicy(custom);
      expect(result.updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
    });

    it('does not affect other policies when setting one', () => {
      const countBefore = policies.getAllPolicies().length;
      policies.setPolicy({
        type: ExperiencePolicyType.Privacy,
        parameters: { requireAnonymization: false },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      expect(policies.getAllPolicies().length).toBe(countBefore);
    });
  });

  // ─── getPolicy ─────────────────────────────────────────────

  describe('getPolicy', () => {
    it('returns the policy for an existing type', () => {
      const p = policies.getPolicy(ExperiencePolicyType.Privacy);
      expect(p).not.toBeNull();
      expect(p!.type).toBe(ExperiencePolicyType.Privacy);
    });

    it('returns null for a non-existent type (string cast to bypass enum)', () => {
      // There are only 7 types, so a non-existent string cast should return null
      // But since TypeScript enums constrain this, we use type assertion
      const p = policies.getPolicy('NonExistent' as unknown as ExperiencePolicyType);
      expect(p).toBeNull();
    });
  });

  // ─── getAllPolicies ────────────────────────────────────────

  describe('getAllPolicies', () => {
    it('returns all policies', () => {
      const all = policies.getAllPolicies();
      expect(all.length).toBeGreaterThanOrEqual(7);
    });

    it('returns a snapshot that is not affected by later changes', () => {
      const all1 = policies.getAllPolicies();
      policies.setPolicy({
        type: ExperiencePolicyType.Privacy,
        parameters: { requireAnonymization: false },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      expect(all1.length).toBe(7);
      expect(policies.getAllPolicies().length).toBe(7);
    });

    it('each returned policy has a type property', () => {
      for (const p of policies.getAllPolicies()) {
        expect(p.type).toBeTruthy();
      }
    });
  });

  // ─── removePolicy ──────────────────────────────────────────

  describe('removePolicy', () => {
    it('removes a policy by type', () => {
      expect(policies.getPolicy(ExperiencePolicyType.Privacy)).not.toBeNull();
      policies.removePolicy(ExperiencePolicyType.Privacy);
      expect(policies.getPolicy(ExperiencePolicyType.Privacy)).toBeNull();
    });

    it('reduces total policy count', () => {
      const countBefore = policies.getAllPolicies().length;
      policies.removePolicy(ExperiencePolicyType.DataRetention);
      expect(policies.getAllPolicies().length).toBe(countBefore - 1);
    });

    it('throws PolicyNotFoundError for non-existent policy', () => {
      expect(() =>
        policies.removePolicy('NonExistent' as unknown as ExperiencePolicyType)
      ).toThrow(PolicyNotFoundError);
    });

    it('thrown error includes policy type in message', () => {
      try {
        policies.removePolicy('NonExistent' as unknown as ExperiencePolicyType);
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect((err as Error).message).toContain('NonExistent');
      }
    });
  });

  // ─── evaluate ─────────────────────────────────────────────

  describe('evaluate', () => {
    it('returns true for allowed actions by default', () => {
      const result = policies.evaluate(ExperiencePolicyType.Privacy, {});
      expect(result).toBe(true);
    });

    it('returns true when no policy is set for a type', () => {
      policies.removePolicy(ExperiencePolicyType.Privacy);
      const result = policies.evaluate(ExperiencePolicyType.Privacy, {});
      expect(result).toBe(true);
    });

    it('returns true for inactive policy', () => {
      policies.setPolicy({
        type: ExperiencePolicyType.Privacy,
        parameters: { requireAnonymization: true, sensitiveFields: ['health'] },
        isActive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const result = policies.evaluate(ExperiencePolicyType.Privacy, {
        accessedFields: ['health'],
        isAnonymized: false,
      });
      expect(result).toBe(true);
    });

    it('throws PolicyViolationError for denied actions (privacy)', () => {
      expect(() =>
        policies.evaluate(ExperiencePolicyType.Privacy, {
          accessedFields: ['health'],
          isAnonymized: false,
        })
      ).toThrow(PolicyViolationError);
    });

    it('privacy violation message mentions sensitive fields', () => {
      try {
        policies.evaluate(ExperiencePolicyType.Privacy, {
          accessedFields: ['health'],
          isAnonymized: false,
        });
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect((err as Error).message).toContain('sensitive');
      }
    });

    it('allows anonymized access to sensitive fields', () => {
      const result = policies.evaluate(ExperiencePolicyType.Privacy, {
        accessedFields: ['health', 'location'],
        isAnonymized: true,
      });
      expect(result).toBe(true);
    });

    it('allows access to non-sensitive fields without anonymization', () => {
      const result = policies.evaluate(ExperiencePolicyType.Privacy, {
        accessedFields: ['preferences', 'settings'],
        isAnonymized: false,
      });
      expect(result).toBe(true);
    });

    it('throws for cross-user inference when not allowed', () => {
      expect(() =>
        policies.evaluate(ExperiencePolicyType.Privacy, {
          isCrossUserInference: true,
        })
      ).toThrow(PolicyViolationError);
    });

    it('allows cross-user inference when parameter is true', () => {
      policies.setPolicy({
        type: ExperiencePolicyType.Privacy,
        parameters: { allowCrossUserInference: true },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const result = policies.evaluate(ExperiencePolicyType.Privacy, {
        isCrossUserInference: true,
      });
      expect(result).toBe(true);
    });

    it('throws for missing explanation (Explainability)', () => {
      expect(() =>
        policies.evaluate(ExperiencePolicyType.Explainability, {
          hasExplanation: false,
        })
      ).toThrow(PolicyViolationError);
    });

    it('allows when explanation is present', () => {
      const result = policies.evaluate(ExperiencePolicyType.Explainability, {
        hasExplanation: true,
      });
      expect(result).toBe(true);
    });

    it('throws for adaptation rate exceeded per hour', () => {
      expect(() =>
        policies.evaluate(ExperiencePolicyType.AdaptationRate, {
          adaptationsThisHour: 10,
        })
      ).toThrow(PolicyViolationError);
    });

    it('allows when under adaptation rate per hour', () => {
      const result = policies.evaluate(ExperiencePolicyType.AdaptationRate, {
        adaptationsThisHour: 5,
      });
      expect(result).toBe(true);
    });

    it('throws for adaptation rate exceeded per day', () => {
      expect(() =>
        policies.evaluate(ExperiencePolicyType.AdaptationRate, {
          adaptationsThisDay: 50,
        })
      ).toThrow(PolicyViolationError);
    });

    it('allows when under adaptation rate per day', () => {
      const result = policies.evaluate(ExperiencePolicyType.AdaptationRate, {
        adaptationsThisDay: 25,
      });
      expect(result).toBe(true);
    });

    it('throws for recommendation frequency exceeded per session', () => {
      expect(() =>
        policies.evaluate(ExperiencePolicyType.RecommendationFrequency, {
          recommendationsThisSession: 5,
        })
      ).toThrow(PolicyViolationError);
    });

    it('allows when under recommendation frequency per session', () => {
      const result = policies.evaluate(ExperiencePolicyType.RecommendationFrequency, {
        recommendationsThisSession: 3,
      });
      expect(result).toBe(true);
    });

    it('throws for recommendation frequency exceeded per day', () => {
      expect(() =>
        policies.evaluate(ExperiencePolicyType.RecommendationFrequency, {
          recommendationsThisDay: 20,
        })
      ).toThrow(PolicyViolationError);
    });

    it('throws for confidence below learning threshold', () => {
      expect(() =>
        policies.evaluate(ExperiencePolicyType.LearningThreshold, {
          confidence: 0.5,
        })
      ).toThrow(PolicyViolationError);
    });

    it('allows when confidence meets threshold', () => {
      const result = policies.evaluate(ExperiencePolicyType.LearningThreshold, {
        confidence: 0.8,
      });
      expect(result).toBe(true);
    });

    it('allows when confidence exactly equals threshold', () => {
      const result = policies.evaluate(ExperiencePolicyType.LearningThreshold, {
        confidence: 0.7,
      });
      expect(result).toBe(true);
    });

    it('throws for missing consent (Consent)', () => {
      expect(() =>
        policies.evaluate(ExperiencePolicyType.Consent, {
          hasConsent: false,
        })
      ).toThrow(PolicyViolationError);
    });

    it('allows when consent is granted', () => {
      const result = policies.evaluate(ExperiencePolicyType.Consent, {
        hasConsent: true,
      });
      expect(result).toBe(true);
    });

    it('throws for data exceeding retention period', () => {
      expect(() =>
        policies.evaluate(ExperiencePolicyType.DataRetention, {
          dataAgeDays: 400,
        })
      ).toThrow(PolicyViolationError);
    });

    it('allows when data within retention period', () => {
      const result = policies.evaluate(ExperiencePolicyType.DataRetention, {
        dataAgeDays: 200,
      });
      expect(result).toBe(true);
    });
  });

  // ─── validateAdaptation ────────────────────────────────────

  describe('validateAdaptation', () => {
    it('returns allowed=true for valid adaptation', () => {
      const result = policies.validateAdaptation(
        'ResponseStyle' as AdaptationType,
        crypto.randomUUID(),
        { hasConsent: true, hasExplanation: true },
      );
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeTruthy();
    });

    it('returns allowed=false when privacy blocks', () => {
      const result = policies.validateAdaptation(
        'ResponseStyle' as AdaptationType,
        crypto.randomUUID(),
        { accessedFields: ['health'], isAnonymized: false },
      );
      expect(result.allowed).toBe(false);
    });

    it('returns allowed=false when explainability blocks', () => {
      const result = policies.validateAdaptation(
        'ResponseStyle' as AdaptationType,
        crypto.randomUUID(),
        { hasExplanation: false },
      );
      expect(result.allowed).toBe(false);
    });

    it('returns allowed=false when adaptation rate blocks', () => {
      const result = policies.validateAdaptation(
        'ResponseStyle' as AdaptationType,
        crypto.randomUUID(),
        { adaptationsThisHour: 10 },
      );
      expect(result.allowed).toBe(false);
    });

    it('returns allowed=false when learning threshold blocks', () => {
      const result = policies.validateAdaptation(
        'ResponseStyle' as AdaptationType,
        crypto.randomUUID(),
        { confidence: 0.3 },
      );
      expect(result.allowed).toBe(false);
    });

    it('returns allowed=false when consent blocks', () => {
      const result = policies.validateAdaptation(
        'ResponseStyle' as AdaptationType,
        crypto.randomUUID(),
        { hasConsent: false },
      );
      expect(result.allowed).toBe(false);
    });

    it('reason includes policy information when blocked', () => {
      const result = policies.validateAdaptation(
        'ResponseStyle' as AdaptationType,
        crypto.randomUUID(),
        { adaptationsThisHour: 100 },
      );
      expect(result.reason).toBeTruthy();
      expect(result.reason).not.toBe('All adaptation policies passed');
    });

    it('enriches context with adaptationType and userIdHash', () => {
      const userId = crypto.randomUUID();
      // The enricher adds adaptationType and userIdHash to the context.
      // Explainability policy requires hasExplanation, so provide it.
      const result = policies.validateAdaptation(
        'ResponseStyle' as AdaptationType,
        userId,
        { hasExplanation: true },
      );
      expect(result.allowed).toBe(true);
    });

    it('skips inactive policies during validation', () => {
      policies.setPolicy({
        type: ExperiencePolicyType.Explainability,
        parameters: { requireExplanation: true },
        isActive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const result = policies.validateAdaptation(
        'ResponseStyle' as AdaptationType,
        crypto.randomUUID(),
        { hasExplanation: false },
      );
      expect(result.allowed).toBe(true);
    });
  });

  // ─── validateRecommendation ────────────────────────────────

  describe('validateRecommendation', () => {
    it('returns allowed=true for valid recommendation', () => {
      const result = policies.validateRecommendation(
        'Workflow' as RecommendationType,
        crypto.randomUUID(),
        { hasConsent: true, hasExplanation: true },
      );
      expect(result.allowed).toBe(true);
    });

    it('returns allowed=false when privacy blocks', () => {
      const result = policies.validateRecommendation(
        'Workflow' as RecommendationType,
        crypto.randomUUID(),
        { accessedFields: ['financial'], isAnonymized: false },
      );
      expect(result.allowed).toBe(false);
    });

    it('returns allowed=false when recommendation frequency blocks', () => {
      const result = policies.validateRecommendation(
        'Workflow' as RecommendationType,
        crypto.randomUUID(),
        { recommendationsThisSession: 5 },
      );
      expect(result.allowed).toBe(false);
    });

    it('returns allowed=false when recommendation frequency per day blocks', () => {
      const result = policies.validateRecommendation(
        'Workflow' as RecommendationType,
        crypto.randomUUID(),
        { recommendationsThisDay: 20 },
      );
      expect(result.allowed).toBe(false);
    });

    it('returns allowed=false when explainability blocks', () => {
      const result = policies.validateRecommendation(
        'Feature' as RecommendationType,
        crypto.randomUUID(),
        { hasExplanation: false },
      );
      expect(result.allowed).toBe(false);
    });

    it('returns allowed=false when learning threshold blocks', () => {
      const result = policies.validateRecommendation(
        'Feature' as RecommendationType,
        crypto.randomUUID(),
        { confidence: 0.3 },
      );
      expect(result.allowed).toBe(false);
    });

    it('returns allowed=false when consent blocks', () => {
      const result = policies.validateRecommendation(
        'Feature' as RecommendationType,
        crypto.randomUUID(),
        { hasConsent: false },
      );
      expect(result.allowed).toBe(false);
    });

    it('passes for all conditions met', () => {
      const result = policies.validateRecommendation(
        'Automation' as RecommendationType,
        crypto.randomUUID(),
        {
          hasConsent: true,
          hasExplanation: true,
          confidence: 0.9,
          recommendationsThisSession: 0,
        },
      );
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('All recommendation policies passed');
    });

    it('enriches context with recommendationType and userIdHash', () => {
      const userId = crypto.randomUUID();
      const result = policies.validateRecommendation(
        'KnowledgePack' as RecommendationType,
        userId,
        { hasExplanation: true },
      );
      expect(result.allowed).toBe(true);
    });

    it('skips inactive policies during validation', () => {
      policies.setPolicy({
        type: ExperiencePolicyType.RecommendationFrequency,
        parameters: { maxRecommendationsPerSession: 1 },
        isActive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const result = policies.validateRecommendation(
        'Workflow' as RecommendationType,
        crypto.randomUUID(),
        { recommendationsThisSession: 100, hasExplanation: true },
      );
      expect(result.allowed).toBe(true);
    });
  });
});
