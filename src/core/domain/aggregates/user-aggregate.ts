/**
 * User Aggregate — DOM-002.000 §3.1
 * Root: UserProfile
 * Members: UserProfile, UserAction, ReadingSpeed, NavigationSpeed, UserRole, SessionContext
 * Invariants: INV-001 (one profile per session), INV-014 (no session without context)
 * Entry Point: UserProfile.recordAction(action)
 */
import type { UserProfile } from '../entities/user-profile.js';
import type { UserAction } from '../entities/user-action.js';
import type { SessionContext } from '../entities/session-context.js';

export interface UserAggregate {
  readonly root: UserProfile;
  readonly actions: readonly UserAction[];
  readonly sessions: readonly SessionContext[];
}

/**
 * INV-001: A session has exactly one UserProfile.
 */
export function assertSingleProfile(sessions: readonly SessionContext[], _profileId: string): void {
  const unique = new Set(sessions.map(s => String(s.profileId)));
  if (unique.size > 1) {
    throw new Error('INV-001 violated: session references multiple profiles');
  }
}

/**
 * INV-014: No session without associated SessionContext.
 */
export function assertSessionHasContext(sessions: readonly SessionContext[]): void {
  for (const session of sessions) {
    if (!session.contextId) {
      throw new Error('INV-014 violated: session without associated SessionContext');
    }
  }
}
