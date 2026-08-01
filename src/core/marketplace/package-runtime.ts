/**
 * Package Runtime Implementation
 * TASK-AIS-009A.000 — Capability Marketplace & Ecosystem Foundation
 */
import type { Timestamp } from '../types/common.js';
import type { DomainEventBase } from '../domain/events/domain-event.js';
import { EventClassification } from '../types/common.js';
import type { InProcessEventBus } from '../events/event-bus.js';
import type { CapabilityPackage, PackageRuntimeConfig, PackageManifest } from './types.js';
import { brandPackageId } from './types.js';
import type { IPackageRuntime, PackageCreationParams } from './contracts.js';
import { PackageLimitExceededError, PackageSizeExceededError, ManifestValidationError } from './errors.js';
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
