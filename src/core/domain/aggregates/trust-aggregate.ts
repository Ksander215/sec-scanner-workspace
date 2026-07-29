/**
 * Trust Aggregate — DOM-002.000 §3.6
 * Root: TrustScore
 * Members: TrustScore, TrustFactor
 * Invariants: INV-007 (cross-zone gate check), INV-008 (action within autonomy),
 *            INV-009 (audit with actor and intent)
 * Entry Point: TrustScore.recalculate(factors[], previousScore)
 * Note: Trust is a pure consumer — no outbound domain events.
 */
import type { TrustScore } from '../entities/trust-score.js';
import type { TrustFactor } from '../entities/trust-factor.js';
import { AutonomyLevel } from '../../types/common.js';
import { TrustZone } from '../../types/common.js';

export interface TrustAggregate {
  readonly root: TrustScore;
  readonly factors: readonly TrustFactor[];
}

/**
 * INV-007: No data flows across trust zones without explicit gate check.
 */
export function assertZoneGateCrossing(
  fromZone: TrustZone,
  toZone: TrustZone,
  gateValidated: boolean
): void {
  if (!gateValidated) {
    throw new Error(`INV-007 violated: zone crossing ${fromZone}→${toZone} without gate check`);
  }
}

/**
 * INV-008: No automated action outside current autonomy level.
 */
export function assertActionWithinAutonomy(
  requiredLevel: AutonomyLevel,
  currentLevel: AutonomyLevel
): void {
  const levels = [AutonomyLevel.Observe, AutonomyLevel.Suggest, AutonomyLevel.ActOnApproval,
                  AutonomyLevel.ActAndReport, AutonomyLevel.Autonomous];
  const requiredIdx = levels.indexOf(requiredLevel);
  const currentIdx = levels.indexOf(currentLevel);
  if (requiredIdx > currentIdx) {
    throw new Error(`INV-008 violated: action requires ${requiredLevel} but current is ${currentLevel}`);
  }
}

/**
 * INV-009: No audit log entry without both actor and intent.
 */
export function assertAuditEntry(actor: string, intent: string): void {
  if (!actor || !intent) {
    throw new Error('INV-009 violated: audit entry requires both actor and intent');
  }
}
