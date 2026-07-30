/**
 * Command Bus — Unified Command Dispatcher
 * TASK-AIS-005A.000 — Platform Integration Foundation
 *
 * Supports sync dispatch, async handlers, retry with configurable policy.
 */
import type { CommandEnvelope, CommandResult, CommandBus, RetryPolicy } from '../types.js';

const DEFAULT_RETRY: RetryPolicy = {
  maxRetries: 0,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

export class PlatformCommandBus implements CommandBus {
  private handlers = new Map<string, (cmd: CommandEnvelope) => Promise<unknown>>();
  private retryPolicy: RetryPolicy = DEFAULT_RETRY;
  private readonly commandLog: CommandEnvelope[] = [];

  setRetryPolicy(policy: RetryPolicy): void {
    this.retryPolicy = policy;
  }

  registerHandler<TPayload, TResult>(
    commandType: string,
    handler: (cmd: CommandEnvelope<TPayload>) => Promise<TResult>,
  ): void {
    this.handlers.set(commandType, handler as (cmd: CommandEnvelope) => Promise<unknown>);
  }

  async dispatch<TPayload, TResult>(
    commandType: string,
    payload: TPayload,
  ): Promise<CommandResult<TResult>> {
    const envelope: CommandEnvelope<TPayload> = Object.freeze({
      commandId: crypto.randomUUID(),
      commandType,
      payload,
      timestamp: new Date().toISOString(),
    });

    this.commandLog.push(envelope);

    const handler = this.handlers.get(commandType);
    if (!handler) {
      return {
        success: false,
        error: `No handler registered for command: ${commandType}`,
        timestamp: new Date().toISOString(),
        processingTimeMs: 0,
      };
    }

    const start = performance.now();
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= this.retryPolicy.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = Math.min(
          this.retryPolicy.baseDelayMs * Math.pow(this.retryPolicy.backoffMultiplier, attempt - 1),
          this.retryPolicy.maxDelayMs,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
      try {
        const result = await handler(envelope);
        const processingTimeMs = performance.now() - start;
        return {
          success: true,
          data: result as TResult,
          timestamp: new Date().toISOString(),
          processingTimeMs,
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    return {
      success: false,
      error: lastError,
      timestamp: new Date().toISOString(),
      processingTimeMs: performance.now() - start,
    };
  }

  getCommandLog(): readonly CommandEnvelope[] {
    return this.commandLog;
  }

  clearLog(): void {
    this.commandLog.length = 0;
  }
}
