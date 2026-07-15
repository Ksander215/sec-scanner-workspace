/**
 * Scan Platform — Core Types & Enumerations
 *
 * All enumerations and primitive types used across the Scan Platform.
 * Zero dependencies — pure domain types.
 */

// ─── Severity ──────────────────────────────────────────────

/** OWASP-style severity levels, aligned with Security State Engine. */
export enum Severity {
  Info = 'info',
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

/** Numeric weight map for severity scoring (Security State Engine compatible). */
export const SEVERITY_WEIGHTS: Record<Severity, number> = {
  [Severity.Critical]: 25,
  [Severity.High]: 15,
  [Severity.Medium]: 5,
  [Severity.Low]: 1,
  [Severity.Info]: 0,
} as const;

/** Order from most to least severe — useful for sorting. */
export const SEVERITY_ORDER: Severity[] = [
  Severity.Critical,
  Severity.High,
  Severity.Medium,
  Severity.Low,
  Severity.Info,
];

// ─── Scan Job Status ───────────────────────────────────────

/**
 * Lifecycle states of a Scan Job.
 *
 * Transitions:
 *   Pending  → Running
 *   Running  → Completed | Failed | Cancelled
 *   Pending  → Cancelled
 *
 * Terminal states: Completed, Failed, Cancelled.
 */
export enum ScanJobStatus {
  Pending = 'pending',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

/** Set of terminal (non-transitioning) statuses. */
export const TERMINAL_STATUSES: ReadonlySet<ScanJobStatus> = new Set([
  ScanJobStatus.Completed,
  ScanJobStatus.Failed,
  ScanJobStatus.Cancelled,
]);

// ─── Finding Status ────────────────────────────────────────

/** Lifecycle of a single finding (cross-scan). */
export enum FindingStatus {
  Open = 'open',
  Confirmed = 'confirmed',
  AcceptedRisk = 'accepted_risk',
  Resolved = 'resolved',
  Dismissed = 'dismissed',
}

// ─── Scan Capability ───────────────────────────────────────

/**
 * Declarative capabilities a Scan Engine can advertise.
 * Used by Engine Registry for capability-based routing.
 */
export enum ScanCapability {
  /** Crawl a target to discover URLs/endpoints. */
  Crawling = 'crawling',
  /** Detect vulnerabilities via active testing. */
  VulnerabilityDetection = 'vulnerability_detection',
  /** Scan API endpoints (OpenAPI, GraphQL, REST). */
  ApiScanning = 'api_scanning',
  /** Scan authenticated pages. */
  AuthenticatedScanning = 'authenticated_scanning',
  /** Passive analysis (no active exploitation). */
  PassiveAnalysis = 'passive_analysis',
  /** Fuzz specific parameters/endpoints. */
  Fuzzing = 'fuzzing',
  /** Check SSL/TLS configuration. */
  SslTlsCheck = 'ssl_tls_check',
  /** Detect common misconfigurations. */
  MisconfigurationDetection = 'misconfiguration_detection',
  /** Scan JavaScript bundles for secrets and vulnerabilities. */
  JavaScriptAnalysis = 'javascript_analysis',
  /** Header security analysis (CSP, HSTS, etc.). */
  HeaderAnalysis = 'header_analysis',
  /** DNS-level security checks. */
  DnsAnalysis = 'dns_analysis',
  /** Business logic vulnerability detection. */
  BusinessLogicTesting = 'business_logic_testing',
}

// ─── Scan Trigger Type ─────────────────────────────────────

export enum ScanTriggerType {
  Manual = 'manual',
  Scheduled = 'scheduled',
  Api = 'api',
  CiCd = 'ci_cd',
}

// ─── Engine Health ─────────────────────────────────────────

export enum EngineHealthStatus {
  Healthy = 'healthy',
  Degraded = 'degraded',
  Unhealthy = 'unhealthy',
  Unknown = 'unknown',
}

// ─── Primitive Type Aliases ────────────────────────────────

/** Unique identifier — opaque string, no internal structure assumed. */
export type ID = string;

/** ISO-8601 timestamp string. */
export type Timestamp = string;

/** Absolute URL (must include protocol). */
export type AbsoluteUrl = string & { __brand: 'AbsoluteUrl' };

/** HTTP method (GET, POST, etc.). */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/** Key-value header pair. */
export type HeaderPair = readonly [string, string];

/** A record of arbitrary string key-value metadata. */
export type StringMap = Readonly<Record<string, string>>;

/** A record of arbitrary metadata (JSON-serializable). */
export type Metadata = Readonly<Record<string, unknown>>;