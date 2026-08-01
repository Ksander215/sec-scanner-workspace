#!/usr/bin/env python3
"""
Generator script for TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation

Generates all 15 subsystem implementation files + the orchestrator + index.ts barrel export.
"""

import os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'core', 'marketplace')

# ── Shared preamble used by every subsystem file ──────────────────

IMPORTS_BLOCK = """import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';"""

PUBLISH_EVENT = """
  private async publishEvent(event: Record<string, unknown>, aggregateId: string, aggregateType: string): Promise<void> {
    const full = Object.freeze({
      ...event,
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId,
      aggregateType,
      version: '1.0.0',
    });
    if (this.eventBus) {
      await this.eventBus.publish(full as DomainEventBase);
    }
  }"""


def write_file(name: str, content: str):
    path = os.path.join(OUT_DIR, name)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'  wrote {name} ({len(content.splitlines())} lines)')


# ════════════════════════════════════════════════════════════════════
# 1. capability-registry.ts
# ════════════════════════════════════════════════════════════════════

def gen_capability_registry():
    return '''/**
 * Capability Registry Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
''' + IMPORTS_BLOCK + """
import type { CapabilityEntry, CapabilityRegistryConfig } from './types.js';
import { brandCapabilityId } from './types.js';
import type { ICapabilityRegistry, CapabilityRegistrationParams } from './contracts.js';
import { CapabilityNotFoundError, CapabilityLimitExceededError, CapabilityDuplicateError } from './errors.js';
import type { CapabilityRegisteredEvent } from './events.js';
import { PackageStatus } from './types.js';

export class CapabilityRegistry implements ICapabilityRegistry {
  private readonly config: CapabilityRegistryConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly capabilities = new Map<string, CapabilityEntry>();
  private readonly nameIndex = new Map<string, string>();

  constructor(config: CapabilityRegistryConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async register(params: CapabilityRegistrationParams): Promise<CapabilityEntry> {
    if (this.capabilities.size >= this.config.maxCapabilities) {
      throw new CapabilityLimitExceededError(this.config.maxCapabilities);
    }
    const existing = this.nameIndex.get(params.name);
    if (existing) {
      throw new CapabilityDuplicateError(params.name);
    }
    const now: Timestamp = new Date().toISOString();
    const id = brandCapabilityId(crypto.randomUUID());
    const entry: CapabilityEntry = Object.freeze({
      id,
      name: params.name,
      description: params.description,
      version: params.version,
      publisherId: params.publisherId,
      category: params.category,
      tags: Object.freeze([...params.tags]),
      permissions: Object.freeze([...params.permissions]),
      dependencies: Object.freeze([...params.dependencies]),
      compatibilityRequirements: Object.freeze([...params.compatibilityRequirements]),
      signatureId: null,
      status: PackageStatus.Draft,
      installed: false,
      installCount: 0,
      rating: 0,
      ratingCount: 0,
      createdAt: now,
      updatedAt: now,
      metadata: Object.freeze({ ...params.metadata }),
    });
    this.capabilities.set(id as string, entry);
    this.nameIndex.set(params.name, id as string);
    const event: CapabilityRegisteredEvent = Object.freeze({
      eventType: 'marketplace.capability.registered',
      classification: EventClassification.Info,
      capabilityId: id,
      name: params.name,
      version: params.version,
      publisherId: params.publisherId,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, id as string, 'Capability');
    return entry;
  }

  async updateStatus(id: import('./types.js').CapabilityId, status: PackageStatus): Promise<void> {
    const key = id as string;
    const existing = this.capabilities.get(key);
    if (!existing) {
      throw new CapabilityNotFoundError(key);
    }
    const now: Timestamp = new Date().toISOString();
    const updated: CapabilityEntry = Object.freeze({
      ...existing,
      status,
      updatedAt: now,
    });
    this.capabilities.set(key, updated);
  }

  async getById(id: import('./types.js').CapabilityId): Promise<CapabilityEntry | null> {
    return this.capabilities.get(id as string) ?? null;
  }

  async getByName(name: string): Promise<CapabilityEntry | null> {
    const key = this.nameIndex.get(name);
    if (!key) return null;
    return this.capabilities.get(key) ?? null;
  }

  async list(filter?: Partial<{ status: PackageStatus; category: string; publisherId: import('./types.js').PublisherId; installed: boolean }>): Promise<readonly CapabilityEntry[]> {
    let results = [...this.capabilities.values()];
    if (filter) {
      if (filter.status !== undefined) {
        results = results.filter(e => e.status === filter.status);
      }
      if (filter.category !== undefined) {
        results = results.filter(e => e.category === filter.category);
      }
      if (filter.publisherId !== undefined) {
        results = results.filter(e => e.publisherId === filter.publisherId);
      }
      if (filter.installed !== undefined) {
        results = results.filter(e => e.installed === filter.installed);
      }
    }
    return Object.freeze(results);
  }

  async remove(id: import('./types.js').CapabilityId): Promise<void> {
    const key = id as string;
    const entry = this.capabilities.get(key);
    if (!entry) {
      throw new CapabilityNotFoundError(key);
    }
    this.capabilities.delete(key);
    this.nameIndex.delete(entry.name);
  }

  async count(): Promise<number> {
    return this.capabilities.size;
  }

""" + PUBLISH_EVENT + """
}
"""


# ════════════════════════════════════════════════════════════════════
# 2. package-runtime.ts
# ════════════════════════════════════════════════════════════════════

def gen_package_runtime():
    return '''/**
 * Package Runtime Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
''' + IMPORTS_BLOCK + """
import type { CapabilityPackage, PackageRuntimeConfig, PackageManifest } from './types.js';
import { brandPackageId } from './types.js';
import type { IPackageRuntime, PackageCreationParams } from './contracts.js';
import { PackageNotFoundError, PackageLimitExceededError, PackageSizeExceededError, ManifestValidationError } from './errors.js';
import type { PackageCreatedEvent } from './events.js';
import { PackageStatus } from './types.js';

export class PackageRuntime implements IPackageRuntime {
  private readonly config: PackageRuntimeConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly packages = new Map<string, CapabilityPackage>();

  constructor(config: PackageRuntimeConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async createPackage(params: PackageCreationParams): Promise<CapabilityPackage> {
    if (this.packages.size >= this.config.maxPackages) {
      throw new PackageLimitExceededError(this.config.maxPackages);
    }
    if (params.sizeBytes > this.config.maxPackageSizeBytes) {
      throw new PackageSizeExceededError(params.sizeBytes, this.config.maxPackageSizeBytes);
    }
    const now: Timestamp = new Date().toISOString();
    const id = brandPackageId(crypto.randomUUID());
    const pkg: CapabilityPackage = Object.freeze({
      id,
      capabilityId: params.capabilityId,
      name: params.name,
      version: params.version,
      manifest: params.manifest,
      checksum: params.checksum,
      sizeBytes: params.sizeBytes,
      signatureId: null,
      status: PackageStatus.Draft,
      publisherId: params.publisherId,
      createdAt: now,
      updatedAt: now,
      metadata: Object.freeze({ ...params.metadata }),
    });
    this.packages.set(id as string, pkg);
    const event: PackageCreatedEvent = Object.freeze({
      eventType: 'marketplace.package.created',
      classification: EventClassification.Info,
      packageId: id,
      capabilityId: params.capabilityId,
      version: params.version,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, id as string, 'Package');
    return pkg;
  }

  async getById(id: import('./types.js').PackageId): Promise<CapabilityPackage | null> {
    return this.packages.get(id as string) ?? null;
  }

  async getByCapabilityId(capabilityId: import('./types.js').CapabilityId): Promise<CapabilityPackage | null> {
    for (const pkg of this.packages.values()) {
      if (pkg.capabilityId === capabilityId) return pkg;
    }
    return null;
  }

  async list(filter?: Partial<{ status: PackageStatus; publisherId: import('./types.js').PublisherId }>): Promise<readonly CapabilityPackage[]> {
    let results = [...this.packages.values()];
    if (filter) {
      if (filter.status !== undefined) {
        results = results.filter(p => p.status === filter.status);
      }
      if (filter.publisherId !== undefined) {
        results = results.filter(p => p.publisherId === filter.publisherId);
      }
    }
    return Object.freeze(results);
  }

  async validateManifest(manifest: PackageManifest): Promise<boolean> {
    if (!manifest.name || !manifest.version || !manifest.main || !manifest.entryPoint) {
      throw new ManifestValidationError('Required fields missing (name, version, main, entryPoint)');
    }
    return true;
  }

  async count(): Promise<number> {
    return this.packages.size;
  }

""" + PUBLISH_EVENT + """
}
"""


# ════════════════════════════════════════════════════════════════════
# 3. marketplace-runtime.ts
# ════════════════════════════════════════════════════════════════════

