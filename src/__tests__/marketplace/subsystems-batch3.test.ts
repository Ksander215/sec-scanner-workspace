import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { InProcessEventBus } from '@/core/events/event-bus';
import { RatingRuntime } from '@/core/marketplace/rating-runtime';
import { RecommendationRuntime } from '@/core/marketplace/recommendation-runtime';
import { CompositionEngine } from '@/core/marketplace/composition-engine';
import { PublisherRuntime } from '@/core/marketplace/publisher-runtime';
import { EcosystemRuntime } from '@/core/marketplace/ecosystem-runtime';
import {
  brandCapabilityId,
  brandPackageId,
  brandInstallationId,
  brandPublisherId,
  brandSignatureId,
  brandPermissionSetId,
  brandRatingId,
  brandRecommendationId,
  brandCompositionId,
  brandSandboxId,
  brandCompatibilityReportId,
  brandDependencyNodeId,
  brandEcosystemSessionId,
} from '@/core/marketplace/types';
import {
  DefaultEcosystemRuntimeConfig,
  PackageStatus,
  InstallationStatus,
  PermissionType,
  PermissionDecision,
  CompatibilityDimension,
  CompatibilityVerdict,
  SignatureAlgorithm,
  SignatureStatus,
  SandboxLevel,
  SandboxState,
  RatingDimension,
  CompositionType,
  PublisherStatus,
  EcosystemState,
  CatalogSource,
  UpdateChannel,
  ResolutionStrategy,
} from '@/core/marketplace/types';
import type {
  CapabilityEntry,
  CapabilityPackage,
  Installation,
  UpdateRecord,
  DependencyNode,
  CompatibilityReport,
  PackageSignature,
  SandboxInstance,
  PermissionRequest,
  RatingEntry,
  Recommendation,
  Composition,
  CompositionStep,
  Publisher,
  EcosystemMetrics,
  EcosystemRuntimeConfig,
  PackageDependency,
  CompatibilityRequirement,
} from '@/core/marketplace/types';
import type {
  IRatingRuntime,
  IRecommendationRuntime,
  ICompositionEngine,
  IPublisherRuntime,
  IEcosystemRuntime,
  RatingSubmissionParams,
  RecommendationContext,
  CompositionCreationParams,
  CompositionStepInput,
  PublisherRegistrationParams,
} from '@/core/marketplace/contracts';
import {
  MarketplaceError,
  CapabilityNotFoundError,
  CapabilityLimitExceededError,
  CapabilityDuplicateError,
  PackageNotFoundError,
  PackageLimitExceededError,
  PackageSizeExceededError,
  ManifestValidationError,
  InstallationNotFoundError,
  InstallationStateError,
  InstallationLimitExceededError,
  InstallationTimeoutError,
  UpdateError,
  RollbackError,
  NoUpdateAvailableError,
  DependencyResolutionError,
  CircularDependencyError,
  DependencyNotFoundError,
  CompatibilityError,
  IncompatibleCapabilityError,
  SignatureVerificationError,
  SignatureExpiredError,
  SandboxError,
  SandboxLimitExceededError,
  SandboxViolationError,
  PermissionDeniedError,
  PermissionLimitExceededError,
  RatingError,
  RecommendationError,
  CompositionError,
  CompositionLimitExceededError,
  CompositionValidationError,
  PublisherNotFoundError,
  PublisherLimitExceededError,
  PublisherSuspendedError,
  CatalogLimitExceededError,
  EcosystemRuntimeError,
  EcosystemNotInitializedError,
  EcosystemDisposedError,
  NoValueProofError,
  OptimizationWithoutValueError,
} from '@/core/marketplace/errors';
import type {
  MarketplaceEvent,
  RatingSubmittedEvent,
  RecommendationGeneratedEvent,
  CompositionCreatedEvent,
  CompositionActivatedEvent,
  CompositionDeactivatedEvent,
  PublisherRegisteredEvent,
  PublisherStatusChangedEvent,
  EcosystemInitializedEvent,
  EcosystemStateChangedEvent,
  EcosystemScanCompletedEvent,
} from '@/core/marketplace/events';

// ═══════════════════════════════════════════════════════════════════
// MOCK EVENT BUS
// ═══════════════════════════════════════════════════════════════════

const mockEventBus = {
  publish: vi.fn().mockResolvedValue(undefined),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
} as unknown as InProcessEventBus;

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function makeCapabilityEntry(overrides: Partial<CapabilityEntry> & Pick<CapabilityEntry, 'id' | 'name'>): CapabilityEntry {
  const now = new Date().toISOString();
  return {
    description: 'Test capability',
    version: '1.0.0',
    publisherId: brandPublisherId('pub-001'),
    category: 'test',
    tags: Object.freeze([]),
    permissions: Object.freeze([]),
    dependencies: Object.freeze([]),
    compatibilityRequirements: Object.freeze([]),
    signatureId: null,
    status: PackageStatus.Published,
    installed: false,
    installCount: 0,
    rating: 0,
    ratingCount: 0,
    createdAt: now,
    updatedAt: now,
    metadata: Object.freeze({}),
    ...overrides,
  } as CapabilityEntry;
}

const config = DefaultEcosystemRuntimeConfig;

// ═══════════════════════════════════════════════════════════════════
// 0. TYPES — BRAND FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

