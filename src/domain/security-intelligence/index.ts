/**
 * Security Intelligence — Public API
 *
 * Entry point for the Security Intelligence domain.
 * Currently provides the Finding Normalization Engine.
 *
 * Future modules (NOT yet implemented):
 * - INT-002B: Security Correlation Engine
 * - Risk Engine
 * - Attack Path Builder
 * - Recommendation Engine
 */

// ─── Normalization ───────────────────────────────────────────

export {
  // Types
  type FindingId, type EvidenceId, type AssetId, type Timestamp, type Metadata, type StringMap,
  type Severity, type SourceEngine, type FindingCategory, type ConfidenceLevel,
  type EvidenceType, type AssetType,
  type CWEReference, type CVEReference, type CVSSScore,
  type CanonicalURL, type AffectedAsset, type NormalizedEvidence,
  type CanonicalFinding,
  type RawFinding,
  type NormalizationResult, type BatchNormalizationResult,
  type NormalizationError, type NormalizationWarning, type BatchNormalizationError,
  type ValidationResult, type ValidationError, type ValidationWarning,
  type NormalizationConfig, type NormalizationStatistics,

  // Enums & Constants
  brandFindingId, brandEvidenceId, brandAssetId,
  Severity, SourceEngine, FindingCategory, ConfidenceLevel,
  EvidenceType, AssetType,
  ALL_SEVERITIES, ALL_SOURCE_ENGINES, SEVERITY_ORDER, CONFIDENCE_ORDER,
  DEFAULT_NORMALIZATION_CONFIG,

  // Models
  generateFindingId, generateEvidenceId, generateAssetId,
  createCanonicalFinding, createCWEReference, createCVEReference,
  createCVSSScore, createCanonicalURL, createAffectedAsset, createNormalizedEvidence,
  canonicalFindingToJSON, canonicalFindingFromJSON,
  canonicalFindingsEqual, cloneCanonicalFinding, hashCanonicalFinding,

  // Events
  type FindingNormalizedEvent, type NormalizationFailedEvent,
  type BatchNormalizedEvent, type CanonicalizationCompletedEvent,
  type AnyNormalizationEvent, type NormalizationEventHandler,
  createFindingNormalizedEvent, createNormalizationFailedEvent,
  createBatchNormalizedEvent, createCanonicalizationCompletedEvent,
  NormalizationEventBus,

  // Normalizers
  normalizeSeverity, cvssScoreToSeverity, compareSeverities, maxSeverity,
  calculateConfidence, normalizeConfidence, compareConfidence, CONFIDENCE_WEIGHTS,
  normalizeCWE, normalizeCWEList, normalizeCVE, normalizeCVEList, normalizeCVSS,
  normalizeTechnology, normalizeTechnologyList, isKnownTechnology, getKnownTechnologies, getTechnologyAliases,
  normalizeURL, urlsEqual, canonicalURLToString, extractRootURL,
  normalizeEvidence, normalizeEvidenceList, detectEvidenceType,
  resolveAsset, determineAssetType,
  validateFinding, validateFindingBatch,

  // Normalizer Types
  type SeverityNormalizationResult, type ConfidenceInput, type ConfidenceResult,
  type TechnologyNormalizationResult, type URLNormalizationResult,
  type EvidenceNormalizationResult, type AssetResolutionResult,

  // Engine
  FindingNormalizationEngine,

  // Statistics
  NormalizationStatisticsCollector,
} from './normalization/index.ts';
