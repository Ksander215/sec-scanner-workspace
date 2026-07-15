/**
 * Security Intelligence Normalization Engine — Type Definitions
 *
 * All types, interfaces, and enums for the Finding Normalization layer.
 * These types define the canonical format that all scanner outputs
 * are converted into before entering the Intelligence Platform.
 *
 * Design principles:
 * - All scanner outputs converge to a single CanonicalFinding format
 * - Severity, confidence, CWE/CVE, technology, and URL are normalized deterministically
 * - Evidence and Asset types are structured for downstream correlation
 * - Batch processing is first-class
 * - Validation is strict and explicit
 */

// ─── Branded ID Types ────────────────────────────────────────

/** Branded string for Finding IDs — prevents accidental mixing */
export type FindingId = string & { readonly __brand: 'FindingId' };

/** Branded string for Evidence IDs */
export type EvidenceId = string & { readonly __brand: 'EvidenceId' };

/** Branded string for Asset IDs */
export type AssetId = string & { readonly __brand: 'AssetId' };

/** Brand a plain string as a FindingId */
export function brandFindingId(id: string): FindingId {
  return id as FindingId;
}

/** Brand a plain string as an EvidenceId */
export function brandEvidenceId(id: string): EvidenceId {
  return id as EvidenceId;
}

/** Brand a plain string as an AssetId */
export function brandAssetId(id: string): AssetId {
  return id as AssetId;
}

// ─── Utility Types ───────────────────────────────────────────

/** ISO-8601 timestamp string */
export type Timestamp = string;

/** Arbitrary key-value metadata */
export type Metadata = Readonly<Record<string, string | number | boolean | null>>;

/** String-keyed record */
export type StringMap<T> = Readonly<Record<string, T>>;

// ─── Severity ────────────────────────────────────────────────

/**
 * Canonical severity levels for all findings.
 * All scanner-specific severity representations are mapped
 * to these five levels.
 */
