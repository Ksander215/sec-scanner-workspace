/**
 * TrustScore — DOM-002.000 §1.20
 * Owner: Trust Module (FP-TRUST)
 * FSM: Calculated → Active → Recalculated → Archived
 * Aggregate: Trust (Root)
 * INV-007: Cross-zone gate check.
 * INV-008: Action within autonomy level.
 * INV-009: Audit with actor and intent.
 */
import type { EntityBase } from './entity-base.js';
import type { TrustScoreId, TrustFactorId } from '../identifiers.js';

export enum TrustScoreState {
  Calculated = 'Calculated',
  Active = 'Active',
  Recalculated = 'Recalculated',
  Archived = 'Archived',
}

export interface TrustScore extends EntityBase {
  readonly id: TrustScoreId;
  readonly scoreId: TrustScoreId;
  readonly targetId: string;
  readonly targetType: string;
  readonly score: number;
  readonly factors: readonly TrustFactorId[];
  readonly calculatedAt: string;
  readonly previousScore?: number;
  readonly state: TrustScoreState;
}
