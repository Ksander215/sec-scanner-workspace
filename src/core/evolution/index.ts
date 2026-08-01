/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Public API
 * TASK-AIS-008A.000
 */

// ── Types (type-only) ─────────────────────────────────────────
export type * from './types.js';

// ── Contracts (type-only) ─────────────────────────────────────
export type * from './contracts.js';

// ── Events (type-only) ────────────────────────────────────────
export type * from './events.js';

// ── Enums (value) ─────────────────────────────────────────────
export {
  ConstraintType, BottleneckScope, BottleneckSeverity,
  ImprovementStatus, ExperimentStatus, KPDirection,
  FeedbackSource, FeedbackSentiment, LearningOutcome,
  TechDebtPriority, ArchOptimizationType,
  EvolutionState, RoadmapItemStatus, ValueDimension,
} from './types.js';

// ── Default Config (value) ────────────────────────────────────
export { DefaultEvolutionRuntimeConfig } from './types.js';

// ── Brand helpers (value) ─────────────────────────────────────
export {
  brandBottleneckId, brandImprovementId, brandExperimentId, brandKPIId,
  brandFeedbackId, brandEvolutionNodeId, brandTechDebtId, brandRecommendationId,
  brandEvolutionSessionId, brandRoadmapId, brandLearningRecordId,
} from './types.js';

// ── Errors (value) ────────────────────────────────────────────
export * from './errors.js';

// ── Subsystems (value) ────────────────────────────────────────
export { BottleneckDetector } from './bottleneck-detector.js';
export { ConstraintAnalyzer } from './constraint-analyzer.js';
export { ImprovementEngine } from './improvement-engine.js';
export { ValueAnalyzer } from './value-analyzer.js';
export { OpportunityCostEngine } from './opportunity-cost-engine.js';
export { OptimizationPlanner } from './optimization-planner.js';
export { ExperimentRuntime } from './experiment-runtime.js';
export { KPIRuntime } from './kpi-runtime.js';
export { FeedbackCollector } from './feedback-collector.js';
export { LearningLoop } from './learning-loop.js';
export { EvolutionGraph } from './evolution-graph.js';
export { ArchitectureOptimizer } from './architecture-optimizer.js';
export { TechnicalDebtAnalyzer } from './tech-debt-analyzer.js';
export { RecommendationPrioritizer } from './recommendation-prioritizer.js';

// ── Orchestrator (value) ──────────────────────────────────────
export { EvolutionRuntime } from './evolution-runtime.js';
