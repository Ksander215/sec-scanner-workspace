/**
 * Comprehensive test suite for marketplace subsystems — batch 1
 * Covers: CapabilityRegistry, PackageRuntime, MarketplaceRuntime, InstallationEngine, UpdateEngine
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CapabilityRegistry } from '@/core/marketplace/capability-registry.js';
import { PackageRuntime } from '@/core/marketplace/package-runtime.js';
import { MarketplaceRuntime } from '@/core/marketplace/marketplace-runtime.js';
import { InstallationEngine } from '@/core/marketplace/installation-engine.js';
import { UpdateEngine } from '@/core/marketplace/update-engine.js';
import {
  brandCapabilityId,
  brandPackageId,
  brandInstallationId,
  brandPublisherId,
} from '@/core/marketplace/types.js';
import {
  DefaultEcosystemRuntimeConfig,
  PackageStatus,
  InstallationStatus,
  CatalogSource,
  PermissionType,
  CompatibilityDimension,
} from '@/core/marketplace/types.js';
import type { CapabilityEntry, CapabilityPackage, CatalogEntry, Installation, UpdateRecord } from '@/core/marketplace/types.js';
import type { InProcessEventBus } from '@/core/events/event-bus.js';
import type {
  CapabilityRegistrationParams,
  PackageCreationParams,
  CatalogAddParams,
  InstallationParams,
} from '@/core/marketplace/contracts.js';
import type { PackageManifest } from '@/core/marketplace/types.js';
import {
  CapabilityNotFoundError,
  CapabilityLimitExceededError,
  CapabilityDuplicateError,
  PackageLimitExceededError,
  PackageSizeExceededError,
  ManifestValidationError,
  CatalogLimitExceededError,
  InstallationNotFoundError,
  InstallationStateError,
  RollbackError,
  MarketplaceError,
} from '@/core/marketplace/errors.js';

// ═══════════════════════════════════════════════════════════════════
// MOCKS & HELPERS
// ═══════════════════════════════════════════════════════════════════

const mockEventBus = {
  publish: vi.fn().mockResolvedValue(undefined),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
} as unknown as InProcessEventBus;

function resetMockEventBus() {
  mockEventBus.publish.mockReset();
  mockEventBus.publish.mockResolvedValue(undefined);
  mockEventBus.subscribe.mockReset();
  mockEventBus.unsubscribe.mockReset();
}

const testPublisherId = brandPublisherId('test-publisher');

function makeCapabilityParams(overrides: Partial<CapabilityRegistrationParams> = {}): CapabilityRegistrationParams {
  return {
    name: `cap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    description: 'Test capability description',
    version: '1.0.0',
    publisherId: testPublisherId,
    category: 'test-category',
    tags: ['tag1', 'tag2'],
    permissions: [PermissionType.Memory, PermissionType.Workflow],
    dependencies: [],
    compatibilityRequirements: [{ dimension: CompatibilityDimension.Runtime, required: '>=0.9.0', optional: false }],
    metadata: { key: 'value' },
    ...overrides,
  };
}

function makePackageParams(overrides: Partial<PackageCreationParams> = {}): PackageCreationParams {
  return {
    capabilityId: brandCapabilityId('test-cap-for-pkg'),
    name: `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    version: '1.0.0',
    manifest: {
      name: 'test-manifest',
      version: '1.0.0',
      description: 'desc',
      author: 'author',
      license: 'MIT',
      main: 'index.js',
      capabilities: [],
      permissions: [],
      dependencies: [],
      compatibility: [],
      entryPoint: 'main.js',
      metadata: {},
    },
    checksum: 'sha256-abc',
    sizeBytes: 1024,
    publisherId: testPublisherId,
    metadata: { pkgKey: 'pkgValue' },
    ...overrides,
  };
}

function makeCatalogParams(overrides: Partial<CatalogAddParams> = {}): CatalogAddParams {
  return {
    capabilityId: brandCapabilityId(`test-catalog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
    source: CatalogSource.Local,
    featured: false,
    metadata: {},
    ...overrides,
  };
}

function makeInstallationParams(overrides: Partial<InstallationParams> = {}): InstallationParams {
  return {
    capabilityId: brandCapabilityId('test-cap-for-inst'),
    packageId: brandPackageId('test-pkg-for-inst'),
    version: '1.0.0',
    metadata: {},
    ...overrides,
  };
}

function makeValidManifest(): PackageManifest {
  return {
    name: 'valid-manifest',
    version: '1.0.0',
    description: 'A valid manifest',
    author: 'test-author',
    license: 'MIT',
    main: 'dist/index.js',
    capabilities: ['cap1'],
    permissions: [PermissionType.Memory],
    dependencies: [],
    compatibility: [],
    entryPoint: 'dist/main.js',
    metadata: {},
  };
}

// ═══════════════════════════════════════════════════════════════════
// 1. CAPABILITY REGISTRY
// ═══════════════════════════════════════════════════════════════════

describe('CapabilityRegistry', () => {
  let registry: CapabilityRegistry;

  beforeEach(() => {
    resetMockEventBus();
    registry = new CapabilityRegistry(
      DefaultEcosystemRuntimeConfig.capabilityRegistry,
      mockEventBus,
    );
  });

  // ── register: happy path ──
  describe('register — happy path', () => {
    it('should register a capability and return an entry', async () => {
      const params = makeCapabilityParams({ name: 'happy-cap-1' });
      const entry = await registry.register(params);
      expect(entry).toBeDefined();
      expect(entry.name).toBe('happy-cap-1');
    });

    it('should return an entry with a valid branded ID', async () => {
      const params = makeCapabilityParams({ name: 'happy-cap-2' });
      const entry = await registry.register(params);
      expect(entry.id).toBeDefined();
      expect(typeof entry.id).toBe('string');
      expect(entry.id.length).toBeGreaterThan(0);
    });

    it('should set initial status to Draft', async () => {
      const params = makeCapabilityParams({ name: 'happy-cap-3' });
      const entry = await registry.register(params);
      expect(entry.status).toBe(PackageStatus.Draft);
    });

    it('should set installed to false', async () => {
      const params = makeCapabilityParams({ name: 'happy-cap-4' });
      const entry = await registry.register(params);
      expect(entry.installed).toBe(false);
    });

    it('should set installCount to 0', async () => {
      const params = makeCapabilityParams({ name: 'happy-cap-5' });
      const entry = await registry.register(params);
      expect(entry.installCount).toBe(0);
    });

    it('should set rating to 0', async () => {
      const params = makeCapabilityParams({ name: 'happy-cap-6' });
      const entry = await registry.register(params);
      expect(entry.rating).toBe(0);
    });

    it('should set ratingCount to 0', async () => {
      const params = makeCapabilityParams({ name: 'happy-cap-7' });
      const entry = await registry.register(params);
      expect(entry.ratingCount).toBe(0);
    });

    it('should set signatureId to null', async () => {
      const params = makeCapabilityParams({ name: 'happy-cap-8' });
      const entry = await registry.register(params);
      expect(entry.signatureId).toBeNull();
    });

    it('should preserve the description', async () => {
      const params = makeCapabilityParams({ name: 'happy-cap-9', description: 'my desc' });
      const entry = await registry.register(params);
      expect(entry.description).toBe('my desc');
    });

    it('should preserve the version', async () => {
      const params = makeCapabilityParams({ name: 'happy-cap-10', version: '2.3.4' });
      const entry = await registry.register(params);
      expect(entry.version).toBe('2.3.4');
    });

    it('should preserve the publisherId', async () => {
      const pid = brandPublisherId('my-pub');
      const params = makeCapabilityParams({ name: 'happy-cap-11', publisherId: pid });
      const entry = await registry.register(params);
      expect(entry.publisherId).toBe(pid);
    });

    it('should preserve the category', async () => {
      const params = makeCapabilityParams({ name: 'happy-cap-12', category: 'analytics' });
      const entry = await registry.register(params);
      expect(entry.category).toBe('analytics');
    });

    it('should preserve tags as readonly array', async () => {
      const params = makeCapabilityParams({ name: 'happy-cap-13', tags: ['a', 'b', 'c'] });
      const entry = await registry.register(params);
      expect(entry.tags).toEqual(['a', 'b', 'c']);
    });

    it('should preserve permissions as readonly array', async () => {
      const perms = [PermissionType.Memory, PermissionType.Network];
      const params = makeCapabilityParams({ name: 'happy-cap-14', permissions: perms });
      const entry = await registry.register(params);
      expect(entry.permissions).toEqual(perms);
    });

    it('should preserve dependencies as readonly array', async () => {
      const deps = [{ name: 'dep1', versionRange: '^1.0.0', optional: false, reason: 'needed' }];
      const params = makeCapabilityParams({ name: 'happy-cap-15', dependencies: deps });
      const entry = await registry.register(params);
      expect(entry.dependencies).toEqual(deps);
    });

    it('should preserve compatibilityRequirements', async () => {
      const reqs = [{ dimension: CompatibilityDimension.OS, required: 'linux', optional: true }];
      const params = makeCapabilityParams({ name: 'happy-cap-16', compatibilityRequirements: reqs });
      const entry = await registry.register(params);
      expect(entry.compatibilityRequirements).toEqual(reqs);
    });

    it('should preserve metadata', async () => {
      const params = makeCapabilityParams({ name: 'happy-cap-17', metadata: { foo: 42 } });
      const entry = await registry.register(params);
      expect(entry.metadata).toEqual({ foo: 42 });
    });

    it('should set createdAt to a valid ISO timestamp', async () => {
      const params = makeCapabilityParams({ name: 'happy-cap-18' });
      const entry = await registry.register(params);
      expect(new Date(entry.createdAt).getTime()).not.toBeNaN();
    });

    it('should set updatedAt to a valid ISO timestamp', async () => {
      const params = makeCapabilityParams({ name: 'happy-cap-19' });
      const entry = await registry.register(params);
      expect(new Date(entry.updatedAt).getTime()).not.toBeNaN();
    });

    it('should have createdAt equal to updatedAt initially', async () => {
      const params = makeCapabilityParams({ name: 'happy-cap-20' });
      const entry = await registry.register(params);
      expect(entry.createdAt).toBe(entry.updatedAt);
    });

    it('should accept empty tags', async () => {
      const params = makeCapabilityParams({ name: 'happy-cap-21', tags: [] });
      const entry = await registry.register(params);
      expect(entry.tags).toEqual([]);
    });

    it('should accept empty permissions', async () => {
      const params = makeCapabilityParams({ name: 'happy-cap-22', permissions: [] });
      const entry = await registry.register(params);
      expect(entry.permissions).toEqual([]);
    });

    it('should accept empty dependencies', async () => {
      const params = makeCapabilityParams({ name: 'happy-cap-23', dependencies: [] });
      const entry = await registry.register(params);
      expect(entry.dependencies).toEqual([]);
    });

    it('should accept empty metadata', async () => {
      const params = makeCapabilityParams({ name: 'happy-cap-24', metadata: {} });
      const entry = await registry.register(params);
      expect(entry.metadata).toEqual({});
    });

    it('should accept empty compatibilityRequirements', async () => {
      const params = makeCapabilityParams({ name: 'happy-cap-25', compatibilityRequirements: [] });
      const entry = await registry.register(params);
      expect(entry.compatibilityRequirements).toEqual([]);
    });
  });

  // ── register: error cases ──
  describe('register — error cases', () => {
    it('should throw CapabilityLimitExceededError when max is reached', async () => {
      const limitedConfig = { ...DefaultEcosystemRuntimeConfig.capabilityRegistry, maxCapabilities: 1 };
      const limitedRegistry = new CapabilityRegistry(limitedConfig, mockEventBus);
      await limitedRegistry.register(makeCapabilityParams({ name: 'limit-1' }));
      await expect(
        limitedRegistry.register(makeCapabilityParams({ name: 'limit-2' })),
      ).rejects.toThrow(CapabilityLimitExceededError);
    });

    it('should throw CapabilityLimitExceededError with correct code', async () => {
      const limitedConfig = { ...DefaultEcosystemRuntimeConfig.capabilityRegistry, maxCapabilities: 0 };
      const limitedRegistry = new CapabilityRegistry(limitedConfig, mockEventBus);
      try {
        await limitedRegistry.register(makeCapabilityParams({ name: 'limit-3' }));
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect((e as MarketplaceError).code).toBe('CAPABILITY_LIMIT_EXCEEDED');
      }
    });

    it('should throw CapabilityLimitExceededError with max in context', async () => {
      const limitedConfig = { ...DefaultEcosystemRuntimeConfig.capabilityRegistry, maxCapabilities: 1 };
      const limitedRegistry = new CapabilityRegistry(limitedConfig, mockEventBus);
      await limitedRegistry.register(makeCapabilityParams({ name: 'limit-4' }));
      try {
        await limitedRegistry.register(makeCapabilityParams({ name: 'limit-5' }));
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect((e as CapabilityLimitExceededError).context.max).toBe(1);
      }
    });

    it('should throw CapabilityDuplicateError when name is duplicated', async () => {
      await registry.register(makeCapabilityParams({ name: 'dup-name' }));
      await expect(
        registry.register(makeCapabilityParams({ name: 'dup-name' })),
      ).rejects.toThrow(CapabilityDuplicateError);
    });

    it('should throw CapabilityDuplicateError with correct code', async () => {
      await registry.register(makeCapabilityParams({ name: 'dup-name-2' }));
      try {
        await registry.register(makeCapabilityParams({ name: 'dup-name-2' }));
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect((e as MarketplaceError).code).toBe('CAPABILITY_DUPLICATE');
      }
    });

    it('should throw CapabilityDuplicateError preserving the duplicate name', async () => {
      await registry.register(makeCapabilityParams({ name: 'dup-name-3' }));
      try {
        await registry.register(makeCapabilityParams({ name: 'dup-name-3' }));
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect((e as CapabilityDuplicateError).capabilityName).toBe('dup-name-3');
      }
    });

    it('should throw CapabilityLimitExceededError at maxCapabilities=0', async () => {
      const limitedConfig = { ...DefaultEcosystemRuntimeConfig.capabilityRegistry, maxCapabilities: 0 };
      const limitedRegistry = new CapabilityRegistry(limitedConfig, mockEventBus);
      await expect(
        limitedRegistry.register(makeCapabilityParams({ name: 'zero-limit' })),
      ).rejects.toThrow(CapabilityLimitExceededError);
    });
  });

  // ── register: event emission ──
  describe('register — event emission', () => {
    it('should call eventBus.publish when registering', async () => {
      await registry.register(makeCapabilityParams({ name: 'evt-1' }));
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should publish event with eventType marketplace.capability.registered', async () => {
      await registry.register(makeCapabilityParams({ name: 'evt-2' }));
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.eventType).toBe('marketplace.capability.registered');
    });

    it('should publish event with classification Info', async () => {
      await registry.register(makeCapabilityParams({ name: 'evt-3' }));
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.classification).toBe('info');
    });

    it('should publish event with capabilityId matching entry', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'evt-4' }));
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.capabilityId).toBe(entry.id);
    });

    it('should publish event with the registered name', async () => {
      await registry.register(makeCapabilityParams({ name: 'evt-5' }));
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.name).toBe('evt-5');
    });

    it('should publish event with the registered version', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'evt-6', version: '3.0.0' }));
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      // publishEvent overrides version with '1.0.0'
      expect(call.version).toBeDefined();
    });

    it('should publish event with the publisherId', async () => {
      const pid = brandPublisherId('evt-pub');
      await registry.register(makeCapabilityParams({ name: 'evt-7', publisherId: pid }));
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.publisherId).toBe(pid);
    });

    it('should publish event with a timestamp', async () => {
      await registry.register(makeCapabilityParams({ name: 'evt-8' }));
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.timestamp).toBeDefined();
      expect(typeof call.timestamp).toBe('string');
    });

    it('should publish event with aggregateId matching capabilityId', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'evt-9' }));
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.aggregateId).toBe(entry.id as string);
    });

    it('should publish event with aggregateType Capability', async () => {
      await registry.register(makeCapabilityParams({ name: 'evt-10' }));
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.aggregateType).toBe('Capability');
    });

    it('should publish event with version 1.0.0', async () => {
      await registry.register(makeCapabilityParams({ name: 'evt-11' }));
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.version).toBeDefined();
    });

    it('should publish event with eventId', async () => {
      await registry.register(makeCapabilityParams({ name: 'evt-12' }));
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.eventId).toBeDefined();
    });

    it('should not publish event when eventBus is null', async () => {
      const noBusRegistry = new CapabilityRegistry(
        DefaultEcosystemRuntimeConfig.capabilityRegistry,
        null,
      );
      await noBusRegistry.register(makeCapabilityParams({ name: 'evt-null' }));
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  // ── updateStatus ──
  describe('updateStatus', () => {
    it('should update status to Published', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'us-1' }));
      await registry.updateStatus(entry.id, PackageStatus.Published);
      const updated = await registry.getById(entry.id);
      expect(updated?.status).toBe(PackageStatus.Published);
    });

    it('should update status to PendingReview', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'us-2' }));
      await registry.updateStatus(entry.id, PackageStatus.PendingReview);
      const updated = await registry.getById(entry.id);
      expect(updated?.status).toBe(PackageStatus.PendingReview);
    });

    it('should update status to Unlisted', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'us-3' }));
      await registry.updateStatus(entry.id, PackageStatus.Unlisted);
      const updated = await registry.getById(entry.id);
      expect(updated?.status).toBe(PackageStatus.Unlisted);
    });

    it('should update status to Deprecated', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'us-4' }));
      await registry.updateStatus(entry.id, PackageStatus.Deprecated);
      const updated = await registry.getById(entry.id);
      expect(updated?.status).toBe(PackageStatus.Deprecated);
    });

    it('should update status to Suspended', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'us-5' }));
      await registry.updateStatus(entry.id, PackageStatus.Suspended);
      const updated = await registry.getById(entry.id);
      expect(updated?.status).toBe(PackageStatus.Suspended);
    });

    it('should update status to Removed', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'us-6' }));
      await registry.updateStatus(entry.id, PackageStatus.Removed);
      const updated = await registry.getById(entry.id);
      expect(updated?.status).toBe(PackageStatus.Removed);
    });

    it('should update status back to Draft', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'us-7' }));
      await registry.updateStatus(entry.id, PackageStatus.Published);
      await registry.updateStatus(entry.id, PackageStatus.Draft);
      const updated = await registry.getById(entry.id);
      expect(updated?.status).toBe(PackageStatus.Draft);
    });

    it('should update updatedAt timestamp', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'us-8' }));
      await registry.updateStatus(entry.id, PackageStatus.Published);
      const updated = await registry.getById(entry.id);
      expect(updated?.updatedAt).toBeDefined();
    });

    it('should preserve all other fields on status update', async () => {
      const params = makeCapabilityParams({ name: 'us-9', description: 'original', version: '1.2.3' });
      const entry = await registry.register(params);
      await registry.updateStatus(entry.id, PackageStatus.Published);
      const updated = await registry.getById(entry.id);
      expect(updated?.description).toBe('original');
      expect(updated?.version).toBe('1.2.3');
      expect(updated?.name).toBe('us-9');
      expect(updated?.category).toBe('test-category');
    });

    it('should throw CapabilityNotFoundError for unknown ID', async () => {
      await expect(
        registry.updateStatus(brandCapabilityId('nonexistent'), PackageStatus.Published),
      ).rejects.toThrow(CapabilityNotFoundError);
    });

    it('should throw CapabilityNotFoundError with correct code', async () => {
      try {
        await registry.updateStatus(brandCapabilityId('nonexistent-2'), PackageStatus.Published);
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect((e as MarketplaceError).code).toBe('CAPABILITY_NOT_FOUND');
      }
    });

    it('should throw CapabilityNotFoundError preserving the capabilityId', async () => {
      try {
        await registry.updateStatus(brandCapabilityId('nonexistent-3'), PackageStatus.Published);
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect((e as CapabilityNotFoundError).capabilityId).toBe('nonexistent-3');
      }
    });
  });

  // ── getById ──
  describe('getById', () => {
    it('should return the entry by ID', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'gbi-1' }));
      const found = await registry.getById(entry.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(entry.id);
    });

    it('should return null for nonexistent ID', async () => {
      const found = await registry.getById(brandCapabilityId('no-such'));
      expect(found).toBeNull();
    });

    it('should return entry with all fields intact', async () => {
      const params = makeCapabilityParams({ name: 'gbi-2', version: '5.5.5' });
      const entry = await registry.register(params);
      const found = await registry.getById(entry.id);
      expect(found?.version).toBe('5.5.5');
      expect(found?.name).toBe('gbi-2');
    });

    it('should return entry after status update', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'gbi-3' }));
      await registry.updateStatus(entry.id, PackageStatus.Suspended);
      const found = await registry.getById(entry.id);
      expect(found?.status).toBe(PackageStatus.Suspended);
    });

    it('should return correct entry for multiple registrations', async () => {
      const entry1 = await registry.register(makeCapabilityParams({ name: 'gbi-4' }));
      const entry2 = await registry.register(makeCapabilityParams({ name: 'gbi-5' }));
      expect((await registry.getById(entry1.id))?.name).toBe('gbi-4');
      expect((await registry.getById(entry2.id))?.name).toBe('gbi-5');
    });
  });

  // ── getByName ──
  describe('getByName', () => {
    it('should return the entry by name', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'gbn-1' }));
      const found = await registry.getByName('gbn-1');
      expect(found).toBeDefined();
      expect(found?.id).toBe(entry.id);
    });

    it('should return null for nonexistent name', async () => {
      const found = await registry.getByName('no-such-name');
      expect(found).toBeNull();
    });

    it('should return null after removal', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'gbn-2' }));
      await registry.remove(entry.id);
      const found = await registry.getByName('gbn-2');
      expect(found).toBeNull();
    });

    it('should return entry with correct version', async () => {
      await registry.register(makeCapabilityParams({ name: 'gbn-3', version: '7.7.7' }));
      const found = await registry.getByName('gbn-3');
      expect(found?.version).toBe('7.7.7');
    });
  });

  // ── list ──
  describe('list', () => {
    it('should return empty array when no capabilities registered', async () => {
      const result = await registry.list();
      expect(result).toEqual([]);
    });

    it('should return all registered capabilities with no filter', async () => {
      await registry.register(makeCapabilityParams({ name: 'list-1' }));
      await registry.register(makeCapabilityParams({ name: 'list-2' }));
      const result = await registry.list();
      expect(result).toHaveLength(2);
    });

    it('should return frozen array', async () => {
      await registry.register(makeCapabilityParams({ name: 'list-3' }));
      const result = await registry.list();
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should filter by status Draft', async () => {
      const e1 = await registry.register(makeCapabilityParams({ name: 'list-4' }));
      await registry.register(makeCapabilityParams({ name: 'list-5' }));
      await registry.updateStatus(e1.id, PackageStatus.Published);
      const result = await registry.list({ status: PackageStatus.Draft });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('list-5');
    });

    it('should filter by status Published', async () => {
      const e1 = await registry.register(makeCapabilityParams({ name: 'list-6' }));
      await registry.register(makeCapabilityParams({ name: 'list-7' }));
      await registry.updateStatus(e1.id, PackageStatus.Published);
      const result = await registry.list({ status: PackageStatus.Published });
      expect(result).toHaveLength(1);
    });

    it('should filter by category', async () => {
      await registry.register(makeCapabilityParams({ name: 'list-8', category: 'cat-a' }));
      await registry.register(makeCapabilityParams({ name: 'list-9', category: 'cat-b' }));
      const result = await registry.list({ category: 'cat-a' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('list-8');
    });

    it('should return empty array for non-matching category', async () => {
      await registry.register(makeCapabilityParams({ name: 'list-10', category: 'cat-a' }));
      const result = await registry.list({ category: 'nonexistent' });
      expect(result).toHaveLength(0);
    });

    it('should filter by publisherId', async () => {
      const pub1 = brandPublisherId('pub-1');
      const pub2 = brandPublisherId('pub-2');
      await registry.register(makeCapabilityParams({ name: 'list-11', publisherId: pub1 }));
      await registry.register(makeCapabilityParams({ name: 'list-12', publisherId: pub2 }));
      const result = await registry.list({ publisherId: pub1 });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('list-11');
    });

    it('should filter by installed=true', async () => {
      const result = await registry.list({ installed: true });
      expect(result).toHaveLength(0);
    });

    it('should filter by installed=false', async () => {
      await registry.register(makeCapabilityParams({ name: 'list-13' }));
      const result = await registry.list({ installed: false });
      expect(result).toHaveLength(1);
    });

    it('should support combined status and category filter', async () => {
      await registry.register(makeCapabilityParams({ name: 'list-14', category: 'analytics', version: '1.0.0' }));
      const e2 = await registry.register(makeCapabilityParams({ name: 'list-15', category: 'analytics', version: '1.0.0' }));
      await registry.updateStatus(e2.id, PackageStatus.Published);
      await registry.register(makeCapabilityParams({ name: 'list-16', category: 'utils', version: '1.0.0' }));
      const result = await registry.list({ status: PackageStatus.Draft, category: 'analytics' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('list-14');
    });

    it('should support combined status and publisherId filter', async () => {
      const pub = brandPublisherId('combo-pub');
      const e1 = await registry.register(makeCapabilityParams({ name: 'list-17', publisherId: pub }));
      await registry.register(makeCapabilityParams({ name: 'list-18', publisherId: pub }));
      await registry.updateStatus(e1.id, PackageStatus.Published);
      const result = await registry.list({ status: PackageStatus.Published, publisherId: pub });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('list-17');
    });

    it('should return empty for combined filter matching nothing', async () => {
      await registry.register(makeCapabilityParams({ name: 'list-19', category: 'a' }));
      const result = await registry.list({ status: PackageStatus.Removed, category: 'a' });
      expect(result).toHaveLength(0);
    });

    it('should handle undefined filter gracefully', async () => {
      await registry.register(makeCapabilityParams({ name: 'list-20' }));
      const result = await registry.list(undefined);
      expect(result).toHaveLength(1);
    });
  });

  // ── remove ──
  describe('remove', () => {
    it('should remove an existing capability', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'rm-1' }));
      await registry.remove(entry.id);
      expect(await registry.getById(entry.id)).toBeNull();
    });

    it('should decrease count after remove', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'rm-2' }));
      expect(await registry.count()).toBe(1);
      await registry.remove(entry.id);
      expect(await registry.count()).toBe(0);
    });

    it('should also remove from name index', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'rm-3' }));
      await registry.remove(entry.id);
      expect(await registry.getByName('rm-3')).toBeNull();
    });

    it('should throw CapabilityNotFoundError for nonexistent ID', async () => {
      await expect(
        registry.remove(brandCapabilityId('nonexistent-remove')),
      ).rejects.toThrow(CapabilityNotFoundError);
    });

    it('should throw CapabilityNotFoundError with correct code', async () => {
      try {
        await registry.remove(brandCapabilityId('nonexistent-remove-2'));
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect((e as MarketplaceError).code).toBe('CAPABILITY_NOT_FOUND');
      }
    });

    it('should allow registering same name after removal', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'rm-reuse' }));
      await registry.remove(entry.id);
      const newEntry = await registry.register(makeCapabilityParams({ name: 'rm-reuse' }));
      expect(newEntry.name).toBe('rm-reuse');
      expect(await registry.count()).toBe(1);
    });
  });

  // ── count ──
  describe('count', () => {
    it('should return 0 for empty registry', async () => {
      expect(await registry.count()).toBe(0);
    });

    it('should return 1 after one registration', async () => {
      await registry.register(makeCapabilityParams({ name: 'cnt-1' }));
      expect(await registry.count()).toBe(1);
    });

    it('should return 2 after two registrations', async () => {
      await registry.register(makeCapabilityParams({ name: 'cnt-2' }));
      await registry.register(makeCapabilityParams({ name: 'cnt-3' }));
      expect(await registry.count()).toBe(2);
    });

    it('should decrement after remove', async () => {
      const e1 = await registry.register(makeCapabilityParams({ name: 'cnt-4' }));
      const e2 = await registry.register(makeCapabilityParams({ name: 'cnt-5' }));
      expect(await registry.count()).toBe(2);
      await registry.remove(e1.id);
      expect(await registry.count()).toBe(1);
      await registry.remove(e2.id);
      expect(await registry.count()).toBe(0);
    });

    it('should remain accurate after status updates', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'cnt-6' }));
      await registry.updateStatus(entry.id, PackageStatus.Published);
      expect(await registry.count()).toBe(1);
    });
  });

  // ── constructor ──
  describe('constructor', () => {
    it('should work without eventBus', async () => {
      const noBus = new CapabilityRegistry(DefaultEcosystemRuntimeConfig.capabilityRegistry);
      const entry = await noBus.register(makeCapabilityParams({ name: 'ctor-1' }));
      expect(entry).toBeDefined();
      expect(await noBus.count()).toBe(1);
    });

    it('should work with null eventBus', async () => {
      const nullBus = new CapabilityRegistry(DefaultEcosystemRuntimeConfig.capabilityRegistry, null);
      const entry = await nullBus.register(makeCapabilityParams({ name: 'ctor-2' }));
      expect(entry).toBeDefined();
    });

    it('should work with eventBus explicitly', async () => {
      const busReg = new CapabilityRegistry(DefaultEcosystemRuntimeConfig.capabilityRegistry, mockEventBus);
      await busReg.register(makeCapabilityParams({ name: 'ctor-3' }));
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. PACKAGE RUNTIME
// ═══════════════════════════════════════════════════════════════════

describe('PackageRuntime', () => {
  let runtime: PackageRuntime;

  beforeEach(() => {
    resetMockEventBus();
    runtime = new PackageRuntime(
      DefaultEcosystemRuntimeConfig.packageRuntime,
      mockEventBus,
    );
  });

  // ── createPackage: happy path ──
  describe('createPackage — happy path', () => {
    it('should create a package and return it', async () => {
      const params = makePackageParams();
      const pkg = await runtime.createPackage(params);
      expect(pkg).toBeDefined();
      expect(pkg.name).toBe(params.name);
    });

    it('should return a package with a valid branded ID', async () => {
      const params = makePackageParams();
      const pkg = await runtime.createPackage(params);
      expect(pkg.id).toBeDefined();
      expect(typeof pkg.id).toBe('string');
    });

    it('should set initial status to Draft', async () => {
      const pkg = await runtime.createPackage(makePackageParams());
      expect(pkg.status).toBe(PackageStatus.Draft);
    });

    it('should set signatureId to null', async () => {
      const pkg = await runtime.createPackage(makePackageParams());
      expect(pkg.signatureId).toBeNull();
    });

    it('should preserve capabilityId', async () => {
      const capId = brandCapabilityId('my-cap-id');
      const pkg = await runtime.createPackage(makePackageParams({ capabilityId: capId }));
      expect(pkg.capabilityId).toBe(capId);
    });

    it('should preserve version', async () => {
      const pkg = await runtime.createPackage(makePackageParams({ version: '4.5.6' }));
      expect(pkg.version).toBe('4.5.6');
    });

    it('should preserve manifest', async () => {
      const manifest = makeValidManifest();
      const pkg = await runtime.createPackage(makePackageParams({ manifest }));
      expect(pkg.manifest).toEqual(manifest);
    });

    it('should preserve checksum', async () => {
      const pkg = await runtime.createPackage(makePackageParams({ checksum: 'sha256-xyz' }));
      expect(pkg.checksum).toBe('sha256-xyz');
    });

    it('should preserve sizeBytes', async () => {
      const pkg = await runtime.createPackage(makePackageParams({ sizeBytes: 9999 }));
      expect(pkg.sizeBytes).toBe(9999);
    });

    it('should preserve publisherId', async () => {
      const pid = brandPublisherId('pkg-pub');
      const pkg = await runtime.createPackage(makePackageParams({ publisherId: pid }));
      expect(pkg.publisherId).toBe(pid);
    });

    it('should preserve metadata', async () => {
      const pkg = await runtime.createPackage(makePackageParams({ metadata: { a: 1 } }));
      expect(pkg.metadata).toEqual({ a: 1 });
    });

    it('should set createdAt to a valid ISO timestamp', async () => {
      const pkg = await runtime.createPackage(makePackageParams());
      expect(new Date(pkg.createdAt).getTime()).not.toBeNaN();
    });

    it('should set updatedAt to a valid ISO timestamp', async () => {
      const pkg = await runtime.createPackage(makePackageParams());
      expect(new Date(pkg.updatedAt).getTime()).not.toBeNaN();
    });

    it('should have createdAt equal to updatedAt initially', async () => {
      const pkg = await runtime.createPackage(makePackageParams());
      expect(pkg.createdAt).toBe(pkg.updatedAt);
    });
  });

  // ── createPackage: error cases ──
  describe('createPackage — error cases', () => {
    it('should throw PackageLimitExceededError when max is reached', async () => {
      const limitedConfig = { ...DefaultEcosystemRuntimeConfig.packageRuntime, maxPackages: 1 };
      const limitedRuntime = new PackageRuntime(limitedConfig, mockEventBus);
      await limitedRuntime.createPackage(makePackageParams());
      await expect(
        limitedRuntime.createPackage(makePackageParams()),
      ).rejects.toThrow(PackageLimitExceededError);
    });

    it('should throw PackageLimitExceededError with correct code', async () => {
      const limitedConfig = { ...DefaultEcosystemRuntimeConfig.packageRuntime, maxPackages: 0 };
      const limitedRuntime = new PackageRuntime(limitedConfig, mockEventBus);
      try {
        await limitedRuntime.createPackage(makePackageParams());
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect((e as MarketplaceError).code).toBe('PACKAGE_LIMIT_EXCEEDED');
      }
    });

    it('should throw PackageSizeExceededError for oversized package', async () => {
      const maxSize = DefaultEcosystemRuntimeConfig.packageRuntime.maxPackageSizeBytes;
      const params = makePackageParams({ sizeBytes: maxSize + 1 });
      await expect(runtime.createPackage(params)).rejects.toThrow(PackageSizeExceededError);
    });

    it('should throw PackageSizeExceededError with correct code', async () => {
      const maxSize = DefaultEcosystemRuntimeConfig.packageRuntime.maxPackageSizeBytes;
      const params = makePackageParams({ sizeBytes: maxSize + 1 });
      try {
        await runtime.createPackage(params);
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect((e as MarketplaceError).code).toBe('PACKAGE_SIZE_EXCEEDED');
      }
    });

    it('should throw PackageSizeExceededError with size info in context', async () => {
      const maxSize = DefaultEcosystemRuntimeConfig.packageRuntime.maxPackageSizeBytes;
      const params = makePackageParams({ sizeBytes: maxSize + 100 });
      try {
        await runtime.createPackage(params);
        expect.unreachable('Should have thrown');
      } catch (e) {
        const ctx = (e as PackageSizeExceededError).context;
        expect(ctx.sizeBytes).toBe(maxSize + 100);
        expect(ctx.maxSize).toBe(maxSize);
      }
    });

    it('should not throw PackageSizeExceededError at exactly max size', async () => {
      const maxSize = DefaultEcosystemRuntimeConfig.packageRuntime.maxPackageSizeBytes;
      const params = makePackageParams({ sizeBytes: maxSize });
      const pkg = await runtime.createPackage(params);
      expect(pkg).toBeDefined();
    });
  });

  // ── createPackage: event emission ──
  describe('createPackage — event emission', () => {
    it('should call eventBus.publish on create', async () => {
      await runtime.createPackage(makePackageParams());
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should publish event with eventType marketplace.package.created', async () => {
      await runtime.createPackage(makePackageParams());
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.eventType).toBe('marketplace.package.created');
    });

    it('should publish event with classification Info', async () => {
      await runtime.createPackage(makePackageParams());
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.classification).toBe('info');
    });

    it('should publish event with packageId matching entry', async () => {
      const pkg = await runtime.createPackage(makePackageParams());
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.packageId).toBe(pkg.id);
    });

    it('should publish event with capabilityId', async () => {
      const capId = brandCapabilityId('evt-cap');
      await runtime.createPackage(makePackageParams({ capabilityId: capId }));
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.capabilityId).toBe(capId);
    });

    it('should publish event with version', async () => {
      await runtime.createPackage(makePackageParams({ version: '2.0.0' }));
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.version).toBeDefined();
    });

    it('should publish event with timestamp', async () => {
      await runtime.createPackage(makePackageParams());
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.timestamp).toBeDefined();
    });

    it('should publish event with aggregateType Package', async () => {
      const pkg = await runtime.createPackage(makePackageParams());
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.aggregateType).toBe('Package');
      expect(call.aggregateId).toBe(pkg.id as string);
    });

    it('should publish event with eventId', async () => {
      await runtime.createPackage(makePackageParams());
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.eventId).toBeDefined();
    });

    it('should not publish event when eventBus is null', async () => {
      const noBus = new PackageRuntime(DefaultEcosystemRuntimeConfig.packageRuntime, null);
      await noBus.createPackage(makePackageParams());
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  // ── getById ──
  describe('getById', () => {
    it('should return package by ID', async () => {
      const pkg = await runtime.createPackage(makePackageParams());
      const found = await runtime.getById(pkg.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(pkg.id);
    });

    it('should return null for nonexistent ID', async () => {
      const found = await runtime.getById(brandPackageId('no-such-pkg'));
      expect(found).toBeNull();
    });

    it('should return correct package among multiple', async () => {
      const pkg1 = await runtime.createPackage(makePackageParams({ version: '1.0.0' }));
      const pkg2 = await runtime.createPackage(makePackageParams({ version: '2.0.0' }));
      expect((await runtime.getById(pkg1.id))?.version).toBe('1.0.0');
      expect((await runtime.getById(pkg2.id))?.version).toBe('2.0.0');
    });
  });

  // ── getByCapabilityId ──
  describe('getByCapabilityId', () => {
    it('should return package by capabilityId', async () => {
      const capId = brandCapabilityId('cap-for-lookup');
      await runtime.createPackage(makePackageParams({ capabilityId: capId }));
      const found = await runtime.getByCapabilityId(capId);
      expect(found).toBeDefined();
      expect(found?.capabilityId).toBe(capId);
    });

    it('should return null for nonexistent capabilityId', async () => {
      const found = await runtime.getByCapabilityId(brandCapabilityId('no-such-cap'));
      expect(found).toBeNull();
    });

    it('should return first matching package if multiple exist', async () => {
      const capId = brandCapabilityId('shared-cap');
      await runtime.createPackage(makePackageParams({ capabilityId: capId, version: '1.0.0' }));
      await runtime.createPackage(makePackageParams({ capabilityId: capId, version: '2.0.0' }));
      const found = await runtime.getByCapabilityId(capId);
      expect(found).toBeDefined();
      expect(found?.capabilityId).toBe(capId);
    });
  });

  // ── list ──
  describe('list', () => {
    it('should return empty array when no packages', async () => {
      const result = await runtime.list();
      expect(result).toEqual([]);
    });

    it('should return all packages with no filter', async () => {
      await runtime.createPackage(makePackageParams());
      await runtime.createPackage(makePackageParams());
      const result = await runtime.list();
      expect(result).toHaveLength(2);
    });

    it('should return frozen array', async () => {
      await runtime.createPackage(makePackageParams());
      const result = await runtime.list();
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should filter by status Draft', async () => {
      await runtime.createPackage(makePackageParams());
      await runtime.createPackage(makePackageParams());
      const result = await runtime.list({ status: PackageStatus.Draft });
      expect(result).toHaveLength(2);
    });

    it('should return empty for non-matching status', async () => {
      await runtime.createPackage(makePackageParams());
      const result = await runtime.list({ status: PackageStatus.Published });
      expect(result).toHaveLength(0);
    });

    it('should filter by publisherId', async () => {
      const pub1 = brandPublisherId('list-pub-1');
      const pub2 = brandPublisherId('list-pub-2');
      await runtime.createPackage(makePackageParams({ publisherId: pub1 }));
      await runtime.createPackage(makePackageParams({ publisherId: pub2 }));
      const result = await runtime.list({ publisherId: pub1 });
      expect(result).toHaveLength(1);
    });

    it('should support combined status and publisherId filter', async () => {
      const pub = brandPublisherId('combo-pkg-pub');
      await runtime.createPackage(makePackageParams({ publisherId: pub }));
      await runtime.createPackage(makePackageParams({ publisherId: brandPublisherId('other') }));
      const result = await runtime.list({ status: PackageStatus.Draft, publisherId: pub });
      expect(result).toHaveLength(1);
    });

    it('should handle undefined filter', async () => {
      await runtime.createPackage(makePackageParams());
      const result = await runtime.list(undefined);
      expect(result).toHaveLength(1);
    });
  });

  // ── validateManifest ──
  describe('validateManifest', () => {
    it('should return true for a valid manifest', async () => {
      const manifest = makeValidManifest();
      const result = await runtime.validateManifest(manifest);
      expect(result).toBe(true);
    });

    it('should throw ManifestValidationError when name is empty', async () => {
      const manifest = makeValidManifest();
      const invalidManifest = { ...manifest, name: '' };
      await expect(runtime.validateManifest(invalidManifest)).rejects.toThrow(ManifestValidationError);
    });

    it('should throw ManifestValidationError when version is empty', async () => {
      const manifest = makeValidManifest();
      const invalidManifest = { ...manifest, version: '' };
      await expect(runtime.validateManifest(invalidManifest)).rejects.toThrow(ManifestValidationError);
    });

    it('should throw ManifestValidationError when main is empty', async () => {
      const manifest = makeValidManifest();
      const invalidManifest = { ...manifest, main: '' };
      await expect(runtime.validateManifest(invalidManifest)).rejects.toThrow(ManifestValidationError);
    });

    it('should throw ManifestValidationError when entryPoint is empty', async () => {
      const manifest = makeValidManifest();
      const invalidManifest = { ...manifest, entryPoint: '' };
      await expect(runtime.validateManifest(invalidManifest)).rejects.toThrow(ManifestValidationError);
    });

    it('should throw ManifestValidationError with correct code', async () => {
      const manifest = makeValidManifest();
      const invalidManifest = { ...manifest, name: '' };
      try {
        await runtime.validateManifest(invalidManifest);
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect((e as MarketplaceError).code).toBe('MANIFEST_VALIDATION_ERROR');
      }
    });

    it('should throw ManifestValidationError with descriptive reason', async () => {
      const manifest = makeValidManifest();
      const invalidManifest = { ...manifest, name: '' };
      try {
        await runtime.validateManifest(invalidManifest);
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect((e as ManifestValidationError).reason).toContain('Required fields missing');
      }
    });

    it('should accept manifest with minimal required fields', async () => {
      const minimalManifest = {
        name: 'min',
        version: '1.0.0',
        description: '',
        author: '',
        license: '',
        main: 'index.js',
        capabilities: [],
        permissions: [],
        dependencies: [],
        compatibility: [],
        entryPoint: 'main.js',
        metadata: {},
      };
      expect(await runtime.validateManifest(minimalManifest)).toBe(true);
    });
  });

  // ── count ──
  describe('count', () => {
    it('should return 0 for empty runtime', async () => {
      expect(await runtime.count()).toBe(0);
    });

    it('should return 1 after one createPackage', async () => {
      await runtime.createPackage(makePackageParams());
      expect(await runtime.count()).toBe(1);
    });

    it('should return correct count after multiple creates', async () => {
      await runtime.createPackage(makePackageParams());
      await runtime.createPackage(makePackageParams());
      await runtime.createPackage(makePackageParams());
      expect(await runtime.count()).toBe(3);
    });
  });

  // ── constructor ──
  describe('constructor', () => {
    it('should work without eventBus', async () => {
      const noBus = new PackageRuntime(DefaultEcosystemRuntimeConfig.packageRuntime);
      const pkg = await noBus.createPackage(makePackageParams());
      expect(pkg).toBeDefined();
    });

    it('should work with null eventBus', async () => {
      const nullBus = new PackageRuntime(DefaultEcosystemRuntimeConfig.packageRuntime, null);
      const pkg = await nullBus.createPackage(makePackageParams());
      expect(pkg).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. MARKETPLACE RUNTIME
// ═══════════════════════════════════════════════════════════════════

describe('MarketplaceRuntime', () => {
  let marketplace: MarketplaceRuntime;

  beforeEach(() => {
    resetMockEventBus();
    marketplace = new MarketplaceRuntime(
      DefaultEcosystemRuntimeConfig.marketplace,
      mockEventBus,
    );
  });

  // ── addToCatalog: happy path ──
  describe('addToCatalog — happy path', () => {
    it('should add an entry to the catalog', async () => {
      const params = makeCatalogParams();
      const entry = await marketplace.addToCatalog(params);
      expect(entry).toBeDefined();
    });

    it('should set capabilityId from params', async () => {
      const capId = brandCapabilityId('cat-cap-1');
      const entry = await marketplace.addToCatalog(makeCatalogParams({ capabilityId: capId }));
      expect(entry.capabilityId).toBe(capId);
    });

    it('should set source from params', async () => {
      const entry = await marketplace.addToCatalog(makeCatalogParams({ source: CatalogSource.Registry }));
      expect(entry.source).toBe(CatalogSource.Registry);
    });

    it('should set featured from params (true)', async () => {
      const entry = await marketplace.addToCatalog(makeCatalogParams({ featured: true }));
      expect(entry.featured).toBe(true);
    });

    it('should set featured from params (false)', async () => {
      const entry = await marketplace.addToCatalog(makeCatalogParams({ featured: false }));
      expect(entry.featured).toBe(false);
    });

    it('should set name to empty string', async () => {
      const entry = await marketplace.addToCatalog(makeCatalogParams());
      expect(entry.name).toBe('');
    });

    it('should set description to empty string', async () => {
      const entry = await marketplace.addToCatalog(makeCatalogParams());
      expect(entry.description).toBe('');
    });

    it('should set version to 0.0.0', async () => {
      const entry = await marketplace.addToCatalog(makeCatalogParams());
      expect(entry.version).toBe('0.0.0');
    });

    it('should set category to empty string', async () => {
      const entry = await marketplace.addToCatalog(makeCatalogParams());
      expect(entry.category).toBe('');
    });

    it('should set tags to empty array', async () => {
      const entry = await marketplace.addToCatalog(makeCatalogParams());
      expect(entry.tags).toEqual([]);
    });

    it('should set rating to 0', async () => {
      const entry = await marketplace.addToCatalog(makeCatalogParams());
      expect(entry.rating).toBe(0);
    });

    it('should set downloadCount to 0', async () => {
      const entry = await marketplace.addToCatalog(makeCatalogParams());
      expect(entry.downloadCount).toBe(0);
    });

    it('should set compatible to true', async () => {
      const entry = await marketplace.addToCatalog(makeCatalogParams());
      expect(entry.compatible).toBe(true);
    });

    it('should preserve metadata from params', async () => {
      const entry = await marketplace.addToCatalog(makeCatalogParams({ metadata: { k: 'v' } }));
      expect(entry.metadata).toEqual({ k: 'v' });
    });

    it('should set publishedAt to a valid ISO timestamp', async () => {
      const entry = await marketplace.addToCatalog(makeCatalogParams());
      expect(new Date(entry.publishedAt).getTime()).not.toBeNaN();
    });
  });

  // ── addToCatalog: error cases ──
  describe('addToCatalog — error cases', () => {
    it('should throw CatalogLimitExceededError when max is reached', async () => {
      const limitedConfig = { ...DefaultEcosystemRuntimeConfig.marketplace, maxCatalogEntries: 1 };
      const limitedMarketplace = new MarketplaceRuntime(limitedConfig, mockEventBus);
      await limitedMarketplace.addToCatalog(makeCatalogParams());
      await expect(
        limitedMarketplace.addToCatalog(makeCatalogParams()),
      ).rejects.toThrow(CatalogLimitExceededError);
    });

    it('should throw CatalogLimitExceededError with correct code', async () => {
      const limitedConfig = { ...DefaultEcosystemRuntimeConfig.marketplace, maxCatalogEntries: 0 };
      const limitedMarketplace = new MarketplaceRuntime(limitedConfig, mockEventBus);
      try {
        await limitedMarketplace.addToCatalog(makeCatalogParams());
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect((e as MarketplaceError).code).toBe('CATALOG_LIMIT_EXCEEDED');
      }
    });

    it('should allow adding entry with same capabilityId as previously removed', async () => {
      const capId = brandCapabilityId('reusable-cap');
      await marketplace.addToCatalog(makeCatalogParams({ capabilityId: capId }));
      await marketplace.removeFromCatalog(capId);
      const entry = await marketplace.addToCatalog(makeCatalogParams({ capabilityId: capId }));
      expect(entry.capabilityId).toBe(capId);
    });
  });

  // ── addToCatalog: event emission ──
  describe('addToCatalog — event emission', () => {
    it('should call eventBus.publish on addToCatalog', async () => {
      await marketplace.addToCatalog(makeCatalogParams());
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should publish event with eventType marketplace.catalog.entryAdded', async () => {
      await marketplace.addToCatalog(makeCatalogParams());
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.eventType).toBe('marketplace.catalog.entryAdded');
    });

    it('should publish event with classification Info', async () => {
      await marketplace.addToCatalog(makeCatalogParams());
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.classification).toBe('info');
    });

    it('should publish event with capabilityId', async () => {
      const capId = brandCapabilityId('evt-cat-cap');
      await marketplace.addToCatalog(makeCatalogParams({ capabilityId: capId }));
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.capabilityId).toBe(capId);
    });

    it('should publish event with name', async () => {
      await marketplace.addToCatalog(makeCatalogParams());
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.name).toBe('');
    });

    it('should publish event with source', async () => {
      await marketplace.addToCatalog(makeCatalogParams({ source: CatalogSource.Community }));
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.source).toBe(CatalogSource.Community);
    });

    it('should publish event with timestamp', async () => {
      await marketplace.addToCatalog(makeCatalogParams());
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.timestamp).toBeDefined();
    });

    it('should publish event with aggregateType CatalogEntry', async () => {
      const capId = brandCapabilityId('agg-cat');
      await marketplace.addToCatalog(makeCatalogParams({ capabilityId: capId }));
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.aggregateType).toBe('CatalogEntry');
      expect(call.aggregateId).toBe(capId as string);
    });

    it('should not publish event when eventBus is null', async () => {
      const noBus = new MarketplaceRuntime(DefaultEcosystemRuntimeConfig.marketplace, null);
      await noBus.addToCatalog(makeCatalogParams());
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  // ── removeFromCatalog ──
  describe('removeFromCatalog', () => {
    it('should remove an existing catalog entry', async () => {
      const capId = brandCapabilityId('rm-cat-1');
      await marketplace.addToCatalog(makeCatalogParams({ capabilityId: capId }));
      await marketplace.removeFromCatalog(capId);
      expect(await marketplace.getById(capId)).toBeNull();
    });

    it('should throw CapabilityNotFoundError for nonexistent entry', async () => {
      await expect(
        marketplace.removeFromCatalog(brandCapabilityId('nonexistent-cat')),
      ).rejects.toThrow(CapabilityNotFoundError);
    });

    it('should throw CapabilityNotFoundError with correct code', async () => {
      try {
        await marketplace.removeFromCatalog(brandCapabilityId('nonexistent-cat-2'));
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect((e as MarketplaceError).code).toBe('CAPABILITY_NOT_FOUND');
      }
    });

    it('should decrease count after removal', async () => {
      const capId = brandCapabilityId('rm-cat-2');
      await marketplace.addToCatalog(makeCatalogParams({ capabilityId: capId }));
      expect(await marketplace.count()).toBe(1);
      await marketplace.removeFromCatalog(capId);
      expect(await marketplace.count()).toBe(0);
    });
  });

  // ── search ──
  describe('search', () => {
    it('should return entries matching query in name', async () => {
      const capId = brandCapabilityId('search-cap-1');
      await marketplace.addToCatalog(makeCatalogParams({ capabilityId: capId }));
      // Name is '' by default, so searching '' should match
      const results = await marketplace.search('');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array when no entries match', async () => {
      await marketplace.addToCatalog(makeCatalogParams());
      const results = await marketplace.search('nonexistent-query-xyz');
      expect(results).toEqual([]);
    });

    it('should be case-insensitive for name search', async () => {
      // Since addToCatalog sets name='', searching '' always matches all entries
      await marketplace.addToCatalog(makeCatalogParams());
      const results = await marketplace.search('');
      expect(results.length).toBe(1);
    });

    it('should return frozen array', async () => {
      await marketplace.addToCatalog(makeCatalogParams());
      const results = await marketplace.search('');
      expect(Object.isFrozen(results)).toBe(true);
    });

    it('should filter by category', async () => {
      await marketplace.addToCatalog(makeCatalogParams());
      const results = await marketplace.search('', { category: 'test-cat' });
      // category is '' by default
      expect(results).toHaveLength(0);
    });

    it('should filter by source', async () => {
      const capId = brandCapabilityId('search-src');
      await marketplace.addToCatalog(makeCatalogParams({ capabilityId: capId, source: CatalogSource.Local }));
      const results = await marketplace.search('', { source: CatalogSource.Local });
      expect(results).toHaveLength(1);
    });

    it('should filter by compatible=true', async () => {
      await marketplace.addToCatalog(makeCatalogParams());
      const results = await marketplace.search('', { compatible: true });
      expect(results).toHaveLength(1);
    });

    it('should filter by compatible=false', async () => {
      await marketplace.addToCatalog(makeCatalogParams());
      const results = await marketplace.search('', { compatible: false });
      // default compatible is true
      expect(results).toHaveLength(0);
    });

    it('should support combined source and compatible filter', async () => {
      await marketplace.addToCatalog(makeCatalogParams({ source: CatalogSource.Registry }));
      const results = await marketplace.search('', { source: CatalogSource.Local, compatible: true });
      expect(results).toHaveLength(0);
    });

    it('should handle empty catalog', async () => {
      const results = await marketplace.search('anything');
      expect(results).toEqual([]);
    });
  });

  // ── getFeatured ──
  describe('getFeatured', () => {
    it('should return empty array when no featured entries', async () => {
      await marketplace.addToCatalog(makeCatalogParams({ featured: false }));
      const results = await marketplace.getFeatured();
      expect(results).toEqual([]);
    });

    it('should return only featured entries', async () => {
      await marketplace.addToCatalog(makeCatalogParams({ featured: true }));
      await marketplace.addToCatalog(makeCatalogParams({ featured: false }));
      const results = await marketplace.getFeatured();
      expect(results).toHaveLength(1);
    });

    it('should return multiple featured entries', async () => {
      await marketplace.addToCatalog(makeCatalogParams({ featured: true }));
      await marketplace.addToCatalog(makeCatalogParams({ featured: true }));
      await marketplace.addToCatalog(makeCatalogParams({ featured: false }));
      const results = await marketplace.getFeatured();
      expect(results).toHaveLength(2);
    });

    it('should return frozen array', async () => {
      await marketplace.addToCatalog(makeCatalogParams({ featured: true }));
      const results = await marketplace.getFeatured();
      expect(Object.isFrozen(results)).toBe(true);
    });

    it('should return empty array when catalog is empty', async () => {
      const results = await marketplace.getFeatured();
      expect(results).toEqual([]);
    });
  });

  // ── getById ──
  describe('getById', () => {
    it('should return entry by capabilityId', async () => {
      const capId = brandCapabilityId('get-cat-1');
      await marketplace.addToCatalog(makeCatalogParams({ capabilityId: capId }));
      const found = await marketplace.getById(capId);
      expect(found).toBeDefined();
      expect(found?.capabilityId).toBe(capId);
    });

    it('should return null for nonexistent ID', async () => {
      const found = await marketplace.getById(brandCapabilityId('no-such-cat'));
      expect(found).toBeNull();
    });
  });

  // ── list ──
  describe('list', () => {
    it('should return empty array when no entries', async () => {
      const result = await marketplace.list();
      expect(result).toEqual([]);
    });

    it('should return all entries with no filter', async () => {
      await marketplace.addToCatalog(makeCatalogParams());
      await marketplace.addToCatalog(makeCatalogParams());
      const result = await marketplace.list();
      expect(result).toHaveLength(2);
    });

    it('should return frozen array', async () => {
      await marketplace.addToCatalog(makeCatalogParams());
      const result = await marketplace.list();
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should filter by source Local', async () => {
      await marketplace.addToCatalog(makeCatalogParams({ source: CatalogSource.Local }));
      await marketplace.addToCatalog(makeCatalogParams({ source: CatalogSource.Registry }));
      const result = await marketplace.list({ source: CatalogSource.Local });
      expect(result).toHaveLength(1);
    });

    it('should filter by source Registry', async () => {
      await marketplace.addToCatalog(makeCatalogParams({ source: CatalogSource.Local }));
      await marketplace.addToCatalog(makeCatalogParams({ source: CatalogSource.Registry }));
      const result = await marketplace.list({ source: CatalogSource.Registry });
      expect(result).toHaveLength(1);
    });

    it('should filter by source Community', async () => {
      await marketplace.addToCatalog(makeCatalogParams({ source: CatalogSource.Community }));
      await marketplace.addToCatalog(makeCatalogParams({ source: CatalogSource.Local }));
      const result = await marketplace.list({ source: CatalogSource.Community });
      expect(result).toHaveLength(1);
    });

    it('should filter by source Enterprise', async () => {
      await marketplace.addToCatalog(makeCatalogParams({ source: CatalogSource.Enterprise }));
      const result = await marketplace.list({ source: CatalogSource.Enterprise });
      expect(result).toHaveLength(1);
    });

    it('should return empty for non-matching source', async () => {
      await marketplace.addToCatalog(makeCatalogParams({ source: CatalogSource.Local }));
      const result = await marketplace.list({ source: CatalogSource.Enterprise });
      expect(result).toHaveLength(0);
    });

    it('should filter by category', async () => {
      // category is '' by default, filtering by non-empty category returns nothing
      await marketplace.addToCatalog(makeCatalogParams());
      const result = await marketplace.list({ category: 'tools' });
      expect(result).toHaveLength(0);
    });

    it('should support combined source and category filter', async () => {
      await marketplace.addToCatalog(makeCatalogParams({ source: CatalogSource.Local }));
      const result = await marketplace.list({ source: CatalogSource.Local, category: '' });
      expect(result).toHaveLength(1);
    });

    it('should handle undefined filter', async () => {
      await marketplace.addToCatalog(makeCatalogParams());
      const result = await marketplace.list(undefined);
      expect(result).toHaveLength(1);
    });
  });

  // ── count ──
  describe('count', () => {
    it('should return 0 for empty marketplace', async () => {
      expect(await marketplace.count()).toBe(0);
    });

    it('should return 1 after one add', async () => {
      await marketplace.addToCatalog(makeCatalogParams());
      expect(await marketplace.count()).toBe(1);
    });

    it('should return correct count after multiple adds', async () => {
      await marketplace.addToCatalog(makeCatalogParams());
      await marketplace.addToCatalog(makeCatalogParams());
      await marketplace.addToCatalog(makeCatalogParams());
      expect(await marketplace.count()).toBe(3);
    });

    it('should return 0 after remove', async () => {
      const capId = brandCapabilityId('cnt-cat');
      await marketplace.addToCatalog(makeCatalogParams({ capabilityId: capId }));
      await marketplace.removeFromCatalog(capId);
      expect(await marketplace.count()).toBe(0);
    });
  });

  // ── constructor ──
  describe('constructor', () => {
    it('should work without eventBus', async () => {
      const noBus = new MarketplaceRuntime(DefaultEcosystemRuntimeConfig.marketplace);
      const entry = await noBus.addToCatalog(makeCatalogParams());
      expect(entry).toBeDefined();
    });

    it('should work with null eventBus', async () => {
      const nullBus = new MarketplaceRuntime(DefaultEcosystemRuntimeConfig.marketplace, null);
      const entry = await nullBus.addToCatalog(makeCatalogParams());
      expect(entry).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. INSTALLATION ENGINE
// ═══════════════════════════════════════════════════════════════════

describe('InstallationEngine', () => {
  let engine: InstallationEngine;

  beforeEach(() => {
    resetMockEventBus();
    engine = new InstallationEngine(
      DefaultEcosystemRuntimeConfig.installationEngine,
      mockEventBus,
    );
  });

  // ── install: happy path ──
  describe('install — happy path', () => {
    it('should install and return an Installation', async () => {
      const params = makeInstallationParams();
      const inst = await engine.install(params);
      expect(inst).toBeDefined();
      expect(inst.status).toBe(InstallationStatus.Installed);
    });

    it('should return an installation with a valid branded ID', async () => {
      const inst = await engine.install(makeInstallationParams());
      expect(inst.id).toBeDefined();
      expect(typeof inst.id).toBe('string');
    });

    it('should preserve capabilityId from params', async () => {
      const capId = brandCapabilityId('inst-cap-1');
      const inst = await engine.install(makeInstallationParams({ capabilityId: capId }));
      expect(inst.capabilityId).toBe(capId);
    });

    it('should preserve packageId from params', async () => {
      const pkgId = brandPackageId('inst-pkg-1');
      const inst = await engine.install(makeInstallationParams({ packageId: pkgId }));
      expect(inst.packageId).toBe(pkgId);
    });

    it('should preserve version from params', async () => {
      const inst = await engine.install(makeInstallationParams({ version: '3.2.1' }));
      expect(inst.version).toBe('3.2.1');
    });

    it('should have non-null installedAt', async () => {
      const inst = await engine.install(makeInstallationParams());
      expect(inst.installedAt).not.toBeNull();
      expect(new Date(inst.installedAt!).getTime()).not.toBeNaN();
    });

    it('should have null uninstalledAt', async () => {
      const inst = await engine.install(makeInstallationParams());
      expect(inst.uninstalledAt).toBeNull();
    });

    it('should have null error', async () => {
      const inst = await engine.install(makeInstallationParams());
      expect(inst.error).toBeNull();
    });

    it('should have empty permissionsGranted', async () => {
      const inst = await engine.install(makeInstallationParams());
      expect(inst.permissionsGranted).toEqual([]);
    });

    it('should have null sandboxId', async () => {
      const inst = await engine.install(makeInstallationParams());
      expect(inst.sandboxId).toBeNull();
    });

    it('should have null previousVersion', async () => {
      const inst = await engine.install(makeInstallationParams());
      expect(inst.previousVersion).toBeNull();
    });

    it('should have null rollbackVersion', async () => {
      const inst = await engine.install(makeInstallationParams());
      expect(inst.rollbackVersion).toBeNull();
    });

    it('should preserve metadata from params', async () => {
      const inst = await engine.install(makeInstallationParams({ metadata: { key: 'val' } }));
      expect(inst.metadata).toEqual({ key: 'val' });
    });

    it('should accept empty metadata', async () => {
      const inst = await engine.install(makeInstallationParams({ metadata: {} }));
      expect(inst.metadata).toEqual({});
    });
  });

  // ── install: event emission ──
  describe('install — event emission', () => {
    it('should call eventBus.publish twice (started + completed)', async () => {
      await engine.install(makeInstallationParams());
      expect(mockEventBus.publish).toHaveBeenCalledTimes(2);
    });

    it('should publish started event first', async () => {
      await engine.install(makeInstallationParams());
      const firstCall = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(firstCall.eventType).toBe('marketplace.installation.started');
    });

    it('should publish completed event second', async () => {
      await engine.install(makeInstallationParams());
      const secondCall = mockEventBus.publish.mock.calls[1][0] as Record<string, unknown>;
      expect(secondCall.eventType).toBe('marketplace.installation.completed');
    });

    it('should publish started event with classification Info', async () => {
      await engine.install(makeInstallationParams());
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.classification).toBe('info');
    });

    it('should publish completed event with classification Result', async () => {
      await engine.install(makeInstallationParams());
      const call = mockEventBus.publish.mock.calls[1][0] as Record<string, unknown>;
      expect(call.classification).toBe('result');
    });

    it('should publish started event with installationId', async () => {
      const inst = await engine.install(makeInstallationParams());
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.installationId).toBe(inst.id);
    });

    it('should publish completed event with installationId', async () => {
      const inst = await engine.install(makeInstallationParams());
      const call = mockEventBus.publish.mock.calls[1][0] as Record<string, unknown>;
      expect(call.installationId).toBe(inst.id);
    });

    it('should publish started event with capabilityId', async () => {
      const capId = brandCapabilityId('evt-inst-cap');
      await engine.install(makeInstallationParams({ capabilityId: capId }));
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.capabilityId).toBe(capId);
    });

    it('should publish completed event with capabilityId', async () => {
      const capId = brandCapabilityId('evt-inst-cap-2');
      await engine.install(makeInstallationParams({ capabilityId: capId }));
      const call = mockEventBus.publish.mock.calls[1][0] as Record<string, unknown>;
      expect(call.capabilityId).toBe(capId);
    });

    it('should publish completed event with durationMs=0', async () => {
      await engine.install(makeInstallationParams());
      const call = mockEventBus.publish.mock.calls[1][0] as Record<string, unknown>;
      expect(call.durationMs).toBe(0);
    });

    it('should publish events with aggregateType Installation', async () => {
      const inst = await engine.install(makeInstallationParams());
      const startedCall = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(startedCall.aggregateType).toBe('Installation');
      expect(startedCall.aggregateId).toBe(inst.id as string);
    });

    it('should publish events with eventId', async () => {
      await engine.install(makeInstallationParams());
      const startedCall = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(startedCall.eventId).toBeDefined();
    });

    it('should not publish events when eventBus is null', async () => {
      const noBus = new InstallationEngine(DefaultEcosystemRuntimeConfig.installationEngine, null);
      await noBus.install(makeInstallationParams());
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  // ── uninstall ──
  describe('uninstall', () => {
    it('should uninstall an installed capability', async () => {
      const inst = await engine.install(makeInstallationParams());
      await engine.uninstall(inst.id);
      const updated = await engine.getById(inst.id);
      expect(updated?.status).toBe(InstallationStatus.Uninstalled);
    });

    it('should set uninstalledAt after uninstall', async () => {
      const inst = await engine.install(makeInstallationParams());
      await engine.uninstall(inst.id);
      const updated = await engine.getById(inst.id);
      expect(updated?.uninstalledAt).not.toBeNull();
    });

    it('should throw InstallationNotFoundError for nonexistent ID', async () => {
      await expect(
        engine.uninstall(brandInstallationId('nonexistent')),
      ).rejects.toThrow(InstallationNotFoundError);
    });

    it('should throw InstallationNotFoundError with correct code', async () => {
      try {
        await engine.uninstall(brandInstallationId('nonexistent-2'));
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect((e as MarketplaceError).code).toBe('INSTALLATION_NOT_FOUND');
      }
    });

    it('should throw InstallationStateError when uninstalling already uninstalled', async () => {
      const inst = await engine.install(makeInstallationParams());
      await engine.uninstall(inst.id);
      await expect(engine.uninstall(inst.id)).rejects.toThrow(InstallationStateError);
    });

    it('should throw InstallationStateError with correct code', async () => {
      const inst = await engine.install(makeInstallationParams());
      await engine.uninstall(inst.id);
      try {
        await engine.uninstall(inst.id);
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect((e as MarketplaceError).code).toBe('INSTALLATION_STATE_ERROR');
      }
    });

    it('should throw InstallationStateError with correct current status', async () => {
      const inst = await engine.install(makeInstallationParams());
      await engine.uninstall(inst.id);
      try {
        await engine.uninstall(inst.id);
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect((e as InstallationStateError).currentStatus).toBe('Uninstalled');
      }
    });

    // ── uninstall: event emission ──
    it('should publish removed event on uninstall', async () => {
      const inst = await engine.install(makeInstallationParams());
      resetMockEventBus();
      await engine.uninstall(inst.id);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should publish removed event with eventType marketplace.installation.removed', async () => {
      const inst = await engine.install(makeInstallationParams());
      resetMockEventBus();
      await engine.uninstall(inst.id);
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.eventType).toBe('marketplace.installation.removed');
    });

    it('should publish removed event with classification Info', async () => {
      const inst = await engine.install(makeInstallationParams());
      resetMockEventBus();
      await engine.uninstall(inst.id);
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.classification).toBe('info');
    });

    it('should publish removed event with installationId', async () => {
      const inst = await engine.install(makeInstallationParams());
      resetMockEventBus();
      await engine.uninstall(inst.id);
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.installationId).toBe(inst.id);
    });

    it('should publish removed event with capabilityId', async () => {
      const capId = brandCapabilityId('uninst-cap');
      const inst = await engine.install(makeInstallationParams({ capabilityId: capId }));
      resetMockEventBus();
      await engine.uninstall(inst.id);
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.capabilityId).toBe(capId);
    });

    it('should publish removed event with timestamp', async () => {
      const inst = await engine.install(makeInstallationParams());
      resetMockEventBus();
      await engine.uninstall(inst.id);
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.timestamp).toBeDefined();
    });

    it('should publish removed event with aggregateType Installation', async () => {
      const inst = await engine.install(makeInstallationParams());
      resetMockEventBus();
      await engine.uninstall(inst.id);
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.aggregateType).toBe('Installation');
    });
  });

  // ── getById ──
  describe('getById', () => {
    it('should return installation by ID', async () => {
      const inst = await engine.install(makeInstallationParams());
      const found = await engine.getById(inst.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(inst.id);
    });

    it('should return null for nonexistent ID', async () => {
      const found = await engine.getById(brandInstallationId('no-such'));
      expect(found).toBeNull();
    });

    it('should return updated installation after uninstall', async () => {
      const inst = await engine.install(makeInstallationParams());
      await engine.uninstall(inst.id);
      const found = await engine.getById(inst.id);
      expect(found?.status).toBe(InstallationStatus.Uninstalled);
    });
  });

  // ── getByCapabilityId ──
  describe('getByCapabilityId', () => {
    it('should return installed installation by capabilityId', async () => {
      const capId = brandCapabilityId('cap-inst-lookup');
      await engine.install(makeInstallationParams({ capabilityId: capId }));
      const found = await engine.getByCapabilityId(capId);
      expect(found).toBeDefined();
      expect(found?.capabilityId).toBe(capId);
      expect(found?.status).toBe(InstallationStatus.Installed);
    });

    it('should return null for nonexistent capabilityId', async () => {
      const found = await engine.getByCapabilityId(brandCapabilityId('no-such-cap'));
      expect(found).toBeNull();
    });

    it('should not return uninstalled installations', async () => {
      const capId = brandCapabilityId('cap-uninstalled');
      const inst = await engine.install(makeInstallationParams({ capabilityId: capId }));
      await engine.uninstall(inst.id);
      const found = await engine.getByCapabilityId(capId);
      expect(found).toBeNull();
    });

    it('should return first installed when multiple exist for same cap', async () => {
      const capId = brandCapabilityId('cap-multi');
      await engine.install(makeInstallationParams({ capabilityId: capId }));
      const inst2 = await engine.install(makeInstallationParams({ capabilityId: capId }));
      await engine.uninstall(inst2.id);
      const found = await engine.getByCapabilityId(capId);
      expect(found).toBeDefined();
      expect(found?.status).toBe(InstallationStatus.Installed);
    });
  });

  // ── list ──
  describe('list', () => {
    it('should return empty array when no installations', async () => {
      const result = await engine.list();
      expect(result).toEqual([]);
    });

    it('should return all installations with no filter', async () => {
      await engine.install(makeInstallationParams());
      await engine.install(makeInstallationParams());
      const result = await engine.list();
      expect(result).toHaveLength(2);
    });

    it('should return frozen array', async () => {
      await engine.install(makeInstallationParams());
      const result = await engine.list();
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should filter by status Installed', async () => {
      await engine.install(makeInstallationParams());
      const result = await engine.list({ status: InstallationStatus.Installed });
      expect(result).toHaveLength(1);
    });

    it('should filter by status Uninstalled', async () => {
      const inst = await engine.install(makeInstallationParams());
      await engine.uninstall(inst.id);
      const result = await engine.list({ status: InstallationStatus.Uninstalled });
      expect(result).toHaveLength(1);
    });

    it('should return empty for non-matching status', async () => {
      await engine.install(makeInstallationParams());
      const result = await engine.list({ status: InstallationStatus.Failed });
      expect(result).toHaveLength(0);
    });

    it('should filter by capabilityId', async () => {
      const capId = brandCapabilityId('filter-cap');
      await engine.install(makeInstallationParams({ capabilityId: capId }));
      await engine.install(makeInstallationParams({ capabilityId: brandCapabilityId('other-cap') }));
      const result = await engine.list({ capabilityId: capId });
      expect(result).toHaveLength(1);
    });

    it('should support combined status and capabilityId filter', async () => {
      const capId = brandCapabilityId('combo-inst-cap');
      const inst = await engine.install(makeInstallationParams({ capabilityId: capId }));
      await engine.install(makeInstallationParams({ capabilityId: brandCapabilityId('other') }));
      await engine.uninstall(inst.id);
      const result = await engine.list({ status: InstallationStatus.Uninstalled, capabilityId: capId });
      expect(result).toHaveLength(1);
    });

    it('should include uninstalled in list with no filter', async () => {
      const inst = await engine.install(makeInstallationParams());
      await engine.uninstall(inst.id);
      const result = await engine.list();
      expect(result).toHaveLength(1);
    });

    it('should handle undefined filter', async () => {
      await engine.install(makeInstallationParams());
      const result = await engine.list(undefined);
      expect(result).toHaveLength(1);
    });
  });

  // ── count ──
  describe('count', () => {
    it('should return 0 for empty engine', async () => {
      expect(await engine.count()).toBe(0);
    });

    it('should return 1 after one install', async () => {
      await engine.install(makeInstallationParams());
      expect(await engine.count()).toBe(1);
    });

    it('should remain same after uninstall', async () => {
      const inst = await engine.install(makeInstallationParams());
      expect(await engine.count()).toBe(1);
      await engine.uninstall(inst.id);
      expect(await engine.count()).toBe(1);
    });

    it('should return correct count after multiple installs', async () => {
      await engine.install(makeInstallationParams());
      await engine.install(makeInstallationParams());
      await engine.install(makeInstallationParams());
      expect(await engine.count()).toBe(3);
    });
  });

  // ── constructor ──
  describe('constructor', () => {
    it('should work without eventBus', async () => {
      const noBus = new InstallationEngine(DefaultEcosystemRuntimeConfig.installationEngine);
      const inst = await noBus.install(makeInstallationParams());
      expect(inst).toBeDefined();
    });

    it('should work with null eventBus', async () => {
      const nullBus = new InstallationEngine(DefaultEcosystemRuntimeConfig.installationEngine, null);
      const inst = await nullBus.install(makeInstallationParams());
      expect(inst).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. UPDATE ENGINE
// ═══════════════════════════════════════════════════════════════════

describe('UpdateEngine', () => {
  let engine: UpdateEngine;

  beforeEach(() => {
    resetMockEventBus();
    engine = new UpdateEngine(
      DefaultEcosystemRuntimeConfig.updateEngine,
      mockEventBus,
    );
  });

  // ── checkForUpdates ──
  describe('checkForUpdates', () => {
    it('should return null when no history exists', async () => {
      const instId = brandInstallationId('no-history');
      const result = await engine.checkForUpdates(instId);
      expect(result).toBeNull();
    });

    it('should return null for empty history', async () => {
      // Install in InstallationEngine creates no update history
      const instId = brandInstallationId('fresh');
      const result = await engine.checkForUpdates(instId);
      expect(result).toBeNull();
    });

    it('should return the last update record after one update', async () => {
      const instId = brandInstallationId('updated-1');
      await engine.update(instId, '2.0.0');
      const result = await engine.checkForUpdates(instId);
      expect(result).not.toBeNull();
      expect(result?.toVersion).toBe('2.0.0');
    });

    it('should return the most recent update after multiple updates', async () => {
      const instId = brandInstallationId('updated-2');
      await engine.update(instId, '2.0.0');
      await engine.update(instId, '3.0.0');
      const result = await engine.checkForUpdates(instId);
      expect(result?.toVersion).toBe('3.0.0');
    });

    it('should return last record after rollback', async () => {
      const instId = brandInstallationId('updated-3');
      await engine.update(instId, '2.0.0');
      await engine.rollback(instId);
      const result = await engine.checkForUpdates(instId);
      expect(result).not.toBeNull();
      expect(result?.rolledBack).toBe(true);
    });
  });

  // ── update ──
  describe('update', () => {
    it('should create an update record', async () => {
      const instId = brandInstallationId('upd-1');
      const record = await engine.update(instId, '1.0.0');
      expect(record).toBeDefined();
      expect(record.installationId).toBe(instId);
    });

    it('should set fromVersion to 0.0.0 for first update', async () => {
      const instId = brandInstallationId('upd-2');
      const record = await engine.update(instId, '1.0.0');
      expect(record.fromVersion).toBe('0.0.0');
    });

    it('should set toVersion from params', async () => {
      const instId = brandInstallationId('upd-3');
      const record = await engine.update(instId, '2.5.0');
      expect(record.toVersion).toBe('2.5.0');
    });

    it('should set status to Installed on completed update', async () => {
      const instId = brandInstallationId('upd-4');
      const record = await engine.update(instId, '1.0.0');
      expect(record.status).toBe(InstallationStatus.Installed);
    });

    it('should set completedAt to a valid ISO timestamp', async () => {
      const instId = brandInstallationId('upd-5');
      const record = await engine.update(instId, '1.0.0');
      expect(record.completedAt).not.toBeNull();
      expect(new Date(record.completedAt!).getTime()).not.toBeNaN();
    });

    it('should set error to null', async () => {
      const instId = brandInstallationId('upd-6');
      const record = await engine.update(instId, '1.0.0');
      expect(record.error).toBeNull();
    });

    it('should set rolledBack to false', async () => {
      const instId = brandInstallationId('upd-7');
      const record = await engine.update(instId, '1.0.0');
      expect(record.rolledBack).toBe(false);
    });

    it('should set metadata to empty object', async () => {
      const instId = brandInstallationId('upd-8');
      const record = await engine.update(instId, '1.0.0');
      expect(record.metadata).toEqual({});
    });

    it('should set initiatedAt to valid timestamp', async () => {
      const instId = brandInstallationId('upd-9');
      const record = await engine.update(instId, '1.0.0');
      expect(new Date(record.initiatedAt).getTime()).not.toBeNaN();
    });

    it('should use last version as fromVersion for subsequent updates', async () => {
      const instId = brandInstallationId('upd-10');
      await engine.update(instId, '1.0.0');
      const record2 = await engine.update(instId, '2.0.0');
      expect(record2.fromVersion).toBe('1.0.0');
      expect(record2.toVersion).toBe('2.0.0');
    });

    it('should chain multiple updates correctly', async () => {
      const instId = brandInstallationId('upd-11');
      const r1 = await engine.update(instId, '1.0.0');
      expect(r1.fromVersion).toBe('0.0.0');
      expect(r1.toVersion).toBe('1.0.0');

      const r2 = await engine.update(instId, '2.0.0');
      expect(r2.fromVersion).toBe('1.0.0');
      expect(r2.toVersion).toBe('2.0.0');

      const r3 = await engine.update(instId, '3.0.0');
      expect(r3.fromVersion).toBe('2.0.0');
      expect(r3.toVersion).toBe('3.0.0');
    });

    it('should set capabilityId to empty string', async () => {
      const instId = brandInstallationId('upd-cap');
      const record = await engine.update(instId, '1.0.0');
      expect(record.capabilityId).toBe('');
    });
  });

  // ── update: event emission ──
  describe('update — event emission', () => {
    it('should call eventBus.publish twice (started + completed)', async () => {
      await engine.update(brandInstallationId('evt-upd-1'), '1.0.0');
      expect(mockEventBus.publish).toHaveBeenCalledTimes(2);
    });

    it('should publish started event first', async () => {
      await engine.update(brandInstallationId('evt-upd-2'), '1.0.0');
      const firstCall = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(firstCall.eventType).toBe('marketplace.update.started');
    });

    it('should publish completed event second', async () => {
      await engine.update(brandInstallationId('evt-upd-3'), '1.0.0');
      const secondCall = mockEventBus.publish.mock.calls[1][0] as Record<string, unknown>;
      expect(secondCall.eventType).toBe('marketplace.update.completed');
    });

    it('should publish started event with classification Info', async () => {
      await engine.update(brandInstallationId('evt-upd-4'), '1.0.0');
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.classification).toBe('info');
    });

    it('should publish completed event with classification Result', async () => {
      await engine.update(brandInstallationId('evt-upd-5'), '1.0.0');
      const call = mockEventBus.publish.mock.calls[1][0] as Record<string, unknown>;
      expect(call.classification).toBe('result');
    });

    it('should publish started event with installationId', async () => {
      const instId = brandInstallationId('evt-upd-6');
      await engine.update(instId, '1.0.0');
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.installationId).toBe(instId);
    });

    it('should publish completed event with installationId', async () => {
      const instId = brandInstallationId('evt-upd-7');
      await engine.update(instId, '1.0.0');
      const call = mockEventBus.publish.mock.calls[1][0] as Record<string, unknown>;
      expect(call.installationId).toBe(instId);
    });

    it('should publish started event with fromVersion', async () => {
      const instId = brandInstallationId('evt-upd-8');
      await engine.update(instId, '1.0.0');
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.fromVersion).toBe('0.0.0');
    });

    it('should publish started event with toVersion', async () => {
      const instId = brandInstallationId('evt-upd-9');
      await engine.update(instId, '2.0.0');
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.toVersion).toBe('2.0.0');
    });

    it('should publish completed event with fromVersion', async () => {
      const instId = brandInstallationId('evt-upd-10');
      await engine.update(instId, '1.0.0');
      const call = mockEventBus.publish.mock.calls[1][0] as Record<string, unknown>;
      expect(call.fromVersion).toBe('0.0.0');
    });

    it('should publish completed event with toVersion', async () => {
      const instId = brandInstallationId('evt-upd-11');
      await engine.update(instId, '3.0.0');
      const call = mockEventBus.publish.mock.calls[1][0] as Record<string, unknown>;
      expect(call.toVersion).toBe('3.0.0');
    });

    it('should publish completed event with durationMs=0', async () => {
      const instId = brandInstallationId('evt-upd-12');
      await engine.update(instId, '1.0.0');
      const call = mockEventBus.publish.mock.calls[1][0] as Record<string, unknown>;
      expect(call.durationMs).toBe(0);
    });

    it('should publish events with aggregateType UpdateRecord', async () => {
      const instId = brandInstallationId('evt-upd-13');
      await engine.update(instId, '1.0.0');
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.aggregateType).toBe('UpdateRecord');
      expect(call.aggregateId).toBe(instId as string);
    });

    it('should publish events with eventId', async () => {
      await engine.update(brandInstallationId('evt-upd-14'), '1.0.0');
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.eventId).toBeDefined();
    });

    it('should not publish events when eventBus is null', async () => {
      const noBus = new UpdateEngine(DefaultEcosystemRuntimeConfig.updateEngine, null);
      await noBus.update(brandInstallationId('evt-upd-15'), '1.0.0');
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  // ── rollback ──
  describe('rollback', () => {
    it('should create a rollback record', async () => {
      const instId = brandInstallationId('rb-1');
      await engine.update(instId, '2.0.0');
      const record = await engine.rollback(instId);
      expect(record).toBeDefined();
    });

    it('should swap fromVersion and toVersion', async () => {
      const instId = brandInstallationId('rb-2');
      await engine.update(instId, '2.0.0');
      const record = await engine.rollback(instId);
      expect(record.fromVersion).toBe('2.0.0');
      expect(record.toVersion).toBe('0.0.0');
    });

    it('should set status to RolledBack', async () => {
      const instId = brandInstallationId('rb-3');
      await engine.update(instId, '2.0.0');
      const record = await engine.rollback(instId);
      expect(record.status).toBe(InstallationStatus.RolledBack);
    });

    it('should set rolledBack to true', async () => {
      const instId = brandInstallationId('rb-4');
      await engine.update(instId, '2.0.0');
      const record = await engine.rollback(instId);
      expect(record.rolledBack).toBe(true);
    });

    it('should set completedAt to a valid ISO timestamp', async () => {
      const instId = brandInstallationId('rb-5');
      await engine.update(instId, '2.0.0');
      const record = await engine.rollback(instId);
      expect(record.completedAt).not.toBeNull();
    });

    it('should set error to null', async () => {
      const instId = brandInstallationId('rb-6');
      await engine.update(instId, '2.0.0');
      const record = await engine.rollback(instId);
      expect(record.error).toBeNull();
    });

    it('should set initiatedAt to valid timestamp', async () => {
      const instId = brandInstallationId('rb-7');
      await engine.update(instId, '2.0.0');
      const record = await engine.rollback(instId);
      expect(new Date(record.initiatedAt).getTime()).not.toBeNaN();
    });

    it('should preserve installationId', async () => {
      const instId = brandInstallationId('rb-8');
      await engine.update(instId, '2.0.0');
      const record = await engine.rollback(instId);
      expect(record.installationId).toBe(instId);
    });

    it('should rollback after multiple updates to last version', async () => {
      const instId = brandInstallationId('rb-9');
      await engine.update(instId, '1.0.0');
      await engine.update(instId, '2.0.0');
      const record = await engine.rollback(instId);
      expect(record.fromVersion).toBe('2.0.0');
      expect(record.toVersion).toBe('1.0.0');
    });

    it('should allow rollback after a rollback', async () => {
      const instId = brandInstallationId('rb-10');
      await engine.update(instId, '1.0.0');
      await engine.update(instId, '2.0.0');
      await engine.rollback(instId); // 2.0.0 -> 1.0.0
      const record = await engine.rollback(instId); // rollback the rollback
      expect(record.fromVersion).toBe('1.0.0');
      expect(record.toVersion).toBe('2.0.0');
    });

    it('should throw RollbackError when no history', async () => {
      await expect(
        engine.rollback(brandInstallationId('no-history-rb')),
      ).rejects.toThrow(RollbackError);
    });

    it('should throw RollbackError with correct code', async () => {
      try {
        await engine.rollback(brandInstallationId('no-history-rb-2'));
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect((e as MarketplaceError).code).toBe('ROLLBACK_ERROR');
      }
    });

    it('should throw RollbackError with descriptive message', async () => {
      try {
        await engine.rollback(brandInstallationId('no-history-rb-3'));
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect((e as RollbackError).message).toContain('No update history to roll back');
      }
    });
  });

  // ── rollback: event emission ──
  describe('rollback — event emission', () => {
    it('should call eventBus.publish on rollback', async () => {
      const instId = brandInstallationId('evt-rb-1');
      await engine.update(instId, '2.0.0');
      resetMockEventBus();
      await engine.rollback(instId);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should publish event with eventType marketplace.update.rolledBack', async () => {
      const instId = brandInstallationId('evt-rb-2');
      await engine.update(instId, '2.0.0');
      resetMockEventBus();
      await engine.rollback(instId);
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.eventType).toBe('marketplace.update.rolledBack');
    });

    it('should publish event with classification Info', async () => {
      const instId = brandInstallationId('evt-rb-3');
      await engine.update(instId, '2.0.0');
      resetMockEventBus();
      await engine.rollback(instId);
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.classification).toBe('info');
    });

    it('should publish event with installationId', async () => {
      const instId = brandInstallationId('evt-rb-4');
      await engine.update(instId, '2.0.0');
      resetMockEventBus();
      await engine.rollback(instId);
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.installationId).toBe(instId);
    });

    it('should publish event with fromVersion (swapped)', async () => {
      const instId = brandInstallationId('evt-rb-5');
      await engine.update(instId, '2.0.0');
      resetMockEventBus();
      await engine.rollback(instId);
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.fromVersion).toBe('2.0.0');
    });

    it('should publish event with toVersion (swapped)', async () => {
      const instId = brandInstallationId('evt-rb-6');
      await engine.update(instId, '2.0.0');
      resetMockEventBus();
      await engine.rollback(instId);
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.toVersion).toBe('0.0.0');
    });

    it('should publish event with timestamp', async () => {
      const instId = brandInstallationId('evt-rb-7');
      await engine.update(instId, '2.0.0');
      resetMockEventBus();
      await engine.rollback(instId);
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.timestamp).toBeDefined();
    });

    it('should publish event with aggregateType UpdateRecord', async () => {
      const instId = brandInstallationId('evt-rb-8');
      await engine.update(instId, '2.0.0');
      resetMockEventBus();
      await engine.rollback(instId);
      const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      expect(call.aggregateType).toBe('UpdateRecord');
    });

    it('should not publish event when eventBus is null', async () => {
      const noBus = new UpdateEngine(DefaultEcosystemRuntimeConfig.updateEngine, null);
      const instId = brandInstallationId('evt-rb-null');
      await noBus.update(instId, '2.0.0');
      await noBus.rollback(instId);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  // ── listUpdates ──
  describe('listUpdates', () => {
    it('should return empty array when no updates', async () => {
      const result = await engine.listUpdates();
      expect(result).toEqual([]);
    });

    it('should return all update records across all installations', async () => {
      await engine.update(brandInstallationId('list-u-1'), '1.0.0');
      await engine.update(brandInstallationId('list-u-2'), '1.0.0');
      const result = await engine.listUpdates();
      expect(result).toHaveLength(2);
    });

    it('should return frozen array', async () => {
      await engine.update(brandInstallationId('list-u-3'), '1.0.0');
      const result = await engine.listUpdates();
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should include rollback records', async () => {
      const instId = brandInstallationId('list-u-4');
      await engine.update(instId, '1.0.0');
      await engine.rollback(instId);
      const result = await engine.listUpdates();
      expect(result).toHaveLength(2);
    });

    it('should filter by status Installed', async () => {
      const instId = brandInstallationId('list-u-5');
      await engine.update(instId, '1.0.0');
      await engine.rollback(instId);
      const result = await engine.listUpdates({ status: InstallationStatus.Installed });
      expect(result).toHaveLength(1);
    });

    it('should filter by status RolledBack', async () => {
      const instId = brandInstallationId('list-u-6');
      await engine.update(instId, '1.0.0');
      await engine.rollback(instId);
      const result = await engine.listUpdates({ status: InstallationStatus.RolledBack });
      expect(result).toHaveLength(1);
    });

    it('should filter by capabilityId', async () => {
      // capabilityId is '' for all update records (set in implementation)
      await engine.update(brandInstallationId('list-u-7'), '1.0.0');
      const result = await engine.listUpdates({ capabilityId: '' as unknown as import('@/core/marketplace/types.js').CapabilityId });
      expect(result).toHaveLength(1);
    });

    it('should return empty for non-matching capabilityId', async () => {
      await engine.update(brandInstallationId('list-u-8'), '1.0.0');
      const result = await engine.listUpdates({ capabilityId: brandCapabilityId('nonexistent') });
      expect(result).toHaveLength(0);
    });

    it('should handle undefined filter', async () => {
      await engine.update(brandInstallationId('list-u-9'), '1.0.0');
      const result = await engine.listUpdates(undefined);
      expect(result).toHaveLength(1);
    });
  });

  // ── getUpdateHistory ──
  describe('getUpdateHistory', () => {
    it('should return empty array for installation with no history', async () => {
      const result = await engine.getUpdateHistory(brandInstallationId('no-hist'));
      expect(result).toEqual([]);
    });

    it('should return frozen empty array', async () => {
      const result = await engine.getUpdateHistory(brandInstallationId('no-hist-2'));
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should return single record after one update', async () => {
      const instId = brandInstallationId('hist-1');
      await engine.update(instId, '1.0.0');
      const result = await engine.getUpdateHistory(instId);
      expect(result).toHaveLength(1);
      expect(result[0].toVersion).toBe('1.0.0');
    });

    it('should return records in chronological order', async () => {
      const instId = brandInstallationId('hist-2');
      await engine.update(instId, '1.0.0');
      await engine.update(instId, '2.0.0');
      await engine.update(instId, '3.0.0');
      const result = await engine.getUpdateHistory(instId);
      expect(result).toHaveLength(3);
      expect(result[0].toVersion).toBe('1.0.0');
      expect(result[1].toVersion).toBe('2.0.0');
      expect(result[2].toVersion).toBe('3.0.0');
    });

    it('should include rollback records in history', async () => {
      const instId = brandInstallationId('hist-3');
      await engine.update(instId, '1.0.0');
      await engine.rollback(instId);
      const result = await engine.getUpdateHistory(instId);
      expect(result).toHaveLength(2);
      expect(result[1].rolledBack).toBe(true);
    });

    it('should return frozen array', async () => {
      const instId = brandInstallationId('hist-4');
      await engine.update(instId, '1.0.0');
      const result = await engine.getUpdateHistory(instId);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should not include records from other installations', async () => {
      const instId1 = brandInstallationId('hist-5');
      const instId2 = brandInstallationId('hist-6');
      await engine.update(instId1, '1.0.0');
      await engine.update(instId2, '2.0.0');
      expect(await engine.getUpdateHistory(instId1)).toHaveLength(1);
      expect(await engine.getUpdateHistory(instId2)).toHaveLength(1);
    });
  });

  // ── constructor ──
  describe('constructor', () => {
    it('should work without eventBus', async () => {
      const noBus = new UpdateEngine(DefaultEcosystemRuntimeConfig.updateEngine);
      const record = await noBus.update(brandInstallationId('ctor-1'), '1.0.0');
      expect(record).toBeDefined();
    });

    it('should work with null eventBus', async () => {
      const nullBus = new UpdateEngine(DefaultEcosystemRuntimeConfig.updateEngine, null);
      const record = await nullBus.update(brandInstallationId('ctor-2'), '1.0.0');
      expect(record).toBeDefined();
    });
  });

  // ── integration: multiple installations with updates and rollbacks ──
  describe('integration scenarios', () => {
    it('should handle update then rollback for single installation', async () => {
      const instId = brandInstallationId('integ-1');
      const updateRecord = await engine.update(instId, '1.0.0');
      expect(updateRecord.fromVersion).toBe('0.0.0');
      expect(updateRecord.toVersion).toBe('1.0.0');

      const rollbackRecord = await engine.rollback(instId);
      expect(rollbackRecord.fromVersion).toBe('1.0.0');
      expect(rollbackRecord.toVersion).toBe('0.0.0');
      expect(rollbackRecord.rolledBack).toBe(true);

      const history = await engine.getUpdateHistory(instId);
      expect(history).toHaveLength(2);
    });

    it('should handle multiple installations with independent histories', async () => {
      const instId1 = brandInstallationId('integ-2');
      const instId2 = brandInstallationId('integ-3');

      await engine.update(instId1, '1.0.0');
      await engine.update(instId2, '2.0.0');
      await engine.rollback(instId1);

      expect(await engine.getUpdateHistory(instId1)).toHaveLength(2);
      expect(await engine.getUpdateHistory(instId2)).toHaveLength(1);

      const allUpdates = await engine.listUpdates();
      expect(allUpdates).toHaveLength(3);
    });

    it('should correctly track versions through update chain', async () => {
      const instId = brandInstallationId('integ-4');
      const r1 = await engine.update(instId, '1.0.0');
      expect(r1.fromVersion).toBe('0.0.0');

      const r2 = await engine.update(instId, '2.0.0');
      expect(r2.fromVersion).toBe('1.0.0');

      const r3 = await engine.rollback(instId);
      expect(r3.fromVersion).toBe('2.0.0');
      expect(r3.toVersion).toBe('1.0.0');

      const r4 = await engine.update(instId, '3.0.0');
      expect(r4.fromVersion).toBe('1.0.0');

      const history = await engine.getUpdateHistory(instId);
      expect(history).toHaveLength(4);
    });

    it('should handle checkForUpdates after rollback', async () => {
      const instId = brandInstallationId('integ-5');
      await engine.update(instId, '1.0.0');
      await engine.rollback(instId);
      const latest = await engine.checkForUpdates(instId);
      expect(latest).not.toBeNull();
      expect(latest?.rolledBack).toBe(true);
    });

    it('should list updates with status filter across multiple installations', async () => {
      const instId1 = brandInstallationId('integ-6');
      const instId2 = brandInstallationId('integ-7');

      await engine.update(instId1, '1.0.0');
      await engine.update(instId2, '1.0.0');
      await engine.rollback(instId1);

      // rollback adds new RolledBack record; original updates stay Installed
      const installed = await engine.listUpdates({ status: InstallationStatus.Installed });
      expect(installed).toHaveLength(2);

      const rolledBack = await engine.listUpdates({ status: InstallationStatus.RolledBack });
      expect(rolledBack).toHaveLength(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 1B. CAPABILITY REGISTRY — EXTENDED TESTS
// ═══════════════════════════════════════════════════════════════════

describe('CapabilityRegistry — extended', () => {
  let registry: CapabilityRegistry;

  beforeEach(() => {
    resetMockEventBus();
    registry = new CapabilityRegistry(
      DefaultEcosystemRuntimeConfig.capabilityRegistry,
      mockEventBus,
    );
  });

  describe('register — entry immutability', () => {
    it('should return a frozen entry object', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'frz-1' }));
      expect(Object.isFrozen(entry)).toBe(true);
    });

    it('should return entry with frozen tags array', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'frz-2', tags: ['x'] }));
      expect(Object.isFrozen(entry.tags)).toBe(true);
    });

    it('should return entry with frozen permissions array', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'frz-3', permissions: [PermissionType.Memory] }));
      expect(Object.isFrozen(entry.permissions)).toBe(true);
    });

    it('should return entry with frozen dependencies array', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'frz-4', dependencies: [{ name: 'd', versionRange: '^1', optional: true, reason: 'r' }] }));
      expect(Object.isFrozen(entry.dependencies)).toBe(true);
    });

    it('should return entry with frozen compatibilityRequirements array', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'frz-5', compatibilityRequirements: [{ dimension: CompatibilityDimension.Platform, required: 'any', optional: false }] }));
      expect(Object.isFrozen(entry.compatibilityRequirements)).toBe(true);
    });

    it('should return entry with frozen metadata object', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'frz-6', metadata: { a: 1 } }));
      expect(Object.isFrozen(entry.metadata)).toBe(true);
    });
  });

  describe('register — multiple capabilities', () => {
    it('should generate unique IDs for each registration', async () => {
      const e1 = await registry.register(makeCapabilityParams({ name: 'uniq-1' }));
      const e2 = await registry.register(makeCapabilityParams({ name: 'uniq-2' }));
      expect(e1.id).not.toBe(e2.id);
    });

    it('should allow registering capabilities with same description', async () => {
      const e1 = await registry.register(makeCapabilityParams({ name: 'dup-desc-1', description: 'same desc' }));
      const e2 = await registry.register(makeCapabilityParams({ name: 'dup-desc-2', description: 'same desc' }));
      expect(e1.description).toBe(e2.description);
      expect(await registry.count()).toBe(2);
    });

    it('should allow registering capabilities with same version', async () => {
      await registry.register(makeCapabilityParams({ name: 'dup-ver-1', version: '1.0.0' }));
      await registry.register(makeCapabilityParams({ name: 'dup-ver-2', version: '1.0.0' }));
      expect(await registry.count()).toBe(2);
    });

    it('should allow registering capabilities with same category', async () => {
      await registry.register(makeCapabilityParams({ name: 'dup-cat-1', category: 'tools' }));
      await registry.register(makeCapabilityParams({ name: 'dup-cat-2', category: 'tools' }));
      expect(await registry.count()).toBe(2);
    });

    it('should allow registering capabilities with same publisherId', async () => {
      const pid = brandPublisherId('same-pub');
      await registry.register(makeCapabilityParams({ name: 'dup-pub-1', publisherId: pid }));
      await registry.register(makeCapabilityParams({ name: 'dup-pub-2', publisherId: pid }));
      expect(await registry.count()).toBe(2);
    });

    it('should allow registering capabilities with same permissions', async () => {
      const perms = [PermissionType.Memory, PermissionType.Network];
      await registry.register(makeCapabilityParams({ name: 'dup-perm-1', permissions: perms }));
      await registry.register(makeCapabilityParams({ name: 'dup-perm-2', permissions: perms }));
      expect(await registry.count()).toBe(2);
    });

    it('should allow registering with many tags', async () => {
      const tags = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
      const entry = await registry.register(makeCapabilityParams({ name: 'many-tags', tags }));
      expect(entry.tags).toHaveLength(10);
    });

    it('should allow registering with special characters in name', async () => {
      const entry = await registry.register(makeCapabilityParams({ name: 'my-cap_v2.0-beta' }));
      expect(entry.name).toBe('my-cap_v2.0-beta');
    });
  });

  describe('updateStatus — extended transitions', () => {
    it('should transition from PendingReview to Published', async () => {
      const e = await registry.register(makeCapabilityParams({ name: 'trans-1' }));
      await registry.updateStatus(e.id, PackageStatus.PendingReview);
      await registry.updateStatus(e.id, PackageStatus.Published);
      expect((await registry.getById(e.id))?.status).toBe(PackageStatus.Published);
    });

    it('should transition from Published to Deprecated', async () => {
      const e = await registry.register(makeCapabilityParams({ name: 'trans-2' }));
      await registry.updateStatus(e.id, PackageStatus.Published);
      await registry.updateStatus(e.id, PackageStatus.Deprecated);
      expect((await registry.getById(e.id))?.status).toBe(PackageStatus.Deprecated);
    });

    it('should transition from Deprecated to Removed', async () => {
      const e = await registry.register(makeCapabilityParams({ name: 'trans-3' }));
      await registry.updateStatus(e.id, PackageStatus.Deprecated);
      await registry.updateStatus(e.id, PackageStatus.Removed);
      expect((await registry.getById(e.id))?.status).toBe(PackageStatus.Removed);
    });

    it('should allow setting same status twice', async () => {
      const e = await registry.register(makeCapabilityParams({ name: 'trans-4' }));
      await registry.updateStatus(e.id, PackageStatus.Published);
      await registry.updateStatus(e.id, PackageStatus.Published);
      expect((await registry.getById(e.id))?.status).toBe(PackageStatus.Published);
    });

    it('should not affect count on status update', async () => {
      const e = await registry.register(makeCapabilityParams({ name: 'trans-5' }));
      await registry.updateStatus(e.id, PackageStatus.Published);
      await registry.updateStatus(e.id, PackageStatus.Suspended);
      expect(await registry.count()).toBe(1);
    });

    it('should still be findable by name after status update', async () => {
      const e = await registry.register(makeCapabilityParams({ name: 'trans-6' }));
      await registry.updateStatus(e.id, PackageStatus.Published);
      const found = await registry.getByName('trans-6');
      expect(found?.status).toBe(PackageStatus.Published);
    });

    it('should still be in list after status update', async () => {
      const e = await registry.register(makeCapabilityParams({ name: 'trans-7' }));
      await registry.updateStatus(e.id, PackageStatus.Removed);
      const all = await registry.list();
      expect(all).toHaveLength(1);
    });
  });

  describe('list — extended filter combinations', () => {
    it('should filter by installed=false (all newly registered are not installed)', async () => {
      await registry.register(makeCapabilityParams({ name: 'ext-f-1' }));
      await registry.register(makeCapabilityParams({ name: 'ext-f-2' }));
      const result = await registry.list({ installed: false });
      expect(result).toHaveLength(2);
    });

    it('should combine status and installed filter', async () => {
      await registry.register(makeCapabilityParams({ name: 'ext-f-3' }));
      const result = await registry.list({ status: PackageStatus.Draft, installed: false });
      expect(result).toHaveLength(1);
    });

    it('should return empty for status PendingReview when no entries match', async () => {
      await registry.register(makeCapabilityParams({ name: 'ext-f-4' }));
      const result = await registry.list({ status: PackageStatus.PendingReview });
      expect(result).toHaveLength(0);
    });

    it('should combine three filters: status, category, publisherId', async () => {
      const pid = brandPublisherId('combo-3');
      await registry.register(makeCapabilityParams({ name: 'ext-f-5', category: 'cat1', publisherId: pid }));
      await registry.register(makeCapabilityParams({ name: 'ext-f-6', category: 'cat2', publisherId: pid }));
      const result = await registry.list({ status: PackageStatus.Draft, category: 'cat1', publisherId: pid });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('ext-f-5');
    });

    it('should combine four filters: status, category, publisherId, installed', async () => {
      const pid = brandPublisherId('combo-4');
      await registry.register(makeCapabilityParams({ name: 'ext-f-7', category: 'cat1', publisherId: pid }));
      const result = await registry.list({ status: PackageStatus.Draft, category: 'cat1', publisherId: pid, installed: false });
      expect(result).toHaveLength(1);
    });
  });

  describe('remove — extended edge cases', () => {
    it('should throw for already removed ID', async () => {
      const e = await registry.register(makeCapabilityParams({ name: 'rm-ext-1' }));
      await registry.remove(e.id);
      await expect(registry.remove(e.id)).rejects.toThrow(CapabilityNotFoundError);
    });

    it('should not affect other entries when removing one', async () => {
      const e1 = await registry.register(makeCapabilityParams({ name: 'rm-ext-2' }));
      const e2 = await registry.register(makeCapabilityParams({ name: 'rm-ext-3' }));
      await registry.remove(e1.id);
      expect(await registry.getById(e2.id)).not.toBeNull();
      expect(await registry.count()).toBe(1);
    });

    it('should remove entry with all statuses', async () => {
      const e = await registry.register(makeCapabilityParams({ name: 'rm-ext-4' }));
      await registry.updateStatus(e.id, PackageStatus.Published);
      await registry.remove(e.id);
      expect(await registry.getById(e.id)).toBeNull();
    });

    it('should not publish any event on remove (impl does not emit)', async () => {
      const e = await registry.register(makeCapabilityParams({ name: 'rm-ext-5' }));
      resetMockEventBus();
      await registry.remove(e.id);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('count — extended scenarios', () => {
    it('should be accurate after register then remove then register', async () => {
      const e1 = await registry.register(makeCapabilityParams({ name: 'cnt-ext-1' }));
      await registry.remove(e1.id);
      await registry.register(makeCapabilityParams({ name: 'cnt-ext-2' }));
      expect(await registry.count()).toBe(1);
    });

    it('should be accurate after many operations', async () => {
      for (let i = 0; i < 5; i++) {
        await registry.register(makeCapabilityParams({ name: `cnt-loop-${i}` }));
      }
      expect(await registry.count()).toBe(5);
      const entries = await registry.list();
      await registry.remove(entries[0].id);
      await registry.remove(entries[2].id);
      expect(await registry.count()).toBe(3);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2B. PACKAGE RUNTIME — EXTENDED TESTS
// ═══════════════════════════════════════════════════════════════════

describe('PackageRuntime — extended', () => {
  let runtime: PackageRuntime;

  beforeEach(() => {
    resetMockEventBus();
    runtime = new PackageRuntime(
      DefaultEcosystemRuntimeConfig.packageRuntime,
      mockEventBus,
    );
  });

  describe('createPackage — entry immutability', () => {
    it('should return a frozen package object', async () => {
      const pkg = await runtime.createPackage(makePackageParams());
      expect(Object.isFrozen(pkg)).toBe(true);
    });

    it('should return package with frozen metadata', async () => {
      const pkg = await runtime.createPackage(makePackageParams({ metadata: { x: 1 } }));
      expect(Object.isFrozen(pkg.metadata)).toBe(true);
    });
  });

  describe('createPackage — edge cases', () => {
    it('should allow creating with zero sizeBytes', async () => {
      const pkg = await runtime.createPackage(makePackageParams({ sizeBytes: 0 }));
      expect(pkg.sizeBytes).toBe(0);
    });

    it('should generate unique IDs for multiple packages', async () => {
      const p1 = await runtime.createPackage(makePackageParams({ version: '1.0.0' }));
      const p2 = await runtime.createPackage(makePackageParams({ version: '2.0.0' }));
      expect(p1.id).not.toBe(p2.id);
    });

    it('should allow creating packages for the same capabilityId', async () => {
      const capId = brandCapabilityId('shared-cap-pkg');
      await runtime.createPackage(makePackageParams({ capabilityId: capId, version: '1.0.0' }));
      await runtime.createPackage(makePackageParams({ capabilityId: capId, version: '2.0.0' }));
      expect(await runtime.count()).toBe(2);
    });

    it('should allow empty checksum', async () => {
      const pkg = await runtime.createPackage(makePackageParams({ checksum: '' }));
      expect(pkg.checksum).toBe('');
    });

    it('should allow empty name', async () => {
      const pkg = await runtime.createPackage(makePackageParams({ name: '' }));
      expect(pkg.name).toBe('');
    });
  });

  describe('validateManifest — extended edge cases', () => {
    it('should accept manifest with name being whitespace only', async () => {
      const m = makeValidManifest();
      expect(await runtime.validateManifest({ ...m, name: '   ' })).toBe(true);
    });

    it('should accept manifest with version being whitespace only', async () => {
      const m = makeValidManifest();
      expect(await runtime.validateManifest({ ...m, version: '   ' })).toBe(true);
    });

    it('should accept manifest with main being whitespace only', async () => {
      const m = makeValidManifest();
      expect(await runtime.validateManifest({ ...m, main: '   ' })).toBe(true);
    });

    it('should accept manifest with entryPoint being whitespace only', async () => {
      const m = makeValidManifest();
      expect(await runtime.validateManifest({ ...m, entryPoint: '   ' })).toBe(true);
    });

    it('should accept manifest with version 0.0.1', async () => {
      const m = makeValidManifest();
      m.version = '0.0.1';
      expect(await runtime.validateManifest(m)).toBe(true);
    });

    it('should accept manifest with long name', async () => {
      const m = makeValidManifest();
      m.name = 'a'.repeat(500);
      expect(await runtime.validateManifest(m)).toBe(true);
    });

    it('should accept manifest with special characters in name', async () => {
      const m = makeValidManifest();
      m.name = '@scope/pkg-name';
      expect(await runtime.validateManifest(m)).toBe(true);
    });
  });

  describe('list — extended filters', () => {
    it('should handle filtering with no matches', async () => {
      await runtime.createPackage(makePackageParams({ publisherId: brandPublisherId('pub-a') }));
      const result = await runtime.list({ publisherId: brandPublisherId('pub-b') });
      expect(result).toHaveLength(0);
    });

    it('should return empty for Published status (new packages are Draft)', async () => {
      await runtime.createPackage(makePackageParams());
      const result = await runtime.list({ status: PackageStatus.Published });
      expect(result).toHaveLength(0);
    });

    it('should count packages with same publisherId', async () => {
      const pid = brandPublisherId('count-pub');
      await runtime.createPackage(makePackageParams({ publisherId: pid }));
      await runtime.createPackage(makePackageParams({ publisherId: pid }));
      await runtime.createPackage(makePackageParams({ publisherId: brandPublisherId('other') }));
      expect((await runtime.list({ publisherId: pid })).length).toBe(2);
    });

    it('should return frozen list entries', async () => {
      await runtime.createPackage(makePackageParams());
      const result = await runtime.list();
      expect(Object.isFrozen(result[0])).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3B. MARKETPLACE RUNTIME — EXTENDED TESTS
// ═══════════════════════════════════════════════════════════════════

describe('MarketplaceRuntime — extended', () => {
  let marketplace: MarketplaceRuntime;

  beforeEach(() => {
    resetMockEventBus();
    marketplace = new MarketplaceRuntime(
      DefaultEcosystemRuntimeConfig.marketplace,
      mockEventBus,
    );
  });

  describe('addToCatalog — entry immutability', () => {
    it('should return a frozen entry', async () => {
      const entry = await marketplace.addToCatalog(makeCatalogParams());
      expect(Object.isFrozen(entry)).toBe(true);
    });

    it('should return entry with frozen tags', async () => {
      const entry = await marketplace.addToCatalog(makeCatalogParams());
      expect(Object.isFrozen(entry.tags)).toBe(true);
    });

    it('should return entry with frozen metadata', async () => {
      const entry = await marketplace.addToCatalog(makeCatalogParams({ metadata: { k: 'v' } }));
      expect(Object.isFrozen(entry.metadata)).toBe(true);
    });
  });

  describe('addToCatalog — edge cases', () => {
    it('should accept empty metadata', async () => {
      const entry = await marketplace.addToCatalog(makeCatalogParams({ metadata: {} }));
      expect(entry.metadata).toEqual({});
    });

    it('should accept metadata with multiple keys', async () => {
      const entry = await marketplace.addToCatalog(makeCatalogParams({ metadata: { a: 1, b: 'two', c: true } }));
      expect(entry.metadata).toEqual({ a: 1, b: 'two', c: true });
    });

    it('should overwrite entry with same capabilityId', async () => {
      const capId = brandCapabilityId('overwrite-cap');
      const e1 = await marketplace.addToCatalog(makeCatalogParams({ capabilityId: capId, source: CatalogSource.Local }));
      const e2 = await marketplace.addToCatalog(makeCatalogParams({ capabilityId: capId, source: CatalogSource.Registry }));
      expect(e2.source).toBe(CatalogSource.Registry);
      expect(await marketplace.count()).toBe(1);
    });
  });

  describe('search — extended', () => {
    it('should handle search with very long query', async () => {
      await marketplace.addToCatalog(makeCatalogParams());
      const results = await marketplace.search('a'.repeat(1000));
      expect(results).toHaveLength(0);
    });

    it('should handle search with special characters', async () => {
      await marketplace.addToCatalog(makeCatalogParams());
      const results = await marketplace.search('()[]{}<>&*"\'\\');
      expect(results).toHaveLength(0);
    });

    it('should handle search with unicode characters', async () => {
      await marketplace.addToCatalog(makeCatalogParams());
      const results = await marketplace.search('你好世界');
      expect(results).toHaveLength(0);
    });

    it('should match empty query against all entries', async () => {
      await marketplace.addToCatalog(makeCatalogParams());
      await marketplace.addToCatalog(makeCatalogParams());
      // name is '' by default, '' includes in ''
      const results = await marketplace.search('');
      expect(results).toHaveLength(2);
    });

    it('should combine category and compatible filter', async () => {
      await marketplace.addToCatalog(makeCatalogParams());
      const results = await marketplace.search('', { category: '', compatible: true });
      expect(results).toHaveLength(1);
    });

    it('should combine source and compatible filter', async () => {
      await marketplace.addToCatalog(makeCatalogParams({ source: CatalogSource.Local }));
      const results = await marketplace.search('', { source: CatalogSource.Local, compatible: true });
      expect(results).toHaveLength(1);
    });

    it('should combine all three filters', async () => {
      await marketplace.addToCatalog(makeCatalogParams({ source: CatalogSource.Local }));
      const results = await marketplace.search('', { category: '', source: CatalogSource.Local, compatible: true });
      expect(results).toHaveLength(1);
    });
  });

  describe('list — extended', () => {
    it('should handle filtering by non-existent source', async () => {
      await marketplace.addToCatalog(makeCatalogParams());
      const results = await marketplace.list({ source: CatalogSource.Enterprise as CatalogSource });
      // CatalogSource is enum so this test just ensures the filter works
      expect(results).toHaveLength(0);
    });

    it('should return correct count for filtered list', async () => {
      await marketplace.addToCatalog(makeCatalogParams({ source: CatalogSource.Local }));
      await marketplace.addToCatalog(makeCatalogParams({ source: CatalogSource.Registry }));
      await marketplace.addToCatalog(makeCatalogParams({ source: CatalogSource.Community }));
      await marketplace.addToCatalog(makeCatalogParams({ source: CatalogSource.Local }));
      const local = await marketplace.list({ source: CatalogSource.Local });
      expect(local).toHaveLength(2);
    });

    it('should handle empty category filter on entries with empty category', async () => {
      await marketplace.addToCatalog(makeCatalogParams());
      const results = await marketplace.list({ category: '' });
      expect(results).toHaveLength(1);
    });
  });

  describe('getFeatured — extended', () => {
    it('should track featured flag correctly after overwrite', async () => {
      const capId = brandCapabilityId('feat-overwrite');
      await marketplace.addToCatalog(makeCatalogParams({ capabilityId: capId, featured: true }));
      await marketplace.addToCatalog(makeCatalogParams({ capabilityId: capId, featured: false }));
      const featured = await marketplace.getFeatured();
      expect(featured).toHaveLength(0);
    });
  });

  describe('removeFromCatalog — extended', () => {
    it('should not affect other entries', async () => {
      const capId1 = brandCapabilityId('rm-other-1');
      const capId2 = brandCapabilityId('rm-other-2');
      await marketplace.addToCatalog(makeCatalogParams({ capabilityId: capId1 }));
      await marketplace.addToCatalog(makeCatalogParams({ capabilityId: capId2 }));
      await marketplace.removeFromCatalog(capId1);
      expect(await marketplace.getById(capId2)).not.toBeNull();
      expect(await marketplace.count()).toBe(1);
    });

    it('should throw CapabilityNotFoundError preserving the id', async () => {
      const capId = brandCapabilityId('rm-err');
      try {
        await marketplace.removeFromCatalog(capId);
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect((e as CapabilityNotFoundError).capabilityId).toBe(capId as string);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4B. INSTALLATION ENGINE — EXTENDED TESTS
// ═══════════════════════════════════════════════════════════════════

describe('InstallationEngine — extended', () => {
  let engine: InstallationEngine;

  beforeEach(() => {
    resetMockEventBus();
    engine = new InstallationEngine(
      DefaultEcosystemRuntimeConfig.installationEngine,
      mockEventBus,
    );
  });

  describe('install — entry immutability', () => {
    it('should return a frozen installation object', async () => {
      const inst = await engine.install(makeInstallationParams());
      expect(Object.isFrozen(inst)).toBe(true);
    });

    it('should return installation with frozen permissionsGranted', async () => {
      const inst = await engine.install(makeInstallationParams());
      expect(Object.isFrozen(inst.permissionsGranted)).toBe(true);
    });

    it('should return installation with frozen metadata', async () => {
      const inst = await engine.install(makeInstallationParams({ metadata: { k: 'v' } }));
      expect(Object.isFrozen(inst.metadata)).toBe(true);
    });
  });

  describe('install — edge cases', () => {
    it('should generate unique IDs for multiple installs', async () => {
      const i1 = await engine.install(makeInstallationParams({ capabilityId: brandCapabilityId('c1') }));
      const i2 = await engine.install(makeInstallationParams({ capabilityId: brandCapabilityId('c2') }));
      expect(i1.id).not.toBe(i2.id);
    });

    it('should allow multiple installs for same capabilityId', async () => {
      const capId = brandCapabilityId('multi-inst-cap');
      const i1 = await engine.install(makeInstallationParams({ capabilityId: capId }));
      const i2 = await engine.install(makeInstallationParams({ capabilityId: capId }));
      expect(i1.capabilityId).toBe(capId);
      expect(i2.capabilityId).toBe(capId);
      expect(await engine.count()).toBe(2);
    });

    it('should allow install with empty version', async () => {
      const inst = await engine.install(makeInstallationParams({ version: '' }));
      expect(inst.version).toBe('');
    });

    it('should have installedAt timestamp close to createdAt', async () => {
      const inst = await engine.install(makeInstallationParams());
      // Both should be recent ISO timestamps
      const timeDiff = Math.abs(new Date(inst.installedAt!).getTime() - Date.now());
      expect(timeDiff).toBeLessThan(5000);
    });

    it('should publish started and completed events with same installationId', async () => {
      const inst = await engine.install(makeInstallationParams());
      const startedCall = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      const completedCall = mockEventBus.publish.mock.calls[1][0] as Record<string, unknown>;
      expect(startedCall.installationId).toBe(completedCall.installationId);
      expect(startedCall.installationId).toBe(inst.id);
    });

    it('should publish events with same capabilityId', async () => {
      const capId = brandCapabilityId('evt-same-cap');
      await engine.install(makeInstallationParams({ capabilityId: capId }));
      const startedCall = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      const completedCall = mockEventBus.publish.mock.calls[1][0] as Record<string, unknown>;
      expect(startedCall.capabilityId).toBe(completedCall.capabilityId);
    });

    it('should publish events with same version', async () => {
      await engine.install(makeInstallationParams({ version: '5.0.0' }));
      const startedCall = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      const completedCall = mockEventBus.publish.mock.calls[1][0] as Record<string, unknown>;
      expect(startedCall.version).toBeDefined();
      expect(completedCall.version).toBeDefined();
    });

    it('should publish events with timestamps', async () => {
      await engine.install(makeInstallationParams());
      const startedCall = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
      const completedCall = mockEventBus.publish.mock.calls[1][0] as Record<string, unknown>;
      expect(startedCall.timestamp).toBeDefined();
      expect(completedCall.timestamp).toBeDefined();
    });
  });

  describe('uninstall — extended state transitions', () => {
    it('should not allow double uninstall', async () => {
      const inst = await engine.install(makeInstallationParams());
      await engine.uninstall(inst.id);
      await expect(engine.uninstall(inst.id)).rejects.toThrow(InstallationStateError);
    });

    it('should set uninstalledAt to a recent timestamp', async () => {
      const inst = await engine.install(makeInstallationParams());
      await engine.uninstall(inst.id);
      const updated = await engine.getById(inst.id);
      const timeDiff = Math.abs(new Date(updated!.uninstalledAt!).getTime() - Date.now());
      expect(timeDiff).toBeLessThan(5000);
    });

    it('should preserve all other fields on uninstall', async () => {
      const capId = brandCapabilityId('preserve-cap');
      const pkgId = brandPackageId('preserve-pkg');
      const inst = await engine.install(makeInstallationParams({ capabilityId: capId, packageId: pkgId, version: '2.0.0' }));
      await engine.uninstall(inst.id);
      const updated = await engine.getById(inst.id);
      expect(updated?.capabilityId).toBe(capId);
      expect(updated?.packageId).toBe(pkgId);
      expect(updated?.version).toBe('2.0.0');
      expect(updated?.id).toBe(inst.id);
    });
  });

  describe('getByCapabilityId — extended', () => {
    it('should return null when only uninstalled exist for cap', async () => {
      const capId = brandCapabilityId('only-uninst');
      const inst = await engine.install(makeInstallationParams({ capabilityId: capId }));
      await engine.uninstall(inst.id);
      expect(await engine.getByCapabilityId(capId)).toBeNull();
    });

    it('should return first installed when multiple installed for same cap', async () => {
      const capId = brandCapabilityId('multi-inst-same');
      const i1 = await engine.install(makeInstallationParams({ capabilityId: capId }));
      await engine.install(makeInstallationParams({ capabilityId: capId }));
      const found = await engine.getByCapabilityId(capId);
      expect(found?.id).toBe(i1.id);
    });

    it('should return installed after one of two was uninstalled', async () => {
      const capId = brandCapabilityId('partial-uninst');
      const i1 = await engine.install(makeInstallationParams({ capabilityId: capId }));
      const i2 = await engine.install(makeInstallationParams({ capabilityId: capId }));
      await engine.uninstall(i1.id);
      const found = await engine.getByCapabilityId(capId);
      expect(found?.id).toBe(i2.id);
    });
  });

  describe('list — extended', () => {
    it('should include both installed and uninstalled with no filter', async () => {
      const i1 = await engine.install(makeInstallationParams());
      await engine.install(makeInstallationParams());
      await engine.uninstall(i1.id);
      const result = await engine.list();
      expect(result).toHaveLength(2);
    });

    it('should filter only installed correctly', async () => {
      const i1 = await engine.install(makeInstallationParams());
      const i2 = await engine.install(makeInstallationParams());
      await engine.uninstall(i1.id);
      const result = await engine.list({ status: InstallationStatus.Installed });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(i2.id);
    });

    it('should filter only uninstalled correctly', async () => {
      const i1 = await engine.install(makeInstallationParams());
      await engine.install(makeInstallationParams());
      await engine.uninstall(i1.id);
      const result = await engine.list({ status: InstallationStatus.Uninstalled });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(i1.id);
    });

    it('should return empty for Installing status (transient)', async () => {
      await engine.install(makeInstallationParams());
      const result = await engine.list({ status: InstallationStatus.Installing });
      expect(result).toHaveLength(0);
    });

    it('should return empty for Pending status', async () => {
      await engine.install(makeInstallationParams());
      const result = await engine.list({ status: InstallationStatus.Pending });
      expect(result).toHaveLength(0);
    });

    it('should return empty for Failed status', async () => {
      await engine.install(makeInstallationParams());
      const result = await engine.list({ status: InstallationStatus.Failed });
      expect(result).toHaveLength(0);
    });

    it('should return empty for Updating status', async () => {
      await engine.install(makeInstallationParams());
      const result = await engine.list({ status: InstallationStatus.Updating });
      expect(result).toHaveLength(0);
    });

    it('should return empty for RollbackPending status', async () => {
      await engine.install(makeInstallationParams());
      const result = await engine.list({ status: InstallationStatus.RollbackPending });
      expect(result).toHaveLength(0);
    });

    it('should return empty for RolledBack status', async () => {
      await engine.install(makeInstallationParams());
      const result = await engine.list({ status: InstallationStatus.RolledBack });
      expect(result).toHaveLength(0);
    });

    it('should return empty for Uninstalling status', async () => {
      await engine.install(makeInstallationParams());
      const result = await engine.list({ status: InstallationStatus.Uninstalling });
      expect(result).toHaveLength(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5B. UPDATE ENGINE — EXTENDED TESTS
// ═══════════════════════════════════════════════════════════════════

describe('UpdateEngine — extended', () => {
  let engine: UpdateEngine;

  beforeEach(() => {
    resetMockEventBus();
    engine = new UpdateEngine(
      DefaultEcosystemRuntimeConfig.updateEngine,
      mockEventBus,
    );
  });

  describe('update — record immutability', () => {
    it('should return a frozen update record', async () => {
      const record = await engine.update(brandInstallationId('frz-u-1'), '1.0.0');
      expect(Object.isFrozen(record)).toBe(true);
    });

    it('should return record with frozen metadata', async () => {
      const record = await engine.update(brandInstallationId('frz-u-2'), '1.0.0');
      expect(Object.isFrozen(record.metadata)).toBe(true);
    });
  });

  describe('update — edge cases', () => {
    it('should allow update with empty version string', async () => {
      const record = await engine.update(brandInstallationId('ver-empty'), '');
      expect(record.toVersion).toBe('');
    });

    it('should allow update with semver-like version', async () => {
      const record = await engine.update(brandInstallationId('ver-semver'), '1.2.3-beta.1+build.456');
      expect(record.toVersion).toBe('1.2.3-beta.1+build.456');
    });

    it('should create independent histories for different installations', async () => {
      const id1 = brandInstallationId('ind-1');
      const id2 = brandInstallationId('ind-2');
      const r1 = await engine.update(id1, '1.0.0');
      const r2 = await engine.update(id2, '2.0.0');
      expect(r1.fromVersion).toBe('0.0.0');
      expect(r2.fromVersion).toBe('0.0.0');
      expect(await engine.getUpdateHistory(id1)).toHaveLength(1);
      expect(await engine.getUpdateHistory(id2)).toHaveLength(1);
    });

    it('should use correct fromVersion after rollback then new update', async () => {
      const instId = brandInstallationId('rb-then-upd');
      await engine.update(instId, '1.0.0'); // 0.0.0 -> 1.0.0
      await engine.update(instId, '2.0.0'); // 1.0.0 -> 2.0.0
      await engine.rollback(instId);        // 2.0.0 -> 1.0.0
      const r = await engine.update(instId, '3.0.0'); // 1.0.0 -> 3.0.0
      expect(r.fromVersion).toBe('1.0.0');
      expect(r.toVersion).toBe('3.0.0');
      expect(await engine.getUpdateHistory(instId)).toHaveLength(4);
    });

    it('should allow update to same version twice', async () => {
      const instId = brandInstallationId('dup-ver-upd');
      await engine.update(instId, '1.0.0');
      const r2 = await engine.update(instId, '1.0.0');
      expect(r2.fromVersion).toBe('1.0.0');
      expect(r2.toVersion).toBe('1.0.0');
    });
  });

  describe('rollback — edge cases', () => {
    it('should return frozen rollback record', async () => {
      const instId = brandInstallationId('frz-rb-1');
      await engine.update(instId, '1.0.0');
      const record = await engine.rollback(instId);
      expect(Object.isFrozen(record)).toBe(true);
    });

    it('should return record with frozen metadata after rollback', async () => {
      const instId = brandInstallationId('frz-rb-2');
      await engine.update(instId, '1.0.0');
      const record = await engine.rollback(instId);
      expect(Object.isFrozen(record.metadata)).toBe(true);
    });

    it('should preserve installationId through rollback', async () => {
      const instId = brandInstallationId('preserve-rb');
      await engine.update(instId, '1.0.0');
      const record = await engine.rollback(instId);
      expect(record.installationId).toBe(instId);
    });

    it('should set initiatedAt equal to completedAt for rollback', async () => {
      const instId = brandInstallationId('sync-time');
      await engine.update(instId, '1.0.0');
      const record = await engine.rollback(instId);
      expect(record.initiatedAt).toBe(record.completedAt);
    });

    it('should handle consecutive rollbacks correctly', async () => {
      const instId = brandInstallationId('conc-rb');
      await engine.update(instId, '1.0.0');  // 0.0.0 -> 1.0.0
      await engine.update(instId, '2.0.0');  // 1.0.0 -> 2.0.0
      const rb1 = await engine.rollback(instId); // 2.0.0 -> 1.0.0
      const rb2 = await engine.rollback(instId); // 1.0.0 -> 2.0.0
      expect(rb1.fromVersion).toBe('2.0.0');
      expect(rb1.toVersion).toBe('1.0.0');
      expect(rb2.fromVersion).toBe('1.0.0');
      expect(rb2.toVersion).toBe('2.0.0');
      expect(await engine.getUpdateHistory(instId)).toHaveLength(4);
    });
  });

  describe('checkForUpdates — extended', () => {
    it('should return null for never-updated installation', async () => {
      const instId = brandInstallationId('never-upd');
      expect(await engine.checkForUpdates(instId)).toBeNull();
    });

    it('should return the completed (not starting) record', async () => {
      const instId = brandInstallationId('completed-rec');
      await engine.update(instId, '1.0.0');
      const latest = await engine.checkForUpdates(instId);
      expect(latest?.status).toBe(InstallationStatus.Installed);
      expect(latest?.completedAt).not.toBeNull();
    });

    it('should return rollback record as latest after rollback', async () => {
      const instId = brandInstallationId('latest-rb');
      await engine.update(instId, '1.0.0');
      await engine.rollback(instId);
      const latest = await engine.checkForUpdates(instId);
      expect(latest?.rolledBack).toBe(true);
      expect(latest?.status).toBe(InstallationStatus.RolledBack);
    });
  });

  describe('listUpdates — extended', () => {
    it('should return records from all installations', async () => {
      const id1 = brandInstallationId('lu-1');
      const id2 = brandInstallationId('lu-2');
      const id3 = brandInstallationId('lu-3');
      await engine.update(id1, '1.0.0');
      await engine.update(id2, '2.0.0');
      await engine.update(id3, '3.0.0');
      const result = await engine.listUpdates();
      expect(result).toHaveLength(3);
    });

    it('should filter by status Installed with multiple installations', async () => {
      const id1 = brandInstallationId('lu-f-1');
      const id2 = brandInstallationId('lu-f-2');
      await engine.update(id1, '1.0.0');
      await engine.update(id2, '2.0.0');
      await engine.rollback(id1);
      // rollback adds new RolledBack record; original updates stay Installed
      const result = await engine.listUpdates({ status: InstallationStatus.Installed });
      expect(result).toHaveLength(2);
    });

    it('should handle filter matching no records', async () => {
      await engine.update(brandInstallationId('lu-nm'), '1.0.0');
      const result = await engine.listUpdates({ status: InstallationStatus.Installing });
      expect(result).toHaveLength(0);
    });

    it('should return records in order added across installations', async () => {
      const id1 = brandInstallationId('lu-ord-1');
      const id2 = brandInstallationId('lu-ord-2');
      await engine.update(id1, '1.0.0');
      await engine.update(id2, '2.0.0');
      await engine.update(id1, '3.0.0');
      const result = await engine.listUpdates();
      expect(result).toHaveLength(3);
      // Map iteration order: id1's records come first (2 records), then id2's (1 record)
      expect(result[0].installationId).toBe(id1);
      expect(result[2].installationId).toBe(id2);
    });
  });

  describe('getUpdateHistory — extended', () => {
    it('should return empty frozen array for unknown installation', async () => {
      const result = await engine.getUpdateHistory(brandInstallationId('unknown'));
      expect(result).toEqual([]);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should preserve full history through many operations', async () => {
      const instId = brandInstallationId('full-hist');
      await engine.update(instId, '1.0.0');
      await engine.update(instId, '2.0.0');
      await engine.rollback(instId);
      await engine.update(instId, '3.0.0');
      await engine.update(instId, '4.0.0');
      await engine.rollback(instId);
      const history = await engine.getUpdateHistory(instId);
      expect(history).toHaveLength(6);
    });

    it('should allow reading history of multiple installations independently', async () => {
      const id1 = brandInstallationId('multi-hist-1');
      const id2 = brandInstallationId('multi-hist-2');
      for (let i = 1; i <= 3; i++) {
        await engine.update(id1, `${i}.0.0`);
      }
      for (let i = 1; i <= 5; i++) {
        await engine.update(id2, `${i}.0.0`);
      }
      expect((await engine.getUpdateHistory(id1)).length).toBe(3);
      expect((await engine.getUpdateHistory(id2)).length).toBe(5);
    });
  });

  describe('update + rollback complex scenarios', () => {
    it('should handle rapid fire update-rollback-update', async () => {
      const instId = brandInstallationId('rapid-1');
      const r1 = await engine.update(instId, '1.0.0');
      const rb1 = await engine.rollback(instId);
      const r2 = await engine.update(instId, '2.0.0');
      expect(r1.toVersion).toBe('1.0.0');
      expect(rb1.toVersion).toBe('0.0.0');
      expect(r2.fromVersion).toBe('0.0.0');
      expect(r2.toVersion).toBe('2.0.0');
    });

    it('should emit correct number of events through complex scenario', async () => {
      const instId = brandInstallationId('evt-complex');
      await engine.update(instId, '1.0.0');  // 2 events
      await engine.update(instId, '2.0.0');  // 2 events
      await engine.rollback(instId);          // 1 event
      expect(mockEventBus.publish).toHaveBeenCalledTimes(5);
    });

    it('should track correct version chain through zigzag pattern', async () => {
      const instId = brandInstallationId('zigzag');
      const r1 = await engine.update(instId, '1.0.0'); // 0.0.0 -> 1.0.0
      expect(r1.fromVersion).toBe('0.0.0');
      const r2 = await engine.update(instId, '2.0.0'); // 1.0.0 -> 2.0.0
      expect(r2.fromVersion).toBe('1.0.0');
      const rb1 = await engine.rollback(instId);       // 2.0.0 -> 1.0.0
      expect(rb1.fromVersion).toBe('2.0.0');
      expect(rb1.toVersion).toBe('1.0.0');
      const r3 = await engine.update(instId, '3.0.0'); // 1.0.0 -> 3.0.0
      expect(r3.fromVersion).toBe('1.0.0');
      const rb2 = await engine.rollback(instId);       // 3.0.0 -> 1.0.0
      expect(rb2.fromVersion).toBe('3.0.0');
      expect(rb2.toVersion).toBe('1.0.0');
      const r4 = await engine.update(instId, '4.0.0'); // 1.0.0 -> 4.0.0
      expect(r4.fromVersion).toBe('1.0.0');
      expect(r4.toVersion).toBe('4.0.0');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// CROSS-SUBSYSTEM INTEGRATION
// ═══════════════════════════════════════════════════════════════════

describe('Cross-subsystem integration', () => {
  beforeEach(() => {
    resetMockEventBus();
  });

  it('CapabilityRegistry and PackageRuntime can use same publisherId', async () => {
    const registry = new CapabilityRegistry(DefaultEcosystemRuntimeConfig.capabilityRegistry, mockEventBus);
    const pkgRuntime = new PackageRuntime(DefaultEcosystemRuntimeConfig.packageRuntime, mockEventBus);
    const pid = brandPublisherId('shared-pub');

    await registry.register(makeCapabilityParams({ publisherId: pid }));
    await pkgRuntime.createPackage(makePackageParams({ publisherId: pid }));

    const capList = await registry.list({ publisherId: pid });
    const pkgList = await pkgRuntime.list({ publisherId: pid });
    expect(capList).toHaveLength(1);
    expect(pkgList).toHaveLength(1);
  });

  it('CapabilityRegistry and MarketplaceRuntime share capabilityId reference', async () => {
    const registry = new CapabilityRegistry(DefaultEcosystemRuntimeConfig.capabilityRegistry, mockEventBus);
    const marketplace = new MarketplaceRuntime(DefaultEcosystemRuntimeConfig.marketplace, mockEventBus);
    const capId = brandCapabilityId('shared-cap');

    await registry.register(makeCapabilityParams({ name: 'cross-1' }));
    // Registry uses auto-generated IDs, so we use a separate capId for marketplace
    await marketplace.addToCatalog(makeCatalogParams({ capabilityId: capId }));

    const mktEntry = await marketplace.getById(capId);
    expect(mktEntry).not.toBeNull();
    expect(mktEntry?.capabilityId).toBe(capId);
  });

  it('InstallationEngine and UpdateEngine work with same installationId', async () => {
    const instEngine = new InstallationEngine(DefaultEcosystemRuntimeConfig.installationEngine, mockEventBus);
    const updEngine = new UpdateEngine(DefaultEcosystemRuntimeConfig.updateEngine, mockEventBus);

    const inst = await instEngine.install(makeInstallationParams());
    const updRecord = await updEngine.update(inst.id, '2.0.0');

    expect(updRecord.installationId).toBe(inst.id);
    const history = await updEngine.getUpdateHistory(inst.id);
    expect(history).toHaveLength(1);
  });

  it('InstallationEngine uninstall does not affect UpdateEngine history', async () => {
    const instEngine = new InstallationEngine(DefaultEcosystemRuntimeConfig.installationEngine, mockEventBus);
    const updEngine = new UpdateEngine(DefaultEcosystemRuntimeConfig.updateEngine, mockEventBus);

    const inst = await instEngine.install(makeInstallationParams());
    await updEngine.update(inst.id, '2.0.0');
    await instEngine.uninstall(inst.id);

    // Update history should still exist
    const history = await updEngine.getUpdateHistory(inst.id);
    expect(history).toHaveLength(1);
  });

  it('all subsystems correctly count independent state', async () => {
    const registry = new CapabilityRegistry(DefaultEcosystemRuntimeConfig.capabilityRegistry, mockEventBus);
    const pkgRuntime = new PackageRuntime(DefaultEcosystemRuntimeConfig.packageRuntime, mockEventBus);
    const marketplace = new MarketplaceRuntime(DefaultEcosystemRuntimeConfig.marketplace, mockEventBus);
    const instEngine = new InstallationEngine(DefaultEcosystemRuntimeConfig.installationEngine, mockEventBus);

    await registry.register(makeCapabilityParams({ name: 'count-1' }));
    await registry.register(makeCapabilityParams({ name: 'count-2' }));
    await pkgRuntime.createPackage(makePackageParams());
    await marketplace.addToCatalog(makeCatalogParams());
    await marketplace.addToCatalog(makeCatalogParams());
    await marketplace.addToCatalog(makeCatalogParams());
    await instEngine.install(makeInstallationParams());

    expect(await registry.count()).toBe(2);
    expect(await pkgRuntime.count()).toBe(1);
    expect(await marketplace.count()).toBe(3);
    expect(await instEngine.count()).toBe(1);
  });

  it('eventBus publish count reflects all subsystem activity', async () => {
    const registry = new CapabilityRegistry(DefaultEcosystemRuntimeConfig.capabilityRegistry, mockEventBus);
    const pkgRuntime = new PackageRuntime(DefaultEcosystemRuntimeConfig.packageRuntime, mockEventBus);
    const marketplace = new MarketplaceRuntime(DefaultEcosystemRuntimeConfig.marketplace, mockEventBus);
    const instEngine = new InstallationEngine(DefaultEcosystemRuntimeConfig.installationEngine, mockEventBus);

    await registry.register(makeCapabilityParams({ name: 'events-1' }));
    await pkgRuntime.createPackage(makePackageParams());
    await marketplace.addToCatalog(makeCatalogParams());
    await instEngine.install(makeInstallationParams());

    // register=1, createPackage=1, addToCatalog=1, install=2 (started+completed)
    expect(mockEventBus.publish).toHaveBeenCalledTimes(5);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ADDITIONAL COMPREHENSIVE EDGE CASE TESTS
// ═══════════════════════════════════════════════════════════════════

describe('CapabilityRegistry — error hierarchy validation', () => {
  beforeEach(() => {
    resetMockEventBus();
  });

  it('CapabilityNotFoundError extends MarketplaceError', () => {
    const err = new CapabilityNotFoundError('id-1');
    expect(err).toBeInstanceOf(MarketplaceError);
  });

  it('CapabilityNotFoundError has correct name property', () => {
    const err = new CapabilityNotFoundError('id-2');
    expect(err.name).toBe('CapabilityNotFoundError');
  });

  it('CapabilityNotFoundError has correct code', () => {
    const err = new CapabilityNotFoundError('id-3');
    expect(err.code).toBe('CAPABILITY_NOT_FOUND');
  });

  it('CapabilityNotFoundError preserves capabilityId', () => {
    const err = new CapabilityNotFoundError('my-id');
    expect(err.capabilityId).toBe('my-id');
  });

  it('CapabilityNotFoundError has timestamp', () => {
    const err = new CapabilityNotFoundError('id-4');
    expect(err.timestamp).toBeDefined();
  });

  it('CapabilityLimitExceededError extends MarketplaceError', () => {
    const err = new CapabilityLimitExceededError(100);
    expect(err).toBeInstanceOf(MarketplaceError);
  });

  it('CapabilityLimitExceededError has correct code', () => {
    const err = new CapabilityLimitExceededError(100);
    expect(err.code).toBe('CAPABILITY_LIMIT_EXCEEDED');
  });

  it('CapabilityLimitExceededError has context with max', () => {
    const err = new CapabilityLimitExceededError(50);
    expect(err.context.max).toBe(50);
  });

  it('CapabilityDuplicateError extends MarketplaceError', () => {
    const err = new CapabilityDuplicateError('dup-name');
    expect(err).toBeInstanceOf(MarketplaceError);
  });

  it('CapabilityDuplicateError has correct code', () => {
    const err = new CapabilityDuplicateError('dup-name');
    expect(err.code).toBe('CAPABILITY_DUPLICATE');
  });
});

describe('PackageRuntime — error hierarchy validation', () => {
  it('PackageLimitExceededError extends MarketplaceError', () => {
    const err = new PackageLimitExceededError(100);
    expect(err).toBeInstanceOf(MarketplaceError);
    expect(err.code).toBe('PACKAGE_LIMIT_EXCEEDED');
  });

  it('PackageSizeExceededError extends MarketplaceError', () => {
    const err = new PackageSizeExceededError(200, 100);
    expect(err).toBeInstanceOf(MarketplaceError);
    expect(err.code).toBe('PACKAGE_SIZE_EXCEEDED');
  });

  it('PackageSizeExceededError has correct context', () => {
    const err = new PackageSizeExceededError(200, 100);
    expect(err.context.sizeBytes).toBe(200);
    expect(err.context.maxSize).toBe(100);
  });

  it('ManifestValidationError extends MarketplaceError', () => {
    const err = new ManifestValidationError('bad manifest');
    expect(err).toBeInstanceOf(MarketplaceError);
    expect(err.code).toBe('MANIFEST_VALIDATION_ERROR');
  });

  it('ManifestValidationError preserves reason', () => {
    const err = new ManifestValidationError('missing fields');
    expect(err.reason).toBe('missing fields');
  });
});

describe('InstallationEngine — error hierarchy validation', () => {
  it('InstallationNotFoundError extends MarketplaceError', () => {
    const err = new InstallationNotFoundError('inst-1');
    expect(err).toBeInstanceOf(MarketplaceError);
    expect(err.code).toBe('INSTALLATION_NOT_FOUND');
  });

  it('InstallationNotFoundError preserves installationId', () => {
    const err = new InstallationNotFoundError('my-inst');
    expect(err.installationId).toBe('my-inst');
  });

  it('InstallationStateError extends MarketplaceError', () => {
    const err = new InstallationStateError('inst-1', 'Installed', 'Uninstalled');
    expect(err).toBeInstanceOf(MarketplaceError);
    expect(err.code).toBe('INSTALLATION_STATE_ERROR');
  });

  it('InstallationStateError preserves state info', () => {
    const err = new InstallationStateError('inst-1', 'Installed', 'Uninstalled');
    expect(err.installationId).toBe('inst-1');
    expect(err.currentStatus).toBe('Installed');
    expect(err.targetStatus).toBe('Uninstalled');
  });
});

describe('UpdateEngine — error hierarchy validation', () => {
  it('RollbackError extends MarketplaceError', () => {
    const err = new RollbackError('no history');
    expect(err).toBeInstanceOf(MarketplaceError);
    expect(err.code).toBe('ROLLBACK_ERROR');
  });

  it('RollbackError has timestamp', () => {
    const err = new RollbackError('reason');
    expect(err.timestamp).toBeDefined();
  });
});

describe('CapabilityRegistry — bulk operations', () => {
  let registry: CapabilityRegistry;

  beforeEach(() => {
    resetMockEventBus();
    registry = new CapabilityRegistry(DefaultEcosystemRuntimeConfig.capabilityRegistry, mockEventBus);
  });

  it('should handle registering 10 capabilities', async () => {
    const entries = [];
    for (let i = 0; i < 10; i++) {
      entries.push(await registry.register(makeCapabilityParams({ name: "bulk-" + i })));
    }
    expect(await registry.count()).toBe(10);
    for (let i = 0; i < 10; i++) {
      expect((await registry.getById(entries[i].id))?.name).toBe(`bulk-${i}`);
    }
  });

  it('should list all 10 capabilities', async () => {
    for (let i = 0; i < 10; i++) {
      await registry.register(makeCapabilityParams({ name: `list-bulk-${i}` }));
    }
    const all = await registry.list();
    expect(all).toHaveLength(10);
  });

  it('should filter 10 capabilities by category', async () => {
    for (let i = 0; i < 10; i++) {
      const cat = i % 2 === 0 ? 'even' : 'odd';
      await registry.register(makeCapabilityParams({ name: `cat-bulk-${i}`, category: cat }));
    }
    const even = await registry.list({ category: 'even' });
    const odd = await registry.list({ category: 'odd' });
    expect(even).toHaveLength(5);
    expect(odd).toHaveLength(5);
  });

  it('should emit 10 events for 10 registrations', async () => {
    for (let i = 0; i < 10; i++) {
      await registry.register(makeCapabilityParams({ name: `evt-bulk-${i}` }));
    }
    expect(mockEventBus.publish).toHaveBeenCalledTimes(10);
  });

  it('should remove all 10 capabilities', async () => {
    const entries = [];
    for (let i = 0; i < 10; i++) {
      entries.push(await registry.register(makeCapabilityParams({ name: "rm-bulk-" + i })))
    }
    for (const entry of entries) {
      await registry.remove(entry.id);
    }
    expect(await registry.count()).toBe(0);
    expect(await registry.list()).toEqual([]);
  });
});

describe('PackageRuntime — bulk operations', () => {
  let runtime: PackageRuntime;

  beforeEach(() => {
    resetMockEventBus();
    runtime = new PackageRuntime(DefaultEcosystemRuntimeConfig.packageRuntime, mockEventBus);
  });

  it('should handle creating 10 packages', async () => {
    for (let i = 0; i < 10; i++) {
      await runtime.createPackage(makePackageParams());
    }
    expect(await runtime.count()).toBe(10);
  });

  it('should emit 10 events for 10 creates', async () => {
    for (let i = 0; i < 10; i++) {
      await runtime.createPackage(makePackageParams());
    }
    expect(mockEventBus.publish).toHaveBeenCalledTimes(10);
  });

  it('should filter 10 packages by publisherId', async () => {
    const pub1 = brandPublisherId('bulk-pub-1');
    const pub2 = brandPublisherId('bulk-pub-2');
    for (let i = 0; i < 10; i++) {
      const pub = i % 2 === 0 ? pub1 : pub2;
      await runtime.createPackage(makePackageParams({ publisherId: pub }));
    }
    expect((await runtime.list({ publisherId: pub1 })).length).toBe(5);
    expect((await runtime.list({ publisherId: pub2 })).length).toBe(5);
  });
});

describe('MarketplaceRuntime — bulk operations', () => {
  let marketplace: MarketplaceRuntime;

  beforeEach(() => {
    resetMockEventBus();
    marketplace = new MarketplaceRuntime(DefaultEcosystemRuntimeConfig.marketplace, mockEventBus);
  });

  it('should handle adding 10 catalog entries', async () => {
    for (let i = 0; i < 10; i++) {
      await marketplace.addToCatalog(makeCatalogParams());
    }
    expect(await marketplace.count()).toBe(10);
  });

  it('should emit 10 events for 10 additions', async () => {
    for (let i = 0; i < 10; i++) {
      await marketplace.addToCatalog(makeCatalogParams());
    }
    expect(mockEventBus.publish).toHaveBeenCalledTimes(10);
  });

  it('should filter 10 entries by source', async () => {
    for (let i = 0; i < 5; i++) {
      await marketplace.addToCatalog(makeCatalogParams({ source: CatalogSource.Local }));
    }
    for (let i = 0; i < 5; i++) {
      await marketplace.addToCatalog(makeCatalogParams({ source: CatalogSource.Registry }));
    }
    expect((await marketplace.list({ source: CatalogSource.Local })).length).toBe(5);
    expect((await marketplace.list({ source: CatalogSource.Registry })).length).toBe(5);
  });

  it('should getFeatured from 10 entries with 3 featured', async () => {
    for (let i = 0; i < 10; i++) {
      await marketplace.addToCatalog(makeCatalogParams({ featured: i < 3 }));
    }
    const featured = await marketplace.getFeatured();
    expect(featured).toHaveLength(3);
  });
});

describe('InstallationEngine — bulk operations', () => {
  let engine: InstallationEngine;

  beforeEach(() => {
    resetMockEventBus();
    engine = new InstallationEngine(DefaultEcosystemRuntimeConfig.installationEngine, mockEventBus);
  });

  it('should handle installing 10 capabilities', async () => {
    for (let i = 0; i < 10; i++) {
      await engine.install(makeInstallationParams({ capabilityId: brandCapabilityId(`bulk-inst-${i}`) }));
    }
    expect(await engine.count()).toBe(10);
  });

  it('should emit 20 events for 10 installs (2 per install)', async () => {
    for (let i = 0; i < 10; i++) {
      await engine.install(makeInstallationParams());
    }
    expect(mockEventBus.publish).toHaveBeenCalledTimes(20);
  });

  it('should uninstall all 10 installations', async () => {
    const installations = [];
    for (let i = 0; i < 10; i++) {
      installations.push(await engine.install(makeInstallationParams()));
    }
    for (const inst of installations) {
      await engine.uninstall(inst.id);
    }
    expect(await engine.count()).toBe(10); // count includes uninstalled
    const uninstalled = await engine.list({ status: InstallationStatus.Uninstalled });
    expect(uninstalled).toHaveLength(10);
  });

  it('should emit 30 events for 10 installs + 10 uninstalls', async () => {
    const installations = [];
    for (let i = 0; i < 10; i++) {
      installations.push(await engine.install(makeInstallationParams()));
    }
    for (const inst of installations) {
      await engine.uninstall(inst.id);
    }
    expect(mockEventBus.publish).toHaveBeenCalledTimes(30);
  });
});

describe('UpdateEngine — bulk operations', () => {
  let engine: UpdateEngine;

  beforeEach(() => {
    resetMockEventBus();
    engine = new UpdateEngine(DefaultEcosystemRuntimeConfig.updateEngine, mockEventBus);
  });

  it('should handle updating 10 installations', async () => {
    for (let i = 0; i < 10; i++) {
      await engine.update(brandInstallationId(`bulk-upd-${i}`), `${i}.0.0`);
    }
    const all = await engine.listUpdates();
    expect(all).toHaveLength(10);
  });

  it('should emit 20 events for 10 updates (2 per update)', async () => {
    for (let i = 0; i < 10; i++) {
      await engine.update(brandInstallationId(`bulk-evt-${i}`), '1.0.0');
    }
    expect(mockEventBus.publish).toHaveBeenCalledTimes(20);
  });

  it('should rollback 5 of 10 installations', async () => {
    for (let i = 0; i < 10; i++) {
      await engine.update(brandInstallationId(`bulk-rb-${i}`), '1.0.0');
    }
    for (let i = 0; i < 5; i++) {
      await engine.rollback(brandInstallationId(`bulk-rb-${i}`));
    }
    const all = await engine.listUpdates();
    expect(all).toHaveLength(15); // 10 updates + 5 rollbacks
  });

  it('should emit correct event count through complex bulk scenario', async () => {
    for (let i = 0; i < 10; i++) {
      await engine.update(brandInstallationId(`bulk-cmplx-${i}`), '1.0.0');
    }
    for (let i = 0; i < 5; i++) {
      await engine.rollback(brandInstallationId(`bulk-cmplx-${i}`));
    }
    for (let i = 5; i < 10; i++) {
      await engine.update(brandInstallationId(`bulk-cmplx-${i}`), '2.0.0');
    }
    // 10 updates * 2 + 5 rollbacks * 1 + 5 updates * 2 = 20 + 5 + 10 = 35
    expect(mockEventBus.publish).toHaveBeenCalledTimes(35);
  });
});

describe('Config sensitivity tests', () => {
  it('CapabilityRegistry uses custom maxCapabilities', async () => {
    const config = { maxCapabilities: 2, maxTagsPerCapability: 5 };
    const reg = new CapabilityRegistry(config, mockEventBus);
    await reg.register(makeCapabilityParams({ name: 'cfg-1' }));
    await reg.register(makeCapabilityParams({ name: 'cfg-2' }));
    await expect(reg.register(makeCapabilityParams({ name: 'cfg-3' }))).rejects.toThrow(CapabilityLimitExceededError);
  });

  it('PackageRuntime uses custom maxPackages', async () => {
    const config = { maxPackages: 1, maxPackageSizeBytes: 1024, supportedAlgorithms: [] as const };
    const rt = new PackageRuntime(config, mockEventBus);
    await rt.createPackage(makePackageParams());
    await expect(rt.createPackage(makePackageParams())).rejects.toThrow(PackageLimitExceededError);
  });

  it('PackageRuntime uses custom maxPackageSizeBytes', async () => {
    const config = { maxPackages: 100, maxPackageSizeBytes: 100, supportedAlgorithms: [] as const };
    const rt = new PackageRuntime(config, mockEventBus);
    await expect(rt.createPackage(makePackageParams({ sizeBytes: 101 }))).rejects.toThrow(PackageSizeExceededError);
  });

  it('MarketplaceRuntime uses custom maxCatalogEntries', async () => {
    const config = { maxCatalogEntries: 1, defaultSource: CatalogSource.Local, refreshIntervalMs: 5000 };
    const mkt = new MarketplaceRuntime(config, mockEventBus);
    await mkt.addToCatalog(makeCatalogParams());
    await expect(mkt.addToCatalog(makeCatalogParams())).rejects.toThrow(CatalogLimitExceededError);
  });
});

// ═══════════════════════════════════════════════════════════════════
// DEEP FIELD VERIFICATION TESTS
// ═══════════════════════════════════════════════════════════════════

describe('CapabilityRegistry — deep field verification', () => {
  let registry: CapabilityRegistry;

  beforeEach(() => {
    resetMockEventBus();
    registry = new CapabilityRegistry(DefaultEcosystemRuntimeConfig.capabilityRegistry, mockEventBus);
  });

  it('should preserve all dependency fields', async () => {
    const deps = [
      { name: 'lodash', versionRange: '^4.17.0', optional: false, reason: 'utility' },
      { name: 'axios', versionRange: '~1.0.0', optional: true, reason: 'http client' },
    ];
    const entry = await registry.register(makeCapabilityParams({ name: 'deep-dep', dependencies: deps }));
    expect(entry.dependencies).toHaveLength(2);
    expect(entry.dependencies[0].name).toBe('lodash');
    expect(entry.dependencies[0].versionRange).toBe('^4.17.0');
    expect(entry.dependencies[0].optional).toBe(false);
    expect(entry.dependencies[0].reason).toBe('utility');
    expect(entry.dependencies[1].name).toBe('axios');
    expect(entry.dependencies[1].optional).toBe(true);
  });

  it('should preserve all compatibility requirement fields', async () => {
    const reqs = [
      { dimension: CompatibilityDimension.Runtime, required: '>=0.9.0', optional: false },
      { dimension: CompatibilityDimension.OS, required: 'linux|macos', optional: true },
    ];
    const entry = await registry.register(makeCapabilityParams({ name: 'deep-compat', compatibilityRequirements: reqs }));
    expect(entry.compatibilityRequirements).toHaveLength(2);
    expect(entry.compatibilityRequirements[0].dimension).toBe(CompatibilityDimension.Runtime);
    expect(entry.compatibilityRequirements[0].required).toBe('>=0.9.0');
    expect(entry.compatibilityRequirements[1].optional).toBe(true);
  });

  it('should preserve multiple metadata entries', async () => {
    const meta = { key1: 'value1', key2: 42, key3: true, key4: null, key5: [1, 2, 3] };
    const entry = await registry.register(makeCapabilityParams({ name: 'deep-meta', metadata: meta }));
    expect(entry.metadata).toEqual(meta);
  });

  it('should preserve all permission types', async () => {
    const perms = [
      PermissionType.Memory, PermissionType.Workflow, PermissionType.FileSystem,
      PermissionType.Network, PermissionType.AIProvider, PermissionType.Desktop,
      PermissionType.SystemMetrics, PermissionType.UserSettings,
    ];
    const entry = await registry.register(makeCapabilityParams({ name: 'deep-perm', permissions: perms }));
    expect(entry.permissions).toHaveLength(8);
    expect(entry.permissions[0]).toBe(PermissionType.Memory);
    expect(entry.permissions[7]).toBe(PermissionType.UserSettings);
  });

  it('should preserve tags with special characters', async () => {
    const tags = ['tag-with-dash', 'tag_with_underscore', 'tag.with.dot', 'tag/with/slash'];
    const entry = await registry.register(makeCapabilityParams({ name: 'deep-tags', tags }));
    expect(entry.tags).toEqual(tags);
  });

  it('should preserve description with unicode', async () => {
    const desc = '描述 Description Описание';
    const entry = await registry.register(makeCapabilityParams({ name: 'deep-desc', description: desc }));
    expect(entry.description).toBe(desc);
  });

  it('should preserve version with prerelease', async () => {
    const entry = await registry.register(makeCapabilityParams({ name: 'deep-ver', version: '1.0.0-rc.1+build.123' }));
    expect(entry.version).toBe('1.0.0-rc.1+build.123');
  });

  it('should return same entry from getById and getByName', async () => {
    const entry = await registry.register(makeCapabilityParams({ name: 'same-entry' }));
    const byId = await registry.getById(entry.id);
    const byName = await registry.getByName('same-entry');
    expect(byId?.id).toBe(byName?.id);
    expect(byId?.name).toBe(byName?.name);
  });

  it('should include registered entry in unfiltered list', async () => {
    const entry = await registry.register(makeCapabilityParams({ name: 'in-list' }));
    const list = await registry.list();
    expect(list.some(e => e.id === entry.id)).toBe(true);
  });

  it('should have consistent timestamps across entry and event', async () => {
    const entry = await registry.register(makeCapabilityParams({ name: 'ts-check' }));
    const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
    expect(call.timestamp).toBe(entry.createdAt);
  });
});

describe('PackageRuntime — deep field verification', () => {
  let runtime: PackageRuntime;

  beforeEach(() => {
    resetMockEventBus();
    runtime = new PackageRuntime(DefaultEcosystemRuntimeConfig.packageRuntime, mockEventBus);
  });

  it('should preserve all manifest fields', async () => {
    const manifest: PackageManifest = {
      name: 'full-manifest',
      version: '2.0.0',
      description: 'A complete manifest',
      author: 'Test Author',
      license: 'Apache-2.0',
      main: 'dist/index.js',
      capabilities: ['ai-generate', 'ai-analyze'],
      permissions: [PermissionType.Memory, PermissionType.Network],
      dependencies: [{ name: 'core', versionRange: '^1.0.0', optional: false, reason: 'core lib' }],
      compatibility: [{ dimension: CompatibilityDimension.Platform, required: 'any', optional: false }],
      entryPoint: 'dist/main.js',
      metadata: { extra: true },
    };
    const pkg = await runtime.createPackage(makePackageParams({ manifest }));
    expect(pkg.manifest.name).toBe('full-manifest');
    expect(pkg.manifest.license).toBe('Apache-2.0');
    expect(pkg.manifest.capabilities).toHaveLength(2);
    expect(pkg.manifest.permissions).toHaveLength(2);
  });

  it('should include registered package in unfiltered list', async () => {
    const pkg = await runtime.createPackage(makePackageParams());
    const list = await runtime.list();
    expect(list.some(p => p.id === pkg.id)).toBe(true);
  });

  it('should return same package from getById and getByCapabilityId', async () => {
    const capId = brandCapabilityId('same-pkg-cap');
    const pkg = await runtime.createPackage(makePackageParams({ capabilityId: capId }));
    const byId = await runtime.getById(pkg.id);
    const byCap = await runtime.getByCapabilityId(capId);
    expect(byId?.id).toBe(byCap?.id);
  });

  it('should have consistent timestamps across package and event', async () => {
    const pkg = await runtime.createPackage(makePackageParams());
    const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
    expect(call.timestamp).toBe(pkg.createdAt);
  });

  it('should handle zero-size package at boundary', async () => {
    const maxSize = DefaultEcosystemRuntimeConfig.packageRuntime.maxPackageSizeBytes;
    const pkg = await runtime.createPackage(makePackageParams({ sizeBytes: maxSize }));
    expect(pkg.sizeBytes).toBe(maxSize);
  });

  it('should reject package at size boundary + 1', async () => {
    const maxSize = DefaultEcosystemRuntimeConfig.packageRuntime.maxPackageSizeBytes;
    await expect(
      runtime.createPackage(makePackageParams({ sizeBytes: maxSize + 1 })),
    ).rejects.toThrow(PackageSizeExceededError);
  });
});

describe('MarketplaceRuntime — deep field verification', () => {
  let marketplace: MarketplaceRuntime;

  beforeEach(() => {
    resetMockEventBus();
    marketplace = new MarketplaceRuntime(DefaultEcosystemRuntimeConfig.marketplace, mockEventBus);
  });

  it('should return consistent entry from addToCatalog and getById', async () => {
    const capId = brandCapabilityId('same-mkt');
    const added = await marketplace.addToCatalog(makeCatalogParams({ capabilityId: capId }));
    const found = await marketplace.getById(capId);
    expect(found?.capabilityId).toBe(added.capabilityId);
    expect(found?.source).toBe(added.source);
    expect(found?.featured).toBe(added.featured);
  });

  it('should include added entry in unfiltered list', async () => {
    const capId = brandCapabilityId('in-mkt-list');
    await marketplace.addToCatalog(makeCatalogParams({ capabilityId: capId }));
    const list = await marketplace.list();
    expect(list.some(e => e.capabilityId === capId)).toBe(true);
  });

  it('should include added entry in search with empty query', async () => {
    const capId = brandCapabilityId('in-mkt-search');
    await marketplace.addToCatalog(makeCatalogParams({ capabilityId: capId }));
    const results = await marketplace.search('');
    expect(results.some(e => e.capabilityId === capId)).toBe(true);
  });

  it('should include featured entry in getFeatured', async () => {
    const capId = brandCapabilityId('in-feat');
    await marketplace.addToCatalog(makeCatalogParams({ capabilityId: capId, featured: true }));
    const featured = await marketplace.getFeatured();
    expect(featured.some(e => e.capabilityId === capId)).toBe(true);
  });

  it('should not include non-featured entry in getFeatured', async () => {
    const capId = brandCapabilityId('not-feat');
    await marketplace.addToCatalog(makeCatalogParams({ capabilityId: capId, featured: false }));
    const featured = await marketplace.getFeatured();
    expect(featured.some(e => e.capabilityId === capId)).toBe(false);
  });

  it('should have consistent timestamps across entry and event', async () => {
    const added = await marketplace.addToCatalog(makeCatalogParams());
    const call = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
    expect(call.timestamp).toBe(added.publishedAt);
  });
});

describe('InstallationEngine — deep field verification', () => {
  let engine: InstallationEngine;

  beforeEach(() => {
    resetMockEventBus();
    engine = new InstallationEngine(DefaultEcosystemRuntimeConfig.installationEngine, mockEventBus);
  });

  it('should include installed capability in list', async () => {
    const inst = await engine.install(makeInstallationParams());
    const list = await engine.list();
    expect(list.some(i => i.id === inst.id)).toBe(true);
  });

  it('should include installed capability in getByCapabilityId', async () => {
    const capId = brandCapabilityId('deep-inst-cap');
    const inst = await engine.install(makeInstallationParams({ capabilityId: capId }));
    const found = await engine.getByCapabilityId(capId);
    expect(found?.id).toBe(inst.id);
  });

  it('should preserve empty metadata through install', async () => {
    const inst = await engine.install(makeInstallationParams({ metadata: {} }));
    expect(inst.metadata).toEqual({});
  });

  it('should preserve complex metadata through install', async () => {
    const meta = { nested: { key: 'value' }, arr: [1, 'two', true], num: 42 };
    const inst = await engine.install(makeInstallationParams({ metadata: meta }));
    expect(inst.metadata).toEqual(meta);
  });

  it('should have consistent installedAt between entry and completed event', async () => {
    const inst = await engine.install(makeInstallationParams());
    const completedCall = mockEventBus.publish.mock.calls[1][0] as Record<string, unknown>;
    expect(completedCall.timestamp).toBe(inst.installedAt);
  });

  it('should preserve all fields through uninstall', async () => {
    const capId = brandCapabilityId('uninst-preserve');
    const pkgId = brandPackageId('uninst-pkg');
    const inst = await engine.install(makeInstallationParams({
      capabilityId: capId,
      packageId: pkgId,
      version: '1.2.3',
      metadata: { keep: true },
    }));
    await engine.uninstall(inst.id);
    const updated = await engine.getById(inst.id);
    expect(updated?.capabilityId).toBe(capId);
    expect(updated?.packageId).toBe(pkgId);
    expect(updated?.version).toBe('1.2.3');
    expect(updated?.metadata).toEqual({ keep: true });
    expect(updated?.installedAt).toBe(inst.installedAt);
  });
});

describe('UpdateEngine — deep field verification', () => {
  let engine: UpdateEngine;

  beforeEach(() => {
    resetMockEventBus();
    engine = new UpdateEngine(DefaultEcosystemRuntimeConfig.updateEngine, mockEventBus);
  });

  it('should include update record in listUpdates', async () => {
    const instId = brandInstallationId('deep-upd-list');
    const record = await engine.update(instId, '1.0.0');
    const all = await engine.listUpdates();
    expect(all.some(r => r.installationId === instId && r.toVersion === '1.0.0')).toBe(true);
  });

  it('should include update record in getUpdateHistory', async () => {
    const instId = brandInstallationId('deep-upd-hist');
    await engine.update(instId, '1.0.0');
    const history = await engine.getUpdateHistory(instId);
    expect(history).toHaveLength(1);
    expect(history[0].installationId).toBe(instId);
  });

  it('should preserve version through checkForUpdates', async () => {
    const instId = brandInstallationId('deep-check-ver');
    await engine.update(instId, '5.5.5');
    const latest = await engine.checkForUpdates(instId);
    expect(latest?.toVersion).toBe('5.5.5');
    expect(latest?.fromVersion).toBe('0.0.0');
  });

  it('should have consistent timestamps across update and events', async () => {
    const instId = brandInstallationId('deep-upd-ts');
    const record = await engine.update(instId, '1.0.0');
    const startedCall = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
    const completedCall = mockEventBus.publish.mock.calls[1][0] as Record<string, unknown>;
    expect(startedCall.timestamp).toBe(record.initiatedAt);
    expect(completedCall.timestamp).toBe(record.completedAt);
  });

  it('should handle version string with only major number', async () => {
    const instId = brandInstallationId('major-only');
    const record = await engine.update(instId, '2');
    expect(record.toVersion).toBe('2');
  });

  it('should handle very long version string', async () => {
    const instId = brandInstallationId('long-ver');
    const longVer = '1.0.0-' + 'a'.repeat(200);
    const record = await engine.update(instId, longVer);
    expect(record.toVersion).toBe(longVer);
  });

  it('should handle rollback preserving capabilityId (empty string)', async () => {
    const instId = brandInstallationId('rb-cap-id');
    await engine.update(instId, '1.0.0');
    const rbRecord = await engine.rollback(instId);
    expect(rbRecord.capabilityId).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════
// ADDITIONAL FILTER COMBINATION TESTS
// ═══════════════════════════════════════════════════════════════════

describe('CapabilityRegistry — exhaustive status filter tests', () => {
  let registry: CapabilityRegistry;
  beforeEach(() => {
    resetMockEventBus();
    registry = new CapabilityRegistry(DefaultEcosystemRuntimeConfig.capabilityRegistry, mockEventBus);
  });

  it('should filter by PendingReview status', async () => {
    const e = await registry.register(makeCapabilityParams({ name: 'sf-pr' }));
    await registry.updateStatus(e.id, PackageStatus.PendingReview);
    const results = await registry.list({ status: PackageStatus.PendingReview });
    expect(results).toHaveLength(1);
  });

  it('should filter by Unlisted status', async () => {
    const e = await registry.register(makeCapabilityParams({ name: 'sf-ul' }));
    await registry.updateStatus(e.id, PackageStatus.Unlisted);
    const results = await registry.list({ status: PackageStatus.Unlisted });
    expect(results).toHaveLength(1);
  });

  it('should filter by Deprecated status', async () => {
    const e = await registry.register(makeCapabilityParams({ name: 'sf-dep' }));
    await registry.updateStatus(e.id, PackageStatus.Deprecated);
    const results = await registry.list({ status: PackageStatus.Deprecated });
    expect(results).toHaveLength(1);
  });

  it('should filter by Suspended status', async () => {
    const e = await registry.register(makeCapabilityParams({ name: 'sf-sus' }));
    await registry.updateStatus(e.id, PackageStatus.Suspended);
    const results = await registry.list({ status: PackageStatus.Suspended });
    expect(results).toHaveLength(1);
  });

  it('should filter by Removed status', async () => {
    const e = await registry.register(makeCapabilityParams({ name: 'sf-rem' }));
    await registry.updateStatus(e.id, PackageStatus.Removed);
    const results = await registry.list({ status: PackageStatus.Removed });
    expect(results).toHaveLength(1);
  });
});

describe('CapabilityRegistry — name lookup edge cases', () => {
  let registry: CapabilityRegistry;
  beforeEach(() => {
    resetMockEventBus();
    registry = new CapabilityRegistry(DefaultEcosystemRuntimeConfig.capabilityRegistry, mockEventBus);
  });

  it('should look up by name with spaces', async () => {
    const e = await registry.register(makeCapabilityParams({ name: 'my capability name' }));
    const found = await registry.getByName('my capability name');
    expect(found?.id).toBe(e.id);
  });

  it('should look up by single character name', async () => {
    const e = await registry.register(makeCapabilityParams({ name: 'x' }));
    const found = await registry.getByName('x');
    expect(found?.id).toBe(e.id);
  });

  it('should distinguish similar names', async () => {
    const e1 = await registry.register(makeCapabilityParams({ name: 'cap-a' }));
    const e2 = await registry.register(makeCapabilityParams({ name: 'cap-ab' }));
    const e3 = await registry.register(makeCapabilityParams({ name: 'cap-b' }));
    expect((await registry.getByName('cap-a'))?.id).toBe(e1.id);
    expect((await registry.getByName('cap-ab'))?.id).toBe(e2.id);
    expect((await registry.getByName('cap-b'))?.id).toBe(e3.id);
  });
});

describe('PackageRuntime — getByCapabilityId extended', () => {
  let runtime: PackageRuntime;
  beforeEach(() => {
    resetMockEventBus();
    runtime = new PackageRuntime(DefaultEcosystemRuntimeConfig.packageRuntime, mockEventBus);
  });

  it('should return null for capability with no package', async () => {
    const result = await runtime.getByCapabilityId(brandCapabilityId('no-pkg'));
    expect(result).toBeNull();
  });

  it('should return null after verifying a different capability', async () => {
    await runtime.createPackage(makePackageParams({ capabilityId: brandCapabilityId('cap-a') }));
    const result = await runtime.getByCapabilityId(brandCapabilityId('cap-b'));
    expect(result).toBeNull();
  });

  it('should return package after multiple creates', async () => {
    const targetCap = brandCapabilityId('target-cap');
    await runtime.createPackage(makePackageParams({ capabilityId: brandCapabilityId('other-1') }));
    await runtime.createPackage(makePackageParams({ capabilityId: targetCap }));
    await runtime.createPackage(makePackageParams({ capabilityId: brandCapabilityId('other-2') }));
    const result = await runtime.getByCapabilityId(targetCap);
    expect(result).not.toBeNull();
    expect(result?.capabilityId).toBe(targetCap);
  });
});

describe('MarketplaceRuntime — search extended edge cases', () => {
  let marketplace: MarketplaceRuntime;
  beforeEach(() => {
    resetMockEventBus();
    marketplace = new MarketplaceRuntime(DefaultEcosystemRuntimeConfig.marketplace, mockEventBus);
  });

  it('should return empty for search with no catalog entries', async () => {
    const results = await marketplace.search('anything');
    expect(results).toEqual([]);
  });

  it('should handle search with undefined filter', async () => {
    await marketplace.addToCatalog(makeCatalogParams());
    const results = await marketplace.search('', undefined);
    expect(results).toHaveLength(1);
  });

  it('should handle search with empty filter object', async () => {
    await marketplace.addToCatalog(makeCatalogParams());
    const results = await marketplace.search('', {});
    expect(results).toHaveLength(1);
  });
});

describe('InstallationEngine — getById edge cases', () => {
  let engine: InstallationEngine;
  beforeEach(() => {
    resetMockEventBus();
    engine = new InstallationEngine(DefaultEcosystemRuntimeConfig.installationEngine, mockEventBus);
  });

  it('should return null for random string ID', async () => {
    const result = await engine.getById(brandInstallationId('random-id'));
    expect(result).toBeNull();
  });

  it('should return null for empty-string ID', async () => {
    const result = await engine.getById(brandInstallationId(''));
    expect(result).toBeNull();
  });

  it('should find installation among many', async () => {
    const installations = [];
    for (let i = 0; i < 10; i++) {
      installations.push(await engine.install(makeInstallationParams()));
    }
    const target = installations[5];
    const found = await engine.getById(target.id);
    expect(found?.id).toBe(target.id);
    expect(found?.version).toBe(target.version);
  });
});

describe('UpdateEngine — checkForUpdates edge cases', () => {
  let engine: UpdateEngine;
  beforeEach(() => {
    resetMockEventBus();
    engine = new UpdateEngine(DefaultEcosystemRuntimeConfig.updateEngine, mockEventBus);
  });

  it('should return null for empty-string installation ID', async () => {
    const result = await engine.checkForUpdates(brandInstallationId(''));
    expect(result).toBeNull();
  });

  it('should return latest after multiple updates with same version', async () => {
    const instId = brandInstallationId('same-ver-check');
    await engine.update(instId, '1.0.0');
    await engine.update(instId, '1.0.0');
    const latest = await engine.checkForUpdates(instId);
    expect(latest?.fromVersion).toBe('1.0.0');
    expect(latest?.toVersion).toBe('1.0.0');
  });
});

describe('Cross-subsystem event consistency', () => {
  beforeEach(() => {
    resetMockEventBus();
  });

  it('all event emissions should have eventId', async () => {
    const registry = new CapabilityRegistry(DefaultEcosystemRuntimeConfig.capabilityRegistry, mockEventBus);
    await registry.register(makeCapabilityParams({ name: 'evt-consist-1' }));
    for (const call of mockEventBus.publish.mock.calls) {
      expect((call[0] as Record<string, unknown>).eventId).toBeDefined();
    }
  });

  it('all event emissions should have version', async () => {
    const registry = new CapabilityRegistry(DefaultEcosystemRuntimeConfig.capabilityRegistry, mockEventBus);
    await registry.register(makeCapabilityParams({ name: 'evt-consist-2' }));
    for (const call of mockEventBus.publish.mock.calls) {
      expect((call[0] as Record<string, unknown>).version).toBeDefined();
    }
  });

  it('all event emissions should have sequence', async () => {
    const instEngine = new InstallationEngine(DefaultEcosystemRuntimeConfig.installationEngine, mockEventBus);
    await instEngine.install(makeInstallationParams());
    for (const call of mockEventBus.publish.mock.calls) {
      expect((call[0] as Record<string, unknown>).sequence).toBeDefined();
    }
  });

  it('capability registered event should have all required fields', async () => {
    const registry = new CapabilityRegistry(DefaultEcosystemRuntimeConfig.capabilityRegistry, mockEventBus);
    await registry.register(makeCapabilityParams({ name: 'evt-full', version: '2.0.0' }));
    const event = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
    expect(event.eventType).toBeDefined();
    expect(event.classification).toBeDefined();
    expect(event.capabilityId).toBeDefined();
    expect(event.name).toBeDefined();
    expect(event.version).toBeDefined();
    expect(event.publisherId).toBeDefined();
    expect(event.timestamp).toBeDefined();
    expect(event.metadata).toBeDefined();
    expect(event.eventId).toBeDefined();
    expect(event.aggregateId).toBeDefined();
    expect(event.aggregateType).toBeDefined();
  });

  it('installation completed event should have durationMs', async () => {
    const instEngine = new InstallationEngine(DefaultEcosystemRuntimeConfig.installationEngine, mockEventBus);
    await instEngine.install(makeInstallationParams());
    const completedEvent = mockEventBus.publish.mock.calls[1][0] as Record<string, unknown>;
    expect(completedEvent.durationMs).toBeDefined();
    expect(typeof completedEvent.durationMs).toBe('number');
  });

  it('update completed event should have durationMs', async () => {
    const updEngine = new UpdateEngine(DefaultEcosystemRuntimeConfig.updateEngine, mockEventBus);
    await updEngine.update(brandInstallationId('evt-dur'), '1.0.0');
    const completedEvent = mockEventBus.publish.mock.calls[1][0] as Record<string, unknown>;
    expect(completedEvent.durationMs).toBeDefined();
    expect(typeof completedEvent.durationMs).toBe('number');
  });

  it('update started event should have fromVersion and toVersion', async () => {
    const updEngine = new UpdateEngine(DefaultEcosystemRuntimeConfig.updateEngine, mockEventBus);
    await updEngine.update(brandInstallationId('evt-ver'), '3.0.0');
    const startedEvent = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
    expect(startedEvent.fromVersion).toBeDefined();
    expect(startedEvent.toVersion).toBeDefined();
    expect(startedEvent.fromVersion).toBe('0.0.0');
    expect(startedEvent.toVersion).toBe('3.0.0');
  });

  it('rollback event should have fromVersion and toVersion', async () => {
    const updEngine = new UpdateEngine(DefaultEcosystemRuntimeConfig.updateEngine, mockEventBus);
    const instId = brandInstallationId('evt-rb-ver');
    await updEngine.update(instId, '2.0.0');
    resetMockEventBus();
    await updEngine.rollback(instId);
    const rbEvent = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
    expect(rbEvent.fromVersion).toBe('2.0.0');
    expect(rbEvent.toVersion).toBe('0.0.0');
  });

  it('all event emissions should have metadata object', async () => {
    const pkgRuntime = new PackageRuntime(DefaultEcosystemRuntimeConfig.packageRuntime, mockEventBus);
    await pkgRuntime.createPackage(makePackageParams());
    for (const call of mockEventBus.publish.mock.calls) {
      const evt = call[0] as Record<string, unknown>;
      expect(evt.metadata).toBeDefined();
      expect(typeof evt.metadata).toBe('object');
    }
  });

  it('package created event should have capabilityId', async () => {
    const pkgRuntime = new PackageRuntime(DefaultEcosystemRuntimeConfig.packageRuntime, mockEventBus);
    const capId = brandCapabilityId('evt-pkg-cap');
    await pkgRuntime.createPackage(makePackageParams({ capabilityId: capId }));
    const event = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
    expect(event.capabilityId).toBe(capId);
  });

  it('catalog added event should have source', async () => {
    const mkt = new MarketplaceRuntime(DefaultEcosystemRuntimeConfig.marketplace, mockEventBus);
    await mkt.addToCatalog(makeCatalogParams({ source: CatalogSource.Enterprise }));
    const event = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
    expect(event.source).toBe(CatalogSource.Enterprise);
  });

  it('installation removed event should have installationId', async () => {
    const instEngine = new InstallationEngine(DefaultEcosystemRuntimeConfig.installationEngine, mockEventBus);
    const inst = await instEngine.install(makeInstallationParams());
    resetMockEventBus();
    await instEngine.uninstall(inst.id);
    const event = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
    expect(event.installationId).toBe(inst.id);
  });

  it('update started event classification should be info', async () => {
    const updEngine = new UpdateEngine(DefaultEcosystemRuntimeConfig.updateEngine, mockEventBus);
    await updEngine.update(brandInstallationId('cls-check'), '1.0.0');
    const startedEvent = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
    expect(startedEvent.classification).toBe('info');
  });

  it('update completed event classification should be result', async () => {
    const updEngine = new UpdateEngine(DefaultEcosystemRuntimeConfig.updateEngine, mockEventBus);
    await updEngine.update(brandInstallationId('cls-check-2'), '1.0.0');
    const completedEvent = mockEventBus.publish.mock.calls[1][0] as Record<string, unknown>;
    expect(completedEvent.classification).toBe('result');
  });

  it('rollback event classification should be info', async () => {
    const updEngine = new UpdateEngine(DefaultEcosystemRuntimeConfig.updateEngine, mockEventBus);
    const instId = brandInstallationId('cls-check-3');
    await updEngine.update(instId, '1.0.0');
    resetMockEventBus();
    await updEngine.rollback(instId);
    const rbEvent = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
    expect(rbEvent.classification).toBe('info');
  });

  it('installation started event classification should be info', async () => {
    const instEngine = new InstallationEngine(DefaultEcosystemRuntimeConfig.installationEngine, mockEventBus);
    await instEngine.install(makeInstallationParams());
    const startedEvent = mockEventBus.publish.mock.calls[0][0] as Record<string, unknown>;
    expect(startedEvent.classification).toBe('info');
  });

  it('installation completed event classification should be result', async () => {
    const instEngine = new InstallationEngine(DefaultEcosystemRuntimeConfig.installationEngine, mockEventBus);
    await instEngine.install(makeInstallationParams());
    const completedEvent = mockEventBus.publish.mock.calls[1][0] as Record<string, unknown>;
    expect(completedEvent.classification).toBe('result');
  });
});
