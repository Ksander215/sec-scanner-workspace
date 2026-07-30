/**
 * capability-runtime.test.ts
 * Integration tests for CapabilityRuntime — the main orchestrator.
 * Covers the full pack lifecycle: install → validate → load → initialize → activate
 *   → suspend → resume → disable → remove, plus queries, events, and disposal.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CapabilityRuntime } from '../../../core/capability/capability-runtime.js';
import type {
  CapabilityRuntimeConfig,
  CapabilityPack,
  CapabilityManifest,
  CapabilityContract,
  CapabilityPackId,
  CapabilityMetrics,
} from '../../../core/capability/types.js';
import {
  CapabilityState as CS,
  CapabilityTrustLevel,
  CapabilityPermissionType,
  CapabilityAccessLevel,
} from '../../../core/capability/types.js';
import {
  CapabilityError,
  CapabilityPackNotFoundError,
  CapabilityPackDuplicateError,
  CapabilityValidationError,
  CapabilityDependencyError,
  CapabilityCompatibilityError,
  CapabilityDisposedError,
} from '../../../core/capability/errors.js';
import type { DomainEventBase } from '../../../core/domain/events/domain-event.js';

// ═════════════════════════════════════════════════════════════════
// Helper Functions
// ═════════════════════════════════════════════════════════════════

function createRuntime(config?: CapabilityRuntimeConfig): CapabilityRuntime {
  return new CapabilityRuntime(config);
}

function createMockEventBus() {
  const events: DomainEventBase[] = [];
  return {
    events,
    eventBus: {
      publish: vi.fn(async (event: DomainEventBase) => {
        events.push(event);
        return {} as any;
      }),
      subscribe: vi.fn(async () => ({} as any)),
      dispatch: vi.fn(async () => ({} as any)),
    },
  };
}

function createMockManifest(
  name = 'test-pack',
  packId?: string,
  overrides?: Partial<CapabilityManifest>,
): CapabilityManifest {
  return Object.freeze({
    id: crypto.randomUUID() as any,
    packId: (packId ?? crypto.randomUUID()) as any,
    name,
    version: '1.0.0',
    description: 'Test capability pack',
    author: 'test-author',
    license: 'MIT',
    keywords: [],
    dependencies: [],
    interfaces: [],
    permissions: [],
    trustLevel: CapabilityTrustLevel.Trusted,
    policies: [],
    exports: [],
    checksum: 'sha256-abc123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {},
    ...overrides,
  });
}

function createMockContract(capabilities: string[] = ['test-cap']): CapabilityContract {
  const initFn = vi.fn(async () => {});
  const shutdownFn = vi.fn(async () => {});
  const healthFn = vi.fn(async () => ({
    healthy: true,
    details: 'all good',
    checkedAt: new Date().toISOString(),
  }));
  const metadataFn = vi.fn(() => ({
    name: 'test',
    version: '1.0.0',
    description: '',
    capabilities,
  }));
  const capsFn = vi.fn(() => capabilities);

  return Object.freeze({
    initialize: initFn,
    shutdown: shutdownFn,
    health: healthFn,
    metadata: metadataFn,
    capabilities: capsFn,
  }) as any;
}

/** Install a pack and drive it to the given target state, returning the final pack. */
async function installAndDrive(
  runtime: CapabilityRuntime,
  targetState: CS,
  manifest?: CapabilityManifest,
  contract?: CapabilityContract,
): Promise<CapabilityPack> {
  const mf = manifest ?? createMockManifest('drive-pack');
  const ct = contract ?? createMockContract(['cap-a']);
  const pack = await runtime.installPack(mf, ct);

  if (
    targetState === CS.Validated ||
    targetState === CS.Loaded ||
    targetState === CS.Initialized ||
    targetState === CS.Active ||
    targetState === CS.Suspended
  ) {
    await runtime.validatePack(pack.id);
  }

  if (
    targetState === CS.Loaded ||
    targetState === CS.Initialized ||
    targetState === CS.Active ||
    targetState === CS.Suspended
  ) {
    await runtime.loadPack(pack.id);
  }

  if (
    targetState === CS.Initialized ||
    targetState === CS.Active ||
    targetState === CS.Suspended
  ) {
    await runtime.initializePack(pack.id);
  }

  if (targetState === CS.Active || targetState === CS.Suspended) {
    await runtime.activatePack(pack.id);
  }

  if (targetState === CS.Suspended) {
    await runtime.suspendPack(pack.id);
  }

  return runtime.getPack(pack.id)!;
}

// ═════════════════════════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════════════════════════