def gen_marketplace_runtime():
    return '''/**
 * Marketplace Runtime Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
''' + IMPORTS_BLOCK + """
import type { CatalogEntry, MarketplaceConfig } from './types.js';
import type { IMarketplaceRuntime, CatalogAddParams } from './contracts.js';
import { CatalogLimitExceededError, CapabilityNotFoundError } from './errors.js';
import type { CatalogEntryAddedEvent } from './events.js';
import { CatalogSource } from './types.js';

export class MarketplaceRuntime implements IMarketplaceRuntime {
  private readonly config: MarketplaceConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly catalog = new Map<string, CatalogEntry>();

  constructor(config: MarketplaceConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async addToCatalog(params: CatalogAddParams): Promise<CatalogEntry> {
    if (this.catalog.size >= this.config.maxCatalogEntries) {
      throw new CatalogLimitExceededError(this.config.maxCatalogEntries);
    }
    const now: Timestamp = new Date().toISOString();
    const entry: CatalogEntry = Object.freeze({
      capabilityId: params.capabilityId,
      name: '',
      description: '',
      version: '0.0.0',
      publisherId: '' as unknown as import('./types.js').PublisherId,
      source: params.source,
      category: '',
      tags: Object.freeze([]),
      rating: 0,
      downloadCount: 0,
      compatible: true,
      featured: params.featured,
      publishedAt: now,
      metadata: Object.freeze({ ...params.metadata }),
    });
    this.catalog.set(params.capabilityId as string, entry);
    const event: CatalogEntryAddedEvent = Object.freeze({
      eventType: 'marketplace.catalog.entryAdded',
      classification: EventClassification.Info,
      capabilityId: params.capabilityId,
      name: entry.name,
      source: params.source,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, params.capabilityId as string, 'CatalogEntry');
    return entry;
  }

  async removeFromCatalog(capId: import('./types.js').CapabilityId): Promise<void> {
    const key = capId as string;
    if (!this.catalog.has(key)) {
      throw new CapabilityNotFoundError(key);
    }
    this.catalog.delete(key);
  }

  async search(query: string, filter?: Partial<{ category: string; source: CatalogSource; compatible: boolean }>): Promise<readonly CatalogEntry[]> {
    const lower = query.toLowerCase();
    let results = [...this.catalog.values()];
    results = results.filter(e =>
      e.name.toLowerCase().includes(lower) ||
      e.description.toLowerCase().includes(lower)
    );
    if (filter) {
      if (filter.category !== undefined) {
        results = results.filter(e => e.category === filter.category);
      }
      if (filter.source !== undefined) {
        results = results.filter(e => e.source === filter.source);
      }
      if (filter.compatible !== undefined) {
        results = results.filter(e => e.compatible === filter.compatible);
      }
    }
    return Object.freeze(results);
  }

  async getFeatured(): Promise<readonly CatalogEntry[]> {
    return Object.freeze([...this.catalog.values()].filter(e => e.featured));
  }

  async getById(capId: import('./types.js').CapabilityId): Promise<CatalogEntry | null> {
    return this.catalog.get(capId as string) ?? null;
  }

  async list(filter?: Partial<{ source: CatalogSource; category: string }>): Promise<readonly CatalogEntry[]> {
    let results = [...this.catalog.values()];
    if (filter) {
      if (filter.source !== undefined) {
        results = results.filter(e => e.source === filter.source);
      }
      if (filter.category !== undefined) {
        results = results.filter(e => e.category === filter.category);
      }
    }
    return Object.freeze(results);
  }

  async count(): Promise<number> {
    return this.catalog.size;
  }

""" + PUBLISH_EVENT + """
}
"""


# ════════════════════════════════════════════════════════════════════
# 4. installation-engine.ts
# ════════════════════════════════════════════════════════════════════

def gen_installation_engine():
    return '''/**
 * Installation Engine Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
''' + IMPORTS_BLOCK + """
import type { Installation, InstallationEngineConfig } from './types.js';
import { brandInstallationId } from './types.js';
import type { IInstallationEngine, InstallationParams } from './contracts.js';
import { InstallationNotFoundError, InstallationStateError } from './errors.js';
import type { InstallationStartedEvent, InstallationCompletedEvent, InstallationRemovedEvent } from './events.js';
import { InstallationStatus } from './types.js';

export class InstallationEngine implements IInstallationEngine {
  private readonly config: InstallationEngineConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly installations = new Map<string, Installation>();

  constructor(config: InstallationEngineConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async install(params: InstallationParams): Promise<Installation> {
    const now: Timestamp = new Date().toISOString();
    const id = brandInstallationId(crypto.randomUUID());
    const installing: Installation = Object.freeze({
      id,
      capabilityId: params.capabilityId,
      packageId: params.packageId,
      version: params.version,
      status: InstallationStatus.Installing,
      installedAt: null,
      uninstalledAt: null,
      error: null,
      permissionsGranted: Object.freeze([]),
      sandboxId: null,
      previousVersion: null,
      rollbackVersion: null,
      metadata: Object.freeze({ ...params.metadata }),
    });
    this.installations.set(id as string, installing);
    const startedEvent: InstallationStartedEvent = Object.freeze({
      eventType: 'marketplace.installation.started',
      classification: EventClassification.Info,
      installationId: id,
      capabilityId: params.capabilityId,
      version: params.version,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(startedEvent as unknown as Record<string, unknown>, id as string, 'Installation');
    const completedNow: Timestamp = new Date().toISOString();
    const completed: Installation = Object.freeze({
      ...installing,
      status: InstallationStatus.Installed,
      installedAt: completedNow,
    });
    this.installations.set(id as string, completed);
    const completedEvent: InstallationCompletedEvent = Object.freeze({
      eventType: 'marketplace.installation.completed',
      classification: EventClassification.Result,
      installationId: id,
      capabilityId: params.capabilityId,
      version: params.version,
      durationMs: 0,
      timestamp: completedNow,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(completedEvent as unknown as Record<string, unknown>, id as string, 'Installation');
    return completed;
  }

  async uninstall(installationId: import('./types.js').InstallationId): Promise<void> {
    const key = installationId as string;
    const existing = this.installations.get(key);
    if (!existing) {
      throw new InstallationNotFoundError(key);
    }
    if (existing.status !== InstallationStatus.Installed) {
      throw new InstallationStateError(key, existing.status, 'Uninstalled');
    }
    const now: Timestamp = new Date().toISOString();
    const uninstalled: Installation = Object.freeze({
      ...existing,
      status: InstallationStatus.Uninstalled,
      uninstalledAt: now,
    });
    this.installations.set(key, uninstalled);
    const event: InstallationRemovedEvent = Object.freeze({
      eventType: 'marketplace.installation.removed',
      classification: EventClassification.Info,
      installationId,
      capabilityId: existing.capabilityId,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, key, 'Installation');
  }

  async getById(id: import('./types.js').InstallationId): Promise<Installation | null> {
    return this.installations.get(id as string) ?? null;
  }

  async getByCapabilityId(capabilityId: import('./types.js').CapabilityId): Promise<Installation | null> {
    for (const inst of this.installations.values()) {
      if (inst.capabilityId === capabilityId && inst.status === InstallationStatus.Installed) return inst;
    }
    return null;
  }

  async list(filter?: Partial<{ status: InstallationStatus; capabilityId: import('./types.js').CapabilityId }>): Promise<readonly Installation[]> {
    let results = [...this.installations.values()];
    if (filter) {
      if (filter.status !== undefined) {
        results = results.filter(i => i.status === filter.status);
      }
      if (filter.capabilityId !== undefined) {
        results = results.filter(i => i.capabilityId === filter.capabilityId);
      }
    }
    return Object.freeze(results);
  }

  async count(): Promise<number> {
    return this.installations.size;
  }

""" + PUBLISH_EVENT + """
}
"""


# ════════════════════════════════════════════════════════════════════
# 5. update-engine.ts
# ════════════════════════════════════════════════════════════════════

