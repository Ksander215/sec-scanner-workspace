/**
 * IC-03: ContextPredictor — ARC-001.001 §6
 * FP-02, Z1. Predicts user intent from page + profile.
 */
import type { UserProfile } from '../domain/entities/user-profile.js';
import type { AISPrediction } from '../domain/entities/ais-prediction.js';

export interface ContextPredictor {
  predict(path: string, profile: UserProfile): Promise<AISPrediction | null>;
}
