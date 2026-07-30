/**
 * Workflow Runtime — Version Manager
 * TASK-AIS-003H.000
 *
 * Manages workflow definition versions:
 *   - Register versions
 *   - Query version history
 *   - Migrate between versions
 *   - Check compatibility
 */

import type {
  WorkflowDefinition,
  WorkflowVersionInfo,
  WorkflowVersionId,
  WorkflowId,
  SemVer,
  WorkflowMigrationResult,
} from './types.js';
import { brandWorkflowVersionId } from './types.js';

export class WorkflowVersionManager {
  private readonly versions = new Map<WorkflowId, WorkflowVersionInfo[]>();
  private readonly activeVersions = new Map<WorkflowId, WorkflowVersionId>();

  /**
   * Register a new version of a workflow definition.
   */
  registerVersion(definition: WorkflowDefinition): WorkflowVersionInfo {
    const versions = this.versions.get(definition.id) ?? [];
    const isActive = versions.length === 0;

    const versionInfo: WorkflowVersionInfo = Object.freeze({
      id: brandWorkflowVersionId(crypto.randomUUID()),
      workflowId: definition.id,
      version: definition.version,
      definition,
      createdAt: new Date().toISOString(),
      isActive,
      changelog: `Version ${definition.version} registered`,
    });

    versions.push(versionInfo);
    this.versions.set(definition.id, versions);

    if (isActive) {
      this.activeVersions.set(definition.id, versionInfo.id);
    }

    return versionInfo;
  }

  /**
   * Get a specific version of a workflow.
   */
  getVersion(workflowId: WorkflowId, version: SemVer): WorkflowVersionInfo | null {
    const versions = this.versions.get(workflowId);
    if (!versions) return null;
    return versions.find(v => v.version === version) ?? null;
  }

  /**
   * Get the latest version of a workflow.
   */
  getLatestVersion(workflowId: WorkflowId): WorkflowVersionInfo | null {
    const versions = this.versions.get(workflowId);
    if (!versions || versions.length === 0) return null;
    return versions[versions.length - 1];
  }

  /**
   * Get all versions of a workflow.
   */
  getVersions(workflowId: WorkflowId): readonly WorkflowVersionInfo[] {
    return this.versions.get(workflowId) ?? [];
  }

  /**
   * Get the active version of a workflow.
   */
  getActiveVersion(workflowId: WorkflowId): WorkflowVersionInfo | null {
    const activeId = this.activeVersions.get(workflowId);
    if (!activeId) return null;
    const versions = this.versions.get(workflowId);
    if (!versions) return null;
    return versions.find(v => v.id === activeId) ?? null;
  }

  /**
   * Set the active version of a workflow.
   */
  setActiveVersion(workflowId: WorkflowId, version: SemVer): boolean {
    const versions = this.versions.get(workflowId);
    if (!versions) return false;
    const versionInfo = versions.find(v => v.version === version);
    if (!versionInfo) return false;
    this.activeVersions.set(workflowId, versionInfo.id);
    return true;
  }

  /**
   * Compare two versions and return migration requirements.
   */
  compareVersions(from: SemVer, to: SemVer): WorkflowMigrationResult {
    const fromParts = from.split('.').map(Number);
    const toParts = to.split('.').map(Number);

    const changes: string[] = [];
    const errors: string[] = [];

    if (fromParts[0] !== toParts[0]) {
      changes.push(`Major version change: ${from} → ${to}`);
      errors.push(`Major version migrations require manual intervention`);
    } else if (fromParts[1] !== toParts[1]) {
      changes.push(`Minor version change: ${from} → ${to}`);
    } else if (fromParts[2] !== toParts[2]) {
      changes.push(`Patch version change: ${from} → ${to}`);
    }

    return Object.freeze({
      fromVersion: from,
      toVersion: to,
      migrated: errors.length === 0,
      changes,
      errors,
    });
  }

  /**
   * Check if an instance at a given version can be upgraded to a target version.
   */
  canUpgrade(from: SemVer, to: SemVer): boolean {
    const fromParts = from.split('.').map(Number);
    const toParts = to.split('.').map(Number);

    // Cannot downgrade
    if (fromParts[0] > toParts[0]) return false;
    if (fromParts[0] === toParts[0] && fromParts[1] > toParts[1]) return false;
    if (
      fromParts[0] === toParts[0] &&
      fromParts[1] === toParts[1] &&
      fromParts[2] > toParts[2]
    ) return false;

    return true;
  }

  clear(): void {
    this.versions.clear();
    this.activeVersions.clear();
  }
}
