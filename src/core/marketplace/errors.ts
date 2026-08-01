/**
 * Capability Marketplace & Ecosystem Foundation — Error Hierarchy
 * TASK-AIS-009A.000
 *
 * All errors extend MarketplaceError.
 * Every error has a code, message, and optional context.
 */

// ═══════════════════════════════════════════════════════════════════
// BASE ERROR
// ═══════════════════════════════════════════════════════════════════

export class MarketplaceError extends Error {
  readonly code: string;
  readonly timestamp: string;
  readonly context: Readonly<Record<string, unknown>>;

  constructor(code: string, message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'MarketplaceError';
    this.code = code;
    this.timestamp = new Date().toISOString();
    this.context = Object.freeze({ ...context });
  }
}

// ═══════════════════════════════════════════════════════════════════
// CAPABILITY REGISTRY ERRORS
// ═══════════════════════════════════════════════════════════════════

export class CapabilityNotFoundError extends MarketplaceError {
  readonly capabilityId: string;
  constructor(capabilityId: string, context?: Record<string, unknown>) {
    super('CAPABILITY_NOT_FOUND', `Capability not found: ${capabilityId}`, { capabilityId, ...context });
    this.name = 'CapabilityNotFoundError';
    this.capabilityId = capabilityId;
  }
}

export class CapabilityLimitExceededError extends MarketplaceError {
  constructor(max: number, context?: Record<string, unknown>) {
    super('CAPABILITY_LIMIT_EXCEEDED', `Maximum capabilities exceeded: ${max}`, { max, ...context });
    this.name = 'CapabilityLimitExceededError';
  }
}

export class CapabilityDuplicateError extends MarketplaceError {
  readonly capabilityName: string;
  constructor(capabilityName: string, context?: Record<string, unknown>) {
    super('CAPABILITY_DUPLICATE', `Capability already exists: ${capabilityName}`, { capabilityName, ...context });
    this.name = 'CapabilityDuplicateError';
    this.capabilityName = capabilityName;
  }
}

// ═══════════════════════════════════════════════════════════════════
// PACKAGE ERRORS
// ═══════════════════════════════════════════════════════════════════

export class PackageNotFoundError extends MarketplaceError {
  readonly packageId: string;
  constructor(packageId: string, context?: Record<string, unknown>) {
    super('PACKAGE_NOT_FOUND', `Package not found: ${packageId}`, { packageId, ...context });
    this.name = 'PackageNotFoundError';
    this.packageId = packageId;
  }
}

export class PackageLimitExceededError extends MarketplaceError {
  constructor(max: number, context?: Record<string, unknown>) {
    super('PACKAGE_LIMIT_EXCEEDED', `Maximum packages exceeded: ${max}`, { max, ...context });
    this.name = 'PackageLimitExceededError';
  }
}

export class PackageSizeExceededError extends MarketplaceError {
  constructor(sizeBytes: number, maxSize: number, context?: Record<string, unknown>) {
    super('PACKAGE_SIZE_EXCEEDED', `Package size ${sizeBytes} exceeds maximum ${maxSize}`, { sizeBytes, maxSize, ...context });
    this.name = 'PackageSizeExceededError';
  }
}

export class ManifestValidationError extends MarketplaceError {
  readonly reason: string;
  constructor(reason: string, context?: Record<string, unknown>) {
    super('MANIFEST_VALIDATION_ERROR', `Manifest validation failed: ${reason}`, { reason, ...context });
    this.name = 'ManifestValidationError';
    this.reason = reason;
  }
}

// ═══════════════════════════════════════════════════════════════════
// INSTALLATION ERRORS
// ═══════════════════════════════════════════════════════════════════

export class InstallationNotFoundError extends MarketplaceError {
  readonly installationId: string;
  constructor(installationId: string, context?: Record<string, unknown>) {
    super('INSTALLATION_NOT_FOUND', `Installation not found: ${installationId}`, { installationId, ...context });
    this.name = 'InstallationNotFoundError';
    this.installationId = installationId;
  }
}

