/**
 * Security Intelligence Correlation Engine — Models
 *
 * All correlation domain models with factory functions,
 * serialization, equality, cloning, and hashing.
 *
 * Design principles:
 * - All models are deeply frozen and immutable
 * - Factory functions are the only way to create instances
 * - JSON round-trip is lossless
 * - equals/clone/hash provided for all models
 */

import type {
  CorrelationId, CorrelationGroupId, CorrelationEdgeId, Timestamp, Metadata,
  CorrelationReason, DuplicateType,
  CorrelationEvidence, CorrelationEdge, CorrelationGroup, Correlation,
  CorrelationResult, CorrelationResultStatistics, DuplicateDetection,
  CorrelationFindingInput, CorrelationEvidenceInput,
} from '../types/index.ts';
import {
  brandCorrelationId, brandCorrelationGroupId, brandCorrelationEdgeId,
  CorrelationReason as Reason, DuplicateType as DupType,
  DEFAULT_CORRELATION_CONFIG,
} from '../types/index.ts';
import type {
  FindingId, Severity, SourceEngine, FindingCategory,
} from '../../normalization/types/index.ts';
import { Severity as Sev, FindingCategory as Cat, SourceEngine as Src } from '../../normalization/types/index.ts';

// ─── ID Generation ───────────────────────────────────────────

/** Generate a unique CorrelationId */
export function generateCorrelationId(): CorrelationId {
  return brandCorrelationId(`cor_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`);
}

/** Generate a unique CorrelationGroupId */
export function generateCorrelationGroupId(): CorrelationGroupId {
  return brandCorrelationGroupId(`cgrp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`);
}

/** Generate a unique CorrelationEdgeId */
export function generateCorrelationEdgeId(): CorrelationEdgeId {
  return brandCorrelationEdgeId(`cedge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`);
}

// ─── Factory: CorrelationEvidence ────────────────────────────

/** Create a CorrelationEvidence */
export function createCorrelationEvidence(params: {
  readonly reason: CorrelationReason;
  readonly sharedValue: string;
  readonly sourceField: string;
  readonly targetField: string;
  readonly confidence: number;
}): CorrelationEvidence {
  return Object.freeze({
    reason: params.reason,
    sharedValue: params.sharedValue,
    sourceField: params.sourceField,
    targetField: params.targetField,
    confidence: Math.max(0, Math.min(1, params.confidence)),
  });
}

// ─── Factory: CorrelationEdge ────────────────────────────────

/** Create a CorrelationEdge */
export function createCorrelationEdge(params: {
  readonly sourceFindingId: FindingId;
  readonly targetFindingId: FindingId;
  readonly reasons: readonly CorrelationReason[];
  readonly score: number;
  readonly evidence: readonly CorrelationEvidence[];
  readonly metadata?: Metadata;
}): CorrelationEdge {
  return Object.freeze({
    id: generateCorrelationEdgeId(),
    sourceFindingId: params.sourceFindingId,
    targetFindingId: params.targetFindingId,
    reasons: Object.freeze([...params.reasons]),
    score: Math.max(0, Math.min(1, params.score)),
    evidence: Object.freeze([...params.evidence]),
    metadata: Object.freeze({ ...(params.metadata ?? {}) }),
    createdAt: new Date().toISOString() as Timestamp,
  });
}

// ─── Factory: CorrelationGroup ───────────────────────────────

/** Create a CorrelationGroup */
export function createCorrelationGroup(params: {
  readonly findingIds: readonly FindingId[];
  readonly dominantCategory: FindingCategory;
  readonly dominantSeverity: Severity;
  readonly correlationScore: number;
  readonly reasons: readonly CorrelationReason[];
  readonly representativeFindingId: FindingId;
  readonly metadata?: Metadata;
}): CorrelationGroup {
  return Object.freeze({
    id: generateCorrelationGroupId(),
    findingIds: Object.freeze([...params.findingIds]),
    dominantCategory: params.dominantCategory,
    dominantSeverity: params.dominantSeverity,
    correlationScore: Math.max(0, Math.min(1, params.correlationScore)),
    reasons: Object.freeze([...params.reasons]),
    representativeFindingId: params.representativeFindingId,
    metadata: Object.freeze({ ...(params.metadata ?? {}) }),
    createdAt: new Date().toISOString() as Timestamp,
  });
}

