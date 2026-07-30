/**
 * Workflow Runtime — Compensation Engine
 * TASK-AIS-003H.000
 *
 * Handles rollback operations for workflow stages:
 *   - Undo: reverse the effect of a stage
 *   - Retry: attempt to re-execute a failed stage
 *   - Skip: skip the failed stage and continue
 *   - Restart: restart a stage from scratch
 *   - Abort: abort the entire workflow
 *
 * Processes compensation in reverse order of stage completion.
 */

import type {
  StageId,
  StageInstance,
  CompensationAction,
  CompensationStatus,
  StageDefinition,
  StageError,
  Timestamp,
} from './types.js';
import { CompensationAction as CA, CompensationStatus as CS } from './types.js';
import type { WorkflowContext } from './types.js';

export interface CompensationResult {
  readonly stageId: StageId;
  readonly action: CompensationAction;
  readonly status: CompensationStatus;
  readonly error: Readonly<StageError> | null;
}

export class CompensationEngine {
  private readonly handlers = new Map<string, CompensateHandler>();

  registerHandler(stageName: string, handler: CompensateHandler): void {
    this.handlers.set(stageName, handler);
  }

  /**
   * Execute compensation for a completed workflow.
   * Processes stages in reverse completion order.
   */
  async compensate(
    completedStages: readonly StageInstance[],
    stageDefinitions: ReadonlyMap<StageId, StageDefinition>,
    contextFactory: (stageId: StageId) => WorkflowContext,
  ): Promise<readonly CompensationResult[]> {
    const results: CompensationResult[] = [];

    // Process in reverse order
    for (let i = completedStages.length - 1; i >= 0; i--) {
      const stage = completedStages[i];
      const definition = stageDefinitions.get(stage.id);

      if (!definition) {
        results.push(Object.freeze({
          stageId: stage.id,
          action: CA.Undo,
          status: CS.Skipped,
          error: null,
        }));
        continue;
      }

      const result = await this.compensateStage(definition, contextFactory(stage.id));
      results.push(result);
    }

    return results;
  }

  /**
   * Compensate a single stage.
   */
  async compensateStage(
    definition: StageDefinition,
    context: WorkflowContext,
  ): Promise<CompensationResult> {
    const compensation = definition.compensation;

    switch (compensation.action) {
      case CA.Skip:
        return Object.freeze({
          stageId: definition.id,
          action: CA.Skip,
          status: CS.Skipped,
          error: null,
        });

      case CA.Abort:
        return Object.freeze({
          stageId: definition.id,
          action: CA.Abort,
          status: CS.Completed,
          error: null,
        });

      case CA.Undo:
      case CA.Restart:
      case CA.Retry:
        return await this.executeCompensationHandler(definition, context);

      default:
        return Object.freeze({
          stageId: definition.id,
          action: compensation.action,
          status: CS.Skipped,
          error: null,
        });
    }
  }

  private async executeCompensationHandler(
    definition: StageDefinition,
    context: WorkflowContext,
  ): Promise<CompensationResult> {
    const handlerName = definition.compensation.handler ?? definition.handler;
    const handler = this.handlers.get(handlerName);

    if (!handler) {
      return Object.freeze({
        stageId: definition.id,
        action: definition.compensation.action,
        status: CS.Skipped,
        error: null,
      });
    }

    try {
      await handler(context);
      return Object.freeze({
        stageId: definition.id,
        action: definition.compensation.action,
        status: CS.Completed,
        error: null,
      });
    } catch (e) {
      const stageError: StageError = Object.freeze({
        code: 'COMPENSATION_HANDLER_ERROR',
        message: e instanceof Error ? e.message : String(e),
        details: [],
        occurredAt: new Date().toISOString() as Timestamp,
        attempt: 1,
        retryable: true,
      });

      return Object.freeze({
        stageId: definition.id,
        action: definition.compensation.action,
        status: CS.Failed,
        error: stageError,
      });
    }
  }
}

export type CompensateHandler = (context: WorkflowContext) => Promise<void>;
