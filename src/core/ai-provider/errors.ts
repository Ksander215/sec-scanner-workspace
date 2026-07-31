/**
 * Universal AI Provider Runtime — Error Hierarchy
 * TASK-AIS-006A.000
 *
 * INV-007: All errors extend AIProviderError.
 * Every error has a code, message, and optional context.
 */

// ═══════════════════════════════════════════════════════════════════
// BASE ERROR
// ═══════════════════════════════════════════════════════════════════

export class AIProviderError extends Error {
  readonly code: string;
  readonly timestamp: string;
  readonly context: Readonly<Record<string, unknown>>;

  constructor(code: string, message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'AIProviderError';
    this.code = code;
    this.timestamp = new Date().toISOString();
    this.context = Object.freeze({ ...context });
  }
}

// ═══════════════════════════════════════════════════════════════════
// PROVIDER ERRORS
// ═══════════════════════════════════════════════════════════════════

export class ProviderNotFoundError extends AIProviderError {
  readonly providerId: string;
  constructor(providerId: string, context?: Record<string, unknown>) {
    super(
      'PROVIDER_NOT_FOUND',
      `Provider not found: ${providerId}`,
      { providerId, ...context },
    );
    this.name = 'ProviderNotFoundError';
    this.providerId = providerId;
  }
}

export class ProviderAlreadyRegisteredError extends AIProviderError {
  readonly providerId: string;
  constructor(providerId: string, context?: Record<string, unknown>) {
    super(
      'PROVIDER_ALREADY_REGISTERED',
      `Provider already registered: ${providerId}`,
      { providerId, ...context },
    );
    this.name = 'ProviderAlreadyRegisteredError';
    this.providerId = providerId;
  }
}

export class ProviderNotReadyError extends AIProviderError {
  readonly providerId: string;
  constructor(providerId: string, context?: Record<string, unknown>) {
    super(
      'PROVIDER_NOT_READY',
      `Provider not ready: ${providerId}`,
      { providerId, ...context },
    );
    this.name = 'ProviderNotReadyError';
    this.providerId = providerId;
  }
}

export class ProviderHealthCheckError extends AIProviderError {
  readonly providerId: string;
  constructor(providerId: string, reason: string, context?: Record<string, unknown>) {
    super(
      'PROVIDER_HEALTH_CHECK_FAILED',
      `Health check failed for provider ${providerId}: ${reason}`,
      { providerId, reason, ...context },
    );
    this.name = 'ProviderHealthCheckError';
    this.providerId = providerId;
  }
}

export class ProviderLimitExceededError extends AIProviderError {
  constructor(limit: number, context?: Record<string, unknown>) {
    super(
      'PROVIDER_LIMIT_EXCEEDED',
      `Provider registry limit exceeded: ${limit}`,
      { limit, ...context },
    );
    this.name = 'ProviderLimitExceededError';
  }
}

// ═══════════════════════════════════════════════════════════════════
// MODEL ERRORS
// ═══════════════════════════════════════════════════════════════════

export class ModelNotFoundError extends AIProviderError {
  readonly modelId: string;
  constructor(modelId: string, context?: Record<string, unknown>) {
    super(
      'MODEL_NOT_FOUND',
      `Model not found: ${modelId}`,
      { modelId, ...context },
    );
    this.name = 'ModelNotFoundError';
    this.modelId = modelId;
  }
}

export class ModelAlreadyRegisteredError extends AIProviderError {
  readonly modelId: string;
  constructor(modelId: string, context?: Record<string, unknown>) {
    super(
      'MODEL_ALREADY_REGISTERED',
      `Model already registered: ${modelId}`,
      { modelId, ...context },
    );
    this.name = 'ModelAlreadyRegisteredError';
    this.modelId = modelId;
  }
}

export class ModelNotAvailableError extends AIProviderError {
  readonly modelId: string;
  constructor(modelId: string, context?: Record<string, unknown>) {
    super(
      'MODEL_NOT_AVAILABLE',
      `Model not available: ${modelId}`,
      { modelId, ...context },
    );
    this.name = 'ModelNotAvailableError';
    this.modelId = modelId;
  }
}

export class ModelCapabilityMismatchError extends AIProviderError {
  readonly modelId: string;
  readonly capability: string;
  constructor(modelId: string, capability: string, context?: Record<string, unknown>) {
    super(
      'MODEL_CAPABILITY_MISMATCH',
      `Model ${modelId} does not support capability: ${capability}`,
      { modelId, capability, ...context },
    );
    this.name = 'ModelCapabilityMismatchError';
    this.modelId = modelId;
    this.capability = capability;
  }
}

