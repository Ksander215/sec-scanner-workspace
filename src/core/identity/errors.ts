/**
 * Identity Module — Error Hierarchy
 * TASK-AIS-003F.000
 *
 * Structured errors for the identity runtime. Each error carries a `code`
 * for programmatic handling without re-parsing messages.
 */
// ─── Base ─────────────────────────────────────────────────────

export class IdentityError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'IdentityError';
    this.code = code;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// ─── IdentityNotFoundError ───────────────────────────────────

export class IdentityNotFoundError extends IdentityError {
  readonly identityId: string;

  constructor(identityId: string) {
    super(
      `Identity not found: id="${identityId}"`,
      'IDENTITY_NOT_FOUND',
    );
    this.name = 'IdentityNotFoundError';
    this.identityId = identityId;
  }
}

// ─── IdentityStateError ─────────────────────────────────────

export class IdentityStateError extends IdentityError {
  readonly identityId: string;
  readonly current: string;
  readonly target: string;

  constructor(identityId: string, current: string, target: string) {
    super(
      `Invalid state transition for identity "${identityId}": ${current} → ${target}`,
      'IDENTITY_STATE_ERROR',
    );
    this.name = 'IdentityStateError';
    this.identityId = identityId;
    this.current = current;
    this.target = target;
  }
}

// ─── IdentityDuplicateError ──────────────────────────────────

export class IdentityDuplicateError extends IdentityError {
  readonly identityName: string;

  constructor(identityName: string) {
    super(
      `Identity already exists with name: "${identityName}"`,
      'IDENTITY_DUPLICATE',
    );
    this.name = 'IdentityDuplicateError';
    this.identityName = identityName;
  }
}

// ─── ProfileNotFoundError ────────────────────────────────────

export class ProfileNotFoundError extends IdentityError {
  readonly identityId: string;

  constructor(identityId: string) {
    super(
      `Profile not found for identity: id="${identityId}"`,
      'PROFILE_NOT_FOUND',
    );
    this.name = 'ProfileNotFoundError';
    this.identityId = identityId;
  }
}

// ─── PreferenceNotFoundError ────────────────────────────────

export class PreferenceNotFoundError extends IdentityError {
  readonly key: string;
  readonly identityId: string;

  constructor(key: string, identityId: string) {
    super(
      `Preference not found: key="${key}", identity="${identityId}"`,
      'PREFERENCE_NOT_FOUND',
    );
    this.name = 'PreferenceNotFoundError';
    this.key = key;
    this.identityId = identityId;
  }
}

// ─── PreferenceConflictError ─────────────────────────────────

export class PreferenceConflictError extends IdentityError {
  readonly key: string;
  readonly sources: readonly string[];

  constructor(key: string, sources: readonly string[]) {
    super(
      `Preference conflict for key "${key}" between sources: [${sources.join(', ')}]`,
      'PREFERENCE_CONFLICT',
    );
    this.name = 'PreferenceConflictError';
    this.key = key;
    this.sources = sources;
  }
}

// ─── OrganizationNotFoundError ───────────────────────────────

export class OrganizationNotFoundError extends IdentityError {
  readonly organizationId: string;

  constructor(organizationId: string) {
    super(
      `Organization not found: id="${organizationId}"`,
      'ORGANIZATION_NOT_FOUND',
    );
    this.name = 'OrganizationNotFoundError';
    this.organizationId = organizationId;
  }
}

// ─── OrganizationDuplicateError ─────────────────────────────

export class OrganizationDuplicateError extends IdentityError {
  readonly organizationName: string;

  constructor(organizationName: string) {
    super(
      `Organization already exists with name: "${organizationName}"`,
      'ORGANIZATION_DUPLICATE',
    );
    this.name = 'OrganizationDuplicateError';
    this.organizationName = organizationName;
  }
}

// ─── TeamNotFoundError ──────────────────────────────────────

export class TeamNotFoundError extends IdentityError {
  readonly teamId: string;

  constructor(teamId: string) {
    super(
      `Team not found: id="${teamId}"`,
      'TEAM_NOT_FOUND',
    );
    this.name = 'TeamNotFoundError';
    this.teamId = teamId;
  }
}

// ─── RoleNotFoundError ──────────────────────────────────────

export class RoleNotFoundError extends IdentityError {
  readonly roleId: string;

  constructor(roleId: string) {
    super(
      `Role not found: id="${roleId}"`,
      'ROLE_NOT_FOUND',
    );
    this.name = 'RoleNotFoundError';
    this.roleId = roleId;
  }
}

// ─── RoleCycleError ───────────────────────────────────────

export class RoleCycleError extends IdentityError {
  constructor(message: string) {
    super(message, 'ROLE_CYCLE_DETECTED');
    this.name = 'RoleCycleError';
  }
}

// ─── PolicyNotFoundError ────────────────────────────────────

export class PolicyNotFoundError extends IdentityError {
  readonly policyId: string;

  constructor(policyId: string) {
    super(
      `Policy not found: id="${policyId}"`,
      'POLICY_NOT_FOUND',
    );
    this.name = 'PolicyNotFoundError';
    this.policyId = policyId;
  }
}

// ─── PolicyConflictError ────────────────────────────────────

export class PolicyConflictError extends IdentityError {
  readonly policyIds: readonly string[];

  constructor(policyIds: readonly string[]) {
    super(
      `Policy conflict detected between: [${policyIds.join(', ')}]`,
      'POLICY_CONFLICT',
    );
    this.name = 'PolicyConflictError';
    this.policyIds = policyIds;
  }
}

// ─── OrganizationCycleError ───────────────────────────────────

export class OrganizationCycleError extends IdentityError {
  constructor(message: string) {
    super(message, 'ORGANIZATION_CYCLE_DETECTED');
    this.name = 'OrganizationCycleError';
  }
}

// ─── IdentityValidationError ────────────────────────────────

export class IdentityValidationError extends IdentityError {
  readonly violations: readonly string[];

  constructor(violations: readonly string[]) {
    super(
      `Identity validation failed: ${violations.join('; ')}`,
      'IDENTITY_VALIDATION_ERROR',
    );
    this.name = 'IdentityValidationError';
    this.violations = violations;
  }
}

// ─── IdentityDisposedError ──────────────────────────────────

export class IdentityDisposedError extends IdentityError {
  constructor() {
    super('Identity Runtime has been disposed', 'IDENTITY_DISPOSED');
    this.name = 'IdentityDisposedError';
  }
}