def gen_update_engine():
    return '''/**
 * Update Engine Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
''' + IMPORTS_BLOCK + """
import type { UpdateRecord, UpdateEngineConfig } from './types.js';
import type { IUpdateEngine } from './contracts.js';
import { InstallationNotFoundError, UpdateError, NoUpdateAvailableError, RollbackError } from './errors.js';
import type { UpdateStartedEvent, UpdateCompletedEvent, UpdateRolledBackEvent } from './events.js';
import { InstallationStatus } from './types.js';

export class UpdateEngine implements IUpdateEngine {
  private readonly config: UpdateEngineConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly updates = new Map<string, UpdateRecord[]>();

  constructor(config: UpdateEngineConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async checkForUpdates(installationId: import('./types.js').InstallationId): Promise<UpdateRecord | null> {
    const history = this.updates.get(installationId as string);
    if (!history || history.length === 0) return null;
    return history[history.length - 1];
  }

  async update(installationId: import('./types.js').InstallationId, toVersion: string): Promise<UpdateRecord> {
    const key = installationId as string;
    const history = this.updates.get(key) ?? [];
    const fromVersion = history.length > 0 ? history[history.length - 1].toVersion : '0.0.0';
    const now: Timestamp = new Date().toISOString();
    const startedRecord: UpdateRecord = Object.freeze({
      installationId,
      capabilityId: '' as unknown as import('./types.js').CapabilityId,
      fromVersion,
      toVersion,
      status: InstallationStatus.Updating,
      initiatedAt: now,
      completedAt: null,
      error: null,
      rolledBack: false,
      metadata: Object.freeze({}),
    });
    const startedEvent: UpdateStartedEvent = Object.freeze({
      eventType: 'marketplace.update.started',
      classification: EventClassification.Info,
      installationId,
      capabilityId: '' as unknown as import('./types.js').CapabilityId,
      fromVersion,
      toVersion,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(startedEvent as unknown as Record<string, unknown>, key, 'UpdateRecord');
    const completedNow: Timestamp = new Date().toISOString();
    const completedRecord: UpdateRecord = Object.freeze({
      ...startedRecord,
      status: InstallationStatus.Installed,
      completedAt: completedNow,
    });
    const updatedHistory = [...history, completedRecord];
    this.updates.set(key, Object.freeze(updatedHistory));
    const completedEvent: UpdateCompletedEvent = Object.freeze({
      eventType: 'marketplace.update.completed',
      classification: EventClassification.Result,
      installationId,
      capabilityId: '' as unknown as import('./types.js').CapabilityId,
      fromVersion,
      toVersion,
      durationMs: 0,
      timestamp: completedNow,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(completedEvent as unknown as Record<string, unknown>, key, 'UpdateRecord');
    return completedRecord;
  }

  async rollback(installationId: import('./types.js').InstallationId): Promise<UpdateRecord> {
    const key = installationId as string;
    const history = this.updates.get(key);
    if (!history || history.length === 0) {
      throw new RollbackError('No update history to roll back');
    }
    const lastRecord = history[history.length - 1];
    const now: Timestamp = new Date().toISOString();
    const rollbackRecord: UpdateRecord = Object.freeze({
      installationId,
      capabilityId: lastRecord.capabilityId,
      fromVersion: lastRecord.toVersion,
      toVersion: lastRecord.fromVersion,
      status: InstallationStatus.RolledBack,
      initiatedAt: now,
      completedAt: now,
      error: null,
      rolledBack: true,
      metadata: Object.freeze({}),
    });
    const updatedHistory = [...history, rollbackRecord];
    this.updates.set(key, Object.freeze(updatedHistory));
    const event: UpdateRolledBackEvent = Object.freeze({
      eventType: 'marketplace.update.rolledBack',
      classification: EventClassification.Info,
      installationId,
      capabilityId: lastRecord.capabilityId,
      fromVersion: lastRecord.toVersion,
      toVersion: lastRecord.fromVersion,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, key, 'UpdateRecord');
    return rollbackRecord;
  }

  async listUpdates(filter?: Partial<{ status: InstallationStatus; capabilityId: import('./types.js').CapabilityId }>): Promise<readonly UpdateRecord[]> {
    let results: UpdateRecord[] = [];
    for (const history of this.updates.values()) {
      results.push(...history);
    }
    if (filter) {
      if (filter.status !== undefined) {
        results = results.filter(r => r.status === filter.status);
      }
      if (filter.capabilityId !== undefined) {
        results = results.filter(r => r.capabilityId === filter.capabilityId);
      }
    }
    return Object.freeze(results);
  }

  async getUpdateHistory(installationId: import('./types.js').InstallationId): Promise<readonly UpdateRecord[]> {
    const history = this.updates.get(installationId as string);
    return Object.freeze(history ?? []);
  }

""" + PUBLISH_EVENT + """
}
"""


# ════════════════════════════════════════════════════════════════════
# 6. dependency-resolver.ts
# ════════════════════════════════════════════════════════════════════

def gen_dependency_resolver():
    return '''/**
 * Dependency Resolver Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
''' + IMPORTS_BLOCK + """
import type { DependencyNode, DependencyResolverConfig, PackageDependency, CapabilityEntry } from './types.js';
import { brandDependencyNodeId } from './types.js';
import type { IDependencyResolver } from './contracts.js';
import { DependencyResolutionError, CircularDependencyError, DependencyNotFoundError, CapabilityNotFoundError } from './errors.js';
import type { DependencyResolvedEvent } from './events.js';

export class DependencyResolver implements IDependencyResolver {
  private readonly config: DependencyResolverConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly resolutions = new Map<string, DependencyNode[]>();
  private capabilities: readonly CapabilityEntry[] = Object.freeze([]);

  constructor(config: DependencyResolverConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  setCapabilities(caps: readonly CapabilityEntry[]): void {
    this.capabilities = caps;
  }

  async resolve(capabilityId: import('./types.js').CapabilityId): Promise<DependencyNode[]> {
    const key = capabilityId as string;
    const startTime = Date.now();
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const nodes: DependencyNode[] = [];

    const walk = (pkgName: string, depth: number): void => {
      if (depth > this.config.maxDepth) return;
      if (visited.has(pkgName)) return;
      if (visiting.has(pkgName)) {
        throw new CircularDependencyError(pkgName);
      }
      visiting.add(pkgName);
      const cap = this.capabilities.find(c => c.name === pkgName);
      if (!cap) {
        if (!cap) throw new DependencyNotFoundError(pkgName);
      }
      const deps = cap.dependencies.filter(d => !d.optional);
      const childIds: import('./types.js').DependencyNodeId[] = [];
      for (const dep of deps) {
        const childId = brandDependencyNodeId(crypto.randomUUID());
        childIds.push(childId);
        walk(dep.name, depth + 1);
      }
      const nodeId = brandDependencyNodeId(crypto.randomUUID());
      const node: DependencyNode = Object.freeze({
        id: nodeId,
        packageName: pkgName,
        resolvedVersion: cap.version,
        dependencies: Object.freeze(childIds),
        depth,
        optional: false,
      });
      nodes.push(node);
      visited.add(pkgName);
      visiting.delete(pkgName);
    };

    const cap = this.capabilities.find(c => c.id === capabilityId);
    if (!cap) throw new CapabilityNotFoundError(key);
    walk(cap.name, 0);
    this.resolutions.set(key, Object.freeze(nodes));
    const durationMs = Date.now() - startTime;
    const event: DependencyResolvedEvent = Object.freeze({
      eventType: 'marketplace.dependency.resolved',
      classification: EventClassification.Result,
      capabilityId,
      nodeCount: nodes.length,
      depth: nodes.length > 0 ? Math.max(...nodes.map(n => n.depth)) : 0,
      durationMs,
      timestamp: new Date().toISOString(),
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, key, 'DependencyNode');
    return nodes;
  }

  async getResolution(capId: import('./types.js').CapabilityId): Promise<DependencyNode[] | null> {
    return this.resolutions.get(capId as string) ?? null;
  }

  async hasCircularDependency(capId: import('./types.js').CapabilityId): Promise<boolean> {
    try {
      await this.resolve(capId);
      return false;
    } catch (err) {
      if (err instanceof CircularDependencyError) return true;
      throw err;
    }
  }

  async getDependencies(capId: import('./types.js').CapabilityId): Promise<readonly PackageDependency[]> {
    const cap = this.capabilities.find(c => c.id === capId);
    if (!cap) throw new CapabilityNotFoundError(capId as string);
    return cap.dependencies;
  }

""" + PUBLISH_EVENT + """
}
"""


# ════════════════════════════════════════════════════════════════════
# 7. compatibility-engine.ts
# ════════════════════════════════════════════════════════════════════

