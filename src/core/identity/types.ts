/**
 * Identity Module — Type Definitions
 * TASK-AIS-003F.000 — Identity & Preference Runtime Foundation
 *
 * Conforms to: CON-001.000, ARC-001.001, DOM-002.000
 */
import type { Timestamp, Identifier } from '../types/common.js';
import type { EntityBase } from '../domain/entities/entity-base.js';

// ─── Branded Identifiers ─────────────────────────────────────

export type IdentityId = Identifier & { readonly __brand: 'IdentityId' };
export type ProfileId = Identifier & { readonly __brand: 'ProfileId' };
export type PreferenceId = Identifier & { readonly __brand: 'PreferenceId' };
export type OrganizationId = Identifier & { readonly __brand: 'OrganizationId' };
export type TeamId = Identifier & { readonly __brand: 'TeamId' };
export type RoleId = Identifier & { readonly __brand: 'RoleId' };
export type PolicyId = Identifier & { readonly __brand: 'PolicyId' };
export type PreferenceSnapshotId = Identifier & { readonly __brand: 'PreferenceSnapshotId' };
export type PermissionId = Identifier & { readonly __brand: 'PermissionId' };

// ─── Branding Helpers ────────────────────────────────────────

export function brandIdentityId(id: Identifier): IdentityId {
  return id as unknown as IdentityId;
}
export function brandProfileId(id: Identifier): ProfileId {
  return id as unknown as ProfileId;
}
export function brandPreferenceId(id: Identifier): PreferenceId {
  return id as unknown as PreferenceId;
}
export function brandOrganizationId(id: Identifier): OrganizationId {
  return id as unknown as OrganizationId;
}
export function brandTeamId(id: Identifier): TeamId {
  return id as unknown as TeamId;
}
export function brandRoleId(id: Identifier): RoleId {
  return id as unknown as RoleId;
}
export function brandPolicyId(id: Identifier): PolicyId {
  return id as unknown as PolicyId;
}
export function brandPreferenceSnapshotId(id: Identifier): PreferenceSnapshotId {
  return id as unknown as PreferenceSnapshotId;
}
export function brandPermissionId(id: Identifier): PermissionId {
  return id as unknown as PermissionId;
}

// ─── Identity State (FSM) ─────────────────────────────────────

export enum IdentityState {
  Created = 'created',
  Configured = 'configured',
  Verified = 'verified',
  Active = 'active',
  Suspended = 'suspended',
  Archived = 'archived',
}

// ─── Owner Type ──────────────────────────────────────────────

export enum OwnerType {
  User = 'user',
  System = 'system',
  Organization = 'organization',
}

// ─── Identity Entity ────────────────────────────────────────

