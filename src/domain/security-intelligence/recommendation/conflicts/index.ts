/**
 * Security Intelligence Recommendation Engine — Conflict Resolution
 *
 * Detects and resolves conflicts between recommendations:
 * - Contradictions (opposing recommendations)
 * - Duplicates (same target, same rule)
 * - Dependencies (one requires another first)
 * - Required ordering (execution constraints)
 */

import type {
  Recommendation, Conflict, ConflictResolution, ConflictType,
  RecommendationId, Metadata,
} from '../types/index.ts';
import { ConflictType as CT, RecommendationRuleType } from '../types/index.ts';
import { createConflict } from '../models/index.ts';

/**
 * Detect all conflicts among a set of recommendations.
 */
export function detectConflicts(
  recommendations: readonly Recommendation[],
): readonly Conflict[] {
  const conflicts: Conflict[] = [];

  // Check all pairs for conflicts
  for (let i = 0; i < recommendations.length; i++) {
    for (let j = i + 1; j < recommendations.length; j++) {
      const a = recommendations[i];
      const b = recommendations[j];

      // Check for duplicates
      const duplicate = detectDuplicate(a, b);
      if (duplicate) conflicts.push(duplicate);

      // Check for contradictions
      const contradiction = detectContradiction(a, b);
      if (contradiction) conflicts.push(contradiction);

      // Check for dependencies
      const dependency = detectDependency(a, b);
      if (dependency) conflicts.push(dependency);

      // Check for required ordering
      const ordering = detectRequiredOrder(a, b);
      if (ordering) conflicts.push(ordering);
    }
  }

  return Object.freeze(conflicts);
}

/**
 * Resolve a conflict using a deterministic strategy.
 */
export function resolveConflict(
  conflict: Conflict,
  recommendations: readonly Recommendation[],
): Conflict {
  const a = recommendations.find(r => r.id === conflict.recommendationIdA);
  const b = recommendations.find(r => r.id === conflict.recommendationIdB);

  if (!a || !b) {
    return Object.freeze({
      ...conflict,
      resolution: {
        strategy: 'skip' as const,
        winningId: null,
        reason: 'One or both recommendations not found',
        resultingActions: [],
      },
    });
  }

  switch (conflict.type) {
    case CT.Duplicate:
      return resolveDuplicate(conflict, a, b);
    case CT.Contradiction:
      return resolveContradiction(conflict, a, b);
    case CT.Dependency:
      return resolveDependency(conflict, a, b);
    case CT.RequiredOrder:
      return resolveRequiredOrder(conflict, a, b);
    default:
      return conflict;
  }
}

/**
 * Resolve all conflicts in a set of recommendations.
 * Returns the modified set of recommendations with duplicates removed
 * and conflicts resolved.
 */
export function resolveAllConflicts(
  recommendations: readonly Recommendation[],
): {
  readonly recommendations: readonly Recommendation[];
  readonly conflicts: readonly Conflict[];
  readonly resolved: readonly Conflict[];
} {
  const conflicts = detectConflicts(recommendations);
  const resolved: Conflict[] = [];
  const toRemove = new Set<RecommendationId>();

  for (const conflict of conflicts) {
    const resolvedConflict = resolveConflict(conflict, recommendations);
    resolved.push(resolvedConflict);

    // For resolved duplicates, remove the lower-ranked one
    if (resolvedConflict.resolution?.strategy === 'prefer-a') {
      toRemove.add(conflict.recommendationIdB);
    } else if (resolvedConflict.resolution?.strategy === 'prefer-b') {
      toRemove.add(conflict.recommendationIdA);
    } else if (resolvedConflict.resolution?.strategy === 'merge') {
      // Keep both for merge
    }
  }

  const filtered = recommendations.filter(r => !toRemove.has(r.id));

  return Object.freeze({
    recommendations: Object.freeze(filtered),
    conflicts: Object.freeze(conflicts),
    resolved: Object.freeze(resolved),
  });
}

// ─── Duplicate Detection ────────────────────────────────────

