/**
 * SessionContext — DOM-002.000 §1.3
 * Owner: User Module (FP-USER)
 * FSM: Initializing → Active → Ended
 * Aggregate: User
 * INV-014: No session without associated SessionContext.
 */
import type { EntityBase } from './entity-base.js';
import type { SessionContextId, UserProfileId } from '../identifiers.js';

export enum SessionContextState {
  Initializing = 'Initializing',
  Active = 'Active',
  Ended = 'Ended',
}

export interface SessionContext extends EntityBase {
  readonly id: SessionContextId;
  readonly contextId: SessionContextId;
  readonly profileId: UserProfileId;
  readonly sessionStart: string;
  readonly sessionEnd?: string;
  readonly predictions: readonly string[];
  readonly actions: readonly string[];
  readonly environment: Record<string, unknown>;
  readonly state: SessionContextState;
}
