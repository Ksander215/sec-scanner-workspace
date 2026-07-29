/**
 * Domain Pack SDK — Builder API for creating capability packs.
 * TASK-AIS-003G.000
 *
 * Provides a fluent API for constructing capability packs without
 * knowing the internal details of the capability runtime.
 *
 * Usage:
 *   const pack = createCapability({
 *     name: 'security-pack',
 *     version: '1.0.0',
 *     ...
 *   })
 *   .withDependency('core-utils', '1.0.0')
 *   .withPermission('Memory', 'Read', 'context')
 *   .withInterface('ISecurityScanner', ['scan', 'audit'])
 *   .build();
 */
import type {
  CapabilityBuilderConfig,
  CapabilityManifest,
  CapabilityPackId,
  CapabilityDependency,
  CapabilityPermission,
  CapabilityInterface,
  CapabilityPolicy,
  CapabilityPolicyRule,
  CapabilityExport,
  CapabilityContract,
  CapabilityHealthResult,
  CapabilityContractMetadata,
  CapabilityContext,
  CapabilityPermissionType,
  CapabilityAccessLevel,
  SemVer,
  Timestamp,
} from './types.js';
import {
  CapabilityTrustLevel as CTL,
} from './types.js';
import { brandCapabilityPackId, brandManifestId } from './types.js';

export class CapabilityBuilder {
  private readonly config: CapabilityBuilderConfig;
  private dependencies: CapabilityDependency[] = [];
  private permissions: CapabilityPermission[] = [];
  private interfaces: CapabilityInterface[] = [];
  private policies: CapabilityPolicy[] = [];
  private exports: CapabilityExport[] = [];
  private keywords: string[] = [];
  private metadata: Record<string, unknown> = {};
  private homepage?: string;
  private repository?: string;
  private coreVersion?: SemVer;
  private runtimeVersion?: SemVer;
  private apiVersion?: SemVer;
  private adrVersion?: SemVer;
  private checksum = '';
  private signature?: string;

  constructor(config: CapabilityBuilderConfig) {
    this.config = config;
  }

  withDependency(packId: CapabilityPackId | string, name: string, version: SemVer, optional = false, reason = ''): CapabilityBuilder {
    this.dependencies.push(Object.freeze({
      packId: brandCapabilityPackId(packId),
      name,
      version,
      optional,
      reason,
    }));
    return this;
  }

  withPermission(type: CapabilityPermissionType, access: CapabilityAccessLevel, resource: string, description: string): CapabilityBuilder {
    this.permissions.push(Object.freeze({ type, access, resource, description }));
    return this;
  }

  withInterface(name: string, version: SemVer, description: string, methods: string[]): CapabilityBuilder {
    this.interfaces.push(Object.freeze({ name, version, description, methods: Object.freeze(methods) }));
    return this;
  }

  withPolicy(name: string, description: string, rules: CapabilityPolicyRule[]): CapabilityBuilder {
    this.policies.push(Object.freeze({ name, description, rules: Object.freeze(rules) }));
    return this;
  }

  withExport(name: string, type: string, description: string, version: SemVer): CapabilityBuilder {
    this.exports.push(Object.freeze({ name, type, description, version }));
    return this;
  }

  withKeywords(...keywords: string[]): CapabilityBuilder {
    this.keywords = [...this.keywords, ...keywords];
    return this;
  }

  withMetadata(data: Record<string, unknown>): CapabilityBuilder {
    this.metadata = Object.freeze({ ...this.metadata, ...data });
    return this;
  }

  withHomepage(url: string): CapabilityBuilder {
    this.homepage = url;
    return this;
  }

  withRepository(url: string): CapabilityBuilder {
    this.repository = url;
    return this;
  }

  withSystemRequirements(core?: SemVer, runtime?: SemVer, api?: SemVer, adr?: SemVer): CapabilityBuilder {
    this.coreVersion = core;
    this.runtimeVersion = runtime;
    this.apiVersion = api;
    this.adrVersion = adr;
    return this;
  }

  withChecksum(checksum: string): CapabilityBuilder {
    this.checksum = checksum;
    return this;
  }

  withSignature(signature: string): CapabilityBuilder {
    this.signature = signature;
    return this;
  }

