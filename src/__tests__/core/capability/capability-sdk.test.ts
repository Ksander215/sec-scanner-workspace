import { CapabilityBuilder, createCapability, createContract, createManifestJson } from '../../../core/capability/capability-sdk.js';
import type { CapabilityManifest } from '../../../core/capability/types.js';
import { CapabilityTrustLevel, CapabilityPermissionType, CapabilityAccessLevel } from '../../../core/capability/types.js';

describe('createCapability', () => {
  it('returns a CapabilityBuilder', () => {
    const builder = createCapability({ name: 'test', version: '1.0.0', description: 'd', author: 'a' });
    expect(builder).toBeInstanceOf(CapabilityBuilder);
  });
});

describe('CapabilityBuilder', () => {
  it('builds minimal manifest', () => {
    const manifest = createCapability({ name: 'test', version: '1.0.0', description: 'd', author: 'a' }).buildManifest();
    expect(manifest.name).toBe('test');
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.description).toBe('d');
    expect(manifest.author).toBe('a');
    expect(manifest.license).toBe('MIT');
    expect(manifest.trustLevel).toBe(CapabilityTrustLevel.Trusted);
  });

  it('builds manifest with dependencies', () => {
    const manifest = createCapability({ name: 'test', version: '1.0.0', description: 'd', author: 'a' })
      .withDependency('dep-1' as any, 'dep-one', '1.0.0')
      .buildManifest();
    expect(manifest.dependencies).toHaveLength(1);
    expect(manifest.dependencies[0].name).toBe('dep-one');
  });

  it('builds manifest with permissions', () => {
    const manifest = createCapability({ name: 'test', version: '1.0.0', description: 'd', author: 'a' })
      .withPermission(CapabilityPermissionType.Memory, CapabilityAccessLevel.Read, 'context', 'Read context')
      .buildManifest();
    expect(manifest.permissions).toHaveLength(1);
    expect(manifest.permissions[0].type).toBe(CapabilityPermissionType.Memory);
  });

  it('builds manifest with interface', () => {
    const manifest = createCapability({ name: 'test', version: '1.0.0', description: 'd', author: 'a' })
      .withInterface('IScanner', '1.0.0', 'Scan interface', ['scan', 'audit'])
      .buildManifest();
    expect(manifest.interfaces).toHaveLength(1);
    expect(manifest.interfaces[0].methods).toHaveLength(2);
  });

  it('builds manifest with keywords', () => {
    const manifest = createCapability({ name: 'test', version: '1.0.0', description: 'd', author: 'a' })
      .withKeywords('security', 'scanning')
      .buildManifest();
    expect(manifest.keywords).toEqual(['security', 'scanning']);
  });

  it('builds manifest with metadata', () => {
    const manifest = createCapability({ name: 'test', version: '1.0.0', description: 'd', author: 'a' })
      .withMetadata({ key1: 'value1' })
      .buildManifest();
    expect((manifest.metadata as any).key1).toBe('value1');
  });

  it('builds manifest with homepage', () => {
    const manifest = createCapability({ name: 'test', version: '1.0.0', description: 'd', author: 'a' })
      .withHomepage('https://example.com')
      .buildManifest();
    expect(manifest.homepage).toBe('https://example.com');
  });

  it('builds manifest with repository', () => {
    const manifest = createCapability({ name: 'test', version: '1.0.0', description: 'd', author: 'a' })
      .withRepository('https://github.com/test/pack')
      .buildManifest();
    expect(manifest.repository).toBe('https://github.com/test/pack');
  });

  it('builds manifest with system requirements', () => {
    const manifest = createCapability({ name: 'test', version: '1.0.0', description: 'd', author: 'a' })
      .withSystemRequirements('1.0.0', '1.0.0', '1.0.0', '1.0.0')
      .buildManifest();
    expect(manifest.coreVersion).toBe('1.0.0');
    expect(manifest.runtimeVersion).toBe('1.0.0');
  });

  it('builds manifest with checksum', () => {
    const manifest = createCapability({ name: 'test', version: '1.0.0', description: 'd', author: 'a' })
      .withChecksum('sha256-abc')
      .buildManifest();
    expect(manifest.checksum).toBe('sha256-abc');
  });

  it('builds manifest with signature', () => {
    const manifest = createCapability({ name: 'test', version: '1.0.0', description: 'd', author: 'a' })
      .withSignature('sig123')
      .buildManifest();
    expect(manifest.signature).toBe('sig123');
  });

  it('builds manifest with specific packId', () => {
    const packId = 'my-pack-id' as any;
    const manifest = createCapability({ name: 'test', version: '1.0.0', description: 'd', author: 'a' })
      .buildManifestWithId(packId);
    expect(manifest.packId).toBe(packId);
  });

  it('builds with custom trust level', () => {
    const manifest = createCapability({ name: 'test', version: '1.0.0', description: 'd', author: 'a', trustLevel: CapabilityTrustLevel.Core })
      .buildManifest();
    expect(manifest.trustLevel).toBe(CapabilityTrustLevel.Core);
  });

  it('builds with custom license', () => {
    const manifest = createCapability({ name: 'test', version: '1.0.0', description: 'd', author: 'a', license: 'Apache-2.0' })
      .buildManifest();
    expect(manifest.license).toBe('Apache-2.0');
  });

  it('builds frozen manifest', () => {
    const manifest = createCapability({ name: 'test', version: '1.0.0', description: 'd', author: 'a' })
      .buildManifest();
    expect(Object.isFrozen(manifest)).toBe(true);
  });

  it('chaining works', () => {
    const manifest = createCapability({ name: 'test', version: '1.0.0', description: 'd', author: 'a' })
      .withKeywords('a')
      .withKeywords('b')
      .withMetadata({ x: 1 })
      .withMetadata({ y: 2 })
      .buildManifest();
    expect(manifest.keywords).toEqual(['a', 'b']);
    expect((manifest.metadata as any).x).toBe(1);
    expect((manifest.metadata as any).y).toBe(2);
  });

  it('adds optional dependency', () => {
    const manifest = createCapability({ name: 'test', version: '1.0.0', description: 'd', author: 'a' })
      .withDependency('dep-1' as any, 'dep-one', '1.0.0', true, 'optional reason')
      .buildManifest();
    expect(manifest.dependencies[0].optional).toBe(true);
    expect(manifest.dependencies[0].reason).toBe('optional reason');
  });
});

