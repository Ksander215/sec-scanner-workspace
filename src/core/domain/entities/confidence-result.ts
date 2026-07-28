/**
 * ConfidenceResult — DOM-002.000 §1.4
 * Owner: Intelligence Module (FP-INTEL)
 * FSM: Calculated → Presented → Archived
 * Aggregate: Intelligence (Root)
 * INV-002: Confidence is always in range [0, 100].
 */
import type { EntityBase } from './entity-base.js';
import type { ConfidenceResultId, SessionContextId, AISPredictionId } from '../identifiers.js';
import { ConfidenceLevel } from '../value-objects/confidence-level.js';

export enum ConfidenceResultState {
  Calculated = 'Calculated',
  Presented = 'Presented',
  Archived = 'Archived',
}

export interface ConfidenceResult extends EntityBase {
  readonly id: ConfidenceResultId;
  readonly resultId: ConfidenceResultId;
  readonly score: number;
  readonly level: ConfidenceLevel;
  readonly narrative: string;
  readonly role: string;
  readonly predictionId: AISPredictionId;
  readonly contextId: SessionContextId;
  readonly timestamp: string;
  readonly state: ConfidenceResultState;
}
