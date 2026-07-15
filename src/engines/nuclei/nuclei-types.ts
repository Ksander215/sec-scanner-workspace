/**
 * Nuclei Engine — Raw JSONL Types
 *
 * TypeScript representation of Nuclei's JSON output format.
 * Used by the parser to convert Nuclei output → ScanEngineFinding.
 *
 * Reference: https://github.com/projectdiscovery/nuclei/blob/main/pkg/output/types.go
 */

// ─── Nuclei Template Info ──────────────────────────────────

export interface NucleiTemplateInfo {
  readonly name: string;
  readonly author?: readonly string[];
  readonly severity: string;
  readonly description?: string;
  readonly reference?: readonly string[];
  readonly tags?: readonly string[];
  readonly classification?: NucleiClassification;
  readonly remediation?: string;
}

export interface NucleiClassification {
  readonly 'cwe-id'?: readonly string[];
  readonly 'cve-id'?: readonly string[];
  readonly 'cvss-metrics'?: string;
  readonly 'cvss-score'?: number;
  readonly 'epss-score'?: number;
  readonly 'epss-percentile'?: number;
  readonly 'cpr'?: string;
}

// ─── Nuclei Output Row (one JSONL line) ─────────────────────

/**
 * Represents a single line of Nuclei's JSON output (`nuclei -json`).
 * Fields are based on Nuclei v3.x output format.
 * All fields are optional because the format evolves across versions.
 */
export interface NucleiOutputRow {
  /** Template identifier (e.g. "cve-2021-44228"). */
  readonly 'template-id': string;
  /** Filesystem path to the template YAML. */
  readonly 'template-path'?: string;
  /** Template metadata. */
  readonly 'info'?: NucleiTemplateInfo;
  /** @deprecated Use 'info' instead (Nuclei < 3.0). */
  readonly 'template-info'?: NucleiTemplateInfo;
  /** Vulnerability type: "http", "dns", "network", "workflow", etc. */
  readonly type?: string;
  /** The target host/URL. */
  readonly host?: string;
  /** The exact URL/path where the vulnerability was found. */
  readonly 'matched-at'?: string;
  /** Extracted values (matched data from responses). */
  readonly 'extracted-results'?: readonly string[];
  /** The HTTP request sent. */
  readonly request?: string;
  /** The HTTP response received. */
  readonly response?: string;
  /** cURL reproduction command. */
  readonly 'curl-command'?: string;
  /** Whether the matcher matched. */
  readonly 'matcher-status'?: boolean;
  /** IP address of the target. */
  readonly ip?: string;
  /** Timestamp of detection. */
  readonly timestamp?: string;
  /** Interaction details (for interactsh-based templates). */
  readonly interaction?: NucleiInteraction;
  /** Metadata fields from the template. */
  readonly metadata?: Record<string, unknown>;
  /** JSON Path of the vulnerability. */
  readonly 'json-path'?: string;
  /** CVE ID extracted by the template. */
  readonly 'cve-id'?: string;
  /** CWE ID extracted by the template. */
  readonly 'cwe-id'?: string;
}

// ─── Nuclei Interaction ─────────────────────────────────────

export interface NucleiInteraction {
  readonly protocol?: string;
  readonly 'interaction-id'?: string;
  readonly request?: string;
  readonly response?: string;
}

// ─── Nuclei Version Output ──────────────────────────────────

/** Parsed from `nuclei -version` */
export interface NucleiVersionInfo {
  readonly version: string;
  readonly raw: string;
}

// ─── Nuclei Template List Entry ─────────────────────────────

/** Parsed from `nuclei -tl -json` */
export interface NucleiTemplateEntry {
  readonly id: string;
  readonly name: string;
  readonly severity: string;
  readonly type: string;
  readonly path: string;
  readonly tags?: readonly string[];
}