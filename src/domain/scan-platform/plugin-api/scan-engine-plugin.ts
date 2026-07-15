/**
 * Scan Platform — Plugin API
 *
 * THE central contract for all Scan Engines.
 * Every engine (Nuclei, ZAP, Katana, Playwright, Custom) MUST implement
 * the ScanEnginePlugin interface.
 *
 * Design goals:
 * 1. Minimal surface area — only 5 methods.
 * 2. Async-first — all I/O is async.
 * 3. Observable — engines emit ScanEngineEvent via callback.
 * 4. Cancellable — engines receive AbortSignal.
 * 5. Engine-agnostic — no field ties to any specific tool.
 *
 * INTEGRATION GUIDE (for TASK-202+):
 *   1. Create a class implementing ScanEnginePlugin.
 *   2. Call EngineRegistry.register(myPlugin).
 *   3. The Orchestrator will invoke scan() when needed.
 *   4. Emit events via the onEvent callback for real-time progress.
 *   5. Return a ScanEngineResult when done.
 */

import type { ID, Timestamp, ScanCapability } from '../types/index.ts';
import type { ScanContext } from '../scan-context/scan-context.ts';
import type { EngineHealthStatus } from '../types/index.ts';

// ─── Engine Scan Result (from Engine → Orchestrator) ───────

/**
 * Raw result returned by a Scan Engine after completing a scan.
 * The Orchestrator normalizes this into a domain ScanResult.
 */
export interface ScanEngineResult {
  /** Whether the scan completed without engine-level errors. */
  readonly success: boolean;
  /** Findings detected (will be normalized by Orchestrator). */
  readonly findings: readonly ScanEngineFinding[];
  /** Total HTTP requests made. */
  readonly requestsCount: number;
  /** Duration in milliseconds. */
  readonly durationMs: number;
  /** Error message if success === false. */
  readonly errorMessage?: string;
  /** Error code (machine-readable). */
  readonly errorCode?: string;
  /** Whether the error is retryable. */
  readonly retryable?: boolean;
  /** Engine-specific metadata (templates used, rules run, etc.). */
  readonly metadata?: Record<string, unknown>;
}

// ─── Raw Finding (from Engine → Orchestrator) ─────────────

/**
 * Simplified finding format produced by engines.
 * The Orchestrator enriches this into a full domain Finding
 * (adds targetId, scanJobId, timestamps, hash, etc.).
 */
export interface ScanEngineFinding {
  /** Engine-internal ID (will be mapped to a global ID). */
  readonly engineFindingId?: string;
  /** Vulnerability title. */
  readonly title: string;
  /** Description. */
  readonly description: string;
  /** Severity. */
  readonly severity: string;
  /** CWE ID. */
  readonly cweId?: string;
  /** OWASP category. */
  readonly owaspCategory?: string;
  /** CVSS score. */
  readonly cvssScore?: number;
  /** CVSS vector. */
  readonly cvssVector?: string;
  /** Where the vulnerability is. */
  readonly location: {
    readonly url?: string;
    readonly method?: string;
    readonly parameter?: string;
    readonly path?: string;
    readonly line?: number;
    readonly column?: number;
    readonly filePath?: string;
  };
  /** Evidence items. */
  readonly evidence: readonly {
    readonly type: string;
    readonly content: string;
    readonly mimeType?: string;
    readonly description?: string;
  }[];
  /** Remediation advice. */
  readonly remediation?: string;
  /** Reference URLs. */
  readonly references?: readonly string[];
  /** Confidence 0.0–1.0. */
  readonly confidence?: number;
  /** Tags. */
  readonly tags?: readonly string[];
  /** Template/rule ID that triggered this. */
  readonly templateId?: string;
}

// ─── Engine Event (streaming from Engine → Orchestrator) ──

/**
 * Events emitted by an engine during scanning.
 * Used for real-time progress reporting via SSE / WebSocket.
 */
export interface ScanEngineEvent {
  /** Event type. */
  readonly type: ScanEngineEventType;
  /** Timestamp. */
  readonly timestamp: Timestamp;
  /** Human-readable message (for logging). */
  readonly message?: string;
  /** Structured data (type-specific). */
  readonly data?: Record<string, unknown>;
}

