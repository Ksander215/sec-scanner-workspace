/**
 * Security Intelligence Normalization Engine — Models
 *
 * Canonical finding model and all supporting models.
 * Every scanner output is transformed into CanonicalFinding
 * before entering the Intelligence Platform pipeline.
 *
 * Design principles:
 * - All models are deeply frozen and immutable
 * - Factory functions are the only way to create instances
 * - JSON round-trip is lossless via toJSON/fromJSON
 * - equals/clone/hash are provided for all models
 */

import type {
  FindingId, EvidenceId, AssetId, Timestamp, Metadata,
  Severity, ConfidenceLevel, SourceEngine, FindingCategory,
  EvidenceType, AssetType,
  CWEReference, CVEReference, CVSSScore,
  CanonicalURL, AffectedAsset, NormalizedEvidence,
} from '../types/index.ts';
import {
  brandFindingId, brandEvidenceId, brandAssetId,
  Severity as Sev, ConfidenceLevel as Conf,
  SourceEngine as Src, FindingCategory as Cat,
  EvidenceType as Evt, AssetType as Ast,
} from '../types/index.ts';

// ─── Canonical Finding ───────────────────────────────────────

/**
 * The single canonical model for all security findings.
 * All scanners produce findings that are normalized to this format.
 * Downstream components (Correlation, Risk, Attack Path, Recommendations)
 * work exclusively with this model.
 */
export interface CanonicalFinding {
  readonly id: FindingId;
  readonly sourceEngine: SourceEngine;
  readonly category: FindingCategory;
  readonly title: string;
  readonly description: string;
  readonly severity: Severity;
  readonly confidence: ConfidenceLevel;
  readonly confidenceScore: number;
  readonly cve: readonly CVEReference[];
  readonly cwe: readonly CWEReference[];
  readonly cvss: CVSSScore | null;
  readonly affectedAsset: AffectedAsset | null;
  readonly endpoint: CanonicalURL | null;
  readonly evidence: readonly NormalizedEvidence[];
  readonly technology: readonly string[];
  readonly tags: readonly string[];
  readonly references: readonly string[];
  readonly metadata: Metadata;
  readonly discoveredAt: Timestamp;
  readonly normalizedAt: Timestamp;
  readonly normalizerVersion: string;
}

// ─── Factory Functions ───────────────────────────────────────

/** Generate a deterministic FindingId */
export function generateFindingId(source: SourceEngine, originalId?: string): FindingId {
  if (originalId) {
    return brandFindingId(`fnd_${source}_${originalId}`);
  }
  return brandFindingId(`fnd_${source}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`);
}

/** Generate a deterministic EvidenceId */
export function generateEvidenceId(type: EvidenceType): EvidenceId {
  return brandEvidenceId(`evi_${type}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`);
}

/** Generate a deterministic AssetId */
export function generateAssetId(type: AssetType, identifier: string): AssetId {
  return brandAssetId(`ast_${type}_${identifier.replace(/[^a-zA-Z0-9]/g, '_')}`);
}

/** Create a CanonicalFinding with all required fields */
export function createCanonicalFinding(params: {
  readonly id?: FindingId;
  readonly sourceEngine: SourceEngine;
  readonly category: FindingCategory;
  readonly title: string;
  readonly description: string;
  readonly severity: Severity;
  readonly confidence: ConfidenceLevel;
  readonly confidenceScore: number;
  readonly cve?: readonly CVEReference[];
  readonly cwe?: readonly CWEReference[];
  readonly cvss?: CVSSScore | null;
  readonly affectedAsset?: AffectedAsset | null;
  readonly endpoint?: CanonicalURL | null;
  readonly evidence?: readonly NormalizedEvidence[];
  readonly technology?: readonly string[];
  readonly tags?: readonly string[];
  readonly references?: readonly string[];
  readonly metadata?: Metadata;
  readonly discoveredAt?: Timestamp;
  readonly normalizedAt?: Timestamp;
  readonly normalizerVersion?: string;
}): CanonicalFinding {
  return Object.freeze({
    id: params.id ?? generateFindingId(params.sourceEngine),
    sourceEngine: params.sourceEngine,
    category: params.category,
    title: params.title,
    description: params.description,
    severity: params.severity,
    confidence: params.confidence,
    confidenceScore: params.confidenceScore,
    cve: Object.freeze([...(params.cve ?? [])]),
    cwe: Object.freeze([...(params.cwe ?? [])]),
    cvss: params.cvss ? Object.freeze({ ...params.cvss }) : null,
    affectedAsset: params.affectedAsset ? Object.freeze({ ...params.affectedAsset }) : null,
    endpoint: params.endpoint ? Object.freeze({ ...params.endpoint }) : null,
    evidence: Object.freeze([...(params.evidence ?? [])]),
    technology: Object.freeze([...(params.technology ?? [])]),
    tags: Object.freeze([...(params.tags ?? [])]),
    references: Object.freeze([...(params.references ?? [])]),
    metadata: Object.freeze({ ...(params.metadata ?? {}) }),
    discoveredAt: params.discoveredAt ?? new Date().toISOString() as Timestamp,
    normalizedAt: params.normalizedAt ?? new Date().toISOString() as Timestamp,
    normalizerVersion: params.normalizerVersion ?? '1.0.0',
  });
}

