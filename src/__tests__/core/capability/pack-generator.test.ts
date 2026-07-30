/**
 * pack-generator.test.ts
 * Tests for PackGenerator class and generatePack factory function
 */
import { describe, it, expect } from 'vitest';
import { PackGenerator, generatePack } from '../../../core/capability/pack-generator.js';
import type { CapabilityBuilderConfig, GeneratedPackTemplate } from '../../../core/capability/types.js';
import { CapabilityTrustLevel, CapabilityPermissionType, CapabilityAccessLevel } from '../../../core/capability/types.js';

// ─── Test Config Helper ─────────────────────────────────────────

function createBaseConfig(name = 'my-capability'): CapabilityBuilderConfig {
  return {
    name,
    version: '1.0.0',
    description: 'A test capability pack',
    author: 'test-author',
    license: 'MIT',
  };
}

// ─── Tests ─────────────────────────────────────────────────────

describe('PackGenerator', () => {

  const generator = new PackGenerator();

  // ═══════════════════════════════════════════════════════════════
  // 1. generate creates all required files
  // ═══════════════════════════════════════════════════════════════

  describe('generate creates all required files', () => {
    const config = createBaseConfig();
    const template = generator.generate(config);

    it('should include manifest.json in the output', () => {
      expect(template.files.has('manifest.json')).toBe(true);
    });

    it('should include src/index.ts in the output', () => {
      expect(template.files.has('src/index.ts')).toBe(true);
    });

    it('should include src/contract.ts in the output', () => {
      expect(template.files.has('src/contract.ts')).toBe(true);
    });

    it('should include tests/contract.test.ts in the output', () => {
      expect(template.files.has('tests/contract.test.ts')).toBe(true);
    });

    it('should include README.md in the output', () => {
      expect(template.files.has('README.md')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. manifest.json content
  // ═══════════════════════════════════════════════════════════════

  describe('manifest.json content', () => {
    it('should contain the correct name', () => {
      const template = generator.generate(createBaseConfig('test-pack'));
      const manifest = JSON.parse(template.files.get('manifest.json')!);
      expect(manifest.name).toBe('test-pack');
    });

    it('should contain the correct version', () => {
      const config = createBaseConfig();
      config.version = '2.5.0';
      const template = generator.generate(config);
      const manifest = JSON.parse(template.files.get('manifest.json')!);
      expect(manifest.version).toBe('2.5.0');
    });

    it('should contain the correct description', () => {
      const config = createBaseConfig();
      config.description = 'My awesome pack';
      const template = generator.generate(config);
      const manifest = JSON.parse(template.files.get('manifest.json')!);
      expect(manifest.description).toBe('My awesome pack');
    });

    it('should contain the correct author', () => {
      const config = createBaseConfig();
      config.author = 'jane-doe';
      const template = generator.generate(config);
      const manifest = JSON.parse(template.files.get('manifest.json')!);
      expect(manifest.author).toBe('jane-doe');
    });

    it('should default license to MIT when not specified', () => {
      const config: CapabilityBuilderConfig = {
        name: 'pack',
        version: '1.0.0',
        description: 'desc',
        author: 'auth',
      };
      const template = generator.generate(config);
      const manifest = JSON.parse(template.files.get('manifest.json')!);
      expect(manifest.license).toBe('MIT');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. src/index.ts content
  // ═══════════════════════════════════════════════════════════════

  describe('src/index.ts content', () => {
    it('should export the contract class', () => {
      const template = generator.generate(createBaseConfig('my-capability'));
      const content = template.files.get('src/index.ts')!;
      expect(content).toContain('export');
      expect(content).toContain('Contract');
    });

    it('should reference the correct PascalCase name', () => {
      const template = generator.generate(createBaseConfig('my-capability'));
      const content = template.files.get('src/index.ts')!;
      expect(content).toContain('MyCapabilityContract');
    });

    it('should import from contract.js', () => {
      const template = generator.generate(createBaseConfig('test'));
      const content = template.files.get('src/index.ts')!;
      expect(content).toContain("from './contract.js'");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. src/contract.ts content
  // ═══════════════════════════════════════════════════════════════

  describe('src/contract.ts content', () => {
    it('should define an initialize method', () => {
      const template = generator.generate(createBaseConfig('test'));
      const content = template.files.get('src/contract.ts')!;
      expect(content).toContain('async initialize');
    });

    it('should define a shutdown method', () => {
      const template = generator.generate(createBaseConfig('test'));
      const content = template.files.get('src/contract.ts')!;
      expect(content).toContain('async shutdown');
    });

    it('should define a health method', () => {
      const template = generator.generate(createBaseConfig('test'));
      const content = template.files.get('src/contract.ts')!;
      expect(content).toContain('async health');
    });

    it('should define a metadata method', () => {
      const template = generator.generate(createBaseConfig('test'));
      const content = template.files.get('src/contract.ts')!;
      expect(content).toContain('metadata()');
    });

    it('should define a capabilities method', () => {
      const template = generator.generate(createBaseConfig('test'));
      const content = template.files.get('src/contract.ts')!;
      expect(content).toContain('capabilities()');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. tests/contract.test.ts content
  // ═══════════════════════════════════════════════════════════════

  describe('tests/contract.test.ts content', () => {
    it('should contain a describe block', () => {
      const template = generator.generate(createBaseConfig('test'));
      const content = template.files.get('tests/contract.test.ts')!;
      expect(content).toContain('describe(');
    });

    it('should have an initialize test', () => {
      const template = generator.generate(createBaseConfig('test'));
      const content = template.files.get('tests/contract.test.ts')!;
      expect(content).toContain("should initialize successfully");
    });

    it('should have a shutdown test', () => {
      const template = generator.generate(createBaseConfig('test'));
      const content = template.files.get('tests/contract.test.ts')!;
      expect(content).toContain('should shutdown cleanly');
    });

    it('should have a health test', () => {
      const template = generator.generate(createBaseConfig('test'));
      const content = template.files.get('tests/contract.test.ts')!;
      expect(content).toContain('should report healthy');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. README.md content
  // ═══════════════════════════════════════════════════════════════

  describe('README.md content', () => {
    it('should have the pack name as title', () => {
      const template = generator.generate(createBaseConfig('my-awesome-pack'));
      const content = template.files.get('README.md')!;
      expect(content).toContain('# my-awesome-pack');
    });

    it('should include the description', () => {
      const config = createBaseConfig();
      config.description = 'A super cool pack';
      const template = generator.generate(config);
      const content = template.files.get('README.md')!;
      expect(content).toContain('A super cool pack');
    });

    it('should include installation instructions', () => {
      const template = generator.generate(createBaseConfig('test'));
      const content = template.files.get('README.md')!;
      expect(content).toContain('## Installation');
      expect(content).toContain('installPack');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. generatePack factory function
  // ═══════════════════════════════════════════════════════════════

  describe('generatePack factory function', () => {
    it('should return a GeneratedPackTemplate', () => {
      const result = generatePack(createBaseConfig());
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('files');
    });

    it('should produce the same output as PackGenerator.generate', () => {
      const config = createBaseConfig('factory-test');
      const direct = generator.generate(config);
      const fromFactory = generatePack(config);
      expect(fromFactory.name).toBe(direct.name);
      expect(fromFactory.files.size).toBe(direct.files.size);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 8. Config with dependencies
  // ═══════════════════════════════════════════════════════════════

  describe('config with dependencies', () => {
    it('should include dependencies in manifest.json', () => {
      const config: CapabilityBuilderConfig = {
        ...createBaseConfig(),
        dependencies: [
          {
            packId: 'dep-1' as any,
            name: 'core-utils',
            version: '1.0.0',
            optional: false,
            reason: 'Needed for utilities',
          },
        ],
      };
      const template = generator.generate(config);
      const manifest = JSON.parse(template.files.get('manifest.json')!);
      expect(manifest.dependencies).toHaveLength(1);
      expect(manifest.dependencies[0].name).toBe('core-utils');
    });

    it('should serialize optional dependency flag correctly', () => {
      const config: CapabilityBuilderConfig = {
        ...createBaseConfig(),
        dependencies: [
          {
            packId: 'dep-2' as any,
            name: 'optional-dep',
            version: '1.0.0',
            optional: true,
            reason: '',
          },
        ],
      };
      const template = generator.generate(config);
      const manifest = JSON.parse(template.files.get('manifest.json')!);
      expect(manifest.dependencies[0].optional).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 9. Config with permissions
  // ═══════════════════════════════════════════════════════════════

  describe('config with permissions', () => {
    it('should include permissions in manifest.json', () => {
      const config: CapabilityBuilderConfig = {
        ...createBaseConfig(),
        permissions: [
          {
            type: CapabilityPermissionType.Memory,
            access: CapabilityAccessLevel.Read,
            resource: 'memory:short-term',
            description: 'Read access to short-term memory',
          },
        ],
      };
      const template = generator.generate(config);
      const manifest = JSON.parse(template.files.get('manifest.json')!);
      expect(manifest.permissions).toHaveLength(1);
      expect(manifest.permissions[0].type).toBe('Memory');
    });

    it('should serialize permission access level correctly', () => {
      const config: CapabilityBuilderConfig = {
        ...createBaseConfig(),
        permissions: [
          {
            type: CapabilityPermissionType.Tool,
            access: CapabilityAccessLevel.Admin,
            resource: 'tools:*',
            description: 'Full tool access',
          },
        ],
      };
      const template = generator.generate(config);
      const manifest = JSON.parse(template.files.get('manifest.json')!);
      expect(manifest.permissions[0].access).toBe('Admin');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 10. Config with policies
  // ═══════════════════════════════════════════════════════════════

  describe('config with policies', () => {
    it('should include policies in manifest.json', () => {
      const config: CapabilityBuilderConfig = {
        ...createBaseConfig(),
        policies: [
          {
            name: 'rate-limit',
            description: 'Limit API calls',
            rules: [
              { resource: 'api', action: 'call', effect: 'allow' },
            ],
          },
        ],
      };
      const template = generator.generate(config);
      const manifest = JSON.parse(template.files.get('manifest.json')!);
      expect(manifest.policies).toHaveLength(1);
      expect(manifest.policies[0].name).toBe('rate-limit');
    });

    it('should serialize policy rules correctly', () => {
      const config: CapabilityBuilderConfig = {
        ...createBaseConfig(),
        policies: [
          {
            name: 'deny-write',
            description: 'Deny all writes',
            rules: [
              { resource: '*', action: 'write', effect: 'deny' },
            ],
          },
        ],
      };
      const template = generator.generate(config);
      const manifest = JSON.parse(template.files.get('manifest.json')!);
      expect(manifest.policies[0].rules).toHaveLength(1);
      expect(manifest.policies[0].rules[0].effect).toBe('deny');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 11. PascalCase conversion
  // ═══════════════════════════════════════════════════════════════

  describe('PascalCase conversion', () => {
    it('should convert kebab-case name to PascalCase in contract', () => {
      const template = generator.generate(createBaseConfig('my-awesome-pack'));
      const contractContent = template.files.get('src/contract.ts')!;
      expect(contractContent).toContain('MyAwesomePackContract');
    });

    it('should convert snake_case name to PascalCase in contract', () => {
      const template = generator.generate(createBaseConfig('my_awesome_pack'));
      const contractContent = template.files.get('src/contract.ts')!;
      expect(contractContent).toContain('MyAwesomePackContract');
    });
  });
});
