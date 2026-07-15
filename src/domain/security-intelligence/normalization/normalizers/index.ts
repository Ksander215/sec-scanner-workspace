/**
 * Security Intelligence Normalization — Normalizers
 *
 * Re-exports all individual normalizer modules.
 * Each normalizer handles a specific aspect of finding normalization:
 *
 * - severity:    Scanner-specific severity → canonical Severity
 * - confidence:  Deterministic confidence scoring
 * - cwe-cve:     CWE/CVE identifier normalization
 * - technology:  Technology name mapping
 * - url:         URL canonicalization
 * - evidence:    Evidence structure normalization
 * - asset:       Asset type resolution
 * - validation:  Finding validation
 */

// ─── Severity ────────────────────────────────────────────────

export {
  normalizeSeverity,
  cvssScoreToSeverity,
  compareSeverities,
  maxSeverity,
} from './severity/index.ts';

export type { SeverityNormalizationResult } from './severity/index.ts';

// ─── Confidence ──────────────────────────────────────────────

export {
  calculateConfidence,
  normalizeConfidence,
  compareConfidence,
} from './confidence/index.ts';

export type {
  ConfidenceInput,
  ConfidenceResult,
} from './confidence/index.ts';

export { CONFIDENCE_WEIGHTS } from './confidence/index.ts';

// ─── CWE/CVE ────────────────────────────────────────────────

export {
  normalizeCWE,
  normalizeCWEList,
  normalizeCVE,
  normalizeCVEList,
  normalizeCVSS,
} from './cwe-cve/index.ts';

// ─── Technology ──────────────────────────────────────────────

export {
  normalizeTechnology,
  normalizeTechnologyList,
  isKnownTechnology,
  getKnownTechnologies,
  getTechnologyAliases,
} from './technology/index.ts';

export type { TechnologyNormalizationResult } from './technology/index.ts';

// ─── URL ─────────────────────────────────────────────────────

export {
  normalizeURL,
  urlsEqual,
  canonicalURLToString,
  extractRootURL,
} from './url/index.ts';

export type { URLNormalizationResult } from './url/index.ts';

// ─── Evidence ────────────────────────────────────────────────

export {
  normalizeEvidence,
  normalizeEvidenceList,
  detectEvidenceType,
} from './evidence/index.ts';

export type { EvidenceNormalizationResult } from './evidence/index.ts';

// ─── Asset ───────────────────────────────────────────────────

export {
  resolveAsset,
  determineAssetType,
} from './asset/index.ts';

export type { AssetResolutionResult } from './asset/index.ts';

// ─── Validation ──────────────────────────────────────────────

export {
  validateFinding,
  validateFindingBatch,
} from './validation/index.ts';
