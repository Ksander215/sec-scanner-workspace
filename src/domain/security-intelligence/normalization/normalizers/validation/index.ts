/**
 * Finding Validation Normalizer
 *
 * Validates canonical findings against strict rules:
 * - Required fields must be present and non-empty
 * - Finding IDs must be unique
 * - Identifiers (CWE, CVE) must be well-formed
 * - References must be valid URLs
 * - Severity and confidence must be in valid ranges
 */

import type {
  CanonicalFinding, ValidationResult, ValidationError, ValidationWarning,
  Severity, ConfidenceLevel, FindingId,
} from '../../types/index.ts';
import { Severity as Sev, ConfidenceLevel as Conf, ALL_SEVERITIES, ALL_SOURCE_ENGINES, SourceEngine } from '../../types/index.ts';

// ─── Required Fields ─────────────────────────────────────────

const REQUIRED_FIELDS: readonly string[] = [
  'id', 'sourceEngine', 'category', 'title', 'description',
  'severity', 'confidence', 'confidenceScore', 'discoveredAt', 'normalizedAt',
];

// ─── Validation ──────────────────────────────────────────────

/**
 * Validate a canonical finding.
 * Returns a list of errors and warnings.
 */
export function validateFinding(finding: CanonicalFinding): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 1. Required fields
  validateRequiredFields(finding, errors);

  // 2. ID format
  validateIdFormat(finding, errors, warnings);

  // 3. Severity validity
  validateSeverity(finding, errors);

  // 4. Confidence validity
  validateConfidence(finding, errors, warnings);

  // 5. CWE/CVE references
  validateReferences(finding, warnings);

  // 6. URL references
  validateURLReferences(finding, warnings);

  // 7. Source engine
  validateSourceEngine(finding, warnings);

  // 8. CVSS consistency
  validateCVSSConsistency(finding, warnings);

  // 9. Timestamp validity
  validateTimestamps(finding, errors);

  return {
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
  };
}

/**
 * Validate a batch of findings.
 * Checks for duplicate IDs across the batch.
 */
export function validateFindingBatch(findings: readonly CanonicalFinding[]): ValidationResult & {
  readonly duplicates: readonly FindingId[];
} {
  const individualResults = findings.map(f => validateFinding(f));
  const allErrors = individualResults.flatMap(r => r.errors);
  const allWarnings = individualResults.flatMap(r => r.warnings);

  // Check for duplicate IDs
  const seen = new Map<FindingId, number>();
  const duplicates: FindingId[] = [];

  for (const finding of findings) {
    const count = seen.get(finding.id) ?? 0;
    if (count > 0) {
      duplicates.push(finding.id);
      allErrors.push({
        field: 'id',
        message: `Duplicate finding ID: ${finding.id} (occurrence ${count + 1})`,
        code: 'DUPLICATE_ID',
      });
    }
    seen.set(finding.id, count + 1);
  }

  return {
    valid: allErrors.length === 0,
    errors: Object.freeze(allErrors),
    warnings: Object.freeze(allWarnings),
    duplicates: Object.freeze(duplicates),
  };
}

// ─── Individual Validations ──────────────────────────────────

function validateRequiredFields(finding: CanonicalFinding, errors: ValidationError[]): void {
  for (const field of REQUIRED_FIELDS) {
    const value = (finding as Record<string, unknown>)[field];
    if (value === undefined || value === null || value === '') {
      errors.push({
        field,
        message: `Required field '${field}' is missing or empty`,
        code: 'REQUIRED_FIELD_MISSING',
      });
    }
  }

  // Title and description should be meaningful
  if (finding.title && finding.title.trim().length < 3) {
    errors.push({
      field: 'title',
      message: 'Title must be at least 3 characters',
      code: 'TITLE_TOO_SHORT',
    });
  }

  if (finding.description && finding.description.trim().length < 10) {
    warnings.push({
      field: 'description',
      message: 'Description should be at least 10 characters for meaningful context',
      code: 'DESCRIPTION_TOO_SHORT',
    });
  }
}

function validateIdFormat(finding: CanonicalFinding, errors: ValidationError[], warnings: ValidationWarning[]): void {
  if (!finding.id) return;

  // FindingId should follow the format: fnd_{source}_{id}
  if (!finding.id.startsWith('fnd_')) {
    warnings.push({
      field: 'id',
      message: `Finding ID does not follow canonical format (expected 'fnd_...'): ${finding.id}`,
      code: 'NON_CANONICAL_ID',
    });
  }

  // Max ID length
  if (finding.id.length > 256) {
    errors.push({
      field: 'id',
      message: `Finding ID exceeds maximum length (256): ${finding.id.length}`,
      code: 'ID_TOO_LONG',
    });
  }
}

function validateSeverity(finding: CanonicalFinding, errors: ValidationError[]): void {
  const validSeverities = new Set<string>(ALL_SEVERITIES);
  if (!validSeverities.has(finding.severity)) {
    errors.push({
      field: 'severity',
      message: `Invalid severity: ${finding.severity}. Must be one of: ${ALL_SEVERITIES.join(', ')}`,
      code: 'INVALID_SEVERITY',
    });
  }
}

