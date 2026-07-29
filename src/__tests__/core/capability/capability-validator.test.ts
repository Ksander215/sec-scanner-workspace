/**
 * CapabilityValidator Tests
 *
 * Tests for: validateManifest, validateContract, validatePack.
 */
import { CapabilityValidator } from '../../../core/capability/capability-validator.js';
import type { CapabilityManifest, CapabilityContract, CapabilityPack } from '../../../core/capability/types.js';
import { CapabilityTrustLevel, CapabilityPermissionType, CapabilityAccessLevel, ValidationSeverity } from '../../../core/capability/types.js';

function createValidManifest(overrides: Partial<CapabilityManifest> = {}): CapabilityManifest {
  return {
    id: crypto.randomUUID() as any,
    packId: crypto.randomUUID() as any,
    name: 'valid-pack',
    version: '1.0.0',
    description: 'A valid manifest',
    author: 'test-author',
    license: 'MIT',
    keywords: [],
    dependencies: [],
    interfaces: [],
    permissions: [],
    trustLevel: CapabilityTrustLevel.Trusted,
    policies: [],
    exports: [],
    checksum: 'sha256-abc',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {},
    ...overrides,
  };
}

function createValidContract(): CapabilityContract {
  return {
    initialize: async () => {},
    shutdown: async () => {},
    health: async () => ({ healthy: true, checkedAt: new Date().toISOString() }),
    metadata: () => ({ name: 'test', version: '1.0.0', description: 'test', capabilities: [] }),
    capabilities: () => ['cap1'],
  };
}

function createValidPack(overrides: Partial<CapabilityPack> = {}): CapabilityPack {
  const packId = crypto.randomUUID() as any;
  const manifest = createValidManifest({ packId });
  return {
    id: packId,
    name: 'valid-pack',
    state: 'Registered' as any,
    manifest,
    installedAt: new Date().toISOString(),
    activatedAt: null,
    version: 1,
    error: null,
    capabilities: [],
    metadata: {},
    ...overrides,
  };
}