export class InstallationStateError extends MarketplaceError {
  readonly installationId: string;
  readonly currentStatus: string;
  readonly targetStatus: string;
  constructor(installationId: string, currentStatus: string, targetStatus: string, context?: Record<string, unknown>) {
    super('INSTALLATION_STATE_ERROR', `Cannot transition installation ${installationId} from ${currentStatus} to ${targetStatus}`, { installationId, currentStatus, targetStatus, ...context });
    this.name = 'InstallationStateError';
    this.installationId = installationId;
    this.currentStatus = currentStatus;
    this.targetStatus = targetStatus;
  }
}

export class InstallationLimitExceededError extends MarketplaceError {
  constructor(max: number, context?: Record<string, unknown>) {
    super('INSTALLATION_LIMIT_EXCEEDED', `Maximum concurrent installations exceeded: ${max}`, { max, ...context });
    this.name = 'InstallationLimitExceededError';
  }
}

export class InstallationTimeoutError extends MarketplaceError {
  readonly installationId: string;
  constructor(installationId: string, timeoutMs: number, context?: Record<string, unknown>) {
    super('INSTALLATION_TIMEOUT', `Installation ${installationId} timed out after ${timeoutMs}ms`, { installationId, timeoutMs, ...context });
    this.name = 'InstallationTimeoutError';
    this.installationId = installationId;
  }
}

// ═══════════════════════════════════════════════════════════════════
// UPDATE ERRORS
// ═══════════════════════════════════════════════════════════════════

export class UpdateError extends MarketplaceError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('UPDATE_ERROR', `Update failed: ${reason}`, { reason, ...context });
    this.name = 'UpdateError';
  }
}

export class RollbackError extends MarketplaceError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('ROLLBACK_ERROR', `Rollback failed: ${reason}`, { reason, ...context });
    this.name = 'RollbackError';
  }
}

export class NoUpdateAvailableError extends MarketplaceError {
  readonly capabilityId: string;
  constructor(capabilityId: string, context?: Record<string, unknown>) {
    super('NO_UPDATE_AVAILABLE', `No update available for capability: ${capabilityId}`, { capabilityId, ...context });
    this.name = 'NoUpdateAvailableError';
    this.capabilityId = capabilityId;
  }
}

// ═══════════════════════════════════════════════════════════════════
// DEPENDENCY ERRORS
// ═══════════════════════════════════════════════════════════════════

export class DependencyResolutionError extends MarketplaceError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('DEPENDENCY_RESOLUTION_ERROR', `Dependency resolution failed: ${reason}`, { reason, ...context });
    this.name = 'DependencyResolutionError';
  }
}

export class CircularDependencyError extends MarketplaceError {
  constructor(packageName: string, context?: Record<string, unknown>) {
    super('CIRCULAR_DEPENDENCY', `Circular dependency detected involving: ${packageName}`, { packageName, ...context });
    this.name = 'CircularDependencyError';
  }
}

export class DependencyNotFoundError extends MarketplaceError {
  readonly packageName: string;
  constructor(packageName: string, context?: Record<string, unknown>) {
    super('DEPENDENCY_NOT_FOUND', `Dependency not found: ${packageName}`, { packageName, ...context });
    this.name = 'DependencyNotFoundError';
    this.packageName = packageName;
  }
}

// ═══════════════════════════════════════════════════════════════════
// COMPATIBILITY ERRORS
// ═══════════════════════════════════════════════════════════════════

export class CompatibilityError extends MarketplaceError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('COMPATIBILITY_ERROR', `Compatibility check failed: ${reason}`, { reason, ...context });
    this.name = 'CompatibilityError';
  }
}

export class IncompatibleCapabilityError extends MarketplaceError {
  readonly capabilityId: string;
  constructor(capabilityId: string, context?: Record<string, unknown>) {
    super('INCOMPATIBLE_CAPABILITY', `Capability ${capabilityId} is incompatible`, { capabilityId, ...context });
    this.name = 'IncompatibleCapabilityError';
    this.capabilityId = capabilityId;
  }
}