def gen_compatibility_engine():
    return '''/**
 * Compatibility Engine Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
''' + IMPORTS_BLOCK + """
import type { CompatibilityReport, CompatibilityCheck, CompatibilityEngineConfig, CapabilityEntry } from './types.js';
import { brandCompatibilityReportId } from './types.js';
import type { ICompatibilityEngine } from './contracts.js';
import { CompatibilityError, CapabilityNotFoundError } from './errors.js';
import type { CompatibilityCheckedEvent } from './events.js';
import { CompatibilityDimension, CompatibilityVerdict } from './types.js';

export class CompatibilityEngine implements ICompatibilityEngine {
  private readonly config: CompatibilityEngineConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly reports = new Map<string, CompatibilityReport>();
  private capabilities: readonly CapabilityEntry[] = Object.freeze([]);

  constructor(config: CompatibilityEngineConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  setCapabilities(caps: readonly CapabilityEntry[]): void {
    this.capabilities = caps;
  }

  async check(capabilityId: import('./types.js').CapabilityId): Promise<CompatibilityReport> {
    const cap = this.capabilities.find(c => c.id === capabilityId);
    if (!cap) throw new CapabilityNotFoundError(capabilityId as string);
    const now: Timestamp = new Date().toISOString();
    const checks: CompatibilityCheck[] = Object.freeze([
      ...this.buildChecks(cap),
    ]);
    const allPassed = checks.every(c => c.passed);
    const hasWarning = checks.some(c => c.warning !== null);
    const verdict = allPassed
      ? (hasWarning ? CompatibilityVerdict.CompatibleWithWarnings : CompatibilityVerdict.Compatible)
      : CompatibilityVerdict.Incompatible;
    const id = brandCompatibilityReportId(crypto.randomUUID());
    const report: CompatibilityReport = Object.freeze({
      id,
      capabilityId,
      version: cap.version,
      verdict,
      checks,
      checkedAt: now,
      metadata: Object.freeze({}),
    });
    this.reports.set(id as string, report);
    const event: CompatibilityCheckedEvent = Object.freeze({
      eventType: 'marketplace.compatibility.checked',
      classification: EventClassification.Result,
      reportId: id,
      capabilityId,
      verdict,
      checkCount: checks.length,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, capabilityId as string, 'CompatibilityReport');
    return report;
  }

  private buildChecks(cap: CapabilityEntry): CompatibilityCheck[] {
    const checks: CompatibilityCheck[] = [];
    for (const req of cap.compatibilityRequirements) {
      let actual = '*';
      if (req.dimension === CompatibilityDimension.Runtime) actual = this.config.runtimeVersion;
      else if (req.dimension === CompatibilityDimension.Platform) actual = this.config.platformVersion;
      else if (req.dimension === CompatibilityDimension.OS) actual = this.config.osType;
      else if (req.dimension === CompatibilityDimension.AIProvider) actual = this.config.aiProviderVersion;
      const passed = actual === '*' || actual === req.required;
      checks.push(Object.freeze({
        dimension: req.dimension,
        required: req.required,
        actual,
        passed,
        warning: passed ? null : `Requires ${req.dimension} ${req.required}, found ${actual}`,
      }));
    }
    if (checks.length === 0) {
      checks.push(Object.freeze({
        dimension: CompatibilityDimension.Runtime,
        required: this.config.runtimeVersion,
        actual: this.config.runtimeVersion,
        passed: true,
        warning: null,
      }));
    }
    return checks;
  }

  async getReport(id: import('./types.js').CompatibilityReportId): Promise<CompatibilityReport | null> {
    return this.reports.get(id as string) ?? null;
  }

  async getVerdict(capId: import('./types.js').CapabilityId): Promise<CompatibilityVerdict> {
    for (const report of this.reports.values()) {
      if (report.capabilityId === capId) return report.verdict;
    }
    return CompatibilityVerdict.Unknown;
  }

  async checkDimension(capId: import('./types.js').CapabilityId, dimension: CompatibilityDimension): Promise<boolean> {
    for (const report of this.reports.values()) {
      if (report.capabilityId === capId) {
        const check = report.checks.find(c => c.dimension === dimension);
        if (check) return check.passed;
      }
    }
    return true;
  }

  async listReports(filter?: Partial<{ verdict: CompatibilityVerdict }>): Promise<readonly CompatibilityReport[]> {
    let results = [...this.reports.values()];
    if (filter?.verdict !== undefined) {
      results = results.filter(r => r.verdict === filter.verdict);
    }
    return Object.freeze(results);
  }

""" + PUBLISH_EVENT + """
}
"""


# ════════════════════════════════════════════════════════════════════
# 8. signature-engine.ts
# ════════════════════════════════════════════════════════════════════

def gen_signature_engine():
    return '''/**
 * Signature Engine Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
''' + IMPORTS_BLOCK + """
import type { PackageSignature, SignatureEngineConfig } from './types.js';
import { brandSignatureId } from './types.js';
import type { ISignatureEngine } from './contracts.js';
import { SignatureVerificationError, SignatureExpiredError } from './errors.js';
import type { PackageSignedEvent, SignatureVerifiedEvent } from './events.js';
import { SignatureAlgorithm, SignatureStatus } from './types.js';

export class SignatureEngine implements ISignatureEngine {
  private readonly config: SignatureEngineConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly signatures = new Map<string, PackageSignature>();

  constructor(config: SignatureEngineConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async sign(packageId: import('./types.js').PackageId, algorithm?: SignatureAlgorithm): Promise<PackageSignature> {
    if (this.signatures.size >= this.config.maxSignatures) {
      throw new SignatureVerificationError('Maximum signatures exceeded');
    }
    const now: Timestamp = new Date().toISOString();
    const algo = algorithm ?? this.config.defaultAlgorithm;
    const id = brandSignatureId(crypto.randomUUID());
    const expiresAt = new Date(Date.now() + this.config.expiryDays * 86400000).toISOString();
    const signature: PackageSignature = Object.freeze({
      id,
      packageId,
      algorithm: algo,
      publicKey: '',
      signature: '',
      signedAt: now,
      expiresAt: expiresAt as Timestamp,
      status: SignatureStatus.Valid,
      verifiedAt: null,
      metadata: Object.freeze({}),
    });
    this.signatures.set(id as string, signature);
    const event: PackageSignedEvent = Object.freeze({
      eventType: 'marketplace.signature.signed',
      classification: EventClassification.Info,
      signatureId: id,
      packageId,
      algorithm: algo as unknown as string,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, id as string, 'PackageSignature');
    return signature;
  }

  async verify(signatureId: import('./types.js').SignatureId): Promise<SignatureStatus> {
    const sig = this.signatures.get(signatureId as string);
    if (!sig) throw new SignatureVerificationError('Signature not found');
    const now = new Date();
    const expires = new Date(sig.expiresAt);
    let status: SignatureStatus;
    if (now > expires) {
      status = SignatureStatus.Expired;
    } else {
      status = SignatureStatus.Valid;
    }
    const nowTs: Timestamp = new Date().toISOString();
    const updated: PackageSignature = Object.freeze({
      ...sig,
      status,
      verifiedAt: nowTs,
    });
    this.signatures.set(signatureId as string, updated);
    const event: SignatureVerifiedEvent = Object.freeze({
      eventType: 'marketplace.signature.verified',
      classification: EventClassification.Result,
      signatureId,
      status,
      timestamp: nowTs,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, signatureId as string, 'PackageSignature');
    return status;
  }

  async getById(id: import('./types.js').SignatureId): Promise<PackageSignature | null> {
    return this.signatures.get(id as string) ?? null;
  }

  async getByPackageId(packageId: import('./types.js').PackageId): Promise<PackageSignature | null> {
    for (const sig of this.signatures.values()) {
      if (sig.packageId === packageId) return sig;
    }
    return null;
  }

  async revoke(signatureId: import('./types.js').SignatureId): Promise<void> {
    const key = signatureId as string;
    const sig = this.signatures.get(key);
    if (!sig) throw new SignatureVerificationError('Signature not found');
    const revoked: PackageSignature = Object.freeze({
      ...sig,
      status: SignatureStatus.Revoked,
    });
    this.signatures.set(key, revoked);
  }

  async count(): Promise<number> {
    return this.signatures.size;
  }

""" + PUBLISH_EVENT + """
}
"""


# ════════════════════════════════════════════════════════════════════
# 9. sandbox-runtime.ts
# ════════════════════════════════════════════════════════════════════

