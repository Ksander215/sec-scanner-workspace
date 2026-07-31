/**
 * Personal Intelligence Runtime — Priority Subsystem
 *
 * Calculates dynamic priority scores for goals using an 8-factor
 * weighted model.  Owns only the computed scores; goal data stays in
 * GoalRuntime.
 */
import type { PriorityFactors, PriorityScore, Goal } from './types.js';
import { GoalStatus, GoalLevel } from './types.js';
import type { PersonalRuntimeContracts as Contracts } from './contracts.js';
import { createPersonalEventBase } from './events.js';
import { EventClassification } from '../types/common.js';

// ── Factor weights (sum = 1.0) ─────────────────────────────────

const WEIGHTS: Readonly<Record<keyof PriorityFactors, number>> = Object.freeze({
  deadline: 0.15,
  importance: 0.25,
  urgency: 0.15,
  energy: 0.05,
  context: 0.10,
  dependencies: 0.10,
  risk: 0.05,
  progress: 0.15,
});

/** Risk score by goal level (higher = lower risk). */
const LEVEL_RISK: ReadonlyMap<GoalLevel, number> = new Map([
  [GoalLevel.Vision, 8],
  [GoalLevel.Strategy, 7],
  [GoalLevel.Goal, 6],
  [GoalLevel.Objective, 5],
  [GoalLevel.Task, 4],
]);

/** Urgency base by goal status. */
const STATUS_URGENCY: ReadonlyMap<GoalStatus, number> = new Map([
  [GoalStatus.Draft, 2],
  [GoalStatus.Active, 6],
  [GoalStatus.Paused, 4],
  [GoalStatus.Completed, 0],
  [GoalStatus.Archived, 0],
  [GoalStatus.Cancelled, 0],
]);

export class PriorityRuntime {
  private contracts: Contracts;
  private lastScores = new Map<string, PriorityScore>();

  constructor(contracts: Contracts) {
    this.contracts = contracts;
  }

  // ── Single-goal priority ─────────────────────────────────────

  calculatePriority(goal: Goal, overrides?: Partial<PriorityFactors>): PriorityScore {
    const now = new Date().toISOString();

    const deadlineFactor = overrides?.deadline ?? this.computeDeadlineFactor(goal);
    const importanceFactor = overrides?.importance ?? this.computeImportanceFactor(goal);
    const urgencyFactor = overrides?.urgency ?? this.computeUrgencyFactor(goal);
    const energyFactor = overrides?.energy ?? 5;
    const contextFactor = overrides?.context ?? 5;
    const dependenciesFactor = overrides?.dependencies ?? this.computeDependenciesFactor(goal);
    const riskFactor = overrides?.risk ?? this.computeRiskFactor(goal);
    const progressFactor = overrides?.progress ?? this.computeProgressFactor(goal);

    const factors: PriorityFactors = Object.freeze({
      deadline: deadlineFactor,
      importance: importanceFactor,
      urgency: urgencyFactor,
      energy: energyFactor,
      context: contextFactor,
      dependencies: dependenciesFactor,
      risk: riskFactor,
      progress: progressFactor,
    });

    const totalScore = Math.round(
      (WEIGHTS.deadline * deadlineFactor +
       WEIGHTS.importance * importanceFactor +
       WEIGHTS.urgency * urgencyFactor +
       WEIGHTS.energy * energyFactor +
       WEIGHTS.context * contextFactor +
       WEIGHTS.dependencies * dependenciesFactor +
       WEIGHTS.risk * riskFactor +
       WEIGHTS.progress * progressFactor) * 10,
    );

    const prevScore = this.lastScores.get(goal.id);
    const score: PriorityScore = Object.freeze({
      goalId: goal.id,
      totalScore,
      factors,
      rank: prevScore?.rank ?? 0,
      calculatedAt: now,
    });

    this.lastScores.set(goal.id, score);

    // Emit PriorityCalculated
    const base = createPersonalEventBase('PriorityCalculated', EventClassification.Result, goal.id);
    void this.contracts.platform.publishEvent('PriorityCalculated', {
      ...base,
      sequence: 0,
      version: '1.0.0',
      payload: {
        goalIds: Object.freeze([goal.id]),
        topGoalId: goal.id,
        calculatedAt: now,
      },
    });

    return score;
  }

  // ── Batch priority ───────────────────────────────────────────

