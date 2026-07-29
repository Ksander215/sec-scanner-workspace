/**
 * Task Handler — Executes a single task of a given type.
 *
 * Conforms to: AIS-003B.000 Requirement #3 (PlanExecutor)
 *
 * Handlers are registered by `taskType`. The PlanExecutor looks up the handler
 * for each task's `taskType` and delegates execution to it.
 *
 * Handler contract:
 *   - Pure function: input → output (or throw).
 *   - Side effects only via passed-in context (variables, event bus, trace).
 *   - No direct access to engine internals.
 */
import type { Task, TaskResult, Variables } from '../types.js';
import { TaskStatus } from '../types.js';

export interface TaskHandlerContext {
  readonly variables: Variables;
  readonly trace: (message: string, data?: Readonly<Record<string, unknown>>) => void;
  readonly checkCancelled: () => void;
}

export interface TaskHandler {
  readonly taskType: string;
  execute(task: Task, ctx: TaskHandlerContext): Promise<TaskResult>;
}

/** Registry of task handlers. Allows extensible handler lookup. */
export class TaskHandlerRegistry {
  private handlers = new Map<string, TaskHandler>();

  register(handler: TaskHandler): void {
    if (this.handlers.has(handler.taskType)) {
      throw new Error(`Handler for taskType '${handler.taskType}' already registered`);
    }
    this.handlers.set(handler.taskType, handler);
  }

  get(taskType: string): TaskHandler | undefined {
    return this.handlers.get(taskType);
  }

  has(taskType: string): boolean {
    return this.handlers.has(taskType);
  }

  unregister(taskType: string): boolean {
    return this.handlers.delete(taskType);
  }

  /** Get all registered task types. */
  getRegisteredTypes(): readonly string[] {
    return Array.from(this.handlers.keys());
  }
}

/** Built-in handler: echoes the task's input as output. Useful for tests. */
export class EchoHandler implements TaskHandler {
  readonly taskType = 'echo';
  async execute(task: Task, _ctx: TaskHandlerContext): Promise<TaskResult> {
    return {
      taskId: task.id,
      status: TaskStatus.Succeeded,
      output: task.input as Record<string, unknown>,
      durationMs: 0,
      attempts: task.attempt,
    };
  }
}

/** Built-in handler: always succeeds with the given output (from input). */
export class IdentityHandler implements TaskHandler {
  readonly taskType = 'identity';
  async execute(task: Task, _ctx: TaskHandlerContext): Promise<TaskResult> {
    return {
      taskId: task.id,
      status: TaskStatus.Succeeded,
      output: { result: task.input },
      durationMs: 0,
      attempts: task.attempt,
    };
  }
}

/** Built-in handler: always fails with a configured error code/message. */
export class FailHandler implements TaskHandler {
  readonly taskType = 'fail';
  constructor(
    readonly errorCode = 'INTENTIONAL_FAIL',
    readonly errorMessage = 'Task intentionally failed',
    readonly retryable = false,
  ) {}
  async execute(task: Task, _ctx: TaskHandlerContext): Promise<TaskResult> {
    return {
      taskId: task.id,
      status: TaskStatus.Failed,
      error: {
        code: this.errorCode,
        message: this.errorMessage,
        retryable: this.retryable,
      },
      durationMs: 0,
      attempts: task.attempt,
    };
  }
}

/** Built-in handler: sleeps for `input.delayMs` then succeeds with `input.output`. */
export class DelayHandler implements TaskHandler {
  readonly taskType = 'delay';
  async execute(task: Task, ctx: TaskHandlerContext): Promise<TaskResult> {
    const delayMs = Number(task.input.delayMs ?? 0);
    const start = Date.now();
    if (delayMs > 0) {
      await new Promise<void>((resolve, reject) => {
        ctx.checkCancelled();
        let interval: ReturnType<typeof setInterval> | undefined;
        const timer = setTimeout(() => {
          if (interval) clearInterval(interval);
          resolve();
        }, delayMs);
        // Allow cancellation to interrupt the delay (best-effort)
        interval = setInterval(() => {
          try {
            ctx.checkCancelled();
          } catch (e) {
            clearTimeout(timer);
            if (interval) clearInterval(interval);
            reject(e);
          }
        }, Math.min(50, delayMs));
      });
    }
    const durationMs = Date.now() - start;
    return {
      taskId: task.id,
      status: TaskStatus.Succeeded,
      output: (task.input.output ?? { ok: true }) as Record<string, unknown>,
      durationMs,
      attempts: task.attempt,
    };
  }
}