// ═══════════════════════════════════════════════════════════════════
// EXECUTION ERRORS
// ═══════════════════════════════════════════════════════════════════

export class ExecutionError extends AIProviderError {
  readonly executionId: string;
  constructor(executionId: string, message: string, context?: Record<string, unknown>) {
    super('EXECUTION_ERROR', message, { executionId, ...context });
    this.name = 'ExecutionError';
    this.executionId = executionId;
  }
}

export class ExecutionTimeoutError extends AIProviderError {
  readonly executionId: string;
  constructor(executionId: string, timeoutMs: number, context?: Record<string, unknown>) {
    super(
      'EXECUTION_TIMEOUT',
      `Execution ${executionId} timed out after ${timeoutMs}ms`,
      { executionId, timeoutMs, ...context },
    );
    this.name = 'ExecutionTimeoutError';
    this.executionId = executionId;
  }
}

export class ExecutionCancelledError extends AIProviderError {
  readonly executionId: string;
  constructor(executionId: string, context?: Record<string, unknown>) {
    super(
      'EXECUTION_CANCELLED',
      `Execution cancelled: ${executionId}`,
      { executionId, ...context },
    );
    this.name = 'ExecutionCancelledError';
    this.executionId = executionId;
  }
}

export class ExecutionQueueFullError extends AIProviderError {
  constructor(queueSize: number, context?: Record<string, unknown>) {
    super(
      'EXECUTION_QUEUE_FULL',
      `Execution queue full (size: ${queueSize})`,
      { queueSize, ...context },
    );
    this.name = 'ExecutionQueueFullError';
  }
}

export class ConcurrentExecutionLimitError extends AIProviderError {
  constructor(limit: number, context?: Record<string, unknown>) {
    super(
      'CONCURRENT_EXECUTION_LIMIT',
      `Concurrent execution limit reached: ${limit}`,
      { limit, ...context },
    );
    this.name = 'ConcurrentExecutionLimitError';
  }
}

// ═══════════════════════════════════════════════════════════════════
// STREAMING ERRORS
// ═══════════════════════════════════════════════════════════════════

export class StreamError extends AIProviderError {
  readonly streamId: string;
  constructor(streamId: string, message: string, context?: Record<string, unknown>) {
    super('STREAM_ERROR', message, { streamId, ...context });
    this.name = 'StreamError';
    this.streamId = streamId;
  }
}

export class StreamNotFoundError extends AIProviderError {
  readonly streamId: string;
  constructor(streamId: string, context?: Record<string, unknown>) {
    super(
      'STREAM_NOT_FOUND',
      `Stream not found: ${streamId}`,
      { streamId, ...context },
    );
    this.name = 'StreamNotFoundError';
    this.streamId = streamId;
  }
}

export class StreamAlreadyCompletedError extends AIProviderError {
  readonly streamId: string;
  constructor(streamId: string, context?: Record<string, unknown>) {
    super(
      'STREAM_ALREADY_COMPLETED',
      `Stream already completed: ${streamId}`,
      { streamId, ...context },
    );
    this.name = 'StreamAlreadyCompletedError';
    this.streamId = streamId;
  }
}

// ═══════════════════════════════════════════════════════════════════
// CONTEXT / TOKEN / COST ERRORS
// ═══════════════════════════════════════════════════════════════════

export class ContextWindowExceededError extends AIProviderError {
  readonly modelId: string;
  readonly required: number;
  readonly available: number;
  constructor(modelId: string, required: number, available: number, context?: Record<string, unknown>) {
    super(
      'CONTEXT_WINDOW_EXCEEDED',
      `Context window exceeded for model ${modelId}: required ${required}, available ${available}`,
      { modelId, required, available, ...context },
    );
    this.name = 'ContextWindowExceededError';
    this.modelId = modelId;
    this.required = required;
    this.available = available;
  }
}

export class TokenBudgetExceededError extends AIProviderError {
  readonly budget: number;
  readonly used: number;
  constructor(budget: number, used: number, context?: Record<string, unknown>) {
    super(
      'TOKEN_BUDGET_EXCEEDED',
      `Token budget exceeded: ${used}/${budget}`,
      { budget, used, ...context },
    );
    this.name = 'TokenBudgetExceededError';
    this.budget = budget;
    this.used = used;
  }
}

export class CostBudgetExceededError extends AIProviderError {
  readonly limit: number;
  readonly currentUsage: number;
  constructor(limit: number, currentUsage: number, context?: Record<string, unknown>) {
    super(
      'COST_BUDGET_EXCEEDED',
      `Cost budget exceeded: $${currentUsage.toFixed(4)} / $${limit.toFixed(4)}`,
      { limit, currentUsage, ...context },
    );
    this.name = 'CostBudgetExceededError';
    this.limit = limit;
    this.currentUsage = currentUsage;
  }
}

