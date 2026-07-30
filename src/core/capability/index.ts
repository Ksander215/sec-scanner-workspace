/**
 * Capability Module — Public API
 * TASK-AIS-003G.000 — Capability Runtime & Domain Pack SDK
 *
 * Conforms to: CON-001.000, ARC-001.001, DOM-002.000, ADR-001..014
 *
 * Exports:
 *   - Capability Runtime (main orchestrator)
 *   - Capability types, enums, interfaces
 *   - Capability domain events
 *   - Capability error hierarchy
 *   - FSM definition
 *   - Registry, Validator, Resolver, Checker, Sandbox
 *   - SDK (Builder, Contract Factory, Manifest Generator)
 *   - Pack Generator
 *   - Persistence adapters
 *   - Metrics collector
 */

// ─── Runtime (primary export) ──────────────────────────────────
export { CapabilityRuntime } from './capability-runtime.js';
export type { CapabilityRuntimeConfig } from './capability-runtime.js';

// ─── Enums ────────────────────────────────────────────────────
export {
  CapabilityState,
  CapabilityTrustLevel,
  CapabilityPermissionType,
  CapabilityAccessLevel,
  ValidationSeverity,
  PackStatus,
} from './types.js';

// ─── Domain Entities (interfaces) ──────────────────────────────
export type {
  CapabilityPack,
  CapabilityManifest,
  CapabilityDependency,
  CapabilityInterface,
  CapabilityPermission,
  CapabilityPolicy,
  CapabilityPolicyRule,
  CapabilityExport,
  CapabilityPackError,
  CapabilityInstance,
  CapabilityContract,
  CapabilityHealthResult,
  CapabilityContractMetadata,
  CapabilityContext,
  CapabilityLogger,
  ValidationIssue,
  ValidationResult,
  DependencyNode,
  DependencyResolutionResult,
  DependencyCycle,
  DependencyConflict,
  CompatibilityCheckResult,
  CompatibilityRequirements,
  SandboxViolation,
  SandboxConfig,
  CapabilityStorageAdapter,
  CapabilityMetrics,
  CapabilityBuilderConfig,
  GeneratedPackTemplate,
} from './types.js';

// ─── Branded Identifiers ─────────────────────────────────────
export type {
  CapabilityId,
  CapabilityPackId,
  ManifestId,
  CapabilityVersionId,
} from './types.js';

// ─── Events ───────────────────────────────────────────────────
export type {
  CapabilityInstalled,
  CapabilityLoaded,
  CapabilityValidated,
  CapabilityActivated,
  CapabilityDisabled,
  CapabilityRemoved,
  CapabilityUpdated,
  CapabilityErrorEvent,
  CapabilityDependencyFailed,
  CapabilityCompatibilityFailed,
  CapabilityStateChanged,
  CapabilitySandboxViolationEvent,
  CapabilityEvent,
} from './events.js';

// ─── Errors ──────────────────────────────────────────────────
export {
  CapabilityError,
  CapabilityPackNotFoundError,
  CapabilityPackDuplicateError,
  CapabilityStateError,
  CapabilityValidationError,
  CapabilityDependencyError,
  CapabilityCompatibilityError,
  CapabilitySandboxError,
  CapabilityPermissionDeniedError,
  CapabilityManifestError,
  CapabilityContractError,
  CapabilityDisposedError,
  CapabilityChecksumError,
} from './errors.js';

// ─── Sub-components ───────────────────────────────────────────
export { CapabilityRegistry } from './capability-registry.js';
export { CapabilityValidator } from './capability-validator.js';
export { DependencyResolver } from './dependency-resolver.js';
export { CompatibilityChecker } from './compatibility-checker.js';
export { CapabilitySandbox } from './capability-sandbox.js';
export { CapabilityMetricsCollector } from './capability-metrics.js';
export {
  InMemoryCapabilityStorage,
  FileCapabilityStorage,
  SnapshotCapabilityStorage,
} from './capability-storage.js';

// ─── FSM Definition ───────────────────────────────────────────
export {
  CAPABILITY_FSM_DEFINITION,
  getCapabilityFSMDefinition,
  createCapabilityFSM,
} from './capability-fsm.js';

// ─── SDK ──────────────────────────────────────────────────────
export { CapabilityBuilder, createCapability, createContract, createManifestJson } from './capability-sdk.js';

// ─── Pack Generator ───────────────────────────────────────────
export { PackGenerator, generatePack } from './pack-generator.js';

// ─── FSM State Machine (re-export from core) ─────────────────
export type { StateMachine, FSMDefinition } from '../fsm/state-machine.js';