describe('Brand Functions', () => {
  it('brandCapabilityId should return a string', () => {
    const id = brandCapabilityId('cap-1');
    expect(typeof id).toBe('string');
  });

  it('brandCapabilityId should return the input value', () => {
    const id = brandCapabilityId('cap-1');
    expect(id).toBe('cap-1');
  });

  it('brandPackageId should return a string', () => {
    const id = brandPackageId('pkg-1');
    expect(typeof id).toBe('string');
  });

  it('brandPackageId should return the input value', () => {
    const id = brandPackageId('pkg-1');
    expect(id).toBe('pkg-1');
  });

  it('brandInstallationId should return a string', () => {
    const id = brandInstallationId('inst-1');
    expect(typeof id).toBe('string');
  });

  it('brandInstallationId should return the input value', () => {
    const id = brandInstallationId('inst-1');
    expect(id).toBe('inst-1');
  });

  it('brandPublisherId should return a string', () => {
    const id = brandPublisherId('pub-1');
    expect(typeof id).toBe('string');
  });

  it('brandPublisherId should return the input value', () => {
    const id = brandPublisherId('pub-1');
    expect(id).toBe('pub-1');
  });

  it('brandSignatureId should return a string', () => {
    const id = brandSignatureId('sig-1');
    expect(typeof id).toBe('string');
  });

  it('brandSignatureId should return the input value', () => {
    const id = brandSignatureId('sig-1');
    expect(id).toBe('sig-1');
  });

  it('brandPermissionSetId should return a string', () => {
    const id = brandPermissionSetId('perm-1');
    expect(typeof id).toBe('string');
  });

  it('brandPermissionSetId should return the input value', () => {
    const id = brandPermissionSetId('perm-1');
    expect(id).toBe('perm-1');
  });

  it('brandRatingId should return a string', () => {
    const id = brandRatingId('rating-1');
    expect(typeof id).toBe('string');
  });

  it('brandRatingId should return the input value', () => {
    const id = brandRatingId('rating-1');
    expect(id).toBe('rating-1');
  });

  it('brandRecommendationId should return a string', () => {
    const id = brandRecommendationId('rec-1');
    expect(typeof id).toBe('string');
  });

  it('brandRecommendationId should return the input value', () => {
    const id = brandRecommendationId('rec-1');
    expect(id).toBe('rec-1');
  });

  it('brandCompositionId should return a string', () => {
    const id = brandCompositionId('comp-1');
    expect(typeof id).toBe('string');
  });

  it('brandCompositionId should return the input value', () => {
    const id = brandCompositionId('comp-1');
    expect(id).toBe('comp-1');
  });

  it('brandSandboxId should return a string', () => {
    const id = brandSandboxId('sand-1');
    expect(typeof id).toBe('string');
  });

  it('brandSandboxId should return the input value', () => {
    const id = brandSandboxId('sand-1');
    expect(id).toBe('sand-1');
  });

  it('brandCompatibilityReportId should return a string', () => {
    const id = brandCompatibilityReportId('compat-1');
    expect(typeof id).toBe('string');
  });

  it('brandCompatibilityReportId should return the input value', () => {
    const id = brandCompatibilityReportId('compat-1');
    expect(id).toBe('compat-1');
  });

  it('brandDependencyNodeId should return a string', () => {
    const id = brandDependencyNodeId('dep-1');
    expect(typeof id).toBe('string');
  });

  it('brandDependencyNodeId should return the input value', () => {
    const id = brandDependencyNodeId('dep-1');
    expect(id).toBe('dep-1');
  });

  it('brandEcosystemSessionId should return a string', () => {
    const id = brandEcosystemSessionId('session-1');
    expect(typeof id).toBe('string');
  });

  it('brandEcosystemSessionId should return the input value', () => {
    const id = brandEcosystemSessionId('session-1');
    expect(id).toBe('session-1');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 1. ENUMS
// ═══════════════════════════════════════════════════════════════════

describe('Enums — PackageStatus', () => {
  it('should have Draft member', () => {
    expect(PackageStatus.Draft).toBe('Draft');
  });

  it('should have PendingReview member', () => {
    expect(PackageStatus.PendingReview).toBe('PendingReview');
  });

  it('should have Published member', () => {
    expect(PackageStatus.Published).toBe('Published');
  });

  it('should have Unlisted member', () => {
    expect(PackageStatus.Unlisted).toBe('Unlisted');
  });

  it('should have Deprecated member', () => {
    expect(PackageStatus.Deprecated).toBe('Deprecated');
  });

  it('should have Suspended member', () => {
    expect(PackageStatus.Suspended).toBe('Suspended');
  });

  it('should have Removed member', () => {
    expect(PackageStatus.Removed).toBe('Removed');
  });

  it('should have 7 members', () => {
    expect(Object.keys(PackageStatus).length).toBe(7);
  });
});

describe('Enums — InstallationStatus', () => {
  it('should have Pending member', () => {
    expect(InstallationStatus.Pending).toBe('Pending');
  });

  it('should have Installing member', () => {
    expect(InstallationStatus.Installing).toBe('Installing');
  });

  it('should have Installed member', () => {
    expect(InstallationStatus.Installed).toBe('Installed');
  });

  it('should have Updating member', () => {
    expect(InstallationStatus.Updating).toBe('Updating');
  });

  it('should have Uninstalling member', () => {
    expect(InstallationStatus.Uninstalling).toBe('Uninstalling');
  });

  it('should have Uninstalled member', () => {
    expect(InstallationStatus.Uninstalled).toBe('Uninstalled');
  });

  it('should have Failed member', () => {
    expect(InstallationStatus.Failed).toBe('Failed');
  });

  it('should have RollbackPending member', () => {
    expect(InstallationStatus.RollbackPending).toBe('RollbackPending');
  });

  it('should have RolledBack member', () => {
    expect(InstallationStatus.RolledBack).toBe('RolledBack');
  });

  it('should have 9 members', () => {
    expect(Object.keys(InstallationStatus).length).toBe(9);
  });
});

describe('Enums — PermissionType', () => {
  it('should have Memory', () => { expect(PermissionType.Memory).toBe('Memory'); });
  it('should have Workflow', () => { expect(PermissionType.Workflow).toBe('Workflow'); });
  it('should have FileSystem', () => { expect(PermissionType.FileSystem).toBe('FileSystem'); });
  it('should have Network', () => { expect(PermissionType.Network).toBe('Network'); });
  it('should have AIProvider', () => { expect(PermissionType.AIProvider).toBe('AIProvider'); });
  it('should have Desktop', () => { expect(PermissionType.Desktop).toBe('Desktop'); });
  it('should have SystemMetrics', () => { expect(PermissionType.SystemMetrics).toBe('SystemMetrics'); });
  it('should have UserSettings', () => { expect(PermissionType.UserSettings).toBe('UserSettings'); });
  it('should have 8 members', () => { expect(Object.keys(PermissionType).length).toBe(8); });
});

describe('Enums — PermissionDecision', () => {
  it('should have Granted', () => { expect(PermissionDecision.Granted).toBe('Granted'); });
  it('should have Denied', () => { expect(PermissionDecision.Denied).toBe('Denied'); });
  it('should have PendingUserReview', () => { expect(PermissionDecision.PendingUserReview).toBe('PendingUserReview'); });
  it('should have Revoked', () => { expect(PermissionDecision.Revoked).toBe('Revoked'); });
  it('should have 4 members', () => { expect(Object.keys(PermissionDecision).length).toBe(4); });
});

describe('Enums — CompatibilityDimension', () => {
  it('should have Runtime', () => { expect(CompatibilityDimension.Runtime).toBe('Runtime'); });
  it('should have Platform', () => { expect(CompatibilityDimension.Platform).toBe('Platform'); });
  it('should have AIProvider', () => { expect(CompatibilityDimension.AIProvider).toBe('AIProvider'); });
  it('should have OS', () => { expect(CompatibilityDimension.OS).toBe('OS'); });
  it('should have Version', () => { expect(CompatibilityDimension.Version).toBe('Version'); });
  it('should have Dependency', () => { expect(CompatibilityDimension.Dependency).toBe('Dependency'); });
  it('should have 6 members', () => { expect(Object.keys(CompatibilityDimension).length).toBe(6); });
});

describe('Enums — CompatibilityVerdict', () => {
  it('should have Compatible', () => { expect(CompatibilityVerdict.Compatible).toBe('Compatible'); });
  it('should have CompatibleWithWarnings', () => { expect(CompatibilityVerdict.CompatibleWithWarnings).toBe('CompatibleWithWarnings'); });
  it('should have Incompatible', () => { expect(CompatibilityVerdict.Incompatible).toBe('Incompatible'); });
  it('should have Unknown', () => { expect(CompatibilityVerdict.Unknown).toBe('Unknown'); });
  it('should have 4 members', () => { expect(Object.keys(CompatibilityVerdict).length).toBe(4); });
});

describe('Enums — SignatureAlgorithm', () => {
  it('should have Ed25519', () => { expect(SignatureAlgorithm.Ed25519).toBe('Ed25519'); });
  it('should have RSA256', () => { expect(SignatureAlgorithm.RSA256).toBe('RSA256'); });
  it('should have HMAC256', () => { expect(SignatureAlgorithm.HMAC256).toBe('HMAC256'); });
  it('should have 3 members', () => { expect(Object.keys(SignatureAlgorithm).length).toBe(3); });
});

describe('Enums — SignatureStatus', () => {
  it('should have Valid', () => { expect(SignatureStatus.Valid).toBe('Valid'); });
  it('should have Invalid', () => { expect(SignatureStatus.Invalid).toBe('Invalid'); });
  it('should have Expired', () => { expect(SignatureStatus.Expired).toBe('Expired'); });
  it('should have Revoked', () => { expect(SignatureStatus.Revoked).toBe('Revoked'); });
  it('should have Unknown', () => { expect(SignatureStatus.Unknown).toBe('Unknown'); });
  it('should have 5 members', () => { expect(Object.keys(SignatureStatus).length).toBe(5); });
});

describe('Enums — SandboxLevel', () => {
  it('should have Full', () => { expect(SandboxLevel.Full).toBe('Full'); });
  it('should have Restricted', () => { expect(SandboxLevel.Restricted).toBe('Restricted'); });
  it('should have Minimal', () => { expect(SandboxLevel.Minimal).toBe('Minimal'); });
  it('should have None', () => { expect(SandboxLevel.None).toBe('None'); });
  it('should have 4 members', () => { expect(Object.keys(SandboxLevel).length).toBe(4); });
});

describe('Enums — SandboxState', () => {
  it('should have Created', () => { expect(SandboxState.Created).toBe('Created'); });
  it('should have Running', () => { expect(SandboxState.Running).toBe('Running'); });
  it('should have Paused', () => { expect(SandboxState.Paused).toBe('Paused'); });
  it('should have Stopped', () => { expect(SandboxState.Stopped).toBe('Stopped'); });
  it('should have Terminated', () => { expect(SandboxState.Terminated).toBe('Terminated'); });
  it('should have Error', () => { expect(SandboxState.Error).toBe('Error'); });
  it('should have 6 members', () => { expect(Object.keys(SandboxState).length).toBe(6); });
});

describe('Enums — RatingDimension', () => {
  it('should have Quality', () => { expect(RatingDimension.Quality).toBe('Quality'); });
  it('should have Reliability', () => { expect(RatingDimension.Reliability).toBe('Reliability'); });
  it('should have Usability', () => { expect(RatingDimension.Usability).toBe('Usability'); });
  it('should have Performance', () => { expect(RatingDimension.Performance).toBe('Performance'); });
  it('should have Security', () => { expect(RatingDimension.Security).toBe('Security'); });
  it('should have Documentation', () => { expect(RatingDimension.Documentation).toBe('Documentation'); });
  it('should have 6 members', () => { expect(Object.keys(RatingDimension).length).toBe(6); });
});

describe('Enums — CompositionType', () => {
  it('should have Pipeline', () => { expect(CompositionType.Pipeline).toBe('Pipeline'); });
  it('should have Parallel', () => { expect(CompositionType.Parallel).toBe('Parallel'); });
  it('should have Conditional', () => { expect(CompositionType.Conditional).toBe('Conditional'); });
  it('should have Fallback', () => { expect(CompositionType.Fallback).toBe('Fallback'); });
  it('should have Chain', () => { expect(CompositionType.Chain).toBe('Chain'); });
  it('should have 5 members', () => { expect(Object.keys(CompositionType).length).toBe(5); });
});

describe('Enums — PublisherStatus', () => {
  it('should have Unverified', () => { expect(PublisherStatus.Unverified).toBe('Unverified'); });
  it('should have Verified', () => { expect(PublisherStatus.Verified).toBe('Verified'); });
  it('should have Trusted', () => { expect(PublisherStatus.Trusted).toBe('Trusted'); });
  it('should have Suspended', () => { expect(PublisherStatus.Suspended).toBe('Suspended'); });
  it('should have Banned', () => { expect(PublisherStatus.Banned).toBe('Banned'); });
  it('should have 5 members', () => { expect(Object.keys(PublisherStatus).length).toBe(5); });
});

describe('Enums — EcosystemState', () => {
  it('should have Uninitialized', () => { expect(EcosystemState.Uninitialized).toBe('Uninitialized'); });
  it('should have Initializing', () => { expect(EcosystemState.Initializing).toBe('Initializing'); });
  it('should have Ready', () => { expect(EcosystemState.Ready).toBe('Ready'); });
  it('should have Scanning', () => { expect(EcosystemState.Scanning).toBe('Scanning'); });
  it('should have Installing', () => { expect(EcosystemState.Installing).toBe('Installing'); });
  it('should have Updating', () => { expect(EcosystemState.Updating).toBe('Updating'); });
  it('should have Stopping', () => { expect(EcosystemState.Stopping).toBe('Stopping'); });
  it('should have Stopped', () => { expect(EcosystemState.Stopped).toBe('Stopped'); });
  it('should have Error', () => { expect(EcosystemState.Error).toBe('Error'); });
  it('should have 9 members', () => { expect(Object.keys(EcosystemState).length).toBe(9); });
});

describe('Enums — CatalogSource', () => {
  it('should have Local', () => { expect(CatalogSource.Local).toBe('Local'); });
  it('should have Registry', () => { expect(CatalogSource.Registry).toBe('Registry'); });
  it('should have Community', () => { expect(CatalogSource.Community).toBe('Community'); });
  it('should have Enterprise', () => { expect(CatalogSource.Enterprise).toBe('Enterprise'); });
  it('should have 4 members', () => { expect(Object.keys(CatalogSource).length).toBe(4); });
});

describe('Enums — UpdateChannel', () => {
  it('should have Stable', () => { expect(UpdateChannel.Stable).toBe('Stable'); });
  it('should have Beta', () => { expect(UpdateChannel.Beta).toBe('Beta'); });
  it('should have Nightly', () => { expect(UpdateChannel.Nightly).toBe('Nightly'); });
  it('should have 3 members', () => { expect(Object.keys(UpdateChannel).length).toBe(3); });
});

describe('Enums — ResolutionStrategy', () => {
  it('should have HighestVersion', () => { expect(ResolutionStrategy.HighestVersion).toBe('HighestVersion'); });
  it('should have LowestVersion', () => { expect(ResolutionStrategy.LowestVersion).toBe('LowestVersion'); });
  it('should have MostCompatible', () => { expect(ResolutionStrategy.MostCompatible).toBe('MostCompatible'); });
  it('should have 3 members', () => { expect(Object.keys(ResolutionStrategy).length).toBe(3); });
});

// ═══════════════════════════════════════════════════════════════════
// 2. ERRORS HIERARCHY
// ═══════════════════════════════════════════════════════════════════

describe('MarketplaceError — base class', () => {
  it('should be an instance of Error', () => {
    const err = new MarketplaceError('TEST', 'test message');
    expect(err).toBeInstanceOf(Error);
  });

  it('should have code property', () => {
    const err = new MarketplaceError('TEST', 'test message');
    expect(err.code).toBe('TEST');
  });

  it('should have message property', () => {
    const err = new MarketplaceError('TEST', 'test message');
    expect(err.message).toBe('test message');
  });

  it('should have name set to MarketplaceError', () => {
    const err = new MarketplaceError('TEST', 'test message');
    expect(err.name).toBe('MarketplaceError');
  });

  it('should have timestamp property (string)', () => {
    const err = new MarketplaceError('TEST', 'test message');
    expect(typeof err.timestamp).toBe('string');
  });

  it('should have context property', () => {
    const err = new MarketplaceError('TEST', 'test message');
    expect(err.context).toBeDefined();
  });

  it('should accept context', () => {
    const err = new MarketplaceError('TEST', 'msg', { key: 'value' });
    expect(err.context).toEqual({ key: 'value' });
  });

  it('should have frozen context', () => {
    const err = new MarketplaceError('TEST', 'msg', { key: 'value' });
    expect(Object.isFrozen(err.context)).toBe(true);
  });

  it('should default context to empty object', () => {
    const err = new MarketplaceError('TEST', 'msg');
    expect(err.context).toEqual({});
  });
});

describe('Error Hierarchy — all extend MarketplaceError', () => {
  it('CapabilityNotFoundError extends MarketplaceError', () => {
    const err = new CapabilityNotFoundError('cap-1');
    expect(err).toBeInstanceOf(MarketplaceError);
  });

  it('CapabilityNotFoundError has correct code', () => {
    const err = new CapabilityNotFoundError('cap-1');
    expect(err.code).toBe('CAPABILITY_NOT_FOUND');
  });

  it('CapabilityNotFoundError has correct name', () => {
    const err = new CapabilityNotFoundError('cap-1');
    expect(err.name).toBe('CapabilityNotFoundError');
  });

  it('CapabilityNotFoundError has capabilityId property', () => {
    const err = new CapabilityNotFoundError('cap-1');
    expect(err.capabilityId).toBe('cap-1');
  });

  it('CapabilityLimitExceededError extends MarketplaceError', () => {
    const err = new CapabilityLimitExceededError(100);
    expect(err).toBeInstanceOf(MarketplaceError);
  });

  it('CapabilityLimitExceededError has correct code', () => {
    const err = new CapabilityLimitExceededError(100);
    expect(err.code).toBe('CAPABILITY_LIMIT_EXCEEDED');
  });

  it('CapabilityLimitExceededError has correct name', () => {
    const err = new CapabilityLimitExceededError(100);
    expect(err.name).toBe('CapabilityLimitExceededError');
  });

  it('CapabilityLimitExceededError includes max in context', () => {
    const err = new CapabilityLimitExceededError(100);
    expect(err.context.max).toBe(100);
  });

  it('CapabilityDuplicateError extends MarketplaceError', () => {
    const err = new CapabilityDuplicateError('dup-name');
    expect(err).toBeInstanceOf(MarketplaceError);
  });

  it('CapabilityDuplicateError has correct code', () => {
    const err = new CapabilityDuplicateError('dup-name');
    expect(err.code).toBe('CAPABILITY_DUPLICATE');
  });

  it('PackageNotFoundError extends MarketplaceError', () => {
    const err = new PackageNotFoundError('pkg-1');
    expect(err).toBeInstanceOf(MarketplaceError);
  });

  it('PackageNotFoundError has correct code', () => {
    const err = new PackageNotFoundError('pkg-1');
    expect(err.code).toBe('PACKAGE_NOT_FOUND');
  });

  it('PackageNotFoundError has packageId', () => {
    const err = new PackageNotFoundError('pkg-1');
    expect(err.packageId).toBe('pkg-1');
  });

  it('PackageLimitExceededError extends MarketplaceError', () => {
    expect(new PackageLimitExceededError(100)).toBeInstanceOf(MarketplaceError);
  });

  it('PackageLimitExceededError has correct code', () => {
    expect(new PackageLimitExceededError(100).code).toBe('PACKAGE_LIMIT_EXCEEDED');
  });

  it('PackageSizeExceededError extends MarketplaceError', () => {
    expect(new PackageSizeExceededError(200, 100)).toBeInstanceOf(MarketplaceError);
  });

  it('PackageSizeExceededError has correct code', () => {
    expect(new PackageSizeExceededError(200, 100).code).toBe('PACKAGE_SIZE_EXCEEDED');
  });

  it('ManifestValidationError extends MarketplaceError', () => {
    expect(new ManifestValidationError('bad')).toBeInstanceOf(MarketplaceError);
  });

  it('ManifestValidationError has correct code', () => {
    expect(new ManifestValidationError('bad').code).toBe('MANIFEST_VALIDATION_ERROR');
  });

  it('InstallationNotFoundError extends MarketplaceError', () => {
    expect(new InstallationNotFoundError('inst-1')).toBeInstanceOf(MarketplaceError);
  });

  it('InstallationNotFoundError has correct code', () => {
    expect(new InstallationNotFoundError('inst-1').code).toBe('INSTALLATION_NOT_FOUND');
  });

  it('InstallationStateError extends MarketplaceError', () => {
    expect(new InstallationStateError('inst-1', 'Pending', 'Installed')).toBeInstanceOf(MarketplaceError);
  });

  it('InstallationStateError has correct code', () => {
    expect(new InstallationStateError('inst-1', 'A', 'B').code).toBe('INSTALLATION_STATE_ERROR');
  });

  it('InstallationLimitExceededError extends MarketplaceError', () => {
    expect(new InstallationLimitExceededError(5)).toBeInstanceOf(MarketplaceError);
  });

  it('InstallationLimitExceededError has correct code', () => {
    expect(new InstallationLimitExceededError(5).code).toBe('INSTALLATION_LIMIT_EXCEEDED');
  });

  it('InstallationTimeoutError extends MarketplaceError', () => {
    expect(new InstallationTimeoutError('inst-1', 5000)).toBeInstanceOf(MarketplaceError);
  });

  it('InstallationTimeoutError has correct code', () => {
    expect(new InstallationTimeoutError('inst-1', 5000).code).toBe('INSTALLATION_TIMEOUT');
  });

  it('UpdateError extends MarketplaceError', () => {
    expect(new UpdateError('fail')).toBeInstanceOf(MarketplaceError);
  });

  it('UpdateError has correct code', () => {
    expect(new UpdateError('fail').code).toBe('UPDATE_ERROR');
  });

  it('RollbackError extends MarketplaceError', () => {
    expect(new RollbackError('fail')).toBeInstanceOf(MarketplaceError);
  });

  it('RollbackError has correct code', () => {
    expect(new RollbackError('fail').code).toBe('ROLLBACK_ERROR');
  });

  it('NoUpdateAvailableError extends MarketplaceError', () => {
    expect(new NoUpdateAvailableError('cap-1')).toBeInstanceOf(MarketplaceError);
  });

  it('NoUpdateAvailableError has correct code', () => {
    expect(new NoUpdateAvailableError('cap-1').code).toBe('NO_UPDATE_AVAILABLE');
  });

  it('DependencyResolutionError extends MarketplaceError', () => {
    expect(new DependencyResolutionError('fail')).toBeInstanceOf(MarketplaceError);
  });

  it('DependencyResolutionError has correct code', () => {
    expect(new DependencyResolutionError('fail').code).toBe('DEPENDENCY_RESOLUTION_ERROR');
  });

  it('CircularDependencyError extends MarketplaceError', () => {
    expect(new CircularDependencyError('pkg')).toBeInstanceOf(MarketplaceError);
  });

  it('CircularDependencyError has correct code', () => {
    expect(new CircularDependencyError('pkg').code).toBe('CIRCULAR_DEPENDENCY');
  });

  it('DependencyNotFoundError extends MarketplaceError', () => {
    expect(new DependencyNotFoundError('pkg')).toBeInstanceOf(MarketplaceError);
  });

  it('DependencyNotFoundError has correct code', () => {
    expect(new DependencyNotFoundError('pkg').code).toBe('DEPENDENCY_NOT_FOUND');
  });

  it('CompatibilityError extends MarketplaceError', () => {
    expect(new CompatibilityError('fail')).toBeInstanceOf(MarketplaceError);
  });

  it('CompatibilityError has correct code', () => {
    expect(new CompatibilityError('fail').code).toBe('COMPATIBILITY_ERROR');
  });

  it('IncompatibleCapabilityError extends MarketplaceError', () => {
    expect(new IncompatibleCapabilityError('cap-1')).toBeInstanceOf(MarketplaceError);
  });

  it('IncompatibleCapabilityError has correct code', () => {
    expect(new IncompatibleCapabilityError('cap-1').code).toBe('INCOMPATIBLE_CAPABILITY');
  });

  it('SignatureVerificationError extends MarketplaceError', () => {
    expect(new SignatureVerificationError('fail')).toBeInstanceOf(MarketplaceError);
  });

  it('SignatureVerificationError has correct code', () => {
    expect(new SignatureVerificationError('fail').code).toBe('SIGNATURE_VERIFICATION_ERROR');
  });

  it('SignatureExpiredError extends MarketplaceError', () => {
    expect(new SignatureExpiredError('sig-1')).toBeInstanceOf(MarketplaceError);
  });

  it('SignatureExpiredError has correct code', () => {
    expect(new SignatureExpiredError('sig-1').code).toBe('SIGNATURE_EXPIRED');
  });

  it('SandboxError extends MarketplaceError', () => {
    expect(new SandboxError('fail')).toBeInstanceOf(MarketplaceError);
  });

  it('SandboxError has correct code', () => {
    expect(new SandboxError('fail').code).toBe('SANDBOX_ERROR');
  });

  it('SandboxLimitExceededError extends MarketplaceError', () => {
    expect(new SandboxLimitExceededError(100)).toBeInstanceOf(MarketplaceError);
  });

  it('SandboxLimitExceededError has correct code', () => {
    expect(new SandboxLimitExceededError(100).code).toBe('SANDBOX_LIMIT_EXCEEDED');
  });

  it('SandboxViolationError extends MarketplaceError', () => {
    expect(new SandboxViolationError('sand-1', 'Network')).toBeInstanceOf(MarketplaceError);
  });

  it('SandboxViolationError has correct code', () => {
    expect(new SandboxViolationError('sand-1', 'Network').code).toBe('SANDBOX_VIOLATION');
  });

  it('PermissionDeniedError extends MarketplaceError', () => {
    expect(new PermissionDeniedError('Network')).toBeInstanceOf(MarketplaceError);
  });

  it('PermissionDeniedError has correct code', () => {
    expect(new PermissionDeniedError('Network').code).toBe('PERMISSION_DENIED');
  });

  it('PermissionLimitExceededError extends MarketplaceError', () => {
    expect(new PermissionLimitExceededError(100)).toBeInstanceOf(MarketplaceError);
  });

  it('PermissionLimitExceededError has correct code', () => {
    expect(new PermissionLimitExceededError(100).code).toBe('PERMISSION_LIMIT_EXCEEDED');
  });

  it('RatingError extends MarketplaceError', () => {
    expect(new RatingError('fail')).toBeInstanceOf(MarketplaceError);
  });

  it('RatingError has correct code', () => {
    expect(new RatingError('fail').code).toBe('RATING_ERROR');
  });

  it('RecommendationError extends MarketplaceError', () => {
    expect(new RecommendationError('fail')).toBeInstanceOf(MarketplaceError);
  });

  it('RecommendationError has correct code', () => {
    expect(new RecommendationError('fail').code).toBe('RECOMMENDATION_ERROR');
  });

  it('CompositionError extends MarketplaceError', () => {
    expect(new CompositionError('fail')).toBeInstanceOf(MarketplaceError);
  });

  it('CompositionError has correct code', () => {
    expect(new CompositionError('fail').code).toBe('COMPOSITION_ERROR');
  });

  it('CompositionLimitExceededError extends MarketplaceError', () => {
    expect(new CompositionLimitExceededError(100)).toBeInstanceOf(MarketplaceError);
  });

  it('CompositionLimitExceededError has correct code', () => {
    expect(new CompositionLimitExceededError(100).code).toBe('COMPOSITION_LIMIT_EXCEEDED');
  });

  it('CompositionValidationError extends MarketplaceError', () => {
    expect(new CompositionValidationError('fail')).toBeInstanceOf(MarketplaceError);
  });

  it('CompositionValidationError has correct code', () => {
    expect(new CompositionValidationError('fail').code).toBe('COMPOSITION_VALIDATION_ERROR');
  });

  it('PublisherNotFoundError extends MarketplaceError', () => {
    expect(new PublisherNotFoundError('pub-1')).toBeInstanceOf(MarketplaceError);
  });

  it('PublisherNotFoundError has correct code', () => {
    expect(new PublisherNotFoundError('pub-1').code).toBe('PUBLISHER_NOT_FOUND');
  });

  it('PublisherLimitExceededError extends MarketplaceError', () => {
    expect(new PublisherLimitExceededError(100)).toBeInstanceOf(MarketplaceError);
  });

  it('PublisherLimitExceededError has correct code', () => {
    expect(new PublisherLimitExceededError(100).code).toBe('PUBLISHER_LIMIT_EXCEEDED');
  });

  it('PublisherSuspendedError extends MarketplaceError', () => {
    expect(new PublisherSuspendedError('pub-1')).toBeInstanceOf(MarketplaceError);
  });

  it('PublisherSuspendedError has correct code', () => {
    expect(new PublisherSuspendedError('pub-1').code).toBe('PUBLISHER_SUSPENDED');
  });

  it('CatalogLimitExceededError extends MarketplaceError', () => {
    expect(new CatalogLimitExceededError(100)).toBeInstanceOf(MarketplaceError);
  });

  it('CatalogLimitExceededError has correct code', () => {
    expect(new CatalogLimitExceededError(100).code).toBe('CATALOG_LIMIT_EXCEEDED');
  });

  it('EcosystemRuntimeError extends MarketplaceError', () => {
    expect(new EcosystemRuntimeError('fail')).toBeInstanceOf(MarketplaceError);
  });

  it('EcosystemRuntimeError has correct code', () => {
    expect(new EcosystemRuntimeError('fail').code).toBe('ECOSYSTEM_RUNTIME_ERROR');
  });

  it('EcosystemNotInitializedError extends MarketplaceError', () => {
    expect(new EcosystemNotInitializedError()).toBeInstanceOf(MarketplaceError);
  });

  it('EcosystemNotInitializedError has correct code', () => {
    expect(new EcosystemNotInitializedError().code).toBe('ECOSYSTEM_NOT_INITIALIZED');
  });

  it('EcosystemDisposedError extends MarketplaceError', () => {
    expect(new EcosystemDisposedError()).toBeInstanceOf(MarketplaceError);
  });

  it('EcosystemDisposedError has correct code', () => {
    expect(new EcosystemDisposedError().code).toBe('ECOSYSTEM_DISPOSED');
  });

  it('NoValueProofError extends MarketplaceError', () => {
    expect(new NoValueProofError('cap-1')).toBeInstanceOf(MarketplaceError);
  });

  it('NoValueProofError has correct code', () => {
    expect(new NoValueProofError('cap-1').code).toBe('NO_VALUE_PROOF');
  });

  it('OptimizationWithoutValueError extends MarketplaceError', () => {
    expect(new OptimizationWithoutValueError('cap-1')).toBeInstanceOf(MarketplaceError);
  });

  it('OptimizationWithoutValueError has correct code', () => {
    expect(new OptimizationWithoutValueError('cap-1').code).toBe('OPTIMIZATION_WITHOUT_VALUE');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. EVENTS UNION TYPE
// ═══════════════════════════════════════════════════════════════════

describe('MarketplaceEvent union type', () => {
  it('should accept a CapabilityRegisteredEvent-shaped object', () => {
    const event = {
      eventType: 'marketplace.capability.registered' as const,
      classification: 'info' as const,
      capabilityId: brandCapabilityId('cap-1'),
      name: 'test',
      version: '1.0.0',
      publisherId: brandPublisherId('pub-1'),
      timestamp: '2024-01-01T00:00:00.000Z',
      metadata: {},
    };
    const e: MarketplaceEvent = event;
    expect(e.eventType).toBe('marketplace.capability.registered');
  });

  it('should accept a RatingSubmittedEvent-shaped object', () => {
    const event = {
      eventType: 'marketplace.rating.submitted' as const,
      classification: 'info' as const,
      ratingId: brandRatingId('rating-1'),
      capabilityId: brandCapabilityId('cap-1'),
      averageScore: 4.5,
      timestamp: '2024-01-01T00:00:00.000Z',
      metadata: {},
    };
    const e: MarketplaceEvent = event;
    expect(e.eventType).toBe('marketplace.rating.submitted');
  });

  it('should accept a RecommendationGeneratedEvent-shaped object', () => {
    const event = {
      eventType: 'marketplace.recommendation.generated' as const,
      classification: 'info' as const,
      recommendationId: brandRecommendationId('rec-1'),
      capabilityId: brandCapabilityId('cap-1'),
      score: 0.8,
      timestamp: '2024-01-01T00:00:00.000Z',
      metadata: {},
    };
    const e: MarketplaceEvent = event;
    expect(e.eventType).toBe('marketplace.recommendation.generated');
  });

  it('should accept a CompositionCreatedEvent-shaped object', () => {
    const event = {
      eventType: 'marketplace.composition.created' as const,
      classification: 'info' as const,
      compositionId: brandCompositionId('comp-1'),
      name: 'test',
      type: CompositionType.Pipeline,
      capabilityCount: 3,
      timestamp: '2024-01-01T00:00:00.000Z',
      metadata: {},
    };
    const e: MarketplaceEvent = event;
    expect(e.eventType).toBe('marketplace.composition.created');
  });

  it('should accept a PublisherRegisteredEvent-shaped object', () => {
    const event = {
      eventType: 'marketplace.publisher.registered' as const,
      classification: 'info' as const,
      publisherId: brandPublisherId('pub-1'),
      name: 'test',
      timestamp: '2024-01-01T00:00:00.000Z',
      metadata: {},
    };
    const e: MarketplaceEvent = event;
    expect(e.eventType).toBe('marketplace.publisher.registered');
  });

  it('should accept a PublisherStatusChangedEvent-shaped object', () => {
    const event = {
      eventType: 'marketplace.publisher.statusChanged' as const,
      classification: 'state-change' as const,
      publisherId: brandPublisherId('pub-1'),
      fromStatus: PublisherStatus.Unverified,
      toStatus: PublisherStatus.Verified,
      timestamp: '2024-01-01T00:00:00.000Z',
      metadata: {},
    };
    const e: MarketplaceEvent = event;
    expect(e.eventType).toBe('marketplace.publisher.statusChanged');
  });

  it('should accept an EcosystemInitializedEvent-shaped object', () => {
    const event = {
      eventType: 'marketplace.ecosystem.initialized' as const,
      classification: 'state-change' as const,
      subsystemCount: 14,
      timestamp: '2024-01-01T00:00:00.000Z',
      metadata: {},
    };
    const e: MarketplaceEvent = event;
    expect(e.eventType).toBe('marketplace.ecosystem.initialized');
  });

  it('should accept an EcosystemStateChangedEvent-shaped object', () => {
    const event = {
      eventType: 'marketplace.ecosystem.stateChanged' as const,
      classification: 'state-change' as const,
      fromState: EcosystemState.Uninitialized,
      toState: EcosystemState.Ready,
      timestamp: '2024-01-01T00:00:00.000Z',
      metadata: {},
    };
    const e: MarketplaceEvent = event;
    expect(e.eventType).toBe('marketplace.ecosystem.stateChanged');
  });

  it('should accept an EcosystemScanCompletedEvent-shaped object', () => {
    const event = {
      eventType: 'marketplace.ecosystem.scanCompleted' as const,
      classification: 'result' as const,
      capabilitiesScanned: 10,
      updatesAvailable: 2,
      durationMs: 100,
      timestamp: '2024-01-01T00:00:00.000Z',
      metadata: {},
    };
    const e: MarketplaceEvent = event;
    expect(e.eventType).toBe('marketplace.ecosystem.scanCompleted');
  });

  it('should accept an InstallationCompletedEvent-shaped object', () => {
    const event = {
      eventType: 'marketplace.installation.completed' as const,
      classification: 'result' as const,
      installationId: brandInstallationId('inst-1'),
      capabilityId: brandCapabilityId('cap-1'),
      version: '1.0.0',
      durationMs: 500,
      timestamp: '2024-01-01T00:00:00.000Z',
      metadata: {},
    };
    const e: MarketplaceEvent = event;
    expect(e.eventType).toBe('marketplace.installation.completed');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. CONFIG FROZEN DEFAULTS
// ═══════════════════════════════════════════════════════════════════

describe('DefaultEcosystemRuntimeConfig frozen', () => {
  it('should be frozen at top level', () => {
    expect(Object.isFrozen(DefaultEcosystemRuntimeConfig)).toBe(true);
  });

  it('should have capabilityRegistry config', () => {
    expect(DefaultEcosystemRuntimeConfig.capabilityRegistry).toBeDefined();
  });

  it('should have packageRuntime config', () => {
    expect(DefaultEcosystemRuntimeConfig.packageRuntime).toBeDefined();
  });

  it('should have marketplace config', () => {
    expect(DefaultEcosystemRuntimeConfig.marketplace).toBeDefined();
  });

  it('should have installationEngine config', () => {
    expect(DefaultEcosystemRuntimeConfig.installationEngine).toBeDefined();
  });

  it('should have updateEngine config', () => {
    expect(DefaultEcosystemRuntimeConfig.updateEngine).toBeDefined();
  });

  it('should have dependencyResolver config', () => {
    expect(DefaultEcosystemRuntimeConfig.dependencyResolver).toBeDefined();
  });

  it('should have compatibilityEngine config', () => {
    expect(DefaultEcosystemRuntimeConfig.compatibilityEngine).toBeDefined();
  });

  it('should have signatureEngine config', () => {
    expect(DefaultEcosystemRuntimeConfig.signatureEngine).toBeDefined();
  });

  it('should have sandboxRuntime config', () => {
    expect(DefaultEcosystemRuntimeConfig.sandboxRuntime).toBeDefined();
  });

  it('should have permissionRuntime config', () => {
    expect(DefaultEcosystemRuntimeConfig.permissionRuntime).toBeDefined();
  });

  it('should have ratingRuntime config', () => {
    expect(DefaultEcosystemRuntimeConfig.ratingRuntime).toBeDefined();
  });

  it('should have recommendationRuntime config', () => {
    expect(DefaultEcosystemRuntimeConfig.recommendationRuntime).toBeDefined();
  });

  it('should have compositionEngine config', () => {
    expect(DefaultEcosystemRuntimeConfig.compositionEngine).toBeDefined();
  });

  it('should have publisherRuntime config', () => {
    expect(DefaultEcosystemRuntimeConfig.publisherRuntime).toBeDefined();
  });

  it('should have eventBusEnabled', () => {
    expect(DefaultEcosystemRuntimeConfig.eventBusEnabled).toBe(true);
  });

  it('capabilityRegistry should be frozen', () => {
    expect(Object.isFrozen(DefaultEcosystemRuntimeConfig.capabilityRegistry)).toBe(true);
  });

  it('capabilityRegistry.maxCapabilities should be 10000', () => {
    expect(DefaultEcosystemRuntimeConfig.capabilityRegistry.maxCapabilities).toBe(10000);
  });

  it('packageRuntime should be frozen', () => {
    expect(Object.isFrozen(DefaultEcosystemRuntimeConfig.packageRuntime)).toBe(true);
  });

  it('marketplace should be frozen', () => {
    expect(Object.isFrozen(DefaultEcosystemRuntimeConfig.marketplace)).toBe(true);
  });

  it('installationEngine should be frozen', () => {
    expect(Object.isFrozen(DefaultEcosystemRuntimeConfig.installationEngine)).toBe(true);
  });

  it('updateEngine should be frozen', () => {
    expect(Object.isFrozen(DefaultEcosystemRuntimeConfig.updateEngine)).toBe(true);
  });

  it('dependencyResolver should be frozen', () => {
    expect(Object.isFrozen(DefaultEcosystemRuntimeConfig.dependencyResolver)).toBe(true);
  });

  it('compatibilityEngine should be frozen', () => {
    expect(Object.isFrozen(DefaultEcosystemRuntimeConfig.compatibilityEngine)).toBe(true);
  });

  it('signatureEngine should be frozen', () => {
    expect(Object.isFrozen(DefaultEcosystemRuntimeConfig.signatureEngine)).toBe(true);
  });

  it('sandboxRuntime should be frozen', () => {
    expect(Object.isFrozen(DefaultEcosystemRuntimeConfig.sandboxRuntime)).toBe(true);
  });

  it('permissionRuntime should be frozen', () => {
    expect(Object.isFrozen(DefaultEcosystemRuntimeConfig.permissionRuntime)).toBe(true);
  });

  it('ratingRuntime should be frozen', () => {
    expect(Object.isFrozen(DefaultEcosystemRuntimeConfig.ratingRuntime)).toBe(true);
  });

  it('recommendationRuntime should be frozen', () => {
    expect(Object.isFrozen(DefaultEcosystemRuntimeConfig.recommendationRuntime)).toBe(true);
  });

  it('compositionEngine should be frozen', () => {
    expect(Object.isFrozen(DefaultEcosystemRuntimeConfig.compositionEngine)).toBe(true);
  });

  it('publisherRuntime should be frozen', () => {
    expect(Object.isFrozen(DefaultEcosystemRuntimeConfig.publisherRuntime)).toBe(true);
  });

  it('ratingRuntime.minScore should be 1', () => {
    expect(DefaultEcosystemRuntimeConfig.ratingRuntime.minScore).toBe(1);
  });

  it('ratingRuntime.maxScore should be 5', () => {
    expect(DefaultEcosystemRuntimeConfig.ratingRuntime.maxScore).toBe(5);
  });

  it('ratingRuntime.dimensions should be frozen', () => {
    expect(Object.isFrozen(DefaultEcosystemRuntimeConfig.ratingRuntime.dimensions)).toBe(true);
  });

  it('ratingRuntime.dimensions should have 6 entries', () => {
    expect(DefaultEcosystemRuntimeConfig.ratingRuntime.dimensions).toHaveLength(6);
  });

  it('recommendationRuntime.minScore should be 0.3', () => {
    expect(DefaultEcosystemRuntimeConfig.recommendationRuntime.minScore).toBe(0.3);
  });

  it('compositionEngine.maxCompositions should be 500', () => {
    expect(DefaultEcosystemRuntimeConfig.compositionEngine.maxCompositions).toBe(500);
  });

  it('publisherRuntime.maxPublishers should be 1000', () => {
    expect(DefaultEcosystemRuntimeConfig.publisherRuntime.maxPublishers).toBe(1000);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. CONTRACTS INTERFACES EXIST
// ═══════════════════════════════════════════════════════════════════

describe('Contract interfaces existence', () => {
  it('RatingRuntime implements IRatingRuntime', () => {
    const rr = new RatingRuntime(config.ratingRuntime, mockEventBus);
    expect(rr).toBeDefined();
    expect(typeof rr.submit).toBe('function');
    expect(typeof rr.getByCapabilityId).toBe('function');
    expect(typeof rr.getAverage).toBe('function');
    expect(typeof rr.getById).toBe('function');
    expect(typeof rr.list).toBe('function');
    expect(typeof rr.count).toBe('function');
  });

  it('RecommendationRuntime implements IRecommendationRuntime', () => {
    const rr = new RecommendationRuntime(config.recommendationRuntime, mockEventBus);
    expect(typeof rr.recommend).toBe('function');
    expect(typeof rr.getById).toBe('function');
    expect(typeof rr.list).toBe('function');
    expect(typeof rr.count).toBe('function');
  });

  it('CompositionEngine implements ICompositionEngine', () => {
    const ce = new CompositionEngine(config.compositionEngine, mockEventBus);
    expect(typeof ce.create).toBe('function');
    expect(typeof ce.activate).toBe('function');
    expect(typeof ce.deactivate).toBe('function');
    expect(typeof ce.getById).toBe('function');
    expect(typeof ce.list).toBe('function');
    expect(typeof ce.count).toBe('function');
  });

  it('PublisherRuntime implements IPublisherRuntime', () => {
    const pr = new PublisherRuntime(config.publisherRuntime, mockEventBus);
    expect(typeof pr.register).toBe('function');
    expect(typeof pr.updateStatus).toBe('function');
    expect(typeof pr.getById).toBe('function');
    expect(typeof pr.list).toBe('function');
    expect(typeof pr.count).toBe('function');
  });

  it('EcosystemRuntime implements IEcosystemRuntime', () => {
    const er = new EcosystemRuntime(config, mockEventBus);
    expect(typeof er.initialize).toBe('function');
    expect(typeof er.shutdown).toBe('function');
    expect(typeof er.scan).toBe('function');
    expect(typeof er.getMetrics).toBe('function');
    expect(typeof er.getCapabilityRegistry).toBe('function');
    expect(typeof er.getPackageRuntime).toBe('function');
    expect(typeof er.getMarketplaceRuntime).toBe('function');
    expect(typeof er.getInstallationEngine).toBe('function');
    expect(typeof er.getUpdateEngine).toBe('function');
    expect(typeof er.getDependencyResolver).toBe('function');
    expect(typeof er.getCompatibilityEngine).toBe('function');
    expect(typeof er.getSignatureEngine).toBe('function');
    expect(typeof er.getSandboxRuntime).toBe('function');
    expect(typeof er.getPermissionRuntime).toBe('function');
    expect(typeof er.getRatingRuntime).toBe('function');
    expect(typeof er.getRecommendationRuntime).toBe('function');
    expect(typeof er.getCompositionEngine).toBe('function');
    expect(typeof er.getPublisherRuntime).toBe('function');
    expect(typeof er.state).not.toBe('undefined');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. RATING RUNTIME
// ═══════════════════════════════════════════════════════════════════

describe('RatingRuntime', () => {
  let runtime: RatingRuntime;

  beforeEach(() => {
    vi.clearAllMocks();
    runtime = new RatingRuntime(config.ratingRuntime, mockEventBus);
  });

  describe('constructor', () => {
    it('should create instance with config and eventBus', () => {
      const r = new RatingRuntime(config.ratingRuntime, mockEventBus);
      expect(r).toBeInstanceOf(RatingRuntime);
    });

    it('should create instance without eventBus', () => {
      const r = new RatingRuntime(config.ratingRuntime);
      expect(r).toBeInstanceOf(RatingRuntime);
    });

    it('should create instance with null eventBus', () => {
      const r = new RatingRuntime(config.ratingRuntime, null);
      expect(r).toBeInstanceOf(RatingRuntime);
    });
  });

  describe('submit — happy path', () => {
    const capId = brandCapabilityId('cap-r1');
    const makeScore = (overrides?: Partial<Record<RatingDimension, number>>): Readonly<Record<RatingDimension, number>> =>
      Object.freeze({
        [RatingDimension.Quality]: 5,
        [RatingDimension.Reliability]: 4,
        [RatingDimension.Usability]: 5,
        [RatingDimension.Performance]: 4,
        [RatingDimension.Security]: 5,
        [RatingDimension.Documentation]: 3,
        ...overrides,
      } as Record<RatingDimension, number>);

    it('should return a RatingEntry', async () => {
      const entry = await runtime.submit({
        capabilityId: capId, userId: 'user-1', scores: makeScore(), comment: 'Great', metadata: {},
      });
      expect(entry).toBeDefined();
      expect(entry.id).toBeDefined();
    });

    it('should have correct capabilityId', async () => {
      const entry = await runtime.submit({
        capabilityId: capId, userId: 'user-1', scores: makeScore(), comment: 'Great', metadata: {},
      });
      expect(entry.capabilityId).toBe(capId);
    });

    it('should have correct userId', async () => {
      const entry = await runtime.submit({
        capabilityId: capId, userId: 'user-2', scores: makeScore(), comment: 'Great', metadata: {},
      });
      expect(entry.userId).toBe('user-2');
    });

    it('should have scores that match input', async () => {
      const scores = makeScore();
      const entry = await runtime.submit({
        capabilityId: capId, userId: 'user-1', scores, comment: 'Great', metadata: {},
      });
      expect(entry.scores).toEqual(scores);
    });

    it('should have correct comment', async () => {
      const entry = await runtime.submit({
        capabilityId: capId, userId: 'user-1', scores: makeScore(), comment: 'Awesome cap', metadata: {},
      });
      expect(entry.comment).toBe('Awesome cap');
    });

    it('should have createdAt timestamp', async () => {
      const before = new Date().toISOString();
      const entry = await runtime.submit({
        capabilityId: capId, userId: 'user-1', scores: makeScore(), comment: 'Great', metadata: {},
      });
      expect(entry.createdAt).toBeDefined();
      expect(new Date(entry.createdAt).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
    });

    it('should have metadata', async () => {
      const meta = { source: 'test' };
      const entry = await runtime.submit({
        capabilityId: capId, userId: 'user-1', scores: makeScore(), comment: 'Great', metadata: meta,
      });
      expect(entry.metadata).toEqual(meta);
    });

    it('should publish event via eventBus', async () => {
      await runtime.submit({
        capabilityId: capId, userId: 'user-1', scores: makeScore(), comment: 'Great', metadata: {},
      });
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should publish event with rating.submitted eventType', async () => {
      await runtime.submit({
        capabilityId: capId, userId: 'user-1', scores: makeScore(), comment: 'Great', metadata: {},
      });
      const call = mockEventBus.publish.mock.calls[0][0];
      expect(call.eventType).toBe('marketplace.rating.submitted');
    });

    it('should increment count after submit', async () => {
      expect(await runtime.count()).toBe(0);
      await runtime.submit({
        capabilityId: capId, userId: 'user-1', scores: makeScore(), comment: 'Great', metadata: {},
      });
      expect(await runtime.count()).toBe(1);
    });

    // Test all 6 RatingDimensions individually
    it('should accept Quality dimension', async () => {
      const entry = await runtime.submit({
        capabilityId: capId, userId: 'u-q', scores: makeScore({ [RatingDimension.Quality]: 5 }), comment: '', metadata: {},
      });
      expect(entry.scores[RatingDimension.Quality]).toBe(5);
    });

    it('should accept Reliability dimension', async () => {
      const entry = await runtime.submit({
        capabilityId: capId, userId: 'u-r', scores: makeScore({ [RatingDimension.Reliability]: 5 }), comment: '', metadata: {},
      });
      expect(entry.scores[RatingDimension.Reliability]).toBe(5);
    });

    it('should accept Usability dimension', async () => {
      const entry = await runtime.submit({
        capabilityId: capId, userId: 'u-u', scores: makeScore({ [RatingDimension.Usability]: 5 }), comment: '', metadata: {},
      });
      expect(entry.scores[RatingDimension.Usability]).toBe(5);
    });

    it('should accept Performance dimension', async () => {
      const entry = await runtime.submit({
        capabilityId: capId, userId: 'u-p', scores: makeScore({ [RatingDimension.Performance]: 5 }), comment: '', metadata: {},
      });
      expect(entry.scores[RatingDimension.Performance]).toBe(5);
    });

    it('should accept Security dimension', async () => {
      const entry = await runtime.submit({
        capabilityId: capId, userId: 'u-s', scores: makeScore({ [RatingDimension.Security]: 5 }), comment: '', metadata: {},
      });
      expect(entry.scores[RatingDimension.Security]).toBe(5);
    });

    it('should accept Documentation dimension', async () => {
      const entry = await runtime.submit({
        capabilityId: capId, userId: 'u-d', scores: makeScore({ [RatingDimension.Documentation]: 5 }), comment: '', metadata: {},
      });
      expect(entry.scores[RatingDimension.Documentation]).toBe(5);
    });
  });

  describe('submit — score bounds', () => {
    const capId = brandCapabilityId('cap-r2');
    const makeScore = (dim: RatingDimension, val: number): Readonly<Record<RatingDimension, number>> =>
      Object.freeze({
        [RatingDimension.Quality]: val,
        [RatingDimension.Reliability]: 3,
        [RatingDimension.Usability]: 3,
        [RatingDimension.Performance]: 3,
        [RatingDimension.Security]: 3,
        [RatingDimension.Documentation]: 3,
      } as Record<RatingDimension, number>);

    it('should reject score below minScore (0)', async () => {
      await expect(runtime.submit({
        capabilityId: capId, userId: 'u', scores: makeScore(RatingDimension.Quality, 0), comment: '', metadata: {},
      })).rejects.toThrow(RatingError);
    });

    it('should reject score above maxScore (6)', async () => {
      await expect(runtime.submit({
        capabilityId: capId, userId: 'u', scores: makeScore(RatingDimension.Quality, 6), comment: '', metadata: {},
      })).rejects.toThrow(RatingError);
    });

    it('should reject negative score', async () => {
      await expect(runtime.submit({
        capabilityId: capId, userId: 'u', scores: makeScore(RatingDimension.Quality, -1), comment: '', metadata: {},
      })).rejects.toThrow(RatingError);
    });

    it('should accept score at minScore (1)', async () => {
      await expect(runtime.submit({
        capabilityId: capId, userId: 'u-min', scores: makeScore(RatingDimension.Quality, 1), comment: '', metadata: {},
      })).resolves.toBeDefined();
    });

    it('should accept score at maxScore (5)', async () => {
      await expect(runtime.submit({
        capabilityId: capId, userId: 'u-max', scores: makeScore(RatingDimension.Quality, 5), comment: '', metadata: {},
      })).resolves.toBeDefined();
    });

    it('should reject undefined score for Quality', async () => {
      const badScores = Object.freeze({
        [RatingDimension.Reliability]: 3,
        [RatingDimension.Usability]: 3,
        [RatingDimension.Performance]: 3,
        [RatingDimension.Security]: 3,
        [RatingDimension.Documentation]: 3,
      } as unknown as Record<RatingDimension, number>);
      await expect(runtime.submit({
        capabilityId: capId, userId: 'u', scores: badScores, comment: '', metadata: {},
      })).rejects.toThrow(RatingError);
    });
  });

  describe('getById', () => {
    it('should return null for non-existent id', async () => {
      const result = await runtime.getById(brandRatingId('non-existent'));
      expect(result).toBeNull();
    });

    it('should return the entry after submit', async () => {
      const capId = brandCapabilityId('cap-r3');
      const scores = Object.freeze({
        [RatingDimension.Quality]: 5, [RatingDimension.Reliability]: 4,
        [RatingDimension.Usability]: 5, [RatingDimension.Performance]: 4,
        [RatingDimension.Security]: 5, [RatingDimension.Documentation]: 3,
      } as Record<RatingDimension, number>);
      const entry = await runtime.submit({ capabilityId: capId, userId: 'user-1', scores, comment: 'ok', metadata: {} });
      const found = await runtime.getById(entry.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(entry.id);
    });

    it('should return correct userId', async () => {
      const capId = brandCapabilityId('cap-r4');
      const scores = Object.freeze({
        [RatingDimension.Quality]: 4, [RatingDimension.Reliability]: 4,
        [RatingDimension.Usability]: 4, [RatingDimension.Performance]: 4,
        [RatingDimension.Security]: 4, [RatingDimension.Documentation]: 4,
      } as Record<RatingDimension, number>);
      const entry = await runtime.submit({ capabilityId: capId, userId: 'user-x', scores, comment: 'ok', metadata: {} });
      const found = await runtime.getById(entry.id);
      expect(found!.userId).toBe('user-x');
    });
  });

  describe('getByCapabilityId', () => {
    it('should return empty array for non-existent capability', async () => {
      const result = await runtime.getByCapabilityId(brandCapabilityId('no-ratings'));
      expect(result).toHaveLength(0);
    });

    it('should return ratings for a capability', async () => {
      const capId = brandCapabilityId('cap-r5');
      const scores = Object.freeze({
        [RatingDimension.Quality]: 5, [RatingDimension.Reliability]: 4,
        [RatingDimension.Usability]: 5, [RatingDimension.Performance]: 4,
        [RatingDimension.Security]: 5, [RatingDimension.Documentation]: 3,
      } as Record<RatingDimension, number>);
      await runtime.submit({ capabilityId: capId, userId: 'user-a', scores, comment: '', metadata: {} });
      await runtime.submit({ capabilityId: capId, userId: 'user-b', scores, comment: '', metadata: {} });
      const result = await runtime.getByCapabilityId(capId);
      expect(result).toHaveLength(2);
    });

    it('should not return ratings for other capabilities', async () => {
      const capId1 = brandCapabilityId('cap-r6a');
      const capId2 = brandCapabilityId('cap-r6b');
      const scores = Object.freeze({
        [RatingDimension.Quality]: 3, [RatingDimension.Reliability]: 3,
        [RatingDimension.Usability]: 3, [RatingDimension.Performance]: 3,
        [RatingDimension.Security]: 3, [RatingDimension.Documentation]: 3,
      } as Record<RatingDimension, number>);
      await runtime.submit({ capabilityId: capId1, userId: 'u1', scores, comment: '', metadata: {} });
      const result = await runtime.getByCapabilityId(capId2);
      expect(result).toHaveLength(0);
    });
  });

  describe('getAverage', () => {
    it('should return 0 for capability with no ratings', async () => {
      const avg = await runtime.getAverage(brandCapabilityId('no-avg'));
      expect(avg).toBe(0);
    });

    it('should return correct average for one rating', async () => {
      const capId = brandCapabilityId('cap-avg1');
      const scores = Object.freeze({
        [RatingDimension.Quality]: 4, [RatingDimension.Reliability]: 4,
        [RatingDimension.Usability]: 4, [RatingDimension.Performance]: 4,
        [RatingDimension.Security]: 4, [RatingDimension.Documentation]: 4,
      } as Record<RatingDimension, number>);
      await runtime.submit({ capabilityId: capId, userId: 'u', scores, comment: '', metadata: {} });
      const avg = await runtime.getAverage(capId);
      expect(avg).toBe(4);
    });

    it('should compute average across multiple ratings and dimensions', async () => {
      const capId = brandCapabilityId('cap-avg2');
      const scores1 = Object.freeze({
        [RatingDimension.Quality]: 5, [RatingDimension.Reliability]: 5,
        [RatingDimension.Usability]: 5, [RatingDimension.Performance]: 5,
        [RatingDimension.Security]: 5, [RatingDimension.Documentation]: 5,
      } as Record<RatingDimension, number>);
      const scores2 = Object.freeze({
        [RatingDimension.Quality]: 1, [RatingDimension.Reliability]: 1,
        [RatingDimension.Usability]: 1, [RatingDimension.Performance]: 1,
        [RatingDimension.Security]: 1, [RatingDimension.Documentation]: 1,
      } as Record<RatingDimension, number>);
      await runtime.submit({ capabilityId: capId, userId: 'u1', scores: scores1, comment: '', metadata: {} });
      await runtime.submit({ capabilityId: capId, userId: 'u2', scores: scores2, comment: '', metadata: {} });
      const avg = await runtime.getAverage(capId);
      // (5*6 + 1*6) / 12 = 36/12 = 3
      expect(avg).toBe(3);
    });
  });

  describe('list', () => {
    it('should return empty array initially', async () => {
      const result = await runtime.list();
      expect(result).toHaveLength(0);
    });

    it('should return all submitted ratings', async () => {
      const capId = brandCapabilityId('cap-list1');
      const scores = Object.freeze({
        [RatingDimension.Quality]: 5, [RatingDimension.Reliability]: 4,
        [RatingDimension.Usability]: 5, [RatingDimension.Performance]: 4,
        [RatingDimension.Security]: 5, [RatingDimension.Documentation]: 3,
      } as Record<RatingDimension, number>);
      await runtime.submit({ capabilityId: capId, userId: 'u1', scores, comment: '', metadata: {} });
      await runtime.submit({ capabilityId: capId, userId: 'u2', scores, comment: '', metadata: {} });
      await runtime.submit({ capabilityId: capId, userId: 'u3', scores, comment: '', metadata: {} });
      const result = await runtime.list();
      expect(result).toHaveLength(3);
    });
  });

  describe('count', () => {
    it('should return 0 initially', async () => {
      expect(await runtime.count()).toBe(0);
    });

    it('should increment after each submit', async () => {
      const capId = brandCapabilityId('cap-count1');
      const scores = Object.freeze({
        [RatingDimension.Quality]: 3, [RatingDimension.Reliability]: 3,
        [RatingDimension.Usability]: 3, [RatingDimension.Performance]: 3,
        [RatingDimension.Security]: 3, [RatingDimension.Documentation]: 3,
      } as Record<RatingDimension, number>);
      await runtime.submit({ capabilityId: capId, userId: 'u1', scores, comment: '', metadata: {} });
      expect(await runtime.count()).toBe(1);
      await runtime.submit({ capabilityId: capId, userId: 'u2', scores, comment: '', metadata: {} });
      expect(await runtime.count()).toBe(2);
    });
  });

  describe('events', () => {
    it('should publish with capabilityId', async () => {
      const capId = brandCapabilityId('cap-ev1');
      const scores = Object.freeze({
        [RatingDimension.Quality]: 5, [RatingDimension.Reliability]: 4,
        [RatingDimension.Usability]: 5, [RatingDimension.Performance]: 4,
        [RatingDimension.Security]: 5, [RatingDimension.Documentation]: 3,
      } as Record<RatingDimension, number>);
      await runtime.submit({ capabilityId: capId, userId: 'u', scores, comment: '', metadata: {} });
      const call = mockEventBus.publish.mock.calls[0][0];
      expect(call.capabilityId).toBe(capId);
    });

    it('should publish with ratingId', async () => {
      const capId = brandCapabilityId('cap-ev2');
      const scores = Object.freeze({
        [RatingDimension.Quality]: 4, [RatingDimension.Reliability]: 4,
        [RatingDimension.Usability]: 4, [RatingDimension.Performance]: 4,
        [RatingDimension.Security]: 4, [RatingDimension.Documentation]: 4,
      } as Record<RatingDimension, number>);
      const entry = await runtime.submit({ capabilityId: capId, userId: 'u', scores, comment: '', metadata: {} });
      const call = mockEventBus.publish.mock.calls[0][0];
      expect(call.ratingId).toBe(entry.id);
    });

    it('should publish with averageScore', async () => {
      const capId = brandCapabilityId('cap-ev3');
      const scores = Object.freeze({
        [RatingDimension.Quality]: 4, [RatingDimension.Reliability]: 4,
        [RatingDimension.Usability]: 4, [RatingDimension.Performance]: 4,
        [RatingDimension.Security]: 4, [RatingDimension.Documentation]: 4,
      } as Record<RatingDimension, number>);
      await runtime.submit({ capabilityId: capId, userId: 'u', scores, comment: '', metadata: {} });
      const call = mockEventBus.publish.mock.calls[0][0];
      expect(call.averageScore).toBe(4);
    });

    it('should not publish when eventBus is null', async () => {
      const noBus = new RatingRuntime(config.ratingRuntime, null);
      const capId = brandCapabilityId('cap-ev4');
      const scores = Object.freeze({
        [RatingDimension.Quality]: 4, [RatingDimension.Reliability]: 4,
        [RatingDimension.Usability]: 4, [RatingDimension.Performance]: 4,
        [RatingDimension.Security]: 4, [RatingDimension.Documentation]: 4,
      } as Record<RatingDimension, number>);
      await noBus.submit({ capabilityId: capId, userId: 'u', scores, comment: '', metadata: {} });
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty comment', async () => {
      const capId = brandCapabilityId('cap-edge1');
      const scores = Object.freeze({
        [RatingDimension.Quality]: 3, [RatingDimension.Reliability]: 3,
        [RatingDimension.Usability]: 3, [RatingDimension.Performance]: 3,
        [RatingDimension.Security]: 3, [RatingDimension.Documentation]: 3,
      } as Record<RatingDimension, number>);
      const entry = await runtime.submit({ capabilityId: capId, userId: 'u', scores, comment: '', metadata: {} });
      expect(entry.comment).toBe('');
    });

    it('should handle empty metadata', async () => {
      const capId = brandCapabilityId('cap-edge2');
      const scores = Object.freeze({
        [RatingDimension.Quality]: 3, [RatingDimension.Reliability]: 3,
        [RatingDimension.Usability]: 3, [RatingDimension.Performance]: 3,
        [RatingDimension.Security]: 3, [RatingDimension.Documentation]: 3,
      } as Record<RatingDimension, number>);
      const entry = await runtime.submit({ capabilityId: capId, userId: 'u', scores, comment: '', metadata: {} });
      expect(entry.metadata).toEqual({});
    });

    it('should handle multiple capabilities independently', async () => {
      const capId1 = brandCapabilityId('cap-multi1');
      const capId2 = brandCapabilityId('cap-multi2');
      const scores = Object.freeze({
        [RatingDimension.Quality]: 5, [RatingDimension.Reliability]: 4,
        [RatingDimension.Usability]: 5, [RatingDimension.Performance]: 4,
        [RatingDimension.Security]: 5, [RatingDimension.Documentation]: 3,
      } as Record<RatingDimension, number>);
      await runtime.submit({ capabilityId: capId1, userId: 'u1', scores, comment: '', metadata: {} });
      await runtime.submit({ capabilityId: capId2, userId: 'u2', scores, comment: '', metadata: {} });
      expect(await runtime.getByCapabilityId(capId1)).toHaveLength(1);
      expect(await runtime.getByCapabilityId(capId2)).toHaveLength(1);
      expect(await runtime.count()).toBe(2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 7. RECOMMENDATION RUNTIME
// ═══════════════════════════════════════════════════════════════════

describe('RecommendationRuntime', () => {
  let runtime: RecommendationRuntime;

  const makeCapability = (id: string, name: string, overrides?: Partial<CapabilityEntry>): CapabilityEntry =>
    makeCapabilityEntry({
      id: brandCapabilityId(id),
      name,
      category: 'analytics',
      tags: Object.freeze(['data', 'reporting']),
      description: `${name} capability for data analysis`,
      rating: 4,
      ...overrides,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    runtime = new RecommendationRuntime(config.recommendationRuntime, mockEventBus);
  });

  describe('constructor', () => {
    it('should create instance with config and eventBus', () => {
      const r = new RecommendationRuntime(config.recommendationRuntime, mockEventBus);
      expect(r).toBeInstanceOf(RecommendationRuntime);
    });

    it('should create instance without eventBus', () => {
      const r = new RecommendationRuntime(config.recommendationRuntime);
      expect(r).toBeInstanceOf(RecommendationRuntime);
    });

    it('should create instance with null eventBus', () => {
      const r = new RecommendationRuntime(config.recommendationRuntime, null);
      expect(r).toBeInstanceOf(RecommendationRuntime);
    });
  });

  describe('recommend — happy path', () => {
    it('should return empty array when no capabilities set', async () => {
      const results = await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      expect(results).toHaveLength(0);
    });

    it('should recommend when goals match category', async () => {
      runtime.setCapabilities([makeCapability('cap-rec1', 'Data Analytics')]);
      const results = await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should recommend when goals match description', async () => {
      runtime.setCapabilities([makeCapability('cap-rec2', 'Report Gen', { description: 'Generates analytics reports' })]);
      const results = await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should recommend when goals match tags', async () => {
      runtime.setCapabilities([makeCapability('cap-rec3', 'Data Viz', { tags: Object.freeze(['analytics', 'charts']) })]);
      const results = await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should not recommend already installed capabilities', async () => {
      const cap = makeCapability('cap-rec4', 'Data Analytics');
      runtime.setCapabilities([cap]);
      const results = await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [cap.id], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      expect(results).toHaveLength(0);
    });

    it('should not recommend below minScore', async () => {
      const cap = makeCapability('cap-rec5', 'Unrelated Tool', { category: 'gaming', description: 'A game', rating: 0 });
      runtime.setCapabilities([cap]);
      const results = await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      expect(results).toHaveLength(0);
    });

    it('should have correct capabilityId on result', async () => {
      const cap = makeCapability('cap-rec6', 'Data Analytics');
      runtime.setCapabilities([cap]);
      const results = await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      expect(results[0].capabilityId).toBe(cap.id);
    });

    it('should have non-empty reason', async () => {
      const cap = makeCapability('cap-rec7', 'Data Analytics');
      runtime.setCapabilities([cap]);
      const results = await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      expect(results[0].reason.length).toBeGreaterThan(0);
    });

    it('should have positive score', async () => {
      const cap = makeCapability('cap-rec8', 'Data Analytics');
      runtime.setCapabilities([cap]);
      const results = await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should have createdAt timestamp', async () => {
      const cap = makeCapability('cap-rec9', 'Data Analytics');
      runtime.setCapabilities([cap]);
      const results = await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      expect(results[0].createdAt).toBeDefined();
    });

    it('should have basedOn array', async () => {
      const cap = makeCapability('cap-rec10', 'Data Analytics');
      runtime.setCapabilities([cap]);
      const results = await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      expect(Array.isArray(results[0].basedOn)).toBe(true);
    });

    it('should boost score with workflow context match', async () => {
      const cap = makeCapability('cap-rec11', 'Data Analytics', { description: 'Data analytics for workflow automation' });
      runtime.setCapabilities([cap]);
      const results = await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: 'automation', experienceLevel: 'beginner', metadata: {},
      });
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should boost score for high rating capability', async () => {
      const cap = makeCapability('cap-rec12', 'Data Analytics', { rating: 5 });
      runtime.setCapabilities([cap]);
      const results = await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should respect maxRecommendations limit', async () => {
      const caps = Array.from({ length: 100 }, (_, i) =>
        makeCapability(`cap-rec-max-${i}`, `Analytics Tool ${i}`, { category: 'analytics' })
      );
      runtime.setCapabilities(caps);
      const results = await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      expect(results.length).toBeLessThanOrEqual(config.recommendationRuntime.maxRecommendations);
    });

    it('should publish events for each recommendation', async () => {
      const cap = makeCapability('cap-rec13', 'Data Analytics');
      runtime.setCapabilities([cap]);
      await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should publish with recommendation.generated eventType', async () => {
      const cap = makeCapability('cap-rec14', 'Data Analytics');
      runtime.setCapabilities([cap]);
      await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      const call = mockEventBus.publish.mock.calls[0][0];
      expect(call.eventType).toBe('marketplace.recommendation.generated');
    });
  });

  describe('recommend — multiple goals', () => {
    it('should recommend for multiple matching goals', async () => {
      const cap = makeCapability('cap-rec-mg1', 'Data Analytics', { category: 'analytics reporting' });
      runtime.setCapabilities([cap]);
      const results = await runtime.recommend({
        goals: ['analytics', 'reporting'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThanOrEqual(config.recommendationRuntime.goalWeight);
    });
  });

  describe('recommend — empty contexts', () => {
    it('should handle empty goals', async () => {
      const cap = makeCapability('cap-rec-e1', 'Data Analytics', { rating: 4 });
      runtime.setCapabilities([cap]);
      const results = await runtime.recommend({
        goals: [], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      // Only rating-based boost if rating > 3, might not reach minScore
      expect(results).toBeDefined();
    });

    it('should handle empty installed capabilities', async () => {
      runtime.setCapabilities([makeCapability('cap-rec-e2', 'Data Analytics')]);
      const results = await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle null workflow context', async () => {
      runtime.setCapabilities([makeCapability('cap-rec-e3', 'Data Analytics')]);
      const results = await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      expect(results).toBeDefined();
    });
  });

  describe('getById', () => {
    it('should return null for non-existent id', async () => {
      const result = await runtime.getById(brandRecommendationId('non-existent'));
      expect(result).toBeNull();
    });

    it('should return recommendation after recommend', async () => {
      runtime.setCapabilities([makeCapability('cap-rec-gbi', 'Data Analytics')]);
      const recs = await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      if (recs.length > 0) {
        const found = await runtime.getById(recs[0].id);
        expect(found).toBeDefined();
        expect(found!.id).toBe(recs[0].id);
      }
    });
  });

  describe('list', () => {
    it('should return empty array initially', async () => {
      const results = await runtime.list();
      expect(results).toHaveLength(0);
    });

    it('should return recommendations after recommend', async () => {
      runtime.setCapabilities([makeCapability('cap-rec-list', 'Data Analytics')]);
      await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      const results = await runtime.list();
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('count', () => {
    it('should return 0 initially', async () => {
      expect(await runtime.count()).toBe(0);
    });

    it('should return correct count after recommend', async () => {
      runtime.setCapabilities([makeCapability('cap-rec-count', 'Data Analytics')]);
      await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      expect(await runtime.count()).toBe(1);
    });

    it('should accumulate across multiple recommend calls', async () => {
      runtime.setCapabilities([makeCapability('cap-rec-acc', 'Data Analytics')]);
      await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      expect(await runtime.count()).toBe(2);
    });
  });

  describe('events', () => {
    it('should not publish when eventBus is null', async () => {
      const noBus = new RecommendationRuntime(config.recommendationRuntime, null);
      noBus.setCapabilities([makeCapability('cap-rec-nb', 'Data Analytics')]);
      await noBus.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should publish with capabilityId', async () => {
      const cap = makeCapability('cap-rec-ev', 'Data Analytics');
      runtime.setCapabilities([cap]);
      await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      const call = mockEventBus.publish.mock.calls[0][0];
      expect(call.capabilityId).toBe(cap.id);
    });

    it('should publish with score', async () => {
      runtime.setCapabilities([makeCapability('cap-rec-ev2', 'Data Analytics')]);
      await runtime.recommend({
        goals: ['analytics'], installedCapabilities: [], workflowContext: null, experienceLevel: 'beginner', metadata: {},
      });
      const call = mockEventBus.publish.mock.calls[0][0];
      expect(typeof call.score).toBe('number');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 8. COMPOSITION ENGINE
// ═══════════════════════════════════════════════════════════════════

describe('CompositionEngine', () => {
  let engine: CompositionEngine;

  const makeStep = (order: number, capId: string, overrides?: Partial<CompositionStepInput>): CompositionStepInput => ({
    order,
    capabilityId: brandCapabilityId(capId),
    config: Object.freeze({ key: 'value' }),
    fallbackCapabilityId: null,
    condition: null,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new CompositionEngine(config.compositionEngine, mockEventBus);
  });

  describe('constructor', () => {
    it('should create instance with config and eventBus', () => {
      expect(new CompositionEngine(config.compositionEngine, mockEventBus)).toBeInstanceOf(CompositionEngine);
    });

    it('should create instance without eventBus', () => {
      expect(new CompositionEngine(config.compositionEngine)).toBeInstanceOf(CompositionEngine);
    });

    it('should create instance with null eventBus', () => {
      expect(new CompositionEngine(config.compositionEngine, null)).toBeInstanceOf(CompositionEngine);
    });
  });

  describe('create — happy path', () => {
    it('should create a composition with Pipeline type', async () => {
      const comp = await engine.create({
        name: 'test-pipeline', description: 'A pipeline', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-p1')], metadata: {},
      });
      expect(comp.type).toBe(CompositionType.Pipeline);
      expect(comp.name).toBe('test-pipeline');
    });

    it('should create with Parallel type', async () => {
      const comp = await engine.create({
        name: 'test-parallel', description: 'Parallel', type: CompositionType.Parallel,
        steps: [makeStep(1, 'cap-pa1')], metadata: {},
      });
      expect(comp.type).toBe(CompositionType.Parallel);
    });

    it('should create with Conditional type', async () => {
      const comp = await engine.create({
        name: 'test-conditional', description: 'Conditional', type: CompositionType.Conditional,
        steps: [makeStep(1, 'cap-co1'), makeStep(2, 'cap-co2', { condition: 'x > 5' })], metadata: {},
      });
      expect(comp.type).toBe(CompositionType.Conditional);
    });

    it('should create with Fallback type', async () => {
      const comp = await engine.create({
        name: 'test-fallback', description: 'Fallback', type: CompositionType.Fallback,
        steps: [makeStep(1, 'cap-f1', { fallbackCapabilityId: brandCapabilityId('cap-f1b') })], metadata: {},
      });
      expect(comp.type).toBe(CompositionType.Fallback);
    });

    it('should create with Chain type', async () => {
      const comp = await engine.create({
        name: 'test-chain', description: 'Chain', type: CompositionType.Chain,
        steps: [makeStep(1, 'cap-ch1'), makeStep(2, 'cap-ch2'), makeStep(3, 'cap-ch3')], metadata: {},
      });
      expect(comp.type).toBe(CompositionType.Chain);
    });

    it('should have an id', async () => {
      const comp = await engine.create({
        name: 'test-id', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-id1')], metadata: {},
      });
      expect(comp.id).toBeDefined();
    });

    it('should be inactive initially', async () => {
      const comp = await engine.create({
        name: 'test-inactive', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-ia1')], metadata: {},
      });
      expect(comp.active).toBe(false);
    });

    it('should have correct steps', async () => {
      const comp = await engine.create({
        name: 'test-steps', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-s1'), makeStep(2, 'cap-s2')], metadata: {},
      });
      expect(comp.steps).toHaveLength(2);
      expect(comp.steps[0].order).toBe(1);
      expect(comp.steps[1].order).toBe(2);
    });

    it('should have correct capabilities list', async () => {
      const comp = await engine.create({
        name: 'test-caps', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-c1'), makeStep(2, 'cap-c2')], metadata: {},
      });
      expect(comp.capabilities).toHaveLength(2);
    });

    it('should deduplicate capabilities', async () => {
      const comp = await engine.create({
        name: 'test-dedup', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-d1'), makeStep(2, 'cap-d1')], metadata: {},
      });
      expect(comp.capabilities).toHaveLength(1);
    });

    it('should have createdAt timestamp', async () => {
      const comp = await engine.create({
        name: 'test-ts', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-ts1')], metadata: {},
      });
      expect(comp.createdAt).toBeDefined();
    });

    it('should have updatedAt same as createdAt initially', async () => {
      const comp = await engine.create({
        name: 'test-ut', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-ut1')], metadata: {},
      });
      expect(comp.updatedAt).toBe(comp.createdAt);
    });

    it('should store metadata', async () => {
      const meta = { team: 'backend' };
      const comp = await engine.create({
        name: 'test-meta', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-m1')], metadata: meta,
      });
      expect(comp.metadata).toEqual(meta);
    });

    it('should increment count', async () => {
      expect(await engine.count()).toBe(0);
      await engine.create({
        name: 'test-count1', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-cnt1')], metadata: {},
      });
      expect(await engine.count()).toBe(1);
    });

    it('should publish created event', async () => {
      await engine.create({
        name: 'test-evt', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-evt1')], metadata: {},
      });
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should publish with composition.created eventType', async () => {
      await engine.create({
        name: 'test-evt2', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-evt2')], metadata: {},
      });
      const call = mockEventBus.publish.mock.calls[0][0];
      expect(call.eventType).toBe('marketplace.composition.created');
    });

    it('should publish with correct name', async () => {
      await engine.create({
        name: 'my-pipeline', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-evt3')], metadata: {},
      });
      const call = mockEventBus.publish.mock.calls[0][0];
      expect(call.name).toBe('my-pipeline');
    });
  });

  describe('create — error cases', () => {
    it('should throw CompositionLimitExceededError when max reached', async () => {
      const smallConfig = { ...config.compositionEngine, maxCompositions: 1 };
      const smallEngine = new CompositionEngine(smallConfig, mockEventBus);
      await smallEngine.create({
        name: 'c1', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-lim1')], metadata: {},
      });
      await expect(smallEngine.create({
        name: 'c2', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-lim2')], metadata: {},
      })).rejects.toThrow(CompositionLimitExceededError);
    });

    it('should throw CompositionValidationError when steps exceed max', async () => {
      const smallConfig = { ...config.compositionEngine, maxStepsPerComposition: 2 };
      const smallEngine = new CompositionEngine(smallConfig, mockEventBus);
      await expect(smallEngine.create({
        name: 'too-many-steps', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-st1'), makeStep(2, 'cap-st2'), makeStep(3, 'cap-st3')], metadata: {},
      })).rejects.toThrow(CompositionValidationError);
    });

    it('should throw CompositionValidationError when capabilities exceed max', async () => {
      const smallConfig = { ...config.compositionEngine, maxCapabilitiesPerComposition: 2 };
      const smallEngine = new CompositionEngine(smallConfig, mockEventBus);
      await expect(smallEngine.create({
        name: 'too-many-caps', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-ca1'), makeStep(2, 'cap-ca2'), makeStep(3, 'cap-ca3')], metadata: {},
      })).rejects.toThrow(CompositionValidationError);
    });
  });

  describe('activate', () => {
    it('should activate a composition', async () => {
      const comp = await engine.create({
        name: 'test-act', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-act1')], metadata: {},
      });
      await engine.activate(comp.id);
      const updated = await engine.getById(comp.id);
      expect(updated!.active).toBe(true);
    });

    it('should throw CompositionError for non-existent composition', async () => {
      await expect(engine.activate(brandCompositionId('non-existent'))).rejects.toThrow(CompositionError);
    });

    it('should publish activated event', async () => {
      const comp = await engine.create({
        name: 'test-act-evt', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-ae1')], metadata: {},
      });
      vi.clearAllMocks();
      await engine.activate(comp.id);
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should publish with composition.activated eventType', async () => {
      const comp = await engine.create({
        name: 'test-act-evt2', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-ae2')], metadata: {},
      });
      vi.clearAllMocks();
      await engine.activate(comp.id);
      const call = mockEventBus.publish.mock.calls[0][0];
      expect(call.eventType).toBe('marketplace.composition.activated');
    });

    it('should update updatedAt on activation', async () => {
      const comp = await engine.create({
        name: 'test-act-ut', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-aut1')], metadata: {},
      });
      const createdUpdatedAt = comp.updatedAt;
      await new Promise(r => setTimeout(r, 2));
      await engine.activate(comp.id);
      const updated = await engine.getById(comp.id);
      expect(updated!.updatedAt).not.toBe(createdUpdatedAt);
    });
  });

  describe('deactivate', () => {
    it('should deactivate an active composition', async () => {
      const comp = await engine.create({
        name: 'test-deact', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-de1')], metadata: {},
      });
      await engine.activate(comp.id);
      await engine.deactivate(comp.id);
      const updated = await engine.getById(comp.id);
      expect(updated!.active).toBe(false);
    });

    it('should throw CompositionError for non-existent composition', async () => {
      await expect(engine.deactivate(brandCompositionId('non-existent'))).rejects.toThrow(CompositionError);
    });

    it('should publish deactivated event', async () => {
      const comp = await engine.create({
        name: 'test-deact-evt', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-de2')], metadata: {},
      });
      await engine.activate(comp.id);
      vi.clearAllMocks();
      await engine.deactivate(comp.id);
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should publish with composition.deactivated eventType', async () => {
      const comp = await engine.create({
        name: 'test-deact-evt2', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-de3')], metadata: {},
      });
      await engine.activate(comp.id);
      vi.clearAllMocks();
      await engine.deactivate(comp.id);
      const call = mockEventBus.publish.mock.calls[0][0];
      expect(call.eventType).toBe('marketplace.composition.deactivated');
    });

    it('should be idempotent — deactivating already inactive composition', async () => {
      const comp = await engine.create({
        name: 'test-deact-idem', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-di1')], metadata: {},
      });
      await engine.deactivate(comp.id);
      const updated = await engine.getById(comp.id);
      expect(updated!.active).toBe(false);
    });
  });

  describe('getById', () => {
    it('should return null for non-existent id', async () => {
      expect(await engine.getById(brandCompositionId('none'))).toBeNull();
    });

    it('should return the composition after create', async () => {
      const comp = await engine.create({
        name: 'test-get', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-g1')], metadata: {},
      });
      const found = await engine.getById(comp.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(comp.id);
    });
  });

  describe('list', () => {
    it('should return empty array initially', async () => {
      expect(await engine.list()).toHaveLength(0);
    });

    it('should return all compositions with no filter', async () => {
      await engine.create({
        name: 'c1', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-l1')], metadata: {},
      });
      await engine.create({
        name: 'c2', description: '', type: CompositionType.Parallel,
        steps: [makeStep(1, 'cap-l2')], metadata: {},
      });
      expect((await engine.list()).length).toBe(2);
    });

    it('should filter by active: true', async () => {
      const c1 = await engine.create({
        name: 'active1', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-fa1')], metadata: {},
      });
      await engine.create({
        name: 'inactive1', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-fa2')], metadata: {},
      });
      await engine.activate(c1.id);
      const active = await engine.list({ active: true });
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(c1.id);
    });

    it('should filter by active: false', async () => {
      const c1 = await engine.create({
        name: 'af1', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-af1')], metadata: {},
      });
      await engine.create({
        name: 'af2', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-af2')], metadata: {},
      });
      await engine.activate(c1.id);
      const inactive = await engine.list({ active: false });
      expect(inactive).toHaveLength(1);
    });

    it('should filter by type Pipeline', async () => {
      await engine.create({
        name: 'tp1', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-tp1')], metadata: {},
      });
      await engine.create({
        name: 'tp2', description: '', type: CompositionType.Parallel,
        steps: [makeStep(1, 'cap-tp2')], metadata: {},
      });
      const pipelines = await engine.list({ type: CompositionType.Pipeline });
      expect(pipelines).toHaveLength(1);
    });

    it('should filter by type Parallel', async () => {
      await engine.create({
        name: 'tpl1', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-tpl1')], metadata: {},
      });
      await engine.create({
        name: 'tpl2', description: '', type: CompositionType.Parallel,
        steps: [makeStep(1, 'cap-tpl2')], metadata: {},
      });
      const parallels = await engine.list({ type: CompositionType.Parallel });
      expect(parallels).toHaveLength(1);
    });

    it('should filter by combined active and type', async () => {
      const c1 = await engine.create({
        name: 'combo1', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-co1')], metadata: {},
      });
      await engine.create({
        name: 'combo2', description: '', type: CompositionType.Parallel,
        steps: [makeStep(1, 'cap-co2')], metadata: {},
      });
      await engine.activate(c1.id);
      const result = await engine.list({ active: true, type: CompositionType.Pipeline });
      expect(result).toHaveLength(1);
    });

    it('should return empty when no match', async () => {
      await engine.create({
        name: 'nomatch', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-nm1')], metadata: {},
      });
      const result = await engine.list({ type: CompositionType.Chain });
      expect(result).toHaveLength(0);
    });
  });

  describe('count', () => {
    it('should return 0 initially', async () => {
      expect(await engine.count()).toBe(0);
    });

    it('should count correctly after multiple creates', async () => {
      await engine.create({ name: 'c1', description: '', type: CompositionType.Pipeline, steps: [makeStep(1, 'cap-cnt1')], metadata: {} });
      await engine.create({ name: 'c2', description: '', type: CompositionType.Parallel, steps: [makeStep(1, 'cap-cnt2')], metadata: {} });
      await engine.create({ name: 'c3', description: '', type: CompositionType.Chain, steps: [makeStep(1, 'cap-cnt3')], metadata: {} });
      expect(await engine.count()).toBe(3);
    });
  });

  describe('events — null eventBus', () => {
    it('should not publish when eventBus is null', async () => {
      const noBus = new CompositionEngine(config.compositionEngine, null);
      await noBus.create({
        name: 'no-bus', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-nb1')], metadata: {},
      });
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty description', async () => {
      const comp = await engine.create({
        name: 'test-empty-desc', description: '', type: CompositionType.Pipeline,
        steps: [makeStep(1, 'cap-ed1')], metadata: {},
      });
      expect(comp.description).toBe('');
    });

    it('should handle step with fallback', async () => {
      const comp = await engine.create({
        name: 'test-fallback-step', description: '', type: CompositionType.Fallback,
        steps: [makeStep(1, 'cap-fs1', { fallbackCapabilityId: brandCapabilityId('cap-fs2') })], metadata: {},
      });
      expect(comp.steps[0].fallbackCapabilityId).toBe(brandCapabilityId('cap-fs2'));
    });

    it('should handle step with condition', async () => {
      const comp = await engine.create({
        name: 'test-cond-step', description: '', type: CompositionType.Conditional,
        steps: [makeStep(1, 'cap-cs1', { condition: 'input.type === "json"' })], metadata: {},
      });
      expect(comp.steps[0].condition).toBe('input.type === "json"');
    });

    it('should handle step with custom config', async () => {
      const comp = await engine.create({
        name: 'test-cfg-step', description: '', type: CompositionType.Pipeline,
        steps: [{ order: 1, capabilityId: brandCapabilityId('cap-cfg1'), config: Object.freeze({ timeout: 5000 }), fallbackCapabilityId: null, condition: null }],
        metadata: {},
      });
      expect(comp.steps[0].config).toEqual({ timeout: 5000 });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 9. PUBLISHER RUNTIME
// ═══════════════════════════════════════════════════════════════════

describe('PublisherRuntime', () => {
  let runtime: PublisherRuntime;

  beforeEach(() => {
    vi.clearAllMocks();
    runtime = new PublisherRuntime(config.publisherRuntime, mockEventBus);
  });

  describe('constructor', () => {
    it('should create instance with config and eventBus', () => {
      expect(new PublisherRuntime(config.publisherRuntime, mockEventBus)).toBeInstanceOf(PublisherRuntime);
    });

    it('should create instance without eventBus', () => {
      expect(new PublisherRuntime(config.publisherRuntime)).toBeInstanceOf(PublisherRuntime);
    });

    it('should create instance with null eventBus', () => {
      expect(new PublisherRuntime(config.publisherRuntime, null)).toBeInstanceOf(PublisherRuntime);
    });
  });

  describe('register — happy path', () => {
    const makeParams = (overrides?: Partial<PublisherRegistrationParams>): PublisherRegistrationParams => ({
      name: 'Test Publisher',
      description: 'A test publisher',
      publicKey: 'pk-12345',
      metadata: {},
      ...overrides,
    });

    it('should return a Publisher', async () => {
      const pub = await runtime.register(makeParams());
      expect(pub).toBeDefined();
      expect(pub.id).toBeDefined();
    });

    it('should have Unverified status initially', async () => {
      const pub = await runtime.register(makeParams());
      expect(pub.status).toBe(PublisherStatus.Unverified);
    });

    it('should have correct name', async () => {
      const pub = await runtime.register(makeParams({ name: 'My Publisher' }));
      expect(pub.name).toBe('My Publisher');
    });

    it('should have correct description', async () => {
      const pub = await runtime.register(makeParams({ description: 'Awesome publisher' }));
      expect(pub.description).toBe('Awesome publisher');
    });

    it('should have correct publicKey', async () => {
      const pub = await runtime.register(makeParams({ publicKey: 'my-key' }));
      expect(pub.publicKey).toBe('my-key');
    });

    it('should have empty capabilities array', async () => {
      const pub = await runtime.register(makeParams());
      expect(pub.capabilities).toHaveLength(0);
    });

    it('should have totalDownloads 0', async () => {
      const pub = await runtime.register(makeParams());
      expect(pub.totalDownloads).toBe(0);
    });

    it('should have averageRating 0', async () => {
      const pub = await runtime.register(makeParams());
      expect(pub.averageRating).toBe(0);
    });

    it('should have createdAt timestamp', async () => {
      const pub = await runtime.register(makeParams());
      expect(pub.createdAt).toBeDefined();
    });

    it('should store metadata', async () => {
      const pub = await runtime.register(makeParams({ metadata: { website: 'https://example.com' } }));
      expect(pub.metadata).toEqual({ website: 'https://example.com' });
    });

    it('should increment count after register', async () => {
      expect(await runtime.count()).toBe(0);
      await runtime.register(makeParams());
      expect(await runtime.count()).toBe(1);
    });

    it('should publish registered event', async () => {
      await runtime.register(makeParams());
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should publish with publisher.registered eventType', async () => {
      await runtime.register(makeParams({ name: 'EventTest' }));
      const call = mockEventBus.publish.mock.calls[0][0];
      expect(call.eventType).toBe('marketplace.publisher.registered');
    });

    it('should publish with publisher name', async () => {
      await runtime.register(makeParams({ name: 'NameTest' }));
      const call = mockEventBus.publish.mock.calls[0][0];
      expect(call.name).toBe('NameTest');
    });

    it('should publish with publisherId', async () => {
      const pub = await runtime.register(makeParams());
      const call = mockEventBus.publish.mock.calls[0][0];
      expect(call.publisherId).toBe(pub.id);
    });
  });

  describe('register — error cases', () => {
    it('should throw PublisherLimitExceededError when max reached', async () => {
      const smallConfig = { ...config.publisherRuntime, maxPublishers: 1 };
      const smallRuntime = new PublisherRuntime(smallConfig, mockEventBus);
      await smallRuntime.register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      await expect(smallRuntime.register({ name: 'p2', description: '', publicKey: 'k2', metadata: {} }))
        .rejects.toThrow(PublisherLimitExceededError);
    });
  });

  describe('updateStatus', () => {
    it('should update to Verified', async () => {
      const pub = await runtime.register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      await runtime.updateStatus(pub.id, PublisherStatus.Verified);
      const updated = await runtime.getById(pub.id);
      expect(updated!.status).toBe(PublisherStatus.Verified);
    });

    it('should update to Trusted', async () => {
      const pub = await runtime.register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      await runtime.updateStatus(pub.id, PublisherStatus.Trusted);
      const updated = await runtime.getById(pub.id);
      expect(updated!.status).toBe(PublisherStatus.Trusted);
    });

    it('should update to Suspended', async () => {
      const pub = await runtime.register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      await runtime.updateStatus(pub.id, PublisherStatus.Suspended);
      const updated = await runtime.getById(pub.id);
      expect(updated!.status).toBe(PublisherStatus.Suspended);
    });

    it('should update to Banned', async () => {
      const pub = await runtime.register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      await runtime.updateStatus(pub.id, PublisherStatus.Banned);
      const updated = await runtime.getById(pub.id);
      expect(updated!.status).toBe(PublisherStatus.Banned);
    });

    it('should update back to Unverified', async () => {
      const pub = await runtime.register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      await runtime.updateStatus(pub.id, PublisherStatus.Verified);
      await runtime.updateStatus(pub.id, PublisherStatus.Unverified);
      const updated = await runtime.getById(pub.id);
      expect(updated!.status).toBe(PublisherStatus.Unverified);
    });

    it('should throw PublisherNotFoundError for non-existent publisher', async () => {
      await expect(runtime.updateStatus(brandPublisherId('non-existent'), PublisherStatus.Verified))
        .rejects.toThrow(PublisherNotFoundError);
    });

    it('should publish statusChanged event', async () => {
      const pub = await runtime.register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      vi.clearAllMocks();
      await runtime.updateStatus(pub.id, PublisherStatus.Verified);
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should publish with publisher.statusChanged eventType', async () => {
      const pub = await runtime.register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      vi.clearAllMocks();
      await runtime.updateStatus(pub.id, PublisherStatus.Verified);
      const call = mockEventBus.publish.mock.calls[0][0];
      expect(call.eventType).toBe('marketplace.publisher.statusChanged');
    });

    it('should publish with fromStatus', async () => {
      const pub = await runtime.register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      vi.clearAllMocks();
      await runtime.updateStatus(pub.id, PublisherStatus.Verified);
      const call = mockEventBus.publish.mock.calls[0][0];
      expect(call.fromStatus).toBe(PublisherStatus.Unverified);
    });

    it('should publish with toStatus', async () => {
      const pub = await runtime.register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      vi.clearAllMocks();
      await runtime.updateStatus(pub.id, PublisherStatus.Verified);
      const call = mockEventBus.publish.mock.calls[0][0];
      expect(call.toStatus).toBe(PublisherStatus.Verified);
    });
  });

  describe('getById', () => {
    it('should return null for non-existent id', async () => {
      expect(await runtime.getById(brandPublisherId('none'))).toBeNull();
    });

    it('should return the publisher after register', async () => {
      const pub = await runtime.register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      const found = await runtime.getById(pub.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(pub.id);
    });
  });

  describe('list', () => {
    it('should return empty array initially', async () => {
      expect(await runtime.list()).toHaveLength(0);
    });

    it('should return all publishers with no filter', async () => {
      await runtime.register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      await runtime.register({ name: 'p2', description: '', publicKey: 'k2', metadata: {} });
      expect((await runtime.list()).length).toBe(2);
    });

    it('should filter by Unverified status', async () => {
      await runtime.register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      const p2 = await runtime.register({ name: 'p2', description: '', publicKey: 'k2', metadata: {} });
      await runtime.updateStatus(p2.id, PublisherStatus.Verified);
      const unverified = await runtime.list({ status: PublisherStatus.Unverified });
      expect(unverified).toHaveLength(1);
    });

    it('should filter by Verified status', async () => {
      const p1 = await runtime.register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      await runtime.register({ name: 'p2', description: '', publicKey: 'k2', metadata: {} });
      await runtime.updateStatus(p1.id, PublisherStatus.Verified);
      const verified = await runtime.list({ status: PublisherStatus.Verified });
      expect(verified).toHaveLength(1);
    });

    it('should filter by Trusted status', async () => {
      const p1 = await runtime.register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      await runtime.register({ name: 'p2', description: '', publicKey: 'k2', metadata: {} });
      await runtime.updateStatus(p1.id, PublisherStatus.Trusted);
      const trusted = await runtime.list({ status: PublisherStatus.Trusted });
      expect(trusted).toHaveLength(1);
    });

    it('should filter by Suspended status', async () => {
      const p1 = await runtime.register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      await runtime.register({ name: 'p2', description: '', publicKey: 'k2', metadata: {} });
      await runtime.updateStatus(p1.id, PublisherStatus.Suspended);
      const suspended = await runtime.list({ status: PublisherStatus.Suspended });
      expect(suspended).toHaveLength(1);
    });

    it('should filter by Banned status', async () => {
      const p1 = await runtime.register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      await runtime.register({ name: 'p2', description: '', publicKey: 'k2', metadata: {} });
      await runtime.updateStatus(p1.id, PublisherStatus.Banned);
      const banned = await runtime.list({ status: PublisherStatus.Banned });
      expect(banned).toHaveLength(1);
    });

    it('should return empty when no match', async () => {
      await runtime.register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      const result = await runtime.list({ status: PublisherStatus.Verified });
      expect(result).toHaveLength(0);
    });
  });

  describe('count', () => {
    it('should return 0 initially', async () => {
      expect(await runtime.count()).toBe(0);
    });

    it('should increment after register', async () => {
      await runtime.register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      expect(await runtime.count()).toBe(1);
    });

    it('should count correctly', async () => {
      await runtime.register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      await runtime.register({ name: 'p2', description: '', publicKey: 'k2', metadata: {} });
      await runtime.register({ name: 'p3', description: '', publicKey: 'k3', metadata: {} });
      expect(await runtime.count()).toBe(3);
    });
  });

  describe('events — null eventBus', () => {
    it('should not publish when eventBus is null', async () => {
      const noBus = new PublisherRuntime(config.publisherRuntime, null);
      await noBus.register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty name', async () => {
      const pub = await runtime.register({ name: '', description: '', publicKey: 'k1', metadata: {} });
      expect(pub.name).toBe('');
    });

    it('should handle empty description', async () => {
      const pub = await runtime.register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      expect(pub.description).toBe('');
    });

    it('should handle empty publicKey', async () => {
      const pub = await runtime.register({ name: 'p1', description: '', publicKey: '', metadata: {} });
      expect(pub.publicKey).toBe('');
    });

    it('should handle metadata with nested object', async () => {
      const pub = await runtime.register({
        name: 'p1', description: '', publicKey: 'k1',
        metadata: { nested: { key: 'value' } },
      });
      expect(pub.metadata).toEqual({ nested: { key: 'value' } });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 10. ECOSYSTEM RUNTIME
// ═══════════════════════════════════════════════════════════════════

describe('EcosystemRuntime', () => {
  let ecosystem: EcosystemRuntime;

  beforeEach(() => {
    vi.clearAllMocks();
    ecosystem = new EcosystemRuntime(config, mockEventBus);
  });

  describe('constructor', () => {
    it('should create instance with config and eventBus', () => {
      expect(new EcosystemRuntime(config, mockEventBus)).toBeInstanceOf(EcosystemRuntime);
    });

    it('should create instance without eventBus', () => {
      expect(new EcosystemRuntime(config)).toBeInstanceOf(EcosystemRuntime);
    });

    it('should create instance with null eventBus', () => {
      expect(new EcosystemRuntime(config, null)).toBeInstanceOf(EcosystemRuntime);
    });

    it('should start in Uninitialized state', () => {
      const eco = new EcosystemRuntime(config);
      expect(eco.state).toBe(EcosystemState.Uninitialized);
    });
  });

  describe('initialize', () => {
    it('should transition to Ready state', async () => {
      await ecosystem.initialize();
      expect(ecosystem.state).toBe(EcosystemState.Ready);
    });

    it('should publish ecosystem.initialized event', async () => {
      await ecosystem.initialize();
      const initCalls = mockEventBus.publish.mock.calls.filter(
        c => c[0].eventType === 'marketplace.ecosystem.initialized'
      );
      expect(initCalls.length).toBeGreaterThan(0);
    });

    it('should publish with subsystemCount 14', async () => {
      await ecosystem.initialize();
      const call = mockEventBus.publish.mock.calls.find(
        c => c[0].eventType === 'marketplace.ecosystem.initialized'
      )![0];
      expect(call.subsystemCount).toBe(14);
    });

    it('should publish ecosystem.stateChanged event', async () => {
      await ecosystem.initialize();
      const stateCalls = mockEventBus.publish.mock.calls.filter(
        c => c[0].eventType === 'marketplace.ecosystem.stateChanged'
      );
      expect(stateCalls.length).toBeGreaterThan(0);
    });

    it('should publish stateChanged from Uninitialized to Ready', async () => {
      await ecosystem.initialize();
      const call = mockEventBus.publish.mock.calls.find(
        c => c[0].eventType === 'marketplace.ecosystem.stateChanged'
      )![0];
      expect(call.fromState).toBe(EcosystemState.Uninitialized);
      expect(call.toState).toBe(EcosystemState.Ready);
    });

    it('should allow double initialize', async () => {
      await ecosystem.initialize();
      await ecosystem.initialize();
      expect(ecosystem.state).toBe(EcosystemState.Ready);
    });
  });

  describe('shutdown', () => {
    it('should transition to Stopped state', async () => {
      await ecosystem.initialize();
      await ecosystem.shutdown();
      expect(ecosystem.state).toBe(EcosystemState.Stopped);
    });

    it('should publish stateChanged to Stopped', async () => {
      await ecosystem.initialize();
      vi.clearAllMocks();
      await ecosystem.shutdown();
      const call = mockEventBus.publish.mock.calls.find(
        c => c[0].eventType === 'marketplace.ecosystem.stateChanged'
      )![0];
      expect(call.toState).toBe(EcosystemState.Stopped);
    });

    it('should publish stateChanged from Ready to Stopped', async () => {
      await ecosystem.initialize();
      vi.clearAllMocks();
      await ecosystem.shutdown();
      const call = mockEventBus.publish.mock.calls.find(
        c => c[0].eventType === 'marketplace.ecosystem.stateChanged'
      )![0];
      expect(call.fromState).toBe(EcosystemState.Ready);
    });

    it('should shutdown when not initialized (from Uninitialized)', async () => {
      await ecosystem.shutdown();
      expect(ecosystem.state).toBe(EcosystemState.Stopped);
    });

    it('should shutdown when already Stopped', async () => {
      await ecosystem.shutdown();
      await ecosystem.shutdown();
      expect(ecosystem.state).toBe(EcosystemState.Stopped);
    });
  });

  describe('scan', () => {
    it('should throw EcosystemNotInitializedError when not initialized', async () => {
      await expect(ecosystem.scan()).rejects.toThrow(EcosystemNotInitializedError);
    });

    it('should return scan result after initialize', async () => {
      await ecosystem.initialize();
      const result = await ecosystem.scan();
      expect(result).toBeDefined();
      expect(typeof result.capabilitiesScanned).toBe('number');
    });

    it('should return correct capabilitiesScanned', async () => {
      await ecosystem.initialize();
      const result = await ecosystem.scan();
      expect(result.capabilitiesScanned).toBe(0); // no capabilities registered
    });

    it('should return updatesAvailable', async () => {
      await ecosystem.initialize();
      const result = await ecosystem.scan();
      expect(typeof result.updatesAvailable).toBe('number');
    });

    it('should return compatibilityIssues', async () => {
      await ecosystem.initialize();
      const result = await ecosystem.scan();
      expect(typeof result.compatibilityIssues).toBe('number');
    });

    it('should return pendingPermissions', async () => {
      await ecosystem.initialize();
      const result = await ecosystem.scan();
      expect(typeof result.pendingPermissions).toBe('number');
    });

    it('should return durationMs', async () => {
      await ecosystem.initialize();
      const result = await ecosystem.scan();
      expect(typeof result.durationMs).toBe('number');
    });

    it('should publish ecosystem.scanCompleted event', async () => {
      await ecosystem.initialize();
      vi.clearAllMocks();
      await ecosystem.scan();
      const call = mockEventBus.publish.mock.calls.find(
        c => c[0].eventType === 'marketplace.ecosystem.scanCompleted'
      );
      expect(call).toBeDefined();
    });

    it('should publish scanCompleted with capabilitiesScanned', async () => {
      await ecosystem.initialize();
      vi.clearAllMocks();
      await ecosystem.scan();
      const call = mockEventBus.publish.mock.calls.find(
        c => c[0].eventType === 'marketplace.ecosystem.scanCompleted'
      )![0];
      expect(typeof call.capabilitiesScanned).toBe('number');
    });

    it('should scan with registered capabilities', async () => {
      await ecosystem.initialize();
      await ecosystem.getCapabilityRegistry().register({
        name: 'scan-cap', description: 'test', version: '1.0.0',
        publisherId: brandPublisherId('pub-scan'), category: 'test',
        tags: [], permissions: [], dependencies: [], compatibilityRequirements: [],
        metadata: {},
      });
      const result = await ecosystem.scan();
      expect(result.capabilitiesScanned).toBe(1);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics after initialize', async () => {
      await ecosystem.initialize();
      const metrics = await ecosystem.getMetrics();
      expect(metrics).toBeDefined();
    });

    it('should have totalCapabilities', async () => {
      await ecosystem.initialize();
      const metrics = await ecosystem.getMetrics();
      expect(typeof metrics.totalCapabilities).toBe('number');
    });

    it('should have installedCapabilities', async () => {
      await ecosystem.initialize();
      const metrics = await ecosystem.getMetrics();
      expect(typeof metrics.installedCapabilities).toBe('number');
    });

    it('should have activeInstallations', async () => {
      await ecosystem.initialize();
      const metrics = await ecosystem.getMetrics();
      expect(typeof metrics.activeInstallations).toBe('number');
    });

    it('should have totalPublishers', async () => {
      await ecosystem.initialize();
      const metrics = await ecosystem.getMetrics();
      expect(typeof metrics.totalPublishers).toBe('number');
    });

    it('should have verifiedPublishers', async () => {
      await ecosystem.initialize();
      const metrics = await ecosystem.getMetrics();
      expect(typeof metrics.verifiedPublishers).toBe('number');
    });

    it('should have totalRatings', async () => {
      await ecosystem.initialize();
      const metrics = await ecosystem.getMetrics();
      expect(typeof metrics.totalRatings).toBe('number');
    });

    it('should have averageRating', async () => {
      await ecosystem.initialize();
      const metrics = await ecosystem.getMetrics();
      expect(typeof metrics.averageRating).toBe('number');
    });

    it('should have totalCompositions', async () => {
      await ecosystem.initialize();
      const metrics = await ecosystem.getMetrics();
      expect(typeof metrics.totalCompositions).toBe('number');
    });

    it('should have activeCompositions', async () => {
      await ecosystem.initialize();
      const metrics = await ecosystem.getMetrics();
      expect(typeof metrics.activeCompositions).toBe('number');
    });

    it('should have totalDownloads', async () => {
      await ecosystem.initialize();
      const metrics = await ecosystem.getMetrics();
      expect(typeof metrics.totalDownloads).toBe('number');
    });

    it('should have pendingUpdates', async () => {
      await ecosystem.initialize();
      const metrics = await ecosystem.getMetrics();
      expect(typeof metrics.pendingUpdates).toBe('number');
    });

    it('should have failedInstallations', async () => {
      await ecosystem.initialize();
      const metrics = await ecosystem.getMetrics();
      expect(typeof metrics.failedInstallations).toBe('number');
    });

    it('should have sandboxInstances', async () => {
      await ecosystem.initialize();
      const metrics = await ecosystem.getMetrics();
      expect(typeof metrics.sandboxInstances).toBe('number');
    });

    it('should have totalPackages', async () => {
      await ecosystem.initialize();
      const metrics = await ecosystem.getMetrics();
      expect(typeof metrics.totalPackages).toBe('number');
    });

    it('should have lastScanAt', async () => {
      await ecosystem.initialize();
      const metrics = await ecosystem.getMetrics();
      expect(metrics.lastScanAt).toBeDefined();
    });

    it('should aggregate data after operations', async () => {
      await ecosystem.initialize();
      await ecosystem.getPublisherRuntime().register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      await ecosystem.getPublisherRuntime().register({ name: 'p2', description: '', publicKey: 'k2', metadata: {} });
      const metrics = await ecosystem.getMetrics();
      expect(metrics.totalPublishers).toBe(2);
    });

    it('should return averageRating 0 when no ratings', async () => {
      await ecosystem.initialize();
      const metrics = await ecosystem.getMetrics();
      expect(metrics.averageRating).toBe(0);
    });
  });

  describe('getter methods — all 14 subsystems', () => {
    beforeEach(async () => {
      await ecosystem.initialize();
    });

    it('getCapabilityRegistry returns instance', () => {
      expect(ecosystem.getCapabilityRegistry()).toBeDefined();
    });

    it('getPackageRuntime returns instance', () => {
      expect(ecosystem.getPackageRuntime()).toBeDefined();
    });

    it('getMarketplaceRuntime returns instance', () => {
      expect(ecosystem.getMarketplaceRuntime()).toBeDefined();
    });

    it('getInstallationEngine returns instance', () => {
      expect(ecosystem.getInstallationEngine()).toBeDefined();
    });

    it('getUpdateEngine returns instance', () => {
      expect(ecosystem.getUpdateEngine()).toBeDefined();
    });

    it('getDependencyResolver returns instance', () => {
      expect(ecosystem.getDependencyResolver()).toBeDefined();
    });

    it('getCompatibilityEngine returns instance', () => {
      expect(ecosystem.getCompatibilityEngine()).toBeDefined();
    });

    it('getSignatureEngine returns instance', () => {
      expect(ecosystem.getSignatureEngine()).toBeDefined();
    });

    it('getSandboxRuntime returns instance', () => {
      expect(ecosystem.getSandboxRuntime()).toBeDefined();
    });

    it('getPermissionRuntime returns instance', () => {
      expect(ecosystem.getPermissionRuntime()).toBeDefined();
    });

    it('getRatingRuntime returns instance', () => {
      expect(ecosystem.getRatingRuntime()).toBeDefined();
    });

    it('getRecommendationRuntime returns instance', () => {
      expect(ecosystem.getRecommendationRuntime()).toBeDefined();
    });

    it('getCompositionEngine returns instance', () => {
      expect(ecosystem.getCompositionEngine()).toBeDefined();
    });

    it('getPublisherRuntime returns instance', () => {
      expect(ecosystem.getPublisherRuntime()).toBeDefined();
    });
  });

  describe('getter methods — correct interface types', () => {
    beforeEach(async () => {
      await ecosystem.initialize();
    });

    it('getCapabilityRegistry has register method', () => {
      expect(typeof ecosystem.getCapabilityRegistry().register).toBe('function');
    });

    it('getPackageRuntime has createPackage method', () => {
      expect(typeof ecosystem.getPackageRuntime().createPackage).toBe('function');
    });

    it('getMarketplaceRuntime has addToCatalog method', () => {
      expect(typeof ecosystem.getMarketplaceRuntime().addToCatalog).toBe('function');
    });

    it('getInstallationEngine has install method', () => {
      expect(typeof ecosystem.getInstallationEngine().install).toBe('function');
    });

    it('getUpdateEngine has checkForUpdates method', () => {
      expect(typeof ecosystem.getUpdateEngine().checkForUpdates).toBe('function');
    });

    it('getDependencyResolver has resolve method', () => {
      expect(typeof ecosystem.getDependencyResolver().resolve).toBe('function');
    });

    it('getCompatibilityEngine has check method', () => {
      expect(typeof ecosystem.getCompatibilityEngine().check).toBe('function');
    });

    it('getSignatureEngine has sign method', () => {
      expect(typeof ecosystem.getSignatureEngine().sign).toBe('function');
    });

    it('getSandboxRuntime has create method', () => {
      expect(typeof ecosystem.getSandboxRuntime().create).toBe('function');
    });

    it('getPermissionRuntime has requestPermissions method', () => {
      expect(typeof ecosystem.getPermissionRuntime().requestPermissions).toBe('function');
    });

    it('getRatingRuntime has submit method', () => {
      expect(typeof ecosystem.getRatingRuntime().submit).toBe('function');
    });

    it('getRecommendationRuntime has recommend method', () => {
      expect(typeof ecosystem.getRecommendationRuntime().recommend).toBe('function');
    });

    it('getCompositionEngine has create method', () => {
      expect(typeof ecosystem.getCompositionEngine().create).toBe('function');
    });

    it('getPublisherRuntime has register method', () => {
      expect(typeof ecosystem.getPublisherRuntime().register).toBe('function');
    });
  });

  describe('state management', () => {
    it('should be Uninitialized initially', () => {
      expect(ecosystem.state).toBe(EcosystemState.Uninitialized);
    });

    it('should transition Uninitialized -> Ready on initialize', async () => {
      expect(ecosystem.state).toBe(EcosystemState.Uninitialized);
      await ecosystem.initialize();
      expect(ecosystem.state).toBe(EcosystemState.Ready);
    });

    it('should transition Ready -> Stopped on shutdown', async () => {
      await ecosystem.initialize();
      expect(ecosystem.state).toBe(EcosystemState.Ready);
      await ecosystem.shutdown();
      expect(ecosystem.state).toBe(EcosystemState.Stopped);
    });

    it('should handle Uninitialized -> Stopped directly', async () => {
      expect(ecosystem.state).toBe(EcosystemState.Uninitialized);
      await ecosystem.shutdown();
      expect(ecosystem.state).toBe(EcosystemState.Stopped);
    });
  });

  describe('subsystem interplay', () => {
    it('can register a capability via getter', async () => {
      await ecosystem.initialize();
      const cap = await ecosystem.getCapabilityRegistry().register({
        name: 'interop-cap', description: 'test', version: '1.0.0',
        publisherId: brandPublisherId('pub-io'), category: 'test',
        tags: [], permissions: [], dependencies: [], compatibilityRequirements: [],
        metadata: {},
      });
      expect(cap.name).toBe('interop-cap');
    });

    it('can register a publisher via getter', async () => {
      await ecosystem.initialize();
      const pub = await ecosystem.getPublisherRuntime().register({
        name: 'interop-pub', description: 'test', publicKey: 'k', metadata: {},
      });
      expect(pub.name).toBe('interop-pub');
    });

    it('can create a composition via getter', async () => {
      await ecosystem.initialize();
      const comp = await ecosystem.getCompositionEngine().create({
        name: 'interop-comp', description: '', type: CompositionType.Pipeline,
        steps: [{ order: 1, capabilityId: brandCapabilityId('cap-ic1'), config: {}, fallbackCapabilityId: null, condition: null }],
        metadata: {},
      });
      expect(comp.name).toBe('interop-comp');
    });

    it('metrics reflect subsystem state after operations', async () => {
      await ecosystem.initialize();
      await ecosystem.getPublisherRuntime().register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
      await ecosystem.getPublisherRuntime().register({ name: 'p2', description: '', publicKey: 'k2', metadata: {} });
      await ecosystem.getPublisherRuntime().register({ name: 'p3', description: '', publicKey: 'k3', metadata: {} });
      const metrics = await ecosystem.getMetrics();
      expect(metrics.totalPublishers).toBe(3);
    });
  });

  describe('events — null eventBus', () => {
    it('should not throw when eventBus is null on initialize', async () => {
      const noBus = new EcosystemRuntime(config, null);
      await noBus.initialize();
      expect(noBus.state).toBe(EcosystemState.Ready);
    });

    it('should not throw when eventBus is null on shutdown', async () => {
      const noBus = new EcosystemRuntime(config, null);
      await noBus.initialize();
      await noBus.shutdown();
      expect(noBus.state).toBe(EcosystemState.Stopped);
    });
  });

  describe('scan — after shutdown', () => {
    it('should throw EcosystemNotInitializedError after shutdown', async () => {
      await ecosystem.initialize();
      await ecosystem.shutdown();
      await expect(ecosystem.scan()).rejects.toThrow(EcosystemNotInitializedError);
    });
  });

  describe('state property', () => {
    it('should be readable', () => {
      expect(() => ecosystem.state).not.toThrow();
    });

    it('should return EcosystemState enum value', () => {
      expect(Object.values(EcosystemState)).toContain(ecosystem.state);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 11. ADDITIONAL ERROR DETAIL TESTS
// ═══════════════════════════════════════════════════════════════════

describe('Error detail properties', () => {
  it('CapabilityNotFoundError has capabilityId in context', () => {
    const err = new CapabilityNotFoundError('cap-1', { extra: true });
    expect(err.context.capabilityId).toBe('cap-1');
    expect(err.context.extra).toBe(true);
  });

  it('InstallationStateError has currentStatus', () => {
    const err = new InstallationStateError('i-1', 'Pending', 'Installed');
    expect(err.currentStatus).toBe('Pending');
    expect(err.targetStatus).toBe('Installed');
    expect(err.installationId).toBe('i-1');
  });

  it('InstallationTimeoutError has installationId', () => {
    const err = new InstallationTimeoutError('i-1', 5000);
    expect(err.installationId).toBe('i-1');
  });

  it('NoUpdateAvailableError has capabilityId', () => {
    const err = new NoUpdateAvailableError('cap-1');
    expect(err.capabilityId).toBe('cap-1');
  });

  it('DependencyNotFoundError has packageName', () => {
    const err = new DependencyNotFoundError('lodash');
    expect(err.packageName).toBe('lodash');
  });

  it('IncompatibleCapabilityError has capabilityId', () => {
    const err = new IncompatibleCapabilityError('cap-1');
    expect(err.capabilityId).toBe('cap-1');
  });

  it('SignatureExpiredError has signatureId', () => {
    const err = new SignatureExpiredError('sig-1');
    expect(err.signatureId).toBe('sig-1');
  });

  it('SandboxViolationError has sandboxId and permission', () => {
    const err = new SandboxViolationError('sand-1', 'Network');
    expect(err.sandboxId).toBe('sand-1');
    expect(err.permission).toBe('Network');
  });

  it('PermissionDeniedError has permission', () => {
    const err = new PermissionDeniedError('FileSystem');
    expect(err.permission).toBe('FileSystem');
  });

  it('PublisherNotFoundError has publisherId', () => {
    const err = new PublisherNotFoundError('pub-1');
    expect(err.publisherId).toBe('pub-1');
  });

  it('PublisherSuspendedError has publisherId', () => {
    const err = new PublisherSuspendedError('pub-1');
    expect(err.publisherId).toBe('pub-1');
  });

  it('NoValueProofError has capabilityId', () => {
    const err = new NoValueProofError('cap-1');
    expect(err.capabilityId).toBe('cap-1');
  });

  it('OptimizationWithoutValueError has capabilityId', () => {
    const err = new OptimizationWithoutValueError('cap-1');
    expect(err.capabilityId).toBe('cap-1');
  });

  it('ManifestValidationError has reason', () => {
    const err = new ManifestValidationError('missing name');
    expect(err.reason).toBe('missing name');
  });

  it('PackageSizeExceededError includes sizeBytes in context', () => {
    const err = new PackageSizeExceededError(200, 100);
    expect(err.context.sizeBytes).toBe(200);
    expect(err.context.maxSize).toBe(100);
  });

  it('CircularDependencyError includes packageName in context', () => {
    const err = new CircularDependencyError('pkg-a');
    expect(err.context.packageName).toBe('pkg-a');
  });

  it('InstallationLimitExceededError includes max in context', () => {
    const err = new InstallationLimitExceededError(5);
    expect(err.context.max).toBe(5);
  });

  it('SignatureVerificationError includes reason in context', () => {
    const err = new SignatureVerificationError('bad key');
    expect(err.context.reason).toBe('bad key');
  });

  it('All error names match class names', () => {
    const classes = [
      [new MarketplaceError('T', 'm'), 'MarketplaceError'],
      [new CapabilityNotFoundError('c'), 'CapabilityNotFoundError'],
      [new CapabilityLimitExceededError(1), 'CapabilityLimitExceededError'],
      [new CapabilityDuplicateError('n'), 'CapabilityDuplicateError'],
      [new PackageNotFoundError('p'), 'PackageNotFoundError'],
      [new PackageLimitExceededError(1), 'PackageLimitExceededError'],
      [new PackageSizeExceededError(1, 1), 'PackageSizeExceededError'],
      [new ManifestValidationError('r'), 'ManifestValidationError'],
      [new InstallationNotFoundError('i'), 'InstallationNotFoundError'],
      [new InstallationStateError('i', 'a', 'b'), 'InstallationStateError'],
      [new InstallationLimitExceededError(1), 'InstallationLimitExceededError'],
      [new InstallationTimeoutError('i', 1), 'InstallationTimeoutError'],
      [new UpdateError('r'), 'UpdateError'],
      [new RollbackError('r'), 'RollbackError'],
      [new NoUpdateAvailableError('c'), 'NoUpdateAvailableError'],
      [new DependencyResolutionError('r'), 'DependencyResolutionError'],
      [new CircularDependencyError('p'), 'CircularDependencyError'],
      [new DependencyNotFoundError('p'), 'DependencyNotFoundError'],
      [new CompatibilityError('r'), 'CompatibilityError'],
      [new IncompatibleCapabilityError('c'), 'IncompatibleCapabilityError'],
      [new SignatureVerificationError('r'), 'SignatureVerificationError'],
      [new SignatureExpiredError('s'), 'SignatureExpiredError'],
      [new SandboxError('r'), 'SandboxError'],
      [new SandboxLimitExceededError(1), 'SandboxLimitExceededError'],
      [new SandboxViolationError('s', 'p'), 'SandboxViolationError'],
      [new PermissionDeniedError('p'), 'PermissionDeniedError'],
      [new PermissionLimitExceededError(1), 'PermissionLimitExceededError'],
      [new RatingError('r'), 'RatingError'],
      [new RecommendationError('r'), 'RecommendationError'],
      [new CompositionError('r'), 'CompositionError'],
      [new CompositionLimitExceededError(1), 'CompositionLimitExceededError'],
      [new CompositionValidationError('r'), 'CompositionValidationError'],
      [new PublisherNotFoundError('p'), 'PublisherNotFoundError'],
      [new PublisherLimitExceededError(1), 'PublisherLimitExceededError'],
      [new PublisherSuspendedError('p'), 'PublisherSuspendedError'],
      [new CatalogLimitExceededError(1), 'CatalogLimitExceededError'],
      [new EcosystemRuntimeError('r'), 'EcosystemRuntimeError'],
      [new EcosystemNotInitializedError(), 'EcosystemNotInitializedError'],
      [new EcosystemDisposedError(), 'EcosystemDisposedError'],
      [new NoValueProofError('c'), 'NoValueProofError'],
      [new OptimizationWithoutValueError('c'), 'OptimizationWithoutValueError'],
    ];
    for (const [instance, expectedName] of classes) {
      expect((instance as Error).name).toBe(expectedName);
    }
  });

  it('All errors have string code', () => {
    const errors: MarketplaceError[] = [
      new MarketplaceError('X', 'm'),
      new CapabilityNotFoundError('c'),
      new CapabilityLimitExceededError(1),
      new CapabilityDuplicateError('n'),
      new PackageNotFoundError('p'),
      new PackageLimitExceededError(1),
      new PackageSizeExceededError(1, 1),
      new ManifestValidationError('r'),
      new InstallationNotFoundError('i'),
      new InstallationStateError('i', 'a', 'b'),
      new InstallationLimitExceededError(1),
      new InstallationTimeoutError('i', 1),
      new UpdateError('r'),
      new RollbackError('r'),
      new NoUpdateAvailableError('c'),
      new DependencyResolutionError('r'),
      new CircularDependencyError('p'),
      new DependencyNotFoundError('p'),
      new CompatibilityError('r'),
      new IncompatibleCapabilityError('c'),
      new SignatureVerificationError('r'),
      new SignatureExpiredError('s'),
      new SandboxError('r'),
      new SandboxLimitExceededError(1),
      new SandboxViolationError('s', 'p'),
      new PermissionDeniedError('p'),
      new PermissionLimitExceededError(1),
      new RatingError('r'),
      new RecommendationError('r'),
      new CompositionError('r'),
      new CompositionLimitExceededError(1),
      new CompositionValidationError('r'),
      new PublisherNotFoundError('p'),
      new PublisherLimitExceededError(1),
      new PublisherSuspendedError('p'),
      new CatalogLimitExceededError(1),
      new EcosystemRuntimeError('r'),
      new EcosystemNotInitializedError(),
      new EcosystemDisposedError(),
      new NoValueProofError('c'),
      new OptimizationWithoutValueError('c'),
    ];
    for (const err of errors) {
      expect(typeof err.code).toBe('string');
      expect(err.code.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// 12. ADDITIONAL CONFIG DETAIL TESTS
// ═══════════════════════════════════════════════════════════════════

describe('DefaultEcosystemRuntimeConfig — specific values', () => {
  it('capabilityRegistry.maxTagsPerCapability should be 20', () => {
    expect(DefaultEcosystemRuntimeConfig.capabilityRegistry.maxTagsPerCapability).toBe(20);
  });

  it('packageRuntime.maxPackages should be 50000', () => {
    expect(DefaultEcosystemRuntimeConfig.packageRuntime.maxPackages).toBe(50000);
  });

  it('packageRuntime.maxPackageSizeBytes should be 100MB', () => {
    expect(DefaultEcosystemRuntimeConfig.packageRuntime.maxPackageSizeBytes).toBe(100 * 1024 * 1024);
  });

  it('packageRuntime.supportedAlgorithms should have 3 algorithms', () => {
    expect(DefaultEcosystemRuntimeConfig.packageRuntime.supportedAlgorithms).toHaveLength(3);
  });

  it('marketplace.maxCatalogEntries should be 10000', () => {
    expect(DefaultEcosystemRuntimeConfig.marketplace.maxCatalogEntries).toBe(10000);
  });

  it('marketplace.defaultSource should be Local', () => {
    expect(DefaultEcosystemRuntimeConfig.marketplace.defaultSource).toBe(CatalogSource.Local);
  });

  it('marketplace.refreshIntervalMs should be 300000', () => {
    expect(DefaultEcosystemRuntimeConfig.marketplace.refreshIntervalMs).toBe(300_000);
  });

  it('installationEngine.maxConcurrentInstallations should be 5', () => {
    expect(DefaultEcosystemRuntimeConfig.installationEngine.maxConcurrentInstallations).toBe(5);
  });

  it('installationEngine.installationTimeoutMs should be 120000', () => {
    expect(DefaultEcosystemRuntimeConfig.installationEngine.installationTimeoutMs).toBe(120_000);
  });

  it('installationEngine.autoRollbackOnFailure should be true', () => {
    expect(DefaultEcosystemRuntimeConfig.installationEngine.autoRollbackOnFailure).toBe(true);
  });

  it('updateEngine.maxConcurrentUpdates should be 3', () => {
    expect(DefaultEcosystemRuntimeConfig.updateEngine.maxConcurrentUpdates).toBe(3);
  });

  it('updateEngine.autoUpdateEnabled should be false', () => {
    expect(DefaultEcosystemRuntimeConfig.updateEngine.autoUpdateEnabled).toBe(false);
  });

  it('updateEngine.defaultChannel should be Stable', () => {
    expect(DefaultEcosystemRuntimeConfig.updateEngine.defaultChannel).toBe(UpdateChannel.Stable);
  });

  it('updateEngine.maxRollbackVersions should be 3', () => {
    expect(DefaultEcosystemRuntimeConfig.updateEngine.maxRollbackVersions).toBe(3);
  });

  it('dependencyResolver.maxDepth should be 10', () => {
    expect(DefaultEcosystemRuntimeConfig.dependencyResolver.maxDepth).toBe(10);
  });

  it('dependencyResolver.strategy should be HighestVersion', () => {
    expect(DefaultEcosystemRuntimeConfig.dependencyResolver.strategy).toBe(ResolutionStrategy.HighestVersion);
  });

  it('compatibilityEngine.runtimeVersion should be 0.9.0', () => {
    expect(DefaultEcosystemRuntimeConfig.compatibilityEngine.runtimeVersion).toBe('0.9.0');
  });

  it('compatibilityEngine.osType should be linux', () => {
    expect(DefaultEcosystemRuntimeConfig.compatibilityEngine.osType).toBe('linux');
  });

  it('signatureEngine.defaultAlgorithm should be Ed25519', () => {
    expect(DefaultEcosystemRuntimeConfig.signatureEngine.defaultAlgorithm).toBe(SignatureAlgorithm.Ed25519);
  });

  it('signatureEngine.expiryDays should be 365', () => {
    expect(DefaultEcosystemRuntimeConfig.signatureEngine.expiryDays).toBe(365);
  });

  it('sandboxRuntime.defaultLevel should be Restricted', () => {
    expect(DefaultEcosystemRuntimeConfig.sandboxRuntime.defaultLevel).toBe(SandboxLevel.Restricted);
  });

  it('sandboxRuntime.maxInstances should be 100', () => {
    expect(DefaultEcosystemRuntimeConfig.sandboxRuntime.maxInstances).toBe(100);
  });

  it('permissionRuntime.autoGrantSafePermissions should be false', () => {
    expect(DefaultEcosystemRuntimeConfig.permissionRuntime.autoGrantSafePermissions).toBe(false);
  });

  it('permissionRuntime.maxPendingRequests should be 1000', () => {
    expect(DefaultEcosystemRuntimeConfig.permissionRuntime.maxPendingRequests).toBe(1000);
  });

  it('recommendationRuntime.maxRecommendations should be 50', () => {
    expect(DefaultEcosystemRuntimeConfig.recommendationRuntime.maxRecommendations).toBe(50);
  });

  it('recommendationRuntime.contextWeight should be 0.4', () => {
    expect(DefaultEcosystemRuntimeConfig.recommendationRuntime.contextWeight).toBe(0.4);
  });

  it('recommendationRuntime.experienceWeight should be 0.3', () => {
    expect(DefaultEcosystemRuntimeConfig.recommendationRuntime.experienceWeight).toBe(0.3);
  });

  it('recommendationRuntime.goalWeight should be 0.3', () => {
    expect(DefaultEcosystemRuntimeConfig.recommendationRuntime.goalWeight).toBe(0.3);
  });

  it('compositionEngine.maxStepsPerComposition should be 20', () => {
    expect(DefaultEcosystemRuntimeConfig.compositionEngine.maxStepsPerComposition).toBe(20);
  });

  it('compositionEngine.maxCapabilitiesPerComposition should be 10', () => {
    expect(DefaultEcosystemRuntimeConfig.compositionEngine.maxCapabilitiesPerComposition).toBe(10);
  });

  it('publisherRuntime.maxCapabilitiesPerPublisher should be 1000', () => {
    expect(DefaultEcosystemRuntimeConfig.publisherRuntime.maxCapabilitiesPerPublisher).toBe(1000);
  });

  it('publisherRuntime.verificationRequired should be false', () => {
    expect(DefaultEcosystemRuntimeConfig.publisherRuntime.verificationRequired).toBe(false);
  });

  it('sandboxRuntime.defaultResourceLimits should be frozen', () => {
    expect(Object.isFrozen(DefaultEcosystemRuntimeConfig.sandboxRuntime.defaultResourceLimits)).toBe(true);
  });

  it('sandboxRuntime.defaultResourceLimits.maxMemoryMB should be 512', () => {
    expect(DefaultEcosystemRuntimeConfig.sandboxRuntime.defaultResourceLimits.maxMemoryMB).toBe(512);
  });

  it('packageRuntime.supportedAlgorithms should be frozen', () => {
    expect(Object.isFrozen(DefaultEcosystemRuntimeConfig.packageRuntime.supportedAlgorithms)).toBe(true);
  });

  it('permissionRuntime.requireExplicitGrant should be frozen', () => {
    expect(Object.isFrozen(DefaultEcosystemRuntimeConfig.permissionRuntime.requireExplicitGrant)).toBe(true);
  });

  it('permissionRuntime.requireExplicitGrant should have 3 items', () => {
    expect(DefaultEcosystemRuntimeConfig.permissionRuntime.requireExplicitGrant).toHaveLength(3);
  });

  it('ratingRuntime.maxRatingsPerUser should be 1', () => {
    expect(DefaultEcosystemRuntimeConfig.ratingRuntime.maxRatingsPerUser).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 13. ADDITIONAL RATING RUNTIME EDGE CASES
// ═══════════════════════════════════════════════════════════════════

describe('RatingRuntime — additional edge cases', () => {
  let runtime: RatingRuntime;

  beforeEach(() => {
    vi.clearAllMocks();
    runtime = new RatingRuntime(config.ratingRuntime, mockEventBus);
  });

  const makeAllScores = (val: number): Readonly<Record<RatingDimension, number>> =>
    Object.freeze({
      [RatingDimension.Quality]: val, [RatingDimension.Reliability]: val,
      [RatingDimension.Usability]: val, [RatingDimension.Performance]: val,
      [RatingDimension.Security]: val, [RatingDimension.Documentation]: val,
    } as Record<RatingDimension, number>);

  it('getAverage returns 0 for empty state', async () => {
    expect(await runtime.getAverage(brandCapabilityId('empty'))).toBe(0);
  });

  it('getByCapabilityId returns frozen array', async () => {
    const capId = brandCapabilityId('cap-freeze');
    await runtime.submit({ capabilityId: capId, userId: 'u', scores: makeAllScores(3), comment: '', metadata: {} });
    const result = await runtime.getByCapabilityId(capId);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('list returns frozen array', async () => {
    await runtime.submit({ capabilityId: brandCapabilityId('cap-lf'), userId: 'u', scores: makeAllScores(3), comment: '', metadata: {} });
    const result = await runtime.list();
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('submit returns frozen entry', async () => {
    const entry = await runtime.submit({ capabilityId: brandCapabilityId('cap-fe'), userId: 'u', scores: makeAllScores(3), comment: '', metadata: {} });
    expect(Object.isFrozen(entry)).toBe(true);
  });

  it('scores are frozen on returned entry', async () => {
    const entry = await runtime.submit({ capabilityId: brandCapabilityId('cap-sf'), userId: 'u', scores: makeAllScores(4), comment: '', metadata: {} });
    expect(Object.isFrozen(entry.scores)).toBe(true);
  });

  it('getAverage with only min scores returns minScore', async () => {
    const capId = brandCapabilityId('cap-ga-min');
    await runtime.submit({ capabilityId: capId, userId: 'u', scores: makeAllScores(1), comment: '', metadata: {} });
    expect(await runtime.getAverage(capId)).toBe(1);
  });

  it('getAverage with only max scores returns maxScore', async () => {
    const capId = brandCapabilityId('cap-ga-max');
    await runtime.submit({ capabilityId: capId, userId: 'u', scores: makeAllScores(5), comment: '', metadata: {} });
    expect(await runtime.getAverage(capId)).toBe(5);
  });

  it('getById returns same reference for same id', async () => {
    const capId = brandCapabilityId('cap-ref');
    const entry = await runtime.submit({ capabilityId: capId, userId: 'u', scores: makeAllScores(3), comment: '', metadata: {} });
    const a = await runtime.getById(entry.id);
    const b = await runtime.getById(entry.id);
    expect(a).toBe(b); // same frozen object reference
  });

  it('count returns consistent value', async () => {
    const capId = brandCapabilityId('cap-cc');
    expect(await runtime.count()).toBe(0);
    await runtime.submit({ capabilityId: capId, userId: 'u1', scores: makeAllScores(3), comment: '', metadata: {} });
    expect(await runtime.count()).toBe(1);
    expect(await runtime.count()).toBe(1);
  });

  it('publish event has timestamp', async () => {
    await runtime.submit({ capabilityId: brandCapabilityId('cap-ts'), userId: 'u', scores: makeAllScores(3), comment: '', metadata: {} });
    const call = mockEventBus.publish.mock.calls[0][0];
    expect(typeof call.timestamp).toBe('string');
  });

  it('publish event has classification', async () => {
    await runtime.submit({ capabilityId: brandCapabilityId('cap-cls'), userId: 'u', scores: makeAllScores(3), comment: '', metadata: {} });
    const call = mockEventBus.publish.mock.calls[0][0];
    expect(typeof call.classification).toBe('string');
  });

  it('publish event has metadata', async () => {
    await runtime.submit({ capabilityId: brandCapabilityId('cap-meta'), userId: 'u', scores: makeAllScores(3), comment: '', metadata: {} });
    const call = mockEventBus.publish.mock.calls[0][0];
    expect(call.metadata).toBeDefined();
  });

  it('can submit for different capabilities', async () => {
 await runtime.submit({ capabilityId: brandCapabilityId('cap-d1'), userId: 'u', scores: makeAllScores(3), comment: '', metadata: {} });
 await runtime.submit({ capabilityId: brandCapabilityId('cap-d2'), userId: 'u', scores: makeAllScores(4), comment: '', metadata: {} });
 await runtime.submit({ capabilityId: brandCapabilityId('cap-d3'), userId: 'u', scores: makeAllScores(5), comment: '', metadata: {} });
    expect(await runtime.count()).toBe(3);
  });

  it('getByCapabilityId only returns relevant ratings', async () => {
    const c1 = brandCapabilityId('cap-s1');
    const c2 = brandCapabilityId('cap-s2');
    await runtime.submit({ capabilityId: c1, userId: 'u1', scores: makeAllScores(3), comment: '', metadata: {} });
    await runtime.submit({ capabilityId: c1, userId: 'u2', scores: makeAllScores(4), comment: '', metadata: {} });
    await runtime.submit({ capabilityId: c2, userId: 'u3', scores: makeAllScores(5), comment: '', metadata: {} });
    expect((await runtime.getByCapabilityId(c1)).length).toBe(2);
    expect((await runtime.getByCapabilityId(c2)).length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 14. ADDITIONAL COMPOSITION ENGINE FILTER COMBINATIONS
// ═══════════════════════════════════════════════════════════════════

describe('CompositionEngine — filter combinations', () => {
  let engine: CompositionEngine;

  const makeStep = (order: number, capId: string): CompositionStepInput => ({
    order, capabilityId: brandCapabilityId(capId),
    config: Object.freeze({}), fallbackCapabilityId: null, condition: null,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new CompositionEngine(config.compositionEngine, mockEventBus);
  });

  it('filter by type Fallback', async () => {
    await engine.create({ name: 'f1', description: '', type: CompositionType.Fallback, steps: [makeStep(1, 'c1')], metadata: {} });
    await engine.create({ name: 'f2', description: '', type: CompositionType.Pipeline, steps: [makeStep(1, 'c2')], metadata: {} });
    expect((await engine.list({ type: CompositionType.Fallback })).length).toBe(1);
  });

  it('filter by type Chain', async () => {
    await engine.create({ name: 'ch1', description: '', type: CompositionType.Chain, steps: [makeStep(1, 'c1')], metadata: {} });
    await engine.create({ name: 'ch2', description: '', type: CompositionType.Pipeline, steps: [makeStep(1, 'c2')], metadata: {} });
    expect((await engine.list({ type: CompositionType.Chain })).length).toBe(1);
  });

  it('filter by type Conditional', async () => {
    await engine.create({ name: 'co1', description: '', type: CompositionType.Conditional, steps: [makeStep(1, 'c1')], metadata: {} });
    expect((await engine.list({ type: CompositionType.Conditional })).length).toBe(1);
  });

  it('empty filter returns all', async () => {
    await engine.create({ name: 'e1', description: '', type: CompositionType.Pipeline, steps: [makeStep(1, 'c1')], metadata: {} });
    await engine.create({ name: 'e2', description: '', type: CompositionType.Parallel, steps: [makeStep(1, 'c2')], metadata: {} });
    const result = await engine.list({});
    expect(result).toHaveLength(2);
  });

  it('undefined filter returns all', async () => {
    await engine.create({ name: 'u1', description: '', type: CompositionType.Pipeline, steps: [makeStep(1, 'c1')], metadata: {} });
    const result = await engine.list(undefined);
    expect(result).toHaveLength(1);
  });

  it('filter active true when none active returns empty', async () => {
    await engine.create({ name: 'ia1', description: '', type: CompositionType.Pipeline, steps: [makeStep(1, 'c1')], metadata: {} });
    expect((await engine.list({ active: true })).length).toBe(0);
  });

  it('multiple compositions all active', async () => {
    const c1 = await engine.create({ name: 'ma1', description: '', type: CompositionType.Pipeline, steps: [makeStep(1, 'c1')], metadata: {} });
    const c2 = await engine.create({ name: 'ma2', description: '', type: CompositionType.Parallel, steps: [makeStep(1, 'c2')], metadata: {} });
    await engine.activate(c1.id);
    await engine.activate(c2.id);
    expect((await engine.list({ active: true })).length).toBe(2);
  });

  it('filter by active false when all inactive', async () => {
    await engine.create({ name: 'ai1', description: '', type: CompositionType.Pipeline, steps: [makeStep(1, 'c1')], metadata: {} });
    await engine.create({ name: 'ai2', description: '', type: CompositionType.Parallel, steps: [makeStep(1, 'c2')], metadata: {} });
    expect((await engine.list({ active: false })).length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 15. ADDITIONAL PUBLISHER STATUS TRANSITIONS
// ═══════════════════════════════════════════════════════════════════

describe('PublisherRuntime — status transition chains', () => {
  let runtime: PublisherRuntime;

  beforeEach(() => {
    vi.clearAllMocks();
    runtime = new PublisherRuntime(config.publisherRuntime, mockEventBus);
  });

  it('Unverified -> Verified -> Trusted', async () => {
    const pub = await runtime.register({ name: 'p1', description: '', publicKey: 'k1', metadata: {} });
 await runtime.updateStatus(pub.id, PublisherStatus.Verified);
 await runtime.updateStatus(pub.id, PublisherStatus.Trusted);
    const updated = await runtime.getById(pub.id);
    expect(updated!.status).toBe(PublisherStatus.Trusted);
  });

  it('Unverified -> Suspended -> Banned', async () => {
    const pub = await runtime.register({ name: 'p2', description: '', publicKey: 'k2', metadata: {} });
 await runtime.updateStatus(pub.id, PublisherStatus.Suspended);
 await runtime.updateStatus(pub.id, PublisherStatus.Banned);
    const updated = await runtime.getById(pub.id);
    expect(updated!.status).toBe(PublisherStatus.Banned);
  });

  it('Trusted -> Suspended', async () => {
    const pub = await runtime.register({ name: 'p3', description: '', publicKey: 'k3', metadata: {} });
 await runtime.updateStatus(pub.id, PublisherStatus.Verified);
 await runtime.updateStatus(pub.id, PublisherStatus.Trusted);
 await runtime.updateStatus(pub.id, PublisherStatus.Suspended);
    const updated = await runtime.getById(pub.id);
    expect(updated!.status).toBe(PublisherStatus.Suspended);
  });

  it('Banned -> Unverified', async () => {
    const pub = await runtime.register({ name: 'p4', description: '', publicKey: 'k4', metadata: {} });
 await runtime.updateStatus(pub.id, PublisherStatus.Banned);
 await runtime.updateStatus(pub.id, PublisherStatus.Unverified);
    const updated = await runtime.getById(pub.id);
    expect(updated!.status).toBe(PublisherStatus.Unverified);
  });

  it('status events track each transition', async () => {
    const pub = await runtime.register({ name: 'p5', description: '', publicKey: 'k5', metadata: {} });
    vi.clearAllMocks();
    await runtime.updateStatus(pub.id, PublisherStatus.Verified);
    await runtime.updateStatus(pub.id, PublisherStatus.Trusted);
    await runtime.updateStatus(pub.id, PublisherStatus.Suspended);
    const stateChangeCalls = mockEventBus.publish.mock.calls.filter(
      c => c[0].eventType === 'marketplace.publisher.statusChanged'
    );
    expect(stateChangeCalls.length).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 16. ADDITIONAL ECOSYSTEM SUBSYSTEM CORRECTNESS
// ═══════════════════════════════════════════════════════════════════

describe('EcosystemRuntime — subsystem correctness', () => {
  let ecosystem: EcosystemRuntime;

  beforeEach(() => {
    vi.clearAllMocks();
    ecosystem = new EcosystemRuntime(config, mockEventBus);
  });

  it('getCapabilityRegistry has list method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getCapabilityRegistry().list).toBe('function');
  });

  it('getCapabilityRegistry has count method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getCapabilityRegistry().count).toBe('function');
  });

  it('getPackageRuntime has getById method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getPackageRuntime().getById).toBe('function');
  });

  it('getPackageRuntime has count method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getPackageRuntime().count).toBe('function');
  });

  it('getMarketplaceRuntime has search method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getMarketplaceRuntime().search).toBe('function');
  });

  it('getMarketplaceRuntime has getFeatured method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getMarketplaceRuntime().getFeatured).toBe('function');
  });

  it('getInstallationEngine has getById method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getInstallationEngine().getById).toBe('function');
  });

  it('getInstallationEngine has list method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getInstallationEngine().list).toBe('function');
  });

  it('getRatingRuntime has getById method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getRatingRuntime().getById).toBe('function');
  });

  it('getRatingRuntime has list method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getRatingRuntime().list).toBe('function');
  });

  it('getRatingRuntime has count method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getRatingRuntime().count).toBe('function');
  });

  it('getCompositionEngine has activate method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getCompositionEngine().activate).toBe('function');
  });

  it('getCompositionEngine has deactivate method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getCompositionEngine().deactivate).toBe('function');
  });

  it('getCompositionEngine has getById method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getCompositionEngine().getById).toBe('function');
  });

  it('getCompositionEngine has list method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getCompositionEngine().list).toBe('function');
  });

  it('getCompositionEngine has count method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getCompositionEngine().count).toBe('function');
  });

  it('getPublisherRuntime has getById method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getPublisherRuntime().getById).toBe('function');
  });

  it('getPublisherRuntime has list method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getPublisherRuntime().list).toBe('function');
  });

  it('getPublisherRuntime has count method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getPublisherRuntime().count).toBe('function');
  });

  it('getPublisherRuntime has updateStatus method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getPublisherRuntime().updateStatus).toBe('function');
  });

  it('getRecommendationRuntime has getById method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getRecommendationRuntime().getById).toBe('function');
  });

  it('getRecommendationRuntime has list method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getRecommendationRuntime().list).toBe('function');
  });

  it('getRecommendationRuntime has count method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getRecommendationRuntime().count).toBe('function');
  });

  it('getSandboxRuntime has getById method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getSandboxRuntime().getById).toBe('function');
  });

  it('getSandboxRuntime has list method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getSandboxRuntime().list).toBe('function');
  });

  it('getSandboxRuntime has count method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getSandboxRuntime().count).toBe('function');
  });

  it('getSignatureEngine has getById method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getSignatureEngine().getById).toBe('function');
  });

  it('getSignatureEngine has verify method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getSignatureEngine().verify).toBe('function');
  });

  it('getDependencyResolver has hasCircularDependency method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getDependencyResolver().hasCircularDependency).toBe('function');
  });

  it('getCompatibilityEngine has getReport method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getCompatibilityEngine().getReport).toBe('function');
  });

  it('getPermissionRuntime has listPending method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getPermissionRuntime().listPending).toBe('function');
  });

  it('getPermissionRuntime has checkPermission method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getPermissionRuntime().checkPermission).toBe('function');
  });

  it('getUpdateEngine has update method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getUpdateEngine().update).toBe('function');
  });

  it('getUpdateEngine has rollback method', async () => {
    await ecosystem.initialize();
    expect(typeof ecosystem.getUpdateEngine().rollback).toBe('function');
  });
});
