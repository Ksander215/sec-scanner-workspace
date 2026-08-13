/**
 * Evolution & Continuous Improvement Runtime (ECIR) — Public API
 * TASK-AIS-008A.000
 */

// ── Types, Enums, Branded Functions, Configs ──────────────
export * from './types.js';

// ── Errors ─────────────────────────────────────────────────
export * from './errors.js';

// ── Events ─────────────────────────────────────────────────
export * from './events.js';

// ── Contracts & Param Types ────────────────────────────────
export * from './contracts.js';

// ── Subsystem Classes ──────────────────────────────────────
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
export { TechDebtAnalyzer } from './tech-debt-analyzer.js';
export { RecommendationPrioritizer } from './recommendation-prioritizer.js';

// ── Orchestrator ───────────────────────────────────────────
export { EvolutionRuntime } from './evolution-runtime.js';
