/**
 * Identity Module — Public API
 * TASK-AIS-003F.000 — Identity & Preference Runtime Foundation
 *
 * Conforms to: CON-001.000, ARC-001.001, DOM-002.000, ADR-001..014
 *
 * Exports:
 *   - Identity Runtime (main orchestrator)
 *   - Identity types, enums, interfaces
 *   - Identity domain events
 *   - Identity error hierarchy
 *   - FSM definition
 */

// ─── Runtime (primary export) ──────────────────────────────────
export { IdentityRuntime } from './identity-runtime.js';
export type { IdentityRuntimeConfig } from './identity-runtime.js';

// ─── Enums ────────────────────────────────────────────────────
export {
  IdentityState,
  OwnerType,
  PreferenceKey,
  PreferenceSource,
  PolicyEffect,
} from './identity-runtime.js';

// ─── Domain Entities (interfaces) ──────────────────────────────
export type {
  Identity,
  IdentityProfile,
  PreferenceEntry,
  PreferenceHistoryEntry,
  PreferenceSnapshot,
  Organization,
  Team,
  Role,
  Permission,
  Policy,
  PolicyRule,
  RoleAssignment,
  PolicyResolutionResult,
  IdentityStats,
  SerializableIdentity,
} from './identity-runtime.js';

// ─── Branded Identifiers ─────────────────────────────────────
export type {
  IdentityId,
  OrganizationId,
  TeamId,
  RoleId,
  PermissionId,
  PolicyId,
  SnapshotId,
} from './identity-runtime.js';

// ─── Events ───────────────────────────────────────────────────
export type {
  IdentityCreated,
  IdentityActivated,
  IdentityArchived,
  IdentityStateChanged,
  ProfileCreated,
  IdentityProfileUpdated,
  PreferenceChanged,
  PreferenceResolved,
  PreferenceSnapshotCreated,
  PreferenceRestored,
  OrganizationCreated,
  TeamCreated,
  RoleAssigned,
  RoleRevoked,
  PolicyChanged,
  IdentityEvent,
} from './events.js';

// ─── Errors ──────────────────────────────────────────────────
export {
  IdentityError,
  IdentityNotFoundError,
  IdentityStateError,
  IdentityDuplicateError,
  ProfileNotFoundError,
  PreferenceNotFoundError,
  PreferenceConflictError,
  OrganizationNotFoundError,
  OrganizationDuplicateError,
  TeamNotFoundError,
  RoleNotFoundError,
  RoleCycleError,
  PolicyNotFoundError,
  PolicyConflictError,
  OrganizationCycleError,
  IdentityValidationError,
  IdentityDisposedError,
} from './errors.js';

// ─── FSM Definition ───────────────────────────────────────────
export {
  IDENTITY_FSM_DEFINITION,
  getIdentityFSMDefinition,
  createIdentityFSM,
} from './identity-fsm.js';

// ─── FSM State Machine (re-export from core) ─────────────────
export type { StateMachine, FSMDefinition } from '../fsm/state-machine.js';
