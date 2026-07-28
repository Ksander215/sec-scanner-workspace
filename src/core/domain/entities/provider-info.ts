/**
 * ProviderInfo — DOM-002.000 §1.15
 * Owner: Provider Module (FP-PROV)
 * FSM: Created → Active → Degraded → Deleted
 * Aggregate: Provider (Root)
 * INV-006: No provider access without valid credentials.
 */
import type { EntityBase } from './entity-base.js';
import type { ProviderInfoId } from '../identifiers.js';
import { ProviderType } from '../../types/common.js';

export enum ProviderInfoState {
  Created = 'Created',
  Active = 'Active',
  Degraded = 'Degraded',
  Deleted = 'Deleted',
}

export interface ProviderInfo extends EntityBase {
  readonly id: ProviderInfoId;
  readonly providerId: ProviderInfoId;
  readonly type: ProviderType;
  readonly name: string;
  readonly endpoint: string;
  readonly healthStatus: string;
  readonly capabilities: readonly string[];
  readonly credentialsRef: string;
  readonly lastHealthCheck?: string;
  readonly state: ProviderInfoState;
}
