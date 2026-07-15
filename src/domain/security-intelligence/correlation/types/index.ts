/**
 * Security Intelligence Correlation Engine — Type Definitions
 *
 * All types, interfaces, and enums for the Correlation Engine layer.
 * These types define the correlation models that connect
 * CanonicalFindings into a unified intelligence model.
 *
 * Design principles:
 * - All correlation models are immutable and deeply frozen
 * - Branded IDs prevent accidental mixing with Finding/Node IDs
 * - Correlation scores are deterministic (0.0–1.0)
 * - Rules are extensible through the Rule Registry
 * - Batch processing is first-class
 */

import type { FindingId, Severity, SourceEngine, FindingCategory } from '../../normalization/types/index.ts';

// ─── Branded ID Types ────────────────────────────────────────

/** Branded string for Correlation IDs */
export type CorrelationId = string & { readonly __brand: 'CorrelationId' };

/** Branded string for CorrelationGroup IDs */
export type CorrelationGroupId = string & { readonly __brand: 'CorrelationGroupId' };

/** Branded string for CorrelationEdge IDs */
export type CorrelationEdgeId = string & { readonly __brand: 'CorrelationEdgeId' };

/** Brand a plain string as a CorrelationId */
export function brandCorrelationId(id: string): CorrelationId {
  return id as CorrelationId;
}

/** Brand a plain string as a CorrelationGroupId */
export function brandCorrelationGroupId(id: string): CorrelationGroupId {
  return id as CorrelationGroupId;
}

/** Brand a plain string as a CorrelationEdgeId */
export function brandCorrelationEdgeId(id: string): CorrelationEdgeId {
  return id as CorrelationEdgeId;
}

// ─── Utility Types ───────────────────────────────────────────

/** ISO-8601 timestamp string */
export type Timestamp = string;

/** Arbitrary key-value metadata */
export type Metadata = Readonly<Record<string, string | number | boolean | null>>;

// ─── Correlation Reason ──────────────────────────────────────

/**
 * Why two findings are correlated.
 * Each reason corresponds to a correlation rule.
 */
export enum CorrelationReason {
  SameHost = 'SameHost',
  SameEndpoint = 'SameEndpoint',
  SamePath = 'SamePath',
  SameURL = 'SameURL',
  SameService = 'SameService',
  SameTechnology = 'SameTechnology',
  SameCVE = 'SameCVE',
  SameCWE = 'SameCWE',
  SameCookie = 'SameCookie',
  SameHeader = 'SameHeader',
  SameSecret = 'SameSecret',
  SameIdentity = 'SameIdentity',
  SameCertificate = 'SameCertificate',
  SharedEvidence = 'SharedEvidence',
  SharedRequest = 'SharedRequest',
  SharedResponse = 'SharedResponse',
  SharedAuthentication = 'SharedAuthentication',
  SharedComponent = 'SharedComponent',
}

/** All correlation reason values */
export const ALL_CORRELATION_REASONS: readonly CorrelationReason[] = Object.values(CorrelationReason) as CorrelationReason[];

// ─── Duplicate Type ──────────────────────────────────────────

/**
 * Classification of finding duplicates.
 * Ordered by similarity strength.
 */
export enum DuplicateType {
  ExactDuplicate = 'ExactDuplicate',
  SemanticDuplicate = 'SemanticDuplicate',
  SimilarFinding = 'SimilarFinding',
  RelatedFinding = 'RelatedFinding',
}

/** All duplicate type values */
export const ALL_DUPLICATE_TYPES: readonly DuplicateType[] = Object.values(DuplicateType) as DuplicateType[];

// ─── Correlation Evidence ────────────────────────────────────

/**
 * Evidence supporting a correlation between two findings.
 * Captures what specific data points were shared/matched.
 */
export interface CorrelationEvidence {
  readonly reason: CorrelationReason;
  readonly sharedValue: string;
  readonly sourceField: string;
  readonly targetField: string;
  readonly confidence: number; // 0.0–1.0
}

// ─── Correlation Edge ────────────────────────────────────────

/**
 * A directed edge in the correlation graph connecting two findings.
 * Each edge has a weight, reason, and supporting evidence.
 */
export interface CorrelationEdge {
  readonly id: CorrelationEdgeId;
  readonly sourceFindingId: FindingId;
  readonly targetFindingId: FindingId;
  readonly reasons: readonly CorrelationReason[];
  readonly score: number; // 0.0–1.0
  readonly evidence: readonly CorrelationEvidence[];
  readonly metadata: Metadata;
  readonly createdAt: Timestamp;
}

// ─── Correlation Group ───────────────────────────────────────

/**
 * A group of correlated findings that share common characteristics.
 * Groups can represent attack surfaces, vulnerability clusters, etc.
 */
export interface CorrelationGroup {
  readonly id: CorrelationGroupId;
  readonly findingIds: readonly FindingId[];
  readonly dominantCategory: FindingCategory;
  readonly dominantSeverity: Severity;
  readonly correlationScore: number; // 0.0–1.0 (highest edge score in group)
  readonly reasons: readonly CorrelationReason[];
  readonly representativeFindingId: FindingId; // highest severity finding
  readonly metadata: Metadata;
  readonly createdAt: Timestamp;
}

// ─── Correlation ─────────────────────────────────────────────

/**
 * A single correlation between two findings.
 * Contains the edge data plus computed properties.
 */
export interface Correlation {
  readonly id: CorrelationId;
  readonly sourceFindingId: FindingId;
  readonly targetFindingId: FindingId;
  readonly score: number; // 0.0–1.0
  readonly reasons: readonly CorrelationReason[];
  readonly evidence: readonly CorrelationEvidence[];
  readonly duplicateType: DuplicateType | null;
  readonly metadata: Metadata;
  readonly createdAt: Timestamp;
}

