/**
 * Path Security — MVP UI
 * TASK-MVP-FREE-UI-001 §28-30
 *
 * Protects against path traversal attacks on project paths.
 * Enforces demo path allowlist for demo mode.
 * Sanitizes user-provided paths before reaching InteractionService.
 *
 * Security invariants:
 *   S-01: No path traversal beyond allowed roots
 *   S-02: Demo mode restricted to demo allowlist
 *   S-03: No absolute path injection from user input
 */

import { resolve, normalize } from 'node:path';
import { existsSync, statSync } from 'node:fs';

// ═══════════════════════════════════════════════════════════════════
// ERRORS
// ═══════════════════════════════════════════════════════════════════

export class PathSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathSecurityError';
  }
}

// ═══════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════

export interface PathSecurityConfig {
  /** Allowed root directories for project paths. */
  readonly allowedRoots: readonly string[];
  /** Paths allowed in demo mode (full paths to demo projects). */
  readonly demoAllowlist: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════

export class PathSecurityService {
  private readonly allowedRoots: readonly string[];
  private readonly demoAllowlist: readonly string[];

  constructor(config: PathSecurityConfig) {
    this.allowedRoots = config.allowedRoots.map(r => resolve(r));
    this.demoAllowlist = config.demoAllowlist.map(p => resolve(p));
  }

  /**
   * Validate and sanitize a project path.
   * Resolves to absolute path, checks against allowed roots.
   * For demo mode, checks against demo allowlist.
   *
   * @returns Resolved absolute path
   * @throws PathSecurityError if path is invalid
   */
  validateProjectPath(
    rawPath: string,
    options?: { isDemo?: boolean },
  ): string {
    if (!rawPath || typeof rawPath !== 'string' || !rawPath.trim()) {
      throw new PathSecurityError('Project path is required');
    }

    // Normalize and resolve to absolute
    const normalized = normalize(rawPath.trim());
    const absolute = resolve(normalized);

    // S-03: Block obvious traversal patterns in raw input
    const traversalPatterns = ['..', '%2e%2e', '%252e', '\\', '//'];
    for (const pattern of traversalPatterns) {
      if (rawPath.includes(pattern) && !this.isAllowedRoot(absolute)) {
        throw new PathSecurityError(
          `Path contains disallowed pattern: ${pattern}`,
        );
      }
    }

    // S-02: Demo mode — must be in demo allowlist
    if (options?.isDemo) {
      const isAllowed = this.demoAllowlist.some(
        allowed => absolute === allowed || absolute.startsWith(allowed + '/'),
      );
      if (!isAllowed) {
        throw new PathSecurityError(
          `Demo path not in allowlist: ${rawPath}`,
        );
      }
      return absolute;
    }

    // S-01: Non-demo — must be under an allowed root
    const isUnderRoot = this.allowedRoots.some(
      root => absolute === root || absolute.startsWith(root + '/'),
    );
    if (!isUnderRoot) {
      throw new PathSecurityError(
        `Project path must be under an allowed root directory`,
      );
    }

    // Verify path exists and is a directory
    if (!existsSync(absolute)) {
      throw new PathSecurityError(`Project path does not exist: ${rawPath}`);
    }

    try {
      const stat = statSync(absolute);
      if (!stat.isDirectory()) {
        throw new PathSecurityError(
          `Project path is not a directory: ${rawPath}`,
        );
      }
    } catch (err) {
      if (err instanceof PathSecurityError) throw err;
      throw new PathSecurityError(
        `Cannot access project path: ${rawPath}`,
      );
    }

    return absolute;
  }

  /** Check if a resolved path is under an allowed root. */
  isAllowedRoot(resolvedPath: string): boolean {
    return this.allowedRoots.some(
      root => resolvedPath === root || resolvedPath.startsWith(root + '/'),
    );
  }

  /** Check if a resolved path is in the demo allowlist. */
  isDemoAllowed(resolvedPath: string): boolean {
    return this.demoAllowlist.some(
      allowed => resolvedPath === allowed || resolvedPath.startsWith(allowed + '/'),
    );
  }

  /** Get list of demo project names (last path component). */
  getDemoProjects(): readonly string[] {
    return this.demoAllowlist.map(p => p.split('/').filter(Boolean).pop() ?? p);
  }
}