export enum Severity {
  Info = 'Info',
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

/** Numeric severity ordering for comparison */
export const SEVERITY_ORDER: Readonly<Record<Severity, number>> = Object.freeze({
  [Severity.Info]: 0,
  [Severity.Low]: 1,
  [Severity.Medium]: 2,
  [Severity.High]: 3,
  [Severity.Critical]: 4,
});

/** All severity levels from lowest to highest */
export const ALL_SEVERITIES: readonly Severity[] = [
  Severity.Info,
  Severity.Low,
  Severity.Medium,
  Severity.High,
  Severity.Critical,
];

// ─── Source Engine ────────────────────────────────────────────

/**
 * Enumeration of all supported scanner source engines.
 * Each source has its own severity and confidence mapping.
 */
export enum SourceEngine {
  Nuclei = 'Nuclei',
  BrowserIntelligence = 'BrowserIntelligence',
  HTTPIntelligence = 'HTTPIntelligence',
  DiscoveryEngine = 'DiscoveryEngine',
  Manual = 'Manual',
  Unknown = 'Unknown',
}

/** All source engine values */
export const ALL_SOURCE_ENGINES: readonly SourceEngine[] = Object.values(SourceEngine) as SourceEngine[];

// ─── Finding Category ────────────────────────────────────────

/**
 * High-level categories for security findings.
 * Used for classification and grouping in correlation.
 */
export enum FindingCategory {
  Vulnerability = 'Vulnerability',
  Misconfiguration = 'Misconfiguration',
  Exposure = 'Exposure',
  InformationDisclosure = 'InformationDisclosure',
  Authentication = 'Authentication',
  Authorization = 'Authorization',
  Injection = 'Injection',
  CrossSiteScripting = 'CrossSiteScripting',
  Cryptography = 'Cryptography',
  ServerSideRequestForgery = 'ServerSideRequestForgery',
  DenialOfService = 'DenialOfService',
  BrokenAccessControl = 'BrokenAccessControl',
  SecurityMisconfiguration = 'SecurityMisconfiguration',
  OutdatedComponent = 'OutdatedComponent',
  DataLeak = 'DataLeak',
  Compliance = 'Compliance',
  NetworkSecurity = 'NetworkSecurity',
  Other = 'Other',
}

// ─── Confidence ──────────────────────────────────────────────

/**
 * Canonical confidence levels.
 * Determined by a deterministic model based on source,
 * evidence quality, data completeness, and result reproducibility.
 */
export enum ConfidenceLevel {
  Unknown = 'Unknown',
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Confirmed = 'Confirmed',
}

/** Numeric confidence ordering for comparison */
export const CONFIDENCE_ORDER: Readonly<Record<ConfidenceLevel, number>> = Object.freeze({
  [ConfidenceLevel.Unknown]: 0,
  [ConfidenceLevel.Low]: 1,
  [ConfidenceLevel.Medium]: 2,
  [ConfidenceLevel.High]: 3,
  [ConfidenceLevel.Confirmed]: 4,
});

// ─── Evidence Types ──────────────────────────────────────────

/**
 * Types of evidence that can accompany a finding.
 * Each type maps to a structured evidence model.
 */
export enum EvidenceType {
  Request = 'Request',
  Response = 'Response',
  DOM = 'DOM',
  Screenshot = 'Screenshot',
  Header = 'Header',
  Certificate = 'Certificate',
  Cookie = 'Cookie',
  Log = 'Log',
  NetworkTrace = 'NetworkTrace',
  FileContent = 'FileContent',
}

// ─── Asset Types ─────────────────────────────────────────────

/**
 * Types of assets that can be affected by a finding.
 */
export enum AssetType {
  Host = 'Host',
  Application = 'Application',
  Endpoint = 'Endpoint',
  API = 'API',
  Service = 'Service',
  Domain = 'Domain',
  IPAddress = 'IPAddress',
  URL = 'URL',
  Database = 'Database',
  CloudResource = 'CloudResource',
  Container = 'Container',
}

// ─── CWE/CVE ─────────────────────────────────────────────────

/** Normalized CWE reference */
export interface CWEReference {
  readonly id: string;       // e.g., "CWE-79"
  readonly numericId: number; // e.g., 79
  readonly name?: string;
  readonly url?: string;
}

/** Normalized CVE reference */
export interface CVEReference {
  readonly id: string;       // e.g., "CVE-2024-1234"
  readonly year: number;     // e.g., 2024
  readonly sequence: string; // e.g., "1234"
  readonly url?: string;
}

// ─── CVSS ─────────────────────────────────────────────────────

/** CVSS v3.1 score and vector */
export interface CVSSScore {
  readonly score: number;           // 0.0–10.0
  readonly vector: string;          // e.g., "AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
  readonly version: string;         // e.g., "3.1"
  readonly baseScore?: number;
  readonly temporalScore?: number;
  readonly environmentalScore?: number;
}

// ─── Normalization Result ────────────────────────────────────

/** Result of normalizing a single raw finding */
export interface NormalizationResult {
  readonly success: boolean;
  readonly finding: CanonicalFinding | null;
  readonly errors: readonly NormalizationError[];
  readonly warnings: readonly NormalizationWarning[];
  readonly durationMs: number;
  readonly appliedNormalizations: readonly string[];
}

/** Result of normalizing a batch of raw findings */
export interface BatchNormalizationResult {
  readonly total: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly findings: readonly CanonicalFinding[];
  readonly errors: readonly BatchNormalizationError[];
  readonly durationMs: number;
  readonly throughputPerSecond: number;
}

/** Error during normalization of a single finding */
export interface NormalizationError {
  readonly field: string;
  readonly message: string;
  readonly value: unknown;
  readonly normalizer: string;
}

/** Warning during normalization (non-fatal) */
export interface NormalizationWarning {
  readonly field: string;
  readonly message: string;
  readonly originalValue: unknown;
  readonly normalizedValue: unknown;
}

/** Error during batch normalization */
export interface BatchNormalizationError {
  readonly index: number;
  readonly findingId: string;
  readonly errors: readonly NormalizationError[];
}

// ─── Validation Result ───────────────────────────────────────

/** Result of validating a canonical finding */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
}

