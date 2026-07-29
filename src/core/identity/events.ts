/**
 * Identity Module — Domain Events
 * TASK-AIS-003F.000
 *
 * Events published by the identity runtime following ADR-002 (Event Bus).
 * All events extend DomainEventBase and carry typed payloads.
 * INV-012: No domain event without a classification.
 *
 * Conforms to: ADR-002 (Event Bus), ARC-001.001 FP-07
 */
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { Timestamp } from '../types/common.js';

// ─── IdentityCreated ─────────────────────────────────────────
// Classification: StateChange — a new identity was created
export interface IdentityCreated extends DomainEventBase {
  readonly eventType: 'IdentityCreated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly identityId: string;
    readonly name: string;
    readonly ownerType: string;
    readonly createdAt: Timestamp;
  };
}

// ─── IdentityActivated ──────────────────────────────────────
// Classification: StateChange — identity was activated
export interface IdentityActivated extends DomainEventBase {
  readonly eventType: 'IdentityActivated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly identityId: string;
    readonly activatedAt: Timestamp;
  };
}

// ─── IdentityArchived ───────────────────────────────────────
// Classification: StateChange — identity was archived
export interface IdentityArchived extends DomainEventBase {
  readonly eventType: 'IdentityArchived';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly identityId: string;
    readonly archivedAt: Timestamp;
    readonly reason: string;
  };
}

// ─── IdentityStateChanged ───────────────────────────────────
// Classification: StateChange — identity transitioned between states
export interface IdentityStateChanged extends DomainEventBase {
  readonly eventType: 'IdentityStateChanged';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly identityId: string;
    readonly fromState: string;
    readonly toState: string;
    readonly changedAt: Timestamp;
  };
}

// ─── ProfileCreated ─────────────────────────────────────────
// Classification: StateChange — an identity profile was created
export interface ProfileCreated extends DomainEventBase {
  readonly eventType: 'ProfileCreated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly profileId: string;
    readonly identityId: string;
    readonly language: string;
    readonly timezone: string;
    readonly createdAt: Timestamp;
  };
}

// ─── IdentityProfileUpdated ────────────────────────────────
// Classification: StateChange — an identity profile was modified
export interface IdentityProfileUpdated extends DomainEventBase {
  readonly eventType: 'IdentityProfileUpdated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly profileId: string;
    readonly identityId: string;
    readonly changedAttributes: readonly string[];
    readonly updatedAt: Timestamp;
  };
}

// ─── PreferenceChanged ──────────────────────────────────────
// Classification: StateChange — a preference was modified
export interface PreferenceChanged extends DomainEventBase {
  readonly eventType: 'PreferenceChanged';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly preferenceId: string;
    readonly key: string;
    readonly oldValue: unknown;
    readonly newValue: unknown;
    readonly source: string;
    readonly changedAt: Timestamp;
  };
}

// ─── PreferenceResolved ────────────────────────────────────
// Classification: Info — a preference was resolved through the hierarchy
export interface PreferenceResolved extends DomainEventBase {
  readonly eventType: 'PreferenceResolved';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly key: string;
    readonly resolvedValue: unknown;
    readonly resolvedSource: string;
    readonly resolvedAt: Timestamp;
  };
}

// ─── PreferenceSnapshotCreated ───────────────────────────────
// Classification: Info — a preference snapshot was captured
export interface PreferenceSnapshotCreated extends DomainEventBase {
  readonly eventType: 'PreferenceSnapshotCreated';
  readonly classification: EventClassification.Info;
  readonly payload: {
    readonly snapshotId: string;
    readonly identityId: string;
    readonly preferenceCount: number;
    readonly createdAt: Timestamp;
  };
}

// ─── PreferenceRestored ────────────────────────────────────
// Classification: StateChange — preferences were restored from a snapshot
export interface PreferenceRestored extends DomainEventBase {
  readonly eventType: 'PreferenceRestored';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly snapshotId: string;
    readonly identityId: string;
    readonly restoredAt: Timestamp;
  };
}

// ─── OrganizationCreated ────────────────────────────────────
// Classification: StateChange — an organization was created
export interface OrganizationCreated extends DomainEventBase {
  readonly eventType: 'OrganizationCreated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly organizationId: string;
    readonly name: string;
    readonly createdAt: Timestamp;
  };
}

// ─── TeamCreated ────────────────────────────────────────────
// Classification: StateChange — a team was created
export interface TeamCreated extends DomainEventBase {
  readonly eventType: 'TeamCreated';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly teamId: string;
    readonly name: string;
    readonly organizationId: string;
    readonly createdAt: Timestamp;
  };
}

// ─── RoleAssigned ───────────────────────────────────────────
// Classification: StateChange — a role was assigned to an identity
export interface RoleAssigned extends DomainEventBase {
  readonly eventType: 'RoleAssigned';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly identityId: string;
    readonly roleId: string;
    readonly assignedAt: Timestamp;
    readonly assignedBy: string;
  };
}

// ─── RoleRevoked ───────────────────────────────────────────
// Classification: StateChange — a role was revoked from an identity
export interface RoleRevoked extends DomainEventBase {
  readonly eventType: 'RoleRevoked';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly identityId: string;
    readonly roleId: string;
    readonly revokedAt: Timestamp;
    readonly revokedBy: string;
  };
}

// ─── PolicyChanged ─────────────────────────────────────────
// Classification: StateChange — a policy was created or modified
export interface PolicyChanged extends DomainEventBase {
  readonly eventType: 'PolicyChanged';
  readonly classification: EventClassification.StateChange;
  readonly payload: {
    readonly policyId: string;
    readonly name: string;
    readonly scope: string;
    readonly changedAt: Timestamp;
  };
}

// ─── Union type ──────────────────────────────────────────────
export type IdentityEvent =
  | IdentityCreated
  | IdentityActivated
  | IdentityArchived
  | IdentityStateChanged
  | ProfileCreated
  | IdentityProfileUpdated
  | PreferenceChanged
  | PreferenceResolved
  | PreferenceSnapshotCreated
  | PreferenceRestored
  | OrganizationCreated
  | TeamCreated
  | RoleAssigned
  | RoleRevoked
  | PolicyChanged;

/**
 * Create an identity event envelope helper.
 * Used by IdentityRuntime to publish consistent events.
 * Follows the same pattern as tool/events.ts createToolEventBase.
 */
export function createIdentityEventBase(
  eventType: string,
  classification: EventClassification,
  aggregateId: string,
): { eventId: string; eventType: string; classification: EventClassification; timestamp: string; aggregateId: string; aggregateType: string } {
  return {
    eventId: crypto.randomUUID(),
    eventType,
    classification,
    timestamp: new Date().toISOString(),
    aggregateId,
    aggregateType: 'Identity',
  };
}
