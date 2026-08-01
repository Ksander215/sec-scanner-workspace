/**
 * Solution Builder Runtime — Barrel Export
 * TASK-AIS-010A.000
 *
 * Re-exports all public types, errors, events, contracts, and implementations.
 */

// ─── Core Type Definitions ─────────────────────────────────────────
export * from './types.js';

// ─── Error Hierarchy ────────────────────────────────────────────────
export * from './errors.js';

// ─── Domain Events ──────────────────────────────────────────────────
export * from './events.js';

// ─── Public Contracts (Interfaces) ─────────────────────────────────
export * from './contracts.js';

// ─── Implementations ────────────────────────────────────────────────
export { GoalInterpreter } from './goal-interpreter.js';
export { DomainAnalyzer } from './domain-analyzer.js';
export { RequirementExtractor } from './requirement-extractor.js';
export { SolutionPlanner } from './solution-planner.js';
export { CapabilitySelector } from './capability-selector.js';
export { WorkflowComposer } from './workflow-composer.js';
export { KnowledgeComposer } from './knowledge-composer.js';
export { AIConfigRuntime } from './ai-config-runtime.js';
export { DesktopComposer } from './desktop-composer.js';
export { SolutionValidator } from './solution-validator.js';
export { SolutionOptimizer } from './solution-optimizer.js';
export { DeploymentPlanner } from './deployment-planner.js';
export { LifecycleManager } from './lifecycle-manager.js';
export { SolutionCatalog } from './solution-catalog.js';
export { SolutionRuntime } from './solution-runtime.js';
