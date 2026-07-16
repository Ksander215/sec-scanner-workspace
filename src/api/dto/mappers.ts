import type { SecurityIntelligenceReport } from '../../domain/security-intelligence/orchestrator/types.js';
import type { SecurityFinding } from '../../domain/security-intelligence/normalization/types.js';
import type { RiskAssessment } from '../../domain/security-intelligence/risk/types.js';
import type { Recommendation } from '../../domain/security-intelligence/recommendation/types.js';
import type { Correlation } from '../../domain/security-intelligence/correlation/types.js';
import type { AttackGraph } from '../../domain/security-intelligence/attack-path/types.js';
import type { ImpactAssessment } from '../../domain/security-intelligence/impact/types.js';
import type { Explanation } from '../../domain/security-intelligence/explainability/types.js';
import type {
  ReportDTO, FindingDTO, RiskDTO, RecommendationDTO,
  CorrelationDTO, AttackPathDTO, ImpactDTO, ExplanationDTO,
} from './types.js';

export function mapReportToDTO(report: SecurityIntelligenceReport): ReportDTO {
  return {
    id: report.id,
    runId: report.runId,
    timestamp: report.timestamp.toISOString(),
    findingsCount: report.findings.length,
    riskSummary: {
      totalFindings: report.riskSummary.totalFindings,
      averageScore: report.riskSummary.averageScore,
      byLevel: report.riskSummary.byLevel,
      riskTrend: report.riskSummary.riskTrend,
    },
    metrics: {
      totalDurationMs: report.metrics.totalDurationMs,
      findingsCount: report.metrics.findingsCount,
      correlationsCount: report.metrics.correlationsCount,
      risksCount: report.metrics.risksCount,
      recommendationsCount: report.metrics.recommendationsCount,
    },
  };
}

export function mapFindingToDTO(finding: SecurityFinding): FindingDTO {
  return {
    id: finding.id,
    source: finding.source,
    name: finding.name,
    description: finding.description,
    severity: finding.severity,
    category: finding.category,
    confidence: finding.confidence,
    host: finding.host,
    port: finding.port,
    protocol: finding.protocol,
    path: finding.path,
    tags: finding.tags,
    cve: finding.cve,
    cwe: finding.cwe,
    cvssScore: finding.cvssScore,
  };
}

export function mapRiskToDTO(risk: RiskAssessment): RiskDTO {
  return {
    id: risk.id,
    findingId: risk.findingId,
    level: risk.level,
    score: risk.score,
    confidence: risk.confidence,
    description: risk.description,
    recommendations: risk.recommendations,
  };
}

export function mapRecommendationToDTO(rec: Recommendation): RecommendationDTO {
  return {
    id: rec.id,
    title: rec.title,
    description: rec.description,
    priority: rec.priority,
    status: rec.status,
    actionsCount: rec.actions.length,
    estimatedRiskReduction: rec.estimatedRiskReduction,
    tags: rec.tags,
  };
}

export function mapCorrelationToDTO(c: Correlation): CorrelationDTO {
  return {
    id: c.id,
    findingA: c.findingA,
    findingB: c.findingB,
    type: c.type,
    strength: c.strength,
    score: c.score,
    description: c.description,
  };
}

export function mapAttackGraphToDTO(graph: AttackGraph): AttackPathDTO[] {
  return graph.paths.map(p => ({
    id: p.id,
    name: p.name,
    stepsCount: p.steps.length,
    totalRiskScore: p.totalRiskScore,
    exploitability: p.exploitability,
    impact: p.impact,
    entryPoint: p.entryPoint,
  }));
}

export function mapImpactToDTO(impact: ImpactAssessment): ImpactDTO {
  return {
    id: impact.id,
    findingId: impact.findingId,
    level: impact.level,
    score: impact.score,
    dimensions: impact.dimensions,
    affectedAssets: impact.affectedAssets,
  };
}

export function mapExplanationToDTO(explanation: Explanation): ExplanationDTO {
  return {
    id: explanation.id,
    type: explanation.type,
    targetId: explanation.targetId,
    summary: explanation.summary,
    stepsCount: explanation.steps.length,
    confidence: explanation.confidence,
  };
}
