/**
 * Execution Pipeline — Core orchestration for AIS Execution Engine.
 *
 * Conforms to: AIS-003B.000
 *   Goal → Planner → Execution Plan → Task Queue → Execution → Result → Memory/Event
 *
 * The pipeline orchestrates the full lifecycle of a single execution:
 *   1. Receive a Goal
 *   2. Build a Plan via Planner
 *   3. Execute Plan via PlanExecutor
 *   4. Collect results and build ExecutionReport
 *   5. Publish lifecycle events via Event Bus
 *   6. Manage state via ExecutionFSM
 *
 * No LLM, no Plugins, no UI, no Knowledge Base.
 * Full architecture works — deterministically.
 */
import type { EventBus } from '../events/event-bus.js';
import type { Goal, Plan, ExecutionRequest, ExecutionResult, ExecutionId, GoalId, Variables, CancellationToken } from './types.js';
import { ExecutionStatus } from './types.js';
import type { Planner } from './planner/planner.js';
import { DeterministicPlanner } from './planner/deterministic-planner.js';
import type { PlanExecutorResult } from './executor/plan-executor.js';
import { PlanExecutor as PlanExecutorImpl } from './executor/plan-executor.js';
import type { TaskHandlerRegistry } from './executor/task-handler.js';
import type { RecoveryPolicy } from './recovery/recovery-policy.js';
import type { RetryPolicy } from './recovery/retry-policy.js';
import type { StateMachine } from '../fsm/state-machine.js';
import { createExecutionFSM } from '../fsm/execution-fsm.js';
import { TraceCollector } from '../trace/trace-collector.js';
import { ExecutionReport, ExecutionReportBuilder } from './execution-report.js';
import { CancellationTokenImpl } from './cancellation-token.js';
import {
  PlanningError,
} from './errors.js';
import {
  GoalCreated,
  PlanBuilt,
  ExecutionCompleted,
  ExecutionFailed,
  ExecutionCancelled,
  ExecutionStateChange,
} from './events/pipeline-events.js';
import { EventClassification } from '../types/common.js';

export interface PipelineConfig {
  readonly planner?: Planner;
  readonly handlerRegistry: TaskHandlerRegistry;
  readonly eventBus: EventBus;
  readonly retryPolicy?: RetryPolicy;
  readonly recoveryPolicy?: RecoveryPolicy;
  readonly defaultTimeoutMs?: number;
}

export class ExecutionPipeline {
  private readonly planner: Planner;
  private readonly handlerRegistry: TaskHandlerRegistry;
  private readonly eventBus: EventBus;
  private readonly retryPolicy?: RetryPolicy;
  private readonly recoveryPolicy?: RecoveryPolicy;
  private readonly executions = new Map<string, PipelineExecutionContext>();

  constructor(config: PipelineConfig) {
    this.planner = config.planner ?? new DeterministicPlanner();
    this.handlerRegistry = config.handlerRegistry;
    this.eventBus = config.eventBus;
    this.retryPolicy = config.retryPolicy;
    this.recoveryPolicy = config.recoveryPolicy;
  }

