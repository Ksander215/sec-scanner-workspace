/**
 * Discovery Engine — Scope Manager
 *
 * Determines whether a URL or path is within the discovery scope.
 * Supports include/exclude lists, wildcards, regex, hostname filtering,
 * depth limits, and extension filters.
 *
 * Rules are evaluated in order:
 * 1. Hostname filter (hard boundary)
 * 2. Include rules (must match at least one, if defined)
 * 3. Exclude rules (must NOT match any)
 * 4. Depth limit
 * 5. Extension filter
 */

import type { ScopeRule, ScopeMatchType } from './discovery-types.ts';

// ─── Scope Configuration ─────────────────────────────────────

export interface DiscoveryScopeConfig {
  /** Allowed hostnames (empty = allow all). */
  readonly allowedHostnames?: readonly string[];
  /** Include rules (empty = include all). */
  readonly includeRules?: readonly ScopeRule[];
  /** Exclude rules. */
  readonly excludeRules?: readonly ScopeRule[];
  /** Maximum crawl depth. 0 = unlimited. */
  readonly maxDepth: number;
  /** Maximum total URLs. 0 = unlimited. */
  readonly maxUrls: number;
  /** Allowed file extensions (empty = all). Empty string = no extension (directories). */
  readonly allowedExtensions?: readonly string[];
  /** Blocked file extensions (images, fonts, etc.). */
  readonly blockedExtensions?: readonly string[];
  /** Whether to follow redirects out of scope. */
  readonly followRedirects: boolean;
  /** Maximum redirects per URL. */
  readonly maxRedirects: number;
}

export const DEFAULT_DISCOVERY_SCOPE: DiscoveryScopeConfig = Object.freeze({
  allowedHostnames: [],
  includeRules: [],
  excludeRules: [],
  maxDepth: 5,
  maxUrls: 0,
  allowedExtensions: [],
  blockedExtensions: [
    '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.webp', '.bmp',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.mp3', '.mp4', '.avi', '.mov', '.wmv',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.zip', '.tar', '.gz', '.rar', '.7z',
  ],
  followRedirects: true,
  maxRedirects: 10,
} as const);

// ─── Scope Manager ───────────────────────────────────────────

/**
 * Evaluates scope rules for discovered URLs.
 * Stateless and pure — all rules are compiled at construction.
 */
export class ScopeManager {
  private readonly allowedHostnames: ReadonlySet<string>;
  private readonly includeRules: readonly CompiledRule[];
  private readonly excludeRules: readonly CompiledRule[];
  private readonly blockedExtensions: ReadonlySet<string>;
  private readonly allowedExtensions: ReadonlySet<string> | null;
  private readonly maxDepth: number;
  private readonly maxUrls: number;
  private readonly followRedirects: boolean;
  private readonly maxRedirects: number;
  private _urlCount = 0;

  constructor(config: DiscoveryScopeConfig = DEFAULT_DISCOVERY_SCOPE) {
    this.allowedHostnames = new Set(
      (config.allowedHostnames ?? []).map(h => h.toLowerCase()),
    );
    this.includeRules = (config.includeRules ?? []).map(compileRule);
    this.excludeRules = (config.excludeRules ?? []).map(compileRule);
    this.blockedExtensions = new Set(
      (config.blockedExtensions ?? DEFAULT_DISCOVERY_SCOPE.blockedExtensions).map(e => e.toLowerCase()),
    );
    this.allowedExtensions = config.allowedExtensions?.length
      ? new Set(config.allowedExtensions.map(e => e.toLowerCase()))
      : null; // null = all allowed
    this.maxDepth = config.maxDepth;
    this.maxUrls = config.maxUrls;
    this.followRedirects = config.followRedirects;
    this.maxRedirects = config.maxRedirects;
  }

  /**
   * Check if a URL is within scope.
   * @returns true if the URL should be crawled.
   */
  isInScope(url: string, depth: number): boolean {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return false;
    }

    // 1. Hostname filter
    if (this.allowedHostnames.size > 0) {
      if (!this.allowedHostnames.has(parsed.hostname.toLowerCase())) {
        return false;
      }
    }

    // 2. Extension filter (blocked)
    const ext = getExtension(parsed.pathname);
    if (ext && this.blockedExtensions.has(ext.toLowerCase())) {
      return false;
    }

    // 3. Extension filter (allowed — if defined)
    if (this.allowedExtensions !== null) {
      if (ext && !this.allowedExtensions.has(ext.toLowerCase()) && ext !== '') {
        return false;
      }
    }

    // 4. Depth limit
    if (this.maxDepth > 0 && depth > this.maxDepth) {
      return false;
    }

    // 5. URL count limit
    if (this.maxUrls > 0 && this._urlCount >= this.maxUrls) {
      return false;
    }