def gen_sandbox_runtime():
    return '''/**
 * Sandbox Runtime Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
''' + IMPORTS_BLOCK + """
import type { SandboxInstance, SandboxRuntimeConfig } from './types.js';
import { brandSandboxId } from './types.js';
import type { ISandboxRuntime } from './contracts.js';
import { SandboxError, SandboxLimitExceededError } from './errors.js';
import type { SandboxCreatedEvent, SandboxStateChangedEvent, SandboxTerminatedEvent } from './events.js';
import { SandboxLevel, SandboxState } from './types.js';

export class SandboxRuntime implements ISandboxRuntime {
  private readonly config: SandboxRuntimeConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly sandboxes = new Map<string, SandboxInstance>();

  constructor(config: SandboxRuntimeConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async create(installationId: import('./types.js').InstallationId, capId: import('./types.js').CapabilityId, level?: SandboxLevel): Promise<SandboxInstance> {
    if (this.sandboxes.size >= this.config.maxInstances) {
      throw new SandboxLimitExceededError(this.config.maxInstances);
    }
    const now: Timestamp = new Date().toISOString();
    const id = brandSandboxId(crypto.randomUUID());
    const resolvedLevel = level ?? this.config.defaultLevel;
    const instance: SandboxInstance = Object.freeze({
      id,
      installationId,
      capabilityId: capId,
      level: resolvedLevel,
      state: SandboxState.Created,
      allowedPermissions: Object.freeze([]),
      resourceLimits: this.config.defaultResourceLimits,
      createdAt: now,
      terminatedAt: null,
      metadata: Object.freeze({}),
    });
    this.sandboxes.set(id as string, instance);
    const event: SandboxCreatedEvent = Object.freeze({
      eventType: 'marketplace.sandbox.created',
      classification: EventClassification.Info,
      sandboxId: id,
      installationId,
      capabilityId: capId,
      level: resolvedLevel,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, id as string, 'SandboxInstance');
    return instance;
  }

  private async transitionState(sandboxId: import('./types.js').SandboxId, toState: SandboxState): Promise<void> {
    const key = sandboxId as string;
    const existing = this.sandboxes.get(key);
    if (!existing) throw new SandboxError('Sandbox not found');
    const fromState = existing.state;
    const updated: SandboxInstance = Object.freeze({ ...existing, state: toState });
    this.sandboxes.set(key, updated);
    const now: Timestamp = new Date().toISOString();
    const event: SandboxStateChangedEvent = Object.freeze({
      eventType: 'marketplace.sandbox.stateChanged',
      classification: EventClassification.StateChange,
      sandboxId,
      fromState,
      toState,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, key, 'SandboxInstance');
  }

  async start(sandboxId: import('./types.js').SandboxId): Promise<void> {
    await this.transitionState(sandboxId, SandboxState.Running);
  }

  async pause(sandboxId: import('./types.js').SandboxId): Promise<void> {
    await this.transitionState(sandboxId, SandboxState.Paused);
  }

  async stop(sandboxId: import('./types.js').SandboxId): Promise<void> {
    await this.transitionState(sandboxId, SandboxState.Stopped);
  }

  async terminate(sandboxId: import('./types.js').SandboxId, reason?: string): Promise<void> {
    const key = sandboxId as string;
    const existing = this.sandboxes.get(key);
    if (!existing) throw new SandboxError('Sandbox not found');
    const now: Timestamp = new Date().toISOString();
    const terminated: SandboxInstance = Object.freeze({
      ...existing,
      state: SandboxState.Terminated,
      terminatedAt: now,
    });
    this.sandboxes.set(key, terminated);
    const event: SandboxTerminatedEvent = Object.freeze({
      eventType: 'marketplace.sandbox.terminated',
      classification: EventClassification.StateChange,
      sandboxId,
      reason: reason ?? 'No reason provided',
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, key, 'SandboxInstance');
  }

  async getById(id: import('./types.js').SandboxId): Promise<SandboxInstance | null> {
    return this.sandboxes.get(id as string) ?? null;
  }

  async getByInstallationId(installationId: import('./types.js').InstallationId): Promise<SandboxInstance | null> {
    for (const sb of this.sandboxes.values()) {
      if (sb.installationId === installationId) return sb;
    }
    return null;
  }

  async list(filter?: Partial<{ state: SandboxState }>): Promise<readonly SandboxInstance[]> {
    let results = [...this.sandboxes.values()];
    if (filter?.state !== undefined) {
      results = results.filter(s => s.state === filter.state);
    }
    return Object.freeze(results);
  }

  async count(): Promise<number> {
    return this.sandboxes.size;
  }

""" + PUBLISH_EVENT + """
}
"""


# ════════════════════════════════════════════════════════════════════
# 10. permission-runtime.ts
# ════════════════════════════════════════════════════════════════════

def gen_permission_runtime():
    return '''/**
 * Permission Runtime Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
''' + IMPORTS_BLOCK + """
import type { PermissionRequest, PermissionRuntimeConfig } from './types.js';
import { brandPermissionSetId } from './types.js';
import type { IPermissionRuntime } from './contracts.js';
import { PermissionDeniedError, PermissionLimitExceededError } from './errors.js';
import type { PermissionRequestedEvent, PermissionGrantedEvent, PermissionDeniedEvent } from './events.js';
import { PermissionType, PermissionDecision } from './types.js';

export class PermissionRuntime implements IPermissionRuntime {
  private readonly config: PermissionRuntimeConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly requests = new Map<string, PermissionRequest>();

  constructor(config: PermissionRuntimeConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async requestPermissions(capabilityId: import('./types.js').CapabilityId, permissions: readonly PermissionType[]): Promise<PermissionRequest> {
    const pendingCount = [...this.requests.values()].filter(r => r.pendingPermissions.length > 0).length;
    if (pendingCount >= this.config.maxPendingRequests) {
      throw new PermissionLimitExceededError(this.config.maxPendingRequests);
    }
    const now: Timestamp = new Date().toISOString();
    const id = brandPermissionSetId(crypto.randomUUID());
    const permArray = [...permissions];
    const autoGrantable = this.config.autoGrantSafePermissions
      ? permArray.filter(p => !this.config.requireExplicitGrant.includes(p))
      : [];
    const pending = permArray.filter(p => !autoGrantable.includes(p));
    const request: PermissionRequest = Object.freeze({
      id,
      capabilityId,
      requestedPermissions: Object.freeze(permArray),
      grantedPermissions: Object.freeze(autoGrantable),
      deniedPermissions: Object.freeze([]),
      pendingPermissions: Object.freeze(pending),
      decidedAt: autoGrantable.length > 0 ? now : null,
      metadata: Object.freeze({}),
    });
    this.requests.set(id as string, request);
    const requestedEvent: PermissionRequestedEvent = Object.freeze({
      eventType: 'marketplace.permission.requested',
      classification: EventClassification.Info,
      permissionSetId: id,
      capabilityId,
      permissions: Object.freeze(permArray),
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(requestedEvent as unknown as Record<string, unknown>, id as string, 'PermissionRequest');
    if (autoGrantable.length > 0) {
      const grantedEvent: PermissionGrantedEvent = Object.freeze({
        eventType: 'marketplace.permission.granted',
        classification: EventClassification.Result,
        permissionSetId: id,
        capabilityId,
        permissions: Object.freeze(autoGrantable),
        timestamp: now,
        metadata: Object.freeze({}),
      });
      await this.publishEvent(grantedEvent as unknown as Record<string, unknown>, id as string, 'PermissionRequest');
    }
    return request;
  }

  async grant(permissionSetId: import('./types.js').PermissionSetId, permissions: readonly PermissionType[]): Promise<void> {
    const key = permissionSetId as string;
    const existing = this.requests.get(key);
    if (!existing) throw new PermissionDeniedError('Permission set not found');
    const now: Timestamp = new Date().toISOString();
    const newGranted = [...existing.grantedPermissions, ...permissions];
    const newPending = existing.pendingPermissions.filter(p => !permissions.includes(p));
    const updated: PermissionRequest = Object.freeze({
      ...existing,
      grantedPermissions: Object.freeze(newGranted),
      pendingPermissions: Object.freeze(newPending),
      decidedAt: now,
    });
    this.requests.set(key, updated);
    const event: PermissionGrantedEvent = Object.freeze({
      eventType: 'marketplace.permission.granted',
      classification: EventClassification.Result,
      permissionSetId,
      capabilityId: existing.capabilityId,
      permissions: Object.freeze([...permissions]),
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, key, 'PermissionRequest');
  }

  async deny(permissionSetId: import('./types.js').PermissionSetId, permissions: readonly PermissionType[]): Promise<void> {
    const key = permissionSetId as string;
    const existing = this.requests.get(key);
    if (!existing) throw new PermissionDeniedError('Permission set not found');
    const now: Timestamp = new Date().toISOString();
    const newDenied = [...existing.deniedPermissions, ...permissions];
    const newPending = existing.pendingPermissions.filter(p => !permissions.includes(p));
    const updated: PermissionRequest = Object.freeze({
      ...existing,
      deniedPermissions: Object.freeze(newDenied),
      pendingPermissions: Object.freeze(newPending),
      decidedAt: now,
    });
    this.requests.set(key, updated);
    const event: PermissionDeniedEvent = Object.freeze({
      eventType: 'marketplace.permission.denied',
      classification: EventClassification.Result,
      permissionSetId,
      capabilityId: existing.capabilityId,
      permissions: Object.freeze([...permissions]),
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, key, 'PermissionRequest');
  }

  async revoke(permissionSetId: import('./types.js').PermissionSetId): Promise<void> {
    const key = permissionSetId as string;
    const existing = this.requests.get(key);
    if (!existing) throw new PermissionDeniedError('Permission set not found');
    const now: Timestamp = new Date().toISOString();
    const updated: PermissionRequest = Object.freeze({
      ...existing,
      grantedPermissions: Object.freeze([]),
      deniedPermissions: Object.freeze([...existing.requestedPermissions]),
      pendingPermissions: Object.freeze([]),
      decidedAt: now,
    });
    this.requests.set(key, updated);
  }

  async getById(id: import('./types.js').PermissionSetId): Promise<PermissionRequest | null> {
    return this.requests.get(id as string) ?? null;
  }

  async getByCapabilityId(capId: import('./types.js').CapabilityId): Promise<PermissionRequest | null> {
    for (const req of this.requests.values()) {
      if (req.capabilityId === capId) return req;
    }
    return null;
  }

  async listPending(): Promise<readonly PermissionRequest[]> {
    return Object.freeze([...this.requests.values()].filter(r => r.pendingPermissions.length > 0));
  }

  async checkPermission(capId: import('./types.js').CapabilityId, permission: PermissionType): Promise<boolean> {
    for (const req of this.requests.values()) {
      if (req.capabilityId === capId && req.grantedPermissions.includes(permission)) {
        return true;
      }
    }
    return false;
  }

""" + PUBLISH_EVENT + """
}
"""


