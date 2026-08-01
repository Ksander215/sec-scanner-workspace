/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Public Contracts
 * TASK-AIS-008A.000
 *
 * Public-facing interfaces for every subsystem.
 * These are the ONLY APIs other Runtimes may depend on.
 */

import type {
  BottleneckId, ImprovementId, ExperimentId, KPIId, FeedbackId,
  EvolutionNodeId, TechDebtId, RoadmapId, LearningRecordId,
  Bottleneck, BottleneckSeverity, BottleneckScope, ConstraintType,
  Improvement, ImprovementStatus,
  Experiment, ExperimentStatus,
  KPIDefinition, KPIMeasurement, KPIComparison,
  FeedbackEntry, FeedbackSource, FeedbackSentiment,
  LearningRecord, LearningOutcome,
  EvolutionNode, EvolutionEdge,
  TechDebtItem, TechDebtPriority,
  ArchOptimizationSuggestion, ArchOptimizationType,
  ValueAnalysis, OpportunityCost,
  ConstraintAnalysis,
  RoadmapItem, EvolutionRoadmap,
  EvolutionMetrics,
  EvolutionState,
  ValueDimension,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════
// BOTTLENECK DETECTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IBottleneckDetector {
  detect(params: Partial<BottleneckDetectionParams>): Promise<readonly Bottleneck[]>;
  getById(id: BottleneckId): Promise<Bottleneck | null>;
  list(filter?: Partial<{ scope: BottleneckScope; severity: BottleneckSeverity; resolved: boolean }>): Promise<readonly Bottleneck[]>;
  resolve(id: BottleneckId): Promise<void>;
  count(): Promise<number>;
}

/** Parameters for bottleneck detection scan */
export interface BottleneckDetectionParams {
  readonly runtimeName: string;
  readonly capabilityName: string | null;
  readonly workflowName: string | null;
  readonly metrics: Readonly<Record<string, number>>;
  readonly errors: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// CONSTRAINT ANALYZER CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IConstraintAnalyzer {
  analyze(bottleneckId: BottleneckId): Promise<ConstraintAnalysis>;
  getAnalysis(sessionId: string): Promise<ConstraintAnalysis | null>;
  listAnalyses(): Promise<readonly ConstraintAnalysis[]>;
}

// ═══════════════════════════════════════════════════════════════════
// IMPROVEMENT ENGINE CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IImprovementEngine {
  propose(params: ImprovementProposalParams): Promise<Improvement>;
  getById(id: ImprovementId): Promise<Improvement | null>;
  list(filter?: Partial<{ status: ImprovementStatus; constraintType: ConstraintType }>): Promise<readonly Improvement[]>;
  updateStatus(id: ImprovementId, status: ImprovementStatus): Promise<void>;
  count(): Promise<number>;
}

export interface ImprovementProposalParams {
  readonly name: string;
  readonly description: string;
  readonly bottleneckId: BottleneckId | null;
  readonly constraintType: ConstraintType;
  readonly targetRuntime: string | null;
  readonly targetCapability: string | null;
  readonly estimatedEffort: string;
  readonly evidence: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// VALUE ANALYZER CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IValueAnalyzer {
  analyze(improvementId: ImprovementId): Promise<ValueAnalysis>;
  getByImprovementId(improvementId: ImprovementId): Promise<ValueAnalysis | null>;
  listAnalyses(): Promise<readonly ValueAnalysis[]>;
}

// ═══════════════════════════════════════════════════════════════════
// OPPORTUNITY COST ENGINE CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IOpportunityCostEngine {
  analyze(improvementId: ImprovementId): Promise<OpportunityCost>;
  getByImprovementId(improvementId: ImprovementId): Promise<OpportunityCost | null>;
  listAnalyses(): Promise<readonly OpportunityCost[]>;
}

// ═══════════════════════════════════════════════════════════════════
// OPTIMIZATION PLANNER CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IOptimizationPlanner {
  generateRoadmap(title?: string, description?: string): Promise<EvolutionRoadmap>;
  getRoadmap(id: RoadmapId): Promise<EvolutionRoadmap | null>;
  listRoadmaps(): Promise<readonly EvolutionRoadmap[]>;
  updateItemStatus(roadmapId: RoadmapId, itemId: ImprovementId, status: RoadmapItemStatus): Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════
