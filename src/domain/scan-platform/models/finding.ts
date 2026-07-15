/**
 * Scan Platform — Domain Models: Finding
 *
 * Represents a single security finding detected by a Scan Engine.
 * This model is the bridge between Scan Platform and Security State Engine.
 *
 * COMPATIBILITY: The fields {id, targetId, title, severity, cweId, status,
 * firstSeenAt, lastSeenAt, lastResolvedAt, resolutionCount, confidence,
 * hash, location, evidence} map directly to the Security State Engine's
 * Finding interface. Any Scan Engine producing these fields feeds
 * seamlessly into the Security State computation pipeline.
 */

import type { ID, Severity, FindingStatus, Timestamp, StringMap } from '../types/index.ts';

// ─── Evidence ──────────────────────────────────────────────

/**
 * Proof that a vulnerability exists.
 * Multiple evidence items can be attached to a single Finding.
 */
export interface Evidence {
  /** Unique identifier for this evidence item. */
  readonly id: ID;
  /** Type of evidence: request_response, screenshot, log, code_snippet, etc. */
  readonly type: EvidenceType;
  /** The actual evidence content. */
  readonly content: string;
  /** MIME type for binary content (e.g. "image/png"). Undefined for text. */
  readonly mimeType?: string;
  /** Human-readable description of what this evidence shows. */
  readonly description?: string;
  /** When this evidence was captured. */
  readonly capturedAt: Timestamp;
}

export enum EvidenceType {
  HttpRequest = 'http_request',
  HttpResponse = 'http_response',
  RequestResponsePair = 'request_response_pair',
  Screenshot = 'screenshot',
  Log = 'log',
  CodeSnippet = 'code_snippet',
  StackTrace = 'stack_trace',
  ProofOfConcept = 'proof_of_concept',
}

// ─── Finding Location ─────────────────────────────────────

/**
 * Where a vulnerability was found.
 * Supports URL-based, API, and code-level locations.
 */
export interface FindingLocation {
  /** The URL or endpoint where the finding was detected. */
  readonly url?: string;
  /** HTTP method (for API vulnerabilities). */
  readonly method?: string;
  /** Parameter name (for injection-type findings). */
  readonly parameter?: string;
  /** Line number in source code (for SAST / JS analysis). */
  readonly line?: number;
  /** Column number in source code. */
  readonly column?: number;
  /** File path (for code-level findings). */
  readonly filePath?: string;
  /** Path component of the URL (e.g. "/api/v1/users"). */
  readonly path?: string;
}

// ─── Finding ───────────────────────────────────────────────

/**
 * A security finding from a scan.
 *
 * Designed for cross-scan deduplication via `hash`.
 * Lifecycle managed by FindingStatus transitions.
 *
 * SECURITY STATE ENGINE COMPATIBILITY:
 * This interface is a superset of the SSE's Finding type.
 * To feed into SSE, extract the SSE-compatible subset via toSecurityStateFinding().
 */
export interface Finding {
  /** Unique identifier (ULID or UUID). */
  readonly id: ID;
  /** The target this finding belongs to. */
  readonly targetId: ID;
  /** Human-readable title describing the vulnerability. */
  readonly title: string;
  /** Human-readable description of the vulnerability. */
  readonly description: string;
  /** OWASP severity level. */
  readonly severity: Severity;
  /** Current lifecycle status. */
  readonly status: FindingStatus;
  /** CWE identifier (e.g. "CWE-79"). */
  readonly cweId?: string;
  /** OWASP category (e.g. "A03:2021-Injection"). */
  readonly owaspCategory?: string;
  /** CVSS v3.1 base score (0.0–10.0). */
  readonly cvssScore?: number;
  /** CVSS v3.1 vector string. */
  readonly cvssVector?: string;
  /** Where the finding was found. */
  readonly location: FindingLocation;
  /** Evidence items proving this finding. */
  readonly evidence: readonly Evidence[];
  /** Remediation guidance. */
  readonly remediation?: string;
  /** References (URLs) for further reading. */
  readonly references: readonly string[];
  /** First time this finding was ever seen (across all scans). */
  readonly firstSeenAt: Timestamp;
  /** Last time this finding was observed in a scan. */
  readonly lastSeenAt: Timestamp;
  /** Last time this finding was resolved (null if never). */
  readonly lastResolvedAt: Timestamp | null;
  /** How many times this finding has been resolved and reappeared (regression count). */
  readonly resolutionCount: number;
  /** Confidence score 0.0–1.0. */
  readonly confidence: number;
  /** Content-based hash for deduplication (same vuln = same hash). */
  readonly hash: string;
  /** The engine that detected this finding. */
  readonly detectedBy: string;
  /** The scan job that produced this finding. */
  readonly scanJobId: ID;
  /** Tags for categorization and filtering. */
  readonly tags: readonly string[];
  /** Additional engine-specific metadata. */
  readonly metadata?: StringMap;
}

// ─── Security State Engine Adapter ─────────────────────────

/**
 * Subset of Finding that the Security State Engine expects as input.
 * Used to bridge Scan Platform → SSE without coupling.
 */
export interface SecurityStateFinding {
  readonly id: ID;
  readonly targetId: ID;
  readonly title: string;
  readonly severity: Severity;
  readonly cweId?: string;
  readonly status: FindingStatus;
  readonly firstSeenAt: Timestamp;
  readonly lastSeenAt: Timestamp;
  readonly lastResolvedAt: Timestamp | null;
  readonly resolutionCount: number;
  readonly confidence: number;
  readonly hash: string;
  readonly location: FindingLocation;
  readonly evidence: readonly Evidence[];
}

/**
 * Convert a Scan Platform Finding to the Security State Engine's expected format.
 * This is the ONLY coupling point between Scan Platform and SSE.
 */
export function toSecurityStateFinding(f: Finding): SecurityStateFinding {
  return {
    id: f.id,
    targetId: f.targetId,
    title: f.title,
    severity: f.severity,
    cweId: f.cweId,
    status: f.status,
    firstSeenAt: f.firstSeenAt,
    lastSeenAt: f.lastSeenAt,
    lastResolvedAt: f.lastResolvedAt,
    resolutionCount: f.resolutionCount,
    confidence: f.confidence,
    hash: f.hash,
    location: f.location,
    evidence: f.evidence,
  };
}

/**
 * Convert an array of Findings to SSE-compatible format.
 */
export function toSecurityStateFindings(findings: readonly Finding[]): SecurityStateFinding[] {
  return findings.map(toSecurityStateFinding);
}