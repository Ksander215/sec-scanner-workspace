/**
 * Security Intelligence Recommendation Engine — Planner
 *
 * Builds optimal remediation plans using 5 strategies:
 * MaximumRiskReduction, MinimumCost, QuickWins, ComplianceFirst, Balanced
 */

import type {
  Recommendation, RemediationPlan, RecommendationAction,
  RecommendationGroup, PlanningStrategy, PlanConstraints,
  RecommendationActionId, Metadata,
} from '../types/index.ts';
import {
  PlanningStrategy as PS, RecommendationRuleType, RecommendationSeverity,
  ActionStatus,
} from '../types/index.ts';
import {
  createRemediationPlan, createRecommendationAction,
  createRecommendationGroup, generateRemediationPlanId,
} from '../models/index.ts';
import { resolveAllConflicts } from '../conflicts/index.ts';

/** Planner result */
export interface PlannerResult {
  readonly plan: RemediationPlan;
  readonly durationMs: number;
}

/**
 * Build a remediation plan from ranked recommendations.
 * Uses the specified strategy to determine the optimal set and order of actions.
 */
export function buildPlan(
  recommendations: readonly Recommendation[],
  strategy: PlanningStrategy,
  constraints?: PlanConstraints,
): PlannerResult {
  const startTime = performance.now();

  if (recommendations.length === 0) {
    const emptyPlan = createRemediationPlan({
      name: `Plan-${strategy}`,
      strategy,
      actions: [],
      recommendations: [],
    });
    return { plan: emptyPlan, durationMs: performance.now() - startTime };
  }

  // Resolve conflicts first
  const resolved = resolveAllConflicts(recommendations);

  // Apply strategy-specific selection and ordering
  const selected = selectByStrategy(resolved.recommendations, strategy, constraints);

  // Order actions according to strategy
  const ordered = orderByStrategy(selected, strategy);

  // Build actions
  const planId = generateRemediationPlanId();
  const actions = buildActions(ordered, planId);

  // Build groups
  const groups = buildGroups(ordered);

  // Build the plan
  const plan = createRemediationPlan({
    name: `Plan-${strategy}`,
    description: `Remediation plan using ${strategy} strategy`,
    strategy,
    actions,
    recommendations: ordered,
    groups,
    conflicts: resolved.resolved,
  });

  return { plan, durationMs: performance.now() - startTime };
}

/**
 * Select recommendations based on the planning strategy.
 */
export function selectByStrategy(
  recommendations: readonly Recommendation[],
  strategy: PlanningStrategy,
  constraints?: PlanConstraints,
): readonly Recommendation[] {
  let selected: Recommendation[];

  switch (strategy) {
    case PS.MaximumRiskReduction:
      selected = [...recommendations].sort((a, b) =>
        b.benefit.riskReduction - a.benefit.riskReduction,
      );
      break;

    case PS.MinimumCost:
      selected = [...recommendations].sort((a, b) =>
        a.cost.totalCost - b.cost.totalCost,
      );
      break;

    case PS.QuickWins:
      // Quick wins: high benefit, low effort
      selected = [...recommendations].sort((a, b) => {
        const scoreA = a.benefit.totalBenefit * (1 - a.cost.totalCost) * (1 - clamp01(a.cost.effortHours / 40));
        const scoreB = b.benefit.totalBenefit * (1 - b.cost.totalCost) * (1 - clamp01(b.cost.effortHours / 40));
        return scoreB - scoreA;
      });
      break;

    case PS.ComplianceFirst:
      // Prioritize compliance-related rules
      selected = [...recommendations].sort((a, b) => {
        const complianceA = a.benefit.complianceImprovement;
        const complianceB = b.benefit.complianceImprovement;
        if (complianceA !== complianceB) return complianceB - complianceA;
        return b.ranking.overallScore - a.ranking.overallScore;
      });
      break;

    case PS.Balanced:
    default:
      // Use the existing ranking (already weighted composite)
      selected = [...recommendations].sort((a, b) =>
        b.ranking.overallScore - a.ranking.overallScore,
      );
      break;
  }

  // Apply constraints
  if (constraints) {
    selected = applyConstraints(selected, constraints);
  }

  return Object.freeze(selected);
}

/**
 * Order recommendations for execution based on strategy.
 * Considers dependencies and required ordering.
 */
export function orderByStrategy(
  recommendations: readonly Recommendation[],
  strategy: PlanningStrategy,
): readonly Recommendation[] {
  // Build dependency graph
  const ordered: Recommendation[] = [];
  const remaining = new Set(recommendations);
  const added = new Set<string>();

  // Multiple passes to handle dependencies
  let maxIterations = remaining.size + 1;
  while (remaining.size > 0 && maxIterations-- > 0) {
    for (const rec of remaining) {
      // Check if all prerequisite rules are already added
      const prereqs = getPrerequisiteRuleTypes(rec.ruleType);
      const prereqsMet = prereqs.every(prType =>
        !recommendations.some(r => r.ruleType === prType && r.targetId === rec.targetId) ||
        added.has(rec.targetId + prType),
      );

      if (prereqsMet) {
        ordered.push(rec);
        added.add(rec.targetId + rec.ruleType);
        remaining.delete(rec);
        break; // Restart iteration after modification
      }
    }

    // Safety: if no progress was made, add remaining in current order
    if (maxIterations <= 0 || remaining.size === recommendations.length) {
      for (const rec of remaining) {
        ordered.push(rec);
      }
      break;
    }
  }

  return Object.freeze(ordered);
}

