import type { Severity, Confidence, FindingCategory } from '../../domain/security-intelligence/normalization/types.js';
import type { RiskLevel } from '../../domain/security-intelligence/risk/types.js';
import type { RecommendationPriority, RecommendationStatus } from '../../domain/security-intelligence/recommendation/types.js';
import type { ImpactLevel } from '../../domain/security-intelligence/impact/types.js';
import type { CorrelationType, CorrelationStrength } from '../../domain/security-intelligence/correlation/types.js';

/** Analyze request */
export interface AnalyzeRequestDTO {
  findings: Array<{
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
  }>;
  options?: {
    persist?: boolean;
    explain?: boolean;
    includeAttackPaths?: boolean;
    includeImpact?: boolean;
  };
}

/** Analyze response — 202 Accepted */
export interface AnalyzeResponseDTO {
  runId: string;
  status: 'accepted';
  message: string;
  statusUrl: string;
}

/** Report DTO */
export interface ReportDTO {
  id: string;
  runId: string;
  timestamp: string;
  findingsCount: number;
  riskSummary: RiskSummaryDTO;
  metrics: ReportMetricsDTO;
}

export interface RiskSummaryDTO {
  totalFindings: number;
  averageScore: number;
  byLevel: Record<RiskLevel, number>;
  riskTrend: string;
}

export interface ReportMetricsDTO {
  totalDurationMs: number;
  findingsCount: number;
  correlationsCount: number;
  risksCount: number;
  recommendationsCount: number;
}

/** Finding DTO */
export interface FindingDTO {
  id: string;
  source: string;
  name: string;
  description: string;
  severity: Severity;
  category: FindingCategory;
  confidence: Confidence;
  host: string;
  port?: number;
  protocol?: string;
  path?: string;
  tags: string[];
  cve?: string[];
  cwe?: string[];
  cvssScore?: number;
}

/** Risk DTO */
export interface RiskDTO {
  id: string;
  findingId: string;
  level: RiskLevel;
  score: number;
  confidence: number;
  description: string;
  recommendations: string[];
}

/** Recommendation DTO */
export interface RecommendationDTO {
  id: string;
  title: string;
  description: string;
  priority: RecommendationPriority;
  status: RecommendationStatus;
  actionsCount: number;
  estimatedRiskReduction: number;
  tags: string[];
}

/** Correlation DTO */
export interface CorrelationDTO {
  id: string;
  findingA: string;
  findingB: string;
  type: CorrelationType;
  strength: CorrelationStrength;
  score: number;
  description: string;
}

/** Attack Path DTO */
export interface AttackPathDTO {
  id: string;
  name: string;
  stepsCount: number;
  totalRiskScore: number;
  exploitability: number;
  impact: number;
  entryPoint: string;
}

/** Impact DTO */
export interface ImpactDTO {
  id: string;
  findingId: string;
  level: ImpactLevel;
  score: number;
  dimensions: Record<string, number>;
  affectedAssets: string[];
}

/** Explanation DTO */
export interface ExplanationDTO {
  id: string;
  type: string;
  targetId: string;
  summary: string;
  stepsCount: number;
  confidence: number;
}

/** Health DTO */
export interface HealthDTO {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  components: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
}

/** Paginated response */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

/** Error response */
export interface ErrorResponseDTO {
  error: string;
  message: string;
  statusCode: number;
  requestId?: string;
}
