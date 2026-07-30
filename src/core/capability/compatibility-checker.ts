/**
 * Capability Compatibility Checker — Version compatibility verification.
 * TASK-AIS-003G.000
 *
 * Checks capability pack compatibility against:
 *   - Core version
 *   - Runtime version
 *   - API version
 *   - ADR version
 *   - Pack version constraints
 */
import type {
  CapabilityManifest,
  CompatibilityCheckResult,
  CompatibilityRequirements,
  ValidationIssue,
  SemVer,
} from './types.js';
import { ValidationSeverity as VSSeverity } from './types.js';

export class CompatibilityChecker {
  private readonly systemVersions: CompatibilityRequirements;

  constructor(systemVersions: CompatibilityRequirements) {
    this.systemVersions = systemVersions;
  }

  /**
   * Check compatibility of a manifest against system versions.
   */
  check(manifest: CapabilityManifest): CompatibilityCheckResult {
    const issues: ValidationIssue[] = [];

    if (manifest.coreVersion) {
      if (!this.isCompatible(manifest.coreVersion, this.systemVersions.coreVersion)) {
        issues.push({
          code: 'CORE_VERSION_INCOMPATIBLE',
          message: `Pack requires core version ${manifest.coreVersion}, system has ${this.systemVersions.coreVersion ?? 'unknown'}`,
          severity: VSSeverity.Error,
          field: 'coreVersion',
        });
      }
    }

    if (manifest.runtimeVersion) {
      if (!this.isCompatible(manifest.runtimeVersion, this.systemVersions.runtimeVersion)) {
        issues.push({
          code: 'RUNTIME_VERSION_INCOMPATIBLE',
          message: `Pack requires runtime version ${manifest.runtimeVersion}, system has ${this.systemVersions.runtimeVersion ?? 'unknown'}`,
          severity: VSSeverity.Error,
          field: 'runtimeVersion',
        });
      }
    }

    if (manifest.apiVersion) {
      if (!this.isCompatible(manifest.apiVersion, this.systemVersions.apiVersion)) {
        issues.push({
          code: 'API_VERSION_INCOMPATIBLE',
          message: `Pack requires API version ${manifest.apiVersion}, system has ${this.systemVersions.apiVersion ?? 'unknown'}`,
          severity: VSSeverity.Error,
          field: 'apiVersion',
        });
      }
    }

    if (manifest.adrVersion) {
      if (!this.isCompatible(manifest.adrVersion, this.systemVersions.adrVersion)) {
        issues.push({
          code: 'ADR_VERSION_INCOMPATIBLE',
          message: `Pack requires ADR version ${manifest.adrVersion}, system has ${this.systemVersions.adrVersion ?? 'unknown'}`,
          severity: VSSeverity.Error,
          field: 'adrVersion',
        });
      }
    }

    return {
      compatible: issues.length === 0,
      issues: Object.freeze(issues),
    };
  }

  /**
   * Check compatibility between two packs (for pack-to-pack dependencies).
   */
  checkPackCompatibility(
    requiredVersion: SemVer,
    installedVersion: SemVer,
    packName: string,
  ): CompatibilityCheckResult {
    const issues: ValidationIssue[] = [];

    if (!this.isCompatible(requiredVersion, installedVersion)) {
      issues.push({
        code: 'PACK_VERSION_INCOMPATIBLE',
        message: `Pack "${packName}" version ${requiredVersion} is not compatible with installed version ${installedVersion}`,
        severity: VSSeverity.Error,
      });
    }

    return {
      compatible: issues.length === 0,
      issues: Object.freeze(issues),
    };
  }

  /**
   * Get the current system versions (for diagnostics).
   */
  getSystemVersions(): CompatibilityRequirements {
    return this.systemVersions;
  }

  /**
   * Simple semver compatibility: same major version, required minor <= installed minor.
   */
  private isCompatible(required?: SemVer, installed?: SemVer): boolean {
    if (!required || !installed) return true;
    const reqParts = required.split('.').map(Number);
    const instParts = installed.split('.').map(Number);
    if (reqParts.length < 2 || instParts.length < 2) return true;
    if (reqParts[0] !== instParts[0]) return false;
    if (reqParts[1] > instParts[1]) return false;
    return true;
  }
}