// ─── Action Building ────────────────────────────────────────

function buildActions(
  recommendations: readonly Recommendation[],
  planId: RemediationPlanId,
): readonly RecommendationAction[] {
  const actions: RecommendationAction[] = [];
  const actionMap = new Map<string, RecommendationAction>();

  // Create actions for each recommendation
  for (let i = 0; i < recommendations.length; i++) {
    const rec = recommendations[i];
    const action = createRecommendationAction({
      recommendationId: rec.id,
      planId,
      order: i + 1,
      estimatedEffortHours: rec.cost.effortHours,
    });
    actions.push(action);
    actionMap.set(rec.id, action);
  }

  // Set up dependencies between actions based on rule prerequisites
  for (let i = 0; i < recommendations.length; i++) {
    const rec = recommendations[i];
    const prereqs = getPrerequisiteRuleTypes(rec.ruleType);
    const dependsOn: RecommendationActionId[] = [];

    for (const prType of prereqs) {
      const prerecRec = recommendations.find(r =>
        r.ruleType === prType && r.targetId === rec.targetId && r.id !== rec.id,
      );
      if (prerecRec) {
        const prerecAction = actionMap.get(prerecRec.id);
        if (prerecAction) {
          dependsOn.push(prerecAction.id);
        }
      }
    }

    if (dependsOn.length > 0) {
      actions[i] = Object.freeze({
        ...actions[i],
        dependsOn: Object.freeze(dependsOn),
      }) as RecommendationAction;
    }
  }

  return Object.freeze(actions);
}

// ─── Group Building ─────────────────────────────────────────

function buildGroups(
  recommendations: readonly Recommendation[],
): readonly RecommendationGroup[] {
  const groupMap = new Map<string, Recommendation[]>();

  // Group by target
  for (const rec of recommendations) {
    const key = rec.targetId;
    const group = groupMap.get(key) ?? [];
    group.push(rec);
    groupMap.set(key, group);
  }

  const groups: RecommendationGroup[] = [];
  for (const [targetId, recs] of groupMap) {
    const dominantRuleType = recs[0].ruleType; // First rec has highest priority
    const dominantSeverity = recs.reduce((max, r) =>
      severityRank(r.severity) > severityRank(max) ? r.severity : max,
      recs[0].severity,
    );
    const aggregateRiskReduction = Math.min(1, recs.reduce((s, r) => s + r.benefit.riskReduction, 0));
    const aggregateCost = recs.reduce((s, r) => s + r.cost.totalCost, 0) / recs.length;

    groups.push(createRecommendationGroup({
      name: `Target: ${targetId}`,
      description: `Recommendations for ${targetId}`,
      recommendationIds: recs.map(r => r.id),
      dominantRuleType,
      dominantSeverity,
      aggregateRiskReduction,
      aggregateCost,
    }));
  }

  return Object.freeze(groups);
}

// ─── Constraint Application ─────────────────────────────────

function applyConstraints(
  recommendations: Recommendation[],
  constraints: PlanConstraints,
): Recommendation[] {
  let filtered = recommendations;

  // Exclude specific recommendations
  if (constraints.excludedRecommendationIds) {
    const excluded = new Set(constraints.excludedRecommendationIds);
    filtered = filtered.filter(r => !excluded.has(r.id));
  }

  // Max actions
  if (constraints.maxActions && constraints.maxActions > 0) {
    filtered = filtered.slice(0, constraints.maxActions);
  }

  // Max cost
  if (constraints.maxCost !== undefined && constraints.maxCost > 0) {
    const result: Recommendation[] = [];
    let totalCost = 0;
    for (const rec of filtered) {
      if (totalCost + rec.cost.totalCost <= constraints.maxCost) {
        result.push(rec);
        totalCost += rec.cost.totalCost;
      }
    }
    filtered = result;
  }

  // Max effort hours
  if (constraints.maxEffortHours && constraints.maxEffortHours > 0) {
    const result: Recommendation[] = [];
    let totalHours = 0;
    for (const rec of filtered) {
      if (totalHours + rec.cost.effortHours <= constraints.maxEffortHours) {
        result.push(rec);
        totalHours += rec.cost.effortHours;
      }
    }
    filtered = result;
  }

  // Min risk reduction
  if (constraints.minRiskReduction !== undefined) {
    filtered = filtered.filter(r => r.benefit.riskReduction >= constraints.minRiskReduction!);
  }

  return filtered;
}

// ─── Helpers ────────────────────────────────────────────────

/** Get prerequisite rule types for a given rule type */
function getPrerequisiteRuleTypes(ruleType: RecommendationRuleType): RecommendationRuleType[] {
  switch (ruleType) {
    case RecommendationRuleType.ConfigurationChange:
      return [RecommendationRuleType.Patch];
    case RecommendationRuleType.InputValidation:
      return [RecommendationRuleType.Patch];
    case RecommendationRuleType.AccessControl:
      return [RecommendationRuleType.SecretRotation];
    case RecommendationRuleType.UpgradeDependency:
      return [RecommendationRuleType.Patch];
    default:
      return [];
  }
}

/** Rank severity for comparison */
function severityRank(severity: string): number {
  switch (severity) {
    case 'Critical': return 5;
    case 'High': return 4;
    case 'Medium': return 3;
    case 'Low': return 2;
    case 'Informational': return 1;
    default: return 0;
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
