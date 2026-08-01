/**
 * Capability Marketplace & Ecosystem Foundation — Public Contracts
 * TASK-AIS-009A.000
 *
 * Public-facing interfaces for every subsystem.
 * These are the ONLY APIs other Runtimes may depend on.
 */

import type {
  CapabilityId, PackageId, InstallationId, PublisherId,
  SignatureId, PermissionSetId, RatingId, RecommendationId,
  CompositionId, SandboxId, CompatibilityReportId,
  CapabilityEntry, CapabilityPackage, PackageManifest,
  CatalogEntry, Installation, UpdateRecord,
  DependencyNode, CompatibilityReport,
  PackageSignature, SandboxInstance,
  PermissionRequest, RatingEntry, Recommendation,
  Composition, Publisher, EcosystemMetrics,
  PackageStatus, InstallationStatus, PermissionType,
  CompatibilityVerdict, SignatureAlgorithm, SignatureStatus,
  SandboxLevel,
  SandboxState, RatingDimension, CompositionType,
  PublisherStatus, CatalogSource, CompatibilityDimension,
  EcosystemState, SemVer,
  PackageDependency, CompatibilityRequirement,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════
// CAPABILITY REGISTRY CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface ICapabilityRegistry {
  register(params: CapabilityRegistrationParams): Promise<CapabilityEntry>;
  updateStatus(id: CapabilityId, status: PackageStatus): Promise<void>;
  getById(id: CapabilityId): Promise<CapabilityEntry | null>;
  getByName(name: string): Promise<CapabilityEntry | null>;
  list(filter?: Partial<{ status: PackageStatus; category: string; publisherId: PublisherId; installed: boolean }>): Promise<readonly CapabilityEntry[]>;
  remove(id: CapabilityId): Promise<void>;
  count(): Promise<number>;
}

export interface CapabilityRegistrationParams {
  readonly name: string;
  readonly description: string;
  readonly version: SemVer;
  readonly publisherId: PublisherId;
  readonly category: string;
  readonly tags: readonly string[];
  readonly permissions: readonly PermissionType[];
  readonly dependencies: readonly PackageDependency[];
  readonly compatibilityRequirements: readonly CompatibilityRequirement[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// PACKAGE RUNTIME CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IPackageRuntime {
  createPackage(params: PackageCreationParams): Promise<CapabilityPackage>;
  getById(id: PackageId): Promise<CapabilityPackage | null>;
  getByCapabilityId(capabilityId: CapabilityId): Promise<CapabilityPackage | null>;
  list(filter?: Partial<{ status: PackageStatus; publisherId: PublisherId }>): Promise<readonly CapabilityPackage[]>;
  validateManifest(manifest: PackageManifest): Promise<boolean>;
  count(): Promise<number>;
}

export interface PackageCreationParams {
  readonly capabilityId: CapabilityId;
  readonly name: string;
  readonly version: SemVer;
  readonly manifest: PackageManifest;
  readonly checksum: string;
  readonly sizeBytes: number;
  readonly publisherId: PublisherId;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// MARKETPLACE RUNTIME CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IMarketplaceRuntime {
  addToCatalog(params: CatalogAddParams): Promise<CatalogEntry>;
  removeFromCatalog(capabilityId: CapabilityId): Promise<void>;
  search(query: string, filter?: Partial<{ category: string; source: CatalogSource; compatible: boolean }>): Promise<readonly CatalogEntry[]>;
  getFeatured(): Promise<readonly CatalogEntry[]>;
  getById(capabilityId: CapabilityId): Promise<CatalogEntry | null>;
  list(filter?: Partial<{ source: CatalogSource; category: string }>): Promise<readonly CatalogEntry[]>;
  count(): Promise<number>;
}

export interface CatalogAddParams {
  readonly capabilityId: CapabilityId;
  readonly source: CatalogSource;
  readonly featured: boolean;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// INSTALLATION ENGINE CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IInstallationEngine {
  install(params: InstallationParams): Promise<Installation>;
  uninstall(installationId: InstallationId): Promise<void>;
  getById(id: InstallationId): Promise<Installation | null>;
  getByCapabilityId(capabilityId: CapabilityId): Promise<Installation | null>;
  list(filter?: Partial<{ status: InstallationStatus; capabilityId: CapabilityId }>): Promise<readonly Installation[]>;
  count(): Promise<number>;
}

export interface InstallationParams {
  readonly capabilityId: CapabilityId;
  readonly packageId: PackageId;
  readonly version: SemVer;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// UPDATE ENGINE CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IUpdateEngine {
  checkForUpdates(installationId: InstallationId): Promise<UpdateRecord | null>;
  update(installationId: InstallationId, toVersion: SemVer): Promise<UpdateRecord>;
  rollback(installationId: InstallationId): Promise<UpdateRecord>;
  listUpdates(filter?: Partial<{ status: InstallationStatus; capabilityId: CapabilityId }>): Promise<readonly UpdateRecord[]>;
  getUpdateHistory(installationId: InstallationId): Promise<readonly UpdateRecord[]>;
}

// ═══════════════════════════════════════════════════════════════════
// DEPENDENCY RESOLVER CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IDependencyResolver {
  resolve(capabilityId: CapabilityId): Promise<DependencyNode[]>;
  getResolution(capabilityId: CapabilityId): Promise<DependencyNode[] | null>;
  hasCircularDependency(capabilityId: CapabilityId): Promise<boolean>;
  getDependencies(capabilityId: CapabilityId): Promise<readonly PackageDependency[]>;
}

