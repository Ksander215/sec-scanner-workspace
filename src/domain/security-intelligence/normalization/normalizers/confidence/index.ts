/**
 * Confidence Model
 *
 * Deterministic confidence scoring for security findings.
 * Confidence is calculated from four factors:
 *
 * 1. Source Reliability — how trustworthy is the scanner
 * 2. Evidence Quality — how strong is the supporting evidence
 * 3. Data Completeness — how complete is the finding data
 * 4. Result Reproducibility — can the finding be reproduced
 *
 * Each factor is scored 0–1, and the final confidence is
 * a weighted combination mapped to a ConfidenceLevel.
 */

import { ConfidenceLevel, CONFIDENCE_ORDER, SourceEngine } from '../../types/index.ts';

// ─── Source Reliability Weights ──────────────────────────────

/**
 * Base reliability of each scanner source.
 * These values reflect the typical accuracy and maturity
 * of each scanner type based on empirical observation.
 */
const SOURCE_RELIABILITY: Readonly<Record<string, number>> = Object.freeze({
  [SourceEngine.Nuclei]: 0.85,
  [SourceEngine.BrowserIntelligence]: 0.70,
  [SourceEngine.HTTPIntelligence]: 0.75,
  [SourceEngine.DiscoveryEngine]: 0.60,
  [SourceEngine.Manual]: 0.95,
  [SourceEngine.Unknown]: 0.30,
});

// ─── Confidence Weights ─────────────────────────────────────

/**
 * Weights for each confidence factor.
 * These determine the relative importance of each factor
 * in the final confidence score.
 */
export const CONFIDENCE_WEIGHTS = Object.freeze({
  sourceReliability: 0.25,
  evidenceQuality: 0.30,
  dataCompleteness: 0.25,
  reproducibility: 0.20,
});

// ─── Confidence Thresholds ───────────────────────────────────

/**
 * Thresholds for mapping numeric confidence (0–1)
 * to canonical ConfidenceLevel.
 */
const CONFIDENCE_THRESHOLDS = Object.freeze({
  [ConfidenceLevel.Unknown]: 0.0,
  [ConfidenceLevel.Low]: 0.2,
  [ConfidenceLevel.Medium]: 0.45,
  [ConfidenceLevel.High]: 0.70,
  [ConfidenceLevel.Confirmed]: 0.90,
});

// ─── Confidence Calculation Input ────────────────────────────

export interface ConfidenceInput {
  readonly sourceEngine: string;
  readonly hasEvidence: boolean;
  readonly evidenceCount: number;
  readonly evidenceTypes: readonly string[];
  readonly hasCompleteFields: boolean;
  readonly requiredFieldsPresent: number;
  readonly totalRequiredFields: number;
  readonly isReproducible: boolean;
  readonly reproductionCount?: number;
}

// ─── Confidence Result ───────────────────────────────────────

export interface ConfidenceResult {
  readonly level: ConfidenceLevel;
  readonly score: number;
  readonly factors: {
    readonly sourceReliability: number;
    readonly evidenceQuality: number;
    readonly dataCompleteness: number;
    readonly reproducibility: number;
  };
  readonly wasNormalized: boolean;
}

// ─── Confidence Normalizer ───────────────────────────────────

/**
 * Calculate deterministic confidence from input factors.
 *
 * The calculation is fully deterministic — the same input
 * always produces the same output. No randomness involved.
 */
