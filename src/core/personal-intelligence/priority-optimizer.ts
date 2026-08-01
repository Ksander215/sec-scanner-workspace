/**
 * Personal Intelligence Pack — Priority Optimizer
 * TASK-AIS-007A.000
 *
 * Calculates priority scores for goals based on multiple factors.
 */
import type { PersonalIntelligenceContracts } from './contracts.js';
import type { PriorityScore, PriorityFactors, PackGoalId } from './types.js';
import { createPackEventBase } from './events.js';
import { EventClassification } from '../types/common.js';
import type { Timestamp } from '../types/common.js';
import { PriorityCalculationError } from './errors.js';

export class PriorityOptimizer {
  private contracts: PersonalIntelligenceContracts;
  private scores = new Map<string, PriorityScore>();

  constructor(contracts: PersonalIntelligenceContracts) {
    this.contracts = contracts;
  }

  calculatePriority(goalId: string, factors: PriorityFactors): PriorityScore {
    const now = new Date().toISOString() as Timestamp;
    const weights = { deadline: 0.15, importance: 0.25, urgency: 0.15, energy: 0.10, context: 0.10, dependencies: 0.10, risk: 0.08, value: 0.07 };
    const totalScore = Math.round(
      factors.deadline * weights.deadline +
      factors.importance * weights.importance +
      factors.urgency * weights.urgency +
      factors.energy * weights.energy +
      factors.context * weights.context +
      factors.dependencies * weights.dependencies +
      factors.risk * weights.risk +
      factors.value * weights.value,
    );
    const score: PriorityScore = Object.freeze({
      goalId: goalId as unknown as PackGoalId, totalScore,
      factors: Object.freeze(factors), rank: 0, calculatedAt: now,
    });
    this.scores.set(goalId, score);
    return score;
  }

  calculateAllPriorities(goalIds: readonly string[], factorSets: ReadonlyMap<string, PriorityFactors>): readonly PriorityScore[] {
    const results: PriorityScore[] = [];
    for (const goalId of goalIds) {
      const factors = factorSets.get(goalId);
      if (!factors) throw new PriorityCalculationError(goalId, 'No factors provided');
      results.push(this.calculatePriority(goalId, factors));
    }
    results.sort((a, b) => b.totalScore - a.totalScore);
    const ranked = results.map((s, i) => Object.freeze({ ...s, rank: i + 1 } as PriorityScore));
    for (const r of ranked) this.scores.set(r.goalId as unknown as string, r);

    const topGoalId = ranked.length > 0 ? ranked[0].goalId as unknown as string : '';
    const base = createPackEventBase('PrioritiesCalculated', EventClassification.Result, 'priority-optimizer');
    void this.contracts.platform.publishEvent('PrioritiesCalculated', {
      ...base, sequence: 0, version: '1.0.0',
      payload: { goalCount: ranked.length, topGoalId, calculatedAt: new Date().toISOString() },
    });
    return Object.freeze(ranked);
  }

  getScore(goalId: string): PriorityScore {
    const s = this.scores.get(goalId);
    if (!s) throw new PriorityCalculationError(goalId, 'No score calculated');
    return s;
  }

  getTopN(n: number): readonly PriorityScore[] {
    return Object.freeze(
      Array.from(this.scores.values()).sort((a, b) => b.totalScore - a.totalScore).slice(0, n),
    );
  }

  getAllScores(): readonly PriorityScore[] { return Object.freeze(Array.from(this.scores.values())); }
  getScoreCount(): number { return this.scores.size; }

  dispose(): void { this.scores.clear(); }
}