// ═══════════════════════════════════════════════════════════════════
// SIGNATURE ERRORS
// ═══════════════════════════════════════════════════════════════════

export class SignatureVerificationError extends MarketplaceError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('SIGNATURE_VERIFICATION_ERROR', `Signature verification failed: ${reason}`, { reason, ...context });
    this.name = 'SignatureVerificationError';
  }
}

export class SignatureExpiredError extends MarketplaceError {
  readonly signatureId: string;
  constructor(signatureId: string, context?: Record<string, unknown>) {
    super('SIGNATURE_EXPIRED', `Signature ${signatureId} has expired`, { signatureId, ...context });
    this.name = 'SignatureExpiredError';
    this.signatureId = signatureId;
  }
}

// ═══════════════════════════════════════════════════════════════════
// SANDBOX ERRORS
// ═══════════════════════════════════════════════════════════════════

export class SandboxError extends MarketplaceError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('SANDBOX_ERROR', `Sandbox error: ${reason}`, { reason, ...context });
    this.name = 'SandboxError';
  }
}

export class SandboxLimitExceededError extends MarketplaceError {
  constructor(max: number, context?: Record<string, unknown>) {
    super('SANDBOX_LIMIT_EXCEEDED', `Maximum sandbox instances exceeded: ${max}`, { max, ...context });
    this.name = 'SandboxLimitExceededError';
  }
}

export class SandboxViolationError extends MarketplaceError {
  readonly sandboxId: string;
  readonly permission: string;
  constructor(sandboxId: string, permission: string, context?: Record<string, unknown>) {
    super('SANDBOX_VIOLATION', `Sandbox ${sandboxId} violated permission: ${permission}`, { sandboxId, permission, ...context });
    this.name = 'SandboxViolationError';
    this.sandboxId = sandboxId;
    this.permission = permission;
  }
}

// ═══════════════════════════════════════════════════════════════════
// PERMISSION ERRORS
// ═══════════════════════════════════════════════════════════════════

export class PermissionDeniedError extends MarketplaceError {
  readonly permission: string;
  constructor(permission: string, context?: Record<string, unknown>) {
    super('PERMISSION_DENIED', `Permission denied: ${permission}`, { permission, ...context });
    this.name = 'PermissionDeniedError';
    this.permission = permission;
  }
}

export class PermissionLimitExceededError extends MarketplaceError {
  constructor(max: number, context?: Record<string, unknown>) {
    super('PERMISSION_LIMIT_EXCEEDED', `Maximum pending permission requests exceeded: ${max}`, { max, ...context });
    this.name = 'PermissionLimitExceededError';
  }
}

// ═══════════════════════════════════════════════════════════════════
// RATING ERRORS
// ═══════════════════════════════════════════════════════════════════

export class RatingError extends MarketplaceError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('RATING_ERROR', `Rating error: ${reason}`, { reason, ...context });
    this.name = 'RatingError';
  }
}

// ═══════════════════════════════════════════════════════════════════
// RECOMMENDATION ERRORS
// ═══════════════════════════════════════════════════════════════════

export class RecommendationError extends MarketplaceError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('RECOMMENDATION_ERROR', `Recommendation error: ${reason}`, { reason, ...context });
    this.name = 'RecommendationError';
  }
}

// ═══════════════════════════════════════════════════════════════════
// COMPOSITION ERRORS
// ═══════════════════════════════════════════════════════════════════

export class CompositionError extends MarketplaceError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('COMPOSITION_ERROR', `Composition error: ${reason}`, { reason, ...context });
    this.name = 'CompositionError';
  }
}

export class CompositionLimitExceededError extends MarketplaceError {
  constructor(max: number, context?: Record<string, unknown>) {
    super('COMPOSITION_LIMIT_EXCEEDED', `Maximum compositions exceeded: ${max}`, { max, ...context });
    this.name = 'CompositionLimitExceededError';
  }
}