/** Validation error */
export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly code: string;
}

/** Validation warning */
export interface ValidationWarning {
  readonly field: string;
  readonly message: string;
  readonly code: string;
}

// ─── Raw Finding Input ───────────────────────────────────────

/**
 * Raw finding input from any scanner.
 * All fields are optional — the normalizer fills in
 * what is missing and normalizes what is present.
 */
export interface RawFinding {
  readonly id?: string;
  readonly sourceEngine?: string;
  readonly category?: string;
  readonly title?: string;
  readonly description?: string;
  readonly severity?: string;
  readonly confidence?: string | number;
  readonly cve?: string | readonly string[];
  readonly cwe?: string | readonly string[];
  readonly cvss?: string | number | Record<string, unknown>;
  readonly affectedAsset?: string;
  readonly endpoint?: string;
  readonly evidence?: unknown;
  readonly references?: readonly string[];
  readonly metadata?: Metadata;
  readonly discoveredAt?: string;
  readonly tags?: readonly string[];
  readonly [key: string]: unknown; // Allow scanner-specific fields
}

// ─── Forward Reference to CanonicalFinding ───────────────────

/**
 * The canonical finding model is defined in models/index.ts.
 * This forward reference allows other types in this file to reference it.
 * Do NOT add fields here — add them only in models/index.ts to avoid divergence.
 */
export type { CanonicalFinding } from '../models/index.ts';

// ─── Affected Asset ──────────────────────────────────────────

export interface AffectedAsset {
  readonly id: AssetId;
  readonly type: AssetType;
  readonly identifier: string;
  readonly name: string;
  readonly metadata: Metadata;
}

// ─── Canonical URL ───────────────────────────────────────────

export interface CanonicalURL {
  readonly scheme: string;
  readonly host: string;
  readonly port: number | null;
  readonly path: string;
  readonly query: string;
  readonly fragment: string;
  readonly original: string;
}

// ─── Normalized Evidence ─────────────────────────────────────

export interface NormalizedEvidence {
  readonly id: EvidenceId;
  readonly type: EvidenceType;
  readonly data: Metadata;
  readonly raw?: string;
  readonly description?: string;
}

// ─── Normalization Config ────────────────────────────────────

/** Configuration for the normalization engine */
export interface NormalizationConfig {
  readonly engineId: string;
  readonly strictValidation: boolean;
  readonly enableCaching: boolean;
  readonly cacheSize: number;
  readonly batchSize: number;
  readonly defaultSeverity: Severity;
  readonly defaultConfidence: ConfidenceLevel;
  readonly normalizerVersion: string;
}

/** Default normalization configuration */
export const DEFAULT_NORMALIZATION_CONFIG: NormalizationConfig = Object.freeze({
  engineId: 'default',
  strictValidation: true,
  enableCaching: true,
  cacheSize: 10_000,
  batchSize: 1000,
  defaultSeverity: Severity.Medium,
  defaultConfidence: ConfidenceLevel.Unknown,
  normalizerVersion: '1.0.0',
});

// ─── Normalization Statistics ────────────────────────────────

/** Comprehensive normalization engine statistics */
export interface NormalizationStatistics {
  readonly totalNormalized: number;
  readonly totalFailed: number;
  readonly totalValidated: number;
  readonly totalBatches: number;
  readonly averageNormalizationTimeMs: number;
  readonly averageBatchTimeMs: number;
  readonly throughputPerSecond: number;
  readonly cacheHitRate: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly memoryUsageBytes: number;
  readonly severityDistribution: Readonly<Record<Severity, number>>;
  readonly sourceDistribution: Readonly<Record<SourceEngine, number>>;
  readonly categoryDistribution: Readonly<Record<FindingCategory, number>>;
  readonly collectedAt: Timestamp;
}
