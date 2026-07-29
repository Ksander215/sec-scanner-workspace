/**
 * Capability Runtime — Main Orchestrator
 * TASK-AIS-003G.000 — Capability Runtime & Domain Pack SDK
 *
 * The central runtime for managing capability packs.
 * Responsibilities:
 *   - Register, validate, load, initialize, activate, suspend, disable, remove packs
 *   - Resolve dependencies and check compatibility
 *   - Enforce sandbox isolation
 *   - Manage pack lifecycle FSM
 *   - Publish domain events via EventBus
 *   - Collect runtime metrics
 *   - Persist pack state
 *
 * Conforms to: ARC-001.001, ADR-002, DOM-002.000
 */

import type { Timestamp } from '../types/common.js';
import type { EventBus } from '../events/event-bus.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { StateMachine } from '../fsm/state-machine.js';

import type {
  CapabilityPack,
  CapabilityPackId,
  CapabilityManifest,
  CapabilityContract,
  CapabilityContext,
  CapabilityPermission,
  CapabilityLogger,
  CapabilityMetrics,
  CapabilityStorageAdapter,
  CompatibilityRequirements,
  SandboxConfig,
  DependencyResolutionResult,
  CapabilityState,
  CapabilityTrustLevel,
  CapabilityHealthResult,
} from './types.js';
import {
  CapabilityState as CS,
} from './types.js';

import { CapabilityRegistry } from './capability-registry.js';
import { CapabilityValidator } from './capability-validator.js';
import { DependencyResolver } from './dependency-resolver.js';
import { CompatibilityChecker } from './compatibility-checker.js';
import { CapabilitySandbox } from './capability-sandbox.js';
import { CapabilityMetricsCollector } from './capability-metrics.js';
import { InMemoryCapabilityStorage } from './capability-storage.js';
import { createCapabilityFSM } from './capability-fsm.js';

import {
  CapabilityError,
  CapabilityPackNotFoundError,
  CapabilityPackDuplicateError,
  CapabilityValidationError,
  CapabilityDependencyError,
  CapabilityCompatibilityError,
  CapabilityDisposedError,
} from './errors.js';

// ═══════════════════════════════════════════════════════════════════
// BRANDED IDENTIFIERS (re-export from types)
// ═══════════════════════════════════════════════════════════════════

export { brandCapabilityId, brandCapabilityPackId, brandManifestId } from './types.js';

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

export interface CapabilityRuntimeConfig {
  readonly eventBus?: EventBus;
  readonly storage?: CapabilityStorageAdapter;
  readonly systemVersions?: CompatibilityRequirements;
  readonly sandboxConfig?: SandboxConfig;
  readonly maxPacks?: number;
  readonly checksumVerification?: boolean;
  readonly trustLevelDefault?: CapabilityTrustLevel;
  readonly auditEnabled?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// CAPABILITY RUNTIME
// ═══════════════════════════════════════════════════════════════════

export class CapabilityRuntime {
  readonly name = 'CapabilityRuntime';

  // ─── Internal components ──────────────────────────────────────
  private readonly registry: CapabilityRegistry;
  private readonly validator: CapabilityValidator;
  private readonly dependencyResolver: DependencyResolver;
  private readonly compatibilityChecker: CompatibilityChecker;
  private readonly sandbox: CapabilitySandbox;
  private readonly metrics: CapabilityMetricsCollector;
  private readonly storage: CapabilityStorageAdapter;

  // ─── State ───────────────────────────────────────────────────
  private readonly fsms = new Map<string, StateMachine<CapabilityState>>();
  private readonly contracts = new Map<string, CapabilityContract>();
  private readonly contexts = new Map<string, CapabilityContext>();
  private readonly packState = new Map<string, CapabilityPack>();
  private _disposed = false;
  private readonly config: CapabilityRuntimeConfig;
  private readonly eventBus: EventBus | null;

  constructor(config: CapabilityRuntimeConfig = {}) {
    this.config = config;
    this.eventBus = config.eventBus ?? null;
    this.registry = new CapabilityRegistry();
    this.validator = new CapabilityValidator();
    this.dependencyResolver = new DependencyResolver();
    this.compatibilityChecker = new CompatibilityChecker(
      config.systemVersions ?? { coreVersion: '0.3.0', runtimeVersion: '0.3.0', apiVersion: '0.3.0', adrVersion: '1.0.0' },
    );
    this.sandbox = new CapabilitySandbox(config.sandboxConfig);
    this.metrics = new CapabilityMetricsCollector();
    this.storage = config.storage ?? new InMemoryCapabilityStorage();
  }

