// INT-001: Normalization
export { NormalizationEngine } from './normalization/index.js';
export type {
  RawFinding,
  SecurityFinding,
  Severity,
  Confidence,
  FindingCategory,
  NormalizationRule,
  NormalizationResult,
  NormalizationStatistics,
} from './normalization/index.js';

// INT-002: Correlation
export { CorrelationEngine } from './correlation/index.js';
export type {
  Correlation,
  CorrelationGroup,
  CorrelationRule,
  CorrelationResult,
  CorrelationStatistics,
  CorrelationType,
  CorrelationStrength,
} from './correlation/index.js';

// INT-003: Knowledge Graph
export { KnowledgeGraphBuilder } from './knowledge-graph/index.js';
export type {
  KGNode,
  KGEdge,
  NodeType,
  EdgeType,
  KnowledgeGraph,
  KGStatistics,
  TraversalResult,
} from './knowledge-graph/index.js';

// INT-004: Risk Assessment
export { RiskEngine } from './risk/index.js';
export type {
  RiskAssessment,
  RiskLevel,
  RiskFactor,
  RiskSummary,
  RiskParameters,
} from './risk/index.js';

// INT-004.5: Attack Path
export { AttackPathBuilder } from './attack-path/index.js';
export type {
  AttackPath,
  AttackStep,
  AttackGraph,
  AttackGraphNode,
  AttackGraphEdge,
  AttackGraphStatistics,
} from './attack-path/index.js';

// INT-004.5: Impact
export { ImpactEngine } from './impact/index.js';
export type {
  ImpactAssessment,
  ImpactLevel,
  ImpactDimension,
} from './impact/index.js';

// INT-005: Recommendation
export { RecommendationEngine } from './recommendation/index.js';
export type {
  Recommendation,
  RemediationAction,
  RemediationPlan,
  RemediationPhase,
  RecommendationPriority,
  RecommendationStatus,
} from './recommendation/index.js';

// INT-006: Explainability
export { ExplainabilityEngine } from './explainability/index.js';
export type {
  Explanation,
  ExplanationType,
  ExplanationStep,
  ExplanationEvidence,
  AnalysisTrace,
  TraceStage,
} from './explainability/index.js';

// Orchestrator
export { SecurityIntelligenceEngine, SecurityIntelligenceBuilder } from './orchestrator/index.js';
export type {
  SecurityIntelligenceReport,
  PipelineStage,
  StageStatus,
  StageResult,
  PipelineProgress,
  PipelineEventType,
  PipelineEvent,
  PipelineEventHandler,
  PipelineMetrics,
  AnalysisOptions,
  ScanInput,
} from './orchestrator/index.js';

// INT-007: Persistence
export { PersistenceEngine, PersistenceBuilder, JsonPersistenceProvider } from './persistence/index.js';
export type {
  StorageBackend,
  PersistenceProvider,
  SerializationFormat,
  SnapshotMetadata,
  SnapshotResult,
  MigrationInfo,
  StorageStatistics,
  PersistenceEvent,
  PersistenceEventType,
  PersistenceEventHandler,
  PersistenceMetrics,
  ReportRepository,
  FindingRepository,
  RiskRepository,
  CorrelationRepository,
  AttackPathRepository,
  RecommendationRepository,
  ExplainabilityRepository,
  SnapshotRepository,
} from './persistence/index.js';