# ════════════════════════════════════════════════════════════════════
# 11. rating-runtime.ts
# ════════════════════════════════════════════════════════════════════

def gen_rating_runtime():
    return '''/**
 * Rating Runtime Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
''' + IMPORTS_BLOCK + """
import type { RatingEntry, RatingRuntimeConfig } from './types.js';
import { brandRatingId } from './types.js';
import type { IRatingRuntime, RatingSubmissionParams } from './contracts.js';
import { RatingError } from './errors.js';
import type { RatingSubmittedEvent } from './events.js';
import { RatingDimension } from './types.js';

export class RatingRuntime implements IRatingRuntime {
  private readonly config: RatingRuntimeConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly ratings = new Map<string, RatingEntry>();

  constructor(config: RatingRuntimeConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async submit(params: RatingSubmissionParams): Promise<RatingEntry> {
    const scores = params.scores as Readonly<Record<string, number>>;
    for (const dim of this.config.dimensions) {
      const val = scores[dim];
      if (val === undefined || val < this.config.minScore || val > this.config.maxScore) {
        throw new RatingError(`Score for ${dim} must be between ${this.config.minScore} and ${this.config.maxScore}`);
      }
    }
    const now: Timestamp = new Date().toISOString();
    const id = brandRatingId(crypto.randomUUID());
    const entry: RatingEntry = Object.freeze({
      id,
      capabilityId: params.capabilityId,
      userId: params.userId,
      scores: Object.freeze({ ...params.scores }),
      comment: params.comment,
      createdAt: now,
      metadata: Object.freeze({ ...params.metadata }),
    });
    this.ratings.set(id as string, entry);
    const values = Object.values(params.scores);
    const averageScore = values.reduce((a, b) => a + b, 0) / values.length;
    const event: RatingSubmittedEvent = Object.freeze({
      eventType: 'marketplace.rating.submitted',
      classification: EventClassification.Info,
      ratingId: id,
      capabilityId: params.capabilityId,
      averageScore,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, id as string, 'RatingEntry');
    return entry;
  }

  async getByCapabilityId(capId: import('./types.js').CapabilityId): Promise<readonly RatingEntry[]> {
    return Object.freeze([...this.ratings.values()].filter(r => r.capabilityId === capId));
  }

  async getAverage(capId: import('./types.js').CapabilityId): Promise<number> {
    const capRatings = [...this.ratings.values()].filter(r => r.capabilityId === capId);
    if (capRatings.length === 0) return 0;
    const allScores = capRatings.flatMap(r => Object.values(r.scores));
    return allScores.reduce((a, b) => a + b, 0) / allScores.length;
  }

  async getById(id: import('./types.js').RatingId): Promise<RatingEntry | null> {
    return this.ratings.get(id as string) ?? null;
  }

  async list(): Promise<readonly RatingEntry[]> {
    return Object.freeze([...this.ratings.values()]);
  }

  async count(): Promise<number> {
    return this.ratings.size;
  }

""" + PUBLISH_EVENT + """
}
"""


# ════════════════════════════════════════════════════════════════════
# 12. recommendation-runtime.ts
# ════════════════════════════════════════════════════════════════════

def gen_recommendation_runtime():
    return '''/**
 * Recommendation Runtime Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
''' + IMPORTS_BLOCK + """
import type { Recommendation, RecommendationRuntimeConfig, CapabilityEntry } from './types.js';
import { brandRecommendationId } from './types.js';
import type { IRecommendationRuntime, RecommendationContext } from './contracts.js';
import { RecommendationError } from './errors.js';
import type { RecommendationGeneratedEvent } from './events.js';

export class RecommendationRuntime implements IRecommendationRuntime {
  private readonly config: RecommendationRuntimeConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly recommendations = new Map<string, Recommendation>();
  private capabilities: readonly CapabilityEntry[] = Object.freeze([]);

  constructor(config: RecommendationRuntimeConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  setCapabilities(caps: readonly CapabilityEntry[]): void {
    this.capabilities = caps;
  }

  async recommend(params: RecommendationContext): Promise<readonly Recommendation[]> {
    const installedSet = new Set(params.installedCapabilities.map(c => c as string));
    const candidates = this.capabilities.filter(c => !installedSet.has(c.id as string));
    const results: Recommendation[] = [];
    for (const cap of candidates) {
      if (results.length >= this.config.maxRecommendations) break;
      let score = 0;
      const reasons: string[] = [];
      for (const goal of params.goals) {
        if (cap.category.toLowerCase().includes(goal.toLowerCase()) ||
            cap.description.toLowerCase().includes(goal.toLowerCase()) ||
            cap.tags.some(t => t.toLowerCase().includes(goal.toLowerCase()))) {
          score += this.config.goalWeight;
          reasons.push(`matches goal: ${goal}`);
        }
      }
      if (params.workflowContext &&
          (cap.description.toLowerCase().includes(params.workflowContext.toLowerCase()) ||
           cap.tags.some(t => t.toLowerCase().includes(params.workflowContext.toLowerCase())))) {
        score += this.config.contextWeight;
        reasons.push('matches workflow context');
      }
      if (cap.rating > 3) {
        score += this.config.experienceWeight * (cap.rating / 5);
        reasons.push(`high rating: ${cap.rating}`);
      }
      if (score >= this.config.minScore) {
        const now: Timestamp = new Date().toISOString();
        const id = brandRecommendationId(crypto.randomUUID());
        const rec: Recommendation = Object.freeze({
          id,
          capabilityId: cap.id,
          reason: reasons.join('; '),
          score,
          basedOn: Object.freeze(reasons),
          createdAt: now,
          metadata: Object.freeze({}),
        });
        results.push(rec);
        this.recommendations.set(id as string, rec);
        const event: RecommendationGeneratedEvent = Object.freeze({
          eventType: 'marketplace.recommendation.generated',
          classification: EventClassification.Info,
          recommendationId: id,
          capabilityId: cap.id,
          score,
          timestamp: now,
          metadata: Object.freeze({}),
        });
        await this.publishEvent(event as unknown as Record<string, unknown>, id as string, 'Recommendation');
      }
    }
    return Object.freeze(results);
  }

  async getById(id: import('./types.js').RecommendationId): Promise<Recommendation | null> {
    return this.recommendations.get(id as string) ?? null;
  }

  async list(): Promise<readonly Recommendation[]> {
    return Object.freeze([...this.recommendations.values()]);
  }

  async count(): Promise<number> {
    return this.recommendations.size;
  }

""" + PUBLISH_EVENT + """
}
"""


# ════════════════════════════════════════════════════════════════════
# 13. composition-engine.ts
# ════════════════════════════════════════════════════════════════════

def gen_composition_engine():
    return '''/**
 * Composition Engine Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
''' + IMPORTS_BLOCK + """
import type { Composition, CompositionStep, CompositionEngineConfig } from './types.js';
import { brandCompositionId } from './types.js';
import type { ICompositionEngine, CompositionCreationParams } from './contracts.js';
import { CompositionError, CompositionLimitExceededError, CompositionValidationError } from './errors.js';
import type { CompositionCreatedEvent, CompositionActivatedEvent, CompositionDeactivatedEvent } from './events.js';
import { CompositionType } from './types.js';

export class CompositionEngine implements ICompositionEngine {
  private readonly config: CompositionEngineConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly compositions = new Map<string, Composition>();

  constructor(config: CompositionEngineConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async create(params: CompositionCreationParams): Promise<Composition> {
    if (this.compositions.size >= this.config.maxCompositions) {
      throw new CompositionLimitExceededError(this.config.maxCompositions);
    }
    if (params.steps.length > this.config.maxStepsPerComposition) {
      throw new CompositionValidationError(`Max steps exceeded: ${params.steps.length} > ${this.config.maxStepsPerComposition}`);
    }
    const capIds = [...new Set(params.steps.map(s => s.capabilityId))];
    if (capIds.length > this.config.maxCapabilitiesPerComposition) {
      throw new CompositionValidationError(`Max capabilities exceeded: ${capIds.length} > ${this.config.maxCapabilitiesPerComposition}`);
    }
    const now: Timestamp = new Date().toISOString();
    const id = brandCompositionId(crypto.randomUUID());
    const steps: CompositionStep[] = params.steps.map(s => Object.freeze({
      order: s.order,
      capabilityId: s.capabilityId,
      config: Object.freeze({ ...s.config }),
      fallbackCapabilityId: s.fallbackCapabilityId,
      condition: s.condition,
    }));
    const composition: Composition = Object.freeze({
      id,
      name: params.name,
      description: params.description,
      type: params.type,
      steps: Object.freeze(steps),
      capabilities: Object.freeze(capIds),
      active: false,
      createdAt: now,
      updatedAt: now,
      metadata: Object.freeze({ ...params.metadata }),
    });
    this.compositions.set(id as string, composition);
    const event: CompositionCreatedEvent = Object.freeze({
      eventType: 'marketplace.composition.created',
      classification: EventClassification.Info,
      compositionId: id,
      name: params.name,
      type: params.type,
      capabilityCount: capIds.length,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, id as string, 'Composition');
    return composition;
  }

  async activate(compositionId: import('./types.js').CompositionId): Promise<void> {
    const key = compositionId as string;
    const existing = this.compositions.get(key);
    if (!existing) throw new CompositionError('Composition not found');
    const now: Timestamp = new Date().toISOString();
    const updated: Composition = Object.freeze({ ...existing, active: true, updatedAt: now });
    this.compositions.set(key, updated);
    const event: CompositionActivatedEvent = Object.freeze({
      eventType: 'marketplace.composition.activated',
      classification: EventClassification.StateChange,
      compositionId,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, key, 'Composition');
  }

  async deactivate(compositionId: import('./types.js').CompositionId): Promise<void> {
    const key = compositionId as string;
    const existing = this.compositions.get(key);
    if (!existing) throw new CompositionError('Composition not found');
    const now: Timestamp = new Date().toISOString();
    const updated: Composition = Object.freeze({ ...existing, active: false, updatedAt: now });
    this.compositions.set(key, updated);
    const event: CompositionDeactivatedEvent = Object.freeze({
      eventType: 'marketplace.composition.deactivated',
      classification: EventClassification.StateChange,
      compositionId,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, key, 'Composition');
  }

  async getById(id: import('./types.js').CompositionId): Promise<Composition | null> {
    return this.compositions.get(id as string) ?? null;
  }

  async list(filter?: Partial<{ active: boolean; type: CompositionType }>): Promise<readonly Composition[]> {
    let results = [...this.compositions.values()];
    if (filter) {
      if (filter.active !== undefined) {
        results = results.filter(c => c.active === filter.active);
      }
      if (filter.type !== undefined) {
        results = results.filter(c => c.type === filter.type);
      }
    }
    return Object.freeze(results);
  }

  async count(): Promise<number> {
    return this.compositions.size;
  }

""" + PUBLISH_EVENT + """
}
"""