export enum ScanEngineEventType {
  /** Scan phase changed (e.g. "crawling" → "testing"). */
  PhaseChanged = 'phase_changed',
  /** Progress update (0–100). */
  Progress = 'progress',
  /** A URL was discovered (crawling). */
  UrlDiscovered = 'url_discovered',
  /** A finding was detected. */
  FindingDetected = 'finding_detected',
  /** A request was made (verbose). */
  RequestMade = 'request_made',
  /** An error occurred (non-fatal). */
  Error = 'error',
  /** A warning was issued. */
  Warning = 'warning',
  /** Informational message. */
  Info = 'info',
}

// ─── Event Callback ────────────────────────────────────────

/**
 * Callback signature for engines to emit events.
 * The Orchestrator provides this when invoking scan().
 */
export type EngineEventCallback = (event: ScanEngineEvent) => void;

// ─── CORE: Scan Engine Plugin Interface ────────────────────

/**
 * The contract every Scan Engine MUST implement.
 *
 * This is the ONLY interface engine developers need to know about.
 * Everything else (registration, routing, lifecycle) is handled
 * by the Engine Registry and Scan Orchestrator.
 *
 * Lifecycle:
 *   1. Orchestrator calls initialize() once after registration.
 *   2. Orchestrator calls health() periodically.
 *   3. Orchestrator calls scan() to start a scan.
 *   4. Engine emits events via the callback during scan.
 *   5. Engine returns ScanEngineResult when done.
 *   6. Orchestrator calls shutdown() during graceful shutdown.
 */
export interface ScanEnginePlugin {
  // ─── Identity (static metadata) ────────────────────────

  /** Unique identifier (e.g. "nuclei-v3"). Must be stable across restarts. */
  readonly id: string;

  /** Human-readable name (e.g. "Nuclei v3"). */
  readonly name: string;

  /** Semantic version (e.g. "3.1.7"). */
  readonly version: string;

  /** Brief description of what this engine does. */
  readonly description: string;

  /** Capabilities this engine provides. Used for routing. */
  readonly capabilities: readonly ScanCapability[];

  // ─── Lifecycle ─────────────────────────────────────────

  /**
   * Initialize the engine.
   * Called once after registration. Load configs, warm up caches, etc.
   *
   * @throws if initialization fails — engine will not be registered.
   */
  initialize(): Promise<void>;

  /**
   * Graceful shutdown.
   * Release resources, stop background processes.
   */
  shutdown(): Promise<void>;

  // ─── Health ────────────────────────────────────────────

  /**
   * Check if the engine is operational.
   * Called periodically by the registry.
   *
   * @returns health status and optional message.
   */
  health(): Promise<HealthCheckResult>;

  // ─── Scanning ──────────────────────────────────────────

  /**
   * Execute a scan against the given context.
   *
   * Contract:
   * - MUST respect context.abortSignal (check periodically).
   * - MUST respect context.rateLimit and context.constraints.
   * - MUST emit events via onEvent for progress reporting.
   * - MUST return a ScanEngineResult when done (even on error).
   * - MUST NOT throw — return { success: false, errorMessage } instead.
   * - MUST be safe to call concurrently (different contexts).
   *
   * @param context  The complete scan context (target, auth, limits, etc.).
   * @param onEvent  Callback to emit events during scanning.
   * @returns        The scan result.
   */
  scan(
    context: ScanContext,
    onEvent: EngineEventCallback,
  ): Promise<ScanEngineResult>;

  // ─── Cancellation ──────────────────────────────────────

  /**
   * Cancel a running scan.
   * Called when the user cancels a job.
   * The engine should abort the scan identified by jobId.
   *
   * @param jobId  The scan job ID to cancel.
   */
  cancel(jobId: string): Promise<void>;
}

// ─── Health Check Result (re-exported for convenience) ─────

export interface HealthCheckResult {
  readonly engineId: string;
  readonly status: EngineHealthStatus;
  readonly latencyMs: number;
  readonly message: string;
  readonly checkedAt: Timestamp;
  readonly details?: Record<string, unknown>;
}