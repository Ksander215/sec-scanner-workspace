/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Subsystem #14
 * RecommendationPrioritizer: Uses Value, Impact, Cost, Risk, Urgency, Constraint, Opportunity Cost.
 * TASK-AIS-008A.000 | Formula: Priority = (Value x Impact x ConstraintWeight) / (Cost x Risk)
 */

import type {
  Improvement, PrioritizerConfig,
} from './types.js';
import type { IRecommendationPrioritizer } from './contracts.js';

export class RecommendationPrioritizer implements IRecommendationPrioritizer {
  private readonly config: PrioritizerConfig;

  constructor(config: PrioritizerConfig) {
    this.config = config;
  }

  calculatePriority(improvement: Improvement): number {
    const costFactor = improvement.costScore > 0 ? improvement.costScore : 0.1;
    const riskFactor = improvement.riskScore > 0 ? improvement.riskScore : 0.1;
    const priority =
      (improvement.valueScore * this.config.valueWeight *
       improvement.impactScore * this.config.impactWeight *
       improvement.constraintWeight * this.config.constraintWeight) /
      (costFactor * this.config.costWeight *
       riskFactor * this.config.riskWeight);
    return Math.round(priority * 100) / 100;
  }

  async prioritize(improvements: readonly Improvement[]): Promise<readonly Improvement[]> {
    const withPriority = improvements.map(imp => {
      const priority = this.calculatePriority(imp);
      return { ...imp, priority };
    });
    withPriority.sort((a, b) => b.priority - a.priority);
    return Object.freeze(withPriority);
  }
}
