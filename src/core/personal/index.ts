/**
 * Personal Intelligence Runtime — Barrel Export
 *
 * Re-exports the full public API of the PIR module.
 */

// ── Types & Contracts (type-only re-exports) ─────────────────

export type * from './types.js';
export type * from './contracts.js';

// ── Events (value re-exports: factory function + union type) ──

export * from './events.js';

// ── Errors (value re-exports: error classes) ──────────────────

export * from './errors.js';

// ── Subsystems (value re-exports: runtime classes) ─────────────

export { UserProfileRuntime } from './user-profile.js';
export { GoalRuntime } from './goal-runtime.js';
export { PriorityRuntime } from './priority-runtime.js';
export { ContextRuntime } from './context-runtime.js';
export { PlanningRuntime } from './planning-runtime.js';
export { PredictionRuntime } from './prediction-runtime.js';
export { HabitRuntime } from './habit-runtime.js';
export { RecommendationRuntime } from './recommendation-runtime.js';
export { AttentionRuntime } from './attention-runtime.js';
export { ReflectionRuntime } from './reflection-runtime.js';
export { LearningRuntime } from './learning-runtime.js';
export { DecisionRuntime } from './decision-runtime.js';
export { DailyBriefRuntime } from './daily-brief-runtime.js';
export { AssistantRuntime } from './assistant-runtime.js';

// ── Metrics & Orchestrator ────────────────────────────────────

export { PersonalMetricsCollector } from './metrics.js';
export { PersonalRuntime } from './personal-runtime.js';
