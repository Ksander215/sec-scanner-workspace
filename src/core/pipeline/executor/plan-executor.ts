/**
 * Plan Executor — Executes a Plan task-by-task with retry/recovery.
 *
 * Conforms to: AIS-003B.000 Requirements #3, #8, #9, #10
 *
 * Responsibilities:
 *   - Convert Plan Steps to runtime Tasks.
 *   - Resolve variable substitutions in step inputs (e.g. ${step1.output.foo}).
 *   - Dispatch Tasks through the Task Scheduler.
 *   - Apply RetryPolicy on retryable failures.
 *   - Apply RecoveryPolicy on unrecoverable failures.
 *   - Publish TaskStarted/TaskFinished/ExecutionRetried events.
 *   - Respect cancellation: no new tasks start once cancelled.
 *
 * The executor is FIFO-sequential by default; concurrency is delegated to the Scheduler.
 */
import type { EventBus } from '../../events/event-bus.js';
import type { Plan, Step, StepId, Task, TaskResult, Variables, CancellationToken } from '../types.js';
import { TaskStatus } from '../types.js';
import type { TaskHandlerRegistry, TaskHandlerContext } from './task-handler.js';
import type { RetryPolicy } from '../recovery/retry-policy.js';
import type { RecoveryPolicy, RecoveryDecision } from '../recovery/recovery-policy.js';
import { DefaultRecoveryPolicy } from '../recovery/recovery-policy.js';
import { DEFAULT_RETRY_POLICY } from '../recovery/retry-policy.js';
import { TraceCollector } from '../../trace/trace-collector.js';
import type { TraceCollector as TC } from '../../trace/trace-collector.js';
import {
  TaskExecutionError,
  TaskCancelledError,
  toTaskError,
} from '../errors.js';
import type { TaskStarted, TaskFinished, ExecutionRetried } from '../events/pipeline-events.js';
import { EventClassification } from '../../types/common.js';

export interface PlanExecutorOptions {
  readonly handlerRegistry: TaskHandlerRegistry;
  readonly eventBus: EventBus;
  readonly retryPolicy?: RetryPolicy;
  readonly recoveryPolicy?: RecoveryPolicy;
  readonly trace?: TC;
  readonly cancellationToken?: CancellationToken;
}

export interface PlanExecutorResult {
  readonly tasks: readonly Task[];
  readonly results: ReadonlyMap<string, TaskResult>;
  readonly variables: Variables;
  readonly aborted: boolean;
  readonly abortReason?: string;
}

export class PlanExecutor {
  private readonly handlers: TaskHandlerRegistry;
  private readonly eventBus: EventBus;
  private readonly retryPolicy: RetryPolicy;
  private readonly recoveryPolicy: RecoveryPolicy;
  private readonly trace: TC;
  private readonly cancellationToken?: CancellationToken;

  constructor(opts: PlanExecutorOptions) {
    this.handlers = opts.handlerRegistry;
    this.eventBus = opts.eventBus;
    this.retryPolicy = opts.retryPolicy ?? DEFAULT_RETRY_POLICY;
    this.recoveryPolicy = opts.recoveryPolicy ?? new DefaultRecoveryPolicy(this.retryPolicy);
    this.trace = opts.trace ?? new TraceCollector();
    this.cancellationToken = opts.cancellationToken;
  }