# ════════════════════════════════════════════════════════════════════
# 14. publisher-runtime.ts
# ════════════════════════════════════════════════════════════════════

def gen_publisher_runtime():
    return '''/**
 * Publisher Runtime Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
''' + IMPORTS_BLOCK + """
import type { Publisher, PublisherRuntimeConfig } from './types.js';
import { brandPublisherId } from './types.js';
import type { IPublisherRuntime, PublisherRegistrationParams } from './contracts.js';
import { PublisherNotFoundError, PublisherLimitExceededError } from './errors.js';
import type { PublisherRegisteredEvent, PublisherStatusChangedEvent } from './events.js';
import { PublisherStatus } from './types.js';

export class PublisherRuntime implements IPublisherRuntime {
  private readonly config: PublisherRuntimeConfig;
  private readonly eventBus: InProcessEventBus | null;
  private readonly publishers = new Map<string, Publisher>();

  constructor(config: PublisherRuntimeConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;
  }

  async register(params: PublisherRegistrationParams): Promise<Publisher> {
    if (this.publishers.size >= this.config.maxPublishers) {
      throw new PublisherLimitExceededError(this.config.maxPublishers);
    }
    const now: Timestamp = new Date().toISOString();
    const id = brandPublisherId(crypto.randomUUID());
    const publisher: Publisher = Object.freeze({
      id,
      name: params.name,
      description: params.description,
      status: PublisherStatus.Unverified,
      publicKey: params.publicKey,
      capabilities: Object.freeze([]),
      totalDownloads: 0,
      averageRating: 0,
      createdAt: now,
      metadata: Object.freeze({ ...params.metadata }),
    });
    this.publishers.set(id as string, publisher);
    const event: PublisherRegisteredEvent = Object.freeze({
      eventType: 'marketplace.publisher.registered',
      classification: EventClassification.Info,
      publisherId: id,
      name: params.name,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, id as string, 'Publisher');
    return publisher;
  }

  async updateStatus(publisherId: import('./types.js').PublisherId, status: PublisherStatus): Promise<void> {
    const key = publisherId as string;
    const existing = this.publishers.get(key);
    if (!existing) {
      throw new PublisherNotFoundError(key);
    }
    const now: Timestamp = new Date().toISOString();
    const updated: Publisher = Object.freeze({ ...existing, status });
    this.publishers.set(key, updated);
    const event: PublisherStatusChangedEvent = Object.freeze({
      eventType: 'marketplace.publisher.statusChanged',
      classification: EventClassification.StateChange,
      publisherId,
      fromStatus: existing.status,
      toStatus: status,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, key, 'Publisher');
  }

  async getById(id: import('./types.js').PublisherId): Promise<Publisher | null> {
    return this.publishers.get(id as string) ?? null;
  }

  async list(filter?: Partial<{ status: PublisherStatus }>): Promise<readonly Publisher[]> {
    let results = [...this.publishers.values()];
    if (filter?.status !== undefined) {
      results = results.filter(p => p.status === filter.status);
    }
    return Object.freeze(results);
  }

  async count(): Promise<number> {
    return this.publishers.size;
  }

""" + PUBLISH_EVENT + """
}
"""


# ════════════════════════════════════════════════════════════════════
# 15. ecosystem-runtime.ts (orchestrator)
# ════════════════════════════════════════════════════════════════════

