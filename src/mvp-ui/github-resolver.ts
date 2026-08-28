/**
 * GitHub Repository Resolver — MVP UI
 * TASK-MVP-FREE-REPOSITORY-UX-001
 *
 * Validates GitHub URLs, clones public repositories to a temporary workspace,
 * enforces size/file limits, and manages cleanup.
 *
 * Security invariants:
 *   GHR-01: Only https://github.com/owner/repo URLs accepted
 *   GHR-02: No authentication — public repos only
 *   GHR-03: Shallow clone (--depth 1) to minimize download
 *   GHR-04: .git directory excluded from analysis (discovery config)
 *   GHR-05: Generated files filtered (node_modules, dist, build, coverage, .cache)
 *   GHR-06: Repository limits enforced (size, file count, file size, clone time)
 *   GHR-07: No code execution — read-only analysis
 *   GHR-08: Per-session isolation with cleanup on server shutdown
 *   GHR-09: Repository identity recorded (URL, owner, name, commit, timestamp)
 */

import { execSync } from 'node:child_process';
import { existsSync, statSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

// ═══════════════════════════════════════════════════════════════════
// ERRORS
// ═══════════════════════════════════════════════════════════════════

export class GitHubResolverError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'GitHubResolverError';
  }
}

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface RepoIdentity {
  readonly url: string;
  readonly owner: string;
  readonly name: string;
  readonly commit: string;
  readonly clonedAt: string;
}

export interface ResolveResult {
  readonly cloneId: string;
  readonly projectPath: string;
  readonly repoInfo: RepoIdentity;
}

export interface GitHubResolverConfig {
  /** Root directory for cloned repos. Defaults to /tmp/ais-repos */
  readonly cloneRoot?: string;
  /** Maximum repo disk size in bytes (default: 50MB) */
  readonly maxRepoSizeBytes?: number;
  /** Maximum number of files (default: 10,000) */
  readonly maxFileCount?: number;
  /** Maximum individual file size in bytes (default: 1MB) */
  readonly maxFileSizeBytes?: number;
  /** Maximum clone time in milliseconds (default: 60,000 = 60s) */
  readonly maxCloneTimeMs?: number;
}

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

/** Only this exact URL pattern is accepted. */
const GITHUB_URL_REGEX = /^https:\/\/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)\/?$/;

/** Directories to skip when counting files/checking size. */
const GENERATED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage', '.cache',
  '.next', '.nuxt', '.output', '__pycache__', '.venv', 'venv',
  'target', '.gradle', '.idea', '.vscode',
]);

const DEFAULT_MAX_REPO_SIZE = 50 * 1024 * 1024; // 50MB
const DEFAULT_MAX_FILE_COUNT = 10_000;
const DEFAULT_MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const DEFAULT_MAX_CLONE_TIME = 60_000; // 60s

// ═══════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════

export class GitHubResolver {
  private readonly cloneRoot: string;
  private readonly maxRepoSizeBytes: number;
  private readonly maxFileCount: number;
  private readonly maxFileSizeBytes: number;
  private readonly maxCloneTimeMs: number;

  /** Active clones tracked for cleanup: cloneId → absolute path */
  private readonly activeClones = new Map<string, string>();

  constructor(config?: GitHubResolverConfig) {
    this.cloneRoot = config?.cloneRoot ?? join(tmpdir(), 'ais-repos');
    this.maxRepoSizeBytes = config?.maxRepoSizeBytes ?? DEFAULT_MAX_REPO_SIZE;
    this.maxFileCount = config?.maxFileCount ?? DEFAULT_MAX_FILE_COUNT;
    this.maxFileSizeBytes = config?.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE;
    this.maxCloneTimeMs = config?.maxCloneTimeMs ?? DEFAULT_MAX_CLONE_TIME;

    // Ensure clone root exists
    if (!existsSync(this.cloneRoot)) {
      mkdirSync(this.cloneRoot, { recursive: true });
    }
  }

  /** Get the clone root path (for PathSecurity allowedRoots). */
  getCloneRoot(): string {
    return resolve(this.cloneRoot);
  }

  /**
   * Validate and parse a GitHub URL.
   * Returns owner and repo name if valid.
   * @throws GitHubResolverError if invalid
   */
  parseUrl(rawUrl: string): { owner: string; name: string } {
    if (!rawUrl || typeof rawUrl !== 'string') {
      throw new GitHubResolverError('GitHub URL is required', 'INVALID_URL');
    }

    const trimmed = rawUrl.trim();
    const match = GITHUB_URL_REGEX.exec(trimmed);

    if (!match) {
      throw new GitHubResolverError(
        'Invalid GitHub URL. Use format: https://github.com/owner/repo',
        'INVALID_URL',
      );
    }

    return { owner: match[1], name: match[2].replace(/\.git$/, '') };
  }

