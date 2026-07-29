/**
 * Capability Runtime — Types, Enums, Interfaces
 * TASK-AIS-003G.000 — Capability Runtime & Domain Pack SDK
 *
 * Core type definitions for the Capability Runtime:
 *   - Branded identifiers
 *   - Enums (CapabilityState, TrustLevel, etc.)
 *   - Domain entities (CapabilityPack, CapabilityManifest, etc.)
 *   - Interfaces (contracts, permissions, storage)
 *
 * Conforms to: CON-001.000, ARC-001.001, DOM-002.000, ADR-001..014
 */

import type { Timestamp, Identifier, SemVer } from '../types/common.js';

export type { Timestamp, SemVer };


// ═══════════════════════════════════════════════════════════════════
// BRANDED IDENTIFIERS
// ═══════════════════════════════════════════════════════════════════

export type CapabilityId = Identifier & { readonly __brand: 'CapabilityId' };
export type CapabilityPackId = Identifier & { readonly __brand: 'CapabilityPackId' };
export type ManifestId = Identifier & { readonly __brand: 'ManifestId' };
export type CapabilityVersionId = Identifier & { readonly __brand: 'CapabilityVersionId' };

function brandCapabilityId(id: string): CapabilityId { return id as CapabilityId; }
function brandCapabilityPackId(id: string): CapabilityPackId { return id as CapabilityPackId; }
function brandManifestId(id: string): ManifestId { return id as ManifestId; }
function brandCapabilityVersionId(id: string): CapabilityVersionId { return id as CapabilityVersionId; }

export { brandCapabilityId, brandCapabilityPackId, brandManifestId, brandCapabilityVersionId };

// ═══════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════

/**
 * Capability Pack lifecycle states.
 * FSM: Registered → Validated → Loaded → Initialized → Active ↔ Suspended → Disabled → Removed
 */
export enum CapabilityState {
  Registered = 'Registered',
  Validated = 'Validated',
  Loaded = 'Loaded',
  Initialized = 'Initialized',
  Active = 'Active',
  Suspended = 'Suspended',
  Disabled = 'Disabled',
  Removed = 'Removed',
}

/**
 * Trust level assigned to a capability pack.
 * Determines sandbox isolation strength and permission scope.
 */
export enum CapabilityTrustLevel {
  Core = 'Core',
  Trusted = 'Trusted',
  Verified = 'Verified',
  Community = 'Community',
  Untrusted = 'Untrusted',
}

/**
 * Type of permission a pack can request.
 */
export enum CapabilityPermissionType {
  Memory = 'Memory',
  Knowledge = 'Knowledge',
  Tool = 'Tool',
  Execution = 'Execution',
  Identity = 'Identity',
  Workflow = 'Workflow',
}

/**
 * Access level for a permission (read/write/admin).
 */
export enum CapabilityAccessLevel {
  Read = 'Read',
  Write = 'Write',
  Admin = 'Admin',
}

/**
 * Validation severity levels.
 */
export enum ValidationSeverity {
  Error = 'Error',
  Warning = 'Warning',
  Info = 'Info',
}

/**
 * Pack status for quick queries.
 */