describe('CapabilityValidator', () => {
  let validator: CapabilityValidator;

  beforeEach(() => {
    validator = new CapabilityValidator();
  });

  // --- 1. Valid manifest (3 tests) ---

  describe('valid manifest', () => {
    it('should return valid for a fully populated manifest', () => {
      const manifest = createValidManifest();
      const result = validator.validateManifest(manifest);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should return no warnings for manifest with all recommended fields', () => {
      const manifest = createValidManifest();
      const result = validator.validateManifest(manifest);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return issues and warnings as frozen arrays', () => {
      const manifest = createValidManifest();
      const result = validator.validateManifest(manifest);
      expect(Object.isFrozen(result.issues)).toBe(true);
      expect(Object.isFrozen(result.warnings)).toBe(true);
    });
  });

  // --- 2. Missing required fields: name, version, author (3 tests) ---

  describe('missing required fields', () => {
    it('should report error when name is missing', () => {
      const manifest = createValidManifest({ name: '' });
      const result = validator.validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === 'MISSING_NAME')).toBe(true);
    });

    it('should report error when version is missing', () => {
      const manifest = createValidManifest({ version: '' });
      const result = validator.validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === 'MISSING_VERSION')).toBe(true);
    });

    it('should report error when author is missing', () => {
      const manifest = createValidManifest({ author: '' });
      const result = validator.validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === 'MISSING_AUTHOR')).toBe(true);
    });
  });

  // --- 3. Invalid version format (3 tests) ---

  describe('invalid version format', () => {
    it('should reject non-semantic version string', () => {
      const manifest = createValidManifest({ version: 'not-a-version' });
      const result = validator.validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === 'INVALID_VERSION')).toBe(true);
    });

    it('should reject version missing major number', () => {
      const manifest = createValidManifest({ version: '.0.0' });
      const result = validator.validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === 'INVALID_VERSION')).toBe(true);
    });

    it('should reject version with v prefix', () => {
      const manifest = createValidManifest({ version: 'v1.0.0' });
      const result = validator.validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === 'INVALID_VERSION')).toBe(true);
    });
  });

  // --- 4. Missing description warning (2 tests) ---

  describe('missing description warning', () => {
    it('should warn when description is empty', () => {
      const manifest = createValidManifest({ description: '' });
      const result = validator.validateManifest(manifest);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === 'MISSING_DESCRIPTION')).toBe(true);
      expect(result.warnings.some(w => w.severity === ValidationSeverity.Warning)).toBe(true);
    });

    it('should not warn when description is present', () => {
      const manifest = createValidManifest({ description: 'A thorough description.' });
      const result = validator.validateManifest(manifest);
      expect(result.warnings.some(w => w.code === 'MISSING_DESCRIPTION')).toBe(false);
    });
  });

  // --- 5. Missing checksum warning (1 test) ---

  describe('missing checksum warning', () => {
    it('should warn when checksum is empty', () => {
      const manifest = createValidManifest({ checksum: '' });
      const result = validator.validateManifest(manifest);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === 'MISSING_CHECKSUM')).toBe(true);
    });
  });

  // --- 6. Name too long (1 test) ---

  describe('name too long', () => {
    it('should reject name exceeding 128 characters', () => {
      const manifest = createValidManifest({ name: 'x'.repeat(129) });
      const result = validator.validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === 'NAME_TOO_LONG')).toBe(true);
    });
  });

  // --- 7. Self-dependency detection (2 tests) ---

  describe('self-dependency detection', () => {
    it('should report error when pack depends on itself', () => {
      const packId = crypto.randomUUID() as any;
      const manifest = createValidManifest({
        packId,
        dependencies: [{
          packId,
          name: 'self-dep',
          version: '1.0.0',
          optional: false,
          reason: 'self',
        }],
      });
      const result = validator.validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === 'SELF_DEPENDENCY')).toBe(true);
    });

    it('should not report self-dependency when depending on a different pack', () => {
      const otherPackId = crypto.randomUUID() as any;
      const manifest = createValidManifest({
        dependencies: [{
          packId: otherPackId,
          name: 'other-pack',
          version: '1.0.0',
          optional: false,
          reason: 'needs other',
        }],
      });
      const result = validator.validateManifest(manifest);
      expect(result.issues.some(i => i.code === 'SELF_DEPENDENCY')).toBe(false);
    });
  });

  // --- 8. Invalid dependency packId / version (3 tests) ---

  describe('invalid dependency fields', () => {
    it('should report error when dependency packId is empty', () => {
      const manifest = createValidManifest({
        dependencies: [{
          packId: '' as any,
          name: 'bad-dep',
          version: '1.0.0',
          optional: false,
          reason: 'test',
        }],
      });
      const result = validator.validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === 'INVALID_DEPENDENCY')).toBe(true);
    });

    it('should report error when dependency version is invalid', () => {
      const manifest = createValidManifest({
        dependencies: [{
          packId: crypto.randomUUID() as any,
          name: 'bad-ver-dep',
          version: 'not-semver',
          optional: false,
          reason: 'test',
        }],
      });
      const result = validator.validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === 'INVALID_DEPENDENCY_VERSION')).toBe(true);
    });

    it('should report error when dependency version is empty', () => {
      const manifest = createValidManifest({
        dependencies: [{
          packId: crypto.randomUUID() as any,
          name: 'empty-ver-dep',
          version: '',
          optional: false,
          reason: 'test',
        }],
      });
      const result = validator.validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === 'INVALID_DEPENDENCY_VERSION')).toBe(true);
    });
  });

  // --- 9. Invalid permission type / access (2 tests) ---

  describe('invalid permission fields', () => {
    it('should report error for unknown permission type', () => {
      const manifest = createValidManifest({
        permissions: [{
          type: 'FakeType' as any,
          access: CapabilityAccessLevel.Read,
          resource: 'res',
          description: 'test',
        }],
      });
      const result = validator.validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === 'INVALID_PERMISSION_TYPE')).toBe(true);
    });

    it('should report error for unknown access level', () => {
      const manifest = createValidManifest({
        permissions: [{
          type: CapabilityPermissionType.Memory,
          access: 'SuperUser' as any,
          resource: 'res',
          description: 'test',
        }],
      });
      const result = validator.validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === 'INVALID_PERMISSION_ACCESS')).toBe(true);
    });
  });

  // --- 10. Invalid interface (1 test) ---

  describe('invalid interface', () => {
    it('should report error when interface name is empty', () => {
      const manifest = createValidManifest({
        interfaces: [{
          name: '',
          version: '1.0.0',
          description: 'test',
          methods: ['doThing'],
        }],
      });
      const result = validator.validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === 'INVALID_INTERFACE')).toBe(true);
    });
  });

  // --- 11. Contract validation (25 tests: 5 required methods x 5 tests) ---

  describe('contract validation', () => {
    describe('missing initialize method', () => {
      it('should report MISSING_CONTRACT_METHOD for initialize', () => {
        const contract = { ...createValidContract(), initialize: undefined as any };
        const result = validator.validateContract(contract, 'test-pack');
        expect(result.valid).toBe(false);
        expect(result.issues.some(i => i.code === 'MISSING_CONTRACT_METHOD' && i.field === 'initialize')).toBe(true);
      });

      it('should report error severity for missing initialize', () => {
        const contract = { ...createValidContract(), initialize: undefined as any };
        const result = validator.validateContract(contract, 'test-pack');
        const issue = result.issues.find(i => i.field === 'initialize');
        expect(issue?.severity).toBe(ValidationSeverity.Error);
      });

      it('should include the pack name in the initialize error message', () => {
        const contract = { ...createValidContract(), initialize: undefined as any };
        const result = validator.validateContract(contract, 'my-special-pack');
        const issue = result.issues.find(i => i.field === 'initialize');
        expect(issue?.message).toContain('my-special-pack');
        expect(issue?.message).toContain('initialize');
      });

      it('should include the method name in the error field for initialize', () => {
        const contract = { ...createValidContract(), initialize: undefined as any };
        const result = validator.validateContract(contract, 'test-pack');
        const issue = result.issues.find(i => i.field === 'initialize');
        expect(issue?.field).toBe('initialize');
      });

      it('should mark result invalid when only initialize is missing', () => {
        const contract = { ...createValidContract(), initialize: undefined as any };
        const result = validator.validateContract(contract, 'test-pack');
        expect(result.valid).toBe(false);
        expect(result.issues).toHaveLength(1);
      });
    });

    describe('missing shutdown method', () => {
      it('should report MISSING_CONTRACT_METHOD for shutdown', () => {
        const contract = { ...createValidContract(), shutdown: undefined as any };
        const result = validator.validateContract(contract, 'test-pack');
        expect(result.valid).toBe(false);
        expect(result.issues.some(i => i.code === 'MISSING_CONTRACT_METHOD' && i.field === 'shutdown')).toBe(true);
      });

      it('should report error severity for missing shutdown', () => {
        const contract = { ...createValidContract(), shutdown: undefined as any };
        const result = validator.validateContract(contract, 'test-pack');
        const issue = result.issues.find(i => i.field === 'shutdown');
        expect(issue?.severity).toBe(ValidationSeverity.Error);
      });

      it('should include the pack name in the shutdown error message', () => {
        const contract = { ...createValidContract(), shutdown: undefined as any };
        const result = validator.validateContract(contract, 'my-special-pack');
        const issue = result.issues.find(i => i.field === 'shutdown');
        expect(issue?.message).toContain('my-special-pack');
        expect(issue?.message).toContain('shutdown');
      });

      it('should include the method name in the error field for shutdown', () => {
        const contract = { ...createValidContract(), shutdown: undefined as any };
        const result = validator.validateContract(contract, 'test-pack');
        const issue = result.issues.find(i => i.field === 'shutdown');
        expect(issue?.field).toBe('shutdown');
      });

      it('should mark result invalid when only shutdown is missing', () => {
        const contract = { ...createValidContract(), shutdown: undefined as any };
        const result = validator.validateContract(contract, 'test-pack');
        expect(result.valid).toBe(false);
        expect(result.issues).toHaveLength(1);
      });
    });

    describe('missing health method', () => {
      it('should report MISSING_CONTRACT_METHOD for health', () => {
        const contract = { ...createValidContract(), health: undefined as any };
        const result = validator.validateContract(contract, 'test-pack');
        expect(result.valid).toBe(false);
        expect(result.issues.some(i => i.code === 'MISSING_CONTRACT_METHOD' && i.field === 'health')).toBe(true);
      });

      it('should report error severity for missing health', () => {
        const contract = { ...createValidContract(), health: undefined as any };
        const result = validator.validateContract(contract, 'test-pack');
        const issue = result.issues.find(i => i.field === 'health');
        expect(issue?.severity).toBe(ValidationSeverity.Error);
      });

      it('should include the pack name in the health error message', () => {
        const contract = { ...createValidContract(), health: undefined as any };
        const result = validator.validateContract(contract, 'my-special-pack');
        const issue = result.issues.find(i => i.field === 'health');
        expect(issue?.message).toContain('my-special-pack');
        expect(issue?.message).toContain('health');
      });

      it('should include the method name in the error field for health', () => {
        const contract = { ...createValidContract(), health: undefined as any };
        const result = validator.validateContract(contract, 'test-pack');
        const issue = result.issues.find(i => i.field === 'health');
        expect(issue?.field).toBe('health');
      });

      it('should mark result invalid when only health is missing', () => {
        const contract = { ...createValidContract(), health: undefined as any };
        const result = validator.validateContract(contract, 'test-pack');
        expect(result.valid).toBe(false);
        expect(result.issues).toHaveLength(1);
      });
    });

    describe('missing metadata method', () => {
      it('should report MISSING_CONTRACT_METHOD for metadata', () => {
        const contract = { ...createValidContract(), metadata: undefined as any };
        const result = validator.validateContract(contract, 'test-pack');
        expect(result.valid).toBe(false);
        expect(result.issues.some(i => i.code === 'MISSING_CONTRACT_METHOD' && i.field === 'metadata')).toBe(true);
      });

      it('should report error severity for missing metadata', () => {
        const contract = { ...createValidContract(), metadata: undefined as any };
        const result = validator.validateContract(contract, 'test-pack');
        const issue = result.issues.find(i => i.field === 'metadata');
        expect(issue?.severity).toBe(ValidationSeverity.Error);
      });

      it('should include the pack name in the metadata error message', () => {
        const contract = { ...createValidContract(), metadata: undefined as any };
        const result = validator.validateContract(contract, 'my-special-pack');
        const issue = result.issues.find(i => i.field === 'metadata');
        expect(issue?.message).toContain('my-special-pack');
        expect(issue?.message).toContain('metadata');
      });

      it('should include the method name in the error field for metadata', () => {
        const contract = { ...createValidContract(), metadata: undefined as any };
        const result = validator.validateContract(contract, 'test-pack');
        const issue = result.issues.find(i => i.field === 'metadata');
        expect(issue?.field).toBe('metadata');
      });

      it('should mark result invalid when only metadata is missing', () => {
        const contract = { ...createValidContract(), metadata: undefined as any };
        const result = validator.validateContract(contract, 'test-pack');
        expect(result.valid).toBe(false);
        expect(result.issues).toHaveLength(1);
      });
    });

    describe('missing capabilities method', () => {
      it('should report MISSING_CONTRACT_METHOD for capabilities', () => {
        const contract = { ...createValidContract(), capabilities: undefined as any };
        const result = validator.validateContract(contract, 'test-pack');
        expect(result.valid).toBe(false);
        expect(result.issues.some(i => i.code === 'MISSING_CONTRACT_METHOD' && i.field === 'capabilities')).toBe(true);
      });

      it('should report error severity for missing capabilities', () => {
        const contract = { ...createValidContract(), capabilities: undefined as any };
        const result = validator.validateContract(contract, 'test-pack');
        const issue = result.issues.find(i => i.field === 'capabilities');
        expect(issue?.severity).toBe(ValidationSeverity.Error);
      });

      it('should include the pack name in the capabilities error message', () => {
        const contract = { ...createValidContract(), capabilities: undefined as any };
        const result = validator.validateContract(contract, 'my-special-pack');
        const issue = result.issues.find(i => i.field === 'capabilities');
        expect(issue?.message).toContain('my-special-pack');
        expect(issue?.message).toContain('capabilities');
      });

      it('should include the method name in the error field for capabilities', () => {
        const contract = { ...createValidContract(), capabilities: undefined as any };
        const result = validator.validateContract(contract, 'test-pack');
        const issue = result.issues.find(i => i.field === 'capabilities');
        expect(issue?.field).toBe('capabilities');
      });

      it('should mark result invalid when only capabilities is missing', () => {
        const contract = { ...createValidContract(), capabilities: undefined as any };
        const result = validator.validateContract(contract, 'test-pack');
        expect(result.valid).toBe(false);
        expect(result.issues).toHaveLength(1);
      });
    });
  });

  // --- 12. Empty contract warning (1 test) ---

  describe('empty contract warning', () => {
    it('should warn when contract has no methods beyond required lifecycle', () => {
      // Use a class so the prototype is clean (no Object.prototype methods counted).
      // Arrow function class fields are instance properties, not prototype properties.
      class MinimalContract {
        initialize = async () => {};
        shutdown = async () => {};
        health = async () => ({ healthy: true, checkedAt: new Date().toISOString() });
        metadata = () => ({ name: 'test', version: '1.0.0', description: 'test', capabilities: [] });
        capabilities = () => ['cap1'];
      }
      const contract = new MinimalContract() as unknown as CapabilityContract;
      const result = validator.validateContract(contract, 'test-pack');
      expect(result.warnings.some(w => w.code === 'EMPTY_CONTRACT')).toBe(true);
    });
  });

  // --- 13. Full pack validation (3 tests) ---

  describe('validatePack', () => {
    it('should validate pack manifest when no contract provided', () => {
      const pack = createValidPack();
      const result = validator.validatePack(pack);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should validate both manifest and contract when contract is provided', () => {
      const contract = createValidContract();
      const pack = createValidPack();
      const result = validator.validatePack(pack, contract);
      expect(result.valid).toBe(true);
    });

    it('should aggregate issues from both manifest and contract', () => {
      class BadContract {
        // initialize is missing
        shutdown = async () => {};
        health = async () => ({ healthy: true, checkedAt: new Date().toISOString() });
        metadata = () => ({ name: 'test', version: '1.0.0', description: 'test', capabilities: [] });
        capabilities = () => ['cap1'];
      }
      const contract = new BadContract() as unknown as CapabilityContract;
      const badManifest = createValidManifest({ name: '' });
      const pack = createValidPack({ manifest: badManifest });
      const result = validator.validatePack(pack, contract);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === 'MISSING_NAME')).toBe(true);
      expect(result.issues.some(i => i.code === 'MISSING_CONTRACT_METHOD')).toBe(true);
    });
  });
});