// ═══════════════════════════════════════════════════════════════════
// COMPATIBILITY ENGINE CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface ICompatibilityEngine {
  check(capabilityId: CapabilityId): Promise<CompatibilityReport>;
  getReport(id: CompatibilityReportId): Promise<CompatibilityReport | null>;
  getVerdict(capabilityId: CapabilityId): Promise<CompatibilityVerdict>;
  checkDimension(capabilityId: CapabilityId, dimension: CompatibilityDimension): Promise<boolean>;
  listReports(filter?: Partial<{ verdict: CompatibilityVerdict }>): Promise<readonly CompatibilityReport[]>;
}

// ═══════════════════════════════════════════════════════════════════
// SIGNATURE ENGINE CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface ISignatureEngine {
  sign(packageId: PackageId, algorithm?: SignatureAlgorithm): Promise<PackageSignature>;
  verify(signatureId: SignatureId): Promise<SignatureStatus>;
  getById(id: SignatureId): Promise<PackageSignature | null>;
  getByPackageId(packageId: PackageId): Promise<PackageSignature | null>;
  revoke(signatureId: SignatureId): Promise<void>;
  count(): Promise<number>;
}

// ═══════════════════════════════════════════════════════════════════
// SANDBOX RUNTIME CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface ISandboxRuntime {
  create(installationId: InstallationId, capabilityId: CapabilityId, level?: SandboxLevel): Promise<SandboxInstance>;
  start(sandboxId: SandboxId): Promise<void>;
  pause(sandboxId: SandboxId): Promise<void>;
  stop(sandboxId: SandboxId): Promise<void>;
  terminate(sandboxId: SandboxId, reason?: string): Promise<void>;
  getById(id: SandboxId): Promise<SandboxInstance | null>;
  getByInstallationId(installationId: InstallationId): Promise<SandboxInstance | null>;
  list(filter?: Partial<{ state: SandboxState }>): Promise<readonly SandboxInstance[]>;
  count(): Promise<number>;
}

// ═══════════════════════════════════════════════════════════════════
// PERMISSION RUNTIME CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IPermissionRuntime {
  requestPermissions(capabilityId: CapabilityId, permissions: readonly PermissionType[]): Promise<PermissionRequest>;
  grant(permissionSetId: PermissionSetId, permissions: readonly PermissionType[]): Promise<void>;
  deny(permissionSetId: PermissionSetId, permissions: readonly PermissionType[]): Promise<void>;
  revoke(permissionSetId: PermissionSetId): Promise<void>;
  getById(id: PermissionSetId): Promise<PermissionRequest | null>;
  getByCapabilityId(capabilityId: CapabilityId): Promise<PermissionRequest | null>;
  listPending(): Promise<readonly PermissionRequest[]>;
  checkPermission(capabilityId: CapabilityId, permission: PermissionType): Promise<boolean>;
}

// ═══════════════════════════════════════════════════════════════════
// RATING RUNTIME CONTRACT
// ═════════════════════════════════════════════════════════════════

export interface IRatingRuntime {
  submit(params: RatingSubmissionParams): Promise<RatingEntry>;
  getByCapabilityId(capabilityId: CapabilityId): Promise<readonly RatingEntry[]>;
  getAverage(capabilityId: CapabilityId): Promise<number>;
  getById(id: RatingId): Promise<RatingEntry | null>;
  list(): Promise<readonly RatingEntry[]>;
  count(): Promise<number>;
}