function detectDuplicate(a: Recommendation, b: Recommendation): Conflict | null {
  // Same target, same rule type
  if (a.targetId === b.targetId && a.ruleType === b.ruleType) {
    return createConflict({
      type: CT.Duplicate,
      recommendationIdA: a.id,
      recommendationIdB: b.id,
      description: `Duplicate recommendations for target ${a.targetId} with rule ${a.ruleType}`,
      severity: 'medium',
    });
  }

  // Same target, same source, overlapping rule types
  if (a.targetId === b.targetId && a.source === b.source && a.sourceId === b.sourceId) {
    return createConflict({
      type: CT.Duplicate,
      recommendationIdA: a.id,
      recommendationIdB: b.id,
      description: `Same source produced multiple recommendations for target ${a.targetId}`,
      severity: 'low',
    });
  }

  return null;
}

// ─── Contradiction Detection ────────────────────────────────

function detectContradiction(a: Recommendation, b: Recommendation): Conflict | null {
  // Disable endpoint vs. keeping it open (WAF, rate limiting, etc.)
  const disableTypes = new Set([RecommendationRuleType.DisableEndpoint, RecommendationRuleType.NetworkIsolation]);
  const keepOpenTypes = new Set([RecommendationRuleType.WAFRule, RecommendationRuleType.RateLimiting, RecommendationRuleType.CSP]);

  if (a.targetId === b.targetId) {
    const aDisables = disableTypes.has(a.ruleType);
    const bDisables = disableTypes.has(b.ruleType);
    const aKeepsOpen = keepOpenTypes.has(a.ruleType);
    const bKeepsOpen = keepOpenTypes.has(b.ruleType);

    if ((aDisables && bKeepsOpen) || (aKeepsOpen && bDisables)) {
      return createConflict({
        type: CT.Contradiction,
        recommendationIdA: a.id,
        recommendationIdB: b.id,
        description: `Contradiction: one recommendation disables ${a.targetId}, another protects it`,
        severity: 'high',
      });
    }
  }

  return null;
}

// ─── Dependency Detection ───────────────────────────────────

function detectDependency(a: Recommendation, b: Recommendation): Conflict | null {
  // Patch must come before configuration changes on the same target
  if (a.targetId === b.targetId || hasOverlappingFindings(a, b)) {
    // If one is a patch and the other is a config change, patch comes first
    const aIsPatch = a.ruleType === RecommendationRuleType.Patch;
    const bIsPatch = b.ruleType === RecommendationRuleType.Patch;
    const aIsConfig = a.ruleType === RecommendationRuleType.ConfigurationChange;
    const bIsConfig = b.ruleType === RecommendationRuleType.ConfigurationChange;

    if (aIsPatch && bIsConfig) {
      return createConflict({
        type: CT.Dependency,
        recommendationIdA: a.id,
        recommendationIdB: b.id,
        description: `Patch must be applied before configuration change on overlapping targets`,
        severity: 'medium',
      });
    }
    if (bIsPatch && aIsConfig) {
      return createConflict({
        type: CT.Dependency,
        recommendationIdA: a.id,
        recommendationIdB: b.id,
        description: `Patch must be applied before configuration change on overlapping targets`,
        severity: 'medium',
      });
    }

    // Network isolation before other mitigations
    const aIsNetwork = a.ruleType === RecommendationRuleType.NetworkIsolation;
    const bIsNetwork = b.ruleType === RecommendationRuleType.NetworkIsolation;
    if (aIsNetwork !== bIsNetwork && hasOverlappingFindings(a, b)) {
      return createConflict({
        type: CT.Dependency,
        recommendationIdA: a.id,
        recommendationIdB: b.id,
        description: `Network isolation should be applied before other mitigations`,
        severity: 'medium',
      });
    }
  }

  return null;
}

// ─── Required Order Detection ───────────────────────────────

function detectRequiredOrder(a: Recommendation, b: Recommendation): Conflict | null {
  // Secret rotation should happen before patching credential-related vulnerabilities
  if (hasOverlappingFindings(a, b)) {
    const aIsSecret = a.ruleType === RecommendationRuleType.SecretRotation;
    const bIsVuln = b.ruleType === RecommendationRuleType.Patch || b.ruleType === RecommendationRuleType.UpgradeDependency;
    if (aIsSecret && bIsVuln) {
      return createConflict({
        type: CT.RequiredOrder,
        recommendationIdA: a.id,
        recommendationIdB: b.id,
        description: `Secret rotation should be completed before patching related vulnerabilities`,
        severity: 'low',
      });
    }
  }

  return null;
}