  /**
   * Execute a Goal through the full pipeline.
   * Returns an ExecutionResult and an ExecutionReport.
   */
  async execute(request: ExecutionRequest): Promise<{ result: ExecutionResult; report: ExecutionReport }> {
    const executionId = crypto.randomUUID() as ExecutionId;
    const ctx = this.createContext(executionId, request);
    this.executions.set(executionId, ctx);

    const startedAt = new Date().toISOString();

    try {
      // State: Idle → Planning
      ctx.fsm.transition(ExecutionStatus.Planning);
      ctx.trace.traceStateChange(executionId, ExecutionStatus.Idle, ExecutionStatus.Planning);
      await this.publishStateChange(ctx, ExecutionStatus.Idle, ExecutionStatus.Planning);

      // Publish GoalCreated event
      await this.publishGoalCreated(ctx, request.goal);

      // Build Plan
      ctx.trace.traceInfo(`Planning goal '${request.goal.id}': ${request.goal.description}`);
      const plan = await this.planner.buildPlan(request.goal, request.variables);

      // State: Planning → Ready
      ctx.fsm.transition(ExecutionStatus.Ready);
      ctx.trace.traceStateChange(executionId, ExecutionStatus.Planning, ExecutionStatus.Ready);
      await this.publishStateChange(ctx, ExecutionStatus.Planning, ExecutionStatus.Ready);

      // Publish PlanBuilt event
      await this.publishPlanBuilt(ctx, plan);

      // State: Ready → Running
      ctx.fsm.transition(ExecutionStatus.Running);
      ctx.trace.traceStateChange(executionId, ExecutionStatus.Ready, ExecutionStatus.Running);
      await this.publishStateChange(ctx, ExecutionStatus.Ready, ExecutionStatus.Running);

      // Execute Plan (create executor per-execution for correct cancellation token)
      ctx.trace.traceInfo(`Executing plan '${plan.id}' with ${plan.steps.length} steps`);
      const executor = new PlanExecutorImpl({
        handlerRegistry: this.handlerRegistry,
        eventBus: this.eventBus,
        retryPolicy: this.retryPolicy,
        recoveryPolicy: this.recoveryPolicy,
        trace: ctx.trace,
        cancellationToken: ctx.token,
      });
      const execResult = await executor.execute(plan, request.variables);

      const finishedAt = new Date().toISOString();
      const durationMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();

      if (execResult.aborted) {
        // Determine final state
        if (ctx.token.cancelled) {
          ctx.fsm.transition(ExecutionStatus.Cancelled);
          ctx.trace.traceStateChange(executionId, ExecutionStatus.Running, ExecutionStatus.Cancelled);
          await this.publishStateChange(ctx, ExecutionStatus.Running, ExecutionStatus.Cancelled);

          await this.publishExecutionCancelled(ctx, execResult);

          const cancelError = ctx.token.reason
            ? { code: 'CANCELLED', message: ctx.token.reason, retryable: false }
            : undefined;
          const result = this.buildResult(executionId, request.goal.id, ExecutionStatus.Cancelled, startedAt, finishedAt, durationMs, execResult.variables, cancelError);
          const report = this.buildReport(ctx, plan, execResult, startedAt, finishedAt);
          return { result, report };
        } else {
          ctx.fsm.transition(ExecutionStatus.Failed);
          ctx.trace.traceStateChange(executionId, ExecutionStatus.Running, ExecutionStatus.Failed);
          await this.publishStateChange(ctx, ExecutionStatus.Running, ExecutionStatus.Failed);

          await this.publishExecutionFailed(ctx, execResult);

          const error = execResult.abortReason
            ? { code: 'PIPELINE_ABORTED', message: execResult.abortReason, retryable: false }
            : undefined;

          const result = this.buildResult(executionId, request.goal.id, ExecutionStatus.Failed, startedAt, finishedAt, durationMs, execResult.variables, error);
          const report = this.buildReport(ctx, plan, execResult, startedAt, finishedAt);
          return { result, report };
        }
      }

      // Success
      ctx.fsm.transition(ExecutionStatus.Completed);
      ctx.trace.traceStateChange(executionId, ExecutionStatus.Running, ExecutionStatus.Completed);
      await this.publishStateChange(ctx, ExecutionStatus.Running, ExecutionStatus.Completed);

      await this.publishExecutionCompleted(ctx, plan, startedAt, finishedAt, durationMs);

      const result = this.buildResult(executionId, request.goal.id, ExecutionStatus.Completed, startedAt, finishedAt, durationMs, execResult.variables);
      const report = this.buildReport(ctx, plan, execResult, startedAt, finishedAt);
      return { result, report };
    } catch (error) {
      const finishedAt = new Date().toISOString();
      const durationMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();

      // Try to transition to Failed (may already be in terminal state)
      try {
        if (!ctx.fsm.isTerminal) {
          ctx.fsm.transition(ExecutionStatus.Failed);
          await this.publishStateChange(ctx, ctx.fsm.currentState === ExecutionStatus.Failed
            ? ExecutionStatus.Running
            : ctx.fsm.currentState, ExecutionStatus.Failed);
        }
      } catch { /* FSM transition may be invalid; we're already in error handling */ }

      ctx.trace.traceError(
        'PIPELINE_ERROR',
        error instanceof Error ? error.message : String(error),
      );

      await this.publishExecutionFailedFromError(ctx, error);

      const errorObj = {
        code: error instanceof PlanningError ? 'PLANNING_ERROR' : 'PIPELINE_ERROR',
        message: error instanceof Error ? error.message : String(error),
        retryable: false,
      };

      const result = this.buildResult(executionId, request.goal.id, ExecutionStatus.Failed, startedAt, finishedAt, durationMs, {}, errorObj);
      const report = this.buildErrorReport(ctx, startedAt, finishedAt, errorObj);
      return { result, report };
    } finally {
      this.executions.delete(executionId);
    }
  }