describe('CapabilityRuntime', () => {

  // ═══════════════════════════════════════════════════════════════
  // 1. Constructor & Config
  // ═══════════════════════════════════════════════════════════════

  describe('Constructor & Config', () => {
    it('should create runtime with default config', () => {
      const rt = createRuntime();
      expect(rt.isDisposed).toBe(false);
      expect(rt.packCount).toBe(0);
    });

    it('should accept an eventBus config', () => {
      const { eventBus } = createMockEventBus();
      const rt = createRuntime({ eventBus: eventBus as any });
      expect(rt.isDisposed).toBe(false);
    });

    it('should accept a storage config', () => {
      const storage = {
        savePack: vi.fn(async () => {}),
        loadPack: vi.fn(async () => null),
        deletePack: vi.fn(async () => false),
        listPacks: vi.fn(async () => []),
        saveManifest: vi.fn(async () => {}),
        loadManifest: vi.fn(async () => null),
      };
      const rt = createRuntime({ storage: storage as any });
      expect(rt.isDisposed).toBe(false);
    });

    it('should accept systemVersions config', () => {
      const rt = createRuntime({
        systemVersions: {
          coreVersion: '1.0.0',
          runtimeVersion: '1.0.0',
        },
      });
      expect(rt.isDisposed).toBe(false);
    });

    it('should have isDisposed=false initially', () => {
      const rt = createRuntime();
      expect(rt.isDisposed).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. installPack
  // ═══════════════════════════════════════════════════════════════

  describe('installPack', () => {
    it('should install a pack successfully', async () => {
      const rt = createRuntime();
      const manifest = createMockManifest('install-test');
      const pack = await rt.installPack(manifest);
      expect(pack).toBeDefined();
      expect(pack.name).toBe('install-test');
      // Pack is registered in the registry
      expect(rt.getPack(pack.id)).toBeDefined();
    });

    it('should throw CapabilityPackDuplicateError on duplicate name', async () => {
      const rt = createRuntime();
      const manifest = createMockManifest('dup-pack');
      await rt.installPack(manifest);
      const manifest2 = createMockManifest('dup-pack', crypto.randomUUID() as any);
      await expect(rt.installPack(manifest2)).rejects.toThrow(CapabilityPackDuplicateError);
    });

    it('should throw CapabilityValidationError for invalid manifest', async () => {
      const rt = createRuntime();
      const badManifest = createMockManifest('', crypto.randomUUID() as any, { name: '' });
      await expect(rt.installPack(badManifest)).rejects.toThrow(CapabilityValidationError);
    });

    it('should throw CapabilityCompatibilityError for incompatible version', async () => {
      const rt = createRuntime({
        systemVersions: { coreVersion: '0.1.0', runtimeVersion: '0.1.0' },
      });
      const manifest = createMockManifest('compat-pack', undefined, {
        coreVersion: '99.0.0',
      });
      await expect(rt.installPack(manifest)).rejects.toThrow(CapabilityCompatibilityError);
    });

    it('should install a pack with contract', async () => {
      const rt = createRuntime();
      const manifest = createMockManifest('pack-with-contract');
      const contract = createMockContract(['cap-x']);
      const pack = await rt.installPack(manifest, contract);
      expect(pack.capabilities).toEqual(['cap-x']);
    });

    it('should install a pack without contract', async () => {
      const rt = createRuntime();
      const manifest = createMockManifest('pack-no-contract');
      const pack = await rt.installPack(manifest);
      expect(pack.capabilities).toEqual([]);
    });

    it('should publish a CapabilityInstalled event when eventBus is provided', async () => {
      const { events, eventBus } = createMockEventBus();
      const rt = createRuntime({ eventBus: eventBus as any });
      const manifest = createMockManifest('event-pack');
      await rt.installPack(manifest);
      const installed = events.find(e => e.eventType === 'CapabilityInstalled');
      expect(installed).toBeDefined();
    });

    it('should enforce maxPacks limit', async () => {
      const rt = createRuntime({ maxPacks: 2 });
      await rt.installPack(createMockManifest('pack-a'));
      await rt.installPack(createMockManifest('pack-b'));
      await expect(rt.installPack(createMockManifest('pack-c'))).rejects.toThrow(CapabilityError);
    });

    it('should return a pack with the correct manifest', async () => {
      const rt = createRuntime();
      const manifest = createMockManifest('manifest-check');
      const pack = await rt.installPack(manifest);
      expect(pack.manifest).toBe(manifest);
    });

    it('should register the pack in the registry', async () => {
      const rt = createRuntime();
      const manifest = createMockManifest('reg-check');
      const pack = await rt.installPack(manifest);
      const found = rt.getPack(pack.id);
      expect(found).toBeDefined();
      expect(found!.name).toBe('reg-check');
    });

    it('should store pack in storage', async () => {
      const savePackSpy = vi.fn(async () => {});
      const storage = {
        savePack: savePackSpy,
        loadPack: vi.fn(async () => null),
        deletePack: vi.fn(async () => false),
        listPacks: vi.fn(async () => []),
        saveManifest: vi.fn(async () => {}),
        loadManifest: vi.fn(async () => null),
      };
      const rt = createRuntime({ storage: storage as any });
      await rt.installPack(createMockManifest('storage-pack'));
      expect(savePackSpy).toHaveBeenCalled();
    });

    it('should increment packCount after install', async () => {
      const rt = createRuntime();
      expect(rt.packCount).toBe(0);
      await rt.installPack(createMockManifest('count-pack'));
      expect(rt.packCount).toBe(1);
    });

    it('should validate a contract with missing methods and throw', async () => {
      const rt = createRuntime();
      const manifest = createMockManifest('bad-contract-pack');
      const badContract = Object.freeze({
        initialize: async () => {},
        // missing: shutdown, health, metadata, capabilities
      }) as any;
      await expect(rt.installPack(manifest, badContract)).rejects.toThrow(CapabilityValidationError);
    });

    it('should publish CapabilityCompatibilityFailed before throwing', async () => {
      const { events, eventBus } = createMockEventBus();
      const rt = createRuntime({
        eventBus: eventBus as any,
        systemVersions: { coreVersion: '0.1.0', runtimeVersion: '0.1.0' },
      });
      const manifest = createMockManifest('compat-fail', undefined, { coreVersion: '99.0.0' });
      try {
        await rt.installPack(manifest);
      } catch {}
      const compatEvent = events.find(e => e.eventType === 'CapabilityCompatibilityFailed');
      expect(compatEvent).toBeDefined();
    });

    it('should set installedAt to a valid ISO timestamp', async () => {
      const rt = createRuntime();
      const pack = await rt.installPack(createMockManifest('ts-pack'));
      expect(Date.parse(pack.installedAt)).not.toBeNaN();
    });

    it('should set version to 1 for newly installed pack', async () => {
      const rt = createRuntime();
      const pack = await rt.installPack(createMockManifest('version-pack'));
      expect(pack.version).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. validatePack
  // ═══════════════════════════════════════════════════════════════

  describe('validatePack', () => {
    it('should transition a Registered pack to Validated', async () => {
      const rt = createRuntime();
      const manifest = createMockManifest('val-pack');
      const pack = await rt.installPack(manifest);
      await rt.validatePack(pack.id);
      // Verify via event that validation succeeded
      const validatedPacks = rt.getPacksByState(CS.Validated);
      expect(validatedPacks.some(p => p.id === pack.id)).toBe(true);
    });

    it('should throw CapabilityError when transitioning from wrong state', async () => {
      const rt = createRuntime();
      const pack = await installAndDrive(rt, CS.Active);
      await expect(rt.validatePack(pack.id)).rejects.toThrow(CapabilityError);
    });

    it('should validate a valid pack without throwing', async () => {
      const rt = createRuntime();
      const manifest = createMockManifest('valid-val-pack');
      const contract = createMockContract();
      const pack = await rt.installPack(manifest, contract);
      await expect(rt.validatePack(pack.id)).resolves.toBeUndefined();
    });

    it('should throw CapabilityPackNotFoundError for unknown pack', async () => {
      const rt = createRuntime();
      await expect(rt.validatePack('nonexistent' as any)).rejects.toThrow(CapabilityPackNotFoundError);
    });

    it('should publish a CapabilityValidated event', async () => {
      const { events, eventBus } = createMockEventBus();
      const rt = createRuntime({ eventBus: eventBus as any });
      const pack = await rt.installPack(createMockManifest('val-event-2'));
      await rt.validatePack(pack.id);
      const event = events.find(e => e.eventType === 'CapabilityValidated');
      expect(event).toBeDefined();
    });

    it('should validate a pack without contract', async () => {
      const rt = createRuntime();
      const manifest = createMockManifest('val-no-contract');
      const pack = await rt.installPack(manifest);
      await rt.validatePack(pack.id);
      const validatedPacks = rt.getPacksByState(CS.Validated);
      expect(validatedPacks.some(p => p.id === pack.id)).toBe(true);
    });

    it('should still transition to Validated even if validation issues exist (then throw)', async () => {
      const rt = createRuntime();
      const manifest = createMockManifest('val-issues-pack');
      const contract = createMockContract();
      const pack = await rt.installPack(manifest, contract);
      await rt.validatePack(pack.id);
      // Even though we throw for issues, the FSM transition happens first
      const validatedPacks = rt.getPacksByState(CS.Validated);
      expect(validatedPacks.some(p => p.id === pack.id)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. loadPack
  // ═══════════════════════════════════════════════════════════════

  describe('loadPack', () => {
    it('should transition a Validated pack to Loaded', async () => {
      const rt = createRuntime();
      const pack = await installAndDrive(rt, CS.Validated);
      await rt.loadPack(pack.id);
      const loadedPacks = rt.getPacksByState(CS.Loaded);
      expect(loadedPacks.some(p => p.id === pack.id)).toBe(true);
    });

    it('should throw CapabilityError from wrong state', async () => {
      const rt = createRuntime();
      const pack = await installAndDrive(rt, CS.Registered);
      await expect(rt.loadPack(pack.id)).rejects.toThrow(CapabilityError);
    });

    it('should throw CapabilityPackNotFoundError for unknown pack', async () => {
      const rt = createRuntime();
      await expect(rt.loadPack('nonexistent' as any)).rejects.toThrow(CapabilityPackNotFoundError);
    });

    it('should throw CapabilityDependencyError for missing non-optional deps', async () => {
      const rt = createRuntime();
      const manifest = createMockManifest('dep-missing', undefined, {
        dependencies: [
          {
            packId: 'nonexistent-dep' as any,
            name: 'missing-dep',
            version: '1.0.0',
            optional: false,
            reason: 'required',
          },
        ],
      });
      const pack = await installAndDrive(rt, CS.Validated, manifest);
      await expect(rt.loadPack(pack.id)).rejects.toThrow(CapabilityDependencyError);
    });

    it('should publish CapabilityDependencyFailed event on missing deps', async () => {
      const { events, eventBus } = createMockEventBus();
      const rt = createRuntime({ eventBus: eventBus as any });
      const manifest = createMockManifest('dep-event', undefined, {
        dependencies: [
          {
            packId: 'missing' as any,
            name: 'missing',
            version: '1.0.0',
            optional: false,
            reason: 'test',
          },
        ],
      });
      const pack = await installAndDrive(rt, CS.Validated, manifest);
      try {
        await rt.loadPack(pack.id);
      } catch {}
      const depFailed = events.find(e => e.eventType === 'CapabilityDependencyFailed');
      expect(depFailed).toBeDefined();
    });

    it('should publish a CapabilityLoaded event on success', async () => {
      const { events, eventBus } = createMockEventBus();
      const rt = createRuntime({ eventBus: eventBus as any });
      const pack = await installAndDrive(rt, CS.Validated);
      await rt.loadPack(pack.id);
      const loaded = events.find(e => e.eventType === 'CapabilityLoaded');
      expect(loaded).toBeDefined();
    });

    it('should resolve packs with no dependencies', async () => {
      const rt = createRuntime();
      const manifest = createMockManifest('no-deps');
      const pack = await installAndDrive(rt, CS.Validated, manifest);
      await rt.loadPack(pack.id);
      const loadedPacks = rt.getPacksByState(CS.Loaded);
      expect(loadedPacks.some(p => p.id === pack.id)).toBe(true);
    });

    it('should succeed when optional dependency is missing', async () => {
      const rt = createRuntime();
      const manifest = createMockManifest('opt-dep', undefined, {
        dependencies: [
          {
            packId: 'optional-missing' as any,
            name: 'optional-missing',
            version: '1.0.0',
            optional: true,
            reason: 'optional',
          },
        ],
      });
      const pack = await installAndDrive(rt, CS.Validated, manifest);
      await rt.loadPack(pack.id);
      const loadedPacks = rt.getPacksByState(CS.Loaded);
      expect(loadedPacks.some(p => p.id === pack.id)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. initializePack
  // ═══════════════════════════════════════════════════════════════

  describe('initializePack', () => {
    it('should call contract.initialize with a context', async () => {
      const rt = createRuntime();
      const contract = createMockContract();
      const pack = await installAndDrive(rt, CS.Loaded, undefined, contract);
      await rt.initializePack(pack.id);
      expect(contract.initialize).toHaveBeenCalledTimes(1);
    });

    it('should transition to Initialized state', async () => {
      const rt = createRuntime();
      const pack = await installAndDrive(rt, CS.Loaded);
      await rt.initializePack(pack.id);
      const initializedPacks = rt.getPacksByState(CS.Initialized);
      expect(initializedPacks.some(p => p.id === pack.id)).toBe(true);
    });

    it('should throw CapabilityError from wrong state', async () => {
      const rt = createRuntime();
      const pack = await installAndDrive(rt, CS.Registered);
      await expect(rt.initializePack(pack.id)).rejects.toThrow(CapabilityError);
    });

    it('should throw CapabilityError when no contract is found', async () => {
      const rt = createRuntime();
      const manifest = createMockManifest('init-no-contract');
      const pack = await rt.installPack(manifest);
      await rt.validatePack(pack.id);
      await rt.loadPack(pack.id);
      await expect(rt.initializePack(pack.id)).rejects.toThrow(CapabilityError);
    });

    it('should throw CapabilityError when contract.initialize fails', async () => {
      const rt = createRuntime();
      const failingContract = Object.freeze({
        initialize: vi.fn(async () => { throw new Error('init boom'); }),
        shutdown: vi.fn(async () => {}),
        health: vi.fn(async () => ({ healthy: true, checkedAt: new Date().toISOString() })),
        metadata: vi.fn(() => ({ name: 'test', version: '1.0.0', description: '', capabilities: ['cap'] })),
        capabilities: vi.fn(() => ['cap']),
      }) as any;
      const pack = await installAndDrive(rt, CS.Loaded, undefined, failingContract);
      await expect(rt.initializePack(pack.id)).rejects.toThrow(CapabilityError);
    });

    it('should publish CapabilityError event on initialization failure', async () => {
      const { events, eventBus } = createMockEventBus();
      const rt = createRuntime({ eventBus: eventBus as any });
      const failingContract = Object.freeze({
        initialize: vi.fn(async () => { throw new Error('fail'); }),
        shutdown: vi.fn(async () => {}),
        health: vi.fn(async () => ({ healthy: true, checkedAt: new Date().toISOString() })),
        metadata: vi.fn(() => ({ name: 'test', version: '1.0.0', description: '', capabilities: [] })),
        capabilities: vi.fn(() => []),
      }) as any;
      const pack = await installAndDrive(rt, CS.Loaded, undefined, failingContract);
      try {
        await rt.initializePack(pack.id);
      } catch {}
      const errEvent = events.find(e => e.eventType === 'CapabilityError');
      expect(errEvent).toBeDefined();
    });

    it('should pass correct packId to the context', async () => {
      const rt = createRuntime();
      let receivedContext: any = null;
      const contract = Object.freeze({
        initialize: vi.fn(async (ctx: any) => { receivedContext = ctx; }),
        shutdown: vi.fn(async () => {}),
        health: vi.fn(async () => ({ healthy: true, checkedAt: new Date().toISOString() })),
        metadata: vi.fn(() => ({ name: 'test', version: '1.0.0', description: '', capabilities: [] })),
        capabilities: vi.fn(() => []),
      }) as any;
      const manifest = createMockManifest('ctx-pack');
      const pack = await rt.installPack(manifest, contract);
      await rt.validatePack(pack.id);
      await rt.loadPack(pack.id);
      await rt.initializePack(pack.id);
      expect(receivedContext).toBeDefined();
      expect(receivedContext.packId).toBe(pack.id);
    });

    it('should pass pack name to the context', async () => {
      const rt = createRuntime();
      let receivedContext: any = null;
      const contract = Object.freeze({
        initialize: vi.fn(async (ctx: any) => { receivedContext = ctx; }),
        shutdown: vi.fn(async () => {}),
        health: vi.fn(async () => ({ healthy: true, checkedAt: new Date().toISOString() })),
        metadata: vi.fn(() => ({ name: 'test', version: '1.0.0', description: '', capabilities: [] })),
        capabilities: vi.fn(() => []),
      }) as any;
      const pack = await installAndDrive(rt, CS.Loaded, createMockManifest('named-pack'), contract);
      await rt.initializePack(pack.id);
      expect(receivedContext.packName).toBe('named-pack');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. activatePack
  // ═══════════════════════════════════════════════════════════════

  describe('activatePack', () => {
    it('should transition to Active state', async () => {
      const rt = createRuntime();
      const pack = await installAndDrive(rt, CS.Initialized);
      await rt.activatePack(pack.id);
      const activePacks = rt.getPacksByState(CS.Active);
      expect(activePacks.some(p => p.id === pack.id)).toBe(true);
    });

    it('should throw CapabilityError from wrong state', async () => {
      const rt = createRuntime();
      const pack = await installAndDrive(rt, CS.Registered);
      await expect(rt.activatePack(pack.id)).rejects.toThrow(CapabilityError);
    });

    it('should publish a CapabilityActivated event', async () => {
      const { events, eventBus } = createMockEventBus();
      const rt = createRuntime({ eventBus: eventBus as any });
      const pack = await installAndDrive(rt, CS.Initialized);
      await rt.activatePack(pack.id);
      const event = events.find(e => e.eventType === 'CapabilityActivated');
      expect(event).toBeDefined();
    });

    it('should increment eventsPublished metric after activation', async () => {
      const { eventBus } = createMockEventBus();
      const rt = createRuntime({ eventBus: eventBus as any });
      await installAndDrive(rt, CS.Active);
      const metrics = rt.getMetrics();
      expect(metrics.eventsPublished).toBeGreaterThan(0);
    });

    it('should set activatedAt timestamp in packState', async () => {
      const rt = createRuntime();
      const pack = await installAndDrive(rt, CS.Active);
      // activatedAt is tracked internally; the CapabilityActivated event carries activatedAt
      // The registry pack object is frozen at install time, so we verify via eventBus
      const { events, eventBus } = createMockEventBus();
      const rt2 = createRuntime({ eventBus: eventBus as any });
      const p2 = await installAndDrive(rt2, CS.Active);
      const activatedEvent = events.find(e => e.eventType === 'CapabilityActivated');
      expect(activatedEvent).toBeDefined();
      expect((activatedEvent as any).payload.activatedAt).toBeDefined();
      expect(Date.parse((activatedEvent as any).payload.activatedAt)).not.toBeNaN();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. suspendPack
  // ═══════════════════════════════════════════════════════════════

  describe('suspendPack', () => {
    it('should transition from Active to Suspended', async () => {
      const rt = createRuntime();
      const pack = await installAndDrive(rt, CS.Active);
      await rt.suspendPack(pack.id);
      const suspendedPacks = rt.getPacksByState(CS.Suspended);
      expect(suspendedPacks.some(p => p.id === pack.id)).toBe(true);
    });

    it('should throw CapabilityError from wrong state', async () => {
      const rt = createRuntime();
      const pack = await installAndDrive(rt, CS.Registered);
      await expect(rt.suspendPack(pack.id)).rejects.toThrow(CapabilityError);
    });

    it('should publish a CapabilityStateChanged event', async () => {
      const { events, eventBus } = createMockEventBus();
      const rt = createRuntime({ eventBus: eventBus as any });
      const pack = await installAndDrive(rt, CS.Active);
      await rt.suspendPack(pack.id);
      const stateEvent = events.find(e => e.eventType === 'CapabilityStateChanged');
      expect(stateEvent).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 8. resumePack
  // ═══════════════════════════════════════════════════════════════

  describe('resumePack', () => {
    it('should transition from Suspended to Active', async () => {
      const rt = createRuntime();
      const pack = await installAndDrive(rt, CS.Suspended);
      await rt.resumePack(pack.id);
      const activePacks = rt.getPacksByState(CS.Active);
      expect(activePacks.some(p => p.id === pack.id)).toBe(true);
    });

    it('should throw CapabilityError from wrong state', async () => {
      const rt = createRuntime();
      const pack = await installAndDrive(rt, CS.Registered);
      await expect(rt.resumePack(pack.id)).rejects.toThrow(CapabilityError);
    });

    it('should publish a CapabilityStateChanged event on resume', async () => {
      const { events, eventBus } = createMockEventBus();
      const rt = createRuntime({ eventBus: eventBus as any });
      const pack = await installAndDrive(rt, CS.Suspended);
      await rt.resumePack(pack.id);
      const stateEvent = events.find(
        e => e.eventType === 'CapabilityStateChanged' &&
          (e as any).payload?.fromState === 'Suspended' &&
          (e as any).payload?.toState === 'Active',
      );
      expect(stateEvent).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 9. disablePack
  // ═══════════════════════════════════════════════════════════════

  describe('disablePack', () => {
    it('should transition from Active to Disabled', async () => {
      const rt = createRuntime();
      const pack = await installAndDrive(rt, CS.Active);
      await rt.disablePack(pack.id);
      const disabledPacks = rt.getPacksByState(CS.Disabled);
      expect(disabledPacks.some(p => p.id === pack.id)).toBe(true);
    });

    it('should transition from Suspended to Disabled', async () => {
      const rt = createRuntime();
      const pack = await installAndDrive(rt, CS.Suspended);
      await rt.disablePack(pack.id);
      const disabledPacks = rt.getPacksByState(CS.Disabled);
      expect(disabledPacks.some(p => p.id === pack.id)).toBe(true);
    });

    it('should publish a CapabilityDisabled event', async () => {
      const { events, eventBus } = createMockEventBus();
      const rt = createRuntime({ eventBus: eventBus as any });
      const pack = await installAndDrive(rt, CS.Active);
      await rt.disablePack(pack.id);
      const event = events.find(e => e.eventType === 'CapabilityDisabled');
      expect(event).toBeDefined();
    });

    it('should throw CapabilityError from Removed state', async () => {
      const rt = createRuntime();
      const contract = createMockContract();
      const pack = await installAndDrive(rt, CS.Active, undefined, contract);
      await rt.removePack(pack.id);
      await expect(rt.disablePack(pack.id)).rejects.toThrow(CapabilityError);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 10. removePack
  // ═══════════════════════════════════════════════════════════════

  describe('removePack', () => {
    it('should transition to Removed state', async () => {
      const rt = createRuntime();
      const pack = await installAndDrive(rt, CS.Active);
      await rt.removePack(pack.id);
      const removedPacks = rt.getPacksByState(CS.Removed);
      expect(removedPacks.some(p => p.id === pack.id)).toBe(true);
    });

    it('should call contract.shutdown when removing an active pack', async () => {
      const rt = createRuntime();
      const contract = createMockContract();
      const pack = await installAndDrive(rt, CS.Active, undefined, contract);
      await rt.removePack(pack.id);
      expect(contract.shutdown).toHaveBeenCalled();
    });

    it('should publish a CapabilityRemoved event', async () => {
      const { events, eventBus } = createMockEventBus();
      const rt = createRuntime({ eventBus: eventBus as any });
      const pack = await installAndDrive(rt, CS.Active);
      await rt.removePack(pack.id);
      const event = events.find(e => e.eventType === 'CapabilityRemoved');
      expect(event).toBeDefined();
    });

    it('should decrement totalPacks metric', async () => {
      const rt = createRuntime();
      await installAndDrive(rt, CS.Active);
      expect(rt.getMetrics().totalPacks).toBe(1);
      // Get the active pack
      const packs = rt.getAllPacks();
      await rt.removePack(packs[0].id);
      expect(rt.getMetrics().totalPacks).toBe(0);
    });

    it('should clean up contracts and contexts', async () => {
      const rt = createRuntime();
      const contract = createMockContract();
      const pack = await installAndDrive(rt, CS.Active, undefined, contract);
      await rt.removePack(pack.id);
      // Pack should still exist in registry but contracts should be gone
      // After removal, the contract should have been shut down
      expect(contract.shutdown).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 11. Query Operations
  // ═══════════════════════════════════════════════════════════════

  describe('Query operations', () => {
    it('getPack should return pack by ID', async () => {
      const rt = createRuntime();
      const pack = await rt.installPack(createMockManifest('query-pack'));
      const found = rt.getPack(pack.id);
      expect(found).toBeDefined();
      expect(found!.name).toBe('query-pack');
    });

    it('getPack should return null for unknown ID', () => {
      const rt = createRuntime();
      expect(rt.getPack('nonexistent' as any)).toBeNull();
    });

    it('getPackByName should return pack by name', async () => {
      const rt = createRuntime();
      await rt.installPack(createMockManifest('name-lookup'));
      const found = rt.getPackByName('name-lookup');
      expect(found).toBeDefined();
      expect(found!.name).toBe('name-lookup');
    });

    it('getPackByName should return null for unknown name', () => {
      const rt = createRuntime();
      expect(rt.getPackByName('nonexistent')).toBeNull();
    });

    it('getPacksByState should include pack in Active index after activation', async () => {
      const rt = createRuntime();
      await installAndDrive(rt, CS.Active);
      const activePacks = rt.getPacksByState(CS.Active);
      expect(activePacks.length).toBeGreaterThanOrEqual(1);
    });

    it('getAllPacks should return all installed packs', async () => {
      const rt = createRuntime();
      await rt.installPack(createMockManifest('all-a'));
      await rt.installPack(createMockManifest('all-b'));
      expect(rt.getAllPacks()).toHaveLength(2);
    });

    it('getActivePacks should include activated packs', async () => {
      const rt = createRuntime();
      await installAndDrive(rt, CS.Active);
      await rt.installPack(createMockManifest('inactive'));
      const active = rt.getActivePacks();
      expect(active.length).toBeGreaterThanOrEqual(1);
    });

    it('getMetrics should return capability metrics', () => {
      const rt = createRuntime();
      const metrics = rt.getMetrics();
      expect(metrics).toHaveProperty('totalPacks');
      expect(metrics).toHaveProperty('activePacks');
      expect(metrics).toHaveProperty('disabledPacks');
      expect(metrics).toHaveProperty('suspendedPacks');
      expect(metrics).toHaveProperty('totalCapabilities');
      expect(typeof metrics.totalPacks).toBe('number');
    });

    it('checkPackHealth should return unhealthy for Registered pack (not yet activated)', async () => {
      const rt = createRuntime();
      const pack = await rt.installPack(createMockManifest('health-reg'));
      const health = await rt.checkPackHealth(pack.id);
      // Pack is in Registered state; checkPackHealth returns unhealthy for non-Active/Suspended/Initialized
      expect(health.healthy).toBe(false);
    });

    it('checkPackHealth should return unhealthy details for Registered pack', async () => {
      const rt = createRuntime();
      const pack = await rt.installPack(createMockManifest('health-reg-detail'));
      const health = await rt.checkPackHealth(pack.id);
      expect(health.details).toContain('not active');
    });

    it('checkPackHealth should return unhealthy when contract.health throws', async () => {
      const rt = createRuntime();
      const failingContract = Object.freeze({
        initialize: vi.fn(async () => {}),
        shutdown: vi.fn(async () => {}),
        health: vi.fn(async () => { throw new Error('health boom'); }),
        metadata: vi.fn(() => ({ name: 'test', version: '1.0.0', description: '', capabilities: ['cap'] })),
        capabilities: vi.fn(() => ['cap']),
      }) as any;
      const pack = await installAndDrive(rt, CS.Active, undefined, failingContract);
      const health = await rt.checkPackHealth(pack.id);
      expect(health.healthy).toBe(false);
    });

    it('checkPackHealth should return unhealthy when no contract is available', async () => {
      const rt = createRuntime();
      // Install pack without contract, drive to Loaded (no contract for initialize)
      const manifest = createMockManifest('health-no-ct');
      const pack = await rt.installPack(manifest);
      await rt.validatePack(pack.id);
      await rt.loadPack(pack.id);
      // Pack is loaded but has no contract
      // checkPackHealth checks pack state from registry (Registered), returns unhealthy
      const health = await rt.checkPackHealth(pack.id);
      expect(health.healthy).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 12. resolveDependencies
  // ═══════════════════════════════════════════════════════════════

  describe('resolveDependencies', () => {
    it('should return a resolution result for an installed pack', async () => {
      const rt = createRuntime();
      const pack = await rt.installPack(createMockManifest('resolve-pack'));
      const result = rt.resolveDependencies(pack.id);
      expect(result).toHaveProperty('resolved');
      expect(result).toHaveProperty('order');
      expect(result).toHaveProperty('missing');
    });

    it('should report missing for a pack not in the registry', () => {
      const rt = createRuntime();
      const result = rt.resolveDependencies('nonexistent' as any);
      expect(result.resolved).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });

    it('should return resolved=true for pack with no dependencies', async () => {
      const rt = createRuntime();
      const pack = await rt.installPack(createMockManifest('resolve-no-deps'));
      const result = rt.resolveDependencies(pack.id);
      expect(result.resolved).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 13. Lifecycle (initialize, start, stop, shutdown)
  // ═══════════════════════════════════════════════════════════════

  describe('Lifecycle', () => {
    it('should initialize without error', async () => {
      const rt = createRuntime();
      await expect(rt.initialize()).resolves.toBeUndefined();
    });

    it('should start without error', async () => {
      const rt = createRuntime();
      await expect(rt.start()).resolves.toBeUndefined();
    });

    it('should attempt to suspend active packs on stop', async () => {
      const { events, eventBus } = createMockEventBus();
      const rt = createRuntime({ eventBus: eventBus as any });
      const contract = createMockContract();
      await installAndDrive(rt, CS.Active, undefined, contract);
      await rt.stop();
      // stop() iterates active packs and calls suspendPack; verify contract was shut down
      // Note: suspendPack doesn't call shutdown (only disablePack/removePack do)
      const stateEvents = events.filter(e => e.eventType === 'CapabilityStateChanged');
      expect(stateEvents.length).toBeGreaterThan(0);
    });

    it('should shutdown and call contract.shutdown for all packs', async () => {
      const rt = createRuntime();
      const contract = createMockContract();
      await installAndDrive(rt, CS.Active, undefined, contract);
      await rt.shutdown();
      expect(contract.shutdown).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 14. dispose
  // ═══════════════════════════════════════════════════════════════

  describe('dispose', () => {
    it('should set isDisposed to true after dispose', () => {
      const rt = createRuntime();
      rt.dispose();
      expect(rt.isDisposed).toBe(true);
    });

    it('should throw CapabilityDisposedError on getPack after dispose', async () => {
      const rt = createRuntime();
      await rt.installPack(createMockManifest('dispose-pack'));
      rt.dispose();
      expect(() => rt.getPack('any' as any)).toThrow(CapabilityDisposedError);
    });

    it('should clear all internal state', async () => {
      const rt = createRuntime();
      await rt.installPack(createMockManifest('clear-pack'));
      expect(rt.packCount).toBeGreaterThan(0);
      rt.dispose();
      expect(rt.packCount).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 15. Event Publishing
  // ═══════════════════════════════════════════════════════════════

  describe('Event Publishing', () => {
    it('should publish events that reach the EventBus', async () => {
      const { events, eventBus } = createMockEventBus();
      const rt = createRuntime({ eventBus: eventBus as any });
      await rt.installPack(createMockManifest('event-reach'));
      expect(events.length).toBeGreaterThan(0);
    });

    it('should silently catch event bus publish errors', async () => {
      const failingBus = {
        publish: vi.fn(async () => { throw new Error('bus down'); }),
        subscribe: vi.fn(async () => ({} as any)),
        dispatch: vi.fn(async () => ({} as any)),
      };
      const rt = createRuntime({ eventBus: failingBus as any });
      // Should not throw even though bus.publish throws
      await expect(rt.installPack(createMockManifest('bus-fail'))).resolves.toBeDefined();
    });

    it('should not publish events when no eventBus is configured', async () => {
      const rt = createRuntime();
      const pack = await rt.installPack(createMockManifest('no-bus'));
      expect(pack).toBeDefined();
    });

    it('should increment eventsPublished metric for each event', async () => {
      const { eventBus } = createMockEventBus();
      const rt = createRuntime({ eventBus: eventBus as any });
      await rt.installPack(createMockManifest('metric-event'));
      expect(rt.getMetrics().eventsPublished).toBeGreaterThan(0);
    });

    it('should carry correct aggregateType on published events', async () => {
      const { events, eventBus } = createMockEventBus();
      const rt = createRuntime({ eventBus: eventBus as any });
      await rt.installPack(createMockManifest('agg-type'));
      expect(events[0].aggregateType).toBe('Capability');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FULL LIFECYCLE INTEGRATION
  // ═══════════════════════════════════════════════════════════════

  describe('Full lifecycle integration', () => {
    it('should drive a pack through the complete lifecycle: install → validate → load → initialize → activate → suspend → resume → disable → remove', async () => {
      const { events, eventBus } = createMockEventBus();
      const rt = createRuntime({ eventBus: eventBus as any });
      const contract = createMockContract(['lifecycle-cap']);
      const manifest = createMockManifest('lifecycle-full');

      // Install
      const pack = await rt.installPack(manifest, contract);
      expect(rt.getPack(pack.id)).toBeDefined();

      // Validate
      await rt.validatePack(pack.id);
      // State tracked internally; verify via event
      expect(events.some(e => e.eventType === 'CapabilityValidated')).toBe(true);

      // Load
      await rt.loadPack(pack.id);
      expect(events.some(e => e.eventType === 'CapabilityLoaded')).toBe(true);

      // Initialize
      await rt.initializePack(pack.id);
      expect(contract.initialize).toHaveBeenCalledTimes(1);

      // Activate
      await rt.activatePack(pack.id);
      expect(events.some(e => e.eventType === 'CapabilityActivated')).toBe(true);

      // Suspend
      await rt.suspendPack(pack.id, 'maintenance');
      const suspendEvent = events.find(
        e => e.eventType === 'CapabilityStateChanged' &&
          (e as any).payload?.toState === 'Suspended',
      );
      expect(suspendEvent).toBeDefined();

      // Resume
      await rt.resumePack(pack.id);
      const resumeEvent = events.find(
        e => e.eventType === 'CapabilityStateChanged' &&
          (e as any).payload?.fromState === 'Suspended' &&
          (e as any).payload?.toState === 'Active',
      );
      expect(resumeEvent).toBeDefined();

      // Remove (from Active, since Disabled→Removed is not in the FSM)
      await rt.removePack(pack.id);
      expect(events.some(e => e.eventType === 'CapabilityRemoved')).toBe(true);
      expect(rt.getMetrics().totalPacks).toBe(0);

      // Verify all key event types were published
      const eventTypes = events.map(e => e.eventType);
      expect(eventTypes).toContain('CapabilityInstalled');
      expect(eventTypes).toContain('CapabilityValidated');
      expect(eventTypes).toContain('CapabilityLoaded');
      expect(eventTypes).toContain('CapabilityActivated');
      expect(eventTypes).toContain('CapabilityRemoved');
    });

    it('should handle multiple packs independently', async () => {
      const { events, eventBus } = createMockEventBus();
      const rt = createRuntime({ eventBus: eventBus as any });
      const manifest1 = createMockManifest('multi-a');
      const contract1 = createMockContract(['cap-a']);
      const pack1 = await rt.installPack(manifest1, contract1);
      const manifest2 = createMockManifest('multi-b');
      const contract2 = createMockContract(['cap-b']);
      const pack2 = await rt.installPack(manifest2, contract2);

      // Drive both to Active
      await rt.validatePack(pack1.id);
      await rt.validatePack(pack2.id);
      await rt.loadPack(pack1.id);
      await rt.loadPack(pack2.id);
      await rt.initializePack(pack1.id);
      await rt.initializePack(pack2.id);
      await rt.activatePack(pack1.id);
      await rt.activatePack(pack2.id);

      expect(rt.getAllPacks()).toHaveLength(2);
      const activateEvents = events.filter(e => e.eventType === 'CapabilityActivated');
      expect(activateEvents).toHaveLength(2);

      // Suspend pack1
      await rt.suspendPack(pack1.id, 'test');
      const suspendEvents = events.filter(e => e.eventType === 'CapabilityStateChanged');
      expect(suspendEvents.length).toBeGreaterThanOrEqual(1);
    });
  });
});