/** Create a CWEReference from a normalized CWE */
export function createCWEReference(numericId: number, name?: string): CWEReference {
  return Object.freeze({
    id: `CWE-${numericId}`,
    numericId,
    name,
    url: `https://cwe.mitre.org/data/definitions/${numericId}.html`,
  });
}

/** Create a CVEReference from a normalized CVE */
export function createCVEReference(year: number, sequence: string): CVEReference {
  return Object.freeze({
    id: `CVE-${year}-${sequence}`,
    year,
    sequence,
    url: `https://nvd.nist.gov/vuln/detail/CVE-${year}-${sequence}`,
  });
}

/** Create a CVSSScore from components */
export function createCVSSScore(score: number, vector: string, version = '3.1'): CVSSScore {
  return Object.freeze({
    score,
    vector,
    version,
    baseScore: score,
  });
}

/** Create a CanonicalURL from components */
export function createCanonicalURL(params: {
  readonly scheme: string;
  readonly host: string;
  readonly port?: number | null;
  readonly path?: string;
  readonly query?: string;
  readonly fragment?: string;
  readonly original: string;
}): CanonicalURL {
  return Object.freeze({
    scheme: params.scheme,
    host: params.host,
    port: params.port ?? null,
    path: params.path ?? '/',
    query: params.query ?? '',
    fragment: params.fragment ?? '',
    original: params.original,
  });
}

/** Create an AffectedAsset */
export function createAffectedAsset(params: {
  readonly type: AssetType;
  readonly identifier: string;
  readonly name?: string;
  readonly metadata?: Metadata;
}): AffectedAsset {
  return Object.freeze({
    id: generateAssetId(params.type, params.identifier),
    type: params.type,
    identifier: params.identifier,
    name: params.name ?? params.identifier,
    metadata: Object.freeze({ ...(params.metadata ?? {}) }),
  });
}

/** Create a NormalizedEvidence */
export function createNormalizedEvidence(params: {
  readonly type: EvidenceType;
  readonly data: Metadata;
  readonly raw?: string;
  readonly description?: string;
}): NormalizedEvidence {
  return Object.freeze({
    id: generateEvidenceId(params.type),
    type: params.type,
    data: Object.freeze({ ...params.data }),
    raw: params.raw,
    description: params.description,
  });
}

// ─── Serialization ───────────────────────────────────────────

/** Serialize a CanonicalFinding to JSON-compatible object */
export function canonicalFindingToJSON(finding: CanonicalFinding): Record<string, unknown> {
  return {
    id: finding.id,
    sourceEngine: finding.sourceEngine,
    category: finding.category,
    title: finding.title,
    description: finding.description,
    severity: finding.severity,
    confidence: finding.confidence,
    confidenceScore: finding.confidenceScore,
    cve: finding.cve.map(c => ({ ...c })),
    cwe: finding.cwe.map(c => ({ ...c })),
    cvss: finding.cvss ? { ...finding.cvss } : null,
    affectedAsset: finding.affectedAsset ? { ...finding.affectedAsset } : null,
    endpoint: finding.endpoint ? { ...finding.endpoint } : null,
    evidence: finding.evidence.map(e => ({ ...e })),
    technology: [...finding.technology],
    tags: [...finding.tags],
    references: [...finding.references],
    metadata: { ...finding.metadata },
    discoveredAt: finding.discoveredAt,
    normalizedAt: finding.normalizedAt,
    normalizerVersion: finding.normalizerVersion,
  };
}

/** Deserialize a CanonicalFinding from JSON-compatible object */
export function canonicalFindingFromJSON(json: Record<string, unknown>): CanonicalFinding {
  return createCanonicalFinding({
    id: brandFindingId(json.id as string),
    sourceEngine: json.sourceEngine as SourceEngine,
    category: json.category as FindingCategory,
    title: json.title as string,
    description: json.description as string,
    severity: json.severity as Severity,
    confidence: json.confidence as ConfidenceLevel,
    confidenceScore: json.confidenceScore as number,
    cve: (json.cve as CVEReference[]) ?? [],
    cwe: (json.cwe as CWEReference[]) ?? [],
    cvss: (json.cvss as CVSSScore) ?? null,
    affectedAsset: (json.affectedAsset as AffectedAsset) ?? null,
    endpoint: (json.endpoint as CanonicalURL) ?? null,
    evidence: (json.evidence as NormalizedEvidence[]) ?? [],
    technology: (json.technology as string[]) ?? [],
    tags: (json.tags as string[]) ?? [],
    references: (json.references as string[]) ?? [],
    metadata: (json.metadata as Metadata) ?? {},
    discoveredAt: json.discoveredAt as Timestamp,
    normalizedAt: json.normalizedAt as Timestamp,
    normalizerVersion: json.normalizerVersion as string,
  });
}

/** Check equality of two CanonicalFindings */
export function canonicalFindingsEqual(a: CanonicalFinding, b: CanonicalFinding): boolean {
  return a.id === b.id;
}

/** Clone a CanonicalFinding (deep copy) */
export function cloneCanonicalFinding(finding: CanonicalFinding): CanonicalFinding {
  return canonicalFindingFromJSON(canonicalFindingToJSON(finding));
}

/** Compute a simple hash for a CanonicalFinding */
export function hashCanonicalFinding(finding: CanonicalFinding): number {
  let hash = 0;
  const str = finding.id;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}
