/**
 * INT-001 — Normalization Module
 * Transforms raw scan findings into normalized SecurityFinding models
 */

/** Severity levels aligned with CVSS */
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'none';

/** Confidence level for finding accuracy */
export type Confidence = 'high' | 'medium' | 'low';

/** Finding category */
export type FindingCategory = 
  | 'vulnerability' 
  | 'misconfiguration' 
  | 'exposure' 
  | 'secret' 
  | 'outdated' 
  | 'policy-violation'
  | 'anomaly';

/** Raw finding from any scanner */
export interface RawFinding {
  id: string;
  source: string;
  sourceId: string;
  name: string;
  description: string;
  severity: string;
  category?: string;
  host?: string;
  port?: number;
  protocol?: string;
  path?: string;
  evidence?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

/** Normalized security finding — the canonical domain model */
export interface SecurityFinding {
  id: string;
  source: string;
  sourceId: string;
  name: string;
  description: string;
  severity: Severity;
  category: FindingCategory;
  confidence: Confidence;
  host: string;
  port?: number;
  protocol?: string;
  path?: string;
  evidence: Record<string, unknown>;
  metadata: Record<string, unknown>;
  timestamp: Date;
  normalizedAt: Date;
  fingerprint: string;
  tags: string[];
  cvssVector?: string;
  cvssScore?: number;
  cwe?: string[];
  cve?: string[];
  references: string[];
}

/** Normalization rule */
export interface NormalizationRule {
  id: string;
  source: string;
  severityMapping: Record<string, Severity>;
  categoryMapping: Record<string, FindingCategory>;
  confidenceDefault: Confidence;
  tagExtractors: TagExtractor[];
}

/** Tag extractor from raw finding fields */
export interface TagExtractor {
  field: string;
  pattern?: string;
  prefix?: string;
}

/** Normalization result */
export interface NormalizationResult {
  findings: SecurityFinding[];
  skipped: Array<{ raw: RawFinding; reason: string }>;
  statistics: NormalizationStatistics;
}

export interface NormalizationStatistics {
  total: number;
  normalized: number;
  skipped: number;
  bySeverity: Record<Severity, number>;
  byCategory: Record<FindingCategory, number>;
  bySource: Record<string, number>;
}
