/**
 * Capability Marketplace & Ecosystem Foundation — Types, Enums, Interfaces
 * TASK-AIS-009A.000
 *
 * Core type definitions:
 *   - Branded identifiers (PackageId, CapabilityId, InstallationId, etc.)
 *   - Enums (PackageStatus, InstallStatus, CompatibilityDimension, etc.)
 *   - Domain entities (CapabilityPackage, Installation, Dependency, etc.)
 *   - Configuration (EcosystemRuntimeConfig, subsystem configs)
 *
 * Architecture: SOLID, DDD, Event-Driven
 * Conforms to: ARC-001.001, PHI-001.000-PHI-007.000, GOV-008.000
 */

import type { Timestamp, Identifier, SemVer } from '../types/common.js';

export type { Timestamp, SemVer };

// ═══════════════════════════════════════════════════════════════════
// BRANDED IDENTIFIERS
// ═══════════════════════════════════════════════════════════════════

export type CapabilityId = Identifier & { readonly __brand: 'MarketplaceCapabilityId' };
export type PackageId = Identifier & { readonly __brand: 'MarketplacePackageId' };
export type InstallationId = Identifier & { readonly __brand: 'MarketplaceInstallationId' };
export type PublisherId = Identifier & { readonly __brand: 'MarketplacePublisherId' };
export type SignatureId = Identifier & { readonly __brand: 'MarketplaceSignatureId' };
export type PermissionSetId = Identifier & { readonly __brand: 'MarketplacePermissionSetId' };
export type RatingId = Identifier & { readonly __brand: 'MarketplaceRatingId' };
export type RecommendationId = Identifier & { readonly __brand: 'MarketplaceRecommendationId' };
export type CompositionId = Identifier & { readonly __brand: 'MarketplaceCompositionId' };
export type SandboxId = Identifier & { readonly __brand: 'MarketplaceSandboxId' };
export type CompatibilityReportId = Identifier & { readonly __brand: 'MarketplaceCompatibilityReportId' };
export type DependencyNodeId = Identifier & { readonly __brand: 'MarketplaceDependencyNodeId' };
export type EcosystemSessionId = Identifier & { readonly __brand: 'MarketplaceEcosystemSessionId' };

function brandCapabilityId(id: string): CapabilityId { return id as CapabilityId; }
function brandPackageId(id: string): PackageId { return id as PackageId; }
function brandInstallationId(id: string): InstallationId { return id as InstallationId; }
function brandPublisherId(id: string): PublisherId { return id as PublisherId; }
function brandSignatureId(id: string): SignatureId { return id as SignatureId; }
function brandPermissionSetId(id: string): PermissionSetId { return id as PermissionSetId; }
function brandRatingId(id: string): RatingId { return id as RatingId; }
function brandRecommendationId(id: string): RecommendationId { return id as RecommendationId; }
function brandCompositionId(id: string): CompositionId { return id as CompositionId; }
function brandSandboxId(id: string): SandboxId { return id as SandboxId; }
function brandCompatibilityReportId(id: string): CompatibilityReportId { return id as CompatibilityReportId; }
function brandDependencyNodeId(id: string): DependencyNodeId { return id as DependencyNodeId; }
function brandEcosystemSessionId(id: string): EcosystemSessionId { return id as EcosystemSessionId; }

export {
  brandCapabilityId, brandPackageId, brandInstallationId, brandPublisherId,
  brandSignatureId, brandPermissionSetId, brandRatingId, brandRecommendationId,
  brandCompositionId, brandSandboxId, brandCompatibilityReportId,
  brandDependencyNodeId, brandEcosystemSessionId,
};

// ═══════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════

/** Package lifecycle status */
export enum PackageStatus {
  Draft = 'Draft',
  PendingReview = 'PendingReview',
  Published = 'Published',
  Unlisted = 'Unlisted',
  Deprecated = 'Deprecated',
  Suspended = 'Suspended',
  Removed = 'Removed',
}

/** Installation lifecycle status */
export enum InstallationStatus {
  Pending = 'Pending',
  Installing = 'Installing',
  Installed = 'Installed',
  Updating = 'Updating',
  Uninstalling = 'Uninstalling',
  Uninstalled = 'Uninstalled',
  Failed = 'Failed',
  RollbackPending = 'RollbackPending',
  RolledBack = 'RolledBack',
}

/** Permission type a capability may request */
export enum PermissionType {
  Memory = 'Memory',
  Workflow = 'Workflow',
  FileSystem = 'FileSystem',
  Network = 'Network',
  AIProvider = 'AIProvider',
  Desktop = 'Desktop',
  SystemMetrics = 'SystemMetrics',
  UserSettings = 'UserSettings',
}

