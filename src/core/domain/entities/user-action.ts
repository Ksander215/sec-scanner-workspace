/**
 * UserAction — DOM-002.000 §1.2
 * Owner: User Module (FP-USER)
 * FSM: Created → Archived (immutable after creation)
 * Aggregate: User
 */
import type { EntityBase } from './entity-base.js';
import type { UserActionId, UserProfileId, SessionContextId } from '../identifiers.js';

export interface UserAction extends EntityBase {
  readonly id: UserActionId;
  readonly actionId: UserActionId;
  readonly profileId: UserProfileId;
  readonly actionType: string;
  readonly target: string;
  readonly timestamp: string;
  readonly sessionContextId: SessionContextId;
  readonly classification: string;
}
