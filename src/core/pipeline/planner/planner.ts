/**
 * Planner Interface — Produces a Plan from a Goal.
 *
 * Conforms to: AIS-003B.000 Requirement #2 (Planner)
 *
 * Contract:
 *   - Planner is deterministic: same Goal always yields same Plan steps.
 *   - Planner is synchronous in spirit (returns Promise for API symmetry).
 *   - Planner does NOT execute tasks; it only declares steps.
 *   - Planner throws PlanningError on invalid goals.
 */
import type { Goal, Plan, Variables } from '../types.js';

export interface Planner {
  readonly plannerId: string;
  /** Build a Plan from a Goal. Variables may be used to seed bindings. */
  buildPlan(goal: Goal, variables?: Variables): Promise<Plan>;
}

/** Helper: create a step ID. */
export function makeStepId(seed: number): string {
  return `step-${seed.toString().padStart(3, '0')}-${crypto.randomUUID().slice(0, 8)}`;
}
