/**
 * UserProfile — DOM-002.000 §1.1
 * Owner: User Module (FP-USER)
 * FSM: Initializing → Active → Suspended → Archived
 * Aggregate: User (Root)
 */
import type { EntityBase } from './entity-base.js';
import type { UserProfileId, TrustScoreId } from '../identifiers.js';
import type { ReadingSpeed } from '../value-objects/reading-speed.js';
import type { NavigationSpeed } from '../value-objects/navigation-speed.js';
import type { FrequencyMode } from '../value-objects/frequency-mode.js';
import { UserRole } from '../value-objects/user-role.js';

export enum UserProfileState {
  Initializing = 'Initializing',
  Active = 'Active',
  Suspended = 'Suspended',
  Archived = 'Archived',
}

export interface UserProfile extends EntityBase {
  readonly id: UserProfileId;
  readonly profileId: UserProfileId;
  readonly userId: string;
  readonly readingSpeed: ReadingSpeed;
  readonly navigationSpeed: NavigationSpeed;
  readonly frequencyMode: FrequencyMode;
  readonly role: UserRole;
  readonly trustScoreId: TrustScoreId;
  readonly state: UserProfileState;
}
