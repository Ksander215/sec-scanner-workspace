/**
 * Identity Runtime — Main Orchestrator
 * TASK-AIS-003F.000 — Identity & Preference Runtime Foundation
 *
 * Manages identities, profiles, preferences (with resolution chain),
 * organizations, teams, roles, permissions, and policy evaluation.
 * Publishes domain events for all state-changing operations via EventBus.
 *
 * Conforms to: ARC-001.001, ADR-002, DOM-002.000
 */

import type { Timestamp, Identifier } from '../types/common.js';
import type { EventBus } from '../events/event-bus.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { Result } from '../types/common.js';
import { TypedStateMachine, type StateMachine, type FSMDefinition } from '../fsm/state-machine.js';

// ═══════════════════════════════════════════════════════════════════
// BRANDED IDENTIFIERS
// ═══════════════════════════════════════════════════════════════════

export type IdentityId = Identifier & { readonly __brand: 'IdentityId' };
export type OrganizationId = Identifier & { readonly __brand: 'OrganizationId' };
export type TeamId = Identifier & { readonly __brand: 'TeamId' };
export type RoleId = Identifier & { readonly __brand: 'RoleId' };
export type PermissionId = Identifier & { readonly __brand: 'PermissionId' };
export type PolicyId = Identifier & { readonly __brand: 'PolicyId' };
export type SnapshotId = Identifier & { readonly __brand: 'SnapshotId' };

function brandIdentityId(id: string): IdentityId { return id as IdentityId; }
function brandOrganizationId(id: string): OrganizationId { return id as OrganizationId; }
function brandTeamId(id: string): TeamId { return id as TeamId; }
function brandRoleId(id: string): RoleId { return id as RoleId; }
function brandPermissionId(id: string): PermissionId { return id as PermissionId; }
function brandPolicyId(id: string): PolicyId { return id as PolicyId; }
function brandSnapshotId(id: string): SnapshotId { return id as SnapshotId; }

// ═══════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════

export enum IdentityState {
  Created = 'Created',
  Configured = 'Configured',
  Active = 'Active',
  Suspended = 'Suspended',
  Archived = 'Archived',
}

export enum OwnerType {
  User = 'User',
  System = 'System',
  Service = 'Service',
}

export enum PreferenceKey {
  Language = 'Language',
  Theme = 'Theme',
  TimeZone = 'TimeZone',
  NotificationLevel = 'NotificationLevel',
  AutonomyLevel = 'AutonomyLevel',
  ResponseStyle = 'ResponseStyle',
  OutputFormat = 'OutputFormat',
  MaxTokens = 'MaxTokens',
  Temperature = 'Temperature',
  ToolPolicy = 'ToolPolicy',
}

export enum PreferenceSource {
  System = 'System',
  Organization = 'Organization',
  Department = 'Department',
  Team = 'Team',
  User = 'User',
  Session = 'Session',
}

