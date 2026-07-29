/**
 * Pack Generator — Template generator for new capability packs.
 * TASK-AIS-003G.000
 *
 * Generates a complete pack template structure:
 *   my-pack/
 *   ├── manifest.json
 *   ├── src/
 *   │   ├── index.ts
 *   │   └── contract.ts
 *   ├── tests/
 *   │   └── contract.test.ts
 *   └── README.md
 */
import type { CapabilityBuilderConfig, GeneratedPackTemplate } from './types.js';

export class PackGenerator {

  /**
   * Generate a complete pack template.
   */
  generate(config: CapabilityBuilderConfig): GeneratedPackTemplate {
    const files = new Map<string, string>();

    // manifest.json
    files.set('manifest.json', this.generateManifest(config));

    // src/index.ts
    files.set('src/index.ts', this.generateIndex(config));

    // src/contract.ts
    files.set('src/contract.ts', this.generateContract(config));

    // tests/contract.test.ts
    files.set('tests/contract.test.ts', this.generateTests(config));

    // README.md
    files.set('README.md', this.generateReadme(config));

    return { name: config.name, files };
  }

  private generateManifest(config: CapabilityBuilderConfig): string {
    return JSON.stringify({
      name: config.name,
      version: config.version,
      description: config.description,
      author: config.author,
      license: config.license ?? 'MIT',
      keywords: [],
      dependencies: (config.dependencies ?? []).map(d => ({
        packId: d.packId,
        name: d.name,
        version: d.version,
        optional: d.optional ?? false,
        reason: d.reason ?? '',
      })),
      interfaces: [],
      permissions: (config.permissions ?? []).map(p => ({
        type: p.type,
        access: p.access,
        resource: p.resource,
        description: p.description,
      })),
      trustLevel: config.trustLevel ?? 'Trusted',
      policies: (config.policies ?? []).map(p => ({
        name: p.name,
        description: p.description,
        rules: p.rules,
      })),
      exports: [],
      checksum: '',
      metadata: {},
    }, null, 2);
  }

  private generateIndex(config: CapabilityBuilderConfig): string {
    return `/**
 * ${config.name} — Capability Pack
 * Version: ${config.version}
 * Author: ${config.author}
 */

export { ${toPascalCase(config.name)}Contract } from './contract.js';
`;
  }

  private generateContract(config: CapabilityBuilderConfig): string {
    return `/**
 * ${config.name} — Contract Implementation
 * Version: ${config.version}
 *
 * Implements the Capability Contract lifecycle:
 *   initialize, shutdown, health, metadata, capabilities
 */

import type { CapabilityContract, CapabilityContext, CapabilityHealthResult, CapabilityContractMetadata } from '@ais/core';

export class ${toPascalCase(config.name)}Contract implements CapabilityContract {
  private context: CapabilityContext | null = null;

  async initialize(context: CapabilityContext): Promise<void> {
    this.context = context;
    context.logger.info('${config.name} initialized');
  }

  async shutdown(): Promise<void> {
    this.context?.logger.info('${config.name} shutdown');
    this.context = null;
  }

  async health(): Promise<CapabilityHealthResult> {
    return {
      healthy: true,
      details: '${config.name} is healthy',
      checkedAt: new Date().toISOString(),
    };
  }

  metadata(): CapabilityContractMetadata {
    return {
      name: '${config.name}',
      version: '${config.version}',
      description: '${config.description}',
      capabilities: this.capabilities(),
    };
  }

  capabilities(): readonly string[] {
    return [];
  }
}
`;
  }

  private generateTests(config: CapabilityBuilderConfig): string {
    return `/**
 * ${config.name} — Contract Tests
 */

import { ${toPascalCase(config.name)}Contract } from '../src/contract.js';

function createMockContext() {
  const logs: Array<{ level: string; message: string }> = [];
  return {
    context: {
      packId: 'test-pack-id' as any,
      packName: '${config.name}',
      trustLevel: 'Trusted' as any,
      permissions: new Map(),
      logger: {
        debug: (msg: string) => logs.push({ level: 'debug', message: msg }),
        info: (msg: string) => logs.push({ level: 'info', message: msg }),
        warn: (msg: string) => logs.push({ level: 'warn', message: msg }),
        error: (msg: string) => logs.push({ level: 'error', message: msg }),
      },
      emit: async () => {},
      requestPermission: async () => true,
      getConfiguration: () => undefined,
      getState: () => ({}),
      setState: async () => {},
    },
    logs,
  };
}

describe('${toPascalCase(config.name)}Contract', () => {
  it('should initialize successfully', async () => {
    const contract = new ${toPascalCase(config.name)}Contract();
    const { context, logs } = createMockContext();
    await contract.initialize(context as any);
    expect(logs.some(l => l.level === 'info')).toBe(true);
  });

  it('should shutdown cleanly', async () => {
    const contract = new ${toPascalCase(config.name)}Contract();
    const { context } = createMockContext();
    await contract.initialize(context as any);
    await contract.shutdown();
  });

  it('should report healthy', async () => {
    const contract = new ${toPascalCase(config.name)}Contract();
    const result = await contract.health();
    expect(result.healthy).toBe(true);
  });

  it('should return metadata', () => {
    const contract = new ${toPascalCase(config.name)}Contract();
    const meta = contract.metadata();
    expect(meta.name).toBe('${config.name}');
    expect(meta.version).toBe('${config.version}');
  });
});
`;
  }

  private generateReadme(config: CapabilityBuilderConfig): string {
    return `# ${config.name}

${config.description}

## Version
${config.version}

## Author
${config.author}

## License
${config.license ?? 'MIT'}

## Capabilities

(Describe the capabilities provided by this pack.)

## Installation

\`\`\`typescript
import { CapabilityRuntime } from '@ais/core';
const runtime = new CapabilityRuntime();
await runtime.installPack(manifest, contract);
\`\`\`

## Interfaces

(Describe the interfaces this pack exposes.)

## Dependencies

(Describe what other packs this depends on.)

## Permissions

(Describe what permissions this pack requires.)
`;
  }
}

/**
 * Generate a pack template.
 */
export function generatePack(config: CapabilityBuilderConfig): GeneratedPackTemplate {
  const generator = new PackGenerator();
  return generator.generate(config);
}

// ─── Helper ──────────────────────────────────────────────────

function toPascalCase(name: string): string {
  return name
    .split(/[-_\s]+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}
