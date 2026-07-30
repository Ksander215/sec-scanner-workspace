/**
 * Experience Runtime — Personalization Profiles
 * TASK-AIS-004A.000  Subsystem 7
 *
 * Manages multiple personalization profiles per user (Work, Home, Study,
 * Research, Custom). Supports activation/deactivation, switching with
 * reason tracking, and preference updates. Emits domain events for
 * profile activation and switching.
 *
 * Conforms to: DOM-002, ADR-014, CON-001, ADR-002 (Event Bus)
 */

import type { Identifier, Timestamp } from '../types/common.js';
import { createId } from '../domain/identifiers.js';
import type { EventBus } from '../events/event-bus.js';
import { EventClassification } from '../types/common.js';
import type {
  ProfileId,
  BuiltInProfileType,
  ProfileActivationMode,
  PersonalizationProfile,
} from './types.js';
import type { ProfileActivated, ProfileSwitched } from './events.js';
import { ProfileNotFoundError, ProfileConflictError } from './errors.js';

/** Per-user bookkeeping for active profile tracking */
interface UserContext {
  readonly profiles: Set<ProfileId>;
  activeProfileId: ProfileId | null;
}

// ─── PersonalizationProfiles ─────────────────────────────────

/**
 * Manages personalization profiles for all users.
 * Only one profile per user may be active at a time.
 * Emits ProfileActivated and ProfileSwitched domain events.
 */
