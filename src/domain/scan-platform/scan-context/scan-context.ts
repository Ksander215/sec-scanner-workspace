/**
 * Scan Platform — Scan Context
 *
 * Unified context object passed to every Scan Engine.
 * Contains everything an engine needs to execute a scan.
 *
 * Design principles:
 * - Immutable (readonly fields) — engines receive a snapshot, not a reference.
 * - Engine-agnostic — no field specific to any particular scanner.
 * - Composable — built from ScanTarget + ScanProfile + runtime overrides.
 */

import type { ID, Timestamp, StringMap, HeaderPair, ScanCapability, ScanTriggerType } from '../types/index.ts';
import type { AuthenticationConfig, ScopeConfig, RateLimitConfig } from '../models/scan-target.ts';

// ─── Scan Constraints ──────────────────────────────────────

/**
 * Hard limits for a scan execution.
 * Enforced by the Orchestrator; engines should also respect these.
 */
export interface ScanConstraints {
  /** Maximum time for the entire scan in seconds. 0 = no limit. */
  readonly maxDurationSeconds: number;
  /** Maximum number of findings to collect. 0 = unlimited. */
  readonly maxFindings: number;
  /** Maximum number of HTTP requests across the scan. 0 = unlimited. */
  readonly maxRequests: number;
  /** Whether to stop scanning when a critical finding is found. */
  readonly stopOnCritical: boolean;
  /** Maximum scan depth (crawl depth). 0 = unlimited. */
  readonly maxDepth: number;
  /** Maximum URLs to visit. 0 = unlimited. */
  readonly maxUrls: number;
}

// ─── Scan Context ──────────────────────────────────────────

/**
 * The complete context for a single scan execution.
 * Created by the Orchestrator, passed to the selected engine(s).
 *
 * An engine receives this and returns a ScanResult.
 * The engine MUST NOT modify the context.
 */
export interface ScanContext {
  // ─── Identity ──────────────────────────────────────────
  /** Unique identifier for this scan context. */
  readonly id: ID;
  /** The scan job this context belongs to. */
  readonly scanJobId: ID;
  /** Correlation ID for tracing across distributed components. */
  readonly correlationId: ID;

  // ─── Target ────────────────────────────────────────────
  /** The target to scan. */
  readonly targetId: ID;
  /** The root URL. */
  readonly targetUrl: string;
  /** Target name (for logging). */
  readonly targetName: string;

  // ─── Authentication ────────────────────────────────────
  /** How to authenticate. */
  readonly authentication: AuthenticationConfig;

  // ─── Request Configuration ─────────────────────────────
  /** Custom headers to include in every request. */
  readonly headers: readonly HeaderPair[];
  /** Custom cookies to include. */
  readonly cookies: readonly { name: string; value: string }[];

  // ─── Scope ─────────────────────────────────────────────
  /** Scope configuration (paths, depth, redirects). */
  readonly scope: ScopeConfig;

  // ─── Rate Limiting ─────────────────────────────────────
  /** Rate limit configuration. */
  readonly rateLimit: RateLimitConfig;

  // ─── Constraints ───────────────────────────────────────
  /** Hard limits. */
  readonly constraints: ScanConstraints;

  // ─── Profile & Capabilities ────────────────────────────
  /** The scan profile being used. */
  readonly profileName: string;
  /** Capabilities requested for this scan. */
  readonly requiredCapabilities: readonly ScanCapability[];

  // ─── Execution Metadata ────────────────────────────────
  /** How this scan was triggered. */
  readonly triggerType: ScanTriggerType;
  /** Who triggered the scan (user ID or "system"). */
  readonly triggeredBy: string;
  /** When the context was created. */
  readonly createdAt: Timestamp;
  /** Arbitrary metadata. */
  readonly metadata: StringMap;

  // ─── Cancellation ──────────────────────────────────────
  /**
   * AbortSignal for cooperative cancellation.
   * Engines MUST check this periodically and abort if signaled.
   */
  readonly abortSignal?: AbortSignal;
}

// ─── Scan Context Builder ──────────────────────────────────

/**
 * Builder for constructing ScanContext instances.
 * Ensures all required fields are provided.
 */
