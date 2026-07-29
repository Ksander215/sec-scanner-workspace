import {
  CapabilityError,
  CapabilityPackNotFoundError,
  CapabilityPackDuplicateError,
  CapabilityStateError,
  CapabilityValidationError,
  CapabilityDependencyError,
  CapabilityCompatibilityError,
  CapabilitySandboxError,
  CapabilityPermissionDeniedError,
  CapabilityManifestError,
  CapabilityContractError,
  CapabilityDisposedError,
  CapabilityChecksumError,
} from '../../../core/capability/errors.js';

describe('CapabilityError', () => {
  it('has name CapabilityError', () => {
    const err = new CapabilityError('test', 'TEST_CODE');
    expect(err.name).toBe('CapabilityError');
  });

  it('has correct code', () => {
    const err = new CapabilityError('msg', 'CODE_123');
    expect(err.code).toBe('CODE_123');
  });

  it('is instanceof Error', () => {
    expect(new CapabilityError('m', 'c') instanceof Error).toBe(true);
  });
});

describe('CapabilityPackNotFoundError', () => {
  it('has correct name and code', () => {
    const err = new CapabilityPackNotFoundError('pack-123');
    expect(err.name).toBe('CapabilityPackNotFoundError');
    expect(err.code).toBe('CAPABILITY_PACK_NOT_FOUND');
    expect(err.packId).toBe('pack-123');
  });
});

describe('CapabilityPackDuplicateError', () => {
  it('has correct name and code', () => {
    const err = new CapabilityPackDuplicateError('my-pack');
    expect(err.name).toBe('CapabilityPackDuplicateError');
    expect(err.code).toBe('CAPABILITY_PACK_DUPLICATE');
    expect(err.packName).toBe('my-pack');
  });
});

describe('CapabilityStateError', () => {
  it('has correct properties', () => {
    const err = new CapabilityStateError('p1', 'Active', 'Registered');
    expect(err.name).toBe('CapabilityStateError');
    expect(err.code).toBe('CAPABILITY_STATE_ERROR');
    expect(err.packId).toBe('p1');
    expect(err.current).toBe('Active');
    expect(err.target).toBe('Registered');
  });
});

describe('CapabilityValidationError', () => {
  it('has correct properties', () => {
    const err = new CapabilityValidationError('pack-name', ['issue1', 'issue2']);
    expect(err.name).toBe('CapabilityValidationError');
    expect(err.code).toBe('CAPABILITY_VALIDATION_ERROR');
    expect(err.issues).toEqual(['issue1', 'issue2']);
  });
});

describe('CapabilityDependencyError', () => {
  it('has correct properties', () => {
    const err = new CapabilityDependencyError(['dep-a'], ['cycle-b'], ['conflict-c']);
    expect(err.name).toBe('CapabilityDependencyError');
    expect(err.code).toBe('CAPABILITY_DEPENDENCY_ERROR');
    expect(err.missingDependencies).toEqual(['dep-a']);
    expect(err.cycles).toEqual(['cycle-b']);
    expect(err.conflicts).toEqual(['conflict-c']);
  });
});

describe('CapabilityCompatibilityError', () => {
  it('has correct properties', () => {
    const err = new CapabilityCompatibilityError('pack', ['issue']);
    expect(err.name).toBe('CapabilityCompatibilityError');
    expect(err.code).toBe('CAPABILITY_COMPATIBILITY_ERROR');
    expect(err.issues).toEqual(['issue']);
  });
});

describe('CapabilitySandboxError', () => {
  it('has correct properties', () => {
    const err = new CapabilitySandboxError('p1', 'write', 'core', 'Forbidden');
    expect(err.name).toBe('CapabilitySandboxError');
    expect(err.code).toBe('CAPABILITY_SANDBOX_VIOLATION');
    expect(err.packId).toBe('p1');
    expect(err.action).toBe('write');
    expect(err.resource).toBe('core');
  });
});

describe('CapabilityPermissionDeniedError', () => {
  it('has correct properties', () => {
    const err = new CapabilityPermissionDeniedError('p1', 'Memory', 'context');
    expect(err.name).toBe('CapabilityPermissionDeniedError');
    expect(err.code).toBe('CAPABILITY_PERMISSION_DENIED');
    expect(err.packId).toBe('p1');
    expect(err.permissionType).toBe('Memory');
    expect(err.resource).toBe('context');
  });
});

describe('CapabilityManifestError', () => {
  it('has correct properties', () => {
    const err = new CapabilityManifestError('name', 'Empty name');
    expect(err.name).toBe('CapabilityManifestError');
    expect(err.code).toBe('CAPABILITY_MANIFEST_ERROR');
    expect(err.field).toBe('name');
  });
});

describe('CapabilityContractError', () => {
  it('has correct properties', () => {
    const err = new CapabilityContractError('initialize');
    expect(err.name).toBe('CapabilityContractError');
    expect(err.code).toBe('CAPABILITY_CONTRACT_ERROR');
    expect(err.method).toBe('initialize');
  });
});

describe('CapabilityDisposedError', () => {
  it('has correct properties', () => {
    const err = new CapabilityDisposedError();
    expect(err.name).toBe('CapabilityDisposedError');
    expect(err.code).toBe('CAPABILITY_DISPOSED');
  });
});

describe('CapabilityChecksumError', () => {
  it('has correct properties', () => {
    const err = new CapabilityChecksumError('p1', 'abc', 'xyz');
    expect(err.name).toBe('CapabilityChecksumError');
    expect(err.code).toBe('CAPABILITY_CHECKSUM_ERROR');
    expect(err.packId).toBe('p1');
    expect(err.expected).toBe('abc');
    expect(err.actual).toBe('xyz');
  });
});
