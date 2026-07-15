/**
 * Severity Normalizer
 *
 * Transforms scanner-specific severity representations into
 * the canonical Severity enum. Each scanner uses different
 * naming conventions, numeric ranges, and classification systems.
 *
 * Supported scanners:
 * - Nuclei: info, low, medium, high, critical
 * - Browser Intelligence: informational, low, medium, high, critical
 * - HTTP Intelligence: info, low, medium, high, critical
 * - Discovery Engine: info, low, medium, high, critical
 *
 * Also handles:
 * - Numeric severities (0-10, 0-4, 0-100)
 * - CVSS-based severity mapping
 * - Unknown/invalid inputs (defaults to Info)
 */

import { Severity, SEVERITY_ORDER } from '../../types/index.ts';

// ─── Nuclei Severity Map ─────────────────────────────────────

const NUCLEI_SEVERITY_MAP: Readonly<Record<string, Severity>> = Object.freeze({
  info: Severity.Info,
  low: Severity.Low,
  medium: Severity.Medium,
  high: Severity.High,
  critical: Severity.Critical,
  // Uppercase variants
  INFO: Severity.Info,
  LOW: Severity.Low,
  MEDIUM: Severity.Medium,
  HIGH: Severity.High,
  CRITICAL: Severity.Critical,
  // Title case variants
  Info: Severity.Info,
  Low: Severity.Low,
  Medium: Severity.Medium,
  High: Severity.High,
  Critical: Severity.Critical,
  // Nuclei-specific aliases
  informational: Severity.Info,
  Informational: Severity.Info,
  INFORMATIONAL: Severity.Info,
});

// ─── Browser Intelligence Severity Map ───────────────────────

const BROWSER_INTEL_SEVERITY_MAP: Readonly<Record<string, Severity>> = Object.freeze({
  info: Severity.Info,
  informational: Severity.Info,
  low: Severity.Low,
  medium: Severity.Medium,
  high: Severity.High,
  critical: Severity.Critical,
  // CamelCase variants
  Info: Severity.Info,
  Informational: Severity.Info,
  Low: Severity.Low,
  Medium: Severity.Medium,
  High: Severity.High,
  Critical: Severity.Critical,
  // Numeric string variants used by some browser intel tools
  '0': Severity.Info,
  '1': Severity.Low,
  '2': Severity.Medium,
  '3': Severity.High,
  '4': Severity.Critical,
});

// ─── HTTP Intelligence Severity Map ──────────────────────────

const HTTP_INTEL_SEVERITY_MAP: Readonly<Record<string, Severity>> = Object.freeze({
  info: Severity.Info,
  low: Severity.Low,
  medium: Severity.Medium,
  high: Severity.High,
  critical: Severity.Critical,
  // HTTP-specific naming
  notice: Severity.Info,
  warning: Severity.Low,
  warn: Severity.Low,
  error: Severity.High,
  fatal: Severity.Critical,
  // Capitalized variants
  Info: Severity.Info,
  Notice: Severity.Info,
  Low: Severity.Low,
  Warning: Severity.Low,
  Warn: Severity.Low,
  Medium: Severity.Medium,
  High: Severity.High,
  Error: Severity.High,
  Critical: Severity.Critical,
  Fatal: Severity.Critical,
});

// ─── Discovery Engine Severity Map ───────────────────────────

const DISCOVERY_SEVERITY_MAP: Readonly<Record<string, Severity>> = Object.freeze({
  info: Severity.Info,
  low: Severity.Low,
  medium: Severity.Medium,
  high: Severity.High,
  critical: Severity.Critical,
  // Discovery-specific naming
  none: Severity.Info,
  negligible: Severity.Info,
  minor: Severity.Low,
  moderate: Severity.Medium,
  important: Severity.High,
  major: Severity.High,
  urgent: Severity.Critical,
  // Capitalized variants
  Info: Severity.Info,
  None: Severity.Info,
  Negligible: Severity.Info,
  Low: Severity.Low,
  Minor: Severity.Low,
  Medium: Severity.Medium,
  Moderate: Severity.Medium,
  High: Severity.High,
  Important: Severity.High,
  Major: Severity.High,
  Critical: Severity.Critical,
  Urgent: Severity.Critical,
});

// ─── CVSS Score → Severity ───────────────────────────────────

/**
 * Map CVSS score (0.0–10.0) to canonical Severity.
 * Follows FIRST CVSS v3.1 specification:
 * - 0.0 → Info
 * - 0.1–3.9 → Low
 * - 4.0–6.9 → Medium
 * - 7.0–8.9 → High
 * - 9.0–10.0 → Critical
 */
export function cvssScoreToSeverity(score: number): Severity {
  if (score <= 0) return Severity.Info;
  if (score <= 3.9) return Severity.Low;
  if (score <= 6.9) return Severity.Medium;
  if (score <= 8.9) return Severity.High;
  return Severity.Critical;
}