// ─── Factory: Correlation ────────────────────────────────────

/** Create a Correlation */
export function createCorrelation(params: {
  readonly sourceFindingId: FindingId;
  readonly targetFindingId: FindingId;
  readonly score: number;
  readonly reasons: readonly CorrelationReason[];
  readonly evidence: readonly CorrelationEvidence[];
  readonly duplicateType: DuplicateType | null;
  readonly metadata?: Metadata;
}): Correlation {
  return Object.freeze({
    id: generateCorrelationId(),
    sourceFindingId: params.sourceFindingId,
    targetFindingId: params.targetFindingId,
    score: Math.max(0, Math.min(1, params.score)),
    reasons: Object.freeze([...params.reasons]),
    evidence: Object.freeze([...params.evidence]),
    duplicateType: params.duplicateType,
    metadata: Object.freeze({ ...(params.metadata ?? {}) }),
    createdAt: new Date().toISOString() as Timestamp,
  });
}

// ─── Factory: DuplicateDetection ─────────────────────────────

/** Create a DuplicateDetection */
export function createDuplicateDetection(params: {
  readonly originalFindingId: FindingId;
  readonly duplicateFindingId: FindingId;
  readonly duplicateType: DuplicateType;
  readonly similarity: number;
  readonly evidence: readonly CorrelationEvidence[];
  readonly metadata?: Metadata;
}): DuplicateDetection {
  return Object.freeze({
    originalFindingId: params.originalFindingId,
    duplicateFindingId: params.duplicateFindingId,
    duplicateType: params.duplicateType,
    similarity: Math.max(0, Math.min(1, params.similarity)),
    evidence: Object.freeze([...params.evidence]),
    metadata: Object.freeze({ ...(params.metadata ?? {}) }),
  });
}

// ─── Factory: CorrelationResult ──────────────────────────────

/** Create a CorrelationResult */
export function createCorrelationResult(params: {
  readonly correlations: readonly Correlation[];
  readonly groups: readonly CorrelationGroup[];
  readonly duplicates: readonly DuplicateDetection[];
  readonly statistics: CorrelationResultStatistics;
  readonly durationMs: number;
}): CorrelationResult {
  return Object.freeze({
    correlations: Object.freeze([...params.correlations]),
    groups: Object.freeze([...params.groups]),
    duplicates: Object.freeze([...params.duplicates]),
    statistics: Object.freeze({ ...params.statistics }),
    durationMs: params.durationMs,
  });
}

// ─── Factory: CorrelationFindingInput ────────────────────────

/** Convert a CanonicalFinding to a CorrelationFindingInput */
export function toCorrelationFindingInput(finding: {
  readonly id: FindingId;
  readonly sourceEngine: SourceEngine;
  readonly category: FindingCategory;
  readonly severity: Severity;
  readonly title: string;
  readonly description: string;
  readonly cve: readonly { readonly id: string }[];
  readonly cwe: readonly { readonly id: string }[];
  readonly affectedAsset: { readonly identifier: string } | null;
  readonly endpoint: { readonly scheme: string; readonly host: string; readonly port: number | null; readonly path: string; readonly query: string } | null;
  readonly technology: readonly string[];
  readonly evidence: readonly { readonly type: string; readonly data: Metadata }[];
  readonly tags: readonly string[];
  readonly metadata: Metadata;
}): CorrelationFindingInput {
  const endpointStr = finding.endpoint
    ? `${finding.endpoint.scheme}://${finding.endpoint.host}${finding.endpoint.port ? ':' + finding.endpoint.port : ''}${finding.endpoint.path}${finding.endpoint.query ? '?' + finding.endpoint.query : ''}`
    : null;

  return Object.freeze({
    id: finding.id,
    sourceEngine: finding.sourceEngine,
    category: finding.category,
    severity: finding.severity,
    title: finding.title,
    description: finding.description,
    cve: Object.freeze(finding.cve.map(c => c.id)),
    cwe: Object.freeze(finding.cwe.map(c => c.id)),
    affectedAsset: finding.affectedAsset?.identifier ?? null,
    endpoint: endpointStr,
    technology: Object.freeze([...finding.technology]),
    evidence: Object.freeze(finding.evidence.map(e => Object.freeze({ type: e.type, data: Object.freeze({ ...e.data }) }))),
    tags: Object.freeze([...finding.tags]),
    metadata: Object.freeze({ ...finding.metadata }),
  });
}