// EXPERIMENT RUNTIME CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IExperimentRuntime {
  propose(params: ExperimentProposalParams): Promise<Experiment>;
  start(experimentId: ExperimentId): Promise<void>;
  complete(experimentId: ExperimentId, resultA: number, resultB: number): Promise<void>;
  cancel(experimentId: ExperimentId): Promise<void>;
  getById(id: ExperimentId): Promise<Experiment | null>;
  list(filter?: Partial<{ status: ExperimentStatus }>): Promise<readonly Experiment[]>;
  count(): Promise<number>;
}

export interface ExperimentProposalParams {
  readonly name: string;
  readonly description: string;
  readonly improvementId: ImprovementId;
  readonly variantA: string;
  readonly variantB: string;
  readonly metricName: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// KPI RUNTIME CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IKPIRuntime {
  register(params: KPIRegistrationParams): Promise<KPIDefinition>;
  record(kpiId: KPIId, value: number, metadata?: Readonly<Record<string, unknown>>): Promise<void>;
  getById(id: KPIId): Promise<KPIDefinition | null>;
  list(): Promise<readonly KPIDefinition[]>;
  getComparison(kpiId: KPIId, beforeTimestamp: string, afterTimestamp: string): Promise<KPIComparison | null>;
  count(): Promise<number>;
}

export interface KPIRegistrationParams {
  readonly name: string;
  readonly description: string;
  readonly unit: string;
  readonly direction: KPDirection;
  readonly target: number | null;
  readonly initialValue: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// FEEDBACK COLLECTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IFeedbackCollector {
  collect(params: FeedbackCollectionParams): Promise<FeedbackEntry>;
  process(feedbackId: FeedbackId): Promise<FeedbackEntry>;
  getById(id: FeedbackId): Promise<FeedbackEntry | null>;
  list(filter?: Partial<{ source: FeedbackSource; sentiment: FeedbackSentiment; processed: boolean }>): Promise<readonly FeedbackEntry[]>;
  count(): Promise<number>;
}

export interface FeedbackCollectionParams {
  readonly source: FeedbackSource;
  readonly sentiment: FeedbackSentiment;
  readonly content: string;
  readonly relatedBottleneckId: BottleneckId | null;
  readonly relatedImprovementId: ImprovementId | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// LEARNING LOOP CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface ILearningLoop {
  record(params: LearningRecordParams): Promise<LearningRecord>;
  getById(id: LearningRecordId): Promise<LearningRecord | null>;
  list(filter?: Partial<{ outcome: LearningOutcome }>): Promise<readonly LearningRecord[]>;
  getLessonsForAction(action: string): Promise<readonly LearningRecord[]>;
  count(): Promise<number>;
}

export interface LearningRecordParams {
  readonly action: string;
  readonly outcome: LearningOutcome;
  readonly lesson: string;
  readonly context: string;
  readonly improvementId: ImprovementId | null;
  readonly experimentId: ExperimentId | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// EVOLUTION GRAPH CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IEvolutionGraph {
  addNode(params: EvolutionNodeParams): Promise<EvolutionNode>;
  addEdge(from: EvolutionNodeId, to: EvolutionNodeId, label: string, weight?: number): Promise<EvolutionEdge>;
  getNode(id: EvolutionNodeId): Promise<EvolutionNode | null>;
  getRootNodes(): Promise<readonly EvolutionNode[]>;
  getPath(nodeId: EvolutionNodeId): Promise<readonly EvolutionNode[]>;
  listNodes(): Promise<readonly EvolutionNode[]>;
  listEdges(): Promise<readonly EvolutionEdge[]>;
  count(): Promise<number>;
}