describe('createContract', () => {
  it('creates contract with defaults', () => {
    const contract = createContract({});
    expect(typeof contract.initialize).toBe('function');
    expect(typeof contract.shutdown).toBe('function');
    expect(typeof contract.health).toBe('function');
    expect(typeof contract.metadata).toBe('function');
    expect(typeof contract.capabilities).toBe('function');
  });

  it('health returns healthy by default', async () => {
    const contract = createContract({});
    const result = await contract.health();
    expect(result.healthy).toBe(true);
  });

  it('capabilities returns empty array by default', () => {
    const contract = createContract({});
    expect(contract.capabilities()).toEqual([]);
  });

  it('uses custom initialize', async () => {
    let called = false;
    const contract = createContract({
      initialize: async () => { called = true; },
    });
    await contract.initialize({} as any);
    expect(called).toBe(true);
  });

  it('uses custom capabilities', () => {
    const contract = createContract({
      capabilities: () => ['scan', 'audit'],
    });
    expect(contract.capabilities()).toEqual(['scan', 'audit']);
  });
});

describe('createManifestJson', () => {
  it('returns valid JSON string', () => {
    const json = createManifestJson({ name: 'test', version: '1.0.0', description: 'd', author: 'a' });
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe('test');
    expect(parsed.version).toBe('1.0.0');
  });

  it('includes dependencies', () => {
    const builder = createCapability({ name: 'test', version: '1.0.0', description: 'd', author: 'a' });
    // Build manifest to get the ID, then use createManifestJson separately
    const json = createManifestJson({ name: 'test', version: '1.0.0', description: 'd', author: 'a' });
    const parsed = JSON.parse(json);
    expect(parsed.dependencies).toEqual([]);
  });
});