// ─── Serialization ───────────────────────────────────────────

/** Serialize a Correlation to JSON-compatible object */
export function correlationToJSON(correlation: Correlation): Record<string, unknown> {
  return {
    id: correlation.id,
    sourceFindingId: correlation.sourceFindingId,
    targetFindingId: correlation.targetFindingId,
    score: correlation.score,
    reasons: [...correlation.reasons],
    evidence: correlation.evidence.map(e => ({ ...e })),
    duplicateType: correlation.duplicateType,
    metadata: { ...correlation.metadata },
    createdAt: correlation.createdAt,
  };
}

/** Deserialize a Correlation from JSON */
export function correlationFromJSON(json: Record<string, unknown>): Correlation {
  return createCorrelation({
    sourceFindingId: json.sourceFindingId as FindingId,
    targetFindingId: json.targetFindingId as FindingId,
    score: json.score as number,
    reasons: (json.reasons as CorrelationReason[]) ?? [],
    evidence: (json.evidence as CorrelationEvidence[]) ?? [],
    duplicateType: (json.duplicateType as DuplicateType) ?? null,
    metadata: (json.metadata as Metadata) ?? {},
  });
}

/** Serialize a CorrelationGroup to JSON */
export function correlationGroupToJSON(group: CorrelationGroup): Record<string, unknown> {
  return {
    id: group.id,
    findingIds: [...group.findingIds],
    dominantCategory: group.dominantCategory,
    dominantSeverity: group.dominantSeverity,
    correlationScore: group.correlationScore,
    reasons: [...group.reasons],
    representativeFindingId: group.representativeFindingId,
    metadata: { ...group.metadata },
    createdAt: group.createdAt,
  };
}

/** Serialize a CorrelationResult to JSON */
export function correlationResultToJSON(result: CorrelationResult): Record<string, unknown> {
  return {
    correlations: result.correlations.map(correlationToJSON),
    groups: result.groups.map(correlationGroupToJSON),
    duplicates: result.duplicates.map(d => ({
      originalFindingId: d.originalFindingId,
      duplicateFindingId: d.duplicateFindingId,
      duplicateType: d.duplicateType,
      similarity: d.similarity,
      evidence: d.evidence.map(e => ({ ...e })),
      metadata: { ...d.metadata },
    })),
    statistics: { ...result.statistics },
    durationMs: result.durationMs,
  };
}

// ─── Equality / Clone / Hash ─────────────────────────────────

/** Check equality of two Correlations */
export function correlationsEqual(a: Correlation, b: Correlation): boolean {
  return a.id === b.id;
}

/** Check equality of two CorrelationGroups */
export function correlationGroupsEqual(a: CorrelationGroup, b: CorrelationGroup): boolean {
  return a.id === b.id;
}

/** Clone a Correlation */
export function cloneCorrelation(correlation: Correlation): Correlation {
  return correlationFromJSON(correlationToJSON(correlation));
}

/** Hash a Correlation */
export function hashCorrelation(correlation: Correlation): number {
  let hash = 0;
  const str = correlation.id;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

// ─── Statistics Helpers ──────────────────────────────────────

/** Create empty correlation result statistics */
export function createEmptyResultStatistics(totalFindings: number): CorrelationResultStatistics {
  const reasonDist: Record<string, number> = {};
  for (const r of Object.values(Reason)) reasonDist[r] = 0;

  const dupDist: Record<string, number> = {};
  for (const d of Object.values(DupType)) dupDist[d] = 0;

  const sevDist: Record<string, number> = {};
  for (const s of Object.values(Sev)) sevDist[s] = 0;

  const srcDist: Record<string, number> = {};
  for (const s of Object.values(Src)) srcDist[s] = 0;

  return Object.freeze({
    totalFindings,
    totalCorrelations: 0,
    totalGroups: 0,
    totalDuplicates: 0,
    averageCorrelationScore: 0,
    reasonDistribution: Object.freeze(reasonDist) as Readonly<Record<CorrelationReason, number>>,
    duplicateTypeDistribution: Object.freeze(dupDist) as Readonly<Record<DuplicateType, number>>,
    severityDistribution: Object.freeze(sevDist) as Readonly<Record<Severity, number>>,
    sourceDistribution: Object.freeze(srcDist) as Readonly<Record<SourceEngine, number>>,
  });
}
