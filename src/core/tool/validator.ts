/**
 * Tool Validator — Validates tools before they enter the runtime.
 *
 * Conforms to: AIS-003C.000 Requirement #15 (Tool Validation)
 *
 * Checks:
 *   - Metadata completeness (name, version, capabilities, trustLevel)
 *   - Version format (semver-like MAJOR.MINOR.PATCH)
 *   - Capabilities are known values
 *   - Trust level is valid
 *   - Dependencies are registered
 */
import type { Tool, ToolMetadata, ToolValidationResult } from './types.js';
import { ToolCapability, ToolTrustLevel } from './types.js';
import type { ToolRegistry } from './tool-registry.js';

const VALID_CAPABILITIES = new Set(Object.values(ToolCapability));
const VALID_TRUST_LEVELS = new Set(Object.values(ToolTrustLevel));
const VERSION_REGEX = /^\d+\.\d+\.\d+$/;

export class ToolValidator {
  private readonly registry: ToolRegistry;

  constructor(registry: ToolRegistry) {
    this.registry = registry;
  }

  /**
   * Validate a tool's metadata and dependencies.
   * Returns a ToolValidationResult with any errors found.
   */
  validate(tool: Tool): ToolValidationResult {
    const errors: string[] = [];

    this.validateMetadata(tool.metadata, errors);
    this.validateCapabilities(tool.metadata, errors);
    this.validateTrustLevel(tool.metadata, errors);
    this.validateDependencies(tool.metadata, errors);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate metadata only (without dependency check).
   */
  validateMetadataOnly(metadata: ToolMetadata): ToolValidationResult {
    const errors: string[] = [];
    this.validateMetadata(metadata, errors);
    this.validateCapabilities(metadata, errors);
    this.validateTrustLevel(metadata, errors);
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private validateMetadata(metadata: ToolMetadata, errors: string[]): void {
    if (!metadata.name || metadata.name.trim().length === 0) {
      errors.push('Tool name must be non-empty');
    }
    if (!metadata.version || metadata.version.trim().length === 0) {
      errors.push('Tool version must be non-empty');
    } else if (!VERSION_REGEX.test(metadata.version)) {
      errors.push(`Tool version '${metadata.version}' must follow MAJOR.MINOR.PATCH format`);
    }
    if (!metadata.description || metadata.description.trim().length === 0) {
      errors.push('Tool description must be non-empty');
    }
    if (!metadata.capabilities || metadata.capabilities.length === 0) {
      errors.push('Tool must declare at least one capability');
    }
  }

  private validateCapabilities(metadata: ToolMetadata, errors: string[]): void {
    for (const cap of metadata.capabilities) {
      if (!VALID_CAPABILITIES.has(cap)) {
        errors.push(`Unknown capability '${cap}'`);
      }
    }
  }

  private validateTrustLevel(metadata: ToolMetadata, errors: string[]): void {
    if (!VALID_TRUST_LEVELS.has(metadata.trustLevel)) {
      errors.push(`Unknown trust level '${metadata.trustLevel}'`);
    }
  }

  private validateDependencies(metadata: ToolMetadata, errors: string[]): void {
    if (metadata.dependencies) {
      for (const dep of metadata.dependencies) {
        if (!this.registry.has(dep)) {
          errors.push(`Dependency '${dep}' is not registered`);
        }
      }
    }
  }
}
