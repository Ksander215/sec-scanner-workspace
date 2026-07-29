/**
 * CompatibilityChecker — Unit Tests
 * TASK-AIS-003G.000
 *
 * Covers: check, checkPackCompatibility, getSystemVersions
 * Scenarios: compatible manifests, each version axis incompatible, multiple incompatibilities,
 *           missing system versions, edge-case version formats
 */

import { CompatibilityChecker } from '../../../core/capability/compatibility-checker.js';
import type { CapabilityManifest, CompatibilityCheckResult } from '../../../core/capability/types.js';
import { CapabilityTrustLevel } from '../../../core/capability/types.js';

// ─── Helpers ──────────────────────────────────────────────────

function createManifest(overrides: Partial<CapabilityManifest> = {}): CapabilityManifest {
  return Object.freeze({
    id: crypto.randomUUID() as any,
    packId: crypto.randomUUID() as any,
    name: 'test-pack',
    version: '1.0.0',
    description: 'Test',
    author: 'test',
    license: 'MIT',
    keywords: [],
    dependencies: [],
    interfaces: [],
    permissions: [],
    trustLevel: CapabilityTrustLevel.Trusted,
    policies: [],
    exports: [],
    checksum: '',
    coreVersion: undefined,
    runtimeVersion: undefined,
    apiVersion: undefined,
    adrVersion: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {},
    ...overrides,
  });
}

// ═══════════════════════════════════════════════════════════════════
// 1. Compatible manifest (3 tests)
// ═══════════════════════════════════════════════════════════════════

