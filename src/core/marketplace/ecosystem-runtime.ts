/**
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
} from './types.js';
import { CompatibilityVerdict, PublisherStatus } from './types.js';
import { EcosystemState as ES } from './types.js';
import type { IEcosystemRuntime, EcosystemScanResult } from './contracts.js';
import type {
  ICapabilityRegistry, IPackageRuntime, IMarketplaceRuntime,
  IInstallationEngine, IUpdateEngine, IDependencyResolver,
  ICompatibilityEngine, ISignatureEngine, ISandboxRuntime,
  IPermissionRuntime, IRatingRuntime, IRecommendationRuntime,
  ICompositionEngine, IPublisherRuntime,
} from './contracts.js';
import { EcosystemNotInitializedError } from './errors.js';
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
        if (report.verdict !== CompatibilityVerdict.Compatible) {
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
    const verifiedPubs = (await this._publisherRuntime.list({ status: PublisherStatus.Verified })).length;
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