def gen_ecosystem_runtime():
    return '''/**
 * Ecosystem Runtime — Orchestrator
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 *
 * Wires together all 14 subsystems and provides the single entry-point
 * for initialization, scanning, metrics, and shutdown.
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type {
  EcosystemRuntimeConfig, EcosystemMetrics, EcosystemState,
  CapabilityEntry,
} from './types.js';
import { EcosystemState as ES } from './types.js';
import type { IEcosystemRuntime, EcosystemScanResult } from './contracts.js';
import type {
  ICapabilityRegistry, IPackageRuntime, IMarketplaceRuntime,
  IInstallationEngine, IUpdateEngine, IDependencyResolver,
  ICompatibilityEngine, ISignatureEngine, ISandboxRuntime,
  IPermissionRuntime, IRatingRuntime, IRecommendationRuntime,
  ICompositionEngine, IPublisherRuntime,
} from './contracts.js';
import { EcosystemNotInitializedError, EcosystemRuntimeError } from './errors.js';
import type {
  EcosystemInitializedEvent, EcosystemStateChangedEvent, EcosystemScanCompletedEvent,
} from './events.js';
import { CapabilityRegistry } from './capability-registry.js';
import { PackageRuntime } from './package-runtime.js';
import { MarketplaceRuntime } from './marketplace-runtime.js';
import { InstallationEngine } from './installation-engine.js';
import { UpdateEngine } from './update-engine.js';
import { DependencyResolver } from './dependency-resolver.js';
import { CompatibilityEngine } from './compatibility-engine.js';
import { SignatureEngine } from './signature-engine.js';
import { SandboxRuntime } from './sandbox-runtime.js';
import { PermissionRuntime } from './permission-runtime.js';
import { RatingRuntime } from './rating-runtime.js';
import { RecommendationRuntime } from './recommendation-runtime.js';
import { CompositionEngine } from './composition-engine.js';
import { PublisherRuntime } from './publisher-runtime.js';

export class EcosystemRuntime implements IEcosystemRuntime {
  private readonly config: EcosystemRuntimeConfig;
  private readonly eventBus: InProcessEventBus | null;
  private _state: EcosystemState = ES.Uninitialized;
  private _lastScanAt: Timestamp | null = null;

  private readonly _capabilityRegistry: CapabilityRegistry;
  private readonly _packageRuntime: PackageRuntime;
  private readonly _marketplaceRuntime: MarketplaceRuntime;
  private readonly _installationEngine: InstallationEngine;
  private readonly _updateEngine: UpdateEngine;
  private readonly _dependencyResolver: DependencyResolver;
  private readonly _compatibilityEngine: CompatibilityEngine;
  private readonly _signatureEngine: SignatureEngine;
  private readonly _sandboxRuntime: SandboxRuntime;
  private readonly _permissionRuntime: PermissionRuntime;
  private readonly _ratingRuntime: RatingRuntime;
  private readonly _recommendationRuntime: RecommendationRuntime;
  private readonly _compositionEngine: CompositionEngine;
  private readonly _publisherRuntime: PublisherRuntime;

  constructor(config: EcosystemRuntimeConfig, eventBus?: InProcessEventBus | null) {
    this.config = config;
    this.eventBus = eventBus ?? null;

    const eb = this.eventBus;
    this._capabilityRegistry = new CapabilityRegistry(config.capabilityRegistry, eb);
    this._packageRuntime = new PackageRuntime(config.packageRuntime, eb);
    this._marketplaceRuntime = new MarketplaceRuntime(config.marketplace, eb);
    this._installationEngine = new InstallationEngine(config.installationEngine, eb);
    this._updateEngine = new UpdateEngine(config.updateEngine, eb);
    this._dependencyResolver = new DependencyResolver(config.dependencyResolver, eb);
    this._compatibilityEngine = new CompatibilityEngine(config.compatibilityEngine, eb);
    this._signatureEngine = new SignatureEngine(config.signatureEngine, eb);
    this._sandboxRuntime = new SandboxRuntime(config.sandboxRuntime, eb);
    this._permissionRuntime = new PermissionRuntime(config.permissionRuntime, eb);
    this._ratingRuntime = new RatingRuntime(config.ratingRuntime, eb);
    this._recommendationRuntime = new RecommendationRuntime(config.recommendationRuntime, eb);
    this._compositionEngine = new CompositionEngine(config.compositionEngine, eb);
    this._publisherRuntime = new PublisherRuntime(config.publisherRuntime, eb);
  }

  get state(): EcosystemState { return this._state; }

  async initialize(): Promise<void> {
    const prevState = this._state;
    this._state = ES.Ready;
    const now: Timestamp = new Date().toISOString();
    const event: EcosystemInitializedEvent = Object.freeze({
      eventType: 'marketplace.ecosystem.initialized',
      classification: EventClassification.StateChange,
      subsystemCount: 14,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, 'ecosystem', 'EcosystemRuntime');
    const stateEvent: EcosystemStateChangedEvent = Object.freeze({
      eventType: 'marketplace.ecosystem.stateChanged',
      classification: EventClassification.StateChange,
      fromState: prevState,
      toState: ES.Ready,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(stateEvent as unknown as Record<string, unknown>, 'ecosystem', 'EcosystemRuntime');
  }

  async shutdown(): Promise<void> {
    const prevState = this._state;
    this._state = ES.Stopped;
    const now: Timestamp = new Date().toISOString();
    const event: EcosystemStateChangedEvent = Object.freeze({
      eventType: 'marketplace.ecosystem.stateChanged',
      classification: EventClassification.StateChange,
      fromState: prevState,
      toState: ES.Stopped,
      timestamp: now,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, 'ecosystem', 'EcosystemRuntime');
  }

  async scan(): Promise<EcosystemScanResult> {
    if (this._state !== ES.Ready) {
      throw new EcosystemNotInitializedError();
    }
    const startTime = Date.now();
    const allCaps = await this._capabilityRegistry.list();
    let updatesAvailable = 0;
    let compatibilityIssues = 0;
    for (const cap of allCaps) {
      try {
        const report = await this._compatibilityEngine.check(cap.id);
        if (report.verdict !== import('./types.js').CompatibilityVerdict.Compatible) {
          compatibilityIssues++;
        }
      } catch {
        compatibilityIssues++;
      }
    }
    const pendingPerms = await this._permissionRuntime.listPending();
    this._lastScanAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;
    const event: EcosystemScanCompletedEvent = Object.freeze({
      eventType: 'marketplace.ecosystem.scanCompleted',
      classification: EventClassification.Result,
      capabilitiesScanned: allCaps.length,
      updatesAvailable,
      durationMs,
      timestamp: this._lastScanAt,
      metadata: Object.freeze({}),
    });
    await this.publishEvent(event as unknown as Record<string, unknown>, 'ecosystem', 'EcosystemRuntime');
    return Object.freeze({
      capabilitiesScanned: allCaps.length,
      updatesAvailable,
      compatibilityIssues,
      pendingPermissions: pendingPerms.length,
      durationMs,
    });
  }

  async getMetrics(): Promise<EcosystemMetrics> {
    const [totalCaps, installedCaps, activeInstalls, totalPubs, totalRatings, totalComps, activeComps, totalDownloads, totalPkgs, sandboxCount] = await Promise.all([
      this._capabilityRegistry.count(),
      this._installationEngine.count(),
      this._installationEngine.count(),
      this._publisherRuntime.count(),
      this._ratingRuntime.count(),
      this._compositionEngine.count(),
      this._compositionEngine.list().then(c => c.filter(x => x.active).length),
      Promise.resolve(0),
      this._packageRuntime.count(),
      this._sandboxRuntime.count(),
    ]);
    const verifiedPubs = (await this._publisherRuntime.list({ status: import('./types.js').PublisherStatus.Verified })).length;
    const allRatings = await this._ratingRuntime.list();
    const avgRating = allRatings.length > 0
      ? allRatings.flatMap(r => Object.values(r.scores)).reduce((a, b) => a + b, 0) / allRatings.flatMap(r => Object.values(r.scores)).length
      : 0;
    return Object.freeze({
      totalCapabilities: totalCaps,
      installedCapabilities: installedCaps,
      activeInstallations: activeInstalls,
      totalPublishers: totalPubs,
      verifiedPublishers: verifiedPubs,
      totalRatings,
      averageRating: avgRating,
      totalCompositions: totalComps,
      activeCompositions: activeComps,
      totalDownloads,
      pendingUpdates: 0,
      failedInstallations: 0,
      sandboxInstances: sandboxCount,
      totalPackages: totalPkgs,
      lastScanAt: this._lastScanAt,
      metadata: Object.freeze({}),
    });
  }

  getCapabilityRegistry(): ICapabilityRegistry { return this._capabilityRegistry; }
  getPackageRuntime(): IPackageRuntime { return this._packageRuntime; }
  getMarketplaceRuntime(): IMarketplaceRuntime { return this._marketplaceRuntime; }
  getInstallationEngine(): IInstallationEngine { return this._installationEngine; }
  getUpdateEngine(): IUpdateEngine { return this._updateEngine; }
  getDependencyResolver(): IDependencyResolver { return this._dependencyResolver; }
  getCompatibilityEngine(): ICompatibilityEngine { return this._compatibilityEngine; }
  getSignatureEngine(): ISignatureEngine { return this._signatureEngine; }
  getSandboxRuntime(): ISandboxRuntime { return this._sandboxRuntime; }
  getPermissionRuntime(): IPermissionRuntime { return this._permissionRuntime; }
  getRatingRuntime(): IRatingRuntime { return this._ratingRuntime; }
  getRecommendationRuntime(): IRecommendationRuntime { return this._recommendationRuntime; }
  getCompositionEngine(): ICompositionEngine { return this._compositionEngine; }
  getPublisherRuntime(): IPublisherRuntime { return this._publisherRuntime; }

  private async publishEvent(event: Record<string, unknown>, aggregateId: string, aggregateType: string): Promise<void> {
    const full = Object.freeze({
      ...event,
      eventId: crypto.randomUUID(),
      sequence: 0,
      aggregateId,
      aggregateType,
      version: '1.0.0',
    });
    if (this.eventBus) {
      await this.eventBus.publish(full as DomainEventBase);
    }
  }
}
'''


# ════════════════════════════════════════════════════════════════════
# index.ts — barrel export
# ════════════════════════════════════════════════════════════════════

def gen_index():
    return """/**
 * Capability Marketplace & Ecosystem Foundation — Barrel Export
 * TASK-AIS-009A.000
 */

export * from './types.js';
export * from './errors.js';
export * from './events.js';
export * from './contracts.js';
export { CapabilityRegistry } from './capability-registry.js';
export { PackageRuntime } from './package-runtime.js';
export { MarketplaceRuntime } from './marketplace-runtime.js';
export { InstallationEngine } from './installation-engine.js';
export { UpdateEngine } from './update-engine.js';
export { DependencyResolver } from './dependency-resolver.js';
export { CompatibilityEngine } from './compatibility-engine.js';
export { SignatureEngine } from './signature-engine.js';
export { SandboxRuntime } from './sandbox-runtime.js';
export { PermissionRuntime } from './permission-runtime.js';
export { RatingRuntime } from './rating-runtime.js';
export { RecommendationRuntime } from './recommendation-runtime.js';
export { CompositionEngine } from './composition-engine.js';
export { PublisherRuntime } from './publisher-runtime.js';
export { EcosystemRuntime } from './ecosystem-runtime.js';
"""


# ════════════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════════════

def main():
    print('Generating marketplace subsystem implementation files...')
    os.makedirs(OUT_DIR, exist_ok=True)

    files = {
        'capability-registry.ts': gen_capability_registry(),
        'package-runtime.ts': gen_package_runtime(),
        'marketplace-runtime.ts': gen_marketplace_runtime(),
        'installation-engine.ts': gen_installation_engine(),
        'update-engine.ts': gen_update_engine(),
        'dependency-resolver.ts': gen_dependency_resolver(),
        'compatibility-engine.ts': gen_compatibility_engine(),
        'signature-engine.ts': gen_signature_engine(),
        'sandbox-runtime.ts': gen_sandbox_runtime(),
        'permission-runtime.ts': gen_permission_runtime(),
        'rating-runtime.ts': gen_rating_runtime(),
        'recommendation-runtime.ts': gen_recommendation_runtime(),
        'composition-engine.ts': gen_composition_engine(),
        'publisher-runtime.ts': gen_publisher_runtime(),
        'ecosystem-runtime.ts': gen_ecosystem_runtime(),
        'index.ts': gen_index(),
    }

    for name, content in files.items():
        write_file(name, content)

    print(f'\nDone! Generated {len(files)} files.')


if __name__ == '__main__':
    main()