/** Permission grant decision */
export enum PermissionDecision {
  Granted = 'Granted',
  Denied = 'Denied',
  PendingUserReview = 'PendingUserReview',
  Revoked = 'Revoked',
}

/** Compatibility check dimension */
export enum CompatibilityDimension {
  Runtime = 'Runtime',
  Platform = 'Platform',
  AIProvider = 'AIProvider',
  OS = 'OS',
  Version = 'Version',
  Dependency = 'Dependency',
}

/** Compatibility verdict */
export enum CompatibilityVerdict {
  Compatible = 'Compatible',
  CompatibleWithWarnings = 'CompatibleWithWarnings',
  Incompatible = 'Incompatible',
  Unknown = 'Unknown',
}

/** Signature algorithm */
export enum SignatureAlgorithm {
  Ed25519 = 'Ed25519',
  RSA256 = 'RSA256',
  HMAC256 = 'HMAC256',
}

/** Signature verification status */
export enum SignatureStatus {
  Valid = 'Valid',
  Invalid = 'Invalid',
  Expired = 'Expired',
  Revoked = 'Revoked',
  Unknown = 'Unknown',
}

/** Sandbox isolation level */
export enum SandboxLevel {
  Full = 'Full',
  Restricted = 'Restricted',
  Minimal = 'Minimal',
  None = 'None',
}

/** Sandbox execution state */
export enum SandboxState {
  Created = 'Created',
  Running = 'Running',
  Paused = 'Paused',
  Stopped = 'Stopped',
  Terminated = 'Terminated',
  Error = 'Error',
}

/** Rating dimension */
export enum RatingDimension {
  Quality = 'Quality',
  Reliability = 'Reliability',
  Usability = 'Usability',
  Performance = 'Performance',
  Security = 'Security',
  Documentation = 'Documentation',
}

/** Composition type for combining capabilities */
export enum CompositionType {
  Pipeline = 'Pipeline',
  Parallel = 'Parallel',
  Conditional = 'Conditional',
  Fallback = 'Fallback',
  Chain = 'Chain',
}

/** Publisher verification status */
export enum PublisherStatus {
  Unverified = 'Unverified',
  Verified = 'Verified',
  Trusted = 'Trusted',
  Suspended = 'Suspended',
  Banned = 'Banned',
}

/** Ecosystem Runtime lifecycle state */
export enum EcosystemState {
  Uninitialized = 'Uninitialized',
  Initializing = 'Initializing',
  Ready = 'Ready',
  Scanning = 'Scanning',
  Installing = 'Installing',
  Updating = 'Updating',
  Stopping = 'Stopping',
  Stopped = 'Stopped',
  Error = 'Error',
}

/** Dependency resolution strategy */
export enum ResolutionStrategy {
  HighestVersion = 'HighestVersion',
  LowestVersion = 'LowestVersion',
  MostCompatible = 'MostCompatible',
}

/** Marketplace catalog entry source */
export enum CatalogSource {
  Local = 'Local',
  Registry = 'Registry',
  Community = 'Community',
  Enterprise = 'Enterprise',
}

