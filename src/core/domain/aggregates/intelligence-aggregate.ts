/**
 * Intelligence Aggregate — DOM-002.000 §3.2
 * Root: ConfidenceResult
 * Members: ConfidenceResult, ConfidenceLevel, AISPrediction
 * Invariants: INV-002 (confidence in [0, 100]), INV-011 (narrative requires role)
 * Entry Point: ConfidenceResult.calculate(prediction, role)
 */
import type { ConfidenceResult } from '../entities/confidence-result.js';
import type { AISPrediction } from '../entities/ais-prediction.js';
export interface IntelligenceAggregate {
  readonly root: ConfidenceResult;
  readonly predictions: readonly AISPrediction[];
}

/**
 * INV-002: Confidence is always in range [0, 100].
 */
export function assertConfidenceRange(score: number): void {
  if (score < 0 || score > 100) {
    throw new Error(`INV-002 violated: confidence ${score} out of [0, 100]`);
  }
}

/**
 * INV-011: No confidence narrative without reference to UserRole.
 */
export function assertNarrativeHasRole(narrative: string, role: string): void {
  if (!role || !narrative) {
    throw new Error('INV-011 violated: narrative requires role reference');
  }
}