describe('CompatibilityChecker — compatible manifest', () => {
  it('should return compatible=true when all versions match exactly', () => {
    const checker = new CompatibilityChecker({
      coreVersion: '1.0.0',
      runtimeVersion: '2.0.0',
      apiVersion: '3.0.0',
      adrVersion: '4.0.0',
    });
    const manifest = createManifest({
      coreVersion: '1.0.0',
      runtimeVersion: '2.0.0',
      apiVersion: '3.0.0',
      adrVersion: '4.0.0',
    });

    const result = checker.check(manifest);

    expect(result.compatible).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should return compatible=true when installed minor >= required minor', () => {
    const checker = new CompatibilityChecker({
      coreVersion: '1.5.0',
      runtimeVersion: '2.3.0',
    });
    const manifest = createManifest({
      coreVersion: '1.2.0',
      runtimeVersion: '2.0.0',
    });

    const result = checker.check(manifest);

    expect(result.compatible).toBe(true);
  });

  it('should return compatible=true for a manifest with no version requirements', () => {
    const checker = new CompatibilityChecker({
      coreVersion: '1.0.0',
      runtimeVersion: '2.0.0',
    });
    const manifest = createManifest();

    const result = checker.check(manifest);

    expect(result.compatible).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. Core version incompatible (3 tests)
// ═══════════════════════════════════════════════════════════════════

describe('CompatibilityChecker — core version incompatible', () => {
  it('should report incompatible when major versions differ', () => {
    const checker = new CompatibilityChecker({ coreVersion: '2.0.0' });
    const manifest = createManifest({ coreVersion: '1.0.0' });

    const result = checker.check(manifest);

    expect(result.compatible).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].code).toBe('CORE_VERSION_INCOMPATIBLE');
    expect(result.issues[0].field).toBe('coreVersion');
  });

  it('should report incompatible when required minor > installed minor', () => {
    const checker = new CompatibilityChecker({ coreVersion: '1.2.0' });
    const manifest = createManifest({ coreVersion: '1.5.0' });

    const result = checker.check(manifest);

    expect(result.compatible).toBe(false);
    expect(result.issues[0].code).toBe('CORE_VERSION_INCOMPATIBLE');
  });

  it('should include system version in the error message', () => {
    const checker = new CompatibilityChecker({ coreVersion: '1.0.0' });
    const manifest = createManifest({ coreVersion: '2.0.0' });

    const result = checker.check(manifest);

    expect(result.issues[0].message).toContain('2.0.0');
    expect(result.issues[0].message).toContain('1.0.0');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. Runtime version incompatible (3 tests)
// ═══════════════════════════════════════════════════════════════════

describe('CompatibilityChecker — runtime version incompatible', () => {
  it('should report incompatible when major versions differ', () => {
    const checker = new CompatibilityChecker({ runtimeVersion: '1.0.0' });
    const manifest = createManifest({ runtimeVersion: '3.0.0' });

    const result = checker.check(manifest);

    expect(result.compatible).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].code).toBe('RUNTIME_VERSION_INCOMPATIBLE');
    expect(result.issues[0].field).toBe('runtimeVersion');
  });

  it('should report incompatible when required minor > installed minor', () => {
    const checker = new CompatibilityChecker({ runtimeVersion: '2.1.0' });
    const manifest = createManifest({ runtimeVersion: '2.8.0' });

    const result = checker.check(manifest);

    expect(result.compatible).toBe(false);
    expect(result.issues[0].code).toBe('RUNTIME_VERSION_INCOMPATIBLE');
  });

  it('should include both versions in the error message', () => {
    const checker = new CompatibilityChecker({ runtimeVersion: '2.0.0' });
    const manifest = createManifest({ runtimeVersion: '1.0.0' });

    const result = checker.check(manifest);

    expect(result.issues[0].message).toContain('1.0.0');
    expect(result.issues[0].message).toContain('2.0.0');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. API version incompatible (3 tests)
// ═══════════════════════════════════════════════════════════════════

describe('CompatibilityChecker — API version incompatible', () => {
  it('should report incompatible when major versions differ', () => {
    const checker = new CompatibilityChecker({ apiVersion: '1.0.0' });
    const manifest = createManifest({ apiVersion: '5.0.0' });

    const result = checker.check(manifest);

    expect(result.compatible).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].code).toBe('API_VERSION_INCOMPATIBLE');
    expect(result.issues[0].field).toBe('apiVersion');
  });

  it('should report incompatible when required minor > installed minor', () => {
    const checker = new CompatibilityChecker({ apiVersion: '1.0.0' });
    const manifest = createManifest({ apiVersion: '1.9.0' });

    const result = checker.check(manifest);

    expect(result.compatible).toBe(false);
    expect(result.issues[0].code).toBe('API_VERSION_INCOMPATIBLE');
  });

  it('should include descriptive message for API version mismatch', () => {
    const checker = new CompatibilityChecker({ apiVersion: '3.2.0' });
    const manifest = createManifest({ apiVersion: '3.5.0' });

    const result = checker.check(manifest);

    expect(result.issues[0].message).toContain('3.5.0');
    expect(result.issues[0].message).toContain('3.2.0');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. ADR version incompatible (3 tests)
// ═══════════════════════════════════════════════════════════════════

describe('CompatibilityChecker — ADR version incompatible', () => {
  it('should report incompatible when major versions differ', () => {
    const checker = new CompatibilityChecker({ adrVersion: '2.0.0' });
    const manifest = createManifest({ adrVersion: '1.0.0' });

    const result = checker.check(manifest);

    expect(result.compatible).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].code).toBe('ADR_VERSION_INCOMPATIBLE');
    expect(result.issues[0].field).toBe('adrVersion');
  });

  it('should report incompatible when required minor > installed minor', () => {
    const checker = new CompatibilityChecker({ adrVersion: '1.0.0' });
    const manifest = createManifest({ adrVersion: '1.4.0' });

    const result = checker.check(manifest);

    expect(result.compatible).toBe(false);
    expect(result.issues[0].code).toBe('ADR_VERSION_INCOMPATIBLE');
  });

  it('should include both versions in ADR error message', () => {
    const checker = new CompatibilityChecker({ adrVersion: '1.0.0' });
    const manifest = createManifest({ adrVersion: '1.5.0' });

    const result = checker.check(manifest);

    expect(result.issues[0].message).toContain('1.5.0');
    expect(result.issues[0].message).toContain('1.0.0');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. Multiple incompatibilities (2 tests)
// ═══════════════════════════════════════════════════════════════════

describe('CompatibilityChecker — multiple incompatibilities', () => {
  it('should report multiple issues when several versions are incompatible', () => {
    const checker = new CompatibilityChecker({
      coreVersion: '1.0.0',
      runtimeVersion: '2.0.0',
      apiVersion: '3.0.0',
    });
    const manifest = createManifest({
      coreVersion: '2.0.0',
      runtimeVersion: '1.0.0',
      apiVersion: '4.0.0',
    });

    const result = checker.check(manifest);

    expect(result.compatible).toBe(false);
    expect(result.issues).toHaveLength(3);
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain('CORE_VERSION_INCOMPATIBLE');
    expect(codes).toContain('RUNTIME_VERSION_INCOMPATIBLE');
    expect(codes).toContain('API_VERSION_INCOMPATIBLE');
  });

  it('should report all four axes incompatible simultaneously', () => {
    const checker = new CompatibilityChecker({
      coreVersion: '1.0.0',
      runtimeVersion: '1.0.0',
      apiVersion: '1.0.0',
      adrVersion: '1.0.0',
    });
    const manifest = createManifest({
      coreVersion: '2.0.0',
      runtimeVersion: '2.0.0',
      apiVersion: '2.0.0',
      adrVersion: '2.0.0',
    });

    const result = checker.check(manifest);

    expect(result.compatible).toBe(false);
    expect(result.issues).toHaveLength(4);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 7. No version requirements on manifest (2 tests)
// ═══════════════════════════════════════════════════════════════════

describe('CompatibilityChecker — no version requirements on manifest', () => {
  it('should be compatible when manifest has no version fields', () => {
    const checker = new CompatibilityChecker({
      coreVersion: '1.0.0',
      runtimeVersion: '2.0.0',
      apiVersion: '3.0.0',
      adrVersion: '4.0.0',
    });
    const manifest = createManifest();

    const result = checker.check(manifest);

    expect(result.compatible).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should be compatible when only some version fields are set on manifest', () => {
    const checker = new CompatibilityChecker({
      coreVersion: '1.0.0',
      runtimeVersion: '2.0.0',
    });
    const manifest = createManifest({ coreVersion: '1.0.0' });

    const result = checker.check(manifest);

    expect(result.compatible).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 8. Unknown system version (2 tests)
// ═══════════════════════════════════════════════════════════════════


describe('CompatibilityChecker — unknown system version', () => {
  it('should treat unknown system version as compatible (skips check)', () => {
    const checker = new CompatibilityChecker({});
    const manifest = createManifest({ coreVersion: '1.0.0' });

    const result = checker.check(manifest);

    // When the system version is undefined, isCompatible returns true (skips check)
    expect(result.compatible).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should treat all unknown system versions as compatible', () => {
    const checker = new CompatibilityChecker({});
    const manifest = createManifest({
      coreVersion: '1.0.0',
      apiVersion: '2.0.0',
    });

    const result = checker.check(manifest);

    // Missing system versions are treated as compatible (no-op)
    expect(result.compatible).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 9. checkPackCompatibility (5 tests)
// ═══════════════════════════════════════════════════════════════════

describe('CompatibilityChecker — checkPackCompatibility', () => {
  let checker: CompatibilityChecker;

  beforeEach(() => {
    checker = new CompatibilityChecker({ coreVersion: '1.0.0' });
  });

  it('should return compatible when versions match', () => {
    const result = checker.checkPackCompatibility('1.0.0', '1.0.0', 'test-pack');

    expect(result.compatible).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should return compatible when installed minor >= required minor', () => {
    const result = checker.checkPackCompatibility('1.2.0', '1.5.0', 'test-pack');

    expect(result.compatible).toBe(true);
  });

  it('should return incompatible when major versions differ', () => {
    const result = checker.checkPackCompatibility('2.0.0', '1.0.0', 'my-pack');

    expect(result.compatible).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].code).toBe('PACK_VERSION_INCOMPATIBLE');
  });

  it('should include pack name in the error message', () => {
    const result = checker.checkPackCompatibility('1.5.0', '1.0.0', 'important-pack');

    expect(result.compatible).toBe(false);
    expect(result.issues[0].message).toContain('important-pack');
  });

  it('should include both versions in the pack compatibility error message', () => {
    const result = checker.checkPackCompatibility('1.9.0', '1.3.0', 'some-pack');

    expect(result.compatible).toBe(false);
    expect(result.issues[0].message).toContain('1.9.0');
    expect(result.issues[0].message).toContain('1.3.0');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 10. getSystemVersions (1 test)
// ═══════════════════════════════════════════════════════════════════

describe('CompatibilityChecker — getSystemVersions', () => {
  it('should return the system versions passed to the constructor', () => {
    const versions = {
      coreVersion: '1.2.0',
      runtimeVersion: '2.3.0',
      apiVersion: '3.4.0',
      adrVersion: '4.5.0',
    };
    const checker = new CompatibilityChecker(versions);

    const result = checker.getSystemVersions();

    expect(result).toEqual(versions);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 11. Version format edge cases (5 tests)
// ═══════════════════════════════════════════════════════════════════

describe('CompatibilityChecker — version format edge cases', () => {
  it('should treat "1.0" (two-part) as compatible with "1.0.0" (three-part)', () => {
    const checker = new CompatibilityChecker({ coreVersion: '1.0' });
    const manifest = createManifest({ coreVersion: '1.0.0' });

    const result = checker.check(manifest);

    expect(result.compatible).toBe(true);
  });

  it('should treat "1.0.0" (three-part) as compatible with "1.0" (two-part)', () => {
    const checker = new CompatibilityChecker({ coreVersion: '1.0.0' });
    const manifest = createManifest({ coreVersion: '1.0' });

    const result = checker.check(manifest);

    expect(result.compatible).toBe(true);
  });

  it('should detect major mismatch: "2.0.0" required vs "1.3.0" installed', () => {
    const checker = new CompatibilityChecker({ coreVersion: '1.3.0' });
    const manifest = createManifest({ coreVersion: '2.0.0' });

    const result = checker.check(manifest);

    expect(result.compatible).toBe(false);
    expect(result.issues[0].code).toBe('CORE_VERSION_INCOMPATIBLE');
  });

  it('should detect minor mismatch: required 1.5 vs installed 1.3', () => {
    const checker = new CompatibilityChecker({ coreVersion: '1.3.0' });
    const manifest = createManifest({ coreVersion: '1.5.0' });

    const result = checker.check(manifest);

    expect(result.compatible).toBe(false);
  });

  it('should accept patch version differences within same major.minor', () => {
    const checker = new CompatibilityChecker({ coreVersion: '1.2.0' });
    const manifest = createManifest({ coreVersion: '1.2.9' });

    const result = checker.check(manifest);

    // Same major (1) and minor (2): compatible
    expect(result.compatible).toBe(true);
  });
});