  calculateAllPriorities(goals: readonly Goal[]): readonly PriorityScore[] {
    const now = new Date().toISOString();

    // Compute raw scores (intermediate type with goal reference)
    interface ScoredEntry {
      goalId: string;
      factors: PriorityFactors;
      totalScore: number;
    }
    const scored: ScoredEntry[] = goals.map(goal => {
      const factors = this.computeFactors(goal);
      const totalScore = Math.round(
        (WEIGHTS.deadline * factors.deadline +
         WEIGHTS.importance * factors.importance +
         WEIGHTS.urgency * factors.urgency +
         WEIGHTS.energy * factors.energy +
         WEIGHTS.context * factors.context +
         WEIGHTS.dependencies * factors.dependencies +
         WEIGHTS.risk * factors.risk +
         WEIGHTS.progress * factors.progress) * 10,
      );
      return { goalId: goal.id, factors, totalScore };
    });

    // Sort descending by totalScore, then assign ranks
    scored.sort((a, b) => b.totalScore - a.totalScore);

    const results: PriorityScore[] = scored.map((entry, index) => {
      const rank = index + 1;
      const prev = this.lastScores.get(entry.goalId);
      const score: PriorityScore = Object.freeze({
        goalId: entry.goalId,
        totalScore: entry.totalScore,
        factors: entry.factors,
        rank,
        calculatedAt: now,
      });
      this.lastScores.set(entry.goalId, score);

      // Emit PriorityChanged if rank or score shifted
      if (prev && (prev.rank !== rank || prev.totalScore !== entry.totalScore)) {
        const changedBase = createPersonalEventBase('PriorityChanged', EventClassification.StateChange, entry.goalId);
        void this.contracts.platform.publishEvent('PriorityChanged', {
          ...changedBase,
          sequence: 0,
          version: '1.0.0',
          payload: {
            goalId: entry.goalId,
            oldRank: prev.rank,
            newRank: rank,
            oldScore: prev.totalScore,
            newScore: entry.totalScore,
            changedAt: now,
          },
        });
      }

      return score;
    });

    // Emit PriorityCalculated for the batch
    if (results.length > 0) {
      const topGoalId = results[0].goalId;
      const allGoalIds = results.map(s => s.goalId);
      const batchBase = createPersonalEventBase('PriorityCalculated', EventClassification.Result, topGoalId);
      void this.contracts.platform.publishEvent('PriorityCalculated', {
        ...batchBase,
        sequence: 0,
        version: '1.0.0',
        payload: {
          goalIds: Object.freeze(allGoalIds),
          topGoalId,
          calculatedAt: now,
        },
      });
    }

    return Object.freeze(results);
  }

  // ── Accessors ────────────────────────────────────────────────

  getScore(goalId: string): PriorityScore | undefined {
    return this.lastScores.get(goalId);
  }

  getTopN(n: number): readonly PriorityScore[] {
    return Object.freeze(
      Array.from(this.lastScores.values())
        .sort((a, b) => a.rank - b.rank)
        .slice(0, n),
    );
  }

  getFactorsForGoal(goalId: string): PriorityFactors | undefined {
    return this.lastScores.get(goalId)?.factors;
  }

  // ── Factor computations ──────────────────────────────────────

  private computeFactors(goal: Goal): PriorityFactors {
    return Object.freeze({
      deadline: this.computeDeadlineFactor(goal),
      importance: this.computeImportanceFactor(goal),
      urgency: this.computeUrgencyFactor(goal),
      energy: 5,
      context: 5,
      dependencies: this.computeDependenciesFactor(goal),
      risk: this.computeRiskFactor(goal),
      progress: this.computeProgressFactor(goal),
    });
  }

  private computeDeadlineFactor(goal: Goal): number {
    if (!goal.deadline) return 3;
    const deadlineMs = new Date(goal.deadline).getTime();
    const nowMs = Date.now();
    const diffDays = (deadlineMs - nowMs) / (1000 * 60 * 60 * 24);
    if (diffDays <= 0) return 10;
    if (diffDays <= 1) return 9;
    if (diffDays <= 3) return 7;
    if (diffDays <= 7) return 5;
    if (diffDays <= 14) return 3;
    return 1;
  }

  private computeImportanceFactor(goal: Goal): number {
    return Math.min(10, Math.max(0, goal.priority));
  }

  private computeUrgencyFactor(goal: Goal): number {
    const statusBase = STATUS_URGENCY.get(goal.status) ?? 3;
    if (goal.status !== GoalStatus.Active || !goal.deadline) return statusBase;
    // Boost urgency for active goals with imminent deadlines
    const deadlineFactor = this.computeDeadlineFactor(goal);
    return Math.min(10, Math.round((statusBase + deadlineFactor) / 2));
  }

  private computeDependenciesFactor(goal: Goal): number {
    // No parent → no dependencies → ready
    if (goal.parentId === null) return 10;
    // Has a parent → assume partially blocked
    return 7;
  }

  private computeRiskFactor(goal: Goal): number {
    return LEVEL_RISK.get(goal.level) ?? 5;
  }

  private computeProgressFactor(goal: Goal): number {
    // Inverse progress: 10 when not started, 0 when complete
    return Math.round(10 - (goal.progress / 10));
  }
}
