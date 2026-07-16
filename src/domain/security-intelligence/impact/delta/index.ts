/**
 * Security Intelligence Impact Analysis — Delta Engine
 *
 * Calculates how attack paths change when a mitigation scenario is applied.
 * Categorizes paths as Eliminated, Shortened, Reduced, or Unchanged.
 *
 * All calculations are fully deterministic.
 */

import type { AttackPathDelta, AttackPathDeltaDetail, ImpactScenarioId } from '../types/index.ts';
import { AttackPathChangeType } from '../types/index.ts';
import type { AttackPath } from '../../attack-path/types/index.ts';
import type { ScenarioEvaluationResult } from '../scenarios/index.ts';
import {
  createAttackPathDelta,
  createAttackPathDeltaDetail,
} from '../models/index.ts';

/**
 * Compute the attack path delta for a given scenario evaluation.
 * Categorizes all paths by their change type.
 */
export function computeAttackPathDelta(
  scenarioId: ImpactScenarioId,
  attackPaths: readonly AttackPath[],
  evaluation: ScenarioEvaluationResult,
): AttackPathDelta {
  const eliminatedSet = new Set(evaluation.eliminatedPathIds);
  const shortenedSet = new Set(evaluation.shortenedPathIds);
  const reducedSet = new Set(evaluation.reducedPathIds);

  const eliminated: string[] = [];
  const shortened: AttackPathDeltaDetail[] = [];
  const reduced: AttackPathDeltaDetail[] = [];
  const unchanged: string[] = [];

  for (const path of attackPaths) {
    if (eliminatedSet.has(path.id)) {
      eliminated.push(path.id);
    } else if (shortenedSet.has(path.id)) {
      shortened.push(computePathDetail(path, evaluation, AttackPathChangeType.Shortened));
    } else if (reducedSet.has(path.id)) {
      reduced.push(computePathDetail(path, evaluation, AttackPathChangeType.Reduced));
    } else {
      unchanged.push(path.id);
    }
  }

  return createAttackPathDelta({
    scenarioId,
    eliminatedPaths: eliminated,
    shortenedPaths: shortened,
    reducedPaths: reduced,
    unchangedPaths: unchanged,
    totalBefore: attackPaths.length,
    totalAfter: shortened.length + reduced.length + unchanged.length,
  });
}

/**
 * Compute delta detail for a specific path.
 * Calculates risk/probability changes based on affected nodes.
 */
function computePathDetail(
  path: AttackPath,
  evaluation: ScenarioEvaluationResult,
  changeType: AttackPathChangeType,
): AttackPathDeltaDetail {
  const affectedNodeIds = new Set(evaluation.affectedNodeIds);
  const affectedStepCount = path.steps.filter(s => affectedNodeIds.has(s.node.id)).length;
  const totalSteps = path.steps.length;

  // Calculate risk reduction proportionally to affected steps
  const affectedRatio = totalSteps > 0 ? affectedStepCount / totalSteps : 0;
  const riskReduction = evaluation.riskReductionFactor * affectedRatio;
  const probReduction = evaluation.exploitabilityFactor * affectedRatio;

  const riskAfter = Math.max(0, path.totalRisk - riskReduction * path.totalRisk);
  const probAfter = Math.max(0, path.totalProbability - probReduction * path.totalProbability);

  // For shortened paths, reduce length
  let lengthAfter = path.length;
  if (changeType === AttackPathChangeType.Shortened) {
    lengthAfter = Math.max(1, path.length - affectedStepCount);
  }

  return createAttackPathDeltaDetail({
    pathId: path.id,
    changeType,
    riskBefore: path.totalRisk,
    riskAfter,
    lengthBefore: path.length,
    lengthAfter,
    probabilityBefore: path.totalProbability,
    probabilityAfter: probAfter,
  });
}

/**
 * Count paths by change type.
 */
export function countPathsByChangeType(delta: AttackPathDelta): Readonly<Record<AttackPathChangeType, number>> {
  return Object.freeze({
    [AttackPathChangeType.Eliminated]: delta.eliminatedPaths.length,
    [AttackPathChangeType.Shortened]: delta.shortenedPaths.length,
    [AttackPathChangeType.Reduced]: delta.reducedPaths.length,
    [AttackPathChangeType.Unchanged]: delta.unchangedPaths.length,
  });
}

/**
 * Calculate the attack surface reduction ratio.
 * Returns the fraction of paths that were eliminated or significantly reduced.
 */
export function computeAttackSurfaceReduction(delta: AttackPathDelta): number {
  if (delta.totalBefore === 0) return 0;
  const eliminatedOrReduced = delta.eliminatedPaths.length + delta.shortenedPaths.length;
  return eliminatedOrReduced / delta.totalBefore;
}