export interface Identity extends EntityBase {
  readonly name: string;
  readonly description: string;
  readonly status: IdentityState;
  readonly ownerType: OwnerType;
  readonly ownerId: Identifier;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ─── Identity Profile ────────────────────────────────────────

export interface IdentityProfile {
  readonly id: ProfileId;
  readonly identityId: IdentityId;
  readonly language: string;
  readonly timezone: string;
  readonly locale: string;
  readonly country: string;
  readonly region: string;
  readonly units: string;
  readonly dateFormat: string;
  readonly currency: string;
  readonly accessibility: Readonly<Record<string, unknown>>;
  readonly updatedAt: Timestamp;
}

// ─── Preference Parameter Keys ────────────────────────────────

export enum PreferenceKey {
  Verbosity = 'verbosity',
  RiskTolerance = 'risk_tolerance',
  PlanningDepth = 'planning_depth',
  ExplanationLevel = 'explanation_level',
  AnswerStyle = 'answer_style',
  Creativity = 'creativity',
  ConfirmationPolicy = 'confirmation_policy',
  AutomationLevel = 'automation_level',
  PrivacyLevel = 'privacy_level',
  LearningMode = 'learning_mode',
  NotificationMode = 'notification_mode',
  DocumentationStyle = 'documentation_style',
  DecisionConfidence = 'decision_confidence',
}

// ─── Preference Source ───────────────────────────────────────

export enum PreferenceSource {
  System = 'system',
  Organization = 'organization',
  Department = 'department',
  Team = 'team',
  User = 'user',
  Session = 'session',
}

// ─── Preference Entry ────────────────────────────────────────

export interface PreferenceEntry {
  readonly id: PreferenceId;
  readonly key: PreferenceKey;
  readonly value: unknown;
  readonly source: PreferenceSource;
  readonly confidence: number;
  readonly updatedAt: Timestamp;
}

// ─── Preference Snapshot ──────────────────────────────────────

export interface PreferenceSnapshot {
  readonly id: PreferenceSnapshotId;
  readonly identityId: IdentityId;
  readonly preferences: readonly PreferenceEntry[];
  readonly createdAt: Timestamp;
  readonly version: number;
  readonly description: string;
}

// ─── Preference History Entry ────────────────────────────────

export interface PreferenceHistoryEntry {
  readonly preferenceId: PreferenceId;
  readonly key: PreferenceKey;
  readonly oldValue: unknown;
  readonly newValue: unknown;
  readonly source: PreferenceSource;
  readonly changedAt: Timestamp;
  readonly version: number;
}

// ─── Preference Resolution Order ──────────────────────────────

export const PREFERENCE_RESOLUTION_ORDER: readonly PreferenceSource[] = [
  PreferenceSource.System,
  PreferenceSource.Organization,
  PreferenceSource.Department,
  PreferenceSource.Team,
  PreferenceSource.User,
  PreferenceSource.Session,
] as const;

// ─── Organization Entity ──────────────────────────────────────

export interface Organization {
  readonly id: OrganizationId;
  readonly name: string;
  readonly description: string;
  readonly departments: readonly string[];
  readonly policies: readonly PolicyId[];
  readonly members: readonly IdentityId[];
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: number;
}

// ─── Team Entity ─────────────────────────────────────────────

export interface Team {
  readonly id: TeamId;
  readonly name: string;
  readonly description: string;
  readonly organizationId: OrganizationId;
  readonly members: readonly IdentityId[];
  readonly policies: readonly PolicyId[];
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: number;
}

// ─── Role Entity ─────────────────────────────────────────────

export interface Role {
  readonly id: RoleId;
  readonly name: string;
  readonly description: string;
  readonly permissions: readonly PermissionId[];
  readonly capabilities: readonly string[];
  readonly restrictions: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: number;
}

// ─── Permission ──────────────────────────────────────────────

export interface Permission {
  readonly id: PermissionId;
  readonly name: string;
  readonly description: string;
  readonly resource: string;
  readonly actions: readonly string[];
  readonly conditions: Readonly<Record<string, unknown>>;
}

// ─── Policy ──────────────────────────────────────────────────

export interface Policy {
  readonly id: PolicyId;
  readonly name: string;
  readonly description: string;
  readonly rules: readonly PolicyRule[];
  readonly scope: PolicyScope;
  readonly priority: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: number;
}

// ─── Policy Rule ─────────────────────────────────────────────

export interface PolicyRule {
  readonly id: string;
  readonly resource: string;
  readonly action: string;
  readonly effect: PolicyEffect;
  readonly conditions: Readonly<Record<string, unknown>>;
}

// ─── Policy Effect ────────────────────────────────────────────

export enum PolicyEffect {
  Allow = 'allow',
  Deny = 'deny',
}

// ─── Policy Scope ────────────────────────────────────────────

export enum PolicyScope {
  System = 'system',
  Organization = 'organization',
  Department = 'department',
  Team = 'team',
  Role = 'role',
  User = 'user',
  Session = 'session',
}

export const POLICY_RESOLUTION_ORDER: readonly PolicyScope[] = [
  PolicyScope.System,
  PolicyScope.Organization,
  PolicyScope.Department,
  PolicyScope.Team,
  PolicyScope.Role,
  PolicyScope.User,
  PolicyScope.Session,
] as const;

// ─── Policy Resolution Result ────────────────────────────────

export interface PolicyResolutionResult {
  readonly effect: PolicyEffect;
  readonly matchedPolicyId: PolicyId | null;
  readonly matchedRuleId: string | null;
  readonly scope: PolicyScope;
  readonly priority: number;
}

// ─── Role Assignment ─────────────────────────────────────────

export interface RoleAssignment {
  readonly identityId: IdentityId;
  readonly roleId: RoleId;
  readonly assignedAt: Timestamp;
  readonly assignedBy: Identifier;
  readonly scope: PolicyScope;
  readonly expiresAt?: Timestamp;
}

// ─── Identity Stats ──────────────────────────────────────────

export interface IdentityStats {
  readonly activeIdentities: number;
  readonly totalPreferences: number;
  readonly policyEvaluations: number;
  readonly organizationCount: number;
  readonly teamCount: number;
  readonly roleAssignments: number;
  readonly resolverCacheHitRatio: number;
}

// ─── Serializable DTOs ────────────────────────────────────────

export interface SerializableIdentity {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: number;
  readonly status: string;
  readonly ownerType: string;
  readonly ownerId: string;
  readonly metadata: Record<string, unknown>;
}

export interface SerializableProfile {
  readonly id: string;
  readonly identityId: string;
  readonly language: string;
  readonly timezone: string;
  readonly locale: string;
  readonly country: string;
  readonly region: string;
  readonly units: string;
  readonly dateFormat: string;
  readonly currency: string;
  readonly accessibility: Record<string, unknown>;
  readonly updatedAt: Timestamp;
}

export interface SerializablePreferenceEntry {
  readonly id: string;
  readonly key: string;
  readonly value: unknown;
  readonly source: string;
  readonly confidence: number;
  readonly updatedAt: Timestamp;
}

export interface SerializableOrganization {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly departments: readonly string[];
  readonly policies: readonly string[];
  readonly members: readonly string[];
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: number;
}

export interface SerializableTeam {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly organizationId: string;
  readonly members: readonly string[];
  readonly policies: readonly string[];
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: number;
}

export interface SerializableRole {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly permissions: readonly string[];
  readonly capabilities: readonly string[];
  readonly restrictions: readonly string[];
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: number;
}

export interface SerializablePolicy {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly rules: readonly SerializablePolicyRule[];
  readonly scope: string;
  readonly priority: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: number;
}

export interface SerializablePolicyRule {
  readonly id: string;
  readonly resource: string;
  readonly action: string;
  readonly effect: string;
  readonly conditions: Record<string, unknown>;
}

export interface SerializablePreferenceSnapshot {
  readonly id: string;
  readonly identityId: string;
  readonly preferences: readonly SerializablePreferenceEntry[];
  readonly createdAt: Timestamp;
  readonly version: number;
  readonly description: string;
}

// ─── Serialization Helpers ───────────────────────────────────

export function serializeIdentity(identity: Identity): SerializableIdentity {
  return {
    id: identity.id,
    name: identity.name,
    description: identity.description,
    createdAt: identity.createdAt,
    updatedAt: identity.updatedAt,
    version: identity.version,
    status: identity.status,
    ownerType: identity.ownerType,
    ownerId: identity.ownerId,
    metadata: { ...identity.metadata },
  };
}

export function deserializeIdentity(data: SerializableIdentity): Identity {
  return Object.freeze({
    id: brandIdentityId(data.id),
    name: data.name,
    description: data.description,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    version: data.version,
    status: data.status as IdentityState,
    ownerType: data.ownerType as OwnerType,
    ownerId: data.ownerId,
    metadata: Object.freeze({ ...data.metadata }),
  }) as Identity;
}

export function serializeProfile(profile: IdentityProfile): SerializableProfile {
  return {
    id: profile.id,
    identityId: profile.identityId,
    language: profile.language,
    timezone: profile.timezone,
    locale: profile.locale,
    country: profile.country,
    region: profile.region,
    units: profile.units,
    dateFormat: profile.dateFormat,
    currency: profile.currency,
    accessibility: { ...profile.accessibility },
    updatedAt: profile.updatedAt,
  };
}

export function deserializeProfile(data: SerializableProfile): IdentityProfile {
  return Object.freeze({
    id: brandProfileId(data.id),
    identityId: brandIdentityId(data.identityId),
    language: data.language,
    timezone: data.timezone,
    locale: data.locale,
    country: data.country,
    region: data.region,
    units: data.units,
    dateFormat: data.dateFormat,
    currency: data.currency,
    accessibility: Object.freeze({ ...data.accessibility }),
    updatedAt: data.updatedAt,
  }) as IdentityProfile;
}

export function serializePreferenceEntry(entry: PreferenceEntry): SerializablePreferenceEntry {
  return {
    id: entry.id,
    key: entry.key,
    value: entry.value,
    source: entry.source,
    confidence: entry.confidence,
    updatedAt: entry.updatedAt,
  };
}

export function deserializePreferenceEntry(data: SerializablePreferenceEntry): PreferenceEntry {
  return Object.freeze({
    id: brandPreferenceId(data.id),
    key: data.key as PreferenceKey,
    value: data.value,
    source: data.source as PreferenceSource,
    confidence: data.confidence,
    updatedAt: data.updatedAt,
  }) as PreferenceEntry;
}

export function serializeOrganization(org: Organization): SerializableOrganization {
  return {
    id: org.id,
    name: org.name,
    description: org.description,
    departments: org.departments,
    policies: org.policies as readonly string[],
    members: org.members as readonly string[],
    metadata: { ...org.metadata },
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
    version: org.version,
  };
}

export function deserializeOrganization(data: SerializableOrganization): Organization {
  return Object.freeze({
    id: brandOrganizationId(data.id),
    name: data.name,
    description: data.description,
    departments: data.departments,
    policies: data.policies.map(brandPolicyId),
    members: data.members.map(brandIdentityId),
    metadata: Object.freeze({ ...data.metadata }),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    version: data.version,
  }) as Organization;
}

export function serializeTeam(team: Team): SerializableTeam {
  return {
    id: team.id,
    name: team.name,
    description: team.description,
    organizationId: team.organizationId,
    members: team.members as readonly string[],
    policies: team.policies as readonly string[],
    metadata: { ...team.metadata },
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
    version: team.version,
  };
}

export function deserializeTeam(data: SerializableTeam): Team {
  return Object.freeze({
    id: brandTeamId(data.id),
    name: data.name,
    description: data.description,
    organizationId: brandOrganizationId(data.organizationId),
    members: data.members.map(brandIdentityId),
    policies: data.policies.map(brandPolicyId),
    metadata: Object.freeze({ ...data.metadata }),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    version: data.version,
  }) as Team;
}

export function serializeRole(role: Role): SerializableRole {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions as readonly string[],
    capabilities: role.capabilities,
    restrictions: role.restrictions,
    metadata: { ...role.metadata },
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
    version: role.version,
  };
}

