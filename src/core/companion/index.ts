/**
 * AIS Companion — Barrel Export
 * TASK-AIS-011A.000
 */

export * from './types.js';
export * from './errors.js';
export * from './events.js';
export * from './contracts.js';

export { CompanionRuntime } from './companion-runtime.js';
export { UserWorkspaceManager } from './user-workspace.js';
export { ConversationCenter } from './conversation-center.js';
export { GoalCenter } from './goal-center.js';
export { DailyPlanner } from './daily-planner.js';
export { SolutionCenter } from './solution-center.js';
export { WorkflowDashboard } from './workflow-dashboard.js';
export { CapabilityManager } from './capability-manager.js';
export { MarketplaceCenter } from './marketplace-center.js';
export { KnowledgeCenter } from './knowledge-center.js';
export { AIControlCenter } from './ai-control-center.js';
export { InsightEngine } from './insight-engine.js';
export { NotificationCenter } from './notification-center.js';
export { AnalyticsDashboard } from './analytics-dashboard.js';
export { LifecycleManager } from './lifecycle-manager.js';
export { ExplainabilityCenter } from './explainability-center.js';
export type { ExplainabilityInput, ExplainableRecommendation } from './explainability-center.js';
export { ValueOptimizationEngine, OptimizationPhase } from './value-optimization-engine.js';
export type { OptimizationCycle, ValueAction } from './value-optimization-engine.js';