// ─── Correlation Result ──────────────────────────────────────

/** Result of correlating a set of findings */
export interface CorrelationResult {
  readonly correlations: readonly Correlation[];
  readonly groups: readonly CorrelationGroup[];
  readonly duplicates: readonly DuplicateDetection[];
  readonly statistics: CorrelationResultStatistics;
  readonly durationMs: number;
}

/** Statistics about a correlation run */
export interface CorrelationResultStatistics {
  readonly totalFindings: number;
  readonly totalCorrelations: number;
  readonly totalGroups: number;
  readonly totalDuplicates: number;
  readonly averageCorrelationScore: number;
  readonly reasonDistribution: Readonly<Record<CorrelationReason, number>>;
  readonly duplicateTypeDistribution: Readonly<Record<DuplicateType, number>>;
  readonly severityDistribution: Readonly<Record<Severity, number>>;
  readonly sourceDistribution: Readonly<Record<SourceEngine, number>>;
}

// ─── Duplicate Detection ─────────────────────────────────────

/** A detected duplicate between two findings */
export interface DuplicateDetection {
  readonly originalFindingId: FindingId;
  readonly duplicateFindingId: FindingId;
  readonly duplicateType: DuplicateType;
  readonly similarity: number; // 0.0–1.0
  readonly evidence: readonly CorrelationEvidence[];
  readonly metadata: Metadata;
}

// ─── Correlation Config ──────────────────────────────────────

/** Configuration for the correlation engine */
export interface CorrelationConfig {
  readonly engineId: string;
  readonly minCorrelationScore: number; // 0.0–1.0, minimum score to create correlation
  readonly duplicateThreshold: number; // 0.0–1.0, minimum score to flag as duplicate
  readonly exactDuplicateThreshold: number;
  readonly semanticDuplicateThreshold: number;
  readonly similarFindingThreshold: number;
  readonly enableCaching: boolean;
  readonly cacheSize: number;
  readonly cacheTtlMs: number;
  readonly batchSize: number;
  readonly maxGroupSize: number;
  readonly normalizerVersion: string;
}

/** Default correlation configuration */
export const DEFAULT_CORRELATION_CONFIG: CorrelationConfig = Object.freeze({
  engineId: 'default',
  minCorrelationScore: 0.3,
  duplicateThreshold: 0.7,
  exactDuplicateThreshold: 0.95,
  semanticDuplicateThreshold: 0.85,
  similarFindingThreshold: 0.7,
  enableCaching: true,
  cacheSize: 10_000,
  cacheTtlMs: 300_000, // 5 minutes
  batchSize: 1000,
  maxGroupSize: 100,
  normalizerVersion: '1.0.0',
});

// ─── Correlation Statistics ──────────────────────────────────

/** Comprehensive correlation engine statistics */
export interface CorrelationStatistics {
  readonly totalCorrelated: number;
  readonly totalFailed: number;
  readonly totalBatches: number;
  readonly totalIncremental: number;
  readonly totalDeduplications: number;
  readonly averageCorrelationTimeMs: number;
  readonly averageBatchTimeMs: number;
  readonly throughputPerSecond: number;
  readonly cacheHitRate: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly memoryUsageBytes: number;
  readonly correlationDistribution: Readonly<Record<string, number>>;
  readonly duplicateDistribution: Readonly<Record<string, number>>;
  readonly collectedAt: Timestamp;
}

// ─── Correlation Rule Interface ──────────────────────────────

/**
 * Interface for a correlation rule.
 * Each rule examines two findings and returns a match score.
 */
export interface CorrelationRule {
  readonly name: string;
  readonly reason: CorrelationReason;
  readonly weight: number; // 0.0–1.0
  readonly description: string;

  /** Evaluate if two findings match this rule */
  evaluate(source: CorrelationFindingInput, target: CorrelationFindingInput): CorrelationRuleResult;
}

/** Simplified finding input for correlation rules */
export interface CorrelationFindingInput {
  readonly id: FindingId;
  readonly sourceEngine: SourceEngine;
  readonly category: FindingCategory;
  readonly severity: Severity;
  readonly title: string;
  readonly description: string;
  readonly cve: readonly string[];
  readonly cwe: readonly string[];
  readonly affectedAsset: string | null;
  readonly endpoint: string | null;
  readonly technology: readonly string[];
  readonly evidence: readonly CorrelationEvidenceInput[];
  readonly tags: readonly string[];
  readonly metadata: Metadata;
}

/** Evidence input for correlation */
export interface CorrelationEvidenceInput {
  readonly type: string;
  readonly data: Metadata;
}

/** Result of evaluating a correlation rule */
export interface CorrelationRuleResult {
  readonly matched: boolean;
  readonly score: number; // 0.0–1.0
  readonly evidence: CorrelationEvidence | null;
}

// ─── Cache Entry ─────────────────────────────────────────────

/** Entry in the correlation cache */
export interface CorrelationCacheEntry {
  readonly key: string;
  readonly value: CorrelationResult;
  readonly createdAt: Timestamp;
  readonly expiresAt: Timestamp;
  readonly accessCount: number;
}

// ─── Validation Result ───────────────────────────────────────

/** Result of validating a correlation */
export interface CorrelationValidationResult {
  readonly valid: boolean;
  readonly errors: readonly CorrelationValidationError[];
  readonly warnings: readonly CorrelationValidationWarning[];
}

/** Correlation validation error */
export interface CorrelationValidationError {
  readonly field: string;
  readonly message: string;
  readonly code: string;
}

/** Correlation validation warning */
export interface CorrelationValidationWarning {
  readonly field: string;
  readonly message: string;
  readonly code: string;
}