    // 6. Include rules (must match at least one if defined)
    if (this.includeRules.length > 0) {
      const fullPath = parsed.pathname + parsed.search;
      if (!this.includeRules.some(r => r.test(fullPath, parsed.hostname))) {
        return false;
      }
    }

    // 7. Exclude rules (must NOT match any)
    if (this.excludeRules.length > 0) {
      const fullPath = parsed.pathname + parsed.search;
      if (this.excludeRules.some(r => r.test(fullPath, parsed.hostname))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Mark a URL as counted against maxUrls.
   * Call after confirming isInScope.
   */
  countUrl(): void {
    this._urlCount++;
  }

  /** Current URL count. */
  get urlCount(): number {
    return this._urlCount;
  }

  /** Whether more URLs can be accepted. */
  get hasCapacity(): boolean {
    return this.maxUrls === 0 || this._urlCount < this.maxUrls;
  }

  get shouldFollowRedirects(): boolean {
    return this.followRedirects;
  }

  getMaxRedirects(): number {
    return this.maxRedirects;
  }

  /**
   * Check if a URL's hostname is in scope (without full path check).
   */
  isHostnameInScope(url: string): boolean {
    try {
      const parsed = new URL(url);
      return this.allowedHostnames.size === 0 ||
        this.allowedHostnames.has(parsed.hostname.toLowerCase());
    } catch {
      return false;
    }
  }
}

// ─── Rule Compilation ────────────────────────────────────────

interface CompiledRule {
  readonly matchType: ScopeMatchType;
  readonly test: (path: string, hostname: string) => boolean;
}

function compileRule(rule: ScopeRule): CompiledRule {
  switch (rule.matchType) {
    case 'regex':
      return {
        matchType: 'regex',
        test: (_path, _hostname) => {
          // Reuse compiled regex if available
          if (rule.regex) {
            return rule.regex.test(_path);
          }
          try {
            const re = new RegExp(rule.pattern);
            return re.test(_path);
          } catch {
            return false;
          }
        },
      };

    case 'exact':
      return {
        matchType: 'exact',
        test: (path) => path === rule.pattern,
      };

    case 'wildcard': {
      // Convert wildcard to regex: * → .*, ? → .
      const regexStr = escapeRegex(rule.pattern)
        .replace(/\\\*/g, '.*')
        .replace(/\\\?/g, '.');
      const re = new RegExp(`^${regexStr}$`, 'i');
      return {
        matchType: 'wildcard',
        test: (path) => re.test(path),
      };
    }

    case 'hostname':
      return {
        matchType: 'hostname',
        test: (_path, hostname) =>
          hostname.toLowerCase() === rule.pattern.toLowerCase(),
      };

    case 'extension': {
      const ext = rule.pattern.startsWith('.') ? rule.pattern.toLowerCase() : `.${rule.pattern}`.toLowerCase();
      return {
        matchType: 'extension',
        test: (path) => path.toLowerCase().endsWith(ext),
      };
    }

    case 'glob': {
      // Simple glob: * matches any sequence, ? matches single char
      const regexStr = escapeRegex(rule.pattern)
        .replace(/\\\*/g, '.*')
        .replace(/\\\?/g, '.');
      const re = new RegExp(regexStr, 'i');
      return {
        matchType: 'glob',
        test: (path) => re.test(path),
      };
    }
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getExtension(pathname: string): string {
  const lastSlash = pathname.lastIndexOf('/');
  const fileName = lastSlash >= 0 ? pathname.slice(lastSlash + 1) : pathname;
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex <= 0) return ''; // no extension or hidden file
  return fileName.slice(dotIndex);
}

// ─── Scope Rule Factory Helpers ──────────────────────────────

export function includeGlob(pattern: string): ScopeRule {
  return { type: 'include', matchType: 'glob', pattern };
}

export function excludeGlob(pattern: string): ScopeRule {
  return { type: 'exclude', matchType: 'glob', pattern };
}

export function includeRegex(pattern: string): ScopeRule {
  return { type: 'include', matchType: 'regex', pattern, regex: new RegExp(pattern) };
}

export function excludeRegex(pattern: string): ScopeRule {
  return { type: 'exclude', matchType: 'regex', pattern, regex: new RegExp(pattern) };
}

export function includeExact(path: string): ScopeRule {
  return { type: 'include', matchType: 'exact', pattern: path };
}

export function excludeExact(path: string): ScopeRule {
  return { type: 'exclude', matchType: 'exact', pattern: path };
}

export function includeWildcard(pattern: string): ScopeRule {
  return { type: 'include', matchType: 'wildcard', pattern };
}

export function excludeWildcard(pattern: string): ScopeRule {
  return { type: 'exclude', matchType: 'wildcard', pattern };
}

export function excludeExtension(ext: string): ScopeRule {
  return { type: 'exclude', matchType: 'extension', pattern: ext };
}