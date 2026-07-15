/**
 * Scan Platform — Domain Models: ScanTarget
 *
 * Represents a target to be scanned.
 * Decoupled from any infrastructure — pure domain model.
 */

import type { ID, Timestamp, StringMap } from '../types/index.ts';

// ─── Authentication Config ─────────────────────────────────

/** Supported authentication methods. */
export enum AuthMethod {
  None = 'none',
  /** HTTP Basic (username + password). */
  Basic = 'basic',
  /** Bearer token. */
  Bearer = 'bearer',
  /** API Key in header or query parameter. */
  ApiKey = 'api_key',
  /** Cookie-based session. */
  Cookie = 'cookie',
  /** OAuth2 token. */
  OAuth2 = 'oauth2',
  /** Form-based login (username + password + login URL). */
  FormBased = 'form_based',
}

/**
 * Authentication configuration for a scan target.
 * Supports multiple methods; the engine picks what it supports.
 */
export interface AuthenticationConfig {
  /** Which auth method to use. */
  readonly method: AuthMethod;
  /** Username (for Basic, FormBased). */
  readonly username?: string;
  /** Password (for Basic, FormBased). */
  readonly password?: string;
  /** Token (for Bearer, OAuth2). */
  readonly token?: string;
  /** Key name (for ApiKey: e.g. "X-API-Key"). */
  readonly keyName?: string;
  /** Key value (for ApiKey). */
  readonly keyValue?: string;
  /** Cookie string (for Cookie method). */
  readonly cookies?: string;
  /** Login URL (for FormBased). */
  readonly loginUrl?: string;
  /** OAuth2 scopes. */
  readonly scopes?: readonly string[];
}

// ─── Scope Configuration ───────────────────────────────────

/** What to include/exclude from the scan. */
export interface ScopeConfig {
  /** Paths to include (glob patterns). Empty = all. */
  readonly includePaths: readonly string[];
  /** Paths to exclude (glob patterns). */
  readonly excludePaths: readonly string[];
  /** Maximum crawl depth. 0 = unlimited. */
  readonly maxDepth: number;
  /** Maximum number of URLs to crawl. 0 = unlimited. */
  readonly maxUrls: number;
  /** Whether to follow redirects. */
  readonly followRedirects: boolean;
  /** Maximum redirects to follow. */
  readonly maxRedirects: number;
}

// ─── Rate Limiting ─────────────────────────────────────────

/** Rate limiting constraints for a scan. */
export interface RateLimitConfig {
  /** Maximum requests per second. 0 = unlimited. */
  readonly requestsPerSecond: number;
  /** Delay between requests in milliseconds. */
  readonly delayMs: number;
  /** Maximum concurrent requests. */
  readonly concurrency: number;
}

// ─── Scan Target ───────────────────────────────────────────

/**
 * A target that can be scanned.
 * Contains everything an engine needs to know about what to scan
 * and how to behave (auth, scope, rate limits).
 */
export interface ScanTarget {
  /** Unique identifier. */
  readonly id: ID;
  /** Human-readable name. */
  readonly name: string;
  /** The root URL to scan (must include protocol). */
  readonly url: string;
  /** Optional description. */
  readonly description?: string;
  /** Authentication configuration. */
  readonly authentication: AuthenticationConfig;
  /** Scope configuration. */
  readonly scope: ScopeConfig;
  /** Rate limiting configuration. */
  readonly rateLimit: RateLimitConfig;
  /** Custom HTTP headers to send with every request. */
  readonly customHeaders: readonly { name: string; value: string }[];
  /** Custom cookies to send. */
  readonly customCookies: readonly { name: string; value: string }[];
  /** Whether HTTPS is required. */
  readonly enforceHttps: boolean;
  /** Target-specific metadata. */
  readonly metadata?: StringMap;
  /** When the target was created. */
  readonly createdAt: Timestamp;
  /** When the target was last modified. */
  readonly updatedAt: Timestamp;
}

// ─── Defaults ──────────────────────────────────────────────

/** Default scope configuration (scan everything). */
export const DEFAULT_SCOPE: ScopeConfig = Object.freeze({
  includePaths: [],
  excludePaths: [],
  maxDepth: 0,
  maxUrls: 0,
  followRedirects: true,
  maxRedirects: 10,
} as const);

/** Default rate limit (respectful defaults). */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = Object.freeze({
  requestsPerSecond: 10,
  delayMs: 100,
  concurrency: 5,
} as const);

/** Default authentication (none). */
export const DEFAULT_AUTH: AuthenticationConfig = Object.freeze({
  method: AuthMethod.None,
} as const);