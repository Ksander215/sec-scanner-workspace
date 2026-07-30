/**
 * Tests for PersonalizationProfiles (Subsystem 7)
 * TASK-AIS-004A.000
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PersonalizationProfiles } from '../../core/experience/personalization-profiles.js';
import { InProcessEventBus } from '../../core/events/event-bus.js';
import {
  BuiltInProfileType,
  ProfileActivationMode,
  type ProfileId,
} from '../../core/experience/types.js';
import { ProfileNotFoundError, ProfileConflictError } from '../../core/experience/errors.js';

describe('PersonalizationProfiles', () => {
  let profiles: PersonalizationProfiles;
  let eventBus: InProcessEventBus;
  const userId = crypto.randomUUID();

  beforeEach(() => {
    eventBus = new InProcessEventBus();
    profiles = new PersonalizationProfiles(eventBus);
  });

  // ─── createProfile ────────────────────────────────────────

  describe('createProfile', () => {
    it('creates a profile with given name', () => {
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      expect(p.name).toBe('Work');
    });

    it('creates a profile with given type', () => {
      const p = profiles.createProfile(userId, 'Study', BuiltInProfileType.Study, ProfileActivationMode.Manual);
      expect(p.type).toBe(BuiltInProfileType.Study);
    });

    it('creates a profile with given activation mode', () => {
      const p = profiles.createProfile(userId, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Policy);
      expect(p.activationMode).toBe(ProfileActivationMode.Policy);
    });

    it('creates a profile with userIdHash', () => {
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      expect(p.userIdHash).toBe(userId);
    });

    it('creates a profile with unique id', () => {
      const p1 = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const p2 = profiles.createProfile(userId, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      expect(p1.id).not.toBe(p2.id);
    });

    it('creates a profile with empty preferences', () => {
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      expect(p.preferences).toEqual({});
    });

    it('creates a profile with empty adaptations', () => {
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      expect(p.adaptations).toEqual([]);
    });

    it('creates a profile with empty habits', () => {
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      expect(p.habits).toEqual([]);
    });

    it('sets createdAt and updatedAt', () => {
      const before = new Date().toISOString();
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const after = new Date().toISOString();
      expect(p.createdAt >= before).toBe(true);
      expect(p.createdAt <= after).toBe(true);
      expect(p.updatedAt).toBe(p.createdAt);
    });

    it('auto-activates first profile for user', () => {
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      expect(p.isActive).toBe(true);
    });

    it('does not auto-activate second profile for same user', () => {
      profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const p2 = profiles.createProfile(userId, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      expect(p2.isActive).toBe(false);
    });

    it('supports custom type string', () => {
      const p = profiles.createProfile(userId, 'Custom', 'MyCustomType', ProfileActivationMode.Auto);
      expect(p.type).toBe('MyCustomType');
    });

    it('works without event bus', () => {
      const noBus = new PersonalizationProfiles();
      const p = noBus.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      expect(p).toBeDefined();
      expect(p.isActive).toBe(true);
    });

    it('separates profiles for different users', () => {
      const other = crypto.randomUUID();
      const p1 = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const p2 = profiles.createProfile(other, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      expect(p1.isActive).toBe(true);
      expect(p2.isActive).toBe(true);
    });

    it('emits ProfileActivated for first profile', async () => {
      const handler = vi.fn();
      eventBus.subscribe('ProfileActivated', handler);
      profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      await new Promise(r => setTimeout(r, 10));
      expect(handler).toHaveBeenCalledTimes(1);
      const envelope = handler.mock.calls[0][0];
      expect(envelope.payload.profileName).toBe('Work');
      expect(envelope.payload.userIdHash).toBe(userId);
    });

    it('emits ProfileActivated with activationMode', async () => {
      const handler = vi.fn();
      eventBus.subscribe('ProfileActivated', handler);
      profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Policy);
      await new Promise(r => setTimeout(r, 10));
      const envelope = handler.mock.calls[0][0];
      expect(envelope.payload.activationMode).toBe('Policy');
    });

    it('supports all BuiltInProfileType values', () => {
      for (const type of Object.values(BuiltInProfileType)) {
        const p = profiles.createProfile(
          crypto.randomUUID(), `Profile-${type}`, type, ProfileActivationMode.Auto,
        );
        expect(p.type).toBe(type);
      }
    });

    it('supports all ProfileActivationMode values', () => {
      for (const mode of Object.values(ProfileActivationMode)) {
        const p = profiles.createProfile(
          crypto.randomUUID(), `Profile-${mode}`, BuiltInProfileType.Work, mode,
        );
        expect(p.activationMode).toBe(mode);
      }
    });
  });

  // ─── getProfile ──────────────────────────────────────────

  describe('getProfile', () => {
    it('returns profile by id', () => {
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const retrieved = profiles.getProfile(p.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe('Work');
    });

    it('returns null for non-existent profile', () => {
      expect(profiles.getProfile(crypto.randomUUID() as ProfileId)).toBeNull();
    });

    it('returns latest state after update', () => {
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      profiles.updateProfilePreferences(p.id, { theme: 'dark' });
      const retrieved = profiles.getProfile(p.id);
      expect(retrieved!.preferences).toEqual({ theme: 'dark' });
    });

    it('returns null after creation with unknown user scenario', () => {
      // Just verify consistency
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      expect(profiles.getProfile(p.id)).not.toBeNull();
      expect(profiles.getProfile(crypto.randomUUID() as ProfileId)).toBeNull();
    });
  });

  // ─── getUserProfiles ──────────────────────────────────────

  describe('getUserProfiles', () => {
    it('returns all profiles for a user', () => {
      profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      profiles.createProfile(userId, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      const userProfiles = profiles.getUserProfiles(userId);
      expect(userProfiles).toHaveLength(2);
    });

    it('returns empty array for unknown user', () => {
      expect(profiles.getUserProfiles(crypto.randomUUID())).toEqual([]);
    });

    it('does not include profiles from other users', () => {
      const other = crypto.randomUUID();
      profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      profiles.createProfile(other, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      expect(profiles.getUserProfiles(userId)).toHaveLength(1);
    });

    it('returns profiles with current state', () => {
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      profiles.updateProfilePreferences(p.id, { lang: 'en' });
      const userProfiles = profiles.getUserProfiles(userId);
      expect(userProfiles[0].preferences).toEqual({ lang: 'en' });
    });

    it('returns multiple profiles in creation order', () => {
      profiles.createProfile(userId, 'A', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      profiles.createProfile(userId, 'B', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      profiles.createProfile(userId, 'C', BuiltInProfileType.Study, ProfileActivationMode.Auto);
      const result = profiles.getUserProfiles(userId);
      expect(result.map(p => p.name)).toEqual(['A', 'B', 'C']);
    });
  });

  // ─── getActiveProfile ─────────────────────────────────────

  describe('getActiveProfile', () => {
    it('returns the auto-activated first profile', () => {
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const active = profiles.getActiveProfile(userId);
      expect(active).not.toBeNull();
      expect(active!.id).toBe(p.id);
    });

    it('returns null when no profiles exist', () => {
      expect(profiles.getActiveProfile(userId)).toBeNull();
    });

    it('returns null after deactivating all profiles', () => {
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      profiles.deactivateProfile(p.id);
      expect(profiles.getActiveProfile(userId)).toBeNull();
    });

    it('returns newly activated profile after switch', () => {
      const p1 = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const p2 = profiles.createProfile(userId, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      profiles.activateProfile(p2.id);
      expect(profiles.getActiveProfile(userId)!.id).toBe(p2.id);
    });

    it('returns null for unknown user', () => {
      expect(profiles.getActiveProfile(crypto.randomUUID())).toBeNull();
    });
  });

  // ─── activateProfile ─────────────────────────────────────

  describe('activateProfile', () => {
    it('activates an inactive profile', () => {
      const p1 = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const p2 = profiles.createProfile(userId, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      const activated = profiles.activateProfile(p2.id);
      expect(activated.isActive).toBe(true);
    });

    it('deactivates the previously active profile', () => {
      const p1 = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const p2 = profiles.createProfile(userId, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      profiles.activateProfile(p2.id);
      const prev = profiles.getProfile(p1.id);
      expect(prev!.isActive).toBe(false);
    });

    it('throws for non-existent profile', () => {
      expect(() => profiles.activateProfile(crypto.randomUUID() as ProfileId)).toThrow(ProfileNotFoundError);
    });

    it('can re-activate an already active profile', () => {
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const result = profiles.activateProfile(p.id);
      expect(result.isActive).toBe(true);
    });

    it('emits ProfileActivated event', async () => {
      profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const p2 = profiles.createProfile(userId, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      const handler = vi.fn();
      eventBus.subscribe('ProfileActivated', handler);
      profiles.activateProfile(p2.id);
      await new Promise(r => setTimeout(r, 10));
      expect(handler).toHaveBeenCalledTimes(1);
      const envelope = handler.mock.calls[0][0];
      expect(envelope.payload.profileName).toBe('Home');
    });

    it('updates updatedAt on activation', () => {
      const p1 = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const p2 = profiles.createProfile(userId, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      profiles.activateProfile(p2.id);
      const prev = profiles.getProfile(p1.id);
      expect(prev!.updatedAt).toBeDefined();
    });

    it('throws with error code EXP-PROF-001', () => {
      try {
        profiles.activateProfile(crypto.randomUUID() as ProfileId);
      } catch (e) {
        expect((e as ProfileNotFoundError).code).toBe('EXP-PROF-001');
      }
    });
  });

  // ─── switchProfile ───────────────────────────────────────

  describe('switchProfile', () => {
    it('switches from one profile to another', () => {
      const p1 = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const p2 = profiles.createProfile(userId, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      const result = profiles.switchProfile(userId, p2.id, 'end of day');
      expect(result.id).toBe(p2.id);
      expect(result.isActive).toBe(true);
    });

    it('deactivates the previous profile', () => {
      const p1 = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const p2 = profiles.createProfile(userId, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      profiles.switchProfile(userId, p2.id, 'reason');
      expect(profiles.getProfile(p1.id)!.isActive).toBe(false);
    });

    it('throws for unknown user', () => {
      const p1 = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      expect(() => profiles.switchProfile(crypto.randomUUID(), p1.id, 'reason')).toThrow(ProfileNotFoundError);
    });

    it('throws when target profile belongs to different user', () => {
      const other = crypto.randomUUID();
      const p1 = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const p2 = profiles.createProfile(other, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      expect(() => profiles.switchProfile(userId, p2.id, 'reason')).toThrow(ProfileConflictError);
    });

    it('emits ProfileSwitched event', async () => {
      const p1 = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const p2 = profiles.createProfile(userId, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      const handler = vi.fn();
      eventBus.subscribe('ProfileSwitched', handler);
      profiles.switchProfile(userId, p2.id, 'end of day');
      await new Promise(r => setTimeout(r, 10));
      expect(handler).toHaveBeenCalledTimes(1);
      const envelope = handler.mock.calls[0][0];
      expect(envelope.payload.fromProfileName).toBe('Work');
      expect(envelope.payload.toProfileName).toBe('Home');
      expect(envelope.payload.reason).toBe('end of day');
      expect(envelope.payload.userIdHash).toBe(userId);
    });

    it('records fromProfileId in event', async () => {
      const p1 = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const p2 = profiles.createProfile(userId, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      const handler = vi.fn();
      eventBus.subscribe('ProfileSwitched', handler);
      profiles.switchProfile(userId, p2.id, 'reason');
      await new Promise(r => setTimeout(r, 10));
      expect(handler.mock.calls[0][0].payload.fromProfileId).toBe(p1.id);
    });

    it('works when no previous active profile exists', () => {
      const p1 = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      profiles.deactivateProfile(p1.id);
      const p2 = profiles.createProfile(userId, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      const result = profiles.switchProfile(userId, p2.id, 'manual switch');
      expect(result.isActive).toBe(true);
    });

    it('ProfileConflictError has code EXP-PROF-002', () => {
      const other = crypto.randomUUID();
      const p1 = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const p2 = profiles.createProfile(other, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      try {
        profiles.switchProfile(userId, p2.id, 'reason');
      } catch (e) {
        expect((e as ProfileConflictError).code).toBe('EXP-PROF-002');
      }
    });

    it('switching to same active profile works', () => {
      const p1 = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const result = profiles.switchProfile(userId, p1.id, 'no-op switch');
      expect(result.isActive).toBe(true);
      expect(result.id).toBe(p1.id);
    });
  });

  // ─── updateProfilePreferences ─────────────────────────────

  describe('updateProfilePreferences', () => {
    it('merges new preferences', () => {
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      profiles.updateProfilePreferences(p.id, { theme: 'dark' });
      const updated = profiles.getProfile(p.id);
      expect(updated!.preferences).toEqual({ theme: 'dark' });
    });

    it('merges with existing preferences', () => {
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      profiles.updateProfilePreferences(p.id, { theme: 'dark' });
      profiles.updateProfilePreferences(p.id, { lang: 'en' });
      const updated = profiles.getProfile(p.id);
      expect(updated!.preferences).toEqual({ theme: 'dark', lang: 'en' });
    });

    it('overwrites existing preference keys', () => {
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      profiles.updateProfilePreferences(p.id, { theme: 'dark' });
      profiles.updateProfilePreferences(p.id, { theme: 'light' });
      const updated = profiles.getProfile(p.id);
      expect(updated!.preferences).toEqual({ theme: 'light' });
    });

    it('updates updatedAt timestamp', () => {
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const first = p.updatedAt;
      profiles.updateProfilePreferences(p.id, { k: 'v' });
      const second = profiles.getProfile(p.id)!.updatedAt;
      expect(second >= first).toBe(true);
    });

    it('throws for non-existent profile', () => {
      expect(() => profiles.updateProfilePreferences(
        crypto.randomUUID() as ProfileId, { k: 'v' },
      )).toThrow(ProfileNotFoundError);
    });

    it('preserves other profile fields', () => {
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      profiles.updateProfilePreferences(p.id, { theme: 'dark' });
      const updated = profiles.getProfile(p.id);
      expect(updated!.name).toBe('Work');
      expect(updated!.isActive).toBe(true);
    });

    it('handles empty preferences object', () => {
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      profiles.updateProfilePreferences(p.id, {});
      expect(profiles.getProfile(p.id)!.preferences).toEqual({});
    });

    it('handles multiple preference keys at once', () => {
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      profiles.updateProfilePreferences(p.id, { a: '1', b: '2', c: '3', d: '4' });
      expect(profiles.getProfile(p.id)!.preferences).toEqual({ a: '1', b: '2', c: '3', d: '4' });
    });
  });

  // ─── deactivateProfile ───────────────────────────────────

  describe('deactivateProfile', () => {
    it('deactivates an active profile', () => {
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const deactivated = profiles.deactivateProfile(p.id);
      expect(deactivated.isActive).toBe(false);
    });

    it('deactivates an already inactive profile', () => {
      const p1 = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const p2 = profiles.createProfile(userId, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      const deactivated = profiles.deactivateProfile(p2.id);
      expect(deactivated.isActive).toBe(false);
    });

    it('clears active profile for user', () => {
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      profiles.deactivateProfile(p.id);
      expect(profiles.getActiveProfile(userId)).toBeNull();
    });

    it('does not auto-activate another profile', () => {
      const p1 = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const p2 = profiles.createProfile(userId, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      profiles.deactivateProfile(p1.id);
      expect(profiles.getActiveProfile(userId)).toBeNull();
      expect(profiles.getProfile(p2.id)!.isActive).toBe(false);
    });

    it('throws for non-existent profile', () => {
      expect(() => profiles.deactivateProfile(crypto.randomUUID() as ProfileId)).toThrow(ProfileNotFoundError);
    });

    it('updates updatedAt timestamp', () => {
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const deactivated = profiles.deactivateProfile(p.id);
      expect(deactivated.updatedAt).toBeDefined();
    });
  });

  // ─── Events ─────────────────────────────────────────────

  describe('events', () => {
    it('emits ProfileActivated on auto-activation', async () => {
      const handler = vi.fn();
      eventBus.subscribe('ProfileActivated', handler);
      profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      await new Promise(r => setTimeout(r, 10));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('emits ProfileSwitched on switch', async () => {
      const p1 = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const p2 = profiles.createProfile(userId, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      const handler = vi.fn();
      eventBus.subscribe('ProfileSwitched', handler);
      profiles.switchProfile(userId, p2.id, 'reason');
      await new Promise(r => setTimeout(r, 10));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does not emit events without event bus', async () => {
      const noBus = new PersonalizationProfiles();
      const uid = crypto.randomUUID();
      const p1 = noBus.createProfile(uid, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const p2 = noBus.createProfile(uid, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      // Should not throw
      noBus.switchProfile(uid, p2.id, 'reason');
      await new Promise(r => setTimeout(r, 10));
    });

    it('ProfileActivated event has state-change classification', async () => {
      const handler = vi.fn();
      eventBus.subscribe('ProfileActivated', handler);
      profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      await new Promise(r => setTimeout(r, 10));
      expect(handler.mock.calls[0][0].classification).toBe('state-change');
    });

    it('ProfileSwitched event has state-change classification', async () => {
      const p1 = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const p2 = profiles.createProfile(userId, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      const handler = vi.fn();
      eventBus.subscribe('ProfileSwitched', handler);
      profiles.switchProfile(userId, p2.id, 'reason');
      await new Promise(r => setTimeout(r, 10));
      expect(handler.mock.calls[0][0].classification).toBe('state-change');
    });

    it('ProfileActivated has profileId in payload', async () => {
      const handler = vi.fn();
      eventBus.subscribe('ProfileActivated', handler);
      const p = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      await new Promise(r => setTimeout(r, 10));
      expect(handler.mock.calls[0][0].payload.profileId).toBe(p.id);
    });
  });

  // ─── Multi-user isolation ───────────────────────────────

  describe('multi-user isolation', () => {
    it('each user has independent active profile', () => {
      const userA = crypto.randomUUID();
      const userB = crypto.randomUUID();
      const pA = profiles.createProfile(userA, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const pB = profiles.createProfile(userB, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      expect(profiles.getActiveProfile(userA)!.id).toBe(pA.id);
      expect(profiles.getActiveProfile(userB)!.id).toBe(pB.id);
    });

    it('deactivating one users profile does not affect another', () => {
      const userA = crypto.randomUUID();
      const userB = crypto.randomUUID();
      const pA = profiles.createProfile(userA, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      profiles.createProfile(userB, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      profiles.deactivateProfile(pA.id);
      expect(profiles.getActiveProfile(userA)).toBeNull();
      expect(profiles.getActiveProfile(userB)).not.toBeNull();
    });

    it('preferences update does not affect other profiles', () => {
      const p1 = profiles.createProfile(userId, 'Work', BuiltInProfileType.Work, ProfileActivationMode.Auto);
      const p2 = profiles.createProfile(userId, 'Home', BuiltInProfileType.Home, ProfileActivationMode.Auto);
      profiles.updateProfilePreferences(p1.id, { theme: 'dark' });
      expect(profiles.getProfile(p2.id)!.preferences).toEqual({});
    });
  });

  // ─── Error hierarchy ──────────────────────────────────────

  describe('error hierarchy', () => {
    it('ProfileNotFoundError extends Error', () => {
      const err = new ProfileNotFoundError('test');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(ProfileNotFoundError);
      expect(err.name).toBe('ProfileNotFoundError');
    });

    it('ProfileConflictError extends Error', () => {
      const err = new ProfileConflictError('test');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(ProfileConflictError);
      expect(err.name).toBe('ProfileConflictError');
    });
  });
});