export enum PolicyEffect {
  Allow = 'Allow',
  Deny = 'Deny',
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES
// ═══════════════════════════════════════════════════════════════════

export interface Identity {
  readonly id: IdentityId;
  readonly name: string;
  readonly description: string;
  readonly ownerType: OwnerType;
  readonly ownerId: string;
  readonly state: IdentityState;
  readonly version: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface IdentityProfile {
  readonly identityId: IdentityId;
  readonly displayName: string;
  readonly email?: string;
  readonly avatarUrl?: string;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly version: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface PreferenceEntry {
  readonly key: PreferenceKey;
  readonly value: unknown;
  readonly source: PreferenceSource;
  readonly setAt: Timestamp;
}

export interface PreferenceHistoryEntry {
  readonly key: PreferenceKey;
  readonly previousValue: unknown;
  readonly newValue: unknown;
  readonly source: PreferenceSource;
  readonly changedAt: Timestamp;
}

export interface PreferenceSnapshot {
  readonly id: SnapshotId;
  readonly identityId: IdentityId;
  readonly description: string;
  readonly preferences: Readonly<Record<string, unknown>>;
  readonly createdAt: Timestamp;
}

export interface Organization {
  readonly id: OrganizationId;
  readonly name: string;
  readonly description: string;
  readonly departments: readonly string[];
  readonly memberIds: readonly string[];
  readonly version: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface Team {
  readonly id: TeamId;
  readonly name: string;
  readonly description: string;
  readonly organizationId: OrganizationId;
  readonly memberIds: readonly string[];
  readonly version: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface Role {
  readonly id: RoleId;
  readonly name: string;
  readonly description: string;
  readonly permissionIds: readonly PermissionId[];
  readonly capabilities: readonly string[];
  readonly restrictions: readonly string[];
  readonly version: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface Permission {
  readonly id: PermissionId;
  readonly name: string;
  readonly description: string;
  readonly resource: string;
  readonly actions: readonly string[];
  readonly conditions: Readonly<Record<string, unknown>>;
  readonly createdAt: Timestamp;
}

export interface Policy {
  readonly id: PolicyId;
  readonly name: string;
  readonly description: string;
  readonly rules: readonly PolicyRule[];
  readonly scope: string;
  readonly priority: number;
  readonly version: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface PolicyRule {
  readonly resource: string;
  readonly action: string;
  readonly effect: PolicyEffect;
  readonly conditions?: Readonly<Record<string, unknown>>;
}

export interface RoleAssignment {
  readonly roleId: RoleId;
  readonly identityId: IdentityId;
  readonly assignedBy: string;
  readonly scope?: string;
  readonly expiresAt?: Timestamp;
  readonly assignedAt: Timestamp;
}

export interface PolicyResolutionResult {
  readonly effect: PolicyEffect | null;
  readonly policyId: PolicyId | null;
  readonly policyName: string | null;
  readonly matchedRule: PolicyRule | null;
  readonly resolutionPath: readonly string[];
}

export interface IdentityStats {
  readonly identityCount: number;
  readonly profileCount: number;
  readonly preferenceCount: number;
  readonly organizationCount: number;
  readonly teamCount: number;
  readonly roleCount: number;
  readonly policyCount: number;
  readonly permissionCount: number;
  readonly policyEvaluations: number;
  readonly resolverHits: number;
  readonly resolverMisses: number;
  readonly resolverHitRatio: number;
  readonly snapshotCount: number;
}

export interface SerializableIdentity {
  readonly identity: Identity;
  readonly profile: IdentityProfile | null;
  readonly preferences: readonly PreferenceEntry[];
  readonly roleAssignments: readonly RoleAssignment[];
}

// ═══════════════════════════════════════════════════════════════════
// ERROR HIERARCHY
// ═══════════════════════════════════════════════════════════════════

export class IdentityError extends Error {
  public readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'IdentityError';
    this.code = code;
  }
}

// ═══════════════════════════════════════════════════════════════════
// IDENTITY FSM DEFINITION
// ═══════════════════════════════════════════════════════════════════

const IDENTITY_FSM_DEF: FSMDefinition<IdentityState> = {
  initialState: IdentityState.Created,
  terminalStates: [IdentityState.Archived],
  transitions: [
    { from: IdentityState.Created, to: IdentityState.Configured },
    { from: IdentityState.Configured, to: IdentityState.Active },
    { from: IdentityState.Active, to: IdentityState.Suspended },
    { from: IdentityState.Suspended, to: IdentityState.Active },
    { from: IdentityState.Active, to: IdentityState.Archived },
    { from: IdentityState.Suspended, to: IdentityState.Archived },
    { from: IdentityState.Configured, to: IdentityState.Archived },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

export interface IdentityRuntimeConfig {
  readonly eventBus?: EventBus;
  readonly maxIdentities?: number;
  readonly maxPreferencesPerIdentity?: number;
  readonly maxOrganizations?: number;
  readonly maxTeamsPerOrganization?: number;
  readonly maxRoles?: number;
  readonly snapshotHistoryLimit?: number;
  readonly preferenceHistoryLimit?: number;
  readonly auditEnabled?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// IDENTITY RUNTIME
// ═══════════════════════════════════════════════════════════════════

export class IdentityRuntime {
  readonly name = 'IdentityRuntime';

  // ─── Private state ─────────────────────────────────────────────
  private identities: Map<string, Identity> = new Map();
  private profiles: Map<string, IdentityProfile> = new Map();
  private preferences: Map<string, Map<string, PreferenceEntry>> = new Map();
  private preferenceHistory: Map<string, PreferenceHistoryEntry[]> = new Map();
  private preferenceSnapshots: Map<string, Map<string, PreferenceSnapshot>> = new Map();
  private organizations: Map<string, Organization> = new Map();
  private teams: Map<string, Team> = new Map();
  private roles: Map<string, Role> = new Map();
  private policies: Map<string, Policy> = new Map();
  private permissions: Map<string, Permission> = new Map();
  private roleAssignments: Map<string, RoleAssignment[]> = new Map();
  private identityFSMs: Map<string, StateMachine<IdentityState>> = new Map();
  private _disposed = false;
  private readonly config: IdentityRuntimeConfig;
  private readonly eventBus: EventBus | null;

  // ─── Metrics counters ──────────────────────────────────────────
  private _policyEvaluations = 0;
  private _resolverHits = 0;
  private _resolverMisses = 0;

  constructor(config: IdentityRuntimeConfig = {}) {
    this.config = config;
    this.eventBus = config.eventBus ?? null;
  }

  // ═════════════════════════════════════════════════════════════════
  // IDENTITY CRUD
  // ═════════════════════════════════════════════════════════════════

  createIdentity(
    name: string,
    description: string,
    ownerType: OwnerType,
    ownerId: string,
    metadata?: Record<string, unknown>,
  ): Result<Identity, IdentityError> {
    this.assertNotDisposed();

    const maxIdentities = this.config.maxIdentities ?? 10_000;
    if (this.identities.size >= maxIdentities) {
      return { ok: false, error: new IdentityError('Maximum identity count reached', 'IDENTITY_LIMIT_REACHED') };
    }

    const now = new Date().toISOString() as Timestamp;
    const id = brandIdentityId(crypto.randomUUID());
    const identity: Identity = Object.freeze({
      id, name, description, ownerType, ownerId,
      state: IdentityState.Created,
      version: 1,
      createdAt: now, updatedAt: now,
      metadata: Object.freeze({ ...(metadata ?? {}) }),
    });

    const key = id as unknown as string;
    this.identities.set(key, identity);
    this.identityFSMs.set(key, new TypedStateMachine(IDENTITY_FSM_DEF));

    void this.publishEvent({
      eventType: 'IdentityCreated',
      classification: EventClassification.Action,
      payload: { identityId: id, name, ownerType },
    });

    return { ok: true, value: identity };
  }

  getIdentity(identityId: IdentityId): Identity | null {
    this.assertNotDisposed();
    return this.identities.get(identityId as unknown as string) ?? null;
  }

  updateIdentity(
    identityId: IdentityId,
    updates: { name?: string; description?: string; metadata?: Record<string, unknown> },
  ): Result<Identity, IdentityError> {
    this.assertNotDisposed();

    const key = identityId as unknown as string;
    const existing = this.identities.get(key);
    if (!existing) {
      return { ok: false, error: new IdentityError(`Identity not found: ${identityId}`, 'IDENTITY_NOT_FOUND') };
    }

    const now = new Date().toISOString() as Timestamp;
    const updated: Identity = Object.freeze({
      ...existing,
      name: updates.name ?? existing.name,
      description: updates.description ?? existing.description,
      metadata: Object.freeze({ ...existing.metadata, ...(updates.metadata ?? {}) }),
      version: existing.version + 1,
      updatedAt: now,
    });

    this.identities.set(key, updated);
    return { ok: true, value: updated };
  }

  deleteIdentity(identityId: IdentityId): Result<void, IdentityError> {
    this.assertNotDisposed();

    const key = identityId as unknown as string;
    const existing = this.identities.get(key);
    if (!existing) {
      return { ok: false, error: new IdentityError(`Identity not found: ${identityId}`, 'IDENTITY_NOT_FOUND') };
    }
    if (existing.state !== IdentityState.Archived) {
      return { ok: false, error: new IdentityError('Only Archived identities can be deleted', 'IDENTITY_NOT_ARCHIVED') };
    }

    this.identities.delete(key);
    this.profiles.delete(key);
    this.preferences.delete(key);
    this.preferenceHistory.delete(key);
    this.preferenceSnapshots.delete(key);
    this.roleAssignments.delete(key);
    this.identityFSMs.delete(key);

    void this.publishEvent({
      eventType: 'IdentityDeleted',
      classification: EventClassification.Action,
      payload: { identityId },
    });

    return { ok: true, value: undefined };
  }

  transitionIdentity(identityId: IdentityId, targetState: IdentityState): Result<Identity, IdentityError> {
    this.assertNotDisposed();

    const key = identityId as unknown as string;
    const existing = this.identities.get(key);
    if (!existing) {
      return { ok: false, error: new IdentityError(`Identity not found: ${identityId}`, 'IDENTITY_NOT_FOUND') };
    }

    const fsm = this.identityFSMs.get(key);
    if (!fsm || !fsm.canTransition(targetState)) {
      return {
        ok: false,
        error: new IdentityError(
          `Cannot transition from ${existing.state} to ${targetState}`,
          'IDENTITY_INVALID_TRANSITION',
        ),
      };
    }

    fsm.transition(targetState);
    const now = new Date().toISOString() as Timestamp;
    const updated: Identity = Object.freeze({
      ...existing,
      state: targetState,
      version: existing.version + 1,
      updatedAt: now,
    });
    this.identities.set(key, updated);

    void this.publishEvent({
      eventType: 'IdentityStateChanged',
      classification: EventClassification.StateChange,
      payload: { identityId, previousState: existing.state, newState: targetState },
    });

    return { ok: true, value: updated };
  }

  getAllIdentities(): readonly Identity[] {
    this.assertNotDisposed();
    return Object.freeze([...this.identities.values()]);
  }

  getIdentitiesByState(state: IdentityState): readonly Identity[] {
    this.assertNotDisposed();
    const results: Identity[] = [];
    for (const identity of this.identities.values()) {
      if (identity.state === state) results.push(identity);
    }
    return Object.freeze(results);
  }

  getIdentitiesByOwner(ownerType: OwnerType, ownerId: string): readonly Identity[] {
    this.assertNotDisposed();
    const results: Identity[] = [];
    for (const identity of this.identities.values()) {
      if (identity.ownerType === ownerType && identity.ownerId === ownerId) {
        results.push(identity);
      }
    }
    return Object.freeze(results);
  }

  // ═════════════════════════════════════════════════════════════════
  // PROFILE MANAGEMENT
  // ═════════════════════════════════════════════════════════════════

  createProfile(
    identityId: IdentityId,
    profileData: { displayName: string; email?: string; avatarUrl?: string; attributes?: Record<string, unknown> },
  ): Result<IdentityProfile, IdentityError> {
    this.assertNotDisposed();

    const key = identityId as unknown as string;
    const identity = this.identities.get(key);
    if (!identity) {
      return { ok: false, error: new IdentityError(`Identity not found: ${identityId}`, 'IDENTITY_NOT_FOUND') };
    }

    const now = new Date().toISOString() as Timestamp;
    const profile: IdentityProfile = Object.freeze({
      identityId,
      displayName: profileData.displayName,
      email: profileData.email,
      avatarUrl: profileData.avatarUrl,
      attributes: Object.freeze({ ...(profileData.attributes ?? {}) }),
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    this.profiles.set(key, profile);

    // Auto-transition Created → Configured
    if (identity.state === IdentityState.Created) {
      this.transitionIdentity(identityId, IdentityState.Configured);
    }

    void this.publishEvent({
      eventType: 'ProfileCreated',
      classification: EventClassification.Action,
      payload: { identityId, displayName: profileData.displayName },
    });

    return { ok: true, value: profile };
  }

  getProfile(identityId: IdentityId): IdentityProfile | null {
    this.assertNotDisposed();
    return this.profiles.get(identityId as unknown as string) ?? null;
  }

  updateProfile(
    identityId: IdentityId,
    updates: { displayName?: string; email?: string; avatarUrl?: string; attributes?: Record<string, unknown> },
  ): Result<IdentityProfile, IdentityError> {
    this.assertNotDisposed();

    const key = identityId as unknown as string;
    const existing = this.profiles.get(key);
    if (!existing) {
      return { ok: false, error: new IdentityError(`Profile not found for identity: ${identityId}`, 'PROFILE_NOT_FOUND') };
    }

    const now = new Date().toISOString() as Timestamp;
    const updated: IdentityProfile = Object.freeze({
      ...existing,
      displayName: updates.displayName ?? existing.displayName,
      email: updates.email !== undefined ? updates.email : existing.email,
      avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : existing.avatarUrl,
      attributes: Object.freeze({ ...existing.attributes, ...(updates.attributes ?? {}) }),
      version: existing.version + 1,
      updatedAt: now,
    });

    this.profiles.set(key, updated);

    void this.publishEvent({
      eventType: 'IdentityProfileUpdated',
      classification: EventClassification.StateChange,
      payload: { identityId, version: updated.version },
    });

    return { ok: true, value: updated };
  }

  // ═════════════════════════════════════════════════════════════════
  // PREFERENCE MANAGEMENT
  // ═════════════════════════════════════════════════════════════════

  setPreference(
    identityId: IdentityId,
    key: PreferenceKey,
    value: unknown,
    source: PreferenceSource,
  ): Result<PreferenceEntry, IdentityError> {
    this.assertNotDisposed();

    const idKey = identityId as unknown as string;
    const identity = this.identities.get(idKey);
    if (!identity) {
      return { ok: false, error: new IdentityError(`Identity not found: ${identityId}`, 'IDENTITY_NOT_FOUND') };
    }

    let prefMap = this.preferences.get(idKey);
    if (!prefMap) {
      prefMap = new Map();
      this.preferences.set(idKey, prefMap);
    }

    const maxPrefs = this.config.maxPreferencesPerIdentity ?? 200;
    if (!prefMap.has(key) && prefMap.size >= maxPrefs) {
      return { ok: false, error: new IdentityError('Maximum preference count reached for identity', 'PREFERENCE_LIMIT_REACHED') };
    }

    const previousValue = prefMap.has(key) ? prefMap.get(key)!.value : undefined;
    const now = new Date().toISOString() as Timestamp;
    const entry: PreferenceEntry = Object.freeze({ key, value, source, setAt: now });
    prefMap.set(key, entry);

    // Record history
    let history = this.preferenceHistory.get(idKey);
    if (!history) {
      history = [];
      this.preferenceHistory.set(idKey, history);
    }
    history.push(Object.freeze({ key, previousValue, newValue: value, source, changedAt: now }));
    const historyLimit = this.config.preferenceHistoryLimit ?? 100;
    if (history.length > historyLimit) {
      history.splice(0, history.length - historyLimit);
    }

    void this.publishEvent({
      eventType: 'PreferenceChanged',
      classification: EventClassification.StateChange,
      payload: { identityId, key, source },
    });

    return { ok: true, value: entry };
  }

  getPreference(identityId: IdentityId, key: PreferenceKey): PreferenceEntry | null {
    this.assertNotDisposed();
    const prefMap = this.preferences.get(identityId as unknown as string);
    return prefMap?.get(key) ?? null;
  }

  resolvePreference(identityId: IdentityId, key: PreferenceKey): PreferenceEntry | null {
    this.assertNotDisposed();

    const idKey = identityId as unknown as string;

    // Walk resolution chain: User (identity's own) first
    const prefMap = this.preferences.get(idKey);
    if (prefMap?.has(key)) {
      this._resolverHits++;
      void this.publishEvent({
        eventType: 'PreferenceResolved',
        classification: EventClassification.Result,
        payload: { identityId, key, resolvedFrom: PreferenceSource.User },
      });
      return prefMap.get(key)!;
    }

    // Check organization preferences via identity's org memberships
    for (const org of this.organizations.values()) {
      if (org.memberIds.includes(idKey)) {
        const orgPrefMap = this.preferences.get(org.id as unknown as string);
        if (orgPrefMap?.has(key)) {
          this._resolverHits++;
          void this.publishEvent({
            eventType: 'PreferenceResolved',
            classification: EventClassification.Result,
            payload: { identityId, key, resolvedFrom: PreferenceSource.Organization },
          });
          return orgPrefMap.get(key)!;
        }
      }
    }

    // Check team preferences
    for (const team of this.teams.values()) {
      if (team.memberIds.includes(idKey)) {
        const teamPrefMap = this.preferences.get(team.id as unknown as string);
        if (teamPrefMap?.has(key)) {
          this._resolverHits++;
          void this.publishEvent({
            eventType: 'PreferenceResolved',
            classification: EventClassification.Result,
            payload: { identityId, key, resolvedFrom: PreferenceSource.Team },
          });
          return teamPrefMap.get(key)!;
        }
      }
    }

    // Check system preferences (identity with OwnerType.System)
    for (const identity of this.identities.values()) {
      if (identity.ownerType === OwnerType.System) {
        const sysPrefMap = this.preferences.get(identity.id as unknown as string);
        if (sysPrefMap?.has(key)) {
          this._resolverHits++;
          void this.publishEvent({
            eventType: 'PreferenceResolved',
            classification: EventClassification.Result,
            payload: { identityId, key, resolvedFrom: PreferenceSource.System },
          });
          return sysPrefMap.get(key)!;
        }
      }
    }

    this._resolverMisses++;
    return null;
  }

  getAllPreferences(identityId: IdentityId): readonly PreferenceEntry[] {
    this.assertNotDisposed();
    const prefMap = this.preferences.get(identityId as unknown as string);
    if (!prefMap) return Object.freeze([]);
    return Object.freeze([...prefMap.values()]);
  }

  removePreference(identityId: IdentityId, key: PreferenceKey): Result<void, IdentityError> {
    this.assertNotDisposed();

    const idKey = identityId as unknown as string;
    const prefMap = this.preferences.get(idKey);
    if (!prefMap || !prefMap.has(key)) {
      return { ok: false, error: new IdentityError(`Preference not found: ${key}`, 'PREFERENCE_NOT_FOUND') };
    }

    prefMap.delete(key);
    return { ok: true, value: undefined };
  }

  // ═════════════════════════════════════════════════════════════════
  // PREFERENCE SNAPSHOTS
  // ═════════════════════════════════════════════════════════════════

  createPreferenceSnapshot(identityId: IdentityId, description: string): Result<PreferenceSnapshot, IdentityError> {
    this.assertNotDisposed();

    const idKey = identityId as unknown as string;
    const prefMap = this.preferences.get(idKey);
    if (!prefMap) {
      return { ok: false, error: new IdentityError(`Identity not found: ${identityId}`, 'IDENTITY_NOT_FOUND') };
    }

    const frozenPrefs: Record<string, unknown> = {};
    for (const [k, v] of prefMap) {
      frozenPrefs[k] = v.value;
    }

    const now = new Date().toISOString() as Timestamp;
    const snapshot: PreferenceSnapshot = Object.freeze({
      id: brandSnapshotId(crypto.randomUUID()),
      identityId,
      description,
      preferences: Object.freeze(frozenPrefs),
      createdAt: now,
    });

    let snapMap = this.preferenceSnapshots.get(idKey);
    if (!snapMap) {
      snapMap = new Map();
      this.preferenceSnapshots.set(idKey, snapMap);
    }
    snapMap.set(snapshot.id as unknown as string, snapshot);

    // Enforce snapshot history limit
    const snapLimit = this.config.snapshotHistoryLimit ?? 50;
    if (snapMap.size > snapLimit) {
      const entries = [...snapMap.entries()].sort(
        (a, b) => a[1].createdAt.localeCompare(b[1].createdAt),
      );
      while (snapMap.size > snapLimit) {
        const oldest = entries.shift()!;
        snapMap.delete(oldest[0]);
      }
    }

    void this.publishEvent({
      eventType: 'PreferenceSnapshotCreated',
      classification: EventClassification.Action,
      payload: { identityId, snapshotId: snapshot.id, description },
    });

    return { ok: true, value: snapshot };
  }

  restorePreferenceSnapshot(identityId: IdentityId, snapshotId: SnapshotId): Result<PreferenceSnapshot, IdentityError> {
    this.assertNotDisposed();

    const idKey = identityId as unknown as string;
    const snapMap = this.preferenceSnapshots.get(idKey);
    if (!snapMap) {
      return { ok: false, error: new IdentityError(`No snapshots for identity: ${identityId}`, 'SNAPSHOT_NOT_FOUND') };
    }

    const snapshot = snapMap.get(snapshotId as unknown as string);
    if (!snapshot) {
      return { ok: false, error: new IdentityError(`Snapshot not found: ${snapshotId}`, 'SNAPSHOT_NOT_FOUND') };
    }

    // Restore: clear existing and set from snapshot
    const prefMap = new Map<string, PreferenceEntry>();
    const now = new Date().toISOString() as Timestamp;
    for (const [k, v] of Object.entries(snapshot.preferences)) {
      if (Object.values(PreferenceKey).includes(k as PreferenceKey)) {
        prefMap.set(k, Object.freeze({
          key: k as PreferenceKey,
          value: v,
          source: PreferenceSource.User,
          setAt: now,
        }));
      }
    }
    this.preferences.set(idKey, prefMap);

    void this.publishEvent({
      eventType: 'PreferenceRestored',
      classification: EventClassification.StateChange,
      payload: { identityId, snapshotId },
    });

    return { ok: true, value: snapshot };
  }

  getPreferenceSnapshots(identityId: IdentityId): readonly PreferenceSnapshot[] {
    this.assertNotDisposed();
    const snapMap = this.preferenceSnapshots.get(identityId as unknown as string);
    if (!snapMap) return Object.freeze([]);
    return Object.freeze([...snapMap.values()]);
  }

  getPreferenceHistory(identityId: IdentityId): readonly PreferenceHistoryEntry[] {
    this.assertNotDisposed();
    const history = this.preferenceHistory.get(identityId as unknown as string);
    if (!history) return Object.freeze([]);
    return Object.freeze([...history]);
  }

  // ═════════════════════════════════════════════════════════════════
  // ORGANIZATION MANAGEMENT
  // ═════════════════════════════════════════════════════════════════

  createOrganization(
    name: string,
    description: string,
    departments?: string[],
    metadata?: Record<string, unknown>,
  ): Result<Organization, IdentityError> {
    this.assertNotDisposed();

    const maxOrgs = this.config.maxOrganizations ?? 1_000;
    if (this.organizations.size >= maxOrgs) {
      return { ok: false, error: new IdentityError('Maximum organization count reached', 'ORGANIZATION_LIMIT_REACHED') };
    }

    const now = new Date().toISOString() as Timestamp;
    const org: Organization = Object.freeze({
      id: brandOrganizationId(crypto.randomUUID()),
      name, description,
      departments: Object.freeze(departments ?? []),
      memberIds: Object.freeze([]),
      version: 1,
      createdAt: now, updatedAt: now,
      metadata: Object.freeze({ ...(metadata ?? {}) }),
    });

    this.organizations.set(org.id as unknown as string, org);

    void this.publishEvent({
      eventType: 'OrganizationCreated',
      classification: EventClassification.Action,
      payload: { organizationId: org.id, name },
    });

    return { ok: true, value: org };
  }

  getOrganization(organizationId: OrganizationId): Organization | null {
    this.assertNotDisposed();
    return this.organizations.get(organizationId as unknown as string) ?? null;
  }

  updateOrganization(
    organizationId: OrganizationId,
    updates: { name?: string; description?: string; departments?: string[]; metadata?: Record<string, unknown> },
  ): Result<Organization, IdentityError> {
    this.assertNotDisposed();

    const key = organizationId as unknown as string;
    const existing = this.organizations.get(key);
    if (!existing) {
      return { ok: false, error: new IdentityError(`Organization not found: ${organizationId}`, 'ORGANIZATION_NOT_FOUND') };
    }

    const now = new Date().toISOString() as Timestamp;
    const updated: Organization = Object.freeze({
      ...existing,
      name: updates.name ?? existing.name,
      description: updates.description ?? existing.description,
      departments: Object.freeze(updates.departments ?? existing.departments),
      metadata: Object.freeze({ ...existing.metadata, ...(updates.metadata ?? {}) }),
      version: existing.version + 1,
      updatedAt: now,
    });

    this.organizations.set(key, updated);
    return { ok: true, value: updated };
  }

  deleteOrganization(organizationId: OrganizationId): Result<void, IdentityError> {
    this.assertNotDisposed();

    const key = organizationId as unknown as string;
    if (!this.organizations.has(key)) {
      return { ok: false, error: new IdentityError(`Organization not found: ${organizationId}`, 'ORGANIZATION_NOT_FOUND') };
    }

    this.organizations.delete(key);
    return { ok: true, value: undefined };
  }

  addMemberToOrganization(organizationId: OrganizationId, identityId: IdentityId): Result<void, IdentityError> {
    this.assertNotDisposed();

    const orgKey = organizationId as unknown as string;
    const idKey = identityId as unknown as string;
    const org = this.organizations.get(orgKey);
    if (!org) {
      return { ok: false, error: new IdentityError(`Organization not found: ${organizationId}`, 'ORGANIZATION_NOT_FOUND') };
    }
    if (org.memberIds.includes(idKey)) {
      return { ok: true, value: undefined };
    }

    const now = new Date().toISOString() as Timestamp;
    const updated: Organization = Object.freeze({
      ...org,
      memberIds: Object.freeze([...org.memberIds, idKey]),
      version: org.version + 1,
      updatedAt: now,
    });
    this.organizations.set(orgKey, updated);
    return { ok: true, value: undefined };
  }

  removeMemberFromOrganization(organizationId: OrganizationId, identityId: IdentityId): Result<void, IdentityError> {
    this.assertNotDisposed();

    const orgKey = organizationId as unknown as string;
    const idKey = identityId as unknown as string;
    const org = this.organizations.get(orgKey);
    if (!org) {
      return { ok: false, error: new IdentityError(`Organization not found: ${organizationId}`, 'ORGANIZATION_NOT_FOUND') };
    }
    if (!org.memberIds.includes(idKey)) {
      return { ok: true, value: undefined };
    }

    const now = new Date().toISOString() as Timestamp;
    const updated: Organization = Object.freeze({
      ...org,
      memberIds: Object.freeze(org.memberIds.filter(m => m !== idKey)),
      version: org.version + 1,
      updatedAt: now,
    });
    this.organizations.set(orgKey, updated);
    return { ok: true, value: undefined };
  }

  // ═════════════════════════════════════════════════════════════════
  // TEAM MANAGEMENT
  // ═════════════════════════════════════════════════════════════════

  createTeam(
    name: string,
    description: string,
    organizationId: OrganizationId,
    metadata?: Record<string, unknown>,
  ): Result<Team, IdentityError> {
    this.assertNotDisposed();

    const orgKey = organizationId as unknown as string;
    if (!this.organizations.has(orgKey)) {
      return { ok: false, error: new IdentityError(`Organization not found: ${organizationId}`, 'ORGANIZATION_NOT_FOUND') };
    }

    const maxTeams = this.config.maxTeamsPerOrganization ?? 100;
    let orgTeamCount = 0;
    for (const team of this.teams.values()) {
      if ((team.organizationId as unknown as string) === orgKey) orgTeamCount++;
    }
    if (orgTeamCount >= maxTeams) {
      return { ok: false, error: new IdentityError('Maximum team count reached for organization', 'TEAM_LIMIT_REACHED') };
    }

    const now = new Date().toISOString() as Timestamp;
    const team: Team = Object.freeze({
      id: brandTeamId(crypto.randomUUID()),
      name, description, organizationId,
      memberIds: Object.freeze([]),
      version: 1,
      createdAt: now, updatedAt: now,
      metadata: Object.freeze({ ...(metadata ?? {}) }),
    });

    this.teams.set(team.id as unknown as string, team);

    void this.publishEvent({
      eventType: 'TeamCreated',
      classification: EventClassification.Action,
      payload: { teamId: team.id, name, organizationId },
    });

    return { ok: true, value: team };
  }

  getTeam(teamId: TeamId): Team | null {
    this.assertNotDisposed();
    return this.teams.get(teamId as unknown as string) ?? null;
  }

  updateTeam(
    teamId: TeamId,
    updates: { name?: string; description?: string; metadata?: Record<string, unknown> },
  ): Result<Team, IdentityError> {
    this.assertNotDisposed();

    const key = teamId as unknown as string;
    const existing = this.teams.get(key);
    if (!existing) {
      return { ok: false, error: new IdentityError(`Team not found: ${teamId}`, 'TEAM_NOT_FOUND') };
    }

    const now = new Date().toISOString() as Timestamp;
    const updated: Team = Object.freeze({
      ...existing,
      name: updates.name ?? existing.name,
      description: updates.description ?? existing.description,
      metadata: Object.freeze({ ...existing.metadata, ...(updates.metadata ?? {}) }),
      version: existing.version + 1,
      updatedAt: now,
    });

    this.teams.set(key, updated);
    return { ok: true, value: updated };
  }

  deleteTeam(teamId: TeamId): Result<void, IdentityError> {
    this.assertNotDisposed();

    const key = teamId as unknown as string;
    if (!this.teams.has(key)) {
      return { ok: false, error: new IdentityError(`Team not found: ${teamId}`, 'TEAM_NOT_FOUND') };
    }

    this.teams.delete(key);
    return { ok: true, value: undefined };
  }

  addMemberToTeam(teamId: TeamId, identityId: IdentityId): Result<void, IdentityError> {
    this.assertNotDisposed();

    const teamKey = teamId as unknown as string;
    const idKey = identityId as unknown as string;
    const team = this.teams.get(teamKey);
    if (!team) {
      return { ok: false, error: new IdentityError(`Team not found: ${teamId}`, 'TEAM_NOT_FOUND') };
    }
    if (team.memberIds.includes(idKey)) {
      return { ok: true, value: undefined };
    }

    const now = new Date().toISOString() as Timestamp;
    const updated: Team = Object.freeze({
      ...team,
      memberIds: Object.freeze([...team.memberIds, idKey]),
      version: team.version + 1,
      updatedAt: now,
    });
    this.teams.set(teamKey, updated);
    return { ok: true, value: undefined };
  }

  removeMemberFromTeam(teamId: TeamId, identityId: IdentityId): Result<void, IdentityError> {
    this.assertNotDisposed();

    const teamKey = teamId as unknown as string;
    const idKey = identityId as unknown as string;
    const team = this.teams.get(teamKey);
    if (!team) {
      return { ok: false, error: new IdentityError(`Team not found: ${teamId}`, 'TEAM_NOT_FOUND') };
    }
    if (!team.memberIds.includes(idKey)) {
      return { ok: true, value: undefined };
    }

    const now = new Date().toISOString() as Timestamp;
    const updated: Team = Object.freeze({
      ...team,
      memberIds: Object.freeze(team.memberIds.filter(m => m !== idKey)),
      version: team.version + 1,
      updatedAt: now,
    });
    this.teams.set(teamKey, updated);
    return { ok: true, value: undefined };
  }

  // ═════════════════════════════════════════════════════════════════
  // ROLE MANAGEMENT
  // ═════════════════════════════════════════════════════════════════

  createRole(
    name: string,
    description: string,
    permissions: readonly PermissionId[],
    capabilities?: readonly string[],
    restrictions?: readonly string[],
    metadata?: Record<string, unknown>,
  ): Result<Role, IdentityError> {
    this.assertNotDisposed();

    const maxRoles = this.config.maxRoles ?? 500;
    if (this.roles.size >= maxRoles) {
      return { ok: false, error: new IdentityError('Maximum role count reached', 'ROLE_LIMIT_REACHED') };
    }

    const now = new Date().toISOString() as Timestamp;
    const role: Role = Object.freeze({
      id: brandRoleId(crypto.randomUUID()),
      name, description,
      permissionIds: Object.freeze([...permissions]),
      capabilities: Object.freeze(capabilities ?? []),
      restrictions: Object.freeze(restrictions ?? []),
      version: 1,
      createdAt: now, updatedAt: now,
      metadata: Object.freeze({ ...(metadata ?? {}) }),
    });

    this.roles.set(role.id as unknown as string, role);
    return { ok: true, value: role };
  }

  getRole(roleId: RoleId): Role | null {
    this.assertNotDisposed();
    return this.roles.get(roleId as unknown as string) ?? null;
  }

  updateRole(
    roleId: RoleId,
    updates: { name?: string; description?: string; permissions?: readonly PermissionId[]; metadata?: Record<string, unknown> },
  ): Result<Role, IdentityError> {
    this.assertNotDisposed();

    const key = roleId as unknown as string;
    const existing = this.roles.get(key);
    if (!existing) {
      return { ok: false, error: new IdentityError(`Role not found: ${roleId}`, 'ROLE_NOT_FOUND') };
    }

    const now = new Date().toISOString() as Timestamp;
    const updated: Role = Object.freeze({
      ...existing,
      name: updates.name ?? existing.name,
      description: updates.description ?? existing.description,
      permissionIds: Object.freeze(updates.permissions ? [...updates.permissions] : existing.permissionIds),
      metadata: Object.freeze({ ...existing.metadata, ...(updates.metadata ?? {}) }),
      version: existing.version + 1,
      updatedAt: now,
    });

    this.roles.set(key, updated);
    return { ok: true, value: updated };
  }

  deleteRole(roleId: RoleId): Result<void, IdentityError> {
    this.assertNotDisposed();

    const key = roleId as unknown as string;
    if (!this.roles.has(key)) {
      return { ok: false, error: new IdentityError(`Role not found: ${roleId}`, 'ROLE_NOT_FOUND') };
    }

    // Clean up all assignments referencing this role
    for (const [idKey, assignments] of this.roleAssignments) {
      const filtered = assignments.filter(a => (a.roleId as unknown as string) !== key);
      this.roleAssignments.set(idKey, filtered);
    }

    this.roles.delete(key);
    return { ok: true, value: undefined };
  }

  assignRole(
    identityId: IdentityId,
    roleId: RoleId,
    assignedBy: string,
    scope?: string,
    expiresAt?: Timestamp,
  ): Result<RoleAssignment, IdentityError> {
    this.assertNotDisposed();

    const idKey = identityId as unknown as string;
    const roleKey = roleId as unknown as string;

    if (!this.identities.has(idKey)) {
      return { ok: false, error: new IdentityError(`Identity not found: ${identityId}`, 'IDENTITY_NOT_FOUND') };
    }
    if (!this.roles.has(roleKey)) {
      return { ok: false, error: new IdentityError(`Role not found: ${roleId}`, 'ROLE_NOT_FOUND') };
    }

    // Validate no role cycles: a role cannot assign itself into its own hierarchy
    // Check if the target identity is an owner of the role
    const identity = this.identities.get(idKey)!;
    if (identity.ownerType === OwnerType.System) {
      const role = this.roles.get(roleKey)!;
      // Simple cycle check: prevent system identities from being assigned roles
      // that reference their own capabilities
      for (const cap of role.capabilities) {
        if (cap === identity.name) {
          return { ok: false, error: new IdentityError('Role assignment creates a cycle', 'ROLE_CYCLE_DETECTED') };
        }
      }
    }

    let assignments = this.roleAssignments.get(idKey);
    if (!assignments) {
      assignments = [];
      this.roleAssignments.set(idKey, assignments);
    }

    // Prevent duplicate assignment
    if (assignments.some(a => (a.roleId as unknown as string) === roleKey)) {
      return { ok: false, error: new IdentityError(`Role already assigned to identity`, 'ROLE_ALREADY_ASSIGNED') };
    }

    const now = new Date().toISOString() as Timestamp;
    const assignment: RoleAssignment = Object.freeze({
      roleId, identityId, assignedBy, scope, expiresAt, assignedAt: now,
    });

    assignments.push(assignment);

    void this.publishEvent({
      eventType: 'RoleAssigned',
      classification: EventClassification.Action,
      payload: { identityId, roleId, assignedBy, scope },
    });

    return { ok: true, value: assignment };
  }

  revokeRole(identityId: IdentityId, roleId: RoleId, revokedBy: string): Result<void, IdentityError> {
    this.assertNotDisposed();

    const idKey = identityId as unknown as string;
    const roleKey = roleId as unknown as string;
    const assignments = this.roleAssignments.get(idKey);
    if (!assignments) {
      return { ok: false, error: new IdentityError(`No role assignments for identity: ${identityId}`, 'ROLE_NOT_ASSIGNED') };
    }

    const index = assignments.findIndex(a => (a.roleId as unknown as string) === roleKey);
    if (index === -1) {
      return { ok: false, error: new IdentityError(`Role ${roleId} not assigned to identity`, 'ROLE_NOT_ASSIGNED') };
    }

    assignments.splice(index, 1);

    void this.publishEvent({
      eventType: 'RoleRevoked',
      classification: EventClassification.Action,
      payload: { identityId, roleId, revokedBy },
    });

    return { ok: true, value: undefined };
  }

  getRoleAssignments(identityId: IdentityId): readonly RoleAssignment[] {
    this.assertNotDisposed();
    const assignments = this.roleAssignments.get(identityId as unknown as string);
    if (!assignments) return Object.freeze([]);
    return Object.freeze([...assignments]);
  }

  getIdentityRoles(identityId: IdentityId): readonly Role[] {
    this.assertNotDisposed();

    const assignments = this.roleAssignments.get(identityId as unknown as string);
    if (!assignments) return Object.freeze([]);

    const roles: Role[] = [];
    for (const assignment of assignments) {
      const role = this.roles.get(assignment.roleId as unknown as string);
      if (role) roles.push(role);
    }
    return Object.freeze(roles);
  }

  // ═════════════════════════════════════════════════════════════════
  // PERMISSION MANAGEMENT
  // ═════════════════════════════════════════════════════════════════

  createPermission(
    name: string,
    description: string,
    resource: string,
    actions: readonly string[],
    conditions?: Record<string, unknown>,
  ): Result<Permission, IdentityError> {
    this.assertNotDisposed();

    const now = new Date().toISOString() as Timestamp;
    const permission: Permission = Object.freeze({
      id: brandPermissionId(crypto.randomUUID()),
      name, description, resource,
      actions: Object.freeze([...actions]),
      conditions: Object.freeze(conditions ?? {}),
      createdAt: now,
    });

    this.permissions.set(permission.id as unknown as string, permission);
    return { ok: true, value: permission };
  }

  getPermission(permissionId: PermissionId): Permission | null {
    this.assertNotDisposed();
    return this.permissions.get(permissionId as unknown as string) ?? null;
  }

  // ═════════════════════════════════════════════════════════════════
  // POLICY MANAGEMENT
  // ═════════════════════════════════════════════════════════════════

  createPolicy(
    name: string,
    description: string,
    rules: readonly PolicyRule[],
    scope: string,
    priority?: number,
  ): Result<Policy, IdentityError> {
    this.assertNotDisposed();

    const now = new Date().toISOString() as Timestamp;
    const policy: Policy = Object.freeze({
      id: brandPolicyId(crypto.randomUUID()),
      name, description,
      rules: Object.freeze([...rules]),
      scope,
      priority: priority ?? 0,
      version: 1,
      createdAt: now, updatedAt: now,
    });

    this.policies.set(policy.id as unknown as string, policy);

    void this.publishEvent({
      eventType: 'PolicyChanged',
      classification: EventClassification.StateChange,
      payload: { policyId: policy.id, name, scope, change: 'created' },
    });

    return { ok: true, value: policy };
  }

  getPolicy(policyId: PolicyId): Policy | null {
    this.assertNotDisposed();
    return this.policies.get(policyId as unknown as string) ?? null;
  }

  updatePolicy(
    policyId: PolicyId,
    updates: { name?: string; description?: string; rules?: readonly PolicyRule[]; scope?: string; priority?: number },
  ): Result<Policy, IdentityError> {
    this.assertNotDisposed();

    const key = policyId as unknown as string;
    const existing = this.policies.get(key);
    if (!existing) {
      return { ok: false, error: new IdentityError(`Policy not found: ${policyId}`, 'POLICY_NOT_FOUND') };
    }

    const now = new Date().toISOString() as Timestamp;
    const updated: Policy = Object.freeze({
      ...existing,
      name: updates.name ?? existing.name,
      description: updates.description ?? existing.description,
      rules: Object.freeze(updates.rules ? [...updates.rules] : existing.rules),
      scope: updates.scope ?? existing.scope,
      priority: updates.priority ?? existing.priority,
      version: existing.version + 1,
      updatedAt: now,
    });

    this.policies.set(key, updated);

    void this.publishEvent({
      eventType: 'PolicyChanged',
      classification: EventClassification.StateChange,
      payload: { policyId: updated.id, name: updated.name, scope: updated.scope, change: 'updated' },
    });

    return { ok: true, value: updated };
  }

  deletePolicy(policyId: PolicyId): Result<void, IdentityError> {
    this.assertNotDisposed();

    const key = policyId as unknown as string;
    if (!this.policies.has(key)) {
      return { ok: false, error: new IdentityError(`Policy not found: ${policyId}`, 'POLICY_NOT_FOUND') };
    }

    this.policies.delete(key);
    return { ok: true, value: undefined };
  }

  // ═════════════════════════════════════════════════════════════════
  // POLICY RESOLVER
  // ═════════════════════════════════════════════════════════════════

  resolvePolicy(identityId: IdentityId, resource: string, action: string): PolicyResolutionResult {
    this.assertNotDisposed();
    this._policyEvaluations++;

    const idKey = identityId as unknown as string;
    const resolutionPath: string[] = [];

    // Collect all applicable policies ordered by priority (highest first)
    const applicablePolicies: Policy[] = [];

    // System-scope policies
    for (const policy of this.policies.values()) {
      if (policy.scope === 'System') {
        applicablePolicies.push(policy);
        resolutionPath.push(`system:${policy.name}`);
      }
    }

    // Organization-scope policies (via membership)
    for (const org of this.organizations.values()) {
      if (org.memberIds.includes(idKey)) {
        for (const policy of this.policies.values()) {
          if (policy.scope === `org:${org.id}`) {
            applicablePolicies.push(policy);
            resolutionPath.push(`org:${policy.name}`);
          }
        }
      }
    }

    // Team-scope policies
    for (const team of this.teams.values()) {
      if (team.memberIds.includes(idKey)) {
        for (const policy of this.policies.values()) {
          if (policy.scope === `team:${team.id}`) {
            applicablePolicies.push(policy);
            resolutionPath.push(`team:${policy.name}`);
          }
        }
      }
    }

    // Role-scope policies (via role assignments)
    const assignments = this.roleAssignments.get(idKey);
    if (assignments) {
      for (const assignment of assignments) {
        for (const policy of this.policies.values()) {
          if (policy.scope === `role:${assignment.roleId}`) {
            applicablePolicies.push(policy);
            resolutionPath.push(`role:${policy.name}`);
          }
        }
      }
    }

    // User-scope and Session-scope policies
    for (const policy of this.policies.values()) {
      if (policy.scope === `user:${idKey}` || policy.scope === `session:${idKey}`) {
        applicablePolicies.push(policy);
        resolutionPath.push(`${policy.scope}:${policy.name}`);
      }
    }

    // Sort by priority descending
    applicablePolicies.sort((a, b) => b.priority - a.priority);

    // Evaluate: deny takes precedence at same priority
    let allowMatch: { policy: Policy; rule: PolicyRule } | null = null;
    let denyMatch: { policy: Policy; rule: PolicyRule } | null = null;
    let bestPriority = -Infinity;

    for (const policy of applicablePolicies) {
      if (policy.priority < bestPriority && (allowMatch || denyMatch)) break;

      for (const rule of policy.rules) {
        if (rule.resource !== resource || rule.action !== action) continue;

        if (rule.effect === PolicyEffect.Deny) {
          if (!denyMatch || policy.priority > (denyMatch.policy.priority)) {
            denyMatch = { policy, rule };
            bestPriority = policy.priority;
          }
        } else if (rule.effect === PolicyEffect.Allow) {
          if (!allowMatch || policy.priority > (allowMatch.policy.priority)) {
            allowMatch = { policy, rule };
            bestPriority = policy.priority;
          }
        }
      }
    }

    // Deny wins over Allow at same priority
    if (denyMatch && (!allowMatch || denyMatch.policy.priority >= allowMatch.policy.priority)) {
      return Object.freeze({
        effect: PolicyEffect.Deny,
        policyId: denyMatch.policy.id,
        policyName: denyMatch.policy.name,
        matchedRule: denyMatch.rule,
        resolutionPath: Object.freeze(resolutionPath),
      });
    }

    if (allowMatch) {
      return Object.freeze({
        effect: PolicyEffect.Allow,
        policyId: allowMatch.policy.id,
        policyName: allowMatch.policy.name,
        matchedRule: allowMatch.rule,
        resolutionPath: Object.freeze(resolutionPath),
      });
    }

    return Object.freeze({
      effect: null,
      policyId: null,
      policyName: null,
      matchedRule: null,
      resolutionPath: Object.freeze(resolutionPath),
    });
  }

  // ═════════════════════════════════════════════════════════════════
  // VALIDATION
  // ═════════════════════════════════════════════════════════════════

  validateIdentity(identityId: IdentityId): Result<readonly string[], IdentityError> {
    this.assertNotDisposed();

    const key = identityId as unknown as string;
    const identity = this.identities.get(key);
    if (!identity) {
      return { ok: false, error: new IdentityError(`Identity not found: ${identityId}`, 'IDENTITY_NOT_FOUND') };
    }

    const violations: string[] = [];

    // Check profile exists if not in Created state
    if (identity.state !== IdentityState.Created && !this.profiles.has(key)) {
      violations.push('Identity in non-Created state without a profile');
    }

    // Check FSM state consistency
    const fsm = this.identityFSMs.get(key);
    if (fsm && fsm.currentState !== identity.state) {
      violations.push(`FSM state ${fsm.currentState} does not match identity state ${identity.state}`);
    }

    // Check role assignments reference existing roles
    const assignments = this.roleAssignments.get(key);
    if (assignments) {
      for (const a of assignments) {
        if (!this.roles.has(a.roleId as unknown as string)) {
          violations.push(`Role assignment references non-existent role: ${a.roleId}`);
        }
      }
    }

    return { ok: true, value: Object.freeze(violations) };
  }

  validateOrganizationStructure(organizationId: OrganizationId): Result<readonly string[], IdentityError> {
    this.assertNotDisposed();

    const key = organizationId as unknown as string;
    const org = this.organizations.get(key);
    if (!org) {
      return { ok: false, error: new IdentityError(`Organization not found: ${organizationId}`, 'ORGANIZATION_NOT_FOUND') };
    }

    const violations: string[] = [];

    // Check for orphan members
    for (const memberId of org.memberIds) {
      if (!this.identities.has(memberId)) {
        violations.push(`Organization has orphan member: ${memberId}`);
      }
    }

    // Check for cycles in department hierarchy (simple: no department lists itself)
    for (const dept of org.departments) {
      if (dept === org.id) {
        violations.push('Organization department references itself');
      }
    }

    // Check teams reference valid organization
    for (const team of this.teams.values()) {
      if ((team.organizationId as unknown as string) === key) {
        for (const memberId of team.memberIds) {
          if (!org.memberIds.includes(memberId) && !this.identities.has(memberId)) {
            violations.push(`Team ${team.name} has orphan member: ${memberId}`);
          }
        }
      }
    }

    return { ok: true, value: Object.freeze(violations) };
  }

  validateRoleAssignments(identityId: IdentityId): Result<readonly string[], IdentityError> {
    this.assertNotDisposed();

    const key = identityId as unknown as string;
    if (!this.identities.has(key)) {
      return { ok: false, error: new IdentityError(`Identity not found: ${identityId}`, 'IDENTITY_NOT_FOUND') };
    }

    const violations: string[] = [];
    const assignments = this.roleAssignments.get(key);
    if (!assignments) return { ok: true, value: Object.freeze(violations) };

    const visited = new Set<string>();
    for (const assignment of assignments) {
      const roleKey = assignment.roleId as unknown as string;
      if (visited.has(roleKey)) {
        violations.push(`Duplicate role assignment detected: ${assignment.roleId}`);
        continue;
      }
      visited.add(roleKey);

      const role = this.roles.get(roleKey);
      if (!role) {
        violations.push(`Role assignment references non-existent role: ${assignment.roleId}`);
        continue;
      }

      // Check for expired assignments
      if (assignment.expiresAt && new Date(assignment.expiresAt).getTime() < Date.now()) {
        violations.push(`Role assignment is expired: ${assignment.roleId}`);
      }
    }

    return { ok: true, value: Object.freeze(violations) };
  }

  // ═════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═════════════════════════════════════════════════════════════════

  getStats(): IdentityStats {
    let snapshotCount = 0;
    for (const snapMap of this.preferenceSnapshots.values()) {
      snapshotCount += snapMap.size;
    }

    let preferenceCount = 0;
    for (const prefMap of this.preferences.values()) {
      preferenceCount += prefMap.size;
    }

    const total = this._resolverHits + this._resolverMisses;

    return Object.freeze({
      identityCount: this.identities.size,
      profileCount: this.profiles.size,
      preferenceCount,
      organizationCount: this.organizations.size,
      teamCount: this.teams.size,
      roleCount: this.roles.size,
      policyCount: this.policies.size,
      permissionCount: this.permissions.size,
      policyEvaluations: this._policyEvaluations,
      resolverHits: this._resolverHits,
      resolverMisses: this._resolverMisses,
      resolverHitRatio: total > 0 ? this._resolverHits / total : 0,
      snapshotCount,
    });
  }

  // ═════════════════════════════════════════════════════════════════
  // LIFECYCLE (Service interface — no-op for InProcess)
  // ═════════════════════════════════════════════════════════════════

  async initialize(): Promise<void> {
    this.assertNotDisposed();
    // InProcess: no external resources to initialize
  }

  async start(): Promise<void> {
    this.assertNotDisposed();
    // InProcess: no-op
  }

  async stop(): Promise<void> {
    this.assertNotDisposed();
    // InProcess: no-op
  }

  async shutdown(): Promise<void> {
    this.assertNotDisposed();
    // InProcess: no-op
  }

  dispose(): void {
    if (this._disposed) return;

    this.identities.clear();
    this.profiles.clear();
    this.preferences.clear();
    this.preferenceHistory.clear();
    this.preferenceSnapshots.clear();
    this.organizations.clear();
    this.teams.clear();
    this.roles.clear();
    this.policies.clear();
    this.permissions.clear();
    this.roleAssignments.clear();
    this.identityFSMs.clear();

    this._disposed = true;
  }

  get disposed(): boolean {
    return this._disposed;
  }

  // ═════════════════════════════════════════════════════════════════
  // PERSISTENCE HELPERS
  // ═════════════════════════════════════════════════════════════════

  exportIdentityData(identityId: IdentityId): SerializableIdentity | null {
    this.assertNotDisposed();

    const key = identityId as unknown as string;
    const identity = this.identities.get(key);
    if (!identity) return null;

    const profile = this.profiles.get(key) ?? null;
    const prefMap = this.preferences.get(key);
    const allPrefs = prefMap ? Object.freeze([...prefMap.values()]) : Object.freeze([]);
    const assignments = this.roleAssignments.get(key);
    const allAssignments = assignments ? Object.freeze([...assignments]) : Object.freeze([]);

    return Object.freeze({ identity, profile, preferences: allPrefs, roleAssignments: allAssignments });
  }

  exportAllData(): {
    readonly identities: readonly SerializableIdentity[];
    readonly profiles: readonly IdentityProfile[];
    readonly preferences: ReadonlyMap<string, readonly PreferenceEntry[]>;
    readonly organizations: readonly Organization[];
    readonly teams: readonly Team[];
    readonly roles: readonly Role[];
    readonly policies: readonly Policy[];
  } {
    this.assertNotDisposed();

    const identities: SerializableIdentity[] = [];
    for (const identity of this.identities.values()) {
      const data = this.exportIdentityData(identity.id);
      if (data) identities.push(data);
    }

    const prefExport = new Map<string, readonly PreferenceEntry[]>();
    for (const [key, prefMap] of this.preferences) {
      prefExport.set(key, Object.freeze([...prefMap.values()]));
    }

    return Object.freeze({
      identities: Object.freeze(identities),
      profiles: Object.freeze([...this.profiles.values()]),
      preferences: prefExport,
      organizations: Object.freeze([...this.organizations.values()]),
      teams: Object.freeze([...this.teams.values()]),
      roles: Object.freeze([...this.roles.values()]),
      policies: Object.freeze([...this.policies.values()]),
    });
  }

  // ═════════════════════════════════════════════════════════════════
  // INTERNALS
  // ═════════════════════════════════════════════════════════════════

  private assertNotDisposed(): void {
    if (this._disposed) {
      throw new IdentityError('IdentityRuntime has been disposed', 'IDENTITY_RUNTIME_DISPOSED');
    }
  }

  /**
   * Publish a domain event through the event bus (fire-and-forget).
   * Non-throwing — errors from event publishing are silently swallowed
   * to avoid disrupting identity operations (ADR-002).
   */
  private async publishEvent(
    eventBase: Omit<DomainEventBase, 'eventId' | 'timestamp' | 'sequence' | 'aggregateId' | 'aggregateType' | 'version'> & {
      payload: unknown;
    },
  ): Promise<void> {
    if (!this.eventBus) return;

    try {
      const event = {
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        sequence: 0,
        aggregateId: 'identity-runtime',
        aggregateType: 'Identity',
        version: '1.0.0',
        ...eventBase,
      } as unknown as DomainEventBase;
      await this.eventBus.publish(event);
    } catch {
      // ADR-002: Event publishing failure must not disrupt identity operations
    }
  }
}