  /**
   * Resolve a GitHub URL: validate, clone, enforce limits.
   * Returns clone info for session creation.
   */
  async resolve(url: string): Promise<ResolveResult> {
    // 1. Parse and validate URL (GHR-01)
    const { owner, name } = this.parseUrl(url);

    // 2. Generate unique clone directory
    const cloneId = this.generateCloneId(owner, name);
    const cloneDir = resolve(this.cloneRoot, `${owner}--${name}--${cloneId}`);

    // Prevent clone bomb: if same URL was recently cloned, reuse
    if (existsSync(cloneDir)) {
      // Clean up stale clone and re-clone
      rmSync(cloneDir, { recursive: true, force: true });
    }

    // 3. Clone the repository (GHR-02, GHR-03)
    const cloneUrl = `https://github.com/${owner}/${name}.git`;
    const repoIdentity: { url: string; owner: string; name: string; commit: string; clonedAt: string } = {
      url: `https://github.com/${owner}/${name}`,
      owner,
      name,
      commit: '',
      clonedAt: new Date().toISOString(),
    };

    try {
      const cloneStart = Date.now();

      // GHR-03: Shallow clone
      execSync(
        `git clone --depth 1 --quiet "${cloneUrl}" "${cloneDir}"`,
        {
          timeout: this.maxCloneTimeMs,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
        },
      );

      const cloneTime = Date.now() - cloneStart;
      if (cloneTime > this.maxCloneTimeMs * 0.9) {
        // Clean up if clone took too long (even if succeeded)
        rmSync(cloneDir, { recursive: true, force: true });
        throw new GitHubResolverError(
          `Repository clone took too long (${Math.round(cloneTime / 1000)}s). ` +
          `Try a smaller repository.`,
          'CLONE_TIMEOUT',
        );
      }

      // 4. Get the commit hash (GHR-09)
      try {
        const commitHash = execSync('git rev-parse HEAD', {
          cwd: cloneDir,
          stdio: ['pipe', 'pipe', 'pipe'],
        }).toString().trim();
        repoIdentity.commit = commitHash.substring(0, 12);
      } catch {
        // Non-critical: commit hash is nice-to-have
        repoIdentity.commit = 'unknown';
      }

      // 5. Validate repository limits (GHR-06)
      this.validateRepoLimits(cloneDir);

      // 6. Track for cleanup (GHR-08)
      this.activeClones.set(cloneId, cloneDir);

      // 7. Return result
      return {
        cloneId,
        projectPath: cloneDir,
        repoInfo: repoIdentity,
      };
    } catch (err) {
      // Clean up failed clone
      if (existsSync(cloneDir)) {
        rmSync(cloneDir, { recursive: true, force: true });
      }

      if (err instanceof GitHubResolverError) throw err;

      // Detect common git errors
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('Repository not found') || errMsg.includes('does not appear to be a git repository')) {
        throw new GitHubResolverError(
          'Repository not found. Make sure the URL is correct and the repository is public.',
          'REPO_NOT_FOUND',
        );
      }
      if (errMsg.includes('could not read Username') || errMsg.includes('Authentication failed')) {
        throw new GitHubResolverError(
          'This repository appears to be private. Only public repositories are supported.',
          'REPO_PRIVATE',
        );
      }

      throw new GitHubResolverError(
        `Failed to clone repository: ${errMsg.split('\n')[0]}`,
        'CLONE_FAILED',
      );
    }
  }

  /**
   * Clean up a specific clone by ID.
   */
  cleanupClone(id: string): void {
    const cloneDir = this.activeClones.get(id);
    if (cloneDir && existsSync(cloneDir)) {
      rmSync(cloneDir, { recursive: true, force: true });
    }
    this.activeClones.delete(id);
  }

  /**
   * Clean up ALL active clones. Called on server shutdown.
   */
  cleanupAll(): void {
    for (const [, cloneDir] of this.activeClones) {
      try {
        if (existsSync(cloneDir)) {
          rmSync(cloneDir, { recursive: true, force: true });
        }
      } catch {
        // Best-effort cleanup
      }
    }
    this.activeClones.clear();
  }

  /** Get count of active clones. */
  get activeCloneCount(): number {
    return this.activeClones.size;
  }

  // ─────────────────────────────────────────────────────────────
  // PRIVATE
  // ─────────────────────────────────────────────────────────────

  /** Generate a short, unique clone ID from owner+name+timestamp. */
  private generateCloneId(owner: string, name: string): string {
    const input = `${owner}/${name}/${Date.now()}/${Math.random()}`;
    return createHash('sha256').update(input).digest('hex').substring(0, 12);
  }

  /**
   * Validate repository limits after cloning.
   * Checks total size and file count (GHR-06).
   */
  private validateRepoLimits(cloneDir: string): void {
    let totalSize = 0;
    let fileCount = 0;
    let oversizedFile = '';

    const checkDir = (dir: string, depth: number): void => {
      if (depth > 20) return; // Prevent deep recursion

      let entries: string[];
      try {
        entries = readdirSync(dir);
      } catch {
        return; // Skip unreadable directories
      }

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        try {
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            // Skip generated directories (GHR-05)
            if (!GENERATED_DIRS.has(entry)) {
              checkDir(fullPath, depth + 1);
            }
          } else if (stat.isFile()) {
            fileCount++;
            totalSize += stat.size;

            // Check individual file size
            if (stat.size > this.maxFileSizeBytes && !oversizedFile) {
              oversizedFile = fullPath;
            }
          }
        } catch {
          // Skip files we can't stat
        }
      }
    };

    checkDir(cloneDir, 0);

    if (fileCount > this.maxFileCount) {
      rmSync(cloneDir, { recursive: true, force: true });
      throw new GitHubResolverError(
        `Repository too large: ${fileCount.toLocaleString()} files (max ${this.maxFileCount.toLocaleString()}). ` +
        `Try a smaller repository.`,
        'REPO_TOO_LARGE',
      );
    }

    if (totalSize > this.maxRepoSizeBytes) {
      rmSync(cloneDir, { recursive: true, force: true });
      throw new GitHubResolverError(
        `Repository too large: ${this.formatBytes(totalSize)} (max ${this.formatBytes(this.maxRepoSizeBytes)}). ` +
        `Try a smaller repository.`,
        'REPO_TOO_LARGE',
      );
    }

    // Warn about oversized files (but don't block — they'll be excluded by discovery)
    if (oversizedFile) {
      // Log but don't throw — the file won't be analyzed anyway
      console.log(`[GitHubResolver] Note: large file skipped: ${oversizedFile}`);
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}