function validateConfidence(finding: CanonicalFinding, errors: ValidationError[], warnings: ValidationWarning[]): void {
  const validLevels = new Set<string>(Object.values(Conf));
  if (!validLevels.has(finding.confidence)) {
    errors.push({
      field: 'confidence',
      message: `Invalid confidence level: ${finding.confidence}`,
      code: 'INVALID_CONFIDENCE',
    });
  }

  // Confidence score should be 0-1
  if (finding.confidenceScore < 0 || finding.confidenceScore > 1) {
    errors.push({
      field: 'confidenceScore',
      message: `Confidence score out of range [0,1]: ${finding.confidenceScore}`,
      code: 'INVALID_CONFIDENCE_SCORE',
    });
  }

  // Score should roughly match level
  const expectedRange = getConfidenceScoreRange(finding.confidence);
  if (finding.confidenceScore < expectedRange.min || finding.confidenceScore > expectedRange.max) {
    warnings.push({
      field: 'confidenceScore',
      message: `Confidence score ${finding.confidenceScore} does not match level ${finding.confidence} (expected ${expectedRange.min}-${expectedRange.max})`,
      code: 'CONFIDENCE_SCORE_MISMATCH',
    });
  }
}

function validateReferences(finding: CanonicalFinding, warnings: ValidationWarning[]): void {
  // CWE references
  for (const cwe of finding.cwe) {
    if (!cwe.id || !cwe.id.match(/^CWE-\d+$/)) {
      warnings.push({
        field: 'cwe',
        message: `CWE ID does not follow canonical format: ${cwe.id}`,
        code: 'NON_CANONICAL_CWE',
      });
    }
    if (cwe.numericId <= 0 || cwe.numericId > 9999) {
      warnings.push({
        field: 'cwe',
        message: `CWE numeric ID out of range: ${cwe.numericId}`,
        code: 'INVALID_CWE_NUMBER',
      });
    }
  }

  // CVE references
  for (const cve of finding.cve) {
    if (!cve.id || !cve.id.match(/^CVE-\d{4}-\d{4,}$/)) {
      warnings.push({
        field: 'cve',
        message: `CVE ID does not follow canonical format: ${cve.id}`,
        code: 'NON_CANONICAL_CVE',
      });
    }
    if (cve.year < 1999 || cve.year > 2100) {
      warnings.push({
        field: 'cve',
        message: `CVE year out of range: ${cve.year}`,
        code: 'INVALID_CVE_YEAR',
      });
    }
  }
}

function validateURLReferences(finding: CanonicalFinding, warnings: ValidationWarning[]): void {
  for (const ref of finding.references) {
    try {
      new URL(ref);
    } catch {
      warnings.push({
        field: 'references',
        message: `Invalid URL in references: ${ref}`,
        code: 'INVALID_REFERENCE_URL',
      });
    }
  }
}

function validateSourceEngine(finding: CanonicalFinding, warnings: ValidationWarning[]): void {
  const validSources = new Set<string>(ALL_SOURCE_ENGINES);
  if (!validSources.has(finding.sourceEngine)) {
    warnings.push({
      field: 'sourceEngine',
      message: `Unknown source engine: ${finding.sourceEngine}`,
      code: 'UNKNOWN_SOURCE_ENGINE',
    });
  }
}

function validateCVSSConsistency(finding: CanonicalFinding, warnings: ValidationWarning[]): void {
  if (!finding.cvss) return;

  if (finding.cvss.score < 0 || finding.cvss.score > 10) {
    warnings.push({
      field: 'cvss',
      message: `CVSS score out of range [0,10]: ${finding.cvss.score}`,
      code: 'INVALID_CVSS_SCORE',
    });
  }

  // CVSS score should roughly match severity
  const expectedSeverity = cvssToExpectedSeverity(finding.cvss.score);
  if (finding.severity !== expectedSeverity && finding.severity !== Sev.Info) {
    warnings.push({
      field: 'cvss',
      message: `CVSS score ${finding.cvss.score} suggests severity ${expectedSeverity}, but finding has ${finding.severity}`,
      code: 'CVSS_SEVERITY_MISMATCH',
    });
  }
}

function validateTimestamps(finding: CanonicalFinding, errors: ValidationError[]): void {
  // discoveredAt should be a valid ISO date
  if (finding.discoveredAt) {
    const d = new Date(finding.discoveredAt);
    if (isNaN(d.getTime())) {
      errors.push({
        field: 'discoveredAt',
        message: `Invalid timestamp: ${finding.discoveredAt}`,
        code: 'INVALID_TIMESTAMP',
      });
    }
  }

  if (finding.normalizedAt) {
    const d = new Date(finding.normalizedAt);
    if (isNaN(d.getTime())) {
      errors.push({
        field: 'normalizedAt',
        message: `Invalid timestamp: ${finding.normalizedAt}`,
        code: 'INVALID_TIMESTAMP',
      });
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function getConfidenceScoreRange(level: ConfidenceLevel): { min: number; max: number } {
  switch (level) {
    case Conf.Unknown: return { min: 0, max: 0.19 };
    case Conf.Low: return { min: 0.2, max: 0.44 };
    case Conf.Medium: return { min: 0.45, max: 0.69 };
    case Conf.High: return { min: 0.7, max: 0.89 };
    case Conf.Confirmed: return { min: 0.9, max: 1.0 };
  }
}

function cvssToExpectedSeverity(score: number): Severity {
  if (score <= 0) return Sev.Info;
  if (score <= 3.9) return Sev.Low;
  if (score <= 6.9) return Sev.Medium;
  if (score <= 8.9) return Sev.High;
  return Sev.Critical;
}
