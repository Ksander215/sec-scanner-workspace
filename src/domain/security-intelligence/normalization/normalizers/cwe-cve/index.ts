/**
 * CWE/CVE Normalizer
 *
 * Normalizes various representations of CWE and CVE identifiers
 * into a unified format.
 *
 * CWE normalization:
 * - CWE-79, cwe79, CWE79, cwe-79 → CWE-79
 * - Extracts numeric ID for linking and comparison
 *
 * CVE normalization:
 * - CVE-2024-1234, cve-2024-1234, CVE2024-1234 → CVE-2024-1234
 * - Extracts year and sequence for linking and comparison
 */

import type { CWEReference, CVEReference } from '../../types/index.ts';
import { createCWEReference, createCVEReference } from '../../models/index.ts';

// ─── CWE Normalization ───────────────────────────────────────

/** Regex patterns for CWE identifier extraction */
const CWE_PATTERNS: readonly RegExp[] = [
  /^CWE[-_\s]?(\d+)$/i,   // CWE-79, CWE79, cwe_79, cwe 79
  /^cwe[-_\s]?(\d+)$/i,    // lowercase variants
  /^(\d+)$/,                // bare number (if clearly a CWE context)
];

/**
 * Normalize a CWE identifier to canonical format "CWE-{id}".
 *
 * Examples:
 * - "CWE-79"     → { id: "CWE-79", numericId: 79 }
 * - "cwe79"      → { id: "CWE-79", numericId: 79 }
 * - "CWE79"      → { id: "CWE-79", numericId: 79 }
 * - "cwe-79"     → { id: "CWE-79", numericId: 79 }
 * - "CWE_79"     → { id: "CWE-79", numericId: 79 }
 * - "79"         → { id: "CWE-79", numericId: 79 } (in CWE context)
 */
export function normalizeCWE(value: string | number | undefined | null): CWEReference | null {
  if (value === undefined || value === null) return null;

  const strValue = String(value).trim();
  if (strValue === '') return null;

  // Try each pattern
  for (const pattern of CWE_PATTERNS) {
    const match = strValue.match(pattern);
    if (match?.[1]) {
      const numericId = parseInt(match[1], 10);
      if (numericId > 0 && numericId <= 9999) {
        return createCWEReference(numericId);
      }
    }
  }

  return null;
}

/**
 * Normalize multiple CWE identifiers.
 * Deduplicates and filters invalid entries.
 */
export function normalizeCWEList(values: readonly (string | number)[] | string | undefined | null): CWEReference[] {
  if (!values) return [];
  if (typeof values === 'string') {
    // Comma-separated string
    const parts = values.split(/[,;]/).map(s => s.trim()).filter(Boolean);
    return deduplicateCWEs(parts.map(v => normalizeCWE(v)).filter((c): c is CWEReference => c !== null));
  }

  const normalized = values.map(v => normalizeCWE(v)).filter((c): c is CWEReference => c !== null);
  return deduplicateCWEs(normalized);
}

function deduplicateCWEs(cwes: CWEReference[]): CWEReference[] {
  const seen = new Set<number>();
  return cwes.filter(c => {
    if (seen.has(c.numericId)) return false;
    seen.add(c.numericId);
    return true;
  });
}

// ─── CVE Normalization ───────────────────────────────────────

/** Regex patterns for CVE identifier extraction */
const CVE_PATTERNS: readonly RegExp[] = [
  /^CVE[-_\s]?(\d{4})[-_\s]?(\d{4,})$/i,  // CVE-2024-1234, CVE2024-1234, cve_2024_1234
  /^(\d{4})[-_\s]?(\d{4,})$/,               // 2024-1234 (bare CVE context)
];

/**
 * Normalize a CVE identifier to canonical format "CVE-{year}-{sequence}".
 *
 * Examples:
 * - "CVE-2024-1234"    → { id: "CVE-2024-1234", year: 2024, sequence: "1234" }
 * - "cve-2024-1234"    → { id: "CVE-2024-1234", year: 2024, sequence: "1234" }
 * - "CVE2024-1234"     → { id: "CVE-2024-1234", year: 2024, sequence: "1234" }
 * - "cve_2024_1234"    → { id: "CVE-2024-1234", year: 2024, sequence: "1234" }
 * - "CVE-2024-1234567" → { id: "CVE-2024-1234567", year: 2024, sequence: "1234567" }
 */
export function normalizeCVE(value: string | undefined | null): CVEReference | null {
  if (value === undefined || value === null) return null;

  const strValue = String(value).trim();
  if (strValue === '') return null;

  for (const pattern of CVE_PATTERNS) {
    const match = strValue.match(pattern);
    if (match?.[1] && match?.[2]) {
      const year = parseInt(match[1], 10);
      const sequence = match[2];
      // Valid CVE year range
      if (year >= 1999 && year <= 2100 && sequence.length >= 4) {
        return createCVEReference(year, sequence);
      }
    }
  }

  return null;
}

/**
 * Normalize multiple CVE identifiers.
 * Deduplicates and filters invalid entries.
 */
export function normalizeCVEList(values: readonly string[] | string | undefined | null): CVEReference[] {
  if (!values) return [];
  if (typeof values === 'string') {
    const parts = values.split(/[,;]/).map(s => s.trim()).filter(Boolean);
    return deduplicateCVEs(parts.map(v => normalizeCVE(v)).filter((c): c is CVEReference => c !== null));
  }

  const normalized = values.map(v => normalizeCVE(v)).filter((c): c is CVEReference => c !== null);
  return deduplicateCVEs(normalized);
}

function deduplicateCVEs(cves: CVEReference[]): CVEReference[] {
  const seen = new Set<string>();
  return cves.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

// ─── CVSS Normalization ──────────────────────────────────────

/**
 * Normalize CVSS input to a structured CVSSScore.
 * Accepts:
 * - Numeric score (0-10)
 * - CVSS vector string ("AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")
 * - Object with score and/or vector
 */
export function normalizeCVSS(
  value: string | number | Record<string, unknown> | undefined | null,
): { score: number; vector: string; version: string } | null {
  if (value === undefined || value === null) return null;

  // Numeric
  if (typeof value === 'number') {
    if (value >= 0 && value <= 10) {
      return { score: value, vector: '', version: '3.1' };
    }
    return null;
  }

  // String — could be a number or a vector
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Try as numeric
    const num = parseFloat(trimmed);
    if (!isNaN(num) && num >= 0 && num <= 10) {
      return { score: num, vector: '', version: '3.1' };
    }

    // Try as CVSS vector
    if (trimmed.startsWith('CVSS:') || trimmed.match(/^AV:[NALH]/)) {
      const vectorStr = trimmed.startsWith('CVSS:') ? trimmed : `CVSS:3.1/${trimmed}`;
      // Do NOT estimate a score from the vector — heuristic is too inaccurate.
      // Return with score 0 and let downstream systems calculate the proper score.
      return { score: 0, vector: vectorStr, version: '3.1' };
    }

    return null;
  }

  // Object
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const score = typeof obj.score === 'number' ? obj.score : (typeof obj.baseScore === 'number' ? obj.baseScore : null);
    const vector = typeof obj.vector === 'string' ? obj.vector : '';
    const version = typeof obj.version === 'string' ? obj.version : '3.1';

    if (score !== null && score >= 0 && score <= 10) {
      return { score, vector, version };
    }
  }

  return null;
}