  /**
   * Cancel a running execution by execution ID.
   */
  cancel(executionId: string, reason?: string): void {
    const ctx = this.executions.get(executionId);
    if (!ctx) {
      throw new Error(`Execution '${executionId}' not found`);
    }
    ctx.token.cancel(reason);
  }

  /** Get the trace entries for a running or last execution. */
  getTrace(executionId: string): readonly import('../trace/trace-collector.js').TraceEntry[] {
    const ctx = this.executions.get(executionId);
    if (!ctx) return [];
    return ctx.trace.getEntries();
  }

  private createContext(
    executionId: string,
    request: ExecutionRequest,
  ): PipelineExecutionContext {
    const token = request.cancellationToken ?? new CancellationTokenImpl();
    const trace = new TraceCollector();
    const fsm = createExecutionFSM();

    return {
      executionId,
      goal: request.goal,
      token,
      trace,
      fsm,
      plan: undefined,
      reportBuilder: new ExecutionReportBuilder()
        .setExecution(executionId, request.goal.id, '')
        .setTiming('', '')
        .setStatus(ExecutionStatus.Idle),
    };
  }

  private buildResult(
    executionId: ExecutionId,
    goalId: GoalId,
    status: ExecutionStatus.Completed | ExecutionStatus.Failed | ExecutionStatus.Cancelled,
    startedAt: string,
    finishedAt: string,
    durationMs: number,
    outputs: Variables,
    error?: { code: string; message: string; retryable: boolean },
  ): ExecutionResult {
    return {
      executionId,
      goalId,
      status,
      startedAt,
      finishedAt,
      durationMs,
      outputs,
      error,
    };
  }

  private buildReport(
    ctx: PipelineExecutionContext,
    plan: Plan,
    execResult: PlanExecutorResult,
    startedAt: string,
    finishedAt: string,
  ): ExecutionReport {
    const builder = new ExecutionReportBuilder()
      .setExecution(ctx.executionId, ctx.goal.id, plan.id)
      .setStatus(ctx.fsm.currentState as ExecutionStatus)
      .setTiming(startedAt, finishedAt)
      .setVariables(execResult.variables)
      .setEventsPublished(this.eventBus.getSequence());

    for (const task of execResult.tasks) {
      builder.addStep({
        stepName: task.name,
        taskType: task.taskType,
        status: task.status,
        attempts: task.attempt,
        durationMs: task.finishedAt && task.startedAt
          ? new Date(task.finishedAt).getTime() - new Date(task.startedAt).getTime()
          : 0,
        error: task.error,
      });
    }

    const taskResults = execResult.results;
    for (const [, result] of taskResults) {
      if (result.error) {
        builder.addError(result.error);
      }
    }

    builder.addTraceEntries(ctx.trace.getEntries());

    return builder.build();
  }

  private buildErrorReport(
    ctx: PipelineExecutionContext,
    startedAt: string,
    finishedAt: string,
    error: { code: string; message: string; retryable: boolean },
  ): ExecutionReport {
    return new ExecutionReportBuilder()
      .setExecution(ctx.executionId, ctx.goal.id, '')
      .setStatus(ExecutionStatus.Failed)
      .setTiming(startedAt, finishedAt)
      .setEventsPublished(this.eventBus.getSequence())
      .addError(error)
      .addTraceEntries(ctx.trace.getEntries())
      .build();
  }

  // ─── Event Publishing ──────────────────────────────────────

  private async publishGoalCreated(ctx: PipelineExecutionContext, goal: Goal): Promise<void> {
    const event: GoalCreated = {
      eventId: crypto.randomUUID(),
      eventType: 'GoalCreated',
      classification: EventClassification.Action,
      timestamp: new Date().toISOString(),
      sequence: 0,
      aggregateId: ctx.executionId,
      aggregateType: 'Execution',
      version: '1.0.0',
      payload: {
        goalId: goal.id,
        description: goal.description,
        autonomyLevel: goal.autonomyLevel,
        createdAt: goal.createdAt,
      },
    };
    await this.eventBus.publish(event);
  }

  private async publishPlanBuilt(ctx: PipelineExecutionContext, plan: Plan): Promise<void> {
    const event: PlanBuilt = {
      eventId: crypto.randomUUID(),
      eventType: 'PlanBuilt',
      classification: EventClassification.Info,
      timestamp: new Date().toISOString(),
      sequence: 0,
      aggregateId: ctx.executionId,
      aggregateType: 'Execution',
      version: '1.0.0',
      payload: {
        planId: plan.id,
        goalId: ctx.goal.id,
        stepCount: plan.steps.length,
        plannerId: plan.plannerId,
        createdAt: plan.createdAt,
      },
    };
    await this.eventBus.publish(event);
  }

