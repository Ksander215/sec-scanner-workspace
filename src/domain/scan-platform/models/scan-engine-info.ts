/**
 * Scan Platform — Domain Models: ScanEngineInfo
 *
 * Static metadata about a Scan Engine.
 * Used for display, routing decisions, and audit.
 */

import type { ID, Timestamp } from '../types/index.ts';
import type { ScanCapability } from '../types/index.ts';
import type { EngineHealthStatus } from '../types/index.ts';

// ─── Engine Info ───────────────────────────────────────────

/**
 * Descriptive metadata about a registered Scan Engine.
 */
export interface ScanEngineInfo {
  /** Unique engine identifier (e.g. "nuclei-v3", "zap-2.14"). */
  readonly id: ID;
  /** Human-readable engine name. */
  readonly name: string;
  /** Semantic version of the engine. */
  readonly version: string;
  /** Brief description of the engine. */
  readonly description: string;
  /** Vendor or author. */
  readonly vendor?: string;
  /** Homepage URL. */
  readonly homepage?: string;
  /** List of capabilities this engine provides. */
  readonly capabilities: readonly ScanCapability[];
  /** Current health status (updated by registry health checks). */
  readonly healthStatus: EngineHealthStatus;
  /** Whether this engine is enabled for scanning. */
  readonly enabled: boolean;
  /** When this engine was registered. */
  readonly registeredAt: Timestamp;
  /** Last time a health check was performed. */
  readonly lastHealthCheckAt: Timestamp | null;
  /** Total number of scans executed by this engine. */
  readonly totalScansExecuted: number;
  /** Total number of findings produced. */
  readonly totalFindingsProduced: number;
  /** Engine-specific configuration / metadata. */
  readonly metadata?: Record<string, unknown>;
}

// ─── Health Check Result ───────────────────────────────────

/**
 * Result of an engine health check.
 */
export interface HealthCheckResult {
  /** The engine that was checked. */
  readonly engineId: string;
  /** Overall health status. */
  readonly status: EngineHealthStatus;
  /** Latency of the health check in milliseconds. */
  readonly latencyMs: number;
  /** Human-readable message. */
  readonly message: string;
  /** When the check was performed. */
  readonly checkedAt: Timestamp;
  /** Additional details. */
  readonly details?: Record<string, unknown>;
}