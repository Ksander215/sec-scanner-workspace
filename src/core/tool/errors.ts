/**
 * Tool Runtime Error Hierarchy
 *
 * Conforms to: AIS-003C.000 Requirement #10 (Runtime Errors)
 *
 * Error hierarchy:
 *   ToolRuntimeError (base)
 *   ├── ToolNotFoundError         (tool not in registry)
 *   ├── CapabilityDeniedError     (capability not allowed for trust level)
 *   ├── SandboxViolationError     (tool violated sandbox boundary)
 *   ├── ToolTimeoutError          (tool exceeded timeout)
 *   ├── ToolExecutionError        (tool threw during execution)
 *   ├── ToolValidationError       (tool failed validation)
 *   ├── ToolLifecycleError        (invalid lifecycle transition)
 *   └── RuntimeFailureError       (runtime itself failed)
 *
 * Every error carries a structured `code` for machine-readable handling.
 */
export class ToolRuntimeError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly cause?: unknown;
  readonly toolName?: string;

  constructor(code: string, message: string, retryable = false, cause?: unknown, toolName?: string) {
    super(message);
    this.name = 'ToolRuntimeError';
    this.code = code;
    this.retryable = retryable;
    if (cause !== undefined) this.cause = cause;
    if (toolName !== undefined) this.toolName = toolName;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toResponseError(): import('./types.js').ToolResponseError {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      details: this.cause !== undefined
        ? { cause: String(this.cause) }
        : undefined,
    };
  }
}

export class ToolNotFoundError extends ToolRuntimeError {
  constructor(toolName: string) {
    super(
      'TOOL_NOT_FOUND',
      `Tool '${toolName}' not found in registry`,
      false,
      undefined,
      toolName,
    );
    this.name = 'ToolNotFoundError';
  }
}

export class CapabilityDeniedError extends ToolRuntimeError {
  readonly capability: string;
  readonly trustLevel: string;

  constructor(toolName: string, capability: string, trustLevel: string) {
    super(
      'CAPABILITY_DENIED',
      `Tool '${toolName}' requires capability '${capability}' which is not allowed at trust level '${trustLevel}'`,
      false,
      undefined,
      toolName,
    );
    this.name = 'CapabilityDeniedError';
    this.capability = capability;
    this.trustLevel = trustLevel;
  }
}

export class SandboxViolationError extends ToolRuntimeError {
  constructor(toolName: string, message: string) {
    super(
      'SANDBOX_VIOLATION',
      `Tool '${toolName}' violated sandbox: ${message}`,
      false,
      undefined,
      toolName,
    );
    this.name = 'SandboxViolationError';
  }
}

export class ToolTimeoutError extends ToolRuntimeError {
  readonly timeoutMs: number;

  constructor(toolName: string, timeoutMs: number) {
    super(
      'TOOL_TIMEOUT',
      `Tool '${toolName}' exceeded ${timeoutMs}ms timeout`,
      true,
      undefined,
      toolName,
    );
    this.name = 'ToolTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export class ToolExecutionError extends ToolRuntimeError {
  readonly attempt: number;

  constructor(toolName: string, message: string, attempt: number, retryable: boolean, cause?: unknown) {
    super(
      'TOOL_EXECUTION_ERROR',
      `Tool '${toolName}' failed (attempt ${attempt}): ${message}`,
      retryable,
      cause,
      toolName,
    );
    this.name = 'ToolExecutionError';
    this.attempt = attempt;
  }
}

export class ToolValidationError extends ToolRuntimeError {
  readonly validationErrors: readonly string[];

  constructor(toolName: string, errors: readonly string[]) {
    super(
      'TOOL_VALIDATION_ERROR',
      `Tool '${toolName}' failed validation: ${errors.join('; ')}`,
      false,
      undefined,
      toolName,
    );
    this.name = 'ToolValidationError';
    this.validationErrors = errors;
  }
}

export class ToolLifecycleError extends ToolRuntimeError {
  readonly fromState: string;
  readonly toState: string;

  constructor(toolName: string, fromState: string, toState: string) {
    super(
      'TOOL_LIFECYCLE_ERROR',
      `Tool '${toolName}' cannot transition from '${fromState}' to '${toState}'`,
      false,
      undefined,
      toolName,
    );
    this.name = 'ToolLifecycleError';
    this.fromState = fromState;
    this.toState = toState;
  }
}

export class RuntimeFailureError extends ToolRuntimeError {
  constructor(message: string, cause?: unknown) {
    super('RUNTIME_FAILURE', message, false, cause);
    this.name = 'RuntimeFailureError';
  }
}

/** Convert any unknown error to a ToolResponseError. */
export function toToolResponseError(error: unknown): import('./types.js').ToolResponseError {
  if (error instanceof ToolRuntimeError) {
    return error.toResponseError();
  }
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      retryable: false,
    };
  }
  return {
    code: 'UNKNOWN_ERROR',
    message: typeof error === 'string' ? error : 'An unknown error occurred',
    retryable: false,
  };
}