export function deserializeRole(data: SerializableRole): Role {
  return Object.freeze({
    id: brandRoleId(data.id),
    name: data.name,
    description: data.description,
    permissions: data.permissions.map(brandPermissionId),
    capabilities: data.capabilities,
    restrictions: data.restrictions,
    metadata: Object.freeze({ ...data.metadata }),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    version: data.version,
  }) as Role;
}

export function serializePolicy(policy: Policy): SerializablePolicy {
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description,
    rules: policy.rules.map(serializePolicyRule),
    scope: policy.scope,
    priority: policy.priority,
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
    version: policy.version,
  };
}

export function deserializePolicy(data: SerializablePolicy): Policy {
  return Object.freeze({
    id: brandPolicyId(data.id),
    name: data.name,
    description: data.description,
    rules: Object.freeze(data.rules.map(deserializePolicyRule)),
    scope: data.scope as PolicyScope,
    priority: data.priority,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    version: data.version,
  }) as Policy;
}

export function serializePolicyRule(rule: PolicyRule): SerializablePolicyRule {
  return {
    id: rule.id,
    resource: rule.resource,
    action: rule.action,
    effect: rule.effect,
    conditions: { ...rule.conditions },
  };
}

export function deserializePolicyRule(data: SerializablePolicyRule): PolicyRule {
  return Object.freeze({
    id: data.id,
    resource: data.resource,
    action: data.action,
    effect: data.effect as PolicyEffect,
    conditions: Object.freeze({ ...data.conditions }),
  }) as PolicyRule;
}

export function serializePreferenceSnapshot(snapshot: PreferenceSnapshot): SerializablePreferenceSnapshot {
  return {
    id: snapshot.id,
    identityId: snapshot.identityId,
    preferences: snapshot.preferences.map(serializePreferenceEntry),
    createdAt: snapshot.createdAt,
    version: snapshot.version,
    description: snapshot.description,
  };
}

export function deserializePreferenceSnapshot(data: SerializablePreferenceSnapshot): PreferenceSnapshot {
  return Object.freeze({
    id: brandPreferenceSnapshotId(data.id),
    identityId: brandIdentityId(data.identityId),
    preferences: Object.freeze(data.preferences.map(deserializePreferenceEntry)),
    createdAt: data.createdAt,
    version: data.version,
    description: data.description,
  }) as PreferenceSnapshot;
}