  private async publishStateChange(
    ctx: PipelineExecutionContext,
    previousState: ExecutionStatus,
    newState: ExecutionStatus,
  ): Promise<void> {
    const event: ExecutionStateChange = {
      eventId: crypto.randomUUID(),
      eventType: 'ExecutionStateChange',
      classification: EventClassification.StateChange,
      timestamp: new Date().toISOString(),
      sequence: 0,
      aggregateId: ctx.executionId,
      aggregateType: 'Execution',
      version: '1.0.0',
      payload: {
        executionId: ctx.executionId,
        previousState,
        newState,
        timestamp: new Date().toISOString(),
      },
    };
    await this.eventBus.publish(event);
  }

  private async publishExecutionCompleted(
    ctx: PipelineExecutionContext,
    plan: Plan,
    _startedAt: string,
    finishedAt: string,
    durationMs: number,
  ): Promise<void> {
    const event: ExecutionCompleted = {
      eventId: crypto.randomUUID(),
      eventType: 'ExecutionCompleted',
      classification: EventClassification.Result,
      timestamp: new Date().toISOString(),
      sequence: 0,
      aggregateId: ctx.executionId,
      aggregateType: 'Execution',
      version: '1.0.0',
      payload: {
        executionId: ctx.executionId,
        goalId: ctx.goal.id,
        status: ExecutionStatus.Completed,
        durationMs,
        taskCount: plan.steps.length,
        completedAt: finishedAt,
      },
    };
    await this.eventBus.publish(event);
  }

  private async publishExecutionFailed(
    ctx: PipelineExecutionContext,
    execResult: PlanExecutorResult,
  ): Promise<void> {
    const failedTask = execResult.tasks.find(t => t.status === 'failed');
    const event: ExecutionFailed = {
      eventId: crypto.randomUUID(),
      eventType: 'ExecutionFailed',
      classification: EventClassification.Error,
      timestamp: new Date().toISOString(),
      sequence: 0,
      aggregateId: ctx.executionId,
      aggregateType: 'Execution',
      version: '1.0.0',
      payload: {
        executionId: ctx.executionId,
        goalId: ctx.goal.id,
        status: ExecutionStatus.Failed,
        error: {
          code: 'PIPELINE_ABORTED',
          message: execResult.abortReason ?? 'Pipeline aborted',
        },
        failedTaskId: failedTask?.id,
        failedStepId: failedTask?.stepId,
        durationMs: 0,
        failedAt: new Date().toISOString(),
      },
    };
    await this.eventBus.publish(event);
  }

  private async publishExecutionFailedFromError(
    ctx: PipelineExecutionContext,
    error: unknown,
  ): Promise<void> {
    const event: ExecutionFailed = {
      eventId: crypto.randomUUID(),
      eventType: 'ExecutionFailed',
      classification: EventClassification.Error,
      timestamp: new Date().toISOString(),
      sequence: 0,
      aggregateId: ctx.executionId,
      aggregateType: 'Execution',
      version: '1.0.0',
      payload: {
        executionId: ctx.executionId,
        goalId: ctx.goal.id,
        status: ExecutionStatus.Failed,
        error: {
          code: error instanceof PlanningError ? 'PLANNING_ERROR' : 'PIPELINE_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
        durationMs: 0,
        failedAt: new Date().toISOString(),
      },
    };
    await this.eventBus.publish(event);
  }

  private async publishExecutionCancelled(
    ctx: PipelineExecutionContext,
    execResult: PlanExecutorResult,
  ): Promise<void> {
    const event: ExecutionCancelled = {
      eventId: crypto.randomUUID(),
      eventType: 'ExecutionCancelled',
      classification: EventClassification.Info,
      timestamp: new Date().toISOString(),
      sequence: 0,
      aggregateId: ctx.executionId,
      aggregateType: 'Execution',
      version: '1.0.0',
      payload: {
        executionId: ctx.executionId,
        goalId: ctx.goal.id,
        reason: ctx.token.reason,
        cancelledAt: new Date().toISOString(),
        completedTasks: execResult.tasks.filter(t => t.status === 'succeeded').length,
        totalTasks: execResult.tasks.length,
      },
    };
    await this.eventBus.publish(event);
  }
}

/** Internal context for a single execution. */
interface PipelineExecutionContext {
  readonly executionId: string;
  readonly goal: Goal;
  readonly token: CancellationToken;
  readonly trace: TraceCollector;
  readonly fsm: StateMachine<ExecutionStatus>;
  plan?: Plan;
  reportBuilder: ExecutionReportBuilder;
}
