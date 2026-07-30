/**
 * Capability Validator — Manifest and Pack Validation.
 * TASK-AIS-003G.000
 *
 * Validates capability packs against required fields, format rules,
 * dependency declarations, permission declarations, and contract checks.
 */
import type {
  CapabilityManifest,
  CapabilityContract,
  CapabilityPack,
  ValidationIssue,
  ValidationResult,
} from './types.js';
import {
  ValidationSeverity as VSSeverity,
  CapabilityPermissionType,
  CapabilityAccessLevel,
} from './types.js';

export class CapabilityValidator {

  /**
   * Validate a manifest for required fields and format rules.
   */
  validateManifest(manifest: CapabilityManifest): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // Required fields
    if (!manifest.name || manifest.name.trim().length === 0) {
      issues.push({ code: 'MISSING_NAME', message: 'Manifest name is required', severity: VSSeverity.Error, field: 'name' });
    }
    if (manifest.name && manifest.name.length > 128) {
      issues.push({ code: 'NAME_TOO_LONG', message: 'Manifest name must not exceed 128 characters', severity: VSSeverity.Error, field: 'name' });
    }
    if (!manifest.version || manifest.version.trim().length === 0) {
      issues.push({ code: 'MISSING_VERSION', message: 'Manifest version is required', severity: VSSeverity.Error, field: 'version' });
    }
    if (manifest.version && !isValidSemVer(manifest.version)) {
      issues.push({ code: 'INVALID_VERSION', message: `Invalid semantic version: "${manifest.version}"`, severity: VSSeverity.Error, field: 'version' });
    }
    if (!manifest.description || manifest.description.trim().length === 0) {
      warnings.push({ code: 'MISSING_DESCRIPTION', message: 'Manifest description is recommended', severity: VSSeverity.Warning, field: 'description' });
    }
    if (!manifest.author || manifest.author.trim().length === 0) {
      issues.push({ code: 'MISSING_AUTHOR', message: 'Manifest author is required', severity: VSSeverity.Error, field: 'author' });
    }
    if (!manifest.checksum || manifest.checksum.trim().length === 0) {
      warnings.push({ code: 'MISSING_CHECKSUM', message: 'Checksum is recommended for integrity verification', severity: VSSeverity.Warning, field: 'checksum' });
    }

    // Dependency validation
    for (const dep of manifest.dependencies) {
      if (!dep.packId || dep.packId.trim().length === 0) {
        issues.push({ code: 'INVALID_DEPENDENCY', message: 'Dependency packId is required', severity: VSSeverity.Error, field: 'dependencies' });
      }
      if (!dep.version || !isValidSemVer(dep.version)) {
        issues.push({ code: 'INVALID_DEPENDENCY_VERSION', message: `Invalid dependency version for "${dep.name}": "${dep.version}"`, severity: VSSeverity.Error, field: 'dependencies' });
      }
    }

    // Permission validation
    for (const perm of manifest.permissions) {
      if (!Object.values(CapabilityPermissionType).includes(perm.type as any)) {
        issues.push({ code: 'INVALID_PERMISSION_TYPE', message: `Unknown permission type: "${perm.type}"`, severity: VSSeverity.Error, field: 'permissions' });
      }
      if (!Object.values(CapabilityAccessLevel).includes(perm.access as any)) {
        issues.push({ code: 'INVALID_PERMISSION_ACCESS', message: `Unknown access level: "${perm.access}"`, severity: VSSeverity.Error, field: 'permissions' });
      }
    }

    // Interface validation
    for (const iface of manifest.interfaces) {
      if (!iface.name || iface.name.trim().length === 0) {
        issues.push({ code: 'INVALID_INTERFACE', message: 'Interface name is required', severity: VSSeverity.Error, field: 'interfaces' });
      }
    }

    // Self-dependency check
    for (const dep of manifest.dependencies) {
      if (dep.packId === manifest.packId) {
        issues.push({ code: 'SELF_DEPENDENCY', message: `Pack "${manifest.name}" depends on itself`, severity: VSSeverity.Error, field: 'dependencies' });
      }
    }

    return {
      valid: issues.length === 0,
      issues: Object.freeze(issues),
      warnings: Object.freeze(warnings),
    };
  }

  /**
   * Validate that a contract implements all required methods.
   */
  validateContract(contract: CapabilityContract, manifestName: string): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    const requiredMethods = ['initialize', 'shutdown', 'health', 'metadata', 'capabilities'] as const;
    const contractMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(contract)).filter(m => m !== 'constructor');

    for (const method of requiredMethods) {
      if (typeof (contract as any)[method] !== 'function') {
        issues.push({
          code: 'MISSING_CONTRACT_METHOD',
          message: `Contract for "${manifestName}" missing required method: "${method}"`,
          severity: VSSeverity.Error,
          field: method,
        });
      }
    }

    if (contractMethods.length === 0) {
      warnings.push({
        code: 'EMPTY_CONTRACT',
        message: `Contract for "${manifestName}" has no methods beyond required lifecycle`,
        severity: VSSeverity.Warning,
      });
    }

    return {
      valid: issues.length === 0,
      issues: Object.freeze(issues),
      warnings: Object.freeze(warnings),
    };
  }

  /**
   * Validate a complete pack (manifest + contract).
   */
  validatePack(pack: CapabilityPack, contract?: CapabilityContract): ValidationResult {
    const manifestResult = this.validateManifest(pack.manifest);
    if (contract) {
      const contractResult = this.validateContract(contract, pack.name);
      return {
        valid: manifestResult.valid && contractResult.valid,
        issues: Object.freeze([...manifestResult.issues, ...contractResult.issues]),
        warnings: Object.freeze([...manifestResult.warnings, ...contractResult.warnings]),
      };
    }
    return manifestResult;
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function isValidSemVer(version: string): boolean {
  const pattern = /^\d+\.\d+(\.\d+)?(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/;
  return pattern.test(version);
}
