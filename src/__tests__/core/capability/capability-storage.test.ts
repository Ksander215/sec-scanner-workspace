import { InMemoryCapabilityStorage, SnapshotCapabilityStorage, FileCapabilityStorage } from '../../../core/capability/capability-storage.js';
import type { CapabilityPack, CapabilityPackId, CapabilityManifest } from '../../../core/capability/types.js';
import { CapabilityState as CS, CapabilityTrustLevel } from '../../../core/capability/types.js';

function createMockPack(overrides: Partial<CapabilityPack> = {}): CapabilityPack {
  return Object.freeze({
    id: overrides.id ?? (crypto.randomUUID() as any),
    name: overrides.name ?? 'test-pack',
    state: overrides.state ?? CS.Registered,
    manifest: (overrides.manifest ?? {
      id: crypto.randomUUID() as any,
      packId: crypto.randomUUID() as any,
      name: 'test-pack',
      version: '1.0.0',
      description: 'Test',
      author: 'test',
      license: 'MIT',
      keywords: [],
      dependencies: [],
      interfaces: [],
      permissions: [],
      trustLevel: CapabilityTrustLevel.Trusted,
      policies: [],
      exports: [],
      checksum: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {},
    }) as CapabilityManifest,
    installedAt: new Date().toISOString(),
    activatedAt: null,
    version: 1,
    error: null,
    capabilities: [],
    metadata: {},
    ...overrides,
  });
}

describe('InMemoryCapabilityStorage', () => {
  let storage: InMemoryCapabilityStorage;
  beforeEach(() => { storage = new InMemoryCapabilityStorage(); });

  it('saves and loads a pack', async () => {
    const pack = createMockPack({ name: 'save-test' });
    await storage.savePack(pack);
    const loaded = await storage.loadPack(pack.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe('save-test');
  });

  it('returns null for non-existent pack', async () => {
    const loaded = await storage.loadPack(crypto.randomUUID() as any);
    expect(loaded).toBeNull();
  });

  it('deletes a pack', async () => {
    const pack = createMockPack();
    await storage.savePack(pack);
    const deleted = await storage.deletePack(pack.id);
    expect(deleted).toBe(true);
    expect(await storage.loadPack(pack.id)).toBeNull();
  });

  it('returns false when deleting non-existent pack', async () => {
    const result = await storage.deletePack(crypto.randomUUID() as any);
    expect(result).toBe(false);
  });

  it('lists all packs', async () => {
    await storage.savePack(createMockPack({ name: 'a' }));
    await storage.savePack(createMockPack({ name: 'b' }));
    const packs = await storage.listPacks();
    expect(packs).toHaveLength(2);
  });

  it('saves and loads manifest', async () => {
    const pack = createMockPack();
    await storage.savePack(pack);
    await storage.saveManifest(pack.manifest);
    const manifest = await storage.loadManifest(pack.manifest.packId);
    expect(manifest).not.toBeNull();
    expect(manifest!.name).toBe(pack.manifest.name);
  });

  it('returns null for non-existent manifest', async () => {
    const manifest = await storage.loadManifest(crypto.randomUUID() as any);
    expect(manifest).toBeNull();
  });

  it('tracks pack count', async () => {
    expect(storage.packCount).toBe(0);
    await storage.savePack(createMockPack());
    expect(storage.packCount).toBe(1);
  });

  it('clear removes all data', async () => {
    await storage.savePack(createMockPack());
    await storage.saveManifest(createMockPack().manifest);
    storage.clear();
    expect(storage.packCount).toBe(0);
    expect(storage.manifestCount).toBe(0);
  });
});

describe('SnapshotCapabilityStorage', () => {
  it('takes and restores snapshots', async () => {
    const inner = new InMemoryCapabilityStorage();
    const snapshot = new SnapshotCapabilityStorage(inner);
    const pack = createMockPack({ name: 'snapshot-test' });
    await snapshot.savePack(pack);
    await snapshot.takeSnapshot('snap1');
    await snapshot.deletePack(pack.id);
    expect(await snapshot.loadPack(pack.id)).toBeNull();
    const restored = await snapshot.restoreSnapshot('snap1');
    expect(restored).toBe(true);
    expect((await snapshot.loadPack(pack.id))!.name).toBe('snapshot-test');
  });

  it('lists snapshots', async () => {
    const snapshot = new SnapshotCapabilityStorage(new InMemoryCapabilityStorage());
    await snapshot.takeSnapshot('s1');
    await snapshot.takeSnapshot('s2');
    expect(snapshot.listSnapshots()).toHaveLength(2);
  });

  it('deletes snapshot', async () => {
    const snapshot = new SnapshotCapabilityStorage(new InMemoryCapabilityStorage());
    await snapshot.takeSnapshot('s1');
    expect(snapshot.deleteSnapshot('s1')).toBe(true);
    expect(snapshot.listSnapshots()).toHaveLength(0);
  });

  it('restore returns false for non-existent snapshot', async () => {
    const snapshot = new SnapshotCapabilityStorage(new InMemoryCapabilityStorage());
    expect(await snapshot.restoreSnapshot('nonexistent')).toBe(false);
  });
});

describe('FileCapabilityStorage', () => {
  it('returns null from loadPack', async () => {
    const storage = new FileCapabilityStorage('/tmp/test');
    expect(await storage.loadPack('any' as any)).toBeNull();
  });

  it('returns empty from listPacks', async () => {
    const storage = new FileCapabilityStorage('/tmp/test');
    expect(await storage.listPacks()).toHaveLength(0);
  });
});
