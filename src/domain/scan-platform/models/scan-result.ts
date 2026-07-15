/**
 * Scan Platform — Domain Models: ScanResult
 *
 * Aggregated output of a completed scan job.
 * Designed to feed directly into Security State Engine.
 */

import type { ID, Timestamp, StringMap, Severity } from '../types/index.ts';
import type { Finding } from './finding.ts';

// ─── Severity Breakdown ────────────────────────────────────

/**
 * Count of findings grouped by severity.
 * Compatible with Security State Engine's SeverityBreakdown.
 */
export interface SeverityBreakdown {
  readonly critical: number;
  readonly high: number;
  readonly medium: number;
  readonly low: number;
  readonly info: number;
}

/** Create an empty breakdown. */
export function emptySeverityBreakdown(): SeverityBreakdown {
  return Object.freeze({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  });
}

/** Compute breakdown from a list of findings. */
export function computeSeverityBreakdown(findings: readonly Finding[]): SeverityBreakdown {
  const breakdown = emptySeverityBreakdown();
  const counts: Record<string, number> = { ...breakdown };

  for (const f of findings) {
    const key = f.severity as string;
    if (key in counts) {
      counts[key]++;
    }
  }

  return Object.freeze({
    critical: counts.critical,
    high: counts.high,
    medium: counts.medium,
    low: counts.low,
    info: counts.info,
  });
}

// ─── Engine Result ─────────────────────────────────────────

/**
 * Result produced by a single engine during a scan job.
 * A scan job may involve multiple engines, each producing its own result.
 */
export interface EngineScanResult {
  /** The engine that produced this result. */
  readonly engineId: string;
  /** The engine's human-readable name. */
  readonly engineName: string;
  /** When this engine started. */
  readonly startedAt: Timestamp;
  /** When this engine completed (null if still running or failed). */
  readonly completedAt: Timestamp | null;
  /** Duration in milliseconds. */
  readonly durationMs: number;
  /** Number of HTTP requests made. */
  readonly requestsCount: number;
  /** Total findings detected by this engine. */
  readonly findingsCount: number;
  /** Findings grouped by severity. */
  readonly findingsBySeverity: SeverityBreakdown;
  /** Whether the engine completed successfully. */
  readonly success: boolean;
  /** Error message if the engine failed. */
  readonly errorMessage?: string;
  /** Engine-specific metadata. */
  readonly metadata?: StringMap;
}

// ─── Scan Result (Aggregated) ──────────────────────────────

/**
 * Aggregated result of an entire scan job.
 * Combines results from all engines that participated.
 *
 * SECURITY STATE ENGINE COMPATIBILITY:
 * This result can be converted to ScanSummary (SSE input) via
 * toScanSummary(). The findings can be converted via toSecurityStateFindings().
 */
export interface ScanResult {
  /** Unique identifier for this result. */
  readonly id: ID;
  /** The scan job that produced this result. */
  readonly scanJobId: ID;
  /** The target that was scanned. */
  readonly targetId: ID;
  /** Overall job status. */
  readonly status: string;
  /** When the scan started. */
  readonly startedAt: Timestamp;
  /** When the scan completed. */
  readonly completedAt: Timestamp;
  /** Total duration in milliseconds. */
  readonly durationMs: number;
  /** All findings from all engines. */
  readonly findings: readonly Finding[];
  /** Total unique findings. */
  readonly findingsCount: number;
  /** Findings grouped by severity. */
  readonly findingsBySeverity: SeverityBreakdown;
  /** Per-engine results. */
  readonly engineResults: readonly EngineScanResult[];
  /** Total number of HTTP requests across all engines. */
  readonly totalRequestsCount: number;
  /** Number of engines that participated. */
  readonly enginesUsed: number;
  /** Whether at least one engine succeeded. */
  readonly partialSuccess: boolean;
  /** Scan result metadata. */
  readonly metadata?: StringMap;
}

// ─── Security State Engine Adapter ─────────────────────────

/**
 * Subset of ScanResult that maps to Security State Engine's ScanSummary.
 */
export interface ScanSummaryForSSE {
  readonly id: ID;
  readonly targetId: ID;
  readonly status: string;
  readonly startedAt: Timestamp;
  readonly completedAt: Timestamp | null;
  readonly score: number | null;
  readonly findingsCount: number;
  readonly findingsBySeverity: SeverityBreakdown;
}

/**
 * Convert a ScanResult to SSE-compatible ScanSummary.
 */
export function toScanSummary(result: ScanResult): ScanSummaryForSSE {
  return {
    id: result.id,
    targetId: result.targetId,
    status: result.status,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    score: null, // Score is computed by SSE, not by the scan platform
    findingsCount: result.findingsCount,
    findingsBySeverity: result.findingsBySeverity,
  };
}