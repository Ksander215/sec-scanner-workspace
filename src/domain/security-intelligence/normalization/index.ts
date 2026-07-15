/**
 * Security Intelligence Normalization Engine — Public API
 *
 * Single entry point for the Finding Normalization layer.
 * Transforms raw scanner outputs into canonical CanonicalFinding format.
 *
 * Usage:
 * ```ts
 * import { FindingNormalizationEngine } from './normalization/index.ts';
 *
 * const engine = new FindingNormalizationEngine({ engineId: 'main' });
 *
 * const result = engine.normalize({
 *   sourceEngine: 'Nuclei',
 *   title: 'SQL Injection',
 *   severity: 'high',
 *   endpoint: 'https://example.com/api/users',
 * });
 *
 * if (result.success) {
 *   console.log(result.finding.severity); // "High"
 * }
 *
 * const batch = engine.normalizeBatch(rawFindings);
 * console.log(batch.throughputPerSecond);
 * ```
 *
 * Architecture:
 * - Types: Enums, branded IDs, interfaces
 * - Models: CanonicalFinding, Evidence, Asset
 * - Normalizers: Severity, Confidence, CWE/CVE, Technology, URL, Evidence, Asset, Validation
 * - Engine: FindingNormalizationEngine (main orchestrator)
 * - Statistics: Comprehensive metrics
 * - Events: Normalization lifecycle observability
 */

// ─── Types ───────────────────────────────────────────────────

export type {
  FindingId, EvidenceId, AssetId, Timestamp, Metadata, StringMap,
  Severity, SourceEngine, FindingCategory, ConfidenceLevel,
  EvidenceType, AssetType,
  CWEReference, CVEReference, CVSSScore,
  CanonicalURL, AffectedAsset, NormalizedEvidence,
  CanonicalFinding,
  RawFinding,
  NormalizationResult, BatchNormalizationResult,
  NormalizationError, NormalizationWarning, BatchNormalizationError,
  ValidationResult, ValidationError, ValidationWarning,
  NormalizationConfig, NormalizationStatistics,
} from './types/index.ts';

export {
  brandFindingId, brandEvidenceId, brandAssetId,
  Severity, SourceEngine, FindingCategory, ConfidenceLevel,
  EvidenceType, AssetType,
  ALL_SEVERITIES, ALL_SOURCE_ENGINES, SEVERITY_ORDER, CONFIDENCE_ORDER,
  DEFAULT_NORMALIZATION_CONFIG,
} from './types/index.ts';

// ─── Models ──────────────────────────────────────────────────

export type {
  CanonicalFinding as CanonicalFindingType,
  AffectedAsset as AffectedAssetType,
  CanonicalURL as CanonicalURLType,
  NormalizedEvidence as NormalizedEvidenceType,
} from './models/index.ts';

export {
  generateFindingId,
  generateEvidenceId,
  generateAssetId,
  createCanonicalFinding,
  createCWEReference,
  createCVEReference,
  createCVSSScore,
  createCanonicalURL,
  createAffectedAsset,
  createNormalizedEvidence,
  canonicalFindingToJSON,
  canonicalFindingFromJSON,
  canonicalFindingsEqual,
  cloneCanonicalFinding,
  hashCanonicalFinding,
} from './models/index.ts';

// ─── Events ──────────────────────────────────────────────────

export type {
  NormalizationEvent,
  FindingNormalizedEvent,
  NormalizationFailedEvent,
  BatchNormalizedEvent,
  CanonicalizationCompletedEvent,
  AnyNormalizationEvent,
  NormalizationEventHandler,
} from './events/index.ts';

export {
  createFindingNormalizedEvent,
  createNormalizationFailedEvent,
  createBatchNormalizedEvent,
  createCanonicalizationCompletedEvent,
  NormalizationEventBus,
} from './events/index.ts';

// ─── Normalizers ─────────────────────────────────────────────

export {
  normalizeSeverity,
  cvssScoreToSeverity,
  compareSeverities,
  maxSeverity,
  calculateConfidence,
  normalizeConfidence,
  compareConfidence,
  CONFIDENCE_WEIGHTS,
  normalizeCWE,
  normalizeCWEList,
  normalizeCVE,
  normalizeCVEList,
  normalizeCVSS,
  normalizeTechnology,
  normalizeTechnologyList,
  isKnownTechnology,
  getKnownTechnologies,
  getTechnologyAliases,
  normalizeURL,
  urlsEqual,
  canonicalURLToString,
  extractRootURL,
  normalizeEvidence,
  normalizeEvidenceList,
  detectEvidenceType,
  resolveAsset,
  determineAssetType,
  validateFinding,
  validateFindingBatch,
} from './normalizers/index.ts';

export type {
  SeverityNormalizationResult,
  ConfidenceInput,
  ConfidenceResult,
  TechnologyNormalizationResult,
  URLNormalizationResult,
  EvidenceNormalizationResult,
  AssetResolutionResult,
} from './normalizers/index.ts';

// ─── Engine ──────────────────────────────────────────────────

export { FindingNormalizationEngine } from './engine/index.ts';

// ─── Statistics ──────────────────────────────────────────────

export { NormalizationStatisticsCollector } from './statistics/index.ts';