/** Update channel */
export enum UpdateChannel {
  Stable = 'Stable',
  Beta = 'Beta',
  Nightly = 'Nightly',
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN ENTITIES
// ═══════════════════════════════════════════════════════════════════

/** A capability registered in the ecosystem */
export interface CapabilityEntry {
  readonly id: CapabilityId;
  readonly name: string;
  readonly description: string;
  readonly version: SemVer;
  readonly publisherId: PublisherId;
  readonly category: string;
  readonly tags: readonly string[];
  readonly permissions: readonly PermissionType[];
  readonly dependencies: readonly PackageDependency[];
  readonly compatibilityRequirements: readonly CompatibilityRequirement[];
  readonly signatureId: SignatureId | null;
  readonly status: PackageStatus;
  readonly installed: boolean;
  readonly installCount: number;
  readonly rating: number;
  readonly ratingCount: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** A capability package (bundle with manifest) */
export interface CapabilityPackage {
  readonly id: PackageId;
  readonly capabilityId: CapabilityId;
  readonly name: string;
  readonly version: SemVer;
  readonly manifest: PackageManifest;
  readonly checksum: string;
  readonly sizeBytes: number;
  readonly signatureId: SignatureId | null;
  readonly status: PackageStatus;
  readonly publisherId: PublisherId;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Package manifest — metadata about the package */
export interface PackageManifest {
  readonly name: string;
  readonly version: SemVer;
  readonly description: string;
  readonly author: string;
  readonly license: string;
  readonly main: string;
  readonly capabilities: readonly string[];
  readonly permissions: readonly PermissionType[];
  readonly dependencies: readonly PackageDependency[];
  readonly compatibility: readonly CompatibilityRequirement[];
  readonly entryPoint: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** A dependency declaration */
export interface PackageDependency {
  readonly name: string;
  readonly versionRange: string;
  readonly optional: boolean;
  readonly reason: string;
}

/** Compatibility requirement */
export interface CompatibilityRequirement {
  readonly dimension: CompatibilityDimension;
  readonly required: string;
  readonly optional: boolean;
}

/** A catalog entry in the marketplace */
export interface CatalogEntry {
  readonly capabilityId: CapabilityId;
  readonly name: string;
  readonly description: string;
  readonly version: SemVer;
  readonly publisherId: PublisherId;
  readonly source: CatalogSource;
  readonly category: string;
  readonly tags: readonly string[];
  readonly rating: number;
  readonly downloadCount: number;
  readonly compatible: boolean;
  readonly featured: boolean;
  readonly publishedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** An installation record */
export interface Installation {
  readonly id: InstallationId;
  readonly capabilityId: CapabilityId;
  readonly packageId: PackageId;
  readonly version: SemVer;
  readonly status: InstallationStatus;
  readonly installedAt: Timestamp | null;
  readonly uninstalledAt: Timestamp | null;
  readonly error: string | null;
  readonly permissionsGranted: readonly PermissionType[];
  readonly sandboxId: SandboxId | null;
  readonly previousVersion: SemVer | null;
  readonly rollbackVersion: SemVer | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** An update record */
export interface UpdateRecord {
  readonly installationId: InstallationId;
  readonly capabilityId: CapabilityId;
  readonly fromVersion: SemVer;
  readonly toVersion: SemVer;
  readonly status: InstallationStatus;
  readonly initiatedAt: Timestamp;
  readonly completedAt: Timestamp | null;
  readonly error: string | null;
  readonly rolledBack: boolean;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** A resolved dependency graph node */
export interface DependencyNode {
  readonly id: DependencyNodeId;
  readonly packageName: string;
  readonly resolvedVersion: SemVer;
  readonly dependencies: readonly DependencyNodeId[];
  readonly depth: number;
  readonly optional: boolean;
}

/** A compatibility check report */
export interface CompatibilityReport {
  readonly id: CompatibilityReportId;
  readonly capabilityId: CapabilityId;
  readonly version: SemVer;
  readonly verdict: CompatibilityVerdict;
  readonly checks: readonly CompatibilityCheck[];
  readonly checkedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** A single compatibility check */
export interface CompatibilityCheck {
  readonly dimension: CompatibilityDimension;
  readonly required: string;
  readonly actual: string;
  readonly passed: boolean;
  readonly warning: string | null;
}

/** A package signature */
export interface PackageSignature {
  readonly id: SignatureId;
  readonly packageId: PackageId;
  readonly algorithm: SignatureAlgorithm;
  readonly publicKey: string;
  readonly signature: string;
  readonly signedAt: Timestamp;
  readonly expiresAt: Timestamp;
  readonly status: SignatureStatus;
  readonly verifiedAt: Timestamp | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** A sandbox instance */
export interface SandboxInstance {
  readonly id: SandboxId;
  readonly installationId: InstallationId;
  readonly capabilityId: CapabilityId;
  readonly level: SandboxLevel;
  readonly state: SandboxState;
  readonly allowedPermissions: readonly PermissionType[];
  readonly resourceLimits: ResourceLimits;
  readonly createdAt: Timestamp;
  readonly terminatedAt: Timestamp | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Resource limits for sandbox */
export interface ResourceLimits {
  readonly maxMemoryMB: number;
  readonly maxCpuPercent: number;
  readonly maxDiskMB: number;
  readonly maxNetworkConnections: number;
  readonly maxExecutionTimeMs: number;
}

/** A permission request */
export interface PermissionRequest {
  readonly id: PermissionSetId;
  readonly capabilityId: CapabilityId;
  readonly requestedPermissions: readonly PermissionType[];
  readonly grantedPermissions: readonly PermissionType[];
  readonly deniedPermissions: readonly PermissionType[];
  readonly pendingPermissions: readonly PermissionType[];
  readonly decidedAt: Timestamp | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** A rating entry */
export interface RatingEntry {
  readonly id: RatingId;
  readonly capabilityId: CapabilityId;
  readonly userId: string;
  readonly scores: Readonly<Record<RatingDimension, number>>;
  readonly comment: string;
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** A recommendation */
export interface Recommendation {
  readonly id: RecommendationId;
  readonly capabilityId: CapabilityId;
  readonly reason: string;
  readonly score: number;
  readonly basedOn: readonly string[];
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** A composition of capabilities */
export interface Composition {
  readonly id: CompositionId;
  readonly name: string;
  readonly description: string;
  readonly type: CompositionType;
  readonly steps: readonly CompositionStep[];
  readonly capabilities: readonly CapabilityId[];
  readonly active: boolean;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** A step in a composition */
export interface CompositionStep {
  readonly order: number;
  readonly capabilityId: CapabilityId;
  readonly config: Readonly<Record<string, unknown>>;
  readonly fallbackCapabilityId: CapabilityId | null;
  readonly condition: string | null;
}

/** A publisher */
export interface Publisher {
  readonly id: PublisherId;
  readonly name: string;
  readonly description: string;
  readonly status: PublisherStatus;
  readonly publicKey: string;
  readonly capabilities: readonly CapabilityId[];
  readonly totalDownloads: number;
  readonly averageRating: number;
  readonly createdAt: Timestamp;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Ecosystem metrics snapshot */
export interface EcosystemMetrics {
  readonly totalCapabilities: number;
  readonly installedCapabilities: number;
  readonly activeInstallations: number;
  readonly totalPublishers: number;
  readonly verifiedPublishers: number;
  readonly totalRatings: number;
  readonly averageRating: number;
  readonly totalCompositions: number;
  readonly activeCompositions: number;
  readonly totalDownloads: number;
  readonly pendingUpdates: number;
  readonly failedInstallations: number;
  readonly sandboxInstances: number;
  readonly totalPackages: number;
  readonly lastScanAt: Timestamp | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

export interface CapabilityRegistryConfig {
  readonly maxCapabilities: number;
  readonly maxTagsPerCapability: number;
}

export interface PackageRuntimeConfig {
  readonly maxPackages: number;
  readonly maxPackageSizeBytes: number;
  readonly supportedAlgorithms: readonly SignatureAlgorithm[];
}

export interface MarketplaceConfig {
  readonly maxCatalogEntries: number;
  readonly defaultSource: CatalogSource;
  readonly refreshIntervalMs: number;
}

export interface InstallationEngineConfig {
  readonly maxConcurrentInstallations: number;
  readonly installationTimeoutMs: number;
  readonly autoRollbackOnFailure: boolean;
}

export interface UpdateEngineConfig {
  readonly maxConcurrentUpdates: number;
  readonly updateTimeoutMs: number;
  readonly autoUpdateEnabled: boolean;
  readonly defaultChannel: UpdateChannel;
  readonly maxRollbackVersions: number;
}

export interface DependencyResolverConfig {
  readonly maxDepth: number;
  readonly strategy: ResolutionStrategy;
  readonly timeoutMs: number;
}

export interface CompatibilityEngineConfig {
  readonly runtimeVersion: string;
  readonly platformVersion: string;
  readonly osType: string;
  readonly aiProviderVersion: string;
  readonly timeoutMs: number;
}

export interface SignatureEngineConfig {
  readonly defaultAlgorithm: SignatureAlgorithm;
  readonly maxSignatures: number;
  readonly expiryDays: number;
}

export interface SandboxRuntimeConfig {
  readonly defaultLevel: SandboxLevel;
  readonly defaultResourceLimits: ResourceLimits;
  readonly maxInstances: number;
  readonly terminationTimeoutMs: number;
}

export interface PermissionRuntimeConfig {
  readonly autoGrantSafePermissions: boolean;
  readonly requireExplicitGrant: readonly PermissionType[];
  readonly maxPendingRequests: number;
}

export interface RatingRuntimeConfig {
  readonly maxRatingsPerUser: number;
  readonly minScore: number;
  readonly maxScore: number;
  readonly dimensions: readonly RatingDimension[];
}

export interface RecommendationRuntimeConfig {
  readonly maxRecommendations: number;
  readonly minScore: number;
  readonly contextWeight: number;
  readonly experienceWeight: number;
  readonly goalWeight: number;
}

export interface CompositionEngineConfig {
  readonly maxCompositions: number;
  readonly maxStepsPerComposition: number;
  readonly maxCapabilitiesPerComposition: number;
  readonly validationTimeoutMs: number;
}

export interface PublisherRuntimeConfig {
  readonly maxPublishers: number;
  readonly maxCapabilitiesPerPublisher: number;
  readonly verificationRequired: boolean;
}

export interface EcosystemRuntimeConfig {
  readonly capabilityRegistry: CapabilityRegistryConfig;
  readonly packageRuntime: PackageRuntimeConfig;
  readonly marketplace: MarketplaceConfig;
  readonly installationEngine: InstallationEngineConfig;
  readonly updateEngine: UpdateEngineConfig;
  readonly dependencyResolver: DependencyResolverConfig;
  readonly compatibilityEngine: CompatibilityEngineConfig;
  readonly signatureEngine: SignatureEngineConfig;
  readonly sandboxRuntime: SandboxRuntimeConfig;
  readonly permissionRuntime: PermissionRuntimeConfig;
  readonly ratingRuntime: RatingRuntimeConfig;
  readonly recommendationRuntime: RecommendationRuntimeConfig;
  readonly compositionEngine: CompositionEngineConfig;
  readonly publisherRuntime: PublisherRuntimeConfig;
  readonly eventBusEnabled: boolean;
}

export const DefaultEcosystemRuntimeConfig: EcosystemRuntimeConfig = Object.freeze({
  capabilityRegistry: Object.freeze({
    maxCapabilities: 10000,
    maxTagsPerCapability: 20,
  }),
  packageRuntime: Object.freeze({
    maxPackages: 50000,
    maxPackageSizeBytes: 100 * 1024 * 1024,
    supportedAlgorithms: Object.freeze([SignatureAlgorithm.Ed25519, SignatureAlgorithm.RSA256, SignatureAlgorithm.HMAC256]),
  }),
  marketplace: Object.freeze({
    maxCatalogEntries: 10000,
    defaultSource: CatalogSource.Local,
    refreshIntervalMs: 300_000,
  }),
  installationEngine: Object.freeze({
    maxConcurrentInstallations: 5,
    installationTimeoutMs: 120_000,
    autoRollbackOnFailure: true,
  }),
  updateEngine: Object.freeze({
    maxConcurrentUpdates: 3,
    updateTimeoutMs: 180_000,
    autoUpdateEnabled: false,
    defaultChannel: UpdateChannel.Stable,
    maxRollbackVersions: 3,
  }),
  dependencyResolver: Object.freeze({
    maxDepth: 10,
    strategy: ResolutionStrategy.HighestVersion,
    timeoutMs: 30_000,
  }),
  compatibilityEngine: Object.freeze({
    runtimeVersion: '0.9.0',
    platformVersion: '1.0.0',
    osType: 'linux',
    aiProviderVersion: '*',
    timeoutMs: 10_000,
  }),
  signatureEngine: Object.freeze({
    defaultAlgorithm: SignatureAlgorithm.Ed25519,
    maxSignatures: 100_000,
    expiryDays: 365,
  }),
  sandboxRuntime: Object.freeze({
    defaultLevel: SandboxLevel.Restricted,
    defaultResourceLimits: Object.freeze({
      maxMemoryMB: 512,
      maxCpuPercent: 50,
      maxDiskMB: 1024,
      maxNetworkConnections: 10,
      maxExecutionTimeMs: 60_000,
    }),
    maxInstances: 100,
    terminationTimeoutMs: 30_000,
  }),
  permissionRuntime: Object.freeze({
    autoGrantSafePermissions: false,
    requireExplicitGrant: Object.freeze([
      PermissionType.Network,
      PermissionType.FileSystem,
      PermissionType.Desktop,
    ]),
    maxPendingRequests: 1000,
  }),
  ratingRuntime: Object.freeze({
    maxRatingsPerUser: 1,
    minScore: 1,
    maxScore: 5,
    dimensions: Object.freeze([
      RatingDimension.Quality,
      RatingDimension.Reliability,
      RatingDimension.Usability,
      RatingDimension.Performance,
      RatingDimension.Security,
      RatingDimension.Documentation,
    ]),
  }),
  recommendationRuntime: Object.freeze({
    maxRecommendations: 50,
    minScore: 0.3,
    contextWeight: 0.4,
    experienceWeight: 0.3,
    goalWeight: 0.3,
  }),
  compositionEngine: Object.freeze({
    maxCompositions: 500,
    maxStepsPerComposition: 20,
    maxCapabilitiesPerComposition: 10,
    validationTimeoutMs: 15_000,
  }),
  publisherRuntime: Object.freeze({
    maxPublishers: 1000,
    maxCapabilitiesPerPublisher: 1000,
    verificationRequired: false,
  }),
  eventBusEnabled: true,
} as EcosystemRuntimeConfig);