  // ─── Public getters ──────────────────────────────────────────

  get isDisposed(): boolean { return this._disposed; }
  get packCount(): number { return this.registry.count; }
  get capabilitiesRegistry(): CapabilityRegistry { return this.registry; }
  get capabilitySandbox(): CapabilitySandbox { return this.sandbox; }
  get metricsCollector(): CapabilityMetricsCollector { return this.metrics; }

  // ═════════════════════════════════════════════════════════════════
  // PACK LIFECYCLE
  // ═════════════════════════════════════════════════════════════════

  /**
   * Install a new capability pack from its manifest.
   * State: → Registered
   */
  async installPack(
    manifest: CapabilityManifest,
    contract?: CapabilityContract,
  ): Promise<CapabilityPack> {
    this.assertNotDisposed();

    // Check limits
    const maxPacks = this.config.maxPacks ?? 10_000;
    if (this.registry.count >= maxPacks) {
      throw new CapabilityError('Maximum pack count reached', 'CAPABILITY_LIMIT_REACHED');
    }

    // Check duplicate
    if (this.registry.hasByName(manifest.name)) {
      throw new CapabilityPackDuplicateError(manifest.name);
    }

    // Validate manifest
    const manifestResult = this.validator.validateManifest(manifest);
    this.metrics.incrementValidationChecks();
    if (!manifestResult.valid) {
      throw new CapabilityValidationError(manifest.name, manifestResult.issues.map(i => i.message));
    }

    // Validate contract if provided
    if (contract) {
      const contractResult = this.validator.validateContract(contract, manifest.name);
      if (!contractResult.valid) {
        throw new CapabilityValidationError(manifest.name, contractResult.issues.map(i => i.message));
      }
    }

    // Check compatibility
    const compatResult = this.compatibilityChecker.check(manifest);
    if (!compatResult.compatible) {
      await this.publishEvent({
        eventType: 'CapabilityCompatibilityFailed',
        classification: EventClassification.Error,
        payload: {
          packId: manifest.packId,
          name: manifest.name,
          issues: compatResult.issues.map(i => i.message),
          failedAt: new Date().toISOString(),
        },
      });
      throw new CapabilityCompatibilityError(manifest.name, compatResult.issues.map(i => i.message));
    }

    const now = new Date().toISOString() as Timestamp;

    // Create pack entity
    const pack: CapabilityPack = Object.freeze({
      id: manifest.packId,
      name: manifest.name,
      state: CS.Registered,
      manifest,
      installedAt: now,
      activatedAt: null,
      version: 1,
      error: null,
      capabilities: contract?.capabilities() ?? [],
      metadata: Object.freeze({}),
    });

    // Register
    this.registry.register(pack);
    this.packState.set(pack.id as unknown as string, pack);
    this.registry.saveManifest(manifest);
    this.fsms.set(pack.id as unknown as string, createCapabilityFSM());
    if (contract) {
      this.contracts.set(pack.id as unknown as string, contract);
    }

    // Persist
    await this.storage.savePack(pack);
    await this.storage.saveManifest(manifest);

    // Metrics
    this.metrics.incrementTotalPacks();
    if (contract) {
      this.metrics.addCapabilities(contract.capabilities().length);
    }

    // Event
    await this.publishEvent({
      eventType: 'CapabilityInstalled',
      classification: EventClassification.StateChange,
      payload: {
        packId: pack.id,
        name: pack.name,
        version: manifest.version,
        trustLevel: manifest.trustLevel,
        installedAt: now,
      },
    });

    return pack;
  }