export interface EvolutionNodeParams {
  readonly type: 'improvement' | 'experiment' | 'bottleneck_resolved' | 'tech_debt_fixed' | 'architecture_change';
  readonly title: string;
  readonly description: string;
  readonly relatedIds: readonly string[];
  readonly parentId: EvolutionNodeId | null;
  readonly valueImpact: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// ARCHITECTURE OPTIMIZER CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IArchitectureOptimizer {
  analyze(modules?: readonly string[]): Promise<readonly ArchOptimizationSuggestion[]>;
  getById(id: EvolutionNodeId): Promise<ArchOptimizationSuggestion | null>;
  list(): Promise<readonly ArchOptimizationSuggestion[]>;
  count(): Promise<number>;
}

// ═══════════════════════════════════════════════════════════════════
// TECH DEBT ANALYZER CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface ITechDebtAnalyzer {
  register(params: TechDebtRegistrationParams): Promise<TechDebtItem>;
  resolve(id: TechDebtId): Promise<void>;
  getById(id: TechDebtId): Promise<TechDebtItem | null>;
  list(filter?: Partial<{ priority: TechDebtPriority; resolved: boolean }>): Promise<readonly TechDebtItem[]>;
  getTotalCost(): Promise<number>;
  count(): Promise<number>;
}

export interface TechDebtRegistrationParams {
  readonly name: string;
  readonly description: string;
  readonly priority: TechDebtPriority;
  readonly estimatedCost: number;
  readonly impact: number;
  readonly targetModule: string;
  readonly targetFile: string | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════
// RECOMMENDATION PRIORITIZER CONTRACT
// ═══════════════════════════════════════════════════════════════════

export interface IRecommendationPrioritizer {
  prioritize(improvements: readonly Improvement[]): Promise<readonly Improvement[]>;
  calculatePriority(improvement: Improvement): number;
}

// ═══════════════════════════════════════════════════════════════════
// EVOLUTION RUNTIME CONTRACT (DASHBOARD API)
// ═══════════════════════════════════════════════════════════════════

export interface IEvolutionRuntime {
  readonly state: EvolutionState;
  analyze(): Promise<EvolutionAnalysisResult>;
  getMetrics(): Promise<EvolutionMetrics>;
  getBottleneckDetector(): IBottleneckDetector;
  getConstraintAnalyzer(): IConstraintAnalyzer;
  getImprovementEngine(): IImprovementEngine;
  getValueAnalyzer(): IValueAnalyzer;
  getOpportunityCostEngine(): IOpportunityCostEngine;
  getOptimizationPlanner(): IOptimizationPlanner;
  getExperimentRuntime(): IExperimentRuntime;
  getKPIRuntime(): IKPIRuntime;
  getFeedbackCollector(): IFeedbackCollector;
  getLearningLoop(): ILearningLoop;
  getEvolutionGraph(): IEvolutionGraph;
  getArchitectureOptimizer(): IArchitectureOptimizer;
  getTechDebtAnalyzer(): ITechDebtAnalyzer;
  getRecommendationPrioritizer(): IRecommendationPrioritizer;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

export interface EvolutionAnalysisResult {
  readonly bottlenecks: readonly Bottleneck[];
  readonly improvements: readonly Improvement[];
  readonly valueAnalyses: readonly ValueAnalysis[];
  readonly opportunityCosts: readonly OpportunityCost[];
  readonly roadmap: EvolutionRoadmap | null;
  readonly durationMs: number;
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC CONTRACTS BUNDLE
// ═══════════════════════════════════════════════════════════════════

export interface EvolutionPublicContracts {
  readonly bottleneckDetector: IBottleneckDetector;
  readonly constraintAnalyzer: IConstraintAnalyzer;
  readonly improvementEngine: IImprovementEngine;
  readonly valueAnalyzer: IValueAnalyzer;
  readonly opportunityCostEngine: IOpportunityCostEngine;
  readonly optimizationPlanner: IOptimizationPlanner;
  readonly experimentRuntime: IExperimentRuntime;
  readonly kpiRuntime: IKPIRuntime;
  readonly feedbackCollector: IFeedbackCollector;
  readonly learningLoop: ILearningLoop;
  readonly evolutionGraph: IEvolutionGraph;
  readonly architectureOptimizer: IArchitectureOptimizer;
  readonly techDebtAnalyzer: ITechDebtAnalyzer;
  readonly recommendationPrioritizer: IRecommendationPrioritizer;
  readonly evolutionRuntime: IEvolutionRuntime;
}