  /**
   * Execute a Plan: iterate steps in order (respecting dependsOn), dispatch tasks,
   * collect results, apply retry/recovery.
   */
  async execute(plan: Plan, initialVariables: Variables = {}): Promise<PlanExecutorResult> {
    const orderedSteps = topologicalSort(plan.steps);

    const tasks: Task[] = [];
    const results = new Map<string, TaskResult>();
    const variablesAcc: Record<string, unknown> = { ...initialVariables };
    let aborted = false;
    let abortReason: string | undefined;
    let abortIndex = -1;

    for (let i = 0; i < orderedSteps.length; i++) {
      const step = orderedSteps[i];

      // Check cancellation before dispatching each task
      if (this.cancellationToken?.cancelled) {
        aborted = true;
        abortReason = 'Cancelled before task dispatch';
        abortIndex = i;
        this.trace.traceInfo(`Skipping step '${step.name}' due to cancellation`);
        break;
      }

      // Resolve variables in step input
      const resolvedInput = resolveVariables(step.input, variablesAcc);
      const outcome = await this.dispatchTask(plan, step, resolvedInput, variablesAcc);
      tasks.push(outcome.task);

      if (outcome.task.status === TaskStatus.Succeeded) {
        variablesAcc[step.name] = outcome.result.output ?? {};
        results.set(outcome.task.id, outcome.result);
      } else if (outcome.task.status === TaskStatus.Failed) {
        results.set(outcome.task.id, outcome.result);
        aborted = true;
        abortReason = `Task '${outcome.task.name}' failed: ${outcome.result.error?.message ?? 'unknown error'}`;
        abortIndex = i;
        break;
      } else if (outcome.task.status === TaskStatus.Cancelled) {
        results.set(outcome.task.id, outcome.result);
        aborted = true;
        abortReason = 'Task cancelled';
        abortIndex = i;
        break;
      }
    }

    // Mark remaining steps as skipped
    if (aborted && abortIndex >= 0) {
      for (let j = abortIndex + (tasks.length > abortIndex ? 1 : 0); j < orderedSteps.length; j++) {
        const remainingStep = orderedSteps[j];
        tasks.push({
          id: crypto.randomUUID() as Task['id'],
          stepId: remainingStep.id,
          planId: plan.id,
          name: remainingStep.name,
          taskType: remainingStep.taskType,
          input: remainingStep.input,
          status: TaskStatus.Skipped,
          attempt: 0,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return {
      tasks,
      results,
      variables: variablesAcc,
      aborted,
      abortReason,
    };
  }

  /**
   * Dispatch a single task, applying retry/recovery on failures.
   * `variablesAcc` provides upstream outputs for the handler context.
   */
  private async dispatchTask(
    plan: Plan,
    step: Step,
    input: Readonly<Record<string, unknown>>,
    variablesAcc: Record<string, unknown>,
  ): Promise<{ task: Task; result: TaskResult }> {
    const handler = this.handlers.get(step.taskType);
    if (!handler) {
      const err = new TaskExecutionError(
        'unknown',
        step.id,
        1,
        `No handler registered for taskType '${step.taskType}'`,
        false,
      );
      const failedTask: Task = {
        id: crypto.randomUUID() as Task['id'],
        stepId: step.id,
        planId: plan.id,
        name: step.name,
        taskType: step.taskType,
        input,
        status: TaskStatus.Failed,
        attempt: 1,
        createdAt: new Date().toISOString(),
        error: err.toTaskError(),
      };
      const failedResult: TaskResult = {
        taskId: failedTask.id,
        status: TaskStatus.Failed,
        error: err.toTaskError(),
        durationMs: 0,
        attempts: 1,
      };
      await this.publishTaskFinished(plan, failedTask, failedResult);
      return { task: failedTask, result: failedResult };
    }

    const taskId = crypto.randomUUID() as Task['id'];
    let attempt = 0;
    let totalDurationMs = 0;
    let lastError: unknown;

    while (true) {
      attempt++;
      if (this.cancellationToken?.cancelled) {
        const cancelErr = new TaskCancelledError(taskId, this.cancellationToken.reason);
        const cancelledTask: Task = {
          id: taskId,
          stepId: step.id,
          planId: plan.id,
          name: step.name,
          taskType: step.taskType,
          input,
          status: TaskStatus.Cancelled,
          attempt,
          createdAt: new Date().toISOString(),
          error: cancelErr.toTaskError(),
        };
        const cancelledResult: TaskResult = {
          taskId,
          status: TaskStatus.Failed,
          error: cancelErr.toTaskError(),
          durationMs: totalDurationMs,
          attempts: attempt,
        };
        await this.publishTaskFinished(plan, cancelledTask, cancelledResult);
        return { task: cancelledTask, result: cancelledResult };
      }

      const startedAt = new Date().toISOString();
      const startedTimestamp = Date.now();
      const attemptTask: Task = {
        id: taskId,
        stepId: step.id,
        planId: plan.id,
        name: step.name,
        taskType: step.taskType,
        input,
        status: TaskStatus.Running,
        attempt,
        createdAt: startedAt,
        startedAt,
      };

      // Publish TaskStarted
      await this.publishTaskStarted(plan, attemptTask);

      const ctx: TaskHandlerContext = {
        variables: variablesAcc,
        trace: (msg, data) => this.trace.traceInfo(`[task:${step.name}] ${msg}`, data),
        checkCancelled: () => {
          if (this.cancellationToken?.cancelled) {
            throw new TaskCancelledError(taskId, this.cancellationToken.reason);
          }
        },
      };

      try {
        const result = await handler.execute(attemptTask, ctx);
        const durationMs = Date.now() - startedTimestamp;
        totalDurationMs += durationMs;

        if (result.status === TaskStatus.Succeeded) {
          const finalTask: Task = {
            ...attemptTask,
            status: TaskStatus.Succeeded,
            finishedAt: new Date().toISOString(),
          };
          const finalResult: TaskResult = {
            ...result,
            durationMs,
            attempts: attempt,
          };
          this.trace.traceTaskComplete(taskId, TaskStatus.Succeeded, durationMs, attempt);
          await this.publishTaskFinished(plan, finalTask, finalResult);
          return { task: finalTask, result: finalResult };
        }

        // Failure: handler returned failed result
        lastError = result.error
          ? new TaskExecutionError(
              taskId,
              step.id,
              attempt,
              result.error.message,
              result.error.retryable,
            )
          : new TaskExecutionError(taskId, step.id, attempt, 'Task failed without error', false);

        this.trace.traceError(
          'TASK_FAILED',
          `Task '${step.name}' attempt ${attempt} failed`,
          { taskId, attempt, error: result.error },
        );
      } catch (e) {
        const durationMs = Date.now() - startedTimestamp;
        totalDurationMs += durationMs;
        if (e instanceof TaskCancelledError) {
          const cancelledTask: Task = {
            ...attemptTask,
            status: TaskStatus.Cancelled,
            finishedAt: new Date().toISOString(),
            error: e.toTaskError(),
          };
          const cancelledResult: TaskResult = {
            taskId,
            status: TaskStatus.Failed,
            error: e.toTaskError(),
            durationMs,
            attempts: attempt,
          };
          await this.publishTaskFinished(plan, cancelledTask, cancelledResult);
          return { task: cancelledTask, result: cancelledResult };
        }
        lastError = e;
        this.trace.traceError(
          'TASK_THREW',
          `Task '${step.name}' attempt ${attempt} threw: ${e instanceof Error ? e.message : String(e)}`,
          { taskId, attempt },
        );
      }

      // Apply recovery policy
      const recovery: RecoveryDecision = this.recoveryPolicy.decide(
        lastError,
        attempt,
        this.cancellationToken,
      );

      if (recovery.action === 'abort' || recovery.action === 'escalate') {
        const taskError = toTaskError(lastError);
        const failedTask: Task = {
          ...attemptTask,
          status: TaskStatus.Failed,
          finishedAt: new Date().toISOString(),
          error: taskError,
        };
        const failedResult: TaskResult = {
          taskId,
          status: TaskStatus.Failed,
          error: taskError,
          durationMs: totalDurationMs,
          attempts: attempt,
        };
        this.trace.traceError(
          'TASK_FAILED_FINAL',
          `Task '${step.name}' aborted after ${attempt} attempts: ${recovery.reason}`,
        );
        await this.publishTaskFinished(plan, failedTask, failedResult);
        return { task: failedTask, result: failedResult };
      }

      // Retry: wait delayMs then loop
      const retryDecision = recovery.retryDecision;
      if (retryDecision && retryDecision.delayMs > 0) {
        await new Promise<void>(resolve => setTimeout(resolve, retryDecision.delayMs));
      }

      // Publish ExecutionRetried event
      await this.publishExecutionRetried(plan, attemptTask, attempt, recovery.reason);
      this.trace.traceRetry(taskId, attempt, recovery.reason);
    }
  }

  private async publishTaskStarted(plan: Plan, task: Task): Promise<void> {
    const event: TaskStarted = {
      eventId: crypto.randomUUID(),
      eventType: 'TaskStarted',
      classification: EventClassification.Action,
      timestamp: task.startedAt ?? new Date().toISOString(),
      sequence: 0,
      aggregateId: plan.id,
      aggregateType: 'Plan',
      version: '1.0.0',
      payload: {
        taskId: task.id,
        stepId: task.stepId,
        planId: plan.id,
        taskType: task.taskType,
        name: task.name,
        attempt: task.attempt,
        startedAt: task.startedAt ?? new Date().toISOString(),
      },
    };
    await this.eventBus.publish(event);
  }

  private async publishTaskFinished(
    plan: Plan,
    task: Task,
    result: TaskResult,
  ): Promise<void> {
    const event: TaskFinished = {
      eventId: crypto.randomUUID(),
      eventType: 'TaskFinished',
      classification: EventClassification.Result,
      timestamp: new Date().toISOString(),
      sequence: 0,
      aggregateId: plan.id,
      aggregateType: 'Plan',
      version: '1.0.0',
      payload: {
        taskId: task.id,
        stepId: task.stepId,
        planId: plan.id,
        status: task.status,
        durationMs: result.durationMs,
        attempts: result.attempts,
        error: result.error
          ? { code: result.error.code, message: result.error.message }
          : undefined,
      },
    };
    await this.eventBus.publish(event);
  }

  private async publishExecutionRetried(
    plan: Plan,
    task: Task,
    attempt: number,
    reason: string,
  ): Promise<void> {
    const event: ExecutionRetried = {
      eventId: crypto.randomUUID(),
      eventType: 'ExecutionRetried',
      classification: EventClassification.Info,
      timestamp: new Date().toISOString(),
      sequence: 0,
      aggregateId: plan.id,
      aggregateType: 'Plan',
      version: '1.0.0',
      payload: {
        taskId: task.id,
        stepId: task.stepId,
        attempt,
        maxAttempts: this.retryPolicy.maxAttempts,
        reason,
        retriedAt: new Date().toISOString(),
      },
    };
    await this.eventBus.publish(event);
  }
}

/**
 * Topological sort of steps based on dependsOn.
 * Steps with no dependencies come first; ties broken by original order.
 */
function topologicalSort(steps: readonly Step[]): readonly Step[] {
  const result: Step[] = [];
  const visited = new Set<StepId>();
  const byId = new Map(steps.map(s => [s.id, s] as const));

  function visit(id: StepId): void {
    if (visited.has(id)) return;
    visited.add(id);
    const step = byId.get(id);
    if (!step) return;
    if (step.dependsOn) {
      for (const dep of step.dependsOn) visit(dep);
    }
    result.push(step);
  }

  for (const s of steps) visit(s.id);
  return result;
}

/**
 * Resolve variable references in step input.
 * Supports references like `${stepName.output.key}` and `${stepName}`.
 */
function resolveVariables(
  input: Readonly<Record<string, unknown>>,
  variables: Variables,
): Readonly<Record<string, unknown>> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    result[key] = resolveValue(value, variables);
  }
  return result;
}

function resolveValue(value: unknown, variables: Variables): unknown {
  if (typeof value === 'string') {
    return resolveString(value, variables);
  }
  if (Array.isArray(value)) {
    return value.map(v => resolveValue(v, variables));
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolveValue(v, variables);
    }
    return out;
  }
  return value;
}

function resolveString(s: string, variables: Variables): unknown {
  const match = s.match(/^\$\{([^}]+)\}$/);
  if (match) {
    const ref = match[1];
    return lookup(ref, variables);
  }
  return s.replace(/\$\{([^}]+)\}/g, (full, ref: string) => {
    const val = lookup(ref, variables);
    return val === undefined ? full : String(val);
  });
}

function lookup(ref: string, variables: Variables): unknown {
  const parts = ref.split('.');
  let current: unknown = variables;
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
