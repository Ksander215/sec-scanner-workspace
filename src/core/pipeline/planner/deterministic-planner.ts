/**
 * Deterministic Planner — First Planner implementation.
 *
 * Conforms to: AIS-003B.000 Requirement #2
 *   - Fully deterministic (no LLM, no randomness).
 *   - Produces fixed, well-known plans based on a registry of plan templates.
 *   - Falls back to a "noop" plan if no template matches.
 *
 * The deterministic planner routes Goals by `goal.template` field (if set) or
 * by matching goal description keywords. This guarantees reproducibility in tests.
 */
import type { Planner } from './planner.js';
import type { Goal, Plan, Step, Variables } from '../types.js';
import { PlanningError } from '../errors.js';

/** A plan template is a factory that produces steps for a goal. */
export interface PlanTemplate {
  readonly templateId: string;
  readonly match: (goal: Goal) => boolean;
  readonly build: (goal: Goal, variables?: Variables) => readonly Step[];
}

export class DeterministicPlanner implements Planner {
  readonly plannerId = 'deterministic-planner-v1';
  private readonly templates: PlanTemplate[];
  private readonly fallbackTemplate?: PlanTemplate;

  constructor(templates: PlanTemplate[] = [], fallbackTemplate?: PlanTemplate) {
    this.templates = templates;
    this.fallbackTemplate = fallbackTemplate;
  }

  async buildPlan(goal: Goal, variables?: Variables): Promise<Plan> {
    if (!goal || !goal.description) {
      throw new PlanningError('Goal must have a description');
    }

    // Find first matching template (templates are tried in registration order)
    let matched: PlanTemplate | undefined;
    for (const tpl of this.templates) {
      if (tpl.match(goal)) {
        matched = tpl;
        break;
      }
    }

    // Use fallback if no template matched
    if (!matched) {
      matched = this.fallbackTemplate;
    }
    if (!matched) {
      throw new PlanningError(
        `No plan template matched goal '${goal.id}' and no fallback configured`,
      );
    }

    const steps = matched.build(goal, variables);
    if (steps.length === 0) {
      throw new PlanningError(
        `Plan template '${matched.templateId}' produced 0 steps for goal '${goal.id}'`,
      );
    }

    // Validate step dependencies (basic cycle check)
    validateSteps(steps);

    return {
      id: crypto.randomUUID() as Plan['id'],
      goalId: goal.id,
      steps,
      createdAt: new Date().toISOString(),
      plannerId: this.plannerId,
      version: '1.0.0',
    };
  }

  /** Register an additional template (for extension). */
  registerTemplate(template: PlanTemplate): void {
    this.templates.push(template);
  }
}

/** Validate step structure: IDs unique, dependencies exist, no cycles. */
function validateSteps(steps: readonly Step[]): void {
  const ids = new Set<string>();
  for (const step of steps) {
    if (ids.has(step.id)) {
      throw new PlanningError(`Duplicate step id: ${step.id}`);
    }
    ids.add(step.id);
  }
  for (const step of steps) {
    if (step.dependsOn) {
      for (const dep of step.dependsOn) {
        if (!ids.has(dep)) {
          throw new PlanningError(
            `Step '${step.id}' depends on unknown step '${dep}'`,
          );
        }
      }
    }
  }
  // Simple cycle detection via topological check
  detectCycles(steps);
}

function detectCycles(steps: readonly Step[]): void {
  const adj = new Map<string, readonly string[]>();
  for (const s of steps) adj.set(s.id, s.dependsOn ?? []);
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(id: string): void {
    if (stack.has(id)) {
      throw new PlanningError(`Cycle detected at step '${id}'`);
    }
    if (visited.has(id)) return;
    visited.add(id);
    stack.add(id);
    for (const dep of adj.get(id) ?? []) {
      dfs(dep);
    }
    stack.delete(id);
  }
  for (const s of steps) dfs(s.id);
}