export enum PackStatus {
  Installed = 'Installed',
  Enabled = 'Enabled',
  Disabled = 'Disabled',
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — MANIFEST
// ═══════════════════════════════════════════════════════════════════

/**
 * Capability Manifest — the declaration of a Capability Pack.
 * Contains metadata, dependencies, interfaces, permissions, and trust level.
 * Must be provided during pack registration (usually from manifest.json).
 */
export interface CapabilityManifest {
  readonly id: ManifestId;
  readonly packId: CapabilityPackId;
  readonly name: string;
  readonly version: SemVer;
  readonly description: string;
  readonly author: string;
  readonly license: string;
  readonly homepage?: string;
  readonly repository?: string;
  readonly keywords: readonly string[];
  readonly dependencies: readonly CapabilityDependency[];
  readonly interfaces: readonly CapabilityInterface[];
  readonly permissions: readonly CapabilityPermission[];
  readonly trustLevel: CapabilityTrustLevel;
  readonly policies: readonly CapabilityPolicy[];
  readonly exports: readonly CapabilityExport[];
  readonly checksum: string;
  readonly signature?: string;
  readonly coreVersion?: SemVer;
  readonly runtimeVersion?: SemVer;
  readonly apiVersion?: SemVer;
  readonly adrVersion?: SemVer;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * A dependency declared by a pack on another pack.
 */
export interface CapabilityDependency {
  readonly packId: CapabilityPackId;
  readonly name: string;
  readonly version: SemVer;
  readonly optional: boolean;
  readonly reason: string;
}

/**
 * An interface exposed or required by a pack.
 */
export interface CapabilityInterface {
  readonly name: string;
  readonly version: SemVer;
  readonly description: string;
  readonly methods: readonly string[];
}

/**
 * A permission requested by a pack on a core subsystem.
 */
export interface CapabilityPermission {
  readonly type: CapabilityPermissionType;
  readonly access: CapabilityAccessLevel;
  readonly resource: string;
  readonly description: string;
}

/**
 * A policy declared by a pack governing its own behavior.
 */
export interface CapabilityPolicy {
  readonly name: string;
  readonly description: string;
  readonly rules: readonly CapabilityPolicyRule[];
}

export interface CapabilityPolicyRule {
  readonly resource: string;
  readonly action: string;
  readonly condition?: string;
  readonly effect: 'allow' | 'deny';
}

/**
 * An export declared by a pack (capabilities it provides to other packs).
 */
export interface CapabilityExport {
  readonly name: string;
  readonly type: string;
  readonly description: string;
  readonly version: SemVer;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — CAPABILITY PACK
// ═══════════════════════════════════════════════════════════════════

/**
 * Capability Pack — a registered pack instance in the runtime.
 * Immutable snapshot of the pack's state at a given version.
 */
export interface CapabilityPack {
  readonly id: CapabilityPackId;
  readonly name: string;
  readonly state: CapabilityState;
  readonly manifest: CapabilityManifest;
  readonly installedAt: Timestamp;
  readonly activatedAt: Timestamp | null;
  readonly version: number;
  readonly error: Readonly<CapabilityPackError> | null;
  readonly capabilities: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Error information associated with a pack (validation, compatibility, etc.)
 */
export interface CapabilityPackError {
  readonly code: string;
  readonly message: string;
  readonly details: readonly string[];
  readonly occurredAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES — CAPABILITY INSTANCE (Runtime Representation)
// ═══════════════════════════════════════════════════════════════════

/**
 * The runtime representation of an active capability pack instance.
 * Holds the contract implementation and sandbox context.
 */
export interface CapabilityInstance {
  readonly packId: CapabilityPackId;
  readonly state: CapabilityState;
  readonly contract: CapabilityContract;
  readonly context: CapabilityContext;
  readonly permissions: ReadonlyMap<string, CapabilityPermission>;
  readonly activatedAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════
// CONTRACTS
// ═══════════════════════════════════════════════════════════════════

/**
 * Capability Contract — every pack MUST implement this interface.
 * The runtime calls these lifecycle methods.
 */
export interface CapabilityContract {
  readonly initialize: (context: CapabilityContext) => Promise<void>;
  readonly shutdown: () => Promise<void>;
  readonly health: () => Promise<CapabilityHealthResult>;
  readonly metadata: () => CapabilityContractMetadata;
  readonly capabilities: () => readonly string[];
}

export interface CapabilityHealthResult {
  readonly healthy: boolean;
  readonly details?: string;
  readonly checkedAt: Timestamp;
}

export interface CapabilityContractMetadata {
  readonly name: string;
  readonly version: SemVer;
  readonly description: string;
  readonly capabilities: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════
// CAPABILITY CONTEXT (Sandbox Context)
// ═══════════════════════════════════════════════════════════════════

/**
 * Context provided to a capability pack at initialization.
 * The pack's only interface to core runtimes — enforced by the sandbox.
 */
export interface CapabilityContext {
  readonly packId: CapabilityPackId;
  readonly packName: string;
  readonly trustLevel: CapabilityTrustLevel;
  readonly permissions: ReadonlyMap<string, CapabilityPermission>;
  readonly logger: CapabilityLogger;
  readonly emit: (eventType: string, payload: unknown) => Promise<void>;
  readonly requestPermission: (type: CapabilityPermissionType, access: CapabilityAccessLevel, resource: string) => Promise<boolean>;
  readonly getConfiguration: (key: string) => unknown | undefined;
  readonly getState: () => Readonly<Record<string, unknown>>;
  readonly setState: (key: string, value: unknown) => Promise<void>;
}

/**
 * Logger provided to each pack for sandboxed logging.
 */
export interface CapabilityLogger {
  readonly debug: (message: string, ...args: unknown[]) => void;
  readonly info: (message: string, ...args: unknown[]) => void;
  readonly warn: (message: string, ...args: unknown[]) => void;
  readonly error: (message: string, ...args: unknown[]) => void;
}

// ═══════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════

export interface ValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly severity: ValidationSeverity;
  readonly field?: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
}

// ═══════════════════════════════════════════════════════════════════
// DEPENDENCY RESOLUTION
// ═══════════════════════════════════════════════════════════════════

export interface DependencyNode {
  readonly packId: CapabilityPackId;
  readonly name: string;
  readonly version: SemVer;
  readonly dependencies: readonly CapabilityDependency[];
}

export interface DependencyResolutionResult {
  readonly resolved: boolean;
  readonly order: readonly CapabilityPackId[];
  readonly cycles: readonly DependencyCycle[];
  readonly missing: readonly CapabilityDependency[];
  readonly conflicts: readonly DependencyConflict[];
}

export interface DependencyCycle {
  readonly packIds: readonly CapabilityPackId[];
  readonly description: string;
}

export interface DependencyConflict {
  readonly packId: CapabilityPackId;
  readonly requiredVersion: SemVer;
  readonly installedVersion: SemVer;
  readonly description: string;
}

// ═══════════════════════════════════════════════════════════════════
// COMPATIBILITY
// ═══════════════════════════════════════════════════════════════════

export interface CompatibilityCheckResult {
  readonly compatible: boolean;
  readonly issues: readonly ValidationIssue[];
}

export interface CompatibilityRequirements {
  readonly coreVersion?: SemVer;
  readonly runtimeVersion?: SemVer;
  readonly apiVersion?: SemVer;
  readonly adrVersion?: SemVer;
}

// ═══════════════════════════════════════════════════════════════════
// SANDBOX
// ═══════════════════════════════════════════════════════════════════

export interface SandboxViolation {
  readonly packId: CapabilityPackId;
  readonly action: string;
  readonly resource: string;
  readonly reason: string;
  readonly occurredAt: Timestamp;
}

export interface SandboxConfig {
  readonly maxExecutionTimeMs?: number;
  readonly maxMemoryMB?: number;
  readonly allowedHosts?: readonly string[];
  readonly denyList?: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════════════

export interface CapabilityStorageAdapter {
  savePack(pack: CapabilityPack): Promise<void>;
  loadPack(packId: CapabilityPackId): Promise<CapabilityPack | null>;
  deletePack(packId: CapabilityPackId): Promise<boolean>;
  listPacks(): Promise<readonly CapabilityPack[]>;
  saveManifest(manifest: CapabilityManifest): Promise<void>;
  loadManifest(packId: CapabilityPackId): Promise<CapabilityManifest | null>;
}

// ═══════════════════════════════════════════════════════════════════
// METRICS
// ═══════════════════════════════════════════════════════════════════

export interface CapabilityMetrics {
  readonly totalPacks: number;
  readonly activePacks: number;
  readonly disabledPacks: number;
  readonly suspendedPacks: number;
  readonly totalCapabilities: number;
  readonly validationChecks: number;
  readonly dependencyResolutions: number;
  readonly sandboxViolations: number;
  readonly permissionRequests: number;
  readonly permissionGrants: number;
  readonly permissionDenials: number;
  readonly eventsPublished: number;
}

// ═══════════════════════════════════════════════════════════════════
// SDK TYPES
// ═══════════════════════════════════════════════════════════════════

export interface CapabilityBuilderConfig {
  readonly name: string;
  readonly version: SemVer;
  readonly description: string;
  readonly author: string;
  readonly license?: string;
  readonly trustLevel?: CapabilityTrustLevel;
  readonly dependencies?: readonly CapabilityDependency[];
  readonly permissions?: readonly CapabilityPermission[];
  readonly policies?: readonly CapabilityPolicy[];
}

export interface GeneratedPackTemplate {
  readonly name: string;
  readonly files: ReadonlyMap<string, string>;
}