export function calculateConfidence(input: ConfidenceInput): ConfidenceResult {
  // Factor 1: Source Reliability
  const sourceReliability = SOURCE_RELIABILITY[input.sourceEngine] ?? SOURCE_RELIABILITY[SourceEngine.Unknown] ?? 0.3;

  // Factor 2: Evidence Quality
  const evidenceQuality = calculateEvidenceQuality(
    input.hasEvidence,
    input.evidenceCount,
    input.evidenceTypes,
  );

  // Factor 3: Data Completeness
  const dataCompleteness = calculateDataCompleteness(
    input.hasCompleteFields,
    input.requiredFieldsPresent,
    input.totalRequiredFields,
  );

  // Factor 4: Reproducibility
  const reproducibility = calculateReproducibility(
    input.isReproducible,
    input.reproductionCount,
  );

  // Weighted combination
  const score =
    sourceReliability * CONFIDENCE_WEIGHTS.sourceReliability +
    evidenceQuality * CONFIDENCE_WEIGHTS.evidenceQuality +
    dataCompleteness * CONFIDENCE_WEIGHTS.dataCompleteness +
    reproducibility * CONFIDENCE_WEIGHTS.reproducibility;

  // Clamp to [0, 1]
  const clampedScore = Math.max(0, Math.min(1, score));

  // Map to ConfidenceLevel
  const level = scoreToLevel(clampedScore);

  return {
    level,
    score: Math.round(clampedScore * 1000) / 1000, // 3 decimal places
    factors: Object.freeze({
      sourceReliability: Math.round(sourceReliability * 1000) / 1000,
      evidenceQuality: Math.round(evidenceQuality * 1000) / 1000,
      dataCompleteness: Math.round(dataCompleteness * 1000) / 1000,
      reproducibility: Math.round(reproducibility * 1000) / 1000,
    }),
    wasNormalized: true,
  };
}

/**
 * Normalize an existing confidence value (string or number)
 * to a ConfidenceLevel.
 */
export function normalizeConfidence(
  value: string | number | undefined | null,
  sourceEngine?: string,
): ConfidenceResult {
  if (value === undefined || value === null) {
    return calculateConfidence({
      sourceEngine: sourceEngine ?? SourceEngine.Unknown,
      hasEvidence: false,
      evidenceCount: 0,
      evidenceTypes: [],
      hasCompleteFields: false,
      requiredFieldsPresent: 0,
      totalRequiredFields: 10,
      isReproducible: false,
    });
  }

  // String confidence
  if (typeof value === 'string') {
    const strValue = value.trim().toLowerCase();
    const stringMap: Readonly<Record<string, ConfidenceLevel>> = {
      unknown: ConfidenceLevel.Unknown,
      low: ConfidenceLevel.Low,
      medium: ConfidenceLevel.Medium,
      high: ConfidenceLevel.High,
      confirmed: ConfidenceLevel.Confirmed,
      certain: ConfidenceLevel.Confirmed,
      sure: ConfidenceLevel.Confirmed,
      tentative: ConfidenceLevel.Low,
      possible: ConfidenceLevel.Medium,
      probable: ConfidenceLevel.High,
      likely: ConfidenceLevel.High,
      unlikely: ConfidenceLevel.Low,
    };
    if (stringMap[strValue]) {
      const level = stringMap[strValue];
      return {
        level,
        score: levelToScore(level),
        factors: Object.freeze({
          sourceReliability: SOURCE_RELIABILITY[sourceEngine ?? SourceEngine.Unknown] ?? 0.3,
          evidenceQuality: 0.5,
          dataCompleteness: 0.5,
          reproducibility: 0.5,
        }),
        wasNormalized: true,
      };
    }
    // Try as numeric
    const num = parseFloat(strValue);
    if (!isNaN(num)) {
      return normalizeNumericConfidence(num, sourceEngine);
    }
  }

  // Numeric confidence
  if (typeof value === 'number') {
    return normalizeNumericConfidence(value, sourceEngine);
  }

  return {
    level: ConfidenceLevel.Unknown,
    score: 0,
    factors: Object.freeze({
      sourceReliability: 0.3,
      evidenceQuality: 0,
      dataCompleteness: 0,
      reproducibility: 0,
    }),
    wasNormalized: true,
  };
}

