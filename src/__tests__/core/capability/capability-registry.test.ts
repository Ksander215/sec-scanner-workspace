/**
 * CapabilityRegistry Tests
 *
 * Tests for: register, unregister, get, getByName, getByState,
 * getAll, has, hasByName, saveManifest, getManifest, updateState,
 * getDependents, count, size, clear.
 */
import { CapabilityRegistry } from '../../../core/capability/capability-registry.js';
import type { CapabilityPack, CapabilityPackId, CapabilityManifest, CapabilityState } from '../../../core/capability/types.js';
import { CapabilityState as CS, CapabilityTrustLevel } from '../../../core/capability/types.js';

function createMockPack(overrides: Partial<CapabilityPack> = {}): CapabilityPack {
  const packId = crypto.randomUUID() as unknown as CapabilityPackId;
  const manifest: CapabilityManifest = {
    id: crypto.randomUUID() as any,
    packId,
    name: overrides.name ?? 'test-pack',
    version: '1.0.0',
    description: 'Test pack',
    author: 'test',
    license: 'MIT',
    keywords: [],
    dependencies: overrides.manifest?.dependencies ?? [],
    interfaces: [],
    permissions: [],
    trustLevel: CapabilityTrustLevel.Trusted,
    policies: [],
    exports: [],
    checksum: 'abc123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {},
  };
  return Object.freeze({
    id: packId,
    name: overrides.name ?? 'test-pack',
    state: overrides.state ?? CS.Registered,
    manifest,
    installedAt: new Date().toISOString(),
    activatedAt: null,
    version: 1,
    error: null,
    capabilities: overrides.capabilities ?? [],
    metadata: {},
    ...overrides,
  });
}

function createMockPackWithDep(depPackId: CapabilityPackId, overrides: Partial<CapabilityPack> = {}): CapabilityPack {
  const packId = crypto.randomUUID() as unknown as CapabilityPackId;
  const manifest: CapabilityManifest = {
    id: crypto.randomUUID() as any,
    packId,
    name: overrides.name ?? 'dependent-pack',
    version: '1.0.0',
    description: 'Dependent pack',
    author: 'test',
    license: 'MIT',
    keywords: [],
    dependencies: [{
      packId: depPackId,
      name: 'base-pack',
      version: '1.0.0',
      optional: false,
      reason: 'needs base',
    }],
    interfaces: [],
    permissions: [],
    trustLevel: CapabilityTrustLevel.Trusted,
    policies: [],
    exports: [],
    checksum: 'abc123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {},
  };
  return Object.freeze({
    id: packId,
    name: overrides.name ?? 'dependent-pack',
    state: overrides.state ?? CS.Registered,
    manifest,
    installedAt: new Date().toISOString(),
    activatedAt: null,
    version: 1,
    error: null,
    capabilities: overrides.capabilities ?? [],
    metadata: {},
    ...overrides,
  });
}