export interface RatingSubmissionParams {
  readonly capabilityId: CapabilityId;
  readonly userId: string;
  readonly scores: Readonly<Record<RatingDimension, number>>;
  readonly comment: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// RECOMMENDATION RUNTIME CONTRACT
// ═════════════════════════════════════════════════════════════════

export interface IRecommendationRuntime {
  recommend(params: RecommendationContext): Promise<readonly Recommendation[]>;
  getById(id: RecommendationId): Promise<Recommendation | null>;
  list(): Promise<readonly Recommendation[]>;
  count(): Promise<number>;
}

export interface RecommendationContext {
  readonly goals: readonly string[];
  readonly installedCapabilities: readonly CapabilityId[];
  readonly workflowContext: string | null;
  readonly experienceLevel: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// COMPOSITION ENGINE CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface ICompositionEngine {
  create(params: CompositionCreationParams): Promise<Composition>;
  activate(compositionId: CompositionId): Promise<void>;
  deactivate(compositionId: CompositionId): Promise<void>;
  getById(id: CompositionId): Promise<Composition | null>;
  list(filter?: Partial<{ active: boolean; type: CompositionType }>): Promise<readonly Composition[]>;
  count(): Promise<number>;
}

export interface CompositionCreationParams {
  readonly name: string;
  readonly description: string;
  readonly type: CompositionType;
  readonly steps: readonly CompositionStepInput[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface CompositionStepInput {
  readonly order: number;
  readonly capabilityId: CapabilityId;
  readonly config: Readonly<Record<string, unknown>>;
  readonly fallbackCapabilityId: CapabilityId | null;
  readonly condition: string | null;
}

// ═══════════════════════════════════════════════════════════════════
// PUBLISHER RUNTIME CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IPublisherRuntime {
  register(params: PublisherRegistrationParams): Promise<Publisher>;
  updateStatus(publisherId: PublisherId, status: PublisherStatus): Promise<void>;
  getById(id: PublisherId): Promise<Publisher | null>;
  list(filter?: Partial<{ status: PublisherStatus }>): Promise<readonly Publisher[]>;
  count(): Promise<number>;
}

export interface PublisherRegistrationParams {
  readonly name: string;
  readonly description: string;
  readonly publicKey: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// ECOSYSTEM RUNTIME CONTRACT (DASHBOARD API)
// ═══════════════════════════════════════════════════════════════════

export interface IEcosystemRuntime {
  readonly state: EcosystemState;
  scan(): Promise<EcosystemScanResult>;
  getMetrics(): Promise<EcosystemMetrics>;
  getCapabilityRegistry(): ICapabilityRegistry;
  getPackageRuntime(): IPackageRuntime;
  getMarketplaceRuntime(): IMarketplaceRuntime;
  getInstallationEngine(): IInstallationEngine;
  getUpdateEngine(): IUpdateEngine;
  getDependencyResolver(): IDependencyResolver;
  getCompatibilityEngine(): ICompatibilityEngine;
  getSignatureEngine(): ISignatureEngine;
  getSandboxRuntime(): ISandboxRuntime;
  getPermissionRuntime(): IPermissionRuntime;
  getRatingRuntime(): IRatingRuntime;
  getRecommendationRuntime(): IRecommendationRuntime;
  getCompositionEngine(): ICompositionEngine;
  getPublisherRuntime(): IPublisherRuntime;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

export interface EcosystemScanResult {
  readonly capabilitiesScanned: number;
  readonly updatesAvailable: number;
  readonly compatibilityIssues: number;
  readonly pendingPermissions: number;
  readonly durationMs: number;
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC CONTRACTS BUNDLE
// ═══════════════════════════════════════════════════════════════════

export interface MarketplacePublicContracts {
  readonly capabilityRegistry: ICapabilityRegistry;
  readonly packageRuntime: IPackageRuntime;
  readonly marketplaceRuntime: IMarketplaceRuntime;
  readonly installationEngine: IInstallationEngine;
  readonly updateEngine: IUpdateEngine;
  readonly dependencyResolver: IDependencyResolver;
  readonly compatibilityEngine: ICompatibilityEngine;
  readonly signatureEngine: ISignatureEngine;
  readonly sandboxRuntime: ISandboxRuntime;
  readonly permissionRuntime: IPermissionRuntime;
  readonly ratingRuntime: IRatingRuntime;
  readonly recommendationRuntime: IRecommendationRuntime;
  readonly compositionEngine: ICompositionEngine;
  readonly publisherRuntime: IPublisherRuntime;
  readonly ecosystemRuntime: IEcosystemRuntime;
}
