/**
 * Capability Marketplace & Ecosystem Foundation — Domain Events
 * TASK-AIS-009A.000
 *
 * All domain events emitted by the Ecosystem Runtime.
 * Events are immutable value objects.
 */

import type { Timestamp } from '../types/common.js';
import type {
  CapabilityId, PackageId, InstallationId, PublisherId,
  SignatureId, PermissionSetId, RatingId, RecommendationId,
  CompositionId, SandboxId, CompatibilityReportId,
  PackageStatus,
  CompatibilityVerdict, SignatureStatus, SandboxLevel, SandboxState,
  CompositionType, PublisherStatus,
  CatalogSource,
  EcosystemState,
} from './types.js';
import type { PermissionType } from './types.js';
import { EventClassification } from '../types/common.js';

// ═══════════════════════════════════════════════════════════════════
// CAPABILITY REGISTRY EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface CapabilityRegisteredEvent {
  readonly eventType: 'marketplace.capability.registered';
  readonly classification: EventClassification;
  readonly capabilityId: CapabilityId;
  readonly name: string;
  readonly version: string;
  readonly publisherId: PublisherId;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface CapabilityStatusChangedEvent {
  readonly eventType: 'marketplace.capability.statusChanged';
  readonly classification: EventClassification;
  readonly capabilityId: CapabilityId;
  readonly fromStatus: PackageStatus;
  readonly toStatus: PackageStatus;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface CapabilityRemovedEvent {
  readonly eventType: 'marketplace.capability.removed';
  readonly classification: EventClassification;
  readonly capabilityId: CapabilityId;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// PACKAGE EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface PackageCreatedEvent {
  readonly eventType: 'marketplace.package.created';
  readonly classification: EventClassification;
  readonly packageId: PackageId;
  readonly capabilityId: CapabilityId;
  readonly version: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface PackageStatusChangedEvent {
  readonly eventType: 'marketplace.package.statusChanged';
  readonly classification: EventClassification;
  readonly packageId: PackageId;
  readonly fromStatus: PackageStatus;
  readonly toStatus: PackageStatus;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// CATALOG / MARKETPLACE EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface CatalogEntryAddedEvent {
  readonly eventType: 'marketplace.catalog.entryAdded';
  readonly classification: EventClassification;
  readonly capabilityId: CapabilityId;
  readonly name: string;
  readonly source: CatalogSource;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface CatalogEntryRemovedEvent {
  readonly eventType: 'marketplace.catalog.entryRemoved';
  readonly classification: EventClassification;
  readonly capabilityId: CapabilityId;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// INSTALLATION EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface InstallationStartedEvent {
  readonly eventType: 'marketplace.installation.started';
  readonly classification: EventClassification;
  readonly installationId: InstallationId;
  readonly capabilityId: CapabilityId;
  readonly version: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface InstallationCompletedEvent {
  readonly eventType: 'marketplace.installation.completed';
  readonly classification: EventClassification;
  readonly installationId: InstallationId;
  readonly capabilityId: CapabilityId;
  readonly version: string;
  readonly durationMs: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface InstallationFailedEvent {
  readonly eventType: 'marketplace.installation.failed';
  readonly classification: EventClassification;
  readonly installationId: InstallationId;
  readonly capabilityId: CapabilityId;
  readonly reason: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface InstallationRemovedEvent {
  readonly eventType: 'marketplace.installation.removed';
  readonly classification: EventClassification;
  readonly installationId: InstallationId;
  readonly capabilityId: CapabilityId;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// UPDATE EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface UpdateStartedEvent {
  readonly eventType: 'marketplace.update.started';
  readonly classification: EventClassification;
  readonly installationId: InstallationId;
  readonly capabilityId: CapabilityId;
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface UpdateCompletedEvent {
  readonly eventType: 'marketplace.update.completed';
  readonly classification: EventClassification;
  readonly installationId: InstallationId;
  readonly capabilityId: CapabilityId;
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly durationMs: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface UpdateFailedEvent {
  readonly eventType: 'marketplace.update.failed';
  readonly classification: EventClassification;
  readonly installationId: InstallationId;
  readonly capabilityId: CapabilityId;
  readonly reason: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface UpdateRolledBackEvent {
  readonly eventType: 'marketplace.update.rolledBack';
  readonly classification: EventClassification;
  readonly installationId: InstallationId;
  readonly capabilityId: CapabilityId;
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// DEPENDENCY EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface DependencyResolvedEvent {
  readonly eventType: 'marketplace.dependency.resolved';
  readonly classification: EventClassification;
  readonly capabilityId: CapabilityId;
  readonly nodeCount: number;
  readonly depth: number;
  readonly durationMs: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface DependencyResolutionFailedEvent {
  readonly eventType: 'marketplace.dependency.resolutionFailed';
  readonly classification: EventClassification;
  readonly capabilityId: CapabilityId;
  readonly reason: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// COMPATIBILITY EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface CompatibilityCheckedEvent {
  readonly eventType: 'marketplace.compatibility.checked';
  readonly classification: EventClassification;
  readonly reportId: CompatibilityReportId;
  readonly capabilityId: CapabilityId;
  readonly verdict: CompatibilityVerdict;
  readonly checkCount: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// SIGNATURE EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface PackageSignedEvent {
  readonly eventType: 'marketplace.signature.signed';
  readonly classification: EventClassification;
  readonly signatureId: SignatureId;
  readonly packageId: PackageId;
  readonly algorithm: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SignatureVerifiedEvent {
  readonly eventType: 'marketplace.signature.verified';
  readonly classification: EventClassification;
  readonly signatureId: SignatureId;
  readonly status: SignatureStatus;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// SANDBOX EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface SandboxCreatedEvent {
  readonly eventType: 'marketplace.sandbox.created';
  readonly classification: EventClassification;
  readonly sandboxId: SandboxId;
  readonly installationId: InstallationId;
  readonly capabilityId: CapabilityId;
  readonly level: SandboxLevel;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SandboxStateChangedEvent {
  readonly eventType: 'marketplace.sandbox.stateChanged';
  readonly classification: EventClassification;
  readonly sandboxId: SandboxId;
  readonly fromState: SandboxState;
  readonly toState: SandboxState;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SandboxTerminatedEvent {
  readonly eventType: 'marketplace.sandbox.terminated';
  readonly classification: EventClassification;
  readonly sandboxId: SandboxId;
  readonly reason: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// PERMISSION EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface PermissionRequestedEvent {
  readonly eventType: 'marketplace.permission.requested';
  readonly classification: EventClassification;
  readonly permissionSetId: PermissionSetId;
  readonly capabilityId: CapabilityId;
  readonly permissions: readonly PermissionType[];
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface PermissionGrantedEvent {
  readonly eventType: 'marketplace.permission.granted';
  readonly classification: EventClassification;
  readonly permissionSetId: PermissionSetId;
  readonly capabilityId: CapabilityId;
  readonly permissions: readonly PermissionType[];
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface PermissionDeniedEvent {
  readonly eventType: 'marketplace.permission.denied';
  readonly classification: EventClassification;
  readonly permissionSetId: PermissionSetId;
  readonly capabilityId: CapabilityId;
  readonly permissions: readonly PermissionType[];
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// RATING EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface RatingSubmittedEvent {
  readonly eventType: 'marketplace.rating.submitted';
  readonly classification: EventClassification;
  readonly ratingId: RatingId;
  readonly capabilityId: CapabilityId;
  readonly averageScore: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// RECOMMENDATION EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface RecommendationGeneratedEvent {
  readonly eventType: 'marketplace.recommendation.generated';
  readonly classification: EventClassification;
  readonly recommendationId: RecommendationId;
  readonly capabilityId: CapabilityId;
  readonly score: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// COMPOSITION EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface CompositionCreatedEvent {
  readonly eventType: 'marketplace.composition.created';
  readonly classification: EventClassification;
  readonly compositionId: CompositionId;
  readonly name: string;
  readonly type: CompositionType;
  readonly capabilityCount: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface CompositionActivatedEvent {
  readonly eventType: 'marketplace.composition.activated';
  readonly classification: EventClassification;
  readonly compositionId: CompositionId;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface CompositionDeactivatedEvent {
  readonly eventType: 'marketplace.composition.deactivated';
  readonly classification: EventClassification;
  readonly compositionId: CompositionId;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// PUBLISHER EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface PublisherRegisteredEvent {
  readonly eventType: 'marketplace.publisher.registered';
  readonly classification: EventClassification;
  readonly publisherId: PublisherId;
  readonly name: string;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface PublisherStatusChangedEvent {
  readonly eventType: 'marketplace.publisher.statusChanged';
  readonly classification: EventClassification;
  readonly publisherId: PublisherId;
  readonly fromStatus: PublisherStatus;
  readonly toStatus: PublisherStatus;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// ECOSYSTEM RUNTIME LIFECYCLE EVENTS
// ═══════════════════════════════════════════════════════════════════

export interface EcosystemInitializedEvent {
  readonly eventType: 'marketplace.ecosystem.initialized';
  readonly classification: EventClassification;
  readonly subsystemCount: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface EcosystemStateChangedEvent {
  readonly eventType: 'marketplace.ecosystem.stateChanged';
  readonly classification: EventClassification;
  readonly fromState: EcosystemState;
  readonly toState: EcosystemState;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface EcosystemScanCompletedEvent {
  readonly eventType: 'marketplace.ecosystem.scanCompleted';
  readonly classification: EventClassification;
  readonly capabilitiesScanned: number;
  readonly updatesAvailable: number;
  readonly durationMs: number;
  readonly timestamp: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// EVENT UNION
// ═══════════════════════════════════════════════════════════════════

export type MarketplaceEvent =
  | CapabilityRegisteredEvent
  | CapabilityStatusChangedEvent
  | CapabilityRemovedEvent
  | PackageCreatedEvent
  | PackageStatusChangedEvent
  | CatalogEntryAddedEvent
  | CatalogEntryRemovedEvent
  | InstallationStartedEvent
  | InstallationCompletedEvent
  | InstallationFailedEvent
  | InstallationRemovedEvent
  | UpdateStartedEvent
  | UpdateCompletedEvent
  | UpdateFailedEvent
  | UpdateRolledBackEvent
  | DependencyResolvedEvent
  | DependencyResolutionFailedEvent
  | CompatibilityCheckedEvent
  | PackageSignedEvent
  | SignatureVerifiedEvent
  | SandboxCreatedEvent
  | SandboxStateChangedEvent
  | SandboxTerminatedEvent
  | PermissionRequestedEvent
  | PermissionGrantedEvent
  | PermissionDeniedEvent
  | RatingSubmittedEvent
  | RecommendationGeneratedEvent
  | CompositionCreatedEvent
  | CompositionActivatedEvent
  | CompositionDeactivatedEvent
  | PublisherRegisteredEvent
  | PublisherStatusChangedEvent
  | EcosystemInitializedEvent
  | EcosystemStateChangedEvent
  | EcosystemScanCompletedEvent;
