/**
 * Capability Runtime — Error Hierarchy
 * TASK-AIS-003G.000
 *
 * Structured errors for the capability runtime. Each error carries a `code`
 * for programmatic handling without re-parsing messages.
 */
// ─── Base ─────────────────────────────────────────────────────

export class CapabilityError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'CapabilityError';
    this.code = code;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// ─── Pack Not Found ───────────────────────────────────────────

export class CapabilityPackNotFoundError extends CapabilityError {
  readonly packId: string;

  constructor(packId: string) {
    super(`Capability pack not found: id="${packId}"`, 'CAPABILITY_PACK_NOT_FOUND');
    this.name = 'CapabilityPackNotFoundError';
    this.packId = packId;
  }
}

// ─── Pack Already Exists ─────────────────────────────────────

export class CapabilityPackDuplicateError extends CapabilityError {
  readonly packName: string;

  constructor(packName: string) {
    super(`Capability pack already exists: "${packName}"`, 'CAPABILITY_PACK_DUPLICATE');
    this.name = 'CapabilityPackDuplicateError';
    this.packName = packName;
  }
}

// ─── Invalid State Transition ─────────────────────────────────

export class CapabilityStateError extends CapabilityError {
  readonly packId: string;
  readonly current: string;
  readonly target: string;

  constructor(packId: string, current: string, target: string) {
    super(
      `Invalid state transition for pack "${packId}": ${current} → ${target}`,
      'CAPABILITY_STATE_ERROR',
    );
    this.name = 'CapabilityStateError';
    this.packId = packId;
    this.current = current;
    this.target = target;
  }
}

// ─── Validation Failed ────────────────────────────────────────

export class CapabilityValidationError extends CapabilityError {
  readonly issues: readonly string[];

  constructor(packName: string, issues: readonly string[]) {
    super(
      `Capability validation failed for "${packName}": ${issues.join('; ')}`,
      'CAPABILITY_VALIDATION_ERROR',
    );
    this.name = 'CapabilityValidationError';
    this.issues = issues;
  }
}

// ─── Dependency Resolution Failed ──────────────────────────────

export class CapabilityDependencyError extends CapabilityError {
  readonly missingDependencies: readonly string[];
  readonly cycles: readonly string[];
  readonly conflicts: readonly string[];

  constructor(
    missing: readonly string[],
    cycles: readonly string[],
    conflicts: readonly string[],
  ) {
    super(
      `Dependency resolution failed: missing=[${missing.join(', ')}], cycles=[${cycles.join(', ')}], conflicts=[${conflicts.join(', ')}]`,
      'CAPABILITY_DEPENDENCY_ERROR',
    );
    this.name = 'CapabilityDependencyError';
    this.missingDependencies = missing;
    this.cycles = cycles;
    this.conflicts = conflicts;
  }
}

// ─── Compatibility Failed ─────────────────────────────────────

export class CapabilityCompatibilityError extends CapabilityError {
  readonly issues: readonly string[];

  constructor(packName: string, issues: readonly string[]) {
    super(
      `Compatibility check failed for "${packName}": ${issues.join('; ')}`,
      'CAPABILITY_COMPATIBILITY_ERROR',
    );
    this.name = 'CapabilityCompatibilityError';
    this.issues = issues;
  }
}

// ─── Sandbox Violation ────────────────────────────────────────

export class CapabilitySandboxError extends CapabilityError {
  readonly packId: string;
  readonly action: string;
  readonly resource: string;

  constructor(packId: string, action: string, resource: string, reason: string) {
    super(
      `Sandbox violation by pack "${packId}": action="${action}" on resource="${resource}" — ${reason}`,
      'CAPABILITY_SANDBOX_VIOLATION',
    );
    this.name = 'CapabilitySandboxError';
    this.packId = packId;
    this.action = action;
    this.resource = resource;
  }
}

// ─── Permission Denied ────────────────────────────────────────

export class CapabilityPermissionDeniedError extends CapabilityError {
  readonly packId: string;
  readonly permissionType: string;
  readonly resource: string;

  constructor(packId: string, permissionType: string, resource: string) {
    super(
      `Permission denied for pack "${packId}": type="${permissionType}" resource="${resource}"`,
      'CAPABILITY_PERMISSION_DENIED',
    );
    this.name = 'CapabilityPermissionDeniedError';
    this.packId = packId;
    this.permissionType = permissionType;
    this.resource = resource;
  }
}

// ─── Manifest Error ───────────────────────────────────────────

export class CapabilityManifestError extends CapabilityError {
  readonly field: string;

  constructor(field: string, reason: string) {
    super(`Invalid manifest field "${field}": ${reason}`, 'CAPABILITY_MANIFEST_ERROR');
    this.name = 'CapabilityManifestError';
    this.field = field;
  }
}

// ─── Contract Not Implemented ──────────────────────────────────

export class CapabilityContractError extends CapabilityError {
  readonly method: string;

  constructor(method: string) {
    super(`Capability contract method not implemented: "${method}"`, 'CAPABILITY_CONTRACT_ERROR');
    this.name = 'CapabilityContractError';
    this.method = method;
  }
}

// ─── Runtime Disposed ─────────────────────────────────────────

export class CapabilityDisposedError extends CapabilityError {
  constructor() {
    super('Capability Runtime has been disposed', 'CAPABILITY_DISPOSED');
    this.name = 'CapabilityDisposedError';
  }
}

// ─── Checksum Mismatch ────────────────────────────────────────

export class CapabilityChecksumError extends CapabilityError {
  readonly packId: string;
  readonly expected: string;
  readonly actual: string;

  constructor(packId: string, expected: string, actual: string) {
    super(
      `Checksum mismatch for pack "${packId}": expected="${expected}", actual="${actual}"`,
      'CAPABILITY_CHECKSUM_ERROR',
    );
    this.name = 'CapabilityChecksumError';
    this.packId = packId;
    this.expected = expected;
    this.actual = actual;
  }
}
