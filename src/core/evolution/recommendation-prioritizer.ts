/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Recommendation Prioritizer
 * TASK-AIS-008A.000
 *
 * Calculates multi-factor priority: (Value * Impact * ConstraintWeight) / (Cost * Risk)
 * PHI-004: Address the primary constraint first (Pareto ordering).
 */

import type { Improvement, PrioritizerConfig } from './types.js';
import type { IRecommendationPrioritizer, IImprovementEngine } from './contracts.js';

export class RecommendationPrioritizer implements IRecommendationPrioritizer {
  private readonly config: PrioritizerConfig;
  private improvementEngine: IImprovementEngine | null = null;

  constructor(config: PrioritizerConfig) {
    this.config = config;
  }

  setImprovementEngine(engine: IImprovementEngine): void {
    this.improvementEngine = engine;
  }

  calculatePriority(improvement: Improvement): number {
    const valueScore = improvement.valueScore;
    const impactScore = improvement.impactScore;
    const constraintWeight = improvement.constraintWeight;
    const costScore = Math.max(improvement.costScore, 0.01);
    const riskScore = Math.max(improvement.riskScore, 0.01);

    const numerator = valueScore * this.config.valueWeight
      * impactScore * this.config.impactWeight
      * constraintWeight * this.config.constraintWeight;
    const denominator = costScore * this.config.costWeight
      * riskScore * this.config.riskWeight;

    const priority = numerator / denominator;
    return Math.round(priority * 100) / 100;
  }

  async prioritize(improvements: readonly Improvement[]): Promise<readonly Improvement[]> {
    const withPriority = improvements.map(i => {
      const priority = this.calculatePriority(i);
      return Object.freeze({ ...i, priority });
    });

    // Sort descending by priority
    withPriority.sort((a, b) => b.priority - a.priority);

    // Optionally update scores on the improvement engine
    if (this.improvementEngine) {
      const engine = this.improvementEngine as unknown as {
        updateScores(id: Improvement['id'], scores: { priority: number }): void;
      };
      for (const item of withPriority) {
        engine.updateScores(item.id, { priority: item.priority });
      }
    }

    return withPriority;
  }
}