export class PersonalizationProfiles {
  private readonly profiles = new Map<ProfileId, PersonalizationProfile>();
  private readonly userContexts = new Map<string, UserContext>();
  private readonly eventBus: EventBus | null;

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus ?? null;
  }

  // ─── CRUD ─────────────────────────────────────────────────

  /**
   * Creates a new personalization profile.
   * If this is the first profile for the user and activation mode is not Manual,
   * it will be activated automatically.
   */
  createProfile(
    userIdHash: string,
    name: string,
    type: BuiltInProfileType | string,
    mode: ProfileActivationMode,
  ): PersonalizationProfile {
    const id = createId<ProfileId>();
    const now = new Date().toISOString() as Timestamp;

    const profile: PersonalizationProfile = {
      id,
      userIdHash,
      name,
      type,
      activationMode: mode,
      isActive: false,
      preferences: {},
      adaptations: [],
      habits: [],
      createdAt: now,
      updatedAt: now,
    };

    this.profiles.set(id, profile);

    // Ensure user context exists
    let ctx = this.userContexts.get(userIdHash);
    if (!ctx) {
      ctx = { profiles: new Set(), activeProfileId: null };
      this.userContexts.set(userIdHash, ctx);
    }
    (ctx.profiles as Set<ProfileId>).add(id);

    // Auto-activate if first profile
    if (ctx.activeProfileId === null) {
      this.activateProfileInternal(id);
    }

    return this.getProfile(id)!;
  }

  /** Retrieves a profile by ID, or null if not found. */
  getProfile(profileId: ProfileId): PersonalizationProfile | null {
    return this.profiles.get(profileId) ?? null;
  }

  /** Returns all profiles for a given user. */
  getUserProfiles(userIdHash: string): readonly PersonalizationProfile[] {
    const ctx = this.userContexts.get(userIdHash);
    if (!ctx) return [];

    const result: PersonalizationProfile[] = [];
    for (const pid of ctx.profiles) {
      const p = this.profiles.get(pid);
      if (p) result.push(p);
    }
    return result;
  }

  /** Returns the currently active profile for a user, or null. */
  getActiveProfile(userIdHash: string): PersonalizationProfile | null {
    const ctx = this.userContexts.get(userIdHash);
    if (!ctx || ctx.activeProfileId === null) return null;
    return this.profiles.get(ctx.activeProfileId) ?? null;
  }

  // ─── Activation / Switching ──────────────────────────────

  /**
   * Activates a profile, deactivating the user's current active profile.
   * Emits ProfileActivated event.
   */
  activateProfile(profileId: ProfileId): PersonalizationProfile {
    this.requireProfile(profileId);
    return this.activateProfileInternal(profileId);
  }

  /**
   * Switches from the current active profile to the target profile.
   * Records the switch reason and emits ProfileSwitched event.
   */
  switchProfile(
    userIdHash: string,
    toProfileId: ProfileId,
    reason: string,
  ): PersonalizationProfile {
    const ctx = this.userContexts.get(userIdHash);
    if (!ctx) {
      throw new ProfileNotFoundError(
        `No profiles found for user`,
        { userIdHash },
      );
    }

    const targetProfile = this.requireProfile(toProfileId);
    if (targetProfile.userIdHash !== userIdHash) {
      throw new ProfileConflictError(
        `Target profile does not belong to user`,
        { userIdHash, profileId: toProfileId },
      );
    }

    const previousActiveId = ctx.activeProfileId;
    const previousProfile = previousActiveId
      ? this.profiles.get(previousActiveId)
      : null;

    // Activate the target
    this.activateProfileInternal(toProfileId);

    // Emit ProfileSwitched event (fire-and-forget)
    if (this.eventBus) {
      const now = new Date().toISOString() as Timestamp;
      const event: ProfileSwitched = {
        eventId: crypto.randomUUID(),
        eventType: 'ProfileSwitched',
        classification: EventClassification.StateChange,
        timestamp: now,
        sequence: 0,
        aggregateId: toProfileId,
        aggregateType: 'PersonalizationProfile',
        version: '1.0.0',
        payload: {
          userIdHash,
          fromProfileId: previousActiveId ?? ('' as Identifier),
          toProfileId,
          fromProfileName: previousProfile?.name ?? '',
          toProfileName: targetProfile.name,
          switchedAt: now,
          reason,
        },
      };
      void this.eventBus.publish(event);
    }

    return this.getProfile(toProfileId)!;
  }

  /**
   * Updates profile preferences by merging the given preferences.
   */
  updateProfilePreferences(
    profileId: ProfileId,
    preferences: Record<string, string>,
  ): PersonalizationProfile {
    const profile = this.requireProfile(profileId);
    const now = new Date().toISOString() as Timestamp;

    const updated: PersonalizationProfile = {
      ...profile,
      preferences: { ...profile.preferences, ...preferences },
      updatedAt: now,
    };

    this.profiles.set(profileId, updated);
    return updated;
  }

  /**
   * Deactivates a profile. If it was the active profile, no other profile
   * is auto-activated.
   */
  deactivateProfile(profileId: ProfileId): PersonalizationProfile {
    const profile = this.requireProfile(profileId);
    const ctx = this.userContexts.get(profile.userIdHash);

    const now = new Date().toISOString() as Timestamp;

    const deactivated: PersonalizationProfile = {
      ...profile,
      isActive: false,
      updatedAt: now,
    };
    this.profiles.set(profileId, deactivated);

    if (ctx && ctx.activeProfileId === profileId) {
      (ctx as { activeProfileId: ProfileId | null }).activeProfileId = null;
    }

    return deactivated;
  }

  // ─── Internal ──────────────────────────────────────────────

  private activateProfileInternal(profileId: ProfileId): PersonalizationProfile {
    const profile = this.requireProfile(profileId);
    const ctx = this.requireUserContext(profile.userIdHash);

    // Deactivate currently active profile (if any)
    const previousActiveId = ctx.activeProfileId;
    if (previousActiveId !== null && previousActiveId !== profileId) {
      const previous = this.profiles.get(previousActiveId);
      if (previous) {
        const now = new Date().toISOString() as Timestamp;
        this.profiles.set(previousActiveId, {
          ...previous,
          isActive: false,
          updatedAt: now,
        });
      }
    }

    const now = new Date().toISOString() as Timestamp;
    const activated: PersonalizationProfile = {
      ...profile,
      isActive: true,
      updatedAt: now,
    };
    this.profiles.set(profileId, activated);
    (ctx as { activeProfileId: ProfileId | null }).activeProfileId = profileId;

    // Emit ProfileActivated event (fire-and-forget)
    if (this.eventBus) {
      const event: ProfileActivated = {
        eventId: crypto.randomUUID(),
        eventType: 'ProfileActivated',
        classification: EventClassification.StateChange,
        timestamp: now,
        sequence: 0,
        aggregateId: profileId,
        aggregateType: 'PersonalizationProfile',
        version: '1.0.0',
        payload: {
          profileId,
          userIdHash: profile.userIdHash,
          profileName: profile.name,
          activationMode: profile.activationMode,
          activatedAt: now,
        },
      };
      void this.eventBus.publish(event);
    }

    return activated;
  }

  private requireProfile(profileId: ProfileId): PersonalizationProfile {
    const p = this.profiles.get(profileId);
    if (!p) {
      throw new ProfileNotFoundError(
        `Profile not found: ${profileId}`,
        { profileId },
      );
    }
    return p;
  }

  private requireUserContext(userIdHash: string): UserContext {
    const ctx = this.userContexts.get(userIdHash);
    if (!ctx) {
      throw new ProfileNotFoundError(
        `No profiles found for user`,
        { userIdHash },
      );
    }
    return ctx;
  }
}