export class ScanContextBuilder {
  private _id: ID = '';
  private _scanJobId: ID = '';
  private _correlationId: ID = '';
  private _targetId: ID = '';
  private _targetUrl: string = '';
  private _targetName: string = '';
  private _authentication: AuthenticationConfig = { method: 'none' as const };
  private _headers: HeaderPair[] = [];
  private _cookies: { name: string; value: string }[] = [];
  private _scope: ScopeConfig | null = null;
  private _rateLimit: RateLimitConfig | null = null;
  private _constraints: ScanConstraints | null = null;
  private _profileName: string = 'default';
  private _requiredCapabilities: ScanCapability[] = [];
  private _triggerType: ScanTriggerType = 'manual' as ScanTriggerType;
  private _triggeredBy: string = 'system';
  private _metadata: StringMap = {};
  private _abortSignal?: AbortSignal;

  withId(id: ID): this {
    this._id = id;
    return this;
  }

  withScanJobId(jobId: ID): this {
    this._scanJobId = jobId;
    return this;
  }

  withCorrelationId(correlationId: ID): this {
    this._correlationId = correlationId;
    return this;
  }

  withTarget(targetId: ID, url: string, name: string): this {
    this._targetId = targetId;
    this._targetUrl = url;
    this._targetName = name;
    return this;
  }

  withAuthentication(auth: AuthenticationConfig): this {
    this._authentication = auth;
    return this;
  }

  withHeaders(headers: readonly HeaderPair[]): this {
    this._headers = [...headers];
    return this;
  }

  withCookies(cookies: readonly { name: string; value: string }[]): this {
    this._cookies = [...cookies];
    return this;
  }

  withScope(scope: ScopeConfig): this {
    this._scope = scope;
    return this;
  }

  withRateLimit(rateLimit: RateLimitConfig): this {
    this._rateLimit = rateLimit;
    return this;
  }

  withConstraints(constraints: ScanConstraints): this {
    this._constraints = constraints;
    return this;
  }

  withProfile(name: string, capabilities: readonly ScanCapability[]): this {
    this._profileName = name;
    this._requiredCapabilities = [...capabilities];
    return this;
  }

  withTrigger(triggerType: ScanTriggerType, triggeredBy: string): this {
    this._triggerType = triggerType;
    this._triggeredBy = triggeredBy;
    return this;
  }

  withMetadata(metadata: StringMap): this {
    this._metadata = metadata;
    return this;
  }

  withAbortSignal(signal: AbortSignal): this {
    this._abortSignal = signal;
    return this;
  }

  /**
   * Build the ScanContext.
   * Throws if required fields are missing.
   */
  build(): ScanContext {
    if (!this._id) throw new Error('ScanContext: id is required');
    if (!this._scanJobId) throw new Error('ScanContext: scanJobId is required');
    if (!this._correlationId) throw new Error('ScanContext: correlationId is required');
    if (!this._targetId) throw new Error('ScanContext: targetId is required');
    if (!this._targetUrl) throw new Error('ScanContext: targetUrl is required');

    return Object.freeze({
      id: this._id,
      scanJobId: this._scanJobId,
      correlationId: this._correlationId,
      targetId: this._targetId,
      targetUrl: this._targetUrl,
      targetName: this._targetName,
      authentication: this._authentication,
      headers: Object.freeze(this._headers),
      cookies: Object.freeze(this._cookies),
      scope: Object.freeze(this._scope ?? DEFAULT_SCOPE),
      rateLimit: Object.freeze(this._rateLimit ?? DEFAULT_RATE_LIMIT),
      constraints: Object.freeze(
        this._constraints ?? DEFAULT_CONSTRAINTS,
      ),
      profileName: this._profileName,
      requiredCapabilities: Object.freeze(this._requiredCapabilities),
      triggerType: this._triggerType,
      triggeredBy: this._triggeredBy,
      createdAt: new Date().toISOString(),
      metadata: Object.freeze(this._metadata),
      abortSignal: this._abortSignal,
    });
  }
}

// ─── Defaults ──────────────────────────────────────────────

import { DEFAULT_SCOPE, DEFAULT_RATE_LIMIT } from '../models/scan-target.ts';

/** Default scan constraints. */
export const DEFAULT_CONSTRAINTS: ScanConstraints = Object.freeze({
  maxDurationSeconds: 3600,
  maxFindings: 0,
  maxRequests: 0,
  stopOnCritical: false,
  maxDepth: 0,
  maxUrls: 0,
} as const);