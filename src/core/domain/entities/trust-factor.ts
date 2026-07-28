/**
 * TrustFactor — DOM-002.000 §1.19
 * Owner: Trust Module (FP-TRUST)
 * FSM: Recorded → Active → Archived
 * Aggregate: Trust
 */
import type { EntityBase } from './entity-base.js';
import type { TrustFactorId, TrustScoreId } from '../identifiers.js';

export enum TrustFactorState {
  Recorded = 'Recorded',
  Active = 'Active',
  Archived = 'Archived',
}

export interface TrustFactor extends EntityBase {
  readonly id: TrustFactorId;
  readonly factorId: TrustFactorId;
  readonly scoreId: TrustScoreId;
  readonly source: string;
  readonly weight: number;
  readonly direction: 'positive' | 'negative' | 'neutral';
  readonly timestamp: string;
  readonly context: string;
  readonly state: TrustFactorState;
}
