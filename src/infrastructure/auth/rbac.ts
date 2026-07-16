import type { Role, Permission, AuthenticatedUser } from './types.js';
import { ROLE_PERMISSIONS } from './types.js';

export class RbacEngine {
  /** Check if a user has a specific permission */
  hasPermission(user: AuthenticatedUser, permission: Permission): boolean {
    return user.permissions.includes(permission);
  }

  /** Check if a user has any of the specified permissions */
  hasAnyPermission(user: AuthenticatedUser, permissions: Permission[]): boolean {
    return permissions.some(p => user.permissions.includes(p));
  }

  /** Check if a user has all specified permissions */
  hasAllPermissions(user: AuthenticatedUser, permissions: Permission[]): boolean {
    return permissions.every(p => user.permissions.includes(p));
  }

  /** Check if a user has a specific role */
  hasRole(user: AuthenticatedUser, role: Role): boolean {
    return user.roles.includes(role);
  }

  /** Get all permissions for a set of roles */
  getPermissionsForRoles(roles: Role[]): Permission[] {
    const perms = new Set<Permission>();
    for (const role of roles) {
      for (const perm of ROLE_PERMISSIONS[role] ?? []) {
        perms.add(perm);
      }
    }
    return [...perms];
  }

  /** Check access and throw if denied */
  requirePermission(user: AuthenticatedUser, permission: Permission): void {
    if (!this.hasPermission(user, permission)) {
      throw new AccessDeniedError(permission, user.roles);
    }
  }

  /** Check role access and throw if denied */
  requireRole(user: AuthenticatedUser, role: Role): void {
    if (!this.hasRole(user, role)) {
      throw new AccessDeniedError(`role:${role}`, user.roles);
    }
  }
}

export class AccessDeniedError extends Error {
  constructor(public readonly permission: string, public readonly roles: Role[]) {
    super(`Access denied: permission "${permission}" required. User roles: ${roles.join(', ')}`);
    this.name = 'AccessDeniedError';
  }
}
