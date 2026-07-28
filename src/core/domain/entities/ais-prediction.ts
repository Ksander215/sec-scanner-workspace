/**
 * AISPrediction — DOM-002.000 §1.6
 * Owner: Intelligence Module (FP-INTEL)
 * FSM: Generated → Active → Superseded → Archived
 * Aggregate: Intelligence
 */
import type { EntityBase } from './entity-base.js';
import type { AISPredictionId, SessionContextId } from '../identifiers.js';

export enum AISPredictionState {
  Generated = 'Generated',
  Active = 'Active',
  Superseded = 'Superseded',
  Archived = 'Archived',
}

export interface AISPrediction extends EntityBase {
  readonly id: AISPredictionId;
  readonly predictionId: AISPredictionId;
  readonly contextId: SessionContextId;
  readonly predictedNeed: string;
  readonly confidence: number;
  readonly actions: readonly string[];
  readonly timestamp: string;
  readonly state: AISPredictionState;
}