// ═══════════════════════════════════════════════════════════════════
// RETRY / FAILOVER ERRORS
// ═══════════════════════════════════════════════════════════════════

export class RetryExhaustedError extends AIProviderError {
  readonly executionId: string;
  readonly attempts: number;
  constructor(executionId: string, attempts: number, lastError: string, context?: Record<string, unknown>) {
    super(
      'RETRY_EXHAUSTED',
      `Retry exhausted for ${executionId} after ${attempts} attempts. Last error: ${lastError}`,
      { executionId, attempts, lastError, ...context },
    );
    this.name = 'RetryExhaustedError';
    this.executionId = executionId;
    this.attempts = attempts;
  }
}

export class FailoverExhaustedError extends AIProviderError {
  readonly executionId: string;
  constructor(executionId: string, context?: Record<string, unknown>) {
    super(
      'FAILOVER_EXHAUSTED',
      `All failover providers exhausted for execution: ${executionId}`,
      { executionId, ...context },
    );
    this.name = 'FailoverExhaustedError';
    this.executionId = executionId;
  }
}

export class NoFailoverChainError extends AIProviderError {
  constructor(context?: Record<string, unknown>) {
    super('NO_FAILOVER_CHAIN', 'No failover chain defined', context);
    this.name = 'NoFailoverChainError';
  }
}

// ═══════════════════════════════════════════════════════════════════
// CACHE / PRIVACY / TOOL ERRORS
// ═══════════════════════════════════════════════════════════════════

export class CacheError extends AIProviderError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('CACHE_ERROR', message, context);
    this.name = 'CacheError';
  }
}

export class PrivacyViolationError extends AIProviderError {
  readonly providerId: string;
  readonly requiredLevel: string;
  readonly actualLevel: string;
  constructor(providerId: string, requiredLevel: string, actualLevel: string, context?: Record<string, unknown>) {
    super(
      'PRIVACY_VIOLATION',
      `Privacy violation: provider ${providerId} requires ${requiredLevel} but has ${actualLevel}`,
      { providerId, requiredLevel, actualLevel, ...context },
    );
    this.name = 'PrivacyViolationError';
    this.providerId = providerId;
    this.requiredLevel = requiredLevel;
    this.actualLevel = actualLevel;
  }
}

export class PolicyViolationError extends AIProviderError {
  readonly policyId: string;
  constructor(policyId: string, reason: string, context?: Record<string, unknown>) {
    super(
      'POLICY_VIOLATION',
      `Policy violation (${policyId}): ${reason}`,
      { policyId, reason, ...context },
    );
    this.name = 'PolicyViolationError';
    this.policyId = policyId;
  }
}

export class ToolInvocationError extends AIProviderError {
  readonly toolName: string;
  constructor(toolName: string, message: string, context?: Record<string, unknown>) {
    super('TOOL_INVOCATION_ERROR', `Tool ${toolName}: ${message}`, { toolName, ...context });
    this.name = 'ToolInvocationError';
    this.toolName = toolName;
  }
}

export class ToolNotFoundError extends AIProviderError {
  readonly toolName: string;
  constructor(toolName: string, context?: Record<string, unknown>) {
    super('TOOL_NOT_FOUND', `Tool not found: ${toolName}`, { toolName, ...context });
    this.name = 'ToolNotFoundError';
    this.toolName = toolName;
  }
}

// ═══════════════════════════════════════════════════════════════════
// ROUTING / CONFIGURATION ERRORS
// ═══════════════════════════════════════════════════════════════════

export class NoSuitableModelError extends AIProviderError {
  constructor(requirements: Record<string, unknown>, context?: Record<string, unknown>) {
    super(
      'NO_SUITABLE_MODEL',
      `No suitable model found for requirements: ${JSON.stringify(requirements)}`,
      { requirements, ...context },
    );
    this.name = 'NoSuitableModelError';
  }
}

export class NoSuitableProviderError extends AIProviderError {
  constructor(context?: Record<string, unknown>) {
    super('NO_SUITABLE_PROVIDER', 'No suitable provider available', context);
    this.name = 'NoSuitableProviderError';
  }
}

export class ConfigurationError extends AIProviderError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('CONFIGURATION_ERROR', message, context);
    this.name = 'ConfigurationError';
  }
}

export class ParallelExecutionError extends AIProviderError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('PARALLEL_EXECUTION_ERROR', message, context);
    this.name = 'ParallelExecutionError';
  }
}