  /**
   * Build the manifest.
   */
  buildManifest(): CapabilityManifest {
    const now = new Date().toISOString() as Timestamp;
    const packId = brandCapabilityPackId(crypto.randomUUID());
    const manifestId = brandManifestId(crypto.randomUUID());

    return Object.freeze({
      id: manifestId,
      packId,
      name: this.config.name,
      version: this.config.version,
      description: this.config.description,
      author: this.config.author,
      license: this.config.license ?? 'MIT',
      homepage: this.homepage,
      repository: this.repository,
      keywords: Object.freeze(this.keywords),
      dependencies: Object.freeze(this.dependencies),
      interfaces: Object.freeze(this.interfaces),
      permissions: Object.freeze(this.permissions),
      trustLevel: this.config.trustLevel ?? CTL.Trusted,
      policies: Object.freeze(this.policies),
      exports: Object.freeze(this.exports),
      checksum: this.checksum,
      signature: this.signature,
      coreVersion: this.coreVersion,
      runtimeVersion: this.runtimeVersion,
      apiVersion: this.apiVersion,
      adrVersion: this.adrVersion,
      createdAt: now,
      updatedAt: now,
      metadata: Object.freeze(this.metadata),
    });
  }

  /**
   * Build the manifest with a specific pack ID (for testing/updates).
   */
  buildManifestWithId(packId: CapabilityPackId): CapabilityManifest {
    const now = new Date().toISOString() as Timestamp;
    const manifestId = brandManifestId(crypto.randomUUID());

    return Object.freeze({
      id: manifestId,
      packId,
      name: this.config.name,
      version: this.config.version,
      description: this.config.description,
      author: this.config.author,
      license: this.config.license ?? 'MIT',
      homepage: this.homepage,
      repository: this.repository,
      keywords: Object.freeze(this.keywords),
      dependencies: Object.freeze(this.dependencies),
      interfaces: Object.freeze(this.interfaces),
      permissions: Object.freeze(this.permissions),
      trustLevel: this.config.trustLevel ?? CTL.Trusted,
      policies: Object.freeze(this.policies),
      exports: Object.freeze(this.exports),
      checksum: this.checksum,
      signature: this.signature,
      coreVersion: this.coreVersion,
      runtimeVersion: this.runtimeVersion,
      apiVersion: this.apiVersion,
      adrVersion: this.adrVersion,
      createdAt: now,
      updatedAt: now,
      metadata: Object.freeze(this.metadata),
    });
  }
}

/**
 * Create a new CapabilityBuilder.
 */
export function createCapability(config: CapabilityBuilderConfig): CapabilityBuilder {
  return new CapabilityBuilder(config);
}

/**
 * Create a minimal contract from functions.
 */
export function createContract(opts: {
  initialize?: (context: CapabilityContext) => Promise<void>;
  shutdown?: () => Promise<void>;
  health?: () => Promise<CapabilityHealthResult>;
  metadata?: () => CapabilityContractMetadata;
  capabilities?: () => readonly string[];
}): CapabilityContract {
  return Object.freeze({
    initialize: opts.initialize ?? (async () => {}),
    shutdown: opts.shutdown ?? (async () => {}),
    health: opts.health ?? (async () => ({ healthy: true, checkedAt: new Date().toISOString() })),
    metadata: opts.metadata ?? (() => ({ name: 'anonymous', version: '0.0.0', description: '', capabilities: [] })),
    capabilities: opts.capabilities ?? (() => []),
  });
}

/**
 * Create a manifest.json string for a pack.
 */
export function createManifestJson(config: CapabilityBuilderConfig): string {
  const builder = createCapability(config);
  const manifest = builder.buildManifest();
  // Strip branded types for JSON serialization
  return JSON.stringify({
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    author: manifest.author,
    license: manifest.license,
    homepage: manifest.homepage,
    repository: manifest.repository,
    keywords: manifest.keywords,
    dependencies: manifest.dependencies.map(d => ({
      packId: d.packId,
      name: d.name,
      version: d.version,
      optional: d.optional,
      reason: d.reason,
    })),
    interfaces: manifest.interfaces.map(i => ({
      name: i.name,
      version: i.version,
      description: i.description,
      methods: i.methods,
    })),
    permissions: manifest.permissions.map(p => ({
      type: p.type,
      access: p.access,
      resource: p.resource,
      description: p.description,
    })),
    trustLevel: manifest.trustLevel,
    policies: manifest.policies.map(p => ({
      name: p.name,
      description: p.description,
      rules: p.rules,
    })),
    exports: manifest.exports.map(e => ({
      name: e.name,
      type: e.type,
      description: e.description,
      version: e.version,
    })),
    checksum: manifest.checksum,
    coreVersion: manifest.coreVersion,
    runtimeVersion: manifest.runtimeVersion,
    apiVersion: manifest.apiVersion,
    adrVersion: manifest.adrVersion,
    metadata: manifest.metadata,
  }, null, 2);
}
