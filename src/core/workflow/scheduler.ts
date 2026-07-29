/**
 * Workflow Runtime — Scheduler
 * TASK-AIS-003H.000
 *
 * Plans and orders stage execution using different strategies:
 *   - Sequential: stages run one after another
 *   - Parallel: stages run concurrently
 *   - Conditional: stages run based on conditions
 *   - Delayed: stages run after a delay
 *   - EventDriven: stages wait for events
 */

import type {
  StageDefinition,
  StageId,
  StageType,
  SchedulePlan,
  ExecutionMode,
} from './types.js';
import {
  StageType as ST,
  ExecutionMode as EM,
} from './types.js';

export class WorkflowScheduler {
  /**
   * Generate a schedule plan from a list of stage definitions.
   * Analyzes dependencies and stage types to determine execution order.
   */
  schedule(stages: readonly StageDefinition[]): readonly SchedulePlan[] {
    const plans: SchedulePlan[] = [];
    let order = 0;
    let group = 0;

    // Build dependency graph
    const dependencyCount = new Map<StageId, number>();
    const stageMap = new Map<StageId, StageDefinition>();

    for (const stage of stages) {
      stageMap.set(stage.id, stage);
      dependencyCount.set(stage.id, stage.dependencies.length);
    }

    // Topological sort with group tracking
    const completed = new Set<StageId>();
    const queue: StageId[] = [];

    // Start with stages that have no dependencies
    for (const [id, count] of dependencyCount) {
      if (count === 0) {
        queue.push(id);
      }
    }

    while (queue.length > 0) {
      const nextBatch: StageId[] = [];
      const batchGroup = group;

      for (const stageId of queue) {
        if (completed.has(stageId)) continue;

        const stage = stageMap.get(stageId)!;
        const mode = this.resolveExecutionMode(stage.type);

        plans.push(Object.freeze({
          stageId: stage.id,
          mode,
          order,
          group: batchGroup,
          dependencies: stage.dependencies,
          delayMs: stage.delayMs ?? 0,
          eventType: stage.eventType,
        }));

        completed.add(stageId);
        order++;

        // Find next stages whose dependencies are all met
        for (const [otherId, _otherCount] of dependencyCount) {
          if (completed.has(otherId)) continue;
          const otherStage = stageMap.get(otherId)!;
          const depsMet = otherStage.dependencies.every(d => completed.has(d));
          const shouldQueue = depsMet && !queue.includes(otherId) && !nextBatch.includes(otherId);
          if (shouldQueue) {
            nextBatch.push(otherId);
          }
        }
      }

      queue.length = 0;
      queue.push(...nextBatch);
      group++;
    }

    return plans;
  }

  /**
   * Get stages that can run in parallel (same group, no inter-dependencies).
   */
  getParallelGroup(plans: readonly SchedulePlan[], group: number): readonly SchedulePlan[] {
    return plans.filter(p => p.group === group);
  }

  /**
   * Get next stage(s) to execute based on current completed stages.
   */
  getNextStages(
    plans: readonly SchedulePlan[],
    completedStages: ReadonlySet<StageId>,
  ): readonly SchedulePlan[] {
    return plans.filter(p => {
      if (completedStages.has(p.stageId)) return false;
      return p.dependencies.every(dep => completedStages.has(dep));
    });
  }

  /**
   * Determine if a stage is ready to execute.
   */
  isStageReady(
    plan: SchedulePlan,
    completedStages: ReadonlySet<StageId>,
    skippedStages: ReadonlySet<StageId>,
  ): boolean {
    // Already completed or skipped
    if (completedStages.has(plan.stageId) || skippedStages.has(plan.stageId)) return false;

    // All dependencies must be completed or skipped
    return plan.dependencies.every(
      dep => completedStages.has(dep) || skippedStages.has(dep),
    );
  }

  /**
   * Resolve StageType to ExecutionMode.
   */
  private resolveExecutionMode(type: StageType): ExecutionMode {
    switch (type) {
      case ST.Sequential:
        return EM.Sequential;
      case ST.Parallel:
        return EM.Parallel;
      case ST.Conditional:
        return EM.Conditional;
      case ST.Delayed:
        return EM.Delayed;
      case ST.EventDriven:
        return EM.EventDriven;
      default:
        return EM.Sequential;
    }
  }
}