export class CompositionValidationError extends MarketplaceError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('COMPOSITION_VALIDATION_ERROR', `Composition validation failed: ${reason}`, { reason, ...context });
    this.name = 'CompositionValidationError';
  }
}

// ═══════════════════════════════════════════════════════════════════
// PUBLISHER ERRORS
// ═══════════════════════════════════════════════════════════════════

export class PublisherNotFoundError extends MarketplaceError {
  readonly publisherId: string;
  constructor(publisherId: string, context?: Record<string, unknown>) {
    super('PUBLISHER_NOT_FOUND', `Publisher not found: ${publisherId}`, { publisherId, ...context });
    this.name = 'PublisherNotFoundError';
    this.publisherId = publisherId;
  }
}

export class PublisherLimitExceededError extends MarketplaceError {
  constructor(max: number, context?: Record<string, unknown>) {
    super('PUBLISHER_LIMIT_EXCEEDED', `Maximum publishers exceeded: ${max}`, { max, ...context });
    this.name = 'PublisherLimitExceededError';
  }
}

export class PublisherSuspendedError extends MarketplaceError {
  readonly publisherId: string;
  constructor(publisherId: string, context?: Record<string, unknown>) {
    super('PUBLISHER_SUSPENDED', `Publisher ${publisherId} is suspended`, { publisherId, ...context });
    this.name = 'PublisherSuspendedError';
    this.publisherId = publisherId;
  }
}

// ═══════════════════════════════════════════════════════════════════
// MARKETPLACE / CATALOG ERRORS
// ═══════════════════════════════════════════════════════════════════

export class CatalogLimitExceededError extends MarketplaceError {
  constructor(max: number, context?: Record<string, unknown>) {
    super('CATALOG_LIMIT_EXCEEDED', `Maximum catalog entries exceeded: ${max}`, { max, ...context });
    this.name = 'CatalogLimitExceededError';
  }
}

// ═══════════════════════════════════════════════════════════════════
// ECOSYSTEM RUNTIME ERRORS
// ═══════════════════════════════════════════════════════════════════

export class EcosystemRuntimeError extends MarketplaceError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('ECOSYSTEM_RUNTIME_ERROR', `Ecosystem runtime error: ${reason}`, { reason, ...context });
    this.name = 'EcosystemRuntimeError';
  }
}

export class EcosystemNotInitializedError extends MarketplaceError {
  constructor(context?: Record<string, unknown>) {
    super('ECOSYSTEM_NOT_INITIALIZED', 'Ecosystem runtime is not initialized', { ...context });
    this.name = 'EcosystemNotInitializedError';
  }
}

export class EcosystemDisposedError extends MarketplaceError {
  constructor(context?: Record<string, unknown>) {
    super('ECOSYSTEM_DISPOSED', 'Ecosystem runtime has been disposed', { ...context });
    this.name = 'EcosystemDisposedError';
  }
}

// ═══════════════════════════════════════════════════════════════════
// PHILOSOPHY VIOLATION ERRORS
// ═══════════════════════════════════════════════════════════════════

export class NoValueProofError extends MarketplaceError {
  readonly capabilityId: string;
  constructor(capabilityId: string, context?: Record<string, unknown>) {
    super('NO_VALUE_PROOF', `Capability ${capabilityId} lacks proof of value creation (PHI-007)`, { capabilityId, ...context });
    this.name = 'NoValueProofError';
    this.capabilityId = capabilityId;
  }
}

export class OptimizationWithoutValueError extends MarketplaceError {
  readonly capabilityId: string;
  constructor(capabilityId: string, context?: Record<string, unknown>) {
    super('OPTIMIZATION_WITHOUT_VALUE', `Capability ${capabilityId} is optimization without value (PHI-005)`, { capabilityId, ...context });
    this.name = 'OptimizationWithoutValueError';
    this.capabilityId = capabilityId;
  }
}