// ─── Generic Severity Map ────────────────────────────────────

const GENERIC_SEVERITY_MAP: Readonly<Record<string, Severity>> = Object.freeze({
  // Standard forms
  info: Severity.Info,
  low: Severity.Low,
  medium: Severity.Medium,
  high: Severity.High,
  critical: Severity.Critical,
  // Capitalized
  Info: Severity.Info,
  Low: Severity.Low,
  Medium: Severity.Medium,
  High: Severity.High,
  Critical: Severity.Critical,
  // Uppercase
  INFO: Severity.Info,
  LOW: Severity.Low,
  MEDIUM: Severity.Medium,
  HIGH: Severity.High,
  CRITICAL: Severity.Critical,
});

// ─── Severity Normalizer ─────────────────────────────────────

export interface SeverityNormalizationResult {
  readonly severity: Severity;
  readonly original: string | number;
  readonly wasNormalized: boolean;
  readonly source: string; // which map was used
}

/**
 * Normalize a severity value from any scanner into canonical Severity.
 *
 * Resolution order:
 * 1. Source-specific map (if sourceEngine is provided)
 * 2. Generic severity map
 * 3. Numeric mapping (0-4, 0-10, 0-100)
 * 4. CVSS score mapping
 * 5. Default to Info
 */
export function normalizeSeverity(
  value: string | number | undefined | null,
  sourceEngine?: string,
): SeverityNormalizationResult {
  // Handle undefined/null
  if (value === undefined || value === null) {
    return { severity: Severity.Info, original: value ?? 'undefined', wasNormalized: true, source: 'default' };
  }

  // Handle numeric input
  if (typeof value === 'number') {
    return normalizeNumericSeverity(value);
  }

  const strValue = String(value).trim();
  if (strValue === '') {
    return { severity: Severity.Info, original: strValue, wasNormalized: true, source: 'default' };
  }

  // 1. Source-specific map
  if (sourceEngine) {
    const sourceMap = getSourceSeverityMap(sourceEngine);
    if (sourceMap[strValue]) {
      return { severity: sourceMap[strValue], original: strValue, wasNormalized: sourceMap[strValue] !== strValue as unknown, source: sourceEngine };
    }
  }

  // 2. Generic map
  if (GENERIC_SEVERITY_MAP[strValue]) {
    return { severity: GENERIC_SEVERITY_MAP[strValue], original: strValue, wasNormalized: true, source: 'generic' };
  }

  // 3. Try as numeric string
  const numValue = parseFloat(strValue);
  if (!isNaN(numValue)) {
    return normalizeNumericSeverity(numValue);
  }

  // 4. Default
  return { severity: Severity.Info, original: strValue, wasNormalized: true, source: 'default' };
}

function normalizeNumericSeverity(value: number): SeverityNormalizationResult {
  // 0-4 scale
  if (value >= 0 && value <= 4 && Number.isInteger(value)) {
    const mapping: readonly Severity[] = [Severity.Info, Severity.Low, Severity.Medium, Severity.High, Severity.Critical];
    return { severity: mapping[value], original: value, wasNormalized: true, source: 'numeric_0_4' };
  }

  // CVSS 0-10 scale
  if (value >= 0 && value <= 10) {
    return { severity: cvssScoreToSeverity(value), original: value, wasNormalized: true, source: 'cvss' };
  }

  // Percentage 0-100 scale
  if (value >= 0 && value <= 100) {
    const normalized = value / 10; // Convert to 0-10 scale
    return { severity: cvssScoreToSeverity(normalized), original: value, wasNormalized: true, source: 'percentage' };
  }

  return { severity: Severity.Info, original: value, wasNormalized: true, source: 'default' };
}

function getSourceSeverityMap(sourceEngine: string): Readonly<Record<string, Severity>> {
  switch (sourceEngine) {
    case 'Nuclei':
      return NUCLEI_SEVERITY_MAP;
    case 'BrowserIntelligence':
      return BROWSER_INTEL_SEVERITY_MAP;
    case 'HTTPIntelligence':
      return HTTP_INTEL_SEVERITY_MAP;
    case 'DiscoveryEngine':
      return DISCOVERY_SEVERITY_MAP;
    default:
      return GENERIC_SEVERITY_MAP;
  }
}

/** Compare two severities: returns -1, 0, or 1 */
export function compareSeverities(a: Severity, b: Severity): number {
  return SEVERITY_ORDER[a] - SEVERITY_ORDER[b];
}

/** Get the maximum severity from a list */
export function maxSeverity(severities: readonly Severity[]): Severity {
  if (severities.length === 0) return Severity.Info;
  return severities.reduce((max, s) => SEVERITY_ORDER[s] > SEVERITY_ORDER[max] ? s : max);
}
