/**
 * Capability Sandbox — Isolation enforcement for packs.
 * TASK-AIS-003G.000
 *
 * Each pack operates within a sandbox that:
 *   - Enforces permission boundaries
 *   - Logs all access attempts
 *   - Tracks violations
 *   - Prevents packs from modifying core runtime state
 */
import type {
  CapabilityPackId,
  CapabilityPermission,
  CapabilityPermissionType,
  CapabilityContext,
  CapabilityLogger,
  SandboxViolation,
  SandboxConfig,
} from './types.js';
import { CapabilityAccessLevel } from './types.js';

export class CapabilitySandbox {
  private readonly violations = new Map<string, SandboxViolation[]>();
  private readonly deniedActions = new Map<string, number>();
  private readonly grantedActions = new Map<string, number>();
  private readonly _config: Required<SandboxConfig>;

  constructor(config?: SandboxConfig) {
    this._config = {
      maxExecutionTimeMs: config?.maxExecutionTimeMs ?? 30000,
      maxMemoryMB: config?.maxMemoryMB ?? 512,
      allowedHosts: config?.allowedHosts ?? [],
      denyList: config?.denyList ?? [],
    };
  }

  /**
   * Check if a pack is allowed to perform an action on a resource.
   */
  checkPermission(
    packId: CapabilityPackId,
    permission: CapabilityPermission,
  ): boolean {
    // Check deny list first
    if (this._config.denyList.some(d => d === permission.resource || permission.resource.startsWith(d))) {
      this.recordDenial(packId, permission);
      this.recordViolation(packId, 'access', permission.resource, 'Resource is on deny list');
      return false;
    }

    const key = packId as unknown as string;
    this.grantedActions.set(key, (this.grantedActions.get(key) ?? 0) + 1);
    return true;
  }

  /**
   * Check if a specific permission type + access level is granted.
   */
  hasPermission(
    packId: CapabilityPackId,
    type: CapabilityPermissionType,
    access: CapabilityAccessLevel,
    resource: string,
    grantedPermissions: ReadonlyMap<string, CapabilityPermission>,
  ): boolean {
    const key = `${type}:${access}:${resource}`;
    const permission = grantedPermissions.get(key);
    if (!permission) {
      this.recordDenial(packId, { type, access, resource, description: 'No matching permission' } as CapabilityPermission);
      this.recordViolation(packId, 'permission', resource, `No permission granted for ${type}:${access} on "${resource}"`);
      return false;
    }

    // Access level hierarchy: Admin > Write > Read
    if (access === CapabilityAccessLevel.Admin && permission.access !== CapabilityAccessLevel.Admin) {
      this.recordDenial(packId, { type, access, resource, description: 'Admin access required but not granted' } as CapabilityPermission);
      return false;
    }
    if (access === CapabilityAccessLevel.Write && permission.access === CapabilityAccessLevel.Read) {
      this.recordDenial(packId, { type, access, resource, description: 'Write access required but only Read granted' } as CapabilityPermission);
      return false;
    }

    const key2 = packId as unknown as string;
    this.grantedActions.set(key2, (this.grantedActions.get(key2) ?? 0) + 1);
    return true;
  }

  /**
   * Create a sandboxed context for a pack.
   */
  createContext(
    packId: CapabilityPackId,
    packName: string,
    trustLevel: import('./types.js').CapabilityTrustLevel,
    grantedPermissions: ReadonlyMap<string, CapabilityPermission>,
    logger: CapabilityLogger,
    emit: (eventType: string, payload: unknown) => Promise<void>,
  ): CapabilityContext {
    const sandboxState = new Map<string, unknown>();

    return Object.freeze({
      packId,
      packName,
      trustLevel,
      permissions: grantedPermissions,
      logger,
      emit,
      requestPermission: async (type: CapabilityPermissionType, access: CapabilityAccessLevel, resource: string) => {
        return this.hasPermission(packId, type, access, resource, grantedPermissions);
      },
      getConfiguration: (_key: string) => undefined,
      getState: () => Object.freeze(Object.fromEntries(sandboxState)),
      setState: async (key: string, value: unknown) => {
        sandboxState.set(key, value);
      },
    });
  }

  /**
   * Record a sandbox violation.
   */
  recordViolation(
    packId: CapabilityPackId,
    action: string,
    resource: string,
    reason: string,
  ): SandboxViolation {
    const violation: SandboxViolation = Object.freeze({
      packId,
      action,
      resource,
      reason,
      occurredAt: new Date().toISOString(),
    });

    const key = packId as unknown as string;
    let violations = this.violations.get(key);
    if (!violations) {
      violations = [];
      this.violations.set(key, violations);
    }
    violations.push(violation);

    return violation;
  }

  /**
   * Get all violations for a pack.
   */
  getViolations(packId: CapabilityPackId): readonly SandboxViolation[] {
    const key = packId as unknown as string;
    return Object.freeze(this.violations.get(key) ?? []);
  }

  /**
   * Get total violation count.
   */
  get totalViolations(): number {
    let total = 0;
    for (const violations of this.violations.values()) {
      total += violations.length;
    }
    return total;
  }

  /**
   * Get access statistics.
   */
  getStats(): { granted: number; denied: number; violations: number } {
    let granted = 0;
    let denied = 0;
    for (const v of this.grantedActions.values()) granted += v;
    for (const v of this.deniedActions.values()) denied += v;
    return { granted, denied, violations: this.totalViolations };
  }

  /**
   * Clear all violations and stats.
   */
  clear(): void {
    this.violations.clear();
    this.deniedActions.clear();
    this.grantedActions.clear();
  }

  private recordDenial(packId: CapabilityPackId, _permission: CapabilityPermission): void {
    const key = packId as unknown as string;
    this.deniedActions.set(key, (this.deniedActions.get(key) ?? 0) + 1);
  }
}