describe('CapabilityRegistry', () => {
  let registry: CapabilityRegistry;

  beforeEach(() => {
    registry = new CapabilityRegistry();
  });

  // --- 1. Register / get / unregister (10 tests) ---

  describe('register / get / unregister', () => {
    it('should register a pack and retrieve it by id', () => {
      const pack = createMockPack();
      registry.register(pack);
      expect(registry.get(pack.id)).toBe(pack);
    });

    it('should return null for a non-existent pack id', () => {
      expect(registry.get(crypto.randomUUID() as unknown as CapabilityPackId)).toBeNull();
    });

    it('should unregister a registered pack and return true', () => {
      const pack = createMockPack();
      registry.register(pack);
      expect(registry.unregister(pack.id)).toBe(true);
      expect(registry.get(pack.id)).toBeNull();
    });

    it('should return false when unregistering a non-existent pack', () => {
      expect(registry.unregister(crypto.randomUUID() as unknown as CapabilityPackId)).toBe(false);
    });

    it('should has return true for a registered pack', () => {
      const pack = createMockPack();
      registry.register(pack);
      expect(registry.has(pack.id)).toBe(true);
    });

    it('should has return false for a non-existent pack', () => {
      expect(registry.has(crypto.randomUUID() as unknown as CapabilityPackId)).toBe(false);
    });

    it('should register multiple packs with different ids', () => {
      const packA = createMockPack({ name: 'pack-a' });
      const packB = createMockPack({ name: 'pack-b' });
      registry.register(packA);
      registry.register(packB);
      expect(registry.count).toBe(2);
      expect(registry.get(packA.id)).toBe(packA);
      expect(registry.get(packB.id)).toBe(packB);
    });

    it('should allow re-registering after unregister', () => {
      const pack = createMockPack();
      registry.register(pack);
      registry.unregister(pack.id);
      registry.register(pack);
      expect(registry.has(pack.id)).toBe(true);
    });

    it('should register pack with different states', () => {
      const registeredPack = createMockPack({ state: CS.Registered });
      const activePack = createMockPack({ state: CS.Active });
      registry.register(registeredPack);
      registry.register(activePack);
      expect(registry.get(registeredPack.id)?.state).toBe(CS.Registered);
      expect(registry.get(activePack.id)?.state).toBe(CS.Active);
    });

    it('should unregister pack from all indexes', () => {
      const pack = createMockPack({ state: CS.Active, name: 'my-special-pack' });
      registry.register(pack);
      registry.unregister(pack.id);
      expect(registry.has(pack.id)).toBe(false);
      expect(registry.hasByName('my-special-pack')).toBe(false);
      expect(registry.getByState(CS.Active)).toHaveLength(0);
    });
  });

  // --- 2. getByName, hasByName (5 tests) ---

  describe('getByName / hasByName', () => {
    it('should retrieve a pack by name', () => {
      const pack = createMockPack({ name: 'my-cool-pack' });
      registry.register(pack);
      expect(registry.getByName('my-cool-pack')).toBe(pack);
    });

    it('should return null for a non-existent name', () => {
      expect(registry.getByName('no-such-pack')).toBeNull();
    });

    it('should hasByName return true for a registered name', () => {
      const pack = createMockPack({ name: 'named-pack' });
      registry.register(pack);
      expect(registry.hasByName('named-pack')).toBe(true);
    });

    it('should hasByName return false for unknown name', () => {
      expect(registry.hasByName('unknown')).toBe(false);
    });

    it('should return the latest registered pack with a given name', () => {
      const packA = createMockPack({ name: 'same-name' });
      const packB = createMockPack({ name: 'same-name' });
      registry.register(packA);
      registry.register(packB);
      expect(registry.getByName('same-name')?.id).toBe(packB.id);
    });
  });

  // --- 3. getByState (5 tests) ---

  describe('getByState', () => {
    it('should return packs filtered by state', () => {
      const registeredPack = createMockPack({ state: CS.Registered, name: 'reg' });
      const activePack = createMockPack({ state: CS.Active, name: 'act' });
      registry.register(registeredPack);
      registry.register(activePack);
      expect(registry.getByState(CS.Registered)).toHaveLength(1);
      expect(registry.getByState(CS.Registered)[0].name).toBe('reg');
    });

    it('should return empty array for state with no packs', () => {
      expect(registry.getByState(CS.Disabled)).toEqual([]);
    });

    it('should return all packs in the same state', () => {
      const packA = createMockPack({ state: CS.Active, name: 'a' });
      const packB = createMockPack({ state: CS.Active, name: 'b' });
      const packC = createMockPack({ state: CS.Registered, name: 'c' });
      registry.register(packA);
      registry.register(packB);
      registry.register(packC);
      const active = registry.getByState(CS.Active);
      expect(active).toHaveLength(2);
      expect(active.map(p => p.name).sort()).toEqual(['a', 'b']);
    });

    it('should return a frozen array', () => {
      const pack = createMockPack({ state: CS.Active });
      registry.register(pack);
      const result = registry.getByState(CS.Active);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should reflect state changes after updateState', () => {
      const pack = createMockPack({ state: CS.Registered });
      registry.register(pack);
      expect(registry.getByState(CS.Registered)).toHaveLength(1);
      expect(registry.getByState(CS.Active)).toHaveLength(0);
      registry.updateState(pack.id, CS.Active);
      expect(registry.getByState(CS.Registered)).toHaveLength(0);
      expect(registry.getByState(CS.Active)).toHaveLength(1);
    });
  });

  // --- 4. getAll, count, size (3 tests) ---

  describe('getAll / count / size', () => {
    it('should return empty array on empty registry', () => {
      expect(registry.getAll()).toEqual([]);
    });

    it('should return all registered packs', () => {
      const packA = createMockPack({ name: 'a' });
      const packB = createMockPack({ name: 'b' });
      registry.register(packA);
      registry.register(packB);
      expect(registry.getAll()).toHaveLength(2);
    });

    it('should have count equal to size', () => {
      const packA = createMockPack({ name: 'a' });
      const packB = createMockPack({ name: 'b' });
      const packC = createMockPack({ name: 'c' });
      registry.register(packA);
      registry.register(packB);
      registry.register(packC);
      expect(registry.count).toBe(3);
      expect(registry.size).toBe(3);
      expect(registry.count).toBe(registry.size);
    });
  });

  // --- 5. Duplicate registration throws (2 tests) ---

  describe('duplicate registration', () => {
    it('should throw when registering a pack with the same id', () => {
      const pack = createMockPack();
      registry.register(pack);
      expect(() => registry.register(pack)).toThrow(/already registered/i);
    });

    it('should include the pack id in the error message', () => {
      const pack = createMockPack();
      registry.register(pack);
      expect(() => registry.register(pack)).toThrow(pack.id as string);
    });
  });

  // --- 6. Manifest save / load (4 tests) ---

  describe('manifest save / load', () => {
    it('should save and retrieve a manifest', () => {
      const pack = createMockPack();
      registry.register(pack);
      registry.saveManifest(pack.manifest);
      expect(registry.getManifest(pack.id)).toBe(pack.manifest);
    });

    it('should return null for non-existent manifest', () => {
      expect(registry.getManifest(crypto.randomUUID() as unknown as CapabilityPackId)).toBeNull();
    });

    it('should overwrite manifest on second save', () => {
      const pack = createMockPack();
      registry.register(pack);
      registry.saveManifest(pack.manifest);
      const updatedManifest = { ...pack.manifest, version: '2.0.0' as any };
      registry.saveManifest(updatedManifest);
      expect(registry.getManifest(pack.id)?.version).toBe('2.0.0');
    });

    it('should store manifest independently from pack registration', () => {
      const pack = createMockPack();
      registry.saveManifest(pack.manifest);
      expect(registry.getManifest(pack.id)).toBe(pack.manifest);
      expect(registry.get(pack.id)).toBeNull();
    });
  });

  // --- 7. State index updates (4 tests) ---

  describe('updateState', () => {
    it('should move pack from old state index to new state index', () => {
      const pack = createMockPack({ state: CS.Registered });
      registry.register(pack);
      registry.updateState(pack.id, CS.Active);
      expect(registry.getByState(CS.Registered)).toHaveLength(0);
      expect(registry.getByState(CS.Active)).toHaveLength(1);
      expect(registry.getByState(CS.Active)[0].id).toBe(pack.id);
    });

    it('should silently no-op for non-existent pack id', () => {
      registry.updateState(crypto.randomUUID() as unknown as CapabilityPackId, CS.Active);
      expect(registry.getByState(CS.Active)).toHaveLength(0);
    });

    it('should use pack.state as the source state, not the state index', () => {
      // updateState reads from pack.state (immutable), not from the index.
      // So successive calls all remove from the same original state.
      const pack = createMockPack({ state: CS.Registered });
      registry.register(pack);
      registry.updateState(pack.id, CS.Validated);
      registry.updateState(pack.id, CS.Loaded);
      // pack.state is still Registered, so each updateState removes from
      // Registered and adds to the new state — leaving intermediate states populated.
      expect(registry.getByState(CS.Registered)).toHaveLength(0);
      expect(registry.getByState(CS.Validated)).toHaveLength(1);
      expect(registry.getByState(CS.Loaded)).toHaveLength(1);
      // The final call also adds to Loaded again (same set), so still 1.
      // The final destination (Active) should also have the pack.
      registry.updateState(pack.id, CS.Active);
      expect(registry.getByState(CS.Active)).toHaveLength(1);
    });

    it('should allow packs with same state in index', () => {
      const packA = createMockPack({ state: CS.Active, name: 'a' });
      const packB = createMockPack({ state: CS.Active, name: 'b' });
      registry.register(packA);
      registry.register(packB);
      registry.updateState(packA.id, CS.Suspended);
      expect(registry.getByState(CS.Active)).toHaveLength(1);
      registry.updateState(packA.id, CS.Active);
      expect(registry.getByState(CS.Active)).toHaveLength(2);
    });
  });

  // --- 8. Dependency index (5 tests) ---

  describe('dependency index / getDependents', () => {
    it('should find dependents of a pack', () => {
      const basePack = createMockPack({ name: 'base' });
      const depPack = createMockPackWithDep(basePack.id, { name: 'depender' });
      registry.register(basePack);
      registry.register(depPack);
      const dependents = registry.getDependents(basePack.id);
      expect(dependents).toHaveLength(1);
      expect(dependents[0].name).toBe('depender');
    });

    it('should return empty array when pack has no dependents', () => {
      const pack = createMockPack();
      registry.register(pack);
      expect(registry.getDependents(pack.id)).toEqual([]);
    });

    it('should return frozen array of dependents', () => {
      const basePack = createMockPack({ name: 'base' });
      const depPack = createMockPackWithDep(basePack.id, { name: 'dep' });
      registry.register(basePack);
      registry.register(depPack);
      const dependents = registry.getDependents(basePack.id);
      expect(Object.isFrozen(dependents)).toBe(true);
    });

    it('should find multiple dependents of the same pack', () => {
      const basePack = createMockPack({ name: 'base' });
      const depA = createMockPackWithDep(basePack.id, { name: 'dep-a' });
      const depB = createMockPackWithDep(basePack.id, { name: 'dep-b' });
      registry.register(basePack);
      registry.register(depA);
      registry.register(depB);
      const dependents = registry.getDependents(basePack.id);
      expect(dependents).toHaveLength(2);
    });

    it('should remove dependents from index when dependent pack is unregistered', () => {
      const basePack = createMockPack({ name: 'base' });
      const depPack = createMockPackWithDep(basePack.id, { name: 'dep' });
      registry.register(basePack);
      registry.register(depPack);
      expect(registry.getDependents(basePack.id)).toHaveLength(1);
      registry.unregister(depPack.id);
      expect(registry.getDependents(basePack.id)).toHaveLength(0);
    });
  });

  // --- 9. Clear (2 tests) ---

  describe('clear', () => {
    it('should remove all packs from the registry', () => {
      const packA = createMockPack({ name: 'a' });
      const packB = createMockPack({ name: 'b' });
      registry.register(packA);
      registry.register(packB);
      registry.clear();
      expect(registry.count).toBe(0);
      expect(registry.getAll()).toEqual([]);
    });

    it('should clear all indexes including manifests and name index', () => {
      const pack = createMockPack({ name: 'clear-me', state: CS.Active });
      const depPack = createMockPackWithDep(pack.id, { name: 'dep-of-clear' });
      registry.register(pack);
      registry.register(depPack);
      registry.saveManifest(pack.manifest);
      registry.clear();
      expect(registry.count).toBe(0);
      expect(registry.hasByName('clear-me')).toBe(false);
      expect(registry.getByState(CS.Active)).toHaveLength(0);
      expect(registry.getDependents(pack.id)).toHaveLength(0);
      expect(registry.getManifest(pack.id)).toBeNull();
    });
  });

  // --- 10. Edge cases: null returns, empty registry (10 tests) ---

  describe('edge cases', () => {
    it('should return null from get on empty registry', () => {
      const id = crypto.randomUUID() as unknown as CapabilityPackId;
      expect(registry.get(id)).toBeNull();
    });

    it('should return null from getByName on empty registry', () => {
      expect(registry.getByName('anything')).toBeNull();
    });

    it('should return false from has on empty registry', () => {
      expect(registry.has(crypto.randomUUID() as unknown as CapabilityPackId)).toBe(false);
    });

    it('should return false from hasByName on empty registry', () => {
      expect(registry.hasByName('anything')).toBe(false);
    });

    it('should return empty array from getByState on empty registry', () => {
      expect(registry.getByState(CS.Active)).toEqual([]);
      expect(registry.getByState(CS.Registered)).toEqual([]);
    });

    it('should return empty array from getAll on empty registry', () => {
      expect(registry.getAll()).toEqual([]);
    });

    it('should return 0 for count and size on empty registry', () => {
      expect(registry.count).toBe(0);
      expect(registry.size).toBe(0);
    });

    it('should return null from getManifest on empty registry', () => {
      expect(registry.getManifest(crypto.randomUUID() as unknown as CapabilityPackId)).toBeNull();
    });

    it('should return empty array from getDependents on empty registry', () => {
      expect(registry.getDependents(crypto.randomUUID() as unknown as CapabilityPackId)).toEqual([]);
    });

    it('should return false from unregister on empty registry', () => {
      expect(registry.unregister(crypto.randomUUID() as unknown as CapabilityPackId)).toBe(false);
    });
  });
});
