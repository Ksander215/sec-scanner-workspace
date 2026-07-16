import type { SecurityIntelligenceReport } from '../orchestrator/types.js';
import type { SecurityFinding } from '../normalization/types.js';
import type { RiskAssessment } from '../risk/types.js';
import type { Recommendation } from '../recommendation/types.js';
import type { Correlation, CorrelationGroup } from '../correlation/types.js';
import type { AttackGraph } from '../attack-path/types.js';
import type { Explanation } from '../explainability/types.js';
import type { SnapshotMetadata } from './types.js';

/** Report repository interface */
export interface ReportRepository {
  save(report: SecurityIntelligenceReport): Promise<string>;
  load(id: string): Promise<SecurityIntelligenceReport | null>;
  delete(id: string): Promise<boolean>;
  list(options?: { limit?: number; offset?: number }): Promise<Array<{ id: string; timestamp: Date; findingsCount: number }>>;
  getSummary(id: string): Promise<Record<string, unknown> | null>;
}

/** Finding repository interface */
export interface FindingRepository {
  save(findings: SecurityFinding[], reportId: string): Promise<void>;
  findByReport(reportId: string): Promise<SecurityFinding[]>;
  findById(id: string): Promise<SecurityFinding | null>;
  search(query: string, options?: { limit?: number; offset?: number }): Promise<SecurityFinding[]>;
  deleteByReport(reportId: string): Promise<number>;
}

/** Risk repository interface */
export interface RiskRepository {
  save(risks: RiskAssessment[], reportId: string): Promise<void>;
  findByReport(reportId: string): Promise<RiskAssessment[]>;
  findTop(limit: number): Promise<RiskAssessment[]>;
}

/** Correlation repository interface */
export interface CorrelationRepository {
  save(correlations: Correlation[], groups: CorrelationGroup[], reportId: string): Promise<void>;
  findByReport(reportId: string): Promise<{ correlations: Correlation[]; groups: CorrelationGroup[] }>;
}

/** AttackPath repository interface */
export interface AttackPathRepository {
  save(graph: AttackGraph, reportId: string): Promise<void>;
  findByReport(reportId: string): Promise<AttackGraph | null>;
}

/** Recommendation repository interface */
export interface RecommendationRepository {
  save(recommendations: Recommendation[], reportId: string): Promise<void>;
  findByReport(reportId: string): Promise<Recommendation[]>;
}

/** Explainability repository interface */
export interface ExplainabilityRepository {
  save(explanations: Explanation[], reportId: string): Promise<void>;
  findByReport(reportId: string): Promise<Explanation[]>;
  findByTarget(targetId: string): Promise<Explanation | null>;
}

/** Snapshot repository interface */
export interface SnapshotRepository {
  create(reportId: string, data: Buffer, description?: string): Promise<SnapshotMetadata>;
  restore(snapshotId: string): Promise<SecurityIntelligenceReport>;
  list(): Promise<SnapshotMetadata[]>;
  delete(id: string): Promise<boolean>;
}