  /**
   * Validate an installed pack.
   * State: Registered → Validated
   */
  async validatePack(packId: CapabilityPackId): Promise<void> {
    this.assertNotDisposed();

    const pack = this.getPackOrThrow(packId);
    const key = packId as unknown as string;
    const fsm = this.getFSMOrThrow(packId);

    // Must be in Registered state
    if (!fsm.canTransition(CS.Validated)) {
      throw new CapabilityError(
        `Cannot validate pack "${pack.name}" from state "${pack.state}"`,
        'CAPABILITY_INVALID_TRANSITION',
      );
    }

    // Full validation
    const contract = this.contracts.get(key);
    const result = this.validator.validatePack(pack, contract);
    this.metrics.incrementValidationChecks();

    // Transition
    fsm.transition(CS.Validated);
    this.updatePackState(packId, CS.Validated);

    await this.publishEvent({
      eventType: 'CapabilityValidated',
      classification: EventClassification.Info,
      payload: {
        packId: pack.id,
        name: pack.name,
        valid: result.valid,
        issues: result.issues.map(i => i.message),
        validatedAt: new Date().toISOString(),
      },
    });

    if (!result.valid) {
      throw new CapabilityValidationError(pack.name, result.issues.map(i => i.message));
    }
  }

  /**
   * Load a validated pack (resolve dependencies).
   * State: Validated → Loaded
   */
  async loadPack(packId: CapabilityPackId): Promise<void> {
    this.assertNotDisposed();

    const pack = this.getPackOrThrow(packId);
    const fsm = this.getFSMOrThrow(packId);

    if (!fsm.canTransition(CS.Loaded)) {
      throw new CapabilityError(
        `Cannot load pack "${pack.name}" from state "${pack.state}"`,
        'CAPABILITY_INVALID_TRANSITION',
      );
    }

    // Resolve dependencies
    const installedMap = this.getInstalledMap();
    const depResult = this.dependencyResolver.resolve(packId, installedMap);
    this.metrics.incrementDependencyResolutions();

    if (!depResult.resolved) {
      await this.publishEvent({
        eventType: 'CapabilityDependencyFailed',
        classification: EventClassification.Error,
        payload: {
          packId: pack.id,
          name: pack.name,
          missingDependencies: depResult.missing.map(d => d.name),
          cycles: depResult.cycles.map(c => c.description),
          conflicts: depResult.conflicts.map(c => c.description),
          failedAt: new Date().toISOString(),
        },
      });

      throw new CapabilityDependencyError(
        depResult.missing.map(d => d.name),
        depResult.cycles.map(c => c.description),
        depResult.conflicts.map(c => c.description),
      );
    }

    // Transition
    fsm.transition(CS.Loaded);
    this.updatePackState(packId, CS.Loaded);

    await this.publishEvent({
      eventType: 'CapabilityLoaded',
      classification: EventClassification.StateChange,
      payload: {
        packId: pack.id,
        name: pack.name,
        loadedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Initialize a loaded pack (call contract.initialize).
   * State: Loaded → Initialized
   */
  async initializePack(packId: CapabilityPackId): Promise<void> {
    this.assertNotDisposed();

    const pack = this.getPackOrThrow(packId);
    const fsm = this.getFSMOrThrow(packId);

    if (!fsm.canTransition(CS.Initialized)) {
      throw new CapabilityError(
        `Cannot initialize pack "${pack.name}" from state "${pack.state}"`,
        'CAPABILITY_INVALID_TRANSITION',
      );
    }

    const key = packId as unknown as string;
    const contract = this.contracts.get(key);
    if (!contract) {
      throw new CapabilityError(
        `No contract found for pack "${pack.name}"`,
        'CAPABILITY_CONTRACT_MISSING',
      );
    }

    // Create sandbox context
    const permMap = this.buildPermissionMap(pack.manifest.permissions);
    const logger = this.createPackLogger(pack.name);
    const context = this.sandbox.createContext(
      packId, pack.name, pack.manifest.trustLevel,
      permMap, logger,
      async (eventType, payload) => {
        await this.publishEvent({
          eventType: 'CapabilityStateChanged',
          classification: EventClassification.Info,
          payload: { packId: pack.id, name: pack.name, eventType, payload },
        });
      },
    );
    this.contexts.set(key, context);

    // Call initialize
    try {
      await contract.initialize(context);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.publishEvent({
        eventType: 'CapabilityError',
        classification: EventClassification.Error,
        payload: {
          packId: pack.id,
          name: pack.name,
          errorCode: 'INITIALIZATION_FAILED',
          errorMessage: message,
          errorDetails: [],
          occurredAt: new Date().toISOString(),
        },
      });
      throw new CapabilityError(`Initialization failed for "${pack.name}": ${message}`, 'CAPABILITY_INIT_FAILED');
    }

    // Transition
    fsm.transition(CS.Initialized);
    this.updatePackState(packId, CS.Initialized);
  }

  /**
   * Activate an initialized pack.
   * State: Initialized → Active
   */
  async activatePack(packId: CapabilityPackId): Promise<void> {
    this.assertNotDisposed();

    const pack = this.getPackOrThrow(packId);
    const fsm = this.getFSMOrThrow(packId);

    if (!fsm.canTransition(CS.Active)) {
      throw new CapabilityError(
        `Cannot activate pack "${pack.name}" from state "${pack.state}"`,
        'CAPABILITY_INVALID_TRANSITION',
      );
    }

    const now = new Date().toISOString() as Timestamp;

    // Transition
    fsm.transition(CS.Active);
    this.updatePackStateWithActivation(packId, CS.Active, now);

    // Metrics
    this.recalculateMetrics();

    await this.publishEvent({
      eventType: 'CapabilityActivated',
      classification: EventClassification.Action,
      payload: {
        packId: pack.id,
        name: pack.name,
        capabilities: pack.capabilities,
        activatedAt: now,
      },
    });
  }

  /**
   * Suspend an active pack.
   * State: Active → Suspended
   */
  async suspendPack(packId: CapabilityPackId, reason?: string): Promise<void> {
    this.assertNotDisposed();

    const pack = this.getPackOrThrow(packId);
    const fsm = this.getFSMOrThrow(packId);

    if (!fsm.canTransition(CS.Suspended)) {
      throw new CapabilityError(
        `Cannot suspend pack "${pack.name}" from state "${pack.state}"`,
        'CAPABILITY_INVALID_TRANSITION',
      );
    }

    fsm.transition(CS.Suspended);
    this.updatePackState(packId, CS.Suspended);

    this.recalculateMetrics();

    await this.publishEvent({
      eventType: 'CapabilityStateChanged',
      classification: EventClassification.StateChange,
      payload: {
        packId: pack.id,
        name: pack.name,
        fromState: CS.Active,
        toState: CS.Suspended,
        changedAt: new Date().toISOString(),
        reason: reason ?? 'Suspended by user',
      },
    });
  }

  /**
   * Resume a suspended pack.
   * State: Suspended → Active
   */
  async resumePack(packId: CapabilityPackId): Promise<void> {
    this.assertNotDisposed();

    const pack = this.getPackOrThrow(packId);
    const fsm = this.getFSMOrThrow(packId);

    if (!fsm.canTransition(CS.Active)) {
      throw new CapabilityError(
        `Cannot resume pack "${pack.name}" from state "${pack.state}"`,
        'CAPABILITY_INVALID_TRANSITION',
      );
    }

    const now = new Date().toISOString() as Timestamp;

    fsm.transition(CS.Active);
    this.updatePackStateWithActivation(packId, CS.Active, now);

    this.recalculateMetrics();

    await this.publishEvent({
      eventType: 'CapabilityStateChanged',
      classification: EventClassification.StateChange,
      payload: {
        packId: pack.id,
        name: pack.name,
        fromState: CS.Suspended,
        toState: CS.Active,
        changedAt: now,
      },
    });
  }

  /**
   * Disable a pack (any non-terminal state → Disabled).
   */
  async disablePack(packId: CapabilityPackId, reason?: string): Promise<void> {
    this.assertNotDisposed();

    const pack = this.getPackOrThrow(packId);
    const fsm = this.getFSMOrThrow(packId);

    if (!fsm.canTransition(CS.Disabled)) {
      throw new CapabilityError(
        `Cannot disable pack "${pack.name}" from state "${pack.state}"`,
        'CAPABILITY_INVALID_TRANSITION',
      );
    }

    // Shutdown contract if active
    const key = packId as unknown as string;
    const contract = this.contracts.get(key);
    if (contract && (pack.state === CS.Active || pack.state === CS.Suspended || pack.state === CS.Initialized)) {
      try { await contract.shutdown(); } catch { /* best effort */ }
    }

    fsm.transition(CS.Disabled);
    this.updatePackState(packId, CS.Disabled);

    this.recalculateMetrics();

    await this.publishEvent({
      eventType: 'CapabilityDisabled',
      classification: EventClassification.StateChange,
      payload: {
        packId: pack.id,
        name: pack.name,
        reason: reason ?? 'Disabled by user',
        disabledAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Remove a pack (any state → Removed).
   */
  async removePack(packId: CapabilityPackId): Promise<void> {
    this.assertNotDisposed();

    const pack = this.getPackOrThrow(packId);
    const fsm = this.getFSMOrThrow(packId);

    if (!fsm.canTransition(CS.Removed)) {
      throw new CapabilityError(
        `Cannot remove pack "${pack.name}" from state "${pack.state}"`,
        'CAPABILITY_INVALID_TRANSITION',
      );
    }

    // Shutdown contract if present
    const key = packId as unknown as string;
    const contract = this.contracts.get(key);
    if (contract) {
      try { await contract.shutdown(); } catch { /* best effort */ }
    }

    fsm.transition(CS.Removed);
    this.updatePackState(packId, CS.Removed);

    // Clean up
    this.contracts.delete(key);
    this.contexts.delete(key);

    this.recalculateMetrics();
    this.metrics.decrementTotalPacks();

    await this.publishEvent({
      eventType: 'CapabilityRemoved',
      classification: EventClassification.Action,
      payload: {
        packId: pack.id,
        name: pack.name,
        removedAt: new Date().toISOString(),
      },
    });
  }

  // ═════════════════════════════════════════════════════════════════
  // QUERY OPERATIONS
  // ═════════════════════════════════════════════════════════════════

  getPack(packId: CapabilityPackId): CapabilityPack | null {
    this.assertNotDisposed();
    return this.registry.get(packId);
  }

  getPackByName(name: string): CapabilityPack | null {
    this.assertNotDisposed();
    return this.registry.getByName(name);
  }

  getPacksByState(state: CapabilityState): readonly CapabilityPack[] {
    this.assertNotDisposed();
    return this.registry.getByState(state);
  }

  getAllPacks(): readonly CapabilityPack[] {
    this.assertNotDisposed();
    return this.registry.getAll();
  }

  getActivePacks(): readonly CapabilityPack[] {
    return this.getPacksByState(CS.Active);
  }

  getMetrics(): CapabilityMetrics {
    this.assertNotDisposed();
    return this.metrics.getMetrics();
  }

  /**
   * Check health of a specific pack.
   */
  async checkPackHealth(packId: CapabilityPackId): Promise<CapabilityHealthResult> {
    this.assertNotDisposed();

    const pack = this.getPackOrThrow(packId);
    if (pack.state !== CS.Active && pack.state !== CS.Suspended && pack.state !== CS.Initialized) {
      return {
        healthy: false,
        details: `Pack is not active (state: ${pack.state})`,
        checkedAt: new Date().toISOString(),
      };
    }

    const key = packId as unknown as string;
    const contract = this.contracts.get(key);
    if (!contract) {
      return {
        healthy: false,
        details: 'No contract available',
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      return await contract.health();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        healthy: false,
        details: `Health check failed: ${message}`,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Resolve dependencies for a pack.
   */
  resolveDependencies(packId: CapabilityPackId): DependencyResolutionResult {
    this.assertNotDisposed();
    return this.dependencyResolver.resolve(packId, this.getInstalledMap());
  }

  /**
   * Resolve all dependencies in the system.
   */
  resolveAllDependencies(): DependencyResolutionResult {
    this.assertNotDisposed();
    return this.dependencyResolver.resolveAll(this.getInstalledMap());
  }

  // ═════════════════════════════════════════════════════════════════
  // SERVICE INTERFACE (Lifecycle)
  // ═════════════════════════════════════════════════════════════════

  async initialize(): Promise<void> {
    this.assertNotDisposed();
    // Load persisted packs from storage
    const packs = await this.storage.listPacks();
    for (const pack of packs) {
      this.registry.register(pack);
      this.packState.set(pack.id as unknown as string, pack);
      this.fsms.set(pack.id as unknown as string, createCapabilityFSM());
    }
  }

  async start(): Promise<void> {
    this.assertNotDisposed();
    // Packs are activated individually
  }

  async stop(): Promise<void> {
    this.assertNotDisposed();
    // Suspend all active packs
    const activePacks = this.getActivePacks();
    for (const pack of activePacks) {
      try {
        await this.suspendPack(pack.id, 'Runtime stopping');
      } catch {
        // Best effort
      }
    }
  }

  async shutdown(): Promise<void> {
    this.assertNotDisposed();
    // Disable all packs
    const allPacks = this.getAllPacks();
    for (const pack of allPacks) {
      try {
        const key = pack.id as unknown as string;
        const contract = this.contracts.get(key);
        if (contract) {
          await contract.shutdown();
        }
      } catch {
        // Best effort
      }
    }
  }

  dispose(): void {
    this._disposed = true;
    this.registry.clear();
    this.fsms.clear();
    this.contracts.clear();
    this.contexts.clear();
    this.packState.clear();
    this.sandbox.clear();
    this.metrics.reset();
  }

  // ═════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═════════════════════════════════════════════════════════════════

  private assertNotDisposed(): void {
    if (this._disposed) throw new CapabilityDisposedError();
  }

  private getPackOrThrow(packId: CapabilityPackId): CapabilityPack {
    const pack = this.registry.get(packId);
    if (!pack) throw new CapabilityPackNotFoundError(packId as unknown as string);
    return pack;
  }

  private getFSMOrThrow(packId: CapabilityPackId): StateMachine<CapabilityState> {
    const key = packId as unknown as string;
    const fsm = this.fsms.get(key);
    if (!fsm) throw new CapabilityPackNotFoundError(packId as unknown as string);
    return fsm;
  }

  private updatePackState(packId: CapabilityPackId, newState: CapabilityState): void {
    const key = packId as unknown as string;
    const existing = this.packState.get(key);
    if (!existing) return;

    const now = new Date().toISOString() as Timestamp;
    const updated: CapabilityPack = Object.freeze({
      ...existing,
      state: newState,
      version: existing.version + 1,
      metadata: Object.freeze({ ...existing.metadata, stateChangedAt: now }),
    });

    this.packState.set(key, updated);
    this.registry.updateState(packId, newState);
    void this.storage.savePack(updated);
  }

  private updatePackStateWithActivation(packId: CapabilityPackId, newState: CapabilityState, activatedAt: Timestamp): void {
    const key = packId as unknown as string;
    const existing = this.packState.get(key);
    if (!existing) return;

    const now = new Date().toISOString() as Timestamp;
    const updated: CapabilityPack = Object.freeze({
      ...existing,
      state: newState,
      activatedAt,
      version: existing.version + 1,
      metadata: Object.freeze({ ...existing.metadata, stateChangedAt: now }),
    });

    this.packState.set(key, updated);
    this.registry.updateState(packId, newState);
    void this.storage.savePack(updated);
  }

  private getInstalledMap(): ReadonlyMap<string, CapabilityPack> {
    const map = new Map<string, CapabilityPack>();
    for (const pack of this.registry.getAll()) {
      map.set(pack.id as unknown as string, pack);
    }
    return map;
  }

  private buildPermissionMap(permissions: readonly CapabilityPermission[]): ReadonlyMap<string, CapabilityPermission> {
    const map = new Map<string, CapabilityPermission>();
    for (const perm of permissions) {
      const key = `${perm.type}:${perm.access}:${perm.resource}`;
      map.set(key, perm);
    }
    return map;
  }

  private createPackLogger(packName: string): CapabilityLogger {
    return Object.freeze({
      debug: (message: string, ...args: unknown[]) => { console.debug(`[${packName}]`, message, ...args); },
      info: (message: string, ...args: unknown[]) => { console.info(`[${packName}]`, message, ...args); },
      warn: (message: string, ...args: unknown[]) => { console.warn(`[${packName}]`, message, ...args); },
      error: (message: string, ...args: unknown[]) => { console.error(`[${packName}]`, message, ...args); },
    });
  }

  private recalculateMetrics(): void {
    const allPacks = this.registry.getAll();
    let active = 0;
    let disabled = 0;
    let suspended = 0;
    let capabilities = 0;

    for (const pack of allPacks) {
      switch (pack.state) {
        case CS.Active: active++; break;
        case CS.Disabled: disabled++; break;
        case CS.Suspended: suspended++; break;
        default: break;
      }
      capabilities += pack.capabilities.length;
    }

    this.metrics.setActivePacks(active);
    this.metrics.setDisabledPacks(disabled);
    this.metrics.setSuspendedPacks(suspended);
    this.metrics.addCapabilities(0); // Total recalc
  }

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
        aggregateId: 'capability-runtime',
        aggregateType: 'Capability',
        version: '1.0.0',
        ...eventBase,
      } as unknown as DomainEventBase;
      await this.eventBus.publish(event);
      this.metrics.incrementEventsPublished();
    } catch {
      // ADR-002: Event publishing failure must not disrupt operations
    }
  }
}
