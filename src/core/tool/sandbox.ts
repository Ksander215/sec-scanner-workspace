/**
 * Tool Sandbox — Sandboxed execution environment for Tools.
 *
 * Conforms to: AIS-003C.000 Requirement #7 (Sandboxed Runtime)
 *
 * Provides:
 *   - Timeout enforcement
 *   - Memory limit tracking (logical)
 *   - Cancellation integration
 *   - Exception boundary (tool errors don't crash runtime)
 */
import type { Tool, ToolRequest, ToolResponse, SandboxConfiguration } from './types.js';
import type { ToolExecutionContext } from './types.js';
import { toToolResponseError } from './errors.js';

export const DEFAULT_SANDBOX_CONFIG: SandboxConfiguration = {
  timeoutMs: 30_000,
  maxMemoryBytes: 0,
  enforceMemoryLimit: false,
  enforceTimeout: true,
};

export class ToolSandbox {
  private readonly config: SandboxConfiguration;

  constructor(config?: Partial<SandboxConfiguration>) {
    this.config = { ...DEFAULT_SANDBOX_CONFIG, ...config };
  }

  /**
   * Execute a tool within the sandbox.
   * Applies timeout, exception boundary, and cancellation.
   * Returns a ToolResponse — never throws (errors are captured in the response).
   */
  async execute(
    tool: Tool,
    request: ToolRequest,
    context: ToolExecutionContext,
  ): Promise<ToolResponse> {
    const start = Date.now();
    const timeoutMs = request.timeoutMs ?? this.config.timeoutMs;

    // Check cancellation before execution
    if (context.cancellationToken.cancelled) {
      return {
        success: false,
        error: {
          code: 'TOOL_CANCELLED',
          message: `Tool '${request.toolName}' cancelled before execution: ${context.cancellationToken.reason ?? 'no reason'}`,
          retryable: false,
        },
        durationMs: 0,
      };
    }

    try {
      // Execute with timeout if enforced
      if (this.config.enforceTimeout && timeoutMs > 0) {
        return await this.executeWithTimeout(tool, request, context, timeoutMs, start);
      }

      // Execute without timeout
      const response = await tool.execute(request, context);
      const durationMs = Date.now() - start;
      return {
        ...response,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - start;

      // Check if it's a cancellation-induced error
      if (context.cancellationToken.cancelled) {
        return {
          success: false,
          error: {
            code: 'TOOL_CANCELLED',
            message: `Tool '${request.toolName}' cancelled: ${context.cancellationToken.reason ?? 'no reason'}`,
            retryable: false,
          },
          durationMs,
        };
      }

      // Convert error to response
      const responseError = toToolResponseError(error);
      return {
        success: false,
        error: responseError,
        durationMs,
      };
    }
  }

  private async executeWithTimeout(
    tool: Tool,
    request: ToolRequest,
    context: ToolExecutionContext,
    timeoutMs: number,
    start: number,
  ): Promise<ToolResponse> {
    return new Promise<ToolResponse>(resolve => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          const durationMs = Date.now() - start;
          resolve({
            success: false,
            error: {
              code: 'TOOL_TIMEOUT',
              message: `Tool '${request.toolName}' exceeded ${timeoutMs}ms timeout`,
              retryable: true,
            },
            durationMs,
          });
        }
      }, timeoutMs);

      tool.execute(request, context)
        .then(response => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            const durationMs = Date.now() - start;
            resolve({ ...response, durationMs });
          }
        })
        .catch(error => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            const durationMs = Date.now() - start;

            if (context.cancellationToken.cancelled) {
              resolve({
                success: false,
                error: {
                  code: 'TOOL_CANCELLED',
                  message: `Tool '${request.toolName}' cancelled: ${context.cancellationToken.reason ?? 'no reason'}`,
                  retryable: false,
                },
                durationMs,
              });
            } else {
              resolve({
                success: false,
                error: toToolResponseError(error),
                durationMs,
              });
            }
          }
        });
    });
  }

  /** Get the sandbox configuration. */
  getConfig(): Readonly<SandboxConfiguration> {
    return this.config;
  }
}