// ─── Resolution Strategies ──────────────────────────────────

function resolveDuplicate(conflict: Conflict, a: Recommendation, b: Recommendation): Conflict {
  // Prefer higher-ranked recommendation
  const winner = a.ranking.overallScore >= b.ranking.overallScore ? a : b;
  const loser = winner === a ? b : a;

  return Object.freeze({
    ...conflict,
    resolution: {
      strategy: winner === a ? 'prefer-a' : 'prefer-b',
      winningId: winner.id,
      reason: `Duplicate resolved by preferring higher-ranked recommendation (score ${winner.ranking.overallScore.toFixed(3)} vs ${loser.ranking.overallScore.toFixed(3)})`,
      resultingActions: [winner.id] as any,
    },
  });
}

function resolveContradiction(conflict: Conflict, a: Recommendation, b: Recommendation): Conflict {
  // For contradictions, prefer the more protective option
  const disableTypes = new Set([RecommendationRuleType.DisableEndpoint, RecommendationRuleType.NetworkIsolation]);
  const aIsDisable = disableTypes.has(a.ruleType);
  const bIsDisable = disableTypes.has(b.ruleType);

  // If one is Critical/High severity and the other is lower, prefer the stronger action
  if (aIsDisable && (a.severity === 'Critical' || a.severity === 'High')) {
    return Object.freeze({
      ...conflict,
      resolution: {
        strategy: 'prefer-a',
        winningId: a.id,
        reason: 'Disabling/isolating takes priority for high-severity findings',
        resultingActions: [a.id] as any,
      },
    });
  }
  if (bIsDisable && (b.severity === 'Critical' || b.severity === 'High')) {
    return Object.freeze({
      ...conflict,
      resolution: {
        strategy: 'prefer-b',
        winningId: b.id,
        reason: 'Disabling/isolating takes priority for high-severity findings',
        resultingActions: [b.id] as any,
      },
    });
  }

  // Otherwise, sequence them — protect first, then decide on disabling
  return Object.freeze({
    ...conflict,
    resolution: {
      strategy: 'sequence',
      winningId: null,
      reason: 'Both recommendations retained with sequencing — protect first, then evaluate disabling',
      resultingActions: [a.id, b.id] as any,
    },
  });
}

function resolveDependency(conflict: Conflict, a: Recommendation, b: Recommendation): Conflict {
  // Dependency resolution: sequence the actions
  const aIsPrerequisite = a.ruleType === RecommendationRuleType.Patch ||
    a.ruleType === RecommendationRuleType.NetworkIsolation ||
    a.ruleType === RecommendationRuleType.SecretRotation;

  return Object.freeze({
    ...conflict,
    resolution: {
      strategy: 'sequence',
      winningId: null,
      reason: aIsPrerequisite
        ? `Recommendation A (${a.ruleType}) must be applied before B (${b.ruleType})`
        : `Recommendation B (${b.ruleType}) must be applied before A (${a.ruleType})`,
      resultingActions: aIsPrerequisite ? [a.id, b.id] as any : [b.id, a.id] as any,
    },
  });
}

function resolveRequiredOrder(conflict: Conflict, a: Recommendation, b: Recommendation): Conflict {
  // Required order resolution: sequence the actions in correct order
  const aIsSecret = a.ruleType === RecommendationRuleType.SecretRotation;

  return Object.freeze({
    ...conflict,
    resolution: {
      strategy: 'sequence',
      winningId: null,
      reason: aIsSecret
        ? 'Secret rotation must complete before vulnerability patching'
        : 'Correct ordering enforced',
      resultingActions: aIsSecret ? [a.id, b.id] as any : [b.id, a.id] as any,
    },
  });
}

// ─── Helpers ────────────────────────────────────────────────

function hasOverlappingFindings(a: Recommendation, b: Recommendation): boolean {
  const aFindings = new Set(a.findingIds);
  return b.findingIds.some(f => aFindings.has(f));
}