function normalizeNumericConfidence(value: number, sourceEngine?: string): ConfidenceResult {
  let normalized: number;
  // Disambiguate: integer 1 could be 0-100 scale (1%) or 0-1 scale (100%).
  // Use heuristic: if value is a float with decimal part, it's 0-1 scale.
  // If it's an integer 0 or 1, check context.
  if (value >= 0 && value <= 1 && !Number.isInteger(value)) {
    // Float in 0-1 range → definitely 0-1 scale
    normalized = value;
  } else if (Number.isInteger(value) && value >= 0 && value <= 1) {
    // Integer 0 or 1 → ambiguous; treat 0 as 0-1 scale, 1 as potentially 0-100 scale
    // Conservative: treat 1 as 0-1 scale (=1.0 = Confirmed) only if it's clearly a ratio
    // For safety, integer 1 in 0-1 scale means 100% → Confirmed
    // But integer 1 in 0-100 scale means 1% → Unknown
    // Default to 0-1 scale (more common in security tools)
    normalized = value;
  }
  // 0-100 scale (integer > 1 or any value > 1)
  else if (value > 1 && value <= 100) {
    normalized = value / 100;
  }
  // Exact 0 or 1 as float
  else if (value >= 0 && value <= 1) {
    normalized = value;
  }
  // Out of range — default
  else {
    normalized = 0;
  }
  const level = scoreToLevel(normalized);
  return {
    level,
    score: Math.round(normalized * 1000) / 1000,
    factors: Object.freeze({
      sourceReliability: SOURCE_RELIABILITY[sourceEngine ?? SourceEngine.Unknown] ?? 0.3,
      evidenceQuality: 0.5,
      dataCompleteness: 0.5,
      reproducibility: 0.5,
    }),
    wasNormalized: true,
  };
}

// ─── Helpers ─────────────────────────────────────────────────

function calculateEvidenceQuality(
  hasEvidence: boolean,
  evidenceCount: number,
  evidenceTypes: readonly string[],
): number {
  if (!hasEvidence) return 0.0;
  if (evidenceCount === 0) return 0.1;

  let quality = 0.2; // Base quality for having any evidence

  // More evidence → higher quality (diminishing returns)
  quality += Math.min(0.4, evidenceCount * 0.1);

  // Diverse evidence types → higher quality
  const uniqueTypes = new Set(evidenceTypes).size;
  quality += Math.min(0.3, uniqueTypes * 0.1);

  // Specific evidence types boost quality
  const highQualityTypes = new Set(['Request', 'Response', 'DOM', 'Certificate']);
  const hasHighQuality = evidenceTypes.some(t => highQualityTypes.has(t));
  if (hasHighQuality) quality += 0.1;

  return Math.min(1.0, quality);
}

function calculateDataCompleteness(
  hasCompleteFields: boolean,
  requiredFieldsPresent: number,
  totalRequiredFields: number,
): number {
  if (hasCompleteFields) return 1.0;
  if (totalRequiredFields === 0) return 0.5;
  return requiredFieldsPresent / totalRequiredFields;
}

function calculateReproducibility(
  isReproducible: boolean,
  reproductionCount?: number,
): number {
  if (!isReproducible) return 0.1;
  if (reproductionCount === undefined) return 0.6;
  // More reproductions → higher confidence (diminishing returns)
  return Math.min(1.0, 0.5 + reproductionCount * 0.1);
}

function scoreToLevel(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLDS[ConfidenceLevel.Confirmed]) return ConfidenceLevel.Confirmed;
  if (score >= CONFIDENCE_THRESHOLDS[ConfidenceLevel.High]) return ConfidenceLevel.High;
  if (score >= CONFIDENCE_THRESHOLDS[ConfidenceLevel.Medium]) return ConfidenceLevel.Medium;
  if (score >= CONFIDENCE_THRESHOLDS[ConfidenceLevel.Low]) return ConfidenceLevel.Low;
  return ConfidenceLevel.Unknown;
}

function levelToScore(level: ConfidenceLevel): number {
  // Return the midpoint of each threshold range
  switch (level) {
    case ConfidenceLevel.Unknown: return 0.1;
    case ConfidenceLevel.Low: return 0.3;
    case ConfidenceLevel.Medium: return 0.55;
    case ConfidenceLevel.High: return 0.8;
    case ConfidenceLevel.Confirmed: return 0.95;
  }
}

/** Compare two confidence levels */
export function compareConfidence(a: ConfidenceLevel, b: ConfidenceLevel): number {
  return CONFIDENCE_ORDER[a] - CONFIDENCE_ORDER[b];
}
