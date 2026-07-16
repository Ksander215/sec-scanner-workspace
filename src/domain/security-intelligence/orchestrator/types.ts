import type { SecurityFinding, NormalizationResult, NormalizationStatistics } from '../normalization/types.js';
import type { CorrelationResult, CorrelationStatistics } from '../correlation/types.js';
import type { KGStatistics, KnowledgeGraph } from '../knowledge-graph/types.js';
import type { RiskAssessment, RiskSummary } from '../risk/types.js';
import type { AttackGraph, AttackGraphStatistics } from '../attack-path/types.js';
import type { ImpactAssessment } from '../impact/types.js';
import type { Recommendation, RemediationPlan } from '../recommendation/types.js';
import type { Explanation, AnalysisTrace } from '../explainability/types.js';

/** Pipeline stage names in order */
export type PipelineStage =
  | 'normalize'
  | 'correlate'
  | 'knowledge-graph'
  | 'risk'
  | 'attack-path'
  | 'impact'
  | 'recommendation'
  | 'explain'
  | 'report';

/** Pipeline stage status */
export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/** Individual stage result */
export interface StageResult {
  stage: PipelineStage;
  status: StageStatus;
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
  error?: Error;
}

/** Pipeline progress */
export interface PipelineProgress {
  currentStage: PipelineStage;
  stageIndex: number;
  totalStages: number;
  percentage: number;
  stageStatuses: Record<PipelineStage, StageStatus>;
  startTime: Date;
  elapsedMs: number;
}

/** Pipeline event types */
export type PipelineEventType =
  | 'pipeline:started'
  | 'stage:started'
  | 'stage:completed'
  | 'stage:failed'
  | 'stage:progress'
  | 'pipeline:completed'
  | 'pipeline:failed'
  | 'pipeline:cancelled';

/** Pipeline event */
export interface PipelineEvent {
  type: PipelineEventType;
  runId: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

/** Pipeline event handler */
export type PipelineEventHandler = (event: PipelineEvent) => void;

/** Pipeline metrics */
export interface PipelineMetrics {
  runId: string;
  totalDurationMs: number;
  stageDurations: Record<PipelineStage, number>;
  findingsCount: number;
  correlationsCount: number;
  risksCount: number;
  attackPathsCount: number;
  recommendationsCount: number;
  peakMemoryMb: number;
}

/** Security Intelligence Report — the complete output */
export interface SecurityIntelligenceReport {
  id: string;
  runId: string;
  timestamp: Date;
  findings: SecurityFinding[];
  normalization: NormalizationStatistics;
  correlation: CorrelationStatistics;
  knowledgeGraph: KGStatistics;
  riskSummary: RiskSummary;
  risks: RiskAssessment[];
  attackGraph: AttackGraphStatistics;
  attackPaths: AttackGraph[];
  impacts: ImpactAssessment[];
  recommendations: Recommendation[];
  remediationPlan: RemediationPlan;
  explanations: Explanation[];
  trace: AnalysisTrace;
  metrics: PipelineMetrics;
}

/** Analysis options */
export interface AnalysisOptions {
  persist?: boolean;
  explain?: boolean;
  includeAttackPaths?: boolean;
  includeImpact?: boolean;
  maxAttackPathDepth?: number;
  riskParameters?: Record<string, number>;
  signal?: AbortSignal;
  onProgress?: (progress: PipelineProgress) => void;
  onEvent?: PipelineEventHandler;
}

/** Raw scan input */
export interface ScanInput {
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
  metadata?: Record<string, unknown>;
}
